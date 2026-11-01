# Wave 0.4: Wave 7 History API Contract Validation (Workstream D)

## 1. Problem Formulation & Defect Analysis

Wave 0.3 defined Contract A for Task `W7-P1` (`getAnalysisRuns`) in `DAGraphController.cls`:
```apex
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns)
```

In Wave 0.3, the query predicate was formulated as:
```apex
WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
```

### Defect Impact:
In Salesforce Apex / SOQL:
1. `DA_Project__c` is a lookup field of type `Id` (15 or 18 character Salesforce ID).
2. `Project_Key__c` is a custom text field of length 100 (`Text(100)`).
3. If `projectId` is passed as an arbitrary string key (e.g. `"my-repo-main"`), binding it directly to `DA_Project__c = :projectId` causes Salesforce SOQL to attempt runtime coercion to an `Id`. In Salesforce, if a bind variable compared against an `Id` field is not a valid 15-character or 18-character alphanumeric string, SOQL throws:
   `System.QueryException: Invalid Id: my-repo-main`
4. The existing `DAGraphController.cls` contains instances of this combined predicate in `getLatestGraphMetadataForProject` and `getGraphChunks`. However, relying on runtime coercion without input sanitization or branching is a critical runtime hazard.

---

## 2. Investigation of Schema & Controller Implementation

### 2.1 Schema Inspection
- Custom Object `DA_Analysis_Run__c`:
  - Field `DA_Project__c`: Lookup to `DA_Project__c` (Reference).
  - Field `Name`: Standard Name text field (stores run identifier/name).
  - Field `CreatedDate`: Standard DateTime field.
- Custom Object `DA_Project__c`:
  - Field `Project_Key__c`: Unique, external ID text field (`Text(100)`).
  - Field `Name`: Standard Name text field.

### 2.2 Security Pattern Inspection
`DAGraphController.cls` enforces:
- `public with sharing class DAGraphController`
- Queries executed `WITH USER_MODE` to enforce object and field-level permissions (CRUD/FLS).
- Cacheable AuraEnabled endpoints: `@AuraEnabled(cacheable=true)` for performance and LDS caching.

---

## 3. Authoritative Contract A Specification for Wave 7 (W7-P1)

Contract A must strictly use existing schema fields without requiring custom field creation.

### 3.1 Validated Parameter Handling & Sanitization
To avoid `System.QueryException: Invalid Id: ...`, the implementation must sanitize or branch based on whether `projectId` is a valid Salesforce record ID:

```apex
/**
 * @description Validates whether a given string is a syntactically valid Salesforce 15 or 18 char Id
 */
private static Boolean isValidSalesforceId(String str) {
    if (String.isBlank(str)) {
        return false;
    }
    Integer len = str.length();
    if (len != 15 && len != 18) {
        return false;
    }
    // Pattern match alphanumeric characters only
    Pattern p = Pattern.compile('^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$');
    return p.matcher(str).matches();
}
```

### 3.2 Authoritative SOQL Query Structure
Using the validation helper, the query resolves the project safely:

```apex
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns) {
    if (String.isBlank(projectId)) {
        throw new AuraHandledException('Project ID or Key is required.');
    }

    // Enforce bound limits: default 20, max 100
    Integer limitCount = 20;
    if (maxRuns != null && maxRuns > 0) {
        limitCount = Math.min(maxRuns, 100);
    }

    Boolean isId = isValidSalesforceId(projectId);

    List<DA_Analysis_Run__c> runs;
    if (isId) {
        runs = [
            SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c, CreatedDate
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT :limitCount
        ];
    } else {
        runs = [
            SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c, CreatedDate
            FROM DA_Analysis_Run__c
            WHERE DA_Project__r.Project_Key__c = :projectId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT :limitCount
        ];
    }

    List<DAAnalysisRunSummaryDTO> dtos = new List<DAAnalysisRunSummaryDTO>();
    for (DA_Analysis_Run__c r : runs) {
        DAAnalysisRunSummaryDTO dto = new DAAnalysisRunSummaryDTO();
        dto.runId = r.Id;
        dto.runName = r.Name;
        dto.projectId = r.DA_Project__c;
        dto.projectName = r.DA_Project__r.Name;
        dto.projectKey = r.DA_Project__r.Project_Key__c;
        dto.createdDate = r.CreatedDate;
        dtos.add(dto);
    }
    return dtos;
}
```

### 3.3 Authoritative DTO Shape (`DAAnalysisRunSummaryDTO.cls`)
```apex
public with sharing class DAAnalysisRunSummaryDTO {
    @AuraEnabled public String runId { get; set; }
    @AuraEnabled public String runName { get; set; }
    @AuraEnabled public String projectId { get; set; }
    @AuraEnabled public String projectName { get; set; }
    @AuraEnabled public String projectKey { get; set; }
    @AuraEnabled public Datetime createdDate { get; set; }
}
```

---

## 4. Verification and Environmental Boundaries

1. **Source Inspection vs Org Execution:**
   The code structure, parameter bounds (20..100), user-mode security (`WITH USER_MODE`), and DTO field names have been verified against existing Apex classes in `scratch/salesforce-poc/`.
2. **Salesforce Execution Boundary:**
   Actual compilation into a Salesforce bytecode container, FLS enforcement, and Apex unit test execution (`DAGraphControllerTest.cls`) require a connected Salesforce scratch org. Because Wave 0.4 is strictly a read-only local planning wave with no active org connection, org execution remains classified as **PENDING_ORG_VERIFICATION**.

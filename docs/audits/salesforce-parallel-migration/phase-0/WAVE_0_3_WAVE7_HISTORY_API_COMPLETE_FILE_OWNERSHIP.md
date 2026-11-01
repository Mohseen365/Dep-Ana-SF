# Wave 0.3: Wave 7 History API Complete File Ownership & Staged Contract A

## 1. Problem Formulation & Defect Analysis

Wave 0.2 introduced Contract A for the minimal History API:
```apex
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns)
```

However, the Wave 0.2 authoritative task register and ownership audit allocated only a single file to Task `W7-P1`:
`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`

### Defect Impact:
1. **Missing DTO Class & Companion Metadata:** The return type `List<DAAnalysisRunSummaryDTO>` requires the creation of `DAAnalysisRunSummaryDTO.cls` and its Salesforce metadata companion `DAAnalysisRunSummaryDTO.cls-meta.xml` under `classes/dto/`. Neither file was listed or assigned in the register or inventory.
2. **Missing Apex Test Class & Companion Metadata:** Unit testing for the new controller method requires updating `DAGraphControllerTest.cls` and its companion `DAGraphControllerTest.cls-meta.xml`.
3. **Missing Controller Companion Metadata:** Any modification to `DAGraphController.cls` must preserve or verify `DAGraphController.cls-meta.xml`.
4. **Missing Offline Test Runner Allocation:** Testing `W7-P1` and Wave 7 components offline requires a dedicated test runner (`run-wave7-tests.cjs`) instead of modifying baseline runners.

---

## 2. Exhaustive File Allocation for Minimal Contract A Implementation

Every file required for Contract A is allocated to **Workstream C Lead (Wave 7)** under strict single-ownership rules:

| File Path | File Role | Status in Repo | Accountable Owner | Mutability Rule |
| :--- | :--- | :---: | :---: | :--- |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Apex Controller adding `getAnalysisRuns` | **Existing** | Workstream C Lead | Editable (Add `getAnalysisRuns`) |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls-meta.xml` | Controller Metadata Companion (api 60.0) | **Existing** | Workstream C Lead | Protected / Immutable |
| `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls` | Apex DTO Class for run summaries | **New** | Workstream C Lead | Creatable / Exclusive |
| `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls-meta.xml` | DTO Metadata Companion (api 60.0) | **New** | Workstream C Lead | Creatable / Exclusive |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls` | Apex Unit Test Class | **Existing** | Workstream C Lead | Editable (Add `test_getAnalysisRuns_*`) |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls-meta.xml` | Apex Test Metadata Companion | **Existing** | Workstream C Lead | Protected / Immutable |
| `scratch/salesforce-poc/tests/run-wave7-tests.cjs` | Dedicated Offline Test Runner for Wave 7 | **New** | Workstream C Lead | Creatable / Exclusive |

---

## 3. Strict Staged Contract A Boundary Specification

Contract A is frozen as a **zero-schema-change minimal listing API**. It queries only fields already present in `DA_Analysis_Run__c` and `DA_Project__c`.

### 3.1 Prohibited Schema Fields (Contract B Boundary)
The minimal Contract A implementation is strictly forbidden from querying, referencing, or assuming the existence of any of the following unapproved custom fields:
- `Status__c`
- `Analysis_Timestamp__c`
- `Commit_Hash__c`
- `Node_Count__c`
- `Edge_Count__c`
- `High_Risk_Count__c`
- `Cycle_Count__c`
- `DNA_Barcode__c`
- `Metrics_JSON__c`

### 3.2 Authorized Contract A Query Specification
The query inside `DAGraphController.getAnalysisRuns` must execute strictly as follows:
```apex
List<DA_Analysis_Run__c> runs = [
    SELECT Id, Name, CreatedDate, DA_Project__c, DA_Project__r.Project_Key__c
    FROM DA_Analysis_Run__c
    WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
    WITH USER_MODE
    ORDER BY CreatedDate DESC, Id DESC
    LIMIT :limitVal
];
```

### 3.3 Authorized DTO Structure (`DAAnalysisRunSummaryDTO.cls`)
```apex
/**
 * @description Data Transfer Object representing an Analysis Run summary under Contract A
 */
public inherited sharing class DAAnalysisRunSummaryDTO {
    @AuraEnabled public String runId { get; set; }
    @AuraEnabled public String runIdentifier { get; set; }
    @AuraEnabled public Datetime createdDate { get; set; }
    @AuraEnabled public String projectId { get; set; }
    @AuraEnabled public String projectKey { get; set; }

    public DAAnalysisRunSummaryDTO() {}
}
```

### 3.4 Security & Boundary Invariants
1. **User Mode Enforcement:** The query must include `WITH USER_MODE` to respect object and field-level permissions.
2. **Project-Scope Validation:** The method must validate that `projectId` is not null or blank (`String.isBlank(projectId)` throws `AuraHandledException`).
3. **Deterministic Pagination & Bounded Limits:**
   - Default limit: 20 records when `maxRuns` is null or `<= 0`.
   - Maximum hard cap: 100 records (`Math.min(maxRuns, 100)`).
   - Deterministic sorting: `ORDER BY CreatedDate DESC, Id DESC` to guarantee stable ordering even if multiple runs share an identical timestamp.

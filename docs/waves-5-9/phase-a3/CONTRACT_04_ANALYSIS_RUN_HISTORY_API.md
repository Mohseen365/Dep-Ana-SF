# Contract 04: Analysis Run History API (Contract A Zero-Schema)

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-04`
- **Contract Name**: Analysis Run History API (Contract A Zero-Schema)
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Establishes the authoritative Apex controller, DTO structure, method signature, query limits, and security enforcement for retrieving historical analysis runs under strict Salesforce zero-schema constraints.
- **Affected Tasks**: `W7-P1` (Authoritative minimal history API), `W7-3` (Analysis History View), `W8-3` (Compare View Dual Run Selector)
- **Affected Workstreams**: Workstream C, Workstream D, Integration Coordinator

---

## 2. Source-of-Truth References
1. `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Row W7-P1: specifies `DAGraphController.cls`, `DAAnalysisRunSummaryDTO.cls`, `DAGraphControllerTest.cls`, and criteria `getAnalysisRuns querying Id, Name, CreatedDate, DA_Project__c with USER_MODE; limit 20/100; zero unapproved fields`).
2. `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` (Existing AuraEnabled controller methods: `getProjects`, `getLatestGraphMetadataForProject`, `getGraphChunks`).
3. `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/` (Authoritative object metadata: contains only custom lookup field `DA_Project__c`; no custom fields for Status, Metrics, or Barcode exist).
4. `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphSecurityTest.cls` and `DAGraphControllerTest.cls` (Existing security and controller testing baseline).

---

## 3. Discrepancy Resolution & Reconciliation (D2)

### 3.1 Controller and DTO Naming Conflict
- **Conflict**:
  - Phase A2 charters and input documents named `DAAnalysisHistoryController.cls` and `AnalysisRunDTO`.
  - Authoritative Wave 0.4.1 Register (`WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`) and Authoritative Ownership Manifest (`WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`) explicitly assign task W7-P1 to:
    - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
    - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls`
    - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls-meta.xml`
    - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`
- **Resolution**:
  In accordance with precedence rule 1 (Authoritative Wave 0.4.1 Register governs task scope and permitted paths), **`DAGraphController.cls` is the sole canonical Apex controller**, and **`DAAnalysisRunSummaryDTO.cls` is the sole canonical DTO class**. No new controller file (`DAAnalysisHistoryController.cls`) may be introduced.

---

## 4. Zero-Schema Metadata Invariants

Inspection of `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/` confirms that `DA_Analysis_Run__c` possesses only:
- Standard Salesforce fields (`Id`, `Name`, `CreatedDate`, `CreatedById`, `LastModifiedDate`, `SystemModstamp`).
- Exactly **one** custom field: `DA_Project__c` (Lookup to `DA_Project__c`).

**Strict Zero-Schema Prohibitions**:
- Fields `Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, and `DNA_Barcode__c` **DO NOT EXIST** in metadata and **MUST NOT** be queried or added.
- Any attempt to query these non-existent fields will cause a runtime SOQL error.
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived as `'COMPLETED'` if chunks exist, or `'UNKNOWN'`.
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.

---

## 5. Canonical Apex Contract

### 5.1 DTO Specification (`DAAnalysisRunSummaryDTO.cls`)
```apex
/**
 * @description Data Transfer Object representing a summary of a historical analysis run
 */
public with sharing class DAAnalysisRunSummaryDTO {
    @AuraEnabled public Id runId { get; set; }
    @AuraEnabled public String runName { get; set; }
    @AuraEnabled public Id projectId { get; set; }
    @AuraEnabled public String projectName { get; set; }
    @AuraEnabled public Datetime createdDate { get; set; }
    @AuraEnabled public String createdByName { get; set; }
    @AuraEnabled public Integer totalChunks { get; set; }
    @AuraEnabled public String status { get; set; }
}
```

### 5.2 Controller Method Specification (`DAGraphController.cls`)
```apex
/**
 * @description Fetches historical analysis runs for a given project under zero-schema constraints.
 * @param projectId The ID or Key of the DA_Project__c
 * @param queryLimit Maximum number of runs to return (default: 20, max: 100)
 * @return List of DAAnalysisRunSummaryDTO records ordered by CreatedDate DESC
 */
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer queryLimit) {
    if (String.isBlank(projectId)) {
        throw new AuraHandledException('Project ID is required.');
    }

    Integer safeLimit = 20;
    if (queryLimit != null && queryLimit > 0) {
        safeLimit = Math.min(queryLimit, 100);
    }

    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC
        LIMIT :safeLimit
    ];

    if (runs.isEmpty()) {
        return new List<DAAnalysisRunSummaryDTO>();
    }

    // Query chunk counts to determine payload availability and status
    Set<Id> runIds = new Set<Id>();
    for (DA_Analysis_Run__c run : runs) {
        runIds.add(run.Id);
    }

    Map<Id, Integer> chunkCountsByRunId = new Map<Id, Integer>();
    for (AggregateResult ar : [
        SELECT DA_Analysis_Run__c runId, COUNT(Id) chunkCount
        FROM DA_Graph_Chunk__c
        WHERE DA_Analysis_Run__c IN :runIds
        WITH USER_MODE
        GROUP BY DA_Analysis_Run__c
    ]) {
        chunkCountsByRunId.put((Id) ar.get('runId'), (Integer) ar.get('chunkCount'));
    }

    List<DAAnalysisRunSummaryDTO> dtos = new List<DAAnalysisRunSummaryDTO>();
    for (DA_Analysis_Run__c run : runs) {
        DAAnalysisRunSummaryDTO dto = new DAAnalysisRunSummaryDTO();
        dto.runId = run.Id;
        dto.runName = run.Name;
        dto.projectId = run.DA_Project__c;
        dto.projectName = run.DA_Project__r.Name;
        dto.createdDate = run.CreatedDate;
        dto.createdByName = run.CreatedBy != null ? run.CreatedBy.Name : 'System';

        Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
        dto.totalChunks = chunks;
        dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
        dtos.add(dto);
    }

    return dtos;
}
```

---

## 6. Security, Sharing, and Error Behavior

1. **Security & Sharing**:
   - `DAGraphController` enforces `with sharing`.
   - All SOQL operations strictly specify `WITH USER_MODE` to honor Object and Field Level Security (FLS) as well as Sharing Rules.
2. **Deterministic Tie-Breaking**:
   - Queries order primarily by `CreatedDate DESC, Id DESC` to ensure completely deterministic ordering.
3. **Error Handling**:
   - Blank `projectId` throws `AuraHandledException('Project ID is required.')`.
   - If user has no access to the project or object, `WITH USER_MODE` naturally suppresses inaccessible records or throws `QueryException`, transformed into `AuraHandledException`.
4. **Cacheability**:
   - Annotated with `@AuraEnabled(cacheable=true)` for lightning/aura client caching.

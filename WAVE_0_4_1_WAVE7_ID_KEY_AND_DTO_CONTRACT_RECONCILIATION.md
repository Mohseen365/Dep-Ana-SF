# Wave 0.4.1: Wave 7 ID/Key and DTO Contract Reconciliation

## 1. Executive Summary & Defect Remediation

During the independent technical review of Wave 0.4, two P1 contract ambiguities were identified in Task `W7-P1` (`DAGraphController.getAnalysisRuns`):
1. **Ambiguity in Project ID vs Project Key Resolution:**
   Wave 0.4 proposed using a 15/18-character alphanumeric regex (`^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$`) to determine whether the input parameter `projectId` is a Salesforce ID or a Project Key. However, because external project keys can legitimately be 15 or 18 alphanumeric characters, syntax checking alone is insufficient to guarantee record resolution.
2. **Inconsistent DTO Field Naming:**
   Wave 0.2 referenced `runIdentifier`, whereas Wave 0.4 referenced `runName`.

---

## 2. Robust Salesforce ID vs Project Key Resolution Strategy

### 2.1 The Two Failure Modes of Naive Regex Matching
1. **Type Coercion Exception:** If an arbitrary string (e.g. `"my-project-key"`) is bound directly to an `Id` field in SOQL (`DA_Project__c = :projectId`), Salesforce throws:
   `System.QueryException: Invalid Id: my-project-key`
2. **False ID Coercion:** If a project key happens to be an 18-character string (e.g. `"AlphaBetaGamma1234"`), regex matching treats it as a Salesforce ID and queries `DA_Project__c = :projectId`. Because no project has that record ID, the query returns empty results even though a project with `Project_Key__c = 'AlphaBetaGamma1234'` exists.

### 2.2 Authoritative Resolution Algorithm
The robust controller resolution follows a two-tier disambiguation:
1. First, validate whether `projectId` is syntactically a valid Salesforce ID using `String.isNotBlank(projectId)` and safe ID casting / regex (`Id.valueOf` inside a try-catch, or 15/18 alphanumeric check).
2. If syntactically an ID, query by both ID and Key:
   ```apex
   WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
   ```
   Because `projectId` is syntactically a valid ID, SOQL type coercion will succeed for `DA_Project__c`, while the OR branch checks `Project_Key__c` in case an external project key matches that 15/18 string.
3. If syntactically NOT an ID, query strictly by `Project_Key__c`:
   ```apex
   WHERE DA_Project__r.Project_Key__c = :projectId
   ```
   This strictly avoids binding an invalid ID string to the lookup field, completely eliminating `System.QueryException`.

### 2.3 User Mode and Access Governance
- All queries must be executed `WITH USER_MODE`.
- Enforces user-scoped CRUD and field-level security.
- Prevents cross-project or unauthorized tenant data disclosure.

---

## 3. Authoritative DTO Naming Standardization

We standardize on **`runName`** as the canonical DTO property:
- **Canonical Property Name:** `runName` (matches the underlying Salesforce standard field `DA_Analysis_Run__c.Name`).
- **Historical Naming:** `runIdentifier` is formally declared superseded and obsolete.

### Authoritative DTO Class Specification (`DAAnalysisRunSummaryDTO.cls`)
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

### Authoritative Apex Controller Signature (`DAGraphController.cls`)
```apex
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns)
```
- Parameters: `projectId` (String, required), `maxRuns` (Integer, default 20, max 100).
- Return type: `List<DAAnalysisRunSummaryDTO>`.

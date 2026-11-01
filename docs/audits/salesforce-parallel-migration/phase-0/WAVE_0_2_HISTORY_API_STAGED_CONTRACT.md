# Wave 0.2: History API Staged Contract & Schema Provisioning Boundary

## 1. Executive Summary & Problem Analysis

In Wave 0.1, Task `W7-P1` (Apex `getAnalysisRuns`) was marked as `CONDITIONALLY_BLOCKED` because custom object `DA_Analysis_Run__c` lacks several extended fields present in the React data schema, specifically:
- `Status__c`
- `Analysis_Timestamp__c`
- `Metrics_JSON__c`
- `DNA_Barcode__c`

Wave 0.1 concluded that the entire History capability was blocked until a schema change request could be approved and deployed to Salesforce.

However, an examination of the existing Salesforce schema in `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c` and controller logic in `DAGraphController.cls` reveals that:
1. `DA_Analysis_Run__c` currently possesses:
   - `Id` (Standard Salesforce 18-character ID)
   - `Name` (Text field representing the Run Identifier / timestamp string)
   - `CreatedDate` (Standard system audit timestamp)
   - `DA_Project__c` (Master-Detail relationship to `DA_Project__c`)
2. Existing ingestion service (`DAGraphIngestionService.cls`) populates `DA_Analysis_Run__c` records whenever graph chunks are uploaded.
3. Therefore, a **minimal, fully functional history listing API** can be implemented and deployed immediately with zero schema additions.

---

## 2. Contract A: Minimal History Listing API (Zero-Schema Dependency)

Contract A enables the retrieval of chronological analysis runs for a project using exclusively existing fields and metadata.

### 2.1 Apex Method Specification
```apex
public with sharing class DAGraphController {

    /**
     * @description Retrieves chronological analysis runs for a given project.
     * Operates exclusively on existing metadata fields: Id, Name, CreatedDate, DA_Project__c.
     * @param projectId Salesforce ID or Project_Key__c of the target project.
     * @param maxRuns Maximum number of runs to return (default 20, max 100).
     * @return List of minimal Analysis Run summary objects.
     */
    @AuraEnabled(cacheable=true)
    public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }

        Integer limitVal = (maxRuns == null || maxRuns <= 0) ? 20 : Math.min(maxRuns, 100);

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Name, CreatedDate, DA_Project__c, DA_Project__r.Project_Key__c
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
            WITH USER_MODE
            ORDER BY CreatedDate DESC, Id DESC
            LIMIT :limitVal
        ];

        List<DAAnalysisRunSummaryDTO> summaries = new List<DAAnalysisRunSummaryDTO>();
        for (DA_Analysis_Run__c run : runs) {
            DAAnalysisRunSummaryDTO dto = new DAAnalysisRunSummaryDTO();
            dto.runId = run.Id;
            dto.runIdentifier = run.Name;
            dto.createdDate = run.CreatedDate;
            dto.projectId = run.DA_Project__c;
            dto.projectKey = run.DA_Project__r.Project_Key__c;
            summaries.add(dto);
        }

        return summaries;
    }
}
```

### 2.2 Security, Query & Ordering Invariants
- **Enforcement of `WITH USER_MODE`:** Guarantees strict object and field-level security (FLS) compliance.
- **Deterministic Ordering:** Uses `ORDER BY CreatedDate DESC, Id DESC` to guarantee deterministic pagination and timeline sorting even when multiple runs share identical timestamps.
- **Bounded Result Set:** Defaults to 20 runs, hard-capped at 100 runs to prevent SOQL heap limit degradation.
- **Cacheability:** Marked `@AuraEnabled(cacheable=true)` to enable client-side LWC wire caching and lightning data service caching.
- **Project Isolation:** Scoped strictly by `DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`.

---

## 3. Contract B: Extended Historical Snapshot Schema (Schema-Provisioning Dependent)

Contract B defines the extended metadata required for deep historical comparison, run status badges, and architecture DNA inspection. These capabilities require schema provisioning before activation.

### 3.1 Field Gap Register & Specification
| Field API Name | Data Type | Length / Detail | Populated by Ingestion? | Consuming Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Status__c` | Picklist | `SUCCESS`, `FAILED`, `IN_PROGRESS` | Future Ingestion v2 | `daAnalysisHistoryView` | Missing (CR Required) |
| `Analysis_Timestamp__c` | DateTime | System DateTime | Future Ingestion v2 | `daAnalysisHistoryView` | Missing (CR Required) |
| `Commit_Hash__c` | Text | 40 characters | Future Ingestion v2 | `daAnalysisHistoryView` | Missing (CR Required) |
| `Node_Count__c` | Number | 8, 0 | Future Ingestion v2 | `daAnalysisHistoryView`, `daCompareView` | Missing (CR Required) |
| `Edge_Count__c` | Number | 8, 0 | Future Ingestion v2 | `daAnalysisHistoryView`, `daCompareView` | Missing (CR Required) |
| `High_Risk_Count__c` | Number | 6, 0 | Future Ingestion v2 | `daAnalysisHistoryView`, `daCompareView` | Missing (CR Required) |
| `Cycle_Count__c` | Number | 6, 0 | Future Ingestion v2 | `daAnalysisHistoryView`, `daCompareView` | Missing (CR Required) |
| `DNA_Barcode__c` | LongTextArea | 32,768 characters | Future DNA Generator | `daArchitectureDnaBarcode` | Missing (CR Required) |
| `Metrics_JSON__c` | LongTextArea | 131,072 characters | Future Analytics Worker | `daDiagnosticsView` | Missing (CR Required) |

---

## 4. Staged Launch & Execution Classification

| Capability / Task | Contract | Launch Status | Description |
| :--- | :--- | :--- | :--- |
| **W7-P1A: Minimal History API** | Contract A | **READY_TO_LAUNCH** | Implements `getAnalysisRuns` querying `Id`, `Name`, `CreatedDate`, `DA_Project__c`. Zero schema changes. |
| **W7-3A: History Timeline UI (Minimal)** | Contract A | **IMPLEMENTATION_DEPENDENT** | Renders run list, selection, and relative timestamps using `CreatedDate` and `Name`. Awaits `W7-P1A`. |
| **W7-P1B: Extended History API** | Contract B | **BLOCKED (SCHEMA)** | Queries extended metrics and status. Blocked until schema CR approval. |
| **W7-1: Diagnostics Scorecard** | W0-C1 (Payload) | **READY_TO_LAUNCH** | Derives diagnostics metrics directly in-memory from active graph payload. Independent of History API. |
| **W7-2: Architecture DNA Barcode** | W0-C1 (Payload) | **READY_TO_LAUNCH** | Computes DNA strip directly in-memory from active graph payload layers and risks. Independent of History API. |
| **W7-3B: Extended History Badges** | Contract B | **BLOCKED (SCHEMA)** | Displays commit hashes, status badges, and stored metrics. Awaits schema CR. |

**Authoritative Conclusion:**
Task `W7-P1A` can be dispatched immediately to Workstream C. History listing is **not** blocked by schema provisioning.

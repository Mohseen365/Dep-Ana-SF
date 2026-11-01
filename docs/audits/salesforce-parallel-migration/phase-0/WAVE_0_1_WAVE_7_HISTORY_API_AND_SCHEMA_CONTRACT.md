# Wave 0.1: Wave 7 Analysis History API & Schema Gap Analysis

**Status:** RECONCILED & BLOCKED PENDING SCHEMA DECISION
**Target Platform:** Salesforce Apex & Schema Metadata
**Scope:** Wave 7 (Diagnostics & History), Wave 8 (Snapshot Compare)

---

## 1. Executive Summary

This deliverable analyzes the API signature, project-key resolution semantics, object metadata, and security requirements for historical snapshot analysis runs (`DA_Analysis_Run__c`).

Forensic analysis confirms a major schema gap: `DA_Analysis_Run__c` currently contains only **one custom field** (`DA_Project__c`). Proposed fields (`Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, `DNA_Barcode__c`) **do not exist** in the Salesforce metadata. Consequently, Task `W7-P1` and its dependent views cannot be implemented until an explicit schema modification is authorized and applied.

---

## 2. API Signature & Parameter Semantics Analysis

### 2.1 Proposed vs Historical Signatures
- **Phase 3 Proposal:** `getAnalysisRuns(Id projectId)`
- **Wave 0 Draft Proposal:** `getAnalysisRuns(String projectId, Integer maxRuns)`

### 2.2 Inspection of Existing Repository Conventions
Inspection of `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`:
1. `getLatestGraphMetadataForProject(String projectId)`:
   - Takes `String projectId`.
   - Queries `DA_Analysis_Run__c` with:
     ```apex
     WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
     ```
   - This allows clients to pass either an 18-character Salesforce Record `Id` or a string `Project_Key__c` (e.g. `DEFAULT_PROJECT`).
2. `getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)`:
   - Takes `String projectId` for scope validation.
3. Limits and pagination:
   - All controller endpoints enforce explicit parameter bounds (e.g., `maxChunks` defaulting to 5, capped at 10) to guard against governor limit exhaustion and oversized client payloads.

### 2.3 Recommended Authoritative Apex API Signature
To match repository conventions:

```apex
@AuraEnabled(cacheable=true)
public static List<DA_Analysis_Run__c> getAnalysisRuns(String projectId, Integer maxRuns)
```

**Semantics & Validation:**
- `projectId`: Required string. Throws `AuraHandledException('Project ID is required.')` if blank. Matches both `DA_Project__c` (Record Id) and `DA_Project__r.Project_Key__c` (Key).
- `maxRuns`: Optional integer. Defaults to 20 if null or $\le 0$; capped at 100 to prevent heap and query row limits.
- Order: `ORDER BY CreatedDate DESC`.
- Enforcement: `WITH USER_MODE` to strictly adhere to Field-Level Security and Object Permissions.

---

## 3. Metadata & Field Inventory for `DA_Analysis_Run__c`

We audited `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/`:

| Proposed Field | Actual Metadata File Exists? | Data Type | Populated by Ingestion Code? | Status |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | Platform Standard | Id (18-char) | Yes (Auto) | Available |
| `Name` | Platform Standard | Text / AutoNumber | Yes (via `createAnalysisRun`) | Available |
| `CreatedDate` | Platform Standard | DateTime | Yes (Auto) | Available |
| `DA_Project__c` | **YES** (`DA_Project__c.field-meta.xml`) | Lookup (`DA_Project__c`) | Yes (via `createAnalysisRun`) | Available |
| `Status__c` | **NO** | Missing | No | **SCHEMA GAP (BLOCKED)** |
| `Analysis_Timestamp__c` | **NO** | Missing | No | **SCHEMA GAP (BLOCKED)** |
| `Metrics_JSON__c` | **NO** | Missing | No | **SCHEMA GAP (BLOCKED)** |
| `DNA_Barcode__c` | **NO** | Missing | No | **SCHEMA GAP (BLOCKED)** |

### 3.1 Existing Ingestion Service Evidence
In `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`:
```apex
public static String createAnalysisRun(String projectId, String runName) {
    if (String.isBlank(projectId) || String.isBlank(runName)) {
        throw new IllegalArgumentException('Project ID and run name are required.');
    }

    DA_Analysis_Run__c run = new DA_Analysis_Run__c(
        DA_Project__c = projectId,
        Name = runName.trim()
    );
    insert as user run;
    return run.Id;
}
```
The ingestion service **only** sets `DA_Project__c` and `Name`. It does not populate or reference `Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, or `DNA_Barcode__c`.

---

## 4. Security & Sharing Architecture

1. **Class Sharing:** `DAGraphController` must declare `with sharing` to enforce organization-wide sharing settings.
2. **User Mode Enforcement:** All SOQL queries must declare `WITH USER_MODE` (or `AS USER`), enforcing CRUD and FLS at query execution.
3. **Project Scoping:** Cross-project data leaks must be prevented by matching both `DA_Project__c` and `DA_Project__r.Project_Key__c`.
4. **Cacheability:** `@AuraEnabled(cacheable=true)` requires data freshness awareness. When a new run is ingested, client components must invoke `refreshApex`.

---

## 5. Blocking Disposition & Recommendation

### Disposition:
$$\mathbf{TASK\_W7\_P1\ IS\ CONDITIONALLY\ BLOCKED}$$

**Root Cause:**
Task `W7-P1` cannot query or return fields (`Status__c`, `Metrics_JSON__c`, `DNA_Barcode__c`) that do not exist in metadata without generating Apex compilation and runtime errors.

**Action Required Prior to Implementation:**
1. A separate schema provisioning change must be authorized to add the missing custom field metadata to `DA_Analysis_Run__c`:
   - `Status__c` (Picklist or Text(50))
   - `Analysis_Timestamp__c` (DateTime)
   - `Metrics_JSON__c` (LongTextArea(131072))
   - `DNA_Barcode__c` (LongTextArea(131072) or Text(255))
2. Update `DAGraphIngestionService.cls` to populate these fields during graph snapshot ingestion.
3. In the interim, Wave 7 UI tasks (`W7-1` Diagnostics Scorecard, `W7-2` Architecture DNA Barcode) can proceed independently using client-side mock runs or the current active graph payload (`Contract W0-C1`).

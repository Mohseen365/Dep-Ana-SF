# Wave 1 Final Apex Authorization Audit Report

## 1. Executive Summary

This report presents the independent audit of the Apex authorization model implemented in `DAGraphController.cls`, `DAGraphIngestionService.cls`, `DAGraphChunkService.cls`, and associated test classes.

* **Audit Status:** `PASS WITH CONDITIONS`
* **Condition:** Offline static code review and JS simulation confirm project ownership scoping, `WITH USER_MODE` query enforcement, and `as user` DML safety across all entry points. Final runtime verification of Salesforce sharing settings (OWD / sharing rules) remains blocked pending access to an authorized Salesforce org.

---

## 2. Exposed Apex Entry Points & Authorization Matrix

| Method Signature | Exposed Entry Point | Input Parameters | Ownership Authorization Check | Data Query / DML | Offline Test Coverage |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `getProjects()` | `@AuraEnabled(cacheable=true)` | None | Enforces user-mode SOQL visibility on `DA_Project__c`. | `SELECT ... FROM DA_Project__c WITH USER_MODE` | `run-poc-tests.cjs` (Metadata contract check) |
| `getLatestGraphMetadataForProject(projectId)` | `@AuraEnabled(cacheable=true)` | `projectId` (ID or Key) | Validates `projectId` parameter. Queries latest run matching `DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`. | `SELECT ... FROM DA_Analysis_Run__c ... WITH USER_MODE` + `AggregateResult` count on `DA_Graph_Chunk__c` | `run-poc-tests.cjs` (Metadata DTO Alignment & Paginated Fetch) |
| `getGraphChunks(runId, startIndex, maxChunks)` | `@AuraEnabled(cacheable=true)` | `runId`, `startIndex`, `maxChunks` | **Implicit Scoping:** Queries `DA_Analysis_Run__c` where `Id = :runId AND DA_Project__c != null WITH USER_MODE` to derive active project context before calling quad-parameter overload. | `SELECT Id, DA_Project__c FROM DA_Analysis_Run__c WITH USER_MODE` | `run-poc-tests.cjs` (Category 2 & 3 bounded fetch) |
| `getGraphChunks(runId, startIndex, maxChunks, projectId)` | `@AuraEnabled(cacheable=true)` | `runId`, `startIndex`, `maxChunks`, `projectId` | **Explicit Project Scoping:** Queries `DA_Analysis_Run__c` where `Id = :runId AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId) WITH USER_MODE`. Throws `AuraHandledException` if empty. | `SELECT Chunk_Index__c, Payload_Data__c FROM DA_Graph_Chunk__c ... WITH USER_MODE` | `run-poc-tests.cjs` (Category 5 Adversarial & Category 2 bounded fetch) |
| `getLatestGraphForProject(projectId)` | `@AuraEnabled(cacheable=true)` (Deprecated) | `projectId` | Delegates to `getLatestGraphMetadataForProject(projectId)`, then queries `DA_Graph_Chunk__c` under `WITH USER_MODE` for the validated `dto.runId`. | `SELECT Chunk_Index__c, Payload_Data__c FROM DA_Graph_Chunk__c ... WITH USER_MODE` | `run-poc-tests.cjs` (Fixture paginated verification) |
| `saveGraphChunks(runId, chunkData, startIndex, projectId)` | Public Service Method | `runId`, `chunkData`, `startIndex`, `projectId` | Validates `runId` and `projectId` relationship via `DA_Analysis_Run__c` query under `WITH USER_MODE`. Throws `IllegalArgumentException` on mismatch. | `insert as user` / `update as user` on `DA_Graph_Chunk__c` | `run-poc-tests.cjs` (Category 5 Bounded Batching & Idempotency) |

---

## 3. Detailed Verification of Security Invariants

1. **Project-Run Scoping:**
   Every graph chunk query requires validation that `DA_Analysis_Run__c` belongs to the specified `projectId` or `Project_Key__c`. If `projectId` is omitted in `getGraphChunks(runId, startIndex, maxChunks)`, the controller automatically derives the project context from `DA_Analysis_Run__c.DA_Project__c` under `WITH USER_MODE`.

2. **User-Mode & Sharing Controls:**
   - All classes use `public with sharing`.
   - Every SOQL query includes `WITH USER_MODE`.
   - All DML operations in `DAGraphIngestionService.cls` execute using `insert as user` and `update as user`.

3. **Pagination & Boundary Security:**
   - `maxChunks` is strictly capped at `10` per request (`Math.min(maxChunks, 10)`).
   - Negative or zero `startIndex` values default to `0`.
   - Integer overflow on `startIndex + maxChunks` is guarded using `(Long) startIndex + (Long) maxChunks - 1` with a `2147483647` cap.
   - Pagination requests operate on a validated `runId` and cannot change the authorization boundary across pages.

4. **Fault Injection & Malformed ID Handling:**
   - Null, blank, non-existent, or project-mismatched `runId` values throw `AuraHandledException` in controller methods or `IllegalArgumentException` in service methods before any chunk data or DML is executed.

---

## 4. Unresolved Risks & Salesforce Org Prerequisites

* **Static Evidence Limitation:** While static SOQL/DML patterns (`WITH USER_MODE`, `insert as user`) and offline JS harness tests demonstrate proper logic flow, actual Apex FLS/CRUD enforcement and record sharing rules cannot be fully validated without executing `DAGraphSecurityTest.cls` in a live Salesforce scratch org.
* **Org Validation Disposition:** Non-blocking for offline code remediation audit, but mandatory before deployment to production or UAT environments.

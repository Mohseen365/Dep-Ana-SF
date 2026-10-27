# Wave 1 Apex Security and Correctness Audit Review

## Executive Summary
This document provides a detailed source-level security and correctness review of the Apex classes introduced or modified as part of Wave 1 of the Dependency Analyzer Salesforce Migration.

## Audited Apex Classes

1. `DAGraphController.cls` (`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`)
2. `DAGraphIngestionService.cls` (`scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`)
3. `DAGraphChunkService.cls` (`scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls`)
4. `DAGraphDTO.cls` (`scratch/salesforce-poc/force-app/main/default/classes/dto/DAGraphDTO.cls`)
5. `DAErrorResponse.cls` (`scratch/salesforce-poc/force-app/main/default/classes/dto/DAErrorResponse.cls`)

---

## Security & Access Boundary Review

### 1. Class Sharing Declarations
* `DAGraphController.cls`: Declared `with sharing`. Prevents unauthorized record access via SOQL by enforcing organizational sharing rules.
* `DAGraphIngestionService.cls`: Declared `with sharing`. Enforces sharing rules on ingestion pipelines.
* `DAGraphChunkService.cls`: Declared `with sharing`. Utility calculations run under caller sharing context.
* `DAGraphDTO.cls`: Declared `inherited sharing`. Safe data transfer container that adopts caller security context.

### 2. Query Enforcement (`WITH USER_MODE`)
* All SOQL queries in `DAGraphController.cls` and `DAGraphIngestionService.cls` explicitly specify `WITH USER_MODE`.
* **SOQL Operations Verified:**
  * `DAGraphController.getLatestGraphMetadataForProject`: Querying `DA_Analysis_Run__c` with `WITH USER_MODE`.
  * `DAGraphController.getGraphChunks`: Querying `DA_Analysis_Run__c` and `DA_Graph_Chunk__c` with `WITH USER_MODE`.
  * `DAGraphIngestionService.createProject`: Querying `DA_Project__c` with `WITH USER_MODE`.
  * `DAGraphIngestionService.saveGraphChunks`: Querying `DA_Analysis_Run__c` with `WITH USER_MODE`.

### 3. DML Enforcement (`as user`)
* All DML operations in `DAGraphIngestionService.cls` explicitly use user-mode DML:
  * `insert as user proj;`
  * `insert as user run;`
  * `insert as user records;`
* Ensures object-level and field-level security (CRUD/FLS) are enforced during record creation.

---

## Security Defects & Identified Risks

### 1. Scope Authorization Defect in `getGraphChunks` (Severity: HIGH)
* **Finding:** In `DAGraphController.getGraphChunks(runId, startIndex, maxChunks)`, the query validates that `DA_Analysis_Run__c` exists and is readable by the user via `WITH USER_MODE`. However, it does not verify that `runId` belongs to the expected `projectId` passed by the client component or authorized in the current session context.
* **Risk:** If a user possesses a valid `runId` from another project they have read permissions for, they can retrieve chunk payloads independently of project boundary validations.
* **Required Action:** Add `DA_Project__c` validation matching the project context to `getGraphChunks`.

### 2. Single-Transaction Ingestion Governor Limit Constraints (Severity: MEDIUM)
* **Finding:** `DAGraphIngestionService.saveGraphChunks` inserts a list of `DA_Graph_Chunk__c` records in a single synchronous Apex DML operation (`insert as user records;`).
* **Risk:** While individual chunks are capped at 131,072 characters, inserting 80+ chunks (up to the 10 MB payload limit) in a single synchronous transaction consumes significant heap space (~10 MB heap limit in synchronous Apex) and may hit governor limits if executed synchronously.
* **Required Action:** For large payloads approaching 10 MB, mandate asynchronous queueable ingestion or client-driven batching.

---

## Limitations of Offline Verification

* **Platform Execution:** Apex code execution, governor limit behavior, SOQL query planner optimization, and live FLS enforcement cannot be executed without an authorized Salesforce org.
* **Status:** Apex security patterns have been source-inspected and verified for user-mode compliance, but live org deployment and runtime behavior remain `BLOCKED`.

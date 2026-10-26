# WAVE 4 Security Hardening Report

## 1. Executive Summary
This report details the offline security verification, object sharing model, CRUD/FLS enforcement, multi-tenant project isolation, and restricted-user test cases for the Salesforce POC under `scratch/salesforce-poc/`.

## 2. Security Architecture & Data Access Model

### Master-Detail Sharing Hierarchy
- `DA_Project__c`: Top-level custom object (`sharingModel = ReadWrite`).
- `DA_Analysis_Run__c`: Child custom object (`sharingModel = ControlledByParent`, Master-Detail to `DA_Project__c`).
- `DA_Graph_Chunk__c`: Child custom object (`sharingModel = ControlledByParent`, Master-Detail to `DA_Analysis_Run__c`).

### Key Security Invariants
1. **Inherited Sharing Access**: Access to graph runs (`DA_Analysis_Run__c`) and chunk payloads (`DA_Graph_Chunk__c`) strictly inherits from parent `DA_Project__c` access. Users without read access to a project cannot access its runs or chunks.
2. **USER_MODE SOQL Enforcement**: All queries in `DAGraphController.cls` enforce user CRUD and Field-Level Security (FLS) via `WITH USER_MODE`.
3. **USER_MODE DML Ingestion**: `DAGraphIngestionService.cls` executes DML using `insert as user` to enforce object creation rights.
4. **Run Validation Guard**: `DAGraphController.getGraphChunks(runId, startIndex, maxChunks)` queries `DA_Analysis_Run__c` with `WHERE Id = :runId WITH USER_MODE` before querying `DA_Graph_Chunk__c`. Guessed or unauthorized run IDs trigger `AuraHandledException('Invalid or unauthorized Run ID.')`.
5. **No Information Leakage**: Errors are caught and rethrown as standardized `AuraHandledException` or wrapped in `DAErrorResponse`, preventing raw SOQL stack trace or schema metadata exposure.

## 3. Authored Apex Security Tests (`DAGraphSecurityTest.cls`)

| Test Method Name | Target Security Control | Implementation / Verification Strategy | Status |
|---|---|---|---|
| `testProjectIsolation` | Multi-Tenant Isolation | Asserts metadata query for Project A strictly returns Project A and excludes Project B. | Authored & Statically Verified |
| `testSystemRunAsRestrictedUserAccess` | Standard User CRUD/FLS | Executes `getGraphChunks` under `System.runAs(restrictedUser)` (Standard User profile without DA permissions). Asserts `System.QueryException` or `AuraHandledException`. | Authored (Pending Org Execution) |
| `testUnauthorizedChunkRetrievalWithGuessedRunId` | Guessed / Invalid Run ID Guard | Calls `getGraphChunks` with fake `runId`. Asserts `AuraHandledException` is thrown. | Authored & Statically Verified |

## 4. Static Code Security Analysis
- Verified 100% of SOQL queries in `DAGraphController.cls` use `WITH USER_MODE`.
- Verified zero raw DML statements in ingestion service (all use `insert as user`).
- Verified zero hardcoded credentials, secret keys, or org tokens in repository source.

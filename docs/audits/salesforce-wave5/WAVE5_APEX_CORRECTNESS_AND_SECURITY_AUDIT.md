# Wave 5 Apex Correctness and Security Audit Report

## 1. Executive Summary
This audit inspects the Apex server-side components of the Salesforce Dependency Analyzer POC in `scratch/salesforce-poc/`: `DAGraphController.cls`, `DAGraphChunkService.cls`, `DAGraphIngestionService.cls`, `DAGraphDTO.cls`, and `DAErrorResponse.cls`.

## 2. Controller & Service Analysis

### 2.1 Metadata Retrieval (`DAGraphController.getLatestGraphMetadataForProject`)
- **Metadata-First Pattern:** Synchronously queries `DA_Analysis_Run__c` and uses `AggregateResult` (`COUNT(Id)`) on `DA_Graph_Chunk__c` to determine chunk count without loading raw string payloads into heap memory.
- **Project Scope Resolution:** Resolves projects via `DA_Project__c.Id` or `Project_Key__c`.
- **Deterministic Ordering:** Selects latest analysis run sorted by `CreatedDate DESC LIMIT 1`.
- **Empty State Handling:** Safe DTO instantiation when no runs exist (`totalChunks = 0`, `isChunked = false`).

### 2.2 Bounded Chunk Retrieval (`DAGraphController.getGraphChunks`)
- **Input Boundaries:** Caps `maxChunks` between 1 and 10 (default 5). Normalizes negative or null `startIndex` to 0.
- **Run ID Authorization:** Validates `runId` existence via `WITH USER_MODE` query before querying chunks.
- **Overflow Protection:** Remediated in Wave 5 to prevent integer overflow on large `startIndex` values using `Long` arithmetic.

### 2.3 Payload Chunking & Field Limits (`DAGraphChunkService.chunkPayload`)
- **Field Limit Alignment:** LongTextArea `Payload_Data__c` has a max length of 131,072 characters.
- **Remediation:** Remediated `maxChunkSize` in `DAGraphChunkService.cls` to cap chunk parameter at 131,072 characters to prevent DML truncation errors during ingestion.

### 2.4 Ingestion Service (`DAGraphIngestionService.cls`)
- **Validation:** Enforces mandatory non-blank `projectName` and `projectKey` when creating projects.
- **DML Access:** Uses `insert as user` for user-mode enforcement during record creation.

## 3. CRUD, FLS, and Security Enforcement
- **SOQL User Mode:** All queries in `DAGraphController.cls` explicitly execute `WITH USER_MODE`.
- **Master-Detail Sharing:** `DA_Analysis_Run__c` is `ControlledByParent` on `DA_Project__c`. `DA_Graph_Chunk__c` is `ControlledByParent` on `DA_Analysis_Run__c`. Organization-wide sharing model for `DA_Project__c` is `ReadWrite`.
- **System.runAs Restricted User Tests:** Implemented in `DAGraphSecurityTest.cls` to verify `QueryException` or `AuraHandledException` when object/field access is restricted.

## 4. Apex Test Quality & Execution Classification
- `DAGraphControllerTest.cls` and `DAGraphSecurityTest.cls` cover project isolation, unauthorized run IDs, bounded pagination, and legacy endpoints.
- **Classification:** **AUTHORED / PENDING FINAL STAGE**. Test code is complete and statically verified against Apex classes and custom objects, but live Apex test execution against a Salesforce org is deferred until the final stage per dispatch rules.

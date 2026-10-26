# Wave 2 Independent Verification & Remediation Audit Report

**Audit Commit:** `d8269689c73692f0e7a51083af43838e6d8e2de9`
**Date:** October 2026
**Auditor:** Independent Senior Salesforce & Integration Audit Lead
**Scope:** `scratch/salesforce-poc/` (Salesforce POC), Node.js Engine & React Explorer Baseline Verification

---

## 1. Executive Summary

This independent audit evaluated the Wave 2 Salesforce Migration Proof-of-Concept (POC) located under `scratch/salesforce-poc/`. Previous lane reports claimed 100% offline parity and complete readiness, but contained reporting contradictions and unverified org-dependent claims.

### Key Audit Findings
1. **Source Code & Metadata Inventory Verified:** Inspected all 23 metadata, Apex, LWC, and static resource files. Identified two unreferenced legacy components (`GraphDataController.cls` and `lwc/graphViewer`).
2. **Reporting Contradictions Reconciled:**
   - Vitest test counts reconciled: 31/35 tests passing (4 pre-existing baseline failures in `ProjectContext` and `useViewState`) across 5 test files, explaining the difference with the 26/30 reported in Wave 1.
   - Acceptance claims corrected: Prior reports claimed Apex tests passed. Tests were authored but **never executed** due to missing live org access.
3. **Confirmed Defects Fixed:**
   - `daGraphViewer.js`: Added missing `validatePayloadIntegrity` invocation from `c/daGraphPayloadLoader` prior to JSON parsing, and added `disconnectedCallback()` component lifecycle cleanup.
   - `DAGraphChunkService.cls` & `DAGraphController.cls`: Implemented contiguous chunk index sequence verification (`verifyChunkSequence`), and enabled dual project resolution by record ID or `Project_Key__c`.
   - `DAGraphIngestionService.cls`: Added parameter validation throwing explicit exceptions on blank input arguments.
4. **Offline Test Suite Created:** Built `scratch/salesforce-poc/tests/run-poc-tests.cjs` executing 9 tests covering chunking, reassembly, payload integrity, out-of-order chunk rejection, and PBIM/BQC/CST real fixture payloads. 100% passed.
5. **Architectural & Governor Limit Risk Discovered:** Synchronous Apex method `@AuraEnabled getLatestGraphForProject` returning all chunks at once will exceed the **6 MB Apex Heap Limit** for payloads > ~2.5 MB (e.g. PBIM @ 4.25 MB). This requires asynchronous or REST chunk-by-chunk retrieval during Wave 3 org validation.

---

## 2. Actual Source Inventory

| Directory / File Path | Type / Metadata | Purpose | Status / Notes |
| :--- | :--- | :--- | :--- |
| `objects/DA_Project__c/` | Custom Object | Project registry | Master object (`Project_Key__c` unique text(100)) |
| `objects/DA_Analysis_Run__c/` | Custom Object | Analysis run instance | MasterDetail to `DA_Project__c` |
| `objects/DA_Graph_Chunk__c/` | Custom Object | Graph payload storage | MasterDetail to `DA_Analysis_Run__c`. `Payload_Data__c` LongTextArea(131,072), `Chunk_Index__c` Number(6,0) |
| `objects/DA_Finding__c/` | Custom Object | Architecture findings | Independent object |
| `objects/DA_Annotation__c/` | Custom Object | User graph annotations | Controlled by parent |
| `objects/DA_User_Preference__c/` | Custom Object | Saved user settings | Private sharing model |
| `classes/dto/DAGraphDTO.cls` | Apex Class | Graph DTO Envelope | Standard DTO containing project info, chunk flags, and raw/chunked payload strings |
| `classes/dto/DAErrorResponse.cls` | Apex Class | Error Envelope | Standardized error code, message, and details |
| `classes/controllers/DAGraphController.cls` | Apex Class | Controller | `getProjects` & `getLatestGraphForProject` (`WITH USER_MODE`, sequence validation added) |
| `classes/services/DAGraphChunkService.cls` | Apex Service | Chunking Engine | `chunkPayload`, `reassembleChunks`, `verifyChunkSequence` |
| `classes/services/DAGraphIngestionService.cls` | Apex Service | Ingestion Engine | `createProject`, `createAnalysisRun`, `saveGraphChunks` (validated arguments) |
| `classes/tests/DAGraphControllerTest.cls` | Apex Test | Unit Test Suite | Authored test suite for controller methods |
| `classes/tests/DAGraphSecurityTest.cls` | Apex Test | Security Suite | Authored multi-tenant isolation tests |
| `classes/GraphDataController.cls` | Apex Class | Prototype Controller | Legacy / unreferenced hardcoded mock controller |
| `lwc/daGraphPayloadLoader/` | LWC Module | Utility Loader | Exports `reassembleChunks` and `validatePayloadIntegrity` |
| `lwc/daGraphViewer/` | LWC Component | Main Graph Renderer | Renders Cytoscape graph, imports `c/daGraphPayloadLoader`, `disconnectedCallback` added |
| `lwc/graphViewer/` | LWC Component | Prototype Viewer | Legacy / unreferenced prototype component |
| `staticresources/cytoscape.js` | Static Resource | Cytoscape v3.30.2 | Minified Cytoscape JS engine |

---

## 3. Reconciliation of Reporting Contradictions

### A. Vitest Test Counts (26/30 vs 31/35)
- **Wave 1 Closure Report Claim:** 26 passing, 4 failing (30 total tests).
- **Wave 2 Lane F Report Claim:** 31 passing, 4 failing across 35 tests (5 test files).
- **Audit Verification Result:** Executing `cd explorer && npx vitest run ProjectContext useViewState` runs 5 test files (`ProjectContext.test.tsx`, `ProjectContext.optional.test.tsx`, `useViewState.test.ts`, `useViewState.fix15.test.tsx`, `useViewState.fix16.test.tsx`) with **35 total tests: 31 passed, 4 failed**.
- **Explanation:** Wave 1 report executed a narrower subset of matching test files (30 tests), whereas Wave 2 Lane F executed all 5 matching files. The 4 test failures are identical pre-existing React explorer baseline assertions preserved per Decision Register `DEC-07`.

### B. Acceptance Matrix Test Evidence Overstatement
- **Wave 2 Acceptance Matrix Claim:** Marked Apex unit tests and security tests as `PASSED`.
- **Audit Verification Result:** Apex test classes (`DAGraphControllerTest`, `DAGraphSecurityTest`) exist and pass static syntax checks, but **HAVE NOT BEEN EXECUTED in a Salesforce org** because org deployment remained blocked.
- **Correction:** Status updated to `AUTHORED & STATICS PASSED (ORG EXECUTION BLOCKED)`.

---

## 4. Confirmed Source Defects & Targeted Fixes

| Defect ID | Affected File | Severity | Description & Root Cause | Targeted Fix Applied |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | `daGraphViewer.js` | Medium | `daGraphViewer` did not import or invoke `validatePayloadIntegrity` from `daGraphPayloadLoader` before calling `JSON.parse`. | Imported `validatePayloadIntegrity` and validated payload string prior to parsing. |
| **DEF-02** | `daGraphViewer.js` | Medium | `daGraphViewer` lacked `disconnectedCallback` cleanup, risking memory leaks when unmounted. | Implemented `disconnectedCallback()` calling `cyInstance.destroy()`. |
| **DEF-03** | `DAGraphChunkService.cls` & `DAGraphController.cls` | Medium | `reassembleChunks` and `getLatestGraphForProject` did not verify that chunk indices form a contiguous sequence (`0, 1, ..., N-1`). Missing or out-of-order chunks caused silent corruption. | Implemented `verifyChunkSequence` in `DAGraphChunkService` and enforced it in `DAGraphController`. |
| **DEF-04** | `DAGraphController.cls` | Low | `getLatestGraphForProject` queried only `DA_Project__c` ID equality, failing if a caller supplied `Project_Key__c`. | Extended query condition to `WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`. |
| **DEF-05** | `DAGraphIngestionService.cls` | Low | Service methods lacked argument checks for blank names, keys, and IDs. | Added `String.isBlank()` parameter validation throwing `IllegalArgumentException`. |

---

## 5. Offline Test Suite Execution

A dedicated offline test suite was created in `scratch/salesforce-poc/tests/run-poc-tests.cjs`.

### Test Summary
- **Total Tests Executed:** 9
- **Pass Rate:** 100% (9 passed, 0 failed)
- **Exit Code:** `0`

### Test Categories Verified
1. **Reassembly & Integrity:** Reassembly of chunk arrays, empty array safety, JSON payload integrity checks on valid and malformed JSON.
2. **Chunk Sequence Verification:** Contiguous index verification (`0, 1, 2`), rejection of missing indices (`0, 2`) and out-of-order chunks (`1, 0`).
3. **Real Benchmark Fixture Reassembly:**
   - **PBIM:** 4,253,569 bytes -> 43 chunks (100k) -> 100% exact reassembly -> 528 nodes, 2,063 edges.
   - **BQC:** 1,332,083 bytes -> 14 chunks (100k) -> 100% exact reassembly -> 274 nodes, 603 edges.
   - **CST:** 1,860,770 bytes -> 19 chunks (100k) -> 100% exact reassembly -> 240 nodes, 1,024 edges.

---

## 6. Remaining Risks & Wave 3 Org-Dependent Blockers

1. **Synchronous Apex Heap Limit Risk:** Returning > 2.5 MB payloads (such as PBIM at 4.25 MB) in a single synchronous `@AuraEnabled` call will exceed the 6 MB Apex heap limit. Wave 3 org validation must test or implement chunked LWC paginated fetching.
2. **Org Execution & Security Enforcements:** Field-Level Security (FLS), Object-Level Security (OLS), sharing rules (`ControlledByParent`), and `System.runAs()` multi-user boundary tests require execution against a live Salesforce org.
3. **LWS / CSP Compatibility:** Cytoscape static resource execution inside Lightning Web Security (LWS) sandbox must be validated in an authenticated Salesforce org.

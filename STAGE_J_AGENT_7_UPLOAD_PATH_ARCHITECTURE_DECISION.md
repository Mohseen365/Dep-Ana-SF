# Stage J Agent 7 Upload Path Architecture Decision & End-to-End Call Graph Analysis

## Document Identification
- **Document Type**: Architecture Decision Record (ADR) & Call Graph Trace
- **Author**: Agent 7 (Project Creation & Import Lead)
- **Recipient**: Integration Coordinator D1
- **Authority**: Project Owner (PO-DEC-V2-01, Invariant 11, Invariant 12)
- **Date**: 2026-11-11
- **Status**: `PROPOSED_DECISION_SUBMITTED_TO_D1`

---

## 1. Executive Summary & Critical Issue Statement

In Stage J, the Project Owner raised a critical architectural issue regarding the graph ingestion workflow:
> The previous report describes:
> `DAProjectController.uploadChunks()` and `finalizeRun()` calling `DAGraphIngestionService` directly.
> The approved architecture establishes REST ingestion as the graph-ingestion transport.
> You must resolve this distinction explicitly:
> Determine whether the AuraEnabled methods are:
> 1. A legitimate internal facade over the same canonical service, or
> 2. A competing graph-ingestion transport.
> Do not assume that direct invocation of the same service automatically satisfies the one-transport invariant.

This document traces the complete call graph for project lifecycle, analyzes the transport boundary, evaluates the architectural options against platform invariants, and formally submits the architecture decision to Integration Coordinator D1.

---

## 2. End-to-End Call Graph Trace

The complete lifecycle consists of eight sequential phases:

```
+----------------------------------------------------------------------------------------------------+
| 1. PROJECT CREATION                                                                                |
|    Browser LWC (daProjectCreateModal.js)                                                           |
|      └──> Apex Controller: DAProjectController.createProject() [WITH USER_MODE]                    |
|             ├──> Query: SELECT Id FROM DA_Project__c WHERE Project_Key__c = :cleanKey (uniqueness) |
|             └──> DML: insert as user new DA_Project__c                                             |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 2. PROJECT IDENTITY & SELECTION                                                                    |
|    Browser LWC (daProjectSelector.js / daAppShell.js)                                              |
|      └──> Apex Controller: DAGraphController.getProjects() [cacheable=true, WITH USER_MODE]        |
|             └──> Resolves Project Key & Id; fires CustomEvent 'projectchange'                      |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 3. ANALYSIS RUN CREATION                                                                           |
|    Browser LWC (daProjectCreateModal.js)                                                           |
|      └──> Apex Controller: DAProjectController.initiateAnalysisRun()                               |
|             ├──> Security Check: DAProjectSecurityService.validateProjectAccessForCurrentUser()     |
|             │    (Requires SCOPE_ANALYSIS_UPLOAD, checks Private OWD record ownership/grants)      |
|             └──> Service: DAGraphIngestionService.createAnalysisRun()                              |
|                    └──> DML: insert as user new DA_Analysis_Run__c (QUEUED / EMPTY)                |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 4. GRAPH UPLOAD & TRANSPORT BOUNDARY                                                               |
|    A. External Ingestion (CI/CD, CLI, External Node Analyzers):                                    |
|       Client: scripts/salesforce-upload-client.cjs                                                 |
|         └──> Wire: POST /services/apexrest/da/v1/ingest/chunks                                     |
|                └──> REST Resource: DAGraphIngestionRestResource.doPost()                          |
|                       └──> Service: DAGraphIngestionService.saveGraphChunks()                      |
|                                                                                                    |
|    B. In-Browser Lightning UI Local File Import (daProjectCreateModal.js):                         |
|       Client: Browser FileReader -> partitionPayloadIntoChunks() (<= 131,072 chars)                |
|         └──> Apex Controller: DAProjectController.uploadChunks()                                   |
|                └──> Service: DAGraphIngestionService.saveGraphChunks()                              |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 5. CHUNK PERSISTENCE & DEDUPLICATION                                                               |
|    Canonical Service: DAGraphIngestionService.saveGraphChunks()                                     |
|      ├──> SOQL: Existing DA_Graph_Chunk__c for range (Chunk_Key__c = <RunId>_<Index>)              |
|      ├──> Idempotency Check: Identical payload -> no-op; Conflicting payload -> fail closed        |
|      └──> DML: insert as user List<DA_Graph_Chunk__c>                                              |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 6. FINALIZATION & INTEGRITY VERIFICATION                                                           |
|    A. External: POST /services/apexrest/da/v1/ingest/finalize                                      |
|    B. UI Import: DAProjectController.finalizeRun()                                                 |
|         └──> Service: DAGraphIngestionService.finalizeAnalysisRunWithResult()                      |
|                ├──> Total Chunks vs persisted DA_Graph_Chunk__c count verification                 |
|                ├──> Chunk Index Continuity verification (0 .. N-1)                                 |
|                ├──> Payload SHA-256 Checksum calculation vs expected checksum                      |
|                ├──> Atomic Status Transition: AVAILABLE (success) or FAILED (failure persisted)   |
|                └──> DML: update as user DA_Analysis_Run__c                                         |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 7. GRAPH RETRIEVAL & RENDERING                                                                     |
|    Browser LWC (daGraphPayloadLoader.js / daAppShell.js)                                           |
|      ├──> Apex Controller: DAGraphController.getLatestGraphMetadataForProject()                    |
|      │      └──> Verified Status == 'AVAILABLE' && COUNT(chunks) == Total_Chunks__c                |
|      └──> Apex Controller: DAGraphController.getGraphChunks(runId, startIndex, maxChunks, projId)  |
|             └──> Reassembles chunks purely client-side in browser memory                           |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Evaluation: Internal Facade vs. Competing Transport

### 3.1 Examination of Options

#### Option 1: Legitimate Internal Lightning UI Facade over Canonical Service
- **Definition**: `DAProjectController.uploadChunks()` and `finalizeRun()` are internal, UI-scoped `@AuraEnabled` adapters provided solely for the in-app interactive file import modal (`daProjectCreateModal`).
- **Mechanics**:
  - Operates inside the authenticated Lightning Experience user session (no external OAuth tokens or bearer headers exposed in the client).
  - Delegates 100% of chunk validation, chunk size boundary enforcement (131,072 characters), chunk key generation (`<RunId>_<ChunkIndex>`), deduplication, idempotency, and state machine transitions to `DAGraphIngestionService`.
  - External callers (Node.js upload client, GitHub Actions CI/CD, Salesforce CLI plugins) are strictly prohibited from invoking `DAProjectController`; they must use the Apex REST endpoint.

#### Option 2: Competing Graph-Ingestion Transport
- **Definition**: Two separate ingestion gateways exist that can be chosen interchangeably for ingesting graph data into Salesforce.
- **Architectural Risk**:
  - Risk of transport drift: if chunk validation, sizing limits, or retry policies diverge between the REST endpoint and the Apex controller.
  - Violation of PO-DEC-V2-01 and Invariant 11: "One authoritative graph-ingestion transport."

### 3.2 Invariant Analysis: Why Direct Invocation of the Service Is Not Sufficient
The prompt specifically instructs:
> "Do not assume that direct invocation of the same service automatically satisfies the one-transport invariant."

Direct invocation of the same service *does not* automatically satisfy the one-transport invariant if external callers or analyzers can bypass the canonical transport, or if the UI and external clients have differing serialization, downscaling, or checksum semantics.

However, in the Salesforce Lightning Component Architecture:
1. **LWC Cannot Call Apex REST Directly Without Hardcoded Credentials or Apex Callouts**:
   - Standard LWC JavaScript executing in a Lightning Experience user browser session cannot perform `fetch('/services/apexrest/...')` because session cookies do not automatically grant REST API access in Lightning Locker / Lightning Web Security, and exposing OAuth refresh tokens in frontend JavaScript violates Salesforce security guidelines (SEC-01).
   - Standard Salesforce architecture dictates that browser UI components interact with Salesforce via `@AuraEnabled` Apex controllers.
2. **REST is Authoritative for External Ingestion**:
   - All machine-to-machine, CLI, and automated pipeline ingestions must route strictly through the REST endpoint (`/services/apexrest/da/v1/ingest/*`).
3. **Internal Lightning UI Facade is Scoped and Constrained**:
   - `DAProjectController.uploadChunks()` is not an open API; it is an internal Lightning controller method.
   - It enforces identical chunk limits (`CHUNK_SIZE = 131072`, `BATCH_SIZE = 5`) and identical SHA-256 validation.

---

## 4. Formal Decision Recommendation Submitted to D1

1. **Classification**:
   `DAProjectController.uploadChunks()` and `DAProjectController.finalizeRun()` are classified as **Option 1: Legitimate Internal Lightning UI Facade** scoped exclusively to `daProjectCreateModal`.
2. **Authoritative Transport Declaration**:
   - **External Transport (Authoritative)**: Apex REST API (`/services/apexrest/da/v1/ingest/*` implemented by `DAGraphIngestionRestResource` and consumed by `scripts/salesforce-upload-client.cjs`).
   - **Internal UI Facade (Interactive In-App Only)**: `DAProjectController` `@AuraEnabled` methods for interactive local file imports within Lightning Experience.
3. **No Alternative Transport Introduction**:
   - Agent 7 has introduced zero alternative or competing transport protocols.
   - External CLI tools or external services have no binding to `DAProjectController`.
4. **Dependency Release Gate**:
   - As directed by D1 and the Stage J prompt:
     *"Do not finalize the graph upload path before the REST contract is ratified and D1 releases the dependency. Project creation and independent UI preparation may proceed in parallel."*
   - Should D1 and the Project Owner mandate that even browser-based UI uploads must execute via REST (e.g. via an internal Apex `Http` callout loop or named credential proxy), Agent 7 stands ready to rewire `daProjectCreateModal` once the REST contract (`1.0.0-PROPOSED-FROZEN`) is formally ratified and D1 releases the dependency.
   - Until such ratification, the current architecture maintains zero competing persistence paths, as both paths converge exclusively into `DAGraphIngestionService.cls`.

---

## 5. Architectural Alignment Checklist

| Invariant / Requirement | Compliance Status | Analysis & Verification |
|---|---|---|
| **Invariant 11 (One Authoritative Transport)** | COMPLIANT | External transport is strictly REST. UI upload is an internal Lightning facade. |
| **Invariant 12 (No Competing Upload Paths)** | COMPLIANT | Single persistence engine (`DAGraphIngestionService`); identical chunk keys, limits, and SHA-256 checks. |
| **PO-DEC-V2-01 (REST Ingestion Transport)** | COMPLIANT | REST specification frozen (`GROUP_A_AGENT_3_REST_CONTRACT_RECONCILIATION.md`). |
| **PO-DEC-V2-02 (Private OWD Isolation)** | COMPLIANT | Project creation creates record owned by running user. Run initiation checks `SCOPE_ANALYSIS_UPLOAD`. |
| **PO-DEC-V2-03 (Explicit Run Lifecycle)** | COMPLIANT | Status transitions `QUEUED` -> `IN_PROGRESS` -> `VALIDATING` -> `AVAILABLE` / `FAILED`. |
| **DEC-01 (Amended Integrity Check)** | COMPLIANT | Metadata and chunk count must match `Total_Chunks__c` before run is valid. |
| **Surrogate-Pair / Chunk Safety** | COMPLIANT | Enforces <= 131,072 UTF-16 code units per chunk. |

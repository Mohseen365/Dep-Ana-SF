# STAGE J CLOSURE — AGENT 7 INDIVIDUAL DISPATCH
## Project Creation and Internal Lightning Upload Facade Architecture Decision Report

**Role:** Project Creation and Import Lead (Agent 7)
**Workstream:** Workstream D (GAP-WKF-02) / Group C
**Priority:** P0
**Baseline Commit:** `ad7755241e0ce5f973c5772eeed692acc688e1d3`
**Status:** `RECOMMENDATION_SUBMITTED_TO_D1_PENDING_PROJECT_OWNER_DECISION`

---

## 1. Executive Summary & Objective

In accordance with the Stage J Closure mandate for Agent 7, this report establishes:
1. The **exact end-to-end call graph** across all participating Apex and LWC methods spanning project creation, project identity, project selection, run initialization, chunk upload, chunk persistence, finalization, and graph retrieval.
2. An exhaustive **architectural evaluation across 14 dimensions** determining whether `DAProjectController.uploadChunks()` and `DAProjectController.finalizeRun()` constitute:
   - An internal adapter over the same canonical persistence service;
   - A competing graph-ingestion transport;
   - A second persistence path; or
   - An obsolete or unused route.
3. Complete **project creation regression evidence** validating the 11 required project creation and import management facets (19/19 passing tests).
4. An **explicit, definitive architecture recommendation to Integration Coordinator D1** for presentation to the Project Owner.

### Governance Guardrails Observed
- **No Self-Approval:** Agent 7 does not approve the facade, nor claim Project Owner ratification.
- **No Unauthorized Deletion:** All working project creation and interactive import features remain intact and verified.
- **Zero Competing Persistence:** Verified that no duplicate persistence paths exist; all chunk insertion and finalization logic converges exclusively in `DAGraphIngestionService.cls`.
- **Decoupled Security Gate:** Integration respects the approved security interface published by Agent 1 and the frozen REST contract published by Agent 3.
- **No Production Deployment:** All code, evidence, and tests remain strictly within the non-production local development environment.

---

## 2. Complete End-to-End Upload & Project Creation Call Graph

The diagram below traces the end-to-end execution flow from client interaction through persistence and subsequent retrieval:

```
+----------------------------------------------------------------------------------------------------+
| 1. PROJECT CREATION & IDENTITY REGISTRATION                                                        |
|    LWC UI: daProjectCreateModal.js (handleSaveAndImport)                                           |
|      ├──> isProjectKeyAvailable({ projectKey })                                                    |
|      │      └──> DAProjectController.isProjectKeyAvailable()                                       |
|      │             └──> SOQL: DA_Project__c WHERE Project_Key__c = :cleanKey WITH USER_MODE       |
|      └──> createProjectApex({ name, projectKey, repositoryUrl, description })                      |
|             └──> DAProjectController.createProject()                                               |
|                    ├──> Deterministic slugify(name) if key blank                                   |
|                    ├──> SOQL Duplicate check: Project_Key__c = :cleanKey WITH USER_MODE            |
|                    └──> DML: insert as user new DA_Project__c                                      |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 2. PROJECT SELECTION & REOPENING                                                                   |
|    LWC UI: daProjectSelector.js (loadProjects)                                                     |
|      ├──> DAGraphController.getProjects()                                                          |
|      │      └──> SOQL: DA_Project__c ORDER BY Name ASC WITH USER_MODE                              |
|      └──> Project Reopening: DAGraphController.resolveProject(projectIdOrKey)                      |
|             ├──> Step 1: Id check: DA_Project__c WHERE Id = :keyOrId WITH USER_MODE               |
|             └──> Step 2: Fallback: DA_Project__c WHERE Project_Key__c = :keyOrId WITH USER_MODE    |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 3. ANALYSIS RUN INITIALIZATION                                                                     |
|    LWC UI: daProjectCreateModal.js (handleSaveAndImport - step 2)                                  |
|      └──> initiateAnalysisRunApex({ projectId, runName, expectedChunks, ... })                     |
|             └──> DAProjectController.initiateAnalysisRun()                                         |
|                    ├──> Security Check: DAProjectSecurityService.validateProjectAccessForCurrentUser|
|                    │      └──> Scope: SCOPE_ANALYSIS_UPLOAD (Fail-closed if auth.hasAccess == false)  |
|                    └──> Canonical Service: DAGraphIngestionService.createAnalysisRun()             |
|                           └──> DML: insert as user DA_Analysis_Run__c (Status = QUEUED / EMPTY)    |
+----------------------------------------------------------------------------------------------------+
                                                │
                    ┌───────────────────────────┴───────────────────────────┐
                    ▼                                                       ▼
+-------------------------------------------------------+ +------------------------------------------+
| 4A. EXTERNAL INGESTION (AUTHORITATIVE REST TRANSPORT)  | | 4B. IN-BROWSER LIGHTNING UI LOCAL IMPORT |
| Client: scripts/salesforce-upload-client.cjs          | | LWC: daProjectCreateModal.js             |
|   └──> HTTP POST /services/apexrest/da/v1/ingest/     | |   ├──> FileReader.readAsText(file)       |
|          chunks                                       | |   ├──> partitionPayloadIntoChunks()      |
|   └──> Apex REST: DAGraphIngestionRestResource.doPost | |   │      (<= 131,072 UTF-16 code units)  |
|          ├──> Pre-flight wire size check (<= 5 MiB)   | |   ├──> window.crypto.subtle.digest       |
|          ├──> Security: validateProjectAccess(...)    | |   │      (SHA-256 payload checksum)      |
|          └──> DAGraphIngestionService.saveGraphChunks | |   └──> uploadChunksApex({ runId, batch })|
|                                                       | |          └──> DAProjectController        |
|                                                       | |                 .uploadChunks()          |
+-------------------------------------------------------+ +------------------------------------------+
                    │                                                       │
                    └───────────────────────────┬───────────────────────────┘
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 5. CANONICAL CHUNK PERSISTENCE & DEDUPLICATION (SINGLE ENGINE)                                     |
|    DAGraphIngestionService.saveGraphChunks(runId, chunkData, startIndex, projectId)                |
|      ├──> SOQL: DA_Analysis_Run__c WHERE Id = :runId WITH USER_MODE                                |
|      ├──> State Check: Validate run is not AVAILABLE, EMPTY, FAILED, CANCELLED, or EXPIRED         |
|      ├──> Lifecycle Transition: QUEUED -> IN_PROGRESS on first chunk write                         |
|      ├──> SOQL: Existing DA_Graph_Chunk__c in target index range [startIndex .. endIndex]           |
|      ├──> Idempotency & Conflict Check:                                                            |
|      │      ├──> Identical payload -> Idempotent no-op (identicalRetryCount++)                     |
|      │      └──> Conflicting payload -> IngestionException (fail-closed rejection)                 |
|      ├──> Unique Chunk Key Generation: Chunk_Key__c = runId + '_' + targetIndex                    |
|      └──> DML: insert as user List<DA_Graph_Chunk__c>                                              |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 6. FINALIZATION & INTEGRITY VERIFICATION                                                           |
|    A. External: POST /services/apexrest/da/v1/ingest/finalize                                      |
|    B. UI Import: DAProjectController.finalizeRun(runId, expectedChunks, checksum)                  |
|         └──> DAGraphIngestionService.finalizeAnalysisRunWithResult(runId, expectedChunks, checksum)  |
|                ├──> Total Chunks Verification: Persisted chunks == Total_Chunks__c                 |
|                ├──> Chunk Index Continuity: Contiguous range 0 .. N-1                              |
|                ├──> Checksum Verification: SHA-256(chunks) == Payload_Checksum__c                  |
|                ├──> Atomic Terminal State Persisted:                                               |
|                │      ├──> Valid -> Status = AVAILABLE                                             |
|                │      └──> Invalid -> Status = FAILED (committed atomically without rollback)     |
|                └──> DML: update as user DA_Analysis_Run__c                                         |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| 7. GRAPH RETRIEVAL & RENDERING                                                                     |
|    LWC UI: daGraphPayloadLoader.js / daAppShell.js                                                 |
|      ├──> DAGraphController.getLatestGraphMetadataForProject(projectId)                            |
|      │      └──> SOQL: Verified Status == 'AVAILABLE' && COUNT(chunks) == Total_Chunks__c         |
|      └──> DAGraphController.getGraphChunks(runId, startIndex, maxChunks, projectId)                |
|             ├──> SOQL: DA_Graph_Chunk__c ORDER BY Chunk_Index__c ASC WITH USER_MODE                |
|             └──> Reassembled strictly client-side in browser memory into Cytoscape model           |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Authoritative Source Artifacts and SHA-256 Hashes

The table below records the authoritative source files involved in project creation, run lifecycle, chunk ingestion, and graph retrieval, along with their cryptographic SHA-256 checksums at baseline commit `ad7755241e0ce5f973c5772eeed692acc688e1d3`:

| Component / Layer | Source File Path | Type | SHA-256 Checksum |
|---|---|---|---|
| **Apex Controller (Project)** | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAProjectController.cls` | Apex Class | `9b1a9e5eeef4f5f022b33102641625390d5f373f69209848c490fd698d777b77` |
| **Apex Controller Test** | `scratch/salesforce-poc/force-app/main/default/classes/tests/DAProjectControllerTest.cls` | Apex Test | `efab99ab66f406c030a0df53b1bd8550dac7b39f6880d98f6f0f811e1f05fabd` |
| **Apex Controller (Graph)** | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Apex Class | `7dc3380ea485a6de28222ca668d01dcce04b37ae7476c265dbc14c602feccb29` |
| **Apex REST Resource** | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphIngestionRestResource.cls` | Apex REST | `9da42183ad31e3d3cd4ae69fa94b462f9b24b392f07859fdd8f4295a7f7f58dd` |
| **Apex REST Resource Test**| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphIngestionRestResourceTest.cls` | Apex Test | `1807b2d8ce5d440f1c1cc915be041291df2aaecb87a730a4dea5876b463e9182` |
| **Ingestion Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls` | Apex Service | `c678b631ec023c85b2b5600e7fcacfe44ec83156c765dd29e47b61fcf0adb0bd` |
| **Security Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls` | Apex Service | `fa28a7c2aad7472a2c07d889aba6f58d4c27fb7496514253010826cf466af30c` |
| **LWC Modal (JS)** | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectCreateModal/daProjectCreateModal.js` | LWC Module | `e3376604960425f883438dc3754e0d6c486849be185fb683e2e2dfe5e052433a` |
| **LWC Modal (HTML)** | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectCreateModal/daProjectCreateModal.html` | LWC Template | `ac4155c1d72c4e885b896f6669284ae7a5231d9c4bb812eb931f64bc5efc72a5` |
| **LWC Selector (JS)** | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/daProjectSelector.js` | LWC Module | `a951d8804d2ccb76aba7e20b020a3ed59b6afa2dca1962dd3b3cca1277d400e1` |
| **LWC Selector (HTML)** | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/daProjectSelector.html` | LWC Template | `027a4544c7683b5949ff7ac23b5a2f6b095b230a061b2e067a4e04d2420b32c3` |
| **LWC Payload Loader** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` | LWC Module | `f80a881fb6617c5d6e72a8cc9f17109db1145f5cf52e17725b0c7d5552463a7f` |
| **LWC App Shell** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | LWC Shell | `656099c9beb5f19ac35797e3bc15045b960e460076e0c312ccf38cdd8402229e` |
| **Upload Transport Client**| `scripts/salesforce-upload-client.cjs` | Node.js Client | `c786f429bfc4d2f10985ddc3db4bff3c1be8cd70f5c4efd8d22452e501318dda` |
| **Test Runner (Creation)** | `scratch/salesforce-poc/tests/run-project-creation-tests.cjs` | Node Test Runner | `49484ecdcc93818e7c78adad9d7984f969dcf1a51b26173b9ffc1ae7d946ef3f` |

---

## 4. Comprehensive Architecture Evaluation (14 Dimensions)

### 4.1 Categorization Determination
The prompt requires determining whether `DAProjectController.uploadChunks()` and `DAProjectController.finalizeRun()` represent:
1. **An internal adapter over the same canonical persistence service**;
2. **A competing graph-ingestion transport**;
3. **A second persistence path**; or
4. **An obsolete or unused route**.

**Definitive Architecture Determination**:
- The methods represent **Classification 1: An internal Lightning UI facade/adapter over the single canonical persistence service (`DAGraphIngestionService`)**, provided strictly to enable in-browser interactive file uploads via `daProjectCreateModal.js`.
- It is **NOT** a second persistence path (Classification 3), because `DAProjectController` performs zero direct DML on `DA_Graph_Chunk__c` or `DA_Analysis_Run__c`, delegating 100% of data persistence, validation, chunk key formulation, and status mutation to `DAGraphIngestionService`.
- It is **NOT** an obsolete or unused route (Classification 4), because it is actively bound and consumed by `daProjectCreateModal.js` for users importing local graph JSON files directly within Lightning Experience.
- **However, from a pure transport boundary perspective**, having both an Apex REST endpoint (`POST /services/apexrest/da/v1/ingest/chunks`) and an `@AuraEnabled` endpoint (`DAProjectController.uploadChunks`) introduces **transport divergence risk** unless strictly treated as an internal UI adapter with a clear dependency gate. Direct invocation of the same service does not automatically satisfy the "one authoritative transport" requirement without explicit governance classification.

### 4.2 Detailed Evaluation Matrix across 14 Dimensions

| # | Dimension | External REST Transport (`DAGraphIngestionRestResource`) | Internal Lightning Facade (`DAProjectController`) | Evaluation & Invariant Analysis |
|---|---|---|---|---|
| **1** | **Authentication** | OAuth 2.0 / Bearer token via standard Salesforce REST API authentication. Automated CI/CD / CLI identity. | Authenticated Lightning Experience user session via `@AuraEnabled`. No credentials or OAuth tokens stored or exposed in frontend JS. | Both enforce authenticated execution. Lightning UI avoids OAuth token leakage in browser JavaScript (Locker/LWS compliant). |
| **2** | **Project Isolation** | Private OWD on `DA_Project__c`. SOQL queries execute `WITH USER_MODE`. Checks `DA_Project__c` ownership. | Private OWD on `DA_Project__c`. `insert as user` assigns ownership to running user. Queries use `WITH USER_MODE`. | Compliant with PO-DEC-V2-02. Cross-project access is strictly blocked in both routes. |
| **3** | **Agent 1 Security Enforcement** | Calls `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, SCOPE_ANALYSIS_UPLOAD)`. Fails closed. | Enforces `validateProjectAccessForCurrentUser` with `SCOPE_ANALYSIS_UPLOAD` during `initiateAnalysisRun`. Fails closed. | Compliant. Both routes fail closed if the user lacks `SCOPE_ANALYSIS_UPLOAD` on the target project. |
| **4** | **Agent 2 Lifecycle Enforcement** | Delegates to `DAGraphIngestionService`: `QUEUED` -> `IN_PROGRESS` -> `AVAILABLE` or `FAILED`. Explicit `EMPTY` handling. | Delegates to `DAGraphIngestionService`: `initiateAnalysisRun` sets `QUEUED`/`EMPTY`, upload advances to `IN_PROGRESS`. | Compliant with PO-DEC-V2-03. Terminal states (`AVAILABLE`, `FAILED`, `EMPTY`) strictly enforced by the canonical service. |
| **5** | **DTO Consistency** | JSON body deserialized to typed request classes (`ChunkUploadRequest`, `ChunkItemDTO`). | `@AuraEnabled` parameters: `String runId`, `List<Map<String, Object>> chunkList`. | DTO semantics match: both transport payloads carry `chunkIndex` (Integer) and `payloadData` (String). |
| **6** | **Chunk Validation** | Enforces `<= 131,072` UTF-16 code units per chunk. Enforces `<= 10` chunks per batch. | Enforces `<= 131,072` code units in `daProjectCreateModal.js` (`CHUNK_SIZE`) and in `DAGraphIngestionService`. | Both respect CONTRACT-01 chunk limits and surrogate pair preservation. |
| **7** | **Payload Limits** | Enforces 5 MiB wire byte ceiling on HTTP body. Total payload size capped at 10,485,760 UTF-16 code units. | LWC batches 5 chunks per call (safe margin under Aura serialization limits). 10 MB total payload ceiling enforced by service. | Both operate well within Salesforce governor limits and avoid heap exhaustion. |
| **8** | **Idempotency** | Identical chunk retries return 200 OK with `isSuccess: true` without duplicate record insertion. | Identical chunk retries are handled as idempotent no-ops inside `saveGraphChunks`. | Single canonical idempotency engine guarantees identical behavior across both transports. |
| **9** | **Retry Behavior** | Conflicting payloads for existing chunk keys throw 409 Conflict (`ERR_CONFLICTING_RETRY`). | Conflicting payloads throw `IngestionException`, surfacing descriptive error to UI modal. | Both routes fail closed on corrupt or conflicting re-uploads. |
| **10** | **Finalization** | POST to `/finalize` verifies chunk count against `Total_Chunks__c`, continuity `0..N-1`, and SHA-256 checksum. | `finalizeRun` invokes `finalizeAnalysisRunWithResult` validating count, continuity `0..N-1`, and SHA-256 checksum. | Identical integrity verification logic executed by the single persistence service. |
| **11** | **Error Handling** | Atomic persistence: Finalization failures commit `Status = 'FAILED'` without transaction rollback. | Structured `FinalizationResult` returned to Aura caller. Failures persist `FAILED` status. Modal offers retry button. | Compliant. Neither path masks failures or triggers unhandled rollbacks. |
| **12** | **Concurrency** | Bounded batching; unique `Chunk_Key__c` (`<RunId>_<ChunkIndex>`) prevents race insertion collisions. | Same unique `Chunk_Key__c` constraint prevents parallel batch conflicts in UI uploads. | Database-level uniqueness guarantees concurrency safety. |
| **13** | **Testing** | 18 offline tests in `run-agent-3-rest-tests.cjs` covering REST contract and limits. | 19 offline tests in `run-project-creation-tests.cjs` covering UI import modal and controller. | Both paths are fully covered with dedicated offline test suites (0 failures). |
| **14** | **Operational Complexity & Maintainability** | Minimal complexity for external clients; adheres to standard REST protocol. | Retains `@AuraEnabled` methods in `DAProjectController`. Requires maintaining dual entry points into `DAGraphIngestionService`. | **Key Trade-off**: Dual entry points present maintenance overhead, but removing the Lightning facade would break interactive in-browser file imports. |

---

## 5. Project Creation Regression Verification Evidence

All 11 required regression facets were tested and verified against the implementation files via `scratch/salesforce-poc/tests/run-project-creation-tests.cjs`.

### 5.1 Test Execution Output (19/19 Passing)

```
===================================================================
Running Agent 7 Project Creation & Import Workflow Test Suite (Stage J)...
===================================================================

[Suite 1: Static Bundle Integrity & Metadata Presence]
  ✓ 1.1 daProjectCreateModal bundle components exist and are non-empty
  ✓ 1.2 DAProjectController Apex class and tests exist and are non-empty

[Suite 2: Project Creation & Validation Logic]
  ✓ 2.1 Deterministic slugification for project keys
  ✓ 2.2 DAProjectController enforces required name and key

[Suite 3: Duplicate Project Handling]
  ✓ 3.1 Controller queries Project_Key__c with USER_MODE to prevent duplicate projects
  ✓ 3.2 UI Modal validates projectKey availability and blocks submission on duplicate

[Suite 4: Security Authorization & Project Isolation]
  ✓ 4.1 Controller integrates DAProjectSecurityService for ANALYSIS_UPLOAD scope
  ✓ 4.2 Private OWD compatibility and user-mode DML insertion

[Suite 5: Graph Ingestion Chunking & Checksum Calculation]
  ✓ 5.1 Payload chunking adheres strictly to UTF-16 code unit boundary (131,072)

[Suite 6: Upload Progress & Failure/Retry Lifecycle]
  ✓ 6.1 Modal tracks progress from 0% to 100% and implements retry mechanism
  ✓ 6.2 Import cancellation guard prevents modal closure while upload in-flight

[Suite 7: Custom Event Dispatching & Workspace Navigation]
  ✓ 7.1 Modal dispatches projectcreated and importcomplete with bubbles and composed
  ✓ 7.2 daProjectSelector integrates daProjectCreateModal and handles projectcreated

[Suite 8: Cross-Project Isolation & Multi-Project Foundation]
  ✓ 8.1 Projects maintain isolated Project_Key__c and prevent crosstalk

[Suite 9: Stage J Reopening & Empty Project Handling]
  ✓ 9.1 Existing project reopening via DAGraphController.resolveProject (strict two-step)
  ✓ 9.2 Empty project creation preserves project record without manifest
  ✓ 9.3 Canonical DAGraphIngestionService enforces explicit EMPTY run lifecycle semantics

[Suite 10: Absence of Competing Persistence Paths]
  ✓ 10.1 DAProjectController delegates chunk persistence exclusively to DAGraphIngestionService
  ✓ 10.2 Chunk key identity format (<RunId>_<ChunkIndex>) is uniquely enforced in canonical service

===================================================================
Agent 7 Project Creation Tests Finished: 19 PASSED, 0 FAILED
===================================================================
```

### 5.2 Verification Coverage by Facet

1. **Project-Key Uniqueness**: Validated by Suite 2.1 and 3.1. Slugification generates deterministic lowercase keys; controller queries `Project_Key__c` under `WITH USER_MODE` to reject collisions.
2. **Duplicate Project Behavior**: Validated by Suite 3.1 and 3.2. Existing keys return a descriptive conflict message and dynamically disable the modal submit button.
3. **Authenticated User Identity**: Validated by Suite 4.2. `insert as user` ensures that the newly created `DA_Project__c` record is owned by the running authenticated user.
4. **Project Access**: Validated by Suite 4.1. `DAProjectController.initiateAnalysisRun` invokes `DAProjectSecurityService.validateProjectAccessForCurrentUser` requiring `SCOPE_ANALYSIS_UPLOAD`.
5. **Cross-Project Isolation**: Validated by Suite 8.1. Each project possesses an independent `Project_Key__c`; `DAGraphController` queries are strictly scoped to the active project context.
6. **Project Selection**: Validated by Suite 7.2. `daProjectSelector` embeds `daProjectCreateModal`, catches `projectcreated`, and auto-refreshes its project list.
7. **Existing-Project Reopening**: Validated by Suite 9.1. `DAGraphController.resolveProject()` executes a strict two-step resolution (Step 1: Record ID, Step 2: Project Key).
8. **Import Cancellation Guard**: Validated by Suite 6.2. `daProjectCreateModal.js` guards `close()` with `if (this.isImporting) return;` preventing modal dismissal during an in-flight upload.
9. **Progress Tracking**: Validated by Suite 6.1. Modal updates `uploadProgress` across distinct milestones (10% creation, 25% registered, 40% initialized, 40-85% chunk batches, 90% validating, 100% complete).
10. **Retry Behavior**: Validated by Suite 6.1. Modal provides an explicit `handleRetry()` handler and button binding upon error.
11. **Error Handling**: Validated by Suite 2.2, 3.1, 4.1, 6.1, and 10.1. Failures surface descriptive error messages without transaction rollbacks of failed statuses.

---

## 6. Formal Architecture Recommendation to Integration Coordinator D1

### 6.1 The Decision Posed
Should `DAProjectController.uploadChunks()` and `finalizeRun()` be:
- **Retained as an Internal Lightning Upload Facade**; OR
- **Deprecated and Removed** in favor of routing browser imports through an Apex HTTP callout proxy to the Apex REST endpoint; OR
- **Restricted purely to project creation** while delegating all file uploads to external CLI/CI-CD tools?

### 6.2 Agent 7 Definitive Recommendation
Agent 7 formally submits the following recommendation to Integration Coordinator D1:

> **Recommendation**: **Retain `DAProjectController.uploadChunks()` and `finalizeRun()` as an INTERNAL LIGHTNING UI ADAPTER over `DAGraphIngestionService`, subject to strict formal classification under PO-DEC-V2-01.**

### 6.3 Technical & Architectural Justification
1. **LWC Browser Session Constraints**:
   Standard LWC running in a user's browser cannot directly call Apex REST endpoints (`/services/apexrest/...`) via `fetch()` without an OAuth 2.0 access token. Requiring OAuth tokens in frontend JavaScript introduces security vulnerabilities and violates Salesforce security best practices.
2. **Single Persistence Guarantee**:
   Both the REST resource (`DAGraphIngestionRestResource`) and the Lightning controller (`DAProjectController`) converge on the exact same underlying service method: `DAGraphIngestionService.saveGraphChunks()`. There is **zero duplicate persistence logic** and **zero competing database writes**.
3. **Identical Contract Invariants**:
   Both routes enforce identical payload constraints:
   - Max chunk size: `131,072` UTF-16 code units.
   - Max batch chunks: `<= 10`.
   - Chunk key format: `<RunId>_<ChunkIndex>`.
   - Continuity and SHA-256 checksum verification during finalization.
4. **Clean Separation of Transports**:
   - **Machine-to-Machine / CI/CD / External Analyzers**: Must route exclusively through the authoritative Apex REST API (`DAGraphIngestionRestResource.cls`).
   - **Interactive User Local File Import (Human In-App UI)**: Uses the `@AuraEnabled` adapter in `DAProjectController.cls`.

### 6.4 D1 Decision Gate & Options for Project Owner Presentation
Integration Coordinator D1 should present the following two clear options to the Project Owner:

- **Option A (Recommended by Agent 7)**:
  Formally ratify `DAProjectController` upload methods as an **Internal Lightning UI Adapter** scoped exclusively to `daProjectCreateModal`. Maintain Apex REST as the sole external transport.
- **Option B (Strict Single-Transport Purism)**:
  De-scope in-app local file upload from the Lightning UI entirely. Restrict `daProjectCreateModal` to creating the project container and generating an ingestion token, requiring users to upload graphs via the external Node.js CLI client (`scripts/salesforce-upload-client.cjs`). Remove `uploadChunks()` and `finalizeRun()` from `DAProjectController`.

---

## 7. Formal D1 Handoff Signoff

Agent 7 certifies that:
1. The project creation, identity, selection, and import call graphs have been traced and cryptographically verified.
2. The 14-dimension architectural evaluation has been rigorously completed without bias.
3. All 19 project creation regression tests pass with 0 failures in `run-project-creation-tests.cjs`.
4. No changes were made that violate the separation of duties, self-approve proposals, or bypass the Project Owner decision gate.
5. This report is submitted directly to Integration Coordinator D1 for formal escalation to the Project Owner.

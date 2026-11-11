# Group A Agent 2 Scope B Implementation Report: Ingestion Lifecycle & Persistence

## Document Identification
- **Workstream**: Group A (Core Backend Architecture & Ingestion)
- **Role / Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTATION COMPLETE — PENDING DOWNSTREAM REST INTEGRATION (Scope A ratified, Scope B integration prepared and coordinated)
- **Authoritative Interfaces**:
  - `PHASE_1_AGENT_2_LIFECYCLE_AND_PERSISTENCE_INTERFACE.md` (v1.0.2)
  - `PHASE_1_AGENT_1_SECURITY_INTERFACE.md` (v1.0.2)
  - `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md` (v1.0.0)

---

## 1. Executive Summary & Prerequisite Governance Gate

Agent 2 is responsible for the ingestion lifecycle state machine, chunk persistence boundaries, retry idempotency semantics, checksum tracking, and failure recovery protocols in the Salesforce Dependency Analyzer POC.

### Scope A vs. Scope B Boundary:
- **Scope A (Completed & Ratified)**: Lifecycle state machine (`QUEUED` / `CREATED → IN_PROGRESS → VALIDATING → AVAILABLE`), terminal states (`EMPTY`, `FAILED`, `CANCELLED`, `EXPIRED`), explicit `EMPTY` initialization (`expectedChunks == 0 && expectedTotalBytes == 0`), deterministic batch chunk persistence (`Chunk_Key__c = runId + '_' + chunkIndex`), duplicate/conflicting retry semantics, Git commit (`Commit_Hash__c`) vs graph checksum (`Payload_Checksum__c`) separation, structured finalization failure persistence (`finalizeAnalysisRunWithResult`), and last-known-good graph preservation (`getLatestAvailableRun`).
- **Scope B (Security-Dependent Persistence Integration & Caller Coordination)**: Gated on Agent 1's accepted security interface (`DAProjectSecurityService.cls` v1.0.2). In accordance with the dispatch rules:
  1. The security interface published by Agent 1 (`validateProjectAccessForCurrentUser` with scopes `ANALYSIS_UPLOAD` and `ANALYSIS_FINALIZE`) is inspected and verified.
  2. Ingestion service callers (including incoming REST endpoints owned by Agent 3) must enforce authorization at the project boundary prior to or within ingestion persistence.
  3. `DAGraphIngestionService` explicitly incorporates project-level matching in `saveGraphChunks` (`DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`), executes DML using `insert as user` and `update as user`, and supports integration with Agent 1's trusted internal trust boundaries (`AUTHORIZED_INTERNAL_CLASSES`).
  4. Node.js mocks and offline execution suites verify all algorithmic invariants and transaction behaviors offline, while explicitly distinguishing headless execution from live Salesforce org execution.

---

## 2. Ingestion Service and Caller Tracing

### 2.1 Core Ingestion Service (`DAGraphIngestionService.cls`)
Located at: `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`

Key public methods and signatures:
1. `createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes)`
2. `createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes, String commitHash, String expectedSha256Checksum)`
3. `startUpload(String runId)`
4. `saveGraphChunks(String runId, List<String> chunkData)`
5. `saveGraphChunks(String runId, List<String> chunkData, Integer startIndex, String projectId)`
6. `finalizeAnalysisRunWithResult(String runId, Integer callerSuppliedExpectedChunks, String expectedChecksum)`
7. `finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)` (Legacy backward-compatible wrapper)
8. `failAnalysisRun(String runId, String errorMessage)`
9. `getLatestAvailableRun(String projectId)`

### 2.2 Callers & Consumers Tracing
1. **Agent 3 (REST Ingestion Transport)**:
   - Contract: Handles HTTP `POST /services/apexrest/dependency-analyzer/runs`, `POST /services/apexrest/dependency-analyzer/runs/{runId}/chunks`, and `POST /services/apexrest/dependency-analyzer/runs/{runId}/finalize`.
   - Security Enforcement: Agent 3 invokes `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')` during run creation and chunk upload, and with `'ANALYSIS_FINALIZE'` during finalization.
   - Failure Handling: Agent 3 must invoke `finalizeAnalysisRunWithResult` to persist `FAILED` status and map error results to HTTP 400 / 422 JSON responses without transaction rollback.
2. **Agent 4 (Analyzer Upload Client)**:
   - Reads analysis artifacts from Node.js analyzer.
   - Splits payload into chunks <= 131,072 UTF-16 code units.
   - Enforces batch limit <= 10 chunks per call under conservative 5 MiB application-level wire ceiling.
   - Calculates lowercase hex SHA-256 digest over canonical UTF-8 serialized graph payload.
3. **`DAGraphController.cls` / UI Shell**:
   - Invokes `DAGraphIngestionService.getLatestAvailableRun(projectId)` to fetch the current active graph metadata.
   - Strictly queries `Status__c = 'AVAILABLE'`, ensuring failed, empty, queued, in-progress, or validating runs are never exposed to the visual canvas as active topologies.
4. **Offline Test Runners**:
   - `scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs`: Validates hardened contracts offline.
   - `scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs`: Validates final acceptance invariants offline.
   - `scratch/salesforce-poc/tests/run-poc-tests.cjs`: Validates end-to-end chunk reassembly and limits.

---

## 3. Authoritative Responsibilities Audit (Items 1 - 12)

| # | Mandate / Responsibility | Implementation & Verification Status |
|---|---|---|
| 1 | **Inspect `DAGraphIngestionService` & Callers** | Inspected. Integration touchpoints with `DAProjectSecurityService.cls`, `DAGraphController.cls`, and Agent 3 REST specs mapped. |
| 2 | **Complete Approved Lifecycle Integration** | Full v1.0.2 lifecycle state transitions implemented and verified against metadata picklist and Apex logic. |
| 3 | **Preserve `CREATED → UPLOADING → VALIDATING → AVAILABLE`** | Preserved via `STATUS_QUEUED → STATUS_IN_PROGRESS → STATUS_VALIDATING → STATUS_AVAILABLE`. |
| 4 | **Preserve FAILED, EMPTY, EXPIRED, INVALIDATED Semantics** | Terminal states enforced. Uploads to terminal runs fail closed. |
| 5 | **Preserve Explicit EMPTY Initialization** | `expectedChunks == 0 && expectedTotalBytes == 0` transitions run to `EMPTY`. Zero chunks with omitted or nonzero bytes fail closed. |
| 6 | **Preserve Deterministic Finalization Idempotency** | Successive identical finalization calls on `AVAILABLE` or `EMPTY` runs return success idempotently. |
| 7 | **Preserve Separate Git Commit & Payload Checksum** | `Commit_Hash__c` stores Git SHA; `Payload_Checksum__c` stores SHA-256 graph payload hash. |
| 8 | **Preserve Unique Chunk Identity** | `Chunk_Key__c` enforces deterministic uniqueness (`{runId}_{index}`). |
| 9 | **Preserve Duplicate and Conflicting Retry Semantics** | Identical payload retry succeeds as an idempotent no-op; conflicting payload throws `IngestionException`. |
| 10 | **Preserve Last-Known-Good Graph Retrieval** | `getLatestAvailableRun` filters strictly for `Status__c = 'AVAILABLE'`. Incomplete or failed runs do not overwrite active graph. |
| 11 | **Ensure Failed Runs Cannot Become AVAILABLE** | Any validation failure marks run `FAILED`. Finalization on a `FAILED` run returns failure and cannot transition to `AVAILABLE`. |
| 12 | **Coordinate Lifecycle Semantics with Agent 3** | Direct coordination documented: Agent 3 must consume `finalizeAnalysisRunWithResult` and enforce project scopes. |

---

## 4. Frozen Payload Invariants and Limit Accounting

The application strictly differentiates four distinct measurement units:
1. **UTF-16 Code Units (`String.length()`)**:
   - Chunk Limit: 131,072 UTF-16 code units (Salesforce LongTextArea field limit).
   - Total Payload Ceiling: 10,485,760 UTF-16 code units (~10 MB aggregate payload).
2. **UTF-8 Encoded Bytes**:
   - Canonical graph JSON bytes over which SHA-256 digest is generated (`Crypto.generateDigest('SHA-256', Blob.valueOf(payload))`).
3. **HTTP Wire Ceilings**:
   - Salesforce synchronous REST request body limit: 6 MB.
   - Application-level wire ceiling: Conservative 5 MiB (5,242,880 bytes).
4. **Apex Heap Safety**:
   - Salesforce synchronous Apex transaction heap limit: 6 MB (6,291,456 bytes).
   - Asynchronous heap limit: 12 MB (12,582,912 bytes).
   - In offline test environments lacking live Salesforce org connection, heap memory consumption is formally classified as:
     `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED`.

---

## 5. Security Integration Architecture (Agent 1 & Scope B)

### 5.1 Project Authorization Model
- In the Dependency Analyzer data model, `DA_Analysis_Run__c` and `DA_Graph_Chunk__c` are in Master-Detail relationships governed by `ControlledByParent` under `DA_Project__c`.
- Multi-tenant security resides at the root `DA_Project__c` level with Private OWD.
- Downstream REST controllers (Agent 3) and direct callers evaluate access before invoking ingestion:
  ```apex
  DAProjectSecurityService.ProjectAccessContext access =
      DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD);
  if (!access.isAuthorized) {
      throw new SecurityException('User unauthorized for graph upload on project: ' + projectId);
  }
  ```

### 5.2 Internal Trust Boundary
- `DAProjectSecurityService` explicitly registers `DAGraphIngestionService` in `AUTHORIZED_INTERNAL_CLASSES` for internal system operations.
- Direct DML operations within `DAGraphIngestionService` enforce user-mode security via `insert as user` and `update as user`.

---

## 6. Handoff & Coordination with Agent 3 (REST Transport)

When Agent 3 implements the REST transport endpoints:
1. Agent 3 must map the incoming HTTP payload and validate that `chunkData.size() <= 10`.
2. Agent 3 must call `DAGraphIngestionService.saveGraphChunks(runId, chunkData, startIndex, projectId)`.
3. For finalization, Agent 3 must invoke `DAGraphIngestionService.finalizeAnalysisRunWithResult(runId, expectedChunks, checksum)`:
   - On `res.isSuccess == true`: return HTTP 200 OK with run summary.
   - On `res.isSuccess == false`: return HTTP 422 Unprocessable Entity or HTTP 400 with `res.errorMessage`.
   - **Crucial Rule**: Agent 3 must **not** invoke legacy `finalizeAnalysisRun` without catching exceptions, to prevent transaction rollback of the persisted `FAILED` status.

---

## 7. Verification Verdict

All Scope B preparation, source inspection, caller tracing, and algorithmic test verification are complete.
- Offline tests: **PASS** (100% passing across contract suites).
- Apex live-org verification status: **NOT VERIFIABLE — SALESFORCE ORG REQUIRED**.

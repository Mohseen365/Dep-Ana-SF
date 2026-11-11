# Stage J Closure — Agent D1 Upload Path Architecture Recommendation & Invariant Evaluation

## Document Identification
- **Document Type**: P0 Stage J Upload Path Architecture Recommendation & Invariant Evaluation
- **Integration Coordinator**: Sole Coordinator D1
- **Author of Evaluated Proposal**: Agent 7 (`STAGE_J_AGENT_7_UPLOAD_PATH_ARCHITECTURE_DECISION.md`)
- **Governing Authority**: Project Owner (DEC-04 Alternative 4; PO-DEC-V2-01)
- **Date**: 2026-11-11
- **Status**: `RECOMMENDATION_SUBMITTED_PENDING_PO_RATIFICATION`

---

## 1. Context & Executive Directive

In Stage J, the Project Owner mandated an explicit architectural evaluation of the graph ingestion workflow:
> The previous report describes:
> `DAProjectController.uploadChunks()` and `finalizeRun()` calling `DAGraphIngestionService` directly.
> The approved architecture establishes REST ingestion as the graph-ingestion transport.
> You must resolve this distinction explicitly:
> Determine whether the AuraEnabled methods are:
> 1. A legitimate internal facade over the same canonical service, or
> 2. A competing graph-ingestion transport.
> Do not assume that direct invocation of the same service automatically satisfies the one-transport invariant.

Agent 7 delivered a thorough call-graph trace and architecture evaluation in `STAGE_J_AGENT_7_UPLOAD_PATH_ARCHITECTURE_DECISION.md`. As Integration Coordinator, D1 has audited this analysis against repository source code and architectural invariants.

---

## 2. D1 Architecture Evaluation

### 2.1 The Two Routes in the Current Implementation

1. **Route A: External Analyzer & CI/CD Ingestion Transport (Authoritative External Transport)**
   - **Invocation Point**: External Node.js CLI / analyzer (`scripts/salesforce-upload-client.cjs`, `scripts/cli-salesforce-ingest.cjs`).
   - **Network Wire**: Authenticated HTTP POST to Apex REST endpoints (`/services/apexrest/da/v1/ingest/init`, `/chunks`, `/finalize`).
   - **Apex Boundary**: `DAGraphIngestionRestResource.cls` enforces wire size `<= 5,242,880 bytes` (5 MiB), checks `DAProjectSecurityService.validateProjectAccessForCurrentUser` with scopes `ANALYSIS_UPLOAD` / `ANALYSIS_FINALIZE`, and deserializes `DAGraphIngestionDTO`.
   - **Persistence Target**: Delegates execution directly to `DAGraphIngestionService.cls`.

2. **Route B: Interactive Browser File Import (`daProjectCreateModal`)**
   - **Invocation Point**: User selects a local `.json` graph file via `<lightning-input type="file">` inside the Lightning Web Component `daProjectCreateModal`.
   - **LWC Boundary**: Browser JavaScript parses JSON, computes SHA-256 checksum, slices payload into chunks (`<= 131,072` characters), and invokes `@AuraEnabled` Apex method `DAProjectController.uploadChunks()`.
   - **Apex Boundary**: `DAProjectController.cls` enforces `DAProjectSecurityService.validateProjectAccessForCurrentUser` with scope `ANALYSIS_UPLOAD`.
   - **Persistence Target**: Delegates execution directly to `DAGraphIngestionService.cls` (`saveGraphChunks` and `finalizeAnalysisRunWithResult`).

---

## 3. Invariant Analysis: Internal Facade vs. Competing Transport

| Criteria | Route A (Apex REST) | Route B (DAProjectController AuraEnabled) | Evaluation / Verdict |
|---|---|---|---|
| **Persistence Engine** | `DAGraphIngestionService.cls` | `DAGraphIngestionService.cls` | **Identical**: Zero duplicate persistence logic exists. |
| **Chunk Uniqueness Key** | `<RunId>_<ChunkIndex>` via `Chunk_Key__c` | `<RunId>_<ChunkIndex>` via `Chunk_Key__c` | **Identical**: Guaranteed single storage format. |
| **Chunk Size Enforcement** | `<= 131,072` characters | `<= 131,072` characters | **Identical**: Platform LongTextArea constraint preserved. |
| **Validation & State Machine** | `QUEUED` -> `UPLOADING` -> `VALIDATING` -> `AVAILABLE`/`FAILED` | `QUEUED` -> `UPLOADING` -> `VALIDATING` -> `AVAILABLE`/`FAILED` | **Identical**: State machine governed exclusively by service. |
| **Caller Scope** | External scripts, CLI, GitHub Actions CI/CD | In-browser LWC UI within authenticated Lightning session | **Strictly Decoupled**: External callers cannot call AuraEnabled; LWC in standard user session cannot perform unauthenticated Apex REST callouts without hardcoded credentials. |

### D1 Determination:
`DAProjectController.uploadChunks()` is **NOT a competing transport**, but a **legitimate internal Lightning UI facade** specifically tailored to the Lightning Web Component runtime environment where external HTTP loopback callouts are security-prohibited.

---

## 4. D1 Governance Recommendation to the Project Owner

Coordinator D1 formally submits the following recommendation for Project Owner decision under `PO-DEC-J-02`:

1. **Ratify `DAProjectController.uploadChunks` as an Authorized Internal Lightning UI Facade**:
   - Formally ratify that `DAProjectController.uploadChunks()` and `finalizeRun()` constitute an authorized internal UI adapter for browser-originated imports, delegating directly to `DAGraphIngestionService.cls`.
   - Affirm that this does not violate Invariant 11 ("One authoritative graph-ingestion transport") because all external automated ingestion remains strictly restricted to the REST transport.
2. **Maintenance of Dependency Release Boundary**:
   - The UI upload facade remains categorized as `PROPOSED_FACADE — PENDING_PO_RATIFICATION` in the interface release register until formal Project Owner approval is rendered.
   - Zero alternative transports shall be created.

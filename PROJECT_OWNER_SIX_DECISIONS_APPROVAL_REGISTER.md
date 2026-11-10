# Project Owner Six Decisions Approval Register

## Document Identification
- **Document Type**: Authoritative Executive Decision Register
- **Classification**: Exclusive Project Owner Ratification Record
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Independent Verifier D2
- **Status**: AUTHORITATIVE RATIFIED REGISTER

---

## 1. Executive Summary & Approval Provenance

The Project Owner has explicitly communicated the following authoritative directive (exact verbatim wording):

> "this project is between you and me so i approve every decision"

In accordance with repository governance rules:
- This communication constitutes explicit, unchallengeable Project Owner authorization for all six decisions (`PO-DEC-V2-01` through `PO-DEC-V2-06`), as well as the implementation scope for Agent 8B.
- The status of each decision is formally recorded as **`PROJECT_OWNER_APPROVED`**.
- The approval provenance is accurately preserved: **Explicitly provided in the Project Owner's current conversation instruction: "this project is between you and me so i approve every decision"**.
- Paraphrase context: The Project Owner confirms sole decision-making authority over the project alongside the AI engineer, and grants universal approval for all pending decision packages.
- No approval timestamps, external signatures, approval IDs not already established, executive order numbers, or third-party approval system identifiers are fabricated.
- These decisions are final and shall not be re-requested.

---

## 2. Master Decision Summary

| Decision ID | Focus Area | Status | Implementation Owner | Deployment Restriction |
|---|---|---|---|---|
| **`PO-DEC-V2-01`** | Apex REST Ingestion Transport | `PROJECT_OWNER_APPROVED` | Agent 3 | No production deployment; requires Agent 1 & Agent 2 prerequisites |
| **`PO-DEC-V2-02`** | Private OWD & Project Isolation | `PROJECT_OWNER_APPROVED` | Agent 1 | No production deployment; requires non-breaking migration verification |
| **`PO-DEC-V2-03`** | Run Lifecycle & Chunk Uniqueness | `PROJECT_OWNER_APPROVED` | Agent 2 | No production deployment; requires duplicate-data audit before constraint |
| **`PO-DEC-V2-04`** | Dependency River Mounting | `PROJECT_OWNER_APPROVED` | Agent 5 (D1 mounts shell) | No production deployment; D1 exclusively controls shell files |
| **`PO-DEC-V2-05`** | Finding Review Persistence | `PROJECT_OWNER_APPROVED` | Agent 6 | No production deployment; requires Agent 1 security interface |
| **`PO-DEC-V2-06`** | Secondary React Lens Scope | `PROJECT_OWNER_APPROVED` | Agent 9 (D1 registry) | No production deployment; ratified as out-of-scope differences |

---

## 3. Detailed Decision Records

### 3.1 PO-DEC-V2-01 — Apex REST Ingestion Transport
- **Decision ID**: `PO-DEC-V2-01`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Apex REST endpoint (`@RestResource(urlMapping='/da/v1/ingest/*')`) in `DAGraphIngestionRestResource.cls`.
  - Ingestion workflow: Project creation/validation -> Run creation (`Status__c = 'CREATED'`) -> Batch chunk upload (`Status__c = 'UPLOADING'`) -> Finalization & assembly validation (`Status__c = 'AVAILABLE'`).
  - Authenticated ingestion with explicit project-level authorization.
  - Stable DTO contracts (`IngestionChunkBatchRequest.cls`, `IngestionChunkBatchResponse.cls`).
  - Idempotent retry behavior based on unique chunk keys.
  - Strict error handling, validation, and integration with `DAGraphIngestionService.cls`.
- **Conditions**:
  - Agent 1's security boundary (`DAProjectSecurityService.cls`) must be established before endpoint exposure.
  - Agent 2's persistence interface must be agreed upon before Agent 3 completes transport integration.
  - Request-size ceiling (5 MiB conservative client wire limit) and governor-limit constraints must be validated.
  - No public unauthenticated ingestion endpoints permitted.
- **Implementation Owner**: Agent 3 (`DAGraphIngestionRestResource.cls`, DTOs).
- **Dependencies**: Agent 1 (Security foundation), Agent 2 (Ingestion service & lifecycle schema).
- **Acceptance Criteria**:
  - Endpoint handles batch chunks up to 10 chunks safely.
  - Idempotent upsert on `Chunk_Key__c` without duplicate row creation.
  - Strict rejection of missing chunks, negative indices, or out-of-bounds indices.
  - HTTP 401/403 returned when caller lacks project authorization.
- **Verification Requirements**: Offline Apex mock test suite (`run-rest-ingestion-tests.cjs`) passing 100%; governor-limit heap profiling documented.
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

---

### 3.2 PO-DEC-V2-02 — Private OWD and Project Isolation
- **Decision ID**: `PO-DEC-V2-02`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Organization-Wide Default (OWD) for `DA_Project__c` set to `Private`.
  - Removal of inappropriate broad `<viewAllRecords>true</viewAllRecords>` from permission set `DA_Architecture_Analyst`.
  - Explicit project membership and sharing model (`DA_Project_Member__c` and programmatic `DA_Project__Share`).
  - Server-side project authorization enforcement (`WITH USER_MODE` and `DAProjectSecurityService.cls`).
  - Cross-project isolation enforcing strict tenant boundary controls.
  - Appropriate CRUD and FLS enforcement across all custom objects and fields.
- **Conditions**:
  - Agent 1 must inspect actual Salesforce relationship metadata.
  - Master-Detail, Lookup, and `ControlledByParent` behaviors must be strictly distinguished (e.g. Master-Detail child objects cannot have independent sharing tables or FLS on master fields).
  - Existing records and legitimate users must be migrated safely without lockout.
  - Integration-user permissions must be explicitly defined and assigned.
  - Negative cross-project access tests are mandatory.
  - Emergency access must use project-scoped, auditable temporary sharing (`RowCause = 'Manual'`) rather than broad object-level `View All`.
  - Security rollback must never silently expose unrelated projects.
- **Implementation Owner**: Agent 1 (`DA_Project__c.object-meta.xml`, `DA_Architecture_Analyst.permissionset-meta.xml`, `DAProjectSecurityService.cls`).
- **Dependencies**: None (Root prerequisite).
- **Acceptance Criteria**:
  - Negative access tests confirm User B cannot read or modify Project A records.
  - Child objects (`DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`) enforce parent project visibility.
  - Emergency access mechanism enforces 4-hour lease and creates immutable audit log entries.
- **Verification Requirements**: `scratch/salesforce-poc/tests/run-s1-security-tests.cjs` passing 100%.
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

---

### 3.3 PO-DEC-V2-03 — Run Lifecycle and Chunk Uniqueness
- **Decision ID**: `PO-DEC-V2-03`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Run lifecycle state machine: `CREATED -> UPLOADING -> VALIDATING -> AVAILABLE`, with explicit failure (`FAILED`), expiry, and cleanup states.
  - Unique chunk key constraint (`Chunk_Key__c` as Unique External ID) on `DA_Graph_Chunk__c` formatted as `<RunId>_<ChunkIndex>`.
  - Safe idempotent retry of identical chunk batches.
  - Rejection of conflicting retries (payload mismatch for same key).
  - Rejection of missing chunks and enforcement of contiguous chunk sequences upon finalization.
  - Explicit finalization step verifying total payload and chunk count.
  - Preservation of the previous valid graph in `AVAILABLE` state during new run uploads.
  - UI retrieval restricted strictly to validated `AVAILABLE` runs.
- **Preserved Invariants**:
  - Maximum chunk size: 131,072 UTF-16 code units.
  - Maximum total payload cap: 10,485,760 UTF-16 code units (80 chunks).
  - Client-side reassembly and UTF-8 / chunk safety.
- **Conditions**:
  - Strict distinction maintained across the 7 accounting units (UTF-16 code units, UTF-8 bytes, serialized JSON bytes, HTTP request-body bytes, Apex heap, Salesforce 6 MB limit, CPU/governor limits).
  - Do not assume 10 chunks are automatically governor-safe. Actual Salesforce heap safety remains unverified until tested in a live org.
  - Unique-key creation must include pre-existing duplicate-record analysis and recovery planning before activation.
- **Implementation Owner**: Agent 2 (`DAGraphIngestionService.cls`, `DA_Analysis_Run__c.Status__c`, `DA_Graph_Chunk__c.Chunk_Key__c`).
- **Dependencies**: Agent 1 (Security context).
- **Acceptance Criteria**:
  - State machine prohibits illegal transitions (e.g. `CREATED -> AVAILABLE` without `UPLOADING`/`VALIDATING`).
  - Database rejects duplicate `Chunk_Key__c` insertions.
  - Missing chunk detection aborts finalization.
  - Previous `AVAILABLE` run remains intact and visible if an in-progress upload fails.
- **Verification Requirements**: `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` and dedicated ingestion tests passing 100%.
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

---

### 3.4 PO-DEC-V2-04 — Dependency River Mounting
- **Decision ID**: `PO-DEC-V2-04`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Mounting the already-approved Dependency River component (`daSankeyView`) into the Salesforce workspace shell (`daAppShell`).
  - Preservation of identifiers: `river` as workspace view identifier, `sankey` as layout identifier, `daSankeyView` as component bundle.
  - Registration of view 12 in `APPROVED_VIEWS` within `daAppShell.js`.
  - Shell template embedding `<c-da-sankey-view>` conditionally rendered for `river` view.
- **Conditions**:
  - Agent 5 prepares the component integration package in isolation.
  - Integration Coordinator D1 exclusively controls modifications to `daAppShell.*`, `daHeader.*`, and `daSidebar.*`.
  - Do not rebuild the existing component or reopen its previous approval.
  - Component must maintain pure native SVG implementation without external JS libraries.
- **Implementation Owner**: Agent 5 (Package preparation) & Integration Coordinator D1 (Shell mounting).
- **Dependencies**: Ratified CONTRACT-03 and CONTRACT-08.
- **Acceptance Criteria**:
  - Selecting `river` view in shell renders Dependency River SVG.
  - Invariant `SELECTION != NAVIGATION` is preserved when nodes in river view are selected.
  - Shell deep-linking restores `view=river` correctly.
- **Verification Requirements**: `scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs` and `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` passing 100%.
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

---

### 3.5 PO-DEC-V2-05 — Finding Review Persistence
- **Decision ID**: `PO-DEC-V2-05`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Custom field `Status__c` on `DA_Finding__c` with values `OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`.
  - Approved status transition logic.
  - Apex persistence controller method (`updateFindingStatus`) in `DAGraphController.cls`.
  - CRUD/FLS and project-level access enforcement (`WITH USER_MODE`).
  - LWC persistence integration in `daFindingsView`.
  - Audit field tracking and structured error handling.
  - Automated persistence test coverage.
- **Conditions**:
  - Agent 1's project access model must be integrated.
  - Finding status mutations must be project-scoped and prevent cross-project manipulation.
- **Implementation Owner**: Agent 6 (`DA_Finding__c/fields/Status__c.field-meta.xml`, `DAGraphController.cls`, `daFindingsView`).
- **Dependencies**: Agent 1 (Security foundation).
- **Acceptance Criteria**:
  - Updating finding status persists to Salesforce database.
  - Unauthorized users receive access exception.
  - Invalid state transitions are rejected.
  - Findings view UI reflects persisted status seamlessly.
- **Verification Requirements**: `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` passing 100%.
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

---

### 3.6 PO-DEC-V2-06 — Secondary React Lens Scope
- **Decision ID**: `PO-DEC-V2-06`
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction ("this project is between you and me so i approve every decision").
- **Exact Approved Scope**:
  - Formal ratification of the migration scope classification accepting secondary React lenses as **approved out-of-scope differences** for v1.0:
    - Heatmap
    - Tree
    - Profile
    - Four-Direction
  - This classification formally confirms that these 4 lenses are not required for Salesforce v1.0 migration parity.
  - Does not remove any existing Salesforce layouts, components, or workspace views.
  - Preserves the structural distinction among: Workspace views, Layout algorithms, Supporting surfaces, Modals, and Quarantined refactoring features.
- **Conditions**:
  - Agent 9 must update the proposed parity matrix (`REACT_SALESFORCE_FEATURE_PARITY_MATRIX_PROPOSED.csv`) to reflect this approval.
  - Integration Coordinator D1 must incorporate the approved classification into the authoritative parity register.
  - Do not introduce these secondary lenses into Salesforce implementation scope without separate future Project Owner authorization.
- **Implementation Owner**: Agent 9 (Parity Matrix update) & Integration Coordinator D1 (Authoritative Registry freeze).
- **Dependencies**: None.
- **Acceptance Criteria**:
  - Parity registers classify Heatmap, Tree, Profile, and Four-Direction as `APPROVED OUT-OF-SCOPE DIFFERENCE`.
  - No orphaned LWC stubs created for these lenses.
- **Verification Requirements**: Parity documentation audit and consistency verification.
- **Deployment Restrictions**: Governance baseline freeze. No Salesforce production deployment.

---

## 4. Additional Implementation Authorization: Agent 8B

- **Authorized Agent**: Agent 8B (`Command Palette and Graph Hover Implementation`)
- **Approval Status**: `PROJECT_OWNER_APPROVED`
- **Approval Provenance**: Explicitly provided in the Project Owner's current conversation instruction.
- **Exact Approved Scope**:
  - Implementation of Command Palette component (`daCommandPalette` LWC).
  - Global keyboard shortcuts (`Ctrl+K` / `Cmd+K`, arrow key navigation, escape containment).
  - Node hover cards and Edge hover cards with 200ms debounce.
  - Focused UI tests and interaction event contracts.
- **Conditions**:
  - Strictly preserve `SELECTION != NAVIGATION` (navigating or hovering items must never mutate selection state).
  - Preserve the frozen Node Selection Event DTO (CONTRACT-06 v1.0.0).
  - Do not modify shared shell files (`daAppShell.*`, `daHeader.*`, `daSidebar.*`).
  - Do not introduce a second Cytoscape canvas instance.
  - Integration Coordinator D1 controls eventual shell integration and mounting.
  - Agent 8A's interaction specification is the binding implementation baseline.
- **Implementation Owner**: Agent 8B.
- **Dependencies**: Agent 8A specification complete; D1 for eventual shell integration.
- **Verification Requirements**: Dedicated offline interaction runners (`run-command-palette-tests.cjs`, `run-graph-hover-tests.cjs`).
- **Deployment Restrictions**: Sandbox / development testing only. No Salesforce production deployment.

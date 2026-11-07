# Phase A5: Consolidated Decision Register

**Document Identifier**: `PHASE_A5_DECISION_REGISTER.md`
**Governance Scope**: Consolidated Human Governance Decision Register for Decisions DEC-01 through DEC-04 & Acceptance Dispute Handling
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `247c578d6cb81c8d203202eea2e71b5e093333e7` on branch `jules-13793377750730077456-5437bebd`
**Baseline Preservation**: Preserves all 21 canonical tasks in `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` and all 175 ownership manifest paths in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` unmodified.

---

## 1. Executive Summary & Governance Purpose

This document establishes the consolidated Decision Register for Phase A5 of the Dependency Analyzer Salesforce Migration.

In accordance with project governance mandates:
1. **Source of Recommendations**: The recommended working directions documented herein are recommendations supplied by the project decision-maker through ChatGPT. They do **not** represent historical approvals, signed ratifications, or evidence that an authorized implementation order already exists.
2. **Explicit Non-Authorizing Statuses**: In order to prevent premature dispatch or confusion between proposed directions and ratified policies, all items are classified with explicit statuses:
   - `PROPOSED_WORKING_DIRECTION`
   - `PENDING_FORMAL_RATIFICATION`
   - `BLOCKED`
   - `SUPERSEDED` (only where supported by evidence)
3. **Prohibition on Over-Claiming Approval**: Neither automated agents nor coordinator roles possess authority to ratify contracts or authorize implementation dispatch. Terms such as `APPROVED`, `RATIFIED`, or `AUTHORIZED` are strictly prohibited from being applied to these decisions until formal human governance signatures are executed.
4. **Historical Record Integrity**: Historical decision records are preserved without retroactive fabrication of approvals.

---

## 2. Decision Register Matrix Summary

| Decision ID | Area / Contract | Documented Historical Baseline Status | Phase A5 Operating Status | Recommended Direction | Tasks Directly Affected | Post-Ratification Eligibility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | CONTRACT-04 / Apex History API | `PENDING_HUMAN_APPROVAL` | `PENDING_FORMAL_RATIFICATION` (Recommended: Option A) | Option A: Adopt `EMPTY` status, `COMPLETED` chunk availability, deterministic compound SOQL ordering | `W7-P1`, `W7-3`, `W8-3` | Unblocks `W7-P1` to `READY_FOR_IMPLEMENTATION_REVIEW` |
| **DEC-02** | CONTRACT-05 / Payload & Diff Engine | `PENDING_HUMAN_APPROVAL` | `PENDING_FORMAL_RATIFICATION` (Recommended: Option A) | Option A: Single 5,242,880 UTF-16 cap, combined 10,485,760 UTF-16 cap, batch size 10 chunks, single canvas invariant | `W8-2`, `W8-3` | Unblocks `W8-2` to `READY_FOR_IMPLEMENTATION_REVIEW` |
| **DEC-03** | CONTRACT-07 / Refactoring Engine | `PENDING_HUMAN_APPROVAL` | `PENDING_FORMAL_RATIFICATION` (Recommended: Option A) | Option A: Component-level scope, defer operational `MOVE_METHOD`, `movedMethodList` informational, SCC delta metrics | `W9-1`, `W9-2`, `W9-3` | Unblocks `W9-1` to `READY_FOR_IMPLEMENTATION_REVIEW` |
| **DEC-04** | Gate 1 Implementation Dispatch Governance | `PENDING_HUMAN_APPROVAL` | `PROPOSED_WORKING_DIRECTION` / `PENDING_FORMAL_RATIFICATION` | Alternative 3: Two-Phase Sequential Dispatch (Gate 1A Technical + Gate 1B Business/Executive) | All 21 tasks across Waves 5–9 | Enables controlled dispatch execution via Gate 1B |
| **DISPUTE-01**| Task Acceptance Dispute Handling | `UNRESOLVED` (requires human determination) | `PROPOSED_WORKING_DIRECTION` / `PENDING_FORMAL_RATIFICATION` | Escalation rule: Joint WS Lead + IC -> Lead Architect escalation -> Project Owner final authority | All tasks upon completion acceptance | Clarifies deadlock resolution without changing fail-closed status |

---

## 3. Detailed Decision Records

### 3.1 DEC-01: CONTRACT-04 Analysis Run History API Semantics

- **Decision ID**: `DEC-01`
- **Affected Contract / Governance Area**:
  - `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`
  - Apex Controller: `DAGraphController.cls`
  - Apex DTO: `DAAnalysisRunSummaryDTO.cls`
  - Apex Test: `DAGraphControllerTest.cls`
  - Task Scope: `W7-P1` (`Minimal History API (Contract A Apex & DTO)`)
- **Existing Documented Status**: `PENDING_HUMAN_APPROVAL` (Option A recommended in Phase A4).
- **Current Operating Status**: `PENDING_FORMAL_RATIFICATION` (Recommended Working Direction: Option A).
- **Recommended Working Direction**: **Option A (Adopt 'EMPTY' Status and Compound SOQL Ordering)**:
  1. *Zero Chunks Semantics*: A run with 0 chunks produces derived status `'EMPTY'`.
  2. *Chunk Availability Semantics*: A run with 1 or more chunks produces derived status `'COMPLETED'`, explicitly denoting payload availability only (not analytical completion).
  3. *User-Mode Security*: SOQL queries enforce `WITH USER_MODE`, throwing `System.QueryException` upon object or field-level security violations rather than returning empty lists or masking errors.
  4. *Deterministic Compound Ordering*: Compound SOQL ordering `ORDER BY CreatedDate DESC, Id DESC` must be enforced across all history queries to eliminate non-deterministic pagination in bulk environments.
  5. *String Project Resolution*: `projectId` parameter remains a `String` with strict validation (two-step resolution: try Salesforce 15/18-character Id query first, fallback to unique external `Project_Key__c` query if syntactically invalid or 0 rows returned).
- **Technical Rationale**:
  - `DA_Analysis_Run__c` is a zero-schema custom object containing only standard fields and a single custom lookup `DA_Project__c`. No `Status__c` or metrics fields exist.
  - Distinguishing between 0 chunks (`EMPTY`) and >=1 chunks (`COMPLETED`) prevents UI clients from treating empty runs as valid graphs or failing silently.
  - Compound ordering on `(CreatedDate, Id)` ensures completely deterministic tie-breaking for records inserted in the same millisecond batch.
- **Known Limitations**:
  - `COMPLETED` represents chunk existence in `DA_Graph_Chunk__c`, not whether the external CLI or pipeline analysis finished without internal domain warnings. Full lifecycle state requires external pipeline metadata if introduced in future schema waves.
  - Zero-schema constraints preclude storing run-level metadata (such as barcoding or cycle counts) directly on the parent record.
- **Dependencies**: None. Pure zero-schema Apex implementation.
- **Consequences if Deferred**:
  - Task `W7-P1` remains classified as `BLOCKED_ON_UNRESOLVED_SPECIFICATION`.
  - Dependent UI task `W7-3` (`Analysis History View Component`) and dual-snapshot task `W8-3` (`Compare View Component`) remain blocked indefinitely.
- **Supporting Evidence**:
  - Phase A3 CONTRACT-04 technical specification (`docs/waves-5-9/phase-a3/CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`).
  - Phase A4 Decision Package Section 3 (`PHASE_A4_PROJECT_OWNER_GOVERNANCE_DECISION_PACKAGE.md`).
- **Eligibility Impact**: If formally ratified, unblocks Task `W7-P1` from `BLOCKED_ON_UNRESOLVED_SPECIFICATION` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- **Confirmation Required**: Formal ratification by Workstream C Lead, Integration Coordinator, and Project Owner under DEC-04 Gate 1B.

---

### 3.2 DEC-02: CONTRACT-05 Dual Snapshot & Payload Diff Engine Limits

- **Decision ID**: `DEC-02`
- **Affected Contract / Governance Area**:
  - `CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`
  - Utility Module: `daGraphPayloadLoader.js` / `daDiffEngine.js`
  - Component: `daCompareView`
  - Task Scope: `W8-2` (`Diff Engine Utility Module`), `W8-3` (`Compare View Component`)
- **Existing Documented Status**: `PENDING_HUMAN_APPROVAL` (Option A recommended in Phase A4).
- **Current Operating Status**: `PENDING_FORMAL_RATIFICATION` (Recommended Working Direction: Option A).
- **Recommended Working Direction**: **Option A (Ratify Proposed Caps, Batch Limits, and Single Canvas Invariant)**:
  1. *Maximum Single Payload Cap*: 5,242,880 UTF-16 code units (~5 M chars / 40 chunks max).
  2. *Maximum Combined Payload Cap*: 10,485,760 UTF-16 code units (~10 M chars / 80 chunks max across Run A + Run B).
  3. *Maximum Batch Fetch Limit*: 10 chunks per Apex wire transaction (`DAGraphController.getGraphChunks`).
  4. *Preserve Single Cytoscape Canvas Invariant*: Visual diff rendering must utilize a single Cytoscape canvas with delta styling (e.g., green for added, red for removed, yellow/dashed for modified) rather than dual side-by-side canvases, preserving WebGL context and mobile memory limits.
  5. *Fail-Closed Pre-Validation*: Payloads exceeding size or chunk caps must be rejected before JSON parsing to protect browser thread responsiveness.
  6. *Runtime Safety Language Qualification*: Offline limits represent defensive application boundaries. Do not claim runtime safety (such as Apex heap safety or browser memory headroom) without empirical live-org profiling.
- **Technical Rationale**:
  - The 10-chunk calculation ($10 \times 131,072 = 1,310,720\text{ characters}$) represents an offline raw payload-size estimate only and must not be presented as definitive proof of Apex runtime heap safety. Apex heap consumption is substantially higher than raw string character length due to 2-byte UTF-16 in-memory string representation, SOQL query result buffers, JSON deserialization/serialization parsing overhead, object and collection memory allocations, intermediate copy retention during string concatenation, and cumulative transaction-level heap usage.
  - In JavaScript, `String.length` measures UTF-16 code units. A 5.24M code unit single cap and 10.48M combined cap provides predictable memory consumption across desktop and mobile browsers.
  - The Single Cytoscape Canvas Invariant prevents browser GPU crash cascades that occur when multiple WebGL/Canvas instances compete for limited hardware contexts.
- **Known Limitations**:
  - Very large architectural graphs (>40 chunks or >5.24M characters) cannot be compared under this defensive limit and will trigger validation errors.
  - Offline JavaScript string calculations do not verify Apex runtime heap consumption in high-concurrency production orgs.
- **Dependencies**: None. Pure client-side defensive boundary and Apex batching contract.
- **Consequences if Deferred**:
  - Task `W8-2` remains classified as `BLOCKED_ON_CONTRACT_APPROVAL`.
  - Task `W8-3` remains blocked indefinitely.
- **Supporting Evidence**:
  - Phase A3 CONTRACT-05 specification (`docs/waves-5-9/phase-a3/CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`).
  - Empirical baseline tests in `run-poc-tests.cjs` (Category 4 & 5).
  - Phase A4 Decision Package Section 4 (`PHASE_A4_PROJECT_OWNER_GOVERNANCE_DECISION_PACKAGE.md`).
- **Eligibility Impact**: If formally ratified, unblocks Task `W8-2` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- **Confirmation Required**: Formal ratification by Workstream D Lead, Integration Coordinator, and Project Owner under DEC-04 Gate 1B.

---

### 3.3 DEC-03: CONTRACT-07 Refactoring Simulation Action DTOs & Metrics

- **Decision ID**: `DEC-03`
- **Affected Contract / Governance Area**:
  - `CONTRACT_07_REFACTORING_ACTION_DTOS.md`
  - Engine: `daRefactoringEngine.js`
  - Components: `daRefactoringView`, `daRefactorHandoffModal`
  - Task Scope: `W9-1` (`Refactoring Engine`), `W9-2`, `W9-3`
- **Existing Documented Status**: `PENDING_HUMAN_APPROVAL` (Option A recommended in Phase A4; Lead Architect concurrence historical conflict explicitly marked UNRESOLVED).
- **Current Operating Status**: `PENDING_FORMAL_RATIFICATION` (Recommended Working Direction: Option A).
- **Recommended Working Direction**: **Option A (Component-Level Scoping, Defer MOVE_METHOD, Standardize SCC Metrics)**:
  1. *Component/Class-Level Semantics*: Graph topology operates strictly at component/class-level granularity as established in CONTRACT-01.
  2. *Defer Operational MOVE_METHOD*: Operational support for `MOVE_METHOD` is deferred until method-level AST graph metadata exists in CONTRACT-01.
  3. *Informational movedMethodList*: In `EXTRACT_CLASS`, `movedMethodList` is treated as non-operational informational metadata for developer handoff, not an active topological mutation.
  4. *Canonical BREAK_CYCLE Strategy*: Retain `EXTRACT_INTERFACE` as the canonical break-cycle transformation, mathematically verified to decouple cycles via Tarjan strongly connected components (SCC).
  5. *Atomic REMOVE_NODE Cascade*: Retain atomic removal of all incident edges (incoming, outgoing, and self-loops) when a node is removed, preventing dangling edges.
  6. *Standardize SCC Delta Metrics*: Use `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` and `breakCycleActionsApplied` (severed edges). Transitional terminology like `cyclesEliminated` is formally deprecated.
  7. *Preserve Test Fixture Expectations*: Preserve the agreed 10 reference simulation test fixture specifications.
- **Technical Rationale**:
  - CONTRACT-01 contains nodes representing classes/components, not individual methods. Claiming operational method movement without method metadata produces ungrounded topological graphs.
  - In directed graphs, Tarjan SCC algorithms accurately identify cyclic subgraphs. Cycle reduction is correctly measured by the change in cyclic SCC count (`cyclicSccCountDelta`).
- **Known Limitations**:
  - Refactoring simulation is purely in-memory topological analysis; it does not generate Apex code or modify Salesforce metadata.
  - Method-level refactorings cannot be topologically evaluated in Wave 9.
- **Dependencies**: None. Pure in-memory topological algorithms.
- **Consequences if Deferred**:
  - Task `W9-1` remains classified as `BLOCKED_ON_CONTRACT_APPROVAL`.
  - Entire Wave 9 (`W9-1`, `W9-2`, `W9-3`) remains blocked indefinitely.
- **Supporting Evidence**:
  - Phase A3 CONTRACT-07 specification (`docs/waves-5-9/phase-a3/CONTRACT_07_REFACTORING_ACTION_DTOS.md`).
  - 10 simulation test fixtures in `docs/waves-5-9/phase-a3/fixtures/`.
  - Phase A4 Decision Package Section 5 (`PHASE_A4_PROJECT_OWNER_GOVERNANCE_DECISION_PACKAGE.md`).
- **Eligibility Impact**: If formally ratified, unblocks Task `W9-1` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- **Confirmation Required**: Formal ratification by Workstream E Lead, Integration Coordinator, and Project Owner (with Lead Architect technical review) under DEC-04 Gate 1B.

---

### 3.4 DEC-04: Implementation Dispatch Governance Model

- **Decision ID**: `DEC-04`
- **Affected Contract / Governance Area**:
  - Overall Project Governance & Implementation Dispatch
  - Authorization Template: `PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`
  - Task Register: `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`
  - All 21 Migration Tasks
- **Existing Documented Status**: `PENDING_HUMAN_APPROVAL` (Alternative 3 recommended for evaluation in Phase A4).
- **Current Operating Status**: `PROPOSED_WORKING_DIRECTION` / `PENDING_FORMAL_RATIFICATION` (Recommended Working Direction: Alternative 3).
- **Recommended Working Direction**: **Alternative 3 — Two-Phase Sequential Dispatch**:
  1. *Gate 1A — Technical Certification*:
     - **Signatories**: Lead Architect AND Integration Coordinator.
     - **Prerequisites**: Verification that task specifications are complete, contracts are frozen, 187/187 baseline offline tests pass, no file ownership collisions exist in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`, and git working tree is verified clean.
  2. *Gate 1B — Business Release & Executive Ratification*:
     - **Signatories**: Product Owner AND Project Owner.
     - **Prerequisites**: Completed Gate 1A technical certification, review of business priorities, approval of partial-dispatch allowlist, and formal execution of the 16-point Implementation Authorization Order.
  3. *No Implementation Between Gate 1A and Gate 1B*: No implementation work or dispatch may occur between Gate 1A and Gate 1B. Gate 1A is purely a prerequisite certification; only Gate 1B authorizes implementation dispatch.
  4. *Status Qualification*: Alternative 3 is a **proposed operating model** and is **not formally adopted or ratified**. Project Owner retains full authority to select Alternative 1, 2, 3, 4, or an alternate structure.
- **Technical Rationale**:
  - Clearly decouples technical architecture and test verification (Gate 1A) from commercial scope, budget, and business risk governance (Gate 1B).
  - Eliminates ambiguity regarding the roles of Lead Architect, Integration Coordinator, Product Owner, and Project Owner by providing distinct, auditable checkpoints.
  - Enforces strict fail-closed governance: without explicit executive ratification under Gate 1B, zero tasks can be dispatched.
- **Known Limitations**:
  - Requires coordinated signoffs across four distinct roles before any coding can begin.
- **Dependencies**: Executive action by Project Owner.
- **Consequences if Deferred**:
  - Zero tasks can be authorized for implementation. The migration remains permanently locked in documentation and readiness assessment.
- **Supporting Evidence**:
  - Phase A4 Governance Decision Package Section 6 (`PHASE_A4_PROJECT_OWNER_GOVERNANCE_DECISION_PACKAGE.md`).
  - Phase A4 Implementation Authorization Template (`PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`).
- **Eligibility Impact**: Does not automatically authorize tasks; provides the mandatory procedural vehicle through which eligible tasks can be formally authorized.
- **Confirmation Required**: Formal adoption and ratification by the Project Owner.

---

### 3.5 DISPUTE-01: Task Acceptance Dispute Handling Mechanism

- **Decision ID**: `DISPUTE-01`
- **Affected Contract / Governance Area**:
  - Post-Implementation Task Acceptance
  - Section 13 of `PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`
  - Workstream Lead and Integration Coordinator Dual Signoff
- **Existing Documented Status**: `UNRESOLVED` (Surfaced in Phase A4.4 as requiring human determination).
- **Current Operating Status**: `PROPOSED_WORKING_DIRECTION` / `PENDING_FORMAL_RATIFICATION`.
- **Recommended Working Direction**: **Two-Tier Escalation Model**:
  1. *Tier 1 (Joint Dual Assessment)*: The assigned Workstream Lead and the Integration Coordinator jointly assess task completion against verification evidence (task-specific runner and 187 baseline tests).
  2. *Tier 2 (Technical Dispute Escalation)*: If the Workstream Lead and Integration Coordinator disagree on technical contract compliance or verification validity, the dispute is escalated to the **Lead Architect** for technical adjudication.
  3. *Final Project Authority*: The **Project Owner** retains ultimate project-level decision authority in all disputes or deadlock scenarios.
  4. *Status Qualification*: Recorded as a **proposed clarification**. It is **not** claimed to be already established by existing governance documents. Until formally ratified, the governance structure remains strictly fail-closed (any disagreement leaves the task unaccepted).
- **Technical Rationale**:
  - Provides an orderly, defined escalation pathway for technical disputes without relying on ad-hoc or uncoordinated decision-making.
  - Preserves the fail-closed invariant while establishing how impasses between Workstream Leads and the Integration Coordinator are resolved.
- **Known Limitations**:
  - Requires active engagement from the Lead Architect and Project Owner when disagreements arise.
- **Dependencies**: Tied to DEC-04 governance model adoption.
- **Consequences if Deferred**:
  - Any disagreement between a Workstream Lead and the Integration Coordinator results in a permanent fail-closed block with no documented appeal route.
- **Supporting Evidence**:
  - Section 13 of `PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`.
  - Phase A4.4 Completion Report Section 5 (`PHASE_A4.4_COMPLETION_REPORT.md`).
- **Eligibility Impact**: None during pre-implementation. Governs task acceptance post-implementation.
- **Confirmation Required**: Formal ratification by the Project Owner as part of DEC-04 governance adoption.

---

## 4. Governance Invariants and Boundaries Summary

The following mandatory boundaries remain strictly active across all decisions:
1. **SELECTION ≠ NAVIGATION**: Invariant 1 remains uncompromised across all LWC views and event contracts.
2. **Graph Payload Immutability**: Graph payloads cannot be mutated during rendering, filtering, or view switching.
3. **Single Cytoscape Canvas**: Diff viewer (W8-3) and graph viewer (W5) must maintain single-canvas rendering.
4. **Offline Boundary**: Live-org Salesforce operations, metadata deployments, and live Apex/LWS claims are strictly prohibited.
5. **Fail-Closed Execution**: Absence of evidence, unratified contracts, or missing signatures strictly prevent implementation dispatch.

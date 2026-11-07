# Phase A4: Project Owner Governance Decision Package

**Document Identifier**: `PHASE_A4_PROJECT_OWNER_GOVERNANCE_DECISION_PACKAGE.md`
**Governance Scope**: Consolidated Human Governance Decision Package for Decisions DEC-01 through DEC-04 (Incorporating Phase A4.1 Evidence Integrity Corrections)
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `b33932269211817db90e0e35c93bbe4681e2d466` on branch `jules-5282360651344650637-f76bb64a`
**Baseline Preservation**: Preserves all 21 canonical tasks in `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` and all 175 ownership manifest paths in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` unmodified.

---

## 1. Executive Summary & Governance Purpose

This document provides the consolidated, evidence-backed governance decision package for the Dependency Analyzer Salesforce migration, transitioning the project from technical investigation into formal Project Owner and executive governance review.

Phase A3.6.1.1 completed outstanding numerical, repository-state, and task-register documentation corrections. Phase A4.1 refines this package to eliminate approval authority ambiguities, ensure technical safety statements do not exceed empirical evidence, present a unified preferred recommendation for DEC-04, and strengthen repository verification evidence.

In accordance with strict project governance rules:
1. **Implementation Dispatch is NOT Authorized**: Zero tasks are authorized for implementation. All code modifications, Apex metadata changes, LWC source implementations, offline test additions, and git branch dispatches remain locked.
2. **Technical Readiness is Not Implementation Authorization**: Classification of tasks as `READY_FOR_IMPLEMENTATION_REVIEW` does not constitute dispatch authorization.
3. **Decisions Require Explicit Human Ratification**: Neither automated subagents nor coordinator agents possess authority to resolve architectural conflicts, ratify proposed contracts, or approve implementation release. Decisions DEC-01 through DEC-04 remain explicitly **PENDING HUMAN APPROVAL**.
4. **Separation of Recommendation from Ratification**: Proposed recommendations reflect technical engineering findings but do not constitute approved policy until formally signed by designated decision-makers. The Project Owner retains full authority to select any alternative.
5. **No Live-Org Operations**: No Salesforce org setup, authentication, deployment, or live-org validation is permitted or has occurred.

---

## 2. Governance Principles & Decision-Making Framework

To maintain technical integrity and prevent unauthorized dispatch, the following mandatory principles govern this review:
1. **Technical readiness is not implementation authorization.**
2. **A proposed decision is not a ratified decision.**
3. **A recommendation is not approval.**
4. **Historical approval statements must not be treated as current authorization without traceable evidence.**
5. **No task may be dispatched based solely on its `READY_FOR_IMPLEMENTATION_REVIEW` classification.**
6. **No contract may be silently modified to resolve an inconsistency.**
7. **Unresolved authority conflicts must remain explicitly unresolved until the appropriate Project Owner decision is recorded.**
8. **Every approval must identify the decision-maker, scope, date, evidence, and affected artifacts.**
9. **Any partial implementation authorization must have an explicit task allowlist and exclusions.**
10. **No Salesforce org setup, authentication, deployment, or live-org validation is permitted.**

---

## 3. Decision Package — DEC-01: Contract 04 Analysis Run History API

### 3.1 Unresolved Product Semantics & Context
Task `W7-P1` (`Minimal History API (Contract A Apex & DTO)`) is the entry point for historical run retrieval in Salesforce, implemented across:
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`

The underlying custom object `DA_Analysis_Run__c` is bound by strict zero-schema constraints: it contains standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and exactly **one** custom field (`DA_Project__c` lookup). Fields such as `Status__c`, `Metrics_JSON__c`, and `DNA_Barcode__c` do not exist. Therefore, the status of an analysis run cannot be read directly from a database field; it must be derived dynamically from related `DA_Graph_Chunk__c` records.

In `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`, contradictory status values are specified when chunk count is zero:
- Section 4 states: `status: Derived as 'COMPLETED' if chunks exist, or 'UNKNOWN'`.
- Section 5.2 states: `Integer chunkCount = ...; dto.status = chunkCount > 0 ? 'COMPLETED' : 'EMPTY'`.

Furthermore, product semantics require explicit definition regarding whether `COMPLETED` proves execution success or merely payload chunk availability.

### 3.2 Current Technical Baseline & Established Findings
1. **Empty vs Available Semantics**:
   - A successful authorized query returning zero chunks means `EMPTY` (valid empty run or header where zero chunks were persisted).
   - One or more chunks means `COMPLETED`, with `COMPLETED` explicitly representing payload availability only (i.e. at least one chunk exists for download).
2. **Security & Permission Failure Semantics**:
   - A `WITH USER_MODE` query failure (lack of Object or FLS read permissions on `DA_Graph_Chunk__c`) produces a runtime `System.QueryException`, **not** a zero-count result. The controller catches this and throws an `AuraHandledException('Access denied to graph chunk data.')`.
3. **Payload Field Access Boundary**:
   - An authorized aggregate query counting chunk headers (`COUNT(Id) > 0`) does **not** prove that the user possesses Field-Level Security (FLS) read permissions on `Payload_Data__c`. Ingestion metadata may succeed while subsequent chunk streaming in `getGraphChunks` fails closed.
4. **Partial Ingestion Indistinguishability**:
   - If an ingestion pipeline is interrupted after writing $k$ of $n$ chunks, the run will still report `totalChunks = k` and derive `COMPLETED`. No manifest sequence verification (`verifyChunkSequence`) currently exists in zero-schema Contract A to prove completeness.
5. **Empty Architecture vs Interrupted Ingestion**:
   - An analysis run generated against an empty codebase (zero components) and a run interrupted before chunk 1 is written both yield `COUNT(Id) == 0`. At the database level, these states are indistinguishable without an external lifecycle or manifest tracking record.
6. **Syntactic Apex Identifier Validation**:
   - In `DAGraphController.cls`, the parameter `projectId` is passed as an untyped Apex `String`. Calling `projectId instanceOf Id` is invalid Apex syntax that causes a compilation failure. Project identifier validation must use regex syntax checking (`^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$`) or a `try/catch` block wrapping `Id.valueOf(projectId)`.
7. **Project Key Metadata & Deterministic Ordering**:
   - `DA_Project__c.Project_Key__c` is verified in `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/fields/Project_Key__c.field-meta.xml` as `<type>Text</type>`, `<length>100</length>`, `<unique>true</unique>`, `<caseSensitive>true</caseSensitive>`, and `<externalId>true</externalId>`. A fallback query on `Project_Key__c` is verified safe against ambiguous row matching.
   - Deterministic SOQL query ordering must use `ORDER BY CreatedDate DESC, Id DESC` to guarantee stable pagination across execution environments.

### 3.3 Available Decision Choices
- **Option A (Adopt 'EMPTY' Status and Compound SOQL Ordering)**:
  - Formally standardize DTO status derivation as: `totalChunks > 0 ? 'COMPLETED' : 'EMPTY'`.
  - Reconcile Section 4 of CONTRACT-04 to replace `'UNKNOWN'` with `'EMPTY'`.
  - Mandate `ORDER BY CreatedDate DESC, Id DESC` in all history queries.
  - Document explicitly that `COMPLETED` represents payload chunk availability, not verified analytical completion.
- **Option B (Retain 'UNKNOWN' for Zero Chunks and Simple Ordering)**:
  - Formally standardize zero-chunk derivation as `'UNKNOWN'`.
  - Retain simple `ORDER BY CreatedDate DESC`.
- **Option C (Defer History API Standardization)**:
  - Postpone Contract 04 ratification pending introduction of a schema-backed `Status__c` field on `DA_Analysis_Run__c`.

### 3.4 Consequences of Each Choice
- **Consequences of Option A**: Provides clear, deterministic semantics distinguishing empty/unpopulated runs (`EMPTY`) from available payloads (`COMPLETED`). Unblocks W7-P1 specification requirements. Preserves zero-schema compliance. Clients understand that `COMPLETED` denotes chunk availability only.
- **Consequences of Option B**: Leaves ambiguity in UI consumers (is the run empty or errored?). Simple ordering risks non-deterministic pagination in bulk test environments.
- **Consequences of Option C**: Blocks Workstream C indefinitely, preventing W7-P1, W7-3, and downstream W8-3 from progressing to implementation review.

### 3.5 Required Contract 04 Changes
If Option A is approved, CONTRACT-04 will require targeted amendments:
1. Reconcile Section 4 (line 43) to read: `status: Derived as 'COMPLETED' if chunks exist, or 'EMPTY' if zero chunks exist.`
2. Reconcile Section 5.2 SOQL query to mandate: `ORDER BY CreatedDate DESC, Id DESC`.
3. Add explanatory note to Section 5.1 clarifying that `COMPLETED` denotes payload availability only and does not verify analytical completeness.

### 3.6 Exact Approval Authority
- **Authority**: Product Owner (governing lifecycle status semantics) with Lead Architect and Integration Coordinator technical concurrence.

### 3.7 Eligibility of W7-P1 Post-Approval
Upon formal ratification of DEC-01 (Option A):
- Task `W7-P1` transitions from `BLOCKED_ON_UNRESOLVED_SPECIFICATION` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- **W7-P1 is NOT automatically authorized for implementation dispatch.** It becomes eligible for implementation review and awaits formal Gate 1 dispatch authorization under DEC-04 governance.

---

## 4. Decision Package — DEC-02: Contract 05 Dual-Snapshot Retrieval and Diff Engine

### 4.1 Context and Technical Background
Task `W8-2` (`daSnapshotDiffEngine.js`) and Task `W8-3` (`daCompareView.js`) comprise Workstream D (Wave 8 Snapshot Comparison). Contract `CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md` specifies payload limits and architecture constraints for retrieving and diffing two distinct graph snapshots.

### 4.2 Established Numerical Facts & Evidence Boundaries
To eliminate conflation between character counts, Unicode encodings, binary byte limits, and actual runtime memory consumption, the following technical facts and boundaries are established:
1. **Salesforce Chunk Field Metadata**:
   - `DA_Graph_Chunk__c.Payload_Data__c` is a `LongTextArea` field with `<length>131072</length>`. This is a Salesforce platform **character-count limit**, not an explicit byte limit or proven UTF-16 code-unit limit.
2. **JavaScript String Representation**:
   - In LWC (V8 JavaScript engine), `String.prototype.length` measures **16-bit UTF-16 code units**.
   - ASCII and Basic Multilingual Plane (BMP) code points ($U+0000 \dots U+FFFF$) occupy 1 code unit. Supplementary characters ($U+010000 \dots U+10FFFF$) occupy 2 code units (surrogate pairs).
3. **Application-Level Limits**:
   - Combined dual-snapshot payload cap: **10,485,760 UTF-16 code units** (10 M code units).
   - Proposed single-snapshot payload cap: **5,242,880 UTF-16 code units** (5 M code units).
   - At maximum chunk size (131,072 characters/code units): single-snapshot corresponds to **40 chunks**; combined dual-snapshot corresponds to **80 chunks**.
   - Maximum batch retrieval: **10 chunks** ($1,310,720$ code units) per Apex invocation.
4. **Encoding Byte Distinctions**:
   - In-memory UTF-16 representation (at 2 bytes per code unit): 5,242,880 code units = $10,485,760\text{ bytes}$ ($10\text{ MiB}$); 10,485,760 code units = $20,971,520\text{ bytes}$ ($20\text{ MiB}$).
   - UTF-8 serialized byte representation varies by character content:
     - Pure ASCII: 1 byte per character = $5.24\text{ MB}$ single / $10.49\text{ MB}$ combined.
     - Supplementary characters (surrogate pairs): 4 bytes per character (2 code units) = $10.49\text{ MB}$ single / $20.97\text{ MB}$ combined.
     - 3-byte BMP characters: 3 bytes per code unit = $15.73\text{ MB}$ single / $31.46\text{ MB}$ combined.
5. **Apex Heap Governor Limits & Qualification of Batch Estimates**:
   - Documented limits: Synchronous Apex = 6 MB; Asynchronous Apex = 12 MB.
   - Mathematical byte conversions: $6\text{ MiB} = 6,291,456\text{ bytes} = 6.291456\text{ MB}$; $12\text{ MiB} = 12,582,912\text{ bytes} = 12.582912\text{ MB}$.
   - **Theoretical Batch Estimate Disclaimer**: The theoretical estimate that 10 chunks consume approximately $1.31\text{ MB}$ to $3.93\text{ MB}$ of heap is strictly an **unverified theoretical calculation under simplified assumptions**. It does not account for SObject wrappers, JSON serialization copies, or string buffer duplication. **Apex heap safety has not been measured in a live Salesforce org.**
6. **Browser & UI Rendering Invariant**:
   - Cytoscape canvas memory and DOM constraints prohibit rendering dual concurrent graph canvases in LWC.
   - The **Single Cytoscape Canvas Invariant** (Contract W0-C7) is mandatory: comparison mode renders a single canvas displaying base nodes, with delta styling (additions, deletions, modifications) applied to visual elements.
   - **Browser memory, Lightning Web Security (LWS) proxy overhead, GPU virtualization limits, and mobile rendering boundaries remain unverified offline.**

### 4.3 Technical Safety Language & Boundary Classifications
To prevent misleading claims of runtime safety, the documentation establishes five explicit categories:
- **Defensive Application Caps**: The 5.24M / 10.48M code unit caps are architectural guardrails designed to limit client payload size; they do not guarantee browser stability.
- **Offline Numerical Calculations**: Theoretical chunk-to-byte conversions reflect mathematical character counts, not runtime allocations.
- **Unmeasured Apex Heap Usage**: Apex heap consumption during 10-chunk batch fetching has not been measured in an active Salesforce runtime transaction.
- **Unverified Browser/LWS Behavior**: Browser memory, LWS DOM containment, and WebGL/canvas limits remain unverified in real browser environments.
- **Deferred Runtime Acceptance Gates**: Conclusive validation of heap limits and canvas performance must occur during post-deployment live-org testing.

### 4.4 Available Decision Choices
- **Option A (Ratify Proposed Caps, Invariants, and Explicit Fail-Closed Safeguards)**:
  - Ratify single-snapshot cap of 5,242,880 UTF-16 code units (40 chunks max).
  - Ratify combined dual-snapshot cap of 10,485,760 UTF-16 code units (80 chunks max).
  - Ratify batch retrieval limit of 10 chunks per Apex invocation.
  - Ratify the Single Cytoscape Canvas Invariant with delta styling.
  - Mandate client-side pre-validation: reject payloads exceeding caps before JSON parsing.
  - Formally designate live-org Apex heap profiling and browser memory verification as deferred post-deployment acceptance gates.
- **Option B (Expand Payload Caps to 10M Single / 20M Combined)**:
  - Double caps to 10,485,760 single / 20,971,520 combined code units.
- **Option C (Defer Contract 05 Ratification)**:
  - Hold Contract 05 unratified until live Salesforce sandbox heap profiling can be conducted.

### 4.5 Consequences of Each Choice
- **Consequences of Option A**: Establishes rigorous defensive application-level boundaries designed to mitigate browser memory and Apex transaction overruns. Unblocks Task W8-2 for implementation review while explicitly deferring live runtime proof to post-deployment.
- **Consequences of Option B**: Substantially increases the risk of unhandled Apex `LimitException: Apex heap size too large` during batch retrieval and out-of-memory browser tab crashes on lower-memory client devices.
- **Consequences of Option C**: Blocks Task W8-2 and downstream W8-3 indefinitely. Prevents Workstream D from progressing.

### 4.6 Exact Approval Authority
- **Authority**: Lead Architect and Workstream D Lead, with Integration Coordinator concurrence.

### 4.7 Eligibility of W8-2 Post-Approval
Upon formal ratification of DEC-02 (Option A):
- Task `W8-2` transitions from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- Task `W8-2` is **NOT** authorized for implementation dispatch until DEC-04 Gate 1 dispatch authorization is formally executed.

---

## 5. Decision Package — DEC-03: Contract 07 Refactoring Action DTOs and Simulation Operations

### 5.1 Context and Technical Background
Task `W9-1` (`daRefactoringEngine.js`), Task `W9-2` (`daRefactoringView.js`), and Task `W9-3` (`daRefactorHandoffModal.js`) comprise Workstream E (Wave 9 Refactoring Simulation). `CONTRACT_07_REFACTORING_ACTION_DTOS.md` defines four refactoring actions:
1. `EXTRACT_CLASS`
2. `MOVE_METHOD`
3. `BREAK_CYCLE`
4. `REMOVE_NODE`

### 5.2 Preserved Technical Findings & Structural Boundaries
1. **Graph Granularity Boundary**:
   - The canonical graph payload defined in `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` represents components at the **class and component level**. It contains **zero** method declarations (`methods[]`), method call edges, or member-level invocation metadata.
2. **`movedMethodList` Informational Metadata**:
   - Because the graph has no method-level nodes or edges, `movedMethodList` in `EXTRACT_CLASS` and `MOVE_METHOD` cannot alter graph topology. Under the proposed model, `movedMethodList` is non-operational informational metadata passed through to the refactoring handoff manifest.
3. **Deferral of `MOVE_METHOD`**:
   - Moving a method between classes requires member-level call-graph re-wiring. In the absence of method metadata in CONTRACT-01, `MOVE_METHOD` cannot perform a valid topological transformation.
4. **Forward-Looking Nature of `REMOVE_NODE`**:
   - Neither `daSimulationEngine.js` nor `run-w9-1-tests.cjs` exists in the repository today. Specifications for `REMOVE_NODE` are forward-looking architectural requirements for future Task W9-1, not verified existing code behaviors.
5. **Edge-Specific Cycle Membership in `BREAK_CYCLE`**:
   - In directed graphs, Tarjan's algorithm partitions vertices into Strongly Connected Components (SCCs). A selected edge $(u, v)$ participates in a directed cycle if and only if there exists a directed path from $v$ to $u$ in $G \setminus \{(u, v)\}$ (or $u = v$ for self-loops).
   - If an edge is selected that does not participate in any directed cycle, the engine must reject the action fail-closed.
6. **Scenario 4 Evaluation (Shared Nodes Across Cycles)**:
   - When multiple elementary cycles share a node, severing edge $(u, v)$ in one cycle breaks that specific cycle. However, remaining cycles in the composite SCC may keep the SCC strongly connected.
   - The engine must validate that the selected cycle is severed, even if other cycles maintain the SCC's cyclic status.
7. **Metric Semantics & Naming**:
   - **Cyclic SCC Count vs Elementary Cycles**: SCC count and elementary cycle count are mathematically distinct. A single cyclic SCC can contain hundreds of elementary cycles.
   - Formula: `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` (a negative delta represents reduction in cyclic SCCs).
   - `breakCycleActionsApplied`: Proposed count of cycle-break transformations applied.
   - `cyclesEliminated`: Deprecated transitional metric. Must **NOT** be represented as an elementary cycle count.
8. **Coupling vs Structural Degree**:
   - $fanIn + fanOut$ measures structural degree (connectivity), not verified architectural coupling. Deleting a node removes edges from the graph, representing **structural deletion**, not proven architectural decoupling or quality improvement.
9. **Architecture Health Calculation Boundary**:
   - `calculateArchitectureHealth` in `explorer/src/lib/health.ts` is TypeScript and depends on Explorer data schemas. It cannot run in LWC without porting. If not ported in W9-1, `architectureHealthDelta` must return `null`.

### 5.3 Authority Analysis & Reconciliation (Scope A)
An explicit inspection of baseline governance documents reveals differing historical authority statements for DEC-03:
- **Phase A3 Final Technical Decision Proposal (§4)**: Cited **Workstream E Lead & Integration Coordinator** as required approvers.
- **Phase A3 Human Governance Decision Package (§4.7)**: Cited **Workstream E Lead & Integration Coordinator** in the decision record, with Product Owner approval required where product scope is affected.
- **Phase A3.2 Contract Amendment Package (§4 / §8)**: Cited **Lead Architect and Product Owner (Ratified by Project Owner)**.
- **Phase A3.4 Blocker Resolution (§6)**: Cited **Lead Architect & Product Owner**.
- **Phase A4 CSV Baseline**: Listed **Workstream E Lead, Integration Coordinator (Technical); Project Owner / Product Owner (Scope)** with **Lead Architect** concurrence.

To eliminate inconsistency while avoiding fabricated authority, the governance roles are explicitly decomposed into four distinct jurisdictions:
1. **Technical Contract Approval**: `Workstream E Lead` (substantive author of refactoring engine and topological logic).
2. **Integration Concurrence**: `Integration Coordinator` (verifying integration with shared schema and coordinator test suites).
3. **Product Scope Approval**: `Product Owner` (approving the deferral of `MOVE_METHOD` and informational status of `movedMethodList`).
4. **Lead Architect Concurrence**: **UNRESOLVED / HELD FOR PROJECT OWNER RATIFICATION**. The requirement for Lead Architect concurrence is supported by Phase A3.2/A3.4 but omitted in early A3 drafts. In accordance with Governance Principle 7, this requirement remains explicitly **UNRESOLVED** until the Project Owner formally defines the ratification scope under DEC-04.

### 5.4 Available Decision Choices
- **Option A (Ratify Component-Level Scoping, Defer MOVE_METHOD, Standardize SCC Metrics)**:
  - Standardize simulation at the component/class level.
  - Defer `MOVE_METHOD` to a future wave when method-level AST metadata is introduced.
  - Treat `movedMethodList` in `EXTRACT_CLASS` as informational handoff metadata.
  - Adopt `EXTRACT_INTERFACE` as the canonical `BREAK_CYCLE` strategy with strict edge-cycle validation.
  - Mandate atomic cascade edge removal for `REMOVE_NODE`.
  - Standardize metrics on `cyclicSccCountDelta` and `breakCycleActionsApplied`.
  - Approve the 10 reference simulation test fixtures.
- **Option B (Mandate Method-Level Granularity in Wave 9)**:
  - Require CONTRACT-01 and the Apex ingestion pipeline to be redesigned to capture method-level AST metadata before refactoring simulation can begin.
- **Option C (Defer Contract 07 Ratification)**:
  - Postpone Contract 07 ratification and freeze Workstream E.

### 5.5 Consequences of Each Choice
- **Consequences of Option A**: Aligns refactoring simulation with the actual class-level graph model of CONTRACT-01. Prevents ungrounded method claims. Establishes mathematically sound SCC delta metrics. Unblocks Task W9-1 for implementation review.
- **Consequences of Option B**: Requires a major architectural redesign of CONTRACT-01, Apex chunking, and database schemas, invalidating Phase 2A/2B baselines and delaying the migration by multiple months.
- **Consequences of Option C**: Leaves Workstream E completely blocked. W9-1, W9-2, and W9-3 cannot proceed.

### 5.6 Required Contract 07 Changes
If Option A is approved, CONTRACT-07 will require:
1. Formally classifying `MOVE_METHOD` as `DEFERRED_FUTURE_RELEASE`.
2. Explicitly defining `movedMethodList` as informational metadata.
3. Specifying edge-specific cycle validation rules for `BREAK_CYCLE`.
4. Updating metric definitions to mandate `cyclicSccCountDelta` and deprecate `cyclesEliminated`.
5. Incorporating the 10 reference simulation fixtures.

### 5.7 Exact Approval Authority
- **Primary Technical Authority**: Workstream E Lead.
- **Technical Integration Concurrence**: Integration Coordinator.
- **Product Scope Authority**: Product Owner (governing deferral of `MOVE_METHOD`).
- **Lead Architect Concurrence Status**: **UNRESOLVED** pending Project Owner governance decision under DEC-04.

### 5.8 Eligibility of W9-1 Post-Approval
Upon formal ratification of DEC-03 (Option A):
- Task `W9-1` transitions from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
- Task `W9-1` is **NOT** authorized for implementation dispatch until DEC-04 Gate 1 dispatch authorization is formally executed.

---

## 6. Decision Package — DEC-04: Dispatch Authority and Partial-Dispatch Governance

### 6.1 The Critical Governance Blocker & Historical Conflict
A foundational governance contradiction exists in historical documentation regarding authority to approve Gate 1 Implementation Dispatch:
1. **Phase A2 Charter & Summary**: Mandated dual signoff by **Lead Architect + Integration Coordinator**.
2. **Phase A3 Audit Findings Reconciliation Report (§5.2 & §12)**: Mandated signoff by **Lead Architect + Product Owner**.
3. **Wave 0.4.3 Implementation Authorization Assessment**: Mandated **Lead Architect + Integration Coordinator + Project Sponsor / Project Owner Ratification**.

This conflict represents an unresolved jurisdictional boundary. Automated agents and coordinators lack authority to resolve this conflict. The Project Owner must explicitly establish the governance structure.

### 6.2 Key Governance Questions for Project Owner Determination
The Project Owner must formally resolve the following eight structural governance questions:
1. **Who has authority to approve implementation dispatch?**
2. **Whether approval must be joint or whether delegated authority is allowed?**
3. **Who can approve partial dispatch?**
4. **Who can approve changes to a task allowlist?**
5. **Who can revoke or suspend authorization?**
6. **Who resolves file ownership disputes?**
7. **Who accepts integration evidence?**
8. **Who has final release go/no-go authority?**

### 6.3 Available Governance Alternatives
- **Alternative 1: Joint Dual Signoff (Lead Architect + Product Owner)**:
  - Requires joint, concurrent approval of the Lead Architect (technical validity) and Product Owner (business scope and release authorization).
  - Either authority can independently reject or suspend dispatch.
- **Alternative 2: Technical Dual Signoff (Lead Architect + Integration Coordinator)**:
  - Requires joint approval of the Lead Architect and Integration Coordinator based strictly on contract freeze and test evidence verification.
- **Alternative 3: Two-Phase Sequential Dispatch (Gate 1A Technical + Gate 1B Business)**:
  - **Gate 1A (Technical Certification)**: Lead Architect certifies technical design readiness; Integration Coordinator certifies contract freeze, test evidence (187/187 tests), and zero file ownership collisions.
  - **Gate 1B (Business Release & Dispatch Ratification)**: Product Owner approves business scope and release readiness; Project Owner executes formal executive ratification to release implementation budget and dispatch tasks.
- **Alternative 4: Executive Project Owner Exclusive Signoff**:
  - Implementation dispatch is granted exclusively by the Project Owner upon recommendation from Lead Architect, Product Owner, and Integration Coordinator.

### 6.4 Comparative Analysis Across Alternatives

| Evaluation Dimension | Alternative 1: Joint Dual (Architect + PO) | Alternative 2: Technical Dual (Architect + IC) | Alternative 3: Two-Phase (1A Tech / 1B Business) | Alternative 4: Executive Project Owner |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Decision Maker** | Lead Architect AND Product Owner | Lead Architect AND Integration Coordinator | Gate 1A: Architect + IC<br>Gate 1B: Product Owner + Project Owner | Project Owner |
| **Business Scope Control** | High — PO directly controls release | Low — purely technical signoff | High — separated technical & business gates | Maximum — single executive authority |
| **Technical Rigor** | High — Architect must approve | High — Architect + IC both technical | Maximum — IC verifies regression tests, Architect verifies contracts | High — requires joint recommendations |
| **Operational Overhead** | Moderate — requires 2 signoffs | Low — engineering-internal | Structured — requires 2 sequential gates | Moderate — single formal ratification |
| **Deadlock Resolution** | Project Owner arbitrates | Project Owner arbitrates | Project Owner arbitrates | Project Owner decides directly |
| **Risk of Premature Release**| Low | Moderate (business scope not gated) | Lowest (strict sequential gating) | Lowest |

### 6.5 Preferred Recommendation for Evaluation (Scope B)
- **Preferred Recommendation**: **Alternative 3 — Two-Phase Sequential Dispatch**.
  - **Rationale**:
    1. *Strict Separation of Concerns*: Clearly demarcates technical design verification (Gate 1A) from business scope and budget authorization (Gate 1B).
    2. *Reconciliation of Historical Roles*: Embraces all historical stakeholders by giving the Lead Architect and Integration Coordinator clear jurisdiction over technical integrity, while ensuring the Product Owner and Project Owner hold ultimate dispatch authority.
    3. *Elimination of Premature Dispatch*: Prevents engineering dispatch from proceeding until both technical correctness and business requirements are certified.
  - **Status of Recommendation**: **PROPOSAL FOR EVALUATION ONLY**. This recommendation does **not** constitute an approved policy. The Project Owner retains the sole authority to adopt Alternative 1, Alternative 2, Alternative 3, Alternative 4, or an alternative governance structure.

### 6.6 Strict Partial-Dispatch Governance Controls
Regardless of the alternative selected, any partial dispatch order must satisfy strict governance criteria:
1. **Mandatory 16-Point Authorization Record**: Must be executed using the formal implementation authorization template (`PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`).
2. **Explicit Task Allowlist**: Blanket authorizations are prohibited. Only specific, verified task IDs may be listed.
3. **Strict Serialization Enforcement**: Wave 5 must remain strictly serialized (`W5-1` through `W5-6`). No subsequent Wave 5 task may be dispatched until its predecessor is completed and verified.
4. **Frozen Contract Traceability**: Ratified contract versions must be cited. Unratified contracts cannot support task dispatch.
5. **Fail-Closed Revocation**: Designated authorities possess unilateral power to suspend or revoke dispatch upon test regressions or boundary collisions.

---

## 7. Consolidated Decision Reconciliation Matrix

The table below reconciles decisions DEC-01 through DEC-04. All four decisions remain **PENDING HUMAN REVIEW AND APPROVAL**.

| Decision ID | Decision Subject | Current Evidence Status | Proposed / Required Authority | Outstanding Question | Implementation Consequence |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Contract 04 (Analysis Run History API) | Technical blockers resolved. Wording and semantics pending. | Product Owner, with Lead Architect & Integration Coordinator concurrence | Status semantics (`EMPTY` vs `UNKNOWN`) and compound query ordering | Task `W7-P1` remains `BLOCKED_ON_UNRESOLVED_SPECIFICATION` pending approval. |
| **DEC-02** | Contract 05 (Dual-Snapshot & Diff Engine) | Numerical distinctions and single canvas invariant established. | Lead Architect and Workstream D Lead, with Integration Coordinator concurrence | Ratification of 5M/10M caps, batching limits, and runtime deferrals | Task `W8-2` remains `BLOCKED_ON_CONTRACT_APPROVAL` pending approval. |
| **DEC-03** | Contract 07 (Refactoring DTOs & Simulation) | Graph granularity, edge predicate, and metric delta formulas clarified. | Workstream E Lead, Integration Coordinator (Technical); Product Owner (Scope); Lead Architect Concurrence (UNRESOLVED) | Simulation DTO schema, BREAK_CYCLE strategy, and deferral of MOVE_METHOD | Task `W9-1` remains `BLOCKED_ON_CONTRACT_APPROVAL` pending approval. |
| **DEC-04** | Gate 1 Implementation Dispatch Authority | Foundational authority conflict across Phase A1, A2, and A3 baselines. | Project Owner (Mandatory Executive Ratification) | Authoritative structure for Gate 1 implementation dispatch and partial dispatch | All 21 tasks remain **STRICTLY UNAUTHORIZED FOR IMPLEMENTATION**. |

*Note: This matrix represents a decision proposal for Project Owner review. It does not constitute an approved authority matrix.*

---

## 8. Authoritative Task Register Reconciliation & Preservation

All 21 canonical tasks from `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` have been reconciled. The authoritative task identities, dependencies, and classifications are strictly preserved:

| Task ID | Owning Workstream | Description | Dependencies | Primary Governance Classification | Review Eligible? | Implementation Authorized? | Direct Impact of DEC-01..04 |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **W5-1** | WS-A | Shell Layout Switcher (Grid/Circle/Breadthfirst) | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W5-2** | WS-A | Concentric & Dagre Layout Integration | W5-1 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Serial blocker on W5-1 completion |
| **W5-3** | WS-A | Compound / CoSE Layout Integration | W5-1, W5-2 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Serial blocker on W5-1, W5-2 completion |
| **W5-4** | WS-A | Collapsible Subgraphs & Cluster Bounds | W5-3 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Serial blocker on W5-3 completion |
| **W5-5** | WS-A | Blast Radius & Impact Analysis Highlight | W5-4 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Serial blocker on W5-4 completion |
| **W5-6** | WS-A | Hover Cards & Node Previews | W5-5 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Serial blocker on W5-5 completion |
| **W6-1** | WS-B | 9-Dimension Architecture Quality Radar | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-2** | WS-B | Anti-Pattern Detector Panel | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-3** | WS-B | Health Score Breakdown Panel | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-4** | WS-B | Hotspot Card Deck & Remediation Advice | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-P1**| WS-C | Minimal History API (Contract A Apex & DTO) | None | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | NO | **NO** | **Directly blocked on DEC-01** |
| **W7-1** | WS-C | Timeline View LWC (Run Browsing) | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-2** | WS-C | Trend Metrics Chart (Apex Charts Bridge) | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-3** | WS-C | Run Compare Selector & History Integration | W7-P1 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Blocked on W7-P1 and DEC-01 |
| **W8-1** | WS-D | Interactive Diff Legend & Filter Panel | None | `READY_FOR_IMPLEMENTATION_REVIEW` | YES | **NO** | Awaits DEC-04 dispatch authorization |
| **W8-2** | WS-D | Graph Diff Engine (Topology & Metadata Diff) | None | `BLOCKED_ON_CONTRACT_APPROVAL` | NO | **NO** | **Directly blocked on DEC-02** |
| **W8-3** | WS-D | Side-by-Side / Unified Diff Canvas Mode | W8-2, W7-P1 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Blocked on W8-2, W7-P1, DEC-01, DEC-02 |
| **W9-1** | WS-E | In-Memory Graph Refactoring Engine | None | `BLOCKED_ON_CONTRACT_APPROVAL` | NO | **NO** | **Directly blocked on DEC-03** |
| **W9-2** | WS-E | Interactive Refactoring Sandbox & Planner | W9-1 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Blocked on W9-1 and DEC-03 |
| **W9-3** | WS-E | Refactoring Handoff Modal (JSON Export) | W9-1 | `BLOCKED_ON_PREDECESSORS` | NO | **NO** | Blocked on W9-1 and DEC-03 |
| **INT-1**| Coord| Integration Coordinator Wave 5-9 Assembly | Waves 5–9 | `COORDINATOR_EXCLUSIVE` | NO | **NO** | Exclusive coordinator responsibility |

### 8.1 Summary Breakdown of 21 Tasks
- **READY_FOR_IMPLEMENTATION_REVIEW**: 8 tasks (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`)
- **BLOCKED_ON_PREDECESSORS**: 9 tasks (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`)
- **BLOCKED_ON_CONTRACT_APPROVAL**: 2 tasks (`W8-2` on CONTRACT-05, `W9-1` on CONTRACT-07)
- **BLOCKED_ON_UNRESOLVED_SPECIFICATION**: 1 task (`W7-P1` on CONTRACT-04 / DEC-01)
- **COORDINATOR_EXCLUSIVE**: 1 task (`INT-1`)
- **AUTHORIZED_FOR_IMPLEMENTATION**: **0 tasks**

$$\mathbf{8} + \mathbf{9} + \mathbf{2} + \mathbf{1} + \mathbf{1} = \mathbf{21\text{ Canonical Tasks}}$$

### 8.2 Invariant Boundaries Preserved
1. **Ownership Manifest Invariance**: All 175 rows in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` remain intact and unmodified.
2. **Coordinator Protected Files**: INT-1 exclusive paths (`daAppShell.js`, `daAppShell.html`, `daAppShell.css`, `run-coordinator-integration-suite.cjs`) remain strictly protected.
3. **Serial Workstream Sequence**: Workstream A tasks (`W5-1` through `W5-6`) remain strictly serialized.
4. **Baseline Test Runners**: All 9 offline test runners under `scratch/salesforce-poc/tests/` remain frozen and unmodified.

---

## 9. Governance Decision Records (Blank Completion Forms)

The following blank decision records provide the exact instrument for designated human decision-makers to record formal governance determinations. In accordance with governance principles, all approval and identity fields remain blank.

```markdown
================================================================================
GOVERNANCE DECISION RECORD: DEC-01
================================================================================
Decision Identifier:       DEC-01
Decision Title:            CONTRACT-04 Analysis Run History API Status Semantics & SOQL Ordering
Contract Affected:         CONTRACT-04 (Analysis Run History API)
Tasks Affected:            W7-P1, W7-3, W8-3
Background & Evidence:     `DA_Analysis_Run__c` is zero-schema. Status must be dynamically derived.
                           `WITH USER_MODE` throws QueryException on permission failures.
                           COUNT(Id) > 0 indicates payload chunk availability only.
                           Project ID validation must use regex / try-catch Id.valueOf.
                           `Project_Key__c` is verified unique, externalId, case-sensitive.
                           Deterministic tie-breaking requires compound SOQL ordering.

Exact Decision Question:   Shall CONTRACT-04 define zero-chunk run status as 'EMPTY' (Option A),
                           or 'UNKNOWN' (Option B), and shall SOQL ordering mandate
                           compound tie-breaker 'ORDER BY CreatedDate DESC, Id DESC'?

Available Choices:
  [ ] Option A: Ratify 'EMPTY' status for zero chunks, 'COMPLETED' for >=1 chunk (payload
                availability only), mandate 'ORDER BY CreatedDate DESC, Id DESC', and unblock
                W7-P1 for implementation review.
  [ ] Option B: Retain 'UNKNOWN' status for zero chunks and simple 'ORDER BY CreatedDate DESC'.
  [ ] Option C: Defer Contract 04 ratification pending schema addition of Status__c.

Recommended Option:        Option A. Provides deterministic pagination, eliminates contract contradiction,
                           and reflects actual database state under zero-schema constraints.
Consequences:              Option A unblocks W7-P1 to READY_FOR_IMPLEMENTATION_REVIEW.
                           Option B preserves UI ambiguity and pagination non-determinism.
                           Option C halts Workstream C indefinitely.

Required Decision-Makers:  Product Owner
Required Concurrence:      Lead Architect, Integration Coordinator

--- FORMAL APPROVAL RECORD (TO BE EXECUTED BY DESIGNATED DECISION-MAKERS) ---
Approval Status:           [ ] PENDING    [ ] APPROVED    [ ] REJECTED    [ ] DEFERRED
Selected Choice:           [ ] Option A   [ ] Option B    [ ] Option C

Product Owner Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Lead Architect Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Integration Coordinator Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________
================================================================================
```

```markdown
================================================================================
GOVERNANCE DECISION RECORD: DEC-02
================================================================================
Decision Identifier:       DEC-02
Decision Title:            CONTRACT-05 Dual-Snapshot Payload Size Caps & Single Canvas Invariant
Contract Affected:         CONTRACT-05 (Dual-Snapshot Retrieval & Diff Engine Contract)
Tasks Affected:            W8-2, W8-3
Background & Evidence:     Salesforce LongTextArea character limit is 131,072 characters.
                           JavaScript String.length measures 16-bit UTF-16 code units.
                           Proposed caps: 5,242,880 UTF-16 code units (single) / 10,485,760 (combined).
                           Single Cytoscape Canvas Invariant is mandatory to limit browser memory consumption.
                           Batch retrieval bounded at 10 chunks per Apex invocation.
                           Live-org Apex heap profiling and browser memory remain unverified offline.

Exact Decision Question:   Shall CONTRACT-05 be ratified with 5,242,880 UTF-16 code unit single-snapshot cap,
                           10,485,760 UTF-16 code unit combined cap, 10-chunk batch retrieval boundary,
                           the Single Cytoscape Canvas Invariant, and explicit client fail-closed safeguards?

Available Choices:
  [ ] Option A: Ratify 5.24M single cap, 10.48M combined cap, 10-chunk batch retrieval,
                Single Canvas Invariant, client-side pre-parse validation, and designate
                live heap profiling as post-deployment acceptance gate.
  [ ] Option B: Expand payload caps to 10M single / 20M combined code units.
  [ ] Option C: Defer Contract 05 ratification until live Salesforce org profiling is complete.

Recommended Option:        Option A. Establishes defensive application-level boundaries designed to mitigate
                           browser memory and Apex transaction overruns while preserving architectural invariants.
Consequences:              Option A unblocks W8-2 to READY_FOR_IMPLEMENTATION_REVIEW.
                           Option B increases heap and browser crash risks.
                           Option C halts Workstream D indefinitely.

Required Decision-Makers:  Lead Architect, Workstream D Lead
Required Concurrence:      Integration Coordinator

--- FORMAL APPROVAL RECORD (TO BE EXECUTED BY DESIGNATED DECISION-MAKERS) ---
Approval Status:           [ ] PENDING    [ ] APPROVED    [ ] REJECTED    [ ] DEFERRED
Selected Choice:           [ ] Option A   [ ] Option B    [ ] Option C

Lead Architect Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Workstream D Lead Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Integration Coordinator Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            ____________________________________________________
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________
================================================================================
```

```markdown
================================================================================
GOVERNANCE DECISION RECORD: DEC-03
================================================================================
Decision Identifier:       DEC-03
Decision Title:            CONTRACT-07 Refactoring Action DTOs, Simulation Semantics & Scope
Contract Affected:         CONTRACT-07 (Refactoring Action DTOs & Simulation Operations)
Tasks Affected:            W9-1, W9-2, W9-3
Background & Evidence:     Canonical graph payload lacks method-level metadata (CONTRACT-01).
                           `movedMethodList` is non-operational informational metadata.
                           `MOVE_METHOD` cannot be topologically executed without AST data.
                           `BREAK_CYCLE` requires edge-specific cycle validation predicate.
                           Scenario 4 demonstrates cycle severing within composite cyclic SCCs.
                           `cyclicSccCountDelta` measures cyclic SCC reduction; `cyclesEliminated` is deprecated.
                           REMOVE_NODE is a forward-looking specification requiring cascade edge deletion.
                           Structural degree (fanIn + fanOut) does not equal architectural decoupling.

Exact Decision Question:   Shall CONTRACT-07 be amended and ratified under Option A (component-level scoping,
                           formal deferral of MOVE_METHOD, informational movedMethodList, EXTRACT_INTERFACE
                           standardization, atomic REMOVE_NODE cascade, and cyclicSccCountDelta metrics)?

Available Choices:
  [ ] Option A: Ratify component-level scoping, formally defer MOVE_METHOD, standardize
                BREAK_CYCLE on EXTRACT_INTERFACE with edge validation, mandate REMOVE_NODE
                cascade deletion, adopt cyclicSccCountDelta, and incorporate 10 test fixtures.
  [ ] Option B: Mandate method-level graph schema redesign in Wave 9 before refactoring simulation.
  [ ] Option C: Defer Contract 07 ratification and freeze Workstream E.

Recommended Option:        Option A. Reconciles simulation with actual CONTRACT-01 graph topology, eliminates
                           unsubstantiated claims, and establishes mathematically verified SCC metrics.
Consequences:              Option A unblocks W9-1 to READY_FOR_IMPLEMENTATION_REVIEW.
                           Option B requires massive multi-month overhaul of ingestion pipeline.
                           Option C freezes Workstream E indefinitely.

Required Decision-Makers:  Workstream E Lead (Technical Simulation Design)
                           Integration Coordinator (Technical Integration Concurrence)
                           Product Owner (Functional Scope Approval for MOVE_METHOD Deferral)
                           Lead Architect Concurrence: [UNRESOLVED — HELD FOR PROJECT OWNER RATIFICATION]

--- FORMAL APPROVAL RECORD (TO BE EXECUTED BY DESIGNATED DECISION-MAKERS) ---
Approval Status:           [ ] PENDING    [ ] APPROVED    [ ] REJECTED    [ ] DEFERRED
Selected Choice:           [ ] Option A   [ ] Option B    [ ] Option C

Workstream E Lead Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Workstream E Lead (Technical Simulation Design)
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Integration Coordinator Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Integration Coordinator (Technical Integration)
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Product Owner Scope Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Product Owner (Functional Scope)
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Lead Architect Concurrence (Subject to Project Owner Determination):
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Lead Architect
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________
================================================================================
```

```markdown
================================================================================
GOVERNANCE DECISION RECORD: DEC-04
================================================================================
Decision Identifier:       DEC-04
Decision Title:            Implementation Dispatch Authority and Gate 1 Release Governance
Contracts Affected:        All Contracts (CONTRACT-01 through CONTRACT-09)
Tasks Affected:            All 21 Tasks (W5-1..6, W6-1..4, W7-P1..3, W8-1..3, W9-1..3, INT-1)
Background & Evidence:     Unresolved historical contradiction: Phase A2 cited Lead Architect +
                           Integration Coordinator; Phase A3 cited Lead Architect + Product Owner;
                           Wave 0.4.3 cited Lead Architect + Integration Coordinator + Project Owner.
                           Review readiness does NOT authorize implementation dispatch.
                           Partial dispatch requires strict allowlists, serialization, and exclusions.

Exact Decision Question:   Which governance structure holds authoritative jurisdiction to authorize Gate 1
                           Implementation Dispatch and Partial Dispatch across Waves 5 through 9?

Available Choices:
  [ ] Alternative 1: Joint Dual Signoff — Lead Architect AND Product Owner (both mandatory).
  [ ] Alternative 2: Technical Dual Signoff — Lead Architect AND Integration Coordinator.
  [ ] Alternative 3: Two-Phase Sequential Dispatch — Gate 1A Technical (Lead Architect +
                     Integration Coordinator) followed by Gate 1B Business (Product Owner +
                     Project Owner Executive Ratification).
  [ ] Alternative 4: Executive Project Owner Exclusive Signoff upon Joint Recommendation.

Recommended Option:        Alternative 3 (Two-Phase Sequential Dispatch) is the preferred recommendation
                           for evaluation. It establishes strict separation between technical readiness
                           certification and business dispatch release. The Project Owner retains the
                           sole authority to adopt Alternative 1, 2, 3, 4, or another model.
Consequences:              Resolves governance ambiguity. Enables lawful issuance of Partial Dispatch
                           Orders using the Phase A4 authorization template once contracts are signed.
                           Does not automatically dispatch any task.

Required Decision-Makers:  Project Owner (Mandatory Executive Ratification)
Required Concurrence:      Lead Architect, Product Owner, Integration Coordinator

--- FORMAL APPROVAL RECORD (TO BE EXECUTED BY DESIGNATED DECISION-MAKERS) ---
Approval Status:           [ ] PENDING    [ ] APPROVED    [ ] REJECTED    [ ] DEFERRED
Selected Choice:           [ ] Alt 1      [ ] Alt 2       [ ] Alt 3       [ ] Alt 4

Project Owner Executive Determination:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Project Owner (Executive Governance Authority)
  Formal Determination:    [ ] APPROVED   [ ] REJECTED    [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Lead Architect Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Lead Architect
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Product Owner Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Product Owner
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________

Integration Coordinator Concurrence:
  Decision-Maker Name:     ____________________________________________________
  Role / Title:            Integration Coordinator
  Determination:           [ ] CONCUR     [ ] DISSENT     [ ] DEFERRED
  Date:                    ____________________________________________________
  Signature / Reference:   ____________________________________________________
  Conditions & Notes:      ____________________________________________________
================================================================================
```

---

## 10. Summary Governance Conclusion

This human governance decision package is complete, evidence-backed, and formally structured for executive Project Owner review. All four decisions (`DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`) remain pending written execution.

**IMPLEMENTATION DISPATCH REMAINS STRICTLY NOT AUTHORIZED.**

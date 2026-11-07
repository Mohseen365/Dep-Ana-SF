# Phase A3 Human Governance Decision Package
**Document Identifier**: `docs/waves-5-9/phase-a3/PHASE_A3_HUMAN_GOVERNANCE_DECISION_PACKAGE.md`
**Governance Scope**: Phase A3 Human Decisions DEC-01 through DEC-04 (Incorporating Phase A3.1 Technical Review Corrections)
**Implementation Authorization Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `85e8f4e9a92b1bba13f9a72f61bbd5909c43e96b` on branch `jules-3615347302555669507-d5c1e42b`

---

## 1. Executive Summary & Governance Purpose

This document provides the formal, evidence-backed human governance decision package for Phase A3 decisions `DEC-01`, `DEC-02`, `DEC-03`, and `DEC-04`, incorporating technical corrections and consistency reviews established during project-owner evaluations.

In accordance with project governance rules established in Wave 0.4.3 through Wave 0.4.10 and reaffirmed across Phase A1, Phase A2, and Phase A3 audits:
1. **Implementation Dispatch is NOT Authorized**: Zero tasks are authorized to implement. All code modifications, Apex metadata changes, LWC source implementations, offline test additions, and git branch dispatches remain locked.
2. **Decisions Require Explicit Human Ratification**: Neither automated subagents nor coordinator agents possess authority to resolve architectural conflicts, ratify proposed contracts, or approve implementation release. All four decisions presented herein remain explicitly **PENDING** human review and signature.
3. **Task Readiness Integrity Preserved**: Review eligibility is strictly separated from implementation authorization. The verified 21-task classification breakdown is preserved:
   - **8 Tasks**: `READY_FOR_IMPLEMENTATION_REVIEW` (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`)
   - **9 Tasks**: `BLOCKED_ON_PREDECESSORS` (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`)
   - **2 Tasks**: `BLOCKED_ON_CONTRACT_APPROVAL` (`W8-2`, `W9-1`)
   - **1 Task**: `BLOCKED_ON_UNRESOLVED_SPECIFICATION` (`W7-P1`)
   - **1 Task**: `COORDINATOR_EXCLUSIVE` (`INT-1`)
   - **0 Tasks**: `AUTHORIZED_FOR_IMPLEMENTATION`

---

## 2. DEC-01 — CONTRACT-04: Analysis Run History API Status Semantics & SOQL Ordering

### 2.1 Context and Technical Background
Task `W7-P1` (`Minimal History API (Contract A Apex & DTO)`) is the entry point for historical run retrieval in Salesforce, implemented in:
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`

The object `DA_Analysis_Run__c` is bound by strict zero-schema constraints: it contains standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and exactly **one** custom field (`DA_Project__c` lookup). Fields such as `Status__c`, `Metrics_JSON__c`, and `DNA_Barcode__c` do not exist. Therefore, the status of an analysis run cannot be read from a database field; it must be derived dynamically from related `DA_Graph_Chunk__c` records.

### 2.2 Exact Conflicting Contract Language
In `docs/waves-5-9/phase-a3/CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`, two distinct sections specify mutually contradictory status values when chunk count is zero:

1. **Section 4 (Zero-Schema Metadata Invariants, line 43)**:
   > *"All status/timestamp attributes on the DTO must be derived safely:*
   > *- `status`: Derived as `'COMPLETED'` if chunks exist, or `'UNKNOWN'`."*

2. **Section 5.2 (Controller Method Specification, line 117)**:
   > ```apex
   > Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
   > dto.totalChunks = chunks;
   > dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
   > ```

### 2.3 Exact Conflicting SOQL Ordering Clauses
In `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`, two distinct sections specify differing SOQL `ORDER BY` clauses for the primary run query:

1. **Section 5.2 (Controller Method Specification, lines 88–95)**:
   > ```apex
   > List<DA_Analysis_Run__c> runs = [
   >     SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
   >     FROM DA_Analysis_Run__c
   >     WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
   >     WITH USER_MODE
   >     ORDER BY CreatedDate DESC
   >     LIMIT :safeLimit
   > ];
   > ```

2. **Section 6.2 (Deterministic Tie-Breaking, lines 129–130)**:
   > *"Queries order primarily by `CreatedDate DESC, Id DESC` to ensure completely deterministic ordering."*

### 2.4 Current Source and Test Behavior
Inspection of `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` reveals that:
- `DAGraphController` currently implements:
  - `getProjects()` (lines 6–15)
  - `getLatestGraphMetadataForProject(String projectId)` (lines 20–58)
  - `getGraphChunks(String runId, Integer startIndex, Integer maxChunks)` (lines 65–85)
  - `getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)` (lines 94–140)
  - `getLatestGraphForProject(String projectId)` (lines 145–167)
- Method `getAnalysisRuns(String projectId, Integer queryLimit)` **is not yet implemented** in `DAGraphController.cls`.
- `DAAnalysisRunSummaryDTO.cls` **does not yet exist** under `scratch/salesforce-poc/force-app/main/default/classes/dto/`.
- `DAGraphControllerTest.cls` and `DAGraphSecurityTest.cls` test existing chunk retrieval, bounded paging, and multi-tenant isolation, but do not contain assertions for `getAnalysisRuns` or zero-chunk status semantics.
- Downstream consumer `daAnalysisHistoryView` (`W7-3`) is not yet created.

### 2.5 Critical Investigation: Distinguishing Payload Availability from Execution Completion
A rigorous investigation of the Salesforce metadata and data model reveals that chunk presence does **not** establish verified analytical completion, and chunk absence does **not** prove error-free emptiness:

1. **The Zero-Schema Indistinguishability Limitation**:
   - `DA_Analysis_Run__c` possesses no lifecycle status, error message, or completion timestamp.
   - An aggregate count of zero chunks occurs identically if:
     - An analysis completed on a repository with 0 components.
     - An analysis crashed/timed out before chunks were written.
     - Chunks are currently in-flight across asynchronous DML transactions.
     - The user lacks FLS or object read permissions on `DA_Graph_Chunk__c` under `WITH USER_MODE`.
   - Likewise, having $\ge 1$ chunk merely proves that **at least one chunk record was queried**; it does not prove that all chunks were written or that analysis succeeded without truncation.
2. **Evaluation of Semantic Labels**:
   - **`EMPTY`**: Accurately describes that zero chunks were found at query time. It indicates payload absence.
   - **`AVAILABLE` vs `COMPLETED`**:
     - `AVAILABLE` accurately communicates that graph payload chunks exist and are retrievable.
     - `COMPLETED` implies lifecycle success, which cannot be proven from zero-schema data alone.
     - However, downstream LWC consumers and legacy contract drafts reference `'COMPLETED'`.
3. **Smallest Safe Contract Change**:
   - To preserve legacy interface expectations without misleading users, CONTRACT-04 must formally document that the returned status string represents **payload availability at query time**:
     - If `totalChunks > 0`: Returns `'COMPLETED'` (or `'AVAILABLE'`), formally defined as *"Payload chunks exist and are retrievable for visualization"*.
     - If `totalChunks === 0`: Returns `'EMPTY'`, formally defined as *"Run header exists, but zero graph chunks were found at query time. No payload is available to visualize."*
   - Downstream consumers in `daAnalysisHistoryView` (`W7-3`) and `daCompareView` (`W8-3`) use `status === 'EMPTY'` to disable comparison and load actions.

### 2.6 Exact Proposed Replacement Clauses for CONTRACT-04

#### 1. Replacement for Section 4 (Zero-Schema Metadata Invariants, line 43)
```markdown
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived objectively from chunk availability at query time:
    - If `totalChunks > 0`: `'COMPLETED'` (Payload chunks exist and are retrievable; indicates payload availability).
    - If `totalChunks == 0`: `'EMPTY'` (Run header exists, but zero graph chunks were found at query time. Indicates no payload is available to visualize).
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.
```

#### 2. Replacement for Section 5.2 SOQL Query and Status Mapping (lines 88–95, line 117)
```apex
    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    // Compound ordering (CreatedDate DESC, Id DESC) guarantees deterministic pagination
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC, Id DESC
        LIMIT :safeLimit
    ];

    ...

    for (DA_Analysis_Run__c run : runs) {
        ...
        Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
        dto.totalChunks = chunks;
        dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
        dtos.add(dto);
    }
```

#### 3. Reconciled Section 6.2 (Deterministic Tie-Breaking)
```markdown
2. **Deterministic Tie-Breaking**:
   - Queries order primarily by `CreatedDate DESC, Id DESC` to guarantee strict deterministic pagination across all execution environments.
```

### 2.7 Decision Record DEC-01 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-01
================================================================================
Decision ID:          DEC-01
Decision Title:       CONTRACT-04 Zero-Chunk Status Semantics & Deterministic SOQL Ordering
Contract Affected:    CONTRACT-04 (Analysis Run History API)
Tasks Affected:       W7-P1, W7-3, W8-3
Required Approvers:   Lead Architect, Integration Coordinator

FORMAL QUESTION:
Shall CONTRACT-04 define zero-chunk run status as 'EMPTY' (Option A) or 'UNKNOWN' (Option B),
and shall the SOQL query mandate compound tie-breaker 'ORDER BY CreatedDate DESC, Id DESC'?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Adopt 'EMPTY' status and 'ORDER BY CreatedDate DESC, Id DESC'.
[ ] OPTION B: Adopt 'UNKNOWN' status and 'ORDER BY CreatedDate DESC'.
[ ] OPTION C: Other (specify conditions below).

Lead Architect Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Integration Coordinator Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 3. DEC-02 — CONTRACT-05: Dual-Snapshot Payload Size Limits & Single Cytoscape Canvas Invariant

### 3.1 Context and Technical Background
Task `W8-2` (`daDiffEngine.js`) and Task `W8-3` (`daCompareView.js`) implement dual-snapshot comparison, computing differences between two architectural graphs and rendering the visual diff.

In Phase A1 and early drafts, documents cited "10MB/20MB limits" without grounding in physical platform capabilities. Contract 05 (`CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`) proposed:
- Single Snapshot Payload Cap: **5 MB** uncompressed JSON (~30,000 entities).
- Dual Snapshot Combined Cap: **10 MB** raw JSON.
- Single Cytoscape Canvas: Rendering diffs in a single unified Cytoscape instance with color-coded delta styling.

Contract 05 currently has status **`PROPOSED`**.

### 3.2 Critical Technical Measurement Distinction: Characters vs UTF-8 Bytes
A vital engineering distinction must be established between **JavaScript string length (characters)**, **UTF-8 bytes**, and **serialized JSON bytes**:

1. **JavaScript String Characters (`String.length`)**:
   - In JavaScript, `String.prototype.length` counts the number of 16-bit UTF-16 code units.
   - ASCII characters consume 1 code unit (length 1) and 1 byte in UTF-8.
   - Supplementary characters (emojis, complex Unicode) consume 2 code units (surrogate pair, length 2) and 4 bytes in UTF-8.
2. **Existing Implementation Measurement in Code**:
   - In `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`:
     ```javascript
     export const MAX_CHUNK_SIZE = 131072; // Salesforce LongTextArea field limit (131,072 chars)
     export const MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB application-level payload limit

     export function validatePayloadSize(rawJson, maxTotalSize = MAX_TOTAL_PAYLOAD_SIZE) {
         if (typeof rawJson !== 'string') return false;
         return rawJson.length <= maxTotalSize;
     }
     ```
   - **Empirical Confirmation**: The existing implementation measures **JavaScript string character length (`rawJson.length`)**, NOT encoded byte count.
   - Citing "10 MB" is technically a shorthand for **10,485,760 UTF-16 code units / string characters**.

### 3.3 Memory Hypotheses vs Verified Empirical Evidence
To maintain technical integrity, unmeasured memory multipliers must be explicitly classified as **unverified hypotheses**:

1. **Unverified Memory Hypotheses**:
   - The assertion that parsed JavaScript AST objects occupy exactly $4\times$ to $8\times$ raw string size is an unverified hypothesis dependent on the V8 engine heap version.
   - The assertion that Cytoscape requires exactly $30\text{ MB}$ to $50\text{ MB}$ is an unverified hypothesis dependent on browser canvas rasterization.
   - Guaranteed browser tab safety cannot be asserted based on raw payload string limits alone.
2. **Verified Platform Limits (Source-Confirmed Facts)**:
   - `DA_Graph_Chunk__c.Payload_Data__c` length limit is 131,072 characters in metadata (`Payload_Data__c.field-meta.xml`).
   - Synchronous Apex heap limit is 6 MB.
   - Batched chunk retrieval (`maxChunks <= 10`) caps wire payloads to $\approx 1.31\text{ MB}$ per call.
   - `daGraphPayloadLoader.js` line 6 sets `MAX_TOTAL_PAYLOAD_SIZE = 10485760` characters.
3. **Approved Architectural Invariant**:
   - **Single Cytoscape Canvas Invariant**: Preserved from Contract W0-C7 and CONTRACT-09 (Invariant 4). Concurrently instantiating two Cytoscape instances is strictly prohibited.

### 3.4 Bounded Benchmark Plan vs Postponed Real-Browser Validation

#### A. Bounded Offline Node.js Benchmark Plan (Runnable without Code Changes)
Before implementation dispatch, an offline Node.js benchmark suite will be executed:
1. Synthesize graph JSON payloads of 1,000, 5,000, 15,000, and 30,000 nodes (scaling up to 5,242,880 string characters).
2. Measure baseline heap using `process.memoryUsage().heapUsed`.
3. Parse payloads using `JSON.parse` and measure delta heap.
4. Execute `daDiffEngine` snapshot comparison algorithm and measure peak heap.
5. Trigger Node.js garbage collection (`gc()`) and confirm heap reclamation.

#### B. Future Real-Browser & Salesforce Lightning Experience / LWS Validation
- **Status**: **Explicitly Postponed**.
- Real-browser DOM rendering, WebGL context retention, and Lightning Web Security (LWS) lifecycle testing require live browser environments and scratch org deployments, which remain strictly unauthorized until project-owner release.

### 3.5 Proposed Limits and Enforcement Rules
1. **Single Snapshot String Limit**: `5,242,880` string characters (`rawJson.length <= 5242880`, ~5 MB).
2. **Combined Dual Snapshot Limit**: `10,485,760` string characters (`(rawJsonA.length + rawJsonB.length) <= 10485760`, ~10 MB).
3. **Enforcement Location**: `daCompareView.js` validates payload character lengths prior to triggering `daDiffEngine.computeDiff`.
4. **Rejection Behavior**: Payloads exceeding limits are rejected with `PayloadLimitExceededError`, and a structured tabular comparison fallback is offered.

### 3.6 Decision Record DEC-02 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-02
================================================================================
Decision ID:          DEC-02
Decision Title:       CONTRACT-05 Dual-Snapshot Payload Size Caps & Single Canvas Invariant
Contract Affected:    CONTRACT-05 (Dual-Snapshot Retrieval & Diff Engine Contract)
Tasks Affected:       W8-2, W8-3
Required Approvers:   Lead Architect, Workstream D Lead

FORMAL QUESTION:
Shall CONTRACT-05 be ratified with 5,242,880 character single-snapshot cap,
10,485,760 character combined cap, and the strict Single Cytoscape Canvas Invariant?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Ratify 5M char single snapshot, 10M char combined snapshot, single Cytoscape canvas.
[ ] OPTION B: Expand to 10M char single snapshot, 20M char combined snapshot.
[ ] OPTION C: Other (specify conditions below).

Lead Architect Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Workstream D Lead Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 4. DEC-03 — CONTRACT-07: Refactoring Simulation DTOs, Topological Integrity & Method-Level Operations

### 4.1 Context and Technical Background
Task `W9-1` (`daRefactoringEngine.js`), Task `W9-2` (`daRefactoringView.js`), and Task `W9-3` (`daRefactorHandoffModal.js`) comprise Workstream E (Wave 9 Refactoring Simulation).
`CONTRACT_07_REFACTORING_ACTION_DTOS.md` defines four refactoring actions:
1. `EXTRACT_CLASS`
2. `MOVE_METHOD`
3. `BREAK_CYCLE`
4. `REMOVE_NODE`

Contract 07 is currently **`PROPOSED`**. A rigorous audit against `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` and repository fixtures reveals profound semantic discrepancies and missing schema elements.

---

### 4.2 Action-by-Action Technical Analysis & Corrections

#### Action 1: `EXTRACT_CLASS` (Evaluation of `movedMethodList`)
1. **The Question**: When method-specific edge retargeting is deferred because CONTRACT-01 has no method metadata, is `movedMethodList: string[]` still meaningful?
2. **Analysis**:
   - `movedMethodList` cannot drive graph topological changes (edges cannot be filtered by method name).
   - However, in human architecture reviews and handoff export (`daRefactorHandoffModal` / Task `W9-3`), architects specify which methods are intended to be extracted to generate documentation checklists.
3. **Resolution**:
   - **Retain `movedMethodList: string[]` strictly as Non-Operational Informational Metadata**.
   - The contract must explicitly state: `movedMethodList` is preserved for human review and handoff export documentation only; `daSimulationEngine` does not inspect method names to retarget graph edges.
4. **Resulting Transformation**:
   - Creates new node `Class.<Name>` in `nodes[]`.
   - Creates directed dependency edge: `sourceNodeId -> Class.<Name>`.

---

#### Action 2: `MOVE_METHOD`
1. **The Incompatibility**: CONTRACT-01 has no `methods[]` array and no method-level edge annotations.
2. **Resolution**: **Defer and Mark Unsupported**.
3. **Engine Rejection**: Returns structured error `UNSUPPORTED_REFACTORING_ACTION` without mutating payload.

---

#### Action 3: `BREAK_CYCLE` (Deep Mathematical Graph Analysis)

##### 1. The Mathematical Investigation
The proposed transformation replaces cyclic directed edge $A \to B$ with:
$$A \longrightarrow I\langle B \rangle \quad \text{and} \quad B \longrightarrow I\langle B \rangle$$
Where $I\langle B \rangle$ is an injected interface node.

##### 2. Tarjan Strongly Connected Components (SCC) Proof
Consider a concrete cycle: $A \to B \to C \to A$.
- **Before Transformation**:
  - Edges: $(A, B), (B, C), (C, A)$.
  - Tarjan SCC: **$\{A, B, C\}$** (A single non-trivial strongly connected component of size 3; a cycle exists).
- **Applying the Transformation**:
  - Edge $(A, B)$ is removed.
  - Edges added: $(A, I\langle B \rangle)$ and $(B, I\langle B \rangle)$.
  - New Edge Set: $(A, I\langle B \rangle), (B, I\langle B \rangle), (B, C), (C, A)$.
- **After Transformation SCC Computation**:
  - Traversal from $B$: $B \to C \to A \to I\langle B \rangle$.
  - Node $I\langle B \rangle$ has out-degree 0 (dead end). Node $A$ no longer reaches $B$ because edge $(A, B)$ was severed!
  - Tarjan SCCs: **$\{I\langle B \rangle\}, \{A\}, \{C\}, \{B\}$** (All singletons!).
  - **Mathematical Proof**: The original cycle is **eliminated** because path connectivity from $A$ to $B$ is broken.

##### 3. Dependency Inversion Semantics Check
- In Dependency Inversion (DIP), class $A$ depends on interface $I\langle B \rangle$ ($A \to I\langle B \rangle$), and implementation class $B$ implements interface $I\langle B \rangle$ ($B \to I\langle B \rangle$).
- Statically, both $A$ and $B$ depend on $I\langle B \rangle$, breaking the cyclic dependency between $A$ and $B$.
- **Edge Direction Verification**: The edge must be directed $B \to I\langle B \rangle$ (type: `implements`). If the edge were mistakenly directed $I\langle B \rangle \to B$, the cycle would NOT be broken ($A \to I\langle B \rangle \to B \to C \to A$). Directing $B \to I\langle B \rangle$ is mathematically valid.

---

#### Action 4: `REMOVE_NODE` (Comprehensive Edge Topologies & Cascade Rules)
To guarantee zero dangling edges and satisfy CONTRACT-01 integrity (`daGraphPayloadLoader.js` lines 78–82), `REMOVE_NODE` must handle all 7 topological edge scenarios:

| Topology Scenario | Graph State for Node $N$ | Precondition & Action Behavior | Resulting Payload Edge State |
| :--- | :--- | :--- | :--- |
| **1. Zero In / Zero Out** | Isolated node ($fanIn = 0, fanOut = 0$) | Safe removal permitted without cascade flag. | Node $N$ removed; zero edge mutations. |
| **2. Outgoing Edges Only** | $fanIn = 0, fanOut > 0$ | Safe removal permitted without cascade flag. | Node $N$ removed; all outbound edges $(N \to X)$ removed. |
| **3. Incoming Edges Only** | $fanIn > 0, fanOut = 0$ | **Rejected** unless `cascadeEdges: true`. | If cascade true: node $N$ and all inbound edges $(X \to N)$ removed atomically. |
| **4. Both In and Out Edges** | $fanIn > 0, fanOut > 0$ | **Rejected** unless `cascadeEdges: true`. | If cascade true: node $N$ and all incident edges (inbound and outbound) removed atomically. |
| **5. Self-Loops** | Edge $(N \to N)$ exists | Counted as incident edges. | Self-loop edge removed atomically with node $N$. |
| **6. Multiple Incident Edges** | Multiple edges to/from same nodes | All instances connected to $N$ purged. | Zero dangling edge references remain. |
| **7. Invalid / Stale Edges** | Edges referencing non-existent nodes | Pre-validation rejects payload before action. | Maintains CONTRACT-01 validation invariants. |

- **FanIn Calculation Rule**: $fanIn$ must be calculated by **dynamically counting actual inbound edges in `payload.edges`**, never by trusting potentially stale `node.fanIn` metadata.
- **Atomicity**: The removal of node $N$ and all its incident edges occurs in a single immutable step. The output payload is validated against `validatePayloadIntegrity` before returning.

---

### 4.5 Metric Recomputation Boundary

Refactoring metrics in `SimulationDeltas` are categorized into three explicit tiers:

```
+-----------------------------------------------------------------------------------------+
|                         METRIC RECOMPUTATION BOUNDARIES                                 |
|                                                                                         |
|  Tier 1: Deterministically Calculable from CONTRACT-01 Payload                          |
|          - couplingDelta: sum of degree changes across modified/removed nodes           |
|          - cyclesEliminated: baseCycleCount - newCycleCount (via in-memory Tarjan SCC)  |
|          - highRiskComponentsDelta: net change in nodes with risk === 'HIGH'            |
|          - unresolvedReferencesDelta: net change in edges with isUnresolved === true    |
|                                                                                         |
|  Tier 2: Requiring Existing Analytical Adapter (Explorer Adapter)                       |
|          - architectureHealthScore: Heuristic calculated via                             |
|            calculateArchitectureHealth(payload) from explorer/src/lib/health.ts         |
|                                                                                         |
|  Tier 3: Unavailable / Not Reportable                                                   |
|          - If summary block or required heuristic inputs are missing:                    |
|            architectureHealthDelta is returned as null / undefined with warning          |
+-----------------------------------------------------------------------------------------+
```

---

### 4.6 Required Reference Fixtures (Exact 10-Fixture Suite)
1. `fixture-01-extract-class.json`: Valid `EXTRACT_CLASS` action with non-operational `movedMethodList`.
2. `fixture-02-break-cycle-interface.json`: Valid `BREAK_CYCLE` using `EXTRACT_INTERFACE`.
3. `fixture-03-remove-node-zero-fanin.json`: Valid `REMOVE_NODE` on isolated component.
4. `fixture-04-remove-node-cascade.json`: Valid `REMOVE_NODE` with `cascadeEdges: true`.
5. `fixture-05-unsupported-move-method.json`: `MOVE_METHOD` yielding `UNSUPPORTED_REFACTORING_ACTION`.
6. `fixture-06-unsupported-break-cycle-strategy.json`: `BREAK_CYCLE` with `INVERSION_OF_CONTROL`.
7. `fixture-07-invalid-node-reference.json`: Action referencing non-existent node ID.
8. `fixture-08-duplicate-id-collision.json`: Action attempting to create existing node ID.
9. `fixture-09-input-immutability.json`: Test payload asserting object references remain unchanged.
10. `fixture-10-graph-integrity-post-action.json`: Payload validating CONTRACT-01 schema compliance after action.

### 4.7 Decision Record DEC-03 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-03
================================================================================
Decision ID:          DEC-03
Decision Title:       CONTRACT-07 Refactoring Action DTOs & Topological Semantics
Contract Affected:    CONTRACT-07 (Refactoring Action DTOs & Simulation Operations)
Tasks Affected:       W9-1, W9-2, W9-3
Required Approvers:   Workstream E Lead, Integration Coordinator

FORMAL QUESTION:
Shall CONTRACT-07 be amended and ratified under Option A (component-level scoping,
defer MOVE_METHOD, standardize BREAK_CYCLE on EXTRACT_INTERFACE, enforce cascadeEdges on
REMOVE_NODE, and supply 10 reference fixtures)?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Adopt Option A (component-level scoping, schema corrections, missing fixtures).
[ ] OPTION B: Adopt Option B (full method-level schema extension of CONTRACT-01).
[ ] OPTION C: Other (specify conditions below).

Workstream E Lead Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Integration Coordinator Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 5. DEC-04 — Implementation Dispatch Authority (Gate 1 Release)

### 5.1 The Documented Disagreement Over Gate 1 Authorization
Across Phase A1, Phase A2, and Phase A3 documentation, conflicting statements exist regarding who possesses the authority to sign off on Gate 1 implementation dispatch:
1. **Phase A2 Charter & Completion Summary**: Cited **Lead Architect + Integration Coordinator**.
2. **Phase A3 Audit Findings Reconciliation Report (§5.2 & §12)**: Cited **Project Sponsor / Product Owner + Lead Architect**.
3. **Phase A3 Integrity Audit Report (§8 & §12)**: Formalized this contradiction under `DEC-04`.

### 5.2 Strict Partial-Dispatch Controls
To prevent a general Wave 5–9 approval from prematurely launching unready tasks, a Partial Dispatch Order must satisfy eight mandatory criteria:
1. **Explicit Task Allowlist**: Must name exact task IDs (e.g. `[W5-1, W6-1, W7-1, W8-1]`). Blanket authorizations are prohibited.
2. **Scope Boundary**: Must define permitted files from `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`.
3. **Named Task Owner**: Must specify the assigned engineer / workstream lead.
4. **Frozen Contract References**: Must cite frozen contract IDs and versions.
5. **Verified Predecessors**: All direct predecessors must be completed and verified by baseline regression tests.
6. **Explicit Exclusion List**: Must explicitly enumerate all tasks remaining locked (e.g. `W5-2..6`, `W7-P1`, etc.).
7. **Verification Requirements**: Must mandate clean execution of task runner and all 9 baseline regression runners.
8. **Revocation Authority**: Must specify that either the Lead Architect or Product Owner can immediately suspend the order.

### 5.3 Comparative Analysis Across Alternatives

| Evaluation Dimension | Alternative 1: Joint Dual Signoff (Lead Architect + Product Owner) | Alternative 2: Technical Dual Signoff (Lead Architect + Integration Coordinator) | Alternative 3: Two-Phase Dispatch (Phase 1A Technical / 1B Product) |
| :--- | :--- | :--- | :--- |
| **1. Who Signs?** | Lead Architect AND Product Owner (both mandatory). | Lead Architect AND Integration Coordinator. | Gate 1A: Lead Architect + Integration Coordinator; Gate 1B: Product Owner. |
| **2. What is Approved?** | Release of engineering implementation budget AND technical readiness. | Verification of technical contract readiness only. | Gate 1A approves technical readiness; Gate 1B releases tasks for dispatch. |
| **3. Required Evidence** | Offline test logs (187/187), frozen contracts, signed DEC-01..03, sprint plan. | Offline test logs (187/187), frozen contracts, dependency trees. | Gate 1A: test evidence + contracts; Gate 1B: business release signoff. |
| **4. Dual Signoff Mandatory?** | **YES.** Both must sign; neither can override. | **YES.** Both technical roles must sign. | **YES.** Both gates must pass sequentially. |
| **5. Single Authority Rejection?** | Dispatch halted immediately. Returned to planning. | Dispatch halted immediately. Returned to architecture. | Gate 1A rejection halts technical review; Gate 1B rejection halts launch. |
| **6. Partial Dispatch Permitted?** | Permitted only under strict 8-point Partial Dispatch Controls. | Permitted on a per-workstream basis upon contract freeze. | Permitted: Batch 1 released while later waves await Gate 1B. |
| **7. Recording Mechanism** | Check-in of signed markdown file: `GATE_1_IMPLEMENTATION_AUTHORIZATION.md`. | Check-in of signed markdown file in repository. | Check-in of two sequential gate assessment records. |
| **8. Revocation Authority** | Either Lead Architect OR Product Owner can revoke immediately. | Either Lead Architect OR Integration Coordinator can revoke. | Architect can revoke technical gate; Product Owner can revoke dispatch gate. |

### 5.4 Recommendation: Adopt Alternative 1 (Joint Dual Signoff)
- **Recommendation**: **Adopt Alternative 1**. Joint dual signoff between the Lead Architect and Product Owner guarantees both technical contract validity and business scope authorization.

### 5.5 Decision Record DEC-04 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-04
================================================================================
Decision ID:          DEC-04
Decision Title:       Gate 1 Implementation Dispatch Signoff Authority Boundary
Contracts Affected:   All Contracts (CONTRACT-01 through CONTRACT-09)
Tasks Affected:       All 21 Tasks (W5-1..6, W6-1..4, W7-P1..3, W8-1..3, W9-1..3, INT-1)
Required Approver:    Project Sponsor / Product Owner

FORMAL QUESTION:
Which governance structure holds authoritative jurisdiction to authorize Gate 1
Implementation Dispatch across Waves 5 through 9?

STATUS:               PENDING HUMAN APPROVAL (Select Alternative 1, 2, or 3 below)

[ ] ALTERNATIVE 1: Joint Dual Signoff — Lead Architect + Product Owner.
[ ] ALTERNATIVE 2: Technical Dual Signoff — Lead Architect + Integration Coordinator.
[ ] ALTERNATIVE 3: Two-Phase Dispatch — Technical Gate 1A (Architect/IC) + Dispatch Gate 1B (PO).

Project Sponsor / Product Owner Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Lead Architect Concurrence:
  Name / Role:        _________________________________________
  Decision:           [ ] CONCUR      [ ] DISSENT     [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 6. Consolidated Decision Register

The table below unifies decisions `DEC-01` through `DEC-04`. All decision records remain explicitly **PENDING HUMAN APPROVAL**.

| Decision ID | Decision Subject | Current Status | Evidence References | Available Options | Recommended Option | Required Approver(s) | Affected Contracts | Affected Tasks | Approval Date | Approver Identity / Role | Formal Decision | Conditions or Restrictions |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **DEC-01** | CONTRACT-04 Zero-Chunk Status Semantics & SOQL Ordering | `PENDING` | `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md` §4, §5.2, §6.2; `DAGraphController.cls` | Option A ('EMPTY', compound order); Option B ('UNKNOWN', single order); Option C (Tri-state) | **Option A** ('EMPTY' status, `ORDER BY CreatedDate DESC, Id DESC`) | Lead Architect & Integration Coordinator | CONTRACT-04 | W7-P1, W7-3, W8-3 | *PENDING* | *PENDING* | *PENDING* | Strict zero-schema compliance; no unapproved custom fields. |
| **DEC-02** | CONTRACT-05 Dual-Snapshot Payload Size Caps & Single Canvas Invariant | `PENDING` | `CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md` §3.1; `daGraphPayloadLoader.js` line 6; Contract W0-C7 | Option A (5MB/10MB, single canvas); Option B (10MB/20MB); Option C (Dynamic) | **Option A** (5,242,880 char single, 10,485,760 char combined, single Cytoscape canvas) | Lead Architect & Workstream D Lead | CONTRACT-05 | W8-2, W8-3 | *PENDING* | *PENDING* | *PENDING* | Measured in UTF-16 code units; single Cytoscape canvas mandatory. |
| **DEC-03** | CONTRACT-07 Refactoring Action DTOs, Topological Semantics & Missing Fixtures | `PENDING` | `CONTRACT_07_REFACTORING_ACTION_DTOS.md` §4; `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md`; `fixtures/sample-refactoring-action.json` | Option A (Component-level scoping, schema fixes, fixtures); Option B (CONTRACT-01 method extension); Option C (Reject) | **Option A** (Component-level scoping, non-operational movedMethodList, EXTRACT_INTERFACE for cycles, cascadeEdges for node removal) | Workstream E Lead & Integration Coordinator | CONTRACT-07, CONTRACT-01 | W9-1, W9-2, W9-3 | *PENDING* | *PENDING* | *PENDING* | Pure client-side math; zero DOM/Cytoscape/Apex dependencies. |
| **DEC-04** | Gate 1 Implementation Dispatch Signoff Authority Boundary | `PENDING` | Phase A2 Summary §1; Phase A3 Reconciliation §5.2; Phase A3 Integrity §8 | Alt 1 (Joint Architect + PO); Alt 2 (Architect + Coordinator); Alt 3 (Two-Phase Gate 1A/1B) | **Alt 1** (Joint Architect + Product Owner dual signoff) | Project Sponsor / Product Owner | CONTRACT-01 through CONTRACT-09 | All 21 Tasks (W5-1..6, W6-1..4, W7-P1..3, W8-1..3, W9-1..3, INT-1) | *PENDING* | *PENDING* | *PENDING* | Strict 8-point Partial Dispatch Controls mandatory. |

---

## 7. Dispatch-Readiness Implications

### 7.1 Impact of Decisions on Task Readiness Matrix
The resolution of decisions `DEC-01` through `DEC-04` directly controls task readiness progression across the 21 canonical tasks:

1. **Resolution of DEC-01**: Unblocks Task `W7-P1` from `BLOCKED_ON_UNRESOLVED_SPECIFICATION` to `READY_FOR_IMPLEMENTATION_REVIEW`.
2. **Resolution of DEC-02**: Unblocks Task `W8-2` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
3. **Resolution of DEC-03**: Unblocks Task `W9-1` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
4. **Resolution of DEC-04**: Establishes the governing authority permitted to grant Gate 1 implementation authorization. **However, resolving DEC-04 does not automatically authorize implementation; the designated authority must then explicitly execute the Gate 1 dispatch order.**

### 7.2 Current Authoritative 21-Task Classification Matrix
The verified classification established in `PHASE_A3_FINAL_TASK_READINESS_COUNT_CORRECTION.md` is strictly preserved:

| Task ID | Workstream | Primary Governance Classification | Direct Predecessors | Contract Dependencies | Review Eligible? | Authorized to Implement? | Impact of Pending Human Decisions |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| **W5-1** | WS-A | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-02 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W5-2** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-1 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** | Serial blocker on W5-1 completion |
| **W5-3** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-1, W5-2 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** | Serial blocker on W5-1, W5-2 completion |
| **W5-4** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-3 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** | Serial blocker on W5-3 completion |
| **W5-5** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-4 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** | Serial blocker on W5-4 completion |
| **W5-6** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-5 | CONTRACT-01, CONTRACT-06 | **NO** | **NO** | Serial blocker on W5-5 completion |
| **W6-1** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-03 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-2** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-3** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-4** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-P1** | WS-C | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | None | CONTRACT-01, CONTRACT-04 | **NO** | **NO** | **Directly blocked on DEC-01** |
| **W7-1** | WS-C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-2** | WS-C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-3** | WS-C | `BLOCKED_ON_PREDECESSORS` | W7-P1 | CONTRACT-04, CONTRACT-08 | **NO** | **NO** | Blocked on W7-P1 (and DEC-01) |
| **W8-1** | WS-D | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-06 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W8-2** | WS-D | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-05 | **NO** | **NO** | **Directly blocked on DEC-02** |
| **W8-3** | WS-D | `BLOCKED_ON_PREDECESSORS` | W8-2, W7-P1 | CONTRACT-04, CONTRACT-05 | **NO** | **NO** | Compounded: blocked on W8-2, W7-P1, DEC-01, DEC-02 |
| **W9-1** | WS-E | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-07 | **NO** | **NO** | **Directly blocked on DEC-03** |
| **W9-2** | WS-E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** | Compounded: blocked on W9-1 and DEC-03 |
| **W9-3** | WS-E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** | Compounded: blocked on W9-1 and DEC-03 |
| **INT-1** | Coord | `COORDINATOR_EXCLUSIVE` | Waves 5–9 | CONTRACT-08, CONTRACT-09 | **NO** | **NO** | Awaits completion of all feature waves |

### 7.3 Category Totals Verification
$$\begin{aligned}
\text{Ready for Implementation Review} &= 8 \\
\text{Blocked on Predecessors} &= 9 \\
\text{Blocked on Contract Approval} &= 2 \\
\text{Blocked on Unresolved Specification} &= 1 \\
\text{Coordinator Exclusive} &= 1 \\
\hline
\mathbf{Total\ Accounted\ Tasks} &= \mathbf{21} \\
\mathbf{Authorized\ to\ Implement} &= \mathbf{0}
\end{aligned}$$

No task has been prematurely transitioned or elevated. Review eligibility remains strictly distinct from implementation authorization.

---

## 8. Summary Governance Conclusion

This human governance decision package is complete, evidence-backed, and ready for presentation to the designated human authorities. All four decisions (`DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`) remain pending written execution.

**IMPLEMENTATION DISPATCH REMAINS STRICTLY PROHIBITED.**

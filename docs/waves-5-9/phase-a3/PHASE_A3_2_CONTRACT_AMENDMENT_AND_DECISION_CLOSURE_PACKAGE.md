# Phase A3.2 Contract Amendment and Decision Closure Package

**Document Identifier**: `docs/waves-5-9/phase-a3/PHASE_A3_2_CONTRACT_AMENDMENT_AND_DECISION_CLOSURE_PACKAGE.md`
**Governance Scope**: Technical Decision Closure and Formal Contract Amendments (DEC-01 through DEC-04)
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `3efe0c8b5129d7837bc906a7e08eab5e64698e65` on branch `jules-16423102310878438990-1697d35f`
**Authoritative Predecessors**:
- `docs/waves-5-9/phase-a3/PHASE_A3_FINAL_TECHNICAL_DECISION_PROPOSAL.md`
- `docs/waves-5-9/phase-a3/PHASE_A3_TECHNICAL_DECISION_PROPOSAL_CORRECTIONS.md`
- `docs/waves-5-9/phase-a3/PHASE_A3_TECHNICAL_DECISION_PROPOSAL_CORRECTIONS_EXECUTION_REPORT.md`
- `docs/waves-5-9/phase-a3/PHASE_A3_HUMAN_GOVERNANCE_DECISION_PACKAGE.md`
- `docs/waves-5-9/phase-a3/PHASE_A3_RECONCILIATION_INTEGRITY_AUDIT_REPORT.md`
- `docs/waves-5-9/phase-a3/PHASE_A3_FINAL_TASK_READINESS_COUNT_CORRECTION.md`

---

## 1. Executive Summary & Governance Purpose

This document provides the authoritative, evidence-backed Phase A3.2 package that resolves the remaining technical and governance ambiguities identified in earlier Phase A3 proposals, technical reviews, and corrections reports.

### 1.1 Strict Governance Mandates
1. **Implementation Dispatch is NOT Authorized**: Exactly **0** tasks are authorized to implement. No feature implementation, code modifications, Apex metadata alterations, or test harness modifications may occur based on this package.
2. **Decisions Remain Pending**: Jules does not possess unilateral authority to approve governance decisions or modify frozen contracts. Decisions `DEC-01`, `DEC-02`, `DEC-03`, and `DEC-04` remain strictly **PENDING HUMAN RATIFICATION**.
3. **No Overwriting of Historical Deliverables**: This document establishes the Phase A3.2 amendment and closure baseline without overwriting or mutating preceding Phase A3 or Phase A3.1 documentation artifacts.
4. **Task Readiness Preservation**: The authoritative 21-task classification breakdown is preserved:
   - **8 Tasks**: `READY_FOR_IMPLEMENTATION_REVIEW`
   - **9 Tasks**: `BLOCKED_ON_PREDECESSORS`
   - **2 Tasks**: `BLOCKED_ON_CONTRACT_APPROVAL` (`W8-2`, `W9-1`)
   - **1 Task**: `BLOCKED_ON_UNRESOLVED_SPECIFICATION` (`W7-P1`)
   - **1 Task**: `COORDINATOR_EXCLUSIVE` (`INT-1`)
   - **0 Tasks**: `AUTHORIZED_FOR_IMPLEMENTATION`

---

## 2. Workstream 1 — DEC-01: Analysis Run Status & Contract 04 Amendments

### 2.1 Context and Technical Background
Task `W7-P1` (`Minimal History API (Contract A Apex & DTO)`) establishes the data-retrieval mechanism for historical architecture runs. The underlying custom object `DA_Analysis_Run__c` is strictly zero-schema (`scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/`), possessing only standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and a single custom lookup field `DA_Project__c`. No database fields exist for lifecycle execution status (`Status__c`), analytical metrics, or manifest hashes.

Consequently, run status cannot be queried; it must be derived dynamically at query time from related child records in `DA_Graph_Chunk__c`.

### 2.2 Definitions of Derived Run Statuses
To prevent false lifecycle guarantees while preserving backward compatibility for UI consumers, the derived status values are strictly defined as:

- **`EMPTY`**: Zero graph chunks (`COUNT(Id) == 0` on `DA_Graph_Chunk__c`) were found associated with the `DA_Analysis_Run__c` record at query time. No graph payload is currently retrievable. This state indicates **payload absence only**, not verified analytical completion.
- **`COMPLETED`**: One or more graph chunks (`COUNT(Id) >= 1` on `DA_Graph_Chunk__c`) were found associated with the run header at query time. The raw graph payload is retrievable via `DAGraphController.getGraphChunks`. Retained strictly for UI compatibility, `COMPLETED` explicitly means **payload availability only**, and does **NOT** guarantee that the upstream analysis engine finished without errors, crashes, or truncation.

### 2.3 Downstream Consumer Behavior & Indistinguishability Analysis
Existing consumers (`daAnalysisHistoryView` / `W7-3` and `daCompareView` / `W8-3`) rely on run listings returned by `DAGraphController.getAnalysisRuns`:
- **Consumer Behavior When Status is `EMPTY`**:
  - `daAnalysisHistoryView`: Renders an "Empty Payload" badge, disables deep-dive inspection, and disables graph rendering actions for that run.
  - `daCompareView`: Disables selection of the run as either Baseline (Snapshot A) or Target (Snapshot B), rendering a disabled option state to prevent chunk loading failures.
- **Indistinguishability of Root Causes**:
  Under strict zero-schema and `WITH USER_MODE` query enforcement, an aggregate count of zero chunks (`chunks == 0`) produces an identical observable result in four completely distinct platform situations:
  1. **Zero Architectural Components**: An analysis ran successfully to completion on an empty or stub project containing zero tracked components.
  2. **Ingestion Crash / Incomplete Pipeline**: The analysis crashed, timed out, or threw an unhandled exception before the first chunk could be persisted.
  3. **In-Flight Asynchronous Ingestion**: An asynchronous multi-chunk ingestion job (`DAGraphIngestionService`) is currently active and has not yet committed its initial chunks.
  4. **Permissions / FLS Restriction**: The running Salesforce user has read access to `DA_Analysis_Run__c` but lacks Object or Field-Level Security (FLS) read permissions on `DA_Graph_Chunk__c` or `DA_Graph_Chunk__c.Payload_Data__c`. Under `WITH USER_MODE`, inaccessible chunk records are omitted, returning `COUNT(Id) == 0`.

Because the schema lacks lifecycle timestamps, progress counters, or error logs, **the controller cannot distinguish between these four scenarios**.

### 2.4 Strict Two-Step Project Resolution
To eliminate cross-project run leakage while supporting both 18-character Salesforce record IDs and human-readable `Project_Key__c` strings, `DAGraphController.getAnalysisRuns` must enforce a strict two-step lookup rather than a combined `OR` query:
1. **Step 1 (Record ID Lookup)**: Query `DA_Project__c` where `Id = :projectId`.
2. **Step 2 (Key Fallback)**: If Step 1 returns no records or `projectId` fails syntactic Id format validation, execute a fallback query where `Project_Key__c = :projectId`.
3. If neither query resolves a project record, throw an `AuraHandledException('Invalid or unresolvable Project ID.')`.

### 2.5 Deterministic Compound SOQL Ordering
To guarantee deterministic pagination and eliminate tie-breaking indeterminacy when multiple runs share identical `CreatedDate` timestamps, all queries against `DA_Analysis_Run__c` must strictly enforce:
```sql
ORDER BY CreatedDate DESC, Id DESC
```

### 2.6 Exact Replacement Contract Wording for CONTRACT-04

#### Replacement for Section 4 (Zero-Schema Metadata Invariants, lines 42–47):
```markdown
<<<<<<< SEARCH
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived as `'COMPLETED'` if chunks exist, or `'UNKNOWN'`.
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.
=======
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived as `'COMPLETED'` if chunk count >= 1 (indicating payload availability only, not lifecycle completion), or `'EMPTY'` if chunk count == 0.
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.
>>>>>>> REPLACE
```

#### Replacement for Section 5.2 (Controller Method Specification, lines 75–124):
```markdown
<<<<<<< SEARCH
    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC
        LIMIT :safeLimit
    ];
=======
    // Resolve project ID via two-step lookup to prevent cross-project run leakage
    Id resolvedProjectId;
    if (projectId instanceOf Id) {
        List<DA_Project__c> pById = [SELECT Id FROM DA_Project__c WHERE Id = :projectId WITH USER_MODE LIMIT 1];
        if (!pById.isEmpty()) {
            resolvedProjectId = pById[0].Id;
        }
    }
    if (resolvedProjectId == null) {
        List<DA_Project__c> pByKey = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = :projectId WITH USER_MODE LIMIT 1];
        if (!pByKey.isEmpty()) {
            resolvedProjectId = pByKey[0].Id;
        }
    }
    if (resolvedProjectId == null) {
        throw new AuraHandledException('Invalid or unresolvable Project ID: ' + projectId);
    }

    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :resolvedProjectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC, Id DESC
        LIMIT :safeLimit
    ];
>>>>>>> REPLACE
```

#### Replacement for Section 6.2 (Deterministic Tie-Breaking, lines 136–138):
```markdown
<<<<<<< SEARCH
2. **Deterministic Tie-Breaking**:
   - Queries order primarily by `CreatedDate DESC, Id DESC` to ensure completely deterministic ordering.
=======
2. **Deterministic Tie-Breaking**:
   - Queries order strictly by `ORDER BY CreatedDate DESC, Id DESC` to eliminate pagination skew across runs created within the same millisecond.
>>>>>>> REPLACE
```

---

## 3. Workstream 2 — DEC-02: Payload Size, Memory, and Contract 05 Amendments

### 3.1 UTF-16 Code-Unit Counting vs UTF-8 Byte Boundaries
In `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`:
- `export const MAX_CHUNK_SIZE = 131072;`
- `export const MAX_TOTAL_PAYLOAD_SIZE = 10485760;`
- `validatePayloadSize(rawJson)` evaluates: `rawJson.length <= maxTotalSize`.

**Technical Finding**:
The validation uses JavaScript `String.prototype.length`, which measures the number of **16-bit UTF-16 code units**, not encoded UTF-8 bytes.
- For 7-bit ASCII characters (U+0000 to U+007F), 1 code unit = 1 character = 1 byte.
- For supplementary Unicode characters (U+10000 to U+10FFFF, e.g., emojis or complex mathematical symbols), JavaScript uses surrogate pairs (2 UTF-16 code units), which encode to 4 UTF-8 bytes.
- Therefore, a string of 10,485,760 UTF-16 code units may consume between **10 MB and 20.97 MB** of UTF-8 bytes in physical transit over HTTP wire protocols.

### 3.2 Platform Memory Tiers & Structural Boundaries
To eliminate unsupported speculative multipliers, memory consumption must be analyzed across four distinct runtime boundaries:

| Runtime Boundary | Physical Medium | Unit of Measurement | Hard Architectural Limit | Behavior at Exceedance |
| :--- | :--- | :--- | :--- | :--- |
| **Salesforce Chunk Field** | `DA_Graph_Chunk__c.Payload_Data__c` | LongTextArea Characters | 131,072 characters | Apex DML StringLengthException |
| **Apex Heap Limit** | Synchronous Apex Controller RAM | Heap Bytes | 6,000,000 bytes (6 MB) | Apex System.LimitException |
| **Wire JSON Transport** | Salesforce Lightning Wire / HTTP | Encoded UTF-8 Bytes | Bounded by batch size (`maxChunks <= 10`) | Aura client transport timeout |
| **Client String Heap** | JavaScript V8 Heap (LWC) | UTF-16 Code Units | 10,485,760 characters (`rawJson.length`) | `validatePayloadSize` returns `false` (fail-closed) |
| **Parsed Object Graph** | JavaScript Object Graph (AST) | Heap Allocations (V8) | Variable (Node/Edge JS objects) | V8 Heap Allocation Exhaustion |
| **Diff Index Maps** | Hash Maps (`Map<string, Node>`) | Transient JS Heap | Dual snapshot entity indexes | Managed by garbage collection |
| **Canvas Backing Store** | WebGL / Canvas 2D Textures | GPU & DOM Memory | **Single Cytoscape Canvas Rule** (W0-C7) | Browser tab crash / WebGL context loss |

### 3.3 Scope of Offline Node.js Benchmarks vs Real Browser Validation
- **What Offline Node.js Benchmarks CAN Establish**:
  - Exact V8 heap allocation (`process.memoryUsage().heapUsed`) during JSON parsing of large synthetic payloads (1,000 to 30,000 nodes).
  - Algorithmic time and space complexity of `daDiffEngine.computeDiff`.
  - Verification that transient lookup `Map` and `Set` structures are cleanly dereferenced and eligible for garbage collection without retaining circular references.
- **What Offline Node.js Benchmarks CANNOT Establish**:
  - Memory consumption within the Salesforce Lightning Web Security (LWS) or Locker Service sandbox (which wraps DOM and JS objects in Proxy objects, adding memory overhead).
  - Browser layout engine costs, DOM tree overhead, or CSS reflow times.
  - WebGL context limits or GPU texture memory backing Cytoscape.js canvases on resource-constrained client machines or mobile devices.
  - Multi-tab browser memory limits.

### 3.4 Exact Replacement Contract Wording for CONTRACT-05

#### Replacement for Section 3.1 (10MB vs 20MB Discrepancy, lines 20–30):
```markdown
<<<<<<< SEARCH
| Boundary / Tier | Physical Constraint | Architectural Rule | Classification |
| :--- | :--- | :--- | :--- |
| **Per-Chunk Field Size** | Long Text Area limit: 131,072 characters (~131 KB) | Each `DA_Graph_Chunk__c.Payload_Data__c` is bounded to <= 131,072 chars. | `IMPLEMENTED_AND_VERIFIED` |
| **Apex Heap Limit** | Synchronous Apex limit: 6 MB heap | Controller fetches chunks in batches of `maxChunks <= 10` (~1.3 MB payload per roundtrip). | `IMPLEMENTED_AND_VERIFIED` |
| **Single Snapshot Cap** | Client-side memory boundary | Recommended maximum single snapshot size: **5 MB** uncompressed JSON (~30,000 entities). | `PROPOSED_STANDARD` |
| **Dual Snapshot Combined** | Dual payload retention in client RAM | Combined Snapshot A + Snapshot B maximum: **10 MB** raw JSON. | `PROPOSED_STANDARD` |
| **Diff Rendering Instance** | Browser canvas memory boundary | **Single Cytoscape instance** rule (W0-C7): concurrent instantiation of two independent Cytoscape canvases is strictly prohibited. | `FROZEN_INVARIANT` |
=======
| Boundary / Tier | Physical Constraint | Architectural Rule | Classification |
| :--- | :--- | :--- | :--- |
| **Per-Chunk Field Size** | Long Text Area limit: 131,072 characters | Each `DA_Graph_Chunk__c.Payload_Data__c` is bounded to <= 131,072 UTF-16 code units. | `IMPLEMENTED_AND_VERIFIED` |
| **Apex Heap Limit** | Synchronous Apex limit: 6 MB heap | Controller fetches chunks in batches of `maxChunks <= 10` (~1.3 MB payload per roundtrip). | `IMPLEMENTED_AND_VERIFIED` |
| **Single Snapshot Cap** | Client-side string memory boundary | Maximum single snapshot size: **5,242,880 UTF-16 code units** (`String.length`). | `PROPOSED_STANDARD` |
| **Dual Snapshot Combined** | Dual payload retention in client RAM | Combined Snapshot A + Snapshot B maximum: **10,485,760 UTF-16 code units** (`String.length`). | `PROPOSED_STANDARD` |
| **Diff Rendering Instance** | Browser canvas memory boundary | **Single Cytoscape instance** rule (W0-C7): concurrent instantiation of two active Cytoscape canvases is strictly prohibited. | `FROZEN_INVARIANT` |
>>>>>>> REPLACE
```

---

## 4. Workstream 3 — DEC-03: Refactoring DTO and Graph Semantics

### 4.1 Part A: EXTRACT_CLASS Semantics & `movedMethodList`
In `CONTRACT_07_REFACTORING_ACTION_DTOS.md`, `ExtractClassAction` contains:
```typescript
movedMethodList: string[]; // List of method identifiers to extract
```
- **Informational Metadata Status**: Because `CONTRACT-01` canonical graph payloads represent architectural entities exclusively at component granularity (`Class.AccountService`, `Object.Contact`) and do not model individual methods or method-level invocation edges, `movedMethodList` is classified as **informational-only metadata**.
- **Engine Prohibitions**:
  1. `daSimulationEngine` **MUST NOT** attempt to create method-level graph nodes.
  2. `daSimulationEngine` **MUST NOT** attempt to parse or retarget method-level dependency edges.
  3. `daSimulationEngine` **MUST NOT** alter the canonical component-level graph topology based on method names.
  4. `movedMethodList` **MUST NOT** be interpreted as executable instructions by the simulation engine.
- **Component-Level Transformation Contract**:
  - The engine clones `payload.nodes` and injects new node `newClassName` (with layer `newClassLayer || sourceNode.layer`).
  - The engine creates a directed dependency edge from `sourceNodeId` to `newClassName` (type: `references`).
  - All existing inbound edges to `sourceNodeId` remain untouched.
  - `movedMethodList` is preserved verbatim on the action DTO for human review checklists and handoff exports (`daRefactorHandoffModal` / Task `W9-3`).

### 4.2 Part B: BREAK_CYCLE Semantics & Deterministic Tarjan SCC Verification
`BreakCycleAction` severs cyclic dependencies via intermediate abstraction.

#### Edge Direction & Dependency Inversion Semantics
- In dependency inversion, caller $A$ references interface $I\langle B \rangle$ ($A \to I\langle B \rangle$, type: `references`).
- Implementation $B$ implements interface $I\langle B \rangle$. In the dependency graph, $B$ depends on the interface contract ($B \to I\langle B \rangle$, type: `implements`).
- Therefore, both directed replacement edges point toward the newly generated interface node $I\langle B \rangle$.
- Because $I\langle B \rangle$ has an out-degree of 0, it cannot propagate dependency paths back to $B$ or any other node.

#### Mathematical Verification of the 7 Required Topological Scenarios
All seven required scenarios were modeled and evaluated using deterministic Tarjan Strongly Connected Components (SCC):

```
Tarjan SCC Execution Results:
================================================================================
Scenario 1: 3-Node Simple Cycle (A -> B -> C -> A), severing (A, B)
  - Pre-Transformation SCCs:  [ [ 'A', 'B', 'C' ] ] (1 multi-node cycle)
  - Transformed Edges:        (A, I<B>), (B, I<B>), (B, C), (C, A)
  - Post-Transformation SCCs: [ [ 'I<B>' ], [ 'A' ], [ 'C' ], [ 'B' ] ]
  - Verdict: CYCLE COMPLETELY ELIMINATED (Delta: -1 cycle).

Scenario 2: 4-Node Simple Cycle (A -> B -> C -> D -> A), severing (B, C)
  - Pre-Transformation SCCs:  [ [ 'A', 'B', 'C', 'D' ] ] (1 multi-node cycle)
  - Transformed Edges:        (A, B), (B, I<C>), (C, I<C>), (C, D), (D, A)
  - Post-Transformation SCCs: [ [ 'I<C>' ], [ 'B' ], [ 'A' ], [ 'D' ], [ 'C' ] ]
  - Verdict: CYCLE COMPLETELY ELIMINATED (Delta: -1 cycle).

Scenario 3: Two Cycles Sharing an Edge
  - Cycles: C1 = (A -> B -> C -> A), C2 = (A -> B -> D -> A). Shared Edge: (A, B).
  - Pre-Transformation SCCs:  [ [ 'A', 'B', 'C', 'D' ] ] (1 composite SCC containing 2 cycles)
  - Severing Shared Edge:     (A, B) replaced by (A, I<B>) and (B, I<B>)
  - Post-Transformation SCCs: [ [ 'I<B>' ], [ 'A' ], [ 'C' ], [ 'D' ], [ 'B' ] ]
  - Verdict: BOTH CYCLES SIMULTANEOUSLY ELIMINATED (Delta: -2 cycles).

Scenario 4: Two Cycles Sharing a Node
  - Cycles: C1 = (A -> B -> A), C2 = (B -> C -> B). Shared Node: B. Edge severed: (A, B).
  - Pre-Transformation SCCs:  [ [ 'A', 'B', 'C' ] ] (1 composite SCC containing 2 cycles)
  - Transformed Edges:        (A, I<B>), (B, I<B>), (B, A), (B, C), (C, B)
  - Post-Transformation SCCs: [ [ 'I<B>' ], [ 'A' ], [ 'B', 'C' ] ]
  - Verdict: PARTIALLY ELIMINATED. Cycle C1 eliminated; Cycle C2 (B <-> C) persists safely as an isolated SCC.

Scenario 5: Self-Loop (A -> A), severing (A, A)
  - Pre-Transformation SCCs:  [ [ 'A' ] ] (with self-loop edge)
  - Transformed Edges:        (A, I<A>)
  - Post-Transformation SCCs: [ [ 'I<A>' ], [ 'A' ] ]
  - Verdict: SELF-LOOP COMPLETELY ELIMINATED.

Scenario 6: Non-Cyclic Edge Selected in a DAG (A -> B -> C), severing (A, B)
  - Pre-Transformation SCCs:  [ [ 'C' ], [ 'B' ], [ 'A' ] ] (0 cycles)
  - Transformed Edges:        (A, I<B>), (B, I<B>), (B, C)
  - Post-Transformation SCCs: [ [ 'I<B>' ], [ 'A' ], [ 'C' ], [ 'B' ] ]
  - Verdict: VALID NO-OP ON CYCLES. Cycle count remains 0; no cycles introduced or eliminated.

Scenario 7: Multiple Candidate Edges in Cycle (A -> B -> C -> A), severing (B, C) instead of (A, B)
  - Pre-Transformation SCCs:  [ [ 'A', 'B', 'C' ] ]
  - Transformed Edges:        (A, B), (B, I<C>), (C, I<C>), (C, A)
  - Post-Transformation SCCs: [ [ 'I<C>' ], [ 'B' ], [ 'A' ], [ 'C' ] ]
  - Verdict: EQUIVALENT CYCLE ELIMINATION regardless of which candidate cycle edge is severed.
================================================================================
```

### 4.3 Part C: REMOVE_NODE Semantics & Dangling Edge Prevention
`CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` establishes that every edge $(u, v)$ must have both endpoints existing in `nodes[]`. Dangling edges violate payload integrity.

#### Seven Edge Topology Scenarios & Behavior Matrix

| Topology Scenario | Incident Edge Structure | Behavior with `cascadeEdges: false` | Behavior with `cascadeEdges: true` | Post-Action Graph Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **1. Isolated Node** | $fanIn = 0, fanOut = 0$ | Allowed. Node removed. | Allowed. Node removed. | Zero dangling edges. |
| **2. Outbound-Only** | $fanIn = 0, fanOut > 0$ | **Rejected** with validation error. | Allowed. Node & all outbound edges purged. | Zero dangling edges. |
| **3. Inbound-Only** | $fanIn > 0, fanOut = 0$ | **Rejected** with validation error. | Allowed. Node & all inbound edges purged. | Zero dangling edges. |
| **4. Inbound & Outbound** | $fanIn > 0, fanOut > 0$ | **Rejected** with validation error. | Allowed. Node & all incident edges purged. | Zero dangling edges. |
| **5. Self-Loops** | Edge $(N \to N)$ exists | **Rejected** with validation error. | Allowed. Self-loop purged atomically with node. | Zero dangling edges. |
| **6. Parallel / Multiple Edges** | Multiple edges between same pairs | Evaluated collectively. Rejected if any exist. | Allowed. All incident parallel edges purged. | Zero dangling edges. |
| **7. Invalid Pre-Existing Edges** | Dangling edge already exists | **Fails pre-validation** immediately. | **Fails pre-validation** immediately. | Protects graph invariant. |

#### Operational Rules for REMOVE_NODE
1. **Dynamic $fanIn$ and $fanOut$ Calculation**: $fanIn$ and $fanOut$ **MUST** be computed dynamically by inspecting the live `edges[]` array (`edge.target === nodeId` for $fanIn$, `edge.source === nodeId` for $fanOut$). The engine **MUST NOT** rely on static or cached `node.fanIn` metadata.
2. **Atomic Execution**: Node removal and incident edge purging execute within a single atomic in-memory operation. Partial deletion is strictly prohibited.
3. **Fail-Closed Pre-Validation Order**:
   - Check 1: Target node exists in `nodes[]`. If not, throw `NodeNotFoundError`.
   - Check 2: Verify existing graph integrity (`validatePayloadIntegrity`). If pre-existing dangling edges exist, halt.
   - Check 3: If `cascadeEdges === false` (default) and any incident edges exist ($fanIn + fanOut > 0$), throw `CascadeRequiredError`.
   - Check 4: Apply mutation atomically.

### 4.4 Part D: Simulation Metric Recomputation Boundary

All metrics in `SimulationDeltas` (`CONTRACT_07_REFACTORING_ACTION_DTOS.md`) are classified into three strict tiers:

```
+---------------------------------------------------------------------------------------------------+
| TIER 1: DETERMINISTICALLY DERIVABLE FROM CONTRACT-01 PAYLOAD                                     |
+---------------------------------------------------------------------------------------------------+
| Metric                        | Exact Mathematical Formula               | Sign Convention         |
|-------------------------------|------------------------------------------|-------------------------|
| couplingDelta                 | sum(coupling_after) - sum(coupling_before)| Negative = Improvement  |
| cyclesEliminated              | baseCycleCount - newCycleCount           | Positive = Improvement  |
| highRiskComponentsDelta       | count(highRisk_after) - count(highRisk_b)| Negative = Improvement  |
| unresolvedReferencesDelta     | count(unresolved_a) - count(unresolved_b)| Negative = Improvement  |
+---------------------------------------------------------------------------------------------------+
| TIER 2: REQUIRING APPROVED ANALYTICAL ADAPTER (explorer/src/lib/health.ts)                        |
+---------------------------------------------------------------------------------------------------+
| Metric                        | Calculation Source                       | Adapter Dependency      |
|-------------------------------|------------------------------------------|-------------------------|
| architectureHealthDelta       | newHealth.score - baseHealth.score       | calculateArchitecture   |
|                               |                                          | Health(payload)         |
+---------------------------------------------------------------------------------------------------+
| TIER 3: UNAVAILABLE / NOT REPORTABLE                                                              |
+---------------------------------------------------------------------------------------------------+
| Condition: If summary block or health adapter is unavailable in offline LWC runtime,            |
| architectureHealthDelta MUST serialize as null or undefined with a structured warning.            |
| Fabricating or guessing heuristic formulas is STRICTLY PROHIBITED.                                |
+---------------------------------------------------------------------------------------------------+
```

#### Detailed Definitions:
- **`couplingDelta`**: The difference between the total architectural coupling score across all active nodes after the refactoring action and the baseline total coupling score. For removed nodes, their coupling contribution is eliminated ($0$).
- **`cyclesEliminated`**: Calculated strictly using in-memory Tarjan SCC cycle set comparison ($\text{SCC}_{\text{base}} - \text{SCC}_{\text{new}}$). Cycles must not be estimated via simple edge counts.
- **`highRiskComponentsDelta`**: Net change in nodes classified as `risk === 'HIGH'`. If a high-risk node is removed or decoupled, delta is $-1$.
- **`unresolvedReferencesDelta`**: Net change in edges with `isUnresolved === true`.
- **`architectureHealthDelta`**: Calculated exclusively by invoking the approved heuristic adapter `calculateArchitectureHealth` from `explorer/src/lib/health.ts`. If this adapter is not ported to LWC, the value is returned as `null`.

---

## 5. Workstream 4 — DEC-04: Partial Dispatch Governance & Authorization Framework

### 5.1 The Governance Issue
Earlier Phase A3 charters noted ambiguity regarding partial dispatch: whether project-owner review of Wave 5–9 readiness implies blanket authorization to implement tasks.

**Authoritative Rule**: A readiness classification (`READY_FOR_IMPLEMENTATION_REVIEW`) **is NOT authorization to implement**. Implementation dispatch requires an explicit, separate, signed Partial Dispatch Order.

### 5.2 Mandatory 10-Point Partial Dispatch Order Schema
Any future authorization must instantiate the following 10-point schema:

```markdown
### PARTIAL DISPATCH AUTHORIZATION ORDER
1. **Order Identifier**: Unique serial ID (e.g. `PDO-2026-W5-BATCH1-01`).
2. **Explicit Task ID Allowlist**: Exact array of permitted task IDs (e.g. `[W5-1]`).
3. **Authorized File Paths**: Exact file paths from `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` permitted for mutation.
4. **Named Task Owner**: Named engineer or agent identifier assigned to each task.
5. **Frozen Contract Citations**: Explicit contract IDs and immutable versions governing the work (e.g. `CONTRACT-01 v1.0.0`, `CONTRACT-02 v1.0.0`).
6. **Verified Predecessors**: Formal confirmation that all predecessor tasks are merged and verified by clean test execution.
7. **Explicit Task Exclusions**: Exhaustive enumeration of all tasks remaining locked (e.g. `[W5-2..6, W6-1..4, W7-P1, W7-1..3, W8-1..3, W9-1..3, INT-1]`).
8. **Required Verification Evidence**: Mandate for task-specific test runner passage AND clean execution of all 9 baseline regression suites (187 test units).
9. **Temporal Boundaries & Expiry**: Specific execution start timestamp and expiration deadline.
10. **Revocation Authority & Suspension**: Explicit statement that Lead Architect or Product Owner may unilaterally revoke or suspend the order at any time.
```

### 5.3 Approval Authority Resolution
- **Joint Approval Requirement**: A Partial Dispatch Order requires joint written approval from both:
  1. **Lead Architect** (technical compliance and contract verification)
  2. **Product Owner** (delivery scope and governance ratification)
- If explicit authority is challenged or ambiguous, the order requires formal ratification by the **Project Owner**.
- **Closed Fallback**: In the absence of signed authorization satisfying all 10 criteria, implementation dispatch remains **STRICTLY NOT AUTHORIZED**.

---

## 6. Workstream 5 — Cross-Contract Reconciliation

The proposed amendments are reconciled against all affected contracts below:

| Target Contract | Section / Clause | Existing Language | Proposed Replacement Language | Source Evidence | Affected Consumers | Approval Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CONTRACT-04** | §4 Status invariant | Derived as `'COMPLETED'` if chunks exist, or `'UNKNOWN'`. | Derived as `'COMPLETED'` (>=1 chunk, payload available) or `'EMPTY'` (0 chunks). | Zero-schema metadata; `DAGraphController.cls` | `daAnalysisHistoryView` (`W7-3`), `daCompareView` (`W8-3`) | Lead Architect & Project Owner |
| **CONTRACT-04** | §5.2 SOQL Query | `WHERE DA_Project__c = :projectId OR ...` | Strict two-step lookup (Record ID first, unique Key fallback) to prevent cross-project run leakage. | Multi-org project isolation audit; `W7-P1` | `DAGraphController.cls`, `DAGraphControllerTest.cls` | Lead Architect & Project Owner |
| **CONTRACT-04** | §5.2, §6.2 Ordering | `ORDER BY CreatedDate DESC` | `ORDER BY CreatedDate DESC, Id DESC` | Tie-breaking pagination integrity | `DAGraphController.cls` | Lead Architect & Project Owner |
| **CONTRACT-05** | §3.1 Platform Limits | Combined Snapshot A + B: 10 MB raw JSON. | Maximum 10,485,760 UTF-16 code units (`String.length`). Single snapshot cap: 5,242,880 code units. | `daGraphPayloadLoader.js` (lines 5–6, 175–178) | `daDiffEngine.js` (`W8-2`), `daCompareView.js` (`W8-3`) | Lead Architect & Project Owner |
| **CONTRACT-07** | §4 `ExtractClass` | `movedMethodList: string[]` | `movedMethodList: string[]` classified as non-operational informational metadata. | `CONTRACT-01` component-level granularity | `daSimulationEngine.js` (`W9-1`), `daSimulationExport.js` (`W9-3`) | Lead Architect & Project Owner |
| **CONTRACT-07** | §4 `BreakCycle` | Generic substitution strategy | Directed edges strictly $A \to I\langle B \rangle$ and $B \to I\langle B \rangle$ (type: `implements`). Verified on 7 topological scenarios. | Dependency Inversion; Tarjan SCC proofs | `daSimulationEngine.js` (`W9-1`) | Lead Architect & Project Owner |
| **CONTRACT-07** | §4 `RemoveNode` | Unspecified dangling edge behavior | Atomically removes node and all incident edges when `cascadeEdges: true`; rejects when `cascadeEdges: false`. | `daGraphPayloadLoader.js` (lines 78–82); CONTRACT-01 | `daSimulationEngine.js` (`W9-1`) | Lead Architect & Project Owner |
| **CONTRACT-07** | §5 Metric Deltas | Unspecified calculation methods | Tier 1 (Payload derivable), Tier 2 (Adapter heuristic), Tier 3 (Null/unavailable). Exact formulas defined. | `explorer/src/lib/health.ts` | `daSimulationEngine.js` (`W9-1`), `daSimulationPanel.js` (`W9-2`) | Lead Architect & Project Owner |
| **CONTRACT-09** | §2 Invariants | Single Cytoscape Canvas Limit | Reaffirmed: maximum one concurrent Cytoscape canvas instance in DOM across all views. | Contract W0-C7; WebGL memory constraints | `daCompareView.js` (`W8-3`), `daGraphViewer.js` | Frozen Invariant (Preserved) |

---

## 7. Workstream 6 — Governance Decision Matrix (DEC-01 through DEC-04)

```
====================================================================================================
DECISION MATRIX: PHASE A3.2 DECISION CLOSURE
====================================================================================================
Decision ID: DEC-01
Question: How should DA_Analysis_Run__c status and query ordering be defined under zero-schema constraints?
Recommended Option: Adopt dual-state EMPTY / COMPLETED semantics with explicit payload availability
                    meaning; enforce two-step project resolution and compound ORDER BY CreatedDate DESC, Id DESC.
Technical Rationale: Zero-schema prevents lifecycle tracking. Status indicates chunk availability only.
                     Two-step resolution eliminates cross-project run leakage. Compound ordering eliminates tie-breaks.
Source Evidence: scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/
Remaining Uncertainty: None on platform constraints. Upstream ingestion pipeline error handling remains external.
Required Approvers: Lead Architect and Product Owner (Ratified by Project Owner).
Exact Approval Statement Required: "Approved: CONTRACT-04 is amended to adopt EMPTY/COMPLETED payload availability
                                   semantics, two-step project query resolution, and compound SOQL sorting."
Consequences of Rejection/Deferral: W7-P1, W7-3, and W8-3 remain blocked; query pagination remains non-deterministic.
Current Status: PENDING

----------------------------------------------------------------------------------------------------
Decision ID: DEC-02
Question: How should payload size and memory limits be specified across platform and browser boundaries?
Recommended Option: Formalize limits in JavaScript String.length UTF-16 code units (131,072 per chunk;
                    5,242,880 single snapshot; 10,485,760 dual snapshot); separate string size from object heap,
                    diff indexes, and canvas memory; eliminate unsupported memory multipliers.
Technical Rationale: V8 and LWC evaluate String.prototype.length (UTF-16 code units). Real browser DOM/WebGL
                     behavior cannot be established by offline Node benchmarks.
Source Evidence: scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js
Remaining Uncertainty: Real-world LWS Proxy memory overhead on low-end client hardware (defer to Phase B browser testing).
Required Approvers: Lead Architect and Product Owner (Ratified by Project Owner).
Exact Approval Statement Required: "Approved: CONTRACT-05 is amended to define payload boundaries in UTF-16 code units
                                   and formalize memory separation between string transport and canvas rendering."
Consequences of Rejection/Deferral: W8-2 and W8-3 remain blocked on contract approval.
Current Status: PENDING

----------------------------------------------------------------------------------------------------
Decision ID: DEC-03
Question: How should refactoring actions (EXTRACT_CLASS, BREAK_CYCLE, REMOVE_NODE) and simulation metrics be specified?
Recommended Option: Designate movedMethodList as informational non-operational metadata; enforce directed edges
                    B -> I<B> for BREAK_CYCLE across verified 7 topologies; enforce atomic incident edge purging
                    with cascadeEdges flag for REMOVE_NODE; classify metrics into 3 tiers (derivable, adapter, null).
Technical Rationale: CONTRACT-01 operates at component granularity. Tarjan SCC proves cycle elimination across
                     topological variations. Dangling edge invariant must be protected fail-closed.
Source Evidence: CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md; CONTRACT_07_REFACTORING_ACTION_DTOS.md; explorer/src/lib/health.ts
Remaining Uncertainty: Whether architectureHealth adapter should be ported to pure JS in W9-1 or deferred to coordinator.
Required Approvers: Lead Architect and Product Owner (Ratified by Project Owner).
Exact Approval Statement Required: "Approved: CONTRACT-07 is amended to define exact topological refactoring semantics,
                                   cascade validation rules, and three-tier metric computation boundaries."
Consequences of Rejection/Deferral: W9-1, W9-2, and W9-3 remain blocked on contract approval.
Current Status: PENDING

----------------------------------------------------------------------------------------------------
Decision ID: DEC-04
Question: What governance framework governs partial implementation dispatch across Waves 5 through 9?
Recommended Option: Adopt 10-point Partial Dispatch Authorization Order requiring explicit task allowlist, manifest paths,
                    named owners, frozen contract citations, verified predecessors, exclusions, baseline test evidence,
                    temporal limits, revocation rules, and joint Lead Architect / Product Owner signoff.
Technical Rationale: Prevents premature task dispatch, protects Workstream A serialization invariant, and ensures
                    no task outside an explicit allowlist can be launched.
Source Evidence: WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv; Phase A3 audit findings.
Remaining Uncertainty: Specific scheduling sequence of Batch 1 tasks once authorized.
Required Approvers: Lead Architect, Product Owner, and Project Owner.
Exact Approval Statement Required: "Approved: DEC-04 Partial Dispatch Governance Order template is adopted as the
                                   exclusive mechanism for implementation authorization. General approvals do not dispatch tasks."
Consequences of Rejection/Deferral: All 21 tasks remain permanently locked against implementation dispatch.
Current Status: PENDING
====================================================================================================
```

---

## 8. Workstream 7 — Task Readiness Preservation

The authoritative 21-task classification breakdown is preserved with complete arithmetic integrity:

$$\text{Ready for Review (8)} + \text{Blocked on Predecessors (9)} + \text{Blocked on Contract Approval (2)} + \text{Blocked on Unresolved Spec (1)} + \text{Coordinator Exclusive (1)} = \mathbf{21\text{ Tasks}}$$

### Authoritative Task-by-Task Status Table

| Task ID | Owning Workstream | Primary Classification | Direct Predecessors | Contract Dependencies | Review Eligible? | Authorized to Implement? |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **W5-1** | Workstream A | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-02 | **YES** | **NO** |
| **W5-2** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-1 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** |
| **W5-3** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-1, W5-2 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** |
| **W5-4** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-3 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** |
| **W5-5** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-4 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** |
| **W5-6** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-5 | CONTRACT-01, CONTRACT-06 | **NO** | **NO** |
| **W6-1** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-03 | **YES** | **NO** |
| **W6-2** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** |
| **W6-3** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** |
| **W6-4** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** |
| **W7-P1** | Workstream C | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | None | CONTRACT-01, CONTRACT-04 | **NO** | **NO** |
| **W7-1** | Workstream C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** |
| **W7-2** | Workstream C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** |
| **W7-3** | Workstream C | `BLOCKED_ON_PREDECESSORS` | W7-P1 | CONTRACT-04, CONTRACT-08 | **NO** | **NO** |
| **W8-1** | Workstream D | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-06 | **YES** | **NO** |
| **W8-2** | Workstream D | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-05 | **NO** | **NO** |
| **W8-3** | Workstream D | `BLOCKED_ON_PREDECESSORS` | W8-2, W7-P1 | CONTRACT-04, CONTRACT-05 | **NO** | **NO** |
| **W9-1** | Workstream E | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-07 | **NO** | **NO** |
| **W9-2** | Workstream E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** |
| **W9-3** | Workstream E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** |
| **INT-1** | Coordinator | `COORDINATOR_EXCLUSIVE` | Waves 5–9 | CONTRACT-08, CONTRACT-09 | **NO** | **NO** |

---

## 9. Final Governance Disposition

```
PHASE A3.2 PREPARED — AWAITING PROJECT OWNER REVIEW — ALL GOVERNANCE DECISIONS PENDING — IMPLEMENTATION DISPATCH NOT AUTHORIZED
```

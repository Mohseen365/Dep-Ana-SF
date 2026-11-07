# Phase A3.1 Technical Decision Proposal Corrections
**Document Identifier**: `docs/waves-5-9/phase-a3/PHASE_A3_TECHNICAL_DECISION_PROPOSAL_CORRECTIONS.md`
**Governance Scope**: Technical Corrections & Consistency Review of DEC-01 through DEC-04
**Implementation Authorization Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `85e8f4e9a92b1bba13f9a72f61bbd5909c43e96b` on branch `jules-3615347302555669507-d5c1e42b`

---

## 1. Executive Summary & Objective

This document provides a focused technical correction and independent consistency review of:
`docs/waves-5-9/phase-a3/PHASE_A3_FINAL_TECHNICAL_DECISION_PROPOSAL.md`

Following project-owner evaluation, seven specific technical findings (Findings 1 through 7) were identified where technical claims, DTO schemas, memory representations, mathematical graph transformations, or dispatch controls required rigorous grounding against repository evidence.

In accordance with project governance:
- **No modification of the original proposal file**: The original proposal is preserved as evaluated; this document provides the authoritative correction register and precise contract amendments.
- **No feature implementation or metadata modification occurred**: Zero source code or Salesforce metadata files were altered.
- **Implementation dispatch remains strictly not authorized**: Zero tasks are authorized to launch.

---

## 2. FINDING 1 — DEC-01 Status Semantics: Payload Availability vs Execution Completion

### 2.1 The Issue
The proposal originally defined:
- `totalChunks === 0` $\to$ `'EMPTY'`
- `totalChunks > 0` $\to$ `'COMPLETED'`

However, having $\ge 1$ chunks does **not** establish that graph generation completed successfully, nor does zero chunks prove error-free emptiness.

### 2.2 Source Evidence
- **`DA_Analysis_Run__c` Object Metadata**: Located in `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/`. Contains standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and custom field `DA_Project__c`.
- **Finding**: There is **no** `Status__c`, `Error_Message__c`, `Total_Chunks__c`, or heartbeat timestamp field.
- **`DAGraphController.cls`**: Does not contain `getAnalysisRuns` yet; zero-schema query relies strictly on `AggregateResult` count on `DA_Graph_Chunk__c`.

### 2.3 Evaluation of Status Semantics
1. **`EMPTY`**: Zero chunks found at query time. Does not prove the run finished cleanly; it could be an aborted run, an in-flight run, or an FLS restriction under `WITH USER_MODE`.
2. **`AVAILABLE`**: One or more chunks found at query time. Accurately describes that graph payload chunks exist and are retrievable.
3. **`COMPLETED`**: Implies full lifecycle completion, which is untruthful under zero-schema metadata because partial or truncated chunk uploads cannot be detected without a manifest or status field.
4. **Legacy Compatibility**: Downstream consumers (`daAnalysisHistoryView` in W7-3 and `daCompareView` in W8-3) expect `'COMPLETED'` for valid runs and `'EMPTY'` for un-renderable runs.

### 2.4 Recommended Amendment
To reconcile semantic truth with legacy consumer compatibility without inventing unapproved schema fields:
- Status `'COMPLETED'` is retained for legacy compatibility, but CONTRACT-04 must formally define it as **`AVAILABLE` / Payload Retrievable**:
  > *"When `totalChunks > 0`, status returns `'COMPLETED'`, formally defined as payload availability at query time. When `totalChunks === 0`, status returns `'EMPTY'`, indicating no graph chunks were found. Neither value certifies lifecycle completion."*
- Downstream views (`daAnalysisHistoryView`, `daCompareView`) must rely on `status === 'EMPTY'` to disable comparison and load actions.

---

## 3. FINDING 2 — DEC-02 Measurement Units and Memory Evidence

### 3.1 Verification of Loader Constants and Validation
Inspection of `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` (lines 5–6, 175–178):
- `export const MAX_CHUNK_SIZE = 131072;` (Salesforce LongTextArea character limit).
- `export const MAX_TOTAL_PAYLOAD_SIZE = 10485760;` (10 MB character limit).
- `validatePayloadSize(rawJson)` evaluates: `rawJson.length <= maxTotalSize`.
- **Source-Confirmed Fact**: The validation strictly evaluates **JavaScript string character length (`String.prototype.length` counting 16-bit UTF-16 code units)**. It does **not** evaluate encoded UTF-8 byte length.
- In ASCII, 1 character = 1 byte. In supplementary Unicode, surrogate pairs count as 2 characters and 4 UTF-8 bytes.

### 3.2 Classification of Memory Estimates as Hypotheses
The earlier proposal asserted exact memory consumption numbers ($4\times$ to $8\times$ object expansion, 30–50 MB Cytoscape memory). These are **unverified hypotheses**:
- In V8, JavaScript object memory depends heavily on hidden classes, heap fragmentation, and garbage collection timing.
- Canvas memory depends on device pixel ratio and WebGL backing textures.
- Therefore, claims of guaranteed browser safety based on raw payload string lengths are ungrounded.

### 3.3 Separation of Offline Benchmarks from Browser Validation
1. **Tier A: Bounded Offline Node.js Allocation Benchmark Plan**:
   - Synthesize payloads of 1,000 to 30,000 nodes (up to 5,242,880 string characters).
   - Execute `daDiffEngine.computeDiff` in Node.js while measuring `process.memoryUsage().heapUsed` before, during, and after computation.
   - Confirm that garbage collection recovers transient index Maps without memory leaks.
2. **Tier B: Future Real-Browser and Salesforce Lightning Experience / LWS Validation**:
   - Postponed until formal project-owner release. Live browser DOM performance, canvas context sharing, and mobile memory limits cannot be tested offline without browser runtimes.

---

## 4. FINDING 3 — DEC-03 EXTRACT_CLASS DTO Consistency (`movedMethodList`)

### 4.1 The Issue
`CONTRACT_07_REFACTORING_ACTION_DTOS.md` includes `movedMethodList: string[]` in `ExtractClassAction`. However, `CONTRACT-01` canonical graph payloads have component-level granularity (`Class.AccountService`) and do **not** model methods or method-level call edges.

### 4.2 Evaluation of Options
1. **Remove `movedMethodList`**: Makes the DTO purely component-level, but discards human architecture documentation.
2. **Retain strictly as Non-Operational Informational Metadata (Recommended)**:
   - `movedMethodList` is preserved for human review checklists and handoff export (`daRefactorHandoffModal` / Task `W9-3`).
   - The contract explicitly defines: `movedMethodList` is **non-operational**; `daSimulationEngine` does not inspect method strings to retarget graph edges.
3. **Defer Action**: Unnecessary, as the component-level split is mathematically well-defined.

### 4.3 Proposed Component-Level Transformation
- Input: `sourceNodeId: "Class.AccountService"`, `newClassName: "Class.AccountTaxCalculator"`.
- Transformation:
  - Injects new node `Class.AccountTaxCalculator` into `nodes[]`.
  - Injects directed dependency edge `Class.AccountService -> Class.AccountTaxCalculator` (type: `references`) into `edges[]`.
  - All existing inbound edges to `Class.AccountService` remain attached to `Class.AccountService`.

---

## 5. FINDING 4 — DEC-03 BREAK_CYCLE Mathematical Validity (Tarjan SCC Proof)

### 5.1 The Investigation
The proposal specified that breaking cyclic directed edge $A \to B$ creates interface $I\langle B \rangle$ and replaces the edge with:
$$A \longrightarrow I\langle B \rangle \quad \text{and} \quad B \longrightarrow I\langle B \rangle$$
Where $B$ implements $I\langle B \rangle$.

### 5.2 Mathematical Proof on Concrete Graph $A \to B \to C \to A$
Consider the 3-node cyclic graph:
- Nodes: $\{A, B, C\}$
- Edges: $(A, B), (B, C), (C, A)$
- **Pre-Transformation Tarjan SCC**:
  - Traversal discovers strongly connected component: **$\{A, B, C\}$** (Cycle detected).

Now apply the proposed `EXTRACT_INTERFACE` substitution:
- Remove direct edge $(A, B)$.
- Add node $I\langle B \rangle$.
- Add edges $(A, I\langle B \rangle)$ and $(B, I\langle B \rangle)$.
- Resulting Edge Set: $(A, I\langle B \rangle), (B, I\langle B \rangle), (B, C), (C, A)$.

**Post-Transformation Tarjan SCC Calculation**:
- From $B$: Path traverses $B \to C \to A \to I\langle B \rangle$.
- Node $I\langle B \rangle$ has out-degree 0 (no outgoing edges).
- Node $A$ has no path back to $B$ (edge $(A, B)$ was severed).
- Tarjan SCC result: **$\{I\langle B \rangle\}, \{A\}, \{C\}, \{B\}$** (Four singletons!).
- **Conclusion**: The original cycle is **eliminated**.

### 5.3 Critical Edge Direction Check
- In UML and dependency inversion, $B$ implements $I\langle B \rangle$, so $B$ references/depends on $I\langle B \rangle$ ($B \to I\langle B \rangle$).
- If an author incorrectly oriented the edge as $I\langle B \rangle \to B$ (interface points to implementation), the cycle would persist: $A \to I\langle B \rangle \to B \to C \to A$, yielding SCC $\{A, I\langle B \rangle, B, C\}$.
- **Mandatory Contract Rule**: The replacement edge must be strictly directed **$B \to I\langle B \rangle$** (type: `implements`).

---

## 6. FINDING 5 — DEC-03 REMOVE_NODE Cascade & Dangling Edges

### 6.1 The Dangling Edge Invariant
In `daGraphPayloadLoader.js` (lines 78–82) and CONTRACT-01:
```javascript
if (!nodeIds.has(source) || !nodeIds.has(target)) {
    return false; // Edge references non-existent node
}
```
Allowing a node to be deleted while leaving attached edges in `edges[]` causes `validatePayloadIntegrity` to fail closed.

### 6.2 Seven Topological Scenarios & Exact Behavior

| Scenario | Incident Edge Topology | Behavior without `cascadeEdges` | Behavior with `cascadeEdges: true` | Resulting Graph State |
| :--- | :--- | :--- | :--- | :--- |
| **1. Isolated Node** | $fanIn = 0, fanOut = 0$ | Allowed. Node removed. | Allowed. Node removed. | Zero dangling edges. |
| **2. Outbound Only** | $fanIn = 0, fanOut > 0$ | Allowed. Node & outbound edges removed. | Allowed. Node & outbound edges removed. | Zero dangling edges. |
| **3. Inbound Only** | $fanIn > 0, fanOut = 0$ | **Rejected** with error. | Allowed. Node & inbound edges removed. | Zero dangling edges. |
| **4. Inbound & Outbound** | $fanIn > 0, fanOut > 0$ | **Rejected** with error. | Allowed. Node & all incident edges removed. | Zero dangling edges. |
| **5. Self-Loops** | Edge $(N \to N)$ exists | Treated as incident edge. | Self-loop purged atomically with node. | Zero dangling edges. |
| **6. Multiple Edges** | Multi-edges between same pairs | Evaluated collectively. | All instances incident to $N$ purged. | Zero dangling edges. |
| **7. Invalid Edges** | Dangling edge exists before action | Pre-validation failure. | Pre-validation halts before mutation. | Protects invariant. |

### 6.3 Calculations and Rules
- **$fanIn$ Calculation**: Must be computed dynamically by counting matching edges in `payload.edges` (`edge.target === nodeId`), **never** from stale `node.fanIn` metadata.
- **Atomicity**: The node and all incident edges are removed in a single atomic transaction.
- **No `force` Flag**: The parameter is named strictly **`cascadeEdges: boolean`**. The ungrounded `force` parameter is removed.

---

## 7. FINDING 6 — Metric Recomputation Boundary

Metrics in `SimulationDeltas` must be strictly classified into three tiers to avoid fabricating analytical formulas:

1. **Tier 1: Deterministically Calculable from CONTRACT-01 Payload**:
   - `couplingDelta`: Calculated by summing degree changes across modified/removed nodes ($fanIn + fanOut$).
   - `cyclesEliminated`: Calculated via in-memory Tarjan SCC algorithm (`baseCycleCount - newCycleCount`).
   - `highRiskComponentsDelta`: Net change in nodes with `risk === 'HIGH'`.
   - `unresolvedReferencesDelta`: Net change in edges with `isUnresolved === true`.
2. **Tier 2: Requiring Existing Analytical Adapter**:
   - `architectureHealthScore`: Heuristic calculated strictly by invoking `calculateArchitectureHealth(payload)` from `explorer/src/lib/health.ts`.
3. **Tier 3: Unavailable / Not Reportable**:
   - If payload lacks required summary inputs or health calculations cannot be evaluated, `architectureHealthDelta` returns `null` or `undefined` with a structured warning. The engine **MUST NOT** invent heuristic scores.

---

## 8. FINDING 7 — DEC-04 Partial Dispatch Controls

To prevent a general Wave 5–9 decision from prematurely launching unready tasks, a Partial Dispatch Order must satisfy eight mandatory criteria:
1. **Explicit Task Allowlist**: Must name exact task IDs (e.g. `[W5-1, W6-1, W7-1, W8-1]`).
2. **Scope Boundary**: Must define permitted files from `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`.
3. **Named Task Owner**: Must specify the assigned engineer / workstream lead.
4. **Frozen Contract References**: Must cite frozen contract IDs and versions.
5. **Verified Predecessors**: All direct predecessors must be completed and verified by baseline regression tests.
6. **Explicit Exclusion List**: Must explicitly enumerate all tasks remaining locked (e.g. `W5-2..6`, `W7-P1`, etc.).
7. **Verification Requirements**: Must mandate clean execution of task runner and all 9 baseline regression runners.
8. **Revocation Authority**: Must specify that either the Lead Architect or Product Owner can immediately suspend the order.

### Task Readiness Impact Preservation
The 21-task classification breakdown is strictly preserved:
- **8 Tasks**: `READY_FOR_IMPLEMENTATION_REVIEW`
- **9 Tasks**: `BLOCKED_ON_PREDECESSORS`
- **2 Tasks**: `BLOCKED_ON_CONTRACT_APPROVAL`
- **1 Task**: `BLOCKED_ON_UNRESOLVED_SPECIFICATION`
- **1 Task**: `COORDINATOR_EXCLUSIVE`
- **0 Tasks**: `AUTHORIZED_FOR_IMPLEMENTATION`

---

## 9. Final Acceptance Statement

```
TECHNICAL CORRECTIONS PREPARED — AWAITING PROJECT OWNER REVIEW — IMPLEMENTATION DISPATCH NOT AUTHORIZED
```

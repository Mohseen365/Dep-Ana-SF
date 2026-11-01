# Wave 0.2: W9 Refactoring Engine Dependency Correction & Layout Separation

## 1. Executive Summary & Diagnostic Findings

In Wave 0.1, Task `W9-1` (Refactoring Engine) was classified as `CONDITIONALLY_BLOCKED` under the rationale that it was blocked on a Dagre layout packaging strategy in LWC (`WAVE_0_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`).

A deep architectural inspection of the repository source truth—specifically `explorer/src/lib/refactoring-simulation.ts`, `explorer/src/lib/refactor-handoff.ts`, and `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`—demonstrates that this classification was **technically incorrect and overly conservative**.

### Source Evidence Findings
1. **Refactoring Simulation is Purely Topological and Mathematical:**
   In `explorer/src/lib/refactoring-simulation.ts`:
   - `applySimulationOperations(graphData, operations)` operates purely on arrays of `ExplorerNode` and `ExplorerEdge` (`nodes = [...graphData.nodes]`, `edges = [...graphData.edges]`).
   - The supported mutation operations are `add-node`, `remove-node`, `add-edge`, `remove-edge`, and `modify-node`.
   - Node and edge mutations update connection lists, compute fan-in/fan-out, calculate coupling deltas, and detect circular dependencies via depth-first search / Tarjan's cycle detection (`runArchitectureRules(currentGraph)`).
   - **Zero layout coordinates or layout algorithms are invoked or required** during simulation, step impact computation (`computeStepImpact`), finding delta calculations (`computeFindingDelta`), or proposal generation (`createProposalFromFinding`).
2. **Dagre is Strictly a Layout Calculation Utility:**
   - Standalone `dagre` (or Cytoscape's Dagre extension) is only utilized when visual positions (`x, y`) of nodes must be rendered hierarchically on a 2D canvas.
   - For visual simulation preview in LWC, Cytoscape is already loaded as a static resource (`scratch/salesforce-poc/force-app/main/default/staticresources/cytoscape.js`), and `daLayoutEngine.js` already provides production-ready deterministic layouts:
     - `computeArchitectureLayout`: Pure JS layered hierarchical layout.
     - `computeOrbitLayout`: Concentric radial layout.
     - `computeConstellationLayout`: Multi-sun polar layout.
     - `computeSankeyLayout`: Dependency river layout.
3. **Refactoring Handoff is Layout-Independent:**
   - In `explorer/src/lib/refactor-handoff.ts`, `buildHandoffPayload` and proposal export formatting (Markdown, Jira-compatible text, JSON export) operate purely on node attributes (`id`, `displayName`, `type`, `file`) and step operational records.

---

## 2. Decoupled Capability Breakdown

To ensure unblocked execution while maintaining strict architectural boundaries, Wave 0.2 decomposes Wave 9 work into explicit capabilities:

### W9-1A: Pure Refactoring Simulation Engine
- **Scope:** Pure in-memory graph mutation algorithms, metric recalculation, cycle analysis, and proposal state management.
- **Implementation Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/` (pure ES module `daRefactoringEngine.js`).
- **Dependencies:** None. Operates solely on deep-cloned canonical graph envelopes conforming to Contract `W0-C1` and Contract `W0-C8`.
- **Dagre Requirement:** **NONE.**
- **Launch Classification:** `READY_TO_LAUNCH` (Immediately Launchable).

### W9-1B: Layout-Dependent Visualization Support (Optional / Deferred)
- **Scope:** Specialized hierarchical positioning specifically requiring Dagre's simplex rank assignment algorithm.
- **Dependencies:** Dagre packaging decision / approval for external library bundling.
- **Launch Classification:** `DEFERRED / OPTIONAL`. Standalone Dagre bundling is deferred; simulation views use existing layout engines.

### W9-2: Simulation View Component
- **Scope:** Interactive UI component displaying baseline vs. simulated graph topology, operation history timeline, and impact scorecard.
- **Implementation Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/`.
- **Dependencies:** Task `W9-1A`, Contract `W0-C4` (View Registration), Contract `W0-C8` (Simulation Contract), Contract `W0-C9` (Loading/Error States).
- **Visualization Strategy:** Utilizes existing `daLayoutEngine.js` (`computeArchitectureLayout`) or native Cytoscape layouts (`breadthfirst`, `cose`, `grid`, `preset`).
- **Dagre Requirement:** **NONE.** (Supported fallback: `daLayoutEngine` hierarchical layout).
- **Launch Classification:** `IMPLEMENTATION_DEPENDENT` (Prerequisite: `W9-1A` completed).

### W9-3: Refactoring Handoff & Proposal Export Modal
- **Scope:** Modal dialog providing structured export of refactoring proposals into Markdown, Jira-compatible text, and JSON schema formats.
- **Implementation Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/`.
- **Dependencies:** Task `W9-1A`, Contract `W0-C8`.
- **Dagre Requirement:** **NONE.** Operates purely on text formatting and JSON serialization.
- **Launch Classification:** `IMPLEMENTATION_DEPENDENT` (Prerequisite: `W9-1A` completed).

---

## 3. Mandatory Invariants & State Protection

Every implementation of Wave 9 components must rigorously enforce the following invariants:

1. **Immutable Inbound Graph Payload:**
   Under no circumstances may `daRefactoringEngine` or `daRefactoringView` mutate the inbound `@api graphPayload`. The engine must perform an explicit deep clone (`JSON.parse(JSON.stringify(graphPayload))` or structured clone) before applying operations.
2. **Zero Apex DML / Zero Persistence Side Effects:**
   Refactoring simulation is an exploratory, in-memory capability. It does not perform Apex DML, modify Salesforce records, or alter project source code.
3. **Deterministic Mutation Behavior:**
   Applying the same array of `RefactoringOperation` objects to the same baseline graph must produce bitwise identical graph summaries, node metrics, and cycle counts.
4. **Operation Type Fidelity:**
   The engine must implement and unit-test all 5 canonical operation types:
   - `add-node`: Inserts node if ID is unique; rejects duplicate node IDs.
   - `remove-node`: Removes target node and cascades removal to all incident edges (inflow and outflow).
   - `add-edge`: Inserts edge between existing nodes; validates endpoint existence.
   - `remove-edge`: Removes edge by unique edge ID.
   - `modify-node`: Selectively updates mutable node properties (risk, type, layer) while preserving identity.
5. **Selection Invariant Preservation (SELECTION ≠ NAVIGATION):**
   Selecting a simulated node or inspecting a step impact card must not trigger view navigation or reset active view mode.

---

## 4. Authoritative Decision & Classification Summary

| Workstream Item | Prior Status (Wave 0.1) | Corrected Status (Wave 0.2) | Layout Engine / Fallback | Blocking Condition |
| :--- | :--- | :--- | :--- | :--- |
| **W9-1A: Refactoring Engine** | CONDITIONALLY_BLOCKED | **READY_TO_LAUNCH** | Pure in-memory graph math | None |
| **W9-1B: Dagre Layout Port** | CONDITIONALLY_BLOCKED | **DEFERRED / OPTIONAL** | External Dagre layout | PO approval for static resource |
| **W9-2: Simulation View** | DEPENDENT | **IMPLEMENTATION_DEPENDENT** | `daLayoutEngine` / Cytoscape native | Awaits W9-1A completion |
| **W9-3: Handoff Export Modal** | DEPENDENT | **IMPLEMENTATION_DEPENDENT** | Pure text/JSON formatting | Awaits W9-1A completion |

**Authoritative Conclusion:**
The blanket blocker on Wave 9 is lifted. Task `W9-1A` is cleared for immediate implementation upon authorized dispatch.

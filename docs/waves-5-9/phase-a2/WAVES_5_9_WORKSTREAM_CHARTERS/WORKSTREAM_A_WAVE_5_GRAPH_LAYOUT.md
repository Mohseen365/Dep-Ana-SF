# Workstream A Charter: Wave 5 — Deep Graph & Layout

## 1. Executive Summary & Purpose
Workstream A governs the deep graph visualization and layout architecture for Dependency Analyzer Wave 5. It encompasses algorithmic graph transformations, layout execution engines, focal traversal isolation, multi-level cluster collapsing, and high-density node rendering optimizations within the existing `daGraphViewer` and `daLayoutEngine` Lightning Web Components.

## 2. Owning Role & Accountability
- **Accountable Role**: Workstream A Lead (`W5 Owner`)
- **Integration Authority**: Integration Coordinator / Integration Owner
- **Execution Mandate**: Strict serial implementation across all 6 assigned tasks.

## 3. Strict Serial Execution & Collision Prevention Rules
Workstream A tasks exhibit high intra-workstream file collision across three foundational components:
1. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Shared by all 6 tasks: `W5-1`, `W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`)
2. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html` (Shared by 4 tasks: `W5-1`, `W5-4`, `W5-5`, `W5-6`)
3. `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` (Shared by 2 tasks: `W5-2`, `W5-3`)

### Mandatory Execution Sequence
```
[W5-1: Shell Layout Switcher] (READY_TO_LAUNCH)
       ↓ (Must pass test, review, and integration)
[W5-2: Orbit Layout Activation] (IMPLEMENTATION_DEPENDENT on W5-1)
       ↓ (Must pass test, review, and integration)
[W5-3: Constellation & Sankey Extensions] (IMPLEMENTATION_DEPENDENT on W5-1, W5-2)
       ↓ (Must pass test, review, and integration)
[W5-4: Directional Traversal Focus] (IMPLEMENTATION_DEPENDENT on W5-3)
       ↓ (Must pass test, review, and integration)
[W5-5: Cluster Collapse / Expand] (IMPLEMENTATION_DEPENDENT on W5-4)
       ↓ (Must pass test, review, and integration)
[W5-6: Canvas Virtualization & High-Density Optimization] (IMPLEMENTATION_DEPENDENT on W5-5)
```
**Operating Constraint**: Only `W5-1` is eligible for initial launch upon authorization. Concurrent dispatch of any two Workstream A tasks is strictly prohibited. Each task must deliver a clean patch, execute task-specific tests alongside all 9 frozen baseline suites, and be accepted by the Integration Coordinator before the subsequent task begins.

---

## 4. Task Catalog & Scope

### Task W5-1: Shell Layout Switcher (Grid / Circle / Breadthfirst)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Single task dispatchable in Wave 5)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- **Scope & Deliverables**: Expose Cytoscape layout switching between standard built-in topologies (grid, circle, breadthfirst, dagre); preserve `SELECTION != NAVIGATION` invariant; zero regression on active filter criteria.

### Task W5-2: Orbit Layout Activation & Concentric Engine
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W5-1)
- **Predecessor Dependencies**: `W5-1`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/tests/run-w5-2-tests.cjs`
- **Scope & Deliverables**: Integrate existing ported `computeOrbitLayout` concentric engine into `daGraphViewer`; ingest orbital rings configuration; calculate radial coordinates with zero regression on baseline.

### Task W5-3: Constellation & Sankey Layout Extensions
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W5-1, W5-2)
- **Predecessor Dependencies**: `W5-1, W5-2`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/tests/run-w5-3-tests.cjs`
- **Scope & Deliverables**: Connect `computeConstellationLayout` (focal node radial projection) and `computeSankeyLayout` (multi-tier architectural layer flow); ensure zero baseline regression.

### Task W5-4: Directional Traversal Focus (Upstream / Downstream / Both)
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W5-3)
- **Predecessor Dependencies**: `W5-3`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-4-tests.cjs`
- **Scope & Deliverables**: Implement directional neighborhood breadth-first traversal (upstream dependencies, downstream dependents, or bidirectional); dim out-of-neighborhood nodes/edges without mutating underlying graph payload; preserve `SELECTION != NAVIGATION`.

### Task W5-5: Cluster Collapse / Expand (Packaging / Layer / Namespace)
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W5-4)
- **Predecessor Dependencies**: `W5-4`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-5-tests.cjs`
- **Scope & Deliverables**: Compound node clustering by namespace/package/layer; compound parent node collapse and expand; synthesize aggregate boundary edges; maintain persistent collapse state.

### Task W5-6: Canvas Virtualization & High-Density Optimization
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W5-5)
- **Predecessor Dependencies**: `W5-5`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-6-tests.cjs`
- **Scope & Deliverables**: Viewport culling and level-of-detail (LOD) degradation for high-density graph canvas (>1,000 nodes); label suppression at low zoom levels; debounced rendering cycles.

---

## 5. Coordinator Protected Boundaries
Workstream A is strictly prohibited from touching:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Integration Coordinator Exclusive)
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-wave5-tests.cjs` (Aggregate Wave 5 Runner, owned by Coordinator)
- Any of the 9 baseline immutable test runners (`run-poc-tests.cjs`, `run-wave4-integration-suite.cjs`, etc.)
- Any component belonging to Workstreams B, C, D, or E.

## 6. Handoff & Acceptance Criteria
- Every task delivers: `task-<TASK_ID>.patch`, changed file manifest, test execution logs showing 100% pass on task-specific runner (`run-w5-<n>-tests.cjs`), and 100% pass across all 9 immutable baseline suites (187 test cases).
- Zero regression on existing graph viewer functionalities: preset filter integration, selection events, Cytoscape canvas initialization.

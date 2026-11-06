# Workstream D Charter: Wave 8 — Deep Investigation & Comparison

## 1. Executive Summary & Purpose
Workstream D governs deep architectural node inspection and temporal snapshot comparison for Dependency Analyzer Wave 8. It delivers the slide-out Investigation Drawer for selected entity deep introspection, the pure JavaScript Diff Engine calculation utility, and the Compare View visualizer for side-by-side or overlaid dual-snapshot diffing.

## 2. Owning Role & Accountability
- **Accountable Role**: Workstream D Lead (`W8 Owner`)
- **Integration Authority**: Integration Coordinator / Integration Owner
- **Execution Mandate**: Phased parallel launch (`W8-1` and `W8-2` parallel; `W8-3` dependent on `W8-2` and cross-wave `W7-P1`).

## 3. Dependency Structure & Collision Prevention
- `W8-1` (Investigation Drawer) and `W8-2` (Diff Engine) have zero shared file collisions and zero mutual dependencies; both are eligible for parallel dispatch.
- `W8-3` (Compare View) depends on `W8-2` (Diff Engine) to compute payload deltas, and cross-workstream task `W7-P1` (Analysis Run Query Controller) to supply historical snapshot records.
- **Shared Path Collisions**: ZERO (`NONE`) among all Workstream D tasks. Each task owns distinct files.

### Execution Flow
```
[W8-1: Investigation Drawer] (READY_TO_LAUNCH)
[W8-2: Diff Engine Utility]  (READY_TO_LAUNCH) ──┐
                                                 │
[Cross-Wave W7-P1: Apex History Controller]  ────┼───► [W8-3: Compare View Component]
                                                 │     (IMPLEMENTATION_DEPENDENT on W8-2 & W7-P1)
```

---

## 4. Task Catalog & Scope

### Task W8-1: Investigation Drawer Component
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w8-1-tests.cjs`
- **Scope & Deliverables**: Slide-out inspection drawer reacting to node selection events; displays inbound/outbound dependencies, cycle participation, metrics, and metadata annotations; collapsible panel with zero disruption to main viewport canvas.

### Task W8-2: Diff Engine Utility Module
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/daDiffEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/daDiffEngine.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w8-2-tests.cjs`
- **Scope & Deliverables**: Pure algorithmic JavaScript module comparing Snapshot A and Snapshot B payloads; computes added, removed, and modified nodes and edges; calculates architectural drift metrics (coupling shifts, new cycles); pure functional implementation with zero UI dependencies.

### Task W8-3: Compare View Component (Dual-Snapshot Visualizer)
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W8-2 and cross-wave W7-P1)
- **Predecessor Dependencies**: `W8-2, W7-P1`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w8-3-tests.cjs`
- **Scope & Deliverables**: Visual comparison interface rendering snapshot diffs; colour-coded diff styling (green for added, red for removed, yellow for modified); dual run selectors; chunk ingestion limits (10MB/20MB); project-switch cancellation; Cytoscape diff rendering canvas.

---

## 5. Coordinator Protected Boundaries
Workstream D is strictly prohibited from touching:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Integration Coordinator Exclusive)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-wave8-tests.cjs` (Aggregate Wave 8 Runner, owned by Coordinator)
- Existing Wave 4 components (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daPresetManager`)
- Any component belonging to Workstreams A, B, C, or E.

## 6. Handoff & Acceptance Criteria
- Every task delivers: `task-<TASK_ID>.patch`, changed file manifest, and test execution logs demonstrating 100% pass on `run-w8-<n>-tests.cjs` and 100% pass across all 9 immutable baseline test suites.
- Diff engine must handle identical graphs (empty diff), completely disjoint graphs, and partial overlaps deterministically.
- View mounting in `daAppShell` is deferred to `INT-1`.

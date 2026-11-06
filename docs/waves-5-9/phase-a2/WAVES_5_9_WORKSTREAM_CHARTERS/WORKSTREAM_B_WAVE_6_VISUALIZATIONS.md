# Workstream B Charter: Wave 6 — Analytical Views & Visualizations

## 1. Executive Summary & Purpose
Workstream B governs the implementation of the four dedicated analytical visualization components for Dependency Analyzer Wave 6: Radar Panel, Treemap View, Subway Architecture Flow Map, and Anti-Pattern Hotspots View. Each visualization operates as an independent Lightning Web Component mounted into the application workspace.

## 2. Owning Role & Accountability
- **Accountable Role**: Workstream B Lead (`W6 Owner`)
- **Integration Authority**: Integration Coordinator / Integration Owner
- **Execution Mandate**: Concurrent independent implementation across all 4 assigned tasks.

## 3. Parallel Execution & Zero-Collision Assurance
Phase A1 analysis and the authoritative file ownership manifest confirm:
- **Shared Path Collisions**: ZERO (`NONE`).
- **Mutual Dependencies**: ZERO.
- All four tasks create completely isolated component bundles under `scratch/salesforce-poc/force-app/main/default/lwc/` and dedicated offline test harnesses under `scratch/salesforce-poc/tests/`.

Therefore, all four tasks (`W6-1`, `W6-2`, `W6-3`, `W6-4`) are initially eligible for parallel dispatch once Wave 6 implementation is authorized.

---

## 4. Task Catalog & Scope

### Task W6-1: Radar View Component (Architecture Metrics)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w6-1-tests.cjs`
- **Scope & Deliverables**: Multi-axis SVG radar chart mapping architectural metrics across 9 canonical dimensions (coupling, instability, abstraction, distance, cycle count, unassigned ratio, test coverage density, complexity, component density); reactive updates on filter change.
- **Architectural Boundary**: Pure radar analysis dimension adapter; strictly decoupled from Wave 5 Orbit radial layout.

### Task W6-2: Treemap View Component (Hierarchical Namespace Packaging)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w6-2-tests.cjs`
- **Scope & Deliverables**: Nested SVG/HTML treemap partitioned by package, namespace, and architectural layer; area proportional to node weight/count; interactive zoom/drilldown into namespaces; node selection event dispatch.

### Task W6-3: Subway View Component (Architecture Metro Map / Layer Flow)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w6-3-tests.cjs`
- **Scope & Deliverables**: Metro-line schematic visualizer organizing nodes into horizontal/vertical layer transit tracks; transfer stations for cross-layer coupling; directional routing indicators.

### Task W6-4: Hotspots View Component (Anti-Pattern Heatmap & Risk Scoring)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w6-4-tests.cjs`
- **Scope & Deliverables**: Heatmap matrix highlighting high-risk technical debt (god components, cyclic choke points, unassigned nodes, missing test coverage); severity-ranked tabular breakdown with click-to-select.

---

## 5. Coordinator Protected Boundaries
Workstream B is strictly prohibited from touching:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Mounting views into shell is coordinator-exclusive under `INT-1`)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-wave6-tests.cjs` (Aggregate Wave 6 Runner, owned by Coordinator)
- Any existing Wave 4 components (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daPresetManager`)
- Any component belonging to Workstreams A, C, D, or E.

## 6. Handoff & Acceptance Criteria
- Every task delivers: `task-<TASK_ID>.patch`, changed file manifest, and test execution logs demonstrating 100% pass on `run-w6-<n>-tests.cjs` and 100% pass across all 9 immutable baseline test suites.
- Visual components must handle empty graph payloads, disconnected nodes, and dynamic filter updates cleanly without runtime exceptions.
- View mounting in `daAppShell` is deferred to `INT-1`.

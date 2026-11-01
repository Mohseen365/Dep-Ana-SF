# Wave 0.4.2: Workstream E — Component API and Traceability Reconciliation

## 1. Executive Summary & Context

In earlier planning documents, Contract `W0-C4` was historically described as if all child components must adhere to a monolithic `@api` property signature (`projectId, graphPayload, filterCriteria, selectedNodeId, readOnly`).
However, child components across Waves 5 through 9 serve distinct architectural roles:
- Analytical visualizers (`daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`)
- Governance scorecards and history viewers (`daDiagnosticsView`, `daAnalysisHistoryView`)
- Overlay inspectors (`daInvestigationDrawer`)
- Mathematical engines (`daDiffEngine`, `daRefactoringEngine`)
- Dual-snapshot comparison views (`daCompareView`)
- Interactive refactoring wizards and modals (`daRefactoringView`, `daRefactorHandoffModal`)

Contract `W0-C4` is authoritatively defined as **"Component API Registration & Contract Governance (daAppShell Integration Protocol)"**. This document reconciles the exact component-specific public APIs, data flow, events, and task mappings.

---

## 2. Authoritative Component-Specific API Matrix

| Component Bundle | Owning Task | Role / Category | Public `@api` Properties | Public `@api` Methods | Events Dispatched | Parent-to-Child Binding | Child-to-Parent Event Data |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **`daRadarView`** | `W6-1` | Radial metric view | `graphPayload`, `selectedNodeId`, `readOnly` | None | `nodeselect` | `graph-payload`, `selected-node-id`, `read-only` | `{ detail: { nodeId: String } }` |
| **`daTreemapView`** | `W6-2` | Hierarchical box view | `graphPayload`, `selectedNodeId` | None | `nodeselect` | `graph-payload`, `selected-node-id` | `{ detail: { nodeId: String } }` |
| **`daSubwayView`** | `W6-3` | Metro transit line view | `graphPayload`, `selectedNodeId` | None | `nodeselect` | `graph-payload`, `selected-node-id` | `{ detail: { nodeId: String } }` |
| **`daHotspotsView`** | `W6-4` | Risk heatmap view | `graphPayload`, `selectedNodeId` | None | `nodeselect` | `graph-payload`, `selected-node-id` | `{ detail: { nodeId: String } }` |
| **`daDiagnosticsView`** | `W7-1` | Quality scorecard | `graphPayload`, `projectId` | None | None | `graph-payload`, `project-id` | N/A |
| **`daArchitectureDnaBarcode`** | `W7-2` | Barcode visualizer | `graphPayload`, `selectedNodeId` | None | `nodeselect` | `graph-payload`, `selected-node-id` | `{ detail: { nodeId: String } }` |
| **`daAnalysisHistoryView`** | `W7-3` | Run listing / switcher | `projectId`, `activeRunId` | None | `runselect` | `project-id`, `active-run-id` | `{ detail: { runId: String } }` |
| **`daInvestigationDrawer`** | `W8-1` | Node detail inspector | `nodeData`, `isOpen` | None | `drawerclose` | `node-data`, `is-open` | `{ detail: {} }` |
| **`daDiffEngine`** | `W8-2` | Headless diff module | None | `computeDiff(snapA, snapB)` | N/A (Utility) | Headless ES6 export | N/A |
| **`daCompareView`** | `W8-3` | Dual snapshot comparison| `projectId`, `baseRunId`, `targetRunId` | None | `diffcomplete` | `project-id`, `base-run-id`, `target-run-id` | `{ detail: { summary: Object } }` |
| **`daRefactoringEngine`** | `W9-1` | Headless topology math | None | `simulateStep(graph, mutation)` | N/A (Utility) | Headless ES6 export | N/A |
| **`daRefactoringView`** | `W9-2` | Interactive refactor UI| `graphPayload` | None | `mutationapply` | `graph-payload` | `{ detail: { recipe: Object } }` |
| **`daRefactorHandoffModal`**| `W9-3` | Export modal dialog | `isOpen`, `mutationPlan` | None | `modalclose`, `planexport` | `is-open`, `mutation-plan` | `{ detail: { plan: Object } }` |
| **`daAppShell`** | `INT-1` | Parent application shell| None (Top-level shell) | None | N/A | Hosts all subviews | Orchestrates child events |

---

## 3. Upstream Baseline Components Comparison

To ensure backwards compatibility with Wave 4 baselines, existing components adhere to their verified interfaces:

| Component | Verified `@api` Surface | Events Emitted | Verified Baseline Runner | Status |
| :--- | :--- | :--- | :--- | :--- |
| `daGraphViewer` | `graphPayload`, `selectedNodeId`, `readOnly` | `nodeselect`, `filterchange` | `run-lane-d-graph-filter-tests.cjs` | **FROZEN_BASELINE** |
| `daPresetManager` | `currentFilters`, `readOnly` | `presetselect`, `presetsave` | `run-lane-c-preset-manager-tests.cjs` | **FROZEN_BASELINE** |
| `daMatrixView` | `graphPayload`, `selectedNodeId` | `nodeselect` | `run-lane-e-matrix-tests.cjs` | **FROZEN_BASELINE** |
| `daFindingsView` | `graphPayload`, `selectedFindingId` | `findingselect` | `run-lane-f-findings-tests.cjs` | **FROZEN_BASELINE** |

---

## 4. Contract-to-Task Traceability Mapping

| Contract ID | Contract Title | Producer Task | Consumer Tasks | Implementing / Validating Tasks |
| :--- | :--- | :--- | :--- | :--- |
| `W0-C1` | Canonical Graph Payload Contract | Ingestion Service / Apex | W5-1..6, W6-1..4, W7-1, W7-2, W8-3, W9-1..3, INT-1 | W5-1, W6-1, W7-1, W8-2, W9-1 |
| `W0-C2` | Interactive Focus & Selection Contract | daGraphViewer, daAppShell | W5-4, W5-5, W5-6, W8-1, INT-1 | W5-4, W5-5, W8-1, INT-1 |
| `W0-C3` | Analytical Metrics & Distribution | Canonical Payload Producer | W6-1, W6-2, W6-3, W6-4 | W6-1, W6-2, W6-3, W6-4 |
| `W0-C4` | Component API Registration Governance | daAppShell (Coordinator) | All Wave 5..9 Feature Tasks | INT-1 (Integration Shell) |
| `W0-C5` | Analysis Run & History Listing | W7-P1 (DAGraphController) | W7-3 (History View), W8-3 (Compare View) | W7-P1, W7-3, W8-3 |
| `W0-C6` | Deep Inspection & Node Metadata | Payload Loader / Apex | W8-1 (Investigation Drawer) | W8-1 |
| `W0-C7` | Graph Snapshot Diff & Comparison | W8-2 (daDiffEngine), Apex | W8-3 (Compare View) | W8-2, W8-3 |
| `W0-C8` | Topological Refactoring Simulation | W9-1 (daRefactoringEngine) | W9-2 (Simulation View), W9-3 (Modal) | W9-1, W9-2, W9-3 |
| `W0-C9` | Core UI & Behavioral Invariants | All Feature Tasks | INT-1 (Coordinator Integration Gate) | INT-1 |

---

## 5. Architectural Invariant Governance Rules

1. **SELECTION != NAVIGATION Invariant:**
   - Any component that fires `nodeselect` updates the focused node state in `daAppShell`.
   - The shell must NEVER switch routes, active tabs, or views when a node is selected.
2. **Kebab-Case HTML Template Binding Rule:**
   - In LWC templates, multi-word JavaScript properties MUST be bound in kebab-case (e.g. `graphPayload` -> `<c-da-radar-view graph-payload={payload}>`).
3. **Immutability of Inbound `@api` Properties:**
   - Child components must treat inbound `@api` properties as strictly read-only.
   - Mutating an `@api` property directly in child components is strictly prohibited.

# Graph Test Baseline & Forensic Audit Report

## Audit Scope
This audit covers all existing Salesforce Architecture Explorer tests related to:
- `GraphView` (`explorer/src/components/GraphView.test.tsx`)
- Graph layout (`explorer/src/lib/projectState.test.ts`, `explorer/src/components/GraphView.test.tsx`, `explorer/src/test/RegressionAcceptance.test.tsx`, `explorer/src/App.test.tsx`)
- `GraphControls` (`explorer/src/components/GraphControls.test.tsx`)
- Project state (`explorer/src/lib/projectState.test.ts`, `explorer/src/context/ProjectStateContext.test.tsx`, `explorer/src/test/ProjectIsolationAndCompare.test.tsx`)
- Filtering (`explorer/src/lib/search-filter.test.ts`, `explorer/src/components/SearchFilterPanel.test.tsx`)
- Focus Depth & Focus Direction (`explorer/src/lib/focus-graph.test.ts`, `explorer/src/components/FocusControls.test.tsx`, `explorer/src/components/GraphView.test.tsx`, `explorer/src/test/RegressionAcceptance.test.tsx`, `explorer/src/App.test.tsx`)
- Investigation workflow (`explorer/src/App.investigationWorkflow.test.tsx`, `explorer/src/App.deepLink.test.tsx`, `explorer/src/components/InvestigationDrawer.test.tsx`)
- Project isolation (`explorer/src/test/ProjectIsolationAndCompare.test.tsx`, `explorer/src/test/RegressionAcceptance.test.tsx`, `explorer/src/context/ProjectContext.test.tsx`)
- Regression acceptance (`explorer/src/test/RegressionAcceptance.test.tsx`)

---

## 1. Behaviors Currently Guaranteed

The following behaviors are explicitly tested and guaranteed across the existing test suite:

### A. Graph Engine & Lifecycle (`explorer/src/components/GraphView.test.tsx`)
* **Single Cytoscape instance preservation**: Updating node/edge props re-uses the existing Cytoscape instance without destroying or re-instantiating Cytoscape (`mockCytoscapeFn` call count remains unchanged on rerenders).
* **Synchronized element update**: Prop updates trigger element removal (`elements().remove()`) and addition (`add()`) on the active Cytoscape instance.
* **Imperative ref controls**: `GraphViewRef` provides `zoomIn`, `zoomOut`, `fitView`, and `resetLayout`.
* **Accessible fallback DOM structure**: Renders ARIA `region` role, `#minimap` container, hidden `tree`/`treeitem` hierarchy for screen readers, and floating `toolbar`.
* **Keyboard shortcuts**: Pressing `Escape` deselects nodes/edges via `onSelectNode(null)` and `onSelectEdge('')`.
* **Navigator overlay toggle**: Minimap overlay visibility can be toggled without disturbing graph state or Cytoscape instances.

### B. Graph Controls (`explorer/src/components/GraphControls.test.tsx`)
* **Conceptual grouping**: Controls are structured into standard ARIA `toolbar` and `group` roles (`Navigation controls`, `Layout controls`, `Workspace controls`, `Analysis controls`).
* **Conditional button rendering**: `Center Selected` button is conditionally rendered only when `hasSelectedNode` is true.
* **Navigation & workspace callbacks**: Zoom in/out, fit view, center selected, reset layout, toggle fullscreen, and toggle navigator issue dedicated callbacks.
* **Embedded FocusControls**: Rendered inside the `Analysis controls` group when `focusState` and `onFocusChange` props are provided.

### C. Focus Depth & Direction Engine (`explorer/src/lib/focus-graph.test.ts`, `explorer/src/components/FocusControls.test.tsx`, `explorer/src/test/RegressionAcceptance.test.tsx`)
* **Multi-hop depth traversal** (A → B → C → D canonical chain):
  * **Dependencies direction**:
    * Depth 1 from A: `[A, B]`
    * Depth 2 from A: `[A, B, C]`
    * Depth 3 from A: `[A, B, C, D]`
    * ALL depth from A: `[A, B, C, D]`
  * **Dependents direction**:
    * Depth 1 from D: `[C, D]`
    * Depth 2 from D: `[B, C, D]`
    * Depth 3 from D: `[A, B, C, D]`
    * ALL depth from D: `[A, B, C, D]`
  * **Both direction**:
    * Depth 1 from B: `[A, B, C]`
    * Depth 2 from B: `[A, B, C, D]`
* **Direction edge filtering**: `dependencies` includes outbound edges (`A-B`, `B-C`); `dependents` includes inbound edges (`B-C`, `C-D`).
* **Disabled & empty states**: Returns empty node/edge arrays when `enabled: false` or `focusNodeId: null`.
* **Center node declaration**: `computeFocusedGraph` sets `centerNodeId` equal to the focused `focusNodeId`.
* **Focus UI controls**: Focus toggle button switches state (`OFF` disabled when no node selected, toggles `ON`/`OFF` when node selected); direction (`both`, `dependencies`, `dependents`) and depth (`1`, `2`, `3`, `ALL`) select boxes trigger `onFocusChange`.

### D. Project Isolation & State (`explorer/src/lib/projectState.test.ts`, `explorer/src/context/ProjectStateContext.test.tsx`, `explorer/src/test/ProjectIsolationAndCompare.test.tsx`)
* **LocalStorage key isolation**: UI state persisted under `explorer.projectState.<projectId>`.
* **Multi-project data isolation**: Modifying state for project `proj-a` does not mutate or overwrite state for `proj-b` across 9 state dimensions (selected component, filters, layout, zoom/pan, sidebar, inspector, navigator, analysis view, comparison state).
* **Project switch event reset**: Listening to `explorer:project-changed` window events resets active view selections (`selectedNodeId: null`, `selectedFindingId: null`, `isInvestigating: false`, `focusState.enabled: false`) and exits compare mode (`isActive: false`, `diffResult: null`).
* **Scoped history & annotations**: History timelines and node annotations are partitioned strictly by `projectId`.

### E. Filtering & Visibility (`explorer/src/lib/search-filter.test.ts`, `explorer/src/components/SearchFilterPanel.test.tsx`)
* **Search & filter matching**: Search query, type filter, risk filter, and quick filters (`all`, `highRisk`, `cycles`, `unresolved`, `untested`) filter graph nodes deterministically.
* **Canvas node-type visibility controls**: Toggling node type checkboxes, `Clear All`, or `Select All` updates `visibleNodeTypes` array (out of 10 supported types).

### F. Unified Investigation Workflow & Deep Linking (`explorer/src/App.investigationWorkflow.test.tsx`, `explorer/src/App.deepLink.test.tsx`)
* **Investigation drawer drill**: Command palette search selection opens `InvestigationDrawer`; clicking dependent rows drills into target components and updates state.
* **Canonical URL synchronization**: Browser URL params (`node`, `focus.enabled`, `focus.direction`, `focus.depth`, `finding`, `investigate`) stay in sync with application state and restore correctly on `popstate` events.

### G. Regression Acceptance Standards (`explorer/src/test/RegressionAcceptance.test.tsx`)
* **Sidebar space reservation**: Closed sidebar unmounts `.sidebar-slot` (does NOT reserve layout space).
* **Drawer layout participation**: Pinned drawer without selected node unmounts `.drawer-slot`.
* **Navigator overlay removal**: Closing minimap removes `.minimap-container` from DOM.

---

## 2. Behaviors That Must Not Regress

Any future enhancements (including Static layout mode or performance optimizations) must uphold the following non-negotiable guarantees:

1. **Cytoscape Instance Retention**: Re-rendering `GraphView` upon prop changes (such as focus graph changes or search filtering) MUST preserve the underlying Cytoscape instance rather than destroying/re-creating `cytoscape()`.
2. **Project Isolation**: UI state, selection, focus, comparison, history, and annotations for `Project A` MUST remain strictly isolated from `Project B`. Switching projects MUST dispatch `explorer:project-changed` and clear active selection/compare state.
3. **Graph Traversal Semantics**: Focus graph depth calculations (Depth 1, 2, 3, ALL) across `dependencies`, `dependents`, and `both` directions MUST match the exact transitive BFS graph traversal logic defined in `computeFocusedGraph`.
4. **Layout Space Reservation**:
   - Collapsed sidebar MUST NOT reserve space (`.sidebar-slot` must be absent).
   - Unselected/unpinned drawer MUST NOT reserve space (`.drawer-slot` must be absent).
   - Closed minimap overlay MUST unmount from DOM (`.minimap-container` absent).
5. **URL & Deep Link Restoration**: Navigating back/forward or loading deep-link URLs with `node`, `focus`, or `investigate` search parameters MUST faithfully restore UI state.
6. **Accessible Fallback DOM**: The accessibility DOM fallback (ARIA `region`, `toolbar`, screen-reader `tree`, and `treeitem` nodes) MUST remain present in `GraphView`.

---

## 3. Tests That Need to Remain Unchanged

The following test suites test pure core domain logic, UI state contracts, or workflow integration and MUST remain completely unchanged:

1. `explorer/src/lib/focus-graph.test.ts` (All 23 tests testing pure graph traversal math for depths 1, 2, 3, ALL and directions).
2. `explorer/src/lib/projectState.test.ts` (All 7 tests verifying localStorage persistence and project isolation across 9 state dimensions).
3. `explorer/src/lib/search-filter.test.ts` (All 51 tests covering search query matching, risk filtering, and quick filters).
4. `explorer/src/test/ProjectIsolationAndCompare.test.tsx` (All 7 tests validating state isolation, event listener project resets, and compare diff calculation).
5. `explorer/src/test/RegressionAcceptance.test.tsx` (All 7 acceptance tests verifying space reservation, graph depth traversal, and isolation contracts).
6. `explorer/src/components/FocusControls.test.tsx` (All 7 tests asserting Focus UI button states, direction dropdown, and depth dropdown callbacks).
7. `explorer/src/components/GraphControls.test.tsx` (All 6 tests asserting button rendering, ARIA toolbar groups, and click callbacks).
8. `explorer/src/components/SearchFilterPanel.test.tsx` (All 4 tests verifying node-type visibility checkboxes and counter).
9. `explorer/src/context/ProjectStateContext.test.tsx` (All 4 tests for state context provider and project change event handling).
10. `explorer/src/App.investigationWorkflow.test.tsx` (All 3 integration tests for command palette -> selection -> drawer workflow).
11. `explorer/src/App.deepLink.test.tsx` (All 2 tests for URL parameter hydration and popstate navigation).

---

## 4. Tests That Will Need Extension for Static Mode

When Static layout mode is introduced, the following tests will require parameterization or additional test cases to assert Static mode behavior alongside dynamic layouts:

1. **`explorer/src/components/GraphView.test.tsx`**:
   - Add test case verifying layout configuration when layout mode is `'static'` (e.g. static node coordinate application or preset layout options vs. `fcose`/`cola`/`dagre`).
   - Add test asserting imperative `resetLayout()` behavior when operating in Static mode.
2. **`explorer/src/components/GraphControls.test.tsx`**:
   - If a layout mode selector (e.g. `Static` vs. `Dynamic` layout dropdown/toggle) is added to `GraphControls`, extend tests to check layout mode toggle rendering and callback firing.
3. **`explorer/src/lib/projectState.test.ts` & `explorer/src/context/ProjectStateContext.test.tsx`**:
   - Extend graph layout state persistence assertions to cover `layoutMode: 'static' | 'dynamic'` (or layout position overrides `nodePositions`).
4. **`explorer/src/App.test.tsx`**:
   - Add test case verifying layout mode prop forwarding from `useViewState`/`projectState` into `GraphView`.

---

## 5. Tests That Currently Assert Exact Coordinates

**Forensic Finding**: Currently, **NO tests in the repository assert exact numerical node coordinates `(x, y)`**.

### Codebase Analysis:
- `explorer/src/lib/projectState.ts` contains types and default initializers for `nodePositions?: Record<string, { x: number; y: number }>` and `pan: { x: number; y: number }`.
- `explorer/src/lib/projectState.test.ts` asserts that `nodePositions` can be saved and restored as an object structure (e.g., `expect(state.graphLayout.nodePositions).toEqual({ 'node-1': { x: 10, y: 20 } })`), but this is a structural test of LocalStorage serialization, NOT a Cytoscape rendered coordinate test.
- `explorer/src/components/GraphView.test.tsx` mocks Cytoscape and does not inspect or assert rendered node positions `node.position()`.
- `explorer/src/lib/graph-interactions.ts` references `{ x: cy.width() / 2, y: cy.height() / 2 }` during zoom operations, but `graph-interactions.test.ts` tests mock functions rather than exact coordinate values.

---

## 6. Tests That Mock Cytoscape / Layout Behavior

The following 4 test files mock Cytoscape and layout engine execution (`vi.mock('cytoscape')`, `vi.mock('cytoscape-fcose')`, `vi.mock('cytoscape-navigator')`):

1. **`explorer/src/components/GraphView.test.tsx`**:
   - Mocks `cytoscape` via `mockCytoscapeFn` and `mockCy`.
   - Mocks `mockCy.layout` with `vi.fn().mockReturnValue({ run: vi.fn() })`.
   - Mocks `cytoscape-fcose` and `cytoscape-navigator`.
   - Asserts Cytoscape method invocations (`mockCy.add`, `mockElementsRemove`, `mockCy.zoom`, `mockCy.fit`, etc.).
2. **`explorer/src/test/RegressionAcceptance.test.tsx`**:
   - Mocks `cytoscape` via inline `mockCy` object containing `layout: vi.fn().mockReturnValue({ run: vi.fn() })`.
   - Mocks `cytoscape-fcose` and `cytoscape-navigator`.
3. **`explorer/src/lib/graph-interactions.test.ts`**:
   - Uses handcrafted mock Cytoscape instance objects (`mockCy`) to test helper functions (`selectNode`, `deselectAll`, `zoomIn`, `zoomOut`, `panToNode`).
4. **`explorer/src/App.test.tsx`**:
   - Indirectly uses the Cytoscape mock through `GraphView` rendering during full shell integration tests.

---

## 7. Tests That Can Become Structural Assertions

To avoid brittle tests sensitive to layout algorithms, browser render loops, or canvas dimensions, the following testing boundaries can be maintained or transitioned to structural assertions:

1. **`GraphView` Node/Edge Sync**: Retain structural assertions on Cytoscape element payload structures passed to `cy.add(elements)` (e.g., checking `element.data.id` and node/edge count) rather than checking rendered canvas pixel positions or SVG/Canvas element DOM nodes.
2. **Graph Controls Layout Reset**: Assert that clicking `Reset Layout` calls the `onResetLayout` prop callback or triggers `cy.layout().run()`, rather than evaluating final node coordinates after animation finishes.
3. **Focus Graph Rendering**: Assert that the set of nodes and edges passed to `GraphView` matches the node ID set returned by `computeFocusedGraph` (e.g., `['A', 'B', 'C']`), keeping graph visual layout execution decoupled from graph data filtering logic.
4. **Static Mode Node Placement (Future)**: When Static mode is tested, assert structurally that static position maps `Record<string, { x: number; y: number }>` are correctly populated in Cytoscape element `position` definitions or layout options, rather than performing pixel-level visual snapshot comparisons in unit test runs.

---

## Summary Checklist

| Category | Count / Status | Target Files |
| :--- | :--- | :--- |
| **Guaranteed Behaviors** | Fully documented | `GraphView.test.tsx`, `GraphControls.test.tsx`, `focus-graph.test.ts`, `projectState.test.ts`, `search-filter.test.ts`, `App.investigationWorkflow.test.tsx`, `RegressionAcceptance.test.tsx` |
| **Non-Regressive Contracts** | 6 core invariants | Instance preservation, isolation, depth traversal, space reservation, deep links, accessibility DOM |
| **Unchanged Tests** | 11 test suites | `focus-graph`, `projectState`, `search-filter`, `ProjectIsolationAndCompare`, `RegressionAcceptance`, `FocusControls`, `GraphControls`, `SearchFilterPanel`, `ProjectStateContext`, `App.investigationWorkflow`, `App.deepLink` |
| **Static Mode Extensions** | 4 test suites | `GraphView.test.tsx`, `GraphControls.test.tsx`, `projectState.test.ts`, `App.test.tsx` |
| **Exact Coordinate Assertions**| **0 tests** | None currently assert `(x,y)` coordinates on canvas |
| **Cytoscape Mocks** | 4 test suites | `GraphView.test.tsx`, `RegressionAcceptance.test.tsx`, `graph-interactions.test.ts`, `App.test.tsx` |
| **Structural Assertions** | 4 patterns identified | Element payload data, callback triggers, ID set match, position map config |

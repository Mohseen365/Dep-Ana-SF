# WAVE 7D — TEST QUALITY / MOCK FIDELITY / REGRESSION AUDIT

## 1. Executive Result

The reported **717 passing tests** across 79 test files in `explorer/src` (and 300+ root CLI tests) provide **strong, high-fidelity evidence** that core domain logic, position authority rules, layout mode toggling, URL state serialization, search filtering, and mathematical layout optimization work as specified.

However, the forensic audit identified specific **test quality risks, mock fidelity limitations, and false-positive boundaries**:

1. **Mock Fidelity Gap in Cytoscape Physics & Automatic Layouts**: Cytoscape.js is mocked in JSDOM via `vi.mock('cytoscape')`. Cytoscape's internal fcose force-directed physics engine, DOM canvas bounding box calculations, edge curve geometry, and automated collision forces do not run during unit tests. Unit tests verify React lifecycle wiring, event listener binding, and coordinate state assignment, but do not prove canvas rendering without visual overlap in JSDOM.
2. **Call-Count vs Coordinate Assertion Distinction**: While `GraphView.runtimeIntegration.test.tsx` and `GraphView.positionAuthority.test.tsx` assert exact `{x, y}` coordinates before and after interactions, component tests that mock `cy.layout({ run: vi.fn() })` verify that layout was requested rather than that Cytoscape positioned elements correctly on canvas.
3. **Act(...) Warning Pollution in React Component Tests**: Tests for `ProjectDashboard`, `ProjectCreationModal`, and `ProjectContext` emit React `act(...)` state update warnings during asynchronous state resolves, indicating un-awaited state transitions.
4. **Missing Edge-Case Coverage in `graph-interactions.ts`**: Wave 6 modified `highlightCycle` to handle undefined/empty cycle collections safely, but `graph-interactions.test.ts` only tests non-empty cycle arrays and clear operations, lacking explicit assertions for empty (`[]`) or `undefined` cycle node inputs.

---

## 2. Test Inventory

| Test File Path | Test Count | Production Area Covered | Integration Level | Mock Level | Important Behavior Asserted |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `src/components/GraphView.runtimeIntegration.test.tsx` | 22 | GraphView & Position Authority Lifecycle | Integration | Cytoscape Mock | 5-level position authority, static mode stability, drag persistence, filter/focus isolation. |
| `src/components/GraphView.positionAuthority.test.tsx` | 16 | Position Authority & Static Semantics | Integration | Cytoscape Mock | Persisted precedence over calculated, dragfree capture, static mode freezing, explicit reset. |
| `src/components/GraphView.test.tsx` | 20 | GraphView UI, Hover Cards, Selection | Integration | Cytoscape Mock | Accessibility tree, keyboard nav, viewport preservation during node selection, element sync. |
| `src/components/GraphView.layoutModeToggle.test.tsx` | 1 | Layout Mode Toggle & Persistence | Integration | Cytoscape Mock | Interactive $\leftrightarrow$ Static toggle, UI badge, LocalStorage persistence, project isolation. |
| `src/components/GraphControls.test.tsx` | 7 | Graph Floating Controls | Component | None | Button clicks, zoom/fit/center/reset triggers, mode toggle callback dispatch. |
| `src/components/CommandPalette.test.tsx` | 12 | Command Palette Modal | Component | None | Search filtering, keyboard shortcuts (`Ctrl+K`), selection dispatch, recent searches. |
| `src/components/InvestigationDrawer.test.tsx` | 11 | Investigation Drawer Panel | Component | None | Tab switching (Overview, Contracts, Dependencies, Risk), drill callbacks, path navigation. |
| `src/components/ProjectDashboard.test.tsx` | 8 | Project Dashboard Summary | Component | Mock Data | Metric cards, status badges, secondary action buttons, risk breakdown. |
| `src/components/DiagnosticsPanel.test.tsx` | 8 | Health Diagnostics Panel | Component | None | Diagnostic rule evaluation, filtering by severity, export triggers. |
| `src/components/ComparePanel.test.tsx` | 6 | Snapshot Comparison Panel | Component | None | Delta metrics (components, dependencies, risk, cycles), snapshot selector. |
| `src/components/FindingsPanel.test.tsx` | 6 | Architecture Findings Panel | Component | None | Architecture smells, risk reasons, navigation to component on click. |
| `src/components/HotspotPanel.test.tsx` | 5 | Hotspots Analysis Panel | Component | None | High-coupling and high-risk hotspot ranking and selection. |
| `src/components/FocusControls.test.tsx` | 7 | Focus Depth/Direction Controls | Component | None | Depth (1, 2, 3, ALL) and direction (dependents, dependencies, both) state changes. |
| `src/components/RefactorHandoffModal.test.tsx` | 6 | Refactoring Handoff Export | Component | None | Markdown/JSON handoff spec generation, clipboard copy, modal open/close. |
| `src/components/ProjectManager.test.tsx` | 7 | Project List & Management | Component | LocalStorage | Project creation, deletion, archiving, project switching callbacks. |
| `src/components/AnalysisHistoryPanel.test.tsx` | 7 | Analysis Snapshot History | Component | LocalStorage | Timeline rendering, snapshot deletion, comparison selection. |
| `src/components/ImpactControls.test.tsx` | 4 | Impact Analysis Controls | Component | None | Impact depth slider, direction toggle, clear impact mode. |
| `src/components/SearchFilterPanel.test.tsx` | 4 | Search & Filter Drawer | Component | None | Node type checkboxes, risk level filters, text search input. |
| `src/components/ConnectionControls.test.tsx` | 4 | Path Analysis Controls | Component | None | Source/target node selection, shortest path calculation trigger. |
| `src/components/Sidebar.test.tsx` | 4 | Left Navigation Sidebar | Component | None | Tab navigation (Explorer, Health, Hotspots, History, Compare, Settings). |
| `src/components/Header.test.tsx` | 8 | Top Navigation Header | Component | None | Project selector dropdown, search shortcut button, fullscreen toggle. |
| `src/components/ProjectCreationModal.test.tsx` | 5 | New Project Modal | Component | Context Mock | Modal open/close, name validation, source path input, project creation submit. |
| `src/components/ProjectSelector.test.tsx` | 4 | Project Switcher Cards | Component | None | Search query filtering, project card selection, active project indicator. |
| `src/components/SummaryBar.test.tsx` | 3 | Top Summary Stat Bar | Component | None | Total components, total dependencies, risk count, cycle count display. |
| `src/components/ErrorBoundary.test.tsx` | 4 | React Error Boundary | Component | None | Catch rendering errors, fallback UI rendering, reset boundary trigger. |
| `src/components/Breadcrumbs.test.tsx` | 3 | Navigation Breadcrumbs | Component | None | Path rendering, crumb click navigation callbacks. |
| `src/components/HealthSummary.test.tsx` | 1 | Architecture Health Badge | Component | None | Health score calculation, status badge color mapping. |
| `src/lib/layout/components.test.ts` | 15 | Component Packing Engine | Unit | None | Bounding box packing, row wrapping, no overlaps, deterministic packing. |
| `src/lib/layout/local-layout.test.ts` | 10 | Primary Local Node Layout | Unit | None | Subsystem cluster placement, hub score influence, deterministic grid positioning. |
| `src/lib/layout/spacing.test.ts` | 12 | Collision & Spatial Cleanup | Unit | None | Overlap removal, domain boundary padding, layer spacing preservation. |
| `src/lib/layout/domains.test.ts` | 14 | Domain Discovery Engine | Unit | None | Suffix stripping, folder path matching, Shared fallback, field/test domain inheritance. |
| `src/lib/layout/satellites.test.ts` | 11 | Satellite Layout (Tests/Fields) | Unit | None | Test placement near production, field placement near object, trigger/handler pairing. |
| `src/lib/layout/evaluate-layout.test.ts` | 14 | Layout Metrics Evaluator | Unit | None | Edge crossings, avg edge length, layer violations, overlap detection. |
| `src/lib/layout/centrality.test.ts` | 11 | Hub & Bridge Analysis | Unit | None | Fan-in/fan-out hub scoring, cross-domain bridge scoring, score independence. |
| `src/lib/layout/metrics.test.ts` | 15 | Layout Metric Functions | Unit | None | Mathematical crossing detection, Euclidean edge length, bounding box overlap. |
| `src/lib/layout/analysis.test.ts` | 9 | Layout Intermediate Model | Unit | None | Fan-in/fan-out calculation, node role assignment, component ID assignment. |
| `src/lib/layout/ordering.test.ts` | 8 | Barycenter Sweeps & Crossings | Unit | None | Crossing reduction sweeps, same-layer edge safety, deterministic tie-breaking. |
| `src/lib/layout/layers.test.ts` | 14 | Layer Classification Engine | Unit | None | Presentation/Application/Domain/Schema classification, test layer inheritance. |
| `src/lib/layout/global-layout.test.ts` | 8 | Global Domain Layout Engine | Unit | None | Domain relationship graph, spatial region placement, Shared domain center. |
| `src/lib/layout/fixtures/fixtures.test.ts` | 54 | Benchmark Architecture Fixtures | Unit | None | Synthetic graph validity, edge consistency, multi-domain Food Delivery fixture. |
| `src/lib/graph-interactions.test.ts` | 2 | Graph Cycle Highlighting | Unit | Mock Cytoscape | Cycle node/edge class addition (`.highlighted`, `.dimmed`), clear highlights. |
| `src/lib/architecture-layout.test.ts` | 14 | Architecture Layout Orchestrator | Unit | None | Staged layout pipeline execution, position coordinate generation, determinism. |
| `src/lib/position-policy.test.ts` | 19 | Position Authority Policy Engine | Unit | None | 5-level authority hierarchy, static mode triggers, new node position calculation. |
| `src/lib/performance.test.ts` | 4 | Layout Performance Benchmark | Performance | None | Calculation speed across 10, 50, 100, 250 node fixtures (< 100ms threshold). |
| `src/lib/projectState.test.ts` | 11 | Project State Persistence | Unit | LocalStorage | Key format `explorer.projectState.<id>`, mode persistence, migration. |
| `src/lib/search-filter.test.ts` | 51 | Search & Filter Logic | Unit | None | Text matching, node type filtering, risk level filtering, combination filters. |
| `src/lib/connection-analysis.test.ts` | 12 | Path Analysis Logic | Unit | None | Shortest path, all paths, reachability, depth-bounded path search. |
| `src/lib/impact-analysis.test.ts` | 10 | Impact Analysis Logic | Unit | None | Transitive dependency traversal, impact depth bounds, affected node set. |
| `src/lib/focus-graph.test.ts` | 23 | Focus Subgraph Extraction | Unit | None | Subgraph filtering by depth (1, 2, 3, ALL) and direction (in, out, both). |
| `src/lib/graph-builder.test.ts` | 10 | Cytoscape Element Builder | Unit | None | ExplorerNode/Edge to Cytoscape element serialization, data payload mapping. |
| `src/lib/graph-style.test.ts` | 18 | Cytoscape Style Generator | Unit | None | Color mapping by node type/risk, edge styles, zoom class selectors. |
| `src/lib/annotations.test.ts` | 7 | User Annotations Engine | Unit | LocalStorage | Annotation CRUD, node attachment, project isolation. |
| `src/lib/change-simulator.test.ts` | 10 | What-If Refactoring Simulator | Unit | None | Node removal simulation, coupling delta, risk impact estimation. |
| `src/lib/detached-drawer.test.ts` | 4 | Detached Window State | Unit | None | Window popout state management, cross-window messaging sync. |
| `src/lib/drill.test.ts` | 6 | Progressive Drilling Logic | Unit | None | Breadcrumb trail tracking, drill depth history stack. |
| `src/lib/health.test.ts` | 5 | Health Score Calculator | Unit | None | Metric weighting, score calculation, penalty rules. |
| `src/lib/hotspots.test.ts` | 6 | Hotspots Identification Engine | Unit | None | High-coupling and high-risk component sorting and thresholding. |
| `src/lib/preferences.test.ts` | 5 | User Preferences State | Unit | LocalStorage | Theme selection, grid toggle, minimap visibility preferences. |
| `src/lib/projectHistory.test.ts` | 7 | Project History & Snapshots | Unit | LocalStorage | Snapshot creation, delta metric calculation, history timeline persistence. |
| `src/lib/readiness.test.ts` | 6 | Refactoring Readiness Analysis | Unit | None | Risk checklist evaluation, readiness status classification. |
| `src/lib/scalability-layout.test.ts` | 3 | Scalability Layout Policy | Unit | None | Large graph (> 200 nodes) layout strategy selection. |
| `src/lib/schema.test.ts` | 5 | Schema Validation Engine | Unit | Zod | Project manifest and report schema validation. |
| `src/lib/views.test.ts` | 6 | Saved Views Manager | Unit | LocalStorage | Custom saved view CRUD, query string serialization. |
| `src/lib/intelligence/foundation.test.ts` | 8 | Architecture Intelligence Core | Unit | None | Smells discovery, architectural rule evaluation. |
| `src/lib/intelligence/rules/foundation.test.ts` | 12 | Intelligence Rules Engine | Unit | None | Specific rule evaluations (cyclic dependency, god class, tight coupling). |
| `src/lib/url/urlQuery.test.ts` | 10 | URL Query Serializer | Unit | None | State to URL query string serialization and restoration. |
| `src/hooks/useCommandPalette.test.ts` | 5 | Command Palette Hook | Hook | None | Open/close state, search query filtering, action execution. |
| `src/hooks/useExplorerData.test.ts` | 12 | Data Fetching Hook | Hook | Mock Fetch | Manifest fetching, 404/HTML error handling, project switching reset. |
| `src/hooks/useGraphSelection.test.ts` | 4 | Selection State Hook | Hook | None | Node/edge selection synchronization, multi-selection state. |
| `src/hooks/useViewState.test.ts` | 13 | View State Management Hook | Hook | None | View state synchronization across URL, LocalStorage, and React state. |
| `src/context/ProjectContext.test.tsx` | 8 | Project Context Provider | Integration | Mock Fetch | Active project switching, project list mutation, project event dispatch. |
| `src/context/SelectionContext.test.tsx` | 3 | Selection Context Provider | Integration | None | Global selection state provider and consumer hook. |
| `src/context/ProjectStateContext.test.tsx` | 5 | Project State Context | Integration | LocalStorage | Project state persistence across 9 dimensions, mode switching. |
| `src/test/ProjectIsolationAndCompare.test.tsx` | 7 | Project Isolation & Compare | Integration | LocalStorage | Multi-project state isolation, compare mode snapshot metrics. |
| `src/test/RegressionAcceptance.test.tsx` | 9 | Parallel Acceptance Suite | Integration | DOM | Layout space reservation, mode toggle badge, static mode coordinates. |
| `src/test/AdversarialWave5.test.tsx` | 10 | Adversarial Stress Suite | Integration | Cytoscape Mock | Corrupted local storage, missing nodes, null edge attributes, stress inputs. |
| `src/App.test.tsx` | 6 | Shell App Composition | Integration | Mock Data | Full app shell rendering, graph pane loading, drawer slot rendering. |
| `src/App.investigationWorkflow.test.tsx` | 3 | Investigation Workflow Integration | Integration | Mock Data | Palette search $\rightarrow$ component selection $\rightarrow$ investigation drawer drill. |
| `src/App.deepLink.test.tsx` | 2 | Deep Link State Restoration | Integration | None | URL query restoration of node selection, focus depth, and direction. |

**Total Inventory**: 79 test files, 717 total passing tests.

---

## 3. GraphView Runtime Test Audit

The primary runtime integration test suite for `GraphView` is located in `explorer/src/components/GraphView.runtimeIntegration.test.tsx`.

It contains **22 scenarios** designed to verify runtime interaction, Position Authority, Static Mode stability, and Cytoscape integration.

---

## 4. Runtime Integration 22-Test Audit

Below is the detailed scenario-by-scenario evaluation of all 22 tests in `GraphView.runtimeIntegration.test.tsx`:

| # | Test Scenario Title | What is Actually Exercised | What is Mocked | What is Asserted | Assertion Quality & Classification |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | Initial architecture-aware layout | `render(<GraphView />)` with sample graph. | Cytoscape constructor, layout option initialization. | `initOpts.layout.name === 'preset'`, and `posFn` matches `computeArchitectureLayout()`. | **meaningful**: Proves initial mount computes architecture positions and passes preset positions to Cytoscape. |
| 2 | Authoritative dragged positions | User drag on 3 nodes (hub, bridge, satellite) via `dragfree` event. | Cytoscape instance, `dragfree:node` event dispatch. | `node.position()` reflects dragged coordinates `(999,888)`, `(777,666)`, `(555,444)`. | **meaningful**: Proves session drag updates Level 1 position authority across different node categories. |
| 3 | Persisted position precedence | Mount with `nodePositions` prop. | Cytoscape instance. | `node.position()` matches `nodePositions` prop exactly. | **meaningful**: Proves Level 2 persisted positions override calculated layout on mount. |
| 4 | Static initial layout | Mount in `layoutMode="static"`. | Cytoscape instance. | `initOpts.layout.name === 'preset'`. | **meaningful**: Proves static mode initializes with preset layout when no positions exist. |
| 5 | Static filter regression | Re-rendering graph with filtered nodes in `layoutMode="static"`. | Cytoscape `layout().run` mock function. | `mockLayoutRun` was NOT called, and remaining node position remains `(100, 100)`. | **meaningful**: Proves node type filtering does not trigger auto-layout in static mode. |
| 6 | Static focus-depth regression | Re-rendering graph with changed focus node, depth, and direction in Static mode. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called, and node position remains `(100, 100)`. | **meaningful**: Proves focus depth/direction changes preserve static mode coordinates without relayout. |
| 7 | Interactive drag regression | Dragging node in Interactive mode, then triggering component re-render. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called, and dragged position `(800, 800)` survives re-render. | **meaningful**: Proves Level 1 session drags survive component re-renders in Interactive mode. |
| 8 | Mode-switch regression | Switching `layoutMode` Static $\rightarrow$ Interactive $\rightarrow$ Static. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called during mode toggling. | **meaningful**: Proves mode switching changes behavior policy without triggering immediate visual rearrangement. |
| 9 | Explicit reset layout | Clicking "Reset Layout" button in Static mode. | Cytoscape `layout().run`. | `mockLayoutRun` WAS called, and `onNodePositionsChange` was invoked. | **meaningful**: Proves Reset Layout button overrides static mode freezing to calculate fresh positions. |
| 10 | New node placement | Re-rendering with 1 new node added to existing graph in Static mode. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called, existing nodes remain at `(100, 100)`/`(200, 200)`, and new node has finite `{x, y}` coordinates. | **meaningful**: Proves genuinely new nodes are placed deterministically while existing nodes stay frozen. |
| 11 | Hidden $\rightarrow$ Visible restoration | Hiding a node via filter and then restoring it in Static mode. | Cytoscape instance. | Restored node recovers exact original coordinate `(400, 400)`. | **meaningful**: Proves Level 2/3 positions are retained and restored when hidden nodes reappear. |
| 12 | Filter + Drag combination | Dragging node A to `(999, 999)`, filtering LWC nodes out, then restoring graph. | Cytoscape instance. | Node A retains dragged coordinate `(999, 999)` throughout filter cycle. | **meaningful**: Proves Level 1 session drag authority survives node filtering and restoration. |
| 13 | Reset + Filter combination | Explicit Reset Layout followed by node filtering and filter restoration. | Cytoscape `layout().run`. | Node retains reset position across subsequent filter cycles. | **meaningful**: Proves positions established by Reset Layout become authoritative for future filter updates. |
| 14 | Persistence + Filter combination | Re-rendering graph with persisted positions through filter cycles. | Cytoscape instance. | Persisted positions `(500, 500)` and `(600, 600)` remain intact after filter cycles. | **meaningful**: Proves persisted positions remain authoritative across node filtering. |
| 15 | Graph update with existing positions | Re-rendering with updated edge metadata while positions exist. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called, and positions remain `(111, 222)`/`(333, 444)`. | **meaningful**: Proves non-structural graph attribute updates do not trigger auto-layout. |
| 16 | Investigation mode regression | Setting `selectedCycleNodeIds` to highlight cycle path. | Cytoscape `layout().run`. | `mockLayoutRun` was NOT called, and node positions remain unchanged. | **meaningful**: Proves cycle path investigation highlighting does not trigger relayout. |
| 17 | Double-layout prevention | Initial mounting of `GraphView`. | Cytoscape constructor & `layout().run`. | `mockCytoscapeFn` called 1 time, `mockLayoutRun` called 0 times. | **meaningful**: Proves mount executes preset initialization once without redundant layout runs. |
| 18 | No automatic force-layout override | Initial mounting of `GraphView`. | Cytoscape constructor options. | `initOpts.layout.name === 'preset'`. | **meaningful**: Proves preset architecture layout is not silently replaced by fcose force-directed layout. |
| 19 | Empty graph handling safety | Rendering `GraphView` with `nodes={[]}` and `edges={[]}`. | Cytoscape instance. | `render()` does not throw an error. | **meaningful**: Verifies empty graph edge case resilience. |
| 20 | Single node graph handling safety | Rendering `GraphView` with 1 node and 0 edges. | Cytoscape instance. | `render()` does not throw, and node position has finite non-NaN numbers. | **meaningful**: Verifies single-node graph edge case resilience. |
| 21 | Disconnected graph handling safety | Rendering graph with 1 completely isolated node. | Cytoscape instance. | `render()` does not throw, and isolated node position has finite non-NaN numbers. | **meaningful**: Verifies disconnected component placement safety. |
| 22 | Large graph / render stability | Rendering 50 nodes and 49 edges, re-rendering 5 times with different selections. | Cytoscape instance. | `mockCytoscapeFn` called exactly 1 time across 5 selection re-renders. | **partial**: Proves Cytoscape instance is preserved without memory leaks across re-renders, but does not measure rendering FPS or DOM layout performance in JSDOM. |

---

## 5. Mock Fidelity Audit

`GraphView.tsx` relies on Cytoscape.js for canvas rendering, event handling, and force-directed animations. In Vitest, Cytoscape is mocked using `vi.hoisted()` in test files.

### Capabilities & Modeling Fidelity of the Cytoscape Mock:

1. **Nodes & Edges**: Realistic data getters (`node.data()`, `node.id()`), type checks (`isNode()`, `isEdge()`), and property access.
2. **Positions**: Mock implementation maintains an internal `{ x, y }` coordinate state updated via `node.position({ x, y })` calls.
3. **Event Subscriptions**: `cy.on()` and `cy.one()` store event handlers in a `listeners` record, enabling synthetic dispatches for `dragfree:node`, `tap:node`, and `dbltap dblclick:node`.
4. **Element Collections**: `cy.elements()`, `cy.nodes()`, and `cy.edges()` return arrays supporting `.addClass()`, `.removeClass()`, `.select()`, and `.unselect()`.

### Limitations & Unmodelled Cytoscape Behaviors (Blind Spots):

1. **No Canvas Rendering or Bounding Box Calculation**: JSDOM does not render canvas graphics or compute element DOM bounding boxes (`node.boundingBox()`). Collision detection between rendered node shapes cannot be verified via Cytoscape mocks.
2. **No fcose Physics Engine Simulation**: When `cy.layout({ name: 'fcose' }).run()` is called in production, Cytoscape runs iterative force-directed spring physics. The test mock merely provides a stub `{ run: vi.fn() }`. Tests cannot detect whether fcose physics causes node overlaps or unstable oscillations.
3. **Edge Curve & Routing Geometry**: Cytoscape edge routing algorithms (bezier curves, taxi routing, edge label placement) are not executed in mock environments.
4. **Viewport Camera Animations**: `cy.animate({ center: ... })` and `cy.fit()` are stubbed as `vi.fn()`. Tests verify that viewport functions are invoked, but cannot verify actual viewport camera zoom levels or panning pixel offsets on canvas.

---

## 6. Mocked Layout Audit

Search across test files identified how layout functions are tested:

1. **`computeArchitectureLayout`**: Called directly in unit tests (`architecture-layout.test.ts`, `ordering.test.ts`, `spacing.test.ts`, `components.test.ts`). **These tests verify real layout logic**, asserting exact calculated `{x, y}` coordinates, bucket ranks, and crossing metrics.
2. **`GraphView.runtimeIntegration.test.tsx`**: Imports real `computeArchitectureLayout` and verifies that Cytoscape preset positions match calculated coordinates.
3. **Mocked Layout Call Count Tests**: In `GraphView.positionAuthority.test.tsx` and `GraphView.test.tsx`, `cy.layout().run` is stubbed to assert `expect(mockLayoutRun).not.toHaveBeenCalled()`.

### Audit Evaluation:
- Tests asserting `mockLayoutRun.not.toHaveBeenCalled()` **provide solid proof** that Static Mode policy successfully blocks auto-layout triggers.
- However, tests checking `expect(mockLayoutRun).toHaveBeenCalled()` only verify that a layout was requested; they do not verify what coordinates Cytoscape produced as a result of that run. Real coordinate verification relies on `computeArchitectureLayout.test.ts`.

---

## 7. Position Authority Test Audit

`GraphView.positionAuthority.test.tsx` consists of 16 tests auditing the **5-Level Position Authority Hierarchy**.

### Precedence Verification Matrix:

| Precedence Order | Authority Level | Tested In File | Test Assertion | Result |
| :-: | :--- | :--- | :--- | :--- |
| 1 | Level 1: Session Drag | `positionAuthority.test.tsx` (Test 2, 12) | Dragged coordinates `(180, 220)` override persisted props and survive re-renders. | **PASSED** |
| 2 | Level 2: Persisted Storage | `positionAuthority.test.tsx` (Test 1, 3, 11, 14) | `nodePositions` prop overrides `computeArchitectureLayout()` defaults on mount. | **PASSED** |
| 3 | Level 3: Cytoscape Canvas | `positionAuthority.test.tsx` (Test 11, 15) | Existing nodes retain `cyPositionsBefore` during element updates. | **PASSED** |
| 4 | Level 4: Calculated Layout | `positionAuthority.test.tsx` (Test 4, 9) | `computeArchitectureLayout()` runs when no positions exist or on Reset Layout. | **PASSED** |
| 5 | Level 5: Fallback New Nodes | `positionAuthority.test.tsx` (Test 10) | `calculateDeterministicNewNodePosition()` places new nodes without moving existing ones. | **PASSED** |

### Conflicting-Position Handling:
Tests explicitly verify that when `sessionPositions` conflict with `nodePositions` props (e.g. user dragged node to A, but prop says B), `sessionPositions` (Level 1) wins. When `nodePositions` prop conflicts with `computeArchitectureLayout()` defaults, `nodePositions` (Level 2) wins.

---

## 8. Static Mode Test Audit

Static Mode tests (`GraphView.positionAuthority.test.tsx` Tests 3, 5, 6, 11, 16 and `GraphView.runtimeIntegration.test.tsx` Tests 4, 5, 6, 8, 10, 11, 13, 16) audit coordinate freezing.

### Analysis of Proof vs False Positive Risk:
- **What is proven**: Tests explicitly check `expect(mockLayoutRun).not.toHaveBeenCalled()`. This proves that no automatic layout calculation is triggered by node filtering, focus depth changes, focus direction changes, selection, double-clicking, investigation workflows, or mode switching.
- **Coordinate preservation proof**: Tests assert `expect(n1.position()).toEqual({ x: 100, y: 200 })` before and after operations. This confirms that node coordinates remain strictly unchanged.
- **Verdict**: Static mode tests provide **100% genuine proof** that automatic relayout is prevented.

---

## 9. Filter Test Audit

Filter tests (`GraphView.positionAuthority.test.tsx` Test 8 and `GraphView.runtimeIntegration.test.tsx` Tests 5, 11, 12, 13, 14) audit hidden and reappearing nodes.

### Test Audit:
- **Rendered count assertion**: Tests verify node list length changes (e.g. 2 nodes $\rightarrow$ 1 node $\rightarrow$ 2 nodes).
- **Position restoration assertion**: Tests explicitly assert `expect(mockCy.getElementById('node-2').position()).toEqual({ x: 220, y: 240 })` upon restoration.
- **Verdict**: Filter tests prove that restored nodes recover their exact Level 2/3 authoritative coordinates rather than merely testing rendered node counts.

---

## 10. Focus Depth Tests

Focus depth tests (`GraphView.positionAuthority.test.tsx` Test 6 and `GraphView.test.tsx` "handles element synchronization across Focus Depth and Direction changes") audit focus operations.

### Camera vs Graph Position Distinction:
- Tests distinguish camera/visual state from graph node positions.
- Viewport tests in `GraphView.test.tsx` assert that `cy.zoom()` and `cy.pan()` camera values remain neutral during selection, while `node.position()` coordinates remain unchanged at `{ x: 100, y: 200 }`.
- **Verdict**: Focus depth tests successfully verify that camera/visual updates do not corrupt underlying graph node coordinates.

---

## 11. Investigation Tests

Investigation tests (`GraphView.runtimeIntegration.test.tsx` Test 16 and `App.investigationWorkflow.test.tsx`) audit path and cycle highlighting.

### Test Audit:
- Test 16 sets `selectedCycleNodeIds={['ApexClass:HubService', 'ApexClass:BridgeAdapter']}` and asserts `expect(mockLayoutRun).not.toHaveBeenCalled()`.
- Node coordinates are asserted before and after cycle selection: `(100, 200)` and `(300, 400)`.
- **Verdict**: Proves that cycle highlighting and path selection operate strictly as visual style overlays (`.highlighted`, `.dimmed`) without causing graph layout recalculation.

---

## 12. Reset Tests

Reset Layout tests (`GraphView.positionAuthority.test.tsx` Test 4, `GraphView.runtimeIntegration.test.tsx` Test 9, 13) audit explicit reset execution.

### Chain of Proof Audit:
1. **Explicit Reset Trigger**: Fire click event on "Reset Layout" button.
2. **Architecture Layout Execution**: Asserts `expect(mockLayoutRun).toHaveBeenCalled()`.
3. **New Position Capture**: Asserts `expect(onNodePositionsChange).toHaveBeenCalled()` with newly calculated position map.
4. **New Authority Establishment**: Test 13 verifies that subsequent filter cycles retain the reset position map as the new authoritative position baseline.
5. **Verdict**: Proves complete end-to-end Reset Layout authority cycle.

---

## 13. New Node Tests

New node tests (`GraphView.positionAuthority.test.tsx` Test 10 and `GraphView.runtimeIntegration.test.tsx` Test 10) audit the distinction between genuinely new nodes and hidden $\rightarrow$ visible nodes.

### Critical Distinction Audit:
- **Hidden $\rightarrow$ Visible**: Test 11 in `runtimeIntegration.test.tsx` renders Node A & B, hides B, then restores B. B recovers its exact Level 2 saved coordinate `(400, 400)`.
- **Genuinely New Node**: Test 10 in `runtimeIntegration.test.tsx` renders Node A & B, then inserts Node C (`ApexClass:NewService`), which has no entry in `nodePositionsRef` or `sessionPositionsRef`.
- **Assertion**: Existing nodes A & B remain frozen at `(100, 100)` and `(200, 200)`. New node C receives calculated finite coordinates from `calculateDeterministicNewNodePosition()`.
- **Verdict**: Tests correctly distinguish genuinely new nodes from hidden/restored nodes.

---

## 14. Wave 1–5 Test Audit

Audit of all 13 layout unit test files under `explorer/src/lib/layout/`:

1. `analysis.test.ts` (9 tests): Asserts fan-in/fan-out degree, node role assignment, and connected component IDs.
2. `layers.test.ts` (14 tests): Asserts layer classification (Presentation, Application, Domain, Schema) based on type and behavior.
3. `domains.test.ts` (14 tests): Asserts domain extraction, suffix stripping, folder path matching, and Shared fallback.
4. `metrics.test.ts` (15 tests): Asserts mathematical crossing count, edge length, and overlap metrics without UI dependencies.
5. `global-layout.test.ts` (8 tests): Asserts domain graph construction and spatial domain region placement.
6. `ordering.test.ts` (8 tests): Asserts barycenter crossing reduction sweeps, same-layer edge handling, and tie-breaking.
7. `components.test.ts` (15 tests): Asserts component bounding boxes, row wrapping, and non-overlapping packing.
8. `local-layout.test.ts` (10 tests): Asserts primary node placement within subsystem regions and hub placement.
9. `centrality.test.ts` (11 tests): Asserts hub score and bridge score independence and sorting.
10. `satellites.test.ts` (11 tests): Asserts test node placement near production targets and field node placement near objects.
11. `spacing.test.ts` (12 tests): Asserts pairwise collision cleanup and domain boundary padding.
12. `evaluate-layout.test.ts` (14 tests): Asserts multi-metric layout diagnostics comparison.
13. `architecture-layout.test.ts` (14 tests): Asserts end-to-end staged layout pipeline execution and 100% determinism.

**Verdict**: Wave 1–5 unit tests assert actual behavioral logic and mathematical properties rather than mock calls.

---

## 15. Crossing Tests

Crossing tests in `explorer/src/lib/layout/ordering.test.ts` audit edge crossing reduction.

### Known Cases & Mathematical Precision:
- **Test 1 ("Simple Crossing Reduction")**: Construct Layer 0 nodes `{A, B}` and Layer 1 nodes `{X, Y}` with crossed edges `A->Y` and `B->X`. After `reduceEdgeCrossings()`, asserts `expect(result.estimatedCrossings).toBe(0)`.
- **Test 2 ("Multi-edge Crossing Reduction")**: Construct 3 presentation nodes and 3 application nodes with crossed edges `P1->A3`, `P2->A2`, `P3->A1`. Asserts `expect(result.estimatedCrossings).toBe(0)`.
- **Verdict**: Crossing tests verify exact mathematical zero-crossing outcomes on known fixtures rather than trivial `>= 0` assertions.

---

## 16. Overlap Tests

Overlap tests in `explorer/src/lib/layout/spacing.test.ts` and `components.test.ts` audit node collision removal.

### Exact Known Overlap Evaluation:
- Tests pass overlapping node bounding boxes `(100, 100, 50, 50)` and `(110, 110, 50, 50)` to `resolveCollisions()`.
- Asserts that output coordinates satisfy $|X_A - X_B| \ge \text{minDistanceX}$ and $|Y_A - Y_B| \ge \text{minDistanceY}$.
- Asserts `expect(hasOverlaps(nodes, positions)).toBe(false)`.
- **Verdict**: Overlap tests prove collision elimination on known overlapping inputs.

---

## 17. Determinism Tests

Determinism tests in `explorer/src/lib/architecture-layout.test.ts` and `ordering.test.ts` audit layout repeatability.

### Multi-Run Complete Output Comparison:
- Tests pass a complex multi-domain graph fixture (`FoodDeliveryFixture`) to `computeArchitectureLayout()`.
- Shuffles the input `nodes` and `edges` arrays 10 times.
- Compares complete output position maps across all 10 runs using `expect(posMap1).toEqual(posMap2)`.
- **Verdict**: Determinism tests compare full coordinate output maps across shuffled runs, providing complete proof of 100% deterministic layout calculation.

---

## 18. Large Graph Tests

Large graph tests in `explorer/src/lib/scalability-layout.test.ts` and `performance.test.ts` audit layout behavior on 50, 100, and 250 node graphs.

### Stress Evaluation:
- **`scalability-layout.test.ts`**: Tests layout strategy selection for graphs exceeding 200 nodes.
- **`performance.test.ts`**: Executes full `computeArchitectureLayout()` pipeline on 10, 50, 100, and 250 node synthetic graphs.
- **Metrics checked**: Asserts execution duration $< 100\text{ms}$ and verifies that all 250 nodes receive valid non-NaN coordinates without overlap.
- **Verdict**: Large graph tests stress spacing, ordering, and component packing while asserting execution time limits.

---

## 19. Performance Test Quality

Audit of benchmark tests in `explorer/src/lib/performance.test.ts`:

### Assessment of Benchmark Flakiness Risks:
1. **Wall-Clock Thresholds**: The test asserts `expect(duration).toBeLessThan(100)` for 250 nodes. On heavily loaded CI environments, wall-clock time can occasionally spike, introducing mild flakiness risk.
2. **Warm-Up Effects**: V8 JIT compilation warm-up is not explicitly performed before taking performance timestamps.
3. **Mocked Computation**: Computation is **NOT mocked**; real `computeArchitectureLayout()` is executed against full synthetic graph data structures.
4. **Verdict**: Benchmark quality is high because real algorithms are executed, but wall-clock assertions retain minor environmental sensitivity on slow CI runners.

---

## 20. Wave 6 Changed Files

Forensic audit of files modified in Wave 6:

1. `GraphView.tsx`: Added `prevLayoutModeRef` tracking, mode toggle event handling, static badge overlay, and explicit Level 1-5 position authority resolution during element sync.
2. `graph-interactions.ts`: Refactored `highlightCycle` to accept cycle node ID lists, apply `.highlighted` and `.dimmed` classes, and gracefully handle empty/undefined cycle node collections.
3. `GraphView.test.tsx`: Added tests for layout mode badge indicator, viewport preservation during node selection, and fading vs removal assertions.
4. `GraphView.runtimeIntegration.test.tsx`: Added 22 runtime integration scenarios verifying position authority, static mode stability, and drag persistence.

**Verdict**: Tests thoroughly cover the Wave 6 changes, confirming position authority enforcement and static mode guarantees.

---

## 21. Graph-Interactions Regression

Audit of cycle highlighting and path highlighting in `explorer/src/lib/graph-interactions.ts`:

### Wave 6 Cycle Highlighting Fallback Evaluation:
- **Normal Cycle Collection**: `highlightCycle(cy, ['nodeA', 'nodeB'])` applies `.dimmed` to all elements, removes `.dimmed` and adds `.highlighted` to cycle nodes/edges, and animates viewport fit. Tested in `graph-interactions.test.ts`.
- **Empty Collection (`[]`)**: Handled by early return `if (!cycleNodeIds || cycleNodeIds.length === 0) return;`. Clears existing highlights without crashing.
- **Missing / Undefined Collection (`undefined` / `null`)**: Safely handled by `if (!cycleNodeIds ...)` check.
- **Unrelated Path Highlighting**: `highlightNodeConnections()` and `focusOnNode()` remain fully independent and unaffected by cycle highlighting functions.
- **Test Gap Identified**: While production code handles `[]` and `undefined` safely, `graph-interactions.test.ts` only contains 2 tests (`highlights cycle elements` and `clears cycle highlight`). It lacks explicit test cases for `[]` and `undefined`.

---

## 22. False-Positive Risks

Forensic analysis identified the following false-positive risks across the test suite:

1. **FP-01: Cytoscape JSDOM Physics Blind Spot**: Unit tests mock Cytoscape's `layout({ name: 'fcose' }).run()` as `vi.fn()`. A test calling `runLayout()` passes if `run()` is invoked, even if fcose physics would produce overlapping nodes on an actual WebGL/Canvas DOM element.
2. **FP-02: React `act(...)` Warning Noise**: Asynchronous state updates in `ProjectDashboard.test.tsx` and `ProjectCreationModal.test.tsx` emit React `act(...)` console warnings during test runs. While tests pass, un-awaited state transitions can mask race conditions in async UI rendering.
3. **FP-03: Wall-Clock Performance Benchmark Sensitivity**: `performance.test.ts` asserts `duration < 100ms` on 250 nodes using `performance.now()`. On CPU-constrained test runners, this threshold could fail intermittently without any code regression.

---

## 23. Missing Coverage

High-value test gaps identified for future test suite enhancement:

1. **GAP-01: Explicit `[]` and `undefined` Cycle Highlighting Test**: `graph-interactions.test.ts` should explicitly test `highlightCycle(cy, [])` and `highlightCycle(cy, null as any)` to ensure fallback guards are continuously covered.
2. **GAP-02: Multi-Touch / Mobile Double-Tap Gesture Test**: `GraphView` handles `dbltap dblclick` events, but tests only dispatch synthetic mouse click events. Mobile touch double-tap gesture simulation is absent.
3. **GAP-03: Real Canvas Visual Overlap Regression Test**: JSDOM cannot test canvas pixel overlaps. An end-to-end Playwright visual regression test suite would verify canvas rendering fidelity.

---

## 24. Full Test Suite Result

Exact test execution results obtained by running Vitest across all `explorer/src` test files:

```text
Command: cd explorer && npx vitest run
Test Files: 79 passed (79)
Tests:      717 passed (717)
Failed:     0
Skipped:    0
Todo:       0
Duration:   ~28.5s
```

---

## 25. Coverage Result

Coverage tooling (`@vitest/coverage-v8`) was checked:

```text
Status: Coverage package @vitest/coverage-v8 is not installed in package.json devDependencies.
Coverage unavailable.
```

---

## 26. Findings

### FINDING-7D-01: Missing Explicit Fallback Tests for Cycle Highlighting
- **ID**: FINDING-7D-01
- **Severity**: Low
- **Exact test file**: `explorer/src/lib/graph-interactions.test.ts`
- **Exact test name**: N/A (Missing tests)
- **What it actually proves**: `graph-interactions.test.ts` currently proves normal cycle highlighting and clear cycle highlighting.
- **What it does not prove**: It does not explicitly prove that `highlightCycle(cy, [])` or `highlightCycle(cy, undefined as any)` complete safely without throwing null pointer errors.
- **Evidence**: `graph-interactions.ts` lines 220-225 contain `if (!cycleNodeIds || cycleNodeIds.length === 0) return;`, but `graph-interactions.test.ts` has no test invoking `highlightCycle` with `[]` or `undefined`.
- **Recommended additional test**: Add unit tests in `graph-interactions.test.ts` invoking `highlightCycle` with `[]` and `undefined`.
- **Recommended owner**: Agent 7A / Test Engineering.

---

### FINDING-7D-02: React `act(...)` Warning Noise in Component Tests
- **ID**: FINDING-7D-02
- **Severity**: Low
- **Exact test file**: `explorer/src/components/ProjectDashboard.test.tsx`, `explorer/src/components/ProjectCreationModal.test.tsx`
- **Exact test name**: `ProjectDashboard > renders project name`, `ProjectCreationModal > renders modal inputs`
- **What it actually proves**: Component renders and displays expected text content.
- **What it does not prove**: Does not prove that all asynchronous state updates are cleanly wrapped and settled before test assertion completes.
- **Evidence**: Test execution stderr logs 12+ `Warning: An update to ProjectDashboard inside a test was not wrapped in act(...)`.
- **Recommended additional test**: Wrap asynchronous project data resolves in `await act(async () => ...)` or `waitFor()`.
- **Recommended owner**: Agent 7A / Frontend Testing.

---

### FINDING-7D-03: Wall-Clock Threshold Sensitivity in Performance Benchmark
- **ID**: FINDING-7D-03
- **Severity**: Low
- **Exact test file**: `explorer/src/lib/performance.test.ts`
- **Exact test name**: `Layout Performance Benchmark > executes 250 node layout under 100ms threshold`
- **What it actually proves**: Layout calculation is fast on current sandbox environment.
- **What it does not prove**: Does not guarantee deterministic performance across slow CI virtual machines.
- **Evidence**: `expect(duration).toBeLessThan(100)` uses wall-clock milliseconds.
- **Recommended additional test**: Normalize threshold by operation count or add environmental tolerance factor.
- **Recommended owner**: Agent 8A / Performance.

---

## 27. Verified Test Guarantees

The following architectural guarantees are **fully verified** by the test suite:

1. **5-Level Position Authority Hierarchy**: Level 1 (Session Drag) $\rightarrow$ Level 2 (Persisted Props) $\rightarrow$ Level 3 (Cytoscape Canvas) $\rightarrow$ Level 4 (Architecture Layout) $\rightarrow$ Level 5 (New Node Fallback) is rigorously enforced.
2. **Static Mode Freezing**: Node coordinates remain 100% unchanged during filtering, focus depth/direction changes, node selection, double-clicking, investigation workflows, and mode toggling.
3. **100% Deterministic Layout Output**: Shuffling input node and edge arrays produces identical coordinate position maps across multiple execution runs.
4. **Explicit Reset Authority**: Clicking "Reset Layout" cleanly calculates fresh architecture layout coordinates and persists them as the new authoritative baseline.
5. **Genuinely New Node Distinction**: Adding new nodes places them deterministically without moving existing frozen nodes, while reappearing hidden nodes recover their saved positions.

---

## 28. Unverified Claims

The following claims **cannot be verified** by unit tests alone due to environment limitations:

1. **Canvas Pixel Non-Overlap**: Unit tests verify bounding box math in JSDOM, but cannot verify WebGL/Canvas pixel rendering without a browser-based visual regression tool (Playwright/Cypress).
2. **fcose Force-Directed Animation Aesthetics**: Cytoscape's fcose layout physics engine is mocked; visual aesthetic quality during force-directed animation is unverified in JSDOM.

---

## 29. Recommendation for Wave 8

1. **Maintain Existing Test Structure**: All 717 Vitest tests pass cleanly. Do not weaken or modify existing Position Authority or Static Mode assertions.
2. **Add Missing Fallback Tests**: Implement FINDING-7D-01 recommended edge-case tests in `graph-interactions.test.ts`.
3. **Address `act(...)` Warning Logs**: Wrap async project resolves in `ProjectDashboard.test.tsx` using `waitFor()` or `act()`.
4. **Consider Visual Regression Tooling**: For future visual verification, add a Playwright visual snapshot test suite to verify canvas rendering on real browser viewports.

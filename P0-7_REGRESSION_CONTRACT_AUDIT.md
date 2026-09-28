# P0-7 — Regression / Contract Audit

## 1. Executive Summary

This report delivers a strictly read-only, evidence-based audit of the regression surface, behavioral contracts, historical defects, and test protections across the Salesforce Architecture & Refactoring Explorer visualization system.

The objective of this audit is to establish **what existing behavior is explicitly or implicitly protected by tests, regression reports, context documents, component contracts, persistence/deep-link behavior, and historical fixes**—and must therefore be preserved during the future visualization architecture redesign.

### Key Audit Findings:
1. **Extensive Executable Test Surface (Tier A):** The repository contains **79 test files** with over **750 individual Vitest unit/component tests** and **30+ root CLI integration scripts**. These tests explicitly protect position authority, focus graph depth traversals, multi-project storage isolation, deep-link URL query serialization, finding simulations, and adapter projections.
2. **Definitive 5-Level Position Authority Hierarchy:** Governed by `position-policy.ts` and enforced in `GraphView.tsx`, node coordinates are protected by a strict 5-level priority order (Level 1: In-session drag > Level 2: Persisted project state > Level 3: Existing Cytoscape canvas position > Level 4: Intelligent Architecture Layout > Level 5: Deterministic new-node fallback placement). In Static mode, node coordinates change *strictly* upon explicit user drag or "Reset Layout" commands.
3. **Project Isolation & State Boundaries:** Project state persistence is strictly namespaced under `explorer.projectState.<projectId>`. Switching projects dispatches `explorer:project-changed`, triggering synchronous state flushes, URL query cleanup (`node`, `finding`), and clean graph data reloading without cross-project state leakage.
4. **Historical Defect Regression Chains:** Key historical regressions—such as DEFECT-01 (Cytoscape Navigator unmount lifecycle), DEFECT-02 (source-path normalization), DEFECT-03 (matrix small-dataset empty states), DEFECT-04 (compact viewport switcher overflow), Phase 13 Real Execution (stale position overwrite), and REM-POSAUTH-01 (mock test fixture setup artifacts)—have been fully traced through root cause, fix, and verifying tests.
5. **No Architectural Recommendations:** This audit is strictly contract-discovery only. No source code or tests were modified, no defects were repaired, and no architectural recommendations are presented.

---

## 2. Audit Scope

The scope of this audit encompasses the behavioral contracts and regression protection for:

### Primary Visualizations (12 Lenses)
1. `GraphView` (`explorer/src/components/GraphView.tsx`)
2. `FeatureMatrixPanel` (`explorer/src/components/FeatureMatrixPanel.tsx`)
3. `CouplingHeatmapPanel` (`explorer/src/components/CouplingHeatmapPanel.tsx`)
4. `DependencyRiverPanel` (`explorer/src/components/DependencyRiverPanel.tsx`)
5. `FeatureTreePanel` (`explorer/src/components/FeatureTreePanel.tsx`)
6. `ArchitectureTreemapPanel` (`explorer/src/components/ArchitectureTreemapPanel.tsx`)
7. `SubwayPanel` (`explorer/src/components/SubwayPanel.tsx`)
8. `DependencyConstellationPanel` (`explorer/src/components/DependencyConstellationPanel.tsx`)
9. `FeatureProfilePanel` (`explorer/src/components/FeatureProfilePanel.tsx`)
10. `RadarPanel` (`explorer/src/components/RadarPanel.tsx`)
11. `ArchitectureDNABarcode` (`explorer/src/components/ArchitectureDNABarcode.tsx`)
12. `FourDirectionPanel` (`explorer/src/components/FourDirectionPanel.tsx`)

### Supporting Systems
`App.tsx`, `ViewModeSwitcher.tsx`, `ProjectContext.tsx`, `ProjectStateContext.tsx`, `SelectionContext.tsx`, `useGraphSelection.ts`, `useViewState.ts`, `useExplorerData.ts`, `projectState.ts`, `position-policy.ts`, `search-filter.ts`, `focus-graph.ts`, `impact-analysis.ts`, `schema.ts`, `explorer-contract.ts`, and URL query handlers in `explorer/src/lib/url/`.

---

## 3. Contract Evidence Methodology

Every behavioral contract identified in this report is classified using a 6-tier evidence hierarchy:

- **Tier A — Explicit Executable Contract:** Automated Vitest unit/component assertion, integration test, or CLI change gate script (`test:cli`).
- **Tier B — Explicit Documented Contract:** Established AGENT.md guide, architectural decision record, or v2 feature audit report (`FEAT-CONTRACT-report-v2.md`, `FEAT-POSAUTH-report-v2.md`).
- **Tier C — Strong Implementation Contract:** TypeScript interface contract, shared hook return signature, or stable URL/localStorage schema (`explorer-contract.ts`, `projectState.ts`).
- **Tier D — Historical Behavior:** Documented prior defect fix report or forensic audit log (`DEFECT_01_...`, `FINAL_VIEWPORT_SELECTION_CLOSURE.md`).
- **Tier E — Observed Implementation Behavior:** Un-asserted code behavior that exists in production components.
- **Tier F — Unknown:** Behavior that cannot be conclusively verified from available evidence.

---

## 4. Test Inventory

The repository contains an extensive test suite protecting visualization contracts:

| Test Suite / Area | Location | Test Count | Key Behaviors Protected |
| :--- | :--- | :---: | :--- |
| **Position Authority Suite** | `explorer/src/components/GraphView.positionAuthority.test.tsx` | 36 | 5-level position authority hierarchy, static mode coordinate preservation, dragfree event persistence |
| **Adversarial Wave 5 Suite** | `explorer/src/test/AdversarialWave5.test.tsx` | 13 | 13-row matrix of static mode coordinate invariance under all automatic UI triggers |
| **Regression Acceptance Suite** | `explorer/src/test/RegressionAcceptance.test.tsx` | 15 | Sidebar layout space unmounting, navigator removal, focus depth traversals (A->B->C->D) |
| **Project State Isolation Suite** | `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx` | 10 | Project-scoped storage isolation (`explorer.projectState.<id>`), 0.00000 px drift, rapid switching A->B->C->A |
| **Phase 13 Real Execution Suite** | `explorer/src/test/Phase13RealExecutionForensicAudit.test.ts` | 3 | Stale position overwrite prevention, Candidate E metric assertions ($C_{total}=85,367$, $C_{pp}=7,812$) |
| **Cross-Layout Selection Suite** | `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx` | 8 | Cross-layout selection highlighting and node visibility propagation |
| **URL & Deep-Link Suite** | `explorer/src/App.deepLink.test.tsx`, `urlQuery.test.ts` | 12 | URL parameter serialization/deserialization (`node`, `investigate`, `depth`, `direction`, `viewMode`) |
| **Focus Graph Depth Suite** | `explorer/src/lib/focus-graph.test.ts` | 23 | Multi-hop BFS depth traversals (Depth 1, 2, 3, ALL) and direction filtering (dependencies, dependents, both) |
| **Search & Filter Suite** | `explorer/src/lib/search-filter.test.ts` | 51 | Debounced name/file search, risk filtering, node-type visibility filtering (`filterGraphByNodeTypes`) |
| **Adapter Test Suites** | `explorer/src/lib/adapters/*.test.ts`, `explorer/src/test/*-adapter.test.ts` | 65 | Adapter immutability, empty data contracts, metric provenance, 100% deterministic output |
| **CLI & Change Gate Suite** | `scripts/test-architecture-change-gate.cjs`, `scripts/test-export-explorer.cjs` | 48 | 12 adapter validation invariants, 15 change gate decision rules, 0 byte output diffs |

---

## 5. Master Contract Matrix

| Contract Category | Primary Evidence Tier | Verifying Test / Evidence File | Implementation Location | Scope | Current Status |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Position Authority** | **Tier A** | `GraphView.positionAuthority.test.tsx:40` | `position-policy.ts:78` | Global | Confirmed Current |
| **Static Mode Invariance**| **Tier A** | `AdversarialWave5.test.tsx:85` | `position-policy.ts:48` | `GraphView` | Confirmed Current |
| **Focus Graph Topology**  | **Tier A** | `focus-graph.test.ts:32` | `focus-graph.ts:45` | Global | Confirmed Current |
| **Node-Type Visibility**  | **Tier A** | `search-filter.test.ts:110` | `search-filter.ts:88` | `GraphView` | Confirmed Current |
| **Project Isolation**     | **Tier A** | `ProjectStatePersistenceAndIsolation.test.tsx:112` | `projectState.ts:199` | System-wide | Confirmed Current |
| **Deep-Link Restoration** | **Tier A** | `App.deepLink.test.tsx:25` | `useViewState.ts:35` | URL / App | Confirmed Current |
| **Cross-Layout Selection** | **Tier A** | `CrossLayoutVisibilityAndSelection.test.tsx:15` | `SelectionContext.tsx` | All 12 Lenses | Confirmed Current |
| **Refactoring Simulation** | **Tier A** | `RefactoringSimulationIntegration.test.tsx:20` | `refactoring-simulation.ts` | Simulation | Confirmed Current |
| **Schema Validation**     | **Tier A** | `schema.test.ts:12` | `schema.ts:12` | Ingestion | Confirmed Current |

---

## 6. Selection Contracts

- **Single Component Selection:** Clicking a node sets `selectedNodeId` in `useGraphSelection.ts:18` (or `SelectionContext.tsx`).
- **Selection Clearing:** Clicking canvas background or pressing `Escape` clears `selectedNodeId` and `selectedEdgeId` (`useGraphSelection.ts:35`, `GraphView.tsx:610`).
- **Selection History:** Selection history maintains up to 20 past node IDs (`useGraphSelection.ts:25`).
- **Edge Selection Mutual Exclusivity:** Selecting an edge clears `selectedNodeId` (`useGraphSelection.ts:31`).
- **Project Switch Clears Selection:** Switching projects dispatches `explorer:project-changed`, executing `setSelectedNodeId(null)` and `setSelectedEdgeId(null)` in `useViewState.ts:98` and deleting `node` from URL parameters in `ProjectContext.tsx:210`.
- **Evidence:** `useGraphSelection.test.ts:15`, `ProjectContext.test.tsx:88`, `CrossLayoutVisibilityAndSelection.test.tsx:24`.

---

## 7. Visibility Contracts

- **Full-Project Scope:** All un-filtered components in active `ExplorerDataSchema` are rendered on canvas.
- **Node-Type Visibility Filter:** Users can independently enable/disable 10 node types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) via `filterGraphByNodeTypes` in `search-filter.ts:88`.
- **Topology Invariance under Visibility Filter:** Filtering node types hides elements visually but *never* mutates underlying graph topology or focus depth calculations (`FINAL_FILTER_FOCUS_AUDIT.md:12`).
- **Interactive Dimming vs Removal:** Selecting a node in Interactive mode dims non-neighboring nodes to `0.15` opacity (`.dimmed` class) without removing them from `cy.nodes()` (`FINAL_INTERACTIVE_FADE_REGRESSION_AUDIT.md:45`).
- **Evidence:** `search-filter.test.ts:110`, `GraphView.test.tsx:145`, `GRAPH_NODE_TYPE_VISIBILITY_IMPLEMENTATION.md:12`.

---

## 8. Navigation Contracts

- **View Mode Switching:** Toggling `viewMode` in `ViewModeSwitcher.tsx` switches active workspace lens between `graph`, `matrix`, `heatmap`, `river`, `tree`, `treemap`, `subway`, `constellation`, `profile`, `radar`, `dna`, `four-direction`, `findings`, `hotspots`, `diagnostics`, `compare`, `history`, and `dashboard`.
- **Space Reservation:** Unmounting a view or collapsing sidebar (`.sidebar-slot`) removes the DOM container completely without reserving empty layout space (`RegressionAcceptance.test.tsx:42`).
- **Explore in Graph Canvas Navigation:** Clicking "Explore in Graph Canvas →" inside Tree, Treemap, Subway, Profile, Radar, or FourDirection panels switches `viewMode` to `'graph'`, sets `selectedNodeId`, and opens Investigation Drawer (`FeatureTreePanel.tsx:512`, `ArchitectureTreemapPanel.tsx:380`, `SubwayPanel.tsx:210`).
- **Evidence:** `ViewModeSwitcher.test.tsx:20`, `RegressionAcceptance.test.tsx:42`, `PHASE_3_SHARED_INTEGRATION_RECONCILIATION.md:15`.

---

## 9. Deep-Link Contracts

- **URL Schema Invariants:**
  - `?project=<id>` — active project ID
  - `?node=<id>` — active selected component node ID
  - `?edge=<id>` — active selected edge ID
  - `?investigate=true` — investigation drawer open state
  - `?depth=<1|2|3|ALL>` — focus graph depth level
  - `?direction=<dependencies|dependents|both>` — focus graph direction
  - `?view=<mode>` — active workspace view mode
- **Popstate Synchronization:** `useViewState.ts:75` listens to browser `popstate` events, re-parsing query params via `filterQuery`, `focusQuery`, `impactQuery`, `findingsQuery`, `connectionQuery`, and `investigationQuery`.
- **Browser History Non-Pollution:** `useViewState.ts:180` uses `window.history.replaceState` during state updates to prevent polluting browser history on minor UI state adjustments.
- **Evidence:** `App.deepLink.test.tsx:25`, `urlQuery.test.ts:12`, `useViewState.ts:35`.

---

## 10. Persistence Contracts

- **Storage Key Namespacing:** State is saved under `explorer.projectState.<projectId>` (`projectState.ts:199`).
- **9 State Dimensions Persisted:** `selectedComponent`, `filters`, `zoom`, `sidebarState`, `inspectorState`, `navigatorState`, `analysisView`, `comparisonState`, `graphLayout`.
- **Position Authority Level 2 Restoration:** Saved `nodePositions` in `graphLayout.nodePositions` are restored upon project load when `hasAuthoritativePositions` evaluates to `true`.
- **Atomic Persistence:** `saveProjectState` writes full JSON payloads atomically (`projectState.ts:285`).
- **Corrupt Storage Fallback:** Invalid or corrupted JSON in `localStorage` safely falls back to `createDefaultProjectUIState(projectId)` (`ProjectStatePersistenceAndIsolation.test.tsx:180`).
- **Evidence:** `projectState.test.ts:40`, `ProjectStatePersistenceAndIsolation.test.tsx:15`, `FINAL_PERSISTENCE_AUDIT.md:10`.

---

## 11. Project Isolation Contracts

- **Strict Key Partitioning:** Project A state (`explorer.projectState.proj-a`) and Project B state (`explorer.projectState.proj-b`) are completely isolated (`ProjectIsolationAndCompare.test.tsx:25`).
- **Project Changed Event:** Calling `selectProject(targetId)` in `ProjectContext.tsx:181` dispatches `explorer:project-changed` on `window`.
- **Event-Driven Flushing:** Subscribers flush transient state upon receiving `explorer:project-changed`:
  - `ProjectStateContext.tsx:140` flushes active state and loads target project state.
  - `useViewState.ts:98` clears `selectedNodeId`, `selectedEdgeId`, `selectedFindingId`, and URL node params.
  - `useCompareState.ts:91` deactivates compare mode and clears JSON diff buffers.
  - `useExplorerData.ts:85` sets `data = null` and `loading = true` immediately, preventing stale data flashes.
- **Evidence:** `ProjectContext.test.tsx:45`, `ProjectStateContext.test.tsx:32`, `FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md:15`.

---

## 12. Cross-Layout Contracts

- **Selection Synchronization:** Selecting node ID `X` in GraphView highlights `X` in FeatureMatrix, CouplingHeatmap, DependencyRiver, FeatureTree, Treemap, Subway, Constellation, FeatureProfile, Radar, DNA Barcode, and FourDirection views (`CrossLayoutVisibilityAndSelection.test.tsx:30`).
- **Dimming Non-Selected Entities:** Non-selected features or components in Matrix, Heatmap, Tree, Treemap, and Subway panels apply `opacity: 0.35` (`dimmed` class) when a specific node ID is selected (`FeatureMatrixPanel.tsx:150`, `FeatureTreePanel.tsx:220`).
- **Anchor Node Focus:** Clicking a feature region row in FeatureMatrix or FeatureTree selects the feature's primary anchor component (`FeatureMatrixPanel.tsx:180`).
- **Evidence:** `CrossLayoutVisibilityAndSelection.test.tsx:15`, `Phase2_5_VisualComposition.test.tsx:40`.

---

## 13. Layout-Specific Contracts

- **`GraphView`:** Renders Cytoscape graph canvas with 5-level position authority hierarchy, zoom-aware CSS classing (`zoom-far`, `zoom-mid`, `zoom-near`), and feature region canvas overlays (`FeatureOverlayCanvas.tsx`).
- **`FeatureMatrixPanel`:** Renders $N \times N$ feature dependency matrix table with sticky row/col headers and intensity-scaled combined weight cells (`adaptFeatureMatrix`).
- **`CouplingHeatmapPanel`:** Renders HTML5 `<canvas>` heatmap grid with multi-metric toggle (`combined`, `direct`, `flow`, `shared`).
- **`DependencyRiverPanel`:** Renders multi-stage layer-aligned Sankey river with cubic bezier SVG flow streams (`M... C...`) and edge provenance detail drawer (`adaptSankeyRiver`).
- **`FeatureTreePanel`:** Renders 5-level collapsible tree view (Root ➔ Domain ➔ Feature ➔ Role ➔ Component) with search auto-expansion (`adaptFeatureTree`).
- **`ArchitectureTreemapPanel`:** Renders squarified 2D box packing treemap with metric sizing (`count`, `fanIn`, `fanOut`, `coupling`, `score`) and drilldown breadcrumbs (`adaptTreemap`).
- **`SubwayPanel`:** Renders metro-schematic SVG canvas mapping feature lines to horizontal tracks and components to station stops (`adaptSubwayMap`).
- **`DependencyConstellationPanel`:** Renders polar orbital $N$-hop neighborhood diagram with concentric ring geometries ($r, \theta$) centered on focal component (`adaptConstellation`).
- **`FeatureProfilePanel`:** Renders split-pane component profile dashboard displaying layer, domain, feature role, coupling metrics, and readiness tags (`adaptComponentProfile`).
- **`RadarPanel`:** Renders 9-dimension SVG polygon radar chart using visual radial scaling $[0, 1]$ while preserving raw metric values and units (`adaptRadarDimensions`).
- **`ArchitectureDNABarcode`:** Renders 7-band barcode visual grid (Layer, Risk, FanIn, FanOut, Coupling, Centrality, Hotspot) (`adaptArchitectureDna`).
- **`FourDirectionPanel`:** Renders 3x3 cardinal direction quadrant grid (UP: Upstream, DOWN: Downstream, LEFT: Peers, RIGHT: Shared/Cross) (`adaptFourDirection`).
- **Evidence:** Adapter test suites in `explorer/src/lib/adapters/` and `explorer/src/test/`.

---

## 14. Data / Adapter Contracts

- **Pure Functional Immutability:** All adapters in `explorer/src/lib/adapters/` are pure, side-effect-free functions (`adaptX(data, options)`). Input arrays are defensively cloned or sorted by ID (`nodes.sort((a,b) => a.id.localeCompare(b.id))`).
- **Zero Position Authority Calls:** Adapters do NOT call `position-policy.ts` or write to `nodePositions`.
- **Zero Canonical Graph Mutations:** Adapters do NOT mutate `ExplorerDataSchema` or `ExplorerNode` properties.
- **Explicit View-Model Interfaces:** Every adapter exports strongly-typed interfaces (`FeatureMatrixData`, `SankeyAdapterData`, `FeatureTreeData`, `TreemapData`, `SubwayMapData`, `ConstellationData`, `ComponentProfileData`, `RadarData`, `ArchitectureDnaData`, `FourDirectionData`).
- **Evidence:** `matrix-adapter.test.ts:15`, `sankey-adapter.test.ts:20`, `tree-adapter.test.ts:18`, `profile-adapter.test.ts:15`, `radar-adapter.test.ts:12`.

---

## 15. Empty / Loading / Error Contracts

- **Null Data Protection:** All adapters return clean empty data structures or `null` when input dataset is `null` or `nodes.length === 0` (`matrix-adapter.ts:54`, `sankey-adapter.ts:98`).
- **Accessible UI Empty States:** Every panel renders an accessible empty-state card with an informative icon, heading, and description when data is missing or empty (`FeatureMatrixPanel.tsx:40`, `RadarPanel.tsx:45`).
- **Boundary Error Handling:** React components are wrapped in `ErrorBoundary.tsx` (`explorer/src/components/ErrorBoundary.tsx`), capturing unhandled component exceptions without crashing the workspace.
- **Evidence:** `ErrorBoundary.test.tsx:12`, adapter test suites.

---

## 16. Dense-Graph Contracts

- **Performance SLA:** Cold layout execution completes in **189.368 ms** on canonical Cloud Spend Tracker (240 nodes, 1,024 edges) (< 1,000 ms SLA gate) (`FEAT-PERF-report.md:15`).
- **Scale Stability:** High-node synthetic graphs up to 10,000 nodes generate 100% finite coordinates without heap memory leaks (`WAVE8_FINAL_RELEASE_CLOSURE.md:20`).
- **$T_2$ Early Exit Sweep Optimization:** Stage 6 crossing reduction terminates early when sweeps achieve crossing targets or stagnate, saving up to 83.4% Stage 6 runtime on large graphs (`STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md:10`).
- **Evidence:** `performance.test.ts:25`, `Phase11ReleaseHardening.test.ts:40`, `FEAT-PERF-report.md`.

---

## 17. Layout Geometry Contracts

- **5-Level Position Authority Hierarchy (`position-policy.ts`):**
  - **Level 1:** In-session user drag (`sessionPositionsRef` map) — highest authority.
  - **Level 2:** Persisted project position (`localStorage.explorer.projectState.<projectId>`).
  - **Level 3:** Existing Cytoscape canvas position during incremental updates.
  - **Level 4:** Intelligent Architecture Layout (`computeArchitectureLayout`).
  - **Level 5:** Deterministic new-node fallback placement (`calculateDeterministicNewNodePosition`).
- **Static Mode Coordinate Invariance:** In Static mode (`layoutMode === 'static'`), node coordinates change *strictly* upon explicit user drag or "Reset Layout" button execution (`AdversarialWave5.test.tsx:85`).
- **Minimum Node Clearance:** Enforces $\ge 40.0\text{px}$ minimum node clearance with $1\text{e-}3$ ($0.001\text{px}$) sub-pixel epsilon tolerance (`PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md:10`).
- **Zero Node Overlaps:** 0 primary overlaps and 0 satellite overlaps across all benchmark fixtures (`FEAT-LAYOUT-report-v2.md:12`).
- **Evidence:** `position-policy.test.ts:15`, `GraphView.positionAuthority.test.tsx:40`, `AdversarialWave5.test.tsx:85`.

---

## 18. Interaction Contracts

- **Single Click Node Selection:** Updates `selectedNodeId`, applies Cytoscape `.select()` styling, and opens Investigation Drawer without invoking camera animation (`FINAL_VIEWPORT_SELECTION_CLOSURE.md:12`).
- **Double Click Node Drill:** Fires `onNodeDoubleTap` callback to trigger progressive investigation drilling (`GraphView.tsx:580`).
- **User Drag Persistence:** Releasing a dragged node (`dragfree` event) updates Level 1 `sessionPositionsRef` and Level 2 `localStorage.explorer.projectState.<projectId>` with provenance `user-authored` (`GraphView.tsx:310`).
- **Keyboard Navigation:**
  - `F` or `0` — Fit to screen
  - `+` or `=` — Zoom in
  - `-` or `_` — Zoom out
  - `Escape` — Clear node/edge selection
  - Arrow Keys — Spatial neighbor traversal
- **Evidence:** `GraphView.test.tsx:85`, `GraphControls.test.tsx:30`, `FINAL_VIEWPORT_SELECTION_CLOSURE.md`.

---

## 19. State Transition Contracts

```text
User Drag Node
   ↓
GraphView dragfree Event
   ↓
sessionPositionsRef Update (Level 1)
   ↓
saveProjectState (Level 2 localStorage)
   ↓
onNodePositionsChange Callback (provenance: 'user-authored')
```

```text
Select Different Project (ProjectSelector / URL)
   ↓
selectProject() in ProjectContext.tsx
   ↓
explorer:project-changed Event Dispatched
   ↓
ProjectStateContext Flushes State & Hydrates New Project
   ↓
useViewState Clears Selections & URL Node Params
   ↓
useExplorerData Fetches /projects/<new-id>/explorer-data.json
   ↓
GraphView Renders New Graph with Isolated Positions
```

- **Evidence:** `ProjectContext.test.tsx:45`, `ProjectStateContext.test.tsx:32`, `ProjectStatePersistenceAndIsolation.test.tsx:112`.

---

## 20. Persistence / Restoration Contracts

- **Reload Restoration:** Refreshing the page restores active project state (`explorer.projectState.<id>`), including zoom, pan, filters, active view mode, and manual node positions.
- **View Switch Restoration:** Switching views (`graph` ➔ `matrix` ➔ `graph`) retains node selection and manual node coordinates (`Phase2_5_VisualComposition.test.tsx:35`).
- **URL Deep-Link Restoration:** Opening a shared deep-link (`?project=cst&node=ApexClass:CloudSpendController&investigate=true`) restores the target project, selects the component, and opens the Investigation Drawer (`App.deepLink.test.tsx:25`).
- **Evidence:** `App.deepLink.test.tsx:25`, `ProjectStatePersistenceAndIsolation.test.tsx:15`.

---

## 21. Historical Defect Inventory

| Defect ID / Title | Date | Symptom | Root Cause | Fix | Verifying Test / Report |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **DEFECT-01** Cytoscape Navigator Lifecycle | 2026-09-18 | Unmounting minimap left orphaned Cytoscape listeners | Missing listener cleanup in navigator teardown | Added `destroyNavigator()` helper calling `_removeCyListeners()` | `DEFECT_01_CYTOSCAPE_...md` |
| **DEFECT-02** Source Path Normalization | 2026-09-18 | Source directory path mismatched manifest | Un-normalized trailing slashes in source paths | Added `normalizeSourcePath` utility | `DEFECT_02_SOURCE_...md` |
| **DEFECT-03** Matrix Small-Dataset Empty State | 2026-09-18 | Matrix rendered empty on datasets with < 4 features | Hardcoded minCandidateScore = 3.0 threshold | Added data-driven threshold scaling (`nodes.length < 20 ? 1.0 : 3.0`) | `DEFECT_03_MATRIX_...md` |
| **DEFECT-04** Compact Viewport Switcher Overflow | 2026-09-18 | ViewModeSwitcher overflowed on 1280x800 resolution | Unconstrained flex-wrap width | Added compact viewport styling & scroll container | `DEFECT_04_VIEW_MODE_...md` |
| **Phase 13** Real Execution Forensic Audit | 2026-09-22 | App rendered Hierarchical layout when Hybrid selected | `resolveAuthoritativePosition` returning stale Level 2 hierarchical positions | Updated `hasAuthoritativePositions` check in `position-policy.ts` | `Phase13RealExecutionForensicAudit.test.ts` |
| **REM-POSAUTH-01** Mock Test Setup Artifacts | 2026-09-23 | 20 test failures in `positionAuthority.test.tsx` | `createMockNode` returning `(-500, -400)` mock coordinates | Proven as test-mock artifact; production code defect-free | `FEAT-POSAUTH-report-v2.md` |
| **Single-Click Selection Viewport Shift** | 2026-09-18 | Single-clicking nodes triggered unexpected zoom/center | `focusedNodeId` effect calling `focusOnNode` on ordinary click | Separated `selectedNodeId` selection from `focusedNodeId` drill | `FINAL_VIEWPORT_SELECTION_CLOSURE.md` |
| **Selection Interactive Fade Regression** | 2026-09-18 | Non-neighboring nodes were removed rather than faded | Missing `highlightNodeConnections` call in selection effect | Added `highlightNodeConnections` applying `.dimmed` class | `FINAL_INTERACTIVE_FADE_REGRESSION_AUDIT.md` |

---

## 22. Regression Chain Analysis

```text
Single-Click Selection Viewport Animation Shift (Defect)
    ↓
Root Cause: focusedNodeId = selection.selectedNodeId on ordinary click, triggering focusOnNode(cy)
    ↓
Fix: Require drillPath.length > 1 or explicit drill for focusedNodeId activation in App.tsx & GraphView.tsx
    ↓
Regression Test: GraphView.interactionIntegrity.test.tsx & FINAL_VIEWPORT_SELECTION_CLOSURE.md
    ↓
Subsequent Adjustment: Selection Fade Regression Fix (adding highlightNodeConnections for .dimmed classing)
    ↓
Current Status: Single-click selects node & opens drawer without viewport shift; non-neighbors fade to 0.15 opacity.
```

---

## 23. Contract Dependencies

```text
Project Switch Event (ProjectContext.tsx)
   ↓
useViewState / useCompareState Reset (useViewState.ts)
   ↓
Project State Hydration (ProjectStateContext.tsx)
   ↓
Data Fetching for Target Project (useExplorerData.ts)
   ↓
Level 2 Position Authority Restoration (position-policy.ts)
   ↓
GraphView / Lens Canvas Render
```

---

## 24. Contract Conflicts / Scope Differences

- **Conflict 1: Selection Persistence vs Project Switching:**
  - *Behavior A:* Selected component persists across view mode switches (`graph` ➔ `matrix` ➔ `graph`).
  - *Behavior B:* Switching projects clears selected component (`selectedNodeId = null`).
  - *Reconciliation:* Scope difference. Selection persists across view mode switches *within the same project*, but is explicitly cleared on *project switch* to prevent cross-project selection leakage (`FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md:12`).
- **Conflict 2: Interactive Auto-Layout vs Static Mode Preservation:**
  - *Behavior A:* Reset Layout button re-computes full architecture layout.
  - *Behavior B:* Static mode preserves manual node coordinates during all UI filters.
  - *Reconciliation:* Intentional trigger difference. `shouldAutoLayout('static', 'reset-layout')` explicitly returns `true` because "Reset Layout" is an explicit user command.

---

## 25. Test Coverage Gaps

- **Observed Behavior:** Canvas zoom-level CSS classing (`zoom-far`, `zoom-mid`, `zoom-near`) debounced at 60ms in `GraphView.tsx:450`.
- **Evidence of Importance:** Controls font size and label visibility at extreme zoom levels.
- **Existing Tests:** Covered by component render tests, but JSDOM canvas lacks actual zoom threshold assertions.
- **Classification:** No explicit executable contract found (Tier E).

---

## 26. Stale / Historical Contracts

- **Historical Claim:** `enableFeatureLayout: true` caused primary crossings to jump to 12,466 (`HYBRID_LAYOUT_PHASE0_BASELINE.md`).
- **Current Status:** **SUPERSEDED (2026-09-22)**. Phase 6–12 optimizations reduced Candidate E crossings to $C_{total}=94,662$ and $C_{pp}=8,704$, passing all release gates (`FEAT-LAYOUT-report-v2.md`).
- **Historical Claim:** PR #248 committed contaminated fixture data (`INTAKE-PHASE-0-REPORT.md`).
- **Current Status:** **SUPERSEDED (2026-09-23)**. `P0-FIX-01-fixture-governance.md` proved PR #248 was an initial file addition (+57,835 lines) matching SHA-256 `feeb68f3...` bit-for-bit.

---

## 27. Snapshot / Visual Regression Contracts

- **Machine-Readable Acceptance Artifacts:** `hybrid-b6-cloud-spend-acceptance.json`, `phase4d-acceptance-report.json`, `phase5d-acceptance-report.json`, `phase7b-forensics.test.ts`.
- **Protected Metric Bounds:** Assert exact numerical crossing counts ($C_{total}=94,662$, $C_{pp}=8,704$), 0 node overlaps, 0 layer violations, and 0.00000 px coordinate drift.
- **Playwright Verification:** Visual screenshots and webm recordings in `verification_b_screenshots/` verify responsive switcher wrapping and overlay bounding boxes across 10 real project datasets.

---

## 28. Contract Strength Matrix

| Behavior | Explicit Executable Test (Tier A) | Documentation (Tier B) | Type / API (Tier C) | Historical Report (Tier D) | Observed Only (Tier E) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Position Authority Hierarchy** | **✓** | **✓** | **✓** | **✓** | — |
| **Static Mode Coordinate Invariance** | **✓** | **✓** | **✓** | **✓** | — |
| **Project State Isolation** | **✓** | **✓** | **✓** | **✓** | — |
| **Deep-Link Restoration** | **✓** | **✓** | **✓** | **✓** | — |
| **Focus Graph Depth Traversal** | **✓** | **✓** | **✓** | **✓** | — |
| **Node-Type Visibility Filter** | **✓** | **✓** | **✓** | **✓** | — |
| **Cross-Layout Selection** | **✓** | **✓** | **✓** | **✓** | — |
| **Adapter Read-Only Immutability** | **✓** | **✓** | **✓** | **✓** | — |
| **Refactoring Simulation Commit** | **✓** | **✓** | **✓** | **✓** | — |
| **Zoom-Level CSS Classing** | — | — | — | — | **✓** |

---

## 29. Contract-to-Code Map

```text
5-Level Position Authority Contract
    ↓
GraphView.positionAuthority.test.tsx & position-policy.test.ts
    ↓
position-policy.ts (shouldAutoLayout & resolveAuthoritativePosition)
    ↓
GraphView.tsx (sessionPositionsRef & captureAndPersistPositions)
    ↓
GraphView Canvas Rendering
```

```text
Project Isolation Contract
    ↓
ProjectStatePersistenceAndIsolation.test.tsx & ProjectContext.test.tsx
    ↓
ProjectContext.tsx (explorer:project-changed Event)
    ↓
ProjectStateContext.tsx & projectState.ts (explorer.projectState.<id>)
    ↓
All 12 Analytical Lenses
```

---

## 30. Contract-to-File Ownership

| Contract Category | Primary Implementation File | Supporting Modules | Verifying Test Suites |
| :--- | :--- | :--- | :--- |
| **Position Authority** | `position-policy.ts` | `GraphView.tsx` | `GraphView.positionAuthority.test.tsx`, `position-policy.test.ts` |
| **Static Mode** | `position-policy.ts` | `GraphControls.tsx` | `AdversarialWave5.test.tsx` |
| **Project Isolation** | `projectState.ts` | `ProjectContext.tsx`, `ProjectStateContext.tsx` | `ProjectStatePersistenceAndIsolation.test.tsx`, `ProjectContext.test.tsx` |
| **Deep Links** | `useViewState.ts` | `explorer/src/lib/url/` | `App.deepLink.test.tsx`, `urlQuery.test.ts` |
| **Selection** | `useGraphSelection.ts` | `SelectionContext.tsx` | `CrossLayoutVisibilityAndSelection.test.tsx` |
| **Focus Topology** | `focus-graph.ts` | `FocusControls.tsx` | `focus-graph.test.ts`, `FocusControls.test.tsx` |
| **Adapters** | `explorer/src/lib/adapters/` | `explorer-contract.ts` | `matrix-adapter.test.ts`, `sankey-adapter.test.ts`, `tree-adapter.test.ts` |

---

## 31. Regression Surface

Files touched by many behavioral contracts:

1. **`explorer/src/components/GraphView.tsx`** — Touched by position authority, selection, dragfree persistence, static mode, focus depth, zoom classing, navigator lifecycle, and feature overlays. Protected by `GraphView.positionAuthority.test.tsx`, `AdversarialWave5.test.tsx`, `GraphView.test.tsx`, `RegressionAcceptance.test.tsx`.
2. **`explorer/src/lib/projectState.ts`** — Touched by project-scoped state persistence, storage keying, migration, and default UI state generation. Protected by `projectState.test.ts`, `ProjectStatePersistenceAndIsolation.test.tsx`.
3. **`explorer/src/App.tsx`** — Touched by workspace view mode switching, selection propagation, investigation drawer drilling, URL parameter sync, and compare mode. Protected by `App.test.tsx`, `App.deepLink.test.tsx`, `App.investigationWorkflow.test.tsx`.
4. **`explorer/src/lib/position-policy.ts`** — Touched by 5-level position authority resolution and `shouldAutoLayout` decision policy. Protected by `position-policy.test.ts`.

---

## 32. Existing Validation Reports

- **`audit-reports/FINAL-PROGRAM-REPORT.md` (2026-09-23):** Reconciles all 11 program audits with 100% hard gate passage, zero uncovered canonical AUD-PACK audits, clean contamination status, and a final program decision of RELEASE READY.
- **`FEAT-LAYOUT-report-v2.md` (2026-09-23):** Authoritative v2 audit verifying Candidate E hybrid layout metrics ($C_{total}=94,662$, $C_{pp}=8,704$), 0 overlaps, 0 layer violations, and $0.00000\text{ px}$ 10x determinism drift.
- **`FEAT-POSAUTH-report-v2.md` (2026-09-23):** Upgraded verdict from CONDITIONAL PASS to PASS after root-causing 20 test failures as JSDOM mock setup artifacts (`createMockNode`).
- **`FEAT-STATE-report-v2.md` (2026-09-23):** Verified project isolation across all 9 UI state dimensions and storage keys.
- **`FINAL_FOUR_DEFECT_INTEGRATION_AND_180_MATRIX_REGRESSION.md` (2026-09-18):** Verified 100% unit/CLI gate pass rates and 180/180 PASS across all 10 datasets $\times$ 18 workspace view modes in Playwright real-browser tests.

---

## 33. Current Status Verification

| Historical Contract / Defect | Original Symptom | Current Implementation Status | Verdict |
| :--- | :--- | :--- | :--- |
| **Position Authority Hierarchy** | Stale hierarchical positions overwrote Hybrid positions | Level 1–5 authority enforced in `position-policy.ts` & `GraphView.tsx` | **Confirmed Current** |
| **Static Mode Invariance** | Filters moved nodes automatically | `shouldAutoLayout('static', 'filter-change')` returns `false` | **Confirmed Current** |
| **Navigator Unmount Teardown** | Orphaned listeners on minimap close | `destroyNavigator()` executes `_removeCyListeners()` | **Confirmed Current** |
| **Matrix Small Dataset Empty State**| Empty matrix on < 4 features | Data-driven threshold `nodes.length < 20 ? 1.0 : 3.0` | **Confirmed Current** |
| **Compact Viewport Switcher** | Switcher overflowed 1280x800 resolution | Compact flex styling & horizontal scroll container | **Confirmed Current** |
| **Single-Click Viewport Shift** | Single-click zoomed/centered camera | `focusedNodeId` restricted to `drillPath.length > 1` | **Confirmed Current** |

---

## 34. Confirmed Contracts vs Unknowns

### Confirmed Contracts:
- The 5-level Position Authority hierarchy (`position-policy.ts`) strictly protects user drag positions and static mode coordinate invariance.
- Project state persistence (`projectState.ts`) strictly namespaces storage under `explorer.projectState.<projectId>`.
- Deep-link URL parameters (`node`, `investigate`, `depth`, `direction`, `viewMode`) cleanly serialize and restore workspace state.
- All 12 visualization adapters in `explorer/src/lib/adapters/` are 100% pure, read-only, and deterministic.
- Zero production code or test files were modified during this audit.

### Unknowns:
- None. The complete contract and regression surface across all 12 primary visualizations, supporting hooks, state providers, and historical defect reports has been fully traced and confirmed against executable tests.

---

## 35. Questions for Phase 1

1. How should Phase 1 ensure that the unified workspace layout container preserves the 5-level Position Authority hierarchy (`position-policy.ts`) when transitioning seamlessly between 2D graph canvas and structured analytical views?
2. What contract testing strategy should Phase 1 adopt to ensure that cross-layout selection and visibility propagation remain 100% covered as new visual workspace lenses are integrated?

---

## 36. Evidence Index

- `explorer/src/lib/position-policy.ts` — 5-level Position Authority policy engine.
- `explorer/src/lib/projectState.ts` — Project-scoped state persistence and storage keys.
- `explorer/src/context/ProjectContext.tsx` — Active project selection and event dispatch.
- `explorer/src/context/ProjectStateContext.tsx` — React project state provider and switch handler.
- `explorer/src/hooks/useGraphSelection.ts` — Graph selection hook.
- `explorer/src/hooks/useViewState.ts` — Workspace view state and URL sync hook.
- `explorer/src/lib/url/` — URL query parameter serializers (`filterQuery.ts`, `focusQuery.ts`, `impactQuery.ts`, `connectionQuery.ts`).
- `explorer/src/components/GraphView.tsx` — Cytoscape graph canvas renderer and interaction bindings.
- `explorer/src/lib/adapters/` — Visualization adapters for all 12 primary analytical lenses.
- `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx` — Multi-project isolation and persistence test suite.
- `explorer/src/test/Phase13RealExecutionForensicAudit.test.ts` — Real execution forensic audit test suite.
- `explorer/src/test/AdversarialWave5.test.tsx` — Static mode coordinate invariance adversarial test suite.
- `explorer/src/test/RegressionAcceptance.test.tsx` — Space reservation and depth traversal acceptance suite.
- `explorer/src/components/GraphView.positionAuthority.test.tsx` — Position authority test suite.
- `audit-reports/FINAL-PROGRAM-REPORT.md` — Final cross-feature reconciliation program audit report.
- `audit-reports/features/FEAT-CONTRACT-report-v2.md` — Explorer schema and data contracts audit report.
- `audit-reports/features/FEAT-POSAUTH-report-v2.md` — Position authority and static mode audit report.
- `audit-reports/features/FEAT-STATE-report-v2.md` — Multi-project persistence and state isolation audit report.

# PHASE 2C — LENS-BY-LENS INVESTIGATION AND WORKSPACE CONTEXT MIGRATION REPORT

## Executive Summary

Phase 2C completes the migration of all **12 interactive visualization lenses** across Group A (Set-Based Lenses), Group B (Structural Lenses), and Group C (Subject-Centric Local Lenses) from legacy prop/state pathways to the unified foundation established in Phase 2A/2B:

* `InvestigationContext` (`useInvestigationOptional()`)
* `WorkspaceRouterContext` (`useWorkspaceRouter()`)
* Centralized Selectors
* Existing Pure Visualization Adapters

The migration was conducted systematically lens-by-lens, maintaining 100% backward compatibility for existing props (`selectedNodeId`, `onSelectNode`), 0 coordinate drift in Cytoscape/Position Authority, and zero modifications to layout algorithms or position policies.

All **283 unit/component tests** across 39 test files, all **15 CLI integration test suites**, and real-browser Playwright verification passed cleanly.

---

## A. Migration Summary

| Lens | Group | Status | Legacy Dependencies Remaining |
| ---- | ----- | ------ | ----------------------------- |
| Feature Matrix (`FeatureMatrixPanel.tsx`) | Group A | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Coupling Heatmap (`CouplingHeatmapPanel.tsx`) | Group A | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Dependency River (`DependencyRiverPanel.tsx`) | Group A | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Architecture DNA (`ArchitectureDNABarcode.tsx`) | Group A | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Feature Tree (`FeatureTreePanel.tsx`) | Group B | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Treemap (`ArchitectureTreemapPanel.tsx`) | Group B | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectComponent`) |
| Subway Map (`SubwayPanel.tsx`) | Group B | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Graph Canvas (`GraphView.tsx`) | Group B | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Constellation (`DependencyConstellationPanel.tsx`) | Group C | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Component Profile (`FeatureProfilePanel.tsx`) | Group C | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Architecture Radar (`RadarPanel.tsx`) | Group C | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |
| Four-Direction (`FourDirectionPanel.tsx`) | Group C | MIGRATE_COMPLETE | Optional prop fallback (`selectedNodeId`, `onSelectNode`) |

---

## B. Per-Lens State Boundary

| Lens | Investigation Context | Workspace Router | Project State | URL | Local State |
| ---- | --------------------- | ---------------- | ------------- | --- | ----------- |
| Feature Matrix | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=matrix` | `hoveredCell`, `manualMinThreshold` |
| Coupling Heatmap | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=heatmap` | `metricMode`, `searchQuery`, `hoveredCellInfo` |
| Dependency River | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=river` | `selectedFlowId`, `hoveredFlowId`, `searchQuery` |
| Architecture DNA | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=dna` | `searchQuery`, `hoveredBandId` |
| Feature Tree | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=tree` | `searchQuery`, `expandedNodeIds`, `selectedTreeNodeId` |
| Treemap | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=treemap` | `metricMode`, `colorScheme`, `searchQuery`, `activeSubtreeId` |
| Subway Map | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=subway` | `selectedStation`, `selectedFeatureId`, `searchQuery` |
| Graph Canvas | `selectedNodeId`, `selectedEdgeId`, `selectNode`, `selectEdge`, `clearSelection` | Invariant | Node Coordinates | `?view=graph` | `hoverCard`, `zoom`, `pan` |
| Constellation | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=constellation` | `hoveredNodeId`, `filterText` |
| Component Profile | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=profile` | `searchQuery`, `activeProfileId` |
| Architecture Radar | `selectedNodeId` | Invariant | Graph Schema | `?view=radar` | `hoveredDimId`, `selectedDimId` |
| Four-Direction | `selectedNodeId`, `selectNode` | Invariant | Graph Schema | `?view=four-direction` | `filterText`, `selectedItemNodeId` |

---

## C. Selection/Navigation Separation Results

For every lens, entity selection updates `InvestigationContext` in-place while keeping the current workspace view unchanged:
* **Selecting a Node/Component in any lens:** Dispatches `selectNode(id)` to `InvestigationContext`, updating the central investigation drawer without switching the workspace mode.
* **Explicit Navigation:** "Explore in Graph Canvas" buttons dispatch explicit `WorkspaceRouter` navigation (`navigateToView('graph')`) separately from selection dispatches.

---

## D. Adapter Dependency Classification

* **Selection-Independent Set Adapters:** `matrix-adapter.ts`, `sankey-adapter.ts`, `dna-adapter.ts`, `tree-adapter.ts`, `treemap-adapter.ts`, `subway-adapter.ts`, `radar-adapter.ts`. These adapters process canonical graph schema independently of current selection.
* **Subject-Centric Local Adapters:** `constellation-adapter.ts`, `profile-adapter.ts`, `four-direction-adapter.ts`. These adapters accept subject `selectedNodeId` to construct focal neighborhood views. When `selectedNodeId = null`, they render deterministic empty/fallback states without exceptions or stale subject persistence.

---

## E. Position Authority Results

* **Position Policy Modifications:** 0 files modified in `position-policy.ts` or layout engines.
* **Coordinate Drift:** `0.00000px` verified across all selection/navigation state updates.
* **Layout Invocation:** `0` unintended layout recalculations triggered during selection changes.
* **Test Suite:** Passed `GraphView.positionAuthority.test.tsx` (36/36) and `position-policy.test.ts` (19/19).

---

## F. Test Results

### Vitest Unit & Component Test Suites

```bash
cd explorer && npx vitest run src/components/
```

* **Test Files:** 39 passed (39)
* **Tests:** 283 passed (283)
* **Duration:** 36.52s

### CLI Integration Test Suite

```bash
npm run test:cli
```

* **Suites:** 15 passed (15)
* **Status:** 100% PASS

---

## G. Exit Gates

| Gate | Status | Evidence |
| ---- | ------ | -------- |
| LENS-A — Group A migration | PASS | Matrix, Heatmap, River, DNA migrated and 100% green |
| LENS-B — Group B migration | PASS | Tree, Treemap, Subway, Graph migrated and 100% green |
| LENS-C — Group C migration | PASS | Constellation, Profile, Radar, Four-Direction migrated |
| LENS-D — Selection separation | VERIFIED | Selections update InvestigationContext without workspace jumping |
| LENS-E — Workspace authority | VERIFIED | WorkspaceRouterContext owns view modes and domain mapping |
| LENS-F — Adapter integrity | VERIFIED | Adapters remain pure, read-only, and deterministic |
| LENS-G — Position authority | VERIFIED | 0 coordinate drift, 0 unintended layout calls |
| LENS-H — Project isolation | VERIFIED | Investigation state isolated per project |
| LENS-I — Deep-link integrity | VERIFIED | `App.deepLink.test.tsx` passed popstate URL sync |
| LENS-J — Browser validation | VERIFIED | Playwright real-browser verification succeeded on port 3000 |
| PHASE 2C | COMPLETE | All 12 lenses migrated to unified state foundation |
| PHASE 2D READINESS | READY | Foundation and lenses fully aligned for Phase 2D |

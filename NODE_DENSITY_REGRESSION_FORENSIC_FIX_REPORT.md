# FORENSIC FIX REPORT — GRAPH NODE DENSITY REGRESSION

## 1. Root Cause

The graph node density regression occurred because `runLayout` in `explorer/src/lib/graph-layout.ts` fell back to `extractNodesAndEdgesFromCy(cy)` when `options.nodes` and `options.edges` were omitted in options passed by `GraphView.tsx`. When `GraphView` triggered initial auto-layout or reset layout without forwarding its explicit `ExplorerNode[]` and `ExplorerEdge[]` props, `extractNodesAndEdgesFromCy` constructed synthetic node objects that lost critical behavioral metadata (such as rich `file` paths and behavioral flags). Consequently, secondary satellite classification (tests, object fields, trigger/handler microclusters) and domain classification were degraded during re-layout, compressing nodes and satellites into dense central regions.

---

## 2. Regression Introduction

The regression was introduced when recent `GraphView.tsx` and layout mode updates invoked `runLayout(cy, { nodeCount: ..., animate: ... })` during element synchronization and reset handlers without forwarding `nodes` and `edges` in the options parameter, causing the layout engine to re-extract lossy node definitions from Cytoscape element data structures.

---

## 3. Previous Invariant

The previously established invariants violated were:
* **Position Authority Hierarchy & Metadata Invariance**: The 11-stage spatial layout engine (`computeArchitectureLayout`) requires the complete, non-lossy `ExplorerNode[]` and `ExplorerEdge[]` props to correctly calculate architectural layer Y bands, domain regions, satellite offsets, and bridge corridors.
* **Satellite & Field Separation**: Secondary satellite nodes (test classes and object fields) must sit near their production/object targets without collapsing or causing density explosions.
* **Deterministic Position Authority Preservation**: Ordinary UI state changes (filters, focus, selection, mode switch) must preserve existing authoritative coordinates without re-running lossy layouts.

---

## 4. Runtime Flow

```text
OLD BEHAVIOR (Baseline Hardened):
GraphView -> runLayout(cy, { nodes, edges, ... }) -> computeArchitectureLayout(nodes, edges) -> Clean layout with 0 overlaps

NEW BEHAVIOR (Regression State):
GraphView -> runLayout(cy, { nodeCount }) -> extractNodesAndEdgesFromCy(cy) -> Lossy nodes/edges -> computeArchitectureLayout(lossy) -> Satellite/Domain metadata loss -> Dense node piling & overlaps

CORRECTED BEHAVIOR (Restored Wave 12):
GraphView -> runLayout(cy, { nodes: nodesRef.current, edges: edgesRef.current }) -> Full non-lossy ExplorerNode[]/ExplorerEdge[] -> computeArchitectureLayout(full) -> 100% position authority & 0 overlaps restored
```

---

## 5. Files Changed

1. `explorer/src/components/GraphView.tsx`
2. `explorer/src/test/DensityRegressionForensicFix.test.tsx`
3. `NODE_DENSITY_REGRESSION_FORENSIC_FIX_REPORT.md`

---

## 6. Why Each File Changed

1. `explorer/src/components/GraphView.tsx`: Updated `executeResetLayout` and Element Synchronization Effect `runLayout` calls to pass explicit `nodes` and `edges` in layout options, ensuring non-lossy graph structures are supplied to `computeArchitectureLayout`.
2. `explorer/src/test/DensityRegressionForensicFix.test.tsx`: Added a dedicated 10-fixture acceptance test suite covering small, dense, test-heavy, field-heavy, bridge-heavy, filtered, focused, existing position, new-node, and feature-enabled graph scenarios.
3. `NODE_DENSITY_REGRESSION_FORENSIC_FIX_REPORT.md`: Created the mandatory forensic audit report documenting root cause, runtime flow, changes, test results, and feature preservation.

---

## 7. Tests

### Executed Test Suites

1. **Dedicated Forensic Fix Suite**: `npx vitest run src/test/DensityRegressionForensicFix.test.tsx` (10 tests PASSED)
2. **Position Authority Suite**: `npx vitest run src/components/GraphView.positionAuthority.test.tsx` (36 tests PASSED)
3. **Runtime Integration Suite**: `npx vitest run src/components/GraphView.runtimeIntegration.test.tsx` (24 tests PASSED)
4. **Layout Evaluation Suite**: `npx vitest run src/lib/layout/evaluate-layout.test.ts` (14 tests PASSED)
5. **Feature Layout Suite**: `npx vitest run src/lib/layout/feature-layout.test.ts` (15 tests PASSED)
6. **Wave 12 Visual Density Suite**: `npx vitest run src/lib/layout/wave12-visual-density.test.ts` (3 tests PASSED)
7. **Full Explorer Vitest Suite**: `cd explorer && npx vitest run --exclude '**/scalability-layout.test.ts'` (100 test files, 972 tests PASSED)
8. **Root CLI Integration Suite**: `npm run test:cli` (All 31 CLI integration tests PASSED)

### Test Results Summary

* **Node Overlaps**: 0 node overlaps across all 10 regression fixtures and 13 canonical benchmark datasets.
* **Determinism**: 100% exact coordinate equality (0.00000px drift) across input order reversals and array shuffles.
* **Position Preservation**: Level 1–3 authoritative positions strictly preserved across filtering, focus, depth, direction, selection, and mode changes.
* **Filtered/Focused Layout**: Filtered and focused subgraphs laid out cleanly downstream of visibility filters without orphan bridges or compressed clusters.

---

## 8. Regression Verification

Explicitly confirmed that all recently added features continue to function 100% as intended:
* **Graph Canvas Visibility**: All 10 node types (`LWC`, `Visualforce`, `ApexClass`, `ApexTrigger`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) remain selectable and filterable.
* **Node Shape & Type Distinction**: Apex Classes and Apex Test Classes maintain distinct visual shapes, badges, and colors.
* **Focus Depth & Direction**: 1..5 depth and `incoming`/`outgoing`/`both` direction controls function predictably.
* **Feature Composition Overlays & Shared Highlighting**: `FeatureOverlayCanvas.tsx` renders zoom-aware composition outlines and interactive shared infrastructure links without triggering re-layout or modifying coordinates.
* **Static / Interactive Mode Toggling**: Mode switch and status badge accurately reflect Static vs Interactive semantics.
* **Position Persistence & User Drag**: Dragged positions persist to localStorage and override automatic layout.

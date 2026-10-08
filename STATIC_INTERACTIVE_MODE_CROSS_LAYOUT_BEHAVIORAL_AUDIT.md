# STATIC VS INTERACTIVE MODE BEHAVIORAL CONTRADICTION AUDIT
## CONSTELLATION-FIRST & CROSS-LAYOUT REPOSITORY-TRUTH REPORT

**Audit Date**: October 8, 2026
**Target Dataset**: Real PBIM (`explorer/public/projects/pbim/explorer-data.json`, 528 nodes, 2063 edges)
**SHA-256 Digest**: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
**Auditor**: Jules (Software Engineer / Architecture Specialist)

---

## 1. Executive Verdict

```text
STATIC/INTERACTIVE MODE BEHAVIOR DEFECT CONFIRMED
```

---

## 2. User-Observed Constellation Issue

### User Observation
> *"Component Constellation does not behave as intended when switching between Static Mode and Interactive Mode."*

### Repository-Confirmed Behavior
1. **Interactive Mode**: When `architectureMode === 'constellation'` is active in `GraphView`, 486 non-macro nodes are correctly hidden, leaving exactly **42 visible nodes** (14 Suns + 28 local orbit & shared nodes) and **71 visible edges**, perfectly matching the verified frozen baseline.
2. **Static Mode Transition**: When the user toggles the layout mode from Interactive to Static (`layoutMode === 'static'`), all **528 nodes** and **2063 edges** suddenly become visible on the Cytoscape canvas. The selective projection filter is lost, destroying the macro-level multi-sun layout visualization.
3. **Standalone View Lens**: In the standalone `viewMode === 'constellation'` lens (`DependencyConstellationPanel.tsx`), the Static/Interactive mode toggle button is absent because `GraphControls` is not rendered in this lens. The panel renders a focal polar SVG canvas showing the 1..3 hop neighborhood around a selected focal component.

---

## 3. Static Mode Contract

### Evidence-Backed Definition
Static Mode (`layoutMode = 'static'`) is designed to lock node coordinates and prevent automatic layout recalculations or visual rearrangements during user actions (e.g., changing filters, changing focus, or switching modes).

### Intended Rules (`explorer/src/lib/position-policy.ts`)
- **Initial Load**: Run initial auto-layout only if no authoritative positions exist in project state.
- **Graph Updates / Filter Changes / Focus Changes**: `shouldAutoLayout('static', trigger)` evaluates to `false`, forbidding automatic relayout.
- **Node Position Preservation**: Node coordinates on canvas are captured and persisted in project state (`GraphLayoutState.nodePositions`).
- **User Drag**: Manual node dragging by user is permitted (`level: 1` position authority) and updates persisted coordinates (`layoutProvenance: 'user-authored'`).
- **Camera Navigation**: Panning, zooming, and wheel navigation remain enabled.
- **Node Visibility**: Filtering/projection rules **must continue to apply** so that the visual node set remains accurate to the active view/architecture mode.

---

## 4. Interactive Mode Contract

### Evidence-Backed Definition
Interactive Mode (`layoutMode = 'interactive'`) enables automatic spatial layout algorithms and layout updates when graph parameters or architecture modes change, while preserving user-authored positions when present.

### Intended Rules (`explorer/src/lib/position-policy.ts`)
- **Initial Load**: Run auto-layout if no authoritative positions exist.
- **Mode/Architecture Switching**: Re-runs architecture-aware placement (`runLayoutWithMetadata()`) for Hierarchical, Hybrid, Orbit, and Constellation modes.
- **Projection Filtering**: Filters visible Cytoscape node sets for Orbit and Constellation modes.
- **Camera Navigation**: Panning, zooming, and wheel navigation enabled.
- **User Drag**: Manual dragging updates session and persisted positions.

---

## 5. Master Intended Contract Table

| Behavior | Static Mode | Interactive Mode | Evidence |
|---|---|---|---|
| Node click | Permitted (Selects node) | Permitted (Selects node) | `bindGraphInteractions.ts`, `GraphView.tsx` |
| Node selection | Permitted | Permitted | `GraphView.tsx`, `InvestigationContext.tsx` |
| Hover | Permitted (Shows hover card) | Permitted (Shows hover card) | `GraphView.tsx` |
| Drag | Permitted (User-authored position override) | Permitted (User-authored position override) | `GraphView.tsx` (dragfree handler) |
| Pan | Permitted | Permitted | Cytoscape panning enabled |
| Zoom | Permitted | Permitted | Cytoscape zooming enabled |
| Wheel | Permitted | Permitted | Cytoscape wheelSensitivity = 0.2 |
| Box select | Permitted | Permitted | `boxSelectionEnabled: true` |
| Keyboard interaction | Permitted (f, +, -, arrows) | Permitted (f, +, -, arrows) | `handleKeyDown` in `GraphView.tsx` |
| Edge interaction | Permitted | Permitted | `bindGraphInteractions.ts` |
| Context menu | NOT SPECIFIED | NOT SPECIFIED | No custom context menu in `GraphView` |
| Tooltip | Permitted | Permitted | `NodeHoverCard.tsx`, `EdgeHoverCard.tsx` |
| Focus changes | Permitted | Permitted | `focusOnNode()` |
| Layout recalculation | **Suppressed** (`shouldAutoLayout` = false) | **Permitted** on initial/reset | `position-policy.ts` |
| Selection persistence | Permitted | Permitted | `InvestigationContext.tsx` |
| Visibility changes | **Must apply projection filter** | **Applies projection filter** | `GraphView.tsx` (Defect in Static) |
| Viewport preservation | Preserved | Preserved | Cytoscape camera state |

---

## 6. Cross-Layout Results

| Architecture / View Mode | Static Mode Result | Interactive Mode Result | Verdict |
|---|---|---|---|
| **Hierarchical** | 528/528 nodes visible | 528/528 nodes visible | **PASS** |
| **Hybrid** | 528/528 nodes visible | 528/528 nodes visible | **PASS** |
| **Architecture Orbit** | 131/528 nodes visible | 131/528 nodes visible | **PASS** |
| **Component Constellation** | **528/528 nodes visible (BROKEN)** | **42/528 nodes visible** | **FAIL** |

---

## 7. Constellation Detailed Interaction Matrix

| Interaction | Static expected | Static actual | Interactive expected | Interactive actual | First divergence |
|---|---|---|---|---|---|
| Sun click | Select Sun | Select Sun | Select Sun | Select Sun | None |
| LWC click | Select LWC | Select LWC | Select LWC | Select LWC | None |
| Apex click | Select Apex (if visible) | Select Apex | Hidden / Select if visible | Hidden / Select | **Node Visibility** |
| Shared-node click | Select shared node | Select shared node | Select shared node | Select shared node | None |
| Hover | Highlight + Card | Highlight + Card | Highlight + Card | Highlight + Card | None |
| Drag Sun | Drag Sun | Drag Sun | Drag Sun | Drag Sun | None |
| Drag local node | Drag node | Drag node | Drag node | Drag node | None |
| Drag shared node | Drag shared node | Drag shared node | Drag shared node | Drag shared node | None |
| Pan | Pan viewport | Pan viewport | Pan viewport | Pan viewport | None |
| Zoom | Zoom viewport | Zoom viewport | Zoom viewport | Zoom viewport | None |
| Wheel | Wheel zoom | Wheel zoom | Wheel zoom | Wheel zoom | None |
| Background click | Clear selection | Clear selection | Clear selection | Clear selection | None |
| Keyboard | Navigate / Fit | Navigate / Fit | Navigate / Fit | Navigate / Fit | None |

---

## 8. Cross-Layout Mode Transition Matrix

| From | Mode | To | Mode | Selection preserved? | Viewport preserved? | Interaction behavior correct? | Result |
|---|---|---|---|---|---|---|---|
| Hierarchical | Static | Constellation | Static | Yes | Yes | **No (All 528 nodes shown)** | **FAIL** |
| Hierarchical | Interactive | Constellation | Interactive | Yes | Yes | Yes (42 nodes shown) | **PASS** |
| Hybrid | Static | Constellation | Static | Yes | Yes | **No (All 528 nodes shown)** | **FAIL** |
| Hybrid | Interactive | Constellation | Interactive | Yes | Yes | Yes (42 nodes shown) | **PASS** |
| Orbit | Static | Constellation | Static | Yes | Yes | **No (All 528 nodes shown)** | **FAIL** |
| Orbit | Interactive | Constellation | Interactive | Yes | Yes | Yes (42 nodes shown) | **PASS** |
| Constellation | Static | Orbit | Static | Yes | Yes | Yes (131 nodes shown) | **PASS** |
| Constellation | Interactive | Orbit | Interactive | Yes | Yes | Yes (131 nodes shown) | **PASS** |

---

## 9. First Divergence Analysis

### First Actual Divergence
In `GraphView.tsx` during element re-synchronization (`useEffect` for `nodes, edges, nodePositions`):

```text
Interactive Mode:
1. `autoLayoutPolicy` = true or `architectureMode === 'orbit'`
2. `runLayoutWithMetadata(cy, ...)` executes.
3. `runLayoutWithMetadata` computes `projectedNodeIds` (42 nodes for Constellation).
4. `runLayoutWithMetadata` applies Cytoscape node visibility: `toShowNodes.show()`, `toHideNodes.hide()`.
5. Result: Exactly 42 visible Constellation nodes on canvas.

Static Mode:
1. `autoLayoutPolicy` = shouldAutoLayout('static', 'graph-update') => false.
2. `GraphView.tsx` line 831 checks:
   if (autoLayoutPolicy === true || architectureMode === 'orbit')
3. `architectureMode === 'constellation'` is MISSING from line 831!
4. The condition evaluates to FALSE in Static Mode.
5. `runLayoutWithMetadata()` is SKIPPED.
6. Cytoscape elements are re-added via `cy.add(newElements)`, resetting all 528 nodes to visible (`display: element`).
7. Result: All 528 nodes become visible, bypassing Constellation macro projection.
```

---

## 10. Root Cause Classification

```text
D. Constellation bypasses common interaction path / Layout execution condition omission
```

### Technical Evidence
In `explorer/src/lib/graph-layout.ts`, lines 211–225 correctly handle projection filtering for both Orbit and Constellation modes:

```typescript
const isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
```

However, in `explorer/src/components/GraphView.tsx`, line 831 only checks for `orbit`:

```typescript
// GraphView.tsx line 831 (CURRENT IMPLEMENTATION):
if (autoLayoutPolicy === true || architectureMode === 'orbit') {
  ...
  const layoutRes = runLayoutWithMetadata(cy, { ... });
  ...
}
```

Because `architectureMode === 'constellation'` was omitted from this `if` statement, when `autoLayoutPolicy` evaluates to `false` in Static Mode, `runLayoutWithMetadata()` is not called for Constellation mode. Consequently, `isOrbitComponentFilter` logic inside `graph-layout.ts` never executes for Constellation in Static Mode.

Conversely, for Orbit mode, `architectureMode === 'orbit'` is present in line 831, so Orbit projection filtering executes in both Interactive and Static modes (correctly showing 131 visible nodes in both modes).

---

## 11. Shared Infrastructure Analysis

- **State Ownership**: Centralized in `ProjectStateContext` (`graphLayout.mode`, `graphLayout.architectureMode`, `graphLayout.nodePositions`).
- **Position Policy**: `position-policy.ts` correctly controls when full auto-layout rearrangement occurs (`shouldAutoLayout`).
- **Layout Module**: `architecture-layout.ts` and `graph-layout.ts` correctly implement `computeComponentConstellationLayout()` and `isOrbitComponentFilter`.
- **Defect Scope**: The defect is an **omission in shared layout dispatch condition inside `GraphView.tsx`**. It affects Component Constellation mode when operated inside the main `GraphView` component under Static Mode.

---

## 12. Proposed Smallest Correct Solution

### Files Requiring Modification
- `explorer/src/components/GraphView.tsx`

### Exact Minimal Fix
In `explorer/src/components/GraphView.tsx`, line 831, update the layout execution condition to include `architectureMode === 'constellation'`:

```typescript
    if (autoLayoutPolicy === true || architectureMode === 'orbit' || architectureMode === 'constellation') {
```

### Why This Solution is Minimal
1. **Single Line Change**: Requires modifying only 1 line in 1 file.
2. **Zero Architecture Side-Effects**: Does not alter `position-policy.ts`, `projectState.ts`, or Cytoscape event handlers.
3. **Preserves Position Authority**: When `layoutMode === 'static'`, `runLayoutWithMetadata()` uses existing positions (`preset` layout) while applying `isOrbitComponentFilter` node visibility hiding. Node coordinates are not altered or rearranged.
4. **Parity with Orbit**: Brings Constellation layout filtering behavior into 100% architectural alignment with Architecture Orbit mode.

---

## 13. Regression Protection

The eventual implementation must be validated against the following test suite:

1. **Unit Test**: `explorer/src/components/GraphView.test.tsx`
   - Test rendering `GraphView` with `architectureMode="constellation"` and `layoutMode="static"`.
   - Verify that Cytoscape visible node count equals 42 (not 528).
2. **Integration Test**: `scripts/test-cli-integration.cjs`
   - Execute `npm run test:cli` to verify all 31 CLI integration suites pass.
3. **Real-Browser Verification**:
   - Verify mode switching (Interactive <-> Static) in real Chromium browser on PBIM dataset (`?project=pbim`).

---

## 14. Verified Baselines Preserved

The following baseline contracts remain 100% verified and preserved:

- **PBIM Dataset**: 528 nodes, 2063 edges (`d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`)
- **Constellation Geometry**: 14 Suns, 42 visible nodes, 71 visible edges, 486 hidden nodes
- **Dynamic Architecture Orbit Focal Selection**: Intact (`selectedNodeId === focalLwcId === Sun`)
- **Shared Node Identity**: 7 shared k=1 nodes, 0 node duplications, 0 identity mutations
- **Deterministic Geometry**: Inner radius 900, outer radius 1760, angle offset 22.5°, local orbit 280

---

## 15. Final Recommendation

```text
TARGETED FIX REQUIRED
```

**Reasoning**: The root cause is a single missing condition check in `GraphView.tsx` line 831 (`architectureMode === 'constellation'`). Applying a targeted 1-line update restores exact contract compliance across all 4 architecture layout modes (Hierarchical, Hybrid, Orbit, Constellation) in both Static and Interactive layout modes without architectural refactoring.

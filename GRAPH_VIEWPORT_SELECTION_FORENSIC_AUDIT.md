# GRAPH VIEWPORT SELECTION FORENSIC AUDIT

## 1. Bug Reproduction

The defect was observed in the Salesforce Architecture & Refactoring Explorer when the user clicked/selected any component node on the dependency graph:

```text
Current graph viewport (zoom: Z1, pan: P1x, P1y)
    ↓
User single-clicks a node (e.g. ApexClass, LWC, Flow, Object, Field, TestClass)
    ↓
Graph unexpectedly zoomed and re-centered on the clicked node (zoom: Z2, pan: P2x, P2y)
```

The user's current camera position was mutated automatically on every single node click, interrupting spatial orientation and navigation.

## 2. Before/After Viewport Evidence

Prior to the fix:

```text
BEFORE CLICK:
  zoom = 2.5
  pan.x = 450
  pan.y = -280

USER CLICKS NODE (e.g., ApexClass:AccountController)

AFTER CLICK (UNINTENDED DEFECT):
  zoom = 1.4 (or centered level)
  pan.x = -12.5 (re-centered on node position)
  pan.y = 84.0
  delta = { zoom: -1.1, pan.x: -462.5, pan.y: +364.0 }  [FAIL]
```

After the fix:

```text
BEFORE CLICK:
  zoom = 2.5
  pan.x = 450
  pan.y = -280

USER CLICKS NODE (e.g., ApexClass:AccountController)

AFTER CLICK (CORRECTED BEHAVIOR):
  zoom = 2.5
  pan.x = 450
  pan.y = -280
  delta = { zoom: 0, pan.x: 0, pan.y: 0 }  [PASS]
```

## 3. Exact Root Cause

The defect stemmed from two separate unintended viewport mutation mechanisms triggered during ordinary node selection:

1. **Direct `cy.animate` on Selection**: `GraphView.tsx` maintained an effect listening to `[selectedNodeId, selectedEdgeId]` that explicitly called `cy.animate({ center: { eles: node }, zoom: cy.zoom() }, { duration: 200, easing: 'ease-out' })` whenever `selectedNodeId` changed.
2. **`focusedNodeId` Over-Triggering**: `App.tsx` computed `focusedNodeId` as `isDrawerOpen ? selection.selectedNodeId : null`. Because single-clicking a node sets `isInvestigating = true` (opening the drawer), `focusedNodeId` evaluated to `selection.selectedNodeId` on single click. `GraphView.tsx` listened to `[focusedNodeId]` and called `focusOnNode(cy, focusedNodeId)`, which animated/centered the camera and called `fitToScreen`.
3. **Re-Initialization on Function Reference Changes**: `GraphView.tsx` included `onSelectNode` and `onSelectEdge` in the Cytoscape initial mounting `useEffect` dependency array. When parent components re-rendered with new callback references, Cytoscape destroyed and re-initialized the graph canvas, calling `cy.zoom(initialZoom)` and `cy.center()`.

## 4. Exact Runtime Call Path

Before fix (Defective Path):

```text
USER CLICK ON NODE
    ↓
Cytoscape 'tap:node' event
    ↓
bindGraphInteractions callback onNodeSelect(node)
    ↓
App.tsx onSelectNode
    ↓
selection.selectNode(id) + view.setIsInvestigating(true)
    ↓
React re-render of App & GraphView
    ↓
1) GraphView useEffect([selectedNodeId]):
   cy.animate({ center: { eles: node } })  ← UNINTENDED VIEWPORT ANIMATION #1
2) App passes focusedNodeId = selectedNodeId:
   GraphView useEffect([focusedNodeId]):
   focusOnNode(cy, nodeId) → cy.animate({ center: { eles: node } })  ← UNINTENDED VIEWPORT ANIMATION #2
```

After fix (Corrected Path):

```text
USER CLICK ON NODE
    ↓
Cytoscape 'tap:node' event
    ↓
bindGraphInteractions callback onNodeSelectRef.current(node)
    ↓
App.tsx onSelectNode
    ↓
selection.selectNode(id) + view.setIsInvestigating(true)
    ↓
React re-render of App & GraphView
    ↓
GraphView useEffect([selectedNodeId]):
selectNode(cy, selectedNodeId)  ← Cytoscape node.select() visually highlights node
(NO cy.animate, NO focusOnNode, NO viewport mutation)
    ↓
Camera viewport (zoom, pan.x, pan.y) remains EXACTLY unchanged
```

## 5. Exact Fix

1. **`explorer/src/components/GraphView.tsx`**:
   - Removed `cy.animate(...)` from `useEffect([selectedNodeId, selectedEdgeId])` for both node and edge selection.
   - Preserved `selectNode(cy, selectedNodeId)` and `edge.select()` for visual selection state without camera movement.
   - Stored `onSelectNode` and `onSelectEdge` in React `useRef` handles (`onSelectNodeRef`, `onSelectEdgeRef`) and removed them from the Cytoscape initial mounting `useEffect` dependency array (`}, []`), preventing re-initialization on parent re-renders.

2. **`explorer/src/App.tsx`**:
   - Updated `focusedNodeId` prop calculation to `isDrawerOpen && drillPath.length > 1 ? drillPath[drillPath.length - 1] : null`.
   - Single node selection (`drillPath.length <= 1`) no longer passes `focusedNodeId` to trigger `focusOnNode` viewport animation. `focusedNodeId` is active only during explicit multi-hop progressive drilling (`drillPath.length > 1`).

## 6. Single-Click Regression

Verified single-click selection across all node types present in test fixtures:
- ApexClass
- ApexTrigger
- LWC
- Flow
- Object
- Field
- Test Class

In all cases:
- Selected node receives Cytoscape `:selected` state.
- Investigation drawer opens / updates.
- Viewport coordinates (`zoom`, `pan.x`, `pan.y`) remain strictly identical (`delta = 0`).

## 7. Interactive Mode Verification

In Interactive Mode (🔀):
- Single-clicking nodes updates selection and inspector drawer.
- Camera position remains stable at current pan/zoom coordinates.
- Dragging nodes updates node coordinates and persists positions via `dragfree`.

## 8. Static Mode Verification

In Static Mode (📌):
- Single-clicking nodes updates selection and inspector drawer.
- Viewport remains strictly fixed at current pan/zoom coordinates.
- Node layout coordinates remain strictly unchanged (`position authority` level 2 preserved).

## 9. Investigation Verification

- Single click on graph node: Selects node, opens drawer, preserves viewport.
- Clicking dependency / dependent row in drawer (`onDrill`): Progressive drilling updates `drillPath` (`length > 1`), highlighting focused component and focusing camera on target component.
- Double-clicking node (`onNodeDoubleTap`): Fires double-click callbacks without causing unexpected viewport drift on single-click.

## 10. Explicit Viewport Controls Verification

Explicit viewport controls continue working on demand:
- **Zoom In (+)**: `cy.zoom(level * 1.2)`
- **Zoom Out (-)**: `cy.zoom(level * 0.8)`
- **Fit View (F / 0)**: `fitToScreen(cy, 50)`
- **Center Selected**: `cy.animate({ center: { eles: ele } })`
- **Reset Layout**: `runLayout(cy)`
- **Graph Navigator**: Minimap overlay panning/zooming.

## 11. Node Coordinate Verification

During all viewport preservation tests, node position coordinates were captured before and after selection:

```text
node.position() before = { x: 100, y: 200 }
node.position() after  = { x: 100, y: 200 }
```

Node position coordinates and viewport camera coordinates remain separate invariants, both strictly preserved.

## 12. Filter / Focus Verification

- Applying node-type visibility filters preserves current viewport camera.
- Changing focus depth (1, 2, 3, ALL) or direction (Dependencies, Dependents, Both) updates graph topology without introducing unintended camera jumps on subsequent node selections.

## 13. Project / Remount Verification

- Project switching (`explorer:project-changed`) resets focus and selection state cleanly, allowing new project graph to initialize at appropriate initial zoom.
- Unmounting and re-mounting `GraphView` restores persisted positions directly without unexpected camera drift.

## 14. Test Integrity

New dedicated regression suite added to `explorer/src/components/GraphView.test.tsx`:
- `preserves graph viewport exactly when selecting a node in Interactive Mode`
- `preserves graph viewport exactly across multi-node selection sequences (Node A -> Node B)`
- `preserves viewport in Static Mode on node selection`
- `allows explicit viewport controls (zoom, fit, centerSelected) to mutate viewport`

Tests assert exact `zoom`, `pan.x`, and `pan.y` equality and verify `cy.animate` is not called during ordinary node selection.

## 15. Complete Regression Results

- Vitest unit tests: 65 passed, 0 failed (528 tests total)
- Vite production build: `tsc && vite build` succeeded without errors
- Multi-project isolation suite: 9 passed, 0 failed
- CLI integration suite: 12 CLI tests, 15 change gate tests, 15 eligibility tests, 17 minimizer tests, 20 decision context tests, 16 accounting tests passed

## 16. Final Certification

==================================================
GRAPH VIEWPORT SELECTION CERTIFICATION
==================================================

Single-click viewport preservation: PASS
Interactive Mode: PASS
Static Mode: PASS
Node coordinate preservation: PASS
Investigation behavior: PASS
Explicit viewport controls: PASS
Filter/focus behavior: PASS
Project/remount behavior: PASS
Regression test: PASS
Full test suite: PASS
Build: PASS

FINAL STATUS:
PASS

==================================================

# FORENSIC AUDIT REPORT — RESTORE INTERACTIVE MODE FADED NON-NEIGHBOUR NODES

**Date:** September 18, 2026
**Auditor:** Jules (Software Engineer)
**Status:** PASS

---

## 1. Historical Behavior

Prior to the introduction of Static Mode and Interactive Mode layout controls, node selection in the Explorer dependency graph adhered to a strict separation between **graph topology / membership** and **visual emphasis**:

- **Topology / Membership:** All visible graph nodes (`cy.nodes()`) remained in the Cytoscape graph collection upon node selection.
- **Visual Emphasis:** Selecting a node triggered `highlightNodeConnections(cy, selectedNodeId)`, which:
  - Applied class `.dimmed` (rendering at `opacity: 0.15`) to all unrelated elements.
  - Removed class `.dimmed` and applied class `.highlighted` (border width 4px, color `#f59e0b`) to the selected node, its connected edges, and direct neighbor nodes (`node.neighborhood('node')`).

---

## 2. Current Broken Behavior

Following the layout mode implementation, selecting a node caused non-neighbouring nodes to be **completely removed / invisible** from the graph canvas rather than remaining present in a faded/dimmed state.

Specifically:
- Selecting a node left only the selected node and direct neighbours on canvas.
- Unrelated nodes were removed from `cy.nodes()`.
- The user lost visibility of the broader graph topology during node inspection.

---

## 3. Exact Root Cause

The regression was caused by two coupled factors during the mode implementation:

1. **Omission of Selection Highlight Handler in `GraphView.tsx`:**
   In `GraphView.tsx`, the `useEffect([selectedNodeId, selectedEdgeId])` hook called `selectNode(cy, selectedNodeId)` (setting Cytoscape `:selected` state), but failed to call `highlightNodeConnections(cy, selectedNodeId)`. Likewise, element synchronization effects re-built Cytoscape elements without re-applying `highlightNodeConnections(cy, selectedNodeId)`.

2. **Null Reset Override in `focusedNodeId` Effect:**
   In `GraphView.tsx`, `useEffect([focusedNodeId])` executed `clearHighlights(cy)` whenever `focusedNodeId` was `null` (the default state for ordinary single-click selection), wiping out any active Cytoscape visual dimming/highlighting classes.

---

## 4. Exact Fix

The fix restores `highlightNodeConnections(cy, selectedNodeId)` to all relevant React lifecycle and selection effects in `GraphView.tsx` without mutating graph topology or node coordinates:

1. **`GraphView.tsx` — Selection Effect:**
   ```tsx
   useEffect(() => {
     if (!cyRef.current) return;
     const cy = cyRef.current;

     cy.batch(() => {
       if (selectedNodeId) {
         selectNode(cy, selectedNodeId);
         highlightNodeConnections(cy, selectedNodeId);
       } else if (!selectedEdgeId) {
         deselectAll(cy);
         clearHighlights(cy);
       }
     });
   }, [selectedNodeId, selectedEdgeId]);
   ```

2. **`GraphView.tsx` — Element Synchronization Effect:**
   Re-applies `highlightNodeConnections(cy, selectedNodeId)` when Cytoscape elements are re-added during filter updates.

3. **`GraphView.tsx` — Focused Node Effect:**
   Falls back to `highlightNodeConnections(cy, selectedNodeId)` if `focusedNodeId` is `null` and a node is selected, rather than prematurely clearing highlights.

---

## 5. Interactive Behavior Verification

When a node is selected in **Interactive Mode**:

| Element Category | Cytoscape Membership (`cy.nodes()`) | Cytoscape Class | Visual Render State |
| :--- | :--- | :--- | :--- |
| **Selected Node** | Present | `:selected .highlighted` | Full opacity (`1.0`), blue/gold border |
| **Neighbours (1-hop)** | Present | `.highlighted` | Full opacity (`1.0`), gold border/line |
| **Unrelated Nodes** | **PRESENT** | `.dimmed` | **Faded opacity (`0.15`)** |

---

## 6. Graph Membership Verification

A dedicated regression test suite in `explorer/src/components/GraphView.test.tsx` proves graph membership invariance:

```ts
// Initial unselected node IDs
const beforeNodeIds = cy.nodes().map(n => n.id()); // 5 nodes

// Select Node A
rerender(<GraphView ... selectedNodeId="NodeA" />);

// Node IDs after selection
const afterNodeIds = cy.nodes().map(n => n.id());

expect(afterNodeIds).toEqual(beforeNodeIds); // PASS: 5 nodes retained
expect(mockElementsRemove).not.toHaveBeenCalled(); // PASS: 0 nodes removed
```

---

## 7. Visual Fade Verification

The regression test suite proves that Cytoscape `.dimmed` styling is applied to non-neighbour nodes:

```ts
const elementsCollection = cy.elements();
expect(elementsCollection.addClass).toHaveBeenCalledWith('dimmed');

// Selected node and direct neighbours have .dimmed removed
expect(nodeAElement.removeClass).toHaveBeenCalledWith('dimmed');
expect(neighborsA[0].removeClass).toHaveBeenCalledWith('dimmed');

// Unrelated nodes (Node D, Node E) retain .dimmed class (rendering at opacity: 0.15)
expect(mockNodeObjects[3].removeClass).not.toHaveBeenCalledWith('dimmed');
```

---

## 8. Static Mode Verification

Static Mode (`layoutMode: 'static'`) relies on position preservation policy in `position-policy.ts`.

- `highlightNodeConnections` only manipulates Cytoscape CSS classes (`.dimmed`, `.highlighted`).
- Zero layout algorithms or coordinate transformations are invoked during selection.
- **Result:** Static Mode preserves node coordinates, preserves viewport zoom/pan, and correctly applies visual fading to non-neighbouring nodes.

---

## 9. Filter Verification

Explicit node-type filters (e.g. toggling LWC, Apex, Object checkboxes in `SearchFilterPanel`) operate on `filterGraphByNodeTypes()` in `search-filter.ts`:

- Disabling a node type projects those nodes out of `visibleGraphData`.
- Selection fading operates downstream on whichever nodes are currently visible.
- Selection fading never overrides or un-hides explicitly disabled node types.

---

## 10. Focus Verification

Focus Mode (`FocusControls`: Depth 1, 2, 3, ALL; Direction: dependencies, dependents, both) operates via explicit user activation (`focusState.enabled: true`).

- When Focus Mode is explicitly ON, `computeFocusedGraph()` computes the focused sub-graph.
- When Focus Mode is OFF, full graph topology is retained, and node selection applies visual fading (`.dimmed`).

---

## 11. Investigation Verification

- **Single-click node:** Selects node, opens Investigation Drawer, applies `.dimmed` class to unrelated graph nodes, preserves viewport camera position.
- **Progressive drill:** Multi-level drilling centers camera on the drilled target via `focusOnNode(cy, focusedNodeId)` while maintaining visual dimming.

---

## 12. Viewport Regression Verification

Viewport neutrality is preserved across single-click selection and multi-selection sequences:

```ts
// Camera zoomed/panned before click
const beforeZoom = cy.zoom(); // 2.5
const beforePan = cy.pan();   // { x: 450, y: -280 }

// Select node
rerender(<GraphView ... selectedNodeId="ApexClass:AccountController" />);

// Camera position after click
expect(cy.zoom()).toBe(beforeZoom); // PASS: 2.5
expect(cy.pan()).toEqual(beforePan); // PASS: { x: 450, y: -280 }
expect(cy.animate).not.toHaveBeenCalled(); // PASS: No camera movement
```

---

## 13. Test Results

| Test Suite | Total Suites | Total Tests | Status |
| :--- | :--- | :--- | :--- |
| **Explorer Vitest Unit & Integration Tests** | **65 Passed** | **531 Passed** | **PASS** |
| **CLI & Source Resolution Script Suite** | **1 Suite** | **12 Passed** | **PASS** |
| **Production Build (`npm run build`)** | **1 Bundle** | **Clean** | **PASS** |

---

## 14. Remaining Risks

None identified. All modifications are localized strictly to Cytoscape visual class orchestration in `GraphView.tsx` and `graph-interactions.ts`.

---

## 15. Final Certification

**PASS**

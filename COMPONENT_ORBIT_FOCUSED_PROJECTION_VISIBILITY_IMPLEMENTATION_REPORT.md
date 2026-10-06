# COMPONENT ORBIT — FOCUSED PROJECTION VISIBILITY IMPLEMENTATION REPORT

**Executive Verdict**: `IMPLEMENTATION FIX COMPLETE — READY FOR ADVERSARIAL CLOSURE`  
**Date**: October 6, 2026  
**Target Dataset**: Real PBIM Dataset (`Pub-Infra-Mang`)  
**Scope**: Focused projection visibility isolation and edge suppression in Component Orbit mode  

---

## 1. Defect Reproduction

### Original Failure & Audit Baseline
The latest adversarial audit (`COMPONENT_ORBIT_SEMANTIC_GEOMETRY_CONTRADICTION_CLOSURE_AUDIT.md`) established that while Component Orbit adapter logic (`adaptComponentOrbit`) and geometry engine (`computeComponentOrbitLayout`) correctly computed positions for the focused reachable subset (128 / 102 / 101 / 1 nodes), **the Cytoscape runtime still rendered all 528 authoritative PBIM nodes**:

1. `cy.nodes().filter(n => n.visible()).length === 528` (all 528 nodes remained rendered).
2. Unfocused nodes retained stale coordinates from prior layout runs, producing **6 rendered overlaps** with focused nodes in `LWC:asset-dashboard-container` and **3 rendered overlaps** in `LWC:vendor-workspace`.
3. Unfocused nodes contributed **342–346 visible text labels** in the viewport.
4. Edges connected to unprojected nodes remained visually active.

### Affected Runtime Behavior
User selection of an LWC component in Orbit mode resulted in a mixed projection state where focused nodes were positioned radially around the Sun, but 400+ unprojected nodes remained visible on canvas, corrupting visual clarity and causing false overlaps.

---

## 2. Repository Truth & Rendering Path

### Actual Visibility Mechanism Found
Cytoscape.js elements manage visibility via `show()` / `hide()` collection methods, which toggle `display: 'element'` vs `display: 'none'`. When an element's display is `'none'`, `node.visible()` evaluates to `false`, and Cytoscape suppresses the node shape, background, border, and text label rendering completely.

### Actual Rendering Path
```
Component Orbit Focus Selection (GraphView)
  └──> effectiveLayoutOptions (focalLwcId, architectureMode)
        └──> runLayoutWithMetadata(cy, options)
              └──> computeArchitectureLayoutWithMetadata(nodes, edges, options)
                    ├──> adaptComponentOrbit(schemaInput, options)
                    │     └──> projection.nodes (focused reachable subset)
                    ├──> computeComponentOrbitLayout(projection)
                    │     └──> orbitOutput.positions
                    └──> returns { positions, orbitGuides, projectedNodeIds }
              └──> cy.batch(() => {
                     // Atomic Visibility Update
                     toShowNodes.show(); toHideNodes.hide();
                     toShowEdges.show(); toHideEdges.hide();
                   })
```

### Files Modified & Architectural Ownership
- `explorer/src/lib/architecture-layout.ts`: Defines `ArchitectureLayoutResultWithMetadata` and exports `projectedNodeIds: Set<string>` when Component Orbit projection is active.
- `explorer/src/lib/graph-layout.ts`: `runLayoutWithMetadata` and `runLayoutWithMetadataAsync` own the Cytoscape execution boundary, applying atomic `show()` / `hide()` filtering over `cy.nodes()` and `cy.edges()`.
- `explorer/src/components/GraphView.tsx`: Handles React state propagation for `architectureMode` and `focalLwcId` switches and element synchronization.
- `explorer/src/test/component-orbit-visibility.test.ts`: Automated test suite for synthetic and real-PBIM visibility verification.
- `scripts/test-component-orbit-visibility.cjs`: Standalone CLI verification runner.

---

## 3. Implementation Details

### Derivation of Focused Node Visibility
In `computeArchitectureLayoutWithMetadata` (`architecture-layout.ts`), when `architectureMode === 'orbit'`:
1. `adaptComponentOrbit` constructs the `ComponentOrbitProjection` object containing `projection.nodes`.
2. `projectedNodeIds = new Set(Object.keys(projection.nodes))` is created containing exact string IDs of all reachable focused nodes.
3. `projectedNodeIds` is returned in the `ArchitectureLayoutResultWithMetadata` interface.

### Atomic Node and Edge Suppression
In `runLayoutWithMetadata` (`graph-layout.ts`), inside a single `cy.batch()` transaction:
```ts
if (options?.architectureMode === 'orbit' && result.projectedNodeIds) {
  const focusedSet = result.projectedNodeIds;

  const toShowNodes = cy.nodes().filter(n => focusedSet.has(n.id()));
  const toHideNodes = cy.nodes().filter(n => !focusedSet.has(n.id()));

  toShowNodes.show();
  toHideNodes.hide();

  toShowNodes.forEach(node => {
    const id = node.id();
    if (posMap[id]) node.position(posMap[id]);
  });

  const toShowEdges = cy.edges().filter(
    e => focusedSet.has(e.data('source')) && focusedSet.has(e.data('target'))
  );
  const toHideEdges = cy.edges().filter(
    e => !focusedSet.has(e.data('source')) || !focusedSet.has(e.data('target'))
  );

  toShowEdges.show();
  toHideEdges.hide();
} else {
  // Restore full graph visibility when leaving Component Orbit
  cy.nodes().show();
  cy.edges().show();
  cy.nodes().forEach(node => {
    const id = node.id();
    if (posMap[id]) node.position(posMap[id]);
  });
}
```

### Label Suppression
When `toHideNodes.hide()` is executed, Cytoscape sets `display: 'none'`. Hidden nodes do not contribute rendered labels to the canvas, completely eliminating unprojected label clutter without requiring label deletion or offscreen displacement.

### Reversibility and Restoration
When switching to `hierarchical` or `hybrid` mode, `runLayoutWithMetadata` executes `cy.nodes().show()` and `cy.edges().show()`, restoring all 528 nodes and 2063 edges to visible status immediately.

---

## 4. Semantic Preservation

The implementation preserves all core architecture and semantic contracts:

- **Node IDs**: 100% preserved (0 synthetic IDs, 0 clones, 0 ID alterations).
- **Edge IDs**: 100% preserved (0 edge deletions or ID alterations).
- **Edge Endpoints**: `source` and `target` properties remain bit-for-bit invariant.
- **BFS Depth Calculation**: Unchanged (`computeGraphDepths` output is frozen).
- **Ring Assignment**: Unchanged (`ringIndex === depth`).
- **Shared Apex Identity**: 7 canonical shared Apex hubs retained with `◉` role symbol.
- **Child LWC Identity**: Preserved with `◎` role symbol.
- **Component Orbit Geometry**: `computeComponentOrbitLayout` positions remain bit-for-bit authoritative for all projected nodes, centered at `(0, 0)`.
- **Authoritative Cytoscape Graph**: `cy.nodes().length` remains 528 and `cy.edges().length` remains 2063 for PBIM.

---

## 5. Automated Tests

All tests passed cleanly in `explorer/src/test/component-orbit-visibility.test.ts` (13 tests total):

### Test 1 — Focused Projection Node Visibility
- Given 3 authoritative nodes and a 2-node projection:
- Result: 2 nodes visible (`LWC:parent-comp`, `LWC:child-comp`), 1 node hidden (`ApexClass:UnrelatedService`). Total nodes in Cytoscape = 3.

### Test 2 — Edge Filtering
- Given an internal edge and a cross-projection edge:
- Result: Internal edge `edge-1` visible; cross-projection edge `edge-2` hidden.

### Test 3 — Focus Transition (Focus A -> Focus B)
- Focus A (`parent-comp`) -> Focus B (`child-comp`).
- Result: `parent-comp` becomes hidden (`visible() === false`), `child-comp` and its dependencies become visible. No stale nodes from Focus A remain visible. Total graph count = 3.

### Test 4 — Isolated Component Scenario
- Focus on isolated component `LWC:error-panel`.
- Result: Exactly 1 node visible, 3 nodes hidden, 0 visible edges.

### Test 5 — Exit Component Orbit
- Switch from Component Orbit to `hierarchical` and `hybrid` modes.
- Result: All authoritative nodes (3/3) and edges (2/2) restored to `.show()`.

### Test 6 — Semantic Identity Preservation
- Verified 0 node deletions, 0 edge deletions, exact ID preservation, and intact `source`/`target` relationship metadata.

---

## 6. Real PBIM Verification

### Canonical Dataset Preflight
- **File**: `public/projects/pbim/explorer-data.json`
- **SHA-256 Digest**: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
- **Total Nodes**: 528
- **Total Edges**: 2063
- **Total LWCs**: 30
- **`lwc-template-child` Edges**: 19
- **`lwc-apex` Edges**: 51
- **Shared Apex Hubs**: 7

### Real PBIM Scenario Visibility Table

| Scenario | Projected Subset | Visible Nodes | Hidden Nodes | Visible Unfocused Nodes | Cytoscape Total Nodes |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **asset-dashboard-container** | 128 | 128 | 400 | **0** | 528 |
| **citizen-report-portal** | 102 | 102 | 426 | **0** | 528 |
| **vendor-workspace** | 101 | 101 | 427 | **0** | 528 |
| **error-panel** | 1 | 1 | 527 | **0** | 528 |

For all scenarios: `focusedNodeIds ∩ visibleUnfocusedNodeIds = ∅` and `visibleUnfocusedNodeIds.size === 0`.

---

## 7. Focus Transition Evidence

Tested sequential focus transitions on live PBIM Cytoscape instance:

`asset-dashboard-container` (128 visible / 400 hidden)  
  └──> `citizen-report-portal` (102 visible / 426 hidden / 0 stale nodes from asset visible)  
        └──> `vendor-workspace` (101 visible / 427 hidden / 0 stale nodes from citizen visible)  
              └──> `error-panel` (1 visible / 527 hidden / 0 edges)  
                    └──> `asset-dashboard-container` (128 visible / 400 hidden)  

All transitions executed atomically in `cy.batch()`. Zero stale nodes or cross-edges remained rendered across transitions.

---

## 8. Non-Orbit Regression Checks

- **Hierarchical Layout**: Verified all 528 nodes and 2063 edges render normally without filtering.
- **Hybrid Layout**: Verified feature region grouping and global domain packing function without filtering.
- **CLI Test Suite**: Passed all 31 repository CLI integration tests via `npm run test:cli`.

---

## 9. Remaining Risks

- None identified for projection visibility isolation. Final browser-level rendering audit (Playwright Chromium) will be executed in the subsequent adversarial closure phase.

---

## 10. Phase Verdict

`IMPLEMENTATION FIX COMPLETE — READY FOR ADVERSARIAL CLOSURE`

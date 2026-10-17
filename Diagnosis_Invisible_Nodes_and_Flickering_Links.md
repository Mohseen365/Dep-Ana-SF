# Diagnosis: Invisible Nodes + Flickering Links

Two distinct bugs compound. I'll separate them, name the code paths, then give the fix.

---

## Bug 1 — Invisible nodes: `dimmed` classes are never cleared in two cases

### Root cause

**`GraphView.tsx` L~1005, "Handle selected node changes" effect:**

```js
cy.batch(() => {
  if (selectedNodeId) {
    selectNode(cy, selectedNodeId);
    highlightNodeConnections(cy, selectedNodeId);   // ← dims everything not connected
  } else if (!selectedEdgeId) {                     // ← only clears if BOTH are null
    deselectAll(cy);
    clearHighlights(cy);
  }
  // ← if selectedNodeId is null AND selectedEdgeId is set, NOTHING happens
});
```

`highlightNodeConnections` almost certainly applies a `.dimmed` class (opacity ≈ 0.15 in `graph-style.ts`) to every node not connected to the selected one. That's by design — highlighting a node dims the rest.

The bug is **the clear path is skipped whenever an edge is selected**. Concrete sequence:

1. User selects **node A**. Everything else gets `.dimmed` (opacity 0.15). Nodes look invisible.
2. User clicks **edge B**. `selectedNodeId → null`, `selectedEdgeId → B`.
3. Effect runs. First branch is false. Second branch `!selectedEdgeId` is also false. **Neither branch fires.**
4. `dimmed` classes stay on every node that was dimmed in step 1. **Nodes remain at opacity 0.15 forever.**

Same bug on **`focusOnNode`** — L~1055:

```js
if (focusedNodeId) {
  focusOnNode(cy, focusedNodeId);           // likely also dims others
} else if (selectedNodeId) {
  highlightNodeConnections(cy, selectedNodeId);
} else {
  clearHighlights(cy);
}
```

If `focusedNodeId` is set (progressive drill active) and then cleared while `selectedNodeId` is still set, `focusOnNode`'s dimming isn't explicitly removed — the branch falls to `highlightNodeConnections` which may or may not clear `focusOnNode`'s classes depending on the implementation of `graph-interactions.ts`.

### Confirm it

In DevTools console with the graph on screen:

```js
window.__CY__.nodes('.dimmed').length          // should be 0 when nothing is selected
window.__CY__.nodes('.impact-muted').length    // should be 0 when impact is cleared
window.__CY__.nodes('.simulated-removed').length
window.__CY__.elements('.zoom-far').length
```

If `.dimmed` is non-zero when nothing is selected, that's the bug.

### Fix

```js
// "Handle selected node changes"
cy.batch(() => {
  if (selectedNodeId) {
    selectNode(cy, selectedNodeId);
    highlightNodeConnections(cy, selectedNodeId);
  } else {
    deselectAll(cy);
    clearHighlights(cy);   // ← always clear when no node is selected
  }
});

// "Handle focusedNodeId"
if (focusedNodeId) {
  focusOnNode(cy, focusedNodeId);
} else if (selectedNodeId) {
  clearHighlights(cy);           // ← clear focus dim before re-applying selection dim
  highlightNodeConnections(cy, selectedNodeId);
} else {
  clearHighlights(cy);
}
```

Also verify `clearHighlights` in `graph-interactions.ts` removes `dimmed`, `highlighted`, `impact-muted`, `finding-highlighted` — not just some of them. If it only handles some, extend it.

---

## Bug 2 — Flickering links: LOD opacity + structural rebuild on every keystroke

### Root cause A — LOD edge opacity is effectively invisible at far zoom

`graph-style.ts`:

```js
{ selector: 'edge.zoom-far',  style: { opacity: 0.18, width: 1 } },
{ selector: 'edge.zoom-mid',  style: { opacity: 0.45 } },
{ selector: 'edge.zoom-near', style: { label: 'data(relationshipType)' } }  // opacity 1 default
```

At `zoom-far`, edges render at **0.18 opacity**. That is visually indistinguishable from gone on most monitors. Zoom out one notch → links disappear. Zoom back in one notch → links reappear at 0.45, then 1.0. **From the user's perspective: links disappear and reappear.**

The `updateZoomClass` function runs on a 60ms debounce of every `zoom` event:

```js
cy.on('zoom', () => {
  if (zoomTimeout) return;
  zoomTimeout = setTimeout(() => { zoomTimeout = null; updateZoomClass(); }, 60);
});
```

Every pinch, wheel scroll, or fit-to-view that crosses an LOD threshold toggles the class. **Every navigation triggers this.** That's the flicker.

### Fix

Two options:

**Option 1 — Raise the far-zoom opacity** so links are still perceptible:

```js
{ selector: 'edge.zoom-far', style: { opacity: 0.35, width: 1 } },   // was 0.18
{ selector: 'edge[isInterFeature = "true"].zoom-far', style: { opacity: 0.7, width: 1.5 } },
```

**Option 2 — Only hide labels at far zoom, don't touch opacity.** This is the safer choice:

```js
{ selector: 'edge.zoom-far', style: { 'label': '', width: 1 } },
// remove the opacity declarations entirely; let edges stay at 1.0
```

Then `dimmed` (from highlight) is the only thing that dims edges, which is intentional.

### Root cause B — Every search keystroke tears down and rebuilds the entire graph

Two effects conspire:

```js
// N8 not fixed:
const discoveryResult = useMemo(() => discoverFeatures(nodes, edges), [nodes, edges]);
// nodes and edges are the FILTERED props from App.tsx
```

```js
// Structural-sync deps:
}, [nodes, edges, findings, featureAssignmentMap, architectureMode, captureAndPersistPositions]);
```

Chain on **every filter keystroke**:

1. `view.filterState.searchQuery` updates → `App.tsx` recomputes `visibleGraphData` → new `nodes` reference
2. `discoveryResult` recomputes (identity-based memo)
3. `featureAssignmentMap` recomputes (depends on `discoveryResult`)
4. Structural-sync effect fires because `featureAssignmentMap` is in its deps
5. `cy.elements().remove(); cy.add(newElements);` — **full teardown/rebuild**
6. Layout runs with `animate: true` — nodes fly from {0,0} to layout positions
7. `captureAndPersistPositions` fires → writes to project state
8. Position-only sync effect may also fire

**Every keystroke causes a 250ms layout animation, viewport motion, and edge re-rendering.** That is the appearance/disappearance/reappearance cycle.

### Fix (three small changes)

**1. Memoize `discoveryResult` on a fingerprint, not identity** (this is N8 from the plan):

```js
const graphFingerprint = useMemo(
  () => nodes.length + ':' + edges.length + ':' + nodes.map(n => n.type).join(''),
  [nodes, edges]
);

const discoveryResult = useMemo(() => discoverFeatures(nodes, edges), [graphFingerprint]);
```

Even better: hoist `discoverFeatures` up to `App.tsx` on the **full** `activeData`, not the filtered `visibleGraphData`. Then it only recomputes on project change or simulation commit — never on filter keystroke.

**2. Disable layout animation on filter-driven structural changes.** The `shouldAnimate` guard already checks `!prefersReducedMotion && nodes.length < 100`. Add: don't animate when this is a **pure filter change** (element set shrink/grow, positions unchanged):

```js
const shouldAnimate =
  !prefersReducedMotion &&
  nodes.length < 100 &&
  architectureMode !== 'orbit' &&
  hasGenuinelyNewNodes;  // ← only animate when new nodes appear
```

When the filter just hides/show nodes (no new nodes), layout should be **instant**. `hasGenuinelyNewNodes` is already computed.

**3. Don't run the layout at all for pure filter changes.** This is the bigger design fix: the position authority has already decided each node's position. The graph shouldn't re-layout when a filter hides some nodes — it should just hide them. `shouldAutoLayout(layoutMode, trigger, ...)` is already called with `trigger = 'graph-update'` when no new nodes appear; verify that returns `false` for `graph-update`. If it doesn't, that's a `position-policy.ts` bug worth fixing at the policy layer, not the view layer.

---

## Secondary contributors (compound the flicker)

### S1. `impactResult` effect re-runs on object identity

```js
useEffect(() => { /* impact-muted etc. */ }, [impactResult]);
```

If `App.tsx` or `WorkspaceShell` recreates the `impactResult` object on every render (even with identical content), the effect fires and toggles classes. Confirm `impactResult` is memoized by content, not by reference:

```js
const impactResult = useMemo(() => computeImpact(...), [impactOriginId, activeData]);
```

If it's passed through `WorkspaceShell` un-memoized, that's the cause.

### S2. Cycle highlight likely uses the same `dimmed` class

`highlightCycle(cy, selectedCycleNodeIds)` probably adds `.dimmed` to non-cycle nodes. If `selectedCycleNodeIds` clears but `clearCycleHighlight` doesn't remove `.dimmed` (only removes `.cycle-*`), dimmed sticks. **Bug 1's fix pattern applies here too:** every "highlight" helper must remove **every** dim class it added, or use a shared `.visual-state-*` namespace.

### S3. `simulated-removed` opacity 0.45 stays applied if props don't change

```js
useEffect(() => { /* ... simulated-removed etc. */ }, [simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]);
```

If `simulatedRemovedNodeIds` is a new array of the same contents every render, the effect fires repeatedly and toggles classes. Confirm the arrays are memoized on `activeSimulationProposal` and `simulationStepIndex` (they are in `App.tsx` — good). But if `activeSimulationProposal` is set to `null` and then a **new proposal** with identical content is created, the arrays change identity, the effect fires, and it removes + re-adds classes → visible flicker.

Fix: compute a content hash and memoize on the hash.

### S4. `selectNode` + `highlightNodeConnections` are called **3 times** per rebuild

- L~1010 (selected node changes effect)
- L~1045 (in structural-sync effect)
- L~1060 (focusedNodeId effect)

Each call re-applies dimming. If they run in different orders or with different assumptions about what's already dimmed, classes flicker between applications. **Consolidate**: one effect should own the visual highlight state. The structural-sync effect should not call `selectNode` at all — that's the selection effect's job.

### S5. Position-only effect fights the layout mid-animation

```js
useEffect(() => {
  // ... sets cyNode.position() if it differs from resolved
}, [nodePositions, architectureMode]);
```

During a layout animation, `cyNode.position()` returns the *current animated* position, which differs from the persisted position. The effect sees a mismatch and snaps the node to the persisted position — interrupting the animation. Every frame or every state update. **This is a flicker source on every layout.**

Fix: skip the effect while `isLayoutRunningRef.current` is true:

```js
if (isLayoutRunningRef.current) return;
```

Or guard on `cy.nodes().filter(':grabbed').length === 0 && !isLayoutRunningRef.current`.

### S6. `markLayoutEnd` still unpaired in some paths

Minor, but if `layout-*-start` is left unpaired on every cancelled request, over a long session `performance.measure` calls accumulate stale entries. Cosmetic but reduces signal.

---

## Prioritized fix plan

### Fix 1 (5 min, highest impact) — always clear highlights

**File:** `GraphView.tsx`, "Handle selected node changes"

```js
cy.batch(() => {
  if (selectedNodeId) {
    selectNode(cy, selectedNodeId);
    highlightNodeConnections(cy, selectedNodeId);
  } else {
    deselectAll(cy);
    clearHighlights(cy);         // ← was `} else if (!selectedEdgeId) {`
  }
});
```

Also verify `clearHighlights` (in `graph-interactions.ts`) removes **all** dim/highlight classes: `dimmed`, `highlighted`, `impact-muted`, `impact-origin`, `impact-affected`, `finding-highlighted`, `cycle-*`.

**File:** `GraphView.tsx`, "Handle focusedNodeId"

```js
if (focusedNodeId) {
  focusOnNode(cy, focusedNodeId);
} else if (selectedNodeId) {
  clearHighlights(cy);           // ← add this
  highlightNodeConnections(cy, selectedNodeId);
} else {
  clearHighlights(cy);
}
```

### Fix 2 (2 min) — raise LOD far-zoom opacity

**File:** `graph-style.ts`

```js
{ selector: 'edge.zoom-far', style: { label: '', opacity: 0.35, width: 1 } },   // was 0.18
{ selector: 'edge[isInterFeature = "true"].zoom-far', style: { opacity: 0.7, width: 1.5 } },
```

### Fix 3 (10 min) — stop tearing down the graph on filter keystroke

**File:** `GraphView.tsx`

```js
const discoveryResult = useMemo(
  () => discoverFeatures(nodes, edges),
  [nodes.length, edges.length, nodes[0]?.id, nodes[nodes.length-1]?.id]   // crude fingerprint
);
```

Or better — hoist `discoverFeatures` to `App.tsx` on `activeData` (not `visibleGraphData`) and pass down as a prop:

```js
// App.tsx
const discoveryResult = useMemo(() => discoverFeatures(activeData?.nodes ?? [], activeData?.edges ?? []), [activeData]);
```

### Fix 4 (3 min) — don't animate layout on pure filter changes

**File:** `GraphView.tsx`, structural-sync effect

```js
const shouldAnimate =
  !prefersReducedMotion &&
  nodes.length < 100 &&
  architectureMode !== 'orbit' &&
  hasGenuinelyNewNodes;   // ← only animate when nodes are actually added
```

### Fix 5 (5 min) — skip position-only sync while layout is running

**File:** `GraphView.tsx`, "Position-Only Synchronization Effect"

```js
useEffect(() => {
  if (!cyRef.current) return;
  if (isLayoutRunningRef.current) return;      // ← add this
  // ...
}, [nodePositions, architectureMode]);
```

### Fix 6 (optional, 2 min) — remove duplicate highlight calls

**File:** `GraphView.tsx`, structural-sync effect — remove the trailing block:

```js
// Delete these three blocks from the structural-sync effect; the dedicated
// effects already handle selection, impact, cycle, and focus.
if (selectedNodeId) { selectNode(cy, selectedNodeId); highlightNodeConnections(cy, selectedNodeId); }
if (impactResult) { /* ... */ }
if (selectedCycleNodeIds && ...) { highlightCycle(cy, selectedCycleNodeIds); }
if (focusedNodeId) { focusOnNode(cy, focusedNodeId); }
```

Rationale: the structural-sync effect fires when `nodes`/`edges`/`featureAssignmentMap`/`architectureMode` change. **Selection, impact, cycle, focus have their own effects.** Duplicating them in structural-sync means every filter change re-applies them, which produces the flicker.

---

## How to verify the fix

### Before you code

1. **Reproduce with console** — select a node, click an edge, check `window.__CY__.nodes('.dimmed').length`. If it's non-zero, Bug 1 is confirmed.
2. **Zoom test** — zoom out one notch and back. Watch edge opacity. If it drops to near-zero around the 2/3 boundary, LOD is confirmed.
3. **Search test** — type in the search box. Watch the layout animate on every keystroke. If it does, Bug 2's structural tear-down is confirmed.

### After you code

1. Select node → click edge → deselect. All nodes fully opaque. `window.__CY__.nodes('.dimmed').length === 0`.
2. Select node → click background. All nodes fully opaque.
3. Zoom out/in. Edges stay visible across all LOD levels.
4. Type in search. Graph updates instantly, no layout animation, no flicker.
5. Toggle impact mode → clear impact. All nodes return to opacity 1.

If any of these fail, capture:
- `window.__CY__.nodes().map(n => ({ id: n.id(), classes: n.classes(), opacity: n.style('opacity') }))`
- Check which class is still applied and which effect forgot to clear it.

---

## Where this maps back to the deferred plan

- **N8** (discoveryResult fingerprint) — Fix 3, this *was* in the plan
- **N9** (hover diff-check) — unrelated, still worth doing
- **Bug 1** (clear highlights conditional) — **not in the plan**, new finding
- **LOD opacity** — **not in the plan**, new finding, arguably a design decision worth revisiting
- **Position-only sync mid-layout** — **not in the plan**, new finding
- **Structural-sync duplicates selection highlighting** — **not in the plan**, new finding

These four new findings should go into the deferred register as "Discovered during closure testing, unrelated to deferred architecture work." Fix 1 and Fix 5 are one-liners that will eliminate most of the visible flicker. Fix 3 is the structural fix that keeps it stable under search.

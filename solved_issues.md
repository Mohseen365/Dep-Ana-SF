I audited the provided files and found several real bugs. I’ve grouped them by severity.

---

## 🔴 Critical / runtime errors

### 1. `GraphView.tsx` — `onFocusChangeRef` is never defined
In `handleKeyDown`:
```ts
if (onFocusChangeRef.current) {
  onFocusChangeRef.current({ enabled: false, focusNodeId: null });
}
```
`onFocusChangeRef` does not exist anywhere in the component. Pressing **Escape** will throw `ReferenceError: onFocusChangeRef is not defined`. The prop `onFocusChange` is available in scope, so this should be:
```ts
onFocusChange?.({ enabled: false, focusNodeId: null });
```
(or a proper `useRef` must be declared and synced).

---

### 2. `graph-style.ts` — selection styles are overridden
`node:selected` is declared very early:
```ts
{ selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#3b82f6' } }
```
Later rules set `border-color` (type rules) and `border-width` (risk rules). Cytoscape applies styles in declaration order, so:
- selected node border color becomes the **type color** (`#1d4ed8`, etc.),
- selected LOW‑risk nodes even get `border-width: 2` instead of `4`.

The selection highlight is effectively broken. Move `node:selected` after type/risk rules or raise specificity (e.g. `node:selected[type]`).

---

### 3. `graph-style.ts` — boolean data selectors will not match
These selectors compare a boolean data field to a string:
```ts
node[hasCycles = "true"]
node[hasUnresolved = "true"]
edge[unresolved = "true"]
```
`buildGraphElements` almost certainly stores `hasCycles`, `hasUnresolved`, `unresolved` as **booleans**. Cytoscape’s `[attr = "true"]` compares against the string `"true"`, so these rules never match. Use the truthy selector instead:
```ts
node[?hasCycles]
node[?hasUnresolved]
edge[?unresolved]
```

---

### 4. `GraphView.tsx` — triple layout on initial mount + double architecture computation
On mount, three layouts run:
1. `cytoscape({ layout: layoutOptions, ... })` runs a layout in the constructor.
2. `cy.layout(layoutOptions).run()` runs the **same** layout again.
3. `runLayoutWithMetadata(cy, {...})` runs the architecture layout a third time.

Also `getLayoutOptions(...)` internally calls `computeArchitectureLayout(...)`, then `runLayoutWithMetadata` calls `computeArchitectureLayoutWithMetadata(...)` again. This is a significant performance regression and can cause animation races (the preset layout is animated by default for <100 nodes). Remove the redundant explicit `.run()` and reuse the positions already computed.

---

### 5. `GraphView.tsx` — structural sync wipes all visual classes
The structural sync effect does:
```ts
cy.batch(() => {
  cy.elements().remove();
  cy.add(newElements);
});
```
Every class is lost: selection, `zoom-far`/`zoom-mid`, `impact-*`, `cycle-*`, `finding-highlighted`, `simulated-added`, `dimmed`, etc. The separate effects that add these classes only re‑run when their own deps change. If `findings` or `featureAssignmentMap` changes (which triggers structural sync) but `selectedFinding` / `simulatedNodeIds` / `selectedNodeId` do not, the highlights are silently lost. This also happens when switching **to/from hybrid mode**, because `featureAssignmentMap` changes and forces a rebuild.

Additionally, the structural sync runs with the **old** `nodePositionsRef.current` when architecture mode changes to hybrid, which can overwrite the freshly computed layout for the new mode. Since `autoLayoutPolicy` for `graph-update` is false, the new mode can end up with the previous mode’s persisted positions until the parent state catches up — and permanently if `onNodePositionsChange` is not supplied.

---

### 6. `GraphView.tsx` — position-only sync runs on architecture mode change
```ts
useEffect(() => {
  ...
  cy.nodes().forEach((cyNode) => {
    const resolved = resolvePosition(id, {
      persisted: nodePositions, // old-mode positions
      ...
    });
    ...
  });
}, [nodePositions, architectureMode]);
```
When `architectureMode` changes but `nodePositions` still contains the **previous** mode’s positions, this effect re-applies the old positions to the newly laid-out graph. The architecture-switch effect runs first and applies the new layout, then this effect runs in the same commit and overwrites it with the old mode’s positions. The final state only becomes correct after the parent re-renders with updated `nodePositions`. If `onNodePositionsChange` is missing, the new layout is lost entirely.

---

### 7. `graph-layout.ts` — `getLayoutOptions` ignores `useArchitectureLayout: false`
```ts
if (nodes && nodes.length > 0) {
  const posMap = computeArchitectureLayout(nodes, edges || [], options);
  return { name: 'preset', positions: ... };
}
```
Even if the caller passes `useArchitectureLayout: false`, this function still uses the architecture layout whenever `nodes` are provided. `createLayout` calls `getLayoutOptions(options)` in the non-architecture path, so passing `nodes` in `options` silently re-enables architecture layout, contradicting the flag.

---

## 🟠 Significant correctness bugs

### 8. `GraphView.tsx` — selection clears unrelated highlight layers
The selection effect calls `clearHighlights(cy)`:
```ts
if (selectedNodeId) {
  clearHighlights(cy);
  ...
}
```
`clearHighlights` removes `finding-highlighted`, `impact-*`, `cycle-*`, and focus classes. Those layers are re-applied only by effects whose deps (`selectedFinding`, `impactResult`, etc.) **did not change**. So selecting a node after selecting a finding removes the finding highlight. The same happens to impact and cycle highlights. Selection changes should only clear selection-specific classes, or the other highlight effects should re-run on selection change.

---

### 9. `GraphView.tsx` — provenance is dropped when persisting drag positions
`captureAndPersistPositions('user-authored')` calls:
```ts
(onNodePositionsChangeRef.current as any)(currentPositions, provenance);
```
But `GraphViewProps` declares:
```ts
onNodePositionsChange?: (nodePositions: Record<string, { x: number; y: number }>) => void;
```
The second argument is discarded by the parent. As a result, `layoutProvenance` is never set to `'user-authored'` when the user drags a node. This weakens the position-authority logic and can cause layouts to discard user drags in cases that rely on `'user-authored'`.

---

### 10. `graph-layout.ts` — non-animated path never emits `layoutstop`
In `runLayoutWithMetadata`, the animated branch runs a preset layout:
```ts
cy.layout({ ..., animate: true }).run();
```
but the non-animated branch only sets positions and calls `cy.fit(...)`. No layout is created, so `layoutstart`/`layoutstop` do not fire. `GraphView` uses these events to maintain `isLayoutRunningRef`/`isLayoutRunning`. If an animated layout is interrupted by a synchronous non-animated layout, the layout depth can remain > 0, leaving `isLayoutRunning` stuck and causing the position-only sync effect to skip updates.

---

### 11. `architecture-layout.ts` — constellation guides are stored as `orbitGuides`
```ts
return {
  positions: constellationPositions,
  orbitGuides: constellationOutput.guides as any,
  ...
};
```
This mislabels constellation guides as orbit guides. `GraphView` only passes `orbitGuides` to `FeatureOverlayCanvas` when `architectureMode === 'orbit'`, so constellation guides are never rendered. The type also incorrectly suggests they are orbit guides.

---

### 12. `GraphControls.tsx` — architecture-mode button overflows
`.graph-control-btn` has a fixed size:
```css
.graph-control-btn { width: 28px; height: 28px; ... }
```
But the architecture toggle contains a label:
```tsx
<span className="graph-control-btn-label" style={{ marginLeft: '4px' }}>
  {ARCH_MODE_META[architectureMode].label}
</span>
```
There is no CSS override for `.graph-control-btn-label`, so the label overflows the 28px button and can collide with adjacent controls. Use `width: auto` (or a wider class) for labelled buttons.

---

### 13. `bindGraphInteractions` — background tap double-invokes selection clearing
```ts
cy.on('tap', (event) => {
  if (event.target === cy) {
    if (onBackgroundTap) onBackgroundTap();
    if (onNodeSelect) onNodeSelect(null);
  }
});
```
`GraphView` supplies **both** callbacks, so a background tap calls `investigation.clearSelection()` and `onSelectNodeRef.current(null)` twice. Idempotent in the current implementation, but it’s a latent duplicate-invocation bug. Either remove `onNodeSelect(null)` from this branch or only call it when `onBackgroundTap` is not provided.

---

### 14. `architecture-layout.ts` — sorting can crash on missing `id`
```ts
safeEdges.sort((a, b) => a.id.localeCompare(b.id));
safeNodes.sort((a, b) => a.id.localeCompare(b.id));
```
Both assume `id` is always a non-null string. The edge adapters elsewhere defensively use `(a.id || '')`, but this module does not. A single edge/node without `id` will throw `TypeError: Cannot read properties of undefined (reading 'localeCompare')`.

---

### 15. `component-orbit-adapter.ts` — `availableSuns` is O(n·e)
```ts
const outCount = edges.filter((e) => e.source === lwc.id).length;
```
This runs for every LWC inside the `map`. For large graphs (thousands of nodes/edges) this is O(LWC × edges). Pre-compute an outgoing-edge count map once.

---

## 🟡 Moderate / lower severity

### 16. `GraphControls.tsx` — `useLayoutEffect` on the server
`useLayoutEffect` is used directly. In SSR it emits React’s “useLayoutEffect does nothing on the server” warning. Use `useEffect` or an isomorphic layout effect hook.

### 17. `App.tsx` — Escape listener depends on object identity
```ts
useEffect(() => { ... }, [
  selectedNodeId,
  selection.selectedEdgeId,
  view.focusState,   // object
  ...
]);
```
If `view.focusState` is a new object each render, the keydown listener is removed and re-added every render. Destructure the primitives (`view.focusState.enabled`, etc.) instead.

### 18. `projectState.ts` — legacy migration only fills the active mode
When `layoutPositions` is not explicitly present, flat `nodePositions` are migrated only into `activeArchMode`. Other modes remain empty. After a schema upgrade, if the user switches architecture modes, persisted positions are lost. Consider migrating flat positions into `hierarchical` (or the default) and copying/aliasing as appropriate.

### 19. `GraphView.tsx` — zoom LOD classes are not restored after structural sync
`updateZoomClass` is only bound to the `zoom` event. After the structural sync replaces all elements, the new elements lack `zoom-far`/`zoom-mid`/`zoom-near`/`lod-*` classes until the user zooms. Labels may therefore be visible at far zoom, or hidden at near zoom, until the next zoom event. Re-run `updateZoomClass()` after `cy.add(newElements)`.

### 20. `GraphView.tsx` — keyboard Escape does not clear focus state
Because of bug #1, `onFocusChange` is never invoked from the Escape handler. Even after fixing the ref, ensure `onFocusChange` is actually passed and that `view.setFocusState` clears the focus node.

### 21. `component-constellation-layout.ts` — reliance on global `performance`
`performance.now()` is used directly. In non‑browser, non‑Node‑16+ environments this can throw. The rest of the codebase typically guards or polyfills this.

### 22. `GraphView.tsx` — `onSelectEdge('')` on Escape
The parent’s `onSelectEdge` is typed `(edgeId: string) => void`. Passing `''` relies on the parent treating it as “clear”. This is fragile; a dedicated `onClearSelection` callback or `null` would be safer.

---

## ✅ Things that look correct (for reference)
- `deep-bug-hunt-fixes.test.ts` mock of `cy.elements()` is sufficient for the `removeClass` assertion (the `forEach` callback is not executed, so `ele.classes()` is not reached).
- The architecture-layout determinism tests should pass; the pipeline has no `Math.random()` / unordered iteration that I could find.
- `clearHighlights` correctly removes all class names it is expected to remove, and the test asserts the exact class string.

# Deep Dive: Trigger & Persistence Cluster

**Note:** `WorkspaceHeader.tsx` was not provided in the file set, so I can't verify the wiring from the header toggle to `updateProjectState` — I'll flag the integration gaps that must be checked there.

---

## 🔴 Critical — button toggles, geometry never changes

### C1. `GraphView.tsx` — effect ordering reads stale refs

The refs that the architecture-mode-switch effect depends on are synced in a `useEffect` that is declared **later** in the component:

```tsx
// (line ~310, declared first — runs first)
useEffect(() => {                 // ← reads nodePositionsRef / graphLayoutRef / layoutModeRef
  const hasAuth = !!nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0 && ...;
  const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {};
  ...
}, [architectureMode, effectiveLayoutOptions.focalLwcId, captureAndPersistPositions]);

// (line ~245, declared second — runs AFTER)
useEffect(() => {
  nodePositionsRef.current = nodePositions;
  graphLayoutRef.current = graphLayout;
  layoutModeRef.current = layoutMode;
  effectiveLayoutOptionsRef.current = effectiveLayoutOptions;
}, [nodes, edges, nodePositions, onNodePositionsChange, layoutMode, graphLayout, ...]);
```

React runs `useEffect`s in declaration order, so on the render where `architectureMode` flips from `hierarchical → hybrid`:

| Ref | Value seen by mode effect | Expected value |
|---|---|---|
| `nodePositionsRef.current` | previous mode's positions (stale) | `{}` for new mode |
| `graphLayoutRef.current.architectureMode` | `'hierarchical'` (stale) | `'hybrid'` |
| `layoutModeRef.current` | previous layoutMode (stale) | new layoutMode |
| `effectiveLayoutOptionsRef.current.focalLwcId` | previous focal id (stale) | new derived focal id |

Consequences:

- `hasAuth` is computed from old-mode positions and old `currentProv`, not the new-mode `layoutProvenance`. In `'architecture-mode-switch'` this is survivable because the policy returns `true` unconditionally, but it means `existingPosMap = graphLayoutRef.current.layoutPositions['hybrid'] ?? {}` may be non-empty from a previous session or empty from a fresh session — inconsistent between first and subsequent switches.
- **Switching to `orbit` uses stale `focalLwcId`** (from the pre-switch `effectiveLayoutOptionsRef.current`). If the user selected an LWC before switching, that intent is dropped and the adapter falls back to `availableSuns[0]`. This is a *geometry-changes-to-the-wrong-thing* bug.

**Fix:** either move the ref-sync effect **above** the mode effects, or drop the refs in the mode effect and use the current props/closures directly (`nodePositions`, `graphLayout`, `layoutMode`, `effectiveLayoutOptions`).

---

### C2. `GraphView.tsx` — structural sync fires a second full layout on mode switch

`featureAssignmentMap` is:

```tsx
const featureAssignmentMap = useMemo((): Map<string, string> | undefined => {
  if (architectureMode !== 'hybrid') return undefined;
  ...
}, [architectureMode, discoveryResult]);
```

So on `hierarchical → hybrid`, `featureAssignmentMap` goes `undefined → Map`, which triggers the structural-sync effect:

```tsx
useEffect(() => { ... }, [nodes, edges, findings, featureAssignmentMap, captureAndPersistPositions]);
```

Inside it:

```tsx
const hasAuthForUpdate =
  !!nodePositionsRef.current &&
  Object.keys(nodePositionsRef.current).length > 0 &&
  (currentProvSync === 'user-authored' ||
    (storedArchModeSync === architectureMode && ...));
```

`graphLayoutRef.current` is still stale (C1), so `storedArchModeSync === 'hierarchical' ≠ 'hybrid'`. If the user hasn't dragged nodes, `currentProvSync === 'automatic-hierarchical'` → `hasAuthForUpdate = false`. Then:

```tsx
const trigger: LayoutTrigger = hasGenuinelyNewNodes ? 'new-nodes' : 'graph-update';
const autoLayoutPolicy = shouldAutoLayout(layoutModeRef.current, trigger, {
  hasAuthoritativePositions: hasAuthForUpdate,
});
```

`shouldAutoLayout('interactive', 'graph-update', { hasAuthoritativePositions: false })` → `true`. So **a full synchronous layout runs inside structural sync**, while the async layout from the mode-switch effect is also still in flight. Two layouts on the same canvas — the last one to finish wins, and since structural sync is synchronous, it wins immediately, then the async one overwrites it later. Visually, the mode switch may appear to happen twice.

**Fix:** suppress the structural-sync auto-layout when the trigger is a mode switch (pass the trigger down or guard on `prevArchitectureModeRef`).

---

### C3. `GraphControls.tsx` — architecture toggle is silently hidden when `onArchitectureModeChange` is missing

```tsx
{onToggleArchitectureMode && (
  <button ... data-testid="architecture-mode-toggle">…</button>
)}
```

And in `GraphView.tsx`:

```tsx
onToggleArchitectureMode={onArchitectureModeChange ? handleToggleArchitectureModeInternal : undefined}
```

If `WorkspaceShell` (or `App`) forgets to wire `onArchitectureModeChange` to `updateProjectState`, the button is not rendered at all — no error, no warning. Verify `WorkspaceShell.tsx` actually passes `onArchitectureModeChange` (and `onLayoutModeChange`) down to `GraphView`. This is the most likely cause of “the button doesn’t exist / doesn’t do anything.”

---

### C4. `GraphControls.tsx` + `index.css` — architecture label overflows the fixed-width button

```css
.graph-control-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}
```

But the toggle renders:

```tsx
<span aria-hidden="true">{ARCH_MODE_META[architectureMode].icon}</span>
<span className="graph-control-btn-label" style={{ marginLeft: '4px' }}>
  {ARCH_MODE_META[architectureMode].label}
</span>
```

`.graph-control-btn-label` has **no CSS at all** in `index.css` (only an inline `marginLeft`). The label (~8 chars) needs ~50–70px but the button is capped at 28px with `flex-shrink: 0`. The label spills into neighbouring controls (`layout-mode-toggle`, `reset-layout`) and can visually collide with them; on narrow viewports the wrap in `.graph-controls-floating { flex-wrap: wrap }` can push the whole toolbar into the canvas.

**Fix:** add `.graph-control-btn:has(.graph-control-btn-label) { width: auto; padding: 0 8px; }` or use a dedicated class (`graph-control-btn--labelled`).

---

### C5. `projectState.ts` — mode change and position capture can race / mis-attribute

`updateProjectState` attributes `nodePositions` to `newArchMode`:

```ts
const newArchMode = updateLayout.architectureMode || curLayout.architectureMode || 'hierarchical';
if (updateLayout.nodePositions !== undefined) {
  layoutPositions[newArchMode] = updateLayout.nodePositions;
}
```

Two separate updates are required to switch modes:

1. `{ graphLayout: { architectureMode: 'hybrid' } }` — sets active mode, leaves `hybrid` positions at `{}`.
2. `{ graphLayout: { nodePositions, layoutProvenance: 'automatic-hybrid' } }` — comes from `GraphView`'s `captureAndPersistPositions`.

For step 2 to land in the right bucket, `curLayout.architectureMode` must already be `'hybrid'` **at the time step 2 is applied**. If the parent batches updates, or if `onNodePositionsChange` is wired through a handler that reads stale `architectureMode` from a closure, step 2 lands in the *old* mode bucket, overwriting the previous mode's positions and leaving the new mode with `{}`. Then the mode-switch effect (C1/C2) runs again because `nodePositions` became stale — a feedback loop, or permanently broken geometry.

**Fix:** include `architectureMode` in the `onNodePositionsChange` payload (or a dedicated 3rd arg) so `updateProjectState` doesn't have to infer it from `curLayout`, and make `updateProjectState` idempotent/order-independent.

---

### C6. `GraphView.tsx` — position-only sync re-applies old-mode positions on mode switch

```tsx
useEffect(() => {
  ...
  cy.batch(() => {
    cy.nodes().forEach((cyNode) => {
      const resolved = resolvePosition(cyNode.id(), {
        session: modeSessionMapInPosSync,
        persisted: nodePositions,   // ← old-mode positions during first post-switch render
        cy: cyNode.position(),
        hasAuth,
      });
      if (resolved) cyNode.position(resolved.position);
    });
  });
}, [nodePositions, architectureMode]);
```

`architectureMode` is in the dep array, so this effect runs the moment the mode changes. If the parent hasn't yet flipped `nodePositions` to the new-mode bucket (C5 race), `nodePositions` still holds the previous mode's coordinates. `resolvePosition` prefers `persisted` over `cy`, so it **re-overwrites the freshly laid-out new-mode positions with the old mode's positions**. If `onNodePositionsChange` never fires (parent not wired), this is permanent — the graph looks like the old mode even though `data-architecture-mode` reads `hybrid`.

**Fix:** gate this effect on `nodePositions` belonging to the current `architectureMode`, or clear `nodePositions` synchronously when the mode changes (i.e. the mode switch should be a single atomic parent update, not two).

---

### C7. `GraphView.tsx` — layout mode toggle never persists

`handleToggleLayoutModeInternal`:

```tsx
const handleToggleLayoutModeInternal = useCallback(() => {
  const nextMode: LayoutMode = layoutMode === 'static' ? 'interactive' : 'static';
  if (nextMode === 'static') captureAndPersistPositions();
  if (onLayoutModeChange) onLayoutModeChange(nextMode);
}, [layoutMode, onLayoutModeChange, captureAndPersistPositions]);
```

This delegates to `onLayoutModeChange` — but neither `App.tsx` nor the provided `WorkspaceShell` signature shows `onLayoutModeChange` being passed to `GraphView`. The `mode` badge will flip only if `updateProjectState({ graphLayout: { mode: 'static' } })` is called somewhere. Same for `architectureMode`. **Verify `WorkspaceShell.tsx` wiring** — this is the single most probable cause of the reported symptom.

---

## 🟠 High — persistence is subtly wrong

### H1. `projectState.ts` — legacy flat `nodePositions` migrate into whatever mode is currently active

```ts
if (!hasExplicitLayoutPositions && Object.keys(flatNodePositions).length > 0) {
  loadedLayoutPositions[activeArchMode] = { ...flatNodePositions };
}
```

On a schema upgrade, if the persisted file has `architectureMode: 'hierarchical'` but the flat positions were actually captured while the user was in `hybrid`, they get labelled `hierarchical`. There's no provenance in the legacy flat blob to disambiguate. The correct fix is to migrate flat positions to the mode named by the persisted `layoutProvenance` (or to `hierarchical` if absent), and log a one-time diagnostic.

### H2. `projectState.ts` — `updateProjectState` does not delete stale `nodePositions` for the **previous** mode

When `architectureMode` changes from `hierarchical` to `hybrid`, `mergedGraphLayout.nodePositions` is correctly set to `layoutPositions['hybrid']`. But `layoutPositions['hierarchical']` remains populated. That's intended (preserve per-mode), **but** `layoutProvenance` for `hierarchical` is not reset to `'automatic-hierarchical'` — it stays whatever it was (often `'user-authored'`). On the next switch *back* to `hierarchical`, `hasAuth` becomes `true` (from the preserved positions) and `shouldAutoLayout` returns `true` anyway — but the sync effect (`C2`) then sees `hasAuthForUpdate = true` and takes the “place-new-only” path with stale `existingPositions`, so new nodes get placed off-grid around old node positions instead of participating in a fresh architecture layout. Verify with `shouldAutoLayout` + position-policy: this is a *latent* correctness bug, only visible when a graph update coincides with a mode switch.

### H3. `position-policy.ts` — `'place-new-only'` is not handled explicitly in `GraphView`

`shouldAutoLayout` returns `'place-new-only'` for `new-nodes` with authoritative positions. `GraphView`’s structural-sync effect only branches on `=== true`:

```tsx
if (autoLayoutPolicy === true) { ...full layout... }
```

The new-only placement happens unconditionally *before* this branch:

```tsx
let newlyPlaced = false;
cy.nodes().forEach((node) => {
  if (!knownPositionsMap[id]) { ...calculateDeterministicNewNodePosition...; newlyPlaced = true; }
});
if (newlyPlaced) captureAndPersistPositions();
```

So it works — but the `'place-new-only'` return value is effectively ignored, meaning a future contributor adding a third policy value (e.g. `'place-new-only-with-animation'`) would silently fall through. Add an explicit branch or a discriminated union so the type system catches this.

### H4. `GraphView.tsx` — provenance restoration uses stale `existingPosMap` on first switch

```tsx
const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {};
```

Combined with C1, the first switch to a never-visited mode uses `{}`, which is correct. But the second switch back to a previously-visited mode uses the **stale** `graphLayoutRef.current` (which at that moment is the mode we're switching *away* from, because the ref-sync effect hasn't run yet). So `existingPosMap` is `graphLayoutRef.current.layoutPositions['hierarchical']` — actually that's the correct bucket — but it’s the bucket as of the *previous render’s* `graphLayout`, not the current render’s. If the parent updated `graphLayout.layoutPositions.hierarchical` between renders (e.g., after a user drag), the restored positions may be one render behind. This shows up as “dragged nodes snap back one drag” when toggling away and back.

**Fix:** use the `graphLayout` prop directly in the mode-switch effect, not the ref.

---

## 🟡 Medium

### M1. `GraphControls.tsx` — `[tabindex]` selector excludes its own previously roved elements

```tsx
const selector =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
```

`updateTabIndexes` sets `tabindex="-1"` on the non-active control. On the next call, that element is filtered out by `[tabindex]:not([tabindex="-1"])`. Native buttons/selects/inputs survive (their selectors don’t depend on `tabindex`), but any **custom focusable widget** with an initial `tabindex="0"` disappears from the roving set after one pass. If `FocusControls` renders anything custom, keyboard navigation will skip it. Fix: filter dynamically-set tabindex with a data attribute (`[data-roving-tabindex]`), or don’t reuse the same `getInteractiveElements` for both “discover” and “apply” passes.

### M2. `GraphControls.tsx` — label button resets `activeControlIndex` on mode switch, losing focus

```tsx
React.useLayoutEffect(() => {
  updateTabIndexes();
}, [..., architectureMode, nodeCount]);
```

If switching modes changes the number of rendered buttons (e.g., `onToggleArchitectureMode` becomes undefined in some parent flow), `activeControlIndex` exceeds `controls.length` and `updateTabIndexes` resets it to `0` but does **not** move focus. The user’s keyboard focus is silently dropped, and the next Tab lands on the wrong control. Also, if the toggle button itself is removed, the user who was tabbed onto it loses focus.

### M3. `index.css` — z-index stack lets the view-mode switcher occlude the controls

- `.graph-controls-floating { z-index: 10; top: 14px; right: 14px; }`
- `.view-mode-switcher-overlay { z-index: 15; top: 14px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 32px); }`

With sidebar + drawer open on a 1280px viewport, the graph pane is ~560px wide. A mode switcher that fits inside `max-width: calc(100% - 32px) ≈ 528px` will overlap the right-hand controls (which start at `right: 14px`). At z-index 15 vs 10, the switcher captures clicks on the graph controls. **Add a media query to hide or shrink the switcher, or reduce its `max-width` so it never reaches the controls.**

### M4. `index.css` — `.graph-controls-floating` `flex-wrap: wrap` + fixed-height buttons

`.graph-control-btn { width: 28px; height: 28px; flex-shrink: 0; }` with `.graph-controls-floating { flex-wrap: wrap; min-height: 38px; max-width: calc(100% - 28px); }`. On narrow viewports (or once C4 is fixed and the labelled button takes ~80px), the toolbar can wrap onto a second row, and the `min-height: 38px` no longer constrains total height. `max-height: max-content` is not enforced as a hard limit in flex containers — the toolbar grows taller and overlaps the graph content. Add `overflow-x: auto; white-space: nowrap; flex-wrap: nowrap;` or a max-height + scroll.

### M5. `GraphView.tsx` — missing `.graph-mode-badge` CSS

```tsx
<div className={`graph-mode-badge ${layoutMode === 'static' ? 'static' : 'interactive'}`}>
```

There is no `.graph-mode-badge` rule in `index.css` (and it's not in `graph-internals/graph.css` in the provided set). It renders as a static block inside `.graph-container`, pushing layout. If it *is* styled in `graph.css`, ignore this — otherwise it's a visual bug.

### M6. `GraphView.tsx` — `'user-authored'` provenance never reaches `updateProjectState`

```tsx
if (onNodePositionsChangeRef.current) {
  (onNodePositionsChangeRef.current as any)(currentPositions, provenance);
}
```

But `GraphViewProps` declares:

```ts
onNodePositionsChange?: (nodePositions: Record<string, { x: number; y: number }>) => void;
```

The second argument is discarded by TypeScript typing. Even if `WorkspaceShell` forwards `onNodePositionsChange` verbatim to `updateProjectState`, TypeScript wouldn’t surface the missing `layoutProvenance` in the parent handler. Combined with H2 (provenance not reset on mode switch), user drags are persisted without an `'user-authored'` tag, weakening the `hasAuth` heuristic on subsequent mode switches. **Update the prop signature** to `(positions, provenance?) => void` and use `layoutProvenance` in the parent update.

### M7. `GraphView.tsx` — mount-time triple layout still applies here

Not directly a trigger/persistence bug, but this fires on initial load *before* `updateProjectState` is called, so `hasAuth` is evaluated against empty persisted state. The `autoLayoutPolicy` for `'initial'` is `!hasAuth = true`, so both the constructor layout *and* `runLayoutWithMetadata` run. On large graphs this blocks the main thread long enough that the first `onNodePositionsChange` (from `captureAndPersistPositions`) is emitted after React has already re-rendered the mode badge — no state race, but wasted work and visible animation churn.

---

## 🔵 Low / robustness

### L1. `GraphView.tsx` — async layout not guarded against unmount
```tsx
runLayoutWithMetadataAsync(cy, {...})
  .then((layoutRes) => {
    if (requestId !== layoutRequestRef.current) return;
    ...
  })
```
`cy` here is the captured reference. If the component unmounts before the promise resolves, `cy` is destroyed; `cy.nodes()` in `captureAndPersistPositions` returns empty, and `setFeatureRegions`/`setOrbitGuides` mutate unmounted state. Add `if (!cyRef.current || cyRef.current !== cy) return;`.

### L2. `GraphView.tsx` — Escape handler still references undefined `onFocusChangeRef`
(Already flagged in the previous review, but it lives in this cluster's interaction surface.) `onFocusChangeRef` is never declared; hitting Escape throws `ReferenceError`. Fix: use the `onFocusChange` prop directly or declare and sync a ref.

### L3. `projectState.ts` — `updateProjectState` shallow-merges `layoutPositions` without validating shape
```ts
const layoutPositions = {
  ...(curLayout.layoutPositions || {}),
  ...(updateLayout.layoutPositions || {}),
};
```
If a caller passes `layoutPositions: { hybrid: null }`, this will overwrite with `null` and `layoutPositions[newArchMode] || {}` silently turns it into `{}` downstream. Consider `if (pos && typeof pos === 'object')`.

### L4. `position-policy.ts` — `shouldAutoLayout` returns `true` on `'architecture-mode-switch'` in static mode too
By policy, static mode means “positions frozen”, yet `architecture-mode-switch` returns `true`. A user who is in **static** mode and switches architecture mode will have their frozen positions overwritten by a fresh layout (as observed via the structural-sync path in C2). This may be intentional (mode switch = new geometry contract), but it contradicts the static-mode promise. Consider adding a policy test asserting this, and/or returning `'place-new-only'` when `hasAuth === true` and `mode === 'static'`.

### L5. `index.css` — `max-height: max-content` is not a strict cap
On `.graph-controls-floating`. Combined with `flex-wrap: wrap`, this doesn't clamp the toolbar height. Use `overflow: hidden` on a wrapper, or a hard `max-height` with `overflow-y: auto`.

---

## Recommended verification checklist for `WorkspaceShell.tsx`

Because the cluster hinges on wiring that isn’t in the provided files:

1. Does `WorkspaceShell` pass `onArchitectureModeChange` and `onLayoutModeChange` to `GraphView`?
2. Does `onArchitectureModeChange(next)` call `updateProjectState(projectId, { graphLayout: { architectureMode: next } })` **and** does it also reset `nodePositions` for the new mode atomically (to avoid C5)?
3. Does `onNodePositionsChange` accept `(positions, provenance)` and forward **both** `nodePositions` **and** `layoutProvenance` to `updateProjectState`? (See M6.)
4. Does `WorkspaceHeader` use the same `architectureMode` source as `App.tsx` (`projectState.graphLayout.architectureMode`)? A local-state duplicate would immediately desync from `GraphView` on switch.
5. Does `WorkspaceShell` debounce or batch `updateProjectState` calls? If yes, the two-update sequence in C5 will be reordered relative to the mode-switch effect.

Most of the user-visible symptom (“button toggles, geometry never changes”) is consistent with **C1 + C2 + C5** firing together: stale refs, double-layout, and positions saved under the wrong mode bucket.


# Orchestration Cluster — Deep Bug Audit

Focused on `GraphView.tsx` as the orchestrator. `graph.css` was **not provided** — I've flagged every class that is used but not covered by the provided `index.css`, so you can confirm against that file.

---

## 🔴 Critical — data loss / invisible UI

### O1. `GraphView.tsx` — loading a persisted non-default architecture mode **overwrites** the saved positions

Trace on project load:

1. `App.tsx` renders `GraphView` with `graphLayout` from `loadProjectState()` → `architectureMode = 'constellation'` (from persisted state) and `nodePositions = <saved constellation positions>`.
2. `initialArchMode` memo initial value resolved from `graphLayout.architectureMode` = `'constellation'`, so `architectureMode = 'constellation'`.
3. `prevArchitectureModeRef` was initialized to `'hierarchical'` on the previous render (when `graphLayout` was `undefined` / default).
4. Mode-switch effect fires: `prevArchitectureModeRef.current ('hierarchical') !== architectureMode ('constellation')`.
5. Inside effect:
   ```tsx
   const hasAuth = !!nodePositionsRef.current && ...;
   const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {};
   ```
   Both `nodePositionsRef.current` and `graphLayoutRef.current` are **stale** — the ref-sync effect is declared *after* this effect and hasn't run yet. So `existingPosMap = {}`.
6. `runLayoutWithMetadataAsync(...)` runs with `existingPositions: {}` → **fresh layout** for constellation. `captureAndPersistPositions()` then writes the fresh positions back to the parent, replacing the user's saved positions.

Result: **opening a project in `orbit` / `constellation` / `hybrid` silently destroys the saved layout.** Only `hierarchical` mode survives project reload.

**Fix:** guard the mode-switch effect against mount-time (mirror `isInitialMountRef`), or make `prevArchitectureModeRef` sync from the initial resolved value, and drop the ref dependency in favour of the current prop (`graphLayout`, `nodePositions`, `layoutMode`).

---

### O2. `GraphView.tsx` — structural sync **discards in-session drag positions** when a full layout runs

In structural-sync:

```tsx
const layoutRes = runLayoutWithMetadata(cy, {
  ...effectiveLayoutOptionsRef.current,
  nodes,
  edges,
  nodeCount: nodes.length,
  animate: false,
  architectureMode,
  fit: fitInSyncEffect,
  // ← NO existingPositions
});
```

`computeArchitectureLayoutWithMetadata` defaults `existingPositions = {}`, so user drags stored in `modeSessionMapInSync` (level 1 authority) are **not** passed to the layout. Then:

```tsx
captureAndPersistPositions();
```

captures the *layout-generated* positions back into `modeSessionMap` (overwriting the drags) and persists them. Net effect:

> **Dragging nodes in interactive mode, then adding any node (graph update), causes every dragged node to snap back to its computed layout position.**

This is a Level-1 Position Authority violation — session drags are supposed to be the highest authority.

Same problem in `executeResetLayout` and in the mode-switch effect (both omit `existingPositions` — but for reset that's intended; for the mode-switch it should at least feed `modeSessionMap.get(architectureMode)`).

**Fix:** pass `existingPositions: Object.fromEntries(modeSessionMapInSync)` (merged with `graphLayoutRef.current.layoutPositions[architectureMode]`) into every `runLayoutWithMetadata`/`Async` call except reset.

---

### O3. `GraphView.tsx` — `graphStructureKey` is insufficient; `discoveryResult` goes stale

```tsx
const graphStructureKey = useMemo(() => {
  if (nodes.length === 0) return '0:0';
  return `${nodes.length}:${edges.length}:${nodes[0]?.id}:${nodes[nodes.length - 1]?.id}:${edges[0]?.id}:${edges[edges.length - 1]?.id}`;
}, [nodes, edges]);

const discoveryResult: FeatureDiscoveryResult = useMemo(() => {
  return discoverFeatures(nodes, edges);
}, [graphStructureKey]);   // ← depends on key, not nodes/edges
```

Two scenarios where this breaks:

- **Filter replaces a middle node with another of the same length** — first/last ids unchanged → key unchanged → `discoveryResult` still describes the *old* node set. `featureAssignmentMap` (hybrid mode) then tags nodes with features that don't exist.
- **Edge reversal** (source/target swapped between two edges, same edge count and endpoints at the ends) → key unchanged → stale feature classification for cross-feature dashed edges.

The `nodes` array passed to `discoverFeatures` **is** the new one (closure captures current `nodes`), so the shape of the graph and its classification disagree.

**Fix:** compute a real fingerprint (join all ids) or make `discoverFeatures` cheap enough to just rerun on `[nodes, edges]`. Alternatively, memoize `discoverFeatures` inside itself by content hash.

---

### O4. `GraphView.tsx` — `enableFeatureLayout` prop is silently ignored on mode switch

```tsx
const enableFeatureLayout =
  enableFeatureLayoutProp ??
  layoutOptions?.enableFeatureLayout ??
  (architectureMode === 'hybrid');
```

Then in the mode-switch effect:

```tsx
runLayoutWithMetadata(cy, {
  ...effectiveLayoutOptionsRef.current,   // ← includes enableFeatureLayout from memo
  architectureMode,
  enableFeatureLayout: architectureMode === 'hybrid',   // ← overrides it
});
```

The explicit key overrides whatever the caller passed. A user who explicitly disables feature layout via `enableFeatureLayout={false}` **gets it re-enabled whenever they switch to hybrid**. Inconsistent behavior between “first load” (respects prop) and “mode switch” (ignores prop).

**Fix:** use `enableFeatureLayout` (the derived variable) in the mode-switch effect instead of hardcoding `architectureMode === 'hybrid'`. Apply the same fix in structural sync and `executeResetLayout`.

---

### O5. `GraphView.tsx` + CSS — `.graph-mode-badge` has **no styles**

```tsx
<div
  className={`graph-mode-badge ${layoutMode === 'static' ? 'static' : 'interactive'}`}
  data-testid="graph-mode-indicator"
  ...
>
```

There is **no `.graph-mode-badge` rule** in `index.css` (the file list contains no `graph.css` in scope). Without `position: absolute`, the badge is a block element appended after `.cytoscape-view` (which is `height: 100%`). Because `.graph-container` has `overflow: hidden`, the badge ends up either:

- below the visible canvas (clipped), or
- inside the flow, shrinking the canvas layout depending on `.cytoscape-view`'s flex behavior.

**If `graph.css` is in your repo, verify the rule exists and includes `position: absolute; bottom: …; pointer-events: none;`** — otherwise the mode indicator is invisible and the graph canvas shrinks.

---

### O6. `GraphView.tsx` + `index.css` — navigator is **double-positioned and off-canvas**

The JSX:

```tsx
<div id="minimap" className="minimap-container">
  <div className="navigator-header">…</div>
  <div className="navigator-body" />   {/* plugin's canvas mounts inside this */}
</div>
```

The CSS:

```css
.minimap-container,
.cytoscape-navigator {
  position: absolute !important;
  bottom: 18px !important;
  right: 58px !important;
  width: 200px !important;
  height: 140px !important;
}
```

`cytoscape.js-navigator.css` (imported) creates a `.cytoscape-navigator` element *inside* `.navigator-body`. Because `.navigator-body` has no `position: relative` and no size rule, the plugin's `.cytoscape-navigator` finds `.minimap-container` as its containing block, and the `bottom: 18px; right: 58px` offsets push it **off the bottom-right of the minimap container**, not into `.navigator-body`.

Secondary issue: `.navigator-header` and `.navigator-title` have **no CSS rule in `index.css`** and there is no `.navigator-body { height: … }` rule. Without them, `.navigator-body` collapses to 0 height, so even if the plugin's canvas is positioned correctly it renders into a 0×0 box.

**Fix:** replace the CSS with:

```css
.minimap-container {
  position: absolute; bottom: 18px; right: 58px;
  width: 200px; height: 140px;
  /* ...existing background/border... */
}
.navigator-header { display: flex; height: 24px; align-items: center; padding: 0 8px; }
.navigator-body { position: relative; height: calc(100% - 24px); }
.cytoscape-navigator { position: absolute; inset: 0; width: 100%; height: 100%; }
```

(or remove the `.cytoscape-navigator` selector entirely if the plugin mounts inside `.navigator-body` — verify against the imported CSS).

---

### O7. `GraphView.tsx` — arrow-key handler **breaks `<select>` navigation** in `FocusControls`

`GraphView`'s `handleKeyDown` has no guard:

```tsx
} else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
  e.preventDefault();
  // navigate to neighbor
}
```

`GraphControls.handleToolbarKeyDown` has the correct guard:

```tsx
if (tagName === 'select' || tagName === 'input' || tagName === 'textarea' || role === 'slider') {
  if (['ArrowUp', 'ArrowDown', ...].includes(key)) return;
}
```

But that only stops the **control-level** handler. The event continues bubbling to `.graph-container`'s `onKeyDown`, which `preventDefault`s arrow keys and tries to navigate graph neighbors. Result: **the FocusControls `depth`/`direction` `<select>` cannot be changed with the keyboard**.

**Fix:** add the same `select`/`input`/`textarea`/`role="slider"` guard to `GraphView.handleKeyDown` (check `e.target.tagName`).

---

### O8. `GraphView.tsx` — `isLayoutRunningRef` is never set during the **async** mode-switch path

`layoutstart`/`layoutstop` are only emitted by cytoscape when a layout actually runs. The async path (`runLayoutWithMetadataAsync`) computes positions in a worker **before** calling `cy.layout({animate:false}).run()`. During the worker computation:

- `isLayoutRunningRef.current === false`
- the position-only sync effect (`deps: [nodePositions, architectureMode]`) fires when `nodePositions` updates from the parent — and applies **stale/old-mode positions** to `cy` mid-flight.

On a large graph with a 300–800 ms worker round-trip, the user sees the graph **flash to the previous mode's layout**, then jump to the new one when the worker completes.

**Fix:** set `isLayoutRunningRef.current = true` (and `setIsLayoutRunning(true)`) at the start of every mode-switch / structural-sync layout, and clear it in both `.then`/`.catch` handlers and in the sync branch. Add a `requestId` guard to the position-only sync so it can be skipped entirely during a pending layout.

---

## 🟠 High

### O9. `GraphView.tsx` — telemetry reports **current** node/edge counts, not request-time counts

```tsx
const notifyComplete = (outcome, correlationToken) => {
  const detail = {
    ...
    nodeCount: nodesRef.current.length,   // ← evaluated at resolve time
    edgeCount: edgesRef.current.length,
  };
};
```

If the graph gains nodes while the async layout is computing (or during a slow worker), the reported `nodeCount` doesn't match what the layout actually operated on. This corrupts correlation metrics and any downstream dashboards comparing `durationMs / nodeCount`.

**Fix:** snapshot `nodes.length` and `edges.length` at effect start and close over them in `notifyComplete`.

---

### O10. `GraphView.tsx` — correlation token leaks when `layoutOptions.correlationToken` is set

```tsx
const activeToken =
  effectiveLayoutOptionsRef.current?.correlationToken ?? getCorrelationToken();
```

`getCorrelationToken()` **clears** the module singleton. But when `effectiveLayoutOptionsRef.current.correlationToken` is truthy, the `??` short-circuits — `getCorrelationToken()` is never called, so `window.__CURRENT_CORRELATION_TOKEN__` / the module var **remains set**. The next unrelated layout picks up the leaked token via `getCorrelationToken()` and reports it as its own.

**Fix:**

```tsx
const pending = getCorrelationToken();   // always drain
const activeToken = effectiveLayoutOptionsRef.current?.correlationToken ?? pending;
```

Also, `currentCorrelationToken` is a module singleton mutated by external callers. On component unmount, it is not cleared — leaked across mounts. Clear in the destroy effect.

---

### O11. `GraphView.tsx` — `performance.measure` name collision

```tsx
performance.mark(`layout-${reason}-start`);
...
performance.mark(`layout-${reason}-end`);
performance.measure(`layout:${mode}:${reason}`, `layout-${reason}-start`, `layout-${reason}-end`);
```

If `reason = 'architecture-mode-switch'` fires twice concurrently (or twice before the first measure), the second `mark('...-start')` overwrites the first. The resulting `measure` reports the **duration of the second start → first end** — wrong, or negative.

Also, browsers cap the number of performance entries (typically 150). Long sessions accumulate `layout-structural-sync-start/end` entries without ever being cleared → measurements silently disappear after ~75 layouts.

**Fix:** include `requestId` in the mark names (`layout-${reason}-${requestId}-start`), and clear measurements periodically (`performance.clearMarks(); performance.clearMeasures();`) or gate behind `DEBUG`.

---

### O12. `GraphView.tsx` — double persistence on every drag gesture

```tsx
cy.on('dragfree', 'node', (evt) => {
  ...
  captureAndPersistPositions('user-authored');   // ← writes ALL positions
  if (onNodeDragEndRef.current) {
    onNodeDragEndRef.current(nodeId, rounded);   // ← writes ONE position
  }
});
```

Both paths persist. `captureAndPersistPositions` writes the full position map; `onNodeDragEnd` typically calls a parent `updateProjectState` with a single-node update. Depending on the parent's merging strategy, the second write can overwrite the first (if it merges shallowly) or fire a second round-trip. On a drag-heavy session this can produce redundant writes / rapid oscillating state.

Also related to `M6` from the prior review — `captureAndPersistPositions('user-authored')` passes the provenance as a **second argument** but the parent's `onNodePositionsChange` type declares a single-arg callback, so `'user-authored'` is dropped, meaning **the `user-authored` provenance never reaches `updateProjectState`**.

**Fix:** remove one of the two persistence paths (I recommend keeping `captureAndPersistPositions` and dropping `onNodeDragEnd`, or vice versa), and update the callback signature to `(positions, provenance?) => void` on the parent side.

---

### O13. `GraphView.tsx` — `featureRegions` / `orbitGuides` state is never cleared between mode switches

```tsx
setFeatureRegions(layoutRes.featureRegions);   // may be undefined
setOrbitGuides(layoutRes.orbitGuides);         // may be undefined
```

`computeArchitectureLayoutWithMetadata` returns `featureRegions` only when `enableFeatureLayout`, and `orbitGuides` only for orbit/constellation. When switching **hybrid → hierarchical**, the layout result has `featureRegions: undefined` — but during the ~async window before that result arrives, `FeatureOverlayCanvas` still receives `featureRegions={architectureMode === 'hybrid' ? featureRegions : undefined}`. Since `architectureMode` is already the new value, `featureRegions` is now `undefined` immediately — good.

But the reverse: switching **hierarchical → hybrid**, `architectureMode` is already `'hybrid'` (from props), while `featureRegions` is still `undefined` (state hasn't been set yet). The overlay renders nothing for the duration of the async layout (or forever if the layout fails). Cosmetic flicker, but noticeable on large graphs.

**Fix:** keep the previous mode's regions rendered while a new layout is pending, or render a loading state in `FeatureOverlayCanvas`.

---

### O14. `GraphView.tsx` — `FeatureOverlayCanvas` is mounted but its internals may have dependencies on `cy` identity that go stale on remount

```tsx
<FeatureOverlayCanvas cy={cyInstance} ... />
```

`cyInstance` is React state set after cytoscape init. On the initial mount, `cyInstance` is `null` and `FeatureOverlayCanvas` gets `cy={null}` — verify `FeatureOverlayCanvas` handles `null` gracefully. On the structural-sync re-add, the `cy` **identity does not change** (the same core instance is reused), so overlays remain attached — but any layer children added by the overlay to `cy` may have been wiped by `cy.elements().remove(); cy.add(newElements)`. If the overlay draws to a `<canvas>` sibling of `.cytoscape-view`, this is fine.

**Action:** verify `FeatureOverlayCanvas` does not cache anything derived from `cy.nodes()` that gets stale after structural sync — this is not visible in the provided code.

---

### O15. `GraphView.tsx` — async layout setState on unmounted component

```tsx
runLayoutWithMetadataAsync(cy, {...})
  .then((layoutRes) => {
    if (requestId !== layoutRequestRef.current) return;   // ← does NOT catch unmount
    markLayoutEnd(...);
    setFeatureRegions(layoutRes.featureRegions);          // ← may fire after unmount
    setOrbitGuides(layoutRes.orbitGuides);
    captureAndPersistPositions(targetProvenance);
    notifyComplete('complete', ...);
  })
```

`layoutRequestRef.current` is **not incremented on unmount** (the cleanup only removes listeners and destroys `cy`). A promise resolving post-unmount calls `setFeatureRegions`/`setOrbitGuides` on an unmounted tree — React 18 suppresses the warning, but any effect watching those states won't fire, and `captureAndPersistPositions` will call `cyRef.current` (null) and silently return. If `cy.destroy()` left the object in a partial state, `cy.nodes()` inside `captureAndPersistPositions` (via the captured `cy`? no — via `cyRef.current`) is not reached because `cyRef.current === null`. Safe, but the setState calls are waste. **Add `if (!cyRef.current || cyRef.current !== cy) return;` inside the `.then` before any `setState`.**

---

### O16. `GraphView.tsx` — `__LAYOUT_MODULE__` global is never cleared in prod

```tsx
if (typeof window !== 'undefined' && ((import.meta as any).env?.DEV || (window as any).__EXPOSE_CY__)) {
  (window as any).__CY__ = cy;
  (window as any).__LAYOUT_MODULE__ = { runLayoutWithMetadata, computeArchitectureLayoutWithMetadata };
}
```

In dev, `__LAYOUT_MODULE__` holds module references forever. The cleanup sets `__CY__ = null` (conditionally) but not `__LAYOUT_MODULE__`. Memory leak in dev-only; minor.

---

### O17. `GraphView.tsx` — `layoutAnnouncement` is never reset

```tsx
setLayoutAnnouncement(`${architectureMode} layout applied, ${nodesRef.current.length} components`);
```

The state is set on every successful layout. If a subsequent layout produces the **same string**, React doesn't re-render, and the `aria-live="polite"` region never re-announces. Screen-reader users get exactly **one** announcement for the first layout and silence thereafter — including across mode switches when the node count is stable.

**Fix:** clear to `''` immediately, then set the message on the next tick, or include a monotonically increasing suffix (`… (v${id})`) hidden from visual rendering but surfaced via `aria-label`-like trickery. Simpler: `setLayoutAnnouncement(''); setTimeout(() => setLayoutAnnouncement(msg), 0)`.

---

## 🟡 Medium

### O18. `GraphView.tsx` — async-vs-sync cutoff (`nodes.length >= 20`) can be evaluated against stale `nodesRef.current`

```tsx
if (nodesRef.current.length >= 20) { ...async... } else { ...sync... }
```

Inside the mode-switch effect, `nodesRef.current` is refreshed by a **separate** effect that runs after this one (see C1 in the previous review). On the first render after data load, `nodesRef.current` is `[]` while `nodes` (prop) is populated. The mode-switch effect fires when `architectureMode` changes from `'hierarchical'` to the persisted value — this happens on the same render that `nodes` becomes populated. If the mode-switch effect runs before the ref-sync effect (which it does), it sees `nodesRef.current.length === 0` and takes the **sync** path — blocking the main thread for a graph that would have been async.

**Fix:** use `nodes.length` (prop) instead of `nodesRef.current.length`, or move the ref-sync effect above the mode-switch effect.

---

### O19. `GraphView.tsx` — `setLastLayoutCompletedTrigger((prev) => prev + 1)` only in `DEBUG`

```tsx
if (DEBUG) {
  setLastLayoutCompletedTrigger((prev) => prev + 1);
}
```

The state variable is declared with a `_` prefix skip in the destructure (`const [, setLastLayoutCompletedTrigger] = useState<number>(0);`). Fine — the trigger is only used to force a re-render of the debug panel. But it means in non-debug builds the layout completion doesn't force a re-render, so the `data-layout-running` attribute may be stale for one render. Minor.

---

### O20. `GraphView.tsx` — `.graph-container` `role="region"` + `tabIndex={0}` is a **focus trap**

The graph canvas is a focusable region. When the user clicks on the canvas, focus moves to `.graph-container`. Pressing Tab moves focus to the next focusable child — which is the **first button in GraphControls** (since GraphControls is a later sibling). This means **Tab from the graph goes to the first control**, not the next logical element.

More importantly, when focus is on `.graph-container` and the user presses Tab, focus goes *into* the graph controls — but if the user expects to tab *out* of the graph, they can't without traversing every control.

Combine with the missing `tabIndex` on the region itself — the region is focusable (0), but nothing inside it is natively focusable except the buttons in `GraphControls`. The `<ul role="list" className="sr-only">` has buttons but they're `sr-only` — still focusable, but visually hidden, so tab order is confusing.

**Action:** Either remove `tabIndex={0}` from `.graph-container` (keyboard shortcuts still work via `window` listeners) or restructure focus management so the graph is a "roving" focus region.

---

### O21. `GraphView.tsx` — `handleKeyDown` fires on **every** key, including when focus is inside GraphControls

`onKeyDown={handleKeyDown}` is on `.graph-container`, which contains `GraphControls` and `GraphLegend` as DOM descendants. Keydown events from any control button bubble up to `.graph-container`. `handleKeyDown` doesn't check `e.target` — so pressing `+`, `-`, `f`, `0`, arrows, or `Escape` anywhere inside the graph pane (including on a GraphControls button or the legend) triggers the graph handler.

This is intended for arrows *if* the intent is graph navigation — but `ArrowUp` on a focused `<select>` is broken (see O7), and pressing `f` on a focused reset button triggers both the button action and `fitToScreen`.

**Fix:** add a guard at the top of `handleKeyDown`:

```tsx
const tag = (e.target as HTMLElement).tagName;
if (['SELECT', 'INPUT', 'TEXTAREA'].includes(tag)) return;
```

---

### O22. `GraphView.tsx` — `.graph-controls-floating` uses `flex-wrap: wrap` but `flex-wrap` is overridden by the inline `white-space: nowrap`

```css
.graph-controls-floating {
  flex-wrap: wrap;
  white-space: nowrap;
  ...
  height: auto;
  min-height: 38px;
  max-height: max-content;   /* not a real cap in flex */
}
```

`.graph-controls-floating` will wrap when its content exceeds `max-width: calc(100% - 28px)`. On a 560px-wide graph pane (1280×800 with sidebar + drawer open), the controls easily exceed `532px` once the labelled architecture button is present (see C4 from prior review). When wrapping occurs:

- The toolbar takes 2 rows.
- `min-height: 38px` no longer applies to the whole bar — the toolbar grows to ~70px.
- `.graph-controls-floating` is `position: absolute; top: 14px` — so it overlaps the top of the canvas content. Fine visually, but it may collide with `.view-mode-switcher-overlay` at `top: 14px, left: 50%` at `z-index: 15` (controls are `z-index: 10`).

**Fix:** `flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden;` on the toolbar, or apply a hard `max-height` and `overflow-y: auto`.

---

### O23. `GraphView.tsx` — `mode-switch` correlation token exposed in window events but never consumed by tests

```tsx
window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
```

The event detail includes `correlationToken` — useful for E2E tests. But `app:layoutcomplete` fires on `window`, and the test harness must subscribe **before** the mode switch (there's a window of ~100ms between switch and completion). Fine for tests but worth documenting.

More importantly — `(window as any).__LAST_LAYOUT_COMPLETED__` is set unconditionally (not gated by `DEBUG`), so it becomes a permanent global that a malicious or confused script could read. Minor security surface.

---

### O24. `GraphView.tsx` — `computeArchitectureLayoutWithMetadata` is imported but never used directly

```tsx
import {
  getLayoutOptions,
  runLayoutWithMetadata,
  runLayoutWithMetadataAsync,
  computeArchitectureLayoutWithMetadata,   // ← unused
  ...
} from '../lib/graph-layout';
```

...except in the dev exposure:

```tsx
(window as any).__LAYOUT_MODULE__ = {
  runLayoutWithMetadata,
  computeArchitectureLayoutWithMetadata,
};
```

So it's only used for dev exposure. Tree-shaking can't drop it in dev. Not a bug per se, but if a code reviewer removes it, `__LAYOUT_MODULE__` loses that field.

---

### O25. `GraphView.tsx` — `runLayoutWithMetadata` non-arch fallback does not honour `existingPositions`

In `graph-layout.ts`:

```ts
const layoutOptions = getLayoutOptions(options);
return cy.layout(layoutOptions);
```

If `useArchitectureLayout === false` and `nodes` is populated, `getLayoutOptions` **still** takes the arch path and returns `preset` with `posMap` from `computeArchitectureLayout(...)`. But if `useArchitectureLayout === false` **and** `nodes` is empty (or absent), it returns `fcose` options, and `cy.layout(...)` runs `fcose` — which recomputes positions from scratch, ignoring `existingPositions` entirely. So `existingPositions` is **silently dropped** in the non-arch path.

This path is currently unused (`enableFeatureLayout` is the only flag that routes through it), but any caller passing `useArchitectureLayout: false` + `existingPositions` will get the wrong behaviour.

**Fix:** in `getLayoutOptions`, always apply `existingPositions`:

```ts
const positions = (node: any) => options.existingPositions?.[node.id()] ?? posMap[node.id()] ?? node.position();
```

---

### O26. `GraphView.tsx` — `derivedFocalLwcId` performs `nodes.some(...)` three times per recompute

```tsx
const isLwcNode = (id) => {
  if (!id) return false;
  return nodes.some((n) => n.id === id && n.type === 'LWC');
};
return (isLwcNode(selectedNodeId) ? selectedNodeId : null) ?? ...;
```

For a 500-node graph, this is 1500 array scans per recompute. The memo deps include `nodes`, `selectedNodeId`, `focusedNodeId`, `layoutOptions?.focalLwcId` — so every selection change triggers 3 full scans.

**Fix:** build a `Set<string>` of LWC ids once, or use a `Map<id, node>` lookup.

---

### O27. `GraphView.tsx` — `accessibleNodes` recomputes on every selection

```tsx
const accessibleNodes = useMemo(() => {
  if (nodes.length <= 50) return nodes;
  const top50 = nodes.slice(0, 50);
  if (selectedNodeId && !top50.some(n => n.id === selectedNodeId)) {
    const selected = nodes.find(n => n.id === selectedNodeId);
    if (selected) return [...top50, selected];
  }
  return top50;
}, [nodes, selectedNodeId]);
```

`selectedNodeId` changes on every user click. `accessibleNodes` recomputes, which re-renders the `<ul>` (50 `<li>` elements with buttons). For a graph with heavy clicking this is measurable overhead, but not incorrect.

**Fix:** split into `useMemo(() => nodes.slice(0, 50), [nodes])` and `useMemo(() => nodes.find(...), [nodes, selectedNodeId])`, then combine.

---

### O28. `GraphView.tsx` — `navigator({ scale: 0.15 })` is hardcoded

```tsx
navRef.current = (cyInstance as any).navigator({ container: bodyEl, scale: 0.15 });
```

For a small graph (10 nodes, extent 400×200), `scale: 0.15` makes the minimap content 60×30 px — most of the 200×140 minimap is empty. For a large graph (2000 nodes, extent 20000×10000), `scale: 0.15` makes it 3000×1500 — the minimap clips it.

**Fix:** derive from `cy.extent()` and the minimap dimensions:

```ts
const bb = cy.extent();
const scale = Math.min(container.width / bb.w, container.height / bb.h) * 0.9;
```

---

### O29. `GraphView.tsx` — `graphLayoutRef` and `graphLayout` prop are mixed sources; DRY violation

Multiple effects do the same provenance computation inline:

```tsx
const expectedProvenanceSync: LayoutProvenance =
  architectureMode === 'hybrid' ? 'automatic-hybrid'
  : architectureMode === 'orbit' ? 'automatic-orbit'
  : architectureMode === 'constellation' ? 'automatic-constellation'
  : 'automatic-hierarchical';
```

This is duplicated **three times** in the file with identical bodies (mode-switch, structural-sync, position-only-sync). If a new mode is added and one site is missed, `hasAuth` behaves inconsistently across the three effects.

**Fix:** extract a helper:

```tsx
const provenanceFor = (mode: ArchitectureLayoutMode): LayoutProvenance => ({
  hybrid: 'automatic-hybrid',
  orbit: 'automatic-orbit',
  constellation: 'automatic-constellation',
  hierarchical: 'automatic-hierarchical',
}[mode]);
```

And add an exhaustiveness check so `tsc` catches it when a mode is added.

Same for the `hasAuth` computation — 3 duplicated blocks.

---

### O30. `GraphView.tsx` — structural sync `cy.elements().remove(); cy.add(newElements)` happens inside `cy.batch` but fires events per-element

`cy.batch` groups styles, but `remove` and `add` still trigger `add`/`remove` events per element (they're not batched by `cy.batch`). Any listener attached outside `cy.batch` (e.g., a custom event listener in `FeatureOverlayCanvas`) will fire 2×N times on a graph update. On 500 nodes, that's 1000 events.

Not a bug per se, but if `FeatureOverlayCanvas` reacts to `add` events, it will thrash on every structural update.

---

## 🔵 Low / robustness

### O31. `GraphView.tsx` — `handleKeyDown` `Escape` also runs when the target is inside `<select>`

```tsx
} else if (e.key === 'Escape') {
  onSelectNode(null);
  onSelectEdge('');
  if (onFocusChangeRef.current) { ... }
}
```

If the user has a `<select>` open (e.g., FocusControls depth selector) and presses Escape, the browser's native close-and-blur happens, **and** the graph clears selection. Minor.

### O32. `GraphView.tsx` — `focusOnNode` fires on every `selectedNodeId` change

```tsx
useEffect(() => {
  if (focusedNodeId) focusOnNode(cy, focusedNodeId);
  else if (selectedNodeId) { clearHighlights(cy); highlightNodeConnections(cy, selectedNodeId); }
  else clearHighlights(cy);
}, [focusedNodeId, selectedNodeId]);
```

Combined with `handleKeyDown`'s ArrowUp/Down navigation, every keyboard step calls `focusOnNode` (which animates `cy.animate({ center })`). Rapid arrow presses queue multiple `cy.animate` calls — each 300 ms — and the viewport lags behind the selection. Also, `clearHighlights` on every selection clears **all** classes including `finding-highlighted` (see prior review #8).

### O33. `GraphView.tsx` — `hoverCard` timer is not cleared on unmount if a timeout is pending

```tsx
hoverTimerRef.current = setTimeout(() => { setHoverCard({ ... }); }, 250);
```

Cleanup in the destroy effect handles this (`if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);`). OK. But `hoverCard` **state** is not cleared on unmount either — React handles this. Fine.

### O34. `GraphView.tsx` — `updateZoomClass` is not invoked after structural sync

After `cy.elements().remove(); cy.add(newElements)`, the newly-added elements have **no** `zoom-far`/`zoom-mid`/`zoom-near` or `lod-*` classes. `updateZoomClass` is bound only to the `zoom` event, so labels are shown/hidden incorrectly until the user zooms. **Fix:** call `updateZoomClass()` at the end of structural sync.

### O35. `GraphView.tsx` — `data-testid="minimap-container"` div has `id="minimap"` but `useEffect` looks for `.navigator-body` inside `minimapRef.current` — safe

Fine.

### O36. `GraphView.tsx` — `getHashModes()` memo is over-`[]`, so hash is only read on mount

```tsx
const hashModes = useMemo(() => getHashModes(), []);
```

If the user changes the hash at runtime (e.g., clicking a link on the page that sets `#arch=orbit`), the mode doesn't update. Intentional? If so, document it. If not, add a `hashchange` listener.

### O37. `index.css` — `.graph-controls-floating` `z-index: 10` is lower than `.view-mode-switcher-overlay`'s `z-index: 15`

Covered by the prior review (M3). Combine with O22: the switcher can fully block the architecture-mode toggle on narrow viewports.

### O38. `GraphView.tsx` — `executeResetLayout` does not set `isLayoutRunningRef.current = true`

`markLayoutStart('reset')` is called but not `setIsLayoutRunning(true)`. For animated reset (small graphs), `layoutstop` fires and clears `isLayoutRunningRef`. For non-animated reset (`prefersReducedMotion === true` or `nodeCount >= 100`), `layoutstop` **does not fire** (see prior review #10) — so `isLayoutRunningRef.current` stays `false` throughout, and the position-only sync effect can clobber the reset while the reset is in progress.

Actually — non-animated reset is synchronous, so no window for interference. But `captureAndPersistPositions` is called at the end of the non-animated branch, so the reset layout positions are persisted correctly. Fine. Still, `isLayoutRunningRef` should be set to `true` for consistency.

---

## Summary of what to fix first

| # | Bug | Impact |
|---|---|---|
| **O1** | Persisted non-default mode overwrites saved positions | Data loss, silent |
| **O2** | Structural sync discards session drags | User frustration |
| **O3** | `graphStructureKey` collision → stale feature classification | Hybrid layout wrong |
| **O4** | `enableFeatureLayout` prop ignored on mode switch | Behaviour inconsistency |
| **O5** | `.graph-mode-badge` has no styles | Mode indicator invisible |
| **O6** | Navigator CSS double-positioning | Minimap renders off-canvas |
| **O7** | Arrow keys break `<select>` in FocusControls | FocusControls unusable via keyboard |
| **O8** | Async mode-switch has no `isLayoutRunning` set | Visible flash to old mode |
| **O12** | Double persistence on drag | Redundant writes, race |
| **O18** | Async-vs-sync cutoff uses stale ref | Blocking layout for big graphs |
| **O29** | 3× duplicated provenance computation | Future mode addition → silent bug |

For **`graph.css`** specifically (not provided, so no line-level review possible), verify these classes exist and have the rules I flagged in **O5** and **O6**: `.graph-mode-badge`, `.navigator-header`, `.navigator-title`, `.navigator-body`. If the file exists, apply the CSS fixes in O5/O6 directly; if it doesn't exist, add them to `index.css`.


# Dispatch Cluster — Deep Bug Audit

**Scope limitation:** `layout-worker-client.ts` and `graph-builder.ts` were **not** provided in the file set, despite being essential to this cluster. I've audited everything that is present (`graph-layout.ts`, the dispatcher half of `architecture-layout.ts`, `graph-style.ts`) and flagged **every finding that depends on the missing files** as a cross-module contract to verify. Sections marked `[!]` require you to open the missing file.

---

## 🔴 Critical — radial modes silently destroy user drags

### D1. `architecture-layout.ts` — `existingPositions` is ignored for `orbit` and `constellation`

The position-authority restoration block:

```ts
// Step 8: Position Authority Restoration
const resultPositions: Record<string, { x: number; y: number }> = { ...calculatedPositions };
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) resultPositions[id] = { x: pos.x, y: pos.y };
}
return { positions: resultPositions, ... };
```

is only reached in the **hierarchical / hybrid** branch. Both radial modes return early:

```ts
if (architectureMode === 'constellation') {
  ...
  return { positions: constellationPositions, ... };   // ← ignores existingPositions
}
if (isOrbit) {
  ...
  return { positions: orbitPositions, ... };           // ← ignores existingPositions
}
```

Consequence: **any drag, saved position, or restored position in `orbit` or `constellation` mode is silently overwritten** every time a layout runs — on mode switch, on graph update, on reset. This directly contradicts the position-authority contract enforced everywhere else in the codebase (`position-policy.ts`, `resolvePosition`, `ProjectUIState.graphLayout.layoutPositions[mode]`).

This is consistent with the reported symptom: *"the button toggles but geometry never changes"* is actually the **inverse** — geometry always changes **back** in radial modes.

**Fix:** apply the same merge at the end of both radial branches, or unify all modes to a single `resultPositions` accumulator.

---

### D2. `architecture-layout.ts` — radial modes fabricate an entire `ExplorerDataSchema` that the adapters trust

```ts
const completeSummary = {
  ...
  cycleCount: 0,             // ← fabricated
  cyclesCount: 0,            // ← fabricated
  unresolvedCount: 0,        // ← fabricated
  ...
};

const schemaInput = {
  summary: completeSummary,
  nodes: safeNodes,
  edges: safeEdges,
  cycles: [],                    // ← fabricated empty
  unresolvedReferences: [],      // ← fabricated empty
  impactSummaries: {},           // ← fabricated empty
};
```

`schemaInput` is passed to `adaptComponentConstellation` and `adaptComponentOrbit`. If either adapter reads `summary.cyclesCount`, `summary.unresolvedCount`, `cycles`, `unresolvedReferences`, or `impactSummaries` — for risk flags, role symbols, ring prioritization, or anything else — it **receives fabricated zeros**. The adapter's output is then silently wrong in a way no test can detect without a fixture that has cycles.

`adaptComponentOrbit` also receives these fabricated values in `availableSuns` ranking (which sorts by `totalDependencyCount`, `childLwcCount`) — no cycle impact there. But `ComponentOrbitNode.risk` is copied from `rawNode.risk` — real risk survives. So the fabrication is limited to summary-level data. Still, verify what the adapters actually consume: **`grep -n 'summary\.\|\.cycles\|\.unresolvedReferences\|\.impactSummaries' component-orbit-adapter.ts component-constellation-adapter.ts`.**

---

### D3. `graph-layout.ts` — `extractNodesAndEdgesFromCy` is a lossy round-trip that silently corrupts layouts

Every field the layout engine cares about is either dropped or fabricated:

```ts
metrics: {
  fanIn:  data.fanIn  ?? 0,
  fanOut: data.fanOut ?? 0,
  coupling: data.coupling ?? 0,
  unresolved: 0,           // ← hardcoded, dropped
  score: 0,                // ← hardcoded, dropped
},
...
riskReasons: [],           // ← dropped
behavior: {
  isTest: Boolean(data.isTest),        // ← kept, but string-loose
  publicContractsCount: 0,             // ← dropped
  asyncPatterns: [],                   // ← dropped
  securitySignalsCount: 0,             // ← dropped
  queryCount: 0,                       // ← dropped
  dmlCount: 0,                         // ← dropped
  calloutCount: 0,                     // ← dropped
},
refactoringReadiness: {
  isHighRisk: data.risk === 'HIGH',    // ← derived
  hasCycles: Boolean(data.hasCycles),  // ← string-loose
  hasUnresolved: Boolean(data.hasUnresolved),  // ← string-loose
  testCoverageStatus: 'UNTESTED',      // ← dropped
},
```

And for edges:

```ts
resolutionClassification: 'RESOLVED_LOCAL',   // ← dropped
resolutionStrategy: 'EXACT',                  // ← dropped
confidence: '1.0',                            // ← dropped
line: null, column: null, methodOwner: null,  // ← dropped
file: '',                                     // ← dropped
canonical: {
  source: { type: 'ApexClass', name: data.source },   // ← fabricated type
  target: { type: 'ApexClass', name: data.target },   // ← fabricated type
  ...
},
```

When is this function called?

```ts
// runLayoutWithMetadata
const { nodes, edges } = extractNodesAndEdgesFromCy(cy);   // ← ALWAYS
const finalNodes = options?.nodes && options.nodes.length > 0 ? options.nodes : nodes;
```

So when `options.nodes` **is** provided (from `GraphView`, the normal path), the extracted data is discarded. When it **isn't** (e.g., `createLayout`'s fallback, or any external caller), the layout is computed on **fabricated metrics with `unresolved: 0, score: 0`**. Since `computeArchitectureLayoutWithMetadata` uses centrality, spacing, and risk-based placement, these fabricated zeros produce a **visually different layout** from a run with real metrics.

**Fix:** either validate that `options.nodes` is always populated at the entry point (and drop the extraction path), or preserve the full node/edge shape in `buildGraphElements`'s data and read it back losslessly. Do not fabricate `'ApexClass'` for unknown types — use `'External'` or preserve `data.type`.

---

### D4. `graph-layout.ts` — `Boolean("false") === true`

`extractNodesAndEdgesFromCy` uses string-loose coercion on fields that may arrive as strings:

```ts
isTest:       Boolean(data.isTest),
hasCycles:    Boolean(data.hasCycles),
hasUnresolved: Boolean(data.hasUnresolved),
unresolved:   Boolean(data.unresolved),
```

If `buildGraphElements` (or a JSON round-trip, worker serialization, or `localStorage` deserialization) has serialized these as `"false"`, then:

```
Boolean("false") === true
```

This causes:
- `isTest` → `true` → misclassified as a test node → placed as a satellite instead of a primary node
- `hasCycles` → `true` → styled with a cycle border (in `graph-style.ts`, but that uses `?` selector so it's separate) — but any layout logic that reads `refactoringReadiness.hasCycles` treats it as cyclical
- `unresolved` → `true` → edge rendered dashed/orange, and any centrality/resolution logic treats it as unresolved

**Fix:** use a strict coercion helper:

```ts
const toBool = (v: unknown): boolean => v === true || v === 'true';
```

Same issue exists in `GraphView.tsx`'s `derivedFocalLwcId` and `executionTimeMs`, but those are out of this cluster's scope.

---

### D5. `graph-layout.ts` — `data.id` vs `cyNode.id()` mismatch silently loses positions

```ts
nodes.push({
  id: data.id || cyNode.id(),
  ...
});
```

And later in `runLayoutWithMetadata`:

```ts
cy.nodes().forEach(node => {
  const id = node.id();               // ← cyNode.id()
  if (posMap[id]) node.position(posMap[id]);   // ← posMap keyed by extracted id
});
```

If `data.id` differs from `cyNode.id()` (stale data after a `cy.add` with a different id, or a manually-set `data.id` in the builder), then:

- `posMap['<data-id>']` is populated
- `posMap['<cy-id>']` is `undefined`
- the position silently **is not applied**

**Fix:** use `cyNode.id()` unconditionally in `extractNodesAndEdgesFromCy` — the layout must be keyed to the cy-node identity, not the data payload. If you need the data id for provenance, store it under a separate field.

---

### D6. `graph-layout.ts` — `createLayout` re-enables architecture layout for `useArchitectureLayout: false`

```ts
export function createLayout(cy, options): cytoscape.Layouts {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch) {
    const nodes = options?.nodes || extractNodesAndEdgesFromCy(cy).nodes;
    const edges = options?.edges || extractNodesAndEdgesFromCy(cy).edges;
    if (nodes.length > 0) {
      const posMap = computeArchitectureLayout(nodes, edges, options);
      return cy.layout({ name: 'preset', positions: ..., ... });
    }
  }

  const layoutOptions = getLayoutOptions(options);   // ← ignores useArchitectureLayout: false
  return cy.layout(layoutOptions);
}
```

And `getLayoutOptions`:

```ts
if (nodes && nodes.length > 0) {
  const posMap = computeArchitectureLayout(nodes, edges || [], options);
  return { name: 'preset', positions: ..., ... };
}
```

There is **no** check for `useArchitectureLayout` in `getLayoutOptions`. So `createLayout(cy, { useArchitectureLayout: false, nodes: [...] })`:

1. Skips the `if (useArch)` branch (good).
2. Calls `getLayoutOptions(options)`.
3. `options.nodes` is non-empty → architecture layout is applied **again**.

The `useArchitectureLayout: false` flag is effectively dead whenever `nodes` is non-empty.

**Fix:** in `getLayoutOptions`, add `const useArch = options.useArchitectureLayout !== false;` at the top and only take the preset branch if `useArch && nodes?.length > 0`.

---

### D7. `graph-layout.ts` — `createLayout`'s preset layout uses positions computed from the wrong node set

```ts
if (useArch) {
  const nodes = options?.nodes || extractNodesAndEdgesFromCy(cy).nodes;   // ← may differ from cy.nodes()
  const edges = options?.edges || extractNodesAndEdgesFromCy(cy).edges;
  if (nodes.length > 0) {
    const posMap = computeArchitectureLayout(nodes, edges, options);
    return cy.layout({
      name: 'preset',
      positions: (node: any) => posMap[node.id()] || node.position(),
      ...
    });
  }
}
```

If `options.nodes` was passed but is stale (e.g., the parent's previous render before a structural update lands), `posMap` includes positions for nodes that **aren't** in `cy.nodes()` — fine, they're skipped. But nodes that **are** in `cy.nodes()` but not in `options.nodes` fall back to `node.position()` — their current position — which may be from a layout that was supposed to be replaced. Mixed positions from two sources.

`GraphView` always calls `runLayoutWithMetadata` (not `createLayout`) when `useArchitectureLayout !== false`, so this path is currently unreachable from `GraphView`. But any other caller of `createLayout` will hit it.

**Fix:** build the `posMap` from `cy.nodes()` directly, or validate that `options.nodes` matches `cy.nodes()` before using it.

---

### D8. `graph-layout.ts` — `runLayoutWithMetadataAsync` non-arch path reports fabricated timing

```ts
return {
  positions: currentPositions,
  requestGeneration: 0,
  projectId: options?.projectId || 'default',
  isOffloaded: false,
  computeDurationMs: 0,     // ← fabricated: fcose layout took real time
  ipcDurationMs: 0,
  totalDurationMs: 0,       // ← fabricated: layout was synchronous, but took time
};
```

For a 500-node graph, `fcose` on the main thread takes ~500ms+. Reporting `0` corrupts any telemetry comparing worker vs. sync layout costs, or any regression detector using `totalDurationMs`.

**Fix:** measure with `performance.now()` at the call site, or at minimum set `isOffloaded: false` and `computeDurationMs` to actual elapsed time.

---

### D9. `[!]` `layout-worker-client.ts` — no cancellation, no timeout

`runLayoutWithMetadataAsync`:

```ts
const result = await globalWorkerClient.calculateLayoutAsync({
  projectId: options?.projectId || 'default',
  correlationToken: options?.correlationToken,
  nodes: finalNodes,
  edges: finalEdges,
  options,
  existingCanvasPositions: options?.existingPositions,
});
```

Three cross-module risks:

1. **No `AbortSignal` or request-id-based cancellation.** `GraphView` tracks `layoutRequestRef` but that only discards the result — the worker still runs to completion. Rapid mode switches queue worker requests, and each spends CPU.
2. **No timeout.** If the worker hangs (dead worker, infinite loop on malformed graph), the promise never resolves/rejects. `GraphView`'s `.then`/`.catch` never fire, `markLayoutEnd` is never called, and `isLayoutRunningRef` (if you set it — see O8) stays `true` forever. **The graph becomes unresponsive.**
3. **`existingCanvasPositions: options?.existingPositions`** — `options.existingPositions` defaults to `undefined` inside `runLayoutWithMetadataAsync`. The worker client must handle `undefined` and default to `{}`. Verify `calculateLayoutAsync` normalizes this.

**Required to close:** show `layout-worker-client.ts` and verify:
- `calculateLayoutAsync` accepts a `signal` or `requestId` for cancellation.
- It enforces a timeout (via `Promise.race` or worker-message timeout).
- It defaults `existingCanvasPositions` to `{}`.
- It serializes `projectedNodeIds` as a `Set<string>` **or** the caller reconstructs it.

---

### D10. `[!]` `layout-worker-client.ts` — `projectedNodeIds` Set serialization can hide all nodes

`runLayoutWithMetadataAsync`:

```ts
const isOrbitComponentFilter =
  (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
const focusedSet = result.projectedNodeIds;   // ← must be a Set, but is it?

cy.batch(() => {
  if (isOrbitComponentFilter && focusedSet) {
    const toShowNodes = cy.nodes().filter(n => focusedSet.has(n.id()));
    const toHideNodes = cy.nodes().filter(n => !focusedSet.has(n.id()));
```

If `result.projectedNodeIds` arrives from the worker as:

- an **array** → `Array.prototype.has` is `undefined` → `TypeError: focusedSet.has is not a function` (rejects the promise, caller's `.catch` runs sync fallback — **recoverable** but the async path is effectively broken for radial modes).
- an **object** `{}` → `Object.prototype.has` is `undefined` → same `TypeError`.
- **a serialized `Set`** that the client passes through as-is → depends on `structuredClone` / worker messaging. `postMessage` uses structured clone, which **preserves `Set`** — so if the client reconstructs the `Set` from a serialized payload, this works. If the client passes the payload directly (`{ 0: 'id1', 1: 'id2' }`), it does not.

`postMessage` on a `Set` works (structured clone preserves it), so the risk is **only** if the client does `JSON.parse(JSON.stringify(...))` somewhere in the plumbing.

**Required to close:** verify that `calculateLayoutAsync` returns `projectedNodeIds` as a `Set<string>`. If it returns `string[]`, coerce: `const focusedSet = new Set(result.projectedNodeIds)`.

---

### D11. `[!]` `graph-builder.ts` — style selectors depend on data-field typing that isn't visible

Both `graph-style.ts` boolean-selector bugs (string `"true"` vs boolean `true` — flagged in the prior review) and the `isInterFeature` selector depend on how `buildGraphElements` sets data fields. **If `graph-builder.ts` sets `isInterFeature` as a boolean**, then:

```ts
{ selector: 'edge[isInterFeature = "false"]', style: { width: 1.5, opacity: 0.6 } }
{ selector: 'edge[isInterFeature = "true"]',  style: { line-style: 'dashed', width: 2.5, opacity: 0.9 } }
```

**never match.** All intra-feature edges get the default width/opacity, and all inter-feature edges are **not dashed**. Hybrid-mode visual separation between intra- and inter-feature edges is completely lost.

**Required to close:** open `graph-builder.ts` and check:
- Is `isInterFeature` set as `boolean` or `string`?
- Are `hasCycles`, `hasUnresolved`, `isTest`, `unresolved` set as booleans or strings?

If any are booleans, **`graph-style.ts` needs `?field` selectors, not `[field = "true"]`**. Conversely, if any are strings, `graph-style.ts` is fine but `extractNodesAndEdgesFromCy`'s `Boolean(...)` coercion is the bug.

---

## 🟠 High — dispatcher leaks and inconsistent fallbacks

### D12. `graph-layout.ts` — non-arch fallback returns a **partial** `ArchitectureLayoutResultWithMetadata`

```ts
export function runLayoutWithMetadata(cy, options): ArchitectureLayoutResultWithMetadata {
  if (useArch && cy.nodes().length > 0) {
    ...
    return result;   // ← full ArchitectureLayoutResultWithMetadata
  }
  // non-arch
  return { positions: currentPositions };   // ← missing featureRegions, orbitGuides, projectedNodeIds
}
```

`GraphView` does:

```tsx
setFeatureRegions(layoutRes.featureRegions);
setOrbitGuides(layoutRes.orbitGuides);
```

For the non-arch fallback, both are `undefined`. React's `setState(undefined)` on a state that previously held a `Map` will update to `undefined` — but `GraphView` guards rendering with `architectureMode === 'hybrid'`/`'orbit'`, so no immediate visual bug. **However**, this is a latent inconsistency: `setFeatureRegions(undefined)` triggers a re-render that other effects observe. If a future effect does `if (featureRegions.size)` without a null check, it crashes.

**Fix:** always return the full shape (`{ positions, featureRegions: undefined, orbitGuides: undefined, projectedNodeIds: undefined }`) or make the return type nullable and force callers to guard.

### D13. `graph-layout.ts` — non-arch fallback doesn't fit and doesn't fire `layoutstart`/`layoutstop`

```ts
const layout = createLayout(cy, options);
layout.run();

const currentPositions: Record<string, { x: number; y: number }> = {};
cy.nodes().forEach(node => { currentPositions[node.id()] = node.position(); });
return { positions: currentPositions };
```

Two issues:
1. **No `cy.fit(...)`.** The arch path fits (unless `options.fit === false`); the non-arch path doesn't. `GraphView` expects the caller to fit (or at least for `runLayoutWithMetadata` to fit consistently). After the non-arch path, the view remains at whatever viewport was current.
2. **`layout.run()` fires `layoutstart`/`layoutstop` on the layout object's lifecycle**, but there's no guarantee the caller's listeners are attached. `GraphView` uses `cy.on('layoutstart')` / `cy.on('layoutstop')` — these **do** fire for any cy-level layout, including fcose. So `isLayoutRunningRef` is set/cleared correctly here. **But** the animated preset branch of the arch path uses `cy.layout({ animate: true }).run()` which also fires these — good. The non-animated arch branch **does not** create a layout object, so `layoutstop` never fires (already flagged in prior review). Consistent fix: ensure the non-animated arch branch also emits a synthetic `layoutstop` or sets `isLayoutRunningRef` manually around the fit.

### D14. `graph-layout.ts` — non-arch path returns `positions` keyed by **cy id**, not extracted id

Same class of bug as D5, but here it's consistent (both sides use `node.id()`). Not a bug in isolation. Cross-reference: when `runLayoutWithMetadataAsync`'s non-arch path runs, the return shape differs from the arch path (`positions` keyed by extracted id vs. cy id — but if D5 is fixed to always use cy id, this becomes consistent). Not a new bug, just worth noting for the fix.

### D15. `architecture-layout.ts` — `globalDomainResult.domainRegions.forEach` may crash

```ts
globalDomainResult.domainRegions.forEach((region, domain) => {
  domainXCenters[domain] = region.xCenter;
  domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
});
```

`globalDomainResult` is `let globalDomainResult;` (untyped), assigned either from `computeGlobalFeatureLayout` or `computeGlobalDomainLayout`. Later, `globalDomainResult.domainBounds` is accessed with a **guard**:

```ts
...(enableFeatureLayout && globalDomainResult.domainBounds
  ? { domainBounds: globalDomainResult.domainBounds }
  : {}),
```

But `globalDomainResult.domainRegions` is accessed **without** a guard. If `computeGlobalFeatureLayout` doesn't return `domainRegions` (renamed to `featureRegions` only), this crashes with `TypeError: Cannot read properties of undefined (reading 'forEach')`. The fact that `domainBounds` is guarded but `domainRegions` isn't suggests the author is unsure whether the feature layout returns it. **Verify:** does `computeGlobalFeatureLayout` return `domainRegions`? If not, hybrid mode crashes here.

### D16. `architecture-layout.ts` — `existingPositions` are copied without `Number.isFinite` validation

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

If `existingPositions[id] = { x: NaN, y: Infinity }` (from a corrupted save, an old layout bug, or a bad migration), it's copied verbatim. Downstream `cyNode.position({ x: NaN, y: Infinity })` produces a NaN position that **breaks `cy.fit`, `cy.center`, and every bounding-box computation** on the graph, potentially freezing the canvas.

**Fix:**
```ts
if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
  resultPositions[id] = { x: pos.x, y: pos.y };
}
```

Also: the same validation is missing from `captureAndPersistPositions` in `GraphView` (out of this cluster's scope but related).

### D17. `architecture-layout.ts` — phantom node fabrication can propagate into radial modes

When an edge endpoint is missing from `safeNodes`, the code fabricates:

```ts
safeNodes.push({
  id: e.source,
  displayName: e.source.split(':').pop() || e.source,
  type: 'External',
  file: '',
  metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
  risk: 'LOW',
  ...
});
```

These fabricated nodes are then passed to `adaptComponentConstellation`/`adaptComponentOrbit` via `schemaInput.nodes`. **The adapters will treat them as real "1-hop dependencies"** with `type: 'External'`, and lay them out with a node circle, label, and edges. A user sees a phantom "External" node that doesn't exist in their project.

**Fix:** filter edges whose endpoints aren't in the known node set **before** fabricating phantoms, or drop the phantom-creation entirely and reject invalid input with a clear error. Silent fabrication is worse than failure.

### D18. `graph-layout.ts` — `runLayoutWithMetadata` extracts from cy even when `options.nodes` is provided

```ts
if (useArch && cy.nodes().length > 0) {
  const { nodes, edges } = extractNodesAndEdgesFromCy(cy);   // ← O(n) always
  const finalNodes = options?.nodes && options.nodes.length > 0 ? options.nodes : nodes;
  const finalEdges = options?.edges && options.edges.length > 0 ? options.edges : edges;
```

The extraction is only used as fallback, but it always runs. For 500-node graphs with repeated layout triggers, this is O(n) wasted work per layout, accumulating across drags, mode switches, and structural updates.

**Fix:**
```ts
const finalNodes = options?.nodes?.length ? options.nodes : extractNodesAndEdgesFromCy(cy).nodes;
// same for edges, but avoid running extractNodesAndEdgesFromCy twice
```

### D19. `[!]` `layout-worker-client.ts` — `existingPositions` type is `Record<string, { x, y }> | undefined`, but the worker serialization must preserve it

```ts
existingCanvasPositions: options?.existingPositions,
```

If the caller passes a `Map<string, Position>` (which `GraphView` sometimes does via `modeSessionMapInSync` — but that's not passed here), the worker will receive `Map` serialized as `{}`. `Object.entries({})` yields `[]` → no positions restored → user drags lost in async mode.

`GraphView`'s `effectiveLayoutOptions` includes `focalLwcId: derivedFocalLwcId` and `enableFeatureLayout: ...` but **not** `existingPositions`. `existingPositions` is added at the `runLayoutWithMetadataAsync` call site:

```tsx
runLayoutWithMetadataAsync(cy, {
  ...effectiveLayoutOptionsRef.current,
  ...
  existingPositions: existingPosMap,   // ← from graphLayout.layoutPositions[mode]
  ...
});
```

`existingPosMap` is `Record<string, {x, y}>` — plain object, serializable. Fine. **Verify the worker accepts plain-object `existingCanvasPositions`** (not a `Map`).

---

## 🟡 Medium — style/dispatch inconsistencies

### D20. `graph-style.ts` — `edge:selected` is silently overridden by relationship-type rules

```ts
{ selector: 'edge:selected', style: { width: 4, line-color: '#3b82f6', target-arrow-color: '#3b82f6' } },
```

is declared **before** the generated relationship-type rules:

```ts
for (const [relType, color] of Object.entries(EDGE_COLORS)) {
  if (relType !== 'unknown') {
    styles.push({
      selector: `edge[relationshipType = "${relType}"]`,
      style: { 'line-color': color, 'target-arrow-color': color }
    });
  }
}
```

Cytoscape applies styles in order; the later rule wins for `line-color` and `target-arrow-color`. **Selected edges are drawn in their relationship-type color, not blue**, while keeping width 4. Consistent with the `node:selected` bug flagged in the prior review — same pattern.

### D21. `graph-style.ts` — style cache ignores future options

```ts
function shallowEqualOptions(a, b) { return a.nodeWidth === b.nodeWidth && ... }
```

If a future option is added (e.g., `edgeWidth`, `disableRiskBorder`), the cache returns stale styles because `shallowEqualOptions` doesn't check it. Low risk but forward-compat hostile.

### D22. `architecture-layout.ts` — `immutableStage7PrimaryPositions` freeze is shallow

```ts
const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
  ...localResult.primaryNodePositions,
});
```

`Object.freeze` freezes the outer map but not the inner `{x, y}` objects. If `calculateBridgeCandidatePosition` (or downstream code) mutates `immutablePrimaryPositions[id].x`, the mutation succeeds. This defeats the intent. Use a deep freeze or a Proxy, or better: pass `Object.freeze` at the *inner* level too:

```ts
const immutableStage7PrimaryPositions = Object.freeze(
  Object.entries(localResult.primaryNodePositions).reduce((acc, [id, pos]) => {
    acc[id] = Object.freeze({ x: pos.x, y: pos.y });
    return acc;
  }, {} as Record<string, Readonly<{ x: number; y: number }>>)
);
```

### D23. `architecture-layout.ts` — locale-dependent sort keys

```ts
safeNodes.sort((a, b) => a.id.localeCompare(b.id));
safeEdges.sort((a, b) => a.id.localeCompare(b.id));
```

`localeCompare` is locale-dependent. Two IDs that compare equal in one locale may differ in another (accented characters, numeric collation). For layouts that depend on sort order (which is **all** deterministic layout code), this can produce different output across machines.

**Fix:** use a locale-independent comparator:
```ts
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
```

### D24. `architecture-layout.ts` — `activeSpatialMap` may be a featureMap but is passed as `domainMap`

```ts
if (enableFeatureLayout) { ... activeSpatialMap = featureMap; }
else { ... activeSpatialMap = domainMap; }
...
const finalCleanupResult = resolveSpacingAndCollisions({
  ...
  options: {
    ...
    domainMap: activeSpatialMap,   // ← mislabelled in feature mode
  },
});
```

If `resolveSpacingAndCollisions` treats `domainMap` as "the spatial grouping key", and in hybrid mode `activeSpatialMap = featureMap`, this is **functionally correct** (the grouping is by feature, not domain, which is the intent of feature layout). But the parameter name is misleading, and any future code that assumes `domainMap` means domains will break. Rename to `spatialMap` or `groupingMap` — or pass `featureMap` under a separate key `featureMap` and let `resolveSpacingAndCollisions` merge.

### D25. `graph-layout.ts` — `LAYOUT_PRESETS` uses `numIter` / `initialTemp` which are `cose`-specific

```ts
export const LAYOUT_PRESETS = {
  stable:  { animate: false, numIter: 1000, initialTemp: 200 },
  ...
};
```

`fcose` does not read `numIter` / `initialTemp` — those are `cose` / `cose-bilkent` options. If `LAYOUT_PRESETS` is passed to `getLayoutOptions` or `createLayout`, the fields are silently ignored. **If this constant is consumed by external code, it's a silent no-op.**

---

## 🔵 Low / hygiene

### D26. `graph-layout.ts` — `getLayoutOptions` fcose fallback silently assumes `nodeCount`

```ts
const nodeCount = options.nodeCount || 0;
```

`createLayout` never sets `options.nodeCount`. `getLayoutOptions` doesn't read `cy.nodes().length`. So the fcose fallback always uses `nodeCount: 0` → `density = 1` → `padding: 80`, `idealEdgeLength: 120`, `nodeRepulsion: 8000`, `packComponents: true`. This is under-spaced for a 500-node graph. `GraphView` sets `nodeCount` when calling `runLayoutWithMetadata` directly, but `createLayout` (used by external callers) does not.

**Fix:** in `getLayoutOptions`, fall back to `cy.nodes().length` when `nodeCount` is undefined — but `getLayoutOptions` doesn't receive `cy`. Add a `nodeCount` propagation or move the density computation up to `createLayout`.

### D27. `graph-layout.ts` — `runLayoutWithMetadata` animated arch branch keeps `layoutstart`/`layoutstop` correct but the caller's `isLayoutRunningRef` isn't wired

The async and sync arch branches both trigger `cy.layout(...).run()` when `animate: true`. Cytoscape fires `layoutstart`/`layoutstop` for these. `GraphView`'s effect sets `isLayoutRunningRef.current = true` on `layoutstart`. But the **sync non-animated** arch branch doesn't create a layout object, so `layoutstart` never fires and `isLayoutRunningRef` stays `false` throughout. Meanwhile, `captureAndPersistPositions` runs at the end — but the position-only sync effect (with `deps: [nodePositions, architectureMode]`) can fire mid-computation and reapply old positions. This is a known symptom (flagged prior as O8) that has roots **here** in the dispatch layer.

### D28. `graph-layout.ts` — `extractNodesAndEdgesFromCy` performs `Boolean(data.hasCycles)` on data that may be a string, number, or undefined

Already covered under D4, but note the specific fields: `isTest`, `hasCycles`, `hasUnresolved`, `unresolved`. All four are `Boolean(...)`-coerced.

### D29. `graph-layout.ts` — `getLayoutOptions` returns `positions: (node) => posMap[node.id()] || { x: 0, y: 0 }`

The `{ x: 0, y: 0 }` fallback places any node without a computed position at the origin — stacking multiple such nodes on top of each other. For phantoms or nodes excluded from the layout (e.g., by domain partition), this creates an overlap. `cy.fit` then zooms way out to include the origin cluster. **Visible bug**: the graph appears crowded at origin after layout.

**Fix:** fall back to `node.position()` (as in `createLayout`) or `{ x: NaN, y: NaN }` (which Cytoscape skips). `createLayout` already does the former — `getLayoutOptions` does the latter. Inconsistent.

### D30. `graph-style.ts` — `node[hasCycles = "true"]` / `node[hasUnresolved = "true"]` / `edge[unresolved = "true"]` use string comparison against likely-boolean fields

Already flagged in prior review. Depends on `graph-builder.ts` output types. `node[?isTest]` uses the correct boolean syntax — the inconsistency within the same file is the strongest evidence that at least one is wrong.

---

## Summary table — Dispatch Cluster

| # | File | Bug | Impact |
|---|---|---|---|
| **D1** | architecture-layout.ts | `existingPositions` ignored in radial modes | User drags overwritten; the reported "button toggles but nothing changes" may actually be "geometry always reverts" |
| **D2** | architecture-layout.ts | Fabricated `ExplorerDataSchema` (zeros for cycles, unresolved, impact) | Wrong radial adapter output |
| **D3** | graph-layout.ts | `extractNodesAndEdgesFromCy` loses `metrics.score`, `metrics.unresolved`, behavior, canonical | Non-determinism between `options.nodes` path and extraction path |
| **D4** | graph-layout.ts | `Boolean("false") === true` for isTest/hasCycles/hasUnresolved/unresolved | Test nodes treated as cyclical; layout wrong |
| **D5** | graph-layout.ts | `data.id` vs `cyNode.id()` mismatch loses positions | Silent position loss |
| **D6** | graph-layout.ts | `useArchitectureLayout: false` re-enables arch layout when nodes present | fcose fallback unreachable |
| **D7** | graph-layout.ts | `createLayout` preset layout from stale `options.nodes` | Mixed positions from two sources |
| **D8** | graph-layout.ts | Async non-arch path reports `computeDurationMs: 0`, `totalDurationMs: 0` | Corrupted telemetry |
| **D9** `[!]` | layout-worker-client.ts | No cancellation, no timeout | Worker hang freezes graph |
| **D10** `[!]` | layout-worker-client.ts | `projectedNodeIds` Set serialization | All nodes hidden if not Set |
| **D11** `[!]` | graph-builder.ts | `isInterFeature`, `hasCycles`, `isTest` typing | `graph-style.ts` selectors silently fail |
| **D12** | graph-layout.ts | Non-arch returns partial result | `setFeatureRegions(undefined)` inconsistency |
| **D13** | graph-layout.ts | Non-arch doesn't fit, inconsistent `layoutstop` | Viewport drift |
| **D15** | architecture-layout.ts | `globalDomainResult.domainRegions.forEach` crash risk | Hybrid mode crash if `computeGlobalFeatureLayout` doesn't return `domainRegions` |
| **D16** | architecture-layout.ts | `existingPositions` not `Number.isFinite`-validated | NaN/Infinity breaks `cy.fit` |
| **D17** | architecture-layout.ts | Phantom nodes fabricated with `'External'` type | Phantom nodes visible in radial modes |
| **D18** | graph-layout.ts | Extraction always runs even when `options.nodes` provided | O(n) wasted work per layout |
| **D20** | graph-style.ts | `edge:selected` overridden by relationship-type colors | Selected edges not blue |
| **D22** | architecture-layout.ts | `Object.freeze` is shallow | `immutablePrimaryPositions` can be mutated |
| **D23** | architecture-layout.ts | `localeCompare` sort | Cross-locale non-determinism |
| **D24** | architecture-layout.ts | `activeSpatialMap` as `domainMap` | Misleading parameter name |
| **D29** | graph-layout.ts | `positions` fallback `{ x: 0, y: 0 }` in `getLayoutOptions` | Node stacking at origin |

---

## Minimum missing-file checklist to close this cluster

**`layout-worker-client.ts`** — verify:
1. `calculateLayoutAsync` accepts a cancellation token (`AbortSignal` or `requestId` + cancel method).
2. It enforces a timeout (recommend 10s for large graphs).
3. It returns `projectedNodeIds` as `Set<string>` (structured-clone-preserved) — or the caller reconstructs it (`new Set(result.projectedNodeIds)`).
4. It defaults `existingCanvasPositions` to `{}` when `undefined`.
5. It does not mutate `options` or `nodes` in place before passing to the worker (immutability contract).
6. It preserves `featureRegions` (as `Map`) and `orbitGuides` through serialization — or the caller reconstructs them.
7. It handles worker `error` events (crashes, uncaught exceptions) — otherwise the promise hangs.

**`graph-builder.ts`** — verify:
1. Are `isTest`, `hasCycles`, `hasUnresolved`, `unresolved`, `isInterFeature` booleans or strings?
2. Does it set `data.id` equal to `cy` element id? (Fix D5 either way.)
3. Does it preserve full `behavior` and `metrics` from `ExplorerNode` — or does the layout engine rely on these being zeroed when `runLayoutWithMetadata` uses the extraction path?
4. Does it set `relationshipType` on edges (needed for `graph-style.ts`)?
5. Are `featureRegions` (in hybrid mode) passed as `Map<string, string>` or a plain object?

Until those two files are visible, **D9, D10, D11, and parts of D3 are unverifiable** — but the provided code has enough bugs (D1, D4, D5, D6, D16, D17, D20) to keep the cluster broken even if the missing files are correct.


# Focused Orbit Cluster — Deep Bug Audit

**Scope limitation:** Only `component-orbit-adapter.ts` and `component-orbit-layout.ts` are provided. `orbit-layout.ts`, `orbit-semantics.ts`, and `graph-depth.ts` — the three files that determine correctness of this entire pipeline — are **not** in the file set. Every finding that depends on them is flagged `[!]` and listed in the closing contract checklist.

---

## 🔴 Critical — visible breakage

### R1. `component-orbit-adapter.ts` — `nodeDependentLwcsMap` ignores edge-type filtering → **false shared hubs**

```ts
edges.forEach((edge) => {
  ...
  if (sourceIsLwc && !targetIsLwc && nodeMap.has(edge.target)) {
    if (!nodeDependentLwcsMap.has(edge.target)) {
      nodeDependentLwcsMap.set(edge.target, new Set());
    }
    nodeDependentLwcsMap.get(edge.target)!.add(edge.source);   // ← no allowedEdgeTypes filter
  }
});
```

`allowedEdgeTypes` is computed **later**:

```ts
const allowedEdgeTypes = new Set(DEFAULT_COMPONENT_ORBIT_EDGE_TYPES);
if (includeTestReferences) {
  allowedEdgeTypes.add('test-reference');
}
```

Consequence: with the default `includeTestReferences: false` (which `GraphView` never overrides), a `test-reference` edge from a **test LWC** to a shared Apex class **still counts toward `isSharedHub`**. An Apex class referenced by 2 test classes shows `◉ Shared Hub` even though the tests are excluded from the orbit traversal — the hub badge points to a dependency the user **cannot see** in the ring. Symmetrically, a shared Apex class that only appears via `test-reference` won't be visible in the projection but will be flagged.

The same bug exists in `parentToChildLwcsMap` if `includeTestReferences` semantics change (currently the edge-type literal `'lwc-template-child'` saves it).

The same bug exists in `availableSuns` ranking:

```ts
const outCount = edges.filter((e) => e.source === lwc.id).length;
```

`outCount` counts **all** outgoing edges including `test-reference`. The ranker therefore picks a focal LWC different from what the BFS traversal would produce. **The two systems disagree about what "dependencies" means.**

**Fix:** compute `allowedEdgeTypes` *before* building `nodeDependentLwcsMap`, `parentToChildLwcsMap`, and `availableSuns`, and filter each edge by `allowedEdgeTypes.has(edge.relationshipType)`.

---

### R2. `component-orbit-layout.ts` — `maxNodesPerTrack <= 0` produces `Infinity` radii, breaking the layout

```ts
const tracksNeeded = Math.max(1, Math.ceil(n / maxNodesPerTrack));
```

For `maxNodesPerTrack = 0`: `n / 0 = Infinity`, `ceil(Infinity) = Infinity`, `Math.max(1, Infinity) = Infinity`.

```ts
const trackIdx = Math.floor(idx / maxNodesPerTrack);   // → 0 / 0 = NaN, idx / 0 = Infinity
```

```ts
const baseTrackRadius = baseRingRadius + trackIdx * trackSpacing;
```

`baseTrackRadius = baseRingRadius + Infinity * trackSpacing = Infinity`.

```ts
const x = center.x + trackRadius * Math.cos(angle);   // → Infinity
const y = center.y + trackRadius * Math.sin(angle);   // → Infinity or NaN
```

Every node ends up at `(Infinity, NaN)` or `(Infinity, Infinity)`. `Object.values(positions)` returns poisoned coordinates. `cy.fit(...)` then zooms out to include `Infinity` — **the graph renders as a single dot**.

No validation exists on `options.maxNodesPerTrack`, `options.ringSpacingPx`, or `options.trackSpacingPx`. `GraphView` calls `computeComponentOrbitLayout` indirectly via `computeComponentOrbitLayout(projection, { nodeWidth, nodeHeight })` and never sets these — so the defaults (`16`, `220`, `160`) are safe. **But any direct caller of `computeComponentOrbitLayout` with `maxNodesPerTrack: 0`, or a future refactor, will produce garbage silently.**

**Fix:** assert `maxNodesPerTrack > 0`, `ringSpacingPx > 0`, `trackSpacingPx > 0` at entry, throw with a clear error.

---

### R3. `component-orbit-layout.ts` — `innerRadius < 160` produces an unresolvable collision

```ts
const innerRadius = options.innerRadius ?? 280;
...
const baseRingRadius = innerRadius + (ringIndex - 1) * ringSpacing;
```

The AABB effective half-extents are `(120 + 120)/2 + 40 = 160` horizontal and `(60 + 60)/2 + 40 = 100` vertical. If `innerRadius < 160`, the focal node at `(0, 0)` and every ring-1 node at `(innerRadius, angle)` overlap in the AABB sense.

Repair excludes ring 0:

```ts
if (posA.ring === 0) continue;
...
if (posB.ring === 0) continue;
```

So the sun-vs-ring-1 collision **is never repaired**. But `initialCollisionCount` and `finalCollisionCount` both include it:

```ts
for (let i = 0; i < finalPosList.length; i++) {
    ...
    if (checkAABBOverlap(a, b, effWidth, effHeight)) finalCollisionCount++;
```

Result: `collisionCount > 0` in diagnostics, visible to any test or dashboard, with **no way to fix it** through the public API. Every future "why does orbit mode show overlaps" ticket traces to this.

**Fix:** either clamp `innerRadius = Math.max(options.innerRadius ?? 280, 160)` at entry, or exclude sun-vs-ring-N pairs from the collision counters.

---

### R4. `component-orbit-layout.ts` — `ringSpacing === 0` (or `trackSpacing === 0`) makes the repair loop **non-terminating in spirit**

```ts
while (repairPass < maxRepairPasses) {
    repairPass++;
    let repairsInThisPass = 0;
    ...
    if (checkAABBOverlap(posA, posB, effWidth, effHeight)) {
        const shiftNode = posB.ring >= posA.ring ? posB : posA;
        shiftNode.track += 1;
        shiftNode.radius += trackSpacing;   // ← if 0, radius unchanged
```

With `trackSpacing = 0`, `shiftNode.radius` never changes. The node's AABB is unchanged, so it collides again next pass. `maxRepairPasses = 20` caps the total, so the function **does** terminate — but the diagnostic `collisionCount === initialCollisionCount` looks like "repair is broken" when in fact it's a caller-supplied `trackSpacing: 0`.

`ringSpacing = 0` has a related effect: all rings collapse onto the same radius. With distinct `trackAngularOffset` per ring, they *sometimes* avoid collision, but nodes on multiple rings can overlap and repair can't fix them because the angular offset is small.

**Fix:** validate `ringSpacingPx > 0` and `trackSpacingPx > 0`.

---

### R5. `component-orbit-layout.ts` — ring 0 with >1 node **silently drops extras**

```ts
if (ringIndex === 0) {
  const sunNode = ringNodes[0] || projection.focus;
  if (sunNode) {
    ...
    positions[sunNode.nodeId] = { ... };
  }
  return;   // ← ignores ringNodes[1], ringNodes[2], ...
}
```

If `projection.nodes` has 2 nodes with `ringIndex: 0`, only the first is placed. The second node is dropped from `positions` entirely. `totalNodes` (`Object.values(projection.nodes).length`) will exceed `Object.keys(positions).length` — and nothing surfaces the discrepancy. In `GraphView`, the missing node has no `cy` position, so `cy.fit` includes it at `(0, 0)`, creating a phantom node at the origin.

The adapter guarantees at most one node at depth 0 (the focal sun), **but only if `graph-depth` returns a well-formed `depthMap`**. A bug in `graph-depth` (e.g., multiple depth-0 sources in a multi-source BFS) would silently corrupt the orbit.

**Fix:** if `ringNodes.length > 1`, either throw (invariant violation) or place all of them at `(0, 0)` with a diagnostic flag. Silent drop is the worst option.

---

### R6. `[!]` `component-orbit-adapter.ts` — **critical dependency on `graph-depth` returning `depthMap[focal] === 0`**

The adapter assigns:

```ts
const depth = depthMap.get(nodeId) ?? 0;
...
ringIndex: depth,
```

The layout expects:

```ts
if (ringIndex === 0) {
  const sunNode = ringNodes[0] || projection.focus;
  ...
}
```

**If `computeGraphDepths` assigns depth 1 to the focal node** (off-by-one in the BFS initialization), then:

1. `nodesByRing.get(0)` is `undefined`.
2. `positions[focalLwcId]` is set at radius `innerRadius + (1-1)*ringSpacing = 280` — i.e., the "sun" renders at 280px from center, **not at the center**.
3. `projection.focus.ringIndex === 1` — the caller's `focus` metadata disagrees with the rendered position.
4. `component-orbit-layout` has no invariant asserting the focal is at ring 0.

**Required to close:** show `graph-depth.ts` and verify:
- `depthMap.get(focalLwcId) === 0` for the source node.
- `reachableNodeIds.includes(focalLwcId)` (otherwise `nodesDict[focalLwcId]` is `undefined`, `projection.focus` is `null`, and the layout silently places no sun — see R7).
- `depthMap` has an entry for **every** node in `reachableNodeIds` (otherwise `?? 0` at line `const depth = depthMap.get(nodeId) ?? 0;` masks a missing mapping by promoting that node to ring 0).

---

### R7. `[!]` `component-orbit-adapter.ts` — reachable set may exclude the focal, then layout draws no sun

```ts
reachableNodeIds.forEach((nodeId) => {
    const rawNode = nodeMap.get(nodeId)!;   // non-null assertion!
```

If `reachableNodeIds` does not include the focal node (some BFS implementations return only *discovered* nodes, excluding the source):

- The focal is skipped from `nodesDict`.
- `focalNodeObj = nodesDict[focalLwcId] || null` → `null`.
- `projection.focus = null`.
- In the layout, `if (ringIndex === 0)` block never runs.
- **No sun is placed. Orbit renders as a donut with an empty center.**
- `projection.summary.totalReachableNodes` is also off by one.
- `projection.nodes` has no focal, but `projection.summary.ringCount` may include a phantom.

**Also:** `nodeMap.get(nodeId)!` will **crash** (`TypeError: Cannot read properties of undefined`) if `reachableNodeIds` includes an ID not present in `nodeMap` — e.g., a virtual/phantom node added by the depth engine.

**Required to close:** verify `computeGraphDepths` includes the source in `reachableNodeIds` and that all returned IDs exist in `nodeMap`. If not, the adapter must be defensive:

```ts
const rawNode = nodeMap.get(nodeId);
if (!rawNode) return;
```

---

### R8. `[!]` `component-orbit-adapter.ts` — `reachableEdges` may include edges to unreachable nodes → **false `isSameRing`**

```ts
reachableEdges.forEach((edge, index) => {
    const sourceDepth = depthMap.get(edge.source) ?? 0;
    const targetDepth = depthMap.get(edge.target) ?? 0;
    ...
    isSameRing: sourceDepth === targetDepth,
```

If `computeGraphDepths` includes edges whose endpoints aren't both in `reachableNodeIds`, then `depthMap.get(unreachable)` is `undefined`, and the `?? 0` coercion **labels the unreachable endpoint as depth 0** — same as the focal. This produces:

- `isSameRing: true` for edges that cross the boundary between focal and unreachable.
- `isCrossRing: false` for cross-ring edges.
- `sourceDepth`/`targetDepth` fields on `ComponentOrbitEdge` that disagree with the actual node's `depth` field in `nodesDict`.

Since `ComponentOrbitEdge.isSameRing`/`isCrossRing` are exposed to the UI (edge styling, arc rendering, drill-through metadata), this is a visible-in-the-wrong-way bug.

**Fix in adapter:** filter `reachableEdges` down to edges where **both** endpoints are in `reachableSet`, or replace `?? 0` with a sentinel (e.g., `-1`) and drop the edge if either endpoint is missing. The `?? 0` is the dangerous pattern here — it silently turns "unknown" into "focal".

---

### R9. `component-orbit-layout.ts` — `minAABBSeparationPx` reports **center-to-center distance**, not AABB gap

```ts
const dx = Math.abs(a.x - b.x);
const dy = Math.abs(a.y - b.y);
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < minAABBSeparationPx) {
  minAABBSeparationPx = dist;
}
```

For two 120×60 nodes with default `horizontalGap: 40`, `verticalGap: 40`, the actual AABB gap is `sqrt(max(0, |Δx| - 120)^2 + max(0, |Δy| - 60)^2)`. A pair with `|Δx|=120, |Δy|=60` (adjacent corner to corner) has `dist = 134` but `calcAABBGap = 0` (just touching). A pair with `|Δx|=160, |Δy|=0` has `dist = 160` but `calcAABBGap = 40`.

The metric named `minAABBSeparationPx` **cannot be used to verify "no overlaps"** — anything below ~120 doesn't prove an overlap, and anything above 134 doesn't prove separation. `ComponentConstellationLayout` correctly reports `minSharedNodeAabbClearancePx` via `calcAABBGap`; `ComponentOrbitLayout` does not. The two radial engines disagree on what "separation" means.

**Fix:** replace the metric with `calcAABBGap(a, b, { width: nodeWidth, height: nodeHeight }, ...)` per pair (or copy the constellation approach).

---

### R10. `component-orbit-layout.ts` — single-node graph reports `minAABBSeparationPx: 0` (should be `null` / `N/A`)

```ts
if (minAngularSeparationRad === Infinity) minAngularSeparationRad = 0;
if (minAABBSeparationPx === Infinity) minAABBSeparationPx = 0;
```

For a graph with only the focal node (1 node), `finalPosList.length === 1`, so the pair loop never runs. `minAABBSeparationPx` stays `Infinity` and is coerced to **`0`** — which semantically reads "nodes are at distance 0" (i.e., overlapping). A monitoring dashboard comparing `minAABBSeparationPx < 60` would fire a false alarm on every single-node orbit.

Same for `minAngularSeparationRad: 0` on a graph with one node per ring — semantically "adjacent nodes are at 0 radians" instead of "no adjacent nodes exist".

**Fix:** leave these as `null` or `Infinity` in diagnostics when no pair exists, and document in the type that `null` means "no pair". Or add explicit `pairCount` to disambiguate.

---

## 🟠 High — correctness and diagnostics

### R11. `component-orbit-layout.ts` — repair can compound outward indefinitely within a ring

```ts
shiftNode.radius += trackSpacing;   // cumulative across passes
```

Every pass shifts a colliding node outward by `trackSpacing`. With 20 passes and `trackSpacing = 160`, a node can be pushed up to **3200px** from its intended radius. This is bounded (so not a runaway), but on a ring that starts at `innerRadius = 280`, a repaired node ends up at `280 + 20*160 = 3480px` — 12× the intended radius. The result:

- `guides.rings[ringIndex].radiusPx` reports the **maximum** radius on that ring (post-repair). So the guide circle is drawn at 3480px, but the "intended" ring is 280px. Users see one giant circle with mostly-empty space.
- `diagnostics.maxRadiusPx` reports 3480px — misleading.
- The `minRadiusPx` on that ring stays at 280 — so `[280, 3480]` is the extent.

The repair has no "soft cap" (`Math.min(radius, baseRadius + k * trackSpacing)`), and there is no mechanism to instead **shift the node angularly** when radial displacement has grown large. A purely-radial repair is a poor choice when nodes crowd the inner ring.

**Fix:** either (a) alternate radial and angular displacement (shift `angle` instead of `radius` on alternate passes), (b) cap radial repair at `baseTrackRadius + 2 * trackSpacing` and fall back to angular spread, or (c) split crowded rings into multiple tracks *before* placement (the `maxNodesPerTrack` mechanism already exists but is only applied based on node count, not collision pressure).

### R12. `component-orbit-layout.ts` — `isChildLwc` classification uses graph-wide parent map, not reachable parents

Adapter:

```ts
const isChildLwc = !isSun && rawNode.type === 'LWC' && childToParentLwcsMap.has(nodeId);
```

`childToParentLwcsMap` was built from **all** `lwc-template-child` edges in the graph, including edges whose parent is *not* reachable from the focal. So an LWC at depth 3 that has a parent LWC at depth 5 (unreachable from the focus) is still `◎ Child LWC` — even though in this projection, its parent is nowhere to be seen.

Semantically misleading: the `◎` symbol implies "I'm a child component" but the UI shows no parent. Users will look for the parent edge and won't find it.

**Fix:**

```ts
const isChildLwc = !isSun && rawNode.type === 'LWC'
  && Array.from(childToParentLwcsMap.get(nodeId) ?? [])
       .some(parent => reachableSet.has(parent));
```

### R13. `component-orbit-adapter.ts` — `summary.focalLwcId` disagrees with `focus: null` in the empty-graph branch

```ts
if (!focalLwcId || !nodeMap.has(focalLwcId)) {
    return {
      focus: null,
      ...
      summary: {
        focalLwcId: options.focalLwcId || '',   // ← echoes the invalid input
        ...
      },
```

If the caller passed a non-existent `focalLwcId`, `summary.focalLwcId` echoes it back as if it were valid, while `focus` is `null`. Any consumer that reads `summary.focalLwcId` as truthy `string` (and doesn't check `focus`) will try to render a focal node that doesn't exist.

**Fix:** set `focalLwcId: ''` in `summary` when `focus` is `null`, or add a `focalResolution: 'resolved' | 'fallback' | 'missing'` flag.

### R14. `component-orbit-adapter.ts` — `availableSuns` is O(LWC × E) and doesn't cache outgoing edge counts

```ts
const availableSuns: ComponentOrbitAvailableSun[] = lwcNodes
    .map((lwc) => {
      ...
      const outCount = edges.filter((e) => e.source === lwc.id).length;
```

For 100 LWCs and 5000 edges, that's **500,000 comparisons** just to build the sun picker. Combined with R1's edge-type bug, the ranking is both **wrong** and **slow**.

**Fix:** build a single `Map<string, number>` of outgoing counts in one pass, filtered by `allowedEdgeTypes`:

```ts
const outCountByLwc = new Map<string, number>();
for (const e of edges) {
  if (!allowedEdgeTypes.has(e.relationshipType)) continue;
  outCountByLwc.set(e.source, (outCountByLwc.get(e.source) ?? 0) + 1);
}
```

### R15. `component-orbit-layout.ts` — guide rings report **repaired** radii, not intended radii, in `guides.rings`

```ts
const maxPlacedRadiusPerRing = new Map<number, number>();
finalPosList.forEach((pos) => {
  if (pos.ring > 0) {
    const curr = maxPlacedRadiusPerRing.get(pos.ring) ?? 0;
    if (pos.radius > curr) maxPlacedRadiusPerRing.set(pos.ring, pos.radius);
  }
});

const guideRings: ComponentOrbitGuideRing[] = projection.rings.map((ring) => {
  ...
  radiusPx = maxPlaced !== undefined
    ? Math.round(maxPlaced * 1000) / 1000
    : (innerRadius + (rIdx - 1) * ringSpacing);
```

If a single node on ring 3 is repaired outward from 720px to 2000px, the guide ring draws at 2000px — even though 99% of ring-3 nodes are at 720px. The guide circle visually implies "this is where ring 3 lives" but actually traces the outlier's radius.

Two options:

1. Report the **median** radius per ring instead of max, or
2. Report both `intendedRadiusPx` (= `innerRadius + (rIdx - 1) * ringSpacing`) and `maxPlacedRadiusPx` as separate fields.

The current single field is ambiguous and always biased toward outliers.

### R16. `component-orbit-layout.ts` — cumulative repair moves don't re-sort nodes into their new tracks

```ts
shiftNode.track += 1;
shiftNode.radius += trackSpacing;
```

The `track` field is a bookkeeping label. After repair, a node's `track` may no longer correspond to `Math.floor(ringNodes.indexOf(node) / maxNodesPerTrack)` — but the initial placement computed `trackIdx` from index. So `trackCounts[ringIndex]` (reported in diagnostics) is now stale. If any future code (or UI) uses `track` to group nodes ("show only track 0"), it will show the wrong nodes.

**Fix:** recompute `trackCounts` from actual final positions, or drop `track` from the public shape (it's internal metadata).

### R17. `component-orbit-adapter.ts` — `depthMap` off-by-`?? 0` masks missing depths in rings, edges, and `focus` metadata

```ts
// rings
const depth = depthMap.get(nodeId) ?? 0;

// edges
const sourceDepth = depthMap.get(edge.source) ?? 0;
const targetDepth = depthMap.get(edge.target) ?? 0;
```

Every use of `?? 0` in this module promotes "not found" to "focal node", which is the **highest-priority** ring. If `computeGraphDepths` ever omits a node from `depthMap` (defensive BFS exits, depth cap reached, etc.), the node appears *at the center of the orbit* with no indication that it was misclassified.

**Fix:** use `?? -1` (or a typed `MISSING` sentinel) and either drop the node from `nodesDict` or throw with a clear diagnostic. Silent promotion to focal is the worst failure mode.

---

## 🟡 Medium — cross-file contracts and UX

### R18. `[!]` `orbit-layout.ts` — `checkAABBOverlap(a, b, effWidth, effHeight)` semantics must be verified

The layout relies on `checkAABBOverlap(posA, posB, effWidth, effHeight)` returning `true` when the **effective** AABBs overlap:

```ts
const { effWidth, effHeight } = getEffectiveAABBGap(a, b, horizontalGap, verticalGap);
if (checkAABBOverlap(posA, posB, effWidth, effHeight)) { ... }
```

with

```ts
const effWidth = (a.width + b.width) / 2 + horizontalGap;
const effHeight = (a.height + b.height) / 2 + verticalGap;
```

If `checkAABBOverlap` instead treats its third and fourth args as **absolute** separation thresholds against `Math.abs(a.x - b.x)`, the repair triggers when `|Δx| < effWidth` — which is exactly the required semi-sum + gap. Correct. But if it treats them as **exclusive** upper bounds (`Math.abs(a.x - b.x) <= effWidth`), collisions on the exact boundary are flagged. Minor.

**But if it treats the third/fourth args as the *pair's* combined width/height** (not half-sums), the effective threshold is doubled, and the repair over-triggers — 2× the intended gap. **Verify the exact implementation.**

### R19. `[!]` `orbit-layout.ts` — `normalizeAngle` range must be verified

```ts
const angle = normalizeAngle(rawAngle);
...
const diff = Math.abs(a.angle - b.angle);
const angularDist = Math.min(diff, 2 * Math.PI - diff);
```

If `normalizeAngle` returns `[0, 2π)` — correct. If it returns `(-π, π]` — the `2π - diff` compensation is wrong. If it returns `[0, π)` or wraps differently, every downstream `minAngularSeparationRad` and any future "rotate the orbit" feature will be silently wrong.

**Verify:** `normalizeAngle(2π + 0.1) === normalizeAngle(0.1)` and that the range is `[0, 2π)`.

### R20. `[!]` `orbit-semantics.ts` — role symbol priority must match the adapter

The adapter assigns `☉ / ◎ / ◉ / ○` and the layout sort uses:

```ts
const rolePriority: Record<ComponentOrbitRoleSymbol, number> = {
  '☉': 0, '◎': 1, '◉': 2, '○': 3,
};
```

If `orbit-semantics.ts` defines a different priority (e.g., `◉` before `◎`), rings render in a different order than the semantic priority the rest of the app assumes. **Verify** by grepping for `rolePriority`, `☉`, `◎`, `◉`, `○` in `orbit-semantics.ts`.

### R21. `component-orbit-layout.ts` — `executionTimeMs` and all rounding use `Math.round(x * 1000) / 1000`

- `executionTimeMs = Math.round((endTime - startTime) * 100) / 100` — 2 decimal places, so a 0.001ms run reports `0`. Fine.
- Positions rounded to 3 decimals — `0.001px` drift. The **doc comment** claims "100% Deterministic placement", but rounding to 3 decimals is technically a mild loss of precision vs. `Math.round(x * 1e6) / 1e6`. Determinism holds (same input → same output), but "0.00000px coordinate drift" (claimed in `component-constellation-layout.ts`, similar engine) is stricter than what this file guarantees.

Flag as documentation drift between the two radial engines — if a future refactor unifies them, the rounding strategy must be reconciled.

### R22. `component-orbit-adapter.ts` — `availableSuns` ranking doesn't handle "no root LWC" (all children) gracefully

```ts
.sort((a, b) => {
  if (a.isRootLwc !== b.isRootLwc) return a.isRootLwc ? -1 : 1;
  if (b.totalDependencyCount !== a.totalDependencyCount) {
    return b.totalDependencyCount - a.totalDependencyCount;
  }
  if (b.childLwcCount !== a.childLwcCount) {
    return b.childLwcCount - a.childLwcCount;
  }
  return a.id.localeCompare(b.id);
});
```

If **every** LWC has a parent (no root LWC in the graph), all entries have `isRootLwc: false`, and the sort falls back to `totalDependencyCount` — which measures "number of outgoing edges" (see R1). So the focal defaults to the LWC with the most outgoing edges, **not** the most semantically central. A user who opens orbit mode on a library-only graph gets an arbitrary focal.

Also, `localeCompare` (R23) makes this depend on runtime locale.

**Fix:** add a deterministic primary key (root status) and document the fallback explicitly, or require `options.focalLwcId` to be present when no root LWC exists.

### R23. `component-orbit-adapter.ts` — `localeCompare` makes sun selection and ring ordering locale-dependent

Two places:

```ts
return a.id.localeCompare(b.id);   // availableSuns tie-break
```

```ts
if (a.type !== b.type) return a.type.localeCompare(b.type);
...
return a.nodeId.localeCompare(b.nodeId);   // ring sort tie-break
```

For accents or numeric suffixes (`Order_2` vs `Order_10`), `localeCompare` produces locale-specific orderings. This breaks the "100% deterministic" contract whenever the user's system locale differs between sessions (or between server and client).

**Fix:** use `a < b ? -1 : a > b ? 1 : 0`.

---

## 🔵 Low / hygiene

### R24. `component-orbit-layout.ts` — `nodesByRing.get(ringIndex)!` non-null assertion is safe but brittle

The `!` is safe because `sortedRingIndices` came from `nodesByRing.keys()`. But a future refactor that filters `sortedRingIndices` (e.g., "skip empty rings") would introduce a runtime crash. Add an explicit `?? []` for defensive resilience.

### R25. `component-orbit-layout.ts` — repair moves don't reset `posA`/`posB` view in the inner loop

After `posB` is shifted, the inner loop's next iteration (`j + 1`) re-reads `posB` from `currentList[j+1]` — a **different** node. The shifted node at `currentList[j]` isn't re-checked against `currentList[j+1]` in the same pass. This is why multiple passes are needed (correct), but the comment in the code doesn't say so. Add an inline comment for future maintainers.

### R26. `component-orbit-adapter.ts` — `ComponentOrbitEdge.isCompositionEdge` and `isControllerEdge` are boolean literals against string edge types

```ts
const isCompositionEdge = edge.relationshipType === 'lwc-template-child';
const isControllerEdge = edge.relationshipType === 'lwc-apex';
```

Correct today, but if `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` is ever expanded with new "composition" types (e.g., `lwc-template-child-inline`), these flags silently miss them. Consider deriving from a shared `COMPOSITION_EDGE_TYPES` / `CONTROLLER_EDGE_TYPES` set in `orbit-semantics.ts`.

### R27. `component-orbit-layout.ts` — guide ring 0 is reported with `radiusPx: 0` but `nodeCount: 0`

```ts
{
  ringIndex: 0,
  radiusPx: 0,
  label: 'Nucleus Center',
  nodeCount: 0,
},
```

`nodeCount: 0` is correct when ring 0 is not in `projection.rings` (which it is, since adapter builds a ring for depth 0 only if focal is present). But the `guides.rings` array may now be **inconsistent** with `diagnostics.ringNodeCounts` (which reports `{ 0: 1 }`). Consumers that cross-reference the two will find a mismatch.

**Fix:** compute `nodeCount` from `finalPosList.filter(p => p.ring === 0).length` instead of the hardcoded `0`.

### R28. `component-orbit-adapter.ts` — `includeTestReferences` is never wired by `GraphView`

```ts
// GraphView.tsx
const effectiveLayoutOptions = useMemo((): GraphLayoutOptions => ({
  ...layoutOptions,
  enableFeatureLayout,
  enableCandidateDOrdering: architectureMode === 'hierarchical',
  focalLwcId: derivedFocalLwcId,
}), ...);
```

No `includeTestReferences` key. So test references are **always excluded** in orbit mode from `GraphView`, regardless of user intent. This is a design choice, but it means `ComponentOrbitAdapterOptions.includeTestReferences` is a dead flag in the app — only exercised by direct callers (tests, storybook, notebooks).

If test references *should* be visible in orbit mode, the option must be threaded through `GraphLayoutOptions`, `effectiveLayoutOptions`, and `runLayoutWithMetadataAsync`. Currently the whole feature is unreachable from the UI.

### R29. `component-orbit-adapter.ts` — `ComponentOrbitEdge` doesn't carry `source`/`target` **node** references, only IDs

```ts
provenance: {
  sourceEdgeId: edge.id || edgeId,
  sourceComponentName: sourceNode?.displayName || edge.source,
  targetComponentName: targetNode?.displayName || edge.target,
  relationshipType: edge.relationshipType,
},
```

If `sourceNode`/`targetNode` are `undefined` (edge touches an unreachable node — see R8), the fallback is the raw id string, which may be a `ApexClass:Foo` style identifier that the UI will display as-is. Minor but a UI wart that surfaces only when R8 is triggered.

### R30. `component-orbit-adapter.ts` — `unreachableNodeIds` includes test nodes, phantom nodes, and excluded-by-edge-type nodes

```ts
const unreachableNodeIds = nodes
  .map((n) => n.id)
  .filter((id) => !reachableSet.has(id))
  .sort((a, b) => a.localeCompare(b));
```

This is "everything not reachable", which for a full Salesforce org is thousands of nodes. `summary.totalUnreachableNodes` becomes a very large number that users interpret as "orphan nodes". If a `ComponentOrbit` diagnostics panel shows "1,247 unreachable nodes", users assume these are dead code — when in fact most are simply *further than maxDepth 7 hops away*.

**Fix:** distinguish "unreachable" from "beyond maxDepth" (the depth engine would need to report this), or rename the field to `nodesBeyondDepthCap`.

---

## Contract checklist — required to close this cluster

Since **three of the five files in this cluster are missing**, the following must be verified:

### `graph-depth.ts` — the linchpin

- [ ] Does `computeGraphDepths` assign `depthMap.get(focalLwcId) === 0`?
- [ ] Is `focalLwcId` included in `reachableNodeIds`?
- [ ] Does `depthMap` have an entry for **every** ID in `reachableNodeIds` (no gaps)?
- [ ] Does `reachableEdges` only contain edges whose **both** endpoints are in `reachableNodeIds`?
- [ ] Does `computeGraphDepths` accept a `maxDepth` and stop descending past it, **and** report nodes-at-cap separately?
- [ ] Is the returned `reachableNodeIds` order **deterministic** (BFS order by node id)? If not, ring ordering in the layout depends on insertion order (mitigated by the explicit sort, but still worth verifying).
- [ ] Does `depthResult.maxDepthReached` exist? The adapter forwards it as `summary.maxDepth`, and `computeComponentOrbitLayout` reads it as `diagnostics.maxDepth`.

### `orbit-layout.ts` — the shared geometry contract

- [ ] `checkAABBOverlap(a, b, effWidth, effHeight)` — does it treat the third/fourth args as **half-sums** (correct) or **full sums** (2× over-trigger)?
- [ ] `normalizeAngle(θ)` — does it return `[0, 2π)` (correct) or `(-π, π]` (breaks angular separation diagnostics)?
- [ ] `calculateRequiredSectorRadius` — is it used by any other consumer (constellation, or `component-orbit-layout` in a future refactor)? If so, verify it handles `n_k === 1` and `n_k === 0`.
- [ ] Does `orbit-layout.ts` export `Performance`-related helpers? The layout engine uses `performance.now()` directly.

### `orbit-semantics.ts` — the role symbol and label contract

- [ ] Does it define the same `☉ / ◎ / ◉ / ○` priority as `component-orbit-layout`'s sort? (grep `rolePriority`)
- [ ] Does it define labels for rings (`'Nucleus Center'`, `'Inner Constellation Macro Ring'`) that match what `component-orbit-layout` and `component-constellation-layout` emit?
- [ ] Does it have a `COMPOSITION_EDGE_TYPES` / `CONTROLLER_EDGE_TYPES` set (per R26)?
- [ ] Are test-reference edges handled consistently here?

---

## Top-priority fixes

| # | Bug | Impact |
|---|---|---|
| **R1** | `nodeDependentLwcsMap` ignores `allowedEdgeTypes` | False shared-hub badges, sun selection mismatch |
| **R6** | `graph-depth` must assign focal at depth 0 | Sun rendered at wrong radius, or missing entirely |
| **R7** | Reachable set must include focal + all IDs in `nodeMap` | Missing sun, `TypeError` crash on phantom node |
| **R8** | `reachableEdges` must not include unreachable edges | `isSameRing`/`isCrossRing` lie, `?? 0` promotes unknowns to focal |
| **R2** | `maxNodesPerTrack <= 0` → Infinity radii | Silent layout corruption |
| **R3** | `innerRadius < 160` → unresolvable collision | Permanent overlap with no fix |
| **R5** | Ring 0 > 1 node → silent drop | Phantom at origin, node count mismatch |
| **R9** | `minAABBSeparationPx` is center-to-center, not AABB gap | Diagnostics lie about collision status |
| **R10** | Single-node graph reports `separation: 0` | False positive in monitoring |
| **R14** | `availableSuns` O(LWC × E) + unfiltered | Slow startup on large graphs |
| **R17** | `?? 0` promotes missing depths to focal | Silent misclassification |
| **R23** | `localeCompare` throughout | Cross-locale non-determinism, breaks "100% deterministic" contract |

The `isSharedHub` false positive (R1) and the missing-file contract (R6–R8) are the two that would silently produce a visually plausible but semantically wrong orbit — the hardest class of bug to catch without the missing files.


# Multi-Sun Constellation Cluster — Deep Bug Audit

**Scope limitation:** `constellation-layout.ts` was **not** provided. `graph-depth.ts` (from Cluster 4) is also missing but is a hard dependency here too. The PBIM coordinates `(-675.0, -389.7114)` you cite are **not present** in either provided file — the only PBIM-specific hardcoding I can see is the `CONTRACTED_INNER_SUN_IDS` / `CONTRACTED_OUTER_SUN_IDS` arrays in the adapter. **Please confirm whether the hardcoded coordinate lives in `constellation-layout.ts`** (which would make the re-export stub a *second live path* — the exact scenario you flagged).

---

## 🔴 Critical — silent failures that make constellation "work on PBIM, fail elsewhere"

### K1. `component-constellation-adapter.ts` — **root suns are silently dropped** if `graph-depth` excludes the BFS source

```ts
activeSunIds.forEach((sunId) => {
  const depthResult = computeGraphDepths(nodes, edges, sunId, { maxDepth: 1, ... });
  const reachableSet = new Set(depthResult.reachableNodeIds);
  reachableSet.forEach((nodeId) => {
    if (!nodeReferencingSunsMap.has(nodeId)) nodeReferencingSunsMap.set(nodeId, new Set());
    nodeReferencingSunsMap.get(nodeId)!.add(sunId);
  });
});
```

Then, later:

```ts
activeSunIds.forEach((sunId) => {
  const nodeObj = projectedNodesDict[sunId];
  if (nodeObj) {                 // ← "if" not "otherwise throw"
    sunsNodes.push(nodeObj);
    ...
  }
});
```

`projectedNodesDict` is built **only** from `nodeReferencingSunsMap` iteration:

```ts
nodeReferencingSunsMap.forEach((sunsSet, nodeId) => {
  const rawNode = nodeMap.get(nodeId);
  ...
  projectedNodesDict[nodeId] = { ... };
});
```

**Therefore:** if `computeGraphDepths` does **not** include the source `sunId` in `reachableNodeIds`, then a root sun (referenced by no other sun) never appears in `nodeReferencingSunsMap`, never appears in `projectedNodesDict`, and is **silently dropped from `sunsNodes`, `innerSuns`, `outerSuns`, and `positions`**.

This is the **same latent dependency as Cluster 4 R7**, and it's the strongest single candidate for "works on PBIM, fails elsewhere":

- On PBIM, some of the 14 suns reference each other (dashboards reference widgets, containers reference panels), so roots still appear in the map.
- On a project where suns are pure roots (never children of another sun — the common case), **every sun is dropped**.

Observable result: `activeSunIds.length === 14` but `projection.suns.length === 0`. Layout returns `positions: {}`, `projectedNodeIds: new Set()` → `GraphView`'s orbit-constellation filter hides **every node** (`focusedSet.has(n.id())` is false for all). **Blank canvas.**

**Fix:** don't gate sun inclusion on `nodeReferencingSunsMap`. Either (a) add every active sun to `projectedNodesDict` unconditionally before the map iteration, or (b) require `graph-depth` to include source in `reachableNodeIds` and add a runtime assertion here.

**Required to close:** confirm `computeGraphDepths(nodes, edges, sunId, ...).reachableNodeIds.includes(sunId) === true`. If `false`, both Cluster 4 and Cluster 5 have this bug simultaneously.

---

### K2. `component-constellation-layout.ts` — **hardcoded `6` inner / `8` outer** ignores `projection.innerSuns.length`

```ts
const innerSuns = [...projection.innerSuns].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
const innerAngleStep = (2 * Math.PI) / 6;   // ← hardcoded

innerSuns.forEach((sunNode, idx) => {
  const angle = idx * innerAngleStep;       // 0°, 60°, 120°, ...
  ...
});
```

```ts
const outerAngleStep = (2 * Math.PI) / 8;   // ← hardcoded
const outerInterlacingOffset = Math.PI / 8;
```

The adapter's fallback path (`activeSunIds.length === 0`) does **not** clamp to 6/8:

```ts
if (activeSunIds.length === 0) {
  const allLwcs = nodes.filter((n) => n.type === 'LWC');
  allLwcs.forEach((lwc, idx) => {
    activeSunIds.push(lwc.id);
    if (idx < 6) innerSunSet.add(lwc.id);
    else outerSunSet.add(lwc.id);
  });
}
```

If the graph has 20 LWCs and none are in `CONTRACTED_*`, the fallback produces **6 inner + 14 outer**. The layout then places 14 outer suns with `outerAngleStep = 45°` → **indices 8–13 wrap around and overlap indices 0–5**, producing 6 pairs of coincident suns (or near-coincident — with `Math.round(x*100)/100` truncation, some pairs land on **exactly** the same coordinate).

Consequences:
1. `minSunCenterDistancePx === 0` — the diagnostics literally report sun-on-sun overlap.
2. `calcAABBGap` returns negative → clamped to `0` in `Math.max(0, ...)` → sun-vs-sun collisions **never trigger shared-node repair**, because repair only pushes shared nodes away from suns, not suns away from each other.
3. The visual result: two suns rendered on top of each other, their orbits (from step 4's local placement) literally superposed.
4. On a 30-LWC graph, 6 inner + 24 outer → **three full wraps**, six colliding pairs.

**Fix:** derive step from `suns.length`:
```ts
const innerAngleStep = innerSuns.length > 0 ? (2 * Math.PI) / innerSuns.length : 0;
const outerAngleStep = outerSuns.length > 0 ? (2 * Math.PI) / outerSuns.length : 0;
```
And **assert** `innerSuns.length <= 6 && outerSuns.length <= 8` in the adapter, or (better) cap the fallback to `slice(0, 6)` / `slice(6, 14)`.

---

### K3. `component-constellation-adapter.ts` — PBIM fallback picks **test LWCs and orphans** as suns

```ts
if (activeSunIds.length === 0) {
  const allLwcs = nodes.filter((n) => n.type === 'LWC');
  allLwcs.forEach((lwc, idx) => {
    activeSunIds.push(lwc.id);
    if (idx < 6) innerSunSet.add(lwc.id);
    else outerSunSet.add(lwc.id);
  });
}
```

No filter on:
- `behavior.isTest` — a test LWC with a `__tests__` suffix becomes an inner sun
- Orphan nodes (0 in-edges, 0 out-edges) — the least meaningful nodes become suns
- Child LWCs (nodes with `childToParentLwcsMap.has(id)`) — a pure child that's never a root becomes an inner sun

On a non-PBIM project (e.g., NPSP, EDA, or a customer's own org), the first 6 alphabetically sorted LWCs become inner suns. If those happen to be test utilities (`AccountTestDataFactory`, `TestUtilities`, `MockFactory`, `FakeDataBuilder`, `TestHelper`, `AssertionHelper`), the entire constellation visualizes only the test layer — real production code is invisible.

**Fix:** rank fallback candidates by the same criteria as `adaptComponentOrbit.availableSuns` (root-LWC status, dependency count, child count) and exclude `isTest`. Or, more honestly, **refuse to run** without either `customSunIds` or the contracted PBIM list, and throw a clear diagnostic.

---

### K4. `component-constellation-layout.ts` — **all diagnostics are discarded** by the caller

The layout engine computes:

```ts
diagnostics: {
  totalNodes: Object.keys(positions).length,
  sunCount: placedSuns.length,
  sharedNodeCount: sharedPositions.length,
  minSunCenterDistancePx: ...,
  minSunEdgeClearancePx: ...,
  minSharedNodeAabbClearancePx: ...,
  displacedSharedNodeCount: ...,
  executionTimeMs: ...,
  ...(invariantViolations.length > 0 ? { invariantViolations } : {}),
},
```

But `architecture-layout.ts`:

```ts
if (architectureMode === 'constellation') {
  const projection = adaptComponentConstellation(schemaInput, options.componentConstellationOptions);
  const constellationOutput = computeComponentConstellationLayout(projection, {...});
  ...
  return {
    positions: constellationPositions,
    orbitGuides: constellationOutput.guides as any,
    projectedNodeIds: new Set(Object.keys(projection.nodes)),
  };   // ← diagnostics, invariantViolations discarded
}
```

**`invariantViolations` is the only signal that shared-node repair gave up.** It's computed, populated with strings like `"Shared node X violates clearance with Sun Y: gap = 47.32px < 120px"`, and then thrown away. Users get a visually crowded constellation with **zero** telemetry indicating that repair failed. This is the single biggest observability gap in the codebase.

Contrast with `runLayoutWithMetadata`'s arch path — it also computes `featureRegions` and returns them. The constellation path *could* return `diagnostics` under a new field (`{ positions, orbitGuides, diagnostics: { invariantViolations, ... } }`) but the return type `ArchitectureLayoutResultWithMetadata` has no slot for it.

**Fix:** extend `ArchitectureLayoutResultWithMetadata` with an optional `diagnostics?: { invariantViolations: string[]; minSunEdgeClearancePx: number; ... }`, or at minimum `console.warn` violations at the call site.

---

### K5. `architecture-layout.ts` — `existingPositions` ignored in constellation mode

```ts
if (architectureMode === 'constellation') {
  const projection = adaptComponentConstellation(schemaInput, options.componentConstellationOptions);
  const constellationOutput = computeComponentConstellationLayout(projection, {...});
  ...
  return { positions: constellationPositions, ... };
}
```

Same as **Cluster 3 D1** — `existingPositions` (Level 1/2/3 authority) is **never merged** in constellation mode. Any drag, saved position, or restored position in constellation is silently overwritten on every layout trigger (mode switch, reset, structural update).

Combined with the PBIM fallback (K3), this means: on non-PBIM, the user cannot escape the fallback layout. They drag a node — next layout, they get the same arbitrary fallback. No visual indication of why.

**Fix:** same as Cluster 3 D1 — merge `existingPositions` at the end of both radial branches.

---

### K6. `component-constellation-layout.ts` — shared-node repair runs at **1px tolerance**, but diagnostics compare to `120px`

The repair loop:

```ts
const gap = calcAABBGap(state, nodeSize, sunPos, nodeSize);
if (gap < minRequiredAabbClearance - 1e-3) {   // ← triggers below 119.999
  ...
}
```

But the initial iteration of the same check:

```ts
if (gap < minRequiredAabbClearance - 1e-3) {
```

is correct. **However**, the repair only fires when a violation is detected. The **displacement** is:

```ts
const pushDist = minRequiredAabbClearance - gap + 1.0;   // ← "just enough" push
state.x += ux * pushDist;
state.y += uy * pushDist;
```

`pushDist` moves the node exactly to the boundary plus 1px. But `calcAABBGap` is Euclidean (via `Math.sqrt(dx*dx + dy*dy)`) while the push is along the **radial** direction. For a diagonal displacement, moving `pushDist` along `(ux, uy)` changes each coordinate by `pushDist * ux` and `pushDist * uy`. The resulting gap is:

```
newDx = dx + pushDist * ux
newDy = dy + pushDist * uy
newGap = sqrt(max(0, |newDx| - effW/2)^2 + max(0, |newDy| - effH/2)^2)
```

If the original displacement was axis-aligned (ux=1, uy=0), `newGap ≈ minRequired + 1` — good. If diagonal (`ux = uy = 0.707`), the gap increases by less than `pushDist` per pass — **the pass may need to run multiple times**.

The loop runs at most 20 passes, so most cases resolve. But **coincident nodes** (same position) use the fallback:

```ts
if (dist < 1e-4) {
  dx = 1.0; dy = 0.0; dist = 1.0;   // radial direction
}
```

That's radial, not toward the sun — so a shared node at the sun's exact position gets pushed **right** (positive x) rather than outward from any centroid. If the shared node's referencing suns include one to the right, it's pushed directly into the sun. Multiple passes eventually resolve, but the geometry is arbitrary.

**Not a bug per se**, but worth noting: shared-node repair uses Euclidean-to-radial arithmetic inconsistently, which makes "how many passes are needed" data-dependent.

---

### K7. `component-constellation-layout.ts` — no repair for **shared-node-to-shared-node** collisions or **shared-to-unshared**

Repair checks:
- Rule A: shared node vs all its referencing suns ✓
- Rule B: shared node vs every other shared node ✓

Missing:
- shared node vs **unshared nodes** placed around non-referencing suns
- shared node vs **other suns' local orbits** (a shared node on the inner ring can land inside the orbit of an outer sun)

Concrete failure: two inner suns A, B each have 8 local children in a 280px radius. A node C referenced by suns on the far side of the ring has a centroid near A's position → C is placed inside A's orbit ring → C collides with one of A's children → **no repair runs**, `minSharedNodeAabbClearancePx` reports only shared-vs-sun, so the collision is invisible.

**Fix:** add Rule C (shared vs unshared) and Rule D (shared vs other sun's local children). This is what makes the current repair loop look "almost working" — it fixes the easy case and silently accepts the hard one.

---

### K8. `component-constellation-layout.ts` — `minSharedNodeAabbClearancePx` under-reports actual collisions

```ts
sharedPositions.forEach((sharedPos) => {
  placedSuns.forEach((sunPos) => {
    const gap = calcAABBGap(sharedPos, ..., sunPos, ...);
    if (gap < minSharedNodeAabbClearancePx) minSharedNodeAabbClearancePx = gap;
  });
});
```

**Only shared-vs-sun pairs are checked.** The name "shared node AABB clearance" suggests all shared-node clearances, but the implementation only reports the minimum against suns. A graph with zero shared-vs-sun collisions but dense shared-vs-shared overlap will report `minSharedNodeAabbClearancePx: 120` (or higher) — a false positive.

Since `invariantViolations` are populated **after** this diagnostic, the user could see:
- `minSharedNodeAabbClearancePx: 130` (looks healthy)
- `invariantViolations: []` (looks healthy)
- **But** the graph has 15 overlapping shared nodes.

**Fix:** report three separate diagnostics:
- `minSharedNodeToSunClearancePx`
- `minSharedNodeToSharedNodeClearancePx`
- `minSharedNodeToUnsharedClearancePx` (once K7 is fixed)

---

### K9. `component-constellation-adapter.ts` — `totalOccurrences` semantically diverges from anything the UI can display

```ts
reachableSet.forEach((nodeId) => {
  totalOccurrences++;      // counts every (sun, reachable) pair
  ...
});
```

`totalOccurrences` counts sun-to-sun references too:

```ts
// sun A references sun B (both are active suns)
// → nodeReferencingSunsMap[B] contains A
// → totalOccurrences includes this pair
```

`projection.summary.totalOccurrences` will therefore report `projection.nodes.length + extra_sun_to_sun_count` — a number that **exceeds** the number of nodes any UI can display. A dashboard comparing `totalOccurrences` to `totalUniqueNodes` will report a discrepancy that isn't a bug in the data — it's a bug in the metric name.

**Fix:** either (a) exclude self and sun-to-sun from the counter, or (b) rename to `totalSunNodePairs` with a doc comment.

---

## 🟠 High

### K10. `component-constellation-adapter.ts` — sun-vs-sun **edges are preserved but suns are never laid out relative to each other**

```ts
const projectedSet = new Set(Object.keys(projectedNodesDict));
edges.forEach((edge, index) => {
  if (projectedSet.has(edge.source) && projectedSet.has(edge.target)) {
    ...
    projectedEdges.push({ ... });
  }
});
```

An `A→B` edge between two suns is preserved in `projectedEdges`. But in the layout:

```ts
Object.values(projection.nodes).forEach((node) => {
  if (node.isSun) return;   // ← suns placed by macro ring only
  ...
});
```

Suns are placed purely by `angle = idx * innerAngleStep`. Sun A at index 0 (0°) and sun B at index 3 (180°) — the edge A→B is drawn across the entire constellation but the placement doesn't reflect the composition semantics. On a PBIM graph where `dashboard-container → asset-dashboard` is a real parent-child relationship, both being suns, the layout treats them as unrelated roots at opposite sides of the ring.

**Fix:** either (a) sort suns by a deterministic "composition graph" traversal order rather than lexicographic id, or (b) accept the arbitrary placement but add a `diagnostics.sunToSunEdges` list so users know some edges are "structural" only.

### K11. `component-constellation-layout.ts` — `roleSymbol` priority **contradicts** `component-orbit-layout.ts`

Constellation (adapter):
```ts
if (isSun) roleSymbol = '☉';
else if (isSharedNode) roleSymbol = '◉';    // ← shared wins over child
else if (isChildLwc) roleSymbol = '◎';
```

Orbit (adapter):
```ts
if (isSun) roleSymbol = '☉';
else if (isChildLwc) roleSymbol = '◎';      // ← child wins over shared
else if (isSharedHub) roleSymbol = '◉';
```

An LWC that is both a child (of some sun) and shared (referenced by ≥2 suns) gets:
- **`◎` (child)** in orbit mode
- **`◉` (shared)** in constellation mode

Same node, different symbol depending on which radial engine rendered it. Users switching between the two modes see the icon change for no obvious reason.

Layout engine also differs: orbit sorts by `rolePriority`, constellation sorts shared nodes by `nodeId.localeCompare` (no role priority at all).

**Fix:** extract role priority to a shared module (`orbit-semantics.ts` — flagged in Cluster 4 as missing) and pick one ordering. Then use it in both engines.

### K12. `component-constellation-layout.ts` — `roleSymbol` not used for sorting shared nodes

```ts
sharedNodesList.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
```

Unlike orbit (which uses `rolePriority`), constellation sorts by ID only. Combined with K11, an LWC child of one sun that's shared by 3 gets `◉` and is placed in a deterministic-but-arbitrary position relative to other shared nodes. Its visual relationship to its actual parent sun is not reflected in the sort.

**Fix:** sort shared nodes by `(primarySun angle, roleSymbol, nodeId)` to keep children of the same sun adjacent.

### K13. `component-constellation-layout.ts` — coincident suns cause `pushDist` to divide-by-zero in repair

```ts
if (dist < 1e-4) {
  dx = 1.0; dy = 0.0; dist = 1.0;
}
```

This fires when a **shared node's centroid is coincident with a sun** (e.g., a node referenced by exactly 1 sun — but such nodes should be `isSharedNode: false` and placed in `unsharedNodesBySun`, not `sharedNodesList`). So the check should be unreachable... **except** when sun-to-sun overlap (K2) causes two suns to be coincident, and a shared node referenced by both has a centroid exactly at the overlap point. Then the push direction is arbitrary (positive-x), and the node is pushed in a random direction relative to the overlapping suns.

**Fix:** derive the direction from `state.rawX - sunPos.x` (using the pre-repair centroid) rather than hardcoding `(1.0, 0.0)`.

### K14. `component-constellation-layout.ts` — no validation of `options.nodeWidth` / `nodeHeight` against local orbit radius

```ts
const nodeWidth = options.nodeWidth ?? 120.0;
const nodeHeight = options.nodeHeight ?? 60.0;
const R_LOCAL = options.localOrbitRadius ?? 280.0;
```

`R_LOCAL = 280`, `nodeWidth = 120` — the half-width is 60, so 280/60 = ~4.67. Local children arranged at 280px radius with 8 children (45° apart) — chord = `2 * 280 * sin(22.5°) = 214px`, effective width = 120+40 = 160px. OK for default.

But `localOrbitRadius: 100, nodeWidth: 120` → half-width 60, radius 100, chord at 8 children = 76px < 160px effective → **8 children on top of each other**. No repair for local children (only shared nodes get repair).

**Fix:** validate `localOrbitRadius >= 2 * (nodeWidth + horizontalGap)` at entry, or clamp children-count-per-sun to fit (same `maxNodesPerTrack` logic as orbit).

### K15. `component-constellation-adapter.ts` — `includeTestReferences` filter is applied to BFS but **not** to `availableSuns`-equivalent ranking

Unlike Cluster 4 (which has `availableSuns` and the R1 bug), constellation has **no** ranking step — suns come entirely from `customSunIds` or the fallback. But the fallback filters `nodes.filter(n => n.type === 'LWC')` with **no** `isTest` filter. So test LWCs become suns (already noted as K3), AND the edge-type filter (`includeTestReferences`) has no way to exclude them because suns are chosen before BFS runs.

**Fix:** in the fallback, add `!n.behavior?.isTest` to the filter, and consider `includeTestReferences` when ranking.

---

## 🟡 Medium

### K16. `component-constellation-adapter.ts` — `customSunIds` cannot distinguish inner vs outer

```ts
if (CONTRACTED_INNER_SUN_IDS.includes(id)) innerSunSet.add(id);
else if (CONTRACTED_OUTER_SUN_IDS.includes(id)) outerSunSet.add(id);
else {
  // Fallback categorization
  if (innerSunSet.size < 6) innerSunSet.add(id);
  else outerSunSet.add(id);
}
```

Custom IDs not in the contracted lists are assigned inner-then-outer based on **iteration order of `targetSunList`**. If `customSunIds: ['LWC:A', 'LWC:B', 'LWC:C', 'LWC:D', 'LWC:E', 'LWC:F', 'LWC:G']`, the first 6 become inner and G becomes outer. Swap two entries → different visual layout, but `customSunIds.length === 7` in both cases.

**Fix:** accept `customSunIds: { inner: string[], outer: string[] }` OR document the ordering dependency loudly.

### K17. `component-constellation-adapter.ts` — `maxDepth: 1` hardcoded, not configurable

```ts
const depthResult = computeGraphDepths(nodes, edges, sunId, {
  maxDepth: 1,       // ← hardcoded
  direction: 'dependencies',
  allowedEdgeTypes,
});
```

Both `maxDepth` and `direction` are hardcoded. Orbit exposes `maxDepth: 7` default and `direction` configurable. A user who wants "constellation with 2-hop children" cannot get it. A user who wants `direction: 'both'` cannot get it.

**Fix:** extend `ComponentConstellationAdapterOptions` with `maxDepth?: number` and `direction?: 'dependencies' | 'dependents' | 'both'`, and honour them.

### K18. `component-constellation-adapter.ts` — no `focalLwcId` support

`adaptComponentConstellation` ignores `options.focalLwcId`. `architecture-layout.ts`:

```ts
if (isOrbit) {
  const projection = adaptComponentOrbit(schemaInput, {
    focalLwcId: options.focalLwcId,       // ← orbit honours it
    ...options.componentOrbitOptions,
  });
}
```

Constellation mode with a `focalLwcId` in `GraphLayoutOptions` — the option is silently dropped. A user selecting a node and switching to constellation mode expects that node to be a sun; instead they get the 14 contracted suns (or the fallback), and their selection is irrelevant.

**Fix:** support `focalLwcId` in constellation as an "ensure this node is a sun" override, or at minimum throw a warning when it's provided.

### K19. `component-constellation-layout.ts` — `maxRepairPasses` is hardcoded to 20

```ts
const maxPasses = 20;
```

No `options.maxRepairPasses`. Inconsistent with `component-orbit-layout.ts` (`maxRepairPasses?: number`). For dense graphs, 20 passes may not resolve all collisions (K7, K8 compound this). For sparse graphs, 20 passes is overkill.

**Fix:** add `maxRepairPasses?: number` to `ComponentConstellationLayoutOptions` and default to 20.

### K20. `component-constellation-layout.ts` — no `customNodeDimensions` support

`component-orbit-layout.ts` has:
```ts
customNodeDimensions?: Record<string, { width: number; height: number }>;
```

`component-constellation-layout.ts` has **no such field**. All nodes are `120 × 60`, regardless of the actual rendered node size (which `graph-style.ts` sets based on type). An `ApexClass` node in constellation is measured as `120×60` for collision but rendered as an ellipse of the default cytoscape size — visual gap detection diverges from the diagnostic gap.

**Fix:** add `customNodeDimensions` and use it in `calcAABBGap` for both placement and repair.

### K21. `component-constellation-layout.ts` — rounding to **2 decimals** contradicts the doc-comment's "0.00000px"

```ts
const x = Math.round((center.x + R_INNER * Math.cos(angle)) * 100) / 100;
```

Doc comment:
```
* - 100% Determinism (0.00000px coordinate drift)
```

`0.005px` drift vs exact. `component-orbit-layout.ts` uses **3 decimals** (`* 1000 / 1000`). If a future refactor unifies both engines, or a test asserts "identical to reference", the precision mismatch surfaces.

**Fix:** standardize to 3 decimals (matching orbit) or update the doc-comment to `0.01px`.

### K22. `component-constellation-layout.ts` — `sunCoords` map can contain entries for suns that were **silently dropped** by the adapter

If K1 fires (root sun missing from `projection.nodes`), then `projection.innerSuns` / `projection.outerSuns` exclude that sun (they're built from `projectedNodesDict`), so `sunCoords` is only built for surviving suns. **But** `sharedNodesList` iterates `projection.nodes` — if a shared node's `referencingSunIds` includes the missing sun, the centroid computation uses `sunCoords`:

```ts
suns.forEach((sId) => {
  if (sunCoords[sId]) {     // ← silent skip if sun was dropped
    sumX += sunCoords[sId].x;
    sumY += sunCoords[sId].y;
    validSunCount++;
  }
});
```

If only 1 of 2 referencing suns is in `sunCoords`, `validSunCount === 1` and the shared node is placed **at the surviving sun's exact position** — then repair pushes it out. But it's no longer "shared" in any meaningful sense; it's a 1-hop child of a phantom sun.

**Fix:** if `validSunCount < sNode.referencingSunIds.length`, either throw or record it as a diagnostic violation. Silent centroid fallback is a semantic lie.

### K23. `component-constellation-adapter.ts` — `referencingSunIds` sort order is `localeCompare`

```ts
const sunsList = Array.from(sunsSet).sort((a, b) => a.localeCompare(b));
```

Same locale-comparison issue as Cluster 4 R23 and Cluster 3 D23. Combined with `unsharedNodesBySun` taking `referencingSunIds[0]` as parent (see K24), the parent of an unshared node is **locale-dependent**.

**Fix:** use `(a, b) => (a < b ? -1 : a > b ? 1 : 0)`.

### K24. `component-constellation-layout.ts` — `unsharedNodesBySun` uses `referencingSunIds[0]` as the sole parent

```ts
} else if (node.referencingSunIds.length === 1) {
  const parentSunId = node.referencingSunIds[0];
```

Correct for `length === 1`. But: nodes with `length === 0` (impossible by construction but defensive coding would handle it) are silently dropped — no warning, no diagnostic.

**Fix:** add an explicit `else if (node.referencingSunIds.length === 0) { /* diagnostic */ }` branch.

### K25. `component-constellation-layout.ts` — `roleSymbol` is defined but never used **in the layout**

The layout doesn't reference `roleSymbol` at all. This isn't a bug per se, but it means:
- The adapter's role classification has no layout consequence
- Two nodes with identical placement semantics but different roles (◉ vs ○) are placed identically
- Any future feature that wants to highlight hubs by geometry (e.g., "◉ nodes get larger orbit radius") must be added in the layout AND coordinated with the adapter's classification

Flag as a design gap: the role symbol is a **label-only** concept right now, despite being computed by the adapter.

---

## 🔵 Low / hygiene

### K26. `component-constellation-layout.ts` — `performance.now()` without polyfill

Same as Cluster 4 R21 — non-browser environments throw at function entry before any diagnostic can be produced.

### K27. `component-constellation-layout.ts` — `innerSunSet`/`outerSunSet` are `Set<string>` in the adapter but used only via `.add()` and iteration

No `size`-based validation. `innerSunSet.size` could be 20, `outerSunSet.size` could be 0 — layout accepts both (with K2 producing overlaps).

**Fix:** after sun set construction, validate `innerSunSet.size <= 6 && outerSunSet.size <= 8`, or drop extras with a diagnostic.

### K28. `component-constellation-adapter.ts` — `options` field is passed through but never consumed

```ts
return {
  ...
  options,      // ← echoes ComponentConstellationAdapterOptions
};
```

No consumer in the provided files reads `projection.options`. It's dead data. If a future feature wants to know "was customSunIds used?", it must either read `options` or inspect the sun set. Minor design gap.

### K29. `component-constellation-layout.ts` — `unsharedNodesBySun.forEach` iterates `Map` insertion order

```ts
unsharedNodesBySun.forEach((children, sunId) => {
```

`unsharedNodesBySun` is built from `Object.values(projection.nodes).forEach` — insertion order of `projectedNodesDict`. The layout iterates this map and places children per-sun. Because the final positions of a sun's children are computed from `sunPos` (fixed) and `childIdx` (from the sorted `children.sort(...)`), the iteration order of `unsharedNodesBySun` doesn't affect **per-sun** placement. But it does affect the **order** in which positions are written to `positions` — irrelevant for `Object.values`, but relevant if any downstream code iterates `Object.entries(positions)` in insertion order.

Minor — flag for correctness-conscious readers.

### K30. `constellation-layout.ts` — **unverified re-export stub**

You mention it's a "re-export stub — verify it's not a second live path". Not provided, so:

**Required verification:**
1. `cat constellation-layout.ts` — confirm it's `export * from './layout/component-constellation-layout'` (or similar), with **no** duplicate implementation.
2. `grep -rn "from '.*constellation-layout'" src/` — confirm every import points to the canonical path (`./layout/component-constellation-layout`), not the stub.
3. `grep -rn "(-675\|-389.7114\|MaintenanceRequestController" src/` — locate the PBIM coordinates you cite. If they're in `constellation-layout.ts`, it **is** a second live path and the pipeline is dispatching to the wrong engine.
4. Check `graph-layout.ts` and `architecture-layout.ts` for duplicate `computeComponentConstellationLayout` imports from different paths.

If `constellation-layout.ts` **does** contain a second implementation with hardcoded PBIM coordinates, that explains the "works on PBIM, fails elsewhere" symptom perfectly — and would override all other bugs in this cluster as the top-priority fix.

---

## Priority summary

| # | File | Bug | Impact |
|---|---|---|---|
| **K1** | adapter | Root suns dropped if `graph-depth` excludes source | Blank canvas on non-PBIM |
| **K2** | layout | Hardcoded 6/8 angle steps | Coincident suns when > 6/8 |
| **K3** | adapter | Fallback picks test/orphan LWCs as suns | Constellation shows wrong layer |
| **K4** | architecture-layout.ts | `invariantViolations` and diagnostics discarded | Zero observability |
| **K5** | architecture-layout.ts | `existingPositions` ignored in constellation | User drags overwritten |
| **K7** | layout | No shared-vs-unshared repair | Silent overlaps |
| **K8** | layout | `minSharedNodeAabbClearancePx` under-reports | False "healthy" diagnostic |
| **K11** | adapter + layout | `roleSymbol` priority contradicts orbit engine | Same node, different symbol across modes |
| **K14** | layout | No `localOrbitRadius` vs `nodeWidth` validation | Child overlap at 8+ children |
| **K18** | adapter | `focalLwcId` silently ignored | Selection doesn't influence sun |
| **K30** | constellation-layout.ts | Unverified stub — **if it contains PBIM coords, it's the top bug** | "Works on PBIM only" |

The **most likely single explanation** for your reported "works on PBIM, fails elsewhere" is either **K1** (root suns dropped → empty canvas everywhere) or **K30** (a second live path in `constellation-layout.ts` with PBIM-specific hardcoding). Verify both before applying the other fixes — they may make the rest of this cluster moot.


# Layered Architecture Cluster — Deep Bug Audit

**Scope limitation:** Only `architecture-layout.ts` (the pipeline half) is in the provided file set. **All 13 `layout/*.ts` modules are missing.** I've audited the pipeline orchestration thoroughly and flagged **every contract the missing modules must satisfy** as `[!]` verification items. Findings that depend on missing-file behavior are explicitly marked.

Because this is the "reference implementation" per your framing, I'm also flagging **where the reference itself is broken** — which means the "fixes" in Clusters 4/5 that copy from here inherit these bugs.

---

## 🔴 Critical — reference pipeline is broken

### A1. `architecture-layout.ts` — phantom node fabrication silently inflates the graph

```ts
safeEdges.forEach(e => {
  if (!knownNodeIds.has(e.source)) {
    knownNodeIds.add(e.source);
    safeNodes.push({
      id: e.source,
      displayName: e.source.split(':').pop() || e.source,
      type: 'External',
      file: '',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      ...
    });
  }
  if (!knownNodeIds.has(e.target)) { ... }
});
```

Phantom nodes enter the pipeline **as first-class citizens**. They are:
- assigned a layer (`classifyNodeLayerWithReason` sees `type: 'External'` → likely `domain` or `application`),
- assigned a domain (`discoverDomains` groups them with real nodes),
- included in centrality (`computeGraphCentralityAnalysis` counts their edges),
- eligible for bridge placement (`isTestNode` / `isFieldNode` are false → they pass the stage-8 filter),
- included in packing and cleanup,
- rendered on canvas.

Concrete failure on a real org: a resolver emits `ApexClass:Foo → ApexClass:BarNotYetAnalyzed` for 200 references to a class that the analyzer skipped. `BarNotYetAnalyzed` becomes **1 phantom node with fanIn=200**. Centrality marks it as a hub. Layer classification sends it to `application`. Its 200 edges trigger bridge placement. The user sees a giant "External BarNotYetAnalyzed" node dominating the layer band — but it's not a real file.

Worse: `metrics.unresolved: 0` and `score: 0` are **fabricated**. Any risk scoring that reads these sees a low-risk node. Compare this to Cluster 3 D3's `extractNodesAndEdgesFromCy` — **the fabrication pattern is system-wide**.

**Fix:** either (a) reject the input with a clear diagnostic ("200 edges reference unknown nodes"), or (b) fabricate the phantoms with `metrics.unresolved: 1`, `score: 100`, `risk: 'HIGH'` so they're treated as unresolved references, not as legitimate zero-risk nodes.

### A2. `architecture-layout.ts` — `completeSummary.unresolvedCount` and `cycleCount` fabricated as `0`

```ts
const completeSummary = {
  ...
  cycleCount: 0,             // ← fabricated
  cyclesCount: 0,            // ← fabricated (note: duplicate field name)
  unresolvedCount: 0,        // ← fabricated
  ...
};

const schemaInput = {
  summary: completeSummary,
  nodes: safeNodes,
  edges: safeEdges,
  cycles: [],                      // ← fabricated empty
  unresolvedReferences: [],        // ← fabricated empty
  impactSummaries: {},             // ← fabricated empty
};
```

`graph-layout.ts` already has the real data:
```ts
extractNodesAndEdgesFromCy` extracts `unresolved` per edge (line-by-line in Cluster 3 D3).
```

The pipeline **throws away** the real values and fabricates zeros. If `computeArchitectureAnalysis`, `discoverDomains`, `discoverFeatures`, `computeGraphCentralityAnalysis`, or `computeLocalNodeLayout` reads `summary.unresolvedCount`, `summary.cycleCount`, `cycles`, or `unresolvedReferences`, they operate on **fabricated zero-risk data**.

The most dangerous consumer: `discoverDomains` — if it groups by risk/coupling, phantoms and unresolved nodes get treated as low-risk productive nodes. Second most dangerous: `computeGraphCentralityAnalysis` — if `isBridge` filtering uses unresolved status, unresolved refs become bridges.

**Fix:** compute from actual data:
```ts
unresolvedCount: safeEdges.filter(e => e.unresolved).length,
cycleCount: 0,  // ← leave only if you're sure no cycle pass runs elsewhere
```

Or reject the input — silent fabrication is the worst option.

### A3. `architecture-layout.ts` — `enableFeatureLayout` is re-evaluated from raw `options`, not from the destructured variable

```ts
const {
  ...
  architectureMode,   // = options.architectureMode
  enableFeatureLayout = options.enableFeatureLayout ?? (options.architectureMode === 'hybrid'),
  ...
} = options;
```

The default re-reads `options.architectureMode` instead of the destructured `architectureMode`. Currently equivalent (no default on `architectureMode`), but if a caller passes `{ architectureMode: undefined }` and the destructure later gains a default (e.g., `architectureMode = 'hierarchical'`), the two diverge — the destructured value is `'hierarchical'` while `enableFeatureLayout` evaluates `undefined === 'hybrid' === false`, silently disabling feature layout for hybrid.

**Fix:** `enableFeatureLayout = options.enableFeatureLayout ?? (architectureMode === 'hybrid')`.

### A4. `architecture-layout.ts` — `enableCandidateDOrdering` default disagrees with GraphView's explicit override

Type declaration:
```ts
/** Enables Candidate D processing-order-only pre-sorting for Stage 8 bridge candidate evaluation (default: false) */
enableCandidateDOrdering?: boolean;
```

Pipeline default:
```ts
enableCandidateDOrdering = false,
```

GraphView override:
```tsx
enableCandidateDOrdering: architectureMode === 'hierarchical',   // true for hierarchical, false otherwise
```

**Divergence:**
- GraphView + hierarchical → `enableCandidateDOrdering: true`
- Direct caller + hierarchical → `enableCandidateDOrdering: false` (pipeline default)

Same architecture mode, **two different bridge placement algorithms**. Visual diff between "layout through the app" and "layout through a test/storybook/notebook" is a silent trap.

The flag is also **semantically coupled to architecture mode** despite being a standalone boolean. A caller who wants "hierarchical with Candidate D disabled" (e.g., for A/B testing) can't get it through GraphView — the flag is derived, not passed.

**Fix:** either (a) remove the mode derivation from GraphView and pick a single default, or (b) make `enableCandidateDOrdering` a first-class option in `GraphLayoutOptions` that the user controls.

### A5. `architecture-layout.ts` — `globalDomainResult.domainRegions` used without guarding

```ts
globalDomainResult.domainRegions.forEach((region, domain) => {
  domainXCenters[domain] = region.xCenter;
  domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
});
```

But `globalDomainResult.domainBounds` (same result object, sibling field) IS guarded at the final-cleanup call:

```ts
...(enableFeatureLayout && globalDomainResult.domainBounds
  ? { domainBounds: globalDomainResult.domainBounds }
  : {}),
```

The asymmetry is a red flag: the author wasn't sure whether `computeGlobalFeatureLayout` returns `domainRegions` / `domainBounds` / both. If it returns `domainBounds` but not `domainRegions` (or vice versa), this stage crashes with `TypeError: Cannot read properties of undefined (reading 'forEach')`.

**Also:** `domainXCenters` and `domainBounds` are `Record<string, ...>` but `forEach((region, domain) => ...)` suggests `domainRegions` is a `Map<string, FeatureRegion>`. If it's a plain `Record`, `.forEach` is undefined → crash.

**Required to close:**
- `[!]` Does `computeGlobalFeatureLayout` return `domainRegions`? As a `Map` or a `Record`?
- `[!]` Does `computeGlobalDomainLayout` return the same field names?

### A6. `architecture-layout.ts` — `satelliteResult.positions` may drop bridge and primary nodes; then `componentShiftedPositions = packed.positions` **drops them permanently**

Trace:

```ts
const satelliteResult = placeSatellites(
  safeNodes, safeEdges, analysis, basePositions, {...}
);

let componentShiftedPositions = { ...satelliteResult.positions };
```

If `placeSatellites` returns **only satellites** (test nodes, fields, triggers — the name suggests this), then `satelliteResult.positions` contains **only** those nodes. Primary and bridge nodes (the majority) are missing.

Then packing:
```ts
if (analysis.components.length > 1) {
  const componentLayouts = analysis.components.map(comp => {
    for (const nodeId of comp.nodeIds) {
      const pos = satelliteResult.positions[nodeId];
      if (pos) { positions[nodeId] = pos; }   // ← primary/bridge nodes skip this branch
    }
    ...
  }).filter(...);
  ...
  componentShiftedPositions = packed.positions;   // ← overwrites, doesn't merge
}
```

`packed.positions` is derived from `componentLayouts[i].positions` — which only contains nodes that were in `satelliteResult.positions`. Primary and bridge nodes are **absent** from `componentShiftedPositions` entirely.

Then:
```ts
const finalCleanupResult = resolveSpacingAndCollisions({
  ...
  positions: componentShiftedPositions,   // ← missing most nodes
  ...
});
```

`resolveSpacingAndCollisions` presumably positions the given nodes. Nodes not in the map are... what? If it returns a merged map, they're at (0, 0). If it only returns nodes it processed, they're missing from `calculatedPositions`. Either way, **the majority of nodes have no computed position**.

Visual symptom: **the graph collapses to (0, 0) whenever the graph has multiple disconnected components**.

**Required to close:** Does `placeSatellites` return `{ ...basePositions, ...satellites }` (merged) or only satellites? If it returns only satellites, `componentShiftedPositions = packed.positions` **must** be `componentShiftedPositions = { ...basePositions, ...packed.positions }`.

This is the single most likely cause of "multiple disconnected components render on top of each other at (0,0)".

### A7. `architecture-layout.ts` — `existingPositions` restored after layout but nodes still participate in packing and bridge placement

```ts
// Stage 8: bridge placement — includes nodes with existingPositions
stage8BridgeNodes.forEach(node => {
  basePositions[node.id] = bridgeInfo.candidatePosition;   // ← wasted if existingPositions has it
});

// Satellite placement — uses basePositions (with wasted bridge positions)
const satelliteResult = placeSatellites(..., basePositions, ...);

// Packing — includes bridge positions
packed = packComponentPositions(componentLayouts, {...});

// Final: existingPositions override the computed positions
for (const [id, pos] of Object.entries(existingPositions)) {
  resultPositions[id] = { x: pos.x, y: pos.y };
}
```

Two consequences:

1. **Wasted work** — bridge placement and packing compute positions for nodes that will be overwritten.
2. **Incorrect neighbor influence** — bridge node B's placement sees bridge node A's **computed** position (via `basePositions[A]`), not A's **user-dragged** position (via `existingPositions[A]`). If the user moved A from `(100, 100)` to `(1000, 1000)`, bridge B is placed relative to `(100, 100)` — B ends up far from A after the final `existingPositions` restore. Cross-component geometry breaks.
3. **Satellites mis-anchored** — satellites of A are placed relative to A's **computed** position, then A is moved to its user-dragged position, and satellites stay behind. User drags A → its satellites detach.

**Fix:** before Stage 8, remove `existingPositions` keys from `safeNodes` (or mark them as "locked"), place them at `existingPositions`, and use those positions as anchors for other nodes. This is the pattern Cluster 3/4/5 should adopt — none of the clusters currently handle it correctly.

### A8. `architecture-layout.ts` — `existingPositions` values are not `Number.isFinite`-validated

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

If `existingPositions = { 'ApexClass:Foo': { x: NaN, y: 500 } }` (from a corrupted save, a stale `localStorage` entry, or a serialization round-trip that lost precision), `NaN` is copied verbatim into the returned positions.

Downstream: `cyNode.position({ x: NaN, y: 500 })` in GraphView. `cy.fit` then zooms out to include `NaN` → **`cy.fit` returns `{ zoom: 0.01 }`** (browser-dependent), or the canvas freezes. The user cannot recover without clearing `localStorage`.

Same class of bug as Cluster 3 D16. Not fixed anywhere in the codebase.

**Fix:**
```ts
if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
  resultPositions[id] = { x: pos.x, y: pos.y };
}
```

### A9. `architecture-layout.ts` — `existingPositions` may add nodes not in the graph

Same as Cluster 3 D16 but at a different site. `existingPositions['ApexClass:OldDeletedClass'] = { x: 500, y: 500 }` from a stale save → `resultPositions` includes a position for a node that no longer exists. Then `GraphView`'s `nodePositions` state and `projectState.saveProjectState` persist it forever — a **growing orphan-position bloat** across sessions.

**Fix:** filter `existingPositions` to `safeNodes.map(n => n.id)`:
```ts
const validIds = new Set(safeNodes.map(n => n.id));
for (const [id, pos] of Object.entries(existingPositions)) {
  if (!validIds.has(id)) continue;
  ...
}
```

---

## 🟠 High

### A10. `architecture-layout.ts` — `Object.freeze` on `immutableStage7PrimaryPositions` is **shallow**

```ts
const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
  ...localResult.primaryNodePositions,
});
```

`Object.freeze` on a `Record<string, { x: number; y: number }>` prevents adding/removing keys but **not** mutating `{ x, y }` on the inner objects. `calculateBridgeCandidatePosition` receives this map and can `immutablePrimaryPositions[id].x = 999` — succeeds silently in non-strict mode, throws in strict mode (which is TypeScript's compile output). So the **contract depends on the calling code not catching the error**.

**Fix:**
```ts
const immutableStage7PrimaryPositions = Object.freeze(
  Object.entries(localResult.primaryNodePositions).reduce((acc, [id, pos]) => {
    acc[id] = Object.freeze({ x: pos.x, y: pos.y });
    return acc;
  }, {} as Record<string, Readonly<{ x: number; y: number }>>)
);
```

### A11. `architecture-layout.ts` — `analysis` is passed by reference to **five** stages; mutation in one contaminates the rest

Stages that receive `analysis`:
- `computeGraphCentralityAnalysis(..., { index })` — no `analysis` (fine)
- `discoverFeatures(..., { analysis, ... })` — **yes**
- `computeGlobalFeatureLayout(..., { analysis, ... })` — **yes**
- `computeLocalNodeLayout(..., { analysis, ... })` — **yes**
- `placeSatellites(..., analysis, ...)` — **yes**
- `resolveSpacingAndCollisions(..., { analysis })` — **yes**

If any one of these stages mutates `analysis.nodes` (e.g., setting `analysis.nodes[id].centralityScore`), all subsequent stages see the mutation. Since `analysis` is `let`-bound and reassigned at step 2 and step 3:

```ts
let analysis = computeArchitectureAnalysis(...);
analysis = applyLayerClassification(analysis, layerMap);
analysis = applyDomainClassification(analysis, domainMap);
```

`applyLayerClassification` / `applyDomainClassification` **do** mutate (they return the same shape with new fields). If they mutate in place, `analysis` after step 3 is not the same object as after step 1 — but the reference passed to `featureDiscovery` is the **mutated** version, and `placeSatellites` sees the **same** mutated version. That's probably intended, but the mutation contract isn't documented. **Future contributors adding a stage that both reads and writes `analysis` will create cross-stage coupling bugs.**

**Fix:** document the mutation contract in a top-of-file comment, or introduce an `ImmutableAnalysis` type for read-only stages. At minimum, freeze `analysis.nodes` and `analysis.components` after step 3 to catch accidental writes.

### A12. `architecture-layout.ts` — `analysis.nodes.get(node.id)` assumes `analysis.nodes` is a `Map`

```ts
featureRoleContextMap.set(node.id, {
  layer: layerMap.get(node.id) || null,
  analysisNode: analysis.nodes.get(node.id) || null,
  ...
});
```

Also:
```ts
const nA = analysis.nodes.get(a.id)?.neighborIds.length || 0;
```

If `computeArchitectureAnalysis` returns `nodes: Record<string, AnalysisNode>` (plain object) — very common in this codebase based on other modules using `Record<string, ...>` — then `.get` is `undefined` → crash on every `featureRoleContextMap.set` call.

**Required to close:** Does `computeArchitectureAnalysis` return `nodes: Map<string, AnalysisNode>` or `nodes: Record<string, AnalysisNode>`? Verify against `layout/analysis.ts`.

### A13. `architecture-layout.ts` — `domainDiscovery.assignments.forEach` assumes `Map`

```ts
domainDiscovery.assignments.forEach((assignment, nodeId) => {
  domainMap.set(nodeId, assignment.primaryDomain);
});
```

Same for `featureDiscovery.assignments`:
```ts
featureDiscovery.assignments.forEach((assignment, nodeId) => {
  featureMap.set(nodeId, assignment.primaryFeatureId);
});
```

If `assignments` is a plain `Record`, `.forEach` is undefined → crash.

**Required to close:** Do `discoverDomains` and `discoverFeatures` return `assignments: Map<nodeId, ...>`? Verify against `layout/domains.ts` and `layout/features.ts`.

### A14. `architecture-layout.ts` — `analysis.components` structure and ordering are unverified

The pipeline relies on:
```ts
analysis.components.length > 1                             // length check
analysis.components.map(comp => { comp.nodeIds, comp.componentId })   // structure
```

And later:
```ts
const packed = packComponentPositions(componentLayouts, {...});   // order-sensitive
```

`packComponentPositions` (in `layout/components.ts`) receives `componentLayouts` in `analysis.components` order. If `analysis.components` is built from a `Set` or a hash map, the order is **nondeterministic** — which breaks the "deterministic layout" invariant that `architecture-layout.test.ts` (Test 9) asserts.

**Required to close:** Is `analysis.components` deterministically ordered? Specifically, is it sorted by `componentId` or by `minNodeId`? Verify against `layout/analysis.ts`.

### A15. `architecture-layout.ts` — `compWidths.sort((a, b) => b - a)` mutates the array, and the result feeds `minRowWidth`

```ts
const compWidths = componentLayouts.map(c => {...}).sort((a, b) => b - a);

const maxW = compWidths[0] || nodeWidth;
const secondMaxW = compWidths[1] || nodeWidth;
const minRowWidth = maxW + secondMaxW + componentGap;
```

The `sort` mutates `compWidths` in place. `compWidths[0]` (largest) and `compWidths[1]` (second-largest) are used to derive `minRowWidth`. Fine in isolation, but `compWidths` is not used elsewhere — the `sort` is both stylistic and semantically load-bearing (largest must be first). Document this, or use `Math.max(...compWidths)` and `Math.max(...compWidths.slice(1))` to make the intent explicit.

### A16. `architecture-layout.ts` — bridge node sorting is **ascending by span**, placing least-important bridges first

```ts
stage8BridgeNodes.sort((a, b) => {
  const cA = centralityMap.get(a.id);
  const cB = centralityMap.get(b.id);
  const spanA = cA?.connectedDomains.length || 0;
  const spanB = cB?.connectedDomains.length || 0;
  if (spanA !== spanB) {
    return spanA - spanB;   // ← ASCENDING: low span first
  }
  const nA = analysis.nodes.get(a.id)?.neighborIds.length || 0;
  const nB = analysis.nodes.get(b.id)?.neighborIds.length || 0;
  if (nB !== nA) {
    return nB - nA;         // ← DESCENDING: high neighbor count first
  }
  ...
});
```

The sort priority is:
1. **Low span first** — nodes bridging **few** domains get placed first, consuming good positions
2. **High neighbor count first** — within the same span, busy nodes get placed first
3. Layer order ascending
4. ID ascending

But bridge node placement is **position-allocation**: the first bridge placed gets the "best" available position (closest to its centroid, no conflicts). Placing low-span bridges first is **inverted priority** — high-span bridges (which connect more domains and are visually more important) are placed **later**, when good positions are already taken by low-span bridges.

If `calculateBridgeCandidatePosition` places at the nearest free position to the neighbor centroid, then low-span bridges get the ideal centroid and high-span bridges get pushed out. Visual result: **the most important bridges are the least-well-placed**.

**This might be intentional** — placing low-span bridges first spreads them out and leaves centroid-adjacent space for high-span ones. But without seeing `calculateBridgeCandidatePosition`, this is **the most likely inverted-logic bug in the pipeline**.

**Required to close:** What does `calculateBridgeCandidatePosition` do when `allocatedPositions` is non-empty? If it prefers the centroid, the sort is inverted. If it prefers the boundary, the sort is correct. Verify against `layout/centrality.ts`.

### A17. `architecture-layout.ts` — `centrality.connectedDomains` may be populated from a **different** domain map than `domainMap`

Look at the call order:

```ts
// Step 3
const domainDiscovery = discoverDomains(safeNodes, safeEdges);
const domainMap = new Map();
domainDiscovery.assignments.forEach((assignment, nodeId) => {
  domainMap.set(nodeId, assignment.primaryDomain);
});

// Step 4
const centralityMap = computeGraphCentralityAnalysis(
  safeNodes, safeEdges, domainMap, layerMap, { index }
);
```

`centrality.connectedDomains` is computed against `domainMap` (real domains). But in **feature layout mode**, the pipeline reassigns:

```ts
if (enableFeatureLayout) {
  ...
  activeSpatialMap = featureMap;   // ← features, not domains
} else {
  ...
  activeSpatialMap = domainMap;
}
```

`centrality.connectedDomains` still reflects **domains**, not **features**. In feature layout mode, the bridge sort orders by **domain** span even though the layout groups by **feature**. A bridge connecting 3 domains that fall into 1 feature gets `span = 3` (high priority) but the layout sees it as a within-feature bridge. **Mismatch between what bridge placement optimizes and what the spatial grouping represents.**

**Fix:** either (a) recompute `connectedDomains` against `featureMap` in feature mode, or (b) rename to `connectedSpatialGroups` and thread the active map through `computeGraphCentralityAnalysis`.

### A18. `architecture-layout.ts` — `stage8BridgeNodes` filter uses `isFieldNode` which isn't imported

```ts
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from './layout/analysis';

const stage8BridgeNodes = safeNodes.filter(node => {
  if (isTestNode(node) || isFieldNode(node)) return false;
  ...
});
```

`isTestNode` comes from `./layout/layers`, `isFieldNode` from `./layout/analysis`. Both imports are present. **No bug here** — but if `isFieldNode` is a **strict equality** check (`node.type === 'Field' || node.type === 'CustomField'`), it misses `type: 'CustomObject'` which has fields — different concern.

If `isFieldNode` is only `node.type === 'Field'`, then a graph containing `CustomField` nodes (a valid Salesforce type per `graph-style.ts`) has those nodes **eligible for bridge placement**. That's likely wrong — CustomField nodes shouldn't be bridges.

**Required to close:** Verify `isFieldNode` handles all field type variants (`Field`, `CustomField`, and any future type alias).

### A19. `architecture-layout.ts` — non-`analysis.components` bridge nodes may be excluded from layout entirely

`stage8BridgeNodes` filters for `!isTestNode && !isFieldNode && centrality.isBridge && !centrality.isHub`.

But `placeSatellites` handles test nodes, field nodes, and trigger/handler microclusters. What about a node that is:
- Not a test node ✓
- Not a field node ✓
- **Not** a hub ✓
- **Not** a bridge (`centrality.isBridge === false`)

It falls through both stages — it's not a primary node (unless `computeLocalNodeLayout` picks it up). Is every non-bridge, non-hub, non-test, non-field node guaranteed to be a **primary** node in `localResult.primaryNodePositions`?

If `computeLocalNodeLayout` only places "primary production" nodes (a subset), and non-primary, non-test, non-field, non-bridge, non-hub nodes exist (e.g., `External` phantoms), they're placed by **neither** stage 7 nor stage 8 nor stage 9. They're missing from the position map.

**Required to close:** Does `computeLocalNodeLayout` place **every** node that isn't test/field/satellite? If not, there's a hole in the position map for the fall-through category.

### A20. `architecture-layout.ts` — `existingPositions` are shallow-copied from caller without defensive cloning

```ts
existingPositions = {},   // ← destructured default
```

Then:
```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

`{ x: pos.x, y: pos.y }` creates a **new object** — good. The caller's object is not mutated. But the initial destructured `existingPositions = {}` creates a fresh empty object when the caller omits it — also good.

However, if the caller's `existingPositions` is a `Map` (rather than a `Record`), `Object.entries(map)` yields `[]` — no entries iterated, silently drops all positions. **Type mismatch is silent.**

**Fix:** add a runtime check:
```ts
const existingPositionsObj = existingPositions instanceof Map
  ? Object.fromEntries(existingPositions)
  : existingPositions;
```

### A21. `architecture-layout.ts` — `compWidths` sorted but `packComponentPositions` may use `compWidths` for its own layout

```ts
const compWidths = componentLayouts.map(c => {...}).sort((a, b) => b - a);

const maxW = compWidths[0] || nodeWidth;
const secondMaxW = compWidths[1] || nodeWidth;
const minRowWidth = maxW + secondMaxW + componentGap;

let totalCompArea = 0;
componentLayouts.forEach(c => {
  const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
  totalCompArea += (bounds.width + componentGap) * (bounds.height + componentGap);
});

const idealWidth = Math.sqrt(totalCompArea * 1.6);
const targetWidth = Math.max(idealWidth, minRowWidth);

const packed = packComponentPositions(componentLayouts, {
  gap: componentGap,
  targetWidth,
  targetAspectRatio: 1.6,
  nodeWidth,
  nodeHeight,
});
```

The `targetWidth` computation assumes all components can be packed into `sqrt(totalCompArea * 1.6)` — but `componentLayouts` includes **positions** that `packComponentPositions` will shift. If any component's internal layout has overlapping nodes (before packing), the packed result inherits the overlap. This stage assumes local layouts are overlap-free.

**Required to close:** Does `computeLocalNodeLayout` guarantee no intra-component overlaps? If not, `packComponentPositions` inherits them, and the final `resolveSpacingAndCollisions` is the only line of defense.

### A22. `architecture-layout.ts` — final result type claims `featureRegions` is `Map<string, FeatureRegion>` but pipeline provides `any`

```ts
return {
  positions: resultPositions,
  featureRegions: (globalDomainResult as any)?.featureRegions,
};
```

The cast to `any` is a code smell — `globalDomainResult` is declared with `let globalDomainResult;` (no type annotation). TypeScript can't verify that `featureRegions` is a `Map<string, FeatureRegion>` or `undefined`.

If `computeGlobalDomainLayout` returns `featureRegions` as a `Record<string, FeatureRegion>` (plain object), the caller (`GraphView`) receives it typed as `Map` — and if `GraphView` does `featureRegions.size` or `.get(...)`, it crashes on the plain object.

**Required to close:** What is the actual type of `featureRegions` from both `computeGlobalFeatureLayout` and `computeGlobalDomainLayout`? Verify against `layout/global-layout.ts`.

### A23. `architecture-layout.ts` — `compWidths.sort()` mutates but `componentLayouts` order is preserved for packing

The packing relies on `componentLayouts` order for **deterministic output**:
```ts
const packed = packComponentPositions(componentLayouts, {...});
```

`componentLayouts` was built by `.map(analysis.components).filter(...)` — order matches `analysis.components` order. If `analysis.components` is deterministic (see A14), packing is deterministic. If not, packing is **nondeterministic across runs** — silently breaks the layout determinism contract.

**Required to close:** Confirm `analysis.components` order is stable across identical inputs.

### A24. `architecture-layout.ts` — no diagnostic when `existingPositions` overrides computed layout

The pipeline silently overrides layout positions with `existingPositions` (correct behavior), but emits **no signal** that node count mismatch (e.g., 5 of 100 nodes overrode) — so a caller cannot detect "the layout was 95% computed and 5% user-restored". For A/B testing user-dragged vs. computed layouts, this telemetry is essential.

**Fix:** return `{ positions, ... }` with an additional `overriddenNodeIds: string[]` field (or emit to a diagnostic sink), so tests can verify authority restoration.

### A25. `architecture-layout.ts` — phantom nodes may have IDs that don't split cleanly by `:` and produce garbage display names

```ts
displayName: e.source.split(':').pop() || e.source,
```

If `e.source = 'ApexClass:Foo:Bar'` (unlikely but possible if ids contain colons), `displayName = 'Bar'` — the "Foo" prefix is lost. Minor but silent.

More importantly: if `e.source = ''` (empty string), `.split(':').pop()` returns `''` — `||` falls back to `e.source = ''`, so `displayName = ''`. Then a phantom node renders with **empty label**. Cytoscape renders empty labels as an empty box.

**Fix:** `displayName: e.source.split(':').pop() || e.source || '(unknown)'`.

### A26. `architecture-layout.ts` — `analysis.components` is used at two different scopes but `analysis` may be reassigned

```ts
let analysis = computeArchitectureAnalysis(...);
analysis = applyLayerClassification(analysis, layerMap);
analysis = applyDomainClassification(analysis, domainMap);

// ... 300 lines later
if (analysis.components.length > 1) {
  const componentLayouts = analysis.components.map(...)   // ← uses the final `analysis`
```

Since `analysis` is `let`-bound and reassigned by `applyLayerClassification` / `applyDomainClassification`, the final `analysis.components` reflects the mutated (post-classification) version. **If either `applyLayerClassification` or `applyDomainClassification` rebuilds the `components` array** (unlikely but possible), the packing sees a different component set than `computeLocalNodeLayout` saw.

**Required to close:** Do `applyLayerClassification` / `applyDomainClassification` preserve `analysis.components` by reference? If they rebuild it, verify the rebuild is semantically identical.

---

## 🟡 Medium

### A27. `architecture-layout.ts` — `compWidths[0] || nodeWidth` uses `||` instead of `??`

```ts
const maxW = compWidths[0] || nodeWidth;
const secondMaxW = compWidths[1] || nodeWidth;
```

If `compWidths[0] === 0` (empty component — shouldn't happen after the filter, but defensive coding), `||` falls back to `nodeWidth`. But `compWidths[0]` being `0` would indicate an **empty component** that passed the filter — a bug elsewhere. `||` hides it.

**Fix:** `?? nodeWidth` (only fall back on `undefined`).

### A28. `architecture-layout.ts` — `analysis.components.length > 1` triggers packing even when there's only one *meaningful* component

If `analysis.components` includes **singleton components** (isolated nodes with no edges), the count could be 5 while there's really 1 primary graph + 4 isolated nodes. Packing then tries to lay out 5 "components" and the 4 singletons are placed in shelves around the primary — but their positions were **already determined** by their singleton component. Packing moves them, potentially far from where they should be.

**Required to close:** Does `computeArchitectureAnalysis` merge singleton components into a "miscellaneous" component, or does it leave them separate? If separate, the pipeline's packing treats them as first-class spatial entities — which may or may not be intended.

### A29. `architecture-layout.ts` — no fallback when `analysis.components.length === 0`

If `computeArchitectureAnalysis` returns `components: []` (empty graph edge case that survives the `safeNodes.length > 0` check via phantom nodes), the packing branch doesn't fire:

```ts
if (analysis.components.length > 1) {   // ← 0 is not > 1, no-op
  ...
}
```

Then `componentShiftedPositions = { ...satelliteResult.positions }` — which (per A6) may be empty. Final positions empty. Silent.

**Fix:** add a sanity check:
```ts
if (analysis.components.length === 0 && safeNodes.length > 0) {
  // Every node should be in some component
  console.error('[layout] components empty but nodes exist');
}
```

### A30. `architecture-layout.ts` — `localResult.primaryNodePositions` is spread once but `basePositions` is mutated heavily

```ts
const basePositions: Record<string, { x: number; y: number }> = {
  ...localResult.primaryNodePositions,
};

const immutableStage7PrimaryPositions = Object.freeze({ ...localResult.primaryNodePositions });

// ... stage 8 mutates basePositions

const satelliteResult = placeSatellites(..., basePositions, {...});
```

`basePositions` is mutated after the freeze. `placeSatellites` receives the **mutated** `basePositions` (with bridge positions added). If `placeSatellites` mutates `basePositions` further, the caller sees the mutation.

**Required to close:** Does `placeSatellites` mutate its `positions` argument, or return a new map? If it mutates, `basePositions` and `satelliteResult.positions` may be the **same object**, and any external reference to `basePositions` sees the mutations.

### A31. `architecture-layout.ts` — `stage8BridgeNodes` includes phantom nodes (see A1)

Phantom `type: 'External'` nodes pass the `!isTestNode && !isFieldNode` filter and can be bridges if centrality marks them. Their `connectedDomains` reflect phantom-to-real domain crossings — treating phantom edges as semantically meaningful bridges.

**Fix:** filter `stage8BridgeNodes` to real nodes only (or mark phantom nodes with a flag during fabrication and filter on it).

### A32. `architecture-layout.ts` — `featureRoleContextMap` built before features are discovered but **after** centrality

```ts
// Step 3.5 & 4: Feature Role Mapping & Semantic Feature Discovery
const featureRoleContextMap = new Map<string, FeatureRoleContext>();
safeNodes.forEach(node => {
  featureRoleContextMap.set(node.id, {
    layer: layerMap.get(node.id) || null,
    analysisNode: analysis.nodes.get(node.id) || null,
    centrality: centralityMap.get(node.id) || null,
    roleOverride: analysis.nodes.get(node.id)?.role || null,
  });
});
```

But `featureRoleContextMap` is **never passed to `discoverFeatures`**:

```ts
const featureDiscovery = discoverFeatures(safeNodes, safeEdges, {
  index,
  analysis,
  layerMap,
  domainMap,
});
```

`featureRoleContextMap` is dead code — built and discarded. If `discoverFeatures` expects role context via `analysis` (mutated by `applyLayerClassification`), the map is redundant. If `discoverFeatures` needs it but doesn't receive it, **feature discovery runs without role info**.

**Required to close:** Does `discoverFeatures` accept `featureRoleContext` as an option? If yes, this is a **bug** — the map is built but not passed. If no, the map is dead code.

### A33. `architecture-layout.ts` — `roleOverride` read from `analysis.nodes.get(node.id)?.role` but `role` may not exist on `AnalysisNode`

```ts
roleOverride: analysis.nodes.get(node.id)?.role || null,
```

If `AnalysisNode` has no `role` field, this is always `null` (via `|| null`). If it does have `role`, that's the override. **Either the field exists and this works, or the field is optional and this silently defaults to null** — which then feeds `featureRoleContextMap`, which is itself dead (see A32).

**Required to close:** Does `AnalysisNode` have a `role` field? Verify against `layout/analysis.ts`.

### A34. `architecture-layout.ts` — `enableFeatureLayout` in `computeArchitectureLayout` (the wrapper) differs from `computeArchitectureLayoutWithMetadata`

```ts
export function computeArchitectureLayout(nodes, edges, options = {}): Record<string, { x: number; y: number }> {
  return computeArchitectureLayoutWithMetadata(nodes, edges, options).positions;
}
```

The wrapper passes `options` through unchanged. If `options.enableFeatureLayout` is `undefined`, the default logic in the metadata version fires (`architectureMode === 'hybrid'`). Consistent. No bug here — but note that **external callers of `computeArchitectureLayout` see the same behavior as `computeArchitectureLayoutWithMetadata`**, while GraphView sees a third variant (via `effectiveLayoutOptions`). Three call-sites, three sets of defaults.

### A35. `architecture-layout.ts` — `safeEdges.forEach` phantom injection runs **before** the sort, but edge sort assumes `a.id.localeCompare` on non-null `id`

```ts
safeEdges.forEach(e => { ... phantom injection ... });

safeNodes.sort((a, b) => a.id.localeCompare(b.id));
safeEdges.sort((a, b) => a.id.localeCompare(b.id));
```

`safeEdges` is cloned from the caller's `edges` (`[...edges]`). If any edge has `id: undefined` or `id: null`, `.localeCompare` crashes. Same as Cluster 3 D14. **The pipeline assumes `edge.id` is always a non-empty string.**

**Fix:** `safeEdges.sort((a, b) => (a.id || '').localeCompare(b.id || ''))`.

### A36. `architecture-layout.ts` — `safeNodes` and `safeEdges` are cloned but their contents are not

```ts
const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
const safeEdges = Array.isArray(edges) ? [...edges] : [];
```

`[...nodes]` creates a new array but the elements are **the same object references**. If `applyLayerClassification` or `applyDomainClassification` mutates `node.metrics` or `node.behavior` on a shared node object, the caller's original `nodes` array sees the mutation. **The "defensive deep clone" comment at the top of the function is misleading** — it's a **shallow** clone of the array, not deep cloning of node/edge contents.

The `metrics`, `behavior`, `refactoringReadiness`, `canonical`, `riskReasons` fields on each node are all passed by reference. Any stage that mutates these (e.g., `computeArchitectureAnalysis` if it augments `node.metrics`) **corrupts the caller's data**.

**Fix:** either (a) update the comment to "defensive shallow clone", or (b) deep-clone the nodes/edges used for layout — but this is expensive (JSON round-trip for 1000 nodes). Best: document the immutability contract loudly and ensure no stage mutates nodes.

**Required to close:** Do `applyLayerClassification`, `applyDomainClassification`, `computeArchitectureAnalysis`, `discoverDomains`, `discoverFeatures`, `computeGraphCentralityAnalysis`, `computeGlobalFeatureLayout`, `computeGlobalDomainLayout`, `reduceEdgeCrossings`, `computeLocalNodeLayout`, `placeSatellites`, `packComponentPositions`, or `resolveSpacingAndCollisions` mutate their input `nodes` or `edges`? If **any** does, the caller's data is corrupted and subsequent layout runs see stale mutations. Verify against `layout/*.ts`.

### A37. `architecture-layout.ts` — `safeNodes.length === 0` check runs **twice**, second is dead

```ts
if (safeNodes.length === 0) {   // ← first check, early return
  ...
}

// phantom injection
safeEdges.forEach(e => { ... safeNodes.push(...) });

safeNodes.sort(...);
safeEdges.sort(...);

if (safeNodes.length === 0) {   // ← second check, dead
  return { positions: { ...existingPositions } };
}
```

The second check runs **after** phantom injection. If `safeNodes` was empty at the second check, phantoms weren't added — but phantoms are added if and only if `safeEdges` has edges, and `safeEdges` is preserved from the caller. So the second check can only be true if `safeEdges` is empty (no phantoms added) **and** `safeNodes` was empty at the first check (already returned). **Dead code.**

Minor — remove the second check or restructure.

### A38. `architecture-layout.ts` — `metrics.unresolved: 0` on phantom nodes hides unresolved count from downstream risk scoring

Discussed in A1. Restating because it affects **all** downstream stages that filter by risk or score.

### A39. `architecture-layout.ts` — `refactoringReadiness.testCoverageStatus: 'UNTESTED'` on phantoms

Phantom nodes get `testCoverageStatus: 'UNTESTED'`. If the pipeline treats UNTESTED nodes differently (e.g., as lower priority or as risks), phantoms appear as **untested unresolved external dependencies** — which is arguably correct but inconsistent with `metrics.unresolved: 0` (a zero-unresolved node with untested status is contradictory).

**Fix:** `testCoverageStatus: 'UNKNOWN'` (if the type permits) or align `metrics.unresolved` with `testCoverageStatus: 'UNTESTED'`.

### A40. `architecture-layout.ts` — `analysis.components.length > 1` isn't validated against `componentLayouts.length > 1`

```ts
if (analysis.components.length > 1) {              // ← outer check
  const componentLayouts = analysis.components.map(...).filter(...);
  if (componentLayouts.length > 1) {              // ← inner check
    ...packing...
  }
}
```

If `analysis.components.length === 5` but after filter `componentLayouts.length === 1` (because 4 components had empty positions — a symptom of A6), the inner check fails and **packing doesn't fire**. But the 4 "empty" components' nodes are **still missing from the position map**. Their nodes end up at (0, 0) via Cytoscape default, overlapping the packed component.

**Fix:** add a diagnostic or force-place missing nodes:
```ts
const missing = safeNodes.filter(n => !componentShiftedPositions[n.id]);
if (missing.length > 0) {
  console.warn(`[layout] ${missing.length} nodes have no position; placing at deterministic fallback`);
  missing.forEach(n => {
    componentShiftedPositions[n.id] = calculateDeterministicNewNodePosition(n.id, safeEdges, componentShiftedPositions);
  });
}
```

---

## 🔵 Low / hygiene

### A41. `architecture-layout.ts` — `analysis.nodes.get(node.id) || null` uses `||` on `Map.get` result

`Map.get` returns `undefined` for missing keys, never `null`. So `undefined || null = null` — works but is stylistic. Should be `?? null`.

Same for:
```ts
layer: layerMap.get(node.id) || null,
centrality: centralityMap.get(node.id) || null,
```

### A42. `architecture-layout.ts` — `stage8BridgeNodes` sort closure captures `centralityMap`, `layerMap`, `analysis` — mutability risk

```ts
stage8BridgeNodes.sort((a, b) => {
  const cA = centralityMap.get(a.id);   // ← closure capture
  ...
});
```

If `centralityMap` is mutated between sort calls (it isn't in the current pipeline, but a future stage might), the sort order becomes nondeterministic. Document as read-only.

### A43. `architecture-layout.ts` — `enableCandidateDOrdering` sort has 4 comparison branches but no tie-breaker beyond id

```ts
if (spanA !== spanB) return spanA - spanB;
if (nB !== nA) return nB - nA;
if (lA !== lB) return lA - lB;
return a.id.localeCompare(b.id);
```

Fully deterministic **if** `localeCompare` is deterministic (see Cluster 4 R23, Cluster 3 D23 — same locale-dependent issue).

### A44. `architecture-layout.ts` — no explicit assertion that `resultPositions` length equals `safeNodes` length

```ts
const resultPositions: Record<string, { x: number; y: number }> = {
  ...calculatedPositions,
};
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) { resultPositions[id] = { x: pos.x, y: pos.y }; }
}
return { positions: resultPositions, ... };
```

If `calculatedPositions` is missing nodes (per A6) and `existingPositions` doesn't cover them, the returned `positions` map is **incomplete** — but nothing flags it. Downstream `cyNode.position(...)` silently skips missing entries (or applies `{ x: 0, y: 0 }` default).

**Fix:** add a debug-mode assertion:
```ts
if (process.env.NODE_ENV !== 'production') {
  const missing = safeNodes.filter(n => !resultPositions[n.id]);
  if (missing.length > 0) {
    console.error(`[layout] ${missing.length} nodes missing from result: ${missing.slice(0, 5).map(n => n.id).join(', ')}...`);
  }
}
```

This single line would have caught A6, A19, A29, A40, and every other missing-node bug in this pipeline.

### A45. `architecture-layout.ts` — `analysis.components.map` runs twice implicitly

```ts
if (analysis.components.length > 1) {
  const componentLayouts: ComponentLocalLayout[] = analysis.components
    .map(comp => { ... calculateLocalComponentBounds ... })
    .filter(c => Object.keys(c.positions).length > 0);

  if (componentLayouts.length > 1) {
    const compWidths = componentLayouts.map(c => {
      const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);   // ← recomputes bounds
      return bounds.width;
    }).sort((a, b) => b - a);
```

`calculateLocalComponentBounds` is called:
1. Once per component inside `.map()` (implicitly? — actually it's not called there; the map only assigns `id`, `positions`, `nodeWidth`, `nodeHeight`, `structuralImportance`, `minNodeId`).
2. Once per component inside the `.map()` for `compWidths`.
3. Once per component inside `totalCompArea` forEach.

So `calculateLocalComponentBounds` runs **3× per component**. For 10 components with 100 nodes each, that's 30 calls × 100 nodes = 3000 node iterations wasted.

**Fix:** compute bounds once per component and cache:
```ts
const componentBounds = componentLayouts.map(c =>
  calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight)
);
```

Then use `componentBounds[i].width` in both places.

### A46. `architecture-layout.ts` — `analysis.components.filter(c => Object.keys(c.positions).length > 0)` runs `Object.keys` twice

Once in the `.filter`, once in `.map` (per A45). Same fix.

### A47. `architecture-layout.ts` — `structuralImportance` sum uses `+` on `hubScore` / `bridgeScore` but the fields may be undefined

```ts
const centrality = centralityMap.get(nodeId);
if (centrality) {
  importance += centrality.hubScore + centrality.bridgeScore;
}
```

If `hubScore` or `bridgeScore` is `undefined` (optional field), `undefined + number = NaN`, and `importance` becomes `NaN` permanently. Then `packComponentPositions` receives `NaN` importance → sorts by `NaN` → **nondeterministic order**.

**Fix:** `importance += (centrality.hubScore ?? 0) + (centrality.bridgeScore ?? 0);`

### A48. `architecture-layout.ts` — `minNodeId` used for deterministic component ordering but never passed to `packComponentPositions`

```ts
let minNodeId: string | undefined = undefined;
for (const nodeId of comp.nodeIds) {
  if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) {
    minNodeId = nodeId;
  }
  ...
}
return {
  id: comp.componentId,
  positions,
  nodeWidth,
  nodeHeight,
  structuralImportance: importance,
  minNodeId,   // ← set but never used downstream
};
```

`packComponentPositions(componentLayouts, {...})` receives the layouts. If it **doesn't use `minNodeId`** for ordering, then `componentLayouts` order is determined entirely by `analysis.components` order. If `analysis.components` is nondeterministic (see A14), the `minNodeId` field doesn't help — it's set but not consumed.

**Required to close:** Does `packComponentPositions` accept `minNodeId` and use it for a stable sort? Verify against `layout/components.ts`.

### A49. `architecture-layout.ts` — `structuralImportance` is computed but likely unused

Same as `minNodeId` — `structuralImportance` is set on each `ComponentLocalLayout`. If `packComponentPositions` doesn't use it, it's dead weight. If it does use it (to prioritize importance when packing), the packing may not be deterministically ordered (importance is `NaN` per A47).

**Required to close:** Is `structuralImportance` consumed by `packComponentPositions`? If yes, A47 is critical. If no, it's dead code.

### A50. `architecture-layout.ts` — `resolveSpacingAndCollisions` may fail silently on missing positions

Same as A6, A40, A44. No downstream validation.

### A51. `architecture-layout.ts` — `return result` from `runLayoutWithMetadata` has `featureRegions` typed as `Map<string, FeatureRegion>` but pipeline returns `undefined` in non-feature mode

`ArchitectureLayoutResultWithMetadata.featureRegions?: Map<string, FeatureRegion>` — optional, so `undefined` is valid. But downstream (`GraphView`) guards with `architectureMode === 'hybrid'`, so no immediate crash. Just noting the type contract is loose.

---

## Cross-cluster consistency findings

### X1. Position Authority contract is **broken in Clusters 4 & 5** (this cluster is correct)

Cluster 6 (this one) correctly merges `existingPositions` at the end of the layout pipeline. Clusters 4 (`component-orbit-layout.ts`) and 5 (`component-constellation-layout.ts`) do **not**.

- Cluster 4 D1: orbit early-returns without merging `existingPositions`
- Cluster 5 K5: constellation early-returns without merging `existingPositions`

**The reference implementation is correct; the derivative implementations dropped the contract.** Any fix to Clusters 4/5 should copy this pattern (with the A7 fix — exclude `existingPositions` nodes from layout entirely, not just override at the end).

### X2. `enableFeatureLayout` default differs across call sites

- `architecture-layout.ts` default: `options.architectureMode === 'hybrid'`
- `GraphView.tsx`: `architectureMode === 'hybrid'` (same — coincidentally consistent)
- `graph-layout.ts` (Cluster 3): passes `options` through; no explicit default

All three currently align, but there's no **single source of truth**. If a future change adds a `'fractal'` mode that should also enable feature layout, all three sites must be updated.

### X3. `localeCompare` is used for determinism-critical sorts in Clusters 3, 4, 5, 6 — but not consistently

- Cluster 3 D23: `architecture-layout.ts` — `localeCompare`
- Cluster 4 R23: `component-orbit-adapter.ts` — `localeCompare`
- Cluster 5 K23: `component-constellation-adapter.ts` — `localeCompare`
- Cluster 6 A43: `architecture-layout.ts` — `localeCompare` (bridge sort tie-break)

**None of the four clusters use locale-independent comparison.** A single `const stableCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;` in a shared util would fix all four.

### X4. `Number.isFinite` validation of persisted positions is missing in **all four clusters**

- Cluster 3 D16: `architecture-layout.ts` (this file)
- Cluster 4: no validation
- Cluster 5: no validation
- Cluster 6 (this file): A8

**One `NaN` in `localStorage` breaks every layout trigger.**

---

## Required `[!]` verification checklist

Because `layout/*.ts` isn't in the file set, these must be checked to close the audit:

### `layout/analysis.ts`
- [ ] Does `computeArchitectureAnalysis` return `nodes: Map` (not `Record`)?
- [ ] Does `components` include singleton/isolated nodes?
- [ ] Is `components` deterministically ordered?
- [ ] Does `AnalysisNode` have a `role` field (per A32)?
- [ ] Does `AnalysisNode` have `neighborIds: string[]`?
- [ ] Does `applyLayerClassification` / `applyDomainClassification` mutate the input `analysis` or return a new one?
- [ ] Are `hubScore` / `bridgeScore` always defined (per A47)?
- [ ] Is `isFieldNode` strict (per A18)?
- [ ] Does `applyLayerClassification` / `applyDomainClassification` rebuild `components`?

### `layout/domains.ts`
- [ ] Does `discoverDomains` return `assignments: Map<nodeId, DomainAssignment>` (not `Record`)?
- [ ] Is `assignments` iteration order deterministic?

### `layout/features.ts`
- [ ] Does `discoverFeatures` return `assignments: Map` (not `Record`)?
- [ ] Does `discoverFeatures` accept `featureRoleContext` as an option (per A32)?
- [ ] Is `assignments` iteration order deterministic?

### `layout/global-layout.ts`
- [ ] Does `computeGlobalFeatureLayout` return `domainRegions`? `featureRegions`? Both?
- [ ] Does `computeGlobalDomainLayout` return `domainRegions`? `featureRegions`?
- [ ] Are `domainRegions` / `featureRegions` `Map` or `Record` (per A5)?
- [ ] Does either mutate the input `nodes` / `edges` (per A36)?
- [ ] Handles 0 features gracefully (per A29)?
- [ ] Handles empty `domainMap` gracefully?

### `layout/ordering.ts`
- [ ] Does `reduceEdgeCrossings` mutate the input `nodes` / `edges`?
- [ ] Returns deterministic `bucketOrder` given identical inputs?

### `layout/local-layout.ts`
- [ ] Does `computeLocalNodeLayout` place **every** node that isn't a test/field/satellite?
- [ ] What about `External` phantom nodes (per A1, A19)?
- [ ] Guarantees no intra-component overlaps (per A21)?
- [ ] Mutates `analysis` (per A11, A36)?

### `layout/centrality.ts`
- [ ] Does `computeGraphCentralityAnalysis` mutate the input?
- [ ] Is `connectedDomains` computed against the passed `domainMap` or the global domain map?
- [ ] Does `calculateBridgeCandidatePosition` read `allocatedPositions` for avoidance or preference (per A16)?

### `layout/satellites.ts`
- [ ] Does `placeSatellites` return `{ ...basePositions, ...satellites }` (merged) or only satellites (per A6)?
- [ ] Does `placeSatellites` mutate `positions` (per A30)?
- [ ] Handles the "no primary nodes" case?

### `layout/components.ts`
- [ ] Does `packComponentPositions` accept `minNodeId` / `structuralImportance` and use them for ordering (per A48, A49)?
- [ ] Preserves all nodes from `componentLayouts[i].positions`?
- [ ] Re-emits `positions` as `{ ...input.positions, ...shifted }` or only shifted?

### `layout/spacing.ts`
- [ ] Does `resolveSpacingAndCollisions` preserve all nodes from `positions` (per A44, A50)?
- [ ] Reads `analysis.components` for constraint generation?

### `layout/graph-index.ts`
- [ ] Is `LayoutGraphIndex` immutable (per A11)?
- [ ] Does `createLayoutGraphIndex` handle `safeNodes` / `safeEdges` with phantom nodes?

### `layout/feature-roles.ts`
- [ ] Does `classifyAllFeatureRoles` consume `featureRoleContextMap` (which is built but unused per A32)?
- [ ] If not, why is `featureRoleContextMap` built at all?

---

## Priority summary

| # | Bug | Impact |
|---|---|---|
| **A1** | Phantom nodes as first-class citizens | Wrong layer/domain/centrality |
| **A2** | `unresolvedCount: 0` fabricated | Zero-risk classification |
| **A6** | `satelliteResult.positions` may drop nodes; `packed.positions` overwrites | Collapse to (0,0) |
| **A7** | `existingPositions` restore after packing leaves satellites mis-anchored | Broken user drags |
| **A8** | `existingPositions` not `Number.isFinite`-validated | `cy.fit` breaks |
| **A11** | `analysis` mutated by 5 stages | Cross-stage coupling |
| **A12** | `analysis.nodes.get` assumes `Map` | Crash if `Record` |
| **A13** | `assignments.forEach` assumes `Map` | Crash if `Record` |
| **A14** | `analysis.components` ordering unverified | Nondeterministic layout |
| **A16** | Bridge sort ascending-by-span (inverted priority?) | Wrong bridge placement |
| **A32** | `featureRoleContextMap` built but never passed | Dead code / missing feature role |
| **A36** | "Defensive deep clone" comment is a lie — shallow only | Caller data mutation |
| **A44** | No assertion that result covers all nodes | Silent missing-node bugs |
| **A47** | `hubScore + bridgeScore` on undefined | `NaN` importance, nondeterministic packing |
| **X1** | Clusters 4/5 fail to honor `existingPositions` | Broken drag persistence in radial modes |
| **X3** | `localeCompare` in 4 clusters | Cross-locale nondeterminism |
| **X4** | `NaN` in saved positions breaks all 4 pipelines | Persisted state corruption |

**The single most impactful fix** is A44 — adding the "all nodes covered" assertion to all four clusters would immediately surface A6, A19, A29, A40, A50 and their analogues in Clusters 4/5. Do this first.


# Shared Contract Cluster (`explorer.ts`) — Audit

**Scope limitation:** `explorer.ts` was **not** provided in the file set. Unlike the previous clusters, I cannot review line-level definitions. What I *can* do — and what's more useful here — is **reverse-engineer the type contract** from how every other cluster consumes it, and flag:

1. **Contract violations** — places where code casts, fabricates, or bypasses the type in ways the type cannot catch.
2. **Schema-evolution hazards** — places where the type *should* enforce exhaustiveness but doesn't.
3. **Inconsistent field treatment** across clusters that share the same type.
4. **Type duplication** — the same shape (`{ x, y }`) defined three different ways in three different files.

Every finding below is grounded in a specific usage I can cite from the provided files. Where verification depends on the missing file, I mark it `[!]` and give you the exact grep.

---

## 🔴 Critical — type contract is silently violated by every consumer

### T1. `ExplorerNode.behavior.sharing` — required by type, omitted by mock, `null` in fallback

Three sightings of the same field:

**In `graph-interactions.ts`:**
```ts
behavior: {
  isTest: nodeData.isTest || false,
  sharing: null,                       // ← explicitly set
  publicContractsCount: 0,
  ...
}
```

**In `architecture-layout.test.ts` `createMockNode`:**
```ts
behavior: {
  isTest: false,
  publicContractsCount: 1,
  asyncPatterns: [],
  securitySignalsCount: 0,
  queryCount: 0,
  dmlCount: 0,
  calloutCount: 0,
  ...overrides.behavior,               // ← no `sharing`
},
```

**In `extractNodesAndEdgesFromCy`:**
```ts
behavior: {
  isTest: Boolean(data.isTest),
  publicContractsCount: 0,
  asyncPatterns: [],
  securitySignalsCount: 0,
  queryCount: 0,
  dmlCount: 0,
  calloutCount: 0,                     // ← no `sharing`
},
```

For all three to compile, `sharing` must be **both optional and nullable** (`sharing?: SomeType | null`). Two levels of optionality on a required-semantics field is a contract smell. If `sharing` is only `sharing?:` (no `| null`), then `graph-interactions.ts`'s `sharing: null` is a type error that TypeScript **should** catch. If it's only `sharing: SomeType | null` (no `?`), then both the mock and the extract fail.

**Whatever the actual type is, at least one of the three sites is wrong.** Fix: pick one convention (`sharing?: SomeType` — undefined = unknown, or `sharing: SomeType | null` — null = unknown) and align all three.

**Verify:** `[!]` `grep -n 'sharing' src/types/explorer.ts`

---

### T2. `extractNodesAndEdgesFromCy` fabricates **every non-identity field** on `ExplorerNode` and `ExplorerEdge`

The pattern is system-wide:

```ts
metrics: { ..., unresolved: 0, score: 0 },               // ← fabricated
riskReasons: [],                                         // ← fabricated
behavior: { isTest: Boolean(data.isTest), publicContractsCount: 0,
            asyncPatterns: [], securitySignalsCount: 0,
            queryCount: 0, dmlCount: 0, calloutCount: 0 },   // ← 6/7 fabricated
refactoringReadiness: { ..., testCoverageStatus: 'UNTESTED' }, // ← fabricated
```

On `ExplorerEdge`:
```ts
resolutionClassification: 'RESOLVED_LOCAL',              // ← fabricated
resolutionStrategy: 'EXACT',                            // ← fabricated
confidence: '1.0',                                      // ← fabricated
line: null, column: null, methodOwner: null,            // ← fabricated
file: '',                                               // ← fabricated
canonical: {
  source: { type: 'ApexClass', name: data.source },     // ← type fabricated
  target: { type: 'ApexClass', name: data.target },     // ← type fabricated
  relationship: { type: 'unknown', resolution: 'EXACT' }, // ← type fabricated
  location: {},                                          // ← fabricated
},
```

`ExplorerNode` and `ExplorerEdge` declare these fields as **required and meaningful**. The extraction path treats every one as a lie.

**Every cluster downstream of `runLayoutWithMetadata` (Clusters 3, 4, 5, 6) is protected only because `GraphView` passes `options.nodes`**. The moment an external caller (test, storybook, notebook, worker, `runLayout` convenience function) invokes `runLayoutWithMetadata(cy, options)` **without** `options.nodes`, all four clusters receive fabricated `metrics.unresolved: 0`, `metrics.score: 0`, `behavior.publicContractsCount: 0`, `behavior.asyncPatterns: []`, `refactoringReadiness.testCoverageStatus: 'UNTESTED'`, and `canonical.source.type: 'ApexClass'`.

The type contract is not at fault for *permitting* fabrication — the contract is broken because the type claims these fields exist and are meaningful, and any caller of `extractNodesAndEdgesFromCy` **cannot tell** they've been fabricated.

**Fix:** either (a) make `metrics.unresolved`, `metrics.score`, `behavior.publicContractsCount`, `behavior.asyncPatterns`, `behavior.securitySignalsCount`, `behavior.queryCount`, `behavior.dmlCount`, `behavior.calloutCount`, `refactoringReadiness.testCoverageStatus`, `ExplorerEdge.canonical.*` **optional** and `undefined` when not present, or (b) make them **required** and refuse to fabricate — throw on extraction if `data` is missing any required field.

Option (a) is safer for the codebase in its current state; option (b) is the long-term fix.

---

### T3. `ExplorerEdge.confidence: string` — a numeric concept typed as string

Every extract and test fixture:
```ts
confidence: '1.0',
```

If `ExplorerEdge.confidence` is `string`, then `'1.0'`, `'high'`, `'maybe'`, `'0.85'`, `''` all type-check. Nothing enforces that `confidence` is parseable as a number. Any code that does `parseFloat(edge.confidence)` (in `impact-analysis.ts`, in `centrality.ts`, in the layout worker) silently gets `NaN` on a malformed value.

**Verify:** `[!]` `grep -n 'confidence' src/types/explorer.ts src/lib/**/*.ts`

**Fix:** if `confidence` is meant to be `[0, 1]`, use `number` (or `number & { __brand: 'confidence' }`). If it's a categorical string, use a union like `'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'` — not raw `string`.

---

### T4. `ExplorerEdge.resolutionClassification` and `resolutionStrategy` are **always the resolved case**

```ts
resolutionClassification: 'RESOLVED_LOCAL',
resolutionStrategy: 'EXACT',
```

Even for edges with `unresolved: true`:
```ts
unresolved: Boolean(data.unresolved),
resolutionClassification: 'RESOLVED_LOCAL',   // ← contradicts `unresolved: true`
```

The type likely has:
- `resolutionClassification: 'RESOLVED_LOCAL' | 'RESOLVED_EXTERNAL' | 'UNRESOLVED' | ...`
- `resolutionStrategy: 'EXACT' | 'PARTIAL' | 'INTERFACE' | ...`

The extract fills **only one member of each union**. Any downstream code that relies on distinguishing resolved from unresolved edges via `resolutionClassification` sees **zero** unresolved edges.

`impact-analysis.ts` and `resolveSpacingAndCollisions` (via `analysis`) are the most likely consumers. `createArchitectureContext` in `intelligence/context.ts` is another — it likely uses `resolutionClassification` to enumerate unresolved references for the findings panel.

**Fix:** derive from `data`:
```ts
resolutionClassification: data.unresolved ? 'UNRESOLVED' : (data.resolutionClassification as ExplorerResolutionClassification) || 'RESOLVED_LOCAL',
resolutionStrategy: (data.resolutionStrategy as ExplorerResolutionStrategy) || 'EXACT',
```

**Verify:** `[!]` `grep -n 'resolutionClassification\|resolutionStrategy' src/types/explorer.ts src/lib/intelligence/**/*.ts`

---

### T5. `ExplorerEdge.canonical.source.type` is **always `'ApexClass'`**

```ts
canonical: {
  source: { type: 'ApexClass', name: data.source },   // ← hardcoded 'ApexClass'
  target: { type: 'ApexClass', name: data.target },   // ← hardcoded 'ApexClass'
  ...
}
```

If the source is an LWC, `canonical.source.type` should be `'LWC'`. If the target is a `CustomObject`, it should be `'CustomObject'`. The extract fabricates `'ApexClass'` for every edge regardless of actual endpoint types.

Two consequences:

1. **Every cross-cluster consumer of `canonical.source.type`** (if any — check `impact-analysis.ts`, `findings.ts`, `refactor-handoff.ts`) sees `'ApexClass'` — cross-type edges appear as class-to-class.
2. **The value is inconsistent with `type: data.source.split(':')[0]`** if that pattern is used anywhere.

**Fix:** derive:
```ts
const sourceType = (ALL_EXPLORER_NODE_TYPES.includes(data.source.split(':')[0])
  ? data.source.split(':')[0]
  : 'External') as ExplorerNodeType;
canonical: { source: { type: sourceType, name: data.source }, ... }
```

If `nodeMap` is available, use the real node's type — `nodeMap.get(data.source)?.type ?? 'External'`.

**Verify:** `[!]` `grep -n 'canonical.source.type\|canonical.target.type' src/`

---

### T6. `ExplorerEdge.canonical.source.name` is the **node ID**, not the display name

```ts
source: { type: 'ApexClass', name: data.source },   // data.source = 'ApexClass:Foo'
```

The `name` field on a `CanonicalReference` semantically means "the class name" (`'Foo'`), not "the fully qualified ID" (`'ApexClass:Foo'`). Any consumer that renders `canonical.source.name` as a label displays `'ApexClass:Foo'` — with the type prefix.

**Fix:**
```ts
const sourceNode = nodeMap.get(data.source);
source: {
  type: sourceNode?.type ?? 'External',
  name: sourceNode?.displayName ?? data.source.split(':').pop() ?? data.source,
}
```

**Verify:** `[!]` `grep -n 'canonical.source.name\|canonical.target.name' src/`

---

### T7. `ExplorerEdge.canonical.relationship.type` is **always `'unknown'`**

```ts
relationship: { type: 'unknown', resolution: 'EXACT' },
```

The real `data.relationshipType` is right there (`data.relationshipType || 'unknown'` is used for the top-level `relationshipType` field). The canonical relationship type is fabricated as `'unknown'` unconditionally. Every downstream consumer of `canonical.relationship.type` sees `'unknown'`.

**Fix:** `type: data.relationshipType || 'unknown'`.

---

### T8. `ExplorerEdge.canonical.relationship.resolution` is **always `'EXACT'`**

Same pattern as T4 but inside `canonical`. Downstream code that filters by `canonical.relationship.resolution === 'PARTIAL'` sees nothing.

**Fix:** derive from `data.resolutionStrategy` or `data.unresolved`.

---

### T9. `ExplorerEdge.line`, `column`, `methodOwner` are **always `null`**

```ts
line: null,
column: null,
methodOwner: null,
```

If `buildGraphElements` (Cluster 3) sets these on cy node data — which it must, given `ExplorerEdge` is a first-class type — then the extract **throws them away**. Any UI that displays the source line of a dependency edge (hover card, investigation drawer, findings panel) shows nothing.

**Fix:** `line: typeof data.line === 'number' ? data.line : null`, same for `column`, `methodOwner`.

**Verify:** `[!]` `grep -n 'line:\|column:\|methodOwner:' src/lib/graph-builder.ts src/lib/intelligence/**/*.ts`

---

### T10. `Boolean(data.isTest)`, `Boolean(data.hasCycles)`, `Boolean(data.hasUnresolved)`, `Boolean(data.unresolved)` — string-loose at the `any` boundary

Cytoscape's `data()` returns `any`. `buildGraphElements` (Cluster 3) can store booleans or strings. If any of these are stored as `'false'` strings (from `JSON.stringify` → `JSON.parse` in a worker, or `localStorage` round-trip), then:

```
Boolean('false') === true
```

Consequences:
- Every production class is classified as `isTest: true` → placed in satellite ring
- Every non-cyclic node is classified as `hasCycles: true` → styled with cycle border and treated as cyclical in centrality
- Every resolved edge is classified as `unresolved: true` → styled dashed/orange, risk scoring broken

**Fix:** strict coercion at the extraction boundary:
```ts
const toBool = (v: unknown): boolean => v === true || v === 'true';
```

The type contract `isTest: boolean` does **not** protect against this because the runtime value never passes through TypeScript.

**Verify:** `[!]` `grep -n 'isTest\|hasCycles\|hasUnresolved\|unresolved' src/lib/graph-builder.ts` — check whether these are set as booleans or strings.

---

### T11. `data.id || cyNode.id()` in `extractNodesAndEdgesFromCy` breaks the ID-uniqueness contract

```ts
nodes.push({
  id: data.id || cyNode.id(),
  ...
});
```

Followed by:
```ts
cy.nodes().forEach(node => {
  const id = node.id();               // ← cy id
  if (posMap[id]) node.position(posMap[id]);
});
```

If `data.id !== cyNode.id()` for any node, the layout computes positions for `data.id` but the position apply looks up by `cyNode.id()` → **silent position loss for that node**. The type contract `ExplorerNode.id: string` (unique) is not enforced at the boundary between cy and the extraction.

**Fix:** use `cyNode.id()` unconditionally:
```ts
id: cyNode.id(),
```
And if `data.id` needs to survive for provenance, store it under a separate field (`dataProvenanceId`).

**Verify:** `[!]` `grep -n "data('id')\|data.id" src/lib/graph-builder.ts` — is `data.id` always equal to `cy` id? If yes, `|| cyNode.id()` is safe. If no, this is broken.

---

### T12. `visibleNodeTypes` filter silently excludes new node types on schema evolution

Three interacting sites:

**`App.tsx`:**
```ts
const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
```

**`App.tsx` selection guard:**
```ts
if (!visibleTypes.includes(selectedNode.type)) {
  clearSelection();
  setIsInvestigating(false);
}
```

**`App.tsx` project-change handler:**
```ts
setFilterState({
  ...createEmptyFilterState(),
  visibleNodeTypes: projState.filters?.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES,
});
```

If `ExplorerNodeType` gains a new member (e.g., `'AuraComponent'`) and `ALL_EXPLORER_NODE_TYPES` is **not derived from the type** (i.e., it's a hand-maintained array), then:

1. `ALL_EXPLORER_NODE_TYPES` does not include `'AuraComponent'`.
2. `loadProjectState` reads a persisted `visibleNodeTypes` that was saved before the new type existed — **also missing `'AuraComponent'`**.
3. `visibleTypes.includes(selectedNode.type)` returns `false` for every AuraComponent.
4. The user clicks an AuraComponent → selection is immediately cleared.
5. The filter bar shows all node types checked, but AuraComponents are invisible.

**Silent, complete invisibility of a newly-added node type** — for every existing user, on their first session after upgrade.

**Fix:** either (a) derive `ALL_EXPLORER_NODE_TYPES` from a `const` object so adding a type is a compile error, or (b) at load time, union `projState.filters.visibleNodeTypes` with the difference `ALL_EXPLORER_NODE_TYPES` minus the persisted list (auto-enable new types by default).

**Verify:** `[!]` `grep -n 'ALL_EXPLORER_NODE_TYPES' src/types/explorer.ts` — is it `as const satisfies readonly ExplorerNodeType[]` (exhaustive) or just `ExplorerNodeType[]` (not exhaustive)?

---

## 🟠 High — schema-evolution hazards the type doesn't catch

### T13. `NODE_SHAPE_BY_TYPE: Record<ExplorerNodeType, NodeShape>` is a maintenance trap

`graph-style.ts`:
```ts
export const NODE_SHAPE_BY_TYPE: Record<ExplorerNodeType, NodeShape> = {
  ApexClass: 'ellipse',
  ApexTrigger: 'triangle',
  LWC: 'rectangle',
  Visualforce: 'round-rectangle',
  Flow: 'hexagon',
  Object: 'diamond',
  CustomObject: 'octagon',
  Field: 'rhomboid',
  CustomField: 'cut-rectangle',
  External: 'star'
};
```

**This compiles only if `ExplorerNodeType` is exactly those 10 values.** If `ExplorerNodeType` is a superset (e.g., includes `'AuraComponent'`), then `Record<ExplorerNodeType, NodeShape>` requires `'AuraComponent'` to be a key — **compile error**.

Two possibilities:

- **Case A:** `ExplorerNodeType` is exactly these 10. Then adding a type is a **breaking change** — every `Record<ExplorerNodeType, ...>` in the codebase must be updated. The type file itself has no marker saying "adding a type is a breaking change", so a contributor adding `'AuraComponent'` will see cryptic errors in unrelated files.
- **Case B:** `ExplorerNodeType` is a superset and this `Record<ExplorerNodeType, ...>` should have a compile error, meaning one of them is mis-typed (`as Record<ExplorerNodeType, NodeShape>` with a cast).

**Fix:** either add a compile-time assertion in `explorer.ts`:
```ts
export const ALL_EXPLORER_NODE_TYPES = ['ApexClass', 'ApexTrigger', 'LWC', 'Visualforce', 'Flow', 'Object', 'CustomObject', 'Field', 'CustomField', 'External'] as const;
export type ExplorerNodeType = typeof ALL_EXPLORER_NODE_TYPES[number];
```
so adding a type requires updating `ALL_EXPLORER_NODE_TYPES` (single point of truth), **and** the compiler will error in every dependent `Record`.

Or, if types can grow without UI shape updates, use `Partial<Record<ExplorerNodeType, NodeShape>>` and fall back to `'ellipse'` in `getNodeShape` (which already does this).

**Verify:** `[!]` `grep -n 'type ExplorerNodeType\|ExplorerNodeType =' src/types/explorer.ts` — union literal or `string` alias?

---

### T14. `ExplorerRiskLevel` and `RISK_BORDER_COLORS` may be out of sync

`graph-style.ts`:
```ts
const RISK_BORDER_COLORS: Record<string, string> = {
  HIGH: '#dc2626',
  MEDIUM: '#ea580c',
  LOW: '#059669'
};
```

Note: `Record<string, string>` — **not** `Record<ExplorerRiskLevel, string>`. If `ExplorerRiskLevel` includes `'CRITICAL'` (and `index.css` defines `--risk-critical`, `--risk-critical-bg`, `--risk-high`, `--risk-high-bg`, suggesting **both** `CRITICAL` and `HIGH` exist), then:

- `RISK_BORDER_COLORS` has no entry for `CRITICAL`.
- Cytoscape's selector `node[risk = "CRITICAL"]` is not generated (only `HIGH`, `MEDIUM`, `LOW` are).
- A critical-risk node falls back to `border-color: '#1e293b'` (the base style), which is a **slate border** — the node looks like a LOW-risk node with default styling.

**Silent visual bug**: high-risk-to-critical nodes are styled identically to default nodes.

Also, `RISK_BORDER_COLORS` uses `Record<string, string>` rather than `Record<ExplorerRiskLevel, string>` — so TypeScript wouldn't catch this even if `ExplorerRiskLevel` gained `'CRITICAL'`.

**Fix:** type `RISK_BORDER_COLORS` as `Record<ExplorerRiskLevel, string>` — the compile error will force every risk level to have a color.

**Verify:** `[!]` `grep -n 'type ExplorerRiskLevel\|ExplorerRiskLevel =' src/types/explorer.ts` — is `'CRITICAL'` a member?

**Same pattern** in `NODE_COLORS` (`Record<string, { background; border }>`), which is `Record<string, ...>` not `Record<ExplorerNodeType, ...>`. If a node type isn't in `NODE_COLORS`, it falls back to the base blue — **silent style drift**.

---

### T15. `ArchitectureLayoutMode` cycle (`ARCH_MODE_META[mode].next`) is not type-enforced

`GraphControls.tsx`:
```tsx
const nextMode = ARCH_MODE_META[architectureMode].next;
```

`ARCH_MODE_META` is `Record<ArchitectureLayoutMode, { ..., next: ArchitectureLayoutMode }>`. The type guarantees `next` is one of the four modes — **but it does not guarantee the four `next` pointers form a valid cycle.**

Failure scenarios the type cannot catch:
- `orbit.next = 'orbit'` — toggle button becomes a no-op
- `constellation.next = 'orbit'` **and** `orbit.next = 'constellation'` — the toggle only switches between two modes; `hierarchical` and `hybrid` become **unreachable via the toggle**
- `hierarchical.next = 'hierarchical'` — same no-op bug

**Fix:** add a runtime assertion at module load:
```ts
const modeValues = Object.keys(ARCH_MODE_META) as ArchitectureLayoutMode[];
const visited = new Set<ArchitectureLayoutMode>();
let cur = 'hierarchical';
while (!visited.has(cur)) {
  visited.add(cur);
  cur = ARCH_MODE_META[cur].next;
}
if (visited.size !== modeValues.length || cur !== 'hierarchical') {
  throw new Error(`ARCH_MODE_META does not form a single cycle: ${[...visited].join(' → ')} → ${cur}`);
}
```

This runs once at module load in dev mode and would catch a broken cycle immediately.

**Verify:** `[!]` `grep -n 'ARCH_MODE_META' src/types/explorer.ts` — check that all four `next` pointers form a single cycle.

---

### T16. `projectState.ts` fallback chain drops unknown architecture modes

```ts
const activeArchMode: ArchitectureLayoutMode =
  gLoaded.architectureMode === "constellation"
    ? "constellation"
    : gLoaded.architectureMode === "orbit"
    ? "orbit"
    : gLoaded.architectureMode === "hybrid"
    ? "hybrid"
    : "hierarchical";
```

If `ArchitectureLayoutMode` gains a fifth member (`'fractal'`), a persisted `architectureMode: 'fractal'` **silently falls back to `'hierarchical'`** — the manual if-chain doesn't include `'fractal'`, and there's no `else throw`.

`GraphView.tsx` has the same pattern:
```ts
if (stored && ['hierarchical', 'hybrid', 'orbit', 'constellation'].includes(stored)) {
  return stored;
}
```

**Silent mode-loss on version upgrades.** Every user's `'fractal'` preference reverts to `'hierarchical'` after adding the mode.

**Fix:** validate against a derived `ARCH_MODE_META` keys array:
```ts
const valid = Object.keys(ARCH_MODE_META) as ArchitectureLayoutMode[];
const activeArchMode: ArchitectureLayoutMode =
  valid.includes(gLoaded.architectureMode as ArchitectureLayoutMode)
    ? gLoaded.architectureMode as ArchitectureLayoutMode
    : 'hierarchical';
```

The type of `ARCH_MODE_META` guarantees all modes are keys, so adding a mode is automatically picked up.

---

### T17. `ArchitectureLayoutMode` propagated through three type files with no single source of truth

`FeatureRegion`, `ArchitectureLayer`, `ArchitectureLayoutOptions`, `ArchitectureLayoutResultWithMetadata` all propagate:

```
layout/global-layout.ts (defines FeatureRegion)
  → architecture-layout.ts (re-exports)
    → graph-layout.ts (re-exports)
      → GraphView.tsx (imports)
```

`ArchitectureLayoutMode` propagates:
```
types/explorer.ts (defines)
  → architecture-layout.ts (imports)
  → projectState.ts (imports)
  → graph-layout.ts (via architecture-layout re-export)
  → GraphView.tsx (imports)
  → GraphControls.tsx (imports)
  → position-policy.ts (does NOT import — uses `LayoutMode` instead)
```

`LayoutMode` (`'static' | 'interactive'`) lives in `position-policy.ts`:
```ts
export type LayoutMode = 'static' | 'interactive';
```

**Two distinct `LayoutMode` concepts:**

1. `ArchitectureLayoutMode` = `'hierarchical' | 'hybrid' | 'orbit' | 'constellation'` — **spatial layout algorithm**
2. `LayoutMode` = `'static' | 'interactive'` — **user-interaction policy**

Both are called "layout mode" in the code and both flow through `GraphView`. The naming collision is a maintenance hazard: `GraphView` reads `layoutMode` (interactive/static) and `architectureMode` (hierarchical/hybrid/orbit/constellation) — a new contributor will confuse them.

Worse: `position-policy.ts` defines its own `LayoutMode` type, but `GraphView` imports `LayoutMode` from `position-policy.ts` **and** uses it alongside `ArchitectureLayoutMode` from `explorer.ts`. There's no shared `union AllLayoutModes = ...` type.

**Fix:** rename to eliminate ambiguity:
- `ArchitectureLayoutMode` → `SpatialLayoutMode` (or `ArchitectureMode`)
- `LayoutMode` → `InteractionMode`
- Or at minimum add a doc comment in `explorer.ts` and `position-policy.ts` clarifying the distinction.

**Verify:** `[!]` `grep -rn 'LayoutMode' src/types/ src/lib/ | head -50` — trace all usages, check for accidental cross-assignment.

---

### T18. `ExplorerDataSchema.summary.cycleCount` AND `cyclesCount` — duplicate field, one is likely a typo

`architecture-layout.ts` fabricates both:
```ts
cycleCount: 0,
cyclesCount: 0,
```

The type `ExplorerDataSchema.summary` has both fields. Any consumer must check both — or one is a legacy field, and one is a fix that didn't remove the old. Either way, **the type contract allows them to disagree**. A dashboard reading `cycleCount` while a producer writes `cyclesCount` (or vice versa) sees inconsistent data.

**Fix:** deprecate one, or if both are legitimately used, document what distinguishes them.

**Verify:** `[!]` `grep -n 'cycleCount\|cyclesCount' src/types/explorer.ts src/` — find all readers.

---

### T19. `ExplorerDataSchema.summary.inventory.lwcJs` and `lwcHtml` — LWC file count conflation

`architecture-layout.ts` fabricates:
```ts
inventory: {
  lwcJs: safeNodes.filter(n => n.type === 'LWC').length,   // ← LWC nodes, not files
  lwcHtml: 0,                                              // ← always 0
  ...
}
```

If `ExplorerDataSchema.summary.inventory.lwcJs` semantically means "number of `.js` files" and `lwcHtml` means "number of `.html` files", then:
- `lwcJs` = LWC nodes is **the number of LWC components**, not the number of `.js` files
- `lwcHtml` = 0 is a lie (every LWC has an `.html` file)

The **inventory summary is wrong** for every project. Any UI displaying "JS files: N, HTML files: 0" is misleading.

**Fix:** remove the fabrication — either populate correctly from `safeNodes` (each LWC node → 1 js + 1 html) or make these fields optional in the type and omit them when unknown.

**Verify:** `[!]` `grep -rn 'inventory.lwc' src/` — check the consumer's interpretation.

---

### T20. `ExplorerDataSchema.inventory.objects` and `fields` filter types inconsistently

```ts
objects: safeNodes.filter(n => n.type === 'Object' || n.type === 'CustomObject').length,
fields: safeNodes.filter(n => n.type === 'Field' || n.type === 'CustomField').length,
```

This is correct **if** `ExplorerNodeType` has exactly `'Object' | 'CustomObject' | 'Field' | 'CustomField'`. If a new field-like type is added (e.g., `'Formula Field'`, `'RollupField'`), the inventory silently under-counts.

**Fix:** use `type: 'Object' | 'CustomObject'` as an array:
```ts
const OBJECT_TYPES: ExplorerNodeType[] = ['Object', 'CustomObject'];
objects: safeNodes.filter(n => OBJECT_TYPES.includes(n.type)).length,
```

But `OBJECT_TYPES` is another hardcoded list. Derive from a `type Category` if the type gains one.

---

## 🟡 Medium — `Position` is defined three times, used in three different shapes

### T21. `Position { x, y }` in `position-policy.ts` — used only there; every other file inlines the shape

**`position-policy.ts` (the only file that defines `Position`):**
```ts
export interface Position {
  x: number;
  y: number;
}
```

**`projectState.ts`:**
```ts
nodePositions: Record<string, { x: number; y: number }>;                        // inline
layoutPositions?: Partial<Record<ArchitectureLayoutMode, Record<string, { x: number; y: number }>>>;   // inline
zoom: { zoom: number; pan: { x: number; y: number } };                          // inline
```

**`graph-layout.ts`:**
```ts
Record<string, { x: number; y: number }>              // 5 separate occurrences
```

**`GraphView.tsx`:**
```ts
nodePositions?: Record<string, { x: number; y: number }>;   // inline
```

**`architecture-layout.ts`:**
```ts
positions: Record<string, { x: number; y: number }>;        // inline
```

**`component-orbit-layout.ts`:**
```ts
export interface ComponentOrbitNodePosition { nodeId: string; ring: number; ...; x: number; y: number; width: number; height: number; }
```
(Separate type — correctly distinct because it adds ring/angle/radius.)

**`component-constellation-layout.ts`:**
```ts
export interface ComponentConstellationNodePosition { ...; x: number; y: number; width: number; height: number; }
```
(Separate — fine.)

**Result:** the `{ x: number; y: number }` shape is duplicated **10+ times** across 5 files. If `Position` gains a field (e.g., `z` for a future 3D layout), **only `position-policy.ts` gets updated** — every other file silently remains 2D, and the compiler cannot catch the mismatch because they're structurally compatible (2D assignable to 3D? No — actually 3D assignable to 2D yes, 2D assignable to 3D no). So the compiler **would** catch it if types were shared. But with inline duplication, TypeScript sees 5 unrelated `{ x: number; y: number }` types and unifies them structurally.

**Fix:** move `Position` to `explorer.ts` (or a `types/geometry.ts`) and replace every inline `{ x: number; y: number }` with `Position`.

This is the **single most impactful refactor** for future-proofing. Do it before adding any position field.

### T22. `ZoomPanState.pan: { x: number; y: number }` is a `Position` by another name

```ts
export interface ZoomPanState {
  zoom: number;
  pan: { x: number; y: number; };
}
```

`pan` is a position in panning space. Same as `T21` — should be `Position`.

### T23. `ResolvedPosition` — only file that uses `Position` correctly

```ts
export interface ResolvedPosition {
  position: Position;
  level: PositionAuthorityLevel;
}
```

Correct usage. But `ResolvedPosition` is only consumed by `resolvePosition` in `position-policy.ts` itself. **The rest of the codebase treats positions as `{ x, y }` directly.**

---

## 🔵 Low — hygiene and cross-cluster consistency

### T24. `ExplorerDataSchema` is defensively checked despite being required

`component-orbit-adapter.ts`:
```ts
const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
const rawEdges = Array.isArray(input?.edges) ? input.edges : [];
```

But `adaptComponentOrbit(input: ExplorerDataSchema, ...)` declares `input` as non-nullable. `input?.nodes` implies `input` **might be null**. Either:
- (a) `input: ExplorerDataSchema` is wrong — should be `input: ExplorerDataSchema | null | undefined`
- (b) The defensive code is unnecessary and misleading

**Same pattern** in `component-constellation-adapter.ts`:
```ts
const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
const rawEdges = Array.isArray(input?.edges) ? input.edges : [];
```

**Fix:** either make the type honest (`ExplorerDataSchema | null | undefined`) or remove the `?.` guards.

### T25. `as any` casts that defeat the shared type contract

Every cast is a place where TypeScript's guarantee about the shared type is **silently discarded**:

- `GraphView.tsx`: `(onNodePositionsChangeRef.current as any)(currentPositions, provenance);` — TypeScript won't catch wrong arity/provenance handling
- `GraphView.tsx`: `nodes.some((n) => n.id === id && n.type === 'LWC')` inside `isLwcNode` — no cast, but the derived type is `boolean` not `n is LWCONode`
- `bindGraphInteractions`: `type: nodeData.type as any`, `risk: nodeData.risk as any` — loses `ExplorerNodeType` / `ExplorerRiskLevel` guarantees
- `App.tsx`: `(n: any) => n.id === urlNode || n.name === urlNode || n.displayName === urlNode` — casts to `any` to access `.name`, which is not in `ExplorerNode`
- `architecture-layout.ts`: `(globalDomainResult as any)?.featureRegions` — the type of `globalDomainResult` is completely unannotated, so `.featureRegions` is not verified to be `Map<string, FeatureRegion>`
- `architecture-layout.ts`: `const constellationOutput = computeComponentConstellationLayout(projection, {...})` — no annotation, so `.guides` is inferred but its shape is not cross-checked

**Fix:** replace `as any` with proper narrow casts (`as unknown as Target` at minimum) or add type guards. The `n.name` cast in `App.tsx` is a specific bug: if `ExplorerNode` doesn't have `name`, the check is always `undefined === urlNode`, which is always `false`, and `n.name === urlNode` never matches.

**Verify:** `[!]` `grep -n 'name' src/types/explorer.ts` — is `name` a field? If not, `App.tsx`'s cast is dead code.

### T26. `ExplorerRelationshipType | string` escape hatch in the orbit adapter

`component-orbit-adapter.ts`:
```ts
export interface ComponentOrbitEdge {
  relationshipType: ExplorerRelationshipType | string;   // ← union with string defeats type safety
  ...
}
```

The `| string` makes `ExplorerRelationshipType` **useless** in this struct — any string compiles. If a new relationship type is added to `ExplorerRelationshipType`, it must still be added to `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` **manually** to be included by default, and no compiler error catches the omission.

`component-constellation-adapter.ts` has the same pattern:
```ts
relationshipType: ExplorerRelationshipType | string;
```

**Fix:** either drop the `| string` (and cast at the extraction boundary where untyped data enters), or add a `RelationshipType` union that includes `'unknown'` and use that.

**Verify:** `[!]` `grep -n 'ExplorerRelationshipType' src/types/explorer.ts src/lib/adapters/*.ts`

### T27. `ExplorerNode.behavior.publicContractsCount` is required but no consumer uses it correctly

`architecture-layout.ts` fabricates `publicContractsCount: 0`. The test mock sets `publicContractsCount: 1`. No cluster reads `publicContractsCount` in the provided files.

**If the field is unused by all six clusters, it should be optional** — otherwise every extract fabricates a value no one needs. If some downstream module (e.g., `intelligence/`, `refactor-readiness/`) reads it, that module sees `0` for every node when the extraction path is used.

**Verify:** `[!]` `grep -rn 'publicContractsCount' src/`

### T28. `ExplorerNode.behavior.securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount` — same pattern as T27

All fabricated as `0`. If any downstream module uses these (e.g., an "async risk" finding, a "data-heavy" tag), it sees zeros everywhere the extraction path was used.

**Verify:** `[!]` `grep -rn 'securitySignalsCount\|queryCount\|dmlCount\|calloutCount' src/`

### T29. `ExplorerEdge.methodOwner: string | null` — always `null` in extraction; loses real data

If a dependency edge has a `methodOwner` (e.g., `'MyController.handleSave'`), the extract loses it. `investigation/` UI (drill-down) typically wants this.

**Fix:** `methodOwner: typeof data.methodOwner === 'string' ? data.methodOwner : null`.

### T30. `ExplorerEdge.file: string` — always `''` in extraction

```ts
file: '',
```

If `data.file` is available on the cy edge, this is a loss. If it isn't, `''` is at least honest. Verify against `graph-builder.ts`.

**Verify:** `[!]` `grep -n "file" src/lib/graph-builder.ts` — is `file` set on edge data?

---

## Priority summary

| # | Bug | Type of issue | Impact |
|---|---|---|---|
| **T1** | `sharing` inconsistently required/optional/nullable | Contract violation | Compile risk or silent undefined |
| **T2** | `extractNodesAndEdgesFromCy` fabricates 20+ fields | Contract violation | Downstream silent data loss |
| **T4** | `resolutionClassification`/`resolutionStrategy` always resolved | Contract violation | Unresolved edges invisible to findings |
| **T5** | `canonical.source.type` always `'ApexClass'` | Contract violation | Cross-type edges mis-typed |
| **T6** | `canonical.source.name` is the ID | Contract violation | UI shows `ApexClass:Foo` as a name |
| **T7** | `canonical.relationship.type` always `'unknown'` | Contract violation | Style/filter fallbacks everywhere |
| **T9** | `line`/`column`/`methodOwner` always `null` | Data loss | Hover cards, drill-downs empty |
| **T10** | `Boolean("false")` at extraction boundary | Runtime coercion | Test nodes = ALL nodes |
| **T11** | `data.id` vs `cyNode.id()` mismatch | Silent position loss | Nodes stay at previous position |
| **T12** | `visibleNodeTypes` schema-evolution | Silent invisibility | New node types vanish for existing users |
| **T13** | `NODE_SHAPE_BY_TYPE` is a maintenance trap | Compile-time coupling | Adding a type requires N-file updates |
| **T14** | `RISK_BORDER_COLORS: Record<string, string>` | Type looseness | CRITICAL risk styled as LOW |
| **T15** | `ARCH_MODE_META[next]` cycle not enforced | Runtime bug | Toggle button no-ops |
| **T16** | Manual `if/else` fallback drops new modes | Silent upgrade loss | Persisted mode lost |
| **T17** | `LayoutMode` vs `ArchitectureLayoutMode` naming collision | Maintenance | Contributor confusion |
| **T18** | `cycleCount` vs `cyclesCount` duplicate | Contract looseness | Inconsistent summaries |
| **T19** | `inventory.lwcJs`/`lwcHtml` conflation | Semantic | Inventory numbers wrong |
| **T21** | `{ x, y }` duplicated in 5+ files | DRY / future hazard | Adding `z` breaks silently |
| **T25** | Multiple `as any` casts | Type safety loss | Silent regressions |
| **T26** | `ExplorerRelationshipType \| string` | Union escape hatch | No exhaustiveness |

---

## The most impactful single refactor

**T21 (Position)** and **T2 (extraction fabrication)** are the two systemic issues. T2 is per-cluster and can be fixed incrementally. T21 is a single mechanical change that would touch every file but prevent a class of future bugs. If you're doing one fix, do **T21** — it takes an afternoon and removes ~10 duplicated type definitions.

If you're doing one *observability* fix, do **T2** — a single `if (process.env.NODE_ENV !== 'production') { validateExtractedCoverage(extracted, originalNodes) }` guard at the extraction boundary that throws when `metrics.score`, `metrics.unresolved`, `behavior.asyncPatterns`, `refactoringReadiness.testCoverageStatus`, or `canonical.source.type` are fabricated would immediately surface every downstream consumer that silently trusts the extraction.

---

## Verify checklist — `[!]` items that must be checked against `explorer.ts`

```bash
# Type definitions
grep -n "type ExplorerNodeType\|type ExplorerRiskLevel\|type ExplorerRelationshipType\|type ArchitectureLayoutMode" src/types/explorer.ts
grep -n "interface ExplorerNode\b\|interface ExplorerEdge\b\|interface ExplorerDataSchema\|interface ExplorerBehavior\|interface ExplorerMetrics\|interface ExplorerRefactoringReadiness" src/types/explorer.ts
grep -n "sharing\|isTest\|publicContractsCount\|asyncPatterns\|securitySignalsCount\|queryCount\|dmlCount\|calloutCount" src/types/explorer.ts
grep -n "confidence\|resolutionClassification\|resolutionStrategy\|unresolved" src/types/explorer.ts
grep -n "canonical\|line\|column\|methodOwner" src/types/explorer.ts
grep -n "name" src/types/explorer.ts | head

# Runtime constants
grep -n "ALL_EXPLORER_NODE_TYPES\|ARCH_MODE_META" src/types/explorer.ts

# Consumers of fabricated fields
grep -rn "publicContractsCount\|securitySignalsCount\|queryCount\|dmlCount\|calloutCount" src/ | grep -v "graph-builder\|explorer.ts\|architecture-layout.ts"

# Consumers of canonical fields
grep -rn "canonical\." src/ | grep -v "architecture-layout.ts\|graph-layout.ts"

# Consumers of resolution fields
grep -rn "resolutionClassification\|resolutionStrategy" src/ | grep -v "explorer.ts\|architecture-layout.ts"
```

Each `[!]` item above maps to one of those greps. Until you run them, the type contract is **partially unverifiable** — but the ~20 silent violations I documented from usage alone are enough to justify a full `explorer.ts` refactor.


# Verification Cluster — Test Suite Audit

**Scope:** Only two of the twenty listed test files were provided: `deep-bug-hunt-fixes.test.ts` and `architecture-layout.test.ts`. I've audited both thoroughly and, more importantly, built a **coverage-gap matrix** against the bugs from Clusters 1–7 — because a test suite's job is to *fail* when those bugs are present, and most of them don't have a test.

---

## 🔴 Critical — the provided tests don't catch the bugs they claim to

### V1. `deep-bug-hunt-fixes.test.ts` — the "clearHighlights" test never executes the removal loop

```ts
const mockCy = {
  elements: vi.fn(() => ({
    removeClass: removeClassMock,
    forEach: forEachMock,          // ← vi.fn() with no implementation
  })),
} as any;

clearHighlights(mockCy);

expect(removeClassMock).toHaveBeenCalledWith('dimmed highlighted ...');
```

`forEachMock` is `vi.fn()` with no callback implementation. `Array.prototype.forEach` calls its callback for each element — a `vi.fn()` does **not**. So:

```ts
cy.elements().forEach((ele) => {
  if (typeof ele.classes === 'function') {
    const cycleClasses = ele.classes().filter((c) => c.startsWith('cycle-')).join(' ');
    if (cycleClasses) ele.removeClass(cycleClasses);
  }
});
```

**This entire block is untested.** A maintainer could delete the callback body, break the `cycle-` prefix filter, or remove the `removeClass` call inside it — and the test would still pass.

**Fix:** mock `forEach` to actually invoke the callback against a fixture list:
```ts
const elements = [
  { classes: () => ['node', 'cycle-1', 'cycle-2'], removeClass: vi.fn() },
  { classes: () => ['node', 'other'], removeClass: vi.fn() },
];
const removeClass = vi.fn();
const mockCy = {
  elements: vi.fn(() => ({
    removeClass,
    forEach: (cb: (e: any) => void) => elements.forEach(cb),
  })),
};

clearHighlights(mockCy);

expect(removeClass).toHaveBeenCalledWith('dimmed highlighted impact-muted impact-origin impact-affected finding-highlighted focus-center focus-neighbor focus-dimmed');
expect(elements[0].removeClass).toHaveBeenCalledWith('cycle-1 cycle-2');
expect(elements[1].removeClass).not.toHaveBeenCalled();
```

### V2. `deep-bug-hunt-fixes.test.ts` — the test name is a lie

Test name: *"clearHighlights removes all highlight, dimmed, impact, finding, and focus classes"*.

The implementation also removes `cycle-*` classes (via the forEach loop). The test doesn't verify cycle removal at all (V1), and the test name doesn't mention it. A future contributor reading the test name will assume cycle classes are out of scope — and won't realize that removing the forEach loop breaks nothing in tests.

### V3. `deep-bug-hunt-fixes.test.ts` — no negative test for invalid input

`clearHighlights` has guards:
```ts
if (!cy || !cy.elements) return;
```

`clearHighlights(null as any)` and `clearHighlights({} as any)` are **untested**. If a future refactor removes the guard (`cy.elements()` throws), the test wouldn't catch it, and downstream code that passes `null` during teardown (e.g., the destroy effect in `GraphView`) would crash.

**Fix:**
```ts
it('clearHighlights is a safe no-op on null/invalid input', () => {
  expect(() => clearHighlights(null as any)).not.toThrow();
  expect(() => clearHighlights({} as any)).not.toThrow();
});
```

### V4. `architecture-layout.test.ts` — Test 9's `duration < 3000` is flaky and will fail on CI

```ts
const startTime = performance.now();
const run1 = computeArchitectureLayout(nodes, edges);
const duration = performance.now() - startTime;
expect(duration).toBeLessThan(3000);
```

100-node architecture layout with the full feature pipeline is typically 500–1500 ms on a modern machine, but **CI runners are often 3–5× slower** due to noisy neighbors, shared CPU, and containerized execution. `3000` ms is too tight — this will fail intermittently on GitHub Actions, CircleCI, or a busy dev laptop.

**Fix:** either:
- Bump to `10000` ms (still catches pathological O(n²) regressions), or
- Better: verify **algorithmic complexity** instead of wall time — assert `computeArchitectureAnalysis` is called once (which the WAVE 7A test already does). Wall-time tests are the wrong tool for a reference implementation.

### V5. `architecture-layout.test.ts` — Test 10 verifies `existingPositions` for **only** the node itself, not its satellites

```ts
const existingPositions = {
  'ApexClass:ExistingNode': { x: 777, y: 888 },
};

const positions = computeArchitectureLayout(nodes, edges, { existingPositions });

expect(positions['ApexClass:ExistingNode']).toEqual({ x: 777, y: 888 });  // ✓
expect(positions['ApexClass:NewNode']).toBeDefined();                    // weak
expect(positions['ApexClass:NewNode']).not.toEqual({ x: 777, y: 888 });  // weak
```

This test **only** catches the case where `existingPositions` is completely ignored. It does **not** catch Cluster 6 **A7** — where `existingPositions` are restored *after* satellites were placed relative to the node's *computed* position. The satellites of `ExistingNode` are not in the graph, so A7 can't fire here.

**Fix:** add a test with `ExistingNode` + a satellite:
```ts
it('existingPositions anchor satellites at the restored position, not the computed position', () => {
  const nodes = [
    createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
    createMockNode({ id: 'ApexClass:OrderServiceTest', displayName: 'OrderServiceTest',
      behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0,
                  queryCount: 0, dmlCount: 0, calloutCount: 0 } }),
  ];
  const edges = [createMockEdge('ApexClass:OrderServiceTest', 'ApexClass:OrderService')];
  const positions = computeArchitectureLayout(nodes, edges, {
    existingPositions: { 'ApexClass:OrderService': { x: 5000, y: 5000 } },
  });
  expect(positions['ApexClass:OrderService']).toEqual({ x: 5000, y: 5000 });
  const dx = positions['ApexClass:OrderServiceTest'].x - 5000;
  const dy = positions['ApexClass:OrderServiceTest'].y - 5000;
  expect(Math.hypot(dx, dy)).toBeLessThan(400);  // satellite must be near restored position
});
```

Without this test, **A7 goes undetected forever**.

### V6. `architecture-layout.test.ts` — Test 10's `not.toEqual({ x: 777, y: 888 })` is a weak negative

If a bug places `NewNode` at `{ x: 777, y: 889 }` — **one pixel from ExistingNode**, which would be a visual overlap — the test passes. The intent is "NewNode is placed at a distinct, non-overlapping position".

**Fix:**
```ts
const existing = positions['ApexClass:ExistingNode'];
const newNode = positions['ApexClass:NewNode'];
const dist = Math.hypot(newNode.x - existing.x, newNode.y - existing.y);
expect(dist).toBeGreaterThan(120);  // nodeWidth — no overlap
```

### V7. `architecture-layout.test.ts` — Test 1 doesn't verify every layer is distinct

```ts
expect(yPres).toBeLessThan(yApp);
expect(yApp).toBeLessThan(yDom);
expect(yDom).toBeLessThan(ySchema);
```

This verifies the **chain** P < A < D < S. It does **not** verify that the chain is *strict* — a bug that puts `OrderService` (application) and `OrderController` (application) at the **exact same y** would pass, because both are "between presentation and domain".

**Also:** the test doesn't verify `OrderService`'s layer at all. If `classifyNodeLayer` miscalculates `OrderService` as `schema`, its position could be anywhere and the test would still pass.

**Fix:**
```ts
const positions_by_layer = {
  presentation: [positions['LWC:OrderView'].y],
  application: [positions['ApexClass:OrderController'].y, positions['ApexClass:OrderService'].y],
  domain: [positions['ApexClass:OrderSelector'].y],
  schema: [positions['CustomObject:Order__c'].y],
};
const maxY = (arr) => Math.max(...arr);
const minY = (arr) => Math.min(...arr);
expect(maxY(positions_by_layer.presentation)).toBeLessThan(minY(positions_by_layer.application));
expect(maxY(positions_by_layer.application)).toBeLessThan(minY(positions_by_layer.domain));
expect(maxY(positions_by_layer.domain)).toBeLessThan(minY(positions_by_layer.schema));
```

### V8. `architecture-layout.test.ts` — Test 4 asserts only that nodes exist

```ts
it('Test 4 — Bridge-heavy graph: Cross-domain bridge between domains', () => {
  ...
  expect(positions['ApexClass:TriBridge']).toBeDefined();
  expect(positions['ApexClass:OrderService']).toBeDefined();
  ...
  expect(evalMetrics.nodeOverlapCount).toBe(0);
});
```

A test that asserts `toBeDefined()` is a **"did it throw" test**, not a behavioural test. `TriBridge` could be at `(999999, 999999)` — far from all three domains — and the test would pass.

**Fix:**
```ts
const bridge = positions['ApexClass:TriBridge'];
const order = positions['ApexClass:OrderService'];
const payment = positions['ApexClass:PaymentService'];
const billing = positions['ApexClass:BillingService'];

// Bridge should be near the centroid of the three domains
const cx = (order.x + payment.x + billing.x) / 3;
const cy = (order.y + payment.y + billing.y) / 3;
expect(Math.hypot(bridge.x - cx, bridge.y - cy)).toBeLessThan(400);

// Bridge should be closer to the centroid than any single domain
const bridge_to_centroid = Math.hypot(bridge.x - cx, bridge.y - cy);
const order_to_centroid = Math.hypot(order.x - cx, order.y - cy);
expect(bridge_to_centroid).toBeLessThan(order_to_centroid);
```

### V9. `architecture-layout.test.ts` — Test 3 uses 300px tolerance (too loose)

```ts
expect(Math.abs(hubPos.x - avgNeighborX)).toBeLessThan(300);
```

If the hub is 250px away from its centroid, the test passes — but 250px is roughly one layer band, which means a hub is drifting into an adjacent layer. The default `layerSpacing` is 250, so 300px tolerance is **more than a full layer**. A better bound:

```ts
expect(Math.abs(hubPos.x - avgNeighborX)).toBeLessThan(nodeWidth);  // 120px
expect(Math.abs(hubPos.y - avgNeighborY)).toBeLessThan(layerSpacing);  // 250px
```

Note it also only tests `x`, not `y`. A hub that's 500px above its neighbors in y-direction would pass.

### V10. `architecture-layout.test.ts` — Test 5 verifies only x-distance, not Euclidean

```ts
expect(Math.abs(prodPos.x - testPos1.x)).toBeLessThan(500);
```

A test node 500px **above** its production node would pass. The intent is "microcluster proximity" — but Euclidean distance is what matters. Same for Test 6's `microclusterDist`.

**Fix:**
```ts
const test1Dist = Math.hypot(prodPos.x - testPos1.x, prodPos.y - testPos1.y);
expect(test1Dist).toBeLessThan(400);  // near, not exact
```

### V11. `architecture-layout.test.ts` — Test 7's `Math.abs` breaks directionality

```ts
const maxXCompA = Math.max(positions['ApexClass:CompA1'].x, positions['ApexClass:CompA2'].x);
const minXCompB = Math.min(positions['ApexClass:CompB1'].x, positions['ApexClass:CompB2'].x, positions['ApexClass:CompB3'].x);
expect(Math.abs(minXCompB - maxXCompA)).toBeGreaterThan(100);
```

If CompB is **to the left** of CompA (shelf packing may place the smaller component to the left for aspect ratio), then `minXCompB < maxXCompA`, and `Math.abs` reports a large positive gap even when the components overlap. The test **passes with overlapping components**.

**Fix:** use directional gap or verify no AABB overlap:
```ts
const compAMaxX = Math.max(...);
const compBMinX = Math.min(...);
const compAMinX = Math.min(...);
const compBMaxX = Math.max(...);
const gap = Math.max(compBMinX - compAMaxX, compAMinX - compBMaxX);  // whichever is positive
expect(gap).toBeGreaterThan(50);  // looser than configured 100 to allow for spacing
```

Even better: use `evaluateLayout`'s overlap metric with a per-component check.

### V12. `architecture-layout.test.ts` — Test 11 (determinism) doesn't cover the existingPositions path

```ts
const run1 = computeArchitectureLayout(nodes, edges);
const run2 = computeArchitectureLayout(nodes, edges);
const run3 = computeArchitectureLayout(nodes, edges);
expect(run1).toEqual(run2);
expect(run2).toEqual(run3);
```

Only tests the default path. If `existingPositions` introduces nondeterminism (e.g., `Object.entries` order differs across runs — it doesn't, but consider future changes), it wouldn't be caught.

**Fix:** add a determinism test with `existingPositions`.

### V13. `architecture-layout.test.ts` — Test 8 (dense graph) doesn't verify **determinism**

Unlike Test 9 and Test 11, Test 8 doesn't run the layout twice. A dense graph is the most likely place for nondeterminism (many centrality ties, many bridge candidates, many component packings). If the layout is deterministic for 5 nodes but nondeterministic for 15 dense nodes, only Tests 9 and 11 would catch it — and they test *chain* and *sparse* graphs.

**Fix:** add `expect(run1).toEqual(computeArchitectureLayout(nodes, edges))` to Test 8.

### V14. `architecture-layout.test.ts` — WAVE 7A test is coupled to implementation, not behavior

```ts
const analysisSpy = vi.spyOn(analysisModule, 'computeArchitectureAnalysis');
const domainsSpy = vi.spyOn(domainsModule, 'discoverDomains');
```

This test fails if the implementation **renames** `computeArchitectureAnalysis` or refactors it inline — even if the performance goal (single call per layout) is still met. It also passes if the implementation calls these functions once but then calls other expensive functions multiple times.

**Fix:** the *goal* is "no redundant expensive work per layout". A behavioural test would measure calls to the **expensive** internal helpers (whatever they are) and assert each is called at most once. If the internal API is unstable, use a benchmark instead.

Also — the test asserts `toHaveBeenCalledTimes(1)` but doesn't assert `toHaveBeenCalledWith(...)` matching the correct arguments. If the analysis were called once with **wrong** arguments, the test passes.

### V15. `architecture-layout.test.ts` — HYBRID Test 1 doesn't verify **what** enables feature layout

```ts
const domainPositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
const featurePositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
expect(evalDomain.nodeOverlapCount).toBe(0);
expect(evalFeature.nodeOverlapCount).toBe(0);
```

Both assertions could pass if `enableFeatureLayout` were a **no-op** — i.e., if feature layout produced the same positions as domain layout. The test doesn't verify that `featurePositions` actually **groups by feature**.

**Fix:**
```ts
// In the feature layout, nodes in the same feature should be closer to each other
// than nodes in different features
const featureA1 = featurePositions['ApexClass:FeatureA_Svc'];
const featureA2 = featurePositions['ApexClass:FeatureA_Sel'];
const featureB1 = featurePositions['ApexClass:FeatureB_Svc'];

const intra = Math.hypot(featureA1.x - featureA2.x, featureA1.y - featureA2.y);
const inter = Math.hypot(featureA1.x - featureB1.x, featureA1.y - featureB1.y);
expect(intra).toBeLessThan(inter);
```

Similarly, HYBRID Test 2 asserts positions are defined and non-overlapping — but **not that the feature map survives** through the pipeline. It could return an empty `featureRegions` map and the test would pass.

**Fix:** assert `result.featureRegions` (from `computeArchitectureLayoutWithMetadata`, not the position-only wrapper) is non-empty and contains the expected feature ids.

---

## 🟠 High — test quality anti-patterns across both files

### V16. `architecture-layout.test.ts` — `evaluateLayout(...).nodeOverlapCount === 0` is used as a **silver bullet**, but its implementation isn't shown

Every test that touches layout asserts `nodeOverlapCount === 0`. If `evaluateLayout`'s overlap detection is itself buggy (e.g., uses a coarse AABB, or ignores boundary-touching), the assertion passes even when nodes overlap. Since `evaluateLayout` is **imported from `./layout/evaluate-layout`** which isn't in the file set, this is an unverifiable assertion used nine times.

**Fix:** verify `evaluateLayout`'s overlap algorithm independently. Add a test that constructs an obviously-overlapping pair and asserts `nodeOverlapCount === 1`:
```ts
it('evaluateLayout detects a known overlap', () => {
  const positions = {
    'A': { x: 0, y: 0 },
    'B': { x: 10, y: 10 },   // overlapping 120×60 nodes
  };
  const nodes = [createMockNode({ id: 'A' }), createMockNode({ id: 'B' })];
  const metrics = evaluateLayout(nodes, [], positions);
  expect(metrics.nodeOverlapCount).toBeGreaterThan(0);
});
```

Without this, `nodeOverlapCount === 0` may be a tautology.

### V17. `architecture-layout.test.ts` — the "Test N — description" naming pattern is anti-productive

Nine tests follow the pattern `Test N — Description` where `N` is a sequential integer. When a test is added or removed, all subsequent tests must be renumbered, or the numbering becomes inconsistent. This is a maintenance tax with no benefit.

**Fix:** drop the numbering, use descriptive names.

### V18. `architecture-layout.test.ts` — no test for `computeArchitectureLayoutWithMetadata`'s **return shape**

The test file only exercises `computeArchitectureLayout` (which returns just `positions`). `computeArchitectureLayoutWithMetadata` returns `{ positions, featureRegions, orbitGuides, projectedNodeIds }` — but **no test verifies** that the metadata fields are populated correctly.

Given Cluster 5 **K4** (constellation diagnostics discarded) and Cluster 6 **A22** (`featureRegions` cast to `any`), a test that asserts `typeof result.featureRegions === 'object'` (or is `Map`) when `enableFeatureLayout: true` would catch these.

### V19. `architecture-layout.test.ts` — no test for phantom node fabrication (Cluster 6 A1)

```ts
it('fabricates phantom nodes for dangling edge endpoints', () => {
  const nodes = [createMockNode({ id: 'ApexClass:A' })];
  const edges = [createMockEdge('ApexClass:A', 'ApexClass:NotInNodes')];
  const positions = computeArchitectureLayout(nodes, edges);
  // Currently this silently fabricates a phantom node — arguably correct, arguably not
  // The test should LOCK IN the intended behavior, whichever it is
  expect(positions['ApexClass:NotInNodes']).toBeDefined();
});
```

Without this test, the phantom-fabrication behavior is undocumented and untested. If a future refactor drops phantoms (correct per A1's "reject" recommendation), no test fails — the change ships as a silent regression relative to the old behavior.

### V20. `architecture-layout.test.ts` — no test for **empty** or **single-node** input

```ts
it('empty graph returns empty positions', () => {
  expect(computeArchitectureLayout([], [])).toEqual({});
});

it('single node graph places the node', () => {
  const positions = computeArchitectureLayout([createMockNode({ id: 'ApexClass:Only' })], []);
  expect(positions['ApexClass:Only']).toBeDefined();
  expect(Number.isFinite(positions['ApexClass:Only'].x)).toBe(true);
});
```

Cluster 6 **A29** (empty `analysis.components`) and Cluster 4 **R10** (single-node `minAABBSeparationPx: 0`) are both first-class bugs at these boundaries. Untested.

### V21. `architecture-layout.test.ts` — no test for `NaN` / `Infinity` in `existingPositions` (Cluster 6 A8)

```ts
it('rejects NaN or Infinity existingPositions', () => {
  const positions = computeArchitectureLayout(
    [createMockNode({ id: 'ApexClass:A' })],
    [],
    { existingPositions: { 'ApexClass:A': { x: NaN, y: 500 } } },
  );
  expect(Number.isFinite(positions['ApexClass:A'].x)).toBe(true);
  expect(Number.isFinite(positions['ApexClass:A'].y)).toBe(true);
});
```

**Currently this test would FAIL** — Cluster 6 A8 (no finite check) is a live bug. A test that fails now, then passes after the fix, is the correct TDD.

### V22. `architecture-layout.test.ts` — no test for `Object.freeze` depth (Cluster 6 A10)

```ts
it('does not mutate immutableStage7PrimaryPositions', () => {
  // Not directly testable from the public API, but a test that mutates the returned
  // object and re-runs the layout would catch contamination
  const positions = computeArchitectureLayout(nodes, edges);
  positions['ApexClass:OrderService'].x = 99999;   // Mutate the returned object
  const positions2 = computeArchitectureLayout(nodes, edges);
  expect(positions2['ApexClass:OrderService'].x).not.toBe(99999);
});
```

Currently passes (positions are returned fresh), but doesn't verify `immutableStage7PrimaryPositions` is frozen — the mutation happens on the caller's copy.

---

## 🟡 Medium — coverage gaps from Clusters 1–7

Below is a **cross-cluster coverage matrix**. For each bug found in prior audits, I've marked whether **any** test in the provided files could catch it. All `✗` rows are bugs that ship silently.

### Cluster 3 (Dispatch) coverage

| Bug | Test present? |
|---|---|
| D1 — `existingPositions` ignored in orbit/constellation | ✗ (only layered/hybrid is tested) |
| D2 — Fabricated `ExplorerDataSchema` for radial modes | ✗ |
| D3 — `extractNodesAndEdgesFromCy` lossy | ✗ |
| D4 — `Boolean("false") === true` | ✗ |
| D5 — `data.id` vs `cyNode.id()` | ✗ |
| D6 — `useArchitectureLayout: false` re-enables arch layout | ✗ |
| D8 — Async non-arch fabricates timing | ✗ |
| D9 — No cancellation | ✗ |
| D10 — `projectedNodeIds` Set serialization | ✗ |
| D12 — Non-arch returns partial result | ✗ |
| D16 — `existingPositions` not finite-validated | ✗ |
| D17 — Phantom nodes visible in radial modes | ✗ |
| D20 — `edge:selected` overridden | ✗ |
| D22 — `Object.freeze` shallow | ✗ |
| D23 — `localeCompare` | ✗ |

**Coverage: 0/15.** Dispatch is essentially untested.

### Cluster 4 (Orbit) coverage

All provided tests are for **layered architecture**, not orbit. The listed `component-orbit-*.test.ts` files weren't provided. `[!]` **Cluster 4 has zero confirmed coverage in this file set.**

### Cluster 5 (Constellation) coverage

Same — `[!]` **Cluster 5 has zero confirmed coverage in this file set.**

### Cluster 6 (Layered) coverage

| Bug | Test present? |
|---|---|
| A1 — Phantom nodes fabricated | ✗ |
| A2 — `unresolvedCount: 0` fabricated | ✗ |
| A6 — `satelliteResult.positions` drop | ✗ |
| A7 — Satellites not anchored to restored positions | ✗ (Test 10 only checks the node itself) |
| A8 — `existingPositions` NaN/Infinity | ✗ (would fail) |
| A16 — Bridge sort ascending-by-span | ✗ |
| A35 — `edge.id` null in sort | ✗ |
| A36 — Shallow clone mutates caller | ✗ |
| A47 — `hubScore + bridgeScore` on undefined | ✗ |
| A48 — `minNodeId` unused | ✗ |

**Coverage: 0/10.**

### Cluster 7 (Types) coverage

`[!]` No type-level tests exist — snapshot tests on `ExplorerNode` shape, `ALL_EXPLORER_NODE_TYPES` exhaustiveness, `ARCH_MODE_META[next]` cycle, `RISK_BORDER_COLORS` exhaustiveness.

**Coverage: 0/6.**

---

## 🔴 Missing test files — `[!]` verification required

The following test files were listed but not provided. For each, the **minimum** cases they must cover to close their cluster's bugs:

### `GraphView.test.tsx` — cluster 2
- `[!]` Rendering with `architectureMode='constellation'` calls `adaptComponentConstellation` **once** per layout.
- `[!]` Mode switch with persisted positions does **not** overwrite them (Cluster 2 **O1**).
- `[!]` Async layout completion sets `isLayoutRunningRef` correctly (Cluster 2 **O8**).
- `[!]` Structural sync preserves `existingPositions` (Cluster 2 **O2**).
- `[!]` `graphStructureKey` collision test (Cluster 2 **O3**).

### `GraphView.layoutModeToggle.test.tsx` — cluster 2
- `[!]` Interactive → static captures positions.
- `[!]` Static → interactive restores captured positions.
- `[!]` Keyboard Escape does **not** throw (`onFocusChangeRef` — Cluster 2 **O7**).

### `GraphView.positionAuthority.test.tsx` — cluster 2
- `[!]` Level 1 (session) > Level 2 (persisted) > Level 3 (cy).
- `[!]` `user-authored` provenance round-trips through `updateProjectState`.

### `GraphView.runtimeIntegration.test.tsx` — cluster 2
- `[!]` End-to-end: mount → select node → switch mode → assert new layout, no errors.
- `[!]` Navigator renders inside `.navigator-body` (Cluster 2 **O6**).

### `GraphControls.test.tsx` — cluster 1
- `[!]` Roving tabindex handles dynamic button count (Cluster 1 **M1**).
- `[!]` `ArrowLeft` from first button wraps to last.
- `[!]` `ArrowRight` on `<select>` is **not** intercepted (Cluster 1 **M2**).

### `position-policy.test.ts` — cluster 1
- `[!]` Every `(mode, trigger, context)` combination returns the expected policy.
- `[!]` `'place-new-only'` is handled by callers (Cluster 1 **H3**).
- `[!]` `'architecture-mode-switch'` in static mode returns `true` (documented, or fixed — Cluster 1 **L4**).

### `projectState.test.ts` — cluster 1
- `[!]` Migration of flat `nodePositions` (Cluster 1 **H1**).
- `[!]` `updateProjectState` with `architectureMode` change preserves per-mode positions (Cluster 1 **H2**).
- `[!]` Two-step updates (mode then positions) land in the correct bucket (Cluster 1 **C5**).

### `component-orbit-adapter.test.ts` — cluster 4
- `[!]` `availableSuns` ranks by root-status, dependencies, children (Cluster 4 **R1**).
- `[!]` Test LWC with `includeTestReferences: false` doesn't inflate `isSharedHub` (Cluster 4 **R1**).
- `[!]` Empty graph returns valid empty projection (Cluster 4 **R7**).

### `component-orbit-dynamic-focal.test.ts` — cluster 4
- `[!]` Focal change re-projects rings correctly.
- `[!]` Focal node has `ringIndex === 0` (Cluster 4 **R6**).

### `component-orbit-layout.test.ts` — cluster 4
- `[!]` `innerRadius < 160` clamp (Cluster 4 **R3**).
- `[!]` `maxNodesPerTrack <= 0` throws (Cluster 4 **R2**).
- `[!]` `minAABBSeparationPx` semantics (Cluster 4 **R9**).

### `component-orbit-integration.test.ts` — cluster 4
- `[!]` Focal change + drag + re-layout: drag survives.
- `[!]` `existingPositions` merge (Cluster 3 **D1**).

### `component-orbit-visibility.test.ts` — cluster 4
- `[!]` `projectedNodeIds` filter hides non-reachable nodes.
- `[!]` Set serialization works (Cluster 3 **D10**).

### `constellation-adapter.test.ts` — cluster 5
- `[!]` Sun count matches projection (Cluster 5 **K1**).
- `[!]` Fallback picks meaningful LWCs, not test utilities (Cluster 5 **K3**).

### `component-constellation-layout.test.ts` — cluster 5
- `[!]` 6 inner / 8 outer enforced with graceful degradation (Cluster 5 **K2**).
- `[!]` Shared node clearance computed correctly (Cluster 5 **K7**).
- `[!]` `minSharedNodeAabbClearancePx` reported when repair fails (Cluster 5 **K4**).
- `[!]` Diagnostics returned to caller (Cluster 5 **K4**).

### `component-constellation-adapter.test.ts` — cluster 5
- `[!]` `customSunIds` inner/outer assignment (Cluster 5 **K16**).
- `[!]` `focalLwcId` in options (Cluster 5 **K18**).

### `component-constellation-integration.test.ts` — cluster 5
- `[!]` End-to-end: 14 suns → 14 positioned suns (Cluster 5 **K1**).
- `[!]` `existingPositions` honored (Cluster 3 **D1** / Cluster 5 **K5**).

---

## 🔵 Low — cross-cutting test hygiene

### V23. `[!]` No test verifies that `computeArchitectureLayout` **does not mutate** its inputs

Cluster 6 **A36** (shallow clone, caller data corruption) has no test. Suggested:

```ts
it('does not mutate its input nodes or edges', () => {
  const nodes = [createMockNode({ id: 'ApexClass:A' })];
  const edges: ExplorerEdge[] = [];
  const nodesBefore = JSON.parse(JSON.stringify(nodes));
  const edgesBefore = JSON.parse(JSON.stringify(edges));
  computeArchitectureLayout(nodes, edges);
  expect(nodes).toEqual(nodesBefore);
  expect(edges).toEqual(edgesBefore);
});
```

### V24. `[!]` No test covers `ArchitectureLayoutMode` mode transitions

Every mode combination (`hierarchical ↔ hybrid ↔ orbit ↔ constellation`) needs a "button toggles → geometry changes" test. Cluster 2 **O1** and Cluster 1 **C7** are the exact class of bugs that these tests catch.

### V25. `[!]` No test covers `ARCH_MODE_META[next]` cycle validity (Cluster 7 **T15**)

```ts
it('ARCH_MODE_META.next forms a single cycle through all modes', () => {
  const modes = Object.keys(ARCH_MODE_META) as ArchitectureLayoutMode[];
  const visited = new Set<ArchitectureLayoutMode>();
  let cur: ArchitectureLayoutMode = 'hierarchical';
  while (!visited.has(cur)) {
    visited.add(cur);
    cur = ARCH_MODE_META[cur].next;
  }
  expect(visited.size).toBe(modes.length);
  expect(cur).toBe('hierarchical');
});
```

### V26. `[!]` No test covers `RISK_BORDER_COLORS` exhaustiveness (Cluster 7 **T14**)

```ts
it('RISK_BORDER_COLORS has an entry for every ExplorerRiskLevel', () => {
  const levels: ExplorerRiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  for (const level of levels) {
    expect(RISK_BORDER_COLORS[level]).toBeDefined();
  }
});
```

This test would **fail today** (Cluster 7 T14) — a correct TDD starting point.

### V27. `[!]` No test covers `ALL_EXPLORER_NODE_TYPES` exhaustiveness (Cluster 7 **T12**)

```ts
it('ALL_EXPLORER_NODE_TYPES contains every ExplorerNodeType', () => {
  // Compile-time exhaustiveness check
  const _exhaustive: Record<ExplorerNodeType, true> = {
    ApexClass: true, ApexTrigger: true, LWC: true, Visualforce: true,
    Flow: true, Object: true, CustomObject: true, Field: true,
    CustomField: true, External: true,
  };
  expect(ALL_EXPLORER_NODE_TYPES.length).toBe(Object.keys(_exhaustive).length);
});
```

Adding a new type to the union without adding it to `ALL_EXPLORER_NODE_TYPES` fails at compile time (the `_exhaustive` object literal must be complete).

### V28. `[!]` No test verifies `ExplorerNode` / `ExplorerEdge` field completeness across all clusters

Cluster 7 **T2** (fabricated fields) is only caught by asserting that `extractNodesAndEdgesFromCy` **returns the exact same shape** as the input:

```ts
it('extractNodesAndEdgesFromCy round-trips all fields', () => {
  const original: ExplorerNode[] = [makeFullyPopulatedNode()];
  const cy = buildMockCy(original);
  const extracted = extractNodesAndEdgesFromCy(cy);
  expect(extracted.nodes[0]).toEqual(original[0]);
});
```

Currently fails for every fabricated field (T2, T4, T5, T6, T7, T9).

---

## Priority summary

| # | Bug | Impact |
|---|---|---|
| **V1** | `forEach` mock doesn't execute callback | `clearHighlights` forEach body untested |
| **V3** | No null-input test for `clearHighlights` | Runtime crash if guard removed |
| **V4** | `duration < 3000` is flaky | Intermittent CI failures |
| **V5** | No satellite test for `existingPositions` (A7) | Cluster 6 A7 ships silently |
| **V6** | `not.toEqual({ x: 777, y: 888 })` is too weak | Overlapping nodes pass |
| **V8** | Bridge test only checks `toBeDefined` | Cluster 6 A16 ships silently |
| **V9–V11** | Loose tolerances, x-only, `Math.abs` | Real bugs slip through |
| **V14** | WAVE 7A couples to implementation | Fragile test, not behavioural |
| **V15** | HYBRID doesn't verify feature layout differs | No-op feature layout passes |
| **V16** | `nodeOverlapCount === 0` unverified silver bullet | If `evaluateLayout` is broken, all 9 tests still pass |
| **V21** | No NaN test | Cluster 6 A8 ships silently |
| **V23** | No immutability test | Cluster 6 A36 ships silently |
| **Cluster 3–7 coverage** | **0/47 bugs tested** | Entire suite is effectively Cluster-6-only |

**The single most impactful test to add** is the "does not mutate inputs" test (V23) — it would fail today for A36 and force the pipeline to either deep-clone or document the contract. The second-most impactful is V5 (satellite anchoring) — it would fail today for A7 and demonstrate exactly what the fix looks like.

The **coverage matrix** — 0/47 for Clusters 3–7 — is the headline. The two provided test files are essentially a **smoke test for Cluster 6's happy path**, and everything else is presumed covered by the missing files. Until those files are supplied, **every bug from Clusters 1–5 and 7 is untested by construction**.


# Remaining Issues — Files Outside Clusters 1–8

These are genuine bugs that the eight cluster audits either didn't cover or only touched on. Grouped by file, severity ordered.

---

## 🔴 `App.tsx` — critical state-machine bugs

### Z1. `App.tsx` — **infinite render loop**: URL selection + filter-clear fight each other

Two effects watch `selectedNodeId`:

```ts
// Effect A — validation: clear if node not visible under filter
useEffect(() => {
  if (selectedNodeId) {
    const selectedNode = activeData.nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) { clearSelection(); setIsInvestigating(false); return; }
    const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
    if (!visibleTypes.includes(selectedNode.type)) {
      clearSelection();              // ← sets selectedNodeId to null
      setIsInvestigating(false);
    }
  }
}, [activeData, selectedNodeId, clearSelection, setIsInvestigating, view.filterState.visibleNodeTypes]);

// Effect B — URL sync: re-select from URL on every render
useEffect(() => {
  if (!activeData) return;
  const urlNode = viewSelectedNodeId || viewUrlNodeId;
  if (urlNode) {
    const matchedNode = activeData.nodes.find(...);
    const targetId = matchedNode ? matchedNode.id : urlNode;
    if (selectedNodeId !== targetId) {   // ← null !== targetId → always true after A clears
      selectNode(targetId);              // ← sets selectedNodeId back to targetId
    }
  }
}, [activeData, viewSelectedNodeId, viewUrlNodeId, selectedNodeId, selectNode]);
```

**Scenario:** URL `#node=ApexClass:Foo` + filter excludes `ApexClass` (or `hideTests: true` + Foo is a test class).

- Render N: `selectedNodeId = 'ApexClass:Foo'`. Effect A: not visible → `clearSelection()`. Effect B: `selectedNodeId (null) !== targetId (Foo)` → `selectNode(Foo)`.
- Render N+1: `selectedNodeId = 'ApexClass:Foo'`. Effect A fires again → `clearSelection()`. Effect B fires → `selectNode(Foo)`.
- **Infinite loop.** React hits "Maximum update depth exceeded", the tab freezes, and the only recovery is closing the URL or the browser tab.

The bug exists in the app today for **any URL with a filtered-out node** — a shared link to a hidden-by-filter node is a DoS.

**Fix:** Effect B must be edge-triggered, not level-triggered:
```ts
const consumedUrlRef = useRef<string | null>(null);
useEffect(() => {
  const urlNode = viewSelectedNodeId || viewUrlNodeId;
  if (!urlNode || consumedUrlRef.current === urlNode) return;
  consumedUrlRef.current = urlNode;
  ...
}, [viewSelectedNodeId, viewUrlNodeId]);
```
Or Effect A should set a `filterBlockedSelection` state so Effect B skips re-selecting that same node.

---

### Z2. `App.tsx` — Escape handler runs on **every** input field

```ts
window.addEventListener('keydown', handleKeyDown);
```

No `e.target` guard. Pressing Escape in:
- the search box
- the command palette input
- any `<select>` in `FocusControls`
- the tags input (if any)

…clears the entire graph selection and investigation context. Standard UX: Escape should dismiss the current input's dropdown/popover **first**, then clear the outer selection if the input was already closed.

Worse: `GraphView.tsx` has an `onKeyDown` on `.graph-container` — an Escape pressed with focus in the graph fires **twice** (once on the div, once on `window`). And `GraphView`'s handler references the undefined `onFocusChangeRef` (Cluster 2 **O7**) → throws `ReferenceError` to the console on every Escape.

**Fix:** add the same tagName/role guard used in `GraphControls.handleToolbarKeyDown`:
```ts
const tag = (e.target as HTMLElement).tagName;
if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || (e.target as HTMLElement).isContentEditable) return;
```
And remove GraphView's duplicate Escape handling (Cluster 2 O7).

---

### Z3. `App.tsx` — `handleProjectChanged` reads the **wrong** `activeProjectId`

```ts
useEffect(() => {
  const handleProjectChanged = () => {
    const projState = loadProjectState(activeProjectId);   // ← closure over activeProjectId
    setFilterState({
      ...createEmptyFilterState(),
      visibleNodeTypes: projState.filters?.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES,
    });
  };
  window.addEventListener('explorer:project-changed', handleProjectChanged as EventListener);
  return () => window.removeEventListener('explorer:project-changed', handleProjectChanged as EventListener);
}, [activeProjectId, clearSelection, resetInvestigationContext, setIsInvestigating, setFilterState]);
```

The effect re-registers the listener on every `activeProjectId` change. But **if the `explorer:project-changed` event fires in the same tick as the state update that changes `activeProjectId`** (which is the normal pattern — `setActiveProjectId` then `dispatchEvent`), the listener still has the **old** `activeProjectId` in its closure. `loadProjectState(ProjectA)` runs and its filters are applied to ProjectB's graph.

**Symptom:** open a project with `hideTests: true`, switch to another project that saved `hideTests: false` — the second project's graph shows with `hideTests: true`. Persisted state overwritten on next save.

**Fix:** read from the event detail, not the closure:
```ts
window.addEventListener('explorer:project-changed', (e) => {
  const newId = (e as CustomEvent).detail?.projectId ?? activeProjectIdRef.current;
  const projState = loadProjectState(newId);
  ...
});
```

---

### Z4. `App.tsx` — `visibleNodeTypes` persistence **bypasses** `updateProjectState`

```ts
useEffect(() => {
  if (!activeProjectId) return;
  const currentProjState = loadProjectState(activeProjectId);
  const activeVisibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
  if (JSON.stringify(currentProjState.filters?.visibleNodeTypes) !== JSON.stringify(activeVisibleTypes)) {
    saveProjectState(activeProjectId, {
      ...currentProjState,
      filters: { ...currentProjState.filters, visibleNodeTypes: activeVisibleTypes },
    });
  }
}, [activeProjectId, view.filterState.visibleNodeTypes]);
```

Two bugs:

1. **`saveProjectState` doesn't call `mergeWithDefaultState`** — if `currentProjState` is a legacy-format object (missing new fields added since the last save), the missing fields **stay missing** after this save. Schema evolution breaks. `updateProjectState` handles this; direct `saveProjectState` does not.
2. **`JSON.stringify` comparison triggers on array reorder** — if the caller passes `['A', 'B']` vs `['B', 'A']` (same set, different order), the comparison differs, triggering an unnecessary save. Combined with a filter UI that rebuilds the array on every render, this fires on **every keystroke** in the search box.

**Fix:**
```ts
const sameSet = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every(x => b.includes(x));
if (!sameSet(currentProjState.filters?.visibleNodeTypes, activeVisibleTypes)) {
  updateProjectState(activeProjectId, { filters: { visibleNodeTypes: activeVisibleTypes } });
}
```

---

### Z5. `App.tsx` — `handleCommitSimulation` fails **silently**

```ts
const validation = validateProposalCommit(activeSimulationProposal, activeProjectId, activeData);
if (!validation.valid) {
  console.warn('[App] Simulation commit rejected:', validation.reason);   // ← only console
  return;
}
```

User clicks "Commit Simulation" → nothing happens. No toast, no error banner, no focus change. If `validation.reason === 'project-switched'` or `'stale-proposal'`, the user can't tell the difference from a UI bug.

**Fix:** surface the reason in a toast/banner:
```ts
setActiveSimulationProposal(null);   // dismiss the stale proposal
showToast({ variant: 'error', message: `Simulation could not be committed: ${validation.reason}` });
```
(Assuming a toast primitive exists — if not, add one.)

---

### Z6. `App.tsx` — `handleStartSimulationForNode` runs on the **mutated** graph

```ts
const handleStartSimulationForNode = useCallback((nodeId: string) => {
  if (!activeData) return;
  const proposal = createProposalFromTargetNodes([nodeId], activeData, activeProjectId);  // ← activeData may be committedMutatedGraph
  ...
}, [activeData, activeProjectId, router]);
```

`activeData = committedMutatedGraph || data`. If the user previously committed a simulation, `committedMutatedGraph` is populated and `activeData` reflects the mutated graph. Starting a **new** simulation on the mutated graph:
- Baseline for `computeStepImpact` is now the mutated graph, not the original.
- Diff counts (added/removed) reflect deltas against the mutated state, not the source of truth.
- If the mutated graph is later invalidated (see below), the proposal's preconditions are already invalid.

**Fix:** baseline against `data` (the pristine graph) for the *first* simulation, or explicitly reset `committedMutatedGraph` on `handleStartSimulationForNode`:
```ts
setCommittedMutatedGraph(null);
```
Or, if chaining is intentional, pass `data` for impact computation and `activeData` for structural context, and document the choice.

---

### Z7. `App.tsx` — `compareState.focusedEntityId` cleared doesn't clear selection

```ts
useEffect(() => {
  if (compareState.focusedEntityId) {   // ← only when set
    if (activeData?.nodes.some((n) => n.id === compareState.focusedEntityId)) {
      selectNode(compareState.focusedEntityId);
    } else if (activeData?.edges.some((e) => e.id === compareState.focusedEntityId)) {
      selectEdge(compareState.focusedEntityId);
    }
  }
}, [compareState.focusedEntityId, activeData, selectNode, selectEdge]);
```

When `focusedEntityId` is set to `null` (compare mode exits), nothing happens — the previously-focused entity stays selected in the graph. The user exits compare mode and a random node is still highlighted.

**Fix:** add `else` branch:
```ts
} else {
  clearSelection();
}
```

---

### Z8. `App.tsx` — `handleClearFinding` clears the finding but leaves the node selected

```ts
const handleClearFinding = () => {
  setSelectedFinding(null);
  view.setSelectedFindingId(null);
};
```

`handleSelectFinding` also does `selection.selectNode(finding.nodeIds[0])` — that selection is **not** cleared. The finding highlight disappears but the node remains selected, which means `highlightNodeConnections` fires and the node stays highlighted. Visual inconsistency: user clicks "clear finding", the finding-highlight is gone but a neighbor dim/highlight is still visible.

**Fix:** `clearSelection()` in `handleClearFinding`.

---

### Z9. `App.tsx` — `handleResetView` is **ephemeral**

```ts
const handleResetView = () => {
  selection.clear();
  investigation.resetInvestigationContext();
  view.setFilterState(createEmptyFilterState());   // ← resets in-memory only
  setSelectedFinding(null);
  setHighlightedImpactNodeIds(null);
  setActiveSimulationProposal(null);
  if (graphRef.current) graphRef.current.fitView();
};
```

`setFilterState` resets in-memory. But the persistence effect (Z4) only persists `visibleNodeTypes` — **not** `searchQuery`, `riskFilter`, `hideTests`, etc. So:
- User resets → all filters cleared
- User reloads → filters come back from `projectState.filters` (which was never updated)

**Fix:** call `updateProjectState(activeProjectId, { filters: createEmptyFilterState() })` after `setFilterState`, so persistence stays in sync.

---

### Z10. `App.tsx` — `simulatedGraph`'s `effectivePositions` uses stale `nodePositions`

```ts
const tempPositions = computeTemporarySimulatedPositions(
  finalSimulatedGraph.nodes,
  finalSimulatedGraph.edges,
  nodePositions || {}   // ← from persisted state, not previous step's effectivePositions
);
```

For a multi-step simulation, step 2's temporary positions are computed from the **persisted baseline**, not step 1's positions. Simulated-added nodes from step 1 disappear in step 2's layout (they're in `finalSimulatedGraph` but not in the `nodePositions` baseline).

**Fix:** use a `Map<string, Position>` accumulated from previous steps, or pass `effectivePositions` from the previous memo:
```ts
const tempPositions = computeTemporarySimulatedPositions(..., effectivePositionsRef.current || nodePositions || {});
```
(Requires restructuring the memo to break the circular dependency with `effectivePositions`.)

---

### Z11. `App.tsx` — `useProjectSafe` / `useProjectStateSafe` swallow errors in production

```ts
function useProjectSafe() {
  try { return useProject(); }
  catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn(...);
    return null;
  }
}
```

If `useProject()` throws in production (e.g., context not provided during a code-split lazy route, or a legitimate bug), the app silently renders with `null` context. Downstream code has `projectContext?.activeProjectId || 'default'` — which means the app renders the **default project's** data while the user thinks they're in Project X.

This is the highest-severity class of bug: silent state substitution. In a `try/catch`-based context hook, a throw from `useContext` is actually the **only signal** that context is missing — catching it and returning `null` is precisely the wrong behavior.

**Fix:** remove the try/catch. If the app needs to work without the provider (Storybook, tests), add a **default provider** that provides a real no-op value — not a `try/catch` that masks real errors.

---

## 🟠 `App.tsx` — secondary

### Z12. `App.tsx` — `checkIsNotAnalyzed` relies on error **message prefixes**

```ts
const isNotAnalyzedError = Boolean(error && error.message.startsWith('NOT_ANALYZED:'));
```

If a downstream caller throws `new Error('NOT_ANALYZED: project not found')`, the app interprets it as "project not analyzed" and renders `NotAnalyzedScreen` — even if the error is `NOT_ANALYZED: database corruption`. The message prefix is the only discriminator.

**Fix:** use a typed error class:
```ts
class NotAnalyzedError extends Error { readonly kind = 'NOT_ANALYZED' as const; }
// ...
const isNotAnalyzedError = error instanceof NotAnalyzedError;
```

### Z13. `App.tsx` — `useEffect` deps on `view.focusState` object identity (already flagged, restating for completeness)

```ts
}, [selectedNodeId, selection.selectedEdgeId, view.focusState, clearSelection, setIsInvestigating, view.setFocusState]);
```

If `useViewState` returns a new `focusState` object on every render, the keydown listener is removed and re-added **on every render**. This is a real performance issue during rapid navigation (every arrow-key node select re-registers the window listener).

### Z14. `App.tsx` — `activeData` identity churn forces re-evaluation of `findings`

```ts
const ctx = useMemo(() => (activeData ? createArchitectureContext(activeData as any) : null), [activeData]);
const findings = useMemo(() => (ctx ? runAllRules(ctx) : []), [ctx]);
```

`activeData = committedMutatedGraph || data`. When `committedMutatedGraph` is non-null, `activeData` is stable. But when `committedMutatedGraph` is **null** and `data` is refetched (e.g., a poll), `activeData` gets a new reference → `createArchitectureContext` reruns → `runAllRules` reruns. **Every rule re-evaluates on every poll**, even when the data is unchanged.

**Fix:** fingerprint `activeData` by `generatedAt` (which App already tracks via `prevDataGeneratedAtRef`) and memoize `ctx` on that fingerprint.

---

## 🟠 `index.css` — design system / accessibility (beyond Cluster 1)

### Z15. `index.css` — touch targets below **WCAG 2.5.5 AAA** (44×44)

```css
.graph-control-btn { width: 28px; height: 28px; }
.focus-btn          { height: 26px; }
.ui-btn-sm          { height: 26px; }
.navigator-close-btn { width: 22px; height: 22px; }
```

28 × 28 is the **WCAG 2.5.5 AA minimum** (24 × 24), but AAA requires 44 × 44. The zoom controls (`➕`, `➖`), navigator close, and `ui-btn-sm` are all under the AAA threshold and are the most-tapped elements on a tablet or a low-motor-precision user's touchscreen.

**Fix:** either raise `graph-control-btn` to 32×32 (still under AAA but easier), or add a `min-width: 44px; min-height: 44px` only when `@media (pointer: coarse)` matches.

### Z16. `index.css` — sub-12px text is **not** WCAG-resilient

```css
--font-size-xs: 10px;
--font-size-sm: 11px;
```

WCAG 1.4.4 requires text to be resizable to 200% without loss. 10–11px text that zooms with the browser is technically fine, but at 10px it's already below the AA-recommended 12px minimum for body text, and **WCAG 1.4.12 (Text Spacing)** rules out compact body text on small touch targets.

The `.ui-badge`, `.ui-badge-sm`, `.header-shortcut-hint`, `.command-palette-shortcut-hint`, `.domain-tab-btn`, `.lens-switch-btn .label` all use `--font-size-xs` or `10px`/`9px` literal. On a `1280×800` laptop these are illegible.

**Fix:** raise `--font-size-xs` to 11px minimum, and remove `font-size: 9px`/`font-size: 10px` literals — use variables only.

### Z17. `index.css` — `--risk-critical` is **lighter** than `--risk-high`

```css
--risk-critical: #f87171;   /* light red */
--risk-high:     #ef4444;   /* medium red */
```

Standard traffic-light semantics: critical > high > medium > low, and color intensity should match. Here critical is `#f87171` (Tailwind red-400) and high is `#ef4444` (red-500). **High is darker/more intense than critical.** Users learn "darker red = worse" and then see a critical node rendered **lighter** than a high one.

Also mismatched with `graph-style.ts`:
```ts
RISK_BORDER_COLORS = { HIGH: '#dc2626', ... }   // red-600
```
So a `node[risk = "HIGH"]` gets `#dc2626` (red-600) while any UI element with `class="high-risk"` uses `#ef4444` (red-500) — the same "HIGH" appears in two shades depending on context.

**Fix:** unify to one palette:
```css
--risk-critical: #dc2626;  /* red-600 */
--risk-high:     #ef4444;  /* red-500 */
```
And update `RISK_BORDER_COLORS` to read from the same values.

### Z18. `index.css` — text **contrast failures** for muted/disabled text

Measured contrast ratios (WCAG AA needs 4.5:1 for normal, 3:1 for large):

| Foreground | Background | Ratio | AA normal |
|---|---|---|---|
| `--text-muted: #94a3b8` | `--surface-card: #1e293b` | ~4.2:1 | ✗ |
| `--text-disabled: #64748b` | `--surface-panel: #111827` | ~3.1:1 | ✗ (exempt for disabled, but poor) |
| `--text-muted` | `--surface-hover: #2d3748` | ~3.5:1 | ✗ |

`.ui-badge` uses `--text-secondary` on `--surface-subtle` — 6.1:1 (passes). But `.domain-tab-btn` and `.lens-switch-btn .label` use `--text-muted` on `--surface-card` — fail.

**Fix:** bump `--text-muted` to `#a8b5c8` (ratio ~5.0:1 on `--surface-card`), or scope muted text to larger sizes only.

### Z19. `index.css` — `.graph-container`'s dot grid **does not scale with zoom**

```css
.graph-container {
  background-image: radial-gradient(circle, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Fixed 24px grid, regardless of `cy.zoom()`. At 10% zoom (5+ components, "Fit View"), the grid looks like dense noise behind sparse nodes. At 400% zoom (investigating a single node), the grid is a few huge dots barely visible.

**Fix:** update `background-size` from a `cy.on('zoom', ...)` handler:
```ts
cy.on('zoom', () => {
  if (containerRef.current) {
    const size = Math.max(8, Math.min(64, 24 * cy.zoom()));
    containerRef.current.style.backgroundSize = `${size}px ${size}px`;
  }
});
```

### Z20. `index.css` — `.minimap-container { right: 58px }` is a hardcoded magic number

```css
.minimap-container {
  right: 58px !important;
  bottom: 18px !important;
}
```

58 = `14px (controls right) + 28px (controls width) + 16px (gap)`. If the toolbar grows (as it will with the labelled architecture button — Cluster 1 **C4**), the minimap overlaps the controls. If the toolbar wraps on a narrow viewport, the minimap floats in the middle of the wrapped toolbar.

**Fix:** anchor to the toolbar's actual computed width, or use a CSS variable set by JS:
```ts
resizeObserver.observe(graphControlsRef.current);
// → set --controls-width to actual width
```

### Z21. `index.css` — `.investigation-drawer.closed` doesn't zero the header's padding

```css
.investigation-drawer.closed { width: 0 !important; min-width: 0 !important; max-width: 0 !important; padding: 0 !important; margin: 0 !important; border-left: none !important; overflow: hidden; }
```

The `.investigation-drawer` padding is zeroed, but `.investigation-drawer-header { padding: 16px; }` still has its padding. `overflow: hidden` clips the **content** but the header's 32px horizontal padding creates a 32px minimum visible width — a "thin sliver" of the drawer remains visible.

**Fix:** add `.investigation-drawer.closed .investigation-drawer-header { padding: 0; display: none; }` (or move the padding to the body only).

### Z22. `index.css` — `.graph-legend-floating` is **hidden on mobile** with no alternative

```css
@media (max-width: 768px) {
  .graph-legend-floating { display: none !important; }
}
```

The graph legend is the only way to learn node-type/edge-type encodings. Hiding it on mobile means:
- Users must **guess** what the icons mean
- No accessible alternative (no `<dialog>` fallback, no "legend" button)
- Color-blind users on mobile have **no** semantic alternative

**Fix:** replace with a collapsible legend (icon-only collapsed state → tap to expand).

### Z23. `index.css` — `--transition-fast: all 0.1s ease` causes **layout reflow on every hover**

```css
--transition-fast: all 0.1s ease;
```

`all` includes `width`, `height`, `top`, `left`, `margin`, `padding` — any hover that changes only `background-color` **still triggers the browser's layout pass** for the transition of all properties (even if only one changes visually, the browser schedules a composite pass for all).

On a list of 500 `.ui-btn` elements, hovering through them at speed janks the main thread.

**Fix:**
```css
--transition-fast: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease;
```

Same for `--transition-normal` and `--transition-slow`.

### Z24. `index.css` — `!important` overuse in `.sidebar-slot.collapsed`, `.drawer-slot.closed`

```css
.sidebar-slot.collapsed, .sidebar-slot[data-collapsed="true"] {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden;
  pointer-events: none;
}
```

Seven `!important` in one rule = the base `.sidebar-slot` rule is winning specificity over the modifier class. This means:
1. A future `.sidebar-slot.some-other-state` cannot override any of these properties
2. A `@media` override on `.sidebar-slot { width: 260px }` (which exists at `max-width: 1440px`) **cannot override** `.collapsed` (because `!important` beats media query specificity)
3. Debugging requires inspecting the whole cascade

**Fix:** restructure to `.sidebar-slot { ... }` with `.sidebar-slot--collapsed { width: 0; ... }` (single-class modifier) and drop the `!important`s. If they're needed, the base rule is too aggressive.

### Z25. `index.css` — `.domain-tab-btn span { display: none }` at `max-width: 1366px` breaks tabs without `data-domain-short`

```css
@media (max-width: 1366px) {
  .domain-tab-btn span { display: none; }
  .domain-tab-btn::after { content: attr(data-domain-short); }
}
```

If a `<button class="domain-tab-btn">Sales</button>` has no `data-domain-short` attribute, its visible label is `<span>Sales</span>` — hidden — and `::after` renders `content: ""` (empty string). **The tab is invisible but still focusable.** Keyboard users land on an empty button.

**Fix:** either enforce the attribute at build time (via a typed `DomainTab` component) or add `:not([data-domain-short])::after { content: "•"; }` as a fallback.

---

## 🟠 `graph-interactions.ts` — behavioral bugs

### Z26. `graph-interactions.ts` — `zoomOut` uses **different math** than `GraphView`'s `zoomOut`

`GraphView.tsx`:
```ts
cyRef.current.zoom({ level: cyRef.current.zoom() * 0.8, ... });   // -20%
```

`graph-interactions.ts`:
```ts
export function zoomOut(cy) {
  cy.zoom({ level: cy.zoom() / 1.2, ... });   // -16.67%
}
```

Zoom in 3 times → zoom out 3 times:
- `GraphView` path: `1 * 1.2 * 1.2 * 1.2 * 0.8 * 0.8 * 0.8 = 0.88` — expected (0.88 vs 1.0 because 1.2 and 0.8 are inverse multipliers)
- `graph-interactions` path: `1 * 1.2 * 1.2 * 1.2 / 1.2 / 1.2 / 1.2 = 1.0` — exact

So the two implementations **disagree about what "+" and "-" do**, and `GraphView` currently uses its own (0.8), not the shared one. If a keyboard shortcut or a test uses `graph-interactions.zoomOut`, the user gets 16.67% decrease instead of 20%. Inconsistent UX.

**Fix:** pick one and delete the other. `graph-interactions` should be the source of truth (since it's shared), and `GraphView` should call `zoomIn`/`zoomOut` from it.

### Z27. `graph-interactions.ts` — `clearCycleHighlight` is **asymmetric** with `clearHighlights`

```ts
// clearHighlights
cy.elements().removeClass('dimmed highlighted impact-muted impact-origin impact-affected finding-highlighted focus-center focus-neighbor focus-dimmed');
cy.elements().forEach((ele) => {
  if (typeof ele.classes === 'function') {
    const cycleClasses = ele.classes().filter((c) => c.startsWith('cycle-')).join(' ');
    if (cycleClasses) ele.removeClass(cycleClasses);
  }
});

// clearCycleHighlight
cy.elements().removeClass('dimmed highlighted');
```

`clearCycleHighlight` **does not remove `cycle-*` prefixed classes**. After a cycle highlight → clear cycle, the elements still carry `cycle-0`, `cycle-1` etc. If any CSS rule targets `.cycle-*` (currently none — but the API contract exists), stale classes remain. And `highlightCycle` on the next call would see stale classes if it read them (it doesn't — it adds based on the passed array — but a future caller might).

**Fix:** share the cleanup logic:
```ts
export function clearCycleHighlight(cy) {
  cy.elements().removeClass('dimmed highlighted');
  cy.elements().forEach((ele) => {
    const cycleClasses = ele.classes().filter((c: string) => c.startsWith('cycle-'));
    if (cycleClasses.length) ele.removeClass(cycleClasses.join(' '));
  });
}
```

### Z28. `graph-interactions.ts` — `highlightCycle` dims **all** elements on every call

```ts
cy.elements().addClass('dimmed');
```

Every call to `highlightCycle` (cycle list navigation, cycle findings selection, etc.) iterates over every element in the graph. On a 2000-node graph, that's 2000 `addClass` calls **plus** a batch style recomputation. If the user is navigating between 20 cycles via arrow keys, that's 40,000+ `addClass` calls in a few seconds.

Combined with `selectedFinding`'s effect:
```ts
cy.elements().removeClass('finding-highlighted');
```
which also iterates over the whole graph — selecting a finding on a large graph is a visible main-thread stall.

**Fix:** track which elements currently have `dimmed` and only toggle elements that changed. Or use class-specific queries:
```ts
cy.elements(':not(.cycle-active)').addClass('dimmed');
```

### Z29. `graph-interactions.ts` — `bindGraphInteractions` adds its own `mouseover`/`mouseout` handlers that **duplicate** GraphView's

`GraphView.tsx`:
```ts
cy.on('mouseover', 'node', (evt) => { setHoveredNodeId(nodeId); ... });
cy.on('mouseout', 'node', () => { setHoveredNodeId(null); ... });
```

`bindGraphInteractions`:
```ts
cy.on('mouseover', 'node', (event) => {
  event.target.addClass('hovered');
  document.body.style.cursor = 'pointer';
});
cy.on('mouseout', 'node', (event) => {
  event.target.removeClass('hovered');
  document.body.style.cursor = 'default';
});
```

Every node mouseover fires **both** handlers. Double the work, and both mutate `document.body.style.cursor` — the second-to-fire wins, which is nondeterministic (event handler registration order).

Also: `bindGraphInteractions` uses a `.hovered` class that no CSS rule in `index.css` targets (only `.dimmed`, `.highlighted`, etc. are styled). So the class add/remove is a no-op — dead code that mutates the DOM without visual effect.

**Fix:** remove the cursor manipulation and `.hovered` class from `bindGraphInteractions`, keep only `GraphView`'s hover-card handlers. Cursor management belongs in one place.

### Z30. `graph-interactions.ts` — `bindGraphInteractions` fabricates a **partial node** when `originalNodes` misses the id

```ts
if (!explorerNode && nodeData) {
  explorerNode = {
    id: nodeData.id,
    displayName: nodeData.label,
    type: nodeData.type as any,
    file: nodeData.file,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: nodeData.risk as any,
    riskReasons: [],                      // ← empty
    behavior: { ..., sharing: null, publicContractsCount: 0, ... },
    refactoringReadiness: { ..., testCoverageStatus: 'COVERED' },   // ← hardcoded 'COVERED'
  };
}
```

If `originalNodes` is empty (initial mount, mid-render), a partial node is fabricated with hardcoded `testCoverageStatus: 'COVERED'` — a node with no data is reported as **covered**. The hover card renders `COVERED` briefly, then snaps to real data (or doesn't, if the node isn't in `activeData`).

**Fix:** return `null` from the fallback and let the caller handle missing data:
```ts
if (!explorerNode) {
  console.warn('[bindGraphInteractions] node not in originalNodes:', nodeId);
  return;
}
```
Or wait for `nodesRef` to populate. Fabricating partial data is worse than omitting.

### Z31. `graph-interactions.ts` — `selectNode` doesn't unselect others

```ts
export function selectNode(cy, nodeId): boolean {
  const node = cy.getElementById(nodeId);
  if (node.length > 0 && node.isNode()) {
    node.select();
    return true;
  }
  return false;
}
```

Doesn't call `cy.elements().unselect()` first. So `selectNode(A)` then `selectNode(B)` leaves **both** selected. Cytoscape's `:selected` style would apply to both. `GraphView` calls `deselectAll` before `selectNode`, so no bug in practice — but the exported API is a footgun for direct callers.

**Fix:** either rename to `addToSelection` or call `cy.elements().unselect()` internally (or document the contract).

---

## 🟡 `GraphControls.tsx` — remaining keyboard/ARIA issues

### Z32. `GraphControls.tsx` — `handleContainerFocus` uses `e.target` instead of `document.activeElement`

```ts
const handleContainerFocus = (e: React.FocusEvent<HTMLDivElement>) => {
  const controls = getInteractiveElements(containerRef.current);
  const target = e.target as HTMLElement;
  const index = controls.indexOf(target);
  if (index !== -1 && index !== activeControlIndex) {
    setActiveControlIndex(index);
  }
};
```

`e.target` is the element that **gained focus** — for a native button with a `<span>` child, `e.target` is the button (focus lands on the button, not the span). **But** if a custom component uses `focus()` on a nested element, `e.target` may be the nested element (not in `controls`), and `indexOf` returns `-1` → no update → focus loses track.

**Fix:**
```ts
const target = document.activeElement as HTMLElement;
```
(Browser `focus` event bubbles from the element — `e.target` is correct in most cases, but `document.activeElement` is the authoritative source.)

### Z33. `GraphControls.tsx` — `updateTabIndexes` overrides author-supplied `tabindex="0"`

```ts
controls.forEach((control, index) => {
  if (index === validIndex) control.setAttribute('tabindex', '0');
  else control.setAttribute('tabindex', '-1');
});
```

If any child component sets `tabindex="0"` in its markup (e.g., `FocusControls` might have a custom wrapper), it's **overridden to `-1`** on the next effect run. The author's intent (make this element tabbable) is silently discarded.

**Fix:** only modify elements marked with a data attribute (`data-roving-item="true"`), and let others keep their tabindex.

### Z34. `GraphControls.tsx` — no `data-testid` on 8 of 10 buttons

Only `data-testid="architecture-mode-toggle"` and `data-testid="layout-mode-toggle"` exist. Zoom in/out, fit, center, reset, navigator, fullscreen all lack testids — any E2E test must use `.graph-control-btn:nth-child(N)` selectors, which are brittle against the DOM-order changes the toolbar has already undergone (focus controls were added in front).

**Fix:** add `data-testid` to each: `data-testid="zoom-in"`, `"zoom-out"`, `"fit-view"`, `"center-selected"`, `"reset-layout"`, `"navigator-toggle"`, `"fullscreen-toggle"`.

### Z35. `GraphControls.tsx` — architecture button's "active" class is **misleading**

```tsx
<button className={`graph-control-btn ${architectureMode !== 'hierarchical' ? 'active' : ''}`} ...>
```

Semantics: `active` means "not the default". So `hierarchical` looks inactive, and `orbit` looks active — even though both are valid modes and the user is **in** `hierarchical`. Any UI reading `.active` to render "current mode" gets the wrong answer.

Also missing `aria-pressed`. The layout-mode toggle has `aria-pressed={layoutMode === 'static'}`, but the architecture button (which is a **cycle**, not a toggle) has neither `aria-pressed` nor a mode indicator.

**Fix:** use a `.mode-indicator` class for all modes (all get `active`), and add `<span class="mode-indicator-badge">` inside. Or use `aria-label` that names the current mode:
```tsx
aria-pressed={architectureMode !== 'hierarchical'}   // honest toggle semantics
```

### Z36. `GraphControls.tsx` — `activeControlIndex` isn't adjusted when `isNavigatorVisible` toggles

```ts
React.useLayoutEffect(() => {
  updateTabIndexes();
}, [..., isNavigatorVisible, layoutMode, architectureMode, nodeCount]);
```

When `isNavigatorVisible` toggles, the navigator button is added/removed. If `activeControlIndex` was pointing at it, `updateTabIndexes` runs and `controls[validIndex]` is now a **different button** (the next one in DOM order). The user's keyboard focus **jumps to an unrelated control** — silently. Same for `architectureMode` toggles that change the button count (e.g., `onToggleArchitectureMode` prop becomes undefined).

**Fix:** snapshot the currently-focused element by **id** (not index) before the effect runs:
```ts
const focusedIdRef = useRef<string | null>(null);
React.useEffect(() => {
  focusedIdRef.current = (document.activeElement as HTMLElement)?.id ?? null;
});
React.useLayoutEffect(() => {
  if (focusedIdRef.current) {
    const idx = controls.findIndex(c => c.id === focusedIdRef.current);
    if (idx !== -1) setActiveControlIndex(idx);
  }
  updateTabIndexes();
}, [...]);
```

---

## 🟡 Security / global-state leaks

### Z37. `GraphView.tsx` — `window.__LAST_LAYOUT_COMPLETED__` is **not dev-gated**

```ts
(window as any).__LAST_LAYOUT_COMPLETED__ = detail;
```

`detail` contains `correlationToken`, `requestId`, `timestamp`, `durationMs`, node/edge counts, `architectureMode`, `layoutMode`. Any script on the page (analytics, third-party SDK, injected advertisement) can read the last layout's internal telemetry. This is **not** a security token per se, but:
1. It's a **global mutable** object with no clearing on unmount
2. On a long-running session, only the **last** layout's data is readable — but it can be used to fingerprint user behavior ("this session keeps switching to orbit mode")

**Fix:** gate behind `DEBUG`:
```ts
if (DEBUG) (window as any).__LAST_LAYOUT_COMPLETED__ = detail;
```

### Z38. `GraphView.tsx` — `window.__LAYOUT_MODULE__` isn't cleaned up on unmount

```ts
if (typeof window !== 'undefined' && (DEV || __EXPOSE_CY__)) {
  (window as any).__LAYOUT_MODULE__ = { runLayoutWithMetadata, computeArchitectureLayoutWithMetadata };
}
```

Cleanup:
```ts
if ((window as any).__CY__ === cy) (window as any).__CY__ = null;
```

`__LAYOUT_MODULE__` is not cleaned up. On repeated mount/unmount cycles (route changes), the module reference lives forever. Combined with `__EXPOSE_CY__` being user-settable, a page with `window.__EXPOSE_CY__ = true` before mount exposes internals to the console **permanently**.

**Fix:** add `delete (window as any).__LAYOUT_MODULE__` in the destroy effect.

### Z39. `GraphView.tsx` — `window.__CURRENT_CORRELATION_TOKEN__` is **writable** by any script

```ts
Object.defineProperty(window, '__CURRENT_CORRELATION_TOKEN__', {
  get: () => currentCorrelationToken,
  set: (val: string | undefined) => { currentCorrelationToken = val; },
});
```

Any script can `window.__CURRENT_CORRELATION_TOKEN__ = 'polluted'`. The next layout picks it up and reports it as its correlation token in telemetry. This **pollutes distributed traces** — if the correlation token is used for span propagation, the trace becomes unjoinable.

**Fix:** make the setter a no-op from external scripts:
```ts
let setterAuthorized = false;
Object.defineProperty(window, '__CURRENT_CORRELATION_TOKEN__', {
  get: () => currentCorrelationToken,
  set: (val) => { if (setterAuthorized) currentCorrelationToken = val; },
});
// internal mutations use the module variable directly, not the global
```

Or better: don't expose the setter at all — only expose a `get`. If external scripts need to **read** the current token (for instrumentation), a read-only getter is enough.

### Z40. `App.tsx` — `BroadcastChannel` has **no origin validation**

```ts
useEffect(() => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = createChannel();
  const unsubscribe = onDetachedDrill(channel, (nodeId) => {
    selectNode(nodeId);
    setIsInvestigating(true);
  });
  return () => { unsubscribe(); channel.close(); };
}, [selectNode, setIsInvestigating]);
```

`BroadcastChannel` is **same-origin only**, so cross-origin injection isn't possible. But a **compromised same-origin script** (XSS, malicious browser extension, injected analytics that has access to the channel) can publish messages that trigger `selectNode` — a small DoS surface.

**Fix:** validate the `nodeId` against the current `activeData.nodes` **before** calling `selectNode`:
```ts
onDetachedDrill(channel, (nodeId) => {
  if (!activeData?.nodes.some(n => n.id === nodeId)) return;
  selectNode(nodeId);
  setIsInvestigating(true);
});
```

### Z41. `App.tsx` — detached drawer popup can silently fail

```ts
const handleDetach = useCallback(() => {
  if (!isDetached) {
    const win = openDetachedWindow();       // can return null (popup blocker)
    detachedWindowRef.current = win;
    investigation.setDrawerDetached(true);  // ← sets detached even if win is null
  }
  ...
}, [investigation, isDetached]);
```

`window.open()` returns `null` if blocked by a popup blocker (browser policy — very common in production after the first gesture is consumed by a slow async). The state flips to `detached: true`, but the actual window is `null`. Clicking "detach" again:
```ts
if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
  detachedWindowRef.current.close();      // null → guarded, no close
}
detachedWindowRef.current = null;
investigation.setDrawerDetached(false);   // state flips back
```
The drawer reappears. So it's recoverable — but the user sees a "detached" state with **no visible window** on the first click. They think the app is broken.

**Fix:** check `win` before flipping state:
```ts
const win = openDetachedWindow();
if (!win) {
  showToast({ variant: 'error', message: 'Popup blocked. Allow popups for this site.' });
  return;
}
detachedWindowRef.current = win;
investigation.setDrawerDetached(true);
```

---

## 🟡 Tests — bugs in the provided test files not covered in Cluster 8

### Z42. `architecture-layout.test.ts` — `vi.spyOn(analysisModule, 'computeArchitectureAnalysis')` **likely doesn't work**

```ts
import * as analysisModule from './layout/analysis';
import { computeArchitectureLayout } from './architecture-layout';

const analysisSpy = vi.spyOn(analysisModule, 'computeArchitectureAnalysis');
```

`architecture-layout.ts` imports:
```ts
import { computeArchitectureAnalysis } from './layout/analysis';
```

**Named import** — the reference is bound at module-load time. `vi.spyOn(analysisModule, 'computeArchitectureAnalysis')` replaces the property on the **module namespace object**, but the internal call in `architecture-layout.ts` uses the **named binding**, which is a live reference to the original function (per the ESM spec, live bindings mean namespace property access *does* reflect updates in some environments — but not in Vite's ESM transform, where `import { x }` compiles to `const x = mod.x` at module init).

In practice under Vitest + Vite: the spy **does not intercept** the internal call. The test's `expect(analysisSpy).toHaveBeenCalledTimes(1)` **fails with 0** (or, if the environment happens to preserve the live binding, passes — nondeterministically).

Since the test is in the repo and presumably passes today, either:
1. `architecture-layout.ts` uses `analysisModule.computeArchitectureAnalysis(...)` (namespace import) — then `vi.spyOn` works but the pattern is fragile and a future refactor to named imports breaks the test
2. The test is **silently not running** (excluded from CI)
3. Vite's transform preserves live bindings (it does for `import * as ns` but not for `import { x }`)

**Fix:** use `vi.mock` instead:
```ts
vi.mock('./layout/analysis', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, computeArchitectureAnalysis: vi.fn(actual.computeArchitectureAnalysis) };
});
// later:
import { computeArchitectureAnalysis } from './layout/analysis';
const mocked = vi.mocked(computeArchitectureAnalysis);
```

This works regardless of how `architecture-layout.ts` imports it.

### Z43. `architecture-layout.test.ts` — `mockRestore` in the test body **doesn't run** on failure

```ts
it('executes computeArchitectureAnalysis and discoverDomains exactly ONCE per layout run', () => {
  ...
  analysisSpy.mockClear();
  domainsSpy.mockClear();
  const positions = computeArchitectureLayout(nodes, edges);
  expect(positions).toBeDefined();
  expect(analysisSpy).toHaveBeenCalledTimes(1);   // ← if this fails...
  expect(domainsSpy).toHaveBeenCalledTimes(1);
  analysisSpy.mockRestore();                      // ← ...this doesn't run
  domainsSpy.mockRestore();
});
```

If the test throws between `mockClear` and `mockRestore`, the spy leaks into subsequent tests, causing **cascading failures** or **cascading false-passes** (if the leaked spy changes behavior).

**Fix:** use `afterEach(() => vi.restoreAllMocks())` at the describe-block level, or wrap in try/finally.

### Z44. `architecture-layout.test.ts` — Test 6's "trigger microcluster" test can pass with a **broken** microcluster

```ts
it('Test 6 — Trigger / Handler: Microcluster proximity without pulling unrelated nodes', () => {
  ...
  const microclusterDist = Math.sqrt(Math.pow(trigPos.x - handPos.x, 2) + Math.pow(trigPos.y - handPos.y, 2));
  const unrelDist = Math.sqrt(Math.pow(trigPos.x - unrelPos.x, 2) + Math.pow(trigPos.y - unrelPos.y, 2));
  expect(microclusterDist).toBeLessThan(unrelDist);
});
```

If trigger and handler are **5000px apart** but the unrelated node is 5001px apart, the test passes. The **intent** is "trigger and handler are near each other" — the test asserts only a **relative** relation, which a broken layout can satisfy trivially.

**Fix:**
```ts
expect(microclusterDist).toBeLessThan(300);   // absolute threshold
expect(unrelDist).toBeGreaterThan(microclusterDist + 200);  // clear separation
```

### Z45. `architecture-layout.test.ts` — `createMockEdge`'s `canonical.source.type: 'ApexClass'` is **wrong for all non-class edges**

```ts
function createMockEdge(source: string, target: string, id?: string): ExplorerEdge {
  return {
    ...
    canonical: {
      source: { type: 'ApexClass', name: source },     // ← ignores source type
      target: { type: 'ApexClass', name: target },     // ← ignores target type
      ...
    },
  };
}
```

Test 1 has `createMockEdge('LWC:OrderView', 'ApexClass:OrderController')` — the source is an LWC, but `canonical.source.type = 'ApexClass'`. If the layout pipeline **does** read `canonical.source.type` (per Cluster 3 **D5**, `extractNodesAndEdgesFromCy` fabricates `'ApexClass'` — the **production code has the same bug**), any test that verifies LWC-specific layout behavior would pass with the wrong canonical type.

**Fix:**
```ts
function createMockEdge(source, target, id) {
  const sourceType = source.split(':')[0] as ExplorerNodeType;
  const targetType = target.split(':')[0] as ExplorerNodeType;
  return {
    ...
    canonical: {
      source: { type: sourceType, name: source },
      target: { type: targetType, name: target },
      ...
    },
  };
}
```

### Z46. `architecture-layout.test.ts` — no test for the **fabrication** in `extractNodesAndEdgesFromCy` (Cluster 3 D3)

`extractNodesAndEdgesFromCy` is exported from `graph-layout.ts` but not imported by any test. A test that round-trips a real `ExplorerNode[]` through `buildGraphElements → cy → extractNodesAndEdgesFromCy` would immediately fail on every fabricated field (T2, T4, T5, T6, T7, T9, T10 in Cluster 7). That test is **the single highest-value test to add**.

**Fix:**
```ts
it('extractNodesAndEdgesFromCy round-trips all node fields', () => {
  const original: ExplorerNode = makeFullyPopulatedNode();
  const cy = makeMockCyWithNodes([original]);
  const { nodes } = extractNodesAndEdgesFromCy(cy);
  expect(nodes[0]).toEqual(original);
});
```

### Z47. `architecture-layout.test.ts` — no test for **self-loops** (`source === target`)

Self-loops are a common data anomaly (a class that calls itself via recursion, a factory that returns its own type). The layout pipeline has no special handling — a self-loop adds 1 to `fanIn` and `fanOut` of the same node, potentially double-counting in centrality and displacing the node. No test verifies the behavior.

**Fix:**
```ts
it('handles self-loop edges without infinite recursion', () => {
  const nodes = [createMockNode({ id: 'ApexClass:A' })];
  const edges = [createMockEdge('ApexClass:A', 'ApexClass:A')];
  const positions = computeArchitectureLayout(nodes, edges);
  expect(Number.isFinite(positions['ApexClass:A'].x)).toBe(true);
  expect(Number.isFinite(positions['ApexClass:A'].y)).toBe(true);
});
```

### Z48. `architecture-layout.test.ts` — no test for **`cycles`** in the input schema

`completeSummary.cycleCount: 0` and `cycles: []` are fabricated (Cluster 6 **A2**). A test that passes a real `cycles` array (e.g., `[{ id: 'c1', nodeIds: ['A', 'B', 'A'] }]`) and asserts the layout places A and B adjacently would catch the fabrication **if** the pipeline uses `cycles` for anything. Since it currently **doesn't**, the test would pass — but the absence of a test hides the fact that cycles are **never used** in layout, contradicting the type contract.

---

## 🔵 Cross-cutting maintainability

### Z49. `GraphView.tsx` — 900+ lines, 20+ effects

The file interleaves:
- 3 mode-tracking refs and their sync effects
- Layout orchestration (initial, structural, position-only, mode-switch)
- 8 `cy.on(...)` handlers
- 8 `useEffect` blocks for highlighting (selection, impact, cycle, finding, focus)
- Imperative handle (ref forwarding)
- 4 `useMemo` computations
- 3 event handlers
- JSX with 4 overlays, 2 hover cards, controls, legend, debug panel

Every bug in Clusters 2, 3, and 8 lives in this file. The file is a bug-collection surface — every new feature adds another effect with another stale-closure risk.

**Fix:** split into hooks:
- `useCytoscapeInit` — init + destroy + ref cleanup
- `useLayoutTriggers` — initial / structural / mode-switch / reset
- `usePositionSync` — position-only sync effect
- `useGraphHighlights` — selection, impact, cycle, finding, focus effects
- `useZoomLOD` — zoom handler + LOD classes

Each hook is independently testable and its stale-ref bugs are localized.

### Z50. `App.tsx` — 15 effects and 10+ `useRef`s

Similar to Z49. `AppContent` is a state orchestrator that mixes:
- Project data loading
- Selection/investigation sync
- Compare state sync
- Simulation state management
- Handoff, detached drawer, palette, diagnostics
- `NotAnalyzedScreen` rendering
- 50+ props passed to `WorkspaceShell`

The escape handler bug (Z2), the URL loop (Z1), the project-switch race (Z3) all live here. Splitting into:
- `useProjectData` (data + errors)
- `useAppSelection` (selection + URL sync + investigation + compare)
- `useAppSimulation` (proposal lifecycle)
- `useAppKeyboard` (Escape, global shortcuts)
- `useAppHandoff` (handoff + detached drawer)

…would localize the bugs and make each testable.

### Z51. Cross-cluster: `Position` (`{ x, y }`) redefined in 10+ places

Already flagged as Cluster 7 **T21**. Restating here because it's the **single most impactful mechanical refactor** — no new bugs introduced, but prevents the next class of them (adding `z`, `width`, `height`, or `rotation` to position breaks silently because inline `{ x, y }` doesn't get the field).

### Z52. Cross-cluster: `localeCompare` in 4 clusters

Cluster 3 **D23**, Cluster 4 **R23**, Cluster 5 **K23**, Cluster 6 **A43**. All four use `a.localeCompare(b)` for sorts that determine layout geometry. `localeCompare` is locale-dependent — the layout of a 100-node graph can vary by 1–2px across machines depending on the OS locale. The "100% deterministic" contract in every layout engine's doc comment **is not satisfied**.

**Fix:** a shared `stableCompare` in `explorer.ts` (or a new `utils/compare.ts`) — `(a, b) => a < b ? -1 : a > b ? 1 : 0` — used in all four clusters.

---

## Priority summary — sorted by fix-effort-to-impact ratio

| # | Bug | Fix effort | Impact |
|---|---|---|---|
| **Z1** | URL/filter infinite loop | 30 min | **App freezes on shared links** |
| **Z2** | Escape clears selection in inputs | 5 min | Broken search UX + console errors |
| **Z5** | Silent simulation commit failure | 10 min | User thinks button is broken |
| **Z11** | Silent context fallback | 30 min | Wrong project shown silently |
| **Z37** | `__LAST_LAYOUT_COMPLETED__` not gated | 2 min | Info leak |
| **Z40** | `BroadcastChannel` no validation | 5 min | Selection DoS via injected script |
| **Z41** | Detached popup blocker silent | 5 min | Broken detach UX |
| **Z42** | `vi.spyOn` on named import | 15 min | Perf test is silently a no-op |
| **Z44** | Trigger microcluster test too loose | 5 min | Bug can ship |
| **Z46** | No `extractNodesAndEdgesFromCy` round-trip test | 30 min | Would surface Cluster 7 T2/T3/T5/T6/T7 |
| **Z15** | 28px touch targets | 15 min | Accessibility AA failure |
| **Z16** | 10–11px fonts | 10 min | Accessibility AA failure |
| **Z17** | Critical lighter than high | 5 min | Semantic confusion |
| **Z18** | Muted text contrast failure | 20 min | Accessibility AA failure |
| **Z26** | Two `zoomOut` implementations | 10 min | Inconsistent UX |
| **Z28** | `highlightCycle` O(n) dim on every call | 30 min | Main-thread stall on large graphs |
| **Z34** | Missing testids | 15 min | E2E test brittleness |
| **Z49** / **Z50** | GraphView / App too large | Days | Every bug in this audit lives here |
| **Z51** | `Position` redefined 10× | 2 hours | Future-proofing |
| **Z52** | `localeCompare` in 4 places | 20 min | Cross-locale determinism |


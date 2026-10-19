# Code Issues Report

Below are the issues I found, grouped by severity. I've cited the file and the specific function/line region where relevant.

---

## 🔴 Critical

### 1. `GraphView.tsx` — structural sync effect rebuilds all Cytoscape elements on decoration changes

```js
useEffect(() => {
  // ... destroys and rebuilds every element:
  cy.batch(() => {
    cy.elements().remove();
    cy.add(newElements);
  });
  // ...
}, [structuralFingerprint, captureAndPersistPositions, applyDecorations]);
```

`applyDecorations` is recreated whenever `selectedEdgeId`, `impactResult`, `selectedFinding`, `selectedCycleNodeIds`, `simulatedNodeIds`, `simulatedRemovedNodeIds`, `simulatedEdgeIds`, or `focusedNodeId` changes (its `useCallback` deps). So **selecting an edge, selecting a cycle, changing impact analysis, or toggling a simulation all cause the entire graph to be torn down and rebuilt** — losing Cytoscape state, causing visible flicker, and doing expensive DOM work on every click.

`applyDecorations(cy)` is already invoked in several dedicated effects (`selectedNodeId`/`selectedEdgeId`, `impactResult`, `selectedCycleNodeIds`, `selectedFinding`, `focusedNodeId`). Remove `applyDecorations` from the structural sync deps (or call it via a ref) and drop the direct `applyDecorations(cy)` call there.

### 2. `GraphErrorBoundary.tsx` — auto-recovers on *every* parent re-render

```js
componentDidUpdate(prevProps) {
  if (this.state.hasError) {
    // ...
    if (
      keysChanged ||
      prevProps.resetKey !== this.props.resetKey ||
      prevProps.children !== this.props.children   // <-- always true for inline JSX
    ) {
      this.setState({ hasError: false, error: null, isRecovering: false });
    }
  }
}
```

`GraphView` passes **inline JSX children**, so `props.children` is a fresh reference on every `GraphView` re-render (hover, selection, layout running flag, etc.). This means the boundary resets out of its error state on the next parent render, immediately re-renders the failing child, throws again, logs again, and repeats indefinitely. It effectively defeats the boundary.

Fix: remove the `prevProps.children !== this.props.children` check. Only reset on explicit `resetKey`/`resetKeys` change (that's the intended contract).

### 3. `GraphErrorBoundary` scope hides unrelated overlays

In `GraphView.tsx`:

```jsx
<GraphErrorBoundary resetKeys={[architectureMode, nodes.length, edges.length]} ...>
  <FeatureOverlayCanvas ... />
  {isNavigatorVisible && <div className="minimap-container">…</div>}
  {hoverCard && <NodeHoverCard .../>}
  {hoverCard && <EdgeHoverCard .../>}
</GraphErrorBoundary>
```

A crash in `FeatureOverlayCanvas` swaps **the minimap and hover cards** for the error banner too. Each overlay should have its own boundary (or the boundary should wrap only the SVG overlay), so unrelated overlays keep working.

### 4. `GraphView.tsx` — URL `node` param can be silently cleared when restore fails

```js
useEffect(() => {
  if (!cyInstance || nodes.length === 0 || restoredHashNodeRef.current) return;
  const initialNodeId = hashModes.node;
  if (!initialNodeId || selectedNodeId) return;

  restoreAttemptedRef.current = true;          // <-- set before match succeeds

  const matchedNode = nodes.find(...);
  if (!matchedNode) {
    // Nodes are still arriving; retry on next nodes change.
    return;
  }
  ...
```

But the hash-sync effect early-returns only when `!restoreAttemptedRef.current && hashModes.node && !selectedNodeId`. Once `restoreAttemptedRef.current` is `true` but the node never shows up (deleted/renamed node in a shared link), any later `architectureMode`/`layoutMode`/`selectedNodeId` change will rewrite the hash and drop `node=`.

Move the `restoreAttemptedRef.current = true` assignment **after** a successful match, or add an explicit timeout/fallback path.

---

## 🟠 High

### 5. `useViewState.ts` — "safe hook" pattern violates Rules of Hooks

```js
function useWorkspaceRouterSafe() {
  try { return useWorkspaceRouter(); } catch (_) { return null; }
}
```

If the provider is present at mount but becomes unavailable on a later render (or vice versa), the *number/order of hooks* in `useViewState` changes between renders — an invariant React relies on. This can lead to state being attached to the wrong slot and is generally undefined behavior. Additionally, swallowing errors from inside the hook can mask real provider bugs.

Use `React.useContext` against a context whose default value is `null` (no throw) instead.

### 6. `GraphView.tsx` — `hoverCard` stale data on prop/state change

`hoverCard.node` / `hoverCard.edge` are captured in local state at hover time and never refreshed. If `findings` or `nodes` update while the card is displayed (or if the user navigates and returns to the same node), the card shows old fan-in/fan-out/findings counts.

Store the node/edge **ID** plus coordinates in state, and look up the live entity from props during render.

### 7. `GraphView.tsx` — `onSelectEdge('')` instead of `null`

In `handleKeyDown` for `Escape`:

```js
onSelectNode(null);
onSelectEdge('');   // <-- empty string, not null
```

`useViewState` treats falsy values as "no selection", but the state ends up as `''` rather than `null` (or via investigation's `selectEdge('')`). This can produce a `selectedEdgeId === ''` sentinel that keeps the "clear" branch happy but leaves the URL/`useViewState` state inconsistent. Use `null`.

### 8. `FeatureOverlayCanvas.tsx` — `sharedHighlight` recomputed on every hover

```js
const activeHighlightNodeId = hoveredNodeId || selectedNodeId || null;
const sharedHighlight = useMemo(() => {
  // getSharedHighlightData(...)
}, [enableOverlay, discoveryResult, activeHighlightNodeId, nodes, edges]);
```

`hoveredNodeId` changes on every `mouseover`, so `getSharedHighlightData` runs on **every hovered node change** across the graph. On large graphs this is O(n + e) per hover. Either debounce hover, use `requestIdleCallback`, or only compute for `selectedNodeId` and let hover use a cheaper incremental highlight.

### 9. `EdgeHoverCard.tsx` — unencoded `vscode://` URL

```js
const vscodeUrl = file ? `vscode://file/${file}:${line ?? 1}` : null;
```

Paths with spaces, `#`, `?`, `:`, `%`, or Windows drive letters are not URL-encoded. `vscode://file/C:/a b/c.ts:12` frequently fails or opens the wrong file. Build the URL with `encodeURI`/`encodeURIComponent` on the path segment, or use `vscode://file/${encodeURIComponent(file)}:${line}`.

### 10. `NodeHoverCard.tsx` / `EdgeHoverCard.tsx` — `window.innerWidth/innerHeight` read at render, no resize listener

```js
const left = Math.min(x + 12, window.innerWidth - 260);
const top  = Math.min(y + 12, window.innerHeight - 160);
```

If the window is resized while a card is visible, the card doesn't reposition. Also `window` access at render time is not SSR-safe (these files are likely client-only, but this pattern is fragile). Track viewport via a hook or keep the initial render conditional on `typeof window !== 'undefined'`.

---

## 🟡 Medium

### 11. `FeatureOverlayCanvas.tsx` — inconsistency between severity color and displayed severity

```js
const strokeColor = maxSeverity === 'CRITICAL' ? '#ef4444' : ... ;
// ...
<span className="value" style={{ fontWeight: 700 }}>
  ⚠️ {nodeFindings.length} issue{...} ({nodeFindings[0].severity})
</span>
```

`strokeColor` uses the maximum severity, but the text renders `nodeFindings[0].severity` — which is just whichever finding happens to be first in the array. Badge color and text can contradict. Sort by severity or use `maxSeverity` for the text.

### 12. `GraphView.tsx` — `architectureMode` in `structuralFingerprint` causes redundant rebuilds

```js
return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}#${findingFP}#${architectureMode}#${featureAssignmentFP}`;
```

Changing architecture mode already triggers the dedicated "architecture mode switch" layout effect, and `featureAssignmentFP` changes iff the hybrid assignment changes. Including `architectureMode` here forces a full element teardown/rebuild on every arch-mode change (e.g. `hierarchical` ↔ `orbit`) even though the node/edge set is identical. Drop it, or gate it behind `architectureMode === 'hybrid'`.

### 13. `GraphView.tsx` — layout-start/stop balance assumes `layoutstop` always fires

```js
let layoutDepth = 0;
cy.on('layoutstart', () => { layoutDepth++; isLayoutRunningRef.current = true; setIsLayoutRunning(true); });
cy.on('layoutstop', () => {
  layoutDepth = Math.max(0, layoutDepth - 1);
  if (layoutDepth === 0) { isLayoutRunningRef.current = false; setIsLayoutRunning(false); }
});
```

If a layout is aborted (e.g. torn down by a subsequent `.remove()` in the structural sync effect), `layoutstop` may not fire and `isLayoutRunningRef` stays `true` forever. That causes the position-only effect (`if (isLayoutRunningRef.current) return;`) to **skip applying positions indefinitely**. Reset the ref on element teardown, or drive `isLayoutRunning` from the promise/`layoutstop` of each explicit layout call.

### 14. `GraphView.tsx` — `nodeLookup` on every hover is O(n)

```js
cy.on('mouseover', 'node', (evt) => {
  const nodeObj = nodesRef.current.find(n => n.id === nodeId);
  ...
});
```

On large graphs, every hover performs a linear scan. Use `node.data()` from the Cytoscape element (populate `displayName`, `type`, `risk`, etc. as element data in `buildGraphElements`), or maintain a `Map<id, ExplorerNode>` from `nodes`.

### 15. `useViewState.ts` — `readStateFromUrl` doesn't guard against malformed URL params

```js
const filterParsed = filterQuery.fromQuery(params);
if (routerRef.current) routerRef.current.setViewMode(filterParsed.viewMode);
setFilterState(filterParsed.filterState);

const focusParsed = focusQuery.fromQuery(params, initialNode);
if (investigationRef.current) {
  if (focusParsed.enabled) investigationRef.current.setFocus(focusParsed);
  ...
```

No `try/catch` around the whole block. A malformed `focus=...` / `conn=...` / `findings=...` param (or a bug in one of the parsers) will throw inside the mount effect and leave URL-to-state synchronization permanently broken for that session.

### 16. `useViewState.ts` — `JSON.stringify` deep comparison in the URL-sync effect

```js
const nonSearchChanged =
  JSON.stringify(prevNonSearchStateRef.current) !== JSON.stringify(currentNonSearchState);
```

`currentNonSearchState` includes `focusState`, `impactState`, `connectionState` — all small but nested objects. This runs on every state change. Swap for field-by-field comparison or a memoized tuple key (e.g. `` `${direction}|${depth}|${enabled}|${focusNodeId}|...` ``).

### 17. `GraphView.tsx` — 6 effects firing `applyDecorations` on overlapping state

```js
useEffect(() => { if (!cyRef.current) return; applyDecorations(cyRef.current); }, [selectedNodeId, selectedEdgeId, applyDecorations]);
useEffect(() => { if (!cyRef.current) return; applyDecorations(cyRef.current); }, [impactResult, applyDecorations]);
useEffect(() => { if (!cyRef.current) return; applyDecorations(cyRef.current); }, [selectedCycleNodeIds, applyDecorations]);
useEffect(() => { if (!cyRef.current) return; applyDecorations(cyRef.current); }, [selectedFinding, applyDecorations]);
useEffect(() => { if (!cyRef.current) return; applyDecorations(cyRef.current); }, [focusedNodeId, selectedNodeId, applyDecorations]);
```

Each effect re-fires not just on its own key, but also whenever `applyDecorations` changes (i.e. whenever **any** of the 8 decoration inputs change). Combined with issue #1, a single selection change runs `applyDecorations` 6+ times. Consolidate into a single effect keyed on all decoration inputs, or convert `applyDecorations` into a `useEvent`-style stable callback that reads from refs.

---

## 🟢 Low / Polish

### 18. `graph.css` — classes referenced by `GraphView` but undefined here

`GraphView` renders `.navigator-header`, `.navigator-title`, `.navigator-close-btn`, `.graph-debug-panel`, `.graph-empty-state`, `.graph-overlay-error` — none of these are in `graph.css`. The navigator close button will render unstyled. Also `.focus-hint { display: none; }` looks like dead CSS; verify whether the element is conditionally rendered elsewhere.

### 19. `FeatureOverlayCanvas.tsx` — hardcoded guide radii

```js
const maxR = 2600;
const labelR = 2400;
```

These should be derived from `orbitGuides` (e.g. `max(rings.radiusPx) * margin`) rather than magic constants, or at least scale with `zoom`.

### 20. `FeatureOverlayCanvas.tsx` — emoji inside SVG `<text>`

```jsx
<text ... >⚠️ {countText}</text>
```

Emoji glyphs have platform-dependent metrics and can push text off-center inside the pill. Use a vector icon or a `tspan` with an explicitly measured width.

### 21. `NodeHoverCard.tsx` / `EdgeHoverCard.tsx` — `setTimeout` on unmounted component

```js
navigator.clipboard.writeText(...).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
});
```

If the card unmounts within 2 s, the timer keeps a reference and fires `setCopied` on an unmounted component. Harmless in React 18+ but worth clearing via a ref-held timeout in a cleanup effect.

### 22. `NodeHoverCard.tsx` / `EdgeHoverCard.tsx` — `nodeFindings.filter(...)` not memoized

Recomputes on every render. With `React.memo` on props this is usually fine, but the `findings` array identity can flip on parent re-renders (e.g. `findings` recreated upstream). Low impact, easy to memoize.

### 23. `GraphView.tsx` — `DEBUG` recomputed on every render

```js
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
```

Fine functionally; wrap in `useMemo` for cleanliness.

### 24. `EdgeHoverCard.tsx` — missing `role="tooltip"`

`NodeHoverCard` has `role="tooltip"`; `EdgeHoverCard` does not. Align for screen-reader parity, and give both `aria-describedby` to the source element if possible.

### 25. `FeatureOverlayCanvas.tsx` — `enableOverlay` default is `true`, but consumers don't pass it

`GraphView` relies on the default. This works, but `enableOverlay` should either be removed (always on) or exposed via `GraphViewProps` so it can be disabled for debugging/embedded contexts.

---

## Suggested immediate fixes (highest ROI)

1. Remove `applyDecorations` from the structural sync effect deps (issue #1) — big perf/UX win.
2. Drop `prevProps.children !== this.props.children` in `GraphErrorBoundary` (issue #2) — restores the boundary's purpose.
3. Split the error boundary so one overlay crash doesn't hide the minimap (issue #3).
4. Move `restoreAttemptedRef.current = true` after a successful match (issue #4).
5. Replace the "safe hook" pattern with a non-throwing context (issue #5).

Want me to produce concrete diffs for any of these (especially #1, #2, #3, and #5)?

# Deep Bug Hunt — New Findings Beyond the Flicker

I re-read all four files end-to-end. Below are **eleven new bugs** (not the flicker/invisible-node ones from before) that produce visible symptoms or silent state corruption. Ranked by severity.

---

## Critical — silent data corruption or crashes

### B1. Drag positions are saved to the *wrong mode's* session map

**File:** `GraphView.tsx`, init effect (~L600)

```js
cy.on('dragfree', 'node', (evt) => {
  const node = evt.target;
  const rounded = { x: Math.round(pos.x), y: Math.round(pos.y) };

  getSessionPositionsForMode(architectureMode).set(nodeId, rounded);   // ← architectureMode from MOUNT closure
  captureAndPersistPositions('user-authored');                          // ← also from MOUNT closure
  // ...
});
```

The entire init effect runs once with `[]` deps. So `architectureMode` here is **frozen at the value it had on mount**, forever. If the user mounts on `hierarchical`, switches to `orbit`, then drags a node:

1. Position is saved to `sessionPositionsRef.get('hierarchical')` — not `orbit`.
2. `captureAndPersistPositions` (from mount-time closure) also derives provenance based on `'hierarchical'`.
3. When the user switches back to `orbit`, the drag is gone. When they switch to `hierarchical`, the drag **reappears** — as if the user had dragged it in hierarchical mode.

This defeats the entire T1-1 fix (per-mode session scoping). It's silent, so nobody noticed.

**Fix:** introduce `architectureModeRef` updated per render:

```js
const architectureModeRef = useRef(architectureMode);
useEffect(() => { architectureModeRef.current = architectureMode; });

cy.on('dragfree', 'node', (evt) => {
  const currentMode = architectureModeRef.current;
  getSessionPositionsForMode(currentMode).set(nodeId, rounded);
  captureAndPersistPositionsRef.current?.(currentMode, 'user-authored');
  // ...
});
```

And change `captureAndPersistPositions` to accept `mode` as a parameter instead of closing over `architectureMode`.

---

### B2. Escape does not exit focus/drill mode — graph stays dimmed

**Files:** `GraphView.tsx` L~880 (keyboard handler), `App.tsx` L~240 (global handler)

```js
// GraphView.tsx
} else if (e.key === 'Escape') {
  onSelectNode(null);
  onSelectEdge('');
}
```

```js
// App.tsx
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedNodeId) {
    clearSelection();
    setIsInvestigating(false);
  }
};
```

Neither handler touches `focusNodeId` or `view.focusState.enabled`. Then the `focusedNodeId` effect fires:

```js
if (focusedNodeId) {
  focusOnNode(cy, focusedNodeId);   // re-dims everything
}
```

**Symptom:** user enables focus mode on a node, presses Escape, node deselects but focus stays → graph remains dimmed except for one cluster. Second Escape does nothing (selection already clear). User is stuck.

Additionally: the global App handler requires `selection.selectedNodeId` to fire. If only an edge is selected, Escape does nothing at the App level. The GraphView handler only fires if the container has focus. So if the user clicks an edge then moves focus outside the container and presses Escape, nothing clears.

**Fix:**
- App.tsx: clear focus state too — `view.setFocusState({...view.focusState, enabled: false})`.
- App.tsx: fire on `selectedEdgeId` as well — `if (e.key === 'Escape' && (selectedNodeId || selectedEdgeId))`.
- GraphView.tsx: call `onFocusChange?.({...focusState, enabled: false, focusNodeId: null})` in its Escape branch.
- Add a test: select node → enable focus → press Escape → assert `focusState.enabled === false` and no `.dimmed` classes remain.

---

### B3. `handleCommitSimulation` re-throws inside a click handler → app crashes

**File:** `App.tsx` L~560

```js
const handleCommitSimulation = () => {
  try {
    const validation = validateProposalCommit(...);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Cannot commit stale simulation proposal.');
    }
    // ...
  } catch (err) {
    console.error(...);
    throw err;   // ← escape at top level of onClick
  }
};
```

Throwing from an event handler without an error boundary propagates to the React root. There is no `App`-level error boundary — `GraphErrorBoundary` only wraps graph internals. **A validation failure crashes the entire application.**

**Fix:** catch and surface to a toast or `console.error`, don't re-throw:

```js
} catch (err) {
  console.error('[App] handleCommitSimulation failed:', err);
  // surface via toast/alert; do NOT throw
}
```

---

### B4. Clicking an edge after selecting a node leaves nodes dimmed forever

**File:** `GraphView.tsx`, "Handle selected node changes" (~L1000) + "Handle selected edge changes" (~L1025)

```js
// Node change effect
if (selectedNodeId) {
  selectNode(...); highlightNodeConnections(...);       // dims others
} else if (!selectedEdgeId) {                            // ← skipped when edge is selected
  deselectAll(...); clearHighlights(...);
}
```

```js
// Edge change effect — does NOT clear node highlights
if (selectedEdgeId) {
  const edge = cy.getElementById(selectedEdgeId);
  if (edge.length > 0 && edge.isEdge()) {
    edge.select();
  }
}
```

Sequence: node A selected → graph dimmed. User clicks edge B → `selectedNodeId = null`, `selectedEdgeId = B`. First effect's branches both false. Second effect selects edge but doesn't clear dim. **`.dimmed` classes on every node that was dimmed in step 1 stay forever.**

This is exactly the same class of bug I flagged in the previous message, but a second instance nobody's touched.

**Fix:** consolidate selection into one effect that owns highlight state:

```js
useEffect(() => {
  const cy = cyRef.current;
  if (!cy) return;

  cy.batch(() => {
    if (selectedNodeId) {
      clearHighlights(cy);
      deselectAll(cy);
      selectNode(cy, selectedNodeId);
      highlightNodeConnections(cy, selectedNodeId);
    } else if (selectedEdgeId) {
      clearHighlights(cy);
      deselectAll(cy);
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0 && edge.isEdge()) edge.select();
    } else {
      deselectAll(cy);
      clearHighlights(cy);
    }
  });
}, [selectedNodeId, selectedEdgeId]);
```

Remove the separate edge-change effect.

---

### B5. Hover cards appear at the wrong screen position when the container is offset

**Files:** `GraphView.tsx` (mouseover), `NodeHoverCard.tsx`, `EdgeHoverCard.tsx`

```js
// GraphView.tsx
const pos = evt.renderedPosition;   // ← viewport coordinates INSIDE the cytoscape canvas
setHoverCard({ type: 'node', node: nodeObj, x: pos.x, y: pos.y });
```

```js
// NodeHoverCard.tsx
const left = Math.min(x + 12, window.innerWidth - 260);
const top = Math.min(y + 12, window.innerHeight - 160);
// returns
<div style={{ left: `${left}px`, top: `${top}px` }} ...>
```

`renderedPosition` returns coordinates **relative to the cytoscape container**. If the container sits at, say, `(280, 100)` on screen (sidebar + header), then a node at container-coords `(200, 300)` renders at screen-coords `(480, 400)`. But the hover card gets `left: 200, top: 300` — computed as if the container starts at `(0, 0)`.

**Symptom:** hover cards appear offset by the container's top-left position — up to 300+ pixels off. The clamping against `window.innerWidth`/`window.innerHeight` makes this worse because it uses viewport dimensions for container coords.

Note: this only manifests if `.graph-hover-card` is `position: fixed`. If it's `position: absolute` and the `.graph-container` is a positioned ancestor (`position: relative`), then it's correct. Check the CSS.

**Fix (if fixed):** convert to viewport coords:

```js
const rect = containerRef.current!.getBoundingClientRect();
const pageX = rect.left + pos.x;
const pageY = rect.top + pos.y;
setHoverCard({ ..., x: pageX, y: pageY });
```

**Fix (if absolute + relative container):** verify `.graph-container { position: relative }` exists. If not, add it.

---

### B6. `finding-highlighted` has no CSS rule — selecting a finding does nothing visible

**Files:** `GraphView.tsx` L~1080 (adds class), `graph-style.ts` (no matching rule)

```js
// GraphView.tsx
selectedFinding.nodeIds.forEach((nodeId) => {
  const ele = cy.getElementById(nodeId);
  if (ele.length > 0) ele.addClass('finding-highlighted');
});
```

Search `graph-style.ts` for `finding-highlighted` — no match. If it isn't in `graph.css` either, then selecting a finding from the Findings lens **produces zero visual change on the graph**. The user selects a finding, expects the nodes to glow, nothing happens.

**Verify:** `grep -R "finding-highlighted" explorer/src` → if only `GraphView.tsx`, add styles.

**Fix in `graph-style.ts`:**

```js
{ selector: 'node.finding-highlighted', style: {
  'border-width': 5,
  'border-color': '#f87171',
  'border-style': 'solid',
  'opacity': 1,
}},
{ selector: 'edge.finding-highlighted', style: {
  'width': 4,
  'line-color': '#f87171',
  'target-arrow-color': '#f87171',
  'opacity': 1,
}},
```

Same check needed for `cycle-*` classes applied by `highlightCycle` in `graph-interactions.ts`.

---

## High — duplicate work, silent races, or UX confusion

### B7. Mode switch triggers **two** layouts

**File:** `GraphView.tsx`

Effect 1, mode-switch (`[architectureMode, effectiveLayoutOptions.focalLwcId, captureAndPersistPositions]`):
```js
const modeChanged = prevArchitectureModeRef.current !== architectureMode;
if (!modeChanged && !focalChanged) return;
// ... run layout
```

Effect 2, structural-sync (`[nodes, edges, findings, featureAssignmentMap, architectureMode, captureAndPersistPositions]`):
```js
if (isInitialMountRef.current) { ... return; }
// ... compute autoLayoutPolicy, run layout
```

**Both fire** on `architectureMode` change because both depend on it. Both call `runLayoutWithMetadata`. `guardLayoutRun` (the 150ms duplicate detector) logs a warning but does not prevent the second run.

The structural-sync effect's `shouldAutoLayout('graph-update' | 'new-nodes', {hasAuthForUpdate, hasNewNodes})` — after a mode switch, `hasAuthForUpdate` is `false` because the new mode has no persisted provenance. So the policy returns `true`. Layout runs twice.

**Symptom:** compounded with the LOD flicker and the animation, the graph stutters and re-flows on every mode switch.

**Fix:** remove `architectureMode` and `captureAndPersistPositions` from the structural-sync deps. If the effect needs current `architectureMode`, read it via a ref (same ref you'd add for B1). The mode-switch effect owns mode-change layouts; the structural-sync effect owns element-set changes.

Also add an equality check in `guardLayoutRun` that **skips** the second run instead of warning:

```js
const guardLayoutRun = (reason) => {
  const now = performance.now();
  if (lastRunRef.current && now - lastRunRef.current.at < 150 && reason !== 'reset') {
    return false;   // signal to caller: skip
  }
  lastRunRef.current = { reason, at: now };
  return true;
};
```

---

### B8. Search query filters the sidebar but **not** the graph

**File:** `App.tsx`

```js
// displayNodes — sidebar only
const displayNodes = useMemo(() => {
  if (!activeData) return [];
  if (!view.filterState.searchQuery) return activeData.nodes;
  const results = searchNodes(activeData.nodes, view.filterState.searchQuery);
  return results.map((r) => r.node);
}, [activeData, view.filterState.searchQuery]);

// visibleActiveData — graph
const visibleActiveData = useMemo(() => {
  const { nodes, edges } = filterGraphByNodeTypes(activeData.nodes, activeData.edges, visibleTypes);
  // ← visibleTypes is only node-type filter, NOT searchQuery
}, [activeData, visibleTypes]);
```

**Symptom:** user types "Account" in search. Sidebar shrinks to matching nodes. Graph stays unchanged. User selects a matching node from sidebar → graph highlights it. But the graph doesn't visually filter.

This may be intentional, but it's a common source of "the search doesn't work" complaints. Either:
- (a) Add `searchQuery` to `visibleActiveData`'s filter (search filters graph too), or
- (b) Add explicit UI copy in the search box: "Filters sidebar only. Use ⌘K for graph search."

---

### B9. `isLayoutRunning` state races when layouts overlap

**File:** `GraphView.tsx` L~620

```js
cy.on('layoutstart', () => {
  isLayoutRunningRef.current = true;
  setIsLayoutRunning(true);
});
cy.on('layoutstop', () => {
  isLayoutRunningRef.current = false;
  setIsLayoutRunning(false);
});
```

If layout A is running and layout B starts before A finishes, then A stops → `setIsLayoutRunning(false)` fires even though B is active. Combined with the dual-layout issue (B7), this happens on **every mode switch**.

**Symptom:** `data-layout-running` attribute and debug panel show `false` while a layout is actually running. Any effect conditioned on `isLayoutRunning` behaves wrong.

**Fix:** counter-based:

```js
const layoutDepthRef = useRef(0);
cy.on('layoutstart', () => {
  layoutDepthRef.current++;
  isLayoutRunningRef.current = true;
  setIsLayoutRunning(true);
});
cy.on('layoutstop', () => {
  layoutDepthRef.current = Math.max(0, layoutDepthRef.current - 1);
  if (layoutDepthRef.current === 0) {
    isLayoutRunningRef.current = false;
    setIsLayoutRunning(false);
  }
});
```

---

### B10. `App.tsx` event listeners re-register on **every render**

**File:** `App.tsx`

```js
const { clear: clearSelection, selectNode, selectEdge, selectedNodeId } = selection;
const { resetInvestigationContext } = investigation;
const { setIsInvestigating, setFilterState, ... } = view;

useEffect(() => {
  window.addEventListener('explorer:project-changed', handleProjectChanged);
  return () => window.removeEventListener('explorer:project-changed', handleProjectChanged);
}, [activeProjectId, clearSelection, resetInvestigationContext, setIsInvestigating, setFilterState]);
```

If `useGraphSelection`, `useInvestigation`, or `useViewState` return action functions that aren't memoized (which is the default for hooks that return `{ ...state, actions: { clear: () => ... } }`), then `clearSelection`, `resetInvestigationContext`, `setIsInvestigating`, `setFilterState` all change identity every render.

The effect re-registers on **every render**. Same pattern in:
- BroadcastChannel effect
- Sync compare focused entity effect
- Sync node selection from view state effect
- Defensive validation effect
- Global Escape effect

**Symptom:** at minimum, wasted `addEventListener`/`removeEventListener` calls on every render. At worst, a race window where a project-changed event fires between `removeEventListener` and `addEventListener` and is missed.

**Verify:** open DevTools → Performance → record 5 seconds of idle. Look for repeated `addEventListener` frames.

**Fix:** either
- (a) memoize the action functions inside the custom hooks (`useCallback` for each action, `useMemo` for the returned object), or
- (b) store the callbacks in refs inside each effect and use `[]` deps:

```js
const clearSelectionRef = useRef(clearSelection);
useEffect(() => { clearSelectionRef.current = clearSelection; });

useEffect(() => {
  const handler = () => {
    clearSelectionRef.current();
    // ...
  };
  window.addEventListener('explorer:project-changed', handler);
  return () => window.removeEventListener('explorer:project-changed', handler);
}, [activeProjectId]);   // only activeProjectId
```

---

### B11. `.dimmed` accumulates — `clearHighlights` may not remove all dim classes

**Files:** `GraphView.tsx` (multiple), `graph-interactions.ts` (not shown)

Four different highlight helpers each apply their own dim class or attribute:

- `highlightNodeConnections` → applies `.dimmed` presumably
- `highlightCycle` → applies `.dimmed` + `.cycle-*` presumably
- `focusOnNode` → applies `.dimmed` presumably
- impact effect → applies `.impact-muted` and `.impact-origin` / `.impact-affected`

If `clearHighlights` (in `graph-interactions.ts`) only removes `.dimmed` but not `.highlighted` or `.cycle-*`, then cross-state transitions leave residue.

**Verify:**

```js
// In browser console after clearing selection:
window.__CY__.elements().map(e => ({ id: e.id(), classes: e.classes() }))
  .filter(x => x.classes.some(c => ['dimmed','highlighted','impact-muted','impact-affected','impact-origin','finding-highlighted'].includes(c)))
```

If any element has a dim/highlight class while nothing is selected, `clearHighlights` is incomplete.

**Fix:** make `clearHighlights` remove all visual-state classes:

```js
const HIGHLIGHT_CLASSES = ['dimmed', 'highlighted', 'impact-muted', 'impact-affected', 'impact-origin', 'finding-highlighted'];
cy.elements().removeClass(HIGHLIGHT_CLASSES.join(' '));
// cycle classes by prefix if any
cy.elements().filter(e => e.classes().some(c => c.startsWith('cycle-'))).removeClass((ele) => {
  return ele.classes().filter(c => c.startsWith('cycle-')).join(' ');
});
```

---

## Lower — polish and one-line fixes

### B12. Hover card lingers during drag

`mouseover` starts a 250ms timer. If the user starts dragging before 250ms elapses, `dragfree` fires but the timer isn't cleared. Card pops up 250ms into or after the drag.

**Fix:** in `cy.on('grab', 'node', ...)` (or `'dragstart'` if available), `clearTimeout(hoverTimerRef.current); setHoverCard(null);`.

### B13. `accessibleNodes` includes filtered-out nodes

```js
const top50 = nodes.slice(0, 50);
```

`nodes` is the filtered graph nodes prop — so if filtering is applied, only visible nodes appear. Good. But `nodes` prop comes from `simulatedGraph` which is `visibleActiveData`-based, so it's already filtered. **No bug** — correction: this is fine.

But note: if `searchQuery` is set and filters the sidebar but not the graph (B8), then `accessibleNodes` (from `nodes`) shows all graph nodes even though the sidebar shows fewer. Minor inconsistency.

### B14. `committedMutatedGraph` in invalidation effect's deps

```js
useEffect(() => {
  // ...only acts when data.generatedAt changes
  if (committedMutatedGraph) setCommittedMutatedGraph(null);
}, [data, committedMutatedGraph]);
```

The `committedMutatedGraph` dep causes the effect to run every time the mutation changes, doing nothing. Use a ref instead.

### B15. `finding-highlighted` — confirm not also dead for cycle

Same as B6 but for `cycle-*` classes. Grep `grep -R "cycle-" explorer/src/lib/graph-style.ts`. If cycle styles are missing, `highlightCycle` from `graph-interactions.ts` is a no-op.

### B16. Empty state "Reset view" button doesn't help when 0 nodes

```jsx
{nodes.length === 0 && (
  <button onClick={executeResetLayout}>Reset view</button>
)}
```

`executeResetLayout` bails when `!cyRef.current`... but cy exists. Then it runs `runLayoutWithMetadata` with 0 nodes → probably errors or no-ops. **Fix:** either disable the button, or change it to "Clear filters" that resets `view.filterState`:

```jsx
<button onClick={() => onResetFilters?.()}>Clear filters</button>
```

Requires plumbing `onResetFilters` from `App.tsx`.

### B17. `WorkspaceHeader` has no findings badge on domain pills

Users only see the findings count when they click the findings lens. A dot on the `topological` or `governance` domain pill would signal "there's something here."

**Fix:** `<span className="domain-badge" />` next to `{dom.label}` for the domain that owns findings. One JSX line + one CSS rule.

### B18. `GraphControls` — `useImperativeHandle` recreates on every mode switch

```js
useImperativeHandle(ref, () => ({ ... }), [selectedNodeId, executeResetLayout, prefersReducedMotion]);
```

`executeResetLayout` depends on `architectureMode` → changes on mode switch → handle recreates → `graphRef.current` object identity changes. Any memoized consumer of `graphRef.current.resetLayout` re-renders. Given `handleResetView` calls `graphRef.current.fitView()`, and `useImperativeHandle` object changing doesn't break that, but it's churn.

**Fix:** drop `selectedNodeId` from deps by using a `selectedNodeIdRef` inside `centerSelected`:

```js
const selectedNodeIdRef = useRef(selectedNodeId);
useEffect(() => { selectedNodeIdRef.current = selectedNodeId; });

useImperativeHandle(ref, () => ({
  centerSelected: () => {
    const id = selectedNodeIdRef.current;
    if (cyRef.current && id) { /* ... */ }
  },
  // ...
}), [executeResetLayout, prefersReducedMotion]);
```

### B19. `GraphControls` — `handleToolbarKeyDown` recreates on every arrow press

`useCallback([activeControlIndex, getInteractiveElements])` → new callback on every arrow key. The `onKeyDown` binding on the container is a new function on every arrow press. Fine for React but slightly wasteful. Move `activeControlIndex` into a ref if you want to stabilize.

### B20. `App.tsx` — `handleCommitSimulation` may commit against stale `activeData`

```js
const handleCommitSimulation = () => {
  if (!activeData || !activeSimulationProposal) return;
  const validation = validateProposalCommit(activeSimulationProposal, activeProjectId, activeData);
```

`activeSimulationProposal` was created against some earlier `activeData` snapshot. If `activeData` changed since (re-analysis, project switch), validation catches it via `validateProposalCommit`. Good. **But the error thrown crashes the app (B3).** Fix B3 first, then this is fine.

### B21. Two `.dimmed` sources overlap

`highlightNodeConnections` and `focusOnNode` both dim. If user has focus active (`focusedNodeId` set) and then selects a node elsewhere, `highlightNodeConnections` applies its own dim, but `focusOnNode`'s dim on other nodes may still be there from the previous state. Result: nodes outside both clusters remain dimmed. Confirm by opening DevTools.

**Fix:** every highlight helper should call `clearHighlights(cy)` first. Or, prefer one highlight mode at a time — check `focusedNodeId` before applying selection highlight:

```js
if (focusedNodeId) {
  focusOnNode(cy, focusedNodeId);
} else if (selectedNodeId) {
  highlightNodeConnections(cy, selectedNodeId);
}
```

(That's already the shape of the focusedNodeId effect. The selectedNodeId effect doesn't check `focusedNodeId`. So the two can conflict.)

---

## Priority fix list

If you only have time for five:

| # | Bug | Fix size | Symptom removed |
|---|-----|----------|-----------------|
| **B1** | Drag positions saved to wrong mode | ~15 lines (add ref, thread mode through `captureAndPersistPositions`) | "My drag disappeared when I switched modes" |
| **B2** | Escape doesn't clear focus/drill | ~5 lines | "I can't get out of focus mode" |
| **B3** | `handleCommitSimulation` throws | ~2 lines (remove re-throw) | "App crashes after commit" |
| **B4** | Edge-selected leaves nodes dimmed | ~10 lines (consolidate selection effect) | "Nodes stay invisible after clicking a link" |
| **B7** | Dual layout on mode switch | ~3 lines (remove `architectureMode` from structural-sync deps) | Compounded flicker |

**B6** (finding-highlighted with no CSS) is worth checking with one grep — if the rule is missing, selecting a finding appears to do nothing.

**B10** (App.tsx effect re-registration) is the silent perf tax — every render re-registers `window` event listeners across 5 effects. A single profile run will confirm. Fix by memoizing actions in `useGraphSelection` / `useInvestigation` / `useViewState`.

---

## Verification harness

Before/after each fix, run this snippet in the browser console:

```js
// Test 1: dims clear when nothing is selected
window.__CY__.nodes().filter(n => n.hasClass('dimmed') || n.hasClass('impact-muted')).length === 0

// Test 2: mode switch doesn't orphan classes
// - switch modes, then run Test 1

// Test 3: drag survives mode switch
// - drag node X in mode A, note position
// - switch to mode B, note position (should differ)
// - switch back to A, position of X should match what you dragged

// Test 4: Escape exits all highlight modes
// - select node, press Escape
// - run Test 1 → should be true

// Test 5: no leftover performance marks
performance.getEntriesByType('mark').filter(m => m.name.startsWith('layout-')).length
// should be an even number (each start paired with an end)
```

If any test fails after your fixes, that specific bug is still live.

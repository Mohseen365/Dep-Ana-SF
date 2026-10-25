# Issues by Area

## 1. `WorkspaceHeader.tsx` — `.domain-lenses-bar`

**a) Broken ARIA tablist pattern.** The container declares `role="tablist"` and children use `role="tab"`/`aria-selected`/roving `tabIndex` — but there are **no `role="tabpanel"` elements** and no `aria-controls` on any tab. ATs will announce "tab" without a controlled panel. Either wire up real panels with `id`/`aria-controls`/`role="tabpanel"`, or downgrade to `role="navigation"` with `aria-current` (like the domain pills above do).

**b) Horizontal tablist hijacks Up/Down keys.** `handleTablistKeyDown` treats `ArrowUp`/`ArrowDown` as next/previous. Per ARIA APG, a horizontal tablist navigates only with Left/Right (+ Home/End). Up/Down should not be intercepted.

**c) Auto-activation on arrow.** `targetTab.click()` navigates immediately when focus moves. The APG recommends *manual activation* (focus only; activate on Enter/Space) when switching tabs is expensive — and each lens here swaps the whole workspace. Currently a single arrow keypress fires a full workspace navigation.

**d) No scroll-into-view.** The bar has `overflowX: 'auto'`, but `targetTab.focus()` won't scroll a focused tab into view. Add `targetTab.scrollIntoView({ block: 'nearest', inline: 'nearest' })`.

**e) Findings count lost to screen readers.** The `findings-count-pill` sits inside the tab, but the tab's `aria-label` overrides its content (`${def.label} view: ${def.title}`). SR users never hear the count. Fold it in: `aria-label={`${def.label} view: ${def.title}${mode === 'findings' && findingsCount ? `, ${findingsCount} findings` : ''}`}`.

**f) Missing `aria-orientation="horizontal"`** on the tablist (default is horizontal, but explicit is safer given the overflow scroll).

---

## 2. `GraphControls.tsx` — `.graph-controls-floating`

**a) `getInteractiveElements` filters by inline style only:**
```ts
el.style.display !== 'none'
```
This misses elements hidden by CSS classes (e.g. `.hidden`, `display:none` from a stylesheet). Hidden buttons will be included in the roving list. Use `el.offsetParent !== null` or `getComputedStyle(el).display !== 'none'`.

**b) Toolbar roving-tabindex is not implemented.** All buttons remain in the tab order and the handler walks a *flat* list of descendants across `role="group"` boundaries. Per the ARIA toolbar pattern, only one element should be tabbable; arrows should move between toolbar items. As written, Tab walks through every control, which defeats `handleToolbarKeyDown`.

**c) `activeControlIndex` is effectively dead state.** It's `set` on each arrow press but only read as a fallback when focus isn't inside the toolbar. It doesn't drive `tabIndex` on any control, so it does nothing useful. Either use it to maintain roving `tabIndex`, or drop it.

**d) No `aria-orientation`.** "Floating" controls are usually vertical; without `aria-orientation="vertical"` (or horizontal, whichever matches the CSS), ATs assume horizontal.

**e) Arrow key handling is duplicated but the DOM is not flat.** `ArrowDown` moves to the *next sibling in document order* across group boundaries. With a visual grid/wrap layout, this doesn't match what sighted users see. Given (b) above, the whole handler is fragile.

---

## 3. `GraphControls.tsx` — `.graph-control-btn`

**a) `title` and `aria-label` disagree on architecture mode.** For example when `architectureMode === 'hybrid'`:
- `title`: "Hybrid Layout (Clustered Feature Regions)" — describes the *current* mode.
- `aria-label`: "Switch to Architecture Orbit" — describes the *next* action.

Tooltips are exposed as the accessible description by many ATs, so SR users get contradictory info. Pick one convention (action-oriented is standard for buttons).

**b) `aria-pressed` is misused for a 4-state cycle.**
```tsx
aria-pressed={architectureMode !== 'hierarchical'}
```
This is a 4-way mode (hierarchical / hybrid / orbit / constellation), not a binary toggle. `aria-pressed=true` conveys "activated" without saying *which* of the three non-default modes is active. `aria-pressed` should be removed; use `aria-label` that names the current mode plus an action, or convert to a menu / radiogroup of 4 options.

Same problem visually: `className={... architectureMode !== 'hierarchical' ? 'active' : ''}` highlights the button for 3 of 4 modes — indistinguishable in the UI.

**c) Icons carry the mode visually, but are `aria-hidden`.** Because `aria-pressed` is misleading (b) and the emoji are hidden, AT users have no way to know whether they're in Orbit vs Hybrid vs Constellation. The `aria-label` only tells them the next mode.

**d) `layoutMode` toggle is the only one that correctly uses `aria-pressed`.** Keep this pattern; the others should be rewritten.

**e) Emoji glyphs vary by platform.** 🪐 / 🌌 / 🧩 render very differently across OS/font stacks. Not a bug per se, but combined with (c) it means the *only* non-text state channel is unreliable.

**f) No `disabled` handling if a handler is missing.** Currently controls are conditionally rendered when their callback is provided, which is fine — but `layoutMode` and `architectureMode` are always rendered, so if `onToggleLayoutMode` is undefined the button is enabled but does nothing. `handleToggleLayoutModeInternal` is guarded by `onLayoutModeChange ? ... : undefined` in `GraphView`, so this is OK today; just be careful if you refactor.

---

## 4. `App.tsx` — `handleToggleArchitectureMode`

**a) It doesn't exist in `App.tsx`.** The function is `handleToggleArchitectureModeInternal` in `GraphView.tsx`:
```tsx
const nextMode =
  architectureMode === 'hierarchical' ? 'hybrid'
  : architectureMode === 'hybrid'    ? 'orbit'
  : architectureMode === 'orbit'     ? 'constellation'
  : 'hierarchical';
onArchitectureModeChange?.(nextMode);
```

**b) 4-mode cycle with no direct selection.** To reach Constellation from Hierarchical requires 3 clicks. Combined with the misleading aria-pressed/tooltip in `GraphControls`, users can't predict or jump. A small menu / segmented control would be more usable.

**c) No visible persistence hookup in `App.tsx`.** `App.tsx` reads `architectureMode` from `projectStateContext.projectState.graphLayout.architectureMode`, but **does not pass an `onArchitectureModeChange`** into `WorkspaceShell` (at least not in this file). If the WorkspaceShell also doesn't wire it through, `handleToggleArchitectureModeInternal` calls a no-op and the mode is lost on reload. Verify this path.

**d) Order of the cycle vs. `title`/`aria-label` is consistent** (constellation→hierarchical, orbit→constellation, hybrid→orbit, hierarchical→hybrid) — but only by coincidence; there's no single source of truth. Define the cycle once (`const ARCH_CYCLE: ArchitectureLayoutMode[] = [...]`) and derive both UI labels and the toggle from it.

---

## 5. `GraphView.tsx` — the layout-and-render pipeline

(`applyLayoutAndRender` is not a function in this file; the equivalent is the cluster of effects: init, architecture-mode-switch, structural-sync, position-only.)

### Critical bugs

**a) `hasAuth` fallback always true when stored mode is absent:**
```tsx
const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
const hasAuth = storedArchMode === architectureMode;
```
If `graphLayout.architectureMode` is `undefined` (first load, cleared state, new project), `storedArchMode` collapses to the *current* mode and `hasAuth` is trivially `true`. `shouldAutoLayout` then sees "authoritative positions exist" and returns `false`, so **initial auto-layout is skipped** and everything lands on the deterministic-new-node fallback. Same pattern in the structural-sync effect:
```tsx
const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
if (storedArchMode === architectureMode) hasAuthForUpdate = true;
```
Fix: require an explicit stored mode **and** stored positions:
```tsx
const storedArchMode = graphLayoutRef.current?.architectureMode;
const hasAuth = storedArchMode === architectureMode
             && !!nodePositionsRef.current
             && Object.keys(nodePositionsRef.current).length > 0;
```

**b) Structural-sync tears down the graph on selection change.**
The dep array includes `effectiveLayoutOptions`, and `effectiveLayoutOptions` memo depends on `derivedFocalLwcId`, which depends on `selectedNodeId`. So clicking an LWC node removes and re-adds every Cytoscape element:
```tsx
cy.batch(() => { cy.elements().remove(); cy.add(newElements); });
```
This drops hover, drag, edge highlight state, and forces a full re-layout. `effectiveLayoutOptionsRef.current` is already kept up to date via the ref-sync effect — just drop `effectiveLayoutOptions` from the dep array and read from the ref inside.

**c) Simulated IDs in the structural dep array cause full rebuild per simulation step.**
```tsx
}, [..., simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]);
```
These only affect CSS classes at the *bottom* of the effect. On every simulation step index change, the entire element set is destroyed and rebuilt. Move the class application into its own effect keyed on those IDs.

**d) Static layout contract is violated for orbit/constellation.**
```tsx
if (autoLayoutPolicy === true || architectureMode === 'orbit' || architectureMode === 'constellation') {
```
Even after the user explicitly switched to `static`, orbit/constellation mode forces a layout run. This defeats the "positions locked" contract that the `graph-mode-badge` advertises. Gate this on the auto-layout policy in all modes.

### Less critical but real

**e) Init effect runs the layout twice.**
```tsx
if (autoLayoutPolicy === true) {
  cy.layout(layoutOptions).run();                    // 1st run
  const layoutRes = runLayoutWithMetadata(cy, {...}); // 2nd run
```
Flicker + wasted CPU. Pick one — `runLayoutWithMetadata` already computes provenance and feature regions, so drop the raw `cy.layout(...).run()`.

**f) `fit` is inconsistent across the three paths.**
- Init: no `fit` passed.
- Architecture-mode switch: `fit: true`.
- Structural sync: `fit: architectureMode === 'orbit' ? false : undefined`.
- Reset: no `fit` passed.

Pick a coherent policy and centralize it. Right now switching to Orbit triggers a layout that *doesn't* fit while switching to Hybrid does — unexplained asymmetry.

**g) `notifyComplete` mutates global state unrelated to the effect.**
```tsx
if (typeof window !== 'undefined' && (window as any).__CURRENT_CORRELATION_TOKEN__) {
  delete (window as any).__CURRENT_CORRELATION_TOKEN__;
}
```
This deletes a global correlation token from inside a layout effect. If two layout runs overlap (mode switch + structural sync, which is possible when both deps change in the same render), only the last writer's token survives. Keep the token in a ref, not on `window`.

**h) Position-only effect and structural effect resolve positions differently.**
```tsx
// Position-only effect:
const pos = sessionPositionsRef.current.get(id) || (nodePositions ? nodePositions[id] : undefined);
```
vs.
```tsx
// Structural effect:
resolveAuthoritativePosition(id, { sessionPositions, persistedPositions, cyNodePosition, hasAuthoritativePositions });
```
`resolveAuthoritativePosition` has explicit precedence rules and honors `hasAuthoritativePositions`; the position-only effect bypasses that. When `hasAuthoritativePositions` is false, the position-only effect still snaps nodes to persisted (stale) positions. Reuse the resolver.

**i) `useImperativeHandle` deps include `selectedNodeId`** so the handle object is recreated on every selection change. Methods like `zoomIn`/`zoomOut` don't depend on selection. Split the handle or read `selectedNodeId` from a ref inside `centerSelected`.

**j) Async `.catch(() => { ... fallback ... })` swallows the error.** No logging, no way to see *why* the worker failed. At minimum `console.error(err)` before falling back.

**k) `prevArchitectureModeRef` / `prevLayoutModeRef` are initialized with the current prop**, so if props change on the very next render (common when project state resolves asynchronously) the effects will see a transition and run layout unexpectedly. Consider seeding them lazily on first effect run.

---

### Summary of the highest-impact fixes

| # | File | Fix |
|---|------|-----|
| 1 | `WorkspaceHeader.tsx` | Add real `role="tabpanel"` + `aria-controls`, remove Up/Down hijack, add `scrollIntoView`, include findings count in `aria-label`. |
| 2 | `GraphControls.tsx` | Replace `aria-pressed` on the 4-way architecture cycle with a proper name/menu; align `title` and `aria-label`; fix hidden-element filter; add `aria-orientation`. |
| 3 | `GraphView.tsx` | Fix the `hasAuth` fallback (`undefined` stored mode ⇒ false); remove `effectiveLayoutOptions`/simulated IDs from the structural dep array; stop forcing orbit/constellation layout in static mode; stop double-layout in init. |
| 4 | Cycle logic | Centralize the arch-mode cycle in one constant used by both the toggle handler and the UI labels. |

# Deeper Review — Structural Improvements

Below is a layered analysis: architecture → state → layout pipeline → performance → accessibility → API design → testability. Bugs from the prior pass are only referenced where they're symptoms of a deeper issue.

---

## 1. `App.tsx` is a god component that has outgrown its shape

`AppContent` currently owns **~25 pieces of state** and forwards **~50 props** into `WorkspaceShell`. It mixes concerns that don't belong together:

| Concern | State it currently owns |
|---|---|
| Project routing | `activeProjectId`, `dataUrl`, `committedMutatedGraph` |
| Simulation | `activeSimulationProposal`, `simulationStepIndex` |
| Selection | delegated to hooks, but also mirrored |
| Focus | `effectiveFocusState` derived from `view.focusState + selection.selectedNodeId` |
| Impact | `highlightedImpactNodeIds` |
| Cycles | `selectedCycleId`, `diagnosticsTab` |
| Findings | `selectedFinding` |
| Handoff | `handoffTarget` |
| Detached drawer | `detachedWindowRef` + BroadcastChannel |
| Sidebar | `isSidebarCollapsed` |
| Constellation lens | `constellationOptions` |

**What to improve:**

- **Split into providers.** Each of the following deserves its own context or reducer: `SimulationContext`, `DiagnosticsContext` (cycles + tab), `HandoffContext`, `ConstellationOptionsContext`. `AppContent` should compose providers and render `<WorkspaceShell />` — nothing else.
- **Make the derived pipeline explicit.** Right now `activeData → focusedGraphData → visibleGraphData → simulatedGraph` is a 4-stage memo chain spread across 60 lines. Extract into one `useGraphPipeline(activeData, { filterState, focusState, simulation })` hook returning `{ committed, visible, simulated, positions }`. It becomes unit-testable in isolation.
- **Stop prop-drilling `graphRef`.** It's a ref used by `handleResetView` to call `fitView()`. That's a command — use an event or `useImperativeHandle` on a provider, not a prop threaded through a shell.

The signal you've outgrown the shape is `handleToggleArchitectureModeInternal` — "internal" implies there's another one somewhere, and it exists because `GraphView` has to re-derive the cycle logic that `GraphControls` already knows about.

---

## 2. There is no single source of truth for layout mode or architecture mode

`architectureMode` is simultaneously:

- read from `props.architectureMode`
- fallback to `graphLayout?.architectureMode`
- defaulted to `'hierarchical'`
- mirrored to `prevArchitectureModeRef`
- mirrored to `effectiveLayoutOptions`
- written to `projectState.graphLayout.architectureMode` (via router)
- read back on next render

The same is true of `layoutMode` and `nodePositions`.

**What to improve:**

- **Introduce a `LayoutStateProvider`** that owns `{ layoutMode, architectureMode, focalLwcId, positionsByMode }` and exposes imperative actions (`cycleArchitecture`, `setLayoutMode`, `recordUserPositions`). `GraphView` becomes a consumer, not a re-deriver.
- **Centralize the cycle.** Today, the 4-mode rotation lives in `handleToggleArchitectureModeInternal`, and the UI labels live in `GraphControls`. Extract one constant:
  ```ts
  const ARCH_MODE_CYCLE: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];
  const next = ARCH_MODE_CYCLE[(ARCH_MODE_CYCLE.indexOf(current) + 1) % ARCH_MODE_CYCLE.length];
  ```
  and derive both the icon and the labels from a single `ARCH_MODE_META` map. This alone kills the title/aria-label divergence and the misused `aria-pressed`.
- **Drop `prevArchitectureModeRef` / `prevLayoutModeRef`.** React already tells you what changed if you split effects by concern:
  ```ts
  useEffect(() => { /* runs when architectureMode changes */ }, [architectureMode]);
  useEffect(() => { /* runs when layoutMode changes */ }, [layoutMode]);
  ```
  The current pattern makes the effect fire on the *render after* the change, which is why `pendingModeSwitchCaptureRef` exists at all.

---

## 3. Position ownership is genuinely unclear

There are **six** places a node position can live:

1. `props.nodePositions`
2. `graphLayout.nodePositions`
3. `graphLayout.layoutPositions[architectureMode]`
4. `nodePositionsRef.current`
5. `sessionPositionsRef.current` (drag-time)
6. `cyPositionsBefore` (captured at the top of the structural effect)

`resolveAuthoritativePosition` documents precedence between some, but not all, and the position-only effect bypasses it entirely.

**What to improve:**

- **Model positions as one reducer:**
  ```ts
  type PositionsState = {
    byMode: Record<ArchitectureLayoutMode, Record<string, Position>>;
    session: Record<string, Position>;   // explicit user drags, current session
    provenance: Record<string, LayoutProvenance>;
  };
  ```
  Every read goes through `getPosition(id, mode)`, every write through `recordPosition(id, position, provenance)`. `captureAndPersistPositions` becomes an action, not a scatter of `.set()` calls.
- **Session positions should be merged, not stacked.** Today `sessionPositionsRef` accumulates forever in a session — even after switching modes and modes back. On mode switch you already clear it. On project switch you clear it. But on lens switch you don't. Add an explicit `session.reset()` to every context boundary.
- **`layoutPositions[architectureMode]` exists in the type but is barely used** (`const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {}`). Either use it as the primary cache for per-mode positions (my recommendation — it eliminates the need for most refs) or delete it.

---

## 4. `GraphView` has too many responsibilities

900+ lines, 8+ effects, and it owns:

- Cytoscape lifecycle
- Navigator lifecycle
- Layout orchestration (sync + async + fallback)
- Hover card timers
- Keyboard graph navigation
- Accessibility tree generation
- Simulation class application
- Feature overlay wiring
- Focus/highlight application

**What to improve — split into hooks:**

| Hook | Responsibility |
|---|---|
| `useCytoscape(container, elements, style)` | create/destroy Core, expose ref |
| `useNavigator(cy, visible)` | attach/detach navigator |
| `useGraphLayout(cy, mode, options)` | orchestration, provenance, feature regions |
| `useGraphSelectionSync(cy, { selectedNodeId, selectedEdgeId })` | selection + highlight effects |
| `useGraphHoverCards(cy, nodes, edges)` | hover timers |
| `useGraphKeyboard(cy, { onSelectNode, onSelectEdge })` | key handling |
| `useSimulationClasses(cy, { addedIds, removedIds, edgeIds })` | class toggling |

`GraphView` then becomes ~120 lines of composition. This is where the biggest maintainability win is.

**Also:** remove the "second effect depends on `effectiveLayoutOptions`" bug class entirely. If `useGraphLayout` takes `mode` and `options` as arguments and stores them in refs internally, the structural-sync effect never needs to see options in its deps.

---

## 5. The layout pipeline is over-orchestrated

There are currently **four** distinct code paths that call `runLayoutWithMetadata` or `runLayoutWithMetadataAsync`:

1. Init effect (with a duplicate `cy.layout(...).run()` first)
2. Architecture-mode switch effect
3. Structural-sync effect
4. `executeResetLayout`

Each has slightly different arguments (`fit`, `animate`, `existingPositions`, `enableFeatureLayout`, `correlationToken`, fallback behavior). They drift.

**What to improve:**

- **Single `runLayout(cy, options, reason)` function** that takes a `reason: 'initial' | 'mode-switch' | 'structural' | 'reset' | 'focal-change'` and internally decides `fit`, `animate`, `existingPositions`, and provenance. Reasons become a discriminated union, so adding a reason is a single switch statement.
- **Delete the duplicate `cy.layout(layoutOptions).run()`** in the init effect. `runLayoutWithMetadata` already does this with better bookkeeping.
- **Consolidate the async-fallback pattern.** Today: `runLayoutWithMetadataAsync(...).then(...).catch(() => runLayoutWithMetadata(...))`. The catch swallows the error. Refactor to a wrapper that logs, sets a `layout-degraded` flag, and dispatches a single completion event regardless of path.
- **Make the fit policy explicit.** Right now it's `fit: true` for mode switch, `undefined` for init, `architectureMode === 'orbit' ? false : undefined` for structural, and omitted for reset. Define it once:
  ```ts
  const shouldFit = reason === 'mode-switch' || reason === 'reset' || (reason === 'initial' && !hasAuth);
  ```
  Then explain *why* Orbit doesn't fit (it currently doesn't, but nobody reading the code knows that).

---

## 6. The structural-sync effect rebuilds the world

```tsx
cy.batch(() => {
  cy.elements().remove();
  cy.add(newElements);
});
```

**What this costs:**

- Element identity is destroyed → any per-element Cytoscape state (`selected`, `hovered`, `grabbed`) is lost
- Running animations are cancelled mid-flight
- Hover card state can reference removed elements
- Every rebuild re-parses style rules for every element

**What to improve — differential reconciliation:**

```ts
const incoming = new Map(newElements.map(el => [el.data.id, el]));
cy.elements().forEach(el => {
  const next = incoming.get(el.id());
  if (!next) el.remove();
  else { el.data(next.data); incoming.delete(el.id()); }
});
incoming.forEach(el => cy.add(el));
```

This preserves identity for unchanged elements. Do this in a `useGraphElements(cy, elements)` hook.

---

## 7. Simulation classes shouldn't live in the structural effect

`simulatedNodeIds`, `simulatedRemovedNodeIds`, `simulatedEdgeIds` are only used to add/remove CSS classes at the bottom of the structural effect, but they're in the dep array — so **every simulation step tears down and rebuilds every element**. Move to a dedicated effect:

```tsx
useEffect(() => {
  cy.batch(() => {
    cy.elements().removeClass('simulated-added simulated-removed simulated-affected');
    simulatedNodeIds.forEach(id => cy.getElementById(id).addClass('simulated-added'));
    // ...
  });
}, [simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]);
```

Same pattern for `impactResult`, `selectedCycleNodeIds`, `selectedFinding`, `focusedNodeId` — all of these already have dedicated effects. Good. Simulation is the outlier.

---

## 8. `window` as a message bus

Four globals are in play:

- `window.__CY__` — exposes the cytoscape instance (used by E2E tests?)
- `window.__LAYOUT_MODULE__` — exposes layout functions
- `window.__CURRENT_CORRELATION_TOKEN__` — read/written across modules
- `window.__LAST_LAYOUT_COMPLETED__` — completion telemetry

Also a `CustomEvent('app:layoutcomplete')` and a `CustomEvent('explorer:project-changed')`.

**What to improve:**

- **`__CY__` and `__LAYOUT_MODULE__` are test seams.** Keep them, but gate behind `import.meta.env.DEV` or a `__DEV_EXPOSE__` flag so production doesn't leak internals.
- **Correlation tokens belong in a ref or module singleton** — not `window`. `delete (window as any).__CURRENT_CORRELATION_TOKEN__` inside an effect is a data race waiting to happen (two overlapping layout runs → last writer wins).
- **Replace `CustomEvent('app:layoutcomplete')` with a typed event emitter** in a module. Or better: have `useGraphLayout` expose a subscription API and let callers subscribe. `window.dispatchEvent` with an untyped `detail` payload is invisible to TS.

---

## 9. Performance hotspots

Beyond the structural rebuild:

- **`featureAssignmentMap` recomputes on every `discoveryResult` change.** `discoverFeatures(nodes, edges)` runs on every node/edge change, and it's likely O(n²) or worse. Memoize against a stable graph fingerprint (sorted node IDs + edge IDs), not array identity.
- **`findings = runAllRules(ctx)` runs whenever `ctx` changes.** `ctx` changes on every `activeData` reference change — including when `committedMutatedGraph` is set even for graphs with no rules-relevant change. Cache findings in `ProjectState`.
- **`accessibleNodes` capped at 50** — the rest are unreachable for SR users. A real solution is virtualization with an ARIA live region for "showing X of Y", or making the accessible list a `listbox` (see §11).
- **`effectiveLayoutOptions` is a new object every render** and it's passed into `useGraphLayout`. If you adopt the hook-based decomposition with internal refs, this disappears.
- **`initialZoom` thresholds (15/50/200) are magic.** Extract into `getInitialZoom(nodeCount)` next to `computeCanvasLODLevel` and unit-test the boundary values.
- **`computeCanvasLODLevel` runs on every zoom (debounced 60ms).** It recomputes from scratch instead of stepping through levels based on prior level + direction. For large graphs this is measurable.

---

## 10. Accessibility — real gaps beyond ARIA attributes

- **The graph itself has no keyboard-reachable node list.** `handleKeyDown` requires a `selectedNodeId` to do anything; a first-time keyboard user has no way to select the first node. Add: when graph has focus and no node is selected, `ArrowRight`/`ArrowDown` selects the first node in `accessibleNodes`.
- **`sr-only` list with `<button>` items** works, but if there are 50 items and 3,000 nodes, this is not a substitute for a real navigator. Consider a `role="listbox"` with `aria-activedescendant` for scalability.
- **`role="toolbar"` on `.graph-controls-floating`** — per APG, the toolbar should contain only one tabbable element (roving tabindex), which you don't implement. Also, `role="toolbar"` is only valid if the container is itself focusable or its children are. Currently the container has no `tabIndex`, so `aria-orientation` won't be announced. Add `tabIndex={-1}` or make it a landmark instead.
- **`aria-label="Graph controls"`** — this is fine, but the *groups* inside use `aria-label="Analysis controls"` etc. Those are announced as landmarks inside the toolbar. It's arguably noise. Consider dropping them or converting to `role="group"` without labels (the visual groupings are clear).
- **The `Escape` handler in `App.tsx`** clears selection globally; in `GraphView.handleKeyDown` it also clears selection. Two Escape handlers, no ordering guarantee. Consolidate.
- **No `prefers-reduced-motion` respect for the initial zoom or navigator animation.** You check it for `animate` in layout but not for `cy.animate({ center: ... })` in `centerSelected`.

---

## 11. API and type design

- **`GraphViewProps` has 30+ optional props.** Half of them are duplicated: `onNodePositionChange` and `onNodePositionsChange` differ only by name; `onNodeDragEnd` is a subset of `onNodePositionsChange`. Collapse to a single `onPositionsChange(next, provenance, { source })` where `source` is `'drag' | 'layout' | 'user-authored' | 'reset'`. This kills the `as any` cast in `captureAndPersistPositions`.
- **`ArchitectureLayoutMode` includes `'hierarchical' | 'hybrid' | 'orbit' | 'constellation'`** but the button icons, labels, and tooltips are all string-switched in three separate places. Add `ARCH_MODE_META: Record<ArchitectureLayoutMode, { label, icon, description }>`.
- **`LayoutProvenance`** currently encodes both the *reason* and the *mode* (`'automatic-hybrid'`). Split into `{ reason: 'automatic' | 'user', mode: ArchitectureLayoutMode }`. This makes "user-authored" positions survivable across mode switches (which is currently broken — user drags get cleared on mode change).
- **`GraphLayoutState.layoutPositions`** is `Partial<Record<ArchitectureLayoutMode, ...>>` but never indexed with confidence. Make it `Record<ArchitectureLayoutMode, ...>` with defaults.
- **`FocusState` and `ImpactAnalysisResult` are re-exported through three modules.** One canonical export in `types/explorer.ts` would prevent drift.

---

## 12. Testability

There are no visible tests in these files, and the structure actively resists them:

- The layout decision logic (`shouldAutoLayout` + `resolveAuthoritativePosition` + `getLayoutOptions`) is pure and should have a `layout-policy.test.ts` table testing every (mode, reason, hasAuth, hasNewNodes) combination.
- The arch-mode cycle is a single pure function — test it.
- The `WorkspaceHeader` keyboard handler should be tested with `@testing-library/user-event` for the `role="tablist"` semantics.
- `GraphView` has no dependency injection for `cytoscape` — it imports the singleton. Consider injecting the factory so you can test with a stub cy.
- Simulation commits are validated (`validateProposalCommit`), but nothing else in the layout pipeline is. Add an invariant assertion (in dev) that after any effect runs, `cy.nodes().length === expectedNodes.length`.

---

## 13. Small but consistently wrong patterns

- **`type HoverCardState = NodeHoverCardData | EdgeHoverCardData | null`** — this is fine, but the discriminant `type` is string-literal `'node' | 'edge'`. If you ever add a third card type, every `hoverCard.type === 'node'` check needs updating. Consider `switch` with exhaustiveness.
- **Two `useEffect`s with the same purpose** (`selectedNodeId`/`selectedEdgeId`): one in the structural effect, one in its own effect, one in a third. When selectedNodeId changes, all three run. Consolidate.
- **`accessibleNodes` uses `nodes.slice(0, 50)`** — "first 50" is arbitrary. Better: prioritize (a) selected, (b) focused, (c) high-risk, (d) rest.
- **`document.body.style.cursor = 'default'`** on mouseleave — this clobbers any cursor set elsewhere. Use a scoped class on the container.
- **`window.matchMedia`** is called without a guard in some places and with `?.` in others. Be consistent — always `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false`.
- **The `graph-mode-badge`** claims "📌 Static Mode — Node positions preserved" but users can still drag nodes in static mode. Either lock dragging in static mode (`cy.autolock(true)`) or change the copy.

---

## 14. Priority-ranked improvement plan

If you do nothing else:

1. **Extract `useGraphLayout` + `useCytoscape` + `useGraphSelectionSync`** from `GraphView`. This is the single biggest maintainability win.
2. **Introduce a `LayoutStateProvider`** that owns modes + positions. This eliminates `prevArchitectureModeRef`, the title/aria-label drift, and `handleToggleArchitectureModeInternal`.
3. **Differential element reconciliation** instead of `remove()` + `add()`. Stops every selection from tearing down the graph.
4. **Move simulation/impact/finding/cycle classes to dedicated effects.** Removes `simulated*` from the structural dep array.
5. **Centralize `ARCH_MODE_META` and the cycle constant.** Kills a whole class of UI drift.
6. **Fix the `hasAuth` fallback** (prior review) and remove the double layout in init.
7. **Add unit tests** for `shouldAutoLayout`, `resolveAuthoritativePosition`, and the arch-mode cycle.
8. **Split `AppContent`** into providers; `WorkspaceShell` becomes a layout, not a prop-sink.
9. **Replace `window.__CURRENT_CORRELATION_TOKEN__`** with a module-level ref or proper subscription.
10. **Extend the accessible node list** with a navigable listbox or virtualized list.

The throughline: **every bug in the prior review is a symptom of a state or ownership boundary that isn't drawn.** Draw the boundaries, and the bugs stop recurring.

# Small Effort, Disproportionate Payoff

These are all one-file, one-shot additions. Each is 5–40 lines and removes a class of problem — not just a symptom. Ordered by impact-per-line.

---

## 1. Observability — turn the layout pipeline from a black box into a panel

### 1a. `?debug=layout` panel (≈30 lines)

You have **four** layout code paths with different args. When something looks wrong, you currently have no way to see which one ran.

```tsx
const DEBUG = new URLSearchParams(location.search).has('debug');
{DEBUG && (
  <div className="graph-debug-panel">
    <div>arch: {architectureMode}</div>
    <div>layout: {layoutMode}</div>
    <div>running: {String(isLayoutRunningRef.current)}</div>
    <div>reqId: {layoutRequestRef.current}</div>
    <div>nodes: {nodes.length} / cy: {cyRef.current?.nodes().length}</div>
    <div>last: {JSON.stringify((window as any).__LAST_LAYOUT_COMPLETED__)}</div>
  </div>
)}
```

You already set `window.__LAST_LAYOUT_COMPLETED__`. You just never surface it. This one panel pays for itself on the first layout bug you chase.

### 1b. `data-*` attributes on the graph container (5 lines)

```tsx
<div
  className="graph-container"
  data-architecture-mode={architectureMode}
  data-layout-mode={layoutMode}
  data-layout-running={isLayoutRunningRef.current}
  data-node-count={nodes.length}
  data-edge-count={edges.length}
>
```

E2E tests, screenshots, and DevTools inspections all become self-describing. No test needs to poke at `window.__CY__`.

### 1c. `performance.mark` / `measure` around layout (6 lines)

```tsx
performance.mark(`layout-${reason}-start`);
// ...run layout...
performance.mark(`layout-${reason}-end`);
performance.measure(`layout:${architectureMode}`, `layout-${reason}-start`, `layout-${reason}-end`);
```

Chrome DevTools Performance panel populates automatically. No library. Zero downside.

### 1d. Duplicate-layout detector (8 lines)

Catches bugs like the init double-layout in your current code.

```tsx
const lastRunRef = useRef<{ reason: string; at: number } | null>(null);
const guardLayoutRun = (reason: string) => {
  const now = performance.now();
  if (lastRunRef.current && now - lastRunRef.current.at < 150) {
    console.warn(`[layout] duplicate run: ${lastRunRef.current.reason} → ${reason} (${Math.round(now - lastRunRef.current.at)}ms)`);
  }
  lastRunRef.current = { reason, at: now };
};
```

Call it at the top of every `runLayoutWithMetadata` invocation. Instantly surfaces the entire "why does the graph flicker" class.

---

## 2. Stability guards — one-line additions that prevent visible breakage

### 2a. Layout re-entry guard (4 lines)

Currently, a mode-switch effect and a structural effect can race and both run layouts. Guard at the top of `runLayoutWithMetadata` calls:

```tsx
if (isLayoutRunningRef.current && reason !== 'mode-switch') return;
```

Or better — a monotonic request ID that already exists (`layoutRequestRef`) should gate *all* paths, not just the async one. You're one `if (requestId !== layoutRequestRef.current) return;` away from eliminating a whole family of race bugs.

### 2b. Desync invariant check in dev (10 lines)

```tsx
useEffect(() => {
  if (!import.meta.env.DEV || !cyRef.current) return;
  const cyCount = cyRef.current.nodes().length;
  if (cyCount !== nodes.length) {
    console.error(`[graph] desync: cy=${cyCount} data=${nodes.length}`);
  }
}, [nodes, cyInstance]);
```

Catches "the graph shows 47 nodes but the sidebar says 50" without a debugging session.

### 2c. Empty graph state (≈15 lines)

`nodes.length === 0` currently renders an empty Cytoscape canvas with a floating toolbar over nothing. Add:

```tsx
{nodes.length === 0 && (
  <div className="graph-empty-state">
    <span aria-hidden>🔍</span>
    <p>No components match the current filters.</p>
    <button onClick={onResetLayout}>Reset view</button>
  </div>
)}
```

Cheap. Removes a "is it broken?" moment for every new user.

### 2d. `<GraphErrorBoundary>` (~25 lines, one file)

If any of `NodeHoverCard`, `EdgeHoverCard`, or `FeatureOverlayCanvas` throws, the entire app unmounts. Wrap just the graph region:

```tsx
class GraphErrorBoundary extends React.Component<{children: React.ReactNode}, {err: Error | null}> {
  state = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) { console.error('[graph]', err, info); }
  render() {
    if (this.state.err) return <div className="graph-error">Graph failed to render. <button onClick={() => this.setState({err:null})}>Retry</button></div>;
    return this.props.children;
  }
}
```

One file, used once. Now a broken hover card doesn't take down the whole workspace.

---

## 3. Accessibility — the highest-leverage one-liners you're missing

### 3a. `aria-keyshortcuts` on every control (2 words per button)

You already advertise keyboard shortcuts in tooltips (`"Zoom In (+)"`, `"Exit Fullscreen (Esc)"`). Screen readers only see them if you declare them:

```tsx
aria-keyshortcuts="+"
aria-keyshortcuts="Escape"
aria-keyshortcuts="f"
```

Twelve additions, one per button. Zero behavior change, real a11y win.

### 3b. `aria-live` layout announcer (6 lines)

Blind users currently have no idea a layout ran. Add:

```tsx
<div className="sr-only" aria-live="polite" aria-atomic="true">
  {`${architectureMode} layout applied, ${nodes.length} components`}
</div>
```

Bind it to a piece of state that updates when `__LAST_LAYOUT_COMPLETED__` changes. Because you already dispatch the event, this is a 6-line useEffect.

### 3c. `usePrefersReducedMotion` hook (10 lines)

You currently inline `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false` in **three** places, with inconsistent optional chaining. One hook:

```tsx
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  );
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}
```

Now `centerSelected`'s `cy.animate(...)` also respects it — currently it doesn't. Consistency is a one-line change once the hook exists.

### 3d. `disabled` with a reason, not conditional render (2 lines per control)

`onCenterSelected` is currently conditionally rendered (`{hasSelectedNode && <button…>}`). The toolbar reflows on every selection. Instead:

```tsx
<button
  className="graph-control-btn"
  onClick={onCenterSelected}
  disabled={!hasSelectedNode}
  title={hasSelectedNode ? 'Center Selected Component' : 'Select a node first'}
>
```

No layout shift, and the tooltip explains *why* it's disabled. Same pattern applies to Reset Layout when `nodes.length === 0`.

---

## 4. Performance — memo boundaries that pay off immediately

`GraphView` rerenders on every hover, every selection change, every simulation step. Each rerender constructs brand-new callback props. `GraphControls`, `GraphLegend`, `NodeHoverCard`, `EdgeHoverCard` all rerender with fresh props. Fix with two small primitives:

### 4a. `useEvent` — stable callback identities (~15 lines)

```tsx
export function useEvent<F extends (...args: any[]) => any>(fn: F): F {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback(((...args) => ref.current(...args)) as F, []);
}
```

Then wrap every inline arrow passed to `GraphControls`:

```tsx
const onZoomIn = useEvent(() => { if (cyRef.current) cyRef.current.zoom(...); });
// ...
<GraphControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} ... />
```

### 4b. `React.memo` on the leaf components (1 line each)

```tsx
export const GraphControls = React.memo(function GraphControls(props) { ... });
```

With (4a) in place, memoization actually works — otherwise prop identity changes every render and it's a no-op.

**Combined effect:** hover/selection no longer rerender the toolbar, legend, or cards. On a 500-node graph with a fast mouse, this is the difference between 60fps and visible jank.

### 4c. Cache `getGraphStyles` output (3 lines)

It's called on every init with the same arguments and returns a fresh array:

```ts
let cachedStyles: cytoscape.Stylesheet[] | null = null;
export function getGraphStyles(opts: GraphStyleOptions) {
  if (cachedStyles && sameOptions(opts)) return cachedStyles;
  cachedStyles = buildStyles(opts);
  return cachedStyles;
}
```

Cytoscape re-parses the entire stylesheet on every `cy.add()`. On structural sync, this is not free.

### 4d. `data.id` reuse instead of `remove()` + `add()`

I mentioned this in the deeper review, but the smallest impactful version is one-level-up: **wrap the reconciliation in a hook** so the effort is paid once. ~25 lines. Once written, every future effect that touches elements benefits.

---

## 5. State hygiene — kill three classes of drift in ~60 lines total

### 5a. `ARCH_MODE_META` constant (~12 lines)

You currently have the mode's icon in one place, its tooltip in another, its aria-label in a third, and its cycle-neighbor in a fourth. All four currently disagree. One object:

```ts
export const ARCH_MODE_META: Record<ArchitectureLayoutMode, {
  icon: string; label: string; description: string; next: ArchitectureLayoutMode;
}> = {
  hierarchical: { icon: '🏢', label: 'Hierarchical', description: 'Layered flow', next: 'hybrid' },
  hybrid:       { icon: '🧩', label: 'Hybrid',       description: 'Clustered feature regions', next: 'orbit' },
  orbit:        { icon: '🪐', label: 'Orbit',        description: 'Radial concentric bands', next: 'constellation' },
  constellation:{ icon: '🌌', label: 'Constellation',description: 'Multi-sun macro view', next: 'hierarchical' },
};
```

Three files consume it. Every prior "the tooltip says one thing, the aria-label says another" bug becomes impossible by construction.

### 5b. URL hash sync for modes (~15 lines)

Makes every layout state shareable and refresh-safe for free:

```tsx
useEffect(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('arch') !== architectureMode) { h.set('arch', architectureMode); location.hash = h.toString(); }
}, [architectureMode]);
```

Same for `layoutMode`. Deep links to "the constellation view of this project" now work. Users recover from corrupt state by reloading.

### 5c. `localStorage` fallback for modes (~10 lines)

When `projectState` fails to load or a new project has no state, you currently default to `'hierarchical'`. Instead:

```ts
const fallback = localStorage.getItem('graph:lastMode') as ArchitectureLayoutMode | null ?? 'hierarchical';
```

Persist on every change. Small. Removes the "why did my layout mode reset?" moment.

### 5d. Gate `window.__CY__` and `window.__LAYOUT_MODULE__` behind a dev flag (4 lines)

```tsx
if (import.meta.env.DEV || (window as any).__EXPOSE_CY__) { (window as any).__CY__ = cy; ... }
```

Two-line change. Removes an internals-leak vector from production without breaking tests (set the flag in your test bootstrap).

---

## 6. Small UX affordances that punch above their weight

### 6a. Show the architecture mode name next to the icon in the toolbar

Emoji alone is ambiguous (🪐 could be "space" or "planets"). One `<span className="graph-control-btn-label">` next to the icon showing `ARCH_MODE_META[mode].label`. Trivial. Eliminates the "which mode am I in?" question — which the current misused `aria-pressed` also fails to answer.

### 6b. Double-click the mode badge to cycle layout mode

`<div className="graph-mode-badge" onDoubleClick={handleToggleLayoutModeInternal}>`. Two lines. Power users get a fast path; the toolbar still works for everyone else.

### 6c. `title` on the mode badge showing its keyboard shortcut

Already has a title. Add the shortcut once you add one (§3a).

### 6d. Persist the last lens per domain in `WorkspaceHeader`

```tsx
const lastLens = localStorage.getItem(`lens:${domainKey}`) || dom.defaultViewMode;
onClick={() => navigateToView(lastLens)}
```

Two lines in the pill handler. Users return to *their* preferred lens, not the default. This is the single most-requested affordance in workspace apps.

### 6e. A dots badge on domain pills when that domain has findings

You show a numeric badge on the Findings lens. Users won't know the Findings lens lives in the Topological domain until they click. Small dot on the domain pill when `findingsCount > 0`. One conditional span.

---

## What NOT to add (tempting but wrong for "small effort")

- **Virtualized node list.** Medium effort, needs a library, changes test infra. Defer.
- **WebWorker for `discoverFeatures`.** Real win but requires bundler config + message protocol. Medium.
- **Full roving-tabindex for the toolbar.** The right pattern, but requires restructuring tab order across all controls. ~1 day. Do it when you have test coverage.
- **Replacing `window.__CURRENT_CORRELATION_TOKEN__` with a proper subscription.** Correct, but touches every layout path. Medium.
- **A layout reconciler that diffs `ElementsDefinition[]` and `cy.elements()`.** Highest-ceiling item, but ~100 lines and needs tests. Do it after you add the invariant check (§2b) so you can verify it works.

---

## Recommended order of execution

If you have one afternoon:

1. **§1a–d (observability)** — 45 min. Every subsequent change is easier to verify.
2. **§5a (`ARCH_MODE_META`)** — 20 min. Immediately fixes the title/aria-label/pressed drift from the prior review.
3. **§3b (`aria-live`)** + **§3a (`aria-keyshortcuts`)** — 30 min. Highest a11y win in the codebase.
4. **§4a–b (`useEvent` + `React.memo`)** — 30 min. Feels faster immediately, especially on large graphs.
5. **§2c (empty state)** + **§2d (error boundary)** — 30 min. Removes two "is it broken?" failure modes.
6. **§5b–c (URL hash + localStorage)** — 20 min. Deep-linking and refresh resilience.

That's under three hours, and it makes every subsequent improvement cheaper to make *and* cheaper to verify.

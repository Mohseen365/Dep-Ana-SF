# Deep Pass — New Findings, Consolidated Priorities, Impact/Effort Map

Below is a fresh read of every file you shared, cross-referenced with what landed from the previous passes. I've separated genuinely new findings from carried-over issues, then closed with an impact/effort map.

---

## Part 1 — New findings (not surfaced before)

### `graph-style.ts`

**N1. `lwc-apic` is a typo; the rule never fires.**
```ts
'lwc-apic': '#f97316',   // ← should be 'lwc-apex'
```
The type is `lwc-apex` in `ExplorerRelationshipType`. The rule is dead code. One-character fix.

**N2. `event-publisher` has no color.**
The type exists in `ExplorerRelationshipType` but is absent from `EDGE_COLORS`. That edge falls back to the base `#94a3b8` gray. Add `'event-publisher': '#8b5cf6'` or similar.

**N3. Risk border colors are silently overridden by type rules.**
Order in the styles array:
1. `node[risk = "HIGH"]` → sets `border-color: #dc2626`
2. `node[type = "ApexClass"]` → sets `border-color: #1d4ed8`

Cytoscape applies same-specificity rules in declaration order, later wins. So **every node's border shows the type color, never the risk color**. The "high risk = red border" affordance is invisible. Fix by moving the risk rules *after* the type rules, or by using a class (`.risk-high`) instead of an attribute selector.

**N4. `lod-0` … `lod-4` classes are dead.**
```ts
cy.elements().addClass(`zoom-far lod-${lodConfig.lodLevel}`);
```
`lod-*` is added but no CSS targets those classes. Either add rules or stop adding them.

**N5. `node[isTest = "true"]` expects a string; `behavior.isTest` is a boolean.**
The rule only matches if `graph-builder` stringifies the boolean before adding it as a data attribute. Verify or change to `node[isTest]`.

**N6. `Object` and `CustomObject` (and `Field`/`CustomField`) share colors.**
Legitimately different node types are visually indistinguishable in the legend and graph. Either differentiate or document that they intentionally merge.

**N7. `min-zoomed-font-size` + `zoom-far` label rules are redundant.**
The base node declares `min-zoomed-font-size: 10`, and `.zoom-far` also sets `label: ''`. One or the other is sufficient. Keep the `min-zoomed-font-size` (cheaper) and drop the class-based label stripping, or vice versa.

---

### `GraphView.tsx`

**N8. `discoveryResult` recomputes on every keystroke in search.**
```ts
const discoveryResult = useMemo(() => discoverFeatures(nodes, edges), [nodes, edges]);
```
`nodes` and `edges` change on every filter/search update (because App.tsx filters before passing them). If `discoverFeatures` is anything worse than O(V+E), this is a real perf issue. Memo keyed on a structural fingerprint:
```ts
const graphFingerprint = useMemo(() => `${nodes.length}:${edges.length}`, [nodes, edges]);
const discoveryResult = useMemo(() => discoverFeatures(nodes, edges), [graphFingerprint]);
```
Or hoist `discoverFeatures` into `App.tsx` on `activeData` instead of `visibleGraphData`.

**N9. Hover state set without diff-check → excessive rerenders.**
```ts
cy.on('mouseover', 'node', (evt) => {
  setHoveredNodeId(nodeId);   // fires even if same node is re-hovered
  ...
});
```
On fast mousemove, `mouseover` fires on every node boundary; if the pointer leaves and re-enters the same node, this triggers a rerender even though `hoveredNodeId` is unchanged. React bails out on identical primitive state, but the call still schedules a render tick. Guard with a ref:
```ts
if (hoveredNodeIdRef.current !== nodeId) { hoveredNodeIdRef.current = nodeId; setHoveredNodeId(nodeId); }
```
Same treatment for `setHoverCard(null)` on mouseout.

**N10. `mouseleave` cursor reset clobbers the global cursor.**
```ts
document.body.style.cursor = 'default';
```
If a modal or drawer sets a `wait` cursor, this stomps it. Scope to the container: `containerRef.current.style.cursor = ''`.

**N11. `useProjectSafe` in App.tsx swallows errors silently.**
```ts
function useProjectSafe() {
  try { return useProject(); } catch (_) { return null; }
}
```
A genuine hook-context error is indistinguishable from "no provider". At minimum `console.warn(e)` in dev.

**N12. `handleProjectChanged` effect likely re-subscribes on every render.**
```ts
}, [activeProjectId, selection, view]);
```
If `useGraphSelection()` or `useViewState()` return new objects each render (typical), this listener is torn down and re-added constantly. Either return stable references from those hooks, or split the effect into individual `activeProjectId` dep.

**N13. `isNotAnalyzed` is a five-way `||` over nullable refs.**
```ts
(activeProject?.analysisStatus === 'NOT_ANALYZED' ||
  (error && error.message.startsWith('NOT_ANALYZED:')) ||
  (!activeData && activeProjectId !== 'default' && (!error || error.message.startsWith('NOT_ANALYZED:'))))
```
Half of these branches overlap. Extract into `deriveAnalysisStatus({ activeProject, activeData, error, activeProjectId })`.

**N14. `committedMutatedGraph` shadows `data` on any node/edge change.**
Once a simulation is committed, `activeData = committedMutatedGraph || data`. If the source `data` later updates (e.g., re-analysis), the shadow still wins. Add a fingerprint compare or clear `committedMutatedGraph` when `data.generatedAt` changes.

**N15. Feature-overlay canvas gets `cyInstance` and rerenders on selection.**
`FeatureOverlayCanvas` receives `cy={cyInstance}` and `selectedNodeId`. If it re-runs canvas painting on every selection change, that's a per-click cost. Verify; if so, split `cy` (stable) from `selectedNodeId` (change driver) into separate props or use a selector/observable.

---

### `positions.ts`

**N16. `mode` parameter is accepted and never used.**
```ts
export function resolvePosition(id, options) {
  const { session, persisted, cy, hasAuth = true } = options;   // mode is destructured-but-unused
```
Either use it (see Part 2, idea A) or remove it — an unused parameter invites the reader to believe per-mode resolution works when it doesn't.

**N17. `hasAuth = true` default is dangerous.**
```ts
const { ... hasAuth = true } = options;
```
A caller doing `resolvePosition(id, { persisted })` implicitly asserts that persisted positions are authoritative. Given that the entire review hinges on getting `hasAuth` right, a default of `true` is the wrong direction. Make it required:
```ts
export function resolvePosition(id, options: { hasAuth: boolean; ... })
```

---

### `GraphControls.tsx`

**N18. `React.memo` is defeated by `focusState`.**
`App.tsx` creates `effectiveFocusState` via `useMemo` on `[view.focusState, selection.selectedNodeId]`. If `view.focusState` is a new object every render (common for hook-returned state), `GraphControls` rerenders on every App render. Verify with the Profiler; if so, memoize `view.focusState` on its meaningful fields.

**N19. `activeControlIndex` is read but never drives `tabIndex`.**
```ts
setActiveControlIndex(nextIndex);
```
No control reads it to set `tabIndex={isActive ? 0 : -1}`. Either implement roving tabindex (the ARIA pattern requires it) or delete the state variable.

**N20. Toolbar handler runs when focus is outside the toolbar.**
`onKeyDown` is on the container, so `e.currentTarget` is the container only if the event bubbles from inside. If `document.activeElement` is `body` (toolbar not focused), `currentIndex` falls back to `activeControlIndex`. Fine, but the guard is implicit. Add an early-return if the container doesn't contain `document.activeElement`.

---

### `WorkspaceHeader.tsx`

**N21. `aria-current="page"` on lens buttons.**
Lenses are views of the same page, not different pages. `aria-current="true"` is more accurate. `page` is for actual page-level navigation.

**N22. Domain pills and lens bar both declare `role="navigation"`.**
Two navigations inside a header is legal but noisy for screen-reader landmark navigation. Consider `role="region"` for one of them, or merge the semantics.

**N23. `handleDomainClick` reads localStorage on every click.**
Cheap, but memoize if you ever move this to a hot path.

---

### `GraphErrorBoundary.tsx`

**N24. No reset on prop change.**
If a child recovers (props change so it no longer throws), the boundary stays in error state. Add `componentDidUpdate` comparing a `resetKey` prop or a `key` on the boundary.

**N25. `handleRetry` re-throws immediately if the condition persists.**
No debouncing, no fallback. Users see the error → click Retry → error. Add a short-lived "recovering" state that shows a spinner for 200ms, or log a metric to detect flapping.

---

### `EdgeHoverCard.tsx`

**N26. Interactive link inside `role="tooltip"`.**
The `vscode://file/...` link is inside a container declared as `role="tooltip"`. Per ARIA, tooltips must not contain interactive content. Either drop the role, or extract the link into a separate actionable region, or use a different role (`dialog` or no role).

---

### `explorer.ts`

**N27. `ARCH_MODE_META` lives in the types file.**
It's runtime data (icons, labels, `next` pointers), not a type. Types files are for `type`/`interface`/`enum`. Mixing them means any import of `explorer.ts` pulls in the object graph. Move to `src/lib/layout/arch-mode.ts`.

**N28. The cycle is encoded as `next` pointers, not an array.**
Adding a 5th mode requires editing two entries (the last existing mode's `next` and the new one). Derive from an array:
```ts
export const ARCH_MODE_ORDER: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];
export const nextMode = (m: ArchitectureLayoutMode) =>
  ARCH_MODE_ORDER[(ARCH_MODE_ORDER.indexOf(m) + 1) % ARCH_MODE_ORDER.length];
```

---

## Part 2 — Consolidated priorities (carried over + new)

### Tier 0 — Active bugs, 1-line-to-1-hour fixes

| ID | What | Effort | Impact |
|----|------|--------|--------|
| N1 | `lwc-apic` typo | 1 min | Low (missing color only) |
| N2 | `event-publisher` missing color | 1 min | Low |
| N3 | Risk border override | 20 min | **High** (risk level invisible) |
| N4 | Dead `lod-*` classes | 5 min | Low (cleanup) |
| — | `hasAuth` inversion (4 sites) | 30 min | **Critical** |
| — | `effectiveLayoutOptions` in dep array | 30 min | **Critical** |
| — | `markLayoutEnd` on stale requests | 15 min | Medium |
| — | `window.__CY__` gating | 2 min | Medium |
| — | `prefersReducedMotion` missing from deps | 5 min | Low |
| — | `resolvePosition` default `hasAuth=true` | 5 min | Medium (footgun) |
| N12 | Effect re-subscribe in App.tsx | 20 min | Medium |
| N9 | Hover diff-check | 10 min | Medium (rerenders) |
| N8 | `discoveryResult` fingerprint memo | 15 min | Medium (big graphs) |
| N15 | Feature overlay prop split | Verify first | Medium if real |
| N11 | `useProjectSafe` silent catch | 3 min | Low |
| — | `data-layout-running` reads ref | 10 min | Low |
| — | `useImperativeHandle` deps | 5 min | Low |

### Tier 1 — Small refactors with real payoff (half-day each)

| Item | Effort | Impact |
|------|--------|--------|
| Scope `sessionPositionsRef` per architecture mode | 1 hr | **High** (user drags survive mode switch) |
| Replace `window.__CURRENT_CORRELATION_TOKEN__` with a ref/module singleton | 30 min | Medium |
| Extract `useGraphElements` with differential reconciliation | 4 hrs | **High** (no more full teardown) |
| Memoize App's derived pipeline (`activeData → visible → focused → simulated`) | 2 hrs | **High** (keystroke cost) |
| Static mode: `cy.autolock(true)` when `layoutMode === 'static'` | 15 min | Medium (matches UI copy) |
| Keyboard: allow arrow key to select first node when none selected | 20 min | Medium (a11y) |
| Debounce search input in `useViewState` / `Sidebar` | 30 min | **High** (keystroke cost) |
| `getInteractiveElements` → `getComputedStyle` | 1 min | Low |
| Toolbar `aria-orientation` | 1 min | Low |
| Roving `tabIndex` on toolbar items | 1 hr | Medium (a11y) |

### Tier 2 — Structural refactors (days)

| Item | Effort | Impact |
|------|--------|--------|
| Extract `useCytoscape`, `useGraphLayout`, `useGraphSelectionSync`, `useGraphHover`, `useGraphKeyboard` | 2 days | **Very High** (GraphView is ~900 lines) |
| Introduce `LayoutStateProvider` (owns modes + positions) | 1 day | **Very High** (kills prior-ref drift) |
| Split `AppContent` into providers (`SimulationContext`, `DiagnosticsContext`, `HandoffContext`) | 1.5 days | High (god component) |
| Virtualized accessible node list (listbox with `aria-activedescendant`) | 6 hrs | Medium |
| WebWorker for `discoverFeatures` | 1 day | Medium (large graphs only) |
| Host `ARCH_MODE_META` in `lib/layout/` and derive cycle from array | 2 hrs | Low-Medium (frees `explorer.ts`) |

---

## Part 3 — Impact / Effort Map

```
        HIGH IMPACT
             │
             │   ┌─────────────────────┐  ┌─────────────────────┐
             │   │ hasAuth (4 sites)   │  │ useGraphElements    │
             │   │ effectiveLayoutOpts │  │ reconciliation      │
             │   │ dep array           │  │                     │
             │   │ risk border order   │  │ LayoutStateProvider │
             │   │ session pos per mode│  │                     │
             │   │ debounce search     │  │ Extract GraphView   │
             │   │ memo App pipeline   │  │ into hooks          │
             │   │                     │  │                     │
             │   │ Split AppContent    │  │                     │
             │   └─────────────────────┘  └─────────────────────┘
             │   DO FIRST (hours)         DO SECOND (days)
             │
             │   ┌─────────────────────┐  ┌─────────────────────┐
             │   │ keyboard first node │  │ Virtualized node    │
             │   │ static mode autolock│  │ list (listbox)      │
             │   │ window.__CY__ gate  │  │                     │
             │   │ effect re-subscribe │  │ WebWorker feature   │
             │   │ correlation token→  │  │ discovery           │
             │   │ ref                 │  │                     │
             │   │ markLayoutEnd guard │  │                     │
             │   │ lwc-apic typo       │  │                     │
             │   └─────────────────────┘  └─────────────────────┘
             │   NICETIES (hours)         MAYBE-NEVER (days)
             │
        LOW  IMPACT
             └─────────────────────────────────────────────────
              LOW EFFORT                       HIGH EFFORT
```

**Reading the map:**

- **Top-left (do first):** hours of work, real payoff. Everything here is a discrete fix with clear acceptance criteria. This is where a single engineer over two days removes the majority of ongoing friction.
- **Top-right (do second):** the refactors that make future work cheaper. Not bugs — architecture. Schedule as a dedicated sprint.
- **Bottom-left (niceties):** low-cost, low-risk polish. Batch these into one PR and forget them.
- **Bottom-right (maybe-never):** legitimate but expensive; do them only when a measured problem justifies them.

---

## Part 4 — What I'd actually do next, in order

If I had to pick 10 things to land in the next pass, ranked strictly by *impact per engineer-hour*:

1. **`hasAuth` inversion (all 4 sites).** Bug, high blast radius, 30 minutes.
2. **`effectiveLayoutOptions` removed from structural-sync deps.** Bug, causes full teardown per LWC click, 30 minutes.
3. **Risk border CSS ordering.** Bug, silently makes an entire visual affordance dead, 20 minutes.
4. **Debounce search.** Every keystroke currently propagates through 5 memo stages + `discoverFeatures`. 30 minutes, transformative on large graphs.
5. **`sessionPositionsRef` per mode.** User drags are silently discarded on mode switch. 1 hour.
6. **`discoveryResult` fingerprint memo.** Compounds with #4. 15 minutes.
7. **`window.__CY__` gate + correlation token → ref.** Two production-hygiene fixes in one PR. 30 minutes.
8. **Static mode: `cy.autolock(true)`.** Match the UI copy to reality or fix the copy. 15 minutes.
9. **Keyboard: select first node on arrow.** One user-impacting a11y gap. 20 minutes.
10. **`resolvePosition` — remove `mode` or use it, and make `hasAuth` required.** API hygiene that removes a footgun. 20 minutes.

Total: ~4 hours. That single afternoon retires roughly **60% of the outstanding items** and eliminates the two critical regressions the prior pass introduced/left in place.

---

## Part 5 — NOTES.md, revisited

Now that the depth is clearer, NOTES.md needs three specific corrections before it's trustworthy as a hand-off artifact:

1. **Step 7 is marked complete but is inverted.** Downgrade to "partial — see Corrections Needed".
2. **Add a "Corrections Needed" section** listing the 10 items from Part 4 above, so the next agent doesn't rediscover them.
3. **The "no steps skipped" claim is technically true against the 12-step prompt, but misleading** given that the prompt's own guardrails (`window.__CY__` gating, memo/ref discipline) weren't followed. Add a short "Deviations from guardrails" section.

Everything else in NOTES.md is accurate and useful. The out-of-scope list is correct. The conflict-resolution entries are honest.

---

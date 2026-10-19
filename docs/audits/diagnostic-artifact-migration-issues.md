# Diagnostic Artifact Migration — Issue Triage and Remediation Plan

**Repository root:** `dependency-analyzer`  
**Workspace under audit:** `dependency-analyzer/explorer`  
**Files in scope:** `FeatureOverlayCanvas.tsx`, `useViewState.ts`, `GraphView.tsx`, `UrlSyncAndOverlayRegression.test.ts`

---

## 0. Executive Summary

| # | Issue | Verdict | Severity |
|---|---|---|---|
| 1 | Two independent writers to URL (`search` in `useViewState`, `hash` in `GraphView`); neither reads the other | **Confirmed defect** | High |
| 2 | `syncToUrl` drops unrelated query params (`?debug`, UTM) | **Confirmed defect** | High |
| 3 | Structural sync does `remove()`+`add()` and no decoration effect re-runs; also triggered by `findings` reference change | **Confirmed defect** | High |
| 4 | Triple layout on mount; `cy.zoom(initialZoom)` overrides the layout's `fit` | **Confirmed defect** | Medium-High |
| 5 | Constellation mode never receives `orbitGuides` (overlay block is gated on both modes) | **Confirmed defect** | High |
| 6 | `popstate` reader ignores `hash`; hash-sync effect deletes `node` before restore effect runs | **Confirmed defect** | Medium-High |
| 7 | `bindGraphInteractions` captures stale `investigation` from init-effect closure | **Confirmed defect** | High |
| 8 | `GraphErrorBoundary` has no `resetKeys`; one throw permanently hides overlays | **Confirmed defect** | Medium-High |
| 9 | `FeatureRegion` imported from `layout/global-layout` but produced by `graph-layout`; test imports from `architecture-layout` (third module) | **Needs verification — likely defect** | Medium |
| 10 | `FeatureOverlayCanvas` position capture is unthrottled | **Confirmed defect** (perf) | Medium |
| 11 | `setFocusState`/`setImpactState`/`setConnectionState` functional updates read stale state when investigation context is present | **Confirmed defect** | Medium |
| 12 | `architecture-mode-switch` early return (`autoLayoutPolicy === false`) leaves `featureRegions`/`orbitGuides` stale | **Confirmed defect** | Medium |
| 13 | `getCorrelationToken()` consumes token; two callers in one tick race | **Confirmed defect** | Medium |
| 14 | Empty-state "Reset view" button calls `executeResetLayout` on empty graph (no-op) | **Confirmed defect** (UX) | Low |
| 15 | `edge` URL param parsed but never used and never written | **Confirmed defect** (dead code) | Low |
| 16 | Hook-safety: `try/catch` around context hooks violates Rules of Hooks if a throw ever occurs post-hook | **By design / latent** — acceptable as defensive shim, must be documented | Low |
| 17 | `localStorage` reads in `useMemo` initializers are unguarded | **Confirmed defect** | Low |
| 18 | `handleTransitionEnd` matches hardcoded CSS class names | **Confirmed defect** (fragility) | Low |
| 19 | Test "Issue A" imports `lib/architecture-layout`; production imports `lib/graph-layout`; also 3-vs-6 ring-count mismatch | **Needs verification** | Medium |
| 20 | `restoredHashNodeRef` set before confirming node exists (async-loaded nodes never restore) | **Confirmed defect** | Low |

---

## Issue 1 — Dual URL writers (search vs hash)

### Analysis
**Verdict: Confirmed defect.** The two hooks own overlapping state in disjoint URL channels.

`useViewState.syncToUrl`:
```ts
const params = new URLSearchParams();
// ...
const effectiveNode = selectedNodeId || focusState.focusNodeId || impactState.originNodeId;
if (effectiveNode) params.set("node", effectiveNode);
// ...
const newUrl = `${window.location.pathname}${searchString}${currentHash}`;
```
writes `node` into `window.location.search` and preserves the *opaque* hash.

`GraphView.tsx` (effects section, "Sync architectureMode, layoutMode, & selectedNodeId"):
```ts
if (selectedNodeId) {
  if (params.get('node') !== selectedNodeId) {
    params.set('node', selectedNodeId);
    changed = true;
  }
}
window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${params.toString()}`);
```
writes `node` into `window.location.hash`.

`useViewState.readStateFromUrl` only reads `window.location.search`:
```ts
const params = new URLSearchParams(window.location.search);
const initialNode = params.get("node") || params.get("component");
```

Concrete failure scenarios:
- Deep link `?project=pbim#node=AccountController` — `readStateFromUrl` sees no `node` in search, calls `selectNode(null)`, then `GraphView`'s restore effect (which **is** gated on `restoredHashNodeRef`) selects it later, then `syncToUrl` re-writes it to search. Three steps, order-dependent.
- User presses browser Back across a view-mode boundary. `popstate` fires. `readStateFromUrl` clears the selected node (no `node` in search) — but hash still has `node=...`. Selection is cleared but the URL says otherwise.
- Both writers can put a *different* node id: `GraphView` always uses `selectedNodeId`; `useViewState` uses `selectedNodeId || focusNodeId || impactOriginNodeId`. If focus is active, `search` says `node=focusNode`, `hash` says `node=selectedNode`. Ambiguous.

### Impact
- Every deep link is order-dependent on effect declaration order in two files.
- Browser history semantics differ from in-app `navHistory` (which only tracks node navigation).
- The regression suite (`UrlSyncAndOverlayRegression.test.ts` "Issue B") never mounts either component — it asserts pure string concatenation. It cannot catch this.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** The effect starting with comment `// Sync architectureMode, layoutMode, & selectedNodeId to localStorage and location.hash`. (Search for `window.location.pathname}${window.location.search}#`.)
>
> **Action:** Delete only the `selectedNodeId`/`node` handling from this effect. Keep `arch` and `layout` writes. Final effect body should be:
>
> ```ts
> // Sync architectureMode & layoutMode to localStorage and location.hash.
> // NOTE: selectedNodeId is owned by useViewState (query string), not this hash.
> useEffect(() => {
>   if (typeof window === 'undefined') return;
>
>   try {
>     if (localStorage.getItem('explorer:architectureMode') !== architectureMode) {
>       localStorage.setItem('explorer:architectureMode', architectureMode);
>     }
>     if (localStorage.getItem('explorer:layoutMode') !== layoutMode) {
>       localStorage.setItem('explorer:layoutMode', layoutMode);
>     }
>   } catch (e) {}
>
>   try {
>     const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
>     const params = new URLSearchParams(raw);
>     let changed = false;
>
>     if (params.get('arch') !== architectureMode) {
>       params.set('arch', architectureMode);
>       changed = true;
>     }
>     if (params.get('layout') !== layoutMode) {
>       params.set('layout', layoutMode);
>       changed = true;
>     }
>
>     if (changed) {
>       const hash = params.toString();
>       const suffix = hash ? `#${hash}` : '';
>       window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${suffix}`);
>     }
>   } catch (e) {}
> }, [architectureMode, layoutMode]);
> ```
>
> **Also remove** the `node`-deletion branch entirely (do not replace it with a hash-based one).
>
> **Also:** In the same file, the sibling effect "Initial node restoration from URL hash" must keep working. Leave it in place but mark it as a fallback for legacy hash-only links.
>
> **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
>
> **Location:** The effect with comment `// Read initial values from URL on mount and popstate`.
>
> **Action:** In `readStateFromUrl`, after parsing query params, also parse the hash for a legacy `node` value if the query string has none:
>
> ```ts
> let initialNode = params.get("node") || params.get("component");
> if (!initialNode && typeof window !== "undefined" && window.location.hash) {
>   try {
>     const hashRaw = window.location.hash.startsWith("#")
>       ? window.location.hash.slice(1)
>       : window.location.hash;
>     const hashParams = new URLSearchParams(hashRaw);
>     initialNode = hashParams.get("node");
>   } catch { /* ignore */ }
> }
> ```
>
> Do not change the rest of `readStateFromUrl`.
>
> **Confirm:** Run `git diff` and show it. If your reviewer finds either file still writes `node` into the hash, or `readStateFromUrl` still ignores hash `node`, treat that as a failed implementation.

### Consequences
- **Immediate:** `node` becomes search-only in URL, restoring the contract that `useViewState` owns "which node is selected." `GraphView`'s hash effect becomes a pure `{arch, layout}` writer.
- **Regression risk:** Legacy links with `#node=...` keep working via the fallback in `readStateFromUrl`. Legacy links that relied on `#node` overriding `?node` will now lose that (unintended but harmless — both meant the same).
- **Wins:** Back/forward across view-mode changes no longer clears the selection, because `readStateFromUrl` now sees the hash `node` when search lacks it.
- **Follow-on needed:** Add a proper integration test (see Next Steps).

### Next Steps
- Add an integration test that mounts `useViewState` + `GraphView` together and asserts `window.location` after simulated `pushState` from `popstate` listeners.
- Deprecate hash `node` in a follow-up release once no external deep links exist (audit analytics).

---

## Issue 2 — `syncToUrl` drops unrelated query params

### Analysis
**Verdict: Confirmed defect.** `syncToUrl` constructs a fresh `URLSearchParams()` and re-adds only known keys, discarding everything else.

```ts
const params = new URLSearchParams();
if (projectToPreserve) params.set("project", projectToPreserve);
// ... a few known keys ...
const searchString = params.toString() ? `?${params.toString()}` : "";
```

Anything outside the hardcoded set — `debug`, `utm_*`, `feature`, test harness flags — is deleted from the URL as soon as any state change triggers `syncToUrl`.

Concrete trigger: `GraphView.tsx` reads `debug` **from `window.location.search` on every render**:
```ts
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
```
The first `syncToUrl` after mount runs immediately (any initial `popstate`-free sync triggers the debounce path's `syncToUrl()` call). Debug panel disappears.

### Impact
- `?debug` panel (used by QA and by layout/perf investigations) is unusable — it flashes on load then disappears.
- External analytics (UTM) broken.
- Any test harness flag is lost mid-test.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
>
> **Location:** Inside `syncToUrl`, the block starting with `const currentParams = new URLSearchParams(window.location.search);` through `const params = new URLSearchParams();`.
>
> **Action:** Seed `params` from the current query string, then delete only the keys this hook owns before re-adding them:
>
> ```ts
> const currentParams = new URLSearchParams(window.location.search);
> const existingProject = currentParams.get("project");
> const activeProject = projectRef.current?.activeProjectId;
>
> const projectToPreserve =
>   existingProject ||
>   (activeProject && activeProject !== "default" ? activeProject : null);
>
> // Start from the existing query so unknown params (debug, utm_*, feature flags)
> // survive the rewrite.
> const params = new URLSearchParams(currentParams);
>
> // Delete only the keys this hook owns; they will be re-added below if active.
> const OWNED_KEYS = [
>   "project", "node", "component", "investigate",
>   "focus", "impact", "conn", "findings", "investigation",
>   "view", "search", "typeFilter", "riskFilter",
>   "hasCallouts", "withoutSharing", "hideTests", "hasAsyncPatterns",
> ] as const;
> for (const k of OWNED_KEYS) params.delete(k);
> ```
>
> (Adjust `OWNED_KEYS` to match the exact param names emitted by `filterQuery.toQuery`, `focusQuery.toQuery`, `impactQuery.toQuery`, `findingsQuery.toQuery`, `connectionQuery.toQuery`, and `investigationQuery.toQuery`. **Do not** include `debug` or unknown-prefix keys.)
>
> Leave the rest of `syncToUrl` unchanged.
>
> **Show the diff and note any key you added to `OWNED_KEYS` that was not previously emitted by a `*.toQuery`.**

### Consequences
- `?debug`, UTM, and any externally-applied query params survive state changes.
- **Risk:** If `OWNED_KEYS` is over-broad and accidentally names a param this hook does not manage, it will delete that param. **Jules must verify** every entry against the actual `*.toQuery` call sites.
- **Improvement:** Same effect as a "preserve non-owned query params" helper; could later be generalized to any state hook.

### Next Steps
- Add a unit test that sets `window.history.replaceState(null, "", "/?debug&utm_source=x")`, triggers a `syncToUrl` via `setFilterState`, and asserts both remain.
- Extract `OWNED_KEYS` to a shared constant near the `*.toQuery` functions.

---

## Issue 3 — Structural sync wipes all runtime decorations; `findings` change triggers full rebuild

### Analysis
**Verdict: Confirmed defect.** Two problems compound.

**Problem A — decorations lost.** In `GraphView.tsx`:
```ts
cy.batch(() => {
  cy.elements().remove();
  cy.add(newElements);
});
```
The decoration effects below are declared only with their own state as deps:
- selection: `[selectedNodeId, selectedEdgeId]`
- impact: `[impactResult]`
- cycle: `[selectedCycleNodeIds]`
- finding: `[selectedFinding]`
- focusedNode: `[focusedNodeId, selectedNodeId]`
- simulation: `[simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]`

None of these re-run after `remove()+add()`. Result: after any structural rebuild, the graph is unselected and undecorated. In particular:
- Impact analysis highlight (a user-triggered action) vanishes after the next structural sync.
- Cycle highlight vanishes.
- Simulation styling vanishes.
- Finding highlight vanishes.

**Problem B — over-broad dependency array.** The structural sync effect deps:
```ts
}, [nodes, edges, findings, featureAssignmentMap, captureAndPersistPositions]);
```
`findings` is regenerated on every intelligence refresh. If its **content** is unchanged but its **array identity** changes, `cy.elements().remove()` still executes → full graph rebuild → all decorations lost.

Also `nodes`/`edges` may be re-created without content change (parent memoization failure), same outcome. The file already demonstrates the correct pattern to guard against this — `graphStructureKey`:
```ts
const graphStructureKey = useMemo(() => { /* ... */ }, [nodes, edges]);
```

### Impact
- Every intelligence refresh, filter apply, or simulation run drops impact/cycle/finding decorations and selection.
- Performance: full element teardown/re-add on the largest graphs. The test suite has no coverage of this.
- `FeatureOverlayCanvas` also loses `modelPositions` on `remove` because `remove` fires `position` events (see Issue 10).

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** The effect starting with `// Structural Element Synchronization Effect` and ending with `}, [nodes, edges, findings, featureAssignmentMap, captureAndPersistPositions]);`.
>
> **Action 1 — gate rebuilds on structural identity.** Compute a memo near the top of the file:
>
> ```ts
> const structuralFingerprint = useMemo(() => {
>   const nodeFP = nodes.map(n => `${n.id}:${n.type ?? ''}:${n.layer ?? ''}`).join('|');
>   const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType ?? ''}`).join('|');
>   return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}`;
> }, [nodes, edges]);
> ```
>
> Change the structural sync effect's dependency array from
> `[nodes, edges, findings, featureAssignmentMap, captureAndPersistPositions]`
> to
> `[structuralFingerprint, captureAndPersistPositions]`.
>
> **Action 2 — decorate after rebuild.** Extract a helper alongside `captureAndPersistPositions`:
>
> ```ts
> const applyDecorations = useCallback((cy: cytoscape.Core) => {
>   if (!cy) return;
>   cy.batch(() => {
>     // selection
>     clearHighlights(cy);
>     if (selectedNodeIdRef.current) {
>       deselectAll(cy);
>       selectNode(cy, selectedNodeIdRef.current);
>       highlightNodeConnections(cy, selectedNodeIdRef.current);
>     } else if (selectedEdgeId) {
>       deselectAll(cy);
>       const edge = cy.getElementById(selectedEdgeId);
>       if (edge.length > 0 && edge.isEdge()) edge.select();
>     }
>
>     // impact
>     cy.elements().removeClass('impact-origin impact-affected impact-muted');
>     if (impactResult) {
>       // ... exact loop from the "Handle Impact Mode highlighting" effect ...
>     }
>
>     // finding highlight
>     cy.elements().removeClass('finding-highlighted');
>     if (selectedFinding) { /* ... exact loop from "Handle selectedFinding" effect ... */ }
>
>     // cycle
>     if (selectedCycleNodeIds && selectedCycleNodeIds.length > 0) {
>       highlightCycle(cy, selectedCycleNodeIds);
>     } else {
>       clearCycleHighlight(cy);
>     }
>
>     // simulation
>     cy.elements().removeClass('simulated-added simulated-removed simulated-affected');
>     // ... exact loops from "Dedicated Effect for Simulation Visual Classes" ...
>
>     // focusedNode
>     if (focusedNodeId) {
>       focusOnNode(cy, focusedNodeId);
>     } else if (selectedNodeIdRef.current) {
>       highlightNodeConnections(cy, selectedNodeIdRef.current);
>     }
>   });
> }, [selectedEdgeId, impactResult, selectedFinding, selectedCycleNodeIds,
>     simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds, focusedNodeId]);
> ```
>
> Refactor each existing decoration effect to `applyDecorations(cyRef.current!)` (dedupe the bodies into the helper). Then call `applyDecorations(cy)` at the end of the structural sync effect, immediately after `captureAndPersistPositions()`:
>
> ```ts
> if (newlyPlaced) {
>   captureAndPersistPositions();
> }
> applyDecorations(cy);
> ```
>
> **Action 3 — `findings` removed from deps.** Since `findings` now affects only *content of existing elements*, verify nothing else needs `findings` in this effect. In this file `findings` is passed to `buildGraphElements(...)` and to `NodeHoverCard`; `buildGraphElements` embeds finding info **on node data** — that requires a rebuild when findings change. Therefore **also** update the structural fingerprint to include a stable summary of findings per node:
>
> ```ts
> const findingFP = useMemo(() => {
>   if (!findings || findings.length === 0) return '';
>   return findings
>     .map(f => `${f.id}:${f.severity}:${(f.nodeIds ?? []).join(',')}`)
>     .sort()
>     .join('|');
> }, [findings]);
> ```
> and include `#${findingFP}` in `structuralFingerprint`. This preserves rebuild-on-real-change but avoids it on identity-only change.
>
> Show the diff. If any decoration effect is left with a body instead of calling `applyDecorations`, treat it as a failed implementation.

### Consequences
- **Immediate:** All decoration state survives structural rebuilds.
- **Improvement:** Performance — the rebuild no longer fires when only `findings` array identity changes.
- **Risk:** `applyDecorations` must be added to each decoration effect's closure correctly; if `selectedEdgeId` or similar is missing from its dep array, its body will apply stale state. **Jules must run the existing `GraphView` tests** and manually exercise impact → filter → sim → cycle.
- **Side effect:** `cy.batch` in `applyDecorations` may cause a single re-render of `FeatureOverlayCanvas` from position events; combined with Issue 10 fix (rAF coalesce), this is benign.

### Next Steps
- Add a Playwright/integration test that: selects a node → applies impact → changes filter → asserts impact classes still present on `cy`.

---

## Issue 4 — Triple layout on mount; `cy.zoom` overrides `fit`

### Analysis
**Verdict: Confirmed defect.** In `GraphView.tsx`:
```ts
const cy = cytoscape({ ..., layout: layoutOptions, ... });      // (1)
...
if (autoLayoutPolicy === true) {
  markLayoutStart('initial');
  cy.layout(layoutOptions).run();                                 // (2)
  const layoutRes = runLayoutWithMetadata(cy, { ... });           // (3)
  ...
}
...
cy.zoom(initialZoom);
cy.center();
```

- (1) — Cytoscape runs the configured layout on construction.
- (2) — an extra `.run()`, redundant with (1).
- (3) — `runLayoutWithMetadata` runs the layout **again**, with `fit: true`.
- (4) — `cy.zoom(initialZoom)` overrides the fit computed by (3), and `cy.center()` recenters, discarding the fit-to-content bounding box.

For a 12-node graph, `initialZoom = 1.4` — often clips. For a 300-node graph, `initialZoom = 0.4` — wastes space and may still clip corners.

`guardLayoutRun` fires its `< 150ms` duplicate warning on every mount, spamming the console for anyone running dev.

### Impact
- Wasted CPU on every mount (three layout passes for one visual outcome).
- Fit-to-view from `runLayoutWithMetadata` is discarded, so the initial view is sub-optimal for every dataset.
- `__LAST_LAYOUT_COMPLETED__` is overwritten twice per mount — misleading for tests that observe it.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Cytoscape initialization effect — the `cytoscape({...})` constructor call and the immediately following `if (autoLayoutPolicy === true) { ... }` block, ending just before `cy.on('dragfree', 'node', ...)`.
>
> **Action 1 — constructor should not run a layout.** Change:
>
> ```ts
> const cy = cytoscape({
>   container: containerRef.current,
>   elements,
>   style: styles,
>   layout: layoutOptions,
>   ...
> });
> ```
> to:
>
> ```ts
> const cy = cytoscape({
>   container: containerRef.current,
>   elements,
>   style: styles,
>   // Layout is applied explicitly below so we can capture metadata + fit together.
>   layout: { name: 'preset' },
>   ...
> });
> ```
>
> **Action 2 — single explicit layout, respect fit.** Replace the block:
>
> ```ts
> if (autoLayoutPolicy === true) {
>   markLayoutStart('initial');
>   cy.layout(layoutOptions).run();
>   const layoutRes = runLayoutWithMetadata(cy, { ... });
>   if (requestId === layoutRequestRef.current) {
>     markLayoutEnd('initial', architectureMode);
>     setFeatureRegions(layoutRes.featureRegions);
>     setOrbitGuides(layoutRes.orbitGuides);
>     captureAndPersistPositions();
>   }
> }
> ```
> with:
>
> ```ts
> if (autoLayoutPolicy === true) {
>   markLayoutStart('initial');
>   const layoutRes = runLayoutWithMetadata(cy, {
>     ...effectiveLayoutOptionsRef.current,
>     nodes: nodesRef.current,
>     edges: edgesRef.current,
>     nodeCount: nodesRef.current.length,
>     animate: false,
>     architectureMode,
>     fit: true,
>   });
>   if (requestId === layoutRequestRef.current) {
>     markLayoutEnd('initial', architectureMode);
>     setFeatureRegions(layoutRes.featureRegions);
>     setOrbitGuides(layoutRes.orbitGuides);
>     captureAndPersistPositions();
>   }
> }
> ```
> (i.e. delete the `cy.layout(layoutOptions).run()` call entirely.)
>
> **Action 3 — `cy.zoom(initialZoom)` fallback.** Replace:
>
> ```ts
> cy.zoom(initialZoom);
> cy.center();
> ```
> with:
>
> ```ts
> // Only apply a manual zoom fallback when the layout did not fit.
> if (autoLayoutPolicy !== true) {
>   cy.zoom(initialZoom);
>   cy.center();
> }
> ```
>
> **Action 4 — verify `layoutOptions` local is unused.** If the local `layoutOptions` const is not referenced after these changes, remove it. If it is, keep it but do not pass it as the `layout:` field.
>
> Confirm with `git diff` that no `layout:` field references a non-`preset` config in the constructor, and that `cy.zoom(initialZoom)` is inside the `!== true` branch.

### Consequences
- **Immediate:** One layout pass per mount; initial fit is preserved; `__LAST_LAYOUT_COMPLETED__` is set once.
- **Improvement:** Faster mount (~3× faster on large graphs), no `duplicate run` warnings in dev.
- **Risk:** If any downstream test relied on `layout: layoutOptions` semantics (e.g. inspecting the constructor config), it must be updated. Search for tests reading `cy.options().layout`.
- **Benign risk:** `cy.zoom` no longer forced — layouts whose `fit` yields an awkward zoom for extremely small/large graphs may need `padding` tuning in `runLayoutWithMetadata`.

### Next Steps
- Audit `cy.options().layout` in tests.
- Consider deprecating `initialZoom` fallback entirely once no unconfigured-data path exists.

---

## Issue 5 — Constellation mode never receives `orbitGuides`

### Analysis
**Verdict: Confirmed defect.** `FeatureOverlayCanvas` renders the orbit overlay for both modes:

```tsx
{(architectureMode === 'orbit' || architectureMode === 'constellation') && (
  <g className="orbit-guides-overlay">
    {/* ... uses orbitGuides?.rings?.map, orbitGuides?.sectors?.map ... */}
```

But `GraphView` gates the prop on `orbit` **only**:
```tsx
orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}
```

In Constellation mode:
- Only the hard-coded core circle (`r=200`, `r=12`) renders.
- `orbitGuides?.rings` is `undefined` — no rings.
- `orbitGuides?.sectors` is `undefined` — no sectors.

The `computeArchitectureLayoutWithMetadata` function **does** return `orbitGuides.rings` for constellation mode (the test asserts `rings.length === 3` and `sectors === undefined`). The overlay simply never gets them.

The regression test only asserts the overlay doesn't throw, not that it renders anything.

### Impact
- Constellation mode has no visible concentric guides — critical UX loss for a mode whose primary visual feature is the orbit/ring layout.
- Test coverage gap: `UrlSyncAndOverlayRegression.test.ts` "Issue A" passes on the broken code.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** In the JSX returned from `GraphView`, the `<FeatureOverlayCanvas ... />` element. Specifically this prop:
>
> ```tsx
> orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}
> ```
>
> **Action:** Replace with:
>
> ```tsx
> orbitGuides={
>   architectureMode === 'orbit' || architectureMode === 'constellation'
>     ? orbitGuides
>     : undefined
> }
> ```
>
> **File:** `dependency-analyzer/explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
>
> **Location:** Inside the `<g className="orbit-guides-overlay">` block, the `.map` over `orbitGuides?.sectors` (search `orbitGuides?.sectors && orbitGuides.sectors.map`).
>
> **Action:** The existing null-safe form is already correct — do **not** change it. Only verify it reads `orbitGuides?.sectors` with optional chaining. (Constellation mode intentionally returns `sectors: undefined`.)
>
> **File:** `dependency-analyzer/explorer/src/test/UrlSyncAndOverlayRegression.test.ts`
>
> **Location:** Inside the first `it(...)` block of `describe('Issue A — Graph Overlay in Constellation Mode')`, add a stronger assertion at the end:
>
> ```ts
> // Regression guard: overlay must render rings when given constellation's orbitGuides.
> // The component gate is `(architectureMode === 'orbit' || architectureMode === 'constellation')`,
> // and the producer supplies rings but not sectors.
> const ringsForOverlay = layoutRes.orbitGuides?.rings;
> expect(ringsForOverlay?.length).toBeGreaterThan(0);
> expect(layoutRes.orbitGuides?.sectors).toBeUndefined();
> ```
>
> (This does not replace a proper render test, but locks in the producer contract.)
>
> Show the diff for all three files.

### Consequences
- **Immediate:** Constellation mode renders rings (the 6→3 discrepancy will be surfaced — see Issue 19).
- **Risk:** The rings/sectors rendering block assumes `ring.radiusPx`, `ring.label`, `sector.startAngleRad`, `sector.endAngleRad`, `sector.label`, `sector.nodeCount`, `sector.sectorId` — Jules must **verify** the returned `orbitGuides` for constellation mode actually contains these fields (open `lib/orbit-layout.ts`). If some are undefined, the overlay will render `NaN` paths.
- **Improvement:** Constellation mode parity with orbit mode.

### Next Steps
- Add a render-level test (RTL) that mounts `FeatureOverlayCanvas` with constellation `orbitGuides` and asserts `[data-testid="orbit-guides-overlay"]` contains N `<circle>` elements.
- Reconcile ring count discrepancy (Issue 19).

---

## Issue 6 — Hash-sync wipes `node`; `popstate` ignores hash

### Analysis
**Verdict: Confirmed defect.** Effect declaration order in `GraphView.tsx`:
1. First: `// On mount, notify parent if hash or localStorage specified a different initial mode`
2. Second: `// Sync architectureMode, layoutMode, & selectedNodeId to localStorage and location.hash`
3. Third: `// Initial node restoration from URL hash`

On mount `selectedNodeId` is usually `null`. Effect #2 runs and does:
```ts
if (params.has('node')) { params.delete('node'); changed = true; }
```
It removes `node` from the URL **before** effect #3 reads the capture. Effect #3 works only because `hashModes` was captured via `useMemo([])` at mount:

```ts
const hashModes = useMemo(() => getHashModes(), []);
```

`getHashModes` runs **during render before effects commit**, so it sees `node` in URL. Effect #3 then uses `hashModes.node` — safe today, but by accident.

Combined with **Issue 1**'s `popstate` reading only `search`, this means:
- Pressing Back to a URL where only the hash had `node` (before Issue 1 fix): the URL is restored (search side), but `arch`/`layout` revert is not honored. Browser Back can leave `architectureMode='hybrid'` in the UI while URL says `arch=orbit`.

`GraphView` has no `hashchange` listener, and its `replaceState` calls don't fire `popstate`.

### Impact
- Fragile: any future change to `hashModes`'s `useMemo([])` (e.g. widening deps) breaks restore.
- Back/forward across mode switches silently desyncs URL from UI state.
- Any code that pushes a hash URL (outside this file) is ignored.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Move the `// Initial node restoration from URL hash` effect to appear **before** the `// Sync architectureMode, layoutMode, & selectedNodeId to localStorage and location.hash` effect (which after Issue 1 fix is only about arch/layout). In practice:
>
> 1. Cut the entire block:
>    ```ts
>    const restoredHashNodeRef = useRef(false);
>    useEffect(() => {
>      if (!cyInstance || nodes.length === 0 || restoredHashNodeRef.current) return;
>      ...
>    }, [cyInstance, nodes, hashModes.node, selectedNodeId, onSelectNode, prefersReducedMotion]);
>    ```
> 2. Paste it **before** the localStorage/hash sync effect.
> 3. Add a guard to the hash-sync effect (which currently runs after Issue 1's fix as `arch`/`layout`-only):
>
>    ```ts
>    useEffect(() => {
>      if (typeof window === 'undefined') return;
>      // Wait for hashNode restore before writing URL, otherwise we clobber it.
>      if (!restoredHashNodeRef.current && hashModes.node && !selectedNodeId) {
>        return;
>      }
>      // ...existing localStorage + hash writes...
>    }, [architectureMode, layoutMode, selectedNodeId]);
>    ```
>
> **Location:** Same file. Add `popstate` + `hashchange` listeners to keep `arch`/`layout` in sync. Append a new effect:
>
> ```ts
> useEffect(() => {
>   if (typeof window === 'undefined') return;
>
>   const readHashModes = () => {
>     try {
>       const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
>       const params = new URLSearchParams(raw);
>       const arch = params.get('arch') as ArchitectureLayoutMode | null;
>       const layout = params.get('layout') as LayoutMode | null;
>       const validArch: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];
>       const validLayout: LayoutMode[] = ['static', 'interactive'];
>       if (arch && validArch.includes(arch) && arch !== architectureMode && onArchitectureModeChange) {
>         onArchitectureModeChange(arch);
>       }
>       if (layout && validLayout.includes(layout) && layout !== layoutMode && onLayoutModeChange) {
>         onLayoutModeChange(layout);
>       }
>     } catch { /* ignore */ }
>   };
>
>   window.addEventListener('popstate', readHashModes);
>   window.addEventListener('hashchange', readHashModes);
>   return () => {
>     window.removeEventListener('popstate', readHashModes);
>     window.removeEventListener('hashchange', readHashModes);
>   };
> }, [architectureMode, layoutMode, onArchitectureModeChange, onLayoutModeChange]);
> ```
>
> Show the diff. Confirm that calling `history.back()` across an `arch=` change now updates the displayed architecture mode.

### Consequences
- **Immediate:** `restoredHashNodeRef` guards against URL clobbering; Back/Forward honors `arch`/`layout`.
- **Risk:** `hashchange` also fires when our own `replaceState` **fails** to suppress it (it doesn't) — but `replaceState` **does not** fire `hashchange`. Only external manipulations and user back/forward trigger it. Safe.
- **Risk:** `onArchitectureModeChange` firing during `popstate` may cascade a layout. `shouldAutoLayout` in static mode prevents the rebuild; interactive mode will rebuild — desired behavior.
- **Dependency:** Requires Issue 1 to be merged first, otherwise this effect fights with the `node`-in-hash writer.

### Next Steps
- Add an integration test: mount `GraphView`, dispatch `window.history.pushState(null,'', '#arch=orbit&layout=static')` + `window.dispatchEvent(new PopStateEvent('popstate'))`, assert `architectureMode === 'orbit'`.

---

## Issue 7 — Stale `investigation` closure in `bindGraphInteractions`

### Analysis
**Verdict: Confirmed defect.** Inside the init effect (`[]` deps):
```ts
bindGraphInteractions(cy, {
  onNodeSelect: (selectedNode) => {
    ...
    if (investigation) {                 // captured from FIRST render
      investigation.selectNode(...);
    }
    onSelectNodeRef.current(fullNode);   // correctly uses ref
  },
  ...
}, nodesRef.current);
```

Everything else that needs current state goes through a ref (`onSelectNodeRef`, `onSelectEdgeRef`, `onNodeDoubleTapRef`, `onFocusChangeRef`). `investigation` does not.

Concrete failure:
- `InvestigationProvider` mounts **after** `GraphView` (e.g., nested under a Suspense boundary or conditional route render). At init time `useInvestigationOptional()` returns `null`. All clicks skip `investigation.selectNode`.
- Or `InvestigationProvider` value is `useMemo`'d and recomputes — subsequent clicks still call the **old** value's methods, which mutate a discarded context instance.

### Impact
- Selecting a node from the graph canvas doesn't update investigation context in a subset of render orders.
- Bug is silent: no error, no warning. Users see selection "not stick" when navigating between graph and other panels.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Near the top of the component, alongside the existing refs for `onSelectNodeRef`, `onSelectEdgeRef`, `onNodeDoubleTapRef`, `onFocusChangeRef`.
>
> **Action 1 — add a ref for investigation:**
>
> ```ts
> const investigationRef = useRef(investigation);
> useEffect(() => {
>   investigationRef.current = investigation;
> }, [investigation]);
> ```
>
> **Location:** In the Cytoscape init effect, inside `bindGraphInteractions(cy, { ... }, nodesRef.current)`.
>
> **Action 2 — replace all reads of `investigation` with `investigationRef.current`:**
>
> ```ts
> onNodeSelect: (selectedNode) => {
>   const fullNode = selectedNode ? (nodesRef.current.find(n => n.id === selectedNode.id) || selectedNode) : null;
>   const inv = investigationRef.current;
>   if (inv) inv.selectNode(fullNode ? fullNode.id : null);
>   onSelectNodeRef.current(fullNode);
> },
> onNodeDoubleTap: (nodeId, selectedNode) => {
>   const fullNode = selectedNode ? (nodesRef.current.find(n => n.id === selectedNode.id) || selectedNode) : null;
>   onNodeDoubleTapRef.current?.(nodeId, fullNode);
> },
> onEdgeSelect: (edgeId) => {
>   if (edgeId) {
>     const inv = investigationRef.current;
>     if (inv) inv.selectEdge(edgeId);
>     onSelectEdgeRef.current(edgeId);
>   }
> },
> onBackgroundTap: () => {
>   const inv = investigationRef.current;
>   if (inv) inv.clearSelection();
>   onSelectNodeRef.current(null);
> },
> ```
>
> **Action 3 — search for any other `investigation.` reads** in this file (outside of hook declarations and outside `investigationRef` writes) and replace with `investigationRef.current.` with a null guard.
>
> Show the full diff. Confirm no bare `investigation.` calls remain in `bindGraphInteractions`.

### Consequences
- **Immediate:** Late-mounting `InvestigationProvider` becomes functional; context updates are always current.
- **Risk:** Negligible — mirrors the existing ref pattern in the same file.
- **Improvement:** Aligns with the existing architecture — every other callback already uses refs.

### Next Steps
- Audit other `useX` reads in `useEffect([])` closures across the codebase (potential same bug class in other components).
- Add a test with deferred context provisioning.

---

## Issue 8 — `GraphErrorBoundary` permanently stuck after a throw

### Analysis
**Verdict: Confirmed defect.** In `GraphView.tsx`:
```tsx
<GraphErrorBoundary>
  <FeatureOverlayCanvas ... />
  {isNavigatorVisible && <div id="minimap">...}
  {hoverCard && <NodeHoverCard ... />}
</GraphErrorBoundary>
```

`GraphErrorBoundary` is used with no `resetKeys` prop (or the local equivalent). Once it catches an error, it renders its fallback until unmount (default React error-boundary semantics). The whole subtree — the overlay, minimap, hover cards — is gone until page reload.

This masks any transient overlay crash (e.g. Issue 5's `NaN` paths after a shape mismatch, Issue 9's `.replace` on `undefined`), making issues effectively invisible.

### Impact
- One transient overlay bug permanently disables the minimap and hover cards for a session.
- Combined with Issue 9, an undetected `FeatureRegion` shape mismatch will silently hide all overlays forever.
- The boundary's own log (whatever it is) is the only signal; there is no way for the user to recover.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** JSX `<GraphErrorBoundary>` opening tag (search `<GraphErrorBoundary>`).
>
> **Action 1 — pass `resetKeys` so the boundary retries when graph shape or mode changes:**
>
> ```tsx
> <GraphErrorBoundary
>   resetKeys={[architectureMode, nodes.length, edges.length]}
>   onError={(err) => {
>     console.error('[GraphErrorBoundary] overlay failed', err);
>     if (typeof window !== 'undefined') {
>       (window as any).__LAST_OVERLAY_ERROR__ = {
>         message: err?.message,
>         stack: err?.stack,
>         at: Date.now(),
>       };
>     }
>   }}
> >
> ```
>
> **File:** `dependency-analyzer/explorer/src/components/graph-internals/GraphErrorBoundary.tsx`
>
> **Location:** Component signature and `componentDidCatch` / `getDerivedStateFromError` implementation.
>
> **Action 2 — if `GraphErrorBoundary` does not currently support `resetKeys` / `onError`, add them:**
>
> ```tsx
> interface GraphErrorBoundaryProps {
>   children: React.ReactNode;
>   resetKeys?: ReadonlyArray<unknown>;
>   onError?: (err: unknown) => void;
> }
>
> interface GraphErrorBoundaryState {
>   hasError: boolean;
> }
>
> export class GraphErrorBoundary extends React.Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
>   state: GraphErrorBoundaryState = { hasError: false };
>
>   static getDerivedStateFromError(): GraphErrorBoundaryState {
>     return { hasError: true };
>   }
>
>   componentDidCatch(error: unknown) {
>     this.props.onError?.(error);
>   }
>
>   componentDidUpdate(prevProps: GraphErrorBoundaryProps) {
>     if (!this.state.hasError) return;
>     const prev = prevProps.resetKeys ?? [];
>     const next = this.props.resetKeys ?? [];
>     if (prev.length !== next.length || prev.some((v, i) => v !== next[i])) {
>       this.setState({ hasError: false });
>     }
>   }
>
>   render() {
>     if (this.state.hasError) {
>       return (
>         <div
>           role="alert"
>           data-testid="graph-overlay-error"
>           style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px',
>             background: 'rgba(127,29,29,0.85)', color: '#fecaca', borderRadius: 6,
>             fontSize: 11, pointerEvents: 'auto', zIndex: 5 }}
>         >
>           Overlay unavailable — see console.
>         </div>
>       );
>     }
>     return this.props.children;
>   }
> }
> ```
>
> Show the diff for both files. Confirm that on next render after a mode switch, the boundary renders children again.

### Consequences
- **Immediate:** Overlay failures are visible (small badge + console) and recoverable on mode/data change.
- **Risk:** If the failure is *persistent* per data (e.g. malformed `featureRegions`), the boundary will re-catch on every mode switch, spamming the console. That's acceptable — the console is the signal.
- **Improvement:** Users get hover cards and minimap back.

### Next Steps
- Once Issue 9 is resolved, add a render test using a **known-bad** `featureRegions` map to verify the boundary displays `[data-testid="graph-overlay-error"]`.

---

## Issue 9 — Type producers vs consumers mismatch

### Analysis
**Verdict: Needs verification — likely defect.** Three sources claim to define `FeatureRegion`:

1. **Producer (production):** `GraphView.tsx` imports `FeatureRegion` from `'../lib/graph-layout'` and gets it from `runLayoutWithMetadata`.
2. **Consumer (overlay):** `FeatureOverlayCanvas.tsx` imports from `'../../lib/layout/global-layout'`.
3. **Test:** imports `computeArchitectureLayoutWithMetadata` from `'../lib/architecture-layout'`.

If `lib/graph-layout` re-exports `lib/architecture-layout` **and** `lib/layout/global-layout` re-exports the same type, all three resolve identically — fine. If not, the overlay's `region.featureId` may be `undefined` and `featureId.replace(...)` throws → caught by boundary → overlays vanish.

**Ring count discrepancy:** The overlay comment says `6 Concentric Architectural Rings`, but the test asserts `rings.length === 3`. At least one is wrong. If the test's producer (`lib/architecture-layout`) differs from production's (`lib/graph-layout`), the test may validate a fake.

### Impact
- If types differ: overlay silently broken in production (masked by Issue 8).
- If types match: harmless, but the "import from a different module" pattern is a latent trap.
- Ring count mismatch: user-visible inconsistency; also the test may be validating the wrong implementation.

### Prompt for Fix (file + line)
> **Jules — first, investigate; do not fix blindly.**
>
> **Investigation steps (report findings before applying any change):**
>
> 1. Open `dependency-analyzer/explorer/src/lib/graph-layout.ts`. Locate `FeatureRegion`, `OrbitGuideMetadata`, `runLayoutWithMetadata`, `computeArchitectureLayoutWithMetadata`. Paste their exports and re-exports.
> 2. Open `dependency-analyzer/explorer/src/lib/layout/global-layout.ts`. Locate `FeatureRegion`. Paste its definition.
> 3. Open `dependency-analyzer/explorer/src/lib/architecture-layout.ts`. Locate `computeArchitectureLayoutWithMetadata` and `OrbitGuideMetadata`. Paste definitions.
> 4. For each of `FeatureRegion`, `OrbitGuideMetadata`, `SharedHighlightResult`, `FeatureDiscoveryResult`, report whether all import sites resolve to the **same** type identity (i.e. `import type` chain ends in a single definition). Use `tsc --noEmit` output or `tsc --traceResolution` if available.
> 5. For the ring count: run the layout in a small `node` script or via the test file; log `layoutRes.orbitGuides.rings.length` for both `lib/graph-layout` and `lib/architecture-layout`. Report both values.
>
> **If any type mismatch is confirmed**, perform the fix:
>
> **File:** `dependency-analyzer/explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
>
> **Location:** Import block at top. Replace:
> ```ts
> import type { FeatureRegion } from '../../lib/layout/global-layout';
> import type { OrbitGuideMetadata } from '../../lib/orbit-layout';
> ```
> with:
> ```ts
> import type { FeatureRegion } from '../../lib/graph-layout';
> import type { OrbitGuideMetadata } from '../../lib/graph-layout';
> ```
>
> **File:** `dependency-analyzer/explorer/src/test/UrlSyncAndOverlayRegression.test.ts`
>
> **Location:** Import block.
> Replace:
> ```ts
> import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
> ```
> with:
> ```ts
> import { computeArchitectureLayoutWithMetadata } from '../lib/graph-layout';
> ```
>
> (Or, if `lib/graph-layout` does not re-export it, add `export * from './architecture-layout'` to `lib/graph-layout.ts` — Jules must decide based on step 1 findings and report which.)
>
> **For the ring count:** if the real value is 3, update the overlay comment to `3 Concentric Architectural Rings` (file `FeatureOverlayCanvas.tsx`, line before `<circle>` in the `orbitGuides?.rings?.map`). If the real value is 6, update the test:
> ```ts
> expect(layoutRes.orbitGuides?.rings?.length).toBe(6);
> ```
> Report which path you took and why.
>
> **If no mismatch and no ring-count disagreement is found, no fix is required for Issue 9** — explain the resolution chain in your report.

### Consequences
- **If fix applied:** Overlay imports become canonical; future type changes propagate.
- **If no fix:** Documented single-source-of-truth — no behavioral change.
- **Improvement:** Prevents the class of bug where one layer's `id` field and another's `featureId` field are silently swapped.
- **Risk:** Changing type imports can surface previously hidden compile errors; Jules must report `tsc --noEmit` before/after.

### Next Steps
- Add a `tsconfig` path alias `@explorer/lib/*` to funnel all imports through one canonical module in a follow-up.
- Add a render test that passes `runLayoutWithMetadata`'s real `featureRegions` into `FeatureOverlayCanvas` and asserts N region rects.

---

## Issue 10 — Unthrottled position capture in `FeatureOverlayCanvas`

### Analysis
**Verdict: Confirmed defect (performance).** In `FeatureOverlayCanvas.tsx`:
```ts
const capturePositions = () => {
  const posMap: Record<string, { x: number; y: number }> = {};
  cy.nodes().forEach((n) => {
    posMap[n.id()] = n.position();
  });
  setModelPositions(posMap);
};
cy.on('position dragfree layoutstop', capturePositions);
```
`position` fires on **every** node movement during a drag — this rebuilds an O(n) map and calls `setState` per event, causing React re-renders at native event rate. The file already demonstrates the correct pattern for pan/zoom:
```ts
rafIdRef.current = requestAnimationFrame(() => { ... setTransform(...); });
```

### Impact
- Drag on a 200+ node graph becomes visibly janky.
- Every structural rebuild (Issue 3) triggers `position` events on all elements, calling `setModelPositions` at least once per batch — the overlay effectively rebuilds its position map in lockstep with the structural sync.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
>
> **Location:** The effect starting with `// Track Cytoscape model node positions` through its cleanup (`cy.off('position dragfree layoutstop', capturePositions)`).
>
> **Action:** Coalesce via `requestAnimationFrame`:
>
> ```ts
> useEffect(() => {
>   if (!cy) return;
>
>   let rafId: number | null = null;
>
>   const flushPositions = () => {
>     rafId = null;
>     if (!cy) return;
>     const posMap: Record<string, { x: number; y: number }> = {};
>     cy.nodes().forEach((n) => {
>       posMap[n.id()] = n.position();
>     });
>     setModelPositions(posMap);
>   };
>
>   const scheduleCapture = () => {
>     if (rafId !== null) return;
>     rafId = requestAnimationFrame(flushPositions);
>   };
>
>   // Initial synchronous snapshot so the first paint has positions.
>   flushPositions();
>
>   if (typeof cy.on === 'function') {
>     cy.on('position dragfree layoutstop', scheduleCapture);
>   }
>
>   return () => {
>     if (rafId !== null) {
>       cancelAnimationFrame(rafId);
>       rafId = null;
>     }
>     if (typeof cy.off === 'function') {
>       cy.off('position dragfree layoutstop', scheduleCapture);
>     }
>   };
> }, [cy]);
> ```
>
> Show the diff.

### Consequences
- **Immediate:** At most one `setModelPositions` per animation frame; drag becomes smooth.
- **Improvement:** Combined with Issue 3's decoration preservation, overlay positions stay consistent during rebuilds.
- **Risk:** `layoutstop` may race with the rAF; positions applied at `layoutstop` but before next frame will be flushed on frame — fine.
- **No functional regression**: `modelPositions` is eventually consistent within one frame.

### Next Steps
- Add a perf test: 300-node graph, simulate 60 drag events, assert `setModelPositions` calls ≤ 1 per frame.

---

## Issue 11 — Stale state in `setFocusState` / `setImpactState` / `setConnectionState`

### Analysis
**Verdict: Confirmed defect.** In `useViewState.ts`:
```ts
const setFocusState = useCallback(
  (focus: Partial<FocusState> | ((prev: FocusState) => FocusState)) => {
    if (investigationRef.current) {
      if (typeof focus === "function") {
        const next = focus(investigationRef.current.state.focusState);  // may be stale
        investigationRef.current.setFocus(next);
      }
```
`investigationRef.current.state` is the last rendered snapshot. If a handler calls `setFocusState(fn1)` then `setFocusState(fn2)` in the same tick, `fn2` receives the pre-`fn1` state. The local fallback path is correct:
```ts
setLocalFocusState((prev) => typeof focus === "function" ? focus(prev) : { ...prev, ...focus });
```
So behavior diverges between the two branches — the exact bug class that `useState` functional updates exist to prevent.

### Impact
- Batch updates (e.g. resetting focus from two places) can silently drop one of them.
- Behavior difference between "with investigation context" and "without" paths makes testing inconsistent — a test using local fallback passes while the app (which mounts the context) silently misbehaves.

### Prompt for Fix (file + line)
> **Jules, first investigate whether `InvestigationContext` exposes functional setters or an "updater" API:**
>
> 1. Open `dependency-analyzer/explorer/src/context/InvestigationContext.tsx`. Paste the `setFocus`, `setImpact`, `setConnection`, `clearFocus`, `clearImpact` signatures.
> 2. Report whether any of them accept `(prev) => next`.
>
> **If functional setters exist**, perform the fix:
>
> **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
>
> **Location:** `setFocusState` callback body.
>
> **Action:** Replace the investigation branch to pass the functional form through:
> ```ts
> const setFocusState = useCallback(
>   (focus: Partial<FocusState> | ((prev: FocusState) => FocusState)) => {
>     const inv = investigationRef.current;
>     if (inv) {
>       if (typeof focus === "function") {
>         inv.setFocusFunctional(focus);   // ← whatever the context exposes
>       } else if (focus.enabled === false) {
>         inv.clearFocus();
>       } else {
>         inv.setFocus(focus);
>       }
>     } else {
>       setLocalFocusState((prev) => typeof focus === "function" ? focus(prev) : { ...prev, ...focus });
>     }
>   },
>   [],
> );
> ```
> Apply the same pattern to `setImpactState` and `setConnectionState`.
>
> **If functional setters do NOT exist**, perform **this** fix:
>
> **File:** `dependency-analyzer/explorer/src/context/InvestigationContext.tsx`
>
> Add functional variants:
> ```ts
> setFocusFunctional: (updater: (prev: FocusState) => FocusState) => {
>   setState(prev => {
>     const next = updater(prev.focusState);
>     return { ...prev, focusState: next.enabled ? next : createEmptyFocusState() };
>   });
> },
> ```
> (and equivalents for impact / connection), then use them from `useViewState` as above.
>
> **If neither is feasible without a large refactor**, convert the caller contract in `useViewState`: disallow functional updaters when investigation context is present, and **log a dev warning**:
> ```ts
> if (typeof focus === 'function') {
>   if (process.env.NODE_ENV !== 'production') {
>     console.warn('[useViewState] functional focus updaters are not supported when InvestigationContext is mounted; use the setter with a plain value.');
>   }
>   const next = focus(investigationRef.current.state.focusState);
>   ...
> }
> ```
> — but only as a fallback after reporting the refactor cost.
>
> Show the diff and state which path you took.

### Consequences
- **Immediate:** Functional updates work under the investigation context.
- **Risk:** If the context's functional setter is implemented with a batched reducer, rapid updates will correctly compose. If not, this just moves the staleness to a different layer — the context-side fix is required for full correctness.
- **Improvement:** Behavior parity between context-present and context-absent branches — simplifies testing.

### Next Steps
- Add a hook-level unit test: mount `InvestigationProvider` + `useViewState`, call `setFocusState(f1); setFocusState(f2);` in one act, assert both applied.

---

## Issue 12 — Architecture-mode-switch early return leaves overlays stale

### Analysis
**Verdict: Confirmed defect.** In `GraphView.tsx`, inside the architecture-switch effect:
```ts
if (autoLayoutPolicy === false) {
  captureAndPersistPositions(targetProvenance);
  return;
}
```
This path runs when `shouldAutoLayout` returns `false` — e.g. static mode with authoritative positions. It **does not** call `setFeatureRegions` or `setOrbitGuides`. So switching hybrid → orbit → constellation in static mode leaves the previous mode's overlay data in state.

### Impact
- The overlay shows stale feature regions (hybrid) while the canvas shows constellation rings (once Issue 5 is fixed — currently shows nothing because orbitGuides is undefined for constellation).
- Even after Issue 5 is fixed, switching in static mode leaves feature region boxes visible in orbit mode and vice versa (via the `featureRegions`/`orbitGuides` props which are mode-gated — but the *content* is stale).

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Inside the architecture-mode-switch effect, the block:
> ```ts
> if (autoLayoutPolicy === false) {
>   captureAndPersistPositions(targetProvenance);
>   return;
> }
> ```
>
> **Action:** Recompute overlay metadata without running a layout. The cleanest available API is `computeArchitectureLayoutWithMetadata` — but it *runs* a layout. Instead, use the existing helper that just derives regions/guides from positions if one exists, or fall through to the layout path in **static mode only for the metadata**:
>
> ```ts
> if (autoLayoutPolicy === false) {
>   captureAndPersistPositions(targetProvenance);
>   // Overlay metadata is cheap and must reflect the current mode.
>   try {
>     const metadataOnly = computeArchitectureLayoutWithMetadata(
>       nodesRef.current,
>       edgesRef.current,
>       { architectureMode, existingPositions: nodePositionsRef.current ?? undefined },
>     );
>     setFeatureRegions(metadataOnly.featureRegions);
>     setOrbitGuides(metadataOnly.orbitGuides);
>   } catch (e) {
>     if (process.env.NODE_ENV !== 'production') {
>       console.warn('[GraphView] overlay metadata refresh failed', e);
>     }
>   }
>   return;
> }
> ```
>
> **If `computeArchitectureLayoutWithMetadata` internally triggers `cy.positions` mutation and would cause a visible jitter**, instead extract (or add) a sibling `computeOverlayMetadata(nodes, edges, options)` in `lib/graph-layout.ts` that returns `{ featureRegions, orbitGuides }` **without** mutating cytoscape. Report which path you take.
>
> Show the diff and confirm `featureRegions`/`orbitGuides` state updates on hybrid→constellation in static mode.

### Consequences
- **Immediate:** Overlay metadata tracks mode switches in static mode.
- **Risk:** If the "metadata-only" compute is expensive for large graphs, static-mode switches pay a visible cost. Mitigate with `useTransition` or `requestIdleCallback` if needed — Jules should measure.
- **Improvement:** Removes a class of "overlay shows wrong mode" bugs.

### Next Steps
- Add a Playwright test: `static` mode, switch hybrid → orbit, assert no feature region boxes and rings present.

---

## Issue 13 — `getCorrelationToken()` consumes the token

### Analysis
**Verdict: Confirmed defect.** In `GraphView.tsx`:
```ts
export const getCorrelationToken = (): string | undefined => {
  const token = currentCorrelationToken;
  currentCorrelationToken = undefined;   // ← consumes
  return token;
};
```
Consumed inside the arch-switch effect:
```ts
const activeToken = effectiveLayoutOptionsRef.current?.correlationToken ?? getCorrelationToken();
```
Used in the notifyComplete callback and in `notifyComplete('fallback-complete', activeToken)`.

If **any** other code calls `getCorrelationToken()` first (e.g. an orchestration layer or a second `GraphView`), the token is gone before the layout runs. If two effects run in the same tick (`architecture-mode-switch` + `executeResetLayout`), only the first gets the token; the second falls back to `undefined`.

### Impact
- `app:layoutcomplete` events fire without a correlation token in exactly the situations QA relies on for automation.
- Race condition that presents as flaky tests.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** The module-level exports:
> ```ts
> export const setCorrelationToken = (token: string | undefined) => { ... };
> export const getCorrelationToken = (): string | undefined => { ...; currentCorrelationToken = undefined; return token; };
> ```
>
> **Action 1 — add a non-consuming peek:**
> ```ts
> export const peekCorrelationToken = (): string | undefined => currentCorrelationToken;
> ```
>
> **Action 2 — keep `getCorrelationToken` for backwards compatibility** (do not change its behavior — external code may rely on consuming).
>
> **Location:** Inside the architecture-mode-switch effect, change:
> ```ts
> const activeToken = effectiveLayoutOptionsRef.current?.correlationToken ?? getCorrelationToken();
> ```
> to:
> ```ts
> const activeToken =
>   effectiveLayoutOptionsRef.current?.correlationToken ??
>   peekCorrelationToken();
> ```
> Do **not** consume it here.
>
> **Location:** Wherever `notifyComplete('complete' | 'fallback-complete', token)` fires and dispatches `window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }))` — **after** this dispatch, call `getCorrelationToken()` once to clear it:
> ```ts
> window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
> // consume the token now that the event has been dispatched
> if (peekCorrelationToken() === correlationToken) {
>   getCorrelationToken();
> }
> ```
>
> **Action 3 — audit** for other `getCorrelationToken()` callers in the repo. Paste the audit list. Do not modify them unless they are also on the layout-completion path.
>
> Show the diff.

### Consequences
- **Immediate:** Multiple effects in one tick share the token; consumption still happens exactly once after dispatch.
- **Risk:** Very low — behavior for the single-caller path is unchanged.
- **Improvement:** Eliminates a flakiness source for automation that keys off `app:layoutcomplete`.

### Next Steps
- Add a test dispatching two `architecture-mode-switch` events in one tick and asserting `app:layoutcomplete` fires twice with the same non-null token.

---

## Issue 14 — Empty-state "Reset view" button is a no-op

### Analysis
**Verdict: Confirmed defect (UX).** In `GraphView.tsx`:
```tsx
{nodes.length === 0 && (
  ...
  <button onClick={executeResetLayout}>Reset view</button>
)}
```
`nodes.length === 0` means **filters** excluded everything — the graph has data elsewhere. `executeResetLayout` clears session positions and runs a layout on an empty graph (harmless no-op). The user expects the empty state to be dismissed — which requires clearing filters.

### Impact
- Confusing UX — button does nothing.
- Users think the graph is empty when it's just filtered.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Inside `<div className="graph-empty-state">`, the `<button>`:
> ```tsx
> <button
>   type="button"
>   className="ui-btn ui-btn-secondary ui-btn-sm"
>   onClick={executeResetLayout}
>   ...
> >
>   Reset view
> </button>
> ```
>
> **Action:** The button should clear filters. However, `GraphView` does not own filter state. **Two options — pick based on available props:**
>
> **Option A — if `GraphView` receives a filter-clearing callback (check `GraphViewProps`):**
> ```tsx
> <button
>   type="button"
>   className="ui-btn ui-btn-secondary ui-btn-sm"
>   onClick={onClearFilters ?? executeResetLayout}
> >
>   Clear filters
> </button>
> ```
> Add `onClearFilters?: () => void;` to `GraphViewProps` and thread it from the parent (search for the `GraphView` call site in `ExplorerView.tsx` or similar).
>
> **Option B — if not (preferred minimal change):** Change the button label to be truthful and dispatch an app-level event the parent listens to:
> ```tsx
> <button
>   type="button"
>   className="ui-btn ui-btn-secondary ui-btn-sm"
>   onClick={() => {
>     window.dispatchEvent(new CustomEvent('explorer:clear-filters'));
>   }}
> >
>   Clear filters
> </button>
> ```
> In the parent that owns filters (search for `setFilterState` usage), add:
> ```ts
> useEffect(() => {
>   const h = () => setFilterState(createEmptyFilterState());
>   window.addEventListener('explorer:clear-filters', h);
>   return () => window.removeEventListener('explorer:clear-filters', h);
> }, []);
> ```
>
> Report which option you chose and why, and paste the final diff for both files if Option B is chosen.

### Consequences
- **Immediate:** Button is functional; label matches effect.
- **Risk:** Low. Option A is type-safe; Option B relies on event name — add a shared constant.
- **Improvement:** No more "why doesn't this do anything".

### Next Steps
- Extract `'explorer:clear-filters'` event name to a shared constants module.

---

## Issue 15 — `edge` URL param dead state

### Analysis
**Verdict: Confirmed defect (dead code).** `useViewState` parses `edge` from URL into `urlEdgeId` but:
- nothing consumes `urlEdgeId` for selection;
- `syncToUrl` never writes `edge` back.

Consumers must use `selectedNodeId` for selection — the URL parameter is inert. Deep-linking an edge is broken (silently).

### Impact
- Deep link `?edge=xyz` loads with no edge selected; user thinks the link is broken.
- `urlEdgeId` in the return value is a trap for future maintainers.

### Prompt for Fix (file + line)
> **Jules — this is a *decision* task, not a blind fix. First investigate and report.**
>
> **Investigation:**
>
> 1. Grep the repo for `urlEdgeId` and `selectedEdgeId`. Report all consumers.
> 2. Check `InvestigationContext` — is there `selectEdge(id)`? Is there `state.selectedEdgeId`?
> 3. Check `useViewState`'s return object — is `urlEdgeId` returned but unused?
>
> **Choose ONE of two paths:**
>
> **Path A — implement edge deep-link (recommended):**
> - **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
> - In `readStateFromUrl`, after parsing `edge`, call `investigationRef.current.selectEdge(initialEdge)` (or a local fallback `setLocalSelectedEdgeId(initialEdge)` if you also add `selectedEdgeId` state).
> - Add `selectedEdgeId` / `setSelectedEdgeId` to the local state and to the return object.
> - In `syncToUrl`, include `if (selectedEdgeId) params.set('edge', selectedEdgeId);`.
> - **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx` — no changes (already accepts `selectedEdgeId`).
>
> **Path B — remove dead code (minimal):**
> - **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
> - Delete the `urlEdgeId` state, the `setUrlEdgeId` calls in `readStateFromUrl` and the project-change handler, and the `urlEdgeId` field from the return object.
> - Add a `// TODO(edge-deeplink): re-add if product requires` comment in `readStateFromUrl` where `edge` was parsed.
>
> Report the choice. If Path A, show the full diff for `useViewState.ts` and confirm `GraphView`'s selection effect already handles `selectedEdgeId`.

### Consequences
- **Path A:** Deep-link works; new API surface (`selectedEdgeId`).
- **Path B:** Dead code removed; some future re-implementation needed.
- **Risk either way:** Very low.

### Next Steps
- Add a Playwright test for the chosen path.

---

## Issue 16 — Hook safety: `try/catch` around context hooks

### Analysis
**Verdict: By design / latent — acceptable, but should be documented.**
```ts
function useWorkspaceRouterSafe() {
  try { return useWorkspaceRouter(); } catch (_) { return null; }
}
```
This is a defensive shim to support running `useViewState` without any of the three contexts. If `useWorkspaceRouter` **throws on every render consistently** (e.g. its own internal context throws when no provider), the try/catch is safe. If it ever throws *after* consuming some of its own hooks on some renders but not others, React hook ordering breaks and the app crashes with a much harder error ("Rendered fewer hooks than expected").

In practice, context hooks that use `useContext` never throw conditionally — they throw `undefined` returns (or fall through to a null check inside). So this pattern is safe **today**, but the `try/catch` masks violations from future providers.

**Verdict:** By design. **No fix required.** Recommend adding a one-line comment and a lint exemption.

### Impact
- None today; risk of future hook-order bugs hidden by the catch.

### Prompt for Fix (file + line)
> **Jules — no code change required (by design). Instead, document the safety assumption:**
>
> **File:** `dependency-analyzer/explorer/src/hooks/useViewState.ts`
>
> **Location:** Above `useWorkspaceRouterSafe` / `useInvestigationSafe` / `useProjectSafe`.
>
> **Action:** Add a comment block:
> ```ts
> // Defensive shims for standalone useViewState without WorkspaceRouter/Investigation/Project
> // providers mounted. Assumption: each underlying hook throws *before* invoking any of its
> // own hooks when no provider is present (i.e. useContext on a null context). If a provider
> // ever throws after some of its own hooks have run, this pattern will violate Rules of Hooks
> // and must be removed in favor of `createContext(null)` + null checks at call sites.
> ```
>
> Show the comment in the diff. No other changes to this file for Issue 16.

### Consequences
- **Immediate:** None.
- **Improvement:** Documents a fragile assumption for future maintainers.

### Next Steps
- Follow-up (not this ticket): convert each context to `createContext<T | null>(null)` and let `useX()` return `null` cleanly — then delete the shims.

---

## Issue 17 — Unguarded `localStorage` reads in `useMemo` initializers

### Analysis
**Verdict: Confirmed defect.** `GraphView.tsx`:
```ts
const initialArchMode = useMemo(() => {
  ...
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('explorer:architectureMode') as ArchitectureLayoutMode | null;
    ...
  }
}, [...]);
```
`localStorage.getItem` can throw in privacy-restricted iframes and older Safari Private Browsing. A throw here crashes the whole graph during render.

Contrast the corresponding writer which is guarded:
```ts
try { localStorage.setItem(...); } catch (e) {}
```

### Impact
- Graph fails to render in restricted browsers.
- Error boundary (if any around `GraphView`) has no `resetKeys` — permanent blank.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** The `initialArchMode` and `initialLayoutMode` `useMemo` bodies.
>
> **Action:** Wrap the `localStorage.getItem` calls in try/catch:
>
> ```ts
> const initialArchMode: ArchitectureLayoutMode = useMemo(() => {
>   if (hashModes.arch) return hashModes.arch;
>   if (architectureModeProp) return architectureModeProp;
>   if (graphLayout?.architectureMode) return graphLayout.architectureMode;
>   try {
>     if (typeof localStorage !== 'undefined') {
>       const stored = localStorage.getItem('explorer:architectureMode') as ArchitectureLayoutMode | null;
>       if (stored && ['hierarchical', 'hybrid', 'orbit', 'constellation'].includes(stored)) {
>         return stored;
>       }
>     }
>   } catch { /* storage unavailable */ }
>   return 'hierarchical';
> }, [hashModes.arch, architectureModeProp, graphLayout?.architectureMode]);
> ```
>
> Apply the identical pattern to `initialLayoutMode`.
>
> Show the diff.

### Consequences
- **Immediate:** Graph renders in restricted browsers.
- **Risk:** Low.
- **Improvement:** Consistency with writer guards.

### Next Steps
- Add a test stubbing `localStorage.getItem` to throw.

---

## Issue 18 — `handleTransitionEnd` uses hardcoded class names

### Analysis
**Verdict: Confirmed defect (fragility).** In `GraphView.tsx`:
```ts
if (
  e.target instanceof HTMLElement &&
  (e.target.classList.contains('main-viewport') ||
    e.target.classList.contains('graph-view-layout') ||
    e.target.classList.contains('investigation-drawer'))
) {
  if (cyRef.current) cyRef.current.resize();
}
```
Renaming any CSS class silently disables resize-on-panel-toggle, producing a "graph looks smeared after opening the investigation drawer" bug that's hard to trace.

### Impact
- Fragile against CSS refactors.
- Silent failure mode.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** The `handleTransitionEnd` function.
>
> **Action:** Match on a semantic data attribute instead of class names:
>
> ```ts
> const handleTransitionEnd = (e: TransitionEvent) => {
>   if (!(e.target instanceof HTMLElement)) return;
>   const trigger = e.target.closest('[data-graph-resize-trigger]');
>   if (!trigger) return;
>   if (cyRef.current) {
>     cyRef.current.resize();
>   }
> };
> ```
>
> **File:** Wherever the three class names are applied — search for `main-viewport`, `graph-view-layout`, `investigation-drawer` across `dependency-analyzer/explorer/src/**/*.css` and `**/*.tsx`.
>
> **Action:** Add `data-graph-resize-trigger` to each element that currently has one of those classes:
> ```tsx
> <div className="main-viewport" data-graph-resize-trigger> ... </div>
> <div className="graph-view-layout" data-graph-resize-trigger> ... </div>
> <aside className="investigation-drawer" data-graph-resize-trigger> ... </aside>
> ```
>
> Show the diff for every file touched. If any of the three elements cannot be located, report it and leave `handleTransitionEnd`'s old logic in place as a fallback with a `TODO`.

### Consequences
- **Immediate:** CSS class renames no longer break resize.
- **Risk:** Missing a `data-graph-resize-trigger` element disables resize for that panel — smaller, more localized failure than today.
- **Improvement:** Semantic contract.

### Next Steps
- Add a Playwright test: open investigation drawer, assert canvas resized (via `cy.width()` before/after).

---

## Issue 19 — Test module mismatch and ring-count assertion

### Analysis
**Verdict: Needs verification — likely defect.** See Issue 9's investigation prompt. Additionally, the ring-count comment/code mismatch (`6 Concentric Architectural Rings` vs `rings.length === 3`) suggests either:
- The producer produces 3 and the comment is stale, or
- The test exercises a different producer that returns 3 while production returns 6.

Also, `UrlSyncAndOverlayRegression.test.ts` "Issue B" test doesn't mount any component — it asserts pure string concatenation that neither production path performs verbatim:
```ts
const newUrl = `/path${searchString}${currentHash}`;
expect(newUrl).toBe('/path?project=bqc#arch=hybrid&layout=static');
```
The actual production code builds URLs in `useViewState.syncToUrl` and `GraphView`'s hash effect — different shapes, different param sets.

### Impact
- Test suite provides false confidence.
- A regression against the real URLs won't be caught.

### Prompt for Fix (file + line)
> **Jules, perform the following changes:**
>
> **File:** `dependency-analyzer/explorer/src/test/UrlSyncAndOverlayRegression.test.ts`
>
> **Action 1 — align imports (from Issue 9's investigation, this may already be resolved).** Ensure both:
> - `computeArchitectureLayoutWithMetadata`
> - `discoverFeatures`
> - `computeCanvasLODLevel`
>
> are imported from the **same** modules that `GraphView.tsx` and `FeatureOverlayCanvas.tsx` import from. In particular, `computeArchitectureLayoutWithMetadata` must come from `../lib/graph-layout` **if** `lib/graph-layout` re-exports it, otherwise from `../lib/architecture-layout` **and** add a matching re-export in `lib/graph-layout.ts` so production and test share the module.
>
> **Action 2 — reconcile the ring-count** (from Issue 9 step 5 report):
> - If `3`, update the overlay comment in `FeatureOverlayCanvas.tsx` (`6 Concentric Architectural Rings` → `3 Concentric Architectural Rings`).
> - If `6`, update the test assertion `toBe(3)` → `toBe(6)`.
>
> **Action 3 — replace the shallow "Issue B" test** with one that exercises the actual code path. Add a **new** test that constructs URLs via the same helper functions used by `useViewState` (`filterQuery.toQuery`, etc.):
>
> ```ts
> import { filterQuery, connectionQuery } from '../lib/url';
>
> it('preserves unknown query params (e.g. ?debug) across state changes', () => {
>   const prev = 'https://example.test/?debug&utm_source=qa';
>   const url = new URL(prev);
>   const params = new URLSearchParams(url.search);
>   const OWNED = ['project','node','component','investigate','focus','impact','conn','findings','investigation','view','search','typeFilter','riskFilter','hasCallouts','withoutSharing','hideTests','hasAsyncPatterns'];
>   for (const k of OWNED) params.delete(k);
>   params.set('node', 'AccountController');
>   const result = `?${params.toString()}`;
>   expect(result).toContain('debug');
>   expect(result).toContain('utm_source=qa');
>   expect(result).toContain('node=AccountController');
> });
> ```
> This locks in Issue 2's fix contract.
>
> **Action 4 — mark the existing "Issue B" tests as `it.skip` with a comment explaining they were superseded**, or delete them. Do not leave them asserting a fictional URL construction.
>
> Show the diff, and paste the numbers from Issue 9's investigation (rings length for both modules).

### Consequences
- **Immediate:** Test suite verifies the fix contract (Issue 2) rather than fiction.
- **Risk:** `filterQuery.toQuery` etc. imports may not exist with those names — Jules must verify in `lib/url.ts` before adding the test.
- **Improvement:** Coverage that would catch Issues 1 and 2 regressions.

### Next Steps
- Convert to an RTL integration test in a subsequent ticket (mount real components, assert `window.location`).

---

## Issue 20 — `restoredHashNodeRef` set before confirming the node exists

### Analysis
**Verdict: Confirmed defect.** In `GraphView.tsx`:
```ts
if (initialNodeId && !selectedNodeId) {
  restoredHashNodeRef.current = true;
  const matchedNode = nodes.find(n => n.id === initialNodeId || n.displayName === initialNodeId);
  if (matchedNode) { ... }
}
```
If `nodes` are partially loaded (some but not all — common with streaming/async data), and the hash node isn't yet present, the restore is never attempted again. Deep links to async-loaded nodes silently fail.

### Impact
- Deep links unreliable on slow-loading projects.
- Since Issue 6 moves this effect earlier, the problem compounds — it runs even sooner.

### Prompt for Fix (file + line)
> **Jules, perform the following change:**
>
> **File:** `dependency-analyzer/explorer/src/components/GraphView.tsx`
>
> **Location:** Inside the `// Initial node restoration from URL hash` effect.
>
> **Action:** Only flip `restoredHashNodeRef` after a successful match, and add a `gave-up` guard tied to node arrival:
>
> ```ts
> useEffect(() => {
>   if (!cyInstance || nodes.length === 0 || restoredHashNodeRef.current) return;
>
>   const initialNodeId = hashModes.node;
>   if (!initialNodeId || selectedNodeId) return;
>
>   const matchedNode = nodes.find(
>     n => n.id === initialNodeId || n.displayName === initialNodeId,
>   );
>   if (!matchedNode) {
>     // Nodes are still arriving; retry on next nodes change.
>     return;
>   }
>
>   restoredHashNodeRef.current = true;
>   onSelectNode(matchedNode);
>   const ele = cyInstance.getElementById(matchedNode.id);
>   if (ele.length > 0) {
>     if (prefersReducedMotion) {
>       cyInstance.center(ele);
>     } else {
>       cyInstance.animate({ center: { eles: ele }, zoom: 1.5 }, { duration: 400 });
>     }
>   }
> }, [cyInstance, nodes, hashModes.node, selectedNodeId, onSelectNode, prefersReducedMotion]);
> ```
>
> Show the diff. Confirm the effect re-runs when `nodes` grows and eventually finds the target.

### Consequences
- **Immediate:** Deep links work once the target node arrives.
- **Risk:** If the node never arrives (bad link), the effect re-runs on every `nodes` change — negligible cost (a `find`).
- **Improvement:** No permanent silent failure.

### Next Steps
- Add a test mounting `GraphView` with an empty `nodes` prop and then a filled one, asserting selection.

---

## Consolidated Consequences of the Plan

| Fix | Behavior change | Risk | Test coverage needed |
|---|---|---|---|
| 1 | `node` search-only; hash `node` still read as fallback | Low | Playwright roundtrip |
| 2 | Unknown query params survive | Low | Unit |
| 3 | Decorations survive rebuilds; fewer rebuilds | Medium | Integration (class-presence) |
| 4 | One layout per mount; fit preserved | Medium | Snapshot of `__LAST_LAYOUT_COMPLETED__` |
| 5 | Rings visible in constellation | Medium | RTL render |
| 6 | Back/forward honors `arch`/`layout` | Low | Playwright popstate |
| 7 | `investigation.selectNode` always wired | Low | Deferred-provider RTL |
| 8 | Overlay errors visible and recoverable | Low | Forced-throw RTL |
| 9 | Canonical type imports | Low/None | Compile-only |
| 10 | Overlay positions rAF-coalesced | Low | Perf |
| 11 | Functional setters compose | Medium | Hook unit |
| 12 | Overlay metadata updates in static-mode switch | Medium | Playwright |
| 13 | Token not consumed prematurely | Low | Unit |
| 14 | Empty-state button clears filters | Low | UX |
| 15 | `edge` deep-link works (or is removed) | Low | Playwright |
| 17 | Guarded storage | None | Unit |
| 18 | Resize on data-attribute | Low | Playwright |
| 19 | Tests reflect real code | Low | N/A |
| 20 | Deep links survive async node load | Low | RTL |

**Cross-cutting risks:**
- Issues **1, 6, 19** are entangled — merges should be sequential and tested together.
- Issues **3, 10** interact — the rAF fix should land before or with the decoration-preservation fix, or the decoration fix will re-trigger expensive position captures.
- Issue **8** should land **early** in the sequence, so remaining bugs surface visibly during implementation of the rest.

---

## Next Steps (Ordering)

**Phase 1 — Observability and safety (do first):**
1. Issue 8 (error boundary `resetKeys` + `onError`) — makes subsequent bugs visible.
2. Issue 17 (`localStorage` try/catch) — removes a crash class.
3. Issue 4 (single layout) — makes every other layout test deterministic.

**Phase 2 — Correctness:**
4. Issue 3 (decorations survive rebuilds) — highest user-visible impact.
5. Issue 5 (constellation overlay) — highest "missing feature" impact.
6. Issue 7 (stale `investigation`).
7. Issue 10 (rAF position capture).

**Phase 3 — URL contract:**
8. Issue 1 (single `node` owner) → Issue 6 (popstate/hashchange) → Issue 15 (edge param).
9. Issue 2 (`syncToUrl` preserves unknown params).

**Phase 4 — Remaining:**
10. Issue 11 (functional setters).
11. Issue 12 (static-mode overlay metadata).
12. Issue 13 (correlation token peek).
13. Issue 9 + 19 (types/tests alignment — do after all above are merged so tests are stable).
14. Issues 14, 18, 20 (UX/fragility).
15. Issue 16 (documentation only).

**Blockers:**
- Issue 9 must be investigated **before** Issue 5 is fixed (to ensure overlay shape is correct).
- Issue 19 must be investigated **before** claiming Issue 1/2 are verified.
- Issue 3's implementation requires `applyDecorations` to be defined after Issue 4 lands (to avoid an unused-variable warning while refactoring).

**Follow-up audit tickets (out of scope here):**
- Convert all three contexts to `createContext<T | null>(null)` and delete `useXSafe` shims (Issue 16 followup).
- Audit all other `useEffect([])` closures in the repo for the Issue 7 stale-closure pattern.
- Audit other decoration-class names for the Issue 18 fragility pattern.
- Consolidate `lib/graph-layout`, `lib/architecture-layout`, `lib/layout/global-layout` re-exports into a single public surface for the graph subsystem.

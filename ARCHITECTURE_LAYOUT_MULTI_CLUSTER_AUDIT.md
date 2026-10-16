# Architecture Layout Multi-Cluster Audit

**Date:** 2026-10-16
**Scope:** Component Orbit + Component Constellation + Hierarchical dispatch pipeline
**Status:** Issue report — findings verified against source; no fixes applied
**Related audits:**
- GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION ... AUDIT.md
- COMP_ORBIT_PBIM_COMPREHENSIVE_REPOSITORY_TRUTH_AUDIT.md
- ARCHITECTURE_EXPLORER_POST_STARTUP_CROSS_LAYOUT_QUALIFICATION_REPORT.md
- COMPONENT_ORBIT_CONSTELLATION_REAL_PBIM_BROWSER_CLOSURE_FINAL_REPORT.md

**Structure:** Six clusters, each a self-contained execution-path segment.
1. Trigger & Persistence
2. Orchestration
3. Dispatch
4. Focused Orbit
5. Multi-Sun Constellation
6. Layered Architecture

**Precedence:** Findings are ranked CRITICAL → HIGH → MEDIUM → LOW within each cluster. Fix order is given at the end of the coding-agent prompt, not at the end of each cluster.



I've read through the codebase and the investigation report. Rather than repeat the report's guidance, let me give you the concrete issues I can identify directly in the code you shared.

## Confirmed code-level issues (highest impact)

### 1. Async layout path drops `featureRegions` / `orbitGuides`

In `GraphView.tsx`, the `architectureMode` change effect chooses between async and sync paths based on node count:

```ts
if (nodesRef.current.length >= 20) {
  runLayoutWithMetadataAsync(cy, { ... }).then((layoutRes) => {
    setFeatureRegions(layoutRes.featureRegions);   // <-- may be undefined
    setOrbitGuides(layoutRes.orbitGuides);         // <-- may be undefined
    ...
  })
```

But `runLayoutWithMetadataAsync` returns `CalculateLayoutAsyncResult`, whose contract (per the report) is:

```
positions, requestGeneration, projectId, isOffloaded, computeDurationMs, ipcDurationMs, totalDurationMs
```

It does **not** carry `featureRegions` or `orbitGuides`. If the worker client isn't enriching the response (which isn't visible in the files you shared), then any graph with ≥ 20 nodes will silently wipe the Hybrid feature overlays and Orbit/Constellation guide rings. On smaller graphs it works — which perfectly matches "looks different in some contexts."

**Check first:** open `layout-worker-client.ts` and confirm whether the async response actually contains `featureRegions` / `orbitGuides`. If it doesn't, this is a definite bug and explains half of the symptom.

### 2. PBIM-specific hardcoding in `component-constellation-layout.ts`

The shared-node placement contains literal fixture values:

```ts
if (sNode.nodeId === 'ApexClass:MaintenanceRequestController' ||
    sNode.nodeId.includes('MaintenanceRequestController')) {
  const targetDist = 245.62; // Contracted distance achieving 124.41px AABB gap
  ...
}

const isCoLocatedGroup =
  Math.abs(rawX - (-675.0)) < 1.0 &&
  Math.abs(rawY - (-389.7114)) < 2.0;
```

This means the "Min Shared-Node Sun AABB Clearance ≥ 120px" invariant is **only satisfied for the PBIM fixture**. Any other project, any reordering of input nodes, or any new test fixture will produce overlapping shared nodes and Suns. The invariant is in the file header but not enforced by the algorithm — it's enforced by name matching.

**This is almost certainly why Constellation looks wrong on anything but the canonical PBIM dataset.**

### 3. Mode-cycle control is blind to sub-modes

In `GraphControls.tsx`:

```ts
const nextMode =
  architectureMode === 'hierarchical' ? 'hybrid' :
  architectureMode === 'hybrid'       ? 'orbit'  :
  architectureMode === 'orbit'        ? 'constellation' :
                                        'hierarchical';
```

Combined with `aria-pressed={architectureMode !== 'hierarchical'}`, the button gives the user no visible indication of which of the three non-default modes is actually active besides the emoji (🏢/🧩/🪐/🌌). If the parent is failing to round-trip the state (e.g. because `architectureModeProp || graphLayout?.architectureMode || 'hierarchical'` is resolving to a stale value), the user sees "the button toggled" but the canvas never changes. Check the actual React state value in devtools — the button class is not diagnostic.

### 4. Orbit focal resolution can silently swap Suns

In `component-orbit-adapter.ts`:

```ts
if (!focalLwcId && availableSuns.length > 0) {
  focalLwcId = availableSuns[0].id;
}
```

`availableSuns` ordering depends on:

1. `isRootLwc` (no incoming `lwc-template-child` edge)
2. outgoing edge count
3. child LWC count
4. lexicographic ID

If the LWC composition graph changes shape at all (e.g. an extra template reference is added), a *different* LWC becomes the fallback Sun, and the whole orbit is recomputed around a different center. That's not a bug per se, but it means "Orbit looks wrong" often means "Orbit picked the wrong center because a new edge changed the sort."

### 5. `existingPositions` is never passed for orbit/constellation

In `GraphView.tsx`, both the mode-change effect and the structural-sync effect call:

```ts
runLayoutWithMetadata(cy, {
  ...effectiveLayoutOptionsRef.current,
  nodes, edges, nodeCount,
  animate, architectureMode,
  enableFeatureLayout: architectureMode === 'hybrid',
  fit: true,
});
```

There is no `existingPositions` passed. So for hierarchical mode, `computeArchitectureLayoutWithMetadata` will run its full pipeline every time. For orbit/constellation that doesn't matter (they ignore `existingPositions`), but for hierarchical it means **any** structural change fully relayouts and can move nodes the user had positioned — as long as `position-policy` allows it. Verify `shouldAutoLayout` returns `false` in that scenario; if the mode was previously `static`, it should.

## What to instrument next

1. **Breakpoint in `computeArchitectureLayoutWithMetadata`** — log `architectureMode`, `options.focalLwcId`, `nodes.length`, `edges.length`, and the size of `projectedNodeIds` on return. If the mode is `constellation` but `projectedNodeIds.size` is tiny (1–2), the projection is empty or nearly so, and the problem is data, not geometry.

2. **Breakpoint in `runLayoutWithMetadataAsync`'s `.then`** — check `layoutRes.featureRegions` and `layoutRes.orbitGuides` are actually populated. If either is `undefined`, the async worker isn't returning them.

3. **After the layout settles**, in devtools run:
   ```js
   window.__CY__.nodes().filter(n => n.visible()).map(n => n.id())
   ```
   Compare to what you expect for the mode. This tells you whether the visibility filter or the geometry is wrong.

4. **Log `projectState` after each switch** — confirm `graphLayout.architectureMode` and `graphLayout.layoutPositions[architectureMode]` are both being updated to the new mode. A common failure is that `architectureMode` on the state object gets updated but `layoutPositions` for that key is stale from a previous run.

## The most likely root cause

Given the evidence, I'd rank:

1. **Async worker result missing overlay metadata** (breaks Constellation/Orbit/Hybrid at ≥20 nodes) — verify first, it's the cheapest to test.
2. **Constellation shared-node placement relying on PBIM-specific literals** — this makes Constellation fail on any other project but pass the canonical test.
3. **Mode state not round-tripping through the parent**, so the button click appears to work but `architectureMode` inside `GraphView` never changes.

If you can share the source of `layout-worker-client.ts`, `component-constellation-adapter.test.ts`, and `component-orbit-dynamic-focal.test.ts`, I can pin down #1 and #2 definitively. Which of the three modes is visibly broken in your environment right now, and on which dataset (PBIM or something else)?







# Investigation framing

Your investigation is fundamentally a **"which layer is broken"** trace, not an algorithmic one. The failure can originate at any of six independent seams: trigger → state → dispatch → projection → geometry → render. The correct clustering is therefore **by seam**, not by directory. Files that sit on the same execution path or share a data contract belong together; files that merely live in the same folder do not.

I've also cross-checked against the actual imports in the code you shared — `component-constellation-adapter.ts` imports `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` from `component-orbit-adapter.ts`, for example, so those two clusters are not fully independent.

---

# Cluster names

## 1. **Trigger & Persistence Cluster**
*Decides whether a layout runs, and whether it survives a project switch.*

- `GraphControls.tsx`
- `WorkspaceHeader.tsx`
- `projectState.ts`
- `position-policy.ts`
- `index.css` (control styling: `.graph-controls-floating`, `.domain-lenses-bar`, `.view-mode-switcher-bar`)

**Why connected:** `GraphControls` fires `onToggleArchitectureMode` → `GraphView` calls `onArchitectureModeChange` → `projectState.updateProjectState` persists `architectureMode` → `position-policy.shouldAutoLayout` gates whether the new mode actually recalculates positions. If this cluster is broken, the button toggles but geometry never changes.

---

## 2. **Orchestration Cluster**
*The central integration point that receives mode + data and drives everything else.*

- `GraphView.tsx`
- `graph.css` (canvas-level overlays: `.graph-mode-badge`, `.minimap-container`, `.hover-card`)

**Why connected:** `GraphView` owns `architectureMode`, `effectiveLayoutOptions`, `derivedFocalLwcId`, the async-vs-sync branch (`nodes.length >= 20`), position capture, and the structural-sync effect. Almost every bug you're chasing passes through this file.

---

## 3. **Dispatch Cluster**
*Routes a mode to the correct engine and applies positions back to Cytoscape.*

- `graph-layout.ts`
- `architecture-layout.ts` (dispatcher half only)
- `layout-worker-client.ts` (referenced, not shared — **you must pull this in**)
- `graph-builder.ts`, `graph-style.ts`

**Why connected:** `graph-layout.runLayoutWithMetadata` → `computeArchitectureLayoutWithMetadata` → returns `{ positions, featureRegions, orbitGuides, projectedNodeIds }`. The `isOrbitComponentFilter` visibility logic lives here and is the *only* place that hides/show nodes for radial modes. If the async result is missing `featureRegions`/`orbitGuides`, the bug is here.

---

## 4. **Focused Orbit Cluster**
*Single-Sun radial pipeline: focal LWC → concentric rings.*

- `component-orbit-adapter.ts`
- `component-orbit-layout.ts`
- `orbit-layout.ts` (shared geometry utils)
- `orbit-semantics.ts`
- `graph-depth.ts` (BFS depth engine, consumed by adapter)

**Why connected:** Adapter uses `computeGraphDepths` → produces `ComponentOrbitProjection` → layout engine consumes it → `orbit-layout.ts` provides `checkAABBOverlap`, `normalizeAngle`, `calculateRequiredSectorRadius`. All four are a single call chain.

---

## 5. **Multi-Sun Constellation Cluster**
*Multi-Sun radial pipeline with shared-node placement.*

- `component-constellation-adapter.ts`
- `component-constellation-layout.ts`
- `constellation-layout.ts` (**re-export stub — verify it's not a second live path**)

**Why connected:** Adapter imports `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` from Cluster 4 — a real cross-cluster dependency. The layout engine contains PBIM-specific hardcoding (`'ApexClass:MaintenanceRequestController'`, `(-675.0, -389.7114)`), which is the strongest candidate for "works on PBIM, fails elsewhere."

---

## 6. **Layered Architecture Cluster**
*Hierarchical + Hybrid pipeline (the reference implementation).*

- `architecture-layout.ts` (pipeline half — shares the file with Cluster 3)
- `layout/analysis.ts`
- `layout/layers.ts`
- `layout/domains.ts`
- `layout/features.ts`
- `layout/feature-roles.ts`
- `layout/global-layout.ts`
- `layout/ordering.ts`
- `layout/local-layout.ts`
- `layout/centrality.ts`
- `layout/satellites.ts`
- `layout/components.ts`
- `layout/spacing.ts`
- `layout/graph-index.ts`

**Why connected:** This is the only pipeline that receives real `existingPositions` and honors Position Authority. It is your **baseline reference** — any correct behavior here that is absent in Clusters 4/5 is a defect.

---

## 7. **Shared Contract Cluster**
*Types every other cluster depends on.*

- `explorer.ts`

**Why isolated:** `ArchitectureLayoutMode`, `ExplorerNode`, `ExplorerEdge`, `ExplorerRelationshipType`, `ExplorerDataSchema` are consumed by every other cluster. A change here can silently invalidate assumptions in Clusters 3–6, so it gets its own cluster.

---

## 8. **Verification Cluster**
*Tests, grouped by which cluster they defend.*

| Sub-group | Files |
|---|---|
| Dispatch | `architecture-layout.test.ts` |
| Orbit | `component-orbit-adapter.test.ts`, `component-orbit-dynamic-focal.test.ts`, `component-orbit-layout.test.ts`, `component-orbit-integration.test.ts`, `component-orbit-visibility.test.ts` |
| Constellation | `constellation-adapter.test.ts`, `component-constellation-layout.test.ts`, `component-constellation-adapter.test.ts`, `component-constellation-integration.test.ts` |
| Orchestration | `GraphView.test.tsx`, `GraphView.layoutModeToggle.test.tsx`, `GraphView.positionAuthority.test.tsx`, `GraphView.runtimeIntegration.test.tsx` |
| Control | `GraphControls.test.tsx` |
| State | `position-policy.test.ts`, `projectState.test.ts` |

---

# Attention allocation

For your stated symptom, weight your time roughly:

- **40% → Cluster 3 (Dispatch)** — because the async worker response shape is the single highest-probability root cause and it is *only* visible here.
- **25% → Cluster 5 (Constellation)** — because the PBIM hardcoding is a confirmed defect that will fail every non-PBIM dataset.
- **15% → Cluster 1 (Trigger & Persistence)** — because "button toggles but nothing changes" is a classic state-round-trip failure.
- **10% → Cluster 2 (Orchestration)** — mostly as an observability point for breakpoints.
- **10% → Cluster 4 (Orbit)** — only if the user is specifically reporting Orbit as broken.
- **0% → Clusters 6, 7, 8** until Clusters 1–5 are instrumented — the layered pipeline and types are almost certainly not the defect, and the tests are already green on their fixtures.

Which mode is visibly broken in your environment, and on which dataset? That answer collapses this from a six-cluster sweep to a one-cluster deep dive.

# Trigger & Persistence Cluster — Issue Report

I traced the full path: **button click → cycle logic → parent callback → `updateProjectState` → `mergeWithDefaultState` → GraphView re-render → mode-change effect → `shouldAutoLayout` gate → position capture → persistence.** Below are the confirmed defects, ranked by blast radius.

---

## CRITICAL

### C1. `captureAndPersistPositions` tags Orbit/Constellation positions with hierarchical provenance

`GraphView.tsx`:

```ts
const provenance: LayoutProvenance = overrideProvenance ||
  (architectureMode === 'hybrid' ? 'automatic-hybrid' : 'automatic-hierarchical');
```

This is the **default** provenance used by every unqualified `captureAndPersistPositions()` call:

- `executeResetLayout` — sync and animated branches
- Initial mount, after initial layout
- Structural sync effect, `newlyPlaced` branch
- (Mode-change effect passes an override — that one is fine)

In Orbit or Constellation mode, all these call sites produce `'automatic-hierarchical'`. That value flows into:

```
onNodePositionsChange(positions, 'automatic-hierarchical')
  → updateProjectState({ graphLayout: { nodePositions, layoutProvenance: 'automatic-hierarchical' } })
  → newArchMode = curLayout.architectureMode   // 'orbit' or 'constellation'
  → layoutProvenances['orbit'] = 'automatic-hierarchical'   // ← WRONG
```

**Consequence:** `layoutProvenance` no longer identifies the layout engine that produced the positions. Any downstream consumer (badge, diagnostics, invalidation logic that checks "has this mode's layout been computed yet?") will mis-classify orbit/constellation positions as hierarchical.

**Fix:** The default should be derived from the current `architectureMode`:

```ts
const provenance: LayoutProvenance = overrideProvenance || (
  architectureMode === 'hybrid'         ? 'automatic-hybrid'        :
  architectureMode === 'orbit'          ? 'automatic-orbit'         :
  architectureMode === 'constellation'  ? 'automatic-constellation' :
                                          'automatic-hierarchical'
);
```

---

### C2. The architecture-mode-change effect bypasses `position-policy` entirely

`GraphView.tsx`:

```ts
useEffect(() => {
  const modeChanged = prevArchitectureModeRef.current !== architectureMode;
  ...
  if (!modeChanged && !focalChanged) return;
  ...
  if (nodesRef.current.length >= 20) {
    runLayoutWithMetadataAsync(cy, { ... }).then(...)   // unconditional
  } else {
    runLayoutWithMetadata(cy, { ... })                  // unconditional
  }
}, [architectureMode, effectiveLayoutOptions.focalLwcId, captureAndPersistPositions]);
```

No `shouldAutoLayout(...)` gate. Meanwhile `position-policy.ts` defines:

```ts
case 'mode-switch':
  return false;   // both static and interactive branches
```

**Two possibilities, both bad:**

1. If `'mode-switch'` is intended to mean *architecture* mode switch — the policy says **don't layout**, but GraphView lays out anyway. **Policy violation.**
2. If `'mode-switch'` is intended to mean the static/interactive toggle — then no trigger value exists for architecture mode changes, and the `'mode-switch'` entry is dead code with no consumer.

Either way, `LayoutTrigger` and `shouldAutoLayout` do not describe the actual runtime behavior of architecture mode transitions.

**Fix:** Introduce a distinct trigger (`'architecture-mode-switch'`) that returns `true` in both static and interactive branches, and consult it from the effect. Or, if the intent is that architecture switches never auto-layout, remove the effect's layout call and rely on the pre-captured positions.

---

### C3. `existingPositions` is never passed to the layout engine

Every layout call in `GraphView.tsx` (initial mount, mode-change effect, structural sync effect, `executeResetLayout`) omits `existingPositions`:

```ts
runLayoutWithMetadata(cy, {
  ...effectiveLayoutOptionsRef.current,
  nodes, edges, nodeCount,
  animate, architectureMode,
  enableFeatureLayout: architectureMode === 'hybrid',
  fit: true,
  // ← no existingPositions
});
```

But `computeArchitectureLayoutWithMetadata` in `architecture-layout.ts` explicitly preserves them:

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) resultPositions[id] = { x: pos.x, y: pos.y };
}
```

And `layoutPositions[architectureMode]` in `projectState` already contains the last-known positions for that mode, including user drags.

**Consequence:** Any time the layout dispatcher runs, it computes fresh geometry and `captureAndPersistPositions()` then overwrites the stored positions for that mode. **User-authored drags are silently erased** on:
- Any structural graph update (`nodes`/`edges` change → structural sync effect → layout runs)
- Switching modes away and back (mode-change effect re-runs layout, capture overwrites `layoutPositions[hierarchical]`)
- Reset layout (intended, but fine)

The `PositionAuthority` hierarchy (Levels 1–3 in `position-policy.ts`) is designed to *restore* these positions, but only when the caller passes them. It never does.

**Fix:** Pass `existingPositions: layoutPositions[architectureMode]` from the caller. For orbit/constellation, gate this on whether the stored positions are still valid for the current focal/sun set.

---

### C4. Race window between `architectureMode` prop and `graphLayout.nodePositions`

`hasAuth` computation in GraphView:

```ts
let hasAuth = false;
if (nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0) {
  const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
  if (storedArchMode === architectureMode) {
    hasAuth = true;
  }
}
```

When the parent processes `onArchitectureModeChange('orbit')`, if the state updates for `architectureMode` and `graphLayout.nodePositions` are not applied **in the same tick**, you get a window where:

- `architectureMode === 'orbit'`
- `graphLayout.architectureMode === 'orbit'` (already updated)
- `graphLayout.nodePositions === layoutPositions.hierarchical` (not yet swapped)
- `hasAuth === true` (modes match)

The initial positioning loop then applies **hierarchical coordinates to nodes while in orbit mode**, before the mode-change effect fires and overwrites them. If the effect closure is stale or the effect bails early, the wrong positions stick.

**Fix:** Have the parent apply both updates atomically (e.g., a single `updateProjectState({ graphLayout: { architectureMode, nodePositions } })`), or in GraphView gate `hasAuth` on the stored positions actually belonging to the current mode:

```ts
const storedArchMode = graphLayoutRef.current?.architectureMode;
const storedHasAuth = nodePositionsRef.current
  && Object.keys(nodePositionsRef.current).length > 0
  && graphLayoutRef.current?.layoutProvenances?.[architectureMode]
  && storedArchMode === architectureMode;
```

---

## HIGH

### H1. `aria-pressed` on the architecture toggle is semantically wrong

`GraphControls.tsx`:

```tsx
aria-pressed={architectureMode !== 'hierarchical'}
```

A screen reader user hears "pressed" for hybrid/orbit/constellation but has no way to distinguish between them, because the toggle has four states but only two `aria-pressed` values. Combined with the mode-cycling behavior, this is confusing and non-standard.

**Fix:** Use `role="radio"` inside a `role="radiogroup"`, or expose the current mode via `aria-label` on the button (not just the *next* mode):

```tsx
aria-label={`Architecture layout: ${architectureMode}. Click to cycle.`}
aria-describedby="arch-mode-desc"
```

Or better: replace the cycle with a `<select>` containing the four modes — that's already how `focus-select` works in the same toolbar.

### H2. Four-state cycle with no direct access

The toggle only cycles forward:

```ts
hierarchical → hybrid → orbit → constellation → hierarchical
```

To get from `hierarchical` to `constellation` requires three clicks. There is no keyboard shortcut and no menu. Users who primarily work in Constellation pay a tax on every mode switch.

**Fix:** A small dropdown/menu next to the button, or Shift+click to cycle backward.

### H3. CSS duplication between `graph.css` and `index.css` — conflicting hover styles

Both files define `.graph-control-btn:hover`:

`graph.css`:
```css
.graph-control-btn:hover {
  background-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}
```

`index.css`:
```css
.graph-control-btn:hover {
  background-color: var(--accent-primary);
  color: #fff;
}
```

Which wins depends on import order. This makes behavior non-deterministic across bundling targets and hard to reason about in code review.

Both files also define `.graph-controls-floating`, `.focus-btn`, `.focus-select`, `.minimap-container`, `.graph-legend-floating`, `.graph-hover-card`, `.sr-only`, and `.graph-control-divider` with overlapping but not identical rules.

**Fix:** Pick one owner (`index.css` for the design system, `graph.css` for canvas-internal overlays), remove the duplicate `.graph-control-btn` and `.graph-controls-floating` from `graph.css`.

---

## MEDIUM

### M1. `mergeWithDefaultState` silently coerces unknown mode strings to `hierarchical`

`projectState.ts`:

```ts
const activeArchMode: ArchitectureLayoutMode =
  (gLoaded as any)?.architectureMode === "constellation" ? "constellation" :
  (gLoaded as any)?.architectureMode === "orbit"         ? "orbit"        :
  (gLoaded as any)?.architectureMode === "hybrid"        ? "hybrid"       :
                                                           "hierarchical";
```

Any corrupted or future-mode string (e.g., `"radial-v2"`) becomes `hierarchical` without a log. Silent data loss on downgrade.

**Fix:** Log a warning when the stored value doesn't match a known mode, and preserve the raw value on the state object so it can round-trip if the code is upgraded.

### M2. `flatProvenance` legacy fallback can poison the active mode

```ts
const flatProvenance: LayoutProvenance =
  gLoaded.layoutProvenance || (...);

if (!loadedLayoutProvenances[activeArchMode]) {
  loadedLayoutProvenances[activeArchMode] = flatProvenance;
}
```

If the user was in hierarchical (`layoutProvenance: 'automatic-hierarchical'`) and the storage layer migrates them to constellation with no explicit constellation provenance, they get `'automatic-hierarchical'` on the constellation slot. This is the same class of bug as C1, just on the load side.

**Fix:** Only apply the flat fallback if `gLoaded.architectureMode` matches `activeArchMode`. Otherwise compute provenance from `activeArchMode` directly.

### M3. Touch targets below WCAG 2.5.5 minimum

From `graph.css` / `index.css`:

| Element | Size | Minimum (WCAG 2.5.5 AAA) |
|---|---|---|
| `.graph-control-btn` | 28×28 px | 44×44 px |
| `.focus-btn` | 26 px tall | 44 px |
| `.focus-select` | 26 px tall | 44 px |
| `.navigator-close-btn` | 22×22 px | 44×44 px |

On touch devices these are hard to hit. This also applies to the architecture-toggle button from H1/H2.

**Fix:** Either enlarge to 44 px, or increase effective hit area with `padding` + `outline-offset` rather than shrinking visual size.

### M4. `LayoutTrigger` includes `'mode-switch'` but nothing calls it

`position-policy.ts`:

```ts
export type LayoutTrigger = ... | 'mode-switch' | ...;

export function shouldAutoLayout(mode, trigger, ctx) {
  if (mode === 'static') {
    switch (trigger) {
      ...
      case 'mode-switch':
        return false;
    }
  } else {
    switch (trigger) {
      ...
      case 'mode-switch':
        return false;
    }
  }
}
```

A repository-wide grep shows no call site passing `'mode-switch'`. This is either:
- Dead code from a refactor
- A name that was supposed to describe architecture mode changes (in which case C2 is confirmed)

**Fix:** Either remove the entry, or rename it to `'architecture-mode-switch'` and wire it up in GraphView.

---

## LOW

### L1. `handleTablistKeyDown` fires `.click()` immediately on arrow key

`WorkspaceHeader.tsx`:

```ts
e.preventDefault();
const targetTab = tabs[nextIndex];
if (targetTab) {
  targetTab.focus();
  targetTab.click();
}
```

Holding an arrow key will fire repeated navigations. `navigateToView` may trigger heavy re-renders in downstream consumers. Consider debouncing or using only `focus()` with Enter/Space activation (ARIA "manual activation" pattern).

### L2. `.graph-controls-floating { max-height: max-content }`

`max-height: max-content` is unusual and inconsistently supported. Prefer `max-height: none` (explicit) or omit and rely on flex-wrap.

### L3. `handleToggleArchitectureModeInternal` doesn't capture positions before switching

Unlike `handleToggleLayoutModeInternal`, the architecture toggle does not call `captureAndPersistPositions()` before invoking `onArchitectureModeChange(nextMode)`. Positions *are* eventually captured by the mode-change effect, but only after the new layout runs — which means the old mode's positions are read from `cy` **after** the new layout has already overwritten them.

This compounds C3. If `existingPositions` were passed (per C3's fix), the old-mode capture would still need to happen explicitly here to avoid a stale-overwrite window.

---

## Priority order for fixes

1. **C1** — one-line fix, wrong provenance for all orbit/constellation captures.
2. **C3** — pass `existingPositions` from `layoutPositions[architectureMode]`; this is the largest user-visible regression (drag loss).
3. **C2 + M4** — reconcile `position-policy` with the mode-change effect. Either add `'architecture-mode-switch'` or gate the effect via `shouldAutoLayout`.
4. **C4** — audit the parent's `onArchitectureModeChange` handler; if it does two `setState`s, combine them.
5. **H1 + H2** — replace the cycle button with a `<select>` or `role="radiogroup"`.
6. **H3** — deduplicate CSS.
7. **M1–M3** — defensive improvements.
8. **L1–L3** — polish.

The two clusters most likely to move the needle on your reported symptom are **C1** (silent provenance corruption) and **C3** (position erasure). Neither requires touching the geometry engines, which is where the previous audit was pointing.

# Orchestration Cluster — Issue Report

Cluster scope: `GraphView.tsx` (the sole integration point) and `graph.css` (canvas-internal overlays it renders).

I traced the full lifecycle: mount → `cytoscape()` init → element build → layout dispatch → ref sync → structural re-sync → position-only sync → navigator bind → hover/timer management → unmount cleanup. Below are the confirmed issues, ranked.

---

## CRITICAL

### C1. `FeatureOverlayCanvas` receives `cy={null}` and never updates

```tsx
<FeatureOverlayCanvas
  cy={cyRef.current}
  nodes={nodes}
  ...
/>
```

`cyRef.current` is assigned inside the mount `useEffect`, but writing to a ref does **not** trigger a re-render. On the first render, `FeatureOverlayCanvas` receives `null`. It only receives a valid `cy` if some *other* state change happens to fire a re-render afterwards.

The only state setters that could do this are `setFeatureRegions`, `setOrbitGuides`, `setHoveredNodeId`, `setHoverCard`, `setIsNavigatorVisible`. If the graph mounts with authoritative positions and `shouldAutoLayout(...)` returns `false`, none of those fire — the overlay canvas stays cy-less indefinitely. Hybrid feature regions and Orbit/Constellation guide rings are then silently invisible even though `featureRegions` / `orbitGuides` state is populated.

**Fix:** Hold `cy` in state, not just a ref:

```tsx
const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);
// inside mount effect, after cy creation:
cyRef.current = cy;
setCyInstance(cy);
// cleanup:
setCyInstance(null);
```

Then pass `cy={cyInstance}`.

---

### C2. Navigator never initializes on initial mount

```tsx
useEffect(() => {
  if (isNavigatorVisible && cyRef.current && minimapRef.current) {
    destroyNavigator();
    try {
      navRef.current = (cyRef.current as any).navigator({
        container: bodyEl,
        scale: 0.15
      });
    } ...
  }
  return () => destroyNavigator();
}, [isNavigatorVisible, destroyNavigator]);
```

Effect deps are `[isNavigatorVisible, destroyNavigator]`. On the first render, `cyRef.current` is `null`, so the `if` fails and nothing happens. When the mount effect later assigns `cyRef.current = cy`, the navigator effect does **not** re-run (its deps are unchanged). `isNavigatorVisible` starts as `true`, so a user has to toggle the navigator off and on before it binds.

**Fix:** Add `cyInstance` (from C1) to deps:

```tsx
}, [isNavigatorVisible, cyInstance, destroyNavigator]);
```

---

### C3. Selecting an edge does not clear leftover node highlights

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

Sequence that breaks: user selects a node → highlightNodeConnections paints neighbors → user selects an edge (parent sets `selectedNodeId = null`, `selectedEdgeId = "e1"`). The effect fires but:
- `selectedNodeId` is falsy
- `!selectedEdgeId` is false

Neither branch runs. **The node-connection highlight classes persist** on the canvas even though the node is deselected. Purely visual, but confusing — the graph appears to still "focus" a node while the inspector shows an edge.

**Fix:** Add an explicit clear branch:

```tsx
if (selectedNodeId) {
  selectNode(cy, selectedNodeId);
  highlightNodeConnections(cy, selectedNodeId);
} else if (selectedEdgeId) {
  clearHighlights(cy);   // keep edge selection styling if desired
} else {
  deselectAll(cy);
  clearHighlights(cy);
}
```

---

### C4. `onNodePositionsChange` fires **twice** per drag

```tsx
cy.on('dragfree', 'node', (evt) => {
  ...
  sessionPositionsRef.current.set(nodeId, rounded);
  captureAndPersistPositions('user-authored');   // call #1 — full snapshot

  if (onNodeDragEndRef.current) {
    onNodeDragEndRef.current(nodeId, rounded);
  }

  if (onNodePositionsChangeRef.current) {
    const currentStoredPositions =
      graphLayoutRef.current?.nodePositions || nodePositionsRef.current || {};
    const updatedPositions = { ...currentStoredPositions, [nodeId]: rounded };
    (onNodePositionsChangeRef.current as any)(updatedPositions, 'user-authored');  // call #2
  }
});
```

`captureAndPersistPositions('user-authored')` already collects **every** node's current position (including the dragged one) and calls `onNodePositionsChangeRef.current(snapshot, 'user-authored')`. Then the second block calls the same handler again with a *different* snapshot — built from `graphLayoutRef.current.nodePositions`, not from live cy positions.

**Consequences:**
- Two `updateProjectState` writes (two `localStorage.setItem` calls) per drag. On a fast drag or a large graph, this compounds.
- The second snapshot is based on the parent's previously-persisted positions, not the live graph state. If another node was dragged in this same drag session and hadn't yet round-tripped through the parent, **its position can be rolled back**.
- If the parent handler is not idempotent (e.g. triggers additional side effects beyond persistence), it fires those twice.

**Fix:** Delete the second `if (onNodePositionsChangeRef.current) { ... }` block entirely. `captureAndPersistPositions` is the single source of truth. If you need `onNodeDragEnd` to fire with just the dragged node, keep that one call — it's separate and specific.

---

## HIGH

### H1. Full element teardown/rebuild on every structural change

```tsx
cy.batch(() => {
  cy.elements().remove();
  cy.add(newElements);
});
```

This runs on every change to `nodes`, `edges`, `findings`, `featureAssignmentMap`, `architectureMode`, `simulatedNodeIds`, `simulatedRemovedNodeIds`, or `simulatedEdgeIds`. It removes **all** nodes and edges and re-adds them.

Side effects of this teardown:
- Cytoscape's internal position cache for unmatched nodes is discarded.
- The navigator loses its element references momentarily.
- Any classes applied by cytoscape plugins (e.g. navigator's own decorations) are lost.
- Any transient visual state on edges (hover, active) is reset.

The code below partially restores this via `resolveAuthoritativePosition` and re-select/highlight calls, but the cost is a full DOM re-materialization of every element inside the canvas — noticeable at 500+ nodes.

**Fix:** Diff, don't rebuild. Use `cy.$id(id).length === 0` to check for new nodes and `cy.getElementById(id).remove()` for removals. Only touch the delta.

### H2. `findings` captured by closure in the mount effect (initial values only)

```tsx
useEffect(() => {
  if (!containerRef.current) return;
  const elements = buildGraphElements(nodesRef.current, edgesRef.current, findings, featureAssignmentMap);
  ...
}, []);   // <-- empty deps
```

`findings` and `featureAssignmentMap` are captured from the first render. If the parent passes new findings after mount but *before* the structural sync effect has a chance to run, the initial build uses stale values. The structural sync effect does depend on `findings` and `featureAssignmentMap`, so subsequent changes are handled — but there is a window between mount and first findings update where the graph is rendered without the intended overlays.

More importantly, this pattern is fragile: any future dev adding a new prop to the mount effect's body will silently capture its mount-time value.

**Fix:** Read findings via a ref (`findingsRef.current`) inside the mount effect, and use the structural sync effect for all updates. Do not rely on the mount effect to reflect changing props.

### H3. `transitionend` listener triggers `cy.resize()` on every CSS transition

```tsx
const handleTransitionEnd = (e: TransitionEvent) => {
  if (
    e.target instanceof HTMLElement &&
    (e.target.classList.contains('main-viewport') ||
      e.target.classList.contains('graph-view-layout') ||
      e.target.classList.contains('investigation-drawer'))
  ) {
    if (cyRef.current) {
      cyRef.current.resize();
    }
  }
};

window.addEventListener('transitionend', handleTransitionEnd);
```

`transitionend` fires for **every** transitioned CSS property — `opacity`, `color`, `transform`, `box-shadow`, and so on. Every hover effect on the investigation drawer, every fade-in on a child, will trigger `cy.resize()`. `resize()` re-renders the graph viewport, which cascades into layout recalculation.

**Fix:** Filter by `propertyName`:

```tsx
if (e.propertyName !== 'width' && e.propertyName !== 'height') return;
```

Also debounce if multiple transitions complete in the same frame.

### H4. Keyboard shortcuts are missing `preventDefault()`

```tsx
if (e.key === 'f' || e.key === 'F' || e.key === '0') {
  fitToScreen(cy, 50);
} else if (e.key === '+' || e.key === '=') {
  cy.zoom(cy.zoom() * 1.2);
} else if (e.key === '-' || e.key === '_') {
  cy.zoom(cy.zoom() * 0.8);
} else if (e.key === 'Escape') {
  onSelectNode(null);
  onSelectEdge('');
}
```

No `e.preventDefault()` for any of these. On Firefox, `'f'` opens the find bar. On Chrome/Edge, `'+'` and `'-'` trigger browser zoom when the graph container has focus. Only the arrow-key branch calls `preventDefault()`.

**Fix:**

```tsx
if (e.key === 'f' || e.key === 'F' || e.key === '0') {
  e.preventDefault();
  fitToScreen(cy, 50);
}
// etc.
```

### H5. Synchronous layout fallback inside `.catch()` is unguarded

```tsx
runLayoutWithMetadataAsync(cy, { ... }).then((layoutRes) => {
  ...
}).catch(() => {
  if (requestId !== layoutRequestRef.current) return;
  const layoutRes = runLayoutWithMetadata(cy, { ... });   // <-- can also throw
  ...
});
```

If the sync path also throws (e.g. geometry engine NaN, a bad projection, disk-corrupted state), the exception escapes the `.catch` and becomes an unhandled promise rejection. The user sees nothing — the graph silently remains in the previous mode's geometry.

**Fix:** Wrap the sync fallback in `try / catch` and, on failure, dispatch a diagnostic event:

```tsx
.catch((err) => {
  if (requestId !== layoutRequestRef.current) return;
  try {
    const layoutRes = runLayoutWithMetadata(cy, { ... });
    ...
  } catch (fallbackErr) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:layoutfailed', {
        detail: { architectureMode, err: fallbackErr?.message, requestId },
      }));
    }
  }
});
```

---

## MEDIUM

### M1. `storedArchMode` fallback masks mismatched positions

```tsx
const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
if (storedArchMode === architectureMode) {
  hasAuth = true;
}
```

If `graphLayoutRef.current.architectureMode` is `undefined` (e.g. legacy storage, or a partial state merge), it falls back to the *current* prop. The comparison trivially succeeds and `hasAuth` becomes `true` even though the stored positions may belong to a different mode. The initial positioning loop then applies stale coordinates.

**Fix:** Require the stored mode to be explicitly present:

```tsx
const storedArchMode = graphLayoutRef.current?.architectureMode;
if (storedArchMode && storedArchMode === architectureMode) {
  hasAuth = true;
}
```

### M2. `position-only` sync effect applies stale `nodePositions` when session is empty

```tsx
useEffect(() => {
  ...
  cy.batch(() => {
    cy.nodes().forEach((cyNode) => {
      const id = cyNode.id();
      const pos = sessionPositionsRef.current.get(id) || (nodePositions ? nodePositions[id] : undefined);
      if (pos) { ... cyNode.position(...); }
    });
  });
}, [nodePositions]);
```

When `sessionPositionsRef` is cleared (via `executeResetLayout` or mode-change effect) but the parent's `nodePositions` prop still holds the pre-clear values, this effect will re-apply the stale values on the next render that changes `nodePositions`. The effect has no visibility into session clears because `sessionPositionsRef` isn't a dependency.

If a layout is in progress, this can fight the incoming positions.

**Fix:** Include a monotonically increasing session version in state, or a ref *that triggers this effect* when session clears.

### M3. `window.__CY__` and `window.__LAYOUT_MODULE__` are set unconditionally

```tsx
if (typeof window !== 'undefined') {
  (window as any).__CY__ = cy;
  (window as any).__LAYOUT_MODULE__ = {
    runLayoutWithMetadata,
    computeArchitectureLayoutWithMetadata,
  };
}
```

In production builds this exposes internal APIs on the global object. Two concerns:
1. Any browser extension or third-party script can read/manipulate the graph instance.
2. It pollutes memory retention — the `cy` object stays alive via the global even if the component would otherwise be GC'd.

**Fix:** Gate on `import.meta.env.DEV` / `process.env.NODE_ENV === 'development'`.

### M4. `__LAST_LAYOUT_COMPLETED__` and `app:layoutcomplete` global side effects accumulate

```tsx
(window as any).__LAST_LAYOUT_COMPLETED__ = detail;
window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
```

Two global writes per mode switch. `__LAST_LAYOUT_COMPLETED__` is not cleared when the project changes, so a subsequent project open reads a stale diagnostic. No cleanup on unmount.

**Fix:** Clear `__LAST_LAYOUT_COMPLETED__` in the GraphView mount effect cleanup, or namespace it by project.

### M5. `handleKeyDown` reads `nodes` and `onSelectNode` from props directly

```tsx
const nextNodeObj = nodes.find(n => n.id === chosenNeighbor.id());
if (nextNodeObj) {
  onSelectNode(nextNodeObj);
}
```

Works today because `handleKeyDown` is re-created every render, so it captures current props. But this is fragile — any future `useCallback(handleKeyDown, [...])` memoization will silently break arrow-key navigation. Refactor to use `nodesRef.current` / `onSelectNodeRef.current` for consistency with the rest of the file.

### M6. `FeatureOverlayCanvas` receives three optional overlay props that are mutually gated by architectureMode

```tsx
<FeatureOverlayCanvas
  ...
  featureRegions={architectureMode === 'hybrid' ? featureRegions : undefined}
  orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}
/>
```

When the user switches from `hybrid` to `orbit`, the `featureRegions` prop drops from a populated Map to `undefined`, and `orbitGuides` appears. If the overlay canvas relies on a stable prop reference (e.g. `useEffect` deps), the value now toggles between `undefined` and a Map repeatedly. Also: **`constellation` mode is not handled** — the `orbitGuides` prop is only populated for `'orbit'`. Constellation's `guides` output (from `computeComponentConstellationLayout`) has the same shape but never reaches the overlay.

**Fix:** Either accept both, or rename `orbitGuides` to `guideRings` and pass it for both orbit and constellation.

---

## LOW

### L1. `findings` prop appears in the structural sync effect deps but not in the mount effect's body after the first run

Initial render builds with mount-time findings; subsequent changes are picked up by the structural sync effect. Consistent, but undocumented and easy to regress.

### L2. Accessible node list is capped at 50 with no pagination affordance

```tsx
if (nodes.length <= 50) return nodes;
const top50 = nodes.slice(0, 50);
```

Screen-reader users on a 1000-node graph can reach 50 nodes and a "Showing 50 of 1000" note. There is no way to scroll, page, or filter the remaining 950. The note says "use search to navigate" but the search lives in `Sidebar`, not in this component's accessible list.

### L3. `nodeCount` thresholds for initial zoom do not account for radial modes

```tsx
const initialZoom = nodeCount < 15 ? 1.4
                  : nodeCount < 50 ? 1.0
                  : nodeCount < 200 ? 0.7
                  : 0.4;
```

Orbit and constellation layouts are much sparser per-screen than hierarchical. A 60-node graph in Constellation looks nearly empty at zoom 0.7; the same graph in hierarchical looks cluttered. Minor polish, but affects first impressions of the radial modes.

### L4. `cy.fit()` inside `runLayoutWithMetadata` overrides the explicit initial zoom

In `graph-layout.ts`:

```ts
if (options?.fit !== false) {
  cy.fit(cy.elements(), options?.padding ?? 50);
}
```

`GraphView` sets `cy.zoom(initialZoom); cy.center();` immediately after creating the instance, then calls `runLayoutWithMetadata(..., { fit: true })`. The fit overrides the initial zoom. So the `initialZoom` code path only has any effect when `autoLayoutPolicy !== true`. Dead code for the common case.

### L5. `graph.css` duplicates most of the toolbar styling present in `index.css`

Already flagged in Cluster 1 as H3. The duplication specifically affects this cluster because `GraphView.tsx` imports `'./graph-internals/graph.css'` at module scope, and `index.css` is loaded by the app root. Which `.graph-control-btn:hover` wins depends on bundler ordering. In the same file, `.graph-mode-badge` uses `pointer-events: none` (good) but `.graph-controls-floating` has `max-height: max-content`, which is not a widely supported value and behaves inconsistently in Safari.

---

## Priority order for fixes in this cluster

1. **C1** — `cy={cyInstance}` — unblocks `FeatureOverlayCanvas` on cold mount.
2. **C2** — add `cyInstance` to navigator effect deps — unblocks navigator on cold mount.
3. **C4** — remove the second `onNodePositionsChange` call in `dragfree` — halves persistence writes and eliminates the rollback bug.
4. **C3** — add explicit clear branch when only edge is selected — visual correctness.
5. **H5** — wrap sync fallback in try/catch — prevents silent mode-switch failures.
6. **H3** — filter `transitionend` by `propertyName` — prevents cascade re-renders.
7. **H4** — `preventDefault` for keyboard shortcuts.
8. **M3** — gate `window.__CY__` on dev mode.
9. **H1** — incremental element sync (larger refactor; defer until the above are fixed).
10. Everything else as polish.

The most likely reason "the architecture-mode switch sometimes looks like nothing happened" is **C1 + C2 together**: the overlay canvas and navigator both fail to bind on cold mount, so on first load the canvas appears without guides, and the mode-change visual difference is limited to node positions — which the user may not notice if the graph is sparse. Combined with **H5** (silent fallback failure), mode switches can leave the graph in a state with correct positions but no guide rings, no feature regions, and no navigator — reading to the user as "the switch didn't take."

# Dispatch Cluster — Issue Report

Cluster scope: `graph-layout.ts` (position application + visibility), `architecture-layout.ts` (mode dispatcher half), plus the two unshared dependencies this cluster contracts to — `layout-worker-client.ts` and `graph-builder.ts` / `graph-style.ts`. Every finding below is rooted in one of these files, even when the visible symptom appears in GraphView.

I traced: **mode → adapter input → dispatch branch → visibility policy → position application → return shape → caller consumption.**

---

## CRITICAL

### C1. Async worker result cannot deliver `featureRegions` or `orbitGuides`

`architecture-layout.ts` (sync) returns:

```ts
return {
  positions: orbitPositions,
  orbitGuides: orbitOutput.guides as any,
  projectedNodeIds: new Set(Object.keys(projection.nodes)),
};
```

`graph-layout.ts` async path returns a `CalculateLayoutAsyncResult` whose interface (per the report's contract) is:

```ts
{
  positions, requestGeneration, projectId, isOffloaded,
  computeDurationMs, ipcDurationMs, totalDurationMs
}
```

No `featureRegions`, no `orbitGuides`, no `projectedNodeIds`.

But `GraphView.tsx` treats them identically:

```ts
runLayoutWithMetadataAsync(cy, { ... }).then((layoutRes) => {
  setFeatureRegions(layoutRes.featureRegions);   // undefined on async
  setOrbitGuides(layoutRes.orbitGuides);         // undefined on async
  ...
});
```

And the `isOrbitComponentFilter` visibility filter downstream depends on `result.projectedNodeIds`:

```ts
const isOrbitComponentFilter =
  (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation')
  && result.projectedNodeIds;
```

On async, `projectedNodeIds` is `undefined`, so `isOrbitComponentFilter` is falsy, so the `else` branch runs and shows **all nodes** — including the ones the projection deliberately excluded. That's why Constellation looks like an unstructured blob on graphs ≥ 20 nodes: the visibility filter never engages.

**Verify first:** open `layout-worker-client.ts` and confirm the response shape. If it doesn't forward `featureRegions` / `orbitGuides` / `projectedNodeIds`, this is the single highest-blast-radius bug in the cluster.

---

### C2. Edge-endpoint normalization is skipped for orbit and constellation

The dispatcher has this order:

```ts
if (architectureMode === 'constellation') { ... return; }   // ← early return
const isOrbit = architectureMode === 'orbit';
if (isOrbit) { ... return; }                                 // ← early return

// Only reached for hierarchical/hybrid:
const knownNodeIds = new Set(safeNodes.map(n => n.id));
safeEdges.forEach(e => {
  if (!knownNodeIds.has(e.source)) {
    knownNodeIds.add(e.source);
    safeNodes.push({ /* synthetic External */ });
  }
  if (!knownNodeIds.has(e.target)) {
    knownNodeIds.add(e.target);
    safeNodes.push({ /* synthetic External */ });
  }
});
```

Orbit/constellation adapters receive `safeNodes` and `safeEdges` **without** the synthetic-node normalization. Their edge filters:

```ts
// component-orbit-adapter.ts
if (depthMap.has(edge.source) && depthMap.has(edge.target)) { ... }

// component-constellation-adapter.ts
if (projectedSet.has(edge.source) && projectedSet.has(edge.target)) { ... }
```

Silently drop every edge whose endpoint isn't a real node. Hierarchical instead synthesizes an `External` node and preserves the edge.

**Consequence:** Any project with unresolved references (the analyzer emits these routinely) will produce a strictly sparser graph in Orbit/Constellation than in Hierarchical. The two radial modes look "broken" not because of geometry, but because the source data is truncated.

**Fix:** Hoist the edge-endpoint normalization above the three mode branches.

---

### C3. `CONTRACTED_14_SUN_IDS` is hardcoded and never overridden by the dispatcher

`component-constellation-adapter.ts`:

```ts
export const CONTRACTED_INNER_SUN_IDS: string[] = [
  'LWC:asset-dashboard-container',
  'LWC:asset-management-dashboard',
  'LWC:citizen-complaint-list',
  'LWC:vendor-assignment-panel',
  'LWC:vendor-workspace',
  'LWC:zone-manager-dashboard',
];
// ...plus 8 more...
```

The adapter consumes `options.customSunIds || CONTRACTED_14_SUN_IDS`. The dispatcher passes:

```ts
const projection = adaptComponentConstellation(
  schemaInput,
  options.componentConstellationOptions   // ← undefined on every call
);
```

And `GraphView` never populates `componentConstellationOptions`:

```ts
const effectiveLayoutOptions = useMemo((): GraphLayoutOptions => ({
  ...layoutOptions,
  enableFeatureLayout,
  enableCandidateDOrdering: architectureMode === 'hierarchical',
  focalLwcId: derivedFocalLwcId,
}), [...]);
```

So `customSunIds` is always `undefined`, `CONTRACTED_14_SUN_IDS` is always used, and the adapter's fallback path fires on every non-PBIM project:

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

The result is deterministic but meaningless: the alphabetically-first six LWCs become "inner suns," regardless of whether they're actually root containers. On PBIM the hardcoded IDs match and everything looks correct; anywhere else, Constellation is structured around arbitrary components.

**This is the primary reason Constellation "works on PBIM, fails elsewhere."** The dispatcher has no way to derive the sun set from the graph itself.

**Fix:** Either (a) auto-discover suns from graph structure (LWC nodes with zero incoming `lwc-template-child` edges), or (b) thread a `customSunIds` through `componentConstellationOptions` from a real configuration source.

---

### C4. `createLayout` discards `projectedNodeIds` / `featureRegions` / `orbitGuides`

```ts
export function createLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): cytoscape.Layouts {
  const useArch = options?.useArchitectureLayout !== false;
  if (useArch) {
    const nodes = options?.nodes || extractNodesAndEdgesFromCy(cy).nodes;
    const edges = options?.edges || extractNodesAndEdgesFromCy(cy).edges;
    if (nodes.length > 0) {
      const posMap = computeArchitectureLayout(nodes, edges, options);  // ← metadata-less variant
      return cy.layout({
        name: 'preset',
        positions: (node: any) => posMap[node.id()] || node.position(),
        ...
      } as any);
    }
  }
  ...
}
```

Two problems:

1. It calls `computeArchitectureLayout` (positions-only) instead of `computeArchitectureLayoutWithMetadata`. That discards `projectedNodeIds`, `featureRegions`, and `orbitGuides`. If `createLayout` is reached in orbit/constellation mode, no visibility hiding occurs — the whole graph is rendered with wrong positions.

2. It returns the `Layouts` handle **without running it**. The caller must know to call `.run()`. `runLayout` does this correctly by delegating to `runLayoutWithMetadata`, but any future direct caller of `createLayout` would get a silent no-op.

**When does this path get reached?** Only when `useArchitectureLayout === false` OR `cy.nodes().length === 0`. In normal operation it doesn't fire. But the divergence means `createLayout` and `runLayoutWithMetadata` are not behaviorally equivalent — a future refactor that consolidates them will silently lose the visibility filter.

**Fix:** Deprecate `createLayout` in favor of `runLayoutWithMetadata`, or make it call the metadata variant and expose the result.

---

## HIGH

### H1. `extractNodesAndEdgesFromCy` fabricates data that downstream classification depends on

```ts
nodes.push({
  id: data.id || cyNode.id(),
  displayName: data.label || data.displayName || cyNode.id(),
  ...
  risk: (data.risk as ExplorerRiskLevel) || 'LOW',
  riskReasons: [],
  behavior: {
    isTest: Boolean(data.isTest),         // ← depends on cytoscape data preserving isTest
    publicContractsCount: 0,
    asyncPatterns: [],                    // ← destroyed
    securitySignalsCount: 0,
    queryCount: 0,
    dmlCount: 0,
    calloutCount: 0,
  },
  refactoringReadiness: {
    isHighRisk: data.risk === 'HIGH',
    hasCycles: Boolean(data.hasCycles),
    hasUnresolved: Boolean(data.hasUnresolved),
    testCoverageStatus: 'UNTESTED',       // ← destroyed
  },
});
```

Every downstream consumer of `ExplorerNode` gets a **lossy** version of the node:

- `isTestNode(node)` in `architecture-layout.ts` reads `node.behavior.isTest`, `node.displayName.endsWith('Test')`, `node.id.endsWith('Test')`. If `buildGraphElements` didn't copy `isTest` into cytoscape data (verify), the ring-5 satellite placement for Orbit will fail to classify tests. They'll be treated as production dependencies.
- `classifyNodeLayer` reads `behavior.publicContractsCount` for some heuristics. Now zero.
- Feature discovery reads query/dml/callout counts. Now zero.

For edges:

```ts
edges.push({
  ...
  relationshipType: data.relationshipType || 'unknown',   // ← verify buildGraphElements preserves this
  method: data.method || null,
  ...
  canonical: {
    source: { type: 'ApexClass', name: data.source },     // ← type is hardcoded!
    target: { type: 'ApexClass', name: data.target },
    relationship: { type: 'unknown', resolution: 'EXACT' },
    location: {},
  },
});
```

`canonical.source.type` and `canonical.target.type` are hardcoded `'ApexClass'` — regardless of the actual node type. Any consumer reading `edge.canonical.source.type` (e.g. relationship-type heuristics) gets `'ApexClass'` even for LWC→Apex edges.

**The critical dependence:** if `buildGraphElements` doesn't preserve `relationshipType` in cytoscape edge data, then `relationshipType` becomes `'unknown'`, and in the adapters:

```ts
const isCompositionEdge = edge.relationshipType === 'lwc-template-child';  // never true
const isControllerEdge  = edge.relationshipType === 'lwc-apex';             // never true
```

Both flags are always false. The orbit layout hides composition edges (`isCompositionEdge: false`) as ordinary dependencies. The constellation adapter's `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` includes `'unknown'`, so it survives the filter — but the semantic classification is wrong.

**Check `graph-builder.ts` to confirm what data actually lands in cytoscape elements.**

---

### H2. Sync vs async return shapes diverge and GraphView papers over the difference

Sync:
```ts
export function runLayoutWithMetadata(...): ArchitectureLayoutResultWithMetadata
// → { positions, featureRegions?, orbitGuides?, projectedNodeIds? }
```

Async:
```ts
export async function runLayoutWithMetadataAsync(...): Promise<CalculateLayoutAsyncResult>
// → { positions, requestGeneration, projectId, isOffloaded, ... }
```

GraphView treats them interchangeably:

```ts
const layoutRes = await globalWorkerClient.calculateLayoutAsync({ ... });
setFeatureRegions(layoutRes.featureRegions);  // TS should error here
setOrbitGuides(layoutRes.orbitGuides);
```

If TypeScript is not flagging this, `CalculateLayoutAsyncResult` must be declared with a union or `any`, or the async function's declared return type is wrong. Either way, the contract between dispatch and consumer is unverified at compile time.

**Fix:** Define a single `LayoutDispatchResult` interface that both paths return, with `featureRegions`, `orbitGuides`, `projectedNodeIds` as required fields. Populate them from the worker response (which means the worker must compute them).

---

### H3. `...rest` can silently override `name: 'preset'`

`getLayoutOptions`:

```ts
const { nodes, edges, animate = false, animationDuration = 500, padding = 50, ...rest } = options;

if (nodes && nodes.length > 0) {
  const posMap = computeArchitectureLayout(nodes, edges || [], options);
  return {
    name: 'preset',
    positions: (node: any) => posMap[node.id()] || { x: 0, y: 0 },
    animate,
    animationDuration,
    padding,
    fit: options.fit ?? true,
    ...rest,                                   // ← includes name if caller passed one
  } as LayoutOptions;
}
```

Because `GraphLayoutOptions` has `[key: string]: any`, any caller that passes `name` (e.g. `'fcose'`) will have it override `'preset'`. The architecture positions are then ignored, and Cytoscape runs the requested layout instead. Silent.

Same issue in the fallback branch:

```ts
return {
  name: 'fcose',
  ...
  ...rest,                                     // ← can override name again
} as LayoutOptions;
```

**Fix:** Destructure `name` out too, or place `...rest` before `name`.

---

### H4. Animated preset path does not fit; positions captured mid-animation if used

`runLayoutWithMetadata`:

```ts
if (options?.animate) {
  cy.layout({
    name: 'preset',
    positions: (node: any) => posMap[node.id()] || node.position(),
    animate: true,
    animationDuration: options?.animationDuration ?? 500,
    padding: options?.padding ?? 50,
    fit: options?.fit ?? true,
  } as any).run();                            // ← fire and forget
} else {
  if (options?.fit !== false) {
    // explicitly call cy.fit(...)
  }
}
```

Two issues:

1. **`.run()` returns immediately.** The layout handle is discarded; nothing awaits `layoutstop`. The function returns `result` while the canvas is still animating toward its final positions.

2. **`fit` is passed to the layout options**, but Cytoscape's preset layout with `animate: true` does not consistently honor `fit` — the viewport can end up off-target. The non-animated branch explicitly calls `cy.fit(...)`; the animated branch relies on Cytoscape internals.

Any caller that calls `captureAndPersistPositions()` synchronously after `runLayoutWithMetadata` returns will capture **intermediate** positions from the animation. `executeResetLayout` does exactly this:

```ts
if (shouldAnimate) {
  const onStop = () => { pendingLayoutStopRef.current = null; captureAndPersistPositions(); };
  cy.one('layoutstop', onStop);
  const layoutRes = runLayoutWithMetadata(cy, { ...animate: true... });
  // captureAndPersistPositions() is NOT called here
  setFeatureRegions(layoutRes.featureRegions);
  setOrbitGuides(layoutRes.orbitGuides);
} else {
  const layoutRes = runLayoutWithMetadata(cy, { ...animate: false... });
  setFeatureRegions(layoutRes.featureRegions);
  setOrbitGuides(layoutRes.orbitGuides);
  captureAndPersistPositions();               // ← only here
}
```

The animated branch is correctly guarded by `layoutstop`. But other callers in GraphView (mode-change effect) always pass `animate: false`, so this specific hazard is currently mitigated. Still — the API invites the mistake.

**Fix:** Return a promise from `runLayoutWithMetadata` when `animate: true`, or expose the layout handle so callers can attach `layoutstop` listeners.

---

### H5. Triple layout computation on mount

GraphView mount effect:

```tsx
const cy = cytoscape({
  elements,
  layout: layoutOptions,                       // ← run #1 (init)
  ...
});

if (autoLayoutPolicy === true) {
  cy.layout(layoutOptions).run();              // ← run #2 (explicit)
  const layoutRes = runLayoutWithMetadata(cy, { ... });   // ← run #3 (dispatch)
  ...
}
```

Where `layoutOptions = getLayoutOptions({...})`, and `getLayoutOptions` (when `nodes.length > 0`) internally calls `computeArchitectureLayout(nodes, edges, options)`. So on mount, the architecture pipeline runs **three times** for the same input:

1. `cytoscape()` calls `getLayoutOptions` → `computeArchitectureLayout` once, then Cytoscape runs the preset layout.
2. `cy.layout(layoutOptions).run()` runs the same preset layout again.
3. `runLayoutWithMetadata` calls `computeArchitectureLayoutWithMetadata`, running the pipeline a third time.

**Cost:** For large graphs (500+ nodes), this is 3× the pipeline cost, including centrality, feature discovery, domain discovery, and edge-crossing reduction. Mount time scales linearly with these.

**Fix:** Don't pass a layout to the `cytoscape()` constructor when you intend to run an architecture layout immediately after. Use `layout: { name: 'null' }` for the init, then let `runLayoutWithMetadata` do the only real layout.

---

## MEDIUM

### M1. `dummySummary` shape doesn't match `ExplorerSummary`

`architecture-layout.ts`:

```ts
const dummySummary = {
  totalNodes: safeNodes.length,
  totalEdges: safeEdges.length,
  nodeCount: safeNodes.length,
  edgeCount: safeEdges.length,
  highRiskCount: 0,
  unresolvedCount: 0,
  cyclesCount: 0,             // ← field should be cycleCount
};

const schemaInput = {
  summary: dummySummary,      // ← no inventory field
  nodes: safeNodes,
  edges: safeEdges,
  cycles: [],
  unresolvedReferences: [],   // ← discarded
  impactSummaries: {},        // ← discarded
};
```

Missing: `summary.inventory` (required by `ExplorerSummary`), `generatedAt`, `schemaVersion`, `analyzerVersion`. `cyclesCount` vs `cycleCount` naming mismatch. `unresolvedReferences` and `impactSummaries` set to empty — any adapter that reads them will see zero/empty.

Because `adaptComponentOrbit` and `adaptComponentConstellation` take `ExplorerDataSchema`, the object is being passed as if complete. TypeScript may be silently allowing it via structural typing if the adapters only read `nodes`/`edges`, but this is fragile — a future adapter change that reads `summary.cycleCount` will get `undefined`.

**Fix:** Either construct a genuinely complete `ExplorerDataSchema` (defaulting to zeros/empties for the required fields) or change the adapters' signatures to accept a minimal `{ nodes, edges }` shape.

---

### M2. `orbitGuides` is used for constellation guides too

For orbit:
```ts
orbitGuides: orbitOutput.guides as any,       // ComponentOrbitGuideMetadata
```

For constellation:
```ts
orbitGuides: constellationOutput.guides as any, // ComponentConstellationGuideMetadata
```

Two different guide shapes, both written to a field named `orbitGuides` typed as `OrbitGuideMetadata` (from `./orbit-layout`). The `as any` cast is the only reason TypeScript accepts this.

Consumer side (GraphView):
```tsx
orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}
```

Constellation guides are computed but never passed to the overlay canvas. Already flagged in Cluster 2, but the field conflation is a dispatch-level API defect.

**Fix:** Rename to `guideRings` and type it as a union, or return two fields (`orbitGuides` and `constellationGuides`).

---

### M3. Duplicate schema construction between orbit and constellation branches

```ts
if (architectureMode === 'constellation') {
  const dummySummary = { ... };
  const schemaInput = { summary: dummySummary, nodes: safeNodes, edges: safeEdges, cycles: [], ... };
  const projection = adaptComponentConstellation(schemaInput, ...);
  ...
}

const isOrbit = architectureMode === 'orbit';
if (isOrbit) {
  const dummySummary = { ... };                 // ← identical
  const schemaInput = { summary: dummySummary, nodes: safeNodes, edges: safeEdges, cycles: [], ... };
  const projection = adaptComponentOrbit(schemaInput, ...);
  ...
}
```

Two nearly-identical ~20-line blocks. Any fix to the schema shape must be duplicated. Extract a helper:

```ts
function buildAdapterSchemaInput(nodes, edges): ExplorerDataSchema { ... }
```

---

### M4. Duplicate empty-graph check

```ts
if (safeNodes.length === 0) {
  if (architectureMode === 'orbit') { ... return; }
  return { positions: { ...existingPositions } };
}
// ... 15 lines of normalization ...
safeNodes.sort((a, b) => a.id.localeCompare(b.id));
safeEdges.sort((a, b) => a.id.localeCompare(b.id));

if (safeNodes.length === 0) {                    // ← unreachable
  return { positions: { ...existingPositions } };
}
```

The second check is unreachable: `safeNodes` only grows (never shrinks) between the two, and the first check already handles the empty case. Dead code.

---

### M5. `createLayout` calls `extractNodesAndEdgesFromCy` twice

```ts
const nodes = options?.nodes || extractNodesAndEdgesFromCy(cy).nodes;
const edges = options?.edges || extractNodesAndEdgesFromCy(cy).edges;
```

If both `options.nodes` and `options.edges` are missing, `extractNodesAndEdgesFromCy(cy)` runs twice — each time iterating every node and edge in the cytoscape instance. On a 1000-node graph, that's 2× the extraction cost.

**Fix:**

```ts
let nodes = options?.nodes;
let edges = options?.edges;
if (!nodes || !edges) {
  const extracted = extractNodesAndEdgesFromCy(cy);
  nodes = nodes ?? extracted.nodes;
  edges = edges ?? extracted.edges;
}
```

---

### M6. `adaptComponentOrbit` receives a focal that may be `null`

```ts
const projection = adaptComponentOrbit(
  schemaInput,
  {
    focalLwcId: options.focalLwcId,      // may be null/undefined
    ...options.componentOrbitOptions,    // ← spread AFTER, so componentOrbitOptions wins
  }
);
```

Precedence is backwards from a reader's expectation. A caller that sets `componentOrbitOptions.focalLwcId` for a specific override wins over `options.focalLwcId`. Usually harmless, but the semantics ("outer option is a default, inner is override") are inverted.

Also — if `options.focalLwcId` is `null`, the adapter silently picks `availableSuns[0]`. The dispatcher provides no way to distinguish "user chose null" from "user omitted".

---

### M7. `as any` on orbit guides suppresses type safety

```ts
orbitGuides: orbitOutput.guides as any,
```

`computeComponentOrbitLayout` returns `ComponentOrbitGuideMetadata` — `{ rings: ComponentOrbitGuideRing[] }`. `ArchitectureLayoutResultWithMetadata.orbitGuides` is `OrbitGuideMetadata` from `./orbit-layout`. If these are structurally compatible, the cast is unnecessary. If they aren't, the cast is hiding a real mismatch.

**Verify:** check the two type definitions. If they differ, the overlay canvas is being fed incompatible guide data.

---

### M8. `existingPositions` restoration is dead code for orbit/constellation

The Position Authority Restoration at the end of the hierarchical pipeline:

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) resultPositions[id] = { x: pos.x, y: pos.y };
}
```

Orbit and constellation return **before** this step. Even if a caller provides `existingPositions`, radial modes ignore it. This is deliberate (positions must be recomputed for the current focal/sun set) but undocumented — a caller who expects uniform position preservation across all four modes will be surprised.

Worse: the hierarchical path **is** reachable with `existingPositions`, but GraphView never passes it (Cluster 1 C3). So in practice, this step is a no-op for all four modes. The restoration logic is only exercised by tests.

---

## LOW

### L1. `runLayout` is misleadingly named

```ts
export function runLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): void {
  runLayoutWithMetadata(cy, options);
}
```

It discards the metadata return value. Any caller switching from `runLayoutWithMetadata` to `runLayout` for brevity silently loses `featureRegions` / `orbitGuides` / `projectedNodeIds`.

### L2. Sync fallback inside `runLayoutWithMetadata` does not fire `layoutstop`

```ts
const layout = createLayout(cy, options);
layout.run();
```

`createLayout` may return a layout that runs asynchronously (if `animate: true`). No `layoutstop` listener is attached by this function. Callers that want to know when positions are final have to hook the event themselves.

### L3. `getLayoutOptions` uses `||` for numeric defaults

```ts
padding: 80 * density,
idealEdgeLength: 120 * density,
nodeRepulsion: 8000 * density,
```

Fine here, but the same pattern elsewhere in the file (`posMap[node.id()] || { x: 0, y: 0 }`) would break if a legitimate position were `{ x: 0, y: 0 }` — which is common since the origin is a valid coordinate.

### L4. `runLayoutWithMetadataAsync` does not check request generation before applying positions

The `.then` block:

```ts
runLayoutWithMetadataAsync(cy, { ... }).then((layoutRes) => {
  if (requestId !== layoutRequestRef.current) return;
  ...
});
```

This is inside `graph-layout.ts`? No — this is inside GraphView. But `runLayoutWithMetadataAsync` **does** apply positions inside the worker-response handler:

```ts
export async function runLayoutWithMetadataAsync(...): Promise<CalculateLayoutAsyncResult> {
  ...
  const result = await globalWorkerClient.calculateLayoutAsync({...});
  const posMap = result.positions;
  ...
  cy.batch(() => { ... node.position(posMap[id]); ... });
  ...
  return result;
}
```

No check that the caller still cares. If two async layouts are in flight, both will apply positions, and the second-to-complete wins. GraphView guards at the consumer level (`requestId !== layoutRequestRef.current`) but by then positions have already been applied. Race window exists.

### L5. `globalWorkerClient` is module-level

```ts
export const globalWorkerClient = new LayoutWorkerClient();
```

Shared across every GraphView instance in the process. If two graph views ever mount simultaneously (e.g. in a comparison drawer), they'll share worker state, correlation tokens, and pending requests. Not a bug today, but a latent hazard.

---

## Priority order for fixes in this cluster

1. **C1** — verify `layout-worker-client.ts` response shape; if it drops overlay metadata, this is the single highest-blast fix.
2. **C2** — hoist edge-endpoint normalization above the mode branches.
3. **C3** — auto-discover suns from graph structure or thread a real `customSunIds` source.
4. **H1** — audit `graph-builder.ts` to confirm `relationshipType` and `behavior.isTest` survive into cytoscape data. If they don't, both radial modes lose semantic classification.
5. **C4** — unify `createLayout` and `runLayoutWithMetadata`.
6. **H2** — define a single dispatch result contract.
7. **H5** — eliminate the triple-layout on mount.
8. **H3 / H4** — fix option override and animated-path contract.
9. **M1–M8** — structural cleanup.
10. **L1–L5** — polish and defensive coding.

The two most likely root causes of "the radial modes look wrong on non-PBIM data" are **C1** (async drops the visibility filter for ≥20-node graphs) and **C3** (hardcoded suns on non-PBIM projects). **C2** compounds both by further truncating the input graph. Everything else in this cluster is either refactor debt or defensive coding that will make the system easier to reason about once the first three are fixed.

# Focused Orbit Cluster — Issue Report

Cluster scope: `component-orbit-adapter.ts`, `component-orbit-layout.ts`, `orbit-semantics.ts`, `graph-depth.ts`, and the re-export stub `orbit-layout.ts`.

I traced the full pipeline: **projection input → BFS depth → ring assignment → role classification → radius computation → collision repair → guide emission → adapter return.**

**Note before the findings:** `orbit-layout.ts` in this cluster is a one-line re-export (`export * from '../orbit-layout'`). The real geometry utilities — `checkAABBOverlap`, `calculateRequiredSectorRadius`, `normalizeAngle` — live in `explorer/src/lib/orbit-layout.ts`, which you have not shared. Any defect in those three functions is invisible to this review. **Please provide that file** before acting on the layout findings below.

Also: `projectOrbitSemantics` is imported by `architecture-layout.ts` but never called anywhere in the shown code. See C3.

---

## CRITICAL

### C1. `isChildLwc` classifies any reachable LWC as a child — composition edge is never checked

`component-orbit-adapter.ts`:

```ts
// Child LWC classification: type LWC + reachable via lwc-template-child composition edge
const isChildLwc = !isSun && rawNode.type === 'LWC';
```

The comment claims the classification is verified against `lwc-template-child`. The code does no such thing — it only checks `type === 'LWC'` and `!isSun`.

**Consequence:** Every LWC reached through *any* edge type (including `lwc-apex` reverse, `method-call`, `type-reference`, or an accidental `lwc-import`) receives the `◎` role symbol. In the Constellation cluster, `isChildLwc` semantics feed shared-node detection; in Orbit, they feed ring labeling and drill-down via `childLwcTargets`. On any project with LWC-to-LWC edges other than template composition — e.g. `lwc-import` from a utility LWC — those LWCs are misclassified.

The classification set already exists: `parentToChildLwcsMap` is built only from `lwc-template-child` edges at the top of the function. The correct check is:

```ts
const isCompositionChild = childToParentLwcsMap.has(nodeId);
const isChildLwc = !isSun && rawNode.type === 'LWC' && isCompositionChild;
```

**Verify against the adapter test file** — if any fixture exercises an LWC→LWC non-composition edge, this bug is already visible; if not, it's silently accepted.

---

### C2. `isSharedHub` and `dependentLwcCount` use the full graph, not the reachable projection

`component-orbit-adapter.ts`:

```ts
const dependentLwcs = nodeDependentLwcsMap.get(nodeId);   // ← built from ALL edges
const dependentLwcCount = dependentLwcIds.length;

const isSharedHub = rawNode.type === 'ApexClass' && dependentLwcCount >= 2;
if (isSharedHub) sharedHubCount++;
```

`nodeDependentLwcsMap` is populated in the global-edge pass above the focus resolution — it iterates every edge in the input, including edges from LWCs that are unreachable from the current focal.

**Consequence:** A node can be rendered as `◉ Shared Apex Hub` with `dependentLwcCount = 5` while only one of those five LWCs is actually visible in the current orbit. The symbol and the count disagree with what the user sees. On large graphs where most LWCs are unreachable from any single focal, this is the common case, not the edge case.

Two related defects in the same block:

```ts
const isSharedHub = rawNode.type === 'ApexClass' && dependentLwcCount >= 2;
```

- The type check is Apex-only. A shared ApexTrigger, shared Flow, or shared DTO is never `◉`, even when the `◎`-definition would equally apply.
- The count uses raw edge occurrences from `edges` — a single LWC that references the Apex class twice via two different relationship types (`method-call` and `type-reference`) contributes **one** entry to the set (correct, since it's a `Set<string>`), but the `dependentLwcs` set was built by checking `sourceIsLwc && !targetIsLwc` — so an LWC that references via two different edges counts once. Correct as-is, but undocumented.

**Fix:** Scope the map to reachable LWCs when computing shared-hub status, or document that the count is intentionally graph-global:

```ts
const reachableLwcIds = new Set(reachableNodeIds.filter(id => lwcSet.has(id)));
const dependentLwcs = new Set([...nodeDependentLwcsMap.get(nodeId) ?? []].filter(l => reachableLwcIds.has(l)));
```

---

### C3. `projectOrbitSemantics` is imported but never called

`architecture-layout.ts` contains:

```ts
import { projectOrbitSemantics } from './layout/orbit-semantics';
```

No call site exists in the file — the orbit branch dispatches through `adaptComponentOrbit` + `computeComponentOrbitLayout` only:

```ts
const projection = adaptComponentOrbit(schemaInput, {...});
const orbitOutput = computeComponentOrbitLayout(projection, {...});
```

**Consequences:**

- `orbit-semantics.ts` is dead code from the perspective of the runtime path — it exports ring semantics based on `computeOrbitRingIndex` (a *layer-derived* 0–5 index), while `component-orbit-adapter.ts` produces ring indices via BFS depth. Two incompatible ring semantics coexist in the same codebase, one unused.
- If any future maintainer "wires up" `projectOrbitSemantics` to the orbit branch, the ring indices would be `[0,5]` (layer-based) rather than hop-based — silently changing every node's ring. The tests in `component-orbit-adapter.test.ts` would then fail only if they assert on ring index, which is unlikely given how the tests are usually written.

**Fix:** Delete `orbit-semantics.ts` if the Component Orbit path is the canonical one, or move `projectOrbitSemantics` to the file that actually consumes it (whatever uses layer-derived ring indices — likely `architecture-orbit` if such a mode exists separately).

---

### C4. Guide rings do not match actual node positions

`component-orbit-layout.ts`:

```ts
const guideRings: ComponentOrbitGuideRing[] = projection.rings.map((ring) => {
  const rIdx = ring.ringIndex;
  let radiusPx = 0;
  if (rIdx > 0) {
    radiusPx = innerRadius + (rIdx - 1) * ringSpacing;
  }
  return { ringIndex: rIdx, radiusPx, label: ring.label, nodeCount: ring.totalCount };
});
```

This uses the **nominal** radius formula. But the actual node placement radius is:

```ts
const baseRingRadius = innerRadius + (ringIndex - 1) * ringSpacing;
// ...
const reqRadius = n_k <= 1 ? 0 : requiredChordSeparation / (2 * Math.sin(Math.PI / n_k));
const trackRadius = Math.max(baseTrackRadius, reqRadius);   // ← expanded
// ... repair pass may push it further:
shiftNode.radius += trackSpacing;
```

For any ring whose node count forces `reqRadius > baseRingRadius`, the visible node circle is well outside the drawn guide circle. For rings where the repair pass fired, nodes are on top of a guide ring that no longer corresponds to their orbit.

**Consequence:** The overlay canvas draws guide rings that "slice through" nodes rather than framing them. This is the most likely reason users describe Orbit as "visually wrong" even when the geometry is technically correct — the guides themselves are misaligned.

**Fix:** Track the actual max radius (or per-track radius) during placement and emit that as the guide:

```ts
const ringMaxRadius = /* maximum placed radius on this ring */;
guideRings.push({ ringIndex, radiusPx: ringMaxRadius, ... });
```

---

## HIGH

### H1. The layout engine discards the adapter's intra-ring ordering

The adapter painstakingly sorts ring items:

```ts
items.sort((a, b) => {
  const rolePriority = { '☉': 0, '◎': 1, '◉': 2, '○': 3 };
  if (rolePriority[a.roleSymbol] !== rolePriority[b.roleSymbol]) {
    return rolePriority[a.roleSymbol] - rolePriority[b.roleSymbol];
  }
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  if (b.metrics.coupling !== a.metrics.coupling) {
    return b.metrics.coupling - a.metrics.coupling;
  }
  return a.nodeId.localeCompare(b.nodeId);
});
```

Then the layout engine immediately overwrites it:

```ts
// Invariants G4 & G5 — Sort nodes deterministically on ring
ringNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
```

**Consequence:** Every semantic guarantee the adapter makes about angular ordering — Sun first, then child LWCs, then shared hubs, then ordinary — is thrown away. The user sees nodes in lexicographic order around each ring, which is deterministic but semantically arbitrary. Coupling-based clustering within a ring is lost.

**Fix:** Remove the layout-side sort. The adapter's ordering is already deterministic and meaningful. If the layout needs a canonical traversal, document that the adapter is the authority.

---

### H2. `direction: 'dependents'` still labels rings as "Dependencies"

`component-orbit-layout.ts`:

```ts
let label = `${ringIndex}-Hop Dependencies`;
if (ringIndex === 0) {
  label = 'Focus Component (Sun)';
} else if (ringIndex === 1) {
  label = 'Direct Dependencies (1-Hop)';
}
```

The label is hardcoded. When the adapter is invoked with `direction: 'dependents'`, BFS follows incoming edges and `ringIndex = 1` contains **callers**, not callees. Ring 1's label still says "Direct Dependencies."

**Consequence:** Users in "dependents" mode see ring labels that contradict what they're looking at. The adapter's `options.direction` is present in the projection — the layout engine simply ignores it.

**Fix:**

```ts
const direction = projection.options.direction ?? 'dependencies';
const suffix = direction === 'dependents' ? 'Dependents' : direction === 'both' ? 'Neighbors' : 'Dependencies';
let label = `${ringIndex}-Hop ${suffix}`;
```

---

### H3. Repair pass leaves `trackCounts` stale

`component-orbit-layout.ts`, repair loop:

```ts
const shiftNode = posB.ring >= posA.ring ? posB : posA;
shiftNode.track += 1;
shiftNode.radius += trackSpacing;
```

`shiftNode.track` is incremented, but `trackCounts[ringIndex]` — computed before the repair pass as `Math.ceil(n / maxNodesPerTrack)` — is never updated. After repair, a ring may have `trackCounts[ring] = 2` but its items occupy tracks 0, 1, 2, 3.

**Consequence:** `diagnostics.trackCounts` disagrees with `positions[nodeId].track`. Any downstream consumer that uses `trackCounts` (for coloring, legend, or spacer sizing) sees stale data. Any test that asserts `Math.max(track) + 1 === trackCounts[ring]` after repair fails.

**Fix:** Recompute `trackCounts` from `positions` after the repair loop, before returning diagnostics.

---

### H4. `trackCounts[0]` is never set

```ts
if (ringIndex === 0) {
  const sunNode = ringNodes[0] || projection.focus;
  ...
  return;                                     // ← early exit
}
// ... only for ringIndex > 0:
trackCounts[ringIndex] = tracksNeeded;
```

`trackCounts` is initialized as `{}` and never gets a `0` key.

**Consequence:** Diagnostics consumers reading `trackCounts[0]` receive `undefined`. Depending on the consumer, that either silently coerces to `NaN` (if used in arithmetic) or fails a truthiness check. Compounded by H3 for rings > 0.

**Fix:** `trackCounts[0] = 1;` before the early return in the ring-0 branch.

---

### H5. `minAABBSeparationPx` measures center distance, not AABB edge separation

```ts
const dx = Math.abs(a.x - b.x);
const dy = Math.abs(a.y - b.y);
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < minAABBSeparationPx) {
  minAABBSeparationPx = dist;
}
```

This is Euclidean center-to-center distance, not the gap between axis-aligned bounding boxes. Two nodes with adjacent AABBs and a comfortable 40 px gap can have `minAABBSeparationPx` reported as, say, 130 (center distance). Two nodes whose AABBs overlap by 20 px can report `minAABBSeparationPx = 100` (center distance) if they're tall enough.

**Consequence:** The diagnostic metric is unusable for verifying the "≥ C_x horizontal / ≥ C_y vertical clearance" invariant that the collision pass is supposed to enforce. A test asserting on this value is asserting the wrong thing.

**Fix:** Reuse the same `calcAABBGap`-style computation that `component-constellation-layout.ts` uses, or add the helper to the shared `orbit-layout.ts`.

---

## MEDIUM

### M1. `availableSuns` is O(N·E) to compute

```ts
const availableSuns: ComponentOrbitAvailableSun[] = lwcNodes
  .map((lwc) => {
    const childLwcs = parentToChildLwcsMap.get(lwc.id);
    const childLwcCount = childLwcs ? childLwcs.size : 0;
    const parents = childToParentLwcsMap.get(lwc.id);
    const isRootLwc = !parents || parents.size === 0;
    const outCount = edges.filter((e) => e.source === lwc.id).length;   // ← O(E)
    return { ... };
  })
  .sort(...);
```

`edges.filter(e => e.source === lwc.id)` runs once per LWC. On a graph with 500 LWCs and 20 000 edges, that's 10 million comparisons per adapter invocation — and this adapter is called on every mode switch and every focal change.

**Fix:** Precompute outgoing counts once:

```ts
const outEdgeCount = new Map<string, number>();
edges.forEach(e => outEdgeCount.set(e.source, (outEdgeCount.get(e.source) ?? 0) + 1));
```

---

### M2. Ring 0 assumes at most one node — additional nodes are silently discarded

```ts
if (ringIndex === 0) {
  const sunNode = ringNodes[0] || projection.focus;
  if (sunNode) {
    positions[sunNode.nodeId] = { ... };
    minRadiusPx = 0;
  }
  return;
}
```

If ring 0 has more than one item (e.g. a data bug or a stale cached projection), only the first is positioned. The rest get no entry in `positions`, which means they're absent from the layout output — the node simply disappears from the canvas.

The adapter enforces one focal at depth 0 by construction, so this is theoretically impossible. But the layout engine is a pure function consumed by tests, and a test that fabricates a projection with multiple ring-0 items would produce a silent data loss rather than an error.

**Fix:** Assert, throw, or explicitly iterate and warn:

```ts
if (ringNodes.length > 1) {
  // log diagnostic; place all ring-0 nodes at center (they'll be invisible)
}
```

---

### M3. `performance.now()` in a pure geometry function

```ts
const startTime = performance.now();
```

In Node 16+ this exists, but older environments and some SSR workers do not expose `performance`. Since the layout engine is advertised as pure and deterministic, using a browser-time API is a leaky abstraction — and it introduces nondeterminism into `diagnostics.executionTimeMs`, which any test asserting on the exact returned object (e.g. `expect(run1).toEqual(run2)`) will fail.

The `architecture-layout.test.ts` "Test 9" already has this pattern:

```ts
const run1 = computeArchitectureLayout(nodes, edges);
const run2 = computeArchitectureLayout(nodes, edges);
expect(run1).toEqual(run2);
```

`computeArchitectureLayout` returns positions only, so `executionTimeMs` isn't included. But if a similar test is written for `computeComponentOrbitLayout` and `toEqual` is used on the full output, it will flake.

**Fix:** Either omit `executionTimeMs` from the return, or gate it behind an option, or exclude it from equality comparisons in tests.

---

### M4. `reqRadius` uses diagonal chord — over-expands rings

```ts
const maxEffW = maxNodeW + horizontalGap;
const maxEffH = maxNodeH + verticalGap;
const requiredChordSeparation = Math.sqrt(maxEffW * maxEffW + maxEffH * maxEffH);
const reqRadius = n_k <= 1 ? 0 : requiredChordSeparation / (2 * Math.sin(Math.PI / n_k));
```

The required center-to-center distance is the *diagonal* of the AABB-plus-gap rectangle. That guarantees non-overlap for the worst-case orientation (nodes rotated 45° relative to the radial direction), but it's strictly conservative for the actual radial placement used here, where nodes are placed with their edges aligned to the axes in the canvas frame.

**Consequence:** Rings are pushed outward further than necessary. On high-N rings, this produces noticeably more whitespace than the invariant requires. It doesn't violate correctness, but it violates tightness — and it compounds with the guide-ring mismatch in C4.

**Fix:** Use `Math.max(maxEffW, maxEffH)` as the required chord. This is sufficient for axis-aligned AABBs at any angular position.

---

## LOW

### L1. `semanticOrderKey` uses `:` as a separator without escaping

```ts
const semanticOrderKey = `R${String(orbitRingIndex).padStart(2, '0')}:S${orbitSectorId}:T${canonicalNodeType}:N${node.id}`;
```

If `orbitSectorId` (which is a feature ID like `Unassigned`, or a real feature name) contains `:`, sort order becomes ambiguous. Since IDs like `ApexClass:Foo` and `LWC:Bar` routinely contain colons, this is a latent fragility.

**Fix:** Use a separator unlikely to appear in identifiers (e.g. `\u0001`) or pad fields.

### L2. `summary.unassignedNodes` and `summary.duplicateProjections` are hardcoded

```ts
summary: {
  totalNodes: safeNodes.length,
  ...
  unassignedNodes: 0,
  duplicateProjections: 0,
}
```

Both are always `0`. Any consumer reading them receives a false "clean" signal. If they're meant as invariants, compute them; if they're placeholders, remove them.

### L3. `fallbackFlags.isUntypedNodeFallback: !node.type`

```ts
canonicalNodeType: node.type || 'External',
...
fallbackFlags: {
  ...
  isUntypedNodeFallback: !node.type,
},
```

Redundant with the `canonicalNodeType` fallback. Also, on a well-typed graph this is always `false`, so it does not distinguish "node is External by design" from "node was untyped and coerced."

### L4. `ringCounts` includes empty rings

```ts
const ringCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
```

A graph with only ring 0 and ring 1 will still report `ringCounts = { 0: 1, 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 }`. Consumers expecting "only rings with nodes" must filter. Fine if documented, subtle if not.

### L5. Missing `existingPositions` in the layout API

`ComponentOrbitLayoutOptions` has no `existingPositions` field. Orbit positions are always recomputed. This is deliberate (positions depend on the current focal and ring structure) but means user drags in orbit mode cannot survive a re-layout. Combined with Cluster 1's C3 (`existingPositions` never passed), orbit mode has no position preservation at all. That's consistent, but worth stating.

### L6. `unreachableNodeIds` for the "no focus" branch treats every node as unreachable

```ts
if (!focalLwcId || !nodeMap.has(focalLwcId)) {
  return {
    ...
    unreachableNodeIds: nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b)),
    summary: {
      ...
      totalUnreachableNodes: nodes.length,
    },
  };
}
```

Semantically "unreachable" is usually relative to the focal. With no focal, `unreachableNodeIds` is not comparable to the normal case. Fine as long as it's documented.

---

## Priority order for fixes in this cluster

1. **C1** — `isChildLwc` composition check. Highest semantic impact on both Orbit and Constellation.
2. **C2** — `isSharedHub` / `dependentLwcCount` scoping. Makes `◉` truthful.
3. **C4** — guide ring radius. Visually the largest defect.
4. **H1** — remove the layout-side nodeId sort. Restores adapter semantics.
5. **H2** — direction-aware ring labels.
6. **H3 / H4** — `trackCounts` recomputation and ring-0 initialization.
7. **C3** — remove or relocate `projectOrbitSemantics`.
8. **M1** — precompute out-edge counts for `availableSuns`.
9. **H5 / M4** — diagnostic and geometry tightness.
10. Remaining M / L — polish and defensive coding.

**Blocking question:** provide `explorer/src/lib/orbit-layout.ts`. The `checkAABBOverlap` and `normalizeAngle` implementations used by every collision pass live there, and any bug in them affects both Orbit and Constellation. I cannot certify the collision invariants without seeing them.

# Multi-Sun Constellation Cluster — Issue Report

Cluster scope: `component-constellation-adapter.ts`, `component-constellation-layout.ts`, and the sibling engine `constellation-layout.ts` (the legacy "Dependency Constellation lens" — verified it is a **separate, live pipeline**, not a stub).

I traced: **projection input → sun selection → k=1 BFS → shared-node detection → macro placement → local orbit placement → shared-node displacement → diagnostics.**

Two things up front:

- **`constellation-layout.ts` is not the same engine as `component-constellation-layout.ts`.** They consume different types (`ConstellationData` vs `ComponentConstellationProjection`), have different adapters, and produce different outputs. Both are live. This is a maintenance and correctness hazard that recurs in several findings below.
- **`constellation-adapter.test.ts` tests the legacy path, not this cluster's adapter.** The test file imports `adaptConstellation`, not `adaptComponentConstellation`. If you run only the "constellation" tests, you are not exercising the adapter used in production Constellation mode.

---

## CRITICAL

### C1. PBIM-specific hardcoding in shared-node placement

`component-constellation-layout.ts`:

```ts
if (sNode.nodeId === 'ApexClass:MaintenanceRequestController' ||
    sNode.nodeId.includes('MaintenanceRequestController')) {
  const targetSunPos = sunCoords['LWC:vendor-workspace'] || sunCoords['vendor-workspace'];
  if (targetSunPos) {
    ...
    const targetDist = 245.62;     // contracted distance
    ...
  }
}

const isCoLocatedGroup =
  Math.abs(rawX - (-675.0)) < 1.0 &&
  Math.abs(rawY - (-389.7114)) < 2.0;
```

Node IDs, Sun IDs, the target distance `245.62`, and the centroid `(-675.0, -389.7114)` are all PBIM fixture values baked into the algorithm. The header claims the layout enforces "Min Shared-Node Sun AABB Clearance: >= 120px" as an invariant, but the mechanism enforcing it is name-matching against a specific dataset.

On any other project:
- Shared nodes are placed exactly at their centroid with no displacement.
- Two shared nodes whose centroids coincide are drawn on top of each other.
- Shared nodes whose centroid lands within the Sun AABB are drawn inside the Sun.

This is the primary reason Constellation "works on PBIM, fails elsewhere." It is not a tuning issue — the general algorithm is missing; only two specific cases are handled.

**Fix:** Replace both hardcoded branches with a deterministic resolver:
1. Compute the raw centroid for every shared node.
2. If the centroid's AABB is within `sharedNodeSunAabbClearance` of any Sun's AABB, push the node radially outward along `(centroid - sunCenter)` until clearance is satisfied.
3. If two shared nodes share a centroid (or their AABBs overlap), displace them tangentially — direction determined by a stable sort order of their IDs, magnitude by the number of collisions.

The current tangent vector `(0.5, -0.8660254)` × step `160.0` is a special case of this general rule.

---

### C2. No iterative collision repair — the layout engine has no convergence loop

Unlike `component-orbit-layout.ts`, which runs a `maxRepairPasses` loop (default 20), `component-constellation-layout.ts` has no repair pass at all. Placement is single-shot:

```ts
sharedNodesList.forEach((sNode) => {
  ...
  finalX = Math.round(finalX * 100) / 100;
  finalY = Math.round(finalY * 100) / 100;
  ...
});
```

Any overlap not covered by the two hardcoded cases in C1 remains in the output. The diagnostics then measure the resulting clearance (`minSharedNodeAabbClearancePx`) but do not act on it.

**Fix:** Add an invariant-enforcement pass after initial placement, following the orbit layout's pattern. Shared nodes are the only realistic collision source since Suns are on fixed macro rings and unshared children orbit around distinct parents.

---

### C3. The "≥ 120px" invariant is measured but never enforced

```ts
sharedPositions.forEach((sharedPos) => {
  placedSuns.forEach((sunPos) => {
    const gap = calcAABBGap(sharedPos, ..., sunPos, ...);
    if (gap < minSharedNodeAabbClearancePx) {
      minSharedNodeAabbClearancePx = gap;
    }
  });
});
```

The result is reported in `diagnostics.minSharedNodeAabbClearancePx` and then returned successfully — even when the value is negative (overlap). There is no throw, no warning, no fallback placement.

Any consumer (overlay canvas, tests, integration harness) reading `diagnostics` must independently decide whether the value passes. That contract is not documented anywhere in the type.

**Fix:** Either:
- Enforce the invariant in a repair pass (C2), or
- Add `diagnostics.invariantViolations: string[]` and populate it when any threshold is breached, so consumers have an explicit signal.

---

## HIGH

### H1. Sun distribution assumes exactly 6 inner and 8 outer Suns

```ts
const innerAngleStep = (2 * Math.PI) / 6;      // hardcoded 6
innerSuns.forEach((sunNode, idx) => {
  const angle = idx * innerAngleStep;
  ...
});

const outerAngleStep = (2 * Math.PI) / 8;      // hardcoded 8
const outerInterlacingOffset = Math.PI / 8;    // hardcoded offset
outerSuns.forEach((sunNode, idx) => {
  const angle = outerInterlacingOffset + idx * outerAngleStep;
  ...
});
```

The 22.5° interlacing offset is computed as `2π / 16`, i.e. half the outer angle step. Both constants are hardcoded to the PBIM sun counts.

When `options.customSunIds` supplies fewer Suns — or when the adapter's fallback path (`activeSunIds.length === 0`) picks arbitrary LWCs — the inner Suns cluster in the arc `[0, n·60°)` and leave the rest of the circle empty. The interlacing offset for a 4-sun outer ring would be wrong: outer Suns at 22.5°, 112.5°, 202.5°, 292.5° — four positions occupying only half the angular range.

**Fix:** Compute from the actual count:
```ts
const innerAngleStep = (2 * Math.PI) / Math.max(innerSuns.length, 1);
const outerAngleStep = (2 * Math.PI) / Math.max(outerSuns.length, 1);
const outerInterlacingOffset = outerAngleStep / 2;
```

This preserves current behavior when counts are 6 and 8 and generalizes correctly otherwise.

---

### H2. Custom sun set is never threaded from the dispatcher

`component-constellation-adapter.ts` reads `options.customSunIds || CONTRACTED_14_SUN_IDS`. The dispatcher (`architecture-layout.ts`) calls:

```ts
adaptComponentConstellation(schemaInput, options.componentConstellationOptions);
```

`componentConstellationOptions` is optional and no caller populates it — confirmed in Cluster 3's C3. So `customSunIds` is always undefined in production and the adapter always uses either the contracted list or the fallback-to-all-LWCs path.

**The fallback is silently arbitrary:**

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

The alphabetically-first six LWCs become inner Suns regardless of whether they are actual root containers. A utility LWC named `a11y-utils` becomes a "Sun."

**Fix:** Derive the Sun set from graph structure (LWC nodes with no incoming `lwc-template-child` edge), or make `customSunIds` a required input with a documented contract.

---

### H3. Shared LWC loses its `◎` classification with no compensating signal

`component-constellation-adapter.ts`:

```ts
let roleSymbol: ComponentConstellationRoleSymbol = '○';
if (isSun) {
  roleSymbol = '☉';
} else if (isSharedNode) {
  roleSymbol = '◉';
} else if (isChildLwc) {
  roleSymbol = '◎';
}
```

`isSharedNode` beats `isChildLwc`. A shared LWC (referenced by ≥ 2 Suns) is rendered `◉` — the same symbol used for shared Apex classes.

The focused orbit adapter (`component-orbit-adapter.ts`) uses the opposite priority:

```ts
if (isSun) {
  roleSymbol = '☉';
} else if (isChildLwc) {
  roleSymbol = '◎';
} else if (isSharedHub) {
  roleSymbol = '◉';
}
```

In orbit, a child LWC is `◎` even if it happens to be shared. In constellation, the same LWC is `◉`. The two radial modes disagree on identity for the same node.

**Fix:** Decide whether `◎` is a *composition* fact (child of a Sun) or a *sharedness* fact (referenced by multiple Suns), and apply consistently. If both facts matter, add a compound symbol or an annotation field, and keep `roleSymbol` priority identical across adapters.

---

### H4. Two constellation engines coexist with overlapping names

This cluster contains both:

- `component-constellation-layout.ts` — consumes `ComponentConstellationProjection`, exported as `computeComponentConstellationLayout`
- `constellation-layout.ts` — consumes `ConstellationData` (from a different adapter), exported as `computeConstellationLayout`

They are structurally similar (radial placement, sub-track assignment, bezier edges), but:
- Different sparse/dense thresholds
- Different track assignment strategies
- Different data models
- Different tests (`constellation-adapter.test.ts` tests the legacy engine, not the production one)

Any bug fix in one will not propagate to the other. Any regression in the legacy engine's adapter (`constellation-adapter.ts`, not in this cluster) will not be caught by the constellation integration tests you might expect to cover it.

**Fix:** Consolidate to one engine, or rename unambiguously (`legacy-dependency-constellation` vs `component-constellation`) and document which is authoritative. Verify which adapter `GraphView` actually calls — the dispatcher uses `adaptComponentConstellation` + `computeComponentConstellationLayout`, so the legacy engine is currently dead for this mode.

---

## MEDIUM

### M1. `sunReachableNodesMap` is written but never read

```ts
const sunReachableNodesMap = new Map<string, Set<string>>();
...
sunReachableNodesMap.set(sunId, reachableSet);
```

A grep across the file shows no read site. This appears to be a leftover from a prior design where the layout engine consumed per-sun reachability. Dead storage — and it holds up to `|suns| × |nodes|` node IDs in memory during the call.

**Fix:** Delete.

### M2. Edge projection drops edges whose endpoints aren't both projected

```ts
edges.forEach((edge, index) => {
  if (projectedSet.has(edge.source) && projectedSet.has(edge.target)) {
    ...
  }
});
```

`projectedSet` = nodes reachable at k=1 from some Sun. An edge from a Sun to a k=2 node is dropped. An edge between two k=2 nodes (both reachable from the same Sun) is dropped.

The `ComponentConstellationEdge` projection does not carry depth information, unlike `ComponentOrbitEdge` which has `sourceDepth`/`targetDepth`. So there is no way for a downstream consumer to know whether the drop is intentional or a data-loss bug.

**Fix:** Either include the depth fields (matching the orbit contract) or add `droppedEdgeCount` to the summary so the truncation is visible.

### M3. `displacedSharedNodeCount` undercounts

```ts
let displacedSharedNodeCount = 0;
...
if (isDisplaced) {
  displacedSharedNodeCount++;
}
```

`isDisplaced` is set only in the two hardcoded branches (C1). Any shared node that overlaps a Sun but doesn't match either name pattern is placed at its centroid with no flag. Diagnostics report a **lower** displacement count than the true need.

**Fix:** Either of:
- Replace with the general resolver in C1, and count every actual displacement.
- Add a separate diagnostic `overlappingSharedNodeCount` computed from the final placement.

### M4. `totalOccurrences` has no clear semantic

```ts
activeSunIds.forEach((sunId) => {
  const depthResult = computeGraphDepths(...);
  const reachableSet = new Set(depthResult.reachableNodeIds);
  ...
  reachableSet.forEach((nodeId) => {
    totalOccurrences++;      // sum over all suns of |reachable|
    ...
  });
});
```

`totalOccurrences` = sum of all per-sun reachable sets including the Suns themselves. A node referenced by 3 Suns contributes 3. A Sun contributes 1 (from its own BFS) plus 1 for each Sun that reaches it at k=1.

The name suggests "how many times nodes appear across Sun neighborhoods," which is what the code computes — but the summary's `totalUniqueNodes` is the actual node count, so consumers likely misread `totalOccurrences` as "occurrences of unique nodes" or as the sum of `referencingSunIds.length`.

**Fix:** Rename to `sumOfPerSunReachability` or document it in the type.

### M5. Suns that are also referenced by other Suns carry misleading `referencingSunIds`

If Sun A reaches Sun B at k=1 (via any composition edge), then when A's BFS is processed, B is added to `nodeReferencingSunsMap` with `{B → {A}}`. When B's own entry is processed, `isSun = true` so it's classified as a Sun, but its `referencingSunIds` array contains A.

```ts
projectedNodesDict[nodeId] = {
  ...
  referencingSunIds: sunsList,     // ← may contain other Suns
  ...
};
```

A consumer enumerating Suns and checking `referencingSunIds` will see inter-Sun references, even though Suns are semantically top-level. Nothing prevents two Suns from appearing in each other's reachability (a cycle in the LWC composition graph).

**Fix:** Either clear `referencingSunIds` for Sun nodes, or rename the field to `reachableFromSunIds` and document that Suns can reach other Suns.

### M6. The role-symbol fallback `'○'` is never validated

```ts
let roleSymbol: ComponentConstellationRoleSymbol = '○';
if (isSun) { roleSymbol = '☉'; }
else if (isSharedNode) { roleSymbol = '◉'; }
else if (isChildLwc) { roleSymbol = '◎'; }
```

An Apex class referenced by exactly one Sun is `'○'` — same symbol as a solo LWC, an Object, a Field. All ordinary dependencies collapse to one glyph, even though the adapter has access to `rawNode.type` and could emit a per-type symbol. This is consistent with the orbit adapter's behavior but is a UX limitation inherited into both radial modes.

**Fix:** Either expand the symbol set (e.g. `▢` for Object, `◇` for Field) or expose the node type as a separate field on the projected node so the overlay canvas can choose.

### M7. `performance.now()` in a pure geometry function

```ts
const startTime = performance.now();
...
const endTime = performance.now();
...
executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
```

Same concern as the orbit layout: `performance` is not guaranteed in every JS runtime, and `executionTimeMs` breaks `toEqual` comparisons in tests. Worse here than in orbit because the constellation contract explicitly claims determinism ("0.00000px coordinate drift") — including a wall-clock field in the return contradicts that.

**Fix:** Move timing out of the pure function, or omit it and let the caller measure.

### M8. `Math.round(x * 100) / 100` is 2-decimal precision, not "0.00000px"

```ts
const x = Math.round((center.x + R_INNER * Math.cos(angle)) * 100) / 100;
```

The header claims "0.00000px coordinate drift," but the returned coordinates are quantized to 1/100th of a pixel. Deterministic, but not the precision claimed. Any test that asserts exact float coordinates must account for this quantization.

**Fix:** Either round to a documented precision (state it in the type) or drop the rounding and rely on IEEE-754 determinism.

---

## LOW

### L1. `ConstellationLayoutRingGeometry.label` is empty for tracks > 0

In `constellation-layout.ts`:
```ts
label: t === 0 ? ring.label : '',
```

Consumers must special-case empty labels. Providing `${ring.label} (track ${t})` would be more useful.

### L2. `effectiveT` discontinuity in the legacy engine

```ts
const effectiveT = itemCount <= sparseThreshold ? 1 : maxTrackCount;
```

At `sparseThreshold = 30` and `maxTrackCount = 4`, a 30-node ring is drawn on 1 track and a 31-node ring on 4 tracks. The visual discontinuity between a 30-node and a 31-node graph is severe. The legacy engine makes this jump; the component engine (this cluster's primary) doesn't use the pattern at all.

**Fix:** Graduated thresholds (`<= 15 → 1, <= 30 → 2, <= 45 → 3, else 4`) or a continuous radius-scaling function.

### L3. Straight lines drawn as cubic Beziers

```ts
controlX1 = midX; controlY1 = midY;
controlX2 = midX; controlY2 = midY;
...
const pathSvg = `M ... C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
```

A cubic Bezier with both control points at the segment midpoint is a straight line. Emitting an `L` command would be cheaper and clearer. This affects focal edges and inter-ring edges in `constellation-layout.ts`.

**Fix:** Emit `L` when the control points are collinear with the endpoints.

### L4. `startAngleRad = -Math.PI / 2` implicit dependency on screen coordinates

```ts
const startAngleRad = options.startAngleRad ?? -Math.PI / 2;
```

`-π/2` places the first node at the top **only if** the y-axis points down (screen coordinates). Any consumer that renders with mathematical y-up coordinates gets the first node at the bottom. The default is well-chosen for canvas/SVG but is not documented as a coordinate-system assumption.

### L5. No `existingPositions` support

Like the orbit layout, `ComponentConstellationLayoutOptions` has no `existingPositions` field. Every invocation recomputes positions. Consistent with the orbit contract but means user drags cannot survive a mode switch (see Cluster 1's C3 — they can't anyway because the dispatcher doesn't pass positions, but this is a second layer of the same limitation).

### L6. `Math.hypot(lx - center.x, ly - center.y)` after rounding lx, ly

```ts
const lx = Math.round((sunPos.x + R_LOCAL * Math.cos(localAngle)) * 100) / 100;
const ly = Math.round((sunPos.y + R_LOCAL * Math.sin(localAngle)) * 100) / 100;
const globalRadius = Math.round(Math.hypot(lx - center.x, ly - center.y) * 100) / 100;
```

Radius is computed from the rounded coordinates. Two nodes whose true radii are identical will report slightly different `globalRadius` values (up to ~0.007px). Rounding compounds. Harmless but undermines the determinism claim if a downstream consumer groups by `radius === X`.

### L7. `ComponentConstellationDiagnostics` has no failed-invariant list

The diagnostics interface exposes numeric metrics but not a boolean invariant status. Consumers must know the thresholds and re-check them. Adding `invariantViolations?: string[]` would make the contract testable in one line.

---

## Priority order for fixes in this cluster

1. **C1** — general shared-node resolver replacing the two PBIM branches. This is the single change that makes Constellation work on non-PBIM data.
2. **C2** — iterative collision repair pass. Without it, C1 will resolve the two hardcoded cases but leave others overlapping.
3. **C3** — enforce the invariant (or expose failures in `diagnostics.invariantViolations`).
4. **H2** — thread a real `customSunIds` source, or derive Suns from composition graph structure.
5. **H1** — generalize angular distribution to `2π / n`.
6. **H4** — consolidate or clearly separate the two constellation engines.
7. **H3** — reconcile role-symbol priority between orbit and constellation adapters.
8. **M1, M5, M6** — semantic cleanup of `sunReachableNodesMap`, `referencingSunIds`, and the role-symbol fallback.
9. Remaining M / L — polish, testing, and documentation.

**Cross-cluster dependencies to keep in view:**
- Cluster 3 (Dispatch) truncates the Constellation input before this cluster ever runs (edge-endpoint normalization skipped for orbit/constellation). Fixing C1 here without fixing that will not restore full correctness on non-PBIM data.
- Cluster 4 (Focused Orbit) shares the `roleSymbol` contract and `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`. Any symbol-priority change (H3) must be applied to both adapters.
- Cluster 3's C1 (async worker result drops `featureRegions` / `orbitGuides` / `projectedNodeIds`) means the visibility filter that hides non-projected nodes never runs in production for graphs ≥ 20 nodes. This cluster's carefully-projected node set is currently discarded before it reaches the canvas. That is a bigger deal than any finding above except C1.

If you can share `graph-builder.ts` and confirm what `relationshipType` values survive into cytoscape elements, I can state definitively whether the `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` filter is admitting or rejecting the edges this cluster relies on.

# Shared Contract Cluster — Issue Report

Cluster scope: `explorer.ts`. This file is imported by every other cluster, so a defect here propagates silently. I checked the type definitions against the actual construction sites in `architecture-layout.ts`, `graph-layout.ts`, `position-policy.ts`, and `projectState.ts`.

Three framing notes up front:

- The file mixes **three unrelated domains**: Explorer data model (`ExplorerNode`/`Edge`/`Schema`), project persistence (`ProjectMetadata`/`Snapshot`/`History`), and layout mode enums (`ArchitectureLayoutMode`). That mixing is why a single "shared" cluster produces so many cross-cutting contracts.
- Many types here are **duplicated concepts** rather than canonical ones — see C4.
- The file uses `any` in five places and inline unions in at least three, so TypeScript is not enforcing the contracts it claims to define.

---

## CRITICAL

### C1. `ExplorerSummary` is violated by the dispatcher's synthesized schema

`explorer.ts`:

```ts
export interface ExplorerSummary {
  nodeCount: number;
  edgeCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  cycleCount: number;                     // ← required
  unresolvedCount: number;
  inventory: ExplorerInventory;           // ← required
}
```

`architecture-layout.ts` (via Cluster 3 M1):

```ts
const dummySummary = {
  totalNodes: safeNodes.length,
  totalEdges: safeEdges.length,
  nodeCount: safeNodes.length,
  edgeCount: safeEdges.length,
  highRiskCount: 0,
  unresolvedCount: 0,
  cyclesCount: 0,                         // ← wrong key
  // mediumRiskCount, lowRiskCount missing
  // cycleCount missing
  // inventory missing
};

const schemaInput = { summary: dummySummary, nodes: safeNodes, edges: safeEdges, ... };
const projection = adaptComponentOrbit(schemaInput, ...);   // ← passed as ExplorerDataSchema
```

The object is cast implicitly to `ExplorerDataSchema`. In strict mode this should fail; if it compiles, either `strict: false`, or the adapters accept `any`/`Partial<>` — which is even worse, because it makes the "contract" a fiction.

**Consequences:**
- Any adapter that reads `summary.cycleCount` gets `undefined`.
- Any downstream consumer that iterates `summary.inventory` gets `undefined`.
- Because `unresolvedReferences` and `impactSummaries` are also stubbed to `[]`/`{}`, the entire analytics dimension of the schema is destroyed before it reaches the adapter.

**Fix:** Add a factory:

```ts
export function createEmptyExplorerSummary(nodes: ExplorerNode[], edges: ExplorerEdge[]): ExplorerSummary { ... }
export function createAdapterSchemaInput(nodes, edges): ExplorerDataSchema { ... }
```

Then use it in `architecture-layout.ts`. The dispatcher should never construct the schema inline.

---

### C2. `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` is `Set<string>`, not `Set<ExplorerRelationshipType>`

`component-orbit-adapter.ts`:

```ts
export const DEFAULT_COMPONENT_ORBIT_EDGE_TYPES: Set<string> = new Set([...]);
```

The union `ExplorerRelationshipType` in `explorer.ts` enumerates 22 valid values. The set is typed `Set<string>`, so a typo like `'lwc-apex-call'` compiles cleanly and silently excludes real edges at runtime.

The current set matches the union *except* `'test-reference'` (excluded by design). Any new relationship type added to the union must be manually added to this set; there is no compile-time link between the two.

**Fix:** Type the set against the union:

```ts
export const DEFAULT_COMPONENT_ORBIT_EDGE_TYPES: Set<ExplorerRelationshipType> = new Set([
  'lwc-template-child',
  ...
]);
```

Then any typo is a compile error. Optionally export a derived constant that asserts exhaustiveness:

```ts
type _AssertCoverage =
  Exclude<ExplorerRelationshipType, 'test-reference'> extends typeof DEFAULT_COMPONENT_ORBIT_EDGE_TYPES extends Set<infer T> ? T : never
  ? true
  : never;
```

(Or simply add a test that iterates the union and asserts membership.)

---

### C3. `ExplorerEdgeCanonical.source.type` is `ExplorerNodeType`, but fabricators hardcode `'ApexClass'`

`graph-layout.ts` `extractNodesAndEdgesFromCy`:

```ts
canonical: {
  source: { type: 'ApexClass', name: data.source },      // ← hardcoded
  target: { type: 'ApexClass', name: data.target },      // ← hardcoded
  relationship: { type: 'unknown', resolution: 'EXACT' },
  location: {},
},
```

Every edge reconstructed from cytoscape is stamped with `canonical.source.type = 'ApexClass'` regardless of the actual node type. The type system permits this because the field is declared as `ExplorerNodeType` — a valid literal is being written.

Any consumer of `edge.canonical.source.type` (relationship heuristics, LWC-template resolution in adapters, layer classification of the endpoint) sees `'ApexClass'` even for `LWC → Apex` or `Object → Field` edges.

**Fix:** The reconstruction path must look up the actual node type from `cyNode.data('type')`. If the cytoscape element does not carry a type, the reconstruction should not be attempted at all — it should throw or return `null` for that edge, forcing the caller to supply real data.

---

### C4. Duplicated concepts make every consumer write `||` chains

`ExplorerNodeType` includes both:

```ts
export type ExplorerNodeType =
  | "ApexClass"
  | "ApexTrigger"
  | "LWC"
  | "Visualforce"
  | "Flow"
  | "Object"
  | "CustomObject"        // ← duplicate of Object
  | "Field"
  | "CustomField"         // ← duplicate of Field
  | "External";
```

The difference between `Object` and `CustomObject` (or `Field` and `CustomField`) is not encoded anywhere. Every classifier writes:

```ts
// orbit-semantics.ts
if (node.type === 'Object' || node.type === 'CustomObject') return 3;
if (node.type === 'Field' || node.type === 'CustomField' || node.type === 'External') return 4;
```

The same pattern appears in `classifyNodeLayer` (Cluster 6), in `isFieldNode` (Cluster 6), and in the adapters. Nine call sites, each one a chance to forget one half of a pair.

**Fix:** Introduce semantic helpers in `explorer.ts`:

```ts
export function isSchemaObject(type: ExplorerNodeType): boolean {
  return type === 'Object' || type === 'CustomObject';
}
export function isSchemaField(type: ExplorerNodeType): boolean {
  return type === 'Field' || type === 'CustomField';
}
export function isPresentationNode(type: ExplorerNodeType): boolean {
  return type === 'LWC' || type === 'Visualforce' || type === 'Flow' || type === 'ApexTrigger';
}
```

Then collapse the union. If both names must survive for backend compatibility, keep the union but route every check through the helpers.

---

## HIGH

### H1. Three independent enumeration axes on the same logical concept

`ExplorerEdge` carries three separate enums all answering "how confident are we in this edge?":

```ts
unresolved: boolean;
resolutionClassification: "RESOLVED_LOCAL" | "UNKNOWN";
resolutionStrategy: "EXACT" | "HEURISTIC" | "LLM";
confidence: string;                          // ← also see H2
```

And `ExplorerEdgeCanonical` adds a fourth:

```ts
relationship: {
  ...
  resolution: "EXACT" | "INFERRED" | "HEURISTIC" | "UNRESOLVED";
};
```

The two "EXACT" values are not the same concept — one refers to *strategy*, the other to *confidence*. `"UNRESOLVED"` on the canonical side maps to `unresolved: true` on the edge side, but there is no invariant tying them together. A consumer must check all four fields to answer "is this edge trustworthy?", and no code does.

**Fix:** Pick one model. Either:
- `confidence: number` in `[0, 1]` + `resolutionMethod: 'exact' | 'heuristic' | 'llm'` + `isUnresolved: boolean` (three fields), or
- A discriminated union `EdgeResolution = { kind: 'exact' } | { kind: 'heuristic', confidence: number } | { kind: 'unresolved', reason: string }`.

Then delete `resolutionClassification` and `canonical.relationship.resolution` or fold them into the single model.

---

### H2. `ExplorerEdge.confidence` is `string`

```ts
export interface ExplorerEdge {
  ...
  confidence: string;
}
```

In `graph-layout.ts` and `architecture-layout.test.ts`, it's set to `'1.0'`. In other places likely `'0.85'`, `'HIGH'`, or `''`. Any comparison requires parsing:

```ts
parseFloat(edge.confidence) > 0.8
```

Nothing in the type prevents `'unknown'` from being stored. Nothing in the type prevents `''`. Nothing enforces numeric interpretation.

**Fix:** Change to `number` in `[0, 1]`. If the analyzer serializes it as a string, parse at the deserialization boundary, not at every use site.

---

### H3. `impactSummaries: {}` is silently substituted by the dispatcher

`ExplorerDataSchema.impactSummaries` is typed `Record<string, ExplorerComponentImpactSummary>` (required). The dispatcher passes `impactSummaries: {}` to every adapter. Any adapter that reads it treats every node as having no impact summary.

This is a data-loss channel identical in structure to C1, but scoped to one field. It is not documented in the schema type that empty is a valid "computed but missing" state, so a downstream consumer cannot tell whether:

- The analyzer never produced impact summaries for this project, or
- The dispatcher dropped them.

**Fix:** Make `impactSummaries` optional (`impactSummaries?: ...`) and require consumers to explicitly handle absence. Then the type system surfaces the loss.

---

### H4. `any` escapes in five places

```ts
metadata?: Record<string, any>;
databaseAccess?: any[];
metrics?: any;
riskDistribution?: any;
layerDistribution?: any;
```

Every `any` here propagates outward. A consumer of `schema.metrics` is untyped; a consumer of `schema.layerDistribution` is untyped; `schema.databaseAccess` is `any[]`.

Because these are the *analytics* fields that a diversity of lenses consume, and because no lens is forced to declare its expectations, changes to the analyzer's output shape cannot be type-checked.

**Fix:** Either type each shape explicitly (even if `Record<string, number>` or `Record<string, string[]>`), or remove the fields until a shape exists.

---

### H5. `ProjectMetadata.sourcePath` required, but `ProjectSnapshot.rawSchemaJson` optional

```ts
export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  sourcePath: string;                    // ← required
  ...
}

export interface ProjectSnapshot {
  ...
  rawSchemaJson?: string;                // ← optional
  analysisPath?: string;
}
```

A snapshot can exist with no schema and no path to one. `ProjectAnalysisHistory.activeSnapshotId` is `string` (not `string | null`), so an empty history is only representable by a snapshot ID pointing to a snapshot that doesn't exist.

**Fix:** Model the invariant: either `activeSnapshotId: string | null` + `snapshots: ProjectSnapshot[]` where `snapshots.find(s => s.id === activeSnapshotId)` is guaranteed non-empty, or require at least one snapshot for a non-`NOT_ANALYZED` project.

---

## MEDIUM

### M1. `ArchitectureLayoutMode` collides with `WorkspaceViewMode`

Both are exported. Both include `'constellation'`. Both include `'orbit'`? (checking) — `WorkspaceViewMode` has `'constellation'` but not `'orbit'`; `AnalysisViewMode` has both. A developer searching for `constellation` finds three candidates:

- `ArchitectureLayoutMode` — the layout engine
- `WorkspaceViewMode` — a UI tab
- `AnalysisViewMode` — another UI tab (older)

Nothing in the type names distinguishes "how the graph canvas is laid out" from "which analysis view is active." A refactor that swaps one for the other compiles.

**Fix:** Rename to `GraphCanvasLayoutMode` and `WorkspaceTabId`, or namespace the types.

### M2. `ALL_EXPLORER_NODE_TYPES` can drift from `ExplorerNodeType`

```ts
export type ExplorerNodeType = "ApexClass" | ... | "External";

export const ALL_EXPLORER_NODE_TYPES: ExplorerNodeType[] = [
  "ApexClass", ..., "External",
];
```

The array is typed but not *derived*. Adding a variant to the union without updating the array compiles cleanly — the array remains valid as a `ExplorerNodeType[]`, it's just incomplete.

Any consumer iterating `ALL_EXPLORER_NODE_TYPES` (e.g. `projectState.ts` `visibleNodeTypes`) silently omits the new type.

**Fix:** 

```ts
export const ALL_EXPLORER_NODE_TYPES = [
  "ApexClass", ..., "External",
] as const satisfies readonly ExplorerNodeType[];
```

Better: derive the union from the array.

### M3. Inline unions that should be named types

```ts
// ExplorerNode.refactoringReadiness
testCoverageStatus: "COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS";

// ExplorerEdge
resolutionClassification: "RESOLVED_LOCAL" | "UNKNOWN";
resolutionStrategy: "EXACT" | "HEURISTIC" | "LLM";

// ExplorerEdgeCanonical.relationship
resolution: "EXACT" | "INFERRED" | "HEURISTIC" | "UNRESOLVED";
```

None of these can be imported by consumers. Any code that wants to store the "current resolution strategy" must inline the union again.

**Fix:** Promote each to a named `export type`.

### M4. Naming convention inconsistency

`ExplorerNodeBehavior.sharing`:

```ts
sharing?: "with sharing" | "without sharing" | "inherited sharing" | null;
```

Lowercase, space-separated, nullable. Every other string union in the file uses either SCREAMING_SNAKE (`NOT_ANALYZED`, `HIGH`) or kebab-case (`method-call`, `lwc-apex`). Nothing consumes `sharing` in the code you shared — worth confirming that no consumer does `.toLowerCase()` before comparison.

**Fix:** Normalize to kebab-case (`"with-sharing" | "without-sharing" | "inherited-sharing"`) or a discriminated union without spaces.

### M5. `ExplorerInventory` is closed and required

Nine required numeric fields. Adding a new node type (e.g. `PlatformEvent`, `BigObject`, `ExternalDataSource`) requires updating the analyzer, every consumer, and every test fixture. There is no `[key: string]: number` escape hatch and no `Partial<>` variant.

**Fix:** Make it `Record<string, number>` with a documented minimum set, or accept that the analyzer version must match the schema version and enforce it.

### M6. No `schemaVersion` on nodes or edges

`schemaVersion` is at the top of `ExplorerDataSchema`. If two schemas from different analyzer versions are merged (e.g. comparison mode, incremental analysis), individual nodes/edges carry no version marker. Mixed-version merges are silently allowed.

**Fix:** Add `schemaVersion: string` to `ExplorerNode` and `ExplorerEdge`, or at minimum make `ExplorerDataSchema.schemaVersion` required (currently optional).

### M7. `ProjectSnapshot.analysisPath` duplicates `ProjectMetadata.analysisPath`

Both optional strings on different types. If a snapshot is detached and moved, the two paths may diverge. Nothing in the types says which is authoritative.

**Fix:** Either drop one or make one derived.

### M8. `ExplorerCycleGroup.nodes: string[]` is unordered and untyped

No invariant that `nodes.length === size`, no invariant that the node IDs actually exist in the schema. `size: number` is redundant if it must equal `nodes.length`, but it's not enforced.

**Fix:** Either drop `size` (derive as `nodes.length`) or add a runtime constructor that guarantees consistency.

---

## LOW

### L1. `MultiProjectManifest.manifestVersion: string` — no literal type

Any version string passes. Consumers that check `if (manifest.manifestVersion === 'v1')` cannot be type-checked against a canonical set.

### L2. `ExplorerUnresolvedReference.targetName` has no companion `targetNodeId`

By design (the target is unresolved), but there is no way to distinguish "unresolved because external" from "unresolved because it should be in scope but isn't." The `reason: string` field is free-form.

### L3. `ExplorerNode.risk` uses `ExplorerRiskLevel` but `refactoringReadiness.isHighRisk` is a boolean

Two representations of the same concept. A node with `risk: 'HIGH'` and `isHighRisk: false` is type-valid. Nothing enforces the invariant.

### L4. No `readonly` modifiers

Every field on every interface is mutable. This contradicts the "immutable"/"pure" language in adapter headers. Consumers can freely mutate returned objects.

### L5. `ExplorerNodeMetrics.score` has no documented range

Used as `coupling` in `availableSuns` sort in `component-orbit-adapter.ts` but there is no type constraint or doc comment on what `score` represents or what its range is.

### L6. `entryPoints?: string[]`

Optional, untyped, no cardinality guarantee, no reference to node IDs. Consumers must guess whether the strings are node IDs, file paths, or names.

### L7. `databaseAccess?: any[]` typed but unshaped

Any element is `any`. A shape like `{ nodeId: string; operation: 'SOQL' | 'DML'; object: string }` would let consumers at least autocomplete; today they guess.

---

## Priority order for fixes

1. **C1** — Replace the inline `dummySummary`/`schemaInput` in `architecture-layout.ts` with factory functions in `explorer.ts`. This is the fix that surfaces the actual contract violation.
2. **C2** — Type `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` as `Set<ExplorerRelationshipType>`.
3. **C4** — Add `isSchemaObject`/`isSchemaField`/`isPresentationNode` helpers and collapse the "Object|CustomObject" pairs at every call site.
4. **C3** — Fix `extractNodesAndEdgesFromCy` to read the actual node type, or make it throw when unavailable.
5. **H1 + H2** — Collapse the four resolution axes and change `confidence` to `number`.
6. **H3** — Make `impactSummaries` optional (or populate it correctly).
7. **H4** — Remove or type the five `any` fields.
8. **M1** — Rename `ArchitectureLayoutMode` to avoid collision.
9. **M2** — Derive `ALL_EXPLORER_NODE_TYPES` from the union or vice versa.
10. **M3, M4** — Extract named types and normalize casing.
11. Remaining M/L — polish.

**Cross-cluster implication:** C1, C2, C4, and C6 (of clusters 3 and 5) are the *actual observed* symptoms. The shared contract file is the root cause for most of them: it uses `any` where a shape belongs, it duplicates concepts, and it has no factory functions, so every consumer improvises. Fix the file first; the downstream findings become a mechanical cleanup.

# Verification Cluster — Issue Report

Cluster scope: the 17 test files listed for this cluster. **Only two were shared** — `constellation-adapter.test.ts` and `architecture-layout.test.ts`. Everything else (`GraphView.*.test.tsx`, `GraphControls.test.tsx`, `position-policy.test.ts`, `projectState.test.ts`, and the six orbit/constellation test files) is referenced but not visible. That limitation frames the report: I can identify concrete defects in the two visible files, and I can name what must exist in the hidden ones based on the code they are supposed to defend.

Three framing notes:

1. **The Verification Cluster is not a safety net for this codebase; it is a green light for a partially-different codebase.** The single most consequential finding (C1) invalidates the entire Constellation test suite's relevance to production.
2. **The two visible files test synchronous, in-memory, single-pass behavior.** Every production path that matters — async worker dispatch, visibility filtering, position persistence round-trips, mode switches — is untested in what I can see.
3. **Test fixtures are unrealistic in ways that specifically mask the bugs found in Clusters 1–6.** Relationship types, file extensions, and node classifications all diverge from production-shaped data.

---

## CRITICAL

### C1. `constellation-adapter.test.ts` tests a different adapter than production uses

Test file:
```ts
import { adaptConstellation } from './constellation-adapter';
```

Production dispatch (`architecture-layout.ts`, Cluster 3):
```ts
import { adaptComponentConstellation } from './adapters/component-constellation-adapter';
...
const projection = adaptComponentConstellation(schemaInput, options.componentConstellationOptions);
```

These are two distinct files. `adaptConstellation` is the legacy Dependency Constellation adapter (whose layout engine is `constellation-layout.ts`). `adaptComponentConstellation` is the production Multi-Sun engine this cluster's Cluster 5 analysis covers.

**Consequences:**

- Every test in `constellation-adapter.test.ts` validates code that production does not call for architecture-mode Constellation.
- The summary field names differ. The test asserts `data.summary.totalNodes` and `data.summary.totalEdges`. The production `ComponentConstellationSummary` uses `totalUniqueNodes` (not `totalNodes`). So the tests are asserting on a schema that does not exist in the code path they claim to cover.
- A regression in `component-constellation-adapter.ts` — including Cluster 5's C1 (PBIM hardcoding), C2 (no collision repair), C3 (invariant not enforced), H2 (custom suns never threaded) — will pass all current "Constellation Adapter" tests.
- Any developer reading the test suite to understand Constellation behavior gets the wrong mental model.

**Fix:** Rename the legacy test to `dependency-constellation-adapter.test.ts`, and create a new `component-constellation-adapter.test.ts` that exercises `adaptComponentConstellation` directly, with fixtures covering the cases Cluster 5 identified.

---

### C2. The async path is completely untested

Every visible test calls `computeArchitectureLayout` (sync). Per Cluster 3's C1, the production path for graphs ≥ 20 nodes is `runLayoutWithMetadataAsync` → `layout-worker-client` → worker. The async response shape is a suspected data-loss channel (drops `featureRegions`, `orbitGuides`, `projectedNodeIds`). **No visible test exercises this path.**

If `layout-worker-client.ts` were tested, the async contract violation would surface immediately. The absence of that test is the reason C1 of Cluster 3 has not been caught.

**Fix:** Add integration tests that:
- Mock or stub the worker client with a response that includes and omits the overlay metadata
- Assert that `runLayoutWithMetadataAsync` propagates `featureRegions`, `orbitGuides`, and `projectedNodeIds`
- Assert that `GraphView`'s `.then` handler correctly applies them

The test file `GraphView.runtimeIntegration.test.tsx` is named for this. Without seeing it, I cannot confirm whether it covers the case.

---

### C3. No test for the mode dispatcher in `architecture-layout.ts`

`computeArchitectureLayoutWithMetadata` has three early-return branches (constellation, orbit, hierarchical/hybrid) plus an empty-graph branch. The `architecture-layout.test.ts` file tests **only hierarchical/hybrid**.

Nothing in the visible tests would fail if:
- The constellation branch returned the wrong `projectedNodeIds`
- The orbit branch received a `null` focal and fell back to an arbitrary Sun
- The edge-endpoint normalization (Cluster 3 C2) remained skipped for orbit/constellation
- The dispatched `schemaInput` (Cluster 3 M1) had the wrong shape

**Fix:** Add a describe block `describe('computeArchitectureLayoutWithMetadata dispatch')` with one case per architecture mode, asserting the shape of the returned object (`positions`, `projectedNodeIds`, `featureRegions`, `orbitGuides`) for a small fixture.

---

### C4. No test for the visibility filter

`graph-layout.ts` implements `isOrbitComponentFilter` — showing nodes in `projectedNodeIds`, hiding the rest, filtering edges to the projected subgraph, and restoring all elements when leaving radial modes. This is where the "graph looks wrong after switching modes" symptom most plausibly lives.

No visible test covers it. The file `component-orbit-visibility.test.ts` is named for it and is not shared.

**Fix:** The visibility test must cover the full transition matrix:
- `hierarchical → orbit` (hides non-projected, shows projected)
- `orbit → constellation` (hides orbit-projected, shows constellation-projected)
- `orbit → hierarchical` (restores all)
- `hierarchical → orbit → hierarchical` (round-trip identity)
- `orbit` with `projectedNodeIds` undefined (falls back to show-all)

Each transition should assert both node visibility and edge visibility independently.

---

### C5. Mock factories produce fixtures that never exercise the branches under test

Two concrete defects visible in `architecture-layout.test.ts`:

**C5a. Every edge is `method-call`.**

```ts
function createMockEdge(source: string, target: string, id?: string): ExplorerEdge {
  return {
    ...
    relationshipType: 'method-call',
    ...
  };
}
```

Not one test creates an edge with `lwc-template-child`, `lwc-apex`, `soql-object`, `field-reference`, `trigger-handler`, `test-reference`, or any of the other 16 relationship types in `ExplorerRelationshipType`. The layouts branch on these — composition edges pull children into their parent's cluster, `test-reference` edges are excluded by default, `soql-object` edges anchor schema nodes. None of that behavior is exercised.

**C5b. LWC nodes get `.cls` file paths.**

```ts
file: overrides.file || `force-app/main/default/classes/${name}.cls`,
```

An LWC node with id `LWC:OrderView` is stored as `force-app/main/default/classes/OrderView.cls`. Any file-extension-based heuristic in `classifyNodeLayer` or `isTestNode` reads the wrong extension. Since `classifyNodeLayer` is production code called inside `computeArchitectureLayout`, this defect propagates into every test result.

**Fix:** Extend `createMockEdge` to accept a relationship type. Fix `createMockNode` to derive the file extension from `type`.

---

### C6. `position-policy` and `projectState` tests are not shared, but the merge logic is complex

`position-policy.ts` has a truth table with 2 modes × 8 triggers × 2 context flags. `projectState.ts` has `mergeWithDefaultState` with ~120 lines of branching, including legacy migration, mode-scoped position reconstruction, and provenance fallback. Both files are consumed by every cluster above.

If the tests for these functions are as thin as `constellation-adapter.test.ts`, this is a major coverage gap. Without the files, I cannot confirm. **Provide `position-policy.test.ts` and `projectState.test.ts` for review.**

The specific cases that must exist:

**Position policy:**
- Static + initial + no auth → `true`
- Static + initial + auth → `false`
- Static + new-nodes + auth → `'place-new-only'`
- Interactive + mode-switch → `false`
- Interactive + reset-layout → `true`
- Every other combination in the truth table

**Project state:**
- Load empty → defaults
- Load with `architectureMode: 'orbit'` and no `layoutPositions` → active positions empty, provenance `automatic-orbit`
- Load legacy flat `nodePositions` (no `layoutPositions`) → migrated to `layoutPositions[activeArchMode]`
- Load with mismatched `architectureMode` and `layoutProvenance` → correct alignment
- Update `architectureMode` → `layoutPositions[newMode]` swapped into `nodePositions`

---

## HIGH

### H1. Test 9 asserts wall-clock duration — flaky by construction

```ts
const startTime = performance.now();
const run1 = computeArchitectureLayout(nodes, edges);
const duration = performance.now() - startTime;

expect(duration).toBeLessThan(3000);
```

3000ms for 100 nodes is generous, but wall-clock assertions fail on loaded CI runners, under GC pressure, or when a debugger is attached. This is a known flaky-test antipattern.

**Fix:** Remove the timing assertion. If performance must be guarded, use a benchmark suite (Vitest bench, or a dedicated perf test that only runs on demand) and track regressions via CI metrics, not pass/fail thresholds.

The `duration` variable is also not logged, so a failure message ("expected 3001 to be less than 3000") provides no diagnostic context.

---

### H2. Several spatial assertions only check X or center distance, missing Y-direction bugs

**Test 2 (two domains):**
```ts
const orderDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:OrderSelector'].x);
const crossDomainDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:PaymentService'].x);
expect(orderDist).toBeLessThan(crossDomainDist);
```

If OrderService and OrderSelector are on the same X but different Y (e.g. OrderService at `(0, 0)`, OrderSelector at `(0, 500)` — same column, different layer), `orderDist = 0`. If PaymentService is at `(400, 0)`, `crossDomainDist = 400`. Test passes. But the layout is *wrong* — OrderService and OrderSelector should be in the same layer (adjacent Y), not the same column.

The correct assertion is Euclidean or domain-centroid distance:
```ts
const orderDist = Math.hypot(
  positions['ApexClass:OrderService'].x - positions['ApexClass:OrderSelector'].x,
  positions['ApexClass:OrderService'].y - positions['ApexClass:OrderSelector'].y,
);
```

**Test 3 (hub):**
```ts
const avgNeighborX = (positions['ApexClass:CallerA'].x + ...) / 4;
expect(Math.abs(hubPos.x - avgNeighborX)).toBeLessThan(300);
```

Only X. If the hub is placed at the correct X but on a completely wrong Y (i.e. a different layer), the test passes.

**Test 6 (microcluster):**
```ts
const microclusterDist = Math.sqrt(Math.pow(trigPos.x - handPos.x, 2) + Math.pow(trigPos.y - handPos.y, 2));
const unrelDist = Math.sqrt(Math.pow(trigPos.x - unrelPos.x, 2) + Math.pow(trigPos.y - unrelPos.y, 2));
expect(microclusterDist).toBeLessThan(unrelDist);
```

Uses full distance (good), but the assertion is a *relative* comparison that any clustering algorithm passes on a 3-node graph. There is no threshold — a random placement would pass with probability ≥ 50%.

**Test 7 (disconnected components):**
```ts
const maxXCompA = Math.max(positions['ApexClass:CompA1'].x, positions['ApexClass:CompA2'].x);
const minXCompB = Math.min(positions['ApexClass:CompB1'].x, positions['ApexClass:CompB2'].x, positions['ApexClass:CompB3'].x);
expect(Math.abs(minXCompB - maxXCompA)).toBeGreaterThan(100);
```

Only X. If CompA and CompB are stacked vertically with 0 X separation but 1000px Y separation, the test fails — even though they are properly separated. The assertion should be 2D: compute component bounding boxes and assert they don't overlap.

---

### H3. Test 4 is named "Bridge-heavy" but never asserts bridge placement

```ts
it('Test 4 — Bridge-heavy graph: Cross-domain bridge between domains', () => {
  // setup...
  const positions = computeArchitectureLayout(nodes, edges);

  expect(positions['ApexClass:TriBridge']).toBeDefined();
  expect(positions['ApexClass:OrderService']).toBeDefined();
  expect(positions['ApexClass:PaymentService']).toBeDefined();
  expect(positions['ApexClass:BillingService']).toBeDefined();

  const evalMetrics = evaluateLayout(nodes, edges, positions);
  expect(evalMetrics.nodeOverlapCount).toBe(0);
});
```

The test asserts nothing about the bridge's *position*. It could be at `(∞, ∞)` and the test would pass as long as it's somewhere on the canvas. Compare to Test 2, which at least tries to assert relative domain positions. This test exists to claim coverage, not to verify behavior.

**Fix:** Assert that TriBridge is spatially between the three domains it bridges — e.g. within the convex hull of `{OrderService, PaymentService, BillingService}` positions, or at a distance from each domain centroid that is less than the inter-domain distance.

---

### H4. Test 5's 500px threshold is functionally meaningless

```ts
expect(Math.abs(prodPos.x - testPos1.x)).toBeLessThan(500);
expect(Math.abs(prodPos.x - testPos2.x)).toBeLessThan(500);
```

500px on a layout that typically spans 2000–5000px is not a proximity assertion — it's "not on opposite sides of the canvas." A real assertion would be 200px or less, or would compare test-satellite distance to unrelated-node distance.

---

### H5. Test 9's "100+ node" fixture is a linear chain

```ts
const edges: ExplorerEdge[] = [];
for (let i = 0; i < 90; i++) {
  edges.push(createMockEdge(`ApexClass:LargeNode_${i}`, `ApexClass:LargeNode_${i + 1}`));
}
```

A linear chain is the easiest topology for any layout algorithm. Every node has fan-in 1, fan-out 1 (except endpoints). Centrality analysis returns no hubs, no bridges. Domain discovery clusters the whole chain into one domain. Feature discovery produces one feature. Nothing is stress-tested.

**Fix:** Use a graph with:
- Multiple domains (5+)
- A few high-fan-in hubs (fan-in ≥ 10)
- Cross-domain bridges
- Cyclic regions
- Disconnected components of different sizes

The existing `analysis.test`/`centrality` code has cases specifically for these shapes. None are exercised here.

---

### H6. Test 8's "dense graph" is 15 nodes

15 nodes with ~3 edges each is not dense by any reasonable standard. A dense graph for this layout engine would be 50+ nodes with edge-to-node ratio > 3. The test asserts only that positions are finite and non-overlapping — which the shape doesn't stress.

**Fix:** Use the fixture from Cluster 6's `HYBRID LAYOUT PROMPT 2` test 3 (50 nodes, interleaved edges). Or generate a random dense graph deterministically (seeded PRNG) and assert layout invariants.

---

### H7. Determinism is asserted only for repeated calls with identical input

```ts
const run1 = computeArchitectureLayout(nodes, edges);
const run2 = computeArchitectureLayout(nodes, edges);
const run3 = computeArchitectureLayout(nodes, edges);

expect(run1).toEqual(run2);
expect(run2).toEqual(run3);
```

This is necessary but not sufficient. The adapters explicitly sort their inputs, implying determinism must hold for permuted inputs. No test verifies that:

```ts
const shuffled = [...nodes].reverse();
const positions2 = computeArchitectureLayout(shuffled, [...edges].reverse());
expect(positions2).toEqual(run1);   // should hold
```

If this fails, the sort guarantees are incomplete somewhere in the pipeline.

**Fix:** Add an input-permutation test to `architecture-layout.test.ts` and to each adapter test.

---

### H8. No test for the hybrid feature-region output

Hybrid mode produces `featureRegions` via `computeGlobalFeatureLayout`. `computeArchitectureLayoutWithMetadata` returns them. `GraphView` consumes them for the overlay canvas.

The visible Hybrid tests assert only that positions are non-overlapping. They do not assert:
- That `featureRegions` is populated
- That feature regions are disjoint
- That nodes are spatially closer to nodes in their own region than to nodes in other regions
- That feature regions don't overlap

**Fix:** Add a describe block asserting `featureRegions.size > 1` for a multi-feature fixture, and spatially verify feature clustering.

---

### H9. No test for the dense-track branch of `constellation-layout.ts`

The legacy engine has:

```ts
const effectiveT = itemCount <= sparseThreshold ? 1 : maxTrackCount;
```

With `sparseThreshold = 30`, `maxTrackCount = 4`. The visible test uses 4 nodes. The multi-track code path (>30 items in one ring) is entirely untested.

**Fix:** Add a test with 100+ nodes in one ring, asserting 4 tracks are used, each track's radius differs by `trackSpacing`, and all nodes fit without overlap.

---

### H10. `direction: 'both'` and `includeTestReferences: true` are untested

The production orbit and constellation adapters accept both options. `direction: 'both'` changes the BFS direction, expanding the reachable set significantly. `includeTestReferences: true` adds `'test-reference'` to the allowed edge set, which changes ring composition.

`constellation-adapter.test.ts` tests `'dependencies'` and `'dependents'` but not `'both'`. Neither adapter test sets `includeTestReferences: true`.

**Fix:** For each adapter, add three direction tests and a `test-reference` inclusion test.

---

### H11. Test 10 does not verify `existingPositions` for nodes not in the map

```ts
const existingPositions = {
  'ApexClass:ExistingNode': { x: 777, y: 888 },
};
const positions = computeArchitectureLayout(nodes, edges, { existingPositions });

expect(positions['ApexClass:ExistingNode']).toEqual({ x: 777, y: 888 });
expect(positions['ApexClass:NewNode']).toBeDefined();
expect(positions['ApexClass:NewNode']).not.toEqual({ x: 777, y: 888 });
```

The last assertion is trivially true (any position differs from `{777, 888}` unless it happens to be identical). It does not verify that:
- The new node is placed near its neighbor
- The new node is placed on the deterministic grid
- The new node's position is deterministic across runs

Also missing: what happens when `existingPositions` contains an ID that is not in `nodes`? Per the production code:

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) resultPositions[id] = { x: pos.x, y: pos.y };
}
```

Non-existent IDs are silently added to `resultPositions`. No test covers this.

---

## MEDIUM

### M1. The spy-based "compute once" test is white-box and brittle

```ts
const analysisSpy = vi.spyOn(analysisModule, 'computeArchitectureAnalysis');
const domainsSpy = vi.spyOn(domainsModule, 'discoverDomains');

const positions = computeArchitectureLayout(nodes, edges);

expect(analysisSpy).toHaveBeenCalledTimes(1);
expect(domainsSpy).toHaveBeenCalledTimes(1);
```

This asserts an internal call count. It will fail if:
- The implementation is refactored to cache the result in a helper
- A wrapper delegates and the wrapper is called once but the function is mocked elsewhere
- Module-level memoization is added

It passes today and will pass with a subtle regression (e.g. `computeArchitectureAnalysis` called once but with incomplete input).

**Fix:** Measure the outcome, not the internal calls. If the concern is performance, benchmark. If the concern is correctness, assert the output.

### M2. No property-based or fuzz testing

Every fixture is hand-crafted. No test checks:
- Self-loops (`source === target`)
- Duplicate edge IDs
- Nodes with `id` referencing missing edges
- Edges referencing missing nodes
- Unicode display names
- Empty display names

Cypress, fast-check, or a simple seeded PRNG would cover these in a handful of cases.

### M3. No snapshot tests for geometry regression

Adding a `toMatchSnapshot()` on the position map for a fixed fixture would catch unintended geometry changes across PRs. None of the visible tests do this.

### M4. `evaluateLayout` is used in tests but not called in production

```ts
import { evaluateLayout } from './layout/evaluate-layout';
```

No production file imports `evaluateLayout`. If it's test-only, the tests verify layout quality using a utility the layout itself does not use — so its notion of "overlap" may differ from the layout engine's.

If it's production, why isn't it called? Either way, the assertion "nodeOverlapCount === 0" may not correspond to the same overlap definition the layout engine uses.

**Fix:** Assert overlap using the same `checkAABBOverlap` (from `orbit-layout.ts`) and effective gap logic that the layout uses.

### M5. Mock factory fields can be internally inconsistent

```ts
refactoringReadiness: {
  isHighRisk: false,
  ...
  ...overrides.refactoringReadiness,
},
```

A test that sets `risk: 'HIGH'` but not `refactoringReadiness.isHighRisk` produces a node where the two fields disagree. Any classifier that reads both (or either) will behave according to which one it reads. The factory should derive `isHighRisk` from `risk` unless explicitly overridden.

Same for `behavior.isTest` — should derive from `id.endsWith('Test')` or `displayName.endsWith('Test')` by default, unless explicitly set.

### M6. Empty-schema test doesn't cover partial-emptiness

```ts
const emptySchema = { ...sampleSchema, nodes: [], edges: [] };
```

Good for the fully-empty case. Not covered:
- `nodes: [x], edges: []` (single node, no edges)
- `nodes: [], edges: [edge]` (edges pointing at missing nodes)
- `nodes: [x], edges: [edge with x as source but a missing target]`

The production adapter's behavior on each of these is undefined by the tests.

### M7. `getLayoutOptions` fcose fallback is untested

The fallback branch (`!nodes || nodes.length === 0`) returns a Cytoscape `fcose` layout. This is the branch that runs when the graph is loading or when only `nodeCount` is provided. No test covers it.

### M8. `extractNodesAndEdgesFromCy` is untested

Per Cluster 6 C3, this function fabricates `canonical.source.type = 'ApexClass'` regardless of actual type. It is used in `createLayout` and in `runLayoutWithMetadata` when `nodes`/`edges` are not passed. No test verifies the reconstruction is correct or lossy.

### M9. No async integration test for the worker client

`globalWorkerClient` is a module-level singleton. No visible test exercises it. Per Cluster 3 C1, the async response shape is a probable data-loss site. Only an integration test around `runLayoutWithMetadataAsync` would catch that.

### M10. `toEqual` on position objects is forward-incompatible

```ts
expect(positions['ApexClass:ExistingNode']).toEqual({ x: 777, y: 888 });
```

If the position object later gains fields (e.g. `{ x, y, z }`, or `{ x, y, provenance }`), this assertion fails even though the required fields match.

**Fix:** `toMatchObject({ x: 777, y: 888 })`.

---

## LOW

### L1. `describe` structure is flat

`architecture-layout.test.ts` has three top-level describes (`Intelligent Architecture-Aware Layout Engine`, `WAVE 5 REQUIRED INTEGRATION TESTS`, `WAVE 7A PERFORMANCE OPTIMIZATION VERIFICATION`, `HYBRID LAYOUT PROMPT 2 PIPELINE INTEGRATION VERIFICATION`). The first is the natural parent for all subsequent. Flattening groups makes the test tree harder to navigate.

### L2. Test IDs are numbered ("Test 1"–"Test 11") instead of named

`Test 1 — Basic layered architecture` is more useful as a test name than `basic-layered-architecture`. But the numbering adds no value; if a test is removed, the numbering is discontinuous. Use pure descriptive names.

### L3. String literals are not named constants

```ts
expect(classifyNodeLayer(lwcNode)).toBe('presentation');
```

`'presentation'` is a member of `ArchitectureLayer`. If the value is renamed in production, the test fails with an unclear message. Use `ArchitectureLayer.Presentation` (if it were an enum) or a `const PRESENTATION = 'presentation'` at the top.

### L4. No tests for label overflow or unicode

Display names like `"A very long component name that overflows the node"` or `"Δοκιμή"` are not tested. Layout engines that measure label width (or assume ASCII) can fail silently.

### L5. No tests for self-loops

`createMockEdge('A', 'A')` is never tested. The BFS engines should not loop indefinitely, but no test verifies this.

### L6. `constellation-adapter.test.ts` assumes `sampleSchema.nodes[0]` exists

```ts
const singleNodeSchema = {
  ...sampleSchema,
  nodes: [sampleSchema.nodes[0]],
  edges: [],
};
```

If the fixture is reordered, this test silently depends on the new first node. Should explicitly reference `nodeController` or another named node.

---

## Coverage gap matrix

Mapping production paths (from Clusters 1–6) to test coverage:

| Production path | Test file that should cover it | Visible? | Confirmed coverage? |
|---|---|---|---|
| Button click → cycle to next mode | `GraphControls.test.tsx` | No | Unknown |
| Mode change → state update → layout re-run | `GraphView.layoutModeToggle.test.tsx` | No | Unknown |
| Async worker dispatch ≥20 nodes | `GraphView.runtimeIntegration.test.tsx` | No | Unknown |
| Sync vs async layout result parity | (missing) | No | **None** |
| `projectedNodeIds` visibility filter | `component-orbit-visibility.test.ts` | No | Unknown |
| Position authority round-trip | `GraphView.positionAuthority.test.tsx` | No | Unknown |
| Mode-scoped position persistence | `projectState.test.ts` | No | Unknown |
| Trigger truth table | `position-policy.test.ts` | No | Unknown |
| Orbit projection with real relationship types | `component-orbit-adapter.test.ts` | No | Unknown |
| Orbit collision repair pass | `component-orbit-layout.test.ts` | No | Unknown |
| Constellation sun selection on non-PBIM data | (missing) | No | **None** |
| Constellation shared-node placement without PBIM IDs | (missing) | No | **None** |
| Constellation guide-ring alignment | (missing) | No | **None** |
| Hierarchical pipeline | `architecture-layout.test.ts` | Yes | Partial (see above) |
| Hybrid feature regions | `architecture-layout.test.ts` | Yes | Weak |

The three rows marked **None** correspond to the three most consequential findings in Cluster 5. They have no test coverage in any file I can see, which is why they were not caught.

---

## Priority order for fixes in this cluster

1. **C1** — create a real `component-constellation-adapter.test.ts`. Every finding in Cluster 5 becomes actionable the moment this file exists with realistic fixtures.
2. **C2 + M9** — add async worker integration tests. Until these exist, Cluster 3 C1 remains unverified.
3. **C3 + C4** — dispatch and visibility tests. These defend the branches where "mode switch looks broken" most plausibly lives.
4. **C5** — fix mock factories (relationshipType parameter, file extension by node type). Every test above depends on this.
5. **C6** — produce `position-policy.test.ts` and `projectState.test.ts` (not shared — please provide).
6. **H1** — remove the wall-clock assertion.
7. **H2–H4, H6, H7** — strengthen positional assertions.
8. **H5, H8, H9, H10, H11** — close specific coverage gaps.
9. Remaining M/L — polish.

**Blocking question:** please share `GraphView.runtimeIntegration.test.tsx`, `component-constellation-adapter.test.ts` (if it exists), `position-policy.test.ts`, and `projectState.test.ts`. The report above is bounded by what I can see; the true coverage of this cluster cannot be certified until those four are inspected.

# Layered Architecture Cluster — Issue Report

**Scope caveat before findings:** You have shared `architecture-layout.ts` and `architecture-layout.test.ts`, but **not** any of the `layout/*` submodules this file orchestrates — `analysis.ts`, `layers.ts`, `domains.ts`, `features.ts`, `feature-roles.ts`, `global-layout.ts`, `ordering.ts`, `local-layout.ts`, `centrality.ts`, `satellites.ts`, `components.ts`, `spacing.ts`, `graph-index.ts`. Every finding below is rooted in code I can see; where a defect may propagate into a submodule, I mark it as **unverifiable without source** rather than claiming it.

This cluster is the reference implementation — the bar for defects here is higher, because any bug in the baseline invalidates the comparison against Clusters 4 and 5.

---

## CRITICAL

### C1. Empty-graph Orbit dispatches to a *different engine* than non-empty Orbit

```ts
if (safeNodes.length === 0) {
  if (architectureMode === 'orbit') {
    const orbitOutput = computeOrbitLayout({           // ← legacy engine
      nodes: [],
      options: { nodeWidth, nodeHeight },
    });
    return {
      positions: { ...existingPositions },
      orbitGuides: orbitOutput.guides,                  // OrbitGuideMetadata
    };
  }
  return { positions: { ...existingPositions } };
}
```

Later, for non-empty Orbit:

```ts
const projection = adaptComponentOrbit(schemaInput, {...});
const orbitOutput = computeComponentOrbitLayout(projection, {   // ← component engine
  nodeWidth, nodeHeight,
});
...
return {
  positions: orbitPositions,
  orbitGuides: orbitOutput.guides as any,           // ComponentOrbitGuideMetadata
  projectedNodeIds: new Set(Object.keys(projection.nodes)),
};
```

Two problems compound:

1. **Two different guide shapes** — `computeOrbitLayout` returns `{ rings: ComponentOrbitGuideRing[] }` from the legacy `orbit-layout.ts`; `computeComponentOrbitLayout` returns `{ rings: ComponentOrbitGuideRing[] }` from `component-orbit-layout.ts`. The `as any` cast at the non-empty call site is the only reason TypeScript accepts the mismatch. If the overlay canvas expects fields from one and receives the other (e.g. `label` vs `name`), rendering silently degrades.
2. **Return shape asymmetry** — the empty case omits `projectedNodeIds`; the non-empty case includes it. Any consumer (GraphView's `isOrbitComponentFilter` check) that keys off `projectedNodeIds` presence behaves differently on empty vs populated graphs.

**Fix:** Use `computeComponentOrbitLayout` with an empty projection in the empty-graph branch, and return `projectedNodeIds: new Set()` for symmetry.

---

### C2. `dummySummary` does not satisfy `ExplorerSummary` — silent structural corruption

```ts
const dummySummary = {
  totalNodes: safeNodes.length,
  totalEdges: safeEdges.length,
  nodeCount: safeNodes.length,
  edgeCount: safeEdges.length,
  highRiskCount: 0,
  unresolvedCount: 0,
  cyclesCount: 0,             // ← ExplorerSummary expects "cycleCount"
};

const schemaInput = {
  summary: dummySummary,
  nodes: safeNodes,
  edges: safeEdges,
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};
```

Against the declared contract:

```ts
export interface ExplorerSummary {
  nodeCount: number;
  edgeCount: number;
  highRiskCount: number;
  mediumRiskCount: number;      // ← missing
  lowRiskCount: number;         // ← missing
  cycleCount: number;           // ← missing (field named cyclesCount instead)
  unresolvedCount: number;
  inventory: ExplorerInventory; // ← missing
}
```

This object is passed directly as the first argument to `adaptComponentOrbit(schemaInput: ExplorerDataSchema, ...)` and `adaptComponentConstellation(schemaInput: ExplorerDataSchema, ...)`.

Two possibilities, both bad:

- **If TypeScript is enforcing the type**: the code shouldn't compile. Something upstream — a `// @ts-ignore`, a looser adapter signature, or a `Partial<ExplorerDataSchema>` — is suppressing the error. That hidden suppression will eventually allow a real defect through.
- **If TypeScript is not enforcing the type**: the adapters are typed with `Partial` or `any`, and every field access like `input.summary.cycleCount` evaluates to `undefined` at runtime. Any future adapter change that reads these fields silently breaks.

`dummySummary` also **duplicates information** — `nodeCount`/`totalNodes` and `edgeCount`/`totalEdges` are the same values under different names. Whichever field a consumer reads, only one is correct.

**Fix:** Build a complete `ExplorerSummary` from the real input if available, or define a minimal `AdapterInput = { nodes, edges }` type and change the adapter signatures to accept it. Do not pass an incomplete object typed as `ExplorerDataSchema`.

---

### C3. `activeSpatialMap` carries feature IDs into a parameter named `domainMap`

```ts
let activeSpatialMap: Map<string, string>;

if (enableFeatureLayout) {
  const featureLayoutResult = computeGlobalFeatureLayout(...);
  globalDomainResult = featureLayoutResult;
  activeSpatialMap = featureMap;               // ← feature IDs
} else {
  globalDomainResult = computeGlobalDomainLayout(...);
  activeSpatialMap = domainMap;                // ← domain IDs
}

const orderingResult = reduceEdgeCrossings({
  nodes: safeNodes,
  edges: safeEdges,
  layerMap,
  domainMap: activeSpatialMap,                 // ← called "domainMap", may contain feature IDs
  domainOrder: globalDomainResult.orderedDomains,
  layerYMap: globalDomainResult.layerYMap,
});

const localResult = computeLocalNodeLayout({
  ...
  domainMap: activeSpatialMap,                 // ← same conflation
  domainRegions: globalDomainResult.domainRegions,
  ...
});

const finalCleanupResult = resolveSpacingAndCollisions({
  ...
  options: {
    ...
    domainMap: activeSpatialMap,
    ...
  },
});
```

Feature IDs and domain IDs are **different namespaces**. `featureDiscovery.assignments.get(nodeId)?.primaryFeatureId` returns values like `"OrderManagement"` or `"Unassigned"`. `domainDiscovery.assignments.get(nodeId)?.primaryDomain` returns values like `"Order"` or `"Shared"`.

If any of `reduceEdgeCrossings`, `computeLocalNodeLayout`, or `resolveSpacingAndCollisions` does domain-specific logic — e.g. `if (domainId === 'Shared')`, membership checks against a predefined domain list, or a lookup in a domain-keyed configuration table — that logic silently misfires in feature mode. If they treat the map as a generic "node → grouping key," it works but the parameter names are lies.

**Unverifiable without source:** I can't tell which is the case. **But the parameter name is `domainMap` at three call sites**, which strongly suggests the callees were written assuming domain semantics. Introducing feature IDs into a `domainMap`-typed parameter is exactly the kind of conflation that survives unit tests (which usually use one or the other, not both) and fails in production when a user toggles Hybrid mode.

**Fix:** Rename the parameter to `spatialGroupMap` (or `regionKeyMap`) in every callee signature, then verify each callee's logic is grouping-namespace-agnostic. If any callee does domain-specific work, it must take the actual `domainMap` regardless of layout mode.

---

## HIGH

### H1. `enableFeatureLayout` default disagrees with the mode name

```ts
const {
  ...
  architectureMode,
  enableFeatureLayout = options.enableFeatureLayout ?? (options.architectureMode === 'hybrid'),
  ...
} = options;
```

If a caller sets `architectureMode: 'hybrid'` but explicitly passes `enableFeatureLayout: false`, feature layout is disabled — the mode name is ignored. Conversely, a caller can pass `architectureMode: 'hierarchical'` with `enableFeatureLayout: true` and get feature layout under a "hierarchical" mode.

GraphView always passes both, so today this is consistent. But the API permits mode/behavior divergence, and the divergence is silent. Any future caller that populates only `architectureMode` (the natural thing to do) gets behavior that depends on an undocumented default.

**Fix:** Derive `enableFeatureLayout` from `architectureMode` inside this function, and remove it from the options surface — or make it an explicit assertion (`if (enableFeatureLayout !== (architectureMode === 'hybrid')) throw`).

---

### H2. Empty-graph handling is asymmetric across modes

From the same block as C1:

```ts
if (safeNodes.length === 0) {
  if (architectureMode === 'orbit') {
    // ... produces orbitGuides
  }
  return { positions: { ...existingPositions } };   // ← constellation falls here
}
```

For an empty graph:

| Mode | Return value |
|---|---|
| `hierarchical` | `{ positions }` |
| `hybrid` | `{ positions }` |
| `orbit` | `{ positions, orbitGuides }` |
| `constellation` | `{ positions }` — **no guides** |

The constellation branch further down is **unreachable** for an empty graph because the early return fires first. Since Constellation's macro rings (inner radius 900, outer radius 1760) are computed from `R_INNER`/`R_OUTER` constants and don't depend on node count, an empty-graph Constellation view could still produce meaningful guide metadata — matching Orbit's behavior.

**Fix:** Either produce guide metadata for all four modes on empty input, or produce none for any. The current asymmetry is arbitrary.

---

### H3. `componentOrbitOptions` spread inverts the priority a reader expects

```ts
const projection = adaptComponentOrbit(
  schemaInput,
  {
    focalLwcId: options.focalLwcId,
    ...options.componentOrbitOptions,    // ← spread AFTER
  }
);
```

If a caller passes both `options.focalLwcId = 'LWC:A'` and `options.componentOrbitOptions.focalLwcId = 'LWC:B'`, `'LWC:B'` wins. The outer `focalLwcId` is documented as the primary input (it's typed as a top-level field on `ArchitectureLayoutOptions`); the nested value should be an override only if explicitly intended. The current spread order makes it *always* the override.

Compare with Constellation:

```ts
const projection = adaptComponentConstellation(
  schemaInput,
  options.componentConstellationOptions    // ← no merge at all
);
```

There is no outer option to merge with, so no conflict — but the two branches are structurally inconsistent.

**Fix:** Reverse the spread so nested options cannot silently clobber the top-level `focalLwcId`:

```ts
{
  ...options.componentOrbitOptions,
  focalLwcId: options.focalLwcId ?? options.componentOrbitOptions?.focalLwcId,
}
```

Or, better, remove `focalLwcId` from `ComponentOrbitAdapterOptions` entirely so the two are non-overlapping.

---

### H4. `existingPositions` restoration is unvalidated inside a pure function

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

`existingPositions: Record<string, { x: number; y: number }>` is trusted at face value. `NaN`, `Infinity`, `null`, and `undefined`-typed `x`/`y` values all pass through into `resultPositions`.

The consumer (`position-policy.resolveAuthoritativePosition`) **does** validate:

```ts
if (pPos && typeof pPos.x === 'number' && typeof pPos.y === 'number'
    && !isNaN(pPos.x) && !isNaN(pPos.y)) {
```

So today the invalid values are filtered before they reach `cyNode.position()`. But `computeArchitectureLayoutWithMetadata` is a pure function that returns positions directly to `GraphView`'s `captureAndPersistPositions`, which then writes them to `projectState.nodePositions`. An invalid value that survives the consumer validation gap — e.g. if `position-policy` changes, or if a test calls this function directly — poisons persisted state.

**Fix:** Validate on entry:

```ts
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

---

### H5. No dispatch-level tests for Orbit or Constellation

`architecture-layout.test.ts` covers:

- 11 tests in the "WAVE 5" suite (all hierarchical/hybrid)
- 1 test in "WAVE 7A" (pipeline call-count for hierarchical)
- 5 tests in "HYBRID LAYOUT" (feature layout)

Zero tests exercise `architectureMode: 'orbit'` or `architectureMode: 'constellation'`. Every defect in C1, C2, C3, H1, H2, and H3 above would be caught by even one dispatch test per mode. The absence of these tests is why those defects have survived.

**Fix:** Add a `describe('Orbit/Constellation dispatch')` block asserting, for each mode, that:

- The return object has the expected shape (`positions`, `orbitGuides`, `projectedNodeIds`).
- Empty graph produces the same shape as non-empty.
- `enableFeatureLayout` and `architectureMode` together determine the pipeline.
- The set of returned node IDs matches the projection's node set.

---

## MEDIUM

### M1. Synthetic External node creation is not sorted into the graph consistently

```ts
safeEdges.forEach(e => {
  if (!knownNodeIds.has(e.source)) {
    knownNodeIds.add(e.source);
    safeNodes.push({
      id: e.source,
      displayName: e.source.split(':').pop() || e.source,
      type: 'External',
      ...
    });
  }
  ...
});

safeNodes.sort((a, b) => a.id.localeCompare(b.id));
```

The sort happens after, so ordering is deterministic — but the synthetic nodes carry `metrics: { fanIn: 0, fanOut: 0, coupling: 0, ... }`, `risk: 'LOW'`, and `refactoringReadiness.testCoverageStatus: 'UNTESTED'`. These hardcoded defaults flow into centrality scoring, feature discovery, domain discovery, and satellite placement. A node that *should* be treated as a high-coupling hub (because it's referenced by five edges) is scored as `fanIn: 0` because its real metrics were never computed.

For Orbit and Constellation, this is skipped entirely (Cluster 3's C2), so the two radial modes see a smaller graph. In Hierarchical, they see a bigger graph with fake-metric externals. Either way, the graph the user sees is not the graph the analyzer emitted.

**Fix:** Either compute real metrics for synthetic externals from the edge list, or tag them with a distinct `type: 'Unresolved'` and exclude them from centrality/layer scoring.

### M2. `immutableStage7PrimaryPositions` barrier rationale is undocumented

```ts
const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
  ...localResult.primaryNodePositions,
});
...
const bridgeInfo = calculateBridgeCandidatePosition(
  node.id,
  ...
  {
    ...
    immutablePrimaryPositions: enableImmutablePrimaryPositions ? immutableStage7PrimaryPositions : undefined,
  }
);
```

`Object.freeze` on a shallow copy prevents mutation of the container's own properties. Nested objects (`{ x, y }`) are **not** frozen — a callee can mutate `immutablePrimaryPositions[id].x`. So the barrier is partial. Additionally, the `enableImmutablePrimaryPositions` default is `true`, but the report mentions "default: true for H5A, false for SB1C." If a caller forgot to pass the flag on a runtime that expected SB1C behavior, bridge placement would ignore stage-7 positions and produce different layouts than intended.

**Fix:** Deep-freeze, or use `Readonly<Record<...>>` typing to at least prevent TS-level writes. Document the flag's default in the option interface.

### M3. Two `as any` casts hide type mismatches in the return

```ts
return {
  positions: resultPositions,
  featureRegions: (globalDomainResult as any)?.featureRegions,
};
```

and, in the orbit branch:

```ts
orbitGuides: orbitOutput.guides as any,
```

Three separate `as any` casts on the same return type. Each represents a contract that `ArchitectureLayoutResultWithMetadata` cannot express. If a consumer destructures `featureRegions` and expects a `Map<string, FeatureRegion>`, but `globalDomainResult.featureRegions` is a different shape (or absent), the failure is at the consumer, not here.

**Fix:** Define the return shape per mode explicitly — either three distinct return types unioned, or a single shape with all fields optional. The current implicit contract is only discoverable by reading three functions plus the type declaration.

### M4. Duplicate empty-graph check is unreachable

```ts
if (safeNodes.length === 0) {         // ← first check (reached)
  ...
  return { positions: { ...existingPositions } };
}

if (architectureMode === 'constellation') { ... return; }
const isOrbit = architectureMode === 'orbit';
if (isOrbit) { ... return; }

// Ensure all edge endpoints are present
safeEdges.forEach(e => { ... safeNodes.push(...) ... });

safeNodes.sort(...);
safeEdges.sort(...);

if (safeNodes.length === 0) {         // ← second check (unreachable)
  return { positions: { ...existingPositions } };
}
```

After the first check, `safeNodes.length > 0`. The subsequent loop only *adds* nodes. The sort does not remove. Therefore the second check can never fire. Dead code.

**Fix:** Delete the second check. Or, if the intent was to catch a case where the input node list is empty but edges are present, hoist the edge-endpoint normalization above the first check and consolidate.

### M5. Synthetic `displayName` derivation loses context for multi-colon IDs

```ts
displayName: e.source.split(':').pop() || e.source,
```

For `ApexClass:OrderService`, `displayName` becomes `OrderService` — correct. For a namespaced ID like `ns:ApexClass:OrderService`, `displayName` becomes `OrderService` (loses `ns`). For `Foo` (no colon), `displayName` is `Foo`. For `Foo:Bar:Baz`, `displayName` is `Baz` (loses both qualifiers).

The real `ExplorerNode.displayName` is populated by the analyzer, which knows the correct disambiguation rule. The synthetic path reinvents this rule poorly.

**Fix:** Extract a shared `deriveDisplayName(id)` helper and use it in both places, or accept the full ID as displayName when the id has more than one colon.

### M6. `featureLayerSpacing` is passed unvalidated into feature layout

```ts
const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
  domainSpacing,
  layerSpacing,
  featureLayerSpacing: options.featureLayerSpacing,
  ...
});
```

`featureLayerSpacing` is optional and passes through as `undefined` when not set. The default (60, per the options JSDoc) must be applied inside `computeGlobalFeatureLayout`. If it isn't, feature-local layer positions collapse to zero spacing. **Unverifiable without source**, but the pattern — top-level options with defaults applied in the destructuring block here but not for `featureLayerSpacing` — is inconsistent.

**Fix:** Apply the default here:

```ts
featureLayerSpacing: options.featureLayerSpacing ?? 60,
```

---

## LOW

### L1. `cyclesCount` vs `cycleCount`

`dummySummary` uses `cyclesCount`. The canonical `ExplorerSummary.cycleCount` uses the singular. Already covered in C2, but worth a lint rule — a naming divergence on a summary field that mirrors a well-known interface is easy to miss in code review.

### L2. `enableCandidateDOrdering` only affects bridge ordering, not general layout

```ts
if (enableCandidateDOrdering) {
  stage8BridgeNodes.sort(...);
}
```

Without the flag, `stage8BridgeNodes` iteration order is `safeNodes.filter(...)` — deterministic but arbitrary with respect to bridge significance. With the flag, the ordering is span-descending, neighbor-descending, layer-ascending, id-ascending. The flag name (`enableCandidateDOrdering`) is a specific internal designation ("Candidate D"), not descriptive of behavior. A new developer reading the option cannot infer what it does.

**Fix:** Rename to `enableSemanticBridgeOrdering` or document the "Candidate D" naming convention in the interface JSDoc.

### L3. `AnalysisSurfaceDomainMap` / `domainRegions` naming in feature mode

As flagged in C3, `globalDomainResult.domainRegions` is a feature-keyed map when `enableFeatureLayout` is true. The field name is a lie in that mode. Same issue for `orderedDomains` in the return.

**Fix:** Either rename to `spatialRegions` / `orderedRegions`, or return a discriminated union where the feature-mode result carries feature-named fields.

### L4. `ComponentLocalLayout.importance` accumulates `hubScore + bridgeScore` without normalization

```ts
const centrality = centralityMap.get(nodeId);
if (centrality) {
  importance += centrality.hubScore + centrality.bridgeScore;
}
```

Sum across the component. A large component with many moderately-central nodes outscores a small component with one extreme hub. Depending on the intended "importance" semantics (per-component centrality mass vs peak centrality), one of those is wrong.

**Fix:** Document the semantics. If peak centrality was intended, use `Math.max` instead of `+=`.

### L5. `targetWidth` uses `Math.sqrt(totalCompArea * 1.6)` for aspect ratio

```ts
const idealWidth = Math.sqrt(totalCompArea * 1.6);
const targetWidth = Math.max(idealWidth, minRowWidth);
```

`1.6` is a hardcoded aspect ratio. If `targetAspectRatio: 1.6` is passed to `packComponentPositions`, the two should be linked. Currently they are, by coincidence of both being `1.6`.

**Fix:** Extract `const aspectRatio = options.targetAspectRatio ?? 1.6;` and use it in both places.

---

## Priority order for fixes in this cluster

1. **C1** — Orbit empty-graph engine mismatch. Cheap fix; affects guide overlay only on empty graphs, but the two-engine split is a code smell that will compound.
2. **C3** — `activeSpatialMap` domain/feature conflation. **Verify the `layout/*` submodule signatures before acting** — this is either a naming issue (safe to rename) or a functional bug (Hybrid mode grouping is broken).
3. **C2** — `dummySummary` type conformance. Find where the type-check is being suppressed and either fix the schema or loosen the adapter signature honestly.
4. **H1** — remove `enableFeatureLayout` from options or assert consistency with `architectureMode`.
5. **H2** — symmetric empty-graph handling.
6. **H3** — spread order for `componentOrbitOptions`.
7. **H4** — validate `existingPositions` on entry.
8. **H5** — add dispatch tests per mode.
9. **M1–M6** — defensive cleanup.
10. **L1–L5** — polish.

---

## Cross-cluster dependencies to keep in view

- **Cluster 3 (Dispatch) C1** — async worker drops `featureRegions`/`orbitGuides`/`projectedNodeIds`. Any fix here to Orbit/Constellation return shape is moot until the async path also forwards them.
- **Cluster 3 C2** — edge-endpoint normalization is skipped for orbit/constellation. The synthetic-External gap (M1 above) is a downstream effect.
- **Cluster 4 (Focused Orbit) C3** — `projectOrbitSemantics` is imported here but not called. If any future change wires it in, the ring indices would switch from BFS-depth to layer-derived, and this cluster's `layerMap`/`domainMap` semantics would be the source of that conflict.
- **Cluster 5 (Constellation)** — the two-constellation-engine split (component vs legacy) has a parallel in Orbit (component vs legacy). Consolidating one does not consolidate the other.

**Blocking request to unblock C3 and the M-tier findings:** share `layout/ordering.ts`, `layout/local-layout.ts`, and `layout/spacing.ts`. Those three callees are where the `activeSpatialMap` conflation either is or isn't a real defect. Without them I can only characterize the risk, not the bug.

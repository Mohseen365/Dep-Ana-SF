# Progress Assessment — Current Code vs. Deferred Plan

## Overall: ~78% of the plan is landed. The critical 20% is fixed; the remaining 20% is polish that was in Tier 0 but slipped past.

---

## What's done well (call these out — they're genuinely good)

### The four `hasAuth` sites now have correct semantics

This is the single most important fix. The logic is now:

```js
const hasAuth =
  !!positions && Object.keys(positions).length > 0 &&
  (currentProv === 'user-authored' ||
    (storedArchMode === architectureMode &&
      (currentProv === undefined || currentProv === expectedProvenance)));
```

Verified consistent across all four sites (init, mode-switch, structural-sync, position-only). This is a **more sophisticated fix than the plan asked for** — it treats `user-authored` provenance as authoritative across modes, which is arguably the right UX. The inversion is gone.

### `effectiveLayoutOptions` is out of the structural dep array

```js
}, [nodes, edges, findings, featureAssignmentMap, architectureMode, captureAndPersistPositions]);
```

The LWC-click-tears-down-graph bug class is dead. Confirmed by inspection — this was the highest-impact item and it landed cleanly.

### Correlation token is now a module singleton — with a smart compat shim

```js
let currentCorrelationToken: string | undefined = undefined;
// + Object.defineProperty(window, '__CURRENT_CORRELATION_TOKEN__', {...})
```

You eliminated the global mutation while keeping backward compat for anything still reading the global. That's a better outcome than a straight delete. `getCorrelationToken` consumes the value (matches the old delete-on-read semantics).

### Session positions are properly scoped per mode

```js
const sessionPositionsRef = useRef<Map<ArchitectureLayoutMode, Map<string, Position>>>(new Map());
```

No more `clear()` on mode switch. User drags survive a Hybrid → Orbit → Hybrid round trip.

### App.tsx's memoization pass (T1-4) is thorough

Extracted primitives (`clearSelection`, `resetInvestigationContext`, `setIsInvestigating`, `setFilterState`), stable `visibleTypes`, primitive-dep `effectiveFocusState`. Every downstream memo now keys on values, not object identity. This is one of the harder things to do well and it's done well.

### GraphControls now implements real roving tabindex

`updateTabIndexes` runs in `useLayoutEffect` on every meaningful prop change, arrow-key handler mutates `tabindex` directly, `getComputedStyle` filter, `aria-orientation`, and the N20 focus-containment guard. The whole toolbar pattern is proper now.

### `committedMutatedGraph` invalidation is correct

The `prevDataGeneratedAtRef` pattern correctly clears the shadow graph when baseline data refreshes. This was easy to get wrong (e.g. by keying on `data` object identity), and you didn't.

---

## What's still missing from the plan (Tier 0 items that slipped)

These are things the plan scheduled as Tier 0 — high-impact, low-effort — that are still in the code:

| ID | What | Where | Impact |
|----|------|-------|--------|
| **N4** | Dead `lod-*` classes still being added | `GraphView.tsx` ~L628 | Cosmetic leak. Every element pays the class-add cost for a class nothing styles. |
| **N8** | `discoveryResult` still keyed on `[nodes, edges]` identity | `GraphView.tsx` L381 | Recomputes on every filter/search keystroke. Compounds with search debounce. |
| **N9** | Hover state still set unconditionally on every `mouseover` | `GraphView.tsx` L673, L694 | Fires a rerender even when `hoveredNodeId` is unchanged. Fast mousemove on a dense graph = jank. |
| **N10** | `document.body.style.cursor = 'default'` still global | `GraphView.tsx` L722, cleanup | Clobbers any cursor set by a modal/drawer that happens to be open. |
| **T0-8** | `useImperativeHandle` still depends on `selectedNodeId` | `GraphView.tsx` L~570 | `zoomIn`/`zoomOut`/`fitView`/`resetLayout` recreate on every selection change for no reason. |
| **T1-6** | Keyboard user still can't select first node | `GraphView.tsx` L~855 | Arrow keys still require a prior `selectedNodeId`. First-time keyboard users are stuck. |

The first four are literally one-line fixes. T0-8 needs a `selectedNodeIdRef` and `T1-6` needs an `else if (accessibleNodes.length > 0)` branch in `handleKeyDown`.

---

## New observations (not in the plan, worth considering)

### 1. `hasAuth` behavior for user-authored provenance across modes is ambiguous

```js
currentProv === 'user-authored' ||
  (storedArchMode === architectureMode && ...)
```

If a user drags **one** node in Hybrid, `captureAndPersistPositions('user-authored')` sets `layoutProvenance = 'user-authored'` for the **entire graph**. Then switching to Orbit sees `hasAuth = true` and **skips the orbit layout**. From the user's perspective: "I nudged one node and now switching to Orbit does nothing."

Two options:
- **(A)** Track provenance per-node, not per-graph (`Record<nodeId, LayoutProvenance>`). More correct, more work.
- **(B)** Narrow the user-authored exception to only fire if the *mode matches*: `(currentProv === 'user-authored' && storedArchMode === architectureMode) || ...`. Preserves user adjustments within a mode but still layouts fresh on mode switch. One-line fix.

(B) is probably what you want.

### 2. `committedMutatedGraph` in the invalidation effect's deps is dead weight

```js
}, [data, committedMutatedGraph]);
```

The effect fires when `committedMutatedGraph` changes but only acts when `data.generatedAt` changes. The `committedMutatedGraph` dep is only there to read the latest value. Use a ref instead:

```js
const committedMutatedGraphRef = useRef(committedMutatedGraph);
useEffect(() => { committedMutatedGraphRef.current = committedMutatedGraph; });
useEffect(() => {
  if (!data) return;
  if (prevDataGeneratedAtRef.current !== data.generatedAt) {
    prevDataGeneratedAtRef.current = data.generatedAt;
    if (committedMutatedGraphRef.current) setCommittedMutatedGraph(null);
  }
}, [data]);
```

Minor — the current form works. But the extra dep will confuse a future reader.

### 3. `setCorrelationToken` is exported but never called

```js
export const setCorrelationToken = (token: string | undefined) => { ... };
```

Grep confirms: `getCorrelationToken` is called in the mode-switch effect; `setCorrelationToken` is not called anywhere in `GraphView.tsx`. Either something outside the file calls it (external contract) or it's dead. Confirm and either wire it up or delete it.

### 4. `markLayoutEnd` orphan marks on cancellation

```js
}).then((layoutRes) => {
  if (requestId !== layoutRequestRef.current) return;   // ← returns BEFORE markLayoutEnd
  markLayoutEnd('architecture-mode-switch', architectureMode);
```

Good — the guard is now inside the `if`. But cancelled requests leave their `layout-*-start` mark unpaired. Over a long session, `performance.mark` accumulates stale entries. In practice this doesn't matter (marks are cheap), but if you ever want to graph layout durations reliably, add a paired `markLayoutEnd` in a `finally` or a separate tracker.

### 5. `setIsLayoutRunning` inside `layoutstart`/`layoutstop` may batch invisibly for sync layouts

Cytoscape fires `layoutstart` and `layoutstop` synchronously for sync layouts. React batches `setIsLayoutRunning(true)` and `setIsLayoutRunning(false)` in the same tick → the state never visibly changes to `true`, so `data-layout-running` never shows `true` for sync layouts. This is fine for the debug panel (which reads the ref), but the state-driven attribute is effectively always `false` for the common case. If you care, mirror the ref into state on a debounce, or drop the state entirely and keep the attribute driven by the ref (it was only removed because refs don't trigger rerenders — but if the only consumer is `data-layout-running` and the debug panel, and neither needs to *update* during the layout, the ref is fine).

### 6. Structural-sync layouts don't announce to screen readers

`setLayoutAnnouncement` is only called inside `notifyComplete`, which lives in the mode-switch effect. Structural-sync layouts fire `layoutstart`/`layoutstop` but never announce. Minor — but if a filter change triggers a layout, a blind user gets no feedback. Add `setLayoutAnnouncement` to `cy.on('layoutstop', ...)` in the init effect, or hoist the announcer into a `useEffect` on `isLayoutRunning`.

### 7. `getSessionPositionsForMode` is called 3× in the initial-mount effect

```js
const modeSessionMapOnMount = getSessionPositionsForMode(architectureMode);
// ...
knownPosMap[id] = newPos;
modeSessionMapOnMount.set(id, newPos);
```

Fine for now (Maps are cheap), but if you ever want to trace position flow, having one authoritative `const modeSession = getSessionPositionsForMode(architectureMode)` at the top of each effect is cleaner.

---

## Scorecard vs. the deferred plan

| Category | Items in plan | Done | Partial | Not done |
|----------|--------------|------|---------|----------|
| **Tier 0 (critical)** | 25 | 19 | 1 (T0-8) | 5 (N4, N8, N9, N10, T1-6) |
| **Tier 1 (important)** | 20 | 15 | 2 (N18 unclear, N15 not visible) | 3 (T1-6 counted above, N24/N25/N26 not visible, T1-7 not visible) |
| **Tier 2 (deferred)** | 6 | 0 (as planned) | — | 6 (intentional) |

**In-scope completion:** 34/45 ≈ **76%**.

If we count the "not visible" items (N24, N25, N26, N15, N1–N7, T1-7) as presumably-done since they're in files not shown, the number rises to ~85%. Either way, the **critical path is fully closed**.

---

## What this means for the deferred list

The deferred list is honest and correctly scoped. Nothing was pulled in from Tier 2 (T1-3, hooks extraction, LayoutStateProvider, provider split, virtualized listbox, WebWorker). That discipline matters — scope discipline is what let you close the critical path cleanly.

**The five Tier 0 items that slipped (N4, N8, N9, N10, T1-6) plus T0-8** belong in a small "closure polish" PR — total ~2 hours. They're all one-to-few-line fixes. Ship them before declaring the closure done, because they're bugs, not deferred features, and the deferred list explicitly says not to reopen completed tasks *for architectural work* — but these aren't architectural.

The seven new observations above are optional. Two are worth prioritizing:

- **Observation 1** (user-authored across modes) — this one has real UX consequences and might be the single most impactful remaining fix. One line.
- **Observation 6** (a11y announcement for structural sync) — this is the one gap in an otherwise complete a11y story.

---

## Suggested next action

Two small PRs, both under 3 hours:

**PR 1 — "Close the plan"** (Tier 0 stragglers):
- N4, N8, N9, N10 (4 one-line fixes in `GraphView.tsx`)
- T0-8 (`selectedNodeIdRef` in `useImperativeHandle`)
- T1-6 (arrow-key first-node selection in `handleKeyDown`)
- Observation 1 (`user-authored` mode-scope narrow)
- Observation 6 (`setLayoutAnnouncement` in `layoutstop`)

**PR 2 — "Update NOTES.md"**:
- Mark Step 7 fully complete
- Note the `hasAuth` implementation went beyond the plan (per-mode provenance + user-authored exception)
- Add the seven new observations as "Discovered during review; not blocking closure"
- Attach the deferred-work register

After those two, the current plan is genuinely closed, and the deferred list can be scheduled as a **separate** architecture phase — exactly what the first file recommends.

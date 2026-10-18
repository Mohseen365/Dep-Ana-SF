# Task Prompt — Wave 1 Lane B: GraphView Engine & Position Authority

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane B: GraphView Engine & Position Authority**. Your objective is to resolve position authority bugs, fix layout effect dependencies, implement per-mode session position scoping, and clean up GraphView engine state.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/lib/layout/positions.ts`
  - `explorer/src/lib/position-policy.ts`
  - `explorer/src/components/GraphView.test.tsx`
  - `explorer/src/components/GraphView.positionAuthority.test.tsx`
  - `explorer/src/lib/layout/__tests__/position-policy.test.ts`
- **Out of Scope:** Do NOT touch files owned by other lanes (`graph-style.ts`, `App.tsx`, `GraphControls.tsx`, `WorkspaceHeader.tsx`, `explorer.ts`).
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks & Intra-Lane Gate S2

### Phase 1: Pre-Gate S2 Tasks
1. **`[N4]` Dead `lod-*` CSS Class Removal:** Clean up obsolete level-of-detail CSS class assignments in `GraphView.tsx`.
2. **`[N8]` Fingerprint Memoization:** Memoize `discoveryResult` fingerprints to prevent extraneous re-renders.
3. **`[N9]` Hover State Guard:** Add diff-check guard to hover state updates.
4. **`[N10]` `mouseleave` Reset:** Scope cursor reset on `mouseleave` to the GraphView container element.
5. **`[T0-1]` Position Authority Inversion Fix (GATE S2 CRITICAL):**
   - In `GraphView.tsx`, fix the four layout effects where `hasAuth` evaluates to `true` on automatic/static layout modes due to `storedArchMode === architectureMode` or default fallbacks. Ensure user-authored positions are protected while allowing automatic layout recalculation on mode switch or stale position data.
   - **Validation:** Run `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx`.

### Phase 2: Post-Gate S2 Tasks (Unlock after T0-1 passes)
6. **`[N16]` Delete `mode` Parameter:** In `explorer/src/lib/layout/positions.ts`, remove `mode` from `ResolvePositionOptions`.
7. **`[N17/T0-6]` Mandatory `hasAuth` Parameter:**
   - In `explorer/src/lib/layout/positions.ts`, make `hasAuth` a required boolean property without default `hasAuth = true`. Update all call sites in `GraphView.tsx` to explicitly pass `hasAuth`.
8. **`[T1-1]` Per-Mode `sessionPositionsRef` Scoping:** Key session positions by architecture mode (`sessionPositionsRef.current[archMode]`) to prevent cross-mode position contamination.
9. **`[T0-2]` Dependency Array Cleanup:** Remove `effectiveLayoutOptions` from structural layout effect dependency arrays.
10. **`[T0-3]` `markLayoutEnd` Guard:** Guard async layout completion against superseded/stale correlation tokens.
11. **`[T0-4]` `window.__CY__` Dev Gating:** Gate `window.__CY__` global exposure behind `import.meta.env.DEV || (window as any).__EXPOSE_CY__`.
12. **`[T0-5]` Reduced Motion Dep Array:** Fix `prefersReducedMotion` dependency array completeness in GraphView hooks.
13. **`[T0-7]` `data-layout-running` Attribute:** Reflect `isLayoutRunning` state on container DOM element as `data-layout-running="true|false"`.
14. **`[T0-8]` Selection Ref Decoupling:** Decouple `useImperativeHandle` selection ref from layout re-render state.
15. **`[T1-2]` Correlation Token Ref:** Track correlation token in `window.__CURRENT_CORRELATION_TOKEN__` singleton ref.
16. **`[T1-5]` Static Mode `cy.autolock(true)`:** Enforce `cy.autolock(true)` when in static layout mode.
17. **`[T1-6]` Keyboard Selection:** Select initial node when navigating graph with arrow keys.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/GraphView.test.tsx src/components/GraphView.positionAuthority.test.tsx src/lib/layout/__tests__/position-policy.test.ts
```

---

## Reporting Requirement
Upon completion, create `LANE_B_GRAPHVIEW_ENGINE_REPORT.md` documenting modified files, tests executed, S2 gate verification, and results observed.

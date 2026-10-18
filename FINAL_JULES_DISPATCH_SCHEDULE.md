# Final Jules Dispatch Schedule — Wave 1 Coordinator Execution

## Executive Summary

- **Wave Status:** Wave 0 Coordinator Preparation Complete
- **Coordinator Verdict:** `READY WITH SEQUENCING CONSTRAINTS`
- **Total Concurrent Lanes:** 6 parallel lanes (Lanes A, B, C, D, E, F)
- **Total Active Planned Tasks:** 46 tasks across 6 lanes (1 deferred: T1-3)
- **Total Planned Effort:** 108 hours
- **Critical Path Duration:** 44 hours (Lane B pacing duration)
- **File Ownership Integrity:** 100% strict file write isolation (0 overlapping file write targets across lanes)
- **Protected File Status:** `./last_commit_changes.txt` SHA-256 `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb` (verified intact)

---

## 1. Repository & Baseline Summary

| Property | Recorded Baseline Evidence |
|---|---|
| **Repository Root** | `/app` (Dependency Analyzer) |
| **Operating System** | Linux devbox 6.8.0 x86_64 |
| **Current Branch** | `jules-11442066270201862121-1ffaef95` |
| **Commit HEAD** | `6aaa60bd447f2eb5eb1042456559c2c78d818235` |
| **Git Working Tree** | Clean (`nothing to commit, working tree clean`) |
| **Protected File** | `./last_commit_changes.txt` (SHA-256: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`) |
| **CLI Validation** | `npm run test:cli` — 31/31 scripts passed, 184 assertions passed |

---

## 2. File Ownership Matrix & Concurrency Boundaries

To guarantee safe parallel execution across 6 concurrent Jules tasks, file write authority is partitioned strictly 1:1. No two lanes may write to the same file.

| Target Source / Test File | Owning Lane | Read Access by Other Lanes | Write Access | Concurrency Limitation |
|---|---|---|---|---|
| `explorer/src/lib/graph-style.ts` | **Lane A** | None | Lane A Only | Isolated Concurrent Write |
| `explorer/src/lib/graph-builder.ts` | **Lane A** | None | Lane A Only | Isolated Concurrent Write |
| `explorer/src/lib/__tests__/graph-style.test.ts` | **Lane A** | None | Lane A Only | Isolated Concurrent Write |
| `explorer/src/lib/__tests__/graph-builder.test.ts` | **Lane A** | None | Lane A Only | Isolated Concurrent Write |
| `explorer/src/components/GraphView.tsx` | **Lane B** | Read-only | Lane B Only | Isolated Concurrent Write |
| `explorer/src/lib/layout/positions.ts` | **Lane B** | Read-only | Lane B Only | Intra-lane Gate S2 |
| `explorer/src/lib/position-policy.ts` | **Lane B** | Read-only | Lane B Only | Isolated Concurrent Write |
| `explorer/src/components/GraphView.test.tsx` | **Lane B** | None | Lane B Only | Isolated Concurrent Write |
| `explorer/src/components/GraphView.positionAuthority.test.tsx` | **Lane B** | None | Lane B Only | Isolated Concurrent Write |
| `explorer/src/lib/layout/__tests__/position-policy.test.ts` | **Lane B** | None | Lane B Only | Intra-lane Gate S2 |
| `explorer/src/App.tsx` | **Lane C** | Read-only | Lane C Only | Isolated Concurrent Write |
| `explorer/src/hooks/useViewState.ts` | **Lane C** | Read-only | Lane C Only | Isolated Concurrent Write |
| `explorer/src/components/Sidebar.tsx` | **Lane C** | Read-only | Lane C Only | Isolated Concurrent Write |
| `explorer/src/components/Sidebar.test.tsx` | **Lane C** | None | Lane C Only | Isolated Concurrent Write |
| `explorer/src/components/GraphControls.tsx` | **Lane D** | Read-only | Lane D Only | Isolated Concurrent Write |
| `explorer/src/components/GraphControls.test.tsx` | **Lane D** | None | Lane D Only | Isolated Concurrent Write |
| `explorer/src/components/workspace/WorkspaceHeader.tsx` | **Lane E** | Read-only | Lane E Only | Isolated Concurrent Write |
| `explorer/src/components/graph-internals/GraphErrorBoundary.tsx` | **Lane E** | Read-only | Lane E Only | Isolated Concurrent Write |
| `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | **Lane E** | Read-only | Lane E Only | Isolated Concurrent Write |
| `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | **Lane E** | Read-only | Lane E Only | Isolated Concurrent Write |
| `explorer/src/types/explorer.ts` | **Lane F** | Read-only | Lane F Only | Isolated Concurrent Write |
| `explorer/src/lib/layout/arch-mode.ts` | **Lane F** | Read-only | Lane F Only | Isolated Concurrent Write |
| `NOTES.md` | **Lane F** | Read-only | Lane F Only | Isolated Concurrent Write |
| `explorer/src/test/setup.ts` | **Lane F** | Read-only | Lane F Only | Isolated Concurrent Write |
| `explorer/src/types/__tests__/arch-mode-meta.test.ts` | **Lane F** | None | Lane F Only | Isolated Concurrent Write |

---

## 3. Six Lane Definitions

### Lane A — Graph Style & Builder Correctness
- **Objective:** Repair Cytoscape style typos, selector ordering, and element data definitions.
- **Assigned Scope (Tasks):** N1, N2, N3, N5, N6, N7 (12 hours effort).
- **Owned Files:** `graph-style.ts`, `graph-builder.ts`, `graph-style.test.ts`, `graph-builder.test.ts`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/lib/__tests__/graph-style.test.ts src/lib/__tests__/graph-builder.test.ts`
- **Output Report:** `LANE_A_GRAPH_STYLE_IMPLEMENTATION_REPORT.md`

### Lane B — GraphView Engine & Position Authority
- **Objective:** Remediate `hasAuth` position authority inversion in layout effects, clean up dead CSS, add layout guards, and implement per-mode session position scoping.
- **Assigned Scope (Tasks):** N4, N8, N9, N10, N16, N17/T0-6, T0-1, T0-2, T0-3, T0-4, T0-5, T0-7, T0-8, T1-1, T1-2, T1-5, T1-6 (44 hours effort).
- **Owned Files:** `GraphView.tsx`, `positions.ts`, `position-policy.ts`, and `GraphView` test suites.
- **Intra-Lane Gate S2:** Task `T0-1` (`hasAuth` inversion fix in `GraphView.tsx`) must land and pass tests before executing `N16`, `N17/T0-6` (in `positions.ts`), or `T1-1`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/GraphView.test.tsx src/components/GraphView.positionAuthority.test.tsx src/lib/layout/__tests__/position-policy.test.ts`
- **Output Report:** `LANE_B_GRAPHVIEW_ENGINE_REPORT.md`

### Lane C — App Pipeline & Search Optimization
- **Objective:** Add dev error logging in `useProjectSafe`, stabilize effect ref re-subscriptions, extract status helper, handle shadow graph invalidation, and debounce search.
- **Assigned Scope (Tasks):** N11, N12, N13, N14, T1-4, T1-7 (16 hours effort).
- **Owned Files:** `App.tsx`, `useViewState.ts`, `Sidebar.tsx`, `Sidebar.test.tsx`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/App.test.tsx src/components/Sidebar.test.tsx`
- **Output Report:** `LANE_C_APP_PIPELINE_IMPLEMENTATION_REPORT.md`

### Lane D — GraphControls Accessibility & Roving Focus
- **Objective:** Implement roving `tabIndex` for toolbar buttons, memoize focus state, add container focus guards, and attach ARIA toolbar orientation.
- **Assigned Scope (Tasks):** N18, N19, N20, T1-8, T1-9 (16 hours effort).
- **Owned Files:** `GraphControls.tsx`, `GraphControls.test.tsx`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/GraphControls.test.tsx`
- **Output Report:** `LANE_D_GRAPHCONTROLS_ACCESSIBILITY_REPORT.md`

### Lane E — WorkspaceHeader & Overlay Polish
- **Objective:** Add `aria-current="true"` on lens buttons, consolidate landmark roles, memoize domain click handlers, repair error boundary recovery, and fix tooltip ARIA role.
- **Assigned Scope (Tasks):** N15, N21, N22, N23, N24, N25, N26 (14 hours effort).
- **Owned Files:** `WorkspaceHeader.tsx`, `GraphErrorBoundary.tsx`, `EdgeHoverCard.tsx`, `FeatureOverlayCanvas.tsx`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/workspace/WorkspaceHeader.test.tsx src/components/graph-internals/GraphErrorBoundary.test.tsx`
- **Output Report:** `LANE_E_WORKSPACE_OVERLAY_IMPLEMENTATION_REPORT.md`

### Lane F — Architecture Mode Contracts & Types
- **Objective:** Extract `ARCH_MODE_META` to `arch-mode.ts`, derive mode cycle dynamically from `ARCH_MODE_ORDER`, update documentation notes, and set up test flag.
- **Assigned Scope (Tasks):** N27, N28, T0-9, T0-10 (6 hours effort).
- **Owned Files:** `explorer.ts`, `arch-mode.ts`, `NOTES.md`, `setup.ts`, `arch-mode-meta.test.ts`.
- **Validation:** `cd explorer && npm run typecheck && npm run lint && npx vitest run src/types/__tests__/arch-mode-meta.test.ts`
- **Output Report:** `LANE_F_ARCH_MODE_CONTRACTS_IMPLEMENTATION_REPORT.md`

---

## 4. Sequential Integration Protocol (Gate C)

When lanes complete implementation in their isolated worktrees, the coordinator integrates them sequentially in the following order:

1. **Integration Step 1 — Lane F:** Land type definitions and `ARCH_MODE_META` extraction. Run `npm run test:cli`.
2. **Integration Step 2 — Lane A:** Land Cytoscape graph styles and element builder corrections. Run `npm run test:cli`.
3. **Integration Step 3 — Lane D:** Land GraphControls accessibility and roving focus. Run `npm run test:cli`.
4. **Integration Step 4 — Lane E:** Land WorkspaceHeader and overlay polish. Run `npm run test:cli`.
5. **Integration Step 5 — Lane C:** Land App pipeline stabilization and search debouncing. Run `npm run test:cli`.
6. **Integration Step 6 — Lane B:** Land GraphView position authority engine remediations. Run `npm run test:cli`.
7. **Final Integration Verification:** Verify `./last_commit_changes.txt` SHA-256 remains `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb` and all 31 CLI test suites pass cleanly.

---

## 5. Stop Conditions & Escalation Triggers

A lane agent must immediately halt execution and request coordinator intervention if:
1. Any requirement would force editing a file outside its owned scope.
2. The protected file `./last_commit_changes.txt` is missing or its hash changes.
3. An existing passing test is broken and cannot be resolved within owned files.
4. An unresolvable TypeScript type contradiction arises between `explorer.ts` and component props.

# Wave 1 Jules Dispatch Manifest

## Coordinator Launch Summary

- **Wave Status:** READY FOR LAUNCH
- **Launch Mode:** 6 Concurrent Worktrees / Tasks
- **Coordinator Gate Status:** Gate A Cleared, Gate B Enforced, Gate C Ready
- **Protected File Baseline:** `./last_commit_changes.txt` SHA-256 `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`

---

## Lane Launch Matrix

| Lane ID | Objective | Launch Readiness | Assigned Scope (Tasks) | Primary Work Area | Dependencies | Output Report Path | Launch Blockers |
|---|---|---|---|---|---|---|---|
| **LANE_A** | Graph Style & Builder Correctness | `LAUNCH_READY` | N1, N2, N3, N5, N6, N7 | `explorer/src/lib/graph-style.ts`, `graph-builder.ts` | None | `LANE_A_GRAPH_STYLE_IMPLEMENTATION_REPORT.md` | None |
| **LANE_B** | GraphView Engine & Position Authority | `LAUNCH_READY` | N4, N8, N9, N10, N16, N17/T0-6, T0-1, T0-2, T0-3, T0-4, T0-5, T0-7, T0-8, T1-1, T1-2, T1-5, T1-6 | `explorer/src/components/GraphView.tsx`, `positions.ts` | Gate S2 (Internal) | `LANE_B_GRAPHVIEW_ENGINE_REPORT.md` | None |
| **LANE_C** | App Pipeline & Search Optimization | `LAUNCH_READY` | N11, N12, N13, N14, T1-4, T1-7 | `explorer/src/App.tsx`, `useViewState.ts`, `Sidebar.tsx` | None | `LANE_C_APP_PIPELINE_IMPLEMENTATION_REPORT.md` | None |
| **LANE_D** | GraphControls Accessibility & Roving Focus | `LAUNCH_READY` | N18, N19, N20, T1-8, T1-9 | `explorer/src/components/GraphControls.tsx` | None | `LANE_D_GRAPHCONTROLS_ACCESSIBILITY_REPORT.md` | None |
| **LANE_E** | WorkspaceHeader & Overlay Polish | `LAUNCH_READY` | N15, N21, N22, N23, N24, N25, N26 | `explorer/src/components/workspace/WorkspaceHeader.tsx` | None | `LANE_E_WORKSPACE_OVERLAY_IMPLEMENTATION_REPORT.md` | None |
| **LANE_F** | Architecture Mode Contracts & Types | `LAUNCH_READY` | N27, N28, T0-9, T0-10 | `explorer/src/types/explorer.ts`, `arch-mode.ts` | None | `LANE_F_ARCH_MODE_CONTRACTS_IMPLEMENTATION_REPORT.md` | None |

---

## Detailed Lane Manifest Entries

### Entry 1 — Lane A: Graph Style & Builder Correctness
- **Lane ID:** `LANE_A`
- **Objective:** Fix Cytoscape style typos (`lwc-apic` -> `lwc-apex`), correct risk border selector precedence, fix boolean `data.isTest` handling, and visually differentiate `Object` vs `CustomObject`.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N1`, `N2`, `N3`, `N5`, `N6`, `N7`
- **Owned Files:**
  - `explorer/src/lib/graph-style.ts`
  - `explorer/src/lib/graph-builder.ts`
  - `explorer/src/lib/__tests__/graph-style.test.ts`
  - `explorer/src/lib/__tests__/graph-builder.test.ts`
- **Dependencies:** None.
- **Output Report:** `LANE_A_GRAPH_STYLE_IMPLEMENTATION_REPORT.md`
- **Acceptance Criteria:** Zero TypeScript errors; unit tests in `graph-style.test.ts` and `graph-builder.test.ts` pass 100%.

### Entry 2 — Lane B: GraphView Engine & Position Authority
- **Objective:** Fix `hasAuth` inversion bug across layout effects in `GraphView.tsx`, enforce per-mode `sessionPositionsRef` scoping, remove fallback default `hasAuth = true` in `positions.ts`, and clean up dead CSS/memoization.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N4`, `N8`, `N9`, `N10`, `N16`, `N17/T0-6`, `T0-1`, `T0-2`, `T0-3`, `T0-4`, `T0-5`, `T0-7`, `T0-8`, `T1-1`, `T1-2`, `T1-5`, `T1-6`
- **Owned Files:**
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/lib/layout/positions.ts`
  - `explorer/src/lib/position-policy.ts`
  - `explorer/src/components/GraphView.test.tsx`
  - `explorer/src/components/GraphView.positionAuthority.test.tsx`
  - `explorer/src/lib/layout/__tests__/position-policy.test.ts`
- **Dependencies:** Intra-lane gate S2 (`T0-1` must be completed before `N16` and `N17/T0-6`).
- **Output Report:** `LANE_B_GRAPHVIEW_ENGINE_REPORT.md`
- **Acceptance Criteria:** `GraphView.positionAuthority.test.tsx` and `position-policy.test.ts` pass 100%; auto-layout triggers correctly on mode switch.

### Entry 3 — Lane C: App Pipeline & Search Optimization
- **Objective:** Add dev error logging in `useProjectSafe`, stabilize effect ref re-subscriptions, extract `isNotAnalyzed` helper, invalidate shadow mutated graph on data update, and debounce sidebar search.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N11`, `N12`, `N13`, `N14`, `T1-4`, `T1-7`
- **Owned Files:**
  - `explorer/src/App.tsx`
  - `explorer/src/hooks/useViewState.ts`
  - `explorer/src/components/Sidebar.tsx`
  - `explorer/src/components/Sidebar.test.tsx`
- **Dependencies:** None.
- **Output Report:** `LANE_C_APP_PIPELINE_IMPLEMENTATION_REPORT.md`
- **Acceptance Criteria:** `App.test.tsx` and `Sidebar.test.tsx` pass 100%; debounced search does not drop keystrokes.

### Entry 4 — Lane D: GraphControls Accessibility & Roving Focus
- **Objective:** Implement roving `tabIndex` for toolbar buttons, memoize focus state, add container focus guards, and set `aria-orientation`.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N18`, `N19`, `N20`, `T1-8`, `T1-9`
- **Owned Files:**
  - `explorer/src/components/GraphControls.tsx`
  - `explorer/src/components/GraphControls.test.tsx`
- **Dependencies:** None.
- **Output Report:** `LANE_D_GRAPHCONTROLS_ACCESSIBILITY_REPORT.md`
- **Acceptance Criteria:** Keyboard navigation via Arrow keys cycles through toolbar buttons with proper focus boundaries; `GraphControls.test.tsx` passes 100%.

### Entry 5 — Lane E: WorkspaceHeader & Overlay Polish
- **Objective:** Add `aria-current="true"` on lens buttons, consolidate landmark navigation roles, memoize domain click handlers, fix error boundary retry state, and fix tooltip ARIA role.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N15`, `N21`, `N22`, `N23`, `N24`, `N25`, `N26`
- **Owned Files:**
  - `explorer/src/components/workspace/WorkspaceHeader.tsx`
  - `explorer/src/components/graph-internals/GraphErrorBoundary.tsx`
  - `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
  - `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- **Dependencies:** None.
- **Output Report:** `LANE_E_WORKSPACE_OVERLAY_IMPLEMENTATION_REPORT.md`
- **Acceptance Criteria:** WAI-ARIA validation succeeds; unit tests in `WorkspaceHeader.test.tsx` and `GraphErrorBoundary.test.tsx` pass 100%.

### Entry 6 — Lane F: Architecture Mode Contracts & Types
- **Objective:** Extract `ARCH_MODE_META` to `arch-mode.ts`, derive mode cycle from `ARCH_MODE_ORDER` array, update documentation in `NOTES.md`, and add E2E bootstrap setup flag.
- **Readiness:** `LAUNCH_READY`
- **Assigned Scope:** `N27`, `N28`, `T0-9`, `T0-10`
- **Owned Files:**
  - `explorer/src/types/explorer.ts`
  - `explorer/src/lib/layout/arch-mode.ts`
  - `NOTES.md`
  - `explorer/src/test/setup.ts`
  - `explorer/src/types/__tests__/arch-mode-meta.test.ts`
- **Dependencies:** None.
- **Output Report:** `LANE_F_ARCH_MODE_CONTRACTS_IMPLEMENTATION_REPORT.md`
- **Acceptance Criteria:** `arch-mode-meta.test.ts` passes 100%; `ARCH_MODE_META` exports seamlessly without circular dependencies.

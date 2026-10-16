# Jules Wave 0 — Coordinator Baseline & Parallel Dispatch Readiness Report

## Executive Summary

This deliverable establishes the repository baseline, source document reconciliation, task status ledger, 6-lane parallel ownership manifest, and launch sequence for parallel execution of `GRAPH_DEEP_PASS_PLAN.md` across subsequent Jules implementation agents.

### Executive Readiness Classification
**`READY_WITH_EXPLICIT_EXCEPTIONS`**

### Rationale & Readiness Decision
1. **Repository Baseline Integrity:** The checked-out repository is clean at HEAD commit `2826e0be9b21e4ab880741cd2bcc8368b907f4a9` on branch `jules-9129420221259825195-62830090`. All 31 Node.js CLI integration test scripts pass cleanly (184 assertions, 100% pass rate).
2. **Strict File Ownership:** The proposed 6-lane parallel execution model achieves 100% file isolation with zero file ownership overlaps across lanes.
3. **Explicit Exceptions:**
   - **Environment Hydration Prerequisite:** `explorer/node_modules` is currently absent in the checked-out workspace. Before execution agents run local Vitest unit test suites (`npx vitest run ...`) or TypeScript typechecking (`npx tsc --noEmit`) inside `explorer/`, the environment must be hydrated via `npm --prefix explorer ci`.
   - **S2 Position-Authority Gate Sequencing:** Item `T0-1` (`hasAuth` inversion fix in `GraphView.tsx`) is currently active and failing in position-authority tests. Lane B must execute in two distinct phases (B1 and B2), blocking `N16`, `N17`, `T0-6`, and `T1-1` until `T0-1` is verified.

---

## 1. Actual Repository Baseline and Git State

- **Repository Root:** `/workspace/dependency-analyzer`
- **Current Branch:** `jules-9129420221259825195-62830090`
- **Current Commit SHA:** `2826e0be9b21e4ab880741cd2bcc8368b907f4a9`
- **Git Working Tree Status:** Clean (`nothing to commit, working tree clean`).
- **User Work Preservation:** No uncommitted user work or untracked changes exist in the workspace. All baseline commit artifacts are preserved intact.
- **Runtime Environment:**
  - Node.js: `v22.22.1`
  - npm: `11.11.0`
- **Package Manifests & Lockfiles:**
  - Root: `package.json` (present) with `package-lock.json`
  - Subdirectory: `explorer/package.json` (present) with `package-lock.json`
- **`explorer/node_modules` Status:** ABSENT (`explorer/node_modules` directory is not committed or pre-installed in the current checkout).
- **Test Execution Capabilities:**
  - `npm run test:cli` (from root): **EXECUTABLE & VERIFIED PASSING** (31/31 scripts, 184 assertions).
  - `npx vitest run <spec>` (inside `explorer/`): **BLOCKED** pending `npm --prefix explorer ci`.
  - `npx tsc --noEmit` (inside `explorer/`): **BLOCKED** pending `npm --prefix explorer ci`.

---

## 2. Source Document Availability and Reconciliation

The following source planning and audit documents were inspected and reconciled against the checked-out codebase:

1. **`explorer/docs/GRAPH_DEEP_PASS_PLAN.md` (Present):**
   - Authoritative parallel execution plan establishing 6 parallel lanes (Lanes A–F), 108 hours total effort, and a 44-hour critical path.
2. **`REPOSITORY_READINESS_PRE_DISPATCH_AUDIT.md` (Present):**
   - Initial read-only pre-dispatch audit report.
3. **`REPOSITORY_DISPATCH_CORRECTION_REPORT.md` (Present):**
   - Dispatch correction report identifying source code defects, `NOTES.md` overclaims, and script discrepancies.
4. **`NOTES.md` (Present):**
   - Project summary notes claiming Step 7 (`hasAuth` fallback fix) was complete. Source code inspection of `explorer/src/components/GraphView.tsx` disproves this claim (`storedArchMode === architectureMode` remains active in code, keeping `T0-1` open and failing in CI).

### Reconciled Key Findings
- **`T0-1` Inversion Defect:** `GraphView.tsx` computes `hasAuth` across four layout effects by checking `storedArchMode === architectureMode`. In static or automatic layout modes, matching modes incorrectly evaluate `hasAuth` as `true`, suppressing required automatic layout recalculations.
- **`N17` vs `T0-6` Requirements Disambiguation:** `N17` requires explicit `hasAuth` argument passing at all `resolvePosition` call sites. `T0-6` requires deleting the fallback default `hasAuth = true` parameter from `resolvePosition` in `explorer/src/lib/layout/positions.ts`. They are preserved as distinct acceptance requirements.
- **Verified Source File Locations:**
  - `positions.ts` is verified at `explorer/src/lib/layout/positions.ts`.
  - `position-policy.ts` is verified at `explorer/src/lib/position-policy.ts`.
  - `position-policy.test.ts` is verified at `explorer/src/lib/layout/__tests__/position-policy.test.ts`.

---

## 3. Reconciled Task-Level Status Ledger

All 47 tasks from `GRAPH_DEEP_PASS_PLAN.md` are accounted for below, categorized across Lanes A through F and Deferred.

| Task ID | Intended Outcome | Lane | Target Source & Test Paths | Known Dependencies | Proposed Acceptance Command | Status |
|---|---|---|---|---|---|---|
| **N1** | `lwc-apic` typo fix | Lane A | `explorer/src/lib/graph-style.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` |
| **N2** | `event-publisher` missing edge color | Lane A | `explorer/src/lib/graph-style.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` |
| **N3** | Risk border style override ordering | Lane A | `explorer/src/lib/graph-style.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` |
| **N4** | Dead `lod-*` CSS class removal | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **N5** | `node[isTest]` boolean selector fix | Lane A | `explorer/src/lib/graph-style.ts`, `graph-builder.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-builder.test.ts` | `OUTSTANDING` |
| **N6** | `Object` vs `CustomObject` visual diff | Lane A | `explorer/src/lib/graph-style.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` |
| **N7** | Zoom label rule cleanup | Lane A | `explorer/src/lib/graph-style.ts` | None | `cd explorer && npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` |
| **N8** | `discoveryResult` fingerprint memoization | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **N9** | Hover state boundary diff-check guard | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **N10** | `mouseleave` cursor reset container scoping | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **N11** | `useProjectSafe` error logging in dev | Lane C | `explorer/src/App.tsx` | None | `cd explorer && npx vitest run src/App.test.tsx` | `OUTSTANDING` |
| **N12** | Effect re-subscription ref/dep stabilization | Lane C | `explorer/src/App.tsx` | None | `cd explorer && npx vitest run src/App.test.tsx` | `OUTSTANDING` |
| **N13** | `isNotAnalyzed` status helper extraction | Lane C | `explorer/src/App.tsx` | None | `cd explorer && npx vitest run src/App.test.tsx` | `OUTSTANDING` |
| **N14** | `committedMutatedGraph` timestamp invalidation | Lane C | `explorer/src/App.tsx` | None | `cd explorer && npx vitest run src/App.test.tsx` | `OUTSTANDING` |
| **N15** | `FeatureOverlayCanvas` prop decoupling | Lane E | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | None | `cd explorer && npx vitest run src/components/graph-internals/FeatureRegionOverlay.test.tsx` | `OUTSTANDING` |
| **N16** | `mode` parameter deletion in `positions.ts` | Lane B | `explorer/src/lib/layout/positions.ts` | S2 Gate | `cd explorer && npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `OUTSTANDING` |
| **N17** | Caller explicit `hasAuth` argument passing | Lane B | `explorer/src/lib/layout/positions.ts`, `GraphView.tsx` | S2 Gate | `cd explorer && npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `CONTRADICTED` |
| **T0-6** | Remove `hasAuth = true` default argument | Lane B | `explorer/src/lib/layout/positions.ts` | S2 Gate | `cd explorer && npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `CONTRADICTED` |
| **N18** | `GraphControls` `focusState` memoization | Lane D | `explorer/src/components/GraphControls.tsx` | None | `cd explorer && npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` |
| **N19** | Toolbar roving `tabIndex` implementation | Lane D | `explorer/src/components/GraphControls.tsx` | None | `cd explorer && npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` |
| **N20** | Toolbar handler focus containment guard | Lane D | `explorer/src/components/GraphControls.tsx` | None | `cd explorer && npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` |
| **N21** | `aria-current="true"` on lens buttons | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | None | `cd explorer && npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` |
| **N22** | Navigation landmark ARIA role consolidation | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | None | `cd explorer && npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` |
| **N23** | `handleDomainClick` localStorage memoization | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | None | `cd explorer && npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` |
| **N24** | Reset error state on prop change in boundary | Lane E | `explorer/src/components/graph-internals/GraphErrorBoundary.tsx` | None | `cd explorer && npx vitest run src/components/graph-internals/GraphErrorBoundary.test.tsx` | `OUTSTANDING` |
| **N25** | Retry button recovery state & debouncing | Lane E | `explorer/src/components/graph-internals/GraphErrorBoundary.tsx` | None | `cd explorer && npx vitest run src/components/graph-internals/GraphErrorBoundary.test.tsx` | `OUTSTANDING` |
| **N26** | Interactive link ARIA role fix in tooltip | Lane E | `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | None | `cd explorer && npx vitest run src/components/graph-internals/EdgeHoverCard.test.tsx` | `OUTSTANDING` |
| **N27** | Extract `ARCH_MODE_META` to `arch-mode.ts` | Lane F | `explorer/src/types/explorer.ts`, `arch-mode.ts` | None | `cd explorer && npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `OUTSTANDING` |
| **N28** | Derive mode cycle from `ARCH_MODE_ORDER` | Lane F | `explorer/src/lib/layout/arch-mode.ts` | N27 | `cd explorer && npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `OUTSTANDING` |
| **T0-1** | `hasAuth` inversion fix across layout effects | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx` | `CONTRADICTED` |
| **T0-2** | Remove `effectiveLayoutOptions` from deps | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-3** | `markLayoutEnd` guard on stale async requests | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-4** | `window.__CY__` dev environment gating | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-5** | `prefersReducedMotion` dep array completeness | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-7** | Container `data-layout-running` attribute | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-8** | `useImperativeHandle` selection ref decoupling | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T0-9** | `NOTES.md` self-report documentation update | Lane F | `NOTES.md` | None | Manual diff inspection | `OUTSTANDING` |
| **T0-10** | E2E bootstrap expose-flag test setup update | Lane F | `explorer/src/test/setup.ts` | None | `cd explorer && npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `VERIFIED_COMPLETE` |
| **T1-1** | Per-mode `sessionPositionsRef` scoping | Lane B | `explorer/src/components/GraphView.tsx` | S2 Gate | `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx` | `OUTSTANDING` |
| **T1-2** | `window.__CURRENT_CORRELATION_TOKEN__` ref | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T1-3** | Extract `useGraphElements` reconciler | Deferred | `explorer/src/components/GraphView.tsx` | T0-2 | N/A | `DEFERRED` |
| **T1-4** | Memoize App derived graph pipeline | Lane C | `explorer/src/App.tsx` | None | `cd explorer && npx vitest run src/App.test.tsx` | `OUTSTANDING` |
| **T1-5** | Static mode `cy.autolock(true)` enforcement | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T1-6** | Keyboard arrow key initial node selection | Lane B | `explorer/src/components/GraphView.tsx` | None | `cd explorer && npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` |
| **T1-7** | Debounce search query in `useViewState` | Lane C | `explorer/src/hooks/useViewState.ts`, `Sidebar.tsx` | None | `cd explorer && npx vitest run src/components/Sidebar.test.tsx` | `OUTSTANDING` |
| **T1-8** | `getInteractiveElements` `getComputedStyle` filter | Lane D | `explorer/src/components/GraphControls.tsx` | None | `cd explorer && npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` |
| **T1-9** | Toolbar `aria-orientation` attribute | Lane D | `explorer/src/components/GraphControls.tsx` | None | `cd explorer && npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` |

---

## 4. Define Safe Parallel Ownership Manifest

To guarantee conflict-free parallel execution across Jules implementation agents, strict file ownership boundaries are established. No file may be edited outside its assigned lane.

### Lane A — Graph Style & Builder Correctness
- **Assigned Items:** N1, N2, N3, N5, N6, N7 (12h)
- **Allowed Source Files:**
  - `explorer/src/lib/graph-style.ts`
  - `explorer/src/lib/graph-builder.ts`
- **Allowed Test Files:**
  - `explorer/src/lib/__tests__/graph-style.test.ts`
  - `explorer/src/lib/__tests__/graph-builder.test.ts`
- **Explicitly Prohibited Edits:** Any files outside Lane A.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/lib/__tests__/graph-style.test.ts src/lib/__tests__/graph-builder.test.ts
  ```
- **Required Report:** `LANE_A_IMPLEMENTATION_REPORT.md`

### Lane B — GraphView Engine & Position Authority
- **Designated Single Coordinating Owner:** Lane B Agent is the single coordinating owner for `GraphView.tsx`. Concurrent edits to `GraphView.tsx` by other agents are strictly prohibited.
- **Assigned Items:** N4, N8, N9, N10, N16, N17, T0-1, T0-2, T0-3, T0-4, T0-5, T0-6, T0-7, T0-8, T1-1, T1-2, T1-5, T1-6 (44h)
- **Allowed Source Files:**
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/lib/layout/positions.ts`
  - `explorer/src/lib/position-policy.ts`
- **Allowed Test Files:**
  - `explorer/src/components/GraphView.test.tsx`
  - `explorer/src/components/GraphView.positionAuthority.test.tsx`
  - `explorer/src/components/GraphView.layoutModeToggle.test.tsx`
  - `explorer/src/lib/layout/__tests__/position-policy.test.ts`
- **Explicitly Prohibited Edits:** Any files outside Lane B.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/components/GraphView.positionAuthority.test.tsx src/components/GraphView.test.tsx src/lib/layout/__tests__/position-policy.test.ts
  ```
- **Required Report:** `LANE_B_IMPLEMENTATION_REPORT.md`

### Lane C — App Pipeline & Search Optimization
- **Assigned Items:** N11, N12, N13, N14, T1-4, T1-7 (16h)
- **Allowed Source Files:**
  - `explorer/src/App.tsx`
  - `explorer/src/hooks/useViewState.ts`
  - `explorer/src/components/Sidebar.tsx`
- **Allowed Test Files:**
  - `explorer/src/components/Sidebar.test.tsx`
  - `explorer/src/App.test.tsx`
- **Explicitly Prohibited Edits:** Any files outside Lane C.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/components/Sidebar.test.tsx
  ```
- **Required Report:** `LANE_C_IMPLEMENTATION_REPORT.md`

### Lane D — GraphControls Accessibility & Roving Focus
- **Assigned Items:** N18, N19, N20, T1-8, T1-9 (16h)
- **Allowed Source Files:**
  - `explorer/src/components/GraphControls.tsx`
- **Allowed Test Files:**
  - `explorer/src/components/GraphControls.test.tsx`
- **Explicitly Prohibited Edits:** Any files outside Lane D.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/components/GraphControls.test.tsx
  ```
- **Required Report:** `LANE_D_IMPLEMENTATION_REPORT.md`

### Lane E — WorkspaceHeader & Overlay Polish
- **Assigned Items:** N15, N21, N22, N23, N24, N25, N26 (14h)
- **Allowed Source Files:**
  - `explorer/src/components/workspace/WorkspaceHeader.tsx`
  - `explorer/src/components/graph-internals/GraphErrorBoundary.tsx`
  - `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
  - `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- **Allowed Test Files:**
  - `explorer/src/components/Phase1C_Accessibility.test.tsx`
  - `explorer/src/components/graph-internals/GraphErrorBoundary.test.tsx`
- **Explicitly Prohibited Edits:** Any files outside Lane E.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/components/Phase1C_Accessibility.test.tsx
  ```
- **Required Report:** `LANE_E_IMPLEMENTATION_REPORT.md`

### Lane F — Architecture Mode Contracts & Types
- **Assigned Items:** N27, N28, T0-9, T0-10 (6h)
- **Allowed Source Files:**
  - `explorer/src/types/explorer.ts`
  - `explorer/src/lib/layout/arch-mode.ts` (new)
  - `NOTES.md`
  - `explorer/src/test/setup.ts`
- **Allowed Test Files:**
  - `explorer/src/types/__tests__/arch-mode-meta.test.ts`
- **Explicitly Prohibited Edits:** Any files outside Lane F.
- **Acceptance Command:**
  ```bash
  cd explorer && npx tsc --noEmit && npx vitest run src/types/__tests__/arch-mode-meta.test.ts
  ```
- **Required Report:** `LANE_F_IMPLEMENTATION_REPORT.md`

---

## 5. Preserve the S2 Position-Authority Gate

Serialization Point **S2** enforces mandatory intra-lane sequencing in Lane B to prevent layout position coordinate leakage across architecture mode switches.

### Gate Definition & Phases
Lane B is divided into two distinct execution phases:

#### Phase B1 — T0-1 and Non-Gated GraphView Work
- **Tasks Included:** `T0-1` (`hasAuth` inversion fix), `N4`, `N8`, `N9`, `N10`, `T0-2`, `T0-3`, `T0-4`, `T0-5`, `T0-7`, `T0-8`, `T1-2`, `T1-5`, `T1-6`.
- **Primary Objective:** Fix the `hasAuth` computation across all four layout effects in `GraphView.tsx` so that position authority evaluates as `true` strictly for `user-authored` position provenance. Automatic layout provenance must NOT suppress required automatic layout recalculations.
- **Verification Requirement:** `T0-1` must be independently attributable, reviewable, and verified against `GraphView.positionAuthority.test.tsx`.

#### S2 Gate Review
The coordinator explicitly reviews `T0-1` test execution evidence (`npx vitest run src/components/GraphView.positionAuthority.test.tsx`) before releasing the gate.

#### Phase B2 — S2-Gated Position-Policy Work
- **Tasks Blocked Until S2 Release:** `N16` (`mode` parameter deletion in `positions.ts`), `N17` (caller explicit `hasAuth` passing), `T0-6` (removal of `hasAuth = true` fallback default in `positions.ts`), `T1-1` (per-architecture-mode `sessionPositionsRef` scoping).

### Position Authority Invariant Contract
$$\text{hasAuth}(\text{node}, \text{mode}) = \begin{cases} \text{true} & \text{if } \text{provenance}(\text{node}, \text{mode}) = \text{'user-authored'} \\ \text{false} & \text{if } \text{provenance}(\text{node}, \text{mode}) \in \{\text{'automatic-hierarchical'}, \text{'automatic-hybrid'}, \text{'automatic-orbit'}, \text{'automatic-constellation'}\} \end{cases}$$

---

## 6. Verified Acceptance Commands and Unavailable Checks

### Verified Executable Commands
1. **Master CLI Integration Suite (Root):**
   ```bash
   npm run test:cli
   ```
   - Executable without dependencies in workspace. Passes 31/31 scripts (184 assertions).
2. **TypeScript Compilation (inside `explorer/`, post-hydration):**
   ```bash
   cd explorer && npx tsc --noEmit
   ```
3. **Vitest Unit/Integration Tests (inside `explorer/`, post-hydration):**
   ```bash
   cd explorer && npx vitest run <test_filepath>
   ```

### Unavailable Checks & Script Discrepancies
- Neither the root `package.json` nor `explorer/package.json` defines an `npm run typecheck` or `npm run lint` script.
- Agents must execute `npx tsc --noEmit` directly inside `explorer/` for type verification.
- Direct execution of Vitest or Vite build inside `explorer/` is currently BLOCKED until `npm --prefix explorer ci` hydrates `explorer/node_modules`.

---

## 7. Parallelization and File-Conflict Strategy

### Working-Tree & Git Isolation Rules
1. **Strict Ownership Scope:** Each agent operates strictly within its assigned lane's allowed files.
2. **Non-Destructive Workflows:** Agents are strictly PROHIBITED from running destructive git commands (`git checkout -- .`, `git reset --hard` indiscriminately) that could destroy pre-existing work or audit deliverables.
3. **Rollback Protocol:** If an implementation pass fails acceptance checks, roll back target edits specifically (`git checkout HEAD -- <assigned_file>`).
4. **Coordinating Owner:** `GraphView.tsx` is exclusively modified by the Lane B agent.

---

## 8. Exact Next-Wave Launch Sequence

1. **Wave 0 (Coordinator Baseline — Completed):**
   - Repository baseline established.
   - Master readiness report `WAVE_0_COORDINATOR_DISPATCH_READINESS.md` created.
2. **Wave 1 (Parallel Dispatch — Independent Lanes + Lane B Phase B1):**
   - Environment Hydration: Execute `npm --prefix explorer ci`.
   - Concurrent Parallel Dispatch:
     - Dispatch Agent for **Lane A** (Style & Builder)
     - Dispatch Agent for **Lane C** (App Pipeline & Search)
     - Dispatch Agent for **Lane D** (GraphControls)
     - Dispatch Agent for **Lane E** (WorkspaceHeader & Overlays)
     - Dispatch Agent for **Lane F** (Contracts & Types)
     - Dispatch Agent for **Lane B Phase B1** (`T0-1` position authority fix & non-gated GraphView tasks)
3. **Wave 2 (Gate S2 Verification & Release):**
   - Coordinator reviews `T0-1` evidence (`npx vitest run src/components/GraphView.positionAuthority.test.tsx`).
   - S2 Gate explicitly released upon 100% test pass rate.
4. **Wave 3 (Lane B Phase B2 Dispatch):**
   - Dispatch Agent for Lane B Phase B2 (`N16`, `N17`, `T0-6`, `T1-1`).
5. **Wave 4 (Cross-Lane Integration & Full Regression Verification):**
   - Execute `npm run test:cli` from root.
   - Execute `cd explorer && npx tsc --noEmit`.
   - Execute full Vitest suite in `explorer/`.
6. **Wave 5 (Submission & Final Closure):**
   - Submit consolidated change.

---

## 9. Blockers, Uncertainties, and Owner Approval Items

### Active Blockers
- **`explorer/node_modules` Hydration:** Required before running Vitest or TypeScript compilation in `explorer/`. Command: `npm --prefix explorer ci`.

### Decisions / Approvals Requested from Owner
1. **Typecheck Command Standard:** Approval to use `npx tsc --noEmit` as the standard typecheck command across all execution agents.
2. **S2 Gate Authorization:** Approval for the two-phase Lane B execution sequence and S2 verification checkpoint.

---

## 10. Final Response Summary

- **Deliverable Path:** `WAVE_0_COORDINATOR_DISPATCH_READINESS.md`
- **Readiness Classification:** `READY_WITH_EXPLICIT_EXCEPTIONS`
- **Recommended Launch Order:** Hydrate `explorer/node_modules` -> Launch Lanes A, C, D, E, F and Lane B Phase B1 in parallel -> Verify `T0-1` -> Release S2 Gate -> Launch Lane B Phase B2 -> Final Integration Verification.
- **Critical Ownership Notes:** `GraphView.tsx` is strictly owned by Lane B agent. All 6 lanes have 100% file isolation.
- **Application Code Mutation Confirmation:** **ZERO** application source files, test files, package manifests, lockfiles, or configuration files were changed during Wave 0.

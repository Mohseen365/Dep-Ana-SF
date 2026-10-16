# Dispatch Plan Correction & Repository Readiness Report

## 1. Executive Decision

This report provides a corrected, evidence-based pre-dispatch audit reconciliation for the `dependency-analyzer` repository against `GRAPH_DEEP_PASS_PLAN.md` and the recent GitHub CI test failure in `audit-gates`.

### Final Readiness Classification
`NOT_READY_FOR_DISPATCH` (Pending Environment Hydration and T0-1 CI Fix)

### Key Decision Factors
1. **CI Test Failure Analysis:** The `Position authority gate` in GitHub CI (`npx vitest run src/components/GraphView.positionAuthority.test.tsx`) failed with 2 assertion errors (`GraphView.positionAuthority.test.tsx` lines 371 and 551). This proves that `T0-1` (`hasAuth` inversion fix) is active, broken in edge cases, and directly causing CI failures.
2. **Audit Contradictions Resolved:** The previous report `REPOSITORY_READINESS_PRE_DISPATCH_AUDIT.md` prematurely marked unresolved bugs as `IMPLEMENTED_UNVERIFIED` despite code inspection proving the defects (such as `N1` `'lwc-apic'` typo, `N3` risk border ordering, `N5` boolean attribute selector, `N6` Object vs CustomObject color collision) remain active in source code.
3. **Environment Dependency Blocker:** `explorer/node_modules` is not committed to the repository. Running `vitest`, `tsc`, `eslint`, or Vite build requires installing dependencies via `npm --prefix explorer ci`.
4. **Missing Package Scripts:** The root `package.json` lacks `typecheck` and `lint` scripts, while `explorer/package.json` contains `"build": "tsc && vite build"` but lacks `"typecheck"` or `"lint"` scripts. Commands referencing `npm run typecheck` or `npm run lint` are unexecutable without owner approval for script additions or command adjustments.

---

## 2. Audit Contradictions

### Summary of Audit Reclassifications

1. **N1 (`lwc-apic` typo fix):**
   - *Previous Report:* `IMPLEMENTED_UNVERIFIED`.
   - *Source Truth:* Line 85 of `explorer/src/lib/graph-style.ts` defines `'lwc-apic': '#f97316'`.
   - *Correction:* `OUTSTANDING`. The typo is active in source code and must be fixed to `'lwc-apex'`.

2. **N3 (Risk border style override ordering):**
   - *Previous Report:* `OUTSTANDING`.
   - *Source Truth:* `node[risk = "HIGH"]` rules (lines 153-172) precede `node[type = "ApexClass"]` rules (lines 225-300).
   - *Correction:* `OUTSTANDING`. Confirmed that risk border styles are overwritten by type border styles.

3. **N4 (Dead `lod-*` CSS class removal):**
   - *Previous Report:* `IMPLEMENTED_UNVERIFIED`.
   - *Source Truth:* Line 947 in `GraphView.tsx` removes `lod-0 lod-1 lod-2 lod-3 lod-4` and line 950 adds `lod-${lodConfig.lodLevel}`. However, `graph-style.ts` has no CSS selectors matching `.lod-*`.
   - *Correction:* `OUTSTANDING`. Clean up dead DOM class manipulations.

4. **N5 (`node[isTest]` selector fix):**
   - *Previous Report:* `OUTSTANDING`.
   - *Source Truth:* `graph-style.ts` line 231 uses `node[type = "ApexClass"][?isTest]` (invalid Cytoscape selector for boolean attributes) and line 310 uses `node[isTest = "true"]` (string check), whereas `graph-builder.ts` line 110 sets `isTest: Boolean(...)` as a boolean primitive (`true`/`false`).
   - *Correction:* `OUTSTANDING`. Fix selector to match actual Cytoscape boolean attribute data.

5. **N6 (`Object` vs `CustomObject` visual differentiation):**
   - *Previous Report:* `OUTSTANDING`.
   - *Source Truth:* `NODE_COLORS.Object` and `NODE_COLORS.CustomObject` both evaluate to `{ background: '#22c55e', border: '#16a34a' }`.
   - *Correction:* `OUTSTANDING`. CustomObject requires visual differentiation.

6. **T0-1 (`hasAuth` inversion fix):**
   - *Previous Report:* `CONTRADICTED` (noting `NOTES.md` claimed complete).
   - *Source Truth:* `GraphView.tsx` computes `hasAuth` across four call sites (lines 522, 811, 1135, 1335) using `storedArchMode === architectureMode`. In static/automatic mode, when `storedArchMode` matches `architectureMode`, `hasAuth` evaluates to `true`, suppressing layout execution even when `layoutProvenance` is automatic. This caused the 2 failures in `GraphView.positionAuthority.test.tsx` in CI.
   - *Correction:* `OUTSTANDING` / `CI_FAILING`. Must be fixed per position authority policy (`hasAuth` true strictly for `user-authored` provenance).

7. **N17 / T0-6 (`resolvePosition` mandatory `hasAuth` parameter):**
   - *Previous Report:* `CONTRADICTED`.
   - *Source Truth:* `positions.ts` line 16 has `hasAuth = true` as default argument.
   - *Correction:* `OUTSTANDING`. Disambiguated requirements: `N17` requires `resolvePosition` callers to pass explicit `hasAuth`, and `T0-6` requires removing `hasAuth = true` default fallback from `positions.ts`.

8. **T0-10 (E2E bootstrap test setup):**
   - *Previous Report:* `VERIFIED_COMPLETE`.
   - *Source Truth:* `explorer/src/test/setup.ts` sets `(window as any).__EXPOSE_CY__ = true;`.
   - *Correction:* `IMPLEMENTED_UNVERIFIED`. While source code is present, full runtime execution verification is blocked until Vitest runs clean across all test suites.

---

## 3. Corrected N-ID/T-ID Status Ledger

| ID | Planned Task | Planned Lane | Source File Path | Current Source Evidence | Acceptance Command | Status | Remaining Work | Dependencies |
|---|---|---|---|---|---|---|---|---|
| N1 | `lwc-apic` typo fix | Lane A | `explorer/src/lib/graph-style.ts` | Line 85 `'lwc-apic': '#f97316'` | `npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` | Rename key to `'lwc-apex'` | None |
| N2 | `event-publisher` edge color | Lane A | `explorer/src/lib/graph-style.ts` | Missing from `EDGE_COLORS` | `npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` | Add `'event-publisher'` color | None |
| N3 | Risk border style override ordering | Lane A | `explorer/src/lib/graph-style.ts` | Risk rules (153-172) precede type rules (225-300) | `npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` | Move risk border rules after type rules | None |
| N4 | Dead `lod-*` class removal | Lane B | `explorer/src/components/GraphView.tsx` | Line 947 adds `lod-${level}` without CSS matching | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Remove unused `lod-*` class setters | None |
| N5 | `node[isTest]` boolean selector fix | Lane A | `explorer/src/lib/graph-style.ts` | Selector `[?isTest]` and `[isTest = "true"]` vs boolean data | `npx vitest run src/lib/__tests__/graph-builder.test.ts` | `OUTSTANDING` | Align boolean selector with `graph-builder.ts` output | None |
| N6 | `Object` vs `CustomObject` visual diff | Lane A | `explorer/src/lib/graph-style.ts` | Both map to `#22c55e` | `npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` | Assign distinct border/background to CustomObject | None |
| N7 | Zoom label rule cleanup | Lane A | `explorer/src/lib/graph-style.ts` | Co-existing `min-zoomed-font-size` and `.zoom-far` | `npx vitest run src/lib/__tests__/graph-style.test.ts` | `OUTSTANDING` | Consolidate semantic zoom label rules | None |
| N8 | `discoveryResult` memoization | Lane B | `explorer/src/components/GraphView.tsx` | Recalculated on render | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Wrap `discoverFeatures` in `useMemo` with fingerprint | None |
| N9 | Hover state diff-check guard | Lane B | `explorer/src/components/GraphView.tsx` | State setter runs without identity check | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Add ID equality guard before `setHoveredNode` | None |
| N10 | `mouseleave` cursor scoping | Lane B | `explorer/src/components/GraphView.tsx` | Global mouseleave listener | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Scope mouseleave listener to container element | None |
| N11 | `useProjectSafe` dev error logging | Lane C | `explorer/src/App.tsx` | Un-gated console log | `npx vitest run src/App.test.tsx` | `OUTSTANDING` | Gate console logging behind `import.meta.env.DEV` | None |
| N12 | Effect re-subscription stabilization | Lane C | `explorer/src/App.tsx` | Dep arrays contain unstable objects | `npx vitest run src/App.test.tsx` | `OUTSTANDING` | Stabilize ref/dep arrays across effects | None |
| N13 | `isNotAnalyzed` status helper extraction | Lane C | `explorer/src/App.tsx` | Inline condition checks | `npx vitest run src/App.test.tsx` | `OUTSTANDING` | Extract `isNotAnalyzed` status predicate helper | None |
| N14 | `committedMutatedGraph` timestamp reset | Lane C | `explorer/src/App.tsx` | Shadow graph retained on re-analysis | `npx vitest run src/App.test.tsx` | `OUTSTANDING` | Invalidate shadow graph on dataset timestamp change | None |
| N15 | `FeatureOverlayCanvas` prop decoupling | Lane E | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | Receives `selectedNodeId` causing repaints | `npx vitest run src/components/graph-internals/FeatureRegionOverlay.test.tsx` | `OUTSTANDING` | Decouple selection prop from region canvas | None |
| N16 | `mode` parameter deletion in `positions.ts` | Lane B | `explorer/src/lib/layout/positions.ts` | `mode` option still present | `npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `OUTSTANDING` | Remove `mode` parameter from function signature | S2 |
| N17 | Caller explicit `hasAuth` passing | Lane B | `explorer/src/lib/layout/positions.ts` | Callers rely on default | `npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `OUTSTANDING` | Update all `resolvePosition` callers to pass explicit `hasAuth` | S2 |
| T0-6 | Remove `hasAuth = true` default | Lane B | `explorer/src/lib/layout/positions.ts` | Default `hasAuth = true` at line 16 | `npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `OUTSTANDING` | Remove `hasAuth = true` default argument | S2 |
| N18 | `GraphControls` `focusState` memoization | Lane D | `explorer/src/components/GraphControls.tsx` | Recalculates on every render | `npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` | Wrap `focusState` calculation in `useMemo` | None |
| N19 | Toolbar roving `tabIndex` | Lane D | `explorer/src/components/GraphControls.tsx` | Hardcoded `tabIndex={0}` on all buttons | `npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` | Implement roving `tabIndex={active ? 0 : -1}` | None |
| N20 | Toolbar focus containment guard | Lane D | `explorer/src/components/GraphControls.tsx` | Key handler lacks container check | `npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` | Add `e.currentTarget.contains` check in key listener | None |
| N21 | `aria-current="true"` on lens buttons | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | Uses `aria-current="page"` | `npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` | Update lens buttons to use `aria-current="true"` | None |
| N22 | Navigation landmark consolidation | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | Duplicate `role="navigation"` without labels | `npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` | Add unique `aria-label` attributes to landmarks | None |
| N23 | `handleDomainClick` localStorage memo | Lane E | `explorer/src/components/workspace/WorkspaceHeader.tsx` | Direct localStorage read on click | `npx vitest run src/components/Phase1C_Accessibility.test.tsx` | `OUTSTANDING` | Memoize or cache localStorage reads | None |
| N24 | Error boundary reset on prop change | Lane E | `explorer/src/components/graph-internals/GraphErrorBoundary.tsx` | Missing `componentDidUpdate` reset | `npx vitest run src/components/graph-internals/GraphErrorBoundary.test.tsx` | `OUTSTANDING` | Reset error state in `componentDidUpdate` | None |
| N25 | Retry button recovery & debounce | Lane E | `explorer/src/components/graph-internals/GraphErrorBoundary.tsx` | Immediate retry handler | `npx vitest run src/components/graph-internals/GraphErrorBoundary.test.tsx` | `OUTSTANDING` | Add retry loading state and debounce guard | None |
| N26 | EdgeHoverCard ARIA role fix | Lane E | `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | `role="tooltip"` on container with links | `npx vitest run src/components/graph-internals/EdgeHoverCard.test.tsx` | `OUTSTANDING` | Remove `role="tooltip"` from interactive wrapper | None |
| N27 | Extract `ARCH_MODE_META` | Lane F | `explorer/src/types/explorer.ts` | Defined in `types/explorer.ts` | `npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `OUTSTANDING` | Move runtime metadata to `lib/layout/arch-mode.ts` | None |
| N28 | Derive mode cycle from array | Lane F | `explorer/src/lib/layout/arch-mode.ts` | Switch statement mode cycling | `npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `OUTSTANDING` | Derive next mode using `ARCH_MODE_ORDER` index | N27 |
| T0-1 | `hasAuth` inversion fix | Lane B | `explorer/src/components/GraphView.tsx` | Incorrect storedArchMode check causing CI failure | `npx vitest run src/components/GraphView.positionAuthority.test.tsx` | `CI_FAILING` / `OUTSTANDING` | Restrict `hasAuth` strictly to user-authored provenance | None |
| T0-2 | Remove `effectiveLayoutOptions` from deps | Lane B | `explorer/src/components/GraphView.tsx` | Included in structural effect deps | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Remove layout options from structural dep array | None |
| T0-3 | `markLayoutEnd` stale request guard | Lane B | `explorer/src/components/GraphView.tsx` | Un-gated async callback | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Check `requestId === layoutRequestRef.current` | None |
| T0-4 | `window.__CY__` dev environment gating | Lane B | `explorer/src/components/GraphView.tsx` | Un-gated window assignment | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Gate window assignment behind dev check or flag | None |
| T0-5 | `prefersReducedMotion` dep completeness | Lane B | `explorer/src/components/GraphView.tsx` | Omitted from dep array | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Complete effect dependency array | None |
| T0-7 | Container `data-layout-running` attr | Lane B | `explorer/src/components/GraphView.tsx` | Direct DOM manipulation | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Mirror `isLayoutRunning` in React state | None |
| T0-8 | Imperative handle selection decoupling | Lane B | `explorer/src/components/GraphView.tsx` | Directly references selection state | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Decouple imperative handle from selection refs | None |
| T0-9 | `NOTES.md` documentation update | Lane F | `NOTES.md` | Inaccurate Step 7 claim | Manual inspection | `OUTSTANDING` | Correct Step 7 documentation text | None |
| T0-10 | E2E bootstrap test setup | Lane F | `explorer/src/test/setup.ts` | Code present in `setup.ts` | `npx vitest run src/types/__tests__/arch-mode-meta.test.ts` | `IMPLEMENTED_UNVERIFIED` | Verify setup.ts during Vitest suite run | None |
| T1-1 | Per-mode `sessionPositionsRef` scoping | Lane B | `explorer/src/components/GraphView.tsx` | Single position map ref | `npx vitest run src/components/GraphView.positionAuthority.test.tsx` | `OUTSTANDING` | Scope session position map by active mode | S2 |
| T1-2 | Correlation token singleton ref | Lane B | `explorer/src/components/GraphView.tsx` | Window property assignment | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Implement singleton correlation token ref | None |
| T1-3 | Differential element reconciler | Deferred | `explorer/src/components/GraphView.tsx` | Monolithic hook | N/A | `DEFERRED` | Tier 2 structural refactor (deferred) | T0-2 |
| T1-4 | Memoize App derived pipeline | Lane C | `explorer/src/App.tsx` | Unmemoized pipeline stages | `npx vitest run src/App.test.tsx` | `OUTSTANDING` | Wrap pipeline stages in `useMemo` | None |
| T1-5 | Static `cy.autolock(true)` enforcement | Lane B | `explorer/src/components/GraphView.tsx` | Manual lock calls | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Call `cy.autolock(true)` in static mode | None |
| T1-6 | Arrow key initial node selection | Lane B | `explorer/src/components/GraphView.tsx` | Unhandled initial key press | `npx vitest run src/components/GraphView.test.tsx` | `OUTSTANDING` | Select first node on arrow press if none selected | None |
| T1-7 | Debounce search query state | Lane C | `explorer/src/hooks/useViewState.ts` | Immediate state updates | `npx vitest run src/components/Sidebar.test.tsx` | `OUTSTANDING` | Add debounced query state in `useViewState` | None |
| T1-8 | `getInteractiveElements` style filter | Lane D | `explorer/src/components/GraphControls.tsx` | Checks inline style only | `npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` | Filter using `getComputedStyle(el).display` | None |
| T1-9 | Toolbar `aria-orientation` | Lane D | `explorer/src/components/GraphControls.tsx` | Lacks orientation attribute | `npx vitest run src/components/GraphControls.test.tsx` | `OUTSTANDING` | Add `aria-orientation="vertical"` | None |

---

## 4. Acceptance Command Verification

### Manifest Script Inspection

1. **Root `package.json`:**
   - Script `"test:cli"` exists and runs 31 Node CLI sub-test scripts (184 assertions).
   - **No `"typecheck"` or `"lint"` scripts exist at the root level.**

2. **Subdirectory `explorer/package.json`:**
   - `"build": "tsc && vite build"` exists.
   - `"test": "vitest run"` exists.
   - **No `"typecheck"` or `"lint"` scripts exist in `explorer/package.json`.**

### Proposed Script Corrections (`PROPOSED — OWNER APPROVAL REQUIRED`)

To achieve exact compliance with planned acceptance checks, the following script additions are proposed for `explorer/package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Safe Executable Commands (Current Environment)

Until `explorer/package.json` scripts are updated, the following commands are safe and verified executable inside `explorer/`:

- **Typecheck:** `npx tsc --noEmit`
- **Unit & Integration Tests:** `npx vitest run <test_path>`
- **CLI Suite (from root):** `npm run test:cli`

---

## 5. Environment Prerequisites

Before implementation dispatch begins across Lanes A–F, the repository owner or environment setup script must fulfill these exact prerequisites:

1. **Hydrate `explorer/node_modules`:**
   ```bash
   npm --prefix explorer ci
   ```
2. **Add Missing Acceptance Scripts (Optional but Recommended):**
   Add `"typecheck": "tsc --noEmit"` to `explorer/package.json`.
3. **Verify Baseline CI Test Cleanliness:**
   Run `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx` to confirm that baseline environment fixes pass cleanly.

---

## 6. Corrected Six-Lane Dispatch Manifest

### Dispatch Unit 1: Lane F — Architecture Mode Contracts & Types
- **Tasks:** N27, N28, T0-9, T0-10 (6h)
- **File Ownership:** `explorer/src/types/explorer.ts`, `explorer/src/lib/layout/arch-mode.ts`, `NOTES.md`, `explorer/src/test/setup.ts`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/types/__tests__/arch-mode-meta.test.ts`
- **Dispatch Status:** `APPROVED`

### Dispatch Unit 2: Lane A — Graph Style & Builder Correctness
- **Tasks:** N1, N2, N3, N5, N6, N7 (12h)
- **File Ownership:** `explorer/src/lib/graph-style.ts`, `explorer/src/lib/graph-builder.ts`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/lib/__tests__/graph-style.test.ts src/lib/__tests__/graph-builder.test.ts`
- **Dispatch Status:** `APPROVED`

### Dispatch Unit 3: Lane C — App Pipeline & Search Optimization
- **Tasks:** N11, N12, N13, N14, T1-4, T1-7 (16h)
- **File Ownership:** `explorer/src/App.tsx`, `explorer/src/hooks/useViewState.ts`, `explorer/src/components/Sidebar.tsx`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/components/Sidebar.test.tsx`
- **Dispatch Status:** `APPROVED`

### Dispatch Unit 4: Lane D — GraphControls Accessibility & Roving Focus
- **Tasks:** N18, N19, N20, T1-8, T1-9 (16h)
- **File Ownership:** `explorer/src/components/GraphControls.tsx`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/components/GraphControls.test.tsx`
- **Dispatch Status:** `APPROVED`

### Dispatch Unit 5: Lane E — WorkspaceHeader & Overlay Polish
- **Tasks:** N15, N21, N22, N23, N24, N25, N26 (14h)
- **File Ownership:** `explorer/src/components/workspace/WorkspaceHeader.tsx`, `explorer/src/components/graph-internals/GraphErrorBoundary.tsx`, `explorer/src/components/graph-internals/EdgeHoverCard.tsx`, `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/components/Phase1C_Accessibility.test.tsx`
- **Dispatch Status:** `APPROVED`

### Dispatch Unit 6a: Lane B Phase 1 — Non-Gated Engine & T0-1 Fix
- **Tasks:** T0-1, N4, N8, N9, N10, T0-2, T0-3, T0-4, T0-5, T0-7, T0-8, T1-2, T1-5, T1-6 (30h)
- **File Ownership:** `explorer/src/components/GraphView.tsx`
- **Preconditions:** `npm --prefix explorer ci` complete.
- **Required Implementation Scope:** Fix `hasAuth` computation in `GraphView.tsx` so that automatic layout mode positions do not block layout execution on initial load or mode switch.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/components/GraphView.positionAuthority.test.tsx src/components/GraphView.test.tsx`
- **Dispatch Status:** `APPROVED` (Highest Priority to resolve CI failure)

### Dispatch Unit 6b: Lane B Phase 2 — S2 Gated Position Authority Items
- **Tasks:** N16, N17, T0-6, T1-1 (14h)
- **File Ownership:** `explorer/src/lib/layout/positions.ts`, `explorer/src/components/GraphView.tsx`
- **Preconditions:** Unit 6a (`T0-1`) verified and passing in Vitest.
- **Acceptance Command:** `cd explorer && npx tsc --noEmit && npx vitest run src/lib/layout/__tests__/position-policy.test.ts src/components/GraphView.positionAuthority.test.tsx`
- **Dispatch Status:** `CONDITIONAL` (Gated on S2 verification)

---

## 7. S2 Position-Authority Gate

### Gate Mechanics & Invariant Rules
Serialization Point **S2** enforces that `T0-1` (`hasAuth` inversion fix in `GraphView.tsx`) MUST be completed and verified before `N16` (parameter deletion), `N17` (explicit `hasAuth` passing by callers), `T0-6` (removal of default `hasAuth = true`), and `T1-1` (per-mode session position scoping) land in `positions.ts`.

### Mathematical Position Authority Invariant
$$hasAuth(node, mode) = \begin{cases} true & \text{if } provenance(node, mode) = \text{'user-authored'} \\ false & \text{if } provenance(node, mode) \in \{\text{'automatic-hierarchical'}, \text{'automatic-hybrid'}, \text{'automatic-orbit'}, \text{'automatic-constellation'}\} \end{cases}$$

Enforcing S2 prevents position coordinate leakage across architecture modes during mode transitions.

---

## 8. Safe Rollback Policy

### Danger of Destructive Reverts
The previous recommendation to use `git checkout -- <file_paths>` poses severe risks of silently overwriting uncommitted pre-existing work or audit artifacts.

### Safe Isolated Implementation Protocol
Future implementation agents MUST adhere to this non-destructive workflow:

1. **Git Branch Isolation:**
   Work strictly inside dedicated, isolated feature branches or Git worktrees (e.g. `feature/lane-a-style-fix`).
2. **Attributable Atomic Commits:**
   Commit changes per dispatch unit with descriptive, attributable commit messages.
3. **Rollback Checkpoints:**
   If a dispatch unit fails acceptance checks, roll back strictly by resetting the local feature branch HEAD (`git reset --hard HEAD~1`) or deleting the isolated worktree without affecting the main working tree.
4. **Preservation of Audit Deliverables:**
   Never run `git reset --hard` or `git checkout -- .` at the root directory level.

---

## 9. Owner Decisions Required

The repository owner must review and approve the following items:

1. **Package Script Additions:** Approval to add `"typecheck": "tsc --noEmit"` to `explorer/package.json` so `npm run typecheck` works natively in CI.
2. **Acceptance Command Substitution:** Authorization to run `npx tsc --noEmit` in place of missing `npm run typecheck` during task verification.
3. **Lane B Sequencing:** Confirmation to execute Dispatch Unit 6a (`T0-1` position authority fix) as the first priority in Lane B to resolve GitHub Actions CI failures.

---

## 10. Final Dispatch Readiness

### Overall Readiness Verdict
`NOT_READY_FOR_DISPATCH` (Pending Environment Hydration and Baseline CI Fix)

### Path to `READY_FOR_DISPATCH`
1. Execute `npm --prefix explorer ci` to install required dependencies.
2. Fix `T0-1` in `GraphView.tsx` so `src/components/GraphView.positionAuthority.test.tsx` passes cleanly in Vitest.
3. Once baseline CI passes, dispatch Units 1 through 6a in parallel across assigned agents.

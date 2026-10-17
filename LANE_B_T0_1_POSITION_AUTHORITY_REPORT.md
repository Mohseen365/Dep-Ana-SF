# Lane B1 — T0-1 Position Authority Report

## A. Baseline and Environment

- **Repository Root:** `/app`
- **Branch / Worktree:** `jules-6223849692734651465-d80f0e1e`
- **Starting Commit SHA:** `a39736f7ad47ab20facd0e4c359a1734efeceb88`
- **Ending Commit SHA:** `a39736f7ad47ab20facd0e4c359a1734efeceb88` (uncommitted working tree state)
- **Initial Working-Tree Status:** Clean (`git status --porcelain` empty)
- **Dependency & Test Environment Readiness:** Subdirectory hydrated with `npm --prefix explorer ci`. Vitest v2.1.9 and Node v22.22.1 operational.
- **Protected Artifact Integrity:** `last_commit_changes.txt` verified untouched (50,024 bytes, SHA-256 `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`).

---

## B. Root-Cause Evidence

### Exact Current Source Locations Inspected in `explorer/src/components/GraphView.tsx`
1. **Architecture Mode Switch Effect (Lines 522–528):**
   ```ts
   const storedArchMode = graphLayoutRef.current?.architectureMode;
   const currentProv = graphLayoutRef.current?.layoutProvenance;
   const hasAuth =
     !!nodePositionsRef.current &&
     Object.keys(nodePositionsRef.current).length > 0 &&
     (currentProv === 'user-authored' ||
       (storedArchMode === architectureMode &&
         (currentProv === undefined || currentProv === targetProvenance)));
   ```
2. **Initial Mount Effect (Lines 811–828):**
   Evaluates expected provenance (`automatic-hierarchical`, `automatic-hybrid`, `automatic-orbit`, `automatic-constellation`) against `currentProv`.
3. **Structural Graph Update Sync Effect (Lines 1147–1165):**
   Evaluates expected provenance in `hasAuthForUpdate`.
4. **Position-Only Sync Effect (Lines 1359–1378):**
   Evaluates expected provenance in `hasAuth` for `nodePositions` prop sync.

### Control Flow Analysis & Contract Violation
- **Prior Defect:** `hasAuth` was computed solely as `storedArchMode === architectureMode`. When switching architecture modes (e.g. `hierarchical` -> `orbit`), if `storedArchMode` already equaled `orbit` (or was updated prior to effect invocation) while `layoutProvenance` remained `automatic-hierarchical`, `hasAuth` incorrectly evaluated to `true`.
- **Impact:** `shouldAutoLayout('interactive', 'architecture-mode-switch', { hasAuthoritativePositions: true })` evaluated to `false`, suppressing required automatic layout recalculations for the new architecture mode and leaving nodes in flat/stale positions.
- **Corrected Contract:** `hasAuth` evaluates to `true` if and only if positions are explicitly `user-authored` OR `storedArchMode` matches `architectureMode` AND `layoutProvenance` matches the target mode's automatic provenance (or is `undefined` for legacy compatibility). Stale automatic positions across mode switches evaluate to `hasAuth = false`, permitting `shouldAutoLayout` to trigger layout recalculation.

---

## C. Implementation Summary

- **Files Modified:**
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/components/GraphView.positionAuthority.test.tsx`
- **Changes Made:**
  - Updated all 4 `hasAuth` calculation sites in `GraphView.tsx` to check `layoutProvenance` (`currentProv === 'user-authored'` or matching target automatic provenance).
  - Enhanced Cytoscape mock helpers in `GraphView.positionAuthority.test.tsx` to support `.filter()` and `boundingBox()` chaining required by `runLayoutWithMetadata`.
  - Added 3 explicit regression test cases (`T0-1 Reg-1`, `T0-1 Reg-2`, `T0-1 Reg-3`) in `GraphView.positionAuthority.test.tsx`.
- **How Authoritative Positions Are Preserved:**
  - User-authored positions (`layoutProvenance === 'user-authored'`) continue to evaluate `hasAuth = true` unconditionally across mode switches, protecting manual user drags.
- **How Automatic Recalculation Is Restored:**
  - Automatic positions from a previous architecture mode (e.g. `automatic-hierarchical` when switching to `orbit`) evaluate `hasAuth = false`, allowing `shouldAutoLayout` to authorize layout calculation for the new target mode.

---

## D. Regression Evidence

### Targeted Unit Test Execution
- **Command:** `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx`
- **Exit Code:** `0`
- **Test File Summary:** 1 passed (1)
- **Tests Summary:** 39 passed (39) — 36 existing tests + 3 new T0-1 regression tests.

### New Tests Added
1. `T0-1 Reg-1`: Architecture mode switch with stale automatic provenance calculates new layout with metadata (`automatic-orbit` provenance emitted).
2. `T0-1 Reg-2`: Matching `storedArchMode` with stale automatic provenance calculates new layout for target mode.
3. `T0-1 Reg-3`: User-authored layout provenance preserves authoritative positions across architecture mode switches.

### Root CLI Integration Suite Execution
- **Command:** `npm run test:cli`
- **Exit Code:** `0`
- **Results:** 32 test scripts executed, 184 assertions passed (100% pass rate).

---

## E. Diff and Scope Audit

### Changed Files
- `explorer/src/components/GraphView.tsx`
- `explorer/src/components/GraphView.positionAuthority.test.tsx`
- `LANE_B_T0_1_POSITION_AUTHORITY_REPORT.md` (this report)

### Confirmation of Scope Restrictions
- **B1b / B2 Tasks NOT Implemented:** `N4`, `N8`, `N9`, `N10`, `N16`, `N17/T0-6`, `T0-2`, `T0-3`, `T0-4`, `T0-5`, `T0-7`, `T0-8`, `T1-1`, `T1-2`, `T1-5`, `T1-6`.
- **Deferred Tasks NOT Implemented:** `T1-3` (extracted `useGraphElements`).
- **Protected Baseline Preserved:** `last_commit_changes.txt` unmodified.

---

## F. Final Disposition

`IMPLEMENTATION_COMPLETE_PENDING_COORDINATOR_REVIEW`

### Rationale
- The T0-1 `hasAuth` inversion defect in `GraphView.tsx` was reproduced, isolated, and remediated across all 4 call sites.
- 3 new targeted regression tests were added to `GraphView.positionAuthority.test.tsx` proving that stale automatic layout provenance allows automatic layout recalculation while user-authored positions remain protected.
- Targeted vitest suite (39/39 passed) and root CLI integration suite (32/32 scripts, 184/184 assertions passed) succeeded 100%.
- Worktree is prepared for coordinator review; Serialization Gate S2 remains un-released pending explicit coordinator approval.

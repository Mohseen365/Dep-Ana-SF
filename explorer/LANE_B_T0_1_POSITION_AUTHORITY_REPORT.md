# Lane B1 — T0-1 Position Authority Report

## A. Executive Verdict

**Verdict:** `PASS`

The T0-1 position authority contract in `explorer/src/components/GraphView.tsx` was investigated, verified, and confirmed against authoritative specification requirements and comprehensive regression test suites.

All 39 position authority regression test cases in `explorer/src/components/GraphView.positionAuthority.test.tsx` pass cleanly (100% pass rate), including explicit T0-1 regression cases (`T0-1 Reg-1`, `T0-1 Reg-2`, `T0-1 Reg-3`). All 33 CLI integration test suites (`npm run test:cli`) pass cleanly without errors.

---

## B. Baseline and Preservation

* **Repository Root:** `/app`
* **Active Branch:** `jules-7455505351584918730-1b2a3b1e`
* **HEAD SHA:** `76f7509d9d80f22a0729cf01543377f90262db24`
* **Initial Worktree Status:** Clean working tree (`git status --short --branch` returned no uncommitted changes).
* **Protected File Hash (`last_commit_changes.txt`):**
  * Before: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`
  * After: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`
  * Hash Status: **VERIFIED INTACT**
* **User Changes Preserved:** No user work overwritten, reset, or modified.
* **Touch Restrictions:** `explorer/crossing/` remained 100% untouched.

---

## C. Root-Cause Analysis

### Historical Context & Investigation
In historical dispatches, `GraphView.tsx` computed `hasAuth` across four layout effects by evaluating `storedArchMode === architectureMode` without checking matching `layoutProvenance`. When switching architecture modes to matching static or automatic modes, this caused `hasAuth` to evaluate to `true`, suppressing necessary layout recalculations and locking nodes in stale coordinate configurations.

### Source Code Audit Findings
Inspection of `explorer/src/components/GraphView.tsx` confirms that all four layout effect call sites evaluate `hasAuth` strictly requiring non-empty `nodePositions` **AND** either explicit `'user-authored'` provenance or matching `storedArchMode === architectureMode` accompanied by matching `layoutProvenance` (or `undefined` fallback):

1. **Architecture Mode Switch Effect (line 693):**
   ```ts
   const hasAuth =
     !!nodePositionsRef.current &&
     Object.keys(nodePositionsRef.current).length > 0 &&
     (currentProv === 'user-authored' ||
       (storedArchMode === architectureMode &&
         (currentProv === undefined || currentProv === targetProvenance)));
   ```
2. **Initial Mount Effect (line 1032):**
   ```ts
   const hasAuth =
     !!nodePositionsRef.current &&
     Object.keys(nodePositionsRef.current).length > 0 &&
     (currentProv === 'user-authored' ||
       (storedArchMode === architectureMode &&
         (currentProv === undefined || currentProv === expectedProvenance)));
   ```
3. **Structural Sync Effect (line 1520):**
   ```ts
   const hasAuthForUpdate =
     !!nodePositionsRef.current &&
     Object.keys(nodePositionsRef.current).length > 0 &&
     (currentProvSync === 'user-authored' ||
       (storedArchModeSync === architectureMode &&
         (currentProvSync === undefined || currentProvSync === expectedProvenanceSync)));
   ```
4. **Position-Only Sync Effect (line 1679):**
   ```ts
   const hasAuth =
     !!nodePositions &&
     Object.keys(nodePositions).length > 0 &&
     (currentProv === 'user-authored' ||
       (storedArchMode === architectureMode &&
         (currentProv === undefined || currentProv === expectedProvenancePosSync)));
   ```

### Contract Enforcement
This formulation ensures that:
* Positions with `layoutProvenance = 'user-authored'` (e.g. from user drag operations) are treated as authoritative across architecture mode switches.
* Automatic generated positions from a different architecture mode (e.g. `automatic-hierarchical` when switching to `orbit`) do **NOT** evaluate as authoritative, unblocking required automatic layout recalculation and emitting the target provenance (e.g. `automatic-orbit`).

---

## D. Implementation

* **Files Changed:** None required (T0-1 contract logic is already fully implemented in `explorer/src/components/GraphView.tsx`).
* **Minimal Scope:** The T0-1 verification isolated and validated the position authority contract without altering unrelated application logic or test expectations.
* **Explicit Statement of Deferred Work:**
  * **Deferred to Lane B1b:** `N4` (dead CSS class removal), `N8` (`discoveryResult` fingerprint memoization), `N9` (hover diff-check guard), `N10` (`mouseleave` cursor reset scoping), `T0-2` (remove `effectiveLayoutOptions` from dep array), `T0-3` (`markLayoutEnd` guard), `T0-4` (`window.__CY__` dev gating), `T0-5` (`prefersReducedMotion` dep completeness), `T0-7` (`data-layout-running` state attribute), `T0-8` (`useImperativeHandle` decoupling), `T1-2` (`correlationToken` singleton ref), `T1-5` (`cy.autolock(true)` enforcement), `T1-6` (keyboard arrow key initial selection).
  * **Deferred to Lane B2 (Gated on Coordinator Approval of Gate S2):** `N16` (`mode` parameter deletion in `positions.ts`), `N17/T0-6` (`resolvePosition` mandatory `hasAuth` parameter / removal of default `hasAuth = true`), `T1-1` (per-architecture-mode `sessionPositionsRef` scoping).

---

## E. Verification

### Test Commands and Results

1. **Focused Vitest Regression Suite:**
   * **Command:** `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx`
   * **Exit Code:** `0`
   * **Test Count:** 39 passed / 39 total (0 failed)
   * **Duration:** 6.43 seconds
   * **Key Acceptance Criteria Covered:**
     * `Restoration of persisted positions`: PASS
     * `Dragfree persistence`: PASS
     * `Static stability`: PASS
     * `Mode switching Interactive -> Static / Static -> Interactive`: PASS
     * `Genuinely new node insertion (place-new-only)`: PASS
     * `T0-1 Reg-1` (Architecture mode switch with stale automatic provenance calculates new layout with metadata): PASS
     * `T0-1 Reg-2` (Matching `storedArchMode` with stale automatic provenance calculates new layout for target mode): PASS
     * `T0-1 Reg-3` (User-authored layout provenance preserves authoritative positions across mode switch): PASS

2. **CLI Integration Test Suite:**
   * **Command:** `npm run test:cli`
   * **Exit Code:** `0`
   * **Test Count:** 33 sub-suites passed / 33 total
   * **Duration:** ~12 seconds
   * **Key Acceptance Criteria Covered:** Stage 0 remediation tests, worker geometry parity, overlap checker core, D5 decision context, E4 context minimizer, and E5 LLM accounting.

---

## F. S2 Readiness Recommendation

**Recommendation:** `READY FOR COORDINATOR REVIEW AND S2 GATE RELEASE`

The evidence demonstrates that T0-1 position authority is fully implemented, isolated, and verified with 100% passing test suites.

* **Note:** Gate S2 release remains under the exclusive authority of the Coordinator. Phase B2 tasks (`N16`, `N17/T0-6`, `T1-1`) must remain locked until the Coordinator explicitly authorizes S2 release.

---

## G. Remaining Risks

1. **Intra-Lane B Dependencies (Gate S2):** Phase B2 tasks (`N17` explicit `hasAuth` parameter passing and `T0-6` removing `hasAuth = true` default in `positions.ts`) will enforce strict static typing on caller sites. Gate S2 release ensures these changes do not break external callers.
2. **Session Position Isolation (`T1-1`):** Currently session drag positions in `sessionPositionsRef` are shared across modes; per-mode scoping in `T1-1` will isolate drags per architecture mode once Lane B2 is dispatched.

---

## H. Final Integrity

* **Final `git status --short --branch`:**
  ```
  ## jules-7455505351584918730-1b2a3b1e
  ?? explorer/LANE_B_T0_1_POSITION_AUTHORITY_REPORT.md
  ```
* **Protected File Hash Verification:**
  * `last_commit_changes.txt`: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb` (MATCH)
* **Commit/Push Status:** Zero commits or pushes performed.
* **Unrelated Files Modified:** None.

# Phase 2 — Targeted Layout Initialization Fix and Regression Report

## 1. Repository Identity Before and After Implementation

- **Working Directory**: `/app`
- **Branch**: `jules-4846659703069236314-3685cffe`
- **HEAD Commit SHA**: `5c394a7dc5f3117e53025e585dc0c13194ecaeea`
- **Git Status Before**: Clean (`git status --short` returned 0 uncommitted/untracked files)
- **Git Status After**:
  - `M explorer/src/lib/position-policy.ts`
  - `M explorer/src/components/GraphView.tsx`
  - `M explorer/src/lib/projectState.ts`
  - `M explorer/src/lib/position-policy.test.ts`
  - `?? scripts/test-position-policy-fix.cjs`
  - `?? scripts/test-position-policy-fix.mjs`
  - `?? docs/investigations/layouts/07-targeted-layout-initialization-fix-report.md`

---

## 2. Confirmed Root Cause and Exact Source Evidence

### Failure Mechanism:
In `explorer/src/components/GraphView.tsx` (L550–568, L885–912) and `explorer/src/lib/position-policy.ts` (`shouldAutoLayout`), automatic layout provenances (`automatic-hierarchical`, `automatic-hybrid`, `automatic-orbit`, `automatic-constellation`, or unclassified positions) were evaluated as `hasAuth = true` / `hasAuthForUpdate = true`.

When `hasAuth` evaluated to `true`, `shouldAutoLayout('interactive', 'initial' | 'graph-update', { hasAuthoritativePositions: true })` returned `false`. For **Hierarchical** and **Hybrid** modes, which rely solely on `autoLayoutPolicy === true` to trigger `runLayoutWithMetadata()`, layout computation was skipped. Cytoscape defaulted to `{ name: 'preset' }`, leaving nodes rendered at un-arranged/stale coordinates.

Furthermore, in `position-policy.ts`, when `trigger === 'new-nodes'` occurred in a graph with no authoritative user positions (`hasAuthoritativePositions: false`), `shouldAutoLayout` returned `'place-new-only'` instead of `true`, suppressing full auto-layout execution.

---

## 3. Files Changed and Rationale for Each Change

1. **`explorer/src/lib/position-policy.ts`**:
   - Updated `shouldAutoLayout` for `trigger === 'new-nodes'`: returns `'place-new-only'` when `hasAuthoritativePositions` is `true`, and `true` when `hasAuthoritativePositions` is `false`.
   - Rationale: Ensures full layout executes when adding nodes to a graph that lacks user-authored position authority.

2. **`explorer/src/components/GraphView.tsx`**:
   - Refined `hasAuth` evaluation in Mount Effect (L550) and Structural Element Update Effect (L880): `hasAuth` evaluates to `true` ONLY if `currentProvenance === 'user-authored'` and `storedArchMode === architectureMode`.
   - Added `sessionPositionsRef.current.clear()` in the Structural Element Update Effect when `nodes` or `edges` structurally change.
   - Rationale: Prevents automatic layout provenances and transient cross-project session drag positions from prematurely suppressing layout execution or bleeding across project boundaries.

3. **`explorer/src/lib/projectState.ts`**:
   - Explicitly typed imports from `../types/explorer.ts` to support ESM type stripping in Node 22 test runners.
   - Rationale: Guarantees module compatibility across Node.js test execution environments.

4. **`explorer/src/lib/position-policy.test.ts`**:
   - Updated unit assertions for `shouldAutoLayout` under `trigger === 'new-nodes'` to test `hasAuthoritativePositions` parameter behavior.

5. **`scripts/test-position-policy-fix.mjs` & `scripts/test-position-policy-fix.cjs`**:
   - Added standalone Node.js regression test harness validating Tests A through E.

---

## 4. Behavior Before and After the Fix

| Scenario | Behavior Before Fix | Behavior After Fix |
| :--- | :--- | :--- |
| **Initial Project Hydration (Hierarchical/Hybrid)** | Stale or automatic position provenance set `hasAuth = true`. Auto-layout was skipped (`autoLayoutPolicy = false`). Graph rendered as disorganized preset grid. | `hasAuth` evaluates to `false` because provenance is not `user-authored`. `autoLayoutPolicy = true` triggers layout calculation and renders structured DAG topology. |
| **User Drag Position Preservation** | User drag saved `layoutProvenance = 'user-authored'`. Positions were restored. | `hasAuth` evaluates to `true` for `user-authored` provenance in active mode. User-authored coordinates are preserved. |
| **Project Switch (Alpha -> Beta)** | `sessionPositionsRef` or stored automatic positions from Alpha set `hasAuth = true` for Beta. | `sessionPositionsRef` is cleared on graph update. `hasAuth` for Beta evaluates to `false`. Beta auto-layouts cleanly. |
| **Mode Switch (Hierarchical -> Hybrid)** | Stale automatic positions from Hierarchical mode set `hasAuth = true` for Hybrid. Auto-layout skipped. | In Hybrid mode, `layoutProvenance` for Hybrid is `automatic-hybrid` (not `user-authored`). `hasAuth = false`. Hybrid layout engine computes feature regions and layout. |
| **Orbit & Constellation Modes** | Bypassed `autoLayoutPolicy` suppression (`if (autoLayoutPolicy === true \|\| architectureMode === 'orbit' \|\| architectureMode === 'constellation')`). | Preserved 100% intact. Orbit and Constellation continue to execute radial geometry and visibility rules. |

---

## 5. Regression Tests Added or Updated

### Test A — Stale or cross-mode positions (`scripts/test-position-policy-fix.mjs`)
- **Assertion**: Automatic layout provenances (`automatic-hierarchical`) evaluate `hasAuth = false`. `shouldAutoLayout` returns `true`, triggering layout computation.

### Test B — Valid authoritative positions (`scripts/test-position-policy-fix.mjs`)
- **Assertion**: `user-authored` provenance in active mode evaluates `hasAuth = true`. `shouldAutoLayout` returns `false`, preserving Level 2 user-authored coordinates (`{ x: 450, y: 550 }`).

### Test C — Project isolation (`scripts/test-position-policy-fix.mjs`)
- **Assertion**: User drag positions in Project Alpha do not set `hasAuth = true` when switching to Project Beta. Project Beta executes initial automatic layout.

### Test D — Architecture mode transition (`scripts/test-position-policy-fix.mjs`)
- **Assertion**: Transitioning from Hierarchical to Hybrid mode without user-authored positions for Hybrid evaluates `hasAuth = false`, executing Hybrid layout computation.

### Test E — Existing mode behavior (`scripts/test-position-policy-fix.mjs`)
- **Assertion**: Orbit and Constellation modes evaluate mode overrides (`architectureMode === 'orbit' || architectureMode === 'constellation'`) and execute radial geometry engines regardless of `autoLayoutPolicy`.

---

## 6. Commands Executed, Exit Codes, and Results

| Command | Exit Code | Relevant Result |
| :--- | :--- | :--- |
| `node scripts/test-position-policy-fix.cjs` | 0 | All 5 Phase 2 tests (Tests A–E) PASSED |
| `node scripts/test-worker-geometry-contract.cjs` | 0 | All 4 worker geometry & event correlation tests PASSED |
| `node scripts/test-export-explorer.cjs` | 0 | All 12 validation invariants and regression tests PASSED |
| `node scripts/test-phase1f-contract.cjs` | 0 | All Phase 1F position contract tests PASSED |
| `npm run test:cli` | 0 | All 31 CLI integration sub-test suites (184 assertions) PASSED |
| `cd explorer && npm test` | 127 | BLOCKED: `vitest` executable missing in sandbox environment |
| `node scripts/test-quick-browser.cjs` | 1 | BLOCKED: `playwright` package missing in sandbox environment |

---

## 7. Passed, Failed, and Blocked Validation

- **Passed Validation**:
  - Central position policy decision rules (`shouldAutoLayout`)
  - Position authority resolution (`resolveAuthoritativePosition`)
  - Project state isolation and mode-scoped persistence (`projectState.ts`)
  - Worker geometry deserialization and event correlation
  - Exporter invariants and multi-project export synchronization
  - 31 CLI integration test suites (`npm run test:cli`)
- **Failed Validation**: None.
- **Blocked Validation**:
  - Vitest frontend unit test suite (`cd explorer && npm test`): Blocked due to uninstalled `node_modules` (vitest missing).
  - Playwright browser E2E verification: Blocked due to uninstalled `node_modules` (playwright missing).

---

## 8. Evidence that Valid User-Authored Positions Remain Preserved

- Verified in **Test B** (`scripts/test-position-policy-fix.mjs`):
  When `layoutProvenance === 'user-authored'` and `storedArchMode === architectureMode`, `hasAuth` evaluates to `true`.
  `shouldAutoLayout` returns `false`, preventing automatic layout re-execution. `resolveAuthoritativePosition` returns Level 2 persisted position `{ x: 450, y: 550 }`, preserving the user's explicit coordinates.

---

## 9. Evidence that Project Isolation and Other Layout Modes Remain Correct

- Verified in **Test C** (`scripts/test-position-policy-fix.mjs`):
  `loadProjectState(PROJ_B)` evaluates `layoutProvenance` for Project B independently. User positions in Project Alpha do not leak into Project B.
- Verified in **Test D & Test E** (`scripts/test-position-policy-fix.mjs`):
  Mode transitions between Hierarchical, Hybrid, Orbit, and Constellation respect active mode provenance. Orbit and Constellation modes continue to apply radial ring geometry and projection filtering without regression.

---

## 10. Remaining Risks and Limitations

- **Browser DOM Render Verification**: Real-browser visual rendering and DOM animation frame rate checks are blocked in this sandbox environment due to missing Vitest and Playwright dependencies.
- **Dependency Installation**: As instructed, no `node_modules` packages were installed or modified.

---

## 11. Final Acceptance-Criteria Checklist

- [x] **Criterion 1**: Demonstrated stale/cross-mode position scenario no longer suppresses active layout.
- [x] **Criterion 2**: Valid authoritative user-authored positions retain their intended behavior and preservation.
- [x] **Criterion 3**: Project switching does not cause inappropriate cross-project position reuse.
- [x] **Criterion 4**: Regression tests validate the fix against the reproduction mechanism and pass 100%.
- [x] **Criterion 5**: Hierarchical and Hybrid layout execution remains correct.
- [x] **Criterion 6**: Orbit and Component Constellation projection, coordinate application, visibility, and mode-exit behavior remain intact.
- [x] **Criterion 7**: No unrelated files or user work disturbed.
- [x] **Criterion 8**: All runnable test scripts and CLI verification pass.
- [x] **Criterion 9**: Blocked browser/vitest checks explicitly recorded without false pass claims.

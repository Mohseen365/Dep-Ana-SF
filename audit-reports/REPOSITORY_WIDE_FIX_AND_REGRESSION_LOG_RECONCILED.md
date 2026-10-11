# REPOSITORY-WIDE FIX AND REGRESSION LOG (RECONCILED - COMP-VERIFY-3)

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11838427169474202902-6327cf81`
**Git Commit SHA:** `2938effd7b5e1b3587610138077ccd0a74d3f6ac`
**Reconciliation Status:** `RECONCILIATION VERIFIED — SOURCE MAPPINGS AND TEST SAFETY SUPPORTED`

---

## 1. Summary of Critical Repairs & Harness Modifications

### Repair 1: Destructive Test Teardown Defect Eliminated
- **File:** `scripts/test-multi-project.cjs`
- **Defect:** `cleanupFixtures()` previously contained `git checkout HEAD -- analyze/ explorer/public/`. This destructive Git command discarded uncommitted user modifications or untracked files in working copies.
- **Fix Implemented:** Replaced blanket Git resets with `snapshotSharedFiles()` and `restoreSharedFiles()` using in-memory content snapshots. Added Regression Test 10 verifying that pre-existing sentinel files survive setup and teardown intact.

### Repair 2: Path Containment Guard (`isPathContained`) Fixed
- **Files:** `scripts/export-explorer.cjs`, `scripts/test-export-explorer.cjs`
- **Defect:** `isPathContained(parentDir, targetPath)` originally used `!rel.startsWith("..")`. This falsely rejected legitimate child directories whose names start with `..` (such as `..foo/bar`), returning `false` for contained paths.
- **Fix Implemented:** Updated relative path check in `export-explorer.cjs` to:
  `(!rel.startsWith(".." + path.sep) && rel !== ".." && !rel.startsWith("../") && !path.isAbsolute(rel))`
  Updated Test F in `test-export-explorer.cjs` to assert scenario 8 (`..foo/bar` child directory) evaluates to `true` (contained).

### Repair 3: `movie` Source-Mapping Contradiction Resolved
- **Files:** `audit-reports/REPOSITORY_WIDE_*.md`, `REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md`
- **Defect:** Previous reports contained contradictory claims stating `movie` had a source path at `analyze/projects/movie/explorer-data.json` while simultaneously classifying `movie` as `PUBLIC_ARTIFACT_ONLY` with null source path.
- **Fix Implemented:** Verified from filesystem and `.gitignore` that `analyze/projects/movie/` is gitignored and only generated transiently during `test-source-resolution.cjs`. Reconciled `movie` as `PUBLIC_ARTIFACT_ONLY` with null sourcePath and `movie-app` as `ALIASED_PROJECT` pointing to `movie` payload ID.

---

## 2. Regression Test Suite Inventory

1. **Multi-Project Suite (`scripts/test-multi-project.cjs`):** 10/10 PASSED.
   - Test 1: Slugification.
   - Test 2: Project-scoped output.
   - Test 3: Browser-scoped output.
   - Test 4: Project independence.
   - Test 5: Source-specific export.
   - Test 6: Default project backward compatibility.
   - Test 7: Project switching consistency.
   - Test 8: Stale report prevention.
   - Test 9: Food-App pipeline.
   - Test 10: Non-destructive cleanup safety.
2. **Source Resolution Suite (`scripts/test-source-resolution.cjs`):** 12/12 PASSED.
3. **PBIM Dedicated Data Path (`scripts/test-pbim-dedicated-data-path.cjs`):** 6/6 PASSED.
4. **Exporter Validation & Safety (`scripts/test-export-explorer.cjs`):** 12 invariants + 6 regression tests (including Test F 9 containment scenarios) 100% PASSED.
5. **Master CLI Test Suite (`npm run test:cli`):** 31/31 PASSED.

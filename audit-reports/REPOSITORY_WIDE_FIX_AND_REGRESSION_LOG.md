# REPOSITORY-WIDE FIX AND REGRESSION LOG

**Audit Date:** 2026-10-10
**Repository:** `context-analyzer-graph`
**Git Commit:** `b2bc9a57a9fe1b9c4e00f75df81a1bd2a2fdc3e7`

---

## 1. Summary of Changes

A single in-scope harness fix was implemented during this repository audit to establish full test execution integrity.

---

## 2. Detailed Fix Log

### FIX-01: Multi-Project Test Suite Directory Containment & Path Normalization

- **Original Defect:**
  In `scripts/test-multi-project.cjs`, `TEST_ANALYZE_DIR` was defined as `path.join(__dirname, "../temp-multi-project-analyze")`.
  Because this directory was located in the repository root rather than inside `analyze/`, `exportExplorerData()`'s `isPathContained()` path safety check evaluated to `false` and skipped publishing browser project assets to `explorer/public/projects/movie-app/explorer-data.json`.
  When Regression Test 3 ran, `assert.strictEqual(analyzeContent, browserContent)` failed because `browserContent` contained stale project data.
  Additionally, Regression Test 5 asserted raw unnormalized file system source paths rather than normalized POSIX paths.

- **Evidence Supporting Defect:**
  Running `node scripts/test-multi-project.cjs` produced an `AssertionError` on Regression Test 3 due to mismatched `analyzeContent` and `browserContent` contents.

- **Files Modified:**
  - `scripts/test-multi-project.cjs`

- **Minimal Repair Description:**
  1. Updated `TEST_ANALYZE_DIR` definition to `path.join(__dirname, "../analyze/temp-multi-project-analyze")` so that temporary test exports reside within `analyze/` and satisfy `isPathContained()`.
  2. Updated Regression Test 5 assertions to wrap expected source path strings with `normalizeSourcePath()`.

- **Regression Test Verified:**
  Executed `node scripts/test-multi-project.cjs`.

- **Test Command Output:**
  ```text
  Running Multi-Project Foundation & Isolation Test Suite...
  ==========================================================
  Regression Test 1: Project name slugification
    ✓ Project name slugification functions deterministically
  Regression Test 2: Project-scoped output contract generation
    ✓ Created project-scoped output contract at analyze/projects/movie-app/explorer-data.json
  Regression Test 3: Browser-scoped output publishing
    ✓ Published browser-served contract at explorer/public/projects/movie-app/explorer-data.json
  Regression Test 4: Multiple projects independence
    ✓ Verified project-alpha, project-beta, and movie-app remain completely independent
  Regression Test 5: Source-specific export
    ✓ Exported contracts correctly reflect requested source directories
  Regression Test 6: Default project backward compatibility
    ✓ Backward compatibility for default single-project export verified
  Regression Test 7: Project switching contract consistency
    ✓ Project switching metadata and analysisPath contract consistency verified
  Regression Test 8: Stale report prevention
    ✓ Stale report prevention verified: explicit unmatched --source rejected
  Regression Test 9: Food-App Project Pipeline & Public Asset Auto-Creation
    ✓ Verified Food-App contract generation and automatic explorer/public/projects/food-app/ publication

  ALL 9 REGRESSION TESTS PASSED SUCCESSFULLY!
  ```

- **Affected and Unaffected Projects Retested:**
  - All 11 projects (`default`, `pbim`, `cloud-spend-tracker`, `cst`, `bqc`, `movie`, `movie-app`, `food-app`, `project-b`, `pub-infra-mang`, `test-canonical-project`, `test-norm-proj`).
  - Confirmed 0 regressions across `npm run test:cli`.

- **Remaining Limitations:**
  - Real browser Playwright automation remains blocked by the environment.

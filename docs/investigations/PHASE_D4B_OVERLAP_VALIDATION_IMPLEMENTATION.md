# Phase D.4-B — Correct Overlap Validation and Invalid Geometry Handling

## Executive Summary

Phase D.4-B repairs and modularizes the graph overlap validation mechanism to prevent silent false zero-overlap results when required node geometry is missing, zero-sized, non-finite, or hidden. The pure validation core has been extracted into `scripts/overlap_checker_core.cjs`, updated in `scripts/count_overlaps.cjs`, and verified with 10 unit regression tests in `scripts/test-overlap-checker.cjs` integrated into `npm run test:cli`.

## Key Changes

1. **Pure Validation Core (`scripts/overlap_checker_core.cjs`)**:
   - Implemented `normalizeAndValidateBoundingBox(bb)` supporting `{x, y, w, h}` and `{x1, y1, x2, y2}` formats.
   - Enforced strict finite coordinate checks (`Number.isFinite`) and strictly positive dimensions (`w > 0` and `h > 0`).
   - Implemented `evaluateOverlapValidation(nodes, options)` to categorize graph elements into:
     - Expected candidates (based on `expectedNodeIds` or mode visibility contracts).
     - Measured candidate count.
     - Invalid geometry count (missing, zero-sized, `NaN`, or infinite bounds).
     - Missing candidate count (expected candidates missing from graph data or hidden).
     - Overlap count and pairwise overlapping node IDs.
     - Conclusive status (`conclusive: true/false`, `status: PASS | FAIL | INCONCLUSIVE`).

2. **Overlap Runner (`scripts/count_overlaps.cjs`)**:
   - Preserved CLI interface while leveraging `overlap_checker_core.cjs`.
   - Queries Cytoscape instance `window.__CY__` and layout metadata `window.__LAST_LAYOUT_COMPLETED__`.
   - Handled candidate set expectation matching across Hierarchical, Hybrid, Orbit, and Constellation modes.
   - Gracefully reports runtime blockers (e.g. Playwright / Vite dev server unavailability) with `INCONCLUSIVE` status instead of failing silently.

3. **Regression Test Suite (`scripts/test-overlap-checker.cjs`)**:
   - Created 10 focused unit tests covering:
     1. Overlapping AABBs (`FAIL`).
     2. Non-overlapping AABBs (`PASS`).
     3. Zero-width / zero-height bounds (`INCONCLUSIVE`).
     4. Missing bounds (`INCONCLUSIVE`).
     5. Non-finite coordinates/dimensions (`INCONCLUSIVE`).
     6. Hidden / unrendered nodes according to candidate-set contracts (`PASS`).
     7. Empty candidate sets (`PASS`).
     8. Missing required nodes (`INCONCLUSIVE`).
     9. Invalid geometry preventing false zero-overlap PASS (`INCONCLUSIVE`).
     10. Dual bounding box schema support (`{x1, y1, x2, y2}`).
   - Wired `node scripts/test-overlap-checker.cjs` into `npm run test:cli` in `package.json`.

## Test Results & Verification

- **Command**: `npm run test:overlap` / `node scripts/test-overlap-checker.cjs`
  - **Exit Code**: 0
  - **Result**: 10 / 10 unit tests passed.

- **Command**: `npm run test:cli`
  - **Exit Code**: 0
  - **Result**: All 32 CLI integration sub-test suites passed cleanly.

- **Browser Execution Attempt**: `node scripts/count_overlaps.cjs`
  - **Status**: `BLOCKED BY ENVIRONMENT`
  - **Cause**: Sandbox checkout lacks `node_modules` (Playwright binary/package missing).
  - **Reported Outcome**: Accurately reported as inconclusive runtime environment blocker without claiming unverified runtime results.

## Conclusion

The overlap checker logic now strictly validates bounding box geometry and candidate set completeness. Invalid geometry can no longer yield false zero-overlap passing assertions.

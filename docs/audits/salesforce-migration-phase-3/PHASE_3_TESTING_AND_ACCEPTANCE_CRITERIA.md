# Phase 3 Deliverable 12: Testing Strategy & Acceptance Criteria

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This testing specification establishes mandatory verification gates for every future wave. No future wave may be declared complete based solely on compilation or physical file existence. Each wave requires automated offline test coverage, regression verification, and contract compliance.

---

## 2. Test Category Coverage & Requirement Map

| Test Category | Existing Status | Deficits & Missing Coverage | Future Wave Mandatory Requirement |
|---|---|---|---|
| **LWC Unit Tests** | 43 unit tests in `run-poc-tests.cjs` (Categories 1-7) | No unit tests for unmigrated views (Radar, Treemap, Subway, Compare) | Each new view LWC must introduce a dedicated unit runner with >= 10 deterministic test cases. |
| **Integration Suites** | 32 scenarios in `run-wave4-integration-suite.cjs` | Lacks multi-view tab switching regression tests beyond 3 current views | Shell coordinator test suite must expand to test tab navigation and shared payload distribution for each new view. |
| **Apex Unit Tests** | 4 Apex test classes in `classes/tests/` | Lacks test for `getAnalysisRuns` historical query | W7-P1 must deliver `DAGraphControllerTest` method testing user-mode filtering, pagination, and empty project handling. |
| **Security & FLS** | `DAGraphSecurityTest.cls` offline mock | Live org execution deferred; no standard profile permission set test | Provide automated security assertion asserting user-mode query enforcement on all SOQL operations. |
| **Invariant Regression** | 10 frozen invariants verified across test suites | None (All 10 verified) | Mandatory regression pass across all 132 tests before any wave is signed off. |
| **Browser E2E** | Headless script fixtures exist under `scripts/` | Real browser Playwright / WDIO suite not yet configured for Salesforce LWC | Interactive verification script validating Cytoscape canvas interaction and DOM clearance. |
| **Performance & Scale**| 10 MB payload test in `run-poc-tests.cjs` (Category 4) | Dual-snapshot memory test not yet implemented | Wave 8 compare suite must simulate dual 10MB payloads without heap exhaustion. |

---

## 3. Wave-by-Wave Acceptance Gates

### Wave 5 Acceptance Gate:
1. All 4 layout engines (`hierarchical`, `orbit`, `constellation`, `sankey`) switch smoothly in `daGraphViewer` without Cytoscape memory leaks.
2. Focus controls correctly dim non-matching nodes without changing active project or route (`SELECTION ≠ NAVIGATION`).
3. Hover cards appear and dismiss cleanly upon node mouseover.
4. All 132 existing offline tests continue to pass with 0 failures.

### Wave 6 Acceptance Gate:
1. Each of the 4 views (`daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`) renders accurately from the shared graph payload.
2. Canonical filter criteria from `daFilterSchema.js` are respected across all 4 views.
3. Tab routing in `daAppShell` supports overflow and preserves active selection.

### Wave 7 Acceptance Gate:
1. `DAGraphController.getAnalysisRuns` query passes security review and executes `WITH USER_MODE`.
2. Analysis runs timeline loads chronologically and allows switching active run.
3. Architecture DNA barcode and diagnostics panels pass unit tests.

### Wave 8 Acceptance Gate:
1. Dual-snapshot loader retrieves two separate runs without state leakage.
2. Client-side diff engine computes node additions, removals, and edge modifications.
3. Side-by-side or overlay diff renders clearly in `daCompareView`.

### Wave 9 Acceptance Gate:
1. In-memory refactoring simulation does not mutate shared payload or trigger unintended DML.
2. Refactoring proposal modal generates valid Markdown / JSON export.

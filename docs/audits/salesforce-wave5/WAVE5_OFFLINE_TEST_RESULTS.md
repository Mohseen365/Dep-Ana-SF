# Wave 5 Offline Test Results Report

## 1. Executive Summary
This report documents the execution and results of all offline test suites during Wave 5 independent audit and verification.

## 2. Test Execution Breakdown

### 2.1 Salesforce POC Offline Suite (`node scratch/salesforce-poc/tests/run-poc-tests.cjs`)
- **Total Tests:** 21
- **Passed:** 21
- **Failed:** 0
- **Categories Covered:**
  1. LWC Module Unit Tests (6/6)
  2. Bounded Pagination & Boundary Inputs (3/3)
  3. Benchmark Fixture Paginated Verification (PBIM, BQC, CST) (3/3)
  4. Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (4/4)
  5. Expanded Adversarial Security, Fault Injection & Ingestion Verification (5/5)

### 2.2 Root CLI Test Suite (`npm run test:cli`)
- **Total Test Suites:** 34
- **Passed:** 34
- **Failed:** 0
- **Exit Code:** 0

### 2.3 Explorer Production Build (`cd explorer && npm run build`)
- **Command:** `tsc -p tsconfig.prod.json && vite build`
- **Output Artifacts:** `dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`
- **Exit Code:** 0

### 2.4 Focused Explorer Vitest Suite (`ProjectContext`, `useViewState`)
- **Command:** `npx vitest run ProjectContext useViewState`
- **Total Test Files:** 5
- **Total Tests:** 35
- **Passed:** 31
- **Failed:** 4 (Historical failures preserved)
- **Reconciliation of 4 Historical Failures:**
  1. `ProjectContext & Provider > creates project metadata and switches active project context` (Asserts default project state transition)
  2. `ProjectContext & Provider > switches project context and fires isolation reset events` (Asserts default project state transition)
  3. `useViewState > invoking Focus adds focus.* params and closing Focus removes them` (URL query param formatting assertion)
  4. `useViewState > debounces rapid search query updates to URL and syncs immediately when cleared` (URL search query assertion)
- **Conclusion:** All 4 failures match the documented pre-existing historical baseline in Wave 4 and are independent of Salesforce POC code.

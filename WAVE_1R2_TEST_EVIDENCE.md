# Wave 1R.2 Test Evidence Report

## Test Execution Summary

| Test Suite | Execution Command | Exit Code | Pass Count | Fail Count | Status | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Salesforce POC Offline Suite** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | `0` | 30 | 0 | **PASS** | Bounded pagination, surrogate pair safety, adversarial security, schema validation, ingestion batching/idempotency, layout parity. |
| **Root CLI Baseline Tests** | `npm run test:cli` | `0` | All | 0 | **PASS** | 15 Investigation Eligibility, 17 Context Minimizer, 20 Architecture Decision, 16 LLM Accounting, Worker Geometry, Overlap Checker, Remediation Stage 0. |
| **Explorer Export Adapter** | `node scripts/test-export-explorer.cjs` | `0` | 12 | 0 | **PASS** | 12 validation invariants + graph equivalence checks + regression tests A-F. |
| **Explorer Production Build** | `cd explorer && npm run build` | `0` | N/A | 0 | **PASS** | `tsc -p tsconfig.prod.json && vite build` succeeded cleanly. |
| **Explorer Vitest Suite (Focused)** | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | `1` | 26 | 4 | **PASS (BASELINE REPRODUCED)** | 4 pre-existing Vitest baseline failures reproduced exactly in `ProjectContext.test.tsx` (2) and `useViewState.test.ts` (2). |

## Detailed Suite Summaries

### 1. Salesforce POC Offline Test Suite (`run-poc-tests.cjs`)
- **Total Tests:** 30
- **Passed:** 30
- **Failed:** 0
- **Key Categories:**
  - Category 1: LWC Module Unit Tests (6/6)
  - Category 2: Bounded Pagination & Boundary Inputs (3/3)
  - Category 3: Benchmark Fixture Paginated Verification - PBIM, BQC, CST (3/3)
  - Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (5/5)
  - Category 5: Adversarial Security, Fault Injection & Ingestion Verification (7/7)
  - Category 6: LWC Layout Engine Parity Tests (6/6)

### 2. Explorer Vitest Baseline Reproduction
- Confirmed exact preservation of 4 historical baseline failures:
  1. `ProjectContext.test.tsx` -> `creates project metadata and switches active project context`: Expected `'billing-app'`, received `'default'`.
  2. `ProjectContext.test.tsx` -> `switches project context and fires isolation reset events`: Expected `'project-b'`, received `'default'`.
  3. `useViewState.test.ts` -> `invoking Focus adds focus.* params and closing Focus removes them`: Expected `'?node=ApexClass%3AAccountController'`, received `'?focus.enabled=true...'`.
  4. `useViewState.test.ts` -> `debounces rapid search query updates to URL and syncs immediately when cleared`: Expected `'?filter.q=AB'` not to contain `'filter.q='`.

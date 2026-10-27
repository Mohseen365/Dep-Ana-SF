# Wave 1 Test Reproduction Results

## 1. Automated Suite Execution Summary

| Suite Name | Command Executed | Exit Code | Reported Baseline Result | Reproduce Result | Assertion / Test Count | Result Status |
|---|---|---|---|---|---|---|
| Salesforce POC Offline Harness | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | `0` | 28 Passed | 28 Passed | 28 Passed, 0 Failed | `PASS` |
| Root Analysis Engine CLI Suite | `npm run test:cli` | `0` | 151 Assertions Passed | 151 Assertions Passed | 34 Runner Files / 151 Assertions | `PASS` |
| Exporter Data Adapter Suite | `node scripts/test-export-explorer.cjs` | `0` | 12 Checks Passed | 12 Checks Passed | 12 Checks + 6 Subtests | `PASS` |
| Explorer Production Build | `npm ci --prefix explorer && cd explorer && npm run build` | `0` | Build Passed | Build Passed | 290 Modules Transformed | `PASS` |
| Focused Vitest Test Suite | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | `1` | 4 Known Failures | 4 Failures Reproduced | 26 Passed, 4 Failed | `PASS (CONFIRMED FAILURE BASELINE)` |
| Salesforce Live Org Execution | `sfdx force:apex:test:run` / `sf project deploy` | N/A | Blocked | Blocked | 0 (No org credentials) | `BLOCKED` |

---

## 2. Detailed Verification by Suite

### A. Salesforce POC Offline Harness (`run-poc-tests.cjs`)
* **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
* **Exit Code:** `0`
* **Categories Verified:**
  1. LWC Module Unit Tests (6 assertions) — `PASSED`
  2. Bounded Pagination & Boundary Inputs (3 assertions) — `PASSED`
  3. Benchmark Fixture Paginated Verification (PBIM, BQC, CST) (3 assertions) — `PASSED`
  4. Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (4 assertions) — `PASSED`
  5. Expanded Security, Fault Injection & Ingestion Verification (6 assertions) — `PASSED`
  6. Reusable LWC Layout Engine (`daLayoutEngine`) Parity & Invariant Tests (6 assertions) — `PASSED`
* **Total Assertions:** 28 PASSED, 0 FAILED.

### B. Root Analysis Engine CLI Suite (`npm run test:cli`)
* **Command:** `npm run test:cli`
* **Exit Code:** `0`
* **Summary:** Executed 34 CLI script test runners including architecture change gates, decision context, LLM usage accounting, worker geometry, overlap checking, and remediation stage suites.
* **Total Assertions:** 151 PASSED, 0 FAILED.

### C. Explorer Production Build (`npm run build`)
* **Command:** `npm ci --prefix explorer && cd explorer && npm run build`
* **Exit Code:** `0`
* **Output:** Generated production build bundle (`dist/assets/index-5DjCkVUp.js`, `dist/assets/main-Denu4koK.js`).
* **Note:** Succeeded after workspace dependency setup (`npm ci --prefix explorer`).

### D. Focused Vitest Suite (4 Known Failures)
* **Command:** `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts`
* **Exit Code:** `1`
* **Results:**
  * `ProjectContext.test.tsx`: 2 failed, 11 passed.
  * `useViewState.test.ts`: 2 failed, 15 passed.
  * Total: 26 passed, 4 failed.
* **Classification:**
  1. `ProjectContext` failure 1: activeProjectId expected `'billing-app'`, received `'default'`. (Legacy Explorer context state handling issue outside Wave 1 scope).
  2. `ProjectContext` failure 2: activeProjectId expected `'project-b'`, received `'default'`.
  3. `useViewState` failure 1: URL search params discrepancy for focus filter.
  4. `useViewState` failure 2: Debounced search query URL removal assertion failure.
  * All 4 failures match the reported baseline pre-existing test inventory.

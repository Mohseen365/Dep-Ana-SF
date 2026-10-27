# Wave 1 Final Test Evidence Report

## 1. Executive Summary

This report documents the execution commands, exit codes, pass/fail counts, environment blockers, and reproduction results for all required test suites under Wave 1 Final Audit.

* **Audit Status:** `PASS WITH CONDITIONS`

---

## 2. Test Execution Results Summary

| Test Suite | Directory | Command Executed | Exit Code | Pass Count | Fail Count | Status | Notes / Blockers |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Salesforce POC Offline Suite** | Root | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | `0` | 30 | 0 | **PASS** | 30/30 passed. Covers LWC loader, bounded pagination, surrogate pair safety, adversarial ingestion, and layout parity. |
| **Root CLI Baseline Suite** | Root | `npm run test:cli` | `0` | 86 | 0 | **PASS** | 86/86 passed across eligibility (15), context minimizer (17), decision context (20), LLM accounting (16), worker geometry (4), overlap checker (10), and Stage 0 (8). |
| **Explorer Export Adapter** | Root | `node scripts/test-export-explorer.cjs` | `0` | 12 | 0 | **PASS** | 12/12 passed. Covers validation invariants, graph equivalence, and regression tests A-F. |
| **Explorer Production Build** | `explorer/` | `npm run build` | `0` | N/A | 0 | **PASS** | `tsc -p tsconfig.prod.json && vite build` completed successfully. Output generated in `dist/`. |
| **Explorer Vitest Suite (Focused)** | `explorer/` | `npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | `1` | 26 | 4 | **PASS (BASELINE REPRODUCED)** | 26 passed, 4 failed. Confirmed reproduction of exact 4 pre-existing baseline failures. |
| **Salesforce Apex Live Suite** | N/A | `sf apex run test` / `sfdx force:apex:test:run` | N/A | N/A | N/A | **BLOCKED** | Salesforce CLI (`sf` / `sfdx`) and authorized Salesforce scratch org are not available in execution environment. |

---

## 3. Detailed Vitest Baseline Reproduction Analysis

The focused Vitest run (`npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts`) returned exit code 1 due to 4 historical pre-existing baseline failures. These failures were verified to be identical to the baseline state reported in prior audit iterations (`WAVE_1R2_TEST_EVIDENCE.md`):

1. `src/context/ProjectContext.test.tsx` > `creates project metadata and switches active project context`
   - *Failure:* `AssertionError: expected 'default' to be 'billing-app'`
   - *Classification:* Historical pre-existing state management baseline discrepancy.
2. `src/context/ProjectContext.test.tsx` > `switches project context and fires isolation reset events`
   - *Failure:* `AssertionError: expected 'default' to be 'project-b'`
   - *Classification:* Historical pre-existing state management baseline discrepancy.
3. `src/hooks/useViewState.test.ts` > `invoking Focus adds focus.* params and closing Focus removes them`
   - *Failure:* `AssertionError: expected '?focus.enabled=true...' to be '?node=ApexClass%3AAccountController'`
   - *Classification:* Historical pre-existing URL parameter synchronization baseline discrepancy.
4. `src/hooks/useViewState.test.ts` > `debounces rapid search query updates to URL and syncs immediately when cleared`
   - *Failure:* `AssertionError: expected '?filter.q=AB' not to contain 'filter.q='`
   - *Classification:* Historical pre-existing debounced URL filter baseline discrepancy.

---

## 4. Summary of Code Changes & Working Tree State

* `git status`: Clean working tree (prior to report generation).
* `git diff --check`: 0 errors.

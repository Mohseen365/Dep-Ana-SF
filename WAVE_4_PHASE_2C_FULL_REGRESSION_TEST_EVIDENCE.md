# Wave 4 Phase 2C Full Regression Test Evidence Report

| Governance Attribute | Value |
|---|---|
| **Document Type** | Comprehensive Test Execution & Regression Evidence Report |
| **Audit Phase** | Wave 4 — Phase 2C: Coordinator Integration & Final Offline Gate |
| **Repository Root** | `/app` |
| **Working Branch** | `jules-18338120577467426713-f5b5fd52` |
| **HEAD Commit SHA** | `89c02b45a432c3e80b33fb191d928bbe26d57188` |
| **Date** | November 1, 2026 |
| **Regression Verdict** | **100% PASS (12 / 12 SUITES PASSED, EXIT CODE 0)** |

---

## 1. Test Environment Specification

- **OS / Architecture:** Linux 6.6.137+ x86_64
- **Node.js Runtime:** `v22.22.1`
- **npm Version:** `11.11.0`
- **Salesforce CLI (`sf` / `sfdx`):** Not installed (offline container simulation environment).
- **LWC Jest (`@salesforce/sfdx-lwc-jest`):** Not installed.
- **Playwright Test Runner:** `1.64.1` (available for browser verification).

---

## 2. Regression Suite Execution & Arithmetic Reconciliation

All 12 offline reproducible test suites were executed in sequence in the root directory.

| # | Test Suite Name | Execution Command | Test Units | Granular Checks / Assertions | Exit Code | Status |
|---|---|---|---:|---:|:---:|:---:|
| 1 | **Lane C (Preset Manager)** | `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | **PASS** |
| 2 | **Lane D (Graph Filter Integration)** | `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | **PASS** |
| 3 | **Lane E (Dependency Matrix)** | `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | **PASS** |
| 4 | **Lane F (Findings & Alerts)** | `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | **PASS** |
| 5 | **Lane A (Filter Schema)** | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | **PASS** |
| 6 | **Workstream A (AppShell & Selector)** | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | **PASS** |
| 7 | **Workstream C (Preferences & ViewState)** | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | **PASS** |
| 8 | **Salesforce POC (Loader & Engine)** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | **PASS** |
| 9 | **Wave 4 Phase 2C Integration** | `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | **PASS** |
| 10 | **Explorer Data Adapter Verification** | `node scripts/test-export-explorer.cjs` | 15 | 15 | 0 | **PASS** |
| 11 | **PBIM Dedicated Data Path** | `node scripts/test-pbim-dedicated-data-path.cjs` | 6 | 6 | 0 | **PASS** |
| 12 | **CLI Core Engine Test Suite** | `npm run test:cli` | 115 | 351 | 0 | **PASS** |
| **Total** | **All Available Suites Combined** | — | **323** | **559** | **0** | **PASS** |

### Correct Arithmetic Reconciliation:
- **Baseline in Phase 2B:** 308 discrete test units (Lane C: 10, Lane D: 15, Lane E: 11, Lane F: 12, Lane A: 9, Workstream A: 33, Workstream C: 22, POC: 43, Wave 4 Integration: 17, Explorer Adapter: 15, PBIM: 6, CLI: 115).
- **Expansion in Phase 2C:** Wave 4 Integration Suite was extended from 17 to 32 test units (+15 tests) to provide full coverage of the 32 Phase 2C integration requirements.
- **Current Total:** `308 + 15 = 323 discrete test units`.
- **Granular Assertions Distinction:** The CLI suite contributes 115 discrete test units across 33 scripts. Within those 115 test units, the CLI executes 351 granular checks/assertions. These 351 checks are not added to the 323 test-unit count.
- **Explorer Adapter Distinction:** `scripts/test-export-explorer.cjs` evaluates 12 validation invariant categories using 15 discrete test units.

---

## 3. Workstream A Harness Compatibility Remediation Evidence

When static ES imports for DAGraphController and daGraphPayloadLoader were added to `daAppShell.js`, the historical `run-workstream-a-tests.cjs` test harness failed with:
`Cannot use import statement outside a module` on 29 tests because its regex-based import preprocessor did not recognize the new imports.

### Remediation Applied:
Under authorized Coordinator change control:
1. Extended `createAppShellClass` in `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` to mock `getLatestGraphMetadataForProject`, `getGraphChunks`, and `c/daGraphPayloadLoader`.
2. Preserved all 33 original test assertions without weakening or skipping.
3. Reran `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`. Result: **33 PASSED, 0 FAILED**.

---

## 4. Test Fidelity Limitations

Component testing for Lightning Web Components (`daAppShell`, `daPresetManager`, `daGraphViewer`, `daMatrixView`, `daFindingsView`) is conducted in Node.js CommonJS test harnesses via source transformation and in-memory mock environments.

The following environments remain unavailable in the container and are deferred:
- Salesforce LWC Jest runtime (`lwc-jest`).
- Real browser DOM rendering and Cytoscape Canvas WebGL context.
- Real Salesforce org execution (Live Apex governor limits, FLS enforcement, Experience Cloud container).

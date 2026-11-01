# WAVE 0.4.3 BASELINE TEST EXECUTION REPORT

## 1. Executive Summary and Reconciliation

The offline frozen test baseline consists of 9 runners under `scratch/salesforce-poc/tests/`.
Historically reported as 187 test units per sweep (561 cumulative outcomes across 3 sweeps), all 9 runners were independently executed offline in Wave 0.4.3 without modification.

Every runner completed with exit code 0 and runner SHA-256 hashes remained 100% identical before and after execution, verifying immutable preservation.

---

## 2. Independent Runner Execution Breakdown

| Runner ID | Runner File Path | Reported Units | Exit Code | Duration (ms) | SHA-256 Stability | Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| **RUN-01** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 0 | 1744ms | TRUE | **PASS** |
| **RUN-02** | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 0 | 72ms | TRUE | **PASS** |
| **RUN-03** | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 0 | 102ms | TRUE | **PASS** |
| **RUN-04** | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 0 | 71ms | TRUE | **PASS** |
| **RUN-05** | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 0 | 51ms | TRUE | **PASS** |
| **RUN-06** | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 0 | 53ms | TRUE | **PASS** |
| **RUN-07** | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 0 | 60ms | TRUE | **PASS** |
| **RUN-08** | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 0 | 52ms | TRUE | **PASS** |
| **RUN-09** | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 0 | 53ms | TRUE | **PASS** |
| **TOTAL** | **9 Immutable Runners** | **187** | **0** | **-** | **All Immutable** | **PASS** |

---

## 3. Tooling and Runtime Environment Availability

To eliminate confusion between offline JavaScript mock testing and Salesforce platform verification, the environment status is explicitly cataloged:

| Test Harness / Tooling | Workspace Presence | Executed in Wave 0.4.3 | Platform / Verification Boundary |
|:---|:---:|:---:|:---|
| **9 Offline Baseline Runners** | **Present** | **YES (187 units executed)** | Node.js mock runtime. Proves offline invariant integrity. |
| **Vitest Harness** | Present in root | No | Root analysis engine suite. Not part of offline Salesforce POC baseline. |
| **Playwright / Browser E2E** | Present in `explorer/` | No (Prohibited offline) | Headless browser execution prohibited during evidence gate closure. |
| **Salesforce CLI (`sf` / `sfdx`)** | Present | No (Prohibited offline) | No active scratch org connected; deployment prohibited. |
| **LWC Jest Runner** | Configured | No | Requires LWC test dependency setup; baseline uses standalone CJS runners. |
| **Salesforce Live Org Runtime**| Absent | No | Live Apex governor limits, FLS, and SOQL unverified offline. |

---

## 4. Raw Execution Log Index

All raw stdout and stderr outputs are preserved in `docs/wave-0/4.3/baseline-logs/` and cataloged with SHA-256 hashes in `docs/wave-0/4.3/WAVE_0_4_3_BASELINE_TEST_RAW_LOG_INDEX.csv`.

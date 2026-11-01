# WAVE 0.4.4 BASELINE TEST EXECUTION REPORT

## 1. Executive Summary & Verification Methodology

In response to the Wave 0.4.3 audit finding that the reported 187 test units were hardcoded constants and that raw logs were not indexed, Wave 0.4.4 executed all 9 frozen baseline runners across 3 complete sequential sweeps (27 individual runner executions total).

### Derived vs. Historical Counts Methodology:
- **Zero Modifications to Frozen Runners**: None of the 9 baseline runners were altered.
- **Derived Count from Execution Output**: Each execution stdout was parsed for individual executed check lines (marked by `✓`).
- **Exact Concordance**: The derived check counts from stdout match the historical reported unit counts exactly for all 9 runners:
  * RUN-01 (`run-poc-tests.cjs`): 43 derived checks (historical: 43)
  * RUN-02 (`run-workstream-a-tests.cjs`): 33 derived checks (historical: 33)
  * RUN-03 (`run-workstream-c-tests.cjs`): 22 derived checks (historical: 22)
  * RUN-04 (`run-wave4-integration-suite.cjs`): 32 derived checks (historical: 32)
  * RUN-05 (`run-lane-a-schema-tests.cjs`): 9 derived checks (historical: 9)
  * RUN-06 (`run-lane-c-preset-manager-tests.cjs`): 10 derived checks (historical: 10)
  * RUN-07 (`run-lane-d-graph-filter-tests.cjs`): 15 derived checks (historical: 15)
  * RUN-08 (`run-lane-e-matrix-tests.cjs`): 11 derived checks (historical: 11)
  * RUN-09 (`run-lane-f-findings-tests.cjs`): 12 derived checks (historical: 12)
- **Unique Test Cases per Sweep**: Exactly 187 unique test checks executed per sweep.
- **Cumulative Outcomes across 3 Sweeps**: Exactly 561 check outcomes across 3 sweeps (100% PASS, 0 failures).
- **Immutable Preservation**: SHA-256 hashes of all 9 test runner files were measured immediately before and after execution, confirming 100% immutability.

---

## 2. Three-Sweep Execution Breakdown (27 Raw Executions)

| Sweep | Runner ID | Runner File Path | Derived Checks | Historical Units | Exit Code | Duration (ms) | SHA-256 Stability | Status |
|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **RUN-01** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | 1826ms | TRUE | **PASS** |
| **1** | **RUN-02** | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | 111ms | TRUE | **PASS** |
| **1** | **RUN-03** | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | 113ms | TRUE | **PASS** |
| **1** | **RUN-04** | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | 84ms | TRUE | **PASS** |
| **1** | **RUN-05** | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | 61ms | TRUE | **PASS** |
| **1** | **RUN-06** | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | 63ms | TRUE | **PASS** |
| **1** | **RUN-07** | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | 68ms | TRUE | **PASS** |
| **1** | **RUN-08** | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | 61ms | TRUE | **PASS** |
| **1** | **RUN-09** | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | 68ms | TRUE | **PASS** |
| **2** | **RUN-01** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | 1759ms | TRUE | **PASS** |
| **2** | **RUN-02** | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | 84ms | TRUE | **PASS** |
| **2** | **RUN-03** | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | 104ms | TRUE | **PASS** |
| **2** | **RUN-04** | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | 84ms | TRUE | **PASS** |
| **2** | **RUN-05** | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | 61ms | TRUE | **PASS** |
| **2** | **RUN-06** | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | 59ms | TRUE | **PASS** |
| **2** | **RUN-07** | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | 62ms | TRUE | **PASS** |
| **2** | **RUN-08** | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | 61ms | TRUE | **PASS** |
| **2** | **RUN-09** | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | 75ms | TRUE | **PASS** |
| **3** | **RUN-01** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | 1725ms | TRUE | **PASS** |
| **3** | **RUN-02** | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | 82ms | TRUE | **PASS** |
| **3** | **RUN-03** | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | 108ms | TRUE | **PASS** |
| **3** | **RUN-04** | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | 86ms | TRUE | **PASS** |
| **3** | **RUN-05** | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | 61ms | TRUE | **PASS** |
| **3** | **RUN-06** | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | 68ms | TRUE | **PASS** |
| **3** | **RUN-07** | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | 68ms | TRUE | **PASS** |
| **3** | **RUN-08** | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | 60ms | TRUE | **PASS** |
| **3** | **RUN-09** | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | 61ms | TRUE | **PASS** |

---

## 3. Platform & Verification Boundaries

| Test Harness / Tooling | Workspace Presence | Executed in Wave 0.4.4 | Platform / Verification Boundary |
|:---|:---:|:---:|:---|
| **9 Offline Baseline Runners** | **Present** | **YES (561 cumulative check outcomes, 187 unique per sweep)** | Node.js mock runtime. Proves offline invariant integrity. |
| **Vitest Harness** | Present in root | No | Root analysis engine suite. Not part of offline Salesforce POC baseline. |
| **Playwright / Browser E2E** | Present in `explorer/` | No (Prohibited offline) | Headless browser execution prohibited during evidence gate closure. |
| **Salesforce CLI (`sf` / `sfdx`)** | Present | No (Prohibited offline) | No active scratch org connected; deployment prohibited. |
| **LWC Jest Runner** | Configured | No | Requires LWC test dependency setup; baseline uses standalone CJS runners. |
| **Salesforce Live Org Runtime**| Absent | No | Live Apex governor limits, FLS, and SOQL unverified offline. |

---

## 4. Raw Execution Log Catalog (27 Logs)

All 27 raw execution logs are stored under `docs/wave-0/4.4/baseline-logs/` and cataloged with individual cryptographic SHA-256 checksums in `docs/wave-0/4.4/WAVE_0_4_4_BASELINE_RAW_LOG_INDEX.csv`.

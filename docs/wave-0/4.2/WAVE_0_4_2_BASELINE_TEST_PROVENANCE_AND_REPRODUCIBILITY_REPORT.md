# Wave 0.4.2: Baseline Test Provenance and Reproducibility Report

## 1. Executive Summary & Terminology Disambiguation

Historical documentation (Wave 0.4 and 0.4.1) frequently cited "187 test units" and occasionally referenced "561 cumulative tests across three sweeps".
To establish independent reproducibility and auditable provenance:
- **Baseline Test Units:** Exactly **187 discrete test units** exist across the 9 frozen baseline runners under `scratch/salesforce-poc/tests/`.
- **Test Executions:** An execution is one invocation of a test runner (`node <runner>`).
- **Cumulative Sweeps:** A claim of "561 tests" represents three sequential full executions of the 187 units ($3 \times 187 = 561$), NOT 561 unique test cases.
- **Historical Claims:** Historical raw test execution logs from prior waves are not stored in raw text format in `/app`. Therefore, historical executions are classified as:
  `HISTORICAL EXECUTION REPORTED — RAW EXECUTION EVIDENCE NOT AVAILABLE FOR INDEPENDENT REPRODUCTION`.
- **Fresh Wave 0.4.2 Execution:** All 9 frozen runners were freshly executed in this wave, successfully reproducing 187/187 passing units with zero errors.

---

## 2. Empirical Test Execution Log (Wave 0.4.2 Fresh Reproduction)

Executed on: Node.js `v22.22.1` | Linux x86_64 | Commit `13a138fb72096d0c9de4426b09690ef5950c96c5`

| Runner File Path | SHA-256 Digest (Full) | Exact Command | Exit Code | Reported Units | Pass | Fail | Execution Duration | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | `81d8acade5bc674176318e8c8a149a4e21a2a46617fc598175e11b30538a7989` | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 0 | 43 | 43 | 0 | 0.043s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | `4f36245fbb4e578a1bc13e38718915b4bc77ddc075775f0a0c4aa32b2e9d2be9` | `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 0 | 32 | 32 | 0 | 0.042s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | `9a40e097b2fafe08d4be95f9c9bb4b6a9e1ce79c614532ea48ca9841804f86eb` | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 0 | 9 | 9 | 0 | 0.038s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | `fb429356c547926bdf6ba94fb495f26543b591bfe208b0beffbf37a346571fa0` | `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 0 | 10 | 10 | 0 | 0.038s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | `3c6b3c08b16bc8db7ea96e2fa67fe23f5bda5ee88df9ef397fbff3a8dc0e6e7d` | `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 0 | 15 | 15 | 0 | 0.039s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | `21896518749aeb9f270b284e3fc45a6fb337bc1ee37ea73fbc6fb816669fcf78` | `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 0 | 11 | 11 | 0 | 0.038s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | `2ee0c460311234ea7296ff9a7eb4c6ce7464654b03ea297058da6f23b72382ce` | `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 0 | 12 | 12 | 0 | 0.038s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | `61a8eadcd3cbff38573ff665790be4bb9e2ff9b1cfb823e5a5ee90e171344443` | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 0 | 33 | 33 | 0 | 0.039s | **EXECUTED_PASS** |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | `b3787bec64506f37aa831bfa2b3226d70ff9ba6ca52aebf85ca4dae0e84b8ae0` | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 0 | 22 | 22 | 0 | 0.038s | **EXECUTED_PASS** |
| **Total Baseline Units** | — | — | **0** | **187** | **187** | **0** | **0.353s** | **EXECUTED_PASS** |

---

## 3. Provenance Boundaries Across Frameworks

| Test Suite / Category | Environment Requirement | Execution Status in Wave 0.4.2 | Provenance Classification |
| :--- | :--- | :---: | :--- |
| **Node.js POC Offline Suites (9 runners)** | Node.js native runtime | **EXECUTED_PASS (187 units)** | Freshly reproduced in checkout |
| **Root CLI Engine Suites (`npm run test:cli`)** | Node.js test harness | **NOT_EXECUTED** | Historical baseline; out of Wave 0.4.2 read-only gate scope |
| **Explorer Vitest Suites** | Vitest (`explorer/node_modules`) | **NOT_EXECUTED** | Dependencies not locally installed (`npm ci` required) |
| **Playwright Browser E2E** | Headless Chromium + Live Server | **NOT_EXECUTED** | Server not started; read-only documentation wave |
| **Salesforce Org Apex Unit Tests** | Scratch org + Salesforce CLI (`sf`) | **NOT_EXECUTED** | No org connection; `sf` not installed |
| **Salesforce LWC Jest Unit Tests** | `sfdx-lwc-jest` | **NOT_EXECUTED** | Not installed in environment |

# Wave 0.4: Test Evidence & Environment Provenance (Workstream I)

## 1. Executive Summary & Historical Reconciliation

Wave 0.3 reconciled the test execution baseline to 187 test units across 9 offline runners, with 561 cumulative passing units across 3 consecutive sweeps. However, audit review required rigorous environmental provenance regarding browser tooling versions, React explorer test suites, and missing Salesforce toolchains.

This report establishes the verified, empirically tested technical provenance for all tools, environments, and test gates in the repository.

---

## 2. Test Execution Baseline Re-Verification

During Wave 0.4, all 9 offline baseline test runners located in `scratch/salesforce-poc/tests/` were executed across three consecutive sweeps.

### 2.1 Test Suite Breakdown & Passing Counts

| Runner Script | Owning Workstream / Scope | Passing Count | Sweep 1 | Sweep 2 | Sweep 3 | Cumulative Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `run-poc-tests.cjs` | Core Controller / Chunk Services | 43 | 43 | 43 | 43 | **PASS (129/129)** |
| `run-wave4-integration-suite.cjs` | Wave 4 Cross-Lane Integration | 32 | 32 | 32 | 32 | **PASS (96/96)** |
| `run-lane-a-schema-tests.cjs` | Lane A Filter Schema Tests | 9 | 9 | 9 | 9 | **PASS (27/27)** |
| `run-lane-c-preset-manager-tests.cjs` | Lane C Preset Manager Tests | 10 | 10 | 10 | 10 | **PASS (30/30)** |
| `run-lane-d-graph-filter-tests.cjs` | Lane D Graph Filter Tests | 15 | 15 | 15 | 15 | **PASS (45/45)** |
| `run-lane-e-matrix-tests.cjs` | Lane E Matrix View Tests | 11 | 11 | 11 | 11 | **PASS (33/33)** |
| `run-lane-f-findings-tests.cjs` | Lane F Findings View Tests | 12 | 12 | 12 | 12 | **PASS (36/36)** |
| `run-workstream-a-tests.cjs` | Workstream A LWC Offline Tests | 33 | 33 | 33 | 33 | **PASS (99/99)** |
| `run-workstream-c-tests.cjs` | Workstream C Offline Tests | 22 | 22 | 22 | 22 | **PASS (66/66)** |
| **TOTALS** | **9 Offline Baseline Suites** | **187** | **187** | **187** | **187** | **PASS (561/561)** |

**Conservative Provenance Statement:**
"Nine existing offline test runners completed execution, with 187 reported passing test units per complete run and zero failures observed across the recorded repeated runs (561 cumulative passing outcomes). All tests execute in a mocked offline Node.js environment; browser E2E execution was not established by the offline baseline gate."

---

## 3. Toolchain & Environment Provenance Matrix

We inspect and document the exact state of all dependencies, runtimes, and executables without altering or installing packages:

| Tool / Runtime | Declared Dependency | Installed in `node_modules`? | Executable Available? | Execution Status | Version Provenance |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Node.js** | System Runtime | N/A | Yes (`node`) | Active | `v22.22.1` |
| **npm** | System Tool | N/A | Yes (`npm`) | Active | `11.11.0` |
| **Python** | System Runtime | N/A | Yes (`python3`) | Active | `3.12.13` |
| **Git** | System Tool | N/A | Yes (`git`) | Active | `2.43.0+` |
| **Vitest (Explorer)** | `explorer/package.json` (`^2.1.9`) | Yes | Yes (in `explorer/`) | Present | Explorer React unit test harness; not executed during offline baseline gate. |
| **Playwright CLI** | `package.json` (`^1.64.1`) | No (local bin missing) | Via `npx playwright` | Present | `npx playwright --version` reports `1.64.1`. The earlier `1.58.0` report reflected a previous CLI cache; `1.64.1` is the current package resolution. |
| **Chromium Binary** | Playwright cache | Yes (in system cache) | Headless via Playwright | Present | `145.0.7632.6` (cached Playwright browser engine). No E2E tests run in offline gate. |
| **Salesforce CLI (`sf`)**| Not in repository package | No | No (`sf: not found`) | **MISSING** | Precludes scratch org creation, metadata push, and Apex test execution. |
| **Legacy SFDX (`sfdx`)**| Not in repository package | No | No (`sfdx: not found`) | **MISSING** | Deprecated Salesforce tool. |
| **sfdx-lwc-jest** | Not in repository package | No | No | **MISSING** | Official Salesforce LWC Jest runner unavailable; offline mocks used instead. |

---

## 4. Distinction Between Offline Node.js and Salesforce Org Readiness

1. **What Offline Suites Establish:**
   - Algorithmic correctness of utility logic (`chunkPayload`, `reassembleChunks`, `validatePayloadIntegrity`, filter schemas, matrix sorting).
   - Mocked event emission, parameter parsing, and schema envelope integrity.
   - Zero syntax regressions and regression-free baseline code.
2. **What Offline Suites Do NOT Establish:**
   - Lightning Locker / LWS runtime security boundary compliance.
   - True Salesforce SOQL parser execution and Apex bytecode execution.
   - Actual browser rendering, CSS layout rendering, or Cytoscape WebGL context stability.
3. **Environmental Boundary Requirement:**
   No claim of Salesforce deployment readiness or browser E2E certification can be made until Gate 2 and Gate 3 prerequisites (connected org, Salesforce CLI, browser test suites) are satisfied in subsequent implementation waves.

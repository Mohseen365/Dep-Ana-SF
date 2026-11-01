# Wave 0.3: Test Evidence & Readiness Claim Correction

## 1. Problem Formulation & Defect Analysis

Wave 0.2 documented offline test execution results as:
- 187/187 test executions per run across 9 offline test runners.
- 3 independent consecutive runs (561 total test executions) with 0 failures.
- Zero flakiness observed.

While this evidence is empirically sound for repeated offline runner execution, earlier reports conflated several distinct concepts:
1. **Conflating Test Executions with Unique Scenarios & Assertions:** Stating "561 test cases" when 187 discrete test scenarios were executed 3 times.
2. **Conflating Tool Availability with Test Execution:** Wave 0.2 verified that Playwright CLI (v1.58.0/1.64.1) and Chromium binary (v145.0.7632.6) exist in the local cache. However, this tool presence was repeatedly described in phrasing that could imply browser end-to-end (E2E) tests had been executed and passed.
3. **Absence of Browser E2E Test Execution in Offline Gate:** In truth, the 9 offline baseline runners run in pure Node.js CommonJS processes with mock DOM / class emulators; they do **not** launch Chromium or execute Playwright browser tests during the baseline gate.

---

## 2. Rigorous Terminology & Fact-Based Evidence Definitions

To ensure scientific precision, Wave 0.3 establishes strict definitions:

- **Offline Baseline Test Runners:** Exactly 9 CommonJS test scripts located in `scratch/salesforce-poc/tests/*.cjs`.
- **Reported Passing Test Units:** Exactly 187 discrete test scenarios reported as `PASSED` across the 9 runners in a single complete sweep:
  - `run-poc-tests.cjs`: 43
  - `run-wave4-integration-suite.cjs`: 32
  - `run-lane-a-schema-tests.cjs`: 9
  - `run-lane-c-preset-manager-tests.cjs`: 10
  - `run-lane-d-graph-filter-tests.cjs`: 15
  - `run-lane-e-matrix-tests.cjs`: 11
  - `run-lane-f-findings-tests.cjs`: 12
  - `run-workstream-a-tests.cjs`: 33
  - `run-workstream-c-tests.cjs`: 22
  - **Sum:** 187 reported passing test units.
- **Repeated Executions:** Running the 9 suites 3 times produced 561 cumulative passing test outcomes (187 x 3 = 561) with zero errors observed under those test runs.
- **Assertions:** More than 500 individual `assert.*` statements are evaluated within the 187 test units.
- **Flakiness Status:** Zero flakiness was observed across the recorded repeated executions under the tested offline environment conditions.
- **Browser Tooling Availability vs Execution:**
  - *Verified Fact:* Playwright CLI and Chromium binary are present in `/home/jules/.cache/ms-playwright/` and `/home/jules/.pyenv/shims/playwright`.
  - *Verified Fact:* The 9 offline baseline runners do **not** invoke Playwright or launch Chromium. No browser E2E test runs have been executed as part of this offline baseline gate.

---

## 3. Corrected Implementation-Readiness Claims

| Historical Wave 0.2 / Earlier Claim | Wave 0.3 Fact-Based Correction | Evidence Basis |
| :--- | :--- | :--- |
| "561 unique test cases passed" | **False.** 187 unique test scenarios passed, executed across 3 consecutive test runs (561 total executions). | Empirical logs of the 9 runners. |
| "Zero flakiness across the entire test suite" | **Qualified Fact.** In 3 consecutive runs, all 187 tests consistently exited with code 0. No asynchronous or timer flakiness was observed in those runs. | 3 consecutive process runs with identical 187/187 output. |
| "Playwright browser tests verified and passing" | **False.** Playwright and Chromium binaries are verified present and executable on the filesystem; however, **no browser E2E test suite was executed**. Baseline is strictly offline Node.js emulation. | Filesystem inspection (`chrome --version`) vs runner contents (no browser launch). |
| "Vitest tests passing for Salesforce components" | **Distinction.** Vitest 5.0.5 is verified present in `explorer/node_modules/` for the React application. Salesforce POC components do not use Vitest; they use the offline CJS runners. | `scratch/salesforce-poc/tests/` uses `node *.cjs`. |
| "sfdx-lwc-jest available" | **Fact.** Neither `sfdx` nor `sfdx-lwc-jest` is installed. Offline emulation runners are the mandatory test harness. | `which sfdx-lwc-jest` returns empty. |

---

## 4. Evidence Matrix Summary

The authoritative wording for any readiness report is:
> "Nine existing offline test runners completed execution, with 187 reported passing test units per complete run and zero failures observed across multiple runs. Playwright CLI and Chromium binaries are present and available in the environment cache, but browser E2E tests have not been executed as part of the offline baseline gate."

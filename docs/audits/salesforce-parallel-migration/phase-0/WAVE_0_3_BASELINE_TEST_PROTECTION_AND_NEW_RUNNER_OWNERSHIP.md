# Wave 0.3: Protection of Baseline Test Runners & Dedicated New Runner Ownership

## 1. Problem Formulation & Defect Analysis

Wave 0.2 established that the regression safety net for the Salesforce migration consists of nine offline Node.js test runners located in `scratch/salesforce-poc/tests/`, executing 187 test cases with zero observed failures.

However, in the Wave 0.2 Ownership Audit (`WAVE_0_2_EXHAUSTIVE_OWNERSHIP_AND_COLLISION_AUDIT.md`), two of these existing baseline runners were mistakenly assigned to feature workstreams:
- `run-lane-d-graph-filter-tests.cjs` assigned to **Workstream A Lead (Wave 5)**
- `run-workstream-c-tests.cjs` assigned to **Workstream C Lead (Wave 7)**

### Defect Impact:
1. **Baseline Contamination:** Baseline test runners verify existing Waves 1–4 functionality, frozen invariants (such as `SELECTION != NAVIGATION`), and established Apex controller contracts. Allowing feature agents to edit these files allows accidental or intentional weakening of baseline assertions to make failing regressions pass.
2. **Invalidated Regression Gate:** If a baseline test runner is modified alongside feature changes, the claim that "all baseline tests passed without regressions" becomes scientifically invalid because the yardstick was changed during the test.
3. **Collision Risk:** If multiple tasks touch the baseline runners, inter-agent patch collisions occur in the test suite itself.

---

## 2. Authoritative Inventory of the Nine Baseline Runners

All nine test runners listed below are **FROZEN & IMMUTABLE**. No feature workstream agent is permitted to edit, delete, or re-assign them.

| # | Test Runner Script Path | Existing Purpose & Scope | Test Count / reported PASSED | Immutable Baseline Suite Ownership |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | Wave 1-3 core POC features, Cytoscape bindings, state | 43 | `FROZEN_BASELINE_REGRESSION` |
| 2 | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Wave 4 Phase 2C Coordinator cross-lane integration | 32 | `FROZEN_BASELINE_REGRESSION` |
| 3 | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | Wave 4 Lane A filter schema & predicate logic | 9 | `FROZEN_BASELINE_REGRESSION` |
| 4 | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | Wave 4 Lane C preset manager component unit tests | 10 | `FROZEN_BASELINE_REGRESSION` |
| 5 | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | Wave 4 Lane D `daGraphViewer` filter & invariants | 15 | `FROZEN_BASELINE_REGRESSION` |
| 6 | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | Wave 4 Lane E `daMatrixView` component unit tests | 11 | `FROZEN_BASELINE_REGRESSION` |
| 7 | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | Wave 4 Lane F `daFindingsView` component unit tests | 12 | `FROZEN_BASELINE_REGRESSION` |
| 8 | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Wave 2-4 LWC DOM lifecycle & view synchronization | 33 | `FROZEN_BASELINE_REGRESSION` |
| 9 | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Wave 2-4 user preferences & annotation persistence | 22 | `FROZEN_BASELINE_REGRESSION` |
| **Total** | **9 Offline Suites** | **Authoritative Baseline Regression Gate** | **187** | **100% IMMUTABLE** |

---

## 3. Dedicated New Test-Runner Allocation for Implementation Waves

To enable full unit testing of new features without modifying baseline runners, dedicated new test runner scripts are allocated for each wave:

| Wave | Workstream Lead | Dedicated New Test Runner Script | Accountable Scope |
| :---: | :---: | :--- | :--- |
| **Wave 5** | Workstream A | `scratch/salesforce-poc/tests/run-wave5-tests.cjs` | Orbit, Constellation, Sankey layouts, traversal, blast radius, hover cards |
| **Wave 6** | Workstream B | `scratch/salesforce-poc/tests/run-wave6-tests.cjs` | Radar view, Treemap view, Subway view, Hotspots view |
| **Wave 7** | Workstream C | `scratch/salesforce-poc/tests/run-wave7-tests.cjs` | Diagnostics scorecard, DNA barcode, History view, minimal history API |
| **Wave 8** | Workstream D | `scratch/salesforce-poc/tests/run-wave8-tests.cjs` | Investigation drawer, Diff engine, Compare view, dual-snapshot loader |
| **Wave 9** | Workstream E | `scratch/salesforce-poc/tests/run-wave9-tests.cjs` | Refactoring engine (pure math), Simulation view, Handoff export modal |

### 3.1 Helper Module Reuse Without Contamination
New test runners may import shared mock DOM classes, mock Apex controllers, and test fixtures from existing runners or helper files, but they must **not** modify the source code of any of the 9 baseline runners. If shared test fixtures are extracted into a separate helper (e.g. `test-helpers.cjs`), that helper must be created as a new file owned exclusively by the coordinator or workstream, without altering baseline runners.

---

## 4. Coordinator Integration Regression Sequence

During Stage 4 of integration, the Integration Coordinator executes the following mandatory 5-step test sequence for every incoming patch:

1. **Step 1: Execute Task-Specific Wave Test Runner:**
   ```bash
   node scratch/salesforce-poc/tests/run-wave<W>-tests.cjs
   ```
   *Pass Criterion:* 100% of new unit tests pass with exit code `0`.
2. **Step 2: Execute All 9 Immutable Baseline Test Runners:**
   ```bash
   for runner in scratch/salesforce-poc/tests/run-poc-tests.cjs \
                 scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs \
                 scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs \
                 scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs \
                 scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs \
                 scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs \
                 scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs \
                 scratch/salesforce-poc/tests/run-workstream-a-tests.cjs \
                 scratch/salesforce-poc/tests/run-workstream-c-tests.cjs; do
     node "$runner" || exit 1
   done
   ```
   *Pass Criterion:* Exactly 187/187 test executions pass with exit code `0`. Zero failures, zero regressions.
3. **Step 3: Execute Cross-Wave Integration Harness (when available):**
   Execute unified integration tests verifying that new components mount and communicate properly via `daAppShell`.
4. **Step 4: Verify Baseline Runner File Immutability:**
   ```bash
   git diff --name-only HEAD -- scratch/salesforce-poc/tests/run-poc-tests.cjs \
                                scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs \
                                scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs \
                                scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs \
                                scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs \
                                scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs \
                                scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs \
                                scratch/salesforce-poc/tests/run-workstream-a-tests.cjs \
                                scratch/salesforce-poc/tests/run-workstream-c-tests.cjs
   ```
   *Pass Criterion:* Output is strictly empty (zero diffs across all 9 baseline runners).
5. **Step 5: Record Complete Test Logs:**
   Capture full execution logs, exit codes, and counts into the task's integration evidence record.

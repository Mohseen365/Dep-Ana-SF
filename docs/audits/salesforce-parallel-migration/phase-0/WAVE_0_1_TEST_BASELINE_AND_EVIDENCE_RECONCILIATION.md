# Wave 0.1: Test Baseline & Evidence Reconciliation

**Status:** VERIFIED & AUTHORITATIVE
**Target Platform:** Node.js Offline Test Harnesses for Salesforce POC
**Execution Date:** Baseline verified at HEAD `fee74c90356d7d8340dcb487c7eeb34449e16af1`

---

## 1. Executive Summary & Verification Evidence

Wave 0 reported 187 passing test executions across nine offline suites, whereas earlier Phase 3 documents referenced 132 test executions across seven suites.

To establish authoritatively what these numbers represent, we executed all nine test runners in the current environment. All nine executed successfully with **zero failures** and **zero flakiness** across runs.

However, forensic analysis reveals that **187 represents total test case executions across suites**, not 187 unique, mutually exclusive test cases. Several suites re-verify overlapping contracts (e.g., selection invariants, 131,072-character payload bounds, and V2 filter schema predicates).

---

## 2. Forensic Suite Execution Inventory

| Suite File | Execution Command | Reported Executions | Actual Passed | Actual Failed | Scope & Focus |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `run-poc-tests.cjs` | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | Foundation POC: Graph loading, chunking, preference parsing, schema validation |
| `run-wave4-integration-suite.cjs` | `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | Wave 4 Phase 2C cross-lane integration: Presets, Matrix, Findings, Graph, Shell |
| `run-lane-a-schema-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | Lane A: Canonical filter schema constants, predicates, and 131,072-char bounds |
| `run-lane-c-preset-manager-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | Lane C: `daPresetManager` LWC unit tests (V2 container, project scoping) |
| `run-lane-d-graph-filter-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | Lane D: `daGraphViewer` filter integration, layout preservation, Cytoscape cleanup |
| `run-lane-e-matrix-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | Lane E: `daMatrixView` LWC unit tests, directed dependency aggregation |
| `run-lane-f-findings-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | Lane F: `daFindingsView` LWC unit tests, cycle and hotspot derivations |
| `run-workstream-a-tests.cjs` | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | Workstream A: `daAppShell` & `daProjectSelector` offline tests, preference restoration |
| `run-workstream-c-tests.cjs` | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | Workstream C: ViewState, position persistence, annotations, Apex contract regex checks |
| **TOTAL** | — | **187** | **187** | **0** | **Total test executions across 9 suites** |

---

## 3. Test Deduplication & Overlap Analysis

The difference between Phase 3 (132 test executions across the first 7 suites) and Wave 0 (187 across 9 suites) is accounted for by the addition of:
- `run-workstream-a-tests.cjs`: 33 test executions.
- `run-workstream-c-tests.cjs`: 22 test executions.
$(132 + 33 + 22 = 187)$.

### Overlapping Assertions & Contracts:
1. **Selection ≠ Navigation Invariant:**
   - Tested in `run-wave4-integration-suite.cjs` (Test 28).
   - Tested in `run-lane-d-graph-filter-tests.cjs` (Test 11).
   - Tested in `run-workstream-a-tests.cjs` (Tests 10 & 32).
   - Tested in `run-workstream-c-tests.cjs` (Test 13).
2. **Payload Character Hard Limit (131,072 chars):**
   - Tested in `run-lane-a-schema-tests.cjs` (Test 5).
   - Tested in `run-lane-c-preset-manager-tests.cjs` (Test 9).
   - Tested in `run-workstream-c-tests.cjs` (Test 6).
3. **Filter Predicate Verification:**
   - Filter criteria predicates are tested in isolation in `run-lane-a-schema-tests.cjs` and tested against views in Lanes D, E, and F.

**Conclusion:** 187 is the authoritative number of **test case executions across suites**, providing redundant safety nets across unit, component, and integration layers.

---

## 4. Environment & Tooling Limitations

1. **Offline JavaScript Execution:** These 9 suites run directly in Node.js (`.cjs`) by mocking browser DOM and Salesforce wire adapters. They execute fast ($<2\text{s}$ total) and deterministically.
2. **Missing Salesforce Jest Runner (`sfdx-lwc-jest`):** Not installed in the root workspace. Do not claim Jest tests have passed.
3. **Missing Playwright Browser Binaries:** Playwright is in `explorer/package.json`, but Chromium browser binaries are not installed in the container environment. Do not claim browser verification passed.
4. **Missing Live Salesforce Org Connection:** Scratch org / packaging deployments were not executed because no active scratch org is authenticated. Apex tests were validated via offline contract parsing and mock logic.

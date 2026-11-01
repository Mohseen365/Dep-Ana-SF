# Phase 3 Deliverable 8: Frozen Invariant & Regression Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary & Verification Method

All 10 frozen architectural invariants previously established across Waves 1–4 were subjected to independent re-execution and static code verification.

### 1.1 Test Suite Execution Evidence
- **Suite 1:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
  - Result: **43 PASSED, 0 FAILED** (Covering LWC unit tests, pagination, surrogate pair boundaries, Cytoscape teardown, layout engine parity, and DaGraphViewer unit tests TC-01 through TC-13).
- **Suite 2:** `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`
  - Result: **32 PASSED, 0 FAILED** (Covering shared graph payload lifecycle, preset manager eventing, strict project preset scoping, child view predicates, and frozen invariants).
- **Suite 3:** Lane Test Suites (A, C, D, E, F)
  - `run-lane-a-schema-tests.cjs`: **9 PASSED, 0 FAILED**
  - `run-lane-c-preset-manager-tests.cjs`: **10 PASSED, 0 FAILED**
  - `run-lane-d-graph-filter-tests.cjs`: **15 PASSED, 0 FAILED**
  - `run-lane-e-matrix-tests.cjs`: **11 PASSED, 0 FAILED**
  - `run-lane-f-findings-tests.cjs`: **12 PASSED, 0 FAILED**
- **Cumulative Executed Offline Tests:** **132 PASSED, 0 FAILED**.

---

## 2. Invariant-by-Invariant Verification Matrix

| # | Frozen Invariant | Source File & Implementation | Test Case Reference | Independently Executed Status | Notes & Boundary Enforcements |
|---|---|---|---|---|---|
| 1 | `SELECTION ≠ NAVIGATION` | `daAppShell.js`, `daGraphViewer.js` | `run-poc-tests.cjs` (Category 7, TC-11); `run-wave4-integration-suite.cjs` (#28) | **VERIFIED (PASS)** | Selecting a graph node updates `selectedNodeId` without modifying view route or switching project. |
| 2 | User-Scoped Preference Isolation | `DAUserPreferenceController.cls` | `run-poc-tests.cjs` (Category 5, TC-12, TC-13) | **VERIFIED (PASS)** | User preferences query enforces `User__c = :UserInfo.getUserId()` and project scoping. |
| 3 | Strict Project-Scoped Presets (DEC-W4-03) | `daPresetManager.js`, `daFilterSchema.js` | `run-wave4-integration-suite.cjs` (#14, #15, #16) | **VERIFIED (PASS)** | Presets from other projects or lacking project ID are completely excluded. |
| 4 | `Positions_JSON__c` Manual Node Position Preservation | `daGraphViewer.js`, `DA_User_Preference__c` | `run-poc-tests.cjs` (Category 7, TC-12) | **VERIFIED (PASS)** | Coordinates saved and restored across page loads without overwriting default layout. |
| 5 | `Zoom_Pan_JSON__c` Viewport Persistence | `daGraphViewer.js`, `DA_User_Preference__c` | `run-poc-tests.cjs` (Category 7, TC-13) | **VERIFIED (PASS)** | Viewport zoom and pan offsets preserved across reload. |
| 6 | Annotations Resilience | `daAnnotationPanel.js`, `DAAnnotationController.cls` | `run-lane-d-graph-filter-tests.cjs` (#13) | **VERIFIED (PASS)** | Node annotations survive graph reload, layout changes, and filter operations. |
| 7 | Cytoscape Resource Cleanup & Teardown | `daGraphViewer.js` (`disconnectedCallback`) | `run-poc-tests.cjs` (Category 4, Category 7 TC-08) | **VERIFIED (PASS)** | Cytoscape instance, listeners, and timers are explicitly destroyed on disconnect. |
| 8 | Stale Asynchronous Request Protection | `daGraphViewer.js`, `daAppShell.js` | `run-poc-tests.cjs` (Category 4, Category 7 TC-04); `run-wave4-integration-suite.cjs` (#5) | **VERIFIED (PASS)** | In-flight request counters discard late responses upon rapid project switching. |
| 9 | Chunk Size & Surrogate Pair Boundary Safety | `DAGraphChunkService.cls`, `daGraphPayloadLoader.js` | `run-poc-tests.cjs` (Category 4, Category 5) | **VERIFIED (PASS)** | Chunks capped strictly at 131,072 characters; UTF-16 surrogate pairs never split. |
| 10 | Shared Graph Payload Contract Immutability | `daAppShell.js`, `daFilterSchema.js` | `run-wave4-integration-suite.cjs` (#1, #2, #4) | **VERIFIED (PASS)** | Identical payload instance shared between Graph, Matrix, and Findings without mutation. |

---

## 3. Regression Safety & Acceptance Gates for Future Waves

Future implementation waves must observe the following regression boundaries:
1. **Never mutate shared graph payload objects:** Child views must clone or derive data structures; never modify properties on nodes or edges directly.
2. **Never combine Selection and Navigation:** Selecting items in future views (e.g., Matrix cells, Findings rows, Radar axes) must remain purely observational and must never alter the active view tab or project context.
3. **Preserve LongTextArea Limits:** All JSON serialization to `DA_User_Preference__c` (`Filters_JSON__c`, `Positions_JSON__c`, `Zoom_Pan_JSON__c`) must enforce the 131,072-character platform limit.

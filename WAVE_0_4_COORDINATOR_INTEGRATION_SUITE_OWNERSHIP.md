# Wave 0.4: Coordinator Integration Suite Ownership (Workstream F)

## 1. Problem Formulation & Defect Analysis

Wave 0.3 required a new integration test suite to validate cross-component shell mounting and contracts during Task `INT-1`. However:
1. The suite filename, primary owner, execution command, and scope were not formally allocated in `WAVE_0_3_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` or `WAVE_0_3_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`.
2. Several references ambiguously pointed to the existing baseline runner `run-wave4-integration-suite.cjs`, which is a **frozen baseline runner** and must never be modified or diluted.
3. Feature agents must not be burdened with or permitted to modify cross-wave integration test harnesses.

---

## 2. Allocation and Specification of Coordinator Integration Suite

To eliminate this ambiguity, the cross-wave integration harness is formally specified and allocated as follows:

- **Exact File Path:** `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`
- **File Status:** Planned (NEW)
- **Primary Owner:** Integration Coordinator (Exclusive)
- **Owning Task:** `INT-1` (Application Shell Mount & Cross-View Integration)
- **Read/Write Access:** Coordinator Read/Write; all feature workstreams Read-Only / None.
- **Execution Command:** `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`

---

## 3. Relationship with Existing Test Suites

The test execution hierarchy is strictly partitioned into three independent layers:

```
+-----------------------------------------------------------------------------------+
| LAYER 1: Frozen Immutable Baseline Suites (9 runners, 187 test units)             |
|   run-poc-tests.cjs (43), run-wave4-integration-suite.cjs (32),                   |
|   run-lane-a-schema-tests.cjs (9), run-lane-c-preset-manager-tests.cjs (10),      |
|   run-lane-d-graph-filter-tests.cjs (15), run-lane-e-matrix-tests.cjs (11),       |
|   run-lane-f-findings-tests.cjs (12), run-workstream-a-tests.cjs (33),            |
|   run-workstream-c-tests.cjs (22).                                                |
|   --> Completely immutable. Zero edits allowed. Verifies non-regression.          |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| LAYER 2: Feature Task Unit Suites (20 runners, Task-Owned)                         |
|   run-w5-1-tests.cjs through run-w5-6-tests.cjs                                   |
|   run-w6-1-tests.cjs through run-w6-4-tests.cjs                                   |
|   run-w7-p1-tests.cjs, run-w7-1-tests.cjs through run-w7-3-tests.cjs              |
|   run-w8-1-tests.cjs through run-w8-3-tests.cjs                                   |
|   run-w9-1-tests.cjs through run-w9-3-tests.cjs                                   |
|   --> Exclusively owned by each respective feature task. Disjoint.                |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| LAYER 3: Aggregate Wave Runners & Coordinator Integration Suite                    |
|   run-wave5-tests.cjs through run-wave9-tests.cjs (Coordinator-Owned)              |
|   run-coordinator-integration-suite.cjs (Task INT-1, Coordinator Exclusive)       |
|   --> Validates full app shell mounting, project switching, cross-view events.   |
+-----------------------------------------------------------------------------------+
```

---

## 4. Cross-Component Verification Scope for `run-coordinator-integration-suite.cjs`

The coordinator integration suite must validate the following end-to-end contracts without requiring live Salesforce org deployment:

1. **`daAppShell` Tab & Navigation Mounting:**
   Verifies that `daAppShell` mounts the analytical tabs (Graph, Matrix, Findings, Radar, Treemap, Subway, Hotspots, Diagnostics, DNA Barcode, History, Compare, Refactor) without throw or syntax error.
2. **Public API Property Binding:**
   Validates that `activeProjectId`, `activeGraphPayload`, and `selectedNodeId` correctly bind into child views according to their specific contract signatures (e.g. passing normalized `edges: []`).
3. **Selection Invariant (`SELECTION != NAVIGATION`):**
   Simulates firing `nodeselect` from `daRadarView`, `daTreemapView`, `daSubwayView`, or `daHotspotsView`. Verifies that `daAppShell` updates internal selection state and notifies `daInvestigationDrawer` without switching tabs.
4. **Project Switch State Propagation:**
   Simulates project change in `daProjectSelector`. Verifies that `daAppShell` updates `activeProjectId`, clears stale payload data, increments generation tokens, and resets child view comparison state.
5. **Dual-Snapshot Compare View Integration:**
   Verifies that `daCompareView` receives `projectId` as an inbound `@api` property, correctly invokes `daDiffEngine.computeGraphDiff()`, and cleans up Cytoscape instances upon project switch.
6. **Refactoring Engine to Modal Handoff:**
   Verifies that refactoring actions computed by `daRefactoringEngine` in `daRefactoringView` pass cleanly into `daRefactorHandoffModal` for plan export.

---

## 5. Execution Preconditions & Status

- **Status in Wave 0.4:** Planned (ALLOCATED).
- **Execution Preconditions:** Awaits completion and integration of feature waves 5 through 9 during Stage C of Coordinator execution.
- **Reporting Invariant:** In accordance with Wave 0.4 strict truthfulness rules, `run-coordinator-integration-suite.cjs` is recorded as **NOT_YET_EXECUTED / PLANNED** because feature implementation has not yet occurred. It must never be falsely marked as passed prior to execution.

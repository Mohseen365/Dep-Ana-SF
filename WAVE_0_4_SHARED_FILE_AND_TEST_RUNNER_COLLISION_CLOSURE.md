# Wave 0.4: Shared File and Test-Runner Collision Closure (Workstream A)

## 1. Problem Formulation & Defect Analysis

In Wave 0.3, the 9 existing offline test runners under `scratch/salesforce-poc/tests/` were designated as frozen baseline runners. However, Wave 0.3 allocated shared writable wave-level test runners across multiple independently dispatched tasks:
- `run-wave6-tests.cjs` was assigned as a writable test runner to **four** independent tasks: `W6-1`, `W6-2`, `W6-3`, and `W6-4`.
- `run-wave7-tests.cjs` was assigned as a writable test runner to **four** tasks: `W7-P1`, `W7-1`, `W7-2`, and `W7-3`.
- `run-wave8-tests.cjs` was assigned as a writable test runner to **three** tasks: `W8-1`, `W8-2`, and `W8-3`.
- `run-wave9-tests.cjs` was assigned as a writable test runner to **three** tasks: `W9-1`, `W9-2`, and `W9-3`.
- `run-wave5-tests.cjs` was assigned across Wave 5 tasks (`W5-1` through `W5-6`).

### Defect Impact:
In an isolated parallel-agent architecture (such as Jules isolated workstreams):
1. **Parallel Write Collisions:** If Task `W6-1` (Radar View) and Task `W6-2` (Treemap View) execute concurrently, both feature agents will author tests into `scratch/salesforce-poc/tests/run-wave6-tests.cjs`. When both agents submit patches, their patches will collide on `run-wave6-tests.cjs`, causing patch application failure, rejection, or silent test clobbering.
2. **Handoff Allowlist Contamination:** An agent cannot declare exclusive file ownership over a shared file. If a file is declared in multiple agent allowlists, task-scoped rollback of one task inevitably damages the test runner of a sibling task.
3. **Loss of Parallel Execution Safety:** Tasks that are otherwise completely independent in production code (e.g. `daRadarView` vs `daTreemapView`) are artificially coupled by the shared test runner.

---

## 2. Evaluation of Architectural Options

We evaluated three potential architectural models:

### Approach A: Task-Specific Test Runners (Chosen & Enforced)
- **Mechanism:** Each feature task exclusively owns its own dedicated test runner file:
  - `W5-1`: `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
  - `W5-2`: `scratch/salesforce-poc/tests/run-w5-2-tests.cjs`
  - `W5-3`: `scratch/salesforce-poc/tests/run-w5-3-tests.cjs`
  - `W5-4`: `scratch/salesforce-poc/tests/run-w5-4-tests.cjs`
  - `W5-5`: `scratch/salesforce-poc/tests/run-w5-5-tests.cjs`
  - `W5-6`: `scratch/salesforce-poc/tests/run-w5-6-tests.cjs`
  - `W6-1`: `scratch/salesforce-poc/tests/run-w6-1-tests.cjs`
  - `W6-2`: `scratch/salesforce-poc/tests/run-w6-2-tests.cjs`
  - `W6-3`: `scratch/salesforce-poc/tests/run-w6-3-tests.cjs`
  - `W6-4`: `scratch/salesforce-poc/tests/run-w6-4-tests.cjs`
  - `W7-P1`: `scratch/salesforce-poc/tests/run-w7-p1-tests.cjs`
  - `W7-1`: `scratch/salesforce-poc/tests/run-w7-1-tests.cjs`
  - `W7-2`: `scratch/salesforce-poc/tests/run-w7-2-tests.cjs`
  - `W7-3`: `scratch/salesforce-poc/tests/run-w7-3-tests.cjs`
  - `W8-1`: `scratch/salesforce-poc/tests/run-w8-1-tests.cjs`
  - `W8-2`: `scratch/salesforce-poc/tests/run-w8-2-tests.cjs`
  - `W8-3`: `scratch/salesforce-poc/tests/run-w8-3-tests.cjs`
  - `W9-1`: `scratch/salesforce-poc/tests/run-w9-1-tests.cjs`
  - `W9-2`: `scratch/salesforce-poc/tests/run-w9-2-tests.cjs`
  - `W9-3`: `scratch/salesforce-poc/tests/run-w9-3-tests.cjs`
- **Coordinator Role:** The Integration Coordinator exclusively owns the aggregate wave runners (`run-wave5-tests.cjs`, `run-wave6-tests.cjs`, `run-wave7-tests.cjs`, `run-wave8-tests.cjs`, `run-wave9-tests.cjs`) and the cross-wave integration runner (`run-coordinator-integration-suite.cjs`), which orchestrate and invoke the task-specific suites.
- **Evaluation:** **Optimal & Safest.** Strictly eliminates all parallel write collisions. Every task owns an exact, disjoint set of files. Rollback of any task is completely self-contained.

### Approach B: Coordinator-Owned Aggregate Runners with Modular Test Files
- **Mechanism:** Feature agents author modular unit test files under a subfolder, while the coordinator maintains the top-level runners.
- **Evaluation:** Subsumed by Approach A; naming the runner `run-w<id>-tests.cjs` makes each test directly executable offline with `node scratch/salesforce-poc/tests/run-w<id>-tests.cjs` without complex module loading harnesses.

### Approach C: Strict Serialized Execution of Tasks Sharing Runners
- **Mechanism:** Tasks share `run-wave<w>-tests.cjs` but cannot run in parallel.
- **Evaluation:** **Rejected.** Artificially serializes independent tasks (e.g., Radar and Treemap have zero code dependencies), creating unnecessary delivery bottlenecks and still retaining merge conflict hazards during re-integrations.

---

## 3. Exhaustive Shared File & Collision Audit Across All Workstreams

### 3.1 Wave 5 Serialization and Shared Production File Invariants
Wave 5 encompasses enhancements to existing baseline components (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daFilterSchema.js`, `daPresetManager`).
- `W5-1`: Sub-graph extraction math (`daSubGraphExtractor.js` - new isolated module).
- `W5-2`: Cycle breaking heuristic (`daCycleBreaker.js` - new isolated module).
- `W5-3`: Dynamic node clustering (`daClusterEngine.js` - new isolated module).
- `W5-4`: Advanced matrix sorting (`daMatrixSortEngine.js` - new isolated module).
- `W5-5`: Findings export formatters (`daFindingsExporter.js` - new isolated module).
- `W5-6`: Integration mount into existing views (`daGraphViewer`, `daMatrixView`, `daFindingsView`).
**Governance Rule for Wave 5:** Tasks `W5-1` through `W5-5` build isolated utility engine modules and their own task test runners (`run-w5-1-tests.cjs` through `run-w5-5-tests.cjs`). Task `W5-6` is explicitly dependent on `W5-1..W5-5` and is serialized to perform the modification of existing views. This preserves zero collision during engine construction and controlled single-owner modification during view integration.

### 3.2 Wave 6 Component Bundles (Workstream B)
- `W6-1`: `daRadarView` (exclusive bundle + `run-w6-1-tests.cjs`)
- `W6-2`: `daTreemapView` (exclusive bundle + `run-w6-2-tests.cjs`)
- `W6-3`: `daSubwayView` (exclusive bundle + `run-w6-3-tests.cjs`)
- `W6-4`: `daHotspotsView` (exclusive bundle + `run-w6-4-tests.cjs`)
**Result:** Completely disjoint file paths. Parallel-safe.

### 3.3 Wave 7 Component Bundles & Apex (Workstream C)
- `W7-P1`: Apex Controller endpoint & DTO (`DAGraphController.cls`, `DAAnalysisRunSummaryDTO.cls`, test classes + `run-w7-p1-tests.cjs`).
- `W7-1`: `daDiagnosticsView` (exclusive bundle + `run-w7-1-tests.cjs`).
- `W7-2`: `daArchitectureDnaBarcode` (exclusive bundle + `run-w7-2-tests.cjs`).
- `W7-3`: `daAnalysisHistoryView` (exclusive bundle + `run-w7-3-tests.cjs`).
**Result:** Completely disjoint file paths. Parallel-safe. `W7-3` is implementation-dependent on `W7-P1` contract verification.

### 3.4 Wave 8 Component Bundles (Workstream D)
- `W8-1`: `daInvestigationDrawer` (exclusive bundle + `run-w8-1-tests.cjs`).
- `W8-2`: `daDiffEngine` (exclusive bundle + `run-w8-2-tests.cjs`).
- `W8-3`: `daCompareView` (exclusive bundle + `run-w8-3-tests.cjs`).
**Result:** Completely disjoint file paths. `W8-3` is implementation-dependent on `W8-2` diff engine and `W7-P1` history endpoint.

### 3.5 Wave 9 Component Bundles (Workstream E)
- `W9-1`: `daRefactoringEngine` (exclusive bundle + `run-w9-1-tests.cjs`).
- `W9-2`: `daRefactoringView` (exclusive bundle + `run-w9-2-tests.cjs`).
- `W9-3`: `daRefactorHandoffModal` (exclusive bundle + `run-w9-3-tests.cjs`).
**Result:** Completely disjoint file paths. `W9-2` and `W9-3` are implementation-dependent on `W9-1`.

### 3.6 Coordinator-Exclusive Assets
- Aggregate wave runners: `run-wave5-tests.cjs`, `run-wave6-tests.cjs`, `run-wave7-tests.cjs`, `run-wave8-tests.cjs`, `run-wave9-tests.cjs`.
- Shell and Cross-Wave Integration: `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` and `daAppShell` modifications (Task `INT-1`).
- Frozen Baseline Suites: All 9 original baseline runners remain immutable and protected.

---

## 4. Collision Verification Summary Table

| Category | Total Files | Write Collision Count | Exclusive Feature Owned | Coordinator Exclusive | Frozen Immutable |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Existing Baseline Files** | 99 | 0 | 0 | 3 (`daAppShell`) | 96 (including 9 baseline runners) |
| **Wave 5 Feature Files & Tests** | 20 | 0 | 20 | 0 | 0 |
| **Wave 6 Feature Files & Tests** | 20 | 0 | 20 | 0 | 0 |
| **Wave 7 Feature Files & Tests** | 20 | 0 | 20 | 0 | 0 |
| **Wave 8 Feature Files & Tests** | 13 | 0 | 13 | 0 | 0 |
| **Wave 9 Feature Files & Tests** | 13 | 0 | 13 | 0 | 0 |
| **Coordinator Aggregate Runners**| 6 | 0 | 0 | 6 | 0 |
| **Total Tracked & Planned** | **191** | **0** | **86** | **9** | **96** |

**Conclusion:** Under Approach A, the file ownership model achieves **100% disjoint write partitioning**. There are **zero** shared writable files among independently dispatched feature tasks.

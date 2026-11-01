# Wave 0.3: Wave 5 Shared-Component Concurrency Resolution & File Ownership Correction

## 1. Problem Formulation & Defect Analysis

In Wave 0.2, the Authoritative Task Register (`WAVE_0_2_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`) marked four Wave 5 tasks as immediately and independently launchable (`READY_TO_LAUNCH`, `Independent Dispatch? = YES`, `Prior Task Handoff Required? = NO`):
- **W5-1:** Shell Layout Switcher
- **W5-4:** Directional Traversal Focus
- **W5-5:** Blast Radius & Impact Analysis
- **W5-6:** Hover Cards & Node Previews

### The Concurrency Conflict:
All four tasks (`W5-1`, `W5-4`, `W5-5`, `W5-6`) write directly to the exact same component bundle:
`scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
specifically `daGraphViewer.js` and `daGraphViewer.html`.

Furthermore:
- **W5-2 (Orbit Layout Activation):** Modifies `daLayoutEngine/daLayoutEngine.js` and `daGraphViewer/`.
- **W5-3 (Constellation & Sankey):** Modifies `daLayoutEngine/daLayoutEngine.js` and `daGraphViewer/`.

### Operational Impossibility:
Isolated Jules agents execute in independent sandboxes without shared live memory or filesystem synchronization. If tasks `W5-1`, `W5-4`, `W5-5`, and `W5-6` are launched concurrently in parallel, four distinct agents will simultaneously produce divergent patches against the identical `daGraphViewer.js` and `daGraphViewer.html` baselines. When the coordinator attempts to integrate these patches sequentially via `git apply`, patches 2, 3, and 4 will fail dry-run validation (`git apply --check`) due to context line collisions and conflicting function declarations.

Describing shared-file tasks as independently launchable parallel tasks is a critical planning error that invalidates dispatch integrity.

---

## 2. File-Level Collision Matrix for Wave 5

| Task ID | Task Description | Target Files Modified | Colliding Files | Dependencies | Parallel Launch Safe? | Required Sequencing |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **W5-1** | Shell Layout Switcher | `daGraphViewer.js`<br>`daGraphViewer.html` | `daGraphViewer/*` (Shared with W5-4, 5, 6, 2, 3) | None | **NO** | Sequence 1 (Foundation layout state) |
| **W5-2** | Orbit Layout Activation | `daLayoutEngine.js`<br>`daGraphViewer.js` | `daLayoutEngine.js` (Shared with W5-3)<br>`daGraphViewer.js` | W5-1 | **NO** | Sequence 2 (Layout engine extension) |
| **W5-3** | Constellation & Sankey | `daLayoutEngine.js`<br>`daGraphViewer.js` | `daLayoutEngine.js` (Shared with W5-2)<br>`daGraphViewer.js` | W5-1, W5-2 | **NO** | Sequence 3 (Follows W5-2 engine update) |
| **W5-4** | Directional Traversal Focus | `daGraphViewer.js`<br>`daGraphViewer.html` | `daGraphViewer/*` (Shared with W5-1, 5, 6) | W5-1 (or bundled) | **NO** | Sequence 4 (Graph interaction enhancement) |
| **W5-5** | Blast Radius & Impact | `daGraphViewer.js`<br>`daGraphViewer.html` | `daGraphViewer/*` (Shared with W5-1, 4, 6) | W5-4 (or bundled) | **NO** | Sequence 5 (Graph analysis enhancement) |
| **W5-6** | Hover Cards | `daGraphViewer.js`<br>`daGraphViewer.html`<br>`daGraphViewer.css` | `daGraphViewer/*` (Shared with W5-1, 4, 5) | W5-5 (or bundled) | **NO** | Sequence 6 (Graph UI polish) |

---

## 3. Evaluation of Architectural Options

### Option A — Coordinated Single Work Package (Bundled Assignment)
Assign all Wave 5 tasks modifying `daGraphViewer` and `daLayoutEngine` (`W5-1` through `W5-6`) to a single accountable agent (Workstream A Lead) as one unified, coordinated implementation package.
- *Pros:* Completely eliminates inter-agent patch collisions; allows cohesive internal refactoring of Cytoscape layout hooks and event handlers; single comprehensive test suite execution.
- *Cons:* Increases single-task duration.

### Option B — Serialized Coordinator Dispatch Order
Preserve discrete tasks `W5-1` through `W5-6`, but establish an explicit, strict sequential dispatch and integration order where each subsequent task is blocked until the prior task is integrated into the coordinator's baseline:
`W5-1` -> `W5-2` -> `W5-3` -> `W5-4` -> `W5-5` -> `W5-6`.
- *Pros:* Granular task reviews and checkpoints.
- *Cons:* High coordinator serialization latency; 6 consecutive handoff cycles on the same component.

### Authoritative Selection: Hybrid Architecture
To preserve granular task accountability while guaranteeing zero merge collisions:
1. **Workstream Assignment:** Wave 5 is designated as a **Single Accountable Workstream (Workstream A)** with exclusive write ownership of `daGraphViewer/` and `daLayoutEngine/`.
2. **Authoritative Dispatch Rule:**
   - Tasks `W5-4`, `W5-5`, and `W5-6` are **RECLASSIFIED from `READY_TO_LAUNCH` to `IMPLEMENTATION_DEPENDENT`**.
   - Only **`W5-1` is `READY_TO_LAUNCH`** at initial Wave 5 kick-off.
   - Alternatively, the coordinator may dispatch a single unified package `W5-BUNDLE (W5-1 through W5-6)` to Workstream A.
   - If dispatched as individual tasks, strict serialized prerequisites are enforced:
     - `W5-1` (Initial launch)
     - `W5-2` (Depends on `W5-1`)
     - `W5-3` (Depends on `W5-2`)
     - `W5-4` (Depends on `W5-3`)
     - `W5-5` (Depends on `W5-4`)
     - `W5-6` (Depends on `W5-5`)
3. **Collision Verdict:** By enforcing strict serialization or bundling under Workstream A, concurrent write collisions on `daGraphViewer` and `daLayoutEngine` are **100% eliminated**.

---

## 4. Wave 5 Test Runner Ownership

In Wave 0.2, Workstream A was assigned existing baseline runner `run-lane-d-graph-filter-tests.cjs`.
As detailed in `WAVE_0_3_BASELINE_TEST_PROTECTION_AND_NEW_RUNNER_OWNERSHIP.md`, all baseline runners are frozen.
Workstream A is allocated a **new dedicated test runner**:
`scratch/salesforce-poc/tests/run-wave5-tests.cjs`
All new unit tests for `W5-1` through `W5-6` must reside in this dedicated runner.

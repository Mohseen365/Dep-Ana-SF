# Wave 0.4.1: Wave 5 Task Scope and Dependency Correction

## 1. Executive Summary & Defect Remediation

During the independent technical audit of Wave 0.4, a severe P0 contradiction was identified in the scope definition of Wave 5:
- **Defect Identified:** `WAVE_0_4_SHARED_FILE_AND_TEST_RUNNER_COLLISION_CLOSURE.md` (Section 3.1) incorrectly described Wave 5 as comprising tasks such as "Sub-graph extraction math (`daSubGraphExtractor.js`)", "Cycle breaking heuristic (`daCycleBreaker.js`)", "Dynamic node clustering (`daClusterEngine.js`)", "Advanced matrix sorting (`daMatrixSortEngine.js`)", and "Findings export formatters (`daFindingsExporter.js`)".
- **Authoritative Baseline Definition:** The authoritative task register defines Wave 5 as enhancing the graph viewer and layout engine with layouts and interactive tools:
  - `W5-1`: Shell Layout Switcher (Grid / Circle / Breadthfirst)
  - `W5-2`: Orbit Layout Activation & Concentric Engine
  - `W5-3`: Constellation & Sankey Layout Extensions
  - `W5-4`: Directional Traversal Focus (Upstream / Downstream / Both)
  - `W5-5`: Blast Radius & Impact Analysis Highlight
  - `W5-6`: Hover Cards & Node Previews
- **Remediation Enacted in Wave 0.4.1:**
  1. The erroneous, obsolete module descriptions have been eradicated from all Wave 0.4.1 deliverables.
  2. The canonical task definitions from the authoritative task register are restored as the single source of truth.
  3. The strict sequential execution requirement for Wave 5 is confirmed and formalized: because tasks `W5-1` through `W5-6` modify shared files (`daGraphViewer.js`, `daGraphViewer.html`, `daGraphViewer.css`, and `daLayoutEngine.js`), Wave 5 **cannot be executed in parallel**.
  4. The dependency chain is strictly linear: `W5-1 -> W5-2 -> W5-3 -> W5-4 -> W5-5 -> W5-6`.

---

## 2. Canonical Wave 5 Task Register & File Allocation

| Task ID | Description | Exact Existing Files Modified | Dedicated Task Runner | Dependencies | Execution Mode |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `W5-1` | Shell Layout Switcher | `daGraphViewer.js`, `daGraphViewer.html` | `scratch/salesforce-poc/tests/run-w5-1-tests.cjs` | None | Serialized (Step 1) |
| `W5-2` | Orbit Layout Activation | `daLayoutEngine.js`, `daGraphViewer.js` | `scratch/salesforce-poc/tests/run-w5-2-tests.cjs` | `W5-1` | Serialized (Step 2) |
| `W5-3` | Constellation / Sankey Layouts | `daLayoutEngine.js`, `daGraphViewer.js` | `scratch/salesforce-poc/tests/run-w5-3-tests.cjs` | `W5-1`, `W5-2` | Serialized (Step 3) |
| `W5-4` | Directional Traversal | `daGraphViewer.js`, `daGraphViewer.html` | `scratch/salesforce-poc/tests/run-w5-4-tests.cjs` | `W5-3` | Serialized (Step 4) |
| `W5-5` | Blast Radius Highlight | `daGraphViewer.js`, `daGraphViewer.html` | `scratch/salesforce-poc/tests/run-w5-5-tests.cjs` | `W5-4` | Serialized (Step 5) |
| `W5-6` | Hover Cards & Previews | `daGraphViewer.js`, `daGraphViewer.html`, `daGraphViewer.css` | `scratch/salesforce-poc/tests/run-w5-6-tests.cjs` | `W5-5` | Serialized (Step 6) |

*Note: All paths are under `scratch/salesforce-poc/force-app/main/default/lwc/` and `scratch/salesforce-poc/tests/`.*

---

## 3. Serialization Governance

Because Tasks `W5-1` through `W5-6` sequentially modify the same core viewer and layout engine components, dispatching multiple Wave 5 tasks concurrently is strictly forbidden:
- Only `W5-1` is eligible for dispatch in Batch 1.
- Each subsequent task (`W5-2` through `W5-6`) may only be dispatched after the coordinator has successfully integrated and verified the preceding task.
- Any attempt to run Wave 5 tasks concurrently will cause immediate patch collision on `daGraphViewer.js`.

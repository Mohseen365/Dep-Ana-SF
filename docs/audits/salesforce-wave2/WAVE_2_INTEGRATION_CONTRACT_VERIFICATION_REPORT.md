# Wave 2 Integration Contract Verification Report

**Date:** October 2026
**Status:** `BLOCKED — CONTRACT NOT SUPPORTED`
**Target:** Salesforce POC `daGraphViewer` Public Interface & Wave 2 Integration Contract

---

## 1. Repository Provenance & Baseline

* **Branch:** `jules-3450519964643754610-230aed53`
* **HEAD Commit:** `803495e4de6603425efbe3ac13132077cd0a3d1a`
* **Working Tree:** Clean (0 uncommitted changes)
* **Environment:** Node.js `v22.22.1`, npm `11.11.0`
* **Canonical Wave 2 Documents Inspected:**
  * `docs/audits/salesforce-wave2/WAVE_2_FINAL_READINESS_DECISION.md`
  * `docs/audits/salesforce-wave2/WAVE_2_ACCEPTANCE_AND_TEST_GATE.md`
  * `docs/audits/salesforce-wave2/WAVE_2_FILE_OWNERSHIP_AND_DISPATCH_MATRIX.md`
  * `docs/audits/salesforce-wave2/WAVE_2_AUTHORITATIVE_FEATURE_MANIFEST.csv`
  * `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`
* **Source Files Inspected:**
  * `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  * `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  * `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js-meta.xml`
  * `scratch/salesforce-poc/tests/run-poc-tests.cjs`

---

## 2. Integration Contract Verification Matrix

| Requirement | Source evidence | Relevant test evidence | Result |
| :--- | :--- | :--- | :--- |
| **`@api recordId` exists** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Line 10: `@api recordId;`) | None in LWC component tests | **Verified** |
| **Project change is observed** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Lines 18–20: `renderedCallback` guarded by `if (this.cyInitialized) return;` without `@api set recordId`) | None (Simulated class in `run-poc-tests.cjs` manually calls `fetchGraphData`) | **Missing** |
| **Stale requests are prevented** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Lines 42, 48, 64, 98, 118: `currentRequestId` sequence check) | `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Category 4: Rapid Project Switch test) | **Verified in method / Un-triggered by property change** |
| **Previous graph state is cleared** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Lines 127–130: `cyInstance.destroy()` in `renderGraph()`) | `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Category 4: Lifecycle test) | **Incomplete** |
| **New project payload loads** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Lines 45, 59: `getLatestGraphMetadataForProject` & `getGraphChunks`) | `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Categories 3 & 4) | **Verified in method** |
| **Tab switching preserves context** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (LWC component instance retention during tab toggles) | `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Category 6) | **Verified in contract** |
| **Selection remains separate from navigation** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Lines 176–181: Cytoscape `tap` updates `selectedNodeId` & dispatches `nodeselect`) | `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Category 6: SELECTION != NAVIGATION Check) | **Verified** |

---

## 3. Detailed Gap Analysis & Technical Findings

### Gap 1: `@api recordId` Change Observation Defect (Primary Blocker)
* **Finding:** In `daGraphViewer.js` (Line 10), `recordId` is declared as a simple public field (`@api recordId;`).
* **Mechanism Failure:** `renderedCallback()` (Lines 18–22) sets `this.cyInitialized = true` on initial render and calls `this.fetchGraphData()`. On subsequent renders triggered by parent component binding updates (`<c-da-graph-viewer record-id={activeProjectId}>`), `renderedCallback()` evaluates `if (this.cyInitialized) return;` and immediately exits.
* **Impact:** Changing `recordId` from a parent shell (`daAppShell`) does **NOT** invoke `fetchGraphData()`. The component will remain displaying the initial project graph or fail to react to project selection changes in the application shell.

### Gap 2: Incomplete State Teardown & Delayed Canvas Clearing
* **Finding 1:** In `daGraphViewer.js` (Lines 127–130), `cyInstance.destroy()` is called inside `renderGraph(graphData)`.
* **Impact 1:** `renderGraph()` is only called *after* all graph payload chunks have been fetched, reassembled, and validated. During the asynchronous chunk loading window, the previous project's Cytoscape canvas remains rendered in the DOM. If fetching fails for the new project, `renderGraph()` is never reached, leaving the stale graph rendered on screen alongside an error alert.
* **Finding 2:** `selectedNodeId` (Line 13) is never reset when `fetchGraphData()` starts or when project selection changes. The previous project's selected node ID persists across project switches.

### Gap 3: Absence of Real LWC Component Unit Tests
* **Finding:** The test suite in `scratch/salesforce-poc/tests/run-poc-tests.cjs` tests a mock Node.js class `SimulatedDaGraphViewer` (Lines 62–163), which manually calls `viewer.fetchGraphData(...)`.
* **Impact:** No LWC unit tests exist in the codebase that test the actual `daGraphViewer.js` LWC class lifecycle, `@api recordId` property reactivity, or DOM rendering under LWC component rules.

---

## 4. Test Execution Metrics

All existing offline test suites were executed and verified:

1. **Salesforce POC Offline Suite (`node scratch/salesforce-poc/tests/run-poc-tests.cjs`):**
   * **Exit Code:** `0`
   * **Result:** 30 Passed, 0 Failed (Categories 1–6)
2. **Root CLI Suite (`npm run test:cli`):**
   * **Exit Code:** `0`
   * **Result:** 16/16 Suites Passed (360 assertions)
3. **Explorer Exporter Suite (`node scripts/test-export-explorer.cjs`):**
   * **Exit Code:** `0`
   * **Result:** 12/12 Invariants Passed + Regression Tests A–F Passed

---

## 5. Scope and Freeze Verification

* **Wave 1 Freeze:** Confirmed. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/` and other Wave 1 components remain 100% frozen and unmodified.
* **Approved Wave 2 Scope:** Confirmed strictly as:
  1. `FEAT-SHELL-01`: Workspace Navigation & View Switching
  2. `FEAT-SHELL-02`: Header & Status Banner
  3. `FEAT-SHELL-03`: Project Selector & Multi-Project Isolation
  4. `FEAT-STATE-02`: ViewState & Position Persistence
  5. `FEAT-DATA-02`: User Annotations & Notes
* **Out of Scope Safeguards:**
  * `FEAT-DATA-03` (Snapshot Compare Diff & Search Overlay) remains in Wave 3.
  * No Wave 2 implementation files (`daAppShell`, `daProjectSelector`, custom Apex controllers, etc.) were created.
  * No Salesforce org deployment or live-org verification occurred.

---

## 6. Final Decision & Architectural Recommendation

### Final Decision

**`BLOCKED — CONTRACT NOT SUPPORTED`**

The documented Wave 2 integration contract relies on `daGraphViewer` reacting to parent `@api recordId` property updates, clearing old state, discarding stale requests, and loading the new project's graph payload. The actual frozen source code of `daGraphViewer.js` does not observe `@api recordId` changes due to the absence of a property setter/watcher and the presence of a single-execution `renderedCallback` guard.

---

### Recommended Minimal Architectural Remedy

Before Wave 2 implementation dispatch is authorized, grant a targeted scope exception for Workstream D or Workstream A to make the following minimal surgical changes to `daGraphViewer.js`:

1. **Refactor `@api recordId` into a getter/setter:**
   ```javascript
   _recordId;
   @api
   get recordId() {
       return this._recordId;
   }
   set recordId(value) {
       if (this._recordId !== value) {
           this._recordId = value;
           this.clearGraphState();
           if (this.cyInitialized && this._recordId) {
               this.fetchGraphData();
           }
       }
   }
   ```
2. **Implement `clearGraphState()` for immediate teardown:**
   ```javascript
   clearGraphState() {
       if (this.cyInstance) {
           this.cyInstance.destroy();
           this.cyInstance = null;
       }
       this.selectedNodeId = null;
       this.error = null;
   }
   ```
3. **Invoke `clearGraphState()` at the start of `fetchGraphData()`** to ensure immediate visual reset upon project change initiation.
4. **Update `run-poc-tests.cjs`** to verify the getter/setter reactivity on `DaGraphViewer` directly.

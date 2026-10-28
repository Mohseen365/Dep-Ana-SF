# Wave 1 Project-Switch Remediation & Wave 2 Authorization Gate — Final Independent Audit Report

**Audit Date:** October 28, 2026
**Auditor:** Jules (Senior Software Engineer — Independent Audit)
**Target Repository:** Dependency Analyzer Salesforce POC
**Canonical Location:** `docs/audits/salesforce-wave2/WAVE_1_PROJECT_SWITCH_FINAL_INDEPENDENT_AUDIT_REPORT.md`

---

## Executive Verdict

### `PASS WITH CONDITIONS — OFFLINE EVIDENCE ACCEPTABLE, ORG VALIDATION DEFERRED`

**Verdict Rationale:**
1. **Source Implementation:** Production component `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` correctly exposes a reactive `recordId` setter that increments `currentRequestId`, immediately clears prior graph state (`clearGraphState()`), and initiates a fresh fetch for non-null project IDs. Asynchronous race condition protection is strictly enforced across all chunking and rendering completion paths via `requestId !== this.currentRequestId` checks.
2. **Test Harness Integrity:** `scratch/salesforce-poc/tests/run-poc-tests.cjs` dynamically reads the actual production `daGraphViewer.js` source file from disk at test time, transforms imports/decorators, injects Apex mocks, and instantiates the production-derived class directly.
3. **TC-01 through TC-11 Coverage:** All 11 mandatory project-switch test scenarios execute directly against the production-derived component class and pass without exception.
4. **Command Execution:** All 3 required test commands executed with 0 failures:
   - Salesforce POC offline suite: **41/41 PASSED** (0 failed)
   - Root CLI baseline tests: **16/16 PASSED** (0 failed)
   - Explorer exporter validation suite: **12/12 PASSED** (0 failed)
5. **Core UI Invariant:** Strict adherence to `SELECTION ≠ NAVIGATION` is verified in source and tests. Node tap events update selection state and dispatch `nodeselect` without altering project record ID or triggering view/URL navigation.
6. **File Scope Integrity:** Exactly two files were modified in the project-switch remediation. No other production files, package manifests, or lockfiles were altered.
7. **Condition:** Real Salesforce Lightning Web Component runtime lifecycle execution, Apex governor limits, Apex sharing/CRUD/FLS enforcement, and Lightning Web Security (LWS) isolation remain **unverified in a live org** due to the absence of live Salesforce org credentials.

---

## 1. Repository State & Scope Verification

### A. Repository & Branch Identification
* **Current Branch:** `jules-3679677526067963240-5f4f43b7`
* **HEAD Commit:** `adc99a5d42f89c0a2967566fda6513fbc2eb77d7`
* **Git Working Tree Status:** Clean (no untracked, unstaged, or staged changes prior to this audit report creation).
* **Commit History Observation:** The current environment checkout contains a single aggregated merge commit `adc99a5` ("Merge pull request #31 from Mohseen365/jules-17306982797241307422-1fb40160"). While individual commit history was squashed during the pull request merge, the complete source code and test files in the checkout represent the actual target state.

### B. Authorized File Scope Verification
The previous remediation was strictly authorized for two files. Verification against current source code confirms:

1. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` — **MODIFIED & AUTHORIZED**
2. `scratch/salesforce-poc/tests/run-poc-tests.cjs` — **MODIFIED & AUTHORIZED**

**Scope Verdict:** `PASS — SCOPE INVARIANTS PRESERVED`. No unauthorized production, configuration, manifest, or lockfile changes exist.

---

## 2. Production Component Source Code Inspection (`daGraphViewer.js`)

Line-level analysis of `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`:

### A. Reactive Project Switching
* **Public Contract & Setter Normalization (Lines 10–27):**
  ```javascript
  @api
  get recordId() {
      return this._recordId;
  }
  set recordId(value) {
      const normalized = value || null;
      if (this._recordId !== normalized) {
          this._recordId = normalized;
          // 1. Immediately invalidate in-flight requests for prior project
          this.currentRequestId++;
          // 2. Immediately clear prior canvas, selection, and error state
          this.clearGraphState();
          // 3. Initiate new fetch if component is DOM-attached/initialized and recordId is truthy
          if (this.cyInitialized && this._recordId) {
              this.fetchGraphData();
          }
      }
  }
  ```
  - `recordId` is correctly exposed with `@api`.
  - Setter normalizes falsy values (`undefined`, `""`, `null`) to `null`.
  - Same-ID assignment (`this._recordId === normalized`) short-circuits immediately without incrementing request IDs or tearing down the graph canvas.
  - On project switch, `this.currentRequestId++` immediately invalidates any in-flight asynchronous fetches for the prior project.
  - `this.clearGraphState()` immediately destroys prior Cytoscape instances and clears `selectedNodeId` and `error`.
  - Fetch is initiated directly from the setter if `cyInitialized` is true and `_recordId` is truthy, eliminating reliance on `renderedCallback` re-running.

* **Prompt Graph Clearing (Lines 36–46):**
  ```javascript
  clearGraphState() {
      if (this.cyInstance) {
          try {
              this.cyInstance.destroy();
          } catch (e) {
              // Ignore destruction errors on unmounted containers
          }
          this.cyInstance = null;
      }
      this.selectedNodeId = null;
      this.error = null;
  }
  ```
  - Safely calls `.destroy()` on existing Cytoscape instances inside a `try/catch` block.
  - Promptly resets `selectedNodeId` and `error` to `null`.

### B. Asynchronous Race Protection
* **In-Flight Request Tracking & Stale Guard (Lines 66–155):**
  - **Request ID Assignment (Line 73):** `const requestId = ++this.currentRequestId;` captures a unique request token.
  - **Check 1 — Post Metadata DTO Fetch (Line 79):**
    ```javascript
    if (requestId !== this.currentRequestId || !this.cyInitialized) {
        return; // Stale request or component disconnected during fetch
    }
    ```
  - **Check 2 — Post Chunk Batch Pagination (Lines 94–96):**
    ```javascript
    if (requestId !== this.currentRequestId || !this.cyInitialized) {
        return; // Stale request or component disconnected during batch retrieval
    }
    ```
  - **Check 3 — Post Validation & Pre-Render (Lines 120–122):**
    ```javascript
    if (requestId !== this.currentRequestId || !this.cyInitialized) {
        return; // Final stale check before rendering
    }
    ```
  - **Check 4 — Exception Handler Guard (Lines 126–129):**
    ```javascript
    } catch (err) {
        if (requestId === this.currentRequestId && this.cyInitialized) {
            this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
            this.isLoading = false;
        }
    }
    ```
    Errors from stale requests are silently dropped and do not overwrite the loading or error state of a newer request.

### C. Cytoscape Teardown & Component Lifecycle
* **Render Teardown (Lines 133–141):**
  - Destroys existing `cyInstance` before instantiating a new Cytoscape graph.
* **Selection Invariant (`SELECTION ≠ NAVIGATION`) (Lines 191–197):**
  ```javascript
  this.cyInstance.on('tap', 'node', (evt) => {
      const node = evt.target;
      this.selectedNodeId = node.id();
      this.dispatchEvent(new CustomEvent('nodeselect', { detail: { nodeId: node.id() } }));
  });
  ```
  - Clicking a node updates `this.selectedNodeId` and dispatches `nodeselect`.
  - Node selection does NOT alter `recordId`, change routes, or initiate parent view navigation.
* **Disconnection Teardown (Lines 212–216):**
  ```javascript
  disconnectedCallback() {
      this.currentRequestId++; // Invalidate pending requests immediately on disconnect
      this.cyInitialized = false; // Allow safe re-initialization on reconnect
      this.clearGraphState();
  }
  ```
  - Increments `currentRequestId` to cancel any pending async completion callback.
  - Resets `cyInitialized` to `false` and clears graph state.

---

## 3. Test Transformer Audit (`run-poc-tests.cjs`)

Inspection of `createProductionViewerClass(mockApex)` in `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Lines 138–179):

### A. Transformer Architecture
1. **Dynamic File Reading (Line 139):** Reads `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` directly from the working directory using `fs.readFileSync(filePath, 'utf8')`.
2. **ES Module Imports Transformation (Lines 142–148):**
   - Replaces `import { LightningElement, api, track } from 'lwc'` with `const { LightningElement, api, track } = LwcMock;`.
   - Replaces `@salesforce/apex/...` imports with delegates to `mockApex`.
   - Replaces `c/daGraphPayloadLoader` and `c/daLayoutEngine` imports with delegates to `loaderModule` and `layoutModule`.
3. **Decorator & Export Transformation (Lines 149–152):**
   - Strips `@api` and `@track` decorator annotations.
   - Converts `export default class DaGraphViewer` to `class DaGraphViewer`.
   - Appends `return DaGraphViewer;`.
4. **Dynamic Code Execution (Lines 177–178):** Wraps the transformed string in `new Function(...)` and invokes it with mock objects to return the production-derived `DaGraphViewer` class.

### B. Transformer Integrity Assessment
* **Source Truth:** The test harness evaluates the **actual production source file**. It does not test a duplicate or hand-crafted mock component class.
* **Logic Preservation:** Setter logic, `currentRequestId` increments, `clearGraphState()`, `fetchGraphData()` async guards, and `disconnectedCallback()` are executed exactly as written in production.
* **Limitations (Offline vs LWS Runtime):**
  - Node.js `Function` evaluation does not replicate Salesforce Shadow DOM, Synthetic Shadow DOM, Lightning Web Security (LWS) membrane restrictions, or actual browser Cytoscape canvas DOM rendering.
  - Salesforce reactive wire adapter re-evaluations are simulated via explicit property setter calls and `renderedCallback()` invocations.

---

## 4. TC-01 through TC-11 Verification Evidence Table

All scenarios executed in Category 7 of `run-poc-tests.cjs` against the production-derived `DaGraphViewer` class:

| Test ID | Scenario & Expected Behavior | Actual Assertion(s) | Derived Class Execution | Audit Verification Status | Result | Limitations / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Initial project assignment & first load | `recordId === 'PROJ_INIT'`, `isLoading === false`, `error === null`, `cyInstance !== null` | `DaGraphViewer` class instantiated from production source file | Verified via Node.js execution | **PASS** | Tests initial load path after `renderedCallback()`. |
| **TC-02** | Switching from project A to project B | `cyA.destroyed === true`, `recordId === 'PROJ_B'`, `isLoading === false`, `cyInstance !== null` | Setter executed on production class | Verified via Node.js execution | **PASS** | Confirms prior Cytoscape instance destroyed immediately on switch. |
| **TC-03** | Rapid switching from A to B to C | `recordId === 'PROJ_C'`, `isLoading === false`, `error === null` after async delays | Setter executed sequentially on production class | Verified via Node.js execution | **PASS** | Verifies rapid property setter calls discard interim fetches. |
| **TC-04** | Delayed response from A arriving after switch to B | Late resolution of A does not overwrite `recordId === 'PROJ_B'` or produce error | Asynchronous promise resolution against production class | Verified via Node.js execution | **PASS** | Proves stale request invalidation guard (`requestId !== currentRequestId`). |
| **TC-05** | Failure loading project B | `cyInstance === null`, `isLoading === false`, `error` contains Apex failure message | Production class error handler path | Verified via Node.js execution | **PASS** | Confirms graph is cleared and error state displayed on fetch failure. |
| **TC-06** | Empty graph payload for project B | `cyInstance === null`, `error === 'No graph payload metadata found for this project.'` | Production class DTO null-check path | Verified via Node.js execution | **PASS** | Confirms handling of empty/null DTO. |
| **TC-07** | Selected-node ID reset on project change | `selectedNodeId` set to `'node_PROJ_A'`, then becomes `null` immediately upon `recordId = 'PROJ_B'` | Setter calling `clearGraphState()` on production class | Verified via Node.js execution | **PASS** | Proves selection state does not bleed into new project. |
| **TC-08** | Cytoscape destruction & reinitialization | `instance1.destroyed === true`, `instance2 !== instance1`, `instance2.destroyed === false` | Production `renderGraph()` teardown path | Verified via Node.js execution | **PASS** | Confirms safe re-creation of Cytoscape instance on project switch. |
| **TC-09** | Component disconnect during pending request | `cyInitialized === false`, `cyInstance === null` before and after async resolution | `disconnectedCallback()` on production class | Verified via Node.js execution | **PASS** | Proves unmounted component ignores late-arriving async responses. |
| **TC-10** | Rerendering without project-ID change | `selectedNodeId === 'n1'` preserved, `cyInstance` ref unchanged when `recordId` set to same value | Property setter short-circuit guard on production class | Verified via Node.js execution | **PASS** | Prevents wasteful re-fetching when parent re-renders with identical ID. |
| **TC-11** | `SELECTION ≠ NAVIGATION` invariant check | Node tap fires `nodeselect` event with `detail.nodeId`, `recordId` remains unchanged | Event listener on production class instance | Verified via Node.js execution | **PASS** | Confirms node selection does not trigger project navigation or route change. |

---

## 5. Verification Command Results

All 3 required test suites re-run during this audit:

### Command 1: Salesforce POC Offline Suite
* **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
* **Working Directory:** `/app` (Repository Root)
* **Exit Code:** `0`
* **Results:** **41 PASSED, 0 FAILED** (Duration: ~0.4s)
* **Categories Verified:**
  - Category 1: LWC Module Unit Tests (6/6 passed)
  - Category 2: Bounded Pagination & Boundary Inputs (3/3 passed)
  - Category 3: Benchmark Fixture Paginated Verification (PBIM, BQC, CST) (3/3 passed)
  - Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (5/5 passed)
  - Category 5: Expanded Security, Fault Injection & Ingestion (7/7 passed)
  - Category 6: Reusable LWC Layout Engine Parity Tests (6/6 passed)
  - Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (TC-01..11) (11/11 passed)

### Command 2: Root CLI Baseline Test Suite
* **Command:** `npm run test:cli`
* **Working Directory:** `/app` (Repository Root)
* **Exit Code:** `0`
* **Results:** **16 PASSED, 0 FAILED** (Duration: ~2.1s)
* **Suites Verified:** Investigation Eligibility (WAVE-E3), Investigation Context Minimizer (WAVE-E4), Architecture Decision Context (WAVE-D5), Deterministic LLM Usage Accounting (WAVE-E5), Worker Geometry & Event Correlation, Overlap Checker Core Unit Tests, and Remediation Stage 0 Test Suite.

### Command 3: Explorer Exporter Validation Suite
* **Command:** `node scripts/test-export-explorer.cjs`
* **Working Directory:** `/app` (Repository Root)
* **Exit Code:** `0`
* **Results:** **12/12 Validations PASSED, 6/6 Regression Tests PASSED** (Duration: ~0.3s)
* **Invariants Verified:** Stable node IDs, edge source/target existence, type enums, risk values, metric integrity, cycle validity, unresolved reference handling, evidence preservation, schema/analyzer versioning, and deterministic output.

---

## 6. Dependency & Environmental Assessment
* **Package Manifests & Lockfiles:** Inspected `package.json` and `package-lock.json`. All required dependencies for offline Node.js execution (`cytoscape`, `vite`, `typescript`, etc.) were present.
* **Dependencies Installed:** No additional package installation was required.
* **Environmental Blockers:** None encountered for offline testing.

---

## 7. Regression & UI Invariant Review
* **Core UI Invariant (`SELECTION ≠ NAVIGATION`):** Verified in production source line 191–197 and TC-11. Node click events update `selectedNodeId` and dispatch custom `nodeselect` events. They do NOT mutate `recordId` or trigger navigation.
* **Layout Invariants:** Deterministic layout calculation in `c/daLayoutEngine` verified against real benchmark datasets (PBIM, BQC, CST). Layer ordering invariants (presentation < domain < schema) are strictly preserved.
* **Scope Invariants:** No changes made to frozen Wave 1 files or Wave 2 feature implementations.

---

## 8. Documentation Reconciliation & Inconsistencies

Comparison of existing audit reports with current repository state:

1. **Branch & Commit Discrepancy:**
   - Prior reports referenced individual commit hashes or development branch names (e.g., `jules-17306982797241307422-1fb40160`).
   - Current repository state is merged into commit `adc99a5d42f89c0a2967566fda6513fbc2eb77d7` on branch `jules-3679677526067963240-5f4f43b7`.
   - **Reconciliation Note:** This discrepancy is purely a git history squashing artifact resulting from PR #31 merge. Source code and test suite content are 100% identical.

2. **Claim Reconciliation:**
   - Claim in `WAVE_2_INTEGRATION_CONTRACT_VERIFICATION_REPORT.md` of 41/41 POC tests passing, 16/16 CLI tests passing, and 12/12 Explorer tests passing is **fully substantiated** by fresh execution.

---

## 9. Salesforce Verification Boundary

The following explicit boundary is established between offline verification and live Salesforce org validation:

### Offline Proven Behaviors (Verified by Audit)
* Node.js module transformer correctness and production code execution path.
* Setter reactivity and logic flow for `recordId` changes.
* Prompt state clearing (`clearGraphState()`) and Cytoscape instance destruction.
* Asynchronous race condition cancellation via `currentRequestId` matching.
* UTF-8 surrogate pair boundary safety during chunk reassembly.
* Layout engine determinism across architecture, orbit, constellation, and sankey visualizers.

### Unverified Live Org Behaviors (Requires Salesforce Org / Dev Hub)
* Real LWC reactive wire adapter cycle re-evaluation in Salesforce DOM.
* Lightning Web Security (LWS) sandbox proxy isolation.
* Apex SOQL governor limits, heap limits, and LongTextArea chunk query performance.
* Salesforce Apex FLS, CRUD, and `with sharing` user permission enforcement.
* Real browser Cytoscape canvas layout rendering inside Lightning App Builder containers.

---

## 10. Remaining Risks & Recommendations

1. **Risk — Unverified LWS Behavior:** Cytoscape uses global window/DOM references that could interact with Lightning Web Security strict mode in full Salesforce org deployments.
   - *Recommendation:* Run `sfdx force:lightning:lwc:lint` or deploy to a scratch org with LWS enabled prior to production release.
2. **Risk — Warning on ES Module Parsing:** Running `node scratch/salesforce-poc/tests/run-poc-tests.cjs` issues a Node.js warning regarding typeless package.json when importing LWC ES modules.
   - *Recommendation:* Consider adding `"type": "module"` or configuring module resolution in test configurations when Wave 2 work completes.

---

## 11. Wave 2 Authorization Gate Decision

### `WAVE 2: READY FOR EXPLICIT USER AUTHORIZATION`

**Sequence Recommendation for Wave 2 Execution (Upon User Approval):**
1. **Workstream A:** Implement `FEAT-SHELL-01`, `FEAT-SHELL-02`, and `FEAT-SHELL-03` (Container & Layout Shell).
2. **Workstream C:** Implement `FEAT-STATE-02` and `FEAT-DATA-02` (State Management & Data Adapter).
3. **Workstream G:** Execute Apex test suites and LWC verification following Workstream C handoff.

*Note: General user preferences (`FEAT-DATA-03`) remain deferred to Wave 3 in accordance with the authoritative wave plan.*

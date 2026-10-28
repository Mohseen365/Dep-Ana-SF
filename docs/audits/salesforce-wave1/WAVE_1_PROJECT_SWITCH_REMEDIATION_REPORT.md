# Wave 1 Project-Switch Remediation Verification Report

**Date:** October 2026
**Status:** `PASS — REMEDIATION VERIFIED`
**Target Component:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
**Defect Reference:** `WAVE_2_INTEGRATION_CONTRACT_VERIFICATION_REPORT.md`

---

## 1. Environment & Git Provenance

* **Starting Branch:** `jules-2912858902973126230-262d0117`
* **Starting HEAD Commit:** `e8f90cd`
* **Ending Branch:** `jules-2912858902973126230-262d0117`
* **Ending HEAD Commit:** `e8f90cd`
* **Working-Tree Changes:** 2 modified files (Strict scope compliance)
* **Node.js Version:** `v22.22.1`
* **npm Version:** `11.11.0`

---

## 2. Files Modified

The remediation was strictly constrained to the two authorized files:

1. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
2. `scratch/salesforce-poc/tests/run-poc-tests.cjs`

No other source files, HTML templates, Apex controllers, package manifests, or lockfiles were modified.

---

## 3. Defect & Fix Summary

### Identified Defect
* `daGraphViewer` previously declared `@api recordId` as a simple public field without a getter/setter.
* Graph rendering was triggered only once inside `renderedCallback()` protected by `cyInitialized = true`. Parent component property updates (`recordId`) did not trigger graph reloads.
* Stale asynchronous responses from prior projects could resolve and render graph payloads onto newly selected projects.
* Cytoscape teardown only occurred during `renderGraph()`, keeping prior project graphs rendered during asynchronous fetch delays or upon fetch failures.
* `selectedNodeId` remained dirty across project transitions.

### Applied Remediation
1. **Reactive `@api recordId` Getter/Setter:**
   - Input normalized (`value || null`).
   - Change guard (`this._recordId !== normalized`) prevents duplicate teardown/fetches on parent rerenders.
   - On change, `this.currentRequestId++` immediately invalidates pending promises.
   - `this.clearGraphState()` wipes canvas, selection (`selectedNodeId = null`), and error alert (`error = null`).
   - Triggers `this.fetchGraphData()` if component is mounted (`cyInitialized = true`).
2. **Asynchronous Request Protection:**
   - All async step boundaries (metadata query, chunk batch loop, render pre-checks) assert `requestId === this.currentRequestId && this.cyInitialized`.
   - Late or rejected promises from invalidated projects abort silently without updating state.
3. **Lifecycle Teardown & Reconnection Safety:**
   - `clearGraphState()` safely destroys `cyInstance` and clears references.
   - `disconnectedCallback()` increments `currentRequestId`, sets `cyInitialized = false`, and invokes `clearGraphState()`.
   - Reconnecting component can safely re-initialize static resources and reload active project graph.
4. **Preservation of Core Invariants:**
   - Node selection updates `selectedNodeId` and dispatches `nodeselect` without triggering page navigation or URL reloads (`SELECTION ≠ NAVIGATION`).

---

## 4. Test Execution & Evidence Matrix

### Executed Verification Commands

1. `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
   - **Exit Code:** `0`
   - **Result:** `41 PASSED, 0 FAILED`
   - **Coverage Type:** Production LWC ES Module Class Unit Tests + Payload & Layout Harness Integration.
2. `npm run test:cli`
   - **Exit Code:** `0`
   - **Result:** `16/16 Test Suites PASSED`
   - **Coverage Type:** Root CLI & Analysis Engine Invariant Suite.
3. `node scripts/test-export-explorer.cjs`
   - **Exit Code:** `0`
   - **Result:** `12/12 Invariants PASSED`
   - **Coverage Type:** Explorer Data Adapter Verification.

---

## 5. Status of 11 Mandatory Regression Scenarios

All 11 mandatory regression scenarios were directly tested against the actual production `DaGraphViewer` class using the dynamic Node.js module transformer harness in `run-poc-tests.cjs`:

| Scenario ID | Description | Execution Status | Test Method |
| :--- | :--- | :--- | :--- |
| **TC-01** | Initial project load | **`PASS`** | Production class instance `recordId` assignment & initial fetch verification |
| **TC-02** | Switching from project A to project B | **`PASS`** | Reactive setter change detection & Cytoscape instance destruction check |
| **TC-03** | Rapid switching from A to B to C | **`PASS`** | Race condition simulation asserting project C renders exclusively |
| **TC-04** | Delayed response from A arriving after switch to B | **`PASS`** | Deferred promise resolution verifying stale response discarded |
| **TC-05** | Failure loading project B | **`PASS`** | Apex error injection verifying canvas cleared and error alert displayed |
| **TC-06** | Empty graph payload for project B | **`PASS`** | Null DTO injection asserting "No graph payload metadata found" alert |
| **TC-07** | Selected-node ID reset on project change | **`PASS`** | Assertion verifying `selectedNodeId` reset to `null` on switch start |
| **TC-08** | Cytoscape destruction and reinitialization | **`PASS`** | Assertion confirming old `cyInstance` destroyed and new instance assigned |
| **TC-09** | Component disconnection during fetch | **`PASS`** | `disconnectedCallback()` during fetch asserting no post-disconnect render |
| **TC-10** | Rerendering without project-ID change | **`PASS`** | Duplicate setter invocation asserting selection & canvas preserved |
| **TC-11** | `SELECTION ≠ NAVIGATION` invariant | **`PASS`** | `nodeselect` event dispatch check confirming zero project ID mutation |

---

## 6. Scope Boundary & Non-Modification Confirmation

* **Modified Files:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/tests/run-poc-tests.cjs`
* **Unmodified Scope Boundary:**
  - `daGraphViewer.html` and `.js-meta.xml` remain **100% untouched**.
  - Apex classes (`DAGraphController.cls`, `DAGraphIngestionService.cls`) remain **100% untouched**.
  - `daGraphPayloadLoader` and `daLayoutEngine` remain **100% untouched**.
  - Package manifests (`package.json`, `package-lock.json`) remain **100% untouched**.

---

## 7. Deferred Salesforce-Org Verification Checks

The following checks remain deferred until deployment to a live Salesforce sandbox/scratch org:
* Lightning Web Security (LWS) isolation sandbox validation.
* Live Salesforce DOM shadow root rendering.
* Apex SOQL governor limits and CRUD/FLS enforcement.

---

## 8. Final Decision

**`PASS — REMEDIATION VERIFIED`**

The project-switch remediation for `daGraphViewer` is complete, fully verified by unit and integration tests, and respects all Wave 1 freeze and file boundary constraints.

# Wave 4 Phase 2C Frozen Invariant Reverification Report

| Governance Attribute | Value |
|---|---|
| **Document Type** | Architectural Invariant Audit & Verification Report |
| **Phase Target** | Wave 4 — Phase 2C: Coordinator Integration |
| **Repository Root** | `/app` |
| **Working Branch** | `jules-18338120577467426713-f5b5fd52` |
| **Date** | November 1, 2026 |
| **Overall Status** | **12 / 12 INVARIANTS VERIFIED (100% PASS)** |

---

## 1. Summary of 12 Frozen Invariants

| # | Frozen Invariant | Verification Rule | Source Traceability | Test Evidence | Verdict |
|---|---|---|---|---|:---:|
| 1 | **`SELECTION ≠ NAVIGATION`** | Selecting a node in the graph viewer updates selection only; it must never trigger view switching, route navigation, or mutate project ID. | `daAppShell.js`: `handleNodeSelect(event)` updates `this.selectedNodeId = detail.nodeId` without touching `activeView` or `activeProjectId`. | `run-wave4-integration-suite.cjs` Test 28; `run-lane-d-graph-filter-tests.cjs` Test 11; `run-workstream-a-tests.cjs` Test 10 | **PASS** |
| 2 | **User/Project Preference Isolation** | Preferences must be strictly isolated per `User` and `DA_Project__c`. No cross-project leakage. | `daAppShell.js`: `loadUserPreferences(projectId)` queries by `projectId`. `savePreferenceChange` validates `this.activeProjectId`. | `run-wave4-integration-suite.cjs` Test 3.1 & 14; `run-workstream-c-tests.cjs` Test 3 | **PASS** |
| 3 | **`@api recordId` Normalization & Invalidation** | Graph viewer getter/setter normalizes record ID and invalidates in-flight requests on change. | `daGraphViewer.js`: `set recordId(value)` increments `currentRequestId` and clears prior canvas state. | `run-lane-d-graph-filter-tests.cjs` Test 15; `run-poc-tests.cjs` Category 7 | **PASS** |
| 4 | **Preserve `Positions_JSON__c`** | Node layout coordinates saved in `Positions_JSON__c` must not be overwritten or cleared by filter updates. | `daAppShell.js`: `savePreferenceChange` passes `positionsJson: null` to preserve stored values. | `run-wave4-integration-suite.cjs` Test 29; `run-workstream-a-tests.cjs` Test 27; `run-workstream-c-tests.cjs` Test 7a | **PASS** |
| 5 | **Preserve `Zoom_Pan_JSON__c`** | Viewport coordinates saved in `Zoom_Pan_JSON__c` must not be overwritten or cleared by filter updates. | `daAppShell.js`: `savePreferenceChange` passes `zoomPanJson: null` to preserve stored values. | `run-wave4-integration-suite.cjs` Test 29; `run-workstream-a-tests.cjs` Test 28; `run-workstream-c-tests.cjs` Test 7a | **PASS** |
| 6 | **Preserve Annotations** | Node annotations must remain intact and isolated per project during graph updates and filtering. | `c-da-annotation-panel` bound to `project-id={activeProjectId}` and `selected-node-id={selectedNodeId}`. | `run-lane-d-graph-filter-tests.cjs` Test 13; `run-workstream-c-tests.cjs` Test 8-13 | **PASS** |
| 7 | **Preserve Shell Tabs / Navigation** | Approved views are strictly `graph`, `matrix`, and `findings`. Switching tabs preserves project context. | `daAppShell.js`: `switchView(targetView)` validates `APPROVED_VIEWS.includes(targetView)` and updates `this.activeView`. | `run-wave4-integration-suite.cjs` Test 27; `run-workstream-a-tests.cjs` Test 2 | **PASS** |
| 8 | **Cytoscape Teardown Lifecycle Cleanup** | Cytoscape instances, event listeners, and timers must be destroyed cleanly on unmount or project switch. | `daGraphViewer.js`: `clearGraphState()` and `disconnectedCallback()` invoke `cyInstance.destroy()` and cancel timers. | `run-lane-d-graph-filter-tests.cjs` Test 14; `run-poc-tests.cjs` Category 4 | **PASS** |
| 9 | **Stale Asynchronous Response Guards** | In-flight async responses from earlier project requests must be discarded if project has changed. | `daAppShell.js`: `currentPrefRequestId` and `currentGraphRequestId` incremented on new requests and disconnect. | `run-wave4-integration-suite.cjs` Test 5 & 30; `run-workstream-a-tests.cjs` Test 16; `run-lane-d-graph-filter-tests.cjs` Test 10 | **PASS** |
| 10 | **User-Mode Security and CRUD/FLS Boundaries** | Enforce Salesforce user-mode security and FLS boundaries on controller operations. | Apex controllers (`DAUserPreferenceController`, `DAGraphController`) enforce `WITH USER_MODE` and strip inaccessible fields. | `run-workstream-c-tests.cjs` Test 15; `run-poc-tests.cjs` Category 5 | **PASS** |
| 11 | **No Cross-Project Preset Leakage** | Presets belonging to project A must never appear in project B. Unscoped presets must be excluded. | `daAppShell.js`: `enforceStrictProjectScoping(container, currentProjectId)` strictly requires `p.projectId === currentProjectId`. | `run-wave4-integration-suite.cjs` Test 14, 15, 16; `run-lane-a-schema-tests.cjs` Test 4 | **PASS** |
| 12 | **Fail-Closed Preference Safety** | Malformed or unsupported JSON preference data must never overwrite valid stored data. | `daAppShell.js`: Malformed or unsupported schema falls back to safe defaults in-memory without saving back to Apex. | `run-wave4-integration-suite.cjs` Test 17 & 18; `run-workstream-a-tests.cjs` Test 21 & 22; `run-workstream-c-tests.cjs` Test 7f | **PASS** |

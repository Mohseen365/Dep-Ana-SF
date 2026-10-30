# Verification and Acceptance Matrix

**Workstream:** Dependency Analyzer Salesforce Migration — Verification & Acceptance Matrix
**Deliverable Artifact:** `docs/audits/salesforce-independent-gap-audit/VERIFICATION_AND_ACCEPTANCE_MATRIX.md`
**Prepared By:** Jules (Software Engineer / Independent Migration Auditor)
**Date:** October 2026
**Repository Baseline:** Commit `fff7b1b8826dac185e1e28b6bf99dcbebc9fa2d9` (Branch `jules-7627908301220719264-6e22649a`)

---

## 1. Overview & Matrix Purpose

This Verification and Acceptance Matrix maps every major migration feature, architectural boundary constraint, data persistence contract, and technical risk to:
1. Expected application behavior.
2. Source implementation paths.
3. Existing test coverage and executed offline verification results.
4. Required offline verification methods.
5. Deferred live Salesforce org platform verification steps.
6. Objective, measurable acceptance criteria.

---

## 2. Feature & Technical Risk Verification Matrix

| Feature / Risk ID | Category / Description | Expected Behavior | Source Implementation | Existing Test Coverage | Offline Verification Method | Deferred Live Org Verification | Objective Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`FEAT-GRAPH-01`** | Core Graph Visualization Canvas | Render Cytoscape canvas with nodes/edges, zoom/pan controls, and node selection | `daGraphViewer.js`<br>`daGraphViewer.html` | `run-poc-tests.cjs` (43 passed)<br>`run-workstream-a-tests.cjs` (13 passed) | Execute `run-poc-tests.cjs` in Node.js | Validate LWS compatibility and canvas rendering in live Lightning App Builder | Cytoscape initializes cleanly, nodes/edges render, selecting node dispatches custom event without page refresh |
| **`FEAT-STATE-02`** | Node Position & ViewState Persistence | Dragging graph nodes persists coordinates to `Positions_JSON__c` via debounced save | `daGraphViewer.js`<br>`DAUserPreferenceController.cls` | `run-poc-tests.cjs` (TC-12, TC-13)<br>`run-workstream-c-tests.cjs` (TC-2) | Execute `run-workstream-c-tests.cjs` in Node.js | Validate SOQL query performance and DML execution under live user profile | Coordinates saved in `Positions_JSON__c` (max 131,072 chars); reloaded on project switch |
| **`FEAT-DATA-02`** | User Annotations & Notes | Users can create, update, and resolve node-level notes and findings | `daAnnotationPanel.js`<br>`DAAnnotationController.cls` | `run-workstream-c-tests.cjs` (TC-8 to TC-16) | Execute `run-workstream-c-tests.cjs` in Node.js | Validate CRUD/FLS permissions and sharing on `DA_Annotation__c` custom object | Annotations saved with author, text (max 32,768 chars), status; isolated by `ProjectId` |
| **`FEAT-DATA-03`** | General Preferences & Filter Presets | User filter presets, active view, and layout mode saved to `DA_User_Preference__c` | `daAppShell.js`<br>`DAUserPreferenceController.cls` | `run-workstream-c-tests.cjs` (TC-1 to TC-7) | Execute `run-workstream-c-tests.cjs` in Node.js | Validate user-mode SOQL/DML and preference key isolation across multiple org users | Filter JSON conforms to v1 schema; saving general preferences **does not overwrite** stored node positions |
| **`FEAT-INGEST-01`** | Ingestion Pipeline Enhancements | Archived feature; AST parsing remains strictly in Node.js engine | `dependency-analyzer.cjs`<br>`DAGraphIngestionService.cls` | `run-poc-tests.cjs` (Cat 5) | Static inventory verification | N/A (Feature archived) | `FEAT-INGEST-01` marked `ARCHIVED` in parity matrix; zero AST parsing executed in Apex |
| **`INVAR-SEL-NAV`** | Selection ≠ Navigation Core Invariant | Selecting a graph node or annotation must NEVER switch views or navigate tabs | `daGraphViewer.js`<br>`daAppShell.js` | `run-poc-tests.cjs` (Cat 6, TC-11)<br>`run-workstream-a-tests.cjs` (TC-10) | Execute `run-workstream-a-tests.cjs` in Node.js | Test live Lightning Navigation service and URL route stability | Node selection fires `nodeselect` event; `activeTab` property in `daAppShell` remains unchanged |
| **`INVAR-ISOLATION`** | Project & User Data Isolation | Data, preferences, and errors from Project A must never leak into Project B | `DAUserPreferenceController.cls`<br>`DAAnnotationController.cls` | `run-workstream-c-tests.cjs` (TC-3, TC-12) | Execute `run-workstream-c-tests.cjs` in Node.js | Validate row-level security and record sharing across distinct org user profiles | Queries filter strictly by `UserId:ProjectId` using `WITH USER_MODE`; cross-project reads return empty list |
| **`INVAR-LIFECYCLE`** | Cytoscape & Async Response Hygiene | Teardown Cytoscape instances on unmount; discard stale async responses | `daGraphViewer.js` | `run-poc-tests.cjs` (TC-04, TC-08, TC-09) | Execute `run-poc-tests.cjs` in Node.js | Test browser memory heap consumption under rapid project switching in live org | In-flight requests checked against `currentRequestId`; old responses ignored; Cytoscape `destroy()` called |
| **`RISK-NULL-OVERWRITE`**| Preference Null-Overwrite Hazard (GAP-02) | Calling `saveUserPreference` with `null` for `positionsJson` must retain stored coordinates | `DAUserPreferenceController.cls` | `run-workstream-c-tests.cjs` (Needs null test case) | Static Apex source code inspection and unit test execution | Validate Apex DML upsert behavior on existing record in org | Null-coalescing guard (`if (val != null) prefRecord.Field = val;`) prevents coordinate erasure |
| **`RISK-PAYLOAD-LIMIT`**| Ingestion Chunk & Payload Bounds (GAP-09) | Enforce 131,072 char/chunk, 10 chunks/call, 10,485,760 total payload chars | `daGraphPayloadLoader.js`<br>`DAGraphIngestionService.cls` | `run-poc-tests.cjs` (Cat 2, Cat 4, Cat 5) | Execute `run-poc-tests.cjs` in Node.js | Validate REST API request size limits and Apex heap usage during 10MB upload | Oversized chunks (>131,072) or payloads (>10MB) rejected with explicit validation error |
| **`RISK-SURROGATE-PAIR`**| UTF-16 Surrogate Pair Chunk Boundary Safety | Splitting graph JSON into chunks must not break UTF-16 surrogate pairs (emojis/multibyte) | `daGraphPayloadLoader.js` | `run-poc-tests.cjs` (Cat 4) | Execute `run-poc-tests.cjs` in Node.js | N/A (Client-side LWC chunking logic) | Chunk boundaries adjusted automatically if splitting a surrogate pair high/low pair |

---

## 3. Measurable Acceptance Criteria Rules

For a migration feature to transition to `COMPLETED / ACCEPTED`:
1. **100% Offline Test Pass:** All offline unit and integration tests associated with the feature must pass cleanly without skipped scenarios.
2. **Zero Invariant Violations:** Test logs must confirm `SELECTION ≠ NAVIGATION`, project isolation, and async request cancellation invariants.
3. **Null-Preservation Verified:** Preference updates must prove byte-for-byte coordinate retention when null arguments are passed.
4. **Deferred Org Checklist Prepared:** Live Salesforce org validation checklist must be documented, with org setup explicitly marked `DEFERRED TO WAVE 6`.

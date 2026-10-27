# Wave 2 Acceptance & Test Gate Specification

## 1. Overview & Verification Strategy

This document defines the behavior-level acceptance criteria, offline test verification commands, required assertion counts, and deferred live-org checks for Wave 2 capabilities.

---

## 2. Capability Acceptance Criteria

### FEAT-SHELL-01 (Workspace Navigation & View Switching)
- **Acceptance Criteria:** User can switch tabs in `daAppShell` without losing active project context or graph selection.
- **Offline Test Gate:** Category 6 tests in `run-poc-tests.cjs`.
- **Deferred Org Gate:** Lightning Experience App Page rendering and tab state persistence across Salesforce page reloads.

### FEAT-SHELL-02 (Header & Status Banner)
- **Acceptance Criteria:** Header displays project key, analysis run timestamp, and ingestion status badge in standard SLDS style.
- **Offline Test Gate:** Component template inspection and category 6 LWC layout tests.
- **Deferred Org Gate:** Live org SLDS header icon rendering and reactive status updates.

### FEAT-SHELL-03 (Project Selector & Multi-Project Isolation)
- **Acceptance Criteria:** Selecting a project clears active graph, fires `projectchange` event, and loads selected project payload without memory leaks or state bleeding.
- **Offline Test Gate:** Category 4 and 5 tests in `run-poc-tests.cjs` (Rapid Project Switch / Stale Request Cancellation).
- **Deferred Org Gate:** Live org SOQL query execution for `DA_Project__c` under `WITH USER_MODE`.

### FEAT-STATE-02 (ViewState & Position Persistence)
- **Acceptance Criteria:** User-dragged node coordinates persist across page refreshes per user and project using `DA_User_Preference__c`.
- **Offline Test Gate:** Apex unit tests for `DAUserPreferenceController` and position-policy mock tests.
- **Deferred Org Gate:** Live org DML upsert for `DA_User_Preference__c` under `WITH USER_MODE`.

### FEAT-DATA-02 (User Annotations & Notes)
- **Acceptance Criteria:** User can create, edit, view, and delete text annotations attached to specific graph nodes.
- **Offline Test Gate:** `npx vitest run src/lib/annotations.test.ts` in `explorer/` (7/7 passed).
- **Deferred Org Gate:** Live org CRUD and FLS security enforcement for `DA_Annotation__c`.

---

## 3. Required Offline Test Commands & Baselines

All three offline test commands must produce 100% pass rates prior to completing Wave 2:

```bash
# 1. Root CLI Suite (Must pass 16/16 suites, 360 assertions)
npm run test:cli

# 2. Salesforce POC Offline Suite (Must pass 30/30 tests)
node scratch/salesforce-poc/tests/run-poc-tests.cjs

# 3. Explorer Exporter Suite (Must pass 12/12 invariants + Tests A-F)
node scripts/test-export-explorer.cjs
```

---

## 4. Invariant Preservation: SELECTION ≠ NAVIGATION

Throughout all Wave 2 LWC event handling and tab navigation:
- Clicking or selecting a node on the Cytoscape canvas updates selection metadata state ONLY.
- Node selection MUST NOT trigger full application page reloads, tab switches, or project switching.
- Switching tabs in `daAppShell` MUST NOT clear selected project ID or corrupt canvas state.

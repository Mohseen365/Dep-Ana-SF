# Wave 3 Narrowly Scoped Implementation Dispatch Plan

**Workstream:** Dependency Analyzer Salesforce Migration — Wave 3 Implementation Dispatch Plan
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_IMPLEMENTATION_DISPATCH_PLAN.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** DISPATCH-READY / AUTHORIZED FOLLOWING OWNER GOVERNANCE SIGN-OFF

---

## 1. Executive Summary & Objective

With explicit owner governance decisions recorded and signed off in:
- `docs/audits/salesforce-wave3/WAVE_3_OWNER_APPROVAL_REQUEST.md`
- `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`
- `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_CLOSURE_REPORT.md`

This document defines the **narrowly scoped implementation dispatch plan** for **`FEAT-DATA-03`** (User Preferences Storage). **`FEAT-INGEST-01`** has been formally archived per decision `DEC-FEAT-INGEST-01` and is completely excluded from implementation dispatch.

This plan details the precise technical contracts, file ownership boundaries, phased execution prompts, and offline verification gates required when dispatching coding tasks. **No production code modifications or live Salesforce operations are executed under this sign-off task itself.**

---

## 2. Authorized Technical Contracts

Implementation of `FEAT-DATA-03` must adhere strictly to the following authorized contracts:

### 2.1 DEC-W3-01 — Filter-Preset JSON Schema v1 Contract
`Filters_JSON__c` payload structure in `DA_User_Preference__c` must strictly conform to the approved v1 schema:
```json
{
  "$schema": "https://dependency-analyzer.salesforce.com/schemas/v1/filter-preset.json",
  "version": 1,
  "activePresetId": "default-risk-filter",
  "presets": [
    {
      "id": "default-risk-filter",
      "displayName": "High Risk Apex Components",
      "isDefault": true,
      "updatedAt": "2026-10-29T18:00:00Z",
      "criteria": {
        "searchQuery": "",
        "nodeTypes": ["ApexClass", "ApexTrigger"],
        "coverageStatus": ["UNCOVERED", "PARTIAL"],
        "riskLevels": ["HIGH", "CRITICAL"],
        "layers": ["Service", "Domain"],
        "includeTestNodes": false,
        "includeExternalNodes": false
      }
    }
  ],
  "quickFilters": {
    "hideTestNodes": true,
    "hideIsolatedNodes": false,
    "highlightCyclesOnly": false
  }
}
```
- **Payload Guard:** Enforce maximum string length of 131,072 characters in Apex and LWC before save.
- **Client Fault Tolerance:** Parsing errors (`SyntaxError`) must fall back gracefully to default empty filter criteria without crashing LWC shell.

### 2.2 DEC-W3-02 — Theme Preference Scope Excluded
- Theme preference selection (`Theme_Preference__c`) is explicitly **EXCLUDED** from Wave 3.
- LWC components must rely on SLDS defaults (`slds-theme-default`) or session state. No object metadata alterations permitted.

### 2.3 DEC-W3-03 — Active-View Per-Project Persistence
- Top-level view mode (`Active_View_Mode__c`) is persisted on a per-project basis using `Preference_Key__c = UserId:ProjectId`.
- Restores active tab state in `daAppShell` upon project loading.

### 2.4 DEC-W3-04 — Apex Partial-Update & ViewState Preservation Guard
- **Mandatory Server-Side Safeguard in `DAUserPreferenceController.saveUserPreference`:**
```apex
// Required Null-Coalescing Logic in saveUserPreference:
if (viewMode != null) prefRecord.Active_View_Mode__c = viewMode;
if (layoutMode != null) prefRecord.Active_Layout_Mode__c = layoutMode;
if (positionsJson != null) prefRecord.Positions_JSON__c = positionsJson;
if (filtersJson != null) prefRecord.Filters_JSON__c = filtersJson;
if (zoomPanJson != null) prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
```
- **Inviolable Requirement:** General preference saves passing `null` for `positionsJson` or `zoomPanJson` **must retain** the existing database field values, eliminating the risk of ViewState data erasure.

### 2.5 DEC-W3-05 — Workstream Boundaries & Fallbacks
- **Workstream C (Apex):** Owns `DAUserPreferenceController.cls`, `DAUserPreferenceControllerTest.cls`, and `DA_User_Preference__c` metadata.
- **Workstream A/D (LWC):** Owns `daAppShell` and `daGraphViewer`.
- **Default Fallbacks:** Default layout algorithm fallback is `'cose'` / `'COSE_BILKENT'`.

---

## 3. Phased Implementation Dispatch Prompts

When coding dispatch is initiated, execution will proceed in three strictly sequential prompts:

```
+---------------------------------------------------------------------------------------+
|                       FEAT-DATA-03 Sequential Execution Prompts                       |
+---------------------------------------------------------------------------------------+
| Prompt ID  | Target Component / Scope              | Implementation Goal              |
+------------+---------------------------------------+----------------------------------+
| PROMPT-3A  | DAUserPreferenceController.cls         | Implement Apex null-coalescing   |
|            | DAUserPreferenceControllerTest.cls    | & add null-partial update tests  |
+------------+---------------------------------------+----------------------------------+
| PROMPT-3B  | daAppShell (JS/HTML)                  | Bind layout algorithm, active    |
|            |                                       | view, & filter preset sync       |
+------------+---------------------------------------+----------------------------------+
| PROMPT-3C  | Offline Harness Integration &         | End-to-end verification across   |
|            | Regression Validation                 | all offline test suites          |
+---------------------------------------------------------------------------------------+
```

### 3.1 Prompt 3A — Backend Apex Null-Coalescing Safeguard (Workstream C)
- **Target Files:**
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`
- **Action Requirements:**
  1. Update `saveUserPreference` method in `DAUserPreferenceController.cls` to wrap field assignments in `null` checks (`if (val != null) prefRecord.Field = val;`).
  2. Add unit test scenarios in `DAUserPreferenceControllerTest.cls` asserting that calling `saveUserPreference` with `null` for `positionsJson` against an existing record preserves the stored position JSON.
  3. Validate against `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`.

### 3.2 Prompt 3B — Frontend App Shell Preferences Binding (Workstream A)
- **Target Files:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
- **Action Requirements:**
  1. Integrate `getUserPreference` and `saveUserPreference` Apex wire/imperative calls in `daAppShell.js`.
  2. Persist `Active_View_Mode__c` and default `Active_Layout_Mode__c` on user interaction.
  3. Load and apply `Filters_JSON__c` conforming to the approved v1 schema.
  4. Ensure `SELECTION ≠ NAVIGATION` invariant is strictly preserved (node selection dispatches event without tab navigation).
  5. Validate against `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`.

### 3.3 Prompt 3C — End-to-End Integration & Suite Verification
- **Target Harnesses:** All offline test scripts in `scratch/salesforce-poc/tests/` and root CLI tests.
- **Action Requirements:**
  1. Run full offline test suite matrix to confirm 0 regressions across Wave 1, Wave 2, and Wave 3 capabilities.

---

## 4. Mandatory Offline Verification Gates

Before any dispatch task is accepted, all 5 offline test suites must pass cleanly:

| Test Suite File / Command | Target Component / Coverage | Gate Criteria |
| :--- | :--- | :---: |
| `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Workstream C Apex Simulators & Unit Tests | **PASS (16/16)** |
| `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Workstream A LWC Shell & Component Harness | **PASS (13/13)** |
| `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | LWC Viewer & Core Pagination/Layout Engine | **PASS (43/43)** |
| `node scripts/test-export-explorer.cjs` | Explorer Data Adapter Verification Suite | **PASS (12/12)** |
| `npm run test:cli` | Root CLI Integration Test Suite | **PASS (16/16)** |

---

## 5. Invariant Boundaries & Safeguard Declarations

During implementation dispatch, the following constraints are non-negotiable:

1. **Wave 1 & Wave 2 Baseline Frozen:**
   - No modifications to AST parsing in `dependency-analyzer.cjs` or ingestion storage in `DAGraphIngestionService.cls`.
   - ViewState node coordinate persistence in `daGraphViewer` remains unchanged.
2. **`SELECTION ≠ NAVIGATION` Core UI Invariant:**
   - Graph node selection in `daGraphViewer` must NEVER trigger tab navigation or project context switching.
3. **No Live Salesforce Org Operations:**
   - Scratch org creation, org deployments (`sf project deploy start`), live logins, and JVM Apex execution remain deferred (`NoDefaultEnvError` posture).
4. **FEAT-INGEST-01 Complete Exclusion:**
   - Zero code or tests shall be authored for `FEAT-INGEST-01`.

# Wave 3 Prompt 3B Implementation Report: Frontend App Shell Preferences Integration

**Workstream:** Dependency Analyzer Salesforce Migration — Workstream A Frontend LWC Integration
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_PROMPT_3B_IMPLEMENTATION_REPORT.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** IMPLEMENTATION COMPLETE / OFFLINE VERIFIED

---

## 1. Executive Summary

This report documents the completion of **Wave 3 Prompt 3B** (`FEAT-DATA-03` General User Preferences Storage Frontend Integration) within the Dependency Analyzer Salesforce Migration.

### Core Objectives Achieved
1. **Frontend App Shell Preference Binding:** Integrated `getUserPreference` and `saveUserPreference` Apex controller wires into `daAppShell.js`.
2. **Active View & Layout Mode Restoration:** Restored `Active_View_Mode__c` (`'graph'`, `'matrix'`, `'findings'`) and `Active_Layout_Mode__c` (defaulting to approved fallback `'cose'`) upon project load or switch.
3. **Versioned Filter-Preset Schema Contract:** Implemented the approved v1 filter preset schema (`Filters_JSON__c`) with client-side fault tolerance fallback for malformed JSON or unsupported versions.
4. **Prompt 3A Null-Coalescing & ViewState Preservation:** Implemented partial-update save semantics. Whenever preferences are updated from `daAppShell`, unchanged fields pass `null` to the Apex controller, strictly preserving Wave 2 graph ViewState (`Positions_JSON__c` and `Zoom_Pan_JSON__c`).
5. **Frozen Contract Preservation:** Strictly preserved `SELECTION ≠ NAVIGATION`, graph ViewState, project isolation, stale asynchronous response guards, and component lifecycle teardown logic.

---

## 2. Baseline Ancestry & Scope Summary

- **Baseline Commit SHA:** `9e5c6201269639ee86c1ba8dc9ab25711423028a` (Merge PR #50 - Prompt 3A Independent Closure Audit & Prompt 3B Authorization)
- **Active Branch:** `jules-4432848737120667572-9911a9a7`
- **Authorized Scope:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
  - `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
- **Zero Out-of-Scope Modifications:** No Apex classes (`DAUserPreferenceController.cls`), Salesforce metadata schemas, package manifests, or lockfiles were modified or created.

---

## 3. Preference Loading & Restoration Behavior

When `daAppShell` mounts or `activeProjectId` changes via project selection (`handleProjectChange`):

1. **Request Sequence Token Protection:** Increments `currentPrefRequestId` to invalidate any pending in-flight preference requests from previous project selections.
2. **Asynchronous Apex Call:** Calls `getUserPreference({ projectId })` from `DAUserPreferenceController`.
3. **Stale Response Check:** Discards the returned promise if `currentPrefRequestId` has changed or `activeProjectId` no longer matches the request's `projectId`.
4. **Preference Field Unpacking & Restoration:**
   - **`Active_View_Mode__c`:** Restores active tab state if valid (`'graph'`, `'matrix'`, `'findings'`); falls back to `'graph'`.
   - **`Active_Layout_Mode__c`:** Restores selected layout algorithm; falls back to approved default `'cose'`.
   - **`Filters_JSON__c`:** Parses payload. If payload is valid JSON and `version === 1`, restores `filtersJson` and `filterConfig`. If malformed or unsupported version, gracefully falls back to default empty criteria without overwriting stored preferences in the database or crashing the LWC shell.

---

## 4. Preference Saving & Null Partial-Update Semantics

User interactions trigger asynchronous preference updates via `savePreferenceChange(changes)`:

1. **Deduplication Check:** Compares requested changes (`viewMode`, `layoutMode`, `filtersJson`) against `lastSavedPreferences`. Suppresses redundant server calls if values match existing baseline.
2. **Payload Size Guard:** Validates that `filtersJson` length does not exceed 131,072 characters.
3. **Prompt 3A Null-Coalescing Invariant:**
   - `saveUserPreference` is invoked with explicit `null` for all unchanged optional parameters.
   - Specifically, `positionsJson` and `zoomPanJson` are ALWAYS passed as `null` from `daAppShell`.
   - Apex server-side null guards (`if (param != null) { prefRecord.Field = param; }`) ensure that database fields for positions and zoom/pan remain untouched.

---

## 5. Frozen Wave 1 & Wave 2 Contract Verification

| Contract / Invariant | Implementation Mechanism | Status |
| :--- | :--- | :---: |
| **`SELECTION ≠ NAVIGATION`** | Node selection (`handleNodeSelect`) updates `selectedNodeId` without altering `activeView` or `activeProjectId` and without triggering preference saves. | **PRESERVED** |
| **Graph ViewState (`FEAT-STATE-02`)** | `daGraphViewer` handles `Positions_JSON__c` and `Zoom_Pan_JSON__c`. `daAppShell` saves explicitly pass `null` to avoid ViewState erasure. | **PRESERVED** |
| **Project Isolation** | `getUserPreference` and `saveUserPreference` scope data per `UserId:ProjectId`. Selection and preferences do not leak between projects. | **PRESERVED** |
| **Component Lifecycle Teardown** | `disconnectedCallback` increments `currentPrefRequestId` to clean up in-flight promises and prevent post-unmount mutations. | **PRESERVED** |

---

## 6. Known Limitations & Deferred Operations

- **Salesforce Live Org Deployment:** Live org deployment (`sf project deploy start`), live Apex unit test execution, and org login remain deferred due to sandbox governance (`NoDefaultEnvError`).
- **Prompt 3C Execution:** Prompt 3C (End-to-End Harness Integration & Submission) is explicitly excluded from this Prompt 3B task.

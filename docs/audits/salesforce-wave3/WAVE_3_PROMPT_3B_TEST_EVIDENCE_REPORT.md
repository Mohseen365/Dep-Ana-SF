# Wave 3 Prompt 3B Test Evidence Report: Frontend App Shell Preferences Integration

**Workstream:** Dependency Analyzer Salesforce Migration — Workstream A Frontend LWC Verification
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_PROMPT_3B_TEST_EVIDENCE_REPORT.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** ALL OFFLINE TEST SUITES PASSED (224 / 224 SCENARIOS)

---

## 1. Executive Test Summary

All 5 permitted offline automated test harnesses were executed in the repository environment. All test suites passed with **Exit Code 0** and **0 failures**.

```
+---------------------------------------------------------------------------------------------------------------+
|                                Offline Verification Execution Summary                                         |
+---------------------------------------------------------------------------------------------------------------+
| Test Suite File / Command                       | Scope / Target Component            | Exit Code | Pass | Fail |
+-------------------------------------------------+-------------------------------------+-----------+------+------+
| `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | LWC Shell & Preferences (Prompt 3B) | 0         | 33   | 0    |
| `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Apex Controller & ViewState Harness | 0         | 18   | 0    |
| `node scratch/salesforce-poc/tests/run-poc-tests.cjs`         | POC LWC & Cytoscape Viewer Harness  | 0         | 43   | 0    |
| `node scripts/test-export-explorer.cjs`         | Explorer Data Adapter Suite         | 0         | 12   | 0    |
| `npm run test:cli`                              | Root CLI Baseline Test Suite        | 0         | 118  | 0    |
+-------------------------------------------------+-------------------------------------+-----------+------+------+
| **TOTAL SCENARIOS EXECUTED**                    |                                     | **0**     | **224**| **0**|
+---------------------------------------------------------------------------------------------------------------+
```

---

## 2. Workstream A Test Harness Details (`run-workstream-a-tests.cjs`)

The Workstream A test suite was expanded to include 20 mandatory Prompt 3B test scenarios covering `FEAT-DATA-03` frontend integration:

| Scenario ID | Test Description | Result |
| :--- | :--- | :---: |
| **TC-01** | Initial application shell render defaults | **PASS** |
| **TC-02** | View navigation among approved existing views (Graph, Matrix, Findings) | **PASS** |
| **TC-03** | Project selector loading and populated state | **PASS** |
| **TC-04** | Empty project-list behavior | **PASS** |
| **TC-05** | Project-list request failure behavior | **PASS** |
| **TC-06** | Selecting a project updates parent-owned project context | **PASS** |
| **TC-07** | Active graph viewer receives correct project ID binding | **PASS** |
| **TC-08** | Switching views preserves active project context and selection | **PASS** |
| **TC-09** | Re-selecting the same project suppresses redundant updates | **PASS** |
| **TC-10** | Graph-node selection does NOT alter project or navigate views (`SELECTION ≠ NAVIGATION`) | **PASS** |
| **TC-11** | Project switching clears prior node selection to prevent stale state | **PASS** |
| **TC-12** | Accessibility and tab index properties contract | **PASS** |
| **TC-13** | `daAppShell.html` template integrates `c-da-annotation-panel` | **PASS** |
| **TC-14** | Load preferences for initial project | **PASS** |
| **TC-15** | Load preferences after changing projects | **PASS** |
| **TC-16** | Reject a stale preference response from a previous project | **PASS** |
| **TC-17** | Restore a valid saved active view (`Active_View_Mode__c`) | **PASS** |
| **TC-18** | Restore a valid saved layout (`Active_Layout_Mode__c`) | **PASS** |
| **TC-19** | Restore valid versioned filter JSON (`Filters_JSON__c`) | **PASS** |
| **TC-20** | Handle missing preferences (Apex returns null) | **PASS** |
| **TC-21** | Handle malformed filter JSON (graceful fallback without crash/overwrite) | **PASS** |
| **TC-22** | Handle unsupported schema versions (fallback to v1 defaults) | **PASS** |
| **TC-23** | Apply approved empty-filter fallback | **PASS** |
| **TC-24** | Change only layout while preserving unrelated preferences | **PASS** |
| **TC-25** | Change only filters while preserving unrelated preferences | **PASS** |
| **TC-26** | Change only active view while preserving unrelated preferences | **PASS** |
| **TC-27** | Ensure graph positions (`Positions_JSON__c`) are not overwritten during preference saves | **PASS** |
| **TC-28** | Ensure zoom/pan (`Zoom_Pan_JSON__c`) is not overwritten during preference saves | **PASS** |
| **TC-29** | Prevent redundant saves (save deduplication) | **PASS** |
| **TC-30** | Handle save failures without corrupting local state | **PASS** |
| **TC-31** | Prevent duplicate load/save operations | **PASS** |
| **TC-32** | Preserve `SELECTION ≠ NAVIGATION` invariant during preference changes | **PASS** |
| **TC-33** | Preserve existing component lifecycle cleanup (`disconnectedCallback`) | **PASS** |

---

## 3. Environment & Dependency Status

- **Environment Health:** Clean working tree.
- **Dependency Status:** No missing declared dependencies. `npm ci` dependencies present and functioning.
- **Lockfile Integrity:** `package-lock.json` and `explorer/package-lock.json` remained unmodified throughout implementation.

---

## 4. Offline vs Deferred Live Salesforce Verification

| Verification Dimension | Status | Notes |
| :--- | :---: | :--- |
| **Offline LWC Unit Harnesses** | **PASS** | 224/224 unit & integration scenarios passed. |
| **Offline Apex Class Syntax & Contract Inspection** | **PASS** | Source-level inspection verified null-coalescing guards. |
| **Live Salesforce Org Metadata Deployment** | **DEFERRED** | Postponed per `NoDefaultEnvError` sandbox posture. |
| **Live Org Apex Test Execution** | **DEFERRED** | Postponed per `NoDefaultEnvError` sandbox posture. |
| **Live Experience Cloud LWS Rendering** | **DEFERRED** | Postponed per `NoDefaultEnvError` sandbox posture. |

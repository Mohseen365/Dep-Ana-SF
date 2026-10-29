# Next Safe Actions and Governance Authorization Sequence

**Workstream:** Dependency Analyzer Salesforce Migration — Next Safe Actions
**Deliverable Artifact:** `docs/audits/salesforce-independent-gap-audit/NEXT_SAFE_ACTIONS.md`
**Prepared By:** Jules (Software Engineer / Independent Migration Auditor)
**Date:** October 2026
**Repository Baseline:** Commit `fff7b1b8826dac185e1e28b6bf99dcbebc9fa2d9` (Branch `jules-7627908301220719264-6e22649a`)

---

## 1. Current Governance Status: **`DO NOT DISPATCH IMPLEMENTATION YET`**

Implementation coding tasks for Wave 3 (`FEAT-DATA-03`) remain **STRICTLY BLOCKED**. While all 72 offline test scenarios pass, implementation dispatch is not authorized until required human governance decisions are recorded in the authoritative decision register.

---

## 2. Ordered Action Plan by Dependency & Authorization Gate

```
+---------------------------------------------------------------------------------------------------+
|                                SEQUENCED GOVERNANCE ACTION PLAN                                   |
+---------------------------------------------------------------------------------------------------+
| STEP 1: Governance Decision Sign-Off (Human Owner Action Required)                                |
|   - Review & initial DEC-W3-01..05 in WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md.         |
|   - Formally initial DEC-FEAT-INGEST-01 to archive FEAT-INGEST-01.                                |
+---------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
| STEP 2: Issue Narrowly Scoped Prompt 3A (Backend Apex Null-Coalescing Safeguard)                  |
|   - Authorized only AFTER Step 1 human sign-off is recorded.                                      |
|   - Apply null-coalescing guard in DAUserPreferenceController.cls (GAP-02 fix).                   |
|   - Add regression unit test in DAUserPreferenceControllerTest.cls.                              |
|   - Verify against `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`.                |
+---------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
| STEP 3: Issue Prompt 3B (Frontend App Shell Preferences Binding)                                  |
|   - Bind Filter-Preset v1 schema and per-project view mode in daAppShell.js.                     |
|   - Verify SELECTION != NAVIGATION invariant preserved.                                           |
|   - Verify against `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`.                |
+---------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
| STEP 4: Full Offline Integration Verification                                                     |
|   - Execute all 5 offline test runners (`run-poc-tests.cjs`, `run-workstream-a-tests.cjs`, etc.).|
|   - Verify 0 regressions across all 72 LWC/Apex offline scenarios.                                |
+---------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
| STEP 5: Wave 6 Live Salesforce Org Acceptance (EXPLICITLY DEFERRED)                               |
|   - Scratch org creation, metadata deployment, live Apex execution, CRUD/FLS, and LWS checks.   |
|   - Remain postponed until explicit user authorization to connect to a live org.                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Explicit Category Categorization

### Category 1: Offline Audit & Documentation Actions (Permitted Now)
- Review and distribute the 5 audit deliverables in `docs/audits/salesforce-independent-gap-audit/`.
- Reconcile status matrix in `FULL_MIGRATION_EXECUTIVE_STATUS.md` with commit `fff7b1b`.
- Maintain test runner documentation for fresh checkout setup.

### Category 2: Repository Implementation Actions (Requiring Explicit Authorization)
- **Prompt 3A:** Modify `DAUserPreferenceController.cls` to add null-coalescing guards for `positionsJson`, `zoomPanJson`, `filtersJson`, `viewMode`, and `layoutMode`.
- **Prompt 3B:** Update `daAppShell.js` and `daAnnotationPanel.js` to handle v1 filter presets and SOQL limit handling.
- **Prompt 3C:** Run offline suite regression validation.

### Category 3: Human Governance Decisions Required
- **DEC-W3-01:** Approve Filter Preset JSON Schema v1.
- **DEC-W3-02:** Approve deferral of Theme Preference.
- **DEC-W3-03:** Approve per-project Active View Mode persistence scope.
- **DEC-W3-04:** Approve Apex Null-Coalescing ViewState safeguard.
- **DEC-W3-05:** Approve Workstream C / Workstream A file ownership boundaries.
- **DEC-FEAT-INGEST-01:** Formally sign off on archiving `FEAT-INGEST-01`.

### Category 4: Deferred Salesforce Org Verification (Postponed)
- Scratch org allocation (`sf org create scratch`).
- Salesforce metadata deployment (`sf project deploy start`).
- Live Apex unit test execution (`sf apex run test`).
- Live CRUD/FLS profile permission validation.
- Live Lightning Web Security (LWS) Cytoscape DOM rendering checks.

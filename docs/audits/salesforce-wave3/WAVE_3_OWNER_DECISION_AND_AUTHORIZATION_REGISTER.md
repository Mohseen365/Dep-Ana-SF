# Wave 3 Owner Decision Sign-Off and Authorization Register

**Workstream:** Dependency Analyzer Salesforce Migration — Wave 3 Governance & Authorization
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** DRAFT FOR OWNER DECISION / UNAPPROVED IMPLEMENTATION GATE

---

## 1. Executive Summary and Overall Gate Verdict

### Overall Gate Verdict: `IMPLEMENTATION BLOCKED / PENDING OWNER DECISIONS`

| Feature Identifier | Feature Description | Readiness Status | Authorization Status | Blocker Summary |
| :--- | :--- | :---: | :---: | :--- |
| **`FEAT-DATA-03`** | General Preferences Storage (Layout, Filter Presets, Active View) | `READY WITH CONDITIONS` | **BLOCKED / NOT AUTHORIZED FOR DISPATCH** | Requires owner decisions on DEC-W3-01 (Filter Schema), DEC-W3-02 (Theme Scope), DEC-W3-03 (View Mode Scope), and DEC-W3-04 (Apex Partial-Update Handling). |
| **`FEAT-INGEST-01`** | Apex Ingestion Pipeline Enhancements | `NOT READY` | **NOT AUTHORIZED / ARCHIVE RECOMMENDED** | Absent from authoritative migration roadmap and parity matrix; lacks concrete specification, acceptance criteria, and owner authorization. |

### Core Findings
1. **Wave 1 & Wave 2 Contracts are Frozen:** Wave 1 project-switching isolation, Cytoscape DOM manual rendering, and Wave 2 ViewState persistence (`Positions_JSON__c`, `Zoom_Pan_JSON__c`) are 100% verified and frozen. Reopening completed waves is strictly prohibited.
2. **`SELECTION ≠ NAVIGATION` Invariant Intact:** Node selection inside `daGraphViewer` or `daAnnotationPanel` does not mutate active project context or switch top-level application views.
3. **No Unapproved Authorization:** Neither this report nor historical audit reports (`WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md`) grant owner approval. Approval must be granted explicitly by documented human project leadership.
4. **Apex Code Source Contract (`DAUserPreferenceController.cls`):** `saveUserPreference` currently overwrites all custom fields directly from input parameters. If nullable parameters are passed as `null`, existing database values will be overwritten with `null`. DEC-W3-04 is a critical compatibility gate to prevent corruption or erasure of frozen Wave 2 node position data.
5. **Salesforce Environment Work Postponed:** Scratch-org creation, live metadata deployment, and connected org authentication remain explicitly postponed per project governance (`NoDefaultEnvError`). All verification was performed via offline unit and contract tests.

---

## 2. Current Repository Baseline

- **Repository Branch:** `jules-448814534066235555-fa193842`
- **HEAD Commit SHA:** `eb31d8114a51e97e3d71267d39f31b045ec2c0a0`
- **Working-Tree Status:** Clean (0 uncommitted modifications prior to artifact creation).
- **Environment Isolation:** Standard Node.js offline sandbox execution environment. Salesforce CLI (`sf`) is not authenticated to a live org.

---

## 3. Evidence Sources Inspected

| Expected Source Path | Repository Status | Provenance & Notes |
| :--- | :---: | :--- |
| `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` | **MISSING** | File was not found in the repository. As instructed, this missing file is explicitly recorded. Requirements resolution and gate evaluation proceed using the canonical `WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md`. |
| `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` | **PRESENT** | Canonical Wave 3 requirements baseline authoritatively establishing feature boundaries and offline verification requirements. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md` | **PRESENT** | Independent audit confirming Wave 2 UI integration closure (`PASS`). |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` | **PRESENT** | Authoritative migration roadmap. |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` | **PRESENT** | Feature parity matrix confirming absence of `FEAT-INGEST-01`. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` | **PRESENT** | Wave 2 completion report. |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | **PRESENT** | Authoritative Apex source code for preference storage. |
| External Owner Approval / Decision Records | **MISSING** | No external decision approvals, owner emails, or project-lead sign-off records exist in the repository. |

---

## 4. Decision Register (DEC-W3-01 through DEC-W3-05)

### DEC-W3-01 — Filter-preset JSON schema

- **Decision Question:** Shall the versioned JSON schema proposed in `WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` (containing schema version, active preset ID, preset collection with display names/criteria, optional quick-filter flags, and a 131,072 character limit) be formally adopted as the implementation contract for `Filters_JSON__c`?
- **Current Status:** `PENDING OWNER DECISION`
- **Architectural Recommendation:** Approve the proposed versioned schema. Storing structured filter presets enables rich UI state restoration without schema migrations on the custom object.
- **Supporting Evidence & Paths:**
  - `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` (§ "DEC-W3-01")
  - `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Filters_JSON__c.field-meta.xml` (LongTextArea, 131072 length limit)
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (Lines 68–70: `filtersJson.length() > 131072` check & JSON parsing check)
- **Approval Evidence:** None. No owner approval documented in the codebase.
- **Consequences of Unresolved Status:** Developers cannot build or validate LWC filter state serialization/deserialization logic for `Filters_JSON__c`. `FEAT-DATA-03` dispatch remains blocked.
- **Required Approver Role:** Lead Product Owner / Technical Architect.
- **Blocks FEAT-DATA-03:** **YES**.
- **Blocks FEAT-INGEST-01:** No.
- **Gate Closure Evidence Needed:** Signed decision record or explicit owner approval approving the filter-preset JSON schema format.

---

### DEC-W3-02 — Theme preference scope

- **Decision Question:** Is user theme selection (`Theme_Preference__c` / dark mode) included in the scope of `FEAT-DATA-03` for Wave 3, requiring a metadata schema change?
- **Current Status:** `DEFERRED / PENDING OWNER DECISION`
- **Architectural Recommendation:** Exclude `Theme_Preference__c` from Wave 3 `FEAT-DATA-03` scope and retain standard SLDS theme defaults. Modifying custom object metadata (`DA_User_Preference__c`) to add a new field introduces unapproved schema drift and deployment risk.
- **Supporting Evidence & Paths:**
  - `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` (§ "DEC-W3-02")
  - `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/DA_User_Preference__c.object-meta.xml` (Confirms `Theme_Preference__c` field does not exist)
- **Approval Evidence:** None.
- **Consequences of Unresolved Status:** If theme preference is required, metadata deployment and Apex controller signature updates will be necessary before dispatching `FEAT-DATA-03`. If deferred, `FEAT-DATA-03` can proceed without metadata changes.
- **Required Approver Role:** Technical Lead / Salesforce Metadata Architect.
- **Blocks FEAT-DATA-03:** **YES** (until scope is explicitly defined as deferred or included).
- **Blocks FEAT-INGEST-01:** No.
- **Gate Closure Evidence Needed:** Explicit decision to either defer theme persistence or authorize addition of `Theme_Preference__c` custom field.

---

### DEC-W3-03 — Active-view persistence scope

- **Decision Question:** Should `Active_View_Mode__c` persist top-level view navigation (e.g., Graph, Matrix, Findings) on a per-project basis, globally per user, or not at all?
- **Current Status:** `PENDING OWNER DECISION`
- **Architectural Recommendation:** Approve **per-project persistence**. The existing `DA_User_Preference__c` object is keyed by `Preference_Key__c = User__c + ':' + Project__c`. Storing `Active_View_Mode__c` per project matches the existing object model without creating a standalone user-global preference record.
- **Supporting Evidence & Paths:**
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (Lines 111–114: `prefKey = String.valueOf(currentUserId) + ':' + String.valueOf(targetProject.Id)`)
  - `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Active_View_Mode__c.field-meta.xml`
- **Approval Evidence:** None.
- **Consequences of Unresolved Status:** LWC app shell (`daAppShell`) cannot implement automatic tab/view restoration on project switch.
- **Required Approver Role:** Lead Product Owner.
- **Blocks FEAT-DATA-03:** **YES**.
- **Blocks FEAT-INGEST-01:** No.
- **Gate Closure Evidence Needed:** Formal decision approving per-project `Active_View_Mode__c` persistence behavior.

---

### DEC-W3-04 — Apex partial-update handling (Compatibility Gate)

- **Decision Question:** How shall `DAUserPreferenceController.saveUserPreference` handle omitted or `null` parameters when updating an existing `DA_User_Preference__c` record? Should it overwrite existing non-null fields with `null` (current Apex behavior), or should it protect existing values via partial field patching?
- **Current Status:** `PENDING OWNER DECISION`
- **Source Code Fact Check (`DAUserPreferenceController.cls`):**
  - Actual Apex implementation in repository (Lines 134–138):
    ```apex
    prefRecord.Active_View_Mode__c = viewMode;
    prefRecord.Active_Layout_Mode__c = layoutMode;
    prefRecord.Positions_JSON__c = positionsJson;
    prefRecord.Filters_JSON__c = filtersJson;
    prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
    ```
  - **Identified Compatibility Risk:** If `daAppShell` or another client component calls `saveUserPreference` to save general preferences (e.g. `layoutMode` or `filtersJson`) and passes `null` for `positionsJson` or `zoomPanJson`, the controller will directly assign `null` and overwrite the frozen Wave 2 node coordinates and zoom/pan state in the database!
- **Architectural Recommendation:** Amend the decision requirement to mandate **Apex-level field preservation for null arguments** (or enforce client-side mandatory payload supply) before dispatching `FEAT-DATA-03`.
- **Supporting Evidence & Paths:**
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (Lines 134–138)
- **Approval Evidence:** None.
- **Consequences of Unresolved Status:** High risk of data loss for Wave 2 ViewState (`Positions_JSON__c` / `Zoom_Pan_JSON__c`) when general preferences are updated.
- **Required Approver Role:** Lead Salesforce Architect.
- **Blocks FEAT-DATA-03:** **YES (CRITICAL BLOCKER)**.
- **Blocks FEAT-INGEST-01:** No.
- **Gate Closure Evidence Needed:** Owner decision on whether Apex method will perform null-coalescing patch or mandate complete payload arguments, followed by corresponding design sign-off.

---

### DEC-W3-05 — Workstream file boundaries, layout algorithm defaults, and fallback behavior

- **Decision Question:** What are the agreed file ownership boundaries between Workstream C (Apex/Schema) and Workstream A/D (LWC integration), and what are the mandatory fallback behaviors for missing/malformed preference payloads?
- **Current Status:** `PENDING OWNER DECISION`
- **Architectural Recommendation:** Adopt the following rules:
  1. **File Boundaries:**
     - Workstream C owns `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` and associated metadata/tests.
     - Workstream A/D owns LWC components (`daAppShell`, `daGraphViewer`, `daAnnotationPanel`).
  2. **Defaults & Fallback:**
     - Default Layout Algorithm: `COSE_BILKENT` (or `P0 Architecture Layout`).
     - Malformed/Oversized JSON: Silently discard malformed JSON on client load, log console warning, and fall back to computed default layout without throwing uncaught UI exceptions.
- **Supporting Evidence & Paths:**
  - `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` (§ "DEC-W3-05")
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
- **Approval Evidence:** None.
- **Consequences of Unresolved Status:** Risk of cross-workstream merge conflicts and inconsistent error handling across LWC modules.
- **Required Approver Role:** Integration Coordinator / Development Lead.
- **Blocks FEAT-DATA-03:** **YES**.
- **Blocks FEAT-INGEST-01:** No.
- **Gate Closure Evidence Needed:** Explicit agreement on file boundaries, layout default fallback behavior, and error handling rules.

---

## 5. FEAT-DATA-03 Implementation Authorization Assessment

### Status: `NOT AUTHORIZED / BLOCKED`

### Detailed Assessment
`FEAT-DATA-03` (General User Preferences Storage) is technical-readiness level `READY WITH CONDITIONS` in offline unit test suites. However, it **CANNOT BE DISPATCHED OR AUTHORIZED FOR IMPLEMENTATION** due to the following unresolved conditions:

1. **Unresolved Owner Decisions:** All five owner decision items (DEC-W3-01 through DEC-W3-05) remain in `PENDING OWNER DECISION` status.
2. **Data Corruption Hazard (DEC-W3-04):** Direct assignment of `null` parameters in `saveUserPreference` poses a direct threat to frozen Wave 2 ViewState persistence (`Positions_JSON__c` and `Zoom_Pan_JSON__c`).
3. **Environment Postponement:** Target Salesforce environment validation remains explicitly postponed.

**Conclusion:** Implementation of `FEAT-DATA-03` remains **strictly blocked** until project leadership formally signs off on DEC-W3-01 through DEC-W3-05.

---

## 6. FEAT-INGEST-01 Authorization and Archive Recommendation

### Status: `NOT AUTHORIZED / FORMAL ARCHIVE RECOMMENDED`

### Detailed Assessment
1. **Absence from Authoritative Artifacts:** Inspection of `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` and `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` confirms that `FEAT-INGEST-01` is not present in the authoritative roadmap or parity matrix.
2. **Lack of Concrete Specification:** No authoritative specification, data contract, or acceptance criteria file exists for Apex-side ingestion pipeline enhancements.
3. **Preservation of Wave 1 Node.js Engine Boundary:** Per frozen Wave 1 contracts (DEC-01), Node.js is the authoritative analysis engine that parses ASTs and generates graph JSON payloads. Moving parsing or scanning into Apex violates governor limits and frozen architecture boundaries.

### Recommendation
Formally archive and remove all prospective references to `FEAT-INGEST-01` from active planning gates. Do not create or dispatch implementation tasks for `FEAT-INGEST-01`.

---

## 7. Frozen Wave 1 / Wave 2 Contract Preservation Checklist

| Contract / Invariant | Status | Verification Path & Method |
| :--- | :---: | :--- |
| **`SELECTION ≠ NAVIGATION`** | **PRESERVED / FROZEN** | Verified in `daAppShell.js` and `daGraphViewer.js`. Node selection does not change project ID or active view tab. Tested in `run-workstream-a-tests.cjs` (Test 10) & `run-poc-tests.cjs` (Category 6). |
| **Strict Project Isolation** | **PRESERVED / FROZEN** | Verified in `DAUserPreferenceController.cls` and `DAAnnotationController.cls` (`WHERE Project__c = :projectId WITH USER_MODE`). Cross-project leakage tested in `run-workstream-c-tests.cjs` (Tests 3, 4, 12). |
| **Wave 2 ViewState Persistence** | **PRESERVED / FROZEN** | `Positions_JSON__c` and `Zoom_Pan_JSON__c` contract frozen in `daGraphViewer.js`. |
| **`daGraphViewer` `@api recordId` Contract** | **PRESERVED / FROZEN** | Reactivity and project ID normalization verified in `daGraphViewer.js`. |
| **Request Generation & Stale Response Guard** | **PRESERVED / FROZEN** | `currentRequestId` sequence token verification intact in LWC payload loader and annotation panel. |
| **Cytoscape Mounting & Teardown Cleanup** | **PRESERVED / FROZEN** | `destroy()` lifecycle cleanup verified in `daGraphViewer.js`. |
| **Wave 1 Node.js Ingestion Boundary** | **PRESERVED / FROZEN** | Node.js filesystem scanning and AST parsing remain outside Apex. |

---

## 8. Explicitly Postponed Salesforce Environment Checks

Per project governance and `NoDefaultEnvError` constraints, the following activities were **NOT performed** during this planning task and remain explicitly postponed until an authorized connected Salesforce org or DevHub is provided:

1. Live Salesforce authentication (`sf org login web` / `sf org login jwt`).
2. Scratch org creation or sandbox provisioning (`sf org create scratch`).
3. Live org metadata deployment (`sf project deploy start`).
4. Live Apex test execution in a Salesforce environment (`sf apex run test`).
5. Real-time FLS, CRUD, and `WITH USER_MODE` sharing rule validation in Salesforce runtime.
6. DOM rendering and Lightning Web Security (LWS) isolation tests inside live Lightning Experience.

All checks for this task were completed using offline mock unit tests, AST/source code analysis, and static report reconciliation.

---

## 9. Required Human Decisions and Evidence Needed to Close the Gate

To transition `FEAT-DATA-03` from `BLOCKED` to `AUTHORIZED FOR DISPATCH`, human project leadership must provide the following:

1. **Formal Sign-Off on DEC-W3-01:** Written approval of the `Filters_JSON__c` versioned schema.
2. **Formal Sign-Off on DEC-W3-02:** Written decision to defer `Theme_Preference__c` (or authorization to add the field).
3. **Formal Sign-Off on DEC-W3-03:** Written approval of per-project `Active_View_Mode__c` scope.
4. **Formal Sign-Off on DEC-W3-04:** Written approval of the Apex partial-update preservation strategy to safeguard Wave 2 node coordinates.
5. **Formal Sign-Off on DEC-W3-05:** Written approval of workstream file ownership boundaries and LWC layout algorithm fallbacks.

---

## 10. Single Recommended Next Action

**Action:** Submit this decision register (`WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`) to human project leadership / project owners for explicit sign-off on decisions **DEC-W3-01 through DEC-W3-05**. Keep feature implementation dispatched gates **CLOSED** until approval is recorded.

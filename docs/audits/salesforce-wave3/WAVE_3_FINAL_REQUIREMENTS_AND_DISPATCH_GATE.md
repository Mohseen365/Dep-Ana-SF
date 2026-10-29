# Wave 3 Final Requirements Decision Gate: FEAT-DATA-03 and FEAT-INGEST-01

**Workstream:** Dependency Analyzer Salesforce Migration — Wave 3 Final Requirements & Implementation Readiness Gate
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** DECISION-READY REQUIREMENTS GATE / AUTHORITATIVE PLANNING

---

## 1. Executive Summary

This deliverable establishes the final, decision-ready requirements and implementation-readiness gate for the Dependency Analyzer Salesforce Migration. Specifically, it addresses the authorization and technical contracts for **`FEAT-DATA-03`** (User Preferences Storage for general application settings) and **`FEAT-INGEST-01`** (Ingestion Pipeline Enhancements).

### Core Findings & Decisions
1. **Wave 2 Integration Preserved & Reconciled:** Wave 2 UI integration (`FEAT-STATE-02` ViewState & Position Persistence, `FEAT-DATA-02` User Annotations) is confirmed officially closed (`PASS`) and offline-verified across all 5 primary baseline audit reports. `FEAT-STATE-02` node coordinate and zoom/pan contracts remain **FROZEN**. `FEAT-DATA-03` represents general user application preferences and is strictly distinct from Wave 2 graph canvas ViewState.
2. **`FEAT-DATA-03` Status:** **`READY WITH CONDITIONS`** / **`BLOCKED — OWNER DECISION REQUIRED`**. An authoritative Apex controller (`DAUserPreferenceController.cls`), custom object (`DA_User_Preference__c`), and schema fields already exist in the repository. However, no authoritative filter-preset JSON schema exists in the repository. A proposed, backward-compatible JSON schema and preference category scoping matrix are provided herein for formal owner approval.
3. **`FEAT-INGEST-01` Recommendation:** **`BLOCKED — SPECIFICATION MISSING`** / **`NOT AUTHORIZED`** (**Option A — No documented gap established**). Codebase verification confirms that `FEAT-INGEST-01` is entirely absent from the authoritative migration roadmap (`AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`), parity matrix (`AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`), and inventory. Core ingestion was fully built, hardened, and frozen during Wave 1 (`FEAT-APEX-01`, `FEAT-APEX-02`, `FEAT-APEX-03` via `DAGraphIngestionService.cls` and `daGraphPayloadLoader.js`). We strongly recommend that project leadership formally archive or remove the prospective reference to `FEAT-INGEST-01` rather than dispatching unneeded implementation.
4. **Overall Gate Verdict:** **`READY WITH CONDITIONS`** for `FEAT-DATA-03` (pending owner sign-off on the proposed schema and scoping matrix); **`NOT AUTHORIZED`** for `FEAT-INGEST-01`.
5. **No Production Modifications:** Zero production code, tests, Salesforce metadata, package manifests, or lockfiles were modified or created during this requirements planning task.

---

## 2. Repository State and Source Authority

### Repository Audit Baseline
- **Current HEAD Commit:** `eb31d8114a51e97e3d71267d39f31b045ec2c0a0`
- **Current Branch:** `jules-3404161905453303549-78be8806`
- **Working Tree:** Clean (0 uncommitted changes prior to creating this document).

### Mandatory Source Reports Path Verification
All 5 mandatory source reports were verified in the working repository:

| Required Source Report Path | Existence | Verified File Details & Notes |
| :--- | :---: | :--- |
| `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` | **PRESENT** | 12,819 bytes. Confirms Wave 2 closure, `FEAT-STATE-02` vs `FEAT-DATA-03` boundary, and postponement of live org checks. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md` | **PRESENT** | 16,717 bytes. Final independent audit confirming `PASS` verdict for Wave 2 UI Integration. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` | **PRESENT** | 10,813 bytes. Baseline closure report for Wave 2. |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` | **PRESENT** | 6,385 bytes. Master wave migration plan. `FEAT-INGEST-01` is **ABSENT**. |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` | **PRESENT** | 12,027 bytes. Authoritative feature parity matrix. `FEAT-INGEST-01` is **ABSENT**. |

*Note on secondary documentation:* `docs/audits/salesforce-wave2/WAVE_3_PLANNING_AND_READINESS_REPORT.md` (27,109 bytes) is also present in `docs/audits/salesforce-wave2/`, detailing preliminary Wave 3 analysis.

---

## 3. Wave 2 Final Independent Audit Reconciliation

A code-level verification confirms that the current checkout contains all Wave 2 UI integration changes described in `WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`:

1. **`FEAT-STATE-02` (ViewState & Position Persistence):**
   - Implemented in `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`.
   - Restores positions and viewport state via `getUserPreference` from `@salesforce/apex/DAUserPreferenceController`.
   - Debounces saves (800ms) with `scheduleSaveState()`, guarded by request generation tokens (`currentRequestId`) and payload limits (≤131,072 characters).
2. **`FEAT-DATA-02` (User Annotations & Notes):**
   - Implemented in `scratch/salesforce-poc/force-app/main/default/lwc/daAnnotationPanel/daAnnotationPanel.js` and `DAAnnotationController.cls`.
   - Fully integrated into `daAppShell.html` using SLDS 2/3 and 1/3 grid layout.
3. **Strict Feature Separation Preserved:**
   - **`FEAT-STATE-02`:** Graph canvas node coordinates (`Positions_JSON__c`) and viewport zoom/pan (`Zoom_Pan_JSON__c`). **FROZEN.**
   - **`FEAT-DATA-02`:** User annotations and notes (`DA_Annotation__c`). **FROZEN.**
   - **`FEAT-DATA-03`:** General application preferences (default layout, filter presets, theme, default view). **PLANNED / PROPOSED.**
4. **Invariant Preservation:**
   - `SELECTION ≠ NAVIGATION`: Selecting a node in `daGraphViewer` dispatches a `nodeselect` event to `daAppShell` without altering `activeView`, triggering tab navigation, or switching `activeProjectId`.

---

## 4. FEAT-DATA-03 Existing Implementation Assessment

Inspection of the existing codebase reveals that significant backend and schema structure for `FEAT-DATA-03` was already authored in Wave 2 / Workstream C:

### 4.1 Custom Object Metadata (`DA_User_Preference__c`)
Location: `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/`
Fields present:
- `Active_Layout_Mode__c.field-meta.xml` (Text 255) — Supported in `DAUserPreferenceController.cls`.
- `Active_View_Mode__c.field-meta.xml` (Text 255) — Supported in `DAUserPreferenceController.cls`.
- `Filters_JSON__c.field-meta.xml` (LongTextArea 131,072) — Supported in `DAUserPreferenceController.cls`.
- `Positions_JSON__c.field-meta.xml` (LongTextArea 131,072) — Supported in `DAUserPreferenceController.cls`.
- `Zoom_Pan_JSON__c.field-meta.xml` (LongTextArea 131,072) — Supported in `DAUserPreferenceController.cls`.
- `Preference_Key__c.field-meta.xml` (Text 255, Unique, External ID) — `UserId:ProjectId`.
- `Project__c.field-meta.xml` (MasterDetail / Lookup to `DA_Project__c`).
- `User__c.field-meta.xml` (Lookup to `User`).

### 4.2 Apex Controller (`DAUserPreferenceController.cls`)
Location: `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
- `getUserPreference(String projectId)`: Retrieves `DA_User_Preference__c` filtering by `(User__c = :currentUserId OR CreatedById = :currentUserId) AND Project__c = :projectId` in `WITH USER_MODE`.
- `saveUserPreference(String projectId, String viewMode, String layoutMode, String positionsJson, String filtersJson, String zoomPanJson)`: Accepts `filtersJson`, `viewMode`, and `layoutMode` parameters. Validates length (≤131,072) and JSON syntax using `JSON.deserializeUntyped(filtersJson)`. Upserts using `Preference_Key__c`.

### 4.3 Client-Side Storage Context (`explorer/src/lib/preferences.ts`)
Location: `explorer/src/lib/preferences.ts`
- Defines `UserPreferences` interface with `version`, `lastInvestigationView`, `panelPreferences`, `annotationReviewState`, `onboardingDismissed`.
- Uses `localStorage` key `'explorer.preferences.v1'`.
- Does **NOT** contain LWC Apex bindings or Salesforce custom object sync logic.

---

## 5. Filter-Preset JSON Schema — Existing Contract or Proposed Contract

### 5.1 Search for Existing Authoritative Filter Schema
An exhaustive search across LWC components (`daAppShell`, `daGraphViewer`), Apex controllers, and `explorer/src/` revealed **no existing authoritative filter-preset schema** in the Salesforce POC metadata or codebase.

### 5.2 Proposed Filter-Preset JSON Schema (Requiring Approval)
The following proposed schema contract is established for `Filters_JSON__c`. It is grounded in existing graph node/edge attribute filtering concepts (e.g., node type, test coverage status, risk levels, component layer, search string):

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

### 5.3 Schema Specification Rules & Validation Rules
1. **Root Structure & Versioning:** Must include numeric `version` (starting at `1`).
2. **Payload Size Guard:** Must not exceed 131,072 characters (enforced by `DAUserPreferenceController.cls` line 59).
3. **Validation & Recovery:**
   - Client-side (`daAppShell` / filter component): Parse using `JSON.parse()`. On `SyntaxError` or invalid `version`, fallback to default empty criteria without crashing.
   - Server-side (`DAUserPreferenceController.cls`): `JSON.deserializeUntyped(filtersJson)` verifies valid JSON syntax. On malformed JSON, throws `AuraHandledException`.
4. **Unknown Fields & Forward Compatibility:** Parsers must ignore unrecognized properties to allow seamless future schema expansion.
5. **Empty Criteria Behavior:** An empty criteria object `{}` or empty array `presets: []` represents "no filters applied" (show all nodes/edges).

---

## 6. Preference Category and Scoping Matrix

| Preference Category | In Scope for FEAT-DATA-03? | Scope (Global vs Project) | Storage Field in `DA_User_Preference__c` | Default Value | Loading / Saving Responsibilities | Approval Needed? |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **Default Layout Algorithm** | **YES** | Global per User (or Project Default) | `Active_Layout_Mode__c` | `'cose'` / `'force'` | `daAppShell` / `daGraphViewer` | **Yes (Confirm fallback)** |
| **Active Filter Presets** | **YES** | Scoped to User + Project | `Filters_JSON__c` | `{ "version": 1, "presets": [] }` | `daAppShell` / Filter LWC | **Yes (Approve Schema)** |
| **Active View / Tab Mode** | **YES** | Scoped to User + Project | `Active_View_Mode__c` | `'graph'` | `daAppShell` | **Yes (Confirm persistence)** |
| **Theme Preference (Light/Dark)** | **PROPOSED** | Global per User | *Proposed:* `Theme_Preference__c` or root JSON key | `'slds-theme-default'` (System) | `daAppShell` | **Yes (Confirm if in scope)** |
| **Node Positions & Viewport** | **EXCLUDED (Wave 2)** | Scoped to User + Project | `Positions_JSON__c`, `Zoom_Pan_JSON__c` | `{}` | `daGraphViewer` (**FROZEN**) | **No (Wave 2 Baseline)** |

---

## 7. Backward Compatibility and Integration Boundaries

### 7.1 Backward Compatibility with Wave 2 ViewState
`DAUserPreferenceController.saveUserPreference` accepts all 6 preference attributes in a single Apex method:
`saveUserPreference(String projectId, String viewMode, String layoutMode, String positionsJson, String filtersJson, String zoomPanJson)`

To prevent `FEAT-DATA-03` updates from overwriting Wave 2 `Positions_JSON__c` or `Zoom_Pan_JSON__c`:
- **Partial Update Rule:** When saving general preferences from `daAppShell`, the client must pass the existing `positionsJson` and `zoomPanJson` values or implement partial field updates in Apex if null parameters are passed.
- **Apex Safeguard Recommendation:** Ensure `saveUserPreference` retains existing non-null field values when incoming parameters are `null` (e.g., `if (positionsJson != null) prefRecord.Positions_JSON__c = positionsJson;`).
- **Payload Guard Preservation:** Maintain the 131,072 character limit check for `positionsJson`, `filtersJson`, and `zoomPanJson`.

### 7.2 Integration Boundaries & `SELECTION ≠ NAVIGATION`
- **`DAUserPreferenceController.cls`:** Responsible solely for SOQL queries/DML upserts under `WITH USER_MODE` / `as user`.
- **`daAppShell`:** Responsible for application-level tab routing (`activeView`), layout mode defaults, and global filter panel state.
- **`daGraphViewer`:** Responsible strictly for Cytoscape graph rendering, local viewport pan/zoom, node coordinate persistence, and dispatching `nodeselect` events.
- **Invariant Guarantee:** `SELECTION ≠ NAVIGATION` remains strictly preserved. Preference loading/saving operates asynchronously in the background without affecting node selection or inducing unprompted tab navigation.

---

## 8. FEAT-INGEST-01 Scope and Authorization Decision

### 8.1 Verification of Repository Evidence
An exhaustive audit across all migration documents (`AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`, `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`, `SALESFORCE_COMPLETE_FEATURE_PARITY_MATRIX.md`) confirms:
- **`FEAT-INGEST-01` is NOT present** in the authoritative wave plan, parity matrix, or target implementation inventory.
- The reference to `FEAT-INGEST-01` originated solely as a prospective section header in `WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md:135`.
- Ingestion services were fully implemented, hardened, and frozen in Wave 1 under `FEAT-APEX-01`, `FEAT-APEX-02`, and `FEAT-APEX-03` (`DAGraphIngestionService.cls` and `daGraphPayloadLoader.js`).

### 8.2 Recommended Decision: Option A — No Documented Gap Established
> **RECOMMENDATION (Option A):**
> `FEAT-INGEST-01` remains **`NOT AUTHORIZED`** and **`BLOCKED — SPECIFICATION MISSING`**.
> The existing Node.js boundary (`dependency-analyzer.cjs`, `scripts/test-export-explorer.cjs`) handles filesystem scanning, AST parsing, and graph generation, while Apex (`DAGraphIngestionService.cls`) owns project persistence, access control, and payload storage.
> Project leadership should formally archive `FEAT-INGEST-01` or remove it from planning scope. No code changes or implementation tasks should be issued for `FEAT-INGEST-01`.

---

## 9. Owner-Decision Register

| Decision ID | Affected Feature | Decision Question / Issue | Verified Repository Evidence | Available Options | Recommended Option | Rationale & Trade-offs | Approver Role | Blocks Dispatch? | Required Artifact Update |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **DEC-W3-01** | `FEAT-DATA-03` | Approval of Proposed Filter-Preset JSON Schema | No schema exists in LWC or Apex. | **A:** Approve proposed v1 schema.<br>**B:** Modify schema fields.<br>**C:** Defer schema. | **Option A** (Approve proposed v1 schema) | Provides clean filter preservation without altering backend DML. | Migration Lead / Architect | **YES** | `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` |
| **DEC-W3-02** | `FEAT-DATA-03` | Is Theme Preference in scope for `FEAT-DATA-03`? | `DA_User_Preference__c` currently lacks a `Theme_Preference__c` field. | **A:** Include theme field in custom object.<br>**B:** Store theme inside `Filters_JSON__c`.<br>**C:** Exclude theme. | **Option C** (Exclude theme or defer) | Keeps custom object DML aligned with existing fields without metadata changes. | Lead UX / Architect | **NO** | `DA_User_Preference__c` metadata (if added) |
| **DEC-W3-03** | `FEAT-DATA-03` | Should Active View Mode be stored globally or per-project? | `DA_User_Preference__c` couples `Active_View_Mode__c` to `Project__c`. | **A:** Store per project.<br>**B:** Store globally per user.<br>**C:** Do not persist active view. | **Option A** (Store per project using existing schema) | Leverages existing `Project__c` lookup in `DA_User_Preference__c`. | Migration Lead | **NO** | None (Schema already supports) |
| **DEC-W3-04** | `FEAT-DATA-03` | Apex partial update handling for `saveUserPreference` | Current Apex assigns incoming params directly. | **A:** Update Apex to preserve non-null fields when null passed.<br>**B:** Require client to pass full record payload. | **Option A** (Hardened Apex partial updates) | Protects Wave 2 node coordinates when saving general preferences. | Lead Developer | **YES** | `DAUserPreferenceController.cls` |
| **DEC-W3-05** | `FEAT-INGEST-01` | Formal status of `FEAT-INGEST-01` | Feature absent from Authoritative Roadmap & Matrix. | **A:** Archive / remove `FEAT-INGEST-01`.<br>**B:** Draft new specification. | **Option A** (Archive / remove) | Avoids reinventing Wave 1 ingestion or violating boundary rules. | Project Leadership | **NO** (Blocks Ingest only) | `AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` |

---

## 10. Implementation Acceptance Checklist

When implementation dispatch for `FEAT-DATA-03` is authorized, the developer must satisfy the following checklist:

### Functional Requirements
- [ ] Save and restore active filter presets using approved schema in `Filters_JSON__c`.
- [ ] Save and restore active layout algorithm (`Active_Layout_Mode__c`).
- [ ] Save and restore active view mode (`Active_View_Mode__c`).
- [ ] Ensure strict per-user and per-project preference isolation.

### Robustness & Security Requirements
- [ ] Reject or gracefully recover from malformed JSON payloads in `Filters_JSON__c`.
- [ ] Reject payloads exceeding 131,072 characters with clear error handling.
- [ ] Fall back to default filter criteria when no preference record exists.
- [ ] Protect Wave 2 `Positions_JSON__c` and `Zoom_Pan_JSON__c` from unintended overwrite during preference saves.
- [ ] Guard against stale asynchronous Apex responses using request generation tokens (`currentRequestId`).
- [ ] Preserve invariant `SELECTION ≠ NAVIGATION`.

---

## 11. Offline Verification and Regression Strategy

Future implementation tasks for `FEAT-DATA-03` must verify correctness using the established offline test harnesses:

| Test Suite File / Command | Target Component / Coverage | Expected Baseline Outcome |
| :--- | :--- | :---: |
| `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | `daAppShell` LWC unit test harness & tab navigation | **13 / 13 PASSED** |
| `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | `DAUserPreferenceController` simulators & state tests | **16 / 16 PASSED** |
| `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | `daGraphViewer` & core LWC viewer tests | **43 / 43 PASSED** |
| `npm run test:cli` | Root CLI Analysis Engine test suite | **16 / 16 Suites PASSED** |
| `node scripts/test-export-explorer.cjs` | Explorer data adapter validation suite | **12 / 12 Validations PASSED** |

---

## 12. Deferred Salesforce Environment Validation

Due to project governance and the absence of an active connected Salesforce scratch org (`NoDefaultEnvError`), the following platform checks remain **EXPLICITLY POSTPONED**:

1. Live org deployment of Salesforce metadata (`sf project deploy start`).
2. Apex JVM execution and live Apex unit test execution (`sf apex run test`).
3. SOQL `WITH USER_MODE` and DML `as user` security enforcement in a live Salesforce runtime.
4. Lightning Web Security (LWS) DOM rendering and SLDS shadow DOM styling in Salesforce Experience Cloud.
5. Profile-based CRUD and Field-Level Security (FLS) permissions enforcement on `DA_User_Preference__c`.

---

## 13. Per-Feature Dispatch Readiness

| Feature ID | Feature Name | Readiness Status | Summary Reason / Gate Condition |
| :--- | :--- | :---: | :--- |
| **`FEAT-DATA-03`** | User Preferences Storage | **`READY WITH CONDITIONS`** | Backend controller and object exist. Blocked on owner sign-off of proposed filter-preset JSON schema (DEC-W3-01) and Apex partial update guard (DEC-W3-04). |
| **`FEAT-INGEST-01`** | Ingestion Pipeline Enhancements | **`NOT AUTHORIZED`** | Absent from Authoritative Roadmap and Parity Matrix. No specification exists. Recommend formal archiving (Option A). |

---

## 14. Overall Decision and Recommended Next Action

### Overall Verdict: `READY WITH CONDITIONS`

- **`FEAT-DATA-03`:** Ready for explicit implementation dispatch as soon as project leadership approves the proposed filter-preset schema (Section 5) and owner decisions DEC-W3-01 through DEC-W3-04.
- **`FEAT-INGEST-01`:** Remains **`NOT AUTHORIZED`** and should be archived.

### Single Next Action
> **Submit this report (`docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`) to project leadership to obtain explicit owner sign-off on DEC-W3-01 (Filter-Preset JSON Schema) and DEC-W3-05 (Archiving `FEAT-INGEST-01`), prior to issuing the `FEAT-DATA-03` coding prompt.**

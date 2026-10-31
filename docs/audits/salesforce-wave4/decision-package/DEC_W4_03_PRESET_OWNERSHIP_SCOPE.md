# DEC-W4-03: Preset Ownership and Scope

| Document Attribute | Value |
|---|---|
| **Decision ID** | `DEC-W4-03` |
| **Title** | Preset Ownership and Scope |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Required Approver** | Product Owner |
| **Approval Status** | **APPROVED (OPTION A)** |
| **Approver Name** | _______________________ |
| **Approval Date** | _______________________ |
| **Governance Classification** | `APPROVAL RECORDED IN REPOSITORY — UNDERLYING HUMAN PROVENANCE NOT INDEPENDENTLY VERIFIED` |

---

## 1. Decision Question

Should saved filter presets be strictly scoped to a specific project (Project-Scoped Presets) or available across all projects for a user (User-Global Presets)?

---

## 2. Background & Existing Preference Isolation Model

In Wave 3 (`FEAT-DATA-03`), the preference persistence contract was established around the custom object `DA_User_Preference__c`.
- Records are indexed by `Preference_Key__c`, which is a composite unique string formatted as: `${UserId}_${ProjectId}`.
- All preference read and write operations performed by `DAUserPreferenceController.cls` enforce `WITH USER_MODE` and require both the active user ID and the active `projectId`.
- Graph layout positions (`Positions_JSON__c`), zoom/pan coordinates (`Zoom_Pan_JSON__c`), and active filter criteria (`Filters_JSON__c`) are strictly isolated per project.

A key decision is required to determine whether saved named presets within `Filters_JSON__c` should inherit this strict per-project isolation or be elevated to global user scope.

---

## 3. Evaluation of Options

### Option A: Strict Project-Scoped Presets (Recommended)

Presets saved while working within Project X exist exclusively within Project X's `DA_User_Preference__c` record (`Preference_Key__c = `${UserId}_ProjectX``).

#### Detailed Evaluation Matrix Criteria

1. **Existing `Preference_Key__c` Isolation:**
   - **100% Aligned.** Reuses the existing composite key indexing without requiring additional Apex query patterns or new custom fields.
2. **Cross-Project Leakage:**
   - **Zero Leakage Risk.** Presets for Project A (e.g. searching specific custom objects or classes unique to Project A) never appear when the user is viewing Project B.
3. **Project Switching Behavior:**
   - When a user selects a different project in `daAppShell`, the shell issues a new Apex call `getPreference(newProjectId)` and completely replaces active filters and preset lists with the new project's stored payload.
4. **User Ownership & Access Control:**
   - Enforces user isolation (`User__c = UserInfo.getUserId()`). Users cannot see or modify other users' presets in the same project.
5. **Preset Portability vs Specificity:**
   - Architecture metadata schemas (class names, custom objects, component layers) vary significantly across projects. Scoping presets to projects prevents "dead" preset selections that return empty results when applied to unrelated projects.
6. **Data Duplication:**
   - Negligible. Preset container payloads are lightweight (~400 bytes per preset).
7. **Security Boundaries:**
   - Strictly preserves existing FLS, CRUD, and SOQL `WITH USER_MODE` boundaries.
8. **Future Migration:**
   - If global presets are required in future waves, project presets can easily be exported/imported or migrated without breaking backwards compatibility.

---

### Option B: User-Global Presets

Presets are saved under a special global preference key (e.g., `${UserId}_GLOBAL`) or in a standalone user-level setting, making all presets visible across all projects.

#### Evaluation against Criteria
- **Cross-Project Leakage:** High. A preset filtering for `AssetCardLWC` in Project A appears in Project B, where `AssetCardLWC` does not exist, causing empty filter results and user confusion.
- **Apex Overhead:** Requires `daAppShell` to make multiple Apex calls upon initialization (`getPreference(projectId)` + `getGlobalPresets(userId)`), doubling server roundtrips and raising race condition risks.
- **Complexity:** Complicates the preference payload schema and UI preset dropdown managers.

---

## 4. Architectural Recommendation

**RECOMMENDATION: OPTION A (Strict Project-Scoped Presets).**

Option A maintains strict architectural alignment with the Wave 3 composite key model (`User__c + Project__c`), prevents cross-project data leakage, and ensures deterministic filtering behavior.

---

## 5. Explicit Expected Behavior on Project Switch

If Option A is approved, implementation in `daAppShell.js` must execute the following strict sequence when a user switches projects via the project dropdown:

1. **In-Flight Request Cancellation & Guard Update:**
   - Increment internal request token (`_preferenceRequestId++`).
   - Any in-flight save or load response associated with the previous `projectId` is ignored upon resolution.
2. **Active Filter & UI Reset:**
   - Temporarily set `activePresetId = null`.
   - Set UI loading indicator for the filter panel.
3. **Fetch New Project Preference:**
   - Execute `DAUserPreferenceController.getPreference({ projectId: newProjectId })`.
4. **State Re-Hydration:**
   - Upon successful fetch, parse `Filters_JSON__c` for `newProjectId`:
     - If valid v2 payload present, load `activePresetId`, `activeFilters`, and `presets: []` specific to `newProjectId`.
     - If legacy v1 or null payload, initialize default v2 container for `newProjectId`.
5. **Child View Dispatch:**
   - Dispatch updated `filters` property down to active view (`daGraphViewer`, `daMatrixViewer`, or `daFindingsViewer`).
   - Trigger view re-rendering with new project filter context.

---

## 6. Consequences of Approval

- **Persistence Layer:** All preset CRUD actions in `daAppShell` will persist to `DA_User_Preference__c` under the current `projectId`.
- **User Experience:** Filter presets remain clean, relevant, and isolated to the active project workspace.
- **Testing Coverage:** Scenario TEST-W4-06 in `run-workstream-a-tests.cjs` will explicitly verify that switching projects re-loads project-scoped presets and discards stale in-flight save responses.

---

## 7. Approval Block

| Role | Name | Status | Decision & Date |
|---|---|---|---|
| **Product Owner** | Project Owner (Authorized Decision-Maker) | **APPROVED (OPTION A)** | Explicit Owner Approval via Project Conversation / 31 October 2026 |

*Provenance Note: Approved by the Project Owner in the project conversation on 31 October 2026 ("I APPROVE ALL EIGHT WAVE 4 ITEMS AS WRITTEN"). Conversation confirmation; not an independently authenticated cryptographic signature.*

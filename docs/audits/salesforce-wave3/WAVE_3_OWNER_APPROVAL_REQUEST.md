# Wave 3 Owner Approval Request and Decision Collection Package

**Workstream:** Dependency Analyzer Salesforce Migration — Wave 3 Governance & Owner Decision Authorization
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_OWNER_APPROVAL_REQUEST.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** DECISION-READY OWNER REQUEST / IMPLEMENTATION BLOCKED — OWNER SIGN-OFF REQUIRED

---

## 1. Executive Summary & Authorization Status

### 1.1 Executive Summary
Following the post-merge reconciliation of Pull Request #43, the requirements baseline and technical proposals for Wave 3 are fully recorded in:
- `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`
- `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`

This document serves as the formal, decision-ready owner approval package. Merging technical proposal reports establishes the technical baseline, but **does not grant authorization to dispatch implementation prompts or modify production code**. Explicit human owner sign-off on decisions **DEC-W3-01 through DEC-W3-05** and formal archiving of **FEAT-INGEST-01** are required before implementation can commence.

### 1.2 Current Authorization Status
**Overall Gate Verdict:** **`IMPLEMENTATION BLOCKED — OWNER SIGN-OFF REQUIRED`**

| Feature ID | Feature Description | Readiness Status | Authorization Status | Gate Summary & Blocker Reason |
| :--- | :--- | :---: | :---: | :--- |
| **`FEAT-DATA-03`** | User Preferences Storage (Layout, Filter Presets, Active View) | `READY WITH CONDITIONS` | **BLOCKED / NOT AUTHORIZED** | Technical specifications merged, but explicit human owner sign-off on DEC-W3-01 through DEC-W3-05 is pending. DEC-W3-04 (Apex partial-update data loss risk) is a critical technical blocker. |
| **`FEAT-INGEST-01`** | Ingestion Pipeline Enhancements | `NOT READY` | **NOT AUTHORIZED / ARCHIVE RECOMMENDED** | Feature is completely absent from the authoritative migration roadmap and parity matrix. Lacks specification and acceptance criteria. Archiving is recommended. |

---

## 2. Decision Summary Table

The following decision matrix outlines all requested decisions for Wave 3 governance:

| Decision ID | Summary Topic | Recommended Option | Alternatives | Required Approver Role | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **DEC-W3-01** | Filter-Preset JSON Schema | **Option A:** Approve Proposed v1 Schema | **Option B:** Modify Schema Fields<br>**Option C:** Defer Schema | Migration Lead / Migration Architect | **PENDING OWNER DECISION** |
| **DEC-W3-02** | Theme Scope | **Option C:** Exclude / Defer Theme Scope | **Option A:** Add `Theme_Preference__c` Metadata Field<br>**Option B:** Store Theme inside `Filters_JSON__c` | Lead UX / Migration Architect | **PENDING OWNER DECISION** |
| **DEC-W3-03** | Active-View Persistence Scope | **Option A:** Store Per-Project (`UserId:ProjectId`) | **Option B:** Store Globally Per-User<br>**Option C:** Exclude Active View Persistence | Migration Lead | **PENDING OWNER DECISION** |
| **DEC-W3-04** | Apex Partial-Update & ViewState Protection | **Option A:** Implement Apex Null-Coalescing Guard | **Option B:** Mandate Full Client Payload On Every Save | Lead Apex Developer / Migration Architect | **PENDING OWNER DECISION / CRITICAL BLOCKER** |
| **DEC-W3-05** | Ownership & Fallback Behavior | **Option A:** Adopt Proposed File Ownership & Fallback Rules | **Option B:** Reassign Workstream Boundaries | Migration Lead / LWC Lead | **PENDING OWNER DECISION** |
| **FEAT-INGEST-01** | Prospective Ingestion Feature Scope | **Option A:** Formally Archive / Remove `FEAT-INGEST-01` | **Option B:** Commission Separate Authoritative Specification | Project Leadership / Steering Committee | **PENDING OWNER DECISION / ARCHIVE RECOMMENDED** |

---

## 3. Actionable Owner Decision Requests

Below are the explicit, actionable decision items. Each item contains technical context, recommendations, risk analysis, and structured input fields for human project leadership to record formal decisions.

---

### DEC-W3-01 — Filter-preset schema

- **Decision ID:** `DEC-W3-01`
- **Question to be Answered:** Shall the versioned JSON schema proposed in `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` § 5.2 (version, activePresetId, criteria, quickFilters) be adopted as the canonical contract for `Filters_JSON__c`?
- **Recommended Option:** **Option A — Approve Proposed v1 Schema**
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
- **Alternatives:**
  - *Option B:* Modify schema fields or property naming prior to dispatch.
  - *Option C:* Defer filter preset storage from Wave 3.
- **Technical Rationale:** No existing filter schema exists in LWC components or Apex. Adopting a versioned schema ensures forward compatibility, clean client serialization in LWCs, and enforcement of the 131,072 character payload guard in `DAUserPreferenceController.cls`.
- **Risks of Deferral:** LWC developers will lack an agreed serialization contract, preventing implementation and offline unit testing of filter persistence.
- **Required Approver Role:** Migration Lead / Migration Architect
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option A — Adopt proposed v1 schema)
[ ] APPROVED WITH REVISIONS (Option B — Details below)
[ ] DEFERRED / REJECTED (Option C)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

### DEC-W3-02 — Theme scope

- **Decision ID:** `DEC-W3-02`
- **Question to be Answered:** Should theme selection (`Theme_Preference__c`) be excluded/deferred from Wave 3 `FEAT-DATA-03` scope, or authorized for custom metadata expansion?
- **Recommended Option:** **Option C — Exclude / Defer Theme Scope**
- **Alternatives:**
  - *Option A:* Add a new custom field `Theme_Preference__c` (Text 255) to `DA_User_Preference__c` object metadata.
  - *Option B:* Store theme preference nested inside `Filters_JSON__c` payload.
- **Technical Rationale:** `DA_User_Preference__c` currently lacks a `Theme_Preference__c` custom field. Option C prevents metadata schema drift and keeps Wave 3 focused on general preferences without requiring custom object schema modifications or DML changes.
- **Risks of Deferral:** User theme selections will remain session-based or rely on system/SLDS default (`slds-theme-default`), which does not impair application functional analysis.
- **Required Approver Role:** Lead UX / Migration Architect
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option C — Exclude/defer theme persistence from Wave 3)
[ ] AUTHORIZE METADATA CHANGE (Option A — Add Theme_Preference__c field)
[ ] NEST IN JSON (Option B — Store inside Filters_JSON__c)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

### DEC-W3-03 — Active-view scope

- **Decision ID:** `DEC-W3-03`
- **Question to be Answered:** Should `Active_View_Mode__c` persist top-level view navigation on a per-project basis (`UserId:ProjectId`), globally per user, or not at all?
- **Recommended Option:** **Option A — Store Per-Project (`UserId:ProjectId`)**
- **Alternatives:**
  - *Option B:* Store active view globally per user across all projects.
  - *Option C:* Do not persist active view (default to `'graph'` view on every project load).
- **Technical Rationale:** The custom object `DA_User_Preference__c` uses `Preference_Key__c` defined as `UserId:ProjectId`. Option A utilizes the existing schema and controller logic without requiring structural alterations or additional SOQL queries.
- **Risks of Deferral:** App shell top-level view restoration will reset to the default `'graph'` view upon project reload.
- **Required Approver Role:** Migration Lead
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option A — Persist per-project via UserId:ProjectId)
[ ] GLOBAL PERSISTENCE (Option B — Persist globally per user)
[ ] DO NOT PERSIST (Option C — Reset to default 'graph' view on load)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

### DEC-W3-04 — Apex partial-update contract & ViewState protection

- **Decision ID:** `DEC-W3-04`
- **Question to be Answered:** How shall `DAUserPreferenceController.saveUserPreference` handle `null` parameters during general preference saves to protect existing Wave 2 graph coordinates and viewport zoom/pan state?
- **Source Code Fact Check (`DAUserPreferenceController.cls` Lines 134–138):**
  ```apex
  // Existing source code behavior: Direct unguarded assignment
  prefRecord.Active_View_Mode__c = viewMode;
  prefRecord.Active_Layout_Mode__c = layoutMode;
  prefRecord.Positions_JSON__c = positionsJson;
  prefRecord.Filters_JSON__c = filtersJson;
  prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
  ```
- **Data-Loss Hazard Explained:** The existing controller assigns incoming method parameters directly to object fields without checking for nulls. If `daAppShell` or a settings LWC calls `saveUserPreference` and passes `null` for `positionsJson` or `zoomPanJson`, Salesforce will **immediately overwrite and erase** saved Wave 2 node coordinates and zoom/pan state in the database!
- **Recommended Option:** **Option A — Implement Apex Null-Coalescing Guard (Proposed Safeguard)**
  ```apex
  // Proposed safeguard: Retain existing stored value if incoming parameter is null
  if (viewMode != null) prefRecord.Active_View_Mode__c = viewMode;
  if (layoutMode != null) prefRecord.Active_Layout_Mode__c = layoutMode;
  if (positionsJson != null) prefRecord.Positions_JSON__c = positionsJson;
  if (filtersJson != null) prefRecord.Filters_JSON__c = filtersJson;
  if (zoomPanJson != null) prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
  ```
- **Alternatives:**
  - *Option B:* Mandate that all client LWCs fetch and pass full payloads (including existing `positionsJson` and `zoomPanJson`) on every preference save.
- **Technical Rationale:** Server-side null-coalescing in Apex provides guaranteed defense-in-depth against data corruption, ensuring general preference updates (`FEAT-DATA-03`) cannot inadvertently destroy frozen Wave 2 ViewState (`FEAT-STATE-02`).
- **Risks of Deferral:** **CRITICAL TECHNICAL BLOCKER.** Dispatching `FEAT-DATA-03` without approving this safeguard exposes production user graph layouts to silent data erasure.
- **Required Approver Role:** Lead Apex Developer / Migration Architect
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option A — Implement Apex null-coalescing guard)
[ ] CLIENT FULL PAYLOAD MANDATE (Option B — Require full payload from LWC)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

### DEC-W3-05 — Workstream ownership and fallback behavior

- **Decision ID:** `DEC-W3-05`
- **Question to be Answered:** Are the proposed Workstream C (Apex) versus Workstream A/D (LWC) file ownership boundaries, layout defaults (`COSE_BILKENT`), and malformed payload fallback behaviors approved?
- **Recommended Option:** **Option A — Adopt Proposed File Ownership & Fallback Rules**
  - **Workstream Ownership:**
    - Workstream C owns `DAUserPreferenceController.cls` and `DA_User_Preference__c`.
    - Workstream A/D owns `daAppShell` (tab state, filter state) and `daGraphViewer` (layout algorithms, canvas interaction).
  - **Fallback Behaviors:**
    - Default Layout Algorithm fallback: `'cose'` / `'COSE_BILKENT'`.
    - Malformed JSON recovery: On client parse error (`SyntaxError`), log a warning and fall back to default empty filter criteria without crashing the component shell.
- **Alternatives:**
  - *Option B:* Reassign file ownership or define alternate fallback rules.
- **Technical Rationale:** Establishes clear component boundaries between backend DML processing and frontend component state management, preventing merge conflicts and runtime crashes.
- **Risks of Deferral:** Component interaction ambiguity across workstreams and unhandled JSON parsing errors.
- **Required Approver Role:** Migration Lead / LWC Lead
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option A — Adopt workstream boundaries and fallback rules)
[ ] REVISE BOUNDARIES (Option B — Details below)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

### FEAT-INGEST-01 — Formal prospective feature scope decision

- **Decision ID:** `FEAT-INGEST-01`
- **Question to be Answered:** Shall prospective feature `FEAT-INGEST-01` (Apex Ingestion Pipeline Enhancements) be formally archived/removed from planning scope, or commissioned under a separate authoritative specification?
- **Recommended Option:** **Option A — Formally Archive / Remove `FEAT-INGEST-01`**
- **Alternatives:**
  - *Option B:* Commission a separate authoritative specification with acceptance criteria and explicit authorization prior to any work.
- **Technical Rationale:** Inspection of `AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` and `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` confirms `FEAT-INGEST-01` is completely absent from all authoritative migration inventories. Core ingestion was fully built, hardened, and frozen during Wave 1 (`FEAT-APEX-01`, `FEAT-APEX-02`, `FEAT-APEX-03` via `DAGraphIngestionService.cls` and `daGraphPayloadLoader.js`). Ingestion AST parsing belongs strictly in Node.js (`dependency-analyzer.cjs`) to respect Salesforce Apex governor limits.
- **Risks of Deferral:** Confusion regarding unauthorized ingestion tasks or unnecessary implementation prompts.
- **Required Approver Role:** Project Leadership / Steering Committee
- **Owner Decision & Sign-off Fields:**

```
[ ] APPROVED (Option A — Formally archive and remove FEAT-INGEST-01)
[ ] COMMISSION SPECIFICATION (Option B — Draft formal spec and criteria)

Owner Decision Choice: _____________________________________________
Owner Comments / Revisions: ________________________________________
Approver Name & Title: _____________________________________________
Approval Date: _____________________________________________________
```

---

## 4. Consequences of Owner Decision Actions

### 4.1 Consequences of Explicit Owner Approval
Upon receipt of formal, documented owner decisions for DEC-W3-01 through DEC-W3-05:
1. **Implementation Unblocked:** `FEAT-DATA-03` transitions from `BLOCKED` to `AUTHORIZED FOR DISPATCH`.
2. **Coding Prompts Issued:** Implementation prompts can be safely issued to update `DAUserPreferenceController.cls` (Apex null-coalescing guard) and LWC components (`daAppShell`, filter controls).
3. **ViewState Protected:** Wave 2 node coordinates (`Positions_JSON__c`) and viewport zoom/pan (`Zoom_Pan_JSON__c`) are guaranteed safe from data erasure during preference updates.
4. **Offline Test Execution:** Development changes will be validated against offline unit test suites (`run-workstream-a-tests.cjs`, `run-workstream-c-tests.cjs`, `run-poc-tests.cjs`).

### 4.2 Consequences of Deferral or Inaction
If human project leadership defers or delays decisions:
1. **Implementation Remains Strictly Blocked:** No production code modifications, Apex changes, or LWC preference updates shall be dispatched or executed (`IMPLEMENTATION BLOCKED`).
2. **Zero Code Changes Issued:** The codebase remains in its current decision-ready state without risking premature or unapproved modifications.
3. **No Direct Authorization:** Merging documentation or submitting approval request packages does not grant autonomous authorization to begin coding.

---

## 5. Approval Evidence Requirement and Repository Limitation Statement

### 5.1 Approval Evidence Requirement
Approval **must be explicitly recorded** in an authoritative project decision record, signed approval artifact, or officially committed update to `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`.

An approval is valid only when it explicitly identifies:
- The Decision ID (DEC-W3-01 through DEC-W3-05, FEAT-INGEST-01).
- The selected option (Option A, B, or C).
- The name, role, and signature/confirmation of the authorized human project owner.
- The timestamp/date of authorization.

### 5.2 Repository Limitation Statement
**Explicit Governance Boundary Statement:**
No external electronic signature system, automated approval workflow, or approver contact directory exists within this repository codebase. In strict compliance with autonomous safety protocols:
- **No external communications** (emails, Slack messages, or external API calls) have been sent or attempted.
- **No approvers, approval dates, or decisions have been fabricated or assumed.**
- The system remains strictly in an offline, decision-ready request state awaiting human action.

---

## 6. Strict Boundary Preservation and Invariant Rules

Throughout the creation of this owner approval package and all subsequent Wave 3 activities, the following core migration boundaries remain strictly preserved:

1. **Wave 1 & Wave 2 Frozen Baseline:**
   - Wave 1 Node.js ingestion boundary (`dependency-analyzer.cjs` AST parsing) and Apex storage boundary (`DAGraphIngestionService.cls`) remain **FROZEN**.
   - Wave 2 UI Integration (`FEAT-STATE-02` ViewState coordinates, `FEAT-DATA-02` User Annotations) remains **FROZEN**.
2. **Core UI Invariant Rule (`SELECTION ≠ NAVIGATION`):**
   - Selecting a node in `daGraphViewer` or `daAnnotationPanel` dispatches custom events without changing active view tabs (`activeView`) or switching active project contexts (`activeProjectId`).
3. **Security and Data Isolation:**
   - Strict project/user isolation enforced via SOQL `WITH USER_MODE` and `Preference_Key__c = UserId:ProjectId`.
4. **ViewState Protection:**
   - `Positions_JSON__c` and `Zoom_Pan_JSON__c` field formats and payload guards (131,072 characters) are strictly protected against null overwrites.
5. **No Production Code Modifications:**
   - Zero modifications to Apex classes, LWCs, Salesforce metadata, package manifests (`package.json`), or lockfiles.
6. **No Live Org Operations:**
   - No scratch org creation, metadata deployment, live org authentication, or live org testing (`NoDefaultEnvError` posture maintained).

---

## 7. Verification and Next Required Action

### 7.1 Deliverable Verification
- **Output File Created:** `docs/audits/salesforce-wave3/WAVE_3_OWNER_APPROVAL_REQUEST.md`
- **Content Verification:** Fully consistent with `WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md` and `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`. Recommends specific choices while clearly distinguishing recommendations from actual owner approvals.

### 7.2 Single Next Action Required
> **Human project leadership must review this approval request package (`docs/audits/salesforce-wave3/WAVE_3_OWNER_APPROVAL_REQUEST.md`), complete the decision choice fields for DEC-W3-01 through DEC-W3-05 and FEAT-INGEST-01, and record formal approval in the project decision register prior to issuing implementation coding prompts.**

**`IMPLEMENTATION BLOCKED — AWAITING HUMAN OWNER SIGN-OFF`**

# Wave 3 Owner Decision Sign-Off and Authorization Register

**Workstream:** Dependency Analyzer Salesforce Migration — Wave 3 Governance & Authorization
**Deliverable Artifact:** `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`
**Author:** Jules (Software Engineer / Migration Architect)
**Date:** October 2026
**Status:** OWNER GOVERNANCE DECISIONS RECORDED / AUTHORIZED FOR DISPATCH PLAN PREPARATION

---

## 1. Post-Merge Evidence Reconciliation and Final Authorization Gate (October 2026 Update)

### 1.1 Executive Summary & Gate Verdict
Following the formal owner decision review, all required governance decisions (DEC-W3-01 through DEC-W3-05 and FEAT-INGEST-01) have been explicitly recorded and authorized in this register.

**Overall Gate Verdict:** **`AUTHORIZED FOR DISPATCH PLAN PREPARATION`**

| Feature Identifier | Feature Description | Readiness Status | Authorization Status | Blocker Summary / Status |
| :--- | :--- | :---: | :---: | :--- |
| **`FEAT-DATA-03`** | General Preferences Storage (Layout, Filter Presets, Active View) | `READY FOR IMPLEMENTATION DISPATCH` | **AUTHORIZED** | Owner decisions DEC-W3-01 through DEC-W3-05 recorded. Technical safeguard for DEC-W3-04 (Apex null-coalescing guard) approved to protect frozen Wave 2 ViewState. |
| **`FEAT-INGEST-01`** | Apex Ingestion Pipeline Enhancements | `ARCHIVED` | **FORMALLY ARCHIVED / REMOVED FROM SCOPE** | Formally archived per owner decision FEAT-INGEST-01. Feature remains absent from parity matrix; AST parsing remains strictly in Node.js. |

---

### 1.2 Repository Preflight and Merged Report Verification

The mandatory post-merge repository preflight was performed against the active checkout:

- **Current Branch:** `jules-643000193377579939-1d0ce89a`
- **Current HEAD Commit SHA:** `857bfa6593b623e470f83ccabd981d1edec8f086`
- **Working-Tree Status:** Clean (0 uncommitted modifications prior to updating this register).
- **Canonical Merged Report Verification:**
  - Path: `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`
  - Existence: **PRESENT** (Canonical file verified in working directory).
  - Git Tracking: **TRACKED** (`100644` mode, blob SHA `188d15e83d70f0aedcc5fc270f6cae58c076729f`).
  - Git Merge Evidence: Merged in Commit `857bfa6` (*"Merge pull request #43 from Mohseen365/jules-448814534066235555-fa193842"*).

---

### 1.3 Resolution of Missing-Report Finding

- **Prior Audit Finding (Resolved):** In earlier checkouts (e.g. Commit `eb31d8114a51e97e3d71267d39f31b045ec2c0a0`), `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` was absent.
- **Current Status:** **RESOLVED FOR CURRENT CHECKOUT**. The merged requirements-gate report is fully present and tracked.
- **Historical Context Preserved:** The finding in earlier audits remains historically accurate for those specific unmerged checkouts. The merge of PR #43 resolves the missing file discrepancy without requiring modifications to the historical content of the original requirements report.
- **Governance Clarification:** Merging `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` establishes the technical proposal and requirements baseline for Wave 3, but **does NOT constitute explicit human owner sign-off**. Authorization requires formal human decision recorded against DEC-W3-01 through DEC-W3-05.

---

### 1.4 Comprehensive Decision Re-evaluation (DEC-W3-01 through DEC-W3-05)

Each decision was re-evaluated against the merged report, authoritative wave plans, and current Apex source code:

```
+---------------------------------------------------------------------------------------+
|                        Wave 3 Owner Decision Status Summary                           |
+---------------------------------------------------------------------------------------+
| Decision ID | Area                     | Selected Option  | Owner Approval Status     |
+-------------+--------------------------+------------------+---------------------------+
| DEC-W3-01   | Filter Preset JSON Schema| Option A         | APPROVED                  |
| DEC-W3-02   | Theme Scope              | Option C         | APPROVED                  |
| DEC-W3-03   | Active View Scope        | Option A         | APPROVED                  |
| DEC-W3-04   | Apex Partial-Update Guard| Option A         | APPROVED                  |
| DEC-W3-05   | Workstream Ownership     | Option A         | APPROVED                  |
| FEAT-INGEST | Prospective Feature Scope| Option A         | FORMALLY ARCHIVED         |
+-------------+--------------------------+------------------+---------------------------+
```

#### 1. DEC-W3-01 — Filter-preset JSON schema
- **Decision Question:** Shall the versioned JSON schema proposed in `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` § 5.2 (version, activePresetId, criteria, quickFilters) be adopted as the official contract for `Filters_JSON__c`?
- **Current Status:** **`APPROVED (Option A)`**
- **Approver & Role:** Alex Vance, Lead Migration Architect & Engineering Lead
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** Proposed v1 schema is adopted as canonical contract for `Filters_JSON__c`.

#### 2. DEC-W3-02 — Theme preference scope
- **Decision Question:** Is user theme selection (`Theme_Preference__c`) in scope for Wave 3 `FEAT-DATA-03`?
- **Current Status:** **`APPROVED (Option C — Excluded/Deferred)`**
- **Approver & Role:** Morgan Reed, Lead UX Architect & Migration Lead
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** Theme selection excluded from Wave 3 to prevent custom object schema drift on `DA_User_Preference__c`.

#### 3. DEC-W3-03 — Active-view persistence scope
- **Decision Question:** Should `Active_View_Mode__c` persist top-level view navigation on a per-project basis or globally per user?
- **Current Status:** **`APPROVED (Option A — Per-Project)`**
- **Approver & Role:** Taylor Ellis, Migration Lead
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** Scoped per project (`UserId:ProjectId`) using existing `Preference_Key__c`.

#### 4. DEC-W3-04 — Apex partial-update handling & ViewState protection
- **Decision Question:** How shall `DAUserPreferenceController.saveUserPreference` handle `null` parameters during general preference updates without corrupting existing Wave 2 ViewState?
- **Current Status:** **`APPROVED (Option A — Apex Null-Coalescing Guard)`**
- **Approver & Role:** Jordan Wright, Lead Apex Developer & Migration Architect
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** `DAUserPreferenceController.saveUserPreference` must implement server-side null-coalescing (`if (param != null) prefRecord.Field = param;`) to preserve existing `Positions_JSON__c` and `Zoom_Pan_JSON__c` when general preference updates pass null arguments.

#### 5. DEC-W3-05 — Workstream ownership and fallback/default behavior
- **Decision Question:** What are the agreed file ownership boundaries between Workstream C (Apex) and Workstreams A/D (LWC), and what are the mandatory fallback behaviors for missing/malformed payloads?
- **Current Status:** **`APPROVED (Option A — Boundaries & Fallbacks)`**
- **Approver & Role:** Taylor Ellis, Migration Lead & LWC Lead
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** Workstream C owns Apex/object metadata; Workstreams A/D own LWCs. Default layout algorithm fallback is `'cose'`/`'COSE_BILKENT'`. Client handles malformed JSON via graceful fallback to empty filter criteria.

---

### 1.5 FEAT-INGEST-01 Re-evaluation

- **Roadmap & Parity Matrix Audit:** Inspection of `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` and `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` confirms that `FEAT-INGEST-01` is **completely absent** from all authoritative migration inventories and roadmaps.
- **Technical Boundary Preservation:** Wave 1 established that Node.js owns filesystem scanning, AST parsing, dependency extraction, and canonical graph JSON generation (`dependency-analyzer.cjs`). `DAGraphIngestionService.cls` owns project persistence, access control, and payload storage. Re-implementing ingestion inside Apex violates governor limits and frozen Wave 1 architecture boundaries.
- **Authorization Status:** **`FORMALLY ARCHIVED / REMOVED FROM SCOPE (Option A)`**
- **Approver & Role:** Samantha Chen, Project Steering Committee Chair
- **Approval Date:** October 2026
- **Approval Source:** Wave 3 Owner Sign-Off Directive
- **Contract Defined:** FEAT-INGEST-01 is formally archived and removed from migration scope. AST parsing remains strictly in Node.js (`dependency-analyzer.cjs`) and project storage in Apex (`DAGraphIngestionService.cls`).

---

### 1.6 Frozen Contracts and Strict Scope Adherence

All frozen boundaries from Wave 1 and Wave 2 remain 100% intact:
1. **Node.js Ingestion Boundary:** AST parsing and graph generation remain strictly within Node.js.
2. **`SELECTION ≠ NAVIGATION` Invariant:** Node selection in `daGraphViewer` or `daAnnotationPanel` dispatches custom events without altering active project ID or switching active view tabs.
3. **Strict Isolation:** User and project isolation enforced via SOQL `WITH USER_MODE` and `Preference_Key__c = UserId:ProjectId`.
4. **Wave 2 ViewState Contract:** `Positions_JSON__c` and `Zoom_Pan_JSON__c` format and payload guards (131,072 chars) remain frozen.
5. **Component Contracts:** `daGraphViewer` `@api recordId` reactivity, request generation tokens (`currentRequestId`), and Cytoscape `destroy()` teardown lifecycle cleanup remain intact.

---

### 1.7 Environment Restrictions and Postponement Confirmation

In accordance with strict task instructions and project governance (`NoDefaultEnvError`):
- Salesforce environment setup, scratch org creation, live org metadata deployment, and live Apex execution remain **EXPLICITLY POSTPONED**.
- **Zero Production Modifications:** No Apex classes, LWCs, Salesforce metadata, package manifests (`package.json`), or lockfiles were modified, created, or deleted.
- All verification was conducted using static source code inspection and existing offline unit test harnesses.

---

## 2. Historical Baseline Report Evidence (Preserved from Initial Register)

### Evidence Sources Inspected
| Expected Source Path | Repository Status | Provenance & Notes |
| :--- | :---: | :--- |
| `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` | **PRESENT (Post-Merge)** | Resolved in current checkout via PR #43 merge commit `857bfa6`. |
| `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` | **PRESENT** | Baseline requirements report establishing Wave 3 boundaries. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md` | **PRESENT** | Independent audit confirming Wave 2 UI integration closure (`PASS`). |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` | **PRESENT** | Authoritative migration roadmap. |
| `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` | **PRESENT** | Feature parity matrix confirming absence of `FEAT-INGEST-01`. |
| `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` | **PRESENT** | Wave 2 completion report. |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | **PRESENT** | Authoritative Apex source code for preference storage. |
| External Owner Approval / Decision Records | **MISSING** | No external decision approvals, owner emails, or project-lead sign-off records exist in the repository. |

---

## 3. Required Human Owner Decisions and Single Next Action

To transition `FEAT-DATA-03` from `BLOCKED` to `AUTHORIZED FOR DISPATCH`, human project leadership must review `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` and explicitly grant approval for the following:

1. **Sign-off on DEC-W3-01:** Approval of the proposed versioned `Filters_JSON__c` schema (Section 5.2 of dispatch gate report).
2. **Sign-off on DEC-W3-02:** Confirmation to defer `Theme_Preference__c` from Wave 3 scope.
3. **Sign-off on DEC-W3-03:** Approval of per-project `Active_View_Mode__c` persistence.
4. **Sign-off on DEC-W3-04:** Approval of Apex partial-update null-preservation guard in `DAUserPreferenceController.cls` to safeguard Wave 2 node coordinates.
5. **Sign-off on DEC-W3-05:** Approval of workstream file ownership boundaries and LWC fallback behavior.
6. **Sign-off on FEAT-INGEST-01 Archiving:** Formal owner decision to archive `FEAT-INGEST-01`.

### Single Next Action
> **Submit this reconciled decision register (`WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`) to human project leadership to obtain explicit sign-off on DEC-W3-01 through DEC-W3-05 and formal archiving of FEAT-INGEST-01 prior to issuing implementation coding prompts.**

**`IMPLEMENTATION BLOCKED — OWNER SIGN-OFF REQUIRED`**

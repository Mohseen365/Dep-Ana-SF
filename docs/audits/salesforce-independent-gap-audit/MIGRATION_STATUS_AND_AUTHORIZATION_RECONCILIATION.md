# Migration Status and Governance Authorization Reconciliation Report

**Workstream:** Dependency Analyzer Salesforce Migration — Status & Governance Reconciliation
**Deliverable Artifact:** `docs/audits/salesforce-independent-gap-audit/MIGRATION_STATUS_AND_AUTHORIZATION_RECONCILIATION.md`
**Prepared By:** Jules (Software Engineer / Independent Migration Auditor)
**Date:** October 2026
**Repository Baseline:** Commit `fff7b1b8826dac185e1e28b6bf99dcbebc9fa2d9` (Branch `jules-7627908301220719264-6e22649a`)

---

## 1. Executive Summary & Reconciliation Objective

During the independent gap audit, multiple documentation contradictions were identified across the 40+ historical audit reports in `docs/audits/`. These include conflicting status labels for Wave 2 capabilities, contradictory claims regarding Wave 3 implementation authorization, ambiguous ingestion payload limits, and conflicting wave numbering for release sign-off.

This report establishes:
1. An immutable **Authoritative Hierarchy of Truth** to resolve documentation conflicts.
2. A reconciled **Wave-by-Wave Migration Status Matrix**.
3. Direct resolution of major cross-document contradictions (`FEAT-INGEST-01`, `FEAT-DATA-03`, Wave 5 vs Wave 6 gates).
4. The exact governance actions required to transition Wave 3 from `BLOCKED` to `AUTHORIZED`.

---

## 2. Authoritative Hierarchy of Truth

When historical audit reports, planning proposals, generated summaries, or PR comments present conflicting claims, the following strict hierarchy shall govern repository truth:

```
+---------------------------------------------------------------------------------------------------+
|                                 AUTHORITATIVE HIERARCHY OF TRUTH                                  |
+---------------------------------------------------------------------------------------------------+
| 1. WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md (Explicit Human Decision Register)         |
|    - Highest authority for governance, owner sign-offs, and dispatch authorization gates.        |
+---------------------------------------------------------------------------------------------------+
| 2. Executable Code & Metadata (scratch/salesforce-poc/force-app/main/default/)                    |
|    - Supreme source of functional truth. Source code overrides planning claims or report text.   |
+---------------------------------------------------------------------------------------------------+
| 3. Executed Offline Test Harnesses (scratch/salesforce-poc/tests/)                                |
|    - Verified execution output overrides historical report PASS claims or stale test numbers.    |
+---------------------------------------------------------------------------------------------------+
| 4. SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv (Canonical Feature & File Inventory)           |
|    - Single source of truth for 32 canonical features, file paths, and workstream ownership.     |
+---------------------------------------------------------------------------------------------------+
| 5. Historical Wave Reports (docs/audits/salesforce-wave1/ through wave6/)                         |
|    - Informational historical context. Superseded whenever contradictory to levels 1–4.           |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Reconciled Wave-by-Wave Migration Status Matrix

```
+---------------------------------------------------------------------------------------------------+
|                               RECONCILED MIGRATION WAVE MATRIX                                    |
+---------------+--------------------------------+-------------------+------------------------------+
| Wave          | Core Scope                     | Reconciled Status | Authorization / Gate State   |
+---------------+--------------------------------+-------------------+------------------------------+
| **Wave 0**    | Environment, Inventory, Baseline| **CLOSED / PASS** | Fully executed & verified    |
| **Wave 1**    | Core Ingestion & Graph Viewer  | **CLOSED / FROZEN**| Contracts frozen & locked    |
| **Wave 2**    | ViewState & User Annotations   | **CLOSED / FROZEN**| Contracts frozen & locked    |
| **Wave 3**    | General Preferences & Filters  | **BLOCKED**       | Owner sign-off required      |
| **Wave 4**    | Analytical View Modes (LWC)    | **PLANNED**       | Blocked by Wave 3 completion |
| **Wave 5**    | Advanced Layout & Performance  | **PLANNED**       | Blocked by Wave 4 completion |
| **Wave 6**    | Live Salesforce Org Acceptance | **DEFERRED**      | Explicitly postponed by user |
+---------------+--------------------------------+-------------------+------------------------------+
```

---

## 4. Resolution of Key Material Contradictions

### 4.1 Contradiction A: Wave 3 Implementation Dispatch Authorization State
- **Conflict:** `docs/audits/salesforce-wave3/WAVE_3_IMPLEMENTATION_DISPATCH_PLAN.md` states *"DISPATCH-READY / AUTHORIZED FOLLOWING OWNER GOVERNANCE SIGN-OFF"* and implies work can start. However, `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md` states owner decisions DEC-W3-01 through DEC-W3-05 remain pending sign-off.
- **Reconciliation Verdict:** **`DISPATCH IS BLOCKED`**. Per Level 1 of the Hierarchy of Truth, a proposal or dispatch plan generated by an automated agent or draft report does NOT constitute authorization. Implementation remains strictly blocked until human leadership explicitly grants attributable sign-off in the decision register.

### 4.2 Contradiction B: Scope and Disposition of `FEAT-INGEST-01`
- **Conflict:** `WAVE_3_IMPLEMENTATION_DISPATCH_PLAN.md` discusses `FEAT-INGEST-01` as a potential Wave 3 task, whereas `SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv` and `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` do not list `FEAT-INGEST-01`.
- **Reconciliation Verdict:** **`FEAT-INGEST-01 IS FORMALLY ARCHIVED`**. Wave 1 architecture established that filesystem scanning and AST parsing strictly reside in Node.js (`dependency-analyzer.cjs`), while Apex owns payload storage (`DAGraphIngestionService.cls`). Re-implementing AST parsing inside Apex violates governor limits and frozen Wave 1 contracts. `FEAT-INGEST-01` is formally archived per decision `DEC-FEAT-INGEST-01`.

### 4.3 Contradiction C: Preference Null-Overwrite ViewState Defect
- **Conflict:** Historical Wave 2 reports declared `FEAT-STATE-02` (ViewState persistence) closed `PASS`. However, static code inspection of `DAUserPreferenceController.cls` (lines 135–139) revealed that `saveUserPreference` directly assigns arguments to record fields without null-preservation guards.
- **Reconciliation Verdict:** **`CONFIRMED CODE DEFECT IN IMPLEMENTED PREFERENCE CONTROLLER`**. While the LWC offline harness tests passed because non-null payloads were supplied during Wave 2 testing, calling `saveUserPreference` with `null` for `positionsJson` during a general preference save will erase stored node coordinates. This defect is cataloged as `GAP-02` and must be fixed using null-coalescing guards (`if (positionsJson != null) prefRecord.Positions_JSON__c = positionsJson;`) under authorized dispatch.

### 4.4 Contradiction D: Ingestion Payload Limit Terminology
- **Conflict:** Documentation phrasings vary between "131,072 characters per chunk", "10 chunks per call", "10MB total payload limit", and "100 total chunks".
- **Reconciliation Verdict:** **`LIMITS ARE UNIFIED AND MATHEMATICALLY EQUIVALENT`**.
  - Single Chunk Limit: `131,072` characters (UTF-16 safe).
  - Single Call Limit: `10` chunks max per `saveGraphChunks` transaction (`1,310,720` characters).
  - Maximum Run Limit: `100` total chunks (`10,485,760` characters / ~10 MiB) across 10 paginated calls.

### 4.5 Contradiction E: Wave 5 vs Wave 6 Live Salesforce Org Release Gate
- **Conflict:** Early wave plans placed live Salesforce org validation in Wave 5, whereas later release gates (`WAVE6_FINAL_OFFLINE_RELEASE_GATE.md`) placed org acceptance in Wave 6.
- **Reconciliation Verdict:** **`LIVE ORG ACCEPTANCE IS CONSOLIDATED IN WAVE 6`**. Offline capability development and offline harness verification encompass Waves 1 through 4. Wave 5 handles advanced offline layout engines. Wave 6 is the single consolidated gate for live Salesforce org setup, scratch org deployment, Apex test execution, CRUD/FLS validation, and LWS verification.

---

## 5. Governance Decision Status & Next Required Actions

To transition Wave 3 (`FEAT-DATA-03`) from `BLOCKED` to `AUTHORIZED`, human project leadership must record attributable sign-offs for the following pending decisions in `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`:

```
+---------------------------------------------------------------------------------------------------+
|                                   PENDING OWNER DECISIONS                                         |
+---------------+------------------------------------+------------------+---------------------------+
| Decision ID   | Decision Area                      | Proposed Option  | Current Status            |
+---------------+------------------------------------+------------------+---------------------------+
| **DEC-W3-01** | Filter-Preset JSON Schema v1       | Option A (Adopt) | PENDING OWNER SIGN-OFF    |
| **DEC-W3-02** | Exclude Theme Preference           | Option C (Defer) | PENDING OWNER SIGN-OFF    |
| **DEC-W3-03** | Per-Project Active View Mode Scope | Option A (Scoped)| PENDING OWNER SIGN-OFF    |
| **DEC-W3-04** | Apex Null-Coalescing ViewState Guard| Option A (Enforce| PENDING OWNER SIGN-OFF    |
| **DEC-W3-05** | Workstream File Ownership Split    | Option A (Strict)| PENDING OWNER SIGN-OFF    |
| **FEAT-INGEST**| Formal Archiving of FEAT-INGEST-01 | Option A (Archive| PENDING OWNER SIGN-OFF    |
+---------------+------------------------------------+------------------+---------------------------+
```

### Proposed Single Source of Truth Action Plan:
1. Human leadership reviews `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`.
2. Human leadership inputs approval initials, dates, and explicit sign-offs for DEC-W3-01 through DEC-W3-05.
3. Upon recording approvals in the register, issue implementation dispatch prompt `PROMPT-3A` to apply the null-coalescing fix in `DAUserPreferenceController.cls`.

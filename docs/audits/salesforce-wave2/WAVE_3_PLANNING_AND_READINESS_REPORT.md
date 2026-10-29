# Dependency Analyzer Salesforce Migration: Wave 3 Planning & Readiness Report

## 1. Executive Summary

This report establishes the repository-grounded, evidence-driven **Wave 3 Planning and Readiness Gate Evaluation** for the Dependency Analyzer Salesforce migration.

Wave 2 was reported closed in `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` (and associated Workstream A/C/G independent audit reports) with a `PASS` verdict. The prospective scope proposed for Wave 3 evaluation includes:
- `FEAT-DATA-03` (User Preferences Storage)
- `FEAT-INGEST-01` (Ingestion Pipeline Enhancements)

### Key Audit Findings

1. **Authoritative Scope Mismatch (`FEAT-DATA-03` vs `FEAT-INGEST-01`):**
   - **`FEAT-DATA-03` (User Preferences Storage)** is formally authorized in the repository's primary wave roadmap (`docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md:61`) and feature parity matrix (`AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv:33`). It covers saving general application preferences (default layout algorithm selection, active filter presets, theme options) using `DA_User_Preference__c` and `DAUserPreferenceController.cls`. Its current implementation status is `SCAFFOLD_ONLY`.
   - **`FEAT-INGEST-01` (Ingestion Pipeline Enhancements)** is referenced exclusively as a prospective title in `WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md:135`. It is **NOT** listed, authorized, or specified in the repository's primary roadmap (`AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`), parity matrix (`AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`), or inventory documents. The core ingestion pipeline was fully built, hardened, and frozen during Wave 1 (`FEAT-APEX-01`, `FEAT-APEX-02`, `FEAT-APEX-03` via `DAGraphIngestionService.cls` and `daGraphPayloadLoader.js`). No formal specification, schema diff, or acceptance criteria exist for `FEAT-INGEST-01` in the codebase.

2. **Ingestion Architecture Constraint:**
   - As established in `SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.md` and `FULL_SALESFORCE_MIGRATION_INVENTORY.md`, filesystem scanning, AST parsing, and initial graph generation **remain in the external Node.js boundary** (`dependency-analyzer.cjs` and CLI scripts).
   - Salesforce manages project data, access control, payload chunking/persistence (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`), UI components (`daAppShell`, `daGraphViewer`), and client-side rendering (`daLayoutEngine.js`).

3. **Frozen Wave 1 and Wave 2 Invariants:**
   - All Wave 1/2 architectural safeguards remain frozen and active:
     - `daGraphViewer` `@api recordId` getter/setter lifecycle and generation-token stale-response discarding.
     - **`SELECTION ≠ NAVIGATION` Invariant:** Selecting a graph node or editing an annotation must **NEVER** switch views or mutate active project context.
     - Strict multi-project isolation and user-mode security (`WITH USER_MODE` SOQL / `insert as user` DML).

4. **Per-Feature Dispatch Readiness Decisions:**
   - **`FEAT-DATA-03` (User Preferences Storage):** `READY WITH CONDITIONS` — Authorized in Wave Plan; scaffold exists in `DAUserPreferenceController.cls`; requires concrete JSON schema specification for filter presets before coding dispatch.
   - **`FEAT-INGEST-01` (Ingestion Pipeline Enhancements):** `BLOCKED — SCOPE OR DEPENDENCY GAP` / `NOT AUTHORIZED` — Lacks authoritative feature specification, acceptance criteria, or authorization in the migration roadmap.

5. **Overall Wave 3 Planning Gate Decision:**
   - **`BLOCKED — REQUIREMENTS OR DEPENDENCIES INCOMPLETE`**
   - Implementation dispatch is **NOT** justified until `FEAT-INGEST-01` scope is clarified (or dropped) and `FEAT-DATA-03` filter preset JSON contracts are formally specified by project leadership.

---

## 2. Repository State and Revision

The current repository checkout state was audited prior to analysis:

- **Current Branch:** `jules-1557407182224851631-35f91f36`
- **HEAD Commit Hash:** `bc550b0a26cecfcd0c1404540ddf1e09007ec14e`
- **Working-Tree Status:** Clean (0 uncommitted changes, 0 untracked files).
- **Wave 2 Audit Report Discrepancy Note:** The prompt references `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`. In the current repository checkout, the Wave 2 closure report exists at `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md`, accompanied by individual workstream reports (`WORKSTREAM_A_FINAL_INDEPENDENT_AUDIT_REPORT.md`, `WORKSTREAM_C_FINAL_INDEPENDENT_AUDIT_REPORT.md`, `WORKSTREAM_G_APEX_TEST_AND_VERIFICATION_REPORT.md`). The checkout contains all Wave 2 changes described by those reports.
- **User Changes:** No preexisting user uncommitted changes were present.

---

## 3. Source Documents and Authority Ranking

To determine feature requirements and wave boundaries without inventing specifications, source documents were ranked according to authority:

| Rank | Document | Path | Scope / Authority Level |
|---|---|---|---|
| **1** | **Authoritative Migration Wave Plan** | `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md` | Primary governing roadmap for feature wave assignments (`Wave 0` through `Wave 6`). |
| **2** | **Authoritative Parity Matrix** | `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` | Canonical list of 32 features, source paths, target Apex/LWC artifacts, and statuses. |
| **3** | **Wave 2 Ownership & Dispatch Matrix** | `docs/audits/salesforce-wave2/WAVE_2_FILE_OWNERSHIP_AND_DISPATCH_MATRIX.md` | Governs Workstream file boundaries (Workstreams A through G) and conflict controls. |
| **4** | **Wave 2 Closure & Audit Reports** | `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` | Verifies Wave 2 completion (`PASS`) and records recommendations for Wave 3. |
| **5** | **Full Salesforce Migration Inventories** | `FULL_SALESFORCE_MIGRATION_INVENTORY.md`, `SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.md` | System-wide symbol mapping and legacy-to-Salesforce component cross-references. |

---

## 4. Wave 2 Closure Context

Wave 2 focused on Application Shell, Project Context, and Persistence Services (`FEAT-SHELL-01`, `FEAT-SHELL-02`, `FEAT-SHELL-03`, `FEAT-STATE-02`, `FEAT-DATA-02`).

### Verified Wave 2 Status

- `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` confirms that Workstream A (Shell & Navigation) and Workstream C (Persistence Services) completed all Wave 2 deliverables.
- Independent audit reports (`WORKSTREAM_A_FINAL_INDEPENDENT_AUDIT_REPORT.md`, `WORKSTREAM_C_FINAL_INDEPENDENT_AUDIT_REPORT.md`, `WORKSTREAM_G_APEX_TEST_AND_VERIFICATION_REPORT.md`) awarded `PASS` verdicts.
- All 5 offline test suites run in the current checkout pass 100%:
  - Core POC Suite (`node scratch/salesforce-poc/tests/run-poc-tests.cjs`): **43/43 PASSED**
  - Workstream A Shell Suite (`node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`): **13/13 PASSED**
  - Workstream C Persistence Suite (`node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`): **16/16 PASSED**
  - Exporter / Data Adapter Suite (`node scripts/test-export-explorer.cjs`): **12/12 PASSED**
  - Root CLI Regression Suite (`npm run test:cli`): **16 suites / 360+ assertions PASSED**

---

## 5. Authoritative Wave 3 Feature Scope

### 5.1 `FEAT-DATA-03`: User Preferences Storage

- **Exact Name:** User Preferences Storage (`FEAT-DATA-03`).
- **Documented Purpose:** Persists general user application preferences (default layout algorithm selection, active filter presets, dark/light theme options) across browser sessions and org logins per user and project.
- **Authoritative Evidence:**
  - `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md:61`: Listed under Wave 3 ("Core Analytical Views & SLDS Panels").
  - `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv:33`: Status `SCAFFOLD_ONLY`, assigned to Wave 3, Workstream C.
  - `FULL_SALESFORCE_MIGRATION_INVENTORY.md:96`: Mapped from `explorer/src/lib/preferences.ts` to `DA_User_Preference__c` Custom Object & Apex Service.
- **User-Visible Outcome:** User preferences (layout mode selection, active filter presets) automatically restore when opening the workspace or switching projects.
- **Inputs & Outputs:**
  - *Inputs:* `projectId` (String), `viewMode` (String), `layoutMode` (String), `positionsJson` (String JSON), `filtersJson` (String JSON), `zoomPanJson` (String JSON).
  - *Outputs:* `DA_User_Preference__c` Apex SObject record or DTO.
- **Existing Implementation Reused:**
  - `DA_User_Preference__c` object schema (`scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/`).
  - `DAUserPreferenceController.cls` (`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`), built in Wave 2 for `FEAT-STATE-02` (ViewState / Coordinates).
- **Distinction from `FEAT-STATE-02`:**
  - As clarified in `WAVE_2_FINAL_SCOPE_RECONCILIATION_REPORT.md:86-90`, `FEAT-STATE-02` (Wave 2) covers custom node coordinates and Cytoscape zoom/pan state per user and project ID.
  - `FEAT-DATA-03` (Wave 3) covers general application preferences (default layout algorithm selection, active filter presets).
- **Upstream & Downstream Dependencies:** Upstream: `FEAT-APEX-01` (Project Authorization). Downstream: `daAppShell` / LWC preference loading hooks.
- **Acceptance Criteria:**
  1. Default layout algorithm selection and filter preset choices persist per user.
  2. Multi-user and multi-project scoping is strictly enforced via `Preference_Key__c` (`userId:projectId`).
  3. Payload validation enforces length caps (131,072 chars) and JSON syntax checks on `filtersJson`.
- **Exclusions:** Live org DML / SOQL testing (deferred pending Salesforce environment).
- **Workstream Ownership:** Workstream C (Apex/Schema) and Workstream A/D (LWC integration).
- **Authorization Status:** **AUTHORIZED FOR WAVE 3**.

---

### 5.2 `FEAT-INGEST-01`: Ingestion Pipeline Enhancements

- **Exact Name:** Ingestion Pipeline Enhancements (`FEAT-INGEST-01`).
- **Documented Purpose:** Mentioned in `WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md:135` as a potential Wave 3 candidate title.
- **Authoritative Evidence:**
  - **MISSING from `AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`.**
  - **MISSING from `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`.**
  - **MISSING from `FULL_MIGRATION_PARITY_MATRIX.csv`.**
  - **MISSING from `FULL_SALESFORCE_MIGRATION_INVENTORY.md`.**
- **Existing Ingestion Implementation Baseline:**
  - Ingestion was fully designed, implemented, and verified in Wave 1 via:
    - `FEAT-ANALYSIS-01` (Node.js AST Parsing boundary)
    - `FEAT-ANALYSIS-02` (Canonical Graph Adapter)
    - `FEAT-APEX-01` (Authorization)
    - `FEAT-APEX-02` (Unicode-safe payload chunking)
    - `FEAT-APEX-03` (Idempotent Graph Ingestion via `DAGraphIngestionService.cls`)
  - `DAGraphIngestionService.cls` (`scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`) already handles `createProject`, `createAnalysisRun`, and `saveGraphChunks` with bounded batch limits (10 chunks/call, 128KB chunk limit, 10MB overall payload limit) and user-mode DML (`insert as user`, `update as user`).
- **Scope Gap & Lack of Authorization:**
  - No specification, functional changes, field modifications, API contracts, or acceptance criteria exist in the repository for `FEAT-INGEST-01`.
  - Inferring requirements solely from the title is prohibited by mandatory boundary 2.1 ("Do not silently invent requirements").
- **Authorization Status:** **NOT AUTHORIZED / SCOPE GAP**.

---

## 6. Existing Ingestion Architecture and Data Flow

The end-to-end ingestion and graph-generation pipeline operates across a strict architectural boundary:

```
+-------------------------------------------------------------------------------+
|                        EXTERNAL NODE.JS BOUNDARY                              |
|                                                                               |
|  [ Source Projects / AST ] ---> [ dependency-analyzer.cjs ]                   |
|                                         |                                     |
|                                         v                                     |
|                               [ test-export-explorer.cjs ]                    |
|                                         |                                     |
|                                         v                                     |
|                               [ Graph JSON Payload ]                          |
+-------------------------------------------------------------------------------+
                                          |
                                          | REST / Apex Ingestion Boundary
                                          v
+-------------------------------------------------------------------------------+
|                       SALESFORCE APEX & PERSISTENCE                           |
|                                                                               |
|  DAGraphIngestionService.cls <--- [ Bounded Chunks (128 KB, Max 10/Batch) ]   |
|         |                                                                     |
|         +---> DA_Project__c                                                   |
|         +---> DA_Analysis_Run__c                                              |
|         +---> DA_Graph_Chunk__c (Payload_Data__c)                             |
|                                                                               |
|  DAGraphController.cls / DAGraphChunkService.cls                              |
|         |                                                                     |
|         v                                                                     |
|  daGraphPayloadLoader.js (LWC Reassembly & Schema Validation)                 |
+-------------------------------------------------------------------------------+
                                          |
                                          v
+-------------------------------------------------------------------------------+
|                       LIGHTNING EXPERIENCE UI / LWC                           |
|                                                                               |
|  daGraphViewer LWC ---> daLayoutEngine.js ---> Cytoscape Canvas                |
+-------------------------------------------------------------------------------+
```

### Architectural Principles & Frozen Constraints

1. **Node.js External Boundary:** Filesystem parsing, AST traversal, component dependency extraction, and initial JSON payload generation **must remain in Node.js**. Apex does not perform filesystem parsing or AST extraction.
2. **Chunking & Batching Limits:**
   - Maximum Chunk Size: `131,072` chars (128 KB) per `DA_Graph_Chunk__c.Payload_Data__c` record (`DAGraphIngestionService.cls:6`).
   - Maximum Batch Limit: `10` chunks per `saveGraphChunks` call (`DAGraphIngestionService.cls:7`).
   - Overall Payload Cap: `10,485,760` chars (10 MB) (`DAGraphIngestionService.cls:8`).
3. **Idempotency & Isolation:** `saveGraphChunks` uses `DA_Analysis_Run__c` and `Chunk_Index__c` matching for idempotent updates and enforces `DA_Project__c` scoping.
4. **Security Enforcement:** All Apex SOQL queries use `WITH USER_MODE`, and all Apex DML operations use `insert as user` / `update as user`.

---

## 7. Feature Dependencies and Ownership Matrix

To prevent concurrent workstream collisions during implementation, file ownership boundaries are strictly partitioned:

| Feature ID | Workstream | Assigned Artifacts | Prohibited Artifacts | Upstream Dependencies | Downstream Dependencies |
|---|---|---|---|---|---|
| `FEAT-DATA-03` | **Workstream C** (Apex/Schema) <br> **Workstream A/D** (UI) | `DAUserPreferenceController.cls`, `DA_User_Preference__c/fields/`, `daAppShell` preference wiring | `DAGraphIngestionService.cls`, Cytoscape core engine | `FEAT-APEX-01`, `DA_User_Preference__c` | LWC Viewers & Panels |
| `FEAT-INGEST-01` | **UNASSIGNED** (Scope Gap) | None (Unspecified) | Production source files | None (Unspecified) | None (Unspecified) |

---

## 8. Proposed Phased Implementation Plan

Should Wave 3 receive dispatch authorization after scope gaps are resolved, implementation must proceed in 3 narrow, independently verifiable phases:

### Phase 3A: Preference Schema & Apex Controller Enhancement (`FEAT-DATA-03`)
- **Objective:** Finalize general user preference persistence methods and validation in `DAUserPreferenceController.cls`.
- **Feature ID:** `FEAT-DATA-03`.
- **Prerequisites:** Approved filter preset JSON schema specification.
- **Implementation Tasks:**
  - Ensure `DAUserPreferenceController.saveUserPreference` and `getUserPreference` support filter preset JSON structure and layout mode defaults.
  - Verify length validation (128 KB) and JSON deserialization checks.
- **Affected Files:** `DAUserPreferenceController.cls`, `DAUserPreferenceControllerTest.cls`.
- **Offline Verification:** Unit tests in `run-workstream-c-tests.cjs` verifying filter options storage, user isolation, and malformed JSON rejection.

### Phase 3B: LWC App Shell & Viewer Preference Integration (`FEAT-DATA-03`)
- **Objective:** Wire general preference loading and saving into `daAppShell` and viewerLWCs.
- **Feature ID:** `FEAT-DATA-03`.
- **Prerequisites:** Phase 3A complete.
- **Implementation Tasks:**
  - Wire safe asynchronous `getUserPreference` invocation on project selection.
  - Apply active filter presets and default layout mode dynamically without breaking graph rendering or triggering navigation.
- **Affected Files:** `daAppShell.js`, `daGraphViewer.js`.
- **Offline Verification:** Workstream A LWC tests in `run-workstream-a-tests.cjs`.

### Phase 3C: Wave 3 Scope Resolution / Ingestion Review (`FEAT-INGEST-01`)
- **Objective:** Clarify or formally archive `FEAT-INGEST-01`.
- **Feature ID:** `FEAT-INGEST-01`.
- **Prerequisites:** Authoritative specification provided by project leadership.
- **Implementation Tasks:** None until specification is authored.

---

## 9. Acceptance Criteria and Verification Matrix

| Feature ID | Requirement Source | Planned Phase | Component Ownership | Acceptance Criterion | Offline Test Method | Required Regression Coverage | Status |
|---|---|---|---|---|---|---|---|
| `FEAT-DATA-03` | `AUTHORITATIVE_MIGRATION_WAVE_PLAN.md:61` | Phase 3A / 3B | Workstream C / Workstream A | User layout mode and filter options persist per user and project ID across sessions. | `run-workstream-c-tests.cjs` (Category 1) | Category 1 & 3 persistence tests | `PROPOSED` (Needs filter JSON schema spec) |
| `FEAT-DATA-03` | `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv:33` | Phase 3A | Workstream C | `saveUserPreference` rejects malformed JSON and payloads exceeding 131,072 chars. | `run-workstream-c-tests.cjs` (Tests 5 & 6) | Malformed & oversized payload tests | `PROPOSED` |
| `FEAT-DATA-03` | `WAVE_2_FINAL_SCOPE_RECONCILIATION_REPORT.md:88` | Phase 3B | Workstream A | Loading/saving preferences does NOT alter active project or switch views (`SELECTION ≠ NAVIGATION`). | `run-workstream-a-tests.cjs` (Test 10) | Selection invariant tests | `PROPOSED` |
| `FEAT-INGEST-01` | `WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md:135` | Phase 3C | Unassigned | Undefined requirement (Missing Specification). | None | None | `BLOCKED — SCOPE GAP` |

---

## 10. Offline Test Strategy

All offline verification during Wave 3 planning and eventual implementation relies strictly on existing Node.js test runners without Salesforce org deployment:

1. **Apex & Persistence Contract Verification:**
   - Executed via `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`.
   - Validates `DAUserPreferenceController` and `DAAnnotationController` logic, payload size limits, JSON syntax validation, and project switch isolation offline.
2. **Core Ingestion & Graph Loader Verification:**
   - Executed via `node scratch/salesforce-poc/tests/run-poc-tests.cjs`.
   - Validates chunking, reassembly, surrogate-pair UTF-16 safety, bounded pagination, and `DAGraphIngestionService` contract invariants across 43 tests.
3. **App Shell & Viewer Invariant Verification:**
   - Executed via `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`.
   - Validates view switching, project selector state, tab index accessibility, and the `SELECTION ≠ NAVIGATION` invariant across 13 tests.
4. **Canonical Data Adapter Validation:**
   - Executed via `node scripts/test-export-explorer.cjs`.
   - Validates 12 graph data structure invariants and graph equivalence across exported payloads.
5. **Root CLI Static Analysis & Architecture Audit:**
   - Executed via `npm run test:cli`.
   - Validates 16 CLI test suites and 360+ assertions.

---

## 11. Deferred Salesforce Environment Validation

The following checks cannot be executed in the offline sandbox and remain **POSTPONED** until an authorized Salesforce scratch org or sandbox is provided:

- Live Apex compilation and org deployment via SFDX / Salesforce CLI (`sf project deploy start`).
- Live Lightning Experience rendering and SLDS tab CSS layout rendering.
- Live SOQL query execution under `WITH USER_MODE` in an active Salesforce database.
- Live DML operations (`insert as user`, `upsert as user`) verifying Field-Level Security (FLS) and Object-Level Security (CRUD) under restricted user profiles.
- Live Lightning Web Security (LWS) runtime sandbox isolation checks.
- Live Apex governor limit profiling (CPU time, heap size, synchronous DML limits) during large payload ingestion.

**Deferral Statement:** Deferring live org checks is compliant with project directives and does not block offline planning, but no live org readiness is claimed.

---

## 12. Risks and Unresolved Decisions Register

| Risk / Decision ID | Description | Severity | Impact | Affected Feature | Proposed Mitigation | Dispatch Blocker? | Responsible Workstream |
|---|---|---|---|---|---|---|---|
| **RISK-W3-01** | **`FEAT-INGEST-01` Missing Specification:** `FEAT-INGEST-01` is referenced in the Wave 2 closure summary but lacks an entry in the authoritative wave plan, parity matrix, or spec docs. | High | Scope ambiguity; risk of unauthorized implementation or reinventing Wave 1 ingestion. | `FEAT-INGEST-01` | Record as scope gap. Require formal specification or archive the feature before dispatch. | **YES** | Project Leadership / Workstream B |
| **RISK-W3-02** | **`FEAT-DATA-03` Filter Preset Schema Undefined:** Exact JSON key structure for active filter presets in `Filters_JSON__c` is not defined in documentation. | Medium | Potential schema mismatch between LWC filter panel and Apex controller. | `FEAT-DATA-03` | Define explicit TypeScript interface / JSON schema for filter presets during Phase 3A planning. | **YES (For Phase 3A)** | Workstream C / Workstream A |
| **RISK-W3-03** | **Governor Limit Exposure on Large Preferences:** Unbounded preference payloads could exceed `DA_User_Preference__c.Filters_JSON__c` LongTextArea field limits. | Low | DML exception during preference save. | `FEAT-DATA-03` | Existing `DAUserPreferenceController.cls:67` enforces 131,072 character limit and JSON syntax validation. | NO | Workstream C |
| **RISK-W3-04** | **Cross-Project Preference Bleed:** Unscoped preferences could leak filter settings from project A into project B. | High | Multi-project isolation violation. | `FEAT-DATA-03` | Enforce strict `Preference_Key__c` (`userId:projectId`) compound key queries and isolation tests. | NO | Workstream C |

---

## 13. Wave 1 / Wave 2 Regression Safeguards

Wave 3 planning and future implementation must strictly uphold the following non-negotiable architectural invariants:

1. **`daGraphViewer` `@api recordId` Contract:** The getter/setter pattern in `daGraphViewer.js` must immediately trigger graph re-fetch and increment generation tokens to discard stale in-flight requests on project switch.
2. **`SELECTION ≠ NAVIGATION` Invariant:**
   - Graph node selection, annotation creation/editing, or preference panel toggling must **NEVER** trigger view navigation or mutate active project context.
   - Verified via `run-poc-tests.cjs` (Category 6/7) and `run-workstream-a-tests.cjs` (Test 10).
3. **Cytoscape Engine Lifecycle & Teardown:** Canvas instances must be destroyed (`cy.destroy()`) on unmount or project switch to prevent DOM memory leaks.
4. **Workstream Shell & Context Propagation:** `daAppShell` retains top-level active project key and routes active view (`Graph`, `Matrix`, `Findings`) without losing context.
5. **Server-Side Security Enforcement:** All SOQL queries must specify `WITH USER_MODE`, and all DML operations must execute via `insert as user` or `upsert as user`.

---

## 14. Per-Feature Dispatch Readiness Decisions

### Feature 1: `FEAT-DATA-03` (User Preferences Storage)
- **Verdict:** `READY WITH CONDITIONS`
- **Justification:** `FEAT-DATA-03` is authorized in the primary Wave Plan (`AUTHORITATIVE_MIGRATION_WAVE_PLAN.md:61`), scaffolded in Apex (`DAUserPreferenceController.cls`), and backed by custom object metadata (`DA_User_Preference__c`).
- **Conditions for Implementation Dispatch:**
  1. Author and approve a formal JSON schema specification for active filter presets stored in `Filters_JSON__c`.
  2. Confirm LWC shell integration contract for loading preferences upon project selection.

### Feature 2: `FEAT-INGEST-01` (Ingestion Pipeline Enhancements)
- **Verdict:** `BLOCKED — SCOPE OR DEPENDENCY GAP` / `NOT AUTHORIZED`
- **Justification:** `FEAT-INGEST-01` is **NOT** present in the Authoritative Wave Plan or Parity Matrix. Core ingestion was completed and frozen in Wave 1 (`DAGraphIngestionService.cls`). No authoritative specification or acceptance criteria exist in the codebase.

---

## 15. Overall Wave 3 Planning Gate Decision

### Planning Gate Verdict

# **`BLOCKED — REQUIREMENTS OR DEPENDENCIES INCOMPLETE`**

### Summary Decision Rationale

Implementation dispatch for Wave 3 is **BLOCKED** and **NOT AUTHORIZED** at this time.

While Wave 2 is successfully closed and `FEAT-DATA-03` is partially scaffolded, `FEAT-INGEST-01` lacks authoritative feature specifications, schema contracts, and wave plan authorization. Furthermore, `FEAT-DATA-03` requires an approved filter preset JSON schema before coding dispatch.

Proceeding with implementation dispatch under these conditions would violate mandatory boundary rules prohibiting the silent invention of feature requirements.

---

## 16. Recommended Next Action

The single recommended next action is:

> **Submit this Wave 3 Planning and Readiness Report to project leadership to resolve the scope gap for `FEAT-INGEST-01` (confirming whether it is to be formally specified or archived) and approve the filter preset JSON schema specification for `FEAT-DATA-03` prior to authorizing Wave 3 implementation dispatch.**

---
*Report prepared by Jules (Software Engineering Agent) following repository evidence inspection and offline test suite verification.*

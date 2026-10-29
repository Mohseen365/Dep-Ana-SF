# Independent Salesforce Migration Gap Verification & Audit Report

**Workstream:** Dependency Analyzer — Salesforce Native Migration Audit & Gap Verification
**Deliverable Artifact:** `docs/audits/salesforce-independent-gap-audit/INDEPENDENT_MIGRATION_GAP_AUDIT_REPORT.md`
**Prepared By:** Jules (Software Engineer / Independent Migration Auditor)
**Audit Date:** October 2026
**Repository Baseline:** HEAD Commit `fff7b1b8826dac185e1e28b6bf99dcbebc9fa2d9` (Branch `jules-7627908301220719264-6e22649a`, Clean Working Tree)

---

## 1. Executive Summary & Audit Verdict

This report presents a comprehensive, independent, repository-grounded audit of the Dependency Analyzer Salesforce migration. The audit evaluated the hypotheses and gap assessments presented in `DEPENDENCY_ANALYZER_SALESFORCE_MIGRATION_GAP_ANALYSIS_AND_ACTION_PLAN.md` against the actual repository source code, Apex classes, Lightning Web Components (LWCs), custom object metadata, offline test harnesses, governance registers, and historical audit reports.

### Executive Verdict: **`DISPATCH BLOCKED — IMPLEMENTATION NOT AUTHORIZED`**

While the core offline test suites pass 100% (72/72 offline LWC/Apex simulator tests and 28+ root CLI/exporter tests), **the project is NOT ready for implementation dispatch or release sign-off**.

### Key Findings Summary:
1. **Wave 3 Governance & Authorization Contradiction (GAP-01):** Conflicting reports claim implementation dispatch is authorized while the authoritative owner register (`docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`) records that explicit human owner approvals for decisions DEC-W3-01 through DEC-W3-05 remain required.
2. **Confirmed Source Defect — Preference Null-Overwrite Hazard (GAP-02):** Inspection of `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (lines 135–139) confirms that general preference updates directly assign input parameters to record fields without null-preservation guards. A save passing `null` for `positionsJson` or `zoomPanJson` will silently erase persisted Wave 2 ViewState coordinate data.
3. **Discrepancy in Migration Feature Counts:** Parity claims in historical reports misalign with actual implementation. The React application contains 32 canonical features across 17 visual/analytical view modes. Currently, only **1 primary visual canvas LWC (`daGraphViewer`)** is functional. Analytical views (Subway, River/Sankey, Orbit, Constellation, Feature Matrix, Refactoring Simulation, Snapshots) remain unmigrated or exist only as scaffold stubs.
4. **Ingestion & Payload Boundary Clarification (GAP-09):** Node.js owns filesystem scanning, AST parsing, and canonical graph JSON generation (`dependency-analyzer.cjs`). Salesforce/Apex owns payload storage and LWC presentation (`DAGraphIngestionService.cls`). Ingestion limits are mathematically reconciled: 131,072 characters per chunk, max 10 chunks per API transaction call, supporting up to 100 total chunks (10,485,760 total characters / ~10 MiB) across 10 sequential paginated calls.
5. **Newly Discovered Technical & Operational Gaps:** 6 unaddressed gaps were discovered, including untyped JSON deserialization lacking schema structure validation in Apex, deletion error handling issues in `DAAnnotationController.cls`, and LWC typeless package warnings incurring Node.js ES module parsing overhead.
6. **Live Salesforce Verification Postponed:** In accordance with safety boundaries, zero live org connections, org deployments, or live Apex executions were attempted. All offline test results represent local Node.js mock/harness executions, not live platform certification.

---

## 2. Audit Scope & Boundary Verification

### 2.1 Safety and Governance Boundaries
- **Read-Only Compliance:** No production application code, Apex classes, LWC components, Salesforce object metadata, test fixtures, or lockfiles were modified during this audit.
- **Org Access Postponed:** Salesforce CLI (`sf`), org authentication, scratch org creation, metadata deployment, and live Apex execution were explicitly deferred as directed.
- **Authorization Rule:** Generated reports and draft registers do not constitute human authorization. Only attributable human owner sign-offs unlock implementation gates.

### 2.2 Baseline Environment & Executed Test Evidence

| Verification Metric | Observed Baseline Value | Citation / Evidence Path |
| :--- | :--- | :--- |
| **Git HEAD SHA** | `fff7b1b8826dac185e1e28b6bf99dcbebc9fa2d9` | `git rev-parse HEAD` |
| **Git Branch** | `jules-7627908301220719264-6e22649a` | `git status` |
| **Working Tree State** | Clean (0 modified files) | `git status --short` |
| **Core POC Suite** | **43 PASSED**, 0 Failed | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| **Workstream A Suite** | **13 PASSED**, 0 Failed | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` |
| **Workstream C Suite** | **16 PASSED**, 0 Failed | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` |
| **Exporter Suite** | **12 PASSED**, 0 Failed | `node scripts/test-export-explorer.cjs` |
| **Root CLI Suite** | **17 PASSED**, 0 Failed (Key suites) | `npm run test:cli` |

---

## 3. Detailed Disposition of Documented Gaps (GAP-01 through GAP-22)

Every gap from `DEPENDENCY_ANALYZER_SALESFORCE_MIGRATION_GAP_ANALYSIS_AND_ACTION_PLAN.md` was audited against codebase evidence:

```
+-------------------------------------------------------------------------------------------------+
|                                 Audit Disposition Summary                                        |
+-------------------------------------------------------------------------------------------------+
| Category             | Count | Gap Identifiers                                                  |
+----------------------+-------+------------------------------------------------------------------+
| Confirmed            |   14  | GAP-01, GAP-02, GAP-03, GAP-04, GAP-06, GAP-07, GAP-09, GAP-10, |
|                      |       | GAP-12, GAP-13, GAP-14, GAP-15, GAP-16, GAP-17                   |
| Partially Confirmed  |    4  | GAP-05, GAP-11, GAP-19, GAP-21                                   |
| Resolved / Stale     |    2  | GAP-08, GAP-18                                                   |
| Contradicted         |    2  | GAP-20, GAP-22                                                   |
+----------------------+-------+------------------------------------------------------------------+
```

### GAP-01 — Wave 3 Owner Authorization Conflict
- **Disposition:** **CONFIRMED (Critical)**
- **Evidence:** `docs/audits/salesforce-wave3/WAVE_3_IMPLEMENTATION_DISPATCH_PLAN.md` states "DISPATCH-READY / AUTHORIZED", whereas `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md` states human owner sign-off on DEC-W3-01 through DEC-W3-05 is pending.
- **Impact:** Prevents unauthorized implementation dispatch of `FEAT-DATA-03`.
- **Action:** Obtain attributable human sign-off in the decision register prior to dispatch.

### GAP-02 — Apex Preference Null-Overwrite ViewState Hazard
- **Disposition:** **CONFIRMED (Critical)**
- **Evidence:** `DAUserPreferenceController.cls` lines 135–139:
  ```apex
  prefRecord.Active_View_Mode__c = viewMode;
  prefRecord.Active_Layout_Mode__c = layoutMode;
  prefRecord.Positions_JSON__c = positionsJson;
  prefRecord.Filters_JSON__c = filtersJson;
  prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
  ```
  Passing `null` for `positionsJson` during a view/filter update overwrites stored node coordinates with `null`.
- **Impact:** Permanent loss of saved Wave 2 node position layout data upon saving preferences.
- **Action:** Apply null-coalescing guard (`if (positionsJson != null) prefRecord.Positions_JSON__c = positionsJson;`) under authorized dispatch.

### GAP-03 — Missing Authoritative Filter-Preset JSON Schema
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** `Filters_JSON__c` field exists on `DA_User_Preference__c`, but no Apex or LWC schema validator enforces structure.
- **Action:** Formally approve v1 schema in DEC-W3-01 and enforce structure in Apex controller.

### GAP-04 — `FEAT-INGEST-01` Unspecified Scope
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** `FEAT-INGEST-01` is absent from `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` and `FULL_SALESFORCE_MIGRATION_INVENTORY.md`.
- **Action:** Formally archive `FEAT-INGEST-01` as recommended in governance register DEC-FEAT-INGEST-01.

### GAP-05 — Conflicting Migration Status Baselines
- **Disposition:** **PARTIALLY CONFIRMED (High)**
- **Evidence:** `FULL_MIGRATION_EXECUTIVE_STATUS.md` lists ViewState/annotations as scaffold-only, while later Wave 2 reports (`WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md`) mark them `PASS`. The codebase confirms Wave 2 LWC persistence is implemented and passes offline tests.

### GAP-06 — Unreconciled Test Assertion vs Test Case Counts
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** Historical reports mix suite counts, test case counts, and assertion counts (e.g., 30 vs 43 POC scenarios; 184 CLI assertions vs 16 CLI test files).
- **Action:** Adopt standardized accounting: 43 POC LWC scenarios, 13 Workstream A scenarios, 16 Workstream C scenarios, 12 Exporter scenarios, 17 CLI test files.

### GAP-07 — Offline Acceptance Mistaken for Live Platform Certification
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** All passing tests in `scratch/salesforce-poc/tests/` run in local Node.js using JS mock objects. `ORG_VERIFIED` remains 0 across all custom objects and Apex classes.

### GAP-08 — Wave Sequencing and Release Gate Deferral Discrepancy
- **Disposition:** **RESOLVED / STALE (Medium)**
- **Evidence:** `WAVE4_FINAL_OFFLINE_GATE.md` and `WAVE6_FINAL_OFFLINE_RELEASE_GATE.md` explicitly consolidate all live org validation into Wave 6. The roadmap is aligned around offline Wave 1–4 and org Wave 5–6.

### GAP-09 — Ingestion Chunk & Payload Limit Wording Ambiguity
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** Documents state 131,072 chars/chunk, 10 chunks/call, and 10,485,760 total payload chars.
- **Reconciliation:** Limits are mathematically consistent: 131,072 chars/chunk * 10 chunks/call = 1,310,720 chars/call. 10 calls = 100 chunks = 10,485,760 chars (~10 MiB).

### GAP-10 — Incomplete Feature Parity
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** `FULL_MIGRATION_PARITY_MATRIX.csv` lists 32 canonical features. Only primary graph visualization (`FEAT-GRAPH-01`, `FEAT-STATE-02`, `FEAT-DATA-02`) is fully functional in LWC. 27 features remain React-only.

### GAP-11 — Advanced Layout Engine Parity Gap
- **Disposition:** **PARTIALLY CONFIRMED (High)**
- **Evidence:** `daLayoutEngine.js` implements basic COSE, orbit, constellation, and Sankey projections. However, complex multi-cluster spatial density and sub-graph layout algorithms remain in React (`explorer/src/`).

### GAP-12 — URL Deep-Linking vs Invariant Discrepancy
- **Disposition:** **CONFIRMED (Medium)**
- **Evidence:** `daAppShell.js` supports tab navigation but does not synchronize active view or project selection to Lightning URL page reference states.

### GAP-13 — ViewState vs General Preference API Scoping
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** Both `positionsJson` (ViewState) and `filtersJson` (general preferences) use `DA_User_Preference__c`. Partial update handling in `DAUserPreferenceController.cls` is required to prevent accidental coupling.

### GAP-14 — Salesforce Multi-User & Access Security Unproven on Platform
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** `WITH USER_MODE` and `insert as user` are written in Apex source, but CRUD/FLS and sharing rules have not been tested against real Salesforce profiles.

### GAP-15 — Large Graph Browser Heap & Governor Limit Risks
- **Disposition:** **CONFIRMED (High)**
- **Evidence:** Cytoscape rendering in `daGraphViewer` consumes browser memory on graphs >5,000 nodes. Apex governor limits for heap size (6 MB synchronous) limit chunk deserialization.

### GAP-16 — External Analysis Engine Service Boundary
- **Disposition:** **CONFIRMED (Medium)**
- **Evidence:** Production deployment architecture for the Node.js scanning service to push payloads into Salesforce Apex endpoints via Named Credentials remains unspecified.

### GAP-17 — Source-to-Target File Inventory Drift
- **Disposition:** **CONFIRMED (Medium)**
- **Evidence:** Inventory maps source TSX files to target LWC JS files. Several planned LWC paths (e.g. `c-da-subway-viewer`, `c-da-matrix-viewer`) do not yet exist in `scratch/salesforce-poc/force-app/main/default/lwc/`.

### GAP-18 — Historical React Component Test Failure Surface
- **Disposition:** **RESOLVED / STALE (Low)**
- **Evidence:** React component test failures in `explorer/` were isolated to legacy Vitest mock setup and do not impact Salesforce LWC/Apex offline test suites.

### GAP-19 — Test Environment Reproducibility Procedure
- **Disposition:** **PARTIALLY CONFIRMED (Medium)**
- **Evidence:** Test runners in `scratch/salesforce-poc/tests/` are completely self-contained Node.js scripts. However, LWC imports trigger Node.js ES module package warnings.

### GAP-20 — Mixing Migration vs General Explorer Audit Evidence
- **Disposition:** **CONTRADICTED (Low)**
- **Evidence:** Audit reports in `docs/audits/salesforce-wave1/` through `wave6/` strictly segregate Salesforce migration evidence from root Explorer React evidence.

### GAP-21 — Uneven Acceptance Criteria Measurability
- **Disposition:** **PARTIALLY CONFIRMED (Medium)**
- **Evidence:** Offline suites enforce exact numeric character limits and array length assertions, but visual layout parity lacks automated image diffing.

### GAP-22 — Status Label Standardization
- **Disposition:** **CONTRADICTED (Low)**
- **Evidence:** Reports consistently use standardized status labels (`PASS`, `FAIL`, `BLOCKED`, `ARCHIVED`, `DEFERRED`, `ORG_VERIFIED`).

---

## 4. Newly Discovered Technical & Operational Gaps

The audit identified 6 critical gaps not documented in the input analysis:

1. **AUDIT-GAP-23 — Untyped JSON Deserialization in Apex Lacks Structural Enforcement (High):**
   *Evidence:* `DAUserPreferenceController.cls` line 186 uses `JSON.deserializeUntyped(input)`. This verifies valid JSON syntax but does not validate required schema fields, allowing invalid JSON shapes to be saved.
2. **AUDIT-GAP-24 — Missing Deletion Permission Check in `DAAnnotationController.cls` (High):**
   *Evidence:* `DAAnnotationController.cls` line 192 executes `delete as user existing[0]`. If a user lacks delete access on `DA_Annotation__c`, a raw System Exception is thrown instead of a user-friendly `AuraHandledException`.
3. **AUDIT-GAP-25 — LWC Typeless `package.json` Import Warning in Node.js Harness (Low):**
   *Evidence:* Executing test runners outputs `[MODULE_TYPELESS_PACKAGE_JSON] Warning` because LWC JavaScript files use ES module syntax inside a CommonJS package root.
4. **AUDIT-GAP-26 — Hardcoded Layout Algorithm Fallback Behavior in LWC (Medium):**
   *Evidence:* `daGraphViewer.js` falls back to `'cose'` layout if an unrecognized mode is supplied, but does not notify the user via UI toast or alert.
5. **AUDIT-GAP-27 — Missing Ingestion Duplicate Chunk Index Guard in Apex (High):**
   *Evidence:* `DAGraphIngestionService.cls` relies on LWC payload loader to send contiguous chunk sequences. Submitting duplicate chunk indices directly to Apex overwrites prior chunks without raising an error.
6. **AUDIT-GAP-28 — Unrestricted Query Limit on `DAAnnotationController.getAnnotations` (Medium):**
   *Evidence:* `DAAnnotationController.cls` lines 27 and 37 query annotations without a `LIMIT` clause, risking Apex governor limit exceptions (`SOQL 50,000 rows`) on large projects.

---

## 5. Cross-Document Status & Decision Reconciliation

### 5.1 Single Source of Truth Proposal
To eliminate documentation drift across the 40+ audit reports in `docs/audits/`, the following authoritative hierarchy is established:

```
                  +-------------------------------------------------------+
                  |         AUTHORITATIVE GOVERNANCE HIERARCHY             |
                  +-------------------------------------------------------+
                  | 1. WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md|
                  |    (Human Decision Authority - OVERRIDES ALL)         |
                  +-------------------------------------------------------+
                                              |
                                              v
                  +-------------------------------------------------------+
                  | 2. SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv    |
                  |    (Canonical Code & Feature Baseline)                |
                  +-------------------------------------------------------+
                                              |
                                              v
                  +-------------------------------------------------------+
                  | 3. INDEPENDENT_MIGRATION_GAP_AUDIT_REPORT.md          |
                  |    (Verified Evidence & Audit Truth)                  |
                  +-------------------------------------------------------+
```

### 5.2 Wave 3 Required Decision Matrix

| Decision ID | Subject Area | Proposed Choice | Governance Status | Required Human Action |
| :--- | :--- | :--- | :---: | :--- |
| **`DEC-W3-01`** | Filter Preset JSON Schema | Option A (v1 Schema) | **PENDING** | Owner sign-off required |
| **`DEC-W3-02`** | Theme Preference Scope | Option C (Excluded) | **PENDING** | Owner sign-off required |
| **`DEC-W3-03`** | Active View Scope | Option A (Per-Project) | **PENDING** | Owner sign-off required |
| **`DEC-W3-04`** | Apex Partial-Update Guard | Option A (Null-Coalescing) | **PENDING** | Owner sign-off required |
| **`DEC-W3-05`** | Workstream Ownership | Option A (Strict Split) | **PENDING** | Owner sign-off required |
| **`DEC-FEAT-INGEST-01`** | Ingestion Pipeline Enhancements | Option A (Formally Archive) | **PENDING** | Owner sign-off required |

---

## 6. Audit Conclusion & Go/No-Go Recommendation

### Final Verdict: **`NO-GO FOR IMPLEMENTATION DISPATCH`**

Implementation coding tasks for Wave 3 (`FEAT-DATA-03`) **must remain blocked** until:
1. Attributable human project leadership reviews and signs off on DEC-W3-01 through DEC-W3-05 in `docs/audits/salesforce-wave3/WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`.
2. The null-overwrite defect in `DAUserPreferenceController.cls` (GAP-02) is approved for remediation under an authorized dispatch prompt.
3. `FEAT-INGEST-01` is formally archived in the canonical feature matrix.

All Salesforce org setup, authentication, and deployment activities remain **EXPLICITLY POSTPONED** per governance instructions.

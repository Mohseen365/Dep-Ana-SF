# Wave 4 (`FEAT-STATE-03`): Authoritative Parallel File Ownership & Dispatch Plan

| Plan Attribute | Value |
|---|---|
| **Document Type** | Authoritative Single-Owner File Assignment & Parallel Phase 1 Dispatch Plan |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets Persistence & Cross-View Integration |
| **Branch** | `jules-1578065196489108588-6eaa6fb0` |
| **HEAD Commit SHA** | `c65ee072a28344157945c273490a91248be0d884` |
| **Governance Status** | **QUALIFIED — AUTHORIZED FOR PHASE 1 IMPLEMENTATION DISPATCH** |
| **Historical Status Superseded** | Supersedes older `IMPLEMENTATION DISPATCH ON HOLD` from commit `8641e23d02d1f6e1e25762b27c9403c58b346b09` |

---

## 1. Executive Strategy & Reconciliation Summary

This document establishes the authoritative single-owner file assignment, inter-lane dependency sequencing, and integration gates for Wave 4.

### 1.1 Resolution of Integration Coordinator vs Lane C Conflict (Approach A)
The prior draft created an ownership contradiction by assigning `daAppShell.*` to Lane C while designating the Integration Coordinator to integrate Lane A into `daAppShell.*`.

**Authoritative Resolution (Approach A — Explicit Coordinator Integration Ownership):**
1. **Application Shell Ownership:** `daAppShell.js`, `daAppShell.html`, `daAppShell.css`, and `daAppShell.js-meta.xml` are owned **EXCLUSIVELY** by the **Integration Coordinator**.
2. **Lane C Scope Isolation:** Lane C is assigned exclusive ownership of the standalone preset management component:
   - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.html`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.css`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js-meta.xml`
3. **Prohibition of Direct Edits:** Feature lanes (A through F) are strictly prohibited from independently modifying `daAppShell.*`.
4. **Integration Handoff:** In Phase 1, the Coordinator integrates Lane A's schema foundation into `daAppShell`. In Phase 3, the Coordinator mounts Lane C (`daPresetManager`), Lane E (`daMatrixViewer`), and Lane F (`daFindingsViewer`) into `daAppShell`.

---

## 2. Definitive Single-Owner File Assignment Matrix

Every file across Wave 4 is assigned to exactly **ONE** single owner:

| File Path | Phase | Single Owner | Permitted Changes | Dependencies | Handoff Condition |
|---|---|---|---|---|---|
| `scripts/export-explorer.cjs` | Phase 1 | **Remediation R2 Owner** | Coverage normalization (4 canonical states: `COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`; Category B fail closed) | None | Exporter suite passes (`node scripts/test-export-explorer.cjs`) |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` | Phase 1 | **Lane A** | Canonical V2 filter schema, criteria normalization, default preset constants | Approved DEC-W4-01 & DEC-W4-02 | Lane A schema suite passes (`node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs`) |
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | Phase 1 | **Lane A** | Schema validation and filter criteria contract unit tests | Lane A schema module | 100% test pass; exit code 0 |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | Phase 1 | **Lane B** | Apex V1/V2 merge, backward compatibility, 131,072 character payload boundary enforcement (R1, R4) | Approved R1 & R4 contracts | Workstream C test suite passes with R1/R4 assertions |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls-meta.xml` | Phase 1 | **Lane B** | Apex controller metadata (only if needed for API version) | Lane B controller | Locked to API 60.0 |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` | Phase 1 | **Lane B** | Apex unit tests for V1/V2 merge, null vs empty, and 131,072 payload boundary checks | Lane B controller | Validated in offline test harness |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls-meta.xml` | Phase 1 | **Lane B** | Apex test metadata | Lane B test class | Locked to API 60.0 |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Phase 1 | **Lane B** | Test suite expansion verifying R1 V1/V2 merge and R4 131,072-char boundary checks | Lane B Apex files | 100% test pass; exit code 0 |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Phase 1 & 3 | **Integration Coordinator** | Phase 1: Foundation filter state & event wiring. Phase 3: Preset, Matrix, and Findings component integration | Lane A (Phase 1); Lanes C, E, F (Phase 3) | Gate 1 pass (Phase 1); Gate 2 pass (Phase 3) |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | Phase 1 & 3 | **Integration Coordinator** | Phase 1: Filter bar placement. Phase 3: Mount `c-da-preset-manager`, `c-da-matrix-viewer`, `c-da-findings-viewer` | Lane A (Phase 1); Lanes C, E, F (Phase 3) | DOM mount verified in Workstream A suite |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css` | Phase 1 & 3 | **Integration Coordinator** | App shell layout, tab navigation, and filter bar styling | `daAppShell.html` | Visual parity verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js-meta.xml` | Phase 1 & 3 | **Integration Coordinator** | Shell component metadata | None | Unchanged API 60.0 |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Phase 1 & 3 | **Integration Coordinator** | Comprehensive Wave 4 integration test harness | All lanes | 100% pass across baseline + Wave 4 tests |
| `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js` | Phase 2 | **Lane C** | Preset dropdown, modal CRUD dialog, project-scoping (`DEC-W4-03`) | Coordinator Gate 1 pass | Lane C component tests pass |
| `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.html` | Phase 2 | **Lane C** | Preset manager template and SLDS modal markup | Lane C JS | DOM template verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.css` | Phase 2 | **Lane C** | Preset manager styling | Lane C HTML | SLDS styling verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js-meta.xml` | Phase 2 | **Lane C** | Component metadata | None | API 60.0 |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Phase 2 | **Lane D** | Apply active filters to Cytoscape graph nodes and edges (`DEC-W4-02`) | Coordinator Gate 1 pass | Graph filter tests pass; `run-poc-tests.cjs` passes |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html` | Phase 2 | **Lane D** | Graph viewer template | Lane D JS | Graph container markup verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.css` | Phase 2 | **Lane D** | Graph viewer styling | Lane D HTML | Styles verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js-meta.xml` | Phase 2 | **Lane D** | Graph viewer component metadata | None | API 60.0 |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js` | Phase 2 | **Lane E** | Minimal functional Matrix viewer LWC using existing graph payload (`DEC-W4-04`) | Coordinator Gate 1 pass | Matrix interaction count derivation tests pass |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.html` | Phase 2 | **Lane E** | Matrix grid template (SLDS table layout) | Lane E JS | Matrix markup verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.css` | Phase 2 | **Lane E** | Matrix grid styling | Lane E HTML | Grid styling verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js-meta.xml` | Phase 2 | **Lane E** | Component metadata | None | API 60.0 |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js` | Phase 2 | **Lane F** | Minimal functional Findings viewer LWC with Lightning Datatable (`DEC-W4-04`) | Coordinator Gate 1 pass | Findings derivation tests pass |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.html` | Phase 2 | **Lane F** | Findings template with `lightning-datatable` | Lane F JS | Datatable markup verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.css` | Phase 2 | **Lane F** | Findings datatable and badge styling | Lane F HTML | Styling verified |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js-meta.xml` | Phase 2 | **Lane F** | Component metadata | None | API 60.0 |

---

## 3. Phased Implementation Sequence

```
========================================================================================
PHASE 1: PREREQUISITES & SHARED FOUNDATION
========================================================================================
[Workstream R2]               [Lane B: R1/R4]               [Lane A]
- export-explorer.cjs         - DAUserPreferenceController  - daFilterSchema.js
- Coverage Normalization      - V1/V2 Merge & 131K Boundary - Schema Test Runner
       |                             |                             |
       +-----------------------------+-----------------------------+
                                     |
                                     v
                       [Coordinator Integration Gate 1]
                       - daAppShell foundation integration
                       - 224 baseline suites pass 100%
                       - Schema publication verified
========================================================================================
PHASE 2: FEATURE LANES (Dispatched strictly AFTER Gate 1 passes)
========================================================================================
       +--------------------+--------------------+--------------------+
       |                    |                    |                    |
       v                    v                    v                    v
[Lane C: Preset UI]   [Lane D: Graph View]  [Lane E: Matrix]      [Lane F: Findings]
- daPresetManager     - daGraphViewer       - daMatrixViewer      - daFindingsViewer
- Dropdown & CRUD     - Cytoscape filter    - Component counts    - Analytics table
       |                    |                    |                    |
       +--------------------+--------------------+--------------------+
                                     |
                                     v
========================================================================================
PHASE 3: FINAL INTEGRATION & CLOSURE AUDIT
========================================================================================
- Coordinator mounts Lane C, E, F subcomponents into daAppShell
- Full regression execution: 224 baseline tests + Wave 4 integration suites
- Invariant verification (SELECTION != NAVIGATION, project isolation, 131K boundary)
- Final offline closure report
```

---

## 4. Coordinator Integration Gate 1 Acceptance Criteria

Before any Phase 2 lane may be dispatched, Coordinator Integration Gate 1 must verify:
1. **Lane A Publication:** `daFilterSchema.js` is published and `run-lane-a-schema-tests.cjs` passes 100%.
2. **Coordinator Foundation Shell:** `daAppShell.js` and `daAppShell.html` are updated with the shared filter state and pass Workstream A unit tests.
3. **Lane B Acceptance:** `run-workstream-c-tests.cjs` passes with R1 V1/V2 merge compatibility and R4 payload boundary (131,072 chars accepted, 131,073 chars rejected) verified.
4. **R2 Exporter Acceptance:** `scripts/test-export-explorer.cjs` passes with coverage normalization and Category B fail-closed assertions verified.
5. **Baseline Regression:** All 224 baseline test units pass with exit code 0.
6. **Zero Ownership Violations:** No lane worker touched files outside its designated ownership.
7. **Frozen Invariants Intact:** All 12 mandatory frozen invariants are preserved.

---

## 5. Stop Conditions

Phase 1 implementation must stop immediately and notify the Coordinator if:
1. Any baseline test in the 224-test suite fails.
2. A cross-lane file modification is attempted.
3. Any proposal introduces new Salesforce metadata, custom objects, or Apex controllers.
4. The 131,072 character payload boundary is violated or weakened.
5. `SELECTION != NAVIGATION` is breached.

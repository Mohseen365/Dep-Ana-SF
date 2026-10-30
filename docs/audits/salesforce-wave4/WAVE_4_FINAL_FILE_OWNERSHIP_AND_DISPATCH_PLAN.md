# Wave 4 (`FEAT-STATE-03`): Final Parallel File Ownership & Dispatch Plan

| Plan Attribute | Value |
|---|---|
| **Document Type** | File Ownership Matrix & Parallel Lane Dispatch Plan |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-15339927722844779962-f78d27e7` |
| **HEAD Commit SHA** | `8641e23d02d1f6e1e25762b27c9403c58b346b09` |
| **Governance Status** | **DISPATCH PLAN PREPARED — IMPLEMENTATION DISPATCH ON HOLD** |

---

## 1. Executive Strategy & Contract-First Dispatch Sequence

Wave 4 implementation is structured across **six parallel implementation lanes (Lanes A–F)** and one **Integration Coordinator**.

To prevent merge conflicts, boundary leaks, or contract drift:
1. **Contract-First Sequence:** Lane A MUST complete and publish `daFilterSchema.js` (Schema Publication Milestone) before Lanes C, D, E, and F begin consuming canonical criteria.
2. **Strict Single-Lane File Ownership:** Every file in the repository has exactly ONE designated owner.
3. **Integration Coordinator Boundary:** The Integration Coordinator MUST NOT modify any lane-owned files prior to formal integration review.

---

## 2. Definitive Parallel File Ownership Matrix

| Repository Path | File Description | Lane Owner | Operational Role |
|---|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` | Canonical V2 Filter Schema & Validation Module | **Lane A** | Core contract definition, migration, preset validation |
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | Schema Unit Test Runner | **Lane A** | Contract test runner |
| `docs/audits/salesforce-wave4/WAVE_4_CANONICAL_V2_CONTRACT_FINAL_PROPOSAL.md` | Schema Specification | **Lane A** | Documentation |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | Apex Preference Controller | **Lane B** | Persistence, preset CRUD, payload boundary check |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls-meta.xml` | Controller Metadata | **Lane B** | Apex class metadata |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` | Apex Controller Unit Tests | **Lane B** | Apex test coverage |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls-meta.xml` | Apex Test Metadata | **Lane B** | Test metadata |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | App Shell LWC Controller | **Lane C** | Preset UI state, state coordination, view routing |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | App Shell LWC Template | **Lane C** | Preset bar, filter controls integration |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css` | App Shell LWC Styles | **Lane C** | App shell layout styling |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js-meta.xml` | App Shell Metadata | **Lane C** | Component metadata |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Graph Viewer LWC Controller | **Lane D** | Graph filtering, Cytoscape filter application |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html` | Graph Viewer LWC Template | **Lane D** | Graph template |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.css` | Graph Viewer LWC Styles | **Lane D** | Graph styling |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js-meta.xml` | Graph Viewer Metadata | **Lane D** | Component metadata |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js` | Matrix Viewer LWC Controller | **Lane E** | Matrix entity filtering & grid rendering |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.html` | Matrix Viewer LWC Template | **Lane E** | Matrix template |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.css` | Matrix Viewer LWC Styles | **Lane E** | Matrix grid styling |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js-meta.xml` | Matrix Viewer Metadata | **Lane E** | Component metadata |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js` | Findings Viewer LWC Controller | **Lane F** | Findings list filtering & severity evaluation |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.html` | Findings Viewer LWC Template | **Lane F** | Findings template |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.css` | Findings Viewer LWC Styles | **Lane F** | Findings styling |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js-meta.xml` | Findings Viewer Metadata | **Lane F** | Component metadata |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Final Integration Test Runner | **Integration Coordinator** | Cross-lane integration and regression gate |
| `docs/audits/salesforce-wave4/WAVE_4_FINAL_RECONCILIATION_EXECUTIVE_SUMMARY.md` | Executive Reconciliation Report | **Integration Coordinator** | Final readiness audit documentation |

---

## 3. Implementation Phasing & Inter-Lane Dependency Order

```
[Phase 1: Contract Baseline]
       |
       +---> Lane A: Schema Publication (daFilterSchema.js)
       |
[Phase 2: Core Persistence & UI Shell]
       |
       +---> Lane B: Apex Controller & Preset CRUD
       |
       +---> Lane C: App Shell Preset UI & Navigation
       |
[Phase 3: View-Specific Filter Consumers]
       |
       +---> Lane D: Graph Viewer Filter Integration
       |
       +---> Lane E: Matrix Viewer Component & Filtering
       |
       +---> Lane F: Findings Viewer Component & Filtering
       |
[Phase 4: Final Integration & Closure Audit]
       |
       +---> Integration Coordinator: Full Regression Gate (224 + Wave 4 Suite)
```

---

## 4. Test Gates Between Phases

1. **Gate A (Schema Milestone):** `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` must pass with 100% assertions before Lanes C–F begin integration.
2. **Gate B (Persistence Milestone):** `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` must pass with 100% assertions for Apex preset storage.
3. **Gate C (Shell Milestone):** `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` must pass with 100% assertions.
4. **Final Integration Gate:** `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` must execute and achieve 100% pass across all 224 baseline tests plus newly created Wave 4 unit tests.

---

## 5. Absolute Stop Conditions

Implementation dispatch MUST IMMEDIATELY STOP and revert if any of the following occur:
1. Human decision approvals (`DEC-W4-01` through `DEC-W4-04`) are modified without explicit human sign-off.
2. An implementation lane modifies a file outside its assigned file ownership boundaries.
3. Any regression test in the 224-test baseline fails during phase integration.
4. Payload size exceeding 131,072 characters is saved without client validation block.

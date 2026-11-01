# Wave 4 Phase 3 Full Offline Regression Evidence

| Governance Attribute | Value |
|---|---|
| **Document Type** | Comprehensive Offline Regression Verification |
| **Audit Phase** | Wave 4 — Phase 3: End-to-End Acceptance & Release Packaging |
| **Repository Root** | `/app` |
| **Working Branch** | `jules-13349142213557576629-5f64e882` |
| **HEAD Commit SHA** | `4abc7c20a55949b8b8b273c8427568242c277803` |
| **Runtime Environment** | Node.js v22.22.1 / npm 11.11.0 / Linux x86_64 |
| **Date** | November 1, 2026 |
| **Gate Status** | **GATE B — PASS (323/323 DISCRETE TEST UNITS PASSED)** |

---

## 1. Test Suite Execution & Arithmetic Reconciliation

All 12 offline test suites were executed independently from the current Phase 3 checkout.

| # | Test Suite Script | Command | Discrete Test Units | Granular Checks / Assertions | Exit Code | Source Exercised | Result |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | Lane C: Preset Manager | `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 28 | 0 | Production LWC (`daPresetManager`) | **PASS** |
| 2 | Lane D: Graph Viewer & Filter | `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 45 | 0 | Production LWC (`daGraphViewer`) | **PASS** |
| 3 | Lane E: Matrix View | `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 34 | 0 | Production LWC (`daMatrixView`) | **PASS** |
| 4 | Lane F: Findings View | `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 38 | 0 | Production LWC (`daFindingsView`) | **PASS** |
| 5 | Lane A: Filter Schema | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 36 | 0 | Production Module (`daFilterSchema`) | **PASS** |
| 6 | Workstream A: App Shell & Integration | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 104 | 0 | Production LWC (`daAppShell`) | **PASS** |
| 7 | Workstream C: State, Presets & Annotations | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 74 | 0 | Production LWC & Apex Contracts | **PASS** |
| 8 | Salesforce POC Core Suite | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 126 | 0 | LWC, Chunker, Layout Engine | **PASS** |
| 9 | Wave 4 Phase 2C Integration Suite | `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 96 | 0 | Multi-component Integration | **PASS** |
| 10 | Explorer Adapter Verification | `node scripts/test-export-explorer.cjs` | 15 | 48 | 0 | Exporter & Data Adapter | **PASS** |
| 11 | PBIM Dedicated Data Path | `node scripts/test-pbim-dedicated-data-path.cjs` | 6 | 18 | 0 | Multi-Project Pipeline & Fixture | **PASS** |
| 12 | Root Analysis Engine CLI | `npm run test:cli` | 115 | 351 | 0 | Core CLI & Analysis Engine | **PASS** |
| **TOTAL** | **12 Suites Executed** | | **323** | **998** | **0** | | **100% PASS** |

### Counting Rules Compliance
- **Total Discrete Units:** Exactly 323 discrete test units executed and passed.
- **Granular Checks:** CLI executes 115 discrete test units containing 351 granular assertions; these are tracked separately to avoid double-counting.
- **Failures / Skips:** 0 test units failed; 0 test units were skipped.
- **No Mock Swapping:** All tests exercised production source modules or faithful Node.js CommonJS test harnesses without weakening assertions.

---

## 2. Granular Suite Breakdown

### Suite 1: Lane C Preset Manager (10 Units)
- `1. Empty preset collection initializes safe V2 defaults` (PASS)
- `2. Create preset saves criteria, activates preset, and emits containerchange/filterchange` (PASS)
- `3. Apply preset updates activeFilter, activePresetId, and emits event` (PASS)
- `4. Update preset persists modified criteria into target preset` (PASS)
- `5. Delete preset removes item and resets activePresetId if active preset was deleted` (PASS)
- `6. Project isolation excludes presets belonging to other projects` (PASS)
- `7. Missing project context blocks saving and sets clear error message` (PASS)
- `8. Malformed container string falls back safely to default V2 container` (PASS)
- `9. Capacity check enforces 131,072 char hard boundary on preset creation` (PASS)
- `10. Active preset styling correctly reflects activePresetId` (PASS)

### Suite 2: Lane D Graph Filter (15 Units)
- Verifies graph payload filtering across component types, test coverage statuses (4-state canonical model), risk levels, and search text.
- Confirms Cytoscape canvas teardown on unmount and `@api recordId` setter behavior.

### Suite 3: Lane E Matrix View (11 Units)
- Verifies directed dependency matrix rendering, source-to-target dependency counts, unresolved reference mapping, empty/error state handling, and canonical filter propagation.

### Suite 4: Lane F Findings View (12 Units)
- Verifies 4 architecture finding categories: Circular Dependencies, Untested High-Risk Components, Unresolved References, and High-Coupling Hotspots (`coupling > 15 OR fanIn > 10`).

### Suite 5: Lane A Schema (9 Units)
- Validates canonical filter schema, default containers, normalization logic, V1 to V2 migration in-memory semantics, and 131,072 character payload boundaries.

### Suite 6: Workstream A App Shell (33 Units)
- Validates top-level shell orchestration, view switching (`graph`, `matrix`, `findings`), shared payload loading, preset scoping, and stale response protection.

### Suite 7: Workstream C State & Persistence (22 Units)
- Verifies preference read/write isolation per user/project, preservation of `Positions_JSON__c` and `Zoom_Pan_JSON__c`, and node annotation contracts.

### Suite 8: POC Core Suite (43 Units)
- Verifies graph chunk pagination, sequence integrity, multibyte UTF-8 handling, layout engine calculation, and `SELECTION ≠ NAVIGATION`.

### Suite 9: Wave 4 Integration Suite (32 Units)
- Validates cross-component data flow between Shell, Preset Manager, Graph Viewer, Matrix View, and Findings View.

### Suite 10: Explorer Adapter (15 Units)
- Verifies exporter output determinism, graph invariants, edge types normalization, and path containment safety.

### Suite 11: PBIM Dedicated Data Path (6 Units)
- Verifies dedicated PBIM fixture artifact, slugification, and fail-closed behavior on unresolved coverage evidence.

### Suite 12: Root CLI Suite (115 Units / 351 Checks)
- Verifies full AST analysis engine, graph extraction, metrics calculation, and architecture decision contexts.

---

## 3. Conclusion & Gate B Verdict

**GATE B VERDICT: PASS**

The offline regression gate is 100% satisfied. All 323 test units across 12 suites pass deterministically with zero errors.

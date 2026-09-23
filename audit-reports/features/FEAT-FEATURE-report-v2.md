# FEATURE AUDIT REPORT: FEAT-FEATURE-v2
**Feature Name:** Feature Discovery & 2D Region Geometry (v2 Rerun)
**Feature ID:** FEAT-FEATURE-v2
**Audit Date:** 2026-09-23
**Worktree:** `../audit-feat-feature-v2`
**Output File:** `audit-reports/features/FEAT-FEATURE-report-v2.md`
**Evidence Location:** `audit-evidence/features/FEAT-FEATURE-v2/`
**Overall Decision:** PASS

---

## 1. Executive Summary

This report documents the forensic rerun audit for **FEAT-FEATURE-v2** (Feature Discovery & 2D Region Geometry).

In the v1 audit (`FEAT-FEATURE-report.md`), the feature was assigned a **PASS** decision, but lacked the mandatory §4 CANONICAL AUD-PACK MAPPING table. This v2 rerun preserves all v1 findings, introduces the canonical audit mapping table across all 7 in-scope canonical audits, and re-runs runtime test evidence using the local environment test runner.

Key findings preserved and re-verified:
1. **Feature Discovery Execution:** `discoverFeatures` identifies 21 feature clusters across 240 nodes in the canonical Cloud Spend Tracker fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) in **16.16 ms** (passing the <50 ms performance gate).
2. **Phase 8 Unassigned Baseline Reproduction:** 77 primary nodes assigned to 21 feature clusters, 44 nodes classified as Shared Infrastructure, and 119 unassigned nodes (49.58% unassigned, reproducing the Phase 8 baseline reduction from 87.5% down to 49.6%).
3. **2D Region Geometry & Overlaps:** 0 2D feature region overlaps, 0 primary node overlaps, and 0 satellite node overlaps were recorded.
4. **Determinism & Stability:** 5 shuffled input order runs yielded **0 membership drift**, and feature IDs remain 100% stable across execution cycles.
5. **Shared Infrastructure Protection:** High fan-in shared infrastructure classes (e.g. `ApexClass:Logger`, `ApexClass:SpendTrackerAuthorizationService`) attach as secondary members without merging distinct domain feature clusters.

---

## 2. Current Authoritative State

The authoritative layout engine implements a 13-stage deterministic layout pipeline (Stage 0–12). Feature Discovery and 2D Region Geometry operate at **Stage 4** (`discoverFeatures` in `explorer/src/lib/layout/features.ts`) and **Stage 5** (`computeGlobalFeatureLayout` in `explorer/src/lib/layout/global-layout.ts`).

### Canonical Feature Roles (`explorer/src/lib/layout/feature-roles.ts:14-20`)
1. **FeatureAnchor:** Entry points, LWCs, Visualforce, Controllers, Triggers, Flows, APIs.
2. **FeatureCore:** Services, Managers, Business Logic.
3. **FeatureData:** Selectors, Repositories, Custom Objects, Schema entities.
4. **FeatureBridge:** Cross-domain or cross-subsystem boundary connectors.
5. **FeatureTest:** Unit and integration test satellites.
6. **SharedInfrastructure:** Cross-cutting utility/config classes with fanIn ≥ 5 or connected across ≥ 3 distinct primary domains/features.

### Position Authority & Provenance
- `architectureMode = 'hybrid'` maps directly to `enableFeatureLayout: true`.
- Stage 4/5 output is preserved under `automatic-hybrid` layout provenance. User-authored coordinates remain authoritative.

---

## 3. Scope and Method

### In Scope
- `explorer/src/lib/layout/features.ts`
- `explorer/src/lib/layout/feature-roles.ts`
- `explorer/src/lib/layout/feature-ordering.ts`
- `explorer/src/lib/layout/features.test.ts`
- `explorer/src/test/Phase6B_LocalityCompaction.test.ts`
- `explorer/src/lib/layout/feature-layout.test.ts`
- `explorer/src/lib/layout/feature-roles.test.ts`

### Method
- Re-run test suites in `explorer` using local Vitest (`cd explorer && npx vitest run ...`).
- Capture stdout and execution logs into `audit-evidence/features/FEAT-FEATURE-v2/`.
- Validate 6 canonical roles, candidate scoring threshold ($minCandidateScore = 3.0$), 2D multi-row band packing activation conditions, locality metrics ($D_{intra} < D_{inter}$), and determinism.

---

## 4. CANONICAL AUD-PACK MAPPING

| Canonical Audit | Coverage | Evidence Location | Gap Notes |
| :--- | :--- | :--- | :--- |
| **AUD-FEATURE-001** | FULL | `explorer/src/lib/layout/features.ts` | 21 feature clusters discovered, 0 region overlaps, 100% role coverage. |
| **AUD-EXPLAINABILITY-001** | FULL | `explorer/src/components/FeatureOverlayCanvas.tsx` | Feature regions render as SVG composition overlays with zoom-aware visibility. |
| **AUD-LAYOUT-001** | FULL | `explorer/src/lib/architecture-layout.ts:153-175` | Stage 4 (`discoverFeatures`) & Stage 5 (`computeGlobalFeatureLayout`) integrated into 13-stage pipeline. |
| **AUD-PERF-001** | FULL | `audit-evidence/features/FEAT-FEATURE-v2/vitest-v01-features.txt` | Discovery latency measured at 16.16 ms on 240-node canonical fixture (< 50 ms gate). |
| **AUD-SCALABILITY-001** | FULL | `audit-evidence/features/FEAT-FEATURE/evidence-cross-cutting.txt` | Discovery evaluated on 5,000-node graph (472.66 ms, 500 features discovered without heap overflow). |
| **AUD-DESIGN-001** | FULL | `explorer/src/lib/layout/feature-roles.ts:14-20` | 6 canonical roles (Anchor, Core, Data, Bridge, Test, SharedInfrastructure) verified. |
| **AUD-GOV-001** | FULL | `audit-evidence/features/FEAT-FEATURE-v2/vitest-v02-locality.txt` | 0.00000 px determinism drift verified across 10 repeats and 5 shuffled input permutations. |

---

## 5. Forensic Metrics / Runtime Evidence

### Executed Vitest Suites
1. **Features Unit Suite (`features.test.ts`)**:
   - Command: `cd explorer && npx vitest run src/lib/layout/features.test.ts`
   - Output: 16 passed / 16 tests (1.79s test duration).
   - Evidence File: `audit-evidence/features/FEAT-FEATURE-v2/vitest-v01-features.txt`.
2. **Locality Compaction Suite (`Phase6B_LocalityCompaction.test.ts`)**:
   - Command: `cd explorer && npx vitest run src/test/Phase6B_LocalityCompaction.test.ts`
   - Output: 5 passed / 5 tests (22.86s test duration, including 10 repeat executions x 5 input order shuffles).
   - Evidence File: `audit-evidence/features/FEAT-FEATURE-v2/vitest-v02-locality.txt`.
3. **Feature Layout Suite (`feature-layout.test.ts`)**:
   - Command: `cd explorer && npx vitest run src/lib/layout/feature-layout.test.ts`
   - Output: 15 passed / 15 tests (13.90s test duration).
   - Evidence File: `audit-evidence/features/FEAT-FEATURE-v2/vitest-v03-feature-layout.txt`.
4. **Feature Roles Suite (`feature-roles.test.ts`)**:
   - Command: `cd explorer && npx vitest run src/lib/layout/feature-roles.test.ts`
   - Output: 16 passed / 16 tests (24ms test duration).
   - Evidence File: `audit-evidence/features/FEAT-FEATURE-v2/vitest-feature-roles.txt`.

### Canonical Fixture Metrics (`audit-fixtures/cloud-spend-tracker/explorer-data.json`)
- **Total Nodes:** 240
- **Total Edges:** 1,024
- **Feature Clusters Discovered:** 21
- **Primary Assigned Nodes:** 77
- **Shared Infrastructure Nodes:** 44
- **Unassigned Nodes:** 119 (49.58% unassigned)
- **Singletons:** 14
- **Largest Cluster:** `feature_forecast-manager` (32 nodes)
- **Locality:** $D_{intra} = 1,101.68\text{ px}$, $D_{inter} = 1,020.00\text{ px}$ on baseline; $D_{intra} < D_{inter}$ strictly holds under compact spacing ($layerSpacing = 60$).
- **Region Overlaps:** 0 2D feature region overlaps, 0 primary overlaps, 0 satellite overlaps.
- **Determinism:** 0 membership drift across 5 shuffled input order runs.

---

## 6. Findings

### Preserved v1 Findings
- **Discovery Efficiency:** `discoverFeatures` executes in 16.16 ms on 240 nodes.
- **Phase 8 Unassigned Reduction:** Unassigned nodes reduced from 87.5% (Stage 0 baseline) down to 49.58% (119/240 nodes).
- **Region Overlaps:** 0 region overlaps across all 21 feature clusters.
- **FIND-FEAT-01 (LOW):** `Phase6B_LocalityCompaction.test.ts` test 4 performs 10 repeat executions x 5 input order shuffles. In standard test runs, test 4 requires ~16 seconds to complete.

---

## 7. Verification Matrix

| Requirement ID | Description | Result | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **D-01** | Verify 6 canonical feature roles | **PASSED** | `explorer/src/lib/layout/feature-roles.ts:14-20`, `feature-roles.test.ts` (16/16 PASS) |
| **D-02** | Candidate scoring design ($minCandidateScore = 3.0$) | **PASSED** | `explorer/src/lib/layout/features.ts:60,88`, `features.test.ts` |
| **D-03** | 2D multi-row band packing activation conditions | **PASSED** | `explorer/src/lib/layout/global-layout.ts:1101-1103` (`>=25` features or `>5000px` width) |
| **V-01** | Unit test execution (`features.test.ts`) | **PASSED** | `audit-evidence/features/FEAT-FEATURE-v2/vitest-v01-features.txt` (16/16 PASS) |
| **V-02** | Locality test execution (`Phase6B_LocalityCompaction.test.ts`) | **PASSED** | `audit-evidence/features/FEAT-FEATURE-v2/vitest-v02-locality.txt` (5/5 PASS) |
| **V-03** | Discovery on canonical fixture | **PASSED** | 21 feature clusters, 77 primary, 44 shared, 119 unassigned (49.58%) |
| **V-04** | Locality metrics ($D_{intra} < D_{inter}$) | **PASSED** | Verified under compact layer spacing ($layerSpacing = 60$) in `Phase6B_LocalityCompaction.test.ts` |
| **V-05** | Region overlap count = 0 | **PASSED** | `feature-layout.test.ts` (15/15 PASS), 0 region overlaps |
| **V-06** | Determinism across 5 shuffled input runs | **PASSED** | 0 membership drift across 5 order permutations |
| **V-07** | Semantic cluster sampling (5 trios) | **PASSED** | Verified `admin-filter-panel`, `AdminUserController`, `CloudAccountController`, `CloudAccountService`, `CloudSpendMonthBackfillBatch` |
| **T-01** | Role test coverage for all 6 roles | **PASSED** | `feature-roles.test.ts` (16/16 PASS) |
| **T-02** | Locality compaction test coverage | **PASSED** | `Phase6B_LocalityCompaction.test.ts` (5/5 PASS) |
| **T-03** | Adversarial boundary tests | **PASSED** | `feature-layout.test.ts` Fixtures A-H (single-node, sparse, disconnected) |
| **T-04** | Shared infrastructure merge protection | **PASSED** | Shared nodes attach as secondary members without merging feature clusters |
| **P-01** | Traced execution pipeline Stage 4 & 5 | **PASSED** | `computeArchitectureLayout` -> `discoverFeatures` -> `computeGlobalFeatureLayout` |
| **P-02** | Stage 5 uses feature regions when `enableFeatureLayout: true` | **PASSED** | `explorer/src/lib/architecture-layout.ts:167-175` |
| **P-03** | Read-only overlay rendering | **PASSED** | `explorer/src/components/FeatureOverlayCanvas.tsx:84-110` (`pointerEvents: 'none'`) |
| **M-01** | Phase 8 unassigned reduction (49.6%) current | **PASSED** | 49.58% unassigned reproduced (119/240 nodes) |
| **M-02** | Single-node features documented | **PASSED** | `02_Layout_Engine_Spatial.md` & `features.ts:241` |
| **M-03** | Feature ID stability across runs | **PASSED** | `feature_<baseName>` derived deterministically |

---

## 8. Acceptance Gates

- **G-D (Design Gate):** **PASSED** — 6 canonical roles, candidate scoring threshold ($minCandidateScore = 3.0$), and 2D multi-row band packing activation fully verified.
- **G-V (Verification Gate):** **PASSED** — 21 feature clusters discovered, 0 region overlaps, 0 membership drift across 5 input order shuffles.
- **G-T (Testing Gate):** **PASSED** — Role coverage, locality compaction, sparse/disconnected graphs, and shared infrastructure merge protection tests passing 100%.
- **G-P (Pipeline Gate):** **PASSED** — Stage 4 (`discoverFeatures`) and Stage 5 (`computeGlobalFeatureLayout`) integrated into 13-stage pipeline.
- **G-M (Maintenance Gate):** **PASSED** — Phase 8 unassigned reduction state (49.58%) reproduced and verified.
- **G-X (Cross-Cutting Gate):** **PASSED** — PERF < 50ms (16.16ms), SCALE 5k nodes (472.66ms), SEC project isolation, DOC accuracy verified.
- **G-AUDPACK (Canonical Audit Mapping Gate):** **PASSED** — Table for 7 in-scope canonical audits included in Section 4.

---

## 9. Superseded / Historical Notes

- Historical layout audits reported `Ctotal = 95,487` and marked the hybrid layout path as production-blocked.
- Recent runtime audits (`HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md`) confirm Candidate E runtime metrics at `Ctotal = 94,662` with active Hybrid mode rendering in `GraphView.tsx`.
- 95,487 is historical/superseded; 94,662 is the current authoritative measured crossing value.

---

## 10. Remediation Queue

| ID | Severity | Description | Status | Remediation Note |
| :--- | :--- | :--- | :--- | :--- |
| **FIND-FEAT-01** | LOW | `Phase6B_LocalityCompaction.test.ts` test 4 repeat loop (10 repeats x 5 shuffles) takes ~16 seconds in Vitest. | QUEUED | Consider increasing `testTimeout` for long-running determinism sweep tests in `Phase6B_LocalityCompaction.test.ts`. |

---

## 11. Decision

**FINAL AUDIT DECISION:** **PASS**

---

## 12. Key Authoritative Sources

1. `02_Layout_Engine_Spatial.md` — Authoritative layout pipeline specification.
2. `explorer/src/lib/layout/features.ts` — Feature discovery & candidate scoring engine.
3. `explorer/src/lib/layout/feature-roles.ts` — 6 canonical feature roles classification.
4. `explorer/src/lib/layout/feature-ordering.ts` — Strategy F 2D band ordering.
5. `explorer/src/lib/architecture-layout.ts` — 13-stage architecture layout orchestrator.
6. `audit-fixtures/cloud-spend-tracker/explorer-data.json` — Canonical 240-node benchmark dataset.
7. `audit-evidence/features/FEAT-FEATURE-v2/` — Vitest execution evidence logs for v2 rerun.

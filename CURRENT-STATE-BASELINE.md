# CURRENT-STATE BASELINE

## 1. Current Project State

This document establishes the authoritative, verified current-state handoff for the **Salesforce Architecture Explorer & Dependency Analyzer** repository.

* **Phase 18 Remediation**: Fully complete across Track A (Production Provisioning), Track B (40px Clearance Contract), and Track C (Layer-Aware Locality Diagnostics).
* **Integrated Regression**: PASSED (`PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md`).
* **Audit Closure**: COMPLETE (`PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md`).
* **Context Retrieval Quality**: VERIFIED (`PHASE19A_CONTEXT_RETRIEVAL_QUALITY_AUDIT.md`).
* **Agent Navigation Robustness**: ROBUST (`PHASE19B_AGENT_CONTEXT_NAVIGATION_STRESS_TEST.md`).
* **Analytical Lenses Suite (Phases 2 & 3)**: Fully complete across all 12 interactive visualization lenses and 6 supporting workflow surfaces:
  * Phase 2 Lenses: Matrix, Tree, Profile, Radar, DNA Barcode, Coupling Heatmap, Four-Direction View (`PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md`).
  * Phase 3 Lenses: Treemap 3A (`PHASE_3A_TREEMAP_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`), Sankey Dependency River 3B (`PHASE_3B_SANKEY_DEPENDENCY_RIVER_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`), Subway Map 3C (`PHASE_3C_SUBWAY_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`), Dependency Constellation 3D (`PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`).
  * Phase 3 Scalability & Rendering: Phase 3C Stage 9 Coarse Anchor Pruning (`PHASE_3C_STAGE9_COARSE_PRUNING_PRODUCTION_PROMOTION_AND_REGRESSION.md`), Phase 3D Web Worker Layout Offloading (`PHASE_3D_WEB_WORKER_LAYOUT_OFFLOADING_VALIDATION.md`), Phase 3D-1 Benchmark Reconciliation (`PHASE_3D-1_WEB_WORKER_EVIDENCE_AND_BENCHMARK_RECONCILIATION.md`), Phase 3E Matrix Virtualization & Canvas LOD (`PHASE_3E_MATRIX_VIRTUALIZATION_AND_EXTREME_SCALE_RENDERING_REPORT.md`).
* **Layout Pipeline Production Optimizations (September 2026)**:
  * **Stage 5 — Feature Graph Reuse**: Productionized in `global-layout.ts`. Reuses Stage 0 feature graph structure, eliminating $O(N \cdot E)$ re-evaluations (`STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md`).
  * **Stage 6 — T2 Early Exit Crossing Reduction**: Productionized in `ordering.ts`. Employs early-exit threshold when crossing count falls below $T_2$ or improvement stagnates (`STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md`, commit `567ce61`).
  * **Stage 7 — Single-Pass X-Centering**: Productionized in `local-layout.ts`. Computes local tier X-offsets in a single pass without iterative re-centering (`STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`).
  * **Stage 9 — Concentric Ring Traversal**: Productionized in `satellites.ts`. Employs concentric ring candidate slot ordering for secondary satellite placement (`STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md`).
  * **Stage 11 — Collision Cleanup Verification**: Verified in `collision-cleanup.ts`. Forensic measurement proved Stage 11 runs in ~20ms at 240N and < 1.9s at 5,000N (< 1% of pipeline time) (`STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md`).

This baseline artifact serves as a navigation and status entry point for future agents. Deeper forensic evidence remains indexed in `08_Audit_Source_Register.md` and detailed in the respective canonical audit reports.

---

## 2. Canonical Dataset

* **File Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Topology**: 240 nodes, 1,024 edges
* **Identity Status**: Authoritative, read-only Salesforce-derived org dataset. Cryptographically verified bit-for-bit unchanged.

---

## 3. Track Status

| Track / Subsystem | Current Status | Current Authority |
| --- | --- | --- |
| **Track A — Production Provisioning** | CLOSED — PROVEN | `PHASE18B_TRACK_A_PROVENANCE_VERIFICATION_REPORT.md` |
| **Track B — 40px Clearance** | CLOSED — CORRECTED | `PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md` |
| **Track C — Locality Diagnostics** | CLOSED — IMPLEMENTED / DIAGNOSTIC-ONLY | `PHASE18F_LAYER_AWARE_LOCALITY_IMPLEMENTATION.md` |
| **Integrated Validation** | FINAL INTEGRATION — PASSED | `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` |
| **Audit Closure** | FINAL AUDIT CLOSURE — COMPLETE | `PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md` |
| **Context Retrieval** | CONTEXT RETRIEVAL — VERIFIED / ROBUST | `PHASE19A` / `PHASE19B` |
| **G-OVL — Feature Region Overlay Transport** | CLOSED — IMPLEMENTED AND VERIFIED | `HYBRID_LAYOUT_PROMPT4_IMPLEMENTATION_REPORT.md` |
| **Stage 5 Optimization** | PRODUCTIONIZED | `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md` |
| **Stage 6 Optimization** | PRODUCTIONIZED (T2) | `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` |
| **Stage 7 Optimization** | PRODUCTIONIZED | `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md` |
| **Stage 9 Optimization** | PRODUCTIONIZED | `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md` |
| **Stage 11 Optimization** | VERIFIED / MEASURED | `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md` |
| **Phase 2 Analytical Lenses** | CLOSED — COMPLETE | `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md` |
| **Phase 3 Analytical Lenses** | CLOSED — COMPLETE | `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md` |
| **Phase 3C Stage 9 Pruning** | PRODUCTIONIZED | `PHASE_3C_STAGE9_COARSE_PRUNING_PRODUCTION_PROMOTION_AND_REGRESSION.md` |
| **Phase 3D Web Worker Layout** | PRODUCTIONIZED | `PHASE_3D_WEB_WORKER_LAYOUT_OFFLOADING_VALIDATION.md` |
| **Phase 3D-1 Reconciliation** | RECONCILED / AUTHORITATIVE | `PHASE_3D-1_WEB_WORKER_EVIDENCE_AND_BENCHMARK_RECONCILIATION.md` |
| **Phase 3E Matrix Virtualization** | PRODUCTIONIZED (DOM REALIZATION = BOUNDED) | `PHASE_3E_MATRIX_VIRTUALIZATION_AND_EXTREME_SCALE_RENDERING_REPORT.md` |
| **Phase 3E Canvas LOD** | PRODUCTIONIZED (5 Tiers) | `PHASE_3E_MATRIX_VIRTUALIZATION_AND_EXTREME_SCALE_RENDERING_REPORT.md` |

---

## 4. Current Architecture Boundaries

```text
Canonical dataset (audit-fixtures/cloud-spend-tracker/explorer-data.json)
        ↓
Build/export provisioning (scripts/run-explorer.cjs -> export-explorer.cjs)
        ↓
Explorer runtime (ProjectContext.tsx -> /projects/cloud-spend-tracker/explorer-data.json)
        ↓
Optimized Candidate E layout pipeline (architecture-layout.ts, 13-stage Stage 0–12 generator)
    ├→ Stage 5: Global Feature Layout (global-layout.ts, Feature Graph Reuse)
    ├→ Stage 6: Layer Ordering & Crossing Reduction (ordering.ts, T2 Early Exit)
    ├→ Stage 7: Primary Production Local Layout (local-layout.ts, Single-Pass X-Centering)
    ├→ Stage 9: Secondary Satellite Placement (satellites.ts, Concentric Ring Traversal)
    └→ Stage 11: Collision Cleanup (collision-cleanup.ts, Fast Spacing Cleanup)
        ↓
Stage 5 featureRegions metadata exposure (computeArchitectureLayoutWithMetadata)
        ↓
Transport via graph-layout (runLayoutWithMetadata)
        ↓
GraphView (setFeatureRegions state update on layout execution)
        ↓
FeatureOverlayCanvas (featureRegions prop -> SVG semantic feature region enclosure boxes)
        ↓
Position Authority (position-policy.ts, 5-Level priority hierarchy)
        ↓
40px clearance validation (metrics.ts minimumNodeClearance with 1e-3 epsilon normalization)
        ↓
Layer-aware locality diagnostics (metrics.ts calculateFeatureLocalityDiagnostics)
        ↓
Renderer consumes authoritative positions (GraphView.tsx preset Cytoscape binding)
```

**Explicit System Boundaries**: Recent optimizations did **NOT** modify layout node coordinates $(x, y)$, change Position Authority precedence, alter canonical acceptance metrics, or introduce breaking schema changes.

---

## 5. Governing Contracts and Diagnostics

### Physical Clearance Contract

* **Governing Contract**: Minimum physical node clearance $\ge 40.0\text{px}$ (`FEAT-LAYOUT-report-v2.md`).
* **Implementation Mechanism**: `minimumNodeClearance` in `explorer/src/lib/layout/metrics.ts` applies `SPACING_EPSILON = 1e-3` ($0.001\text{px}$) normalization to accommodate IEEE-754 arithmetic representation noise originating from X-center averaging in `global-layout.ts`.
* **Contract Integrity**: The formal requirement remains strictly $\ge 40.0\text{px}$. Sub-40px values with deficits $> 0.001\text{px}$ (`39.99`, `39.994`, `39.998`, `39.9989`) are rejected as contract failures, while the canonical floating-point case (`39.99905982905989px`) evaluates to `40.0`. Zero primary or satellite overlaps exist.

### Locality Diagnostics & Detailed Crossings Schema

* **Global Locality Metrics**: Historical global locality metrics (`medianIntraFeatureEdgeLength`, `medianInterFeatureEdgeLength`, `intraToInterEdgeLengthRatio`, `isIntraShorterThanInter`) remain available in `metrics.ts`.
* **Layer-Aware Locality Diagnostics**: `sameLayerLocality` and `crossLayerLocality` properties are exposed in `FeatureLocalityDiagnostics` and computed using `classifyNodeLayer(node)`.
* **Detailed Crossings Schema Alignment**: In current production code (`metrics.ts` and `evaluate-layout.ts`), primary-primary edge crossing metric is exposed via field `detailedCrossings.primaryPrimaryCrossings` (formerly referenced in older reports as `detailedCrossings.primaryPrimary`).

---

## 6. Position and Rendering Authority

```text
Layout engine (architecture-layout.ts)
    → calculates architecture positions (Level 4 / Level 5)

Position Authority (position-policy.ts)
    → determines authoritative positions (Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback)

Renderer (GraphView.tsx)
    → consumes authoritative positions (preset layout execution)
```

For deeper forensic evidence on Position Authority or visual rendering boundaries, inspect `audit-reports/features/FEAT-POSAUTH-report-v2.md` and `FEAT-OVERLAY-report.md`.

---

## 7. Historical Supersession Rules

* **40px Contract Precision**:
  * `18C` (initial two-decimal rounding) $\rightarrow$ `18D` (precision finding) $\rightarrow$ `18E` (corrective `1e-3` epsilon implementation). **Phase 18E represents the current authoritative state.**
* **Remediation Phase Evolution**:
  * `Phase 16 / 17` (reconciled planning; status: IMPLEMENTATION NOT PERFORMED) $\rightarrow$ `Phase 18` (authorized implementation) $\rightarrow$ `18G / 18H` (integrated validation & closure; status: FINAL INTEGRATION — PASSED / FINAL AUDIT CLOSURE — COMPLETE). **Phase 18G/18H represent the current authoritative state.**
* **Stage 6 Crossing Reduction Optimization**:
  * `STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md` (uncorrected forensic) $\rightarrow$ `STAGE_6_EARLY_EXIT_SWEEP_CORRECTED_FORENSIC_AB_EXPERIMENT_2026-09-28.md` & `STAGE_6_EARLY_EXIT_SWEEP_STRICT_CORRECTED_FORENSIC_2026-09-28.md` (corrected forensics) $\rightarrow$ `STAGE_6_EARLY_EXIT_T2_T3_PERFORMANCE_VALIDATION_CORRECTED_2026-09-28.md` (performance validation) $\rightarrow$ `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` (productionization). **`STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` represents current production authority.**

---

## 8. Context Retrieval Protocol

Future coding agents must adhere to the mandatory context lookup chain:

```text
AGENT.md
    ↓
08_Audit_Source_Register.md
    ↓
authoritative Phase / Feature report
    ↓
specific source evidence (only when line-level confirmation is required)
```

---

## 9. Authoritative Navigation Map

| Investigation Topic | First Authority File | Supporting Evidence / Code |
| --- | --- | --- |
| **Production Provisioning (Track A)** | `PHASE18B_TRACK_A_PROVENANCE_VERIFICATION_REPORT.md` | `scripts/run-explorer.cjs` |
| **40px Clearance (Track B)** | `PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md` | `explorer/src/lib/layout/metrics.ts` |
| **Locality Diagnostics (Track C)** | `PHASE18F_LAYER_AWARE_LOCALITY_IMPLEMENTATION.md` | `explorer/src/lib/layout/metrics.ts` |
| **Integrated Phase 18 Status** | `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` | `PHASE18G` report section 5 |
| **Audit Closure** | `PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md` | `08_Audit_Source_Register.md` |
| **Context Retrieval Quality** | `PHASE19A_CONTEXT_RETRIEVAL_QUALITY_AUDIT.md` | `PHASE19A` report section 3 |
| **Agent Navigation Robustness** | `PHASE19B_AGENT_CONTEXT_NAVIGATION_STRESS_TEST.md` | `PHASE19B` report section 4 |
| **Position Authority Policy** | `audit-reports/features/FEAT-POSAUTH-report-v2.md` | `explorer/src/lib/position-policy.ts` |
| **Candidate E Layout Pipeline** | `audit-reports/features/FEAT-LAYOUT-report-v2.md` | `explorer/src/lib/architecture-layout.ts` |
| **Stage 5 Feature Graph Reuse** | `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md` | `explorer/src/lib/layout/global-layout.ts` |
| **Stage 6 T2 Early Exit** | `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` | `explorer/src/lib/layout/ordering.ts` |
| **Stage 7 Single-Pass X-Centering** | `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md` | `explorer/src/lib/layout/local-layout.ts` |
| **Stage 9 Concentric Ring Traversal** | `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md` | `explorer/src/lib/layout/satellites.ts` |
| **Stage 11 Collision Cleanup** | `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md` | `explorer/src/lib/layout/collision-cleanup.ts` |
| **Cytoscape Canvas Renderer** | `audit-reports/features/FEAT-OVERLAY-report.md` | `explorer/src/components/GraphView.tsx` |
| **Multi-Project State Isolation** | `audit-reports/features/FEAT-STATE-report-v2.md` | `explorer/src/lib/projectState.ts` |
| **Analytical Lenses (Phase 2)** | `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md` | `explorer/src/lib/adapters/` |
| **Analytical Lenses (Phase 3)** | `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md` | `explorer/src/lib/adapters/` |
| **Historical Audit Indexing** | `08_Audit_Source_Register.md` | `08_Audit_Source_Register.md` |

---

## 10. Reconciled Full-Pipeline Layout Performance Baseline

The authoritative full-pipeline layout baseline established in Phase 3D-1 and validated in Phase 3E across 6 scale tiers:

| Scale Tier ($N$) | Nodes | Edges | $T_{\text{sync}}$ | $T_{\text{worker\_compute}}$ | Main-Thread Blocking | Coordinate Drift | Scale Classification |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **240** | 240 | 1,024 | 1.33484s | 1.05584s | 4.34ms | 0.00000 px | `SUPPORTED` |
| **500** | 500 | 975 | 2.16346s | 1.79282s | 4.67ms | 0.00000 px | `SUPPORTED` |
| **750** | 750 | 1,501 | 5.03796s | 4.02613s | 10.32ms | 0.00000 px | `SUPPORTED` |
| **1000** | 1,000 | 1,988 | 10.01622s | 8.97981s | 9.38ms | 0.00000 px | `SUPPORTED` |
| **2000** | 2,000 | 3,982 | 67.50427s | 61.70241s | 19.13ms | 0.00000 px | `DEGRADED` |
| **3500** | 3,500 | 7,025 | 357.94165s | 357.94165s | 117.61ms | 0.00000 px | `DEGRADED` |
| **10000** | 10,000 | 19,917 | > 300s | > 300s | N/A | 0.00000 px | `10,000N = characterized but unsupported` |

---

## 11. Known Limitations

The canonical dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`) contains zero same-layer inter-feature dependency edges because inter-feature couplings in this org's architecture span across distinct vertical layers (e.g. presentation-to-application or application-to-domain). Consequently, the `medianInterEdgeLength` diagnostic field under `sameLayerLocality` evaluates to `0.00px` on this dataset. This is an empirical property of the dataset's coupling topology, not an engine defect.

---

## 11. Future-Agent Rules

1. **Read `AGENT.md` First**: Always start context retrieval at `AGENT.md`.
2. **Follow the Source Register**: Use `08_Audit_Source_Register.md` to resolve audit IDs and verify report authority.
3. **Prefer Current Authority**: Use later corrective reports (e.g., 18E over 18C, Stage 6 T2 productionization report over forensic sweeps) for active state decisions.
4. **Preserve Historical Reports**: Never edit or delete historical audit reports under `audit-reports/` or root markdown records.
5. **Protect Canonical Datasets**: Never modify `audit-fixtures/cloud-spend-tracker/explorer-data.json` or alter its SHA-256 hash.
6. **Protect Governing Contracts**: Maintain strict formal requirements (e.g., minimum physical clearance $\ge 40.0\text{px}$).
7. **No Arbitrary Thresholds**: Do not introduce unapproved locality pass/fail gates or arbitrary scoring formulas.
8. **Minimal Source Inspection**: Read implementation code only when report evidence requires line-level confirmation.
9. **Stay In-Scope**: Keep code or documentation modifications strictly scoped to the assigned task.
10. **Preserve Position Authority**: Never overwrite Level 1–3 authoritative node positions during automatic UI triggers or viewport operations.

---

## 12. Context Retrieval Maintenance Changelog

| Date | Retrieval File Changed | Source File/Report | Change | Reason / Authority Status |
| --- | --- | --- | --- | --- |
| 2026-09-28 | `CURRENT-STATE-BASELINE.md` | `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` | Added Stage 6 T2 productionization routing, updated architecture map and navigation table. | Stage 6 moved from experimental validation into production code (`ordering.ts`, commit `567ce61`). |
| 2026-09-28 | `CURRENT-STATE-BASELINE.md` | `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md` | Added Stage 5 Feature Graph Reuse productionization routing. | Stage 5 feature graph structure reuse active in `global-layout.ts`. |
| 2026-09-28 | `CURRENT-STATE-BASELINE.md` | `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md` | Added Stage 7 Single-Pass X-Centering productionization routing. | Stage 7 single-pass local tier layout active in `local-layout.ts`. |
| 2026-09-28 | `CURRENT-STATE-BASELINE.md` | `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md` | Added Stage 9 Concentric Ring Traversal productionization routing. | Stage 9 concentric ring candidate slot order active in `satellites.ts`. |
| 2026-09-28 | `CURRENT-STATE-BASELINE.md` | `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md` & `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md` | Added Phase 2 and Phase 3 analytical lenses closure status and routing. | Analytical lenses (Matrix, Tree, Profile, Radar, DNA, Heatmap, 4-Direction, Treemap, River, Subway, Constellation) fully integrated. |

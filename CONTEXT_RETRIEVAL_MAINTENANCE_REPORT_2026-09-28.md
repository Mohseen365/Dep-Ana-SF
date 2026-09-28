# CONTEXT RETRIEVAL MAINTENANCE REPORT — 2026-09-28

**Program:** Salesforce Architecture Explorer & Dependency Analyzer
**Task:** Context Retrieval System Synchronization & Maintenance Pass
**Date:** September 28, 2026
**Auditor:** Jules (Software Engineer / Retrieval Systems Auditor)
**Status:** **PASS**

---

## A. Retrieval System Baseline

The following core navigation, indexing, and baseline retrieval files were inspected and synchronized:

1. `AGENT.md` — Primary context navigation guide and task router.
2. `CONTEXT-RETRIEVAL-PROTOCOL.md` — Authoritative rules for context routing, authority resolution, code verification, search escalation, and context synchronization.
3. `CURRENT-STATE-BASELINE.md` — Authoritative current-state handoff, layout pipeline status, analytical lenses closure status, and track navigation map.
4. `08_Audit_Source_Register.md` — Canonical index of all audit IDs, source reports, evidence paths, decisions, and supersession records.

---

## B. Files Examined

The following relevant source, test, fixture, and report files created or modified during recent layout optimization, analytical lens, and audit work were examined:

### Layout Pipeline & Production Optimizations
* `explorer/src/lib/architecture-layout.ts` (13-stage Stage 0–12 layout pipeline orchestrator)
* `explorer/src/lib/layout/global-layout.ts` (Stage 5 Global Feature Layout)
* `explorer/src/lib/layout/ordering.ts` (Stage 6 Crossing Reduction & T2 Early Exit)
* `explorer/src/lib/layout/local-layout.ts` (Stage 7 Primary Production Local Layout)
* `explorer/src/lib/layout/satellites.ts` (Stage 9 Secondary Satellite Placement)
* `explorer/src/lib/layout/collision-cleanup.ts` / `spacing.ts` (Stage 11 Collision Cleanup)
* `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md`
* `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md`
* `STAGE_6_EARLY_EXIT_T2_T3_PERFORMANCE_VALIDATION_CORRECTED_2026-09-28.md`
* `STAGE_6_EARLY_EXIT_SWEEP_STRICT_CORRECTED_FORENSIC_2026-09-28.md`
* `STAGE_6_EARLY_EXIT_SWEEP_CORRECTED_FORENSIC_AB_EXPERIMENT_2026-09-28.md`
* `STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md` (historical uncorrected)
* `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`
* `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md`
* `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md`
* `FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md`
* `COMBINED_PERFORMANCE_FORENSIC_AUDIT_STAGE5_STAGE6_STAGE7_RENDERING_2026-09-27.md`

### Analytical Lenses (Phases 2 & 3)
* `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md`
* `PHASE_2_FOUR_DIRECTION_VIEW_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`
* `PHASE_2_COUPLING_HEATMAP_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`
* `PHASE_2_ARCHITECTURE_DNA_INDEPENDENT_AUDIT.md`
* `PHASE_2_RADAR_RENDERER_REAL_BROWSER_VERIFICATION.md`
* `PHASE_3A_TREEMAP_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`
* `PHASE_3B_SANKEY_DEPENDENCY_RIVER_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`
* `PHASE_3C_SUBWAY_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION.md`
* `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`

---

## C. Stale References Found

| Retrieval Entry | Problem | Classification | Correct Source |
| --------------- | ------- | -------------- | -------------- |
| `CURRENT-STATE-BASELINE.md` (Stage 6) | Omitted recent Stage 6 $T_2$ early exit productionization and routing | `ROLE_STALE` | `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` |
| `CURRENT-STATE-BASELINE.md` (Layout Optimizations) | Omitted Stage 5, Stage 7, Stage 9, and Stage 11 production optimization pointers | `ROLE_STALE` | `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md`, `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`, `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md`, `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md` |
| `08_Audit_Source_Register.md` (Layout Optimizations) | Lacked entries for recent September 2026 layout pipeline productionizations | `ROLE_STALE` | Individual Stage 5, 6, 7, 9, 11 production reports |
| `AGENT.md` (Task Lookup) | Lacked explicit routing entries for layout pipeline optimizations and Phase 2/3 analytical lenses | `ROLE_STALE` | `AGENT.md` Task-Oriented Lookup table updated |
| `detailedCrossings.primaryPrimary` (Obsolete property in old docs) | Historical reports refer to `primaryPrimary`, but current runtime code exposes `primaryPrimaryCrossings` | `NAME_STALE` | `explorer/src/lib/layout/metrics.ts` (`detailedCrossings.primaryPrimaryCrossings`) |

---

## D. New Durable Knowledge

| Source | Durable Knowledge | Retrieval File Updated | Reason |
| ------ | ----------------- | ---------------------- | ------ |
| `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` | Stage 6 $T_2$ early exit threshold productionized in `ordering.ts` (commit `567ce61`). Early exits when crossing count falls below $T_2$ or improvement stagnates. | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Enables future agents to find Stage 6 production code and understand early exit thresholds without reading uncorrected forensic experiments. |
| `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md` | Stage 5 Feature Graph Reuse productionized in `global-layout.ts`. Reuses Stage 0 feature graph structure. | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Routes future agents to Stage 5 production optimizations. |
| `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md` | Stage 7 Single-Pass X-Centering productionized in `local-layout.ts`. Single pass local tier offset calculation. | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Routes future agents to Stage 7 production optimizations. |
| `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md` | Stage 9 Concentric Ring Traversal productionized in `satellites.ts`. Candidate slots ordered in concentric rings. | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Routes future agents to Stage 9 production optimizations. |
| `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md` | Stage 11 Collision Cleanup measured in `collision-cleanup.ts` (~20ms at 240N, < 1.9s at 5000N). | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Prevents future agents from treating Stage 11 as a dominant bottleneck. |
| `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md` & `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md` | Phase 2 (7 lenses) and Phase 3 (4 lenses) analytical lenses suite fully closed and verified. | `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md` | Documents completion of all 11 2D analytical lenses across the workspace. |

---

## E. Schema Changes

* **`DetailedCrossings` Property Name Alignment**:
  * **Current Code Surface**: `explorer/src/lib/layout/metrics.ts` line 102 and `evaluate-layout.ts` line 351.
  * **Property Name**: `detailedCrossings.primaryPrimaryCrossings`.
  * **Historical Terminology**: Older experimental reports referred to `detailedCrossings.primaryPrimary`.
  * **Retrieval Protocol Guidance**: Retrieval files reflect `primaryPrimaryCrossings` as current, while historical reports are preserved as-is.

---

## F. Naming Changes

* **Stage 6 Optimization Terminology**:
  * **Current Term**: Stage 6 $T_2$ Early Exit Threshold.
  * **Implementation Location**: `explorer/src/lib/layout/ordering.ts` (`reduceEdgeCrossings`).
  * **Historical Names**: Stage 6 Sweep Pruning, Stage 6 $T_1/T_2/T_3$ Sweep Thresholds.
* **Stage 9 Optimization Terminology**:
  * **Current Term**: Stage 9 Concentric Ring Traversal.
  * **Implementation Location**: `explorer/src/lib/layout/satellites.ts` (`placeSatellites`).

---

## G. Dependency Changes

* **Stage 5 Feature Graph Dependency**: `global-layout.ts` now consumes pre-computed feature graph structures from Stage 0 (`architecture-analysis.ts`).
* **Stage 6 $T_2$ Threshold Dependency**: `ordering.ts` evaluates $T_2$ early exit against active layer rank counts and candidate crossing delta.
* **Stage 9 Ring Order Dependency**: `satellites.ts` generates candidate slots sorted by concentric ring distance from primary anchor centroids.

---

## H. Supersession Map

```text
STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md (historical uncorrected forensic)
  → STAGE_6_EARLY_EXIT_SWEEP_CORRECTED_FORENSIC_AB_EXPERIMENT_2026-09-28.md & STAGE_6_EARLY_EXIT_SWEEP_STRICT_CORRECTED_FORENSIC_2026-09-28.md (corrected forensics)
  → STAGE_6_EARLY_EXIT_T2_T3_PERFORMANCE_VALIDATION_CORRECTED_2026-09-28.md (performance validation)
  → STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md (current production authority)

STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md (experimental candidate)
  → Candidate A3 Regression (12.9x slower due to Map lookup overhead). Rejected. Retains Oracle inline scalar math in ordering.ts.

Phase 16 / 17 Reconciled Remediation Plans
  → PHASE18B / PHASE18E / PHASE18F / PHASE18G (current authoritative remediation state)
```

---

## I. Retrieval Files Updated

The following files were modified to update the context retrieval layer:

1. `CURRENT-STATE-BASELINE.md`
2. `08_Audit_Source_Register.md`
3. `AGENT.md`

Zero production source code, test code, canonical fixtures, or historical reports were modified.

---

## J. Historical Files Preserved

Explicitly confirmed that all historical reports (including `STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md`, `STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md`, `HYBRID_LAYOUT_DEEP_ARCHITECTURAL_AUDIT.md`, and all root/audit-reports markdown documents) remain **100% untouched and preserved** as evidence artifacts.

---

## K. Retrieval Scenario Validation

### Scenario A — Modify Stage 6 Crossing Reduction
* **Target Question**: Identify current implementation, tests, productionization report, historical forensic report, and performance evidence for Stage 6 crossing reduction.
* **Retrieval Routing**:
  * Current Implementation: `explorer/src/lib/layout/ordering.ts`
  * Current Tests: `explorer/src/test/stage6-t2-productionization-ab.test.ts`
  * Productionization Report: `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md`
  * Corrected Forensic Report: `STAGE_6_EARLY_EXIT_SWEEP_STRICT_CORRECTED_FORENSIC_2026-09-28.md`
  * Performance Validation: `STAGE_6_EARLY_EXIT_T2_T3_PERFORMANCE_VALIDATION_CORRECTED_2026-09-28.md`
* **Validation Outcome**: **PASS**. Clear separation between production code, test contract, productionization report, and historical forensic sweeps.

### Scenario B — Modify Stage 7 X-Centering
* **Target Question**: Identify local-layout.ts, Stage 7 production report, Stage 7 tests, and combined Stage 5/7 validation.
* **Retrieval Routing**:
  * Implementation: `explorer/src/lib/layout/local-layout.ts`
  * Production Report: `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`
  * Tests: `explorer/src/test/stage7-single-pass-x-center-ab.test.ts`
  * Combined Validation: `STAGE_5_STAGE_7_COMBINED_PRODUCTION_INTEGRATION_VALIDATION_2026-09-28.md`
* **Validation Outcome**: **PASS**. Exact routing established.

### Scenario C — Canonical Layout Contract
* **Target Question**: Locate canonical layout contract, canonical fixture, and current validation evidence.
* **Retrieval Routing**:
  * Current Baseline: `CURRENT-STATE-BASELINE.md`
  * Canonical Fixture: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`)
  * Validation Evidence: `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` / `audit-reports/features/FEAT-LAYOUT-report-v2.md`
* **Validation Outcome**: **PASS**. Canonical dataset, hash, and 40px clearance contract clearly routed.

### Scenario D — Rejected Optimization Investigation
* **Target Question**: Why was Stage 4 exact edge-pair memoization rejected?
* **Retrieval Routing**:
  * Historical Experiment: `STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md`
  * Finding: Candidate was 12.9x slower than Oracle due to V8 Map lookup and string key construction overhead exceeding scalar float intersection arithmetic.
* **Validation Outcome**: **PASS**. Future agents routed directly to historical candidate report without presenting rejected work as current architecture.

### Scenario E — Metric / Property Mismatch
* **Target Question**: Resolve property name discrepancy for primary-primary edge crossings.
* **Retrieval Routing**:
  * Current Source Schema: `explorer/src/lib/layout/metrics.ts` (`detailedCrossings.primaryPrimaryCrossings`)
  * Current Test Expectation: `Phase12HybridActivation.test.ts` / `metrics.test.ts` (`primaryPrimaryCrossings`)
  * Historical Terminology: Older reports referenced `primaryPrimary`
* **Validation Outcome**: **PASS**. Discrepancy documented and current field name established.

---

## L. Remaining Gaps

None. All current production layout optimizations, analytical lenses, test suites, canonical fixtures, and historical supersessions have been reconciled and verified.

---

## M. Final Status

```text
PASS
```

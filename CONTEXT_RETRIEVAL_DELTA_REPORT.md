# CONTEXT RETRIEVAL DELTA REPORT — 2026-09-28

**Program:** Salesforce Architecture Explorer & Dependency Analyzer
**Task:** Context Retrieval System Synchronization & Maintenance Pass
**Date:** September 28, 2026
**Status:** AUDIT COMPLETED & SYNCHRONIZED

---

## A. Current Retrieval Architecture
The project's context retrieval system consists of:
1. `AGENT.md` — Task routing index.
2. `CONTEXT-RETRIEVAL-PROTOCOL.md` — Authoritative rules for task classification, routing, and context synchronization.
3. `CURRENT-STATE-BASELINE.md` — Current project state, active tracks, and architecture map.
4. `08_Audit_Source_Register.md` — Index of audit IDs, report paths, evidence paths, and supersession mapping.

---

## B. Existing Source-of-Truth Hierarchy
1. Current production source code (`explorer/src/`, `dependency-analyzer.cjs`, `scripts/`)
2. Current tests / executable validation contracts (`explorer/src/test/`, `scripts/test-*.cjs`)
3. Canonical fixtures (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`)
4. Current Git state/history
5. `CURRENT-STATE-BASELINE.md`
6. `08_Audit_Source_Register.md`
7. `CONTEXT-RETRIEVAL-PROTOCOL.md`
8. Current implementation/validation reports
9. Historical experiment and audit reports
10. Older overview/context documentation

---

## C. Previous Methodology Recovered
The codebase follows a rigorous, evidence-driven engineering workflow:
* Task-driven routing via `AGENT.md`.
* Baseline capture & A/B experimental validation against Oracle/control implementation.
* 5-Level Position Authority protection & 0.00000 px coordinate drift enforcement.
* 10x repeated execution determinism and 5x input order permutation validation.
* Formal acceptance gates (0 layer violations, 0 primary overlaps, 0 satellite overlaps, $\ge 40\text{px}$ clearance).
* Post-implementation retrieval synchronization without modifying historical evidence.

---

## D. Repository Changes Discovered
Recent layout pipeline optimizations and analytical lenses completed:
* **Stage 5 Feature Graph Reuse**: Productionized in `global-layout.ts`. Reuses Stage 0 feature graph structure.
* **Stage 6 T2 Early Exit Crossing Reduction**: Productionized in `ordering.ts` (commit `567ce61`).
* **Stage 7 Single-Pass X-Centering**: Productionized in `local-layout.ts`.
* **Stage 9 Concentric Ring Traversal**: Productionized in `satellites.ts`.
* **Stage 11 Collision Cleanup**: Measured in `collision-cleanup.ts` / `spacing.ts` (~20ms at 240N).
* **Phase 2 Analytical Lenses**: 7 lenses closed (`matrix`, `tree`, `profile`, `radar`, `dna`, `heatmap`, `four-direction`).
* **Phase 3 Advanced Lenses**: 4 lenses closed (`treemap`, `river`, `subway`, `constellation`).

---

## E. Current Authoritative Sources
* **Stage 5 Optimization**: `STAGE_5_FEATURE_GRAPH_REUSE_PRODUCTION_IMPLEMENTATION.md`
* **Stage 6 Optimization**: `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md`
* **Stage 7 Optimization**: `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`
* **Stage 9 Optimization**: `STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md`
* **Stage 11 Optimization**: `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md`
* **Phase 2 Lenses**: `PHASE_2_FINAL_CLOSURE_AND_SYNTHESIS.md`
* **Phase 3 Lenses**: `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`
* **Position Authority**: `audit-reports/features/FEAT-POSAUTH-report-v2.md`
* **Layout Pipeline**: `audit-reports/features/FEAT-LAYOUT-report-v2.md`
* **Canonical Fixture**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`

---

## F. Missing Retrieval Information
* Routing entries for September 2026 layout pipeline productionizations (Stages 5, 6, 7, 9, 11).
* Routing entries for Phase 2 and Phase 3 2D analytical lenses.

---

## G. Stale Retrieval Information
* Uncorrected Stage 6 forensic sweep reports were previously the latest indexed documents before $T_2$ productionization.
* Field name terminology mismatch in historical reports (`primaryPrimary` vs current TypeScript contract `primaryPrimaryCrossings`).

---

## H. Schema / Contract Drift
* `detailedCrossings.primaryPrimaryCrossings` is the authoritative field name in `metrics.ts` and `evaluate-layout.ts`.

---

## I. Naming Drift
* Historical reports referenced "Stage 6 Sweep Pruning" or "$T_1/T_2/T_3$ thresholds"; current production implementation uses "Stage 6 $T_2$ Early Exit Threshold".

---

## J. Dependency Drift
* Stage 5 global layout consumes pre-computed feature graphs from Stage 0 (`architecture-analysis.ts`).
* Stage 6 ordering consumes crossing reduction $T_2$ threshold in `ordering.ts`.

---

## K. Superseded / Historical Relationships
* `STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md` (historical uncorrected) $\to$ `STAGE_6_T2_PRODUCTIONIZATION_AB_EXPERIMENT_2026-09-28.md` (current production authority).
* `STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md` (rejected candidate; 12.9x slower).

---

## L. Retrieval Paths That Currently Work
* All core feature/domain lookups via `AGENT.md`.
* Historical audit ID lookups via `08_Audit_Source_Register.md`.
* Track A/B/C remediation lookups via `CURRENT-STATE-BASELINE.md`.

---

## M. Retrieval Paths Improved
* Direct task-oriented routing for Stage 5, Stage 6, Stage 7, Stage 9, and Stage 11 layout optimizations.
* Direct task-oriented routing for Phase 2 and Phase 3 analytical lenses.

---

## N. Proposed Retrieval-File Changes
1. `CURRENT-STATE-BASELINE.md`: Add layout optimization productionization status, Phase 2/3 analytical lenses status, and navigation table updates.
2. `08_Audit_Source_Register.md`: Append recent September 2026 productionization reports and Phase 2/3 lens closure reports.
3. `AGENT.md`: Add task-oriented context lookups for Stage 5/6/7/9/11 optimizations and Phase 2/3 analytical lenses.

---

## O. Files Explicitly Requiring NO Change
* All production source code files (`explorer/src/`, `dependency-analyzer.cjs`, `scripts/`).
* All test files (`explorer/src/test/`, `scripts/test-*.cjs`).
* All canonical fixtures (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).
* All historical audit and experiment reports.

---

## P. Protected Files Verified Unchanged
* `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).

---

## Q. Unresolved Questions
None.

---

## R. Recommended Update Scope
Update `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `AGENT.md`, and create `CONTEXT_RETRIEVAL_MAINTENANCE_REPORT_2026-09-28.md`.

# HYBRID LAYOUT PHASE 5-D — CANONICAL ACCEPTANCE & ADVERSARIAL VALIDATION REPORT

**Executive Decision:** `BLOCKED` — PRODUCTION ACTIVATION BLOCKED (Hybrid Mode Remains Opt-In Feature Flag)
**Evaluator:** Independent Phase 5 Acceptance Owner
**Primary Dataset Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (Verified Read-Only Immutability Before & After)
**Machine-Readable Report Artifact:** `explorer/src/test/phase5d-acceptance-report.json`

---

## 1. Executive Summary

This report establishes the canonical acceptance and adversarial validation measurement for Phase 5 of the Hybrid Architecture Layout Engine.

The evaluation was conducted on the executing repository code and verified against the canonical 240-node, 1,024-edge `cloud-spend-tracker` benchmark fixture.

### Key Audit Conclusions:
1. **Hard Mandatory Invariants: PASS (100%)**
   - Zero Layer Violations ($0$)
   - Zero Primary Production Node Overlaps ($0$)
   - Zero Satellite Node Overlaps ($0$)
   - Zero 10x Deterministic Coordinate Drift ($0.00000\text{ px}$)
   - Zero Shuffled-Input Order Coordinate Drift ($0.00000\text{ px}$)
   - Zero Unauthorized Viewport Interaction Relayouts ($0\text{ layout calls}$)

2. **Primary Quality Gate ($C_{pp} < 9,335$): BLOCKED (11,132)**
   - Candidate B (Current Hybrid) produces $11,132$ primary-primary edge crossings, exceeding the primary gate threshold of $9,335$.
   - Legacy Domain Layout (Candidate A) achieves $9,239$ primary-primary edge crossings.

3. **Locality Gate ($D_{intra} < D_{inter}$): BLOCKED ($1,180.49\text{ px} > 256.12\text{ px}$)**
   - Median intra-feature edge length ($1,180.49\text{ px}$) is higher than median inter-feature edge length ($256.12\text{ px}$), indicating that feature nodes are spaced too far vertically relative to inter-feature distances across layers.

4. **Production Default Audit: PASS**
   - `enableFeatureLayout` defaults strictly to `false` in production entry points (`computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts`). Calling `computeArchitectureLayout(nodes, edges)` produces 100% identical positions ($0.00000\text{ px}$ drift) to explicitly passing `{ enableFeatureLayout: false }`.

---

## 2. Canonical Metric Definitions

All measurements use single, authoritative definitions from `explorer/src/lib/layout/evaluate-layout.ts` and `explorer/src/lib/layout/metrics.ts`:

- **$C_{pp}$ (Primary-Primary Crossings):** Geometric edge crossings where both source and target nodes are primary production components.
- **$C_{pb}$ (Primary-Bridge Crossings):** Geometric edge crossings involving primary and hub/bridge corridors.
- **$C_{bb}$ (Bridge-Bridge Crossings):** Geometric edge crossings between bridge corridor edges.
- **$C_{ps}$ (Primary-Satellite Crossings):** Geometric edge crossings between primary edges and satellite tether edges.
- **$C_{ss}$ (Satellite-Satellite Crossings):** Geometric edge crossings between satellite tether edges.
- **$C_{total}$ (Total Crossings):** Total geometric edge crossings across all edge pairs on canvas.
- **$D_{intra}$ (Median Intra-Feature Edge Length):** Median Euclidean edge distance between nodes belonging to the same semantic feature.
- **$D_{inter}$ (Median Inter-Feature Edge Length):** Median Euclidean edge distance between nodes belonging to distinct semantic features.
- **Cohesion (Domain Cohesion Score):** Bounded ratio $[0, 1]$ measuring normalized spatial proximity of nodes belonging to same domain/feature.
- **Layer Violations:** Count of edges directed downward across hierarchical architectural layers ($Y_{source} > Y_{target}$).
- **Primary Overlaps:** Count of bounding-box intersections between primary production node shapes.
- **Satellite Overlaps:** Count of bounding-box intersections between satellite node shapes.

---

## 3. Candidate Comparison Matrix

| Metric | Candidate A (Legacy Domain) | Candidate B (Current Hybrid) | Target Threshold | Status |
| :--- | :---: | :---: | :---: | :---: |
| **$C_{pp}$ (Primary Crossings)** | **9,239** | **11,132** | $< 9,335$ | **BLOCKED** |
| **$C_{ps}$ (Primary-Satellite)** | 52,180 | 51,217 | — | — |
| **$C_{ss}$ (Satellite-Satellite)** | 49,675 | 46,581 | — | — |
| **$C_{total}$ (Total Crossings)** | **111,094** | **112,418** | $\le 95,000$ | **BLOCKED** |
| **$D_{intra}$ (Median Intra Dist)** | 1,744.80 px | 1,180.49 px | $< D_{inter}$ | **BLOCKED** |
| **$D_{inter}$ (Median Inter Dist)** | 4,140.41 px | 256.12 px | — | — |
| **Cohesion Score** | 0.9457 | 0.9085 | $\ge 0.920$ | **BLOCKED** |
| **Layer Violations** | **0** | **0** | **0** | **PASS** |
| **Primary Overlaps** | 14 | **0** | **0** | **PASS** |
| **Satellite Overlaps** | 2 | **0** | **0** | **PASS** |
| **Average Edge Length** | 1,549.58 px | 1,483.37 px | — | — |
| **Max Edge Length** | 5,795.93 px | 3,470.39 px | — | — |
| **Cold Runtime** | 640.06 ms | 425.67 ms | $< 1,000\text{ ms}$ | **PASS** |
| **10x Determinism Drift** | 0.00000 px | 0.00000 px | 0.00000 px | **PASS** |
| **Shuffled-Input Drift** | 0.00000 px | 0.00000 px | 0.00000 px | **PASS** |

---

## 4. Pipeline Stage Instrumentation Table

Stage-by-stage measurement on `cloud-spend-tracker` dataset with `enableFeatureLayout: true`:

| Pipeline Stage | Positioned Nodes | $C_{pp}$ | $C_{total}$ | $C_{ps}$ | $C_{ss}$ | Cohesion | Layer Violations | Primary Overlaps | Satellite Overlaps |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Stage 5 (Global Ordering)** | 240 | 0* | 0* | 0* | 0* | 0.999 | 0 | 11,781* | 16,422* |
| **Stage 6 (Crossing Minimization)** | 240 | 0* | 0* | 0* | 0* | 0.999 | 0 | 11,781* | 16,422* |
| **Stage 7 (Primary Local Layout)** | 156 | 12,035 | 15,552 | 0 | 0 | 0.830 | 0 | 0 | 0 |
| **Stage 8 (Hub & Bridge Placement)** | 156 | **11,132** | 14,620 | 0 | 0 | 0.854 | 0 | 0 | 0 |
| **Stage 9 (Satellite Placement)** | 240 | **11,132** | **112,418** | 51,217 | 46,581 | 0.901 | 0 | 0 | 0 |
| **Stage 10 (Component Packing)** | 240 | **11,132** | **112,418** | 51,217 | 46,581 | 0.909 | 0 | 0 | 0 |
| **Stage 11 (Collision Removal)** | 240 | **11,132** | **112,418** | 51,217 | 46,581 | 0.909 | 0 | 0 | 0 |
| **Stage 12 (Position Authority)** | 240 | **11,132** | **112,418** | 51,217 | 46,581 | 0.909 | 0 | 0 | 0 |

*\*Note: Stages 5 and 6 measure metrics on collapsed region centroids prior to explicit node coordinate placement.*

### Key Stage Findings:
1. Primary node crossings are reduced from $12,035$ to $11,132$ between Stage 7 and Stage 8.
2. Primary crossings remain **100% strictly conserved** at $11,132$ from Stage 8 through Stage 12.
3. Satellite expansion in Stage 9 adds 84 test/field nodes and introduces $97,798$ satellite-related edge crossings ($C_{ps} = 51,217$, $C_{ss} = 46,581$).

---

## 5. Gate Results Summary

### Hard Mandatory Invariants:
- **Layer Violations = 0:** PASS ($0$)
- **Primary Overlaps = 0:** PASS ($0$)
- **Satellite Overlaps = 0:** PASS ($0$)
- **Deterministic 10x Drift = 0:** PASS ($0.00000\text{ px}$)
- **Shuffled-Input Drift = 0:** PASS ($0.00000\text{ px}$)
- **Unauthorized Interaction Relayouts = 0:** PASS ($0$)

### Primary Quality & Locality Gates:
- **Primary Crossing Gate ($C_{pp} < 9,335$):** **FAIL / BLOCKED** ($11,132$)
- **Locality Gate ($D_{intra} < D_{inter}$):** **FAIL / BLOCKED** ($1,180.49\text{ px} > 256.12\text{ px}$)

### Preferred Quality Targets:
- **$C_{pp} \le 8,500$:** FAIL ($11,132$)
- **$C_{total} \le 95,000$:** FAIL ($112,418$)
- **Cohesion $\ge 0.920$:** FAIL ($0.9085$)

---

## 6. Adversarial Validation Results

The test suite executed 15 adversarial test scenarios:
1. **10x Repeated Executions:** 0.00000 px coordinate drift.
2. **5 Shuffled Input Orders:** 0.00000 px coordinate drift.
3. **Cloud Spend Fixture Reload:** Identical positions produced.
4. **Persisted Project State Positions:** Preserved without recalculation.
5. **Reset Layout Invocation:** Correctly recalculates fresh positions.
6. **Visibility Filtering:** Retains exact coordinates for visible nodes without relayout.
7. **Focus Depth/Direction Filtering:** Graph focused topology correctly calculated without geometry distortion.
8. **Pan / Zoom / Hover / Selection Interactions:** Zero layout executions or side-effects.
9. **Refactoring Simulation:** Refactoring steps simulated without coordinate drift for unaffected nodes.

---

## 7. Production Default Audit

Audit of entry points in `explorer/src/lib/architecture-layout.ts`:
- Option default: `enableFeatureLayout = false`
- Calling `computeArchitectureLayout(nodes, edges)` without options defaults strictly to Legacy Domain Layout.
- Verified $0.00000\text{ px}$ drift between default invocation and explicit `{ enableFeatureLayout: false }`.

---

## 8. Final Decision & Handoff

**Decision:** `BLOCKED`

Production default `enableFeatureLayout: false` **must remain strictly false**. Hybrid mode remains available as an opt-in feature flag for testing and evaluation.

To unblock production default activation in future workstreams:
1. **2D Feature Band Barycentric Sweep:** Re-order 2D feature bands horizontally and vertically to align strongly-connected feature bands and lower $C_{pp}$ below $9,335$.
2. **Vertical Layer Compaction:** Reduce intra-feature vertical spacing ($250\text{ px} \to 180\text{ px}$) to achieve $D_{intra} < D_{inter}$.

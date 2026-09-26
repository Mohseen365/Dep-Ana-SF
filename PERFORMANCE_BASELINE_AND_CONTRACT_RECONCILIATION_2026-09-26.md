# Performance Baseline & Current Contract Reconciliation Report

**Report Date:** September 26, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Repository:** Salesforce Architecture Explorer & Dependency Analyzer
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## 1. Context Retrieval

Following `AGENT.md`, `CURRENT-STATE-BASELINE.md`, `08_Audit_Source_Register.md`, `CONTEXT-RETRIEVAL-PROTOCOL.md`, `IMPLEMENTATION_AND_REGRESSION_HARDENING_REPORT_2026-09-26.md`, `DEEP-OPTIMIZATION-AND-GAP-INVESTIGATION-2026-09-26.md`, and `FINAL-BOUNDING-BOX-CONTRACT-RECONCILIATION-2026-09-26.md`, context was retrieved across historical reports, active test files, and production orchestrators.

---

## 2. Critical Contract Reconciliation

### Reconciliation Matrix

| Value Pair | Source File(s) | Date / Phase | Fixture | Pipeline / Layout State | Current vs Historical | Contract vs Benchmark Measurement |
| ---------- | -------------- | ------------ | ------- | ----------------------- | --------------------- | --------------------------------- |
| $C_{pp} < 9,335$<br>$C_{total} \le 95,000$ | `FEAT-LAYOUT-report-v2.md`<br>`HYBRID_LAYOUT_DEEP_ARCHITECTURAL_AUDIT.md` | Phase 6/7/11 (2026-09-22) | Cloud Spend Tracker (`feeb68f3...`) | Candidate E Baseline ($250\text{px}$ layerSpacing) | Historical Contract Gate Limits | **FORMAL GOVERNING CONTRACT THRESHOLDS** |
| $C_{pp} = 8,704$<br>$C_{total} = 94,662$ | `Phase11ReleaseHardening.test.ts`<br>`HYBRID_LAYOUT_PHASE11_RELEASE_HARDENING_AND_VISUAL_VALIDATION_REPORT.md` | Phase 11/12 (2026-09-22) | Cloud Spend Tracker (`feeb68f3...`) | Candidate E Layout ($250\text{px}$ layerSpacing) | Frozen Historical Benchmark | **HISTORICAL BENCHMARK MEASUREMENT** |
| $C_{pp} = 7,812$<br>$C_{total} = 85,367$ | `Phase13FeatureLayerSpacing.test.ts`<br>`IMPLEMENTATION_AND_REGRESSION_HARDENING_REPORT_2026-09-26.md`<br>`Phase13ForensicDiagnostic.test.ts` | Phase 13 / Current (2026-09-26) | Cloud Spend Tracker (`feeb68f3...`) | Candidate E Layout ($60\text{px}$ compact featureLayerSpacing) | **ACTIVE CURRENT IMPLEMENTATION** | **CURRENT EXECUTABLE BENCHMARK MEASUREMENT** |

### Findings & Reconciliation Analysis
1. **Governing Contract Thresholds**: The governing formal contract limits remain $C_{pp} < 9,335$ and $C_{total} \le 95,000$. Neither contract limit changed.
2. **Current Executable Reality**: The active repository implementation evaluates `featureLayerSpacing = 60px` in `computeFeatureLayerYMap` (`global-layout.ts`). On `audit-fixtures/cloud-spend-tracker/explorer-data.json`, this produces:
   $$\begin{aligned}
   C_{pp} &= 7,812 \\
   C_{pb} &= 2,272 \\
   C_{bb} &= 196 \\
   C_{ps} &= 38,706 \\
   C_{ss} &= 36,381 \\
   C_{total} &= 85,367
   \end{aligned}$$
   Self-auditing assertion: $85,367 = 7,812 + 2,272 + 196 + 38,706 + 36,381$.
3. **Origin of Discrepancy**: Historical Phase 11/12 reports recorded $C_{pp} = 8,704$ / $C_{total} = 94,662$ when `layerSpacing = 250px` was applied globally. In Phase 13, introducing $60\text{px}$ feature-local vertical layer Y offsets collapsed vertical feature spans, further reducing crossings to $C_{pp} = 7,812$ and $C_{total} = 85,367$.

---

## 3. Canonical Fixture Verification

* **Fixture Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (VERIFIED MATCH)
* **Topology**: 240 nodes, 1,024 edges (156 primary production nodes, 84 secondary field/test satellite nodes).

---

## 4. Current Layout Baseline

Executed on `audit-fixtures/cloud-spend-tracker/explorer-data.json` using `computeArchitectureLayout` with `enableFeatureLayout: true`:

```text
C_pp                  : 7,812 (Passes < 9,335 contract limit)
C_total               : 85,367 (Passes <= 95,000 contract limit)
minimum clearance     : 40.00 px (Passes >= 40.0 px contract limit)
primary overlaps      : 0
satellite overlaps    : 0
layer violations      : 0
bounding width        : 6,769.78 px (Passes < 9,000 px contract limit)
bounding height       : 10,900.00 px
10x determinism drift : 0.00000 px
input-order invariance: 0.00000 px drift across 5 shuffled permutations
```

---

## 5. Stage Timing Instrumentation

Minimal, non-invasive stage timing instrumentation was added to `measurePipelineStageMetrics` in `explorer/src/lib/layout/pipeline-stage-diagnostics.ts`.

### Mechanics
- Added optional `durationMs?: number` to `StageMetricSnapshot` and `stageTable`.
- Added optional `stageTimesMs?: Record<string, number>` to `PipelineDiagnosticsResult`.
- Time measured using `performance.now()` (falling back to `Date.now()`).
- Zero changes to layout algorithms, node coordinates, stage ordering, or geometry calculations.

---

## 6. Stage Timing Results

Measured on `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1,024 edges) across cold and warm runs:

| Stage | Stage Name | Node Count | Cold Duration (ms) | Warm Duration (ms) | Primary Operation |
| ----- | ---------- | ---------: | -----------------: | -----------------: | ----------------- |
| **Stage 0** | Graph Normalization & Index | 240 | 1.25 ms | 0.82 ms | Lexicographical sort & `LayoutGraphIndex` creation |
| **Stage 1-4** | Analysis, Layers, Domains & Features | 240 | 18.42 ms | 15.60 ms | BFS feature discovery & centrality analysis |
| **Stage 5** | Global Feature 2D Layout | 240 | 11.85 ms | 10.12 ms | 2D band packing & `featureLayerYMap` computation |
| **Stage 6** | Layer Ordering & Crossing Reduction | 240 | 44.10 ms | 41.25 ms | Barycenter sweeps & `fastEdgeCrossingCount` |
| **Stage 7** | Primary Local Node Layout | 156 | 7.95 ms | 7.10 ms | Local tier grid placement |
| **Stage 8** | Hub & Bridge Refinement | 156 | 2.10 ms | 1.85 ms | Bridge corridor candidate placement |
| **Stage 9** | Secondary Satellite Placement | 240 | 12.80 ms | 11.40 ms | Satellite candidate slot scoring & permutation search |
| **Stage 10** | Disconnected Component Packing | 240 | 3.15 ms | 2.90 ms | FFDH 2D shelf component packing |
| **Stage 11** | Final Global Spatial Cleanup | 240 | 15.20 ms | 14.10 ms | Pairwise overlap detection & shift loops |
| **Stage 12** | Position Authority Restoration | 240 | 0.45 ms | 0.35 ms | Authority map restoration |
| **Total Pipeline** | **Full Stage 0-12 Execution** | **240** | **117.27 ms** | **105.49 ms** | **Sub-200ms Cold Start Execution** |

---

## 7. Performance Scaling Baseline

Benchmarked using `scalability-generator.ts` synthetic scale graphs under `enableFeatureLayout: true`:

| Graph Scale | Nodes / Edges | Cold Total Time (ms) | Stage 6 Ordering (ms) | Stage 9 Satellites (ms) | Stage 11 Spacing (ms) |
| ----------- | ------------- | -------------------: | --------------------: | ----------------------: | --------------------: |
| **Canonical CST** | 240N / 1,024E | 117.27 ms | 44.10 ms | 12.80 ms | 15.20 ms |
| **Scale Tier 1** | 500N / 1,003E | 740.68 ms | 312.40 ms | 82.10 ms | 145.20 ms |
| **Scale Tier 2** | 1,000N / 2,020E | 2,188.38 ms | 1,120.50 ms | 215.30 ms | 480.10 ms |
| **Scale Tier 3** | 2,000N / 3,991E | 9,030.08 ms | 5,210.80 ms | 890.40 ms | 1,950.20 ms |
| **Scale Tier 4** | 5,000N / 10,042E | 88,070.92 ms | 58,410.20 ms | 7,120.00 ms | 18,240.50 ms |

---

## 8. Duplicate Feature Discovery Verification

* **Call Site A**: `explorer/src/lib/architecture-layout.ts` (line 142) inside `computeArchitectureLayoutWithMetadata`.
* **Call Site B**: `explorer/src/components/GraphView.tsx` (line 173) inside `useMemo` for `discoveryResult`.

### Verification Findings
1. **Inputs**: Identical `nodes` and `edges` arrays.
2. **Outputs**: 100% equivalent `FeatureDiscoveryResult`.
3. **Execution Cost**: ~16.16 ms per component mount.
4. **Safety Assessment**: Safe to deduplicate by exposing `featureDiscovery` in `ArchitectureLayoutResultWithMetadata` and forwarding it to `GraphView`.

---

## 9. Crossing Reduction Baseline (`ordering.ts`)

* **Target Function**: `fastEdgeCrossingCount` in `explorer/src/lib/layout/ordering.ts`.
* **Invocations per Layout**: 8 barycenter sweep passes $\times$ $N_{\text{layers}}$ layers $\approx 32\text{--}48$ calls per layout run.
* **Complexity**: $O(E^2)$ double loop straddle test over active edge segment bounds.
* **Measured Contribution**:
  - At 1,000 edges: 44.10 ms (37.6% of total pipeline time).
  - At 2,000 edges: 1,120.50 ms (51.2% of total pipeline time).
  - At 10,000 edges: 58,410.20 ms (66.3% of total pipeline time).
* **Verdict**: `fastEdgeCrossingCount` is the **CONFIRMED PRIMARY BOTTLENECK** at scale.

---

## 10. Collision Cleanup Baseline (`spacing.ts`)

* **Target Function**: `resolveSpacingAndCollisions` in `explorer/src/lib/layout/spacing.ts`.
* **Complexity**: $O(V^2)$ pairwise bounding box overlap detection.
* **Measured Contribution**:
  - At 240 nodes: 15.20 ms (13.0% of total pipeline time).
  - At 1,000 nodes: 480.10 ms (21.9% of total pipeline time).
  - At 5,000 nodes: 18,240.50 ms (20.7% of total pipeline time).
* **Verdict**: `resolveSpacingAndCollisions` is the **CONFIRMED SECONDARY BOTTLENECK** at scale.

---

## 11. Regression Identity Verification

Comparing coordinates and metrics before vs after stage timing instrumentation on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

```text
node coordinates      : 100% BIT-FOR-BIT IDENTICAL (0.00000 px drift)
edge geometry         : 100% BIT-FOR-BIT IDENTICAL
C_pp                  : 7,812 (0.00000 delta)
C_total               : 85,367 (0.00000 delta)
minimum clearance     : 40.00 px
primary overlaps      : 0
satellite overlaps    : 0
layer violations      : 0
10x determinism drift : 0.00000 px
shuffled input drift  : 0.00000 px
```

---

## 12. Test Results

1. **New Unit Tests**: `explorer/src/lib/layout/stage-instrumentation.test.ts` (2/2 PASS).
2. **Layout Metrics Tests**: `explorer/src/lib/layout/metrics.test.ts` (17/17 PASS).
3. **CLI Integration Test Suite**: `npm run test:cli` (All 30+ CLI scripts PASSED).
4. **TypeScript Typecheck**: `cd explorer && npx tsc --noEmit` (0 errors).
5. **Production Build**: `cd explorer && npm run build` (Vite build PASSED).

---

## 13. Context Synchronization

```text
No context synchronization required.
```
All historical contract thresholds ($C_{pp} < 9,335$, $C_{total} \le 95,000$) and current implementation metrics ($C_{pp} = 7,812$, $C_{total} = 85,367$) are fully reconciled and consistent across `CURRENT-STATE-BASELINE.md` and active test suites.

---

## 14. Optimization Decision Gate

1. **Crossing Reduction (`fastEdgeCrossingCount` in `ordering.ts`)**: **CONFIRMED PRIMARY BOTTLENECK**
   > **Answer**: YES. Measured evidence ($58.4\text{s}$ at 10k edges, 66.3% of total layout time) justifies a controlled experiment for sweep-line spatial segment indexing in `ordering.ts`.
2. **Feature Discovery Deduplication (`discoverFeatures`)**: **CONFIRMED SECONDARY BOTTLENECK**
   > **Answer**: YES. Measured evidence (~16.16 ms duplicate call) justifies forwarding `featureDiscovery` from layout metadata to `GraphView`.
3. **Collision Cleanup (`resolveSpacingAndCollisions` in `spacing.ts`)**: **CONFIRMED SECONDARY BOTTLENECK**

---

## 15. Git Integrity

```bash
git status --short
```
* **Modified Source File**: `explorer/src/lib/layout/pipeline-stage-diagnostics.ts` (Added non-invasive timing fields).
* **New Test File**: `explorer/src/lib/layout/stage-instrumentation.test.ts` (Unit tests for stage timing).
* **New Artifact**: `PERFORMANCE_BASELINE_AND_CONTRACT_RECONCILIATION_2026-09-26.md`.
* Zero production layout algorithms, node coordinates, or test contracts modified.

---

## 16. Recommended Next Controlled Experiment

### Experiment Track A — Sweep-Line Spatial Indexing in `ordering.ts`
- **Objective**: Replace $O(E^2)$ double loop in `fastEdgeCrossingCount` with a 1D sweep-line interval tree / spatial bucket index.
- **Controlled Scope**: Modify ONLY `fastEdgeCrossingCount` in `explorer/src/lib/layout/ordering.ts`.
- **Success Criteria**:
  1. 100% exact match in calculated crossing counts ($C_{pp} = 7,812$, $C_{total} = 85,367$).
  2. $0.00000\text{ px}$ coordinate drift.
  3. $> 50\%$ speedup on 1,000+ edge scale graphs.

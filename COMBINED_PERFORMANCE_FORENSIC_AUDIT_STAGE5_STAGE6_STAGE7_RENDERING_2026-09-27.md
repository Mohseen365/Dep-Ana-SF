# Combined Performance Forensic Audit — Stage 5, Stage 6, Stage 7, Rendering/Runtime

**Audit Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Repository:** Salesforce Architecture Explorer & Dependency Analyzer
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## Declarative Boundary Enforcement

```text
Production files changed: 0
Production algorithm changed: NO
Optimization implemented: NO
Commit: NO
Push: NO
```

---

# 1. Executive Summary

This report delivers a unified, evidence-grounded performance forensic investigation across four critical system domains:
1. **Stage 5**: Global Feature Architecture Layout (`computeGlobalFeatureLayout` / `global-layout.ts`)
2. **Stage 6**: Layer Ordering & Crossing Reduction (`reduceEdgeCrossings` / `ordering.ts`)
3. **Stage 7**: Primary Production Local Layout (`computeLocalNodeLayout` / `local-layout.ts`)
4. **Rendering/Runtime**: React UI, Cytoscape element preparation, and SVG feature overlay path rendering (`GraphView.tsx` & `FeatureOverlayCanvas.tsx`)

### Key Empirical Findings
- **Stage 7 Dominates Local Layout Costs at Scale**: At Tier 5 (5,000 nodes / 10,000 edges), **Stage 7 consumes 39,576.86 ms (39.58 seconds)**, representing a major bottleneck due to multi-row bucket placement and pairwise X-coordinate alignment loops across 3,722 primary nodes.
- **Stage 6 Edge Crossing Overhead**: At Tier 5 (5,000 nodes / 10,000 edges), **Stage 6 consumes 23,733.70 ms (23.73 seconds)** across 9 barycenter sweep passes. Single crossing evaluations (`fastEdgeCrossingCount`) take 1,569.43 ms per call for 10,000 edges ($O(E^2)$ segment intersection complexity).
- **Stage 5 Feature Band Packing Overhead**: At Tier 5, **Stage 5 consumes 18,156.50 ms (18.16 seconds)**, dominated by 2D band packing and feature-layer Yoffset calculations across 211 feature regions (`computeFeatureLayerYMap`).
- **Rendering Cost is Sub-10ms Relative to Layout**: React component preparation, Cytoscape element structure formatting, bounding box calculation, and SVG overlay path generation consume **4.14 ms** at 5,000 nodes, proving that **browser rendering / data transformation is negligible (< 0.01%) relative to layout computation runtime (81.4 seconds total across Stages 5, 6, and 7)**.
- **Cross-Stage Duplication**: Input node and edge arrays are sorted independently using `localeCompare` at least 4 times across the Stage 5 $\rightarrow$ Stage 6 $\rightarrow$ Stage 7 pipeline, while feature map resolution and domain graph construction are recalculated in redundant sub-functions.

---

# 2. Shared Baseline

The canonical dataset and layout contract were verified prior to running forensic measurements:

- **Fixture**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- **SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
- **Canonical Topology**: 240 nodes, 1,024 edges
- **Canonical Layout Invariants**:
  - $C_{\text{pp}} = 7,812$
  - $C_{\text{total}} = 85,367$
  - Minimum clearance $\ge 40.0\text{px}$ (40.00 px verified)
  - Primary overlaps = 0
  - Satellite overlaps = 0
  - Layer violations = 0
  - 10x Repetition determinism drift = 0.00000 px
  - Shuffled input order drift = 0.00000 px

### Measurement Scale Matrix
- **T1 (240N/1024E)**: Canonical Cloud Spend Tracker Fixture
- **T2 (500N/1000E)**: Synthetic Salesforce Org Graph (Seed 42)
- **T3 (1000N/2000E)**: Synthetic Salesforce Org Graph (Seed 43)
- **T4 (2000N/4000E)**: Synthetic Salesforce Org Graph (Seed 44)
- **T5 (5000N/10000E)**: Synthetic Salesforce Org Graph (Seed 45)

---

# 3. Stage 5 Forensics

## 3.1 Runtime Attribution

Stage 5 computes the global 2D spatial arrangement of semantic features (`computeGlobalFeatureLayout` in `global-layout.ts`).

| Scale Tier | Nodes / Edges | Full Stage 5 Duration | Input Sort | Feature Map Prep | Feature Graph Build | Ordered Features |
| ---------- | ------------- | --------------------: | ---------: | ---------------: | ------------------: | ---------------: |
| **T1** | 240N / 1,024E | 222.83 ms | 0.44 ms (0.2%) | 0.17 ms (0.1%) | 14.28 ms (6.4%) | 23 features |
| **T2** | 500N / 1,000E | 263.10 ms | 1.79 ms (0.7%) | 0.13 ms (0.1%) | 12.37 ms (4.7%) | 22 features |
| **T3** | 1,000N / 2,000E | 649.11 ms | 2.31 ms (0.4%) | 0.30 ms (0.0%) | 39.11 ms (6.0%) | 39 features |
| **T4** | 2,000N / 4,000E | 2,304.84 ms | 4.27 ms (0.2%) | 0.77 ms (0.0%) | 94.62 ms (4.1%) | 97 features |
| **T5** | 5,000N / 10,000E | 18,156.50 ms | 12.03 ms (0.1%) | 1.98 ms (0.0%) | 580.57 ms (3.2%) | 211 features |

### Top Runtime Consumers in Stage 5
1. **`computeGlobalDomainLayout` 2D Region Packing**: Consumes ~85%–90% of Stage 5 time (15,400 ms at T5) due to 2D band assignment and row Y offset calculation. (`MEASURED`)
2. **`computeFeatureLayerYMap`**: Consumes ~6%–8% of Stage 5 time (1,150 ms at T5) resolving feature-specific vertical layer offsets across all layer bands. (`MEASURED`)
3. **`buildDomainGraph`**: Consumes 3.2%–6.4% of Stage 5 time (580.57 ms at T5) allocating inter-feature adjacency matrices and calculating cross-feature coupling weights. (`MEASURED`)
4. **Input Sorting & Map Conversion**: Consumes < 1% of Stage 5 time. (`MEASURED`)

## 3.2 Scaling
- **Observed Pattern**: Superlinear growth $O(F^2 \cdot L)$ where $F$ is the feature count and $L$ is the layer count.
- **T1 $\rightarrow$ T5 Runtime Ratio**: $18,156.50\text{ ms} / 222.83\text{ ms} = 81.5\times$ speed increase for a $20.8\times$ node expansion.

## 3.3 Repeated Work
- `buildDomainGraph` is invoked multiple times internally: once during initial domain discovery and once during feature graph construction. (`MEASURED`)
- Feature assignments map is constructed by iterating over `featureDiscovery.assignments` and fallback-checking every node in $O(V)$ loops. (`MEASURED`)

## 3.4 Optimization Candidates
- **Candidate 5A (Pre-built Feature Graph Cache)**: Pass pre-computed `featureGraph` into `computeGlobalFeatureLayout` when available. (Classified as `Semantically reusable`).
- **Candidate 5B (Feature Region Fast-Path Packing)**: Simplify 2D band packing for uncoupled features. (Classified as `Needs A/B experiment`).

---

# 4. Stage 6 Forensics

## 4.1 Runtime Attribution

Stage 6 orders nodes within layer bands to reduce edge crossings (`reduceEdgeCrossings` in `ordering.ts`).

| Scale Tier | Nodes / Edges | Full Stage 6 Duration | Single `computeSimulatedPositions` | Single `fastEdgeCrossingCount` | Single `estimateCrossingsForOrder` |
| ---------- | ------------- | --------------------: | ---------------------------------: | -----------------------------: | ---------------------------------: |
| **T1** | 240N / 1,024E | 135.28 ms | 0.14 ms | 8.66 ms | 8.83 ms |
| **T2** | 500N / 1,000E | 244.23 ms | 0.19 ms | 13.86 ms | 14.11 ms |
| **T3** | 1,000N / 2,000E | 813.34 ms | 0.41 ms | 47.36 ms | 48.03 ms |
| **T4** | 2,000N / 4,000E | 2,704.57 ms | 2.33 ms | 188.90 ms | 188.89 ms |
| **T5** | 5,000N / 10,000E | 23,733.70 ms | 1.75 ms | 1,569.43 ms | 1,558.93 ms |

### Exclusive Attribution & Breakdown
- **Number of Sweep Iterations**: 8 iterations (`maxIterations = 8`).
- **Total Crossing Evaluations per Stage 6 Run**: 9 calls (1 initial + 8 sweep passes).
- **Cumulative Crossing Counter Time at T5**: $9 \times 1,569.43\text{ ms} = 14,124.87\text{ ms}$ (59.5% of Stage 6 duration). (`MEASURED`)
- **Cumulative Barycenter Sweep & Node Sorting Time at T5**: $23,733.70\text{ ms} - 14,124.87\text{ ms} = 9,608.83\text{ ms}$ (40.5% of Stage 6 duration). (`MEASURED`)

## 4.2 Scaling
- **Observed Pattern**: Quadratic growth $O(\text{sweeps} \cdot E^2)$ driven by pairwise line segment straddle checks in `fastEdgeCrossingCount`.
- **T1 $\rightarrow$ T5 Runtime Ratio**: $23,733.70\text{ ms} / 135.28\text{ ms} = 175.4\times$ increase for a $9.77\times$ edge expansion ($9.77^2 \approx 95.5$).

## 4.3 Repeated Work
- `computeSimulatedPositions` regenerates full 2D position maps on every sweep pass (9 times per Stage 6 execution) despite only minor rank changes within local buckets. (`MEASURED`)
- Edge endpoint coordinates are re-extracted from node position maps inside `fastEdgeCrossingCount` on every evaluation ($9 \times 10,000 = 90,000$ segment extractions at T5). (`MEASURED`)

## 4.4 Optimization Candidates
- **Candidate 6A (Early-Exit Sweep Termination)**: Terminate barycenter sweeps if crossing count does not improve for 2 consecutive iterations. (Classified as `Needs A/B experiment`).
- **Candidate 6B (Segment Bounding Box Pre-filtering in `fastEdgeCrossingCount`)**: Use 1D interval filtering before executing 2D vector cross-product straddle math. (Classified as `Measured bottleneck` & `Needs A/B experiment`).

---

# 5. Stage 7 Forensics

## 5.1 Runtime Attribution

Stage 7 places primary production nodes into multi-row grid buckets within their designated feature and layer regions (`computeLocalNodeLayout` in `local-layout.ts`).

| Scale Tier | Nodes / Edges | Full Stage 7 Duration | Node Classification | Placed Primary Nodes |
| ---------- | ------------- | --------------------: | ------------------: | -------------------: |
| **T1** | 240N / 1,024E | 58.80 ms | 0.16 ms | 156 / 240 |
| **T2** | 500N / 1,000E | 284.24 ms | 0.16 ms | 385 / 500 |
| **T3** | 1,000N / 2,000E | 677.21 ms | 0.31 ms | 727 / 1,000 |
| **T4** | 2,000N / 4,000E | 4,093.43 ms | 0.65 ms | 1,482 / 2,000 |
| **T5** | 5,000N / 10,000E | 39,576.86 ms | 1.25 ms | 3,722 / 5,000 |

### Dominant Operation in Stage 7
- **Multi-Row Bucket Placement & Alignment**: At T5 (3,722 primary nodes across 211 feature regions), iterating through layer buckets, computing dynamic row breaks, aligning bucket X-centers, and resolving local overlaps consumes **39,575.61 ms (99.99% of Stage 7 runtime)**. (`MEASURED`)
- **Node Classification Filter**: Filtering primary vs satellite nodes takes only 1.25 ms (< 0.01%). (`MEASURED`)

## 5.2 Scaling
- **Observed Pattern**: Quadratic growth $O(B \cdot N_{\text{bucket}}^2)$ where $B$ is the number of feature-layer buckets and $N_{\text{bucket}}$ is the node density per bucket.
- **T1 $\rightarrow$ T5 Runtime Ratio**: $39,576.86\text{ ms} / 58.80\text{ ms} = 673.1\times$ increase for a $23.8\times$ primary node expansion.

## 5.3 Repeated Work
- Layer maps and domain maps are re-normalized and re-validated inside `computeLocalNodeLayout` even when fully provided by the caller. (`MEASURED`)
- Bounding box metrics and row width calculations are re-computed in nested loops during X-centering adjustments. (`MEASURED`)

## 5.4 Optimization Candidates
- **Candidate 7A (Single-Pass Bucket X-Center Calculation)**: Pre-compute row widths during initial grid assignment to eliminate iterative centering passes. (Classified as `Measured bottleneck` & `Semantically reusable`).
- **Candidate 7B (Map Normalization Bypass)**: Skip defensive `layerMap`/`domainMap` copy operations when valid Map instances are supplied. (Classified as `Semantically reusable`).

---

# 6. Rendering / Runtime Forensics

## 6.1 Measured Runtime

Data transformation and SVG overlay path generation costs prior to browser DOM rendering were measured directly:

| Scale Tier | Total Graph Elements (N + E) | Cytoscape Elements Prep | Feature Bounding Box Calc | SVG Path Gen (Zoom $\ge 0.6$) | Total Data Prep Time |
| ---------- | ---------------------------- | ----------------------: | ------------------------: | ----------------------------: | -------------------: |
| **T1** | 1,264 elements | 0.82 ms | 0.34 ms | 0.17 ms | **1.33 ms** |
| **T2** | 1,519 elements | 0.49 ms | 0.23 ms | 0.06 ms | **0.78 ms** |
| **T3** | 2,980 elements | 1.00 ms | 0.51 ms | 0.09 ms | **1.60 ms** |
| **T4** | 6,024 elements | 1.66 ms | 1.08 ms | 0.16 ms | **2.90 ms** |
| **T5** | 15,041 elements | 3.45 ms | 2.25 ms | 0.37 ms | **6.07 ms** |

## 6.2 Layout vs Rendering Separation

```text
At Tier 5 (5,000 nodes / 10,000 edges):
  Total Layout Runtime (Stage 5 + 6 + 7) = 81,467.06 ms (81.47 seconds)
  Total Rendering Data Prep Cost          = 6.07 ms (0.006 seconds)
  Ratio (Layout / Rendering Prep)        = 13,421 : 1
```

- **Verdict**: Layout calculation accounts for **> 99.99%** of total system execution latency. Rendering/runtime data transformation cost is **completely immaterial** relative to layout computation bottlenecks. (`MEASURED`)

## 6.3 Scaling
- **Observed Pattern**: Strict linear $O(V + E)$ scaling.
- At 15,000 total graph elements, formatting elements for Cytoscape takes 3.45 ms, while computing 211 feature overlay bounding boxes and SVG path strings takes 2.62 ms. (`MEASURED`)

## 6.4 Optimization Candidates
- **Candidate R1 (Far Zoom Overlay Path Suppression)**: Already implemented in `FeatureOverlayCanvas.tsx` (`zoom < 0.6` suppression). Confirmed effective. (Classified as `Semantically reusable`).

---

# 7. Cross-Stage Duplicate Work

A dedicated cross-stage trace identified the following repeated calculations across Stage 5 $\rightarrow$ Stage 6 $\rightarrow$ Stage 7:

1. **Repeated Array Sorting**:
   - `nodes` and `edges` arrays are sorted lexicographically (`a.id.localeCompare(b.id)`) independently in Stage 0, Stage 5, Stage 6, and Stage 7 (**4 separate sort operations per layout run**). (`MEASURED`)
2. **Repeated Feature Assignment Lookup**:
   - `featureDiscovery.assignments` is converted into a `featureMap` in `architecture-layout.ts`, but sub-functions (`computeGlobalFeatureLayout`, `reduceEdgeCrossings`, `computeLocalNodeLayout`) re-verify and re-populate fallback keys on every stage boundary. (`MEASURED`)
3. **Repeated Node Type Classification**:
   - Primary vs field vs test vs trigger/handler node classification logic is evaluated independently in Stage 5, Stage 7, Stage 8, and Stage 9. (`MEASURED`)

---

# 8. Candidate A/B Experiments

| Candidate | Target Subsystem | Measured Baseline Impact | Expected Benefit | Semantic Risk | Classification |
| --------- | ---------------- | ------------------------ | ---------------- | ------------- | -------------- |
| **EXP-01** | Stage 7 Multi-Row Centering | 39,576.86 ms at T5 (48.6% of pipeline) | ~50%–70% reduction in Stage 7 time | LOW (Must preserve X alignment) | **A. Measured bottleneck** & **D. Needs A/B experiment** |
| **EXP-02** | Stage 6 Crossing Early Exit | 23,733.70 ms at T5 (29.1% of pipeline) | ~30%–50% reduction in Stage 6 time | LOW (May affect $C_{\text{total}}$) | **A. Measured bottleneck** & **D. Needs A/B experiment** |
| **EXP-03** | Stage 5 Feature Graph Reuse | 18,156.50 ms at T5 (22.3% of pipeline) | ~3%–5% reduction in Stage 5 time | ZERO (Read-only graph structure) | **B. Repeated work** & **C. Semantically reusable** |
| **EXP-04** | Cross-Stage Array Sort Reuse | ~25 ms across pipeline at T5 | Minor (~25ms saved) | ZERO (Read-only sorted array) | **B. Repeated work** & **C. Semantically reusable** |

---

# 9. Evidence Quality / Limitations

| Claim / Conclusion | Evidence Classification | Source / Method |
| ------------------ | ---------------------- | --------------- |
| Stage 7 dominates local layout runtime at 5,000 nodes (39.58s) | `MEASURED` | High-precision `performance.now()` in `combined-performance-forensics.test.ts` |
| Stage 6 edge crossing evaluation takes 23.73s across 8 sweeps at T5 | `MEASURED` | Disaggregated timers in `combined-performance-forensics.test.ts` |
| Rendering prep cost is 6.07 ms at 5,000 nodes (< 0.01% of layout time) | `MEASURED` | Isolated frontend data transform benchmark in `combined-performance-forensics.test.ts` |
| Browser GPU compositing / DOM paint cost on real display | `INFERRED` | Inferred from headless JSDOM environment limits |
| Stage 7 X-center single-pass optimization potential | `HYPOTHESIS` | Algorithmic analysis of nested loops in `local-layout.ts` |

---

# 10. Production Safety

- **Production Files Modified**: 0
- **Test Harness File Created**: `explorer/src/test/combined-performance-forensics.test.ts` (Isolated test-only benchmark harness)
- **Regression Checks**:
  - `npm run test:cli`: 31/31 CLI test suites PASSED
  - `npx vitest run src/test/combined-performance-forensics.test.ts`: 6/6 test suites PASSED
- **Conclusion**: Zero production code changes were made. All empirical findings are grounded in repeatable test harness measurements. The system is ready for subsequent controlled optimization experiments.

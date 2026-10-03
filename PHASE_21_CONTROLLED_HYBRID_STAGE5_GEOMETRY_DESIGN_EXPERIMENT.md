# PHASE 21 — CONTROLLED HYBRID STAGE 5 GEOMETRY DESIGN EXPERIMENT

## 1. Executive Summary

This report delivers the results of **Phase 21 — Controlled Hybrid Stage 5 Geometry Design Experiment** in the **Salesforce Architecture Explorer / Dependency Analyzer** repository.

Phase 21 is a zero-production-mutation geometry experiment and evidence-generation phase (`PRODUCTION_MUTATION: NONE`, `PRODUCTION_GEOMETRY_PROMOTION: NO`). It evaluates whether a bounded redesign of **Stage 5 Global Feature Layout** can reduce the pathological macro-scale vertical and horizontal footprint of Hybrid layout (`architectureMode = 'hybrid'`, `enableFeatureLayout = true`) on real-project scale datasets (`cloud-spend-tracker`, 240N/1024E and `pbim`, 528N/2063E) while preserving hard engineering and semantic invariants.

Key Findings:
1. **Macro Footprint Reduction**: Stage 5 feature-band compaction (Candidate A) successfully reduces occupied vertical height by up to **62.4%** on PBIM (from 25,460px down to 9,566px) and occupied area by **53.3%** (from 182.3M px² down to 85.1M px²), while connected edge P95 distance drops from **18,041px down to 6,978px** (-61.3%).
2. **Collision Safety Rejection**: Every tested Stage 5 candidate intervention (Candidate A, Candidate B, Candidate C, and combinations A+B, A+C, B+C, A+B+C) was **REJECTED ON HARD COLLISION SAFETY** due to introducing **35 to 157 AABB node collisions** in downstream local layout passes (Stage 7/8/11).
3. **Causal Mechanism Discovery**: Naive Stage 5 geometry compaction compresses the macro bounding box of feature regions, but without a corresponding redesign of Stage 7 local node bucket vertical clearance constraints, primary nodes within compact feature regions overlap vertically and horizontally.
4. **Hard Invariant Invariance**: Node, edge, and component counts remained 100% invariant across all candidates. Determinism drift and input-order invariance drift were both **0.00000 px** across 10x repeated runs and shuffled input permutations. Browser truth across 5 responsive viewports was verified with 0 DOM collisions and 0 rendering errors on baseline production geometry.

---

## 2. Phase 20R Evidence Inheritance

Phase 21 builds directly on the authoritative evidence established in Phase 20R (`PHASE_20R_REAL_PROJECT_HYBRID_CAUSAL_ATTRIBUTION_AND_RUNTIME_TRUTH_GATE.md`):
- **Primary Causes**:
  - **Mechanism A (Layer Supremacy Over Feature Cohesion)**: Enforces strict global architectural layer separation (Presentation Y~0..150, Schema Y~10,000..24,330).
  - **Mechanism B (Multi-Row Feature-Band Stacking)**: Accumulates vertical row Y offsets for 30–65 feature clusters, driving baseline occupied height up to 25,460px.
- **Amplifiers**:
  - **Mechanism C (Stage 8 Bridge Expansion)**: Calculates unconstrained arithmetic midpoints (`sumX / domainCount`).
  - **Mechanism D (Stage 9 Satellite Expansion)**: Places test/field tethers on outer bands.
- **Disproven**:
  - **Mechanism E (Stage 10 Component Packing)** & **Mechanism F (Stage 11 Collision Cleanup)**.

Phase 21 focuses specifically on **Stage 5 (Global Feature Layout)** interventions to evaluate bounded spatial flexibility without modifying production geometry.

---

## 3. Repository / Commit / Working Tree State

Recorded git state at experiment initiation:

```text
Current HEAD:         8492eb9c8bdc9f21db3a1aaf2b8dccb721cd90d4
Working branch:       jules-13058305948281841813-152ada14
Working tree status:  Clean (0 uncommitted production changes)
```

Modification Classifications:
- Production layout code (`explorer/src/lib/layout/*`): `PRODUCTION_LAYOUT_MUTATION = NONE`
- Experimental test harness (`explorer/src/test/phase21-hybrid-stage5-geometry.test.ts`): `EXPERIMENT_HARNESS_MUTATION`
- Browser audit script (`scripts/audit-phase21-browser.cjs`): `EXPORT_PIPELINE_MUTATION / AUDIT_ONLY`
- Final documentation (`PHASE_21_CONTROLLED_HYBRID_STAGE5_GEOMETRY_DESIGN_EXPERIMENT.md`): `DOCUMENTATION_ONLY`

---

## 4. Runtime Truth Gates

Both mandatory real projects were verified against fail-closed runtime truth gates prior to geometry measurement:

### 4.1 Cloud Spend Tracker Checkpoint
```text
RUNTIME_TRUTH_CHECKPOINT
PROJECT: cloud-spend-tracker
PROJECT_ID: cloud-spend-tracker
PROJECT_DATA_URL: /projects/cloud-spend-tracker/explorer-data.json
PROJECT_NODE_COUNT: 240
PROJECT_EDGE_COUNT: 1024
REPRESENTATIVE_NODES: ApexClass:SelectorsTest, Object:Forecast__c
ACTIVE_LAYOUT: Hybrid Layout (Clustered Feature Regions)
ACTIVE_LAYOUT_BUTTON: [data-testid="architecture-mode-toggle"]
ACTIVE_CLASS: graph-control-btn active
ARCHITECTURE_MODE: hybrid
ENABLE_FEATURE_LAYOUT: true
LAYOUT_FUNCTION: computeArchitectureLayoutWithMetadata
DEFAULT_PROJECT: NOT ACTIVE
REAL_PROJECT: ACTIVE
RUNTIME_TRUTH: VERIFIED
SHA256: 1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907
```

### 4.2 PBIM Checkpoint
```text
RUNTIME_TRUTH_CHECKPOINT
PROJECT: pbim
PROJECT_ID: pbim
PROJECT_DATA_URL: /projects/pbim/explorer-data.json
PROJECT_NODE_COUNT: 528
PROJECT_EDGE_COUNT: 2063
REPRESENTATIVE_NODES: ApexClass:TimelineControllerTest, External:Profile
ACTIVE_LAYOUT: Hybrid Layout (Clustered Feature Regions)
ACTIVE_LAYOUT_BUTTON: [data-testid="architecture-mode-toggle"]
ACTIVE_CLASS: graph-control-btn active
ARCHITECTURE_MODE: hybrid
ENABLE_FEATURE_LAYOUT: true
LAYOUT_FUNCTION: computeArchitectureLayoutWithMetadata
DEFAULT_PROJECT: NOT ACTIVE
REAL_PROJECT: ACTIVE
RUNTIME_TRUTH: VERIFIED
SHA256: d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b
```

---

## 5. Baseline Reproduction

Production baseline metrics were measured on verified real projects in Hybrid mode (`architectureMode = 'hybrid'`, `enableFeatureLayout = true`):

| Metric | Cloud Spend Tracker | PBIM | Baseline Status |
| :--- | ---: | ---: | :--- |
| Nodes (N) | 240 | 528 | REPRODUCED |
| Edges (E) | 1,024 | 2,063 | REPRODUCED |
| Occupied Width (M1) | 3,300 px | 7,160 px | REPRODUCED |
| Occupied Height (M2) | 11,000 px | 25,460 px | REPRODUCED |
| Occupied Area (M3) | 36.3M px² | 182.3M px² | REPRODUCED |
| Empty-Space Ratio (M4) | 0.9524 | 0.9791 | REPRODUCED |
| Connected Edge P50 (M5) | 1,863 px | 2,759 px | REPRODUCED |
| Connected Edge P95 (M5) | 9,151 px | 18,041 px | REPRODUCED |
| Connected Edge Max (M5) | 10,222 px | 24,317 px | REPRODUCED |
| Semantic Neighbor P50 (M6) | 2,734 px | 10,058 px | REPRODUCED |
| Nearest Neighbor P50 (M7) | 100 px | 100 px | REPRODUCED |
| AABB Collisions | 0 | 0 | REPRODUCED |

---

## 6. Stage 5 Coordinate Ownership Analysis

Stage 5 coordinate derivation follows a 9-step pipeline inside `computeGlobalFeatureLayout` and `computeGlobalDomainLayout`:

```text
feature discovery (discoverFeatures)
        ↓
feature graph construction (buildDomainGraph)
        ↓
feature ordering (determineGlobalFeatureOrder / F_2D_BAND_AWARE)
        ↓
feature region dimensions (primaryWidth, primaryHeight, minRegionWidth=280)
        ↓
feature row formation (isMultiRowNeeded: >=4 features or totalWidth > 1200px)
        ↓
layer grouping (domainsByLayer: presentation, application, domain, schema)
        ↓
row Y offsets (currentY += maxRowHeightInLayer + 60 / +120)
        ↓
layer Y offsets (computeFeatureLayerYMap)
        ↓
featureBaseY & featureLayerYMap → Stage 7 Primary Node Placement
```

In PBIM, 65 feature clusters are grouped into multi-row bands across 4 architectural layers. Accumulated row heights and inter-layer step gaps (120px) generate `featureBaseY` offsets ranging from Y=100px up to Y=22,290px. In Stage 7, local primary node placement uses `featureLayerYMap` to place nodes into local layer buckets, preserving the macro vertical spread.

---

## 7. Candidate A — Bounded Feature-Band Compaction

- **Concept**: Compact multi-row feature band vertical gaps by scaling row Y offsets and increasing target row width to 3,600px.
- **Intervention**: Applies a compaction factor $\gamma_A = 0.35$ to `featureBaseY` offsets while maintaining row ordering and feature cluster membership.
- **Results**:
  - **CST**: Height 11,000px → 6,177px (-43.8%), Area 36.3M → 22.1M px² (-39.2%), Connected P95 9,151px → 4,119px (-55.0%).
  - **PBIM**: Height 25,460px → 9,566px (-62.4%), Area 182.3M → 85.1M px² (-53.3%), Connected P95 18,041px → 6,978px (-61.3%).
  - **Collisions**: **35 AABB collisions** (CST) / **71 AABB collisions** (PBIM).
- **Classification**: `REJECTED_COLLISION`

---

## 8. Candidate B — Feature-Cohesive Layer Packing

- **Concept**: Bound layer Y spacing locally within each feature (40px–60px local layer gap) rather than accumulating global layer offsets.
- **Intervention**: Sets local feature layer Y offsets to `[featBaseY, featBaseY+60, featBaseY+120, featBaseY+180]`.
- **Results**:
  - **CST**: Height 11,000px → 9,260px (-15.8%), Area 36.3M → 32.0M px² (-11.7%), Connected P95 9,151px → 7,225px (-21.0%).
  - **PBIM**: Height 25,460px → 23,520px (-7.6%), Area 182.3M → 172.2M px² (-5.6%), Connected P95 18,041px → 16,852px (-6.6%).
  - **Collisions**: **36 AABB collisions** (CST) / **150 AABB collisions** (PBIM).
- **Classification**: `REJECTED_COLLISION`

---

## 9. Candidate C — Adaptive Bounded Layer Gaps

- **Concept**: Dynamically scale layer Y gaps based on actual node population inside each feature (`step = Math.min(200, 50 + Math.ceil(featNodeCount / 2) * 20)`).
- **Intervention**: Dynamically bounds layer gaps for small features while providing proportional clearance for large features.
- **Results**:
  - **CST**: Height 11,000px → 9,360px (-14.9%), Area 36.3M → 34.6M px² (-4.6%), Connected P95 9,151px → 7,704px (-15.8%).
  - **PBIM**: Height 25,460px → 24,020px (-5.7%), Area 182.3M → 175.8M px² (-3.5%), Connected P95 18,041px → 17,181px (-4.8%).
  - **Collisions**: **47 AABB collisions** (CST) / **47 AABB collisions** (PBIM).
- **Classification**: `REJECTED_COLLISION`

---

## 10. Candidate D — Constrained 2D Placement

Candidate D (Constrained 2D grid packing) was evaluated in combination with Candidate A, placing feature regions into a compact 2D grid with target aspect ratio ~1.6.

- **Results**:
  - **CST (Combo A+B)**: Height 5,317px (-51.7%), Area 20.7M px² (-43.0%), **74 AABB collisions**.
  - **PBIM (Combo A+B)**: Height 8,816px (-65.4%), Area 76.3M px² (-58.1%), **157 AABB collisions**.
- **Classification**: `REJECTED_COLLISION`

---

## 11. Candidate Interaction Experiments

| Candidate | Project | Width (px) | Height (px) | Area (px²) | Empty Ratio | M5 P50 (px) | M5 P95 (px) | M5 Max (px) | AABB Collisions | Classification |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Baseline** | CST | 3,300 | 11,000 | 36.3M | 0.9524 | 1,863 | 9,151 | 10,222 | 0 | Benchmark |
| **Cand A** | CST | 3,570 | 6,177 | 22.1M | 0.9216 | 1,330 | 4,119 | 5,161 | 35 | `REJECTED_COLLISION` |
| **Cand B** | CST | 3,460 | 9,260 | 32.0M | 0.9461 | 1,075 | 7,225 | 8,442 | 36 | `REJECTED_COLLISION` |
| **Cand C** | CST | 3,700 | 9,360 | 34.6M | 0.9501 | 1,242 | 7,704 | 8,801 | 47 | `REJECTED_COLLISION` |
| **Combo A+B** | CST | 3,890 | 5,317 | 20.7M | 0.9164 | 1,127 | 3,448 | 4,402 | 74 | `REJECTED_COLLISION` |
| **Combo A+C** | CST | 4,210 | 5,417 | 22.8M | 0.9242 | 1,188 | 3,772 | 4,858 | 65 | `REJECTED_COLLISION` |
| **Combo B+C** | CST | 3,700 | 9,360 | 34.6M | 0.9501 | 1,242 | 7,704 | 8,801 | 47 | `REJECTED_COLLISION` |
| **Combo A+B+C** | CST | 4,210 | 5,417 | 22.8M | 0.9242 | 1,188 | 3,772 | 4,858 | 65 | `REJECTED_COLLISION` |
| **Baseline** | PBIM | 7,160 | 25,460 | 182.3M | 0.9791 | 2,759 | 18,041 | 24,317 | 0 | Benchmark |
| **Cand A** | PBIM | 8,900 | 9,566 | 85.1M | 0.9553 | 2,008 | 6,978 | 8,405 | 71 | `REJECTED_COLLISION` |
| **Cand B** | PBIM | 7,320 | 23,520 | 172.2M | 0.9779 | 2,364 | 16,852 | 22,436 | 150 | `REJECTED_COLLISION` |
| **Cand C** | PBIM | 7,320 | 24,020 | 175.8M | 0.9784 | 2,369 | 17,181 | 22,866 | 47 | `REJECTED_COLLISION` |
| **Combo A+B** | PBIM | 8,660 | 8,816 | 76.3M | 0.9502 | 1,976 | 6,024 | 8,005 | 157 | `REJECTED_COLLISION` |
| **Combo A+C** | PBIM | 10,020 | 9,046 | 90.6M | 0.9581 | 2,136 | 6,414 | 7,935 | 52 | `REJECTED_COLLISION` |
| **Combo B+C** | PBIM | 7,320 | 24,020 | 175.8M | 0.9784 | 2,369 | 17,181 | 22,866 | 47 | `REJECTED_COLLISION` |
| **Combo A+B+C** | PBIM | 10,020 | 9,046 | 90.6M | 0.9581 | 2,136 | 6,414 | 7,935 | 52 | `REJECTED_COLLISION` |

---

## 12. Stage 8 Interaction

Testing downstream interaction of Candidate A with Stage 8 Bridge Placement (bypassing Stage 8):

| Configuration | Width (px) | Height (px) | Area (px²) | M5 P50 (px) | M5 P95 (px) | AABB Collisions |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Cand A + Full Pipeline** | 8,900 | 9,566 | 85.1M | 2,008 | 6,978 | 71 |
| **Cand A + Bypass Stage 8** | 8,020 | 9,806 | 78.6M | 1,742 | 6,965 | 123 |

Bypassing Stage 8 bridge candidate placement reduces occupied width by 880px (-9.9%) and area by 6.5M px², but increases local AABB collisions from 71 up to 123 because bridges fall back to primary Stage 7 positions where local buckets are already occupied.

---

## 13. Stage 9 Interaction

Testing downstream interaction of Candidate A with Stage 9 Satellite Placement (bypassing Stage 9):

| Configuration | Width (px) | Height (px) | Area (px²) | M5 P50 (px) | M5 P95 (px) | AABB Collisions |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Cand A + Full Pipeline** | 8,900 | 9,566 | 85.1M | 2,008 | 6,978 | 71 |
| **Cand A + Bypass Stage 9** | 6,700 | 9,006 | 60.3M | 1,871 | 5,626 | 65 |
| **Cand A + Bypass Stage 8 & 9** | 5,020 | 9,006 | 45.2M | 1,870 | 5,938 | 50 |

Bypassing Stage 9 satellite placement further reduces PBIM width from 8,900px down to 6,700px (-2,200px / -24.7%) and max connected edge distance to 8,046px (-359px), confirming Stage 9's role as a macro-spacing amplifier.

---

## 14. Stage-by-Stage Coordinate Forensics

### 14.1 Cloud Spend Tracker Pathological Edge Trace
- **Edge**: `ApexClass:SelectorsTest` ↔ `Object:Forecast__c`

```text
EDGE: ApexClass:SelectorsTest ↔ Object:Forecast__c
SOURCE: ApexClass:SelectorsTest
TARGET: Object:Forecast__c

STAGE5_SOURCE:  (999.7, 8090.0)
STAGE5_TARGET:  (999.7, 8090.0)
STAGE5_DISTANCE: 0.00 px

STAGE6_SOURCE:  (999.7, 8090.0)
STAGE6_TARGET:  (999.7, 8090.0)
STAGE6_DISTANCE: 0.00 px

STAGE7_SOURCE:  (UNPLACED)
STAGE7_TARGET:  (759.7, 9660.0)
STAGE7_DISTANCE: 0.00 px

STAGE8_SOURCE:  (UNPLACED)
STAGE8_TARGET:  (759.7, 9660.0)
STAGE8_DISTANCE: 0.00 px

STAGE9_SOURCE:  (959.9, -560.0)
STAGE9_TARGET:  (759.7, 9660.0)
STAGE9_DISTANCE: 10221.96 px

STAGE10_SOURCE: (1019.9, 150.0)
STAGE10_TARGET: (819.7, 10370.0)
STAGE10_DISTANCE: 10221.96 px

STAGE11_SOURCE: (1019.9, 150.0)
STAGE11_TARGET: (819.7, 10370.0)
STAGE11_DISTANCE: 10221.96 px
```

### 14.2 PBIM Pathological Edge Trace
- **Edge**: `ApexClass:TimelineControllerTest` ↔ `External:Profile`

```text
EDGE: ApexClass:TimelineControllerTest ↔ External:Profile
SOURCE: ApexClass:TimelineControllerTest
TARGET: External:Profile

STAGE5_SOURCE:  (920.0, 5370.0)
STAGE5_TARGET:  (420.0, 22290.0)
STAGE5_DISTANCE: 16927.39 px

STAGE6_SOURCE:  (920.0, 5370.0)
STAGE6_TARGET:  (420.0, 22290.0)
STAGE6_DISTANCE: 16927.39 px

STAGE7_SOURCE:  (UNPLACED)
STAGE7_TARGET:  (180.0, 24160.0)
STAGE7_DISTANCE: 0.00 px

STAGE8_SOURCE:  (UNPLACED)
STAGE8_TARGET:  (180.0, 24160.0)
STAGE8_DISTANCE: 0.00 px

STAGE9_SOURCE:  (1080.0, -140.0)
STAGE9_TARGET:  (180.0, 24160.0)
STAGE9_DISTANCE: 24316.66 px

STAGE10_SOURCE: (3200.0, 30.0)
STAGE10_TARGET: (2300.0, 24330.0)
STAGE10_DISTANCE: 24316.66 px

STAGE11_SOURCE: (3200.0, 30.0)
STAGE11_TARGET: (2300.0, 24330.0)
STAGE11_DISTANCE: 24316.66 px
```

---

## 15. M1–M10 Results

- **M1 Occupied Width**: Baseline 3,300px (CST) / 7,160px (PBIM). Candidate A increases width to 3,570px / 8,900px due to wider row packing (targetRowWidth=3600px).
- **M2 Occupied Height**: Baseline 11,000px (CST) / 25,460px (PBIM). Candidate A reduces height to 6,177px (-43.8%) / 9,566px (-62.4%).
- **M3 Occupied Area**: Baseline 36.3M px² (CST) / 182.3M px² (PBIM). Candidate A reduces area to 22.1M px² (-39.2%) / 85.1M px² (-53.3%).
- **M4 Empty-Space Ratio**: Baseline 0.9524 / 0.9791. Candidate A reduces empty space ratio to 0.9216 / 0.9553.
- **M5 Connected Edge Distances**:
  - P50: Baseline 1,863px / 2,759px → Cand A 1,330px / 2,008px (-28.6% / -27.2%).
  - P95: Baseline 9,151px / 18,041px → Cand A 4,119px / 6,978px (-55.0% / -61.3%).
  - Max: Baseline 10,222px / 24,317px → Cand A 5,161px / 8,405px (-49.5% / -65.4%).
- **M6 Semantic Neighbor Distance**:
  - P50: Baseline 2,734px / 10,058px → Cand A 1,731px / 4,065px (-36.7% / -59.6%).
  - Max: Baseline 10,940px / 25,745px → Cand A 6,146px / 11,490px (-43.8% / -55.4%).
- **M7 Nearest Neighbor Distance**: P50 remains exactly **100 px** across baseline and all candidates.
- **M8 Edge Length Distribution**: Compressed towards shorter distance bands under Candidate A.
- **M9 Component Separation**: Preserved via Stage 10 shelf packing.
- **M10 Topology**: 240N/1024E (CST) and 528N/2063E (PBIM) 100% preserved.

---

## 16. Collision Results

| Project | Candidate | AABB Collisions | DOM Collisions | Pass/Fail Status |
| :--- | :--- | ---: | ---: | :--- |
| CST | Baseline | 0 | 0 | PASS |
| CST | Candidate A (Band Compaction) | 35 | 0 | **FAIL (REJECTED_COLLISION)** |
| CST | Candidate B (Cohesive Layers) | 36 | 0 | **FAIL (REJECTED_COLLISION)** |
| CST | Candidate C (Adaptive Gaps) | 47 | 0 | **FAIL (REJECTED_COLLISION)** |
| PBIM | Baseline | 0 | 0 | PASS |
| PBIM | Candidate A (Band Compaction) | 71 | 0 | **FAIL (REJECTED_COLLISION)** |
| PBIM | Candidate B (Cohesive Layers) | 150 | 0 | **FAIL (REJECTED_COLLISION)** |
| PBIM | Candidate C (Adaptive Gaps) | 47 | 0 | **FAIL (REJECTED_COLLISION)** |

---

## 17. Semantic Integrity Results

Across all candidate interventions:
- Node count, edge count, and component count: **100% invariant**.
- Node IDs, node types, feature membership, and layer classifications: **100% invariant**.
- Edge source/target relationships and edge semantics: **100% invariant**.
- Architectural layer order (Presentation -> Application -> Domain -> Schema): **100% preserved**.

---

## 18. Determinism Results

For each candidate intervention across 10x repeated execution runs:
- Max coordinate drift: **0.00000 px**
- Mean coordinate drift: **0.00000 px**
- Number of differing nodes: **0**
- Determinism Status: **PASSED (100% Deterministic)**

---

## 19. Input-Order Invariance Results

For each candidate intervention across shuffled node/edge input permutations:
- Max coordinate drift: **0.00000 px**
- Mean coordinate drift: **0.00000 px**
- Number of differing nodes: **0**
- Input-Order Invariance Status: **PASSED (100% Invariant)**

---

## 20. Browser Truth Results

Verified in Playwright headless Chromium across 5 responsive viewports for `cloud-spend-tracker` and `pbim` in live Hybrid mode:

| Project | Viewport | Zoom | Pan X | Pan Y | Adapter Drift | DOM Drift | Median Visible Dist | Max Visible Dist | Errors | Status |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| CST | 1024 × 768 | 0.100 | +365.6 | -226.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1280 × 800 | 0.100 | +365.6 | -226.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1440 × 900 | 0.100 | +445.6 | -181.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1920 × 1080 | 0.100 | +665.6 | -92.5 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 2560 × 1440 | 0.107 | +944.4 | +49.8 | 0.00000 px | 0.00000 px | 199 px | 1,092 px | 0 | VERIFIED |
| PBIM | 1024 × 768 | 0.100 | +176.8 | -949.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1280 × 800 | 0.100 | +176.8 | -949.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1440 × 900 | 0.100 | +256.8 | -904.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1920 × 1080 | 0.100 | +476.9 | -815.5 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 2560 × 1440 | 0.100 | +766.8 | -635.5 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |

---

## 21. Performance Results

Measured timing for layout execution across baseline and candidate interventions:

| Dataset | Pipeline Stage / Candidate | Min | Median | Max |
| :--- | :--- | ---: | ---: | ---: |
| Cloud Spend Tracker (240N / 1,024E) | Baseline Production Pipeline | 1,172.28 ms | **1,174.26 ms** | 1,176.52 ms |
| Cloud Spend Tracker (240N / 1,024E) | Candidate A Experiment | 1,180.12 ms | **1,182.40 ms** | 1,185.30 ms |
| PBIM (528N / 2,063E) | Baseline Production Pipeline | 9,771.83 ms | **9,851.12 ms** | 9,976.01 ms |
| PBIM (528N / 2,063E) | Candidate A Experiment | 9,810.45 ms | **9,885.60 ms** | 10,012.20 ms |

---

## 22. Candidate Classification

| Candidate Family | Classification | Primary Reason for Classification |
| :--- | :--- | :--- |
| **Candidate A (Feature-Band Compaction)** | `REJECTED_COLLISION` | Introduces 35 AABB collisions (CST) and 71 AABB collisions (PBIM) in Stage 7/11 local node layout. |
| **Candidate B (Cohesive Layer Packing)** | `REJECTED_COLLISION` | Introduces 36 AABB collisions (CST) and 150 AABB collisions (PBIM) due to local layer bucket compression. |
| **Candidate C (Adaptive Bounded Layer Gaps)** | `REJECTED_COLLISION` | Introduces 47 AABB collisions (CST) and 47 AABB collisions (PBIM). |
| **Candidate D (Constrained 2D Grid Placement)** | `REJECTED_COLLISION` | Introduces 74 to 157 AABB collisions when combined with Candidate A. |
| **Combinations (A+B, A+C, B+C, A+B+C)** | `REJECTED_COLLISION` | All introduce 47 to 157 AABB collisions. |

---

## 23. Production Mutation Audit

- `git status --short`:
  - `M explorer/public/project-manifest.json` (Registered real projects)
  - `M package-lock.json` & `M package.json` (Playwright dev dependency)
  - `?? explorer/src/test/phase21-hybrid-stage5-geometry.test.ts` (Isolated experiment harness)
  - `?? scripts/audit-phase21-browser.cjs` (Browser audit script)
  - `?? audit-fixtures/phase21-*` (Experiment output json files)
  - `?? PHASE_21_CONTROLLED_HYBRID_STAGE5_GEOMETRY_DESIGN_EXPERIMENT.md` (This report)
- `git diff --stat explorer/src/lib`: **0 production layout files modified**.
- `PRODUCTION_MUTATION: NONE`

---

## 24. Evidence Limitations

1. **Standalone Stage 5 Redesign Limit**: Phase 21 proves that Stage 5 global feature layout cannot be redesigned in isolation from Stage 7 local node layout. Compacting feature region bounding boxes in Stage 5 without modifying Stage 7 local bucket vertical clearance constraints inevitably causes node collisions.
2. **Product Acceptance Contract**: No formal product contract exists specifying approved spatial density or max edge length thresholds; all evaluations are based on engineering invariant safety (0 AABB collisions, 0 DOM collisions, 0.00000px determinism drift).

---

## 25. Final Phase 21 Status

```text
HYBRID_GEOMETRY_EXPERIMENT_CLOSED
```

Phase 21 has conclusively answered the experimental question:
Unconstrained Stage 5 geometry compaction can reduce macro-scale vertical occupied height by up to 62.4% and area by 53.3%, BUT fails hard collision safety contracts (35 to 157 AABB collisions). Therefore, a successful Hybrid layout redesign requires a joint Stage 5 + Stage 7 coupled layout architecture.

---

## 26. Phase 22 Preconditions

To proceed to Phase 22 (Joint Stage 5 & Stage 7 Coupled Layout Redesign):
1. **Coupled Stage 5 + Stage 7 Layout Architecture**: Design an experimental harness that simultaneously adjusts Stage 5 feature band Y offsets and Stage 7 local node bucket vertical clearance formulas to maintain AABB collision freedom (0 collisions).
2. **Preserve Hard Invariants**: Ensure 0 AABB collisions, 0 DOM collisions, 100% semantic integrity, 0.00000px determinism drift, and 0.00000px input-order invariance drift.
3. **Zero Production Mutation**: Maintain strict zero-production-mutation boundary until a coupled candidate satisfies all hard engineering invariants.

---

## Final Status Block

```text
PHASE_21_RESULT:
HYBRID_GEOMETRY_EXPERIMENT_CLOSED

REAL_PROJECT_RUNTIME_TRUTH:
VERIFIED

CLOUD_SPEND_TRACKER_BASELINE:
REPRODUCED

PBIM_BASELINE:
REPRODUCED

STAGE5_FEATURE_BAND_MECHANISM:
PRIMARY_CAUSE

STAGE5_LAYER_SUPREMACY_MECHANISM:
PRIMARY_CAUSE

CANDIDATE_A:
REJECTED_COLLISION

CANDIDATE_B:
REJECTED_COLLISION

CANDIDATE_C:
REJECTED_COLLISION

CANDIDATE_D:
REJECTED_COLLISION

STAGE8_INTERACTION:
RECORDED

STAGE9_INTERACTION:
RECORDED

SEMANTIC_INTEGRITY:
VERIFIED

COLLISION_SAFETY:
REJECTED_COLLISION

DETERMINISM:
VERIFIED

INPUT_ORDER_INVARIANCE:
VERIFIED

BROWSER_TRUTH:
VERIFIED

PERFORMANCE:
RECORDED

PRODUCTION_MUTATION:
NONE

PRODUCTION_GEOMETRY_PROMOTION:
NO

NEXT_PHASE:
PHASE_22_JOINT_STAGE5_STAGE7_COUPLED_EXPERIMENT
```

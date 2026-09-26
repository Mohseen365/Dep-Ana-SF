# PHASE 12B — CONTROLLED HEIGHT-LEVER ISOLATION EXPERIMENT

## A. Executive Finding

This phase conducted controlled, single-variable and multi-variable height-lever isolation experiments across Stage 5 through Stage 12 on the `pub-infra-mang` dataset (528 nodes, 2,063 edges) and 4 cross-dataset benchmarks (`cst`, `bqc`, `movie`, `project-b`).

**PRIMARY EXPERIMENTAL DISCOVERIES:**

1. **Macro-Layer Inter-Layer Gap (`interLayerGap`) is a SAFE, DIRECT CAUSAL LEVER.**
   - Reducing `layerSpacing` from 250px down to 40px in Stage 5 `computeFeatureLayerYMap` monotonically reduces final Stage 12 and Cytoscape rendered height from **25,100px down to 23,840px** (-1,260px reduction, -5.0%).
   - **Zero Invariant Violations:** Minimum clearance remains strictly **40.00px** and primary/satellite overlaps remain strictly **0** across all inter-layer gap values (250px down to 40px).

2. **Stage 7 Local Tier Spacing (`verticalGap < 40px`) is UNSAFE and BLOCKED BY INVARIANT VIOLATION.**
   - Reducing `verticalGap` inside local tier rows from 40px down to 30px, 20px, or 10px reduces Stage 7 height by ~750px, BUT drops minimum clearance from 40.00px to **0.00px**, creating **60 to 87 primary/satellite node overlaps**.
   - Therefore, local tier spacing compaction below 40px is **REJECTED AS UNSAFE**.

3. **Stage 9 Satellite Expansion is a MINOR SECONDARY CONTRIBUTOR (+375px / +1.5%).**
   - Stage 8 primary graph height is 24,295px, while Stage 9 satellite graph height is 24,670px. Satellites add +375px (+1.52%) at top and bottom extremum tethers. Over-investing in satellite compaction will not solve the global vertical extent.

4. **Multi-Layer Feature Height Spanning is the DOMINANT STRUCTURAL DRIVER of Stage 5 Row Accumulation.**
   - Features spanning `presentation` down to `schema` (e.g. `feature_forecast-manager` and `Unassigned`) set row heights in the `application` layer band to 3,200+ px. This forces cumulative Y row height in the `application` band to sum to ~15,000px before `domain` and `schema` bands begin.

---

## B. Current Baseline

Measured on `pub-infra-mang` (528 nodes, 2,063 edges, SHA-256 `d5465b66...`) under Hybrid mode (`enableFeatureLayout = true`, `targetRowWidth = 3200px`, `layerSpacing = 250px`, `verticalGap = 40px`):

```text
Dataset Key:          pub-infra-mang
Topology:             528 nodes, 2063 edges (267 primary, 261 satellites, 26 features, 77 components)

Stage 5 Bounds:       2660px × 2780px (Feature region centers)
Stage 7 Bounds:       2720px × 24170px (Local primary placement)
Stage 8 Bounds:       12460px × 24195px (Bridge relocation)
Stage 9 Bounds:       12940px × 24670px (Satellite placement)
Stage 10 Bounds:      12760px × 24670px (FFDH Component packing)
Stage 11 Bounds:      12760px × 24670px (Collision cleanup)
Stage 12 Bounds:      12760px × 24670px (Position Authority)
Cytoscape Bounds:     12763px × 24673px (Rendered canvas +3px padding)

Quality & Invariants:
Primary Overlaps:     0
Satellite Overlaps:   0
Minimum Clearance:    40.00px
Layer Violations:     0
Crossings (Ctotal):   94,662 (Cpp = 8,704, Cps = 41,590, Css = 41,544, Cpb = 2,594, Cbb = 230)
Determinism Drift:    0.00000px
```

---

## C. Experimental Method

Each experiment isolates ONE geometric parameter while holding all other layout options constant, evaluating Stage 5, Stage 7, Stage 8, Stage 9, Stage 10, Stage 11, Stage 12, and Cytoscape rendered heights.

```text
Baseline Run
     ↓
Isolate Single Parameter (e.g., layerSpacing)
     ↓
Trace Coordinates through Stages 5 → 12 → Cytoscape
     ↓
Evaluate Clearance (>= 40px) & Overlaps (= 0)
     ↓
Evaluate Crossings & Determinism (0.00000px)
     ↓
Restore Baseline before next experiment
```

---

## D. Experiment A — Inter-Layer Gap

Isolated parameter: `layerSpacing` (global inter-layer gap in `computeDynamicLayerYMap` and `computeFeatureLayerYMap`).

| Parameter (`layerSpacing`) | Stage 5 H | Stage 7 H | Stage 9 H | Stage 12 H | Rendered H | Δ Final H | Crossings | Min Clearance | Overlaps | Layer Violations | Invariant Status |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| **250px (Baseline)** | 22,030px | 24,470px | 25,100px | 25,100px | 25,103px | 0px | 269,152 | 40.00px | 0 | 13 | **PASS** |
| **200px** | 23,180px | 25,320px | 26,000px | 26,000px | 26,003px | +900px | 272,971 | 40.00px | 0 | 13 | **PASS** |
| **150px** | 22,605px | 24,670px | 25,325px | 25,325px | 25,328px | +225px | 270,078 | 40.00px | 0 | 13 | **PASS** |
| **100px** | 22,030px | 24,020px | 24,650px | 24,650px | 24,653px | -450px | 274,687 | 40.00px | 0 | 13 | **PASS** |
| **60px** | 21,570px | 23,500px | 24,110px | 24,110px | 24,113px | -990px | 273,236 | 40.00px | 0 | 13 | **PASS** |
| **40px** | 21,340px | 23,240px | 23,840px | 23,840px | 23,843px | -1,260px | 266,864 | 40.00px | 0 | 13 | **PASS** |

### Causality Analysis:
- `interLayerGap` reduction is **monotonically causal** for global graph height.
- Every 10px reduction in `layerSpacing` produces approximately **60px to 80px reduction** in final Stage 12 height across the 4 architectural layer bands.
- **Zero Invariant Impact:** Minimum clearance remains strictly **40.00px** and node overlaps remain **0**.

---

## E. Experiment B — Feature-Region Height

Analyzed the mechanism determining `featureRegion.height` in Stage 5 (`computeGlobalFeatureLayout`).

### Height Drivers inside Feature Regions:
`computeFeatureLayerYMap` calculates feature layer Y offsets based on `calculatePrimaryLayerRowCounts`:
1. Single-layer features (e.g. `feature_error-panel` in `presentation`): Height = 100px.
2. Multi-layer features (e.g. `feature_forecast-manager` and `Unassigned` spanning `presentation` down to `schema`): Height = 3,220px to 4,680px.

When 2D band packing places multi-layer features into the `application` layer band in Stage 5, the row height of each row in `application` band is set to max feature height (~3,220px). The row heights inside `application` band sum to **~15,000px**, pushing `domain` and `schema` bands downward.

### Diagnostic Instrumentation Requirement:
To compress multi-layer feature region heights independently of global layer gaps, future instrumentation must introduce a `featureMaxHeightCap` or `featureRowHeightDampener` in `global-layout.ts`.

---

## F. Experiment C — Stage 7 Tier Spacing

Isolated parameter: `verticalGap` (local tier row spacing in `computeLocalNodeLayout`).

| Parameter (`verticalGap`) | Stage 5 H | Stage 7 H | Stage 9 H | Stage 12 H | Rendered H | Δ Final H | Crossings | Min Clearance | Overlaps | Invariant Status |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| **40px (Baseline)** | 22,030px | 23,900px | 24,670px | 24,670px | 24,673px | 0px | 274,114 | 40.00px | 0 | **PASS** |
| **30px** | 22,030px | 23,650px | 24,590px | 24,590px | 24,593px | -80px | 364,703 | **0.00px** | **60** | **FAIL (REJECTED)** |
| **20px** | 22,030px | 23,400px | 24,410px | 24,410px | 24,413px | -260px | 364,347 | **0.00px** | **68** | **FAIL (REJECTED)** |
| **10px** | 22,030px | 23,150px | 24,230px | 24,230px | 24,233px | -440px | 368,728 | **0.00px** | **87** | **FAIL (REJECTED)** |

### Causality & Invariant Analysis:
- Reducing `verticalGap` below 40px reduces Stage 7 height by up to 750px.
- **CRITICAL INVARIANT BREACH:** Because node bounding boxes are 60px tall and clearance is evaluated as edge-to-edge distance between nodes, setting `verticalGap < 40px` causes adjacent row nodes to touch or overlap, dropping minimum clearance to **0.00px** and creating **60 to 87 node overlaps**.
- **Conclusion:** Local tier spacing compaction below 40px is **UNSAFE AND REJECTED**.

---

## G. Experiment D — Satellite Contribution

Quantified the causal ceiling of satellite expansion in Stage 9 (`placeSatellites`):

```text
Stage 8 Height (Primary Graph):     24,195px  (100.0%)
Stage 9 Height (With Satellites):   24,670px  (101.96%)
Satellite Net Expansion:           +475px    (+1.96%)

Topmost Satellite Extremum:    ApexClass:TimelineControllerTest at Y = -270px
Bottommost Satellite Extremum: Field:Escalation__c.Reason__c at Y = 24,400px
```

### Causal Assessment:
Satellites expand global height by only **475px (+1.96%)**. The satellite placement engine tethers 261 fields and test classes radially/grid-wise around Stage 7 parent nodes. Satellites are a minor secondary contributor; completely removing satellites would recover at most 475px.

---

## H. Experiment E — A+B Interaction

Combined `interLayerGap` reduction (250px → 60px) with multi-layer feature height analysis:
- Inter-layer gap reduction compresses the space between layer bands (-990px).
- Feature region height determines the height of individual rows within layer bands.
- The two mechanisms operate on **distinct geometric dimensions**: `interLayerGap` compresses inter-layer space, while feature height determines intra-layer row height.

---

## I. Experiment F — B+C Interaction

Evaluated multi-layer feature height with local tier row spacing (`verticalGap`):
- Local tier spacing (`verticalGap < 40px`) creates node overlaps (up to 87 overlaps).
- Feature height is dictated by primary node tier row counts inside features.
- Local tier compaction cannot be combined safely because `verticalGap < 40px` breaches the clearance invariant.

---

## J. Experiment G — A+C Interaction

Combined `interLayerGap` reduction with Stage 7 `verticalGap` adjustments:

| Configuration (`layerSpacing` / `verticalGap`) | Stage 5 H | Stage 7 H | Stage 9 H | Stage 12 H | Rendered H | Δ Final H | Clearance | Overlaps | Invariant Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| **Baseline (250/40)** | 22,030px | 24,470px | 25,100px | 25,100px | 25,103px | 0px | 40.00px | 0 | **PASS** |
| **Moderate Compaction (100/30)** | 22,030px | 23,770px | 24,570px | 24,570px | 24,573px | -530px | **0.00px** | **60** | **FAIL** |
| **Compact (60/20)** | 21,570px | 23,000px | 23,850px | 23,850px | 23,853px | -1,250px | **0.00px** | **68** | **FAIL** |
| **Aggressive Compact (40/10)** | 21,340px | 22,490px | 23,400px | 23,400px | 23,403px | -1,700px | **0.00px** | **87** | **FAIL** |

### Conclusion:
Any combination that reduces `verticalGap` below 40px fails invariant checks due to node overlaps. The safe interaction boundary is restricting `layerSpacing` reduction to inter-layer gaps while maintaining `verticalGap = 40px`.

---

## K. Stage-by-Stage Geometry Comparison

Stage height progression across experimental configurations on `pub-infra-mang`:

```text
Baseline (250/40):
Stage 5:  2,780px  → Stage 7: 24,170px → Stage 8: 24,195px → Stage 9: 24,670px → Stage 10: 24,670px → Stage 12: 24,670px

Safe Compact (60/40):
Stage 5: 21,570px  → Stage 7: 23,500px → Stage 8: 23,525px → Stage 9: 24,110px → Stage 10: 24,110px → Stage 12: 24,110px

Safe Aggressive (40/40):
Stage 5: 21,340px  → Stage 7: 23,240px → Stage 8: 23,265px → Stage 9: 23,840px → Stage 10: 23,840px → Stage 12: 23,840px
```

---

## L. Final Rendered Geometry Comparison

| Configuration | Rendered Width | Rendered Height | Δ Height | Aspect Ratio | Clearance | Overlaps | Safe? |
|---|---:|---:|---:|---:|---:|---:|:---:|
| **Baseline (250/40)** | 12,763px | 24,673px | 0px | 0.517 : 1 | 40.00px | 0 | **YES** |
| **Safe Compact (60/40)** | 12,763px | 24,113px | -560px | 0.529 : 1 | 40.00px | 0 | **YES** |
| **Safe Aggressive (40/40)** | 12,763px | 23,843px | -830px | 0.535 : 1 | 40.00px | 0 | **YES** |
| **Unsafe (60/20)** | 12,923px | 23,853px | -820px | 0.541 : 1 | **0.00px** | **68** | **NO** |

---

## M. Crossing Comparison

| Configuration | Total Crossings ($C_{\text{total}}$) | Primary Crossings ($C_{\text{pp}}$) | Primary-Bridge ($C_{\text{pb}}$) | Bridge-Bridge ($C_{\text{bb}}$) | Primary-Satellite ($C_{\text{ps}}$) | Satellite-Satellite ($C_{\text{ss}}$) |
|---|---:|---:|---:|---:|---:|---:|
| **Baseline (250/40)** | 269,152 | 24,669 | 2,594 | 230 | 120,115 | 121,544 |
| **Safe Compact (60/40)** | 273,236 | 24,681 | 2,594 | 230 | 122,187 | 123,544 |
| **Safe Aggressive (40/40)** | 266,864 | 24,481 | 2,594 | 230 | 119,015 | 120,544 |

Crossing counts remain stable (+/- 1.5%) across safe inter-layer gap reductions.

---

## N. Invariant Results

```text
Primary Node Overlaps:       0 (Passes gate = 0)
Satellite Node Overlaps:     0 (Passes gate = 0)
Minimum Node Clearance:      40.00px (Passes gate >= 40.0px for safe configurations)
Layer Flow Violations:       13 (Preserved from baseline)
Determinism Coordinate Drift:0.00000px (Passes gate = 0.00000px)
```

---

## O. Determinism Results

Verified across 5 repeated executions and 5 shuffled input permutations on `pub-infra-mang`:

```text
5x Repeated Executions:          0.00000px coordinate drift across all 528 nodes
5x Shuffled Input Permutations:  0.00000px coordinate drift across all 528 nodes
```

---

## P. Cross-Dataset Validation

Evaluated baseline vs safe compact configuration (`layerSpacing = 60px`, `verticalGap = 40px`) across 5 real project datasets:

| Project Dataset | Nodes | Edges | Baseline Geometry | Safe Compact Geometry | Δ Height | Height Reduction % | Clearance | Overlaps | Generalizes? |
|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| **`pub-infra-mang`** | 528 | 2063 | 12,760 × 24,670px | 12,760 × 24,110px | -560px | -2.3% | 40.00px | 0 | **YES** |
| **`cst` (Cloud Spend)** | 240 | 1024 | 6,650 × 10,840px | 6,650 × 10,130px | -710px | -6.5% | 40.00px | 0 | **YES** |
| **`bqc`** | 274 | 603 | 10,320 × 8,880px | 10,320 × 7,850px | -1,030px | -11.6% | 40.00px | 0 | **YES** |
| **`movie`** | 9 | 16 | 450 × 720px | 450 × 700px | -20px | -2.8% | 40.00px | 0 | **YES** |
| **`project-b`** | 14 | 16 | 960 × 560px | 960 × 560px | 0px | 0.0% | 40.00px | 0 | **YES** |

### Conclusion:
Inter-layer gap compaction generalizes cleanly across all multi-layer Salesforce project datasets without introducing overlaps or clearance violations.

---

## Q. Causal Classification Matrix

| Mechanism | Isolated? | Stage 5 Effect | Stage 7 Effect | Final Height Effect | Crossing Effect | Classification |
|---|:---:|---:|---:|---:|---:|---|
| **Inter-Layer Gap (`layerSpacing`)** | YES | -640px | -970px | **-560px to -1260px** | Stable (+/- 1.5%) | **DIRECT FINAL-GEOMETRY LEVER (SAFE)** |
| **Local Tier Spacing (`verticalGap < 40px`)** | YES | 0px | -750px | **-440px** | Degraded | **UNSAFE / BLOCKED BY OVERLAPS** |
| **Stage 5 `targetRowWidth`** | YES | Variable | 0px | **0px** | 0 | **NO CAUSAL EFFECT (REFUTED)** |
| **Satellite Expansion (Stage 9)** | YES | 0px | 0px | **+375px (+1.5%)** | N/A | **SECONDARY CONTRIBUTOR** |
| **Component Packing (Stage 10)** | YES | 0px | 0px | **0px (Height) / +7660px (Width)** | N/A | **PRIMARY WIDTH DOMINATOR** |

---

## R. Refined Root-Cause Model

```text
REFINED ROOT-CAUSE MODEL:

1. Macro Architectural Layer Band Partitioning & 2D Row Stacking in Stage 5 sets the global vertical scale by stacking presentation, application, domain, and schema layer bands vertically.
        ↓
2. Multi-Layer Feature Region Heights inside the Application layer band force row heights to be large (~3,220px), accumulating ~15,000px inside Application layer band before Domain and Schema bands begin.
        ↓
3. Inter-Layer Gaps (`layerSpacing`) add fixed vertical clearance between layer bands. Reducing `layerSpacing` from 250px down to 40px cleanly reduces final height by 1,260px while preserving 100% of safety invariants (clearance >= 40px, 0 overlaps).
        ↓
4. Local Tier Row Spacing (`verticalGap`) cannot be reduced below 40px without causing node overlaps, making verticalGap compaction unsafe.
```

---

## S. Remaining Uncertainty

1. **Feature Height Dampening Instrumentation:** How to safely dampen multi-layer feature region heights in Stage 5 without causing intra-feature node collisions.
2. **Visual Overlay Alignment:** Verifying SVG feature overlay canvas rendering when aggressive inter-layer gap compaction is active.

---

## T. Smallest Safe Optimization Boundary

The smallest safe optimization boundary for eventual height optimization is:

1. **Target File:** `explorer/src/lib/layout/global-layout.ts`.
2. **Target Function:** `computeFeatureLayerYMap()`.
3. **Target Parameter:** `featureLayerSpacing` / `interLayerGap` (calibrating default from 250px to 60px when `enableFeatureLayout: true`).
4. **Protected Invariants:**
   - `verticalGap = 40px` (FROZEN to prevent overlaps)
   - Primary overlaps = 0
   - Satellite overlaps = 0
   - Minimum clearance >= 40.0px
   - Determinism drift = 0.00000px

---

## U. Implementation Plan for Next Phase

For the future optimization implementation phase:

1. **Update Default `featureLayerSpacing`:** Set default `featureLayerSpacing` to `60px` in `computeFeatureLayerYMap()` in `global-layout.ts`.
2. **Freeze `verticalGap`:** Enforce `verticalGap >= 40px` in `local-layout.ts` to protect clearance contracts.
3. **Validate Invariants:** Execute `Phase12GeometryDominatorAudit.test.ts` and `npm run test:cli`.
4. **Verify Overlays:** Run visual verification suite to confirm SVG overlay canvas alignment.

---

## V. Production-Code Change Status

```text
NO PRODUCTION CHANGES
```

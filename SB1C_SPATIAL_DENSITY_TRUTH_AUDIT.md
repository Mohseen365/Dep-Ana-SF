# SB-1C — Spatial Density Truth Audit
**Phase 4 — Read-Only Measurement of Actual Node Proximity**

**Audit Date:** October 2, 2026
**Target Repository:** `/app`
**HEAD SHA:** `2c3c2a4d7db1486153fe7a46999e0ef19cbccff4`
**Current Branch:** `jules-15087219373162576225-82eea426`
**Final Verdict:** `SPATIAL_DENSITY_IMPROVEMENT_CONFIRMED`

---

## 1. Executive Summary

This deliverable establishes the independent **Phase 4 Spatial Density Truth Audit** for the Salesforce Architecture Explorer graph layout engine.

The original product problem investigated is:

> **Architecture nodes become excessively far apart, producing pathological horizontal spread and poor spatial density in Graph View.**

The Phase-3 audit previously rejected SB-1C's acceptance on structural collision-prevention grounds (identifying that Stage 8 produced pre-cleanup bridge-primary overlaps that Stage 11 subsequently displaced). However, Phase 3 explicitly left open the primary product question: **Did SB-1C materially improve the actual spatial proximity of semantically related nodes in the final rendered layout?**

This Phase 4 audit measures actual semantic node proximity directly across all pipeline stages (Stage 7 → Stage 8 → Stage 9 → Stage 10 → Stage 11 → Final Layout) across the three canonical production datasets: **Cloud Spend Tracker (CST)**, **Bouquet Quality Control (BQC)**, and **Public Infrastructure Management (PBIM)**.

### Key Forensic Findings

1. **Substantial Semantic Proximity Improvement:** SB-1C dramatically reduced median semantic-neighbor distances in the final rendered layout by **61.2% on CST** (2,262.92px → 876.81px), **74.1% on BQC** (2,403.20px → 622.90px), and **56.0% on PBIM** (3,454.85px → 1,520.13px) compared to the pre-SB1C baseline.
2. **Pathological Outlier Reduction:** SB-1C reduced P95 semantic-neighbor distances by **41.1% on CST** (5,388.75px → 3,175.87px), **59.1% on BQC** (5,098.71px → 2,086.71px), and **53.2% on PBIM** (8,253.63px → 3,866.26px). Maximum semantic distances dropped by **58.8% on CST**, **25.3% on BQC**, and **43.6% on PBIM**.
3. **Canvas Width vs. Local Density:** Canvas width was reduced by **24.1% on CST** (11,039.20px → 8,377.60px), **49.9% on BQC** (12,140.00px → 6,080.00px), and **43.2% on PBIM** (18,900.00px → 10,740.00px). Local spatial density doubled on BQC (22.57 → 45.07 nodes/1,000px) and PBIM (27.94 → 49.16 nodes/1,000px).
4. **Stage 11 Locality Impact:** While Stage 11 collision cleanup (and Stage 10 component packing) shifted nodes, it **did NOT undo the Stage 8 locality gains**. Median semantic distances at Stage 8 were 641.40px (CST), 504.84px (BQC), and 1,096.19px (PBIM); final rendered semantic distances were 876.81px (CST), 622.90px (BQC), and 1,520.13px (PBIM)—preserving over 75%–85% of the initial Stage 8 compaction.
5. **Origin of Remaining Pathological Distance:** The primary driver of remaining excessive distance in multi-component datasets (like PBIM) is **Stage 10 Component Packing**, which applies rigid horizontal translations to disconnected subgraphs (e.g. +2,200px shift), and **Stage 9 Satellite Placement**, which places test/field satellites connected to cross-layer primary nodes.

---

## 2. Original Problem Definition

The original product problem is:

> **Architecture nodes become excessively far apart, producing pathological horizontal spread and poor spatial density in Graph View.**

In historical baseline layouts (pre-SB1C), Stage 8 bridge candidate placement utilized an unbounded 1D horizontal search loop (`while (true) candidateX += 160px`) on single layer Y-lanes. When high-degree bridge nodes competed for coplanar horizontal slots, candidates expanded without bound, pushing nodes out to extreme X coordinates (e.g. X = 19,260px on PBIM).

This audit evaluates whether SB-1C's bounded multi-lane dynamic corridor placement (`Y ∈ {Y0 - 100px, Y0, Y0 + 100px}`) successfully pulled semantically connected architecture nodes closer together in the final graph output without sacrificing semantic cohesion.

---

## 3. Repository Identity

* **Repository Root:** `/app`
* **Current HEAD SHA:** `2c3c2a4d7db1486153fe7a46999e0ef19cbccff4`
* **Current Branch:** `jules-15087219373162576225-82eea426`
* **Git Working Tree Status:** Clean (0 modified tracked files)
* **Node.js Version:** `v22.22.1`
* **npm Version:** `11.11.0`
* **Build / Runtime Environment:** Vite `^5.4.1`, TypeScript `^5.5.3`, Vitest `^2.1.9`

---

## 4. Dataset Identity

All measurements were performed against the three authoritative canonical production datasets stored in `explorer/public/projects/`:

| Dataset Key | Project Name | Node Count | Edge Count | Bridge Count | Fixture File Path |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **CST** | Cloud Spend Tracker | 240 | 1,024 | 79 | `explorer/public/projects/cst/explorer-data.json` |
| **BQC** | Bouquet Quality Control | 274 | 603 | 65 | `explorer/public/projects/bqc/explorer-data.json` |
| **PBIM** | Public Infrastructure Management | 528 | 2,063 | 119 | `explorer/public/projects/pbim/explorer-data.json` |

*Verification Note:* All dataset files were loaded and parsed directly from disk. Node counts, edge counts, and bridge counts match canonical repository baselines exactly.

---

## 5. Measurement Methodology

A dedicated, non-mutating measurement test runner (`explorer/src/test/sb1c-phase4-spatial-density.test.ts`) was executed under Vitest to reconstruct bit-for-bit node positions at every stage of the layout pipeline.

### Distance & Locality Definitions

1. **Semantic Neighbor Distance:** For a bridge node $b$, let $N(b) = \{v_1, v_2, \dots, v_k\}$ be the set of nodes semantically connected to $b$ in the layout analysis graph. The Euclidean distance between $b = (x_b, y_b)$ and $v_i = (x_i, y_i)$ is:
   $$d(b, v_i) = \sqrt{(x_b - x_i)^2 + (y_b - y_i)^2}$$
   For each bridge $b$, we compute $\min_{i} d(b, v_i)$, $\max_{i} d(b, v_i)$, $\text{mean}_{i} d(b, v_i)$, and $\text{median}_{i} d(b, v_i)$. Percentiles across all bridges in a dataset are reported.
2. **Corridor Locality:** For a bridge $b$ connected to domain set $D(b)$, let $C(d)$ be the horizontal center $x$-coordinate of domain $d \in D(b)$. The corridor midpoint is $x_{\text{mid}} = \frac{1}{|D(b)|} \sum_{d \in D(b)} C(d)$. We measure $|x_b - x_{\text{mid}}|$ and distance to domain bounds $[x_{\min}^{\text{legal}}, x_{\max}^{\text{legal}}]$.
3. **Stage-by-Stage Displacement:** For each bridge $b$, distance shifted between stage $S_A$ and stage $S_B$:
   $$\Delta_{S_A \to S_B}(b) = \sqrt{(x_b^{S_B} - x_b^{S_A})^2 + (y_b^{S_B} - y_b^{S_A})^2}$$

---

## 6. Layout Pipeline Reconstruction

Coordinates for every node were tracked sequentially through all 13 canonical stages of `computeArchitectureLayoutWithMetadata`:

```
Stage 0: Facts Normalization & Defensive Cloning
   │
Stage 1: Base Architecture Analysis
   │
Stage 2: Layer Classification (`layerMap`)
   │
Stage 3: Domain Discovery (`domainMap`)
   │
Stage 4: Centrality Analysis (`centralityMap` -> Hubs & Bridges)
   │
Stage 5: Global Domain Layout -> `stage5Width`
   │
Stage 6: Layer Ordering & Crossing Reduction (`orderingResult`)
   │
Stage 7: Primary Production Local Layout -> `stage7Positions`
   │
Stage 8: Hub & Bridge Spatial Placement (SB-1C 2D Corridor Placement) -> `stage8Positions`
   │
Stage 9: Secondary Satellite Placement (Tests, Fields, Triggers) -> `stage9Positions`
   │
Stage 10: Disconnected Component Packing (2D FFDH Shelf Packing) -> `stage10Positions`
   │
Stage 11: Final Global Spatial Cleanup Pass (`resolveSpacingAndCollisions`) -> `stage11Positions`
   │
Stage 12/13: Position Authority Restoration & Final Geometry Output -> `finalPositions`
```

---

## 7. Canvas Width Results

Canvas width measures global bounding box span ($x_{\max} + 120 - x_{\min}$).

| Dataset | Stage 7 Width | Pre-SB1C Stage 8 Width | SB-1C Stage 8 Width | Pre-SB1C Final Width | SB-1C Final Width | Final Delta vs Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 4,580.00 px | 11,039.20 px | **4,837.60 px** | 11,039.20 px | **8,377.60 px** | **-2,661.60 px (-24.1%)** |
| **BQC** | 4,620.00 px | 11,660.00 px | **4,460.00 px** | 12,140.00 px | **6,080.00 px** | **-6,060.00 px (-49.9%)** |
| **PBIM** | 4,657.89 px | 18,580.00 px | **7,700.00 px** | 18,900.00 px | **10,740.00 px** | **-8,160.00 px (-43.2%)** |

*Analysis:* SB-1C achieved massive global canvas width reductions across all datasets. Stage 8 width expansion was strictly bounded (+257.60px on CST, +0.00px on BQC, +3,042.11px on PBIM vs +13,922.11px baseline).

---

## 8. Semantic Neighbor Distance Results

Measures maximum Euclidean distance from each bridge node to its connected semantic neighbors in the final layout.

### A. Cloud Spend Tracker (CST — 79 Bridges)

| Metric / Stage | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-SB1C Baseline Final** | 640.31 | 1,571.56 | 2,262.92 | 3,182.70 | 4,856.44 | 5,388.75 | 8,667.78 | 8,667.78 | 2,687.40 |
| **SB-1C Stage 8** | 160.00 | 428.81 | 641.40 | 929.19 | 2,577.22 | 2,792.60 | 3,040.84 | 3,240.79 | 928.54 |
| **SB-1C Final Layout** | 149.18 | 544.06 | **876.81** | 2,001.97 | 2,991.76 | **3,175.87** | 3,387.96 | **3,574.35** | 1,313.36 |
| **Delta vs Baseline** | -76.7% | -65.4% | **-61.2%** | -37.1% | -38.4% | **-41.1%** | -60.9% | **-58.8%** | -51.1% |

### B. Bouquet Quality Control (BQC — 65 Bridges)

| Metric / Stage | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-SB1C Baseline Final** | 305.29 | 1,289.96 | 2,403.20 | 3,875.05 | 4,807.04 | 5,098.71 | 5,386.12 | 5,812.40 | 2,636.59 |
| **SB-1C Stage 8** | 100.00 | 311.71 | 504.84 | 729.09 | 1,010.23 | 1,445.44 | 2,122.88 | 2,328.21 | 615.56 |
| **SB-1C Final Layout** | 100.00 | 368.78 | **622.90** | 841.41 | 1,892.40 | **2,086.71** | 3,970.44 | **4,339.75** | 815.69 |
| **Delta vs Baseline** | -67.2% | -71.4% | **-74.1%** | -78.3% | -60.6% | **-59.1%** | -26.3% | **-25.3%** | -69.1% |

### C. Public Infrastructure Management (PBIM — 119 Bridges)

| Metric / Stage | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-SB1C Baseline Final** | 480.00 | 2,140.23 | 3,454.85 | 5,832.41 | 7,385.92 | 8,253.63 | 9,001.41 | 9,269.52 | 3,974.42 |
| **SB-1C Stage 8** | 100.00 | 520.00 | 1,096.19 | 2,472.34 | 3,051.07 | 3,289.93 | 3,805.37 | 3,826.73 | 1,443.03 |
| **SB-1C Final Layout** | 100.00 | 702.69 | **1,520.13** | 2,864.45 | 3,517.08 | **3,866.26** | 4,372.61 | **5,227.96** | 1,759.97 |
| **Delta vs Baseline** | -79.2% | -67.2% | **-56.0%** | -50.9% | -52.4% | **-53.2%** | -51.4% | **-43.6%** | -55.7% |

---

## 9. Corridor Locality Results

Measures bridge node horizontal distance from connected domain corridor midpoints at Stage 8 and Final Layout.

| Dataset | Stage | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | SB-1C Stage 8 | 0.00 | 180.00 | **460.00** | 800.00 | 2,730.00 | 2,906.00 | 3,508.00 | 3,820.00 | 774.46 |
| **CST** | SB-1C Final | 2.40 | 180.00 | **460.00** | 800.00 | 2,730.00 | 2,906.00 | 3,508.00 | 3,820.00 | 774.46 |
| **BQC** | SB-1C Stage 8 | 20.00 | 180.00 | **420.00** | 560.91 | 820.00 | 1,247.18 | 2,228.18 | 3,508.18 | 509.31 |
| **BQC** | SB-1C Final | 20.00 | 340.00 | **420.00** | 560.91 | 820.00 | 1,247.18 | 2,228.18 | 3,508.18 | 529.31 |
| **PBIM**| SB-1C Stage 8 | 20.00 | 120.00 | **200.00** | 820.00 | 2,340.00 | 3,090.00 | 3,360.00 | 3,520.00 | 682.02 |
| **PBIM**| SB-1C Final | 20.00 | 1,020.00 | **2,200.00** | 2,485.00 | 3,724.00 | 4,600.00 | 5,313.60 | 5,480.00 | 2,039.27 |

*Analysis:* On CST and BQC, corridor locality is almost completely preserved from Stage 8 to Final (median shift = 0.00px to +20.00px). On PBIM, median corridor midpoint distance increases from 200.00px to 2,200.00px due to Stage 10 Component Packing translating disconnected Subgraph 2 by +2,200px horizontally.

---

## 10. Stage-by-Stage Displacement Results

Measures Euclidean displacement ($\text{px}$) of bridge nodes across layout pipeline stage transitions.

### A. Stage 8 → Stage 11 Displacement

| Dataset | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 171.17 | 171.17 | **171.17** | 171.17 | 171.17 | 228.68 | 3,435.88 | 3,435.88 | 291.11 |
| **BQC** | 380.13 | 380.13 | **380.13** | 380.13 | 434.63 | 455.91 | 524.74 | 547.08 | 394.17 |
| **PBIM** | 2,002.82 | 2,272.64 | **2,272.64** | 2,272.64 | 2,272.64 | 2,298.60 | 2,353.06 | 2,360.19 | 2,264.97 |

### B. Stage 7 → Final Overall Displacement

| Dataset | Min | P25 | Median | P75 | P90 | P95 | P99 | Max | Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 72.80 | 418.00 | **1,103.56** | 2,629.54 | 3,409.92 | 4,128.33 | 5,133.26 | 6,241.84 | 1,616.55 |
| **BQC** | 72.80 | 373.76 | **819.50** | 1,577.07 | 2,450.82 | 3,064.34 | 4,138.00 | 4,558.72 | 1,145.20 |
| **PBIM** | 496.49 | 1,214.33 | **2,151.95** | 3,849.38 | 5,395.77 | 6,363.37 | 7,012.58 | 7,188.71 | 2,688.30 |

---

## 11. Local Density Results

Measures overall graph node density per 1,000px of horizontal span and arbitrary nearest-neighbor distances in Final Layout.

| Dataset | Final Canvas Width | Nodes / 1,000px Span | Arbitrary NN Min | Arbitrary NN Median | Arbitrary NN P95 | Arbitrary NN Max | Arbitrary NN Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 8,377.60 px | **28.65** | 0.00 px | 100.00 px | 161.25 px | 1,200.00 px | 114.73 px |
| **BQC** | 6,080.00 px | **45.07** | 0.00 px | 100.00 px | 161.25 px | 510.88 px | 110.88 px |
| **PBIM** | 10,740.00 px | **49.16** | 0.00 px | 100.00 px | 161.25 px | 943.40 px | 109.54 px |

*Comparison:* Pre-SB1C baseline node densities were 21.74 nodes/1,000px (CST), 22.57 nodes/1,000px (BQC), and 27.94 nodes/1,000px (PBIM). SB-1C roughly **doubled the local node density** on BQC and PBIM without creating arbitrary node overcrowding.

---

## 12. Pathological Outlier Analysis

Top 5 worst spatial outliers by maximum final semantic neighbor distance per dataset:

### A. Cloud Spend Tracker (CST)

1. **`External:Object:ContentVersion`** (Bridge)
   - *Connected Neighbors:* `ContentVersionSelector`, `SpendTrackerTest`
   - *Positions:* P7 (2260, 780) → P8 (180, 780) → P9 (180, 780) → P10 (200, 950) → Final (200, 950)
   - *Max Semantic Distance:* **3,574.35 px** | *Origin Stage:* `STAGE_8_ORIGIN` (P7→P8 shift = 2,080px)
2. **`ApexClass:FiscalUtilsTest`** (Satellite / Test)
   - *Connected Neighbors:* `FiscalUtils`, `Assert`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (1040, 360) → P10 (1060, 530) → Final (1060, 530)
   - *Max Semantic Distance:* **3,335.39 px** | *Origin Stage:* `STAGE_9_ORIGIN` (P8→P9 shift = 1,100.55px)
3. **`Field:Spend_Import_Batch__c.Records_Created__c`** (Satellite / Field)
   - *Connected Neighbors:* `AdminDataExplorerController`, `AdminOverviewController`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (4160, 1180) → P10 (4180, 1350) → Final (4180, 1350)
   - *Max Semantic Distance:* **3,291.20 px** | *Origin Stage:* `STAGE_9_ORIGIN` (P8→P9 shift = 4,324.12px)

### B. Bouquet Quality Control (BQC)

1. **`Field:Bouquet_Order__c.Shipping_Duration_Days__c`** (Satellite / Field)
   - *Connected Neighbors:* `BouquetOrderRepository`, `BouquetOrderServiceTest`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (460, 1280) → P10 (800, 1450) → Final (800, 1450)
   - *Max Semantic Distance:* **4,339.75 px** | *Origin Stage:* `STAGE_9_ORIGIN` (P8→P9 shift = 1,360.15px)
2. **`Field:Bouquet_Order__c.Completed_Hours__c`** (Satellite / Field)
   - *Connected Neighbors:* `BouquetCapacityService`, `BouquetOrderRepository`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (460, 1580) → P10 (800, 1750) → Final (800, 1750)
   - *Max Semantic Distance:* **3,762.71 px** | *Origin Stage:* `STAGE_9_ORIGIN` (P8→P9 shift = 1,645.60px)
3. **`ApexClass:BouquetOrderFormValidator`** (Bridge)
   - *Connected Neighbors:* `BouquetException`, `BouquetOrderFormController`, `BouquetOrderRequestDTO`
   - *Positions:* P7 (740, 260) → P8 (2192.12, 360) → P9 (2192.12, 360) → Final (2532.12, 530)
   - *Max Semantic Distance:* **2,328.21 px** | *Origin Stage:* `STAGE_8_ORIGIN` (P7→P8 shift = 1,455.56px)

### C. Public Infrastructure Management (PBIM)

1. **`External:Maintenance_Requests__r`** (Bridge)
   - *Connected Neighbors:* `AssetSelectorTest`, `EngineerService`
   - *Positions:* P7 (3440, 680) → P8 (4760, 780) → P10 (6960, 1350) → Final (6960, 1350)
   - *Max Semantic Distance:* **5,227.96 px** | *Origin Stage:* `STAGE_10_ORIGIN` (P9→P10 shift = 2,272.64px)
2. **`Field:Expense_Record__c.Amount__c`** (Satellite / Field)
   - *Connected Neighbors:* `BudgetServiceTest`, `ExpenseSelector`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (4220, 1180) → P10 (6420, 1750) → Final (6420, 1750)
   - *Max Semantic Distance:* **4,405.78 px** | *Origin Stage:* `STAGE_9_ORIGIN` (P8→P9 shift = 4,381.87px)
3. **`Field:Assignment_History__c.Old_Engineer__c`** (Satellite / Field)
   - *Connected Neighbors:* `MaintenanceRequestTriggerHandlerTest`, `ManagementAssignmentServiceTest`
   - *Positions:* P7 (0, 0) → P8 (0, 0) → P9 (1640, 1180) → P10 (3840, 1750) → Final (3840, 1750)
   - *Max Semantic Distance:* **4,221.47 px** | *Origin Stage:* `STAGE_10_ORIGIN` (P9→P10 shift = 2,272.64px)

---

## 13. Stage-11 Locality Impact

Phase 3 noted that Stage 11 collision cleanup displaced a large fraction of bridge nodes (56 on CST, 60 on BQC, 104 on PBIM).

Our Phase 4 measurements evaluate whether Stage 11 degraded semantic locality:

* **CST:** Stage 8 median max semantic distance was **641.40px**; Stage 11 / Final median max semantic distance is **876.81px** (+235.41px increase).
* **BQC:** Stage 8 median max semantic distance was **504.84px**; Stage 11 / Final median max semantic distance is **622.90px** (+118.06px increase).
* **PBIM:** Stage 8 median max semantic distance was **1,096.19px**; Stage 11 / Final median max semantic distance is **1,520.13px** (+423.94px increase).

*Verdict:* Stage 11 collision cleanup and Stage 10 component packing caused minor outward shifts (+118px to +424px), but **did NOT undo SB-1C's locality gains**. Compared to the pre-SB1C baseline (2,262.92px CST, 2,403.20px BQC, 3,454.85px PBIM), final rendered semantic distances under SB-1C remain **56.0% to 74.1% smaller**.

---

## 14. Baseline vs. SB-1C Comparison Table

Central comparison table across all canonical datasets:

| Dataset | Metric | Baseline | SB-1C Stage 8 | SB-1C Final | Delta vs Baseline | Stage-11 / Final Effect |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **CST** | Canvas width | 11,039.20 px | 4,837.60 px | **8,377.60 px** | **-2,661.60 px (-24.1%)** | Expanded by +3,540.00 px |
| **CST** | Median semantic distance | 2,262.92 px | 641.40 px | **876.81 px** | **-1,386.11 px (-61.2%)** | Preserved 61.2% reduction |
| **CST** | P95 semantic distance | 5,388.75 px | 2,792.60 px | **3,175.87 px** | **-2,212.88 px (-41.1%)** | Preserved 41.1% reduction |
| **CST** | Max semantic distance | 8,667.78 px | 3,240.79 px | **3,574.35 px** | **-5,093.43 px (-58.8%)** | Preserved 58.8% reduction |
| **CST** | Median Stage8→Final displacement | — | — | **171.17 px** | — | Uniform 171px Y-shift |
| **CST** | Max Stage8→Final displacement | — | — | **3,435.88 px** | — | Single outlier shift |
| **BQC** | Canvas width | 12,140.00 px | 4,460.00 px | **6,080.00 px** | **-6,060.00 px (-49.9%)** | Expanded by +1,620.00 px |
| **BQC** | Median semantic distance | 2,403.20 px | 504.84 px | **622.90 px** | **-1,780.30 px (-74.1%)** | Preserved 74.1% reduction |
| **BQC** | P95 semantic distance | 5,098.71 px | 1,445.44 px | **2,086.71 px** | **-3,012.00 px (-59.1%)** | Preserved 59.1% reduction |
| **BQC** | Max semantic distance | 5,812.40 px | 2,328.21 px | **4,339.75 px** | **-1,472.65 px (-25.3%)** | Preserved 25.3% reduction |
| **BQC** | Median Stage8→Final displacement | — | — | **380.13 px** | — | Uniform 380px Y-shift |
| **BQC** | Max Stage8→Final displacement | — | — | **547.08 px** | — | Bounded cleanup shift |
| **PBIM**| Canvas width | 18,900.00 px | 7,700.00 px | **10,740.00 px** | **-8,160.00 px (-43.2%)** | Expanded by +3,040.00 px |
| **PBIM**| Median semantic distance | 3,454.85 px | 1,096.19 px | **1,520.13 px** | **-1,934.72 px (-56.0%)** | Preserved 56.0% reduction |
| **PBIM**| P95 semantic distance | 8,253.63 px | 3,289.93 px | **3,866.26 px** | **-4,387.37 px (-53.2%)** | Preserved 53.2% reduction |
| **PBIM**| Max semantic distance | 9,269.52 px | 3,826.73 px | **5,227.96 px** | **-4,041.56 px (-43.6%)** | Preserved 43.6% reduction |
| **PBIM**| Median Stage8→Final displacement | — | — | **2,272.64 px** | — | Component 2 shift (+2200, +570) |
| **PBIM**| Max Stage8→Final displacement | — | — | **2,360.19 px** | — | Bounded component shift |

---

## 15. Crossing Results

Primary edge crossing count comparison between pre-SB1C baseline and SB-1C final layout:

| Dataset | Pre-SB1C Total Crossings | SB-1C Final Total Crossings | Primary-Primary | Primary-Bridge | Bridge-Bridge | Crossing Delta |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 99,193 | 99,193 | 9,716 | 2,504 | 180 | **0 (0.0%)** |
| **BQC** | 28,082 | 28,082 | 5,852 | 546 | 30 | **0 (0.0%)** |
| **PBIM** | 306,711 | 306,010 | 31,719 | 13,560 | 1,801 | **-701 (-0.2%)** |

*Analysis:* Edge crossing counts were fully preserved on CST and BQC, and slightly reduced (-701 crossings) on PBIM. SB-1C's spatial compaction did not induce edge crossing regressions.

---

## 16. Performance Context

* **Stage 8 Isolated Execution Time:**
  - CST: **44 ms**
  - BQC: **28 ms**
  - PBIM: **208 ms**
* **Full Pipeline Execution Time:**
  - CST: **974 ms**
  - BQC: **621 ms**
  - PBIM: **9,544 ms**

*Note:* Full pipeline execution time on PBIM (9.5s) is heavily dominated by **Stage 9 Satellite Placement** and **Stage 11 Collision Cleanup** (which perform $O(N \times E)$ segment intersection checks), NOT Stage 8 bridge candidate search. Stage 8 isolated execution represents $< 2.2\%$ of total pipeline runtime.

---

## 17. Root Cause of Remaining Spatial-Density Problem

Answers to specific architectural questions:

### Question A: Did SB-1C reduce global canvas width?
**YES.** Final rendered canvas width was reduced by 2,661.60px (-24.1%) on CST, 6,060.00px (-49.9%) on BQC, and 8,160.00px (-43.2%) on PBIM.

### Question B: Did SB-1C reduce semantic-neighbor distances?
**YES.** Median semantic-neighbor distance in the final layout dropped by **61.2% on CST**, **74.1% on BQC**, and **56.0% on PBIM**.

### Question C: Did SB-1C reduce pathological maximum/P95 semantic distances?
**YES.** P95 semantic distances dropped by 41.1% to 59.1% across all datasets. Max semantic distances dropped by 25.3% to 58.8%.

### Question D: Did Stage 11 preserve or undo the Stage-8 locality improvement?
**PRESERVED.** Stage 11 collision cleanup (and Stage 10 component packing) applied necessary clearance shifts, but preserved over 75%–85% of Stage 8's spatial compaction.

### Question E: Did SB-1C merely compress empty space while leaving important semantic relationships distant?
**NO.** SB-1C directly pulled semantically connected bridge nodes closer to their primary neighbor nodes and domain corridors.

---

## 18. What SB-1C Actually Solved

1. **Eliminated Unbounded 1D Horizontal Spread:** Replaced $1\text{D} \to \infty$ search loops with 3-lane 2D corridor placement ($Y_0 - 100\text{px}, Y_0, Y_0 + 100\text{px}$).
2. **Dramatically Improved Semantic Locality:** Reduced median semantic neighbor distances by 56% to 74% across production datasets.
3. **Eliminated Bridge Exhaustion:** Zero bridge candidate exhaustion across CST, BQC, and PBIM.
4. **Preserved Structural Determinism:** 100% bit-for-bit coordinate identity across 10x repeated runs and 4-way input-order array shuffling.

---

## 19. What SB-1C Did Not Solve

1. **Stage 8 Pre-Cleanup Primary Overlaps:** Stage 8 candidate placement (`calculateBridgeCandidatePosition`) evaluates candidates against `allocatedPositions` containing only previously placed bridges rather than the complete Stage 7 primary node map, producing pre-cleanup collisions that Stage 11 must resolve.
2. **Stage 10 Component Packing Translation Offsets:** Disconnected components are packed using FFDH shelf packing, translating entire subgraphs (e.g. +2,200px) which increases absolute coordinate offsets for cross-component satellite nodes.
3. **Stage 9 Full Pipeline Runtime Bottleneck:** Stage 9 satellite placement execution time on large graphs (PBIM) remains the dominant pipeline bottleneck.

---

## 20. Recommended Single Next Experiment

### Experiment Title: Incident Primary Occupancy Map Pass for Stage 8 Bridge Candidates

* **Hypothesis:** Passing the complete Stage 7 primary node occupancy map (`basePositions`) into `calculateBridgeCandidatePosition` alongside `allocatedPositions` will allow Stage 8 to detect co-planar Stage 7 primary nodes during initial candidate evaluation, eliminating pre-cleanup Stage 8 bridge-primary overlaps (13 CST, 14 BQC, 34 PBIM) without altering Stage 8 corridor bounds or degrading semantic locality.
* **Variable Changed:** Pass `basePositions` (Stage 7 primary positions) into `calculateBridgeCandidatePosition`'s `allocatedPositions` parameter during Stage 8 iteration.
* **Variables Held Constant:** All Stage 8 corridor geometry constants (`laneOffsets`, `corridorExpansion`, `AABB` bounds), Stage 9 satellite placement, Stage 10 component packing, Stage 11 cleanup parameters.
* **Datasets:** `CST`, `BQC`, `PBIM`.
* **Measurements:** Stage 8 pre-cleanup overlap count, final semantic neighbor distance percentiles, final canvas width, 10x determinism.
* **Pass Criteria:** Pre-cleanup Stage 8 bridge-primary overlaps = 0 across CST, BQC, and PBIM, with 0.00000px coordinate drift on deterministic shuffles, and final median semantic distance change $\le 5\%$.
* **Failure Criteria:** Pre-cleanup Stage 8 overlaps $> 0$, or Stage 8 candidate exhaustion $> 0$.

---

## 21. Explicit Non-Goals

This Phase 4 Spatial Density Truth Audit does NOT attempt to:
* Modify production layout code.
* Modify unit or integration test files.
* Modify dataset fixture files.
* Change Stage 8, Stage 9, or Stage 11 layout constants.
* Optimize Stage 9 satellite placement performance.
* Re-architect UI rendering components.
* Introduce 3D graph models.

---

## 22. Evidence Index

1. **Test Runner Source:** `explorer/src/test/sb1c-phase4-spatial-density.test.ts`
2. **Raw Telemetry JSON:** `audit-evidence/sb1c-phase4-measurements.json`
3. **Validation Suite:** `explorer/src/test/sb1c-validation.test.ts`
4. **Forensic Capacity Suite:** `explorer/src/test/sb1c-forensic-runner.test.ts`
5. **Phase 1 Contract:** `SB1C_PHASE1_REPOSITORY_TRUTH_AND_IMPLEMENTATION_CONTRACT.md`
6. **Phase 3 Re-Audit Report:** `SB1C_PHASE3_ADVERSARIAL_ACCEPTANCE_REAUDIT.md`

---

## 23. Final Verdict

```text
SPATIAL_DENSITY_IMPROVEMENT_CONFIRMED
```

*Final Verdict Justification:* Empirical measurement across all three canonical production datasets confirms that SB-1C materially improved actual semantic node proximity in the final rendered layout (reducing median semantic neighbor distances by **56.0% to 74.1%** and canvas width by **24.1% to 49.9%**), with final geometry preserving the vast majority of Stage 8 spatial compaction.

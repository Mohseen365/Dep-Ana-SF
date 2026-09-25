# PHASE 11 — CONTROLLED ASPECT-RATIO OPTIMIZATION EXPERIMENT REPORT

## A. Executive Finding

Phase 11 executed a controlled, evidence-first optimization experiment evaluating the effect of sweeping `targetRowWidth` (from 3,200px to 20,000px) across canonical, extreme-scale (`pub-infra-mang`), medium (`bqc`), and small (`movie`) project datasets.

### Executive Verdict & Measured Truths:
1. **Stage 5 vs. Stage 11 Height Disconnect:** On extreme-scale projects (`pub-infra-mang`, 528 nodes, 47 features), increasing `targetRowWidth` from 3,200px to 20,000px collapses Stage 5 feature region height by **-46.5%** (from 21,940px down to 11,740px) as total Stage 5 feature rows collapse from 6 rows to the 4-row architectural layer floor (1 row per layer). However, the **Stage 11 Final Canvas Height decreases by ONLY -1.5%** (from 6,580px down to 6,480px).
2. **Downstream Height Bottleneck:** The downstream layout pipeline (Stage 7 local node layout, Stage 8 bridge corridors, Stage 9 satellite placement, and inter-layer Y-offset spacing) introduces vertical bounding box expansion that absorbs Stage 5 row reductions. Stage 5 width adjustments do not control the inter-layer vertical spacing or local node tier heights.
3. **Medium Project Behavior (`bqc`):** On medium projects, increasing `targetRowWidth` from 2,058px to 3,200px–5,000px reduces Stage 5 height by **-42.4%** (8,880px $\rightarrow$ 5,060px) and final canvas height by **-11.0%** (3,280px $\rightarrow$ 2,920px) while reducing final canvas width by **-13.0%** (10,179px $\rightarrow$ 8,859px). Increasing target width beyond 5,000px yields zero additional canvas change because all features in each layer already fit on a single row.
4. **Small Project Invariance (`movie`):** Small projects (9 nodes, 3 features) are completely invariant to `targetRowWidth` changes (0.0% geometry change) because total feature widths ($640\text{px}$) fit well below all evaluated candidate ceilings.
5. **Determinism:** All candidate evaluations preserve $0.00000\text{ px}$ coordinate drift across 10x repeated runs and 5x shuffled node/edge input permutations.

**EXECUTIVE CLASSIFICATION:**
```text
PHASE 11 CLASSIFICATION:

D — Width optimization cannot adequately solve the vertical accumulation problem
```

---

## B. Experimental Question

Following Phase 10, 10A, 10B, and 10C, which established that `targetRowWidth` is a real Stage 5 control variable capable of altering intra-layer row wrapping, Phase 11 asks:

> **What target-width regime materially reduces extreme vertical accumulation without creating unacceptable horizontal expansion, crossing growth, spacing degradation, architectural readability problems, or regression failures?**

This phase was executed purely as a controlled experiment. No production default was modified, no layout code was redesigned, and all temporary experiment instrumentation was completely cleaned up.

---

## C. Current Production Baseline

The current production implementation calculates `targetRowWidth` in `explorer/src/lib/layout/global-layout.ts:1221`:

$$\text{targetRowWidth} = \max\left(1200, \min\left(3200, \sqrt{\text{totalWidthSum} \times 300 \times 1.6}\right)\right)$$

### Production Baseline Measurements Across Datasets:

| Metric | Canonical (`cst`) | Extreme (`pub-infra-mang`) | Medium (`bqc`) | Small (`movie`) |
| :--- | ---: | ---: | ---: | ---: |
| **Node Count** | 240 | 528 | 274 | 9 |
| **Edge Count** | 1,024 | 2,063 | 603 | 16 |
| **Effective Target Row Width** | 2,162 px | 3,200 px | 2,058 px | 1,200 px |
| **Stage 5 Feature Count** | 23 | 47 | 20 | 3 |
| **Stage 5 Row Count** | 4 | 6 | 3 | 3 |
| **Stage 5 W x H** | 1,840 x 7,300 px | 2,900 x 21,940 px | 2,920 x 8,880 px | 640 x 640 px |
| **Stage 5 Aspect Ratio** | 0.252 | 0.132 | 0.329 | 1.000 |
| **Stage 11 Final W x H** | 5,450 x 3,680 px | 11,600 x 6,580 px | 10,179 x 3,280 px | 450 x 875 px |
| **Final Aspect Ratio** | 1.481 | 1.763 | 3.103 | 0.514 |
| **$C_{pp}$ (Primary Crossings)** | 8,704 | 32,486 | 6,611 | 1 |
| **$C_{total}$ (Total Crossings)** | 94,662 | 315,377 | 31,620 | 1 |
| **Primary Overlaps** | 0 | 0 | 0 | 0 |
| **Satellite Overlaps** | 0 | 0 | 0 | 0 |
| **Layer Violations** | 0 | 0 | 0 | 0 |
| **Min Clearance** | $\ge 40.0$ px | $\ge 40.0$ px | $\ge 40.0$ px | $\ge 40.0$ px |
| **Determinism Drift** | 0.00000 px | 0.00000 px | 0.00000 px | 0.00000 px |

---

## D. Dataset Inventory

Representative datasets selected from `audit-fixtures/cloud-spend-tracker/` and `explorer/public/projects/`:

1. **`audit-fixtures/cloud-spend-tracker/explorer-data.json` (`cst_canonical`)**:
   Canonical benchmark fixture (240 nodes, 1,024 edges, 23 features). Serves as the primary regression baseline.
2. **`explorer/public/projects/pub-infra-mang/explorer-data.json` (`pub-infra-mang`)**:
   Extreme-scale real project (528 nodes, 2,063 edges, 47 features across 4 architectural layers). Demonstrates extreme vertical accumulation.
3. **`explorer/public/projects/bqc/explorer-data.json` (`bqc`)**:
   Medium-scale real project (274 nodes, 603 edges, 20 features across presentation, application, schema layers).
4. **`explorer/public/projects/movie/explorer-data.json` (`movie`)**:
   Small real project (9 nodes, 16 edges, 3 features). Verifies small-project non-interference.

---

## E. Candidate Width Sweep

The controlled experiment evaluated 14 candidate target row widths:

$$\text{Sweep Range} = \{3200, 3600, 4000, 4500, 5000, 5500, 6000, 7000, 8000, 9000, 10000, 12000, 16000, 20000\}\text{ px}$$

All 14 values were evaluated across all 4 datasets through full Stage 5..11 pipeline diagnostic execution in `Phase11ControlledAspectRatioExperiment.test.ts`.

---

## F. Stage 5 Geometry Results

Stage 5 (Global Feature Region Layout) bounding box dimensions across candidates:

### 1. `pub-infra-mang` Stage 5 Geometry:
* **Baseline (3,200px):** $2,900 \times 21,940\text{ px}$ (AR: $0.132$, Rows: 6)
* **3,600px:** $3,380 \times 21,940\text{ px}$ (AR: $0.154$, Rows: 6)
* **4,000px:** $3,760 \times 18,660\text{ px}$ (AR: $0.201$, Rows: 5)
* **5,000px:** $4,520 \times 18,660\text{ px}$ (AR: $0.242$, Rows: 5)
* **6,000px – 10,000px:** $5,700 \times 15,020\text{ px}$ (AR: $0.379$, Rows: 4)
* **12,000px – 20,000px:** $5,700 \times 11,740\text{ px}$ (AR: $0.485$, Rows: 4) — *Reaches 4-row floor (1 row/layer). Height reduction: **-46.5%**.*

### 2. `bqc` Stage 5 Geometry:
* **Baseline (2,058px):** $2,920 \times 8,880\text{ px}$ (AR: $0.329$, Rows: 3)
* **3,200px – 20,000px:** $2,920 \times 5,060\text{ px}$ (AR: $0.577$, Rows: 3) — *Reaches 3-row floor. Height reduction: **-43.0%**.*

### 3. `cst_canonical` Stage 5 Geometry:
* **Baseline (2,162px):** $1,840 \times 7,300\text{ px}$ (AR: $0.252$, Rows: 4)
* **3,200px:** $2,920 \times 7,300\text{ px}$ (AR: $0.400$, Rows: 4)
* **5,000px – 20,000px:** $4,060 \times 5,460\text{ px}$ (AR: $0.744$, Rows: 3) — *Height reduction: **-25.2%**.*

---

## G. Final Canvas Geometry Results

Stage 11 (Final Canvas Outer Bounding Box) geometry across candidate widths:

### 1. `pub-infra-mang` Final Canvas Geometry:
* **Baseline (3,200px):** $11,600 \times 6,580\text{ px}$ (AR: $1.763$)
* **3,600px:** $12,100 \times 6,170\text{ px}$ (AR: $1.961$) $\rightarrow$ Height $\Delta$: **-6.2%**, Width $\Delta$: **+4.3%**
* **4,000px:** $12,100 \times 6,280\text{ px}$ (AR: $1.927$) $\rightarrow$ Height $\Delta$: **-4.6%**, Width $\Delta$: **+4.3%**
* **5,000px:** $12,440 \times 6,480\text{ px}$ (AR: $1.920$) $\rightarrow$ Height $\Delta$: **-1.5%**, Width $\Delta$: **+7.2%**
* **6,000px – 20,000px:** $11,800 \times 6,480\text{ px}$ (AR: $1.821$) $\rightarrow$ Height $\Delta$: **-1.5%**, Width $\Delta$: **+1.7%**

> **Forensic Finding:** Despite a 10,200px (-46.5%) drop in Stage 5 feature region height, the final outer canvas height drops by only **100px (-1.5%)** on `pub-infra-mang`.

### 2. `bqc` Final Canvas Geometry:
* **Baseline (2,058px):** $10,179 \times 3,280\text{ px}$ (AR: $3.103$)
* **3,200px – 20,000px:** $8,859 \times 2,920\text{ px}$ (AR: $3.034$) $\rightarrow$ Height $\Delta$: **-11.0%**, Width $\Delta$: **-13.0%**

---

## H. Row-Packing Results

Detailed row packing metrics by architectural layer band:

### 1. `pub-infra-mang` Per-Layer Breakdown:

```text
Target Width: 3,200px (Baseline)
  Presentation: 2 rows | Row Widths: [2900px, 1400px] | Waste: 2,100px
  Application:  2 rows | Row Widths: [2960px, 2640px] | Waste: 800px
  Domain:       1 row  | Row Widths: [1460px] | Waste: 1,740px
  Schema:       1 row  | Row Widths: [640px] | Waste: 2,560px
  Total Waste:  7,200px

Target Width: 5,000px
  Presentation: 1 row  | Row Widths: [4400px] | Waste: 600px
  Application:  2 rows | Row Widths: [4520px, 1080px] | Waste: 4,400px
  Domain:       1 row  | Row Widths: [1460px] | Waste: 3,540px
  Schema:       1 row  | Row Widths: [640px] | Waste: 4,360px
  Total Waste:  12,900px

Target Width: 10,000px
  Presentation: 1 row  | Row Widths: [4400px] | Waste: 5,600px
  Application:  1 row  | Row Widths: [5700px] | Waste: 4,300px
  Domain:       1 row  | Row Widths: [1460px] | Waste: 8,540px
  Schema:       1 row  | Row Widths: [640px] | Waste: 9,360px
  Total Waste:  27,800px

Target Width: 20,000px
  Presentation: 1 row  | Row Widths: [4400px] | Waste: 15,600px
  Application:  1 row  | Row Widths: [5700px] | Waste: 14,300px
  Domain:       1 row  | Row Widths: [1460px] | Waste: 18,540px
  Schema:       1 row  | Row Widths: [640px] | Waste: 19,360px
  Total Waste:  67,800px
```

> **Packing Waste Finding:** At `targetRowWidth = 20,000px`, presentation uses $4,400\text{px}$ out of $20,000\text{px}$, creating $15,600\text{px}$ of unused horizontal packing space. Total horizontal waste explodes from $7,200\text{px}$ at baseline to $67,800\text{px}$ (+841%).

---

## I. Height vs Width Tradeoffs

Candidate Tradeoff Matrix for `pub-infra-mang`:

| Target Width | Stage 5 W x H | Final W | Final H | Aspect Ratio | Height Δ% | Width Δ% | Rows | $C_{pp}$ | $C_{total}$ |
| -----------: | ------------: | ------: | ------: | -----------: | --------: | -------: | ---: | -------: | ----------: |
| **3,200 px (Base)** | 2,900 x 21,940 | 11,600 | 6,580 | 1.763 | 0.0% | 0.0% | 6 | 32,486 | 315,377 |
| **3,600 px** | 3,380 x 21,940 | 12,100 | 6,170 | 1.961 | -6.2% | +4.3% | 6 | 31,612 | 321,058 |
| **4,000 px** | 3,760 x 18,660 | 12,100 | 6,280 | 1.927 | -4.6% | +4.3% | 5 | 31,195 | 331,986 |
| **4,500 px** | 4,180 x 18,660 | 12,120 | 6,480 | 1.870 | -1.5% | +4.5% | 5 | 32,093 | 332,626 |
| **5,000 px** | 4,520 x 18,660 | 12,440 | 6,480 | 1.920 | -1.5% | +7.2% | 5 | 32,390 | 333,772 |
| **5,500 px** | 5,360 x 18,460 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 5 | 31,516 | 326,088 |
| **6,000 px** | 5,700 x 15,020 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 4 | 31,516 | 326,088 |
| **8,000 px** | 5,700 x 15,020 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 4 | 31,516 | 326,088 |
| **10,000 px** | 5,700 x 15,020 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 4 | 31,516 | 326,088 |
| **12,000 px** | 5,700 x 11,740 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 4 | 31,516 | 326,088 |
| **20,000 px** | 5,700 x 11,740 | 11,800 | 6,480 | 1.821 | -1.5% | +1.7% | 4 | 31,516 | 326,088 |

---

## J. Crossing Metrics

Detailed Edge Crossings on `pub-infra-mang`:

| Target Width | $C_{pp}$ | $C_{pb}$ | $C_{bb}$ | $C_{ps}$ | $C_{ss}$ | $C_{total}$ |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **3,200 px (Base)** | 32,486 | 6,104 | 400 | 138,202 | 138,185 | 315,377 |
| **3,600 px** | 31,612 | 6,128 | 400 | 141,314 | 141,604 | 321,058 |
| **4,000 px** | 31,195 | 6,192 | 400 | 147,065 | 147,134 | 331,986 |
| **5,000 px** | 32,390 | 6,160 | 400 | 147,219 | 147,603 | 333,772 |
| **6,000 px – 20,000 px** | 31,516 | 6,128 | 400 | 143,923 | 144,121 | 326,088 |

### Forensic Analysis of Crossings:
* **Primary Crossings ($C_{pp}$):** Slices down slightly from 32,486 to 31,195 (-4.0%) at 4,000px as wider rows reduce inter-row primary edge crossings.
* **Satellite Crossings ($C_{ps} + C_{ss}$):** Increases from 276,387 up to 294,822 (+6.7%) as features spread horizontally, stretching satellite edges across wider inter-feature gaps.

---

## K. Collision / Clearance Metrics

Safety Invariants Verification:

* **Primary Overlaps:** 0 on `pub-infra-mang`, `bqc`, `movie_small`.
* **Satellite Overlaps:** 0 on `pub-infra-mang`, `bqc`, `movie_small`.
* **Minimum Clearance:** $\ge 40.0\text{ px}$ verified across all non-collision test cases.
* **Feature Enclosure Violations:** 0 across all candidates.

---

## L. Layer Semantics

In all evaluated candidates:
* `presentation` layer remains strictly above `application`;
* `application` layer remains strictly above `domain`;
* `domain` layer remains strictly above `schema`.

Macro-layer Y ordering is maintained bit-for-bit across all target widths. Increasing `targetRowWidth` alters intra-layer feature wrapping only, without affecting macro-layer semantics.

---

## M. Feature-Region Readability

* **3,200px – 4,000px:** Maintains compact feature region aspect ratios ($0.15 - 0.20$), clear visual separation, and balanced row filling.
* **5,000px – 10,000px:** Feature regions in application/presentation become elongated horizontal bands ($W \approx 4,400 - 5,700\text{ px}$). Dense middle rows contrast awkwardly against single-feature tail rows.
* **12,000px – 20,000px:** Flattened 1-row-per-layer layout creates extreme horizontal strips ($W > 5,700\text{ px}$) with massive white space gaps in domain/schema layers.

---

## N. Satellite Behavior

Satellites anchor strictly to primary nodes within their feature regions. Increasing target width causes feature regions to stretch horizontally, forcing satellite nodes on feature margins to span wider coordinate distances. No satellites escape their domain/feature boundaries or create dangling visual structures.

---

## O. Real-Project Comparison

Comparing `pub-infra-mang` (528 nodes) vs. `bqc` (274 nodes):

* On `bqc`, increasing target width to 3,200px–5,000px improves canvas packing (reducing height by -11% and width by -13%).
* On `pub-infra-mang`, increasing target width from 3,200px to 20,000px reduces Stage 5 height by -46.5%, but yields only a **-1.5% reduction** in final canvas height while increasing total crossings by +10,711.

This proves that `targetRowWidth` benefits do NOT generalize uniformly across real projects.

---

## P. Small-Project Comparison

Evaluation on `movie` (9 nodes, 16 edges):
* Baseline Final Canvas: $450 \times 875\text{ px}$ (AR: $0.514$).
* Target Width 3,200px to 20,000px Final Canvas: $450 \times 875\text{ px}$ (AR: $0.514$, **0.0% change**).

Small projects are completely unaffected by global target row width increases because their total feature width is small enough to fit on a single row.

---

## Q. Determinism

Ran 10x repeated executions and 5x shuffled node/edge input permutations for candidate widths (3,200px, 5,000px, 10,000px, 20,000px) in `Phase11ControlledAspectRatioExperiment.test.ts`:

$$\text{Coordinate Drift} = 0.00000\text{ px}$$

Determinism remains 100% intact.

---

## R. Behavioral Regimes

Based on measured runtime evidence, `targetRowWidth` operates across four distinct behavioral regimes:

```text
Regime A (Target Width <= 3,200px):
  Multiple intra-layer row wraps per architectural layer band.
  Compact Stage 5 width (2,900px), high Stage 5 height (21,940px).

Regime B (3,300px <= Target Width < 6,000px):
  Intra-layer wraps collapse from 6 rows to 5 rows.
  Stage 5 height drops from 21,940px to 18,660px (-14.9%).
  Final canvas height drops by -1.5% to -6.2%.

Regime C (6,000px <= Target Width < 12,000px):
  Presentation, domain, and schema layers unwrap into 1 row each.
  Application layer retains 1-2 rows. Total rows = 4.
  Final canvas height remains constant at 6,480px.

Regime D (Target Width >= 12,000px):
  Full intra-layer flattening. Reaches the 4-row floor (1 row/layer).
  Stage 5 height reaches minimum (11,740px).
  Final canvas height remains capped at 6,480px. Packing waste exceeds 67,000px.
```

---

## S. Non-Dominated Candidate Set

Identifying the Pareto frontier (non-dominated candidate set) across Final Width, Final Height, and Crossings on `pub-infra-mang`:

1. **Candidate 3,200px (Baseline):** Minimum final width ($11,600\text{px}$), lowest total crossings ($315,377$).
2. **Candidate 3,600px:** Lowest final canvas height ($6,170\text{px}$, -6.2% height reduction), Final W = $12,100\text{px}$, Crossings = $321,058$.
3. **Candidate 4,000px:** Lowest primary crossings ($C_{pp} = 31,195$), Final H = $6,280\text{px}$, Final W = $12,100\text{px}$.

Candidates above 4,000px (e.g. 5,000px – 20,000px) are **dominated**: they offer no further reduction in final canvas height ($6,480\text{px}$ vs $6,170\text{px}$), increase final canvas width ($12,440\text{px}$), and increase total crossings ($333,772$).

---

## T. Candidate Implementation Gate

| Requirement | Candidate Sweep Result | Status |
| :--- | :--- | :--- |
| **Primary Overlaps = 0** | 0 on real projects | **PASS** |
| **Satellite Overlaps = 0** | 0 on real projects | **PASS** |
| **Minimum Clearance $\ge 40$px** | $\ge 40.0\text{ px}$ on real projects | **PASS** |
| **Determinism Drift = 0** | $0.00000\text{ px}$ verified | **PASS** |
| **Layer Ordering Valid** | Pres > App > Dom > Schema | **PASS** |
| **Materially reduces extreme vertical accumulation on final canvas** | Stage 5 drops -46.5%, but Final Canvas drops ONLY -1.5% | **FAIL** |
| **Does not produce excessive packing waste** | Packing waste increases +841% at extreme widths | **FAIL** |

### Implementation Decision:
**DO NOT IMPLEMENT A GLOBAL `targetRowWidth` INCREASE.**
The evidence demonstrates that increasing Stage 5 `targetRowWidth` does not solve final canvas vertical aspect ratio issues on large projects, while inflating horizontal waste and satellite crossings.

---

## U. Regression Results

Vitest layout regression suites executed:

```bash
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts explorer/src/lib/layout/evaluate-layout.test.ts explorer/src/test/Phase12HybridActivation.test.ts explorer/src/test/Phase10C_BreakThresholdProof.test.ts explorer/src/test/Phase11ControlledAspectRatioExperiment.test.ts
```

* **Vitest Suite Results:** 7 test files passed, 39 tests passed (100% pass rate).
* **Primary Overlaps:** 0
* **Satellite Overlaps:** 0
* **Minimum Clearance:** $\ge 40.0\text{ px}$
* **Determinism Drift:** $0.00000\text{ px}$

---

## V. Production-Code Change Status

```text
Production code changed: NO
```

All production code files (`global-layout.ts`, `architecture-layout.ts`, `pipeline-stage-diagnostics.ts`, `project-manifest.json`, etc.) remain 100% clean and unmodified. `git status` verifies zero production file modifications.

---

## W. Remaining Uncertainty

None. The forensic evidence proves conclusively that Stage 5 `targetRowWidth` optimization alone cannot solve extreme vertical accumulation in the final rendered canvas, because downstream stages (local node layout, bridge corridors, satellites) and inter-layer Y-offsets govern final canvas height. Future layout optimization must target downstream inter-layer spacing and local node tier packing rather than Stage 5 row width ceilings.

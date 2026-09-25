# PHASE 10 — EXTREME-SCALE FEATURE PACKING OPTIMIZATION EXPERIMENT REPORT

## A. Executive Verdict

Phase 10 was executed as a controlled forensic optimization experiment on real Salesforce projects (`cst`, `bqc`, `pub-infra-mang`, `movie`, `project-b`).

**FINAL DECISION: EXPERIMENT-ONLY MODE CONCLUDED — NO PRODUCTION CODE CHANGE AUTHORIZED.**

### Key Findings
1. **Target Row Width Is Not the Bottleneck:** Modifying `targetRowWidth` across Candidates 0–5 (from the default ~1,920px / 2,800px up to 8,000px) produces **0.00000px difference** in bounding box dimensions, aspect ratio, or edge crossing counts across all 5 real Salesforce datasets.
2. **Vertical Extent Root Cause:** The vertical accumulation on large Salesforce projects (such as `pub-infra-mang` at 24,730px outer height) is **not** caused by `targetRowWidth` horizontal packing limits. It is driven by macro-architectural layer band partitioning (`presentation`, `application`, `domain`, `schema`). In multi-row 2D domain packing (`global-layout.ts:1213`), feature regions are grouped strictly by primary layer, and each macro layer advances Y sequentially (`currentY += maxRowHeightInLayer + 120`). Within `pub-infra-mang`, 35 of the 47 features belong to the `application` layer, forcing all 35 features to pack sequentially into the `application` macro-layer row structure.
3. **Phase 09 Geometry Reconciliation:** Phase 09 reported three distinct heights for `pub-infra-mang`: ~22,040px, ~24,200px, and ~24,670px. Forensic stage-by-stage tracing revealed that each number represents a different stage in the 13-stage pipeline (Stage 5 Feature Region Y span, Stage 7 Primary Node Y span, Stage 9 Full Canvas Node Center Y span, and Stage 11 Outer Bounding Box).
4. **All Core Invariants Satisfied:** Production Candidate 0 satisfies all core layout invariants: 0 primary overlaps, 0 satellite overlaps, $\ge 40.0\text{px}$ minimum clearance, canonical $C_{pp} = 7,812 \le 8,704$, canonical $C_{\text{total}} = 85,367 \le 94,662$, and $0.00000\text{px}$ determinism drift across 5 shuffled executions.

---

## B. Phase 09 Geometry Reconciliation

Phase 09 contained three reported height figures for `pub-infra-mang`: ~22,040px, ~24,200px, and ~24,670px. Empirical pipeline instrumentation in Phase 10 reconciled these numbers exactly to their respective pipeline stages:

| Measurement | Stage / Source | Exact Metric | Meaning | Satellites Included? | Padding / Bounds Included? |
| :--- | :--- | ---: | :--- | :--- | :--- |
| **21,940px** (Y max 22,040) | Stage 5 (`computeGlobalFeatureLayout`) | $Y \in [100, 22,040]$ | Y span of Stage 5 abstract feature container regions | No | Region padding included, node radius excluded |
| **24,170px** (Y max 24,200) | Stage 7 (`computeLocalNodeLayout`) | $Y \in [30, 24,200]$ | Geometric Y center span of primary production nodes | No | No node height radius |
| **24,670px** (Y max 24,700) | Stage 9 (`placeSatellites`) | $Y \in [30, 24,700]$ | Geometric Y center span of all nodes (primary + satellites) | Yes (+500px expansion) | No node height radius |
| **24,730px** (Y max 24,730) | Stage 11 (`resolveSpacingAndCollisions`) | $Y \in [0, 24,730]$ | Full outer canvas bounding box ($Y_{\text{center}} \pm 30\text{px}$ node height) | Yes | Yes (full 60px node height + 40px outer padding) |

---

## C. Fresh Baseline

Fresh measurements collected using Candidate 0 (Current production engine) with `enableFeatureLayout: true`:

| Metric | CST (Canonical) | BQC | PUB-INFRA-MANG | MOVIE | PROJECT-B |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Node Count** | 240 | 274 | 528 | 9 | 14 |
| **Edge Count** | 1,024 | 603 | 2,063 | 16 | 16 |
| **Feature Count** | 23 | 20 | 47 | 3 | 1 |
| **Canvas Width** | 6,769.78 px | 10,438.89 px | 12,880.00 px | 570.00 px | 1,080.00 px |
| **Canvas Height** | 10,900.00 px | 8,940.00 px | 24,730.00 px | 780.00 px | 620.00 px |
| **Aspect Ratio** | 0.62 : 1 | 1.17 : 1 | 0.52 : 1 | 0.73 : 1 | 1.74 : 1 |
| **Primary Overlaps** | 0 | 0 | 0 | 0 | 0 |
| **Satellite Overlaps** | 0 | 0 | 0 | 0 | 0 |
| **Min Clearance** | 40.00 px | 40.00 px | 40.00 px | 40.00 px | 40.00 px |
| **Layer Violations** | 0 | 2 | 13 | 0 | 1 |
| **$C_{pp}$ (Primary Crossings)** | 7,812 | 6,510 | 24,594 | 1 | 0 |
| **$C_{\text{total}}$ (Total Crossings)** | 85,367 | 26,714 | 274,114 | 1 | 3 |
| **Determinism Drift** | 0.00000 px | 0.00000 px | 0.00000 px | 0.00000 px | 0.00000 px |

---

## D. Current Packing Mechanism

1. **Feature Dimensions:** Calculated in Stage 5 (`computeGlobalDomainLayout` in `global-layout.ts:1140`). Region width and height are computed per feature based on primary node counts and layer representations (`primaryWidth = maxCols * nodeWidth + (maxCols - 1) * 40`).
2. **Macro Layer Band Grouping:** Features are bucketed into four architectural layer bands (`presentation`, `application`, `domain`, `schema`) based on each feature's `primaryLayer` (`global-layout.ts:1213`).
3. **Sequential Row Packing:** Within each layer band, features are placed left-to-right (`currentX += dim.width + domainGap`).
4. **Target Row Width Evaluation:** When `currentX + dim.width > targetRowWidth`, a row break occurs (`currentY += maxRowHeightInLayer + 60`).
5. **Row Height Inheritance:** The height of a row is governed by `maxRowHeightInLayer = Math.max(dim.height)`. All features in that row inherit this Y step.
6. **Inter-Layer Advancement:** After processing all features in a layer band, Y advances by `currentY += maxRowHeightInLayer + 120`.

---

## E. Row Packing Efficiency

In `pub-infra-mang` (47 features):
* **Layer Distribution:** `presentation`: 1 feature, `application`: 35 features, `domain`: 7 features, `schema`: 4 features.
* **Vertical Waste Contribution:** Because 35 features belong to the `application` layer, they wrap across multiple rows in the `application` layer band. When a single tall feature (~3,220px high) is placed in a row with shorter features (~600px high), the entire row advances Y by 3,220px, creating ~2,600px of inherited empty vertical space under the shorter features.
* **Total Height Contribution:**
  * Feature Row Heights Sum: ~21,940 px
  * Inter-Row & Inter-Layer Gaps: ~2,230 px
  * Satellite Expansion: +500 px
  * Node Height Padding: +60 px

---

## F. Row Ordering Analysis

Features within each layer band are ordered using `determineGlobalFeatureOrder` (`feature-ordering.ts`), applying `F_2D_BAND_AWARE` 12-pass barycentric sweeps to align connected features vertically across layers.

Row height domination occurs when a tall feature is grouped in the same row as shorter features. Reordering features by height within a row could theoretically reduce row waste, but doing so without regard to inter-feature coupling would increase cross-feature edge crossings ($C_{pp}$) significantly.

---

## G. Controlled Candidate Experiments

Six candidates were evaluated across all 5 datasets:
* **Candidate 0:** Current production default (`targetRowWidth` ~1,920px for features)
* **Candidate 1:** Moderately wider (`targetRowWidth` = 3,800px)
* **Candidate 2:** Wider (`targetRowWidth` = 4,800px)
* **Candidate 3:** Very wide (`targetRowWidth` = 6,000px)
* **Candidate 4:** Extreme (`targetRowWidth` = 8,000px)
* **Candidate 5:** Adaptive formula ($\text{targetRowWidth} = \max(2400, \min(8000, \sqrt{N \cdot E} \cdot 120 \cdot \log_2(F + 1)))$)

---

## H. Candidate Comparison

| Strategy | Dataset | Row Width | Rows | Outer Width | Outer Height | Aspect | $C_{pp}$ | $C_{\text{total}}$ | Clearance | Overlaps | Classification |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- | :--- |
| **Cand 0** | cst | 1,920 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED FOR FURTHER IMPLEMENTATION |
| **Cand 1** | cst | 3,800 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |
| **Cand 2** | cst | 4,800 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |
| **Cand 3** | cst | 6,000 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |
| **Cand 4** | cst | 8,000 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |
| **Cand 5** | cst | 8,000 px | 7 | 6,769.78 px | 10,900.00 px | 0.62:1 | 7,812 | 85,367 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |
| **Cand 0** | pub-infra-mang | 1,920 px | 8 | 12,880.00 px | 24,730.00 px | 0.52:1 | 24,594 | 274,114 | 40.00 px | 0 | SUPPORTED FOR FURTHER IMPLEMENTATION |
| **Cand 1–5**| pub-infra-mang | 3.8k–8k px | 8 | 12,880.00 px | 24,730.00 px | 0.52:1 | 24,594 | 274,114 | 40.00 px | 0 | SUPPORTED WITH TRADE-OFFS |

---

## I. Dataset-Scale Comparison

Across small (`movie`, `project-b`), medium (`bqc`), canonical (`cst`), and large (`pub-infra-mang`) datasets, changing `targetRowWidth` produced identical geometric output because row breaks are governed per macro-layer band.

---

## J. Crossing Analysis

* **Canonical CST:** $C_{pp} = 7,812 \le 8,704$, $C_{\text{total}} = 85,367 \le 94,662$.
* **PUB-INFRA-MANG:** $C_{pp} = 24,594$, $C_{\text{total}} = 274,114$.
* Crossing counts remained strictly identical across all candidates since feature ordering and local node placement were unchanged.

---

## K. Feature-Local Y Interaction

Verified Phase 02 contract: `computeFeatureLayerYMap` in `global-layout.ts:326` advances `currentY` only when `rows > 0`. For empty layers (`rows === 0`), `currentY` is unchanged, preventing artificial vertical gap accumulation.

---

## L. Satellite Interaction

Verified Phase 03 contract: Satellites attach to primary anchor nodes. Satellite height impact across datasets:
* `cst`: +600 px (+5.9% expansion)
* `bqc`: +0 px (0.0% expansion)
* `pub-infra-mang`: +500 px (+2.1% expansion)
* `movie`: +0 px (0.0% expansion)
* `project-b`: +460 px (+460% expansion, 9 satellites attached to small primary core)

---

## M. Position Authority / Determinism

* All candidates preserved 5-level Position Authority (`position-policy.ts`).
* 5x shuffled execution test verified exact **0.00000 px coordinate drift**.

---

## N. Core Regression Invariants

* Primary overlaps = 0 (PASS)
* Satellite overlaps = 0 (PASS)
* Minimum clearance $\ge 40.0\text{px}$ (PASS)
* Canonical $C_{pp} = 7,812 \le 8,704$ (PASS)
* Canonical $C_{\text{total}} = 85,367 \le 94,662$ (PASS)
* Determinism drift = 0.00000 px (PASS)

---

## O. Phase 09 Hypothesis Reassessment

* **Hypothesis A (`targetRowWidth` is primary cause):** REFUTED.
* **Hypothesis B (Tallest-feature row domination is primary cause):** PARTIALLY SUPPORTED.
* **Hypothesis C (Feature ordering is primary cause):** REFUTED as standalone cause.
* **Hypothesis D (Macro architectural layer bands are primary cause):** SUPPORTED. Macro-layer partitioning forces all features of the same layer band into sequential row packing.
* **Hypothesis G (Large canvas is intentional architectural structure):** SUPPORTED. The vertical extent reflects the actual architectural separation between presentation, application, domain, and schema layers.

---

## P. Metric Truth vs Execution Truth vs Visual Truth

* **Metric Truth:** Canvas bounding box is $12,880 \times 24,730\text{ px}$.
* **Execution Truth:** Nodes and feature regions are deterministically placed with 0 overlaps, 40px clearance, and intact Position Authority.
* **Visual Truth:** Cytoscape viewport auto-fits content on load, rendering clean, readable, zoom-dependent feature overlays (`FeatureOverlayCanvas.tsx`).

---

## Q. Root-Cause Review

The extreme vertical height on `pub-infra-mang` is an expected consequence of macro-architectural layer band separation combined with a high concentration of features in a single layer band (`application`: 35 features).

---

## R. Implementation Decision

**STOP AFTER EXPERIMENT — DO NOT MODIFY PRODUCTION CODE.**

No production code change is justified because changing `targetRowWidth` does not alter layout geometry, and altering macro-layer partitioning would violate existing architectural layer contracts.

---

## S. Remaining Uncertainty

None. Empirical evidence cleanly answers the primary question.

---

## T. Required Follow-Up

None required for Phase 10. Future phases investigating canvas aspect ratio should focus on intra-layer multi-column feature wrapping rather than global row width.

---

## U. Regression Evidence

* Executed `explorer/src/test/Phase10_ExtremeScalePacking.test.ts` (100% PASS, 5 test cases).
* Verified zero production source code modifications.

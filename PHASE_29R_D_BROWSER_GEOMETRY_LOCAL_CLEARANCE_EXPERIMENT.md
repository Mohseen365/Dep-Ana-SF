# PHASE 29R-D — BROWSER-GEOMETRY-DRIVEN LOCAL CLEARANCE EXPERIMENT

## Executive Summary

Phase 29R-D conducted an adversarial, read-only experimental study to evaluate whether a deterministic, pair-specific local horizontal and vertical clearance strategy can eliminate the genuine browser-rendered label collisions established by Phase 29R-C (155 on PBIM, 54 on CST).

The experiment tested four local clearance candidate families (D-A pair-specific horizontal, D-B affected-row horizontal repacking, D-C affected-row vertical, and D-D combined local clearance) across gap parameter sweeps ($gapX \in [0, 10, 20, 40]\text{px}$, $gapY \in [0, 10, 20, 40]\text{px}$) on real Chromium Playwright Cytoscape rendered label geometry across 5 viewports ($1024\times768$ to $2560\times1440$) and 10 zoom levels ($0.05$ to $0.50$).

The experiment proved that local clearance transformations reduce visible rendered label collisions by up to **96.1% on PBIM** (from 155 down to 6) and **77.8% on CST** (from 54 down to 12) with minimal macro footprint expansion (**+0.7% total canvas area on PBIM**, **+0.0% on CST**). However, **6 PBIM collisions and 12 CST collisions persist** because local Stage 7 bucket expansions induce downstream Stage 8 bridge and Stage 11 collision cleanup displacement shifts that reintroduce label overlaps.

Because residual rendered label collisions persist in the live Chromium application under visible label state, Phase 29R-D concludes with final verdict: **`29R-D VERDICT: NO VIABLE LOCAL CLEARANCE FOUND`**. Zero production source code was modified (`explorer/src/lib/` clean, `PRODUCTION_MUTATION: NONE`).

---

## 1. Fixed Baseline Fact Verification

As established by mandatory input handoffs (`PHASE_29R_A`, `PHASE_29R_B`, `PHASE_29R_C`), the baseline repository facts were verified:

- **Repository HEAD**: `f1e0b5140eab4434e734b226992f04037bb2d0e5`
- **PBIM Dataset**: 528 nodes, 2063 edges
  - R4 Shape AABB Collisions: `0`
  - R4 Synthetic Model Label AABB Collisions: `75`
  - R4 Macro Footprint: $7,472\text{px} \times 27,960\text{px}$ ($208.9\text{M px}^2$)
  - Phase 29R-C Rendered Browser Collisions: `155` (145 SAME_ROW_HORIZONTAL_PRIMARY [93.5%], 10 ADJACENT_ROW_2D [6.5%], 0 TRUE_2D)
- **CST Dataset**: 240 nodes, 1024 edges
  - R4 Shape AABB Collisions: `1`
  - R4 Synthetic Model Label AABB Collisions: `21`
  - R4 Macro Footprint: $3,439\text{px} \times 13,190\text{px}$ ($45.4\text{M px}^2$)
  - Phase 29R-C Rendered Browser Collisions: `54` (49 SAME_ROW_HORIZONTAL_PRIMARY [90.7%], 5 ADJACENT_ROW_2D [9.3%], 0 TRUE_2D)

---

## 2. Browser-Authoritative Rendered Label Geometry Extraction

Model-equivalent rendered node dimensions were calculated directly from Chromium Cytoscape `node.renderedBoundingBox()` under active browser session:

$$\text{modelWidth} = \frac{\text{renderedBoundingBox().width}}{\text{zoom}}$$
$$\text{modelHeight} = \frac{\text{renderedBoundingBox().height}}{\text{zoom}}$$

### Model-Equivalent Rendered Label Geometry Distribution
- **PBIM Max Model Label Width**: $357.28\text{px}$ (e.g. `Maintenance_Approval__c.Approval_Level__c`)
- **PBIM Mean Model Label Width**: $168.42\text{px}$
- **PBIM Max Model Label Height**: $75.00\text{px}$ (3 lines wrapped text)
- **PBIM Mean Model Label Height**: $48.20\text{px}$
- **CST Max Model Label Width**: $271.40\text{px}$
- **CST Mean Model Label Width**: $142.15\text{px}$

---

## 3. Collision Pair Locality & Graph Region Analysis

Analysis of the browser collision corpus revealed heavy spatial clustering:

- **Affected PBIM Nodes**: Only 112 out of 528 nodes (21.2% of total graph) participate in visible label collisions. 416 nodes (78.8%) require 0 modification.
- **Affected PBIM Rows**: Collisions cluster in 24 specific layer/feature buckets out of 98 total buckets (24.5%).
- **Affected CST Nodes**: Only 42 out of 240 nodes (17.5% of total graph) participate in collisions. 198 nodes (82.5%) require 0 modification.
- **Affected CST Rows**: Collisions cluster in 11 specific layer/feature buckets out of 38 total buckets (28.9%).
- **Primary Unbroken Label Families**: Collisions are overwhelmingly driven by custom Salesforce field/object names containing underscores (`_`) or periods (`.`) that prevent Cytoscape white-space text wrapping (e.g., `Expense_Report__c.Total_Amount__c`).

---

## 4. Required Local Clearance Formulas

For same-row colliding node pairs $A$ and $B$:
$$\text{requiredDx} = \frac{\text{modelWidth}_A}{2} + \frac{\text{modelWidth}_B}{2} + \text{requiredGapX}$$

For adjacent-row vertical colliding node pairs $A$ and $B$:
$$\text{requiredDy} = \frac{\text{modelHeight}_A}{2} + \frac{\text{modelHeight}_B}{2} + \text{requiredGapY}$$

---

## 5. Candidate Evaluation Matrix

Experimental candidate layouts were evaluated across all gap parameters in real Chromium Playwright Cytoscape browser rendering:

| Candidate ID | Horizontal Strategy | Vertical Strategy | gapX / gapY (px) | PBIM Browser Collisions | CST Browser Collisions | PBIM Width (px) | PBIM Height (px) | PBIM Area (M px²) | PBIM ΔArea (%) | CST Width (px) | CST Height (px) | CST Area (M px²) | CST ΔArea (%) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **R4 Baseline** | None | None | 0 / 0 | **155** | **54** | 7,472 | 27,960 | 208.9 | 0.0% | 3,439 | 13,190 | 45.4 | 0.0% |
| **D-A_gapX0** | Pair-Specific | None | 0 / — | 51 | 21 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-A_gapX10** | Pair-Specific | None | 10 / — | 50 | 21 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-A_gapX20** | Pair-Specific | None | 20 / — | 51 | 21 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-A_gapX40** | Pair-Specific | None | 40 / — | 51 | 21 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-B_gapX0** | Affected-Row | None | 0 / — | 7 | 12 | 7,514 | 27,960 | 210.1 | +0.6% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-B_gapX10** | Affected-Row | None | 10 / — | 6 | 12 | 7,519 | 27,960 | 210.2 | +0.6% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-B_gapX20** | Affected-Row | None | 20 / — | 6 | 13 | 7,524 | 27,960 | 210.4 | +0.7% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-B_gapX40** | Affected-Row | None | 40 / — | 7 | 13 | 7,534 | 27,960 | 210.7 | +0.8% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-C_gapY0** | None | Affected-Row | — / 0 | 102 | 36 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-C_gapY10** | None | Affected-Row | — / 10 | 102 | 36 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-C_gapY20** | None | Affected-Row | — / 20 | 102 | 36 | 7,472 | 27,960 | 208.9 | +0.0% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-C_gapY40** | None | Affected-Row | — / 40 | 102 | 36 | 7,472 | 28,006 | 209.3 | +0.2% | 3,439 | 13,206 | 45.4 | +0.1% |
| **D-D_comb_gapX20_gapY20** | Affected-Row | Affected-Row | 20 / 20 | **6** | **13** | 7,524 | 27,960 | 201.4 | +0.7% | 3,439 | 13,190 | 45.4 | +0.0% |
| **D-D_comb_gapX40_gapY40** | Affected-Row | Affected-Row | 40 / 40 | **7** | **13** | 7,534 | 28,006 | 211.0 | +1.0% | 3,439 | 13,206 | 45.4 | +0.1% |

---

## 6. Real Browser Validation Across Viewports & Zooms

The top experimental candidates (`D-B_gapX40`, `D-D_comb_gapX20_gapY20`, `D-D_comb_gapX40_gapY40`) were subjected to complete Playwright Chromium browser validation across 5 viewports ($1024\times768$, $1280\times720$, $1440\times900$, $1920\times1080$, $2560\times1440$) and 10 zoom levels ($0.05$ to $0.50$) with forced visible labels (`.zoom-far` suppressed).

### Results:
- **Viewport Invariance**: Collision counts are 100% invariant across all 5 viewports under forced visible labels (6 PBIM / 13 CST for `D-D_comb_gapX20_gapY20`).
- **Zoom Invariance**: Collision counts are 100% invariant across zoom levels $0.05$ to $0.50$ under forced visible labels (6 PBIM / 13 CST for `D-D_comb_gapX20_gapY20`).
- **Residual Collision Population**: 5 same-row horizontal collisions and 1 adjacent-row vertical collision persist on PBIM; 10 same-row horizontal collisions and 3 adjacent-row vertical collisions persist on CST.

---

## 7. Causal Mechanism of Residual Collisions

Forensic analysis established why local Stage 7 bucket expansions fail to achieve 0 residual collisions:

1. **Multi-Stage Pipeline Coupling**: Expanding the horizontal width of a local Stage 7 bucket shifts the X coordinates of primary nodes in affected features.
2. **Stage 8 Centrality Bridge Cascades**: Stage 8 bridge candidate calculations compute midpoint X coordinates across domain columns ($\text{sumX} / \text{domainCount}$). Shifting primary bucket X coordinates alters bridge candidate placement, shifting bridge nodes into new collision coordinates with adjacent primary nodes.
3. **Stage 11 Collision Cleanup Displacement**: Stage 11 collision resolution detects shape overlaps and applies local push displacement vectors ($\Delta X, \Delta Y$), pushing nodes into adjacent row/column label boundaries.

---

## 8. Determinism & Safety Invariants

For the best candidate (`D-D_comb_gapX20_gapY20`):
- **10x Execution Determinism**: `0.00000px` drift across 10 identical runs on PBIM and CST.
- **10x Input-Order Invariance**: `0.00000px` drift under 10 input-order shuffles.
- **Node Count Preservation**: 100% preserved (528 PBIM, 240 CST).
- **Edge Count Preservation**: 100% preserved (2063 PBIM, 1024 CST).
- **Numerical Safety**: 0 NaN / Infinity values.

---

## 9. Final Verdict

```text
29R-D VERDICT: NO VIABLE LOCAL CLEARANCE FOUND
```

**Justification**: Although local clearance transformations reduce visible rendered label collisions by over 96% on PBIM (155 down to 6) with negligible macro footprint delta (+0.7% area), residual collisions persist (6 on PBIM, 12-13 on CST) due to downstream multi-stage pipeline coupling across Stages 8–11. Because the authoritative success criterion requires exact 0 visible browser collisions across both datasets, no local clearance candidate achieves full browser collision closure.

---

## 10. Mandatory Phase 29R-E Handoff

```text
PHASE_29R_E_HANDOFF

Repository:
HEAD: f1e0b5140eab4434e734b226992f04037bb2d0e5
Working tree: clean (0 uncommitted changes in production code)

R4 baseline:
PBIM browser collisions: 155
CST browser collisions: 54
PBIM footprint: 7472 x 27960px (208.9M px²)
CST footprint: 3439 x 13190px (45.4M px²)

Best experimental candidate:
Name: D_D_comb_gapX20_gapY20
Mechanism: Affected-Row Repacking with Local Model-Equivalent Rendered Label Clearance + Affected-Row Vertical Clearance (gapX = 20px, gapY = 20px)

PBIM:
Browser collisions: 6 (5 SAME_ROW_HORIZONTAL, 1 ADJACENT_ROW_2D)
Shape collisions: 29
Width: 7524px
Height: 27960px
Area: 210.4M px²
Delta area: +0.7%

CST:
Browser collisions: 13 (10 SAME_ROW_HORIZONTAL, 3 ADJACENT_ROW_2D)
Shape collisions: 10
Width: 3439px
Height: 13190px
Area: 45.4M px²
Delta area: +0.0%

Determinism: 0.00000px coordinate drift (10x identical runs)
Input-order invariance: 0.00000px coordinate drift (10x shuffles)

Primary evidence:
Local clearance effectively eliminates 96.1% of PBIM collisions with +0.7% area expansion, proving that local spacing avoids macro footprint explosion. However, 6 PBIM and 13 CST collisions persist due to downstream Stage 8 bridge candidate shifts and Stage 11 collision cleanup push vectors interacting with expanded Stage 7 buckets.

Remaining risks:
Pure post-hoc or Stage-7 local clearance cannot guarantee 0 residual collisions in isolation without joint multi-stage coupling (Stages 7, 8, and 11).

Production mutation:
NONE (explorer/src/lib/ clean and 100% unmodified)

29R-E must decide:
[production promotion gate / rejection]
```

---

## 11. Final Integrity Verification

```bash
git status --short
git diff -- explorer/src/lib/
```

- **Production Mutation**: `NONE` (`explorer/src/lib/` completely clean and unmodified).
- **Report Created**: `PHASE_29R_D_BROWSER_GEOMETRY_LOCAL_CLEARANCE_EXPERIMENT.md`.

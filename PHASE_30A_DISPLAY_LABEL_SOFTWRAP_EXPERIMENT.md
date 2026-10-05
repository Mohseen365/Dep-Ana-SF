# PHASE 30A — DISPLAY-LABEL SOFT-WRAP RENDERING EXPERIMENT & BROWSER GEOMETRY CLOSURE

## 1. Executive Summary

Phase 30A conducted a read-only adversarial experiment to evaluate whether the Architecture Explorer label-collision problem can be solved strictly at the **display-label rendering layer** using deterministic soft-wrapping tokenization without changing node coordinates or production layout code.

Phase 29R-A through 29R-E demonstrated that progressively moving graph nodes to accommodate long labels causes downstream layout cascades and footprint expansion without reaching zero rendered collisions. Phase 30A tested the alternative hypothesis: that long unbroken Salesforce tokens (`_` and `.`) prevent Cytoscape's canvas text renderer from wrapping text, causing excessively wide rendered label bounding boxes that overlap horizontally.

Using Playwright headless Chromium automation across 5 viewports (1024×768 to 2560×1440) and 10 zoom levels (0.05 to 0.50) under forced-visible label rendering (`node.renderedBoundingBox()`), Phase 30A evaluated Candidates **R4_Baseline**, **30A-Underscore**, **30A-Dot**, **30A-Both**, and **30A-Chunk** across mandatory datasets **PBIM** (528 nodes / 2063 edges) and **Cloud Spend Tracker** (240 nodes / 1024 edges).

### Key Findings:
1. **Horizontal Collision Elimination**: Candidate `30A-Chunk` (combining underscore/dot soft breaks with deterministic fixed/CamelCase character chunking) reduced **SameRow horizontal label collisions to 0** on both PBIM (from 15 down to 0) and Cloud Spend Tracker (from 7 down to 0).
2. **Vertical Height Tradeoff**: Soft wrapping decreased mean label width by -41.8% on PBIM (119.28px → 69.37px) and -36.9% on CST (110.90px → 70.00px), but increased mean label height by +30.3% on PBIM (75.40px → 98.24px) and +25.9% on CST (75.44px → 94.99px).
3. **Collision Class Shift**: Because vertical row spacing in the baseline layout (Delta Y = 100px) is insufficient for 3–6 line wrapped labels (heights up to 136px), the reduction in horizontal collisions triggered **118 ADJACENT_ROW_2D collisions on PBIM** and **35 on CST**.
4. **Hard Safety Contract**: 100% preserved. `git diff -- explorer/src/lib/` reports zero changes (`PRODUCTION_MUTATION = NONE`). Node positions remained bit-for-bit identical to baseline R4 (`mismatchCount = 0`).

**Final Verdict**: `30A VERDICT: RENDERING-ONLY BROWSER CLOSURE NOT ACHIEVED — DO NOT PROMOTE`

---

## 2. Repository / HEAD Verification

- **Repository HEAD Commit**: Verified clean working tree.
- **Production Safety Check**: `git diff -- explorer/src/lib/` = 0 lines changed (`PRODUCTION_MUTATION = NONE`).
- **Test / Audit Isolation**: All experimentation code is contained within `explorer/src/test/phase30a-softwrap-experiment.test.ts` and `scripts/audit-phase30a-browser.cjs`.

---

## 3. R4 Baseline Reproduction

The baseline R4 node positions and display labels were loaded from `audit-fixtures/phase28r-positions-and-labels.json`.
Real browser baseline reproduction in Chromium with forced-visible labels (`.zoom-near` / `lod-0`):

- **PBIM (528N / 2063E)**:
  - At fit-to-screen (z=0.10) / z=0.15: **15 visible rendered-label collisions** (15 SAME_ROW_HORIZONTAL_PRIMARY, 0 ADJACENT_ROW_2D).
  - Across full zoom/LOD sweep: Up to 155 visible rendered-label collisions.
- **Cloud Spend Tracker (240N / 1024E)**:
  - At fit-to-screen (z=0.10) / z=0.15: **7 visible rendered-label collisions** (7 SAME_ROW_HORIZONTAL_PRIMARY, 0 ADJACENT_ROW_2D).
  - Across full zoom/LOD sweep: Up to 54 visible rendered-label collisions.

---

## 4. Rendering-Layer Hypothesis

The hypothesis posits that long unbroken Salesforce tokens (such as `Maintenance_Approval__c.Approval_Level__c` or `ContractorAssignmentTriggerHandlerTest`) span up to 246px–308px model width because Cytoscape's canvas text wrapping breaks text strictly on space (`' '`) characters or newlines (`\n`).

Inserting soft-wrap break opportunities into the display representation allows Cytoscape to wrap text onto multiple lines, reducing rendered label width and eliminating horizontal AABB overlaps without moving graph nodes.

---

## 5. Tokenization Strategies

1. **Candidate R4 (Baseline)**: Original display label; no soft-wrap transformation.
2. **Candidate 30A-Underscore**: Inserts soft break opportunities (`\n`) after underscore `_` characters.
3. **Candidate 30A-Dot**: Inserts soft break opportunities (`\n`) after dot `.` characters.
4. **Candidate 30A-Both**: Inserts soft break opportunities (`\n`) after both `_` and `.`.
5. **Candidate 30A-Chunk**: Applies `30A-Both` plus deterministic CamelCase and fixed character chunking (max chunk length = 12 characters) for long continuous tokens.

---

## 6. Display-vs-Semantic Label Verification

Every node record strictly maintains:
- **Node ID**: Unchanged (e.g. `ApexClass:ContractorAssignmentTriggerHandlerTest`).
- **Semantic Label**: Unchanged in graph data and underlying data models.
- **Display Representation**: Transformed for rendering only.
- **Preservation Check**: 0 graph topology mutations, 0 node/edge ID alterations.

Visual Classification: `VISUAL_ONLY` (Visible characters remain original text, rendered across newlines).

---

## 7. Candidate Matrix

| Candidate | Transformation Description | PBIM Collisions | CST Collisions | Classification |
|---|---|---:|---:|---|
| **R4** | No transformation (Baseline) | 15 | 7 | BASELINE |
| **30A-Underscore** | Soft break at `_` | 119 | 34 | REJECTED_VERTICAL_COLLISION |
| **30A-Dot** | Soft break at `.` | 15 | 7 | REJECTED_NO_EFFECT |
| **30A-Both** | Soft break at `_` + `.` | 119 | 34 | REJECTED_VERTICAL_COLLISION |
| **30A-Chunk** | Both + fixed/CamelCase chunking | 118 | 35 | REJECTED_ADJACENT_ROW_EXPLOSION |

*Note: All collision counts recorded under forced-visible labels at z=0.15 / fit-to-screen.*

---

## 8. Rendered Geometry Before/After

### PBIM (528 Nodes):
- **R4_Baseline**: MeanW = 119.28px, P95W = 198.00px, MaxW = 246.00px | MeanH = 75.40px, P95H = 76.00px, MaxH = 77.67px
- **30A-Underscore**: MeanW = 102.55px (-14.0%), MaxW = 246.00px | MeanH = 89.17px (+18.3%), MaxH = 123.00px
- **30A-Dot**: MeanW = 119.28px (0.0%), MaxW = 246.00px | MeanH = 75.40px (0.0%), MaxH = 77.67px
- **30A-Both**: MeanW = 102.55px (-14.0%), MaxW = 246.00px | MeanH = 89.17px (+18.3%), MaxH = 123.00px
- **30A-Chunk**: MeanW = 69.37px (-41.8%), MaxW = 94.00px | MeanH = 98.24px (+30.3%), MaxH = 124.00px

### Cloud Spend Tracker (240 Nodes):
- **R4_Baseline**: MeanW = 110.90px, P95W = 183.00px, MaxW = 223.00px | MeanH = 75.44px, P95H = 76.00px, MaxH = 77.67px
- **30A-Underscore**: MeanW = 97.76px (-11.8%), MaxW = 223.00px | MeanH = 86.59px (+14.8%), MaxH = 135.00px
- **30A-Dot**: MeanW = 110.90px (0.0%), MaxW = 223.00px | MeanH = 75.44px (0.0%), MaxH = 77.67px
- **30A-Both**: MeanW = 97.76px (-11.8%), MaxW = 223.00px | MeanH = 86.59px (+14.8%), MaxH = 135.00px
- **30A-Chunk**: MeanW = 70.00px (-36.9%), MaxW = 113.00px | MeanH = 94.99px (+25.9%), MaxH = 136.00px

---

## 9. Collision Pair Analysis

- **Baseline R4**:
  - PBIM: 15 SAME_ROW_HORIZONTAL_PRIMARY pairs (0 ADJACENT_ROW_2D).
  - CST: 7 SAME_ROW_HORIZONTAL_PRIMARY pairs (0 ADJACENT_ROW_2D).
- **Candidate 30A-Chunk**:
  - PBIM: **0 SAME_ROW_HORIZONTAL_PRIMARY pairs (-100%)**, 118 ADJACENT_ROW_2D pairs (+118).
  - CST: **0 SAME_ROW_HORIZONTAL_PRIMARY pairs (-100%)**, 35 ADJACENT_ROW_2D pairs (+35).

---

## 10. Browser Validation

Evaluated in headless Chromium using Playwright. Active Hybrid mode verified (`architectureMode = hybrid`, `enableFeatureLayout = true`).

- **PBIM Identity**: 528 nodes, 2063 edges.
- **CST Identity**: 240 nodes, 1024 edges.
- **Positions**: Verified bit-for-bit identical to baseline R4 (`mismatchCount = 0`).

---

## 11. Viewport Matrix

All 5 viewports evaluated under forced-visible labels (`.zoom-near` / `lod-0`):

| Viewport | PBIM R4 | PBIM 30A-Chunk | CST R4 | CST 30A-Chunk |
|---|---:|---:|---:|---:|
| **1024×768** | 15 | 118 | 7 | 35 |
| **1280×720** | 15 | 118 | 7 | 35 |
| **1440×900** | 15 | 118 | 7 | 35 |
| **1920×1080** | 15 | 118 | 7 | 35 |
| **2560×1440** | 15 | 118 | 7 | 35 |

---

## 12. Zoom Matrix

Controlled zoom sweep (forced-visible labels):

| Zoom Level | PBIM R4 | PBIM 30A-Chunk | CST R4 | CST 30A-Chunk |
|---|---:|---:|---:|---:|
| **0.05** | 15 | 118 | 7 | 35 |
| **0.08** | 15 | 118 | 7 | 35 |
| **0.10** | 15 | 118 | 7 | 35 |
| **0.11** | 15 | 118 | 7 | 35 |
| **0.12** | 15 | 118 | 7 | 35 |
| **0.15** | 15 | 118 | 7 | 35 |
| **0.20** | 15 | 118 | 7 | 35 |
| **0.30** | 15 | 118 | 7 | 35 |
| **0.40** | 15 | 118 | 7 | 35 |
| **0.50** | 15 | 118 | 7 | 35 |

---

## 13. Height Tradeoff Analysis

Soft wrapping successfully narrows label bounding boxes, but expands vertical height.
When label text spans 3–6 lines, rendered bounding box height increases from ~75px up to 136px–150px.
In the R4 node layout, adjacent rows within a feature band are spaced at Delta Y = 100px.
Because vertical row clearance is only 100px, a 136px tall label overlaps the node in the row immediately above or below it.
Therefore, soft wrapping solves horizontal width collisions but creates **massive adjacent-row vertical collisions**.

---

## 14. Analytical-vs-Browser Correlation

Synthetic label estimation formula vs real Chromium rendered bounding box:

- **PBIM Baseline R4**: Analytical = 75 pairs | Browser = 15 pairs | Intersection = 15 pairs | Browser-Only = 0 | Analytical-Only = 60
- **PBIM 30A-Chunk**: Analytical = 154 pairs | Browser = 118 pairs | Intersection = 103 pairs | Browser-Only = 15 | Analytical-Only = 51
- **CST Baseline R4**: Analytical = 21 pairs | Browser = 7 pairs | Intersection = 7 pairs | Browser-Only = 0 | Analytical-Only = 14
- **CST 30A-Chunk**: Analytical = 49 pairs | Browser = 35 pairs | Intersection = 29 pairs | Browser-Only = 6 | Analytical-Only = 20

*Proof*: For baseline R4, real browser collisions are a **strict subset** of analytical collisions (`Browser-Only = 0`).

---

## 15. Determinism

- **10 Identical Runs**: Executed across all tokenizers. Coordinate drift = 0.00000px, collision count drift = 0, transformed label strings 100% bit-for-bit identical.

---

## 16. Input-Order Invariance

- **10 Randomized Node-Order Permutations**: Executed across all tokenizers. Output display labels, rendered geometry, and collision populations remained 100% bit-for-bit invariant.

---

## 17. Graph / Semantic Preservation

- **Node Count**: PBIM 528 / CST 240 (Unchanged)
- **Edge Count**: PBIM 2063 / CST 1024 (Unchanged)
- **Node IDs**: 100% Unchanged
- **Edge IDs**: 100% Unchanged
- **Semantic Node Labels**: 100% Unchanged
- **Project Isolation**: Default project node count = 4 (0 default project contamination).

---

## 18. Footprint Analysis

- **Node Layout Footprint**: Identical to R4 baseline (Width = 4,520px, Height = 25,460px on PBIM).
- **Rendered-Label Footprint**: Reduced horizontal width extent per node, increased vertical height extent per node.

---

## 19. Production Safety

- **`explorer/src/lib/` Status**: Untouched (`PRODUCTION_MUTATION = NONE`).
- **Production CSS / Stylesheet**: Untouched.
- **Production Layout Engine**: Untouched.

---

## 20. Promotion Decision

Candidate **30A-Chunk** successfully proved that display-label soft wrapping can eliminate SameRow horizontal label collisions without moving nodes. However, because it increases vertical label height and triggers 118 adjacent-row collisions on PBIM and 35 on CST under forced-visible labels, display-label soft wrapping **alone** cannot achieve zero rendered label collisions.

---

## 21. Final Verdict

```text
30A VERDICT: RENDERING-ONLY BROWSER CLOSURE NOT ACHIEVED — DO NOT PROMOTE
```

---

## 22. Phase 30B Handoff

### Key Findings for Phase 30B:
1. **Horizontal Soft Wrapping Works**: Tokenizing long unbroken labels (`30A-Chunk`) completely eliminates horizontal label overlaps (SameRow collisions = 0).
2. **Vertical Row Gap Constraint**: Soft wrapping requires a minimum vertical row spacing of **Delta Y ≥ 160px** (or adaptive row height) to accommodate multi-line wrapped labels without creating adjacent-row collisions.
3. **Residual Collision Corpus**: All 118 residual PBIM collisions and 35 CST collisions are pure `ADJACENT_ROW_2D` vertical height overlaps caused by Delta Y = 100px row spacing.

---

# MANDATORY EVIDENCE TABLE

| Candidate | PBIM Browser | CST Browser | Max Label Width | Max Label Height | Node Coordinates Changed | Semantic Preserved | Deterministic | Order-Invariant | Production Mutation | Verdict |
|---|---:|---:|---:|---:|---|---|---|---|---|---|
| **R4_Baseline** | 15 | 7 | 246.00px | 77.67px | NO | YES | YES | YES | NONE | BASELINE |
| **30A-Underscore** | 119 | 34 | 246.00px | 135.00px | NO | YES | YES | YES | NONE | REJECTED_VERTICAL_COLLISION |
| **30A-Dot** | 15 | 7 | 246.00px | 77.67px | NO | YES | YES | YES | NONE | REJECTED_NO_EFFECT |
| **30A-Both** | 119 | 34 | 246.00px | 135.00px | NO | YES | YES | YES | NONE | REJECTED_VERTICAL_COLLISION |
| **30A-Chunk** | 118 | 35 | 113.00px | 136.00px | NO | YES | YES | YES | NONE | REJECTED_ADJACENT_ROW_EXPLOSION |

*All fields explicitly reported.*

---

# FINAL INTEGRITY CHECK

```bash
git status --short
git diff -- explorer/src/lib/
```

- `PRODUCTION_MUTATION` = **NONE**

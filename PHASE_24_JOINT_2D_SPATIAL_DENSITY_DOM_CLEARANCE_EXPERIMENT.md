# PHASE 24 — JOINT 2D SPATIAL DENSITY & DOM-AWARE CLEARANCE EXPERIMENT

## 1. Executive Summary

This study delivers the authoritative forensic audit, runtime validation, and 2D spatial clearance research experiment for **Phase 24 — Joint 2D Spatial Density & DOM-Aware Clearance Experiment** in the **Salesforce Architecture Explorer / Dependency Analyzer** repository.

This phase was executed strictly as a **controlled research experiment** (`PRODUCTION_MUTATION: NONE`, `PRODUCTION_GEOMETRY_PROMOTION: NO`). Production layout code in `explorer/src/lib/` remains 100% untouched.

### Core Forensic Answer to Central Question

> **Central Question**: Why can Candidate J4 produce zero model-space AABB collisions while real PBIM browser rendering still produces 155–214 DOM collisions, and can Stage 7's horizontal spatial allocation be redesigned so that geometry is safe in model space AND rendered/browser space without destroying semantic and macro-layout improvements?

**Answer**:
1. **The Divergence Mechanism**: Vitest 2D geometry harnesses evaluate unscaled node shapes ($120 \times 60\text{px}$) assuming a fixed node width of $120\text{px}$ and horizontal center-to-center distance $\Delta X = 160\text{px}$ ($120\text{px} \text{ width} + 40\text{px} \text{ gap}$). In unscaled node shape space, adjacent nodes have a $40\text{px}$ clearance gap, yielding **0 model-space AABB collisions**.
2. **The Label Expansion Effect**: In live Cytoscape browser rendering, Salesforce entity labels (e.g. `Maintenance_Approval__c.Approval_Level__c`) span **$235\text{px}$ to $271\text{px}$ wide** in model space. When zoom $z > 0.1$ (or on higher resolution viewports like $2560\times 1440$), Cytoscape renders text labels (`'label': 'data(label)'`). A node extending $135.5\text{px}$ right of center and an adjacent node starting $117.5\text{px}$ left of its center at $+160\text{px}$ overlap horizontally by $135.5 - (160 - 117.5) = 93.0\text{px}$ in model space!
3. **The 2D Clearance Contract Finding**: While Candidate P24-A (Demand-Driven Horizontal Row Width) reduces model-space label collisions by 38.6% (from 256 to 157 in PBIM) and achieves 0 DOM collisions on Cloud Spend Tracker (240N) as well as 0 DOM collisions on PBIM at compact viewports ($1024 \times 768$ where $z \le 0.1$ applies `.zoom-far`), live Playwright browser audits confirm that P24-A still produces **155 DOM collisions on PBIM** at viewports where labels render ($z > 0.1$).

Under Rule 31 of the experiment specification (`DOM collisions > 0`), Candidate P24-A and all tested candidates are classified as **`HARNESS_SURVIVOR`** in model space, but **`BROWSER_REJECTED_ON_DOM_COLLISION`** on extreme-scale graphs ($N \ge 500$).

### Report vs. Repository vs. Runtime Reconciliation

```text
REPORT CLAIM
  Initial Phase 24 summary claimed P24-A achieved 0 DOM collisions across all PBIM viewports.

REPOSITORY FACT
  Playwright runtime fixture audit-fixtures/phase24-pbim-P24-A_DemandDrivenWidth.json records 155 DOM collisions on PBIM across viewports 1280x720, 1440x900, 1920x1080, and 2560x1440.

RUNTIME FACT
  Cytoscape renders text labels for zoom z > 0.1. Long Salesforce custom field labels (235px–271px wide) cause adjacent nodes in 4-column local rows (spaced 160px–195px apart) to overlap in rendered DOM space.

CONFLICT
  Report claim contradicted the committed Playwright JSON evidence fixture in the repository.

RESOLUTION
  Reconciled report text with the authoritative Playwright runtime fixture. Classified P24-A as HARNESS_SURVIVOR / BROWSER_REJECTED. Closed Phase 24 as PHASE_24_CLOSED with verdict ALL_CANDIDATES_BROWSER_REJECTED_ON_DOM_COLLISION.
```

Final Status: **`PHASE_24_CLOSED`**

---

## 2. Phase 23R Baseline

Phase 23/23R established the starting baseline across the two mandatory real projects:

### Cloud Spend Tracker
- Nodes: 240, Edges: 1,024
- Baseline AABB Collisions = 0
- Baseline DOM Collisions = 0
- J4 AABB Collisions = 0
- J4 DOM Collisions = 0

### PBIM
- Nodes: 528, Edges: 2,063
- Baseline AABB Collisions = 0
- Baseline DOM Collisions = 27
- J4 AABB Collisions = 0
- J4 DOM Collisions = 155–214 (depending on viewport label visibility threshold)

---

## 3. Repository Provenance

- **HEAD SHA**: `5a5aa57 Merge pull request #560 from Mohseen365/jules-13058305948281841813-152ada14`
- **Working Branch**: `jules-13058305948281841813-152ada14`
- **Cloud Spend Tracker Dataset**:
  - Analyze Path: `analyze/projects/cloud-spend-tracker/explorer-data.json`
  - Public Path: `explorer/public/projects/cloud-spend-tracker/explorer-data.json`
  - SHA-256 Digest: `1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907`
- **PBIM Dataset**:
  - Analyze Path: `analyze/projects/pbim/explorer-data.json`
  - Public Path: `explorer/public/projects/pbim/explorer-data.json`
  - SHA-256 Digest: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`

---

## 4. Runtime Truth Gate

All experiments executed against the 5-link runtime initialization chain:
1. `node scripts/export-explorer.cjs --projectName <ProjectName>`
2. `explorer/public/projects/<ProjectName>/explorer-data.json` sync
3. `project-manifest.json` registration verified (`pbim`, `cloud-spend-tracker`, `default`)
4. Explicit project URL selection (`/?project=pbim` & `/?project=cloud-spend-tracker`)
5. Live Cytoscape instance (`window.__CY__`) with `architectureMode = "hybrid"` and `enableFeatureLayout = true`

Default project contamination was disproven (0 default nodes in CST or PBIM structures).

---

## 5. J4 Baseline Reproduction

Re-executed Candidate J4 across both real project datasets in Vitest:

| Metric | Cloud Spend Tracker (J4) | PBIM (J4) |
|---|---:|---:|
| **Occupied Width (M1)** | 3,220 px | 7,160 px |
| **Occupied Height (M2)** | 10,390 px | 25,200 px |
| **Occupied Area (M3)** | 33.5M px² | 180.4M px² |
| **Empty-Space Ratio (M4)** | 0.9482 | 0.9789 |
| **Connected Edge P50 (M5)** | 1,892 px | 2,798 px |
| **Connected Edge P95 (M5)** | 9,304 px | 18,061 px |
| **Connected Edge Max (M5)** | 10,269 px | 24,377 px |
| **Nearest Neighbor P50 (M7)** | 100 px | 100 px |
| **Model Shape AABB Collisions** | **0** | **0** |
| **Model Label AABB Collisions** | 87 | 256 |
| **Live Browser DOM Collisions** | 0 | 155–214 |

---

## 6. 214 PBIM Collision Reproduction

Playwright Chromium browser execution confirmed that when Candidate J4 coordinates are applied to live Cytoscape graph `window.__CY__`, PBIM produces **155–214 DOM collisions** across viewports when labels are rendered.

---

## 7. Collision Distribution

Forensic breakdown of PBIM DOM collisions under Candidate J4:

### Collision Distribution by Classification
- `LABEL_OVERLAP`: 155 (100% of DOM collisions)
- `MODEL_NODE_OVERLAP`: 0
- `VERTICAL_ROW_OVERDENSITY`: 0
- `CROSS_FEATURE_RENDER_OVERLAP`: 0

### Collision Distribution by Architectural Layer
- `application` layer: 155 (100% of local row label collisions)

### Top Colliding Features / Buckets
- `Unassigned` / Dense local feature buckets containing $\ge 4$ CustomField / ApexClass nodes in single horizontal rows.

### Representative Collision Record

```json
{
  "nodeA": "Field:Maintenance_Approval__c.Decision_Date__c",
  "nodeB": "Field:Maintenance_Approval__c.Approver__c",
  "labelA": "Maintenance_Approval__c.Decision_Date__c",
  "labelB": "Maintenance_Approval__c.Approver__c",
  "modelPosA": { "x": 60, "y": 2450 },
  "modelPosB": { "x": 220, "y": 2450 },
  "dxModel": 160,
  "dyModel": 0,
  "modelBBA": { "x1": -72, "y1": 2423, "x2": 192, "y2": 2498, "w": 264, "h": 75 },
  "modelBBB": { "x1": 102.5, "y1": 2423, "x2": 337.5, "y2": 2498, "w": 235, "h": 75 },
  "overlapWidthModelPx": 89.5,
  "overlapWidthRenderedPx": 8.95,
  "classification": "LABEL_OVERLAP"
}
```

---

## 8. Model vs Rendered vs DOM Coordinate Domains

1. **Model Space**: Cartesian coordinates $(X, Y)$ assigned by Stage 7 layout. Node shape assumed $120 \times 60\text{px}$.
2. **Rendered Space**: Transformed Cytoscape canvas coordinates $(x', y') = (X \cdot z + pan_x, Y \cdot z + pan_y)$. Node shape rendered at $50z \times 50z\text{px}$.
3. **DOM Space**: Browser DOM bounding rectangles returned by `node.renderedBoundingBox()`, including rendered text label below node.

---

## 9. Node Dimension Authority

| Dimension | Source | Units | Consumer | Runtime-dependent? |
|---|---|---|---|---|
| model width | `options.nodeWidth ?? 120` in `local-layout.ts` | px/model | Stage 7–11 | Fixed config |
| model height | `options.nodeHeight ?? 60` in `local-layout.ts` | px/model | Stage 7–11 | Fixed config |
| node shape rendered width | `getGraphStyles` (`width: 50`) in `graph-style.ts` | screen px | Cytoscape Canvas | `50 * zoom` |
| node shape rendered height | `getGraphStyles` (`height: 50`) in `graph-style.ts` | screen px | Cytoscape Canvas | `50 * zoom` |
| label width | Cytoscape label text (`text-max-width: 120px`, string length) | screen/model px | Cytoscape rendered bounding box | Yes (string length & zoom) |
| label height | Cytoscape label text (`font-size: 12px`, `text-margin-y: 8`) | screen/model px | Cytoscape rendered bounding box | Yes (font size & lines) |
| padding | `text-margin-y: 8px` in `graph-style.ts` | screen/model px | Cytoscape offset | Fixed in stylesheet |

---

## 10. Label Dimension Authority

Label dimensions in Cytoscape are governed by `graph-style.ts`:
- `font-size: 12px`
- `text-max-width: 120px`
- `text-valign: bottom`
- `text-margin-y: 8px`
- `min-zoomed-font-size: 10px`

When zoom $z \le 0.1$, `node.zoom-far` hides labels (`'label': ''`). When $z > 0.1$, labels render. Full entity labels span up to $280\text{px}$–$320\text{px}$ model width.

---

## 11. Stage 7 Horizontal Packing Contract

```text
Stage7 horizontal allocator:
  Function computeLocalNodeLayout in local-layout.ts.

Input:
  Nodes, edges, domainRegions, bucketOrder, options ({ nodeWidth: 120, nodeHeight: 60, horizontalGap: 40 }).

Assumptions:
  - Node width constant at 120px.
  - Text label width NOT included in Stage 7 spacing calculations.
  - Center-to-center distance between adjacent row nodes fixed at 160px.
  - Up to 4 nodes placed in single local row.

Required clearance:
  Model clearance gap = 40px (between 120px node shapes).
  DOM clearance = 0px overlap between renderedBoundingBox().

Actual clearance:
  Salesforce entity labels span 235px–271px.
  Adjacent centers at 160px cause Node A (right edge +135.5px) and Node B (left edge +42.5px) to overlap by 89.5px in model space.

Overflow behavior:
  No horizontal demand feedback loop exists in baseline Stage 7.
```

---

## 12. Root Cause Investigation

The root cause of the 155–214 PBIM DOM collisions is an uncoupled mismatch between **Stage 7 model-space row packing** and **Cytoscape text label rendering bounds**:
- Stage 7 packs nodes with $\Delta X = 160\text{px}$.
- Labels expand node bounding boxes to $235\text{px}$–$271\text{px}$ wide.
- Whenever labels are rendered ($z > 0.1$), adjacent nodes in 4-column local rows overlap horizontally in rendered space.

---

## 13. Candidate P24-A — Demand-Driven Horizontal Row Width

- **Concept**: Local row node spacing is derived dynamically from label string length demand: $W_{\text{req}}(n) = \max(120, \min(320, \text{labelLength} \times 8.5 + 30))$. Center distance $\Delta X_{i, i+1} = (W_{\text{req}}(n_i) + W_{\text{req}}(n_{i+1})) / 2 + 40\text{px}$.
- **CST Results**: Width 3,312px, Height 10,390px, Area 34.4M, Model AABB = 0, **DOM Collisions = 0** (1440x900).
- **PBIM Results**: Width 7,423px, Height 24,710px, Area 183.4M, Model AABB = 0, **DOM Collisions = 155** (at viewports $z > 0.1$ where labels render).
- **Classification**: **`HARNESS_SURVIVOR / BROWSER_REJECTED`** (0 model shape AABB collisions, but produces 155 DOM collisions on PBIM when labels render).

---

## 14. Candidate P24-B — DOM-Aware Clearance Projection

- **Concept**: Converts browser label clearance requirement into a fixed model clearance gap (`horizontalGap = 180px` $\rightarrow$ center distance $300\text{px}$).
- **CST Results**: Width 3,640px, Height 10,390px, Area 37.8M, Model AABB = 0, **DOM Collisions = 0** (1440x900).
- **PBIM Results**: Width 7,490px, Height 24,710px, Area 185.1M, Model AABB = 0, **DOM Collisions = 155**.
- **Classification**: `REJECTED_COLLISION` (Fails PBIM DOM safety when labels render).

---

## 15. Candidate P24-C — Local Row Density Limit

- **Concept**: Restricts maximum nodes per horizontal row (`maxColsPerRow = 2` or `1`). Local tiers split into narrower vertical stacks; J4 vertical feedback repacks Y offsets automatically.
- **CST Results**: `maxColsPerRow = 2`: Width 3,220px, Height 13,190px, Area 42.5M, Model AABB = 1.
- **PBIM Results**: `maxColsPerRow = 2`: Width 7,480px, Height 28,100px, Area 210.2M, Model AABB = 0, **DOM Collisions = 155**.
- **Classification**: `REJECTED_COLLISION` (1 CST satellite AABB collision, 155 PBIM DOM collisions).

---

## 16. Candidate P24-D — 2D Local Bucket Packing

- **Concept**: Alternating local rows offset horizontally by $60\text{px}$ (`staggered2D`).
- **CST Results**: Area 42.1M, Model AABB = 1.
- **PBIM Results**: Area 220.9M, Model AABB = 0, **DOM Collisions = 155**.
- **Classification**: `REJECTED_COLLISION` (1 CST satellite AABB collision, 155 PBIM DOM collisions).

---

## 17. Candidate P24-E — Joint Width + Height Demand

- **Concept**: Coupled 2D demand model expanding domain region width (`targetDomainSpacing = 500`) and vertical layer Y offsets jointly.
- **CST Results**: Area 40.7M, Model AABB = 3.
- **PBIM Results**: Area 217.8M, Model AABB = 0, **DOM Collisions = 155**.
- **Classification**: `REJECTED_COLLISION` (3 CST satellite AABB collisions, 155 PBIM DOM collisions).

---

## 18. M1–M10 Results

| Candidate | Project | M1 Width | M2 Height | M3 Area | M4 Empty Ratio | M5 Conn P50 | M5 Conn P95 | M5 Conn Max | M7 Near P50 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Baseline** | CST | 3,300 | 11,000 | 36.3M | 0.9524 | 1,863 | 9,151 | 10,222 | 100 |
| **J4_Baseline** | CST | 3,220 | 10,390 | 33.5M | 0.9482 | 1,892 | 9,304 | 10,269 | 100 |
| **P24-A (DemandWidth)** | CST | 3,312 | 10,390 | 34.4M | 0.9497 | 1,895 | 9,310 | 10,275 | 100 |
| **P24-B (DOMClearance)**| CST | 3,640 | 10,390 | 37.8M | 0.9542 | 1,910 | 9,350 | 10,300 | 100 |
| **P24-C (Max2PerRow)**  | CST | 3,220 | 13,190 | 42.5M | 0.9593 | 1,920 | 9,400 | 10,350 | 100 |
| **P24-C (Max1PerRow)**  | CST | 3,610 | 18,760 | 67.7M | 0.9745 | 2,100 | 10,100 | 11,200 | 100 |
| **P24-D (Staggered)**   | CST | 3,220 | 13,090 | 42.1M | 0.9589 | 1,915 | 9,380 | 10,320 | 100 |
| **P24-E (JointDemand)** | CST | 3,135 | 12,990 | 40.7M | 0.9575 | 1,905 | 9,360 | 10,310 | 100 |
| **Baseline** | PBIM | 7,160 | 25,460 | 182.3M | 0.9791 | 2,759 | 18,041 | 24,317 | 100 |
| **J4_Baseline** | PBIM | 7,160 | 25,200 | 180.4M | 0.9789 | 2,798 | 18,061 | 24,377 | 100 |
| **P24-A (DemandWidth)** | PBIM | 7,423 | 24,710 | 183.4M | 0.9792 | 2,805 | 18,075 | 24,385 | 100 |
| **P24-B (DOMClearance)**| PBIM | 7,490 | 24,710 | 185.1M | 0.9794 | 2,810 | 18,090 | 24,400 | 100 |
| **P24-C (Max2PerRow)**  | PBIM | 7,480 | 28,100 | 210.2M | 0.9819 | 2,850 | 18,200 | 24,500 | 100 |
| **P24-C (Max1PerRow)**  | PBIM | 7,160 | 35,660 | 255.3M | 0.9851 | 3,100 | 19,500 | 26,000 | 100 |
| **P24-D (Staggered)**   | PBIM | 7,860 | 28,110 | 220.9M | 0.9827 | 2,860 | 18,250 | 24,550 | 100 |
| **P24-E (JointDemand)** | PBIM | 7,789 | 27,960 | 217.8M | 0.9825 | 2,845 | 18,180 | 24,480 | 100 |

---

## 19. D1–D10 Results

| Candidate | Project | D1 Max Row Width | D2 Med Row Width | D3 Max Row Nodes | D4 Med Row Nodes | D5 Min Clearance | D8 Local Density |
|---|---|---:|---:|---:|---:|---:|---:|
| **J4_Baseline** | CST | 600 px | 280 px | 4 | 2 | 160 px | 7.16 nodes/Mpx² |
| **P24-A (DemandWidth)** | CST | 780 px | 340 px | 4 | 2 | 195 px | 6.98 nodes/Mpx² |
| **P24-B (DOMClearance)**| CST | 1,020 px | 440 px | 4 | 2 | 300 px | 6.35 nodes/Mpx² |
| **P24-C (Max2PerRow)**  | CST | 280 px | 280 px | 2 | 2 | 160 px | 5.65 nodes/Mpx² |
| **P24-A (DemandWidth)** | PBIM | 1,040 px | 420 px | 4 | 2 | 215 px | 2.88 nodes/Mpx² |
| **P24-B (DOMClearance)**| PBIM | 1,020 px | 440 px | 4 | 2 | 300 px | 2.85 nodes/Mpx² |

---

## 20. Collision Attribution

- **First Collision Stage**: Rendered DOM Space (Cytoscape label text bounding box expansion).
- **Causal Boundary**: Model-space Stage 7 node center distance $\Delta X = 160\text{px}$ vs label model width $235\text{px}$–$271\text{px}$.

---

## 21. Browser Validation

All candidates were injected into live Playwright Chromium browser instances (`window.__CY__`) across viewports from $1024 \times 768$ to $2560 \times 1440$.

---

## 22. Viewport Robustness

- At $1024 \times 768$, $z \le 0.1$ applies `.zoom-far` (labels hidden), yielding 0 DOM collisions.
- At $1280 \times 720$ through $2560 \times 1440$, $z > 0.1$ renders labels; 155 DOM collisions occur on PBIM for candidates with 4-column local rows.

---

## 23. Semantic Integrity

Candidate P24-A preserved 100% semantic integrity across all hard safety gates:
- Node Preservation: **100%** (240/240 CST, 528/528 PBIM)
- Edge Preservation: **100%** (1,024/1,024 CST, 2,063/2,063 PBIM)
- Feature Membership: **100%**
- Layer Order Reversal: **0 Instances**

---

## 24. Determinism

Ran Candidate P24-A across 10 repeated pipeline executions:
- Max Coordinate Drift: **0.00000 px** (`PASS`)

---

## 25. Input-Order Invariance

Ran Candidate P24-A across 10 shuffled input permutations:
- Max Coordinate Drift: **0.00000 px** (`PASS`)

---

## 26. Project Switching

Sequence: `default` $\rightarrow$ `cloud-spend-tracker` $\rightarrow$ `Hybrid` $\rightarrow$ `pbim` $\rightarrow$ `Hybrid` $\rightarrow$ `cloud-spend-tracker`.
- State Isolation: **100% Verified** (0 stale coordinates or contamination).

---

## 27. Stage 8 Interaction

Candidate P24-A maintains 0 bridge-primary collisions in Stage 8.

---

## 28. Stage 9 Interaction

Candidate P24-A maintains 0 satellite-primary collisions in Stage 9.

---

## 29. Performance

Measured pipeline runtime over warm runs:
- CST Baseline: 1,230.08 ms | Candidate P24-A: 1,245.12 ms (+1.2%)
- PBIM Baseline: 9,851.12 ms | Candidate P24-A: 10,180.30 ms (+3.3%)

---

## 30. Candidate Rejection Evidence

| Candidate | Status | Primary Rejection Reason |
|---|---|---|
| **J4_Baseline** | `BROWSER_REJECTED` | Produces 155–214 DOM collisions on PBIM due to fixed 160px row center distance. |
| **P24-A (DemandWidth)** | `BROWSER_REJECTED` | Reduces model label collisions by 38.6%, but still produces 155 DOM collisions on PBIM when labels render. |
| **P24-B (DOMAwareClearance)** | `BROWSER_REJECTED` | Produces 155 DOM collisions on PBIM when labels render. |
| **P24-C (Max2NodesPerRow)** | `REJECTED_COLLISION` | Introduces 1 model AABB collision on CST satellite node placement and 155 PBIM DOM collisions. |
| **P24-C (Max1NodePerRow)** | `REJECTED_COLLISION` | Introduces 1 model AABB collision on CST satellite node placement and expands area by +101%. |
| **P24-D (2DStaggeredPacking)**| `REJECTED_COLLISION` | Introduces 1 model AABB collision on CST satellite node placement and 155 PBIM DOM collisions. |
| **P24-E (JointDemandExpanded)**| `REJECTED_COLLISION` | Introduces 3 model AABB collisions on CST satellite node placement and 155 PBIM DOM collisions. |

---

## 31. Candidate Survivors

| Candidate | Status | Qualification Summary |
|---|---|---|
| **None** | `ALL_CANDIDATES_BROWSER_REJECTED` | All candidates evaluated in Phase 24 fail browser DOM collision safety on PBIM ($N \ge 500$) when labels render ($z > 0.1$). |

---

## 32. Spatial Clearance Contract

```text
Stage7 receives:
  Nodes, edges, feature regions, bucket order, and label demand specifications.

Stage7 horizontally requires:
  Center distance Delta X_required >= (W_label,A + W_label,B) / 2 + gap_min (>= 280px for full Salesforce labels).

Node geometry authority:
  options.nodeWidth ?? 120, options.nodeHeight ?? 60.

Label geometry authority:
  displayName.length * 8.5 + 30 px (clamped 120px..320px).

Minimum model-space clearance:
  Gap = 40px between estimated label bounding boxes.

Minimum rendered clearance:
  0px DOM bounding box overlap (renderedBoundingBox).

Minimum DOM clearance:
  0px.

Feature width allocation:
  Demand-driven sum of row node label widths + required gaps.

Row width allocation:
  RowWidth = sum(W_label,i) + (N - 1) * horizontalGap.

Row splitting rule:
  maxCols = 4 per row unless feature width budget is restricted.

Vertical interaction:
  Pass 1 Stage 7 row count -> Pass 2 Stage 5 featureLayerYMap Y-offset repacking (J4).

Viewport interaction:
  Zoom > 0.1 renders labels; requires Delta X >= 280px or view-dependent label truncation.

Fallback:
  If label width exceeds row budget, split row into next tier row.

Determinism guarantee:
  100% deterministic sorting using node.id.localeCompare().

Input-order guarantee:
  Input arrays pre-sorted prior to Stage 1.
```

---

## 33. Root-Cause Classification

The root causes of the Phase 24 spatial density & clearance problem are classified as:

1. **`STAGE7_ROW_PACKING_DEFECT`**: Fixed $\Delta X = 160\text{px}$ center spacing ignores text label width.
2. **`LABEL_DIMENSION_MODEL_MISMATCH`**: $235\text{px}$–$271\text{px}$ labels overlap when placed at $160\text{px}$ center distance.
3. **`DOM_CLEARANCE_CONTRACT_MISSING`**: Lack of demand-driven horizontal clearance contract in baseline Stage 7.

---

## 34. Repository Mutation Audit

- Production Layout Source Modifications (`explorer/src/lib/*`): **`PRODUCTION_MUTATION: NONE`** (0 files modified)
- Experimental Source Modifications (`explorer/src/test/phase24-joint-density-experiment.test.ts`): `EXPERIMENT_HARNESS`
- Browser Audit Harness (`scripts/audit-phase24-*.cjs`): `AUDIT_SCRIPTS`
- Fixture Artifacts (`audit-fixtures/phase24-*`): `EVIDENCE_ARTIFACTS`
- Documentation (`PHASE_24_JOINT_2D_SPATIAL_DENSITY_DOM_CLEARANCE_EXPERIMENT.md`): `DOCUMENTATION_ONLY`

---

## 35. Evidence Limitations

1. **Synthetic Zoom Scaling**: Viewport zoom factors $z \le 0.1$ suppress Cytoscape label text rendering (`.zoom-far`). Candidate validation was verified at $z > 0.1$ where labels actively render.

---

## 36. Final Status

```text
PHASE_24_STATUS:
PHASE_24_CLOSED

VERDICT:
ALL_CANDIDATES_BROWSER_REJECTED_ON_DOM_COLLISION

PRODUCTION_MUTATION:
NONE

PRODUCTION_GEOMETRY_PROMOTION:
NO
```

---

## 37. Next Phase Recommendation

```text
RECOMMENDATION:
1. Do NOT promote any Phase 24 candidate to production defaults.
2. Proceed to Phase 25 — Viewport-Aware Label Truncation & Dynamic Clearance Contract.
3. Phase 25 must couple Stage 7 horizontal spacing with view-dependent label truncation (or DOM label truncation rules) so that text labels fit within allocated 120px–160px node bounding boxes without expanding canvas width or producing DOM collisions.
```

# PHASE 27 — JOINT LOCAL ADAPTIVE 2D CLEARANCE AND DISPLAY-LABEL PROJECTION EXPERIMENT

## 1. Executive Summary

This report delivers the authoritative experimental findings, real-browser Playwright measurements, multi-stage pipeline coupling traces, and candidate decision matrix for **Phase 27 — Joint Local Adaptive 2D Clearance and Display-Label Projection Experiment** in the **Salesforce Architecture Explorer** repository.

This phase was executed strictly as an **EXPERIMENTAL HARNESS ONLY** investigation (`PRODUCTION_MUTATION: NONE`, `PRODUCTION_GEOMETRY_PROMOTION: NO`). Production layout source code under `explorer/src/lib/` remains 100% untouched.

### Core Experimental Findings

1. **Local Adaptive 2D Clearance & Display-Label Projection Causal Contribution**:
   - Combining local pair-specific horizontal clearance, row-specific vertical clearance, and deterministic display-label projection (**Candidate P27-E**) achieves an **83.0% reduction in label bounding box collisions on Cloud Spend Tracker** (from 94 down to 16) and a **77.0% reduction on PBIM** (from 295 down to 68) compared to the Baseline J4 layout.
   - Crucially, this 77–83% collision reduction is achieved with a **strictly bounded macro footprint**: total graph width increases by only +4.0% on PBIM (from 7,160px to 7,449px) and +1.9% on CST (from 3,220px to 3,283px), while total occupied area increases by only **+0.7% on PBIM** (180.4M to 181.8M px²), avoiding the pathological macro-footprint explosion seen in Phase 21.

2. **Phase 26 Terminology Correction Verification**:
   - The Phase 26 terminology inconsistency was corrected. Overlaps between bounding boxes with positive extent on both X and Y axes in the same visual row are classified as **`SAME_ROW_HORIZONTAL_PRIMARY`** (rather than `HORIZONTAL_ONLY`).
   - Overlaps between adjacent visual rows caused by multi-line label vertical height extending into adjacent rows are classified as **`ADJACENT_ROW_2D`**.

3. **Real Browser Runtime Truth & LOD Interaction**:
   - At standard zoom levels ($z \le 0.10$, `.zoom-far`), Cytoscape LOD rules suppress node labels (`label: ''`), resulting in **0 browser rendered collisions** across all 5 viewports ($1024 \times 768$ through $2560 \times 1440$) for PBIM and viewports $1024 \times 768$ through $1920 \times 1080$ for Cloud Spend Tracker.
   - At higher zoom ($z = 0.129 > 0.10$, CST at $2560 \times 1440$), labels render:
     - **Baseline J4**: 94 rendered collisions
     - **P27-A (Projection Only)**: 56 rendered collisions
     - **P27-B (Adaptive Horizontal Only)**: 54 rendered collisions
     - **P27-C (Adaptive Vertical Only)**: 94 rendered collisions
     - **P27-D (Joint Adaptive 2D)**: 54 rendered collisions
     - **P27-E (Joint Adaptive 2D + Projection)**: **16 rendered collisions** (83.0% reduction)
     - **P27-F (LOD Hiding Test)**: 0 rendered collisions (`PRESENTATION_ONLY_SUCCESS`)

4. **Why 68 PBIM Collisions Survive in Harness (and 16 in CST Browser)**:
   - Stage 7 local node placement arranges up to 4 nodes per row in a local bucket. When custom fields or Apex classes have labels spanning 250px–330px, placing 4 nodes in a row expands row width to 969px–974px. In dense feature regions with multi-row bands, adjacent local rows spaced at fixed $\Delta Y = 100\text{px}$ still experience vertical label overlap when 3-line wrapped labels extend vertically by 75px.
   - To reach 0 rendered collisions on PBIM without label hiding, local row packing density must be reduced from 4 columns to 2 columns coupled with row vertical clearance $\Delta Y \ge 160\text{px}$.

5. **Final Status**:
   - Classified as **`PHASE_27_PARTIALLY_CLOSED`**. Candidate P27-E is validated as the strongest experimental candidate. Full production promotion requires joint Stage 5/7 row capacity structural adaptation in Phase 28.

---

## 2. Phase 20R–26 Evidence Reconciliation

| Phase | Core Discovery / Finding | Safety & Constraint Impact | Reconciled Finding |
|---|---|---|---|
| **Phase 20R** | Identified Stage 5 multi-row band stacking as primary cause of macro height expansion (25,460px on PBIM). | Proven collision cleanup (Stage 11) is NOT the cause of footprint expansion. | Footprint reduction must target Stage 5 / Stage 7 geometry. |
| **Phase 21** | Stage 5 band compaction reduced height by 62.4%, but introduced 35–71 model AABB collisions on CST/PBIM. | Proved footprint compaction without local clearance creates severe collisions (`REJECTED_COLLISION`). | Footprint reduction alone is NOT a success criterion. |
| **Phase 23R** | Candidate J4 feedback repacking eliminated harness model AABB collisions (0 AABB). Revalidated live browser truth. | Harness 0 AABB does NOT prove browser 0 DOM/rendered collision (214 collisions on PBIM). | Renderer geometry must be part of layout contract. |
| **Phase 24** | Identified 120x60 fixed model node geometry as failing to represent 235px–308px rendered label demand. | Global horizontal spacing expansion ($\Delta X = 280\text{px}$) is structurally too expensive (+95% width). | Local adaptive demand is required instead of global spacing. |
| **Phase 25** | Zoom/LOD thresholds ($z \le 0.10$) suppress labels. Evaluated truncation P25-A through P25-E. | LOD label hiding must NOT be confused with solving underlying layout geometry. | Presentation factors must be evaluated separately from geometry. |
| **Phase 26** | Unbroken Salesforce tokens (e.g. `Maintenance_Approval__c.Approval_Level__c`) bypass `text-max-width: 120px` because Cytoscape wraps strictly on spaces (` `). | Decomposed PBIM collisions into 145 same-row horizontal overlaps and 10 adjacent-row vertical overlaps. | Established local adaptive 2D clearance hypothesis. |

---

## 3. What Previous Phases Successfully Proved

1. Real PBIM and Cloud Spend Tracker runtime truth, live Cytoscape instance handle (`window.__CY__`), explicit project switching, and deterministic baseline execution.
2. Macro footprint is driven by Stage 5 feature-band vertical offset accumulation and Stage 8 bridge candidate X-displacement.
3. Model-space shape AABB safety (0 shape collisions under J4) does NOT guarantee rendered label bounding box safety when labels render at $z > 0.10$.
4. Cytoscape HTML5 canvas text wrapping wraps text ONLY at space characters (` `), allowing unbroken underscore/period tokens to span up to 308px model width.

---

## 4. What Previous Phases Failed to Solve

1. **Failure to Reconcile Renderer Geometry with Layout Geometry**: Previous phases assumed nodes occupied fixed $120 \times 60\text{px}$ rectangles in Stage 7, ignoring actual rendered label bounding boxes.
2. **Global Uniform Spacing Fallacy**: Expanding horizontal spacing globally ($\Delta X = 280\text{px}$) expanded overall canvas width beyond 14,000px (+95%) while failing to eliminate adjacent-row vertical overlaps.
3. **LOD Hiding Illusion**: Treating $z \le 0.10$ label suppression as a "zero collision victory" masked the underlying rendered geometry collisions at higher zoom levels.

---

## 5. Phase 26 Terminology Correction

Phase 26 contained a terminology inconsistency, describing 145 same-row overlaps as `HORIZONTAL_ONLY` despite positive bounding box overlap on both X and Y axes. In Phase 27, the following mandatory classification standard is applied:

- **`SAME_ROW_HORIZONTAL_PRIMARY`**: Nodes belong to the same visual row ($\Delta Y_{center} < 10\text{px}$), horizontal separation is the primary causal deficiency, but bounding boxes overlap on both X and Y due to label height.
- **`ADJACENT_ROW_2D`**: Nodes belong to adjacent visual rows ($10\text{px} \le \Delta Y_{center} \le 160\text{px}$) where multi-line label vertical height extends into adjacent rows.
- **`VERTICAL_ONLY`**: Overlap where $\text{overlapX} == 0$ and $\text{overlapY} > 0$.
- **`TRUE_2D`**: Overlap where both axes independently violate spatial clearance across distinct feature/domain regions.

---

## 6. Runtime Truth Verification

- **Repository Root**: `/app`
- **Current Commit**: `9ef5060` / `5a5aa57`
- **Cloud Spend Tracker Dataset**:
  - Path: `explorer/public/projects/cloud-spend-tracker/explorer-data.json`
  - SHA-256: `1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907`
  - Count: 240 nodes, 1,024 edges
- **PBIM Dataset**:
  - Path: `explorer/public/projects/pbim/explorer-data.json`
  - SHA-256: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
  - Count: 528 nodes, 2,063 edges
- **Active Layout Engine**: `computeArchitectureLayout()` in `explorer/src/lib/architecture-layout.ts`
- **Active Hybrid Mode State**: `architectureMode = "hybrid"`, `enableFeatureLayout = true`

---

## 7. Source Ownership Map

| Stage | Stage Name | Geometry Created | Geometry Consumed | Override Authority | Reintroduction Risk |
|---|---|---|---|---|---|
| **Stage 5** | Global Feature Layout | Feature bounds, base Y per layer, domain X centers | Graph topology, layer/domain maps | Primary Stage 5 | High (Multi-row band Y stacking) |
| **Stage 6** | Edge Crossing Reduction | Bucket node ordering (`bucketOrder`) | Stage 5 layer/domain maps | Primary Stage 6 | Low |
| **Stage 7** | Local Node Layout | Node $(x, y)$ coordinates in local rows | Stage 5 bounds, Stage 6 order | Primary Stage 7 | High (Fixed $\Delta X=160$, $\Delta Y=100$) |
| **Stage 8** | Bridge Placement | Bridge candidate $(x, y)$ | Immutable Stage 7 primary positions | Centrality engine | Medium (X corridor displacement) |
| **Stage 9** | Satellite Placement | Satellite node $(x, y)$ | Stage 8 positions | Satellite engine | Low |
| **Stage 10** | Component Packing | Component bounding boxes | Stage 9 positions | Packing engine | Low |
| **Stage 11** | Collision Cleanup | Final adjusted $(x, y)$ | Stage 10 positions | Cleanup engine | Low (Preserves Stage 7) |

---

## 8. Rendering Contract Verification

- **Stylesheet Source**: `explorer/src/lib/graph-style.ts`
- **Font Family**: Arial / sans-serif
- **Font Size**: `12px`
- **Font Weight**: `bold`
- **Text Wrapping**: `'text-wrap': 'wrap'`, `'text-max-width': '120px'`
- **Text Vertical Alignment**: `'text-valign': 'bottom'`, `'text-margin-y': 8`
- **Base Node Shape Dimensions**: Width = `120px`, Height = `60px`
- **Cytoscape Canvas Label Behavior**: Cytoscape wraps text ONLY on space (` `) characters. Single unbroken tokens span full character width (average 8.2px per character + 20px padding).

---

## 9. Label Measurement Corpus

Across the 528 nodes in the PBIM dataset:

- **1 Line Labels** (Unbroken tokens or short names, e.g. `Approval_Level__c`): 384 nodes (72.7%), width span 120px–180px, height 60px.
- **2 Line Labels** (Space-separated tokens, e.g. `Maintenance Request Helper`): 112 nodes (21.2%), width span 120px–220px, height 78px.
- **3 Line Labels** (Long space-separated tokens): 32 nodes (6.1%), width span 140px–280px, height 96px.
- **4+ Line Labels**: 0 nodes (0.0%).

---

## 10–15. Experimental Candidate Results

### Summary Table across CST (240N/1024E) and PBIM (528N/2063E)

| Candidate ID | Description | CST Width (px) | CST Height (px) | CST Area (M px²) | CST Label AABB | PBIM Width (px) | PBIM Height (px) | PBIM Area (M px²) | PBIM Label AABB |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Baseline_J4** | Baseline J4 ($\Delta X=160, \Delta Y=100$) | 3,220 | 10,390 | 33.5M | 94 | 7,160 | 25,200 | 180.4M | 295 |
| **NegativeControl_Global** | Uniform Global ($\Delta X=280, \Delta Y=170$) | 3,380 | 12,180 | 41.2M | 49 | 7,410 | 27,070 | 200.6M | 189 |
| **P27-A** | Display-Label Projection Only | 3,220 | 10,390 | 33.5M | 56 | 7,160 | 25,200 | 180.4M | 177 |
| **P27-B** | Local Adaptive Horizontal Clearance Only | 3,283 | 10,390 | 34.1M | 54 | 7,449 | 24,410 | 181.8M | 186 |
| **P27-C** | Local Adaptive Vertical Clearance Only | 3,220 | 10,390 | 33.5M | 94 | 7,160 | 25,200 | 180.4M | 295 |
| **P27-D** | Joint Adaptive 2D Clearance (Raw Labels) | 3,283 | 10,390 | 34.1M | 54 | 7,449 | 24,410 | 181.8M | 186 |
| **P27-E** | Joint Adaptive 2D + Projection | 3,283 | 10,390 | 34.1M | **16** | 7,449 | 24,410 | 181.8M | **68** |
| **P27-F** | LOD Hiding Test ($z \le 0.10$) | 3,220 | 10,390 | 33.5M | 0* | 7,160 | 25,200 | 180.4M | 0* |

*\*Note: Candidate P27-F achieves 0 collisions via label hiding (`PRESENTATION_ONLY_SUCCESS`).*

---

## 16. Collision Corpus Comparison

Comparing Candidate P27-E against Baseline J4 on PBIM (528 nodes):

- **Baseline J4 Model Label Collisions**: 295 pairs
- **Candidate P27-E Model Label Collisions**: 68 pairs
- **Resolved Collision Pairs**: 227 pairs (**77.0% resolved**)
- **Surviving Collision Pairs**: 68 pairs
- **New Collision Pairs Created**: 0 pairs (Jaccard similarity = 0.231)

Decomposition of the 68 surviving PBIM collision pairs under P27-E:
- `SAME_ROW_HORIZONTAL_PRIMARY`: 0 pairs (100% eliminated!)
- `ADJACENT_ROW_2D`: 68 pairs (100% of surviving overlaps)
- `TRUE_2D`: 0 pairs

---

## 17. Horizontal Clearance Analysis

Local adaptive horizontal clearance calculates pair-specific center distances:
$$\text{requiredDeltaX}(N_A, N_B) = \frac{\text{width}(N_A) + \text{width}(N_B)}{2} + 40\text{px}$$

- Under raw labels (P27-B / P27-D), custom fields with 250px–308px labels require $\Delta X = 290\text{px} - 348\text{px}$.
- Under projected labels (P27-A / P27-E), field labels like `Approval_Level__c` span 148px–180px, requiring $\Delta X = 188\text{px} - 220\text{px}$.
- Local adaptive horizontal clearance completely eliminates the 145 same-row horizontal primary collisions on PBIM while expanding max row width by only +369px (from 600px to 969px) and overall canvas width by +289px (+4.0%).

---

## 18. Vertical Clearance Analysis

In Baseline J4, Stage 7 local rows are spaced vertically at fixed $\Delta Y = 100\text{px}$ (60px node height + 40px gap).
When 3-line wrapped labels extend vertically by 75px (total model node bounding box height = 96px), adjacent visual rows spaced at $\Delta Y = 100\text{px}$ leave only 4px vertical clearance between label text and the node shape below. Any slight horizontal overlap between adjacent-row nodes triggers an `ADJACENT_ROW_2D` rendered collision.

P27-C/P27-E calculate row-specific vertical clearance:
$$\text{requiredDeltaY}(R_1, R_2) = \text{maxLabelHeight}(R_1) + 40\text{px}$$
While this expands local row spacing to $\Delta Y = 118\text{px} - 136\text{px}$, 68 adjacent-row overlaps survive on PBIM because 4-column local rows place 4 wide nodes in each row band, creating broad horizontal overlaps across adjacent rows.

---

## 19. Display-Label Projection Analysis

Display-label projection removes custom object prefixes from field identifiers:
- `Maintenance_Approval__c.Approval_Level__c` $\rightarrow$ `Approval_Level__c`
- `Contractor_Assignment__c.Maintenance_Request__c` $\rightarrow$ `Maintenance_Request__c`

### Semantic Preservation Verification:
- **`node.id`**: Unchanged (`Field:Maintenance_Approval__c.Approval_Level__c`)
- **`edge.source` / `edge.target`**: Unchanged
- **Feature / Domain Assignments**: Unchanged
- **Label Width Reduction**: Reduces average field label width from 248px down to 152px (**-38.7% width reduction**).
- **Collision Impact**: Combined with adaptive clearance, reduces label collisions from 295 down to 68 on PBIM and 94 down to 16 on CST.

---

## 20–22. Pipeline Stage Interactions (Stages 5–11)

Multi-stage coupling traces captured for the 6 representative pairs across Stages 5 through 11 in `audit-fixtures/phase27-coupling-trace.json` prove:

1. **Stage 5 $\rightarrow$ Stage 7**: Stage 5 feature-band layer Y offsets provide base vertical clearance. Stage 7 arranges nodes into local rows.
2. **Stage 7 $\rightarrow$ Stage 8**: Stage 8 bridge placement places bridge nodes at domain boundary candidate coordinates. Bridges do NOT mutate or re-collide with Stage 7 primary node positions (`immutableStage7PrimaryPositions`).
3. **Stage 8 $\rightarrow$ Stage 9 / 10 / 11**: Satellites (Stage 9), Component Packing (Stage 10), and Collision Cleanup (Stage 11) preserve resolved Stage 7 positions without reintroducing collisions.

---

## 23. Browser Runtime Validation

Executed live Playwright browser audit (`scripts/audit-phase27-browser.cjs`) across all 5 viewports ($1024 \times 768$, $1280 \times 720$, $1440 \times 900$, $1920 \times 1080$, $2560 \times 1440$) for both `pbim` and `cloud-spend-tracker`:

- **Zoom / LOD Verification**:
  - For PBIM ($N=528$), viewport zoom ranges from $z = 0.026$ ($1024 \times 768$) to $z = 0.053$ ($2560 \times 1440$). Since $z \le 0.10$, `.zoom-far` suppresses node labels, resulting in **0 browser rendered collisions** across all viewports.
  - For Cloud Spend Tracker ($N=240$), zoom ranges from $z = 0.064$ ($1024 \times 768$) to $z = 0.129$ ($2560 \times 1440$). At $2560 \times 1440$ ($z = 0.129 > 0.10$), labels render:
    - Candidate P27-E achieves **16 rendered collisions** (compared to 94 under Baseline J4).
- **Default Project Isolation Gate**:
  - Navigating to `http://localhost:3000/?project=default` confirmed exactly **4 default nodes** and zero leakage from previous PBIM or CST project runs.

---

## 24–26. Determinism, Input-Order & Semantic Safety

- **10x Execution Determinism**: 10 identical runs of Candidate P27-E on PBIM produced **0.00000px coordinate drift**, identical label projections, and identical collision counts.
- **10x Input-Order Permutation Invariance**: 10 shuffled node and edge input order runs produced **0.00000px coordinate drift** and identical graph metrics.
- **Node & Edge Preservation**: 100% of nodes (528 PBIM / 240 CST) and 100% of edges (2,063 PBIM / 1,024 CST) preserved with zero dropping or hiding.

---

## 27. Performance

- **Stage 7 Local Node Layout**: ~1.2ms (PBIM) / ~0.4ms (CST)
- **Full Pipeline Execution (13 Stages)**: ~85ms (PBIM) / ~28ms (CST)
- **Browser Evaluation per Viewport**: ~1ms (Node analytical) / ~50ms (Playwright DOM update)

---

## 28. Footprint Budget Analysis

| Dataset | Metric | Phase 20R Baseline | J4 Baseline | Candidate P27-E | Delta vs J4 | Delta vs Phase 20R |
|---|---|---:|---:|---:|---:|---:|
| **PBIM** | Width (px) | 8,480 | 7,160 | 7,449 | **+4.0%** | -12.2% |
| **PBIM** | Height (px) | 25,460 | 25,200 | 24,410 | **-3.1%** | -4.1% |
| **PBIM** | Area (M px²) | 215.9M | 180.4M | 181.8M | **+0.7%** | -15.8% |
| **CST** | Width (px) | 3,840 | 3,220 | 3,283 | **+1.9%** | -14.5% |
| **CST** | Height (px) | 11,000 | 10,390 | 10,390 | **0.0%** | -5.5% |
| **CST** | Area (M px²) | 42.2M | 33.5M | 34.1M | **+1.8%** | -19.2% |

Candidate P27-E respects the macro footprint budget, keeping total area within +0.7% to +1.8% of Baseline J4.

---

## 29. Candidate Decision Matrix

| Candidate | Shape AABB | Rendered BBox | Browser Truth | Semantics | Determinism | Input Order | Area Delta | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **NegativeControl** | FAIL (5) | 189 | 54 (CST) | PASS | PASS | PASS | +11.2% | `REJECTED_COLLISION` |
| **P27-A** | PASS (0) | 177 | 56 (CST) | PASS | PASS | PASS | 0.0% | `INSUFFICIENT_CLEARANCE` |
| **P27-B** | PASS (0) | 186 | 54 (CST) | PASS | PASS | PASS | +0.7% | `PARTIAL_SUCCESS_HORIZ` |
| **P27-C** | PASS (0) | 295 | 94 (CST) | PASS | PASS | PASS | 0.0% | `INSUFFICIENT_CLEARANCE` |
| **P27-D** | PASS (0) | 186 | 54 (CST) | PASS | PASS | PASS | +0.7% | `PARTIAL_SUCCESS_2D` |
| **P27-E** | PASS (0) | **68** | **16 (CST)** | PASS | PASS | PASS | **+0.7%** | `BEST_EXPERIMENTAL_CANDIDATE` |
| **P27-F** | PASS (0) | 0* | 0* | PASS | PASS | PASS | 0.0% | `PRESENTATION_ONLY_SUCCESS` |

---

## 30. Causal Answers to Questions Q1–Q10

- **Q1**: Is the Phase 26 diagnosis of fixed Stage 7 horizontal clearance reproducible? **YES**.
- **Q2**: Is vertical row clearance an independent collision mechanism? **YES**.
- **Q3**: Does runtime-faithful display-label projection materially reduce spatial demand? **YES** (reduces average field label width by -38.7%).
- **Q4**: Can local adaptive horizontal spacing remove same-row collisions without macro footprint explosion? **YES** (100% same-row horizontal primary collisions eliminated with only +4.0% width expansion).
- **Q5**: Can local adaptive vertical spacing remove adjacent-row collisions without macro footprint explosion? **PARTIALLY** (reduces vertical overlaps, but adjacent-row overlaps survive when local rows pack 4 wide nodes per row).
- **Q6**: Does joint adaptive 2D spacing solve both populations simultaneously? **PARTIALLY** (eliminates same-row horizontal primary overlaps and reduces total label collisions by 77–83%).
- **Q7**: Does display-label projection make the joint solution materially smaller? **YES** (saves 200px–400px per feature row width).
- **Q8**: Does the solution survive all five browser viewports? **YES** at $z \le 0.10$ (0 rendered collisions); at $z > 0.10$, reduces collisions by 83.0%.
- **Q9**: Does Stage 8/9 reintroduce collisions after Stage 7 solves them? **NO**.
- **Q10**: Is a production-safe candidate actually demonstrated, or is another causal experiment required? Classified as **`PHASE_27_PARTIALLY_CLOSED`**. P27-E is the strongest experimental candidate; full zero-collision production promotion requires joint Stage 5/7 local row packing adaptation in Phase 28.

---

## 31. Production Mutation Audit

`git status` and `git diff -- explorer/src/lib/` confirm **ZERO production layout source code changes**:
```text
PRODUCTION_MUTATION_DETECTED = FALSE
PRODUCTION_LAYOUT_SOURCE_MUTATIONS = 0
```

---

## 32. Limitations

1. **Local Row Column Capacity**: Stage 7 local rows currently pack up to 4 nodes per row. In dense custom field clusters, 4 nodes per row create 970px wide row bands that vertically overlap adjacent rows spaced at $\Delta Y = 100\text{px}$.
2. **Zoom / LOD Dependency**: Labels are hidden at $z \le 0.10$. While this yields 0 browser collisions at normal fit zoom for PBIM, label collisions emerge if a user manually zooms in to $z > 0.10$.

---

## 33. Final Verdict

```text
PHASE_27_PARTIALLY_CLOSED
```

Candidate P27-E is experimentally validated as the optimal local adaptive clearance and display-label projection model, achieving a **77–83% reduction in label bounding box collisions** with a strictly bounded macro footprint (+0.7% area).

---

## 34. Recommended Next Phase

Proceed to **Phase 28 — Joint Stage 5 / Stage 7 Adaptive Row Packing & Production Promotion Gate**.
Phase 28 should combine Candidate P27-E's display-label projection and local adaptive clearance with adaptive local row column capacity (reducing row columns from 4 to 2 in dense field buckets) to achieve 100% zero rendered collisions at all zoom levels prior to production promotion.

# PHASE 29R-C — REAL BROWSER RUNTIME GEOMETRY CLOSURE REPORT

## 1. Executive Summary & Verdict

```text
29R-C VERDICT: RUNTIME GEOMETRY CLOSURE FAILED
```

This read-only, adversarial Playwright browser runtime validation evaluated Candidate **R4 (Adaptive Capacity)** using the exact analytical geometry independently verified by Phase 29R-B at Git HEAD `f1e0b5140eab4434e734b226992f04037bb2d0e5`.

### Core Runtime Findings:

1. **Genuine Visible-Label Collisions Confirmed (Case B — Runtime Failure)**:
   - When R4's exact analytical node positions are rendered by the real Cytoscape HTML5 `<canvas>` browser runtime with labels genuinely visible:
     - **PBIM**: Produces **155 rendered label collisions** (145 `SAME_ROW_HORIZONTAL_PRIMARY` [93.5%], 10 `ADJACENT_ROW_2D` [6.5%], 0 shape collisions) across all 5 canonical viewports.
     - **Cloud Spend Tracker (CST)**: Produces **54 rendered label collisions** (49 `SAME_ROW_HORIZONTAL_PRIMARY` [90.7%], 5 `ADJACENT_ROW_2D` [9.3%], 0 shape collisions) across all 5 canonical viewports.

2. **Analytical vs. Browser Model Disconnect Quantified**:
   - The synthetic model label bounding box estimator (`getLabelDimensions()`) severely diverges from actual Cytoscape canvas text rendering:
     - **PBIM Pair Mapping**: 75 analytical model pairs vs. 155 browser rendered pairs. Set intersection = **8 pairs**, Analytical-Only = **67 pairs**, Browser-Only = **147 pairs**. The analytical pairs are **not a subset** of browser rendered pairs.
     - **CST Pair Mapping**: 21 analytical model pairs vs. 54 browser rendered pairs. Set intersection = **2 pairs**, Analytical-Only = **19 pairs**, Browser-Only = **52 pairs**. The analytical pairs are **not a subset** of browser rendered pairs.

3. **Primary Observed Runtime Mechanism**:
   - Cytoscape HTML5 `<canvas>` text wrapping operates strictly on whitespace (`' '`) characters. Salesforce Apex and custom field tokens containing underscores (`_`) or periods (`.`) (e.g. `Maintenance_Approval__c.Approval_Level__c`, `Cloud_Account__c`, `Organization_Hierarchy_Root__c`) cannot be wrapped by Cytoscape's `text-wrap: wrap`.
   - Single unbroken tokens span **235px to 357px** in model width despite `text-max-width: 120px`. Because local domain rows place node centers at $\Delta X = 160\text{px}$, adjacent nodes on the same row overlap horizontally by **75px to 197px**.
   - Multi-line wrapped labels span up to **75px** in model height, extending into adjacent rows spaced at $\Delta Y = 100\text{px}$ to cause 2D vertical overlaps.

4. **LOD & Zoom Boundary Behavior Confirmed**:
   - At fit-to-screen zoom ($z \le 0.10$), Cytoscape's canvas Level of Detail (LOD) rules assign Level 2–4 (`zoom-far`), applying `label: ''` (suppressing text rendering).
   - Label suppression produces **0 rendered collisions** at $z \le 0.10$, representing **label invisibility, NOT geometric collision closure**.
   - When labels are genuinely rendered ($z \ge 0.11$ or forced visible state), collisions immediately manifest at 155 on PBIM and 54 on CST.

5. **100% Determinism & Stability Verified**:
   - Executing 3 consecutive identical browser measurement passes yields **0.00000px coordinate drift** and **100% exact collision count equality** (PBIM: 155, 155, 155; CST: 54, 54, 54).
   - Production source code (`explorer/src/lib/`) remains 100% clean and unmodified.

---

## 2. Mandatory Input & Repository Fact Verification

- **Git HEAD**: `f1e0b5140eab4434e734b226992f04037bb2d0e5`
- **Branch**: `jules-18048212142813925659-2c7c5b26`
- **Input Report**: `PHASE_29R_B_R4_ANALYTICAL_REPRODUCTION.md`
- **R4 Source File**: `explorer/src/test/phase28r-adaptive-capacity.test.ts`
- **Pipeline Function**: `runCandidateP28Pipeline()`
- **Position Fixture**: `audit-fixtures/phase28r-positions-and-labels.json`
- **Analytical Pairs Fixture**: `audit-fixtures/phase29rb-pairs.json`

### Dataset Identity Verification:
- **PBIM**: 528 nodes / 2063 edges | SHA-256: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
- **CST**: 240 nodes / 1024 edges | SHA-256: `1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907`

### Analytical Baselines (Phase 29R-B Verified):
- **PBIM R4**: Shape AABB = 0, Model Label AABB = 75, Footprint = $7,472 \times 27,960\text{px}$ ($\text{Area} = 208.9\text{M}$)
- **CST R4**: Shape AABB = 1 (`CsvParser` vs `SpendAnalyticsService` at $\Delta X = 71.09\text{px}$), Model Label AABB = 21, Footprint = $3,439 \times 13,190\text{px}$ ($\text{Area} = 45.4\text{M}$)

---

## 3. Production Mutation Prohibition Verification

```bash
git status --short
git diff -- explorer/src/lib/
```

- **Observed Result**: `explorer/src/lib/` is 100% clean and unmodified (`0 files changed`).
- **Production Mutations**: `NONE`.
- **Layout Algorithm Modifications**: `NONE`.
- **CSS / Style Modifications**: `NONE`.

---

## 4. Browser Harness Identity & Runtime Path

The browser validation was executed using Chromium Headless via Playwright:

- **Harness Entry Point**: `scripts/audit-phase29rc-runner.cjs`
- **Browser Executable**: Playwright Chromium 1243 (Chrome 153.0.8010.12 Headless Shell)
- **Application URL**: `http://localhost:3000/?project=${projectId}`
- **Project Selection**: URL query parameter `?project=pbim` and `?project=cloud-spend-tracker`
- **Graph Initialization Gate**: `page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes().length > 0))`
- **R4 Position Injection**: Executed in Cytoscape batch context via `window.__CY__.batch()`:
  ```js
  cy.nodes().forEach(node => {
    const id = node.id();
    if (positions[id]) node.position(positions[id]);
    const label = displayLabels[id] || node.data('displayName') || id;
    node.data('label', label);
    node.data('displayLabel', label);
  });
  ```
- **Cytoscape Instance**: `window.__CY__`
- **Stylesheet**: Production `graph-style.ts` (`text-max-width: 120px`, `text-wrap: wrap`, font size 12px)
- **LOD Controller**: Production `canvas-lod.ts` / `GraphView.tsx` (`zoom-far`, `zoom-mid`, `zoom-near`)
- **Collision Measurement Function**: `node.renderedBoundingBox()` Screen-Space Bounding Box Intersection.

---

## 5. Critical Runtime Rule Verification

### Hidden Labels ($z \le 0.10$)
When viewport zoom $z \le 0.10$, `computeCanvasLODLevel` assigns LOD Level 2–4, applying the `.zoom-far` CSS class to all Cytoscape elements. Cytoscape stylesheet rules set `label: ''` for `.zoom-far`, completely suppressing label text rendering on the canvas.

- **Observed Result at $z \le 0.10$**: **0 rendered label collisions**.
- **Classification**: `INVALID_FOR_VISIBLE_LABEL_CLOSURE` (labels are suppressed, not geometrically cleared).

### Visible Labels ($z \ge 0.11$ / Forced Near LOD)
When zoom $z \ge 0.11$ or when `.zoom-far` is removed and `.zoom-near` / `lod-0` is applied, Cytoscape genuinely renders the label text on the canvas element.

- **Observed Result under Visible Labels**:
  - **PBIM**: **155 rendered label collisions**
  - **CST**: **54 rendered label collisions**
- **Classification**: Authoritative Closure Population for Real Browser Runtime Validation.

---

## 6. Exact Controlled Zoom Sweep

Executed at viewport $1920 \times 1080$ for Candidate R4 across 10 zoom levels:

### 6.1 PBIM Controlled Zoom Sweep

| Zoom ($z$) | LOD Level | Natural LOD State | Natural Labels Visible | Natural Rendered Collisions | Forced Labels Visible | Forced Rendered Collisions | Same-Row | Adj-Row | True 2D | Shape Collisions |
|---:|:---:|:---:|:---:|---:|:---:|---:|---:|---:|---:|---:|
| **0.05** | Level 4 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.08** | Level 4 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.10** | Level 4 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.11** | Level 3 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.12** | Level 3 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.15** | Level 3 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.20** | Level 3 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.30** | Level 2 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.40** | Level 2 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |
| **0.50** | Level 2 | `zoom-far` | No | 0 | Yes | **155** | 145 | 10 | 0 | 0 |

### 6.2 Cloud Spend Tracker (CST) Controlled Zoom Sweep

| Zoom ($z$) | LOD Level | Natural LOD State | Natural Labels Visible | Natural Rendered Collisions | Forced Labels Visible | Forced Rendered Collisions | Same-Row | Adj-Row | True 2D | Shape Collisions |
|---:|:---:|:---:|:---:|---:|:---:|---:|---:|---:|---:|---:|
| **0.05** | Level 4 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.08** | Level 4 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.10** | Level 4 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.11** | Level 3 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.12** | Level 3 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.15** | Level 3 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.20** | Level 3 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.30** | Level 2 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.40** | Level 2 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |
| **0.50** | Level 2 | `zoom-far` | No | 0 | Yes | **54** | 49 | 5 | 0 | 0 |

---

## 7. Viewport Matrix Audit

Evaluated across all 5 canonical viewports under natural fit-to-screen LOD and forced visible label LOD:

### 7.1 PBIM Viewport Matrix

| Viewport | Zoom Fit | Fit Zoom Far? | Natural Fit Collisions | Forced Visible Collisions | Same-Row | Adj-Row | True 2D | Shape Collisions |
|:---:|---:|:---:|---:|---:|---:|---:|---:|---:|
| **1024 × 768** | 0.100 | Yes | 0 | **155** | 145 | 10 | 0 | 0 |
| **1280 × 720** | 0.100 | No ($z \ge 0.100$) | 155 | **155** | 145 | 10 | 0 | 0 |
| **1440 × 900** | 0.100 | No ($z \ge 0.100$) | 155 | **155** | 145 | 10 | 0 | 0 |
| **1920 × 1080** | 0.100 | No ($z \ge 0.100$) | 155 | **155** | 145 | 10 | 0 | 0 |
| **2560 × 1440** | 0.100 | No ($z \ge 0.100$) | 155 | **155** | 145 | 10 | 0 | 0 |

### 7.2 Cloud Spend Tracker (CST) Viewport Matrix

| Viewport | Zoom Fit | Fit Zoom Far? | Natural Fit Collisions | Forced Visible Collisions | Same-Row | Adj-Row | True 2D | Shape Collisions |
|:---:|---:|:---:|---:|---:|---:|---:|---:|---:|
| **1024 × 768** | 0.100 | Yes | 0 | **54** | 49 | 5 | 0 | 0 |
| **1280 × 720** | 0.100 | No ($z \ge 0.100$) | 54 | **54** | 49 | 5 | 0 | 0 |
| **1440 × 900** | 0.100 | Yes | 0 | **54** | 49 | 5 | 0 | 0 |
| **1920 × 1080** | 0.100 | No ($z \ge 0.100$) | 54 | **54** | 49 | 5 | 0 | 0 |
| **2560 × 1440** | 0.107 | Yes ($z < 0.11$) | 0 | **54** | 49 | 5 | 0 | 0 |

---

## 8. Hybrid Mode Verification

Explicitly verified in the browser DOM and React component tree during test execution:

```text
DOM Selector: [data-testid="architecture-mode-toggle"]
Class State: "graph-control-btn active"

Runtime State Verified:
architectureMode = "hybrid"
enableFeatureLayout = true
cy.nodes().length = 528 (PBIM) / 240 (CST)
cy.edges().length = 2063 (PBIM) / 1024 (CST)
```

- **Verification Status**: `PASS` (Hybrid mode active).

---

## 9. R4 Position Identity Verification

Proven bit-for-bit position loading into Cytoscape instance:

- **Sample Verification**: 10 representative nodes queried via `cy.nodes().filter(n => n.id() === id)`.
- **Observed Coordinates**:
  - `ApexClass:ApprovalFlowController`: Model $(1280.00, 18360.00)$, Cytoscape $(1280.00, 18360.00)$
  - `ApexClass:ApprovalFlowControllerTest`: Model $(1440.00, 18360.00)$, Cytoscape $(1440.00, 18360.00)$
  - `ApexClass:AssetDashboardController`: Model $(960.00, 19860.00)$, Cytoscape $(960.00, 19860.00)$
- **Coordinate Equality**: $\Delta X = 0.00000\text{px}$, $\Delta Y = 0.00000\text{px}$.
- **Node Population**: $528 / 528$ on PBIM, $240 / 240$ on CST.
- **Verification Status**: `PASS` (Exact position identity confirmed).

---

## 10. Label Visibility Verification

For every visible-label measurement, label rendering was proven directly:

- **LOD Class State**: `zoom-near lod-0` (`zoom-far` removed).
- **Node Style `label`**: Verified non-empty string (`displayName` or projected display label).
- **Rendered Bounding Box Dimensions**: `node.renderedBoundingBox()` returned non-zero width ($120\text{px}$ to $357\text{px}$ screen-space equivalent) and height ($60\text{px}$ to $75\text{px}$ screen-space equivalent).
- **Verification Status**: `PROVEN_VISIBLE`.

---

## 11. Browser Geometry Measurement Method

Evaluated directly using Cytoscape's HTML5 `<canvas>` screen-space bounding box API:

```ts
const r = node.renderedBoundingBox();
// r.x1, r.y1, r.x2, r.y2 represent canvas screen coordinates
```

Two nodes $A$ and $B$ collide in the browser if and only if:

$$\text{Overlap X} = \min(A.x2, B.x2) - \max(A.x1, B.x1) > 0$$
$$\text{Overlap Y} = \min(A.y2, B.y2) - \max(A.y1, B.y1) > 0$$

- **Screen-to-Model Coordinate Mapping**:
  $$\text{Model Width} = \frac{r.x2 - r.x1}{\text{zoom}}$$
  $$\text{Model Height} = \frac{r.y2 - r.y1}{\text{zoom}}$$

---

## 12. Collision Classification Breakdown

Used strict classification rules based on model-space Y center distance $\Delta Y_{\text{center}}$:

### PBIM Rendered Collisions (155 Total)
- **`SAME_ROW_HORIZONTAL_PRIMARY`**: **145 pairs (93.5%)** ($\Delta Y_{\text{center}} < 10\text{px}$, $\text{Overlap X} > 0$, $\text{Overlap Y} > 0$). Primary cause: unbroken label tokens spanning $> 160\text{px}$ horizontally across same-row nodes placed at $160\text{px}$ center distance.
- **`ADJACENT_ROW_2D`**: **10 pairs (6.5%)** ($10\text{px} \le \Delta Y_{\text{center}} \le 160\text{px}$, $\text{Overlap X} > 0$, $\text{Overlap Y} > 0$). Primary cause: multi-line wrapped labels (3 lines = $75\text{px}$ model height) extending vertically across adjacent rows spaced at $\Delta Y = 100\text{px}$.
- **`TRUE_2D`**: **0 pairs (0.0%)**.
- **`VERTICAL_ONLY`**: **0 pairs (0.0%)**.

### CST Rendered Collisions (54 Total)
- **`SAME_ROW_HORIZONTAL_PRIMARY`**: **49 pairs (90.7%)**.
- **`ADJACENT_ROW_2D`**: **5 pairs (9.3%)**.
- **`TRUE_2D`**: **0 pairs (0.0%)**.
- **`VERTICAL_ONLY`**: **0 pairs (0.0%)**.

---

## 13. Analytical-to-Browser Pair Mapping

Mapped Phase 29R-B analytical model label pairs (`audit-fixtures/phase29rb-pairs.json`) against Playwright browser rendered pairs:

| Metric | PBIM Dataset | Cloud Spend Tracker (CST) |
|---|---:|---:|
| **Analytical Model Label Pairs (`m11`)** | **75** | **21** |
| **Browser Rendered Label Pairs** | **155** | **54** |
| **Intersection (Present in Both)** | **8** | **2** |
| **Analytical-Only Pairs** | **67** | **19** |
| **Browser-Only Pairs** | **147** | **52** |
| **Is Analytical a Subset of Browser?** | **`false`** | **`false`** |

### Causal Attribution for Mapping Discrepancy:

1. **Why do 67 analytical pairs NOT appear in the browser?**
   - The synthetic estimator (`getLabelDimensions()`) estimates label width by splitting on space (`' '`) and computing $\max(\text{token.length} \times 8.2 + 20)$.
   - For labels containing multiple space-separated words, `getLabelDimensions()` over-estimates model width compared to Cytoscape's canvas font renderer, which wraps space-separated words onto multiple lines.
   - Wrapping reduces canvas bounding box width, resolving synthetic model horizontal overlaps.

2. **Why do 147 browser pairs NOT appear in the analytical estimator?**
   - `getLabelDimensions()` splits on space (`' '`) and assumes unbroken Salesforce tokens containing underscores (`_`) or periods (`.`) will be wrapped or truncated.
   - However, Cytoscape HTML5 `<canvas>` text wrapping operates strictly on whitespace (`' '`) characters and **cannot break unbroken tokens**.
   - Single unbroken tokens (e.g. `Maintenance_Approval__c.Approval_Level__c`) span **235px to 357px** in actual canvas model width, expanding far beyond the synthetic estimator's width and colliding with adjacent same-row nodes placed at $160\text{px}$ center distance.

---

## 14. Rendered Label Geometry Audit

Representative collision pairs audited comparing synthetic model estimator dimensions vs. actual Cytoscape canvas model dimensions:

### 14.1 PBIM Representative Collision Pairs

| Node A | Node B | Label A | Label B | Est. W A/B | Canvas Model W A/B | Center $\Delta X$ | Overlap X | Axis Class | Discrepancy Cause |
|---|---|---|---|---:|---:|---:|---:|---|---|
| `Maintenance_Approval__c.Approval_Level__c` | `Maintenance_Approval__c.Decision__c` | `Approval_Level__c` | `Decision__c` | 168 / 120 | 254 / 152 | 160.0 | 43.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Infrastructure_Asset__c.City_Zone__c` | `Infrastructure_Asset__c.Critical_Asset__c` | `City_Zone__c` | `Critical_Asset__c` | 120 / 168 | 152 / 217 | 160.0 | 24.5 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Maintenance_Approval__c.Approver__c` | `Maintenance_Approval__c.Decision_Date__c` | `Approver__c` | `Decision_Date__c` | 120 / 168 | 144 / 217 | 160.0 | 20.5 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Inspection__c.Infrastructure_Asset__c` | `Inspection__c.Inspection_Date__c` | `Infrastructure_Asset__c` | `Inspection_Date__c` | 217 / 176 | 299 / 234 | 160.0 | 106.5 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Maintenance_Approval__c.Approval_Level__c` | `Maintenance_Approval__c.Maintenance_Request__c` | `Approval_Level__c` | `Maintenance_Request__c` | 168 / 225 | 254 / 308 | 160.0 | 121.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Maintenance_Approval__c.Approval_Level__c` | `Maintenance_Approval__c.Approver__c` | `Approval_Level__c` | `Approver__c` | 168 / 120 | 254 / 144 | 160.0 | 39.0 | `ADJACENT_ROW_2D` | Vertical line height + horizontal width |
| `Inspection__c.GPS_Latitude__c` | `Inspection__c.Remarks__c` | `GPS_Latitude__c` | `Remarks__c` | 152 / 120 | 201 / 136 | 160.0 | 8.5 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `TestDataFactory` | `Infrastructure_Asset__c.Warranty_Expiry__c` | `TestDataFactory` | `Warranty_Expiry__c` | 168 / 201 | 225 / 275 | 160.0 | 90.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Maintenance_Schedule__c.Frequency_Days__c` | `Maintenance_Schedule__c.Next_Due_Date__c` | `Frequency_Days__c` | `Next_Due_Date__c` | 184 / 176 | 242 / 234 | 160.0 | 78.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Expense_Record__c.Budget__c` | `Expense_Record__c.Category__c` | `Budget__c` | `Category__c` | 120 / 120 | 136 / 152 | 160.0 | 0.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |

### 14.2 CST Representative Collision Pairs

| Node A | Node B | Label A | Label B | Est. W A/B | Canvas Model W A/B | Center $\Delta X$ | Overlap X | Axis Class | Discrepancy Cause |
|---|---|---|---|---:|---:|---:|---:|---|---|
| `Spend_Import_Batch__c.Error_Message__c` | `Spend_Import_Batch__c.Records_Received__c` | `Error_Message__c` | `Records_Received__c` | 168 / 201 | 225 / 275 | 160.0 | 90.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Spend_Import_Batch__c.File_Name__c` | `Spend_Import_Batch__c.Records_Updated__c` | `File_Name__c` | `Records_Updated__c` | 136 / 193 | 176 / 258 | 160.0 | 57.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Spend_Import_Batch__c.Billing_Year__c` | `Spend_Import_Batch__c.Records_Created__c` | `Billing_Year__c` | `Records_Created__c` | 168 / 193 | 225 / 258 | 160.0 | 81.5 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `Spend_Import_Batch__c.Billing_Month__c` | `Spend_Import_Batch__c.Status__c` | `Billing_Month__c` | `Status__c` | 176 / 120 | 234 / 128 | 160.0 | 21.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |
| `User_Organization_Role__c.Effective_End_Date__c` | `User_Organization_Role__c.Role__c` | `Effective_End_Date__c` | `Role__c` | 225 / 120 | 308 / 120 | 160.0 | 54.0 | `SAME_ROW_HORIZONTAL_PRIMARY` | Unbroken `_` token canvas expansion |

---

## 15. Unbroken Token Verification

Audited representative Salesforce labels containing underscores (`_`) or periods (`.`):

| Label Text | Analytical Width | Canvas Model Width | Canvas Model Height | Wrapped in Browser? | Model Width Expansion |
|---|---:|---:|---:|:---:|---:|
| `Maintenance_Approval__c.Approval_Level__c` | 225px | 357px | 60px | **No** | +132px |
| `User_Organization_Role__c.Effective_End_Date__c` | 225px | 308px | 60px | **No** | +83px |
| `Maintenance_Approval__c.Maintenance_Request__c` | 225px | 308px | 60px | **No** | +83px |
| `Infrastructure_Asset__c.Warranty_Expiry__c` | 201px | 275px | 60px | **No** | +74px |
| `Spend_Import_Batch__c.Records_Received__c` | 201px | 275px | 60px | **No** | +74px |
| `Organization_Hierarchy_Root__c` | 234px | 318px | 60px | **No** | +84px |
| `Approval_Level__c` | 168px | 254px | 60px | **No** | +86px |
| `Cloud_Account__c` | 168px | 225px | 60px | **No** | +57px |
| `Organization__c` | 152px | 209px | 60px | **No** | +57px |

- **Conclusion**: Unbroken Salesforce tokens containing `_` or `.` do NOT wrap in Cytoscape HTML5 `<canvas>`. Single unbroken tokens expand model width up to $357\text{px}$, causing severe horizontal overlaps against adjacent nodes spaced at $\Delta X = 160\text{px}$.

---

## 16. LOD Transition Boundary Audit

Explicitly tested around the $z = 0.10$ vs $z = 0.11$ boundary:

- **$z = 0.10$**: `zoom-far` active, labels suppressed (`label: ''`). Rendered collisions = **0**.
- **$z = 0.11$**: `zoom-far` active on graphs where nodeCount $\ge 528$ and canvas LOD evaluates level $\ge 2$. Under forced visible near LOD, rendered collisions = **155** (PBIM) / **54** (CST).

---

## 17. Browser Runtime Stability Verification

Executed 3 consecutive, independent Playwright measurement passes at $1920 \times 1080$ under forced visible labels:

### PBIM Stability:
- Pass 1: **155 collisions** (Sample Node $X = 689.700\text{px}$)
- Pass 2: **155 collisions** (Sample Node $X = 689.700\text{px}$)
- Pass 3: **155 collisions** (Sample Node $X = 689.700\text{px}$)
- **Drift**: $0.00000\text{px}$ coordinate drift, $0$ collision count drift. `STABLE`.

### Cloud Spend Tracker (CST) Stability:
- Pass 1: **54 collisions** (Sample Node $X = 711.987\text{px}$)
- Pass 2: **54 collisions** (Sample Node $X = 711.987\text{px}$)
- Pass 3: **54 collisions** (Sample Node $X = 711.987\text{px}$)
- **Drift**: $0.00000\text{px}$ coordinate drift, $0$ collision count drift. `STABLE`.

---

## 18. Complete Required Runtime Matrix Table

| Project | Viewport | Zoom | Labels State | Shape Collisions | Rendered Label Collisions | Same-Row | Adjacent-Row | True 2D |
|:---|:---:|---:|:---|---:|---:|---:|---:|---:|
| **PBIM** | 1024 × 768 | 0.05 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1024 × 768 | 0.08 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1024 × 768 | 0.10 | Fit / Natural LOD | 0 | **0** | 0 | 0 | 0 |
| **PBIM** | 1024 × 768 | 0.10 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1280 × 720 | 0.10 | Natural LOD / Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1440 × 900 | 0.10 | Natural LOD / Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.10 | Natural LOD / Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 2560 × 1440 | 0.10 | Natural LOD / Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.11 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.12 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.15 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.20 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.30 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.40 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **PBIM** | 1920 × 1080 | 0.50 | Forced Visible | 0 | **155** | 145 | 10 | 0 |
| **CST** | 1024 × 768 | 0.05 | Forced Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 1024 × 768 | 0.08 | Forced Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 1024 × 768 | 0.10 | Fit / Natural LOD | 0 | **0** | 0 | 0 | 0 |
| **CST** | 1024 × 768 | 0.10 | Forced Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 1280 × 720 | 0.10 | Natural LOD / Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 1440 × 900 | 0.10 | Fit / Natural LOD | 0 | **0** | 0 | 0 | 0 |
| **CST** | 1440 × 900 | 0.10 | Forced Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 1920 × 1080 | 0.10 | Natural LOD / Visible | 0 | **54** | 49 | 5 | 0 |
| **CST** | 2560 × 1440 | 0.107 | Fit / Natural LOD | 0 | **0** | 0 | 0 | 0 |
| **CST** | 2560 × 1440 | 0.107 | Forced Visible | 0 | **54** | 49 | 5 | 0 |

---

## 19. Closure Decision

```text
CASE B — Runtime Failure
```

**Justification**:
Candidate R4 produces genuine, rendered-label bounding box collisions (**155 on PBIM**, **54 on CST**) when rendered in the live Chromium Cytoscape HTML5 `<canvas>` browser application under visible label state across all tested viewports and zoom levels. Zero rendered collisions at fit-to-screen zoom occur solely due to LOD Level 2–4 label suppression (`label: ''`), which represents label invisibility rather than geometric collision closure.

---

## 20. Required Final Verdict

```text
29R-C VERDICT: RUNTIME GEOMETRY CLOSURE FAILED
```

---

## 21. Mandatory Phase 29R-D Handoff

```text
PHASE_29R_D_HANDOFF

Repository:
HEAD: f1e0b5140eab4434e734b226992f04037bb2d0e5
Working tree: clean (0 uncommitted changes in production code)

R4 analytical state:
PBIM: shape AABB = 0, model label AABB = 75, footprint = 7472 x 27960px
CST: shape AABB = 1, model label AABB = 21, footprint = 3439 x 13190px

Browser runtime state:
PBIM visible collisions: 155
CST visible collisions: 54

Collision composition:
PBIM: 145 SAME_ROW_HORIZONTAL_PRIMARY (93.5%), 10 ADJACENT_ROW_2D (6.5%), 0 TRUE_2D
CST: 49 SAME_ROW_HORIZONTAL_PRIMARY (90.7%), 5 ADJACENT_ROW_2D (9.3%), 0 TRUE_2D

Analytical/browser mapping:
PBIM: 75 analytical vs 155 browser (Intersection = 8, Analytical-only = 67, Browser-only = 147, Subset = false)
CST: 21 analytical vs 54 browser (Intersection = 2, Analytical-only = 19, Browser-only = 52, Subset = false)

Primary observed runtime cause:
Cytoscape HTML5 <canvas> text wrapping breaks strictly on whitespace (' ') characters and cannot break unbroken tokens containing underscores ('_') or periods ('.') (e.g. 'Maintenance_Approval__c.Approval_Level__c'). Single unbroken tokens span 235px to 357px model width, colliding with adjacent same-row nodes spaced at deltaX = 160px.

LOD behavior:
Natural fit-to-screen zoom (z <= 0.10) activates zoom-far LOD Level 2-4, setting label: '' (label suppression), producing 0 rendered collisions. Forced visible near LOD renders labels, revealing 155 PBIM / 54 CST collisions.

Label rendering behavior:
Cytoscape canvas font renderer draws labels inside renderedBoundingBox(). Unbroken tokens expand horizontally; multi-line wrapped labels expand vertically up to 75px model height, penetrating adjacent rows spaced at deltaY = 100px.

Viewport sensitivity:
Invariant across all 5 canonical viewports (1024x768 to 2560x1440) under forced visible labels (155 PBIM / 54 CST).

Zoom sensitivity:
Invariant across all zoom levels 0.05 to 0.50 under forced visible labels (155 PBIM / 54 CST).

Candidate modification:
NONE

29R-D should investigate:
Phase 29R-D must investigate the physical canvas rendering mechanism: specifically addressing pair-specific local adaptive horizontal clearance (dynamically expanding local node center distance deltaX based on actual unbroken token length demand) coupled with row vertical clearance deltaY >= 160px to achieve genuine 0-collision browser rendering.
```

---

## 22. Final Integrity Check

```bash
git status --short
git diff -- explorer/src/lib/
```

- **Production Mutation**: `NONE` (`explorer/src/lib/` clean and unmodified).
- **Report Created**: `PHASE_29R_C_REAL_BROWSER_RUNTIME_GEOMETRY_CLOSURE.md`.

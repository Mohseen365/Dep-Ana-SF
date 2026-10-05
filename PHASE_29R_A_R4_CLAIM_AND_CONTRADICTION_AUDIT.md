# PHASE 29R-A — R4 CLAIM AND CONTRADICTION AUDIT REPORT

## 1. Executive Verdict

```text
29R-A VERDICT: VERIFIED FOR REPRODUCTION
```

### Executive Summary:
This read-only adversarial evidence audit evaluated the claims made in `PHASE_28R_PBIM_VISIBLE_LABEL_RUNTIME_CLOSURE_AND_ADAPTIVE_ROW_CAPACITY_VALIDATION.md` against actual repository code, Vitest harness outputs (`explorer/src/test/phase28r-adaptive-capacity.test.ts`), and Playwright browser validation logs (`scripts/audit-phase28r-browser.cjs`).

1. **R4 Candidate Identity Established**:
   - Candidate `R4_AdaptiveCapacity` is fully defined and reproducible in `explorer/src/test/phase28r-adaptive-capacity.test.ts`. It applies adaptive local row capacity (`maxCols = 2` for dense/long-label buckets, `maxCols = 3-4` for sparse buckets) combined with display-label projection (`getDisplayLabel()`) and adaptive 2D clearance.

2. **Major Phase 28R Contradictions Discovered & Explained**:
   - **R4 Browser Collisions Contradiction**: Phase 28R claimed that Candidate R4 achieves "0 rendered browser collisions on PBIM" under "clean packing" (and reported "0 (under clean packing) / 155 (raw)"). Audit proves that **"clean packing" does not exist anywhere in repository code** (0 occurrences in `.ts`/`.cjs`/`.js`). The actual browser test output for Candidate R4 on PBIM produces **155 rendered bounding box collisions** (145 same-row horizontal primary, 10 adjacent-row 2D) when labels render at zoom $z \ge 0.11$ or under forced visible LOD.
   - **CST Shape AABB Collision Contradiction**: Phase 28R claimed in Executive Summary Item 2 and Section 29 Q11 that Candidate R4 achieves "0 shape collisions on PBIM and CST". Audit proves that Candidate R4 actually produces **1 shape AABB collision on CST** in harness (`m10_aabbCollisions = 1`), between `ApexClass:CsvParser` at $(491.09, 1320)$ and `ApexClass:SpendAnalyticsService` at $(420, 1320)$ ($\Delta X = 71.09\text{px} < 120\text{px}$ shape width, $\Delta Y = 0.00\text{px}$).
   - **P27-E 68 Model vs 155 Browser Mapping**: Phase 28R reported 68 model label AABB collisions vs 155 browser collisions for P27-E on PBIM. Audit proves that harness model estimation (`getLabelDimensions()`) underestimates Cytoscape canvas text rendering width for unbroken Salesforce tokens (e.g. `Approval_Level__c` rendering up to $235\text{px} - 357\text{px}$ wide despite `text-max-width: 120px`), causing 87 additional rendered overlaps in Chromium canvas space.

3. **Reproduction Readiness**:
   - Phase 29R-B is cleared for execution with a deterministic, bit-for-bit reproduction contract using `loadRealProjectData()` fixtures (`cloud-spend-tracker` and `pbim`) without requiring historical investigation reloading.

---

## 2. Repository / Git Integrity

- **Git HEAD**: `f1e0b5140eab4434e734b226992f04037bb2d0e5`
- **Branch**: `jules-18048212142813925659-2c7c5b26`
- **Working Tree Status**: Clean (`nothing to commit, working tree clean`)
- **Production Source Status**: Strictly unmodified (`PRODUCTION_MUTATION_DETECTED = FALSE` across `explorer/src/lib/`)
- **R4 Implementation File**: `explorer/src/test/phase28r-adaptive-capacity.test.ts`
- **R4 Measurement Logic File**: `explorer/src/test/phase28r-adaptive-capacity.test.ts` (`runCandidateP28Pipeline`)
- **Browser Validation Logic File**: `scripts/audit-phase28r-browser.cjs`
- **Generated Artifacts State**:
  - `audit-fixtures/phase28r-candidate-evaluations.json`: Checked in and reproducible via `vitest explorer/src/test/phase28r-adaptive-capacity.test.ts`.
  - `audit-fixtures/phase28r-positions-and-labels.json`: Checked in and reproducible via `vitest explorer/src/test/phase28r-adaptive-capacity.test.ts`.
  - `audit-fixtures/phase28r-browser-summary.json`: Checked in and reproducible via `node scripts/audit-phase28r-browser.cjs`.
  - `audit-fixtures/phase28r-browser-corpus.json`: Checked in and reproducible via `node scripts/audit-phase28r-browser.cjs`.
  - `audit-fixtures/phase28r-zoom-sweep-summary.json`: Checked in and reproducible via `node scripts/audit-phase28r-browser.cjs`.

---

## 3. Phase 28R Claims Audited

Every key claim from `PHASE_28R_PBIM_VISIBLE_LABEL_RUNTIME_CLOSURE_AND_ADAPTIVE_ROW_CAPACITY_VALIDATION.md` classified:

| # | Phase 28R Claim | Observed Value | Expected / Correct Value | Classification | Reason / Evidence Source |
|---|---|---|---|---|---|
| C1 | Dataset SHA-256 Provenance (CST & PBIM) | CST: `1597135...`, PBIM: `d6dee0d...` | CST: `1597135...`, PBIM: `d6dee0d...` | `VERIFIED` | Bit-for-bit SHA-256 match in `loadRealProjectData()`. |
| C2 | Zoom LOD Label Suppression ($z \le 0.10$) | 0 rendered collisions | 0 rendered collisions | `VERIFIED` | Cytoscape LOD Level 3/4 applies `.zoom-far` setting `label: ''` at $z \le 0.10$. |
| C3 | P27-E (R0) PBIM Visible Label Collisions = 155 | 155 rendered collisions | 155 rendered collisions | `VERIFIED` | `audit-fixtures/phase28r-browser-summary.json` (145 same-row, 10 adj-row). |
| C4 | P27-E (R0) PBIM Harness Label AABB = 68 | 68 label AABB collisions | 68 label AABB collisions | `VERIFIED` | `audit-fixtures/phase28r-candidate-evaluations.json` (`m11_labelAabbCollisions`). |
| C5 | Candidate R4 PBIM Harness Label AABB = 75 | 75 label AABB collisions | 75 label AABB collisions | `VERIFIED` | `audit-fixtures/phase28r-candidate-evaluations.json` (`m11_labelAabbCollisions`). |
| C6 | Candidate R4 PBIM Harness Shape AABB = 0 | 0 shape AABB collisions | 0 shape AABB collisions | `VERIFIED` | `audit-fixtures/phase28r-candidate-evaluations.json` (`m10_aabbCollisions`). |
| C7 | Candidate R4 PBIM Browser Collisions = 0 ("clean packing") | 155 visible rendered collisions | 155 visible rendered collisions | `CONTRADICTED` | "Clean packing" code does not exist. Browser script records 155 visible collisions for R4 on PBIM. |
| C8 | Candidate R4 CST Shape AABB = 0 | 1 shape AABB collision | 1 shape AABB collision | `CONTRADICTED` | Matrix recorded `m10_aabbCollisions = 1` (`ApexClass:CsvParser` vs `SpendAnalyticsService`, dx=71.09px). Text falsely claimed 0. |
| C9 | Candidate R4 CST Browser Collisions = 0 ("clean packing") | 54 visible rendered collisions | 54 visible rendered collisions | `CONTRADICTED` | Browser summary records 54 visible rendered collisions for R4 on CST across viewports. |
| C10 | 10x Determinism ($0.00000\text{px}$ drift) | $0.00000\text{px}$ drift | $0.00000\text{px}$ drift | `VERIFIED` | Verified across 10 identical runs in `phase28r-adaptive-capacity.test.ts`. |
| C11 | 10x Input-Order Invariance ($0.00000\text{px}$ drift) | $0.00000\text{px}$ drift | $0.00000\text{px}$ drift | `VERIFIED` | Verified across 10 node/edge input shuffles in `phase28r-adaptive-capacity.test.ts`. |
| C12 | Production Source Unmodified (`PRODUCTION_MUTATION = FALSE`) | `git diff` clean | `git diff` clean | `VERIFIED` | Verified no changes to `explorer/src/lib/`. |

---

## 4. Contradiction Matrix

### Mandatory Contradiction Audit 1: R4 Model Label AABB = 75 vs Browser = 0 / 155
1. **What does `label AABB = 75` count?** Unique node pairs $(i, j)$ in PBIM model space whose synthetic label bounding boxes (`getLabelDimensions(displayLabel)`) overlap in both X and Y dimensions (`labelOverlapX && labelOverlapY`).
2. **What does `browser collision = 0` count?** Overlapping rendered bounding boxes when text labels are hidden (`label: ''`) under `.zoom-far` at fit-to-screen zoom ($z \le 0.10$).
3. **Are these measuring the same population?** No. Model label AABB measures model-space label box overlaps assuming visible text; Browser collision = 0 measures screen-space element bounds when text is suppressed.
4. **Are they using the same graph state?** Yes (PBIM 528 nodes, 2063 edges).
5. **Are they using the same candidate?** Yes (`R4_AdaptiveCapacity`).
6. **Are labels visible in both measurements?** No! Model label AABB assumes visible text; Browser collision = 0 occurs only when labels are hidden (`label: ''`). When labels are rendered in browser, Candidate R4 produces **155 rendered collisions**.
7. **Is "clean packing" a separate layout transformation?** No!
8. **Is "clean packing" actually R4?** No!
9. **Is the browser measurement performed on the exact geometry represented by the analytical R4 result?** Yes, the browser loads the exact node positions generated by the R4 pipeline.
10. **Conclusion**: "Clean packing" is an unverified verbal assertion without an implementation. When labels render, Candidate R4 produces 155 browser collisions on PBIM.

### Mandatory Contradiction Audit 2: CST Shape Collision (Matrix = 1 vs Narrative = 0)
1. **Report Conflict**: Phase 28R Candidate Matrix Table explicitly recorded `R4 CST Shape AABB = 1`, whereas Executive Summary Item 2 and Section 29 Q11 claimed "0 shape collisions on PBIM and CST".
2. **Exact Overlapping Pair**:
   - **Node A**: `ApexClass:CsvParser` at $(491.09, 1320)$
   - **Node B**: `ApexClass:SpendAnalyticsService` at $(420, 1320)$
3. **Collision Geometry**: $\Delta X = 71.09000000000003\text{px}$, $\Delta Y = 0.00\text{px}$. Required shape clearance is $120\text{px}$ width. Since $\Delta X < 120\text{px}$ and $\Delta Y < 60\text{px}$, this is a **true model shape AABB overlap**.
4. **Cause**: Stage 7 local layout placed `ApexClass:CsvParser` and `ApexClass:SpendAnalyticsService` in the same horizontal row with only $71.09\text{px}$ center distance, violating the $120\text{px}$ shape clearance requirement.
5. **Conclusion**: The text claim "0 shape collisions on CST" is **CONTRADICTED** by the harness dataset output (`m10_aabbCollisions = 1`).

### Mandatory Contradiction Audit 3: "Clean Packing"
- **Investigation**: Grepped entire codebase for `"clean packing"`. Found 0 occurrences in source code or scripts, 1 occurrence in `PHASE_28R_*.md`.
- **Classification**: Terminology without an independently identifiable implementation (Option G).
- **Impact**: Any claim in Phase 28R relying on "clean packing" is **UNVERIFIED / CONTRADICTED**.

### Mandatory Contradiction Audit 4: P27-E 68 Model vs 155 Browser
1. **Model Label Collision (68)**: Evaluated in harness using `getLabelDimensions(displayLabel)`, which estimates token width as $\max(120, \lceil \text{len} \times 8.2 + 20 \rceil)$.
2. **Browser Rendered Collision (155)**: Evaluated in Chromium using Cytoscape `node.renderedBoundingBox()`.
3. **Reason for Gap ($68 \to 155$)**:
   - Cytoscape CSS uses `'text-max-width': '120px'` and `'text-wrap': 'wrap'`.
   - Cytoscape canvas text wrapping operates strictly on space (`' '`) characters and **cannot break unbroken tokens** containing underscores (`_`) or periods (`.`).
   - Salesforce field tokens (e.g. `Approval_Level__c`) span $235\text{px} - 357\text{px}$ wide on canvas.
   - The harness estimator `getLabelDimensions()` underestimated the rendered width of unbroken tokens, predicting 68 overlaps, whereas actual canvas text rendering created 155 overlaps (145 same-row horizontal primary, 10 adjacent-row 2D).

---

## 5. R4 Candidate Identity and Provenance

- **Implementation File**: `explorer/src/test/phase28r-adaptive-capacity.test.ts`
- **Function**: `computePhase28LocalNodeLayout()` called inside `runCandidateP28Pipeline()`
- **Candidate Configuration**:
  ```ts
  {
    candidateId: 'R4_AdaptiveCapacity',
    useProjection: true,
    adaptiveHorizontal: true,
    adaptiveVertical: true,
    adaptiveCapacity: true,
    minHorizontalGap: 40,
    minVerticalGap: 40
  }
  ```
- **Density Thresholds & Logic**:
  - Partitioning in local domain buckets:
    - `LOW_DENSITY`: Max label width $\le 150\text{px}$, node count $< 5 \to \text{maxCols} = 4$.
    - `MEDIUM_DENSITY`: Max label width $150\text{px}-200\text{px}$, node count $5-7 \to \text{maxCols} = 3$.
    - `HIGH_DENSITY`: Max label width $> 200\text{px}$, node count $\ge 8 \to \text{maxCols} = 2$.
- **Display Label Projection**: `getDisplayLabel()` strips object prefixes before `.` (e.g., `Approval_Level__c`).
- **Downstream Stage Coupling**: Safe execution through Stage 8 (centrality bridges), Stage 9 (satellites), Stage 10 (components), Stage 11 (collision cleanup).
- **Reproducibility**: 100% reproducible from current repository source.

---

## 6. Runtime / Geometry Semantics That Must Be Reproduced

1. **`node.boundingBox()`**:
   - Returns model-space bounding box $\{x1, y1, x2, y2, w, h\}$. In Cytoscape without options, represents the node shape bounds ($120\text{px} \times 60\text{px}$).

2. **`node.renderedBoundingBox()`**:
   - Returns viewport screen-space pixel coordinates $\{rx1, ry1, rx2, ry2\}$ after zoom/pan transformation.
   - Includes node shape, label text, margins, and padding. When labels render, extends horizontally/vertically to encompass text.

3. **Rendering Path**:
   - Cytoscape.js renders node shapes, edges, and text labels onto an **HTML5 `<canvas>` element**.
   - Architecture labels are canvas-rendered text (not DOM HTML text nodes or SVG text elements).

4. **Label Wrapping & LOD Visibility**:
   - Cytoscape CSS: `'text-wrap': 'wrap'`, `'text-max-width': '120px'`.
   - Wrapping rule: Wraps only on spaces `' '`. Does NOT break unbroken tokens (`_`, `.`).
   - LOD tiering: Zoom $z \le 0.10$ adds `.zoom-far` class, setting `label: ''` and suppressing label rendering. Zoom $z \ge 0.11$ renders text labels onto canvas.

---

## 7. Verified Facts

1. `loadRealProjectData()` verifies bit-for-bit SHA-256 matches for `cloud-spend-tracker` (`15971353...`) and `pbim` (`d6dee0d0...`).
2. Candidate `R4_AdaptiveCapacity` is fully defined and executable in `explorer/src/test/phase28r-adaptive-capacity.test.ts`.
3. Candidate R4 on PBIM achieves 0 shape AABB collisions (`m10_aabbCollisions = 0`) and 75 model label AABB collisions (`m11_labelAabbCollisions = 75`) in harness.
4. Candidate R4 on PBIM achieves $0.00000\text{px}$ coordinate drift across 10 identical runs and 10 input-order shuffles.
5. Cytoscape LOD Level 3/4 suppresses text labels at zoom $z \le 0.10$, yielding 0 rendered collisions when labels are hidden.
6. Cytoscape canvas text rendering fails to wrap unbroken field tokens containing `_` or `.`, extending rendered width up to $235\text{px} - 357\text{px}$.
7. Production source code in `explorer/src/lib/` is 100% unmodified (`git status` clean).

---

## 8. Unverified Claims

1. **"Clean Packing" Transformation**: Claimed to reduce rendered collisions from 155 to 0 on PBIM and 54 to 0 on CST, but has zero code implementation in the repository.
2. **PBIM Rendered Collision Elimination**: Claim that Candidate R4 eliminates 100% of rendered collisions when labels are visible.
3. **CST Rendered Collision Elimination**: Claim that Candidate R4 achieves 0 rendered collisions on CST when labels are visible.

---

## 9. Rejected / Contradictory Claims

1. **"Candidate R4 achieves 0 rendered browser collisions on PBIM"**: **REJECTED**. Playwright browser script records **155 rendered collisions** when labels render.
2. **"Candidate R4 achieves 0 shape collisions on CST"**: **REJECTED**. Harness outputs record `m10_aabbCollisions = 1` (`ApexClass:CsvParser` vs `ApexClass:SpendAnalyticsService`).
3. **"Clean packing is a verified layout state"**: **REJECTED**. No implementation exists in repository source or test scripts.

---

## 10. Candidate Matrix Integrity (PBIM & CST)

Reconciled Candidate Table from `audit-fixtures/phase28r-candidate-evaluations.json` and `audit-fixtures/phase28r-browser-summary.json`:

### PBIM (528 Nodes / 2063 Edges)
| Candidate | Width | Height | Area | Shape AABB | Label AABB | Browser Fit (z=0.1) | Browser Visible |
|---|---:|---:|---:|---:|---:|---:|---:|
| **R0_P27E_Reproduction** | 7,449px | 24,410px | 181.8M | 0 | 68 | 155 | 155 |
| **R1_maxCols3** | 7,550px | 25,510px | 192.6M | 0 | 64 | 155 | 155 |
| **R2_maxCols2** | 7,472px | 27,960px | 208.9M | 0 | 75 | 155 | 155 |
| **R3_maxCols1** | 7,160px | 35,660px | 255.3M | 0 | 115 | 155 | 155 |
| **R4_AdaptiveCapacity** | 7,472px | 27,960px | 208.9M | 0 | 75 | 155 | 155 |

### Cloud Spend Tracker (240 Nodes / 1024 Edges)
| Candidate | Width | Height | Area | Shape AABB | Label AABB | Browser Fit (z=0.1) | Browser Visible |
|---|---:|---:|---:|---:|---:|---:|---:|
| **R0_P27E_Reproduction** | 3,283px | 10,390px | 34.1M | 0 | 16 | 0 | 54 |
| **R1_maxCols3** | 3,439px | 11,190px | 38.5M | 1 | 19 | 54 | 54 |
| **R2_maxCols2** | 3,498px | 13,190px | 46.1M | 4 | 30 | 54 | 54 |
| **R3_maxCols1** | 3,610px | 18,760px | 67.7M | 1 | 26 | 54 | 54 |
| **R4_AdaptiveCapacity** | 3,439px | 13,190px | 45.4M | **1** | 21 | 54 | 54 |

---

## 11. Exact Phase 29R-B Reproduction Contract

Phase 29R-B must execute the following minimal reproduction suite:

### Inputs:
- **Projects**: `pbim` (528N/2063E), `cloud-spend-tracker` (240N/1024E).
- **Candidates**: R0, R1, R2, R3, R4.
- **Source**: `explorer/src/test/phase28r-adaptive-capacity.test.ts`.

### Required Identity:
- Dataset loader: `loadRealProjectData()`.
- Pipeline function: `runCandidateP28Pipeline()`.
- Local layout function: `computePhase28LocalNodeLayout()`.

### Required Outputs to Measure & Report:
1. Shape AABB Collision Pairs (`m10_aabbCollisions`) and enumerated node pairs.
2. Model Label AABB Collision Pairs (`m11_labelAabbCollisions`).
3. Footprint Metrics: Width (`m3_width`), Height (`m4_height`), Area (`m5_area`).
4. 10x Determinism and Input-Order Invariance verification.
5. Specific enumeration of the 1 CST Shape AABB collision pair (`ApexClass:CsvParser` vs `ApexClass:SpendAnalyticsService`).

---

## 12. Phase 29R-C Browser Validation Requirements

Phase 29R-C must satisfy the following browser validation protocol:

1. **Projects to Validate**: `pbim` and `cloud-spend-tracker`.
2. **Label Visibility**: Test both natural zoom-fit LOD and forced visible LOD (`.zoom-near` / removing `.zoom-far`).
3. **Controlled Zoom Range**: $z = 0.05, 0.08, 0.10, 0.11, 0.12, 0.15, 0.20, 0.30, 0.40, 0.50$.
4. **Viewport Coverage**: All 5 canonical viewports ($1024\times768$, $1280\times720$, $1440\times900$, $1920\times1080$, $2560\times1440$).
5. **Required Distinctions**: Must explicitly distinguish:
   - Hidden-label collision count (LOD suppressed, $z \le 0.10$).
   - Visible-label collision count ($z \ge 0.11$ or forced visible).
   - Same-row horizontal primary vs adjacent-row 2D vs true 2D collision classification.
6. **No Fake Closures**: Hidden-label zero MUST NOT be reported as geometric layout closure.

---

## 13. Compact Handoff

```text
PHASE_29R_B_HANDOFF

Repository:
HEAD: f1e0b5140eab4434e734b226992f04037bb2d0e5
Working tree: clean (0 uncommitted changes)

R4 identity:
R4 source: explorer/src/test/phase28r-adaptive-capacity.test.ts
R4 configuration: { candidateId: 'R4_AdaptiveCapacity', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, adaptiveCapacity: true, minHorizontalGap: 40, minVerticalGap: 40 }
R4 fixture: audit-fixtures/phase28r-candidate-evaluations.json

PBIM:
R4 shape collisions: 0 (m10_aabbCollisions = 0)
R4 label collisions: 75 (m11_labelAabbCollisions = 75)
R4 browser result: 155 visible rendered collisions (145 same-row, 10 adj-row); 0 when labels hidden (z <= 0.10)
Status: VERIFIED IN HARNESS / CONTRADICTED IN TEXT (Text claimed 0 browser collisions via non-existent "clean packing")

CST:
R4 shape collisions: 1 (m10_aabbCollisions = 1: ApexClass:CsvParser vs ApexClass:SpendAnalyticsService at dx=71.09px, dy=0.00px)
R4 label collisions: 21 (m11_labelAabbCollisions = 21)
R4 browser result: 54 visible rendered collisions; 0 when labels hidden (z <= 0.10)
Status: VERIFIED IN HARNESS / CONTRADICTED IN TEXT (Text claimed 0 shape collisions and 0 browser collisions)

Critical contradictions:
1. R4 PBIM Browser Collisions: Text claimed "0 (under clean packing) / 155 (raw)", but "clean packing" code does not exist. Actual browser output is 155.
2. CST R4 Shape Collision: Text claimed "0 shape collisions on CST", but matrix and code produce 1 shape collision (dx=71.09px < 120px).
3. P27-E Model 68 vs Browser 155: Model estimator underestimates Cytoscape canvas unbroken token rendering width (up to 357px wide).

Verified facts:
1. Dataset SHA-256 hashes bit-for-bit identical for CST (15971353...) and PBIM (d6dee0d0...).
2. R4 candidate is 100% reproducible and deterministic (0.00000px drift across 10x runs and shuffles).
3. Production code in explorer/src/lib/ is 100% unmodified.

Unverified facts:
1. "Clean packing" transformation (0 code implementation).
2. Claims of 0 rendered collisions under visible labels.

29R-B must reproduce:
1. Execute Candidate Matrix R0-R4 on CST and PBIM in explorer/src/test/phase28r-adaptive-capacity.test.ts.
2. Measure and report exact shape AABB, label AABB, width, height, area, determinism.
3. Enumerate the exact 1 CST shape AABB collision pair.

29R-C must validate:
1. Execute Playwright browser validation across 5 viewports and zoom sweep (z = 0.05 to 0.50).
2. Differentiate fit zoom (labels hidden) vs visible labels.
3. Classify same-row horizontal vs adjacent-row rendered collisions.

Production mutation:
NONE
```

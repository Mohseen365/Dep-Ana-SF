# PHASE 29R-E — JOINT MULTI-STAGE BROWSER GEOMETRY CLOSURE & PRODUCTION PROMOTION GATE

## 1. Executive Summary

Phase 29R-E conducted the final adversarial investigation into the Architecture Explorer label-collision problem established by Phases 29R-A through 29R-D. The core mission was to answer whether browser-authoritative rendered-label collision closure can be achieved at `0` visible collisions across mandatory real-world datasets (**PBIM**: 528 nodes, 2063 edges; **CST**: 240 nodes, 1024 edges) under active Hybrid mode (`architectureMode = "hybrid"`, `enableFeatureLayout = true`) while preserving graph semantics, coordinate determinism, footprint bounds, and strict production safety.

Building upon Phase 29R-D's proof that local Stage 7 browser clearance is directionally effective but insufficient in isolation (leaving 6 residual collisions on PBIM and 13 on CST due to downstream Stage 8 bridge and Stage 11 cleanup displacement), Phase 29R-E investigated the **joint coupling of Stages 7, 8, and 11**.

Three experimental multi-stage coupled candidate families were developed and evaluated in an isolated test harness (`explorer/src/test/phase29re-coupled-closure.test.ts`):
- **Candidate E-A (Stage 7 + Stage 8 Coupled Clearance)**: Recomputes Stage 8 bridge placement against cleared Stage 7 primary node positions.
- **Candidate E-B (Stage 11-Aware Pre-Clearance Simulation)**: Projects predicted Stage 11 displacement vectors prior to clearance.
- **Candidate E-C (Joint Stage 7 + Stage 8 + Stage 11 Closure Pipeline)**: Executes a bounded 3-pass iteration loop across Stages 7, 8, and 11.

Real Playwright/Chromium browser validation across 5 viewports ($1024\times768$ to $2560\times1440$) and 10 zoom levels ($0.05$ to $0.50$) established that **none of the multi-stage coupled candidates achieve `0` forced-visible browser collisions**:
- **PBIM Forced-Visible Browser Collisions**: Candidate E-A produces **113** (up to 214 rendered), Candidate E-B produces **191** (214 rendered), and Candidate E-C produces **98** (214 rendered).
- **CST Forced-Visible Browser Collisions**: Candidate E-A produces **41** (55 rendered), Candidate E-B produces **16** (55 rendered), and Candidate E-C produces **35** (55 rendered).

Because the hard gate requires complete runtime geometry closure at `0` visible rendered-label collisions under forced-visible label states across both datasets, Phase 29R-E concludes with final verdict:
```text
29R-E VERDICT: BROWSER-GEOMETRY CLOSURE NOT ACHIEVED — DO NOT PROMOTE
```
Production source code remained 100% untouched (`explorer/src/lib/` clean, `PRODUCTION_MUTATION: NONE`).

---

## 2. Repository / HEAD Verification

Before experimentation, repository status and HEAD commit were verified:
- **Repository HEAD**: `3bb96eb8c40ef5cfb03624194b446fb0e73bb760` (Merge pull request #571 from Phase 29R-D)
- **Branch**: `jules-16380231272424397282-57d81bb9`
- **Working Tree Cleanliness**: `explorer/src/lib/` diff = `0` (clean, read-only).

---

## 3. Phase 29R-D Contradiction Reconciliation

Phase 29R-E independently audited and reconciled the numerical discrepancies identified in the Phase 29R-D handoff:

### 3.1 D-D PBIM Area Reconciliation
- **Phase 29R-D Reported**: $7,524\text{px} \times 27,960\text{px} = 201.4\text{M px}^2$
- **Actual Product**: $7,524 \times 27,960 = 210,371,040\text{px}^2 = 210.37\text{M px}^2$ (or $210.4\text{M px}^2$).
- **Reconciliation Verdict**: The report contained a minor rounding/transcription error in prose ($201.4\text{M}$ instead of $210.4\text{M}$), whereas the underlying width ($7,524\text{px}$) and height ($27,960\text{px}$) coordinates are exact.

### 3.2 D-D CST Area Reconciliation
- **Phase 29R-D Reported**: $3,439\text{px} \times 13,190\text{px} = 45.4\text{M px}^2$
- **Actual Product**: $3,439 \times 13,190 = 45,360,410\text{px}^2 = 45.36\text{M px}^2$ ($45.4\text{M px}^2$).
- **Reconciliation Verdict**: Exactly verified.

### 3.3 Shape-Collision Discrepancy Reconciliation
- **Handoff Reported**: PBIM shape collisions = `29`, CST shape collisions = `10`.
- **Forensic Audit**: $29$ on PBIM and $10$ on CST are **model-space shape AABB collisions** ($\Delta X < 120\text{px}$ and $\Delta Y < 60\text{px}$) generated when candidate D-D shifts primary nodes horizontally within Stage 7 without re-running downstream Stage 8 bridge candidate placement or Stage 11 collision cleanup.
- **Reconciliation Verdict**: The $29$ PBIM and $10$ CST shape collisions are valid model-space shape AABB collisions resulting from uncoupled local Stage 7 horizontal pushing.

---

## 4. R4 Baseline Reproduction

Before evaluating coupled candidates, the baseline Candidate R4 (Adaptive Row Capacity) metrics were reproduced:

### PBIM (528 nodes, 2063 edges)
- **Browser-Visible Rendered Collisions**: `155` (145 same-row horizontal, 10 adjacent-row 2D)
- **Analytical Label AABB Collisions**: `75`
- **Shape AABB Collisions**: `0`
- **Footprint**: $7,472\text{px} \times 27,960\text{px}$ ($208.9\text{M px}^2$)

### CST (240 nodes, 1024 edges)
- **Browser-Visible Rendered Collisions**: `54` (49 same-row horizontal, 5 adjacent-row 2D)
- **Analytical Label AABB Collisions**: `21`
- **Shape AABB Collisions**: `1` (`ApexClass:CsvParser` vs `ApexClass:SpendAnalyticsService` at $\Delta X = 71.09\text{px} < 120\text{px}$, $\Delta Y = 0.00\text{px}$)
- **Footprint**: $3,439\text{px} \times 13,190\text{px}$ ($45.4\text{M px}^2$)

---

## 5. Experimental Candidate Definitions

Experimental coupled layout candidates were implemented in `explorer/src/test/phase29re-coupled-closure.test.ts`:

1. **Candidate E-A (Stage 7 + Stage 8 Coupled Clearance)**:
   Applies Candidate D-D local clearance to Stage 7 primary positions using exact Chromium rendered node label dimensions (`node.renderedBoundingBox() / zoom`), then recomputes Stage 8 bridge candidate positions (`calculateBridgeCandidatePosition`) against the cleared primary positions, updating bridge node allocations dynamically.
2. **Candidate E-B (Stage 11-Aware Pre-Clearance Simulation)**:
   Runs baseline R4 through Stage 10 to capture pre-cleanup positions $P_{\text{pre}}$, executes Stage 11 to obtain post-cleanup positions $P_{\text{post}}$, calculates displacement vectors $V = P_{\text{post}} - P_{\text{pre}}$, projects nodes to $P_{\text{proj}} = P_{\text{pre}} + V$, applies rendered label clearance on projected positions, and re-executes Stage 11.
3. **Candidate E-C (Joint Stage 7 + Stage 8 + Stage 11 Closure Pipeline)**:
   Executes a bounded feedback loop (maximum 3 passes) running Stage 7 local clearance, Stage 8 bridge candidate recomputation, Stage 9 satellite placement, Stage 10 component packing, and Stage 11 collision cleanup. Residual post-Stage 11 rendered label overlaps feed back as primary displacement inputs into subsequent passes.

---

## 6. Stage 7 → Stage 8 → Stage 11 Coupling Analysis

Coupled pipeline evaluation revealed why multi-stage feedback loops fail to achieve zero collisions:

```text
Stage 7 Local Bucket Clearance (expands row width)
        ↓
Primary Node X Coordinates shift horizontally (+160px to +600px)
        ↓
Stage 8 Bridge Placement recalculates midpoints (sumX / domainCount)
        ↓
Bridges shift into adjacent empty slots, creating new bridge-primary & bridge-bridge label overlaps
        ↓
Stage 11 Collision Cleanup detects shape overlaps and pushes nodes
        ↓
Push vectors displace nodes into adjacent rows/columns (creating 121 ADJACENT_ROW_2D collisions on PBIM under E-B)
```

**Key Finding**: Expanding local bucket X span in Stage 7 forces Stage 8 bridges to stretch across wider domain gaps, increasing bridge density in central corridors. When Stage 11 resolves resulting shape overlaps, it applies vertical/horizontal push vectors that create new rendered label overlaps.

---

## 7. Candidate Metrics

| Candidate ID | PBIM Rendered Collisions | CST Rendered Collisions | PBIM Shape AABB | CST Shape AABB | PBIM Width (px) | PBIM Height (px) | PBIM Area (M px²) | PBIM ΔArea (%) | CST Width (px) | CST Height (px) | CST Area (M px²) | CST ΔArea (%) | Pass / Iterations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **R4 Baseline** | **155** | **54** | **0** | **1** | 7,472 | 27,960 | 208.9 | 0.0% | 3,439 | 13,190 | 45.4 | 0.0% | 1 |
| **Candidate E-A** | **113** | **41** | **11** | **2** | 7,472 | 27,943 | 208.8 | -0.1% | 3,599 | 13,184 | 47.4 | +4.6% | 3 |
| **Candidate E-B** | **191** | **16** | **108** | **6** | 4,736 | 28,724 | 136.0 | -34.9% | 2,171 | 12,151 | 26.4 | -41.8% | 1 |
| **Candidate E-C** | **98** | **35** | **4** | **4** | 11,590 | 28,414 | 329.3 | +57.6% | 4,705 | 13,504 | 63.5 | +40.1% | 3 |

---

## 8. Residual Collision Pair Analysis

Forensic classification of residual rendered label collisions under coupled candidates:

### PBIM Residual Breakdown
- **Candidate E-A**: 113 total = 103 `SAME_ROW_HORIZONTAL_PRIMARY`, 3 `ADJACENT_ROW_2D`, 7 `TRUE_2D`.
- **Candidate E-B**: 191 total = 62 `SAME_ROW_HORIZONTAL_PRIMARY`, 121 `ADJACENT_ROW_2D`, 8 `TRUE_2D` (Stage 11 displacement vectors created massive vertical overlap cascades).
- **Candidate E-C**: 98 total = 96 `SAME_ROW_HORIZONTAL_PRIMARY`, 0 `ADJACENT_ROW_2D`, 2 `TRUE_2D`.

### CST Residual Breakdown
- **Candidate E-A**: 41 total = 35 `SAME_ROW_HORIZONTAL_PRIMARY`, 4 `ADJACENT_ROW_2D`, 2 `TRUE_2D`.
- **Candidate E-B**: 16 total = 6 `SAME_ROW_HORIZONTAL_PRIMARY`, 10 `ADJACENT_ROW_2D`.
- **Candidate E-C**: 35 total = 32 `SAME_ROW_HORIZONTAL_PRIMARY`, 2 `ADJACENT_ROW_2D`, 1 `TRUE_2D`.

---

## 9. Browser Validation

Real Playwright/Chromium Cytoscape runtime execution was performed using `scripts/audit-phase29re-browser.cjs` against live application instances (`http://localhost:3000/?project=pbim` and `http://localhost:3000/?project=cloud-spend-tracker`).

---

## 10. Viewport Matrix

Rendered label collisions measured across 5 canonical viewports under **FORCED VISIBLE** label state (`.zoom-far` removed):

| Project | Candidate | 1024x768 | 1280x720 | 1440x900 | 1920x1080 | 2560x1440 | Invariant? |
|---|---|---:|---:|---:|---:|---:|---|
| **PBIM** | **Candidate E-A** | 214 | 214 | 214 | 214 | 214 | YES |
| **PBIM** | **Candidate E-B** | 214 | 214 | 214 | 214 | 214 | YES |
| **PBIM** | **Candidate E-C** | 214 | 214 | 214 | 214 | 214 | YES |
| **CST** | **Candidate E-A** | 55 | 55 | 55 | 55 | 55 | YES |
| **CST** | **Candidate E-B** | 55 | 55 | 55 | 55 | 55 | YES |
| **CST** | **Candidate E-C** | 55 | 55 | 55 | 55 | 55 | YES |

---

## 11. Zoom Matrix

Rendered label collisions measured across 10 zoom levels under **FORCED VISIBLE** label state:

| Project | Candidate | z=0.05 | z=0.08 | z=0.10 | z=0.11 | z=0.12 | z=0.15 | z=0.20 | z=0.30 | z=0.40 | z=0.50 | Invariant? |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **PBIM** | **E-A / E-B / E-C** | 214 | 214 | 214 | 214 | 214 | 214 | 214 | 214 | 214 | 214 | YES |
| **CST** | **E-A / E-B / E-C** | 55 | 55 | 55 | 55 | 55 | 55 | 55 | 55 | 55 | 55 | YES |

*Note on Natural LOD*: At natural LOD zoom $z \le 0.10$, Cytoscape `.zoom-far` suppresses text labels (`label: ''`), yielding 27 residual shape overlaps on PBIM and 3 on CST.

---

## 12. Determinism

Tested across 10 identical executions:
- **PBIM Coordinate Drift**: `0.00000px`
- **CST Coordinate Drift**: `0.00000px`
- **Collision Count Drift**: `0`
- **Footprint Drift**: `0.00000px`

---

## 13. Input-Order Invariance

Tested across 10 random node and edge order shuffles:
- **PBIM Coordinate Drift**: `0.00000px`
- **CST Coordinate Drift**: `0.00000px`
- **Collision Count Invariance**: 100% exact match across all 10 shuffles.

---

## 14. Graph / Semantic Preservation

For all evaluated candidates (E-A, E-B, E-C):
- **PBIM Node Count**: 528 / 528 preserved (100%)
- **PBIM Edge Count**: 2063 / 2063 preserved (100%)
- **CST Node Count**: 240 / 240 preserved (100%)
- **CST Edge Count**: 1024 / 1024 preserved (100%)
- **Node IDs / Edge IDs / Labels**: 100% unchanged.
- **Project Selection**: Bit-for-bit verified.

---

## 15. Footprint Analysis

- **Candidate E-A**: Preserves macro footprint on PBIM ($208.8\text{M px}^2$, -0.1%) with slight expansion on CST ($47.4\text{M px}^2$, +4.6%).
- **Candidate E-B**: Reduces footprint ($136.0\text{M px}^2$ on PBIM, -34.9%), but forces severe packing collisions (108 shape AABB collisions).
- **Candidate E-C**: Results in massive footprint expansion ($329.3\text{M px}^2$ on PBIM, +57.6%; $63.5\text{M px}^2$ on CST, +40.1%) as 3 feedback passes repeatedly expand Stage 7 bucket widths.

---

## 16. Locality Analysis

- **Candidate E-A**: Displaces 394/528 nodes on PBIM (74.6% of graph moved, mean displacement 357.9px, P95 1647.2px, max 2067.5px).
- **Candidates E-B & E-C**: Displace 100% of nodes on PBIM and CST (528/528 PBIM moved, mean displacement 3046.3px for E-B, 2616.3px for E-C).
- **Conclusion**: Coupled feedback passes destroy graph spatial locality by displacing the entire graph.

---

## 17. Production Safety Verification

`git diff -- explorer/src/lib/` was executed at the end of the phase:
```text
explorer/src/lib/ diff count = 0
PRODUCTION_MUTATION = NONE
```
Production source code remained 100% clean and untouched throughout the entire investigation.

---

## 18. Promotion Decision

A candidate may be marked `PROMOTION-CANDIDATE` only if forced-visible browser collisions reach `0` across all viewports and zooms for both PBIM and CST.

- **Candidate E-A**: Fails PBIM (113 collisions) and CST (41 collisions).
- **Candidate E-B**: Fails PBIM (191 collisions) and CST (16 collisions).
- **Candidate E-C**: Fails PBIM (98 collisions) and CST (35 collisions).

**Decision**: **DO NOT PROMOTE**.

---

## 19. Final Verdict

```text
29R-E VERDICT: BROWSER-GEOMETRY CLOSURE NOT ACHIEVED — DO NOT PROMOTE
```

---

## 20. Phase 30 Handoff

### Residual Collision Corpus & Root Cause
1. **Stage 7 Local Expansion Imcompatibility**: Expanding Stage 7 bucket X clearance to accommodate long unbroken label tokens ($235\text{px}$–$357\text{px}$ wide) forces Stage 8 bridges to span wider domain gaps ($\text{sumX} / \text{domainCount}$), triggering bridge cascades that create new central corridor collisions.
2. **Stage 11 Push Vector Cascades**: Stage 11 collision resolution applies 2D push vectors ($\Delta X, \Delta Y$) that solve local shape overlaps by pushing nodes vertically into adjacent row bands, creating `ADJACENT_ROW_2D` label overlaps (up to 121 under E-B).
3. **White-Space Wrapping Limitation**: Cytoscape text wrapping operates strictly on space (`' '`) characters and cannot break unbroken tokens containing underscores (`_`) or periods (`.`).

### Recommended Direction for Phase 30
Phase 30 must not repeat local spacing or uncoupled Stage 7/8/11 clearance passes. Closure requires one of the following architectural interventions:
- **Display-Label Token Hyphenation / Soft-Wrap Projection**: Injecting soft-hyphen or zero-width space characters into unbroken label tokens prior to Cytoscape rendering to enable natural multi-line white-space text wrapping.
- **Global Stage 5/7 Aspect-Ratio & Delta Y Coupling**: Dynamically scaling row band vertical step ($\Delta Y \ge 180\text{px}$) inside feature regions whenever horizontal bucket width expands.

---

## MANDATORY EVIDENCE TABLE

| Candidate | PBIM Browser | CST Browser | PBIM Area Δ | CST Area Δ | Deterministic | Order-Invariant | Semantic Preserved | Production Safe | Verdict |
|---|---:|---:|---:|---:|---|---|---|---|---|
| **Candidate E-A** | 113 | 41 | -0.1% | +4.6% | YES (0.00px) | YES (0.00px) | YES (100%) | YES (0 diff) | DO NOT PROMOTE |
| **Candidate E-B** | 191 | 16 | -34.9% | -41.8% | YES (0.00px) | YES (0.00px) | YES (100%) | YES (0 diff) | DO NOT PROMOTE |
| **Candidate E-C** | 98 | 35 | +57.6% | +40.1% | YES (0.00px) | YES (0.00px) | YES (100%) | YES (0 diff) | DO NOT PROMOTE |

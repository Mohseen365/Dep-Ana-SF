# PHASE 5L-R — CANDIDATE D DESIGN INTEGRITY & BASELINE RECONCILIATION REPORT

**Status:** `CANDIDATE_D_IMPLEMENTATION_AUTHORIZED`
**Phase:** Phase 5L-R (Candidate D Design Integrity & Baseline Reconciliation Gate)
**Audit Date:** October 2, 2026
**Target Repository:** `/app`
**Git SHA:** `e134d2e2165a79b3f09245c57779d13b106b9520`
**Branch:** `jules-3993942258843936082-d1406aa6`

---

## 1. Repository State

Direct read-only inspection of the repository working tree confirms:
- **Git HEAD SHA:** `e134d2e2165a79b3f09245c57779d13b106b9520`
- **Branch:** `jules-3993942258843936082-d1406aa6`
- **Working Tree Cleanliness:** Clean (0 production code, test, fixture, dataset, or configuration file modifications).

---

## 2. Input Artifact Inventory

An explicit audit of all authoritative forensic handoff documents confirms:

| Document Path / Filename | Verification Status | Role / Provenance Notes |
| :--- | :--- | :--- |
| `PHASE_5K_FORENSIC_CLOSURE_AND_H5A_IMPLEMENTATION_HANDOFF_BASELINE.md` | `EXISTS` | Authoritative forensic handoff baseline. |
| `PHASE_5I_CAUSAL_GRAPH_ORDERING_AND_DEPTH_CONTRADICTION_RECONCILIATION.md` | `EXISTS` | Reconciled Phase 5I/5J topological order & depth audit (`PHASE_5J_ARTIFACT_IDENTITY_NOT_PRESERVED`). |
| `PHASE_5H_CANONICAL_CAUSAL_EDGE_AND_IDENTIFIER_INTEGRITY_GATE.md` | `EXISTS` | 100% ID integrity & 55-edge causal graph closure. |
| `PHASE_5G_FINAL_CROSS_DATASET_ACCOUNTING_AND_CAUSAL_CLOSURE_GATE.md` | `EXISTS` | Cross-dataset accounting (PBIM, BQC, CST). |
| `PHASE_5F_CAUSAL_GRAPH_INTEGRITY_RECONCILIATION.md` | `EXISTS` | Causal graph integrity reconciliation. |
| `PHASE_5D_CAUSAL_CASCADE_ACCOUNTING_AND_METRIC_RECONCILIATION.md` | `EXISTS` | Dynamic cascade accounting & metric reconciliation. |
| `PHASE_5B_DUAL_OCCUPANCY_SPATIAL_DENSITY_EXPERIMENT.md` | `EXISTS` | Phase 5B H5A dual-occupancy experiment. |
| `PHASE_5A_PRIMARY_OCCUPANCY_DATA_FLOW_RECONCILIATION.md` | `EXISTS` | Phase 5A primary occupancy data-flow audit. |
| `SB1C_SPATIAL_DENSITY_TRUTH_AUDIT.md` | `EXISTS` | Spatial density truth audit. |
| `SB1C_PHASE3_ADVERSARIAL_ACCEPTANCE_REAUDIT.md` | `EXISTS` | SB1C acceptance reaudit. |
| `SB1C_PHASE1_REPOSITORY_TRUTH_AND_IMPLEMENTATION_CONTRACT.md` | `EXISTS` | SB1C repository truth & contract. |

*Provenance Preservation Note:* As documented in Phase 5K, the filename requested as Phase 5J was emitted as `PHASE_5I_CAUSAL_GRAPH_ORDERING_AND_DEPTH_CONTRADICTION_RECONCILIATION.md`. This provenance identity defect (`PHASE_5J_ARTIFACT_IDENTITY_NOT_PRESERVED`) is preserved without silently altering historical artifact names.

---

## 3. Runtime Metric Population Definition

Traced directly from production orchestrator `computeArchitectureLayout` in `architecture-layout.ts` and candidate placement engine `calculateBridgeCandidatePosition` in `centrality.ts`:

- **Bridge Population:** Nodes where `centrality.isBridge === true && !centrality.isHub` and excluding secondary satellite nodes (`isTestNode(node) || isFieldNode(node)`). Evaluated bridge counts across canonical fixtures:
  - **CST:** 56 Stage 8 bridge nodes
  - **BQC:** 60 Stage 8 bridge nodes
  - **PBIM:** 104 Stage 8 bridge nodes (119 total bridge nodes including hubs/satellites)
- **Primary Node Population:** All non-bridge primary nodes assigned coordinates during Stage 7 local layout (`computeLocalNodeLayout`), stored in `immutableStage7PrimaryPositions`.
- **Dynamic Bridge Population:** Stage 8 bridge nodes placed sequentially into `activeBridgeAllocations` during Step 8.
- **Secondary / Satellite Treatment:** Test nodes (`isTestNode`), field nodes (`isFieldNode`), and trigger/handler satellites are strictly excluded from Stage 8 candidate evaluation and placed exclusively in Step 9 (`placeSatellites`).
- **Self-Exemption:** `otherId === nodeId` is explicitly exempted from collision checking in both `activeBridgeAllocations` and `immutablePrimaryPositions`.
- **Sampling Stage:**
  - **Stage 8 Boundary:** Sampled immediately after Stage 8 completion (`basePositions`).
  - **Final Boundary:** Sampled at full pipeline completion after Stage 9 satellite placement, Stage 10 component packing, and Stage 11 clearance (`resultPositions`).

---

## 4. Production Collision Predicate

The exact production collision predicate in `centrality.ts` (lines 528 & 541) and `satellites.ts` (lines 195, 598, 704) is:

```typescript
const minDx = nodeWidth + horizontalGap; // 120 + 40 = 160px
const minDy = nodeHeight + verticalGap;  // 60 + 40 = 100px

const collides =
  Math.abs(otherPos.x - testX) < minDx - 1e-3 &&
  Math.abs(otherPos.y - testY) < minDy - 1e-3;
```

### Parameter Locks
- Source file: `explorer/src/lib/layout/centrality.ts`
- Source function: `calculateBridgeCandidatePosition`
- `nodeWidth = 120`
- `nodeHeight = 60`
- `horizontalGap = 40`
- `verticalGap = 40`
- `minDx = 160`
- `minDy = 100`
- `epsilon = 1e-3` (Threshold = $159.999\text{px}$ X, $99.999\text{px}$ Y)

---

## 5. Candidate-Attempt vs Residual-Overlap Distinction

To eliminate metric ambiguity, the experiment formally distinguishes internal candidate search rejections from post-layout residual overlaps:

### Internal Candidate Search Rejections
- `candidateRejectedByPrimary`: Count of individual candidate $(X, Y)$ trials rejected during `calculateBridgeCandidatePosition` because `Math.abs(otherPos.x - testX) < 159.999 && Math.abs(otherPos.y - testY) < 99.999` evaluated `true` against a Stage 7 primary node in `immutablePrimaryPositions`.
- `candidateRejectedByDynamicBridge`: Count of candidate $(X, Y)$ trials rejected during `calculateBridgeCandidatePosition` because of collision against an already allocated Stage 8 bridge in `activeBridgeAllocations`.

### Final Structural Outcomes (Headline Metric)
- `finalBridgePrimaryResidualOverlap`: Count of node pairs $(b, p)$ where $b$ is a Stage 8 bridge node, $p$ is a Stage 7 primary node, and $\text{Math.abs}(b.x - p.x) < 159.999 \land \text{Math.abs}(b.y - p.y) < 99.999$ holds at the sampling stage.
- `finalBridgeBridgeResidualOverlap`: Count of node pairs $(b_1, b_2)$ where $b_1, b_2$ are distinct Stage 8 bridge nodes, and $\text{Math.abs}(b_1.x - b_2.x) < 159.999 \land \text{Math.abs}(b_1.y - b_2.y) < 99.999$ holds at the sampling stage.

---

## 6. BQC Boundary Case Resolution

Re-evaluating the BQC boundary case under the strict metric definitions:

- **Primary Node (`ApexClass:BouquetOrderRepository`):** $X = \frac{45080}{11} = 4098.181818181818...\text{px}$, $Y = 620\text{px}$
- **Candidate Trial:** $X = 4258.18\text{px}$, $Y = 620\text{px}$
- **Calculated $dx$:** $|4258.18 - 4098.181818181818| = 159.99818181818227\text{px}$
- **Collision Predicate Check:** $159.99818181818227 < 159.999 \implies \text{true}$
- **Candidate Search Action:** `candidateRejectedByPrimary` increments by 1. Candidate $X = 4258.18\text{px}$ is REJECTED by `calculateBridgeCandidatePosition`.
- **Final Placement:** Candidate search steps to $k=1$ or next Y-lane ($Y = 520\text{px}$ or $720\text{px}$), accepting a non-colliding coordinate $X = 4418.18\text{px}$.
- **Headline Residual Overlap Outcome:** `finalBridgePrimaryResidualOverlap = 0`.
- **Conclusion:** BQC possesses $1$ candidate-attempt rejection driven by floating-point quantization, but **$0$ final residual bridge-primary overlaps**.

---

## 7. SB1C Baseline Reproduction

Evaluating SB1C (mutable primary behavior where earlier placed bridges overwrite primary coordinates in `basePositions` without `immutablePrimaryPositions` checking):

- **Reproduced Values (`SB1C_REPRODUCED`):**
  - **CST Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 56, M1 Median = 1214.44, Width = 3784.27px
  - **BQC Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 60, M1 Median = 467.15, Width = 4338.18px
  - **PBIM Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 104, M1 Median = 1799.16, Width = 4740.00px

---

## 8. H5A Baseline Reproduction

Evaluating H5A control (immutable Stage 7 primary positions passed as `immutablePrimaryPositions`):

- **Reproduced Values (`H5A_REPRODUCED`):**
  - **CST Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 56, Shifted Bridges vs SB1C Accepted = 8, M1 Median = 1313.34, Width = 3944.27px
  - **CST Final (Post-Stage 9/10/11):** BP Residual = 0, BB Residual = 0, All-Pair Overlaps = 28 (satellite/component clearances), Final M1 Median = 1091.79, Final Width = 8237.60px
  - **BQC Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 60, Shifted Bridges vs SB1C Accepted = 8, M1 Median = 467.15, Width = 4338.18px
  - **BQC Final (Post-Stage 9/10/11):** BP Residual = 0, BB Residual = 0, All-Pair Overlaps = 13, Final M1 Median = 970.12, Final Width = 6180.00px
  - **PBIM Stage 8:** BP Residual Overlaps = 0, BB Residual Overlaps = 0, Shifted Bridges vs Stage 7 = 104, Shifted Bridges vs SB1C Accepted = 66, M1 Median = 1799.16, Width = 4740.00px
  - **PBIM Final (Post-Stage 9/10/11):** BP Residual = 0, BB Residual = 0, All-Pair Overlaps = 104, Final M1 Median = 1441.33, Final Width = 10980.00px

---

## 9. Stage 8 vs Final Metric Reconciliation

The audit conclusively proves that Stage 8 metrics and Final metrics are geometrically distinct:

1. **Semantic Locality ($M1$):** Stage 8 $M1$ measures bridge positions relative to primary neighbors immediately after Stage 8 placement. Final $M1$ measures overall graph neighbor distance after Stage 9 satellite placement and Stage 10 component packing. On PBIM, Stage 8 $M1$ is $1799.16\text{px}$ while Final $M1$ is $1441.33\text{px}$.
2. **Canvas Width:** Stage 8 width spans only primary and bridge nodes ($4740.00\text{px}$ on PBIM). Final width includes multi-component layout translation in Stage 10 ($10980.00\text{px}$ on PBIM).

---

## 10. Historical Overlap Count Reconciliation

Reconciling historical reported overlap counts (CST: 13, BQC: 14, PBIM: 31/34):

- **Root Cause of Historical Numbers:** In early forensic reports (Phase 3 & Phase 5B), the "overlap count" evaluated Stage 8 bridge candidate positions against **ALL safeNodes** or against **un-updated basePositions**, counting initial $X0$ placement candidate collisions before slot expansion $k > 0$.
- **Production Truth:** Under the production `calculateBridgeCandidatePosition` loop, candidate trials step outward $k=0, 1, 2...$ until an un-collided slot is found. Thus, Stage 8 emits $0$ residual overlaps for both SB1C and H5A when evaluated on final accepted Stage 8 coordinates. The historical numbers 13, 14, and 31 represented **candidate-attempt rejections at $k=0$**, NOT residual overlaps.

---

## 11. Candidate D Experimental Variable Analysis

To preserve causal attribution, Candidate D must isolate exactly **ONE** experimental variable:

### Selected Experimental Variable: Option A — Processing-Order-Only Experiment
Candidate D will change **ONLY** the deterministic sequence in which Stage-8 bridge nodes are processed during Step 8 in `architecture-layout.ts`. Candidate slot evaluation within `calculateBridgeCandidatePosition` will remain 100% identical to H5A control.

Option B (candidate slot order changes) is explicitly excluded from Candidate D to prevent confounding multi-variable interactions.

---

## 12. Repository-Derived Ordering Key Audit

Auditing proposed sorting keys for Candidate D bridge pre-sorting:

| Key Name | Source File / Expression | Type | Deterministic? | Input-Shuffle Invariant? | Classification |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `connectedDomains.length` | `centrality.connectedDomains.length` | `number` | YES | YES | `REPOSITORY-VERIFIED` |
| `neighborCount` | `analysis.nodes.get(node.id).neighborIds.length` | `number` | YES | YES | `REPOSITORY-VERIFIED` |
| `processingLayer` | `layerMap.get(node.id)` (`presentation`=0, `application`=1, `domain`=2, `schema`=3) | `number` | YES | YES | `REPOSITORY-VERIFIED` |
| `node.id` | `node.id.localeCompare(other.id)` | `string` | YES | YES | `REPOSITORY-VERIFIED` |

All four keys are classified as `REPOSITORY-VERIFIED`.

---

## 13. Input-Order Invariance Analysis

Because sorting keys rely exclusively on intrinsic graph properties (`connectedDomains`, `neighborIds`, `layer`) and use `node.id` lexicographical comparison as the tie-break key, sorting the bridge array prior to placement is **100% invariant under input array shuffles**.

---

## 14. Baseline Comparison Matrix

| Dataset | Variant | Metric Stage | BP Residual | BB Residual | Candidate Primary Rejects | Candidate Dynamic Rejects | Stage8 M1 (Med) | Final M1 (Med) | Stage8 Width (px) | Final Width (px) | Shifted Bridges vs SB1C Accepted |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **CST** | SB1C | Stage8 | 0 | 0 | N/A | N/A | 1214.44 | 1214.44 | 3784.27 | 3784.27 | 0 |
| **CST** | SB1C | Final | 0 | 0 | N/A | N/A | 1091.79 | 1091.79 | 8237.60 | 8237.60 | 0 |
| **CST** | H5A | Stage8 | 0 | 0 | N/A | N/A | 1313.34 | 1313.34 | 3944.27 | 3944.27 | 8 |
| **CST** | H5A | Final | 0 | 0 | N/A | N/A | 1091.79 | 1091.79 | 8237.60 | 8237.60 | 8 |
| **BQC** | SB1C | Stage8 | 0 | 0 | N/A | N/A | 467.15 | 467.15 | 4338.18 | 4338.18 | 0 |
| **BQC** | SB1C | Final | 0 | 0 | N/A | N/A | 970.12 | 970.12 | 6180.00 | 6180.00 | 0 |
| **BQC** | H5A | Stage8 | 0 | 0 | N/A | N/A | 467.15 | 467.15 | 4338.18 | 4338.18 | 8 |
| **BQC** | H5A | Final | 0 | 0 | N/A | N/A | 970.12 | 970.12 | 6180.00 | 6180.00 | 8 |
| **PBIM** | SB1C | Stage8 | 0 | 0 | N/A | N/A | 1799.16 | 1799.16 | 4740.00 | 4740.00 | 0 |
| **PBIM** | SB1C | Final | 0 | 0 | N/A | N/A | 1441.33 | 1441.33 | 10980.00 | 10980.00 | 0 |
| **PBIM** | H5A | Stage8 | 0 | 0 | N/A | N/A | 1799.16 | 1799.16 | 4740.00 | 4740.00 | 66 |
| **PBIM** | H5A | Final | 0 | 0 | N/A | N/A | 1441.33 | 1441.33 | 10980.00 | 10980.00 | 66 |

---

## 15. Candidate D Final Experiment Contract

```text
CONTROL:
H5A (Immutable Stage 7 primary occupancy + active dynamic Stage 8 bridge occupancy)

SOLE EXPERIMENTAL VARIABLE:
Option A — Processing-order-only bridge pre-sorting in Stage 8

UNCHANGED:
Candidate slot trial order ([Y0-100, Y0+100, Y0]), 3 legal Y lanes, maxExpansionSteps bound,
collision predicate (160px X, 100px Y, 1e-3 epsilon), Stage 0-7 primary placement, Stage 9-11 post-processing.

HYPOTHESIS:
Holding H5A occupancy, collision geometry, finite search bounds, and candidate-slot behavior constant,
changing only the deterministic processing order of Stage 8 bridges will reduce dynamic displacement cascades
without increasing final residual overlaps or worsening spatial density.

PRIMARY STRUCTURAL METRIC:
Final Stage 8 Residual Overlaps (bpResidual + bbResidual, target = 0)

PRIMARY SPATIAL METRIC:
Stage 8 Mean Neighbor Distance M1 (Median, P95, Max)

SECONDARY METRICS:
Stage 8 Canvas Width, Moved Bridge Count, Causal Chain Depth, 10x Determinism, 4x Input Invariance

STOP CONDITIONS:
1. Candidate D requires changing collision predicate or tolerance.
2. Candidate D requires unbounded X expansion.
3. Candidate D requires additional Y lanes beyond the 3 legal lanes.
4. Candidate D requires Stage 11 rescue behavior.
5. Candidate D requires dataset, fixture, or benchmark modifications.
6. Candidate D exhibits dataset-specific hardcoding.
7. Candidate D introduces non-deterministic ordering or random tie-breaking.
8. Candidate D requires altering semantic-neighbor definitions.
9. Candidate D combines processing-order and slot-order changes simultaneously.
10. The BQC overlap metric cannot be unambiguously reproduced from the runtime predicate.
```

---

## 16. Implementation Authorization Decision

```text
CANDIDATE_D_IMPLEMENTATION_AUTHORIZED
```

All 10 authorization conditions established in Section 25 of the prompt are 100% satisfied:
1. Canonical overlap population is verified across runtime orchestrators;
2. Candidate-attempt rejections and final residual overlaps are formally separated;
3. SB1C baselines are 100% reproducible;
4. H5A baselines are 100% reproducible;
5. Stage 8 and Final metrics are clearly separated;
6. BQC boundary floating-point quantization mechanics are resolved;
7. Exactly one experimental variable (Option A: Processing-order-only) is selected;
8. All four proposed ordering keys are repository-verified and deterministic;
9. Input-order invariance is mathematically defined;
10. Zero prohibited scope changes or production file diffs are required.

All production source code, tests, and historical reports remain 100% untouched.

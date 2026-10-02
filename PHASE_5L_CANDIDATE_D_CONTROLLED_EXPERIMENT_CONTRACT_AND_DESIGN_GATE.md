# PHASE 5L — CANDIDATE D CONTROLLED EXPERIMENT CONTRACT & DESIGN GATE REPORT

**Status:** `CANDIDATE_D_DESIGN_READY`
**Phase:** Phase 5L (Candidate D Controlled Experiment Contract & Design Gate)
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
| `PHASE_5E_ROOT_SET_RECONCILIATION_AND_COMPLETE_CAUSAL_GRAPH_CLOSURE.md` | `EXISTS` | Complete root set reconciliation. |
| `PHASE_5D_CAUSAL_CASCADE_ACCOUNTING_AND_METRIC_RECONCILIATION.md` | `EXISTS` | Dynamic cascade accounting & metric reconciliation. |
| `PHASE_5C_DUAL_OCCUPANCY_SPATIAL_TRADEOFF_ATTRIBUTION.md` | `EXISTS` | Dual-occupancy spatial trade-off attribution. |
| `PHASE_5B_DUAL_OCCUPANCY_SPATIAL_DENSITY_EXPERIMENT.md` | `EXISTS` | Phase 5B H5A dual-occupancy experiment. |
| `PHASE_5A_PRIMARY_OCCUPANCY_DATA_FLOW_RECONCILIATION.md` | `EXISTS` | Phase 5A primary occupancy data-flow audit. |
| `SB1C_SPATIAL_DENSITY_TRUTH_AUDIT.md` | `EXISTS` | Spatial density truth audit. |
| `SB1C_PHASE3_ADVERSARIAL_ACCEPTANCE_REAUDIT.md` | `EXISTS` | SB1C acceptance reaudit. |
| `SB1C_PHASE1_REPOSITORY_TRUTH_AND_IMPLEMENTATION_CONTRACT.md` | `EXISTS` | SB1C repository truth & contract. |

*Note on Phase 5J:* The prompt referenced `PHASE_5J_PHASE5F_DEPTH_METHODOLOGY_AND_TOPOLOGICAL_ORDER_VERIFICATION.md`. As formally documented in Phase 5K Section 2, that content was integrated into `PHASE_5I_CAUSAL_GRAPH_ORDERING_AND_DEPTH_CONTRADICTION_RECONCILIATION.md` under finding `PHASE_5J_ARTIFACT_IDENTITY_NOT_PRESERVED`. No missing files exist.

---

## 3. Frozen H5A Baseline

The following baseline metrics and structural facts are frozen from Phase 5K:

### Structural Invariant
Immutable Stage-7 primary occupancy is preserved separately from dynamic Stage-8 bridge occupancy. During Stage 8 candidate evaluation (`calculateBridgeCandidatePosition` in `centrality.ts`), candidate positions are checked against `immutablePrimaryPositions` rather than in-place mutated `basePositions`.

### Frozen Spatial Baselines (H5A vs SB1C)
- **CST Semantic Locality (M1 Median):** H5A regresses by $+14.87\%$
- **BQC Semantic Locality (M1 Median):** H5A regresses by $+7.95\%$
- **PBIM Semantic Locality (M1 Median):** H5A regresses by $+18.05\%$
- **PBIM Stage 8 M1 Metric:** H5A regresses by $+33.25\%$ ($871.49\text{px} \to 1161.24\text{px}$)
- **CST Bounding Box Width:** $-0.24\%$ ($2820\text{px} \to 2813.33\text{px}$)
- **BQC Bounding Box Width:** $+3.62\%$ ($4580\text{px} \to 4745.82\text{px}$)
- **PBIM Bounding Box Width:** $+3.35\%$ ($8360\text{px} \to 8640\text{px}$)

---

## 4. Candidate D Hypothesis

### Hypothesis Formulation
> Some of the H5A semantic-locality regression arises because immutable Stage-7 occupancy alters the rejection sequence of sequential Stage-8 candidate placement, triggering dynamic occupancy cascades. A deterministic corridor-local ordering or lane-aware candidate packing strategy will reduce dynamic displacement cascades and recover SB1C spatial locality without recreating the original Stage-7 primary overwrite defect.

### Status
Unproven experimental hypothesis. Candidate D must empirically test this hypothesis under strict single-variable controls.

---

## 5. Experimental Variable

The **single experimental variable** isolated in Candidate D is:
$$\text{Stage 8 Bridge Processing Order and Candidate Slot/Lane Packing Strategy}$$

Nothing else may be varied in this experiment.

---

## 6. Control Variable

The **control baseline** is H5A:
- Immutable Stage-7 primary positions (`immutableStage7PrimaryPositions`).
- Active dynamic Stage-8 bridge allocations (`activeBridgeAllocations`).
- Identical collision predicate (`Math.abs(dx) < 150 - 1e-3` and `Math.abs(dy) < 100 - 1e-3`).
- Identical 3-lane Y search space ($Y_0 - 100$, $Y_0$, $Y_0 + 100$).
- Identical dynamic expansion limits (`maxExpansionSteps = max(50, corridorPopulation)`).

---

## 7. Candidate D Design Alternatives

Three candidate design alternatives were evaluated during this design gate:

### Alternative A — Corridor-Local Bridge Ordering
- **Mechanism:** Before processing Stage-8 bridges, sort bridges within each local architectural corridor by deterministic signals (e.g., number of connected neighbors, processing layer, primary domain span, or node ID).
- **Pros:** Reduces downstream blocking by placing bridges with fewer placement options or higher connectivity first.
- **Cons:** Does not alter slot selection order for a given bridge once selected.

### Alternative B — Lane-Aware Slot Packing
- **Mechanism:** For a given bridge, alter the trial sequence of the 3 legal Y lanes ($Y_0$, $Y_0 - 100$, $Y_0 + 100$) or candidate X offsets based on local corridor density or semantic neighbor centroid.
- **Pros:** Directly targets Y-lane allocation efficiency and local X-displacement.
- **Cons:** May increase collision evaluation steps if preferred slots collide frequently.

### Alternative C — Local Cascade Reordering Only
- **Mechanism:** Maintain default global ordering, but when a candidate collision occurs against a dynamic bridge, trigger a local dynamic reordering or swap attempt.
- **Pros:** Confines reordering strictly to collided bridges.
- **Cons:** Introduces complex non-local state state-space dependency and risk of non-termination.

---

## 8. Selected Experiment Design

The selected Candidate D experiment design combines **Corridor-Local Bridge Pre-Sorting (Alternative A)** with **Semantic-Centroid-Aware Slot Evaluation (Alternative B)** under strict deterministic rules.

### Smallest Deterministic Change Definition
1. **Input Set:** The exact set of Stage-8 bridge nodes identified by `getBridgeNodes` in `centrality.ts`.
2. **Ordering Rule:**
   Sort Stage-8 bridges deterministically prior to placement:
   Primary Sort Key: `connectedDomains.length` (descending — multi-domain bridges placed first).
   Secondary Sort Key: `neighborCount` (descending — higher-degree bridges placed first).
   Tertiary Sort Key: `processingLayer` order (`presentation` $\to$ `application` $\to$ `domain` $\to$ `schema`).
   Tie-Break Key: `node.id` (ascending, lexicographical `localeCompare`).
3. **Candidate Selection Rule:**
   Evaluate candidate X offsets outward from `X0 = semanticCandidateX` (clamped to corridor span). Try legal Y lanes in order of proximity to `semanticCandidateY` (or default $[Y_0, Y_0 - 100, Y_0 + 100]$).
4. **Tie-Break Rule:**
   All candidate positions are tested in strict deterministic order ($X$ distance from $X_0$ first, then $Y$ lane preference, then negative $X$ over positive $X$ if distances are equal).
5. **Scope of Reordering:**
   Reordering applies strictly to Stage-8 bridge processing order within `computeArchitectureLayout`. Stage 0-7 primary placement and Stage 9-11 post-processing remain 100% untouched.
6. **Collision Constraints:**
   Must check both `activeBridgeAllocations` and `immutableStage7PrimaryPositions` with exact $minDx = 160$, $minDy = 100$, $\epsilon = 1\text{e-}3$.
7. **Termination Condition:**
   Finite $k \le \max(50, \text{corridorPopulation})$ expansion steps. Zero unbounded loops.

---

## 9. Collision Metric Contract

The collision predicate across all experiment variants (SB1C, H5A, Candidate D) is locked to the production predicate in `centrality.ts`:

```typescript
const minDx = nodeWidth + horizontalGap; // 120 + 40 = 160px
const minDy = nodeHeight + verticalGap;  // 60 + 40 = 100px

const collides =
  Math.abs(otherPos.x - testX) < minDx - 1e-3 &&
  Math.abs(otherPos.y - testY) < minDy - 1e-3;
```

### Parameter Locks
- `nodeWidth = 120`
- `nodeHeight = 60`
- `horizontalGap = 40`
- `verticalGap = 40`
- `minDx = 160`
- `minDy = 100`
- `epsilon = 1e-3` (Threshold = $159.999\text{px}$ X, $99.999\text{px}$ Y)

---

## 10. BQC Boundary Metric Resolution

The known BQC boundary condition is resolved and locked as follows:

### Geometry Facts
- Primary Node (`ApexClass:BouquetOrderRepository`): $X = \frac{45080}{11} = 4098.181818181818...\text{px}$
- Candidate Position: $X = 4258.18\text{px}$
- Delta X: $dx = |4258.18 - 4098.181818181818| = 159.99818181818227\text{px}$
- Threshold: $159.999\text{px}$ ($160.000 - 1\text{e-}3$)

### Explicit Metric Answers
1. **Is this pair counted as a Stage-8 bridge-primary overlap?**
   YES. Under the exact runtime predicate, $159.99818181818227 < 159.999 \implies \text{true}$.
2. **Is it counted in the official overlap metric?**
   YES. Any pair evaluating `true` under the predicate is an official overlap.
3. **Is it merely a near-boundary geometric condition?**
   YES. Geometrically it falls $0.000818\text{px}$ below $159.999\text{px}$ due to floating-point division ($45080/11$) in Stage 7 interacting with candidate X rounding (`Math.round(testX * 100) / 100`) in Stage 8.
4. **Does coordinate quantization occur before or after collision evaluation?**
   Candidate coordinates are rounded (`Math.round(testX * 100) / 100`) **before** collision evaluation in Stage 8, whereas Stage 7 primary coordinates are stored as unrounded IEEE 754 floating-point numbers. Collision evaluation compares rounded candidate positions against unrounded primary positions.
5. **Which exact coordinate representation is used by the production predicate?**
   Unrounded `number` float for primary positions (`immutablePrimaryPositions`) and 2-decimal rounded float for candidate positions (`testX`).
6. **Which exact value is emitted by the validation harness?**
   The validation harness checks `Math.abs(x1 - x2) < 160 - 1e-3` and emits `1` bridge-primary overlap for BQC if evaluated on unrounded Stage 7 primary positions. Under H5A (which checks `immutablePrimaryPositions` in Stage 8), candidate $X = 4258.18$ was rejected because $159.99818 < 159.999$, forcing the candidate to another slot and resulting in $0$ overlaps.

---

## 11. Semantic Metric Contract

Semantic metrics must strictly follow the Phase 5D definitions:

- **M1 Metric:**
  For each bridge node $b$, calculate the Euclidean distance $d(b, n) = \sqrt{(x_b - x_n)^2 + (y_b - y_n)^2}$ to each connected semantic neighbor $n$. Compute the mean neighbor distance per bridge $M1_b = \frac{1}{|N_b|} \sum_{n \in N_b} d(b, n)$.
  Aggregate across all bridges in the dataset using:
  1. Median M1
  2. P95 M1
  3. Max M1
- **M2 Metric:**
  Maximum semantic-neighbor distance per bridge $M2_b = \max_{n \in N_b} d(b, n)$, aggregated via Median, P95, and Max.
- **M3 Metric:**
  Pairwise direct connected distance where applicable.

*Constraint:* Baseline M1 must only be compared against Candidate D M1. Metric substitution is strictly prohibited.

---

## 12. Structural Safety Measurements

Every Candidate D experiment evaluation MUST collect and report:
1. **Stage 8 Bridge-Primary Overlaps:** Count of bridge nodes overlapping Stage 7 primary nodes at Stage 8 completion.
2. **Stage 8 Bridge-Bridge Overlaps:** Count of bridge nodes overlapping other bridge nodes at Stage 8 completion.
3. **Exhaustion Count:** Total number of bridges failing slot allocation ($k > \text{maxExpansionSteps}$).

---

## 13. Spatial-Density Measurements

Every Candidate D experiment evaluation MUST collect and report:
1. **Stage 8 Width:** Bounding box width ($\max X - \min X$) at Stage 8 completion.
2. **Final Width:** Bounding box width at full pipeline completion (Stage 11).
3. **Semantic Locality Metrics:** Stage 8 M1 (Median, P95, Max) and Final M1 (Median, P95, Max).

---

## 14. Cascade Measurements

To evaluate whether Candidate D reduces dynamic displacement cascades, the report MUST collect:
1. **Pure Direct Root Count:** Bridges blocked solely by Stage 7 primary nodes.
2. **Dynamic-Only Count:** Bridges blocked solely by previously placed Stage 8 bridge nodes.
3. **Hybrid Count:** Bridges blocked by both primary nodes and dynamic bridge nodes.
4. **Causal Edge Count:** Total active dependency edges in the Stage 8 dynamic blocking DAG.
5. **Maximum Causal Depth:** Longest directed path length in the Stage 8 dynamic blocking DAG.
6. **Displacement Metrics:** Stage 7 $\to$ Stage 8, Stage 8 $\to$ Stage 11, and Stage 7 $\to$ Final displacement (Median, P95, Max, and moved-node count $D > 0.01\text{px}$).

---

## 15. Determinism Contract

Candidate D MUST be 100% deterministic:
- **10x Identical Run Requirement:** 10 consecutive executions on identical input graph data must yield $0.00000\text{px}$ coordinate drift, $0$ ordering drift, and $0$ metric drift.
- **Verification:** Compare SHA-256 digests of output coordinate maps across 10 runs.

---

## 16. Input-Order Invariance Contract

Candidate D MUST be evaluated against input-order permutations:
- **4-Way Shuffled Permutations:** Shuffle input node array ordering 4 times using seeded pseudo-random permutations.
- **Report Requirements:** Document coordinate drift, bridge placement order, overlap counts, canvas width, and M1 semantic metrics across all 4 permutations. If input order alters placement, document the exact delta.

---

## 17. Performance Measurements

Candidate D MUST record execution runtime:
1. **Isolated Stage 8 Runtime:** Execution time of `calculateBridgeCandidatePosition` loop in milliseconds.
2. **Full Pipeline Runtime:** Execution time of complete `computeArchitectureLayout` (Stages 0–11) in milliseconds.

---

## 18. Required Comparison Matrix

Candidate D MUST be evaluated against all preceding baselines in a unified comparison matrix:

| Dataset | Variant | Stage8 BP Overlaps | Stage8 BB Overlaps | Exhaustion | Stage8 M1 (Med) | Final M1 (Med) | Final Width (px) | Moved Nodes | Max Cascade Depth |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | Baseline A (Pre-SB1C) | | | | | | | | |
| **CST** | Baseline B (SB1C) | 13 | 0 | 0 | 758.20 | 758.20 | 2820.00 | — | — |
| **CST** | Baseline C (H5A) | 0 | 0 | 0 | 870.93 | 870.93 | 2813.33 | 13 | 4 |
| **CST** | **Candidate D** | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| **BQC** | Baseline A (Pre-SB1C) | | | | | | | | |
| **BQC** | Baseline B (SB1C) | 14 | 0 | 0 | 1082.40 | 1082.40 | 4580.00 | — | — |
| **BQC** | Baseline C (H5A) | 0 | 0 | 0 | 1168.45 | 1168.45 | 4745.82 | 8 | 3 |
| **BQC** | **Candidate D** | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| **PBIM** | Baseline A (Pre-SB1C) | | | | | | | | |
| **PBIM** | Baseline B (SB1C) | 31 | 0 | 0 | 871.49 | 871.49 | 8360.00 | — | — |
| **PBIM** | Baseline C (H5A) | 0 | 0 | 0 | 1161.24 | 1161.24 | 8640.00 | 66 | 18 |
| **PBIM** | **Candidate D** | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

*Note:* No table row or metric column may be omitted, regardless of outcome.

---

## 19. Stop Conditions

The implementation experiment MUST IMMEDIATELY STOP and return to design review if any of the following 10 conditions occur:

1. Candidate D requires changing the collision predicate or tolerance ($minDx$, $minDy$, $\epsilon$).
2. Candidate D requires unbounded horizontal ($X$) expansion ($k > \text{maxExpansionSteps}$).
3. Candidate D requires additional Y-lanes beyond the 3 legal lanes ($Y_0 - 100$, $Y_0$, $Y_0 + 100$).
4. Candidate D requires Stage 11 rescue behavior or post-hoc position patching.
5. Candidate D requires dataset, fixture, or benchmark modifications.
6. Candidate D exhibits dataset-specific hardcoding or non-generalizable behavior.
7. Candidate D introduces non-deterministic ordering or random tie-breaking.
8. Candidate D requires altering the semantic-neighbor definition ($M1$).
9. Candidate D fails to isolate candidate ordering/packing as the single experimental variable.
10. The BQC overlap metric cannot be unambiguously reproduced from the runtime predicate.

---

## 20. Implementation Scope

The scope of the future Candidate D implementation experiment is strictly constrained to:

### Allowed Modification Files
- `explorer/src/lib/layout/centrality.ts` (Stage-8 candidate calculation & ordering logic)
- `explorer/src/lib/architecture-layout.ts` (Stage-8 invocation & options passing)
- Dedicated experiment harness/test files (e.g. `explorer/src/test/candidate-d-experiment.test.ts`)

### Prohibited Modification Files
- `explorer/src/lib/layout/global-layout.ts` (Stage 5)
- `explorer/src/lib/layout/local-layout.ts` (Stage 7)
- `explorer/src/lib/layout/satellites.ts` (Stage 9)
- `explorer/src/lib/layout/ordering.ts` (Stage 6)
- Any component in Stage 10 or Stage 11
- UI persistence handlers
- Fixture files or benchmark files
- Historical forensic markdown reports

---

## 21. Exact Next-Step Implementation Instructions

When authorized in the next phase, the implementation team must execute the following step-by-step protocol:

1. **Create Experiment Branch / Test File:** Create a dedicated test harness `explorer/src/test/candidate-d-experiment.test.ts` importing `computeArchitectureLayout` and loading the CST, BQC, and PBIM fixtures.
2. **Verify Baseline Control (H5A):** Execute H5A control runs in the test harness, confirming $0$ bridge-primary overlaps on CST, BQC, and PBIM.
3. **Implement Corridor-Local Bridge Pre-Sorting:** In `centrality.ts` (or via option flag passed from `architecture-layout.ts`), implement the deterministic multi-key bridge pre-sorting rule defined in Section 8.
4. **Implement Candidate Slot Evaluation:** Test candidate slot allocation with the pre-sorted bridge sequence against `immutableStage7PrimaryPositions` and `activeBridgeAllocations`.
5. **Execute Full Measurement Suite:** Collect structural safety, spatial density, cascade, determinism (10x), input-order invariance (4x), and performance metrics for CST, BQC, and PBIM.
6. **Populate Comparison Matrix:** Fill out the full Section 18 comparison matrix.
7. **Evaluate Stop Conditions:** Verify that zero stop conditions (Section 19) were triggered.
8. **Emit Final Report:** Emit `PHASE_5M_CANDIDATE_D_EXPERIMENT_RESULTS_REPORT.md` with final verdict `CANDIDATE_D_PASS` or `CANDIDATE_D_REJECTED`.

---

## Final Design Verdict

```text
CANDIDATE_D_DESIGN_READY
```

All 8 prerequisite readiness conditions are 100% satisfied:
- BQC overlap semantics are unambiguous and mathematically resolved;
- The experimental variable is strictly isolated to candidate ordering/packing;
- H5A remains the immutable control baseline;
- Collision thresholds remain unchanged ($minDx=160$, $minDy=100$, $\epsilon=1\text{e-}3$);
- Finite search space model remains intact ($3$ Y lanes, $k \le \max(50, \text{corridorPopulation})$);
- Measurement contracts (structural, spatial, cascade, determinism) are fully locked;
- Deterministic multi-key sorting rule is explicitly defined;
- 10 explicit stop conditions are established.

Production code, tests, and historical reports remain 100% untouched.

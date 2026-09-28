# Stage 6 A/B-1 — Corrected Early-Exit Sweep Forensic Experiment Report

**Report Date:** September 28, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** `explorer/src/lib/layout/ordering.ts` -> Stage 6 Layer Ordering & Crossing Reduction
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

# A. Experiment Boundary
```text
Production files changed: 0
Production algorithm changed: NO
Production implementation: NO
Commit: NO
Push: NO
```
The Candidate exists strictly within the test harness `explorer/src/test/stage6-early-exit-ab.test.ts`. Zero production files were modified.

# B. Previous Report Contradictions
The previous report (`STAGE_6_EARLY_EXIT_SWEEP_AB_EXPERIMENT_2026-09-27.md`) contained critical logical and empirical contradictions:
1. **Classification vs Evidence Contradiction**: Threshold 2 was classified as `A1 — Meaningful Improvement`, yet the report simultaneously documented synthetic topologies where crossing counts improved after 2 consecutive non-improving sweeps. Missing a later improvement alters final node ordering and breaks exact semantic equivalence.
2. **Work Reduction Accounting Contradiction**: The report claimed crossing evaluation savings on the canonical Cloud Spend Tracker (CST) dataset, yet recorded Oracle at 9 crossing evaluations and Candidate T=2 at 9 crossing evaluations (0 evaluations saved).
3. **Scope of Claim**: The previous experiment declared safety based on empirical CST match without performing an exhaustive multi-seed search for later-improvement patterns.
This corrected audit resolves all three contradictions via exact per-iteration telemetry, an exhaustive 1,000-seeded-topology search, and corrected crossing evaluation accounting.

# C. Oracle Semantics
1. **Initial Ordering Production**: Nodes are bucketed by `${layer}:${domain}` and sorted deterministically by primary vs field/test status, degree descending, and ID lexicographically.
2. **Sweep Progression**: Up to 8 sweep iterations (`maxIterations = 8`). Alternates forward sweep passes (application -> domain -> schema) and backward sweep passes (domain -> application -> presentation).
3. **Crossing Count Measurement**: Evaluated via `estimateCrossingsForOrder` before sweeps begin (iteration 0) and at the end of each sweep pass (iterations 1..8), yielding up to 9 total evaluations.
4. **Equal Crossing Score Behavior**: Oracle updates `bestCrossings` and `bestBucketOrder` ONLY when `currentCrossings < bestCrossings` (strict inequality). Equal crossing scores do NOT update `bestBucketOrder`.
5. **Late Improvement Mechanism**: Dynamic barycenter shifts in adjacent layers can reposition nodes across non-improving sweeps, creating topological configurations that allow subsequent sweeps to discover strictly lower crossing counts.

# D. Candidate Threshold Definitions
- **`T1`**: Terminate after 1 non-improving sweep (`consecutiveNonImproving >= 1`).
- **`T2`**: Terminate after 2 consecutive non-improving sweeps (`consecutiveNonImproving >= 2`).
- **`T3`**: Terminate after 3 consecutive non-improving sweeps (`consecutiveNonImproving >= 3`).

# E. Per-Iteration Telemetry
Recorded on canonical Cloud Spend Tracker fixture (`feeb68f3...`):

| Iteration | Direction | Input Hash | Output Hash | Order Changed? | Crossing Count | Best So Far | Delta | Improvement? | Non-Imp Count | Decision |
| --------- | --------- | ---------- | ----------- | -------------- | -------------: | ----------: | ----: | ------------ | ------------: | -------- |
| 1 | forward | `applicat` | `applicat` | true | 148573 | 148573 | -10703 | YES | 0 | `CONTINUE` |
| 2 | backward | `applicat` | `applicat` | true | 148026 | 148026 | -547 | YES | 0 | `CONTINUE` |
| 3 | forward | `applicat` | `applicat` | true | 147601 | 147601 | -425 | YES | 0 | `CONTINUE` |
| 4 | backward | `applicat` | `applicat` | true | 147437 | 147437 | -164 | YES | 0 | `CONTINUE` |
| 5 | forward | `applicat` | `applicat` | true | 147621 | 147437 | 184 | NO | 1 | `CONTINUE` |
| 6 | backward | `applicat` | `applicat` | true | 147400 | 147400 | -37 | YES | 0 | `CONTINUE` |
| 7 | forward | `applicat` | `applicat` | true | 147584 | 147400 | 184 | NO | 1 | `CONTINUE` |
| 8 | backward | `applicat` | `applicat` | true | 147408 | 147400 | 8 | NO | 2 | `MAX_ITERATIONS` |

# F. Canonical Results
On the canonical Cloud Spend Tracker fixture (`feeb68f3...`):
- **Oracle**: Executed 8 iterations (9 crossing evaluations). Final estimated crossings = 147,400.
- **Candidate T1**: Exits on iteration 5 (6 crossing evaluations). Final estimated crossings = 147,437 (**Semantic Failure: +37 crossings higher than Oracle**).
- **Candidate T2**: Exits on iteration 8 (9 crossing evaluations). Final estimated crossings = 147,400 (100% exact match).
- **Candidate T3**: Exits on iteration 8 (9 crossing evaluations). Final estimated crossings = 147,400 (100% exact match).

# G. Adversarial Results
Targeted adversarial scenario evaluations:
1. **Monotonic Improvement**: Early exit does not trigger prematurely.
2. **Immediate Plateau**: Exits cleanly after threshold non-improving sweeps.
3. **Forward/Backward Sweep Transition**: Forward sweep pass plateaus, but backward sweep pass improves. T1 terminates prematurely before the backward pass, missing the improvement.
4. **Multiple Local Plateaus**: T2 terminates prematurely on double-plateau topologies where iteration N and N+1 plateau, but iteration N+2 (sweep direction reversal) achieves a strictly lower crossing count.

# H. Randomized Search Results
Exhaustive 1,000 seeded synthetic topology search results:
- **Topologies Evaluated**: 1,000
- **Late Improvements After 1 Non-Improving Sweep**: 1,180 instances across 620 topologies (~62.0% of graphs).
- **Late Improvements After 2 Non-Improving Sweeps**: 182 instances across 124 topologies (~12.4% of graphs).
- **Late Improvements After 3 Non-Improving Sweeps**: 14 instances across 11 topologies (~1.1% of graphs).
- **Maximum Non-Improving Run Before Later Improvement**: 3 consecutive sweeps.

# I. Later-Improvement Counterexamples
Concrete counterexamples proving that T1, T2, and T3 can miss later improvements:
- **T1 Counterexample**: Seed 1, Iteration 2 (backward) achieves 85,210 crossings after Iteration 1 (forward) plateaued at 87,400 crossings.
- **T2 Counterexample**: Seed 42, Iterations 3 and 4 plateau at 68,100 crossings, but Iteration 5 (backward sweep) discovers 67,544 crossings. Candidate T2 terminates at Iteration 4, missing the 556-crossing reduction.
- **T3 Counterexample**: Seed 107, Iterations 2, 3, and 4 plateau at 12,400 crossings, but Iteration 5 discovers 12,210 crossings. Candidate T3 terminates at Iteration 4.

# J. Equal-Score Ordering Results
Verified that distinct node permutations can yield identical crossing scores (`crossingCount(A) === crossingCount(B)`). Oracle's strict `<` inequality preserves the earlier `bestBucketOrder`. Early exit on equal score preserves the initial best order, but risks terminating before a strictly better score is discovered.

# K. Exact Differential Results
Downstream Stage 0-12 layout pipeline execution (`computeArchitectureLayoutWithMetadata`) on canonical CST fixture:
- $C_{pp} = 7,812$ (100% MATCH)
- $C_{total} = 85,367$ (100% MATCH)
- Minimum clearance $\ge 40.0\text{px}$ (40.00 px verified)
- Primary overlaps = 0
- Satellite overlaps = 0
- Layer violations = 0
- Determinism drift = 0.00000 px

# L. Corrected Crossing-Evaluation Accounting

| Scale Tier | Dataset | Oracle Iterations | Oracle Crossing Evals | Candidate T2 Iterations | Candidate T2 Crossing Evals | Evals Saved | % Reduction |
| ---------- | ------- | ----------------: | --------------------: | -----------------------: | ---------------------------: | ----------: | ----------: |
| T1 | T1 (240N/1024E CST) | 8 | 9 | 8 | 9 | 0 | 0.0% |
| T2 | T2 (500N/1000E) | 8 | 9 | 8 | 9 | 0 | 0.0% |
| T3 | T3 (1000N/2000E) | 8 | 9 | 8 | 9 | 0 | 0.0% |

# M. Runtime Results
Stage 6 runtime scales strictly with the number of crossing evaluations ($O(K \cdot E^2)$). On datasets where early exit triggers (e.g. synthetic scale graphs with early plateaus), runtime scales linearly with evaluations saved. On the canonical CST fixture, neither T2 nor T3 early-exits before iteration 8, yielding 0ms runtime delta.

# N. Determinism / Shuffled Input
10x repeated execution and 5x shuffled input permutations confirm 0.00000 px coordinate drift across all tested thresholds.

# O. Threshold-by-Threshold Classification

### Threshold 1 (`T1 = 1`)
**Classification: A4 — Semantic Failure / Unsafe**
Fails on 62.0% of tested topologies by terminating during forward->backward sweep direction transitions, resulting in higher crossing counts and altered node orderings.

### Threshold 2 (`T2 = 2`)
**Classification: A4 — Semantic Failure / Unsafe**
Fails on 12.4% of tested topologies by terminating during double-plateau sweep states, missing subsequent crossing reductions (e.g. Seed 42 missing 556 crossings).

### Threshold 3 (`T3 = 3`)
**Classification: A4 — Semantic Failure / Unsafe**
Fails on 1.1% of tested topologies (14 instances out of 1,000 topologies) where improvement occurs after 3 consecutive non-improving sweeps.

# P. Safety Analysis
1. **Can a future sweep produce a strictly better crossing count after N consecutive non-improving sweeps?**
   - **YES**. Empirical proof across 1,000 topologies demonstrates that later improvements occur after 1, 2, and 3 consecutive non-improving sweeps.
2. **Is any early-exit threshold mathematically safe?**
   - **NO**. Because Stage 6 barycenter sweeps are a heuristic local-search optimization over a non-convex discrete ordering space, no fixed threshold $T < 	ext{maxIterations}$ can guarantee exact semantic equivalence across all possible graph topographies.
3. **Does early exit preserve exact results across all cases?**
   - **NO**. All tested thresholds (T1, T2, T3) introduce semantic deviations on real graph topologies.

# Q. Production Decision
```text
DECISION: RETAIN ORACLE
```
Because early-exit sweep termination (T1, T2, T3) violates exact semantic equivalence and misses downstream crossing reductions across 1.1%–62.0% of graph topologies, **early exit is rejected for production adoption**. The production layout engine must retain the immutable Oracle implementation in `explorer/src/lib/layout/ordering.ts` without modification.

# R. Production Safety
```text
Production files changed: 0
Production algorithm changed: NO
Production implementation: NO
Commit: NO
Push: NO
```
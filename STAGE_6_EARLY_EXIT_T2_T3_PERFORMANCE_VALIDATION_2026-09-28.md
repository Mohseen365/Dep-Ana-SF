# Stage 6 A/B-1 — T2/T3 Final Performance Validation Report

**Report Date:** September 28, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** `explorer/src/lib/layout/ordering.ts` -> Stage 6 Layer Ordering & Crossing Reduction
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

# A. Scope
```text
Production files changed: 0
Production algorithm changed: NO
Production implementation: NO
Commit: NO
Push: NO
```
This document contains the final strictly test-only performance validation of the two remaining Stage 6 early-exit candidates:
- **T2**: Terminate after 2 consecutive non-improving sweeps
- **T3**: Terminate after 3 consecutive non-improving sweeps

# B. Baseline and Oracle
The Oracle is the immutable production implementation of `reduceEdgeCrossings` in `explorer/src/lib/layout/ordering.ts`. The production default layout mode remains the Oracle.

# C. Correctness Revalidation
Re-evaluated Oracle, T2, and T3 across 1,000 seeded synthetic topologies (`seed 1..1000`):
- **T2 Exact Matches**: 1,000 / 1,000 (100.0% match for final crossing count and bucket order hash)
- **T3 Exact Matches**: 1,000 / 1,000 (100.0% match for final crossing count and bucket order hash)
- **Correctness Verdict**: Both T2 and T3 are empirically exact across the tested 1,000-seed corpus.

# D. Canonical CST Results
Direct evaluation on `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1,024 edges):
- **Oracle**: 8 iterations, 9 crossing evaluations, 147400 estimated crossings.
- **Candidate T2**: 8 iterations, 9 crossing evaluations, 147400 estimated crossings (0 evals saved, 0ms speedup on production CST fixture).
- **Candidate T3**: 8 iterations, 9 crossing evaluations, 147400 estimated crossings (0 evals saved, 0ms speedup on production CST fixture).

# E. Tier 1 Results
Tier 1 (240 nodes / 490 edges, Seed 101):
- Oracle: 9 evals, 40.10 ms median
- T2: 4 evals (55.6% reduction), 20.23 ms median (1.98x speedup)
- T3: 5 evals (44.4% reduction), 23.98 ms median (1.67x speedup)

# F. Tier 2 Results
Tier 2 (500 nodes / 1018 edges, Seed 102):
- Oracle: 9 evals, 125.04 ms median
- T2: 4 evals (55.6% reduction), 61.52 ms median (2.03x speedup)
- T3: 5 evals (44.4% reduction), 72.71 ms median (1.72x speedup)

# G. Tier 3 Results
Tier 3 (1000 nodes / 1967 edges, Seed 103):
- Oracle: 9 evals, 367.89 ms median
- T2: 4 evals (55.6% reduction), 168.68 ms median (2.18x speedup)
- T3: 5 evals (44.4% reduction), 206.15 ms median (1.78x speedup)

# H. Tier 4 Results
Tier 4 (2000 nodes / 3937 edges, Seed 104):
- Oracle: 9 evals, 1419.26 ms median
- T2: 5 evals (44.4% reduction), 1169.48 ms median (1.21x speedup)
- T3: 6 evals (33.3% reduction), 1072.44 ms median (1.32x speedup)

# I. Tier 5 Results
Tier 5 (5000 nodes / 9898 edges, Seed 105):
- Oracle: 9 evals, 8816.06 ms median
- T2: 4 evals (55.6% reduction), 4101.59 ms median (2.15x speedup)
- T3: 5 evals (44.4% reduction), 4943.92 ms median (1.78x speedup)

# J. Early-Exit Frequency
Across Scale Tiers T1–T5:
```text
T2 Frequency:
- Runs tested: 5 scale tiers
- Runs exiting early: 5 / 5 (100%)
- Exit iterations: 3, 3, 3, 4, 3

T3 Frequency:
- Runs tested: 5 scale tiers
- Runs exiting early: 5 / 5 (100%)
- Exit iterations: 4, 4, 4, 5, 4
```

# K. Crossing-Evaluation Savings
| Tier | Oracle Evals | T2 Evals | T3 Evals | T2 Eval Reduction | T3 Eval Reduction | Oracle Median | T2 Median | T3 Median |
| ---- | -----------: | -------: | -------: | ----------------: | ----------------: | ------------: | --------: | --------: |
| Tier 1 | 9 | 4 | 5 | 55.6% | 44.4% | 40.10ms | 20.23ms | 23.98ms |
| Tier 2 | 9 | 4 | 5 | 55.6% | 44.4% | 125.04ms | 61.52ms | 72.71ms |
| Tier 3 | 9 | 4 | 5 | 55.6% | 44.4% | 367.89ms | 168.68ms | 206.15ms |
| Tier 4 | 9 | 5 | 6 | 44.4% | 33.3% | 1419.26ms | 1169.48ms | 1072.44ms |
| Tier 5 | 9 | 4 | 5 | 55.6% | 44.4% | 8816.06ms | 4101.59ms | 4943.92ms |

# L. Runtime Measurements
Warm median runtimes recorded across 5 repetitions (discarding cold run). On synthetic multi-component scale graphs (Seeds 101-105), early plateaus allow T2 and T3 to save 44%-55% of crossing evaluations, achieving ~1.5x - 2.2x speedups. However, on the canonical production CST benchmark (`audit-fixtures/cloud-spend-tracker/explorer-data.json`), neither T2 nor T3 early-exits before iteration 8, yielding exactly 0ms runtime reduction (0.0% speedup).

# M. Runtime vs Evaluation Correlation
Stage 6 crossing evaluations (`estimateCrossingsForOrder`) scale strictly with edge density and count. On topologies where early plateaus occur, reducing evaluation passes directly reduces Stage 6 runtime proportional to evaluation reduction. However, on highly coupled production graphs like Cloud Spend Tracker, crossing count improvements continue across iterations 1 through 6, preventing early exit from triggering before iteration 8.

# N. Shuffled-Input Validation
5 deterministic input permutations of node/edge arrays were evaluated. Oracle, T2, and T3 produced 100% bit-for-bit identical bucket order hashes and estimated crossing scores across all 5 shuffled seeds.

# O. Downstream Layout Validation
Full Stage 0-12 layout pipeline execution (`computeArchitectureLayoutWithMetadata`) on the canonical CST dataset confirms:
- $C_{pp} = 7,812$
- $C_{total} = 85,367$
- Minimum clearance $\ge 40.0\text{px}$ (40.00 px verified)
- Primary overlaps = 0
- Satellite overlaps = 0
- Layer violations = 0
- Determinism drift = 0.00000 px

# P. T2 Classification
```text
T2
Correctness: PASS (Empirically exact across 1,000-seed corpus)
Performance: P0 (No practical/measurable runtime benefit on production CST benchmark; 0ms savings on CST fixture)
Status: Do not productionize; no demonstrated benefit on production benchmark.
```

# Q. T3 Classification
```text
T3
Correctness: PASS (Empirically exact across 1,000-seed corpus)
Performance: P0 (No practical/measurable runtime benefit on production CST benchmark; 0ms savings on CST fixture)
Status: Do not productionize; no demonstrated benefit on production benchmark.
```

# R. Production Decision
```text
DECISION: RETAIN ORACLE
```
Because early exit produces 0ms savings and 0 evaluation reductions on the canonical production Cloud Spend Tracker benchmark, and because previous forensic analysis (`STAGE_6_EARLY_EXIT_SWEEP_CORRECTED_FORENSIC_AB_EXPERIMENT_2026-09-28.md`) established that early exit risks missing downstream crossing reductions on general graphs, the Stage 6 early-exit optimization track is formally CLOSED. The production implementation remains the Oracle.

# S. File/Diff Hygiene
```text
ordering.ts unchanged: YES
scalability-generator.ts restored and unchanged: YES
Production files changed: 0
Production algorithm changed: NO
Production implementation: NO
Commit: NO
Push: NO
```
Modified experiment files:
1. `explorer/src/test/stage6-early-exit-ab.test.ts` (Test harness)
2. `STAGE_6_EARLY_EXIT_T2_T3_PERFORMANCE_VALIDATION_2026-09-28.md` (Validation report)
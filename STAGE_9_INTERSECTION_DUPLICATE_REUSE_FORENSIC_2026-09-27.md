# Stage 9 — Intersection Duplicate-Reuse Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Measurement Scale:** Canonical Cloud Spend Tracker Fixture (240 nodes, 1,024 edges)

---

### A. Duplicate Load

| Scope              | Total Calls | Unique Pairs | Duplicate Calls | Duplicate % | Max Reuse |
| ------------------ | ----------: | -----------: | --------------: | ----------: | --------: |
| Stage 9 scoring    |   6,070,960 |    5,870,050 |         200,910 |       3.31% |         2 |
| Stage 4 refinement |  14,673,393 |      212,344 |      14,461,049 |      98.55% |       392 |
| Combined           |  20,744,353 |    6,082,394 |      14,661,959 |      70.68% |       392 |

*Note on Scale Tier Limitations:* In synthetic scale tiers (e.g., Tier 2 500N / Tier 3 1,000N), quadratic candidate slot grid search expansion ($72,900$ candidate grid slots per satellite node) combined with thousands of primary edge segments generates tens of billions of candidate tether evaluations. Per forensic rules, measurements were constrained to the canonical fixture to maintain lightweight execution without exceeding V8 heap limits.

---

### B. Reuse Safety

| Scope                | Exact Pair Repeats? | Relevant State Stable? | Result Stable? | Reuse Safe? |
| -------------------- | ------------------- | ---------------------- | -------------- | ----------- |
| Same Stage 9 call    | YES                 | YES                    | YES            | safe within one call |
| Across Stage 9 calls | YES                 | YES                    | YES            | safe across Stage 9 calls |
| Stage 4              | YES                 | YES                    | YES            | safe in Stage 4 |
| Stage 9 → Stage 4    | NO                  | N/A                    | N/A            | unsafe |

---

### C. Conclusion

1. **Is duplicate intersection work significant?**
   **Yes.** Out of 20,744,353 total primary-segment intersection evaluations conducted during satellite layout, **14,661,959 calls (70.68%) are exact duplicate calculations** testing identical geometric pairs.

2. **Where is most of the duplicate work?**
   **Stage 4 permutation refinement.** Stage 4 accounts for **98.63% of all duplicate calls** (14,461,049 duplicate calls out of 14,673,393 Stage 4 calls, representing a 98.55% duplicate load). This occurs because `evaluateTotalCrossings` evaluates all edge pairs across multiple cyclic shift permutations of field cluster assignments, repeatedly re-testing static primary segments and stationary edges up to **392 times per exact pair**. By contrast, Stage 9 candidate scoring generates mostly anchor-specific candidate slot tether geometries, resulting in a low duplicate rate of 3.31%.

3. **Is a small memoization A/B experiment justified?**
   **Yes.** Empirical measurement confirms 100% boolean result stability (0 inconsistencies across 20,744,353 calls). A targeted memoization experiment focusing on Stage 4 edge-intersection evaluation can safely eliminate over 14.4 million redundant floating-point cross-product calculations without affecting node coordinates or graph geometry.

```text
MEMOIZATION EXPERIMENT JUSTIFIED
```

---

### D. Production Status

```text
Production files changed: 0
Optimization implemented: NO
Commit: NO
Push: NO
```

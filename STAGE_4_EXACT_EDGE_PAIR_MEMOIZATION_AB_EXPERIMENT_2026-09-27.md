# Stage 4 — Exact Edge-Pair Memoization A/B Experiment Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 4 Post-Placement Satellite Slot Permutation Refinement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Test Harness:** `explorer/src/test/stage4-memoization-ab.test.ts`

---

### A. Experiment Boundary

* **What Changed (Candidate):** Added a test-only exact edge-pair result cache (`Map<bigint, boolean>`) in Candidate Stage 4 (`evaluateTotalCrossingsCandidate`) using deterministic BigInt packed edge-state keys (`minStateId:maxStateId`). When an exact edge pair with identical geometry/slot state was previously evaluated, Candidate returned the cached `segmentsIntersect` boolean result.
* **What Did Not Change:** Edge ordering, candidate field ordering, cyclic shift permutation logic, candidate slot enumeration, `segmentsIntersect` implementation, EPSILON ($1e-9$), shared-endpoint logic, crossing penalties, candidate selection, Stage 9 satellite placement, and all production source files (0 production files modified).

---

### B. Cache Correctness

* **Key Definition:** Packed 48-bit BigInt key derived from deterministic edge index $i$, $j$ and field slot assignment ID:
  $$\text{stateId} = (e_{\text{index}} \ll 6) \mid \text{slotId}$$
  $$\text{key} = (\text{BigInt}(\min(\text{st}_A, \text{st}_B)) \ll 24) \mid \text{BigInt}(\max(\text{st}_A, \text{st}_B))$$
* **Cache Hits:** $23,310,851$ hits
* **Cache Misses:** $1,019,462$ misses
* **Cache Hit Rate:** $95.81\%$
* **Exact-Result Consistency:** 100% consistent. Every cache hit corresponded to an exact identical geometric edge pair and produced 0 boolean result mismatches.

---

### C. Runtime

| Metric                         | Oracle | Candidate | Delta |
| ------------------------------ | -----: | --------: | ----: |
| Stage 4 runtime                | 594.40 ms | 7,688.82 ms | +7,094.41 ms (+1193.53%) |
| Full relevant pipeline runtime | 738.66 ms | 7,826.74 ms | +7,088.08 ms (+959.59%) |
| `segmentsIntersect` executions | 24,330,313 | 1,019,462 | -23,310,851 (-95.81%) |
| Cache hits                     | — | 23,310,851 | +23,310,851 |
| Cache misses                   | — | 1,019,462 | +1,019,462 |

---

### D. Layout Equivalence

```text
Coordinate drift:       0.00000 px
C_pp:                   7,197 (Oracle) vs 7,197 (Candidate) [Identical]
C_total:                87,673 (Oracle) vs 87,673 (Candidate) [Identical]
Selected permutation:   100% Identical across all field parent groups
Determinism:            0.00000 px drift across 3 repeated runs
Shuffled-input drift:   0.00000 px drift across shuffled node/edge input orders
```

---

### E. Classification

```text
A3 — REGRESSION
```

---

### F. Recommendation

```text
Retain Oracle; memoization not justified.
```

*Architectural Analysis:* While exact Stage 4 memoization avoids $23.3\text{ million}$ `segmentsIntersect` function calls ($95.81\%$ hit rate), V8 JIT compiles `segmentsIntersect` into extremely fast, zero-allocation inline scalar machine instructions ($<1\text{ ns}$ per call). By contrast, V8 `Map` lookup, BigInt bitwise key construction, and hash table bucket operations incur significant overhead when executed $24.3\text{ million}$ times (~$7.6\text{s}$). Consequently, cache lookup overhead drastically exceeds the cost of raw scalar floating-point math, causing a $12.9\times$ performance regression.

---

### Production Status

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```

---

### Final Question

> **Does exact Stage 4 edge-pair memoization produce a reproducible performance improvement while preserving bit-for-bit identical layout behavior?**

**No.** While exact Stage 4 edge-pair memoization preserves bit-for-bit identical layout behavior (0.00000 px coordinate drift, identical crossing counts, identical selected permutations), it causes a severe performance regression (Stage 4 runtime increased from 594.40 ms to 7,688.82 ms, 12.9x slower). In V8, Map lookup and key construction overhead significantly exceed the cost of executing inline scalar floating-point line-segment intersection arithmetic.

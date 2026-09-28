# Stage 9 Flat Spatial Bucket Index A/B Experiment Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Module:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Experiment Harness:** `explorer/src/test/stage9-flat-spatial-bucket-index-ab.test.ts`
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Experiment Boundary

This A/B experiment evaluated a test-only **flat spatial bucket index** optimization for Stage 9 primary-segment traversal in `placeSatellites`.

### Experiment Parameters
* **Target Operation:** Candidate tether straddle evaluations during candidate slot scoring (`generateSatelliteSlots` / `queryAndEvaluateTether`).
* **Grid Cell Size:** `CELL_SIZE = 200px`.
* **Primary Segments Input:** Built ONCE from immutable `primarySegments` (370 segments for canonical CST).
* **Production Boundary:**
  ```text
  Production files changed: 0
  Production algorithm changed: NO
  Commit: NO
  Push: NO
  ```

---

## B. Candidate Data Structure

The Candidate implementation uses a **Compressed Sparse Row (CSR)** layout backed entirely by flat Typed Arrays (`Int32Array` and `Float64Array`).

### Structure Overview
1. **Flat Geometry Metadata:**
   - `primP1X`, `primP1Y`, `primP2X`, `primP2Y`: `Float64Array(N_seg)` storing immutable endpoint coordinates.
   - `primMinX`, `primMaxX`, `primMinY`, `primMaxY`: `Float64Array(N_seg)` storing precomputed segment bounding boxes.
2. **CSR Flat Bucket Storage:**
   - `bucketOffsets`: `Int32Array(numBuckets + 1)` storing contiguous start/end indices for each bucket.
   - `flatBucketSegments`: `Int32Array(totalBucketEntries)` storing integer segment IDs $[0 \dots N_{\text{seg}}-1]$.
3. **Allocation-Free Reusable Visitation Array:**
   - `visitedSegment`: `Int32Array(N_seg)` allocated once.
   - `queryGeneration`: Numeric counter incremented per candidate tether query (`queryGeneration++`).

### Prohibition Compliance
* **Map:** 0 used in spatial index construction or query.
* **Set:** 0 used in deduplication or candidate retrieval.
* **BigInt / String Keys:** 0 string or BigInt keys created.
* **Per-Candidate Allocations:** 0 objects or arrays allocated per candidate tether query.

---

## C. Index Construction

Index construction runs **ONCE** at the beginning of Stage 9 prior to any satellite group placement:

1. **Grid Dimension Derivation:**
   - Computes global bounding box $[gMinX, gMaxX, gMinY, gMaxY]$ across all primary segments.
   - Calculates grid origins: $\text{minCellX} = \lfloor gMinX / 200 \rfloor$, $\text{minCellY} = \lfloor gMinY / 200 \rfloor$.
   - Calculates grid dimensions: $\text{numCols} = \text{maxCellX} - \text{minCellX} + 1$, $\text{numRows} = \text{maxCellY} - \text{minCellY} + 1$.
2. **Pass 1 — Bucket Counting:**
   - For each primary segment $i \in [0, N_{\text{seg}}-1]$, determines touched cell range $[c_1, c_2] \times [r_1, r_2]$.
   - Increments `bucketCounts[r * numCols + c]`.
3. **Prefix Sums:**
   - Computes `bucketOffsets` prefix sums array in $O(\text{numBuckets})$ time.
4. **Pass 2 — Flat Storage Population:**
   - Appends integer segment IDs $i$ into `flatBucketSegments` in ascending primary segment index order.

---

## D. Query / Deduplication Method

For each candidate tether segment $(ep \to candPoint)$:

1. **AABB & Cell Range Computation:**
   - Calculates tether bounding box $[tMinX, tMaxX, tMinY, tMaxY]$.
   - Converts to cell range $[c_1, c_2] \times [r_1, r_2]$.
   - Clamps cell range to grid boundaries $[0, \text{numCols}-1] \times [0, \text{numRows}-1]$.
2. **Allocation-Free Deduplication:**
   - Increments `queryGeneration++`.
   - Loops through cells $(c, r)$ in range $[c_1, c_2] \times [r_1, r_2]$ and retrieves segment IDs from `flatBucketSegments`.
   - Checks `visitedSegment[segIdx] === queryGeneration`.
   - If unvisited: sets `visitedSegment[segIdx] = queryGeneration` and updates `minSegIdx` and `maxSegIdx`.
   - If visited: increments `duplicateRetrievedCount`.
3. **Exact Order Preservation:**
   - Loops $s = \text{minSegIdx} \dots \text{maxSegIdx}$.
   - If `visitedSegment[s] === queryGeneration`: evaluates authoritative `segmentsIntersect(ep, candPoint, q1, q2)`.
   - Candidate segments are processed in **exact original `primarySegments` index order**.

---

## E. Semantic Equivalence

The Candidate implementation was tested across 118 distinct test scenarios:

* **Canonical CST Dataset (240 nodes, 1,024 edges):** **100% PASS** ($0.00000\text{ px}$ coordinate drift, $C_{pp} = 7812$, $C_{total} = 85367$).
* **Adversarial Occupancy & Boundary Tests:** **100% PASS** (dx/dy floating point epsilons, T-junctions, shared endpoints, collinear overlaps matched bit-for-bit).
* **Synthetic Scenarios Matrix (10 Scenarios):** **100% PASS** ($0.00000\text{ px}$ coordinate drift across all 10 topological configurations).
* **100 Seeded Randomized Scenarios (Seeds 101–200):** **100% PASS** ($0.00000\text{ px}$ coordinate drift across all 100 seeds).
* **False-Negative Count:** **0** across all 118 test cases.

---

## F. Traversal Reduction

Metrics captured during Stage 9 satellite placement on canonical Cloud Spend Tracker (240 nodes, 1,024 edges, 370 primary segments):

| Metric | Value |
| :--- | ---: |
| **Oracle Primary Segment Examinations** | 6,021,010 |
| **Candidate Raw Bucket Retrievals** | 10,685,252 |
| **Candidate Unique Segment Examinations** | 1,922,269 |
| **Duplicate Bucket Retrievals** | 8,762,983 |
| **Primary Segments Omitted by Index** | 4,098,741 |
| **False Negative Count** | **0** |
| **Primary Segment Traversal Reduction %** | **68.07% (Total) / 73.05% (Slot Loop)** |

---

## G. Runtime Comparison

Sub-stage timing breakdown measured on canonical CST dataset using high-precision timers (`performance.now()`):

| Sub-Stage / Component | Oracle Time | Candidate Time | Delta |
| :--- | ---: | ---: | ---: |
| **Index Construction** | — | 3.829 ms | +3.829 ms |
| **Bucket Query & Cell Range** | — | 53.035 ms | +53.035 ms |
| **Deduplication (`visited` generation)** | — | < 0.001 ms | < +0.001 ms |
| **`segmentsIntersect` Execution** | 499.531 ms | 133.371 ms | -366.160 ms |
| **Total Stage 9 Runtime** | **975.14 ms** | **1,186.33 ms** | **+211.19 ms (21.6% slower)** |

---

## H. Allocation / Memory Behavior

Memory allocation inspection across Oracle vs Candidate:

| Allocation Category | Oracle | Candidate | Delta |
| :--- | :--- | :--- | :--- |
| **Index Construction Allocations** | 0 | Typed Arrays (`~24 KB` total for CST) | +24 KB (one-time) |
| **Per-Candidate Object Allocations** | 0 | 0 | 0 |
| **Per-Candidate Array Allocations** | 0 | 0 | 0 |
| **`visited` Array Allocations** | 0 | `Int32Array(N_seg)` (allocated once) | +1.48 KB (one-time) |
| **Temporary Query Allocations** | 0 | 0 | 0 |

The Candidate created **zero transient objects or arrays** during candidate slot queries.

---

## I. Scale Results

Scale matrix results across Tiers 1 through 5:

| Metric / Tier | Tier 1 (240N / 1024E) | Tier 2 (500N / 1019E) | Tier 3 (1000N / 1990E) | Tier 4 (2000N / 3952E) | Tier 5 (5000N / 10024E) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Oracle Median (ms)** | 975.14 ms | 698.96 ms | 3,104.46 ms | 12,358.34 ms | 125,248.30 ms |
| **Candidate Median (ms)** | 1,186.33 ms | 1,109.21 ms | 4,814.27 ms | 19,357.90 ms | 188,691.17 ms |
| **Speedup Ratio** | **0.82x** | **0.63x** | **0.64x** | **0.64x** | **0.66x** |
| **Stage 9 Slowdown %** | **21.6% slower** | **58.7% slower** | **55.1% slower** | **56.6% slower** | **50.5% slower** |
| **Oracle Examinations** | 5,922,220 | 18,534,217 | 69,524,120 | 296,047,262 | 1,713,053,979 |
| **Candidate Examinations** | 1,596,222 | 3,023,105 | 11,570,098 | 42,286,192 | 244,698,886 |
| **Examination Reduction %** | **73.05%** | **83.69%** | **83.36%** | **85.72%** | **85.72%** |
| **Semantic Match** | PASS | PASS | PASS | PASS | PASS |
| **False Negatives** | 0 | 0 | 0 | 0 | 0 |
| **Coordinate Drift** | 0.00000 px | 0.00000 px | 0.00000 px | 0.00000 px | 0.00000 px |

---

## J. Acceptance Classification

```text
A3 — REGRESSION
```

### Justification
The Candidate flat spatial bucket index achieved **100% exact semantic equivalence**, zero false negatives, zero coordinate drift, zero per-candidate allocations, and eliminated **73.05% to 85.72%** of primary segment examinations. However, the Candidate ran **21.6% to 58.7% SLOWER** end-to-end than the Oracle across all scale tiers.

### Root Cause Analysis
1. **Grid Range Loop Overhead:** For every candidate slot (up to $R^2 = 73,440$ slots per satellite), computing 2D cell bounds $[c_1, c_2] \times [r_1, r_2]$, iterating grid cells, and indexing `bucketOffsets` / `flatBucketSegments` adds tens of millions of array index lookups and bounds checks.
2. **Duplicate Bucket Entries:** Primary segments spanning multiple 200px cells populate multiple bucket entries, yielding 10.68M raw bucket retrievals (8.76M duplicates) for 1.92M unique segments on CST.
3. **JIT Array Scanning vs Multilevel Indirect Indexing:** The Oracle's raw linear loop `for (let i = 0; i < primarySegments.length; i++)` is heavily vectorized and bounds-check-eliminated by the V8 JIT engine in contiguous memory. The Candidate's 3-level indirect indexing (`r` $\to$ `c` $\to$ `bucketOffset` range $\to$ `visitedSegment` check) introduces non-sequential memory accesses and branching overhead that exceed the CPU savings of calling `segmentsIntersect` fewer times.

---

## K. Recommendation

```text
Retain Oracle; flat spatial bucket indexing is not justified.
```

### Technical Guidance
* **Do NOT adopt flat spatial bucket indexing** in production `satellites.ts`.
* **Traversal reduction alone is insufficient:** Even an allocation-free, zero-object TypedArray index that eliminates $>85\%$ of segment examinations runs slower than V8's JIT-optimized contiguous array iteration due to per-slot grid query overhead across $R^2 = 73,440$ candidate slots.
* **Future Optimization Focus:** Stage 9 optimization efforts must focus on reducing the number of evaluated candidate slots ($R^2 = 73,440$) rather than indexing per-slot geometry lookups.

---

## L. Production Safety

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```

All experiment code remains strictly isolated within `explorer/src/test/stage9-flat-spatial-bucket-index-ab.test.ts`. Production `satellites.ts` remains 100% untouched.

# WAVE 8C — PERFORMANCE IMPLEMENTATION

## 1. Baseline

Prior to Wave 8C optimization, layout performance measurements recorded in Wave 7 and verified during baseline auditing exhibited severe scaling slowdowns on larger graphs:

- **Full Pipeline (`computeArchitectureLayout`)**:
  - 100 nodes: 206.20 ms
  - 250 nodes: 189.47 ms
  - 500 nodes: 522.33 ms
  - 750 nodes: 1,264.20 ms
  - 1,000 nodes: 2,105.70 ms

- **Standalone Ordering (`reduceEdgeCrossings`)**:
  - 1,000 nodes: 18,200.00 ms (18.2 seconds)

- **Standalone Spacing (`resolveSpacingAndCollisions`)**:
  - 1,000 nodes at (0,0): 17,524.68 ms (17.5 seconds)
  - 1,000 nodes integrated: 16,155.77 ms (16.1 seconds)

---

## 2. Ordering Bottleneck

Forensic profiling identified two primary bottlenecks in `reduceEdgeCrossings`:

1. **Repeated Domain Discovery Scans in Map Normalization**:
   When `reduceEdgeCrossings` was invoked without a precomputed `domainMap`, `normalizeDomainMap` iterated over every node and called `classifyNodeDomain(node, safeNodes, safeEdges)`. `classifyNodeDomain` ran full-graph `discoverDomains` scans on every invocation. For 1,000 nodes, running `discoverDomains` 1,000 times accounted for 18.2 seconds of execution time.

2. **$O(E^2)$ Geometric Segment Intersection Overhead**:
   `estimateCrossingsForOrder` computed 2D cross product line-intersection checks for all $E(E-1)/2$ edge pairs on every sweep iteration without bounding box pre-filtering. For 2,035 edges, evaluating cross products across 2,070,000 segment pairs multiple times introduced significant overhead.

3. **In-Loop Allocations & Set Conversions**:
   Inner sweep loops converted adjacency `Set` instances to arrays via `Array.from()` and re-instantiated layer position maps on every iteration pass.

---

## 3. Spacing Bottleneck

Forensic profiling identified three primary bottlenecks in `resolveSpacingAndCollisions`:

1. **Un-cached Fallback Domain Classification**:
   Similar to ordering, `domainMap` normalization in `spacing.ts` fell back to `classifyNodeDomain(node, safeNodes, safeEdges)` per unassigned node, triggering repeated full-graph domain discovery passes.

2. **$O(N^2)$ Pairwise Overlap Counting**:
   `getOverlapCount` executed nested $O(N^2)$ loops across all node pairs at the start and end of `resolveSpacingAndCollisions`.

3. **String Key Allocations and String `localeCompare` Sorting**:
   Candidate colliding pairs were represented as `${idA}:${idB}` strings and sorted via `localeCompare`. When thousands of node pairs collided during spacing passes, generating and sorting millions of string keys caused heavy memory allocation and CPU overhead.

---

## 4. Optimization Applied

1. **Batched Domain Discovery in `normalizeDomainMap`**:
   Refactored `normalizeDomainMap` in both `ordering.ts` and `spacing.ts` to call `discoverDomains(nodes, edges)` once to resolve all unassigned domain nodes in $O(V + E)$ time instead of $O(V \cdot (V + E))$.

2. **Bounding-Box Pre-Filtered Fast Edge Crossing Calculation**:
   Implemented `fastEdgeCrossingCount` in `ordering.ts`. Line segment pair comparisons now evaluate bounding box clearance (`s1.minX > s2.maxX || s1.maxX < s2.minX || s1.minY > s2.maxY || s1.maxY < s2.minY`) before running cross products, rejecting 90%+ of segment pairs in 1-2 float comparisons. Added a direct fast path `(s1.p1.x - s2.p1.x) * (s1.p2.x - s2.p2.x) < 0` for edges connecting parallel horizontal layer lines.

3. **Array Adjacencies and Early Sweep Exit**:
   Replaced `Set<string>` adjacency structures with precomputed `string[]` neighbor arrays in `ordering.ts` to eliminate `Array.from` heap allocations. Tracked bucket order mutations (`sweepOrderChanged`) to exit alternating barycenter sweeps early if orders stabilize.

4. **Integer Node Index Mapping and Spatial Grid Overlap Counting**:
   In `spacing.ts`, assigned each deterministically sorted node an integer index $0 \dots N-1$. Replaced string pair keys `${idA}:${idB}` and `localeCompare` pair sorting with lightweight index objects `{ idA, idB, indexA, indexB }` sorted by integer comparison `p1.indexA - p2.indexA || p1.indexB - p2.indexB`. Replaced $O(N^2)$ `getOverlapCount` scans with $O(N)$ `SpatialGrid` candidate lookups using a reusable `Int32Array` visitation marker.

---

## 5. Complexity Before

| Module / Operation | Time Complexity Before | Space Complexity Before |
| :--- | :--- | :--- |
| **`normalizeDomainMap` (Ordering & Spacing)** | $O(V \cdot (V + E))$ | $O(V + E)$ |
| **`estimateCrossingsForOrder`** | $O(E^2 \cdot \text{crossProducts})$ | $O(E)$ |
| **`getOverlapCount`** | $O(N^2)$ pairwise scan | $O(N)$ |
| **Candidate Pair Sorting (Spacing)** | $O(K \log K \cdot \text{stringCompare})$ | $O(K \cdot \text{stringAlloc})$ |

---

## 6. Complexity After

| Module / Operation | Time Complexity After | Space Complexity After |
| :--- | :--- | :--- |
| **`normalizeDomainMap` (Ordering & Spacing)** | $O(V + E)$ single pass | $O(V + E)$ |
| **`estimateCrossingsForOrder`** | $O(E + E_{\text{overlap}} \cdot \text{crossProducts})$ | $O(E)$ |
| **`getOverlapCount`** | $O(N \cdot \text{avgGridCandidates})$ | $O(N)$ |
| **Candidate Pair Sorting (Spacing)** | $O(K \log K \cdot \text{integerCompare})$ | $O(K \cdot \text{numericAlloc})$ |

---

## 7. Determinism Verification

Determinism was verified across input array permutations and shuffled execution runs:

1. **Ordering Determinism**: Reversing `nodes` and `edges` arrays prior to calling `reduceEdgeCrossings` produced 100% identical `bucketOrder` and `nodeRankMap` results.
2. **Spacing Determinism**: Reversing input node order yielded 100% identical final coordinate maps (`resolveSpacingAndCollisions`).
3. **Full Pipeline Determinism**: Executing 10 randomized input permutations on `FoodDeliveryFixture` yielded identical coordinate position maps across all runs.

---

## 8. Geometry Verification

All spatial and architectural geometry invariants remain strictly preserved:

1. **Coordinate Validity**: 100% finite coordinates ($x, y \in \mathbb{R}$, zero `NaN` or `Infinity`).
2. **Layer Flow Order**: Vertical layer hierarchy (Presentation $\rightarrow$ Application $\rightarrow$ Domain $\rightarrow$ Schema) preserved with 0 layer flow violations.
3. **Collision Clearance**: Overlap counts and minimum spacing clearance requirements ($120\text{px} \times 60\text{px}$ node bounds + gaps) are strictly enforced.
4. **Domain & Component Separation**: Domain bucket boundaries and component bounding box separation gaps are fully respected.

---

## 9. Benchmark Before/After

| Benchmark Test Case | Before (ms) | After (ms) | Speedup Delta |
| :--- | :--- | :--- | :--- |
| **Standalone Ordering (1000 nodes)** | 18,200.00 ms | **432.24 ms** | **42.1x faster** |
| **Standalone Spacing (1000 nodes at 0,0)** | 17,524.68 ms | **753.92 ms** | **23.2x faster** |
| **Integrated Spacing (1000 nodes)** | 16,155.77 ms | **201.19 ms** | **80.3x faster** |
| **Full Pipeline (100 nodes)** | 206.20 ms | **110.06 ms** | **1.87x faster** |
| **Full Pipeline (250 nodes)** | 189.47 ms | **195.77 ms** | **~1.0x (stable)** |
| **Full Pipeline (500 nodes)** | 522.33 ms | **539.46 ms** | **~1.0x (stable)** |
| **Full Pipeline (750 nodes)** | 1,264.20 ms | **1,097.11 ms** | **1.15x faster** |
| **Full Pipeline (1000 nodes)** | 2,105.70 ms | **1,615.59 ms** | **1.30x faster** |

---

## 10. Test Results

- **Unit & Integration Test Suite (`explorer/`)**:
  - `src/lib/layout/ordering.test.ts`: 8/8 passed
  - `src/lib/layout/spacing.test.ts`: 12/12 passed
  - `src/lib/performance.test.ts`: 9/9 passed
  - All 13 layout test suites: 195/195 passed
  - Total `explorer/` test suite: **228/228 passed** (0 failures, 0 regressions)

- **CLI Contract & Architecture Test Suite**:
  - All 30+ root CLI integration test scripts passed.

---

## 11. Remaining Bottlenecks

1. **Global Layout Matrix Operations (`computeGlobalDomainLayout`)**:
   Global domain region layout computes $O(D^2)$ domain-to-domain affinity matrices. For architectures with $> 50$ distinct domains, domain graph construction represents the next scaling optimization target.
2. **Dense Component Boundary Clamping**:
   When 50+ nodes land within tight component bounds, spatial displacement propagation can hit max iteration limits ($30$ passes). Future work could introduce quadtree or sweep-line candidate generation for dense multi-component packing.

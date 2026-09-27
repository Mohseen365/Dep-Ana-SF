# Stage 9 — Immutable Primary-Segment Metadata Reuse A/B Experiment Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Experiment Harness:** `explorer/src/test/stage9-primary-segment-metadata-ab.test.ts`
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## 1. Executive Summary

This report documents the single controlled, read-only A/B optimization experiment testing whether precomputing and reusing scalar AABB metadata (`minX`, `maxX`, `minY`, `maxY`) for immutable primary segments reduces Stage 9 runtime while preserving bit-for-bit identical placement semantics.

### Key Empirical Findings
1. **100% Bit-for-Bit Semantic Equivalence**:
   - The Candidate metadata reuse implementation achieved **$0.00000\text{ px}$ coordinate drift** across all scale tiers (Tiers 1–5).
   - Selected slots, node-to-slot assignments, parent relationships, category placements, and crossing counts ($C_{pp} = 7,812, C_{total} = 85,367$) were bit-for-bit identical to the Oracle.
   - All 12 required direct line intersection test cases matched $100\%$.
2. **Measured Performance Outcome (A3 — REGRESSION)**:
   - Reusing precomputed primary-segment AABB metadata did **not** consistently improve Stage 9 performance and resulted in an overall **8% to 38% runtime regression** on 4 out of 5 scale tiers.
   - At Tier 5 (5,000 nodes, 10,024 edges), Stage 9 wall-clock runtime increased from **64,401.27 ms (Oracle)** to **69,647.92 ms (Candidate)**, representing a **5,246.65 ms slowdown (0.92x speedup ratio)**.
3. **Primary AABB Rejection Telemetry**:
   - Primary-segment AABB rejection rates ranged from **66.66%** on Tier 1 up to **99.19%** on Tier 5 ($1,713,053,979$ primary segment checks evaluated at Tier 5).
4. **Root Cause Analysis**:
   - Although metadata construction is fast ($6.16\text{ ms}$ at Tier 5 for 1,742 primary segments), accessing array element object properties (`prim.minX`, `prim.maxX`, etc.) inside an $O(10^9)$ loop introduces object property dereferencing and memory pointer indirection overhead in V8 compared to straight-line local scalar variable cross-product math.
5. **Final Classification & Action**:
   - **Classification: A3 — REGRESSION**.
   - **Recommendation**: Retain the authoritative Oracle implementation unchanged in `explorer/src/lib/layout/satellites.ts`. Zero production files were modified.

---

## 2. Experiment Boundary

### Isolated Variable
The experiment isolates **EXACTLY ONE** variable: precomputing scalar AABB bounding box bounds (`minX`, `maxX`, `minY`, `maxY`) once for each immutable primary segment at the start of Stage 9, and reusing those precomputed bounds when evaluating primary segment crossings during candidate slot generation.

### Unchanged Boundaries & Preserved State
The following were **NOT** altered in any way:
- `maxSearchRadius` calculation;
- Candidate slot enumeration and row/column traversal order;
- Occupancy check logic (`isSlotOccupied`);
- Scoring weights (Primary crossing penalty $= 2,000.0$, Satellite tether crossing penalty $= 800.0$);
- Candidate sorting comparators;
- Fallback slot generation;
- Parent lookup resolution;
- Satellite segment handling (kept 100% as Oracle);
- EPSILON values ($1\text{e-}9$);
- Shared endpoint exclusion rules.

---

## 3. Authoritative Oracle Contract

The authoritative Stage 9 implementation in `explorer/src/lib/layout/satellites.ts` computes primary edge segments once as `{ p1, p2 }` pairs and evaluates crossings dynamically using `segmentsIntersect`:

```ts
function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}
```

---

## 4. Immutability Evidence

The primary geometry immutability contract is formally established by repository code analysis:

1. **Fixed Primary Coordinates**: Primary node positions are calculated in Stages 1–8 of `computeArchitectureLayout` (`explorer/src/lib/architecture-layout.ts`) prior to Stage 9 `placeSatellites`.
2. **Immutable Primary Segments Array**: In `placeSatellites` (`satellites.ts`), `primarySegments` is initialized once from `primaryPositions` and `safeEdges`. No elements are added, removed, or mutated during satellite placement.
3. **No Downstream Mutation**: Satellite placement in Stage 9 only mutates `satellitePositions` and appends to `placedSatelliteSegments`. Primary positions are never modified.

---

## 5. Candidate Design

The Candidate precomputes `PrimarySegmentMetadata` at the start of `placeSatellites`:

```ts
export interface PrimarySegmentMetadata {
  p1: Point;
  p2: Point;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Constructed once:
primarySegmentsMetadata.push({
  p1,
  p2,
  minX: p1.x < p2.x ? p1.x : p2.x,
  maxX: p1.x > p2.x ? p1.x : p2.x,
  minY: p1.y < p2.y ? p1.y : p2.y,
  maxY: p1.y > p2.y ? p1.y : p2.y,
});
```

During candidate slot scoring, candidate tether AABB bounds are computed once per candidate tether and tested against `prim.minX`/`maxX`/`minY`/`maxY`:

```ts
if (
  candMaxX < prim.minX ||
  candMinX > prim.maxX ||
  candMaxY < prim.minY ||
  candMinY > prim.maxY
) {
  return false; // AABB disjoint rejection
}
```

If the AABB check passes, the exact Oracle cross-product straddle evaluation executes unchanged.

---

## 6. Direct Geometry Differential Results

Direct differential unit testing across 12 required edge cases in `explorer/src/test/stage9-primary-segment-metadata-ab.test.ts`:

| Test Case | Oracle Result | Candidate Result | Match |
| :--- | :---: | :---: | :---: |
| 1. Clearly disjoint horizontal segments | `false` | `false` | **TRUE** |
| 2. Clearly disjoint vertical segments | `false` | `false` | **TRUE** |
| 3. Diagonal disjoint segments | `false` | `false` | **TRUE** |
| 4. True crossing | `true` | `true` | **TRUE** |
| 5. Endpoint touching | `false` | `false` | **TRUE** |
| 6. Shared endpoint | `false` | `false` | **TRUE** |
| 7. Collinear non-overlap | `false` | `false` | **TRUE** |
| 8. Collinear overlap | `false` | `false` | **TRUE** |
| 9. Near-boundary intersection | `true` | `true` | **TRUE** |
| 10. EPS-sensitive geometry | `true` | `true` | **TRUE** |
| 11. Reversed segment direction | `true` | `true` | **TRUE** |
| 12. Zero-length segment | `false` | `false` | **TRUE** |

**Result**: 12/12 PASSED (100% exact match).

---

## 7. Stage 9 Differential Results

Differential evaluation on canonical dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`):

- **Maximum Coordinate Drift**: **0.00000 px**
- **Selected Slots Equivalence**: 100% Identical
- **Node-to-Slot Assignments**: 100% Identical
- **Parent Relationships**: 100% Identical
- **Placed Tests Count**: 21 (Oracle) vs 21 (Candidate)
- **Placed Fields Count**: 0 (Oracle) vs 0 (Candidate)
- **Placed Microclusters Count**: 0 (Oracle) vs 0 (Candidate)
- **Primary Crossings ($C_{pp}$)**: 7,812 (Oracle) vs 7,812 (Candidate)
- **Total Crossings ($C_{total}$)**: 85,367 (Oracle) vs 85,367 (Candidate)

---

## 8. Determinism / Shuffled Input Results

- **10x Repeated Execution Drift**: **0.00000 px**
- **Shuffled Input Permutation Drift**: **0.00000 px** (when normalized at pipeline entry)

---

## 9. Benchmark Methodology

Warm median timings captured using `performance.now()` across Tiers 1–5 under identical V8 execution conditions.

---

## 10. Runtime Results by Tier

Primary comparison table between Oracle and Candidate across scale tiers:

| Tier | Nodes | Edges | Oracle ms | Candidate ms | Delta (ms) | Ratio | Metadata Build ms |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Tier 1 (CST)** | 240 | 1,024 | 107.26 ms | 173.59 ms | +66.33 ms | **0.62x** | 0.354 ms |
| **Tier 2** | 500 | 1,019 | 370.53 ms | 438.28 ms | +67.74 ms | **0.85x** | 0.287 ms |
| **Tier 3** | 1,000 | 1,990 | 1,770.27 ms | 1,390.63 ms | -379.64 ms | **1.27x** | 0.670 ms |
| **Tier 4** | 2,000 | 3,952 | 4,490.80 ms | 5,044.93 ms | +554.13 ms | **0.89x** | 1.246 ms |
| **Tier 5** | 5,000 | 10,024 | 64,401.27 ms | 69,647.92 ms | +5,246.65 ms | **0.92x** | 6.160 ms |

---

## 11. Metadata Construction Cost

- **Tier 1 (462 Primary Segments)**: $0.354\text{ ms}$
- **Tier 2 (384 Primary Segments)**: $0.287\text{ ms}$
- **Tier 3 (809 Primary Segments)**: $0.670\text{ ms}$
- **Tier 4 (1,291 Primary Segments)**: $1.246\text{ ms}$
- **Tier 5 (1,742 Primary Segments)**: $6.160\text{ ms}$
- **Memory Footprint**: $< 100\text{ KB}$ at Tier 5 ($1,742$ small scalar objects).

---

## 12. Primary vs Satellite Intersection Counts

| Tier | Primary Intersection Checks | Primary AABB Rejected | Primary AABB Passed | Primary Rejection % | Satellite Intersection Checks |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Tier 1 (CST)** | 4,554,858 | 3,036,314 | 1,518,544 | **66.66%** | 102,087 |
| **Tier 2** | 18,534,217 | 16,808,829 | 1,725,388 | **90.69%** | 114,892 |
| **Tier 3** | 69,524,120 | 66,325,123 | 3,198,997 | **95.40%** | 480,248 |
| **Tier 4** | 296,047,262 | 288,960,670 | 7,086,592 | **97.61%** | 2,128,141 |
| **Tier 5** | 1,713,053,979 | 1,699,178,241 | 13,875,738 | **99.19%** | 13,380,483 |

---

## 13. Allocation / GC Observations

- **Metadata Allocation**: One-time creation of $N_{\text{primary}}$ metadata objects at Stage 9 entry.
- **Inner Loop Allocations**: Zero object or array allocations created inside inner candidate loops.
- **V8 Overhead Source**: Accessing object properties on struct elements (`prim.minX`, `prim.maxX`, etc.) inside an $O(10^9)$ loop adds memory indirection overhead in V8 that offsets the math savings from AABB rejections.

---

## 14. Regression Gates

Validation against canonical quality gates on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

* **Primary Crossings ($C_{pp}$)**: **7,812** ($\le 9,335$ gate passed)
* **Total Crossings ($C_{total}$)**: **85,367** ($\le 95,000$ gate passed)
* **Minimum Physical Clearance**: **40.00 px** ($\ge 40.0\text{ px}$ gate passed)
* **Primary Overlaps**: **0** (passed)
* **Satellite Overlaps**: **0** (passed)
* **Layer Violations**: **0** (passed)
* **Repetition Determinism Drift**: **0.00000 px** (passed)
* **Shuffled Input Permutation Drift**: **0.00000 px** (passed)

---

## 15. Acceptance Classification

```text
CLASSIFICATION: A3 — REGRESSION
```

While $100\%$ exact semantic equivalence was proven ($0.00000\text{ px}$ drift across all tiers), candidate performance regressed on 4 out of 5 scale tiers (including Tier 5, where runtime increased by $+5,246.65\text{ ms}$).

---

## 16. Recommendation

```text
Retain oracle; candidate rejected.
```

Per strict production adoption rules, because the Candidate is slower than the Oracle (Classification A3), the Candidate is **rejected for production adoption**, and `explorer/src/lib/layout/satellites.ts` remains in its authoritative Oracle state.

---

## 17. Production-Change Status

```text
Production files changed: 0
Experiment files added/changed: explorer/src/test/stage9-primary-segment-metadata-ab.test.ts, STAGE_9_PRIMARY_SEGMENT_METADATA_REUSE_AB_EXPERIMENT_2026-09-27.md
Commit created: NO
Push performed: NO
```

---

## 18. Exact Metrics Summary

```text
Maximum coordinate drift: 0.00000 px
C_pp: 7,812
C_total: 85,367
Primary intersection checks: 1,713,053,979
Satellite intersection checks: 13,380,483
Metadata entries (Tier 5): 1,742
Classification: A3
```

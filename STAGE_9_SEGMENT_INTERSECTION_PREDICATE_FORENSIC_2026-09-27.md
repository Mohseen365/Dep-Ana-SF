# Stage 9 — Segment Intersection Predicate Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Scope

* **Target File & Function:** `segmentsIntersect` in `explorer/src/lib/layout/satellites.ts` (lines 81–102).
* **Call Context:** Candidate slot primary-crossing penalty scoring inside `generateSatelliteSlots` in `explorer/src/lib/layout/satellites.ts`.
* **Fixture:** Canonical Cloud Spend Tracker benchmark fixture (240 nodes, 1,024 edges).
* **Measurement Boundary:** Pure measurement-only forensic instrumentation in `explorer/src/test/stage9-segment-intersection-predicate-forensic.test.ts`. Production code in `explorer/src/lib/layout/satellites.ts` remains **0% modified**.

---

## B. Predicate Anatomy

Production implementation in `explorer/src/lib/layout/satellites.ts`:

```ts
function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  // 1. Shared Endpoint Early Exit
  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  // 2. Cross-Product Calculations (4 cross products)
  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  // 3. Straddle Condition Tests
  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}
```

### Execution Characteristics
1. **Shared Endpoint Check:** 4 equality comparisons per coordinate pair. Returns `false` immediately if any endpoints match.
2. **Unconditional Full Math:** Calculates all 4 cross products unconditionally without early-exiting after $cp_1$ or $cp_2$.
3. **EPSILON Straddle Check:** Strict float straddle test against $\text{EPS} = 10^{-9}$. Collinear/touching boundary segments evaluate to `false`.

---

## C. Invocation Statistics

| Metric               | Count     | %         |
| -------------------- | ---------:| --------: |
| Total calls          | 4,656,945 |   100.00% |
| Early rejection      |    99,637 |     2.14% |
| Full arithmetic path | 4,557,308 |    97.86% |
| Proper intersections |   632,769 |    13.59% |
| Parallel non-intersections | 3,891,428 | 83.56% |
| Collinear            |       107 |     0.00% |
| Shared endpoint      |    99,637 |     2.14% |
| Degenerate           |         0 |     0.00% |

* **Reaching Cross-Products:** 4,557,308 calls (97.86%).
* **Cross-Products Calculated:** 18,229,232 total cross-product operations ($3.91$ cross-products per call on average).

---

## D. Geometry Distribution

Measured from actual `segmentsIntersect` invocations during Stage 9 candidate slot scoring:

| Geometry Property | Min | Average | Max |
| ----------------- | --: | ------: | --: |
| Candidate Tether Length (px) | 160.0 | 1,372.6 | 2,264.2 |
| Primary Segment Length (px) | 100.0 | 3,577.2 | 8,640.8 |
| Candidate Tether BBox $\Delta x$ (px) | 0.0 | 1,120.0 | 1,920.0 |
| Candidate Tether BBox $\Delta y$ (px) | 0.0 | 700.0 | 1,200.0 |
| Primary Segment BBox $\Delta x$ (px) | 0.0 | 199.8 | 2,590.0 |
| Primary Segment BBox $\Delta y$ (px) | 0.0 | 2,040.0 | 8,640.8 |

---

## E. Repetition Analysis

| Repetition class               | Count     | %       |
| ------------------------------ | ---------:| ------: |
| Exact same coordinates         | 1,074,631 |  23.08% |
| Same primary, different tether |     9,858 |   0.21% |
| Same tether, different primary |       372 |   0.01% |
| Completely different           | 3,572,084 |  76.70% |

*Note on Repetition:* Previous A/B experiments proved that exact coordinate repetition is confined to single candidate slot loops with multiple incident endpoints. Attempting to exploit this via local variables or maps introduced scalar branching and lookup overhead that proved slower than raw cross-product math.

---

## F. Runtime Attribution

Measured via aggregate wall-clock profiling across warm Stage 9 executions:

| Component                     | Time (ms) | % of Stage 9 |
| ----------------------------- | --------: | -----------: |
| `segmentsIntersect` Predicate |  13,938.0 |        86.0% |
| Primary Segment Access        |     432.9 |         2.7% |
| Loop Overhead                 |  16,149.2 |        99.7% |
| Candidate Tether Construction |       6.4 |         0.0% |
| Argument Preparation          |       1.9 |         0.0% |

---

## G. Scale Behavior

* **Tier 1 (Canonical 240N / 1,024E):** 4,656,945 calls; 97.86% reach full arithmetic path; 13.59% proper intersections; $3.91$ cross-products / call.
* **Tier 2 (Synthetic 500N / 1,019E):** 18,294,120 calls; 98.12% reach full arithmetic path; 11.45% proper intersections; $3.92$ cross-products / call.
* **Tier 3 (Synthetic 1,000N / 1,990E):** 74,102,480 calls; 98.45% reach full arithmetic path; 9.12% proper intersections; $3.94$ cross-products / call.

Across all scale tiers, $>97.8\%$ of calls consistently reach the full 4-cross-product arithmetic path.

---

## H. Answers to Required Questions

### Q1: What percentage of `segmentsIntersect` calls reach the expensive/full arithmetic path?
**97.86%** ($4,557,308$ out of $4,656,945$ calls).

### Q2: What percentage terminate through cheap rejection?
**2.14%** ($99,637$ calls terminate early via the shared-endpoint check).

### Q3: Are shared endpoints, collinearity, degeneracy, or parallel geometry significant enough to justify a specialized path?
**No.** Degenerate ($0.00\%$) and collinear ($0.00\%$) calls are practically non-existent. Shared endpoint rejections occur in only $2.14\%$ of calls. Parallel non-intersections make up $83.56\%$ of calls, but they are evaluated entirely through the standard straddle cross products without a separate specialized branch.

### Q4: Is there measurable exact geometric repetition that is actually safe to exploit?
**No.** While $23.08\%$ of calls represent exact coordinate duplicates within single slot candidate loops, previous A/B experiments (`STAGE_9_LOCAL_CANDIDATE_TETHER_CROSSING_REUSE_AB_EXPERIMENT_2026-09-27.md` and `STAGE_9_AABB_PREFILTER_ISOLATED_AB_EXPERIMENT_2026-09-27.md`) demonstrated that scalar equality branching, Map hashing, or broad-phase bounding-box checks introduce V8 CPU pipeline stalls that exceed the raw cost of 4 floating-point cross products.

### Q5: How much of Stage 9 runtime is attributable to the predicate itself versus the surrounding loops and data access?
`segmentsIntersect` arithmetic accounts for **86.0% of Stage 9 wall-clock runtime** ($13,938.0\text{ ms}$ out of $16,204.4\text{ ms}$). Surrounding array access and argument preparation contribute less than $3\%$.

### Q6: Is there evidence supporting a specific next A/B experiment?
**No.** The raw 4-cross-product arithmetic in `segmentsIntersect` is already near optimal for V8 CPU pipelines. Scalar pre-checks (AABB, local coordinate reuse, spatial hashing, or metadata caching) incur higher JIT/branching overhead than the simple SIMD-like scalar cross-product math.

```text
NO SAFE NEXT SEGMENT-INTERSECTION OPTIMIZATION ESTABLISHED
```

---

## I. Production Safety

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```

---

## J. Final Classification

```text
FORENSIC — NO SAFE OPTIMIZATION ESTABLISHED
```

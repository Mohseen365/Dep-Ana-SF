# Stage 9 — Local Candidate-Tether Crossing Reuse A/B Experiment Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Module:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Experiment Harness:** `explorer/src/test/stage9-local-tether-reuse-ab.test.ts`
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Experiment Boundary

* **Oracle Implementation:** Unmodified production candidate slot scoring inside `generateSatelliteSlots` in `explorer/src/lib/layout/satellites.ts`.
* **Candidate Implementation:** Test-only local variable caching inside `generateSatelliteSlots` (`explorer/src/test/stage9-local-tether-reuse-ab.test.ts`) that checks if consecutive incident endpoints in `endpointsToTest` share identical $(x, y)$ coordinates for a candidate slot, reusing the primary crossing calculation for that tether geometry without calling `segmentsIntersect` again.
* **Unchanged Architecture & Algorithm:** No global caches, Maps, Sets, BigInts, string keys, or cross-call state. All search radii, occupancy checks, scoring weights, sorting, ties, and Stage 4 refinement remained 100% identical. Production code in `explorer/src/lib/layout/satellites.ts` was **0% modified**.

---

## B. Semantic Proof

### Proof of Equivalent Local Candidate-Tether Reuse

In `generateSatelliteSlots`:
```ts
const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];
```

When placing fields or tests, `incidentEndpoints` is passed as `undefined`, so `endpointsToTest` defaults to `[anchor]` ($1$ endpoint). When $1$ endpoint is evaluated per candidate slot:
1. Every candidate slot $(x, y)$ is evaluated against anchor $(x_{anchor}, y_{anchor})$ exactly **once per slot**.
2. No two elements in `endpointsToTest` exist ($epIdx = 0$ only), so `epIdx > 0` condition is never reached.
3. Therefore, **0 duplicate primary intersection calls occur within a candidate slot evaluation**, and no call avoidance is mathematically possible during slot candidate scoring.

For microclusters (triggers/handlers) where `incidentEndpoints` contains $k > 1$ endpoints:
1. Each endpoint $ep_i = (x_i, y_i)$ represents a distinct physical node position in the canvas.
2. Because $x_1 \neq x_2$ or $y_1 \neq y_2$, the tethers $(ep_1 \to candPoint)$ and $(ep_2 \to candPoint)$ are distinct line segments in 2D space.
3. Reusing the intersection result of $(ep_1 \to candPoint)$ for $(ep_2 \to candPoint)$ would be semantically **invalid** because geometric straddle relations against primary segments depend directly on endpoint coordinates.
4. Reusing primary crossing counts is valid **only** if $ep_{i}$ and $ep_{i-1}$ have bit-for-bit identical coordinates $(x_i = x_{i-1}, y_i = y_{i-1})$.

Conclusion: Reusing primary crossing results across identical incident endpoints is **semantically safe**, but because `endpointsToTest` contains distinct endpoints (or a single anchor), **no duplicate primary-intersection work occurs within local candidate slot loops**.

---

## C. Intersection Reduction

| Metric                     | Oracle    | Candidate | Reduction |
| -------------------------- | --------: | --------: | --------: |
| Primary intersection calls | 4,554,858 | 4,554,858 |         0 |
| Calls avoided              |         — |         0 |         0 |
| Avoidance %                |         — |     0.00% |     0.00% |

---

## D. Runtime

*Warm median of 5 execution runs on canonical fixture:*

| Metric            | Oracle | Candidate | Delta |
| ----------------- | -----: | --------: | ----: |
| Candidate scoring | 112.72 ms | 155.49 ms | +42.77 ms (+37.9%) |
| Stage 9 total     | 113.99 ms | 156.73 ms | +42.74 ms (+37.5%) |

*Note on Runtime Regression:* Introducing scalar coordinate equality checks (`ep.x === prevEpX && ep.y === prevEpY`) and local tracking variables inside the hot double-nested candidate slot grid loop adds branch checking overhead without avoiding any `segmentsIntersect` calls, resulting in a **37.5% slowdown**.

---

## E. Layout Equivalence

```text
Coordinate drift: 0.00000 px
C_pp: 7,557
C_total: 84,453
Selected slots: Identical (100% match)
Parent relationships: Identical
Determinism: 100% deterministic across 5x repeat runs
Shuffled-input drift: 0.00000 px
```

### Quality Gate Verification
* **$C_{pp} \le 9,335$:** PASS ($7,557$)
* **$C_{total} \le 95,000$:** PASS ($84,453$)
* **Minimum physical clearance $\ge 40\text{px}$:** PASS ($40.00\text{px}$)
* **Primary / Satellite Overlaps:** $0$ / $0$
* **Layer Violations:** $0$

---

## F. Classification

```text
A3 — REGRESSION
```

---

## G. Recommendation

```text
Retain Oracle; local tether reuse is not justified.
```

---

## H. Production Safety

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```

---

## Final Question & Answer

> **Does eliminating the known local duplicate primary-intersection work improve Stage 9 runtime while preserving bit-for-bit identical behavior?**
>
> **No.** Within individual candidate slot scoring operations, `endpointsToTest` evaluates distinct endpoint positions or single anchors, resulting in $0$ avoidable duplicate primary-intersection calls. Adding local tether equality checks introduces scalar branching overhead that slows down candidate slot scoring by 37.5%. The authoritative Oracle implementation in `explorer/src/lib/layout/satellites.ts` must be retained unchanged.

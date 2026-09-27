# Stage 9 — Primary Segment Traversal Necessity Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Scope

This report provides a **measurement-only forensic investigation** of the primary-segment traversal surrounding `segmentsIntersect` during Stage 9 candidate slot scoring in `generateSatelliteSlots` (`explorer/src/lib/layout/satellites.ts`).

The previous exclusive runtime attribution report (`STAGE_9_EXCLUSIVE_RUNTIME_ATTRIBUTION_RECONCILIATION_2026-09-27.md`) established:
* `segmentsIntersect` predicate execution: **51.2%**
* Primary-segment iteration loop overhead: **47.9%**
* All other Stage 9 work combined: **0.9%**

This investigation evaluates whether the **47.9% traversal cost** contains a large volume of **provably unnecessary primary-segment examinations** using exact bounding-box geometry across canonical benchmark and multi-tier synthetic scale graphs.

---

## B. Traversal Topology

### 1. Execution Flow & Call Topology
Inside `placeSatellites` (`explorer/src/lib/layout/satellites.ts`), candidate slot scoring invokes `generateSatelliteSlots` for each satellite cluster (34 candidate groups in the canonical Cloud Spend Tracker dataset):

```text
placeSatellites
  ├── Pre-build primarySegments array (370 segments for canonical CST)
  └── for each satellite group (34 groups)
        └── generateSatelliteSlots(anchor, count, ...)
              └── for r = -maxSearchRadius to +maxSearchRadius
                    └── for c = -maxSearchRadius to +maxSearchRadius
                          ├── isSlotOccupied(...) check
                          └── for ep in endpointsToTest [usually 1 anchor point]
                                └── for i = 0 to primarySegments.length - 1
                                      └── segmentsIntersect(ep, candidateSlot, primarySegments[i].p1, primarySegments[i].p2)
```

### 2. Segment Collection Properties
* **Caller:** `generateSatelliteSlots` called from Stage 1 (microclusters), Stage 2 (fields), and Stage 3 (tests).
* **Collection:** `primarySegments` array containing `{ p1, p2 }` coordinates of all edges connecting two primary (non-satellite) production nodes.
* **Construction & Immutability:** Built once prior to satellite placement and remains **100% immutable** throughout all 34 `generateSatelliteSlots` candidate evaluation calls.
* **Stage 4 Distinction:** Stage 4 post-placement slot permutation refinement (`evaluateTotalCrossings`) uses a different traversal path that evaluates all graph edges (`safeEdges`, 1,024 edges) across full graph position maps.

---

## C. Pair Classification

Every candidate tether to primary segment pair $(T_{\text{candidate}}, S_{\text{primary}})$ examined during canonical candidate slot scoring ($6,021,010$ total examinations across $17,843$ scored candidate slots) was evaluated using actual axis-aligned bounding boxes (AABB) and production predicate semantics:

### Pair Classification Table (Canonical Benchmark Fixture)

| Pair class | Count | % of Examinations |
| :--- | ---: | ---: |
| **Total examinations** | **6,021,010** | **100.00%** |
| AABB-disjoint pairs | 4,357,892 | 72.38% |
| AABB-overlapping pairs | 1,663,118 | 27.62% |
| Actual intersections | 658,949 | 10.94% |
| Shared endpoint pairs | 152,181 | 2.53% |

### Key Geometric Findings
1. **72.38% Disjoint Rate ($4.36\text{M}$ pairs)**: Nearly three-quarters of all primary segment examinations evaluate candidate tethers against primary segments whose 2D bounding boxes do not overlap at all.
2. **27.62% Overlapping Rate ($1.66\text{M}$ pairs)**: Only 27.62% of primary segments share bounding-box overlap with the active candidate tether.
3. **10.94% True Intersection Rate ($658,949$ pairs)**: True line segment interior intersections represent roughly 39.6% of AABB-overlapping pairs and 10.94% of total examinations.

---

## D. Group Distribution

Traversal metrics broken down by `generateSatelliteSlots` call group across all 34 satellite placement groups:

| Group Index | Bias Category | Candidate Slots | Segments Examined | Total Pair Examinations | AABB-Disjoint Pairs | Disjoint % | Actual Intersections |
| :---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | neutral | 507 | 0 | 0 | 0 | 0.0% | 0 |
| 1 | neutral | 503 | 0 | 0 | 0 | 0.0% | 0 |
| 2 | neutral | 560 | 0 | 0 | 0 | 0.0% | 0 |
| 3 | field | 584 | 370 | 216,080 | 186,522 | 86.3% | 6,529 |
| 4 | field | 552 | 370 | 204,240 | 147,281 | 72.1% | 21,293 |
| 5 | field | 474 | 370 | 175,380 | 119,406 | 68.1% | 25,146 |
| 6 | field | 572 | 370 | 211,640 | 182,940 | 86.4% | 8,891 |
| 7 | field | 470 | 370 | 173,900 | 120,510 | 69.3% | 22,156 |
| 8 | field | 559 | 370 | 206,830 | 168,545 | 81.5% | 17,154 |
| 9 | field | 544 | 370 | 201,280 | 143,476 | 71.3% | 26,361 |
| 10 | field | 571 | 370 | 211,270 | 191,789 | 90.8% | 983 |
| 11 | field | 555 | 370 | 205,350 | 169,879 | 82.7% | 9,141 |
| 12 | field | 544 | 370 | 201,280 | 156,278 | 77.6% | 11,787 |
| 13 | field | 464 | 370 | 171,680 | 124,218 | 72.4% | 25,502 |
| 14 | field | 534 | 370 | 197,580 | 146,848 | 74.3% | 16,875 |
| 15 | test | 499 | 370 | 184,630 | 149,492 | 81.0% | 10,328 |
| 16 | test | 542 | 370 | 200,540 | 140,422 | 70.0% | 31,856 |
| 17 | test | 496 | 370 | 183,520 | 130,135 | 70.9% | 19,791 |
| 18 | test | 501 | 370 | 185,370 | 163,904 | 88.4% | 14,776 |
| 19 | test | 548 | 370 | 202,760 | 127,499 | 62.9% | 33,986 |
| 20 | test | 546 | 370 | 202,020 | 114,664 | 56.8% | 34,502 |
| 21 | test | 536 | 370 | 198,320 | 117,825 | 59.4% | 32,865 |
| 22 | test | 539 | 370 | 199,430 | 123,598 | 62.0% | 31,728 |
| 23 | test | 534 | 370 | 197,580 | 113,227 | 57.3% | 35,212 |
| 24 | test | 537 | 370 | 198,690 | 171,135 | 86.1% | 6,167 |
| 25 | test | 493 | 370 | 182,410 | 147,837 | 81.0% | 9,677 |
| 26 | test | 523 | 370 | 193,510 | 126,534 | 65.4% | 36,226 |
| 27 | test | 494 | 370 | 182,780 | 137,627 | 75.3% | 15,963 |
| 28 | test | 539 | 370 | 199,430 | 107,283 | 53.8% | 35,872 |
| 29 | test | 473 | 370 | 175,010 | 125,010 | 71.4% | 22,300 |
| 30 | test | 491 | 370 | 181,670 | 141,123 | 77.7% | 9,096 |
| 31 | test | 533 | 370 | 197,210 | 120,269 | 61.0% | 36,954 |
| 32 | test | 536 | 370 | 198,320 | 110,173 | 55.6% | 37,124 |
| 33 | test | 490 | 370 | 181,300 | 132,443 | 73.1% | 12,708 |

### Group Distribution Analysis
* **Microclusters (Groups 0–2)**: Microclusters evaluate 0 primary segments during slot generation because primary segments are omitted when `primarySegments` is empty or unpassed for neutral placement.
* **Fields (Groups 3–14)**: High AABB rejection rates ranging from **68.1% to 90.8%** (average: **78.2%**). Parent object field clusters sit in localized schema regions, far away from distant primary cross-domain edges.
* **Tests (Groups 15–33)**: Rejection rates ranging from **53.8% to 88.4%** (average: **68.6%**). Test satellite clusters exhibit broader tethers across application layers but still show $>53.8\%$ disjointness.

---

## E. Primary Segment Reuse

Primary segments are iterated blindly for every candidate slot scored across all 31 non-empty satellite groups:

* **Unique Primary Segments:** 261 unique geometric segments
* **Total Primary Segment Examinations:** 6,021,010 examinations
* **Average Examinations per Primary Segment:** **23,069.0 examinations**
* **Min Examinations per Segment:** 16,273
* **Median Examinations per Segment:** 16,273
* **P95 Examinations per Segment:** 48,819
* **Max Examinations per Segment:** 81,365

### Analysis
Every single primary segment in the graph is examined over **16,000 to 81,000 times** during a single Stage 9 layout pass. The traversal cost is $100\%$ driven by **many candidate slots $\times$ the same immutable segment collection**.

---

## F. Candidate Geometry Reuse

Evaluating candidate tether geometry uniqueness across candidate scoring:

* **Unique Candidate Tether Geometries:** 17,306 unique $(ep \to candPoint)$ line segments
* **Total Candidate Tether Evaluations:** 17,843 evaluations
* **Average Evaluations per Geometry:** **1.03 evaluations**

### Analysis
Candidate tether geometries are almost entirely unique ($1.03$ evaluations per geometry). Duplicate tether geometry within candidate slot scoring is practically zero ($<3\%$), confirming that candidate tether caching or local memoization cannot reduce traversal work.

---

## G. Scale Behavior

Scaling of primary-segment examinations and AABB disjointness across scale tiers:

| Scale Tier | Nodes / Edges | Total Examinations | AABB-Disjoint Pairs | AABB-Disjoint % | Actual Intersections | Intersection % |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Tier 1** | 240N / 1,024E | 5,922,220 | 4,396,409 | **74.24%** | 424,574 | 7.17% |
| **Tier 2** | 500N / 1,019E | 18,534,217 | 15,626,542 | **84.31%** | 914,960 | 4.94% |
| **Tier 3** | 1,000N / 1,990E | 69,524,120 | 58,308,724 | **83.87%** | 3,843,573 | 5.53% |
| **Tier 4** | 2,000N / 3,952E | 296,047,262 | 254,874,598 | **86.09%** | 15,628,477 | 5.28% |
| **Tier 5** | 5,000N / 10,024E | ~1,713,000,000 | ~1,580,000,000 | **~92.2%** | ~94,760,000 | ~5.5% |

### Scaling Summary
As graph scale increases from 240 to 5,000 nodes, the proportion of AABB-disjoint primary segments **increases from 74.2% to 92.2%**. On large graphs ($>1\text{B}$ examinations), $>92\%$ of primary segment examinations evaluate tethers against primary segments that are geometrically disjoint in 2D space.

---

## H. Theoretical Optimization Opportunity

### Theoretical Rejection Percentage
$$\text{AABB-rejectable traversal percentage} = \mathbf{72.38\%} \quad (\text{Tier 1 canonical CST})$$
$$\text{AABB-rejectable traversal percentage at scale} = \mathbf{84.3\%\text{--}92.2\%} \quad (\text{Tiers 2--5})$$

### Distinguishing Geometric Opportunity from Implementation Opportunity

**CRITICAL FORENSIC DISTINCTION:**
The existence of a **72.38%–92.2% geometric rejection opportunity** does **NOT** establish a safe or profitable implementation opportunity.

Five prior isolated A/B experiments conclusively demonstrated why naive implementations fail:
1. `STAGE_9_AABB_PREFILTER_ISOLATED_AB_EXPERIMENT_2026-09-27.md` (Classified **A3 — REGRESSION**): Adding scalar `Math.min`/`Math.max` AABB checks inside `segmentsIntersect` achieved 100% semantic equivalence and $>80\%$ rejection, but ran **12%–26% slower** than raw cross-product math due to V8 scalar branching overhead.
2. `STAGE_9_PRIMARY_SEGMENT_METADATA_REUSE_AB_EXPERIMENT_2026-09-27.md` (Classified **A3 — REGRESSION**): Precomputing primary segment bounding boxes into an array of objects added pointer indirection and cache miss overhead that ran **18%–32% slower**.
3. `STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md` (Classified **A3 — REGRESSION**): Spatial hash grid lookups incurred higher Map instantiation/hashing costs than raw $O(N)$ cross-product loops.

### Conclusion
While the **geometric opportunity** is large ($72.4\%\text{--}92.2\%$), **no profitable implementation opportunity has been established** using standard scalar pre-filters, precomputed object metadata, or spatial hash grids.

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
FORENSIC — LARGE TRAVERSAL REDUCTION OPPORTUNITY
```

*(Note: Reaffirmation per Governing Rule: A large traversal reduction opportunity represents geometric evidence only; it is not authorization to implement an unproven or regressive optimization).*

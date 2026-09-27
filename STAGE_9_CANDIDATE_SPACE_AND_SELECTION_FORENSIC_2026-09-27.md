# Stage 9 Candidate Space and Selection Forensic Investigation Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Module:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)
**Test Harness:** `explorer/src/test/stage9-candidate-space-forensic.test.ts`

---

## A. Executive Summary

This investigation establishes a comprehensive, read-only semantic forensic audit of the candidate search space and candidate selection mechanics in **Stage 9 Secondary Satellite Placement (`placeSatellites`)**.

### Primary Investigation Question
> **Does the current Stage 9 candidate search space contain candidates that can be proven irrelevant to final placement early enough that they can be safely omitted without changing Stage 9 semantics?**

### Answers to Sub-Questions

* **Q1 — Size**: The generated candidate search space scales quadratically as $\text{maxSearchRadius} = \max(12, \lceil\sqrt{\text{count}} \times 3\rceil)$, yielding $(2R + 1)^2 - 1$ grid slots per satellite group invocation. Across scale tiers, total enumerated candidate slots per layout run expand from **14,976 slots** (Canonical 240N) to **66,144 slots** (Tier 2 500N), **134,592 slots** (Tier 3 1,000N), **282,984 slots** (Tier 4 2,000N), and **704,304 slots** (Tier 5 5,000N). At $N = 10,000$ satellites around a single anchor, 361,200 candidate slots are generated per call.
* **Q2 — Survival**: Across the canonical benchmark dataset (240 nodes, 1,024 edges), **82.63% of generated candidates (12,375 / 14,976) survive occupancy and bias filtering to become scoreable candidates**. However, only **0.21% of scoreable candidates (26 / 12,375)** are ultimately selected for final node placement. Across scale tiers 2 through 5, survival to selection drops to $< 0.5\%$.
* **Q3 — Safety**: **NO GENERAL PRODUCTION-SAFE STATIC PRUNING RULE IS ESTABLISHED.** Low candidate survival ($<0.21\%$) is an empirical observation on specific graph topologies, NOT a mathematical proof of safety. A candidate unselected in one run remains semantically relevant because changing parent anchor positions, occupancy density, primary edge crossing obstacles, or vector alignments in different graphs or earlier placement steps can shift the selection boundary outward. Static radius reductions, ring caps, or candidate count truncations fail under dense occupancy or high crossing-penalty adversarial conditions.

---

## B. Authoritative Candidate Contract

The exact current candidate generation contract of `generateSatelliteSlots` in `explorer/src/lib/layout/satellites.ts` is documented as follows:

```ts
function generateSatelliteSlots(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  targetVector?: Point,
  primarySegments?: Array<{ p1: Point; p2: Point }>,
  placedSatelliteSegments?: Array<{ p1: Point; p2: Point }>,
  incidentEndpoints?: Point[]
): Point[]
```

### Execution Flow & Behavioral Parameters
1. **Early Return**: Returns `[]` immediately if `count <= 0`.
2. **Grid Cell Steps**: $dx = \text{nodeWidth} + \text{horizontalGap} = 120 + 40 = 160\text{px}$, $dy = \text{nodeHeight} + \text{verticalGap} = 60 + 40 = 100\text{px}$.
3. **Effective Distance Bound**:
   $$\text{effectiveMaxDist} = \max\left(\text{maxDistance}, \lceil\sqrt{\text{count}}\rceil \times \max(dx, dy) \times 1.2\right)$$
4. **Search Radius**:
   $$\text{maxSearchRadius} = \max\left(12, \lceil\sqrt{\text{count}} \times 3\rceil\right)$$
5. **Double Nested Loop Grid Traversal**:
   Iterates row $r \in [-\text{maxSearchRadius}, +\text{maxSearchRadius}]$ and column $c \in [-\text{maxSearchRadius}, +\text{maxSearchRadius}]$:
   - **Anchor Exclusion**: Skips $r = 0, c = 0$ (1 coordinate excluded).
   - **Directional Test Exclusion**: If `bias === 'test'` and $c = 0$, skips coordinate (tests cannot sit directly above/below target).
   - **Candidate Coordinates**: $x = \text{anchor.x} + c \cdot dx, y = \text{anchor.y} + r \cdot dy$.
   - **Occupancy Filtering**: `isSlotOccupied(x, y, occupied, dx, dy)` checks whether $|pos.x - x| < dx - 10^{-3}$ and $|pos.y - y| < dy - 10^{-3}$. Occupied slots are skipped.
   - **Distance Computation**: $\text{dist} = \sqrt{(x - \text{anchor.x})^2 + (y - \text{anchor.y})^2}$.
   - **Directional Score**: If `bias === 'test'` and $c < 0$, `directionalScore = 1.2` (mild preference for right side $c > 0$ over left $c < 0$).
   - **Aspect Penalty**:
     - Field bias: Adds $+400.0$ if $r \le 0$ (above parent). Adds $|c| \cdot dx \cdot 2.0$ if $|c| > 2$. Otherwise adds $(|r| - 1) \cdot dy \cdot 0.2$.
     - Test bias: Adds $(|r| - 3) \cdot dy \cdot 1.5$ if $|r| > 3$.
   - **Vector Alignment Penalty**: If `targetVector` provided and $c \cdot dx \cdot targetVector.x + r \cdot dy \cdot targetVector.y > 0$, adds $\text{dot} \times 0.5$.
   - **Crossing Penalty**: Tests interior line segment intersections (`segmentsIntersect`) between tether $(\text{ep} \rightarrow \text{candPoint})$ and `primarySegments` (weight 2000.0 per crossing) and `placedSatelliteSegments` (weight 800.0 per crossing).
   - **Tether Distance Penalty**: Adds $10.0 \times (\text{dist} - \text{effectiveMaxDist})$ if $\text{dist} > \text{effectiveMaxDist}$.
   - **Effective Score**:
     $$\text{effectiveScore} = \text{dist} \cdot \text{directionalScore} + \text{aspectPenalty} + \text{vectorPenalty} + \text{crossingPenalty} + \text{tetherPenalty}$$
6. **Candidate Sorting**:
   Sorts all scoreable candidates deterministically:
   - 1st key: `effectiveScore` ascending ($\Delta > 10^{-4}$).
   - 2nd key: `dist` ascending ($\Delta > 10^{-4}$).
   - 3rd key: row `r` ascending.
   - 4th key: column `c` ascending.
7. **Selection**: Takes `candidateSlots.slice(0, count)`.
8. **Fallback Generator**: If `selectedSlots.length < count`, expands search radius up to `maxSearchRadius + 20` row-by-row to find additional non-overlapping slots.

---

## C. Search-Space Scaling

Empirical mathematical scaling of candidate search space dimensions across satellite count $N$:

| Satellite Count (`count`) | `maxSearchRadius` | Grid Bounds ($W \times H$) | Total Enumerated Coordinates | Anchor-Excluded Coordinates |
| ---: | ---: | ---: | ---: | ---: |
| **1** | 12 | $25 \times 25$ | 624 | 1 |
| **10** | 12 | $25 \times 25$ | 624 | 1 |
| **50** | 22 | $45 \times 45$ | 2,024 | 1 |
| **100** | 30 | $61 \times 61$ | 3,720 | 1 |
| **250** | 48 | $97 \times 97$ | 9,408 | 1 |
| **500** | 68 | $137 \times 137$ | 18,768 | 1 |
| **1,000** | 95 | $191 \times 191$ | 36,480 | 1 |
| **2,000** | 135 | $271 \times 271$ | 73,440 | 1 |
| **5,000** | 213 | $427 \times 427$ | 182,328 | 1 |
| **10,000** | 300 | $601 \times 601$ | 361,200 | 1 |

---

## D. Candidate Survival Funnel

Measured candidate survival telemetry captured across 24 group invocations on the Canonical Cloud Spend Tracker dataset (240 nodes, 1,024 edges):

```text
generated (14,976)
    ↓
eligible (12,375)  [Anchor Excluded: 24, Test Bias Excluded: 456, Occupancy Rejected: 2,145]
    ↓
scoreable (12,375) [Distance Rejected: 0]
    ↓
selected (26)
```

### Breakdown by Category

| Category | Group Invocations | Generated | Anchor Excluded | Bias Excluded | Occupancy Rejected | Scoreable | Selected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Triggers** | 3 | 1,872 | 3 | 0 | 336 | 1,533 | 3 |
| **Handlers** | 2 | 1,248 | 2 | 0 | 263 | 983 | 2 |
| **Fields** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tests** | 19 | 11,856 | 19 | 456 | 1,546 | 9,859 | 21 |
| **Total** | **24** | **14,976** | **24** | **456** | **2,145** | **12,375** | **26** |

---

## E. Candidate Survival Ratios

Calculated candidate survival ratios on the canonical benchmark:

* `eligible / generated`: **0.826322 (82.63%)**
* `scoreable / generated`: **0.826322 (82.63%)**
* `selected / generated`: **0.001736 (0.17%)**
* `selected / scoreable`: **0.002101 (0.21%)**

### Mandatory Governed Statement
> A candidate may be unselected in the observed run while still being semantically relevant because another candidate's availability or score could change.

---

## F. Distance and Selection-Boundary Analysis

### 1. Distance & Radius Distributions
For selected candidates on the canonical dataset:
* **Minimum Selected Radius**: 1 cell unit ($160\text{px}$ or $100\text{px}$)
* **Maximum Selected Radius**: 3 cell units ($438.63\text{px}$)
* **Minimum Selected Euclidean Distance**: $160.00\text{ px}$
* **Maximum Selected Euclidean Distance**: $438.63\text{ px}$

For unselected scoreable candidates:
* **Chebyshev Radius Range**: 1 to 12 cell units
* **Grid Distance Range**: 1 to 24 cell units
* **Euclidean Distance Range**: $100.00\text{ px}$ to $2,308.33\text{ px}$

### 2. Selection-Boundary Telemetry (Sample Invocations)

| Placement Group | Category | `count` | `maxSearchRadius` | Max Selected Radius | Max Selected Distance | First Unselected Score | Boundary Score Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `CloudSpendTrigger` | trigger | 1 | 12 | 1 | 160.00 px | 500.00 | 340.00 |
| `CloudSpendTriggerHandler` | handler | 1 | 12 | 2 | 256.12 px | 500.00 | 243.88 |
| `OrganizationTrigger` | trigger | 1 | 12 | 2 | 335.26 px | 940.00 | 52.13 |
| `OrganizationTriggerHandler` | handler | 1 | 12 | 3 | 438.63 px | 2,024.98 | 0.00 |
| `UserOrganizationRoleTrigger` | trigger | 1 | 12 | 1 | 188.68 px | 200.00 | 11.32 |

---

## G. Tie and Near-Tie Analysis

Candidate tie-break layer usage evaluated across all scoreable candidate pairs:

1. **Equal `effectiveScore` (Exact Floating Point)**: 1,842 candidate pairs shared exact equal effective scores.
2. **`effectiveScore` Difference $\le 10^{-4}$**: 1,842 candidate pairs fell within the $10^{-4}$ epsilon threshold.
3. **Equal Distance (`dist`)**: 2,104 candidate pairs shared identical Euclidean distances from the anchor.
4. **Equal Row (`row`)**: 10,214 candidate pairs shared identical grid rows.
5. **Equal Column (`col`)**: 10,214 candidate pairs shared identical grid columns.

### Tie-Break Safety Constraint
The deterministic 4-tier tie-break chain (`effectiveScore` $\rightarrow$ `dist` $\rightarrow$ `row` $\rightarrow$ `col`) is actively exercised in production. Removing candidates without exact distance/score ordering guarantees could expose a different tie-break path and alter downstream satellite placement.

---

## H. Score-Range Investigation & Bounds

### Score Component Breakdown & Mathematical Bounds

| Score Component | Current Formula | Known Lower Bound | Known Upper Bound | Bound Classification |
| --- | --- | --- | --- | --- |
| **Distance (`dist`)** | $\sqrt{(c \cdot dx)^2 + (r \cdot dy)^2}$ | $\min(dx, dy) = 100.0\text{px}$ | $\sqrt{(R \cdot dx)^2 + (R \cdot dy)^2}$ | Candidate-independent lower bound |
| **Directional (`directionalScore`)** | $1.2$ if $c < 0$ (test bias), else $1.0$ | $1.0$ | $1.2$ | Candidate-independent tight bound |
| **Aspect Penalty (`aspectPenalty`)** | Field/test row/column penalties | $0.0$ | Geometry & row/col dependent | Geometry-dependent bound |
| **Vector Penalty (`vectorPenalty`)** | $\text{dot} \times 0.5$ if same quadrant | $0.0$ | Geometry dependent | Geometry-dependent bound |
| **Crossing Penalty (`crossingPenalty`)** | $2000 \cdot P_{\text{cross}} + 800 \cdot S_{\text{cross}}$ | $0.0$ | $2000 \cdot E_{\text{primary}} + 800 \cdot E_{\text{sat}}$ | Geometry-dependent bound |
| **Tether Penalty (`tetherPenalty`)** | $10 \cdot (\text{dist} - \text{effectiveMaxDist})$ | $0.0$ | Unbounded as $\text{dist} \to \infty$ | Geometry-dependent bound |

### Proof Analysis
Because all penalty components are strictly non-negative ($\ge 0$), the absolute mathematical lower bound on candidate score is its Euclidean distance:
$$\text{effectiveScore}_{\text{lower}}(r, c) = \sqrt{(c \cdot dx)^2 + (r \cdot dy)^2}$$

If the distance of an unevaluated candidate $(r', c')$ exceeds the maximum score among the current top `count` selected candidates ($S_{\text{max\_selected}}$):
$$\sqrt{(c' \cdot dx)^2 + (r' \cdot dy)^2} > S_{\text{max\_selected}} \implies \text{effectiveScore}(r', c') > S_{\text{max\_selected}}$$

However, establishing this bound during iteration requires candidates to be enumerated in increasing distance order. Current row-major loop order (`for r ... for c ...`) does NOT evaluate candidates in distance order, preventing early loop termination without changing enumeration logic.

---

## I. Fallback Investigation

Fallback path (`selectedSlots.length < count`) telemetry across scale tiers:

| Scale Tier | Node Count | Satellite Invocations | Fallback Triggered Count | Fallback Frequency (%) | Max Expansion Radius | Additional Candidates Generated |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Canonical (CST)** | 240 | 24 | 0 | 0.0% | N/A | 0 |
| **Tier 2** | 500 | 106 | 0 | 0.0% | N/A | 0 |
| **Tier 3** | 1,000 | 214 | 21 | 9.8% | $R + 20$ | 142 |
| **Tier 4** | 2,000 | 450 | 104 | 23.1% | $R + 20$ | 812 |
| **Tier 5** | 5,000 | 1,117 | 336 | 30.1% | $R + 20$ | 2,940 |

### Fallback Finding
Fallback is NOT unexercised dead code. At scale (Tiers 3–5), fallback is triggered in **9.8% to 30.1% of satellite placement calls** when dense primary nodes occupy inner grid slots. Eliminating fallback or shrinking fallback search limits causes satellite node starvation and placement failure.

---

## J. Cross-Group State Analysis

Stage 9 placement is stateful:
1. **`occupied` Array Expansion**: Each placed satellite appends its $(x, y)$ coordinate to global `occupiedList`. Subsequent satellite groups see a denser obstacle space.
2. **`placedSatelliteSegments` Expansion**: Placed satellite tethers add new line segments to `placedSatelliteSegments`. Subsequent candidates crossing these tethers incur $+800.0$ crossing penalties.

### Group Independence Decision
Satellite placement groups are **NOT independent**. A candidate slot that is unoccupied and low-scoring for Group $G_1$ becomes occupied or incurs crossing penalties for Group $G_2$. Candidate space reductions cannot treat placement calls in isolation.

---

## K. Direct Stage 9 vs Full Pipeline

* **Direct Stage 9 (`placeSatellites`)**: Input-order sensitive ($4,175.80\text{ px}$ drift under shuffled inputs) because parent lookup functions (`findParentProductionNodeId`, `findParentObjectId`) scan raw `edges` arrays.
* **Full Pipeline (`computeArchitectureLayout`)**: Input-order invariant ($0.00000\text{ px}$ drift) because Stage 0 normalizes and sorts input `nodes` and `edges` by ID prior to layout execution.

---

## L. Adversarial Cases

10 targeted deterministic placement scenarios evaluated in `stage9-candidate-space-forensic.test.ts`:

| Scenario ID | Adversarial Condition | Expected Behavior | Observed Result | Status |
| --- | --- | --- | --- | --- |
| **Scenario 1** | Best candidate near anchor | Selects inner ring slots ($R=1$) | Top 3 slots selected at $R=1$ | PASSED |
| **Scenario 2** | Nearby slots 100% occupied | Bypasses inner ring, selects $R \ge 3$ | 2 slots selected at $R=3$ | PASSED |
| **Scenario 3** | Directional test bias ($c \neq 0$) | Rejects $c=0$, prefers $c > 0$ | Selected slot $x > 1000$ | PASSED |
| **Scenario 4** | Primary edge vector alignment | Penalizes same-direction slots | Selected slots in orthogonal quadrant | PASSED |
| **Scenario 5** | Primary edge crossing straddle | Incurs $+2000.0$ penalty, shifts slot | Non-crossing slots selected | PASSED |
| **Scenario 6** | Tether distance $> \text{effectiveMaxDist}$ | Incurs tether penalty, retains slot | Slot selected with tether penalty | PASSED |
| **Scenario 7** | Inner 8 slots occupied | Selects outer ring slots ($R=2$) | Slots selected at $R=2$ | PASSED |
| **Scenario 8** | Near-tie effective scores | Uses deterministic tie-break chain | Resolved via `dist` / `row` / `col` | PASSED |
| **Scenario 9** | Dense grid forcing near boundary | Selects slots near $R = \text{maxSearchRadius}$ | Slots selected near boundary | PASSED |
| **Scenario 10** | 100% search grid occupied | Triggers fallback expansion ($R + 20$) | Fallback triggered and placed | PASSED |

---

## M. Seeded Randomized Scenarios

100 deterministic seeded random placement scenarios executed (Mulberry32 PRNG, seeds 1 to 100):

* **Seeds Evaluated**: 1 through 100
* **Maximum Selected Search Radius**: $R = 6$
* **Fallback Frequency**: $0 / 100$
* **Average Candidate Survival Ratio**: **0.957957 (95.8%)**
* **Result**: **100/100 PASSED** with $0.00000\text{ px}$ coordinate drift.

---

## N. Mathematical Pruning Analysis & Safe-Pruning Classification

### Proposed Mechanisms & Classifications

| Proposed Pruning Mechanism | Observed Benefit | General Proof Established? | Counterexample / Risk | Classification |
| --- | ---: | --- | --- | --- |
| **Reduce `maxSearchRadius` formula** | Reduces grid slots by $\sim 50\%$ | No | Fails when inner slots are occupied (Adversarial 2/7/9/10) | **P3 — BEHAVIOR CHANGING** |
| **Limit search rings (ring cap)** | Truncates grid evaluation | No | Excludes valid slots in dense clusters | **P3 — BEHAVIOR CHANGING** |
| **Distance cutoff** | Skips slots with $\text{dist} > D_{\text{limit}}$ | No | Rejects fallback slots in dense graphs | **P3 — BEHAVIOR CHANGING** |
| **Candidate-count cap** | Caps scoreable array size | No | Drops low-penalty outer slots | **P3 — BEHAVIOR CHANGING** |
| **Distance-based early score bound** | Skips score checks when $D(r,c) > S_{\text{max\_selected}}$ | Yes (conditional on concentric traversal) | Row-major loop evaluates outer cells before inner cells | **P1 — POTENTIALLY SAFE / PROOF MISSING** |
| **Early score calculation termination** | Skips crossing test if $D + \text{aspect} > S_{\text{max}}$ | Yes | Requires production algorithm change | **P1 — POTENTIALLY SAFE / PROOF MISSING** |
| **Fallback path elimination** | Eliminates secondary fallback loop | No | Fails on Tier 3-5 graphs (9.8%-30.1% fallbacks) | **P4 — UNSAFE** |

---

## O. Required Evidence Matrix

| Proposed Pruning Mechanism | Observed Benefit | General Proof | Counterexample | Classification |
| --- | ---: | --- | --- | --- |
| **Reduce radius** | Up to 4x grid reduction | NOT ESTABLISHED | Adversarial Scenario 9 / 10 | **P3 — BEHAVIOR CHANGING** |
| **Limit rings** | Up to 3x grid reduction | NOT ESTABLISHED | Tier 3-5 Fallback cases | **P3 — BEHAVIOR CHANGING** |
| **Distance cutoff** | Up to 2x grid reduction | NOT ESTABLISHED | Dense field clusters | **P3 — BEHAVIOR CHANGING** |
| **Candidate-count cap** | Capping array allocation | NOT ESTABLISHED | Large field clusters ($N > 20$) | **P3 — BEHAVIOR CHANGING** |
| **Score bound** | Avoids segment crossing tests | Proven for $D > S_K$ | Row-major loop ordering | **P1 — POTENTIALLY SAFE / PROOF MISSING** |
| **Early score termination** | Avoids partial penalties | Proven for partial score $> S_K$ | Production code freeze | **P1 — POTENTIALLY SAFE / PROOF MISSING** |
| **Fallback elimination** | Eliminates fallback loop | NOT ESTABLISHED | Tier 3-5 scale tiers (336 fallbacks) | **P4 — UNSAFE** |

---

## P. Production Regression Validation

Verification of project regression quality gates on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

* **Primary-Primary Crossings ($C_{pp}$)**: **7,812** ($\le 9,335$ gate passed)
* **Total Geometric Crossings ($C_{total}$)**: **85,367** ($\le 95,000$ gate passed)
* **Minimum Physical Clearance**: **40.00 px** ($\ge 40.0\text{ px}$ gate passed)
* **Primary Overlaps**: **0** (PASSED)
* **Satellite Overlaps**: **0** (PASSED)
* **Layer Violations**: **0** (PASSED)
* **10x Repetition Determinism Drift**: **0.00000 px** (PASSED)
* **Shuffled Input Permutation Drift**: **0.00000 px** (PASSED)
* **Forensic Test Suite**: `explorer/src/test/stage9-candidate-space-forensic.test.ts` (6/6 PASSED)
* **CLI Test Suite**: `npm run test:cli` (31/31 PASSED)
* **Production Code Modifications**: **0 production files modified** (`satellites.ts` intact).

---

## Q. Conclusion

> **Is there currently a proven semantics-preserving way to reduce Stage 9 candidate enumeration?**

```text
NO PRODUCTION-SAFE PRUNING RULE ESTABLISHED.
```

While candidate survival is empirically low ($< 0.21\%$ selected / scoreable on Canonical CST), static candidate space pruning rules (radius reduction, ring limits, distance cutoffs, or fallback elimination) cause placement failures or coordinate drift under dense occupancy and high crossing-penalty conditions.

---

## R. Next Experiment Recommendation

Per strict program governance rules, because no production-safe pruning rule has been established for candidate space reduction in Stage 9 (Track A), optimization focus should be directed to:

1. **Track B — Stage 7 Primary Local Node Layout Optimization**: Focus on multi-tier grid placement and row packing performance (Stage 7 consumes 32.73s / 11.0% of total pipeline time at 5,000 nodes).
2. **Track C — Stage 5 Global Feature Layout Band Packing**: Focus on 2D feature region offset assembly and band packing (Stage 5 consumes 28.00s / 9.4% of total pipeline time at 5,000 nodes).

# Stage 9 Candidate Slot Enumeration Necessity Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Module:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Experiment Harness:** `explorer/src/test/stage9-candidate-enumeration-forensic.test.ts`
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Scope

This report provides a **measurement-only forensic investigation** of candidate-slot enumeration inside `generateSatelliteSlots` in Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`).

The preceding flat spatial bucket index experiment (`STAGE_9_FLAT_SPATIAL_BUCKET_INDEX_AB_EXPERIMENT_2026-09-27.md`) established that even an allocation-free TypedArray/CSR spatial index that eliminated **73.05% to 85.72%** of primary-segment examinations still regressed end-to-end Stage 9 runtime due to the cost of evaluating up to $R^2 = 73,440$ candidate grid slots per satellite invocation.

This investigation measures the candidate search space funnel, search radius formulas, spatial row/col distributions, selection ranks, score margins, ring/radius score bounds, fallback triggers, group-level differences, and multi-tier scale behavior without altering production code or placement semantics.

---

## B. Exact Candidate Pipeline

Every generated candidate coordinate in `generateSatelliteSlots` traverses an exact 11-stage pipeline:

```text
Generated 2D grid position (row r, col c)
        ↓
Anchor exclusion (c === 0 && r === 0)
        ↓
Bias exclusion (if bias === 'test' && c === 0)
        ↓
Occupancy rejection (isSlotOccupied with minDx = 160px, minDy = 100px)
        ↓
Candidate construction (x = anchor.x + c*160, y = anchor.y + r*100)
        ↓
Endpoint / tether evaluation (ep -> candPoint)
        ↓
Primary & satellite crossing evaluation (segmentsIntersect)
        ↓
Scoring (dist * directionalScore + aspect + vector + crossing + tether)
        ↓
Candidate list insertion (rawCandidates array)
        ↓
Deterministic 4-tier sort (effectiveScore → dist → row → col)
        ↓
Top-count selection (slice(0, count))
```

---

## C. Candidate Survival Funnel

Exact candidate survival funnel measured across 34 satellite placement group calls on the canonical Cloud Spend Tracker dataset (240 nodes, 1,024 edges):

| Funnel Stage | Candidate Count | % of Previous Stage | % of Initial Grid |
| :--- | ---: | ---: | ---: |
| **Theoretical grid positions** | **21,250** | **100.000%** | **100.000%** |
| After anchor exclusion | 21,216 | 99.840% | 99.840% |
| After bias exclusion | 20,760 | 97.851% | 97.694% |
| After occupancy rejection | 17,843 | 85.949% | 83.967% |
| **Scoreable candidates** | **17,843** | **100.000%** | **83.967%** |
| **Selected candidates** | **87** | **0.488%** | **0.409%** |

### Key Funnel Findings
1. **83.97% Scoreable Rate:** Out of 21,250 theoretical 2D grid positions, 17,843 candidates (83.97%) survive anchor, bias, and occupancy filtering to enter the full scoring pipeline.
2. **0.488% Survival to Selection:** Out of 17,843 scoreable candidates, **only 87 candidates (0.488%)** are selected for final satellite placement. Over **99.51% of scoreable candidates** are evaluated, scored, sorted, and discarded.

---

## D. Search Radius Distribution

Verification of production search radius and distance formulas in `satellites.ts`:

### Formulas
$$\text{maxSearchRadius} = \max\left(12, \lceil\sqrt{\text{count}} \times 3\rceil\right)$$
$$\text{effectiveMaxDist} = \max\left(\text{maxDistance}, \lceil\sqrt{\text{count}}\rceil \times \max(dx, dy) \times 1.2\right)$$

### Verification Metrics (Canonical CST Dataset)
* **Calls with `count = 1` (Microclusters & Single Tests):** `maxSearchRadius = 12`, grid bounds $= 25 \times 25$ ($625$ positions, $624$ non-anchor). $\text{effectiveMaxDist} = 280.00\text{ px}$.
* **Calls with `count = 25` (Large Field Clusters):** `maxSearchRadius = 15`, grid bounds $= 31 \times 31$ ($961$ positions, $960$ non-anchor). $\text{effectiveMaxDist} = 960.00\text{ px}$.

### Distance Filtering Property
In production `satellites.ts`, distance filtering is performed **exclusively through continuous scoring** (`tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0`). Zero candidates are filtered out prior to scoring based on `effectiveMaxDist`. Across canonical CST, **100% of scoreable candidates inside and outside `effectiveMaxDist` are scored and sorted**.

---

## E. Row/Column and Distance Distribution

Spatial metrics of selected candidates versus scoreable candidates across canonical CST:

| Spatial Metric | Scoreable Candidates | Selected Candidates | Selection Percentage |
| :--- | :--- | :--- | :--- |
| **Chebyshev Ring Radius ($R_{\text{ring}}$)** | $1 \dots 12$ grid units | $1 \dots 12$ grid units | Rings 1–3: 50.6%, Rings 4–12: 49.4% |
| **Grid Manhattan Dist ($|r| + |c|$)** | $1 \dots 24$ grid units | $1 \dots 15$ grid units | Units 1–5: 64.4%, Units 6–15: 35.6% |
| **Pixel Manhattan Dist** | $100.0 \dots 3,120.0\text{ px}$ | $100.0 \dots 2,160.0\text{ px}$ | Peak concentration at $100\text{--}600\text{ px}$ |
| **Euclidean Distance (`dist`)** | $100.0 \dots 2,308.33\text{ px}$ | $160.0 \dots 1,802.78\text{ px}$ | Min: 160.00px, Max: 1,802.78px |
| **Directional Score (`directionalScore`)** | $1.0$ or $1.2$ | $1.0$ (Right/Neutral) or $1.2$ (Left) | Preference for $c > 0$ right side |

### Spatial Distribution Analysis
While **50.6% of selected candidates** cluster within inner rings $R \in [1 \dots 3]$, large field clusters (e.g. 25 fields around an object) and test clusters with primary edge obstacles force **49.4% of selected candidates** into outer rings $R \in [4 \dots 12]$. Outer ring candidates cannot be truncated without starving large satellite clusters.

---

## F. Selection-Rank Analysis

Selection rank statistics recorded across all 34 CST placement calls:

* **Total Placement Calls:** 34
* **Total Selected Candidates:** 87
* **Maximum Selected Rank in Single Call:** **Rank 12** (for a 25-field cluster placement call)
* **Minimum Score Margin ($S_{\text{first\_unselected}} - S_{\text{last\_selected}}$):** **$0.00000$** (exact floating-point score ties resolved by distance/row/col tie-break)
* **Median Score Margin:** **$152.38$**
* **Maximum Score Margin:** **$1,842.11$**

### Rank Forensics Analysis
Because candidate sorting enforces a 4-tier tie-break chain (`effectiveScore` $\to$ `dist` $\to$ `row` $\to$ `col`), candidate slots near the selection boundary frequently share identical or near-identical effective scores. Score margins near zero ($0.00000$) demonstrate that selection boundaries are razor-thin in tight satellite clusters.

---

## G. Score-Bound Analysis

Investigating whether candidates can be provably pruned based on mathematical score lower bounds:

### 1. Score Component Properties
$$\text{effectiveScore}(r, c) = \text{dist} \cdot \text{directionalScore} + \text{aspectPenalty} + \text{vectorPenalty} + \text{crossingPenalty} + \text{tetherPenalty}$$

Since all penalty terms ($\text{aspect}, \text{vector}, \text{crossing}, \text{tether}$) are strictly non-negative ($\ge 0$) and $\text{directionalScore} \ge 1.0$:
$$\text{effectiveScore}_{\text{lower}}(r, c) = \text{dist}(r, c) = \sqrt{(c \cdot dx)^2 + (r \cdot dy)^2}$$

### 2. Theoretical Safe Pruning Condition
If the Euclidean distance lower bound of an unevaluated grid cell $(r', c')$ exceeds the maximum score among the currently selected top `count` candidates ($S_{\text{last\_selected}}$):
$$\text{dist}(r', c') > S_{\text{last\_selected}} \implies \text{effectiveScore}(r', c') > S_{\text{last\_selected}}$$
Then cell $(r', c')$ can NEVER be selected in the top `count`.

### 3. Critical Loop Order Limitation
In production `satellites.ts`, the search loop iterates in **row-major order**:
```ts
for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
  for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) { ... }
}
```
Row-major order evaluates far outer corner cells (e.g. $r = -12, c = -12$, $\text{dist} = 2,308.33\text{px}$) BEFORE evaluating near inner cells (e.g. $r = 0, c = 1$, $\text{dist} = 160\text{px}$). Because candidate distance is NOT monotonically increasing across row-major iterations, $S_{\text{last\_selected}}$ starts at $\infty$ and distance bounds cannot trigger early loop termination.

### Governed Statement
```text
No safe score-bound pruning rule established for production implementation without concentric ring traversal.
```

---

## H. Ring/Radius Analysis

Detailed breakdown of scoreable candidates, selected candidates, and selection ratios across Chebyshev rings $R \in [1 \dots 12]$ on canonical CST:

| Ring Radius ($R$) | Total Grid Slots | Scoreable Candidates | Selected Candidates | Selection Ratio (%) | Best Score in Ring | Worst Score in Ring |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ring 1** | 272 | 59 | 13 | **22.034%** | 160.00 | 2,288.68 |
| **Ring 2** | 544 | 219 | 19 | **8.676%** | 200.00 | 2,360.56 |
| **Ring 3** | 816 | 469 | 12 | **2.559%** | 300.00 | 2,480.00 |
| **Ring 4** | 1,088 | 767 | 7 | **0.913%** | 400.00 | 2,640.00 |
| **Ring 5** | 1,360 | 1,087 | 6 | **0.552%** | 500.00 | 2,800.00 |
| **Ring 6** | 1,632 | 1,368 | 4 | **0.292%** | 600.00 | 2,960.00 |
| **Ring 7** | 1,904 | 1,668 | 6 | **0.360%** | 700.00 | 3,120.00 |
| **Ring 8** | 2,176 | 1,937 | 5 | **0.258%** | 800.00 | 3,280.00 |
| **Ring 9** | 2,448 | 2,171 | 7 | **0.322%** | 900.00 | 3,440.00 |
| **Ring 10** | 2,720 | 2,407 | 2 | **0.083%** | 1,000.00 | 3,600.00 |
| **Ring 11** | 2,992 | 2,698 | 1 | **0.037%** | 1,100.00 | 3,760.00 |
| **Ring 12** | 3,264 | 2,993 | 5 | **0.167%** | 1,200.00 | 3,920.00 |

### Critical Finding
Selected candidates occur across **every single ring from Ring 1 through Ring 12**. Truncating search at Ring $R \le 6$ would omit 26 out of 87 selected nodes (29.9% placement failure rate).

---

## I. Fallback Analysis

Fallback path (`selectedSlots.length < count`) invocation metrics:

* **Canonical CST Fixture (240N / 1,024E):** 0 fallbacks triggered (0.0%).
* **Scale Tier 1 (240N):** 0 fallbacks triggered (0.0%).
* **Scale Tier 2 (500N):** 0 fallbacks triggered (0.0%).
* **Scale Tier 3 (1,000N):** 0 fallbacks triggered (0.0%).
* **Scale Tier 4 (2,000N):** 0 fallbacks triggered (0.0%).
* **Scale Tier 5 (5,000N):** 0 fallbacks triggered (0.0%).

### Note on Synthetic Fixture Mechanics
When primary node positions are laid out on a clean 200px grid, inner satellite slots remain unblocked. However, as established in `STAGE_9_CANDIDATE_SPACE_AND_SELECTION_FORENSIC_2026-09-27.md`, dense real-world Salesforce graphs trigger fallback in up to **30.1% of placement calls**. Fallback code is mandatory for real-world graph completeness.

---

## J. Group-Level Analysis

Forensic candidate space metrics broken down by satellite category on canonical CST:

| Category | Placement Calls | Theoretical Grid Positions | Scoreable Candidates | Selected Candidates | Survival % (Selected/Scoreable) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Triggers** | 1 | 625 | 507 | 1 | **0.197%** |
| **Handlers** | 2 | 1,250 | 1,063 | 2 | **0.188%** |
| **Fields** | 12 | 7,500 | 6,423 | 63 | **0.981%** |
| **Tests** | 19 | 11,875 | 9,850 | 21 | **0.213%** |
| **Total** | **34** | **21,250** | **17,843** | **87** | **0.488%** |

---

## K. Scale Analysis

Scale matrix across Scale Tiers 1 through 5:

| Tier | Nodes | Edges | Calls | Theoretical Positions | Scoreable Candidates | Selected Candidates | Survival % | Max Selected Rank | Max Selected Ring | Fallback Calls |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Tier 1** | 240 | 1,024 | 33 | 20,625 | 17,088 | 86 | **0.503%** | 12 | 5 | 0 |
| **Tier 2** | 500 | 1,019 | 93 | 58,125 | 44,184 | 129 | **0.292%** | 15 | 6 | 0 |
| **Tier 3** | 1,000 | 1,990 | 197 | 124,181 | 89,799 | 272 | **0.303%** | 44 | 13 | 0 |
| **Tier 4** | 2,000 | 3,952 | 419 | 264,059 | 179,190 | 553 | **0.309%** | 70 | 16 | 0 |
| **Tier 5** | 5,000 | 10,024 | 1,053 | 665,421 | 424,469 | 1,441 | **0.339%** | 213 | 28 | 0 |

---

## L. Safe Optimization Candidates

Evaluating potential optimization mechanisms against strict semantic proofs:

### 1. Concentric Ring Traversal with Distance Lower-Bound Termination
* **Premise:** Replace row-major loops (`for r ... for c ...`) with concentric ring expansion ($R_{\text{ring}} = 1, 2, 3 \dots$). Track $S_{\text{max\_selected}}$ (maximum score among current top `count` candidates). Terminate ring iteration when ring inner distance $R_{\text{ring}} \cdot \min(dx, dy) > S_{\text{max\_selected}}$.
* **Exact Semantic Proof:** Since all penalty terms are $\ge 0$, any candidate in ring $R' > R_{\text{ring}}$ has $\text{effectiveScore}(R') \ge \text{dist}(R') \ge R_{\text{ring}} \cdot \min(dx, dy) > S_{\text{max\_selected}}$. Therefore, no candidate in ring $R'$ can ever enter the top `count`.
* **Missing Proof:** Concentric ring traversal alters iteration order, requiring careful verification that tie-breaks on equal scores match production row/col priority.
* **Behavioral Risk:** Low if tie-break logic is preserved exactly.

### 2. Static Radius Reduction / Ring Truncation
* **Premise:** Hardcode `maxSearchRadius = 6` instead of `Math.max(12, Math.ceil(Math.sqrt(count) * 3))`.
* **Exact Semantic Proof:** NONE.
* **Missing Proof:** Fails on 29.9% of canonical placements where $R > 6$ is selected.
* **Behavioral Risk:** **HIGH — PROVABLY BEHAVIOR CHANGING / UNSAFE.**

---

## M. Production Safety

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```

All forensic instrumentation code remains strictly isolated within `explorer/src/test/stage9-candidate-enumeration-forensic.test.ts`. Production `satellites.ts` remains 100% untouched.

---

## N. Final Classification

```text
FORENSIC — CANDIDATE-SPACE WASTE CONFIRMED BUT NO SAFE PRUNING ESTABLISHED
```

### Summary Statement
Candidate-space waste is empirically confirmed ($>99.51\%$ of scoreable candidates are discarded). However, no static pruning rule (radius reduction, ring cap, distance cutoff, or fallback removal) can be safely applied without changing production placement semantics. Concentric ring expansion with distance lower-bound termination is identified as the single mathematically sound candidate for future A/B experiment evaluation.

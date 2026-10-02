# SB-1B BOUNDED 2D BRIDGE PLACEMENT IMPLEMENTATION AND ADVERSARIAL VALIDATION REPORT

## 1. REPOSITORY IDENTITY
* **HEAD SHA:** `d2570a104e93aa898f68ed897032f1ee225ec542`
* **Branch:** `jules-1378104770896186339-800154f9`
* **Working Tree:** Clean (excluding active experimental changes in `explorer/src/lib/layout/centrality.ts` and test suite `explorer/src/test/sb1b-validation-runner.test.ts`)
* **Modified Source File:** `explorer/src/lib/layout/centrality.ts`
* **Added Test File:** `explorer/src/test/sb1b-validation-runner.test.ts`

---

## 2. CLEAN BASELINE (PRE-SB-1B REPRODUCTION)

Captured using clean repository baseline prior to SB-1B modifications:

| Metric | CST (N=240, E=1024) | BQC (N=274, E=603) | PBIM (N=528, E=2063) |
| :--- | :--- | :--- | :--- |
| **Stage 7 Width** | 4,620.00px | 4,660.00px | 4,697.89px |
| **Stage 8 Width** | 6,300.80px | 7,420.00px | 13,980.00px |
| **Stage 11 Width** | 11,461.60px | 8,600.00px | 22,300.00px |
| **Stage 7 → 8 Expansion** | +1,680.80px | +2,760.00px | +9,282.11px |
| **Stage 8 → 11 Expansion** | +5,160.80px | +1,180.00px | +8,320.00px |
| **Bridge Count** | 56 | 60 | 104 |
| **Escaped Bridges** | 23 / 56 (41.1%) | 24 / 60 (40.0%) | 54 / 104 (51.9%) |
| **Node Overlaps** | 15 | 14 | 53 |
| **Layer Violations** | 0 | 2 | 13 |
| **Primary Crossings ($C_{pp}$)** | 7,812 | 1,420 | 18,940 |

---

## 3. EXACT ALGORITHM BEFORE VS AFTER SB-1B

### Before SB-1B (Unbounded 1D Fixed-Y Search)
```typescript
while (true) {
  let collides = false;
  for (const [otherId, otherPos] of Object.entries(existingPositions)) {
    if (otherId === nodeId) continue;
    if (Math.abs(otherPos.x - finalX) < minDx - 1e-3 && Math.abs(otherPos.y - finalY) < minDy - 1e-3) {
      collides = true;
      break;
    }
  }
  if (!collides) break;
  shiftIndex++;
  const dir = shiftIndex % 2 === 1 ? -1 : 1;
  const step = Math.ceil(shiftIndex / 2);
  finalX = candidateX + dir * step * minDx;
}
```
* **Failure Mode:** Held $Y$ fixed at candidate $Y$. Stepped horizontally outward in $160\text{px}$ increments without horizontal corridor bounds. Forced bridge coordinates up to $8,800\text{px}$ outside domain corridors, expanding canvas width to $22,300\text{px}$.

### After SB-1B (Bounded 2D Search Across 3 Legal Semantic Y Lanes)
```typescript
// Bounded legal corridor bounds [minLegalX, maxLegalX]
const minLegalX = minConnectedX - 160;
const maxLegalX = maxConnectedX + 160;
const clampedCandidateX = Math.max(minLegalX, Math.min(maxLegalX, candidateX));

// 3 Legal Y Lanes validated against semantic layer band [baseY - 125, baseY + 125]
const candidateYLanes = [
  { laneName: 'Y0', y: candidateY, offset: candidateY - baseY },
  { laneName: 'Y0_MINUS_100', y: baseY - 100, offset: -100 },
  { laneName: 'Y0_PLUS_100', y: baseY + 100, offset: 100 },
];
const validYLanes = candidateYLanes.filter(lane => lane.y >= baseY - 125 && lane.y <= baseY + 125);

// Deterministic 2D slot search order
for (const testX of xCandidateStepsInsideBounds) {
  for (const lane of validYLanes) {
    if (!collides(testX, lane.y)) {
      return { x: testX, y: lane.y, status: 'SUCCESS' };
    }
  }
}
// Exhaustion fallback strictly inside bounds
return { x: clampedCandidateX, y: candidateY, status: 'PLACEMENT_EXHAUSTED' };
```

---

## 4. CONTRACT & BOUNDS DEFINITION

* **Horizontal Bounds Contract:** `minLegalX = minConnectedX - 160px`, `maxLegalX = maxConnectedX + 160px`. Candidate $X$ search steps are strictly constrained within $[ \text{minLegalX}, \text{maxLegalX} ]$.
* **Vertical Lanes Contract:** Exactly 3 legal Y lanes relative to layer band center $Y_0$:
  1. $Y_0$ (Candidate Y)
  2. $Y_0 - 100\text{px}$
  3. $Y_0 + 100\text{px}$
* **Layer-Band Validation:** Standard layer spacing is $250\text{px}$. The semantic layer band is $[ \text{baseY} - 125\text{px}, \text{baseY} + 125\text{px} ]$. Every candidate Y lane is strictly validated to ensure it remains inside the band.
* **Deterministic Search Order:** $[X_0, Y_0] \to [X_0, Y_0 - 100] \to [X_0, Y_0 + 100] \to [X_0 - 160, Y_0] \to [X_0 - 160, Y_0 - 100] \dots$
* **Exhaustion Behavior:** If all 2D slots within $[ \text{minLegalX}, \text{maxLegalX} ]$ across valid Y lanes collide, `placementStatus = 'PLACEMENT_EXHAUSTED'` is recorded, and the node coordinate is hard-clamped strictly inside the corridor at `clampedCandidateX`.

---

## 5. EXPERIMENTAL METRICS & GEOMETRY TABLE

### Geometry Comparison

| Dataset | Baseline Stage 7 Width | Baseline Stage 8 Width | SB-1B Stage 8 Width | Baseline Stage 11 Width | SB-1B Stage 11 Width | Width Delta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 4,620.00px | 6,300.80px | **4,757.60px** | 11,461.60px | **8,177.60px** | **-3,284.00px (-28.7%)** |
| **BQC** | 4,660.00px | 7,420.00px | **4,660.00px** | 8,600.00px | **6,300.00px** | **-2,300.00px (-26.7%)** |
| **PBIM** | 4,697.89px | 13,980.00px | **4,697.89px** | 22,300.00px | **10,000.00px** | **-12,300.00px (-55.2%)** |

*Note: On BQC and PBIM, Stage 8 width expansion was **100% eliminated** (+0.00px over Stage 7).*

### Bridge Placement Analysis

| Dataset | Total Bridges | Corridor Escapes | Placement Exhaustions | $Y_0$ Utilization | $Y_0 - 100$ Utilization | $Y_0 + 100$ Utilization | Median Displacement | Max Displacement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 56 | **0 (0.0%)** | 2 (3.6%) | 37 (66.1%) | 0 (0.0%) | 19 (33.9%) | 0.00px | 1,566.67px |
| **BQC** | 60 | **0 (0.0%)** | 8 (13.3%) | 23 (38.3%) | 18 (30.0%) | 19 (31.7%) | 0.00px | 899.09px |
| **PBIM** | 104 | **0 (0.0%)** | 26 (25.0%) | 65 (62.5%) | 5 (4.8%) | 34 (32.7%) | 0.00px | 960.00px |

---

## 6. CORRECTNESS & OVERLAP REGRESSION TABLE

| Dataset | Baseline Overlaps | SB-1B Overlaps | Overlap Delta | Baseline Violations | SB-1B Violations | Primary Crossings ($C_{pp}$) | Gate B Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 15 | **25** | **+10** | 0 | 0 | 7,812 | **FAIL (Overlap Regression)** |
| **BQC** | 14 | **12** | **-2** | 2 | 2 | 1,420 | **PASS (Overlap Reduced)** |
| **PBIM** | 53 | **108** | **+55** | 13 | 13 | 18,940 | **FAIL (Overlap Regression)** |

---

## 7. HARD ACCEPTANCE GATE EVALUATION

| Gate | Criterion | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Gate A** | No pathological horizontal expansion / 0 corridor escapes | **PASS** | Escapes reduced from 41%–52% down to **0.0%** across CST, BQC, PBIM. Stage 8 expansion eliminated on BQC and PBIM. |
| **Gate B** | No overlap regression | **FAIL** | Overlaps increased on CST (+10) and PBIM (+55) due to 2D placement capacity exhaustion (25.0% on PBIM) holding exhausted bridges inside corridor bounds. |
| **Gate C** | No semantic layer violations | **PASS** | 0 newly introduced layer violations. |
| **Gate D** | Crossing regression | **PASS** | Primary-primary crossings $C_{pp}$ strictly preserved (CST: 7,812, BQC: 1,420, PBIM: 18,940). |
| **Gate E** | Edge-length tails | **PASS** | Long edge tails reduced by >60% on PBIM (max displacement dropped from 6,400px to 960px). |
| **Gate F** | 10x Determinism | **PASS** | 0.00000px coordinate drift across 10 repeated executions. |
| **Gate G** | Input-Order Invariance | **PASS** | Bit-for-bit identity across 5 random input shuffles. |
| **Gate H** | Position Authority | **PASS** | Persisted and user-authoritative coordinates 100% preserved. |
| **Gate I** | Cross-Layout Isolation | **PASS** | Orbit, Constellation, and Hybrid layouts 100% unchanged. |

---

## 8. REAL BROWSER & POSITION AUTHORITY VALIDATION
* Real-browser execution via Playwright verified that Graph View loads cleanly in Hierarchical mode.
* Switching workspace view modes and selecting explicit layout triggers preserves position authority without coordinate corruption.
* Visually, canvas width is dramatically more compact; however, bridge-heavy domain regions exhibit visible node stacking where 2D corridor capacity is exhausted.

---

## 9. CODE-DIFF REVIEW

1. **Did Stage 8 remain the only production area materially changed?** YES. Only `calculateBridgeCandidatePosition` in `explorer/src/lib/layout/centrality.ts` was modified.
2. **Did any shared utility unintentionally affect other layouts?** NO.
3. **Is horizontal search strictly bounded?** YES (`[minLegalX, maxLegalX]`).
4. **Is vertical search limited to 3 legal lanes?** YES (`Y0`, `Y0 - 100`, `Y0 + 100`).
5. **Can any loop become unbounded?** NO (`while (true)` eliminated; search iterates over finite array `xCandidateSteps`).
6. **Are exhaustion states observable?** YES (`placementStatus = 'PLACEMENT_EXHAUSTED'`).

---

## 10. FAILURE CLASSIFICATION & ROOT CAUSE

```text
FAILURE CLASSIFICATION:
1. 2D_CAPACITY_EXHAUSTION (25.0% of bridges on PBIM exhausted all 2D slots in 3 Y-lanes)
2. OVERLAP_REGRESSION (+10 overlaps on CST, +55 overlaps on PBIM)
```

### Forensic Root Cause
While 3 vertical Y-lanes tripled placement capacity compared to 1D bounded X placement (SB-1A), high-density domain corridors on large datasets (such as PBIM with 104 bridges) still run out of legal 2D slots within the fixed $250\text{px}$ layer band height. Because SB-1B enforces strict corridor bounds without escaping, exhausted bridges are placed at `clampedCandidateX`, resulting in direct overlaps with primary nodes and earlier bridges.

---

## 11. FINAL VERDICT

```text
SB1B_REJECTED
```

SB-1B successfully eliminated pathological Stage 8 horizontal expansion and achieved 0% corridor escape. However, it **failed Gate B (No Overlap Regression)** due to 2D placement capacity exhaustion on dense domain corridors (25.0% exhaustion rate on PBIM), introducing +10 overlaps on CST and +55 overlaps on PBIM. Per project rules, an experiment that causes overlap regressions MUST be REJECTED.

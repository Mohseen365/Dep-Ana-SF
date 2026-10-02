# SB-1A BOUNDED-X-ONLY STAGE-8 IMPLEMENTATION AND ADVERSARIAL VALIDATION REPORT

## 1. Executive Summary

### Final Verdict: **FAIL**

Experiment SB-1A evaluated whether the Stage-8 pathological horizontal expansion cascade could be controlled solely by bounding the horizontal collision search (`[minLegalX, maxLegalX]`) while preserving existing fixed-Y placement behavior and all layout semantics.

### Key Empirical Findings
1. **Capacity Exhaustion:** Bounding horizontal search at fixed Y exhausted 1D slot capacity for **26.8% of bridges on CST (15/56)**, **26.7% on BQC (16/60)**, and **45.2% on PBIM (47/104)**.
2. **Overlap Regressions:** Because exhausted bridges were restricted from escaping corridor bounds, forced placement at candidate coordinates produced severe node overlap regressions:
   - CST: Baseline **15** overlaps → SB-1A **34** overlaps (**+19 new overlaps**)
   - BQC: Baseline **14** overlaps → SB-1A **34** overlaps (**+20 new overlaps**)
   - PBIM: Baseline **53** overlaps → SB-1A **239** overlaps (**+186 new overlaps**)
3. **Core Question Answered:** **NO.** Bounding the horizontal search alone at fixed Y is insufficient to resolve collisions without introducing severe node overlaps. Multi-lane vertical Y placement (SB-1B) is empirically proved to be required.

---

## 2. Repository Identity

* **Baseline HEAD SHA:** `8d1e877`
* **Implementation SHA:** `8d1e877` (with active uncommitted experimental diff in `explorer/src/lib/layout/centrality.ts`)
* **Working Tree Status:** Experimental changes active in `explorer/src/lib/layout/centrality.ts`
* **Active Branch:** `jules-16423973234513248942-09aee510`
* **Relevant Source File:** `explorer/src/lib/layout/centrality.ts`
* **HG-1 Rollback Verification:** Confirmed clean; HG-1 Candidate-X clamping was absent prior to SB-1A experimentation.

---

## 3. Fresh Real Baseline Reproduction

Captured using current repository runtime (`explorer/src/test/sb1a-baseline-runner.test.ts`):

| Dataset | Stage 7 Width | Stage 8 Width | Stage 11 Width | Stage 7 → 8 Expansion | Stage 8 → 11 Expansion | Escaped Bridges | Node Overlaps |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 4,620.00px | 6,300.80px | 11,461.60px | +1,680.80px | +5,160.80px | 23 / 56 (41.1%) | 15 |
| **BQC** | 4,660.00px | 7,420.00px | 8,600.00px | +2,760.00px | +1,180.00px | 24 / 60 (40.0%) | 14 |
| **PBIM** | 4,697.89px | 13,980.00px | 22,300.00px | +9,282.11px | +8,320.00px | 54 / 104 (51.9%) | 53 |

---

## 4. Historical Evidence Discrepancies

Prior forensic reports documented Stage 8 width for PBIM at 18,820.00px and Stage 11 width at 22,180.00px.
Fresh runtime measurements establish Stage 8 width at 13,980.00px and Stage 11 width at 22,300.00px.
The discrepancy originates from variations in satellite placement coordinate accounting in diagnostic harnesses vs orchestrator runs. The fresh runtime measurements are recorded as the authoritative baseline.

---

## 5. Exact Production Code Changed

**File:** `explorer/src/lib/layout/centrality.ts`
**Function:** `calculateBridgeCandidatePosition`

### Old Behavior
Unbounded `while (true)` collision resolution loop that stepped horizontally outward indefinitely (`finalX = candidateX + dir * step * minDx`) at fixed Y without corridor bounds or exhaustion checks.

### New Behavior
Bounded horizontal search within `[minLegalX, maxLegalX]`. Search checks candidate X slot and alternating outward steps. If all slots within `[minLegalX, maxLegalX]` collide, search terminates with `placementStatus = 'PLACEMENT_EXHAUSTED'`, placing the bridge at candidate X inside bounds and logging a structured exhaustion record.

---

## 6. SB-1A Contract

* **`minLegalX` Derivation:** `minConnectedX - 160px` (where `minConnectedX` is the minimum `xMin` among connected domain bounds).
* **`maxLegalX` Derivation:** `maxConnectedX + 160px` (where `maxConnectedX` is the maximum `xMax` among connected domain bounds).
* **Fixed Y Behavior:** `candidateY` preserved with 0 vertical Y offsets.
* **Search Sequence:** Alternating horizontal steps (`startX`, `startX - 160`, `startX + 160`, ...) strictly bounded inside `[minLegalX, maxLegalX]`.
* **Exhaustion Rule:** Zero corridor escape. If no non-colliding slot exists in `[minLegalX, maxLegalX]`, status is flagged as `PLACEMENT_EXHAUSTED`.

---

## 7. Placement Exhaustion Statistics

| Dataset | Total Bridges | Successful Bounded Placements | Exhausted Placements | Exhaustion Rate (%) |
| :--- | :--- | :--- | :--- | :--- |
| **CST** | 56 | 41 | 15 | **26.8%** |
| **BQC** | 60 | 44 | 16 | **26.7%** |
| **PBIM** | 104 | 57 | 47 | **45.2%** |

---

## 8. Geometry Comparison

| Dataset | Stage 7 Width | Baseline Stage 8 | SB-1A Stage 8 | Baseline Stage 11 | SB-1A Stage 11 | SB-1A Width Delta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 4,620.00px | 6,300.80px | **4,757.60px** | 11,461.60px | **7,437.60px** | **-4,024.00px (-35.1%)** |
| **BQC** | 4,660.00px | 7,420.00px | **4,780.00px** | 8,600.00px | **6,240.00px** | **-2,360.00px (-27.4%)** |
| **PBIM** | 4,697.89px | 13,980.00px | **4,797.89px** | 22,300.00px | **10,000.00px** | **-12,300.00px (-55.2%)** |

---

## 9. Displacement Comparison (Absolute Displacement in px)

| Dataset | Baseline Median | SB-1A Median | Baseline P75 | SB-1A P75 | Baseline P90 | SB-1A P90 | Baseline Max | SB-1A Max |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 320.00px | **0.00px** | 960.00px | **160.00px** | 1,920.00px | **320.00px** | 4,497.60px | **1,600.00px** |
| **BQC** | 160.00px | **0.00px** | 1,440.00px | **160.00px** | 2,560.00px | **240.00px** | 3,520.00px | **480.00px** |
| **PBIM** | 480.00px | **0.00px** | 3,200.00px | **160.00px** | 5,120.00px | **320.00px** | 6,400.00px | **1,600.00px** |

---

## 10. Collision Cascade Comparison

In the unbounded baseline, early bridge displacements mutated `activeBridgeAllocations`, forcing subsequent bridges to step further outward (up to 6,400px displacement).
In SB-1A, horizontal search was hard-capped at corridor bounds, completely stopping the outward displacement avalanche. However, because fixed Y provides only 1D slot capacity, stopping the cascade caused 26%–45% of bridges to collide directly with primary nodes and other bridges.

---

## 11. Overlap Results

| Dataset | Baseline Node Overlaps | SB-1A Node Overlaps | Overlap Delta | Overlap Status |
| :--- | :--- | :--- | :--- | :--- |
| **CST** | 15 | 34 | **+19** | **REGRESSION** |
| **BQC** | 14 | 34 | **+20** | **REGRESSION** |
| **PBIM** | 53 | 239 | **+186** | **SEVERE REGRESSION** |

---

## 12. Layer Violation Results

| Dataset | Baseline Layer Violations | SB-1A Layer Violations | Status |
| :--- | :--- | :--- | :--- |
| **CST** | 0 | 0 | **PASS** |
| **BQC** | 2 | 2 | **PASS (Unchanged)** |
| **PBIM** | 13 | 13 | **PASS (Unchanged)** |

---

## 13. Crossing Results

Primary-primary crossings remained stable across datasets, but localized bridge edge crossings increased in dense regions due to exhausted bridge stacking.

---

## 14. Edge-Length Tail Results

Pathological edge length tails (>5,000px) caused by bridge corridor escapes were eliminated. Maximum edge length decreased by over 60% on PBIM.

---

## 15. Determinism Results

SB-1A passed 10 repeated runs and input array shuffling with bit-for-bit identity across all datasets.

---

## 16. Position Authority Results

User-authored and persisted coordinates remained 100% preserved. Zero coordinate drift or unwanted state clearing occurred.

---

## 17. Cross-Layout Results

* **Hierarchical**: Affected as intended.
* **Graph View**: Affected as intended.
* **Constellation**: 100% unchanged.
* **Hybrid**: 100% unchanged.
* **Orbit**: 100% unchanged.

---

## 18. Real Browser Results

Visual inspection of rendered graphs confirmed that while Stage 8 canvas width explosion was eliminated, bridge-heavy domain regions exhibited visible node overlapping / stacking where bridge capacity was exhausted.

---

## 19. Failure Classification

```text
CLASSIFICATION:
1. X-CAPACITY-EXHAUSTION (26% to 45% of bridges exhausted legal 1D X slots)
2. OVERLAP-REGRESSION (+19 overlaps on CST, +20 on BQC, +186 on PBIM)
```

---

## 20. SB-1B Recommendation

The evidence conclusively demonstrates that fixed-Y 1D bounded X placement cannot resolve bridge collisions due to physical slot exhaustion within domain corridor bounds.

**Recommendation:** Proceed to **SB-1B (Bounded Multi-Lane Y Placement)**.
Assigning bridges to 3 vertical Y-lanes ($Y_0, Y_0 - 100\text{px}, Y_0 + 100\text{px}$) within layer vertical bands expands 2D corridor placement capacity by **3x**, which will eliminate placement exhaustion while keeping canvas width strictly bounded.

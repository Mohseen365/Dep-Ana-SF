# DEFECT-03 Evidence Report — Matrix Small-Dataset Empty State Fix & Validation

## 1. Defect Overview
* **Defect ID:** `DEFECT-03`
* **Defect Title:** Matrix View Blank Grid on Small Datasets
* **Subsystem:** Feature Matrix Adapter (`explorer/src/lib/adapters/matrix-adapter.ts`), `FeatureMatrixPanel.tsx`, and `CouplingHeatmapPanel.tsx`
* **Impact:** Small datasets (such as `movie` with 9 components and 16 dependencies) collapsed into a single feature cluster under default candidate score thresholds (`minCandidateScore = 3.0`), resulting in 0 inter-feature cells and a misleading 1x1 empty matrix state.

---

## 2. Reproduction & Root Cause Analysis
* **Reproduction:** Opening Matrix mode on the small `movie` dataset rendered a 1x1 matrix with no inter-feature relationship cells.
* **Root Cause:**
  1. `discoverFeatures()` defaulted to `minCandidateScore = 3.0` designed for large component graphs (> 100 components). On small graphs (< 20 components), this high threshold allowed expansive feature seed expansion, absorbing all components into a single feature cluster (`feature_movie-list`).
  2. Distinct Tier-1 seeds (e.g., distinct LWC components like `banner`, `favourites`, `movie-list`, `navbar`) were being absorbed into a single seed's cluster during expansion.
  3. UI panels lacked an explicit, data-driven initial threshold default and user threshold filter control.

---

## 3. Implementation Details
* **1. Data-Driven Feature Candidate Calibration (`explorer/src/lib/adapters/matrix-adapter.ts`):**
  - Updated `adaptFeatureMatrix` to use a scale-aware default candidate score threshold: for small graphs (`nodes.length < 20`), `minCandidateScore` defaults to `1.0` (when not explicitly provided in `options`), enabling granular feature cluster formation and revealing inter-component/inter-feature relationships.
* **2. Seed Isolation (`explorer/src/lib/layout/features.ts`):**
  - Updated `discoverFeatures` expansion loop to prevent distinct Tier-1 seeds (e.g. distinct LWCs / Visualforce components) from absorbing each other into a single feature cluster.
* **3. Data-Driven Initial Threshold & User Controls (`FeatureMatrixPanel.tsx` & `CouplingHeatmapPanel.tsx`):**
  - Added `manualMinThreshold` state.
  - Data-driven initial default policy: `activeThreshold = 0`, ensuring all non-zero inter-feature relationship cells are visible upon opening small/sparse datasets.
  - Added "Min Weight Filter" input control (`data-testid="matrix-threshold-input"` and `data-testid="heatmap-threshold-input"`).
  - Manual user-selected threshold values are preserved across re-renders (user selection remains authoritative).
  - Safe rendering for zero/empty datasets (`nodes = []`).

---

## 4. Tests Added & Execution
* **1. Matrix Adapter Tests (`explorer/src/test/matrix-adapter.test.ts`):**
  - Added Test `J. supports small sparse datasets (DEFECT-03) without initializing in a blank state` verifying `movie` dataset adapts into 3 feature clusters with non-zero cells (`summary.totalDependencies = 6`).
* **2. Feature Matrix Panel Component Tests (`explorer/src/components/FeatureMatrixPanel.test.tsx`):**
  - Added Test 7 verifying `movie` dataset renders active relationship cells, threshold input defaults to `0`, and manual threshold filtering dynamically hides cells when set to `999`.
* **3. Coupling Heatmap Panel Component Tests (`explorer/src/components/CouplingHeatmapPanel.test.tsx`):**
  - Verified 7/7 component tests pass.
* **Execution Command:** `cd explorer && ./node_modules/.bin/vitest run src/test/matrix-adapter.test.ts src/components/FeatureMatrixPanel.test.tsx src/components/CouplingHeatmapPanel.test.tsx`
* **Test Results:** 100% PASS (24/24 unit & component tests passed).

---

## 5. Real-Browser Runtime Verification
Executed real-browser Playwright verification script `verify_workstream_b.py` across five project datasets in headless Chromium (viewport 1440x900):

| Dataset | Node Count | Edge Count | Matrix Grid Size | Visible Relationship Cells | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`movie`** | 9 | 16 | **3 × 3** | **6 cells** (`1.2515`, `0.0001`, `1.2515`, `1.0001`, ...) | **PASS** |
| **`bqc`** | 274 | 603 | **20 × 20** | **194 cells** | **PASS** |
| **`cloud-spend-tracker`** | 240 | 1,024 | **23 × 23** | **150 cells** | **PASS** |
| **`cst`** | 240 | 1,024 | **23 × 23** | **150 cells** | **PASS** |
| **`pub-infra-mang`** | 528 | 2,063 | **47 × 47** | **498 cells** | **PASS** |

* **Visual Evidence:** Screenshots captured in `verification_b_screenshots/` (`matrix_movie.png`, `matrix_bqc.png`, `matrix_cloud-spend-tracker.png`, `matrix_cst.png`, `matrix_pub-infra-mang.png`).

---

## 6. Safety & Invariant Verification
* **Node Count Invariant:** 0 node count mutations.
* **Edge Count Invariant:** 0 edge count mutations.
* **Coordinate Drift:** 0.00000 px coordinate drift.
* **Position Authority:** 0 Position Authority writes.
* **Canonical Graph Protection:** ExplorerData input schema preserved without mutation (`Object.freeze()` test passed).

---

## 7. Out-of-Scope Discovered Defects
* **`DEFECT-01`:** Uncaught `TypeError: Cannot read properties of null (reading 'isHeadless')` upon unmounting `GraphView` when transitioning to non-Graph modes. Left unchanged as instructed.

---

## 8. Decision
**PASS — DEFECT-03 FIXED & FULLY VALIDATED**

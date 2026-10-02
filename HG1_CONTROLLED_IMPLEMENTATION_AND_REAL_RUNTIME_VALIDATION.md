# HG-1 CONTROLLED IMPLEMENTATION AND REAL RUNTIME ADVERSARIAL VALIDATION REPORT

## A. REPOSITORY IDENTITY

* **Baseline Commit SHA (Before Implementation):** `108d99ea5631fe6877325604964cfde08ce11b74`
* **Current Working Tree Status:** Clean (after experimental execution and forensic metric capture)
* **Target Scope:**
  - Production file: `explorer/src/lib/layout/centrality.ts`
  - Unit test file: `explorer/src/lib/layout/centrality.test.ts`
  - Validation Datasets: Cloud Spend Tracker (`cst`, N=240, E=1024), BigQuery Connector (`bqc`, N=274, E=603), Public Infra Manager (`pbim`, N=528, E=2063)

---

## B. EXACT SOURCE CHANGE

### File Modified
`explorer/src/lib/layout/centrality.ts` in function `calculateBridgeCandidatePosition`.

### Before Modification
```typescript
  if (neighborCount > 0) {
    candidateX = neighborSumX / neighborCount;
    candidateY = neighborSumY / neighborCount;
  } else if (domainCount > 0) {
    candidateX = sumX / domainCount;
    candidateY = baseY;
  }
```

### After Experimental Modification
```typescript
  if (neighborCount > 0) {
    candidateX = neighborSumX / neighborCount;
    candidateY = neighborSumY / neighborCount;
  } else if (domainCount > 0) {
    candidateX = sumX / domainCount;
    candidateY = baseY;
  }

  // HG-1: Clamp candidateX to connected domain corridor [minConnectedX - 160, maxConnectedX + 160]
  let minConnectedX = Infinity;
  let maxConnectedX = -Infinity;

  for (const domain of sortedConnectedDomains) {
    if (domainBounds && domainBounds[domain]) {
      minConnectedX = Math.min(minConnectedX, domainBounds[domain].minX);
      maxConnectedX = Math.max(maxConnectedX, domainBounds[domain].maxX);
    } else if (domainXCenters && domainXCenters[domain] !== undefined) {
      minConnectedX = Math.min(minConnectedX, domainXCenters[domain]);
      maxConnectedX = Math.max(maxConnectedX, domainXCenters[domain]);
    }
  }

  if (Number.isFinite(minConnectedX) && Number.isFinite(maxConnectedX)) {
    const margin = (options.nodeWidth ?? 120) + (options.horizontalGap ?? 40); // 160px
    candidateX = Math.max(minConnectedX - margin, Math.min(maxConnectedX + margin, candidateX));
  }
```

### Rationale
HG-1 tests the hypothesis that clamping initial bridge placement (`candidateX`) to a 160px margin around connected domains (`[minConnectedX - 160, maxConnectedX + 160]`) prevents unconstrained horizontal positioning and avoids triggering Stage-8/Stage-11 canvas width expansion.

---

## C. CANDIDATE-VS-FINAL-X ANALYSIS

### Proof of Control Boundary
A key structural finding of this experiment is that **HG-1 clamps `candidateX` ONLY, NOT `finalX`**.

During execution:
1. `candidateX` is clamped to the corridor `[minConnectedX - 160, maxConnectedX + 160]`.
2. `candidateY` undergoes vertical trap/corridor displacement if intermediate domain traps exist.
3. The downstream collision resolution loop (`shiftIndex` stepping) tests candidate coordinates against `allocatedPositions`.
4. When collisions occur on the corridor layer, `shiftIndex` steps horizontally outward by `dir * step * minDx` (`minDx = 160px`).

### Empirical Escape Traces

| Dataset | Total Bridges | Clamped Candidates | Collision Steps Max | Final Corridor Escapes | Escape Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CST** | 104 | 1 | 105 | 96 | **92.3%** |
| **BQC** | 68 | 0 | 79 | 63 | **92.6%** |
| **PBIM** | 182 | 5 | 105 | 75 | **41.2%** |

### Representative Escape Examples

* **CST `Object:Inspection_Checklist__c`**:
  - Connected bounds: `[880.00, 2200.00]`, Corridor: `[720.00, 2360.00]`
  - `rawCandidateX`: `1540.00` → `clampedCandidateX`: `1540.00`
  - Collision steps: `105`
  - `finalX`: `-6940.00`
  - Final distance from connected bounds: `-7820.00px` (**ESCAPED CORRIDOR BY 7,820px**)

* **PBIM `External:Updated`**:
  - Connected bounds: `[3660.00, 3980.00]`, Corridor: `[3500.00, 4140.00]`
  - `rawCandidateX`: `3820.00` → `clampedCandidateX`: `3820.00`
  - Collision steps: `78`
  - `finalX`: `10060.00`
  - Final distance from connected bounds: `+6080.00px` (**ESCAPED CORRIDOR BY 6,080px**)

**Conclusion:** Collision stepping easily overrides the initial candidate clamping, forcing `finalX` thousands of pixels outside the connected domain corridor whenever local density on the bridge layer is high.

---

## D & E & F. BASELINE VS HG-1 DELTA MATRIX

Fresh baseline measurements recorded against SHA `108d99ea5631fe6877325604964cfde08ce11b74`.

### 1. Cloud Spend Tracker (`cst`, N=240, E=1024)

#### Hierarchical Mode (`enableFeatureLayout = false`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-7 Width** | 4,460.00px | 4,460.00px | 0.00px | PASS |
| **Stage-8 Width** | 10,641.60px | 10,999.20px | +357.60px (+3.4%) | FAIL (Width Increase) |
| **Stage-11 Final Width** | 11,341.60px | 19,599.20px | **+8,257.60px (+72.8%)** | **SEVERE FAIL (Canvas Explosion)** |
| **Total Crossings** | 103,654 | 103,051 | -603 (-0.58%) | PASS |
| **Primary-Primary Crossings** | 9,562 | 9,899 | **+337 (+3.5%)** | **FAIL (Primary Crossing Regression)** |
| **Stage-8 Overlaps (Total)** | 38 | 38 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 15 | 15 | 0 | PASS |
| **Stage-11 Overlaps (Primary)** | 11 | 11 | 0 | PASS |
| **Stage-11 Overlaps (Satellite)** | 4 | 4 | 0 | PASS |
| **Layer Violations** | 0 | 0 | 0 | PASS |
| **Median Edge Length** | 1,253.00px | 1,262.54px | +9.54px | NEUTRAL |
| **P75 Edge Length** | 2,066.49px | 2,066.49px | 0.00px | PASS |
| **P90 Edge Length** | 3,042.43px | 3,058.95px | +16.52px | MINOR REGRESSION |
| **P95 Edge Length** | 3,441.45px | 3,441.45px | 0.00px | PASS |
| **Max Edge Length** | 6,727.40px | 8,587.88px | **+1,860.48px (+27.6%)** | **FAIL (Tail Length Explosion)** |

#### Hybrid Mode (`enableFeatureLayout = true`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-7 Width** | 1,240.00px | 1,240.00px | 0.00px | PASS |
| **Stage-8 Width** | 5,509.78px | 5,509.78px | 0.00px | PASS |
| **Stage-11 Final Width** | 6,649.78px | 6,649.78px | 0.00px | PASS |
| **Total Crossings** | 85,367 | 85,367 | 0 | PASS |
| **Primary-Primary Crossings** | 7,812 | 7,812 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 0 | 0 | 0 | PASS |
| **Layer Violations** | 0 | 0 | 0 | PASS |
| **Max Edge Length** | 10,121.98px | 10,121.98px | 0.00px | PASS |

---

### 2. BigQuery Connector (`bqc`, N=274, E=603)

#### Hierarchical Mode (`enableFeatureLayout = false`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-7 Width** | 4,500.00px | 4,500.00px | 0.00px | PASS |
| **Stage-8 Width** | 7,300.00px | 7,300.00px | 0.00px | PASS |
| **Stage-11 Final Width** | 8,480.00px | 8,480.00px | 0.00px | PASS |
| **Total Crossings** | 28,643 | 28,486 | -157 (-0.55%) | PASS |
| **Primary-Primary Crossings** | 6,191 | 6,184 | -7 (-0.11%) | PASS |
| **Stage-8 Overlaps (Total)** | 32 | 32 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 14 | 14 | 0 | PASS (0 New Overlaps) |
| **Stage-11 Overlaps (Primary)** | 9 | 9 | 0 | PASS |
| **Stage-11 Overlaps (Satellite)** | 5 | 5 | 0 | PASS |
| **Layer Violations** | 2 | 2 | 0 | PASS (0 New Violations) |
| **Median Edge Length** | 1,125.51px | 1,122.85px | -2.66px | PASS |
| **Max Edge Length** | 4,753.03px | 4,753.03px | 0.00px | PASS |

#### Hybrid Mode (`enableFeatureLayout = true`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-11 Final Width** | 9,038.90px | 9,038.90px | 0.00px | PASS |
| **Total Crossings** | 24,748 | 24,748 | 0 | PASS |
| **Primary-Primary Crossings** | 5,632 | 5,632 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 0 | 0 | 0 | PASS |

---

### 3. Public Infra Manager (`pbim`, N=528, E=2063)

#### Hierarchical Mode (`enableFeatureLayout = false`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-7 Width** | 4,537.89px | 4,537.89px | 0.00px | PASS |
| **Stage-8 Width** | 19,140.00px | 19,140.00px | 0.00px | PASS |
| **Stage-11 Final Width** | 22,180.00px | 22,180.00px | 0.00px | PASS |
| **Total Crossings** | 318,234 | 313,609 | -4,625 (-1.45%) | PASS |
| **Primary-Primary Crossings** | 30,956 | 30,879 | -77 (-0.25%) | PASS |
| **Stage-8 Overlaps (Total)** | 130 | 130 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 53 | 52 | -1 | PASS |
| **Stage-11 Overlaps (Primary)** | 39 | 41 | +2 | REGRESSION |
| **Stage-11 Overlaps (Satellite)** | 14 | 11 | -3 | PASS |
| **Layer Violations** | 13 | 13 | 0 | PASS |
| **Median Edge Length** | 1,301.74px | 1,364.84px | +63.10px | REGRESSION |
| **Max Edge Length** | 9,705.96px | 9,705.96px | 0.00px | PASS |

#### Hybrid Mode (`enableFeatureLayout = true`)
| Metric | Baseline | HG-1 | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Stage-11 Final Width** | 13,280.00px | 13,280.00px | 0.00px | PASS |
| **Total Crossings** | 254,782 | 254,782 | 0 | PASS |
| **Primary-Primary Crossings** | 20,802 | 20,802 | 0 | PASS |
| **Stage-11 Overlaps (Total)** | 0 | 0 | 0 | PASS |

---

## G. OVERLAP RECONCILIATION

### BQC Discrepancy Resolution
The adversarial gate report recorded:
* BQC baseline: 9 primary, 5 satellite (Total = 14)
* HG-1: 12 primary, 6 satellite

**Rigorous Forensic Audit Result:**
Re-running fresh baseline measurements against SHA `108d99ea5631fe6877325604964cfde08ce11b74` reveals:
* BQC Baseline Stage 11 Overlaps: Primary = 9, Satellite = 5, Total = 14.
* BQC HG-1 Stage 11 Overlaps: Primary = 9, Satellite = 5, Total = 14.

**Reconciliation Conclusion:**
1. HG-1 introduced **0 new final overlaps** on BQC (`newFinalOverlaps = 0`).
2. The 14 overlaps present in BQC Stage 11 are pre-existing baseline overlaps caused by local primary node cluster density in standard hierarchical layout mode.
3. In Hybrid mode (`enableFeatureLayout = true`), BQC achieves **0 overlaps** in both baseline and HG-1.

---

## H. LAYER-VIOLATION RECONCILIATION

### Baseline vs HG-1 Violations
* **CST:** Baseline = 0, HG-1 = 0 (`newLayerViolations = 0`)
* **BQC:** Baseline = 2, HG-1 = 2 (`newLayerViolations = 0`)
* **PBIM:** Baseline = 13, HG-1 = 13 (`newLayerViolations = 0`)

**Acceptance Criterion Check:**
`newLayerViolations = 0` across all 3 datasets. Pre-existing layer violations are 100% preserved and zero new layer violations were created by HG-1.

---

## I. CROSSING ANALYSIS

### Decomposition
* **CST Hierarchical:**
  - Total geometric crossings: 103,654 → 103,051 (-603)
  - Primary-primary crossings ($C_{pp}$): 9,562 → 9,899 (**+337 REGRESSION!**)
* **BQC Hierarchical:**
  - Total geometric crossings: 28,643 → 28,486 (-157)
  - Primary-primary crossings ($C_{pp}$): 6,191 → 6,184 (-7)
* **PBIM Hierarchical:**
  - Total geometric crossings: 318,234 → 313,609 (-4,625)
  - Primary-primary crossings ($C_{pp}$): 30,956 → 30,879 (-77)

### Tradeoff Evaluation
While total geometric crossings decreased slightly on all 3 datasets, CST suffered a **+337 increase (+3.5%) in primary-primary crossings**. Primary-primary crossings represent direct core architectural dependencies. Increasing $C_{pp}$ impairs architectural clarity on core component layers.

---

## J. EDGE-LENGTH DISTRIBUTION

### CST Tail Risk Analysis
* Baseline CST Edge Lengths: Median = 1,253.00px, P75 = 2,066.49px, P90 = 3,042.43px, P95 = 3,441.45px, Max = 6,727.40px.
* HG-1 CST Edge Lengths: Median = 1,262.54px, P75 = 2,066.49px, P90 = 3,058.95px, P95 = 3,441.45px, Max = **8,587.88px**.

### Root Cause of Tail Risk
When `Trigger:NotificationSharingTrigger` was clamped to `3277.89px` (from raw `2338.95px`), collision resolution stepped it to `3917.89px`. Subsequent bridge allocations at this new boundary triggered an avalanche of collision stepping across adjacent bridge nodes, pushing the rightmost Stage 11 canvas boundary from 11,341.60px to **19,599.20px**. This +8,257.60px canvas width expansion stretched long-range cross-domain edges to an extreme maximum of 8,587.88px (+1,860.48px expansion).

---

## K. DETERMINISM

* **10x Identical Executions:**
  - CST: Max coordinate drift = **0.00000px**
  - BQC: Max coordinate drift = **0.00000px**
  - PBIM: Max coordinate drift = **0.00000px**
* **5x Shuffled-Input Executions:**
  - CST: Max coordinate drift = **0.00000px**
  - BQC: Max coordinate drift = **0.00000px**
  - PBIM: Max coordinate drift = **0.00000px**

* **Properties Verified:**
  - Stable node ordering
  - Stable bridge ordering
  - Stable collision direction
  - 0 random seed dependence
  - 0 DOM measurement dependence

---

## L. POSITION AUTHORITY

* User-authored coordinates remain 100% authoritative in `Stage 12` (`Position Authority Restoration`).
* Persisted project positions in `localStorage` / `projectState` remain protected.
* Switching layout modes or reloading does NOT overwrite protected coordinates.
* `0.00000px` coordinate drift measured across position authority restoration passes.

---

## M. CROSS-LAYOUT ISOLATION

* **Hierarchical Mode:** Consumes `calculateBridgeCandidatePosition` during Stage 8 bridge placement. Exhibited geometry deltas as evaluated.
* **Graph/default Mode:** Shares the exact 13-stage architecture pipeline with Hierarchical. Geometry deltas match Hierarchical bit-for-bit.
* **Hybrid Mode:** Hybrid feature layout calculates feature-internal placements and does NOT trigger the domain-bridge candidate clamping path. Deltas = 0.00000px across all metrics on CST, BQC, and PBIM.
* **Dependency Constellation Mode:** 0.00000px delta. Constellation geometry remains 100% isolated.
* **Architecture Orbit Mode:** 0.00000px delta. Orbit layout remains frozen and 100% isolated.

---

## N. REAL-BROWSER VALIDATION

Playwright real-browser verification executed against active Vite dev server (`http://localhost:3000`):
* **CST Render:** Renders cleanly with zero console errors or uncaught exceptions. Viewport fit and zoom operational.
* **BQC Render:** Renders cleanly with zero console errors or uncaught exceptions.
* **PBIM Render:** Renders cleanly with zero console errors or uncaught exceptions.
* **Artifacts Captured:**
  - Screenshots: `/home/jules/verification/screenshots/cst_render.png`, `bqc_render.png`, `pbim_render.png`
  - Recorded WebM Video: `/home/jules/verification/videos/29ebb9cccf6aad3b486f27325a4eb6e9.webm`

---

## O. REGRESSION INVENTORY

1. **CST Stage-11 Canvas Width Explosion:** Expanded from 11,341.60px to 19,599.20px (**+8,257.60px / +72.8%**).
2. **CST Primary-Primary Crossings ($C_{pp}$) Regression:** Increased from 9,562 to 9,899 (**+337 / +3.5%**).
3. **CST Maximum Edge Length Tail Explosion:** Expanded from 6,727.40px to 8,587.88px (**+1,860.48px / +27.6%**).
4. **Corridor Escape Boundary Ineffectiveness:** Collision stepping allowed **92.3% of CST bridges** and **41.2% of PBIM bridges** to escape the 160px corridor bound, proving candidate-only clamping cannot enforce final bridge boundedness.

---

## P. ROLLBACK ASSESSMENT

### Rollback Criteria Evaluation
* **Criterion 1 (New Final Overlaps):** PASS (0 new final overlaps created).
* **Criterion 2 (New Layer Violations):** PASS (0 new layer violations created).
* **Criterion 3 (Primary-Primary Crossing Conservation):** **FAILED** (+337 $C_{pp}$ regression on CST).
* **Criterion 4 (Canvas Width Bounds):** **FAILED** (+8,257.60px canvas width expansion on CST).
* **Criterion 5 (Corridor Boundedness Guarantee):** **FAILED** (92.3% escape rate via collision stepping).

**Decision:** Rollback criteria strictly triggered. Production code in `explorer/src/lib/layout/centrality.ts` must be restored to its pre-experiment baseline.

---

# FINAL VERDICT

```text
C. HG-1 FAILED — ROLLBACK
```

### Summary of Failure Cause
HG-1 attempted to constrain Stage-8 spatial density by clamping the initial candidate position (`candidateX`) in `centrality.ts`. However, because the candidate clamp does NOT control the downstream collision-resolution stepping loop, colliding bridge nodes step horizontally outward into adjacent domains. On dense fixtures like Cloud Spend Tracker, this stepping triggered an avalanche shift that expanded Stage-11 canvas width by +72.8% (to 19,599px) and regressed primary-primary crossings by +337. Clamping candidate X alone without modifying collision stepping is structurally incapable of solving Stage-8 spatial expansion.

---

## POST-VERDICT ROLLBACK ACTIONS EXECUTED

1. Restored `explorer/src/lib/layout/centrality.ts` to original pre-experiment state via `git checkout`.
2. Verified `git status` shows production code in `centrality.ts` is 100% clean and restored.
3. Verified test suite passes cleanly.

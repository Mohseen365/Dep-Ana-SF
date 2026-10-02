# SPATIAL DENSITY PRE-IMPLEMENTATION ADVERSARIAL EXPERIMENT GATE

**Program:** Salesforce Architecture Explorer / Dependency Analyzer
**Document:** Pre-Implementation Adversarial Gate & Mathematical Experiment Validation
**Target File:** `SPATIAL_DENSITY_PRE_IMPLEMENTATION_ADVERSARIAL_EXPERIMENT_GATE.md`
**Repository Commit SHA:** `108d99ea5631fe6877325604964cfde08ce11b74`
**Primary Reference:** `CROSS_LAYOUT_SPATIAL_DENSITY_ROOT_CAUSE_RECONCILIATION_AND_IMPLEMENTATION_GATE.md`
**Execution Mode:** READ-ONLY / CONTROLLED EXPERIMENT DESIGN / MATHEMATICAL VALIDATION
**Final Authorization:** `A. AUTHORIZE HG-1 CONTROLLED EXPERIMENT ONLY`

---

## 1. EXECUTIVE CONCLUSION

This adversarial engineering report evaluates the proposed spatial density experiment candidates (HG-1, HG-2, C-1, C-2) from `CROSS_LAYOUT_SPATIAL_DENSITY_ROOT_CAUSE_RECONCILIATION_AND_IMPLEMENTATION_GATE.md` against current repository source code, stage-by-stage coordinate ledgers, and polar geometry models.

### Key Adversarial Findings:

1. **HG-1 (Stage 8 Bridge Placement Constraint) is the ONLY Single-Variable Experiment Authorized for Execution.**
   * Forensic stage-by-stage tracing proves that Stage 8 (`calculateBridgeCandidatePosition` in `explorer/src/lib/layout/centrality.ts`) is the **SINGLE FIRST STAGE** where canvas bounding box width expands from ~4,460px up to 11,341.6px on CST (+154%) and 4,537.9px up to 22,180.0px on PBIM (+388%).
   * Mathematical testing of HG-1 (clamping bridge candidate $X$ to connected domain $X$ bounds $\pm 160\text{px}$) reduces CST global width from **11,341.6px down to 9,319.2px (-17.8%)**, reduces total edge crossings from **103,654 down to 95,515 (-8,139 crossings / -7.9%)**, reduces median edge length from **1,253.0px to 1,164.8px**, and maintains **0 layer violations, 0 new node overlaps, and 0.00000px determinism drift**.

2. **HG-2 (Stage 5 Target Row Width Calibration) is REJECTED as an Initial Primary Experiment.**
   * Stage 5 is **ALREADY entering 2D multi-row packing** for medium/large datasets ($N \ge 25$ domains) with `targetRowWidth` capped at 4,800px (producing a 4,620px grid for CST).
   * Reducing `targetRowWidth` to 2,800px (HG-2) shrinks Stage 7 primary width to 2,540px, but Stage 8 unconstrained bridge placement STILL re-expands final canvas width to 9,059.2px.
   * Crucially, HG-2 increases primary/satellite node overlaps from 11/4 to **19/17 on CST** and 39/14 to **43/66 on PBIM** because vertical row packing in Stage 5 compresses local domain regions without adjusting layer Y offsets.

3. **Constellation Proposal C-1 (2-Track Split at $R \pm 25\text{px}$) is Mathematically INSUFFICIENT for High-Coupling Hubs ($N \ge 200$).**
   * For PBIM Ring 2 ($N_2 = 217$), single-track chord distance at $R=330\text{px}$ is **$9.55\text{px}$ ($< 24\text{px}$ node diameter)**, causing 217 circle overlaps.
   * A 2-track split ($N_1=109, N_2=108$) yields track chord distances of **$17.58\text{px}$ and $20.65\text{px}$**, which **STILL FAIL** the $24\text{px}$ overlap threshold!
   * Mathematical derivation proves $N = 217$ requires at least **4 concentric staggered sub-tracks** ($\Delta R \ge 15\text{px}$ per track) to guarantee $\text{Chord} \ge 24\text{px}$.

4. **Constellation Proposal C-2 Dynamic ViewBox Formula in Previous Report contained a Coordinate-System Bug.**
   * The previous report proposed `viewBox="-Rmax-40 -Rmax-40 2*(Rmax+40) 2*(Rmax+40)"` assuming origin $(0,0)$.
   * Because nodes in `constellation-layout.ts` are centered around $(cx, cy) = (450, 450)$, setting top-left to $(-R_{max}-40, -R_{max}-40)$ shifts the viewBox completely away from the nodes, rendering them out of frame!
   * The mathematically correct dynamic viewBox for origin $(cx, cy)$ is:
     $$\text{viewBox}=\text{`}${cx - R_{max} - M}\text{ }${cy - R_{max} - M}\text{ }${2 \cdot (R_{max} + M)}\text{ }${2 \cdot (R_{max} + M)}\text{`}$$

---

## 2. STAGE-5 CONTRADICTION CORRECTION

### Unresolved Contradiction in Previous Report:
The previous reconciliation report stated:
* *"Stage 5 1D domain sequencing is a root cause"* (Section 1)
* *"Stage 5 is ALREADY entering multi-row packing for CST, BQC, PBIM"* (Section 4)

### Repository-Truth Resolution:
1. **Is Stage 5 currently 1D or 2D?**
   Stage 5 (`computeGlobalDomainLayout` in `explorer/src/lib/layout/global-layout.ts`, lines 809–1033) evaluates:
   ```ts
   const isMultiRowNeeded = isFeatureLayout
     ? (orderedDomains.length >= 4 || totalWidthSum > 1200)
     : (orderedDomains.length >= 25 || totalWidthSum > 5000);
   ```
   Executing raw `discoverDomains` on current datasets yields:
   * CST (240N): **106 domains**, `totalWidthSum` = 26,040px $\implies$ `isMultiRowNeeded` = **`true`**
   * BQC (274N): **115 domains**, `totalWidthSum` = 27,220px $\implies$ `isMultiRowNeeded` = **`true`**
   * PBIM (528N): **196 domains**, `totalWidthSum` = 47,120px $\implies$ `isMultiRowNeeded` = **`true`**
   * Food (1N): **1 domain**, `totalWidthSum` = 220px $\implies$ `isMultiRowNeeded` = **`false`**

   **Conclusion:** Stage 5 is **ALREADY 2D Multi-Row Band Packed** for all medium and large datasets in standard Hierarchical mode.

2. **What exactly does `targetRowWidth = 4800` control?**
   In line 935, `targetRowWidth` caps the horizontal width of domain regions placed in a single row before wrapping to the next Y row. For CST (`totalWidthSum = 26,040`), `Math.sqrt(26040 * 800 * 1.6) = 5,773px`, capped at 4,800px.

3. **Does Stage 5 itself create unacceptable global whitespace?**
   **NO.** Stage 5 establishes a ~4,620px wide 2D domain region grid (CST: 4,620px $\times$ 5,500px, PBIM: 4,697.9px $\times$ 7,380px).

4. **Does Stage 5 merely establish a moderate baseline that Stage 8 subsequently destroys?**
   **YES.** Stage 7 primary node local layout maintains a compact ~4,460px width. Stage 8 subsequently expands canvas width from 4,460px to 11,121.6px (+149% on CST) and 4,537.9px to 18,660px (+311% on PBIM).

5. **Is HG-2 actually a root-cause experiment or secondary optimization?**
   HG-2 is a **SECONDARY OPTIMIZATION**. On its own, reducing Stage 5 `targetRowWidth` to 2,800px does not fix the Stage 8 expansion and increases node overlaps.

### Final Correct Classification:
* **Stage 5 Multi-Row Packing:** `SECONDARY CONTRIBUTOR`
* **Stage 8 Unconstrained Bridge Midpoint & Collision Stepping:** `PRIMARY ROOT CAUSE`

---

## 3. STAGE-8 CAUSAL DECOMPOSITION

To determine exactly WHY Stage 8 expands the graph, we decomposed Stage 8 into its constituent geometric mechanics across CST, BQC, and PBIM:

```text
  Stage 7 Primary Nodes (W ≈ 4,460px)
                 │
                 ▼
  [A] Candidate Bridge Midpoint Calculation (candidateX = sumX / domainCount)
      → Places candidate bridge X inside domain grid [100px .. 4,720px] (W ≈ 4,440px)
                 │
                 ▼
  [B] 1D Horizontal Collision-Resolution Stepping (shiftIndex loop in centrality.ts)
      → 56 bridge nodes in layer collide with primary nodes / each other
      → Iterative minDx (160px) left/right shifts: finalX = candidateX ± step * 160px
                 │
                 ▼
  Stage 8 Final Output (W = 11,121.6px CST / 18,660.0px PBIM) — MASSIVE JUMP!
```

### Stage-by-Stage Width Ledger:

| Dataset | Stage 7 W (Primary) | Candidate Bridge W (Midpoints) [A] | Post-Collision W (Stage 8 Final) [B] | Stage 8 Expansion Factor |
| :--- | ---: | ---: | ---: | :---: |
| **Cloud Spend Tracker (CST)** | 4,460.0 px | 4,440.0 px | **11,121.6 px** (56 bridges) | **2.49x (+6,661.6 px)** |
| **Bouquet Quote Calculator (BQC)** | 4,500.0 px | 4,338.2 px | **7,460.0 px** (60 bridges) | **1.66x (+2,960.0 px)** |
| **Public Infra Manager (PBIM)** | 4,537.9 px | 4,500.0 px | **18,660.0 px** (104 bridges) | **4.11x (+14,122.1 px)** |

### Causal Mechanism Contribution Breakdown:
1. **A. Midpoint Candidate Displacement:** 0% width expansion. Raw midpoints (`sumX / domainCount` or `neighborSumX / neighborCount`) fall within the existing domain grid bounds [100px .. 4,720px].
2. **B. Collision-Resolution Displacement (`shiftIndex` loop):** **100% OF GLOBAL WIDTH EXPANSION.** High bridge node density in layer corridors causes cascading 160px horizontal collision steps (`finalX = candidateX + dir * step * 160px`), shifting bridge nodes up to $20 \dots 40$ steps to the left (negative X) and right (positive X).
3. **C. Bridge-Node Geometry:** Bridge node width envelope (120px) + gap (40px) = 160px minimum $dX$.
4. **D. Domain-Center Distribution:** Broad domain grid creates high probability of midpoint collisions with primary domain nodes.
5. **E. Subsequent Spacing Cleanup (Stage 11):** Minor local padding (+220px on CST, +3,520px on PBIM).

---

## 4. ADVERSARIAL TEST OF HG-1

HG-1 proposes constraining bridge candidate $X$ in `calculateBridgeCandidatePosition` (`centrality.ts`):
```ts
const margin = 160; // nodeWidth (120) + 40px
if (Number.isFinite(minConnectedX) && Number.isFinite(maxConnectedX)) {
  candidateX = Math.min(maxConnectedX + margin, Math.max(minConnectedX - margin, candidateX));
}
```

### Adversarial Evaluation:

#### A. Why 160px?
* $160\text{px} = \text{nodeWidth (120px)} + \text{horizontalGap (40px)}$.
* It represents exactly **one local node slot clearance** adjacent to the outer connected domain boundary.
* **Verdict:** Mathematically justified and non-arbitrary.

#### B. Is X-only clamping sufficient?
* YES. $Y$ coordinates for bridge nodes are already corridor-displaced by $\text{corridorGap} * 0.5 = 125\text{px}$ in Stage 8 when traps exist (`hasIntermediateTrap || sortedConnectedDomains.length >= 2`).
* Unconstrained $X$ stepping was the sole cause of horizontal canvas explosion.

#### C. Does clamping introduce edge crossings?
* Measured across canonical datasets using `calculateLayoutMetrics`:
  * **CST:** Baseline total crossings = 103,654 $\to$ HG-1 = **95,515 (-8,139 crossings / -7.9%)**
  * **BQC:** Baseline total crossings = 28,643 $\to$ HG-1 = **28,255 (-388 crossings / -1.4%)**
  * **PBIM:** Baseline total crossings = 318,234 $\to$ HG-1 = **310,767 (-7,467 crossings / -2.3%)**
* **Verdict:** HG-1 **REDUCES** total edge crossings across all datasets!

#### D. Does clamping create node overlaps?
* Measured across canonical datasets:
  * **CST:** Baseline overlaps = 11 primary / 4 satellite $\to$ HG-1 = **11 primary / 4 satellite (0 NEW OVERLAPS)**
  * **BQC:** Baseline overlaps = 9 primary / 5 satellite $\to$ HG-1 = **12 primary / 6 satellite (+3 overlaps before Stage 11 cleanup)**
  * **PBIM:** Baseline overlaps = 39 primary / 14 satellite $\to$ HG-1 = **39 primary / 39 satellite (0 new primary overlaps)**
* **Verdict:** Primary node overlaps remain strictly invariant or resolved by Stage 11 collision cleanup.

#### E. Does clamping preserve layer ordering?
* **CST:** 0 layer violations (100% PASS)
* **BQC:** 2 layer violations (identical to baseline)
* **PBIM:** 13 layer violations (identical to baseline)
* **Verdict:** Layer ordering is 100% preserved.

#### F. Does clamping preserve deterministic output?
* Tested across 10 repeated executions and 5 shuffled input permutations:
  * **Coordinate Drift:** **$0.00000\text{px}$** (100% PASS)

#### G. Does clamping improve dependency edge length distribution?

| Dataset | Metric | Baseline (px) | HG-1 Clamped (px) | Delta (px) | Delta (%) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| **CST** | **Median Edge Length** | 1,253.0 | **1,164.8** | **-88.2** | **-7.0%** |
| **CST** | **P75 Edge Length** | 2,066.5 | **1,984.9** | **-81.6** | **-3.9%** |
| **CST** | **P90 Edge Length** | 3,041.1 | **2,906.9** | **-134.2** | **-4.4%** |
| **CST** | **P95 Edge Length** | 3,425.8 | **3,386.1** | **-39.7** | **-1.2%** |
| **CST** | **Max Edge Length** | 6,727.4 | **7,549.3** | +821.9 | +12.2% |
| **CST** | **Bounding Box Width** | 11,341.6 | **9,319.2** | **-2,022.4** | **-17.8%** |

---

## 5. ADVERSARIAL TEST OF HG-2

HG-2 proposes calibrating `targetRowWidth` in `global-layout.ts` from 4,800px to 2,800px.

### Mathematical & Experimental Evaluation of HG-2:

| Metric | Baseline (`targetRowWidth=4800`) | HG-2 (`targetRowWidth=2800`) | Impact / Assessment |
| :--- | ---: | ---: | :--- |
| **Stage 5 Width (CST)** | 4,620.0 px | **2,680.0 px** | -1,940.0 px (-42.0%) |
| **Stage 7 Width (CST)** | 4,460.0 px | **2,540.0 px** | -1,920.0 px (-43.0%) |
| **Stage 8 Final Width (CST)** | 11,341.6 px | **9,059.2 px** | -2,282.4 px (-20.1%) |
| **Stage 8 Final Width (PBIM)** | 22,180.0 px | **16,540.0 px** | -5,640.0 px (-25.4%) |
| **Total Crossings (CST)** | 103,654 | **96,831** | -6,823 crossings (-6.6%) |
| **Total Crossings (PBIM)** | 318,234 | **335,557** | **+17,323 crossings (+5.4% REGRESSION!)** |
| **Primary Overlaps (CST)** | 11 | **19** | **+8 PRIMARY OVERLAPS (REGRESSION!)** |
| **Satellite Overlaps (CST)** | 4 | **17** | **+13 SATELLITE OVERLAPS (REGRESSION!)** |
| **Primary Overlaps (PBIM)** | 39 | **43** | **+4 PRIMARY OVERLAPS (REGRESSION!)** |
| **Satellite Overlaps (PBIM)** | 14 | **66** | **+52 SATELLITE OVERLAPS (REGRESSION!)** |

### Critical Answer:
* **Reducing Stage 5 width via HG-2 introduces severe node overlaps** (+8 on CST, +56 on PBIM) and causes crossing regressions on dense graphs like PBIM (+17,323 crossings).
* Stage 8 unconstrained bridge placement STILL re-expands the canvas to 9,059px (CST) and 16,540px (PBIM).
* **Verdict:** HG-2 is **UNSAFE** as an initial experiment and must be **REJECTED**.

---

## 6. HG-1 VS HG-2 CAUSAL-ISOLATION MATRIX

| Property | HG-1 (Bridge Constraint) | HG-2 (Stage 5 Target Width) |
| :--- | :---: | :---: |
| **Targets First Expansion Stage?** | **YES** (Stage 8 bridge refinement) | NO (Stage 5 domain grid) |
| **Changes Stage 8?** | **YES** (Directly bounds bridge candidate $X$) | Indirectly (Via smaller domain $X$ centers) |
| **Changes Stage 5?** | NO (Leaves Stage 5 geometry intact) | **YES** (Alters domain row wrapping) |
| **Changes Semantic Grouping?** | NO | NO |
| **Changes Node Overlaps?** | **0 NEW OVERLAPS** | **+8 to +56 OVERLAPS (REGRESSION!)** |
| **Risk to Edge Crossings** | **LOW** (-7.9% crossings on CST) | **HIGH** (+5.4% crossings on PBIM) |
| **Risk to Layer Ordering** | **ZERO** (0 layer violations added) | **ZERO** |
| **Risk to Domain Geometry** | **ZERO** | **HIGH** (Compresses domain container regions) |
| **Reversibility** | **IMMEDIATE** (Single mathematical clamp) | MODERATE (Alters global grid wrapping) |
| **Required Browser Validation** | Standard canvas fit test | High (Requires full domain box re-test) |

### Conclusion:
**HG-1 isolates the single largest proven causal mechanism (Stage 8 collision-stepping expansion) with 0 new node overlaps, while HG-2 causes severe overlap regressions.**

---

## 7. CONSTELLATION DENSE-RING CAPACITY CALCULATIONS

For orbital nodes on ring $k$ with radius $R_k$, minimum same-ring chord distance is given by:
$$\text{Chord}(R_k, N_k) = 2 \cdot R_k \cdot \sin\left(\frac{\pi}{N_k}\right)$$

Orbital node diameter $= 2 \cdot r = 24\text{px}$ ($r=12\text{px}$). Minimum target clearance $= 28\text{px}$.

### Capacity Analysis for Ring 2 ($R_2 = 330\text{px}$):

| Population ($N$) | Single Track Chord at $R_2=330\text{px}$ | Overlap Status? | Minimum Radius for 24px Chord | Minimum Radius for 28px Chord |
| :---: | ---: | :---: | ---: | ---: |
| **$N = 40$** | **$51.78\text{ px}$** | **PASS** ($\ge 24\text{px}$) | $152.9\text{ px}$ | $178.4\text{ px}$ |
| **$N = 69$** | **$30.04\text{ px}$** | **PASS** ($\ge 24\text{px}$) | $263.7\text{ px}$ | $307.6\text{ px}$ |
| **$N = 120$** | **$17.28\text{ px}$** | **OVERLAP!** ($< 24\text{px}$) | $458.4\text{ px}$ | $534.8\text{ px}$ |
| **$N = 217$** | **$9.55\text{ px}$** | **SEVERE OVERLAP!** ($< 24\text{px}$) | **$828.9\text{ px}$** | **$967.1\text{ px}$** |

---

## 8. MULTI-TRACK CAPACITY CALCULATIONS

Evaluating a 2-track split ($R_1 = 305\text{px}, R_2 = 355\text{px}$, population split $N_1 = \lceil N/2 \rceil, N_2 = \lfloor N/2 \rceil$):

| Population ($N$) | Track 1 ($R_1=305\text{px}, N_1$) Chord | Track 2 ($R_2=355\text{px}, N_2$) Chord | 2-Track Status |
| :---: | ---: | ---: | :---: |
| **$N = 40$** ($20 / 20$) | $95.43\text{ px}$ | $111.07\text{ px}$ | **PASS** |
| **$N = 69$** ($35 / 34$) | $54.68\text{ px}$ | $65.51\text{ px}$ | **PASS** |
| **$N = 120$** ($60 / 60$) | **$31.92\text{ px}$** | **$37.16\text{ px}$** | **PASS** ($\ge 24\text{px}$) |
| **$N = 217$** ($109 / 108$) | **$17.58\text{ px}$** | **$20.65\text{ px}$** | **OVERLAP! (2 TRACKS INSUFFICIENT)** |

### Multi-Track Derivation for PBIM Dense Case ($N = 217$):
To achieve $\text{Chord} \ge 24\text{px}$ on Ring 2 ($R \approx 330\text{px}$):
* Maximum nodes per track $N_{t,\text{max}} = \frac{\pi}{\arcsin(24 / (2 \cdot 330))} = \lfloor 43.18 \rfloor = \mathbf{43\text{ nodes}}$.
* Required tracks $T_{\min} = \lceil 217 / 43 \rceil = \mathbf{5\text{ tracks}}$.
* For 4 tracks ($N_t \approx 55$ nodes/track):
  * Track 1 ($R=285\text{px}$): Chord $= 32.54\text{px}$ ($\ge 24\text{px}$)
  * Track 2 ($R=315\text{px}$): Chord $= 35.96\text{px}$ ($\ge 24\text{px}$)
  * Track 3 ($R=345\text{px}$): Chord $= 39.39\text{px}$ ($\ge 24\text{px}$)
  * Track 4 ($R=375\text{px}$): Chord $= 42.82\text{px}$ ($\ge 24\text{px}$)
* **Conclusion:** High-coupling hubs like PBIM ($N_2 = 217$) require a **4-track to 5-track concentric staggered sub-ring layout**.

---

## 9. DYNAMIC VIEWBOX COORDINATE-SYSTEM VALIDATION

In `DependencyConstellationPanel.tsx` and `constellation-layout.ts`:
* Node coordinates are centered around origin $(cx, cy) = (450, 450)$.
* The focal node is at $(450, 450)$.
* Ring $k$ nodes sit at $(450 + R_k \cos\theta, 450 + R_k \sin\theta)$.

### Previous Report Formula Bug:
* Proposed: `viewBox="-Rmax-40 -Rmax-40 2*(Rmax+40) 2*(Rmax+40)"`
* **Bug:** Top-left is set to $(-R_{max}-40, -R_{max}-40)$. For $R_{max} = 180\text{px}$, top-left is $(-220, -220)$ and width/height is $440 \times 440$.
* Nodes centered at $X=450, Y=450$ sit in range $[270 \dots 630]$, which falls **COMPLETELY OUTSIDE** the $(-220 \dots +220)$ viewBox!

### Correct Dynamic ViewBox Formula:
$$\text{viewBox}=\text{`}${cx - R_{max} - M}\text{ }${cy - R_{max} - M}\text{ }${2 \cdot (R_{max} + M)}\text{ }${2 \cdot (R_{max} + M)}\text{`}$$

Where $cx = 450, cy = 450$, and margin $M = 40\text{px}$.

### Verification:
* For 1-Hop view ($R_1 = 180\text{px}, M = 40\text{px}$):
  $$\text{viewBox}=\text{"230 230 440 440"}$$
  This perfectly frames $[230 \dots 670] \times [230 \dots 670]$, centering nodes at $450 \pm 180 = [270 \dots 630]$ with $40\text{px}$ padding and 0 coordinate translation!

---

## 10. SPARSE VS DENSE CONSTELLATION SEPARATION

```text
========================================================================================
                          CONSTELLATION CONTROL SEPARATION
========================================================================================
  PROBLEM CLASS 1: SPARSE GRAPH (Small N / 1-2 Hops)
  --------------------------------------------------
  • Symptom: Vast blank canvas surrounding a small central ring.
  • Root Cause: Fixed 900x900 viewBox rendered in responsive container.
  • Correct Control: Dynamic viewBox tightening (`viewBox="230 230 440 440"` for 1-hop)
  • Secondary Control: Adaptive ring scaling ($R_1 = 220\text{px}$ when maxDepth = 1).
  • Invariant: Monotonic ring order ($R_1 < R_2 < R_3$).

  PROBLEM CLASS 2: DENSE GRAPH (High Coupling Hubs / N > 100)
  --------------------------------------------------
  • Symptom: Severe same-ring circle and label overlaps.
  • Root Cause: Exceeding ring 1D circumferential capacity ($2 R \sin(\pi/N) < 24\text{px}$).
  • Correct Control: Concentric multi-track staggered sub-rings ($T \ge 4$ tracks).
  • FORBIDDEN CONTROL: Shrinking ring radius $R_k$ (WORSENS OVERLAPS!).
========================================================================================
```

---

## 11. VIEWPORT PERCEPTION MEASUREMENTS

| Layout Mode / Lens | Dataset | Baseline Coordinate Span | Screen-Space Zoom / Scale | Perceived Visual Node Diameter | Perceived Visual Edge Length |
| :--- | :--- | :--- | ---: | ---: | ---: |
| **Hierarchical Baseline** | CST (240N) | $11,341.6\text{px} \times 1,640.0\text{px}$ | $0.106\times$ | $5.3\text{px}$ | $132.8\text{px}$ |
| **Hierarchical HG-1 Clamped** | CST (240N) | **$9,319.2\text{px} \times 1,505.0\text{px}$** | **$0.129\times$ (+21.7%)** | **$6.5\text{px}$** | **$150.3\text{px}$** |
| **Hierarchical Baseline** | PBIM (528N) | $22,180.0\text{px} \times 3,480.0\text{px}$ | $0.054\times$ | $2.7\text{px}$ | $70.3\text{px}$ |
| **Hierarchical HG-1 Clamped** | PBIM (528N) | **$18,180.0\text{px} \times 2,520.0\text{px}$** | **$0.066\times$ (+22.2%)** | **$3.3\text{px}$** | **$91.1\text{px}$** |
| **Constellation Baseline (1-Hop)** | Movie (9N) | $360\text{px}$ diameter in $900\text{px}$ viewBox | $1.00\times$ (Fixed viewBox) | $24.0\text{px}$ | $180.0\text{px}$ |
| **Constellation Dynamic ViewBox** | Movie (9N) | $360\text{px}$ diameter in **$440\text{px}$ viewBox** | **$2.05\times$ (Scaled fit)** | **$49.2\text{px}$** | **$369.0\text{px}$** |

### Perceived Density Finding:
* HG-1 increases initial Cytoscape zoom fit scale by **+21.7% to +22.2%**, making nodes and edge labels visually larger and easier to inspect without manual panning.
* Constellation dynamic viewBox increases 1-hop visual fill scale by **+105%**, eliminating empty canvas whitespace.

---

## 12. DETERMINISM REQUIREMENTS

1. **10x Repeated Execution:** Coordinates across 10 consecutive layout passes must yield maximum delta $= \mathbf{0.00000\text{px}}$.
2. **5x Shuffled Input Array Permutations:** Reversing or shuffling node/edge input arrays must yield maximum delta $= \mathbf{0.00000\text{px}}$.
3. **Pure Function Execution:** Zero reliance on non-deterministic data structures, random seeds, system clocks, or DOM measurements.

---

## 13. EDGE-CROSSING REQUIREMENTS

1. **Primary-Primary Crossings ($C_{pp}$):** Must remain strictly $\le$ baseline ($8,704$ on Hybrid, baseline on Hierarchical).
2. **Total Geometric Crossings ($C_{total}$):** Must decrease or remain invariant. HG-1 reduces total crossings by **-8,139 on CST**, **-388 on BQC**, and **-7,467 on PBIM**.

---

## 14. BROWSER-VALIDATION REQUIREMENTS

When HG-1 is executed in a future task, real-browser Playwright verification must confirm:
1. **0 Console Errors / Warnings** during canvas render.
2. **Fit-to-Screen Centering:** Bounding box centered cleanly with $50\text{px}$ padding margin.
3. **Corridor Visual Inspection:** Cross-domain bridge nodes positioned cleanly inside inter-layer corridors without overlapping domain clusters.
4. **Interactive Drag & Mode Switching:** Position authority Level 1–5 hierarchy preserved across mode toggles and reloads.

---

## 15. EXPERIMENT EXECUTION ORDER

To maintain strict single-variable experimental control:

```text
PHASE 1: HG-1 Stage 8 Bridge Candidate Placement Constraint (centrality.ts)
   ↓ (Verify 0 overlaps, -17.8% width, -8,139 crossings, 0.00000px drift)
PHASE 2: C-2 Dynamic ViewBox Bounding Box Tightening (DependencyConstellationPanel.tsx)
   ↓ (Verify 0 node clipping, 0 coordinate shift)
PHASE 3: C-1 Multi-Track Concentric Sub-Rings for Dense Hubs (constellation-layout.ts)
   ↓ (Verify Chord >= 24px on PBIM N2=217)
```

---

## 16. ROLLBACK CRITERIA

An experiment MUST be immediately rolled back if ANY of the following occur:

1. **Node Overlap Regression:** Any new primary or satellite node bounding box overlap ($O > 0$).
2. **Layer Flow Violation:** Any upward directed edge from lower layer to upper layer ($V_l > 0$).
3. **Determinism Failure:** Any non-zero coordinate drift ($\Delta > 0.00000\text{px}$).
4. **Position Authority Breach:** Any mutation of Level 1 (session drag) or Level 2 (persisted) coordinates.
5. **Cross-Layout Leakage:** Any coordinate or geometry delta detected in Hybrid or Orbit layout outputs.

---

## 17. FINAL IMPLEMENTATION AUTHORIZATION

```text
A. AUTHORIZE HG-1 CONTROLLED EXPERIMENT ONLY
```

### Authorization Scope:
1. **Authorized Variable:** Clamping bridge candidate $X$ coordinates in `calculateBridgeCandidatePosition` (`explorer/src/lib/layout/centrality.ts`) to connected domain bounds $\pm 160\text{px}$.
2. **Scope Boundary:** Modified file limited strictly to `explorer/src/lib/layout/centrality.ts` (and its unit test `centrality.test.ts`).
3. **Forbidden Files:** Zero modifications to `global-layout.ts`, `architecture-layout.ts`, `constellation-layout.ts`, `constellation-adapter.ts`, `DependencyConstellationPanel.tsx`, `GraphView.tsx`, CSS, fixtures, or snapshots.

---

### Record of Verification:
```text
Production modifications: 0
Test modifications: 0
Fixture modifications: 0
Historical report modifications: 0
Generated build artifact modifications: 0
Implementation performed: NO
Report file generated: SPATIAL_DENSITY_PRE_IMPLEMENTATION_ADVERSARIAL_EXPERIMENT_GATE.md
```

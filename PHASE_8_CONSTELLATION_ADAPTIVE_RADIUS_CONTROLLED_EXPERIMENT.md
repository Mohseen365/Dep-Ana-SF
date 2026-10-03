# PHASE 8 — CONSTELLATION ADAPTIVE-RADIUS CONTROLLED DENSITY EXPERIMENT REPORT

**Target Surface:** Dependency Constellation Lens (`viewMode = 'constellation'`)
**Experiment Date:** October 2026 / Phase 8 Freeze
**Execution Mode:** READ-ONLY / ADVERSARIAL CONTROLLED GEOMETRY EXPERIMENT
**Primary Question:** *Can adaptive ring-radius allocation, without changing topology or angular ordering, simultaneously reduce sparse-view whitespace and eliminate dense-ring node collisions?*
**Final Verdict & Classification:** `ADAPTIVE_RADIUS_INSUFFICIENT`

---

## 1. EXECUTIVE SUMMARY

This report documents the **read-only, adversarial, controlled geometry experiment** performed against the **Dependency Constellation lens** identified by Phase 7 / Phase 7A.

The objective was to evaluate whether changing **only ring-radius allocation** ($R_k$), while preserving all BFS depth semantics, focal selection, intra-ring angular ordering, topology, edge paths, rendering coordinate conventions, and lens-local position authority, could resolve the confirmed spatial-density and collision problems.

### Core Findings
1. **Primary Question Answer:** **NO.** Radius-only adaptation cannot simultaneously eliminate dense-ring node collisions and preserve acceptable spatial density / semantic locality without severe geometric degradation.
2. **Radius Explosion on Dense Rings:** For dense 1D orbital rings (e.g. Ring 2 in PBIM with $N_2 = 217$), eliminating 1D chord overlaps requires expanding the ring radius from $R_2 = 330\text{px}$ to $R_2 = 828.91\text{px}$ (+151.2% expansion). For a 3-hop neighborhood ($N_3 = 128$), outer Ring 3 radius expands to $R_3 = 978.91\text{px}$ (+103.9%), driving total occupied canvas width from $984\text{px}$ to $1,981.82\text{px}$ (+101.4%).
3. **Responsive ViewBox Scaling Degradation:** Because the occupied canvas width ($1,981.82\text{px}$) far exceeds the standard $900 \times 900\text{px}$ SVG viewBox, responsive container rendering scales the canvas down by $54.6\%$ in physical browser display space. This shrinks orbital node diameters from $24\text{px}$ down to $10.8\text{px}$, making labels visually illegible and negating the spatial benefit of radial expansion.
4. **Semantic Locality Stretching:** Radial expansion stretches connected primary edges significantly. On PBIM 2-hop ($N=287$), median connected edge Euclidean distance increases from $320.30\text{px}$ to $762.24\text{px}$ (+138.0%), and P95 edge distance increases from $507.33\text{px}$ to $1,092.21\text{px}$ (+115.3%).
5. **AABB Corner Overlap Insufficiency:** A 1D chord distance equal to node diameter ($24\text{px}$) is mathematically insufficient to eliminate 2D square $24 \times 24\text{px}$ AABB bounding box overlaps along diagonal circular arcs. On CST Org_Hierarchy ($N=205$), 120 residual AABB corner overlaps persist even when same-ring chord center spacing equals $24.00\text{px}$.
6. **Inability to Tighten Sparse Views:** In sparse 1-hop / 2-hop views (e.g. CST AccountController $N=37$), baseline radii ($R_1 = 180\text{px}, R_2 = 330\text{px}$) already satisfy minimum collision-free chord bounds ($R_{\text{required},1} = 13.86\text{px}, R_{\text{required},2} = 126.24\text{px}$). Because adaptive radius allocation only expands overcrowded rings, it leaves sparse-view $42.43\%$ empty space entirely untouched.
7. **Production Code Isolation:** Zero production source files (`explorer/src/...`) were modified. All experiment calculations were executed using a pure mathematical harness outside production source.

---

## 2. REPOSITORY STATE

The experiment was conducted on a clean repository state with zero production code changes:

- **Source Code Files:** $100\%$ untouched (`git status --short` confirms 0 production edits).
- **Constellation Adapter:** `explorer/src/lib/adapters/constellation-adapter.ts` remains clean baseline.
- **Constellation Layout Engine:** `explorer/src/lib/layout/constellation-layout.ts` remains clean baseline.
- **UI Lens Component:** `explorer/src/components/DependencyConstellationPanel.tsx` remains clean baseline.
- **Experimental Harness:** Executed strictly via `explorer/src/test/phase8-constellation-adaptive-radius-experiment.test.ts`.

---

## 3. PHASE 7 / 7A BASELINE REPRODUCTION

Before experimentation, the current baseline populations from Phase 7 / Phase 7A were re-verified and reproduced bit-for-bit:

### Population Reproduction Matrix
- **CST AccountController 2-hop:** $N = 37$ (Focal = 1, Ring 1 = 3, Ring 2 = 33)
- **CST Org_Hierarchy 3-hop:** $N = 205$ (Focal = 1, Ring 1 = 29, Ring 2 = 120, Ring 3 = 55)
- **BQC Bouquet_Order__c 2-hop:** $N = 134$ (Focal = 1, Ring 1 = 35, Ring 2 = 98)
- **BQC Bouquet_Order__c 3-hop:** $N = 169$ (Focal = 1, Ring 1 = 35, Ring 2 = 98, Ring 3 = 35)
- **PBIM Maintenance_Request__c 2-hop:** $N = 287$ (Focal = 1, Ring 1 = 69, Ring 2 = 217)
- **PBIM Maintenance_Request__c 3-hop:** $N = 415$ (Focal = 1, Ring 1 = 69, Ring 2 = 217, Ring 3 = 128)

All canonical population sizes match Phase 7 / Phase 7A baseline measurements with $0$ discrepancy.

---

## 4. CONSTELLATION GEOMETRY CONTRACT

The current production Constellation geometry contract established in Phase 7 / 7A is:

```text
Canvas Coordinate System:
Fixed 900 × 900 viewBox

Origin / Center Center:
cx = 450, cy = 450

Focal Node Geometry:
R0 = 0px, Diameter D0 = 36px (Radius r0 = 18px)

Orbital Node Geometry:
Diameter D = 24px (Radius r = 12px)

Base Orbital Radius (1-Hop Ring):
R1 = 180px

Ring Increment Step:
ΔR = 150px

Concentric Ring Radius Formula:
Rk = 180 + (k - 1) × 150  (where k is 1-based hop distance)

Intra-Ring Angular Step:
Δθk = 2π / Nk

Angular Assignment:
θ_k,i = -π/2 + i × (2π / Nk)
```

Ring membership is determined strictly by BFS graph traversal hop distance ($k = 1, 2, 3$).

---

## 5. EXPERIMENTAL MODEL

The Phase 8 experiment tested replacing the baseline radius $R_k$ with an experimentally computed adaptive radius while locking all other geometric parameters:

### Invariants Preserved
1. **Same node population**
2. **Same BFS hop distance & ring membership**
3. **Same intra-ring angular ordering rule** (`featureName` ASC $\rightarrow$ `layerName` ASC $\rightarrow$ `metrics.coupling` DESC $\rightarrow$ `nodeId` ASC)
4. **Same angle assignment** ($\theta_{k,i} = -\pi/2 + i \cdot \frac{2\pi}{N_k}$)
5. **Same edge set & directionality**
6. **Same focal node selection**
7. **Same node dimensions** ($24\text{px}$ orbital, $36\text{px}$ focal)
8. **Same lens-local coordinate origin** ($(cx, cy) = (450, 450)$)

---

## 6. MATHEMATICAL RADIUS DERIVATION

For a concentric ring $k$ containing $N_k$ nodes uniformly spaced along a 1D circular arc, adjacent angular slot separation is:

$$\Delta \theta_k = \frac{2\pi}{N_k}$$

The straight-line Euclidean center-to-center chord distance $C_k$ between adjacent nodes at radius $R_k$ is:

$$C_k = 2 R_k \sin\left(\frac{\pi}{N_k}\right)$$

To guarantee that adjacent orbital nodes of diameter $D = 24\text{px}$ maintain at least 1 node diameter center-to-center chord spacing ($C_k \ge D$):

$$2 R_k \sin\left(\frac{\pi}{N_k}\right) \ge D$$

Therefore, the minimum collision-free radius $R_{\text{required}, k}$ for ring $k$ with $N_k \ge 2$ is:

$$R_{\text{required}, k} \ge \frac{D}{2 \sin\left(\frac{\pi}{N_k}\right)}$$

For small angular steps ($\frac{\pi}{N_k} \ll 1$), using the small-angle approximation $\sin(x) \approx x$:

$$R_{\text{required}, k} \approx \frac{D N_k}{2 \pi} \approx \frac{24 N_k}{6.283185} \approx 3.8197 \times N_k\text{ px}$$

### Experimental Models Evaluated

- **Model A — Existing Fixed Radius (Baseline):**
  $$R_k = 180 + (k - 1) \times 150$$

- **Model B — Minimum Collision-Free Radius:**
  $$R_k = \max\left(R_{\text{baseline}, k}, \frac{D}{2 \sin(\pi / N_k)}\right)$$

- **Model C — Minimum Collision-Free Radius + Controlled Inter-Ring Spacing:**
  $$R_k = \max\left(R_{\text{baseline}, k}, \frac{D}{2 \sin(\pi / N_k)}, R_{k-1} + 150\text{px}\right)$$

---

## 7. BASELINE VS ADAPTIVE GEOMETRY (PER-RING AUDIT)

### Detailed Per-Ring Geometry Table

| Scenario | Ring $k$ | $N_k$ | Baseline $R_k$ (px) | Min-Free $R_{\text{req}}$ (px) | Adaptive $R_k$ (px) | Baseline Chord (px) | Adaptive Chord (px) |
| -------- | ------: | ----: | -----------------: | -----------------------------: | ------------------: | ------------------: | ------------------: |
| **CST AccountController 2-hop** | R1 | 3 | 180.00 | 13.86 | 180.00 | 311.77 | 311.77 |
| | R2 | 33 | 330.00 | 126.24 | 330.00 | 62.74 | 62.74 |
| **CST Org_Hierarchy 3-hop** | R1 | 29 | 180.00 | 110.99 | 180.00 | 38.92 | 38.92 |
| | R2 | 120 | 330.00 | 458.42 | 458.42 | 17.28 | 24.00 |
| | R3 | 55 | 480.00 | 210.20 | 608.42 | 54.81 | 69.47 |
| **BQC Bouquet_Order__c 2-hop** | R1 | 35 | 180.00 | 133.87 | 180.00 | 32.27 | 32.27 |
| | R2 | 98 | 330.00 | 374.40 | 374.40 | 21.15 | 24.00 |
| **BQC Bouquet_Order__c 3-hop** | R1 | 35 | 180.00 | 133.87 | 180.00 | 32.27 | 32.27 |
| | R2 | 98 | 330.00 | 374.40 | 374.40 | 21.15 | 24.00 |
| | R3 | 35 | 480.00 | 133.87 | 524.40 | 86.05 | 94.01 |
| **PBIM Maintenance_Request__c 2-hop** | R1 | 69 | 180.00 | 263.65 | 263.65 | 16.39 | 24.00 |
| | R2 | 217 | 330.00 | 828.91 | 828.91 | 9.55 | 24.00 |
| **PBIM Maintenance_Request__c 3-hop** | R1 | 69 | 180.00 | 263.65 | 263.65 | 16.39 | 24.00 |
| | R2 | 217 | 330.00 | 828.91 | 828.91 | 9.55 | 24.00 |
| | R3 | 128 | 480.00 | 488.97 | 978.91 | 23.56 | 48.05 |

---

## 8. COLLISION ANALYSIS

A same-ring collision occurs when center-to-center chord distance $C_k < 24\text{px}$. Geometric pairwise AABB collision checking was performed for all node pairs using $24 \times 24\text{px}$ orbital bounding boxes and $36 \times 36\text{px}$ focal bounding box.

### Pairwise AABB Overlap Table

| Scenario | Population $N$ | Overlaps Baseline (Model A) | Overlaps Adaptive (Model B) | Overlaps Adaptive Controlled (Model C) | Overlap Reduction % |
| -------- | -------------: | -------------------------: | --------------------------: | -------------------------------------: | ------------------: |
| **CST AccountController 2-hop** | 37 | 0 | 0 | 0 | **0.0% (Clean)** |
| **CST Org_Hierarchy 3-hop** | 205 | 120 | 120 | 120 | **0.0% (Unresolved)** |
| **BQC Bouquet_Order__c 2-hop** | 134 | 100 | 98 | 98 | **2.0%** |
| **BQC Bouquet_Order__c 3-hop** | 169 | 100 | 98 | 98 | **2.0%** |
| **PBIM Maintenance_Request__c 2-hop** | 287 | 565 | 282 | 282 | **50.1%** |
| **PBIM Maintenance_Request__c 3-hop** | 415 | 693 | 282 | 282 | **59.3%** |

### Mathematical Root-Cause of Residual AABB Overlaps
Why do 120 overlaps persist on CST Org_Hierarchy ($N_2 = 120$) even when 1D chord center distance is increased to $24.00\text{px}$?

1. **1D Chord vs 2D Square Bounding Box Geometry:**
   When two square nodes of size $24 \times 24\text{px}$ sit on a circle at chord center distance $24.00\text{px}$, their center distance along the chord is exactly $24.00\text{px}$. However, because the chord is inclined relative to the horizontal $X$ and vertical $Y$ axes, the coordinate differences $|\Delta X|$ and $|\Delta Y|$ are both strictly less than $24.00\text{px}$:
   $$|\Delta X| = 24 \cdot \cos(\alpha) < 24.00\text{px}$$
   $$|\Delta Y| = 24 \cdot \sin(\alpha) < 24.00\text{px}$$
   According to 2D AABB intersection math, two square $W \times H$ boxes centered at $(x_1, y_1)$ and $(x_2, y_2)$ overlap whenever:
   $$\text{xOverlap} = \max(0, W - |\Delta X|) > 0 \quad \text{AND} \quad \text{yOverlap} = \max(0, H - |\Delta Y|) > 0$$
   Since both $|\Delta X| < 24$ and $|\Delta Y| < 24$ for any non-orthogonal chord angle $\alpha \notin \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}$, the corner bounding boxes overlap!

2. **Diagonal AABB Clearance Requirement:**
   To guarantee zero 2D AABB bounding box overlap for arbitrary circular arc orientations, center-to-center chord distance must equal or exceed the bounding box diagonal:
   $$C_{\text{AABB\_clear}} \ge \sqrt{24^2 + 24^2} = 24 \sqrt{2} \approx 33.941\text{px}$$

   If $C_{\text{AABB\_clear}} = 33.94\text{px}$ were enforced for Ring 2 of PBIM ($N_2 = 217$), the required radius would explode further to:
   $$R_{\text{required\_AABB}} = \frac{33.941}{2 \sin(\pi / 217)} = 1,172.26\text{px}$$
   and Ring 3 ($N_3 = 128$) would explode to $R_3 = 1,322.26\text{px}$, creating a canvas width of **$2,684.52\text{px}$** (+172.8% over baseline)!

---

## 9. SEMANTIC LOCALITY ANALYSIS

Semantic locality measures center-to-center Euclidean distances for connected primary edges in the $k$-hop neighborhood graph.

### Connected Edge Locality Distribution

| Dataset/View | Baseline Median (px) | Adaptive Median (px) | Baseline P95 (px) | Adaptive P95 (px) | Baseline Max (px) | Adaptive Max (px) | Locality Stretch % |
| ------------ | -------------------: | -------------------: | ----------------: | ----------------: | ----------------: | ----------------: | -----------------: |
| **CST AccountController 2-hop** | 461.77 | 461.77 | 641.40 | 641.40 | 659.25 | 659.25 | **0.0% (Unchanged)** |
| **CST Org_Hierarchy 3-hop** | 313.57 | 418.07 | 656.38 | 891.50 | 928.46 | 1,176.86 | **+33.3%** |
| **BQC Bouquet_Order__c 2-hop** | 257.45 | 281.65 | 503.55 | 548.17 | 509.91 | 554.32 | **+9.4%** |
| **BQC Bouquet_Order__c 3-hop** | 266.19 | 300.45 | 573.71 | 634.49 | 959.03 | 1,047.74 | **+12.9%** |
| **PBIM Maintenance_Request__c 2-hop** | 320.30 | 762.24 | 507.33 | 1,092.21 | 657.91 | 1,652.56 | **+138.0%** |
| **PBIM Maintenance_Request__c 3-hop** | 345.05 | 803.03 | 629.54 | 1,417.94 | 809.98 | 1,807.77 | **+132.7%** |

### Nearest-Neighbor Distance Distribution

| Dataset/View | Baseline NN Median (px) | Adaptive NN Median (px) | Baseline NN P95 (px) | Adaptive NN P95 (px) | Baseline NN Max (px) | Adaptive NN Max (px) |
| ------------ | ----------------------: | ----------------------: | -------------------: | -------------------: | -------------------: | -------------------: |
| **CST AccountController 2-hop** | 62.74 | 62.74 | 150.00 | 150.00 | 180.00 | 180.00 |
| **CST Org_Hierarchy 3-hop** | 17.28 | 24.00 | 54.81 | 69.47 | 180.00 | 180.00 |
| **BQC Bouquet_Order__c 2-hop** | 21.15 | 24.00 | 32.27 | 32.27 | 180.00 | 180.00 |
| **BQC Bouquet_Order__c 3-hop** | 21.15 | 24.00 | 86.05 | 94.01 | 180.00 | 180.00 |
| **PBIM Maintenance_Request__c 2-hop** | 9.55 | 24.00 | 16.39 | 24.00 | 180.00 | 263.65 |
| **PBIM Maintenance_Request__c 3-hop** | 9.55 | 24.00 | 23.56 | 48.05 | 180.00 | 263.65 |

---

## 10. SPARSE-DENSITY ANALYSIS

Spatial density and empty space percentage were calculated for both baseline fixed radius and experimental adaptive radius across all views:

- **Baseline ViewBox Area:** Fixed $900 \times 900\text{px} = 810,000\text{px}^2$.
- **Occupied Bounding Box Area:** $(\text{maxX} - \text{minX}) \times (\text{maxY} - \text{minY})$.
- **Baseline Empty Space %:** $\max\left(0, 1 - \frac{\text{Occupied Bounding Box Area}}{900 \times 900}\right) \times 100\%$.
- **Adaptive Occupied Empty Space %:** Empty space inside the expanded bounding box required to contain the adaptive radial layout.

### Sparse Density Summary
- In sparse views (e.g. CST AccountController 2-hop, $N=37$), baseline radii ($R_1 = 180\text{px}, R_2 = 330\text{px}$) already satisfy $R_{\text{required}}$ bounds ($13.86\text{px}$ and $126.24\text{px}$).
- Because adaptive radius allocation only expands rings when $R_{\text{required}} > R_{\text{baseline}}$, it leaves sparse views completely unmodified ($683.25 \times 682.51\text{px}$ bounding box, $42.43\%$ empty space).
- The $42.43\%$ to $80\%$ reported empty space in sparse views is driven by fixed radius selection ($180\text{px} / 150\text{px}$) inside a fixed $900 \times 900\text{px}$ SVG canvas container.

---

## 11. VIEWBOX / CONTAINER ANALYSIS

Three distinct coordinate and display spaces must be separated:

1. **Logical Layout Coordinate Space:** The raw polar coordinates $(x, y)$ computed centered at $(450, 450)$.
2. **SVG ViewBox Space:** The `<svg viewBox="minX minY width height">` clipping boundary.
3. **Rendered Physical Container Space:** The responsive browser DOM container (typically $1100\text{px} - 1200\text{px}$ wide on modern viewports).

### Rendered Container Scaling Factor

When adaptive radius expands occupied canvas width beyond $900\text{px}$, the SVG element must either expand its viewBox or clip nodes. In a responsive SVG setup (`maxWidth: 100%, height: auto`), the SVG scale factor relative to standard $900\text{px}$ display is:

$$S_{\text{container}} = \min\left(1.0, \frac{900}{\text{Occupied Canvas Width}}\right)$$

### Responsive Scaling Degradation Table

| Scenario | Occupied Width Baseline (px) | Occupied Width Adaptive (px) | Rendered Container Scale Factor | Effective Visual Node Diameter |
| -------- | ---------------------------: | ---------------------------: | ------------------------------: | -----------------------------: |
| **CST AccountController 2-hop** | 683.25 | 683.25 | 1.0000 (100.0%) | 24.00 px |
| **CST Org_Hierarchy 3-hop** | 983.61 | 1,240.34 | 0.7256 (72.6%) | 17.41 px |
| **BQC Bouquet_Order__c 2-hop** | 683.66 | 772.41 | 1.0000 (100.0%) | 24.00 px |
| **BQC Bouquet_Order__c 3-hop** | 983.03 | 1,071.74 | 0.8398 (84.0%) | 20.16 px |
| **PBIM Maintenance_Request__c 2-hop** | 683.98 | 1,681.77 | 0.5352 (53.5%) | **12.84 px** |
| **PBIM Maintenance_Request__c 3-hop** | 984.00 | 1,981.82 | 0.4541 (45.4%) | **10.90 px** |

On dense views (PBIM 3-hop), adaptive radius expansion shrinks the visual rendered node diameter from $24.00\text{px}$ down to **$10.90\text{px}$** in physical display space. This renders labels illegible and completely negates the visual benefit of radial expansion.

---

## 12. DATASET-BY-DATASET RESULTS

### CST AccountController ($N=37$)
- **Population:** 1 Focal Node, 3 Ring-1 Nodes, 33 Ring-2 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 13.86\text{px}, R_{\text{req},2} = 126.24\text{px}$.
- **Adaptive Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}$ (Unchanged).
- **Overlaps:** 0 Baseline, 0 Adaptive.
- **Verdict:** Baseline is already collision-safe. Adaptive radius does not alter this sparse view.

### CST Org_Hierarchy ($N=205$)
- **Population:** 1 Focal Node, 29 Ring-1 Nodes, 120 Ring-2 Nodes, 55 Ring-3 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}, R_3 = 480\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 110.99\text{px}, R_{\text{req},2} = 458.42\text{px}, R_{\text{req},3} = 210.20\text{px}$.
- **Adaptive Radii:** $R_1 = 180.00\text{px}, R_2 = 458.42\text{px}, R_3 = 608.42\text{px}$.
- **Occupied Width:** $983.61\text{px} \rightarrow 1,240.34\text{px}$ (+26.1%).
- **Overlaps:** 120 Baseline, 120 Adaptive.
- **Verdict:** Same-ring chord center distance reaches $24.00\text{px}$, but 2D square AABB corner overlaps persist for all 120 Ring-2 nodes due to diagonal arc orientation.

### BQC Bouquet_Order__c 2-hop ($N=134$)
- **Population:** 1 Focal Node, 35 Ring-1 Nodes, 98 Ring-2 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 133.87\text{px}, R_{\text{req},2} = 374.40\text{px}$.
- **Adaptive Radii:** $R_1 = 180.00\text{px}, R_2 = 374.40\text{px}$.
- **Occupied Width:** $683.66\text{px} \rightarrow 772.41\text{px}$ (+13.0%).
- **Overlaps:** 100 Baseline $\rightarrow$ 98 Adaptive (2.0% reduction).

### BQC Bouquet_Order__c 3-hop ($N=169$)
- **Population:** 1 Focal Node, 35 Ring-1 Nodes, 98 Ring-2 Nodes, 35 Ring-3 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}, R_3 = 480\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 133.87\text{px}, R_{\text{req},2} = 374.40\text{px}, R_{\text{req},3} = 133.87\text{px}$.
- **Adaptive Radii:** $R_1 = 180.00\text{px}, R_2 = 374.40\text{px}, R_3 = 524.40\text{px}$.
- **Occupied Width:** $983.03\text{px} \rightarrow 1,071.74\text{px}$ (+9.0%).
- **Overlaps:** 100 Baseline $\rightarrow$ 98 Adaptive (2.0% reduction).

### PBIM Maintenance_Request__c 2-hop ($N=287$)
- **Population:** 1 Focal Node, 69 Ring-1 Nodes, 217 Ring-2 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 263.65\text{px}, R_{\text{req},2} = 828.91\text{px}$.
- **Adaptive Radii:** $R_1 = 263.65\text{px}, R_2 = 828.91\text{px}$.
- **Occupied Width:** $683.98\text{px} \rightarrow 1,681.77\text{px}$ (+145.9%).
- **Connected Edge Median:** $320.30\text{px} \rightarrow 762.24\text{px}$ (+138.0%).
- **Overlaps:** 565 Baseline $\rightarrow$ 282 Adaptive (50.1% reduction).

### PBIM Maintenance_Request__c 3-hop ($N=415$)
- **Population:** 1 Focal Node, 69 Ring-1 Nodes, 217 Ring-2 Nodes, 128 Ring-3 Nodes.
- **Baseline Radii:** $R_1 = 180\text{px}, R_2 = 330\text{px}, R_3 = 480\text{px}$.
- **Min Collision-Free Radii:** $R_{\text{req},1} = 263.65\text{px}, R_{\text{req},2} = 828.91\text{px}, R_{\text{req},3} = 488.97\text{px}$.
- **Adaptive Radii:** $R_1 = 263.65\text{px}, R_2 = 828.91\text{px}, R_3 = 978.91\text{px}$.
- **Occupied Width:** $984.00\text{px} \rightarrow 1,981.82\text{px}$ (+101.4%).
- **Connected Edge Median:** $345.05\text{px} \rightarrow 803.03\text{px}$ (+132.7%).
- **Overlaps:** 693 Baseline $\rightarrow$ 282 Adaptive (59.3% reduction).

---

## 13. DETERMINISM

Determinism testing was conducted across 10 identical executions on all scenarios:

- **Coordinate Drift:** $0.00000\text{px}$ across all 10 runs.
- **Ring Membership:** Identical across all 10 runs.
- **Node Ordering Hash:** Identical across all 10 runs (`100% PASS`).

---

## 14. INPUT-ORDER INVARIANCE

Input-order invariance was evaluated by executing 10 runs with randomly shuffled node and edge input arrays:

- **Coordinate Drift:** $0.00000\text{px}$ across all 10 shuffled runs.
- **Intra-Ring Ordering:** Bit-for-bit identical sequence hashes (`100% PASS`).
- **Determinism Status:** $100\%$ deterministic under input permutations.

---

## 15. REGRESSION ANALYSIS

The experiment explicitly monitored for geometric and visual regressions introduced by adaptive radius allocation:

```text
REGRESSION CHECKLIST:
[FAIL] Radius Explosion: Ring 2 radius expanded up to 828.91px (+151.2%), Ring 3 up to 978.91px (+103.9%).
[FAIL] Semantic Edge Stretching: Median connected edge distance stretched by +138.0% on PBIM (320.30px -> 762.24px).
[FAIL] Canvas Ballooning: Occupied canvas width expanded from 984px to 1,981.82px (+101.4%).
[FAIL] Physical Container Scaling Degradation: Responsive SVG container shrinks display scale factor down to 0.4541, reducing visual node diameter to 10.90px.
[FAIL] Residual AABB Overlaps: 282 to 120 residual node overlaps persist due to 2D AABB corner overlap geometry.
```

---

## 16. FAILURE ATTRIBUTION

The failure of radius-only adaptation to solve the Constellation spatial-density problem is attributed to three primary geometric drivers:

1. **`RADIUS_EXPLOSION`:** Allocating $N_2 = 217$ components on a single 1D circular orbit forces $R_2 = 828.91\text{px}$, causing pathological canvas expansion.
2. **`SEMANTIC_STRETCH`:** Pushing orbital radii outward to accommodate dense rings increases connected edge distances by $> 130\%$, visually disconnecting related components.
3. **`AABB_CORNER_COLLISION`:** 1D chord center distance equal to node diameter ($24\text{px}$) fails to prevent 2D square $24 \times 24\text{px}$ bounding box corner overlaps on circular arcs.

---

## 17. EXPERIMENT GATE MATRIX

| Gate ID | Gate Name | Target / Requirement | Measured Value | Gate Verdict |
| ------- | --------- | -------------------- | -------------- | ------------ |
| **G1** | Zero Production Edges | 0 modified production source files | 0 files modified | **PASS** |
| **G2** | Population Reproduction | Match Phase 7/7A exact populations | 100% Match (37, 205, 134, 169, 287, 415) | **PASS** |
| **G3** | Zero Overlaps Required | 0 residual node overlaps | 120–282 residual overlaps persist | **FAIL** |
| **G4** | Bounded Canvas Expansion | Bounded occupied width $\le 1100\text{px}$ | Max width = $1,981.82\text{px}$ | **FAIL** |
| **G5** | Bounded Semantic Locality | Edge distance stretch $\le +20\%$ | Max median stretch = $+138.0\%$ | **FAIL** |
| **G6** | Legible Rendered Scale | Rendered scale factor $\ge 0.80$ | Scale factor = $0.4541$ ($10.90\text{px}$ visual node) | **FAIL** |
| **G7** | Angular Ordering Invariance | $0.00000\text{px}$ drift, identical ordering hash | Bit-for-bit identical (SHA-256 match) | **PASS** |
| **G8** | Determinism & Shuffle Safety | $0.00000\text{px}$ drift over 10x shuffles | $0.00000\text{px}$ drift | **PASS** |

---

## 18. CANONICAL RESULTS SUMMARY TABLES

### Table 1 — Required Results Table

| Dataset/View | $N$ | Baseline $R$ (px) | Adaptive $R$ (px) | Baseline Chord (px) | Adaptive Chord (px) | Overlaps Baseline | Overlaps Adaptive | Baseline M1 (px) | Adaptive M1 (px) | Baseline P95 (px) | Adaptive P95 (px) | Width Delta (px) |
| ------------ | -: | ----------------: | ----------------: | ------------------: | ------------------: | ----------------: | ----------------: | ---------------: | ----------------: | ----------------: | ----------------: | ---------------: |
| **CST AccountController 2-hop** | 37 | 180 / 330 | 180 / 330 | 311.77 / 62.74 | 311.77 / 62.74 | 0 | 0 | 461.77 | 461.77 | 641.40 | 641.40 | 0.00 |
| **CST Org_Hierarchy 3-hop** | 205 | 180 / 330 / 480 | 180 / 458.42 / 608.42 | 38.92 / 17.28 / 54.81 | 38.92 / 24.00 / 69.47 | 120 | 120 | 313.57 | 418.07 | 656.38 | 891.50 | +256.73 |
| **BQC Bouquet_Order__c 2-hop** | 134 | 180 / 330 | 180 / 374.40 | 32.27 / 21.15 | 32.27 / 24.00 | 100 | 98 | 257.45 | 281.65 | 503.55 | 548.17 | +88.75 |
| **BQC Bouquet_Order__c 3-hop** | 169 | 180 / 330 / 480 | 180 / 374.40 / 524.40 | 32.27 / 21.15 / 86.05 | 32.27 / 24.00 / 94.01 | 100 | 98 | 266.19 | 300.45 | 573.71 | 634.49 | +88.71 |
| **PBIM Maintenance_Request__c 2-hop** | 287 | 180 / 330 | 263.65 / 828.91 | 16.39 / 9.55 | 24.00 / 24.00 | 565 | 282 | 320.30 | 762.24 | 507.33 | 1,092.21 | +997.79 |
| **PBIM Maintenance_Request__c 3-hop** | 415 | 180 / 330 / 480 | 263.65 / 828.91 / 978.91 | 16.39 / 9.55 / 23.56 | 24.00 / 24.00 / 48.05 | 693 | 282 | 345.05 | 803.03 | 629.54 | 1,417.94 | +997.82 |

### Table 2 — Required Density Table

| Dataset/View | Empty Space % Baseline | Empty Space % Adaptive | Occupied Width Baseline (px) | Occupied Width Adaptive (px) | Median Edge Distance Baseline (px) | Median Edge Distance Adaptive (px) |
| ------------ | ---------------------: | ---------------------: | ---------------------------: | ---------------------------: | ---------------------------------: | ---------------------------------: |
| **CST AccountController 2-hop** | 42.43% | 42.43% | 683.25 | 683.25 | 461.77 | 461.77 |
| **CST Org_Hierarchy 3-hop** | 0.00% | 11.75% | 983.61 | 1,240.34 | 313.57 | 418.07 |
| **BQC Bouquet_Order__c 2-hop** | 42.27% | 26.31% | 683.66 | 772.41 | 257.45 | 281.65 |
| **BQC Bouquet_Order__c 3-hop** | 0.00% | 13.42% | 983.03 | 1,071.74 | 266.19 | 300.45 |
| **PBIM Maintenance_Request__c 2-hop** | 42.24% | 8.88% | 683.98 | 1,681.77 | 320.30 | 762.24 |
| **PBIM Maintenance_Request__c 3-hop** | 0.00% | 7.61% | 984.00 | 1,981.82 | 345.05 | 803.03 |

---

## 19. FINAL CLASSIFICATION

```text
ADAPTIVE_RADIUS_INSUFFICIENT
```

### Summary Justification
Changing **ring-radius allocation alone** is mathematically and empirically **INSUFFICIENT** to solve the spatial-density and collision problem on the Dependency Constellation lens.

While expanding ring radii can increase 1D chord separation, doing so on dense orbital rings ($N_k > 40$) forces severe radius explosion ($R_2 = 828.91\text{px}$), doubles occupied canvas width ($1,981.82\text{px}$), stretches connected edge distances by $> 130\%$, forces responsive SVG container down-scaling ($0.4541$ scale factor), and fails to eliminate 2D AABB corner overlaps (282 residual overlaps on PBIM). Meanwhile, radius expansion leaves sparse-view $42\%$ whitespace completely unresolved.

---

## 20. EXPLICIT NEXT-STEP RECOMMENDATIONS

1. **Do Not Implement Production Radius-Only Scaling:** Reject single-track adaptive radius scaling for production Constellation layout.
2. **Authorize Multi-Track Sub-Ring Experiment (Phase 9 Candidate):** The experimental proof that 1D single-circle capacity overflows at $N_k > 40$ provides direct mathematical justification for testing **multi-track concentric sub-rings** ($R_k \pm \Delta r$) within each hop ring. Splitting $N_2 = 217$ across 4 concentric sub-tracks ($54$ nodes/track) reduces required track radius from $828.91\text{px}$ down to $\approx 210\text{px}$, keeping the total canvas width strictly bounded within $900\text{px}$.
3. **Authorize Responsive ViewBox & Dynamic Focal Scale Optimization:** For sparse views ($N < 40$), evaluate dynamic viewBox tightening ($600 \times 600\text{px}$) to eliminate whitespace without altering polar coordinates.

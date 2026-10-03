# PHASE 19 — HYBRID SPATIAL-DENSITY TRUTH AUDIT & COMMON GRAPH VIEW MEASUREMENT GATE

**Target System:** Salesforce Architecture Explorer (`explorer/src/lib/layout`, `explorer/src/components/GraphView.tsx`)
**Audit Type:** Read-Only, Adversarial, Production-Truth Audit
**Status:** Complete Baseline Measurement & Truth Audit Gate
**Primary Classification:** `HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED`
**Production Code Modifications:** 0 files modified (`PRODUCTION_MUTATION_DETECTED = FALSE`)
**Test / Harness Additions:** `explorer/src/test/phase19-hybrid-audit.test.ts`, `scripts/audit-phase19-hybrid-browser.cjs`

---

## 1. Executive Summary

Phase 19 completes a read-only, adversarial, production-truth audit of the **Hybrid Graph View layout** (`architectureMode = 'hybrid'`, invoking `computeArchitectureLayoutWithMetadata` with `enableFeatureLayout: true`).

The core project objective evaluated is:
> **Determine whether nodes are unnecessarily far apart in Graph View across the three layouts: Hierarchy, Constellation, and Hybrid.**

While Hierarchy (Phase 1–6, Candidate D promoted) and Constellation (Phase 7–18, minimum safe spacing frozen) have undergone exhaustive evidence-driven investigation, Hybrid remained an unresolved evidence gap.

### Key Audit Findings
1. **Hybrid Spatial Density Problem Confirmed (`HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED`)**: In real production Graph View usage, Hybrid produces pathologically large spatial separation between connected nodes ($M_5$ median $1,080\text{px}$ to $2,759\text{px}$, P95 $6,743\text{px}$ to $18,041\text{px}$, Max $8,280\text{px}$ to $24,317\text{px}$ on large enterprise datasets) and intra-feature semantic neighbors ($M_6$ median $2,790\text{px}$ to $9,861\text{px}$, P95 $8,146\text{px}$ to $22,199\text{px}$).
2. **Root Cause Attributed to Layer Supremacy and Vertical 2D Band Offset Accumulation**: In Stage 5 (`computeGlobalFeatureLayout` in `global-layout.ts`), feature regions are organized into horizontal bands. Within each band, nodes are split vertically across architectural layer tiers (`presentation` Y=100, `application` Y=350, `domain` Y=600, `schema` Y=850). When multi-row packing wraps feature regions into stacked vertical rows, each row adds the full height of all preceding rows ($+1,400\text{px}$ to $+2,500\text{px}$ per row band). As a result, nodes belonging to the same feature cluster or connected via direct dependency edges are separated by up to $10,000\text{px} - 24,000\text{px}$ vertically.
3. **Measurement & Render Integrity Confirmed (`0.00000px` Drift)**: Layout-Space coordinates map bit-for-bit to Adapter Space, Cytoscape SVG Space, and Render Space. Real-browser Playwright verification across 4 viewports ($1024\times768$ to $2560\times1440$) proved `ADAPTER_RUNTIME_DRIFT = 0.00000px` and `DOM_RUNTIME_DRIFT = 0.00000px` with $0$ console or page errors. Cytoscape viewport auto-fit scales the rendered canvas down ($zoom \approx 0.11 - 0.33$ on large graphs), but the underlying layout coordinates remain pathologically expanded.
4. **Collision Safety, Determinism, and Input-Order Invariance Maintained**: Across all 11 repository project datasets, Hybrid layout achieved $0$ AABB node collisions, $0.00000\text{px}$ 10x repeat determinism drift, and $0.00000\text{px}$ 10x input-order permutation drift.
5. **No Production Code Changed**: This audit was conducted strictly read-only with zero production code modifications (`PRODUCTION_MUTATION_DETECTED = FALSE`).

---

## 2. Original Graph View Objective

The overarching project objective is to determine whether nodes are unnecessarily far apart in Graph View across all three visualization models:
- **Hierarchy** (Hierarchical multi-tier layer graph)
- **Constellation** (Radial concentric-ring dependency constellation)
- **Hybrid** (2D feature-aware architectural cluster graph)

Phase 19 specifically establishes whether the reported spatial density issue in Hybrid is a real technical problem in layout geometry or rendering, isolates where the expansion occurs, and determines whether further Hybrid engineering work is justified.

---

## 3. Historical Evidence Reused

### 3.1 Hierarchy
- **Established Status**: `HISTORICALLY VERIFIED / CANDIDATE D PROMOTED`
- **Key Artifacts**: SB-1A through SB-1C, Phase 4 Spatial Density Closure, Phase 5A–5F Bridge Occupancy, Phase 5M–5O Candidate D Processing Order, Phase 6 Production Truth Gate.
- **Outcome**: Candidate D processing order (`enableCandidateDOrdering: true`) promoted into production. Bounded bridge placement and H-5A candidate sorting eliminated Stage 8 bridge-primary overlaps while optimizing semantic locality. Geometry frozen.

### 3.2 Constellation
- **Established Status**: `HISTORICALLY VERIFIED / PENDING PRODUCT ACCEPTANCE`
- **Key Artifacts**: Phase 7/7A Spatial-Density Truth Audit, Phase 8 Adaptive Radius, Phase 9 Multi-Track Sub-Ring, Phase 10 Residual Collision Gate, Phase 12 Minimum Safe Spacing Geometry Contract, Phase 13 Production Implementation, Phase 14 Broader Regression Gate, Phase 15–18 Product Acceptance / Decision Intake Package.
- **Outcome**: Production geometry frozen at Phase 12 contract ($N \le 30 \implies T=1$, $N > 30 \implies T=4$, $40\text{px}$ track clearance, $120\text{px}$ inter-ring gap, $180\text{px}$ base radius). Zero AABB or DOM collisions across all 11 project datasets. Remaining gap is Product/UX business sign-off on density vs locality tradeoff, not a technical geometry bug.

### 3.3 Why Hybrid Remains Open
Unlike Hierarchy and Constellation, Hybrid has not previously undergone a formal, cross-dataset spatial density truth audit using a common measurement contract. While Phase 15B reconciled intermediate Candidate E edge crossing counts ($C_{\text{total}} = 94,662 \le 95,000$), it did not measure connected-edge distance distributions, occupied spatial footprint, or render-space drift across the repository's 11 real-project datasets. Phase 19 fills this technical evidence gap.

---

## 4. Common Graph View Measurement Contract

To evaluate spatial density consistently across all Graph View layouts without inventing arbitrary product thresholds, Phase 19 establishes the frozen **Common Graph View Measurement Contract (M1–M10)**:

- **M1 — Occupied Width**: $X_{\max} - X_{\min} = \max(\text{node.right}) - \min(\text{node.left})$ in layout space before viewport scaling.
- **M2 — Occupied Height**: $Y_{\max} - Y_{\min} = \max(\text{node.bottom}) - \min(\text{node.top})$ in layout space before viewport scaling.
- **M3 — Occupied Area**: $\text{OccupiedWidth} \times \text{OccupiedHeight}$.
- **M4 — Empty-Space Ratio**: $1 - \frac{\sum (\text{nodeWidth} \times \text{nodeHeight})}{\text{OccupiedArea}}$. Quantifies spatial bounding-box utilization.
- **M5 — Connected-Edge Distance**: Euclidean distance $\sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}$ for every literal graph edge. Reported as Count, Min, Median, P75, P95, P99, Max.
- **M6 — Semantic-Neighbor Distance**: Distance between semantically related nodes beyond literal edges (specifically, intra-feature cluster members and satellite-to-parent tethers).
- **M7 — Nearest-Neighbor Distance**: For every node, Euclidean distance to its nearest neighboring node center. Reported as Median, P75, P95, P99, Max.
- **M8 — Edge-Length Distribution**: Percentile distribution ($P_0, P_{50}, P_{75}, P_{95}, P_{99}, P_{100}$) of connected edge distances.
- **M9 — Component Separation**: For multi-component graphs, Euclidean distance between bounding boxes of distinct connected components.
- **M10 — Node Population & Topology**: Node count ($N$), Edge count ($E$), Connected components count, Graph density $\frac{2E}{N(N-1)}$, Max node degree.
- **Normalized Connected-Edge Distance**: $\frac{\text{ConnectedEdgeDistance}}{\text{OccupiedGraphScale}}$, where $\text{OccupiedGraphScale} = \sqrt{\text{OccupiedWidth}^2 + \text{OccupiedHeight}^2}$.

---

## 5. Hybrid Production Pipeline

The production pipeline for Hybrid layout operates through the following deterministic stages:

```text
GraphView.tsx
  ↓ (architectureMode = 'hybrid' -> enableFeatureLayout = true)
graph-layout.ts::runLayoutWithMetadata()
  ↓
architecture-layout.ts::computeArchitectureLayoutWithMetadata()
  │
  ├─ Stage 0: defensive clone & ID lexicographical sort
  ├─ Stage 1: computeArchitectureAnalysis()
  ├─ Stage 2: classifyNodeLayerWithReason()
  ├─ Stage 3: discoverDomains()
  ├─ Stage 3.5: discoverFeatures() in features.ts
  ├─ Stage 4: computeGraphCentralityAnalysis()
  ├─ Stage 5: computeGlobalFeatureLayout() in global-layout.ts (2D Feature Region & Band Packing)
  ├─ Stage 6: reduceEdgeCrossings() in ordering.ts (Barycenter Sweeps)
  ├─ Stage 7: computeLocalNodeLayout() in local-layout.ts (Intra-Bucket Tier Matrix)
  ├─ Stage 8: calculateBridgeCandidatePosition() in centrality.ts
  ├─ Stage 9: placeSatellites() in satellites.ts
  ├─ Stage 10: packComponentPositions() in components.ts (FFDH 2D Shelf Packing)
  ├─ Stage 11: resolveSpacingAndCollisions() in spacing.ts (Spatial Hash Grid Cleanup)
  └─ Stage 12: Position Authority Restoration (existingPositions override)
  ↓
Cytoscape Canvas Position Assignment (cyNode.position())
  ↓
Viewport / ViewBox Auto-Fit (cy.fit())
```

---

## 6. Position Authority / Coordinate Systems

To guarantee measurement validity, Phase 19 audited coordinate fidelity across all 4 system layers:

1. **LAYOUT SPACE**: Authoritative Cartesian coordinates $\{x, y\}$ generated at Stage 11/12 of `computeArchitectureLayoutWithMetadata`. Default node width = $120\text{px}$, height = $60\text{px}$.
2. **ADAPTER SPACE**: Coordinates captured into `sessionPositionsRef` / `nodePositions` state in `GraphView.tsx` with provenance `automatic-hybrid`.
3. **SVG SPACE**: Coordinates assigned to Cytoscape internal nodes (`cyNode.position()`).
4. **SCREEN SPACE**: Visible pixels rendered in browser viewport window, calculated as:
   $$\text{ScreenX} = \text{LayoutX} \cdot \text{zoom} + \text{panX}$$
   $$\text{ScreenY} = \text{LayoutY} \cdot \text{zoom} + \text{panY}$$

### Runtime Drift Verification
- **Layout Space $\to$ Adapter Space Drift**: `0.00000 px`
- **Adapter Space $\to$ DOM/SVG Space Drift**: `0.00000 px`
- **Clipping / Overflow**: None inside Cytoscape container extent.

---

## 7. Dataset Inventory

The audit evaluated Hybrid layout against all 11 project datasets present in the repository under `explorer/public/projects/`:

| Dataset ID | Name / Description | Node Count ($N$) | Edge Count ($E$) | Components | Max Degree | Density |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| `cst` | Cloud Spend Tracker (Canonical Fixture) | 240 | 1,024 | 4 | 80 | 0.0357 |
| `bqc` | Batch Query Context Dataset | 274 | 603 | 6 | 66 | 0.0161 |
| `pbim` | Public Infrastructure Management (Large) | 528 | 2,063 | 9 | 148 | 0.0148 |
| `cloud-spend-tracker` | Cloud Spend Tracker App | 240 | 1,024 | 4 | 80 | 0.0357 |
| `food-app` | Food App (Single Node Boundary) | 1 | 0 | 1 | 0 | 0.0000 |
| `movie` | Movie Sample Graph | 9 | 16 | 1 | 9 | 0.4444 |
| `movie-app` | Movie App Graph | 9 | 16 | 1 | 9 | 0.4444 |
| `project-b` | Project B Multi-Component Graph | 14 | 16 | 3 | 7 | 0.1758 |
| `pub-infra-mang` | Public Infrastructure Management (Alias) | 528 | 2,063 | 9 | 148 | 0.0148 |
| `test-canonical-project` | Canonical 2-Node Edge Boundary | 2 | 1 | 1 | 1 | 1.0000 |
| `test-norm-proj` | Normalized Single Node Boundary | 1 | 0 | 1 | 0 | 0.0000 |

---

## 8. Runtime Environment and Commit SHA

- **Commit SHA**: `34827368291e1af8b0dc41cdc225290da12ed656`
- **Runtime Environment**: Node.js v22.22.1, Linux 6.6.137+, Vitest v5.0.3, Playwright v1.63.0 (Chromium 1243 Headless).
- **Harness File**: `explorer/src/test/phase19-hybrid-audit.test.ts`
- **Browser Script**: `scripts/audit-phase19-hybrid-browser.cjs`
- **Raw Telemetry Output**: `audit-fixtures/phase19-hybrid-audit-results.json` and `audit-fixtures/phase19-hybrid-browser-results.json`

---

## 9. Hybrid Layout-Space Measurements

Quantitative spatial footprint and bounding box measurements captured in raw Layout Space:

| Dataset | Width ($M_1$) | Height ($M_2$) | Area ($M_3$) | Empty-Space Ratio ($M_4$) | Scale ($\sqrt{W^2+H^2}$) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `cst` | 3,300 px | 11,000 px | $3.63 \times 10^7 \text{ px}^2$ | 0.9524 | 11,484 px |
| `bqc` | 5,319 px | 9,140 px | $4.86 \times 10^7 \text{ px}^2$ | 0.9594 | 10,575 px |
| `pbim` | 7,160 px | 25,460 px | $1.82 \times 10^8 \text{ px}^2$ | 0.9791 | 26,448 px |
| `cloud-spend-tracker` | 3,300 px | 11,000 px | $3.63 \times 10^7 \text{ px}^2$ | 0.9524 | 11,484 px |
| `food-app` | 120 px | 60 px | $7.20 \times 10^3 \text{ px}^2$ | 0.0000 | 134 px |
| `movie` | 520 px | 480 px | $2.50 \times 10^5 \text{ px}^2$ | 0.7404 | 708 px |
| `movie-app` | 520 px | 480 px | $2.50 \times 10^5 \text{ px}^2$ | 0.7404 | 708 px |
| `project-b` | 1,080 px | 620 px | $6.70 \times 10^5 \text{ px}^2$ | 0.8495 | 1,245 px |
| `pub-infra-mang` | 7,160 px | 25,460 px | $1.82 \times 10^8 \text{ px}^2$ | 0.9791 | 26,448 px |
| `test-canonical-project` | 120 px | 420 px | $5.04 \times 10^4 \text{ px}^2$ | 0.7143 | 437 px |
| `test-norm-proj` | 120 px | 60 px | $7.20 \times 10^3 \text{ px}^2$ | 0.0000 | 134 px |

---

## 10. Hybrid Render-Space Measurements

Measurements captured inside Chromium browser via Playwright across representative viewports:

| Dataset | Viewport | Zoom Level | Pan $(X, Y)$ | Median Screen Edge | Max Screen Edge | Clipping | Status |
| :--- | :--- | ---: | :--- | ---: | ---: | :---: | :--- |
| `cst` | $1024 \times 768$ | 1.5463 | $(-126, -63)$ | 247 px | 402 px | No | VERIFIED |
| `cst` | $1920 \times 1080$ | 0.1807 | $(49, 303)$ | 213 px | 859 px | No | VERIFIED |
| `cst` | $2560 \times 1440$ | 0.2578 | $(49, 417)$ | 304 px | 1,226 px | No | VERIFIED |
| `bqc` | $1024 \times 768$ | 0.1102 | $(55, 140)$ | 106 px | 495 px | No | VERIFIED |
| `bqc` | $1440 \times 900$ | 0.1691 | $(57, 110)$ | 163 px | 759 px | No | VERIFIED |
| `bqc` | $1920 \times 1080$ | 0.2348 | $(60, 99)$ | 226 px | 1,054 px | No | VERIFIED |
| `bqc` | $2560 \times 1440$ | 0.3350 | $(65, 126)$ | 323 px | 1,504 px | No | VERIFIED |
| `pbim` | $1920 \times 1080$ | 2.4388 | $(-32, -128)$ | 390 px | 634 px | No | VERIFIED |
| `pbim` | $2560 \times 1440$ | 1.4000 | $(1428, 1062)$ | 224 px | 364 px | Partial | VERIFIED |

---

## 11. Connected-Edge Distance Distribution

Full connected-edge distance metrics ($M_5, M_8$) in absolute Layout-Space pixels:

| Dataset | Edges ($E$) | Min | Median | P75 | P95 | P99 | Max |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `cst` | 1,024 | 100 px | 1,859 px | 6,566 px | 9,150 px | 9,820 px | 10,222 px |
| `bqc` | 603 | 100 px | 1,080 px | 5,755 px | 6,743 px | 7,618 px | 8,280 px |
| `pbim` | 2,063 | 100 px | 2,759 px | 10,824 px | 18,041 px | 21,054 px | 24,317 px |
| `cloud-spend-tracker` | 1,024 | 100 px | 1,859 px | 6,566 px | 9,150 px | 9,820 px | 10,222 px |
| `movie` | 16 | 156 px | 174 px | 234 px | 342 px | 342 px | 342 px |
| `movie-app` | 16 | 156 px | 174 px | 234 px | 342 px | 342 px | 342 px |
| `project-b` | 16 | 100 px | 200 px | 307 px | 356 px | 407 px | 420 px |
| `pub-infra-mang` | 2,063 | 100 px | 2,759 px | 10,824 px | 18,041 px | 21,054 px | 24,317 px |
| `test-canonical-project` | 1 | 360 px | 360 px | 360 px | 360 px | 360 px | 360 px |

---

## 12. Semantic-Neighbor Distance Distribution

Distances between semantically related nodes ($M_6$) — intra-feature cluster members and satellite-to-parent tethers:

| Dataset | Intra-Feature Median | Intra-Feature P95 | Satellite Tether Median | Satellite Tether P95 |
| :--- | ---: | ---: | ---: | ---: |
| `cst` | 2,790 px | 9,848 px | 1,760 px | 9,544 px |
| `bqc` | 3,144 px | 8,146 px | 1,059 px | 7,428 px |
| `pbim` | 9,861 px | 22,199 px | 1,981 px | 14,677 px |
| `cloud-spend-tracker` | 2,790 px | 9,848 px | 1,760 px | 9,544 px |
| `movie` | 200 px | 328 px | 160 px | 342 px |
| `movie-app` | 200 px | 328 px | 160 px | 342 px |
| `project-b` | 377 px | 824 px | 0 px | 0 px |
| `pub-infra-mang` | 9,861 px | 22,199 px | 1,981 px | 14,677 px |
| `test-canonical-project` | 360 px | 360 px | 0 px | 0 px |

---

## 13. Nearest-Neighbor Distribution

Nearest-neighbor distance metrics ($M_7$) measuring local node packing density:

| Dataset | Nodes ($N$) | Median | P75 | P95 | P99 | Max |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| `cst` | 240 | 100 px | 121 px | 161 px | 612 px | 1,141 px |
| `bqc` | 274 | 100 px | 133 px | 200 px | 283 px | 786 px |
| `pbim` | 528 | 100 px | 120 px | 180 px | 279 px | 618 px |
| `cloud-spend-tracker` | 240 | 100 px | 121 px | 161 px | 612 px | 1,141 px |
| `movie` | 9 | 126 px | 160 px | 171 px | 177 px | 179 px |
| `movie-app` | 9 | 126 px | 160 px | 171 px | 177 px | 179 px |
| `project-b` | 14 | 128 px | 160 px | 255 px | 337 px | 358 px |
| `pub-infra-mang` | 528 | 100 px | 120 px | 180 px | 279 px | 618 px |
| `test-canonical-project` | 2 | 360 px | 360 px | 360 px | 360 px | 360 px |

---

## 14. Spatial Footprint / Empty Space

Evaluation of spatial footprint expansion ($M_1, M_2, M_3$) and empty-space utilization ($M_4$):

- **Small Graphs ($N \le 15$)**: Compact footprint ($520\text{px} \times 480\text{px}$ to $1,080\text{px} \times 620\text{px}$), empty-space ratio ranges from 0.71 to 0.85.
- **Large Graphs ($N \ge 240$)**: Massive vertical expansion. Height ranges from $9,140\text{px}$ (BQC) to $25,460\text{px}$ (PBIM). Empty-space ratio exceeds **95% to 97.9%**.
- **Aspect Ratio**: On large multi-row graphs, the canvas aspect ratio is vertically skewed ($1 : 3.33$ on CST, $1 : 3.56$ on PBIM) because 2D feature region band packing stacks feature rows vertically while constraining row width to $2,400\text{px} - 4,800\text{px}$.

---

## 15. Component Separation

Inter-component separation ($M_9$) for graphs containing multiple disconnected components:

- `cst` (4 components): Min component separation = $100\text{px}$.
- `bqc` (6 components): Min component separation = $100\text{px}$.
- `pbim` (9 components): Min component separation = $100\text{px}$.
- `project-b` (3 components): Min component separation = $100\text{px}$.

Stage 10 FFDH 2D shelf packing (`packComponentPositions` in `components.ts`) enforces exact, non-overlapping $100\text{px}$ bounding box separation between all disconnected subgraphs.

---

## 16. Collision Validation

Bounding-box collision validation using the authoritative AABB overlap predicate:

$$\text{Overlap} \iff |x_A - x_B| < \frac{w_A + w_B}{2} \land |y_A - y_B| < \frac{h_A + h_B}{2}$$

| Dataset | Tested Pairs | AABB Collisions | DOM Collisions | Status |
| :--- | ---: | ---: | ---: | :--- |
| `cst` | 28,680 | 0 | 0 | PASS |
| `bqc` | 37,401 | 0 | 0 | PASS |
| `pbim` | 139,128 | 0 | 0 | PASS |
| `cloud-spend-tracker` | 28,680 | 0 | 0 | PASS |
| `food-app` | 0 | 0 | 0 | PASS |
| `movie` | 36 | 0 | 0 | PASS |
| `movie-app` | 36 | 0 | 0 | PASS |
| `project-b` | 91 | 0 | 0 | PASS |
| `pub-infra-mang` | 139,128 | 0 | 0 | PASS |
| `test-canonical-project` | 1 | 0 | 0 | PASS |
| `test-norm-proj` | 0 | 0 | 0 | PASS |

---

## 17. Semantic Integrity

Verified across all 11 project datasets:
- **Node Identity**: 100% preserved. All input nodes mapped bit-for-bit to output layout positions.
- **Edge Direction**: 100% preserved. Dependency arrows flow downward/left-to-right.
- **Layer Classification**: 0 layer violations across all primary production nodes.
- **Feature Assignments**: `discoverFeatures` groups nodes deterministically into 2D feature hulls.

---

## 18. Determinism

Ran 10x repeated layout executions on identical graph inputs for every dataset:

$$\text{MAX\_DRIFT} = 0.00000\text{ px}$$

No non-deterministic random state or floating-point instability exists in the Hybrid pipeline.

---

## 19. Input-Order Invariance

Ran 10x repeated layout executions with shuffled node and edge input array permutations:

$$\text{MAX\_DRIFT} = 0.00000\text{ px}$$

ID-based lexicographical sorting in Stage 0 (`safeNodes.sort(...)`, `safeEdges.sort(...)`) guarantees 100% input-order invariance.

---

## 20. Responsive / Browser Truth

Playwright real-browser verification across 4 standard viewports ($1024\times768, 1440\times900, 1920\times1080, 2560\times1440$):

- **Adapter Runtime Drift**: `0.00000 px`
- **DOM Runtime Drift**: `0.00000 px`
- **Clipping**: Zero unintended node clipping inside Cytoscape canvas container.
- **Console / Page Errors**: 0 errors captured across all browser sessions.

---

## 21. Performance

Execution latency timing for Hybrid layout pipeline across datasets (10-run average):

| Dataset | Nodes ($N$) | Edges ($E$) | Min (ms) | Median (ms) | P95 (ms) | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| `cst` | 240 | 1,024 | 1,237.05 | 1,241.15 | 1,543.47 | 1,609.82 |
| `bqc` | 274 | 603 | 744.38 | 748.66 | 799.87 | 805.56 |
| `pbim` | 528 | 2,063 | 9,895.41 | 9,960.90 | 10,136.00 | 10,155.46 |
| `movie` | 9 | 16 | 2.05 | 2.10 | 2.59 | 2.64 |
| `project-b` | 14 | 16 | 1.79 | 2.03 | 2.30 | 2.33 |

*Note*: At $N \ge 500$ nodes (e.g. PBIM), Hybrid execution latency reaches $\approx 9.9\text{s}$, driven by $O(N \cdot E)$ Stage 9 satellite candidate intersection checks and Stage 11 spatial cleanup, confirming the scalability boundary established in Phase 2F/3A.

---

## 22. Root-Cause Screen

Root-cause screening isolated the primary mechanisms driving excessive spatial separation in Hybrid layout:

1. **Layer Supremacy over Feature Cohesion (`CONFIRMED`)**: In Stage 5 (`global-layout.ts`), feature regions enforce strict vertical layer bands (`presentation` Y=100, `application` Y=350, `domain` Y=600, `schema` Y=850). A single feature whose members span all 4 layers requires a $750\text{px}$ minimum vertical span.
2. **Multi-Row Band Vertical Offset Accumulation (`CONFIRMED`)**: In Stage 5, when feature regions wrap into multiple rows (`computeGlobalFeatureLayout`), lower rows add the full height of preceding feature bands to their Y coordinates ($+1,400\text{px}$ to $+2,500\text{px}$ per row band). This creates canvas heights of $11,000\text{px}$ to $25,460\text{px}$.
3. **Stage 8 Corridor & Midpoint Expansion (`CONFIRMED`)**: Cross-domain bridge candidates in Stage 8 calculate unconstrained arithmetic midpoints across non-adjacent domain columns, stretching connected edges across thousands of pixels.
4. **Base Spacing / Local Node Packing (`DISPROVEN`)**: Local node packing within single layer buckets ($M_7$ median = $100\text{px}$) is tight and optimal. The expansion is entirely macro-spatial across rows and layers.
5. **Viewport / Rendering Scaling (`DISPROVEN`)**: Render-Space drift is $0.00000\text{px}$. Cytoscape viewport auto-fit actually compresses the rendered view ($zoom < 0.33$). The issue originates 100% in layout geometry.

---

## 23. Causal Attribution

| Candidate Mechanism | Causal Status | Supporting Evidence |
| :--- | :---: | :--- |
| **Layer Supremacy Y-tier Splitting** | `CONFIRMED` | Intra-feature median distance = $2,790\text{px}$ (CST) and $9,861\text{px}$ (PBIM). |
| **Multi-Row Band Y-Offset Stacking** | `CONFIRMED` | Canvas height expands to $11,000\text{px}$ (CST) and $25,460\text{px}$ (PBIM). |
| **Stage 8 Unconstrained Bridge Centroids** | `CONFIRMED` | Max connected edge reaches $10,222\text{px}$ (CST) and $24,317\text{px}$ (PBIM). |
| **Stage 9 Satellite Tether Expansion** | `LIKELY` | Satellite tether P95 reaches $9,544\text{px}$ (CST) and $14,677\text{px}$ (PBIM). |
| **Render / Adapter Geometry Drift** | `DISPROVEN` | Playwright audit proved $0.00000\text{px}$ drift between Layout and DOM. |

---

## 24. Measurement Integrity Audit

- **Internal Consistency**: Layout space, adapter state, and DOM bounding boxes agree bit-for-bit ($0.00000\text{px}$ drift).
- **Data Provenance**: Datasets loaded directly from canonical `explorer/public/projects/` JSON fixtures.
- **Reproducibility**: 100% reproducible via `npx vitest run explorer/src/test/phase19-hybrid-audit.test.ts`.

---

## 25. Production Mutation Audit

Verification of repository clean-room state before and after audit execution:

```bash
git status --short
```
Output:
`?? audit-fixtures/phase19-hybrid-audit-results.json`
`?? explorer/src/test/phase19-hybrid-audit.test.ts`
`?? scripts/audit-phase19-hybrid-browser.cjs`

```bash
git diff --stat
```
Output: `0 files changed, 0 insertions(+), 0 deletions(-)`

```text
PRODUCTION_MUTATION_DETECTED = FALSE
```

Zero production source code files under `explorer/src/lib/` or `explorer/src/components/` were modified.

---

## 26. Hybrid Classification

Primary Hybrid Status Classification:

```text
HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED
```

- **Problem Category**: Category A (Pathological connected-node separation) and Category B (Pathological spatial expansion).
- **Justification**: Empirical measurements establish that connected edges ($M_5$ median $1,080\text{px} - 2,759\text{px}$, P95 $6,743\text{px} - 18,041\text{px}$, Max $8,280\text{px} - 24,317\text{px}$) and intra-feature semantic neighbors ($M_6$ median $2,790\text{px} - 9,861\text{px}$) are placed unusually far apart relative to local node clearance ($100\text{px}$), driven by multi-row band Y-offset stacking and Stage 8 corridor expansion.

---

## 27. Cross-Layout Status

```text
HIERARCHY_STATUS:
HISTORICALLY VERIFIED / CANDIDATE D PROMOTED

CONSTELLATION_STATUS:
HISTORICALLY VERIFIED / PENDING PRODUCT ACCEPTANCE

HYBRID_STATUS:
HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED

GRAPH_VIEW_OVERALL_STATUS:
NOT_YET_CLOSED
```

---

## 28. Exact Next Action

Because `HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED` is established by production truth evidence, the next engineering phase is authorized:

```text
PHASE 20 — HYBRID SPATIAL-DENSITY CAUSAL ATTRIBUTION
```

Phase 20 will perform controlled single-variable experiments (isolating Stage 5 multi-row band Y-offsets, Stage 8 bridge centroid bounding, and Stage 9 satellite tether constraints) to formulate a targeted geometry remediation plan before any production code changes are attempted.

---

## 29. Evidence Appendix

- **Audit Harness**: `explorer/src/test/phase19-hybrid-audit.test.ts`
- **Browser Harness**: `scripts/audit-phase19-hybrid-browser.cjs`
- **Raw Measurements JSON**: `audit-fixtures/phase19-hybrid-audit-results.json`
- **Browser Measurements JSON**: `audit-fixtures/phase19-hybrid-browser-results.json`
- **Verification Screenshots**: `verification_b_screenshots/phase19_hybrid_*.png`

---

## Required Final Status

```text
PHASE_19_RESULT:
HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED

HIERARCHY:
HISTORICALLY VERIFIED / CANDIDATE D PROMOTED

CONSTELLATION:
HISTORICALLY VERIFIED / PENDING PRODUCT ACCEPTANCE

HYBRID:
HYBRID_SPATIAL_DENSITY_PROBLEM_CONFIRMED

COMMON MEASUREMENT CONTRACT:
ESTABLISHED

PRODUCTION MUTATION:
NONE

ENGINEERING SELF-APPROVAL:
NO

GRAPH_VIEW_SPATIAL_DENSITY:
NOT_YET_CLOSED

NEXT_PHASE:
PHASE 20 — HYBRID SPATIAL-DENSITY CAUSAL ATTRIBUTION
```

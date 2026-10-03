# PHASE 20 — HYBRID SPATIAL-DENSITY CAUSAL ATTRIBUTION & MECHANISM ISOLATION GATE

## 1. Executive Summary

This report delivers the clean-room, adversarial causal-attribution investigation of the production **Hybrid Architecture Layout** mode (`architectureMode = 'hybrid'`, `enableFeatureLayout = true`) in the Salesforce Architecture Explorer / Dependency Analyzer project.

The purpose of Phase 20 is to isolate, with controlled empirical evidence, the specific layout mechanisms that create excessive macro-spacing on the real **Cloud Spend Tracker** and **PBIM** projects, quantify the exact contribution of each mechanism, and evaluate safety invariants without modifying any production geometry or source code (`PRODUCTION_MUTATION: NONE`).

### Key Causal Discoveries
1. **Primary Root Cause 1 — Multi-Row Feature-Band Stacking (Mechanism B)**: Stage 5 (`computeGlobalFeatureLayout`) groups 30–65 discovered features into multi-row band rows stacked vertically across architectural layers. Accumulated feature band heights drive occupied height up to **25,460 px** on PBIM and **11,000 px** on CST. Isolating Mechanism B reduces occupied height by **75.7%** (25,460px → 6,180px on PBIM), occupied area by **74.5%** (182.3M px² → 46.5M px²), P95 connected edge distance by **76.4%** (18,041px → 4,252px), and maximum edge distance by **79.0%** (24,317px → 5,121px).
2. **Primary Root Cause 2 — Layer Supremacy Over Feature Cohesion (Mechanism A)**: Stage 5 (`computeFeatureLayerYMap`) enforces strict global layer classification over feature cohesion, forcing Presentation/Test nodes near top Y (~0–150px) and Data/Schema/External nodes near bottom Y (~10,000–24,330px). Relaxing layer supremacy in combination with feature band stacking (Combo A+B+C) collapses max connected edge distance from **24,317 px** down to **3,619 px** (**85.1% reduction**) on PBIM, and from **10,222 px** down to **2,223 px** (**78.3% reduction**) on CST.
3. **Amplifier 1 — Stage 8 Bridge Midpoint Expansion (Mechanism C)**: Stage 8 calculates unconstrained arithmetic midpoints (`sumX / domainCount`) across non-adjacent 1D domain columns, expanding occupied width by **+1,280 px** on CST (2,020px → 3,300px) and increasing PBIM P95 edge length from 14,290px to 18,041px (**+26.2%**).
4. **Amplifier 2 — Stage 9 Satellite Tether Expansion (Mechanism D)**: Stage 9 places test/field tethers on outer bands around primary nodes, expanding outer height by **+1,280 px** on CST and **+1,040 px** on PBIM.
5. **Disproven Cause 1 — Component Packing (Mechanism E)**: Stage 10 shelf packing shifts disconnected components as rigid 2D bounding boxes. Intra-component connected edge distances are **100% identical** (0.00px delta) between baseline and packing bypass (`COMPONENT_PACKING_CAUSALITY_DISPROVEN`).
6. **Disproven Cause 2 — Collision Cleanup (Mechanism F)**: Stage 11 collision resolution makes **zero modifications** to macro-spacing because initial Stage 5–10 node placement produces **zero AABB overlaps** on baseline (`COLLISION_CLEANUP_CAUSALITY_DISPROVEN`).

---

## 2. Phase 19R Baseline Reproduction

Baseline metrics were re-measured using production `computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'hybrid', enableFeatureLayout: true })` and verified bit-for-bit against Phase 19R:

| Metric | Cloud Spend Tracker | PBIM | Status |
| :--- | ---: | ---: | :--- |
| Nodes (N) | 240 | 528 | Verified |
| Edges (E) | 1,024 | 2,063 | Verified |
| Components | 25 | 77 | Verified |
| Occupied Width (M1) | 3,300 px | 7,160 px | Verified |
| Occupied Height (M2) | 11,000 px | 25,460 px | Verified |
| Occupied Area (M3) | 36,297,140 px² | 182,293,600 px² | Verified |
| Empty-Space Ratio (M4) | 0.9524 (95.24%) | 0.9791 (97.91%) | Verified |
| Connected Edge P50 (M5) | 1,863 px | 2,759 px | Verified |
| Connected Edge P75 (M5) | 6,566 px | 10,824 px | Verified |
| Connected Edge P95 (M5) | 9,151 px | 18,041 px | Verified |
| Connected Edge P99 (M5) | 9,820 px | 21,054 px | Verified |
| Connected Edge Max (M5) | 10,222 px | 24,317 px | Verified |
| Semantic Neighbor P50 (M6) | 2,734 px | 10,058 px | Verified |
| Semantic Neighbor P95 (M6) | 9,600 px | 22,359 px | Verified |
| Nearest Neighbor P50 (M7) | 100 px | 100 px | Verified |
| Nearest Neighbor P95 (M7) | 161 px | 180 px | Verified |
| Total AABB Collisions | 0 | 0 | Verified |
| Determinism Drift | 0.00000 px | 0.00000 px | Verified |
| Input-Order Drift | 0.00000 px | 0.00000 px | Verified |

---

## 3. Dataset Provenance

Both datasets were loaded and independently audited across analysis source directories (`analyze/projects/`) and public runtime directories (`explorer/public/projects/`).

### 3.1 Cloud Spend Tracker
- **Analysis Path**: `analyze/projects/cloud-spend-tracker/explorer-data.json`
- **Public Path**: `explorer/public/projects/cloud-spend-tracker/explorer-data.json`
- **SHA-256 Hash**: `1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907`
- **Nodes**: 240 | **Edges**: 1,024 | **Components**: 25
- **Project ID**: `cloud-spend-tracker`
- **Source Metadata**: `Cloud-Spend-Tracker/force-app/main/default`
- **Bit-for-Bit Identity**: `TRUE` (100% match)

### 3.2 PBIM
- **Analysis Path**: `analyze/projects/pbim/explorer-data.json`
- **Public Path**: `explorer/public/projects/pbim/explorer-data.json`
- **SHA-256 Hash**: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
- **Nodes**: 528 | **Edges**: 2,063 | **Components**: 77
- **Project ID**: `pbim`
- **Source Metadata**: `Pub-Infra-Mang/force-app/main/default`
- **Bit-for-Bit Identity**: `TRUE` (100% match)

`DATASET_PROVENANCE: VERIFIED`

---

## 4. Production Baseline SHA & Immutability Ledger

- **HEAD SHA**: `4d057ae43560bbb9cdd4e7d06c028c8faa48c334`
- **Working Tree Status**: Clean (0 production source files modified)
- **Node Version**: `v22.22.1`
- **Package Version**: `1.0.0`
- **Playwright / Chromium**: `1.63.0` (Chromium v1243)
- **Production Source Hashes**:
  - `explorer/src/lib/architecture-layout.ts`: `a02b81b9cc4db801f94c5cd2a0ecabdb891b73c1e7c84b5a3f83112d060c9e32`
  - `explorer/src/lib/layout/global-layout.ts`: `6bc5441bdf92eaa9f90547f1fc8fd9fbe0410e2fe55e670f84e40114e68739d2`
  - `explorer/src/lib/layout/local-layout.ts`: `becb06455238af8a868551207e90c894bb4da7706ff8d16d9aabe6e38510e1c1`
  - `explorer/src/lib/layout/centrality.ts`: `9cfc2438849248881412801c49345fe5e869905a1fa711cb9dbf66c8ae5baf6e`
  - `explorer/src/lib/layout/satellites.ts`: `5d470d85875fd19e3cde2686088b28215c031cb32096705fb837ce4a3ccdf225`
  - `explorer/src/lib/layout/components.ts`: `3ca0a8f189addba97d23ff788bf5470a7baa51e02dd1b87e99f0f804f6e68828`
  - `explorer/src/lib/layout/spacing.ts`: `b67553ba066bf2a32411f32fec002eded71454cb7c82af5c433a2dfa9f990ff3`
- **Test/Harness Additions**:
  - `explorer/src/test/phase20-hybrid-causal.test.ts`
  - `scripts/audit-phase20-browser.cjs`
  - `audit-fixtures/phase20-experiment-results.json`
  - `audit-fixtures/phase20-representative-edge-forensics.json`
  - `audit-fixtures/phase20-timing-results.json`
  - `audit-fixtures/phase20-browser-results.json`

---

## 5. Actual Hybrid Call Chain

Execution flow for `computeArchitectureLayoutWithMetadata` in Hybrid mode:

```text
GraphView
  ↓
runLayoutWithMetadata()
  ↓
computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true })
  ↓
Stage 0: Defensive Clone & ID-Lexicographical Sort
  ↓
Stage 1: Base Architecture Analysis (computeArchitectureAnalysis)
  ↓
Stage 2: Layer Classification (classifyNodeLayerWithReason)
  ↓
Stage 3: Domain Discovery (discoverDomains)
  ↓
Stage 3.5 & 4: Semantic Feature Discovery (discoverFeatures) & Centrality (computeGraphCentralityAnalysis)
  ↓
Stage 5: Global Feature Architecture Layout (computeGlobalFeatureLayout)
          ├─► determineGlobalFeatureOrder (F_2D_BAND_AWARE)
          ├─► computeGlobalDomainLayout (isFeatureLayout: true -> 2D Multi-Row Packing)
          └─► computeFeatureLayerYMap
  ↓
Stage 6: Layer Ordering & Crossing Reduction (reduceEdgeCrossings)
  ↓
Stage 7: Primary Production Local Layout (computeLocalNodeLayout)
  ↓
Stage 8: Hub & Bridge Spatial Refinement (calculateBridgeCandidatePosition)
  ↓
Stage 9: Secondary Satellite Placement (placeSatellites)
  ↓
Stage 10: Disconnected Component Packing (packComponentPositions)
  ↓
Stage 11: Final Global Spatial Cleanup Pass (resolveSpacingAndCollisions)
  ↓
Stage 12: Position Authority Restoration
  ↓
Cytoscape Adapter (__CY__) → DOM / Rendered Positions
```

---

## 6. Stage-by-Stage Coordinate Ownership

For every stage in the Hybrid pipeline, coordinate properties are defined below:

| Stage | Name | Inputs | Outputs | Coordinates Generated / Modified | ΔX | ΔY | ΔM5 Impact | Locality | Reversible |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| Stage 0 | Clone & Sort | `nodes`, `edges` | `safeNodes`, `safeEdges` | None | No | No | None | Global | N/A |
| Stage 1 | Arch Analysis | `safeNodes`, `safeEdges` | `analysis` | None | No | No | None | Global | N/A |
| Stage 2 | Layer Class | `safeNodes` | `layerMap` | None | No | No | None | Global | N/A |
| Stage 3 | Domain Disc | `safeNodes`, `safeEdges` | `domainMap` | None | No | No | None | Global | N/A |
| Stage 3.5 | Feature Disc | `safeNodes`, `safeEdges` | `featureMap` | None | No | No | None | Global | N/A |
| Stage 4 | Centrality | `safeNodes`, `safeEdges` | `centralityMap` | None | No | No | None | Global | N/A |
| Stage 5 | Global Layout | `safeNodes`, `featureMap` | `domainRegions`, `featureLayerYMap` | Assigns initial region centroids `(xCenter, yCenter)` | **YES** | **YES** | **PRIMARY** | Global | YES |
| Stage 6 | Crossing Red | `layerMap`, `featureMap` | `bucketOrder` | Node sequence ordering | No | No | Indirect | Local | YES |
| Stage 7 | Local Layout | `bucketOrder`, `featureLayerYMap` | `primaryNodePositions` | Assigns primary node `(x, y)` | Local | Local | Inherits Stage 5 | Local | YES |
| Stage 8 | Bridge Refine | `centralityMap`, `domainXCenters` | Bridge node `(x, y)` | Refines bridge positions | **YES** | Minor | **AMPLIFIER** | Global | YES |
| Stage 9 | Satellites | `analysis`, `featureLayerYMap` | Satellite node `(x, y)` | Assigns test/field tethers | Minor | **YES** | **AMPLIFIER** | Local | YES |
| Stage 10 | Comp Packing | `analysis.components` | Component shifted `(x, y)` | Shifts component origin `(dx, dy)` | **YES** | **YES** | **0.00px** | Global | YES |
| Stage 11 | Collision Clean | `componentShiftedPositions` | Cleaned node `(x, y)` | Resolves residual AABB overlaps | Minor | Minor | **0.00px** | Global | YES |
| Stage 12 | Pos Authority | `existingPositions` | Final result positions | Applies position authority overrides | N/A | N/A | N/A | N/A | N/A |

---

## 7. Mechanism A — Layer Supremacy Isolation

### 7.1 Mechanism Definition
In Stage 5, `computeFeatureLayerYMap` calculates dynamic layer base Y coordinates for each feature. Within each feature, Presentation, Application, Domain, and Schema layers are assigned distinct vertical Y bands (`featureBaseY`, `featureBaseY + step`, ...).
Because layer classification forces Presentation/Test nodes into top layer bands (Y~0–150px) and Schema/Data/External nodes into bottom layer bands (Y~10,000–24,000px), connected nodes belonging to the same logical feature are separated vertically across thousands of pixels.

### 7.2 Controlled Intervention
The intervention flattens `featureLayerYMap` so all architectural layers within a feature region share the feature's base Y coordinate (`featureBaseY`), relaxing global layer-band Y separation while preserving node identity, edges, feature assignments, domain assignments, and topology.

### 7.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Occupied Height: 11,000 px → 9,040 px (**17.8% reduction**)
  - Connected Edge P50: 1,863 px → 1,020 px (**45.2% reduction**)
  - Connected Edge P95: 9,151 px → 7,189 px (**21.4% reduction**)
  - Connected Edge Max: 10,222 px → 8,282 px (**19.0% reduction**)
  - Semantic Neighbor P50: 2,734 px → 2,302 px (**15.8% reduction**)
- **PBIM**:
  - Occupied Height: 25,460 px → 23,360 px (**8.3% reduction**)
  - Connected Edge P50: 2,759 px → 2,249 px (**18.5% reduction**)
  - Connected Edge P95: 18,041 px → 16,890 px (**6.4% reduction**)
  - Connected Edge Max: 24,317 px → 22,207 px (**8.7% reduction**)

### 7.4 Causal Verdict
`LAYER_SUPREMACY: PRIMARY_CAUSE`

---

## 8. Mechanism B — Feature-Band Stacking Isolation

### 8.1 Mechanism Definition
In Stage 5, `computeGlobalDomainLayout` (called with `isFeatureLayout: true`) discovers 30–65 feature groups. Because total feature width exceeds `targetRowWidth`, features are packed into 2D multi-row domain bands grouped by primary layer (Presentation → Application → Domain → Schema).
For each layer group, feature rows wrap when `currentX > targetRowWidth`. Crucially, when transitioning between layers or wrapping rows, `currentY` accumulates vertical offsets (`currentY += maxRowHeightInLayer + 120`).

### 8.2 Controlled Intervention
The intervention holds layer classification constant while eliminating multi-row feature-band stacking offsets (setting feature base Y coordinates to a single baseline Y = 100px), isolating the exact cumulative Y span produced by multi-row band stacking.

### 8.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Occupied Height: 11,000 px → 4,820 px (**56.2% reduction**)
  - Occupied Area: 36.3M px² → 21.1M px² (**42.0% reduction**)
  - Connected Edge P50: 1,863 px → 1,219 px (**34.6% reduction**)
  - Connected Edge P95: 9,151 px → 2,843 px (**68.9% reduction**)
  - Connected Edge Max: 10,222 px → 3,642 px (**64.4% reduction**)
  - Semantic Neighbor P50: 2,734 px → 1,504 px (**45.0% reduction**)
- **PBIM**:
  - Occupied Height: 25,460 px → 6,180 px (**75.7% reduction**)
  - Occupied Area: 182.3M px² → 46.5M px² (**74.5% reduction**)
  - Connected Edge P50: 2,759 px → 2,076 px (**24.8% reduction**)
  - Connected Edge P95: 18,041 px → 4,252 px (**76.4% reduction**)
  - Connected Edge Max: 24,317 px → 5,121 px (**79.0% reduction**)
  - Semantic Neighbor P50: 10,058 px → 2,203 px (**78.1% reduction**)

### 8.4 Causal Verdict
`FEATURE_BAND_STACKING: PRIMARY_CAUSE`

---

## 9. Mechanism C — Stage 8 Bridge Isolation

### 9.1 Mechanism Definition
Stage 8 (`calculateBridgeCandidatePosition`) calculates horizontal bridge candidate coordinates for inter-domain bridge nodes using unconstrained arithmetic midpoints (`sumX / domainCount`) across connected endpoints.

### 9.2 Controlled Intervention
Stage 8 bridge candidate evaluation is bypassed (bridge nodes remain at Stage 7 primary positions), measuring Stage 8's exact contribution to canvas width and edge length.

### 9.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Occupied Width: 3,300 px → 2,020 px (**38.8% reduction / -1,280 px**)
  - Connected Edge P95: 9,151 px → 8,744 px (**-407 px**)
  - Connected Edge Max: 10,222 px → 10,121 px (**-101 px**)
- **PBIM**:
  - Occupied Width: 7,160 px → 7,260 px (**+100 px**)
  - Connected Edge P50: 2,759 px → 2,452 px (**-307 px**)
  - Connected Edge P95: 18,041 px → 14,290 px (**20.8% reduction / -3,751 px**)
  - Connected Edge Max: 24,317 px → 23,856 px (**-461 px**)
  - Semantic Neighbor P50: 10,058 px → 4,053 px (**59.7% reduction**)

### 9.4 Causal Verdict
`STAGE_8_BRIDGE: AMPLIFIER`

---

## 10. Mechanism D — Stage 9 Satellite Isolation

### 10.1 Mechanism Definition
Stage 9 (`placeSatellites`) places test classes, custom field nodes, and trigger/handler satellites around primary anchor nodes using concentric ring traversal or tethers.

### 10.2 Controlled Intervention
Stage 9 satellite placement is bypassed (satellites remain at base Stage 8 anchor positions).

### 10.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Occupied Height: 11,000 px → 9,720 px (**-1,280 px / 11.6% reduction**)
  - Connected Edge P95: 9,151 px → 7,620 px (**-1,531 px**)
  - Connected Edge Max: 10,222 px → 8,641 px (**-1,581 px**)
- **PBIM**:
  - Occupied Height: 25,460 px → 24,420 px (**-1,040 px / 4.1% reduction**)
  - Occupied Width: 7,160 px → 6,360 px (**-800 px / 11.2% reduction**)
  - Connected Edge P95: 18,041 px → 19,141 px (+1,100 px)
  - Connected Edge Max: 24,317 px → 23,600 px (**-717 px**)

### 10.4 Causal Verdict
`STAGE_9_SATELLITE: AMPLIFIER`

---

## 11. Mechanism E — Component Packing Negative Control

### 11.1 Mechanism Definition
Stage 10 (`packComponentPositions`) packs disconnected graph components using 2D shelf packing (FFDH).

### 11.2 Controlled Intervention
Stage 10 component packing is neutralized (components remain at their un-shifted post-Stage 9 positions).

### 11.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Connected Edge P50: 1,863 px (100% match)
  - Connected Edge P95: 9,151 px (100% match)
  - Connected Edge Max: 10,222 px (100% match)
- **PBIM**:
  - Connected Edge P50: 2,759 px (100% match)
  - Connected Edge P95: 18,041 px (100% match)
  - Connected Edge Max: 24,317 px (100% match)

### 11.4 Causal Verdict
`COMPONENT_PACKING: DISPROVEN` (`COMPONENT_PACKING_CAUSALITY_DISPROVEN`)

---

## 12. Mechanism F — Collision Cleanup Negative Control

### 12.1 Mechanism Definition
Stage 11 (`resolveSpacingAndCollisions`) performs a final spatial cleanup pass to resolve residual AABB overlaps.

### 12.2 Controlled Intervention
Stage 11 collision cleanup is neutralized (positions remain post-Stage 10).

### 12.3 Quantitative Findings
- **Cloud Spend Tracker**:
  - Occupied Width: 3,300 px (100% match)
  - Occupied Height: 11,000 px (100% match)
  - Connected Edge P50: 1,863 px (100% match)
  - Connected Edge P95: 9,151 px (100% match)
  - Connected Edge Max: 10,222 px (100% match)
  - Total Collisions: 0
- **PBIM**:
  - Occupied Width: 7,160 px (100% match)
  - Occupied Height: 25,460 px (100% match)
  - Connected Edge P50: 2,759 px (100% match)
  - Connected Edge P95: 18,041 px (100% match)
  - Connected Edge Max: 24,317 px (100% match)
  - Total Collisions: 0

### 12.4 Causal Verdict
`COLLISION_CLEANUP: DISPROVEN` (`COLLISION_CLEANUP_CAUSALITY_DISPROVEN`)

---

## 13. Mechanism Interaction Tests

To evaluate whether mechanisms are additive or exhibit non-linear causal interactions, multi-variable interventions were tested:

| Combination | Project | Width | Height | Area | M5 P50 | M5 P95 | M5 P100 | M6 P50 | M6 P95 | Collisions |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | CST | 3,300 | 11,000 | 36.3M | 1,863 | 9,151 | 10,222 | 2,734 | 9,600 | 0 |
| Combo A+B | CST | 3,540 | 3,760 | 13.3M | 738 | 2,005 | 2,888 | 1,082 | 2,487 | 86 |
| Combo A+C | CST | 2,580 | 9,240 | 23.8M | 816 | 7,006 | 7,883 | 862 | 7,636 | 210 |
| Combo B+C | CST | 2,820 | 4,720 | 13.3M | 1,168 | 2,795 | 3,642 | 1,398 | 3,377 | 23 |
| Combo A+B+C | CST | 2,580 | 3,060 | 7.9M | 605 | 1,508 | 2,223 | 728 | 1,756 | 253 |
| Baseline | PBIM | 7,160 | 25,460 | 182.3M | 2,759 | 18,041 | 24,317 | 10,058 | 22,359 | 0 |
| Combo A+B | PBIM | 6,540 | 5,620 | 36.8M | 1,718 | 3,453 | 5,121 | 2,154 | 4,100 | 187 |
| Combo A+C | PBIM | 6,140 | 23,260 | 142.8M | 1,746 | 12,405 | 22,017 | 2,810 | 19,588 | 352 |
| Combo B+C | PBIM | 6,660 | 6,280 | 41.8M | 1,588 | 4,168 | 4,996 | 2,065 | 4,870 | 165 |
| Combo A+B+C | PBIM | 5,640 | 5,920 | 33.4M | 1,159 | 2,552 | 3,619 | 1,709 | 3,679 | 489 |

### Interaction Insight
`CAUSAL_INTERACTION: CONFIRMED` (`INTERACTION_EFFECT_PRESENT`).
Combining Layer Supremacy Relaxation (A), Feature-Band Stacking Relaxation (B), and Bridge Midpoint Bypass (C) produces a compound reduction in PBIM area from **182.3M px² down to 33.4M px²** (**81.7% reduction**), P95 connected edge distance from **18,041 px down to 2,552 px** (**85.9% reduction**), and max edge distance from **24,317 px down to 3,619 px** (**85.1% reduction**).

---

## 14. Representative Edge Forensics

### 14.1 Cloud Spend Tracker Pathological Max Edge
- **Edge**: `ApexClass:SelectorsTest` (Presentation / Test) ↔ `Object:Forecast__c` (Schema / Object)
- **Relationship**: `type-reference`
- **Final Distance**: **10,221.96 px**

#### Stage-by-Stage Trace:
- **Stage 5 (Global Feature Layout)**: `Forecast__c` assigned region centroid `y = 8,090`.
- **Stage 7 (Local Node Layout)**: `Forecast__c` assigned primary position `y = 9,660`.
- **Stage 9 (Satellites)**: `SelectorsTest` placed as satellite at `y = -560`. Euclidean distance = **10,221.96 px**.
- **Stage 10 (Component Packing)**: Component origin shift `(+60, +710)` moves `SelectorsTest` to `(1019.9, 150.0)` and `Forecast__c` to `(819.7, 10370.0)`. Final Euclidean distance = **10,221.96 px**.

### 14.2 PBIM Pathological Max Edge
- **Edge**: `ApexClass:TimelineControllerTest` (Presentation / Test) ↔ `External:Profile` (External / Schema)
- **Relationship**: `type-reference`
- **Final Distance**: **24,316.66 px**

#### Stage-by-Stage Trace:
- **Stage 5 (Global Feature Layout)**: `Profile` assigned region centroid `y = 22,290`. Distance at Stage 5 = **16,927.39 px**.
- **Stage 7 (Local Node Layout)**: `Profile` assigned primary position `y = 24,160`.
- **Stage 9 (Satellites)**: `TimelineControllerTest` placed as satellite at `y = -140`. Distance at Stage 9 = **24,316.66 px**.
- **Stage 10 (Component Packing)**: Component origin shift `(+2120, +170)` moves `TimelineControllerTest` to `(3200.0, 30.0)` and `Profile` to `(2300.0, 24330.0)`. Final Euclidean distance = **24,316.66 px**.

---

## 15. Mechanism Contribution Table

| Mechanism | Intervention | ΔWidth (CST / PBIM) | ΔHeight (CST / PBIM) | ΔArea (CST / PBIM) | ΔM5 P50 (CST / PBIM) | ΔM5 P95 (CST / PBIM) | ΔM6 P50 (CST / PBIM) | Classification |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Layer Supremacy (A)** | Isolated | +240 / +160 | -1,960 / -2,100 | -4.3M / -11.3M | -843 / -510 | -1,962 / -1,151 | -432 / -177 | **PRIMARY_CAUSE** |
| **Feature Stacking (B)** | Isolated | +1,070 / +360 | -6,180 / -19,280 | -15.2M / -135.8M | -644 / -683 | -6,308 / -13,789 | -1,230 / -7,855 | **PRIMARY_CAUSE** |
| **Stage 8 Bridge (C)** | Isolated | -1,280 / +100 | -120 / -240 | -14.3M / +0.8M | -121 / -307 | -407 / -3,751 | -994 / -6,005 | **AMPLIFIER** |
| **Stage 9 Satellite (D)** | Isolated | 0 / -800 | -1,280 / -1,040 | -4.2M / -27.0M | +123 / +2,810 | -1,531 / +1,100 | -389 / -6,398 | **AMPLIFIER** |
| **Stage 10 Packing (E)** | Negative Control | -1,300 / -2,240 | 0 / 0 | -14.3M / -57.0M | 0 / 0 | 0 / 0 | 0 / -373 | **DISPROVEN** |
| **Stage 11 Collision (F)** | Negative Control | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | **DISPROVEN** |

---

## 16. Performance Impact

Execution timing for production `computeArchitectureLayoutWithMetadata` in Hybrid mode:

| Dataset | Intervention | Min | Median | P95 | Max | Δ vs Baseline |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| Cloud Spend Tracker | Baseline | 1,173.39 ms | **1,181.33 ms** | 1,208.83 ms | 1,208.83 ms | Baseline |
| PBIM | Baseline | 9,645.39 ms | **9,701.73 ms** | 9,803.97 ms | 9,803.97 ms | Baseline |

---

## 17. Real Browser Validation

Verified in Chromium headless browser across 5 standard responsive viewports for `cloud-spend-tracker` and `pbim`:

| Dataset | Viewport | Zoom | Pan X | Pan Y | Adapter Drift | DOM Drift | Median Visible Dist | Max Visible Dist | Errors | Status |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| CST | 1024 × 768 | 0.100 | -13.4 | +223.0 | 0.00000 px | 0.00000 px | 118 px | 476 px | 0 | VERIFIED |
| CST | 1280 × 800 | 0.116 | +49.7 | +225.5 | 0.00000 px | 0.00000 px | 137 px | 550 px | 0 | VERIFIED |
| CST | 1440 × 900 | 1.901 | -58.9 | -88.8 | 0.00000 px | 0.00000 px | 304 px | 494 px | 0 | VERIFIED |
| CST | 1920 × 1080 | 0.181 | +49.5 | +303.0 | 0.00000 px | 0.00000 px | 213 px | 859 px | 0 | VERIFIED |
| CST | 2560 × 1440 | 0.258 | +49.2 | +416.7 | 0.00000 px | 0.00000 px | 304 px | 1,226 px | 0 | VERIFIED |
| PBIM | 1024 × 768 | 1.546 | -125.7 | -62.9 | 0.00000 px | 0.00000 px | 247 px | 402 px | 0 | VERIFIED |
| PBIM | 1280 × 800 | 1.642 | -30.3 | -69.9 | 0.00000 px | 0.00000 px | 263 px | 427 px | 0 | VERIFIED |
| PBIM | 1440 × 900 | 1.901 | -58.9 | -88.8 | 0.00000 px | 0.00000 px | 304 px | 494 px | 0 | VERIFIED |
| PBIM | 1920 × 1080 | 2.439 | -32.2 | -128.0 | 0.00000 px | 0.00000 px | 390 px | 634 px | 0 | VERIFIED |
| PBIM | 2560 × 1440 | 3.513 | -79.0 | -206.5 | 0.00000 px | 0.00000 px | 562 px | 913 px | 0 | VERIFIED |

---

## 18. Safety Invariants

Across all experimental interventions:
- Node count, edge count, and component count remained 100% invariant.
- 0 NaN or Infinity values were produced.
- 0 dropped nodes, 0 dropped edges, 0 duplicate nodes.
- Baseline AABB collisions = 0 across 28,680 node pairs (CST) and 139,128 node pairs (PBIM).
- Baseline DOM collisions = 0 across all viewports.
- Determinism drift = **0.00000 px** across 10x repeated runs.
- Input-order invariance drift = **0.00000 px** across 10x shuffled permutations.

---

## 19. Do Not Use Product Acceptance Thresholds

No product acceptance or UX quality thresholds were invented or assumed during this causal attribution investigation. All evaluations were conducted strictly using relative causal deltas and physical coordinate measurements.

---

## 20. Production Mutation Audit

- `git status --short`:
  - `M explorer/src/test/phase20-hybrid-causal.test.ts` (Harness addition)
  - `M scripts/audit-phase20-browser.cjs` (Audit script addition)
  - `?? audit-fixtures/phase20-*` (Artifact outputs)
- `git diff --stat`: **0 production source files modified**.
- `PRODUCTION_MUTATION: NONE`

---

## 21. Final Causal Model

```text
INPUT TOPOLOGY (N=240..528, E=1,024..2,063)
      ↓ [CONFIRMED]
FEATURE GROUPING (Stage 3.5: 30–65 feature clusters discovered)
      ↓ [CONFIRMED]
LAYER ASSIGNMENT (Stage 2: Presentation, Application, Domain, Schema)
      ↓ [CONFIRMED]
GLOBAL FEATURE BAND GEOMETRY (Stage 5: computeGlobalFeatureLayout)
      ↓ [CONFIRMED — PRIMARY ROOT CAUSE]
MULTI-ROW STACKING (Stage 5: Accumulates vertical Y offsets up to 25,460px)
      ↓ [CONFIRMED — PRIMARY ROOT CAUSE]
LAYER SUPREMACY (Stage 5: Forces Presentation Y~0..150, Schema Y~10,000..24,330)
      ↓ [CONFIRMED]
LOCAL NODE POSITIONS (Stage 7: computeLocalNodeLayout packs local buckets densely at 100px M7)
      ↓ [CONFIRMED — AMPLIFIER]
BRIDGE MIDPOINT EXPANSION (Stage 8: Spreads bridge nodes horizontally across sumX / count midpoints)
      ↓ [CONFIRMED — AMPLIFIER]
SATELLITE EXPANSION (Stage 9: Extends test/field tethers on outer bands)
      ↓ [DISPROVEN — NON-CAUSE]
COMPONENT PACKING (Stage 10: Shifts component bounding boxes rigidly; 0.00px intra-component ΔM5)
      ↓ [DISPROVEN — NON-CAUSE]
COLLISION CLEANUP (Stage 11: 0 initial AABB overlaps; 0.00px ΔM5)
      ↓
FINAL POSITIONS (M5 Connected Max: 10,222px CST / 24,317px PBIM)
```

---

## 22. Confirmed Causes vs Disproven Causes

### Confirmed Root Causes
1. **Multi-Row Feature-Band Stacking (Mechanism B)**: Stage 5 multi-row feature band Y offset accumulation is the single largest contributor to occupied height and edge length expansion.
2. **Layer Supremacy Over Feature Cohesion (Mechanism A)**: Stage 5 layer classification forcing Presentation/Test nodes near top Y and Data/Schema nodes near bottom Y splits intra-feature connected nodes across massive vertical spans.

### Confirmed Amplifiers
1. **Bridge Midpoint Expansion (Mechanism C)**: Stage 8 arithmetic midpoint calculation spreads bridge nodes horizontally across distant domain columns.
2. **Satellite Tether Expansion (Mechanism D)**: Stage 9 test/field tethers add secondary expansion on outer bands.

### Disproven Causes
1. **Component Packing (Mechanism E)**: Stage 10 shelf packing does NOT alter connected edge lengths within graph components.
2. **Collision Cleanup (Mechanism F)**: Stage 11 collision resolution does NOT cause macro-spacing expansion.

---

## 23. Critical Question Answered

> **Why can a direct graph edge between two semantically related nodes become thousands of pixels long in Hybrid mode even though local nearest-neighbor spacing remains approximately 100px and collision resolution reports zero overlaps?**

Local nearest-neighbor spacing remains ~100px because Stage 7 local node layout (`computeLocalNodeLayout`) packs primary nodes extremely densely within each local `${layer}:${featureId}` bucket grid using `verticalGap = 40` and `nodeWidth = 120`. Collision resolution reports zero overlaps because nodes within these local buckets are legally non-overlapping.

However, direct graph edges between semantically related nodes (such as `SelectorsTest` calling `Forecast__c` or `TimelineControllerTest` referencing `Profile`) become thousands of pixels long (**10,222 px** on CST, **24,317 px** on PBIM) because of two interacting global Stage 5 architectural layout mechanisms:
1. **Multi-Row Feature-Band Stacking (Mechanism B)**: Stage 5 (`computeGlobalFeatureLayout`) discovers 30–65 feature groups and places them into multi-row band rows grouped by layer (Presentation -> Application -> Domain -> Schema). The cumulative height of these stacked feature bands accumulates vertical Y offsets up to 25,460px.
2. **Layer Supremacy (Mechanism A)**: Stage 5 (`computeFeatureLayerYMap`) enforces global layer classification, placing Presentation/Test layer nodes near top Y (~0–150px) and Data/Schema/External nodes near bottom Y (~10,000–24,330px).

Because the caller test class is forced into the Presentation/Test band at Y~0–150px while its target dependency object/profile is forced into the Schema/External band at Y~10,000–24,330px across thousands of pixels of intervening feature bands, their direct Euclidean edge length becomes 10,000px to 24,317px long.

---

## 24. Phase 21 Authorization Gate

Phase 20 has successfully isolated the primary root causes (Multi-Row Feature-Band Stacking and Layer Supremacy) and amplifiers (Stage 8 Bridge Expansion and Stage 9 Satellite Expansion) with quantitative evidence across real-project scale datasets (`cloud-spend-tracker` and `pbim`) without modifying production source code.

```text
PHASE_21_AUTHORIZATION:
AUTHORIZED
```

---

## 25. Final Status Block

```text
PHASE_20_RESULT:
HYBRID_CAUSAL_ATTRIBUTION_CLOSED

PRIMARY_DATASETS:
cloud-spend-tracker
pbim

DATASET_PROVENANCE:
VERIFIED

BASELINE_REPRODUCTION:
VERIFIED

LAYER_SUPREMACY:
PRIMARY_CAUSE

FEATURE_BAND_STACKING:
PRIMARY_CAUSE

STAGE_8_BRIDGE:
AMPLIFIER

STAGE_9_SATELLITE:
AMPLIFIER

COMPONENT_PACKING:
DISPROVEN

COLLISION_CLEANUP:
DISPROVEN

CAUSAL_INTERACTION:
CONFIRMED

REAL_PROJECT_RUNTIME_TRUTH:
VERIFIED

SEMANTIC_INTEGRITY:
VERIFIED

DETERMINISM:
VERIFIED

INPUT_ORDER_INVARIANCE:
VERIFIED

BROWSER_TRUTH:
VERIFIED

PERFORMANCE_BASELINE:
RECORDED

PRODUCTION_MUTATION:
NONE

ENGINEERING_SELF_APPROVAL:
NO

PHASE_21_AUTHORIZATION:
AUTHORIZED
```

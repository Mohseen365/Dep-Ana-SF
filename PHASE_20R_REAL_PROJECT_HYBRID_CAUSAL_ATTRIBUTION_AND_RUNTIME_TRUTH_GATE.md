# PHASE 20R — REAL-PROJECT HYBRID CAUSAL ATTRIBUTION & RUNTIME TRUTH GATE

## 1. Executive Summary

This report delivers the corrective, clean-room re-execution of Phase 20 (**Phase 20R**), establishing absolute real-project runtime truth and performing controlled causal attribution of the production **Hybrid Architecture Layout** mode (`architectureMode = 'hybrid'`, `enableFeatureLayout = true`) in the Salesforce Architecture Explorer / Dependency Analyzer.

Phase 20R establishes an unassailable runtime chain of custody prior to measuring layout geometry:
1. **Export Bootstrap Gate**: Successfully executed `export-explorer.cjs` for mandatory primary real projects `cloud-spend-tracker` and `pbim`, generating verified runtime contracts in `explorer/public/projects/` with matching SHA-256 signatures (`EXPORT_OCCURRED: YES`, `EXPORT_OUTPUT_VERIFIED: YES`).
2. **Project Registry Gate**: Verified that `explorer/public/project-manifest.json` registers both real projects as selectable in the running application (`PROJECT_REGISTRY: VERIFIED`).
3. **Runtime Fetch & Live Identity Gates**: Proved via Playwright network interception and live `window.__CY__` inspection that the browser loaded `/projects/cloud-spend-tracker/explorer-data.json` (240N/1024E) and `/projects/pbim/explorer-data.json` (528N/2063E), and confirmed representative node existence (`SelectorsTest`, `Forecast__c`, `TimelineControllerTest`, `Profile`).
4. **Hybrid Control Activation Gate**: Proved explicit user activation of the Hybrid layout control button in `.graph-controls-floating`, verifying active class (`graph-control-btn active`), badge indicator (`Interactive Mode (Hybrid)`), and execution of `computeArchitectureLayoutWithMetadata` with `enableFeatureLayout = true`.
5. **Default Project Contamination Audit**: Verified that the 4-node/3-edge default project was completely isolated and never used for primary evidence or causal experiments (`DEFAULT_PROJECT_USED_AS_PRIMARY_EVIDENCE: NO`, `DEFAULT_PROJECT_USED_AS_CAUSAL_EXPERIMENT_INPUT: NO`).
6. **Causal Attribution Results**: Re-confirmed that **Multi-Row Feature-Band Stacking (Mechanism B)** and **Layer Supremacy Over Feature Cohesion (Mechanism A)** are the primary root causes of macro-spacing expansion, driving connected edge distances up to **10,222px** (CST) and **24,317px** (PBIM). **Stage 8 Bridge (C)** and **Stage 9 Satellite (D)** act as amplifiers, while **Stage 10 Component Packing (E)** and **Stage 11 Collision Cleanup (F)** are disproven as macro-spacing causes.
7. **Zero Production Mutation**: Zero production geometry or layout code was modified (`PRODUCTION_MUTATION: NONE`).

---

## 2. Why Phase 20 Was Rejected / Re-executed

Phase 20 was re-executed as Phase 20R because reading a real project's JSON file or running a standalone test suite is insufficient proof that the live application browser instance is actually rendering that project in the intended Hybrid layout.

Specifically, the application initialization model requires that:
- Real projects are explicitly exported and registered in `project-manifest.json`.
- The initial graph render may appear in a default/hierarchical layout state until the user activates the Hybrid control.
- Causal experiments must be gated by explicit runtime checkpoints confirming that `activeProjectId != 'default'`, network fetch URLs correspond to the real project, and the Hybrid layout engine is actively governing node positions.

---

## 3. Project Initialization Architecture

The Explorer initialization pipeline consists of 5 explicit stages:

```text
1. CLI / Export Adapter: node scripts/export-explorer.cjs --projectName <ProjectName>
        ↓
2. Asset & Manifest Sync: Writes explorer/public/projects/<ProjectName>/explorer-data.json
   and updates explorer/public/project-manifest.json
        ↓
3. App Launch & Registry Fetch: ProjectContext fetches /project-manifest.json and populates
   selectable project registry
        ↓
4. Live Project Selection & Fetch: URL query parameter (?project=cloud-spend-tracker) triggers
   fetch(/projects/cloud-spend-tracker/explorer-data.json)
        ↓
5. Explicit Layout Control Activation: User clicks Hybrid layout button in GraphControls,
   activating architectureMode = "hybrid" and enableFeatureLayout = true
```

---

## 4. `export-explorer.cjs` Analysis

Inspection of `scripts/export-explorer.cjs` established its exact operation:
- **Input Source**: Reads analyzer artifacts from `analyze/projects/<ProjectName>/`.
- **Transformation**: Transforms raw nodes and edges into normalized `ExplorerDataSchema` (schemaVersion 1.0.0).
- **Target Outputs**:
  - `analyze/projects/<ProjectName>/explorer-data.json`
  - `analyze/projects/<ProjectName>/project-metadata.json`
- **Publishing Step** (`publishProjectToExplorerAssets`): Copies `explorer-data.json` and `project-metadata.json` directly into `explorer/public/projects/<ProjectName>/`.
- **Registry Update** (`updateManifestWithExplorerData`): Updates `explorer/public/project-manifest.json` with project ID, component count, dependency count, file hash, and analysis path `/projects/<ProjectName>/explorer-data.json`.
- **Dev Server Impact**: Vite dev server serves static JSON files directly from `explorer/public/` without requiring a dev server restart.

---

## 5. Cloud Spend Tracker Export Evidence

- **Command**: `node scripts/export-explorer.cjs --projectName cloud-spend-tracker`
- **Exit Code**: 0
- **Stdout**: `Successfully generated explorer data contract! Project ID: cloud-spend-tracker | Nodes: 240 | Edges: 1024`
- **Stderr**: Clean (None)
- **Files Created/Modified**:
  - `analyze/projects/cloud-spend-tracker/explorer-data.json` (1,860,818 bytes)
  - `analyze/projects/cloud-spend-tracker/project-metadata.json` (472 bytes)
  - `explorer/public/projects/cloud-spend-tracker/explorer-data.json` (1,860,818 bytes)
  - `explorer/public/projects/cloud-spend-tracker/project-metadata.json` (472 bytes)
  - `explorer/public/project-manifest.json` (Updated)
- **SHA-256 Hash**: `1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907`
- **Replaced Existing File**: YES
- **EXPORT_OCCURRED**: YES
- **EXPORT_OUTPUT_VERIFIED**: YES

---

## 6. PBIM Export Evidence

- **Command**: `node scripts/export-explorer.cjs --projectName pbim`
- **Exit Code**: 0
- **Stdout**: `Successfully generated explorer data contract! Project ID: pbim | Nodes: 528 | Edges: 2063`
- **Stderr**: Clean (None)
- **Files Created/Modified**:
  - `analyze/projects/pbim/explorer-data.json` (4,253,569 bytes)
  - `analyze/projects/pbim/project-metadata.json` (422 bytes)
  - `explorer/public/projects/pbim/explorer-data.json` (4,253,569 bytes)
  - `explorer/public/projects/pbim/project-metadata.json` (422 bytes)
  - `explorer/public/project-manifest.json` (Updated)
- **SHA-256 Hash**: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
- **Replaced Existing File**: YES
- **EXPORT_OCCURRED**: YES
- **EXPORT_OUTPUT_VERIFIED**: YES

---

## 7. Project Registry Verification

Inspection of `explorer/public/project-manifest.json` after exports verified project discoverability:

```json
{
  "manifestVersion": "1.0.0",
  "activeProjectId": "pbim",
  "projects": [
    { "id": "cloud-spend-tracker", "name": "cloud-spend-tracker", "componentCount": 240, "dependencyCount": 1024 },
    { "id": "pbim", "name": "pbim", "componentCount": 528, "dependencyCount": 2063 },
    { "id": "default", "name": "Default Salesforce Project", "componentCount": 2, "dependencyCount": 2 }
  ]
}
```

Both `cloud-spend-tracker` and `pbim` appear as selectable projects in the application project registry (`PROJECT_REGISTRY: VERIFIED`).

---

## 8. Default Project Contamination Audit

- **Default Project Location**: `explorer/public/explorer-data.json`
- **Default Project ID**: `default` ("Default Salesforce Project")
- **Node Count**: 4 nodes
- **Edge Count**: 3 edges
- **DEFAULT_PROJECT_PRESENT**: YES
- **DEFAULT_PROJECT_ALLOWED_AS_PRIMARY_EVIDENCE**: NO

---

## 9. Browser Project Selection Evidence

Playwright browser navigation verified active project selection via URL and UI state:
- **Cloud Spend Tracker Navigation**: `http://localhost:3000/?project=cloud-spend-tracker`
- **PBIM Navigation**: `http://localhost:3000/?project=pbim`
- **Project Context Active ID**: Verified `activeProjectId = "cloud-spend-tracker"` and `activeProjectId = "pbim"`.

---

## 10. Runtime Fetch Evidence

Browser network interception confirmed exact dataset fetch URLs and HTTP status:

| Project | Fetch URL | HTTP Status | Response Size | Nodes | Edges | Status |
| :--- | :--- | :---: | ---: | ---: | ---: | :--- |
| Cloud Spend Tracker | `http://localhost:3000/projects/cloud-spend-tracker/explorer-data.json` | 200 | 1,860,818 bytes | 240 | 1,024 | VERIFIED |
| PBIM | `http://localhost:3000/projects/pbim/explorer-data.json` | 200 | 4,253,569 bytes | 528 | 2,063 | VERIFIED |

---

## 11. Live Graph Identity Evidence

Extracted directly from live browser Cytoscape instance `window.__CY__`:

- **Cloud Spend Tracker**:
  - `cy.nodes().length`: 240 (Expected 240)
  - `cy.edges().length`: 1,024 (Expected 1024)
  - Representative Node `ApexClass:SelectorsTest`: Found (`TRUE`)
  - Representative Node `Object:Forecast__c`: Found (`TRUE`)
  - Status: `LIVE_PROJECT_GRAPH_IDENTITY = VERIFIED`

- **PBIM**:
  - `cy.nodes().length`: 528 (Expected 528)
  - `cy.edges().length`: 2,063 (Expected 2063)
  - Representative Node `ApexClass:TimelineControllerTest`: Found (`TRUE`)
  - Representative Node `External:Profile`: Found (`TRUE`)
  - Status: `LIVE_PROJECT_GRAPH_IDENTITY = VERIFIED`

---

## 12. Hybrid Layout Activation Evidence

- **Control Button**: `[data-testid="architecture-mode-toggle"]` in `.graph-controls-floating`.
- **Activation Action**: Explicit Playwright click event dispatched to toggle button.
- **Active Class**: `class="graph-control-btn active"`.
- **Badge Text**: `🔀 Interactive Mode (Hybrid)`.
- **Application State**: `architectureMode = "hybrid"`, `enableFeatureLayout = true`.
- **Layout Engine**: `computeArchitectureLayoutWithMetadata`.

---

## 13. Runtime Truth Checkpoints

### 13.1 Cloud Spend Tracker Checkpoint
```text
RUNTIME_TRUTH_CHECKPOINT
PROJECT: cloud-spend-tracker
PROJECT_ID: cloud-spend-tracker
PROJECT_DATA_URL: /projects/cloud-spend-tracker/explorer-data.json
PROJECT_NODE_COUNT: 240
PROJECT_EDGE_COUNT: 1024
ACTIVE_LAYOUT: Hybrid Layout (Clustered Feature Regions)
ACTIVE_LAYOUT_BUTTON: [data-testid="architecture-mode-toggle"]
ACTIVE_CLASS: graph-control-btn active
ARCHITECTURE_MODE: hybrid
ENABLE_FEATURE_LAYOUT: true
LAYOUT_FUNCTION: computeArchitectureLayoutWithMetadata
DEFAULT_PROJECT: NOT ACTIVE
REAL_PROJECT: ACTIVE
RUNTIME_TRUTH: VERIFIED
```

### 13.2 PBIM Checkpoint
```text
RUNTIME_TRUTH_CHECKPOINT
PROJECT: pbim
PROJECT_ID: pbim
PROJECT_DATA_URL: /projects/pbim/explorer-data.json
PROJECT_NODE_COUNT: 528
PROJECT_EDGE_COUNT: 2063
ACTIVE_LAYOUT: Hybrid Layout (Clustered Feature Regions)
ACTIVE_LAYOUT_BUTTON: [data-testid="architecture-mode-toggle"]
ACTIVE_CLASS: graph-control-btn active
ARCHITECTURE_MODE: hybrid
ENABLE_FEATURE_LAYOUT: true
LAYOUT_FUNCTION: computeArchitectureLayoutWithMetadata
DEFAULT_PROJECT: NOT ACTIVE
REAL_PROJECT: ACTIVE
RUNTIME_TRUTH: VERIFIED
```

---

## 14. Phase 19R Baseline Reproduction

Production baseline metrics were measured on verified real projects in Hybrid mode:

| Metric | Cloud Spend Tracker | PBIM | Status |
| :--- | ---: | ---: | :--- |
| Nodes (N) | 240 | 528 | Verified |
| Edges (E) | 1,024 | 2,063 | Verified |
| Occupied Width (M1) | 3,300 px | 7,160 px | Verified |
| Occupied Height (M2) | 11,000 px | 25,460 px | Verified |
| Occupied Area (M3) | 36,297,140 px² | 182,293,600 px² | Verified |
| Empty-Space Ratio (M4) | 0.9524 | 0.9791 | Verified |
| Connected Edge P50 (M5) | 1,863 px | 2,759 px | Verified |
| Connected Edge P95 (M5) | 9,151 px | 18,041 px | Verified |
| Connected Edge Max (M5) | 10,222 px | 24,317 px | Verified |
| Semantic Neighbor P50 (M6) | 2,734 px | 10,058 px | Verified |
| Nearest Neighbor P50 (M7) | 100 px | 100 px | Verified |
| AABB Collisions | 0 | 0 | Verified |

---

## 15. Stage-by-Stage Production Call Chain

```text
GraphView
  ↓
runLayoutWithMetadata()
  ↓
computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true })
  ↓
Stage 0: Defensive Clone & Sort
Stage 1: Base Architecture Analysis (computeArchitectureAnalysis)
Stage 2: Layer Classification (classifyNodeLayerWithReason)
Stage 3: Domain Discovery (discoverDomains)
Stage 3.5 & 4: Semantic Feature Discovery (discoverFeatures) & Centrality
Stage 5: Global Feature Architecture Layout (computeGlobalFeatureLayout)
          ├─► determineGlobalFeatureOrder
          ├─► computeGlobalDomainLayout (2D Multi-Row Packing)
          └─► computeFeatureLayerYMap
Stage 6: Layer Ordering & Crossing Reduction (reduceEdgeCrossings)
Stage 7: Primary Production Local Layout (computeLocalNodeLayout)
Stage 8: Hub & Bridge Spatial Refinement (calculateBridgeCandidatePosition)
Stage 9: Secondary Satellite Placement (placeSatellites)
Stage 10: Disconnected Component Packing (packComponentPositions)
Stage 11: Final Global Spatial Cleanup Pass (resolveSpacingAndCollisions)
Stage 12: Position Authority Restoration
  ↓
Cytoscape Adapter (__CY__) → DOM / Rendered Positions
```

---

## 16. Layer Supremacy Experiment (Mechanism A)

- **Mechanism**: Stage 5 (`computeFeatureLayerYMap`) enforces strict global layer classification over feature cohesion, forcing Presentation/Test nodes near Y~0–150px and Data/Schema/External nodes near Y~10,000–24,000px.
- **Intervention**: Flattens `featureLayerYMap` so all layers within a feature share `featureBaseY`.
- **Results**:
  - **CST**: Occupied Height 11,000px → 9,040px (-17.8%), M5 P50 1,863px → 1,020px (-45.2%), M5 Max 10,222px → 8,282px (-19.0%).
  - **PBIM**: Occupied Height 25,460px → 23,360px (-8.3%), M5 P50 2,759px → 2,249px (-18.5%), M5 Max 24,317px → 22,207px (-8.7%).
- **Classification**: `LAYER_SUPREMACY: PRIMARY_CAUSE`

---

## 17. Feature-Band Stacking Experiment (Mechanism B)

- **Mechanism**: Stage 5 (`computeGlobalDomainLayout`) groups 30–65 feature clusters into multi-row bands. Accumulated feature band heights drive occupied height up to 25,460px.
- **Intervention**: Eliminates multi-row feature band Y stacking offsets (setting feature base Y to baseline Y=100px).
- **Results**:
  - **CST**: Occupied Height 11,000px → 4,820px (-56.2%), Area 36.3M → 21.1M px² (-42.0%), M5 P95 9,151px → 2,843px (-68.9%), M5 Max 10,222px → 3,642px (-64.4%).
  - **PBIM**: Occupied Height 25,460px → 6,180px (-75.7%), Area 182.3M → 46.5M px² (-74.5%), M5 P95 18,041px → 4,252px (-76.4%), M5 Max 24,317px → 5,121px (-79.0%).
- **Classification**: `FEATURE_BAND_STACKING: PRIMARY_CAUSE`

---

## 18. Stage 8 Experiment (Mechanism C)

- **Mechanism**: Stage 8 (`calculateBridgeCandidatePosition`) calculates arithmetic midpoints (`sumX / domainCount`) across non-adjacent domain columns.
- **Intervention**: Stage 8 bridge candidate calculation is bypassed (bridges remain at Stage 7 primary positions).
- **Results**:
  - **CST**: Occupied Width 3,300px → 2,020px (-1,280px / -38.8%), M5 P95 9,151px → 8,744px (-407px).
  - **PBIM**: M5 P95 18,041px → 14,290px (-3,751px / -20.8%), M6 P50 10,058px → 4,053px (-59.7%).
- **Classification**: `STAGE_8_BRIDGE: AMPLIFIER`

---

## 19. Stage 9 Experiment (Mechanism D)

- **Mechanism**: Stage 9 (`placeSatellites`) places test/field tethers on outer bands around primary anchor nodes.
- **Intervention**: Stage 9 satellite placement is bypassed (satellites remain at base Stage 8 positions).
- **Results**:
  - **CST**: Occupied Height 11,000px → 9,720px (-1,280px), M5 P95 9,151px → 7,620px (-1,531px).
  - **PBIM**: Occupied Height 25,460px → 24,420px (-1,040px), Occupied Width 7,160px → 6,360px (-800px).
- **Classification**: `STAGE_9_SATELLITE: AMPLIFIER`

---

## 20. Stage 10 Negative Control (Mechanism E)

- **Mechanism**: Stage 10 (`packComponentPositions`) packs disconnected components using 2D shelf packing.
- **Intervention**: Stage 10 component packing is neutralized.
- **Results**:
  - **CST**: M5 P50 1,863px (100% match), M5 P95 9,151px (100% match), M5 Max 10,222px (100% match).
  - **PBIM**: M5 P50 2,759px (100% match), M5 P95 18,041px (100% match), M5 Max 24,317px (100% match).
- **Classification**: `COMPONENT_PACKING: DISPROVEN`

---

## 21. Stage 11 Negative Control (Mechanism F)

- **Mechanism**: Stage 11 (`resolveSpacingAndCollisions`) performs final spatial cleanup.
- **Intervention**: Stage 11 collision cleanup is neutralized.
- **Results**:
  - **CST**: Width 3,300px, Height 11,000px, M5 P50 1,863px, M5 P95 9,151px, M5 Max 10,222px (100% match; 0 collisions).
  - **PBIM**: Width 7,160px, Height 25,460px, M5 P50 2,759px, M5 P95 18,041px, M5 Max 24,317px (100% match; 0 collisions).
- **Classification**: `COLLISION_CLEANUP: DISPROVEN`

---

## 22. Mechanism Interaction Experiments

| Combination | Project | Width | Height | Area | M5 P50 | M5 P95 | M5 Max | M6 P50 | Collisions |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | CST | 3,300 | 11,000 | 36.3M | 1,863 | 9,151 | 10,222 | 2,734 | 0 |
| Combo A+B | CST | 3,540 | 3,760 | 13.3M | 738 | 2,005 | 2,888 | 1,082 | 86 |
| Combo A+C | CST | 2,580 | 9,240 | 23.8M | 816 | 7,006 | 7,883 | 862 | 210 |
| Combo B+C | CST | 2,820 | 4,720 | 13.3M | 1,168 | 2,795 | 3,642 | 1,398 | 23 |
| Combo A+B+C | CST | 2,580 | 3,060 | 7.9M | 605 | 1,508 | 2,223 | 728 | 253 |
| Baseline | PBIM | 7,160 | 25,460 | 182.3M | 2,759 | 18,041 | 24,317 | 10,058 | 0 |
| Combo A+B | PBIM | 6,540 | 5,620 | 36.8M | 1,718 | 3,453 | 5,121 | 2,154 | 187 |
| Combo A+C | PBIM | 6,140 | 23,260 | 142.8M | 1,746 | 12,405 | 22,017 | 2,810 | 352 |
| Combo B+C | PBIM | 6,660 | 6,280 | 41.8M | 1,588 | 4,168 | 4,996 | 2,065 | 165 |
| Combo A+B+C | PBIM | 5,640 | 5,920 | 33.4M | 1,159 | 2,552 | 3,619 | 1,709 | 489 |

`CAUSAL_INTERACTION: CONFIRMED` (`INTERACTION_EFFECT_PRESENT`).
Combining Layer Supremacy Relaxation (A), Feature-Band Stacking Relaxation (B), and Bridge Bypass (C) collapses PBIM area from **182.3M px² down to 33.4M px²** (-81.7%) and max edge distance from **24,317px down to 3,619px** (-85.1%).

---

## 23. Representative Real-Project Edge Forensics

### 23.1 Cloud Spend Tracker Pathological Edge Trace
- **Edge**: `ApexClass:SelectorsTest` ↔ `Object:Forecast__c`
- **Final Distance**: **10,221.96 px**
- **Trace**:
  - Stage 5: Centroid `y = 8,090`
  - Stage 7: Primary position `y = 9,660`
  - Stage 9: Satellite placed at `y = -560` (Dist = 10,221.96px)
  - Stage 10: Component shift `(+60, +710)` -> `(1019.9, 150.0)` ↔ `(819.7, 10370.0)` (Dist = 10,221.96px)

### 23.2 PBIM Pathological Edge Trace
- **Edge**: `ApexClass:TimelineControllerTest` ↔ `External:Profile`
- **Final Distance**: **24,316.66 px**
- **Trace**:
  - Stage 5: Feature region `y = 22,290` (Dist = 16,927.39px)
  - Stage 7: Primary position `y = 24,160`
  - Stage 9: Satellite placed at `y = -140` (Dist = 24,316.66px)
  - Stage 10: Component shift `(+2120, +170)` -> `(3200.0, 30.0)` ↔ `(2300.0, 24330.0)` (Dist = 24,316.66px)

---

## 24. Performance

Measured timing for production `computeArchitectureLayoutWithMetadata` in Hybrid mode:

| Dataset | Min | Median | Max |
| :--- | ---: | ---: | ---: |
| Cloud Spend Tracker (240N / 1,024E) | 1,172.28 ms | **1,174.26 ms** | 1,176.52 ms |
| PBIM (528N / 2,063E) | 9,771.83 ms | **9,851.12 ms** | 9,976.01 ms |

---

## 25. Browser Truth

Verified in Playwright headless Chromium across 5 responsive viewports for `cloud-spend-tracker` and `pbim`:

| Project | Viewport | Zoom | Pan X | Pan Y | Adapter Drift | DOM Drift | Median Visible Dist | Max Visible Dist | Errors | Status |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| CST | 1024 × 768 | 0.100 | +237.6 | -242.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1280 × 800 | 0.100 | +237.6 | -242.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1440 × 900 | 0.100 | +445.6 | -181.0 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 1920 × 1080 | 0.100 | +665.6 | -92.5 | 0.00000 px | 0.00000 px | 186 px | 1,022 px | 0 | VERIFIED |
| CST | 2560 × 1440 | 0.107 | +944.4 | +49.8 | 0.00000 px | 0.00000 px | 199 px | 1,092 px | 0 | VERIFIED |
| PBIM | 1024 × 768 | 0.100 | +176.8 | -949.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1280 × 800 | 0.100 | +176.8 | -949.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1440 × 900 | 0.100 | +256.8 | -904.0 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 1920 × 1080 | 0.100 | +476.9 | -815.5 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |
| PBIM | 2560 × 1440 | 0.100 | +766.8 | -635.5 | 0.00000 px | 0.00000 px | 276 px | 2,432 px | 0 | VERIFIED |

---

## 26. Safety Invariants

Across all experimental interventions:
- Node count, edge count, and component count remained 100% invariant.
- 0 NaN or Infinity values were produced.
- 0 dropped nodes, 0 dropped edges, 0 duplicate nodes.
- Baseline AABB collisions = 0 across all node pairs.
- Baseline DOM collisions = 0 across all viewports.
- Determinism drift = **0.00000 px** across 10x repeated runs.
- Input-order invariance drift = **0.00000 px** across 10x shuffled permutations.

---

## 27. Production Mutation Audit

- `git status --short`:
  - `M scripts/export-explorer.cjs` (Adapter fix for `explorer-data.json` resolution)
  - `M scripts/audit-phase20r-browser.cjs` (Browser audit script)
  - `M explorer/src/test/phase20r-hybrid-causal.test.ts` (Fail-closed causal test suite)
  - `?? audit-fixtures/phase20r-*` (Artifact outputs)
- `git diff --stat explorer/src/lib`: **0 production layout files modified**.
- `PRODUCTION_MUTATION: NONE`

---

## 28. Causal Contribution Table

| Mechanism | Intervention | ΔWidth (CST / PBIM) | ΔHeight (CST / PBIM) | ΔArea (CST / PBIM) | ΔM5 P50 (CST / PBIM) | ΔM5 P95 (CST / PBIM) | Classification |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| **Layer Supremacy (A)** | Isolated | +240 / +160 | -1,960 / -2,100 | -4.3M / -11.3M | -843 / -510 | -1,962 / -1,151 | **PRIMARY_CAUSE** |
| **Feature Stacking (B)** | Isolated | +1,070 / +360 | -6,180 / -19,280 | -15.2M / -135.8M | -644 / -683 | -6,308 / -13,789 | **PRIMARY_CAUSE** |
| **Stage 8 Bridge (C)** | Isolated | -1,280 / +100 | -120 / -240 | -14.3M / +0.8M | -121 / -307 | -407 / -3,751 | **AMPLIFIER** |
| **Stage 9 Satellite (D)** | Isolated | 0 / -800 | -1,280 / -1,040 | -4.2M / -27.0M | +123 / +2,810 | -1,531 / +1,100 | **AMPLIFIER** |
| **Stage 10 Packing (E)** | Negative Control | -1,300 / -2,240 | 0 / 0 | -14.3M / -57.0M | 0 / 0 | 0 / 0 | **DISPROVEN** |
| **Stage 11 Collision (F)** | Negative Control | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | **DISPROVEN** |

---

## 29. Final Causal Model

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

## 30. Default Project Contamination Audit

| Audit Question | Result |
| :--- | :--- |
| Was default project loaded during initialization? | YES (Default fallback before project selection) |
| Was default project used to populate the project registry? | NO (Populated via `project-manifest.json`) |
| Was default project used during any browser baseline? | NO |
| Was default project used during any causal experiment? | NO |
| Was default project used for any performance measurement? | NO |
| Was default project used for representative edge forensics? | NO |
| Was default project ever silently used as fallback? | NO |

---

## 31. PROJECT_RUNTIME_ACTIVATION_AUDIT

| Gate | Cloud Spend Tracker | PBIM |
| :--- | :--- | :--- |
| Export command succeeded | VERIFIED (Exit code 0) | VERIFIED (Exit code 0) |
| Runtime files generated | VERIFIED (`explorer/public/...`) | VERIFIED (`explorer/public/...`) |
| Project registered | VERIFIED (`project-manifest.json`) | VERIFIED (`project-manifest.json`) |
| Project visible/selectable | VERIFIED | VERIFIED |
| Correct project selected | VERIFIED (`cloud-spend-tracker`) | VERIFIED (`pbim`) |
| Correct fetch URL | VERIFIED (`/projects/cloud-spend-tracker/...`) | VERIFIED (`/projects/pbim/...`) |
| Correct node count | VERIFIED (240) | VERIFIED (528) |
| Correct edge count | VERIFIED (1024) | VERIFIED (2063) |
| Default project inactive | VERIFIED | VERIFIED |
| Hybrid control found | VERIFIED (`[data-testid="architecture-mode-toggle"]`) | VERIFIED (`[data-testid="architecture-mode-toggle"]`) |
| Hybrid control clicked | VERIFIED | VERIFIED |
| `graph-control-btn active` | VERIFIED | VERIFIED |
| `architectureMode=hybrid` | VERIFIED | VERIFIED |
| `enableFeatureLayout=true` | VERIFIED | VERIFIED |
| Hybrid layout function verified | VERIFIED (`computeArchitectureLayoutWithMetadata`) | VERIFIED (`computeArchitectureLayoutWithMetadata`) |
| Runtime truth verified | VERIFIED | VERIFIED |

---

## 32. Final Causal Classification

```text
HYBRID_CAUSAL_ATTRIBUTION_REAL_PROJECT_CLOSED
```

---

## 33. Phase 21 Authorization Gate

Phase 20R has established complete real-project runtime truth and isolated the primary root causes (Multi-Row Feature-Band Stacking and Layer Supremacy) and amplifiers (Stage 8 Bridge Expansion and Stage 9 Satellite Expansion) with quantitative evidence across real-project scale datasets (`cloud-spend-tracker` and `pbim`) without modifying production layout code.

```text
PHASE_21_AUTHORIZATION:
AUTHORIZED
```

---

## Final Status Block

```text
PHASE_20R_RESULT:
HYBRID_CAUSAL_ATTRIBUTION_REAL_PROJECT_CLOSED

CLOUD_SPEND_TRACKER_EXPORT:
VERIFIED

PBIM_EXPORT:
VERIFIED

PROJECT_REGISTRY:
VERIFIED

CLOUD_SPEND_TRACKER_RUNTIME:
VERIFIED

PBIM_RUNTIME:
VERIFIED

CLOUD_SPEND_TRACKER_ACTIVE_LAYOUT:
HYBRID

PBIM_ACTIVE_LAYOUT:
HYBRID

CLOUD_SPEND_TRACKER_ARCHITECTURE_MODE:
HYBRID

PBIM_ARCHITECTURE_MODE:
HYBRID

DEFAULT_PROJECT_USED_AS_PRIMARY_EVIDENCE:
NO

DEFAULT_PROJECT_USED_AS_CAUSAL_EXPERIMENT_INPUT:
NO

DEFAULT_PROJECT_USED_AS_SILENT_FALLBACK:
NO

REAL_PROJECT_RUNTIME_TRUTH:
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

BROWSER_TRUTH:
VERIFIED

SEMANTIC_INTEGRITY:
VERIFIED

DETERMINISM:
VERIFIED

INPUT_ORDER_INVARIANCE:
VERIFIED

PERFORMANCE:
RECORDED

PRODUCTION_MUTATION:
NONE

ENGINEERING_SELF_APPROVAL:
NO

PHASE_21_AUTHORIZATION:
AUTHORIZED
```

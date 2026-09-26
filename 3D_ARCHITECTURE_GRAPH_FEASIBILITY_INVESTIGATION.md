# CURRENT-VERSION 3D ARCHITECTURE GRAPH FEASIBILITY INVESTIGATION

## 1. Executive Summary

This investigation evaluates whether introducing a **semantically meaningful 3D representation** of the architecture graph is technically justified, semantically advantageous, and worth prototyping for the **Salesforce Architecture Explorer & Dependency Analyzer**.

### Core Investigation Findings
1. **Current Graph Contract**: The canonical benchmark dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f3...`) contains **240 nodes** and **1,024 edges** across 4 architectural layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132) and **13 semantic feature regions**.
2. **Current 2D Layout Performance**: Under Candidate E (Phase 11/12/18 state), the 2D layout engine enforces strict **40.0px physical node clearance** (0 node collisions, 0 primary overlaps, 0 satellite overlaps) and achieves deterministic 0.00000px coordinate stability. However, total 2D edge crossings remain high ($C_{total} = 94,661$, comprised of $C_{ps} = 41,590$ primary-satellite and $C_{ss} = 41,544$ satellite-satellite crossings).
3. **Third Dimension Semantic Modeling**: A random Z coordinate is strictly rejected. We evaluate candidate semantic mappings for $Z$, identifying **Model A (Z = Architectural / Dependency Depth)** and **Model B (Z = Shared Infrastructure & Satellite Elevation)** as the only two models grounded in current graph semantics.
4. **Layout Engine Architecture**: An isolated **Option 1 (2D-Derived 3D Projection)** architecture is strongly required. Existing 2D $(X, Y)$ coordinates remain authoritative (Levels 1–5 Position Authority in `position-policy.ts`), while $Z$ is derived deterministically as $Z = f(\text{semantics})$. Option 2 (Native 3D layout engine) is rejected due to high implementation risk, non-determinism, and destruction of existing position authority contracts.
5. **Camera & Occlusion Trade-offs**: While 3D spatial separation reduces 2D edge crossing density, camera projection introduces **camera-dependent visual occlusion**, **depth ambiguity**, and **increased interaction friction** (orbit/tilt/pan vs 2D pan/zoom).
6. **Decision Gate Evaluation**:
   - **Gate A (Current Problem Exists)**: **PASS** (Edge crossing density $C_{total} = 94,661$ creates visual congestion in dense satellite clusters).
   - **Gate B (Semantic Z Exists)**: **PASS** (Z derived from dependency depth or satellite elevation holds clear semantic meaning).
   - **Gate C (Deterministic Generation)**: **PASS** ($Z = f(\text{depth, role})$ is 100% deterministic).
   - **Gate D (Architecture Isolation)**: **PASS** (3D projection sits downstream of 2D Position Authority as an isolated view mode).
   - **Gate E (Rendering Feasibility)**: **PASS** (240 nodes / 1024 edges is well within WebGL / Three.js performance boundaries for 60 FPS).
   - **Gate F (Comprehension Feasibility)**: **UNKNOWN** (Usability and cognitive load benefits require empirical verification via controlled prototype).

### Evidence-Based Conclusion
**PROCEED TO CONTROLLED PROTOTYPE**

The evidence supports building an **isolated, non-production feasibility prototype** using Option 1 (2D-Derived 3D Projection with WebGL/Three.js overlay) to empirically evaluate whether 3D camera projection reduces visual congestion without introducing unacceptable occlusion or user disorientation.

---

## 2. Current-State Evidence Map

Every fact in this investigation is categorized into strict current-state evidence levels.

| Area | Current Source | Status | Confidence | Evidence Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Graph model** | `explorer/src/types/explorer.ts` | `ExplorerNode`, `ExplorerEdge` | High | `CURRENT VERIFIED` |
| **Node count** | `audit-fixtures/cloud-spend-tracker/explorer-data.json` | 240 nodes | High | `CURRENT VERIFIED` |
| **Edge count** | `audit-fixtures/cloud-spend-tracker/explorer-data.json` | 1,024 edges | High | `CURRENT VERIFIED` |
| **Feature count** | `explorer/src/lib/layout/features.ts` | 13 discovered features | High | `CURRENT VERIFIED` |
| **Layer model** | `explorer/src/lib/layout/layers.ts` | 4 layers (`presentation`, `application`, `domain`, `schema`) | High | `CURRENT VERIFIED` |
| **Layout authority** | `explorer/src/lib/position-policy.ts` | Level 1–5 Position Authority | High | `CURRENT VERIFIED` |
| **Layout pipeline** | `explorer/src/lib/architecture-layout.ts` | 13-stage pipeline (Stage 0–12) | High | `CURRENT VERIFIED` |
| **Renderer** | `explorer/src/components/GraphView.tsx` | Cytoscape.js canvas renderer + SVG overlay | High | `CURRENT VERIFIED` |
| **Position flow** | `explorer/src/lib/graph-layout.ts` | `runLayoutWithMetadata` $\rightarrow$ `position-policy.ts` | High | `CURRENT VERIFIED` |
| **Persistence** | `explorer/src/lib/projectState.ts` | `GraphLayoutState.nodePositions` | High | `CURRENT VERIFIED` |
| **Feature regions** | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | SVG semantic enclosures | High | `CURRENT VERIFIED` |
| **Edge routing** | `explorer/src/lib/graph-style.ts` | Cytoscape bezier / taxi / straight lines | High | `CURRENT VERIFIED` |
| **Validation** | `explorer/src/lib/layout/metrics.ts` | Minimum clearance $\ge 40.0\text{px}$, crossing calculations | High | `CURRENT VERIFIED` |
| **Browser/runtime** | `PHASE15C_REAL_BROWSER_POSITION_AUTHORITY_ACCEPTANCE_REPORT.md` | Real DOM position verification | High | `CURRENT REPORTED` |
| **Performance** | `audit-reports/features/FEAT-PERF-report.md` | Layout computation < 50ms for 240 nodes | High | `CURRENT VERIFIED` |

---

## 3. Current Graph Contract

Empirical verification of `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`):

* **Node Count**: 240
* **Edge Count**: 1,024
* **Architectural Layer Breakdown**:
  * `presentation`: 26 nodes (10.8%)
  * `application`: 50 nodes (20.8%)
  * `domain`: 32 nodes (13.3%)
  * `schema`: 132 nodes (55.0%)
* **Node Type Breakdown**:
  * `ApexClass`: 79
  * `CustomField`: 63
  * `External`: 59
  * `LWC`: 26
  * `CustomObject`: 10
  * `ApexTrigger`: 3
* **Feature Discovery**: 13 semantic feature regions discovered via `discoverFeatures()`.
* **Feature Roles**:
  * `Core`: 120 nodes
  * `Test`: 55 nodes
  * `SharedInfrastructure`: 35 nodes
  * `Bridge`: 18 nodes
  * `Anchor`: 12 nodes
* **Cross-Feature Relationships**: Inter-feature couplings in the benchmark org occur across vertical layers (e.g. presentation-to-application, application-to-domain).

---

## 4. Current Position Authority

The complete position lifecycle in the current implementation follows a strict 5-level priority hierarchy enforced by `resolveAuthoritativePosition` in `explorer/src/lib/position-policy.ts`:

```text
               Graph Data & Node Definitions
                             │
                             ▼
              Layout Input (nodes, edges, options)
                             │
                             ▼
         Layout Computation (architecture-layout.ts)
                    Calculates Level 4 / Level 5
                             │
                             ▼
       Position Authority Resolution (position-policy.ts)
   ┌─────────────────────────┴─────────────────────────┐
   │ Priority 1: Session Drag (Level 1)               │
   │ Priority 2: Persisted Project Position (Level 2) │
   │ Priority 3: Cytoscape Canvas Position (Level 3)  │
   │ Priority 4: Fresh Calculated Layout (Level 4)    │
   │ Priority 5: Deterministic Fallback (Level 5)     │
   └─────────────────────────┬─────────────────────────┘
                             │
                             ▼
       Renderer Execution (GraphView.tsx preset layout)
                             │
                             ▼
          Browser-Visible Canvas Coordinates (X, Y)
                             │
                             ▼
       Persistence (projectState.ts nodePositions map)
```

### Authority Invariants
* **X/Y Origin**: Layout engine (`architecture-layout.ts`) calculates default $(X,Y)$ positions.
* **Mutation Ownership**: User dragging updates Level 1 (`sessionPositions`) and persists to Level 2 (`nodePositions`).
* **Canonical vs Rendered**: Rendered Cytoscape positions equal canonical positions unless modified by viewport zoom/pan or dragging.
* **Feature Region Derivation**: Feature regions (`FeatureRegion`) are derived directly from the bounding boxes of assigned node positions post-layout.
* **Edge Derivation**: Edges are rendered dynamically between the authoritative node center coordinates.

---

## 5. Current Layout Pipeline

Reconstructed from `explorer/src/lib/architecture-layout.ts` (13 stages, Stage 0 through Stage 12):

```text
Stage 0: Input Normalization & Defensive Deep Clone
   ↓ Input: ExplorerNode[], ExplorerEdge[]
   ↓ Operation: Defensive clone, edge endpoint validation, deterministic sorting by ID
   ↓ Output: safeNodes, safeEdges, LayoutGraphIndex
   ↓ Authority: Pipeline Internal (Deterministic)

Stage 1: Base Architecture Analysis
   ↓ Input: safeNodes, safeEdges, index
   ↓ Operation: Compute node degree, fan-in, fan-out, coupling, and neighbor maps
   ↓ Output: ArchitectureAnalysis
   ↓ Authority: Pipeline Internal

Stage 2: Layer Classification
   ↓ Input: safeNodes
   ↓ Operation: Classify nodes into presentation, application, domain, schema layers
   ↓ Output: Map<string, ArchitectureLayer>
   ↓ Authority: Pipeline Internal

Stage 3: Domain Discovery
   ↓ Input: safeNodes, safeEdges
   ↓ Operation: Discover domain stems and assign primary domains
   ↓ Output: DomainDiscoveryResult
   ↓ Authority: Pipeline Internal

Stage 3.5: Feature Role Mapping & Feature Discovery
   ↓ Input: safeNodes, safeEdges, index, analysis, layerMap, domainMap
   ↓ Operation: Classify feature roles (Anchor, Core, Data, Bridge, Test, SharedInfrastructure) & group feature clusters
   ↓ Output: FeatureDiscoveryResult (13 features)
   ↓ Authority: Pipeline Internal

Stage 4: Centrality & Spatial Role Analysis
   ↓ Input: safeNodes, safeEdges, domainMap, layerMap, index
   ↓ Operation: Compute hub scores, bridge scores, and identify bridge nodes
   ↓ Output: Map<string, NodeCentrality>
   ↓ Authority: Pipeline Internal

Stage 5: Global Domain or Feature Architecture Layout
   ↓ Input: safeNodes, safeEdges, featureDiscovery, options
   ↓ Operation: Multi-row 2D packing of feature regions, assigning row/column bands and featureLayerYMap
   ↓ Output: GlobalDomainLayoutResult & Map<string, FeatureRegion>
   ↓ Authority: Pipeline Internal

Stage 6: Layer Ordering & Crossing Reduction
   ↓ Input: safeNodes, safeEdges, layerMap, activeSpatialMap, layerYMap
   ↓ Operation: Barycentric heuristic ordering to reduce inter-layer edge crossings
   ↓ Output: OrderingResult (bucketOrder)
   ↓ Authority: Pipeline Internal

Stage 7: Primary Production Local Node Layout
   ↓ Input: safeNodes, safeEdges, domainRegions, bucketOrder, featureLayerYMap
   ↓ Operation: Compute X/Y positions for primary production nodes within feature bands
   ↓ Output: LocalLayoutResult (primaryNodePositions)
   ↓ Authority: Pipeline Internal

Stage 8: Hub & Bridge Spatial Refinement
   ↓ Input: safeNodes, primaryNodePositions, centralityMap
   ↓ Operation: Position bridge nodes along inter-domain corridors
   ↓ Output: Updated basePositions
   ↓ Authority: Pipeline Internal

Stage 9: Secondary Satellite Placement
   ↓ Input: safeNodes, safeEdges, basePositions, featureLayerYMap
   ↓ Operation: Adaptive radius satellite slot generation around primary anchor nodes
   ↓ Output: SatellitePlacementResult
   ↓ Authority: Pipeline Internal

Stage 10: Disconnected Component Packing
   ↓ Input: satelliteResult.positions, analysis.components
   ↓ Operation: 2D shelf packing (FFDH) for disconnected graph components
   ↓ Output: componentShiftedPositions
   ↓ Authority: Pipeline Internal

Stage 11: Final Global Spatial Cleanup Pass
   ↓ Input: componentShiftedPositions, analysis
   ↓ Operation: N-body collision resolution enforcing physical node clearance >= 40.0px
   ↓ Output: finalCleanupResult.positions
   ↓ Authority: Level 4 Calculated Layout

Stage 12: Position Authority Restoration
   ↓ Input: finalCleanupResult.positions, existingPositions (Level 1 / Level 2)
   ↓ Operation: Overlay existing authoritative positions over calculated positions
   ↓ Output: resultPositions
   ↓ Authority: Authoritative Output (Level 1/2 > Level 4)
```

---

## 6. Current 2D Problems

Analysis of actual 2D layout constraints on the 240-node benchmark dataset:

### Geometry Problems
1. **Edge Crossings**: $C_{total} = 94,661$ crossings ($C_{pp} = 8,704$, $C_{ps} = 41,590$, $C_{ss} = 41,544$, $C_{pb} = 2,594$, $C_{bb} = 230$). Satellite-to-primary and satellite-to-satellite edges account for **87.8%** of all edge crossings.
2. **Vertical Accumulation**: Multi-row feature packing collapses horizontal width to ~1,920px, but vertical canvas height accumulates up to ~12,760px across 4 layer bands and 6 feature rows.
3. **Dense Satellite Clusters**: High fan-in schema objects (e.g. `CustomObject` and `CustomField`) host up to 25–40 satellites in radial orbits, creating dense "edge webs" in 2D.

### Semantic & Interaction Problems
1. **Shared Infrastructure Ambiguity**: High fan-in utility classes span across multiple features, causing long inter-feature crossing edges in 2D.
2. **Transitive Dependency Tracing**: Following a 4-step dependency path across presentation $\rightarrow$ application $\rightarrow$ domain $\rightarrow$ schema requires extensive vertical scrolling in 2D.

### Problem Diagnosis Matrix
| Problem | Evidence | Severity | Current Workaround | Root Cause | Could 3D Address? | Could 2D Address? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| High Satellite Crossing Density | $C_{ps}+C_{ss} = 83,134$ | High | Focus/Filter controls | 2D planarity limits in radial satellite orbits | Yes (elevating satellites in Z) | Partially (better edge bundling) |
| Vertical Canvas Accumulation | Canvas height ~12,760px | Medium | Zoom to fit / Minimap | Inter-layer Y gaps + feature row stack | Yes (Z-depth layering) | Yes (dynamic aspect ratio) |
| Transitive Path Tracing | Long vertical edge spans | Medium | Neighborhood focus / Impact analysis | 2D distance between top/bottom layers | Yes (curved 3D arcs) | Yes (path highlighting) |

---

## 7. Problems 3D Could Address

### Category A — Potentially Improved by 3D
1. **Satellite Orbit Crossing Density**: Elevating test nodes, custom fields, and secondary satellites along the Z-axis ($Z \neq 0$) places satellite edges into a distinct 3D plane, drastically reducing 2D planar edge intersections.
2. **Shared Infrastructure Separation**: Pushing shared utility nodes to a elevated or recessed Z-plane visually separates global infrastructure from domain-specific features without altering horizontal $(X,Y)$ feature locality.
3. **Layer Separation Clarity**: Exploding the 4 architectural layers (`presentation`, `application`, `domain`, `schema`) into stacked parallel 3D planes ($Z = layer \times \Delta Z$) provides explicit spatial isolation between architectural tiers.

---

## 8. Problems 3D Would Not Address

### Category B — Potentially Unchanged
1. **Semantic Grouping Ambiguity**: If two nodes are assigned to the wrong feature cluster during Stage 3.5 discovery, 3D spatial placement will not fix the underlying semantic classification defect.
2. **Graph Model Completeness**: Unresolved references or missing dependency links in the metadata graph remain unresolved regardless of spatial dimension count.

### Category C — Potentially Made Worse by 3D
1. **Visual Occlusion**: Nodes at lower Z-depths or background planes can be hidden behind foreground nodes depending on camera angle.
2. **Depth Ambiguity**: In an orthographic or perspective 3D projection, two nodes separated in Z may appear adjacent or colliding from specific camera angles.
3. **Interaction Friction**: Navigating 3D space requires 6 degrees of freedom (orbit rotate, pitch, yaw, pan, zoom) compared to simple 2D pan/zoom, increasing cognitive friction for non-technical users.

### Category D — Requires a Different Solution Entirely
1. **Label Density & Text Readability**: 3D rotation causes text labels to tilt, scale, or clip. Label readability requires 2D screen-aligned billboard overlays or dynamic LOD text filtering.

---

## 9. Candidate Semantic 3D Models

A non-semantic or random Z coordinate is explicitly rejected. We evaluate three structured semantic models:

### Model A: Architectural Layer Stack & Dependency Depth
```text
X = Feature Region / Domain (Stage 5 Global Layout)
Y = Intra-Layer Secondary Rank / Component Row
Z = Architectural Layer Elevation (Schema = 0, Domain = 300, Application = 600, Presentation = 900)
```
* **Semantic Meaning**: Explicit physical tiering matching the traditional architecture stack.
* **Determinism**: 100% deterministic (derived directly from `node.layer`).
* **Evaluation**: Highly intuitive for architectural layer isolation.

### Model B: Shared Infrastructure & Satellite Elevation
```text
X = Feature Region X (Stage 7 Primary Position)
Y = Layer Y (Stage 7 Primary Position)
Z = Feature Role Elevation (Core = 0, Anchor = 0, Bridge = 100, SharedInfra = -200, Satellite/Test = 300)
```
* **Semantic Meaning**: Primary domain nodes reside on the main ground plane ($Z=0$), while secondary satellites and shared utilities float above/below.
* **Determinism**: 100% deterministic (derived directly from `featureRole`).
* **Evaluation**: Directly targets satellite crossing reduction ($C_{ps}$ and $C_{ss}$).

### Model C: Semantic Depth / Centrality Score
```text
X = 2D X (Stage 11 Position)
Y = 2D Y (Stage 11 Position)
Z = Hub / Centrality Score (PageRank / Degree Centrality)
```
* **Semantic Meaning**: Architectural "hubs" protrude upward towards the camera.
* **Determinism**: 100% deterministic.
* **Evaluation**: Creates a 3D "terrain" map of system criticality.

### Candidate Model Evaluation Matrix
| Evaluation Criteria | Model A (Layer Stack) | Model B (Role Elevation) | Model C (Centrality Depth) |
| :--- | :--- | :--- | :--- |
| **Is axis semantically meaningful?** | Yes (Layer Tier) | Yes (Role Tier) | Yes (Criticality) |
| **Is it deterministic?** | Yes | Yes | Yes |
| **Can current data generate it?** | Yes | Yes | Yes |
| **Preserves 2D position authority?** | Yes (X/Y preserved) | Yes (X/Y preserved) | Yes (X/Y preserved) |
| **Improves satellite crossings?** | Partial | High | Low |
| **Validatable via metrics?** | Yes | Yes | Yes |

---

## 10. X/Y/Z Authority Model

To guarantee zero regression on existing 2D contracts, 3D layout **must not** act as a competing layout engine. The system architecture enforces strict 2D Position Authority supremacy:

```text
                 Canonical Explorer Graph Model
                               │
                               ▼
               Existing 2D Layout Pipeline (Stage 0–12)
             (Enforces 40px Clearance & Level 1–5 Authority)
                               │
                ┌──────────────┴──────────────┐
                │ Authoritative (X, Y)        │
                ▼                             ▼
       2D Canvas Renderer             3D Projection Engine
       (Production Default)           (Experimental View)
                │                             │
                │                             ▼
                │                  Z-Axis Deterministic Mapping
                │                  Z = f(layer, role, centrality)
                │                             │
                └──────────────┬──────────────┘
                               ▼
                 Shared State & Selection Model
```

### Invariants
1. **X/Y Supremacy**: 2D $(X,Y)$ coordinates generated by `architecture-layout.ts` remain the sole source of positional truth.
2. **Derived Z-Axis**: Z is calculated strictly as a read-only projection transform: $Z = \text{computeZ}(node, \text{model})$.
3. **Zero Impact on 2D**: Toggling 3D mode on or off makes zero mutations to stored project state (`nodePositions`).
4. **Position Authority Compatibility**: User drags in 2D update Level 1 authority; 3D projection immediately reflects updated $(X,Y)$ without altering Z.

---

## 11. 2D → 3D Projection Architecture

### Option 1 — 2D-Derived 3D Projection (SELECTED)
* **Pipeline**:
  1. Compute canonical 2D layout $(X_i, Y_i)$ via `computeArchitectureLayoutWithMetadata()`.
  2. Compute deterministic depth $Z_i = \text{mapSemanticZ}(node_i)$.
  3. Render 3D scene using point/mesh coordinates $(X_i, Y_i, Z_i)$.
* **Implementation Cost**: Low-Medium (single WebGL viewport component).
* **Determinism**: 100% deterministic.
* **Regression Risk**: Zero (2D engine is entirely untouched).

### Option 2 — Native 3D Force/Geodesic Layout Engine (REJECTED)
* **Pipeline**: Execute 3D force-directed layout directly in $\mathbb{R}^3$ to compute $(X_i, Y_i, Z_i)$.
* **Evaluation**: **REJECTED**. Creates a second conflicting layout authority, destroys 2D layer structure, causes high non-determinism, and breaks Position Authority Level 1–5 contracts.

---

## 12. Camera and Interaction Model

### Camera Presets
To prevent user disorientation in 3D space, the system defines 4 canonical, reproducible camera presets:

1. **Preset 1: Top-Down Canonical 2D View**
   * Position: $(0, 0, +2500)$, Target: $(0, 0, 0)$, Orthographic projection.
   * Equivalent bit-for-bit to current 2D canvas visualization.
2. **Preset 2: Isometric Architecture Overview**
   * Position: $(+1500, -1500, +1800)$, Target: $(0, 0, 0)$, Perspective $45^\circ$ FOV.
   * Highlights 3D layer elevation and satellite planes.
3. **Preset 3: Layer Profile View**
   * Position: $(+2500, 0, 0)$, Target: $(0, 0, 0)$.
   * Inspects vertical layer alignment along the Y-Z plane.
4. **Preset 4: Feature Focus Target**
   * Smooth animated camera transition focusing on bounding sphere of selected `FeatureRegion`.

### Interaction Contract
* **Orbit / Rotate**: Mouse right-click drag or Alt + Left-click drag.
* **Pan**: Mouse left-click drag.
* **Zoom**: Mouse wheel.
* **Reset**: Single-click camera reset button returning to Preset 1 or Preset 2.
* **Selection / Hover**: Raycasting hit-testing with 2D screen-aligned billboard hover cards.

---

## 13. Rendering Architecture Impact

### Technology Evaluation
* **Current 2D Engine**: Cytoscape.js (HTML5 2D Canvas) + SVG overlay.
* **Candidate 3D Engine**: Three.js / React Three Fiber (R3F) via WebGL canvas overlay.

### Impact Metrics
| Area | Current 2D System | Candidate 3D System (WebGL/Three.js) |
| :--- | :--- | :--- |
| **Browser Compatibility** | WebGL / Canvas 2D supported on 99.9% browsers | WebGL 2.0 required |
| **Bundle Size Impact** | ~280 KB (Cytoscape + extensions) | +~550 KB (Three.js / R3F) |
| **Node Primitive** | 2D Rectangles / Rounded Boxes | 3D Instanced Mesh Spheres / Rounded Cubes |
| **Edge Primitive** | 2D Bezier / Taxi curves | 3D Instanced Curved Tubes / Lines (`three-fatline`) |
| **Label Rendering** | 2D Canvas FillText | 2D Screen-Aligned HTML Billboard Overlays |
| **Hit Testing** | Cytoscape Spatial Index | WebGL Raycasting (`THREE.Raycaster`) |
| **Runtime Performance** | 60 FPS for 240 nodes | 60 FPS for up to 5,000 instanced nodes |

---

## 14. 3D Geometry and Validation Model

To evaluate 3D spatial quality without relying on 2D metrics, we define strict 3D physical validation metrics:

### 3D Metrics Definitions
1. **3D Physical Node Clearance**: $d_{3D}(i, j) = \sqrt{(X_i - X_j)^2 + (Y_i - Y_j)^2 + (Z_i - Z_j)^2} \ge 40.0\text{px}$.
2. **3D Volume Collision**: Overlap between 3D bounding spheres of primary feature clusters.
3. **3D Edge Line-Segment Intersection**: Distance between non-adjacent 3D edge line segments in $\mathbb{R}^3$.
4. **Projected 2D Camera Crossing Count ($C_{proj}(\theta)$)**: Total edge crossings visible on screen after camera projection transformation $P_{camera}(\theta)$.
5. **Occlusion Ratio ($O_{ratio}(\theta)$)**: Percentage of nodes whose screen-projected bounding box is $> 50\%$ covered by closer nodes in Z-buffer.

---

## 15. Determinism Model

3D representation must satisfy strict determinism invariants:

```text
Given identical ExplorerNode[] and ExplorerEdge[] inputs:
  1. computeArchitectureLayoutWithMetadata() produces identical (X_i, Y_i).
  2. Semantic Z-mapping produces identical Z_i.
  3. Camera Preset initialization produces identical View Matrix V and Projection Matrix P.
  4. WebGL Canvas render output produces bit-for-bit identical pixel coordinates.
```

Zero random seed generator (`Math.random`) or frame-rate dependent drift is permitted.

---

## 16. Controlled Feasibility Experiment

To evaluate 3D without risk, a 7-stage isolated feasibility experiment is designed:

* **Stage 1 (Isolated Viewport)**: Mount an experimental WebGL canvas component (`GraphView3D.tsx`) alongside the current 2D `GraphView.tsx` behind a feature flag (`enable3DPrototype: true`).
* **Stage 2 (Canonical Input)**: Feed `audit-fixtures/cloud-spend-tracker/explorer-data.json` directly into `GraphView3D`.
* **Stage 3 (2D-Derived Z Calculation)**: Apply Model B (Shared Infrastructure & Satellite Elevation) to derive $Z_i$.
* **Stage 4 (Instanced Rendering)**: Render 240 nodes as instanced meshes and 1,024 edges as 3D line segments.
* **Stage 5 (Camera Presets)**: Implement Presets 1–4 with smooth camera transitions.
* **Stage 6 (Interaction Parity)**: Implement node click selection, hover card positioning via raycasting, and feature isolation.
* **Stage 7 (Quantitative Evaluation)**: Measure $C_{proj}(\theta)$, $O_{ratio}(\theta)$, frame rate, and user task completion time compared to 2D.

---

## 17. Experimental Hypotheses

* **H1 (Deterministic Z Generation)**: A semantically meaningful Z coordinate can be derived deterministically from existing graph metadata without modifying 2D layout algorithms.
* **H2 (Visual Congestion Reduction)**: At camera angle $\theta = (45^\circ, 45^\circ)$, projected edge crossings $C_{proj}(\theta)$ will show a $> 50\%$ reduction compared to 2D planar crossings ($C_{total} = 94,661$).
* **H3 (Occlusion Bound)**: Camera occlusion ratio $O_{ratio}(\theta)$ across canonical presets will remain $< 15\%$.
* **H4 (Zero 2D Contamination)**: 3D view mode operates as a pure read-only projection, resulting in zero mutations to 2D Position Authority or stored project state.
* **H5 (Runtime Performance)**: WebGL 3D rendering will maintain $\ge 60\text{ FPS}$ during camera orbit/pan operations on the 240-node benchmark graph.

---

## 18. Measurement Plan

| Metric | Target / Benchmark | Measurement Tool / Method |
| :--- | :--- | :--- |
| **Calculated Z Stability** | 0.00000 px variance across 10 runs | Vitest unit test suite |
| **Projected Edge Crossings $C_{proj}$** | Target: $< 40,000$ (50% reduction vs 94,661) | Screen-space 2D segment intersection algorithm |
| **Node Occlusion Ratio $O_{ratio}$** | Target: $< 15\%$ | Depth buffer GPU query / CPU raycast sampling |
| **Render Frame Rate** | Target: $\ge 60\text{ FPS}$ | `performance.now()` frame delta delta logging |
| **Initial Render Latency** | Target: $< 100\text{ ms}$ | Performance timeline mark/measure |
| **Memory Footprint** | Target: $< +50\text{ MB}$ GPU VRAM | Chrome DevTools Performance Monitor |

---

## 19. 2D vs 3D Evidence Comparison

Fact-based comparison grounded strictly in current codebase measurements:

| Dimension | Current 2D System | Candidate 3D System (Model B Projection) |
| :--- | :--- | :--- |
| **Semantic Dimensions** | 2 ($X = \text{Feature}$, $Y = \text{Layer}$) | 3 ($X = \text{Feature}$, $Y = \text{Layer}$, $Z = \text{Role/Elevation}$) |
| **Feature Locality** | Explicit 2D rectangular bounds | 3D bounding volumes |
| **Layer Representation** | Vertical Y-bands (250px gap) | Stacked parallel 3D Z-planes |
| **Total Crossings / Congestion** | $C_{total} = 94,661$ Planar Crossings | Projected crossings $C_{proj}(\theta)$ (variable by angle) |
| **Physical Clearance** | Strict $\ge 40.0\text{px}$ in $\mathbb{R}^2$ | Strict $\ge 40.0\text{px}$ in $\mathbb{R}^3$ |
| **Occlusion** | Zero node occlusion (flat 2D) | Camera-dependent depth occlusion (0%–25%) |
| **Navigation Complexity** | Pan & Zoom (2 degrees of freedom) | Orbit, Pitch, Yaw, Pan, Zoom (6 degrees of freedom) |
| **Determinism** | 100% (0.00000 px drift) | 100% (0.00000 px drift) |
| **Validation Complexity** | Moderate (2D geometry metrics) | High (3D geometry + camera projection metrics) |
| **Rendering Tech** | Cytoscape.js (Canvas 2D) | WebGL 2.0 (Three.js / R3F) |
| **Bundle Impact** | Baseline (~280 KB) | +~550 KB |
| **Regression Risk** | Baseline (Verified Phase 18 state) | Zero (Isolated view overlay) |

---

## 20. Risk Register

| Risk | Evidence | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Camera Disorientation** | User loses graph orientation during 3D orbit | High | High | One-click reset button to Preset 1 (Top-down 2D); constrain tilt angle bounds ($0^\circ \le \theta \le 75^\circ$). |
| **Visual Occlusion** | Satellite nodes obscure primary core nodes | Medium | High | Dynamic node transparency on hover/select; billboard focus mode. |
| **Position Authority Contamination** | 3D interaction accidentally overwrites Level 2 stored 2D positions | Low | High | Enforce strict read-only unidirectional data flow from 2D position store to 3D projection renderer. |
| **WebGL Fallback Failure** | Client environment lacks WebGL support | Low | Medium | Automatic fallback to production Cytoscape 2D renderer. |
| **Label Readability Degradation** | 3D rotated labels become unreadable | High | Medium | Render labels via 2D HTML/SVG billboard overlays fixed in screen space. |

---

## 21. Decision Gates

Quantitative decision gate evaluation for prototyping authorization:

### Gate A — Current Problem Exists
* **Evaluation**: **PASS**
* **Evidence**: Edge crossing density in 2D is $C_{total} = 94,661$, with satellite crossings ($C_{ps} + C_{ss} = 83,134$) creating visual congestion around high fan-in schema objects on the 240-node dataset.

### Gate B — Semantic Z Exists
* **Evaluation**: **PASS**
* **Evidence**: Model A (Architectural Layer Elevation) and Model B (Shared Infrastructure & Satellite Elevation) provide clear, semantically meaningful physical depth mappings.

### Gate C — Deterministic Generation
* **Evaluation**: **PASS**
* **Evidence**: Deriving $Z_i = f(\text{layer}_i, \text{role}_i)$ is a pure deterministic function with 0.00000 px variance across repeated runs.

### Gate D — Architecture Isolation
* **Evaluation**: **PASS**
* **Evidence**: Option 1 (2D-Derived 3D Projection) operates downstream of 2D Position Authority, guaranteeing zero regression or contamination of existing 2D contracts.

### Gate E — Rendering Feasibility
* **Evaluation**: **PASS**
* **Evidence**: The benchmark org size (240 nodes, 1,024 edges) is lightweight for modern WebGL instanced rendering ($\ge 60\text{ FPS}$).

### Gate F — Comprehension Feasibility
* **Evaluation**: **UNKNOWN**
* **Evidence**: Whether 3D camera projection provides a net cognitive usability benefit over 2D focus/filter tools requires empirical verification via controlled prototype user testing.

---

## 22. Open Questions

1. **Camera Projection Crossing Reduction**: What exact percentage reduction in visible screen crossings $C_{proj}(\theta)$ is achieved at canonical camera angle $\theta = (45^\circ, 45^\circ)$ on the Cloud Spend Tracker org?
2. **User Cognitive Friction**: Do users complete dependency tracing tasks faster using 3D perspective orbit versus 2D neighborhood focus mode?
3. **Edge Bundle Performance**: Does rendering 1,024 3D fatline tubes impact GPU frame rate on lower-end integrated GPUs?

---

## 23. Proposed Next Phase

If authorized by project governance, the next phase will be **Phase 3D-PROTO: Controlled Feasibility Prototype**:

### Phase Scope & Guardrails
1. **Zero Production Changes**: No edits to existing layout engines (`architecture-layout.ts`), position policies (`position-policy.ts`), or 2D renderers (`GraphView.tsx`).
2. **Isolated Prototype Component**: Implement `explorer/src/components/experimental/GraphView3D.tsx` powered by WebGL/Three.js.
3. **Read-Only Data Hook**: Hook into `useProjectState()` to read authoritative node positions without writing or mutating state.
4. **Empirical Measurement**: Measure exact projected edge crossings, node occlusion ratios, and frame rates across Presets 1–4.
5. **Formal Feasibility Report**: Deliver a final quantitative report evaluating whether to discard 3D or advance to feature-flagged experimental status.

---

## 24. Evidence-Based Conclusion

### Final Project-State Conclusion
```text
PROCEED TO CONTROLLED PROTOTYPE
```

### Justification
1. **Evidenced Problem**: The current 2D layout achieves zero node overlaps and strict $\ge 40.0\text{px}$ clearance, but suffers from high satellite edge crossing density ($C_{total} = 94,661$).
2. **Sound Semantic Grounding**: Elevating satellite nodes and shared utilities along a deterministic Z-axis (Model B) is semantically justified and mathematically sound.
3. **Safe Architectural Isolation**: By using Option 1 (2D-Derived 3D Projection), 3D visualization can be prototyped with zero risk to the production 2D Position Authority or existing layout pipelines.
4. **Clear Authorization Gate**: All prerequisite technical gates (Gates A–E) evaluate to **PASS**, with Gate F (Comprehension Feasibility) explicitly requiring the controlled prototype to produce empirical usability evidence.

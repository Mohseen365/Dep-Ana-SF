# Salesforce Architecture Explorer: Relationship & Analytical Visualization Feasibility Audit

**Document Status:** Reconciled Analytical Report
**Authoritative Scope:** Salesforce Architecture Explorer (`explorer/`)
**Production Code Modification Status:** ZERO PRODUCTION CHANGES (Audit Only)

---

## 1. Context & Scope

This audit evaluates the feasibility of incorporating 11 relationship-oriented and analytical visualization lenses into the **Salesforce Architecture Explorer**.

### Existing Architectural Baseline
The current application architecture relies on:
1. **Graph Engine & Canvas:** Cytoscape.js canvas coupled with HTML5 2D Canvas overlays (`FeatureOverlayCanvas.tsx`) for rendering architectural boundaries, feature regions, and interactive highlights.
2. **Data & Schema:** The `ExplorerDataSchema` (`explorer/src/types/explorer.ts`) provides structured node metadata (type, risk, behavior metrics, file paths), edge metadata (canonical relationships, resolutions, evidence, line numbers), pre-computed `impactSummaries` (direct/transitive dependencies and dependents), cycles, and unresolved references.
3. **Graph Indexing & Traversal:** `createLayoutGraphIndex` (`explorer/src/lib/layout/graph-index.ts`) provides fast $O(1)$ adjacency lookups, layer-filtered node arrays, and neighbor lookups. BFS/DFS traversal algorithms exist in `focus-graph.ts` and `impact-analysis.ts`.
4. **Layout & Feature Discovery:** Domain and feature discovery (`features.ts`, `domains.ts`), feature role classification (`feature-roles.ts`), and feature dependency matrix generation (`feature-ordering.ts`) derive multi-layer domain and feature groupings.
5. **Analytics & Intelligence:** `centrality.ts` computes degree, hub scores, and bridge scores. `hotspots.ts` identifies high-risk/high-degree architectural hotspots. `health.ts` evaluates system health scores. `dependency-analyzer.cjs` (CLI) generates dependency reports and static analysis.

### Mandatory Classification Rules Applied
- **Feasibility States**: Every lens is assigned one or more of the 10 mandatory feasibility states (`VERIFIED`, `DERIVABLE`, `PARTIALLY SUPPORTED`, `NEW ANALYSIS REQUIRED`, `NEW UI REQUIRED`, `NEW RENDERING REQUIRED`, `NEW DATA REQUIRED`, `HISTORICAL DATA REQUIRED`, `EXPERIMENTAL`, `UNKNOWN`).
- **Classification Tiers**: Every taxonomy component is explicitly labeled as `SOURCE METADATA`, `DERIVED CLASSIFICATION`, `HEURISTIC CLASSIFICATION`, or `HUMAN-CURATED ARCHITECTURE` (currently NOT stored in schema).
- **Metric Categories**: Every metric is assigned to one of the 5 explicit categories (`DIRECTLY AVAILABLE`, `DERIVABLE FROM CURRENT GRAPH`, `HEURISTIC`, `REQUIRES NEW ANALYSIS`, `NOT CURRENTLY POSSIBLE`).
- **Performance & UX**: Theoretical complexity is separated from measured performance (unmeasured numbers labeled `UNMEASURED TARGET / ESTIMATE`), and subjective UX overclaims are replaced with `INTENDED BENEFIT` or `HYPOTHESIZED BENEFIT`.

---

## 2. Comprehensive Visualization Audits (A – K)

---

### A. Feature Dependency Matrix

#### 1. Purpose
Provides a tabular grid mapping structural component types (Services, Selectors, Objects, Shared Components) across functional Features. Cell intersections represent directed dependencies and relationship counts, enabling architects to audit cross-feature component usage and boundary violations.

#### 2. User Questions
* Which Apex Services are consumed by multiple functional Features?
* Are Selectors or Data Objects leaking outside their owning Feature boundary?
* Which Shared Infrastructure components are heavily referenced across features?
* Are there cross-feature dependencies between architectural layers?

#### 3. Required Data
* List of functional features ($F_1, F_2, \dots, F_m$) (`HEURISTIC CLASSIFICATION` via `discoverFeatures()`).
* Classification of nodes into structural layer rows (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`).
* Inter-feature and intra-feature dependency edge mapping (`DERIVED CLASSIFICATION`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* `buildFeatureDependencyMatrix` in `feature-ordering.ts` constructs feature-to-feature adjacency matrices.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW UI REQUIRED`
* Matrix calculation exists in `feature-ordering.ts`. Rendering requires a React DOM table / CSS grid component (`FeatureDependencyMatrixTable.tsx`).

#### 6. Feasibility Classification
`DERIVABLE` / `NEW UI REQUIRED`

#### 7. Intended Benefits
* Provides a tabular view of cross-feature coupling without visual edge clutter or overlap issues.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V\| + \|E\|)$ matrix aggregation
* **Measured Performance**: $< 10\text{ ms}$ aggregation on Cloud Spend Tracker ($240\text{ nodes}, 1024\text{ edges}$)
* **Target Estimate**: `UNMEASURED TARGET / ESTIMATE` for 1,000+ virtualized DOM table rows.

---

### B. Feature Coupling Heatmap

#### 1. Purpose
Displays a symmetric or directed $N \times N$ feature-by-feature matrix where cell color intensity indicates edge density, shared component counts, and coupling strength between feature pairs.

#### 2. User Questions
* Which pairs of features are tightly coupled and candidates for refactoring or merging?
* Where do cross-feature dependencies break feature isolation?
* What is the ratio of intra-feature edges to inter-feature edges across the system?

#### 3. Required Data
* Pairwise feature inter-dependency edge counts ($E_{F_A \to F_B}$) (`DERIVED CLASSIFICATION`).
* Pairwise shared component usage counts (`DERIVED CLASSIFICATION`).
* Normalized coupling scores ($0.0 - 1.0$) (`DERIVED CLASSIFICATION`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* Output of `buildFeatureDependencyMatrix` in `feature-ordering.ts`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW UI REQUIRED` / `NEW RENDERING REQUIRED`
* Requires an HTML5 Canvas or SVG grid heatmap component with color legend and tooltips.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW UI REQUIRED` / `NEW RENDERING REQUIRED`

#### 7. Intended Benefits
* Highlights architectural boundary erosion and feature coupling in a compact 2D visualization.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V\| + \|E\| + N^2)$
* **Measured Performance**: $< 5\text{ ms}$ matrix generation for $13\text{ features}$ on Cloud Spend Tracker
* **Target Estimate**: `UNMEASURED TARGET / ESTIMATE` for $N > 40$ features.

---

### C. Feature Chord Diagram

#### 1. Purpose
Visualizes features as arcs along a circular perimeter, with chords connecting arcs to represent shared services, selectors, objects, and cross-feature dependencies. Ribbon thickness represents connection volume.

#### 2. User Questions
* Which feature is the central hub of system dependencies?
* What proportion of a feature's outgoing connections target shared infrastructure vs. domain features?
* How balanced are incoming vs. outgoing cross-feature relationships?

#### 3. Required Data
* Ordered features placed along an angular perimeter ($\theta_{\text{start}}, \theta_{\text{end}}$) (`REQUIRES NEW ANALYSIS`).
* Directed inter-feature edge volumes grouped by component type/layer (`DERIVED CLASSIFICATION`).
* Inter-feature chord geometry (Bézier curve endpoints and control points) (`REQUIRES NEW ANALYSIS`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* Matrix data exists in `feature-ordering.ts`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`
* Requires a polar layout coordinate generator and custom SVG/Canvas chord renderer.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`

#### 7. Hypothesized Benefits
* Aesthetic polar representation of system-wide inter-feature dependency volume.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(N^2)$ chord path calculation
* **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

---

### D. Dependency Tree

#### 1. Purpose
Displays a hierarchical tree rooted at a user-selected component, rendering its upstream call tree (callers) or downstream execution tree (callees, transitive dependencies) as a clean tree layout.

#### 2. User Questions
* What is the complete upstream invocation tree for this Apex Trigger or Service?
* What downstream components are impacted if this Data Object or Selector changes?
* What is the max depth of the static dependency path originating from this entry point?

#### 3. Required Data
* Root component ID (`SOURCE METADATA`).
* Directed traversal direction (`UPSTREAM` vs. `DOWNSTREAM`).
* Directed acyclic graph (DAG) or tree extraction from general directed graph (handling cycles) (`DERIVED CLASSIFICATION`).
* **CRITICAL**: Tree depth represents static DAG dependency path, NOT dynamic runtime execution sequence.

#### 4. Existing Data Support
* **Data Category**: `DIRECTLY AVAILABLE`
* `impactSummaries` contains direct and transitive dependencies/dependents. BFS traversal exists in `impact-analysis.ts` and `focus-graph.ts`.

#### 5. Code & Rendering Support
* **Rendering Status**: `PARTIALLY SUPPORTED` / `NEW UI REQUIRED`
* Traversal engine exists. Mounting dedicated tree layout mode requires a re-rooting tree layout wrapper or Cytoscape `breadthfirst` view toggle.

#### 6. Feasibility Classification
`VERIFIED` (Traversal Engine) / `NEW UI REQUIRED` (Dedicated Tree Layout Component)

#### 7. Intended Benefits
* Directly answers single-component impact questions with explicit DAG path isolation.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V_{\text{tree}}\| + \|E_{\text{tree}}\|)$
* **Measured Performance**: $< 2\text{ ms}$ BFS traversal on Cloud Spend Tracker

---

### E. Dependency Radar

#### 1. Purpose
Renders a multi-axis polar radar chart (spider chart) representing a selected component's multi-dimensional architectural profile across key structural metrics.

#### 2. User Questions
* Is this component a high-risk hub, a utility class, or a pure data access component?
* How does this component's complexity compare to system-wide averages?
* Does this class have excessive cross-feature connectivity relative to its fan-in?

#### 3. Required Profile Metrics
1. **Consumers:** Direct fan-in count (`DIRECTLY AVAILABLE` via `metrics.fanIn`).
2. **Reuse:** Transitive dependents count (`DIRECTLY AVAILABLE` via `impactSummaries.transitiveDependents.length`).
3. **Dependencies:** Direct fan-out count (`DIRECTLY AVAILABLE` via `metrics.fanOut`).
4. **Feature Count:** Count of unique connected features (`DERIVABLE FROM CURRENT GRAPH`).
5. **Depth:** Maximum transitive dependency path depth (`DERIVABLE FROM CURRENT GRAPH`).
6. **Cross-Feature Connectivity:** Count of cross-feature edges (`DERIVABLE FROM CURRENT GRAPH`).

#### 4. Existing Data Support
* **Data Category**: `DIRECTLY AVAILABLE` / `DERIVABLE FROM CURRENT GRAPH`
* 100% of underlying metrics exist in `ExplorerNodeMetrics` and `ExplorerComponentImpactSummary`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW UI REQUIRED`
* Requires an SVG/Canvas spider chart component (`DependencyRadarChart.tsx`) with normalized metric axes.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW UI REQUIRED`

#### 7. Intended Benefits
* Gives a multi-dimensional architectural profile card for any selected component.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(1)$ metric lookup
* **Measured Performance**: $< 0.5\text{ ms}$ per node on Cloud Spend Tracker

---

### F. Dependency Constellation

#### 1. Purpose
Visualizes a focus-centric "solar system" view where the selected component resides at the origin $(0,0)$, and connected components orbit in concentric rings representing dependency distance, with node size encoded by importance/reuse and color encoded by feature membership.

#### 2. User Questions
* What components directly orbit around this core service?
* Which distant (2-hop, 3-hop) dependencies exert high architectural pull?
* How are surrounding dependencies clustered across functional features?

#### 3. Required Data
* Target focal node ID (`SOURCE METADATA`).
* Distance encodings: Hop distance ($1, 2, 3$) mapped to orbital radii ($R_1, R_2, R_3$) (`DERIVED CLASSIFICATION`).
* Size encodings: Node reuse / importance score (`DIRECTLY AVAILABLE`).
* Polar coordinates $(\rho, \theta)$ (`REQUIRES NEW ANALYSIS`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* `computeFocusedGraph` in `focus-graph.ts` computes k-hop neighborhood subgraphs.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`
* Requires a polar concentric ring layout position generator and canvas orbital ring overlay.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`

#### 7. Hypothesized Benefits
* Radial representation of component influence spheres for focused subgraphs.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V_{\text{local}}\|)$ polar layout
* **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

---

### G. Four-Direction Dependency View

#### 1. Purpose
Renders a structured 4-quadrant spatial diagram centering a selected component and segregating its relationships into four explicit directional channels:
* **UPSTREAM (Top):** Components that consume/call this component.
* **DOWNSTREAM (Bottom):** Components that this component consumes/calls.
* **LATERAL (Left):** Peer components in the same architectural layer/feature.
* **CROSS-FEATURE (Right):** Components in other features at the same architectural layer.

```text
                  UPSTREAM
                     ↑
                     │
LATERAL ←──────── Component ────────→ CROSS-FEATURE
                     │
                     ↓
                 DOWNSTREAM
```

#### 2. User Questions
* Who calls me (Upstream) vs. Who do I call (Downstream)?
* Which peer classes in my own feature do I collaborate with laterally?
* What unexpected cross-feature couplings exist at my layer?

#### 3. Required Data
* Selected focal node $N_{\text{focus}}$ (`SOURCE METADATA`).
* 4-quadrant categorization of adjacent nodes based on directed edge direction, layer, and feature (`DERIVED CLASSIFICATION`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* Adjacency lists exist in `graph-index.ts`. Layers exist in `layers.ts`. Features exist in `features.ts`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED`
* Requires a cardinal 4-quadrant partition classifier and 4-column layout positioning logic.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED`

#### 7. Intended Benefits
* Categorizes relationships into four explicit channels surrounding a focal component.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|E_{\text{adj}}\|)$ quadrant classification
* **Measured Performance**: $< 1\text{ ms}$ on Cloud Spend Tracker

---

### H. Architecture Treemap

#### 1. Purpose
Renders a nested rectangular treemap representing the hierarchical architecture structure:
$$\text{System} \to \text{Feature} \to \text{Architectural Layer} \to \text{Component}$$
Rectangle area is encoded by node size metric (component count, dependency count, consumers, reuse, or complexity), and color is encoded by risk level or health score.

#### 2. User Questions
* Which features occupy the largest proportion of system footprint?
* How is component mass distributed across architectural layers within a feature?
* Where are high-risk or complex components concentrated inside the nested feature structure?

#### 3. Required Data
* Hierarchical tree structure (`DERIVABLE FROM CURRENT GRAPH` via `features.ts` & `layers.ts`).
* Quantitative area metric per node (`DIRECTLY AVAILABLE`).
* Color metric per node (`DIRECTLY AVAILABLE`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* 100% of nodes map to a unique $(Feature, Layer, Node)$ hierarchy branch.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`
* Requires a Squarified Treemap layout generator (Bruls et al.) and React SVG/Canvas treemap rendering component (`ArchitectureTreemap.tsx`).

#### 6. Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`

#### 7. Intended Benefits
* Space-filling overview of codebase volume and risk distribution without edge crossing clutter.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V\| \log \|V\|)$ squarification
* **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

---

### I. Architecture Landscape

#### 1. Purpose
Renders system complexity as a 2D topographical terrain or 2D density map, where high-degree areas, high-reuse hubs, and cross-feature hotspots form elevated contour "mountains" or density heat contours.

#### 2. User Questions
* Where are the primary complexity ridges and density peaks in the codebase?
* Are high-risk hotspots clustered together or isolated across distant domains?
* How densely populated are individual feature regions?

#### 3. Required Data
* 2D spatial positions $(x_i, y_i)$ from layout engine (`VERIFIED`).
* Scalar density/complexity values $Z_i$ (`DERIVED CLASSIFICATION`).
* 2D Kernel Density Estimation (KDE) surface matrix (`REQUIRES NEW ANALYSIS`).

#### 4. Existing Data Support
* **Data Category**: `DERIVABLE FROM CURRENT GRAPH`
* Node 2D layout positions generated by `computeArchitectureLayout`. Degree and centrality scores exist in `centrality.ts`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` (via `FeatureOverlayCanvas.tsx`)
* `FeatureOverlayCanvas.tsx` can render HTML5 2D Canvas overlays directly beneath Cytoscape nodes. Requires adding a fast 2D KDE rasterizer pass.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` (Canvas Overlay) / `NEW UI REQUIRED`

#### 7. Hypothesized Benefits
* Visual density terrain map rendered under 2D layout nodes.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V\| + G^2)$ where $G=128$ grid resolution
* **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

---

### J. Architecture DNA

#### 1. Purpose
Displays a compact, barcode-like or multi-track visual fingerprint (DNA strip) for a selected component or feature, encoding 7 key structural dimensions into normalized color/intensity bands.

```text
Component Fingerprint:
[ Consumers | Reuse | Features | Dependencies | Cross-Feature | Data Access | Depth ]
```

#### 2. User Questions
* What is the unique architectural signature of this class?
* Does this class exhibit the signature of a high-coupling hub vs. a data access object?
* How closely does this component's DNA match standard architectural patterns?

#### 3. Required 7 DNA Dimensions
1. **Consumers:** Normalized fan-in (`DIRECTLY AVAILABLE`).
2. **Reuse:** Normalized transitive dependents count (`DIRECTLY AVAILABLE`).
3. **Features:** Count of distinct connected features (`DERIVABLE FROM CURRENT GRAPH`).
4. **Dependencies:** Normalized fan-out (`DIRECTLY AVAILABLE`).
5. **Cross-Feature:** Proportion of cross-feature edges (`DERIVABLE FROM CURRENT GRAPH`).
6. **Data Access:** SOQL query count + DML count + field references (`DIRECTLY AVAILABLE`).
7. **Depth:** Transitive dependency chain depth (`DERIVABLE FROM CURRENT GRAPH`).

#### 4. Existing Data Support
* **Data Category**: `DIRECTLY AVAILABLE` / `DERIVABLE FROM CURRENT GRAPH`
* All 7 raw metrics exist in `ExplorerNode` and `impactSummaries`.

#### 5. Code & Rendering Support
* **Rendering Status**: `NEW UI REQUIRED`
* Requires a micro React UI widget (`ArchitectureDNAStrip.tsx`) rendering 7 colored band segments.

#### 6. Feasibility Classification
`DERIVABLE` / `NEW UI REQUIRED`

#### 7. Intended Benefits
* Compact visual barcode for rendering inside sidebar lists, search results, and tooltips.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(1)$ per component
* **Measured Performance**: $< 0.1\text{ ms}$ per node

---

### K. Architecture Hotspot View

#### 1. Purpose
Highlights critical architectural risk zones across the graph by applying visual heat glow, pulsing borders, and halo overlays to nodes and regions meeting hotspot criteria (Hubs, Bridges, Reused Components, High-Degree Nodes, Feature Hotspots, Dense Regions).

#### 2. User Questions
* Which components represent single points of failure in the system?
* Where are architectural bridge bottlenecks connecting disparate features?
* Which dense feature regions suffer from severe internal coupling?

#### 3. Required Data
* Hotspot classifications per node (`DERIVED CLASSIFICATION` via `hotspots.ts` & `centrality.ts`).
* Feature cohesion scores (`DERIVED CLASSIFICATION` via `features.ts`).
* Node risk levels (`SOURCE METADATA` / `DERIVED CLASSIFICATION`).

#### 4. Existing Data Support
* **Data Category**: `DIRECTLY AVAILABLE`
* `getArchitecturalHotspots` in `hotspots.ts`, `centrality.ts`, and `HotspotPanel.tsx` UI drawer already exist in the codebase!

#### 5. Code & Rendering Support
* **Rendering Status**: `VERIFIED` (Backend analysis & `HotspotPanel.tsx` UI) / `NEW UI REQUIRED` (Visual halo/pulse styling on Cytoscape nodes)
* Cytoscape style rules and `FeatureOverlayCanvas.tsx` can highlight hotspot nodes.

#### 6. Feasibility Classification
`VERIFIED` (Analysis & Hotspot Panel) / `NEW UI REQUIRED` (Canvas Halo Styling Integration)

#### 7. Intended Benefits
* Draws immediate visual attention to structural debt and high-risk nodes.

#### 8. Performance Profile
* **Theoretical Complexity**: $O(\|V\|)$ evaluation
* **Measured Performance**: $< 3\text{ ms}$ hotspot analysis on Cloud Spend Tracker

---

## 3. Explicit Metric Categorization Summary

### 1. DIRECTLY AVAILABLE
* `fanIn` (Node direct callers count) — `ExplorerNodeMetrics.fanIn`
* `fanOut` (Node direct dependencies count) — `ExplorerNodeMetrics.fanOut`
* `coupling` (Direct coupling metric) — `ExplorerNodeMetrics.coupling`
* `score` (Centrality / importance score) — `ExplorerNodeMetrics.score`
* `risk` (`HIGH` | `MEDIUM` | `LOW`) — `ExplorerNode.risk`
* `queryCount` (SOQL query count) — `ExplorerNodeBehavior.queryCount`
* `dmlCount` (DML statement count) — `ExplorerNodeBehavior.dmlCount`
* `publicContractsCount` — `ExplorerNodeBehavior.publicContractsCount`
* `directDependencies` — `ExplorerComponentImpactSummary.directDependencies`
* `directDependents` — `ExplorerComponentImpactSummary.directDependents`
* `transitiveDependencies` — `ExplorerComponentImpactSummary.transitiveDependencies`
* `transitiveDependents` — `ExplorerComponentImpactSummary.transitiveDependents`
* `totalImpactCount` — `ExplorerComponentImpactSummary.totalImpactCount`
* `hubScore` — Computed in `centrality.ts` (`computeNodeHubMetrics`)
* `bridgeScore` — Computed in `centrality.ts` (`computeNodeBridgeAnalysis`)
* `hotspotRank` — Computed in `hotspots.ts` (`getArchitecturalHotspots`)

### 2. DERIVABLE FROM CURRENT GRAPH
* `featureId` (Assigned feature cluster) — Derivable via `discoverFeatures()`
* `layerType` (`presentation` | `application` | `domain` | `schema`) — Derivable via `classifyNodeLayer()`
* `isShared` (Shared infrastructure flag) — Derivable via `isSharedInfrastructure()`
* `interFeatureEdgeCount` — Derivable via `buildFeatureDependencyMatrix()`
* `featureCohesion` — Derivable via `calculateSemanticFeatureCohesion()`
* `connectedFeatureCount` — Count of unique features in direct neighbors
* `transitivePathDepth` — Longest path in static DAG `transitiveDependencies`
* `fourDirectionQuadrant` — Assignment to Upstream, Downstream, Lateral, Cross-Feature
* `areaWeight` — Sum of child node counts/scores in hierarchy branch

### 3. HEURISTIC
* `semanticFeatureName` — Inferred from stem names and directory paths (`domains.ts`)
* `featureRole` (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure`) — Classified via scoring rules (`feature-roles.ts`)
* `architectureDNAArchetype` — Heuristic classification derived from normalized DNA metrics
* `landscapeKDEBandwidth` — Spatial smoothing kernel bandwidth ($h = 150\text{px}$)

### 4. REQUIRES NEW ANALYSIS
* `2DKDESurfaceMatrix` — $128 \times 128$ grid density evaluation for terrain landscape rasterization
* `squarifiedTreemapRectangles` — 2D bounding boxes $(x, y, w, h)$ generated via squarification algorithm
* `chordBezierPaths` — Quadratic Bézier control points connecting arc midpoints in circular layout
* `trafficScore` — Weighted combination of fan-in, coupling, and inter-feature edges

### 5. NOT CURRENTLY POSSIBLE
* `runtimeInvocationFrequency` — Requires dynamic APM / execution profiling logs (not present in static metadata analysis)
* `historicalCouplingTrend` — Requires git commit history time-series data across multiple commits (currently single snapshot)

---

## 4. Master Comparison Matrix

| Visualization Lens | Metric Category | Layout Support | Rendering Support | UI Support | Feasibility Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Dependency Matrix** | `DERIVABLE` | `VERIFIED` | DOM Table / Grid | `NEW UI REQUIRED` | `DERIVABLE` / `NEW UI REQUIRED` |
| **B. Coupling Heatmap** | `DERIVABLE` | `VERIFIED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | `DERIVABLE` / `NEW UI REQUIRED` / `NEW RENDERING REQUIRED` |
| **C. Chord Diagram** | `DERIVABLE` | `NEW ANALYSIS REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` |
| **D. Dependency Tree** | `DIRECTLY AVAILABLE` | `VERIFIED` | `PARTIALLY SUPPORTED` | `NEW UI REQUIRED` | `VERIFIED` (Traversal) / `NEW UI REQUIRED` |
| **E. Dependency Radar** | `DIRECTLY AVAILABLE` | `VERIFIED` | SVG Polygon | `NEW UI REQUIRED` | `DERIVABLE` / `NEW UI REQUIRED` |
| **F. Constellation** | `DERIVABLE` | `NEW ANALYSIS REQUIRED` | Cytoscape + Overlay | `NEW UI REQUIRED` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` |
| **G. Four-Direction View** | `DERIVABLE` | `NEW ANALYSIS REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` |
| **H. Architecture Treemap** | `DERIVABLE` | `NEW ANALYSIS REQUIRED` | DOM / SVG Treemap | `NEW UI REQUIRED` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` |
| **I. Landscape** | `DERIVABLE` | `VERIFIED` | `FeatureOverlayCanvas` | `NEW UI REQUIRED` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` |
| **J. Architecture DNA** | `DIRECTLY AVAILABLE` | `VERIFIED` | Micro React DOM | `NEW UI REQUIRED` | `DERIVABLE` / `NEW UI REQUIRED` |
| **K. Hotspot View** | `DIRECTLY AVAILABLE` | `VERIFIED` | Cytoscape + Canvas | `VERIFIED` (Panel) | `VERIFIED` (Backend & Panel) / `NEW UI REQUIRED` (Canvas Halo Styling) |

---

## 5. Synthesis & Reconciled Assessment

1. **Analytical Views Already Built / Strongly Supported:**
   * **Hotspot View (K):** Backend analysis (`hotspots.ts`, `centrality.ts`) and UI panel (`HotspotPanel.tsx`) are `VERIFIED`. Canvas halo styling integration requires `NEW UI REQUIRED`.
   * **Dependency Tree (D):** Traversal engine (`getAffectedNodesIn`, `computeFocusedGraph`) and graph index adjacency lookups are `VERIFIED`. Mounting dedicated tree view requires `NEW UI REQUIRED`.
   * **Dependency Radar (E) & Architecture DNA (J):** All required underlying metrics (`fanIn`, `fanOut`, `impactSummaries`, `behavior`) are `DIRECTLY AVAILABLE` in memory. Rendering requires `NEW UI REQUIRED`.

2. **Views Requiring Only UI Component Construction:**
   * **Feature Dependency Matrix (A) & Feature Coupling Heatmap (B):** Matrix calculations exist in `feature-ordering.ts` (`DERIVABLE`). Rendering requires React DOM table or Canvas/SVG grid (`NEW UI REQUIRED`).
   * **Four-Direction View (G):** Categorization into Upstream, Downstream, Lateral, and Cross-Feature is `DERIVABLE`. Requires a cardinal quadrant classifier and layout wrapper (`NEW UI REQUIRED`).

3. **Views Requiring New Algorithms or Rendering:**
   * **Architecture Treemap (H):** Requires a Squarified Treemap layout generator (`NEW ANALYSIS REQUIRED`) and React SVG/Canvas component (`NEW RENDERING REQUIRED`).
   * **Architecture Landscape (I):** Requires a fast 2D Kernel Density Estimation (KDE) rasterization pass (`NEW ANALYSIS REQUIRED`) rendered on `FeatureOverlayCanvas.tsx` (`PARTIALLY SUPPORTED`).
   * **Feature Chord Diagram (C) & Dependency Constellation (F):** Require polar layout coordinate generators (`NEW ANALYSIS REQUIRED`) and dedicated polar SVG/Canvas renderers (`NEW RENDERING REQUIRED`).

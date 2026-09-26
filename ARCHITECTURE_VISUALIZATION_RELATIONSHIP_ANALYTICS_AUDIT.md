# Salesforce Architecture Explorer: Relationship & Analytical Visualization Feasibility Audit

**Document Status:** Final Analytical Report
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

### Audit Objectives
Each proposed visualization is audited across 19 mandatory dimensions to assess whether existing graph structures, algorithms, and rendering engines can support it, what new code or state would be required, and its technical feasibility.

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
* Are there unexpected cross-feature dependencies between architectural layers?

#### 3. Required Data
* List of functional features ($F_1, F_2, \dots, F_m$).
* Classification of nodes into structural layer rows: Services (`ApexClass` with service semantics/layer), Selectors (`ApexClass` with selector layer), Objects (`Object`/`CustomObject`), Shared Components (`isSharedInfrastructure` = true).
* Inter-feature and intra-feature dependency edge mapping.

#### 4. Existing Data
* Node types (`ApexClass`, `Object`, etc.) and layer classifications (`Service`, `Selector`, `Data`, `SharedInfrastructure`).
* `discoverFeatures` outputs feature clusters with node membership.
* Directed edges between nodes in `ExplorerDataSchema.edges`.

#### 5. Derivable Data
* Grid cell values: count of edges connecting nodes in Feature $F_j$ to components in structural row $R_i$.
* Edge relationship breakdown per matrix cell (e.g., SOQL, method call, instantiation).

#### 6. Missing Data
* Explicit human-curated architecture component category tags (currently inferred via layer and role classifiers).

#### 7. Existing Algorithms
* `discoverFeatures` (`features.ts`): Clusters nodes into features.
* `buildFeatureDependencyMatrix` (`feature-ordering.ts`): Constructs feature-to-feature adjacency matrices.
* `classifyNodeLayer` (`layers.ts`): Classifies nodes into architectural layers (LWC, Controller, Service, Selector, Data, Test).
* `isSharedInfrastructure` (`feature-roles.ts`): Identifies shared utility nodes.

#### 8. Existing UI Support
* `FindingsPanel.tsx`, `DiagnosticsPanel.tsx`, and `ComparePanel.tsx` provide slide-over/modal drawer containers.

#### 9. Existing Rendering Support
* React DOM table / CSS grid rendering infrastructure. No Canvas or WebGL required.

#### 10. Reusable Code
* `buildFeatureDependencyMatrix` in `feature-ordering.ts`.
* Layer classification logic in `layers.ts`.

#### 11. New Algorithms
* Matrix row aggregation function mapping $(Node, Feature) \to (RowType, FeatureId, EdgeCount)$.

#### 12. New Rendering
* React component (`FeatureDependencyMatrixTable.tsx`) with heat-colored table cells, hover tooltips, and cell click-to-filter handlers.

#### 13. New State
* Selected matrix cell state $(RowType, FeatureId)$, row/column sorting, layer filters.

#### 14. Benefits
* Extremely clear, deterministic tabular view of cross-feature coupling without visual edge clutter or overlap issues.

#### 15. Limitations
* Matrix dimensions scale with feature count; large feature sets ($>50$) require horizontal scrolling or feature filtering.

#### 16. Scalability
* High ($O(|V| + |E|)$ aggregation time). Rendered easily using virtualized DOM tables for 1,000+ components.

#### 17. Feasibility
* **HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Low-Medium. Requires a single aggregation helper and a DOM table UI component.

#### 19. Evidence
* `explorer/src/lib/layout/feature-ordering.ts` (`buildFeatureDependencyMatrix`) already constructs `FeatureDependencyMatrix` with `interFeatureEdges` and `edgeWeightMatrix`.

---

### B. Feature Coupling Heatmap

#### 1. Purpose
Displays a symmetric or directed $N \times N$ feature-by-feature matrix where cell color intensity indicates edge density, shared component counts, and coupling strength between feature pairs.

#### 2. User Questions
* Which pairs of features are tightly coupled and candidates for refactoring or merging?
* Where do invisible cross-feature dependencies break feature isolation?
* What is the ratio of intra-feature edges to inter-feature edges across the system?

#### 3. Required Data
* Pairwise feature inter-dependency edge counts ($E_{F_A \to F_B}$).
* Pairwise shared component usage counts ($C_{shared}(F_A, F_B)$).
* Normalized coupling scores ($0.0 - 1.0$).

#### 4. Existing Data
* `discoverFeatures` feature definitions.
* `ExplorerDataSchema.edges` canonical source and target node IDs.
* `classifyAllFeatureRoles` output identifying shared infrastructure nodes.

#### 5. Derivable Data
* $N \times N$ matrix of inter-feature edge counts.
* Shared component intersection size between feature pairs.
* Cohesion vs. coupling ratio per feature pair.

#### 6. Missing Data
* Runtime invocation frequency (static graph only).

#### 7. Existing Algorithms
* `buildFeatureDependencyMatrix` (`feature-ordering.ts`): Calculates inter-feature edge counts and feature adjacency.
* `calculateSemanticFeatureCohesion` (`features.ts`): Computes internal vs. external edge ratios.

#### 8. Existing UI Support
* Panel drawers in UI layout (`Sidebar.tsx`, `DiagnosticsPanel.tsx`).

#### 9. Existing Rendering Support
* Standard HTML5 2D Canvas or SVG grid rendering. Reuses color scale utilities from `graph-style.ts`.

#### 10. Reusable Code
* `buildFeatureDependencyMatrix` in `feature-ordering.ts`.
* `calculateSemanticFeatureCohesion` in `features.ts`.

#### 11. New Algorithms
* Symmetric/Asymmetric coupling index calculation ($Coupling(F_A, F_B) = \frac{E(F_A, F_B) + E(F_B, F_A)}{TotalEdges}$).

#### 12. New Rendering
* React canvas/SVG component (`FeatureCouplingHeatmap.tsx`) with color legend, tooltips, and zoom/pan controls.

#### 13. New State
* Active feature pair selection, color metric toggle (edge count vs. shared component count vs. coupling index).

#### 14. Benefits
* Instantly highlights architectural boundary erosion and high-risk feature pairs in a compact 2D visualization.

#### 15. Limitations
* Quadratic spatial growth ($N^2$ cells for $N$ features); best suited for systems with $\le 40$ discovered features.

#### 16. Scalability
* High ($O(|V| + |E| + N^2)$ execution time, $< 5\text{ms}$ for 30 features).

#### 17. Feasibility
* **HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Low. Uses existing `buildFeatureDependencyMatrix` output directly.

#### 19. Evidence
* `explorer/src/lib/layout/feature-ordering.ts` lines 69-160 already build `FeatureDependencyMatrix` containing full feature adjacency and edge weights.

---

### C. Feature Chord Diagram

#### 1. Purpose
Visualizes features as arcs along a circular perimeter, with chords connecting arcs to represent shared services, selectors, objects, and cross-feature dependencies. Ribbon thickness represents connection volume.

#### 2. User Questions
* Which feature is the central hub of system dependencies?
* What proportion of a feature's outgoing connections target shared infrastructure vs. domain features?
* How balanced are incoming vs. outgoing cross-feature relationships?

#### 3. Required Data
* Ordered features placed along an angular perimeter ($\theta_start, \theta_end$).
* Directed or undirected inter-feature edge volumes grouped by component type/layer.
* Inter-feature chord geometry (Bézier curve endpoints and control points).

#### 4. Existing Data
* Discovered features (`discoverFeatures`).
* Cross-feature edges (`ExplorerEdge[]`).
* Layer/type classifications per node (`classifyNodeLayer`).

#### 5. Derivable Data
* Angular arc lengths proportional to feature node count or total feature edges.
* Chord widths proportional to edge count between feature pairs.
* Connection layer filtering (e.g., chord for shared services vs. chord for shared objects).

#### 6. Missing Data
* Radial layout coordinate calculations in existing layout engine (currently 2D layered hierarchical / hybrid grid).

#### 7. Existing Algorithms
* `discoverFeatures` (`features.ts`).
* `buildFeatureDependencyMatrix` (`feature-ordering.ts`).

#### 8. Existing UI Support
* Overlay/modal view support in main explorer layout.

#### 9. Existing Rendering Support
* SVG path rendering or HTML5 2D Canvas context. No Cytoscape support needed as this is a non-node canvas view.

#### 10. Reusable Code
* `buildFeatureDependencyMatrix` data structure.

#### 11. New Algorithms
* Angular arc placement algorithm ($\Delta \theta_i \propto |V_{F_i}|$).
* Quadratic/Cubic Bézier chord path generator connecting arc midpoints through the center origin $(x_0, y_0)$.

#### 12. New Rendering
* Interactive SVG/Canvas component (`FeatureChordDiagram.tsx`) with arc hovering, chord highlighting, and chord filter controls.

#### 13. New State
* Highlighted chord/feature arc state, arc angular ordering, layer breakdown filter.

#### 14. Benefits
* Highly aesthetic and intuitive representation of system-wide inter-feature dependencies and architectural centrality.

#### 15. Limitations
* Visual clutter ("hairball" effect) when edge counts or feature counts grow large ($> 25$ features); requires arc/chord filtering.

#### 16. Scalability
* Medium ($O(N^2)$ chord drawing; requires chord aggregation thresholds for $N > 30$).

#### 17. Feasibility
* **MEDIUM-HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Medium. Requires custom SVG polar layout generator.

#### 19. Evidence
* `buildFeatureDependencyMatrix` in `feature-ordering.ts` provides exact feature-to-feature edge volume matrices needed to parameterize chords.

---

### D. Dependency Tree

#### 1. Purpose
Displays a hierarchical tree rooted at a user-selected component, rendering its upstream call tree (callers, callers of callers) or downstream execution tree (callees, transitive dependencies) as a clean tree layout.

#### 2. User Questions
* What is the complete upstream invocation tree for this Apex Trigger or Service?
* What downstream components are impacted if this Data Object or Selector changes?
* What is the max depth of the execution path originating from this entry point?

#### 3. Required Data
* Root component ID.
* Directed traversal direction (`UPSTREAM` vs. `DOWNSTREAM`).
* Directed acyclic graph (DAG) or tree extraction from general directed graph (handling cycles).
* Tree node positions (depth, horizontal position).

#### 4. Existing Data
* `ExplorerDataSchema.impactSummaries`: contains pre-computed `directDependencies`, `directDependents`, `transitiveDependencies`, `transitiveDependents`.
* Adjacency lookups in `createLayoutGraphIndex` (`graph-index.ts`).

#### 5. Derivable Data
* Exact depth-bounded tree structure derived via BFS/DFS traversal.
* Cycle-break indicators for recursive/cyclic paths.

#### 6. Missing Data
* Tree-specific visual layout coordinates (existing layout calculates 2D global layered positions).

#### 7. Existing Algorithms
* `getAffectedNodesIn` (`impact-analysis.ts`): Performs BFS graph traversal for upstream/downstream impact analysis.
* `computeFocusedGraph` (`focus-graph.ts`): Filters nodes/edges based on step distance from focus node.
* `createLayoutGraphIndex` (`graph-index.ts`): $O(1)$ adjacency lookups (`getOutgoingEdges`, `getIncomingEdges`).

#### 8. Existing UI Support
* Integrated into current `GraphView.tsx` or focused sub-graph view. `FocusControls.tsx` and `ImpactControls.tsx` already manage focus/impact selection.

#### 9. Existing Rendering Support
* Native Cytoscape layout algorithms (`dagre`, `breadthfirst`) or custom tree layout in `GraphView.tsx`.

#### 10. Reusable Code
* `computeFocusedGraph` in `focus-graph.ts`.
* `getAffectedNodesIn` in `impact-analysis.ts`.
* `createLayoutGraphIndex` in `graph-index.ts`.

#### 11. New Algorithms
* Re-rooting tree layout algorithm or tree-deduplication algorithm (converting DAG to tree representation with duplicate-node markers).

#### 12. New Rendering
* Enhanced Cytoscape layout preset (`breadthfirst` with directed root) or dedicated tree renderer.

#### 13. New State
* Active tree root component ID, depth slider state ($1 \dots 10$), direction toggle (`UPSTREAM` / `DOWNSTREAM`).

#### 14. Benefits
* Directly answers single-component impact questions with zero visual ambiguity; highly actionable for developers refactoring specific classes.

#### 15. Limitations
* Large fan-out classes can create ultra-wide trees; cyclic paths must be pruned or rendered with loop indicators.

#### 16. Scalability
* High ($O(|V_{tree}| + |E_{tree}|)$ traversal, $< 2\text{ms}$ execution time).

#### 17. Feasibility
* **HIGH (FEASIBLE - NEARLY DIRECTLY SUPPORTED)**

#### 18. Implementation Scope
* Low. Traversal infrastructure already exists; only requires mounting dedicated tree layout mode.

#### 19. Evidence
* `explorer/src/lib/impact-analysis.ts` lines 54-82 (`getAffectedNodesIn`) already implement BFS depth-bounded graph traversal for upstream and downstream directions.

---

### E. Dependency Radar

#### 1. Purpose
Renders a multi-axis polar radar chart (spider chart) representing a selected component's multi-dimensional architectural profile across key structural metrics.

#### 2. User Questions
* Is this component a high-risk hub, a utility class, or a pure data access component?
* How does this component's complexity compare to system-wide averages?
* Does this class have excessive cross-feature connectivity relative to its fan-in?

#### 3. Required Data
Profile metrics for selected component:
1. **Consumers:** Direct fan-in count.
2. **Reuse:** Transitive dependents count or system-wide consumption index.
3. **Dependencies:** Direct fan-out count.
4. **Feature Count:** Number of distinct features referencing this component.
5. **Depth:** Maximum transitive dependency path depth.
6. **Cross-Feature Connectivity:** Number of cross-feature outgoing/incoming edges.

#### 4. Existing Data
* `ExplorerNode.metrics`: `fanIn`, `fanOut`, `coupling`, `score`.
* `ExplorerNode.behavior`: `publicContractsCount`, `queryCount`, `dmlCount`.
* `impactSummaries`: `directDependents`, `transitiveDependents`, `directDependencies`, `transitiveDependencies`.

#### 5. Derivable Data
* **Consumers:** `node.metrics.fanIn` (DIRECTLY AVAILABLE).
* **Reuse:** `impactSummary.transitiveDependents.length` (DERIVABLE FROM CURRENT GRAPH).
* **Dependencies:** `node.metrics.fanOut` (DIRECTLY AVAILABLE).
* **Feature Count:** Count of unique `featureId` values among neighbor nodes (DERIVABLE FROM CURRENT GRAPH).
* **Depth:** Longest path length in `transitiveDependencies` / `transitiveDependents` DAG (DERIVABLE FROM CURRENT GRAPH).
* **Cross-Feature Connectivity:** Count of edges where `source.featureId !== target.featureId` (DERIVABLE FROM CURRENT GRAPH).

#### 6. Missing Data
* None. All 6 radar dimensions are directly available or derivable.

#### 7. Existing Algorithms
* `createLayoutGraphIndex` (`graph-index.ts`): Fast neighbor lookup.
* `getFeatureMembershipEvidence` (`feature-diagnostics.ts`): Feature association lookups.
* `computeNodeHubMetrics` / `computeNodeBridgeAnalysis` (`centrality.ts`).

#### 8. Existing UI Support
* Sidebar and Inspector drawers (`Sidebar.tsx`, `SummaryBar.tsx`).

#### 9. Existing Rendering Support
* SVG polygon rendering or 2D HTML5 Canvas radar chart component.

#### 10. Reusable Code
* Metric extraction from `ExplorerNode` and `ExplorerComponentImpactSummary`.

#### 11. New Algorithms
* Metric normalization function ($Metric_{norm} = \min(1.0, \frac{Value}{ScaleFactor})$) to map raw counts onto $[0, 1]$ radar axes.

#### 12. New Rendering
* SVG Radar Chart component (`DependencyRadarChart.tsx`) with axis labels, filled polygon overlay, and baseline benchmark comparison polygon.

#### 13. New State
* Selected component ID, baseline comparison toggle (component vs. system average).

#### 14. Benefits
* Gives instant 360-degree architectural fingerprint of any component; essential for refactoring triage.

#### 15. Limitations
* Relevant only when a specific component is selected; not a global topology overview.

#### 16. Scalability
* High ($O(1)$ lookup for pre-computed metrics, $< 1\text{ms}$).

#### 17. Feasibility
* **HIGH (FEASIBLE - FULLY SUPPORTED DATA)**

#### 18. Implementation Scope
* Low. UI widget rendering using existing node and impact metrics.

#### 19. Evidence
* `explorer/src/types/explorer.ts` (`ExplorerNodeMetrics`, `ExplorerComponentImpactSummary`) provides all fan-in, fan-out, impact, and behavior counts required.

---

### F. Dependency Constellation

#### 1. Purpose
Visualizes a focus-centric "solar system" view where the selected component resides at the origin $(0,0)$, and connected components orbit in concentric rings representing dependency distance, with node size encoded by importance/reuse and color encoded by feature membership.

#### 2. User Questions
* What components directly orbit around this core service?
* Which distant (2-hop, 3-hop) dependencies exert the most architectural pull (high reuse)?
* How are surrounding dependencies clustered across functional features?

#### 3. Required Data
* Target focal node ID.
* Distance encodings: Hop distance ($1, 2, 3, \dots$) mapped to orbital radii ($R_1, R_2, R_3$).
* Size encodings: Node reuse / importance score (`transitiveDependents.length` or `score`).
* Group encodings: Feature ID mapped to orbital angle or node color.

#### 4. Existing Data
* Focal node selection state in `focus-graph.ts`.
* Step distance calculations in `computeFocusedGraph`.
* Node metrics (`fanIn`, `score`) and feature assignments.

#### 5. Derivable Data
* Polar coordinates $(\rho_i, \theta_i)$ where $\rho_i = R_{hop}$ and $\theta_i$ is distributed by feature cluster or angular barycenter.

#### 6. Missing Data
* Orbital spatial positioning in layout engine (currently uses rectangular 2D grids).

#### 7. Existing Algorithms
* `computeFocusedGraph` (`focus-graph.ts`): Computes sub-graph within distance $k$.
* `classifyAllFeatureRoles` (`feature-roles.ts`): Identifies node roles and centrality.

#### 8. Existing UI Support
* `GraphView.tsx` viewport canvas.

#### 9. Existing Rendering Support
* Cytoscape.js canvas with concentric layout plugin or custom layout position assignment. `FeatureOverlayCanvas.tsx` can render orbital ring paths.

#### 10. Reusable Code
* `computeFocusedGraph` in `focus-graph.ts`.
* `NODE_SHAPE_BY_TYPE` and color schemes in `graph-style.ts`.

#### 11. New Algorithms
* Polar constellation layout generator mapping $(Node, HopDistance, Feature) \to (x, y)$ on concentric circles with collision avoidance along arc perimeters.

#### 12. New Rendering
* Cytoscape custom position setter or Canvas overlay drawing orbital rings ($R_1, R_2, R_3$) and directional gravitational arrows.

#### 13. New State
* Selected focal node, maximum radius steps ($1 \dots 4$), size encoding mode toggle (Fan-In vs. Impact Score vs. Centrality).

#### 14. Benefits
* Highly intuitive radial representation of component influence spheres; eliminates global graph clutter by focusing strictly on neighborhood topology.

#### 15. Limitations
* Angular crowding when a single hop distance contains $> 30$ nodes; requires angular sorting or satellite clustering.

#### 16. Scalability
* High ($O(|V_{local}|)$ positioning for focused sub-graphs of 20–100 nodes).

#### 17. Feasibility
* **HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Medium. Requires polar layout position function and orbital ring overlay.

#### 19. Evidence
* `explorer/src/lib/focus-graph.ts` lines 109-150 (`computeFocusedGraph`) already computes exact k-hop distance sub-graphs centered on any target node.

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
* Selected focal node $N_{focus}$.
* Classification of every adjacent node $N_{adj}$ into one of 4 disjoint sets:
  1. $Upstream = \{N_{adj} \mid E(N_{adj}, N_{focus}) \in Edges \land Layer(N_{adj}) \neq Layer(N_{focus})\}$
  2. $Downstream = \{N_{adj} \mid E(N_{focus}, N_{adj}) \in Edges \land Layer(N_{adj}) \neq Layer(N_{focus})\}$
  3. $Lateral = \{N_{adj} \mid Feature(N_{adj}) == Feature(N_{focus}) \land Layer(N_{adj}) == Layer(N_{focus})\}$
  4. $CrossFeature = \{N_{adj} \mid Feature(N_{adj}) \neq Feature(N_{focus}) \land Layer(N_{adj}) == Layer(N_{focus})\}$

#### 4. Existing Data
* Directed edge directions in `ExplorerEdge`.
* Layer classifications from `classifyNodeLayer`.
* Feature memberships from `discoverFeatures`.

#### 5. Derivable Data
* Exact assignment of all adjacent edges and nodes into the 4 directional quadrants.

#### 6. Missing Data
* None. All 4 relationship categories are 100% derivable from current graph data structures.

#### 7. Existing Algorithms
* `createLayoutGraphIndex` (`graph-index.ts`): Provides $O(1)$ incoming and outgoing edge lists.
* `classifyNodeLayer` (`layers.ts`): Returns exact layer.
* `getFeatureMembershipEvidence` (`feature-diagnostics.ts`).

#### 8. Existing UI Support
* `GraphView.tsx` layout engine, or dedicated panel/overlay view.

#### 9. Existing Rendering Support
* Custom Cytoscape position generator placing quadrant nodes in 4 cardinal directional boxes surrounding $(0,0)$.

#### 10. Reusable Code
* Graph index adjacency functions.
* Layer and feature classification utilities.

#### 11. New Algorithms
* 4-Quadrant Cardinal Classifier ($Classify(N_{focus}, N_{adj}, Edge) \to \{UPSTREAM, DOWNSTREAM, LATERAL, CROSS\_FEATURE\}$).
* Cardinal box layout algorithm arranging nodes neatly in 4 directed columns/rows.

#### 12. New Rendering
* Custom layout mode or SVG canvas overlay displaying 4 labeled quadrant boxes with directional arrows.

#### 13. New State
* Selected focal node, quadrant collapse/expand toggles.

#### 14. Benefits
* Completely removes spatial confusion regarding edge direction; provides absolute structural clarity for single-component analysis.

#### 15. Limitations
* Node count per quadrant must be bounded or virtualized if fan-in/fan-out exceeds 50 nodes.

#### 16. Scalability
* High ($O(|E_{adj}|)$ categorization, $< 1\text{ms}$ execution time).

#### 17. Feasibility
* **HIGH (FEASIBLE - 100% RELIABLY DERIVABLE)**

#### 18. Implementation Scope
* Low-Medium. Requires classifier function and 4-column/quadrant layout positioning logic.

#### 19. Evidence
* `graph-index.ts` (`getIncomingEdges`, `getOutgoingEdges`) + `layers.ts` (`classifyNodeLayer`) + `features.ts` (`discoverFeatures`) allow unambiguous partitioning into all 4 relationship classes.

---

### H. Architecture Treemap

#### 1. Purpose
Renders a nested rectangular treemap representing the hierarchical architecture structure:
$$\text{System} \to \text{Feature} \to \text{Architectural Layer (LWC, Controller, Service, Selector, Data)} \to \text{Component}$$
Rectangle area is encoded by node size metric (component count, dependency count, consumers, reuse, or complexity), and color is encoded by risk level or health score.

#### 2. User Questions
* Which features occupy the largest proportion of system footprint?
* How is component mass distributed across architectural layers within a feature?
* Where are high-risk or complex components concentrated inside the nested feature structure?

#### 3. Required Data
* Hierarchical tree structure: `Root` $\to$ `Features` $\to$ `Layers` $\to$ `Nodes`.
* Quantitative area metric per node ($Size > 0$).
* Categorical or continuous color metric per node (Risk: HIGH/MEDIUM/LOW, score: $0-100$).

#### 4. Existing Data
* Feature definitions (`discoverFeatures`).
* Layer classification per node (`classifyNodeLayer`).
* Node metrics (`metrics.fanIn`, `metrics.fanOut`, `metrics.score`, `risk`).

#### 5. Derivable Data
* Nested hierarchy tree mapping every component into a unique $(Feature, Layer, Node)$ path.
* Aggregated area metrics for parent boxes (sum of child areas).

#### 6. Missing Data
* Squarified treemap layout coordinates (not present in graph canvas engine).

#### 7. Existing Algorithms
* `discoverFeatures` (`features.ts`).
* `classifyNodeLayer` (`layers.ts`).
* `calculateArchitectureHealth` (`health.ts`).

#### 8. Existing UI Support
* Full panel or tab container view.

#### 9. Existing Rendering Support
* React DOM / SVG / Canvas 2D squarified treemap rendering. Standard D3-treemap algorithm or custom layout generator.

#### 10. Reusable Code
* Hierarchical feature and layer classification routines.

#### 11. New Algorithms
* Standard Squarified Treemap Layout Algorithm (Bruls et al.) converting hierarchical tree + area weights into 2D rectangle coordinates $(x, y, w, h)$.

#### 12. New Rendering
* React Treemap component (`ArchitectureTreemap.tsx`) with nested visual bounding boxes, text truncation, hover tooltips, and click-to-zoom handlers.

#### 13. New State
* Selected area metric (Component Count vs. Dependencies vs. Consumers vs. Complexity Score), color scheme toggle (Risk Level vs. Layer Type).

#### 14. Benefits
* Provides an intuitive 100% space-filling overview of overall codebase volume and risk distribution; zero edge crossing or overlap issues.

#### 15. Limitations
* Does not display explicit directed edges between components (relationship topology is sacrificed for hierarchical containment).

#### 16. Scalability
* High ($O(|V| \log |V|)$ squarification algorithm, $< 10\text{ms}$ for 2,000 components).

#### 17. Feasibility
* **HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Medium. Requires squarified treemap generator and React SVG/Canvas rendering component.

#### 19. Evidence
* `classifyNodeLayer` (`layers.ts`) and `discoverFeatures` (`features.ts`) partition 100% of graph nodes into clean nested hierarchy branches.

---

### I. Architecture Landscape

#### 1. Purpose
Renders system complexity as a 2D topographical terrain or 2D density map, where high-degree areas, high-reuse hubs, and cross-feature hotspots form elevated contour "mountains" or density heat contours.

#### 2. User Questions
* Where are the primary complexity ridges and density peaks in the codebase?
* Are high-risk hotspots clustered together or isolated across distant domains?
* How densely populated are individual feature regions?

#### 3. Required Data
* 2D spatial positions $(x_i, y_i)$ for all nodes (from layout engine).
* Scalar density/complexity values $Z_i$ for each node (derived from degree, centrality, risk, or coupling).
* Continuous 2D density field evaluation function $F(x, y) = \sum_i Z_i \cdot k(\frac{\|(x,y) - (x_i, y_i)\|}{h})$.

#### 4. Existing Data
* Node 2D layout positions $(x_i, y_i)$ generated by `computeArchitectureLayout`.
* Node centrality, degree, and hub scores from `centrality.ts` and `hotspots.ts`.
* Feature boundary geometry from `global-layout.ts`.

#### 5. Derivable Data
* 2D Kernel Density Estimation (KDE) surface over the layout canvas.
* Contour lines or heat raster imagery matching feature regions.

#### 6. Missing Data
* Pre-rendered elevation mesh or KDE density matrix (must be calculated at runtime).

#### 7. Existing Algorithms
* `computeArchitectureLayout` (`architecture-layout.ts`): Computes authoritative 2D node coordinates.
* `getArchitecturalHotspots` (`hotspots.ts`): Identifies hotspot nodes.
* `computeNodeHubMetrics` / `computeNodeBridgeAnalysis` (`centrality.ts`).

#### 8. Existing UI Support
* `GraphView.tsx` canvas viewport.

#### 9. Existing Rendering Support
* `FeatureOverlayCanvas.tsx` HTML5 2D Canvas overlay rendered directly beneath Cytoscape nodes.

#### 10. Reusable Code
* `FeatureOverlayCanvas.tsx` canvas context rendering pipeline.
* Canvas coordinate transformation functions.

#### 11. New Algorithms
* Fast 2D Kernel Density Estimation (KDE) rasterizer using Gaussian smoothing kernels over a downsampled grid ($128 \times 128$).

#### 12. New Rendering
* Heatmap/terrain contour overlay drawn on `FeatureOverlayCanvas.tsx` using radial gradient color ramps (blue $\to$ green $\to$ yellow $\to$ red).

#### 13. New State
* Landscape display toggle, density weight metric (Degree vs. Hotspot Score vs. Bridge Score), kernel bandwidth slider.

#### 14. Benefits
* Translates abstract graph metrics into a powerful visual metaphor (topographical terrain) that non-technical stakeholders instantly comprehend.

#### 15. Limitations
* Terrain landscape depends on current 2D layout positioning; if layout positions change, landscape contours shift.

#### 16. Scalability
* High ($O(|V| + G^2)$ where $G=128$ grid resolution, $< 15\text{ms}$ execution time on 2D Canvas).

#### 17. Feasibility
* **HIGH (FEASIBLE)**

#### 18. Implementation Scope
* Medium. Extends existing `FeatureOverlayCanvas.tsx` with a KDE canvas rendering pass.

#### 19. Evidence
* `FeatureOverlayCanvas.tsx` already renders HTML5 2D Canvas overlays synchronized with Cytoscape pan/zoom coordinates. `computeArchitectureLayout` provides stable 2D positions.

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
* Does this class exhibit the signature of a "God Class" (high in all bands) vs. a "Data Access Object" (high data access, low dependencies)?
* How closely does this component's DNA match standard architectural patterns?

#### 3. Required Data
7 normalized metric dimensions ($0.0 \dots 1.0$):
1. **Consumers:** Normalized fan-in.
2. **Reuse:** Normalized transitive dependents count.
3. **Features:** Count of distinct features connected.
4. **Dependencies:** Normalized fan-out.
5. **Cross-Feature:** Proportion of cross-feature edges.
6. **Data Access:** SOQL query count + DML count + object/field references.
7. **Depth:** Transitive dependency chain depth.

#### 4. Existing Data
* `ExplorerNode.metrics`: `fanIn`, `fanOut`, `coupling`.
* `ExplorerNode.behavior`: `queryCount`, `dmlCount`, `publicContractsCount`.
* `impactSummaries`: `transitiveDependencies`, `transitiveDependents`.

#### 5. Derivable Data
* All 7 DNA metrics are directly available or derivable from `ExplorerNode` and `impactSummaries`.

#### 6. Missing Data
* None.

#### 7. Existing Algorithms
* Metric extraction from `ExplorerNode` and `impactSummaries`.

#### 8. Existing UI Support
* Sidebar inspector (`Sidebar.tsx`), Summary bar (`SummaryBar.tsx`), or inline node list items.

#### 9. Existing Rendering Support
* CSS Flexbox / SVG multi-segment colored bar component.

#### 10. Reusable Code
* Node metric accessors.

#### 11. New Algorithms
* System-wide min-max metric normalizer ($Norm(x) = \frac{x - x_{min}}{x_{max} - x_{min}}$) to scale raw metrics to $[0, 1]$ intensity values.

#### 12. New Rendering
* Micro React UI component (`ArchitectureDNAStrip.tsx`) rendering 7 colored band segments with tooltips and archetype badges (e.g., "DAO", "SERVICE_HUB", "UTILITY").

#### 13. New State
* Selected node ID.

#### 14. Benefits
* Extremely compact footprint; can be rendered inline inside search results, sidebar lists, and node tooltips.

#### 15. Limitations
* Provides summary fingerprints for single components; not a graph topology view.

#### 16. Scalability
* Ultra-High ($O(1)$ render time per component, $< 0.1\text{ms}$).

#### 17. Feasibility
* **HIGH (FEASIBLE - 100% AVAILABLE DATA)**

#### 18. Implementation Scope
* Low. Simple UI bar component.

#### 19. Evidence
* `ExplorerNode` (`metrics`, `behavior`) and `impactSummaries` contain all raw variables necessary to compute all 7 DNA dimensions.

---

### K. Architecture Hotspot View

#### 1. Purpose
Highlights critical architectural risk zones across the graph by applying visual heat glow, pulsing borders, and halo overlays to nodes and regions meeting hotspot criteria (Hubs, Bridges, Reused Components, High-Degree Nodes, Feature Hotspots, Dense Regions).

#### 2. User Questions
* Which components represent the greatest single points of failure in the system?
* Where are architectural bridge bottlenecks connecting disparate features?
* Which dense feature regions suffer from severe internal coupling?

#### 3. Required Data
* Hotspot classification per node:
  * **Hubs:** High fan-in ($> 10$) and high centrality score.
  * **Bridges:** High bridge centrality score connecting $\ge 2$ features/domains.
  * **Reused Components:** High transitive dependents ($> 20$).
  * **High-Degree Nodes:** Combined fan-in + fan-out $> 15$.
  * **Feature Hotspots:** Feature clusters with low cohesion ($< 0.5$) and high internal edge density.
  * **Dense Regions:** Spatial bounding boxes with high node density per $\text{px}^2$.

#### 4. Existing Data
* `getArchitecturalHotspots` output (`hotspots.ts`).
* Centrality and bridge metrics from `centrality.ts`.
* Feature cohesion scores from `features.ts`.
* Node risk levels (`HIGH`, `MEDIUM`, `LOW`) and `riskReasons`.

#### 5. Derivable Data
* Categorical hotspot flags for every node in the graph.
* Hotspot bounding regions for `FeatureOverlayCanvas.tsx`.

#### 6. Missing Data
* None. Hotspot identification algorithms and metrics are already fully implemented.

#### 7. Existing Algorithms
* `getArchitecturalHotspots` (`hotspots.ts`): Filters and ranks nodes by degree, risk, and impact.
* `computeNodeHubMetrics` / `computeNodeBridgeAnalysis` (`centrality.ts`): Calculates hub and bridge scores.
* `calculateSemanticFeatureCohesion` (`features.ts`): Calculates feature cohesion.

#### 8. Existing UI Support
* `HotspotPanel.tsx` drawer already exists in UI!

#### 9. Existing Rendering Support
* Cytoscape node style classes (`.hotspot-hub`, `.hotspot-bridge`) in `graph-style.ts` + `FeatureOverlayCanvas.tsx` halo overlays.

#### 10. Reusable Code
* `getArchitecturalHotspots` in `hotspots.ts`.
* `HotspotPanel.tsx` UI drawer component.
* `FeatureOverlayCanvas.tsx` highlight renderer.

#### 11. New Algorithms
* Hotspot filter preset selector mapping user toggles to active hotspot criteria.

#### 12. New Rendering
* Enhanced Cytoscape style rules adding glowing halo borders and pulsing animations for hotspot nodes; Canvas overlay highlight bubbles for feature hotspots.

#### 13. New State
* Active hotspot filters (Hubs, Bridges, High-Degree, Dense Regions), hotspot intensity threshold slider.

#### 14. Benefits
* Directly leverages existing analytical engines to draw immediate visual attention to structural debt and high-risk nodes.

#### 15. Limitations
* If thresholds are set too low, too many nodes light up as hotspots ("hotspot fatigue").

#### 16. Scalability
* High ($O(|V|)$ evaluation time, pre-computed during analysis).

#### 17. Feasibility
* **HIGH (FEASIBLE - ALREADY MOSTLY BUILT)**

#### 18. Implementation Scope
* Low. Requires wiring existing `hotspots.ts` metrics into `GraphView.tsx` styling and `HotspotPanel.tsx` controls.

#### 19. Evidence
* `explorer/src/lib/hotspots.ts` (`getArchitecturalHotspots`), `centrality.ts` (`computeGraphCentralityAnalysis`), and `HotspotPanel.tsx` are already present in the codebase.

---

## 4. Master Comparison Matrix

| Visualization | Existing Metrics | Derivable Metrics | Existing Rendering | Existing Traversal | New Analysis | Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Dependency Matrix** | Node types, layers, features | Matrix cell edge counts | DOM Table / CSS Grid | $O(1)$ Edge Iteration | Row Aggregator | **HIGH** |
| **B. Coupling Heatmap** | Feature edge weights | $N \times N$ Coupling matrix | HTML5 Canvas / SVG | Matrix Traversal | Coupling Index | **HIGH** |
| **C. Chord Diagram** | Inter-feature edges | Arc angles, chord weights | SVG Paths / Canvas | Feature Adjacency | Polar Coordinate Gen | **MEDIUM-HIGH** |
| **D. Dependency Tree** | Impact summaries, edges | DAG tree paths, depths | Cytoscape / Custom | BFS/DFS Traversal | Tree Deduplicator | **HIGH** |
| **E. Dependency Radar** | Fan-In, Fan-Out, Score | Depth, Feature Count | SVG Polygon | Neighbor Lookups | Metric Normalizer | **HIGH** |
| **F. Constellation** | Hop distance, Feature IDs | Polar $(\rho, \theta)$ orbits | Cytoscape + Overlay | k-Hop BFS | Polar Layout | **HIGH** |
| **G. Four-Direction View** | Directed edges, Layers | 4 Quadrant partition | Cytoscape / Custom | Direct Adjacency | Quadrant Classifier | **HIGH** |
| **H. Architecture Treemap** | Node counts, Risk levels | Squarified tree boxes | DOM / SVG Treemap | Hierarchy Tree | Squarified Layout | **HIGH** |
| **I. Landscape** | 2D Layout coordinates | 2D KDE surface | `FeatureOverlayCanvas` | Spatial Index | 2D KDE Rasterizer | **HIGH** |
| **J. Architecture DNA** | Fan-In, Fan-Out, Queries | 7 Fingerprint bands | Micro React DOM | $O(1)$ Node Lookup | Min-Max Normalizer | **HIGH** |
| **K. Hotspot View** | Hub scores, Bridge scores | Spatial hotspot density | Cytoscape + Canvas | Graph Index | Hotspot Preset Filter | **HIGH** |

---

## 5. Explicit Metric Classifications

Every proposed metric across all 11 visualization lenses is explicitly classified according to the 5 mandatory categories:

### 1. DIRECTLY AVAILABLE
* `fanIn` (Node direct callers count) — `ExplorerNodeMetrics.fanIn`
* `fanOut` (Node direct dependencies count) — `ExplorerNodeMetrics.fanOut`
* `coupling` (Direct coupling metric) — `ExplorerNodeMetrics.coupling`
* `score` (Centrality / importance score) — `ExplorerNodeMetrics.score`
* `risk` (`HIGH` | `MEDIUM` | `LOW`) — `ExplorerNode`
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
* `layerType` (`LWC` | `Controller` | `Service` | `Selector` | `Data` | `Test`) — Derivable via `classifyNodeLayer()`
* `isShared` (Shared infrastructure flag) — Derivable via `isSharedInfrastructure()`
* `interFeatureEdgeCount` — Derivable via `buildFeatureDependencyMatrix()`
* `featureCohesion` — Derivable via `calculateSemanticFeatureCohesion()`
* `connectedFeatureCount` — Count of unique features in direct neighbors (Derivable via `createLayoutGraphIndex`)
* `transitivePathDepth` — Longest path in `transitiveDependencies` / `transitiveDependents` DAG (Derivable via BFS)
* `fourDirectionQuadrant` — Assignment to Upstream, Downstream, Lateral, Cross-Feature (Derivable via edge direction + layer + feature)
* `polarCoordinates` $(\rho, \theta)$ — Derivable from hop distance and feature angle
* `areaWeight` — Sum of child node counts/scores in hierarchy branch

### 3. HEURISTIC
* `semanticFeatureName` — Inferred from stem names and directory paths (`domains.ts`)
* `featureRole` (`Anchor` | `Core` | `Data` | `Bridge` | `Test` | `SharedInfrastructure`) — Classified via heuristic scoring rules (`feature-roles.ts`)
* `architectureDNAArchetype` ("God Class" vs "DAO" vs "Service Hub") — Heuristic classification derived from normalized DNA metrics
* `landscapeKDEBandwidth` — Visual spatial smoothing kernel bandwidth ($h = 150\text{px}$)

### 4. REQUIRES NEW ANALYSIS
* `2DKDESurfaceMatrix` — $128 \times 128$ grid density evaluation for terrain landscape rasterization
* `squarifiedTreemapRectangles` — 2D bounding boxes $(x, y, w, h)$ generated via squarification algorithm
* `chordBezierPaths` — Quadratic Bézier control points connecting arc midpoints in circular layout

### 5. NOT CURRENTLY POSSIBLE
* `runtimeInvocationFrequency` — Requires dynamic APM / execution profiling logs (not present in static metadata analysis)
* `historicalCouplingTrend` — Requires git commit history time-series data across multiple repository commits (currently single snapshot)

---

## 6. Synthesis & Final Assessment

### Synthesis Points

1. **Analytical Views Already Strongly Supported:**
   * **Hotspot View (K):** Backend analysis (`hotspots.ts`, `centrality.ts`) and UI panel (`HotspotPanel.tsx`) are already implemented; only styling integration remains.
   * **Dependency Tree (D):** Full BFS/DFS traversal algorithms (`getAffectedNodesIn`, `computeFocusedGraph`) and graph index adjacency lookups already exist.
   * **Dependency Radar (E) & Architecture DNA (J):** All required underlying metrics (`fanIn`, `fanOut`, `impactSummaries`, `behavior`) are pre-calculated and directly available in memory.

2. **Views Requiring Only Aggregation:**
   * **Feature Dependency Matrix (A):** `buildFeatureDependencyMatrix` already calculates feature-to-feature edge matrices; requires only row mapping by component layer.
   * **Feature Coupling Heatmap (B):** Pairwise edge weights and shared component counts are directly computable from existing matrix structures.
   * **Four-Direction Dependency View (G):** Categorization into Upstream, Downstream, Lateral, and Cross-Feature requires only direct evaluation of edge direction, layer, and feature membership.

3. **Views Requiring New Analysis:**
   * **Architecture Treemap (H):** Requires implementing a Squarified Treemap layout generator to convert hierarchical feature/layer trees into 2D rectangle bounds.
   * **Architecture Landscape (I):** Requires a fast 2D Kernel Density Estimation (KDE) rasterization pass over 2D node coordinates.

4. **Views Requiring New Rendering Infrastructure:**
   * **Feature Chord Diagram (C):** Requires a dedicated SVG/Canvas polar coordinate renderer with Bézier chord drawing (does not use standard graph node/edge rendering).
   * **Dependency Constellation (F):** Requires a polar concentric ring layout assignment for Cytoscape nodes and canvas orbital rings.

5. **Views That Complement the Current 2D Graph Particularly Well:**
   * **Architecture Landscape (I) & Hotspot View (K):** Rendered directly on top of or beneath the authoritative 2D node layout on `FeatureOverlayCanvas.tsx`, adding rich density and heat context without shifting node positions.

6. **Views Best Suited as Selected-Node Investigation Tools:**
   * **Dependency Radar (E), Four-Direction View (G), Dependency Constellation (F), Architecture DNA (J), and Dependency Tree (D):** These views operate on a single focused component, making them ideal inspector panel widgets during deep-dive refactoring analysis.

---

### Verification & Compliance Confirmation

* **Production Code Integrity:** Zero production source files in `explorer/src/` or analyzer scripts were edited.
* **Test Suite Integrity:** All existing vitest and CLI integration test suites pass without regression.
* **File Delivery:** The audit report is strictly contained within `ARCHITECTURE_VISUALIZATION_RELATIONSHIP_ANALYTICS_AUDIT.md`.

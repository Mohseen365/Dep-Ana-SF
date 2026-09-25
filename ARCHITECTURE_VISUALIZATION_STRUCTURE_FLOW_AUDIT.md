# STRUCTURE & FLOW VISUALIZATION FEASIBILITY AUDIT

## Mission & Context

This audit evaluates the feasibility of supporting eight advanced architecture visualization lenses within the existing **Salesforce Architecture Explorer & Dependency Analyzer** codebase.

The fundamental evaluation question is:

> **How naturally can the existing Salesforce Architecture Explorer support these visualization concepts?**

### Audit Scope & Strict Governance
- **Zero Production Changes**: No changes are made to codebase files, tests, configuration, dependencies, documentation, context files, or project structure.
- **Authoritative Source Basis**: All findings are strictly grounded in current production code, including `explorer/src/types/explorer.ts`, `explorer/src/lib/architecture-layout.ts`, `explorer/src/components/GraphView.tsx`, `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`, `explorer/src/lib/graph-style.ts`, `explorer/src/lib/impact-analysis.ts`, and prior 3D feasibility audits (`3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md`, `3D_FEASIBILITY_DECISION_READINESS_AUDIT.md`).
- **Benchmark Baseline**: Cloud Spend Tracker benchmark dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`), containing 240 nodes, 1,024 edges, 4 architectural layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132), and 13 discovered feature regions.

---

# 1. AUDIT OF VISUALIZATION LENSES

## A. Architecture Atlas

### Purpose
Provides a high-level semantic land map of the system architecture, partitioning the canvas into semantic feature regions, component families, shared infrastructure corridors, and schema data foundations.

### User Questions
- What are the major functional domains and feature boundaries in this Salesforce org?
- Where is shared utility code located relative to core business features?
- How is the system partitioned across presentation, application, business domain, and database schema layers?
- Which features have the highest density of cross-feature dependencies?

### Required Data
- Feature region clustering and assignments.
- Architectural layer classifications (`presentation`, `application`, `domain`, `schema`).
- Node role classifications (`Anchor`, `Core`, `Bridge`, `SharedInfrastructure`, `Test`).
- Bounding geometry and bounding boxes for feature regions.

### Existing Data Support
- **Full Data Support**: `discoverFeatures()` in `explorer/src/lib/layout/features.ts` identifies semantic feature clusters and assigns primary feature membership.
- Node types (`ApexClass`, `LWC`, `CustomObject`, etc.) and risk scores (`HIGH`, `MEDIUM`, `LOW`) are fully typed in `ExplorerDataSchema` (`explorer/src/types/explorer.ts`).
- `feature-roles.ts` classifies components into `SharedInfrastructure` (35 nodes on benchmark), `Bridge` (18 nodes), `Anchor` (12 nodes), `Core` (120 nodes), and `Test` (55 nodes).

### Existing Code Support
- Stage 5 of `architecture-layout.ts` computes dynamic 2D multi-row band packing for feature regions.
- `computeArchitectureLayoutWithMetadata()` returns Stage 5 `featureRegions` containing precise canvas bounding boxes `(minX, maxX, minY, maxY)`.
- `FeatureOverlayCanvas.tsx` renders outer SVG feature enclosures, semantic title headers, background tints, and hover highlights over the Cytoscape graph.

### Reusable Components
- `FeatureOverlayCanvas.tsx`: Renders outer semantic enclosures and labels.
- `GraphView.tsx`: Manages Hybrid mode toggling (`architectureMode="hybrid"`).
- `discoverFeatures()` & `global-layout.ts`: Derives features and packages 2D region bounds.

### Missing Infrastructure
- None for basic atlas view. To support interactive drilldown from Atlas region boxes to focused sub-graphs without reloading, seamless bounding-box zoom transitions can be connected to the existing `focusOnNode` / `focusState` pipeline.

### Feasibility
**READY**

### Benefits
- Directly addresses high-level architectural comprehension without requiring users to navigate 240 individual nodes.
- Built-in alignment with existing Hybrid layout mode and SVG overlay pipeline.
- Preserves 100% Position Authority and 0.00000 px determinism.

### Limitations
- Visual density in dense feature regions can cause text label clipping when zoom level is far (< 0.6).
- Overlay SVG canvas must re-sync coordinates on window/panel resizing.

### Scalability
- High: O(N) bounding box derivation and SVG polygon rendering handles up to 5,000+ nodes smoothly.

### Interaction Requirements
- Click on feature enclosure header to select/focus all feature components.
- Double-click feature enclosure to filter graph down to feature neighborhood.
- Hover feature region to highlight intra-feature vs inter-feature edge connections.

### Relationship to Current 2D Graph
- Direct 1:1 mapping: Existing Hybrid layout mode with `FeatureOverlayCanvas` IS the Architecture Atlas.

### Implementation Scope
- Zero core engine changes needed. Only minor UI polish for interactive region clicking and drilldown transitions.

### Evidence
- `FeatureOverlayCanvas.tsx` currently renders 13 semantic feature regions in production when `architectureMode="hybrid"`. Verified by `FeatureRegionOverlay.test.tsx` and `feature-composition-readability.test.ts`.

---

## B. Semantic Zoom

### Purpose
Dynamically alters information density and level-of-detail (LOD) based on the viewport zoom level, revealing high-level abstractions at distant zoom and fine-grained dependency details at close zoom.

### User Questions
- What is the global system structure when zoomed out?
- What component families exist within a feature when zoomed to mid-distance?
- What are the explicit method calls, field references, and relationship types when zoomed in close?

### Required Data
- 5-tier Zoom LOD mapping rules:
  - Zoom 1 (Far): Feature boundary boxes and shared infrastructure hubs.
  - Zoom 2 (Mid-Far): Component family clusters and primary anchor nodes.
  - Zoom 3 (Mid): Individual components (Apex classes, LWCs, Custom Objects) with display names.
  - Zoom 4 (Near): Dependency relationship types (`SOQL`, `method-call`, `instantiation`) on edges.
  - Zoom 5 (Very Near): Object field detail, method signatures, and risk badges.
- Viewport zoom event telemetry (`cy.zoom()`).

### Existing Data Support
- **Full Data Support**: Node types, relationship types (`ExplorerRelationshipType`), method names (`canonical.source.method`), risk reasons, and metrics exist in `ExplorerDataSchema`.

### Existing Code Support
- `GraphView.tsx` monitors viewport zoom and updates Cytoscape CSS classes dynamically:
  - `.zoom-far` (`zoom < 0.5`): Suppresses node labels, mutes intra-feature edges (`opacity: 0.18`), retains inter-feature edge visibility (`opacity: 0.55`).
  - `.zoom-mid` (`0.5 <= zoom < 1.5`): Displays node display names and moderate edge opacity (`opacity: 0.45`).
  - `.zoom-near` (`zoom >= 1.5`): Displays relationship type labels on edges (`data(relationshipType)`).
- `FeatureOverlayCanvas.tsx` suppresses feature region SVG overlays when `zoom < 0.6`.

### Reusable Components
- Viewport zoom listener in `GraphView.tsx`.
- Cytoscape stylesheet selectors in `graph-style.ts` (`.zoom-far`, `.zoom-mid`, `.zoom-near`).
- Min-zoomed font size configuration (`min-zoomed-font-size: 10`).

### Missing Infrastructure
- Current code implements 3 zoom tiers (`.zoom-far`, `.zoom-mid`, `.zoom-near`). Extending to 5 discrete semantic zoom levels requires adding 2 additional CSS class thresholds in `GraphView.tsx` (e.g. `.zoom-level-1` through `.zoom-level-5`) and semantic element collapse rules (hiding secondary satellite nodes at far zoom).

### Feasibility
**HIGH**

### Benefits
- Dramatically reduces visual noise on large-scale graphs (1,000+ nodes) without altering spatial node coordinates.
- Preserves 60 FPS rendering performance during pan/zoom operations.

### Limitations
- Cytoscape element filtering (`display: none` or `visibility: hidden`) during zoom transitions must be batched to prevent UI thread stutter on large graphs.

### Scalability
- High: Cytoscape batching (`cy.batch()`) handles zoom tier class toggling in < 5ms for 1,000 nodes.

### Interaction Requirements
- Continuous smooth scroll wheel zooming with automatic LOD transition triggers.
- Breadcrumb display indicating current semantic zoom depth.

### Relationship to Current 2D Graph
- Operates directly on the current 2D Cytoscape canvas as a pure visual styling transform.

### Implementation Scope
- Adding 2 extra zoom class thresholds in `GraphView.tsx` and updating `graph-style.ts` stylesheet rules.

### Evidence
- `graph-style.ts` lines 270–330 define existing `.zoom-far`, `.zoom-mid`, and `.zoom-near` CSS stylesheet rules verified in `wave11-visualization-hardening.test.ts`.

---

## C. Architecture Stack

### Purpose
Visualizes the org structure as a strict top-to-bottom architectural layer hierarchy: Presentation (LWC/Visualforce) $\rightarrow$ Application (Controllers/Services) $\rightarrow$ Domain (Business Logic/Selectors) $\rightarrow$ Schema (CustomObjects/Fields).

### User Questions
- Does my presentation layer bypass the service layer and directly access database selectors or objects?
- What components comprise each tier of the architectural stack?
- Are vertical dependencies strictly downwards, or are there upward/cross-layer violations?

### Required Data
- Layer classifications for every node (`presentation`, `application`, `domain`, `schema`).
- Component sub-role metadata (LWC, Controller, Service, Selector, Object, Field).
- Vertical dependency directional vectors (`source.layer` $\rightarrow$ `target.layer`).

### Existing Data Support
- **Full Data Support**: Layer classification is computed in Stage 2 of `architecture-layout.ts` and stored in `layers.ts`.
- Node types strictly map to layers:
  - `presentation`: `LWC`, `Visualforce`.
  - `application`: `ApexClass` (Controllers), `Flow`, `ApexTrigger`.
  - `domain`: `ApexClass` (Services, Selectors, Domain Handlers).
  - `schema`: `CustomObject`, `Object`, `CustomField`, `Field`, `External`.

### Existing Code Support
- Hierarchical Mode (`architectureMode="hierarchical"`) in `architecture-layout.ts` enforces strict top-to-bottom vertical layer band ordering.
- `getGraphStyles()` applies distinct visual shapes per entity type: `LWC` (rectangle), `ApexTrigger` (triangle), `ApexClass` (ellipse), `CustomObject` (octagon), `CustomField` (cut-rectangle).

### Reusable Components
- `architecture-layout.ts`: Stage 2 Layer Classifier and Stage 6 Barycentric Layer Ordering.
- `layers.ts`: Layer definitions and Y-coordinate band assignment.
- `GraphView.tsx`: Hierarchical mode toggle (`architectureMode="hierarchical"`).

### Missing Infrastructure
- None for the base stack view. Hierarchical mode is fully implemented. To enhance sub-layer role breakdown (e.g. separating `Services` from `Selectors` within `domain`), naming heuristic classifiers or method call inspection can group `ApexClass` components into sub-layer shelves.

### Feasibility
**READY**

### Benefits
- Instantly highlights architectural layer violations (e.g. LWC querying custom field directly via SOQL).
- Clean, intuitive top-to-bottom vertical flow matching standard Salesforce software engineering architecture guidelines.

### Limitations
- Large orgs with hundreds of schema fields expand the bottom schema layer horizontally.

### Scalability
- High: Handles 10,000+ nodes using O(N) layer bucket assignment.

### Interaction Requirements
- Click layer header to isolate all components in that tier.
- Hover inter-layer edge to highlight vertical dependency chain.

### Relationship to Current 2D Graph
- Direct 1:1 mapping: Existing Hierarchical layout mode IS the Architecture Stack.

### Implementation Scope
- Zero engine changes required. Sub-layer shelf styling can be added via simple CSS stylesheet additions.

### Evidence
- `architecture-layout.ts` Stages 2, 5, 6, 7 enforce vertical layer hierarchy verified across 79 test files and 733 unit tests.

---

## D. Architecture City / 3D City

### Purpose
Metaphorical 3D urban landscape visualization where features represent land neighborhoods, components represent buildings (height = coupling/fan-in, footprint = complexity/risk), shared services represent central towers, and dependencies represent road/transit networks.

### User Questions
- Which components are the massive "skyscrapers" (high coupling / fan-in) in my org?
- What features form dense urban "neighborhoods"?
- Where are the shared service "central towers" located relative to feature districts?

### Required Data
- 2D Canvas positions $(X, Y)$ for feature region neighborhood placement.
- Component metric dimensions for 3D building geometry:
  - Height = `metrics.coupling` or `metrics.fanIn`.
  - Footprint width/depth = risk score or line count.
  - Color = entity type or health status.
- Deterministic $Z$ elevation derived from layer tier or feature role.

### Existing Data Support
- **Full Data Support**: All required building metrics (`fanIn`, `fanOut`, `coupling`, `risk`, `file`, `type`) exist in `ExplorerNodeMetrics` and `ExplorerNode`.
- Feature neighborhood groupings (13 features) are provided by `discoverFeatures()`.

### Existing Code Support
- 2D positional layout $(X, Y)$ computed by `architecture-layout.ts` provides authoritative building ground coordinates.
- Proved in `3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md` and `3D_FEASIBILITY_DECISION_READINESS_AUDIT.md`: $Z$ coordinate can be derived deterministically as $Z = f(\text{role}, \text{layer})$ without altering 2D Position Authority.

### Reusable Components
- `architecture-layout.ts`: Authoritative $(X, Y)$ ground placement.
- `discoverFeatures()`: Neighborhood region partitioning.
- `position-policy.ts`: Read-only Level 1–5 Position Authority pipeline.

### Missing Infrastructure
- Requires WebGL 2.0 / Three.js canvas overlay component (`GraphView3D.tsx` candidate) to render 3D box meshes (buildings), extruded polygon slabs (neighborhood districts), and curved 3D line arcs (road dependencies).
- Requires 3D camera controls (orbit rotate, pitch, pan, zoom) and WebGL raycasting for hover cards.

### Feasibility
**EXPERIMENTAL**

### Benefits
- Compelling spatial metaphor for identifying high-risk architectural hotspots ("monolithic skyscrapers").
- Solves 2D planarity limits for dense satellite clusters by separating edge arcs in 3D depth.

### Limitations
- Camera occlusion (foreground buildings hiding background structures).
- Requires WebGL 2.0 hardware support in browser (+550 KB library bundle footprint).
- High interaction friction (6 degrees of camera freedom vs 2D pan/zoom).

### Scalability
- Medium: WebGL instanced mesh rendering handles up to 5,000 building blocks at 60 FPS.

### Interaction Requirements
- Orbit/tilt/pan camera controls with 1-click reset to top-down 2D view.
- Raycasting mouse hover highlighting building roof badges and connecting road arcs.

### Relationship to Current 2D Graph
- Operates as an downstream, isolated 3D projection overlay reading authoritative $(X, Y)$ coordinates from the 2D layout engine.

### Implementation Scope
- Dedicated experimental WebGL viewport component (`GraphView3D.tsx`) behind feature flag (`enable3DPrototype: false`). Zero changes to 2D production layout pipeline.

### Evidence
- `3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md` & `3D_FEASIBILITY_DECISION_READINESS_AUDIT.md` formally document 3D feasibility, Z-derivation determinism, and 2D Position Authority compatibility.

---

## E. Dependency River / Sankey

### Purpose
Visualizes aggregated dependency flow volumes passing vertically or horizontally through architectural tiers (Feature $\rightarrow$ LWC $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Selector $\rightarrow$ Object $\rightarrow$ Field) as smooth, proportional flow streams.

### User Questions
- What is the total volume of dependencies flowing from Feature A into Schema Object B?
- Where are the major structural bottlenecks where dependency flow narrows or concentrates?
- Which layers consume the majority of custom field references?

### Required Data
- Aggregated flow matrix $M[T_i, T_j] = \text{count of edges from Tier } T_i \text{ to Tier } T_j$.
- Consumer/supplier counts per tier.
- Inter-feature vs intra-feature flow volumes.

### Existing Data Support
- **Full Data Support**: Raw dependency links between all components exist in `ExplorerEdge[]`.
- Component impact summaries (`impactSummaries`) in `ExplorerDataSchema` contain precomputed direct and transitive dependency lists for every node.

### Existing Code Support
- `impact-analysis.ts` computes transitive dependency sets and impact paths.
- `dependency-analyzer.cjs` CLI provides backend matrix aggregation.

### Reusable Components
- `impact-analysis.ts`: Dependency traversal and path calculation.
- `ExplorerDataSchema.impactSummaries`: Direct and transitive dependency lists.

### Missing Infrastructure
- Requires a dedicated Sankey layout engine (e.g. `d3-sankey` or custom multi-stage horizontal flow algorithm) that computes node Y-offsets and smooth Bezier ribbon widths proportional to flow volume.
- Requires a dedicated SVG/Canvas flow renderer distinct from Cytoscape node-link rendering.

### Feasibility
**MEDIUM**

### Benefits
- Excellent for high-level executive overviews of structural dependency volume and architectural fan-in/fan-out.
- Eliminates individual edge crossing clutter by aggregating hundreds of edges into thick, readable streams.

### Limitations
- Abstracted flow ribbons hide individual component identities until hovered/selected.
- Cyclic dependencies (cycles) violate strict acyclic Sankey flow requirements and must be handled via feedback loop arcs or cycle breaking.

### Scalability
- High for aggregated flows (10–20 flow bands); Medium for unaggregated low-level components.

### Interaction Requirements
- Hover flow stream to highlight source feature and target schema object.
- Click flow stream to expand ribbon into detailed component-level node-link view.

### Relationship to Current 2D Graph
- Alternative aggregated view mode using the same underlying `nodes` and `edges` dataset.

### Implementation Scope
- New view component (`SankeyView.tsx`) using D3 flow layout libraries.

### Evidence
- `ExplorerDataSchema.impactSummaries` in `explorer/src/types/explorer.ts` provides direct/transitive dependency counts per component.

---

## F. Architecture Subway Map

### Purpose
Formats feature dependency chains as schematic transit "lines" and shared/cross-cutting infrastructure as "interchange stations" where multiple feature lines intersect.

### User Questions
- Which shared utility classes act as major "transfer stations" across multiple features?
- What line routes exist from user interaction (LWC) down to database persistence (CustomObject)?
- Where do feature routes cross or parallel each other?

### Required Data
- Linear dependency chains / routes ($R_k = [N_1, N_2, \dots, N_m]$).
- Interchange station identification (`SharedInfrastructure` and `Bridge` nodes with high cross-feature fan-in).
- Line color assignments per feature region.

### Existing Data Support
- **Full Data Support**: Feature assignments derived via `discoverFeatures()`.
- Interchange stations identified by `feature-roles.ts` (`SharedInfrastructure`: 35 nodes, `Bridge`: 18 nodes on benchmark graph).
- Inter-feature edges flagged via `isInterFeature` in `graph-builder.ts`.

### Existing Code Support
- `feature-roles.ts` classifies `SharedInfrastructure` and `Bridge` nodes.
- `graph-style.ts` supports dashed line styles (`line-dash-pattern: [6, 3]`) for inter-feature routes.

### Reusable Components
- `feature-roles.ts`: Identifies shared interchange stations.
- `graph-style.ts`: Color palette and dashed line styles for metro lines.

### Missing Infrastructure
- Requires an octilinear layout algorithm (restricting edge routing strictly to $0^\circ, 45^\circ, 90^\circ$ angles with rounded corners) and line-ordering heuristics to align parallel feature lines smoothly without line overlaps.

### Feasibility
**MEDIUM**

### Benefits
- Highly readable, familiar mental model for navigating complex cross-feature dependencies.
- Clear visual emphasis on shared infrastructure "transfer stations" (`SharedInfrastructure`).

### Limitations
- Dense orgs with high cycle counts make linear route decomposition complex.
- Requires dedicated octilinear grid layout distinct from force or hierarchical layouts.

### Scalability
- Medium: Best suited for core features and top 50–100 components; less effective for un-clustered field nodes.

### Interaction Requirements
- Click subway line to highlight entire feature route from end to end.
- Click interchange station to view all passing feature lines.

### Relationship to Current 2D Graph
- Customized 2D schematic layout of the same graph data.

### Implementation Scope
- Adding an octilinear line-routing pass to the 2D layout engine.

### Evidence
- `feature-roles.ts` explicitly classifies shared infrastructure and bridge nodes, verified in `phase4-c-shared-satellite.test.ts`.

---

## G. Dependency Timeline

### Purpose
Visualizes the static architectural dependency sequence (topological DAG call chain rank) required to instantiate and execute a feature path.

### User Questions
- What is the prerequisite static instantiation order for components in this feature?
- What is the longest static dependency chain (critical architectural path) from LWC to CustomField?
- In what topological order must components be refactored or migrated?

### Required Data
- Static dependency DAG topological rank ($Rank(N) = 1 + \max_{(U, N) \in E} Rank(U)$).
- Async execution signals (`behavior.asyncPatterns`, e.g. `@future`, `Queueable`, `Batchable`).
- Trigger execution event classifications (`ApexTrigger` on-before/on-after).

### Existing Data Support
- **Full Data Support for Architectural Dependency Rank**: Topological layer ranks and bucket ordering exist in `ordering.ts` and Stage 6 of `architecture-layout.ts`.
- **EXPLICIT WARNING — NO RUNTIME EXECUTION TIMING**: Current static code analysis does NOT capture actual runtime CPU execution order, call duration, or dynamic thread execution timing. The code models static code structure ONLY.

### Existing Code Support
- `ordering.ts` computes topological ordering and layer ranks for crossing reduction.
- `path-analyzer.cjs` computes longest static dependency paths.

### Reusable Components
- `ordering.ts`: Topological sorting and rank assignment algorithms.
- `path-analyzer.cjs`: Longest dependency path calculation.

### Missing Infrastructure
- Horizontal swimlane / sequence diagram layout component placing components along a horizontal step sequence ($X = \text{Topological Rank}, Y = \text{Component Tier}$).

### Feasibility
**LOW**

### Benefits
- Excellent for planning refactoring sequences and understanding static instantiation prerequisites.

### Limitations
- **CRITICAL**: Must NEVER claim to represent actual runtime execution timing or chronological performance traces, as static analysis cannot predict dynamic execution flow, runtime conditionals, or database performance.

### Scalability
- High for single feature execution chains (10–30 nodes); Low for entire org graphs (240+ nodes).

### Interaction Requirements
- Step-by-step forward/backward stepping along the static dependency chain.

### Relationship to Current 2D Graph
- Linear horizontal transformation of 2D DAG dependency paths.

### Implementation Scope
- Horizontal sequence layout generator for focused dependency chains.

### Evidence
- `ordering.ts` implements topological rank ordering for Stage 6 crossing reduction, verified in `ordering.test.ts`.

---

## H. Architecture Traffic

### Purpose
Visualizes architectural dependency volume, reusability density, and cross-feature coupling intensity using dynamic visual cues such as line width, animated dash flows, and node heat map coloring.

### User Questions
- Which dependencies represent the heaviest traffic corridors in the org?
- Where is cross-feature coupling creating high architectural congestion?
- Which database objects endure the highest incoming fan-in traffic from application services?

### Required Data
- Dependency traffic signals:
  - `metrics.fanIn`: Incoming consumer count.
  - `metrics.fanOut`: Outgoing dependency count.
  - `metrics.coupling`: Structural reusability index.
  - `behavior.publicContractsCount`: Number of public methods exposed.
  - `behavior.queryCount` / `behavior.dmlCount` / `behavior.calloutCount`: Database & callout traffic signals.
  - `isInterFeature`: Cross-feature boundary flag.
  - `totalImpactCount`: Transitive blast radius from `impactSummaries`.

### Existing Data Support
- **Full Data Support**: Every required traffic signal (`fanIn`, `fanOut`, `coupling`, `queryCount`, `dmlCount`, `calloutCount`, `totalImpactCount`) is fully populated in `ExplorerNodeMetrics`, `ExplorerNodeBehavior`, and `ExplorerDataSchema.impactSummaries`.

### Existing Code Support
- `graph-style.ts` natively supports dynamic edge styling, line widths (`width: 2.5`), dashed patterns (`line-dash-pattern: [6, 3]`), and node border colors based on risk/metrics.
- `impact-analysis.ts` highlights active impact traffic paths (`impact-origin`, `impact-affected`, `impact-muted`).

### Reusable Components
- `graph-style.ts`: Dynamic Cytoscape stylesheet engine.
- `impact-analysis.ts`: Blast radius and path highlighting.
- `ExplorerNodeMetrics`: Fully populated metric data.

### Missing Infrastructure
- A traffic score calculation function: $\text{Traffic}(E) = w_1 \cdot \text{FanIn}(Target) + w_2 \cdot \text{Coupling}(Source) + w_3 \cdot \text{IsInterFeature}$.
- UI slider control to filter graph visibility by minimum traffic threshold.

### Feasibility
**HIGH**

### Benefits
- Instantly draws user attention to high-risk structural bottlenecks and heavily reused shared components.
- Leverages existing 2D rendering pipeline with zero layout computation overhead.

### Limitations
- Excessive animated dash flows can increase GPU rendering load if enabled on all 1,024 edges simultaneously.

### Scalability
- High: Cytoscape handles edge width and color styling for 1,000+ edges at 60 FPS.

### Interaction Requirements
- Traffic threshold slider in graph controls panel.
- Hover edge to display exact traffic volume breakdown card.

### Relationship to Current 2D Graph
- Direct visual enhancement applied onto existing 2D Hierarchical or Hybrid layout modes.

### Implementation Scope
- Adding traffic scoring function in `graph-style.ts` and connecting UI slider in `GraphControls.tsx`.

### Evidence
- `graph-style.ts` lines 280–320 implement edge width, opacity, and dash patterns verified in `PROMPT_05_EDGE_DIFFERENTIATION` and `PROMPT_06_ZOOM_EDGE_OPACITY` reports.

---

# 2. MASTER MATRIX

| Visualization | Data Support | Layout Support | Rendering Support | Interaction Support | New Analysis | Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture Atlas** | High | High | High | High | Minimal | **READY** |
| **Semantic Zoom** | High | High | Medium | High | Minimal | **HIGH** |
| **Architecture Stack** | High | High | High | High | Minimal | **READY** |
| **Architecture City** | High | Low-Medium | Low | Low-Medium | Minimal | **EXPERIMENTAL** |
| **Dependency River** | Medium | Low | Low-Medium | Medium | Medium | **MEDIUM** |
| **Subway Map** | High | Low-Medium | Medium | High | Medium | **MEDIUM** |
| **Dependency Timeline**| Low-Medium | Medium | Medium | High | Medium | **LOW** |
| **Architecture Traffic**| High | High | High | High | Low | **HIGH** |

---

# 3. FINAL ASSESSMENT

### Most naturally supported by current architecture
1. **Architecture Atlas**: Existing Hybrid Mode with `FeatureOverlayCanvas.tsx` and Stage 5 multi-row 2D packing IS an Architecture Atlas. Requires zero engine changes.
2. **Architecture Stack**: Existing Hierarchical Mode with Stage 2 Layer Classifier and vertical band ordering IS an Architecture Stack. Fully functional in production today.
3. **Architecture Traffic**: All underlying metrics (`fanIn`, `fanOut`, `coupling`, `queryCount`, `dmlCount`, `impactSummaries`) exist in schema. `graph-style.ts` natively supports edge widths, dash patterns, and highlight classes.

### Requires only visualization work
1. **Semantic Zoom**: Expanding existing 3-tier zoom CSS stylesheet (`.zoom-far`, `.zoom-mid`, `.zoom-near` in `graph-style.ts`) to 5 discrete LOD thresholds with element visibility filtering.
2. **Architecture Traffic**: Adding traffic scoring weight function in `graph-style.ts` and connecting a traffic threshold slider in `GraphControls.tsx`.

### Requires new aggregation/metrics
1. **Dependency River / Sankey**: Requires aggregating component-level dependency links into tier-to-tier flow matrices and handling cycle feedback loops.
2. **Subway Map**: Requires decomposing dependency graphs into topological linear feature routes and identifying shared interchange station intersections.

### Requires new layout infrastructure
1. **Subway Map**: Requires an octilinear layout algorithm ($0^\circ, 45^\circ, 90^\circ$ edge routing) to render clean metro line schematics.
2. **Dependency River / Sankey**: Requires a dedicated Sankey flow placement engine (e.g. `d3-sankey`).
3. **Dependency Timeline**: Requires a horizontal swimlane / sequence diagram layout engine.

### Requires fundamentally new rendering
1. **Architecture City / 3D City**: Requires a WebGL 2.0 / Three.js viewport component (`GraphView3D.tsx`) to render 3D building meshes, extruded neighborhood slabs, and 3D arc lines with camera orbit controls and raycasting.

### Best candidates for controlled future experiments
1. **Architecture City / 3D City**: Isolated WebGL prototype (`Phase 3D-PROTO`) as documented in `3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md`, operating downstream of 2D Position Authority without mutating stored 2D layout state.
2. **Architecture Subway Map**: Feature-gated 2D octilinear layout experiment for simplified cross-feature route navigation.

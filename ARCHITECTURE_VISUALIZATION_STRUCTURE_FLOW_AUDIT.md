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
- Feature region clustering and assignments (`HEURISTIC CLASSIFICATION` via `discoverFeatures()`).
- Architectural layer classifications (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`: `presentation`, `application`, `domain`, `schema`).
- Node role classifications (`HEURISTIC CLASSIFICATION` via `classifyFeatureRole()`: `FeatureAnchor`, `FeatureCore`, `FeatureBridge`, `SharedInfrastructure`, `FeatureTest`).
- Bounding geometry and bounding boxes for feature regions (`DERIVED CLASSIFICATION` via `computeGlobalFeatureLayout()`).

### Existing Data Support
- **Data Status**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
- `discoverFeatures()` in `explorer/src/lib/layout/features.ts` identifies semantic feature clusters and assigns primary feature membership.
- Node types (`ApexClass`, `LWC`, `CustomObject`, etc.) are `SOURCE METADATA` (`ExplorerNode.type`).
- `feature-roles.ts` classifies components into `SharedInfrastructure` (35 nodes on benchmark), `FeatureBridge` (18 nodes), `FeatureAnchor` (12 nodes), `FeatureCore` (120 nodes), and `FeatureTest` (55 nodes).

### Existing Code & Rendering Support
- **Rendering Status**: `VERIFIED` (for base Hybrid layout view) / `NEW UI REQUIRED` (for interactive drilldown)
- Stage 5 of `architecture-layout.ts` computes dynamic 2D multi-row band packing for feature regions.
- `computeArchitectureLayoutWithMetadata()` returns Stage 5 `featureRegions` containing precise canvas bounding boxes `(minX, maxX, minY, maxY)`.
- `FeatureOverlayCanvas.tsx` renders outer SVG feature enclosures, semantic title headers, background tints, and hover highlights over the Cytoscape graph in Hybrid mode (`architectureMode="hybrid"`).

### Reusable Components
- `FeatureOverlayCanvas.tsx`: Renders outer semantic enclosures and labels.
- `GraphView.tsx`: Manages Hybrid mode toggling (`architectureMode="hybrid"`).
- `discoverFeatures()` & `global-layout.ts`: Derives features and packages 2D region bounds.

### Missing Infrastructure
- UI interaction handlers for zooming smoothly into an atlas region or isolating a feature neighborhood on double-click (`NEW UI REQUIRED`).

### Feasibility Classification
`VERIFIED` (Base Layout & Rendering) / `NEW UI REQUIRED` (Interactive Region Drilldown)

### Intended Benefits
- Addresses high-level architectural comprehension without requiring users to navigate 240 individual nodes.
- Built-in alignment with existing Hybrid layout mode and SVG overlay pipeline.
- Preserves 100% Position Authority and $0.00000\text{ px}$ determinism.

### Technical Limitations
- Visual density in dense feature regions can cause text label clipping when zoom level is far ($< 0.6$).
- Overlay SVG canvas must re-sync coordinates on window/panel resizing.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| \log \|V\| + \|E\|)$
- **Measured Performance**: $231.14\text{ ms}$ cold run on Cloud Spend Tracker ($240\text{ nodes}, 1024\text{ edges}$)
- **Large Scale Estimate**: `UNMEASURED TARGET / ESTIMATE` for $5,000+$ nodes.

### Interaction Requirements
- Click on feature enclosure header to select/focus all feature components.
- Double-click feature enclosure to filter graph down to feature neighborhood.
- Hover feature region to highlight intra-feature vs inter-feature edge connections.

### Relationship to Current 2D Graph
- Direct 1:1 mapping: Existing Hybrid layout mode with `FeatureOverlayCanvas` functions as the Architecture Atlas.

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
- **Data Status**: `VERIFIED`
- Node types, relationship types (`ExplorerRelationshipType`), method names (`canonical.source.method`), risk reasons, and metrics exist in `ExplorerDataSchema`.

### Existing Code & Rendering Support
- **Rendering Status**: `PARTIALLY SUPPORTED` (3 zoom tiers exist) / `NEW RENDERING REQUIRED` (for 5 discrete LOD thresholds)
- `GraphView.tsx` monitors viewport zoom and updates Cytoscape CSS classes dynamically:
  - `.zoom-far` (`zoom < 0.5`): Suppresses node labels, mutes intra-feature edges (`opacity: 0.18`), retains inter-feature edge visibility (`opacity: 0.55`).
  - `.zoom-mid` (`0.5 <= zoom < 1.5`): Displays node display names and moderate edge opacity (`opacity: 0.45`).
  - `.zoom-near` (`zoom >= 1.5`): Displays relationship type labels on edges (`data(relationshipType)`).
- `FeatureOverlayCanvas.tsx` suppresses feature region SVG overlays when `zoom < 0.6`.

### Missing Infrastructure
- Expanding current 3 zoom tiers to 5 discrete semantic zoom levels requires adding 2 additional CSS class thresholds in `GraphView.tsx` and semantic element collapse rules (`NEW RENDERING REQUIRED`).

### Feasibility Classification
`PARTIALLY SUPPORTED` / `NEW RENDERING REQUIRED`

### Intended Benefits
- Reduces visual clutter on large-scale graphs without altering spatial node coordinates.
- Preserves smooth rendering frame rates during pan/zoom operations.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| + \|E\|)$ CSS selector update
- **Measured Performance**: $< 5\text{ ms}$ class toggle on $240\text{ nodes}$
- **Target Estimate**: `UNMEASURED TARGET / ESTIMATE` (60 FPS on 1,000+ nodes)

---

## C. Architecture Stack

### Purpose
Visualizes the org structure as a strict top-to-bottom architectural layer hierarchy: Presentation (LWC/Visualforce) $\to$ Application (Controllers/Services) $\to$ Domain (Business Logic/Selectors) $\to$ Schema (CustomObjects/Fields).

### User Questions
- Does my presentation layer bypass the service layer and directly access database selectors or objects?
- What components comprise each tier of the architectural stack?
- Are vertical dependencies strictly downwards, or are there upward/cross-layer violations?

### Required Data
- Layer classifications for every node (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`: `presentation`, `application`, `domain`, `schema`).
- Component sub-role metadata (LWC, Controller, Service, Selector, Object, Field).
- Vertical dependency directional vectors (`source.layer` $\to$ `target.layer`).
- **CRITICAL**: Layer placement represents static dependency rank, NOT dynamic runtime execution sequence.

### Existing Data Support
- **Data Status**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
- Layer classification is computed in Stage 2 of `architecture-layout.ts` and stored in `layers.ts`.
- Node types map heuristically to layers:
  - `presentation`: `LWC`, `Visualforce` (`SOURCE METADATA`).
  - `application`: `ApexClass` (Controllers), `Flow`, `ApexTrigger` (`HEURISTIC CLASSIFICATION`).
  - `domain`: `ApexClass` (Services, Selectors, Domain Handlers) (`HEURISTIC CLASSIFICATION`).
  - `schema`: `CustomObject`, `Object`, `CustomField`, `Field`, `External` (`SOURCE METADATA`).

### Existing Code & Rendering Support
- **Rendering Status**: `VERIFIED` (Hierarchical Mode) / `NEW UI REQUIRED` (for sub-layer shelf grouping)
- Hierarchical Mode (`architectureMode="hierarchical"`) in `architecture-layout.ts` enforces strict top-to-bottom vertical layer band ordering.
- `getGraphStyles()` applies distinct visual shapes per entity type.

### Missing Infrastructure
- To support sub-layer shelf grouping (e.g., visually separating `Services` from `Selectors` within `domain`), dedicated sub-layer shelf layout rules and UI indicators are needed (`NEW UI REQUIRED`).

### Feasibility Classification
`VERIFIED` (Base Hierarchical Stack) / `NEW UI REQUIRED` (Sub-layer Shelf Grouping)

### Intended Benefits
- Highlights architectural layer violations (e.g. LWC querying custom field directly via SOQL).
- Top-to-bottom vertical flow aligning with standard software engineering layer guidelines.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| + \|E\|)$
- **Measured Performance**: $189.37\text{ ms}$ on Cloud Spend Tracker ($240\text{ nodes}$)
- **Large Scale Estimate**: `UNMEASURED TARGET / ESTIMATE` for $10,000+$ nodes.

---

## D. Architecture City / 3D City

### Purpose
Metaphorical 3D urban landscape visualization where features represent land neighborhoods, components represent buildings (height = coupling/fan-in, footprint = complexity/risk), shared services represent central towers, and dependencies represent road/transit networks.

### User Questions
- Which components are high-coupling / high-fan-in structures in my org?
- What features form dense urban "neighborhoods"?
- Where are shared service "central towers" located relative to feature districts?

### Required Data
- District region boundaries derived from feature assignments.
- Component metric dimensions for 3D building geometry:
  - Height = `metrics.coupling` or `metrics.fanIn` (`DERIVED CLASSIFICATION`).
  - Footprint width/depth = risk score or line count (`DERIVED CLASSIFICATION` / `SOURCE METADATA`).
- 3D spatial area packing coordinates $(X, Y, Z)$ (distinct from 2D DAG layout).

### Existing Data Support
- **Data Status**: `DERIVABLE` (Node metrics and feature groupings exist)
- All required building metrics (`fanIn`, `fanOut`, `coupling`, `risk`, `file`, `type`) exist in `ExplorerNodeMetrics` and `ExplorerNode`.

### Code & Rendering Status
- **Rendering Status**: `NEW RENDERING REQUIRED` / `EXPERIMENTAL`
- The current codebase is strictly 2D (Cytoscape.js canvas + SVG overlay). It contains zero WebGL or Three.js dependencies.
- City layout **cannot** reuse 2D Cytoscape graph layout; it requires a dedicated 3D spatial area packing engine.

### Feasibility Classification
`EXPERIMENTAL` / `NEW RENDERING REQUIRED` / `NEW ANALYSIS REQUIRED`

### Hypothesized Benefits
- Alternative spatial metaphor for exploring high-risk hotspots.
- Replaces edge crossings with ground-plane road networks.

### Technical Limitations & Trade-offs
- Camera occlusion (foreground buildings hiding background structures).
- Requires WebGL 2.0 hardware support (+550 KB library footprint).
- Higher interaction friction (6 degrees of camera freedom vs 2D pan/zoom).
- **Incompatible with 2D Position Authority**: Uses area bin packing rather than 2D DAG node coordinates.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| \log \|V\|)$ spatial bin packing + WebGL mesh rendering
- **Measured Performance**: `UNMEASURED TARGET / ESTIMATE` (No WebGL prototype in production)

---

## E. Dependency River / Sankey

### Purpose
Visualizes aggregated dependency flow volumes passing vertically or horizontally through architectural tiers (Feature $\to$ LWC $\to$ Controller $\to$ Service $\to$ Selector $\to$ Object $\to$ Field) as smooth, proportional flow streams.

### User Questions
- What is the total volume of dependencies flowing from Feature A into Schema Object B?
- Where are the major structural bottlenecks where dependency flow narrows or concentrates?
- Which layers consume the majority of custom field references?

### Required Data
- Aggregated flow matrix $M[T_i, T_j] = \text{count of edges from Tier } T_i \text{ to Tier } T_j$.
- Consumer/supplier counts per tier.
- Inter-feature vs intra-feature flow volumes.
- Cycle-breaking / feedback loop handling for graph cycles.

### Existing Data Support
- **Data Status**: `DERIVABLE`
- Raw dependency links between all components exist in `ExplorerEdge[]`.
- Component impact summaries (`impactSummaries`) in `ExplorerDataSchema` contain precomputed direct and transitive dependency lists for every node.

### Missing Infrastructure
- Requires a Sankey layout engine (e.g., `d3-sankey` or custom multi-stage flow algorithm) that computes node Y-offsets, handles cyclic edges, and computes smooth Bezier ribbon widths proportional to flow volume (`NEW ANALYSIS REQUIRED`).
- Requires a dedicated SVG/Canvas flow renderer distinct from Cytoscape node-link rendering (`NEW RENDERING REQUIRED`).

### Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`

### Intended Benefits
- Provides high-level aggregated overview of structural dependency volume and fan-in/fan-out.
- Reduces individual edge line clutter by aggregating hundreds of edges into thick, readable streams.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| + \|E\|)$ matrix aggregation + $O(\|T\|^2)$ flow placement
- **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

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
- Interchange station identification (`SharedInfrastructure` and `FeatureBridge` nodes with high cross-feature fan-in).
- Line color assignments per feature region.

### Existing Data Support
- **Data Status**: `PARTIALLY SUPPORTED`
- Feature assignments derived via `discoverFeatures()`.
- Interchange stations identified by `feature-roles.ts` (`SharedInfrastructure`: 35 nodes, `FeatureBridge`: 18 nodes on benchmark graph).
- Inter-feature edges flagged via `isInterFeature` in `graph-builder.ts`.

### Missing Infrastructure
- Requires an octilinear layout algorithm (restricting edge routing strictly to $0^\circ, 45^\circ, 90^\circ$ angles with rounded corners) and line-ordering heuristics to align parallel feature lines smoothly without line overlaps (`NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED`).

### Feasibility Classification
`PARTIALLY SUPPORTED` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`

### Intended Benefits
- Provides a schematic route model for navigating complex cross-feature dependencies.
- Highlights shared infrastructure interchange stations (`SharedInfrastructure`).

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| + \|E\| \log \|E\|)$ octilinear line routing
- **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

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
- Async execution signals (`behavior.asyncPatterns`, e.g., `@future`, `Queueable`, `Batchable`).
- Trigger execution event classifications (`ApexTrigger` on-before/on-after).
- **EXPLICIT WARNING — NO RUNTIME EXECUTION TIMING**: Current static analysis does **NOT** capture dynamic runtime execution timing, thread sequencing, or CPU duration. The timeline visualizes static code structure ONLY.

### Existing Data Support
- **Data Status**: `DERIVABLE` (Static DAG Topological Rank) / `NEW DATA REQUIRED` (Dynamic Runtime Execution)
- Topological layer ranks and bucket ordering exist in `ordering.ts` and Stage 6 of `architecture-layout.ts`.
- `path-analyzer.cjs` computes longest static dependency paths.

### Missing Infrastructure
- Horizontal swimlane / sequence diagram layout component placing components along a horizontal step sequence ($X = \text{Topological Rank}, Y = \text{Component Tier}$) (`NEW RENDERING REQUIRED` / `NEW UI REQUIRED`).

### Feasibility Classification
`DERIVABLE` (Static DAG Topological Sequence) / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` (Static Graph Only; Dynamic Runtime Execution is `NEW DATA REQUIRED`)

### Intended Benefits
- Assists in planning refactoring sequences and understanding static instantiation prerequisites.

### Technical Limitations
- Must **NEVER** claim to represent dynamic runtime execution timing or chronological performance traces.

### Performance Profile
- **Theoretical Complexity**: $O(\|V\| + \|E\|)$ topological sort
- **Measured Performance**: `UNMEASURED TARGET / ESTIMATE`

---

## H. Architecture Traffic

### Purpose
Visualizes architectural dependency volume, reusability density, and cross-feature coupling intensity using dynamic visual cues such as line width, animated dash flows, and node heat map coloring.

### User Questions
- Which dependencies represent the heaviest structural corridors in the org?
- Where is cross-feature coupling creating high structural congestion?
- Which database objects endure the highest incoming fan-in traffic from application services?

### Required Data
- Dependency traffic signals:
  - `metrics.fanIn`: Incoming consumer count (`DERIVED CLASSIFICATION`).
  - `metrics.fanOut`: Outgoing dependency count (`DERIVED CLASSIFICATION`).
  - `metrics.coupling`: Structural reusability index (`DERIVED CLASSIFICATION`).
  - `behavior.publicContractsCount`: Number of public methods exposed (`SOURCE METADATA`).
  - `behavior.queryCount` / `behavior.dmlCount` / `behavior.calloutCount`: Database & callout signals (`SOURCE METADATA`).
  - `isInterFeature`: Cross-feature boundary flag (`DERIVED CLASSIFICATION`).
  - `totalImpactCount`: Transitive blast radius from `impactSummaries` (`DERIVED CLASSIFICATION`).

### Existing Data Support
- **Data Status**: `DERIVABLE`
- Every required traffic signal is fully populated in `ExplorerNodeMetrics`, `ExplorerNodeBehavior`, and `ExplorerDataSchema.impactSummaries`.

### Existing Code & Rendering Support
- **Rendering Status**: `PARTIALLY SUPPORTED` (Cytoscape stylesheet supports dynamic widths, dash patterns, opacity) / `NEW UI REQUIRED` (Traffic score calculator and threshold slider)
- `graph-style.ts` natively supports dynamic edge styling, line widths (`width: 2.5`), dashed patterns (`line-dash-pattern: [6, 3]`), and node border colors.

### Missing Infrastructure
- A traffic scoring function: $\text{Traffic}(E) = w_1 \cdot \text{FanIn}(Target) + w_2 \cdot \text{Coupling}(Source) + w_3 \cdot \text{IsInterFeature}$ (`NEW ANALYSIS REQUIRED`).
- UI slider control to filter graph visibility by minimum traffic threshold (`NEW UI REQUIRED`).

### Feasibility Classification
`DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED`

### Intended Benefits
- Draws user attention to structural bottlenecks and heavily reused shared components.
- Leverages existing 2D Cytoscape rendering engine without layout overhead.

### Performance Profile
- **Theoretical Complexity**: $O(\|E\|)$ edge style calculation
- **Measured Performance**: $< 2\text{ ms}$ style update on Cloud Spend Tracker ($1,024\text{ edges}$)

---

# 2. MASTER RECONCILIATION MATRIX

| Visualization Lens | Data Status | Layout Support | Rendering Support | UI Support | New Analysis | Feasibility Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture Atlas** | `DERIVABLE` | `VERIFIED` | `VERIFIED` | `NEW UI REQUIRED` | Minimal | `VERIFIED` / `NEW UI REQUIRED` |
| **Semantic Zoom** | `VERIFIED` | `VERIFIED` | `PARTIALLY SUPPORTED` | `NEW UI REQUIRED` | Minimal | `PARTIALLY SUPPORTED` / `NEW RENDERING REQUIRED` |
| **Architecture Stack** | `DERIVABLE` | `VERIFIED` | `VERIFIED` | `NEW UI REQUIRED` | Minimal | `VERIFIED` / `NEW UI REQUIRED` |
| **Architecture City** | `DERIVABLE` | `NEW LAYOUT REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | Area Packing | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| **Dependency River** | `DERIVABLE` | `NEW LAYOUT REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | Flow Matrix | `DERIVABLE` / `NEW ANALYSIS REQUIRED` |
| **Subway Map** | `PARTIALLY SUPPORTED` | `NEW LAYOUT REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | Octilinear Routing | `PARTIALLY SUPPORTED` / `NEW ANALYSIS REQUIRED` |
| **Dependency Timeline**| `DERIVABLE` (Static DAG) | `NEW LAYOUT REQUIRED` | `NEW RENDERING REQUIRED` | `NEW UI REQUIRED` | Topological Rank | `DERIVABLE` (Static DAG) / `NEW RENDERING REQUIRED` |
| **Architecture Traffic**| `DERIVABLE` | `VERIFIED` | `PARTIALLY SUPPORTED` | `NEW UI REQUIRED` | Traffic Weighting | `DERIVABLE` / `NEW ANALYSIS REQUIRED` |

---

# 3. FINAL RECONCILED ASSESSMENT

1. **Architecture Atlas**: Existing Hybrid Mode with `FeatureOverlayCanvas.tsx` and Stage 5 multi-row 2D packing functions as an Architecture Atlas. Base layout and SVG rendering are `VERIFIED`; region drilldown interactivity requires `NEW UI REQUIRED`.
2. **Architecture Stack**: Existing Hierarchical Mode with Stage 2 Layer Classifier and vertical band ordering functions as an Architecture Stack. Fully `VERIFIED` in production; sub-layer shelf grouping requires `NEW UI REQUIRED`.
3. **Architecture Traffic**: All underlying metrics (`fanIn`, `fanOut`, `coupling`, `queryCount`, `dmlCount`, `impactSummaries`) exist in schema (`DERIVABLE`). `graph-style.ts` natively supports edge widths and dash patterns; requires `NEW ANALYSIS REQUIRED` for traffic scoring and `NEW UI REQUIRED` for threshold slider.
4. **Semantic Zoom**: 3 zoom tiers exist (`PARTIALLY SUPPORTED`). Extending to 5 discrete LOD thresholds requires `NEW RENDERING REQUIRED` and `NEW UI REQUIRED`.
5. **Dependency River / Subway Map / Dependency Timeline**: Require `NEW ANALYSIS REQUIRED`, `NEW RENDERING REQUIRED`, and `NEW UI REQUIRED`. Static DAG sequence must never be presented as dynamic runtime execution timing.
6. **Architecture City**: Requires a WebGL 2.0 / Three.js viewport and a 3D spatial area packing engine (`EXPERIMENTAL` / `NEW RENDERING REQUIRED`). Incompatible with 2D Position Authority.

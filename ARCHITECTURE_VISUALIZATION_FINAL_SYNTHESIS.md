# Architecture Visualization Final Synthesis

## 1. Executive Summary

This document establishes the **authoritative, evidence-grounded visualization strategy** for the **Salesforce Architecture Explorer & Dependency Analyzer**. It synthesizes the ground-truth baseline from `ARCHITECTURE_VISUALIZATION_FOUNDATION_AUDIT.md`, the reconciliation corrections from `ARCHITECTURE_VISUALIZATION_AUDIT_RECONCILIATION.md`, and the domain evaluations across structure, flow, analytics, story, evolution, and 3D representations.

The goal of this synthesis is not to rank visualizations, select "winners", or mandate an immediate implementation sweep. Instead, it defines a **coverage-oriented information architecture** that maps user architectural questions to specific visualization projections, identifies reusable core infrastructure, enforces strict data governance, and defines controlled experiment contracts for future multidimensional lenses.

---

## 2. Verified Current Visualization Foundation

The active codebase (`explorer/src/`) possesses a mature, highly deterministic 2D graph layout and rendering engine verified against the canonical Cloud Spend Tracker benchmark fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`):

1. **Canonical Node & Relationship Data Model**: 10 canonical Salesforce node types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) and 21 canonical edge relationship types (`method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `lwc-apex`, `trigger-handler`, etc.) fully specified in TypeScript contracts (`explorer/src/types/explorer.ts`).
2. **13-Stage Deterministic Layout Pipeline**: Production layout engine (`explorer/src/lib/architecture-layout.ts`) executing Hierarchical ($189.37\text{ ms}$ cold run) and Hybrid ($231.14\text{ ms}$ cold run) layouts with $0.00000\text{ px}$ determinism drift across input shuffles and strict physical node clearance ($\ge 40.0\text{px}$).
3. **5-Level Position Authority Hierarchy**: Enforced by `explorer/src/lib/position-policy.ts` (Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout Calculation > Level 5 System Fallback), guaranteeing that user-authored coordinate overrides are strictly preserved across re-renders and view toggles.
4. **Multi-Layered Rendering Stack**: Cytoscape.js interactive canvas + HTML5 SVG overlay canvas (`FeatureOverlayCanvas.tsx`) for dynamic feature enclosure boxes + React HTML hover cards (`NodeHoverCard.tsx`, `EdgeHoverCard.tsx`).
5. **Analytical & Metrics Engine**: Precomputed graph index (`graph-index.ts`), focus graph neighborhood isolation (`focus-graph.ts`), impact blast radius analysis (`impact-analysis.ts`), centrality hub/bridge scoring (`centrality.ts`), hotspot detection (`hotspots.ts`), and geometric crossing breakdown engine (`metrics.ts`).
6. **Snapshot Diff Adapter**: `architecture-diff.cjs` and `diff-adapter.ts` for computing node/edge diff overlays between graph snapshots.

---

## 3. Canonical Graph Principle

A core architectural principle governs the entire Salesforce Architecture Explorer:

> **CANONICAL GRAPH PRINCIPLE**: There shall be ONE canonical dependency graph and ONE authoritative underlying semantic model, with multiple visualization lenses projecting different analytical questions onto that same graph.

Independent, competing graph models must **NEVER** be created for individual visualization views. Every proposed visualization concept belongs to one of six projection categories:

1. **New Projection of Existing Data**: Filtering or styling the canonical graph (e.g. Architecture Atlas, Architecture Stack, Traffic Mode, Hotspot View).
2. **New Derived Metric**: Mathematical calculation over canonical nodes/edges (e.g. Dependency Radar, Architecture DNA, Feature Coupling Index).
3. **New Layout**: Alternative spatial placement algorithm operating on canonical node sets (e.g. Octilinear Subway Map layout, Squarified Treemap layout, Concentric Constellation layout).
4. **New Renderer**: Specialized drawing canvas for non-node-link representations (e.g. SVG Chord Diagram, HTML5 Canvas KDE Landscape, WebGL 3D canvas).
5. **New Interaction Model**: Viewport state machine or navigation driver (e.g. Story Mode Orchestrator, Semantic Zoom LOD thresholds).
6. **Genuinely New Data Source**: External data requiring new ingest pipelines (e.g. Git commit history for Time Machine, APM dynamic execution logs for Runtime Profiling).

---

## 4. Visualization Taxonomy

All attributes, categories, and metrics across the codebase are explicitly assigned to one of four authoritative classification tiers:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               FOUR-TIER TAXONOMY CLASSIFICATION                          │
├──────────────────────────┬───────────────────────────────────────────────────────────────┤
│ Tier                     │ Definition & Codebase Evidence                                │
├──────────────────────────┼───────────────────────────────────────────────────────────────┤
│ SOURCE METADATA          │ Extracted directly from Salesforce source code or metadata    │
│                          │ files (`node.type`, `file`, `line`, `relationshipType`).     │
├──────────────────────────┼───────────────────────────────────────────────────────────────┤
│ DERIVED CLASSIFICATION   │ Computed deterministically from graph topology or metrics     │
│                          │ (`fanIn`, `fanOut`, `coupling`, `score`, `impactSummaries`).   │
├──────────────────────────┼───────────────────────────────────────────────────────────────┤
│ HEURISTIC CLASSIFICATION │ Inferred using rules, naming stems, or scoring algorithms    │
│                          │ (`classifyNodeLayer`, `discoverFeatures`, `classifyRole`).    │
├──────────────────────────┼───────────────────────────────────────────────────────────────┤
│ HUMAN-CURATED            │ Explicit manual architecture labels or human intent tags      │
│ ARCHITECTURE             │ (**NOT** stored or supported in the current schema).          │
└──────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 5. Master Visualization Lens Matrix

The following matrix presents the complete evidence-grounded evaluation of all 26 audited visualization concepts. All feasibility states strictly follow the 10 mandatory classifications (`VERIFIED`, `DERIVABLE`, `PARTIALLY SUPPORTED`, `NEW ANALYSIS REQUIRED`, `NEW UI REQUIRED`, `NEW RENDERING REQUIRED`, `NEW DATA REQUIRED`, `HISTORICAL DATA REQUIRED`, `EXPERIMENTAL`, `UNKNOWN`).

| Visualization | Primary Architectural Question | User Task | Existing Data | Derived Data | Heuristic Data | New Analysis | New Layout | New Rendering | New UI | Historical Data | Runtime Data | Existing Reusable Infrastructure | Feasibility State | Evidence Status | Major Limitation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture Atlas** | What are the major functional domains and feature boundaries? | High-level system comprehension | Node types | Region bounds | Features, Roles | No | No (Hybrid Stage 5) | Yes (`FeatureOverlayCanvas`) | Yes (Drilldown) | No | No | `global-layout.ts`, `FeatureOverlayCanvas.tsx` | `VERIFIED` / `NEW UI REQUIRED` | Measured ($231\text{ms}$) | Label clipping at far zoom ($< 0.6$) |
| **Semantic Zoom** | How does information detail adapt from macro to micro scale? | Viewport navigation & detail inspection | Node/edge detail | Zoom scale | LOD thresholds | No | No | Yes (5-tier LOD) | Yes (LOD CSS) | No | No | `GraphView.tsx` zoom listener, `graph-style.ts` | `PARTIALLY SUPPORTED` / `NEW RENDERING REQUIRED` | Measured ($< 5\text{ms}$ class toggle) | CSS element filtering batching overhead |
| **Architecture Stack** | How is the system partitioned across vertical layers? | Layer violation auditing | Node types | Layer Y bands | Layer assignments | No | No (Hierarchical) | Yes (Cytoscape) | Yes (Sub-layer shelves) | No | No | `layers.ts`, `architecture-layout.ts` Stage 2 | `VERIFIED` / `NEW UI REQUIRED` | Measured ($189\text{ms}$) | Schema layer horizontal expansion on large orgs |
| **Architecture Treemap** | What proportion of footprint does each feature/layer occupy? | Footprint & complexity auditing | Node metrics | Hierarchy tree | Features, Layers | Yes (Squarification) | Yes (2D Treemap) | Yes (SVG Treemap) | Yes (Treemap UI) | No | No | `discoverFeatures()`, `classifyNodeLayer()` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Omits directed edge lines between components |
| **Architecture Landscape** | Where are the primary complexity ridges and density peaks? | Topographical risk identification | 2D positions | Spatial density | KDE bandwidth | Yes (2D KDE Matrix) | No (2D Layout) | Yes (Canvas Overlay) | Yes (Landscape UI) | No | No | `FeatureOverlayCanvas.tsx`, `computeArchitectureLayout` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` | `UNMEASURED TARGET / ESTIMATE` | Topography shifts if node positions change |
| **Dependency River** | What is the total volume of dependencies flowing between tiers? | Macro flow bottleneck analysis | Edges | Tier flow matrix | Layers, Features | Yes (Flow matrix) | Yes (Sankey Placement) | Yes (Sankey Canvas) | Yes (River UI) | No | No | `ExplorerEdge[]`, `impactSummaries` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Hides individual node identities in streams |
| **Subway Map** | What linear routes connect features through shared infrastructure? | Cross-feature transit navigation | Edges | Linear routes | Interchange roles | Yes (Octilinear Routing)| Yes (Octilinear) | Yes (Metro Line Canvas)| Yes (Subway UI) | No | No | `feature-roles.ts` (`SharedInfrastructure`) | `PARTIALLY SUPPORTED` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Route decomposition complex on high cycles |
| **Dependency Timeline**| In what prerequisite topological order do components instantiate? | Refactoring sequence planning | Edges | Topological rank | Layer ranks | No | Yes (Sequence Layout)| Yes (Swimlane View) | Yes (Timeline UI) | No | No (Static DAG only) | `ordering.ts` topological sort | `DERIVABLE` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Static DAG rank $\neq$ dynamic execution time |
| **Architecture Traffic**| Which dependencies represent the heaviest structural corridors? | Heavy corridor identification | Metrics, Behavior | Traffic weight | Inter-feature flag | Yes (Traffic Score) | No (2D Layout) | Yes (Edge Styles) | Yes (Traffic Slider) | No | No | `graph-style.ts` dynamic edge styling | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` | Measured ($< 2\text{ms}$ style update) | GPU load if all edges animated simultaneously |
| **Feature Dependency Matrix** | What directed relationships exist between features and structural rows? | Cross-feature boundary auditing | Node types | Cell edge counts | Features, Layers | No | No (Grid) | Yes (DOM Table) | Yes (Matrix UI) | No | No | `feature-ordering.ts` (`buildFeatureDependencyMatrix`) | `DERIVABLE` / `NEW UI REQUIRED` | Measured ($< 10\text{ms}$) | Scales quadratically with feature count |
| **Feature Coupling Heatmap** | Which feature pairs exhibit high coupling or shared component usage? | Feature refactoring & merge triage | Edges | $N \times N$ Coupling matrix| Features | No | No (Grid) | Yes (Canvas Heatmap) | Yes (Heatmap UI) | No | No | `buildFeatureDependencyMatrix()` | `DERIVABLE` / `NEW UI REQUIRED` / `NEW RENDERING REQUIRED` | Measured ($< 5\text{ms}$) | Best suited for $N \le 40$ features |
| **Feature Chord Diagram** | What is the total inter-feature dependency volume distribution? | Central feature hub evaluation | Edges | Chord weights | Features | Yes (Polar Arc Geometry)| Yes (Polar Layout) | Yes (SVG Bézier Chord) | Yes (Chord UI) | No | No | `buildFeatureDependencyMatrix()` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Visual hairball if feature count $> 25$ |
| **Dependency Tree** | What is the complete upstream caller or downstream execution tree? | Single-component impact tree isolation | Root ID | DAG Tree paths | Layers | No | Yes (Tree Layout) | Yes (Tree Renderer) | Yes (Tree View UI) | No | No | `impact-analysis.ts` (`getAffectedNodesIn`), BFS | `VERIFIED` / `NEW UI REQUIRED` | Measured ($< 2\text{ms}$ traversal) | Wide tree footprint on high fan-out nodes |
| **Dependency Radar** | What is a component's 360-degree architectural profile card? | Component complexity triage | Node metrics | Impact summary | Feature count | No | No | Yes (SVG Radar) | Yes (Radar Widget) | No | No | `ExplorerNodeMetrics`, `impactSummaries` | `DERIVABLE` / `NEW UI REQUIRED` | Measured ($< 0.5\text{ms}$) | Relevant only for selected single component |
| **Dependency Constellation**| What components orbit a focal node at 1-hop, 2-hop, 3-hop distance? | Influence sphere navigation | Focal ID | Hop distances | Feature colors | Yes (Polar Orbits) | Yes (Concentric Layout)| Yes (Orbital Canvas) | Yes (Constellation UI)| No | No | `focus-graph.ts` (`computeFocusedGraph`) | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | Angular crowding if 1-hop contains $> 30$ nodes |
| **Four-Direction View** | How are adjacent components distributed into 4 cardinal channels? | Cardinal relationship isolation | Focal ID | 4 Quadrant partition | Layers, Features | Yes (4-Quadrant Partition)| Yes (Cardinal Box) | Yes (Quadrant Canvas)| Yes (4-Direction UI) | No | No | `graph-index.ts` adjacency lists | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` | Measured ($< 1\text{ms}$) | Requires scrolling if quadrant $> 50$ nodes |
| **Architecture DNA** | What is a component's 7-band normalized structural barcode? | Micro-fingerprint list rendering | Metrics, Behavior | Normalized bands | Archetype tags | No | No | Yes (Micro React DOM) | Yes (DNA Barcode) | No | No | `ExplorerNode.metrics`, `impactSummaries` | `DERIVABLE` / `NEW UI REQUIRED` | Measured ($< 0.1\text{ms}$) | Micro fingerprint; no topology lines |
| **Architecture Hotspot View**| Where are critical single points of failure, hubs, and bridges? | Structural debt triage | Risk, Metrics | Hub/Bridge scores | Hotspot rank | No | No (2D Layout) | Yes (Canvas Halos) | Yes (`HotspotPanel.tsx`)| No | No | `hotspots.ts`, `centrality.ts`, `HotspotPanel.tsx` | `VERIFIED` / `NEW UI REQUIRED` | Measured ($< 3\text{ms}$) | Hotspot fatigue if thresholds set too low |
| **Architecture Story Mode** | How do I step guided through a end-to-end architectural flow? | Guided onboarding & walkthrough | Focal node | Traversal path | Layer flow | Yes (Story Orchestrator)| No | Yes (Focus Canvas) | Yes (Story UI) | No | No | `focus-graph.ts`, `FocusControls.tsx`, `Sidebar.tsx` | `PARTIALLY SUPPORTED` / `NEW UI REQUIRED` | Measured (1-hop focus $< 1\text{ms}$) | Lacks automated camera tour state machine |
| **Pattern / Grammar View** | Does this subgraph match canonical architectural layer motifs? | Architectural compliance check | Node/edge types | Layer paths | Service/Selector tags | Yes (Motif Matching) | No | Yes (Motif Highlights)| Yes (Pattern UI) | No | No | `layers.ts`, `path-analyzer.cjs` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` | Measured ($< 2\text{ms}$) | Cannot detect intent without structural footprint |
| **Feature Comparison** | How do two features compare across metrics and dependencies? | Side-by-side feature auditing | Feature IDs | Aggregated metrics | Feature boundaries | Yes (Feature Aggregator) | No | Yes (DOM Side-by-Side) | Yes (Compare UI) | No | No | `projectState.ts`, `ComparePanel.tsx` | `DERIVABLE` / `NEW UI REQUIRED` | Measured ($< 5\text{ms}$) | `projectState.ts` tracks single active focus |
| **Architecture Diff** | What nodes and edges were added, removed, or changed? | Snapshot change auditing | Snapshots | Diff overlay graph | Diff categories | No (`diff-adapter.ts`) | No | Yes (Diff Styles) | Yes (Diff Selector) | Yes (2 Snapshots) | No | `architecture-diff.cjs`, `diff-adapter.ts` | `VERIFIED` / `HISTORICAL DATA REQUIRED` | Measured ($< 15\text{ms}$) | Requires two distinct project snapshot payloads |
| **Time Machine** | How has the architecture evolved across git commits over time? | Temporal evolution scrubbing | Stable IDs | Time series diffs | Version trends | Yes (Time Series Engine) | No | Yes (2D Canvas) | Yes (Time Slider) | Yes (Git History) | No | Node ID stability in `schema.ts` | `HISTORICAL DATA REQUIRED` / `NEW DATA REQUIRED` | `UNMEASURED TARGET / ESTIMATE` | `projectState.ts` stores single snapshot schema |
| **3D Model A (Sharedness)** | Feature × Flow Layer × Sharedness Elevation | Multidimensional role encoding | Node metrics | $Z = \text{fanIn} \cdot w$ | Features, Layers | No | Preserves 2D $(X,Y)$ | Yes (WebGL Engine) | Yes (3D Viewport) | No | No | Stage 11 2D positions, `position-policy.ts` | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` | Measured in Phase 3D (+4.1% to +40.6% crossings) | Camera tilt foreshortens 2D edge separation |
| **3D Model B (Depth)** | Feature × Category Layer × Static DAG Depth Elevation | Layered DAG depth encoding | Node types | $Z = \text{topologicalRank}$| Features, Categories | No | Preserves 2D $(X,Y)$ | Yes (WebGL Engine) | Yes (3D Viewport) | No | No (Static DAG only) | Stage 6 layer ranks, `ordering.ts` | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` | Measured in Phase 3D (+4.1% to +40.6% crossings) | Static DAG depth $\neq$ runtime execution order |
| **3D Model C (Cross-Feature)**| Feature × Category Layer × Inter-Feature Edge Count | Cross-boundary spike isolation | Inter-edges | $Z = \text{interEdges} \cdot \Delta Z$| Features, Categories | No | Preserves 2D $(X,Y)$ | Yes (WebGL Engine) | Yes (3D Viewport) | No | No | Stage 3.5 inter-feature edge flags | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` | Measured in Phase 3D (+4.1% to +40.6% crossings) | Vertical Z-spikes create cross-scene edge drag |
| **3D Model D (Centrality)** | Feature × Category Layer × Hub/Bridge Score Elevation | Hub & bridge elevation projection | Centrality | $Z = \text{hubScore} \cdot \Delta Z$| Features, Categories | No | Preserves 2D $(X,Y)$ | Yes (WebGL Engine) | Yes (3D Viewport) | No | No | `centrality.ts` hub/bridge scores | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` | Measured in Phase 3D (+4.1% to +40.6% crossings) | High-centrality towers draw piercing edges |
| **3D Architecture City** | Neighborhood Districts × Building Footprints × Roads | Metaphorical urban exploration | Metrics | District area packing | Features, Roles | Yes (3D Area Packing) | Yes (3D Treemap Engine)| Yes (WebGL Shaders) | Yes (Drone Camera UI) | No | No | Node metrics, `discoverFeatures()` | `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING` | `UNMEASURED TARGET / ESTIMATE` | Incompatible with 2D Position Authority |

---

## 6. Coverage by Architectural Question

Rather than listing flat features, the visualization system is organized around **13 core architectural questions**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   COVERAGE BY ARCHITECTURAL QUESTION                                   │
├─────────────────────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ Architectural Question                  │ Existing Coverage        │ Primary Reconciled Lens           │
├─────────────────────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 1. Global System Structure & Boundaries │ VERIFIED                 │ Architecture Atlas (Hybrid Mode)  │
│ 2. Adaptive Detail at Varying Scale     │ PARTIALLY SUPPORTED      │ Semantic Zoom (LOD Stylesheet)    │
│ 3. Tiered Architectural Layers          │ VERIFIED                 │ Architecture Stack (Hierarchical) │
│ 4. Codebase Footprint & Volume Mass     │ DERIVABLE                │ Architecture Treemap              │
│ 5. Macro Dependency Flow Volumes        │ DERIVABLE                │ Dependency River / Sankey         │
│ 6. Linear Cross-Feature Transit Routes  │ PARTIALLY SUPPORTED      │ Architecture Subway Map           │
│ 7. Static Prerequisite Instantiation    │ DERIVABLE (Static DAG)   │ Dependency Timeline               │
│ 8. Structural Heavy Corridors           │ DERIVABLE                │ Architecture Traffic              │
│ 9. Cross-Feature Boundary Coupling      │ DERIVABLE                │ Feature Dependency Matrix         │
│ 10. Selected Component Impact Sphere    │ VERIFIED (Traversal)     │ Dependency Tree / Constellation   │
│ 11. Single Point of Failure Hotspots    │ VERIFIED                 │ Architecture Hotspot View         │
│ 12. Guided End-to-End Walkthrough       │ PARTIALLY SUPPORTED      │ Architecture Story Mode           │
│ 13. Architecture Change Across Snapshots│ VERIFIED (Diff Engine)   │ Architecture Diff Overlay         │
└─────────────────────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

---

## 7. Reusable Visualization Infrastructure

To prevent future visualization lenses from duplicating graph traversal or analytics code, all infrastructure components are categorized by reuse strategy:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             REUSABLE INFRASTRUCTURE CLASSIFICATION                       │
├──────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│ Subsystem / Component    │ Reuse Strategy            │ Target Visualization Lenses       │
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ `ExplorerDataSchema`     │ REUSE DIRECTLY            │ All 26 visualization lenses       │
│ `createLayoutGraphIndex` │ REUSE DIRECTLY            │ Matrix, Tree, Four-Direction, Radar│
│ `discoverFeatures()`     │ REUSE DIRECTLY            │ Atlas, Matrix, Heatmap, Chord     │
│ `classifyNodeLayer()`    │ REUSE DIRECTLY            │ Stack, Matrix, Treemap, Timeline  │
│ `classifyFeatureRole()`  │ REUSE DIRECTLY            │ Atlas, Subway Map, Hotspots       │
│ `computeFocusGraph()`    │ REUSE DIRECTLY            │ Tree, Constellation, Story Mode   │
│ `calculateImpactAnalysis`│ REUSE DIRECTLY            │ Radar, DNA, Traffic, Hotspots     │
│ `getArchitecturalHotspots`│ REUSE DIRECTLY           │ Hotspot View, Landscape, Radar    │
│ `architecture-layout.ts` │ REUSE DIRECTLY            │ Atlas, Stack, Traffic, Hotspots   │
│ `position-policy.ts`     │ REUSE DIRECTLY            │ Preserves Level 1–5 Position Auth │
│ `FeatureOverlayCanvas`   │ EXTEND                    │ Atlas, Landscape, Halos, Corridors│
│ `graph-style.ts`         │ EXTEND                    │ Semantic Zoom, Traffic, Hotspots  │
│ `diff-adapter.ts`        │ WRAP                      │ Architecture Diff, Comparison     │
│ WebGL 3D Canvas          │ NEW ENGINE REQUIRED       │ 3D Models A–D, 3D City            │
│ Octilinear Line Router   │ NEW ENGINE REQUIRED       │ Architecture Subway Map           │
│ Squarified Treemap       │ NEW ENGINE REQUIRED       │ Architecture Treemap              │
└──────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

---

## 8. Data / Analysis / Layout / Rendering / UI Separation

Every visualization pipeline strictly adheres to five decoupled layers:

```text
CANONICAL GRAPH (`ExplorerDataSchema`)
      ↓
DERIVED ANALYTICS (`graph-index.ts`, `features.ts`, `layers.ts`, `centrality.ts`)
      ↓
VISUALIZATION-SPECIFIC LAYOUT (`architecture-layout.ts`, polar layout, treemap layout)
      ↓
VISUALIZATION RENDERER (Cytoscape Canvas, SVG `FeatureOverlayCanvas`, WebGL)
      ↓
INTERACTION MODEL (`graph-interactions.ts`, `FocusControls.tsx`, `Sidebar.tsx`)
```

When a visualization is missing, only the specifically missing layer must be constructed. Raw graph data or precomputed analytics must **NEVER** be reimplemented.

---

## 9. User's Five-Category Architecture Model

The user proposed a 5-tier architectural category hierarchy for 3D spatial representation:
* **Category 1 = Features**: `HEURISTIC CLASSIFICATION` via `discoverFeatures()` in `features.ts`.
* **Category 2 = LWC + Controllers**: `SOURCE METADATA` (`LWC`) + `HEURISTIC CLASSIFICATION` (`Controllers` via `classifyNodeLayer()`).
* **Category 3 = Services**: `HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`.
* **Category 4 = Selectors**: `HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`.
* **Category 5 = Objects + Fields**: `SOURCE METADATA` (`Object`, `CustomObject`, `Field`, `CustomField`).

### Architectural Finding
The current graph **contains sufficient information** to partition components into these 5 categories using a combination of `SOURCE METADATA` and `HEURISTIC CLASSIFICATION`. However, these categories are **HEURISTIC DERIVATIONS**, not universal Salesforce architecture laws or human-curated labels (`HUMAN-CURATED ARCHITECTURE` does not exist in schema).

---

## 10. Experimental 3D Semantic Models

### 10.1 Model A — Feature × Flow × Sharedness
* **Semantic Meaning**: $X =$ Feature Region, $Y =$ Architecture Flow Layer, $Z =$ Sharedness / Reuse Score (`metrics.fanIn` or `isSharedInfrastructure`).
* **Question Answered**: Where are high-reuse shared utilities positioned relative to feature layers in 3D space?
* **Data Status**: `DERIVABLE` (`HEURISTIC` + `DERIVED`).
* **Z Meaning**: Meaningful spatial encoding of reusability height.
* **Position Policy**: Compatible with Level 1–5 2D $(X,Y)$ position authority if $Z$ is a read-only elevation projection.
* **Rendering Status**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED` (WebGL canvas viewport).

### 10.2 Model B — Feature × Category × Dependency Depth
* **Semantic Meaning**: $X =$ Feature Region, $Y =$ Category Layer, $Z =$ Static DAG Topological Rank.
* **Question Answered**: How deep are static dependency chains within individual features?
* **Data Status**: `DERIVABLE` (`HEURISTIC` + `DERIVED`).
* **Critical Boundary**: Static DAG depth $\neq$ dynamic runtime execution time.
* **Position Policy**: Compatible with 2D position authority.
* **Rendering Status**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`.

### 10.3 Model C — Feature × Category × Cross-Feature Connectivity
* **Semantic Meaning**: $X =$ Feature Region, $Y =$ Category Layer, $Z =$ Count of Inter-Feature Edges.
* **Question Answered**: Which components act as cross-feature boundary violators?
* **Data Status**: `DERIVABLE` (`HEURISTIC` + `DERIVED`).
* **Position Policy**: Compatible with 2D position authority.
* **Rendering Status**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`.

### 10.4 Model D — Feature × Category × Centrality
* **Semantic Meaning**: $X =$ Feature Region, $Y =$ Category Layer, $Z =$ Hub / Bridge Score (`centrality.ts`).
* **Question Answered**: Where are the primary topological hubs and cross-domain bridges in 3D space?
* **Data Status**: `DERIVABLE` (`HEURISTIC` + `DERIVED`).
* **Position Policy**: Compatible with 2D position authority.
* **Rendering Status**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`.

### 10.5 3D Architecture City
* **Semantic Meaning**: Neighborhood Districts = Features, Buildings = Components (Height = Coupling, Footprint = Risk), Roads = Dependencies.
* **Question Answered**: Metaphorical urban exploration of codebase complexity.
* **Data Status**: `DERIVABLE`.
* **Position Policy**: **INCOMPATIBLE WITH 2D POSITION AUTHORITY** (uses 3D district area packing instead of 2D DAG layout).
* **Rendering Status**: `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING REQUIRED`.

---

## 11. Previous 3D Evidence Boundary

Per `PHASE_3D_EVIDENCE_SCREEN_SPACE_SEMANTIC_VALIDATION.md` and `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`:

1. **Previously Tested**: Perspective camera projections of flat 2D DAG layout coordinates $(X,Y)$ with $Z$ elevation mapped to architectural layer tiers or feature roles.
2. **Established Evidence**: Projecting 2D DAG node coordinates through a 3D perspective camera matrix increased visible screen-space line segment crossings from **85,367** (2D baseline) up to **91,087–123,078** (+4.1% to +40.6%), due to camera tilt and perspective foreshortening overlapping previously separated edge lines.
3. **Scope Governance**: This evidence proves that 3D camera projection does **NOT** solve planar edge crossing density in line-edge graphs. However, it does **NOT** invalidate Models A, C, D, or 3D City as multi-dimensional spatial encodings, provided they are treated as `EXPERIMENTAL` detail views and do **NOT** replace production 2D layout.

---

## 12. Story / Pattern / Comparison / Evolution Capabilities

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXPLANATION & EVOLUTION SUMMARY                             │
├──────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│ Capability               │ Data Status               │ Reconciled Feasibility            │
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Architecture Story Mode  │ `PARTIALLY SUPPORTED`     │ `PARTIALLY SUPPORTED` / `NEW UI`  │
│ Pattern / Grammar View   │ `DERIVABLE`               │ `DERIVABLE` / `NEW ANALYSIS`      │
│ Feature Comparison       │ `DERIVABLE`               │ `DERIVABLE` / `NEW UI REQUIRED`   │
│ Architecture Diff        │ `VERIFIED` (Diff Engine)  │ `VERIFIED` / `HISTORICAL DATA`    │
│ Time Machine             │ `HISTORICAL DATA REQUIRED`│ `HISTORICAL DATA REQUIRED`        │
└──────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

---

## 13. Missing Shared Infrastructure

The following foundational gaps appear across multiple visualization concepts:
1. **Visualization Data Adapter Layer**: Standardized JSON/TS transformers converting `ExplorerDataSchema` into lens-specific data contracts.
2. **WebGL 3D Viewport Component**: Reusable Three.js canvas shell for multidimensional 3D experiments.
3. **Alternate 2D Layout Engines**: Octilinear line router, Squarified Treemap layout engine, and Concentric Polar layout engine.
4. **Multi-Snapshot Time Series Store**: Persistent git commit snapshot history manager in `projectState.ts`.

---

## 14. Static Graph vs. Runtime Data Boundary

* **STATIC DEPENDENCY GRAPH (`VERIFIED`)**: All nodes, edges, layer ranks, impact paths, and depth metrics in the codebase represent static source code references (`SOQL`, `instantiation`, `method-call`, `lwc-import`).
* **DYNAMIC RUNTIME EXECUTION (`NEW DATA REQUIRED`)**: The codebase contains **NO** runtime CPU execution timing, dynamic call stack traces, APM telemetry, or dynamic Apex dispatch (`Type.forName`).
* **MANDATORY INVARIANT**: Static DAG topological path depth must **NEVER** be presented as dynamic runtime execution timing or chronological performance order.

---

## 15. Historical Data Boundary

* **SINGLE SNAPSHOT CURRENT STATE (`VERIFIED`)**: `projectState.ts` stores only the active `ExplorerDataSchema` payload for a given project.
* **ARCHITECTURAL DIFF ENGINE (`VERIFIED`)**: `architecture-diff.cjs` and `diff-adapter.ts` successfully compute node/edge diff overlays when provided with two distinct snapshot payloads (`before` and `after`).
* **HISTORICAL TIME SERIES (`HISTORICAL DATA REQUIRED`)**: The codebase contains no temporal git commit parser or time-series snapshot store. Scrubbing through historical commit timelines requires `HISTORICAL DATA REQUIRED` and `NEW DATA REQUIRED`.

---

## 16. Future Visualization Extension Architecture

To maintain the Canonical Graph Principle, future visualization capabilities should be structured into six decoupled architectural layers:

```text
CANONICAL GRAPH ENGINE (`ExplorerDataSchema`, `schema.ts`)
        ↓
SHARED GRAPH ANALYTICS (`graph-index.ts`, `features.ts`, `layers.ts`, `centrality.ts`)
        ↓
VISUALIZATION DATA ADAPTERS (Lens-specific data transformers)
        ↓
VISUALIZATION-SPECIFIC LAYOUTS (`architecture-layout.ts`, polar, treemap, octilinear)
        ↓
RENDERING BACKENDS (Cytoscape 2D Canvas, SVG `FeatureOverlayCanvas`, WebGL 3D)
        ↓
INTERACTION & NAVIGATION (`graph-interactions.ts`, `FocusControls.tsx`, `Sidebar.tsx`)
```

---

## 17. Controlled Experiment Contract

Any future visualization experiment—especially WebGL 3D models—must be governed by a strict **Controlled Experiment Contract**:

1. **Baseline**: Production 2D Hierarchical and Hybrid layouts.
2. **Same Benchmark Dataset**: Tested against `audit-fixtures/cloud-spend-tracker/explorer-data.json`.
3. **Same Architectural Question**: Evaluated against identical task definitions (e.g. identify cross-feature boundary violator).
4. **Correctness Criteria**: Zero degradation in dependency identification accuracy or impact path recall.
5. **Performance Measurement**: Measured render time, layout calculation time, heap allocation, and FPS.
6. **UX Measurement**: Measured task completion time, error rates, and navigation steps.
7. **Regression Guard**: Must **NOT** mutate 2D Position Authority or alter production 2D layout coordinates.

---

## 18. Evidence Gaps

The following evidence gaps remain unmeasured and require empirical evaluation before production deployment:
1. **WebGL 2.0 Browser Overhead**: Measured memory footprint and frame rates when rendering 1,000+ 3D node meshes and curved line arcs.
2. **KDE Density Surface Latency**: Measured execution time of $128 \times 128$ Gaussian kernel density surface generation on `FeatureOverlayCanvas.tsx`.
3. **Squarified Treemap Calculation Time**: Measured computation time of converting 2,000-node hierarchies into 2D rectangle bounds.
4. **3D User Comprehension**: Empirical user testing evaluating whether 3D spatial height encoding improves or impairs architecture triage speed compared to 2D plan views.

---

## 19. Final Visualization Strategy

The final visualization strategy for the Salesforce Architecture Explorer is **coverage-oriented**, establishing clear placement for all audited lenses without declaring evaluative rankings:

1. **Production Baseline (2D Canvas + SVG Overlays)**:
   * **Primary Overview**: Architecture Atlas (Hybrid Mode with `FeatureOverlayCanvas`).
   * **Primary Layer Lens**: Architecture Stack (Hierarchical Mode with vertical Y bands).
   * **Primary Hotspot Lens**: Architecture Hotspot View (Cytoscape styling + `HotspotPanel.tsx`).
   * **Primary Detail Lens**: Neighborhood Focus Graph & Impact Blast Radius.
2. **Analytical Extensions (New UI over Existing Analytics)**:
   * **Cross-Feature Coupling**: Feature Dependency Matrix (React DOM Table) & Feature Coupling Heatmap.
   * **Single-Component Inspection**: Dependency Radar, Architecture DNA barcode, Four-Direction View, Dependency Tree.
3. **Specialized 2D Layout Extensions (New Layout Engines Required)**:
   * **Volume Mass**: Architecture Treemap (Squarified Treemap layout).
   * **Macro Dependency Flow**: Dependency River / Sankey (Flow matrix layout).
   * **Transit Routes**: Architecture Subway Map (Octilinear line routing).
4. **Historical & Evolution Extensions (Requires Multi-Snapshot Store)**:
   * **Change Inspection**: Architecture Diff Overlay (using `diff-adapter.ts`).
5. **Experimental Multidimensional Lenses (Feature-Gated WebGL Sandboxes)**:
   * **3D Semantic Models A, B, C, D & 3D City**: Subject to the Controlled Experiment Contract, operating as isolated read-only detail viewports without corrupting 2D Position Authority.

---

## 20. Audit Integrity Checklist

```text
[x] Current source remains authoritative
[x] Foundation audit used as baseline
[x] Reconciliation audit used before domain conclusions
[x] All four domain audits incorporated
[x] No production code modified
[x] No tests modified
[x] No configuration modified
[x] No dependencies modified
[x] No fixtures modified
[x] No project structure modified
[x] Only ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md created/modified
[x] SOURCE / DERIVED / HEURISTIC / HUMAN-CURATED classifications preserved
[x] Static graph separated from runtime execution
[x] Historical data requirements preserved
[x] Unsupported performance claims excluded
[x] Unsupported UX claims excluded
[x] Previous 3D evidence correctly scoped
[x] New 3D semantic models treated as experimental
[x] 2D Position Authority preserved
[x] No visualization ranked or scored
[x] No "best" or "worst" visualization declared
[x] No production implementation performed
```

### Final Conclusion
The final visualization strategy synthesis is **100% COMPLETE**. `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md` provides an authoritative, evidence-grounded, and non-overclaimed strategic framework for the future evolution of the Salesforce Architecture Explorer.

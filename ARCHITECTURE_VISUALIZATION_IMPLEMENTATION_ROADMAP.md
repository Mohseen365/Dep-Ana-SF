# Architecture Visualization Implementation Roadmap

## 1. Executive Summary

This document establishes a **read-only, evidence-grounded implementation roadmap** for the future evolution of the Salesforce Architecture Explorer visualization system. It converts the approved strategy in `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md` and its verification in `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS_INTEGRITY_AUDIT.md` into a concrete, dependency-aware execution plan.

The roadmap answers all architectural prerequisites, shared infrastructure dependencies, layout/rendering requirements, historical/runtime data boundaries, experimental 3D isolation rules, and validation gates required for phased execution.

> **THIS DOCUMENT IS A PLANNING ARTIFACT ONLY. IT DOES NOT AUTHORIZE IMPLEMENTATION.**
> No source code, tests, configuration, dependencies, fixtures, or existing audit files have been modified.

---

## 2. Implementation Planning Principles

1. **Canonical Graph Principle**: There shall remain exactly ONE canonical dependency graph model (`ExplorerDataSchema`). Every visualization lens is a projection, derivation, layout, or rendering layer over this canonical graph.
2. **Strict Layer Decoupling**: Implementation work is explicitly assigned across 6 architecture layers: Canonical Graph Engine $\to$ Shared Graph Analytics $\to$ Visualization Data Adapters $\to$ Visualization-Specific Layouts $\to$ Rendering Backends $\to$ Interaction & Navigation.
3. **Prerequisite Shared Infrastructure First**: Shared data adapters and analytics must be constructed before individual visualization lenses to maximize reuse and prevent code duplication.
4. **No Evaluative Ranking**: Visualization lenses are ordered strictly by dependency order, technical reuse, and architectural prerequisite, never by subjective quality ("best", "worst", "winner", "loser").
5. **Experimental 3D Isolation**: All WebGL 3D work remains in an isolated experimental track operating over read-only 2D coordinates without corrupting 2D Position Authority or altering the production 2D baseline.
6. **Strict Semantic Boundaries**:
   * Static DAG topological depth is strictly decoupled from dynamic runtime execution order.
   * Single-snapshot diff capabilities are strictly decoupled from multi-snapshot git commit time-series stores.
7. **Evidence-Grounded Performance & Validation**: Every phase defines explicit validation gates (GATES A–H), performance measurement rules, and regression boundaries.

---

## 3. Current Baseline

The verified production baseline consists of:

* **Canonical Graph Schema**: `explorer/src/types/explorer.ts` (`ExplorerNode`, `ExplorerEdge`, `ExplorerSummary`, `ExplorerNodeMetrics`, `impactSummaries`).
* **13-Stage Deterministic Layout Engine**: `explorer/src/lib/architecture-layout.ts` executing Hierarchical ($189.37\text{ ms}$ cold run) and Hybrid ($231.14\text{ ms}$ cold run) layouts with $0.00000\text{ px}$ determinism drift across input shuffles and physical node clearance $\ge 40.0\text{px}$.
* **5-Level Position Authority Hierarchy**: `explorer/src/lib/position-policy.ts` enforcing Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout Calculation > Level 5 System Fallback.
* **Rendering Architecture**: Cytoscape.js 2D Canvas + HTML5 SVG `FeatureOverlayCanvas.tsx` for enclosure boxes + HTML Hover Cards.
* **Precomputed Graph Analytics**: `graph-index.ts`, `focus-graph.ts`, `impact-analysis.ts`, `centrality.ts`, `hotspots.ts`, `metrics.ts`, `features.ts`, `layers.ts`, `feature-roles.ts`.
* **Diff Adapter**: `architecture-diff.cjs` and `diff-adapter.ts` for two-snapshot diff overlays.

---

## 4. Target Visualization Architecture

Future visualization extensions will strictly follow a 6-layer decoupled target architecture:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             6-LAYER TARGET VISUALIZATION ARCHITECTURE                    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. CANONICAL GRAPH ENGINE      │ ExplorerDataSchema, schema validation, graph index      │
├────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 2. SHARED GRAPH ANALYTICS      │ features, layers, centrality, hotspots, impact, metrics │
├────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 3. VISUALIZATION DATA ADAPTERS │ Lens-specific JSON/TS data contracts & transformers     │
├────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 4. VISUALIZATION LAYOUTS       │ architecture-layout (2D), polar, treemap, octilinear    │
├────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 5. RENDERING BACKENDS          │ Cytoscape 2D Canvas, SVG FeatureOverlayCanvas, WebGL 3D │
├────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 6. INTERACTION & NAVIGATION    │ graph-interactions, FocusControls, Sidebar, Story UI    │
└────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. Shared Infrastructure Dependencies

### Existing Reusable Infrastructure

* `ExplorerDataSchema` (`explorer/src/types/explorer.ts`): Primary graph data contract.
* `createLayoutGraphIndex` (`graph-index.ts`): $O(1)$ node/edge adjacency indexing.
* `discoverFeatures()` (`features.ts`): Heuristic semantic feature clustering.
* `classifyNodeLayer()` (`layers.ts`): 4-tier layer classification (`presentation`, `application`, `domain`, `schema`).
* `classifyFeatureRole()` (`feature-roles.ts`): Feature role assignment.
* `computeFocusGraph()` (`focus-graph.ts`): $k$-hop neighborhood extraction.
* `calculateImpactAnalysis()` (`impact-analysis.ts`): Upstream/downstream blast radius.
* `getArchitecturalHotspots()` (`hotspots.ts`): Centrality and coupling hotspot scoring.
* `architecture-layout.ts`: 13-stage deterministic 2D layout calculation.
* `position-policy.ts`: 5-level Position Authority preservation.
* `FeatureOverlayCanvas.tsx`: SVG enclosure rendering engine.
* `graph-style.ts`: Cytoscape stylesheet selectors and LOD rules.
* `diff-adapter.ts`: Two-snapshot diff overlay converter.

### Missing Shared Infrastructure (To Be Built in Phase 1 & 5)

1. **Visualization Data Adapter Layer** (Phase 1): Standardized contract transformers (`AdapterRegistry`, lens-specific schema definitions).
2. **WebGL 3D Viewport Component** (Phase 6): Isolated Three.js/WebGL canvas shell for 3D experiments.
3. **Alternate 2D Layout Engines** (Phase 3): Octilinear line router (Subway Map), Squarified Treemap layout engine, Concentric Polar layout engine.
4. **Multi-Snapshot Time Series Store** (Phase 5): Multi-commit history store in `projectState.ts`.

---

## 6. Implementation Dependency Graph

```text
                               ┌─────────────────────────────────────────┐
                               │       PHASE 0: Baseline & Contracts     │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │  PHASE 1: Shared Data Adapter Layer     │
                               └────────────────────┬────────────────────┘
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   ▼                                ▼                                ▼
┌─────────────────────────────────────┐ ┌────────────────────────┐ ┌──────────────────────────────────┐
│  PHASE 2: 2D Analytical Extensions  │ │  PHASE 3: Specialized  │ │ PHASE 5: Historical Evolution    │
│ (Matrix, Heatmap, Radar, Tree, DNA, │ │      2D Layout Engines │ │ (Multi-Snapshot Store,           │
│  Four-Direction, Hotspots, Atlas)   │ │ (Treemap, River, Subway│ │  Time Machine)                   │
└──────────────────┬──────────────────┘ └───────────┬────────────┘ └─────────────────┬────────────────┘
                   │                                │                                │
                   └────────────────────────────────┼────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ PHASE 4: Story / Comparison / Explaining│
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ PHASE 6: Experimental 3D Infrastructure │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ PHASE 7: Controlled 3D Model Experiments│
                               │           (Models A, B, C, D)           │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ PHASE 8: Cross-Visualization Integration│
                               └─────────────────────────────────────────┘
```

---

## 7. Phase 0 — Baseline & Contracts

### Objective
Lock production contracts, baseline metrics, test suites, and schema validation gates before introducing any new visualization data adapters or UI components.

### Architectural Layer
Canonical Graph Engine / Shared Graph Analytics.

### Infrastructure Reused & Required
* **Reused**: `ExplorerDataSchema`, `schema.ts`, `architecture-layout.ts`, `position-policy.ts`.
* **Required**: Formal contracts for `VisualizationAdapter` interface.

### Capabilities Unlocked
Guaranteed zero regression boundary for all downstream phases.

### Phase 0 Implementation Units

```text
Implementation Unit: UNIT-001-CONTRACTS
Purpose: Lock baseline visualization data contracts and adapter interfaces
Architectural Layer: Canonical Graph Engine
Inputs: explorer/src/types/explorer.ts
Outputs: explorer/src/types/visualization-adapter.ts
Existing Infrastructure: ExplorerDataSchema, ExplorerNode, ExplorerEdge
New Infrastructure: VisualizationAdapter<TInput, TOutput> interface
Dependencies: None
Likely Files: explorer/src/types/visualization-adapter.ts, explorer/src/lib/schema.ts
Validation: GATE A (Source/API correctness), GATE B (Data correctness)
Regression Boundary: Deterministic layout, 2D coordinates, Position Authority, schema validation
Exit Criteria: TypeScript compilation succeeds; 0.00000 px coordinate drift on baseline tests

Implementation Unit: UNIT-002-BENCHMARK-HARNESS
Purpose: Establish automated performance benchmark and telemetry recording harness
Architectural Layer: Shared Graph Analytics
Inputs: audit-fixtures/cloud-spend-tracker/explorer-data.json
Outputs: Performance ledger test runner
Existing Infrastructure: metrics.ts, evaluate-layout.ts
New Infrastructure: Automated performance recording utility
Dependencies: UNIT-001-CONTRACTS
Likely Files: explorer/src/test/benchmark-harness.test.ts
Validation: GATE F (Performance measurement), GATE G (Regression validation)
Regression Boundary: Cold layout timing <= 250ms on Cloud Spend Tracker
Exit Criteria: Cold layout timing and memory footprint logged deterministically
```

---

## 8. Phase 1 — Shared Visualization Data Infrastructure

### Objective
Construct the Visualization Data Adapter layer to transform canonical graph schema into standardized lens-specific payloads without duplicating graph analytics or layout calculations.

### Architectural Layer
Visualization Data Adapters.

### Infrastructure Reused & Required
* **Reused**: `graph-index.ts`, `features.ts`, `layers.ts`, `centrality.ts`, `hotspots.ts`, `impact-analysis.ts`.
* **Required**: Lens-specific adapter functions (`matrix-adapter.ts`, `tree-adapter.ts`, `radar-adapter.ts`, `dna-adapter.ts`).

### Capabilities Unlocked
Decoupled data layer serving all 2D analytical extensions and specialized layouts.

### Phase 1 Implementation Units

```text
Implementation Unit: UNIT-101-MATRIX-ADAPTER
Purpose: Provide clean JSON adapter for Feature Dependency Matrix and Coupling Heatmap
Architectural Layer: Visualization Data Adapters
Inputs: ExplorerDataSchema, features.ts, feature-ordering.ts
Outputs: FeatureMatrixData contract (N x N feature coupling counts)
Existing Infrastructure: buildFeatureDependencyMatrix()
New Infrastructure: FeatureMatrixAdapter
Dependencies: UNIT-001-CONTRACTS
Likely Files: explorer/src/lib/adapters/matrix-adapter.ts
Validation: GATE A, GATE B
Regression Boundary: Canonical graph immutability; O(N^2) computation < 10ms for N <= 50
Exit Criteria: Matrix adapter passes unit test assertions against Cloud Spend fixture

Implementation Unit: UNIT-102-TREE-ADAPTER
Purpose: Transform single-component k-hop paths into hierarchical tree structures
Architectural Layer: Visualization Data Adapters
Inputs: ExplorerDataSchema, impact-analysis.ts, focus-graph.ts
Outputs: DependencyTreeData contract (root-anchored execution tree)
Existing Infrastructure: getAffectedNodesIn(), computeFocusedGraph()
New Infrastructure: DependencyTreeAdapter
Dependencies: UNIT-001-CONTRACTS
Likely Files: explorer/src/lib/adapters/tree-adapter.ts
Validation: GATE A, GATE B
Regression Boundary: BFS/DFS traversal produces zero cyclic infinite loops
Exit Criteria: Tree adapter converts DAG paths into tree payload in < 2ms

Implementation Unit: UNIT-103-RADAR-DNA-ADAPTER
Purpose: Transform node metrics into 360-degree radar profiles and 7-band DNA barcodes
Architectural Layer: Visualization Data Adapters
Inputs: ExplorerNodeMetrics, centrality.ts, hotspots.ts
Outputs: ComponentProfileData contract
Existing Infrastructure: ExplorerNode.metrics, calculateImpactAnalysis()
New Infrastructure: ComponentProfileAdapter
Dependencies: UNIT-001-CONTRACTS
Likely Files: explorer/src/lib/adapters/profile-adapter.ts
Validation: GATE A, GATE B
Regression Boundary: Metric normalization strictly bounded in [0.0, 1.0]
Exit Criteria: Profile adapter extracts 7-band normalized vector in < 0.5ms per node
```

---

## 9. Phase 2 — Existing 2D Analytical Extensions

### Objective
Deliver high-value 2D analytical visualization lenses by wrapping existing graph analytics with React DOM UI and Cytoscape style enhancements.

### Architectural Layer
Rendering Backends / Interaction & Navigation.

### Infrastructure Reused & Required
* **Reused**: All Phase 1 Data Adapters, `FeatureOverlayCanvas.tsx`, `graph-style.ts`, `HotspotPanel.tsx`, `Sidebar.tsx`.
* **Required**: `FeatureMatrixPanel.tsx`, `CouplingHeatmapCanvas.tsx`, `DependencyTreePanel.tsx`, `DependencyRadarWidget.tsx`, `ArchitectureDNABarcode.tsx`, `FourDirectionView.tsx`.

### Capabilities Unlocked
Feature Matrix, Coupling Heatmap, Dependency Radar, Architecture DNA, Dependency Tree, Four-Direction View, Hotspot Halos, Atlas Enclosures, Semantic Zoom LOD.

### Phase 2 Implementation Units

```text
Implementation Unit: UNIT-201-MATRIX-HEATMAP-UI
Purpose: Render Feature Dependency Matrix table and Coupling Heatmap
Architectural Layer: Rendering Backends / Interaction & Navigation
Inputs: FeatureMatrixAdapter output
Outputs: React DOM Matrix Table & Canvas Heatmap
Existing Infrastructure: buildFeatureDependencyMatrix(), Sidebar.tsx
New Infrastructure: FeatureMatrixPanel.tsx, CouplingHeatmapCanvas.tsx
Dependencies: UNIT-101-MATRIX-ADAPTER
Likely Files: explorer/src/components/analytics/FeatureMatrixPanel.tsx
Validation: GATE B, GATE D, GATE E, GATE F
Regression Boundary: Zero layout recomputation when matrix modal opens/closes
Exit Criteria: Renders matrix for 40 features in < 15ms; cell click triggers focus

Implementation Unit: UNIT-202-RADAR-DNA-WIDGETS
Purpose: Render 360-degree Dependency Radar SVG and 7-band DNA barcode
Architectural Layer: Rendering Backends / UI
Inputs: ComponentProfileAdapter output
Outputs: SVG Radar Chart and DOM Barcode strip
Existing Infrastructure: ExplorerNodeMetrics, NodeHoverCard.tsx
New Infrastructure: DependencyRadarWidget.tsx, ArchitectureDNABarcode.tsx
Dependencies: UNIT-103-RADAR-DNA-ADAPTER
Likely Files: explorer/src/components/inspector/DependencyRadarWidget.tsx
Validation: GATE D, GATE E
Regression Boundary: Zero DOM reflow penalty on main canvas during hover
Exit Criteria: Displays radar and DNA barcode in component inspector in < 1ms

Implementation Unit: UNIT-203-TREE-FOURDIRECTION-UI
Purpose: Render isolated Dependency Tree and Cardinal Four-Direction panel
Architectural Layer: Rendering Backends / UI
Inputs: DependencyTreeAdapter output, graph-index.ts
Outputs: Tree View overlay and Four-Direction quadrant box
Existing Infrastructure: focus-graph.ts, Sidebar.tsx
New Infrastructure: DependencyTreePanel.tsx, FourDirectionPanel.tsx
Dependencies: UNIT-102-TREE-ADAPTER
Likely Files: explorer/src/components/analytics/DependencyTreePanel.tsx
Validation: GATE C, GATE D, GATE E
Regression Boundary: 2D Position Authority preserved for background main canvas
Exit Criteria: Tree view expands/collapses branches without corrupting canvas coordinates

Implementation Unit: UNIT-204-ATLAS-ZOOM-HOTSPOT-POLISH
Purpose: Refine Semantic Zoom LOD thresholds, Atlas enclosure labels, and Hotspot halos
Architectural Layer: Rendering Backends / Interaction
Inputs: FeatureOverlayCanvas.tsx, graph-style.ts, hotspots.ts
Outputs: Smooth LOD transition stylesheet and halo rendering
Existing Infrastructure: FeatureOverlayCanvas.tsx, graph-style.ts
New Infrastructure: LOD stylesheet rules, Hotspot Halo renderer
Dependencies: Phase 0 baseline
Likely Files: explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx, explorer/src/lib/graph-style.ts
Validation: GATE D, GATE E, GATE F
Regression Boundary: Zoom LOD class toggle < 5ms; 0.00000 px coordinate drift
Exit Criteria: Label clipping resolved at zoom < 0.6; halos render cleanly on high-risk hubs
```

---

## 10. Phase 3 — Specialized 2D Visualization Engines

### Objective
Implement specialized 2D spatial layout algorithms (Squarified Treemap, Octilinear Router, Polar Layout) for non-standard 2D representations.

### Architectural Layer
Visualization-Specific Layouts / Rendering Backends.

### Infrastructure Reused & Required
* **Reused**: `discoverFeatures()`, `classifyNodeLayer()`, `feature-roles.ts`, `metrics.ts`.
* **Required**: `treemap-layout.ts`, `octilinear-router.ts`, `polar-layout.ts`, `SankeyFlowCanvas.tsx`, `SubwayMapCanvas.tsx`.

### Capabilities Unlocked
Architecture Treemap, Dependency River / Sankey, Architecture Subway Map, Dependency Constellation.

### Phase 3 Implementation Units

```text
Implementation Unit: UNIT-301-TREEMAP-ENGINE
Purpose: Implement Squarified Treemap layout algorithm for footprint/mass visualization
Architectural Layer: Visualization-Specific Layouts
Inputs: ExplorerDataSchema, discoverFeatures(), classifyNodeLayer()
Outputs: Rectangle bounds map { id: { x, y, w, h } }
Existing Infrastructure: discoverFeatures(), classifyNodeLayer()
New Infrastructure: Squarified Treemap Layout Engine
Dependencies: Phase 1 Adapters
Likely Files: explorer/src/lib/layout/treemap-layout.ts, explorer/src/components/views/TreemapView.tsx
Validation: GATE C, GATE D, GATE F
Regression Boundary: Treemap aspect ratios strictly close to 1.0; 0 layout side-effects on 2D DAG
Exit Criteria: Calculates 2,000-node treemap bounds in < 20ms

Implementation Unit: UNIT-302-OCTILINEAR-SUBWAY-ENGINE
Purpose: Implement Octilinear line router for linear transit Subway Map representation
Architectural Layer: Visualization-Specific Layouts / Rendering
Inputs: ExplorerDataSchema, feature-roles.ts
Outputs: 45/90 degree octilinear polyline paths
Existing Infrastructure: feature-roles.ts (SharedInfrastructure classification)
New Infrastructure: Octilinear Router Engine, Metro Line Canvas
Dependencies: Phase 1 Adapters
Likely Files: explorer/src/lib/layout/octilinear-router.ts, explorer/src/components/views/SubwayMapView.tsx
Validation: GATE C, GATE D, GATE F
Regression Boundary: Line routes constrained strictly to 0, 45, 90 degree vectors
Exit Criteria: Generates octilinear routes for cross-feature lines in < 30ms

Implementation Unit: UNIT-303-SANKEY-RIVER-ENGINE
Purpose: Implement Tier Flow Matrix and Sankey River canvas renderer
Architectural Layer: Visualization-Specific Layouts / Rendering
Inputs: ExplorerEdge[], impactSummaries
Outputs: Flow volume bands between vertical layers
Existing Infrastructure: ExplorerEdge[], classifyNodeLayer()
New Infrastructure: Sankey Flow Matrix Calculator, Canvas River Renderer
Dependencies: Phase 1 Adapters
Likely Files: explorer/src/lib/layout/sankey-layout.ts, explorer/src/components/views/DependencyRiverView.tsx
Validation: GATE B, GATE C, GATE D
Regression Boundary: Total flowing edge mass strictly conserved across layer boundaries
Exit Criteria: Renders smooth layer-to-layer dependency streams with hover volume cards
```

---

## 11. Phase 4 — Story / Comparison / Explanation

### Objective
Construct story-driven walkthroughs, side-by-side feature comparison, pattern/grammar matching, and interactive traffic mode.

### Architectural Layer
Interaction & Navigation / Rendering Backends.

### Infrastructure Reused & Required
* **Reused**: `computeFocusGraph()`, `FocusControls.tsx`, `projectState.ts`, `ComparePanel.tsx`, `graph-style.ts`.
* **Required**: `StoryModeOrchestrator.ts`, `PatternGrammarEngine.ts`, `FeatureComparisonView.tsx`, `TrafficAnimationController.ts`.

### Capabilities Unlocked
Architecture Story Mode, Pattern / Grammar View, Feature Comparison, Architecture Traffic.

### Phase 4 Implementation Units

```text
Implementation Unit: UNIT-401-STORY-ORCHESTRATOR
Purpose: Implement guided step-by-step camera walkthrough state machine
Architectural Layer: Interaction & Navigation
Inputs: Tour script payload (node sequence + annotations)
Outputs: Viewport camera state transitions, focus isolation, callout cards
Existing Infrastructure: focus-graph.ts, FocusControls.tsx
New Infrastructure: StoryModeOrchestrator
Dependencies: Phase 2 UI Components
Likely Files: explorer/src/lib/story-orchestrator.ts, explorer/src/components/story/StoryModePanel.tsx
Validation: GATE E, GATE H
Regression Boundary: Position Authority Level 1--5 strictly preserved when exiting story mode
Exit Criteria: Smooth camera panning and step progression across 10-step tour script

Implementation Unit: UNIT-402-FEATURE-COMPARISON
Purpose: Side-by-side comparative analysis of two feature clusters
Architectural Layer: UI / Interaction
Inputs: Two Feature IDs, projectState.ts
Outputs: Metric diff table, cross-feature edge list, shared dependency table
Existing Infrastructure: projectState.ts, ComparePanel.tsx
New Infrastructure: FeatureComparisonView
Dependencies: UNIT-101-MATRIX-ADAPTER
Likely Files: explorer/src/components/analytics/FeatureComparisonView.tsx
Validation: GATE B, GATE E
Regression Boundary: Dual selection state isolated without corrupting single active focus state
Exit Criteria: Renders side-by-side comparison matrix and shared dependency list in < 5ms
```

---

## 12. Phase 5 — Historical / Evolution

### Objective
Construct multi-snapshot git commit time-series storage and scrubbing UI over the existing two-snapshot `diff-adapter.ts`.

### Architectural Layer
Canonical Graph Engine / Visualization Data Adapters / UI.

### Infrastructure Reused & Required
* **Reused**: `architecture-diff.cjs`, `diff-adapter.ts`, `projectState.ts`.
* **Required**: `MultiSnapshotStore.ts`, `TimeMachineSlider.tsx`.

### Capabilities Unlocked
Architecture Diff Overlay, Time Machine Commit Scrubbing.

### Phase 5 Implementation Units

```text
Implementation Unit: UNIT-501-MULTI-SNAPSHOT-STORE
Purpose: Store and index multiple git commit graph payloads in projectState
Architectural Layer: Canonical Graph Engine
Inputs: Array of ExplorerDataSchema payloads indexed by commit SHA / timestamp
Outputs: TimeSeriesGraphIndex
Existing Infrastructure: projectState.ts, schema.ts
New Infrastructure: MultiSnapshotStore
Dependencies: Phase 0 Contracts
Likely Files: explorer/src/lib/multi-snapshot-store.ts, explorer/src/lib/projectState.ts
Validation: GATE A, GATE B, GATE F
Regression Boundary: Single-snapshot active project payload memory consumption remains bounded
Exit Criteria: Indexes 10 historical snapshot payloads without exceeding heap limits

Implementation Unit: UNIT-502-TIME-MACHINE-UI
Purpose: Interactive slider for scrubbing through historical architecture snapshots
Architectural Layer: Interaction & Navigation / Rendering
Inputs: MultiSnapshotStore, diff-adapter.ts
Outputs: Temporal diff overlay graph on canvas
Existing Infrastructure: diff-adapter.ts, DiffSelector.tsx
New Infrastructure: TimeMachineSlider.tsx
Dependencies: UNIT-501-MULTI-SNAPSHOT-STORE
Likely Files: explorer/src/components/history/TimeMachineSlider.tsx
Validation: GATE D, GATE E, GATE F
Regression Boundary: Stable node IDs preserve coordinate positions across timeline ticks
Exit Criteria: Scrubs through 10 commit snapshots smoothly with diff highlight transitions
```

---

## 13. Phase 6 — Experimental 3D Infrastructure

### Objective
Build an isolated WebGL 3D canvas viewport component using Three.js to render 3D nodes, elevation rods, and 3D line arcs without touching the 2D production canvas or corrupting 2D Position Authority.

### Architectural Layer
Rendering Backends (Isolated Experimental Sandbox).

### Infrastructure Reused & Required
* **Reused**: 2D Stage 12 layout coordinates $(X,Y)$ from `architecture-layout.ts`, `position-policy.ts`.
* **Required**: Three.js dependency (isolated sandbox), `WebGL3DViewport.tsx`, `3DCameraControls.ts`, `3DNodeMeshGenerator.ts`.

### Capabilities Unlocked
Shared WebGL 3D viewport shell serving Models A, B, C, D experiments.

### Phase 6 Implementation Units

```text
Implementation Unit: UNIT-601-WEBGL-VIEWPORT
Purpose: Construct isolated WebGL 3D canvas viewport shell
Architectural Layer: Rendering Backends (Experimental)
Inputs: Read-only 2D positions { id: { x, y } }, z-elevation map { id: z }
Outputs: 3D WebGL Canvas scene with perspective camera and lighting
Existing Infrastructure: architecture-layout.ts Stage 12 positions, position-policy.ts
New Infrastructure: WebGL3DViewport.tsx, 3DCameraControls.ts
Dependencies: Phase 0 Baseline Contracts
Likely Files: explorer/src/components/experimental3d/WebGL3DViewport.tsx
Validation: GATE D, GATE F, GATE G
Regression Boundary: 2D production Cytoscape canvas completely unaffected; 0 px 2D coordinate drift
Exit Criteria: Renders 1,000 3D node meshes at >= 30 FPS in feature-gated experimental mode
```

---

## 14. Phase 7 — Controlled 3D Model Experiments

### Objective
Execute controlled empirical experiments for 3D Models A, B, C, and D against the benchmark dataset under the Controlled Experiment Contract.

### Architectural Layer
Rendering Backends / Visualization Data Adapters.

### Infrastructure Reused & Required
* **Reused**: UNIT-601-WEBGL-VIEWPORT, `metrics.fanIn`, `ordering.ts` topological rank, `inter-feature` edge flags, `centrality.ts`.
* **Required**: Model-specific elevation adapters (`modelA-adapter.ts`, `modelB-adapter.ts`, `modelC-adapter.ts`, `modelD-adapter.ts`).

### Capabilities Unlocked
Empirical comparison data for Models A–D under controlled tasks.

---

### 3D Experiment Plan — Model A (Sharedness Elevation)

* **Semantic Question**: Where are high-reuse shared utilities positioned relative to feature layers in 3D space?
* **X Meaning**: Feature Region $X$ coordinate (from Stage 12 2D layout).
* **Y Meaning**: Architecture Flow Layer $Y$ coordinate (from Stage 12 2D layout).
* **Z Meaning**: Sharedness / Reuse Score ($Z = \text{fanIn} \cdot w$ or `isSharedInfrastructure` elevation).
* **Data Source**: `ExplorerNode.metrics.fanIn` and `feature-roles.ts`.
* **Derivation Method**: $Z_i = \text{clamp}(\text{fanIn}_i \cdot 15.0, 0, 500)$.
* **Renderer Requirement**: WebGL 3D canvas with vertical elevation rods and curved 3D Bézier edge tubes.
* **Interaction Requirement**: 3D Orbit Controls (rotate, pan, zoom), elevation threshold slider.
* **Position Authority Treatment**: 2D $(X,Y)$ coordinates are read-only inputs from Level 1–5 Position Authority. $Z$ is pure read-only elevation projection.
* **Baseline Comparison**: 2D Hybrid Mode with SVG `FeatureOverlayCanvas`.
* **Correctness Criteria**: Zero distortion of 2D $(X,Y)$ coordinates; shared nodes elevated deterministically proportionally to fan-in.
* **Performance Measurements**: Render FPS, cold setup time, GPU memory usage, line segment crossing count in 3D screen space.
* **UX Measurements**: Task completion time and error rate when identifying top 3 shared utilities in org.
* **Failure Conditions**: FPS $< 30$ on 1,000 nodes; camera tilt foreshortening causing $> 50\%$ visual edge clutter compared to 2D baseline.

---

### 3D Experiment Plan — Model B (Dependency Depth Elevation)

* **Semantic Question**: How deep are static dependency chains within individual features?
* **X Meaning**: Feature Region $X$ coordinate.
* **Y Meaning**: Category Layer $Y$ coordinate.
* **Z Meaning**: Static DAG Topological Rank ($Z = \text{topologicalRank} \cdot \Delta Z$).
* **Data Source**: `ordering.ts` topological rank output.
* **Derivation Method**: $Z_i = \text{topologicalRank}_i \cdot 40.0\text{px}$.
* **Renderer Requirement**: WebGL 3D canvas with horizontal layer planes and vertical DAG rank steps.
* **Interaction Requirement**: 3D Orbit Controls, plane slicing slider.
* **Position Authority Treatment**: Read-only 2D $(X,Y)$ coordinates strictly preserved.
* **Baseline Comparison**: 2D Hierarchical Mode with vertical Y layer bands.
* **Correctness Criteria**: Topological rank matches static DAG order; zero cyclic $Z$ inversions.
* **Performance Measurements**: Render FPS, setup time, GPU memory.
* **UX Measurements**: Task completion time identifying longest static execution path.
* **Failure Conditions**: User confusion between static DAG depth and dynamic runtime execution time.

---

### 3D Experiment Plan — Model C (Cross-Feature Connectivity Elevation)

* **Semantic Question**: Which components act as cross-feature boundary violators?
* **X Meaning**: Feature Region $X$ coordinate.
* **Y Meaning**: Category Layer $Y$ coordinate.
* **Z Meaning**: Count of Inter-Feature Edges ($Z = \text{interFeatureEdges}_i \cdot \Delta Z$).
* **Data Source**: Stage 3.5 inter-feature edge flags (`graph-builder.ts`).
* **Derivation Method**: $Z_i = \text{count}(\text{edges where } \text{feature}_{\text{source}} \neq \text{feature}_{\text{target}}) \cdot 25.0\text{px}$.
* **Renderer Requirement**: WebGL 3D canvas highlighting cross-boundary spikes in red/orange.
* **Interaction Requirement**: 3D Orbit Controls, boundary threshold filter.
* **Position Authority Treatment**: Read-only 2D $(X,Y)$ coordinates strictly preserved.
* **Baseline Comparison**: 2D Hybrid Mode with dashed red inter-feature edges.
* **Correctness Criteria**: Inter-feature boundary violator spikes match inter-edge counts exactly.
* **Performance Measurements**: Render FPS, setup time, GPU memory.
* **UX Measurements**: Task completion time identifying cross-feature boundary violators.
* **Failure Conditions**: Vertical Z-spikes creating obscuring geometry over adjacent feature nodes.

---

### 3D Experiment Plan — Model D (Centrality Elevation)

* **Semantic Question**: Where are the primary topological hubs and cross-domain bridges in 3D space?
* **X Meaning**: Feature Region $X$ coordinate.
* **Y Meaning**: Category Layer $Y$ coordinate.
* **Z Meaning**: Hub / Bridge Score ($Z = \text{centralityScore}_i \cdot \Delta Z$).
* **Data Source**: `centrality.ts` (`hubScore`, `bridgeScore`).
* **Derivation Method**: $Z_i = (\text{hubScore}_i + \text{bridgeScore}_i) \cdot 200.0\text{px}$.
* **Renderer Requirement**: WebGL 3D canvas with high-centrality tower meshes and halo rings.
* **Interaction Requirement**: 3D Orbit Controls, centrality threshold filter.
* **Position Authority Treatment**: Read-only 2D $(X,Y)$ coordinates strictly preserved.
* **Baseline Comparison**: 2D Hotspot View with `HotspotPanel.tsx`.
* **Correctness Criteria**: Centrality height matches `centrality.ts` scores bit-for-bit.
* **Performance Measurements**: Render FPS, setup time, GPU memory.
* **UX Measurements**: Task completion time identifying top structural bottleneck.
* **Failure Conditions**: High-centrality towers drawing piercing cross-scene edges that obstruct low-elevation nodes.

---

## 15. Phase 8 — Cross-Visualization Integration

### Objective
Integrate all 2D analytical views, specialized layout views, historical views, and feature-gated 3D experimental views into a unified multi-lens navigation bar and state manager. Execute full regression testing suite.

### Architectural Layer
Interaction & Navigation / Cross-Cutting Integration.

### Infrastructure Reused & Required
* **Reused**: All Phase 0–7 deliverables, `projectState.ts`, `graph-interactions.ts`.
* **Required**: `VisualizationLensSelector.tsx`, `LensStateSynchronizer.ts`.

### Capabilities Unlocked
Seamless switching across all 26 visualization lenses with zero state loss or coordinate corruption.

### Phase 8 Implementation Units

```text
Implementation Unit: UNIT-801-LENS-SELECTOR-SYNC
Purpose: Unified visualization lens toolbar and state synchronization manager
Architectural Layer: Interaction & Navigation
Inputs: Active project state, selected visualization lens ID
Outputs: Synchronized lens state, view mode transitions
Existing Infrastructure: Sidebar.tsx, FocusControls.tsx, projectState.ts
New Infrastructure: VisualizationLensSelector.tsx, LensStateSynchronizer.ts
Dependencies: Phase 2, 3, 4, 5, 7 deliverables
Likely Files: explorer/src/components/navigation/VisualizationLensSelector.tsx, explorer/src/lib/projectState.ts
Validation: GATE E, GATE F, GATE G, GATE H
Regression Boundary: Preserves active node selection, zoom level, and Level 1--5 Position Authority across view switches
Exit Criteria: Switches between Atlas, Stack, Matrix, Treemap, Diff, and 3D sandbox in < 10ms without memory leaks
```

---

## 16. Cross-Phase Regression Strategy

To protect the production baseline across all 8 phases, strict regression boundaries are enforced:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CROSS-PHASE REGRESSION BOUNDARIES                         │
├────────────────────────────┬─────────────────────────────────────────────────────────────┤
│ Protected Baseline Domain  │ Mandatory Regression Invariant                              │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Deterministic Layout    │ Stage 12 coordinates must yield 0.00000 px drift across     │
│                            │ 10x repeat runs and input shuffles.                        │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. 2D Position Authority   │ Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas   │
│                            │ overrides MUST NEVER be overwritten by any view toggle.    │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Dependency Correctness  │ Topological paths and edge relationships must remain        │
│                            │ 100% faithful to source metadata.                           │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. Feature Classification  │ discoverFeatures() output must remain deterministic.        │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 5. Graph Interactions      │ Click, hover, drag, selection, and zoom behaviors must      │
│                            │ operate identically across all 2D lenses.                   │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 6. Focus & Hotspot Engine  │ computeFocusGraph() and hotspots.ts must produce identical  │
│                            │ subgraphs regardless of active UI view.                    │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 7. Diff Engine Immutability│ architecture-diff.cjs overlay outputs must remain exact.    │
└────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 17. Performance Measurement Strategy

Every phase differentiates facts from targets, estimates, and unmeasured areas:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                PERFORMANCE GOVERNANCE CLASSIFICATIONS                    │
├────────────────────────────┬─────────────────────────────────────────────────────────────┤
│ Classification Category    │ Definition & Application Rules                              │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ MEASURED AND TRACEABLE     │ Empirical benchmark recorded on Cloud Spend Tracker fixture  │
│                            │ (e.g. Hierarchical 189.37ms, Hybrid 231.14ms).             │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ TARGET                     │ Explicit performance SLA requirement for new infrastructure │
│                            │ (e.g. Matrix adapter < 10ms for N <= 50).                   │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ ESTIMATE                   │ Analytical projection based on algorithmic complexity       │
│                            │ (e.g. Treemap bounds calculation ~20ms for N = 2,000).      │
├────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ UNMEASURED                 │ Unbuilt area requiring empirical measurement during phase.  │
└────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

### Mandatory Telemetry Metrics to Measure in Each Phase
1. **Cold Setup Time (ms)**: Time from raw data load to initial view render.
2. **View Transition Latency (ms)**: Time to switch between visualization lenses.
3. **Frame Rate (FPS)**: Continuous frame rate during pan, zoom, or 3D camera rotation.
4. **Heap Allocation Delta (MB)**: Memory allocation added by active view structures.
5. **DOM / SVG Node Count**: Count of active DOM/SVG elements rendered.

---

## 18. UX / Task Validation Strategy

Visualization extensions are evaluated against specific user tasks rather than aesthetic opinions:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   UX TASK VALIDATION MATRIX                              │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────┤
│ Visualization Lens            │ Target Architectural Task        │ UX Success Metric     │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────┤
│ Architecture Atlas            │ System domain & feature boundaries│ Task time < 15s       │
│ Feature Dependency Matrix     │ Cross-feature dependency counts  │ Error rate = 0%       │
│ Dependency Tree               │ Upstream caller chain tracing    │ Depth navigation < 3s │
│ Dependency Radar              │ Component risk card evaluation   │ Single-click lookup  │
│ Architecture Treemap          │ Codebase footprint mass auditing │ Mass comparison < 10s │
│ Architecture Story Mode       │ Guided walkthrough onboarding    │ Step progression 100% │
│ Architecture Diff             │ Snapshot change identification   │ Added/deleted delta   │
│ Experimental 3D Models A--D   │ Multidimensional height triage   │ Task time vs 2D plan  │
└───────────────────────────────┴──────────────────────────────────┴───────────────────────┘
```

---

## 19. Data Dependencies

To prevent data semantic confusion, four distinct data tracks are strictly maintained:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATA DEPENDENCY TRACKS                                 │
├─────────────────────────────┬─────────────────────────────────┬──────────────────────────┤
│ Data Track                  │ Schema / Source Infrastructure  │ Supported Capabilities   │
├─────────────────────────────┼─────────────────────────────────┼──────────────────────────┤
│ 1. Current Snapshot         │ ExplorerDataSchema (schema.ts)   │ Atlas, Stack, Matrix,    │
│                             │                                 │ Radar, Tree, Treemap, DNA│
├─────────────────────────────┼─────────────────────────────────┼──────────────────────────┤
│ 2. Two-Snapshot Diff        │ architecture-diff.cjs,          │ Architecture Diff Overlay│
│                             │ diff-adapter.ts                 │                          │
├─────────────────────────────┼─────────────────────────────────┼──────────────────────────┤
│ 3. Multi-Snapshot History   │ MultiSnapshotStore (NEW DATA)   │ Time Machine Commit      │
│                             │                                 │ History Scrubbing        │
├─────────────────────────────┼─────────────────────────────────┼──────────────────────────┤
│ 4. Dynamic Runtime Telemetry│ APM Logs / Traces (NEW DATA)    │ Dynamic Runtime Call     │
│                             │                                 │ Profiling (Future)       │
└─────────────────────────────┴─────────────────────────────────┴──────────────────────────┘
```

> **MANDATORY DATA BOUNDARY**: Static DAG topological path depth must **NEVER** be presented as dynamic runtime execution timing or chronological performance order.

---

## 20. Risk Register

```text
Risk: Canonical Graph Duplication
Evidence: Developers building independent graph models for individual visualization views.
Affected Phases: Phase 1, Phase 2, Phase 3
Potential Consequence: Fragmented state, divergent analytics, increased memory footprint.
Mitigation: Enforce Visualization Data Adapter interface over canonical ExplorerDataSchema.
Validation Gate: GATE A, GATE B

Risk: Position Authority Regression
Evidence: Custom layouts or 3D view toggles overwriting Level 1--2 user-authored position overrides.
Affected Phases: Phase 2, Phase 3, Phase 6, Phase 7, Phase 8
Potential Consequence: Loss of user-authored graph adjustments and layout corruption.
Mitigation: Enforce position-policy.ts as read-only authority for all derived layouts/viewports.
Validation Gate: GATE G

Risk: Deterministic Layout Regression
Evidence: Modifying shared layout code during visualization lens implementation.
Affected Phases: Phase 0, Phase 1, Phase 3, Phase 8
Potential Consequence: Coordinate drift across repeated layout runs on identical inputs.
Mitigation: Run 10x determinism test suite on Cloud Spend Tracker fixture after every layout change.
Validation Gate: GATE C, GATE G

Risk: Heuristic Classification Overreach
Evidence: Presenting heuristic layer or feature roles as authoritative source code facts or human intent.
Affected Phases: Phase 1, Phase 2, Phase 4
Potential Consequence: User mistrust when heuristic boundaries do not match custom org naming conventions.
Mitigation: Explicitly label derived layers/features as HEURISTIC CLASSIFICATION in UI tooltips.
Validation Gate: GATE H

Risk: Static / Runtime Semantic Confusion
Evidence: Displaying static DAG topological rank as chronological runtime execution timing.
Affected Phases: Phase 3, Phase 4, Phase 7
Potential Consequence: Misleading performance triage based on static code references.
Mitigation: Explicitly label DAG rank as STATIC TOPOLOGICAL DEPENDENCY DEPTH in UI headers.
Validation Gate: GATE H

Risk: Historical / Runtime Data Confusion
Evidence: Treating static git commit diffs as live runtime execution telemetry.
Affected Phases: Phase 5
Potential Consequence: Incorrect refactoring decisions based on misidentified data sources.
Mitigation: Strict schema isolation between MultiSnapshotStore and static graph schema.
Validation Gate: GATE B

Risk: Renderer Proliferation
Evidence: Uncontrolled addition of third-party rendering libraries causing bundle bloat.
Affected Phases: Phase 3, Phase 6
Potential Consequence: Excessive bundle size, conflicting DOM canvas contexts, performance degradation.
Mitigation: Strict architectural gating requiring reuse of Cytoscape/SVG before adding WebGL canvas.
Validation Gate: GATE D, GATE F

Risk: Layout-Engine Complexity
Evidence: Custom 2D layout engines (Octilinear, Treemap) introducing infinite loops or high latency.
Affected Phases: Phase 3
Potential Consequence: Browser UI thread freezing during layout execution.
Mitigation: Enforce time-budgeted execution limits and web worker isolation for custom layouts.
Validation Gate: GATE C, GATE F

Risk: WebGL Complexity
Evidence: Three.js WebGL viewport memory leaks or context loss on complex org graphs.
Affected Phases: Phase 6, Phase 7
Potential Consequence: Browser crash or GPU memory exhaustion.
Mitigation: Strict mesh pooling, texture disposal, and feature-gated sandbox isolation.
Validation Gate: GATE F, GATE G

Risk: Performance Uncertainty
Evidence: Unmeasured rendering or analysis latency on large synthetic or real org datasets (> 2,000 nodes).
Affected Phases: Phase 2, Phase 3, Phase 6, Phase 7
Potential Consequence: Unusable UI response times on enterprise orgs.
Mitigation: Mandate Phase 0 benchmark harness checks for all new visualization components.
Validation Gate: GATE F

Risk: UX Uncertainty
Evidence: Visually dense or complex 3D views cluttering information without solving user tasks.
Affected Phases: Phase 3, Phase 4, Phase 7
Potential Consequence: User abandonment of advanced visualization modes.
Mitigation: Task-oriented UX validation matrix testing before declaring phase complete.
Validation Gate: GATE H

Risk: Feature Explosion
Evidence: Building 26 standalone visualization screens that duplicate controls and sidebars.
Affected Phases: Phase 2, Phase 4, Phase 8
Potential Consequence: Bloated UI codebase, inconsistent navigation state.
Mitigation: Unified VisualizationLensSelector.tsx toolbar and shared inspector panels.
Validation Gate: GATE E

Risk: Cross-View Synchronization
Evidence: Focus, selection, or filter state desynchronizing when toggling between lenses.
Affected Phases: Phase 2, Phase 4, Phase 8
Potential Consequence: Confusing user experience where selected node disappears on mode switch.
Mitigation: Centralize view state in projectState.ts with single active node selection payload.
Validation Gate: GATE E, GATE G

Risk: State-Management Complexity
Evidence: Multiple competing state stores managing layout state, zoom, filters, and history.
Affected Phases: Phase 1, Phase 5, Phase 8
Potential Consequence: Race conditions and unpredictable state updates during fast navigation.
Mitigation: Single state synchronizer managing projectState transitions.
Validation Gate: GATE E, GATE G
```

---

## 21. Implementation Readiness Gates

Every phase must satisfy applicable evidence gates before declaring completion:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               IMPLEMENTATION READINESS GATES                             │
├────────┬─────────────────────────────┬───────────────────────────────────────────────────┤
│ Gate   │ Gate Name                   │ Required Verification Condition                   │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE A │ Source/API Correctness      │ TypeScript compiles with zero errors; exact types │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE B │ Data Correctness            │ Output matches canonical graph data bit-for-bit   │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE C │ Layout Correctness          │ Physical clearance >= 40px; 0.00000px determinism │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE D │ Rendering Correctness       │ Elements render cleanly without clipping or artifacts│
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE E │ Interaction Correctness     │ Click, drag, hover, zoom, focus work smoothly     │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE F │ Performance Measurement     │ Latency, memory, FPS meet SLA targets on benchmark│
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE G │ Regression Validation       │ Zero drift on production baseline 2D layout       │
├────────┼─────────────────────────────┼───────────────────────────────────────────────────┤
│ GATE H │ UX / Task Validation        │ User task completed within matrix time targets    │
└────────┴─────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 22. Recommended Execution Order

The concrete sequence of implementation phases is derived strictly from dependency order, architectural prerequisites, technical reuse, and risk isolation:

1. **PHASE 0 — Baseline & Contracts**: Establish contracts, benchmark harness, and adapter interfaces.
   * *Dependency Rationale*: Prerequisite for all downstream development; locks baseline behavior.
2. **PHASE 1 — Shared Visualization Data Infrastructure**: Construct Visualization Data Adapters.
   * *Dependency Rationale*: Provides clean data feeds for all analytical and specialized lenses without code duplication.
3. **PHASE 2 — Existing 2D Analytical Extensions**: Build Matrix, Heatmap, Radar, Tree, DNA, Four-Direction, and Atlas polish.
   * *Dependency Rationale*: Maximum feature value using existing Cytoscape/SVG renderers and Phase 1 adapters.
4. **PHASE 3 — Specialized 2D Visualization Engines**: Implement Treemap, River/Sankey, Subway Map, and Constellation.
   * *Dependency Rationale*: Requires Phase 1 data adapters; introduces new specialized 2D layout algorithms.
5. **PHASE 4 — Story / Comparison / Explanation**: Implement Story Mode, Feature Comparison, and Traffic Mode.
   * *Dependency Rationale*: Consumes Phase 2 and 3 visual components for story walkthroughs and comparisons.
6. **PHASE 5 — Historical / Evolution**: Construct MultiSnapshotStore and Time Machine UI.
   * *Dependency Rationale*: Requires MultiSnapshotStore data track; wraps existing diff engine.
7. **PHASE 6 — Experimental 3D Infrastructure**: Construct isolated WebGL 3D Viewport component.
   * *Dependency Rationale*: Isolated sandbox infrastructure required before executing 3D experiments.
8. **PHASE 7 — Controlled 3D Model Experiments**: Execute empirical evaluations for Models A, B, C, D under contract.
   * *Dependency Rationale*: Consumes Phase 6 WebGL viewport; requires empirical comparison against 2D baseline.
9. **PHASE 8 — Cross-Visualization Integration & Regression Validation**: Unified lens switcher and final integration suite.
   * *Dependency Rationale*: Unifies all completed 2D, historical, and experimental 3D lenses into single production UI.

---

## 23. What Must Remain Untouched

The following core components of the codebase MUST NOT be modified during any visualization extension phase:

1. **Canonical Schema Contracts** (`explorer/src/types/explorer.ts`): Base properties of `ExplorerNode`, `ExplorerEdge`, and `ExplorerSummary` must remain unchanged.
2. **13-Stage Layout Pipeline Mechanics** (`architecture-layout.ts`): Stage execution order, global placement, crossing reduction, and collision resolution logic must remain untouched for standard 2D layout calls.
3. **5-Level Position Authority Policy** (`position-policy.ts`): Hierarchy of position provenance must remain strictly enforced.
4. **Deterministic Seed & Priority Calculations**: Node ordering seeds, feature discovery ranking, and satellite slot generation logic must remain identical.
5. **Benchmark Fixture Signatures**: Canonical Cloud Spend Tracker benchmark fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) must remain strictly read-only.
6. **Existing Audit Reports & Synthesis Documents**: All prior audit reports, `AGENT.md`, `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md`, and `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS_INTEGRITY_AUDIT.md` must remain untouched.

---

## 24. Final Roadmap Integrity Checklist

```text
[x] Production source code remained untouched.
[x] Tests remained untouched.
[x] Configuration remained untouched.
[x] Dependencies remained untouched.
[x] Fixtures remained untouched.
[x] Existing context files remained untouched.
[x] Existing audit files remained untouched.
[x] Final synthesis document remained untouched.
[x] Integrity audit document remained untouched.
[x] Exactly one new .md roadmap file was created (ARCHITECTURE_VISUALIZATION_IMPLEMENTATION_ROADMAP.md).
[x] Canonical Graph Principle strictly preserved across all phases.
[x] 5-Level Position Authority strictly preserved.
[x] Static DAG topology strictly decoupled from dynamic runtime execution.
[x] Historical multi-snapshot store strictly decoupled from single-snapshot diff.
[x] Experimental 3D track strictly isolated in feature-gated sandbox.
[x] Zero evaluative rankings, scores, or "best/worst" declarations used.
[x] All 26 audited visualization lenses properly placed in dependency roadmap.
[x] All 14 required risks populated with evidence, consequences, mitigations, and gates.
[x] Validation gates A--H defined and assigned across implementation units.
[x] Explicit implementation boundary statement included ("PLANNING ARTIFACT ONLY").
```

### Final Conclusion
This roadmap provides a complete, evidence-grounded, dependency-aware, and non-destructive plan for the future evolution of the Salesforce Architecture Explorer visualization system.

> **THIS DOCUMENT IS A PLANNING ARTIFACT ONLY. IT DOES NOT AUTHORIZE IMPLEMENTATION.**

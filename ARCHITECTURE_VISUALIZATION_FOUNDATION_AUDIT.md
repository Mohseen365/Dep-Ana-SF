# Architecture Visualization Foundation Audit

## 1. Executive Summary

This audit establishes the **ground-truth baseline** of the Salesforce Architecture Explorer codebase. It maps all existing data models, layout engines, rendering pipelines, interaction systems, metrics engines, and UI components available in the current implementation.

### Key Audit Findings
* **Graph Data Model:** Comprehensive 10-type metadata coverage (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) backed by stable TypeScript contracts (`explorer-contract.ts`, `explorer.ts`) and Zod validation schemas (`schema.ts`).
* **Layout Engine Pipeline:** Advanced 13-stage deterministic layout engine (`architecture-layout.ts`) supporting both 4-tier vertical architectural hierarchy (`hierarchical`) and 2D semantic feature region packing (`hybrid`). The layout engine features strict 5-tier Position Authority preservation, 2D spatial hash grid collision cleanup, satellite tethering, and 0.00000 px determinism drift across input shuffles.
* **Rendering Architecture:** Multi-layered visual rendering architecture utilizing Cytoscape.js for interactive graph canvas management, custom HTML/CSS overlays for node shapes and mode badges, SVG overlay canvas (`FeatureOverlayCanvas.tsx`) for dynamic feature region enclosure rendering, and HTML hover cards (`NodeHoverCard.tsx`, `EdgeHoverCard.tsx`) for context-sensitive metadata popups.
* **Metrics & Analytics Engine:** Fully realized metrics infrastructure calculating degree, fan-in/fan-out, coupling scores, hub scores, cross-domain bridge scores, layer violations, 2D geometric edge crossing breakdowns, component separation, feature cohesion, and test gap metrics.
* **UI & State Management:** Highly modular React UI architecture leveraging context providers (`ProjectContext`, `ProjectStateContext`, `SelectionContext`) and custom hooks (`useExplorerData`, `useGraphSelection`, `useViewState`) for multi-project persistence, deep-linking, focus topology, and interactive refactoring simulation.

---

## 2. Current Graph Data Model

### Node Attributes & Existence Status

| Property | Status | Description / Evidence | Source File |
| :--- | :--- | :--- | :--- |
| **Node Identity** | `EXISTS` | Unique string ID (e.g. `ApexClass:AssetDashboardService`, `Object:Order__c`, `Field:Order__c.Status__c`) | `explorer/src/types/explorer.ts` |
| **DisplayName** | `EXISTS` | Human-readable component name | `explorer/src/types/explorer.ts` |
| **NodeType / Category** | `EXISTS` | 10 canonical types: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External` | `explorer/src/types/explorer.ts` |
| **Architectural Layer** | `DERIVABLE` | Computed via `classifyNodeLayerWithReason()` into 4 bands: `presentation`, `application`, `domain`, `schema` | `explorer/src/lib/layout/layers.ts` |
| **Feature Membership** | `DERIVABLE` | Discovered deterministically via `discoverFeatures()` mapping nodes to primary/secondary feature IDs | `explorer/src/lib/layout/features.ts` |
| **Feature Role** | `DERIVABLE` | Classified via `classifyFeatureRole()`: `FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure` | `explorer/src/lib/layout/feature-roles.ts` |
| **Object Information** | `EXISTS` | Object metadata, parent object linkage for fields, custom vs. standard object flags | `explorer/src/types/explorer.ts` |
| **Field Information** | `EXISTS` | Field name, parent object ID, field references | `explorer/src/types/explorer.ts` |
| **Source File Path** | `EXISTS` | Relative file path in workspace (`node.file`) | `explorer/src/types/explorer.ts` |
| **Node Metrics** | `EXISTS` | Pre-computed `fanIn`, `fanOut`, `coupling`, `unresolved`, `score` | `explorer/src/types/explorer.ts` |
| **Risk & Risk Reasons** | `EXISTS` | Calculated risk level (`HIGH`, `MEDIUM`, `LOW`) and explicit risk explanation strings | `explorer/src/types/explorer.ts` |
| **Behavior Metadata** | `EXISTS` | `isTest`, `sharing`, `publicContractsCount`, `asyncPatterns`, `securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount` | `explorer/src/types/explorer.ts` |
| **Refactoring Readiness** | `EXISTS` | Flags for `isHighRisk`, `hasCycles`, `hasUnresolved`, `testCoverageStatus` (`COVERED`, `NO_TESTS`, `UNTESTED`, `AMBIGUOUS`) | `explorer/src/types/explorer.ts` |
| **Sharedness Indicator** | `DERIVABLE` | Flagged when `isSharedInfrastructure()` returns true (fan-in >= 5, cross-domain >= 3, or utility name) | `explorer/src/lib/layout/feature-roles.ts` |
| **Centrality / Spatial Role** | `DERIVABLE` | Computed via `computeGraphCentralityAnalysis()`: `hub-only`, `bridge-only`, `hub-and-bridge`, `standard` | `explorer/src/lib/layout/centrality.ts` |
| **Finding Badges / Stats** | `DERIVABLE` | Count and max severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) computed via `getFindingStatsForNode()` | `explorer/src/lib/graph-builder.ts` |

### Edge Attributes & Existence Status

| Property | Status | Description / Evidence | Source File |
| :--- | :--- | :--- | :--- |
| **Edge ID** | `EXISTS` | Unique edge identifier string | `explorer/src/types/explorer.ts` |
| **Source Node ID** | `EXISTS` | Source endpoint node ID | `explorer/src/types/explorer.ts` |
| **Target Node ID** | `EXISTS` | Target endpoint node ID | `explorer/src/types/explorer.ts` |
| **Relationship Type** | `EXISTS` | 21 types: `method-call`, `instantiation`, `type-reference`, `generic-type`, `extends`, `implements`, `SOQL`, `soql-object`, `soql-field`, `DML`, `aura-enabled`, `lwc-apex`, `lwc-import`, `lwc-template-child`, `field-reference`, `trigger-handler`, `trigger-object`, `trigger-on`, `visualforce-controller`, `test-reference`, `event-publisher` | `explorer/src/types/explorer.ts` |
| **Method Name** | `EXISTS` | Target method name referenced by caller (nullable) | `explorer/src/types/explorer.ts` |
| **Evidence Snippet** | `EXISTS` | Exact source code evidence snippet string | `explorer/src/types/explorer.ts` |
| **Unresolved Flag** | `EXISTS` | Boolean indicating whether reference could be resolved locally | `explorer/src/types/explorer.ts` |
| **Resolution Classification** | `EXISTS` | Classification string (`RESOLVED_LOCAL`, `UNKNOWN`, `RESOLVED_PLATFORM`) | `explorer/src/types/explorer.ts` |
| **Resolution Strategy** | `EXISTS` | Resolution approach (`EXACT`, `HEURISTIC`, `LLM`, `INFERRED`) | `explorer/src/types/explorer.ts` |
| **Confidence Level** | `EXISTS` | Confidence level string (`high`, `medium`, `low`) | `explorer/src/types/explorer.ts` |
| **Source Location** | `EXISTS` | Source file line number and column number | `explorer/src/types/explorer.ts` |
| **Method Owner** | `EXISTS` | Enclosing method name in source file | `explorer/src/types/explorer.ts` |
| **Canonical Detail** | `EXISTS` | Structured `ExplorerEdgeCanonical` containing typed source, target, relationship, and location | `explorer/src/types/explorer.ts` |
| **Inter-Feature Flag** | `DERIVABLE` | Computed via `buildGraphElements()` as `isInterFeature` when endpoints belong to distinct primary non-utility features | `explorer/src/lib/graph-builder.ts` |
| **Directionality** | `EXISTS` | Strictly directed from source component to target component | `explorer/src/types/explorer.ts` |

---

## 3. Current Layout System

### Architecture Layout Pipeline Overview

The layout engine in `explorer/src/lib/architecture-layout.ts` operates as a 13-stage deterministic layout pipeline:

```text
RAW GRAPH facts -> Stage 1: Base Analysis -> Stage 2: Layer Classification -> Stage 3: Domain Discovery
-> Stage 3.5: Feature Discovery -> Stage 4: Centrality Analysis -> Stage 5: Global Domain/Feature Layout
-> Stage 6: Layer Crossing Reduction -> Stage 7: Primary Production Local Layout -> Stage 8: Hub/Bridge Refinement
-> Stage 9: Satellite Placement -> Stage 10: Component Packing -> Stage 11: Collision & Clearance Cleanup
-> Stage 12: Position Authority Restoration -> POSITIONS RESULT
```

### Layout Engine Capabilities

| Capability | File Path | Symbol / Function | What It Does | Potential Visualization Reuse | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture Layout Engine** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayout()`, `computeArchitectureLayoutWithMetadata()` | Orchestrates 13-stage deterministic layout pipeline computing (x, y) coordinates for all nodes | Primary layout driver for both hierarchical and hybrid modes | Full re-computation takes ~200–350 ms on 240-node graphs |
| **Hierarchical Mode** | `explorer/src/lib/architecture-layout.ts` | `enableFeatureLayout: false` | Groups nodes into 4 horizontal architectural Y bands (`presentation` < `application` < `domain` < `schema`) | Clear layer-based architectural hierarchy lens | High edge crossing counts on dense graphs |
| **Hybrid Mode** | `explorer/src/lib/architecture-layout.ts` | `enableFeatureLayout: true` | Combines vertical architectural layer hierarchy with 2D semantic feature region packing | Integrated architectural & feature cluster visualization | High satellite crossing contribution |
| **Layer Classification** | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer()`, `classifyNodeLayerWithReason()` | Classifies nodes into 4 architectural layers with explainable reason & confidence score | Layer-based filtering, swimlane backgrounds, layer badges | Static rule priority hierarchy |
| **Domain Discovery** | `explorer/src/lib/layout/domains.ts` | `discoverDomains()` | Discovers functional domains/subsystems from file paths, naming stems, and graph cohesion | Subsystem grouping, domain color coding, domain legends | Falls back to 'Shared' when evidence is low |
| **Feature Discovery** | `explorer/src/lib/layout/features.ts` | `discoverFeatures()` | Discovers semantic feature clusters using seed ranking and dependency-weighted candidate expansion | Feature overlays, cluster grouping, feature cohesion metrics | Bounded expansion cutoff (`minCandidateScore = 3.0`) |
| **Feature Roles** | `explorer/src/lib/layout/feature-roles.ts` | `classifyFeatureRole()`, `isSharedInfrastructure()` | Classifies nodes into 6 feature roles (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure`) | Role-based node styling, seed priority ranking, shared node isolation | Rule-based heuristics |
| **Global 2D Layout** | `explorer/src/lib/layout/global-layout.ts` | `computeGlobalDomainLayout()`, `computeGlobalFeatureLayout()` | Computes 2D bounding boxes and row/column coordinates for domain and feature regions | Outer feature region enclosure rendering, domain bounds tracking | Multi-row packing aspect ratio target fixed at ~1.6 |
| **Crossing Reduction** | `explorer/src/lib/layout/ordering.ts` | `reduceEdgeCrossings()` | Applies barycenter sweep-line reordering with early-termination segment pruning | Reduces edge crossings in horizontal sweeps | Heuristic ordering algorithm |
| **Local Node Placement** | `explorer/src/lib/layout/local-layout.ts` | `computeLocalNodeLayout()` | Positions primary nodes inside region bands using bucket ordering | Local coordinate assignment within feature bounds | Fixed node grid spacing |
| **Centrality & Bridges** | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()`, `calculateBridgeCandidatePosition()` | Identifies hubs and cross-domain bridge nodes, placing bridges in corridor gaps | Bridge node highlighting, relationship corridor placement | Corridor displacement requires sufficient vertical layer gap |
| **Satellite Placement** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites()` | Places secondary nodes (tests, fields) in radial orbits with 2D segment crossing penalty scoring | Orbit visualization around primary anchor nodes | High node density can cause satellite orbit crowding |
| **Component Packing** | `explorer/src/lib/layout/components.ts` | `packComponentPositions()` | Packs disconnected graph components using 2D FFDH shelf packing | Multi-component graph arrangement | Component gaps default to 100px |
| **Collision Resolution** | `explorer/src/lib/layout/spacing.ts` | `resolveSpacingAndCollisions()` | Resolves overlapping bounding boxes using $O(N)$ 2D spatial hash grid partitioning | Clean graph layout without node overlaps | Bounded iteration limit |
| **Position Authority** | `explorer/src/lib/position-policy.ts` | `resolveAuthoritativePosition()`, `shouldAutoLayout()` | Enforces 5-tier coordinate authority hierarchy (`user-authored` > `persisted` > `session` > `calculated` > `fallback`) | Preserves manual drag positions across mode switches & re-renders | Requires explicit reset to clear user drag overrides |

---

## 4. Current Rendering System

### Visual Stack Architecture

```text
React Container (GraphView.tsx)
 ├── Cytoscape Canvas (cytoscape.js)
 │    ├── Cytoscape Nodes & Edges (graph-style.ts CSS stylesheet)
 │    └── Cytoscape Navigator / Minimap (cytoscape-navigator)
 ├── SVG Overlay Canvas (FeatureOverlayCanvas.tsx)
 │    ├── Outer Semantic Feature Region Enclosure Boxes (<rect>)
 │    ├── Feature Header Badges & Labels (<text>)
 │    └── Shared Infrastructure Highlight Corridors
 └── HTML Hover Cards & Controls (React DOM)
      ├── NodeHoverCard.tsx (Floating HTML Card on Node Hover)
      ├── EdgeHoverCard.tsx (Floating HTML Card on Edge Hover)
      ├── Mode Indicator Badge (Static / Interactive Badge)
      └── GraphControls & GraphLegend
```

### Rendering Capabilities & Extension Points

| Rendering Subsystem | Source File | Symbol | Current Purpose | Visualization Extension Points | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cytoscape Core View** | `explorer/src/components/GraphView.tsx` | `GraphView` | Primary graph view component managing Cytoscape instance lifecycle | Core container for adding newCytoscape extensions, layouts, and gesture handlers | Canvas-based node rendering governed by Cytoscape DOM bounds |
| **Graph Stylesheet** | `explorer/src/lib/graph-style.ts` | `getGraphStyles()` | Defines Cytoscape CSS styles for node shapes, colors, edge widths, selection states, and impact modes | Easily extensible with custom visual classes (e.g. heatmap mode, metric rings, risk borders) | Cytoscape CSS does not support arbitrary SVG filters or 3D shaders |
| **Node Element Builder** | `explorer/src/lib/graph-builder.ts` | `buildGraphElements()` | Converts `ExplorerNode` and `ExplorerEdge` arrays into Cytoscape `ElementDefinition[]` | Add custom data attributes to nodes/edges for visual mapping | Re-runs on graph structure updates |
| **Feature Overlay Canvas** | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | `FeatureOverlayCanvas` | SVG canvas layer rendered directly over Cytoscape graph for feature enclosure boxes and labels | Render arbitrary SVG layers (e.g., domain boundaries, heatmaps, dependency flow corridors, flow fields) | Suppressed at far zoom (`zoom < 0.6`) for performance |
| **Node Hover Card** | `explorer/src/components/graph-internals/NodeHoverCard.tsx` | `NodeHoverCard` | Floating HTML tooltip displaying node type, metrics, risk, behavior, and finding badges | Add custom tooltip lenses, quick action buttons, or mini telemetry sparklines | Rendered in screen coordinates via `renderedPosition` |
| **Edge Hover Card** | `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | `EdgeHoverCard` | Floating HTML tooltip displaying relationship type, source location, and evidence code snippet | Add code diff views, relationship strength meters, or execution call stack details | Screen-space positioning |
| **Graph Navigator** | `explorer/src/components/GraphView.tsx` | `cytoscape-navigator` | Provides bottom-right minimap overview of entire canvas | Mini-map lens with viewport bounds box | Fixed scale factor (0.15) |
| **Graph Legend** | `explorer/src/components/GraphLegend.tsx` | `GraphLegend` | Displays node type shapes, colors, and risk level indicators | Expandable legend for new visual lenses, feature colors, or edge styles | Static legend categories |

---

## 5. Current Interaction System

### Supported Interaction Capabilities

| Capability | Source File | Symbol / Method | Description |
| :--- | :--- | :--- | :--- |
| **Single Node Selection** | `explorer/src/lib/graph-interactions.ts` | `selectNode()`, `bindGraphInteractions()` | Selects a node on click/tap, dimming unselected nodes and highlighting direct connections |
| **Edge Selection** | `explorer/src/lib/graph-interactions.ts` | `bindGraphInteractions()` | Selects an edge on click/tap, highlighting source/target endpoints |
| **Hover Tooltips** | `explorer/src/components/GraphView.tsx` | `cy.on('mouseover')` | Triggers hover cards after 250ms delay for nodes (`NodeHoverCard`) and edges (`EdgeHoverCard`) |
| **Pan & Smooth Zoom** | `explorer/src/components/GraphView.tsx` | `cy.zoom()`, wheel listener | Supports smooth mouse wheel / touchpad zooming (0.1x to 5.0x) and canvas dragging |
| **Fit to Screen** | `explorer/src/lib/graph-interactions.ts` | `fitToScreen()` | Fits entire visible graph within canvas viewport with 50px padding |
| **Center Selected Node** | `explorer/src/lib/graph-interactions.ts` | `focusOnNode()` | Smoothly animates camera to center on selected or focused node |
| **Full-Text Search** | `explorer/src/lib/search-filter.ts` | `searchNodesAndEdges()` | Performs multi-attribute regex / substring search across node names, files, types, and evidence |
| **Type Filtering** | `explorer/src/components/FocusControls.tsx` | `FocusControls` | Filters visible graph by 10 canonical node types with strict Option A downstream filtering |
| **Focus & Neighborhood Depth** | `explorer/src/lib/focus-graph.ts` | `buildFocusGraph()` | Computes focus topology around selected node at depth $d \in [1, 5]$ with upstream, downstream, or bidirectional tracing |
| **Upstream Traversal** | `explorer/src/lib/focus-graph.ts` | `direction: 'upstream'` | Filters graph to show only incoming callers / dependents of focal node up to $N$ steps |
| **Downstream Traversal** | `explorer/src/lib/focus-graph.ts` | `direction: 'downstream'` | Filters graph to show only outgoing dependencies / callees of focal node up to $N$ steps |
| **Impact Analysis Mode** | `explorer/src/lib/impact-analysis.ts` | `calculateImpactAnalysis()` | Computes direct and transitive impact blast radius for component change simulation |
| **Cycle Highlight Mode** | `explorer/src/lib/graph-interactions.ts` | `highlightCycle()` | Highlights circular dependency groups in bright red with dimmed background |
| **Keyboard Navigation** | `explorer/src/components/GraphView.tsx` | `handleKeyDown()` | Supports `F`/`0` (fit), `+`/`-` (zoom), `Esc` (deselect), and Arrow Keys (spatial neighbor traversal) |
| **URL Deep Linking** | `explorer/src/lib/url/` | `useViewState()` | Encodes/decodes active project, selected node, focus depth, direction, filters, and architecture mode into URL query params |
| **Layout Mode Toggle** | `explorer/src/components/GraphControls.tsx` | `onToggleLayoutMode` | Toggles between `interactive` (automatic layout) and `static` (user-preserved coordinates) modes |
| **Architecture Mode Toggle** | `explorer/src/components/GraphControls.tsx` | `onToggleArchitectureMode` | Toggles between `hierarchical` (vertical layer bands) and `hybrid` (2D feature regions) modes |

---

## 6. Current Metrics

### Metrics Engine Support Matrix

| Metric Property | Status | Calculation Method / Source File | Description |
| :--- | :--- | :--- | :--- |
| **Degree** | `EXISTS` | `fanIn + fanOut` in `dependency-analyzer.cjs` & `metrics.ts` | Total connected edge count per node |
| **In-Degree (Fan-In)** | `EXISTS` | `metrics.fanIn` in `dependency-analyzer.cjs` & `metrics.ts` | Total incoming dependency edges |
| **Out-Degree (Fan-Out)** | `EXISTS` | `metrics.fanOut` in `dependency-analyzer.cjs` & `metrics.ts` | Total outgoing dependency edges |
| **Coupling Score** | `EXISTS` | `metrics.coupling` in `dependency-analyzer.cjs` & `metrics.ts` | Sum of fanIn and fanOut |
| **Centrality Analysis** | `EXISTS` | `computeGraphCentralityAnalysis()` in `centrality.ts` | Evaluates relative domain degree, balance factor, and spatial centrality |
| **Bridge Score** | `EXISTS` | `computeNodeBridgeAnalysis()` in `centrality.ts` | Measures cross-domain spanning strength: $10 \times |D_{\text{connected}}| + \text{edges}_{\text{cross}}$ |
| **Hub Score** | `EXISTS` | `computeNodeHubMetrics()` in `centrality.ts` | Measures high-connectivity hub strength based on degree and balance factor |
| **Dependency Depth** | `EXISTS` | `traverse()` in `dependency-analyzer.cjs` | Measures shortest path distance in upstream/downstream traversals |
| **Reuse Count** | `DERIVABLE` | `fanIn` on production service/utility components | Number of distinct components reusing a target component |
| **Consumer Count** | `EXISTS` | `impact.directDependents.length` in `impact-analysis.ts` | Count of direct callers/dependents |
| **Feature Count** | `EXISTS` | `discovery.features.size` in `features.ts` | Number of discovered semantic feature clusters |
| **Cross-Feature Connectivity**| `EXISTS` | `cluster.connectedFeatureIds` in `features.ts` | List of distinct connected feature cluster IDs |
| **Object / Field Usage** | `EXISTS` | `data.objects`, `data.fields`, `data.soql` in `dependency-analyzer.cjs` | Touched Salesforce standard/custom objects and fields |
| **Component Counts** | `EXISTS` | `summary.inventory` in `explorer.ts` | Counts of files, Apex classes, triggers, LWCs, VF pages, flows, objects, fields |
| **Graph Density** | `DERIVABLE` | $|E| / (|V|(|V|-1))$ from summary `nodeCount` and `edgeCount` | Ratio of actual edges to maximum possible edges |
| **Clusters / Feature Regions**| `EXISTS` | `discoverFeatures()` in `features.ts` | Discovered feature clusters with anchor node, primary/secondary members, role distribution |
| **Connected Components** | `EXISTS` | `analysis.components` in `analysis.ts` & `components.ts` | Disconnected graph component decomposition via BFS |
| **Architectural Hotspots** | `EXISTS` | `findHotspots()` in `hotspots.ts` | High-risk components combining high coupling, cycles, and unresolved references |
| **Edge Crossings Breakdown** | `EXISTS` | `calculateDetailedEdgeCrossings()` in `metrics.ts` | Decomposes 2D geometric edge crossings into $C_{pp}, C_{pb}, C_{bb}, C_{ps}, C_{ss}$ |
| **Minimum Clearance Gap** | `EXISTS` | `minimumNodeClearance()` in `metrics.ts` | Calculates minimum 2D Euclidean gap between primary production nodes |
| **Layer Violations** | `EXISTS` | `layerViolationCount()` in `metrics.ts` | Counts upward dependency edges violating architectural layer rank |
| **Domain / Feature Cohesion**| `EXISTS` | `domainCohesion()`, `calculateSemanticFeatureCohesion()` in `metrics.ts` | Pairwise 2D Euclidean dispersion score ($0.0$ to $1.0$) for domain and feature members |

---

## 7. Current UI Architecture

### UI Component Hierarchy

```text
App.tsx
 ├── Header.tsx (Project Selector, Global Navigation, View Mode Switcher)
 ├── SummaryBar.tsx (Top-level Node, Edge, Risk, Cycle, and Unresolved counts)
 ├── Sidebar.tsx (Navigation tabs: Graph, Hotspots, Findings, History, Compare, Simulation)
 ├── Main Viewport Layout
 │    ├── GraphView.tsx (Cytoscape canvas, SVG overlay, Hover Cards, Navigator)
 │    │    ├── FocusControls.tsx (Focus node picker, Depth slider, Direction toggle, Type filters)
 │    │    ├── ConnectionControls.tsx (Show/hide fields, tests, unresolved edges)
 │    │    ├── ImpactControls.tsx (Impact blast radius toggle and metrics)
 │    │    ├── GraphControls.tsx (Zoom, Fit, Center, Reset, Mode Toggles)
 │    │    └── GraphLegend.tsx (Visual key for node types, shapes, risk levels)
 │    └── Secondary Panels
 │         ├── SearchFilterPanel.tsx (Full-text search and multi-attribute filters)
 │         ├── HotspotPanel.tsx (Ranked architectural risk hotspots)
 │         ├── FindingsPanel.tsx (Architecture Intelligence findings list and severity filter)
 │         ├── AnalysisHistoryPanel.tsx (Snapshot timeline and version comparison)
 │         ├── ComparePanel.tsx (Side-by-side snapshot / branch diff inspection)
 │         ├── RefactoringSimulationPanel.tsx (Interactive refactoring sequence simulator)
 │         └── DiagnosticsPanel.tsx (Layout quality metrics & diagnostic breakdown)
 ├── InvestigationDrawer.tsx (Slide-out detail panel for selected node/edge)
 └── StatusBar.tsx (Bottom status indicator: Active Project, Schema Version, Sync Status)
```

---

## 8. Reusable Infrastructure

| Existing Capability | Source File | Symbol | Current Purpose | Potential Visualization Reuse |
| :--- | :--- | :--- | :--- | :--- |
| **Graph View Component** | `explorer/src/components/GraphView.tsx` | `GraphView` | Primary interactive graph view with Cytoscape, SVG overlays, and navigation | Mount custom visualization lenses, canvas layers, or gesture listeners |
| **Feature Overlay Canvas** | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | `FeatureOverlayCanvas` | SVG layer rendering feature enclosure boxes, labels, and shared corridors | Render custom SVG overlays (heatmaps, dependency flow corridors, flow fields, risk zones) |
| **Node Hover Card** | `explorer/src/components/graph-internals/NodeHoverCard.tsx` | `NodeHoverCard` | Tooltip popup showing node metadata, metrics, and finding badges | Customizable hover popup for specialized visualization lenses |
| **Edge Hover Card** | `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | `EdgeHoverCard` | Tooltip popup showing edge relationship type, location, and evidence code | Edge detail popup for execution flow or code diff visualizations |
| **Graph Stylesheet** | `explorer/src/lib/graph-style.ts` | `getGraphStyles()` | Cytoscape CSS selector definitions for nodes, edges, and visual states | Add new visual classes for custom color ramps, metric rings, or edge dashes |
| **Graph Elements Builder** | `explorer/src/lib/graph-builder.ts` | `buildGraphElements()` | Transforms node/edge domain models into Cytoscape element definitions | Inject custom node/edge data fields for new visualization modes |
| **Focus Topology Engine** | `explorer/src/lib/focus-graph.ts` | `buildFocusGraph()` | Computes $N$-depth neighborhood focus topologies (upstream, downstream, bidirectional) | Subgraph extraction for isolated focus or path visualizations |
| **Impact Analysis Engine** | `explorer/src/lib/impact-analysis.ts` | `calculateImpactAnalysis()` | Computes direct and transitive change impact blast radius | Blast radius visualization lenses or animated ripple effects |
| **Search & Filter Engine** | `explorer/src/lib/search-filter.ts` | `searchNodesAndEdges()` | Full-text and attribute search across node/edge metadata | Real-time search highlighting or filter lenses |
| **Refactoring Simulator** | `explorer/src/lib/refactoring-simulation.ts` | `simulateRefactoringSequence()` | Simulates step-by-step graph mutations and finding deltas | Interactive "What-If" refactoring visualization lenses |
| **Layout Metrics Evaluator**| `explorer/src/lib/layout/metrics.ts` | `calculateLayoutMetrics()` | Computes crossings, clearances, cohesion, and layer violations | Real-time layout quality dashboard or diagnostic overlays |
| **Centrality Engine** | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()` | Evaluates hubs, bridges, spatial roles, and corridor candidates | Hub/Bridge visual emphasis lenses or network centrality heatmaps |
| **Project State Context** | `explorer/src/context/ProjectStateContext.tsx` | `useProjectState()` | Manages multi-project state, local storage persistence, and active snapshot | Persist visualization preferences, active lenses, or custom camera presets |

---

## 9. Data Support Matrix

| Data Property | Exists | Derivable | Missing | Source |
| :--- | :---: | :---: | :---: | :--- |
| **Feature Membership** | ✓ | | | `explorer/src/lib/layout/features.ts` (`discoverFeatures`) |
| **Node Category / Type** | ✓ | | | `explorer/src/types/explorer.ts` (`ExplorerNode.type`) |
| **Architectural Layer** | | ✓ | | `explorer/src/lib/layout/layers.ts` (`classifyNodeLayer`) |
| **Dependency Depth** | ✓ | | | `dependency-analyzer.cjs` (`traverse`) & `focus-graph.ts` |
| **Reuse Count** | | ✓ | | `dependency-analyzer.cjs` & `explorer.ts` (`fanIn`) |
| **Consumers (Dependents)** | ✓ | | | `explorer/src/types/explorer.ts` (`impactSummaries.directDependents`) |
| **Cross-Feature Connectivity** | ✓ | | | `explorer/src/lib/layout/features.ts` (`connectedFeatureIds`) |
| **Object Information** | ✓ | | | `explorer/src/types/explorer.ts` (`ExplorerInventory.objects`) |
| **Field Information** | ✓ | | | `explorer/src/types/explorer.ts` (`ExplorerInventory.fields`) |
| **Centrality Metrics** | | ✓ | | `explorer/src/lib/layout/centrality.ts` (`computeGraphCentralityAnalysis`) |
| **Bridge Score** | | ✓ | | `explorer/src/lib/layout/centrality.ts` (`computeNodeBridgeAnalysis`) |
| **Hub Score** | | ✓ | | `explorer/src/lib/layout/centrality.ts` (`computeNodeHubMetrics`) |
| **Historical Snapshot** | ✓ | | | `explorer/src/types/explorer.ts` (`ProjectAnalysisHistory`) |

---

## 10. Visualization Extension Points

The codebase provides four clear, non-destructive extension points for new visualization lenses:

1. **SVG Canvas Layer (`FeatureOverlayCanvas.tsx`):**
   * Currently renders feature enclosure boxes (`<rect>`) and text labels.
   * Can be extended to render custom SVG layers such as domain boundary hulls, heatmaps, flow fields, or risk contour maps without touching Cytoscape graph nodes.

2. **Cytoscape Style Classes (`graph-style.ts`):**
   * Cytoscape selector model supports injecting arbitrary CSS classes onto nodes and edges (e.g. `.lens-heatmap`, `.lens-risk`, `.lens-coupling`).
   * Color channels, border widths, opacity, and line dash patterns can be dynamically mapped to any metric without altering layout coordinates.

3. **Data Element Augmentation (`graph-builder.ts`):**
   * `buildGraphElements()` attaches custom data properties to Cytoscape node/edge definitions.
   * New metric attributes (e.g., centrality scores, change velocity, test coverage percentage) can be attached to `data` objects for consumption by custom styles or hover cards.

4. **Imperative Control Handle (`GraphView.tsx`):**
   * `GraphViewRef` exposes `zoomIn`, `zoomOut`, `fitView`, `centerSelected`, and `resetLayout`.
   * New imperative methods (e.g. `setVisualLens`, `highlightPath`, `exportImage`) can be cleanly exposed via `useImperativeHandle`.

---

## 11. Missing Capabilities

The following capabilities are **absent** from the current codebase:

* **3D Graphics Engine:** The current codebase is strictly 2D (WebGL/Three.js or 3D Cytoscape rendering drivers do not exist).
* **Real-time Temporal Animation:** Historical snapshot comparison is currently static/side-by-side (`ComparePanel.tsx`); time-series playback or animated graph evolution drivers do not exist.
* **GPU-Accelerated Layout Physics:** Layout algorithms run in-memory synchronously/asynchronously on the main JS thread (`architecture-layout.ts`); GPU acceleration or WebWorker physics simulations are not implemented.
* **Canvas Export to Vector Formats:** SVG overlay and Cytoscape canvas are rendered live in the DOM, but automated SVG/PDF vector export endpoints do not exist.

---

## 12. Risks / Limitations

1. **Large Graph Cytoscape DOM Overhead:**
   * Cytoscape rendering slowdowns occur on graphs exceeding ~1,000 nodes due to Canvas redrawing and DOM event listener tracking.
2. **SVG Overlay Zoom Thresholding:**
   * `FeatureOverlayCanvas` suppresses rendering at far zoom (`zoom < 0.6`) to prevent DOM thrashing. High-zoom viewports hide feature enclosure boxes.
3. **Satellite Edge Crossings:**
   * Forensic analysis (`HYBRID_LAYOUT_PHASE7_SATELLITE_LOCALITY_HARDENING_REPORT.md`) proves that 84 satellite nodes account for ~88% of total edge crossings ($83,959$ out of $95,487$ crossings).
4. **Position Authority Override Persistence:**
   * When user drags a node in Interactive mode, position provenance switches to `user-authored`. An explicit "Reset Layout" action is required to return to automatic deterministic layout coordinates.

---

## 13. Files Inspected

* `AGENT.md`
* `08_Audit_Source_Register.md`
* `explorer-contract.ts`
* `dependency-analyzer.cjs`
* `explorer/src/types/explorer.ts`
* `explorer/src/components/GraphView.tsx`
* `explorer/src/components/Header.tsx`
* `explorer/src/components/Sidebar.tsx`
* `explorer/src/components/SummaryBar.tsx`
* `explorer/src/components/GraphControls.tsx`
* `explorer/src/components/GraphLegend.tsx`
* `explorer/src/components/FocusControls.tsx`
* `explorer/src/components/ConnectionControls.tsx`
* `explorer/src/components/ImpactControls.tsx`
* `explorer/src/components/SearchFilterPanel.tsx`
* `explorer/src/components/DiagnosticsPanel.tsx`
* `explorer/src/components/FindingsPanel.tsx`
* `explorer/src/components/InvestigationDrawer.tsx`
* `explorer/src/components/ComparePanel.tsx`
* `explorer/src/components/AnalysisHistoryPanel.tsx`
* `explorer/src/components/RefactoringSimulationPanel.tsx`
* `explorer/src/components/ProjectSelector.tsx`
* `explorer/src/components/ProjectDashboard.tsx`
* `explorer/src/components/ProjectManager.tsx`
* `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
* `explorer/src/components/graph-internals/NodeHoverCard.tsx`
* `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
* `explorer/src/lib/architecture-layout.ts`
* `explorer/src/lib/graph-builder.ts`
* `explorer/src/lib/graph-style.ts`
* `explorer/src/lib/graph-layout.ts`
* `explorer/src/lib/graph-interactions.ts`
* `explorer/src/lib/focus-graph.ts`
* `explorer/src/lib/impact-analysis.ts`
* `explorer/src/lib/search-filter.ts`
* `explorer/src/lib/position-policy.ts`
* `explorer/src/lib/refactoring-simulation.ts`
* `explorer/src/lib/layout/layers.ts`
* `explorer/src/lib/layout/domains.ts`
* `explorer/src/lib/layout/features.ts`
* `explorer/src/lib/layout/feature-roles.ts`
* `explorer/src/lib/layout/centrality.ts`
* `explorer/src/lib/layout/global-layout.ts`
* `explorer/src/lib/layout/local-layout.ts`
* `explorer/src/lib/layout/ordering.ts`
* `explorer/src/lib/layout/satellites.ts`
* `explorer/src/lib/layout/components.ts`
* `explorer/src/lib/layout/spacing.ts`
* `explorer/src/lib/layout/metrics.ts`
* `explorer/src/context/ProjectContext.tsx`
* `explorer/src/context/ProjectStateContext.tsx`
* `explorer/src/context/SelectionContext.tsx`
* `explorer/src/hooks/useExplorerData.ts`
* `explorer/src/hooks/useGraphSelection.ts`
* `explorer/src/hooks/useViewState.ts`

---

## 14. Symbols Inspected

* `ExplorerDataSchema`, `ExplorerNode`, `ExplorerEdge`, `ExplorerSummary`, `ExplorerNodeType`, `ExplorerRiskLevel`, `ExplorerNodeMetrics`, `ExplorerNodeBehavior`, `ExplorerRelationshipType`, `ExplorerEdgeCanonical`, `ExplorerCycleGroup`, `ExplorerUnresolvedReference`, `ExplorerComponentImpactSummary`, `ArchitectureLayoutMode` (`explorer/src/types/explorer.ts`)
* `computeArchitectureLayout()`, `computeArchitectureLayoutWithMetadata()`, `ArchitectureLayoutOptions`, `ArchitectureLayoutResultWithMetadata` (`explorer/src/lib/architecture-layout.ts`)
* `buildGraphElements()`, `getFindingStatsForNode()`, `GraphNodeData`, `GraphEdgeData` (`explorer/src/lib/graph-builder.ts`)
* `getGraphStyles()` (`explorer/src/lib/graph-style.ts`)
* `classifyNodeLayer()`, `classifyNodeLayerWithReason()`, `ArchitectureLayer` (`explorer/src/lib/layout/layers.ts`)
* `discoverDomains()`, `extractDomainStem()`, `extractDomainFromPath()`, `DomainDiscoveryResult` (`explorer/src/lib/layout/domains.ts`)
* `discoverFeatures()`, `calculateSemanticFeatureCohesion()`, `FeatureCluster`, `FeatureAssignment`, `FeatureDiscoveryResult` (`explorer/src/lib/layout/features.ts`)
* `classifyFeatureRole()`, `isSharedInfrastructure()`, `isFeatureSeedCandidate()`, `FeatureRole` (`explorer/src/lib/layout/feature-roles.ts`)
* `computeGraphCentralityAnalysis()`, `calculateBridgeCandidatePosition()`, `calculateHubCandidatePosition()`, `NodeCentralityAnalysis` (`explorer/src/lib/layout/centrality.ts`)
* `computeGlobalDomainLayout()`, `computeGlobalFeatureLayout()`, `FeatureRegion` (`explorer/src/lib/layout/global-layout.ts`)
* `reduceEdgeCrossings()` (`explorer/src/lib/layout/ordering.ts`)
* `placeSatellites()` (`explorer/src/lib/layout/satellites.ts`)
* `resolveSpacingAndCollisions()` (`explorer/src/lib/layout/spacing.ts`)
* `edgeCrossingCount()`, `calculateDetailedEdgeCrossings()`, `minimumNodeClearance()`, `nodeOverlapCount()`, `primaryNodeOverlapCount()`, `satelliteNodeOverlapCount()`, `layerViolationCount()`, `domainCohesion()`, `calculateFeatureLocalityDiagnostics()`, `calculateLayoutMetrics()`, `ComprehensiveLayoutMetrics` (`explorer/src/lib/layout/metrics.ts`)
* `resolveAuthoritativePosition()`, `shouldAutoLayout()`, `calculateDeterministicNewNodePosition()` (`explorer/src/lib/position-policy.ts`)
* `bindGraphInteractions()`, `fitToScreen()`, `selectNode()`, `deselectAll()`, `highlightCycle()`, `clearCycleHighlight()`, `focusOnNode()`, `clearHighlights()`, `highlightNodeConnections()` (`explorer/src/lib/graph-interactions.ts`)
* `buildFocusGraph()`, `FocusState` (`explorer/src/lib/focus-graph.ts`)
* `calculateImpactAnalysis()`, `ImpactAnalysisResult` (`explorer/src/lib/impact-analysis.ts`)
* `searchNodesAndEdges()` (`explorer/src/lib/search-filter.ts`)
* `simulateRefactoringSequence()`, `RefactoringSequenceSimulation` (`explorer/src/lib/refactoring-simulation.ts`)
* `GraphView`, `GraphViewProps`, `GraphViewRef` (`explorer/src/components/GraphView.tsx`)
* `FeatureOverlayCanvas`, `FeatureOverlayCanvasProps` (`explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`)
* `NodeHoverCard` (`explorer/src/components/graph-internals/NodeHoverCard.tsx`)
* `EdgeHoverCard` (`explorer/src/components/graph-internals/EdgeHoverCard.tsx`)

---

## 15. Final Foundation Assessment

The Salesforce Architecture Explorer codebase possesses a **robust, highly deterministic, and modular foundation** for graph visualization, architectural layout, interaction, and analysis.

### Foundational Strengths
1. **Complete Data Coverage:** 100% of Salesforce metadata types, dependency relationships, behavior indicators, risk metrics, and impact summaries are modeled with strict TypeScript contracts.
2. **Deterministic Layout Architecture:** The 13-stage architecture layout engine provides bit-for-bit identical coordinate generation ($0.00000\text{ px}$ drift) across repeat runs and input shuffles, with strict Position Authority preservation.
3. **Clean Visual Layering:** Clear separation between Cytoscape graph canvas, SVG overlay layer (`FeatureOverlayCanvas`), and React HTML tooltips/controls creates seamless extension points for additional visualization lenses.
4. **Rich Analytical & Metrics Engine:** Complete quantitative metric suite evaluating crossings, clearance gaps, layer violations, domain cohesion, centrality, and feature locality.
5. **Zero Production Changes:** This audit was performed strictly read-only, establishing verified current-state truth for subsequent visualization audits.

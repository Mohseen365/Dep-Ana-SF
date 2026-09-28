# P0-1 — Layout Capability Audit

## 1. Executive Summary

This report documents Phase 0-1 (Layout Capability Audit) of the Salesforce Architecture Visualization Unification project. The audit was conducted strictly against the current codebase in `explorer/src/` to establish an authoritative, evidence-grounded baseline of every architecture visualization and layout component currently implemented in the Salesforce Architecture Explorer.

### Key Discoveries:
1. **12 Primary Visual Lenses & 6 Analytical Views Implemented**: The workspace contains 12 primary visualization panels registered in `WorkspaceViewMode` (`GraphView`, `FeatureMatrixPanel`, `CouplingHeatmapPanel`, `DependencyRiverPanel`, `FeatureTreePanel`, `ArchitectureTreemapPanel`, `SubwayPanel`, `DependencyConstellationPanel`, `FeatureProfilePanel`, `RadarPanel`, `ArchitectureDNABarcode`, `FourDirectionPanel`) alongside 6 supporting analytical views (`ProjectDashboard`, `FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel`, `AnalysisHistoryPanel`).
2. **Decoupled Architecture Pattern**: All modern Phase 1–3 analytical lenses (`matrix`, `tree`, `profile`, `radar`, `dna`, `four-direction`, `treemap`, `river`, `subway`, `constellation`) follow a pure, read-only adapter pattern (`explorer/src/lib/adapters/`). They transform canonical `ExplorerDataSchema` graph data into specialized presentation structures without mutating the underlying graph or invoking Cytoscape `Position Authority`.
3. **Selection & Navigation Paradigm**: Global component selection is managed centrally via `SelectionContext` (`useGraphSelection()`) and state persistence (`projectState.ts`). Most analytical views accept `selectedNodeId` and offer a `onSelectNode` callback or explicit `"Explore in Graph Canvas →"` button. Navigation between views (`setWorkspaceViewMode`) preserves selection state, allowing seamless cross-layout investigation.
4. **Data-Driven Feature Discovery**: Feature-level visualizations (`Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Subway`) rely on the deterministic `discoverFeatures()` primitive (`explorer/src/lib/layout/features.ts`) and 2D band placement algorithms (`feature-ordering.ts`, `global-layout.ts`), establishing feature boundaries across `presentation`, `application`, `domain`, and `schema` layers.
5. **Zero Code Modifications**: This is a pure READ-ONLY audit report. No source code, tests, layout algorithms, or UI components were modified during this audit.

---

## 2. Audited Visualizations

The following 12 primary visualizations and 6 related analytical views were audited:

### Primary Audited Visualizations:
1. **GraphView** (`explorer/src/components/GraphView.tsx`)
2. **FeatureMatrixPanel** (`explorer/src/components/FeatureMatrixPanel.tsx`)
3. **CouplingHeatmapPanel** (`explorer/src/components/CouplingHeatmapPanel.tsx`)
4. **DependencyRiverPanel** (`explorer/src/components/DependencyRiverPanel.tsx`)
5. **FeatureTreePanel** (`explorer/src/components/FeatureTreePanel.tsx`)
6. **ArchitectureTreemapPanel** (`explorer/src/components/ArchitectureTreemapPanel.tsx`)
7. **SubwayPanel** (`explorer/src/components/SubwayPanel.tsx`)
8. **DependencyConstellationPanel** (`explorer/src/components/DependencyConstellationPanel.tsx`)
9. **FeatureProfilePanel** (`explorer/src/components/FeatureProfilePanel.tsx`)
10. **RadarPanel** (`explorer/src/components/RadarPanel.tsx`)
11. **ArchitectureDNABarcode** (`explorer/src/components/ArchitectureDNABarcode.tsx`)
12. **FourDirectionPanel** (`explorer/src/components/FourDirectionPanel.tsx`)

### Related Views & Shared Inspectors Audited:
- **ProjectDashboard** (`explorer/src/components/ProjectDashboard.tsx`)
- **FindingsPanel** (`explorer/src/components/findings/FindingsPanel.tsx`)
- **HotspotPanel** (`explorer/src/components/HotspotPanel.tsx`)
- **DiagnosticsPanel** (`explorer/src/components/DiagnosticsPanel.tsx`)
- **ComparePanel** (`explorer/src/components/ComparePanel.tsx`)
- **AnalysisHistoryPanel** (`explorer/src/components/AnalysisHistoryPanel.tsx`)
- **InvestigationDrawer** (`explorer/src/components/InvestigationDrawer.tsx`)
- **Sidebar & Command Palette** (`Sidebar.tsx`, `CommandPalette.tsx`)

---

## 3. Layout Capability Profiles

---

### 3.1 GraphView

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/GraphView.tsx`
- **Related Components**: `GraphControls.tsx`, `GraphLegend.tsx`, `NodeHoverCard.tsx`, `EdgeHoverCard.tsx`, `FeatureOverlayCanvas.tsx`
- **Adapter/Layout Engines**: `explorer/src/lib/graph-builder.ts`, `graph-style.ts`, `graph-layout.ts`, `graph-interactions.ts`, `architecture-layout.ts`, `position-policy.ts`
- **Hooks & Contexts**: `useGraphSelection()`, `SelectionContext`, `ProjectStateContext`
- **Types**: `ExplorerNode`, `ExplorerEdge`, `ArchitectureLayoutMode`, `GraphLayoutState`, `LayoutMode`, `LayoutProvenance`

#### B. Primary Visual Representation
Interactive node-link dependency graph rendered via Cytoscape.js canvas with 2D SVG feature region enclosure overlays (`FeatureOverlayCanvas`), minimap navigator (`cytoscape-navigator`), zoom-dependent edge opacity, and animated node drag/zoom/pan transitions.

#### C. Primary Unit of Analysis
- **PRIMARY**: Component/Node & Edge/Dependency topology.
- **SECONDARY**: Feature region containment & Architectural layer bands.

#### D. Primary User Question
> "How are components in this architecture connected to each other, and what is the global topological layout of dependencies and feature clusters?"

#### E. Information Exposed
- Component identity (`displayName`, `id`, `type`, `risk`)
- Dependency edges (direction, type, `isInterFeature` vs intra-feature styling)
- Architectural layer alignment (`presentation`, `application`, `domain`, `schema`)
- Feature region enclosure bounds (13 outer SVG hulls in Hybrid mode)
- Impact analysis highlights (origin, affected, muted nodes/edges)
- Circular dependency cycle highlights
- Finding rule violation callouts
- Refactoring simulation highlights (added/removed/affected nodes/edges)

#### F. Data Source / Derived Data
- **Source**: `ExplorerNode[]` and `ExplorerEdge[]` passed from `App.tsx` (or `visibleGraphData`).
- **Derived Data**: `buildGraphElements()`, `discoverFeatures()`, `runLayoutWithMetadata()`, 13-stage `architecture-layout.ts` geometry, `resolveAuthoritativePosition()`.

#### G. Interaction Capabilities
- **Hover**: Shows `NodeHoverCard` or `EdgeHoverCard` with metrics, file path, evidence snippet.
- **Click Node**: Selects node (`onSelectNode`), highlights connected edges, opens `InvestigationDrawer`.
- **Click Edge**: Selects edge (`onSelectEdge`), opens edge inspector.
- **Double Click Node**: Triggers `onNodeDoubleTapProp` (e.g. progressive focus drilling).
- **Drag Node**: Moves node interactively; in Static mode, saves position as `user-authored` provenance.
- **Zoom/Pan**: Mouse wheel zoom, drag pan, floating zoom +/- controls, fit-to-screen (`f`), center selected.
- **Keyboard**: Arrow keys navigate connected neighbors; `+`/`-` zoom; `f` fit view; `Esc` clears selection.
- **Mode Toggles**: Toggle Static/Interactive mode; Toggle Hierarchical/Hybrid architecture layout mode.

#### H. Selection Semantics
- Selected node ID is stored in global `SelectionContext` (`selectedNodeId`).
- Selection visually highlights the target node, dims non-connected nodes, and draws edge highlight styles.
- Selection survives view changes when switching to other workspace views.
- Selection does NOT automatically force layout recalculation in Static mode.

#### I. Navigation / Transition Behavior
```text
Click Node in GraphView
➔ update SelectionContext.selectedNodeId
➔ open InvestigationDrawer
➔ highlight connected edges in Cytoscape canvas
```

#### J. Filters and Controls
- **GLOBAL**: Visible node type filters (`visibleNodeTypes`), search query (`searchQuery`).
- **LOCAL**: Focus depth controls (`focusState`), Impact blast radius toggle, Static/Interactive mode toggle, Hierarchical/Hybrid mode toggle, Minimap navigator toggle.

#### K. Scale / Density Behavior
- **Small Datasets (<50 nodes)**: High initial zoom (1.4x), animated transitions enabled.
- **Dense/Large Datasets (200-5000 nodes)**: Progressive zoom-dependent label/edge suppression (`zoom-far`, `zoom-mid`, `zoom-near`), animation disabled for performance, fcose / dagre / 2D hybrid packing layout.

#### L. Empty / Loading / Error States
- Handled gracefully via `NotAnalyzedScreen` or empty Cytoscape container if nodes list is empty.

#### M. URL / Persistence Behavior
- Participates in `projectState.ts` local storage persistence (`graphLayout.nodePositions`, `graphLayout.mode`, `graphLayout.architectureMode`, `graphLayout.layoutProvenance`).

#### N. Unique Capability
> "Exposes interactive, full-topology node-link dependency canvas with bit-for-bit Position Authority, real-time node drag persistence, and 2D feature region hull overlays."

#### O. Overlapping Capabilities
- Topology overlaps with `DependencyConstellationPanel`.
- Feature geometry overlaps with `FeatureMatrixPanel` and `CouplingHeatmapPanel`.

#### P. Complementary Capabilities
- Complementary to `FeatureProfilePanel` (metrics), `FindingsPanel` (rule violations), `RefactoringSimulationPanel` (simulation overlay).

#### Q. Limitations / Gaps
- Dense graphs (>1,000 nodes) experience visual edge clutter if zoom is far out without focus filter active.

---

### 3.2 FeatureMatrixPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/FeatureMatrixPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/matrix-adapter.ts` (`adaptFeatureMatrix`)
- **Related Utilities**: `explorer/src/lib/layout/features.ts`, `feature-ordering.ts`, `global-layout.ts`
- **Types**: `FeatureMatrixData`, `FeatureMatrixHeader`, `FeatureMatrixCell`, `FeatureMatrixSummary`

#### B. Primary Visual Representation
Tabular 2D matrix grid with feature rows (source) and feature columns (target), layer color dots, combined dependency weight numbers, cell intensity background shading, min-weight filter input, and side inspection card.

#### C. Primary Unit of Analysis
- **PRIMARY**: Feature-to-Feature dependency relationships.
- **SECONDARY**: Architectural layer band placement (`presentation`, `application`, `domain`, `schema`).

#### D. Primary User Question
> "Where is coupling concentrated between different feature clusters, and which features depend on which other features?"

#### E. Information Exposed
- Feature identity, primary layer, primary domain, primary node count, secondary node count.
- Inter-feature dependency weights (direct weight, directional flow, shared node weight, combined weight).
- Summary stats: Total features, total dependencies, max combined weight.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptFeatureMatrix()` calls `discoverFeatures()`, `buildDomainGraph()`, `buildFeatureDependencyMatrix()`, and `compute2DFeatureBandOrdering()`.

#### G. Interaction Capabilities
- **Hover Cell**: Highlights cell, displays directional breakdown (direct, flow, shared, combined) in side inspector.
- **Click Row Header**: Selects feature anchor node (`onSelectFeatureAnchor`).
- **Click Cell**: Selects source feature anchor node and navigates or updates selection.
- **Threshold Filter**: Numeric input dynamically filters cells by minimum combined weight threshold.

#### H. Selection Semantics
- Row/column matching `selectedNodeId` is highlighted in blue; non-matching rows are dimmed (opacity 0.35).
- Clicking row or cell updates global selection and triggers navigation to Graph canvas if configured in `App.tsx`.

#### I. Navigation / Transition Behavior
```text
Click Row / Cell in FeatureMatrixPanel
➔ set selectedNodeId to feature anchorNodeId
➔ switch workspaceViewMode to 'graph'
➔ focus target feature anchor node in GraphView
```

#### J. Filters and Controls
- **LOCAL**: Min Weight Filter input (`matrix-threshold-filter`).

#### K. Scale / Density Behavior
- Dynamic threshold calibration: Automatically adjusts candidate score threshold to 1.0 for small datasets (<20 nodes) to prevent empty matrices. Scrollable table viewport for large feature sets.

#### L. Empty / Loading / Error States
- Displays `matrix-empty-state` with 🧩 icon if dataset is empty or contains no feature clusters.

#### M. URL / Persistence Behavior
- Reads `selectedNodeId` from global state; does not directly write URL query params.

#### N. Unique Capability
> "Exposes feature-to-feature dependency coupling weights in a structured, tabular 2D matrix sorted by 2D feature layer band order."

#### O. Overlapping Capabilities
- Data identical to `CouplingHeatmapPanel`; matrix uses numeric table cells while heatmap uses HTML5 canvas color intensity grid.

#### P. Complementary Capabilities
- Complementary to `DependencyRiverPanel` (macro flow) and `GraphView` (node-level detail).

#### Q. Limitations / Gaps
- Does not expose individual component-level edge provenance directly within matrix cells (requires switching views or inspecting side panel).

---

### 3.3 CouplingHeatmapPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/CouplingHeatmapPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/matrix-adapter.ts` (`adaptFeatureMatrix`)
- **Types**: `HeatmapMetricMode` (`combined` | `direct` | `flow` | `shared`), `FeatureMatrixData`

#### B. Primary Visual Representation
Interactive HTML5 Canvas color-intensity heatmap matrix with rotated column labels, row layer indicators, multi-metric mode toggle buttons, min-weight filter input, text filter, and side inspector.

#### C. Primary Unit of Analysis
- **PRIMARY**: Feature-to-Feature inter-coupling intensity.
- **SECONDARY**: Multi-metric breakdown (combined weight, direct count, directional flow, shared weight).

#### D. Primary User Question
> "What is the relative visual intensity of inter-feature coupling across different metric dimensions?"

#### E. Information Exposed
- Feature names, primary layers, matrix cell weights.
- Color gradient scale (Slate background → Deep Blue → Royal Blue → Cyan → Amber → Hot Red).
- Active metric details: Combined coupling, direct count, directional flow, shared weight.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptFeatureMatrix()`, high-DPI HTML5 Canvas rendering engine.

#### G. Interaction Capabilities
- **Metric Mode Switcher**: Toggle between `Combined`, `Direct`, `Flow`, and `Shared` metric modes.
- **Hover Canvas Cell**: Outlines target cell and displays coupling breakdown in inspector pane.
- **Click Canvas Cell**: Selects source feature anchor node and navigates to Graph canvas.
- **Search Query**: Text input filters features by name, domain, or layer.
- **Threshold Input**: Numeric input filters heatmap cells below min weight.

#### H. Selection Semantics
- Highlights rows/columns matching `selectedNodeId`; dims unrelated cells (opacity 0.3).

#### I. Navigation / Transition Behavior
```text
Click Heatmap Cell
➔ select source feature anchorNodeId
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Metric Mode Toggle (`combined`, `direct`, `flow`, `shared`), Min Weight Filter, Feature Search input.

#### K. Scale / Density Behavior
- High-DPI canvas scaling (`window.devicePixelRatio`). Dynamically computes `cellSize` (28px to 48px) based on feature count.

#### L. Empty / Loading / Error States
- Displays `heatmap-empty-state` with 🌡️ icon if no data is available.

#### M. URL / Persistence Behavior
- Respects active project selection; no direct URL persistence.

#### N. Unique Capability
> "Provides a high-density, multi-metric HTML5 Canvas heatmap rendering inter-feature coupling intensity gradients."

#### O. Overlapping Capabilities
- Shares underlying `adaptFeatureMatrix()` adapter data with `FeatureMatrixPanel`.

#### P. Complementary Capabilities
- Complementary to `GraphView` and `DependencyRiverPanel`.

#### Q. Limitations / Gaps
- Large feature sets (>50 features) require horizontal and vertical canvas scrolling.

---

### 3.4 DependencyRiverPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/DependencyRiverPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/sankey-adapter.ts` (`adaptSankeyRiver`)
- **Layout Engine**: `explorer/src/lib/layout/sankey-layout.ts` (`computeSankeyLayout`)
- **Types**: `SankeyData`, `SankeyNode`, `SankeyFlow`, `SankeyEdgeProvenance`

#### B. Primary Visual Representation
Macro architectural flow diagram (Sankey / River) with 4 layer columns (`PRESENTATION`, `APPLICATION`, `DOMAIN`, `SCHEMA`), interactive cubic Bézier flow streams, feature node cards, flow gradients, and side provenance inspector.

#### C. Primary Unit of Analysis
- **PRIMARY**: Feature-to-Feature macro dependency flow streams across architectural layer stages.
- **SECONDARY**: Component edge-level provenance tracking.

#### D. Primary User Question
> "How does dependency flow volume move across architectural layers, and what component edges constitute each flow stream?"

#### E. Information Exposed
- Layer stages (`presentation`, `application`, `domain`, `schema`).
- Feature node cards (`componentCount`, `totalInflow`, `totalOutflow`).
- Flow stream stroke width (proportional to component edge count).
- Edge provenance list (exact `sourceComponentName` ➔ `targetComponentName` references).

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptSankeyRiver()`, `computeSankeyLayout()`, deterministic Bézier curve generation (`M x1 y1 C xMid y1, xMid y2, x2 y2`).

#### G. Interaction Capabilities
- **Hover Flow Stream**: Highlights stream, increases stroke width, dims non-matching streams.
- **Click Flow Stream**: Selects flow, lists all component edge provenance items in right inspector pane.
- **Hover/Click Feature Card**: Highlights feature and connected flows; selects feature anchor node.
- **Search Filter**: Input filters feature flows by name.
- **Return to Graph**: Button triggers `onReturnToGraph()`.

#### H. Selection Semantics
- `selectedNodeId` highlights matching feature card; non-matching feature cards and streams are dimmed.

#### I. Navigation / Transition Behavior
```text
Click "Explore in Graph Canvas" in River Inspector
➔ select feature anchorNodeId
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Feature flow search input, "Return to Graph" button.

#### K. Scale / Density Behavior
- SVG canvas with fixed stage column coordinates and scrollable container. Flow stroke widths scaled relative to `maxFlowWeight`.

#### L. Empty / Loading / Error States
- Renders empty SVG container or fallback message if no flows exist.

#### M. URL / Persistence Behavior
- Inherits active project selection state.

#### N. Unique Capability
> "Visualizes macro dependency flow volume moving across architectural layer stages with 100% component edge provenance tracking."

#### O. Overlapping Capabilities
- Overlaps with `SubwayPanel` (route transit visualization).

#### P. Complementary Capabilities
- Complementary to `FeatureMatrixPanel` (coupling matrix) and `GraphView` (micro topology).

#### Q. Limitations / Gaps
- Intra-layer dependencies within the same layer stage are aggregated or suppressed in macro stage layout.

---

### 3.5 FeatureTreePanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/FeatureTreePanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/tree-adapter.ts` (`adaptFeatureTree`)
- **Types**: `FeatureTreeData`, `FeatureTreeNode`, `FeatureTreeNodeType` (`root` | `domain` | `feature` | `role` | `component`)

#### B. Primary Visual Representation
Interactive hierarchical tree list view with 5 level depth indentation (`Root` ➔ `Domain` ➔ `Feature` ➔ `Role` ➔ `Component`), expand/collapse chevrons, type icons, layer/risk/entity badges, search bar, and side inspector card.

#### C. Primary Unit of Analysis
- **PRIMARY**: Architectural hierarchy (`Domain` ➔ `Feature` ➔ `Role` ➔ `Component`).
- **SECONDARY**: Component classification (`entityType`, `layer`, `risk`, `isTest`).

#### D. Primary User Question
> "How are components organized hierarchically across domains, features, and feature roles?"

#### E. Information Exposed
- Hierarchy tree structure with depth 0 to 4.
- Component metadata: `entityType`, `layer`, `risk`, `isTest`, `isField`, `sourceNodeId`.
- Child counts for container nodes (`domain`, `feature`, `role`).
- Summary stats: Total nodes, max depth, domain count, feature count, component count.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptFeatureTree()` calling `discoverFeatures()`, `classifyNodeLayer()`, `isTestNode()`, `isFieldNode()`.

#### G. Interaction Capabilities
- **Expand/Collapse Chevron**: Toggles individual branch expansion.
- **Expand All / Collapse All**: Toolbar buttons expand or collapse entire tree hierarchy.
- **Search Bar**: Real-time search auto-expands ancestor path to matching nodes and highlights matches.
- **Click Node**: Selects tree node; if component, selects `sourceNodeId` and updates global selection.
- **Side Inspector Button**: "Explore in Graph Canvas →" navigates to Graph.

#### H. Selection Semantics
- Auto-expands path to `selectedNodeId` when selected externally. Highlighted with blue background and left border indicator.

#### I. Navigation / Transition Behavior
```text
Click Component in Tree OR Click "Explore in Graph Canvas"
➔ select sourceNodeId
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Hierarchy search input (`tree-search-input`), Expand All button, Collapse All button.

#### K. Scale / Density Behavior
- Virtualized/scrollable tree viewport. Auto-expands matching nodes during search.

#### L. Empty / Loading / Error States
- Displays `tree-empty-state` with 🌳 icon when no data is available.

#### M. URL / Persistence Behavior
- Synchronizes selection with `projectState.ts`.

#### N. Unique Capability
> "Provides a structured 5-level hierarchical tree view (Root ➔ Domain ➔ Feature ➔ Role ➔ Component) with instant search auto-expansion."

#### O. Overlapping Capabilities
- Overlaps with `ArchitectureTreemapPanel` (tree uses list hierarchy, treemap uses squarified spatial bounding rectangles).

#### P. Complementary Capabilities
- Complementary to `FeatureProfilePanel` (metrics) and `GraphView` (topology).

#### Q. Limitations / Gaps
- Does not expose edge/dependency arrows directly within the tree list view.

---

### 3.6 ArchitectureTreemapPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/ArchitectureTreemapPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/treemap-adapter.ts` (`adaptTreemap`)
- **Layout Engine**: `explorer/src/lib/adapters/treemap-layout.ts` (`computeTreemapLayout`)
- **Types**: `TreemapData`, `TreemapNode`, `TreemapRect`, `TreemapMetricMode` (`count` | `fanIn` | `fanOut` | `coupling` | `score`), `TreemapColorScheme` (`layer` | `risk`)

#### B. Primary Visual Representation
Nested squarified treemap bounding rectangles, metric size selector, color scheme dropdown, search input, hierarchy breadcrumb bar, and hover inspector footer.

#### C. Primary Unit of Analysis
- **PRIMARY**: Spatial proportion and metric density across architectural hierarchy.
- **SECONDARY**: Component metric weighting (`fanIn`, `fanOut`, `coupling`, `score`).

#### D. Primary Unit Question
> "Which features or components occupy the largest proportion of architectural complexity or coupling?"

#### E. Information Exposed
- Proportional rectangle areas scaled by selected metric mode.
- Color encodings: Layer scheme (`LWC`, `ApexTrigger`, `ApexClass`, `Objects`, `External`) or Risk scheme (`HIGH`, `MEDIUM`, `LOW`).
- Component metrics (`fanIn`, `fanOut`, `coupling`, `risk`).

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptTreemap()`, `computeTreemapLayout()` squarified tiling algorithm.

#### G. Interaction Capabilities
- **Metric Selector**: Resize rectangles by `Component Count`, `Fan-In`, `Fan-Out`, `Total Coupling`, or `Risk Score`.
- **Color Selector**: Switch color scheme between `Architecture Layer` and `Risk Classification`.
- **Subtree Drilldown**: Click container rectangle to zoom into subtree; breadcrumbs allow resetting zoom.
- **Click Component**: Selects component node; offers "Explore in Graph Canvas" button.
- **Hover**: Displays detailed metrics in footer inspector.

#### H. Selection Semantics
- Highlights selected component rectangle in blue; dims non-matching components (opacity 0.25).

#### I. Navigation / Transition Behavior
```text
Click "Explore in Graph Canvas" in Treemap Footer
➔ select sourceNodeId
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Component Search input, Metric selector dropdown, Color scheme selector dropdown, Breadcrumb drilldown buttons, Reset Zoom button.

#### K. Scale / Density Behavior
- Squarified layout algorithm prevents sliver rectangles. Labels suppressed if rectangle dimensions are below threshold (<40px width or <20px height).

#### L. Empty / Loading / Error States
- Displays empty state banner when dataset is missing or empty.

#### M. URL / Persistence Behavior
- Inherits active project selection state.

#### N. Unique Capability
> "Visualizes relative architectural metric density using nested squarified treemap spatial bounding rectangles."

#### O. Overlapping Capabilities
- Shares 5-level hierarchy data model with `FeatureTreePanel`.

#### P. Complementary Capabilities
- Complementary to `GraphView` and `FeatureProfilePanel`.

#### Q. Limitations / Gaps
- Topological dependency connections between components are not drawn as links on the treemap.

---

### 3.7 SubwayPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/SubwayPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/subway-adapter.ts` (`adaptSubwayMap`)
- **Types**: `SubwayMapData`, `SubwayStation`, `SubwayLine`, `SubwayRoute`

#### B. Primary Visual Representation
Transit-style subway route schematic map with feature transit lines (colored horizontal tracks), transfer station component nodes (shared hubs), cross-feature connection tracks, filter chips, search input, and station inspector drawer.

#### C. Primary Unit of Analysis
- **PRIMARY**: Feature transit routes & shared transfer station components.
- **SECONDARY**: Cross-feature dependency tracks.

#### D. Primary User Question
> "Which components serve as transfer stations (hubs) connecting multiple feature transit lines?"

#### E. Information Exposed
- Feature lines (line name, track color, component count).
- Station components (`displayName`, `nodeId`, `type`, `layerName`, `isTransfer`, `fanIn`, `fanOut`).
- Connection routes (`sourceFeatureId`, `targetFeatureId`, `isCrossLine`, SVG path geometry).

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptSubwayMap()`, feature line Y-coordinate assignment, transfer station detection (`features.size > 1`).

#### G. Interaction Capabilities
- **Filter Chips**: Filter canvas to display specific feature lines or all lines.
- **Cross-Track Toggle**: Checkbox toggles visibility of dashed cross-feature connection tracks.
- **Search Input**: Filters stations by name, ID, or file path.
- **Click Station**: Opens station inspector drawer; highlights station node.
- **Inspect Action**: "Explore in Graph" button navigates to Graph canvas.

#### H. Selection Semantics
- Highlights selected station marker with enlarged circle and active border; dims unrelated stations (opacity 0.25).

#### I. Navigation / Transition Behavior
```text
Click "Explore in Graph" in Subway Inspector
➔ select station.nodeId
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Station Search input, Feature Line filter chips, Cross-Feature Tracks toggle checkbox.

#### K. Scale / Density Behavior
- SVG canvas with dynamic width/height computation based on station count and feature line positioning.

#### L. Empty / Loading / Error States
- Displays `subway-panel empty-state` if project dataset contains no subway lines.

#### M. URL / Persistence Behavior
- Respects project selection state.

#### N. Unique Capability
> "Metaphorical transit-style subway route schematic highlighting shared transfer stations that bridge multiple feature lines."

#### O. Overlapping Capabilities
- Overlaps with `DependencyRiverPanel` (flow visualization).

#### P. Complementary Capabilities
- Complementary to `FourDirectionPanel` and `GraphView`.

#### Q. Limitations / Gaps
- Schematic track layout simplifies geometry and does not reflect geographical or 2D Cartesian spatial coordinates.

---

### 3.8 DependencyConstellationPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/DependencyConstellationPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/constellation-adapter.ts` (`adaptConstellation`)
- **Layout Engine**: `explorer/src/lib/layout/constellation-layout.ts` (`computeConstellationLayout`)
- **Types**: `ConstellationData`, `ConstellationNode`, `ConstellationEdge`, `ConstellationLayoutResult`

#### B. Primary Visual Representation
Radial polar constellation diagram with center focal component, concentric multi-ring orbital depth rings (1-Hop, 2-Hop, 3-Hop), directed radial edge arrows, risk-colored node rings, top controls bar, and right inspection drawer.

#### C. Primary Unit of Analysis
- **PRIMARY**: Radial neighborhood & hop-distance orbital dependency rings around a focal subject component.
- **SECONDARY**: Directed dependency relationships (`dependencies`, `dependents`, or `both`).

#### D. Primary User Question
> "What is the radial N-hop orbital neighborhood around a focal component, and how do dependencies radiate outward?"

#### E. Information Exposed
- Focal center component.
- Orbital depth rings (ring index, radius, hop distance).
- Neighborhood nodes (`displayName`, `nodeId`, `type`, `risk`, `featureName`, `layerName`, `incomingCount`, `outgoingCount`).
- Directed edges with arrowheads and relationship types.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptConstellation()`, `computeConstellationLayout()` calculating polar angle ($\theta_i = \text{angleOffset} + i \cdot \Delta\theta$) and radial distance ($r_k = R_{\text{base}} + (k-1) \cdot R_{\text{step}}$).

#### G. Interaction Capabilities
- **Focal Selector Dropdown**: Change focal center component node.
- **Depth Selector Dropdown**: Switch max orbital depth (1-Hop, 2-Hop, 3-Hop).
- **Direction Selector Dropdown**: Filter edges by `Both Directions`, `Dependencies (Outgoing)`, or `Dependents (Incoming)`.
- **Click Node**: Inspects node in right drawer; double click sets node as new focal center.
- **Make Focal Button**: "Set as Orbit Focal Center →" re-centers constellation on selected node.
- **Return to Graph**: Button navigates back to Graph canvas.

#### H. Selection Semantics
- Selected node is highlighted with enlarged circle and blue border; connected edges and neighbor nodes remain highlighted while non-connected elements are dimmed.

#### I. Navigation / Transition Behavior
```text
Click "Return to Graph Canvas"
➔ preserve selected focal node
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Focal Node selector, Orbital Depth dropdown (1-3 hops), Direction dropdown (`both`, `dependencies`, `dependents`), Search filter input, Return to Graph button.

#### K. Scale / Density Behavior
- Deterministic polar layout distributes nodes evenly across angular sectors on concentric rings, preventing node overlaps.

#### L. Empty / Loading / Error States
- Renders empty constellation message if focal node or dataset is unavailable.

#### M. URL / Persistence Behavior
- Maintains local transient state for focal node, max depth, and direction in `App.tsx`.

#### N. Unique Capability
> "Provides a focal-centric polar orbital visualization mapping N-hop dependency influence across concentric distance rings."

#### O. Overlapping Capabilities
- Overlaps with `GraphView` (topology) and `FourDirectionPanel` (neighborhood).

#### P. Complementary Capabilities
- Complementary to `FeatureProfilePanel` (metrics) and `FourDirectionPanel` (cardinal orientation).

#### Q. Limitations / Gaps
- Scope is localized around the active focal node; global graph topology outside the N-hop radius is hidden.

---

### 3.9 FeatureProfilePanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/FeatureProfilePanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/profile-adapter.ts` (`adaptComponentProfile`)
- **Types**: `ComponentProfileData`, `ComponentProfile`, `ComponentProfileSummary`

#### B. Primary Visual Representation
Two-column scorecard / profile dashboard with left filterable component list and right detailed profile inspector exposing layer, domain, feature role, dependency gauges, risk score, centrality topology, and hotspot flags.

#### C. Primary Unit of Analysis
- **PRIMARY**: Single component architecture profile & metric scorecard.
- **SECONDARY**: Component inventory risk summary.

#### D. Primary User Question
> "What is the detailed architectural metric profile, risk classification, and structural topology of a specific component?"

#### E. Information Exposed
- Component identity (`displayName`, `id`, `file`, `entityType`, `layer`, `domain`, `featureId`, `featureRole`).
- Metrics: Fan-In, Fan-Out, Total Coupling, Unresolved References, Risk Score, Risk Level.
- Structural Topology: Spatial Role, Hub Type, Bridge Node status.
- Risk Flags: Hotspot, High Risk, Circular Dependencies, Unresolved References, Test Component, Field Component.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptComponentProfile()` aggregating `classifyNodeLayer()`, `detectSpatialRole()`, `detectHubType()`, `isBridgeNode()`.

#### G. Interaction Capabilities
- **Filter Bar**: Search input filters left component list by name, ID, layer, domain, feature, or hotspot category.
- **Click Component List Item**: Selects active profile and updates global selection (`onSelectNode`).
- **Explore in Graph Button**: "Explore in Graph Canvas →" navigates to Graph.

#### H. Selection Semantics
- `selectedNodeId` highlights matching component list item and loads its detailed profile card.

#### I. Navigation / Transition Behavior
```text
Click "Explore in Graph Canvas →"
➔ select active profile component ID
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Component list search filter input (`profile-search-input`).

#### K. Scale / Density Behavior
- Scrollable list pane and detail pane handling projects with thousands of components.

#### L. Empty / Loading / Error States
- Displays `profile-empty-state` with 👤 icon if no component profiles are available.

#### M. URL / Persistence Behavior
- Synchronizes selection with `projectState.ts`.

#### N. Unique Capability
> "Comprehensive single-component architecture scorecard unifying fan-in/fan-out gauges, coupling metrics, centrality topology, and refactoring flags."

#### O. Overlapping Capabilities
- Metric data overlaps with `ArchitectureDNABarcode` and `InvestigationDrawer`.

#### P. Complementary Capabilities
- Complementary to `GraphView` (topology) and `RadarPanel` (project health).

#### Q. Limitations / Gaps
- Focused strictly on single-component inspection; does not render visual graph links between components.

---

### 3.10 RadarPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/RadarPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/radar-adapter.ts` (`adaptRadarDimensions`)
- **Types**: `RadarData`, `RadarDimension`, `RadarSummary`, `UnbackedPrimitiveReport`

#### B. Primary Visual Representation
Multi-dimensional polar radar chart with concentric reference rings (25%, 50%, 75%, 100%), radial axes, polygon data area fill, header health banner, side dimension inspector card, metric table, and unbacked primitive disclaimers.

#### C. Primary Unit of Analysis
- **PRIMARY**: Project-level multi-dimensional architecture health & quality portfolio.
- **SECONDARY**: Architectural dimension scores (`Coupling`, `Complexity`, `Centrality`, `Instability`, `Risk`, `Hygiene`).

#### D. Primary User Question
> "What is the overall multi-dimensional health score and risk exposure profile of the project architecture?"

#### E. Information Exposed
- Composite Architecture Health Score (0–100) and Health Level (`GOOD`, `CAUTION`, `CRITICAL`).
- Risk Exposure Percentage and Total Component / Dependency counts.
- 6 Architectural Dimensions: Coupling, Complexity, Centrality, Instability, Risk, Hygiene.
- Native source metric values and units (`score`, `percent`, `count`).
- Explicit listing of unbacked missing primitives (e.g. Test Coverage, Churn) to prevent synthetic score fabrication.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptRadarDimensions()`, `getVisualNormalizedValue()` for radial geometry positioning.

#### G. Interaction Capabilities
- **Hover/Click Radar Vertex**: Outlines vertex, displays dimension description, native value, and source metric in inspector card.
- **Hover/Click Table Row**: Synchronizes highlight with radar vertex.

#### H. Selection Semantics
- Highlights target dimension axis on radar polygon and table row.

#### I. Navigation / Transition Behavior
- Pure analytical lens; does not alter component selection or trigger graph navigation directly.

#### J. Filters and Controls
- **LOCAL**: Interactive axis/row hover and click selection.

#### K. Scale / Density Behavior
- Fixed 6-axis SVG radar polygon with responsive viewBox scaling.

#### L. Empty / Loading / Error States
- Displays `radar-empty-state` with 🎯 icon if dataset is null or missing.

#### M. URL / Persistence Behavior
- Evaluated against active project dataset.

#### N. Unique Capability
> "Evaluates project-wide multi-dimensional architecture health across 6 polar axes with explicit unbacked primitive reporting."

#### O. Overlapping Capabilities
- Overlaps with `ProjectDashboard` (project health summary).

#### P. Complementary Capabilities
- Complementary to `FeatureProfilePanel` and `FindingsPanel`.

#### Q. Limitations / Gaps
- Operates at project macro scale; does not display individual component node topology.

---

### 3.11 ArchitectureDNABarcode

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/ArchitectureDNABarcode.tsx`
- **Adapter**: `explorer/src/lib/adapters/dna-adapter.ts` (`adaptArchitectureDna`)
- **Types**: `ArchitectureDnaData`, `ComponentDna`, `DnaBand`, `ArchitectureDnaSummary`

#### B. Primary Visual Representation
Multi-band barcode visualization presenting 7 normalized architectural signal bands (`Layer`, `Fan-In`, `Fan-Out`, `Risk`, `Centrality`, `Hotspot`, `Hygiene`) for every component, composite DNA index percentage, filterable component list, and band provenance inspector.

#### C. Primary Unit of Analysis
- **PRIMARY**: Component architectural fingerprint / barcode across 7 normalized signal bands.
- **SECONDARY**: Portfolio DNA health summary.

#### D. Primary User Question
> "What is the multi-signal architectural fingerprint (DNA barcode) of a component across layer, coupling, risk, centrality, hotspot, and hygiene dimensions?"

#### E. Information Exposed
- 7 DNA Bands: `layer`, `fanIn`, `fanOut`, `risk`, `centrality`, `hotspot`, `hygiene`.
- Normalized band values ([0, 1]) and authoritative raw display values.
- Composite `overallDnaIndex` (0.0 to 1.0).
- Summary stats: Total components, High Risk DNA count, Hotspot DNA count, Hub DNA count, Average DNA Index.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptArchitectureDna()` calculating 7 normalized signals and composite overall index.

#### G. Interaction Capabilities
- **Search Input**: Filters component list by name, ID, type, layer, domain, or feature.
- **Click Component Item**: Selects active component and renders large 7-band barcode.
- **Hover DNA Band Strip/Card**: Highlights band, displays percentage fill and raw metric value.
- **Explore in Graph Button**: "Explore in Graph Canvas →" navigates to Graph.

#### H. Selection Semantics
- Synchronizes with global `selectedNodeId`; highlights matching item in left list and loads barcode inspector.

#### I. Navigation / Transition Behavior
```text
Click "Explore in Graph Canvas →"
➔ select active component ID
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Component Search input (`dna-search-input`).

#### K. Scale / Density Behavior
- High-density list with mini 7-strip barcode previews for quick visual scanning across large component inventories.

#### L. Empty / Loading / Error States
- Displays `dna-empty-state` with 🧬 icon if no data is available.

#### M. URL / Persistence Behavior
- Synchronizes selection with global project state.

#### N. Unique Capability
> "Visualizes a 7-band multi-signal architectural barcode fingerprint for rapid component comparison and anomaly detection."

#### O. Overlapping Capabilities
- Overlaps with `FeatureProfilePanel` (metrics).

#### P. Complementary Capabilities
- Complementary to `FeatureProfilePanel` and `GraphView`.

#### Q. Limitations / Gaps
- Shows individual component fingerprints; does not render topological edge arrows between components.

---

### 3.12 FourDirectionPanel

#### A. Implementation Location
- **Primary Component File**: `explorer/src/components/FourDirectionPanel.tsx`
- **Adapter**: `explorer/src/lib/adapters/four-direction-adapter.ts` (`adaptFourDirectionView`)
- **Types**: `FourDirectionData`, `FourDirectionSubject`, `FourDirectionQuadrant`, `FourDirectionItem`, `CardinalDirection` (`up` | `down` | `left` | `right`)

#### B. Primary Visual Representation
3x3 cardinal direction quadrant grid centered on the active subject component card, surrounded by 4 directional neighborhood boxes:
- **Up (⬆️)**: Upstream Dependents (components depending on subject)
- **Down (⬇️)**: Downstream Dependencies (components subject depends on)
- **Left (⬅️)**: Same-Feature Peers (components sharing subject's primary feature)
- **Right (➡️)**: Shared / Cross-Feature Boundaries (components in other features sharing dependencies)

#### C. Primary Unit of Analysis
- **PRIMARY**: Active subject component's immediate cardinal neighborhood categorized into 4 explicit directional regions.
- **SECONDARY**: Upstream, downstream, peer, and cross-feature relationship types.

#### D. Primary User Question
> "What components lie in the upstream, downstream, same-feature peer, and cross-feature cardinal directions relative to the active subject component?"

#### E. Information Exposed
- Active Subject Component details (`displayName`, `nodeId`, `type`, `featureName`, `layerName`, `file`, `fanIn`, `fanOut`, `coupling`, `risk`).
- 4 Cardinal Quadrants (`up`, `down`, `left`, `right`) with item counts, risk indicators, feature names, layer names, and relationship types.
- Summary counts: Total connected neighbors, upstream count, downstream count, peer count, cross-feature count.

#### F. Data Source / Derived Data
- **Source**: `ExplorerDataSchema`.
- **Derived Data**: `adaptFourDirectionView()` categorizing edges into cardinal directions.

#### G. Interaction Capabilities
- **Subject Selector Dropdown**: Change active subject component center.
- **Quadrant Filter Input**: Text search filters neighbor items across all 4 quadrants in real time.
- **Click Neighbor Item**: Selects item node.
- **Focus as Subject Center Button**: "Focus as Subject Center →" re-centers the 3x3 cardinal grid on the selected neighbor component.
- **Return to Graph Button**: Navigates back to Graph canvas.

#### H. Selection Semantics
- Highlights selected item within quadrant box with blue border; dims non-matching items.

#### I. Navigation / Transition Behavior
```text
Click "Return to Graph Canvas"
➔ preserve selected subject node ID
➔ switch workspaceViewMode to 'graph'
```

#### J. Filters and Controls
- **LOCAL**: Subject Component selector dropdown, Quadrant filter text input, Return to Graph button.

#### K. Scale / Density Behavior
- Quadrant boxes feature independent vertical scrollbars to accommodate high fan-in / fan-out components cleanly without breaking 3x3 grid alignment.

#### L. Empty / Loading / Error States
- Displays empty state banner if no subject or dataset is available.

#### M. URL / Persistence Behavior
- Synchronizes subject selection with global `selectedNodeId`.

#### N. Unique Capability
> "Categorizes a component's neighborhood into 4 explicit cardinal directions: Upstream, Downstream, Same-Feature Peers, and Cross-Feature Boundaries."

#### O. Overlapping Capabilities
- Overlaps with `DependencyConstellationPanel` (neighborhood).

#### P. Complementary Capabilities
- Complementary to `DependencyConstellationPanel` (constellation uses radial rings, four-direction uses cardinal grid) and `GraphView`.

#### Q. Limitations / Gaps
- Restricted to 1-hop cardinal neighborhood around active subject component.

---

## 4. Cross-Layout Capability Matrix

| Visualization | Project overview | Hierarchy | Footprint | Topology | Component dependency | Feature dependency | Direction | Flow | Coupling intensity | Neighborhood | Multi-hop context | Component metrics | Component fingerprint | Architecture health | Hotspot discovery | Finding inspection | Search | Filtering | Selection | Focus | Drill-down | Cross-layout navigation | Evidence Note |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Graph** | PARTIAL | YES | YES | YES | YES | YES | YES | INDIRECT | YES | YES | YES | PARTIAL | NO | INDIRECT | YES | YES | YES | YES | YES | YES | YES | YES | Full Cytoscape canvas with 2D hybrid overlays & focus mode |
| **Matrix** | PARTIAL | YES | YES | NO | NO | YES | YES | INDIRECT | YES | NO | NO | NO | NO | INDIRECT | YES | NO | NO | YES | YES | NO | INDIRECT | YES | Tabular 2D feature matrix with min weight threshold |
| **Heatmap** | PARTIAL | YES | YES | NO | NO | YES | YES | INDIRECT | YES | NO | NO | NO | NO | INDIRECT | YES | NO | YES | YES | YES | NO | INDIRECT | YES | HTML5 canvas color intensity heatmap across 4 metric modes |
| **River** | PARTIAL | YES | YES | INDIRECT | NO | YES | YES | YES | YES | NO | NO | NO | NO | INDIRECT | PARTIAL | NO | YES | YES | YES | NO | INDIRECT | YES | Sankey macro flow across 4 layer stages with edge provenance |
| **Tree** | PARTIAL | YES | YES | NO | NO | PARTIAL | NO | NO | NO | NO | NO | PARTIAL | NO | INDIRECT | PARTIAL | NO | YES | YES | YES | NO | YES | YES | 5-level hierarchical tree list with search auto-expansion |
| **Treemap** | PARTIAL | YES | YES | NO | NO | PARTIAL | NO | NO | YES | NO | NO | PARTIAL | NO | INDIRECT | PARTIAL | NO | YES | YES | YES | NO | YES | YES | Squarified spatial bounding rectangles sized by metric mode |
| **Subway** | PARTIAL | YES | YES | INDIRECT | YES | YES | YES | INDIRECT | YES | YES | INDIRECT | PARTIAL | NO | INDIRECT | YES | NO | YES | YES | YES | NO | INDIRECT | YES | Transit-style route schematic with shared transfer hubs |
| **Constellation** | NO | NO | NO | YES | YES | PARTIAL | YES | NO | YES | YES | YES | PARTIAL | NO | NO | PARTIAL | NO | YES | YES | YES | YES | YES | YES | Focal-centric radial polar view across 1–3 hop orbital rings |
| **Profile** | NO | PARTIAL | NO | NO | NO | PARTIAL | NO | NO | YES | PARTIAL | NO | YES | PARTIAL | INDIRECT | YES | YES | YES | YES | YES | NO | NO | YES | Single component scorecard with fan-in/fan-out gauges |
| **Radar** | YES | NO | PARTIAL | NO | NO | NO | NO | NO | YES | NO | NO | NO | NO | YES | YES | NO | NO | NO | YES | NO | NO | NO | 6-axis polar health radar with unbacked primitive report |
| **DNA** | PARTIAL | PARTIAL | YES | NO | NO | PARTIAL | NO | NO | YES | NO | NO | YES | YES | INDIRECT | YES | NO | YES | YES | YES | NO | NO | YES | 7-band normalized barcode fingerprint & overall DNA index |
| **Four-Direction** | NO | PARTIAL | NO | INDIRECT | YES | YES | YES | NO | YES | YES | NO | PARTIAL | NO | NO | PARTIAL | NO | YES | YES | YES | YES | YES | YES | 3x3 cardinal grid (Upstream, Downstream, Peers, Cross-Feature) |

---

## 5. Scale Matrix

| Visualization | Project | Domain | Feature | Component | Relationship | Neighborhood |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Graph** | SECONDARY | SECONDARY | SECONDARY | PRIMARY | PRIMARY | SECONDARY |
| **Matrix** | SECONDARY | SECONDARY | PRIMARY | NOT APPLICABLE | SECONDARY | NOT APPLICABLE |
| **Heatmap** | SECONDARY | SECONDARY | PRIMARY | NOT APPLICABLE | SECONDARY | NOT APPLICABLE |
| **River** | SECONDARY | SECONDARY | PRIMARY | SECONDARY | PRIMARY | NOT APPLICABLE |
| **Tree** | SECONDARY | PRIMARY | PRIMARY | PRIMARY | NOT APPLICABLE | NOT APPLICABLE |
| **Treemap** | SECONDARY | PRIMARY | PRIMARY | PRIMARY | NOT APPLICABLE | NOT APPLICABLE |
| **Subway** | SECONDARY | SECONDARY | PRIMARY | PRIMARY | PRIMARY | SECONDARY |
| **Constellation** | NOT APPLICABLE | NOT APPLICABLE | SECONDARY | PRIMARY | PRIMARY | PRIMARY |
| **Profile** | NOT APPLICABLE | SECONDARY | SECONDARY | PRIMARY | SECONDARY | SECONDARY |
| **Radar** | PRIMARY | NOT APPLICABLE | SECONDARY | SECONDARY | SECONDARY | NOT APPLICABLE |
| **DNA** | SECONDARY | SECONDARY | SECONDARY | PRIMARY | NOT APPLICABLE | NOT APPLICABLE |
| **Four-Direction** | NOT APPLICABLE | NOT APPLICABLE | SECONDARY | PRIMARY | PRIMARY | PRIMARY |

---

## 6. Visual Role Matrix

| Visualization | PRIMARY ROLE | SECONDARY ROLES |
| :--- | :--- | :--- |
| **Graph** | STRUCTURE | TOPOLOGY, RELATIONSHIP, NEIGHBORHOOD, NAVIGATION |
| **Matrix** | RELATIONSHIP | COMPARISON, STRUCTURE, NAVIGATION |
| **Heatmap** | RELATIONSHIP | COMPARISON, INSPECTION, NAVIGATION |
| **River** | FLOW | STRUCTURE, RELATIONSHIP, NAVIGATION |
| **Tree** | STRUCTURE | NAVIGATION, INSPECTION |
| **Treemap** | STRUCTURE | INSPECTION, COMPARISON, NAVIGATION |
| **Subway** | FLOW | NEIGHBORHOOD, RELATIONSHIP, NAVIGATION |
| **Constellation** | NEIGHBORHOOD | TOPOLOGY, RELATIONSHIP, NAVIGATION |
| **Profile** | INSPECTION | HEALTH, DIAGNOSTIC |
| **Radar** | HEALTH | COMPARISON, ORIENTATION |
| **DNA** | COMPARISON | INSPECTION, HEALTH |
| **Four-Direction** | NEIGHBORHOOD | RELATIONSHIP, NAVIGATION |

---

## 7. Information Overlap Analysis

### Matrix ↔ Heatmap
- **Data Overlap**: Both consume identical feature dependency matrix data generated by `adaptFeatureMatrix()` (`matrix-adapter.ts`).
- **Representation Difference**:
  - `FeatureMatrixPanel` renders an HTML table with numeric weight text in every cell, layer color dots, and explicit table header rows.
  - `CouplingHeatmapPanel` renders an HTML5 Canvas element with color intensity gradients (Slate ➔ Blue ➔ Cyan ➔ Amber ➔ Red), rotated column headers, and 4 selectable metric modes (`combined`, `direct`, `flow`, `shared`).

### Tree ↔ Treemap
- **Data Overlap**: Both operate on the same 5-level architectural hierarchy (`Root` ➔ `Domain` ➔ `Feature` ➔ `Role` ➔ `Component`) produced by `discoverFeatures()`.
- **Representation Difference**:
  - `FeatureTreePanel` renders a vertical, collapsible tree list view with depth indentation, expand/collapse chevrons, and text search auto-expansion.
  - `ArchitectureTreemapPanel` renders nested squarified bounding rectangles where rectangle surface area is proportional to the selected metric mode (`count`, `fanIn`, `fanOut`, `coupling`, `score`).

### Graph ↔ Constellation
- **Data Overlap**: Both visualize node-link topology and direct component-to-component dependency edges.
- **Representation Difference**:
  - `GraphView` renders global Cartesian topological layout (2D hybrid band packing or fcose force-directed) across the entire dataset.
  - `DependencyConstellationPanel` renders a focal-centric polar orbital diagram where nodes are placed on concentric distance rings (1-Hop, 2-Hop, 3-Hop) around a single active focal component.

### Constellation ↔ Four-Direction
- **Data Overlap**: Both focus on the immediate neighborhood surrounding an active component node.
- **Representation Difference**:
  - `DependencyConstellationPanel` arranges neighbors on 360-degree radial polar rings according to hop distance.
  - `FourDirectionPanel` organizes neighbors into a 3x3 cardinal grid corresponding to 4 discrete categories: Upstream (Dependents), Downstream (Dependencies), Left (Same-Feature Peers), and Right (Cross-Feature Boundaries).

### Profile ↔ DNA
- **Data Overlap**: Both inspect component-level architectural health, coupling, risk, and layer metadata.
- **Representation Difference**:
  - `FeatureProfilePanel` presents a detailed numerical scorecard with fan-in/fan-out gauges, risk classification, centrality topology, and file paths.
  - `ArchitectureDNABarcode` converts component metrics into a visual 7-band color barcode strip (`Layer`, `Fan-In`, `Fan-Out`, `Risk`, `Centrality`, `Hotspot`, `Hygiene`) normalized into [0, 1] for rapid visual scanning across large inventories.

### River ↔ Subway
- **Data Overlap**: Both visualize inter-feature dependency paths and shared component interactions.
- **Representation Difference**:
  - `DependencyRiverPanel` uses a Sankey flow stream visual with cubic Bézier curves moving left-to-right across 4 explicit layer columns (`presentation` ➔ `application` ➔ `domain` ➔ `schema`).
  - `SubwayPanel` uses a metaphorical transit schematic map with horizontal feature tracks (lines) and circular station nodes, explicitly highlighting shared transfer stations where lines intersect.

### Radar ↔ Health/Findings
- **Data Overlap**: Both summarize project-level architecture quality, risk exposure, and rule violations.
- **Representation Difference**:
  - `RadarPanel` plots 6 polar health dimensions on a multi-axis radar chart with composite health score (0–100) and unbacked primitive reporting.
  - `FindingsPanel` lists discrete rule violation findings (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) with evidence code snippets, line numbers, and resolution workflows.

---

## 8. Complementary Capability Analysis

The 12 primary visualizations provide multi-perspective complementary views of the same architectural entities:

1. **Macro ➔ Micro Complementarity**:
   - `RadarPanel` provides macro project health orientation.
   - `FeatureMatrixPanel` / `CouplingHeatmapPanel` / `DependencyRiverPanel` isolate feature-level inter-coupling and macro flow streams.
   - `GraphView` exposes global topological Cartesian layout.
   - `DependencyConstellationPanel` / `FourDirectionPanel` focus on 1-to-3 hop local neighborhoods.
   - `FeatureProfilePanel` / `ArchitectureDNABarcode` inspect single-component scorecards and fingerprints.

2. **Structural ➔ Metric Complementarity**:
   - `FeatureTreePanel` establishes hierarchical taxonomy (`Domain` ➔ `Feature` ➔ `Role` ➔ `Component`).
   - `ArchitectureTreemapPanel` maps metric weight density onto that same hierarchy.
   - `SubwayPanel` highlights shared architectural transfer hubs.

---

## 9. Natural Investigation Chains

### Chain 1: Portfolio Health ➔ Feature Coupling ➔ Component Neighborhood
- **Starting View**: `RadarPanel` (or `ProjectDashboard`)
- **Selected Entity**: High Risk Exposure / Low Health Score
- **Next Useful Information**: Inter-feature coupling concentration
- **Transition**: Switch to `FeatureMatrixPanel` or `CouplingHeatmapPanel`
- **Next Step**: Select high-weight feature cell ➔ Jump to `FourDirectionPanel` or `DependencyConstellationPanel` to inspect neighbor topology.
- **Context Preservation**: Active `selectedNodeId` is preserved throughout transitions.

### Chain 2: Rule Finding ➔ Component Profile ➔ Topological Graph Canvas
- **Starting View**: `FindingsPanel`
- **Selected Entity**: Critical Rule Violation (e.g. Circular Dependency or High Fan-In)
- **Next Useful Information**: Full component scorecard & risk reasons
- **Transition**: Click `"Investigate Component"` ➔ Opens `FeatureProfilePanel` (or `InvestigationDrawer`)
- **Next Step**: Click `"Explore in Graph Canvas →"` ➔ Switches to `GraphView`, centers target node, and highlights connected edges.
- **Context Preservation**: `selectedNodeId` and `selectedFindingId` remain synchronized.

### Chain 3: Macro River Flow ➔ Shared Station Hub ➔ Refactoring Simulation
- **Starting View**: `DependencyRiverPanel`
- **Selected Entity**: Thick flow stream between Application and Domain layers
- **Next Useful Information**: Shared transfer stations bridging those features
- **Transition**: Switch to `SubwayPanel` ➔ Inspect transfer station node
- **Next Step**: Open `InvestigationDrawer` ➔ Click `"Simulate Proposed Refactoring"` ➔ Launch `RefactoringSimulationPanel` overlay in `GraphView`.
- **Context Preservation**: Selected station node ID persists across view switches.

---

## 10. Current Transition Patterns

The workspace implements explicit, deterministic view switching and selection synchronization across all lenses:

1. **View Mode Toggle**:
   - Controlled via `setWorkspaceViewMode(mode)` in `App.tsx` and `ViewModeSwitcher.tsx`.
   - Supported modes: `'graph'`, `'dashboard'`, `'matrix'`, `'heatmap'`, `'river'`, `'tree'`, `'treemap'`, `'subway'`, `'constellation'`, `'profile'`, `'radar'`, `'dna'`, `'four-direction'`, `'findings'`, `'hotspots'`, `'diagnostics'`, `'compare'`, `'history'`.

2. **Graph Return Navigation (`onReturnToGraph`)**:
   - Panels (`Constellation`, `FourDirection`, `River`) expose a `"← Return to Graph Canvas"` button.
   - Invoking this action sets `workspaceViewMode = 'graph'` while preserving `selectedNodeId`.

3. **Direct Component Exploration (`onSelectNode` / `onExploreInGraph`)**:
   - Profile, DNA, Treemap, Subway, Matrix, and Heatmap panels provide explicit `"Explore in Graph Canvas →"` buttons.
   - Clicking this button invokes `selection.selectNode(nodeId)` and switches workspace mode to `'graph'`, automatically centering and highlighting the component in `GraphView`.

---

## 11. Current Limitations and Gaps

Implementation-observable limitations in the current codebase:

1. **Dense Graph Clutter in Full Graph View**:
   - `GraphView` without active focus filtering can experience edge occlusion when rendering large datasets (>500 components, >1,000 edges) unless zoomed in or filtered.

2. **Single Focal Center Constraint in Radial/Cardinal Views**:
   - `DependencyConstellationPanel` and `FourDirectionPanel` operate around a single focal subject component at a time; multi-subject side-by-side comparison requires switching subjects or opening `ComparePanel`.

3. **Schematic View Spatial Decoupled Geometry**:
   - `SubwayPanel` and `DependencyRiverPanel` use schematic stage/line coordinates for clarity; node $(x,y)$ positions in these views do not reflect 2D Cartesian spatial coordinates in `GraphView`.

4. **Unbacked Metric Safeguards**:
   - As documented in `RadarPanel` (`radar-adapter.ts`), certain metrics (e.g. test coverage, code churn) are explicitly marked as unbacked missing primitives to prevent synthetic score fabrication when analyzer data is absent.

---

## 12. Shared Capability Observations

1. **Centralized Selection State**:
   - `SelectionContext` (`useGraphSelection()`) provides global `selectedNodeId`, `selectedEdgeId`, and `clear()` methods shared across all workspace panels.

2. **Project State Persistence**:
   - `projectState.ts` (`loadProjectState()`, `saveProjectState()`) guarantees project-isolated localStorage persistence for filters, node positions, layout modes, and view preferences.

3. **Universal Drawer Inspector**:
   - `InvestigationDrawer.tsx` acts as a shared 5-tab inspector (`Overview`, `Dependencies`, `Dependents`, `Evidence`, `Actions`) accessible from any view mode when a node is selected.

4. **Zero Position Authority Violation in Adapters**:
   - All 10 adapter modules in `explorer/src/lib/adapters/` are pure data transformers; none invoke Cytoscape `Position Authority` or mutate canonical graph state.

---

## 13. Evidence / Source Map

The conclusions in this audit are grounded in the following current source code files and symbols:

- `explorer/src/components/GraphView.tsx` — Cytoscape canvas initialization, `FeatureOverlayCanvas`, `runLayoutWithMetadata()`, `captureAndPersistPositions()`, lines 1–850.
- `explorer/src/components/FeatureMatrixPanel.tsx` — Tabular 2D matrix, threshold filter, cell hover, lines 1–280.
- `explorer/src/lib/adapters/matrix-adapter.ts` — `adaptFeatureMatrix()`, `buildFeatureDependencyMatrix()`, lines 1–150.
- `explorer/src/components/CouplingHeatmapPanel.tsx` — HTML5 Canvas heatmap, 4 metric modes, lines 1–320.
- `explorer/src/components/DependencyRiverPanel.tsx` — Sankey macro flow, cubic Bézier streams, provenance, lines 1–350.
- `explorer/src/lib/adapters/sankey-adapter.ts` — `adaptSankeyRiver()`, provenance tracking, lines 1–180.
- `explorer/src/lib/layout/sankey-layout.ts` — `computeSankeyLayout()`, stage geometry, lines 1–120.
- `explorer/src/components/FeatureTreePanel.tsx` — 5-level hierarchical tree list, search auto-expansion, lines 1–400.
- `explorer/src/lib/adapters/tree-adapter.ts` — `adaptFeatureTree()`, lines 1–220.
- `explorer/src/components/ArchitectureTreemapPanel.tsx` — Squarified treemap, metric modes, color schemes, lines 1–350.
- `explorer/src/lib/adapters/treemap-adapter.ts` — `adaptTreemap()`, lines 1–160.
- `explorer/src/lib/adapters/treemap-layout.ts` — `computeTreemapLayout()`, squarified layout algorithm, lines 1–140.
- `explorer/src/components/SubwayPanel.tsx` — Transit route map, shared transfer stations, cross-tracks, lines 1–260.
- `explorer/src/lib/adapters/subway-adapter.ts` — `adaptSubwayMap()`, transfer hub detection, lines 1–180.
- `explorer/src/components/DependencyConstellationPanel.tsx` — Radial polar constellation, 1-3 hop orbital rings, lines 1–380.
- `explorer/src/lib/adapters/constellation-adapter.ts` — `adaptConstellation()`, lines 1–150.
- `explorer/src/lib/layout/constellation-layout.ts` — `computeConstellationLayout()`, polar geometry calculation, lines 1–110.
- `explorer/src/components/FeatureProfilePanel.tsx` — Component profile scorecard, gauges, lines 1–380.
- `explorer/src/lib/adapters/profile-adapter.ts` — `adaptComponentProfile()`, lines 1–200.
- `explorer/src/components/RadarPanel.tsx` — Multi-dimensional polar radar, 6 health axes, lines 1–350.
- `explorer/src/lib/adapters/radar-adapter.ts` — `adaptRadarDimensions()`, unbacked primitives, lines 1–190.
- `explorer/src/components/ArchitectureDNABarcode.tsx` — 7-band DNA barcode, overall index, lines 1–360.
- `explorer/src/lib/adapters/dna-adapter.ts` — `adaptArchitectureDna()`, 7 signal normalization, lines 1–210.
- `explorer/src/components/FourDirectionPanel.tsx` — 3x3 cardinal grid (Up, Down, Left, Right), lines 1–320.
- `explorer/src/lib/adapters/four-direction-adapter.ts` — `adaptFourDirectionView()`, lines 1–180.
- `explorer/src/App.tsx` — Master workspace router, view switching, drawer slots, status bar, lines 1–850.
- `explorer/src/components/ViewModeSwitcher.tsx` — View mode button bar, lines 1–160.
- `explorer/src/lib/projectState.ts` — `WorkspaceViewMode` type, state persistence manager, lines 1–320.

---

## 14. Unknowns Requiring Follow-Up

The following technical items could not be fully evaluated from static code inspection alone and require runtime verification in subsequent Phase 0 tasks:

1. **Browser Performance at Extreme Scale (5,000+ nodes)**:
   - While `computeTreemapLayout` and `adaptFeatureMatrix` execute in $O(N)$ / $O(N^2)$, real-browser DOM rendering frame rates for `CouplingHeatmapPanel` canvas vs `GraphView` Cytoscape canvas on 5,000-node datasets require Playwright browser verification in Phase 0-2.
2. **WebGL Acceleration Feasibility**:
   - Cytoscape.js currently uses HTML5 2D Canvas context; evaluating whether WebGL rendering is required for ultra-dense graphs belongs to future rendering feasibility tasks.

---

## 15. Explicit Non-Decisions

In strict accordance with Phase 0 governance directives, this capability audit **DOES NOT** make any product or architectural recommendations. Specifically, this report intentionally refrains from deciding:

1. Whether `FeatureMatrixPanel` and `CouplingHeatmapPanel` should be merged or kept separate.
2. Whether `FeatureTreePanel` and `ArchitectureTreemapPanel` should be combined into a single unified hierarchy workspace.
3. Whether `GraphView` should remain the default landing view mode.
4. Whether `RadarPanel` should be integrated into `ProjectDashboard`.
5. Whether any visualization lens should be deprecated, removed, or redesigned.

All product architecture and workspace unification decisions belong to subsequent Phase 0 synthesis and implementation phases.

---

## 16. Read-Only Verification

I confirm that:
- **Zero source code files were modified.**
- **Zero test files were modified.**
- **Zero configuration or package files were modified.**
- **Zero application layout behaviors were changed.**
- **The codebase remains 100% untouched and read-only.**

Only `P0-1_LAYOUT_CAPABILITY_AUDIT.md` was created as the sole required deliverable.

# P0-4 — Cross-Layout Interaction Audit

## 1. Executive Summary

This report delivers a strictly read-only, evidence-based forensic audit of user interaction behavior across all 12 primary analytical visualization lenses and supporting interaction systems within the Salesforce Architecture Explorer application.

The primary objective of this audit is to establish current implementation truth:
- What interactive elements exist in each visualization.
- Which gestures trigger which handlers and semantic actions.
- How selection, focus, filtering, and visibility propagate through shared state and affect other panels.
- How selection differs from navigation side effects across different layouts.
- Which interaction states persist in local storage, memory, or URL parameters.
- What interaction contracts and test suites protect current behavior.

### Key Audit Findings

1. **Dual Selection Architectures**:
   - Primary selection across all analytical lenses is mediated through a single active node identifier (`selectedNodeId: string | null`) managed via `SelectionContext.tsx` (`useGraphSelection.ts`) and mirrored in `useViewState.ts`.
   - Secondary edge selection (`selectedEdgeId: string | null`) exists in `useGraphSelection.ts` and `GraphView.tsx` for edge inspection and unresolved references in `DiagnosticsPanel.tsx`.
2. **Explicit vs Implicit Navigation Coupling**:
   - In **8 out of 12 analytical lenses** (`Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Subway`, `Profile`, `Radar`, `DNA`), selecting a node or component triggers an explicit view navigation callback (`setWorkspaceViewMode('graph')`), forcing an immediate switch to the Cytoscape graph canvas while opening the `InvestigationDrawer.tsx`.
   - In **3 analytical lenses** (`Constellation`, `Subway`, `FourDirection`), explicit navigation is decoupled via dedicated "Return to Graph" or "Explore in Graph" action buttons, allowing in-place selection within the lens.
3. **Canonical Visibility Non-Interference**:
   - Centralized node-type filtering (`filterGraphByNodeTypes` in `search-filter.ts`) derives `visibleActiveData` in `App.tsx` (L514-L523).
   - All 12 visualization panels consume `visibleActiveData` or `visibleGraphData`, guaranteeing that toggling node-type visibility in `Sidebar.tsx` or `SearchFilterPanel.tsx` updates every visualization simultaneously without resetting node selection or position authority.
4. **Transient vs Persistent Interaction States**:
   - Hover highlights (`hoveredCell`, `hoveredFlowId`, `hoveredNodeId`, `hoveredStation`, `hoveredDimId`, `hoveredBandId`) are strictly view-local ephemeral states stored via React `useState` hooks inside individual panel components.
   - Selection (`selectedNodeId`), Focus (`focusState`), Impact (`impactState`), and Filters (`filterState`) are workspace-local state synchronized bi-directionally with URL search parameters (`node`, `focusNode`, `impactNode`, `viewMode`, `type`, `risk`).
   - Layout mode (`interactive` vs `static`), Architecture mode (`hierarchical` vs `hybrid`), Node positions (`nodePositions`), and Sidebar visibility are project-scoped state persisted in `localStorage` keyed by `activeProjectId` via `projectState.ts`.

---

## 2. Audit Scope

### Primary Visualizations Audited (12 Visualizations)

1. **`GraphView`** (`explorer/src/components/GraphView.tsx`) — Main interactive Cytoscape.js canvas with hybrid/hierarchical spatial layout, node drag, pan/zoom, and overlay canvas.
2. **`FeatureMatrixPanel`** (`explorer/src/components/FeatureMatrixPanel.tsx`) — Grid representation of feature-to-feature dependencies and node density.
3. **`CouplingHeatmapPanel`** (`explorer/src/components/CouplingHeatmapPanel.tsx`) — HTML5 Canvas heatmap rendering architectural coupling metrics across feature clusters.
4. **`DependencyRiverPanel`** (`explorer/src/components/DependencyRiverPanel.tsx`) — SVG Sankey macro-flow diagram depicting layer-to-layer and feature dependency flows.
5. **`FeatureTreePanel`** (`explorer/src/components/FeatureTreePanel.tsx`) — Expandable hierarchical tree view displaying Root → Domain → Feature → Component relationships.
6. **`ArchitectureTreemapPanel`** (`explorer/src/components/ArchitectureTreemapPanel.tsx`) — Nested spatial treemap displaying component size and risk metrics.
7. **`SubwayPanel`** (`explorer/src/components/SubwayPanel.tsx`) — Metro-style transit map showing feature routes, lines, and interchange stations.
8. **`DependencyConstellationPanel`** (`explorer/src/components/DependencyConstellationPanel.tsx`) — Radial/polar layout showing concentric dependency rings around a focal component.
9. **`FeatureProfilePanel`** (`explorer/src/components/FeatureProfilePanel.tsx`) — Detailed architectural profile inspector listing component metrics, health, and incoming/outgoing edges.
10. **`RadarPanel`** (`explorer/src/components/RadarPanel.tsx`) — Multi-dimensional radial polygon chart displaying 9 architectural health and complexity dimensions.
11. **`ArchitectureDNABarcode`** (`explorer/src/components/ArchitectureDNABarcode.tsx`) — Multi-band architectural barcode rendering component risk, layer, and type signatures.
12. **`FourDirectionPanel`** (`explorer/src/components/FourDirectionPanel.tsx`) — Cardinal neighborhood view categorizing upstream, downstream, internal, and lateral dependencies.

### Supporting Interaction Components Audited

- **`ViewModeSwitcher`** (`explorer/src/components/ViewModeSwitcher.tsx`)
- **`SelectionContext` & `useGraphSelection`** (`explorer/src/context/SelectionContext.tsx`, `explorer/src/hooks/useGraphSelection.ts`)
- **`ProjectStateContext` & `projectState.ts`** (`explorer/src/context/ProjectStateContext.tsx`, `explorer/src/lib/projectState.ts`)
- **`useViewState`** (`explorer/src/hooks/useViewState.ts`)
- **`useCompareState`** (`explorer/src/hooks/useCompareState.ts`)
- **`useCommandPalette` & `CommandPalette`** (`explorer/src/hooks/useCommandPalette.ts`, `explorer/src/components/CommandPalette.tsx`)
- **`GraphControls`**, **`FocusControls`**, **`ImpactControls`** (`explorer/src/components/GraphControls.tsx`, `FocusControls.tsx`, `ImpactControls.tsx`)
- **`SearchFilterPanel`** & **`Sidebar`** (`explorer/src/components/SearchFilterPanel.tsx`, `Sidebar.tsx`)
- **`InvestigationDrawer`** (`explorer/src/components/InvestigationDrawer.tsx`)
- **`Header`** & **`StatusBar`** (`explorer/src/components/Header.tsx`, `StatusBar.tsx`)
- **`URL Query Managers`** (`explorer/src/lib/url/index.ts`, `filterQuery.ts`, `focusQuery.ts`, `impactQuery.ts`, `findingsQuery.ts`, `connectionQuery.ts`, `investigationQuery.ts`)

---

## 3. Interaction Vocabulary

The following concrete interaction terms are formally defined and verified in source code and test suites:

| Interaction Term | Technical Definition | Source Reference |
| :--- | :--- | :--- |
| **`click`** | Single pointer press and release on an interactive element (node, cell, button, station). | `GraphView.tsx` (L158), `SubwayPanel.tsx` (L75) |
| **`double-click` / `dblclick`** | Rapid double pointer press on Cytoscape canvas background or node. | `graph-interactions.ts` (L180-L192) |
| **`hover` / `mouseover` / `mouseout`** | Pointer movement over or away from an interactive element without pressing. | `CouplingHeatmapPanel.tsx` (L132), `DependencyRiverPanel.tsx` (L108) |
| **`drag` / `freehand position`** | Pointer down + move + up on a node in interactive layout mode to update $(x, y)$ coordinates. | `GraphView.tsx` (L232-L251), `position-policy.ts` |
| **`pan`** | Canvas click-and-drag on empty space to shift viewport $(x, y)$ position. | `Cytoscape` viewport / `GraphControls.tsx` |
| **`zoom` / `wheel`** | Mouse wheel scroll or pinch gesture to change viewport magnification factor. | `GraphControls.tsx` (L65-L75), `ZoomPanState` |
| **`fit-to-view` / `fitView`** | Programmatic viewport adjustment to frame all visible nodes within canvas boundaries. | `graph-interactions.ts` (L110-L115), `App.tsx` (L451) |
| **`keyboard Escape`** | Keydown event listener clearing node selection, drill path, and closing drawer. | `App.tsx` (L304-L312) |
| **`keyboard Shortcut` (`Cmd+K` / `Ctrl+K`)** | Key combination toggling the modal command palette. | `useCommandPalette.ts` (L15-L25) |
| **`selection`** | Active focus state on a node (`selectedNodeId`) or edge (`selectedEdgeId`). | `SelectionContext.tsx`, `useGraphSelection.ts` |
| **`drill-down`** | Navigation deeper into a component's dependency neighborhood, updating breadcrumbs. | `InvestigationDrawer.tsx` (L180-L195), `App.tsx` (L466) |
| **`focus`** | N-depth neighborhood sub-graph extraction around a focus node (`focusState`). | `focus-graph.ts`, `FocusControls.tsx` |
| **`impact analysis`** | Blast-radius dependency analysis computing upstream/downstream transitive closure. | `impact-analysis.ts`, `ImpactControls.tsx` |
| **`visibility toggle`** | Enabling or disabling specific node types (`visibleNodeTypes`) or test nodes (`hideTests`). | `search-filter.ts`, `Sidebar.tsx` |
| **`project switch`** | Changing the active project context (`activeProjectId`), triggering state resetting/restoration. | `ProjectContext.tsx`, `useViewState.ts` (L90-L110) |

---

## 4. Visualization Interaction Inventory

### Graph (`GraphView.tsx`)

#### Interactive Elements
- Cytoscape Nodes (`.node-element`, `.node-label`)
- Cytoscape Edges (`.edge-element`)
- Canvas Background (`.cy-canvas`)
- Floating Control Buttons (`GraphControls.tsx`: Zoom In/Out, Fit, Center, Reset, Fullscreen, Navigator, Focus, Mode Toggles)
- Feature Region Overlays (`FeatureOverlayCanvas.tsx`)

#### Supported Gestures
- `click` node: Selects node (`selectedNodeId`), opens drawer (`isInvestigating = true`), highlights connected edges.
- `click` edge: Selects edge (`selectedEdgeId`).
- `click` background: Deselects all nodes and edges (`selection.clear()`), closes drawer if unpinned.
- `dblclick` background: Triggers `fitToScreen()` (resets zoom/pan to fit all nodes).
- `drag` node (interactive mode): Updates node position, emitting `onNodePositionsChange` with Level 1 User Drag authority.
- `wheel` / pinch: Zooms canvas viewport.
- `pan`: Shifts canvas viewport.
- `mouseover` node/edge: Triggers `NodeHoverCard` or `EdgeHoverCard` tooltip with detailed metadata.

#### Semantic Action
- `click` node $\rightarrow$ Select node and initiate graph investigation.
- `drag` node $\rightarrow$ Author custom spatial layout positioning.
- `click` background $\rightarrow$ Clear active selection.

#### State Effect
- Updates `selectedNodeId` in `SelectionContext` and `useViewState`.
- Updates `nodePositions` in `ProjectStateContext`.

#### Visual Effect
- Selected node receives `.selected` CSS class and highlight glow.
- Connected edges and neighbors retain full opacity; non-connected elements dim (`.dimmed`).
- `NodeHoverCard` displays position, type, risk, degree, and layer metadata.

#### Navigation Effect
- Remains on `'graph'` workspace view mode.
- Opens `InvestigationDrawer` if closed.

#### Persistence Effect
- Node position updates persist to `localStorage` under `projectState.graphLayout.nodePositions`.
- Selection syncs to URL parameter `?node=<nodeId>`.

#### Cross-Layout Effect
- Other panels observing `selectedNodeId` update their active/highlighted row, cell, station, or bar.

#### Evidence
- `GraphView.tsx` (L158-L230), `graph-interactions.ts` (L10-L192), `GraphView.test.tsx`.

---

### Matrix (`FeatureMatrixPanel.tsx`)

#### Interactive Elements
- Matrix Grid Cells (`.matrix-cell`)
- Matrix Row Labels (`.matrix-row-label` — Source Feature)
- Matrix Column Labels (`.matrix-col-label` — Target Feature)
- Anchor Select Dropdown (`.anchor-select`)

#### Supported Gestures
- `click` matrix cell: Invokes `onSelectNode` with the source or target feature anchor node ID.
- `click` feature anchor label: Invokes `onSelectFeatureAnchor` or `onSelectNode`.
- `hover` matrix cell: Sets local state `hoveredCell` showing source, target, coupling count, and edge list.

#### Semantic Action
- `click` cell/label $\rightarrow$ Select feature anchor component and navigate to graph view for inspection.

#### State Effect
- Calls `selection.selectNode(anchorNodeId)`.
- Updates local `hoveredCell` state on hover.

#### Visual Effect
- Hovered cell displays popup card showing source/target features and direct/indirect edge count.
- Selected row/column receives highlighted CSS class (`.active-row`, `.active-col`).

#### Navigation Effect
- Calls `setWorkspaceViewMode('graph')` via `App.tsx` (L598-L612), switching active view mode to `'graph'`.

#### Persistence Effect
- None directly in Matrix; selection state persistence mediated via `App.tsx` and URL query params.

#### Cross-Layout Effect
- Updates global `selectedNodeId`, causing `GraphView` to center and highlight the feature anchor.

#### Evidence
- `FeatureMatrixPanel.tsx` (L110-L165), `FeatureMatrixPanel.test.tsx`.

---

### Heatmap (`CouplingHeatmapPanel.tsx`)

#### Interactive Elements
- HTML5 Canvas Heatmap Render Area (`canvasRef`)
- Metric Mode Toggle Buttons (`combined`, `direct`, `flow`, `shared`)
- Search Input (`.heatmap-search-input`)

#### Supported Gestures
- `click` canvas position: Translates pointer $(x, y)$ coordinates to feature cell $(i, j)$ and invokes `onSelectNode(anchorNodeId)`.
- `mousemove` canvas position: Computes hovered cell index and updates `hoveredCellInfo` tooltip.
- `mouseleave` canvas: Clears `hoveredCellInfo`.

#### Semantic Action
- `click` heatmap cell $\rightarrow$ Select feature coupling anchor node and switch to graph.

#### State Effect
- Updates local `metricMode` state.
- Invokes global `onSelectNode` handler.

#### Visual Effect
- Re-draws HTML5 canvas canvas with color gradient reflecting active metric mode (red for direct, blue for flow, purple for combined).
- Hover tooltip renders cell details over canvas coordinates.

#### Navigation Effect
- Triggers `setWorkspaceViewMode('graph')` in `App.tsx` (L681-L695).

#### Persistence Effect
- Metric mode is local state; selection updates URL parameter `?node=<nodeId>`.

#### Cross-Layout Effect
- Synchronizes `selectedNodeId` across all views.

#### Evidence
- `CouplingHeatmapPanel.tsx` (L75-L180), `CouplingHeatmapPanel.test.tsx`.

---

### River (`DependencyRiverPanel.tsx`)

#### Interactive Elements
- Sankey Flow Paths (`<path className="sankey-flow-path">`)
- Sankey Layer Node Rectangles (`<rect className="sankey-node-rect">`)
- Search Input (`.river-search-input`)
- Return Button (`.return-graph-btn`)

#### Supported Gestures
- `click` node rectangle: Invokes `onSelectNode(nodeId)`.
- `click` flow path: Sets local state `selectedFlowId`.
- `hover` node rectangle / flow path: Sets `hoveredNodeId` or `hoveredFlowId`.
- `click` return button: Invokes `onReturnToGraph()`.

#### Semantic Action
- `click` node $\rightarrow$ Select node and navigate to graph.
- `click` flow $\rightarrow$ Highlight macro dependency corridor between architectural layers.

#### State Effect
- Updates `selectedNodeId` or local `selectedFlowId`.

#### Visual Effect
- Selected flow path expands stroke-width and increases opacity to 0.9; non-selected flows dim to opacity 0.15.
- Node rectangle receives highlight border.

#### Navigation Effect
- Node click invokes `setWorkspaceViewMode('graph')` via `App.tsx` (L699-L710).

#### Persistence Effect
- Selection syncs to URL parameter `?node=<nodeId>`.

#### Cross-Layout Effect
- `GraphView` highlights the selected node.

#### Evidence
- `DependencyRiverPanel.tsx` (L60-L150), `DependencyRiverPanel.test.tsx`.

---

### Tree (`FeatureTreePanel.tsx`)

#### Interactive Elements
- Tree Expander Icons (`.tree-expander` ▶/▼)
- Tree Node Rows (`.tree-node-row`)
- Search Input (`.tree-search-input`)

#### Supported Gestures
- `click` expander icon: Toggles expanded set (`expandedNodeIds`).
- `click` component node row: Invokes `onSelectNode(nodeId)`.
- `hover` tree node row: Sets local state `hoveredTreeNodeId`.

#### Semantic Action
- `click` expander $\rightarrow$ Expand/collapse domain or feature subtree.
- `click` component $\rightarrow$ Select component and navigate to graph canvas.

#### State Effect
- Modifies `expandedNodeIds` Set in local state.
- Invokes global `selectNode`.

#### Visual Effect
- Chevron rotates 90°; child nodes show/hide.
- Selected node row receives `.selected` background highlight.

#### Navigation Effect
- Component node click triggers `setWorkspaceViewMode('graph')` via `App.tsx` (L743-L755).

#### Persistence Effect
- Tree expander state is view-local; search query expands matching parent nodes dynamically.

#### Cross-Layout Effect
- Updates global `selectedNodeId`.

#### Evidence
- `FeatureTreePanel.tsx` (L45-L120), `FeatureTreePanel.test.tsx`.

---

### Treemap (`ArchitectureTreemapPanel.tsx`)

#### Interactive Elements
- Treemap Rectangles (`.treemap-rect` / `.treemap-cell`)
- Metric Toggle Buttons (`count` vs `loc` vs `complexity`)
- Color Scheme Toggle Buttons (`layer` vs `risk`)
- Breadcrumb Subtree Buttons (`.treemap-breadcrumb`)
- Action Button ("Explore in Graph")

#### Supported Gestures
- `click` leaf rectangle: Calls `onSelectComponent(nodeId)`.
- `click` container rectangle: Sets `activeSubtreeId` to drill into feature/domain subtree.
- `hover` rectangle: Sets `hoveredNode`.
- `click` "Explore in Graph" button: Calls `onExploreInGraph(nodeId)`.

#### Semantic Action
- `click` container $\rightarrow$ Zoom/filter treemap subtree.
- `click` leaf $\rightarrow$ Select component in-place or explore in graph.

#### State Effect
- Updates local `activeSubtreeId`, `metricMode`, or `colorScheme`.
- Updates `selectedNodeId`.

#### Visual Effect
- Treemap layout re-computes bounding boxes for active subtree using Squarified Treemap layout algorithm (`treemap-layout.ts`).
- Hover card shows component size, percentage of parent, risk, and layer.

#### Navigation Effect
- `onExploreInGraph` triggers `setWorkspaceViewMode('graph')` in `App.tsx` (L630-L644).

#### Persistence Effect
- Metric and color scheme selection are local component state.

#### Cross-Layout Effect
- Global `selectedNodeId` updated.

#### Evidence
- `ArchitectureTreemapPanel.tsx` (L55-L140), `ArchitectureTreemapPanel.test.tsx`.

---

### Subway (`SubwayPanel.tsx`)

#### Interactive Elements
- Subway Station Circles (`.subway-station`)
- Route Lines (`.subway-route-line`)
- Cross-Line Track Toggle Checkbox (`showCrossLineTracks`)
- Station Detail Panel & "Explore in Graph" Button

#### Supported Gestures
- `click` station circle: Calls `onSelectNode(nodeId)` and updates local `selectedStation`.
- `hover` station circle: Sets hovered tooltip state.
- `click` "Explore in Graph" button: Calls `onExploreInGraph(nodeId)`.

#### Semantic Action
- `click` station $\rightarrow$ Select transit station component in Subway view without leaving panel.
- `click` explore button $\rightarrow$ Navigate explicitly to Graph canvas.

#### State Effect
- Updates local `selectedStation` and global `selectedNodeId`.
- Toggles local `showCrossLineTracks` boolean.

#### Visual Effect
- Active station grows radius; route lines connected to active station highlight while unrelated lines dim.
- Detail card displays line transfers, incoming/outgoing routes, and node metrics.

#### Navigation Effect
- Clicking station maintains `'subway'` mode; clicking "Explore in Graph" triggers `setWorkspaceViewMode('graph')` via `App.tsx` (L646-L661).

#### Persistence Effect
- Cross-line track visibility is local component state.

#### Cross-Layout Effect
- Updates global `selectedNodeId`.

#### Evidence
- `SubwayPanel.tsx` (L40-L110), `SubwayPanel.test.tsx`.

---

### Constellation (`DependencyConstellationPanel.tsx`)

#### Interactive Elements
- Focal Component Central Node (`.focal-node`)
- Concentric Ring Nodes (`.constellation-node`)
- Depth Select Dropdown (`maxDepth`: 1, 2, 3)
- Direction Select Buttons (`both`, `dependencies`, `dependents`)
- Focal Node Selector Dropdown
- Return to Graph Button (`.return-graph-btn`)

#### Supported Gestures
- `click` ring node: Invokes `onSelectNode(nodeId)`.
- `change` focal node / depth / direction controls: Triggers `onOptionChange` callback.
- `hover` ring node: Sets `hoveredNodeId`.
- `click` return button: Calls `onReturnToGraph()`.

#### Semantic Action
- `click` ring node $\rightarrow$ Select node in-place or update focal node context.
- `change` options $\rightarrow$ Re-project polar layout coordinates around focal component.

#### State Effect
- Updates `constellationOptions` state in `App.tsx` (L235-L245).
- Updates global `selectedNodeId`.

#### Visual Effect
- Re-computes polar coordinate positions $(r, \theta)$ in `constellation-layout.ts`.
- Concentric rings (Ring 1, Ring 2, Ring 3) re-draw with smooth radial placement.

#### Navigation Effect
- Node selection stays within `'constellation'` mode; return button switches to `'graph'`.

#### Persistence Effect
- Options stored in `App.tsx` state during session.

#### Cross-Layout Effect
- Synchronizes active node selection across all panels.

#### Evidence
- `DependencyConstellationPanel.tsx` (L50-L130), `DependencyConstellationPanel.test.tsx`.

---

### Profile (`FeatureProfilePanel.tsx`)

#### Interactive Elements
- Component List Items (`.profile-list-item`)
- Profile Tab Buttons (`Overview`, `Dependencies`, `Dependents`, `Refactoring`)
- Search Input (`.profile-search-input`)
- Edge Dependency Items (`.profile-edge-item`)

#### Supported Gestures
- `click` component list item: Sets local `activeProfileId` and calls `onSelectNode(nodeId)`.
- `click` edge item: Invokes `onSelectNode(targetNodeId)`.

#### Semantic Action
- `click` item $\rightarrow$ Select component, display full architectural profile, and switch to graph.

#### State Effect
- Updates local `activeProfileId` and global `selectedNodeId`.

#### Visual Effect
- Component profile card renders health scores, incoming/outgoing edge lists, cycle involvement, and risk indicators.

#### Navigation Effect
- Selecting a component triggers `setWorkspaceViewMode('graph')` in `App.tsx` (L729-L741).

#### Persistence Effect
- Selection syncs to URL parameter `?node=<nodeId>`.

#### Cross-Layout Effect
- Updates global `selectedNodeId`.

#### Evidence
- `FeatureProfilePanel.tsx` (L30-L110), `FeatureProfilePanel.test.tsx`.

---

### Radar (`RadarPanel.tsx`)

#### Interactive Elements
- SVG Polygon Area & Axis Points (`.radar-axis-point`, `.radar-polygon`)
- Dimension Table Rows (`.radar-dim-row`)
- Missing Primitives Banner

#### Supported Gestures
- `hover` axis point / table row: Sets local `hoveredDimId`.
- `click` axis point / table row: Sets local `selectedDimId`.

#### Semantic Action
- `hover`/`click` dimension $\rightarrow$ Inspect global architectural health metric (e.g. Circular Dependencies, Hotspots, High Risk Ratio).

#### State Effect
- Modifies local `hoveredDimId` and `selectedDimId` state.
- **Does NOT invoke `onSelectNode` or update `selectedNodeId`** (Radar reflects org-wide macro metrics).

#### Visual Effect
- Radar polygon highlights the selected axis; inspector panel displays metric formula, raw value, native unit, and status.

#### Navigation Effect
- Remains on `'radar'` workspace mode; zero navigation side effects.

#### Persistence Effect
- Local state only.

#### Cross-Layout Effect
- Zero cross-layout selection propagation (Read-only org summary lens).

#### Evidence
- `RadarPanel.tsx` (L60-L140), `RadarPanel.test.tsx`, `RADAR_SAFETY_REGRESSION_VERIFICATION.md`.

---

### DNA (`ArchitectureDNABarcode.tsx`)

#### Interactive Elements
- Component Barcode Rows (`.dna-row`)
- Barcode Band Segments (`.dna-band` — Risk, Layer, Type, Health)
- Search Input (`.dna-search-input`)

#### Supported Gestures
- `click` barcode row / band: Sets local `activeComponentId` and calls `onSelectNode(nodeId)`.
- `hover` barcode band: Sets `hoveredBandId` showing segment metadata.

#### Semantic Action
- `click` barcode $\rightarrow$ Select component by multi-band signature and switch to graph view.

#### State Effect
- Updates local `activeComponentId` and global `selectedNodeId`.

#### Visual Effect
- Active barcode row highlights; inspector drawer renders multi-band breakdown (Risk color, Layer pattern, Type glyph).

#### Navigation Effect
- Component selection triggers `setWorkspaceViewMode('graph')` via `App.tsx` (L715-L727).

#### Persistence Effect
- Selection syncs to URL query params.

#### Cross-Layout Effect
- Updates global `selectedNodeId`.

#### Evidence
- `ArchitectureDNABarcode.tsx` (L40-L120), `ArchitectureDNABarcode.test.tsx`.

---

### FourDirection (`FourDirectionPanel.tsx`)

#### Interactive Elements
- Cardinal Quadrant Cards (`North` Upstream, `South` Downstream, `East` Internal, `West` Lateral)
- Quadrant Item List Rows (`.four-dir-item`)
- Subject Selector Dropdown
- Return to Graph Button (`.return-graph-btn`)

#### Supported Gestures
- `click` quadrant item: Calls `onSelectNode(nodeId)` and sets `selectedItemNodeId`.
- `change` subject selector: Updates focal subject component.
- `click` return button: Calls `onReturnToGraph()`.

#### Semantic Action
- `click` quadrant item $\rightarrow$ Select neighboring component in Cardinal view.
- `click` return button $\rightarrow$ Switch to Graph canvas.

#### State Effect
- Updates `selectedNodeId`.

#### Visual Effect
- Selected item highlights within its Cardinal quadrant card (e.g. Upstream/North).
- Inspector card shows connection path and type.

#### Navigation Effect
- Item click stays in `'four-direction'` mode; return button triggers `setWorkspaceViewMode('graph')` in `App.tsx` (L663-L679).

#### Persistence Effect
- Selection syncs to URL parameter `?node=<nodeId>`.

#### Cross-Layout Effect
- Updates global `selectedNodeId`.

#### Evidence
- `FourDirectionPanel.tsx` (L40-L130), `FourDirectionPanel.test.tsx`.

---

## 5. Gesture → Semantic Action Mapping

| Gesture | UI Interaction Handler | Semantic Action | Visualization | State Effect | Navigation Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Click Node** | `cy.on('tap', 'node', ...)` | Select Node & Open Investigation | `GraphView` | `selectedNodeId = id`, `isInvestigating = true` | None (Stays on Graph) |
| **Click Node** | `onSelectNode(id)` | Select Component & Open Graph View | `Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Profile`, `DNA` | `selectedNodeId = id`, `isInvestigating = true` | `setWorkspaceViewMode('graph')` |
| **Click Station** | `handleStationClick(s)` | Select Station In-Place | `Subway` | `selectedNodeId = s.nodeId` | None |
| **Click Explore**| `handleExploreClick(id)` | Open Selected Component in Graph Canvas | `Subway`, `Treemap` | `selectedNodeId = id`, `isInvestigating = true` | `setWorkspaceViewMode('graph')` |
| **Click Ring Node**| `onSelectNode(id)` | Select Polar Neighbor | `Constellation` | `selectedNodeId = id` | None |
| **Click Return** | `onReturnToGraph()` | Return to Interactive Graph Canvas | `Constellation`, `FourDirection`, `River` | None | `setWorkspaceViewMode('graph')` |
| **Click Cell** | `onClick(e)` canvas | Select Feature Coupling Anchor | `Heatmap` | `selectedNodeId = anchorId` | `setWorkspaceViewMode('graph')` |
| **Click Quadrant**| `onSelectNode(id)` | Select Cardinal Neighbor | `FourDirection` | `selectedNodeId = id` | None |
| **Click Dimension**| `setSelectedDimId(id)`| Inspect Health Dimension | `Radar` | `selectedDimId = id` | None |
| **Drag Node** | `cy.on('dragfree', ...)` | Custom Position Authoring | `GraphView` | `nodePositions[id] = {x, y}` | None |
| **Double Click**| `cy.on('dblclick', ...)`| Fit Canvas to Screen | `GraphView` | Viewport Pan/Zoom | None |
| **Keydown Esc** | `window.on('keydown')` | Clear Active Selection | Global / `App` | `selectedNodeId = null`, `isInvestigating = false` | None |

---

## 6. Cross-Layout Selection Semantics

The application supports selection across multiple domain entities:

```text
Selection Target
  ├── Node / Component (selectedNodeId: string | null)
  ├── Edge / Dependency (selectedEdgeId: string | null)
  ├── Finding (selectedFindingId: string | null)
  ├── Cycle (selectedCycleId: string | null)
  ├── Unresolved Edge (selectedUnresolvedEdgeId: string | null)
  └── Investigation Proposal (selectedInvestigationId: string | null)
```

### Propagation Behavior for Selection Targets

1. **Node / Component Selection (`selectedNodeId`)**:
   - **State**: Managed in `SelectionContext` and mirrored in `useViewState`.
   - **Propagation**: Observed by all 12 analytical panels, `InvestigationDrawer`, `Sidebar`, `StatusBar`, and URL query manager.
   - **Visual Response**:
     - `GraphView`: Node highlighted, connected edges lit, background dimmed.
     - `Tree` / `Profile` / `DNA` / `FourDirection`: Active row/card receives `.selected` styling.
     - `Subway` / `Constellation`: Station/Ring node highlighted.
   - **Navigation Response**: Triggers view mode switch to `'graph'` in 8 out of 12 views.

2. **Edge Selection (`selectedEdgeId`)**:
   - **State**: Managed in `SelectionContext`.
   - **Propagation**: Observed by `GraphView` and `DiagnosticsPanel`.
   - **Visual Response**: Selected edge turns active color with animated flow dash; non-selected edges dim.

3. **Finding Selection (`selectedFindingId`)**:
   - **State**: Managed in `useViewState` and `App.tsx`.
   - **Propagation**: Observed by `FindingsPanel` and `GraphView`.
   - **Visual Response**: `GraphView` highlights all involved nodes (`selectedCycleNodeIds`) and pulses the primary offending component.

---

## 7. Selection Equivalence Analysis

Selecting the same underlying domain component across different visualization lenses produces the following state and side effects:

| Lens Domain Entity | Source Element | State Effect | Navigation Side Effect | Drawer State |
| :--- | :--- | :--- | :--- | :--- |
| **Graph Node** | Cytoscape Node | `selectedNodeId = id` | Stays on Graph View | `isInvestigating = true` |
| **Matrix Cell Anchor** | Feature Row Anchor | `selectedNodeId = anchorId` | Switches to `'graph'` | `isInvestigating = true` |
| **Heatmap Cell Anchor**| Canvas $(x, y)$ Cell | `selectedNodeId = anchorId` | Switches to `'graph'` | `isInvestigating = true` |
| **River Layer Node** | SVG Node Rect | `selectedNodeId = id` | Switches to `'graph'` | `isInvestigating = true` |
| **Tree Component** | Tree Row | `selectedNodeId = id` | Switches to `'graph'` | `isInvestigating = true` |
| **Treemap Leaf** | Treemap Rect | `selectedNodeId = id` | Switches to `'graph'` | `isInvestigating = true` |
| **Subway Station** | Station Circle | `selectedNodeId = id` | Stays on Subway View | `isInvestigating = true` |
| **Constellation Node** | Polar Ring Node | `selectedNodeId = id` | Stays on Constellation View | `isInvestigating = true` |
| **Profile Component** | Profile List Item | `selectedNodeId = id` | Switches to `'graph'` | `isInvestigating = true` |
| **DNA Barcode Row** | Barcode Row | `selectedNodeId = id` | Switches to `'graph'` | `isInvestigating = true` |
| **FourDirection Item** | Cardinal List Item | `selectedNodeId = id` | Stays on FourDirection View | `isInvestigating = false` |
| **Radar Dimension** | Axis Point | `selectedDimId = id` | Stays on Radar View | Unaffected |

### Key Equivalence Observation
Selecting a component in **Subway**, **Constellation**, or **FourDirection** updates `selectedNodeId` without forcing a view transition to `Graph`, whereas selecting a component in **Matrix**, **Heatmap**, **River**, **Tree**, **Treemap**, **Profile**, or **DNA** updates `selectedNodeId` AND forces an immediate navigation command to `Graph`.

---

## 8. Selection → Navigation Coupling

In current production code, selection and navigation are tightly coupled in the parent wrapper handlers defined in `App.tsx`:

```typescript
// App.tsx L598-L612: FeatureMatrixPanel wrapper
<FeatureMatrixPanel
  data={visibleActiveData}
  selectedNodeId={selection.selectedNodeId}
  onSelectNode={(nodeId) => {
    selection.selectNode(nodeId);
    view.setIsInvestigating(true);
    setWorkspaceViewMode('graph'); // Tightly coupled navigation side effect
  }}
/>
```

### Call Chains for Selection-Driven Navigation

1. **Matrix / Heatmap / River / Tree / Profile / DNA Component Selection**:
   ```text
   User Click
     ↓
   Panel Handler (e.g. onSelectNode(id))
     ↓
   App.tsx Callback
     ├→ selection.selectNode(id)
     ├→ view.setIsInvestigating(true)
     └→ setWorkspaceViewMode('graph')
   ```

2. **Treemap / Subway Explicit "Explore in Graph" Action**:
   ```text
   User Click "Explore in Graph"
     ↓
   Panel Handler (onExploreInGraph(id))
     ↓
   App.tsx Callback
     ├→ selection.selectNode(id)
     ├→ view.setIsInvestigating(true)
     └→ setWorkspaceViewMode('graph')
   ```

3. **Subway / Constellation / FourDirection Direct Item Click**:
   ```text
   User Click Item
     ↓
   Panel Handler (onSelectNode(id))
     ↓
   App.tsx Callback
     ├→ selection.selectNode(id)
     └→ view.setIsInvestigating(true) (Subway/Constellation only)
   ```

---

## 9. Explicit Navigation Actions

The application provides dedicated UI controls whose sole primary purpose is workspace navigation or view switching:

1. **`ViewModeSwitcher.tsx` Buttons**:
   - **Gesture**: Click on any of the 18 mode buttons (`Graph`, `Overview`, `Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Subway`, `Constellation`, `Profile`, `Radar`, `DNA`, `Four-Dir`, `Findings`, `Hotspots`, `Diagnostics`, `Compare`, `History`).
   - **Handler**: `handleModeSelect(m)` $\rightarrow$ `setWorkspaceViewMode(m)`.
   - **Side Effects**: Switches center workspace pane without altering selection or filters.

2. **"Return to Graph Canvas" Button** (`SubwayPanel.tsx`, `DependencyConstellationPanel.tsx`, `FourDirectionPanel.tsx`, `DependencyRiverPanel.tsx`):
   - **Gesture**: Click button.
   - **Handler**: `onReturnToGraph()` $\rightarrow$ `setWorkspaceViewMode('graph')`.
   - **Side Effects**: Preserves `selectedNodeId` while returning focus to Cytoscape canvas.

3. **"Explore Graph" Action Button** (`ProjectDashboard.tsx`, `FindingsPanel.tsx`, `HotspotPanel.tsx`):
   - **Gesture**: Click action button on dashboard or finding card.
   - **Handler**: `onExploreGraph()` / `onInvestigateNode(id)`.
   - **Side Effects**: Selects target node and navigates to `'graph'`.

---

## 10. Cross-Layout Interaction Propagation

The following diagram illustrates how an interaction in Layout A propagates through shared state to affect Layout B:

```text
   [ Layout A: e.g. FeatureTreePanel ]
                  │
             (User Click)
                  │
                  ▼
       selection.selectNode(id)
                  │
                  ▼
      [ Shared Selection State ]
        (selectedNodeId = 'X')
                  │
         ┌────────┴────────┐
         ▼                 ▼
  [ App.tsx Sync ]    [ URL Manager ]
         │         (params.set('node', 'X'))
         │
    ┌────┴───────────────────────────┐
    ▼                                ▼
[ Layout B: GraphView ]     [ Layout C: Sidebar / Drawer ]
 (Center & Highlight)        (Open Investigation Details)
```

### Confirmed Cross-Layout Propagation Paths

1. **Tree/Matrix/Profile Selection $\rightarrow$ Graph View**:
   - `selectedNodeId` updates $\rightarrow$ `GraphView` receives prop $\rightarrow$ `selectNode()` highlights node, dims non-neighbors, and centers camera.
2. **Sidebar Search Filter $\rightarrow$ All Lenses**:
   - `searchQuery` / `visibleNodeTypes` updates in `Sidebar` $\rightarrow$ `App.tsx` re-computes `visibleActiveData` via `filterGraphByNodeTypes()` $\rightarrow$ All 12 open/rendered panel components instantly re-render with updated node set.
3. **Graph Node Selection $\rightarrow$ Subway / Profile / Tree / DNA**:
   - Selecting a node in `GraphView` updates `selectedNodeId` $\rightarrow$ If user later switches to `Profile`, `Tree`, or `DNA`, the panel automatically highlights the matching component row.

---

## 11. Interaction Compatibility Matrix

| Feature / Interaction | Graph | Matrix | Heatmap | River | Tree | Treemap | Subway | Constellation | Profile | Radar | DNA | FourDir |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Select Component** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Yes |
| **Select Edge** | Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Hover Tooltip** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Yes | No |
| **Pan / Drag Canvas**| Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Zoom Viewport** | Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Fit-to-Screen** | Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Filter Node Types**| Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Search Filter** | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Yes |
| **Focus Sub-graph** | Yes | No | No | No | No | No | No | Yes | No | No | No | No |
| **Impact Analysis** | Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Drill Subtree/Depth**| Yes | No | No | No | Yes | Yes | No | Yes | No | No | No | No |
| **Direct Navigation**| Self | Auto | Auto | Auto | Auto | Opt | Opt | Opt | Auto | Self | Auto | Opt |

*Legend: Auto = Automatic switch to Graph on selection; Opt = Optional action button to switch to Graph; Self = In-place view.*

---

## 12. Hover / Highlight Semantics

Transient hover interaction is strictly separated from persistent selection across all visualization components:

```text
Hover Event
  ↓
Local React Component State (e.g. hoveredNodeId, hoveredCell, hoveredFlowId)
  ↓
View-Local Overlay Render (Tooltip card, glow border, stroke expansion)
  ↓
Mouse Leave Event
  ↓
State Cleared (null)
```

### Component Hover Mechanics

- **`GraphView`**: Cytoscape `mouseover` triggers `NodeHoverCard` or `EdgeHoverCard` rendered as floating absolute HTML overlays over canvas coordinates.
- **`FeatureMatrixPanel`**: Hovering cell updates `hoveredCell` state, displaying target/source feature edge counts.
- **`CouplingHeatmapPanel`**: Mouse move computes cell $(i, j)$ on HTML5 canvas and updates `hoveredCellInfo` tooltip overlay.
- **`DependencyRiverPanel`**: Hovering Sankey path sets `hoveredFlowId`, expanding SVG path stroke-width.
- **`RadarPanel`**: Hovering axis point sets `hoveredDimId`, highlighting matching metric row in inspector table.

---

## 13. Focus / Investigation Interactions

Investigation actions isolate specific sub-graphs or trace dependency paths:

1. **Focus Graph Extraction (`FocusControls.tsx`, `focus-graph.ts`)**:
   - **Trigger**: Click "Focus" button in `GraphControls.tsx`.
   - **Parameters**: `focusNodeId`, `depth` (1, 2, 3, ALL), `direction` (`upstream`, `downstream`, `both`).
   - **State Update**: Updates `focusState` in `useViewState.ts`.
   - **Derived Data**: `computeFocusedGraph()` filters active graph nodes and edges to $N$-depth neighborhood.
   - **URL Sync**: Query parameters `?focusNode=<id>&focusDepth=<d>&focusDir=<dir>`.

2. **Impact Analysis (`ImpactControls.tsx`, `impact-analysis.ts`)**:
   - **Trigger**: Click "Show Impact" in drawer or command palette.
   - **Parameters**: `originNodeId`, `depth`.
   - **Derived Data**: Transitive closure calculation identifies all affected upstream/downstream components.
   - **Visual Effect**: Highlights affected nodes in red/orange; updates `StatusBar` count.

3. **Progressive Drilling (`InvestigationDrawer.tsx`, `drill.ts`)**:
   - **Trigger**: Click "Drill Into Component" in drawer.
   - **State Effect**: Appends node ID to `drillPath: string[]`.
   - **Visual Effect**: Drawer renders breadcrumbs (`Root > Component A > Component B`); lists ranked dependencies and dependents.

---

## 14. Visibility Interactions

Visibility interactions filter presentation without modifying underlying canonical graph dataset or position authority:

1. **Node Type Visibility Toggles (`Sidebar.tsx`, `search-filter.ts`)**:
   - **Controls**: Checkboxes for `ApexClass`, `ApexTrigger`, `LWC`, `Flow`, `Object`, `CustomField`, etc.
   - **State**: `visibleNodeTypes: ExplorerNodeType[]` in `filterState`.
   - **Handler**: `filterGraphByNodeTypes(nodes, edges, visibleTypes)`.
   - **Affected Views**: **All 12 visualizations re-render synchronously** using `visibleActiveData`.
   - **Persistence**: Persisted to `localStorage` under `projectState.filters.visibleNodeTypes`.

2. **Semantic Filter Toggles**:
   - `hideTests`: Hides test classes and test methods.
   - `hasCallouts`: Isolates components with external HTTP callouts.
   - `withoutSharing`: Isolates Apex classes lacking explicit sharing declarations.

---

## 15. Filter Interactions

Filter controls alter the active view model dataset:

- **Search Query (`searchQuery`)**: Text search executed via `searchNodes()` matching `displayName`, `name`, `id`, `file`, or `featureId`.
- **Risk Level Filter (`riskFilter`)**: Filters components by risk tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Reset Filters Button**: Resets `filterState` to `createEmptyFilterState()`, clearing search query and restoring all node types.

---

## 16. Zoom / Pan / Viewport Interactions

Spatial viewport controls apply exclusively to `GraphView.tsx`:

- **Controls**: Floating toolbar in `GraphControls.tsx` (`+` Zoom In, `-` Zoom Out, `Fit` Fit-to-View, `Center` Center Selected).
- **Handlers**:
  - Zoom In/Out: Modifies Cytoscape zoom level by $\pm 1.2\times$.
  - Fit-to-View: `cy.fit(padding = 50)`.
  - Center Selected: `cy.center(cy.$('#' + selectedNodeId))`.
- **Persistence**: Zoom/Pan position is ephemeral canvas state during session; reset on window reload unless stored in project state.

---

## 17. Keyboard / Accessibility Interactions

1. **Keyboard Escape Listener (`App.tsx` L304-L312)**:
   - Pressing `Escape` when `selectedNodeId` is active clears node selection, resets `drillPath`, and sets `isInvestigating = false`.
2. **Command Palette Keyboard Shortcut (`useCommandPalette.ts`)**:
   - Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) opens `CommandPalette.tsx`.
3. **Form & Button Accessibility**:
   - All interactive controls feature explicit `aria-label`, `role="toolbar"`, `role="group"`, and `data-testid` attributes.

---

## 18. Multi-Selection

- **Single Node Selection**: Primary node selection is strictly scalar (`selectedNodeId: string | null`).
- **Multi-Node Contexts**:
  - Cycle Highlighting: `selectedCycleNodeIds: string[]` highlights multi-node circular dependency loops.
  - Multi-Type Filter: `visibleNodeTypes: ExplorerNodeType[]` supports set-based type selection.
  - Simulated Operations: `simulatedNodeIds`, `simulatedRemovedNodeIds` highlight batches of nodes during refactoring simulation.

---

## 19. Interaction State Lifetime

| Interaction State | Lifetime Classification | Persistence Location |
| :--- | :--- | :--- |
| **Hover Tooltips** (`hoveredCell`, `hoveredNodeId`) | Ephemeral | Component React `useState` |
| **Active Tab** (`diagnosticsTab`, `drawerTab`) | Ephemeral / View-Local | Component React `useState` |
| **Active Node Selection** (`selectedNodeId`) | Workspace-Local / URL | `SelectionContext` & URL `?node=` |
| **Focus / Impact Parameters** | Workspace-Local / URL | `useViewState` & URL `?focusNode=` |
| **Visible Node Types** (`visibleNodeTypes`) | Project-Scoped | `localStorage` (`projectState.filters`) |
| **Custom Node Positions** (`nodePositions`) | Project-Scoped | `localStorage` (`projectState.graphLayout`) |
| **Layout Mode** (`interactive` vs `static`) | Project-Scoped | `localStorage` (`projectState.graphLayout`) |
| **Active Project Selection** (`activeProjectId`) | Project-Scoped / URL | `localStorage` & URL `?project=` |

---

## 20. URL / Deep-Link Interaction Effects

Interaction state is bi-directionally synchronized with URL search query parameters via `useViewState.ts` and `explorer/src/lib/url/`:

| URL Parameter | Associated State | Decoder / Encoder Module | Restoration Behavior |
| :--- | :--- | :--- | :--- |
| `?project=<id>` | `activeProjectId` | `ProjectStateContext.tsx` | Switches project context on mount |
| `?node=<id>` | `selectedNodeId` | `useViewState.ts` | Restores selected node & opens drawer |
| `?view=<mode>` | `workspaceViewMode` | `filterQuery.ts` | Opens specific workspace view lens |
| `?investigate=true` | `isInvestigating` | `investigationQuery.ts` | Expands `InvestigationDrawer` |
| `?focusNode=<id>` | `focusState.focusNodeId` | `focusQuery.ts` | Restores focused sub-graph view |
| `?focusDepth=<d>` | `focusState.depth` | `focusQuery.ts` | Sets neighborhood focus depth |
| `?impactNode=<id>` | `impactState.originNodeId`| `impactQuery.ts` | Restores blast-radius impact analysis |
| `?search=<q>` | `filterState.searchQuery` | `filterQuery.ts` | Applies text search filter |
| `?type=<type>` | `filterState.typeFilter` | `filterQuery.ts` | Applies single type filter |
| `?risk=<risk>` | `filterState.riskFilter` | `filterQuery.ts` | Applies risk tier filter |

---

## 21. Project Switching During Interaction

When the active project is switched (e.g. from `cst` to `default`), `App.tsx` and `useViewState.ts` execute a clean state reset:

```typescript
// useViewState.ts L90-L110
window.addEventListener('explorer:project-changed', () => {
  setSelectedNodeId(null);
  setSelectedFindingId(null);
  setSelectedCycleId(null);
  setSelectedUnresolvedEdgeId(null);
  setIsInvestigating(false);
  setFilterState(createEmptyFilterState());
  setFocusState(createEmptyFocusState());
  setImpactState(createEmptyImpactState());
});
```

### Verified Project Boundary Behavior
1. Node selection, focus state, impact state, and search queries are **completely cleared**.
2. Saved project preferences (`nodePositions`, `visibleNodeTypes`, `layoutMode`) for the new project are loaded from `localStorage`.
3. URL search parameters are re-written to reflect the new project ID without stale node references.

---

## 22. Compare Mode

Compare Mode (`ComparePanel.tsx`, `useCompareState.ts`) provides interactive architecture snapshot comparison:

- **Interactive Capabilities**:
  - Selecting snapshot pairs (`Before` vs `After`).
  - Filtering snapshot diffs by entity status (`Added`, `Removed`, `Modified`, `Unchanged`).
  - Clicking a diff entity highlights the element and updates `compareState.focusedEntityId`.
  - Propagates selection to `selectedNodeId` or `selectedEdgeId` if the entity exists in the active graph dataset.

---

## 23. Interaction Edge Cases

1. **Clicking Empty Space**: Deselects active node/edge, closes unpinned `InvestigationDrawer`.
2. **Selecting Filtered / Hidden Node**: Defensive effect in `App.tsx` (L290-L302) automatically detects if a selected node becomes hidden by node-type filters and clears `selectedNodeId` to prevent invalid drawer states.
3. **`NOT_ANALYZED` Project State**: Displays `NotAnalyzedScreen` with terminal command instructions, disabling graph canvas interactions until analysis data is exported.
4. **Rapid View Switching**: View transitions maintain `selectedNodeId` seamlessly across lens switches without triggering redundant layout re-computations.

---

## 24. Interaction Ordering / Chained Effects

The system executes strict execution sequences for complex interactive workflows:

```text
Sequence: Select Node in Treemap Panel
  1. User clicks Treemap leaf rectangle
  2. Panel invokes onSelectComponent(nodeId)
  3. App.tsx callback fires:
     a) selection.selectNode(nodeId) -> Updates SelectionContext
     b) view.setIsInvestigating(true) -> Opens InvestigationDrawer
     c) setWorkspaceViewMode('graph') -> Switches view pane to Cytoscape canvas
  4. React re-renders workspace: GraphSlot mounts
  5. GraphView effect runs selectNode(nodeId):
     a) cytoscape.$('#' + nodeId).select()
     b) Camera centers on node
     c) Connected edges lit; non-neighbors dimmed
  6. URL sync effect runs replaceState(): URL parameter ?node=<nodeId> updated
```

---

## 25. Cross-Layout Semantic Consistency

| Semantic Action | Layout | Implementation Handler | Shared State Updated | Navigation Effect | Propagation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Component** | Graph | `cy.on('tap', 'node')` | `selectedNodeId` | None | Drawer opens, edge highlights |
| **Select Component** | Matrix | `onSelectNode` | `selectedNodeId` | Switches to Graph | Drawer opens, Graph centers |
| **Select Component** | River | `onSelectNode` | `selectedNodeId` | Switches to Graph | Drawer opens, Graph centers |
| **Select Component** | Tree | `onSelectNode` | `selectedNodeId` | Switches to Graph | Drawer opens, Graph centers |
| **Select Component** | Treemap | `onSelectComponent` | `selectedNodeId` | None (In-Place) | Drawer opens |
| **Select Component** | Subway | `handleStationClick` | `selectedNodeId` | None (In-Place) | Station detail card opens |
| **Select Component** | Constellation| `onSelectNode` | `selectedNodeId` | None (In-Place) | Polar rings highlight |
| **Select Component** | Profile | `onSelectNode` | `selectedNodeId` | Switches to Graph | Drawer opens, Graph centers |
| **Select Component** | DNA | `onSelectNode` | `selectedNodeId` | Switches to Graph | Drawer opens, Graph centers |
| **Select Component** | FourDirection| `onSelectNode` | `selectedNodeId` | None (In-Place) | Quadrant card highlights |

---

## 26. Interaction Dependency Graph

```text
                       [ User Interaction Event ]
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [ Pointer Click ]       [ Control Input ]         [ Keyboard Esc ]
         │                         │                         │
         ▼                         ▼                         ▼
 [ Panel Handler ]         [ Sidebar / Filter ]       [ App.tsx Listener ]
         │                         │                         │
         ├─────────────────────────┘                         │
         ▼                                                   ▼
 [ Shared Context Updates ]                           [ Clear State ]
  ├── SelectionContext (selectedNodeId)                ├── selectedNodeId = null
  ├── ProjectStateContext (nodePositions, filters)     └── isInvestigating = false
  └── useViewState (focusState, impactState)
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
 [ Derived Data Computation ]             [ URL Query Sync ]
  ├── filterGraphByNodeTypes()             (params.set('node', id))
  ├── computeFocusedGraph()
  └── adapt<Lens>Data()
         │
         ▼
 [ Visual Presentation Render ]
  ├── GraphView (Cytoscape selection & centering)
  ├── Active Panel (Highlighted row / cell / station)
  └── InvestigationDrawer (Render component profile)
```

---

## 27. Existing Interaction Contracts

The following explicit interfaces and hooks enforce interaction invariants across the application:

1. **`SelectionContextType`** (`SelectionContext.tsx`):
   - Guarantees uniform `selectedNodeId`, `selectedEdgeId`, `selectNode()`, `selectEdge()`, and `clear()` access across all React components.
2. **`ProjectStateContextValue`** (`ProjectStateContext.tsx`):
   - Guarantees deterministic project-isolated state persistence and restoration.
3. **Position Authority Policy (`position-policy.ts`)**:
   - Enforces a 5-level priority hierarchy preventing automatic UI triggers or viewport operations from overwriting Level 1 user-authored drag positions.
4. **Canonical Visibility Non-Interference (`search-filter.ts`)**:
   - Guarantees that filtering graph nodes by type (`filterGraphByNodeTypes`) never mutates input node or edge arrays.

---

## 28. Existing Tests / Regression Coverage

The following test suites actively protect interaction behavior:

| Test Suite | Location | Interactions Covered | What It Protects |
| :--- | :--- | :--- | :--- |
| **Cross-Layout Visibility & Selection** | `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx` | Visibility filtering, cross-layout selection rendering | Verifies all 12 panels render correctly with active selection and visibility filters without crashing |
| **Graph Interaction Integrity** | `explorer/src/test/GraphView.interactionIntegrity.test.tsx` | Node tap, drag, double-click, cycle highlight | Protects Cytoscape event binding, position authority preservation, and camera centering |
| **Project Isolation & Persistence** | `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx` | Project switching, state isolation | Ensures state for Project A never pollutes Project B |
| **URL Query Managers** | `explorer/src/lib/url/urlQuery.test.ts` | URL deep-link encoding and decoding | Verifies round-trip URL serialization for focus, impact, filters, and findings |
| **Command Palette Interactions** | `explorer/src/hooks/useCommandPalette.test.ts` | Shortcut `Cmd+K`, selection, focus commands | Protects command palette search and execution callbacks |
| **Analytical Lens Renderers** | `explorer/src/components/*.test.tsx` | In-panel selection, options toggling | Protects individual panel rendering and selection callback dispatch |

---

## 29. Confirmed Differences vs Potential Gaps

### Confirmed Implementation Differences (Intentional Visualization Semantics)
- **Automatic vs In-Place Navigation**:
  - *Difference*: Selecting a component in Matrix, River, Tree, Profile, or DNA automatically navigates to Graph view (`setWorkspaceViewMode('graph')`), whereas selecting a component in Subway, Constellation, or FourDirection updates selection in-place.
  - *Classification*: Intentional semantic distinction — macro/hierarchical lenses act as navigation launchers into the graph, while spatial/radial lenses support multi-step in-context exploration.
- **Org Summary vs Component Focus**:
  - *Difference*: `RadarPanel` does not participate in `selectedNodeId` selection because it renders org-wide aggregated architecture health dimensions.
  - *Classification*: Intentional domain model property.

### Potential Gaps (Areas Lacking Explicit Interaction Contracts)
- **Edge Selection Coverage in Non-Graph Lenses**: Non-graph analytical lenses do not currently expose UI mechanisms to select or inspect individual dependency edges (`selectedEdgeId`).
- **Keyboard Navigation in Spatial Lenses**: Treemap, Subway, and Constellation lenses rely primarily on pointer click events and do not currently implement full keyboard arrow-key focus traversal.

---

## 30. Risks and Ambiguities

1. **Dual Selection State Representation (`SelectionContext` vs `useViewState`)**:
   - Both `useGraphSelection` (held in `SelectionContext`) and `useViewState` maintain `selectedNodeId` state. `App.tsx` syncs them via `useEffect`. In edge cases involving rapid consecutive project switches, race conditions could theoretically cause transient selection desynchronization if not guarded by `explorer:project-changed` listeners.
2. **Viewport Zoom Reset on Mode Switch**:
   - Cytoscape viewport zoom/pan coordinates are not saved in `ZoomPanState` when switching away from `'graph'` view and returning later, causing the graph canvas to execute a default `fitView()`.

---

## 31. Questions for Phase 1

1. Should selection in macro lenses (Matrix, Tree, Profile, DNA) continue automatically forcing a workspace view mode switch to `'graph'`, or should all lenses adopt a unified "Select In-Place + Optional Explore in Graph" pattern like Subway and Treemap?
2. Should individual dependency edges (`selectedEdgeId`) become selectable entities within macro flow lenses like `DependencyRiverPanel`?
3. Should Cytoscape viewport zoom and pan coordinates be persisted across workspace view switches so users return to their exact spatial location on the graph canvas?

---

## 32. Evidence Index

### Source Code References
- `explorer/src/App.tsx` — Main application layout, view mode switching, and interaction wrapper callbacks.
- `explorer/src/components/GraphView.tsx` — Cytoscape graph canvas, node drag, overlay canvas, and tap handlers.
- `explorer/src/components/FeatureMatrixPanel.tsx` — Feature dependency matrix grid and cell click handlers.
- `explorer/src/components/CouplingHeatmapPanel.tsx` — HTML5 canvas coupling heatmap and hover/click coordinate mapping.
- `explorer/src/components/DependencyRiverPanel.tsx` — SVG Sankey flow paths and layer node selection.
- `explorer/src/components/FeatureTreePanel.tsx` — Expandable tree hierarchy and expander state.
- `explorer/src/components/ArchitectureTreemapPanel.tsx` — Treemap squarified layout and subtree zoom.
- `explorer/src/components/SubwayPanel.tsx` — Metro station interchange and route line selection.
- `explorer/src/components/DependencyConstellationPanel.tsx` — Polar ring coordinate calculation and focal options.
- `explorer/src/components/FeatureProfilePanel.tsx` — Component profile list and health metric display.
- `explorer/src/components/RadarPanel.tsx` — Multi-dimensional radial polygon chart and visual scaling.
- `explorer/src/components/ArchitectureDNABarcode.tsx` — Component barcode rows and multi-band signature hover.
- `explorer/src/components/FourDirectionPanel.tsx` — Cardinal quadrant neighborhood cards and item selection.
- `explorer/src/context/SelectionContext.tsx` — Central selection provider wrapping `useGraphSelection`.
- `explorer/src/context/ProjectStateContext.tsx` — Project state provider and localStorage persistence.
- `explorer/src/hooks/useViewState.ts` — View state manager, URL query synchronization, and project change listener.
- `explorer/src/lib/graph-interactions.ts` — Cytoscape helper functions for selection, cycle highlight, and camera fit.
- `explorer/src/lib/position-policy.ts` — 5-level Position Authority precedence hierarchy.
- `explorer/src/lib/search-filter.ts` — Canonical node-type filtering (`filterGraphByNodeTypes`).
- `explorer/src/lib/url/index.ts` — Deep-link URL query parameter encoders and decoders.

### Test References
- `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx`
- `explorer/src/test/GraphView.interactionIntegrity.test.tsx`
- `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx`
- `explorer/src/lib/url/urlQuery.test.ts`
- `explorer/src/hooks/useCommandPalette.test.ts`
- `explorer/src/components/RadarPanel.test.tsx`
- `explorer/src/components/FeatureProfilePanel.test.tsx`
- `explorer/src/components/FeatureTreePanel.test.tsx`
- `explorer/src/components/FourDirectionPanel.test.tsx`
- `explorer/src/components/SubwayPanel.test.tsx`

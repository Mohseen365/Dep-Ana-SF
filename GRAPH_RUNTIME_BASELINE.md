# Graph Runtime Baseline & Forensic Audit

This document provides a forensic analysis of the Explorer graph implementation across the codebase. No source code has been modified during this audit.

---

## 1. Core Module Analysis

### 1.1 `GraphView.tsx` (`explorer/src/components/GraphView.tsx`)
* **Role**: Primary React wrapper and lifecycle controller for Cytoscape.js.
* **Key Components & Hooks**:
  * `forwardRef<GraphViewRef, GraphViewProps>` component mounting `#cytoscape-view` div.
  * `useImperativeHandle(ref, ...)` exposing control methods (`zoomIn`, `zoomOut`, `fitView`, `centerSelected`, `resetLayout`).
  * `cyRef = useRef<cytoscape.Core | null>(null)` holding live Cytoscape instance.
  * `nodesRef` / `edgesRef` keeping internal refs in sync with props without triggering re-render.
* **Key Effects**:
  1. **Main Initialization Effect** (Lines 170–317, `deps: [onSelectNode, onSelectEdge]`): Instantiates `cytoscape(...)`, configures extensions, attaches window/resize listeners, hover card listeners, keyboard shortcuts (`handleKeyDown`), and binds interactions via `bindGraphInteractions`.
  2. **Element Synchronization Effect** (Lines 320–388, `deps: [nodes, edges]`): Syncs React prop changes with Cytoscape. Clears existing elements via `cy.batch(() => { cy.elements().remove(); cy.add(newElements); })`, re-runs layout via `runLayout`, and re-applies active selection/impact/cycle/focus highlights.
  3. **Selection Effects**:
     * `deps: [selectedNodeId, selectedEdgeId]` (Lines 342–359): Centers and selects node.
     * `deps: [selectedEdgeId]` (Lines 362–376): Selects and centers edge.
  4. **Highlight & Mode Effects**:
     * `deps: [impactResult]` (Lines 379–406): Classes nodes/edges (`impact-origin`, `impact-affected`, `impact-muted`).
     * `deps: [selectedCycleNodeIds]` (Lines 409–418): Invokes `highlightCycle` / `clearCycleHighlight`.
     * `deps: [focusedNodeId]` (Lines 421–430): Invokes `focusOnNode` / `clearHighlights`.
  5. **Navigator Effect** (Lines 76–90, `deps: [isNavigatorVisible]`): Re-attaches or destroys Cytoscape navigator widget.

### 1.2 `graph-layout.ts` (`explorer/src/lib/graph-layout.ts`)
* **Role**: Layout configuration factory and runner abstraction using `cytoscape-fcose`.
* **Key Functions**:
  * `getLayoutOptions(options: GraphLayoutOptions)` (Lines 14–29): Calculates node-count-based density scale (`Math.sqrt(nodeCount / 20)`) and sets padding, `idealEdgeLength`, `nodeRepulsion` (8000 * density), `gravity` (0.15), and `animationDuration` (500ms).
  * `createLayout(cy, options)` (Lines 47–50): Instantiates layout object via `cy.layout(getLayoutOptions(options))`.
  * `runLayout(cy, options)` (Lines 52–55): Calls `layout.run()`.
  * `LAYOUT_PRESETS` (Lines 31–45): Standard preset definitions (`stable`, `animated`, `fast`, `quality`).

### 1.3 `graph-builder.ts` (`explorer/src/lib/graph-builder.ts`)
* **Role**: Adapter converting raw `ExplorerNode` and `ExplorerEdge` data structures into Cytoscape element definitions (`ElementDefinition[]`).
* **Key Functions**:
  * `buildGraphElements(nodes, edges)` (Lines 31–59): Populates explicit node element definitions, scans edges for missing implicit external endpoints via `createExternalNodeElement`, and appends edge element definitions.
  * `createNodeElement(node)` (Lines 61–80): Maps `ExplorerNode` to Cytoscape node definition with `data: GraphNodeData` (`id`, `label`, `type`, `risk`, `coupling`, `fanIn`, `fanOut`, `isTest`, `hasCycles`, `hasUnresolved`, `file`).
  * `createExternalNodeElement(nodeId)` (Lines 82–104): Generates fallback node elements for external targets missing from node inventory.
  * `createEdgeElement(edge)` (Lines 106–120): Maps `ExplorerEdge` to Cytoscape edge definition with `data: GraphEdgeData` (`id`, `source`, `target`, `relationshipType`, `method`, `unresolved`, `evidence`).

### 1.4 `graph-interactions.ts` (`explorer/src/lib/graph-interactions.ts`)
* **Role**: Event binding, camera control, selection management, and visual highlighting library.
* **Key Functions**:
  * `bindGraphInteractions(cy, callbacks, originalNodes)` (Lines 17–126): Attaches `'tap'` handlers on `node`, `edge`, and background (`cy`), plus `'mouseover'` / `'mouseout'` cursor styling handlers.
  * Camera Functions:
    * `fitToScreen(cy, padding = 50)` (Lines 131–133): `cy.fit(undefined, padding)`.
    * `centerGraph(cy, animated)` (Lines 138–149): Centers viewport on `cy.elements()`.
    * `zoomToFit(cy, padding)` (Lines 155–157): Alias for `cy.fit`.
    * `panToNode(cy, nodeId, animated)` (Lines 285–296): Animates or pans viewport to target node.
    * `zoomGraph` / `zoomIn` / `zoomOut` (Lines 298–318): Modifies zoom scale around viewport center.
  * Highlighting & Drilling:
    * `selectNode(cy, nodeId)` (Lines 168–175): Selects node element.
    * `deselectAll(cy)` (Lines 180–182): Unselects all elements.
    * `highlightNodeConnections` (Lines 187–211): Dims unrelated components, highlights neighbors.
    * `highlightCycle(cy, cycleNodeIds)` (Lines 218–268): Dims non-cycle elements and fits view to cycle nodes.
    * `focusOnNode(cy, nodeId)` (Lines 355–385): Centers viewport on node (300ms easing) without zoom alteration, and dims non-adjacent elements.

### 1.5 `focus-graph.ts` (`explorer/src/lib/focus-graph.ts`)
* **Role**: Pure data transformation library for focus graph isolation by depth and direction.
* **Key Types & Interfaces**:
  * `FocusDirection = 'both' | 'dependencies' | 'dependents'`
  * `FocusDepth = 1 | 2 | 3 | 'ALL'`
  * `FocusState = { enabled: boolean; focusNodeId: string | null; direction: FocusDirection; depth: FocusDepth }`
* **Key Functions**:
  * `computeFocusedGraph(nodes, edges, focusState)` (Lines 111–154): Constructs graph adjacency map (`buildAdjacencyMap`). Uses BFS traversal (`getReachableNodesOut` for outgoing dependencies, `getReachableNodesIn` for incoming dependents) up to specified depth to calculate reachable node set. Slices and returns `{ nodes, edges, centerNodeId }`.
  * `createEmptyFocusState()` (Lines 171–178): Returns disabled initial focus state.

### 1.6 `search-filter.ts` (`explorer/src/lib/search-filter.ts`)
* **Role**: Node search and graph visibility filtering engine.
* **Key Functions**:
  * `applyFilters(nodes, edges, filterState)` (Lines 123–178): Evaluates `typeFilter`, `riskFilter`, `hasCallouts`, `withoutSharing`, `hideTests`, `hasAsyncPatterns`, and `searchQuery`. Returns `FilteredGraphData`.
  * `filterGraphByNodeTypes(nodes, edges, visibleTypes)` (Lines 228–242): Filters nodes based on active type checkboxes (`filterNodesByVisibleTypes`) and restricts edges to visible endpoints (`filterEdgesByVisibleNodes`).
  * `createEmptyFilterState()` (Lines 244–255): Returns default filter state where `visibleNodeTypes = [...ALL_EXPLORER_NODE_TYPES]`.

### 1.7 `explorer.ts` (`explorer/src/types/explorer.ts`)
* **Role**: Domain types and data schema definitions for the Explorer system.
* **Key Node & Edge Interfaces**:
  * `ExplorerNodeType`: Union of canonical node types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`).
  * `ExplorerNode`: Core model containing `id`, `displayName`, `type`, `file`, `metrics`, `risk`, `behavior`, `refactoringReadiness`.
  * `ExplorerEdge`: Core model containing `id`, `source`, `target`, `relationshipType`, `method`, `evidence`, `unresolved`, `canonical`.
  * `ExplorerDataSchema`: Root contract for `explorer-data.json`.

### 1.8 `projectState.ts` (`explorer/src/lib/projectState.ts`) & State Architecture
* **Role**: Project-scoped state persistence and restoration module.
* **Key Data Structures & Functions**:
  * `ProjectUIState`: Interface capturing `projectId`, `selectedComponent`, `filters`, `graphLayout`, `zoom`, `sidebarState`, `inspectorState`, `navigatorState`, `analysisView`, `comparisonState`.
  * `loadProjectState(projectId)` / `saveProjectState(projectId, state)`: Persists and reads state in `localStorage` under `explorer.projectState.<projectId>`.
* **State Stack Interaction**:
  * `ProjectContext.tsx`: Manages project switching, manifest parsing, data URL derivation, and dispatches custom event `'explorer:project-changed'`.
  * `useViewState.ts`: Manages query state serialization and reads initial node/edge/filter/focus/investigation params from URL. Resets state on `'explorer:project-changed'`.
  * `App.tsx`: Central coordinator connecting `ProjectContext`, `useExplorerData`, `useGraphSelection`, `useViewState`, `GraphView`, and side panels.

---

## 2. Exhaustive Runtime Determination & Trace Call Paths

### 2.1 Where Cytoscape is Created
* **File**: `explorer/src/components/GraphView.tsx`
* **Lines**: 185–193 (Main Cytoscape Initialization `useEffect`)
* **Code Section**:
  ```ts
  const cy = cytoscape({
    container: containerRef.current,
    elements: elements,
    style: styles,
    layout: layoutOptions,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.2,
    boxSelectionEnabled: true,
    autounselectify: false
  });
  cyRef.current = cy;
  ```
* **Call Path**:
  1. `App.tsx` mounts `<GraphSlot>` -> `<GraphView>`.
  2. `GraphView.tsx` mounts `<div ref={containerRef} className="cytoscape-view" />`.
  3. `useEffect` callback executes once `containerRef.current` exists, instantiating `cytoscape(...)` and storing the reference in `cyRef.current`.

---

### 2.2 Where Nodes and Edges are Created
* **File**: `explorer/src/lib/graph-builder.ts`
* **Functions**: `buildGraphElements`, `createNodeElement`, `createExternalNodeElement`, `createEdgeElement`
* **Lines**: 31–120
* **Call Paths**:
  1. **Initial Mount**:
     * `GraphView.tsx` Line 173: `const elements = buildGraphElements(nodesRef.current, edgesRef.current);`
     * `elements` array is passed directly into `cytoscape({ elements, ... })`.
  2. **Data / Filter / Focus Prop Updates**:
     * `App.tsx` recomputes `visibleGraphData.nodes` and `visibleGraphData.edges`.
     * `GraphView.tsx` Element Synchronization Effect fires (Line 320):
       ```ts
       const newElements = buildGraphElements(nodes, edges);
       cy.batch(() => {
         cy.elements().remove();
         cy.add(newElements);
       });
       ```

---

### 2.3 Every Location That Calls a Layout
1. **Cytoscape Constructor Initial Run**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 185)
   * **Mechanism**: Passing `layout: layoutOptions` to `cytoscape(...)` automatically executes layout on initial element load.
2. **Element Synchronization Effect**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 333–338)
   * **Function**: `runLayout(cy, { nodeCount: nodes.length, animate: ... })`
   * **Trigger**: Any change to `nodes` or `edges` props (focus, filtering, project switch).
3. **Imperative Ref Control (`resetLayout`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 135–141)
   * **Function**: `runLayout(cyRef.current, ...)`
   * **Trigger**: Invoked when parent calls `graphRef.current.resetLayout()`.
4. **Floating Controls Reset Layout Button**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 493–500)
   * **Function**: `runLayout(cyRef.current, ...)`
   * **Trigger**: User clicks "Reset Layout" button in `GraphControls.tsx`.

---

### 2.4 Every Location That Changes `node.position()`
* **Forensic Finding**: Neither `node.position()` nor `node.positions()` is called imperatively anywhere in the application runtime code!
* **Mechanism**: Node positioning is governed completely by:
  1. Cytoscape `fcose` layout algorithm executed via `runLayout(cy, ...)`.
  2. Interactive user drag events on the canvas.
* **Note**: `nodePositions` is declared as an interface field in `GraphLayoutState` (`explorer/src/lib/projectState.ts` Line 31) for schema persistence, but is not imperatively mutated at runtime.

---

### 2.5 Every Location That Calls `fit()`
1. **Helper Function `fitToScreen`**:
   * **File**: `explorer/src/lib/graph-interactions.ts` (Lines 131–133)
   * **Code**: `cy.fit(undefined, padding);`
2. **Helper Function `zoomToFit`**:
   * **File**: `explorer/src/lib/graph-interactions.ts` (Lines 155–157)
   * **Code**: `cy.fit(undefined, padding);`
3. **Cycle Highlight Focus**:
   * **File**: `explorer/src/lib/graph-interactions.ts` (Lines 258–267)
   * **Code**: `cy.animate({ fit: { eles: cycleNodes, padding: 50 } }, { duration: 300, easing: 'ease-in-out' })`
4. **Isolated Node Drilling Fallback in `focusOnNode`**:
   * **File**: `explorer/src/lib/graph-interactions.ts` (Lines 362, 368)
   * **Code**: `fitToScreen(cy, 50)` called if drilled node has 0 direct neighbors in the active visible set.
5. **Imperative Ref Method (`fitView`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 114–118)
   * **Code**: `fitToScreen(cyRef.current, 50)`
6. **Floating Controls Fit Button**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 486)
   * **Code**: `fitToScreen(cyRef.current, 50)`
7. **Keyboard Shortcut (`f` / `F` / `0`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 418)
   * **Code**: `fitToScreen(cy, 50)`

---

### 2.6 Every Location That Calls `center()`
1. **Main Canvas Initialization**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 213)
   * **Code**: `cy.center()`
2. **Imperative Ref Method (`centerSelected`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 120–127)
   * **Code**: `cy.animate({ center: { eles: ele } }, { duration: 250 })`
3. **Node Selection Effect**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 351–356)
   * **Code**: `cy.animate({ center: { eles: node }, zoom: cy.zoom() }, { duration: 200, easing: 'ease-out' })`
4. **Edge Selection Effect**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 369–374)
   * **Code**: `cy.animate({ center: { eles: edge }, zoom: cy.zoom() }, { duration: 200, easing: 'ease-out' })`
5. **Floating Controls Center Button**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 489–492)
   * **Code**: `cy.animate({ center: { eles: ele } }, { duration: 200 })`
6. **Helper Functions in `graph-interactions.ts`**:
   * `centerGraph` (Lines 138–149): `cy.animate({ center: { eles: cy.elements() } })` or `cy.center()`
   * `panToNode` (Lines 285–296): `cy.animate({ center: { eles: node } })` or `cy.center(node)`
   * `focusOnNode` (Lines 374–382): `cy.animate({ center: { eles: node }, zoom: cy.zoom() }, { duration: 300, easing: 'ease-in-out' })`

---

### 2.7 Every Location That Calls `zoom()`
1. **Initial Scale Assignment**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 206–212)
   * **Code**: `cy.zoom(initialZoom)` based on `nodeCount` threshold (< 15: 1.4, < 50: 1.0, < 200: 0.7, else: 0.4).
2. **Semantic Zoom Class Listener**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 217)
   * **Code**: `const currentZoom = cy.zoom();` inside throttled 60ms scroll listener.
3. **Imperative Ref Methods (`zoomIn` / `zoomOut`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 98–111)
   * **Code**: `cyRef.current.zoom({ level: cyRef.current.zoom() * 1.2, renderedPosition: ... })` and `* 0.8`.
4. **Keyboard Shortcuts (`+` / `=` / `-` / `_`)**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 420–422)
   * **Code**: `cy.zoom(cy.zoom() * 1.2)` / `cy.zoom(cy.zoom() * 0.8)`.
5. **Floating Control Buttons**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 468–483)
   * **Code**: `cyRef.current.zoom({ level: cyRef.current.zoom() * 1.2, ... })`.
6. **Helper Functions in `graph-interactions.ts`**:
   * `zoomGraph` (Lines 298–303): `cy.zoom({ level, renderedPosition })`
   * `zoomIn` / `zoomOut` (Lines 305–318): `cy.zoom({ level: currentZoom * 1.2 / 1.2, renderedPosition })`

---

### 2.8 Every Location That Adds/Removes Elements
1. **Initial Cytoscape Instance Creation**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 185)
   * Elements passed during instantiation: `elements = buildGraphElements(nodes, edges)`.
2. **Element Synchronization Effect**:
   * **File**: `explorer/src/components/GraphView.tsx` (Lines 327–330)
   * **Code**:
     ```ts
     cy.batch(() => {
       cy.elements().remove();
       cy.add(newElements);
     });
     ```
3. **Instance Teardown**:
   * **File**: `explorer/src/components/GraphView.tsx` (Line 310)
   * **Code**: `cy.destroy()` inside cleanup function removes all DOM canvas elements and internal stores.

---

### 2.9 Every Location That Causes Graph Remount
1. **Component-Level Unmount / Remount**:
   * Occurs in `App.tsx` when `workspaceViewMode` changes away from `'graph'` (e.g. to `'dashboard'`, `'findings'`, `'hotspots'`, `'diagnostics'`, `'compare'`, or `'history'`) and back to `'graph'`.
2. **Cytoscape Instance Destruction & Re-creation**:
   * Occurs inside `GraphView.tsx` in the main initialization `useEffect` (Lines 170–317).
   * **Dependency Array**: `[onSelectNode, onSelectEdge]`.
   * If parent `App.tsx` alters reference identity of `onSelectNode` or `onSelectEdge`, the cleanup function executes `cy.destroy()` and runs the entire initialization sequence again.
3. **Element Updates Do NOT Cause Remount**:
   * Changes to `nodes` or `edges` props trigger the separate **Element Synchronization Effect** (`deps: [nodes, edges]`), which imperatively mutates existing Cytoscape elements via `cy.batch(...)` without remounting Cytoscape or React.

---

### 2.10 Every Location Triggered by Selection
1. **Tap Handlers in `graph-interactions.ts`**:
   * `cy.on('tap', 'node', ...)` (Lines 22–78): resolves `ExplorerNode`, calls `onNodeTap(nodeId, nodeData)` and `onNodeSelect(explorerNode)`.
   * `cy.on('tap', 'edge', ...)` (Lines 81–91): calls `onEdgeSelect(edgeId)` and `onEdgeTap(edgeId)`.
   * `cy.on('tap', ...)` (Lines 94–103): background click calls `onBackgroundTap()` and `onNodeSelect(null)`.
2. **Selection Hook (`useGraphSelection.ts`)**:
   * `selectNode(id)`: sets `selectedNodeId`, clears `selectedEdgeId`, appends to `history`.
   * `selectEdge(id)`: sets `selectedEdgeId`, clears `selectedNodeId`.
   * `clear()`: resets both node and edge selection.
3. **App Level Coordination (`App.tsx`)**:
   * `selectedNodeId` updates URL search param `?node=<id>`.
   * Appends node ID to `recentNodeIds` and updates `drillPath`.
   * Determines `selectedNode` object.
   * Derives `isDrawerOpen = hasDrawerContent && (view.isInvestigating || isPinned)`.
4. **Canvas Visual Selection Effects in `GraphView.tsx`**:
   * `useEffect` `[selectedNodeId, selectedEdgeId]` (Lines 342–359): calls `selectNode(cy, selectedNodeId)` and animates viewport center.
   * `useEffect` `[selectedEdgeId]` (Lines 362–376): selects edge and animates viewport center.

---

### 2.11 Every Location Triggered by Double-Click / Investigation
* **Forensic Finding**: No `dblclick` or `dbltap` event is bound to Cytoscape elements in `GraphView.tsx` or `graph-interactions.ts`.
* **Investigation Mode Mechanism**: Triggered by setting `isInvestigating = true` via `useViewState`:
  1. **Canvas Node Click**: `GraphView.tsx` -> `App.tsx` (Line 662):
     `onSelectNode={(node) => { selection.selectNode(node ? node.id : null); if (node) view.setIsInvestigating(true); }}`
  2. **Sidebar Inventory Click**: `Sidebar.tsx` -> `App.tsx` (Line 652):
     `onSelectNode={(node) => { selection.selectNode(node.id); view.setIsInvestigating(true); }}`
  3. **Investigation Drawer Drilling**: `InvestigationDrawer.tsx` -> `App.tsx` (Lines 593–597):
     `handleDrill(targetId)` appends to `drillPath`, calls `selection.selectNode(targetId)`, and sets `view.setIsInvestigating(true)`.
  4. **Findings / Hotspots Panel Click**: `FindingsPanel.tsx` / `HotspotPanel.tsx` -> `App.tsx` (Lines 746, 767):
     Selects node, sets `isInvestigating(true)`, and switches workspace mode to `'graph'`.
  5. **Command Palette Selection**: `CommandPalette.tsx` -> `App.tsx` (Line 898):
     Selects node and sets `view.setIsInvestigating(true)`.
  6. **Detached Window Drill Sync**: `detached-drawer.ts` -> `App.tsx` (Line 375):
     BroadcastChannel message handler selects node and sets `view.setIsInvestigating(true)`.
* **Canvas Response During Investigation**:
  * `App.tsx` calculates `focusedNodeId = isDrawerOpen ? (drillPath.length > 0 ? drillPath[drillPath.length - 1] : selection.selectedNodeId) : null`.
  * `GraphView.tsx` `useEffect` `[focusedNodeId]` (Lines 421–430) calls `focusOnNode(cy, focusedNodeId)`.
  * `focusOnNode` in `graph-interactions.ts` animates viewport centering on the drilled node and dims all non-adjacent nodes and edges.

---

### 2.12 Every Location Triggered by Focus Depth
1. **UI Selection**:
   * User changes Depth dropdown (`1`, `2`, `3`, `ALL`) in `FocusControls.tsx`.
   * Fires `onFocusChange({ ...focusState, depth })`.
2. **State & URL Sync**:
   * `useViewState.ts` updates `focusState`.
   * `focusQuery.ts` serializes `focus.depth` to URL parameters.
3. **Graph Slicing Computation (`App.tsx` & `focus-graph.ts`)**:
   * `App.tsx` recomputes `focusedGraphData` via `useMemo` calling `computeFocusedGraph(data.nodes, data.edges, effectiveFocusState)`.
   * `computeFocusedGraph` in `focus-graph.ts` traverses adjacency map up to depth `1`, `2`, `3`, or `ALL` starting from `focusNodeId`.
   * Sliced node/edge arrays flow into `visibleGraphData` and are passed as `nodes` and `edges` props to `GraphView`.
4. **Canvas Element Sync**:
   * `GraphView.tsx` Element Synchronization Effect fires (`[nodes, edges]`).
   * Replaces canvas elements via `cy.batch(...)` and runs layout via `runLayout`.

---

### 2.13 Every Location Triggered by Focus Direction
1. **UI Selection**:
   * User changes Direction dropdown (`both`, `dependencies`, `dependents`) in `FocusControls.tsx`.
   * Fires `onFocusChange({ ...focusState, direction })`.
2. **State & URL Sync**:
   * `useViewState.ts` updates `focusState`.
   * `focusQuery.ts` serializes `focus.dir` to URL parameters.
3. **Adjacency Traversal (`focus-graph.ts`)**:
   * In `computeFocusedGraph`:
     * `dependencies` / `both`: invokes `getReachableNodesOut` (follows outgoing edges).
     * `dependents` / `both`: invokes `getReachableNodesIn` (follows incoming edges).
   * Sliced sub-graph flows through `visibleGraphData` to `GraphView` props (`nodes`, `edges`).
4. **Canvas Element Sync**:
   * `GraphView.tsx` Element Synchronization Effect fires (`[nodes, edges]`), updating elements and re-running `runLayout`.

---

### 2.14 Every Location Triggered by Visibility Filtering
1. **Filter Triggers**:
   * Node type checkboxes in `Sidebar.tsx` / `SearchFilterPanel.tsx` update `view.filterState.visibleNodeTypes`.
   * Search query, risk filter, test filter in `SearchFilterPanel.tsx` update `view.filterState`.
2. **Filter Application (`App.tsx` & `search-filter.ts`)**:
   * `App.tsx` evaluates `visibleGraphData = filterGraphByNodeTypes(focusedGraphData.nodes, focusedGraphData.edges, visibleTypes)`.
   * `filterGraphByNodeTypes` in `search-filter.ts` filters nodes via `filterNodesByVisibleTypes` and edges via `filterEdgesByVisibleNodes`.
   * Yields updated `visibleGraphData.nodes` and `visibleGraphData.edges` to `GraphView`.
3. **Canvas Element Sync**:
   * `GraphView.tsx` Element Synchronization Effect fires (`[nodes, edges]`).
   * Executes `cy.batch(() => { cy.elements().remove(); cy.add(newElements); })` and re-runs `runLayout(cy, ...)`.

---

### 2.15 Every Location Triggered by Project Switching
1. **Project Switch Action**:
   * User selects project in `ProjectSelector.tsx` or `CommandPalette.tsx`, calling `selectProject(projectId)` on `ProjectContext.tsx`.
2. **Context & URL Event Dispatch (`ProjectContext.tsx`)**:
   * Updates `activeProjectId` state.
   * Saves `explorer.activeProjectId` in `localStorage`.
   * Updates URL `?project=<projectId>` and strips single-project URL parameters (`node`, `finding`).
   * Dispatches custom window event: `window.dispatchEvent(new CustomEvent('explorer:project-changed', ...))`.
3. **Project Reset Event Handlers**:
   * `App.tsx` event listener (`'explorer:project-changed'`):
     * Loads project UI state via `loadProjectState(activeProjectId)`.
     * Clears selection (`selection.clear()`).
     * Resets findings (`setSelectedFinding(null)`).
     * Clears drill path (`setDrillPath([])`).
     * Clears recent node IDs (`setRecentNodeIds([])`).
     * Clears impact highlights (`setHighlightedImpactNodeIds(null)`).
     * Clears cycle selection (`setSelectedCycleId(null)`).
     * Sets investigation off (`view.setIsInvestigating(false)`).
     * Resets focus state (`view.setFocusState(createEmptyFocusState())`).
     * Resets impact state (`view.setImpactState(createEmptyImpactState())`).
     * Loads project-isolated filter state (`view.setFilterState(...)`).
   * `useViewState.ts` event listener (`'explorer:project-changed'`):
     * Resets all internal query/view states.
4. **Data Acquisition & Graph Re-render**:
   * `useExplorerData` hook fetches new data URL (`/projects/<projectId>/explorer-data.json`).
   * Updates `data` state in `App.tsx`.
   * Sliced dataset passes to `GraphView`, firing the Element Synchronization Effect (`[nodes, edges]`), which replaces canvas elements and executes `runLayout`.

---

### 2.16 Every Location Triggered by Graph Updates
* **Definition**: Any change to `nodes` or `edges` props passed into `GraphView`.
* **Triggers**: Dataset re-fetches, focus depth/direction changes, node type visibility filter changes, or search/risk filter changes.
* **Exact Runtime Sequence**:
  1. `App.tsx` re-evaluates `visibleGraphData` pipeline.
  2. New `nodes` and `edges` arrays pass into `<GraphView nodes={...} edges={...}>`.
  3. `GraphView.tsx` updates `nodesRef.current` and `edgesRef.current`.
  4. Element Synchronization Effect fires (`deps: [nodes, edges]`, Lines 320–388):
     * Step A: Construct element definitions via `buildGraphElements(nodes, edges)`.
     * Step B: Perform atomic batch update:
       ```ts
       cy.batch(() => {
         cy.elements().remove();
         cy.add(newElements);
       });
       ```
     * Step C: Re-run layout via `runLayout(cy, { nodeCount: nodes.length, animate: ... })`.
     * Step D: Re-apply active node or edge selection (`selectNode(cy, selectedNodeId)`).
     * Step E: Re-apply impact mode classes if `impactResult` exists.
     * Step F: Re-apply cycle highlights if `selectedCycleNodeIds` exists.
     * Step G: Re-apply focus drilling centering and dimming if `focusedNodeId` exists (`focusOnNode(cy, focusedNodeId)`).

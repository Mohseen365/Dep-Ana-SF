# GRAPH STATE & PROJECT PERSISTENCE BASELINE AUDIT

## 1. Trace: UI → GraphView → ProjectStateContext → projectState → persistence

This section traces the full execution path, data flow, and state updates from user interactions in the UI down to browser persistence.

### Step 1: UI Layer (`App.tsx` & `main.tsx`)
- **Files**: `explorer/src/main.tsx`, `explorer/src/App.tsx`, `explorer/src/components/Header.tsx`, `explorer/src/components/Sidebar.tsx`
- **Component Entry**:
  In `main.tsx`, the component tree is wrapped in providers:
  `ProjectProvider` (`ProjectContext.tsx`) → `ProjectStateProvider` (`ProjectStateContext.tsx`) → `SelectionProvider` (`SelectionContext.tsx`) → `App` (`App.tsx`).
- **Orchestration**:
  - `App.tsx` invokes custom hooks: `useProject()`, `useGraphSelection()`, `useViewState()`, `useCompareState()`, `useCommandPalette()`.
  - `App.tsx` computes visible graph data (`visibleGraphData`) based on node type visibility filters (`view.filterState.visibleNodeTypes`) and focus/impact modes.
  - `App.tsx` renders `GraphSlot`, passing `visibleGraphData.nodes`, `visibleGraphData.edges`, `selectedNodeId`, `selectedEdgeId`, `focusedNodeId`, and `focusState`.

### Step 2: Canvas / Graph View Layer (`GraphView.tsx`)
- **File**: `explorer/src/components/GraphView.tsx`
- **Functions**: `GraphView` (forwardRef React component), `bindGraphInteractions`, `runLayout`
- **Cytoscape Mounting & Execution**:
  - Main `useEffect` (`[onSelectNode, onSelectEdge]`): Instantiates the Cytoscape core instance (`cytoscape({ container: containerRef.current, ... })`) with initial elements built via `buildGraphElements(nodes, edges)`, graph styles from `getGraphStyles()`, and `fcose` force-directed layout options from `getLayoutOptions()` (`explorer/src/lib/graph-layout.ts`).
  - Element Sync `useEffect` (`[nodes, edges]`): When React props `nodes` or `edges` update, Cytoscape imperatively clears and re-adds elements (`cy.batch(() => { cy.elements().remove(); cy.add(newElements); })`) and re-runs `runLayout(cy, ...)` to layout nodes dynamically in canvas memory.
  - Interactive User Dragging / Zooming: When users zoom, pan, or drag nodes on canvas, position changes exist **only** inside Cytoscape's internal C++ / JavaScript object model (`cy.nodes().position()`). Cytoscape drag/position events are **not** wired to any `projectState` update handlers.

### Step 3: Project State Context (`ProjectStateContext.tsx`)
- **File**: `explorer/src/context/ProjectStateContext.tsx`
- **Provider / Functions**: `ProjectStateProvider`, `useProjectState()`, `updateStateSlice`, `updateFilters`, `updateGraphLayout`, `updateZoom`, `switchProjectState`, `resetProjectState`.
- **Role & State Management**:
  - Holds active project ID in `activeProjectId` state and `activeProjectIdRef`.
  - Holds active project's UI state in `projectState` state and `projectStateRef`.
  - Exposes domain update functions (`updateSelectedComponent`, `updateFilters`, `updateGraphLayout`, `updateZoom`, `updateSidebarState`, `updateInspectorState`, `updateNavigatorState`, `updateAnalysisView`, `updateComparisonState`).
  - Listens to DOM custom event `explorer:project-changed` to persist current project state before switching and loading target project state.

### Step 4: Project UI State Contract (`projectState.ts`)
- **File**: `explorer/src/lib/projectState.ts`
- **Data Structures**: `ProjectUIState`, `GraphLayoutState`, `FilterUIState`, `SelectedComponentState`, `ZoomPanState`, `SidebarUIState`, `InspectorUIState`, `NavigatorUIState`, `AnalysisViewUIState`, `ComparisonUIState`.
- **Default State Generation**: `createDefaultProjectUIState(projectId: string)`.

### Step 5: Persistence Layer (`localStorage`)
- **File**: `explorer/src/lib/projectState.ts`
- **Functions**: `loadProjectState(projectId)`, `saveProjectState(projectId, state)`, `updateProjectState(projectId, update)`, `clearProjectState(projectId)`, `getProjectStorageKey(projectId)`.
- **Storage Strategy**: Serializes state to JSON and writes to browser `window.localStorage` under key `explorer.projectState.<projectId>`.

---

## 2. Detailed Findings & Audit Determinations

### 1) Current `GraphLayoutState`
- **Exact Source File**: `explorer/src/lib/projectState.ts` (lines 28–31)
- **Type Definition**:
  ```ts
  export interface GraphLayoutState {
    layoutName: string; // e.g. 'cola' | 'cose' | 'grid' | 'concentric' | 'dagre'
    nodePositions?: Record<string, { x: number; y: number }>;
  }
  ```
- **Initialization Default**: `{ layoutName: 'cola', nodePositions: {} }` (via `createDefaultProjectUIState`).
- **Actual Runtime Behavior**:
  - In `explorer/src/lib/graph-layout.ts` and `explorer/src/components/GraphView.tsx`, the visual graph layout engine uses `fcose` (`cytoscape.use(fcose)`).
  - Cytoscape runs layout algorithms dynamically on canvas mount or when element updates occur via `runLayout(cy, ...)`.
  - `GraphLayoutState` is stored as a slice of `ProjectUIState`, but Cytoscape canvas node position changes are **never** written back into `projectState.graphLayout.nodePositions`, nor are custom positions loaded from `nodePositions` into Cytoscape.

### 2) Project State Structure
- **Exact Source File**: `explorer/src/lib/projectState.ts` (lines 68–80)
- **Interface Definition**:
  ```ts
  export interface ProjectUIState {
    projectId: string;
    selectedComponent: SelectedComponentState;
    filters: FilterUIState;
    graphLayout: GraphLayoutState;
    zoom: ZoomPanState;
    sidebarState: SidebarUIState;
    inspectorState: InspectorUIState;
    navigatorState: NavigatorUIState;
    analysisView: AnalysisViewUIState;
    comparisonState: ComparisonUIState;
    updatedAt: string;
  }
  ```
- **Slice Breakdown**:
  - `selectedComponent`: `{ selectedNodeId: string | null; selectedEdgeId: string | null; selectedInvestigationId: string | null; }`
  - `filters`: `{ searchQuery: string; typeFilter: string; riskFilter: string; hasCallouts: boolean; withoutSharing: boolean; hideTests: boolean; hasAsyncPatterns: boolean; customTags?: string[]; visibleNodeTypes?: ExplorerNodeType[]; }`
  - `graphLayout`: `{ layoutName: string; nodePositions?: Record<string, { x: number; y: number }>; }`
  - `zoom`: `{ zoom: number; pan: { x: number; y: number }; }`
  - `sidebarState`: `{ collapsed: boolean; activeTab?: string; searchQuery?: string; }`
  - `inspectorState`: `{ pinned: boolean; detached: boolean; activeTab?: string; }`
  - `navigatorState`: `{ visible: boolean; collapsed?: boolean; }`
  - `analysisView`: `{ viewMode: AnalysisViewMode; diagnosticsTab: 'cycles' | 'unresolved' | 'none'; selectedFindingId: string | null; selectedCycleId: string | null; selectedUnresolvedEdgeId: string | null; }`
  - `comparisonState`: `{ isActive: boolean; beforeRaw: string; afterRaw: string; focusedEntityId: string | null; }`
  - `updatedAt`: string (ISO 8601 timestamp)

### 3) Persistence Mechanism
- **Primary Persistence Layer**: Synchronous `window.localStorage` API.
- **Key Naming Convention**: `explorer.projectState.<projectId>` derived via `getProjectStorageKey(projectId: string)` in `explorer/src/lib/projectState.ts`.
- **Functions**:
  - `loadProjectState(projectId: string): ProjectUIState`: Reads and parses key from `localStorage`.
  - `saveProjectState(projectId: string, state: ProjectUIState): void`: Writes JSON stringified state to `localStorage`.
  - `updateProjectState(projectId: string, update: Partial<ProjectUIState>): ProjectUIState`: Reads, merges, and saves updated state atomically.
  - `clearProjectState(projectId: string): void`: Removes key from `localStorage`.

### 4) Project Switching Behavior
- **Trigger**: Initiated when `selectProject(targetId)` is called in `ProjectContext.tsx` (e.g. from `ProjectSelector.tsx`).
- **Exact Sequence**:
  1. `ProjectContext.tsx`: `selectProject(targetId)` sets active project state, writes `localStorage.setItem('explorer.activeProjectId', targetId)`, updates recent projects list in `localStorage` (`explorer.recentProjectIds`), updates URL query param `?project=<targetId>`, strips node selection params (`node`, `finding`), and dispatches custom DOM event `explorer:project-changed`.
  2. `ProjectStateContext.tsx`: Listens for `explorer:project-changed`:
     - Flushes current project state: `saveProjectState(activeProjectIdRef.current, projectStateRef.current)`.
     - Loads new project state: `loadProjectState(newId)`.
     - Updates `activeProjectId` and `projectState` React state.
     - Dispatches custom DOM event `explorer:project-state-restored` with detail `{ projectId: newId, projectState: restored }`.
  3. `App.tsx`: Listens for `explorer:project-changed`:
     - Clears single-project selection: `selection.clear()`, `setSelectedFinding(null)`, `setDrillPath([])`, `setRecentNodeIds([])`, `setHighlightedImpactNodeIds(null)`, `setSelectedCycleId(null)`.
     - Resets mode states: `view.setIsInvestigating(false)`, `view.setFocusState(createEmptyFocusState())`, `view.setImpactState(createEmptyImpactState())`.
     - Restores project-scoped node type visibility filter from `loadProjectState(activeProjectId).filters.visibleNodeTypes`.
  4. `useViewState.ts`: Listens for `explorer:project-changed` and resets URL selection query state.

### 5) Compare Behavior
- **State Location**: Managed by `useCompareState` hook (`explorer/src/hooks/useCompareState.ts`), stored in `ComparisonUIState` slice of `ProjectUIState`.
- **Functions & Execution**:
  - `runCompare()`: Parses `beforeRaw` and `afterRaw` JSON strings, calls `diffSnapshots(beforeObj, afterObj)` and `buildDiffOverlayGraph(...)` from `explorer/src/lib/diff-adapter.ts`, populating `diffResult` and `overlayGraph`.
  - `focusEntity(id)`: Sets `focusedEntityId`, which `App.tsx` syncs to `SelectionContext` (`selection.selectNode` or `selection.selectEdge`).
  - `exitCompare()`: Resets compare state.
- **Isolation on Switch**: `useCompareState` registers an event listener for `explorer:project-changed` that calls `exitCompare()` and clears `beforeRaw` and `afterRaw`, preventing stale diff comparisons across different projects.

### 6) `localStorage` Usage
The application utilizes `window.localStorage` for the following explicit keys:

| Key | Format | File Source | Purpose |
|---|---|---|---|
| `explorer.activeProjectId` | `string` | `explorer/src/context/ProjectContext.tsx` | Stores ID of currently active project |
| `explorer.recentProjectIds` | `string[]` JSON | `explorer/src/context/ProjectContext.tsx` | Stores array of up to 5 recently accessed project IDs |
| `explorer.localProjects` | `ProjectMetadata[]` JSON | `explorer/src/context/ProjectContext.tsx` | Stores client-created project definitions |
| `explorer.projectState.<projectId>` | `ProjectUIState` JSON | `explorer/src/lib/projectState.ts` | Stores isolated UI state per project |
| `explorer.drawer.pinned` | `'true'` \| `'false'` | `explorer/src/App.tsx` | Stores Investigation Drawer pin toggle |
| `explorer.drawer.detached` | `'true'` \| `'false'` | `explorer/src/App.tsx` | Stores Investigation Drawer standalone window detachment state |

### 7) Serialization / Deserialization
- **Serialization**: Handled in `saveProjectState(projectId, state)` (`explorer/src/lib/projectState.ts`, line 235) via `JSON.stringify(toSave)`. Updates `updatedAt` to current ISO string.
- **Deserialization**: Handled in `loadProjectState(projectId)` (`explorer/src/lib/projectState.ts`, line 161) via `JSON.parse(raw)` wrapped in `try...catch`.
- **Schema Evolution & Merging**: `mergeWithDefaultState(projectId, loaded)` (`explorer/src/lib/projectState.ts`, line 185) shallow-merges each loaded slice with `createDefaultProjectUIState(projectId)`, ensuring missing slices or new schema keys receive valid default values.

### 8) Initialization Defaults
- **Function**: `createDefaultProjectUIState(projectId: string)` (`explorer/src/lib/projectState.ts`, line 91)
- **Default Object**:
  ```ts
  {
    projectId,
    selectedComponent: {
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedInvestigationId: null,
    },
    filters: {
      searchQuery: '',
      typeFilter: '',
      riskFilter: '',
      hasCallouts: false,
      withoutSharing: false,
      hideTests: false,
      hasAsyncPatterns: false,
      customTags: [],
      visibleNodeTypes: [...ALL_EXPLORER_NODE_TYPES],
    },
    graphLayout: {
      layoutName: 'cola',
      nodePositions: {},
    },
    zoom: {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    },
    sidebarState: {
      collapsed: false,
      activeTab: 'all',
      searchQuery: '',
    },
    inspectorState: {
      pinned: false,
      detached: false,
      activeTab: 'overview',
    },
    navigatorState: {
      visible: true,
      collapsed: false,
    },
    analysisView: {
      viewMode: 'graph',
      diagnosticsTab: 'none',
      selectedFindingId: null,
      selectedCycleId: null,
      selectedUnresolvedEdgeId: null,
    },
    comparisonState: {
      isActive: false,
      beforeRaw: '',
      afterRaw: '',
      focusedEntityId: null,
    },
    updatedAt: new Date().toISOString(),
  }
  ```

### 9) State Update Flow
- **Flow Pattern**:
  `Component Interaction / Hook Callback`
  → Invokes `updateStateSlice(sliceKey, update)` in `ProjectStateContext.tsx`
  → Executes React functional state update `setProjectState((prev) => ...)`
  → Constructs next `ProjectUIState` with updated `updatedAt` timestamp
  → Calls `saveProjectState(prev.projectId, nextState)`, executing `localStorage.setItem('explorer.projectState.' + prev.projectId, JSON.stringify(nextState))`
  → Dispatches window custom DOM event `explorer:project-state-changed` with detail `{ projectId, projectState }`.

### 10) Whether Positions Are Already Persisted
- **Determination**: **NO**.
- **Evidence**:
  - `GraphLayoutState.nodePositions` is initialized as `{}` in `createDefaultProjectUIState`.
  - In `GraphView.tsx`, Cytoscape layout runs imperatively via `runLayout(cy, ...)` (`fcose` layout).
  - Cytoscape node position changes (e.g. user dragging nodes) remain strictly in Cytoscape runtime memory (`cy.nodes()`).
  - No event listener in `GraphView.tsx` binds Cytoscape `dragfree` or `position` events to `updateGraphLayout` or `saveProjectState`.

### 11) Whether Positions Survive Project Switching
- **Determination**: **NO**.
- **Evidence**:
  - Because node positions are not saved to `projectState.graphLayout.nodePositions`, when switching projects, `GraphView` element synchronization effect runs `cy.batch(() => { cy.elements().remove(); cy.add(newElements); })` and calls `runLayout(cy, ...)`.
  - This purges existing elements and recalculates positions dynamically using the force-directed `fcose` algorithm.

### 12) Whether Project State Is Isolated
- **Determination**: **YES**.
- **Evidence**:
  - `loadProjectState(projectId)` and `saveProjectState(projectId, state)` write to project-specific storage keys (`explorer.projectState.<projectId>`).
  - `ProjectStateContext.tsx` saves state for `activeProjectIdRef.current` before loading state for `newProjectId`.
  - Validated by unit tests in `explorer/src/context/ProjectStateContext.test.tsx`, `explorer/src/lib/projectState.test.ts`, `explorer/src/test/ProjectIsolationAndCompare.test.tsx`, and `explorer/src/test/RegressionAcceptance.test.tsx`.

### 13) Whether Hidden Nodes Retain State
- **Determination**:
  - Node metadata in `data.nodes` (from `explorer-data.json`) remains unchanged regardless of visibility settings.
  - When a node is hidden by `visibleNodeTypes` filter in `FilterUIState`, `App.tsx` clears its selection state (`selection.clear()`) if the selected node becomes hidden.
  - On the canvas, hidden nodes are filtered out of `visibleGraphData` passed to `GraphView`. Cytoscape removes them from canvas elements via `cy.elements().remove()`.
  - When made visible again, Cytoscape re-adds the elements and `runLayout` assigns newly computed positions.

### 14) Whether Graph State Is Recreated on Remount
- **Determination**: **YES**.
- **Evidence**:
  - In `explorer/src/components/GraphView.tsx`, the primary Cytoscape initialization `useEffect` (`[onSelectNode, onSelectEdge]`) runs on mount.
  - It creates a brand-new Cytoscape core instance (`cytoscape({ container: containerRef.current, ... })`), builds graph elements, applies styles, runs `fcose` layout, and sets initial zoom.
  - On unmount cleanup, it calls `cy.destroy()` and sets `cyRef.current = null`.
  - Thus, any React unmount/remount cycle destroys and recreates the Cytoscape graph canvas from scratch.

---

## 3. Exact Source Files & Functions Reference Matrix

| Feature / System Area | File Path | Relevant Functions / Interfaces |
|---|---|---|
| Main Application Layout & Slot Orchestration | `explorer/src/App.tsx` | `App()`, `GraphSlot()` |
| Cytoscape Canvas Initialization & Sync | `explorer/src/components/GraphView.tsx` | `GraphView` (forwardRef), Mount `useEffect`, Element Sync `useEffect` |
| Graph Layout Execution | `explorer/src/lib/graph-layout.ts` | `getLayoutOptions()`, `runLayout()`, `createLayout()` |
| Project UI State Context Provider | `explorer/src/context/ProjectStateContext.tsx` | `ProjectStateProvider`, `useProjectState()`, `updateStateSlice()`, `switchProjectState()`, `resetProjectState()` |
| Project Metadata Context Provider | `explorer/src/context/ProjectContext.tsx` | `ProjectProvider`, `useProject()`, `selectProject()`, `getInitialProjectId()` |
| Project UI State Schema & Storage | `explorer/src/lib/projectState.ts` | `ProjectUIState`, `GraphLayoutState`, `FilterUIState`, `loadProjectState()`, `saveProjectState()`, `createDefaultProjectUIState()`, `mergeWithDefaultState()` |
| View State & Query Sync | `explorer/src/hooks/useViewState.ts` | `useViewState()`, `readStateFromUrl()`, `syncToUrl()` |
| Snapshot Comparison State | `explorer/src/hooks/useCompareState.ts` | `useCompareState()`, `runCompare()`, `exitCompare()` |
| Application Root Mounting | `explorer/src/main.tsx` | Provider hierarchy: `ProjectProvider` → `ProjectStateProvider` → `SelectionProvider` → `App` |

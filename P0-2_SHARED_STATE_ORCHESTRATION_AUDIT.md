# P0-2 — Shared State & Orchestration Audit

**Status:** COMPLETE (READ-ONLY REPOSITORY AUDIT)
**Target File:** `P0-2_SHARED_STATE_ORCHESTRATION_AUDIT.md`
**Scope:** `explorer/src/` (State Management, App Orchestration, URL Sync, Selection, View Modes, Persistence, Project Isolation)
**Authoritativeness:** Current Code Truth (`explorer/src/`)

---

## 1. Executive Summary

This audit establishes the **CURRENT CODE TRUTH** of state management and orchestration within the Salesforce Architecture Explorer web application (`explorer/src/`). The primary objective is to expose what state currently exists, who owns it, who reads it, who writes it, how it propagates across visualizations, how it persists in browser storage and URLs, and what happens when users switch views or projects.

### Key Architectural Findings

1. **State Ownership Fragmentation:**
   Visualization state is split across **three distinct state systems** with overlapping responsibilities:
   - **`useViewState` (URL & Local React State):** Manages `viewMode`, `filterState`, `focusState`, `impactState`, `connectionState`, findings/diagnostics selections, and drawer investigation mode.
   - **`ProjectStateContext` / `projectState.ts` (Project-Scoped LocalStorage Store):** Manages `selectedComponent`, `filters`, `graphLayout`, `zoom`, `sidebarState`, `inspectorState`, `navigatorState`, `analysisView`, and `comparisonState`.
   - **`SelectionContext` / `useGraphSelection` (Context-Level Selection Hook):** Manages `selectedNodeId`, `selectedEdgeId`, and a 20-item selection `history`.

2. **Dual View Mode State Machine:**
   - `useViewState` maintains a binary `viewMode` (`'graph' | 'findings'`).
   - `App.tsx` maintains a local React state `workspaceViewMode` (`WorkspaceViewMode`) spanning **18 distinct workspace view modes**: `'graph'`, `'dashboard'`, `'matrix'`, `'heatmap'`, `'river'`, `'tree'`, `'treemap'`, `'subway'`, `'constellation'`, `'profile'`, `'radar'`, `'dna'`, `'four-direction'`, `'findings'`, `'hotspots'`, `'diagnostics'`, `'compare'`, `'history'`.
   - `ProjectStateContext` also persists `analysisView.viewMode` (`AnalysisViewMode`).
   Changes in `workspaceViewMode` in `App.tsx` do **not** automatically sync to `ProjectStateContext.analysisView.viewMode` or `useViewState.viewMode` (except when palette or panels trigger specific callbacks).

3. **Hard "Selection → Navigation" Coupling:**
   In 12 out of 18 view modes (e.g. Matrix, Heatmap, River, Tree, Treemap, Subway, Constellation, Profile, Radar, DNA, Hotspots, Findings), clicking a component node triggers **both** selection (`selection.selectNode(nodeId)`) **and** immediate forced navigation back to the interactive graph canvas (`setWorkspaceViewMode('graph')`) or opens the investigation drawer (`view.setIsInvestigating(true)`).

4. **Multi-Source Selection Duplication:**
   Selected node ID exists independently in four locations:
   - `SelectionContext` (`useGraphSelection().selectedNodeId`)
   - `useViewState` (`selectedNodeId`, derived from `urlNodeId` or `focusState.focusNodeId` / `impactState.originNodeId`)
   - `ProjectStateContext` (`projectState.selectedComponent.selectedNodeId`)
   - URL parameter (`?node=` / `?component=`)

5. **Project Isolation & Event-Driven Reset:**
   When `selectProject(id)` is invoked in `ProjectContext.tsx`, it updates `localStorage` and dispatches a custom window event (`explorer:project-changed`). Both `useViewState.ts` and `App.tsx` listen to this event and clear selections, filters, focus, impact, and simulation proposals to enforce project isolation.

---

## 2. State Architecture Overview

The frontend state architecture consists of five hierarchical layers:

```text
[ Browser Environment (URL & LocalStorage) ]
                    │
                    ▼
       ┌─────────────────────────┐
       │   ProjectContext        │ (Projects, Active Project, Data Fetching URL)
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │  ProjectStateContext    │ (Persisted UI Slices per Project ID)
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   SelectionContext      │ (Graph Selection & Selection History)
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   App.tsx Orchestrator  │ (Workspace View Mode, Simulation, Modals, Drawers)
       └─────────────────────────┘
```

---

## 3. Complete State Inventory

| State Variable | Type / Interface | Owner / Source | Consumers | Writable By | URL / Persistence | Reset Conditions | Scope |
|---|---|---|---|---|---|---|---|
| `projects` | `ProjectMetadata[]` | `ProjectContext.tsx` | `Header`, `ProjectManager`, `ProjectDashboard`, `App` | `createProject`, `updateProject`, `deleteProject`, `refreshProjects` | `localStorage` (`explorer.localProjects`) + `/project-manifest.json` | App reload / manifest update | Global |
| `activeProjectId` | `string` | `ProjectContext.tsx` | All views, `useExplorerData`, `useProjectState` | `selectProject(id)` | URL query (`?project=id`) & `localStorage` (`explorer.activeProjectId`) | Explicit project select | Global |
| `workspaceViewMode` | `WorkspaceViewMode` (18 modes) | `App.tsx` (React `useState`) | `App` render switcher, `ViewModeSwitcher`, `Header` | `setWorkspaceViewMode`, `ViewModeSwitcher`, `CommandPalette`, Navigation callbacks | URL query (`?view.mode=`) for `graph`/`findings`; local React state for others | Project change, hard reload | App / Session |
| `viewMode` | `'graph' \| 'findings'` | `useViewState.ts` | `useViewState`, URL sync | `setViewMode` | URL query (`?view.mode=findings` or `?viewMode=`) | Project change | App / URL |
| `selectedNodeId` | `string \| null` | `useGraphSelection.ts` (via `SelectionContext`) | `GraphView`, all 18 lens panels, `InvestigationDrawer`, `CommandPalette` | `selection.selectNode()`, `clear()`, graph click | URL query (`?node=id` or `?component=id`) | `selection.clear()`, project change, Escape key | Global App |
| `selectedEdgeId` | `string \| null` | `useGraphSelection.ts` (via `SelectionContext`) | `GraphView`, `DiagnosticsPanel` | `selection.selectEdge()`, `clear()`, edge click | URL query (`?edge=id`) | `selection.clear()`, project change | Global App |
| `selection.history` | `string[]` | `useGraphSelection.ts` | Internal navigation history | `selectNode()` (appends up to 20 items), `clearHistory()` | In-memory React state | `clearHistory()`, unmount | Session |
| `filterState` | `SearchFilterState` | `useViewState.ts` & `ProjectStateContext.tsx` | `Sidebar`, `GraphView`, `filterGraphByNodeTypes`, all lenses | `view.setFilterState()`, `updateFilters()`, `Sidebar` inputs | URL query (`?filter.q=`, `?filter.type=`, `?filter.risk=`, `?filter.hasCallouts=`, etc.) & `localStorage` | Reset button, project change | Project / URL |
| `focusState` | `FocusState` | `useViewState.ts` | `computeFocusedGraph`, `GraphView`, `CommandPalette` | `view.setFocusState()`, `CommandPalette` | URL query (`?focus.enabled=true`, `?focus.direction=`, `?focus.depth=`) | Reset button, project change | Session / URL |
| `impactState` | `ImpactState` | `useViewState.ts` | `computeImpactAnalysis`, `GraphView`, `CommandPalette` | `view.setImpactState()`, `CommandPalette` | URL query (`?impact.enabled=true`, `?impact.depth=`) | Reset button, project change | Session / URL |
| `connectionState` | `ConnectionQueryState` | `useViewState.ts` | `ConnectionControls`, graph filtering | `view.setConnectionState()` | URL query (`?conn.enabled=`, `?conn.direction=`, `?conn.depth=`) | Project change | Session / URL |
| `selectedFindingId` | `string \| null` | `useViewState.ts` | `FindingsPanel`, `CommandPalette`, `GraphView` | `handleSelectFinding()`, `handleClearFinding()` | URL query (`?finding=id`) | Project change, clear finding | Session / URL |
| `selectedFinding` | `ArchitectureFinding \| null` | `App.tsx` (React `useState`) | `GraphSlot`, `FindingsPanel` | `handleSelectFinding()`, `handleClearFinding()` | In-memory React state | Project change, clear | Session |
| `isInvestigating` | `boolean` | `useViewState.ts` | `InvestigationDrawer`, `App` layout (`data-drawer`) | `view.setIsInvestigating()` | URL query (`?investigate=true`) | Project change, drawer close | Session / URL |
| `nodePositions` | `Record<string, {x, y}>` | `ProjectStateContext.tsx` / `projectState.ts` | `GraphView`, `computeArchitectureLayout`, `position-policy` | `updateGraphLayout({ nodePositions })`, drag end | `localStorage` (`explorer.projectState.<projectId>`) | Project state clear | Project |
| `layoutMode` | `'interactive' \| 'static'` | `ProjectStateContext.tsx` / `projectState.ts` | `GraphView`, `position-policy` | `updateGraphLayout({ mode })`, layout toggle | `localStorage` (`explorer.projectState.<projectId>`) | Project state clear | Project |
| `architectureMode` | `'hierarchical' \| 'hybrid'` | `ProjectStateContext.tsx` / `projectState.ts` | `GraphView`, `computeArchitectureLayout` | `updateGraphLayout({ architectureMode })` | `localStorage` (`explorer.projectState.<projectId>`) | Project state clear | Project |
| `activeSimulationProposal` | `RefactoringProposal \| null` | `App.tsx` (React `useState`) | `RefactoringSimulationPanel`, `GraphSlot` | `handleStartSimulationForNode`, cancel/commit | In-memory React state | Project change, cancel, commit | Session |
| `simulationStepIndex` | `number` | `App.tsx` (React `useState`) | `RefactoringSimulationPanel`, simulation computation | `setSimulationStepIndex` | In-memory React state | Proposal change | Session |
| `committedMutatedGraph` | `ExplorerDataSchema \| null` | `App.tsx` (React `useState`) | `activeData` in `App.tsx` | `handleCommitSimulation` | In-memory React state | Project change | Session |
| `isSidebarCollapsed` | `boolean` | `App.tsx` (React `useState`) | `App` layout (`data-sidebar`), `Sidebar` | `setIsSidebarCollapsed` | In-memory React state (Default: false) | App reload | Session |
| `isPinned` | `boolean` | `App.tsx` (React `useState`) | `InvestigationDrawer` | `handleTogglePin` | `localStorage` (`explorer.drawer.pinned`) | User toggle | Global Browser |
| `isDetached` | `boolean` | `App.tsx` (React `useState`) | `InvestigationDrawer`, BroadcastChannel | `handleDetach` | `localStorage` (`explorer.drawer.detached`) | User toggle | Global Browser |
| `drillPath` | `string[]` | `App.tsx` (React `useState`) | `InvestigationDrawer` breadcrumbs | `handleDrill`, `handleNavigateBreadcrumb`, `selection` effect | In-memory React state | Project change, selection clear | Session |
| `recentNodeIds` | `string[]` | `App.tsx` (React `useState`) | `InvestigationDrawer` recent list | `selection` effect (max 5 items) | In-memory React state | Project change | Session |
| `handoffTarget` | `HandoffTarget \| null` | `App.tsx` (React `useState`) | `RefactorHandoffModal` | `handleRequestHandoff`, cancel/confirm | In-memory React state | Modal close | Session |
| `compareState` | `CompareState` | `useCompareState.ts` | `ComparePanel`, `AnalysisHistoryPanel` | `setBeforeRaw`, `setAfterRaw`, `runCompare` | In-memory React state | Project change (`explorer:project-changed`) | Session |

---

## 4. App Orchestration Audit

### Rendering Decision Logic in `App.tsx`

`App.tsx` serves as the top-level orchestrator. The conceptual rendering graph is structured as follows:

```text
App Component
 ├── Context Hooks
 │    ├── useProjectSafe() ─────────► activeProjectId, activeProject, dataUrl
 │    └── useProjectStateSafe() ────► nodePositions, layoutMode, architectureMode
 │
 ├── Data & Selection Hooks
 │    ├── useExplorerData(dataUrl) ─► data, loading, error, retry
 │    ├── useGraphSelection() ──────► selection (selectedNodeId, selectedEdgeId)
 │    ├── useViewState() ───────────► view (filterState, focusState, impactState, etc.)
 │    ├── useCompareState() ────────► compareState
 │    └── useCommandPalette() ──────► palette
 │
 ├── Computed Derived Data
 │    ├── activeData (committedMutatedGraph || data)
 │    ├── ctx & findings (createArchitectureContext + runAllRules)
 │    ├── displayNodes (searchFilter)
 │    ├── effectiveFocusState & focusedGraphData
 │    ├── visibleActiveData (filterGraphByNodeTypes for all lenses)
 │    └── simulatedGraph & effectivePositions (refactoring simulation)
 │
 ├── Top Shell
 │    ├── Header (navigation, project selector, command palette trigger)
 │    └── ViewModeSwitcher (18-mode tab selector)
 │
 ├── Main Split Pane
 │    ├── Left Slot: Sidebar (Collapsible inventory & search)
 │    ├── Center Pane: Conditional Lens Renderer (1 of 18 modes)
 │    └── Right Slot: InvestigationDrawer (when node selected & investigating/pinned)
 │
 └── Modals & Overlays
      ├── CommandPalette modal
      ├── RefactorHandoffModal
      ├── RefactoringSimulationPanel (overlaid on graph)
      └── StatusBar (bottom metrics bar)
```

### Conditional Rendering Breakdown

1. **Loading State:** If `loading === true`, renders `<LoadingScreen />`.
2. **Error State:** If `error` exists and project is not in `NOT_ANALYZED` status, renders `<ErrorScreen />`.
3. **Not Analyzed State:** If project status is `'NOT_ANALYZED'`, renders `<NotAnalyzedScreen />`.
4. **Workspace Lens Switching:** Evaluates `workspaceViewMode` switch statement:
   - `'graph'`: Renders `<GraphSlot />` with Cytoscape Canvas.
   - `'dashboard'`: Renders `<ProjectDashboard />`.
   - `'matrix'`: Renders `<FeatureMatrixPanel />`.
   - `'heatmap'`: Renders `<CouplingHeatmapPanel />`.
   - `'river'`: Renders `<DependencyRiverPanel />`.
   - `'tree'`: Renders `<FeatureTreePanel />`.
   - `'treemap'`: Renders `<ArchitectureTreemapPanel />`.
   - `'subway'`: Renders `<SubwayPanel />`.
   - `'constellation'`: Renders `<DependencyConstellationPanel />`.
   - `'profile'`: Renders `<FeatureProfilePanel />`.
   - `'radar'`: Renders `<RadarPanel />`.
   - `'dna'`: Renders `<ArchitectureDNABarcode />`.
   - `'four-direction'`: Renders `<FourDirectionPanel />`.
   - `'findings'`: Renders `<FindingsPanel />`.
   - `'hotspots'`: Renders `<HotspotPanel />`.
   - `'diagnostics'`: Renders `<DiagnosticsPanel />`.
   - `'compare'`: Renders `<ComparePanel />`.
   - `'history'`: Renders `<AnalysisHistoryPanel />`.

---

## 5. Current View Mode Architecture

| Current View Mode | Rendered Component | Key State Dependencies | URL Representation | Transition Entry Points | Functional Classification |
|---|---|---|---|---|---|
| `graph` | `GraphSlot` / `GraphView` | `simulatedGraph`, `selection`, `effectivePositions`, `focusState`, `layoutMode`, `architectureMode` | `?view.mode=graph` (default) | `ViewModeSwitcher`, Header, Escape key, Lens drill-down | Workspace / Primary Lens |
| `dashboard` | `ProjectDashboard` | `activeProject`, `activeData`, `findings` | None | `ViewModeSwitcher` ('Overview') | Workspace Overview |
| `matrix` | `FeatureMatrixPanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Matrix') | Analytical Lens |
| `heatmap` | `CouplingHeatmapPanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Heatmap') | Analytical Lens |
| `river` | `DependencyRiverPanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('River') | Macro Flow Lens |
| `tree` | `FeatureTreePanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Tree') | Hierarchy Lens |
| `treemap` | `ArchitectureTreemapPanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Treemap') | Spatial Lens |
| `subway` | `SubwayPanel` | `adaptSubwayMap(visibleActiveData)`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Subway') | Route / Station Lens |
| `constellation` | `DependencyConstellationPanel` | `adaptConstellation(visibleActiveData)`, `constellationOptions` | None | `ViewModeSwitcher` ('Constellation') | Radial Lens |
| `profile` | `FeatureProfilePanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Profile') | Component Profile Lens |
| `radar` | `RadarPanel` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Radar') | Multi-Dimensional Lens |
| `dna` | `ArchitectureDNABarcode` | `visibleActiveData`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('DNA') | Multi-Band Barcode Lens |
| `four-direction` | `FourDirectionPanel` | `adaptFourDirectionView(visibleActiveData)`, `selection.selectedNodeId` | None | `ViewModeSwitcher` ('Four-Dir') | Cardinal Neighborhood Lens |
| `findings` | `FindingsPanel` | `findings`, `selectedFinding`, `selection.selectedNodeId` | `?view.mode=findings` | `ViewModeSwitcher`, Header, `CommandPalette` | Inspection / Governance |
| `hotspots` | `HotspotPanel` | `activeData.nodes`, `cycles`, `impactSummaries` | None | `ViewModeSwitcher` | Refactoring Readiness |
| `diagnostics` | `DiagnosticsPanel` | `activeData.cycles`, `unresolvedReferences`, `diagnosticsTab` | `?diag.tab=cycles` | `ViewModeSwitcher`, Header | Diagnostics / Quality |
| `compare` | `ComparePanel` | `compareState` (`beforeRaw`, `afterRaw`, `diffResult`) | None | `ViewModeSwitcher`, Header button, History panel | Comparison Tool |
| `history` | `AnalysisHistoryPanel` | `activeProjectId`, `activeProject`, `compareState` | None | `ViewModeSwitcher`, Dashboard link | Timeline / Auditing |

---

## 6. Selection Architecture

### Complete Selection Flow Trace

```text
User Click Action
   │
   ├── Graph Canvas Click (Node/Edge) ──────► GraphView.onSelectNode() / onSelectEdge()
   ├── Sidebar Item Click ─────────────────► Sidebar.onSelectNode()
   ├── Lens Panel Node Click ──────────────► Lens.onSelectNode()
   ├── Findings Table Item Click ──────────► FindingsPanel.onSelectFinding()
   └── Command Palette Selection ──────────► CommandPalette.onSelectNode()
   │
   ▼
Selection API Invocations
   ├── selection.selectNode(id) ───────────► Updates useGraphSelection.selectedNodeId & history
   ├── selection.selectEdge(id) ───────────► Updates useGraphSelection.selectedEdgeId
   └── view.setIsInvestigating(true) ─────► Opens InvestigationDrawer
   │
   ▼
State Propagation
   ├── SelectionContext.Provider ──────────► Notifies GraphView & all active Lens Panels
   ├── useViewState.syncToUrl() ───────────► Writes ?node=<id> or ?edge=<id> to window.location
   └── ProjectStateContext.update ────────► Persists selectedComponent to LocalStorage
   │
   ▼
Visual Response
   ├── Selected Node: Highlighted border, active halo, node inspector opened
   └── Non-Selected Nodes: Dimmed opacity across all active lens panels
```

---

## 7. Focus / Impact / Connection State

| Concept | Owner / Source | Scope | Writer | Reader | Persistence | Reset Trigger | Survives View Change? |
|---|---|---|---|---|---|---|---|
| Focus Mode | `useViewState.ts` | Session / URL | `view.setFocusState()` | `computeFocusedGraph()`, `GraphView` | URL (`?focus.enabled=true&focus.direction=...&focus.depth=...`) | Reset button, project change | Yes |
| Impact Analysis | `useViewState.ts` | Session / URL | `view.setImpactState()` | `computeImpactAnalysis()`, `GraphView` | URL (`?impact.enabled=true&impact.depth=...`) | Reset button, project change | Yes |
| Connection Query | `useViewState.ts` | Session / URL | `view.setConnectionState()` | `ConnectionControls`, graph filter | URL (`?conn.enabled=true&conn.direction=...&conn.depth=...`) | Project change | Yes |
| Constellation Options | `App.tsx` (`useState`) | Session Local | `setConstellationOptions()` | `adaptConstellation()` | In-memory React state | App reload | No (transient) |

---

## 8. Filter State

| Filter | Owner | Consumers | Shared? | Persisted? | URL Parameter | Reset Trigger |
|---|---|---|---|---|---|---|
| Search Query (`searchQuery`) | `useViewState.ts` | `Sidebar`, `searchNodes()` | Yes | Yes | `?filter.q=` | Reset button, project change |
| Component Type Filter (`typeFilter`) | `useViewState.ts` | `filterGraphByNodeTypes` | Yes | Yes | `?filter.type=` | Reset button, project change |
| Risk Level Filter (`riskFilter`) | `useViewState.ts` | Graph & Lens filters | Yes | Yes | `?filter.risk=` | Reset button, project change |
| Visible Node Types (`visibleNodeTypes`) | `useViewState.ts` & `projectState.ts` | `visibleActiveData`, all lenses | Yes | Yes | `localStorage` (`explorer.projectState.<id>`) | Project reset |
| Callout Filter (`hasCallouts`) | `useViewState.ts` | Graph filtering | Yes | Yes | `?filter.hasCallouts=true` | Reset button, project change |
| Without Sharing (`withoutSharing`) | `useViewState.ts` | Graph filtering | Yes | Yes | `?filter.withoutSharing=true` | Reset button, project change |
| Hide Tests (`hideTests`) | `useViewState.ts` | Graph filtering | Yes | Yes | `?filter.hideTests=true` | Reset button, project change |
| Async Patterns (`hasAsyncPatterns`) | `useViewState.ts` | Graph filtering | Yes | Yes | `?filter.hasAsyncPatterns=true` | Reset button, project change |

---

## 9. URL / Deep-Link State

### URL Restoration Flow

```text
Browser Navigation / Deep Link URL
   │
   ▼
`useViewState.readStateFromUrl()`
   │
   ├── Reads ?project= <id> ───────────────► ProjectContext initializes activeProjectId
   ├── Reads ?node= or ?component= ─────────► Sets urlNodeId & selectedNodeId
   ├── Reads ?edge= ───────────────────────► Sets urlEdgeId
   ├── Reads ?view.mode= or ?view= ─────────► Sets viewMode ('graph' | 'findings')
   ├── Reads ?filter.* ────────────────────► Constructs SearchFilterState
   ├── Reads ?focus.* ─────────────────────► Constructs FocusState
   ├── Reads ?impact.* ────────────────────► Constructs ImpactState
   ├── Reads ?conn.* ──────────────────────► Constructs ConnectionQueryState
   ├── Reads ?diag.* & ?finding= ──────────► Constructs FindingsQueryState
   └── Reads ?investigate=true ───────────► Sets isInvestigating = true
   │
   ▼
Reverse Synchronization (`useViewState.syncToUrl()`)
   │
   └── Writes active parameters back to window.history.replaceState()
```

---

## 10. Project Isolation

| Trigger Action | `selectedNodeId` | `filterState` | `workspaceViewMode` | `focusState` / `impactState` | `nodePositions` | `compareState` | `simulation` |
|---|---|---|---|---|---|---|---|
| Select New Project (`selectProject`) | Cleared (`null`) | Reset to default | Preserved | Reset to empty | Loaded for new project | Exited & cleared | Cleared (`null`) |
| URL change to `?project=B` | Cleared (`null`) | Loaded for Project B | Preserved | Reset to empty | Loaded for Project B | Exited & cleared | Cleared (`null`) |
| Delete Project (`deleteProject`) | Cleared (`null`) | Fallback project defaults | Switch to default | Reset to empty | Fallback project positions | Exited & cleared | Cleared (`null`) |

---

## 11. Persistence

| State | Storage Layer | Storage Key | Restoration Trigger | Survival Horizon |
|---|---|---|---|---|
| Active Project ID | LocalStorage & URL | `explorer.activeProjectId` | App Mount / URL Parse | Permanent |
| Local Project Metadata | LocalStorage | `explorer.localProjects` | App Mount / `refreshProjects` | Permanent |
| Project UI State Slices | LocalStorage | `explorer.projectState.<projectId>` | Project Select / Mount | Permanent |
| Drawer Pin State | LocalStorage | `explorer.drawer.pinned` | App Mount | Permanent |
| Drawer Detach State | LocalStorage | `explorer.drawer.detached` | App Mount | Permanent |
| Node Selection & History | React State | In-Memory (`useGraphSelection`) | None | Session Only |
| Refactoring Simulation Proposal | React State | In-Memory (`App.tsx`) | None | Session Only |
| Snapshot Diff Comparison | React State | In-Memory (`useCompareState`) | None | Session Only |

---

## 12. Cross-Layout Transition Matrix

| Source View | Action | Target View | Selection Preserved? | Filters Preserved? | Focus Preserved? | URL Updated? |
|---|---|---|---|---|---|---|
| Overview Dashboard | Click "Explore Interactive Graph" | `graph` | Yes | Yes | Yes | No |
| Overview Dashboard | Click "Review All Architecture Findings" | `findings` | Yes | Yes | Yes | Yes (`?view.mode=findings`) |
| Feature Matrix | Click Node Cell / Feature Anchor | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Coupling Heatmap | Click Matrix Cell / Feature Anchor | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Dependency River | Click Component Node / Flow Bar | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Feature Tree | Click Tree Node Row | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Architecture Treemap | Click "Explore In Graph" | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Subway Map | Click "Explore In Graph" | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Constellation | Click "Return To Graph" | `graph` | Yes | Yes | Yes | No |
| Feature Profile | Click Component Profile Item | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Architecture Radar | Click Metric Axis Component | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Architecture DNA | Click DNA Barcode Band | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Four-Direction | Click "Return To Graph" | `graph` | Yes | Yes | Yes | No |
| Findings Panel | Click "Investigate Node" | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Hotspot Panel | Click Hotspot Component | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |
| Diagnostics | Click Cycle / Unresolved Item | `graph` | Yes | Yes | Yes | Yes (`?node=<id>`) |

---

## 13. Selection → Navigation Coupling

In current code, node selection in analytical lenses forcibly triggers navigation back to the primary graph canvas or opens the investigation drawer.

| Originating Component | Handler Signature | State Update Executed | Navigation Executed | Code Location |
|---|---|---|---|---|
| `FeatureMatrixPanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 744) |
| `CouplingHeatmapPanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 861) |
| `DependencyRiverPanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 881) |
| `FeatureTreePanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 941) |
| `ArchitectureTreemapPanel` | `onExploreInGraph(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 796) |
| `SubwayPanel` | `onExploreInGraph(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 818) |
| `FeatureProfilePanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 901) |
| `RadarPanel` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 921) |
| `ArchitectureDNABarcode` | `onSelectNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 841) |
| `FindingsPanel` | `onInvestigateNode(nodeId)` | `selection.selectNode(nodeId)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 962) |
| `HotspotPanel` | `onSelectHotspot(node)` | `selection.selectNode(node.id)` | `setWorkspaceViewMode('graph')` | `App.tsx` (line 980) |

---

## 14. Duplicated / Related State

| Duplicated Concepts | Locations / Files | Synchronization Mechanism | Divergence Risk / Reality | Classification |
|---|---|---|---|---|
| `selectedNodeId` | `useGraphSelection.ts`, `useViewState.ts`, `projectState.ts` | Manual callback invocation in `App.tsx` | High risk: `useGraphSelection` may update without `useViewState.setSelectedNodeId` being called. | TRUE DUPLICATION |
| `viewMode` vs `workspaceViewMode` | `useViewState.ts` (`viewMode`) vs `App.tsx` (`workspaceViewMode`) | Partial sync via URL for `'graph'` and `'findings'` only | `workspaceViewMode` supports 18 modes; `viewMode` in URL supports only 2 modes (`'graph'` and `'findings'`). | RELATED BUT INTENTIONALLY DIFFERENT |
| `filterState.visibleNodeTypes` | `useViewState.ts` vs `ProjectStateContext.tsx` | `useEffect` sync in `App.tsx` | Synced on change via `saveProjectState()`. | RELATED / SYNCED |
| `focalNodeId` vs `selectedNodeId` | `focusQuery.ts` vs `useGraphSelection.ts` | Fallback calculation: `selection.selectedNodeId \|\| focusState.focusNodeId` | `focalNodeId` can be set independently for sub-graph focus without selecting the node. | RELATED BUT INTENTIONALLY DIFFERENT |

---

## 15. State Ownership Risks

1. **Top-Heavy App.tsx Orchestration:** `App.tsx` holds 15 local `useState` hooks, 8 `useRef` instances, and directly coordinates all 18 view modes, drawers, modals, and simulations.
2. **Missing Workspace View Mode in URL:** Only `'graph'` and `'findings'` are represented in the URL search params (`?view.mode=`). Changing workspace view mode to `'matrix'`, `'river'`, `'subway'`, `'radar'`, or `'treemap'` does **not** write to the URL query string. A browser refresh in `'matrix'` mode resets the view back to `'graph'`.
3. **Dual State Contexts for Projects:** Project selection is managed by `ProjectContext.tsx`, while UI state slices per project are managed by `ProjectStateContext.tsx`. Coordination relies on a custom window DOM event (`explorer:project-changed`).

---

## 16. State Flow Diagrams

### Project State & Navigation Flow

```text
Project Change Event
   │
   ▼
ProjectContext.selectProject(projectId)
   │
   ├── Writes `explorer.activeProjectId` to LocalStorage & URL `?project=`
   ├── Dispatches custom event `explorer:project-changed`
   │
   ├──► Listener in useViewState.ts:
   │     - Resets selectedNodeId, selectedFindingId, focusState, impactState, connectionState
   │
   ├──► Listener in ProjectStateContext.tsx:
   │     - Saves current project state slice
   │     - Restores project state slice for target project
   │
   └──► Listener in App.tsx:
         - Clears active simulation proposal, committed graph mutations, drill path, recent node list
```

---

## 17. State × Visualization Matrix

| Lens / View | selected node | selected edge | selected feature | selected finding | focal node | focus | impact | direction | depth | filters | visibility | project | URL | investigation state |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Graph | READ / WRITE | READ / WRITE | IGNORE | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ / WRITE | READ / WRITE |
| Matrix | READ / WRITE | IGNORE | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Heatmap | READ / WRITE | IGNORE | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| River | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Tree | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Treemap | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Subway | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Constellation | READ / WRITE | IGNORE | IGNORE | IGNORE | READ / WRITE | IGNORE | IGNORE | READ / WRITE | READ / WRITE | READ | READ | READ | IGNORE | WRITE |
| Profile | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Radar | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| DNA | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Four-Direction | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ / WRITE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Findings | READ / WRITE | IGNORE | IGNORE | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | READ / WRITE | WRITE |
| Hotspots | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | IGNORE | WRITE |
| Diagnostics | READ / WRITE | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | READ | READ | READ / WRITE | WRITE |
| Compare | READ / WRITE | READ / WRITE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | IGNORE | IGNORE |
| History | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | IGNORE | READ | IGNORE | IGNORE |

---

## 18. State Lifecycle Matrix

| State Item | Initial Load | Node Select | Feature Select | Lens Change | Project Change | URL Change | Reset Button |
|---|---|---|---|---|---|---|---|
| `activeProjectId` | URL or LocalStorage | Retained | Retained | Retained | Updated | Updated | Retained |
| `workspaceViewMode` | Default `'graph'` | Retained / Set `'graph'` | Set `'graph'` | Updated | Retained | Updated (`'graph'`/`'findings'`) | Retained |
| `selectedNodeId` | URL or `null` | Updated | Updated to Anchor | Retained | Cleared (`null`) | Restored | Cleared (`null`) |
| `selectedEdgeId` | URL or `null` | Cleared (`null`) | Cleared (`null`) | Retained | Cleared (`null`) | Restored | Cleared (`null`) |
| `filterState` | URL / Project Store | Retained | Retained | Retained | Reset to default | Restored | Reset to empty |
| `focusState` | URL or Disabled | Updated (if focus active) | Retained | Retained | Reset to empty | Restored | Reset to empty |
| `impactState` | URL or Disabled | Updated (if impact active) | Retained | Retained | Reset to empty | Restored | Reset to empty |
| `nodePositions` | LocalStorage Store | Retained | Retained | Retained | Loaded for target project | Retained | Retained (Unless reset layout) |
| `isInvestigating` | URL (`?investigate=true`) | Set `true` | Set `true` | Retained | Set `false` | Restored | Set `false` |

---

## 19. Orchestration Coupling Map

The following direct orchestration couplings exist in visualization components:

1. **`FeatureMatrixPanel.tsx`:** Directly invokes `onSelectNode` and `onSelectFeatureAnchor` callbacks, which `App.tsx` wires to `setWorkspaceViewMode('graph')`.
2. **`CouplingHeatmapPanel.tsx`:** Directly invokes `onSelectNode` and `onSelectFeatureAnchor`, causing `App.tsx` to force switch view to `'graph'`.
3. **`DependencyRiverPanel.tsx`:** Contains `onReturnToGraph` button prop, directly triggering `setWorkspaceViewMode('graph')`.
4. **`SubwayPanel.tsx`:** Features "Explore In Graph" button on station details, executing `setWorkspaceViewMode('graph')`.
5. **`FourDirectionPanel.tsx`:** Contains "Return To Graph" toolbar button, executing `setWorkspaceViewMode('graph')`.
6. **`FindingsPanel.tsx`:** Features "Investigate Node" action on finding cards, executing `setWorkspaceViewMode('graph')`.

---

## 20. Parallelization Boundaries

To prepare for future refactoring and workspace unification, source files are classified into isolation categories:

### Shared / Core Integration Hotspots (Single-Threaded Access Required)
- `explorer/src/App.tsx` — Top-level orchestrator and view mode switcher.
- `explorer/src/hooks/useViewState.ts` — Central URL and view state hook.
- `explorer/src/lib/projectState.ts` & `ProjectStateContext.tsx` — Project state manager and storage interface.
- `explorer/src/components/ViewModeSwitcher.tsx` — Navigation action bar component.

### Domain-Owned Independent Files (Safe for Parallel Development)
- **Structure Lenses:** `FeatureMatrixPanel.tsx`, `FeatureTreePanel.tsx`, `ArchitectureTreemapPanel.tsx`, `SubwayPanel.tsx`.
- **Relationship Lenses:** `CouplingHeatmapPanel.tsx`, `DependencyRiverPanel.tsx`, `DependencyConstellationPanel.tsx`, `FourDirectionPanel.tsx`.
- **Health & Metrics Lenses:** `FeatureProfilePanel.tsx`, `RadarPanel.tsx`, `ArchitectureDNABarcode.tsx`.
- **Investigation & Governance:** `FindingsPanel.tsx`, `HotspotPanel.tsx`, `DiagnosticsPanel.tsx`, `ComparePanel.tsx`, `AnalysisHistoryPanel.tsx`.

---

## 21. Existing State Contracts

### Explicit Contracts (Verified by Test Specs)
1. **Zero Coordinate Drift Contract:** Position Authority guarantees 0.00000 px drift when restoring user-dragged node positions (`ProjectStatePersistenceAndIsolation.test.tsx`).
2. **Project Isolation Contract:** Project A state slices (`nodePositions`, `searchQuery`, `zoom`) never leak into Project B (`ProjectIsolationAndCompare.test.tsx`).
3. **Deep-Link Restoration Contract:** URL parameters (`?component=`, `?direction=`, `?depth=`, `?finding=`) faithfully restore graph selections and inspection panel state (`App.deepLink.test.tsx`).

### Implicit Contracts (Code Behavior)
1. Esc key clears selection and closes investigation drawer across all 18 view modes (`App.tsx`).
2. Selecting a component in analytical lenses switches active view mode to `'graph'` and opens `InvestigationDrawer`.

---

## 22. Regression Safety Baseline

| Test Suite File | Contract Protected | State Covered |
|---|---|---|
| `explorer/src/App.deepLink.test.tsx` | URL deep-link parsing and popstate browser back/forward navigation | `selectedNodeId`, `connectionState`, `selectedFindingId`, URL params |
| `explorer/src/App.investigationWorkflow.test.tsx` | Drawer investigation, breadcrumb drilling, pin/detach drawer state | `drillPath`, `recentNodeIds`, `isPinned`, `isDetached`, `isInvestigating` |
| `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx` | Multi-lens selection synchronization & node type visibility filtering | `visibleNodeTypes`, `selectedNodeId` across all 12 analytical lenses |
| `explorer/src/test/ProjectIsolationAndCompare.test.tsx` | Project switching isolation, event-driven reset, snapshot diff comparison | `selectedNodeId`, `selectedFinding`, `compareState`, `explorer:project-changed` |
| `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx` | Position Authority, 0.00000 px coordinate drift, LocalStorage persistence | `nodePositions`, `graphLayout`, `visibleNodeTypes`, LocalStorage keys |

---

## 23. Future Design Questions

1. **Workspace vs. Lens Separation:** Should workspace layout (panels/drawers) be decoupled from visualization lenses?
2. **Canonical Selection Model:** Should `selectedNodeId` be unified into a single authoritative state store?
3. **Selection vs. Navigation Decoupling:** Should clicking a component in a lens update selection *without* forcing navigation back to the graph canvas?
4. **URL Workspace Serialization:** Should all 18 workspace view modes be represented in the URL search params?
5. **Inspector Persistence:** Should the node investigation drawer remain open and retain context while switching between analytical lenses?

---

## 24. Unknowns / Areas Requiring Follow-Up

1. **Worker-Based Offscreen State Synchronization:** Whether large-graph layout recalculations can be offloaded to Web Workers without causing state race conditions with `ProjectStateContext`.
2. **Multi-Window Sync Overhead:** Performance impact of `BroadcastChannel` events during rapid node drilling across detached windows.

---

## 25. Evidence / Source Map

- `explorer/src/App.tsx` (Lines 185–1045): App orchestration, 18 workspace view modes, simulation, drawer, event listeners.
- `explorer/src/hooks/useViewState.ts` (Lines 1–180): URL sync, view state, search/focus/impact state.
- `explorer/src/context/ProjectContext.tsx` (Lines 1–420): Project metadata, project switching, `explorer:project-changed` custom event.
- `explorer/src/context/ProjectStateContext.tsx` (Lines 1–250): Project UI state persistence, `localStorage` synchronization.
- `explorer/src/lib/projectState.ts` (Lines 1–350): Data contracts, default state factories, `WorkspaceViewMode` definitions.
- `explorer/src/hooks/useGraphSelection.ts` (Lines 1–55): Graph selection hook, selection history management.
- `explorer/src/components/ViewModeSwitcher.tsx` (Lines 1–150): Reconciled 18-mode view switcher component.
- `explorer/src/lib/url/` (`filterQuery.ts`, `focusQuery.ts`, `impactQuery.ts`, `findingsQuery.ts`, `connectionQuery.ts`, `investigationQuery.ts`): URL parameter parsers and serializers.

---

## 26. Read-Only Verification

This audit is a **STRICT READ-ONLY REPOSITORY AUDIT**.

- Zero application source code files under `explorer/src/` were modified.
- Zero refactoring or state restructuring was performed.
- All conclusions represent the **CURRENT CODE TRUTH** of the repository as verified through direct code inspection and automated test suite execution.

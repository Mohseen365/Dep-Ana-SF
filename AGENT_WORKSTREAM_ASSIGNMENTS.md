# Agent Workstream Assignments & Codebase Inspection Inventory

This document details the specific findings, component mappings, feature gaps, and strict file ownership assignments for all six parallel workstream planning agents.

---

## Workstream 1: Application Shell and Navigation
**Assigned Agent**: Agent 1
**Scope**: Shell layout, sidebar, view switcher, page composition, shared state orchestrator, responsive layout, loading/error states.

### 1. React Feature Inventory
- `explorer/src/App.tsx`: Primary application root, coordinating state for active project, view mode, selection, filters, and modals.
- `explorer/src/components/Sidebar.tsx`: Navigation bar supporting view mode switching (`graph`, `matrix`, `findings`, `diagnostics`, `subway`, `treemap`, `dna`, `radar`, `project`), quick actions, and collapse states.
- `explorer/src/components/Header.tsx`: Project indicator, analysis run selector, search bar trigger, command palette shortcut, quick stats.
- `explorer/src/components/ViewModeSwitcher.tsx`: Discrete view mode toggle buttons with keyboard navigation.
- `explorer/src/components/StatusBar.tsx`: Bottom status bar with node/edge counts, layout status, and performance timings.
- `explorer/src/context/WorkspaceRouterContext.tsx`: Router context managing active views, tab switches, and query params.
- `explorer/src/context/ProjectStateContext.tsx`: Shared state container for project data, loading states, and error handling.

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/`: Top-level orchestrator holding shared graph payload, view mode, project ID, and active node selection.
- `scratch/salesforce-poc/force-app/main/default/lwc/daSidebar/`: LWC sidebar component emitting view switch events (`viewchange`).
- `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/`: LWC header component handling project title and global status.

### 3. Feature Gaps
- React `App.tsx` supports deep linking via hash/URL parameters (`explorer/src/lib/url/`); `daAppShell` currently relies solely on internal component state.
- Keyboard shortcuts for navigation (e.g. `g` + `m` for matrix, `g` + `f` for findings) exist in `explorer/src/components/KeyboardShortcutsModal.tsx` but are not yet implemented in `daSidebar`.
- Error boundary in React (`ErrorBoundary.tsx`) handles view crashes gracefully; LWC requires robust `errorCallback(error, stack)` implementation in `daAppShell`.

### 4. Proposed LWC Hierarchy
```text
daAppShell
├── daHeader (inbound: activeProject, activeRun; outbound: projectselect)
├── daSidebar (inbound: currentView; outbound: viewchange)
├── [Active View Component Container]
│    ├── daGraphViewer
│    ├── daMatrixView
│    ├── daFindingsView
│    ├── daDiagnosticsView
│    ├── daSubwayView
│    ├── daTreemapView
│    ├── daArchitectureDnaBarcode
│    └── daProjectDashboard
└── daInvestigationDrawer (slide-over drawer; inbound: selectedNodeId, projectData)
```

### 5. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Shell orchestrator)
- `scratch/salesforce-poc/force-app/main/default/lwc/daSidebar/*` (Sidebar navigation)
- `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/*` (Header bar)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js` (Canonical filter schema)
- `scratch/salesforce-poc/tests/run-p1-header-tests.cjs`
- `scratch/salesforce-poc/tests/run-p1-sidebar-tests.cjs`
- `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`

---

## Workstream 2: Graph Engine and Cytoscape
**Assigned Agent**: Agent 2
**Scope**: Cytoscape canvas lifecycle, graph DTOs, chunk reassembly, layout engine integration, node/edge styling, selection, viewport controls, canvas LOD.

### 1. React Feature Inventory
- `explorer/src/components/GraphView.tsx`: Main Cytoscape canvas container (over 74 KB of code), managing instance mounting, stylesheet definitions, tap/hover events, and coordinate transformations.
- `explorer/src/components/GraphControls.tsx`: Zoom in, zoom out, fit, reset, layout algorithm toggle, physics/gravity toggles.
- `explorer/src/components/GraphLegend.tsx`: Node type color swatches and edge line-style indicators.
- `explorer/src/lib/graph-builder.ts`: Converts raw JSON/analysis data into Cytoscape element definitions (`CytoscapeElements`).
- `explorer/src/lib/graph-style.ts`: Dynamic stylesheets mapping node metrics (in-degree, out-degree, centrality) and layer classifications to visual styles.
- `explorer/src/lib/layout/global-layout.ts`: Comprehensive layout pipeline (Stages 1–11) including hierarchical, force-directed, and compound layouts.
- `explorer/src/lib/canvas-lod.ts`: Level-of-Detail manager optimizing edge rendering and label visibility based on zoom factor.

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`: LWC wrapping Cytoscape.js Static Resource, handling canvas mounting, resize observers, and node selection events.
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/`: Utility module for paginated retrieval and contiguous chunk reassembly.
- `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/`: Client-side JavaScript layout calculations for Hierarchical, Orbit, Constellation, and Sankey layouts.
- `scratch/salesforce-poc/force-app/main/default/staticresources/cytoscape.js`: Static resource containing Cytoscape library.

### 3. Feature Gaps
- React `canvas-lod.ts` dynamic label fading on zoom is partially implemented in `daGraphViewer`.
- Multi-node box selection (`boxSelectionEnabled`) present in React needs complete integration with LWC touch/pointer events.
- Edge bend points for compound/nested nodes in hierarchical layouts require complete parity with `graph-layout.ts`.

### 4. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/*`
- `scratch/salesforce-poc/force-app/main/default/staticresources/cytoscape*`
- `scratch/salesforce-poc/tests/run-poc-tests.cjs`
- `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`

---

## Workstream 3: Core Analytical Views
**Assigned Agent**: Agent 3
**Scope**: Findings view, Diagnostics view, Hotspots view, Matrix view, Dependency analysis tables, search & filter overlays.

### 1. React Feature Inventory
- `explorer/src/components/findings/FindingsView.tsx` & `FindingsTable.tsx`: Tabular and card views of architecture rule violations, severity filters (Blocker, Critical, Major, Minor), search, and rule suppression.
- `explorer/src/components/HotspotPanel.tsx`: Identification of high-risk nodes based on composite score (churn, complexity, coupling, fan-in/fan-out).
- `explorer/src/components/panels/MatrixPanel.tsx` / `MatrixView.tsx`: Adjacency matrix depicting dependency strengths and directional flows across architectural layers.
- `explorer/src/components/SearchFilterPanel.tsx` & `QuickFilters.tsx`: Advanced query panel filtering by layer, technology, module, or metric range.
- `explorer/src/lib/hotspots.ts`: Hotspot score calculation algorithms.
- `explorer/src/lib/connection-analysis.ts`: In-depth fan-in/fan-out analysis and transitive dependency inspection.

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/`: LWC implementation of findings data grid with severity filtering and search.
- `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/`: Diagnostic health indicators, cyclic SCC counts, and rule violation breakdown (W7-1).
- `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/`: Hotspot identification and metric table with composite scoring (W6-4).
- `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixView/`: Dependency matrix with cell selection and layer filtering.
- `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/`: Preset management for filter configurations.

### 3. Feature Gaps
- CSV/JSON export for Findings and Diagnostics tables present in React (`export-graph.ts`) needs complete LWC Blob generation.
- Real-time rule suppression toggle in `daFindingsView` requires backing Custom Object persistence (`DA_Finding_Suppression__c` or field on `DA_Finding__c`).

### 4. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixView/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/*`
- `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs`
- `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs`
- `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs`
- `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs`
- `scratch/salesforce-poc/tests/run-w6-4-tests.cjs`
- `scratch/salesforce-poc/tests/run-w7-1-tests.cjs`

---

## Workstream 4: Advanced Visualization Views
**Assigned Agent**: Agent 4
**Scope**: Architecture DNA Barcode, Subway Map, Treemap, Constellation, Orbit, Radar 9D, Sankey River, 4-Direction adapter.

### 1. React Feature Inventory
- `explorer/src/lib/adapters/dna-adapter.ts`: Architecture DNA Barcode encoding component types and layer depth into dense barcode strips.
- `explorer/src/components/SubwayPanel.tsx` & `explorer/src/lib/adapters/subway-adapter.ts`: Transit-map style representation of service dependency lines and station stops.
- `explorer/src/lib/adapters/treemap-adapter.ts` & `treemap-layout.ts`: Squarified treemap rendering nested package and class hierarchies sized by lines of code or complexity.
- `explorer/src/lib/adapters/component-constellation-adapter.ts`: Constellation view clustering satellite components around focal core classes.
- `explorer/src/lib/adapters/component-orbit-adapter.ts`: Radial concentric orbit rings organized by architectural tier.
- `explorer/src/components/RadarPanel.tsx` & `explorer/src/lib/adapters/radar-adapter.ts`: 9-dimensional spider radar assessing coupling, cohesion, cyclomatic complexity, instabiity, testability, etc.
- `explorer/src/lib/adapters/sankey-adapter.ts`: Sankey flow diagram tracking data and invocation streams across architectural tiers.
- `explorer/src/lib/adapters/four-direction-adapter.ts`: 4-directional dependency compass (North/Inbound, South/Outbound, East/Peer, West/External).

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/`: LWC implementation with SVG rendering and node selection (W7-2).
- `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/`: LWC subway map with line routing and station hover cards (W6-3).
- `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/`: LWC squarified treemap with proportional sizing and zoom-into-cluster (W6-2).

### 3. Feature Gaps
- `RadarPanel` (9-dimension radar) and `SankeyView` are present in React but pending full LWC component packaging.
- Pure SVG rendering must be strictly utilized (no external D3 or unsafe canvas dependencies) to ensure Lightning Web Security (LWS) and CSP compliance.

### 4. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/*`
- `scratch/salesforce-poc/tests/run-w6-2-tests.cjs`
- `scratch/salesforce-poc/tests/run-w6-3-tests.cjs`
- `scratch/salesforce-poc/tests/run-w7-2-tests.cjs`

---

## Workstream 5: Portfolio and Project Workflows
**Assigned Agent**: Agent 5
**Scope**: Project selector, Project dashboard, Analysis Run history, Run comparison, dual snapshot diffing, user preferences persistence.

### 1. React Feature Inventory
- `explorer/src/components/ProjectSelector.tsx` & `ProjectManager.tsx`: Project switching, repository metadata display, and project configuration.
- `explorer/src/components/ProjectDashboard.tsx`: Executive dashboard summarizing health scores, code churn, architecture debt index, and historical trends.
- `explorer/src/lib/projectHistory.ts`: Multi-run storage, timestamp tracking, and commit SHA lineage.
- `explorer/src/lib/graph-diff.ts` & `diff-adapter.ts`: Structural diff between two analysis snapshots (added nodes, removed edges, modified dependencies).
- `explorer/src/lib/preferences.ts`: Local storage persistence for user layout choices, filter toggles, and UI zoom/pan states.

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/`: Dropdown selector querying `DA_Project__c`.
- `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/`: Run history list querying `DA_Analysis_Run__c`.
- Apex Controllers & Services:
  - `controllers/DAGraphController.cls`: Paginated graph chunk fetch and project listing.
  - `controllers/DAAnalysisHistoryController.cls`: Query runs for active project.
  - `controllers/DAUserPreferenceController.cls`: Save/load user view preferences and filter containers.
  - `services/DAGraphIngestionService.cls` & `DAGraphChunkService.cls`: Ingestion and chunk orchestration.
  - `objects/DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_User_Preference__c`.

### 3. Feature Gaps
- Dual-snapshot comparison UI (`daSnapshotComparisonModal`) needs dedicated component packaging.
- Two-step project resolution (Salesforce ID first, external `Project_Key__c` fallback) must be rigorously validated in all Apex entry points (W7-P1).
- Deletion lifecycle: Cascading delete of analysis runs and related chunks when a project is deleted.

### 4. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/*`
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController*`
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnalysisHistoryController*`
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController*`
- `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService*`
- `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService*`
- `scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService*`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/*`
- `scratch/salesforce-poc/tests/run-analysis-history-tests.cjs`
- `scratch/salesforce-poc/tests/run-p0-verification-tests.cjs`

---

## Workstream 6: Investigation and Collaboration
**Assigned Agent**: Agent 6
**Scope**: Investigation drawer, 1-hop drill, Node annotations, Refactoring simulation engine, Refactor handoff export.

### 1. React Feature Inventory
- `explorer/src/components/InvestigationDrawer.tsx`: Comprehensive drawer displaying selected node metadata, inbound/outbound edges, cyclic dependencies, and metrics.
- `explorer/src/components/RefactoringSimulationPanel.tsx` & `explorer/src/lib/refactoring-simulation.ts`: What-if simulation engine testing class extractions, cycle breaking, and node deletions.
- `explorer/src/components/RefactorHandoffModal.tsx` & `explorer/src/lib/refactor-handoff.ts`: Markdown/JSON export of proposed refactoring steps for engineering sprints.
- `explorer/src/lib/annotations.ts`: Creation and persistence of engineering notes and architectural warnings attached to specific nodes or findings.
- `explorer/src/lib/detached-drawer.ts`: Multi-window IPC communication allowing the investigation drawer to pop out into a separate browser window.

### 2. Salesforce Counterpart Inventory
- `scratch/salesforce-poc/force-app/main/default/lwc/daAnnotationPanel/`: Notes and annotations list attached to records.
- Apex Controllers & Services:
  - `controllers/DAAnnotationController.cls`: CRUD for `DA_Annotation__c`.
  - `objects/DA_Annotation__c`, `DA_Finding__c`.

### 3. Feature Gaps
- `daInvestigationDrawer` LWC requires full metadata wiring to display incoming/outgoing edges and node metrics.
- Refactoring simulation engine (`refactoring-simulation.ts`) needs client-side JavaScript porting into an LWC utility module (`daRefactoringSimulator`).
- Detached window IPC can be supported via standard browser `window.open` + `postMessage` / `BroadcastChannel` or decoupled via Lightning Message Channel.

### 4. File Ownership Allowlist
- `scratch/salesforce-poc/force-app/main/default/lwc/daAnnotationPanel/*`
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnnotationController*`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAAnnotationControllerTest*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_Annotation__c/*`
- `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/*`
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`

# P0-5 — User Task / UX Audit

## 1. Executive Summary

This report documents Phase 0-5 (User Task / UX Audit) of the Salesforce Architecture Visualization Unification project. The audit was conducted strictly against the current codebase in `explorer/src/` to establish an authoritative, evidence-grounded baseline of user tasks, workflows, entry points, navigation patterns, context preservation, discoverability, observable workflow friction, and complexity signals across the architecture explorer application.

### Key Discoveries:
1. **Goal-Oriented Workflow Support**: The application supports 15 concrete user analysis tasks spanning architecture orientation, component location, dependency investigation, macro flow tracing, inter-feature coupling analysis, hotspot discovery, rule violation triage, radial N-hop exploration, 4-direction cardinal neighborhood analysis, transit route hub discovery, snapshot comparison, and refactoring simulation.
2. **Centralized Selection & Visibility Context**: The workspace orchestrates user workflows through a shared `SelectionContext` (`selectedNodeId`) and visible node-type filter (`visibleNodeTypes`). When a user selects a component in any view (or via search, inventory, command palette, or findings), that selection is preserved across all 18 view modes (`WorkspaceViewMode`).
3. **Dual Navigation Patterns**: The UI implements both explicit navigation (toolbar view switcher, `"Explore in Graph Canvas →"` buttons, `"Return to Graph Canvas"` buttons) and implicit navigation (clicking matrix cells or finding rows that simultaneously set selection and switch workspace modes).
4. **Context Continuity & Transformation**: Cross-layout transitions maintain the selected component identity and project scope. However, visual representation is transformed appropriately between topological Cartesian space (`GraphView`), polar radial space (`Constellation`), 3x3 cardinal grid (`FourDirection`), schematic transit tracks (`Subway`), tabular 2D bands (`Matrix`), and vertical list trees (`Tree`).
5. **Zero Code Modifications**: This is a strictly READ-ONLY audit report. No source code, tests, layout engines, or UI components were modified during this audit.

---

## 2. Audit Scope

### Primary Audited Visualizations (12 Lenses):
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

### Surrounding UX Surfaces Audited:
- **ProjectDashboard** (`explorer/src/components/ProjectDashboard.tsx`)
- **FindingsPanel** (`explorer/src/components/findings/FindingsPanel.tsx`)
- **HotspotPanel** (`explorer/src/components/HotspotPanel.tsx`)
- **DiagnosticsPanel** (`explorer/src/components/DiagnosticsPanel.tsx`)
- **ComparePanel** (`explorer/src/components/ComparePanel.tsx`)
- **AnalysisHistoryPanel** (`explorer/src/components/AnalysisHistoryPanel.tsx`)
- **ViewModeSwitcher** (`ViewModeSwitcher.tsx`)
- **Header & Project Selector** (`Header.tsx`, `ProjectSelector.tsx`)
- **Sidebar Component Inventory** (`Sidebar.tsx`, `SearchFilterPanel.tsx`)
- **InvestigationDrawer** (`InvestigationDrawer.tsx`)
- **CommandPalette** (`CommandPalette.tsx`, `useCommandPalette.ts`)
- **StatusBar** (`StatusBar.tsx`)
- **RefactoringSimulationPanel & Modal** (`RefactoringSimulationPanel.tsx`, `RefactorHandoffModal.tsx`)

---

## 3. Evidence and Method

The findings in this report were established through direct code analysis, event handler inspection, state machine tracing, and test suite execution across the codebase:
- **State Flow Tracing**: Traced `App.tsx`, `useViewState.ts`, `useGraphSelection.ts`, `projectState.ts`, `SelectionContext.tsx`, and `ProjectContext.tsx`.
- **UI Event Inspection**: Audited click, hover, keydown, search, filter, and modal triggers across all 18 panel component files.
- **Workflow Test Verification**: Inspected `App.test.tsx`, `App.deepLink.test.tsx`, `App.investigationWorkflow.test.tsx`, `CrossLayoutVisibilityAndSelection.test.tsx`, `FindingsPanel.test.tsx`, `HotspotPanel.test.tsx`, and `ComparePanel.test.tsx`.
- **Documentation Reconciliation**: Cross-referenced `03_UI_UX_Interaction.md`, `ANALYSIS_VIEWS_UX.md`, `COMPONENT_EXPLORER_UX.md`, `INSPECTOR_UX.md`, and `CURRENT-STATE-BASELINE.md`.

---

## 4. User Task Inventory

The application supports 15 distinct user analysis tasks derived directly from UI controls, event handlers, and state contracts:

### Task 1: Understand Overall Architecture Health & Risk Exposure
- **Evidence**: `ProjectDashboard.tsx`, `RadarPanel.tsx`, `adaptRadarDimensions()`
- **Likely Entry Point**: Dashboard (`workspaceViewMode = 'dashboard'`) or Radar view (`'radar'`).
- **Relevant Visualizations**: `ProjectDashboard`, `RadarPanel`, `StatusBar`.
- **Required Interactions**: View health score badge (0–100), inspect risk percentage, hover/click 6 polar health axes (`Coupling`, `Complexity`, `Centrality`, `Instability`, `Risk`, `Hygiene`).
- **Expected Output**: Composite health score, risk level (`GOOD`, `CAUTION`, `CRITICAL`), unbacked primitive report.
- **Exit Action**: Click `"Explore Dependency Graph"` or switch to `FindingsPanel`.

### Task 2: Locate an Architectural Component
- **Evidence**: `Sidebar.tsx`, `CommandPalette.tsx`, `FeatureTreePanel.tsx`, `FeatureProfilePanel.tsx`
- **Likely Entry Point**: Command Palette (`Cmd+K`), Sidebar search input, or Tree/Profile search input.
- **Relevant Visualizations**: `Sidebar`, `CommandPalette`, `FeatureTreePanel`, `FeatureProfilePanel`, `ArchitectureDNABarcode`.
- **Required Interactions**: Type query string; real-time debounced filtering highlights matching components.
- **Expected Output**: Filtered component list with status dots, risk badges, type indicators, and auto-expanded tree ancestor paths.
- **Exit Action**: Click component row to select `selectedNodeId` and open `InvestigationDrawer`.

### Task 3: Inspect Component Metrics & Risk Scorecard
- **Evidence**: `FeatureProfilePanel.tsx`, `ArchitectureDNABarcode.tsx`, `InvestigationDrawer.tsx`
- **Likely Entry Point**: Profile view (`'profile'`), DNA view (`'dna'`), or Drawer `Overview` tab.
- **Required Interactions**: Click component list item or barcode strip.
- **Expected Output**: Fan-In/Fan-Out gauges, coupling score, risk level, layer/domain assignment, 7-band DNA barcode, associated findings.
- **Exit Action**: Click `"Explore in Graph Canvas →"`.

### Task 4: Investigate Direct and Transitive Dependencies / Dependents
- **Evidence**: `InvestigationDrawer.tsx`, `rankDependents()`, `rankDependencies()`
- **Likely Entry Point**: Select node in `GraphView` ➔ Drawer opens.
- **Relevant Visualizations**: `InvestigationDrawer` (`Dependencies` / `Dependents` tabs), `GraphView`.
- **Required Interactions**: Click `Dependencies` or `Dependents` tab; click any row item to drill into neighbor component.
- **Expected Output**: Impact-ranked dependent/dependency lists with direct vs transitive hop badges.
- **Exit Action**: Breadcrumb navigation back or click another row to continue drilling.

### Task 5: Trace Dependency Flow Volume Across Architectural Layers
- **Evidence**: `DependencyRiverPanel.tsx`, `sankey-adapter.ts`, `sankey-layout.ts`
- **Likely Entry Point**: View switcher button `River` (`'river'`).
- **Relevant Visualizations**: `DependencyRiverPanel`.
- **Required Interactions**: Hover cubic Bézier flow stream, click stream to open provenance list, search feature flows.
- **Expected Output**: Macro flow volume across `Presentation` ➔ `Application` ➔ `Domain` ➔ `Schema` stages; exact component edge provenance items (`sourceComponentName ➔ targetComponentName`).
- **Exit Action**: Click `"Explore in Graph Canvas"` for a feature or click `"← Return to Graph Canvas"`.

### Task 6: Analyze Inter-Feature Coupling Intensity
- **Evidence**: `FeatureMatrixPanel.tsx`, `CouplingHeatmapPanel.tsx`, `matrix-adapter.ts`
- **Likely Entry Point**: View switcher button `Matrix` (`'matrix'`) or `Heatmap` (`'heatmap'`).
- **Relevant Visualizations**: `FeatureMatrixPanel`, `CouplingHeatmapPanel`.
- **Required Interactions**: Hover matrix/heatmap cell, change min-weight filter input, toggle metric mode (`combined`, `direct`, `flow`, `shared`).
- **Expected Output**: 2D feature band matrix / HTML5 Canvas heatmap showing direct weight, directional flow, shared node weight, and combined weight.
- **Exit Action**: Click cell or row header to navigate to target feature anchor node in Graph.

### Task 7: Identify Architectural Hotspots & Refactoring Readiness
- **Evidence**: `HotspotPanel.tsx`, `hotspots.ts`, `readiness.ts`
- **Likely Entry Point**: View switcher button `Hotspots` (`'hotspots'`).
- **Relevant Visualizations**: `HotspotPanel`.
- **Required Interactions**: Toggle category tabs (`Top`, `High Risk`, `Fan-In`, `Coupling`, `Cycles`, `Unresolved`, `Readiness`), check *"Hide nodes with any HIGH CAUTION dependent"*.
- **Expected Output**: Ranked hotspot list with rank badges (`#1`, `#2`...), metric grid, refactoring readiness classification (`GOOD CANDIDATE`, `CAUTION`, `HIGH CAUTION`).
- **Exit Action**: Click hotspot row to select component and open drawer.

### Task 8: Triage & Resolve Architecture Rule Violations (Findings)
- **Evidence**: `FindingsPanel.tsx`, `rules.ts`, `annotations.ts`
- **Likely Entry Point**: View switcher button `Findings` (`'findings'`) or Header findings pill.
- **Relevant Visualizations**: `FindingsPanel`.
- **Required Interactions**: Filter status (`Unresolved`, `Resolved`, `All`), toggle severity chips (`Critical`, `High`, `Warning`, `Informational`), expand details (`WHAT`, `WHY IT MATTERS`, `WHERE`, `WHAT TO DO NEXT`), click `"✓ Resolve"`, `"⏳ Mark In Review"`, or `"🔄 Reopen"`.
- **Expected Output**: Issue-oriented findings list with code evidence snippets, line numbers, and "Open in editor" links.
- **Exit Action**: Click `"🔍 Investigate <Node>"` to navigate to Graph and select node.

### Task 9: Inspect Circular Dependencies & Unresolved References
- **Evidence**: `DiagnosticsPanel.tsx`, `dependency-analyzer.cjs`
- **Likely Entry Point**: View switcher button `Diagnostics` (`'diagnostics'`).
- **Relevant Visualizations**: `DiagnosticsPanel`.
- **Required Interactions**: Switch tabs (`Cycles` | `Unresolved`), click cycle card to highlight loop on graph, click unresolved reference card to inspect code evidence.
- **Expected Output**: Cycle flow diagram (Node1 ➔ Node2 ➔ ... ➔ Node1), unresolved symbol location (`file:line`), target symbol type, reason.
- **Exit Action**: Click `"Highlight Cycle on Graph"` or `"Inspect Edge & Evidence"`.

### Task 10: Explore Focal Component Radial N-Hop Neighborhood
- **Evidence**: `DependencyConstellationPanel.tsx`, `constellation-adapter.ts`, `constellation-layout.ts`
- **Likely Entry Point**: View switcher button `Constellation` (`'constellation'`).
- **Relevant Visualizations**: `DependencyConstellationPanel`.
- **Required Interactions**: Select focal node from dropdown, change max depth (1–3 hops), change direction (`both`, `dependencies`, `dependents`), double-click node to re-center.
- **Expected Output**: 360-degree polar constellation diagram with concentric distance rings and directed edge paths.
- **Exit Action**: Click `"Set as Orbit Focal Center →"` or `"← Return to Graph Canvas"`.

### Task 11: Inspect Cardinal Direction Neighborhood (Upstream, Downstream, Peers, Cross-Feature)
- **Evidence**: `FourDirectionPanel.tsx`, `four-direction-adapter.ts`
- **Likely Entry Point**: View switcher button `Four-Dir` (`'four-direction'`).
- **Relevant Visualizations**: `FourDirectionPanel`.
- **Required Interactions**: Select subject component, filter quadrant items, click neighbor item, double-click to re-center.
- **Expected Output**: 3x3 cardinal grid: Up (Upstream Dependents), Down (Downstream Dependencies), Left (Same-Feature Peers), Right (Shared/Cross-Feature Boundaries), Center Subject Card.
- **Exit Action**: Click `"Focus as Subject Center →"` or `"← Return to Graph Canvas"`.

### Task 12: Identify Shared Transfer Station Hubs Bridging Feature Lines
- **Evidence**: `SubwayPanel.tsx`, `subway-adapter.ts`
- **Likely Entry Point**: View switcher button `Subway` (`'subway'`).
- **Relevant Visualizations**: `SubwayPanel`.
- **Required Interactions**: Click feature line chips, toggle cross-track checkbox, search stations, click station marker.
- **Expected Output**: Transit schematic map showing horizontal feature lines, transfer station hubs (inner/outer ring markers), and cross-feature connection tracks.
- **Exit Action**: Click `"Explore in Graph"` in station inspector.

### Task 13: Compare Architecture Snapshot Diffs
- **Evidence**: `ComparePanel.tsx`, `AnalysisHistoryPanel.tsx`, `diff-adapter.ts`
- **Likely Entry Point**: View switcher button `Compare` (`'compare'`) or `History` (`'history'`).
- **Relevant Visualizations**: `ComparePanel`, `AnalysisHistoryPanel`.
- **Required Interactions**: Paste baseline/target JSON, upload files, or select 2 historical snapshots in History panel ➔ Click `"Compare Selected Pair"`.
- **Expected Output**: Executive diff summary cards (`+ Nodes`, `- Nodes`, `Changed Nodes`, `+ Edges`, `- Edges`, `New Cycles`, `Removed Cycles`), filterable property change list (`property: before ➔ after`).
- **Exit Action**: Click `"🔍 Focus"` button on change item to highlight modified entity on Graph canvas.

### Task 14: Simulate Refactoring Operations
- **Evidence**: `RefactoringSimulationPanel.tsx`, `refactoring-simulation.ts`
- **Likely Entry Point**: Drawer `Actions` tab ➔ `"Simulate Proposed Refactoring"`.
- **Relevant Visualizations**: `RefactoringSimulationPanel`, `GraphView`.
- **Required Interactions**: Step forward/back through proposed operations (add/remove node, add/remove edge), view step impact scorecard.
- **Expected Output**: Simulated temporary positions on GraphView with green (`simulated-added`) and red (`simulated-removed`) visual highlights, delta findings impact.
- **Exit Action**: Click `"Commit Refactoring"` or `"Cancel Simulation"`.

### Task 15: Hand Off Component Refactoring Context
- **Evidence**: `RefactorHandoffModal.tsx`, `refactor-handoff.ts`
- **Likely Entry Point**: Drawer header or Actions tab ➔ `"Hand off"`.
- **Relevant Visualizations**: `RefactorHandoffModal`.
- **Required Interactions**: Select handoff target (`AI Assistant`, `CLI Script`, `GitHub Issue`, `Markdown`), view generated JSON/Markdown payload.
- **Expected Output**: Structured refactoring payload containing target node, fan-in/fan-out list, risk factors, and evidence lines.
- **Exit Action**: Click `"Copy Payload"` or `"Simulate First"`.

---

## 5. Entry-Point Audit

The application provides 8 distinct entry points into visualization workflows:

```text
1. Default Application Startup
   └→ Data: /explorer-data.json (or active project storage)
   └→ View: GraphView ('graph')
   └→ Actions: Pan, zoom, select node, switch layout mode, open command palette.

2. Project Selector Dropdown (Header)
   └→ Action: Select project from dropdown
   └→ State: Loads projectState.<projectId> from localStorage
   └→ Actions: Restores last saved viewMode, filterState, nodePositions, selection.

3. ViewModeSwitcher Toolbar
   └→ Action: Click any of 18 view mode buttons
   └→ State: setWorkspaceViewMode(mode)
   └→ Actions: Preserves selectedNodeId and visibleNodeTypes; renders selected lens panel.

4. Command Palette (Cmd+K)
   └→ Action: Type query string or select quick action
   └→ Actions: Select component node, toggle view mode, apply focus filter, show impact.

5. Sidebar Component Inventory
   └→ Action: Search components, filter by type/risk/hotspot, click component row
   └→ State: Updates selectedNodeId, opens InvestigationDrawer.

6. Project Dashboard CTAs
   └→ Action: Click "Explore Dependency Graph", "View Findings", or "View History"
   └→ State: Switches workspaceViewMode to 'graph', 'findings', or 'history'.

7. Findings / Hotspot / Diagnostics Action Buttons
   └→ Action: Click "Investigate <Node>", "Select Component", or "Highlight Cycle"
   └→ State: Selects target node/edge, switches viewMode to 'graph', highlights element.

8. URL / Deep Link Entry
   └→ Query Params: ?node=<nodeId>&view=<viewMode>&project=<projectId>
   └→ Actions: Loads target project, sets active viewMode, selects target node ID.
```

---

## 6. User Journey Reconstruction

### Journey 1: Architecture Health Triage ➔ Finding Investigation ➔ Topological Fix
- **Step 1 (Entry)**: User lands on `ProjectDashboard` or `RadarPanel`. Observes Risk Exposure (e.g. 24%) or Health Score (57/100).
- **Step 2 (Triage)**: Switches to `FindingsPanel`. Filters by status `Unresolved` and severity `Critical`.
- **Step 3 (Inspection)**: Expands finding details, reviews `WHAT`, `WHY IT MATTERS`, `WHERE` (file:line evidence snippet), and `WHAT TO DO NEXT`.
- **Step 4 (Navigation)**: Clicks `"🔍 Investigate <Node>"`. `App.tsx` updates `selectedNodeId`, switches mode to `'graph'`, centers Cytoscape canvas on target node, highlights connected edges, and opens `InvestigationDrawer`.
- **Step 5 (Outcome)**: User reviews drawer `Overview` and `Dependencies` tabs, clicks `"Hand off to Refactor"` or `"Simulate Proposed Refactoring"`.

### Journey 2: Feature Coupling Discovery ➔ Transfer Hub Identification ➔ Cardinal Neighborhood
- **Step 1 (Entry)**: User switches to `FeatureMatrixPanel` or `CouplingHeatmapPanel`.
- **Step 2 (Observation)**: Observes high combined weight (e.g. weight 18) between `OrderManagement` feature and `PaymentProcessing` feature.
- **Step 3 (Navigation)**: Clicks heatmap cell. App updates `selectedNodeId` to feature anchor node and navigates to `GraphView`.
- **Step 4 (Transit Analysis)**: Switches to `SubwayPanel`. Identifies transfer station hub (`PaymentGatewayAdapter`) bridging both feature tracks.
- **Step 5 (Cardinal Analysis)**: Switches to `FourDirectionPanel`. Reviews `Upstream` dependents (LWCs calling gateway) and `Downstream` dependencies (external HTTP services).

### Journey 3: Component Search ➔ Radial Constellation Exploration ➔ Progressive Drilling
- **Step 1 (Entry)**: User presses `Cmd+K` to open `CommandPalette` or types in `Sidebar` search.
- **Step 2 (Selection)**: Selects `AccountController`. `SelectionContext` updates `selectedNodeId`.
- **Step 3 (Radial View)**: Switches to `DependencyConstellationPanel`. Observes 2-hop orbital rings around `AccountController`.
- **Step 4 (Re-Centering)**: Double-clicks `AccountService` on 1-hop ring. Clicks `"Set as Orbit Focal Center →"`. Constellation re-calculates radial polar layout around `AccountService`.
- **Step 5 (Outcome)**: Drawer breadcrumb bar records drill path (`AccountController ➔ AccountService`).

---

## 7. Visualization Roles Within Tasks

| Visualization | Primary Role | Secondary Roles | Workflow Participation |
| :--- | :--- | :--- | :--- |
| **GraphView** | Topological Exploration | Focus, Impact, Feature Region Overlay | Micro/meso graph investigation, spatial position authority, refactoring simulation canvas. |
| **FeatureMatrixPanel** | Relationship Quantification | Feature Coupling Analysis, Layer Alignment | Structural feature-to-feature dependency weight inspection. |
| **CouplingHeatmapPanel** | Intensity Identification | Multi-Metric Comparison, Heatmap Filtering | Visual heat gradient analysis across combined, direct, flow, and shared metrics. |
| **DependencyRiverPanel** | Flow Tracing | Macro Flow Volume, Edge Provenance | Layer stage flow tracing (`Presentation ➔ Application ➔ Domain ➔ Schema`). |
| **FeatureTreePanel** | Hierarchy Inspection | Taxonomy Navigation, Component Search | 5-level tree list hierarchy exploration with search auto-expansion. |
| **ArchitectureTreemapPanel** | Metric Proportionality | Density Analysis, Subtree Drilldown | Squarified bounding rectangle area density analysis sized by fan-in, fan-out, coupling, or score. |
| **SubwayPanel** | Route Schematic | Transfer Hub Discovery, Cross-Tracks | Feature transit route map identifying cross-feature transfer station hubs. |
| **DependencyConstellationPanel** | Radial Neighborhood | Hop-Distance Filtering, Focal Orbit | Focal-centric polar orbital neighborhood exploration across 1–3 hop rings. |
| **FeatureProfilePanel** | Scorecard Inspection | Single Component Audit, Risk Profiling | Comprehensive component scorecard with fan-in/fan-out gauges and topology flags. |
| **RadarPanel** | Health Orientation | Macro Quality Portfolio, Unbacked Reporting | Project-wide multi-dimensional health scoring across 6 polar health axes. |
| **ArchitectureDNABarcode** | Barcode Fingerprinting | Multi-Signal Comparison, Anomaly Detection | 7-band normalized barcode fingerprint scanning across component inventory. |
| **FourDirectionPanel** | Cardinal Neighborhood | Upstream/Downstream Categorization | 3x3 cardinal grid organizing neighbors into Upstream, Downstream, Peers, and Cross-Feature. |

---

## 8. Information Need Mapping

| Workflow Step | User Information Need | Current UI / View | Data Exposed | Interaction Required | Next Information Need |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Orient** | Is the architecture healthy? | `RadarPanel` / `ProjectDashboard` | Health Score (0–100), Risk Exposure %, Finding Counts | Hover/click polar axis | Where are rule violations? |
| **2. Triage** | What rules are violated and where? | `FindingsPanel` | Critical/High findings, `WHAT`, `WHY`, `WHERE` code evidence | Filter status/severity | What component is affected? |
| **3. Locate** | Where is component X in the system? | `Sidebar` / `CommandPalette` / `GraphView` | Component ID, Type, Risk, Canvas Position | Type search query / Click node | What are its dependencies? |
| **4. Neighborhood** | What depends on X and what does X depend on? | `FourDirectionPanel` / `Constellation` / Drawer | Upstream/Downstream lists, 1–3 hop orbital rings, Fan-in/Out | Switch tabs / Change depth | What is the blast radius? |
| **5. Impact** | What is the ripple effect if X is refactored? | `RefactoringSimulationPanel` / Drawer Impact | Direct/indirect affected nodes, test coverage impact | Click "Simulate Refactoring" | How to execute handoff? |
| **6. Handoff** | How to export context for remediation? | `RefactorHandoffModal` | Structured payload (JSON/Markdown) | Click "Hand off to Refactor" | Task complete |

---

## 9. Context Preservation Audit

| Transition | Selected Entity | Feature Context | Focus Depth | Filters | Visibility Filters | Active Project |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Graph ➔ Matrix** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Matrix ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Tree ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Findings ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Profile ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Constellation ➔ Graph** | Preserved | Preserved | Preserved | N/A | Preserved | Preserved |
| **FourDirection ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Subway ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **Treemap ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |
| **River ➔ Graph** | Preserved | Preserved | N/A | N/A | Preserved | Preserved |

---

## 10. Context Loss Analysis

1. **Cartesian Viewport Coordinates**:
   - Transitioning from `GraphView` to non-graph lenses (`Matrix`, `River`, `Subway`, `Constellation`) transforms spatial coordinates into lens-specific layouts (e.g. radial polar angles or stage columns). Upon returning to `GraphView`, Cytoscape restores node coordinates from `projectState.ts` (`nodePositions`), but canvas pan/zoom coordinates reset to center fit unless preserved in session state.
2. **Drawer Drill Path Scope**:
   - `drillPath` in `InvestigationDrawer` is session-bound. Switching active projects (`activeProjectId`) explicitly clears `drillPath` and active simulation proposals (`App.tsx` project change listener) to prevent cross-project pollution.
3. **Simulation Temporary Operations**:
   - Active refactoring simulation proposals (`activeSimulationProposal`) exist in volatile React state. Navigating away to compare mode or switching projects clears uncommitted simulation steps.

---

## 11. Workflow Continuity

| Workflow Path | Continuity Classification | Operational Mechanism |
| :--- | :--- | :--- |
| **Finding ➔ Graph Investigation** | Can continue directly | Click `"🔍 Investigate <Node>"` ➔ selects node, opens drawer, centers canvas. |
| **Hotspot ➔ Impact Analysis** | Can continue directly | Click `"💥 Analyze Impact"` in hotspot card ➔ updates impact state on Graph. |
| **Matrix Cell ➔ Feature Anchor** | Can continue directly | Click matrix cell ➔ selects feature anchor node ➔ switches mode to `'graph'`. |
| **Subway Station ➔ Graph Exploration** | Can continue directly | Click station ➔ click `"Explore in Graph"` ➔ switches mode to `'graph'`. |
| **Tree Component ➔ Graph Canvas** | Can continue directly | Click component row ➔ selects node ➔ click `"Explore in Graph Canvas →"`. |
| **Constellation Re-Centering** | Can continue with additional interaction | Double-click node or click `"Set as Orbit Focal Center →"` ➔ re-centers radial view. |
| **Compare Snapshot Diff ➔ Graph Focus** | Can continue directly | Click `"🔍 Focus"` button on diff change item ➔ highlights entity on Graph. |

---

## 12. Cross-Layout Transitions

The application implements 10 primary cross-layout transitions managed by `App.tsx`:

1. **`Findings ➔ Graph`**: Triggered by `"Investigate Node"` button. Context carried: `selectedNodeId`, `selectedFindingId`. Destination: `GraphView` with node centered and drawer open.
2. **`Matrix ➔ Graph`**: Triggered by cell/row click. Context carried: `selectedNodeId` (feature anchor). Destination: `GraphView`.
3. **`Heatmap ➔ Graph`**: Triggered by cell click. Context carried: `selectedNodeId` (feature anchor). Destination: `GraphView`.
4. **`River ➔ Graph`**: Triggered by `"Explore in Graph Canvas"` or `"Return to Graph"`. Context carried: `selectedNodeId`. Destination: `GraphView`.
5. **`Tree ➔ Graph`**: Triggered by component click or `"Explore in Graph Canvas →"`. Context carried: `selectedNodeId`. Destination: `GraphView`.
6. **`Treemap ➔ Graph`**: Triggered by `"Explore in Graph Canvas"` in footer. Context carried: `selectedNodeId`. Destination: `GraphView`.
7. **`Subway ➔ Graph`**: Triggered by `"Explore in Graph"` in station drawer. Context carried: `selectedNodeId`. Destination: `GraphView`.
8. **`Constellation ➔ Graph`**: Triggered by `"Return to Graph Canvas"`. Context carried: `selectedNodeId` (focal node). Destination: `GraphView`.
9. **`FourDirection ➔ Graph`**: Triggered by `"Return to Graph Canvas"`. Context carried: `selectedNodeId` (subject node). Destination: `GraphView`.
10. **`Compare ➔ Graph`**: Triggered by `"🔍 Focus"` button on diff item. Context carried: `focusedEntityId`. Destination: `GraphView` with target node/edge selected.

---

## 13. Explicit vs Implicit Navigation

### Explicit Navigation
- User intentionally clicks a view switcher button in `ViewModeSwitcher` (`Graph`, `Matrix`, `River`, `Tree`, etc.).
- User clicks `"← Return to Graph Canvas"` button in `Constellation`, `FourDirection`, or `River`.
- User clicks `"Explore in Graph Canvas →"` button in `Profile`, `DNA`, `Treemap`, or `Subway`.
- User clicks `"Compare Selected Pair"` in `AnalysisHistoryPanel`.

### Implicit Navigation
- Clicking a matrix cell in `FeatureMatrixPanel` or `CouplingHeatmapPanel` selects the feature anchor node AND automatically switches `workspaceViewMode` to `'graph'`.
- Clicking `"🔍 Investigate <Node>"` in `FindingsPanel` sets selection AND automatically switches `workspaceViewMode` to `'graph'`.

---

## 14. Discoverability Audit

| Capability | Discovery Mechanism | Implementation Evidence | Alternate Access Path | Discoverability Dependency |
| :--- | :--- | :--- | :--- | :--- |
| **Command Palette** | Header button (`"⌨️ Cmd+K"`) & keyboard shortcut | `Header.tsx`, `useCommandPalette.ts` | Keyboard shortcut `Cmd+K` / `Ctrl+K` | Visible header button with shortcut badge. |
| **View Mode Switcher** | Horizontal toggle bar with icons and text labels | `ViewModeSwitcher.tsx` | Command Palette view mode actions | Top workspace bar visible across all screens. |
| **Graph Mode Indicator** | Floating badge (`"📌 Static Mode"` / `"🔀 Interactive Mode"`) | `GraphView.tsx` | GraphControls toggle button | Floating overlay badge on top-left of canvas. |
| **Feature Overlays** | Checkbox / Toggle in GraphControls | `GraphControls.tsx`, `FeatureOverlayCanvas.tsx` | Automatic in Hybrid architecture mode | Floating controls toolbar. |
| **Refactoring Simulation** | Drawer `Actions` tab ➔ `"Simulate Proposed Refactoring"` | `InvestigationDrawer.tsx`, `App.tsx` | Command palette / Refactor handoff modal | Drawer selection required first. |
| **Compare Snapshots** | Header `"🔍 Compare"` button or View Switcher button | `Header.tsx`, `ViewModeSwitcher.tsx` | Analysis History panel pairwise selection | Top header and view switcher. |

---

## 15. Observable Workflow Friction

1. **View Switcher Scroll Requirement on Compact Viewports**:
   - The 18-button view switcher bar (`ViewModeSwitcher.tsx`) spans ~1200px width. On tablet/compact viewports (<1024px), horizontal scrolling (`overflow-x: auto`) is required to access rightmost buttons (`History`, `Compare`, `Four-Dir`).
2. **Re-Centering Requirement in Single-Subject Lenses**:
   - `FourDirectionPanel` and `DependencyConstellationPanel` render local neighborhoods around a single active subject/focal node. Investigating a 2nd-hop peer requires explicitly clicking `"Focus as Subject Center →"` or double-clicking the node to re-center the lens.
3. **Implicit Mode Switch on Matrix Cell Click**:
   - Clicking a cell in `FeatureMatrixPanel` immediately switches mode to `'graph'`. Users wishing to stay in Matrix mode to inspect multiple cells must use cell hover instead of cell click.

---

## 16. Observable Complexity Signals

- **Navigation Steps**: A user triaging an architecture finding performs 3 steps (Open Findings ➔ Select Finding ➔ Click Investigate ➔ View Graph & Drawer).
- **Context Switches**: 1 workspace view switch (`Findings ➔ Graph`) carrying 2 state parameters (`selectedNodeId`, `selectedFindingId`).
- **State Dimensions**: 6 active state dimensions managed concurrently in `App.tsx` (`workspaceViewMode`, `selectedNodeId`, `selectedEdgeId`, `visibleNodeTypes`, `focusState`, `activeSimulationProposal`).

---

## 17. Terminology Consistency

| Conceptual Action | Terms Used in Implementation | Source Locations |
| :--- | :--- | :--- |
| **Navigate to Graph** | `"Explore in Graph Canvas"`, `"Explore in Graph"`, `"Return to Graph Canvas"`, `"Return to Graph"`, `"Explore Dependency Graph"` | `ProjectDashboard.tsx`, `FeatureProfilePanel.tsx`, `ArchitectureDNABarcode.tsx`, `DependencyRiverPanel.tsx`, `SubwayPanel.tsx`, `DependencyConstellationPanel.tsx`, `FourDirectionPanel.tsx` |
| **Set Focal Node** | `"Set as Orbit Focal Center"`, `"Focus as Subject Center"`, `"Make Focal"` | `DependencyConstellationPanel.tsx`, `FourDirectionPanel.tsx` |
| **Select Node** | `onSelectNode`, `selectNode`, `setSelectedNodeId`, `setActiveProfileId`, `setActiveComponentId` | `App.tsx`, `SelectionContext.tsx`, `FeatureProfilePanel.tsx`, `ArchitectureDNABarcode.tsx` |
| **Node Selection State** | `selectedNodeId`, `currentNodeId`, `subject.nodeId`, `focalNode.id`, `activeProfile.id` | `projectState.ts`, `InvestigationDrawer.tsx`, `FourDirectionPanel.tsx`, `DependencyConstellationPanel.tsx` |

---

## 18. User Mental-Model Signals

The UI presents concepts according to a clear 3-tier hierarchy:
1. **Workspace View Modes (`WorkspaceViewMode`)**: Top-level analytical lenses presented as equal tab options in `ViewModeSwitcher` (`Graph`, `Overview`, `Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Subway`, `Constellation`, `Profile`, `Radar`, `DNA`, `Four-Dir`, `Findings`, `Hotspots`, `Diagnostics`, `Compare`, `History`).
2. **Contextual Inspection Drawers**: Right-side drawer (`InvestigationDrawer`) presented as an active inspection surface overlaying or side-docking next to the primary view lens.
3. **Modal Dialogs**: Specialized ephemeral workflows (`CommandPalette`, `RefactorHandoffModal`, `ProjectCreationModal`) presented as centered modal overlays.

---

## 19. Task-to-Visualization Matrix

| User Task | Graph | Matrix | Heatmap | River | Tree | Treemap | Subway | Constellation | Profile | Radar | DNA | FourDirection |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Architecture orientation** | YES | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO | NO | YES | PARTIAL | NO |
| **Dependency inspection** | YES | PARTIAL | PARTIAL | YES | NO | NO | YES | YES | PARTIAL | NO | NO | YES |
| **Feature investigation** | YES | YES | YES | YES | YES | YES | YES | PARTIAL | PARTIAL | NO | PARTIAL | PARTIAL |
| **Impact investigation** | YES | NO | NO | PARTIAL | NO | NO | PARTIAL | YES | PARTIAL | NO | NO | YES |
| **Relationship comparison** | YES | YES | YES | YES | NO | PARTIAL | YES | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| **Health investigation** | PARTIAL | PARTIAL | PARTIAL | NO | NO | PARTIAL | NO | NO | YES | YES | YES | NO |

---

## 20. Task Coverage vs Interaction Coverage

- **Task Coverage**: The application supports all 15 core architectural analysis tasks through specialized adapters and dedicated panels.
- **Interaction Coverage**:
  - `GraphView`: Direct Cytoscape node drag, zoom, pan, hover cards, node selection, edge selection, focus depth adjustment, mode toggling.
  - Analytical Lenses (`Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Subway`, `Constellation`, `Profile`, `Radar`, `DNA`, `FourDirection`): Click node/cell, hover inspection, text search filtering, threshold inputs, metric mode selectors, sub-tree drilldowns, double-click re-centering, direct graph navigation buttons.

---

## 21. Empty / Loading / Error UX

| State | Message / Indicator | Available Actions | Recovery Path | Context Preserved? |
| :--- | :--- | :--- | :--- | :--- |
| **Not Analyzed Project** | `NotAnalyzedScreen` ("Project created successfully. Run analysis to generate data") | CLI command copy block | Run `scripts/export-explorer.cjs` or switch project in header | Project ID preserved |
| **Loading Data** | `LoadingScreen` ("Loading Architecture Graph…") | Spinner animation | Automatic upon JSON fetch completion | Project ID preserved |
| **Load Error** | `ErrorScreen` ("Failed to Load Explorer") | `"Retry"` button | Click Retry or check server connection | Error state logged |
| **Filtered-to-Zero** | Panel empty message ("No components match search query") | `"Clear Search"` / `"Clear All Filters"` button | Click clear button | Selection preserved |
| **No Findings** | `FindingsPanel` empty state ("Zero violations detected") | Filter toggle buttons | Switch filter to `All` or `Resolved` | Severity filters preserved |

---

## 22. Entry With vs Without Context

- **Entry Without Context**: App opens with default project, `selectedNodeId = null`, `workspaceViewMode = 'graph'`, full graph rendered.
- **Entry With Context**: App opened via deep-link `?node=ApexClass:AccountService&view=profile&project=cst`. App loads `cst` project, sets `workspaceViewMode = 'profile'`, selects `AccountService`, opens profile card in `FeatureProfilePanel`.

---

## 23. Deep-Link / URL Workflows

- **URL State Contract**: `useViewState.ts` parses `window.location.search` for query parameters:
  - `project`: Target project ID.
  - `view`: Target workspace view mode.
  - `node`: Target selected node ID.
  - `finding`: Target selected finding ID.
- **Test Coverage**: Protected by `App.deepLink.test.tsx` (verifying deep-link query parameter parsing, node selection, and view mode activation on cold launch).

---

## 24. Project / Compare Workflows

- **Project Switching**: Changing project via `ProjectSelector` in Header triggers `explorer:project-changed` event. `App.tsx` loads `loadProjectState(projectId)`, clears transient simulation proposals, clears active selection, and restores saved filters, zoom, and node positions for the target project.
- **Compare Mode**: Opening `ComparePanel` (`workspaceViewMode = 'compare'`) allows loading baseline and target snapshots. Clicking `"🔍 Focus"` on a diff change item sets `focusedEntityId`, highlights the added/removed/modified node or edge, and allows returning to `GraphView`.

---

## 25. Repeated Workflow Patterns

```text
Pattern A: Search ➔ Select ➔ Inspect
Appears in: Sidebar, Command Palette, Tree, Profile, DNA, Four-Direction.
Implementation: User types search query ➔ Clicks list item ➔ Sets selectedNodeId ➔ Drawer/Inspector updates.

Pattern B: Lens View ➔ Inspect Cell/Card ➔ Explore in Graph
Appears in: Matrix, Heatmap, River, Treemap, Subway, Profile, DNA, Four-Direction, Constellation.
Implementation: User inspects analytical lens ➔ Clicks component/cell ➔ Clicks "Explore in Graph Canvas →" ➔ View switches to 'graph' with node centered.
```

---

## 26. Workflow Branching

When a user selects a component in `GraphView` or `InvestigationDrawer`, the workflow branches into 5 parallel investigation paths:
```text
Select Component (node)
   ├── Branch 1: Overview ➔ View risk assessment & key metrics
   ├── Branch 2: Dependencies / Dependents ➔ Drill into N-hop neighbor list
   ├── Branch 3: Graph Actions ➔ Apply Focus / Analyze Impact / Analyze Connections
   ├── Branch 4: Refactoring ➔ Simulate proposed refactoring operations
   └── Branch 5: Handoff ➔ Export structured payload to AI Assistant / CLI / GitHub
```

---

## 27. Workflow Dead Ends

- Zero workflow dead ends observed. Every analytical panel exposes explicit navigation buttons (`"Explore in Graph Canvas →"`, `"← Return to Graph Canvas"`, or `ViewModeSwitcher` buttons) allowing users to continue investigation without getting trapped.

---

## 28. Back / Return Behavior

- **In-App Return Buttons**: `Constellation`, `FourDirection`, and `River` panels feature dedicated `"← Return to Graph Canvas"` header buttons. Clicking this button switches `workspaceViewMode` to `'graph'` while preserving `selectedNodeId`.
- **Browser Back Button**: Deep-link URL parameters updated by `useViewState.ts` support browser back/forward history navigation between view modes and selected components.

---

## 29. Task Completion Signals

- **Finding Resolution**: Clicking `"✓ Resolve"` in `FindingsPanel` updates review status badge to `RESOLVED` (green badge) and increments resolved counter.
- **Refactoring Commit**: Clicking `"Commit Refactoring"` in `RefactoringSimulationPanel` applies mutated graph data to `committedMutatedGraph`, updates node count in `StatusBar`, and closes simulation panel.
- **Handoff Payload Copy**: Clicking `"Copy Payload"` in `RefactorHandoffModal` displays `"Copied to Clipboard!"` toast and closes modal.

---

## 30. Existing UX / Product Contracts

Supported by codebase evidence:
1. *"Selecting an entity in any view preserves the active selection across view mode changes."* (Enforced by `SelectionContext` and `CROSS_LAYOUT_GRAPH_VISIBILITY_AND_SELECTION_IMPLEMENTATION_REPORT.md`).
2. *"Toggling node-type visibility filters in SearchFilterPanel immediately filters visible nodes across all 12 view lenses without mutating graph coordinates."* (Enforced by `visibleActiveData` in `App.tsx`).
3. *"Static mode view changes must never invoke intelligent layout algorithms or shift node positions."* (Enforced by `position-policy.ts`).

---

## 31. Existing Tests / Regression Coverage

The following test suites protect user task and UX workflows:
- `App.test.tsx`: Master App rendering, view switcher mode changes, sidebar collapse, status bar counts.
- `App.deepLink.test.tsx`: Deep-link query parameter parsing (`?node=...&view=...`), initial selection, and view mode activation.
- `App.investigationWorkflow.test.tsx`: End-to-end investigation drawer drilling, breadcrumbs, recent list, and simulation handoff.
- `CrossLayoutVisibilityAndSelection.test.tsx`: Synchronized node selection, visibility filtering, and visual dimming across all 12 view lenses.
- `FindingsPanel.test.tsx`: Finding severity filtering, status triage (`Open`, `In Review`, `Resolved`), evidence expansion, and investigation triggers.
- `HotspotPanel.test.tsx`: Hotspot ranking, metric grid expansion, category tab toggling, refactoring readiness filtering.
- `ComparePanel.test.tsx`: Snapshot JSON input, 7-card diff metric summary, category change filtering, graph focus actions.

---

## 32. Confirmed Findings vs Inferences

### Confirmed Implementations (Observable Facts):
- All 12 primary visualizations and 6 supporting analytical views are fully integrated into `App.tsx` and `ViewModeSwitcher.tsx`.
- `selectedNodeId` is preserved centrally across all view mode transitions.
- All 12 visualization panels receive `visibleActiveData` filtered by `visibleNodeTypes`.
- `InvestigationDrawer` provides 5 tabs (`Overview`, `Dependencies`, `Dependents`, `Evidence`, `Actions`) with breadcrumb drilling and handoff actions.

### Workflow Inferences:
- The presence of `"Explore in Graph Canvas →"` buttons across 8 analytical panels indicates an intended "Summary Lens ➔ Deep Topological Canvas Investigation" workflow pattern.

---

## 33. Risks and Ambiguities

- **Compact Viewport View Switcher Reachability**: View switcher toolbar requires horizontal scrolling on viewports under 1024px width.
- **Volatile Refactoring Simulation State**: Uncommitted simulation steps are stored in volatile React state and reset if the user switches active projects.

---

## 34. Questions for Phase 1

1. Should the 18 view switcher buttons be organized into explicit workspace sub-groups (e.g., `Overview`, `Topology`, `Metrics`, `Flows`, `Triage`) to streamline toolbar layout on compact viewports?
2. Should active refactoring simulation proposals persist in `localStorage` alongside project state so users can resume simulation across sessions?

---

## 35. Evidence Index

- `explorer/src/App.tsx`: Master workspace router, view switching, drawer slots, simulation state, project change listeners (lines 1–850).
- `explorer/src/components/ViewModeSwitcher.tsx`: 18-button view switcher toolbar (lines 1–160).
- `explorer/src/components/GraphView.tsx`: Cytoscape dependency graph canvas, position policy, mode indicator, lines 1–850.
- `explorer/src/components/FeatureMatrixPanel.tsx`: 2D feature matrix, cell hover, selection, lines 1–280.
- `explorer/src/components/CouplingHeatmapPanel.tsx`: HTML5 Canvas heatmap, 4 metric modes, lines 1–320.
- `explorer/src/components/DependencyRiverPanel.tsx`: Sankey macro flow, cubic Bézier streams, provenance, lines 1–350.
- `explorer/src/components/FeatureTreePanel.tsx`: 5-level hierarchical tree list, search auto-expansion, lines 1–400.
- `explorer/src/components/ArchitectureTreemapPanel.tsx`: Squarified treemap, metric modes, breadcrumbs, lines 1–350.
- `explorer/src/components/SubwayPanel.tsx`: Transit route map, shared transfer stations, lines 1–260.
- `explorer/src/components/DependencyConstellationPanel.tsx`: Radial polar constellation, 1–3 hop orbital rings, lines 1–380.
- `explorer/src/components/FeatureProfilePanel.tsx`: Component profile scorecard, gauges, lines 1–380.
- `explorer/src/components/RadarPanel.tsx`: Multi-dimensional polar radar, 6 health axes, lines 1–350.
- `explorer/src/components/ArchitectureDNABarcode.tsx`: 7-band DNA barcode, overall index, lines 1–360.
- `explorer/src/components/FourDirectionPanel.tsx`: 3x3 cardinal grid (Up, Down, Left, Right), lines 1–320.
- `explorer/src/components/ProjectDashboard.tsx`: Dashboard overview, portfolio metrics, CTAs, lines 1–450.
- `explorer/src/components/findings/FindingsPanel.tsx`: Issue-oriented findings, triage workflows, code evidence, lines 1–380.
- `explorer/src/components/HotspotPanel.tsx`: Hotspot ranking, readiness classification, lines 1–320.
- `explorer/src/components/DiagnosticsPanel.tsx`: Circular dependency cycles, unresolved references, lines 1–220.
- `explorer/src/components/ComparePanel.tsx`: 3-step snapshot diff workflow, 7-card summary, lines 1–280.
- `explorer/src/components/AnalysisHistoryPanel.tsx`: Historical snapshot timeline, pairwise compare, lines 1–220.
- `explorer/src/components/InvestigationDrawer.tsx`: 5-tab drawer, breadcrumbs, handoff actions, lines 1–650.
- `explorer/src/components/CommandPalette.tsx`: Cmd+K command palette modal, lines 1–250.
- `explorer/src/lib/projectState.ts`: WorkspaceViewMode type, state persistence manager, lines 1–320.
- `explorer/src/hooks/useViewState.ts`: Query param deep-link parser, lines 1–120.
- `explorer/src/context/SelectionContext.tsx`: Global selection provider, lines 1–50.
- `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx`: Cross-layout selection & visibility test suite, lines 1–200.
- `explorer/src/test/App.deepLink.test.tsx`: Deep link test suite, lines 1–100.
- `explorer/src/test/App.investigationWorkflow.test.tsx`: Investigation workflow test suite, lines 1–150.

---

## 36. Read-Only Verification

I confirm that:
- **Zero source code files were modified.**
- **Zero test files were modified.**
- **Zero configuration or package files were modified.**
- **Zero application layout behaviors were changed.**
- **The codebase remains 100% untouched and read-only.**

Only `P0-5_USER_TASK_UX_AUDIT.md` was created as the sole required deliverable for this task.

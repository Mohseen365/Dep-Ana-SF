# Salesforce Migration Parity-Gap Report

**Date:** 9 November 2026
**Scope:** Validation of Current Salesforce Proof-of-Concept against React Production Sources
**Primary Source Documents:** `salesforce_migration_tracking_report.md` & `salesforce_migration_file_inventory.xlsx`
**Target Repository Path:** `scratch/salesforce-poc/force-app/main/default/`

---

## 1. Executive Parity Assessment

The migration from React 19 + TypeScript (`explorer/src/`) to Salesforce DX metadata (`scratch/salesforce-poc/`) has completed initial proof-of-concept components for core visualization and data services. However, 0 of 196 production files are certified at 100% feature parity or production acceptance. The 15 partially converted items represent the active baseline.

### Summary Metrics:
- **Total React Production Files Assessed:** 196
- **Partially Converted Items:** 15
- **Ready for Conversion Items:** 106
- **Blocked / Dependent Items:** 74
- **Salesforce Target Completion Average (Partially Converted):** ~53.3%

---

## 2. Detailed Item-by-Item Parity Analysis

### Item 1: App.tsx
- **React Source:** `explorer/src/App.tsx` (798 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Orchestrates multi-domain routing (`WorkspaceRouterContext`), progressive investigation state (`InvestigationContext`), project switching (`ProjectContext`), command palette integration, keyboard shortcuts modal, multi-view layout splits, and error boundary wrappers.
- **Salesforce Implementation Analysis:** `daAppShell` provides the master layout frame, tab-based view switching between Graph, Matrix, and Findings, project change handling, and container resize observers. It binds to `DAGraphController` for project metadata and analysis runs.
- **Missing Functionality:** Full 18-view workspace routing, progressive investigation drawer synchronization, deep-linking URL parameters, command palette modal orchestration, and keyboard shortcut event listeners.
- **Missing Apex Services:** Unified workspace state service, multi-run diff orchestration.
- **Missing DTOs:** Workspace state DTO, route configuration DTO.
- **Missing UI Elements:** Collapsible dual sidebars, status bar footer with memory/execution metrics, command palette trigger button.
- **Missing Navigation Flows:** Deep link state restoration (`?view=...&node=...`), tabbed multi-workspace navigation.
- **Missing Error Handling:** Graceful child component error boundaries; recovery toast notifications on payload chunking failure.
- **Missing Security Controls:** Enforcement of workspace tab visibility by user profile / custom permissions.
- **Missing Tests:** End-to-end routing Jest tests; LWC event handling tests for project/tab switching.
- **Technical Risks:** LWC event propagation limitations across synthetic shadow DOM boundaries.
- **Recommended Completion Order:** Step 3 (Core Shell milestone).

---

### Item 2: GraphView.tsx
- **React Source:** `explorer/src/components/GraphView.tsx` (2,055 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer` & `daLayoutEngine`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Powers Cytoscape.js canvas rendering, multi-layout algorithms (Architecture, Orbit, Constellation, Sankey), edge bundling, hover cards, multi-selection, viewport caching, level-of-detail (LOD) scaling, and layout worker threading.
- **Salesforce Implementation Analysis:** `daGraphViewer` initializes Cytoscape via static resource, loads graph chunks via `daGraphPayloadLoader`, and invokes `daLayoutEngine` for deterministic coordinate computation. Handles node selection and basic zoom/pan.
- **Missing Functionality:** Interactive hover cards with live metadata inspection, dynamic edge bundling, level-of-detail rendering thresholds for >1,000 nodes, canvas image export (PNG/SVG/JSON), and web worker offloading.
- **Missing Apex Services:** Persisted node layout coordinates query and mutation service.
- **Missing DTOs:** Viewport state DTO, node position persistence payload DTO.
- **Missing UI Elements:** Hover card popover, contextual right-click menu, minimap overview, edge weight threshold sliders.
- **Missing Navigation Flows:** SELECTION ≠ NAVIGATION invariant enforcement on deep drill-down.
- **Missing Error Handling:** Recovery from Cytoscape canvas WebGL/2D context loss; memory exhaustion safeguard.
- **Missing Security Controls:** Sanitization of node tooltips to prevent stored XSS from malicious metadata names.
- **Missing Tests:** Cytoscape lifecycle destruction tests under rapid DOM rerendering; Jest canvas resize tests.
- **Technical Risks:** Browser memory limits with large graphs (>5,000 elements) within Lightning Web Security (LWS) containment.
- **Recommended Completion Order:** Step 4 (Core Graph milestone).

---

### Item 3: FindingsPanel.tsx
- **React Source:** `explorer/src/components/FindingsPanel.tsx` (373 lines) & `findings/`
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView`
- **Current Estimated Completion %:** 75%
- **React Source Analysis:** Renders rule violations, architectural anti-patterns, cyclic dependencies, and God-class detections. Supports severity filtering, category drill-down, search keyword match, and direct graph focus dispatch.
- **Salesforce Implementation Analysis:** `daFindingsView` provides datatable/card rendering of findings, severity badges (Critical, Major, Minor, Info), search input, and dispatches node selection events to the shell.
- **Missing Functionality:** Batch remediation actions, finding export (CSV/JSON), finding suppression/annotation linkage, and rule detail documentation drawer.
- **Missing Apex Services:** `DAFindingService.suppressFinding`, `DAFindingService.exportFindings`.
- **Missing DTOs:** Finding suppression audit DTO.
- **Missing UI Elements:** Suppression comment modal, rule explanation flyout, finding category distribution chart.
- **Missing Navigation Flows:** Cross-linking from finding detail directly to Investigation Drawer and Git commit history.
- **Missing Error Handling:** Empty-state illustrations and paginated fetch failure handlers.
- **Missing Security Controls:** FLS validation on `DA_Finding__c` custom fields (`Rule_Id__c`, `Severity__c`, `Details__c`).
- **Missing Tests:** Pagination boundary tests, severity filter Jest unit tests.
- **Technical Risks:** High finding counts (>20,000) exceeding client-side datatable rendering budget.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 4: DiagnosticsPanel.tsx
- **React Source:** `explorer/src/components/DiagnosticsPanel.tsx` (226 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView`
- **Current Estimated Completion %:** 75%
- **React Source Analysis:** Displays system health, pipeline execution stage latencies, memory footprint, node/edge counts, graph density, and Tarjan strongly connected component (SCC) cyclomatic metrics.
- **Salesforce Implementation Analysis:** `daDiagnosticsView` computes and displays graph summary cards, stage timing breakdowns, density scores, and SCC cycle counts.
- **Missing Functionality:** Dynamic real-time profiling timelines, historical run diagnostics comparison, exportable diagnostics report.
- **Missing Apex Services:** `DADiagnosticsService.getPipelineTelemetry`.
- **Missing DTOs:** Historical execution latency telemetry DTO.
- **Missing UI Elements:** Visual latency waterfall chart, memory utilization gauge.
- **Missing Navigation Flows:** Direct link from high-cyclomatic SCC cards to Subway/Refactoring views.
- **Missing Error Handling:** Division-by-zero safeguards for 0-node/0-edge empty graph states.
- **Missing Security Controls:** Read access verification on telemetry objects.
- **Missing Tests:** Jest unit tests verifying metric formulas against benchmark fixtures (BQC, CST, PBIM).
- **Technical Risks:** Floating point rounding divergences between JavaScript V8 and Apex `Decimal`.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 5: HotspotPanel.tsx
- **React Source:** `explorer/src/components/HotspotPanel.tsx` (432 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView`
- **Current Estimated Completion %:** 75%
- **React Source Analysis:** Identifies high-risk architectural hotspots combining cyclomatic complexity, churn, fan-in/fan-out coupling, and defect concentration into a composite risk score (0-100).
- **Salesforce Implementation Analysis:** `daHotspotsView` ranks nodes by composite risk index, provides metric bars (Churn, Fan-in, Fan-out, Complexity), and dispatches node selection.
- **Missing Functionality:** Custom metric weighting configuration slider, threshold alerting, historical churn trend sparklines.
- **Missing Apex Services:** Hotspot calculation weighting preference persistence service.
- **Missing DTOs:** Hotspot weighting profile DTO.
- **Missing UI Elements:** Metric weight adjustment drawer, sparkline trendline SVGs.
- **Missing Navigation Flows:** "Simulate Refactoring" one-click action linking directly to Refactoring Simulation Panel.
- **Missing Error Handling:** Fallback when churn metadata is unavailable from external analyzer.
- **Missing Security Controls:** FLS checks on churn and risk score fields.
- **Missing Tests:** Ranking order and score calculation Jest tests.
- **Technical Risks:** Performance degradation when calculating percentiles across >50,000 nodes.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 6: FeatureMatrixPanel.tsx
- **React Source:** `explorer/src/components/FeatureMatrixPanel.tsx` (677 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixView`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Virtualized matrix displaying cross-feature dependencies, coupling heatmaps, domain boundaries, cluster grouping, sorting by coupling intensity, and symmetric cell inspection.
- **Salesforce Implementation Analysis:** `daMatrixView` provides a CSS-grid based dependency matrix with cell shading and row/column headers.
- **Missing Functionality:** Virtualized scrolling for matrices > 50x50, clustering reordering algorithms (Barycenter/Cuthill-McKee), asymmetric edge type filtering, and matrix zoom controls.
- **Missing Apex Services:** Server-side sparse matrix aggregation service for massive graphs.
- **Missing DTOs:** Sparse matrix coordinate DTO (`MatrixCellDTO`).
- **Missing UI Elements:** Minimap matrix navigator, sort order dropdown (Alpha, Coupling, Domain), zoom level controls.
- **Missing Navigation Flows:** Dual-node selection dispatch (Source + Target) to Investigation Drawer.
- **Missing Error Handling:** Virtualization bounds checks and NaN dimension fallbacks.
- **Missing Security Controls:** FLS validation for sensitive class metadata inspection.
- **Missing Tests:** Virtualized windowing Jest tests, cell click coordinate dispatch tests.
- **Technical Risks:** DOM node limits in Salesforce LWC without efficient virtual scrolling.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 7: ArchitectureDNABarcode.tsx
- **React Source:** `explorer/src/components/ArchitectureDNABarcode.tsx` (553 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode`
- **Current Estimated Completion %:** 75%
- **React Source Analysis:** Visualizes architectural DNA as vertical spectral bands representing layers, roles, stability metrics, and defect densities. Supports hover scrubbing, band filtering, and synchronous graph highlighting.
- **Salesforce Implementation Analysis:** `daArchitectureDnaBarcode` renders SVG/HTML bands colored by layer and role with hover tooltips and selection dispatch.
- **Missing Functionality:** Interactive multi-band scrubbing/selection brush, spectral comparative overlay between two analysis runs, audio accessibility cues.
- **Missing Apex Services:** None (client-side rendering from graph payload).
- **Missing DTOs:** Spectral band aggregate DTO.
- **Missing UI Elements:** Range brush selector, layer filter toggles, export barcode SVG button.
- **Missing Navigation Flows:** Brush range synchronization with Graph View viewport filtering.
- **Missing Error Handling:** Empty spectrum fallback on unclassified node layers.
- **Missing Security Controls:** SVG injection sanitization for dynamic fill attributes.
- **Missing Tests:** SVG band count Jest tests against standard benchmark payloads.
- **Technical Risks:** Heavy SVG DOM nodes causing frame drops during scrub interactions.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 8: ProjectSelector.tsx
- **React Source:** `explorer/src/components/ProjectSelector.tsx` (157 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector`
- **Current Estimated Completion %:** 75%
- **React Source Analysis:** Dropdown and modal selector allowing switching between analyzed codebases, displaying analysis timestamp, node/edge summary badges, and search filter.
- **Salesforce Implementation Analysis:** `daProjectSelector` queries `DA_Project__c` records via Apex, renders an SLDS combobox, and fires `projectchange` custom events.
- **Missing Functionality:** Project creation trigger modal, project archiving/deletion actions, tag filtering, recent projects quick-list.
- **Missing Apex Services:** `DAProjectService.getRecentProjects`, `DAProjectService.archiveProject`.
- **Missing DTOs:** Project summary DTO with run statistics.
- **Missing UI Elements:** Project status indicator (Active, Analyzing, Ingesting, Failed), new project action button.
- **Missing Navigation Flows:** Direct link to Project Manager and Analysis History views.
- **Missing Error Handling:** Offline/empty state when no `DA_Project__c` records exist in the org.
- **Missing Security Controls:** Record-level sharing validation; enforcement of `WITH USER_MODE`.
- **Missing Tests:** Inactive project filtering tests, combobox change event dispatch Jest tests.
- **Technical Risks:** Inconsistent SOQL ordering causing non-deterministic project list displays.
- **Recommended Completion Order:** Step 3 (Core Shell milestone).

---

### Item 9: SubwayPanel.tsx
- **React Source:** `explorer/src/components/SubwayPanel.tsx` (285 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Transit-map style visualization of architectural layers and dependency pipelines. Renders stations (nodes) and transit lines (dependency flows) with transfer points (bridges/adapters).
- **Salesforce Implementation Analysis:** `daSubwayView` generates multi-track SVG lines and station circles with layer grouping.
- **Missing Functionality:** Station transfer point badges, line route collision avoidance, station search highlight, interactive line toggle (show/hide specific subsystem lines).
- **Missing Apex Services:** None (computed in LWC layout engine).
- **Missing DTOs:** Subway transit route DTO.
- **Missing UI Elements:** Line legend checkboxes, station search bar, track orientation toggle (Horizontal/Vertical).
- **Missing Navigation Flows:** Station click navigating to component detail in Investigation Drawer.
- **Missing Error Handling:** Path curvature fallback on disconnected station clusters.
- **Missing Security Controls:** None.
- **Missing Tests:** Route geometry calculation Jest tests.
- **Technical Risks:** Complex SVG bezier curve computations impacting render performance on mobile/tablet viewports.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 10: ArchitectureTreemapPanel.tsx
- **React Source:** `explorer/src/components/ArchitectureTreemapPanel.tsx` (441 lines)
- **Salesforce Counterpart:** `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Nested hierarchical treemap representing packages, namespaces, classes, and methods. Tile area represents LOC/complexity; color represents risk/findings count. Supports drill-down zoom.
- **Salesforce Implementation Analysis:** `daTreemapView` computes squarified treemap bounding boxes and renders colored rectangular tiles.
- **Missing Functionality:** Multi-level hierarchical drill-down zoom (into folder/class), breadcrumb hierarchy navigation bar, dynamic metric re-binding (LOC vs Churn vs Findings).
- **Missing Apex Services:** None (client-side hierarchical layout).
- **Missing DTOs:** Hierarchical tree node DTO.
- **Missing UI Elements:** Treemap metric selector dropdown, zoom-out breadcrumb bar, tile label clipping/hiding at small zoom levels.
- **Missing Navigation Flows:** Tile double-click to drill into package; tile single-click to select node.
- **Missing Error Handling:** Non-positive area dimension guard; bounding box aspect ratio clamping.
- **Missing Security Controls:** None.
- **Missing Tests:** Squarified treemap layout algorithm Jest tests.
- **Technical Risks:** High recursion depth in hierarchy trees exceeding call stack limits.
- **Recommended Completion Order:** Step 5 (Core Analytics milestone).

---

### Item 11: Sidebar.tsx
- **React Source:** `explorer/src/components/Sidebar.tsx` (703 lines)
- **Salesforce Counterpart:** Integrated into `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell`
- **Current Estimated Completion %:** 25%
- **React Source Analysis:** Provides collapsible workspace navigation, component inventory tree, layer filter checkboxes, tag filters, quick search, and saved views.
- **Salesforce Implementation Analysis:** Rudimentary navigation buttons and container list embedded directly in `daAppShell.html`.
- **Missing Functionality:** Standalone `daSidebar` LWC component, searchable component inventory tree, quick-filter toggles, collapsible drawer state persistence.
- **Missing Apex Services:** User sidebar collapse preference persistence in `DA_User_Preference__c`.
- **Missing DTOs:** Component inventory item DTO.
- **Missing UI Elements:** Expand/collapse button, search input, layer badge counters, favorites section.
- **Missing Navigation Flows:** Tree item click driving graph highlight and investigation focus.
- **Missing Error Handling:** Long text truncation and overflow scrolling.
- **Missing Security Controls:** Respect user permissions on restricted architectural layers.
- **Missing Tests:** Sidebar collapse/expand Jest unit tests.
- **Technical Risks:** Tight coupling with `daAppShell` preventing reuse in detached panels.
- **Recommended Completion Order:** Step 3 (Core Shell milestone).

---

### Item 12: Header.tsx
- **React Source:** `explorer/src/components/Header.tsx` (708 lines)
- **Salesforce Counterpart:** Integrated into `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell`
- **Current Estimated Completion %:** 25%
- **React Source Analysis:** Top application bar featuring project branding, active project selector, global search bar, analysis run picker, compare action trigger, command palette shortcut button, and user profile settings.
- **Salesforce Implementation Analysis:** Basic header container in `daAppShell` containing title and `daProjectSelector`.
- **Missing Functionality:** Dedicated `daHeader` LWC component, global search input with autocomplete, compare mode toggle, help modal trigger, export dropdown menu.
- **Missing Apex Services:** Global fuzzy search Apex service (`DAGraphController.searchElements`).
- **Missing DTOs:** Global search result DTO.
- **Missing UI Elements:** Search autocomplete dropdown, keyboard shortcut hints, notifications badge.
- **Missing Navigation Flows:** Global search item selection jumping directly to target node.
- **Missing Error Handling:** Search debounce rate-limiting and query timeout handling.
- **Missing Security Controls:** FLS checks on searchable metadata entities.
- **Missing Tests:** Search input debounce Jest tests.
- **Technical Risks:** High-frequency Apex search calls exceeding org governor limits.
- **Recommended Completion Order:** Step 3 (Core Shell milestone).

---

### Item 13: GraphControls.tsx
- **React Source:** `explorer/src/components/GraphControls.tsx` (421 lines)
- **Salesforce Counterpart:** Integrated into `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Floating or docked toolbar controlling zoom in/out, fit to screen, layout algorithm selection (Arch, Orbit, Constellation, Sankey), edge visibility toggles, layout recalculation, and reset.
- **Salesforce Implementation Analysis:** Toolbar buttons in `daGraphViewer.html` for Zoom In, Zoom Out, Fit, and Layout Mode selection.
- **Missing Functionality:** Layout parameter configuration sliders (node repulsion, edge elasticity), auto-rotate toggle, physics simulation pause/resume, high-DPI screenshot export.
- **Missing Apex Services:** None (client-side Cytoscape controls).
- **Missing DTOs:** Layout configuration settings DTO.
- **Missing UI Elements:** Slider popovers, export format dropdown (PNG, JPEG, JSON), layout presets.
- **Missing Navigation Flows:** Layout change event broadcasting to sibling components.
- **Missing Error Handling:** Zoom level clamping (min 0.1x, max 5.0x).
- **Missing Security Controls:** None.
- **Missing Tests:** Zoom button event handling Jest unit tests.
- **Technical Risks:** Rapid layout switching causing race conditions in coordinate calculation.
- **Recommended Completion Order:** Step 4 (Core Graph milestone).

---

### Item 14: GraphLegend.tsx
- **React Source:** `explorer/src/components/GraphLegend.tsx` (116 lines)
- **Salesforce Counterpart:** Embedded in `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer`
- **Current Estimated Completion %:** 25%
- **React Source Analysis:** Floating interactive legend mapping node colors to layers (Presentation, Business, Data, Utility), edge styles to dependency types (Lookup, Master-Detail, Triggers, Instantiates), and node shapes to component roles. Allows toggling layer visibility by clicking legend items.
- **Salesforce Implementation Analysis:** Static color swatch indicators in `daGraphViewer.html`.
- **Missing Functionality:** Interactive click-to-filter layer visibility, edge type legend badges, count badges next to each layer name, collapsible legend drawer.
- **Missing Apex Services:** None.
- **Missing DTOs:** Legend schema mapping DTO.
- **Missing UI Elements:** Filter checkbox toggles, legend collapse handle, symbol glyphs.
- **Missing Navigation Flows:** Legend item click triggering filter dispatch to `daFilterSchema`.
- **Missing Error Handling:** Fallback color swatches for unmapped custom layers.
- **Missing Security Controls:** None.
- **Missing Tests:** Legend click filter toggle Jest tests.
- **Technical Risks:** Desynchronization between active filter schema and legend checked states.
- **Recommended Completion Order:** Step 4 (Core Graph milestone).

---

### Item 15: ViewModeSwitcher.tsx
- **React Source:** `explorer/src/components/ViewModeSwitcher.tsx` (218 lines)
- **Salesforce Counterpart:** Tab header inside `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell`
- **Current Estimated Completion %:** 50%
- **React Source Analysis:** Segmented controller or tab strip switching between 18 distinct workspace views across 4 categories: Topology, Architecture, Metrics, and Evolution. Supports keyboard arrow navigation and view state persistence.
- **Salesforce Implementation Analysis:** SLDS button group or tabset in `daAppShell` with only 3 options: "Graph", "Matrix", "Findings".
- **Missing Functionality:** Full 18-view options grouped by category, icon badges indicating active findings/hotspots per view, keyboard accessible tab navigation, user default view preference saving.
- **Missing Apex Services:** User default view mode persistence in `DA_User_Preference__c`.
- **Missing DTOs:** View registration metadata DTO.
- **Missing UI Elements:** Categorized view dropdown menu, indicator badges on view tabs.
- **Missing Navigation Flows:** View switch dispatch with deep URL synchronization (`NavigationMixin`).
- **Missing Error Handling:** Fallback to default "Graph" view if requested mode is invalid or unsupported.
- **Missing Security Controls:** Profile-based view authorization checks.
- **Missing Tests:** Tab switching Jest tests, keyboard navigation accessibility tests.
- **Technical Risks:** Loading heavy view bundles simultaneously causing browser memory spikes.
- **Recommended Completion Order:** Step 3 (Core Shell milestone).

---

## 3. Recommended Completion Order & Implementation Roadmap

1. **Milestone 1: Core Shell & Navigation (P0/P1)**
   - Components: `daAppShell`, `daHeader`, `daSidebar`, `daProjectSelector`, `daViewModeSwitcher`
   - Goal: Establish full workspace shell, clean event dispatch, project switching, and tabbed view navigation.
2. **Milestone 2: Graph Canvas & Controls (P1)**
   - Components: `daGraphViewer`, `daGraphControls`, `daGraphLegend`, `daLayoutEngine`
   - Goal: Complete Cytoscape canvas integration, layout switching, hover cards, and position persistence.
3. **Milestone 3: Core Analytical Views (P2)**
   - Components: `daFindingsView`, `daDiagnosticsView`, `daHotspotsView`, `daMatrixView`, `daArchitectureDnaBarcode`, `daSubwayView`, `daTreemapView`
   - Goal: Elevate all 7 analytical views from 50-75% to 100% feature parity with complete unit test coverage.
4. **Milestone 4: Portfolio & Collaboration Workflows (P4)**
   - Components: `daAnalysisHistory`, `daCompareView`, `daProjectDashboard`, `daProjectManager`, `daInvestigationDrawer`
   - Goal: Migrate top 5 ready-for-conversion features with full Apex services and persistence.

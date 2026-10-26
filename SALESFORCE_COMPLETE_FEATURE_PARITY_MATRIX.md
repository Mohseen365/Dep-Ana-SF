# Salesforce Complete Feature Parity Matrix

This document provides a feature-by-feature evaluation of all 18 view modes, 4 layout algorithms, shared UI overlays, state management, analysis operations, and data persistence layers between the React Dependency Analyzer application (`explorer/src/`), the Node.js engine (`scripts/`), and the Salesforce POC (`scratch/salesforce-poc/`).

## 1. Application View Modes (18 Documented Views)

| Feature ID | Feature Name | Known Source Files | Salesforce Counterpart Path | Feature Parity Status | Missing Behavior / Gap Summary | Required Acceptance Criteria |
|---|---|---|---|---|---|---|
| VIEW-01 | Dashboard | `ProjectDashboard.tsx` | `daGraphViewer` (partial) | **SCAFFOLDED ONLY** | LWC renders basic graph canvas, but executive KPI summary cards, risk breakdown charts, and health score gauges are missing. | Dashboard LWC displays project KPIs, total nodes/edges, risk score distribution, and layer counts. |
| VIEW-02 | Compare | `ComparePanel.tsx`, `compare.ts` | None | **NOT MIGRATED** | Snapshot comparison panel showing added, removed, and modified nodes/edges between analysis runs is missing in LWC. | LWC permits selecting two analysis runs and highlights node/edge deltas in red/green/orange. |
| VIEW-03 | History | `AnalysisHistoryPanel.tsx`, `projectHistory.ts` | None | **NOT MIGRATED** | Chronological run history table, snapshot activation, and health trend graphs are missing in LWC. | LWC renders history timeline of `DA_Analysis_Run__c` records with interactive activation. |
| VIEW-04 | Interactive Graph | `GraphView.tsx`, `graph-builder.ts` | `daGraphViewer` | **PARTIALLY MIGRATED** | Cytoscape rendering and chunked payload loading are implemented; orbit controls, multi-select, and deep links are missing. | Full Cytoscape interaction with drag, zoom/pan, hover card tooltips, node selection, and layout switching. |
| VIEW-05 | Subway Map | `SubwayPanel.tsx`, `subway-adapter.ts` | None | **NOT MIGRATED** | Metro-line style architectural layer routing and station filter panel missing in LWC. | Subway layout renders nodes on horizontal layer tracks with color-coded directional lines. |
| VIEW-06 | Constellation | `DependencyConstellationPanel.tsx`, `constellation-adapter.ts` | None | **NOT MIGRATED** | Star constellation cluster grouping and cluster expansion interaction missing in LWC. | Constellation layout clusters components into star systems with expandable cluster boundaries. |
| VIEW-07 | Tree | `FeatureTreePanel.tsx` | None | **NOT MIGRATED** | Hierarchical collapsible package and component tree view missing in LWC. | Tree view panel displays collapsible folder/package hierarchy synced with selection. |
| VIEW-08 | Treemap | `ArchitectureTreemapPanel.tsx`, `treemap-adapter.ts` | None | **NOT MIGRATED** | Squarified treemap visualizer proportional to component size/risk missing in LWC. | Treemap layout computes squarified bounding boxes colored by risk score. |
| VIEW-09 | Coupling Matrix | `FeatureMatrixPanel.tsx`, `matrix-adapter.ts` | None | **NOT MIGRATED** | Direct directional coupling matrix grid viewer missing in LWC. | Matrix grid renders component-to-component dependency counts with row/column highlighting. |
| VIEW-10 | Coupling Heatmap | `CouplingHeatmapPanel.tsx` | None | **NOT MIGRATED** | Coupling intensity heatmap matrix highlighting high-risk coupling hotspots missing in LWC. | Heatmap view color-codes matrix cells based on fan-in/fan-out coupling density. |
| VIEW-11 | Dependency River | `DependencyRiverPanel.tsx`, `sankey-adapter.ts` | None | **NOT MIGRATED** | Sankey flow diagram representing inter-layer dependency flow missing in LWC. | River view displays proportional Sankey streams between architectural layers. |
| VIEW-12 | Architecture DNA | `ArchitectureDNABarcode.tsx`, `dna-adapter.ts` | None | **NOT MIGRATED** | Multi-trait DNA barcode visualizer highlighting structural risk signals missing in LWC. | Barcode panel displays color-coded trait bands for each component. |
| VIEW-13 | Component Profile | `FeatureProfilePanel.tsx`, `profile-adapter.ts` | None | **NOT MIGRATED** | Detailed component inspector with fan-in/fan-out metrics, tests, and dependencies missing in LWC. | Profile drawer displays full node metadata, dependency list, dependent list, and risk breakdown. |
| VIEW-14 | Health Radar | `RadarPanel.tsx`, `radar-adapter.ts` | None | **NOT MIGRATED** | Polygon radar chart displaying normalized architectural health dimensions missing in LWC. | Radar view plots 6 health axes (cohesion, coupling, complexity, testability, debt, security). |
| VIEW-15 | Four-Direction Expansion | `FourDirectionPanel.tsx`, `four-direction-adapter.ts` | None | **NOT MIGRATED** | 4-way upstream, downstream, peer, and test traversal expansion panel missing in LWC. | Expansion view allows expanding graph 1..N hops up, down, sideways, or to tests. |
| VIEW-16 | Findings | `FindingsPanel.tsx`, `finding.ts` | None | **NOT MIGRATED** | Architecture smells, violations, and recommendation grid panel missing in LWC. | Findings grid lists `DA_Finding__c` records with severity filtering and node highlighting. |
| VIEW-17 | Hotspots | `HotspotPanel.tsx`, `hotspots.ts` | None | **NOT MIGRATED** | Ranked list of critical risk hotspots and coupling bottleneck components missing in LWC. | Hotspot panel ranks top 10% highest-risk components with jump-to-node action. |
| VIEW-18 | Diagnostics | `DiagnosticsPanel.tsx` | None | **NOT MIGRATED** | Circular dependency cycle detection and unresolved reference diagnostic panel missing in LWC. | Diagnostics panel lists cycles and unresolved imports with single-click edge selection. |

## 2. Architecture Layout Modes (4 Documented Layouts)

| Layout Mode | Known Source Files | Salesforce Counterpart Path | Parity Status | Missing Behavior / Gap Description |
|---|---|---|---|---|
| Hierarchical Layout | `architecture-layout.ts`, `graph-layout.ts` | `daGraphViewer` (partial) | **PARTIALLY MIGRATED** | Basic grid/cose layout available in Cytoscape; deterministic hierarchical layer positioning missing. |
| Hybrid Layout | `architecture-layout.ts` | None | **NOT MIGRATED** | Cluster-aware hybrid layout combining layer hierarchy and component orbits missing in LWC. |
| Orbit Layout | `orbit-layout.ts` | None | **NOT MIGRATED** | Focal node positioning with orbital concentric ring positioning for satellites missing in LWC. |
| Constellation Layout | `constellation-layout.ts` | None | **NOT MIGRATED** | Spatial bounding-box positioning for isolated multi-cluster constellations missing in LWC. |

## 3. Shared UI, Overlays & Interactions

| UI Overlay / Workflow | Known Source Files | Salesforce Counterpart Path | Parity Status | Missing Behavior / Gap Description |
|---|---|---|---|---|
| Investigation Drawer | `InvestigationDrawer.tsx` | None | **NOT MIGRATED** | Node inspection side-drawer with tabbed evidence views missing in LWC. |
| Refactor Handoff Modal | `RefactorHandoffModal.tsx` | None | **NOT MIGRATED** | Exporting refactoring proposals to external task tracking missing in LWC. |
| Command Palette | `CommandPalette.tsx` | None | **NOT MIGRATED** | Quick command search palette (`Cmd+K`) for fast navigation missing in LWC. |
| Refactoring Simulation | `RefactoringSimulationPanel.tsx` | None | **NOT MIGRATED** | Interactive "what-if" dependency deletion simulator missing in LWC. |
| Keyboard Shortcuts | `KeyboardShortcutsModal.tsx` | None | **NOT MIGRATED** | Keyboard shortcut help overlay missing in LWC. |

## 4. Analysis & Governance Operations (`scripts/`)

| Analysis Operation | Known Source Files | Salesforce Counterpart Path | Parity Status | Disposition Rationale |
|---|---|---|---|---|
| Graph Directory Ingestion | `dependency-analyzer.cjs` | `DAGraphIngestionService.cls` | **PARTIALLY MIGRATED** | Node CLI parses ASTs and generates JSON; Apex service ingests JSON into Salesforce. |
| Architecture Health | `architecture-health.cjs` | None | **NOT MIGRATED** | External analysis operation retained outside Salesforce or implemented via scheduled Apex. |
| Bottleneck Detector | `bottleneck-detector.cjs` | None | **NOT MIGRATED** | Retained in Node CLI / External Analysis Service due to CPU/heap bounds. |
| Data Impact Tracing | `data-impact.cjs` | None | **NOT MIGRATED** | Retained in Node CLI / External Analysis Service. |
| Refactoring Sequencer | `refactoring-sequencer.cjs` | None | **NOT MIGRATED** | Retained in Node CLI / External Analysis Service. |

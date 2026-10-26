# Salesforce Symbol-Level Migration Matrix

This matrix provides a symbol-by-symbol audit of exported functions, classes, components, hooks, algorithms, and CLI entry points across the React Dependency Analyzer application (`explorer/src/`), Node.js analysis engine (`scripts/`), and Salesforce POC (`scratch/salesforce-poc/`).

## 1. Application UI & View Components (`explorer/src/components/workspace/`)

| Source File | Exported Symbol | Responsibility | Callers / Dependencies | Salesforce Counterpart Path | Parity Status | Missing Behavior / Gap Description | Proposed Destination Path |
|---|---|---|---|---|---|---|---|
| `ProjectDashboard.tsx` | `ProjectDashboard` | Executive summary, KPI counts, health score, risk charts, layer breakdown | Workspace routing | `daGraphViewer` (partial scaffold) | **SCAFFOLDED ONLY** | KPI cards, risk distribution charts, and interactive filtering are missing in LWC | `force-app/main/default/lwc/daDashboardViewer/` |
| `GraphView.tsx` | `GraphView` | Interactive Cytoscape canvas, node/edge selection, hover cards, zoom/pan | Workspace router, Cytoscape.js | `daGraphViewer` | **PARTIALLY MIGRATED** | Cytoscape graph rendering migrated; orbit controls, deep links, multi-select toolbar missing | `force-app/main/default/lwc/daGraphViewer/` |
| `ComparePanel.tsx` | `ComparePanel` | Diff viewer for comparing two snapshot runs (added, removed, modified) | Workspace router, `compare.ts` | None | **NOT MIGRATED** | Snapshot diff visualizer and delta highlight panel not implemented in LWC | `PROPOSED — NOT PRESENT (lwc/daComparePanel)` |
| `AnalysisHistoryPanel.tsx` | `AnalysisHistoryPanel` | Chronological run history table, snapshot activation, trend lines | Workspace router, `projectHistory.ts` | None | **NOT MIGRATED** | Analysis run history panel and timeline missing in LWC | `PROPOSED — NOT PRESENT (lwc/daAnalysisHistoryPanel)` |
| `SubwayPanel.tsx` | `SubwayPanel` | Metro line architectural layer visualization and station filtering | Workspace router, `subway-adapter.ts` | None | **NOT MIGRATED** | Layer station layout algorithm and UI missing in LWC | `PROPOSED — NOT PRESENT (lwc/daSubwayPanel)` |
| `DependencyConstellationPanel.tsx` | `DependencyConstellationPanel` | Cluster-based star system graph layout and expanding clusters | Workspace router, `constellation-adapter.ts` | None | **NOT MIGRATED** | Cluster grouping logic and UI missing in LWC | `PROPOSED — NOT PRESENT (lwc/daConstellationPanel)` |
| `FeatureTreePanel.tsx` | `FeatureTreePanel` | Collapsible tree view of application components and packages | Workspace router | None | **NOT MIGRATED** | Tree view component missing in LWC | `PROPOSED — NOT PRESENT (lwc/daTreePanel)` |
| `ArchitectureTreemapPanel.tsx` | `ArchitectureTreemapPanel` | Squarified treemap proportional to LOC/complexity and health risk | Workspace router, `treemap-adapter.ts` | None | **NOT MIGRATED** | Squarified geometry renderer missing in LWC | `PROPOSED — NOT PRESENT (lwc/daTreemapPanel)` |
| `FeatureMatrixPanel.tsx` | `FeatureMatrixPanel` | Grid coupling matrix showing direct dependency counts | Workspace router, `matrix-adapter.ts` | None | **NOT MIGRATED** | Coupling matrix grid viewer missing in LWC | `PROPOSED — NOT PRESENT (lwc/daMatrixPanel)` |
| `CouplingHeatmapPanel.tsx` | `CouplingHeatmapPanel` | Heatmap intensity matrix highlighting high-coupling hotspots | Workspace router | None | **NOT MIGRATED** | Heatmap visualization grid missing in LWC | `PROPOSED — NOT PRESENT (lwc/daHeatmapPanel)` |
| `DependencyRiverPanel.tsx` | `DependencyRiverPanel` | Sankey diagram showing data flow across architectural layers | Workspace router, `sankey-adapter.ts` | None | **NOT MIGRATED** | Sankey node/link flow renderer missing in LWC | `PROPOSED — NOT PRESENT (lwc/daRiverPanel)` |
| `ArchitectureDNABarcode.tsx` | `ArchitectureDNABarcode` | Architectural trait DNA barcode with risk signals | Workspace router, `dna-adapter.ts` | None | **NOT MIGRATED** | Barcode trait visualizer missing in LWC | `PROPOSED — NOT PRESENT (lwc/daDNABarcodePanel)` |
| `FeatureProfilePanel.tsx` | `FeatureProfilePanel` | Detailed component profile showing fan-in/fan-out and metrics | Workspace router, `profile-adapter.ts` | None | **NOT MIGRATED** | Component detail inspector missing in LWC | `PROPOSED — NOT PRESENT (lwc/daProfilePanel)` |
| `RadarPanel.tsx` | `RadarPanel` | Radar chart evaluating 6 architectural health dimensions | Workspace router, `radar-adapter.ts` | None | **NOT MIGRATED** | Normalized radar polygon renderer missing in LWC | `PROPOSED — NOT PRESENT (lwc/daRadarPanel)` |
| `FourDirectionPanel.tsx` | `FourDirectionPanel` | 4-way upstream/downstream/peer/test expansion view | Workspace router, `four-direction-adapter.ts` | None | **NOT MIGRATED** | Multi-hop directional traversal inspector missing in LWC | `PROPOSED — NOT PRESENT (lwc/daFourDirectionPanel)` |
| `FindingsPanel.tsx` | `FindingsPanel` | Architecture smells, violations, and recommendation grid | Workspace router, `finding.ts` | None | **NOT MIGRATED** | Findings data table with filtering missing in LWC | `PROPOSED — NOT PRESENT (lwc/daFindingsPanel)` |
| `HotspotPanel.tsx` | `HotspotPanel` | Ranked list of critical risk hotspots and coupling bottlenecks | Workspace router, `hotspots.ts` | None | **NOT MIGRATED** | Hotspot ranking panel missing in LWC | `PROPOSED — NOT PRESENT (lwc/daHotspotPanel)` |
| `DiagnosticsPanel.tsx` | `DiagnosticsPanel` | Circular dependencies, unresolved references, and diagnostics | Workspace router | None | **NOT MIGRATED** | Diagnostic cycle & error table missing in LWC | `PROPOSED — NOT PRESENT (lwc/daDiagnosticsPanel)` |

## 2. Shared Libraries & Layout Algorithms (`explorer/src/lib/`)

| Source File | Exported Symbol | Responsibility | Callers / Dependencies | Salesforce Counterpart Path | Parity Status | Missing Behavior / Gap Description | Proposed Destination Path |
|---|---|---|---|---|---|---|---|
| `graph-builder.ts` | `buildGraphData`, `extractNodes` | Transforms raw snapshot JSON into Cytoscape-compatible elements | `GraphView.tsx` | `daGraphViewer.js` | **PARTIALLY MIGRATED** | Basic node/edge extraction ported to LWC; advanced compound layout transforms missing | `force-app/main/default/lwc/daGraphViewer/` |
| `architecture-layout.ts` | `computeArchitectureLayout` | Calculates hierarchical layer-based node layout | `graph-layout.ts` | None | **NOT MIGRATED** | Hierarchical position calculation missing in LWC client algorithms | `PROPOSED — NOT PRESENT (lwc/daLayoutEngine)` |
| `orbit-layout.ts` | `computeOrbitLayout` | Calculates focal component and satellite orbit positions | `graph-layout.ts` | None | **NOT MIGRATED** | Satellite orbital trigonometry missing in LWC | `PROPOSED — NOT PRESENT (lwc/daLayoutEngine)` |
| `constellation-layout.ts` | `computeConstellationLayout` | Computes multi-cluster constellation spatial geometry | `graph-layout.ts` | None | **NOT MIGRATED** | Multi-cluster bounding box positioning missing in LWC | `PROPOSED — NOT PRESENT (lwc/daLayoutEngine)` |
| `projectState.ts` | `loadProjectState`, `saveProjectState` | Manages per-project active views, selections, zoom, filters | Workspace components | `DA_User_Preference__c` | **PARTIALLY MIGRATED** | Custom object schema exists; LWC state hydration and URL synchronization missing | `force-app/main/default/objects/DA_User_Preference__c` |
| `refactoring-simulation.ts` | `simulateRefactoring` | Evaluates hypothetical dependency removal impact | `RefactoringSimulationPanel.tsx` | None | **NOT MIGRATED** | Simulation algorithm missing in LWC | `PROPOSED — NOT PRESENT (lwc/daRefactoringEngine)` |

## 3. Node.js Analysis Engine & CLI Scripts (`scripts/`)

| Source File | Exported Symbol | Responsibility | Callers / Dependencies | Salesforce Counterpart Path | Parity Status | Missing Behavior / Gap Description | Proposed Destination Path |
|---|---|---|---|---|---|---|---|
| `dependency-analyzer.cjs` | `runAnalysis`, CLI main | Scans source code directory, parses ASTs, builds graph JSON | Root package.json | `DAGraphIngestionService.cls` | **PARTIALLY MIGRATED** | Ingestion service receives graph JSON in Salesforce; directory file scanner retained in CLI | `RETAINED OUTSIDE SALESFORCE (External Analysis Service)` |
| `architecture-health.cjs` | `evaluateHealth` | Calculates overall health score, modularity, and cohesion | Change gates | None | **NOT MIGRATED** | Health score formula needs Apex or Node analysis service implementation | `RETAINED OUTSIDE SALESFORCE (External Analysis Service)` |
| `bottleneck-detector.cjs` | `detectBottlenecks` | Identifies central bottleneck nodes with high fan-in/fan-out | Architecture diff | None | **NOT MIGRATED** | Bottleneck detection algorithm missing in Apex | `RETAINED OUTSIDE SALESFORCE (External Analysis Service)` |
| `data-impact.cjs` | `analyzeDataImpact` | Traces database schema / object change blast radius | Governance gates | None | **NOT MIGRATED** | Schema impact tracing missing in Apex | `RETAINED OUTSIDE SALESFORCE (External Analysis Service)` |
| `refactoring-sequencer.cjs` | `sequenceRefactoring` | Generates ordered plan for decoupling dependencies | Change management | None | **NOT MIGRATED** | Dependency ordering sequencer missing in Apex | `RETAINED OUTSIDE SALESFORCE (External Analysis Service)` |

## 4. Salesforce POC Apex & LWC Implementation (`scratch/salesforce-poc/`)

| Salesforce File | Exported Symbol | Responsibility | Callers / Dependencies | Parity Status | Evidence & Verification |
|---|---|---|---|---|---|
| `DAGraphController.cls` | `DAGraphController` | Controller providing `@AuraEnabled` methods for chunk loading and project metadata | LWC components | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| `DAGraphChunkService.cls` | `DAGraphChunkService` | Handles paginated retrieval and chunk reassembly of graph payloads | `DAGraphController` | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| `DAGraphIngestionService.cls` | `DAGraphIngestionService` | Ingests JSON payloads into `DA_Project__c`, `DA_Analysis_Run__c`, and `DA_Graph_Chunk__c` | Apex / Ingestion API | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| `DAGraphDTO.cls` | `DAGraphDTO` | Data transfer objects matching LWC JS payloads | `DAGraphController` | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| `daGraphViewer` | `daGraphViewer` | Main LWC visualizer wrapping Cytoscape.js and loading chunked payloads | Salesforce App Page | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |
| `daGraphPayloadLoader` | `daGraphPayloadLoader` | LWC helper module managing paginated SOQL chunk fetches and reassembly | `daGraphViewer` | **MIGRATED AND VERIFIED** | Verified passing via `node scratch/salesforce-poc/tests/run-poc-tests.cjs` |

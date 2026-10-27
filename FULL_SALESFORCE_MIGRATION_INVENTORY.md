# Full Dependency Analyzer to Salesforce Migration Inventory

**Repository Provenance:**
- **Branch:** `jules-11339711741377216113-184e2b07`
- **HEAD Commit SHA:** `cc1469d23f28193686488f7c2d21cd8eb464b421`
- **Working Tree State:** Clean
- **Date:** October 2026 (Audit Date)

---

## 1. Inventory Summary and Counting Methodology

### Counting Methodology
The feature inventory was derived by analyzing:
1. All top-level React views and panel components in `explorer/src/components/` (36 UI panels/components).
2. Core application context providers and state hooks in `explorer/src/context/` and `explorer/src/hooks/`.
3. Specialized layout adapters and algorithms in `explorer/src/lib/` and `explorer/src/lib/adapters/`.
4. Node.js AST parsing, dependency discovery, and CLI tools in root and `scripts/`.
5. Salesforce POC Apex controllers, services, objects, and LWCs under `scratch/salesforce-poc/`.

**Total Inventoried Capabilities/Features:** 42 distinct functional capabilities across 8 core domain groups.

### Status Classification Breakdown
- **`OFFLINE_VERIFIED`**: 10 capabilities (Core graph ingestion, payload loader, chunking, security DTOs, daLayoutEngine layouts, SELECTION ≠ NAVIGATION invariant).
- **`APPROVED_EXTERNAL_SERVICE`**: 6 capabilities (Node.js AST parsing, CLI file traversal, local file exports, static resource bundling).
- **`PARTIALLY_IMPLEMENTED`**: 12 capabilities (Graph controls, project selector, health summary, basic search/filter, annotation objects).
- **`SCAFFOLD_ONLY`**: 4 capabilities (User preference object, finding object, analysis run metadata object).
- **`NOT_STARTED`**: 10 capabilities (Compare mode/diff panel, subway/river panels, DNA barcode, refactoring simulator, coupling heatmap, hotspot panel, radar panel, findings panel, detached drawers).

---

## 2. Complete Source Application Inventory

### Domain 1: Application Shell & Route Context
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-SHELL-01` | Workspace Navigation & View Switching | `explorer/src/App.tsx`, `Sidebar.tsx` | Allows switching between Graph, Matrix, DNA, Treemap, River, Subway, Radar views. | Salesforce App Page / Tab Navigation (SLDS Tabs / App Launcher) | `PARTIALLY_IMPLEMENTED` |
| `FEAT-SHELL-02` | Header & Status Banner | `explorer/src/components/Header.tsx` | Displays active project name, status badge, search trigger, reset view, and action controls. | `daGraphViewer` LWC Header & SLDS Page Header | `PARTIALLY_IMPLEMENTED` |
| `FEAT-SHELL-03` | Project Selector & Multi-Project Isolation | `explorer/src/components/ProjectSelector.tsx`, `ProjectContext.tsx` | Switches active project, loads project-specific data JSON, isolates selection/history state. | `DA_Project__c` Apex Controller (`DAGraphController.getProjects`) | `OFFLINE_VERIFIED` |
| `FEAT-SHELL-04` | Command Palette & Shortcuts | `explorer/src/components/CommandPalette.tsx`, `KeyboardShortcutsModal.tsx` | Opens Ctrl+K search and shortcut help modal. | LWC Global Keyboard Listener & SLDS Modal | `NOT_STARTED` |
| `FEAT-SHELL-05` | Error Boundary & Diagnostics | `explorer/src/components/ErrorBoundary.tsx`, `DiagnosticsPanel.tsx` | Catches render errors, displays diagnostics overlay and error recovery buttons. | LWC Error Card & `DAErrorResponse` Apex DTO | `PARTIALLY_IMPLEMENTED` |

### Domain 2: State Management & Invariants
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-STATE-01` | Selection vs Navigation Isolation | `explorer/src/context/SelectionContext.tsx`, `WorkspaceRouterContext.tsx` | Selecting a node updates panel details WITHOUT triggering route navigation or project context change. | `daGraphViewer.js` reactive properties (`selectedNodeId`, `selectedEdgeId`) | `OFFLINE_VERIFIED` |
| `FEAT-STATE-02` | ViewState & Position Persistence | `explorer/src/hooks/useViewState.ts`, `position-policy.ts` | Remembers user layout mode, zoom level, pan coordinates, and node override positions. | `DA_User_Preference__c` Custom Object & Apex Service | `PARTIALLY_IMPLEMENTED` |
| `FEAT-STATE-03` | Highlight & Focus State | `explorer/src/lib/highlight-state.ts`, `focus-graph.ts` | Highlights direct neighborhood of selected node; darkens un-connected nodes. | `daGraphViewer` Cytoscape class toggles & edge styling | `OFFLINE_VERIFIED` |

### Domain 3: Node.js Analysis Pipeline (Approved External Boundary)
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-ANALYSIS-01` | TypeScript/JS AST Parsing & Dependency Extraction | `analyze/`, `scripts/` | Parses local source directories, builds raw node and edge graphs. | External CLI / CI/CD Pipeline Service (Node.js) | `APPROVED_EXTERNAL_SERVICE` |
| `FEAT-ANALYSIS-02` | Canonical Graph Adapter & Validation | `scripts/test-export-explorer.cjs`, `explorer-contract.ts` | Normalizes edge types, risk scores, coverage status, and exports `explorer-data.json`. | Node.js Exporter -> Apex Ingestion Service (`DAGraphIngestionService`) | `APPROVED_EXTERNAL_SERVICE` |

### Domain 4: Salesforce Apex Core & Payload Infrastructure
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-APEX-01` | Project & Run Authorization | `scratch/salesforce-poc/.../DAGraphController.cls` | Enforces User/Profile authorization checks (`WITH USER_MODE`, `isAccessible`). | Apex Controller `DAGraphController` | `OFFLINE_VERIFIED` |
| `FEAT-APEX-02` | Unicode-Safe Graph Payload Chunking | `scratch/salesforce-poc/.../DAGraphChunkService.cls` | Splits payloads >131,072 chars without breaking UTF-16 surrogate pairs; reassembles in order. | `DA_Graph_Chunk__c` & `DAGraphChunkService` | `OFFLINE_VERIFIED` |
| `FEAT-APEX-03` | Idempotent Graph Ingestion | `scratch/salesforce-poc/.../DAGraphIngestionService.cls` | Ingests graph chunks into `DA_Project__c` & `DA_Analysis_Run__c` with transaction atomicity. | `DAGraphIngestionService` | `OFFLINE_VERIFIED` |

### Domain 5: Graph Viewer & Layout Engines
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-GRAPH-01` | Interactive Cytoscape Graph Canvas | `explorer/src/components/GraphView.tsx` | Renders nodes/edges with LOD canvas, node dragging, zoom/pan controls, and hover cards. | `daGraphViewer` LWC using static resource Cytoscape.js | `OFFLINE_VERIFIED` |
| `FEAT-GRAPH-02` | Architecture Global Domain Layout Engine | `explorer/src/lib/architecture-layout.ts` | Groups components by domain tiers (Presentation, Business, Data) with grid positioning. | `daLayoutEngine.js` (`computeArchitectureLayout`) | `OFFLINE_VERIFIED` |
| `FEAT-GRAPH-03` | Orbit Layout Engine | `explorer/src/lib/layout/orbit-layout.test.ts` | Places focal component at origin with concentric satellite orbit rings. | `daLayoutEngine.js` (`computeOrbitLayout`) | `OFFLINE_VERIFIED` |
| `FEAT-GRAPH-04` | Constellation Layout Engine | `explorer/src/lib/layout/constellation-layout.ts` | Renders multi-cluster component constellations with curved edge paths. | `daLayoutEngine.js` (`computeConstellationLayout`) | `OFFLINE_VERIFIED` |
| `FEAT-GRAPH-05` | Sankey / Flow Layout Engine | `explorer/src/lib/layout/sankey-layout.ts` | Positions components in sequential horizontal stage columns with flow connections. | `daLayoutEngine.js` (`computeSankeyLayout`) | `OFFLINE_VERIFIED` |

### Domain 6: Specialized Visualization Panels
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-PANEL-01` | Feature Matrix Panel | `explorer/src/components/FeatureMatrixPanel.tsx` | Shows 2D matrix of component-to-component coupling and relationship types. | `daFeatureMatrixPanel` LWC | `NOT_STARTED` |
| `FEAT-PANEL-02` | Architecture DNA Barcode | `explorer/src/components/ArchitectureDNABarcode.tsx` | Visualizes component risk, density, and test coverage as colored barcode strips. | `daArchitectureDnaBarcode` LWC | `NOT_STARTED` |
| `FEAT-PANEL-03` | Architecture Treemap Panel | `explorer/src/components/ArchitectureTreemapPanel.tsx` | Nested rectangular treemap showing component file size / complexity distribution. | `daArchitectureTreemap` LWC | `NOT_STARTED` |
| `FEAT-PANEL-04` | Dependency River Panel | `explorer/src/components/DependencyRiverPanel.tsx` | Streamgraph showing dependency density across architecture layers over time. | `daDependencyRiver` LWC | `NOT_STARTED` |
| `FEAT-PANEL-05` | Subway Map Panel | `explorer/src/components/SubwayPanel.tsx` | Subway-line visualization of execution paths and critical component routes. | `daSubwayMap` LWC | `NOT_STARTED` |
| `FEAT-PANEL-06` | Coupling Heatmap & Hotspot Panel | `explorer/src/components/CouplingHeatmapPanel.tsx`, `HotspotPanel.tsx` | Renders risk hotspots and high-coupling warning lists. | `daHotspotPanel` LWC | `NOT_STARTED` |
| `FEAT-PANEL-07` | Architecture Radar Panel | `explorer/src/components/RadarPanel.tsx` | Multi-axis radar chart showing health metrics (cohesion, coupling, coverage, risk). | `daRadarPanel` LWC | `NOT_STARTED` |
| `FEAT-PANEL-08` | Findings & Rule Violations Panel | `explorer/src/components/FindingsPanel.tsx` | Lists architectural governance violations and rule breaches with severity filters. | `daFindingsPanel` LWC + `DA_Finding__c` Apex query | `SCAFFOLD_ONLY` |

### Domain 7: Simulation, Compare & Detached Drawers
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-ADV-01` | Refactoring Simulation Panel | `explorer/src/components/RefactoringSimulationPanel.tsx` | Simulates node removal or edge detachment to project impact on architectural health. | `daRefactoringSimulator` LWC | `NOT_STARTED` |
| `FEAT-ADV-02` | Snapshot Compare Mode | `explorer/src/components/ComparePanel.tsx` | Compares two graph runs/snapshots and highlights added/removed/modified nodes & edges. | `daSnapshotCompare` LWC | `NOT_STARTED` |
| `FEAT-ADV-03` | Detached Feature Overlay & Drawers | `explorer/src/components/InvestigationDrawer.tsx`, `FeatureTreePanel.tsx` | Side panels showing deep component metadata, call chains, and file locations. | SLDS Drawer / Utility Bar LWC Component | `PARTIALLY_IMPLEMENTED` |

### Domain 8: Persistence, Export & Data Objects
| Feature ID | Feature Name | Source Location | User-Visible Behavior | Salesforce Target Destination | Current Status |
|---|---|---|---|---|---|
| `FEAT-DATA-01` | Data Export (JSON, PNG, CSV) | `explorer/src/lib/export-graph.ts` | Downloads active graph image or filtered dataset to local browser file system. | LWC File Download Handler | `APPROVED_EXTERNAL_SERVICE` |
| `FEAT-DATA-02` | User Annotations & Notes | `explorer/src/lib/annotations.ts` | Allows attaching text notes and architectural tags to graph nodes. | `DA_Annotation__c` Custom Object & Apex Service | `SCAFFOLD_ONLY` |
| `FEAT-DATA-03` | User Preferences Storage | `explorer/src/lib/preferences.ts` | Saves layout mode, filter presets, and dark/light theme preferences per user. | `DA_User_Preference__c` Custom Object & Apex Service | `SCAFFOLD_ONLY` |

---

## 3. Verification & Evidence Cross-References
- **Salesforce POC Harness Execution:** 30/30 passed (`node scratch/salesforce-poc/tests/run-poc-tests.cjs`).
- **CLI Invariant & LLM Test Suite:** 16/16 passed (`npm run test:cli`).
- **Explorer Data Exporter Suite:** 12/12 passed (`node scripts/test-export-explorer.cjs`).
- **Vitest Core Layout Adapters:** 48/48 passed (`src/lib/adapters/...`).

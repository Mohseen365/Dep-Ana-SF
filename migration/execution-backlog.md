# Salesforce Migration Execution Backlog

**Date:** 9 November 2026
**Scope:** Complete Migration Backlog across P0, P1, P2, P3, P4, P5
**Governing Documents:** `salesforce_migration_tracking_report.md`, `salesforce_migration_file_inventory.xlsx`, `migration/blockers-analysis.md`

---

## 1. Backlog Summary

| Priority Level | Focus Area | Task Count | Total Estimated Effort (Days) |
|---|---|---:|---:|
| **P0** | Foundation & Contracts | 4 | 14 |
| **P1** | Core Platform & Shell | 5 | 22 |
| **P2** | Core Analytics & Visualizations | 7 | 28 |
| **P3** | Advanced Visualizations | 7 | 35 |
| **P4** | Collaboration & Portfolio Features | 5 | 25 |
| **P5** | Release Hardening & Deployment | 3 | 12 |
| **Total** | | **31** | **136** |

---

## 2. Priority 0: Foundation & Contracts

### TASK-P0-01: Custom Object Schema & Security Baseline
- **Priority:** P0
- **Effort Estimate:** 3 Days
- **React Source Files:** None (Persistence layer)
- **Salesforce Artifacts:**
  - `objects/DA_Project__c`
  - `objects/DA_Analysis_Run__c`
  - `objects/DA_Graph_Chunk__c`
  - `objects/DA_Finding__c`
  - `objects/DA_Annotation__c`
  - `objects/DA_User_Preference__c`
  - `permissionsets/DA_Architecture_Analyst.permissionset-meta.xml`
- **Dependencies:** None
- **Acceptance Criteria:** Custom objects deployed with correct Master-Detail relationships, external IDs (`Project_Key__c`), indexing on `Chunk_Index__c`, and FLS permissions configured in `DA_Architecture_Analyst` permission set.
- **Definition of Done:** Metadata valid, passes `run-lane-a-schema-tests.cjs` with 100% assertions satisfied.

### TASK-P0-02: Core Graph DTO & Error Response Hierarchy
- **Priority:** P0
- **Effort Estimate:** 3 Days
- **React Source Files:** `explorer/src/types/`, `explorer/src/lib/schema.ts`
- **Salesforce Artifacts:**
  - `classes/dto/DAGraphDTO.cls`
  - `classes/dto/DAAnalysisRunDTO.cls`
  - `classes/dto/DAErrorResponse.cls`
- **Dependencies:** TASK-P0-01
- **Acceptance Criteria:** Strong typing for graph nodes, edges, runs, metrics, and consistent JSON serialization/deserialization.
- **Definition of Done:** Apex DTOs compile cleanly, cover all CONTRACT-01 fields, pass serialization unit tests.

### TASK-P0-03: Graph Chunking & Ingestion Service
- **Priority:** P0
- **Effort Estimate:** 5 Days
- **React Source Files:** `scripts/export-data.js`, `explorer/src/lib/adapters/`
- **Salesforce Artifacts:**
  - `classes/services/DAGraphChunkService.cls`
  - `classes/services/DAGraphIngestionService.cls`
  - `classes/controllers/DAGraphController.cls`
- **Dependencies:** TASK-P0-01, TASK-P0-02
- **Acceptance Criteria:** Ingestion splits payloads into <= 131,072 char chunks without breaking UTF-16 surrogate pairs; enforces `WITH USER_MODE`; compound SOQL ordering `ORDER BY Chunk_Index__c ASC, Id ASC`.
- **Definition of Done:** Passes `run-poc-tests.cjs` Category 1-5 with 0 failures.

### TASK-P0-04: Client-Side Graph Payload Loader
- **Priority:** P0
- **Effort Estimate:** 3 Days
- **React Source Files:** `explorer/src/lib/graph-builder.ts`
- **Salesforce Artifacts:**
  - `lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`
- **Dependencies:** TASK-P0-03
- **Acceptance Criteria:** Handles bounded pagination (10 chunks/page), in-flight cancellation on project switch, UTF-8 reassembly, and schema integrity validation.
- **Definition of Done:** Passes Jest unit tests and POC offline runner test category 1 & 4.

---

## 3. Priority 1: Core Platform & Shell

### TASK-P1-01: Master Application Shell & Routing Orchestrator
- **Priority:** P1
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/App.tsx`, `explorer/src/context/WorkspaceRouterContext.tsx`
- **Salesforce Artifacts:**
  - `lwc/daAppShell/daAppShell.js`
  - `lwc/daAppShell/daAppShell.html`
  - `lwc/daAppShell/daAppShell.css`
- **Dependencies:** TASK-P0-04
- **Acceptance Criteria:** Manages active project, analysis run, view mode, and selected node; supports Lightning `NavigationMixin` URL state synchronization; enforces SELECTION ≠ NAVIGATION.
- **Definition of Done:** Shell renders all active views; handles child custom events (`nodeselect`, `projectchange`, `filterchange`).

### TASK-P1-02: Project Selector & Project Lifecycle Facade
- **Priority:** P1
- **Effort Estimate:** 3 Days
- **React Source Files:** `explorer/src/components/ProjectSelector.tsx`
- **Salesforce Artifacts:**
  - `lwc/daProjectSelector/daProjectSelector.js`
  - `lwc/daProjectSelector/daProjectSelector.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Queries active `DA_Project__c` records via Apex; renders SLDS combobox with metadata badges (timestamp, node count); fires `projectchange`.
- **Definition of Done:** Project switching triggers clean Cytoscape teardown and payload reloading.

### TASK-P1-03: Header & Global Workspace Actions
- **Priority:** P1
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/Header.tsx`, `explorer/src/components/ViewModeSwitcher.tsx`
- **Salesforce Artifacts:**
  - `lwc/daHeader/daHeader.js`
  - `lwc/daHeader/daHeader.html`
  - `lwc/daHeader/daHeader.css`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Displays project branding, active run status, view mode tabs, global search bar, and action triggers (Compare, History, Help).
- **Definition of Done:** Header events properly bubble and trigger shell tab changes.

### TASK-P1-04: Standalone Collapsible Navigation Sidebar
- **Priority:** P1
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/Sidebar.tsx`
- **Salesforce Artifacts:**
  - `lwc/daSidebar/daSidebar.js`
  - `lwc/daSidebar/daSidebar.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Component inventory tree, quick-filter toggles (layers, roles), collapse/expand state persistence in `DA_User_Preference__c`.
- **Definition of Done:** Tree item click dispatches node focus without reloading canvas.

### TASK-P1-05: Cytoscape Graph Viewer & Layout Engine
- **Priority:** P1
- **Effort Estimate:** 6 Days
- **React Source Files:** `explorer/src/components/GraphView.tsx`, `explorer/src/lib/graph-layout.ts`, `explorer/src/lib/architecture-layout.ts`
- **Salesforce Artifacts:**
  - `lwc/daGraphViewer/daGraphViewer.js`
  - `lwc/daLayoutEngine/daLayoutEngine.js`
  - `staticresources/cytoscape.resource`
- **Dependencies:** TASK-P0-04, TASK-P1-01
- **Acceptance Criteria:** Cytoscape static resource loads cleanly under LWS; deterministic coordinate calculation for Architecture, Orbit, Constellation layouts; clean `cy.destroy()` on unmount.
- **Definition of Done:** Passes `run-poc-tests.cjs` Category 6 & 7 (TC-01 through TC-13).

---

## 4. Priority 2: Core Analytics & Visualizations

### TASK-P2-01: Architectural Findings View
- **Priority:** P2
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/FindingsPanel.tsx`, `explorer/src/components/findings/`
- **Salesforce Artifacts:**
  - `lwc/daFindingsView/daFindingsView.js`
  - `lwc/daFindingsView/daFindingsView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Datatable rendering of architectural anti-patterns, severity filtering, search filtering, node selection dispatch, finding suppression modal.
- **Definition of Done:** Passes `run-lane-f-findings-tests.cjs` with 100% assertions.

### TASK-P2-02: Pipeline Diagnostics & Telemetry View
- **Priority:** P2
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/DiagnosticsPanel.tsx`
- **Salesforce Artifacts:**
  - `lwc/daDiagnosticsView/daDiagnosticsView.js`
  - `lwc/daDiagnosticsView/daDiagnosticsView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Renders pipeline execution latencies, node/edge density, strongly connected component (SCC) cycle metrics, and memory gauges.
- **Definition of Done:** Passes `run-w7-1-tests.cjs` with 0 failures.

### TASK-P2-03: Architectural Hotspots Risk Matrix
- **Priority:** P2
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/HotspotPanel.tsx`
- **Salesforce Artifacts:**
  - `lwc/daHotspotsView/daHotspotsView.js`
  - `lwc/daHotspotsView/daHotspotsView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Ranks classes by composite risk score (complexity, churn, coupling); interactive sorting; node selection dispatch.
- **Definition of Done:** Passes `run-w6-4-tests.cjs` with 0 failures.

### TASK-P2-04: Feature Coupling Matrix
- **Priority:** P2
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/FeatureMatrixPanel.tsx`
- **Salesforce Artifacts:**
  - `lwc/daMatrixView/daMatrixView.js`
  - `lwc/daMatrixView/daMatrixView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Dependency matrix grid with heat-map cell shading; row/column sorting; dual-node coordinate dispatch.
- **Definition of Done:** Passes `run-lane-e-matrix-tests.cjs` with 0 failures.

### TASK-P2-05: Architecture DNA Barcode View
- **Priority:** P2
- **Effort Estimate:** 3 Days
- **React Source Files:** `explorer/src/components/ArchitectureDNABarcode.tsx`
- **Salesforce Artifacts:**
  - `lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js`
  - `lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** SVG spectral bands colored by architectural layer and role; hover inspection; range brush selection.
- **Definition of Done:** Passes `run-w7-2-tests.cjs` with 0 failures.

### TASK-P2-06: Architecture Subway Map View
- **Priority:** P2
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/SubwayPanel.tsx`
- **Salesforce Artifacts:**
  - `lwc/daSubwayView/daSubwayView.js`
  - `lwc/daSubwayView/daSubwayView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Transit map style rendering of layer routes and station nodes with transfer point badges.
- **Definition of Done:** Passes `run-w6-3-tests.cjs` with 0 failures.

### TASK-P2-07: Architecture Treemap View
- **Priority:** P2
- **Effort Estimate:** 4 Days
- **React Source Files:** `explorer/src/components/ArchitectureTreemapPanel.tsx`
- **Salesforce Artifacts:**
  - `lwc/daTreemapView/daTreemapView.js`
  - `lwc/daTreemapView/daTreemapView.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Squarified hierarchical treemap layout; size by LOC/complexity; color by defect risk; click selection.
- **Definition of Done:** Passes `run-w6-2-tests.cjs` with 0 failures.

---

## 5. Priority 3: Advanced Visualizations

### TASK-P3-01: Dependency Constellation View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `DependencyConstellationPanel.tsx` | **Salesforce:** `lwc/daConstellationView`
- **Acceptance Criteria:** Focal radial node constellation layout with gravity physics.

### TASK-P3-02: Dependency River (Sankey) View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `DependencyRiverPanel.tsx` | **Salesforce:** `lwc/daRiverView`
- **Acceptance Criteria:** Multi-stage flow diagram showing caller/callee volumes across layers.

### TASK-P3-03: Coupling Heatmap View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `CouplingHeatmapPanel.tsx` | **Salesforce:** `lwc/daCouplingHeatmapView`
- **Acceptance Criteria:** Clustered symmetric matrix highlighting tight coupling clusters.

### TASK-P3-04: Feature Profile View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `FeatureProfilePanel.tsx` | **Salesforce:** `lwc/daFeatureProfileView`
- **Acceptance Criteria:** Detailed component profile card with historical churn, complexity, and dependencies.

### TASK-P3-05: Feature Tree View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `FeatureTreePanel.tsx` | **Salesforce:** `lwc/daFeatureTreeView`
- **Acceptance Criteria:** Collapsible phylogenetic tree showing architectural evolution and package lineage.

### TASK-P3-06: Architecture Radar View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `RadarPanel.tsx` | **Salesforce:** `lwc/daRadarView`
- **Acceptance Criteria:** Multi-axis radar polygon comparing component health across 6 architectural dimensions.

### TASK-P3-07: Four-Direction Coupling View
- **Priority:** P3 | **Effort:** 5 Days | **React:** `FourDirectionPanel.tsx` | **Salesforce:** `lwc/daFourDirectionView`
- **Acceptance Criteria:** North/South/East/West layout showing upstream vs downstream and internal vs external coupling.

---

## 6. Priority 4: Collaboration & Portfolio Features

### TASK-P4-01: Analysis Run History (`daAnalysisHistory`)
- **Priority:** P4
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/AnalysisHistoryPanel.tsx`
- **Salesforce Artifacts:**
  - `classes/controllers/DAAnalysisHistoryController.cls`
  - `classes/services/DAAnalysisHistoryService.cls`
  - `classes/dto/DAAnalysisRunDTO.cls`
  - `lwc/daAnalysisHistory/daAnalysisHistory.js`
  - `lwc/daAnalysisHistory/daAnalysisHistory.html`
  - `lwc/daAnalysisHistory/daAnalysisHistory.css`
- **Dependencies:** TASK-P0-02, TASK-P1-01
- **Acceptance Criteria:** Displays chronologically sorted runs for selected project; shows commit SHA, timestamp, node/edge metrics, delta sparklines; permits run selection and compare dispatch.
- **Definition of Done:** Controller enforces `WITH USER_MODE`; LWC handles pagination; dedicated test runner passes.

### TASK-P4-02: Run Comparison Engine (`daCompareView`)
- **Priority:** P4
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/ComparePanel.tsx`, `explorer/src/lib/diff-adapter.ts`
- **Salesforce Artifacts:**
  - `lwc/daCompareView/daCompareView.js`
  - `lwc/daCompareView/daCompareView.html`
- **Dependencies:** TASK-P4-01
- **Acceptance Criteria:** Side-by-side or diff comparison of two analysis runs (Base vs Target); highlights added/removed nodes and modified edges.
- **Definition of Done:** Renders metric deltas; does not internally mutate inbound `@api` properties.

### TASK-P4-03: Portfolio Executive Dashboard (`daProjectDashboard`)
- **Priority:** P4
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/ProjectDashboard.tsx`
- **Salesforce Artifacts:**
  - `lwc/daProjectDashboard/daProjectDashboard.js`
  - `lwc/daProjectDashboard/daProjectDashboard.html`
- **Dependencies:** TASK-P1-01
- **Acceptance Criteria:** Aggregate health scorecard across all managed projects; total code volume; worst hotspot ranking.
- **Definition of Done:** SOQL queries use aggregate functions and respect sharing rules.

### TASK-P4-04: Project Lifecycle Manager (`daProjectManager`)
- **Priority:** P4
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/ProjectManager.tsx`, `explorer/src/components/ProjectCreationModal.tsx`
- **Salesforce Artifacts:**
  - `lwc/daProjectManager/daProjectManager.js`
  - `lwc/daProjectManager/daProjectManager.html`
- **Dependencies:** TASK-P0-01
- **Acceptance Criteria:** Full CRUD lifecycle for `DA_Project__c` (Create, Edit, Archive, Set Default); validates unique `Project_Key__c`.
- **Definition of Done:** Apex controller enforces CRUD/FLS; modal validation prevents duplicate project keys.

### TASK-P4-05: Progressive Investigation Drawer (`daInvestigationDrawer`)
- **Priority:** P4
- **Effort Estimate:** 5 Days
- **React Source Files:** `explorer/src/components/InvestigationDrawer.tsx`, `explorer/src/context/InvestigationContext.tsx`
- **Salesforce Artifacts:**
  - `lwc/daInvestigationDrawer/daInvestigationDrawer.js`
  - `lwc/daInvestigationDrawer/daInvestigationDrawer.html`
- **Dependencies:** TASK-P1-01, TASK-P2-01
- **Acceptance Criteria:** Slide-out drawer displaying comprehensive entity details (Node, Edge, or Finding); breadcrumb drill-path navigation; annotation authoring.
- **Definition of Done:** Binds to shell `nodeselect` events; integrates with `daAnnotationPanel`.

---

## 7. Priority 5: Release Hardening & Deployment

### TASK-P5-01: Lightning Web Security & Static Resource Audit
- **Priority:** P5 | **Effort:** 4 Days | **Artifacts:** Security audit reports
- **Acceptance Criteria:** Zero LWS violations; Cytoscape cleanly isolated; no inline eval/eval-like behavior.

### TASK-P5-02: Automated Test Coverage & Regression Suite
- **Priority:** P5 | **Effort:** 5 Days | **Artifacts:** `scratch/salesforce-poc/tests/`
- **Acceptance Criteria:** >= 85% Apex code coverage; 100% pass rate across all offline test runners and Jest suites.

### TASK-P5-03: Production DX Promotion & Packaging
- **Priority:** P5 | **Effort:** 3 Days | **Artifacts:** `sfdx-project.json`, unlocked package definition
- **Acceptance Criteria:** Clean promotion out of `scratch/salesforce-poc/` into production `force-app/` with clean validate deployment against target scratch org.

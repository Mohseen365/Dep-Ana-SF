# Salesforce Migration Remaining-Work Register

This register provides the definitive post-integration inventory of all remaining tasks, exact source paths, ownership, dependencies, acceptance criteria, and verifying test commands.

---

## 1. Remaining Items Inventory

| Work Item ID | Feature / Component | Category | Status | Exact Source Path(s) | Owner | Prerequisites & Blockers | Acceptance Criteria | Test Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REM-01** | Live Scratch Org & Target Org Acceptance | Platform / Deployment | Planned / Pending Target Org | `scratch/salesforce-poc/` | Release Engineering | Active scratch org / authenticated Dev Hub | Clean push (`sf project deploy start`), zero Apex compilation errors, zero LWS security violations | `sf project deploy start --dry-run` |
| **REM-02** | Sankey River View (`daSankeyView`) | Advanced Visualization | Deferred | `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/` | Workstream 4 | BLK-02: Security approval for d3-sankey static resource or pure SVG algorithm port | Pure SVG Sankey flow renders without external unapproved npm modules or CSP violations | `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` |
| **REM-03** | Standalone Snapshot Comparison Modal | Comparison Workflows | Pending Allocation | `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` | Workstream 5 | BLK-03: Path allocation in authoritative task register | Dual-run selection opens modal and displays node/edge count deltas and added/removed entities | `node scratch/salesforce-poc/tests/run-ws5-tests.cjs` |
| **REM-04** | Dynamic Lightning URL Parameter Sync | Navigation / Deep-Linking | Planned | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Integration Coordinator | Live org Lightning Experience execution context | URL reflects `c__viewMode`, `c__nodeId`, `c__projectId`; page reload restores exact view without navigation glitch | `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` |
| **REM-05** | Graph Canvas PNG/SVG Export Action | Export & Reporting | Planned | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/` | Workstream 2 | Real browser canvas engine | Export trigger creates downloadable PNG/SVG of Cytoscape viewport | `node scratch/salesforce-poc/tests/run-w5-1-tests.cjs` |

---

## 2. Completed & Fully Integrated Modules (Reference)

- **`daAppShell`**: Hosts 11 approved views + dockable `daInvestigationDrawer` + filter schema + preference persistence.
- **`daSidebar`**: Exposes all 11 view triggers + search + component inventory + favorites.
- **`daHeader`**: Project selector + global search + action triggers + status badge.
- **`daGraphViewer`**: Cytoscape.js core canvas + responsive zoom/pan + layout switching.
- **`daMatrixView`**: N x N coupling matrix + directional link counts.
- **`daFindingsView`**: Architectural findings table + severity classification.
- **`daProjectDashboard`**: Executive KPI cards + project summaries.
- **`daAnalysisHistory`**: Analysis runs list + run selection.
- **`daDiagnosticsView`**: Health dials + cyclic SCC analysis.
- **`daHotspotsView`**: Hotspot ranking formula + scatter analysis.
- **`daRadarView`**: 9D Architecture radar spider chart adhering to CONTRACT-03.
- **`daTreemapView`**: Squarified treemap bounding boxes.
- **`daSubwayView`**: Metro transit map line visualization.
- **`daArchitectureDnaBarcode`**: Dense SVG barcode visualization.
- **`daInvestigationDrawer`**: 1-hop drill trail + breadcrumb navigation + BroadcastChannel IPC.
- **`daAnnotationPanel`**: Record-level notes + Apex CRUD.
- **`daRefactoringEngine`**: Pure topological graph computation (Tarjan SCC, cycle severing, node deletion).
- **`daRefactorHandoffModal`**: Refactoring plan export (Markdown + JSON).

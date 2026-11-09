# Salesforce Migration Tracking Report

**Repository snapshot:** `Dep-Ana-SF-architecture-orbit-final-synthesis-1146127565082562967.zip`  
**Assessment date:** 9 November 2026  
**Archive inventory:** 2,721 files  
**React production source:** 196 files (tests excluded)  
**Salesforce POC:** 100 non-test metadata/source files

## 1. Executive summary

The archive contains a substantial React 19 + TypeScript architecture-exploration workspace, a Node.js CLI/analyzer subsystem, and a Salesforce proof-of-concept under `scratch/salesforce-poc/`. The React application is not fully migrated. A subset of its primary screens and backend contracts have Salesforce counterparts, but the POC exposes only a limited set of views compared with the React application's 18-view workspace.

**Critical distinction:** the Salesforce artifacts are located under `scratch/`, not a production `force-app/` at repository root. Their presence demonstrates implementation work, not deployment or production readiness. The archive contains no proof of successful target-org deployment, complete Jest/Apex test execution, full permissions/sharing configuration, or feature-by-feature acceptance.

- React production files assessed: **196**
- React test/fixture files (not production migration targets): **380**
- Salesforce POC non-test files: **100**
- Salesforce LWC bundles detected: **1** (lwc)
- Non-test Apex classes detected: **8**
- Custom objects detected: **1** (objects)

### Status counts — React production files
| Group | Files | Meaning |
|---|---:|---|
| Already Converted | 0 | No React production file is certified complete from the supplied evidence. |
| Partially Converted | 16 | A Salesforce POC counterpart exists for at least part of the feature. |
| Ready for Conversion | 106 | No corresponding POC artifact was found; implementation can begin after its contracts are defined. |
| Blocked/Dependent Files | 74 | Requires a data, algorithm, security, integration or platform decision first. |
| Not Required in Salesforce | 0 | Tests/configuration or non-runtime assets should be replaced or retained outside Salesforce. |

### Conversion percentage interpretation

- **25%:** a small portion of the behavior is represented in the POC (typically shell/navigation or a shared UI fragment).
- **50%:** a recognizable feature implementation exists, but major behaviors, edge cases, integration or parity remain.
- **75%:** a substantial matching feature exists; remaining work is primarily parity, integration, security, accessibility and acceptance.
- **100%:** requires verified functional parity and production acceptance. **No React production file is responsibly classifiable as 100% converted from this archive alone.**

**React production file counts by estimate:** 25% = 3 files; 50% = 7 files; 75% = 6 files; 100% = 0 files; 0% / no Salesforce counterpart evidenced = 180 files. The 16 partial files are the only React production files with an identifiable POC implementation in this estimate.

Percentages are feature-level estimates, not line-of-code ratios. Files in a bundle inherit a coarse component-level estimate; that does not mean every HTML/JS/CSS/meta file has been independently accepted.

## 2. Architecture understanding

### Operational architecture
1. **Node CLI/analyzer subsystem (`scripts/`, root scripts):** analyzes Salesforce metadata/code and produces graph/export payloads. It is an external Node.js runtime, not a browser feature to be mechanically ported to LWC.
2. **React Explorer (`explorer/src/`):** React 19 + TypeScript UI, Vite build, workspace navigation, 18 visualization modes, graph interaction, investigation workflows, project state, history/compare and refactoring analysis.
3. **Salesforce POC (`scratch/salesforce-poc/force-app/main/default/`):** LWC shell/views, Apex controllers/services/DTOs, custom objects/fields and Cytoscape static resource.
4. **Audit/context/docs (`context/`, `docs/`, audit and verification directories):** project knowledge, requirements, historical decisions, benchmarks and verification evidence; these are not Salesforce runtime artifacts.

### React state and routing
- `WorkspaceRouterContext` owns workspace domain, view mode, project selection and routing state.
- `InvestigationContext` owns selected nodes/edges/findings, drill path, drawer state and focus.
- `ProjectContext` owns project manifest/data selection.
- `ProjectStateContext` owns layout positions and persisted graph preferences.
- Hooks encapsulate selection, view state, compare state, command palette, data loading, navigation history and user preferences.
- The POC shell (`daAppShell`) has a narrower view navigation model (graph, matrix, findings) and uses Apex calls for graph metadata/payload access.

### Data and API flow
- React reads exported `explorer-data.json` datasets and project manifests; CLI/export scripts generate those datasets.
- The Salesforce POC has graph metadata/payload loading, chunking/ingestion services, DTOs, annotation and preference controllers.
- `DA_Graph_Chunk__c`, `DA_Analysis_Run__c`, `DA_Project__c`, `DA_Annotation__c`, `DA_Finding__c` and `DA_User_Preference__c` indicate the intended persisted model.
- The POC includes a Cytoscape static resource; browser-library compatibility with Lightning Web Security, CSP, resource packaging and supported APIs must be validated.

### Key architecture migration principle
Do not port the Node analyzer wholesale into Apex. Keep analysis in the external Node subsystem unless there is a deliberate requirement to run a bounded operation in Salesforce. Treat Salesforce as the presentation, persistence, security and workflow layer, with explicit DTO/API contracts and size-aware graph payload ingestion.

## 3. Conversion progress by module

| React module | Production files | POC assessment | Priority / dependency |
|---|---:|---|---|
| `App.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/AnalysisHistoryPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ArchitectureDNABarcode.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ArchitectureTreemapPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/Breadcrumbs.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/CommandPalette.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ComparePanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ConnectionControls.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/CouplingHeatmapPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/DependencyConstellationPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/DependencyRiverPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/DiagnosticsPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ErrorBoundary.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FeatureMatrixPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FeatureProfilePanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FeatureTreePanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FindingsPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FocusControls.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/FourDirectionPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/GraphControls.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/GraphLegend.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/GraphSlot.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/GraphView.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/Header.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/HealthSummary.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/HotspotPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ImpactControls.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/InvestigationDrawer.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/KeyboardShortcutsModal.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ProjectCreationModal.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ProjectDashboard.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ProjectManager.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ProjectSelector.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/RadarPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/RefactorHandoffModal.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/RefactoringSimulationPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/SearchFilterPanel.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/Sidebar.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/StatusBar.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/SubwayPanel.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/SummaryBar.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/ViewModeSwitcher.tsx` | 1 | 1 partial; 0 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/findings` | 2 | 1 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/graph-internals` | 5 | 0 partial; 5 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/panels` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `components/workspace` | 3 | 0 partial; 3 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `context` | 5 | 0 partial; 5 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `detached.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `hooks` | 11 | 0 partial; 11 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `index.css` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `lib` | 117 | 0 partial; 43 ready; 74 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `main.tsx` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `registry` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `spike` | 3 | 0 partial; 3 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `types` | 2 | 0 partial; 2 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |
| `vite-env.d.ts` | 1 | 0 partial; 1 ready; 0 blocked | See inventory; prioritize state/data contracts before screen parity. |

### Explicit feature mapping and estimates
| React feature/file | Salesforce POC counterpart | Estimate | Group | Remaining parity work |
|---|---|---:|---|---|
| `App.tsx` | `daAppShell` | 50% | Partially Converted | App shell/navigation and graph/matrix/findings loading exist; the React workspace has substantially broader routes, contexts and workflows. |
| `GraphView.tsx` | `daGraphViewer + daLayoutEngine` | 50% | Partially Converted | A graph viewer and layout engine exist, but React's Cytoscape interactions, layout modes, overlays, accessibility and position-authority behavior need parity verification. |
| `FindingsPanel.tsx` | `daFindingsView` | 75% | Partially Converted | A Salesforce findings view exists; confirm complete filters, investigation links, pagination and error/empty states. |
| `DiagnosticsPanel.tsx` | `daDiagnosticsView` | 75% | Partially Converted | A diagnostics view exists; verify parity with the current React diagnostics model. |
| `HotspotPanel.tsx` | `daHotspotsView` | 75% | Partially Converted | A hotspots view exists; verify all metrics, drill-through and state behavior. |
| `FeatureMatrixPanel.tsx` | `daMatrixView` | 50% | Partially Converted | Matrix view exists, but React virtualization, full feature semantics and keyboard/accessibility behavior require parity work. |
| `ArchitectureDNABarcode.tsx` | `daArchitectureDnaBarcode` | 75% | Partially Converted | A DNA barcode component exists; validate exact rendering/data semantics. |
| `ProjectSelector.tsx` | `daProjectSelector` | 75% | Partially Converted | Project selector exists; verify full project lifecycle and loading/error handling. |
| `SubwayPanel.tsx` | `daSubwayView` | 50% | Partially Converted | Subway view exists; confirm complete topology, navigation and visual behavior. |
| `ArchitectureTreemapPanel.tsx` | `daTreemapView` | 50% | Partially Converted | Treemap view exists; confirm data adaptation and interactions. |
| `AnalysisHistoryPanel.tsx` | `None identified` | 0% | Ready for Conversion | No corresponding Salesforce history component or history persistence model is present in the POC inventory. |
| `ComparePanel.tsx` | `None identified` | 0% | Ready for Conversion | No Salesforce compare view or snapshot comparison backend is present in the POC inventory. |
| `DependencyConstellationPanel.tsx` | `None identified` | 0% | Ready for Conversion | No constellation view exists in the POC LWC inventory. |
| `DependencyRiverPanel.tsx` | `None identified` | 0% | Ready for Conversion | No dependency river/Sankey view exists in the POC LWC inventory. |
| `CouplingHeatmapPanel.tsx` | `None identified` | 0% | Ready for Conversion | No coupling heatmap view exists in the POC LWC inventory. |
| `FeatureProfilePanel.tsx` | `None identified` | 0% | Ready for Conversion | No profile view exists in the POC LWC inventory. |
| `FeatureTreePanel.tsx` | `None identified` | 0% | Ready for Conversion | No feature tree view exists in the POC LWC inventory. |
| `FourDirectionPanel.tsx` | `None identified` | 0% | Ready for Conversion | No four-direction view exists in the POC LWC inventory. |
| `RadarPanel.tsx` | `None identified` | 0% | Ready for Conversion | No radar view exists in the POC LWC inventory. |
| `RefactoringSimulationPanel.tsx` | `None identified` | 0% | Ready for Conversion | No Salesforce simulation surface or safe simulation backend exists in the POC inventory. |
| `RefactorHandoffModal.tsx` | `None identified` | 0% | Ready for Conversion | No Salesforce refactor handoff workflow is present. |
| `ProjectDashboard.tsx` | `None identified` | 0% | Ready for Conversion | No Salesforce dashboard component is present in the POC inventory. |
| `ProjectManager.tsx` | `None identified` | 0% | Ready for Conversion | Only project selection is represented; create/edit/archive lifecycle is not represented. |
| `CommandPalette.tsx` | `None identified` | 0% | Ready for Conversion | No equivalent command palette is present; Salesforce navigation/actions should be redesigned using workspace navigation and actions. |
| `InvestigationDrawer.tsx` | `None identified` | 0% | Ready for Conversion | No equivalent progressive investigation drawer is present in the POC. |
| `Sidebar.tsx` | `daAppShell` | 25% | Partially Converted | Some navigation exists inside the shell, but not the React sidebar/component inventory behavior. |
| `Header.tsx` | `daAppShell` | 25% | Partially Converted | Header/status elements appear folded into the app shell, not a separately equivalent component. |
| `GraphControls.tsx` | `daGraphViewer` | 50% | Partially Converted | Basic graph controls may exist in graph viewer; detailed control parity must be tested. |
| `GraphLegend.tsx` | `daGraphViewer` | 25% | Partially Converted | Legend semantics appear only partially represented in the graph viewer. |
| `ViewModeSwitcher.tsx` | `daAppShell` | 50% | Partially Converted | Only graph/matrix/findings navigation is visible in the POC shell; React exposes 18 view modes. |
| `ProjectCreationModal.tsx` | `None identified` | 0% | Ready for Conversion | No creation modal or corresponding project creation Apex flow is present. |
| `PresetManager.tsx` | `daPresetManager` | 75% | Partially Converted | Preset manager exists; validate persistence, schema compatibility and user-level isolation. |
| `AnnotationPanel.tsx` | `daAnnotationPanel` | 75% | Partially Converted | Annotation panel and Apex annotation controller exist; validate lifecycle/security and all React annotation states. |

## 4. File-by-file assessment

The attached workbook contains the complete archive file inventory (all files in the ZIP), with path, purpose, group, estimated percentage, complexity, Salesforce target artifacts, dependencies and rationale. The following focused inventory explains the main production code areas; test files, evidence files, docs and tooling are separately classified in the workbook.

### React application shell, components, contexts, hooks, libraries
Every production file under `explorer/src/` is included individually in the workbook. The main migration groupings are:
- **Partially converted:** `App.tsx`, `GraphView.tsx`, `FindingsPanel.tsx`, `DiagnosticsPanel.tsx`, `HotspotPanel.tsx`, `FeatureMatrixPanel.tsx`, `ArchitectureDNABarcode.tsx`, `ProjectSelector.tsx`, `SubwayPanel.tsx`, `ArchitectureTreemapPanel.tsx`, plus matching shell/graph controls and project preset/annotation surfaces where present.
- **Ready for conversion:** React components without a Salesforce counterpart, including the command palette, investigation drawer, compare/history, dashboard, project creation/management, constellation, dependency river, coupling heatmap, profile/tree/radar/four-direction, refactoring simulation and handoff workflows.
- **Blocked/dependent:** graph/layout engines, Cytoscape adapters, worker execution, large-data adapters and project dataset ingestion. Resolve Lightning runtime constraints, payload chunking, limits and data contracts before porting.
- **Not required:** React test files and test fixtures. Replace with LWC Jest tests and Apex tests; do not deploy React tests.

### Salesforce POC files
| POC artifact family | Present | Assessment |
|---|---:|---|
| LWC bundles | 1 | Partial implementation; feature parity and runtime validation remain open. |
| Apex classes | 12 total, 8 non-test | Graph data/controller/service/DTO and annotation/preference behavior exists; security, error handling, sharing and test coverage need verification. |
| Custom objects | 1 | Initial persistence schema exists; field/relationship completeness and operational data model need validation. |
| Static Resources | 1 Cytoscape library | Validate library version/license, LWS/CSP compatibility, packaging and initialization. |

## 5. Remaining work
1. Establish the authoritative Salesforce deployment root and promote the POC out of `scratch/` only after review.
2. Freeze versioned graph DTO contracts: project identity, graph run, nodes, edges, findings, metrics, chunk indexes, schema version and error envelope.
3. Complete object schema: relationships, required fields, indexes/selectivity, retention, ownership, sharing, CRUD/FLS and permission sets.
4. Complete Apex service architecture: thin `@AuraEnabled` controllers, service-layer orchestration, DTO validation, bulk-safe persistence, limits-aware chunking and consistent exceptions.
5. Prove LWC runtime behavior: LWS/CSP, static resource loading, Cytoscape lifecycle, resize, navigation, accessibility, keyboard support and performance on representative large graphs.
6. Port remaining React views in dependency order; do not duplicate graph algorithms until the rendering/data contract is stable.
7. Port durable preferences, annotations, history, compare and project lifecycle with user/project isolation.
8. Add Jest LWC tests, Apex unit/security tests, permission tests, integration tests and target-org deployment validation.
9. Run parity acceptance against the current React app for each view and workflow; only then update conversion percentages.

## 6. Recommended migration order
1. **Foundation/contracts:** Salesforce project structure, DTO schema, object relationships, permission sets, error contract, API version and deployment pipeline.
2. **Data services:** graph run metadata, chunk retrieval/ingestion, project selection and payload loading; verify bulkification and governor-limit behavior.
3. **Core shell:** `daAppShell`, project selector, navigation and shared loading/error states.
4. **Core graph:** graph viewer, layout engine and Cytoscape integration; verify LWS, CSP, performance and position persistence.
5. **Core analytical views:** findings, diagnostics, hotspots, matrix, DNA, subway and treemap.
6. **State and collaboration:** annotations, user preferences, presets and saved positions.
7. **Advanced views:** constellation, dependency river, coupling heatmap, profile, tree, radar and four-direction.
8. **Portfolio workflows:** dashboard, history, compare and project lifecycle.
9. **Advanced change workflows:** refactoring simulation and handoff, only after safe server/API boundaries are defined.
10. **Release hardening:** access model, tests, accessibility, observability, data-volume tests, deployment and rollback.

## 7. Risks and blockers
- **POC vs production ambiguity:** Salesforce code is nested under `scratch/salesforce-poc`; no production deployment proof is present.
- **Feature gap:** React documents 18 view modes; POC shell shows only graph/matrix/findings navigation.
- **Graph payload scale:** storing graph payloads in custom-object chunks can hit heap, DML, query, storage and serialization limits; chunk sizing and retrieval must be measured.
- **Cytoscape compatibility:** a packaged library may not be Lightning Web Security-compatible without adaptation; validate all dynamic DOM and global access.
- **State model mismatch:** React Context/local persistence/browser URL state must be mapped to LWC component state, LMS, NavigationMixin and durable Salesforce records deliberately.
- **Security:** Apex sharing, CRUD/FLS, user/project isolation, permission sets and record ownership are not inferred from the existence of controllers/tests.
- **Parity evidence:** no supplied artifact certifies every React feature at 100%; percentages are estimates until verified.
- **Scope noise:** the ZIP contains thousands of audit, benchmark, test and evidence files; these should not be mistaken for application features.

## 8. Assessment limitations and confidence
- Inventory includes every non-directory file in the supplied ZIP; migration relevance is determined by path/type and the visible React/Salesforce source structure.
- Component-level estimates use explicit source-to-POC correspondences where identifiable. They are not code-coverage or LOC calculations.
- A file being present in the Salesforce POC is not proof it compiles or behaves correctly in an org.
- This assessment did not connect to a Salesforce org or execute an org deployment. Runtime readiness, permissions and production acceptance remain unverified.
- For the exact per-file classification, use the **File-by-File Inventory** sheet in the workbook.

## 9. Deliverables
- `salesforce_migration_tracking_report.md` — this narrative report.
- `salesforce_migration_file_inventory.xlsx` — complete per-file inventory and Salesforce POC inventory.
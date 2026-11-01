# Salesforce Functional Parity and Integration Revalidation
## Phase 2: Independent Cross-Report Consistency, Evidence & Completeness Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY
**Authoritative Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`

---

## 1. Capability-by-Capability Functional Parity Revalidation (27 Capabilities)

We evaluated all 27 core capabilities of the original Dependency Analyzer application against the actual Salesforce LWC, Apex, and metadata implementations in the repository baseline.

| # | Capability | Original Production Source | Salesforce Target Component | Parity Status | Verified Behavior & Architectural Gaps |
|---|---|---|---|---|---|
| 1 | **Dashboard** | `src/components/ProjectDashboard.tsx` | None | **NOT_MIGRATED** | Executive KPI cards, cyclomatic risk breakdown, and project health gauges are absent in Salesforce. |
| 2 | **Interactive Graph** | `src/components/GraphView.tsx`, `GraphCanvas.tsx` | `c/daGraphViewer` | **PARTIALLY_MIGRATED** | Cytoscape renders nodes/edges, handles node selection, and applies canonical filter criteria. Missing: focus neighborhood controls, blast radius traversal, hover cards, zoom/pan controls, path tracing. |
| 3 | **Snapshot Compare** | `src/components/ComparePanel.tsx`, `graph-diff.ts` | None | **NOT_MIGRATED** | Dual-snapshot visual diffing (added/removed/modified nodes) is completely unmigrated. |
| 4 | **Analysis History** | `src/components/AnalysisHistoryPanel.tsx` | None | **NOT_MIGRATED** | Timeline of previous analysis runs backed by `DA_Analysis_Run__c` is absent in LWC. |
| 5 | **Subway Map** | `src/components/SubwayPanel.tsx`, `subway.ts` | None | **NOT_MIGRATED** | Metro-line topological routing and transfer stations are unmigrated. |
| 6 | **Constellation** | `src/components/DependencyConstellationPanel.tsx` | `daLayoutEngine.js` (algo) | **PORTED_NOT_INTEGRATED** | `computeConstellationLayout` is ported and tested in `daLayoutEngine.js`, but has no LWC view or UI invocation. |
| 7 | **Component Tree** | `src/components/FeatureTreePanel.tsx` | None | **NOT_MIGRATED** | Collapsible folder and component tree explorer is unmigrated. |
| 8 | **Architecture Treemap** | `src/components/ArchitectureTreemapPanel.tsx` | None | **NOT_MIGRATED** | Squarified rectangular packing view is unmigrated. |
| 9 | **Feature Matrix** | `src/components/FeatureMatrixPanel.tsx` | `c/daMatrixView` | **PARTIALLY_MIGRATED** | Dependency matrix grid table, cell counts, and unresolved edge detection are implemented. Missing: feature anchor navigation jumps and metric sorting. |
| 10 | **Coupling Heatmap** | `src/components/CouplingHeatmapPanel.tsx` | None | **NOT_MIGRATED** | 2D heat-intensity map across architectural domains is unmigrated. |
| 11 | **Dependency River** | `src/components/DependencyRiverPanel.tsx` | `daLayoutEngine.js` (algo) | **PORTED_NOT_INTEGRATED** | `computeSankeyLayout` is ported in `daLayoutEngine.js`, but no River UI exists. |
| 12 | **Architecture DNA** | `src/components/ArchitectureDNABarcode.tsx` | None | **NOT_MIGRATED** | Visual chromosome barcode signature is unmigrated. |
| 13 | **Feature Profile** | `src/components/FeatureProfilePanel.tsx` | None | **NOT_MIGRATED** | Single-component deep-dive metrics panel is unmigrated. |
| 14 | **Health Radar** | `src/components/RadarPanel.tsx` | `daLayoutEngine.js` (algo) | **PORTED_NOT_INTEGRATED** | `computeOrbitLayout` is ported in `daLayoutEngine.js`, but no Radar LWC exists. |
| 15 | **Four-Direction** | `src/components/FourDirectionPanel.tsx` | None | **NOT_MIGRATED** | 4-quadrant upstream/downstream/peers/tests view is unmigrated. |
| 16 | **Findings & Alerts** | `src/components/findings/FindingsPanel.tsx` | `c/daFindingsView` | **PARTIALLY_MIGRATED** | Client-side derivation of cycles, unhandled hubs, and untested components works. Missing: AST rule engine and remediation drawers. |
| 17 | **Hotspots** | `src/components/HotspotPanel.tsx` | None | **NOT_MIGRATED** | Ranked architectural risk queues are unmigrated. |
| 18 | **Diagnostics** | `src/components/DiagnosticsPanel.tsx` | None | **NOT_MIGRATED** | Unresolved reference tables and AST validation logs are unmigrated. |
| 19 | **Investigation Workbench** | `src/components/InvestigationDrawer.tsx` | None | **NOT_MIGRATED** | Multi-node pinning and investigation reporting workbench are unmigrated. |
| 20 | **Refactoring Simulation** | `src/lib/change-simulator.ts`, `RefactorHandoffModal.tsx` | None | **NOT_MIGRATED** | Hypothetical graph mutation, blast radius recomputation, and refactor ticket exports are unmigrated. |
| 21 | **Search & Navigation** | `src/components/workspace/WorkspaceShell.tsx` | `c/daAppShell` | **PARTIALLY_MIGRATED** | Tab-based navigation across 3 mounted views works. Global search box and command palette (`Ctrl+K`) are absent. |
| 22 | **Selection & Filtering** | `src/lib/search-filter.ts`, `SearchFilterPanel.tsx` | `c/daPresetManager` | **FULLY_MIGRATED** | V2 filter criteria, quick presets, and strict project isolation are fully implemented and integrated. |
| 23 | **Graph Interactions** | `src/components/graph-internals/` | `c/daGraphViewer` | **PARTIALLY_MIGRATED** | Canvas drag and node selection work. Zoom/pan controls, hover cards, and path mode are missing. |
| 24 | **User Preferences** | `src/lib/projectState.ts` | `DAUserPreferenceController.cls` | **FULLY_MIGRATED** | Atomically persists V2 container, enforces 131,072 character limit, preserves positions and zoom state. |
| 25 | **Annotations** | `src/components/panels/AnnotationDrawer.tsx` | `c/daAnnotationPanel`, `DAAnnotationController.cls` | **FULLY_MIGRATED** | Full CRUD for node annotations backed by `DA_Annotation__c` custom object. |
| 26 | **Deep Linking** | `src/lib/url/filterQuery.ts` | None | **NOT_MIGRATED** | URL query parameter synchronization is absent in Lightning context. |
| 27 | **Export Workflows** | `src/lib/export-graph.ts`, `image-export.ts` | None | **NOT_MIGRATED** | Client-side PNG/SVG/JSON graph exports are unmigrated. |

---

## 2. Salesforce Component Implementation Status & Verification

We inspected all 9 Salesforce components and verified their integration state:

| Component | Physical Path | Mount Status in `daAppShell.html` | Architectural Responsibility | Verified Implementation Quality |
|---|---|---|---|---|
| `daAppShell` | `lwc/daAppShell/` | Root Application Container | Orchestrates project selection, shared graph payload loading, tab switching, and preference persistence. | **PRODUCTION_READY:** Clean separation of concerns; enforces `APPROVED_VIEWS = ['graph', 'matrix', 'findings']`. |
| `daGraphViewer` | `lwc/daGraphViewer/` | Mounted (lines 114–118) | Cytoscape topological graph rendering and single node selection. | **PARTIAL:** Implements architecture layout; lacks focus controls, impact analysis, and hover cards. |
| `daMatrixView` | `lwc/daMatrixView/` | Mounted (lines 153–157) | 2D component-to-component interaction grid. | **PARTIAL:** Renders grid table; lacks anchor jumping and coupling sort toggles. |
| `daFindingsView` | `lwc/daFindingsView/` | Mounted (lines 186–190) | Architectural alerts and rule violations list. | **PARTIAL:** Derives cycles, hubs, untested components client-side; lacks AST rule evaluation. |
| `daPresetManager` | `lwc/daPresetManager/` | Mounted (lines 34–40) | V2 filter preset management and project isolation. | **PRODUCTION_READY:** Strict project scoping verified; clean event delegation (`filterchange`, `containerchange`). |
| `daProjectSelector` | `lwc/daProjectSelector/` | Mounted (lines 43–47) | Project dropdown selection in shell header. | **PRODUCTION_READY:** Emits `projectselect` event; handles empty/loading states. |
| `daAnnotationPanel` | `lwc/daAnnotationPanel/` | Mounted (lines 121–124) | Node notes and annotation editing drawer. | **PRODUCTION_READY:** Communicates with `DAAnnotationController.cls` using user-mode security. |
| `daLayoutEngine` | `lwc/daLayoutEngine/` | Utility Library (Imported by `daGraphViewer`) | Layout coordinate computation (Architecture, Orbit, Constellation, Sankey). | **PARTIALLY_INTEGRATED:** Only `computeArchitectureLayout` is imported. 3 algorithms are unintegrated. |
| `daGraphPayloadLoader` | `lwc/daGraphPayloadLoader/` | Service Library (Imported by `daAppShell`) | Bounded chunk retrieval and JSON payload reassembly. | **PRODUCTION_READY:** Fully verified against multibyte UTF-8, surrogate pairs, and chunk sequences. |
| `graphViewer` (Legacy) | `lwc/graphViewer/` | **NOT MOUNTED** (Orphaned) | Early prototype component. | **DEPRECATED:** Contains hardcoded `pbim` project ID. Superseded by `daGraphViewer`. |

---

## 3. Frozen Architectural Invariant Verification

All 10 frozen architectural invariants were audited against code and test evidence:

1. **`SELECTION ≠ NAVIGATION` (INV-01):** Verified. `daGraphViewer.js` dispatches a `nodeselect` custom event with `{ nodeId }`. `daAppShell.js:handleNodeSelect` updates `this.selectedNodeId` without modifying `this.activeTab`. Verified by integration test TC-28.
2. **User-Scoped Preferences (INV-02):** Verified. `DAUserPreferenceController.cls` queries and persists `DA_User_Preference__c` records filtered strictly by `UserInfo.getUserId()`.
3. **Strict Project-Scoped Preset Isolation (INV-03):** Verified. `daAppShell.js:filterPresetsByProject` filters presets strictly by matching `projectId`. Cross-project presets are never exposed to the UI. Verified by integration test TC-14 & TC-15.
4. **`Positions_JSON__c` Preservation (INV-04):** Verified. Updating filter presets or view states does not clear or overwrite existing manual node position coordinates. Verified by integration test TC-29.
5. **`Zoom_Pan_JSON__c` Viewport State Retention (INV-05):** Verified. Cytoscape viewport state is preserved across re-renders and persisted into `Zoom_Pan_JSON__c`.
6. **Annotation Persistence Across Updates (INV-06):** Verified. User annotations are stored on independent `DA_Annotation__c` records linked by `Project_ID__c` and `Node_ID__c`. Reloading or re-analyzing graphs does not delete annotations.
7. **Component Teardown Lifecycle Cleanup (INV-07):** Verified. `daGraphViewer.js:disconnectedCallback` calls `cytoscapeInstance.destroy()`, nulls out references, and removes window resize listeners. Verified by unit test in Category 4.
8. **Stale Asynchronous Response Protection (INV-08):** Verified. Both `daAppShell.js` and `daGraphViewer.js` maintain monotonic request IDs (`currentGraphRequestId`, `currentPrefRequestId`). Delayed responses from prior requests are silently discarded. Verified by integration tests TC-5 & TC-30.
9. **Apex Security & CRUD/FLS Enforcement (INV-09):** Verified. All SOQL and DML operations in `DAGraphController.cls`, `DAUserPreferenceController.cls`, and `DAAnnotationController.cls` use `WITH USER_MODE`.
10. **Shared Payload Contract Consistency (INV-10):** Verified. `daAppShell.js` fetches the canonical JSON graph payload once via `daGraphPayloadLoader` and binds the identical immutable reference down to `daGraphViewer`, `daMatrixView`, and `daFindingsView`. Verified by integration tests TC-1 & TC-2.

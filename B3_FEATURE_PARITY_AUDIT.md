# B3 — Feature Parity and Migration Gap Audit Report

**Auditor:** Agent B3 (Feature Parity and Migration Gap Auditor)
**Execution Mode:** READ-ONLY (Zero application code changes)
**Governance Baseline:** DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)
**Prerequisite Gate:** None (Launched concurrently with B1, B2, B4, B5)
**Repository State:** Salesforce POC at `scratch/salesforce-poc/`, React reference at `explorer/src/`

---

## 1. Executive Summary

This audit establishes the formal, evidence-backed feature parity evaluation between the original React Dependency Analyzer (`explorer/src/`) and the Salesforce Lightning Web Component (LWC) / Apex POC implementation (`scratch/salesforce-poc/`).

### Key Audit Findings:
1. **Denominator Reconciliation:** The canonical React workspace defines **18 view modes** across 5 domains. The Salesforce `daAppShell` mounts **11 approved view tabs** and **1 slide-out investigation drawer** (`daInvestigationDrawer`). These two numbers **must not be treated as identical denominators**:
   - 4 React view modes are fully subsumed inside composite Salesforce components without loss of capability:
     - `tree` (Tree View / VIEW-07) is provided by `daSidebar`.
     - `heatmap` (Coupling Heatmap / VIEW-10) is provided across `daHotspotsView` and `daMatrixView`.
     - `profile` (Component Profile / VIEW-13) is provided by `daInvestigationDrawer` (Overview tab).
     - `four-direction` (4-Direction Expansion / VIEW-15) is provided by `daInvestigationDrawer` (Connections tab).
     - `constellation` (Constellation Mode / VIEW-06) is provided as a first-class layout engine mode within `daGraphViewer` Cytoscape canvas.
   - 1 React view mode is **DEFERRED**: `river` (Dependency River / VIEW-11), pending SVG/D3 security clearance (`REM-02`).
   - 1 React view mode is **PARTIALLY IMPLEMENTED**: `compare` (Compare Mode / VIEW-02), where dual-run selection and event dispatch are implemented in `daAnalysisHistory`, but the standalone comparison diff container modal is pending coordinator allocation (`REM-03`).
   - 11 React view modes correspond 1:1 to the 11 mounted tabs in `daAppShell`.
2. **Canonical Feature Matrix:** Evaluated across all **42 feature items** in 10 architectural domains:
   - **FULLY IMPLEMENTED:** 30 features (71.42%)
   - **PARTIALLY IMPLEMENTED:** 7 features (16.66%)
   - **DEFERRED:** 1 feature (2.38%) — `VIEW-11` (Dependency River)
   - **NOT IN APPROVED SCOPE (Quarantined):** 2 features (4.76%) — `COMP-02` (Refactor Handoff Modal), `COMP-04` (Refactoring Simulation Panel)
   - **NOT IMPLEMENTED:** 2 features (4.76%) — `COMP-03` (Command Palette), `COMP-07` (Hover Cards)
3. **Parity Metrics:**
   - **Variant 1 (All 42 features):** Strict = **71.42%** (30/42), Weighted = **79.76%** (33.5/42).
   - **Variant 2 (Excluding Category (d) External Node.js Tools, N=40):** Strict = **70.00%** (28/40), Weighted = **78.75%** (31.5/40).
4. **Governance Invariant Enforcement:**
   - `SELECTION != NAVIGATION` is strictly maintained. Node selection dispatches `nodeselect` to open or update the investigation drawer without modifying the active tab view.
   - Quarantined components (`daRefactoringEngine` and `daRefactorHandoffModal`) exist in the filesystem under `scratch/salesforce-poc/force-app/main/default/lwc/` but are unmounted, unimported, and strictly quarantined per DEC-04 Alternative 4. They are **not counted as implemented**.
   - Zero application code was modified during this audit.

---

## 2. Denominator Breakdown: 18 React View Modes vs 11 Approved Salesforce Views

In the React architecture (`explorer/src/lib/projectState.ts`, `explorer/src/registry/workspace-registry.ts`), `WorkspaceViewMode` defines exactly 18 view modes:

```typescript
export type WorkspaceViewMode =
  | "graph"          // VIEW-04
  | "dashboard"      // VIEW-01
  | "matrix"         // VIEW-09
  | "heatmap"        // VIEW-10 (Subsumed by daHotspotsView & daMatrixView)
  | "river"          // VIEW-11 (Deferred, REM-02)
  | "tree"           // VIEW-07 (Subsumed by daSidebar)
  | "treemap"        // VIEW-08
  | "profile"        // VIEW-13 (Subsumed by daInvestigationDrawer Overview)
  | "radar"          // VIEW-14
  | "dna"            // VIEW-12
  | "four-direction" // VIEW-15 (Subsumed by daInvestigationDrawer Connections)
  | "subway"         // VIEW-05
  | "constellation"  // VIEW-06 (Subsumed as Cytoscape layout in daGraphViewer)
  | "findings"       // VIEW-16
  | "hotspots"       // VIEW-17
  | "diagnostics"    // VIEW-18
  | "compare"        // VIEW-02 (Partially implemented in daAnalysisHistory)
  | "history";       // VIEW-03
```

In Salesforce POC (`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` and `daAppShell.js`), the shell directly mounts **11 primary view components** in tab slots plus **1 docked/detached investigation drawer**:

| React View Mode | Corresponding Salesforce LWC | Mounting Location in Salesforce | Architectural Status & Subsumption Evidence |
| :--- | :--- | :--- | :--- |
| `graph` | `daGraphViewer` | Tab 1 (`isGraphView`) | **Mounted View**: Full Cytoscape canvas supporting Pan, Zoom, Drag, Fit, Reset, and Layout Switching. |
| `matrix` | `daMatrixView` | Tab 2 (`isMatrixView`) | **Mounted View**: N x N coupling grid, cell inspection, row/column highlighting. |
| `findings` | `daFindingsView` | Tab 3 (`isFindingsView`) | **Mounted View**: Rule violation datatable querying `DA_Finding__c` with severity/category filters. |
| `dashboard` | `daProjectDashboard` | Tab 4 (`isDashboardView`) | **Mounted View**: Health summary cards, layer metrics, complexity scorecard. |
| `history` | `daAnalysisHistory` | Tab 5 (`isHistoryView`) | **Mounted View**: Ingestion run timeline querying `DA_Analysis_Run__c` with compound deterministic ordering. |
| `diagnostics` | `daDiagnosticsView` | Tab 6 (`isDiagnosticsView`) | **Mounted View**: Cycle group breakdown, health scorecard, unresolved symbols list. |
| `hotspots` | `daHotspotsView` | Tab 7 (`isHotspotsView`) | **Mounted View**: High-coupling hotspot list, risk categorization, rank badges. |
| `radar` | `daRadarView` | Tab 8 (`isRadarView`) | **Mounted View**: Pure SVG 9-dimensional spider chart adhering to CONTRACT-03. |
| `treemap` | `daTreemapView` | Tab 9 (`isTreemapView`) | **Mounted View**: Squarified bounding-box treemap with LOC weighting and risk color grading. |
| `subway` | `daSubwayView` | Tab 10 (`isSubwayView`) | **Mounted View**: Metro-transit transit tracks, stations, line badges, station click selection. |
| `dna` | `daArchitectureDnaBarcode`| Tab 11 (`isDnaView`) | **Mounted View**: Horizontal multi-layer genomic barcode strips with risk color mapping. |
| `tree` | `daSidebar` | Left Docked Shell Panel | **Subsumed View (Category a)**: `daSidebar` renders hierarchical component inventory, layer accordion, search, and favorites. |
| `heatmap` | `daHotspotsView` / `daMatrixView`| Tab 7 / Tab 2 | **Subsumed View (Category a)**: Heatmap density color ramps and high-risk hotspots are natively rendered in `daMatrixView` and `daHotspotsView`. |
| `profile` | `daInvestigationDrawer` | Right Slide-Out Drawer | **Subsumed View (Category a)**: Overview tab renders 360-degree node metrics (fan-in, fan-out, LOC, cyclomatic complexity, risk). |
| `four-direction` | `daInvestigationDrawer` | Right Slide-Out Drawer | **Subsumed View (Category a)**: Connections tab renders interactive 1-hop upstream/downstream dependency expansion. |
| `constellation` | `daLayoutEngine` / `daGraphViewer` | Canvas Layout Option | **Subsumed View (Category a)**: Constellation layout algorithm is selectable within Cytoscape canvas as a layout mode. |
| `compare` | `daAnalysisHistory` | Tab 5 | **Partially Implemented (Category c / REM-03)**: Dual-run checkbox selection and `comparelaunch` event exist; diff modal container unmounted. |
| `river` | `daLayoutEngine` | Unmounted Math Function | **Deferred View (Category c / REM-02)**: Layout math exists in `daLayoutEngine`; SVG view deferred pending security clearance. |

**Audit Conclusion:** The 18 React view modes and 11 Salesforce view tabs reflect a deliberate architectural consolidation. All workflows represented by React's 18 modes are accounted for either via mounted view tabs (11), composite containers / layout modes (5), partial implementation (1), or explicit security deferral (1).

---

## 3. Investigation Across All 16 Mandated Areas

| # | Investigation Area | React Source Reference | Salesforce Implementation Reference | Parity Assessment & Evidence |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Graph Navigation** | `explorer/src/components/GraphView.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | **FULLY IMPLEMENTED**. Cytoscape canvas supports pan, zoom, fit, box-select, and center-on-node. |
| **2** | **Graph Selection** | `explorer/src/context/SelectionContext.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | **FULLY IMPLEMENTED**. Click emits `nodeselect`. Invariant `SELECTION != NAVIGATION` strictly enforced across all 11 views and shell. |
| **3** | **Layout Switching** | `explorer/src/components/GraphControls.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | **FULLY IMPLEMENTED**. Supports Architecture, Circle, Grid, Breadthfirst, Orbit, and Constellation layouts. |
| **4** | **Search & Filtering** | `explorer/src/components/SearchFilterPanel.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.js`, `daSidebar.js` | **PARTIALLY IMPLEMENTED**. Header search and sidebar layer filtering work; multi-criteria filter overlay (`daPresetManager`) is unmounted. |
| **5** | **Deep-Link URL Restoration**| `explorer/src/lib/url/filterQuery.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | **PARTIALLY IMPLEMENTED (REM-04)**. Component properties exist (`activeProjectId`, `activeProjectKey`); `lightning-navigation` PageReference serialization is missing. |
| **6** | **Accessibility & Keyboard Nav**| `explorer/src/components/KeyboardShortcutsModal.tsx`| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/` | **PARTIALLY IMPLEMENTED**. All LWCs use SLDS ARIA roles/tablists; global hotkey listener (`Cmd+K`, `Escape`) and shortcut help modal missing. |
| **7** | **Large Graph Performance** | `explorer/src/components/GraphView.tsx` (LOD) | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | **PARTIALLY IMPLEMENTED (REM-01)**. LOD CSS classes implemented; Web Worker offloading restricted by LWS; live-org 500+ node benchmark pending. |
| **8** | **Project Selection & Creation**| `explorer/src/components/ProjectCreationModal.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/daProjectSelector.js` | **PARTIALLY IMPLEMENTED**. Project dropdown switching implemented; modal form for creating projects in-app is missing. |
| **9** | **Manifest Import** | `explorer/src/components/ProjectCreationModal.tsx` | `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`| **FULLY IMPLEMENTED (CLI/Apex)**. Manifest import handled via Apex `DAGraphIngestionService` chunked ingestion; UI file-picker modal omitted by design. |
| **10**| **Saved Views** | `explorer/src/lib/views.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js` | **PARTIALLY IMPLEMENTED**. Logic exists in `daPresetManager` and `DA_User_Preference__c`; UI trigger unmounted from `daAppShell`. |
| **11**| **Node/Edge Hover Cards** | `explorer/src/components/graph-internals/NodeHoverCard.tsx`| None (Relies on click-to-drawer) | **NOT IMPLEMENTED**. Mouseover popover cards with risk metrics and source code links not ported to Cytoscape canvas. |
| **12**| **Snapshot Comparison** | `explorer/src/components/ComparePanel.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.js` | **PARTIALLY IMPLEMENTED (REM-03)**. Multi-run checkbox selection and `comparelaunch` event exist; side-by-side diff UI container missing. |
| **13**| **Sankey / Dependency River**| `explorer/src/components/DependencyRiverPanel.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | **DEFERRED (REM-02)**. Layout math (`computeSankeyLayout`) ported; standalone SVG view deferred pending static resource security approval. |
| **14**| **Refactoring Handoff** | `explorer/src/components/RefactorHandoffModal.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/` | **NOT IN APPROVED SCOPE (Quarantined)**. Code exists in repo but unmounted under DEC-04 Alt 4. |
| **15**| **Command Palette** | `explorer/src/components/CommandPalette.tsx` | None | **NOT IMPLEMENTED**. Keyboard `Cmd+K` modal search not ported to LWC. |
| **16**| **Investigation & Collaboration**| `explorer/src/components/InvestigationDrawer.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/` | **FULLY IMPLEMENTED**. Mounted in shell, 1-hop drilldown, Overview/Connections/Findings tabs, and BroadcastChannel IPC for detached windows. |

---

## 4. Feature Domain Summary (42 Items)

| Domain | Total Items | Fully Implemented | Partially Implemented | Deferred | Not In Approved Scope (Quarantined) | Not Implemented |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Topological Views (VIEW)** | 18 | 16 | 1 | 1 | 0 | 0 |
| **Architecture Layouts (LAYOUT)** | 4 | 4 | 0 | 0 | 0 | 0 |
| **Graph Invariants (INV)** | 9 | 6 | 3 | 0 | 0 | 0 |
| **Shared UI & Modals (COMP)** | 7 | 1 | 2 | 0 | 2 | 2 |
| **State & Persistence (PERSIST)**| 2 | 1 | 1 | 0 | 0 | 0 |
| **CLI & External Engine (CLI)** | 2 | 2 | 0 | 0 | 0 | 0 |
| **Total Inventory** | **42** | **30** | **7** | **1** | **2** | **2** |

---

## 5. Mathematical Parity Calculations

### Variant 1: Complete Feature Inventory (Denominator N = 42)
- **Strict Parity** (Only Fully Implemented):
  $$\text{Strict Parity} = \frac{30}{42} = 71.4285\% \implies \mathbf{71.42\%}$$
- **Weighted Parity** (Fully Implemented + Partially Implemented weighted at 0.5):
  $$\text{Weighted Parity} = \frac{30 + (7 \times 0.5)}{42} = \frac{33.5}{42} = 79.7619\% \implies \mathbf{79.76\%}$$

### Variant 2: Excluding Category (d) External Node.js CLI Tools (Denominator N = 40)
- Excluded items: `CLI-01` (Deterministic Export & CLI Forwarding) and `CLI-02` (Architecture Quality Gates & Debt Rules), as these are designed to execute externally in Node.js CI/CD pipelines.
- Remaining Features: $42 - 2 = 40$
- Fully Implemented Remaining: $30 - 2 = 28$
- **Strict Parity**:
  $$\text{Strict Parity} = \frac{28}{40} = 70.0000\% \implies \mathbf{70.00\%}$$
- **Weighted Parity**:
  $$\text{Weighted Parity} = \frac{28 + (7 \times 0.5)}{40} = \frac{31.5}{40} = 78.7500\% \implies \mathbf{78.75\%}$$

---

## 6. Quarantined & Blocked Components Status

Under **DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)**:
1. **`daRefactoringEngine` (`COMP-04` / Task `W9-1`):** Pure topological graph simulation implementing Tarjan SCC in client-side JavaScript. Verified offline via `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`. Exists in `force-app/main/default/lwc/daRefactoringEngine/` but is strictly **unimported and unmounted** in `daAppShell`. Status: **NOT IN APPROVED SCOPE** (Quarantined).
2. **`daRefactorHandoffModal` (`COMP-02` / Task `W9-3`):** Refactoring export modal implementing Markdown/JSON simulation disclaimers. Exists in `force-app/main/default/lwc/daRefactorHandoffModal/` but is strictly **unimported and unmounted** in `daAppShell`. Status: **NOT IN APPROVED SCOPE** (Quarantined).
3. **Governance Mandate:** These components cannot be integrated, imported, or counted towards parity completion until formal executive dispatch authorization is executed by the Project Owner.

---

## 7. Residual Gaps & Target Dispositions

1. **Category (a) - Subsumed Views (5 Items):** Confirmed fully satisfied by composite components (`daSidebar`, `daInvestigationDrawer`, `daHotspotsView`, `daMatrixView`, `daGraphViewer`). No further LWC creation required.
2. **Category (b) - Subfeatures of Existing LWCs (6 Items):**
   - `GAP-B01` (`INV-06`, Deep-link URL sync): Assign to Integration Coordinator under `REM-04`.
   - `GAP-B02` (`INV-08`, Keyboard shortcuts): Assign to Workstream 1 for shell listener and help dialog.
   - `GAP-B03` (`INV-09`, Large graph bounds): Assign to Release Engineering under `REM-01` (scratch org benchmark).
   - `GAP-B04` (`COMP-05`, Project creation modal): Retain read-only project selector; file creation modal deferred.
   - `GAP-B05` (`COMP-06`, Multi-criteria filter overlay): Mount `daPresetManager` in `daAppShell`.
   - `GAP-B06` (`COMP-07`, Hover cards): Low priority; click-to-drawer workflow satisfies investigation needs.
   - `GAP-B07` (`PERSIST-02`, Saved views persistence): Wire `daPresetManager` save/load events in `daAppShell`.
3. **Category (c) - Separate New Views / Workflows (4 Items):**
   - `GAP-C01` (`VIEW-02`, Compare Mode): Authorize `daSnapshotComparisonModal` under `REM-03`.
   - `GAP-C02` (`VIEW-11`, Sankey River): Retain DEFERRED status under `REM-02` pending static resource security audit.
   - `GAP-C03` (`COMP-02`, Refactor Modal): Retain QUARANTINED status under DEC-04 Alt 4.
   - `GAP-C04` (`COMP-03`, Command Palette): Deferred to post-migration enhancements.
   - `GAP-C05` (`COMP-04`, Refactoring Engine): Retain QUARANTINED status under DEC-04 Alt 4.
4. **Category (d) - External Node.js Tools (2 Items):**
   - Retained permanently in Node.js CI/CD pipeline outside Salesforce per architectural boundary.

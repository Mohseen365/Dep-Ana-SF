# Updated Salesforce Migration — Gap Register

**Document Role:** Feature Parity Auditor (Agent B3)
**Execution Branch:** `wave1/B3` (Commit: `50ff34175f25d90757aba85be52e6b7f116e8a55`)
**Governance Baseline:** DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)

---

## 1. Executive Summary & Audit Overview

Following the Central Coordinator Integration and Workstream 1–6 implementations, this register provides an exhaustive, classified inventory of all residual gaps between the React Dependency Analyzer (`explorer/src/`) and the Salesforce POC codebase (`scratch/salesforce-poc/`).

All gaps are classified into one of four mandatory architectural categories:
- **Category (a):** Already covered by an existing Salesforce view or composite component.
- **Category (b):** Subfeature of an existing component requiring incremental wiring or UI overlay.
- **Category (c):** Separate new view or workflow needing explicit governance authorization.
- **Category (d):** External Node.js capability that remains outside Salesforce per the architectural boundary.

---

## 2. Categorized Gap Inventory

### Category (a): Already Covered by Existing Salesforce Views (5 Features)

| Gap ID | Feature ID | Feature Name | How Covered by Salesforce Implementation | Source References |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-A01** | `VIEW-06` | Constellation Mode | Fully covered by `daLayoutEngine.js` (`computeConstellationLayout`) and selectable directly within `daGraphViewer` Cytoscape canvas as a first-class layout mode. | `daLayoutEngine.js:154`, `daGraphViewer.js:345` |
| **GAP-A02** | `VIEW-07` | Tree View | Fully covered by `daSidebar` LWC, which renders an interactive component inventory hierarchy with layer categorization, quick filtering, favorites pinning, and node selection. | `daSidebar.html:64-94`, `daSidebar.js:88-124` |
| **GAP-A03** | `VIEW-10` | Coupling Heatmap | Fully covered across `daHotspotsView` (color-coded risk intensity ranking) and `daMatrixView` (N x N dependency density grid). Standalone heatmap view is subsumed. | `daHotspotsView.html:20`, `daMatrixView.html:15` |
| **GAP-A04** | `VIEW-13` | Component Profile | Fully covered by `daInvestigationDrawer` Overview tab, which displays comprehensive fan-in, fan-out, LOC, cyclomatic complexity, and risk factor breakdown for the selected component. | `daInvestigationDrawer.html:35-85`, `daInvestigationDrawer.js:140-185` |
| **GAP-A05** | `VIEW-15` | 4-Direction Expansion | Fully covered by `daInvestigationDrawer` Connections tab, which provides interactive 1-hop upstream and downstream dependency expansion and historical drilldown trails while preserving `SELECTION != NAVIGATION`. | `daInvestigationDrawer.html:86-120`, `daInvestigationDrawer.js:186-230` |

### Category (b): Subfeatures of Existing Components (6 Features)

| Gap ID | Feature ID | Feature Name | Parent Component | Missing Subfeature / Required Action | REM Mapping |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **GAP-B01** | `INV-06` | Deep-Link URL State Restoration | `daAppShell` | Wire `lightning-navigation` PageReference state to serialize/deserialize `c__viewMode`, `c__nodeId`, and `c__projectId` with browser query parameters. | `REM-04` |
| **GAP-B02** | `INV-08` | Accessibility & Keyboard Navigation | `daAppShell`, `daSidebar` | Implement keyboard listeners for global hotkeys (`Cmd+K`, `Escape` to close drawer, arrow key navigation) and keyboard shortcuts help modal. | `REM-none` |
| **GAP-B03** | `INV-09` | Large-Graph Performance Bounds | `daGraphViewer` | Cytoscape zoom listeners toggle LOD CSS classes (`zoom-far`, `zoom-mid`, `zoom-near`), but Web Worker offloading is restricted by LWS. Live-org 500+ node FPS validation required. | `REM-01` |
| **GAP-B04** | `COMP-05` | Project Selector Modal | `daProjectSelector`, `daHeader` | `daProjectSelector` handles dropdown switching across existing `DA_Project__c` records, but the project creation/manifest import modal (`ProjectCreationModal.tsx`) is missing. | `REM-none` |
| **GAP-B05** | `COMP-06` | Search & Filter Overlay | `daAppShell`, `daPresetManager` | `daHeader` has search input and `daSidebar` has layer filters; standalone multi-criteria filter overlay exists as unmounted `daPresetManager` and needs integration into `daAppShell`. | `REM-none` |
| **GAP-B06** | `COMP-07` | Node & Edge Hover Cards | `daGraphViewer` | Cytoscape canvas currently relies on click selection to open `daInvestigationDrawer`. Rich hover tooltips displaying quick risk reasons and line evidence are missing on mouseover. | `REM-none` |
| **GAP-B07** | `PERSIST-02`| Saved Views Persistence | `daPresetManager` | Preset persistence logic exists in `daPresetManager` using `daFilterSchema.js` and `DA_User_Preference__c`, but requires mounting into `daAppShell` or dedicated custom object. | `REM-none` |

### Category (c): Separate New Views Needing Authorization (4 Features)

| Gap ID | Feature ID | Feature Name | Description & Architectural Blockers | REM Mapping | Governance Status |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **GAP-C01** | `VIEW-02` | Compare Mode | Dual-run selection exists in `daAnalysisHistory` emitting `comparelaunch`, but no side-by-side or diff visualization modal/container is mounted in `daAppShell`. | `REM-03` | Deferred pending coordinator path allocation (`daSnapshotComparisonModal`) |
| **GAP-C02** | `VIEW-11` | Dependency River | Flow layout math is ported in `daLayoutEngine.js` (`computeSankeyLayout`), but standalone SVG Sankey River view is deferred to prevent unapproved external D3 static resources. | `REM-02` | Deferred pending static resource security review (`daSankeyView` / BLK-02) |
| **GAP-C03** | `COMP-02` | Refactor Handoff Modal | LWC `daRefactorHandoffModal` exists in the codebase but is unmounted in `daAppShell` under DEC-04 Alt 4 governance. | `REM-none` | **IMPLEMENTED_UNAUTHORIZED_QUARANTINED** (W9-3) |
| **GAP-C04** | `COMP-03` | Command Palette | Keyboard-driven command palette modal (`Cmd+K`) for rapid view switching and fuzzy component search not implemented in LWC. | `REM-none` | Not started; requires new LWC modal bundle |
| **GAP-C05** | `COMP-04` | Refactoring Simulation Panel | Pure topological Tarjan SCC graph simulation implemented in `daRefactoringEngine.js` but unmounted in `daAppShell` under DEC-04 Alt 4. | `REM-none` | **IMPLEMENTED_UNAUTHORIZED_QUARANTINED** (W9-1) |

### Category (d): External Node.js Capabilities Retained Outside Salesforce (2 Features)

| Gap ID | Feature ID | Feature Name | External Node.js Capability | Architectural Boundary Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-D01** | `CLI-01` | Deterministic Export & CLI Forwarding | TypeScript AST parsing, filesystem dependency graph extraction (`scripts/export-explorer.cjs`, `analyze/`). | Retained outside Salesforce. Apex lacks direct filesystem and TypeScript compiler API access; payloads are ingested via chunked JSON service (`DAGraphIngestionService.cls`). |
| **GAP-D02** | `CLI-02` | Architecture Quality Gates & Debt Rules | Static debt calculation, smell detection, quality gate enforcement (`architecture-quality-gates.cjs`, `architecture-debt.cjs`). | Retained in Node.js CI/CD pipeline to avoid governor limits on large codebases. Summary metrics and findings are pushed to Salesforce custom objects (`DA_Finding__c`). |

---

## 3. Mapping to Remaining-Work Register (`REM-01` .. `REM-05`)

| Remaining Item | Name | Owner | Related Gap IDs | Target Action |
| :--- | :--- | :--- | :--- | :--- |
| **REM-01** | Live Scratch Org & Target Org Acceptance | Release Engineering | `GAP-B03` (`INV-09`) | Validate Cytoscape canvas and LWC bundles under live Lightning Web Security (LWS) in an authenticated scratch org. |
| **REM-02** | Sankey River View (`daSankeyView`) | Workstream 4 | `GAP-C02` (`VIEW-11`) | Authorize pure SVG implementation or secure static resource for inter-layer flow visualizer. |
| **REM-03** | Standalone Snapshot Comparison Modal | Workstream 5 | `GAP-C01` (`VIEW-02`) | Implement diff comparison modal consuming `comparelaunch` event from `daAnalysisHistory`. |
| **REM-04** | Dynamic Lightning URL Parameter Sync | Integration Coordinator | `GAP-B01` (`INV-06`) | Wire `lightning/navigation` in `daAppShell` for bidirectional query param synchronization. |
| **REM-05** | Graph Canvas PNG/SVG Export Action | Workstream 2 | N/A (Graph Tooling) | Add canvas export button in `daGraphViewer` to download Cytoscape viewport as image. |

---

## 4. Quarantined Components Governance Log

- **Rule:** Wave 9 refactoring engine components (`W9-1`, `W9-3`) are strictly designated as **IMPLEMENTED_UNAUTHORIZED_QUARANTINED** under **DEC-04 Alternative 4**.
- **Source State:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js`: Exists, 281 lines, Tarjan SCC algorithm implemented.
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js`: Exists, 185 lines, Markdown/JSON export implemented.
- **Integration State:** Neither component is imported, referenced, or mounted in `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` or `daAppShell.html`.
- **Audit Verdict:** Quarantined components are strictly excluded from parity percentages and held pending explicit Project Owner signoff.

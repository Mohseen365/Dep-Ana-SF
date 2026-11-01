# Report 8: Salesforce Migration Dependency and Execution Roadmap

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit (Implementation Authorized: NO)

---

## 1. Roadmap Architecture & Sequencing Principles

To achieve complete functional parity between the original Dependency Analyzer and Salesforce without regressions, future work must follow a strictly ordered dependency sequence:

1. **Preserve Wave 4 Baseline:** All existing 32 Wave 4 integration tests must remain green.
2. **Foundational Graph & Layout Capabilities First:** Connect already-ported layout algorithms and expand graph controls before building new visual views.
3. **High-Value Views Next:** Port analytical views that consume existing graph data models (Radar, Treemap, Subway).
4. **Complex Workflows & State Engines Last:** Implement refactoring simulation, compare, and investigation workbenches.

---

## 2. Proposed Implementation Waves

### Wave 5: Deep Graph Capabilities & Layout Activation (Priority: P1)
- **Objective:** Activate ported layout engines and bring `daGraphViewer` to full feature parity with `GraphControls.tsx`.
- **Scope:**
  - Add layout switcher UI to `daAppShell` (enabling Orbit, Constellation, and Sankey layouts from `daLayoutEngine`).
  - Add Focus Controls (`FocusControls.tsx`, `focus-graph.ts`) to `daGraphViewer` for upstream/downstream subgraph isolation.
  - Add Impact Analysis Controls (`ImpactControls.tsx`, `impact-analysis.ts`) for blast radius highlighting.
  - Implement dynamic node/edge hover cards in `daGraphViewer`.
- **Dependencies:** `daAppShell.js`, `daGraphViewer.js`, `daLayoutEngine.js`.
- **Acceptance Criteria:** Users can switch between 4 layout algorithms; selecting a node permits 1-click upstream/downstream focus filtering.

### Wave 6: Core Analytical Views Migration (Priority: P1 / P2)
- **Objective:** Implement the top 4 high-value analytical lenses in Salesforce LWC.
- **Scope:**
  - `daRadarView` (Port of `RadarPanel.tsx` / Health radar polygon metrics).
  - `daTreemapView` (Port of `ArchitectureTreemapPanel.tsx` / Squarified component packing).
  - `daSubwayView` (Port of `SubwayPanel.tsx` / Feature transit line map).
  - `daHotspotsView` (Port of `HotspotPanel.tsx` / High-risk component ranking).
- **Dependencies:** `daAppShell` tab bar expansion (`APPROVED_VIEWS`), shared payload binding.
- **Acceptance Criteria:** Four new tabs mounted in `daAppShell`, receiving shared payload and canonical filter criteria.

### Wave 7: Architecture Diagnostics, DNA & History (Priority: P2)
- **Objective:** Implement diagnostic surfaces and temporal analysis views.
- **Scope:**
  - `daDiagnosticsView` (Port of `DiagnosticsPanel.tsx` / Unresolved references, cycle tables).
  - `daDnaView` (Port of `ArchitectureDNABarcode.tsx` / Architectural signature).
  - `daHistoryView` (Port of `AnalysisHistoryPanel.tsx` / Historical run browser backed by `DA_Analysis_Run__c` queries).
- **Dependencies:** Apex selector for historical runs (`DAGraphController.cls`).
- **Acceptance Criteria:** Users can browse previous analysis runs and inspect unresolved symbol diagnostics.

### Wave 8: Investigation Workbench & Interactive Compare (Priority: P2 / P3)
- **Objective:** Port multi-component investigation workflow and snapshot diffing.
- **Scope:**
  - `daInvestigationDrawer` (Port of `InvestigationDrawer.tsx` / Pinning nodes to multi-item investigation).
  - `daCompareView` (Port of `ComparePanel.tsx` and `graph-diff.ts` / Structural diff between 2 snapshots).
- **Dependencies:** `daAppShell` state management, dual-snapshot payload loading.
- **Acceptance Criteria:** Users can select two snapshot runs and visualize added/removed nodes and edge mutations.

### Wave 9: Refactoring Simulation & Autonomous Handoff (Priority: P3)
- **Objective:** Port hypothetical refactoring engine and action handoff.
- **Scope:**
  - Port `change-simulator.ts` and `refactoring-simulation.ts` to client-side LWC.
  - Implement `daRefactorModal` (Port of `RefactorHandoffModal.tsx`).
- **Dependencies:** Cytoscape client-side node mutation handling.
- **Acceptance Criteria:** Users can simulate component extraction or deletion and view real-time blast radius calculations.

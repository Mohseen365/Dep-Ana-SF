# Phase 3 Deliverable 11: Authoritative Implementation Roadmap

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This roadmap establishes the authoritative implementation specification for Waves 5 through 9. Each task defines exact source references, target files, prerequisites, data contracts, acceptance criteria, test requirements, and risk mitigation strategies.

---

## 2. Wave 5: Deep Graph Capabilities & Layout Activation

**Objective:** Activate existing ported layout algorithms in `daLayoutEngine.js` and implement essential graph inspection controls in `daGraphViewer`.
**Prerequisites:** Wave 4 Phase 3 sign-off.
**Backend / Data Model Changes:** None.
**Sequential Tasks:**

### Task W5-T1: Shell Layout Mode Switcher & Dynamic Layout Rendering
- **Source Dependencies:** `explorer/src/components/ViewModeSwitcher.tsx`, `explorer/src/lib/views.ts`
- **Salesforce Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js/.html`, `daGraphViewer/daGraphViewer.js`
- **Data Contract:** Emits `layoutchange` event with payload `{ layoutMode: "hierarchical" | "orbit" | "constellation" | "sankey" }`.
- **Acceptance Criteria:**
  - Layout button group in `daAppShell` toggles layout mode.
  - `daGraphViewer` dispatches to `computeArchitectureLayout`, `computeOrbitLayout`, `computeConstellationLayout`, or `computeSankeyLayout`.
  - Manual dragged node positions (`Positions_JSON__c`) are respected or safely reset based on layout mode.
- **Verification:** Unit tests in `run-poc-tests.cjs` verifying layout switching without Cytoscape teardown leaks.

### Task W5-T2: Subgraph Focus & Traversal Controls
- **Source Dependencies:** `explorer/src/components/FocusControls.tsx`, `explorer/src/lib/focus-graph.ts`
- **Salesforce Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js/.html`
- **Acceptance Criteria:**
  - Upstream, downstream, and immediate neighborhood isolation buttons in viewer toolbar.
  - Non-matching nodes hidden or dimmed using Cytoscape classes (`.faded`).
  - Active selection preserved (`SELECTION ≠ NAVIGATION` invariant strictly upheld).

### Task W5-T3: Impact Analysis & Blast Radius Controls
- **Source Dependencies:** `explorer/src/components/ImpactControls.tsx`, `explorer/src/lib/impact-analysis.ts`
- **Salesforce Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js/.html`
- **Acceptance Criteria:**
  - Toggle button triggers blast radius calculation from `selectedNodeId`.
  - Displays direct dependents count, transitive dependents count, and cumulative risk.

### Task W5-T4: Dynamic Node & Edge Hover Cards
- **Source Dependencies:** `explorer/src/components/graph-internals/NodeHoverCard.tsx`, `EdgeHoverCard.tsx`
- **Salesforce Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
- **Acceptance Criteria:**
  - Hovering a node displays SLDS popover with component name, domain, layer, coupling metrics, and test coverage state.
  - Disconnect or mouseout dismisses hover card cleanly.

---

## 3. Wave 6: Core Analytical Views Migration

**Objective:** Deliver 4 specialized analytical views consuming the shared graph payload.
**Prerequisites:** Wave 5 completion.
**Parallel Feature Lanes:**

### Task W6-T1 (Lane A): Architecture Radar View (`c/daRadarView`)
- **Source:** `explorer/src/components/RadarPanel.tsx`, `explorer/src/lib/adapters/radar-adapter.ts`
- **Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/`
- **Acceptance Criteria:** Renders 5-axis SVG spider chart evaluating Complexity, Coupling, Coverage, Cohesion, and Risk.

### Task W6-T2 (Lane B): Architecture Treemap View (`c/daTreemapView`)
- **Source:** `explorer/src/components/ArchitectureTreemapPanel.tsx`, `explorer/src/lib/adapters/treemap-adapter.ts`
- **Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/`
- **Acceptance Criteria:** Renders squarified SVG rectangles proportional to component complexity and package size.

### Task W6-T3 (Lane C): Subway Transit View (`c/daSubwayView`)
- **Source:** `explorer/src/components/SubwayPanel.tsx`, `explorer/src/lib/adapters/subway-adapter.ts`
- **Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/`
- **Acceptance Criteria:** Visualizes feature execution paths as colored transit subway lines with interchange nodes.

### Task W6-T4 (Lane D): Hotspots & Risk View (`c/daHotspotsView`)
- **Source:** `explorer/src/components/HotspotPanel.tsx`, `explorer/src/lib/hotspots.ts`
- **Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/`
- **Acceptance Criteria:** Renders ranked datatable of structural risk hubs with coupling > 15 and untested status.

---

## 4. Wave 7: Diagnostics, Architecture DNA & Analysis History

**Objective:** Expand governance surfaces and introduce historical analysis browsing.
**Prerequisites:** Wave 6 completion.

### Prerequisite Task W7-P1: Apex Historical Runs API
- **Target:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- **Method Signature:**
  ```apex
  @AuraEnabled(cacheable=true)
  public static List<DA_Analysis_Run__c> getAnalysisRuns(Id projectId)
  ```
- **Security:** Must enforce `WITH USER_MODE`, null project ID check, and order by `CreatedDate DESC LIMIT 50`.
- **Test Requirement:** `DAGraphControllerTest.cls` test coverage >= 90%.

### Task W7-T1: Diagnostics Surface (`c/daDiagnosticsView`)
- **Source:** `explorer/src/components/DiagnosticsPanel.tsx`
- **Acceptance Criteria:** Displays structural integrity summary: unresolved dependencies, cycle details, and orphaned nodes.

### Task W7-T2: Architecture DNA Barcode (`c/daArchitectureDnaBarcode`)
- **Source:** `explorer/src/components/ArchitectureDNABarcode.tsx`, `explorer/src/lib/adapters/dna-adapter.ts`
- **Acceptance Criteria:** Renders visual barcode strips representing component architectural layers and risk scores.

### Task W7-T3: Analysis History Timeline (`c/daAnalysisHistoryPanel`)
- **Source:** `explorer/src/components/AnalysisHistoryPanel.tsx`, `explorer/src/lib/projectHistory.ts`
- **Acceptance Criteria:** Displays chronological timeline of runs retrieved from `getAnalysisRuns`, showing run date, commit hash, node/edge counts.

---

## 5. Wave 8: Investigation Drawer & Snapshot Compare

**Objective:** Enable deep multi-node investigation and visual diff comparison across two analysis runs.
**Prerequisites:** Wave 7 completion.

### Task W8-T1: Investigation Drawer & Node Pinning (`c/daInvestigationDrawer`)
- **Source:** `explorer/src/components/InvestigationDrawer.tsx`, `explorer/src/context/InvestigationContext.tsx`
- **Acceptance Criteria:** Slide-out SLDS drawer allowing users to pin multiple nodes, compare properties side-by-side, and inspect call chains.

### Task W8-T2: Dual-Snapshot Payload Loader & Diff Engine (`c/daCompareView`)
- **Source:** `explorer/src/components/ComparePanel.tsx`, `explorer/src/lib/graph-diff.ts`
- **Acceptance Criteria:**
  - Loads two independent run IDs without cross-contamination.
  - Computes additions, removals, and edge modifications.
  - Renders split view or overlaid color diff with memory safety bounds.

---

## 6. Wave 9: Refactoring Simulation & Proposal Handoff

**Objective:** What-if architectural simulation enabling engineers to test node extractions and export refactoring proposals.
**Prerequisites:** Wave 8 completion.

### Task W9-T1: In-Memory Refactoring Sandbox (`c/daRefactoringSimulator`)
- **Source:** `explorer/src/components/RefactoringSimulationPanel.tsx`, `explorer/src/lib/refactoring-simulation.ts`
- **Acceptance Criteria:**
  - Clones graph in-memory without altering persisted records.
  - Simulates node deletion, recalculates blast radius, and graphs projected health score.

### Task W9-T2: Refactoring Handoff Modal (`c/daRefactorHandoffModal`)
- **Source:** `explorer/src/components/RefactorHandoffModal.tsx`, `explorer/src/lib/refactor-handoff.ts`
- **Acceptance Criteria:** Generates exportable Markdown/JSON proposal detailing impacted classes, proposed steps, and expected metric improvement.

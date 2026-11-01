# Wave 0: Parallel Workstream Breakdown (Waves 5 through 9)

**Status:** APPROVED FOR CONCURRENT DISPATCH
**Coordinator:** Technical Program Coordinator & Solution Architect
**Scope:** Waves 5, 6, 7, 8, and 9

---

## 1. Workstream Overview

To execute the React-to-Salesforce migration with high velocity while maintaining zero merge conflicts, the remaining capabilities are divided into five concurrent workstreams:

- **Workstream A (Wave 5):** Deep Graph Capabilities & Layout Activation
- **Workstream B (Wave 6):** Core Analytical Views (Radar, Treemap, Subway, Hotspots)
- **Workstream C (Wave 7):** Diagnostics, Architecture DNA & Analysis History
- **Workstream D (Wave 8):** Investigation Drawer & Snapshot Comparison
- **Workstream E (Wave 9):** Refactoring Simulation & Proposal Handoff

---

## 2. Workstream A — Wave 5: Deep Graph Capabilities & Layout Activation

**Lead Lane:** Lane A (Graph Specialist)
**Objective:** Activate advanced Cytoscape layouts and interactive graph traversal directly within `daGraphViewer`.

### Task Breakdown
- **Task W5-1: Shell Layout Switcher Activation**
  - *React Reference:* `explorer/src/components/ViewModeSwitcher.tsx`, `explorer/src/lib/views.ts`
  - *Target Files:* `daGraphViewer.js`, `daGraphViewer.html`, `daGraphViewer.css`
  - *Input Contract:* Contract W0-C4, saved `layoutMode` preference.
  - *Output:* Interactive toolbar switching among Architecture, Orbit, Constellation, and Sankey layouts.
  - *Acceptance Criteria:* Layout switching cleanly updates Cytoscape positions without reloading raw payload or corrupting manual position overrides.
- **Task W5-2: Orbit Layout Activation (Distinguished from Radar View)**
  - *React Reference:* `explorer/src/lib/adapters/component-orbit-adapter.ts`, `daLayoutEngine.js`
  - *Target Files:* `daGraphViewer.js`, `daLayoutEngine.js`
  - *Input Contract:* Nodes and edges from `CanonicalGraphPayload`.
  - *Output:* Radial concentric ring layout centered on highest-criticality or selected node. Note: Distinct from Workstream B Radar Analytical View.
- **Task W5-3: Constellation & Sankey Layout Activation**
  - *React Reference:* `explorer/src/lib/adapters/constellation-adapter.ts`, `explorer/src/lib/adapters/sankey-adapter.ts`
  - *Target Files:* `daGraphViewer.js`, `daLayoutEngine.js`
  - *Output:* Clustered architectural constellation projection and multi-stage flow layout.
- **Task W5-4: Directional Traversal & Neighborhood Focus**
  - *React Reference:* `explorer/src/components/FocusControls.tsx`, `explorer/src/lib/focus-graph.ts`
  - *Target Files:* `daGraphViewer.js`, `daGraphViewer.html`
  - *Input Contract:* Contract W0-C2 (`SELECTION ≠ NAVIGATION`).
  - *Output:* Upstream focus, Downstream focus, and $N$-hop neighborhood isolation.
- **Task W5-5: Blast Radius & Impact Analysis**
  - *React Reference:* `explorer/src/components/ImpactControls.tsx`, `explorer/src/lib/impact-analysis.ts`
  - *Target Files:* `daGraphViewer.js`
  - *Output:* Transitive impact propagation overlay and blast-radius score badge.
- **Task W5-6: Accessible Node & Edge Hover Cards**
  - *React Reference:* `explorer/src/components/graph-internals/NodeHoverCard.tsx`, `EdgeHoverCard.tsx`
  - *Target Files:* `daGraphViewer.html`, `daGraphViewer.css`, `daGraphViewer.js`
  - *Output:* Popover card displaying metrics (fanIn, fanOut, coverage, risk) on pointer hover with unmount safety.

---

## 3. Workstream B — Wave 6: Core Analytical Views

**Lead Lane:** Lane B (Analytical Views Specialist)
**Objective:** Deliver four independent analytical views as distinct LWC components consuming shared graph payloads and canonical filters.

### Task Breakdown
- **Task W6-1: Radar Analytical View (`daRadarView`)**
  - *React Reference:* `explorer/src/components/RadarPanel.tsx`, `explorer/src/lib/adapters/radar-adapter.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/` (`daRadarView.js`, `.html`, `.css`, `.js-meta.xml`)
  - *Input Contract:* Contract W0-C1 (Graph Payload), Contract W0-C3 (Canonical Filters).
  - *Output:* Multi-axis polygon/radar chart displaying architectural balance across complexity, coupling, coverage, and risk.
- **Task W6-2: Architecture Treemap View (`daTreemapView`)**
  - *React Reference:* `explorer/src/components/ArchitectureTreemapPanel.tsx`, `explorer/src/lib/adapters/treemap-adapter.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/` (`daTreemapView.js`, `.html`, `.css`, `.js-meta.xml`)
  - *Output:* Nested rectangle hierarchy partitioned by architectural layer and sized by lines-of-code (LOC) or coupling.
- **Task W6-3: Architectural Subway Map View (`daSubwayView`)**
  - *React Reference:* `explorer/src/components/SubwayPanel.tsx`, `explorer/src/lib/adapters/subway-adapter.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/` (`daSubwayView.js`, `.html`, `.css`, `.js-meta.xml`)
  - *Output:* Linear multi-line transit map abstraction of core application execution flows and transfer stations.
- **Task W6-4: Hotspots & High-Risk View (`daHotspotsView`)**
  - *React Reference:* `explorer/src/components/HotspotPanel.tsx`, `explorer/src/lib/hotspots.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/` (`daHotspotsView.js`, `.html`, `.css`, `.js-meta.xml`)
  - *Output:* Ranked card/table view isolating structural risk clusters (`coupling > 15 || fanIn > 10`) and untested critical nodes.

---

## 4. Workstream C — Wave 7: Diagnostics, Architecture DNA & Analysis History

**Lead Lane:** Lane C (Data & Diagnostics Specialist)
**Objective:** Deliver architectural health scorecards, genomic DNA barcodes, and multi-snapshot historical analysis.

### Task Breakdown
- **Task W7-P1: Apex Prerequisite — Historical Analysis Runs Endpoint**
  - *Target Files:* `DAGraphController.cls`, `DAGraphControllerTest.cls`
  - *Security:* `WITH USER_MODE`, strict `projectId` scoping, pagination bounds (`maxRuns <= 100`).
  - *Output:* `@AuraEnabled(cacheable=true) public static List<DA_Analysis_Run__c> getAnalysisRuns(String projectId, Integer maxRuns)`.
- **Task W7-1: System Diagnostics & Health Scorecard (`daDiagnosticsView`)**
  - *React Reference:* `explorer/src/components/DiagnosticsPanel.tsx`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/`
  - *Output:* Overall architectural grade, cycle count, orphan node count, and unresolved reference ledger.
- **Task W7-2: Architecture DNA Barcode (`daDnaBarcode`)**
  - *React Reference:* `explorer/src/components/ArchitectureDNABarcode.tsx`, `explorer/src/lib/adapters/dna-adapter.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daDnaBarcode/`
  - *Output:* Compressed visual barcode ribbon encoding layer distribution, risk spectrum, and stability index.
- **Task W7-3: Historical Analysis Run Browser (`daAnalysisHistoryView`)**
  - *React Reference:* `explorer/src/components/AnalysisHistoryPanel.tsx`, `explorer/src/lib/projectHistory.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/`
  - *Output:* Chronological run timeline displaying timestamp, commit metadata, finding counts, and run selection event.

---

## 5. Workstream D — Wave 8: Investigation Drawer & Snapshot Comparison

**Lead Lane:** Lane D (Investigation & Diff Specialist)
**Objective:** Multi-node pinning inspection drawer and memory-bounded snapshot diffing.

### Task Breakdown
- **Task W8-1: Investigation Drawer & Multi-Node Pinning (`daInvestigationDrawer`)**
  - *React Reference:* `explorer/src/components/InvestigationDrawer.tsx`, `explorer/src/context/InvestigationContext.tsx`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/`
  - *Output:* Slide-out inspection drawer maintaining pinned node sets, comparative metric tables, and path finding.
- **Task W8-2: Graph Snapshot Comparison Engine (`daDiffEngine.js`)**
  - *React Reference:* `explorer/src/lib/graph-diff.ts`, `explorer/src/lib/diff-adapter.ts`
  - *Target Module:* `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/daDiffEngine.js`
  - *Input Contract:* Run A (`CanonicalGraphPayload`) and Run B (`CanonicalGraphPayload`).
  - *Output:* Memory-safe structural delta (added/removed/modified nodes and edges) without dual Cytoscape instances.
- **Task W8-3: Snapshot Compare View (`daCompareView`)**
  - *React Reference:* `explorer/src/components/ComparePanel.tsx`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/`
  - *Output:* Visual delta view displaying added entities (green), removed entities (red), and modified metrics (amber).

---

## 6. Workstream E — Wave 9: Refactoring Simulation & Proposal Handoff

**Lead Lane:** Lane E (Refactoring Specialist)
**Objective:** In-memory what-if structural simulation and actionable proposal handoff.

### Task Breakdown
- **Task W9-1: In-Memory Refactoring Engine (`daRefactoringEngine.js`)**
  - *React Reference:* `explorer/src/lib/refactoring-simulation.ts`
  - *Target Module:* `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js`
  - *Input Contract:* Contract W0-C8 (Immutability, Deep Cloning).
  - *Output:* Pure client-side simulation engine computing coupling reductions and cycle elimination upon simulated removals.
- **Task W9-2: Refactoring Simulation Panel (`daRefactoringView`)**
  - *React Reference:* `explorer/src/components/RefactoringSimulationPanel.tsx`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/`
  - *Output:* Interactive staging area for queuing simulated node/edge removals and previewing projected architectural health score.
- **Task W9-3: Refactoring Proposal Export Modal (`daRefactorHandoffModal`)**
  - *React Reference:* `explorer/src/components/RefactorHandoffModal.tsx`, `explorer/src/lib/refactor-handoff.ts`
  - *Target Component:* `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/`
  - *Output:* Modal dialog generating formatted Markdown refactoring briefs, Jira-compatible tasks, and JSON proposals without Apex DML.

# Salesforce Migration Gap Register

This register details all architectural gaps, missing capabilities, and incomplete implementations identified during the repository-wide migration audit.

## Gap Inventory

### GAP-01: Lack of LWC Parity for 17 UI View Modes
- **Category:** Application UI & Feature Parity
- **Source Paths:** `explorer/src/components/workspace/*` (17 view panels including `ComparePanel`, `SubwayPanel`, `DependencyRiverPanel`, etc.)
- **Current State:** Only `GraphView` (Cytoscape canvas) is partially migrated in `daGraphViewer`. The other 17 views exist only in React/TSX.
- **Severity:** High
- **Priority:** P1
- **Missing Behavior:** Users in Salesforce cannot access 17 out of 18 analytical views (e.g., Snapshot Compare, Subway Map, Sankey River, DNA Barcode, Coupling Matrix, Radar Chart, Hotspots).
- **Required Fix:** Develop corresponding LWCs or modular child LWC components for each view mode.
- **Prerequisites:** Shared client-side layout engine (`daLayoutEngine`) and expanded DTO services (`DAHealthService`, `DAFindingService`).

### GAP-02: Missing Advanced Layout Algorithms in LWC
- **Category:** Geometry & Spatial Algorithms
- **Source Paths:** `explorer/src/lib/layout/` (`orbit-layout.ts`, `constellation-layout.ts`, `architecture-layout.ts`)
- **Current State:** LWC relies on standard Cytoscape layout layouts (`cose`, `grid`, `circle`). Orbit positioning, constellation spatial geometry, and layer hierarchy are not computed in LWC.
- **Severity:** High
- **Priority:** P1
- **Missing Behavior:** Constellation clusters and component orbit views fail to position nodes accurately in LWC.
- **Required Fix:** Port pure geometric layout routines into a reusable client-side LWC JavaScript utility library (`daLayoutEngine`).
- **Prerequisites:** None. Pure TypeScript to JS porting.

### GAP-03: Absent Dynamic URL State & Navigation Synchronization
- **Category:** Navigation & User State
- **Source Paths:** `explorer/src/lib/projectState.ts`, deep-linking logic
- **Current State:** Selecting nodes or switching views in `daGraphViewer` does not update Lightning URL state parameters or maintain deep-link integrity (`SELECTION ≠ NAVIGATION` invariant).
- **Severity:** Medium
- **Priority:** P2
- **Missing Behavior:** Users cannot bookmark, share, or deep-link to specific selected node clusters or active view modes within Lightning Experience.
- **Required Fix:** Implement `lightning/navigation` state synchronization in `daGraphViewer` using Lightning page parameters and `DA_User_Preference__c` records.
- **Prerequisites:** GAP-01.

### GAP-04: Node.js Static Analysis File System Access Outside Salesforce
- **Category:** Analysis Engine & Architecture Boundary
- **Source Paths:** `scripts/dependency-analyzer.cjs`, AST parsers
- **Current State:** Source code AST parsing and repository directory scanning require Node.js file system APIs which cannot execute inside Salesforce Apex.
- **Severity:** Medium
- **Priority:** P2
- **Missing Behavior:** Direct scanning of raw source code files cannot occur natively inside a Salesforce scratch org or production org.
- **Required Fix:** Designate a formal external Node.js Analysis Service that parses repositories, generates `ExplorerDataSchema` JSON, and pushes payloads via REST API to `DAGraphIngestionService.cls`.
- **Prerequisites:** API authentication & Named Credential configuration.

### GAP-05: Unmigrated Refactoring Simulation & Impact Analysis
- **Category:** Interactive Workflows
- **Source Paths:** `explorer/src/lib/refactoring-simulation.ts`, `RefactoringSimulationPanel.tsx`
- **Current State:** Interactive "what-if" dependency deletion simulator is present only in React.
- **Severity:** Low
- **Priority:** P3
- **Missing Behavior:** Users cannot simulate removing a dependency edge to preview blast-radius reductions inside Salesforce.
- **Required Fix:** Port `simulateRefactoring` graph calculation logic into an LWC client worker module.
- **Prerequisites:** GAP-02.

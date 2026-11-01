# Wave 0: Next Dispatch Instructions for Parallel Implementation

**Status:** APPROVED ACTIONABLE LAUNCH SPECIFICATION
**Target:** Next Dispatch — Concurrent Execution of Waves 5, 6, 7, 8, and 9
**Integration Coordinator:** Centralized Shell & Governance Owner

---

## 1. Concurrent Execution Architecture

In the upcoming implementation dispatch, five parallel agents/lanes will be launched concurrently. This document provides the exact assignments, file boundaries, prerequisites, and acceptance criteria so that no lane needs to repeat repository discovery.

---

## 2. Lane-by-Lane Dispatch Directives

### 2.1 Lane A — Wave 5: Deep Graph Capabilities & Layout Activation
- **Task Scope:** W5-1 (Layout Switcher), W5-2 (Orbit Layout), W5-3 (Constellation & Sankey), W5-4 (Focus Controls), W5-5 (Impact Controls), W5-6 (Hover Cards).
- **Exclusive Files Owned:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/*`
  - `scratch/salesforce-poc/tests/run-wave5-deep-graph-tests.cjs` (New)
- **Prohibited Files:** `daAppShell.*`, `daFilterSchema.js`, `DAGraphController.*`.
- **Key Invariants:** Preserve `Positions_JSON__c` manual overrides, preserve viewport zoom/pan, ensure `SELECTION ≠ NAVIGATION`.

### 2.2 Lane B — Wave 6: Core Analytical Views
- **Task Scope:** W6-1 (Radar View), W6-2 (Treemap View), W6-3 (Subway View), W6-4 (Hotspots View).
- **Exclusive Files Owned (All New LWC Components):**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/*`
  - `scratch/salesforce-poc/tests/run-wave6-analytical-views-tests.cjs` (New)
- **Prohibited Files:** `daAppShell.*`, `daGraphViewer.*`, `DAGraphController.*`.
- **Contracts to Follow:** Contract W0-C1 (Graph Payload), Contract W0-C3 (Filter Predicates), Contract W0-C4 (View Registration).

### 2.3 Lane C — Wave 7: Diagnostics, Architecture DNA & History
- **Task Scope:** W7-P1 (Apex `getAnalysisRuns` Prerequisite), W7-1 (Diagnostics Scorecard), W7-2 (DNA Barcode), W7-3 (Analysis History View).
- **Exclusive Files Owned:**
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` (Task W7-P1 Exclusive)
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls` (Task W7-P1 Exclusive)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/*` (New)
  - `scratch/salesforce-poc/tests/run-wave7-diagnostics-tests.cjs` (New)
- **Prohibited Files:** `daAppShell.*`, `daGraphViewer.*`, `DAUserPreferenceController.*`.
- **Security Requirement:** Apex method must use `WITH USER_MODE`, enforce project scoping, cap at 100 runs.

### 2.4 Lane D — Wave 8: Investigation Drawer & Snapshot Compare
- **Task Scope:** W8-1 (Investigation Drawer), W8-2 (Diff Engine), W8-3 (Compare View).
- **Exclusive Files Owned:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/*` (New)
  - `scratch/salesforce-poc/tests/run-wave8-investigation-tests.cjs` (New)
- **Prohibited Files:** `daAppShell.*`, `daGraphViewer.*`, `DAGraphController.*`.
- **Memory Invariant:** No dual Cytoscape instances; execute diff via map-based graph difference.

### 2.5 Lane E — Wave 9: Refactoring Simulation & Proposal Handoff
- **Task Scope:** W9-1 (Refactoring Engine), W9-2 (Simulation View), W9-3 (Handoff Export Modal).
- **Exclusive Files Owned:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/*` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/*` (New)
  - `scratch/salesforce-poc/tests/run-wave9-refactoring-tests.cjs` (New)
- **Prohibited Files:** `daAppShell.*`, `daGraphViewer.*`, `DAGraphController.*`.
- **Immutability Invariant:** Deep-clone payload before simulation; zero Apex DML operations.

---

## 3. Centralized Shell Integration Protocol (Stage C)

The **Integration Coordinator** will execute Stage C after Lanes A through E produce passing offline unit test suites:
1. Mount views in `daAppShell.html` inside tab containers.
2. Bind `@api` payload, filter criteria, and selection properties in `daAppShell.js`.
3. Wire selection event handlers ensuring `SELECTION ≠ NAVIGATION`.
4. Run cross-wave regression suite and report final migration completion.

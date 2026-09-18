# Implementation Ownership Map (GRAPH_FILE_OWNERSHIP.md)

## Overview & System Invariants

This document establishes strict ownership boundaries for parallel execution and maintenance across all graph visualization, layout, synchronization, controls, investigation, state, and testing components.

### Shared & Integration Boundaries
1. **Shared / Integration Files:** `App.tsx`, `main.tsx`, `detached.tsx`, and `dependency-analyzer.cjs` serve as system integration points. They require cross-domain alignment and must be frozen during isolated domain parallel work.
2. **Read-Only Invariant:** Core backend analysis semantics (`dependency-analyzer.cjs`) and shared project schema (`explorer/src/types/explorer.ts`) are authoritative. Frontend domain owners must adapt to or extend existing types without breaking upstream contracts.
3. **Parallel Safety:** Files marked `PARALLEL-SAFE: YES` can be modified independently within their assigned ownership domain without risking merge conflicts or breaking external modules, provided public interface signatures remain backwards-compatible.

---

## 1. Domain Summary

| Domain Owner | Core Focus & Responsibilities |
|---|---|
| **state/persistence** | React Contexts, custom hooks, URL state serializers, project state persistence, history, schema definitions, and data loading adapters. |
| **layout algorithm** | Cytoscape layout algorithms (fCoSE / COSE / preset configurations) and node positioning strategy. |
| **GraphView/Cytoscape synchronization** | Cytoscape instance lifecycle, element creation, styling rules, hover overlays, edge/node rendering, and DOM canvas binding. |
| **controls/UI** | User interface components, headers, sidebars, status bars, modals, floating canvas control toolbars, command palette, and CSS styling. |
| **focus/filter/investigation** | Focus depth filtering, impact & connection analysis engines, search/filter algorithms, investigation drawer, and architectural intelligence rules. |
| **tests** | Unit, component, integration, and regression test suites. |
| **shared / integration** | Top-level application composition, mount roots, detached popouts, and authoritative analysis engines. |

---

## 2. File Ownership Breakdown

### 2.1 Domain: `state/persistence`

#### `explorer/src/context/ProjectContext.tsx`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Multi-project state provider wiring, project switching logic, project loading status, and active project state.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`, `explorer/src/hooks/useExplorerData.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/context/ProjectStateContext.tsx`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Project-scoped UI state management, local storage persistence per project ID, state reset listeners.
- **DEPENDENCIES:** `explorer/src/lib/projectState.ts`, `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/context/SelectionContext.tsx`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Selection state context provider, selected node/edge ID tracking, selection state dispatchers.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useCommandPalette.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Command palette open/close state, keyboard shortcut handlers (`⌘K`), command search state.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useCompareState.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Comparison snapshot selection, comparison mode state management, snapshot diffing triggers.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`, `explorer/src/lib/projectHistory.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useExplorerData.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Data fetching, project artifact resolution, HTTP status validation (NOT_ANALYZED handling), JSON parsing.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useGraphSelection.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Graph selection wrapper hook, selected node resolution, selection context helper functions.
- **DEPENDENCIES:** `explorer/src/context/SelectionContext.tsx`, `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useUserPreferences.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** High-contrast preferences, layout options persistence, user preference hooks.
- **DEPENDENCIES:** `explorer/src/lib/preferences.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/hooks/useViewState.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** URL query parameter synchronization, view mode state (`graph`, `findings`, `hotspots`, `impact`, `compare`), focus/impact parameter state.
- **DEPENDENCIES:** `explorer/src/lib/url/index.ts`, `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/projectHistory.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Project analysis snapshot timeline management, local storage persistence for analysis history, delta calculations between snapshots.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/projectState.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Project-scoped UI state schema definitions, local storage serialization under `explorer.projectState.<projectId>`.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/preferences.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Local storage serialization for global user preferences, contrast and theme helper utilities.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/index.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Combined URL query parameter parsing and serialization utilities.
- **DEPENDENCIES:** Sub-module URL query handlers (`filterQuery.ts`, `focusQuery.ts`, etc.)
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/connectionQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Connection analysis query parameter parsing and formatting.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/filterQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Filter query parameter parsing and formatting.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/findingsQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Findings query parameter parsing and formatting.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/focusQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Focus depth query parameter parsing and formatting.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/impactQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Impact depth and target query parameter parsing and formatting.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/url/investigationQuery.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Investigation drawer query parameter parsing and formatting.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/types/explorer.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Core data model type definitions (`ExplorerNode`, `ExplorerEdge`, `ExplorerData`), project metadata types, state types.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** NO (Shared Data Schema — Interface changes require notification across all domains)

#### `explorer-contract.ts`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Root TypeScript data contract definitions for explorer integration.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** NO (Shared Contract)

#### `scripts/export-explorer.cjs`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Data adapter script logic, JSON artifact transformation, artifact SHA-256 hash calculation, project manifest updates.
- **DEPENDENCIES:** `dependency-report.json`, `project-manifest.json`
- **PARALLEL-SAFE:** YES

#### `scripts/run-explorer.cjs`
- **OWNER:** state/persistence
- **ALLOWED CHANGES:** Workflow runner script logic, analysis freshness checks, process orchestration for launching explorer.
- **DEPENDENCIES:** `scripts/export-explorer.cjs`, `dependency-analyzer.cjs`
- **PARALLEL-SAFE:** YES

---

### 2.2 Domain: `layout algorithm`

#### `explorer/src/lib/graph-layout.ts`
- **OWNER:** layout algorithm
- **ALLOWED CHANGES:** Cytoscape layout configuration parameters (fCoSE layout settings, padding, edge length, node repulsion, animation, component packing), runLayout execution helper.
- **DEPENDENCIES:** Cytoscape.js, `cytoscape-fcose`
- **PARALLEL-SAFE:** YES

---

### 2.3 Domain: `GraphView/Cytoscape synchronization`

#### `explorer/src/components/GraphView.tsx`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Cytoscape React container component, canvas DOM mounting, lifecycle events, Cytoscape element synchronization, overlay composition.
- **DEPENDENCIES:** `explorer/src/lib/graph-builder.ts`, `explorer/src/lib/graph-style.ts`, `explorer/src/lib/graph-layout.ts`, `explorer/src/lib/graph-interactions.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/GraphLegend.tsx`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Floating color/shape legend overlay component, node/edge visual mapping key.
- **DEPENDENCIES:** `explorer/src/lib/graph-style.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/graph-internals/NodeHoverCard.tsx`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Hover card tooltip component for graph nodes, node metadata display.
- **DEPENDENCIES:** `explorer/src/lib/graph-builder.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Hover card tooltip component for graph edges, relationship details display.
- **DEPENDENCIES:** `explorer/src/lib/graph-builder.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/graph-internals/graph.css`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Internal styling for Cytoscape container, floating graph overlays, hover cards, minimap viewport, node/edge highlight styles.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/graph-builder.ts`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Transformation of `ExplorerNode` and `ExplorerEdge` arrays into Cytoscape element definitions, handling synthetic external nodes for unresolved edge targets.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/graph-interactions.ts`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Event listeners on Cytoscape core instance (tap, select, background click, zoom/fit), highlighting cycles/focus subgraphs, viewport fit utilities.
- **DEPENDENCIES:** Cytoscape.js, `explorer/src/types/explorer.ts`, `explorer/src/lib/graph-builder.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/graph-style.ts`
- **OWNER:** GraphView/Cytoscape synchronization
- **ALLOWED CHANGES:** Cytoscape stylesheet generation (`getGraphStyles`), node shapes by Salesforce entity type, risk border styling, edge line styles.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

---

### 2.4 Domain: `controls/UI`

#### `explorer/src/components/Header.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Application header navigation bar, title rendering, project selector container, quick actions, shortcut triggers.
- **DEPENDENCIES:** `explorer/src/components/ProjectSelector.tsx`, `explorer/src/components/ViewModeSwitcher.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/Sidebar.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Left component navigation sidebar container, dock/collapse animations, component list rendering.
- **DEPENDENCIES:** `explorer/src/components/SearchFilterPanel.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/StatusBar.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Bottom viewport status bar, node/edge count display, active workspace status text.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ViewModeSwitcher.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Main workspace view mode toggle buttons (Graph, Findings, Hotspots, Impact, Compare).
- **DEPENDENCIES:** `explorer/src/hooks/useViewState.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/GraphControls.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Floating canvas action toolbar (zoom in, zoom out, fit to screen, layout re-run, minimap toggle).
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/FocusControls.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Neighborhood focus depth selector controls (Depth 1, 2, 3, ALL).
- **DEPENDENCIES:** `explorer/src/lib/url/focusQuery.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ConnectionControls.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Connection analysis path search controls, source and target node selection inputs.
- **DEPENDENCIES:** `explorer/src/lib/url/connectionQuery.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ImpactControls.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Impact & blast radius depth controls, impact direction toggles.
- **DEPENDENCIES:** `explorer/src/lib/url/impactQuery.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/CommandPalette.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Command palette dialog UI, search input, command list rendering, shortcut key badges.
- **DEPENDENCIES:** `explorer/src/hooks/useCommandPalette.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ProjectSelector.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Salesforce project selection dropdown UI, project switching options, trigger for creation modal.
- **DEPENDENCIES:** `explorer/src/context/ProjectContext.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ProjectManager.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Project list view, project configuration settings, project deletion/editing UI.
- **DEPENDENCIES:** `explorer/src/context/ProjectContext.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ProjectCreationModal.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Modal dialog for registering new Salesforce projects, project path inputs, form validation.
- **DEPENDENCIES:** `explorer/src/context/ProjectContext.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ProjectDashboard.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Multi-project portfolio dashboard UI, portfolio risk summaries, cross-project metric comparison cards.
- **DEPENDENCIES:** `explorer/src/context/ProjectContext.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/RefactorHandoffModal.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Refactor handoff confirmation modal UI, summary copy, confirmation actions.
- **DEPENDENCIES:** `explorer/src/lib/refactor-handoff.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ErrorBoundary.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Fallback UI rendering for unhandled component render errors.
- **DEPENDENCIES:** React
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/SummaryBar.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Health metrics summary bar UI, high-level counter displays.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/HealthSummary.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Health score badge UI component, visual risk indicators.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/AnalysisHistoryPanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** History timeline UI component, snapshot comparison triggers, history metrics list.
- **DEPENDENCIES:** `explorer/src/lib/projectHistory.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/ComparePanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Snapshot comparison view UI, visual delta tables (components, dependencies, risk, cycles).
- **DEPENDENCIES:** `explorer/src/hooks/useCompareState.ts`, `explorer/src/lib/diff-adapter.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/DiagnosticsPanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Circular dependencies and unresolved references panel UI.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/FindingsPanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Findings view wrapper UI, rule category filter controls.
- **DEPENDENCIES:** `explorer/src/components/findings/FindingsPanel.tsx`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/HotspotPanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Refactoring hotspots panel UI, component refactoring readiness lists.
- **DEPENDENCIES:** `explorer/src/lib/hotspots.ts`, `explorer/src/lib/readiness.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/findings/FindingsPanel.tsx`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Architecture rule findings list UI, finding severity cards, finding drilldown triggers.
- **DEPENDENCIES:** `explorer/src/lib/intelligence/index.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/findings/findings.css`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** CSS styling rules specifically for findings cards, severity badges, and finding lists.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/panels/panels.css`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Shared panel styling rules (containers, tables, metric cards, tab headers).
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/index.css`
- **OWNER:** controls/UI
- **ALLOWED CHANGES:** Application global layout grid, design system tokens (`.ui-*`), CSS custom properties, container layout reset, responsive breakpoints.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

---

### 2.5 Domain: `focus/filter/investigation`

#### `explorer/src/components/SearchFilterPanel.tsx`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Search query input logic, node type filter checkboxes, risk level filters, metadata search handlers.
- **DEPENDENCIES:** `explorer/src/lib/search-filter.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/InvestigationDrawer.tsx`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Component inspector drawer, drill path tracking, pinned state toggles, detached window spawning, component details display.
- **DEPENDENCIES:** `explorer/src/lib/drill.ts`, `explorer/src/lib/detached-drawer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/components/Breadcrumbs.tsx`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Drill path breadcrumb navigation rendering, path step removal triggers.
- **DEPENDENCIES:** `explorer/src/lib/drill.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/focus-graph.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Neighborhood focus algorithm, N-degree subgraph extraction, depth filtering logic.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/connection-analysis.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Shortest path and all paths calculation between nodes, connection analysis algorithms.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/impact-analysis.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Forward/backward blast radius analysis algorithm, impact depth calculation.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/search-filter.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Node and edge search filtering algorithms, multi-criteria filtering helpers.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/drill.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Investigation drill history stack management, drill path state transitions.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/detached-drawer.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Popout detached inspector window messaging, postMessage synchronization protocol.
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/hotspots.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Architectural hotspot calculation algorithm (coupling, fan-in/fan-out, risk score weighting).
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/readiness.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Refactoring readiness scoring algorithm based on test coverage and cycle presence.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/health.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Global architecture health score calculation formulas.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/change-simulator.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** What-if refactoring simulation logic, component removal simulation.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/annotations.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Node and edge annotation, tagging, and note attachment logic.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/refactor-handoff.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Refactor ticket/prompt payload generation logic from active investigation state.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/schema.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Data contract validation logic and runtime schema checks for loaded explorer datasets.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/views.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Workspace view preset generation and view configuration algorithms.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/diff-adapter.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Architecture snapshot diffing algorithms (added/removed/modified components and edges).
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/index.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Re-exports for investigation and analysis lib utilities.
- **DEPENDENCIES:** Sub-module lib files
- **PARALLEL-SAFE:** YES

#### `explorer/src/lib/intelligence/` (Entire Directory)
- **Files included:**
  - `context.ts`
  - `finding.ts`
  - `index.ts`
  - `types.ts`
  - `rules/callout-in-trigger.ts`
  - `rules/cycle-detected.ts`
  - `rules/high-fan-in-hub.ts`
  - `rules/index.ts`
  - `rules/shared-state-risk.ts`
  - `rules/sobject-no-crud-check.ts`
  - `rules/test-missing-for-hub.ts`
  - `rules/types.ts`
  - `rules/unresolved-ref.ts`
- **OWNER:** focus/filter/investigation
- **ALLOWED CHANGES:** Architecture rule engine evaluation, rule definitions, finding generation, intelligence context creation.
- **DEPENDENCIES:** `explorer/src/types/explorer.ts`
- **PARALLEL-SAFE:** YES

---

### 2.6 Domain: `tests`

All test files belong strictly to the `tests` domain. Modification is allowed to add, update, or expand test assertions matching domain changes.

- `explorer/src/App.test.tsx`
- `explorer/src/App.deepLink.test.tsx`
- `explorer/src/App.investigationWorkflow.test.tsx`
- `explorer/src/components/AnalysisHistoryPanel.test.tsx`
- `explorer/src/components/Breadcrumbs.test.tsx`
- `explorer/src/components/CommandPalette.test.tsx`
- `explorer/src/components/ComparePanel.test.tsx`
- `explorer/src/components/ConnectionControls.test.tsx`
- `explorer/src/components/DiagnosticsPanel.test.tsx`
- `explorer/src/components/ErrorBoundary.test.tsx`
- `explorer/src/components/FindingsPanel.test.tsx`
- `explorer/src/components/FocusControls.test.tsx`
- `explorer/src/components/GraphControls.test.tsx`
- `explorer/src/components/GraphView.test.tsx`
- `explorer/src/components/Header.test.tsx`
- `explorer/src/components/HealthSummary.test.tsx`
- `explorer/src/components/HotspotPanel.test.tsx`
- `explorer/src/components/ImpactControls.test.tsx`
- `explorer/src/components/InvestigationDrawer.test.tsx`
- `explorer/src/components/ProjectCreationModal.test.tsx`
- `explorer/src/components/ProjectDashboard.test.tsx`
- `explorer/src/components/ProjectManager.test.tsx`
- `explorer/src/components/ProjectSelector.test.tsx`
- `explorer/src/components/RefactorHandoffModal.test.tsx`
- `explorer/src/components/SearchFilterPanel.test.tsx`
- `explorer/src/components/Sidebar.test.tsx`
- `explorer/src/components/SummaryBar.test.tsx`
- `explorer/src/context/ProjectContext.test.tsx`
- `explorer/src/context/ProjectStateContext.test.tsx`
- `explorer/src/context/SelectionContext.test.tsx`
- `explorer/src/hooks/useCommandPalette.test.ts`
- `explorer/src/hooks/useExplorerData.test.ts`
- `explorer/src/hooks/useGraphSelection.test.ts`
- `explorer/src/hooks/useViewState.test.ts`
- `explorer/src/lib/annotations.test.ts`
- `explorer/src/lib/change-simulator.test.ts`
- `explorer/src/lib/connection-analysis.test.ts`
- `explorer/src/lib/detached-drawer.test.ts`
- `explorer/src/lib/drill.test.ts`
- `explorer/src/lib/focus-graph.test.ts`
- `explorer/src/lib/graph-builder.test.ts`
- `explorer/src/lib/graph-interactions.test.ts`
- `explorer/src/lib/graph-style.test.ts`
- `explorer/src/lib/health.test.ts`
- `explorer/src/lib/hotspots.test.ts`
- `explorer/src/lib/impact-analysis.test.ts`
- `explorer/src/lib/performance.test.ts`
- `explorer/src/lib/preferences.test.ts`
- `explorer/src/lib/projectHistory.test.ts`
- `explorer/src/lib/projectState.test.ts`
- `explorer/src/lib/readiness.test.ts`
- `explorer/src/lib/schema.test.ts`
- `explorer/src/lib/search-filter.test.ts`
- `explorer/src/lib/url/urlQuery.test.ts`
- `explorer/src/lib/views.test.ts`
- `explorer/src/lib/intelligence/foundation.test.ts`
- `explorer/src/lib/intelligence/rules/foundation.test.ts`
- `explorer/src/test/ProjectIsolationAndCompare.test.tsx`
- `explorer/src/test/RegressionAcceptance.test.tsx`

- **OWNER:** tests
- **ALLOWED CHANGES:** Updating test assertions, adding unit/integration tests, mocking contexts and data fixtures for tests.
- **DEPENDENCIES:** Respective components and libraries under test.
- **PARALLEL-SAFE:** YES

---

## 3. Shared & Integration Files

The following files span multiple functional domains and act as application composition roots or core engines. **They must remain frozen during parallel feature development and are only modified during integration phases.**

#### `explorer/src/App.tsx`
- **OWNER:** shared / integration
- **ALLOWED CHANGES:** App layout grid composition, wrapping context providers (`ProjectProvider`, `ProjectStateProvider`, `SelectionProvider`), mounting primary view modes.
- **DEPENDENCIES:** All components, contexts, and custom hooks.
- **PARALLEL-SAFE:** NO (Integration Root)

#### `explorer/src/main.tsx`
- **OWNER:** shared / integration
- **ALLOWED CHANGES:** Application entry point, React root DOM render, error boundary wrapping.
- **DEPENDENCIES:** `explorer/src/App.tsx`
- **PARALLEL-SAFE:** NO (Entry Point)

#### `explorer/src/detached.tsx`
- **OWNER:** shared / integration
- **ALLOWED CHANGES:** Detached popout drawer entry point, standalone window rendering.
- **DEPENDENCIES:** `explorer/src/components/InvestigationDrawer.tsx`
- **PARALLEL-SAFE:** NO (Popout Entry Point)

#### `dependency-analyzer.cjs`
- **OWNER:** shared / integration
- **ALLOWED CHANGES:** Authoritative backend analysis engine modifications (dependency extraction, graph metrics, risk scoring, cycle detection).
- **DEPENDENCIES:** None
- **PARALLEL-SAFE:** NO (Authoritative Core Analyzer)

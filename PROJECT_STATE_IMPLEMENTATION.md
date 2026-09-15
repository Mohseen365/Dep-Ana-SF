# PROJECT_STATE_IMPLEMENTATION.md

## IMPLEMENTATION REPORT

**Phase:** Phase 3A — Project-Scoped UI State
**Status:** COMPLETE

### Files Changed:
- `PROJECT_STATE_IMPLEMENTATION.md` (Created documentation)

### Files Created:
- `explorer/src/lib/projectState.ts` (Storage manager, schema definition, local storage serialization, merger, and isolation engine)
- `explorer/src/lib/projectState.test.ts` (Unit tests for project state storage, schema, and state isolation across all 9 dimensions)
- `explorer/src/context/ProjectStateContext.tsx` (React context provider `ProjectStateProvider`, state hook `useProjectState`, event handlers, and active project state synchronization)
- `explorer/src/context/ProjectStateContext.test.tsx` (React component unit tests verifying state updates, context isolation, event listening, and project switching)
- `PROJECT_STATE_IMPLEMENTATION.md` (This document)

### Files Deleted:
- NONE

### Tests Run:
- `cd explorer && npx vitest run src/lib/projectState.test.ts`
- `cd explorer && npx vitest run src/context/ProjectStateContext.test.tsx`
- `node scripts/test-multi-project.cjs`

### Tests Passed:
- 100% passed (10 unit tests for Project-Scoped UI State, 5 integration tests in `test-multi-project.cjs`)

### Tests Failed:
- NONE

### UI Behavior Changed:
- Created the project-scoped UI state framework (`ProjectStateContext` & `useProjectState`). When switching projects, the UI automatically saves the active project's state to `explorer.projectState.<projectId>` and restores the target project's stored state without polluting or overwriting other projects.

### Logic Changed:
- NONE in core analyzer (`dependency-analyzer.cjs`) or Cytoscape graph construction algorithms.

### API Changed:
- Introduced `ProjectUIState` interface and `useProjectState()` hook providing project-isolated state slices:
  - `selectedComponent` (`selectedNodeId`, `selectedEdgeId`, `selectedInvestigationId`)
  - `filters` (`searchQuery`, `typeFilter`, `riskFilter`, `hasCallouts`, `withoutSharing`, `hideTests`, `hasAsyncPatterns`, `customTags`)
  - `graphLayout` (`layoutName`, `nodePositions`)
  - `zoom` (`zoom`, `pan`)
  - `sidebarState` (`collapsed`, `activeTab`, `searchQuery`)
  - `inspectorState` (`pinned`, `detached`, `activeTab`)
  - `navigatorState` (`visible`, `collapsed`)
  - `analysisView` (`viewMode`, `diagnosticsTab`, `selectedFindingId`, `selectedCycleId`, `selectedUnresolvedEdgeId`)
  - `comparisonState` (`isActive`, `beforeRaw`, `afterRaw`, `focusedEntityId`)

### Cross-Phase Requests:
- **CROSS_PHASE_REQUEST (Final Integration Lead / App.tsx):**
  Wrap `ProjectStateProvider` inside `App.tsx` (under `ProjectProvider`) so that all workspace components can consume `useProjectState()`.
- **CROSS_PHASE_REQUEST (Phase 2A / useViewState.ts):**
  Sync `useViewState` or workspace view mode with `projectState.analysisView` and `projectState.filters`.
- **CROSS_PHASE_REQUEST (Phase 2B / GraphView.tsx & GraphControls.tsx):**
  Bind Cytoscape zoom/pan and navigator visibility to `projectState.zoom`, `projectState.graphLayout`, and `projectState.navigatorState`. Listen to `explorer:project-state-restored` to trigger canvas viewport restoration.
- **CROSS_PHASE_REQUEST (Phase 2C / Sidebar.tsx):**
  Bind sidebar collapse state to `projectState.sidebarState.collapsed`.
- **CROSS_PHASE_REQUEST (Phase 2D / InvestigationDrawer.tsx):**
  Bind drawer pinned/detached states to `projectState.inspectorState`.
- **CROSS_PHASE_REQUEST (Phase 2E / ComparePanel.tsx):**
  Bind snapshot diff inputs to `projectState.comparisonState`.

---

## 1. Architecture Overview

Phase 3A implements complete client-side project state isolation across all UI components and workspace views.

```
                  ┌─────────────────────────────────────┐
                  │    ProjectContext (activeProjectId) │
                  └──────────────────┬──────────────────┘
                                     │ dispatches 'explorer:project-changed'
                                     ▼
                  ┌─────────────────────────────────────┐
                  │        ProjectStateContext          │
                  │       (useProjectState Hook)        │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────┐                     ┌─────────────────────────────┐
│ Storage: Project A          │                     │ Storage: Project B          │
│ explorer.projectState.projA │                     │ explorer.projectState.projB │
├─────────────────────────────┤                     ├─────────────────────────────┤
│ sidebarState: { collapsed } │                     │ sidebarState: { expanded }  │
│ zoom: { zoom: 0.8 }         │                     │ zoom: { zoom: 1.2 }         │
│ filters: { searchQuery }    │                     │ filters: { searchQuery }    │
└─────────────────────────────┘                     └─────────────────────────────┘
```

---

## 2. Project State Schema (`ProjectUIState`)

```typescript
export interface ProjectUIState {
  projectId: string;
  selectedComponent: {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    selectedInvestigationId: string | null;
  };
  filters: {
    searchQuery: string;
    typeFilter: string;
    riskFilter: string;
    hasCallouts: boolean;
    withoutSharing: boolean;
    hideTests: boolean;
    hasAsyncPatterns: boolean;
    customTags?: string[];
  };
  graphLayout: {
    layoutName: string; // 'cola' | 'cose' | 'grid' | 'concentric' | 'dagre'
    nodePositions?: Record<string, { x: number; y: number }>;
  };
  zoom: {
    zoom: number; // e.g. 0.8 (80%), 1.0 (100%), 1.2 (120%)
    pan: { x: number; y: number };
  };
  sidebarState: {
    collapsed: boolean;
    activeTab?: string;
    searchQuery?: string;
  };
  inspectorState: {
    pinned: boolean;
    detached: boolean;
    activeTab?: string;
  };
  navigatorState: {
    visible: boolean;
    collapsed?: boolean;
  };
  analysisView: {
    viewMode: 'graph' | 'findings' | 'hotspots' | 'diagnostics' | 'compare' | 'dashboard';
    diagnosticsTab: 'cycles' | 'unresolved' | 'none';
    selectedFindingId: string | null;
    selectedCycleId: string | null;
    selectedUnresolvedEdgeId: string | null;
  };
  comparisonState: {
    isActive: boolean;
    beforeRaw: string;
    afterRaw: string;
    focusedEntityId: string | null;
  };
  updatedAt: string;
}
```

---

## 3. Project Isolation Guarantees

1. **Deterministic Storage Keys:**
   Each project's UI state is persisted separately under key `explorer.projectState.<projectId>` in `localStorage`.

2. **Zero Cross-Pollution:**
   Modifying state in Project A (e.g., zoom to 80%, sidebar collapsed) mutates ONLY `explorer.projectState.ProjectA`. Project B retains zoom 120%, sidebar expanded.

3. **Atomic Switch & Restoration:**
   On switching projects via `switchProjectState(newId)` or `explorer:project-changed` window events:
   - Step 1: Current project state is serialized and saved to localStorage.
   - Step 2: Target project state is loaded from localStorage (or defaults created if missing).
   - Step 3: `ProjectStateProvider` updates React context state and dispatches `explorer:project-state-restored`.

---

## 4. Test Verification Summary

1. **Storage Isolation Unit Tests (`explorer/src/lib/projectState.test.ts`):**
   - Verified default state generation for new projects.
   - Verified project state loading, saving, updating, and clearing.
   - Verified strict isolation requirement: Project A (sidebar collapsed, zoom 80%) vs. Project B (sidebar expanded, zoom 120%).
   - Verified isolation across all 9 required state dimensions.

2. **React Context Unit Tests (`explorer/src/context/ProjectStateContext.test.tsx`):**
   - Verified `ProjectStateProvider` render tree integration.
   - Verified state updaters for zoom, sidebar, filters, analysis view.
   - Verified switching projects inside React component trees restores correct isolated state.
   - Verified global window event handling (`explorer:project-changed`).
   - Verified error handling outside provider.

3. **Multi-Project Integration Suite (`node scripts/test-multi-project.cjs`):**
   - Verified multi-project manifest, metadata, data contracts, and project switching isolation.

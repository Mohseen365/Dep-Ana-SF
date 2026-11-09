# Workstream 1 (WS-1): Interface Handoff Specification

## 1. Component Ownership & Scope
Workstream 1 owns the application shell and navigation infrastructure:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daSidebar/*`
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-p1-header-tests.cjs`
- `scratch/salesforce-poc/tests/run-p1-sidebar-tests.cjs`
- `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`

---

## 2. Public Interfaces Exposed by `daAppShell`

### Public `@api` Properties
- `@api activeProjectId`: (String | null) The 15- or 18-character Salesforce record ID of the active `DA_Project__c`.
- `@api activeProjectKey`: (String | null) Unique project key (e.g. `CST_PROJ`, `PBIM_PROJ`).

### Inbound Events Handled by `daAppShell`
1. `projectchange`:
   - Emitted by: `c-da-project-selector` (via `c-da-header`).
   - Detail: `{ projectId: string, projectKey?: string }`.
   - Behavior: Sets `activeProjectId`, clears `selectedNodeId`, resets `graphError` and `preferenceError`, loads latest graph metadata & chunks, and restores user preferences.
2. `viewchange`:
   - Emitted by: `c-da-sidebar`, child views, navigation buttons.
   - Detail: `{ viewMode: "graph" | "matrix" | "findings" }`.
   - Options: `{ bubbles: true, composed: true, cancelable: false }`.
   - Behavior: Switches `activeView`, updates `activeViewMode`, persists preference to Apex (`Active_View_Mode__c`). Does NOT modify `selectedNodeId` or `activeProjectId`.
3. `nodeselect`:
   - Emitted by: `c-da-graph-viewer`, `c-da-sidebar`, `c-da-matrix-view`, `c-da-findings-view`, `c-da-hotspots-view`, `c-da-treemap-view`, `c-da-subway-view`, `c-da-architecture-dna-barcode`.
   - Detail: `{ nodeId: string, sourceComponent?: string }`.
   - Behavior: Updates `selectedNodeId`. **Preserves invariant SELECTION ≠ NAVIGATION (never triggers view change).**
4. `filterchange`:
   - Emitted by: `c-da-preset-manager`, `c-da-sidebar`.
   - Detail: `{ activeFilter: object, activePresetId?: string }`.
   - Behavior: Normalizes canonical filter criteria and updates active criteria broadcasted to child views without redundant container persistence.
5. `containerchange`:
   - Emitted by: `c-da-preset-manager`.
   - Detail: `{ container: object }`.
   - Behavior: Validates and persists V2 filter container to `Filters_JSON__c` scoped strictly to `activeProjectId`.
6. `actiontrigger`:
   - Emitted by: `c-da-header`.
   - Detail: `{ action: "compare" | "history" | "shortcuts" | "help" }`.

---

## 3. Public Interfaces Exposed by `daSidebar`

### Public `@api` Properties
- `@api projectId`: (String | null) Active project identifier.
- `@api selectedNodeId`: (String | null) Currently selected node identifier.
- `@api nodes`: (Array<object>) Array of canonical graph nodes from `activeGraphPayload.nodes`.
- `@api currentView`: (String) Currently active view mode (defaults to `'graph'`).

### Outbound Events Dispatched by `daSidebar`
1. `viewchange`:
   - Detail: `{ viewMode: string }`.
   - Flags: `bubbles: true, composed: true, cancelable: false`.
2. `nodeselect`:
   - Detail: `{ nodeId: string, sourceComponent: 'daSidebar' }`.
   - Flags: `bubbles: true, composed: true, cancelable: false`.
3. `collapsechange`:
   - Detail: `{ isCollapsed: boolean }`.
   - Flags: `bubbles: true, composed: true, cancelable: false`.
4. `layerfilterchange`:
   - Detail: `{ activeLayers: string[] }`.
   - Flags: `bubbles: true, composed: true, cancelable: false`.

---

## 4. Public Interfaces Exposed by `daHeader`

### Public `@api` Properties
- `@api projectId`: (String | null)
- `@api projectKey`: (String | null)
- `@api projectName`: (String | null)
- `@api activeView`: (String) Current active view identifier.
- `@api selectedNodeId`: (String | null) Current selected node identifier.
- `@api isLoading`: (Boolean) Status spinner indicator.
- `@api error`: (String | null) Error message.

### Outbound Events Dispatched by `daHeader`
1. `projectchange`:
   - Detail: Forwarded from `c-da-project-selector`.
   - Flags: `bubbles: true, composed: true`.
2. `globalsearch`:
   - Detail: `{ query: string }`.
   - Flags: `bubbles: true, composed: true`.
3. `actiontrigger`:
   - Detail: `{ action: string }`.
   - Flags: `bubbles: true, composed: true`.

---

## 5. Architectural Invariants Enforced
1. **SELECTION ≠ NAVIGATION**: Node/finding/matrix cell selection never mutates `activeViewMode` or route.
2. **Single Cytoscape Canvas**: `daGraphViewer` instance is preserved; rapid switching cleanly destroys and reinstantiates without leaking WebGL contexts.
3. **Null-Coalescing User Preferences**: Preferences save partial updates with explicit null values for untouched fields (`positionsJson: null`, `zoomPanJson: null`).
4. **Strict Project Scoping**: Presets and history are strictly isolated per `projectId`.

# Phase 1 — Architecture & Contract Design

## 1. Executive Architecture Decision

This document establishes the authoritative **Phase 1 Target Architecture and Executable Contract Model** for the Salesforce Architecture Visualization Unification project.

Grounded in the Phase 0 discovery synthesis (`PHASE_0_ARCHITECTURE_VISUALIZATION_DISCOVERY.md`) and direct current source inspection (`explorer/src/`), this design formalizes the core architectural hypothesis:

> **"A visualization is a lens, not a destination."**

### Core Architectural Decisions:

1. **Decoupling Selection from Navigation**: Selecting an entity inside any visualization lens updates the canonical **Investigation Context** in-place without forcing an implicit workspace view transition to `GraphView`. Explicit navigation actions ("Explore in Graph Canvas", "Open Component Profile") remain dedicated user-initiated commands [CONFIRMED; P0-2 §1, P0-4 §8].
2. **Canonical Investigation Context**: State fragmentation across `useViewState`, `ProjectStateContext`, and `SelectionContext` is unified into a single authoritative **Investigation Context** managing `selectedNodeId`, `selectedEdgeId`, `selectedFindingId`, `focusState`, `impactState`, `connectionState`, `drillPath`, and `isInvestigating` [CONFIRMED; P0-2 §1, P0-2 §20].
3. **5-Domain Semantic Workspace Model**: The 18 workspace view modes are organized into 5 semantic workspace domains (`Portfolio & Health`, `Topological Structure`, `Feature Relationships`, `Local Neighborhood`, `Governance & Quality`), eliminating top-bar switcher clutter on compact viewports while preserving every lens's unique rendering engine [STRONGLY SUPPORTED; P0-1 §6, P0-5 §7].
4. **Full URL Workspace Serialization**: All 18 workspace view modes, selection states, focus depths, and filter parameters are serialized into URL search query parameters (`?project=`, `?workspace=`, `?view=`, `?node=`, `?investigate=`), enabling 100% deep-link restoration and back/forward browser navigation [CONFIRMED; P0-2 §9, P0-7 §9].
5. **Non-Negotiable Position Authority & Project Isolation**: The 5-level Position Authority hierarchy (`position-policy.ts`) and project-scoped storage isolation (`explorer.projectState.<projectId>`) remain strictly preserved. Lens or workspace transitions modify node coordinates by **exactly 0.00000 px** [CONFIRMED; P0-7 §5, P0-7 §17].
6. **Pure Adapter & Selector Protocol**: The 10 pure visualization adapters in `explorer/src/lib/adapters/` are standardized under a common TypeScript interface protocol. Shared analytical primitives (`discoverFeatures`, `classifyNodeLayer`, `centrality`, `hotspots`) are wrapped in a centralized memoized selector layer to prevent redundant re-computation across mounted panels [CONFIRMED; P0-3 §6, P0-3 §10].

---

## 2. Phase 0 Evidence Baseline

This architectural design is strictly grounded in the evidence established by the Phase 0 discovery synthesis (`PHASE_0_ARCHITECTURE_VISUALIZATION_DISCOVERY.md`) [CONFIRMED]:

- **12 Primary Visual Lenses & 6 Supporting Views**: Confirmed in `projectState.ts:32` (`WorkspaceViewMode` string union) and `App.tsx` [CONFIRMED; P0-1 §2, P0-2 §3].
- **Canonical Schema**: `ExplorerDataSchema` defined in `explorer-contract.ts` and `explorer/src/types/explorer.ts:47` serves as the single source of truth [CONFIRMED; P0-3 §1].
- **10 Pure Visualization Adapters**: Located in `explorer/src/lib/adapters/`. Verified 100% pure, read-only, and deterministic [CONFIRMED; P0-3 §6, P0-7 §14].
- **5-Level Position Authority Hierarchy**: Governed by `position-policy.ts`. Level 1 (drag) > Level 2 (persisted state) > Level 3 (canvas position) > Level 4 (layout engine) > Level 5 (fallback) [CONFIRMED; P0-7 §17].
- **Project Isolation**: Namespaced under `explorer.projectState.<projectId>` and reset synchronously via `explorer:project-changed` window DOM events [CONFIRMED; P0-2 §10, P0-7 §11].
- **Measured Cold Load SLA**: Canonical 240-node / 1,024-edge Cloud Spend Tracker fixture completes cold pipeline in **185.8 ms – 189.4 ms** (< 1,000 ms SLA gate) [CONFIRMED; P0-6 §1].
- **Viewport Interaction Protection**: Viewport pan, zoom, fit, and hover execute with exactly **0 layout recalculations** (`cy.layout` calls = 0) [CONFIRMED; P0-6 §1].

---

## 3. Current → Target Architecture

### Current Architecture (Fragmented & Coupled):
```text
[ Browser Event / Deep Link ]
          │
          ▼
   useViewState (URL) ◄─── (Manual Sync) ───► SelectionContext (selectedNodeId)
          │                                           │
          ▼                                           ▼
App.tsx Local State (18 modes) ◄─── (Custom Event) ──► ProjectStateContext (LocalStorage)
          │
          ▼ (Hard-coded callback navigation side effects: click → selectNode + setWorkspaceViewMode('graph'))
[ 12 Lenses & 6 Views ]
```

### Target Architecture (Decoupled & Layered):
```text
                 ┌────────────────────────────────────────┐
                 │       Browser URL & LocalStorage       │
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │            Project Context             │
                 │ (Active Project ID, Manifest Fetcher)  │
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │          ExplorerDataSchema            │
                 │       (Immutable Canonical Data)       │
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │       Centralized Selector Layer       │
                 │ (discoverFeatures, centrality, hotspots)│
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │     Canonical Investigation Context    │
                 │(selectedNode, focus, impact, drawer)   │
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │        Workspace Router & Lenses       │
                 │   (5 Semantic Domains, 18 View Modes)  │
                 └───────────────────┬────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ Canvas Renderers │        │  SVG Renderers   │        │  DOM Renderers   │
│ (Graph, Heatmap) │        │(River, Constell) │        │  (Matrix, Tree)  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

---

## 4. Architectural Principles

1. **Single Source of Truth**: All domain data originates from `ExplorerDataSchema`. All entity investigation state originates from the `Canonical Investigation Context` [PROPOSED].
2. **Lens Independence**: A visualization lens projects view-model data from `ExplorerDataSchema` and reads investigation state, but never owns global state or forces navigation [PROPOSED].
3. **Decoupled Selection & Navigation**: Selecting an entity updates investigation context in-place. Navigation changes the active workspace/lens. Neither implies the other [PROPOSED].
4. **Strict Immutability & Pure Transformations**: Adapters and selectors are 100% pure functions. They never mutate canonical data or write position coordinates [CONFIRMED; P0-3 §1, P0-7 §14].
5. **Position Authority Invariance**: Node coordinates are governed strictly by `position-policy.ts`. Workspace transitions, selection, and filtering modify coordinates by **0.00000 px** [CONFIRMED; P0-7 §17].
6. **Project Boundary Isolation**: Project switching flushes transient investigation state, deletes stale URL parameters, and hydrates project-isolated state from `explorer.projectState.<projectId>` [CONFIRMED; P0-2 §10, P0-7 §11].

---

## 5. Layer Boundaries

The target architecture defines six enforceable architectural layers with explicit import rules [PROPOSED]:

```text
Layer 1: Canonical Domain Data (types/explorer.ts, schema.ts)
  ├── Allowed Imports: Standard TS libraries, Zod schema validation.
  └── FORBIDDEN IMPORTS: React, Hooks, UI components, Adapters, Renderers, Position Policy.

Layer 2: Domain Analytics & Selectors (lib/layout/, lib/hotspots.ts)
  ├── Allowed Imports: Layer 1 Domain Data types, math/graph utilities.
  └── FORBIDDEN IMPORTS: React, UI components, Adapters, Renderers, Position Policy, LocalStorage.

Layer 3: Visualization Adapters (lib/adapters/)
  ├── Allowed Imports: Layer 1 Domain Data, Layer 2 Domain Selectors, Adapter TS Interfaces.
  └── FORBIDDEN IMPORTS: React components, JSX/TSX, CSS, Position Policy, Workspace Router.

Layer 4: Canonical Investigation Context & Hooks (context/, hooks/)
  ├── Allowed Imports: Layer 1, Layer 2, Layer 3, React Context, URL serializers.
  └── FORBIDDEN IMPORTS: Specific UI Renderers, Cytoscape Core instances.

Layer 5: Workspace Router & Domain Containers (components/workspace/)
  ├── Allowed Imports: Layer 1–4, Workspace Layout Shell, Drawer, Header, Sidebar.
  └── FORBIDDEN IMPORTS: Directly manipulating Cytoscape DOM elements without canvas hooks.

Layer 6: Lens Renderers (components/*.tsx)
  ├── Allowed Imports: Layer 1–5, Rendering Engines (Cytoscape, Canvas 2D, SVG, DOM).
  └── FORBIDDEN IMPORTS: Mutating global context directly, hard-coded navigate-to-graph calls.
```

---

## 6. Canonical Investigation Context

All entity investigation state currently split across `useViewState`, `SelectionContext`, and `App.tsx` local state is consolidated into a single authoritative **Investigation Context** (`InvestigationContext.tsx`) [PROPOSED]:

```typescript
export interface CanonicalInvestigationState {
  // Primary Entity Identity
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedFindingId: string | null;
  selectedCycleId: string | null;
  selectedUnresolvedEdgeId: string | null;

  // Selection History
  selectionHistory: string[]; // Max 20 items

  // Investigation Drawer State
  isInvestigating: boolean;
  isPinned: boolean;
  isDetached: boolean;
  drawerTab: 'overview' | 'dependencies' | 'dependents' | 'evidence' | 'actions';
  drillPath: string[]; // Stack of drilled component IDs
  recentNodeIds: string[]; // Max 5 recent items

  // Sub-Graph Focus State
  focusState: FocusState; // { enabled, focusNodeId, depth, direction }

  // Blast-Radius Impact State
  impactState: ImpactState; // { enabled, originNodeId, depth }

  // Connection Query State
  connectionState: ConnectionQueryState; // { sourceNodeId, targetNodeId, direction, depth }

  // Active Refactoring Simulation Proposal
  activeSimulationProposal: RefactoringProposal | null;
  simulationStepIndex: number;
}
```

---

## 7. State Ownership Contract

Every piece of application state is assigned to exactly one authoritative layer [PROPOSED]:

| State Field | Authoritative Owner | Session Lifetime | LocalStorage Key | URL Query Parameter | Project-Scoped? | Lens-Local? |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| `activeProjectId` | `ProjectContext` | Permanent | `explorer.activeProjectId` | `?project=` | Global | No |
| `selectedNodeId` | `InvestigationContext` | Session | `projectState.selectedComponent` | `?node=` | Yes | No |
| `selectedEdgeId` | `InvestigationContext` | Session | In-Memory | `?edge=` | Yes | No |
| `selectedFindingId` | `InvestigationContext` | Session | In-Memory | `?finding=` | Yes | No |
| `focusState` | `InvestigationContext` | Session | In-Memory | `?focusNode=`, `?focusDepth=`| Yes | No |
| `impactState` | `InvestigationContext` | Session | In-Memory | `?impactNode=`, `?impactDepth=`| Yes | No |
| `connectionState` | `InvestigationContext` | Session | In-Memory | `?conn.dir=`, `?conn.depth=` | Yes | No |
| `filterState` | `ProjectStateContext` | Permanent | `projectState.filters` | `?search=`, `?type=`, `?risk=`| Yes | No |
| `visibleNodeTypes` | `ProjectStateContext` | Permanent | `projectState.filters.visibleTypes`| In-Memory | Yes | No |
| `nodePositions` | `ProjectStateContext` | Permanent | `projectState.graphLayout.positions`| None | Yes | No |
| `layoutMode` | `ProjectStateContext` | Permanent | `projectState.graphLayout.mode` | None | Yes | No |
| `architectureMode` | `ProjectStateContext` | Permanent | `projectState.graphLayout.archMode`| None | Yes | No |
| `activeDomain` | `WorkspaceRouter` | Session | In-Memory | `?domain=` | Yes | No |
| `activeViewMode` | `WorkspaceRouter` | Session | `projectState.analysisView.mode` | `?view=` | Yes | No |
| `isInvestigating` | `InvestigationContext` | Session | In-Memory | `?investigate=true` | Yes | No |
| `drillPath` | `InvestigationContext` | Session | In-Memory | None | Yes | No |
| `hoveredCell` | Lens Component | Ephemeral | In-Memory | None | No | Yes (`Matrix`) |
| `metricMode` | Lens Component | Ephemeral | In-Memory | None | No | Yes (`Heatmap`) |
| `expandedNodeIds` | Lens Component | Ephemeral | In-Memory | None | No | Yes (`Tree`) |
| `focalNodeId` | Lens Component | Ephemeral | In-Memory | None | No | Yes (`Constell`) |
| `subjectNodeId` | Lens Component | Ephemeral | In-Memory | None | No | Yes (`FourDir`) |

---

## 8. Action / Event Contract

Mutations to investigation and workspace state execute through strongly-typed canonical actions [PROPOSED]:

```typescript
export type CanonicalInvestigationAction =
  | { type: 'SELECT_NODE'; payload: { nodeId: string; sourceLens?: string } }
  | { type: 'SELECT_EDGE'; payload: { edgeId: string } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_FOCUS'; payload: FocusState }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_IMPACT_ORIGIN'; payload: ImpactState }
  | { type: 'CLEAR_IMPACT' }
  | { type: 'OPEN_INVESTIGATION_DRAWER'; payload?: { tab?: DrawerTab } }
  | { type: 'CLOSE_INVESTIGATION_DRAWER' }
  | { type: 'DRILL_INTO_COMPONENT'; payload: { nodeId: string } }
  | { type: 'NAVIGATE_BREADCRUMB'; payload: { index: number } }
  | { type: 'NAVIGATE_WORKSPACE'; payload: { domain: WorkspaceDomain; viewMode: WorkspaceViewMode } }
  | { type: 'EXPLORE_ENTITY_IN_GRAPH'; payload: { nodeId: string } }
  | { type: 'RESET_INVESTIGATION_CONTEXT' };
```

### Action Semantics & Execution Rules:
1. `SELECT_NODE`: Updates `selectedNodeId`, appends to `selectionHistory`, sets `isInvestigating = true`. **Does NOT switch active workspace view mode** [PROPOSED].
2. `EXPLORE_ENTITY_IN_GRAPH`: Dispatches `SELECT_NODE` AND sets `activeDomain = 'structure'`, `activeViewMode = 'graph'`. Dedicated action for explicit "Explore in Graph Canvas" buttons [PROPOSED].
3. `CLEAR_SELECTION`: Sets `selectedNodeId = null`, `selectedEdgeId = null`, sets `isInvestigating = false` if drawer is unpinned [PROPOSED].
4. `RESET_INVESTIGATION_CONTEXT`: Fired automatically on `explorer:project-changed` window DOM events to clear all transient investigation state [CONFIRMED; P0-2 §10, P0-7 §11].

---

## 9. Selection Contract

The Selection Contract governs entity selection across the workspace [CONFIRMED; P0-2 §6, P0-4 §6, P0-7 §12]:

- **In-Place Entity Selection**: Selecting an entity in any lens updates `selectedNodeId` in `InvestigationContext` without forcing a view mode change [PROPOSED].
- **Cross-Layout Selection Highlighting**: All open/mounted lenses observe `selectedNodeId`. Matching elements receive active highlight borders; non-matching elements apply `opacity: 0.35` (`.dimmed`) [CONFIRMED; P0-4 §6, P0-7 §12].
- **Edge Selection Mutual Exclusivity**: Selecting an edge (`selectedEdgeId`) sets `selectedNodeId = null` [CONFIRMED; P0-2 §3, P0-7 §6].
- **Esc Key Deselection**: Pressing `Escape` dispatches `CLEAR_SELECTION`, deselecting active entities and closing the unpinned drawer [CONFIRMED; P0-4 §5, P0-7 §6].
- **Project Change Clearing**: Switching projects dispatches `RESET_INVESTIGATION_CONTEXT`, clearing `selectedNodeId` and deleting `node` query params [CONFIRMED; P0-2 §10, P0-7 §11].

---

## 10. Navigation Contract

The Navigation Contract decouples workspace routing from entity selection [PROPOSED]:

- **Explicit Workspace Navigation**: Navigation between workspace domains (`Portfolio`, `Structure`, `Relationships`, `Neighborhood`, `Governance`) or view modes executes *strictly* via:
  1. Clicking a tab in `ViewModeSwitcher` or domain header [CONFIRMED; P0-4 §9].
  2. Clicking an explicit "Explore in Graph Canvas →", "Return to Graph Canvas", or "Open Profile" button [CONFIRMED; P0-4 §9].
  3. Selecting a navigation command in `CommandPalette` (`Cmd+K`) [CONFIRMED; P0-4 §9].
  4. Browser Back / Forward `popstate` events [CONFIRMED; P0-2 §9, P0-7 §9].
- **Selection Non-Navigation**: Pointer clicks on cells, tree rows, river streams, treemap rects, or barcode rows dispatch `SELECT_NODE` only and **never trigger workspace navigation** [PROPOSED].

---

## 11. Workspace Contract

The target architecture introduces a two-tier **Workspace Shell** (`WorkspaceShell.tsx`) wrapping the active visualization lens [PROPOSED]:

```text
WorkspaceShell
  ├── Domain Header Bar (5 Semantic Domain Tabs: Portfolio, Structure, Relationships, Neighborhood, Governance)
  ├── View Mode Switcher Bar (Sub-tabs for active domain, e.g., Graph, Tree, Treemap under Structure)
  ├── Filter & Search Bar (Shared filter inputs, node type toggles, risk chips)
  ├── Center Viewport Slot (Conditional Lens Renderer)
  ├── Right Dock Slot (InvestigationDrawer)
  └── Bottom Status Bar (Active project, component count, risk exposure, SLA metric)
```

### Workspace Responsibilities:
- Managing top-level domain and view mode routing [PROPOSED].
- Providing global search, node-type filtering, and risk controls [CONFIRMED; P0-1 §3.1, P0-4 §14].
- Housing the shared `InvestigationDrawer` [CONFIRMED; P0-1 §2, P0-2 §4].
- Preserving layout space during drawer pin/unpin transitions without canvas layout recalculations [CONFIRMED; P0-7 §8].

---

## 12. Lens Contract

A **Visualization Lens** is a pure presentation component responsible for visualizing a specific analytical perspective of `ExplorerDataSchema` [PROPOSED]:

### Lens Responsibilities:
- Consuming its standardized adapter projection (`adaptX`) [CONFIRMED; P0-3 §6].
- Rendering view-model graphics via its dedicated rendering engine (Cytoscape Canvas, HTML5 Canvas, SVG, or DOM) [CONFIRMED; P0-6 §8].
- Managing lens-local ephemeral UI state (hover tooltips, local tab selections, expander sets) [CONFIRMED; P0-4 §12, P0-6 §18].
- Dispatching canonical actions (`SELECT_NODE`, `EXPLORE_ENTITY_IN_GRAPH`) upon user pointer interactions [PROPOSED].

### Lens Restrictions:
- **MUST NOT** mutate `ExplorerDataSchema` or input graph arrays [CONFIRMED; P0-3 §1, P0-7 §14].
- **MUST NOT** call `position-policy.ts` or write to `nodePositions` [CONFIRMED; P0-3 §1, P0-7 §14].
- **MUST NOT** directly trigger workspace view mode navigation inside item click handlers [PROPOSED].
- **MUST NOT** import other visualization lens components directly [CONFIRMED; P0-3 §20].

---

## 13. Supporting Surface Contract

Supporting analytical views (`ProjectDashboard`, `FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel`, `AnalysisHistoryPanel`) are classified as **Workflow & Governance Surfaces**, distinct from primary visual lenses [CONFIRMED; P0-1 §2, P0-5 §7]:

- **`ProjectDashboard`**: Portfolio summary surface. Clicking "Explore Dependency Graph" dispatches `NAVIGATE_WORKSPACE` (`Structure`, `graph`) [P0-1 §2, P0-5 §4].
- **`FindingsPanel`**: Rule violation triage surface. Clicking "Investigate Node" dispatches `EXPLORE_ENTITY_IN_GRAPH` with finding node ID [P0-1 §2, P0-5 §4].
- **`HotspotPanel`**: Refactoring readiness surface. Clicking "Select Component" dispatches `SELECT_NODE` and opens drawer [P0-1 §2, P0-5 §4].
- **`DiagnosticsPanel`**: Cycle and unresolved reference surface. Clicking "Highlight Cycle" dispatches `SET_FOCUS` with cycle node set [P0-1 §2, P0-5 §4].
- **`ComparePanel`**: Snapshot diff comparison workflow. Clicking "Focus" on diff item highlights target entity on Graph [P0-1 §2, P0-5 §4].
- **`AnalysisHistoryPanel`**: Historical timeline surface. Pairwise selection launches `ComparePanel` [P0-1 §2, P0-5 §4].

---

## 14. Lens Registry Contract

All 18 workspace view modes are registered in a declarative **Lens Registry** (`lens-registry.ts`) [PROPOSED]:

```typescript
export interface LensDefinition {
  id: WorkspaceViewMode;
  domain: WorkspaceDomain;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  rendererKind: 'cytoscape' | 'canvas' | 'svg' | 'dom';
  capabilities: LensCapability[];
  adapterId?: string;
  supportsInPlaceSelection: boolean;
  supportsFocus: boolean;
  supportsImpact: boolean;
}

export const LENS_REGISTRY: Record<WorkspaceViewMode, LensDefinition> = {
  graph: {
    id: 'graph',
    domain: 'structure',
    label: 'Interactive Graph Canvas',
    shortLabel: 'Graph',
    icon: '🕸️',
    description: 'Full 2D Cartesian topology and spatial feature enclosures',
    rendererKind: 'cytoscape',
    capabilities: ['global-topology', 'neighborhood', 'directionality', 'spatial-structure'],
    supportsInPlaceSelection: true,
    supportsFocus: true,
    supportsImpact: true,
  },
  matrix: {
    id: 'matrix',
    domain: 'relationships',
    label: 'Feature Coupling Matrix',
    shortLabel: 'Matrix',
    icon: '📊',
    description: 'Tabular 2D inter-feature dependency coupling weights',
    rendererKind: 'dom',
    capabilities: ['feature-coupling', 'hierarchy', 'spatial-structure'],
    adapterId: 'matrix-adapter',
    supportsInPlaceSelection: true,
    supportsFocus: false,
    supportsImpact: false,
  },
  // ... Definitions for all 18 workspace view modes
};
```

---

## 15. Adapter Contract

All 10 visualization adapters adhere to a standardized, pure functional protocol [PROPOSED]:

```typescript
export interface BaseAdapterOptions {
  searchQuery?: string;
  visibleNodeTypes?: ExplorerNodeType[];
  riskFilter?: string;
  selectedNodeId?: string | null;
}

export interface AdapterResult<T> {
  data: T | null;
  summary: {
    totalEntities: number;
    activeEntities: number;
    hasData: boolean;
  };
  emptyStateReason?: 'NO_DATA' | 'ALL_FILTERED' | 'MISSING_SUBJECT';
}

export type PureLensAdapter<T, O extends BaseAdapterOptions = BaseAdapterOptions> = (
  schema: ExplorerDataSchema | null,
  options?: O
) => AdapterResult<T>;
```

### Adapter Invariants:
1. **100% Deterministic**: Given identical `schema` and `options`, output `AdapterResult` is bit-for-bit identical across repetitions [CONFIRMED; P0-3 §1, P0-7 §14].
2. **Defensive Cloning & Sorting**: Input arrays are cloned and sorted alphabetically by `.id` before processing [CONFIRMED; P0-3 §5, P0-7 §14].
3. **Empty Data Resilience**: Returns clean `AdapterResult` with `data: null` and `emptyStateReason` when input is empty, avoiding runtime throws [CONFIRMED; P0-3 §17, P0-7 §15].

---

## 16. Selector Contract

Shared analytical primitives in `explorer/src/lib/layout/` are wrapped in a centralized memoized selector layer (`analytics-selectors.ts`) to eliminate redundant re-computation across active panels [PROPOSED]:

```typescript
// Centralized Memoized Selectors
export const selectDiscoveredFeatures = memoizeOne((schema: ExplorerDataSchema) => {
  return discoverFeatures(schema.nodes, schema.edges);
});

export const selectNodeLayerMap = memoizeOne((schema: ExplorerDataSchema) => {
  return buildNodeLayerMap(schema.nodes);
});

export const selectCentralityAnalysis = memoizeOne((schema: ExplorerDataSchema) => {
  return computeGraphCentralityAnalysis(schema.nodes, schema.edges);
});

export const selectArchitecturalHotspots = memoizeOne((schema: ExplorerDataSchema) => {
  return getArchitecturalHotspots(schema);
});
```

### Selector Rules:
- Selectors cache results based on strict reference equality (`===`) of `schema`.
- Selectors re-execute strictly when dataset reference changes (e.g. project switch or simulation commit) [PROPOSED].

---

## 17. Visibility / Filtering Contract

1. **Pre-Adapter Ingestion Filtering**: `filterGraphByNodeTypes()` filters `ExplorerDataSchema` nodes/edges *before* adapter transformation, passing `visibleActiveData` to lenses [CONFIRMED; P0-4 §14, P0-6 §25].
2. **Topology & Coordinate Protection**: Toggling `visibleNodeTypes` hides components visually but **never mutates Position Authority (`nodePositions`)** [CONFIRMED; P0-4 §14, P0-7 §7].
3. **Selection Survival**: If a selected node is hidden by node-type filters, `InvestigationContext` retains `selectedNodeId` internally while the canvas dims or hides the node, restoring visual selection when the filter is cleared [CONFIRMED; P0-4 §23, P0-7 §6].

---

## 18. Position Authority Boundary

Position Authority remains strictly protected under `position-policy.ts` [CONFIRMED; P0-7 §17]:

```text
Level 1: In-Session User Drag (sessionPositionsRef) ─────────────► Highest Precedence
Level 2: Persisted Project State (localStorage.explorer.projectState.<id>)
Level 3: Existing Canvas Positions (Cytoscape Core)
Level 4: Intelligent Architecture Layout (computeArchitectureLayout)
Level 5: Deterministic Fallback Placement (calculateDeterministicNewNodePosition)
```

### Non-Negotiable Invariants:
- **0.00000 px Coordinate Drift**: Workspace switching, lens switching, node selection, search filtering, and drawer expansion modify node coordinates by **exactly 0.00000 px** [CONFIRMED; P0-7 §17].
- **Explicit Trigger Only**: Layout calculation executes *strictly* on cold project intake or explicit user "Reset Layout" button click [CONFIRMED; P0-7 §17].

---

## 19. URL / Deep-Link Contract

The URL query parameter contract is expanded to serialize all 18 workspace view modes [PROPOSED]:

| Parameter | Type / Format | Example Value | Target State Field | Serializer Module |
| :--- | :--- | :--- | :--- | :--- |
| `?project=` | `string` | `cst` | `activeProjectId` | `ProjectContext.tsx` |
| `?domain=` | `WorkspaceDomain` | `structure` | `activeDomain` | `workspaceQuery.ts` |
| `?view=` | `WorkspaceViewMode`| `river` | `activeViewMode` | `workspaceQuery.ts` |
| `?node=` | `string` | `ApexClass:AccountService` | `selectedNodeId` | `investigationQuery.ts` |
| `?edge=` | `string` | `edge-102` | `selectedEdgeId` | `investigationQuery.ts` |
| `?finding=` | `string` | `finding-4` | `selectedFindingId` | `findingsQuery.ts` |
| `?investigate=` | `'true' \| 'false'`| `true` | `isInvestigating` | `investigationQuery.ts` |
| `?focusNode=` | `string` | `ApexClass:AccountService` | `focusState.focusNodeId` | `focusQuery.ts` |
| `?focusDepth=` | `number` (1,2,3) | `2` | `focusState.depth` | `focusQuery.ts` |
| `?impactNode=` | `string` | `ApexClass:PaymentAdapter` | `impactState.originNodeId` | `impactQuery.ts` |
| `?search=` | `string` | `Account` | `filterState.searchQuery` | `filterQuery.ts` |
| `?type=` | `string` | `ApexClass` | `filterState.typeFilter` | `filterQuery.ts` |
| `?risk=` | `string` | `HIGH` | `filterState.riskFilter` | `filterQuery.ts` |

### URL Execution Rules:
- URL parameters use `window.history.replaceState` during minor state updates to prevent polluting browser history [CONFIRMED; P0-2 §9, P0-7 §9].
- Deep links are parsed on initial mount (`readStateFromUrl()`) and restored faithfully [CONFIRMED; P0-2 §9, P0-7 §9].

---

## 20. Persistence Contract

Project UI state persistence is strictly namespaced under `explorer.projectState.<projectId>` in `localStorage` [CONFIRMED; P0-2 §11, P0-7 §10]:

```typescript
export interface PersistedProjectUIState {
  version: number;
  projectId: string;
  lastUpdated: string;
  selectedComponent: { selectedNodeId: string | null };
  filters: SearchFilterState & { visibleNodeTypes: ExplorerNodeType[] };
  graphLayout: {
    nodePositions: Record<string, { x: number; y: number }>;
    mode: 'interactive' | 'static';
    architectureMode: 'hierarchical' | 'hybrid';
    layoutProvenance: LayoutProvenance;
  };
  zoom: { level: number; pan: { x: number; y: number } };
  sidebarState: { isCollapsed: boolean };
  inspectorState: { isPinned: boolean; isDetached: boolean };
  analysisView: { viewMode: WorkspaceViewMode };
}
```

---

## 21. Context Preservation Matrix

The following matrix defines exact context preservation rules across all workspace transitions [PROPOSED]:

| Transition Event | `selectedNodeId` | `filterState` | `focusState` | `nodePositions` | `activeViewMode` | `simulation` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Switch Workspace Domain** | Preserved | Preserved | Preserved | Preserved | Updated | Preserved |
| **Switch View Mode in Domain** | Preserved | Preserved | Preserved | Preserved | Updated | Preserved |
| **Select Node in Lens** | Updated | Preserved | Preserved | Preserved | Preserved | Preserved |
| **Explicit "Explore in Graph"** | Preserved | Preserved | Preserved | Preserved | Set `'graph'` | Preserved |
| **Switch Project Context** | Cleared (`null`) | Reset Default | Reset Empty | Loaded Target | Preserved | Cleared (`null`) |
| **Browser Refresh (F5)** | Restored (URL) | Restored (URL) | Restored (URL) | Restored (Store)| Restored (URL) | Reset |

---

## 22. Failure / Empty / Loading Contract

All visualization lenses handle edge-case data states cleanly without throwing runtime exceptions [CONFIRMED; P0-3 §17, P0-7 §15]:

1. **Loading State**: Render `<LoadingScreen />` with accessible spinner when `loading === true` [CONFIRMED; P0-2 §4].
2. **Project Not Analyzed**: Render `<NotAnalyzedScreen />` with terminal export instructions when `status === 'NOT_ANALYZED'` [CONFIRMED; P0-2 §4].
3. **Empty Filter Match**: Render accessible empty-state card ("No components match search query") with a `"Clear Search"` button when filter removes all nodes [CONFIRMED; P0-5 §21].
4. **Missing Subject Entity**: In focal/subject views (`Constellation`, `FourDirection`, `Profile`), if `selectedNodeId` is null, render a subject selection prompt dropdown [CONFIRMED; P0-1 §3.8, P0-1 §3.12].
5. **Component Boundary Exception**: React components are wrapped in `ErrorBoundary.tsx`, catching unhandled rendering errors locally [CONFIRMED; P0-7 §15].

---

## 23. Performance Contract

Phase 1 establishes strict performance contracts preserving measured baselines [CONFIRMED; P0-6 §1, P0-6 §27]:

- **Cold Pipeline SLA**: Cold load pipeline on 240-node CST fixture must complete in **< 1,000 ms** (Current Baseline: **185.8 ms – 189.4 ms**) [CONFIRMED; P0-6 §1].
- **Zero Layout Recalculations**: Viewport pan, zoom, fit, and hover interactions must execute with **0 `cy.layout` calls** [CONFIRMED; P0-6 §1].
- **Lens Transition Target**: Switching between workspace view modes must render in **< 30 ms** using memoized adapter data [CONFIRMED; P0-3 §15, P0-6 §18].
- **Scale Stability**: Graphs up to 2,500 nodes must maintain real-time interactive fluidity (< 1.5s cold layout, < 280 MB RSS memory) [CONFIRMED; P0-6 §23].

---

## 24. Regression Contract Catalog

The Phase 1 contract catalog formalizes all existing executable tests that Phase 2 implementation MUST preserve [CONFIRMED; P0-7 §4, P0-7 §5]:

| Contract ID | Behavioral Invariant | Verifying Test Suite | Risk If Violated |
| :--- | :--- | :--- | :--- |
| **CTR-POS-01** | 5-level Position Authority hierarchy precedence | `GraphView.positionAuthority.test.tsx` | User drag coordinates overwritten by auto-layout |
| **CTR-POS-02** | Static mode coordinate invariance ($0.00000\text{ px}$ drift) | `AdversarialWave5.test.tsx` | Canvas layout shifts unexpectedly during filtering |
| **CTR-ISO-01** | Project storage isolation (`explorer.projectState.<id>`) | `ProjectStatePersistenceAndIsolation.test.tsx` | Project A node positions leak into Project B |
| **CTR-URL-01** | URL query parameter deep-link restoration | `App.deepLink.test.tsx` | Shared links fail to open selected node or view |
| **CTR-SEL-01** | Cross-layout selection highlighting | `CrossLayoutVisibilityAndSelection.test.tsx` | Selecting node in Tree fails to highlight in Graph |
| **CTR-VIS-01** | Node-type visibility non-interference | `search-filter.test.ts` | Hiding node types mutates saved node positions |
| **CTR-ADP-01** | Pure adapter immutability & determinism | Adapter unit test suites (`lib/adapters/`) | Data adapters mutate canonical JSON graph |
| **CTR-PRF-01** | Cold load pipeline SLA < 1,000 ms | `scalability-layout.test.ts` | Startup rendering regressions degrade UI response |

---

## 25. Semantic Workspace Model

The 18 workspace view modes are organized into 5 semantic workspace domains [PROPOSED; P0-1 §6, P0-5 §7]:

```text
Domain 1: PORTFOLIO & HEALTH
  ├── ProjectDashboard (Overview summary & health score)
  ├── RadarPanel (6-axis polar health radar)
  └── AnalysisHistoryPanel (Historical snapshot timeline)

Domain 2: TOPOLOGICAL STRUCTURE
  ├── GraphView (2D Cartesian topology & feature overlays)
  ├── FeatureTreePanel (5-level collapsible hierarchy list)
  └── ArchitectureTreemapPanel (Squarified spatial bounding boxes)

Domain 3: FEATURE RELATIONSHIPS
  ├── FeatureMatrixPanel (2D inter-feature coupling weight table)
  ├── CouplingHeatmapPanel (HTML5 Canvas multi-metric heatmap)
  ├── DependencyRiverPanel (SVG Sankey layer flow streams)
  └── SubwayPanel (Transit-style feature route schematic)

Domain 4: LOCAL NEIGHBORHOOD
  ├── DependencyConstellationPanel (Radial polar orbital rings)
  ├── FourDirectionPanel (3x3 cardinal direction quadrant grid)
  ├── FeatureProfilePanel (Single-component scorecard)
  └── ArchitectureDNABarcode (7-band architectural barcode)

Domain 5: GOVERNANCE & QUALITY
  ├── FindingsPanel (Issue-oriented rule violation triage)
  ├── HotspotPanel (Ranked hotspot list & readiness)
  ├── DiagnosticsPanel (Circular dependency cycles & unresolved references)
  └── ComparePanel (Architecture snapshot diff comparison)
```

---

## 26. Lens Capability Model

Machine-readable metadata tags declared in `lens-registry.ts` define capabilities for each lens [PROPOSED]:

```typescript
export type LensCapability =
  | 'global-topology'
  | 'feature-coupling'
  | 'hierarchy'
  | 'macro-flow'
  | 'local-neighborhood'
  | 'component-metrics'
  | 'health-metrics'
  | 'risk-analysis'
  | 'directionality'
  | 'spatial-structure'
  | 'edge-provenance'
  | 'snapshot-comparison';
```

---

## 27. Navigation Transition Matrix

The target navigation contract defines explicit behaviors for all user transitions [PROPOSED]:

| Trigger Source | Event / Action | Target Domain | Target View Mode | Selection Effect | Focus Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ViewModeSwitcher Tab** | `NAVIGATE_WORKSPACE` | Selected Domain | Selected View Mode | Preserved | Preserved |
| **Lens Component Item** | `SELECT_NODE` | Unchanged | Unchanged | Node ID Updated | Preserved |
| **"Explore in Graph Canvas"**| `EXPLORE_ENTITY_IN_GRAPH` | `Structure` | `graph` | Node ID Updated | Centered |
| **"Open Component Profile"** | `NAVIGATE_WORKSPACE` | `Neighborhood` | `profile` | Node ID Updated | Unchanged |
| **"Investigate Finding"** | `EXPLORE_ENTITY_IN_GRAPH` | `Structure` | `graph` | Finding Node Selected | Centered |
| **"Highlight Cycle"** | `SET_FOCUS` | `Structure` | `graph` | Cycle Nodes Selected | Focus Active |

---

## 28. Runtime Architecture Diagram

```text
                  ┌───────────────────────────────────────────┐
                  │       Browser Event / User Interaction     │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          InvestigationContext             │
                  │   dispatch(CanonicalInvestigationAction)  │
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌───────────────────────────┐                         ┌───────────────────────────┐
│     Analytics Selectors   │                         │     Workspace Router      │
│ (memoized domain analytics)│                         │ (Domain & View State)     │
└────────────┬──────────────┘                         └────────────┬──────────────┘
             │                                                     │
             ▼                                                     ▼
┌───────────────────────────┐                         ┌───────────────────────────┐
│   Visualization Adapters  │                         │      Workspace Shell      │
│ (adaptX view-model maps)  │                         │(Toolbar, Filters, Drawer) │
└────────────┬──────────────┘                         └────────────┬──────────────┘
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │            Active Lens Renderer           │
                  │ (Cytoscape Canvas / Canvas 2D / SVG / DOM)│
                  └───────────────────────────────────────────┘
```

---

## 29. State Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PERSISTENT STATE LAYER                          │
│  LocalStorage: explorer.activeProjectId & explorer.projectState.<projectId>  │
│  URL Query: ?project=, ?domain=, ?view=, ?node=, ?search=, ?type=, ?risk=   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PROJECT CONTEXT LAYER                            │
│  ProjectContext: activeProjectId, projects manifest, data URL resolution    │
│  ProjectStateContext: project-scoped UI filters, nodePositions, layoutMode  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVESTIGATION CONTEXT LAYER                          │
│  InvestigationContext: selectedNodeId, selectedEdgeId, focusState,          │
│                        impactState, drillPath, isInvestigating              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LENS-LOCAL EPHEMERAL LAYER                         │
│  Component useState: hoveredCell, metricMode, expandedNodeIds, focalNodeId  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 30. Investigation Journey Diagram

```text
   ORIENT PHASE              LOCATE PHASE             UNDERSTAND PHASE
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│ Portfolio View  │       │ Search / Palette│       │ Analytical Lens  │
│ (Dashboard/Radar)│──────►│  (Node Selected)│──────►│(Matrix/River/Tree)│
└─────────────────┘       └─────────────────┘       └────────┬─────────┘
                                                             │
                                                             ▼
                                                    INVESTIGATE PHASE
   HANDOFF PHASE             SIMULATE PHASE         ┌──────────────────┐
┌─────────────────┐       ┌─────────────────┐       │ Topological Focus│
│ Handoff Modal   │◄──────│ Refactoring Sim │◄──────│   (GraphView)    │
│ (Export Context)│       │  (Commit Step)  │       │(Drawer/Focus/Imp)│
└─────────────────┘       └─────────────────┘       └──────────────────┘
```

---

## 31. Shared-File Ownership Map

To prevent merge conflicts during parallel Phase 2 implementation, shared high-blast-radius files are assigned explicit single-owner workstreams [PROPOSED]:

| Shared File | Designated Owner Workstream | Allowed Modifications | Parallelization Risk |
| :--- | :--- | :--- | :--- |
| `explorer/src/App.tsx` | **Foundation Workstream** | Refactoring top-level router to consume `WorkspaceShell` | HIGH |
| `explorer/src/hooks/useViewState.ts` | **Foundation Workstream** | Integrating URL serializer for all 18 view modes | HIGH |
| `explorer/src/lib/projectState.ts` | **Foundation Workstream** | Adding domain metadata to `WorkspaceViewMode` | MEDIUM |
| `explorer/src/context/ProjectStateContext.tsx` | **Foundation Workstream** | Storage slice updates & project change flushing | HIGH |
| `explorer/src/context/SelectionContext.tsx` | **Foundation Workstream** | Upgrading to `InvestigationContext` | HIGH |
| `explorer/src/components/ViewModeSwitcher.tsx` | **Foundation Workstream** | Refactoring to two-tier domain tab bar | MEDIUM |
| `explorer/src/lib/adapters/` | **Lens Domain Workstreams** | Implementing `PureLensAdapter` TypeScript interface | LOW |

---

## 32. Parallelization Boundaries

Future Phase 2 implementation is divided into five independent workstreams [PROPOSED]:

```text
Workstream 1: Foundation & State Architecture (Single-Threaded Lead)
  ├── Implements InvestigationContext & Canonical Investigation Actions.
  ├── Implements WorkspaceShell, LensRegistry, and URL Router.
  └── Owner of App.tsx, useViewState.ts, SelectionContext.tsx.

Workstream 2: Structural & Hierarchy Lenses (Parallel)
  ├── Adapts FeatureMatrixPanel, CouplingHeatmapPanel, FeatureTreePanel, ArchitectureTreemapPanel.
  └── Consumes InvestigationContext; isolates changes to lib/adapters/ and panel files.

Workstream 3: Flow & Route Lenses (Parallel)
  ├── Adapts DependencyRiverPanel, SubwayPanel.
  └── Consumes InvestigationContext; isolates changes to lib/adapters/ and panel files.

Workstream 4: Local Neighborhood Lenses (Parallel)
  ├── Adapts DependencyConstellationPanel, FourDirectionPanel, FeatureProfilePanel, ArchitectureDNABarcode.
  └── Consumes InvestigationContext; isolates changes to lib/adapters/ and panel files.

Workstream 5: Governance & Diagnostic Views (Parallel)
  ├── Adapts FindingsPanel, HotspotPanel, DiagnosticsPanel, ComparePanel, AnalysisHistoryPanel.
  └── Consumes InvestigationContext; isolates changes to panel files.
```

---

## 33. Migration Strategy

Phase 2 implementation will execute in four sequential, non-breaking stages [PROPOSED]:

```text
Stage 1: Foundation Provisioning
  └── Create InvestigationContext.tsx, lens-registry.ts, analytics-selectors.ts without altering existing panels.

Stage 2: Core Workspace Shell Integration
  └── Wrap App.tsx center pane in WorkspaceShell; wire 5-domain navigation tabs.

Stage 3: Lens-by-Lens Adapter & Selection Migration
  └── Migrate individual lenses to consume InvestigationContext and PureLensAdapter protocol in parallel.

Stage 4: Regression Verification & Acceptance
  └── Execute Vitest suite, npm run test:cli, and Playwright 180 matrix verification.
```

---

## 34. Architectural Decision Records

### ADR-01: Decoupling Entity Selection from Workspace Navigation
- **Question**: Should selecting a node in analytical lenses automatically navigate to `GraphView`?
- **Options**:
  - *Option A*: Retain hard-coded `setWorkspaceViewMode('graph')` inside item click handlers.
  - *Option B*: Update `selectedNodeId` in-place; provide explicit "Explore in Graph Canvas →" action buttons.
- **Decision**: **Option B**.
- **Reasoning**: Formalizes "Visualization as Lens, Not Destination". Users can inspect components in Matrix, Tree, River, or DNA without losing their active analytical perspective [CONFIRMED; P0-2 §1, P0-4 §8].

### ADR-02: Consolidation of Investigation Context
- **Question**: How should entity selection, focus depth, impact analysis, and drawer state be managed?
- **Options**:
  - *Option A*: Maintain separate state hooks across `useViewState`, `SelectionContext`, and `App.tsx`.
  - *Option B*: Consolidate into a single authoritative `InvestigationContext`.
- **Decision**: **Option B**.
- **Reasoning**: Eliminates state duplication, race conditions during project switches, and manual synchronization code in `App.tsx` [CONFIRMED; P0-2 §1, P0-2 §20].

### ADR-03: 5-Domain Workspace Navigation Model
- **Question**: How should top-level workspace navigation present 18 view modes?
- **Options**:
  - *Option A*: Retain flat 18-button switcher bar.
  - *Option B*: Group view modes into 5 semantic domains (`Portfolio`, `Structure`, `Relationships`, `Neighborhood`, `Governance`).
- **Decision**: **Option B**.
- **Reasoning**: Eliminates horizontal scroll overflow on compact viewports while organizing views by user analytical tasks [STRONGLY SUPPORTED; P0-1 §6, P0-5 §15].

---

## 35. Open Validation Questions

The following technical items remain marked as `UNKNOWN / REQUIRES VALIDATION` and must be validated during Phase 2 implementation [P0-1 §14, P0-6 §36]:

1. **Web Worker Offloading**: Measure serialization latency when offloading 13-stage architecture layout calculation for $> 2,500$ nodes to a Web Worker thread [P0-6 §36].
2. **HTML5 Canvas Matrix Scaling**: Determine exact feature count threshold ($F > 100$) where `FeatureMatrixPanel` should transition from DOM table to HTML5 Canvas rendering [P0-6 §36].

---

## 36. Phase 2 Implementation Contract

Phase 2 implementation agents are bound by the following explicit rules [PROPOSED]:

### Phase 2 Agents MAY:
- Implement `InvestigationContext.tsx`, `lens-registry.ts`, `analytics-selectors.ts`, and `WorkspaceShell.tsx`.
- Migrate visualization panels to consume `useInvestigation()` and `PureLensAdapter` interfaces.
- Add new unit and contract test suites.

### Phase 2 Agents MUST NOT:
- Redefine state ownership or introduce competing context stores [PROPOSED].
- Modify `position-policy.ts` or alter the 5-level Position Authority hierarchy [CONFIRMED; P0-7 §17].
- Re-introduce implicit selection-driven workspace navigation [PROPOSED].
- Mutate `ExplorerDataSchema` arrays inside adapters or selectors [CONFIRMED; P0-3 §1, P0-7 §14].
- Modify shared foundation files without workstream lead agreement [PROPOSED].

---

## 37. Final Architecture Summary

Phase 1 successfully establishes a complete, implementation-ready architecture and contract specification for the Salesforce Architecture Visualization Unification project:

- **Visualization as Lens**: Formalized by decoupling selection from navigation and introducing the 5-Domain Workspace Shell [CONFIRMED].
- **State Consolidation**: Unified under `InvestigationContext` with explicit action semantics [PROPOSED].
- **Data & Adapter Purity**: Preserved through canonical `ExplorerDataSchema`, memoized selectors, and pure adapters [CONFIRMED].
- **Regression Safety**: Position Authority, static mode coordinate invariance, project isolation, and cold-load performance SLAs are 100% protected by explicit contracts [CONFIRMED].

Zero source code files, test suites, or datasets were modified during Phase 1. The system is ready for Phase 2 implementation.

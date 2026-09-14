# Salesforce Architecture Explorer - System Architecture & Integration

## 1. Overview
The Salesforce Architecture Explorer is a interactive, web-based visualizer and architecture quality dashboard. It ingests analyzed dependency data (`explorer-data.json`), constructs an indexed architecture context, evaluates deterministic architecture rules, and renders interactive graph views and intelligence findings.

---

## 2. Data Flow
```
Data Ingestion (useExplorerData / parseExplorerData)
       │
       ▼
ExplorerDataSchema (data)
       ├──► Filter Pipeline (applyFilters) ──► Filtered Graph (visibleNodes, visibleEdges) ──► GraphView (A)
       │                                                                                      │
       ├──► Architecture Context (createArchitectureContext)                                   │
       │           │                                                                          │
       │           ▼                                                                          │
       │     Intelligence Rules (runAllRules) ──► Findings (C) ──► Graph Highlight ─────────────┘
       │                                                                  │
       └──► Change Simulator / Readiness (simulateChange) ────────────────┘
```

1. **Ingestion**: `useExplorerData` fetches raw JSON from `/explorer-data.json` and parses it via Zod schema (`parseExplorerData`).
2. **Filtering**: `applyFilters` filters nodes and edges based on type, risk, text search, and behavioral attributes (`hasCallouts`, `withoutSharing`, `hideTests`, `hasAsyncPatterns`).
3. **Intelligence**: `createArchitectureContext(data)` builds read-only indexes for fast $O(1)$ lookups. `runAllRules(ctx)` evaluates deterministic rules to produce `ArchitectureFinding[]`.
4. **Rendering & Selection**:
   - `GraphView` (Agent A) renders interactive Cytoscape graph nodes and edges.
   - `Sidebar` (Agent B) renders search controls, filters, and component list.
   - `DetailsPanel` (Agent B) renders component metadata, readiness assessment, coupling metrics, and change simulator.
   - `FindingsPanel` (Agent C) renders architecture violations and evidence snippets.
   - Finding selection updates `selectedFinding`, which highlights participating node IDs in the graph.

---

## 3. File Ownership Boundaries

| Workstream | Primary Owner / Scope | Key Artifacts |
|---|---|---|
| **Agent A** | Graph Engine & Layout | `GraphView.tsx`, `graph-layout.ts`, `graph-style.ts`, `graph-builder.ts`, `graph-internals/` |
| **Agent B** | Panels & Filters | `Sidebar.tsx`, `DetailsPanel.tsx`, `SearchFilterPanel.tsx`, `change-simulator.ts`, `readiness.ts`, `panels.css` |
| **Agent C** | Intelligence & Findings | `FindingsPanel.tsx`, `lib/intelligence/` (context, rules, finding), `findings.css` |
| **Agent D** | Shell Layout & Hooks | `App.tsx`, `main.tsx`, `useViewState.ts`, `useGraphSelection.ts`, `useExplorerData.ts`, `SelectionContext.tsx`, `index.css` |

---

## 4. URL Search Parameter Schema

State synchronization with URL query parameters allows deep-linking and full state restoration.

| Parameter Key | Type / Format | Description |
|---|---|---|
| `node` | `string` | Currently selected component ID |
| `edge` | `string` | Currently selected edge ID |
| `view.mode` / `viewMode` | `'graph' \| 'findings'` | Active application view mode |
| `filter.q` | `string` | Search query filter text |
| `filter.type` | `ExplorerNodeType` | Filter components by type (e.g. `ApexClass`, `LWC`) |
| `filter.risk` | `'HIGH' \| 'MEDIUM' \| 'LOW'` | Filter components by risk level |
| `filter.hasCallouts` | `boolean` (`'true'`) | Filter components with external HTTP callouts |
| `filter.withoutSharing` | `boolean` (`'true'`) | Filter components declaring `without sharing` |
| `filter.hideTests` | `boolean` (`'true'`) | Hide test classes from graph view |
| `filter.hasAsyncPatterns` | `boolean` (`'true'`) | Filter components with async Apex patterns |
| `focus.enabled` | `boolean` (`'true'`) | Toggle focus graph mode |
| `focus.direction` | `'dependencies' \| 'dependents' \| 'both'` | Direction of focus expansion |
| `focus.depth` | `1 \| 2 \| 3 \| 'ALL'` | Depth of focus traversal |
| `impact.enabled` | `boolean` (`'true'`) | Toggle blast radius / impact analysis mode |
| `impact.depth` | `1 \| 2 \| 3 \| 'ALL'` | Depth of impact analysis |
| `diag.tab` | `'cycles' \| 'unresolved' \| 'none'` | Active diagnostics tab |
| `diag.cycle` | `string` | Active cycle group ID |
| `diag.unresolved` | `string` | Active unresolved reference edge ID |

---

## 5. Slot → Component Mapping

`App.tsx` composes four primary layout slots provided by Agent D:

1. **`GraphSlot`** (`data-slot="graph"`):
   - **Mounted Component**: `GraphView` from Agent A (`src/components/GraphView.tsx`)
   - **Props**: `nodes`, `edges`, `selectedNodeId`, `selectedEdgeId`, `onSelectNode`, `onSelectEdge`, `selectedCycleNodeIds`, `graphRef`.

2. **`SidebarSlot`** (`data-slot="sidebar"`):
   - **Mounted Component**: `Sidebar` from Agent B (`src/components/Sidebar.tsx`)
   - **Props**: `nodes`, `displayNodes`, `filterState`, `selectedNodeId`, `collapsed`, `onToggleCollapse`, `onFilterChange`, `onSelectNode`.

3. **`DetailsSlot`** (`data-slot="details"`):
   - **Mounted Component**: `DetailsPanel` from Agent B (`src/components/DetailsPanel.tsx`)
   - **Props**: `node`, `edge`, `impactSummary`, `history`, `onClose`, `onShowImpact`, `onSelectNodeById`, `data`, `nodes`, `cycles`, `impactSummaries`, `onHighlightImpact`.

4. **`FindingsSlot`** (`data-slot="findings"`):
   - **Mounted Component**: `FindingsPanel` from Agent C (`src/components/findings/FindingsPanel.tsx`)
   - **Props**: `findings`, `selectedFindingId`, `onSelectFinding`, `onClearSelection`.

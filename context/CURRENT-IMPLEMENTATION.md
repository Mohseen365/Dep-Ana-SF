# Current Implementation

## 1. Core Source File Structure

```text
explorer/src/
├── App.tsx                        # Main application shell, context providers, URL sync
├── main.tsx                       # React DOM root entry point
├── components/                    # React UI Components
│   ├── GraphView.tsx              # Cytoscape interactive graph view & layout caller
│   ├── WorkspaceHeader.tsx        # Top domain header & tab switcher
│   ├── Sidebar.tsx                # Left navigation & component inventory drawer
│   ├── InvestigationDrawer.tsx   # Progressive one-hop investigation drawer & breadcrumbs
│   ├── CommandPalette.tsx         # Cmd+K palette host for relocated analytical surfaces
│   ├── RefactorHandoffModal.tsx   # Refactor handoff export modal (palette & drawer entry)
│   ├── ViewModeSwitcher.tsx       # Domain-grouped view mode switcher
│   ├── FeatureMatrixPanel.tsx     # Windowed feature matrix component
│   ├── DependencyRiverPanel.tsx   # Sankey dependency river component
│   ├── FeatureOverlayCanvas.tsx   # Orbit concentric ring & sector overlay canvas
│   └── ...                        # Supporting lens & workflow panels
├── context/                       # React Context State Authorities
│   ├── InvestigationContext.tsx   # Selection, drill, drawer, and focus state
│   ├── WorkspaceRouterContext.tsx # Routing, domain, view mode, and project switching
│   ├── ProjectContext.tsx         # Project manifest & dataset context
│   └── ProjectStateContext.tsx    # Node positions, layout preferences, and zoom
├── lib/                           # Core Utilities, Adapters, and Layout Engines
│   ├── architecture-layout.ts     # Unified layout dispatcher (hierarchical, hybrid, orbit)
│   ├── orbit-layout.ts            # Concentric ring radial layout & water-filling polar math
│   ├── orbit-semantics.ts         # Ring R0..R5 & sector classifier for Orbit mode
│   ├── drill.ts                   # Ranked dependents computation & progressive drill logic
│   ├── detached-drawer.ts         # BroadcastChannel IPC sync for detached drawer window
│   ├── refactor-handoff.ts        # Refactor handoff payload builder & parent frame transport
│   ├── graph-layout.ts            # Layout engine interface & async worker dispatcher
│   ├── layout/                    # 11-Stage Hierarchical Layout Pipeline
│   │   ├── global-layout.ts       # Stage 1-11 pipeline coordinator
│   │   ├── centrality.ts          # Stage 8 2D bridge corridor placement
│   │   ├── satellites.ts          # Stage 9 concentric ring satellite placement
│   │   └── collision-cleanup.ts   # Stage 11 collision cleanup displacement
│   ├── adapters/                  # Pure Adapters for 12 Canonical Lenses
│   │   ├── matrix-adapter.ts      # Feature matrix adapter
│   │   ├── sankey-adapter.ts      # Dependency river Sankey adapter
│   │   ├── tree-adapter.ts        # Hierarchy tree adapter
│   │   ├── radar-adapter.ts       # Risk radar adapter
│   │   └── ...                    # Adapters for constellation, subway, treemap, etc.
│   └── workers/                   # Web Worker Off-Thread Execution
│       ├── layout.worker.ts       # Background Web Worker layout process
│       ├── layout-worker-client.ts# Main-thread client with request counter & timeout
│       └── layout-worker-types.ts # IPC serialization protocol
├── registry/                      # Subsystem & Lens Registries
│   ├── workspace-registry.ts      # Domain-to-lens mapping and surface metadata
│   └── view-registry.ts         # View mode metadata definitions
└── types/                         # Canonical TypeScript Interfaces
    └── explorer.ts                # `ExplorerData`, `Node`, `Edge`, `ViewMode`, `Domain`
```

## 2. CLI Analysis Subsystem (`scripts/`)

- `scripts/run-explorer.cjs` — Vite dev/build/preview launcher script.
- `scripts/export-explorer.cjs` — Core dependency analyzer & JSON exporter (`node scripts/export-explorer.cjs --project pbim`).
- `scripts/test-cli-integration.cjs` — Master CLI test suite running 31 sub-suites.
- `dependency-analyzer.cjs` — Static code analysis engine parsing Apex, LWC, Objects, and Flows.
- `safety-envelope.cjs` — Structural and security envelope validation engine.
- `architecture-change-gate.cjs` — Change impact & quality gate engine.
- `architecture-snapshot.cjs` — System snapshot and metrics engine.

## 3. Data Flow & Execution Path

```text
Salesforce Source Files / Manifest
        ↓
`scripts/export-explorer.cjs` (via `dependency-analyzer.cjs`)
        ↓
`explorer/public/projects/<project>/explorer-data.json`
        ↓
`ProjectContext.tsx` loads dataset into memory
        ↓
`architecture-layout.ts` dispatches layout:
    ├─► Orbit Mode ─────► `orbit-layout.ts` (polar water-filling layout)
    ├─► Hierarchical ────► `layout/global-layout.ts` or `workers/layout.worker.ts`
    └─► Hybrid Mode ─────► Hybrid 2D containment boxes
        ↓
`GraphView.tsx` / Lens Panels render nodes, edges, and overlays
        ↓
User interaction updates `InvestigationContext` (selection) or `WorkspaceRouterContext` (view)

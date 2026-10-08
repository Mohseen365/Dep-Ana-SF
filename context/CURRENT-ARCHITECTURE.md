# Current Architecture

## 1. Subsystem Architecture

The repository consists of two primary operational subsystems:

```text
                               ┌───────────────────────────────────────────────┐
                               │           CLI & Analysis Subsystem            │
                               │  - Node.js CJS scripts (`scripts/`, `*.cjs`)   │
                               │  - Dependency Analyzer & Layer Classifier     │
                               │  - 31 CLI Integration Test Suites             │
                               └──────────────────────┬────────────────────────┘
                                                      │
                                                      │ exports `explorer-data.json`
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             Explorer Visualization Workspace                                │
│  - React 19 + TypeScript (`explorer/src/`)                                                  │
│  - Graph-First Two-Pane Shell (Full-canvas graph + Right Investigation Drawer)               │
│  - Cmd+K Command Palette (`CommandPalette.tsx`) hosting relocated analytical surfaces        │
│  - Single-owner State Contexts (`InvestigationContext`, `WorkspaceRouterContext`)            │
│  - 18 View Modes across 5 Workspace Domains                                                 │
│  - Multi-stage Layout Engine & Orbit Polar Layout (`explorer/src/lib/layout/`)             │
│  - Off-thread Layout Offloading Worker (`explorer/src/lib/workers/layout.worker.ts`)         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Workspace Domain & Lens Taxonomy

The workspace taxonomy defines 18 view modes organized into 5 canonical workspace domains (defined in `explorer/src/types/explorer.ts` and `explorer/src/registry/workspace-registry.ts`):

1. **Portfolio & Health Domain:**
   - `dashboard` — System overview metrics and health gauges.
   - `hotspots` — Complexity and change risk hotspots.
   - `diagnostics` — System health diagnostics and smell analysis.
   - `compare` — Project/version comparison lens.
   - `history` — Historical evolution and snapshot timeline.

2. **Topological Structure Domain:**
   - `graph` — Full Interactive Cytoscape Graph View.
   - `subway` — Metro line topological layer flow.
   - `constellation` — Centrality constellation projection.
   - `tree` — Component hierarchy tree.
   - `treemap` — Nested block volume treemap.

3. **Feature Relationships Domain:**
   - `matrix` — Feature-to-component matrix grid.
   - `heatmap` — Feature coupling intensity heatmap.
   - `river` — Dependency River / Sankey flow visualization.

4. **Local Neighborhood Domain:**
   - `dna` — Architectural DNA barcode sequence.
   - `profile` — Single component detail profile.
   - `radar` — Structural risk and balance radar.
   - `four-direction` — North/South/East/West directional dependency view.

5. **Governance & Quality Domain:**
   - `findings` — Architecture smells, unresolved references, and refactoring candidates.

## 3. State Authority Invariants

State authority is governed by explicit single-owner React context providers:

- **Routing Authority:** `WorkspaceRouterContext` (`explorer/src/context/WorkspaceRouterContext.tsx`) is sole owner of view mode (`viewMode`), domain (`activeDomain`), and project selection (`currentProject`).
- **Investigation Authority:** `InvestigationContext` (`explorer/src/context/InvestigationContext.tsx`) is sole owner of selection (`selectedNodeId`, `selectedEdgeId`, `selectedFindingId`), drill path, drawer state (`investigateOpen`, pinned state, detached window sync), and focus state.
- **Project Data Authority:** `ProjectContext` (`explorer/src/context/ProjectContext.tsx`) manages project manifest loading and project metadata.
- **Position Authority:** `ProjectStateContext` (`explorer/src/context/ProjectStateContext.tsx`) maintains rendered layout coordinate maps (`nodePositions`).

`SELECTION ≠ NAVIGATION`: Selecting a node or edge updates `InvestigationContext` without triggering an automatic route or mode transition.

## 4. Layout Pipeline & Position Authority

Layout calculations follow strict coordinate authority rules:

1. Level 1: Static stored positions (`explorer-data.json`).
2. Level 2: User override / drag coordinates.
3. Level 3: Web Worker layout result (`layout.worker.ts`).
4. Level 4: Synchronous pipeline fallback (`computeArchitectureLayoutWithMetadata`).
5. Level 5: Cytoscape default fallback.

Position authority enforces 0.00000px coordinate drift between synchronous and asynchronous Web Worker execution.

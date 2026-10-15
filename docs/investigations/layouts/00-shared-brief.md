# Dependency Graph Layouts — Shared Investigation Brief

## 1. Conventions, Constraints & Scope
- **Scope**: Topological layout of the dependency graph only.
- **Constraints**: Do NOT modify source code, tests, configs, or historical audit reports. Only write investigation brief files under `docs/investigations/layouts/`.
- **Brief Length**: Strictly <= 150 lines.

## 2. Pre-Flight & Dataset Export Assignments
- **Initial Load Behavior**: Only the `default` project (4 nodes, 3 edges) loads automatically on first open.
- **Project Export Command**: Run from `dependency-analyzer/` root:
  `node scripts/export-explorer.cjs --projectName <YourProjectName>`
- **Available Exported Datasets**:
  - `default`: 4 components, 3 dependencies (`/explorer-data.json`)
  - `pbim`: 528 components, 2063 dependencies (`/pbim/explorer-data.json`)
  - `cloud-spend-tracker` (`cst`): 240 components, 1024 dependencies (`/projects/cloud-spend-tracker/explorer-data.json`)
  - `bqc`: 274 components, 603 dependencies (`/projects/bqc/explorer-data.json`)
- **Investigator Target Assignments**:
  - Investigator 01 (Hierarchical / Layered Flow): `default` and `pbim`
  - Investigator 02 (Architecture Orbit / Radial Bands): `pbim`
  - Investigator 03 (Component Constellation / Multi-Sun): `pbim` and `cloud-spend-tracker`

## 3. Verified Code UI Facts
- **Domain Lenses Bar**: `explorer/src/components/workspace/WorkspaceHeader.tsx` -> `className="domain-lenses-bar"`, container `role="tablist"`, active button `aria-label="Graph view: Interactive Dependency Graph Canvas"`.
- **Floating Controls Container**: `explorer/src/components/GraphControls.tsx` -> `className="graph-controls-floating"`, `role="toolbar"`, layout buttons `className="graph-control-btn"`, mode toggle `data-testid="architecture-mode-toggle"`.
- **Layout Activation State**: Initial graph load has no layout applied. Clicking toggle button adds `className="active"` (`architectureMode !== 'hierarchical'`) and applies:
  1. Hierarchical (Layered Flow)
  2. Hybrid Layout (Clustered Feature Regions)
  3. Architecture Orbit (Radial Concentric Bands)
  4. Component Constellation (Multiple Sun)

## 4. Git Baseline & Working Tree Status
- **Branch**: `jules-8820614745827711075-3ea1fc00`
- **Working Tree**: Clean (`git status` reports 0 uncommitted/untracked files).
- **Warning to Investigators**: Do NOT modify or touch any uncommitted/untracked user files if any are generated.

## 5. Codebase Path & Function Map
- **Graph Controls & State**: `explorer/src/components/GraphControls.tsx` (`GraphControls`), `explorer/src/components/workspace/WorkspaceHeader.tsx` (`WorkspaceHeader`), `explorer/src/App.tsx` (`handleToggleArchitectureMode`), `explorer/src/lib/projectState.ts` (`updateProjectState`, `GraphLayoutState`).
- **Layout Dispatcher**: `explorer/src/lib/graph-layout.ts` (`computeGraphLayout`), `explorer/src/lib/architecture-layout.ts` (`computeArchitectureLayoutWithMetadata`), `explorer/src/lib/workers/layout-worker-client.ts` (`dispatchWorkerLayout`).
- **Layout Application & Visibility**: `explorer/src/components/GraphView.tsx` (`applyLayoutAndRender`, `layoutMode`, `architectureMode`), `explorer/src/lib/graph-builder.ts` (`buildGraphData`), `explorer/src/lib/graph-style.ts` (`getGraphStylesheet`).
- **Orbit & Constellation Adapters**: `explorer/src/lib/adapters/component-orbit-adapter.ts` (`adaptComponentOrbit`), `explorer/src/lib/adapters/component-constellation-adapter.ts` (`adaptComponentConstellation`), `explorer/src/lib/adapters/constellation-adapter.ts` (`adaptConstellation`).
- **Orbit & Constellation Geometry Engines**: `explorer/src/lib/layout/component-orbit-layout.ts` (`computeComponentOrbitLayout`), `explorer/src/lib/layout/component-constellation-layout.ts` (`computeComponentConstellationLayout`), `explorer/src/lib/orbit-layout.ts` (`computeOrbitLayout`), `explorer/src/lib/layout/constellation-layout.ts` (`computeConstellationLayout`).
- **Position Policy & State**: `explorer/src/lib/position-policy.ts` (`resolvePositionAuthority`, `applyPositionPolicy`), `explorer/src/lib/projectState.ts` (`loadProjectState`, `mergeWithDefaultState`).

## 6. Historical Audit Report Claims
- **Macro Geometry Radii**: $R_{\text{inner}}=900\text{px}, R_{\text{outer}}=1760\text{px}$ [UNVERIFIED (from report)].
- **PBIM Initial Suns**: 14 contracted initial Suns [UNVERIFIED (from report)].
- **Identity Conservation**: Zero node cloning across local orbit projections [UNVERIFIED (from report)].
- **Position Key Isolation**: DEF-01 mode-scoped position authority separation [UNVERIFIED (from report)].

## 7. Package Commands (Package Manager: npm)
- **CLI Integration Tests**: `npm run test:cli`
- **Worker Geometry Contract**: `npm run test:worker-geometry`
- **Vitest Unit/Integration Tests**: `cd explorer && npm test`
- **Typecheck & Vite Build**: `cd explorer && npm run build`
- **Production Build Script**: `npm run build`
- **Browser E2E Testing**: `npx playwright test`

## 8. Intended Layout Behaviors & Confirmed Defects
- **Hierarchical Layout**: Layered top-to-bottom DAG flow ordered by architecture domains and layers.
- **Architecture Orbit**: Concentric radial ring bands surrounding focal LWC hubs.
- **Component Constellation**: Multi-Sun cluster geometry connecting shared Apex controllers and child LWCs.
- **Confirmed Defects**: None confirmed (awaiting fresh live reproduction by investigators).

# Source Register

This source register maps architectural topics, subsystems, contracts, test suites, and data assets to their authoritative project sources.

## Core Source Register

| Topic | Current Source | Authority | Why Read It | Next Source |
| :--- | :--- | :--- | :--- | :--- |
| **Project Overview** | `context/PROJECT-OVERVIEW.md` | CURRENT | High-level system purpose, domain scope, and subsystem layout | `README.md` |
| **Workspace Architecture** | `context/CURRENT-ARCHITECTURE.md` | CURRENT | Workspace composition, 5 workspace domains, 18 view modes | `explorer/src/types/explorer.ts` |
| **Workspace Navigation** | `explorer/src/context/WorkspaceRouterContext.tsx` | CURRENT | Single state authority for workspace view/domain routing | `explorer/src/registry/workspace-registry.ts` |
| **Selection & Investigation**| `explorer/src/context/InvestigationContext.tsx` | CURRENT | Single state authority for selection, drilldown, and drawer state | `explorer/src/hooks/useInvestigationSafe.ts` |
| **Command Palette & Surfaces**| `explorer/src/components/CommandPalette.tsx` | CURRENT | Cmd+K palette host for relocated analytical surfaces | `explorer/src/hooks/useCommandPalette.ts` |
| **Investigation Drawer & Drill**| `explorer/src/components/InvestigationDrawer.tsx` | CURRENT | Progressive one-hop investigation drawer & breadcrumb drill | `explorer/src/lib/drill.ts` |
| **Detached Drawer IPC** | `explorer/src/lib/detached-drawer.ts` | CURRENT | BroadcastChannel IPC window synchronization | `explorer/public/detached.html` |
| **Refactor Handoff Export** | `explorer/src/components/RefactorHandoffModal.tsx` | CURRENT | Refactor handoff export modal & payload builder | `explorer/src/lib/refactor-handoff.ts` |
| **Layout Engine Pipeline** | `explorer/src/lib/layout/` | CURRENT | Core multi-stage hierarchical layout pipeline (Stages 1–11) | `explorer/src/lib/layout/global-layout.ts` |
| **Orbit Layout Engine** | `explorer/src/lib/orbit-layout.ts` | CURRENT | Concentric ring radial layout math & polar coordinate placement | `explorer/src/lib/orbit-semantics.ts` |
| **Web Worker Offloading** | `explorer/src/lib/workers/layout.worker.ts` | CURRENT | Async Web Worker layout offloading with stale rejection | `explorer/src/lib/workers/layout-worker-client.ts` |
| **Visualization Lenses** | `explorer/src/lib/adapters/` | CURRENT | Pure adapters mapping raw graph data to 12 canonical lenses | `explorer/src/components/` |
| **Data Contracts & Types** | `explorer/src/types/explorer.ts` | CURRENT | Canonical TypeScript interfaces (`ExplorerData`, `Node`, `Edge`) | `explorer/src/lib/schema.ts` |
| **CLI & Analyzer Tools** | `scripts/` | CURRENT | Node.js export, analysis, snapshot, and CLI gate tools | `package.json` |
| **CLI Safety Envelope** | `safety-envelope.cjs` | CURRENT | Non-negotiable structural and security safety rules | `architecture-change-gate.cjs` |
| **CLI Test Suite** | `scripts/test-cli-integration.cjs` | CURRENT | 31 root-level CLI integration test suites | `package.json` |
| **Vitest Unit/UI Tests** | `explorer/src/test/` | CURRENT | Vitest component, hook, layout, and adapter regression tests | `explorer/vitest.config.ts` |
| **Production Datasets** | `explorer/public/projects/pbim/explorer-data.json` | CURRENT | Authoritative 528-node / 2063-edge PBIM dataset | `project-manifest.json` |
| **Historical Decisions** | `context/HISTORICAL-DECISIONS.md` | HISTORICAL | Key rationale, trade-offs, and rejected alternatives | `context/SUPERSESSION-MAP.md` |

## Authority Matrix

1. **CURRENT EXECUTABLE SOURCE CODE** (`explorer/src/`, `scripts/`) = What the system currently does.
2. **CURRENT TESTS / CONTRACTS** (`explorer/src/test/`, `scripts/test-*.cjs`) = What behavior is enforced.
3. **CURRENT CONFIGURATION / SCHEMA** (`package.json`, `explorer/src/types/explorer.ts`) = What the system expects.
4. **CANONICAL FIXTURES / RUNTIME DATA** (`explorer/public/projects/`, `analyze/projects/`) = What the system operates on.
5. **CURRENT CONTEXT FILES** (`context/`, `AGENT.md`) = Routing and location map for current project state.
6. **HISTORICAL REPORTS** (`PHASE_*.md`, `WAVE_*.md`, `audit-reports/`) = Forensic logs, historical experiments, and rejected options.

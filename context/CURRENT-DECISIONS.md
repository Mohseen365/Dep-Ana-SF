# Current Architectural Decisions

The following architectural decisions are currently enforced by active source code and test suites in the repository:

## 1. State Authority & Selection Neutrality
- **Decision:** Single-owner React contexts govern state. `WorkspaceRouterContext` owns workspace routing; `InvestigationContext` owns selection and investigation state.
- **Enforcement:** `SELECTION ≠ NAVIGATION`. Selecting a node, edge, or finding updates selection state without triggering automatic workspace mode navigation.
- **Source:** `explorer/src/context/InvestigationContext.tsx`, `explorer/src/context/WorkspaceRouterContext.tsx`.
- **Verification:** `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`.

## 2. 18 View Modes across 5 Workspace Domains
- **Decision:** All interactive views are organized into 5 domain categories: Portfolio & Health, Topological Structure, Feature Relationships, Local Neighborhood, and Governance & Quality.
- **Enforcement:** Workspace header renders 5 domain tabs; `ViewModeSwitcher` groups modes by domain.
- **Source:** `explorer/src/registry/workspace-registry.ts`, `explorer/src/types/explorer.ts`.
- **Verification:** `explorer/src/components/WorkspaceHeader.tsx`, `explorer/src/components/ViewModeSwitcher.tsx`.

## 3. Position Authority Invariance & Web Worker Offloading
- **Decision:** Layout calculations execute asynchronously in a background Web Worker (`layout.worker.ts`) with zero coordinate drift (`0.00000px`) compared to synchronous execution.
- **Enforcement:** `runLayoutWithMetadataAsync` dispatches layout to Worker thread with a monotonically increasing generation counter to reject stale responses. Level 1–5 position authority hierarchy is strictly respected.
- **Source:** `explorer/src/lib/workers/layout.worker.ts`, `explorer/src/lib/graph-layout.ts`.
- **Verification:** `explorer/src/test/Phase3D_WebWorkerLayout.test.ts`.

## 4. Orbit Radial Polar Layout Engine
- **Decision:** Concentric 6-ring radial layout (`R0` entry points to `R5` fallback schema) using water-filling polar sector allocation and dynamic radial track staggering.
- **Enforcement:** Exact Cartesian AABB collision predicate ($|\Delta x| < 160\text{px}$ and $|\Delta y| < 100\text{px}$) achieving 0 initial collisions and 0 repair operations on the PBIM dataset.
- **Source:** `explorer/src/lib/orbit-layout.ts`, `explorer/src/lib/orbit-semantics.ts`.
- **Verification:** `explorer/src/lib/orbit-layout.test.ts`, `scripts/generate-orbit-closure-report.cjs`.

## 5. Constellation Lens Static/Interactive Sync
- **Decision:** Component Constellation lens filtering (42 visible nodes, 71 visible edges) applies in both Static and Interactive layout modes.
- **Enforcement:** `GraphView.tsx` evaluates `if (autoLayoutPolicy === true || architectureMode === 'orbit' || architectureMode === 'constellation')` to run element synchronization.
- **Source:** `explorer/src/components/GraphView.tsx`.
- **Verification:** `explorer/src/test/static-constellation-projection.test.ts`.

## 6. Graph-First Two-Pane Shell & Command Palette Relocation
- **Decision:** The application operates as a two-pane graph-first workspace (full-canvas graph + right Investigation Drawer). Permanent competing panels are relocated into a Cmd+K / Ctrl+K Command Palette host without modifying internal panel components.
- **Enforcement:** `DetailsPanel.tsx` is deleted. Investigation Drawer (`InvestigationDrawer.tsx`) manages progressive one-hop drilling (`drill.ts`), breadcrumbs, pinning, and detached window IPC sync (`BroadcastChannel('investigator')`). Refactor Handoff (`RefactorHandoffModal.tsx`) is reinstated as a Cmd+K command and drawer header action.
- **Source:** `explorer/src/App.tsx`, `explorer/src/components/CommandPalette.tsx`, `explorer/src/components/InvestigationDrawer.tsx`, `explorer/src/lib/drill.ts`, `explorer/src/lib/detached-drawer.ts`.
- **Verification:** `explorer/src/components/CommandPalette.test.tsx`, `explorer/src/components/InvestigationDrawer.test.tsx`.

## 7. Deterministic Safety Envelope & Change Gate
- **Decision:** 100% deterministic analysis CLI pipeline. Zero LLM dependencies or runtime calls in analysis scripts.
- **Enforcement:** Change gates trigger `SEMANTIC_INVESTIGATION_REQUIRED` flags only when genuine semantic uncertainty exists, while preserving 0 LLM calls in execution.
- **Source:** `safety-envelope.cjs`, `architecture-change-gate.cjs`, `architecture-snapshot.cjs`.
- **Verification:** `scripts/test-cli-integration.cjs`.

## 8. DEF-01 Lens B Position-Key Isolation
- **Decision:** For non-empty node inputs, the Orbit and Constellation layout calculation branches of `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) return position maps containing strictly projected node IDs (`result.projectedNodeIds`). Stale coordinates for unprojected nodes present in `existingPositions` are forbidden from being re-injected into layout calculation results.
- **Enforcement:** Two stale `existingPositions` fallback loops were removed from `explorer/src/lib/architecture-layout.ts` (12 lines deleted). Product Gates A–D (shared SObjects visual anchors, angular sector semantics, unreachable-node UX presentation, drag persistence scoping) remain 100% open and unresolved.
- **Source:** `explorer/src/lib/architecture-layout.ts`.
- **Verification:** Dedicated Vitest suite `explorer/src/test/def01-position-isolation.test.ts` (4/4 passed, exit code 0) and final evidence gate report `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md`.

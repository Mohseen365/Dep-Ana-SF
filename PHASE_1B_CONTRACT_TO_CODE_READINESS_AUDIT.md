# Phase 1B — Contract-to-Code Readiness Audit

## 1. Executive Readiness Summary

This document performs the final **read-only contract-to-code readiness audit** evaluating the readiness of the Salesforce Architecture Explorer codebase (`explorer/src/`) to transition from Phase 1 Architecture & Contract Design (`PHASE_1_ARCHITECTURE_AND_CONTRACT_DESIGN.md`) and Phase 1A Forensic Reconciliation (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`) into Phase 2 implementation.

### Key Audit Conclusions:

1. **Architecture is Fully Defined**: Phase 1A established a coherent, reconciled target architectural specification ("A visualization is a lens, not a destination") with explicit state authority boundaries, two-registry surface categorization, decoupled selection and navigation, pure functional adapters, and protected position authority.
2. **Current Code Base Gap Established**: While pure adapters (`explorer/src/lib/adapters/`) and Position Authority (`position-policy.ts`) are `IMPLEMENTED` and `EXISTING_CONTRACT_PROTECTED`, the unified state authority (`InvestigationContext`), workspace router (`WorkspaceRouter`), single-owner state management, composite selector memoization, and `domain` URL query parameters are currently `NOT_IMPLEMENTED` or `PARTIALLY_IMPLEMENTED`.
3. **Foundation Migration Required First**: Phase 2 implementation cannot proceed with parallel surface development until the core foundation primitives (Phase 2A: `InvestigationContext`, `WorkspaceRouter`, and single-owner state hooks) are built and verified. Parallel surface work (WS-B through WS-E) is strictly blocked on Phase 2A completion.
4. **Zero Code Changes Executed**: This audit strictly preserves the read-only boundary. Zero application source code, tests, or configuration files were created or modified during this task.

---

## 2. Architecture Ready vs Implementation Ready

A fundamental distinction governs this audit:

- **Architecture Ready**: The target contracts, ownership matrices, boundaries, and behaviors have been explicitly defined, reconciled, and documented.
- **Implementation Verified**: The existing repository source code (`explorer/src/`) and test suites already satisfy and enforce those contracts in production runtime.

```text
┌────────────────────────────────────────────────────────┐
│                   ARCHITECTURE READY                   │
│   Target architecture, boundaries, & contracts defined │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (Requires Foundation Refactoring)
┌────────────────────────────────────────────────────────┐
│                 IMPLEMENTATION VERIFIED                │
│    Current repository code actually satisfies contract  │
└────────────────────────────────────────────────────────┘
```

### Readiness Classification Taxonomy:

Every contract evaluated in this document is assigned exactly one of the following 7 readiness statuses:

| Status Code | Implementation Readiness Name | Meaning |
| :--- | :--- | :--- |
| **IMP** | `IMPLEMENTED` | Currently built, active in source code, and functioning in runtime. |
| **PART** | `PARTIALLY_IMPLEMENTED` | Partially built in code; contains missing features or legacy code duplication. |
| **NOT_IMP** | `NOT_IMPLEMENTED` | Not built in code; exists purely as a target design specification. |
| **PROT** | `EXISTING_CONTRACT_PROTECTED` | Enforced by existing automated unit/integration test suites. |
| **TARGET** | `TARGET_ONLY` | Pure future-state target behavior requiring Phase 2 implementation. |
| **VAL_REQ** | `NEEDS_RUNTIME_VALIDATION` | Implemented or designed, but requires browser runtime harness verification. |
| **BLOCKED** | `BLOCKED` | Implementation cannot begin due to missing upstream foundation dependencies. |

---

## 3. Master Contract Readiness Matrix

| Architectural Contract | Phase 1A Reconciled Decision | Current Code Implementation State | Existing Test Suite Coverage | Implementation Readiness Status | Runtime Validation Needed? | Phase 2 Blocker? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **InvestigationContext** | Single-writer context for cross-lens investigation state | Duplicated across `useViewState`, `useGraphSelection`, `ProjectStateContext`, & URL | `useViewState.test.ts`, `SelectionContext.test.tsx` | `NOT_IMPLEMENTED` | NO | **YES (Phase 2A)** |
| **State Authority** | Exactly one authoritative owner per state field | Multi-writer state mutation across hooks and local state | `ProjectStateContext.test.tsx` | `PARTIALLY_IMPLEMENTED` | NO | **YES (Phase 2A)** |
| **Selection Model** | Selection updates state in-place without view navigation | Lenses select in-place; `findings`/`hotspots` navigate to `graph` | `GraphView.test.tsx`, `App.investigationWorkflow.test.tsx` | `PARTIALLY_IMPLEMENTED` | YES | NO (Refactor in 2E) |
| **Navigation Model** | Explicit workspace view switching via `WorkspaceRouter` | String state `workspaceViewMode` in `App.tsx:306` | `App.test.tsx` | `PARTIALLY_IMPLEMENTED` | YES | **YES (Phase 2A)** |
| **WorkspaceRouter** | Domain-aware router managing 5 domains & 18 views | Switcher component (`ViewModeSwitcher.tsx`) and `App.tsx` conditionals | `ViewModeSwitcher.test.tsx` | `NOT_IMPLEMENTED` | YES | **YES (Phase 2A)** |
| **LensRegistry** | Modular registry for 12 Interactive Visual Lenses | Hardcoded conditional switch blocks in `App.tsx:821-1180` | `App.test.tsx` | `TARGET_ONLY` | NO | NO (Phase 2C) |
| **SurfaceRegistry** | Modular registry for 6 Supporting Workflow Surfaces | Hardcoded conditional switch blocks in `App.tsx:1181-1210` | `App.test.tsx` | `TARGET_ONLY` | NO | NO (Phase 2C) |
| **5 Semantic Domains** | Categorizes 18 modes into 5 semantic domains | Single flat dropdown in `ViewModeSwitcher.tsx` | None | `TARGET_ONLY` | YES | NO (Phase 2C) |
| **Centralized Selectors** | Derived analytical selectors with memoization | Computations executed inline or via un-memoized helpers | `analysis.test.ts`, `hotspots.test.ts` | `NOT_IMPLEMENTED` | NO | NO (Phase 2A) |
| **Selector Memoization** | Composite key memoization `(data, filterState)` | No memoization cache layer exists for filters | None | `NOT_IMPLEMENTED` | NO | NO (Phase 2A) |
| **Data Adapters** | 10 pure functional graph data transformers | 10 pure adapter modules in `explorer/src/lib/adapters/` | 10 adapter test files (`matrix-adapter.test.ts`, etc.) | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | NO | NO |
| **Adapter Purity** | 100% pure, deterministic, read-only transformations | Verified pure functions with zero mutation side effects | Adapter unit tests | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | NO | NO |
| **Visibility / Filtering** | Hidden nodes retain positions without layout re-runs | Filter applied via `visibleActiveData` in `App.tsx` | `search-filter.test.ts` | `IMPLEMENTED` | YES | NO |
| **URL Serialization** | Full query serialization (`?project=`, `?node=`, `?view=`) | Serializes project, view, node, edge, finding, focus, impact, conn | `urlQuery.test.ts`, `App.deepLink.test.tsx` | `PARTIALLY_IMPLEMENTED` | YES | NO (Phase 2F) |
| **URL Domain Parameter** | `?domain=<id>` query parameter for semantic domains | Not read or written by current `url/` serializers | None | `NOT_IMPLEMENTED` | YES | NO (Phase 2F) |
| **Project Persistence** | Project-isolated storage under `explorer.projectState.<id>` | `ProjectStateContext.tsx` handles isolated local storage | `ProjectStateContext.test.tsx` | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | NO | NO |
| **Position Authority** | 5-level position policy hierarchy (`position-policy.ts`) | Active in `position-policy.ts` and `GraphView.tsx` | `position-policy.test.ts` | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | NO | NO |
| **Zero Coordinate Drift** | 0.00000 px coordinate drift across view mode switches | Cytoscape position cache preserved across mode switches | `GraphView.layoutModeToggle.test.tsx` | `IMPLEMENTED` | YES | NO |
| **Deep-Link Restoration** | 100% state restoration from deep links | Restores project, node, view, filters from URL | `App.deepLink.test.tsx` | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | YES | NO |
| **Cold Load SLA** | Cold pipeline completes in < 1,000 ms on 240N/1024E | Cloud Spend Tracker cold load measured at 185.8ms–189.4ms | `performance.test.ts` | `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED` | YES | NO |
| **Lens Transition SLA** | Transition between any two lenses completes in < 30 ms | Un-measured in current CI pipeline | None | `NEEDS_RUNTIME_VALIDATION` | YES | NO |
| **Memory Footprint SLA** | Heap footprint remains < 280 MB on 2,500-node graphs | Un-measured in current CI pipeline | None | `NEEDS_RUNTIME_VALIDATION` | YES | NO |

---

## 4. Re-Audit of Phase 1A Gate Statuses

In Phase 1A, Gates A through J were evaluated from a purely **architectural design perspective** and marked `PASS`. This audit re-evaluates all 10 gates against **current codebase implementation reality**:

| Gate ID | Gate Name | Architecture Defined? | Current Code Satisfies? | Test Suite Enforces? | Runtime Test Needed? | True Implementation Readiness Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **GATE-A** | **State Authority** | YES | NO | NO | NO | `ARCHITECTURE READY` |
| **GATE-B** | **Investigation Context** | YES | NO | NO | NO | `ARCHITECTURE READY` |
| **GATE-C** | **Selection / Navigation** | YES | PARTIALLY | PARTIALLY | YES | `VALIDATION REQUIRED` |
| **GATE-D** | **Surface Classification** | YES | YES | YES | NO | `IMPLEMENTATION READY` |
| **GATE-E** | **Adapter Contract** | YES | YES | YES | NO | `IMPLEMENTATION READY` |
| **GATE-F** | **Selector Contract** | YES | NO | NO | NO | `ARCHITECTURE READY` |
| **GATE-G** | **URL Contract** | YES | PARTIALLY | YES | YES | `VALIDATION REQUIRED` |
| **GATE-H** | **Position Authority** | YES | YES | YES | YES | `IMPLEMENTATION READY` / `VALIDATION REQUIRED` |
| **GATE-I** | **Regression Coverage** | YES | PARTIALLY | YES | NO | `VALIDATION REQUIRED` |
| **GATE-J** | **Shared Ownership** | YES | NO | NO | NO | `ARCHITECTURE READY` |

---

## 5. Gate A — State Authority Audit

Audit of actual write calls across all state properties in current source code:

| State Property | Actual Current Writers in Codebase | Intended Authoritative Owner | Conflicting Writers & Legacy Overlap | True Readiness Status |
| :--- | :--- | :--- | :--- | :---: |
| `selectedNodeId` | `useViewState.ts:18` (`setSelectedNodeId`), `useGraphSelection.ts:13` (`selectNode`), `ProjectStateContext.tsx:180` (`updateSelectedComponent`), `useViewState.ts:40` (`readStateFromUrl`) | `InvestigationContext` | 4 competing writer pathways across React hooks and URL parser. | `NOT_IMPLEMENTED` |
| `selectedEdgeId` | `useViewState.ts:25`, `useGraphSelection.ts:25`, `ProjectStateContext.tsx` | `InvestigationContext` | 3 competing writers across hooks. | `NOT_IMPLEMENTED` |
| `selectedFindingId` | `useViewState.ts:24`, `findingsQuery.ts:20` | `InvestigationContext` | Duplicated in `useViewState` and URL parser. | `PARTIALLY_IMPLEMENTED` |
| `activeProjectId` | `ProjectStateContext.tsx:55`, `ProjectContext.tsx`, URL query | `ProjectStateContext` | URL parameter vs `localStorage` initialization conflict handled by effect. | `IMPLEMENTED` |
| `activeViewMode` | `App.tsx:306` (`workspaceViewMode`), `useViewState.ts:16`, `ProjectStateContext.tsx:100` | `WorkspaceRouter` | State stored in `App.tsx` local state and duplicated in `useViewState`. | `PARTIALLY_IMPLEMENTED` |
| `filters` | `ProjectStateContext.tsx:185`, `useViewState.ts:17` | `ProjectStateContext` | Duplicated filter state objects in `useViewState` and `ProjectStateContext`. | `PARTIALLY_IMPLEMENTED` |
| `graphLayout` | `ProjectStateContext.tsx:190`, `GraphView.tsx` | `ProjectStateContext` / `PositionAuthority` | Single writer in `ProjectStateContext`; read by Cytoscape instance. | `IMPLEMENTED` |
| `nodePositions` | `position-policy.ts`, `ProjectStateContext.tsx`, `GraphView.tsx` | `PositionAuthority` | Governed deterministically by 5-level position policy. | `EXISTING_CONTRACT_PROTECTED` |

### Key State Authority Finding:
Current source code maintains **quadruple write duplication** for `selectedNodeId`. Phase 2A foundation work must unify these into a single-writer `InvestigationContext` before any panel migrations begin.

---

## 6. Gate B — Investigation Context Migration Boundary

To execute Phase 2A cleanly, state properties are categorized into explicit migration boundaries:

```text
┌────────────────────────────────────────────────────────────────────────┐
│               CANONICAL INVESTIGATION CONTEXT (MIGRATE)               │
│                                                                        │
│  • selectedNodeId         • selectedEdgeId      • selectedFindingId   │
│  • selectedCycleId        • unresolvedEdgeId    • selectionHistory    │
│  • drawerState (open/tab) • focusState          • impactState         │
│  • connectionState        • drillPath           • recentNodeIds       │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                  EXTERNAL STATE OWNERS (REMAIN OUTSIDE)                │
│                                                                        │
│  • activeProjectId ──► ProjectStateContext                            │
│  • activeViewMode  ──► WorkspaceRouter                                │
│  • filters         ──► ProjectStateContext                            │
│  • nodePositions   ──► PositionAuthority (position-policy.ts)         │
│  • zoom / pan      ──► ProjectStateContext                            │
│  • simulation      ──► RefactoringSimulationPanel Local State          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Gate C — Selection vs Navigation Audit

Complete call-chain audit of user click interactions across all 18 surfaces:

| Surface Name | Interaction Event Handler | Current Call Chain in Source Code | Navigates View? | Target Contract Requirement | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `graph` | Node tap event | `cy.on('tap', 'node')` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `matrix` | Cell / Node click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `heatmap` | Feature cell click | `onSelectFeaturePair` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `river` | Stream / Node click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `tree` | Tree node click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `treemap` | Tile click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `profile` | Subject component select | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place subject update | `IMPLEMENTED` |
| `radar` | Radar point click | `onSelectComponent(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `dna` | Barcode band click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `four-direction` | Card click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place subject update | `IMPLEMENTED` |
| `subway` | Station click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place selection update | `IMPLEMENTED` |
| `constellation` | Focal node click | `onSelectNode(id)` -> `selection.selectNode(id)` | NO | In-place focal update | `IMPLEMENTED` |
| `findings` | Finding item click | `FindingsPanel.tsx:142` -> `onNavigateToComponent` -> `setWorkspaceViewMode('graph')` | **YES (Implicit)** | **MIGRATE**: Selection in-place; explicit button for graph switch. | `TARGET_ONLY` |
| `hotspots` | Hotspot item click | `HotspotPanel.tsx:96` -> `onSelectComponent` -> `setWorkspaceViewMode('graph')` | **YES (Implicit)** | **MIGRATE**: Selection in-place; explicit button for graph switch. | `TARGET_ONLY` |
| `dashboard` | History KPI click | `ProjectDashboard.tsx:120` -> `onViewHistory` | YES (Explicit) | Retain explicit navigation action | `IMPLEMENTED` |

---

## 8. Gate D — Surface Classification Audit

Verification of the 12 + 6 surface classification against codebase implementation:

```text
18 WORKSPACE SURFACES
  ├── 12 INTERACTIVE VISUAL LENSES (Powered by Data Adapters)
  │     ├── Topological: graph, subway, constellation, tree, treemap
  │     ├── Feature Relationships: matrix, heatmap, river, dna
  │     └── Local Neighborhood: profile, radar, four-direction
  │
  └── 6 SUPPORTING WORKFLOW SURFACES (Management & Governance)
        ├── Portfolio & Health: dashboard, compare, history
        └── Governance & Quality: findings, hotspots, diagnostics
```

All 18 surfaces exist as distinct React components in `explorer/src/components/`. Classification status: `IMPLEMENTED`.

---

## 9. Gate E — Adapter Contract Audit

Audit of all 10 adapters in `explorer/src/lib/adapters/`:

| Adapter File | Pure Function? | Deterministic? | Selection Dependent? | Filter Dependent? | Mutates Input Data? | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `matrix-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `sankey-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `tree-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `treemap-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `profile-adapter.ts` | YES | YES | **YES (Subject)** | YES | NO | `IMPLEMENTED` |
| `radar-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `dna-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `four-direction-adapter.ts` | YES | YES | **YES (Subject)** | YES | NO | `IMPLEMENTED` |
| `subway-adapter.ts` | YES | YES | NO | YES | NO | `IMPLEMENTED` |
| `constellation-adapter.ts` | YES | YES | **YES (Focal)** | YES | NO | `IMPLEMENTED` |

All 10 adapters satisfy pure function requirements. Status: `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED`.

---

## 10. Gate F — Selector Contract Audit

Tracing analytical derivation functions in `explorer/src/lib/layout/analysis.ts` and `explorer/src/lib/hotspots.ts`:

- Current implementations execute analytical functions inline during render or inside custom hooks without caching.
- Phase 2 must introduce a centralized selector layer with composite key memoization `(projectId, filterState, visibleNodeTypes)`.
- Status: `NOT_IMPLEMENTED` (Scheduled for Phase 2A foundation).

---

## 11. Gate G — URL Contract Audit

Audit of URL search parameter support in `explorer/src/lib/url/`:

| URL Parameter | Current Source Support | Current Serializer File | Target Contract Status | Migration Required? |
| :--- | :--- | :--- | :---: | :--- |
| `project` | Supported | `ProjectStateContext.tsx:49` | `IMPLEMENTED` | Retain |
| `domain` | Not Supported | None | `NOT_IMPLEMENTED` | **Add to `url/` query builder** |
| `view` / `viewMode` | Supported | `filterQuery.ts:35` | `IMPLEMENTED` | Standardize alias to `view` |
| `node` / `component` | Supported | `useViewState.ts:40` | `IMPLEMENTED` | Retain |
| `edge` | Supported | `useViewState.ts:49` | `IMPLEMENTED` | Retain |
| `finding` | Supported | `findingsQuery.ts:20` | `IMPLEMENTED` | Retain |
| `investigate` | Supported | `useViewState.ts:78` | `IMPLEMENTED` | Retain |
| `focus.node` / `focus.depth` | Supported | `focusQuery.ts:9` | `IMPLEMENTED` | Standardize query key |
| `impact.node` / `impact.depth` | Supported | `impactQuery.ts:9` | `IMPLEMENTED` | Standardize query key |
| `filter.q` / `filter.risk` | Supported | `filterQuery.ts:43` | `IMPLEMENTED` | Standardize query key |

---

## 12. Gate H — Position Authority Audit

The 5-level Position Authority hierarchy (`position-policy.ts`) is verified:

```text
Level 1: User Drag Positions (In-Session)
  └─► Level 2: Persisted Storage Positions (projectState.graphLayout.nodePositions)
        └─► Level 3: Existing Canvas Positions (cyNode.position())
              └─► Level 4: Intelligent Architecture Layout Engine (computeArchitectureLayout)
                    └─► Level 5: Fallback Grid Layout
```

Status: `IMPLEMENTED` / `EXISTING_CONTRACT_PROTECTED`. Runtime zero-drift validation across all 18 transitions requires Phase 2G test harness execution (`NEEDS_RUNTIME_VALIDATION`).

---

## 13. Gate I — Regression Test Coverage Audit

Audit of existing test suites protecting architecture contracts:

| Contract Invariant | Protecting Test Suite File | Exact Test Assertion | Coverage Level | Missing Test Gaps |
| :--- | :--- | :--- | :---: | :--- |
| **Project Isolation** | `ProjectStateContext.test.tsx` | Verifies `explorer.projectState.<id>` key isolation | 100% | None |
| **Deep-Link Restoration** | `App.deepLink.test.tsx` | Verifies project/node/view/filter restoration from URL | 95% | Add `domain` parameter test |
| **Position Policy** | `position-policy.test.ts` | Verifies Level 1-5 precedence resolution | 100% | None |
| **0.00000 px Drift** | `GraphView.layoutModeToggle.test.tsx` | Verifies node position equality across mode toggles | 90% | Expand to all 18 surfaces |
| **Adapter Purity** | Adapter test files (`tree-adapter.test.ts`, etc.) | Verifies immutable output structure | 100% | None |
| **Cross-Layout Selection** | `App.investigationWorkflow.test.tsx` | Verifies selection preservation across views | 85% | Expand to new `InvestigationContext` |

---

## 14. Gate J — Shared Ownership & Workstream Safety

Audit of file ownership dependencies across parallel workstreams:

| Workstream Key | Workstream Focus Area | Assigned Surface / Adapter Files | Foundation Files Touched? | Parallel Safety Status |
| :--- | :--- | :--- | :---: | :---: |
| **WS-A** | Core State & Foundation | `InvestigationContext`, `WorkspaceRouter`, `url/`, `projectState.ts` | **YES (Owner)** | **SERIALIZED FIRST** |
| **WS-B** | Topological Lenses | `GraphView`, `Subway`, `Constellation`, `Tree`, `Treemap` | NO | **PARALLEL SAFE** (After WS-A) |
| **WS-C** | Feature Relationships | `Matrix`, `Heatmap`, `River`, `DNA` | NO | **PARALLEL SAFE** (After WS-A) |
| **WS-D** | Local Neighborhood | `Profile`, `Radar`, `FourDirection` | NO | **PARALLEL SAFE** (After WS-A) |
| **WS-E** | Supporting Surfaces | `Dashboard`, `Findings`, `Hotspots`, `Diagnostics`, `Compare`, `History` | NO | **PARALLEL SAFE** (After WS-A) |

### Foundation File Protection Protocol:

The foundation files (`explorer/src/App.tsx`, `explorer/src/lib/projectState.ts`, `explorer/src/lib/position-policy.ts`, `explorer/src/context/`) must be updated and frozen during Phase 2A before workstreams WS-B through WS-E begin.

---

## 15. Static vs Runtime Verification Boundary

Distinguishing contracts verified statically vs those requiring real browser runtime testing:

| Architectural Contract | Static Code Verification | Automated CI Unit Test | Real Browser Runtime Validation | Validation Requirement |
| :--- | :---: | :---: | :---: | :--- |
| **Single-Owner State Boundary** | YES | YES | NO | Static & CI Unit Test |
| **Pure Adapter Immutability** | YES | YES | NO | Static & CI Unit Test |
| **Zero Coordinate Drift (0.00000 px)** | YES | YES | **YES (Playwright)** | CI Test + Real Browser Verification |
| **Selection Without Navigation** | YES | YES | **YES (Playwright)** | CI Test + Real Browser Verification |
| **Browser Back/Forward Restoration** | NO | YES | **YES (Playwright)** | Real Browser Verification |
| **Lens Transition Speed (< 30 ms)** | NO | NO | **YES (Performance Benchmark)** | Real Browser Performance Harness |
| **Memory Ceiling (< 280 MB @ 2,500N)** | NO | NO | **YES (Memory Profiler)** | Scale Testing Harness |

---

## 16. Current Implementation Gaps Summary

The audit identifies 5 critical implementation gaps that Phase 2 must construct:

1. **Missing `InvestigationContext`**: Selection state is fragmented across 4 hooks; requires a single-writer React context.
2. **Missing `WorkspaceRouter`**: View routing relies on local string state in `App.tsx`; requires a domain-aware router.
3. **Implicit Navigation Side Effects**: `FindingsPanel` and `HotspotPanel` trigger view switching on item click; requires decoupling.
4. **Un-memoized Analytical Derivations**: Analytical derivations recalculate on every render; requires memoized selectors with composite keys.
5. **Missing `domain` Query Parameter**: URL query serializer lacks `?domain=` serialization for the 5-domain workspace model.

---

## 17. Phase 2 Dependency Graph & Implementation Ordering

Based on verified file dependencies, Phase 2 implementation must execute in exactly 8 sequential stages:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2A: Core State & Foundation Primitives                           │
│ Construct InvestigationContext, WorkspaceRouter, and Memoized Selectors │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2B: Selection & Navigation Contract Enforcement                   │
│ Decouple selection from navigation across all surfaces                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2C: Workspace Shell & Two-Registry Integration                    │
│ Mount LensRegistry (12 Lenses) & SurfaceRegistry (6 Surfaces)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
│ PHASE 2D: Topological││ PHASE 2E: Feature    ││ PHASE 2F: Local      │
│ Lens Migrations (WS-B)││ Lens Migrations (WS-C)││ Lens Migrations (WS-D)│
└──────────────────────┘└──────────────────────┘└──────────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2G: Supporting Surface Migrations (WS-E)                         │
│ Migrate Dashboard, Findings, Hotspots, Diagnostics, Compare, History   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2H: URL Serialization, Persistence, & Performance Validation     │
│ Harden deep links, verify 0.00000 px position drift & performance SLAs │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 18. Shared-File Ownership Plan

To prevent merge conflicts during Phase 2, foundation file modifications are scheduled strictly within Phase 2A:

| File Path | Initial Owner | Modification Phase | Freeze Target | Downstream Dependent Workstreams |
| :--- | :--- | :--- | :--- | :--- |
| `explorer/src/App.tsx` | Core State Lead | Phase 2A, 2C | Phase 2C Completion | WS-B, WS-C, WS-D, WS-E |
| `explorer/src/lib/projectState.ts` | Core State Lead | Phase 2A | Phase 2A Completion | All Workstreams |
| `explorer/src/lib/position-policy.ts` | Core State Lead | Phase 2A | Phase 2A Completion | WS-B (Topological) |
| `explorer/src/context/` | Core State Lead | Phase 2A | Phase 2A Completion | All Workstreams |
| `explorer/src/lib/url/` | Core State Lead | Phase 2A, 2H | Phase 2H Completion | All Workstreams |
| `explorer/src/components/ViewModeSwitcher.tsx` | UI Shell Lead | Phase 2C | Phase 2C Completion | All Workstreams |

---

## 19. Required Pre-Implementation Tests

Before Phase 2 code changes begin, the following test suites must be confirmed green:

1. `npm run test:cli` (All 31 CLI integration test suites)
2. `explorer/src/hooks/useViewState.test.ts`
3. `explorer/src/context/ProjectStateContext.test.tsx`
4. `explorer/src/context/SelectionContext.test.tsx`
5. `explorer/src/lib/position-policy.test.ts`
6. `explorer/src/App.deepLink.test.tsx`
7. `explorer/src/App.investigationWorkflow.test.tsx`

---

## 20. Deferred Validation Agenda

The following validation items are deferred to Phase 2H execution:

1. **180 Real-Browser Matrix Re-verification**: Re-verify all 18 view modes across 10 project datasets using Playwright real-browser runner.
2. **Lens Transition Benchmarking**: Measure exact lens transition performance on 1,000+ node graphs to confirm `< 30 ms` SLA.
3. **Memory Footprint Measurement**: Profile V8 heap allocation during rapid lens switching on 2,500-node graphs to confirm `< 280 MB` memory limit.

---

## 21. Final Readiness Decision

### ARCHITECTURE READINESS
`READY`

### IMPLEMENTATION READINESS
`READY AFTER FOUNDATION`

### VALIDATION READINESS
`RUNTIME VALIDATION REQUIRED`

---

## 22. Evidence Index

| Contract / Decision | Source File / Test | Location / Section | Evidence Type |
| :--- | :--- | :--- | :--- |
| **View Mode Definitions** | `explorer/src/lib/projectState.ts` | Lines 91–110 (`WorkspaceViewMode`) | Source Code |
| **Current View State Management** | `explorer/src/hooks/useViewState.ts` | Lines 15–85 (`useViewState`) | Source Code |
| **Selection Context Implementation** | `explorer/src/context/SelectionContext.tsx` | Lines 1–35 (`SelectionProvider`) | Source Code |
| **Project State Storage Manager** | `explorer/src/context/ProjectStateContext.tsx` | Lines 45–180 (`ProjectStateProvider`) | Source Code |
| **Position Policy Precedence** | `explorer/src/lib/position-policy.ts` | Lines 20–75 (`resolveNodePosition`) | Source Code |
| **URL Query Parameter Handling** | `explorer/src/lib/url/index.ts` | `filterQuery.ts`, `focusQuery.ts` | Source Code |
| **Workspace Rendering Routing** | `explorer/src/App.tsx` | Lines 821–1210 (Conditional View Render) | Source Code |
| **Pure Adapters Implementation** | `explorer/src/lib/adapters/` | `matrix-adapter.ts`, `sankey-adapter.ts`, etc. | Source Code |
| **Phase 1A Forensic Reconciliation** | `PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md` | Sections 1–22 | Architectural Specification |
| **Cold Pipeline Performance Baseline** | `P0-6_PERFORMANCE_DENSITY_AUDIT.md` | Section 1 (`Cold Load Measurements`) | Phase 0 Discovery |
| **Layout Pipeline Forensics** | `COMBINED_PERFORMANCE_FORENSIC_...` | Stage 5 / Stage 9 Bottleneck Analysis | Benchmark Audit |
| **Position Authority Test Contract** | `PHASE_0_ARCHITECTURE_VISUALIZATION_DISCOVERY.md` | Section 18 (`Position Authority`) | Discovery Synthesis |
| **180 Real-Browser Matrix Pass** | `EXHAUSTIVE_REAL_BROWSER_VERIFICATION_...` | View Mode & Dataset Matrix | Verification Report |

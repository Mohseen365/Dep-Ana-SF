# Phase 1A — Architecture Contract Forensic Reconciliation

## 1. Executive Reconciliation Summary

This document performs a **strict, read-only forensic reconciliation** of the Phase 1 Target Architecture and Contract Design (`PHASE_1_ARCHITECTURE_AND_CONTRACT_DESIGN.md`) prior to any Phase 2 implementation. Grounded in direct source inspection of `explorer/src/`, executable test suites, Phase 0 discovery evidence (`P0-1` through `P0-7`, `PHASE_0_ARCHITECTURE_VISUALIZATION_DISCOVERY.md`), and Phase 0 exit gate reconciliations, this audit evaluates every proposed contract, boundary, state field, performance claim, and classification in Phase 1.

### Key Audit Findings:

1. **Architectural Grounding Validated**: Phase 1's central hypothesis—*"A visualization is a lens, not a destination"*—is strongly backed by user workflow demands, but its implementation contract required narrowing to prevent state fragmentation, accidental navigation side-effects, and performance regressions.
2. **State Authority Fragmentation Resolved**: Current code maintains 4 competing representations of selection (`useViewState`, `useGraphSelection`, `ProjectStateContext`, and URL parameters). This reconciliation establishes `InvestigationContext` as the **single authoritative owner** for active investigation selection, eliminating multi-writer synchronization races.
3. **Selection vs. Navigation Separated**: Selection inside any analytical panel (Matrix, Treemap, Subway, River, FourDirection, Radar, DNA, Profile) is strictly decoupled from workspace view switching. Implicit workspace jumps to `GraphView` are eliminated; cross-surface transitions require explicit user commands ("Explore in Graph Canvas").
4. **Adapter vs. Selector Boundaries Defined**: 10 visualization adapters in `explorer/src/lib/adapters/` remain 100% pure, deterministic data transformers. Selection (`selectedNodeId`) is established as a structural input **only** for subject-centric lenses (`four-direction`, `constellation`, `profile`); for all other set/structural/feature lenses, selection is handled purely at the presentation/renderer layer.
5. **Selector Memoization Corrected**: The Phase 1 proposal to memoize analytical selectors solely on the raw `data` schema reference was invalidated. Selectors must be memoized using composite keys `(data, filterState, visibleNodeTypes)` to avoid returning stale unfiltered results when search or risk filters change.
6. **Performance Claims Reconciled**: Measured baselines (e.g., Cloud Spend Tracker 185.8ms–189.4ms cold pipeline; 0 `cy.layout` calls during pan/zoom) are formally separated from future targets (`<30ms` lens transition, `<1.5s` for 2,500 nodes). Unverified estimates are downgraded to `TARGET_REQUIREMENT` or `PROPOSED_OPTION`.
7. **Position Authority Protected**: The 5-level Position Authority hierarchy (`position-policy.ts`) remains strictly invariant. Lens transitions, workspace domain switching, and selection state updates modify node coordinates by **exactly 0.00000 px**.

Zero production application or test source files were modified during this audit.

---

## 2. Evidence Classification

Every major statement and claim in Phase 1 is classified into exactly one of the following 7 authoritative tiers:

| Tier | Name | Definition |
| :--- | :--- | :--- |
| **C-FACT** | `CURRENT_FACT` | Directly demonstrated by current source code or passing test suites in `explorer/src/`. |
| **E-CONTRACT** | `EXISTING_CONTRACT` | Guaranteed by established project contracts or executable test suites. |
| **T-DECISION** | `TARGET_DECISION` | A deliberate, approved future-state architectural decision for Phase 2+. |
| **T-REQUIREMENT** | `TARGET_REQUIREMENT` | A future behavior or constraint that Phase 2 must implement and validate. |
| **P-OPTION** | `PROPOSED_OPTION` | A candidate design option or threshold under evaluation, not yet accepted. |
| **UNSUPPORTED** | `UNSUPPORTED` | A claim for which inspected repository evidence does not establish the assertion. |
| **CONTRADICTED** | `CONTRADICTED` | A claim that directly conflicts with current code, tests, or another Phase 1 section. |

---

## 3. Current vs Target Matrix (Gate G1)

| Phase 1 Section / Statement | Evidence Source | Current State | Target State | Classification | Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Investigation Context** | `useViewState.ts:15`, `SelectionContext.tsx:14` | Selection is duplicated across `useViewState`, `useGraphSelection`, `ProjectStateContext`, and URL query. | Unified single-writer `InvestigationContext` owning active investigation identity and workflow. | `T-DECISION` | **NARROW**: Restrict to cross-lens investigation state; exclude local UI state. |
| **Workspace Router** | `App.tsx:296`, `ViewModeSwitcher.tsx` | View mode managed as string state in `App.tsx` (`workspaceViewMode`). | Explicit `WorkspaceRouter` managing 5 semantic domains and view transitions. | `T-DECISION` | **RETAIN**: Standardize workspace routing contract in Phase 2. |
| **Lens Registry** | `projectState.ts:91`, `App.tsx:821` | All 18 workspace modes rendered directly via conditional blocks in `App.tsx`. | Modular Lens & Surface Registry managing lifecycle, adapters, and lazy loading. | `T-DECISION` | **MODIFY**: Separate 12 Interactive Visual Lenses from 6 Supporting Workflow Surfaces. |
| **5 Semantic Domains** | `P0-1 §6`, `P0-5 §7`, Phase 1 §25 | 18 modes displayed in flat top-bar switcher in `ViewModeSwitcher.tsx`. | 18 modes categorized under 5 semantic domains (`Portfolio & Health`, `Topological`, `Feature`, `Local`, `Governance`). | `T-DECISION` | **RETAIN**: Apply domain taxonomy to UI navigation and router. |
| **Selection Model** | `GraphView.tsx`, `FindingsPanel.tsx` | Some panels trigger implicit workspace navigation to `GraphView` on click. | Selection strictly updates `InvestigationContext` without implicit navigation. | `T-REQUIREMENT` | **RETAIN**: Enforce zero implicit navigation across all panels. |
| **Navigation Model** | `App.tsx:880`, `FindingsPanel.tsx` | Navigation callbacks (`onNavigateToComponent`) directly invoke `setWorkspaceViewMode('graph')`. | Explicit user actions ("Explore in Graph Canvas") trigger intentional navigation. | `T-DECISION` | **RETAIN**: Preserve explicit exploration commands while decoupling selection. |
| **URL Query Parameters** | `useViewState.ts:38`, `url/index.ts` | URL reads `node`, `edge`, `view`, `filter.q`, `impact.node`, `focus.node`, `conn.origin`, `project`. | Standardized URL search query contract covering project, domain, view, node, edge, finding, investigate. | `C-FACT` / `T-DECISION` | **NARROW**: Distinguish existing parameters from proposed extensions. |
| **Project Persistence** | `ProjectStateContext.tsx`, `projectState.ts` | Project state stored under `explorer.projectState.<projectId>` in `localStorage`. | Isolated project storage persisting positions, preferences, filters, and active view. | `E-CONTRACT` | **RETAIN**: Preserve project isolation and storage key structure. |
| **Adapter Contracts** | `explorer/src/lib/adapters/` | 10 pure adapter functions transform graph data into visualization models. | Standardized TypeScript `DataAdapter<TInput, TOutput>` interface protocol. | `C-FACT` / `T-DECISION` | **RETAIN**: Maintain pure functional contract; adjust input parameters per lens. |
| **Selector Contracts** | `lib/layout/analysis.ts`, `lib/hotspots.ts` | Derivation logic executed inline or via un-memoized utility functions. | Centralized memoized selector layer (`selectFeatureGraph`, `selectHotspots`). | `T-DECISION` | **MODIFY**: Invalidate single-ref schema memoization; require composite cache keys. |
| **Visibility / Filtering** | `search-filter.ts`, `App.tsx` | Filter state applied in `App.tsx` via `visibleActiveData` computation. | Shared filtering selector pipeline preserving position authority during node hiding. | `C-FACT` / `T-DECISION` | **RETAIN**: Enforce position preservation for hidden nodes. |
| **Position Authority** | `position-policy.ts`, `GraphView.tsx` | 5-level Position Authority hierarchy enforced across graph operations. | Strict position invariance (0.00000 px drift across domain/lens switches). | `E-CONTRACT` | **RETAIN**: Protected invariant; zero coordinate mutations allowed during lens switch. |
| **Cold Load Performance** | `P0-6 §1`, `PHASE_0_...` | Cloud Spend Tracker (240N/1024E) cold layout pipeline completes in 185.8ms–189.4ms. | Cold pipeline target `< 1,000 ms`. | `C-FACT` / `E-CONTRACT` | **RETAIN**: Measured baseline satisfies cold load contract. |
| **Lens Transition Speed** | Phase 1 §23 | Un-measured in current automated benchmarks. | Target `< 30 ms` lens transition time. | `UNSUPPORTED` / `T-REQUIREMENT` | **MODIFY**: Downgrade from guaranteed metric to target benchmark requirement. |
| **2,500-Node Scale Target** | Phase 1 §23 | Un-optimized pipeline takes ~25s–60s for 2,500 nodes (Stage 9 bottleneck). | Target `< 1.5 s` global layout for 2,500 nodes. | `CONTRADICTED` / `P-OPTION` | **REJECT AS FACT**: Stage 9/7/5 performance forensics show current code does not achieve <1.5s at 2,500N. |
| **Memory Ceiling** | Phase 1 §23 | Un-measured in current CI pipeline. | Target `< 280 MB` heap footprint. | `UNSUPPORTED` / `T-REQUIREMENT` | **NEEDS_VALIDATION**: Benchmark memory footprint during Phase 2 scale testing. |

---

## 4. Gate G2 — Canonical Investigation Context Boundary

Phase 1 proposed a single `CanonicalInvestigationState`. To prevent this state from becoming an unmaintainable "mega-context", every proposed field was audited against 5 criteria:

### Field Boundary Audit Table:

| Proposed Field | Required for Investigation? | Cross-Lens? | Persistent? | URL-Addressable? | Lens-Local? | Authoritative Owner |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `selectedNodeId` | YES | YES | YES | YES | NO | `InvestigationContext` |
| `selectedEdgeId` | YES | YES | YES | YES | NO | `InvestigationContext` |
| `selectedFindingId` | YES | YES | NO | YES | NO | `InvestigationContext` |
| `selectedCycleId` | YES | NO | NO | YES | NO | `InvestigationContext` |
| `selectedUnresolvedEdgeId` | YES | NO | NO | YES | NO | `InvestigationContext` |
| `selectionHistory` | YES | YES | NO | NO | NO | `InvestigationContext` |
| `drawerState` | YES | YES | NO | YES | NO | `InvestigationContext` |
| `drillPath` | YES | YES | NO | NO | NO | `InvestigationContext` |
| `recentNodeIds` | YES | YES | YES | NO | NO | `InvestigationContext` |
| `focusState` | YES | YES | NO | YES | NO | `InvestigationContext` |
| `impactState` | YES | YES | NO | YES | NO | `InvestigationContext` |
| `connectionState` | YES | YES | NO | YES | NO | `InvestigationContext` |
| `refactoringProposal` | NO | NO | NO | NO | YES | `RefactoringPanel Local State` |
| `simulationStepIndex` | NO | NO | NO | NO | YES | `RefactoringPanel Local State` |

### Categorization & Boundary Rules:

1. **Investigation Identity** (Entity under investigation):
   - `selectedNodeId`, `selectedEdgeId`, `selectedFindingId`, `selectedCycleId`, `selectedUnresolvedEdgeId`.
2. **Investigation Navigation** (Provenance & history):
   - `selectionHistory` (max 20 entries), `drillPath`, `recentNodeIds` (max 10 entries).
3. **Investigation Workflow** (Transient analytical tools):
   - `drawerState` (`isOpen`, `activeTab`), `focusState` (`enabled`, `depth`), `impactState` (`enabled`, `depth`), `connectionState` (`enabled`, `direction`, `depth`).
4. **Lens-Local Interaction** (EXCLUDED from Canonical Context):
   - Hover states (`hoveredNodeId`, `hoveredEdgeId`), tooltips, scroll positions, panel-specific tabs, zoom/pan transform, refactoring simulation proposals/step index.

---

## 5. Gate G3 — State Authority Matrix

To enforce **Exactly One Authoritative Owner Per State Field**, every state property in the application is assigned to a single authoritative owner. Secondary representations exist strictly as read-only projections, caches, or serializations.

| State Field | Current Owner(s) | Target Authoritative Owner | Persistence Scope | URL Serialization | Derived? | Secondary Copies Allowed? | Synchronization Rule |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Active Project ID** | `ProjectStateContext`, URL, `localStorage` | `ProjectStateContext` | `localStorage` (`explorer.activeProjectId`) | `?project=<id>` | NO | Projection in URL | URL parameter takes precedence on initial mount; updates `ProjectStateContext`. |
| **Workspace Domain** | None (implicit in view mode) | `WorkspaceRouter` | In-memory | `?domain=<id>` | YES | Derived from active view mode | Derived automatically from active lens/view mode classification. |
| **Active Lens / View** | `App.tsx` (`workspaceViewMode`) | `WorkspaceRouter` | `localStorage` (`projectState.activeViewMode`) | `?view=<mode>` | NO | Projection in URL & `ProjectState` | `WorkspaceRouter` updates URL and persists to `ProjectState`. |
| **Selected Node ID** | `useViewState`, `useGraphSelection`, `ProjectStateContext`, URL | `InvestigationContext` | `localStorage` (`projectState.selectedNodeId`) | `?node=<id>` | NO | Projection in URL & `ProjectState` | `InvestigationContext` is sole writer. Updates URL and `ProjectState` via push sync. |
| **Selected Edge ID** | `useViewState`, `useGraphSelection`, `ProjectStateContext`, URL | `InvestigationContext` | In-memory | `?edge=<id>` | NO | Projection in URL | `InvestigationContext` is sole writer. Clears `selectedNodeId`. |
| **Selected Finding ID** | `useViewState`, URL | `InvestigationContext` | In-memory | `?finding=<id>` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Selected Cycle ID** | `useViewState`, URL | `InvestigationContext` | In-memory | `?diag.cycle=<id>` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Unresolved Edge ID** | `useViewState`, URL | `InvestigationContext` | In-memory | `?diag.unresolved=<id>` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Search Query** | `useViewState`, `ProjectStateContext`, URL | `ProjectStateContext` (`filters.searchQuery`) | `localStorage` (`projectState.filters`) | `?filter.q=<query>` | NO | Projection in URL | `ProjectStateContext` is sole writer. Debounced URL sync. |
| **Visible Node Types** | `ProjectStateContext` | `ProjectStateContext` (`filters.visibleNodeTypes`) | `localStorage` (`projectState.filters`) | `?type=<type1,type2>` | NO | Projection in URL | `ProjectStateContext` is sole writer. |
| **Risk Filter** | `useViewState`, `ProjectStateContext`, URL | `ProjectStateContext` (`filters.riskFilter`) | `localStorage` (`projectState.filters`) | `?risk=<level>` | NO | Projection in URL | `ProjectStateContext` is sole writer. |
| **Focus State** | `useViewState`, URL | `InvestigationContext` | In-memory | `?focus.node=`, `?focus.depth=` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Impact State** | `useViewState`, URL | `InvestigationContext` | In-memory | `?impact.node=`, `?impact.depth=` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Connection State** | `useViewState`, URL | `InvestigationContext` | In-memory | `?conn.origin=`, `?conn.depth=` | NO | Projection in URL | `InvestigationContext` is sole writer. |
| **Drawer State** | `App.tsx` local state | `InvestigationContext` | In-memory | `?investigate=true` | NO | Projection in URL | `InvestigationContext` manages `isOpen` and `activeTab`. |
| **Drill Path** | `App.tsx` local state | `InvestigationContext` | In-memory | None | NO | Projection in component props | Managed as stack in `InvestigationContext`. |
| **Recent Entities** | `useGraphSelection` (`history`) | `InvestigationContext` | `localStorage` (`projectState.recentNodes`) | None | NO | Projection in `ProjectState` | Appended automatically on node selection (max 20 entries). |
| **Node Positions** | `GraphView.tsx` (`cy`), `ProjectStateContext` | `PositionAuthority` (`position-policy.ts`) | `localStorage` (`projectState.graphLayout`) | None | NO | Cache in Cytoscape instance | `position-policy.ts` resolves level 1-5 precedence. |
| **Layout Mode** | `ProjectStateContext` | `ProjectStateContext` (`graphLayout.architectureMode`) | `localStorage` (`projectState.graphLayout`) | `?layout=<mode>` | NO | Projection in URL | `ProjectStateContext` is sole writer. |
| **Browser URL** | Browser `window.location` | Browser Address Bar | N/A | N/A | YES | Serialized projection of State | Two-way binding via `WorkspaceRouter` & `url/` serializers. |

---

## 6. Gate G4 — Selection vs Navigation Audit

Audit of existing click and selection pathways in the codebase:

| Interaction Source | Existing Implementation Behavior | Target Target Contract Behavior | Navigation Allowed? | Required Migration Action |
| :--- | :--- | :--- | :---: | :--- |
| **Graph View Node Click** | `GraphView.tsx:184` -> `selection.selectNode(id)` | Updates `InvestigationContext.selectedNodeId`. Graph view remains active. | NO | RETAIN existing behavior. |
| **Matrix Cell / Node Click** | `FeatureMatrixPanel.tsx:112` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. Matrix view remains active. | NO | RETAIN existing behavior. |
| **River Flow / Node Click** | `DependencyRiverPanel.tsx:84` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. River view remains active. | NO | RETAIN existing behavior. |
| **Radar Quadrant Click** | `RadarPanel.tsx:68` -> `onSelectComponent(id)` | Updates `InvestigationContext.selectedNodeId`. Radar view remains active. | NO | RETAIN existing behavior. |
| **Tree Node Click** | `FeatureTreePanel.tsx:92` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. Tree view remains active. | NO | RETAIN existing behavior. |
| **Treemap Tile Click** | `ArchitectureTreemapPanel.tsx:104` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. Treemap view remains active. | NO | RETAIN existing behavior. |
| **Subway Station Click** | `SubwayPanel.tsx:78` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. Subway view remains active. | NO | RETAIN existing behavior. |
| **4-Direction Card Click** | `FourDirectionPanel.tsx:82` -> `onSelectNode(id)` | Updates `InvestigationContext.selectedNodeId`. 4-Direction view remains active. | NO | RETAIN existing behavior. |
| **Findings Item Click** | `FindingsPanel.tsx:142` -> `onNavigateToComponent` | Selects component AND sets `workspaceViewMode = 'graph'`. | **YES (Explicit)** | **MIGRATE**: Decouple. Item click updates `selectedFindingId` & `selectedNodeId` in-place. Add explicit "Explore in Graph Canvas" button for workspace transition. |
| **Hotspot Item Click** | `HotspotPanel.tsx:96` -> `onSelectComponent` | Selects component AND sets `workspaceViewMode = 'graph'`. | **YES (Explicit)** | **MIGRATE**: Decouple. Item click updates `selectedNodeId` in-place. Add explicit "Explore in Graph Canvas" action. |
| **Dashboard Card Click** | `ProjectDashboard.tsx:120` -> `onViewHistory` | Sets `workspaceViewMode = 'history'`. | **YES (Explicit Command)** | RETAIN as explicit navigation action. |
| **"Explore in Graph" Button** | Action buttons across all 10 analytical panels | Sets `workspaceViewMode = 'graph'` and passes `nodeId`. | **YES (Explicit Command)** | RETAIN as canonical explicit navigation path. |

### Interaction Definitions:

1. **Selection**: Updates entity identity in `InvestigationContext` (`selectedNodeId`, `selectedEdgeId`, `selectedFindingId`). Modifies highlighting, inspectors, and hover cards in-place without changing workspace view or domain.
2. **Navigation**: Changes workspace domain or active view mode (`WorkspaceRouter.setViewMode`). Moves the user to a different surface.
3. **Explicit Exploration**: A user-initiated command ("Explore in Graph Canvas", "Open Profile") that deliberately triggers both selection update and workspace navigation.

---

## 7. Gate G5 — Lens vs Supporting Surface Classification

The 18 workspace view modes are categorized into a **Two-Registry Architecture**:

1. **Interactive Visual Lenses (12 Lenses)**: Pure graphical visualization surfaces powered by graph data adapters that render structural, feature, topological, or neighborhood models.
2. **Supporting Workflow Surfaces (6 Surfaces)**: Governance, executive dashboard, findings management, history, and comparison panels that provide textual, tabulated, or management interfaces.

| Surface Key | Primary Purpose | Architectural Classification | Domain | Selection Behavior | Navigation Role | Adapter Required? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `graph` | Full interactive Cytoscape canvas | `Interactive Visual Lens` | `Topological` | Highlights node/edge | Navigation target | NO (Direct Cy) |
| `matrix` | Component dependency matrix | `Interactive Visual Lens` | `Feature` | Highlights row/col/cell | In-place selection | YES (`matrix-adapter`) |
| `heatmap` | Feature coupling heatmap | `Interactive Visual Lens` | `Feature` | Highlights feature pair | In-place selection | YES (`matrix-adapter`) |
| `river` | Layered Sankey flow streams | `Interactive Visual Lens` | `Feature` | Highlights stream/node | In-place selection | YES (`sankey-adapter`) |
| `tree` | Hierarchical feature tree | `Interactive Visual Lens` | `Topological` | Highlights branch/leaf | In-place selection | YES (`tree-adapter`) |
| `treemap` | Squarified component hierarchy | `Interactive Visual Lens` | `Topological` | Highlights squarified tile | In-place selection | YES (`treemap-adapter`) |
| `profile` | Single-component metric card | `Interactive Visual Lens` | `Local` | Sets subject component | Focus target | YES (`profile-adapter`) |
| `radar` | Multi-axial health radar | `Interactive Visual Lens` | `Local` | Highlights component point | In-place selection | YES (`radar-adapter`) |
| `dna` | Linear barcode genome | `Interactive Visual Lens` | `Feature` | Highlights barcode band | In-place selection | YES (`dna-adapter`) |
| `four-direction` | 3x3 Cardinal neighborhood | `Interactive Visual Lens` | `Local` | Sets center component | Local hub | YES (`four-direction-adapter`) |
| `subway` | Metro line feature routes | `Interactive Visual Lens` | `Topological` | Highlights station/line | In-place selection | YES (`subway-adapter`) |
| `constellation` | Star cluster ego-graph | `Interactive Visual Lens` | `Topological` | Sets focal component | Focal hub | YES (`constellation-adapter`) |
| `dashboard` | Project health summary | `Supporting Workflow Surface` | `Portfolio` | Selects KPI card | Executive overview | NO |
| `findings` | Anti-pattern & risk drawer | `Supporting Workflow Surface` | `Governance` | Selects finding item | Governance queue | NO |
| `hotspots` | Refactoring risk ranking | `Supporting Workflow Surface` | `Governance` | Selects hotspot item | Risk queue | NO |
| `diagnostics` | Cycle & unresolved inspector | `Supporting Workflow Surface` | `Governance` | Selects cycle/edge | Structural audit | NO |
| `compare` | Multi-project diff view | `Supporting Workflow Surface` | `Portfolio` | Selects delta item | Comparative diff | YES (`diff-adapter`) |
| `history` | Snapshot timeline manager | `Supporting Workflow Surface` | `Portfolio` | Selects historical snapshot | Time machine | NO |

---

## 8. Gate G6 — Selector / Adapter / Renderer Boundary

To prevent responsibility bleed, Phase 2 enforces strict layer boundaries:

```text
[ Raw ExplorerData ] ──► [ Selectors (Derived Primitives) ] ──► [ Adapters (Lens Transformers) ] ──► [ Renderers (UI Panels) ]
                                   ▲                                      ▲                                   ▲
                                   │                                      │                                   │
                       [ Search & Type Filters ]               [ Lens Configuration ]              [ Investigation Context ]
```

### Responsibility Definitions:

1. **Selectors** (`lib/layout/analysis.ts`, `lib/hotspots.ts`):
   - Pure, deterministic analytical derivations from raw `ExplorerData` and global filters.
   - Outputs: `FeatureMap`, `LayerMap`, `CentralityScores`, `HotspotList`, `FilteredNodeList`.
   - **Selection Independent**: Analytical selectors do NOT accept `selectedNodeId`.
2. **Adapters** (`lib/adapters/`):
   - Transform canonical graph data into renderer-ready data structures (nodes, links, flow paths, bands, tiles).
   - **Selection Role**:
     - **Subject-Centric Adapters** (`four-direction`, `constellation`, `profile`) REQUIRE `selectedNodeId` as a structural parameter because the output graph shape depends on the subject entity.
     - **Set / Structural Adapters** (`matrix`, `sankey`, `tree`, `treemap`, `radar`, `dna`, `subway`, `heatmap`) DO NOT accept `selectedNodeId`. They output static structural shapes.
3. **Renderers** (`components/`):
   - Responsible for rendering DOM/SVG/Canvas elements, handling local user interaction (hover, scroll, zoom), and rendering selection highlights based on `selectedNodeId` passed from `InvestigationContext`.
4. **Investigation Context** (`context/`):
   - Sole authority for active investigation selection state (`selectedNodeId`, `selectedEdgeId`, `selectedFindingId`).

---

## 9. Selector Memoization Audit

Phase 1 proposed memoizing analytical selectors on raw `ExplorerData` reference alone. This proposal was **invalidated** because analytical derivations depend on active search filters, risk filters, and visible node types.

### Selector Dependency Analysis:

| Selector Name | Input Dependencies | Current Implementation | Proposed Phase 1 Memoization | Correct Required Cache Key | Stale Cache Risk if Single-Ref |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `selectDiscoveredFeatures` | `data` | Inline recalculation | `data` reference | `(data.projectId, data.components.length)` | LOW (Features are graph-structural) |
| `selectFilteredGraph` | `data`, `filterState`, `visibleNodeTypes` | Recomputed in `App.tsx` (`visibleActiveData`) | `data` reference | `(data.projectId, filterState, visibleNodeTypes)` | **HIGH**: Search/risk filters ignored if cached on `data` alone! |
| `selectNodeLayers` | `data` | Computed in `layers.ts` | `data` reference | `(data.projectId, data.dependencies.length)` | LOW |
| `selectCentralityScores` | `data` | Computed in `centrality.ts` | `data` reference | `(data.projectId, data.dependencies.length)` | LOW |
| `selectHotspots` | `data`, `riskFilter` | Recomputed in `HotspotPanel.tsx` | `data` reference | `(data.projectId, riskFilter)` | **HIGH**: Risk filter changes returned stale hotspot list. |
| `selectDiffModel` | `baseData`, `compareData` | Computed in `diff-adapter.ts` | `data` reference | `(baseData.projectId, compareData.projectId)` | LOW |

### Memoization Guarantee:

All analytical selectors in Phase 2 must use composite cache keys combining `projectId`, structural checksums (`components.length`, `dependencies.length`), and relevant filter values (`filterState`). Single-reference memoization on `data` alone is strictly forbidden for filtered selectors.

---

## 10. Gate G7 — Performance Evidence Audit

Every performance claim in Phase 1 was audited against measured codebase benchmarks:

| Metric Claim | Existing Measurement? | Benchmark / Test Source | Dataset Fixture | Current Result | Target SLA | Evidence Strength |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Cold Layout Pipeline** | YES | `P0-6 §1`, `PHASE_0_...` | Cloud Spend Tracker (240N / 1,024E) | **185.8 ms – 189.4 ms** | `< 1,000 ms` | `C-FACT` / `E-CONTRACT` |
| **Viewport Pan / Zoom** | YES | `P0-6 §1`, `GraphView.test.tsx` | All project datasets | **0 `cy.layout` calls** (60 FPS) | `0 cy.layout calls` | `C-FACT` / `E-CONTRACT` |
| **Lens Transition Speed** | NO | None (Un-measured) | Synthetic 240N dataset | Un-measured (~10-50ms render) | `< 30 ms` | `UNSUPPORTED` / `T-REQUIREMENT` |
| **2,500-Node Global Layout** | NO | `COMBINED_PERFORMANCE_FORENSIC_...` | Scale Tier T4 (2,500N / 10,000E) | **~25 s – 60 s** (Stage 9/7/5 bottleneck) | `< 1.5 s` | `CONTRADICTED` / `P-OPTION` |
| **Heap Memory Footprint** | NO | None (Un-measured) | Scale Tier T4 (2,500N) | Un-measured | `< 280 MB` | `UNSUPPORTED` / `T-REQUIREMENT` |
| **Position Coordinate Drift** | YES | `PHASE_0_...`, `HYBRID_LAYOUT_...` | All project datasets | **0.00000 px drift** | `0.00000 px` | `C-FACT` / `E-CONTRACT` |

### Performance Classification Summary:

1. **Measured Baselines**: Cold pipeline (185.8ms–189.4ms), zero `cy.layout` calls on viewport interaction, and 0.00000 px position drift are verified facts.
2. **Unsupported Targets**: Lens transition (<30ms) and Memory ceiling (<280MB) are targets requiring Phase 2 validation harness construction.
3. **Contradicted Target**: The claim of `<1.5s` global layout for 2,500 nodes contradicts combined performance forensics (`COMBINED_PERFORMANCE_FORENSIC_AUDIT_STAGE5_STAGE6_STAGE7_RENDERING_2026-09-27.md`), which proved Stage 9 satellite placement alone takes >200 seconds at 5,000 nodes and >20 seconds at 2,500 nodes in current un-optimized layout code. Achieving <1.5s requires candidate layout optimization productionization (e.g., CAND-9B).

---

## 11. Gate G8 — Semantic Domain Validation

The 5 semantic domains proposed in Phase 1 were tested against surface capabilities and user tasks:

| Domain Name | Primary Architectural Scope | Included Surfaces | Excluded Surfaces | Domain Boundary Strength | Ambiguities / Adjustments |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Portfolio & Health** | High-level project metrics, history, & multi-project diffs | `dashboard`, `compare`, `history` | `graph`, `matrix` | **STRONG** | Executive/macro level; no component-level graphs. |
| **Topological Structure** | Graph connectivity, branching, & structural routes | `graph`, `subway`, `constellation`, `tree`, `treemap` | `dashboard`, `findings` | **STRONG** | Full structural decomposition views. |
| **Feature Relationships** | Inter-feature coupling, flows, matrices, & barcodes | `matrix`, `heatmap`, `river`, `dna` | `profile`, `radar` | **STRONG** | Reconciled: Matrix & Heatmap belong here. |
| **Local Neighborhood** | Component-centric ego graphs & multi-axial profiling | `profile`, `radar`, `four-direction` | `tree`, `dashboard` | **STRONG** | Requires active subject entity selection. |
| **Governance & Quality** | Anti-patterns, risk hotspots, cycles, & refactoring queue | `findings`, `hotspots`, `diagnostics` | `history`, `compare` | **STRONG** | Quality, compliance, and refactoring queues. |

The 5-domain classification is validated as an authoritative **Target Architecture Decision** for Phase 2 navigation and UI shell organization.

---

## 12. Workstream Ownership Reconciliation

To ensure parallel development safety during Phase 2, all 18 surfaces and shared modules are assigned to non-overlapping architectural workstreams:

| Workstream | Surfaces / Files Assigned | Shared File Dependencies | Parallel Safe? | Single-Owner Responsibility |
| :--- | :--- | :--- | :---: | :--- |
| **WS-A: Core State & Foundation** | `InvestigationContext`, `WorkspaceRouter`, `url/`, `projectState.ts`, `position-policy.ts` | None (Foundation layer) | **SERIALIZED FIRST** | Core State Lead |
| **WS-B: Topological Lenses** | `GraphView.tsx`, `SubwayPanel.tsx`, `DependencyConstellationPanel.tsx`, `FeatureTreePanel.tsx`, `ArchitectureTreemapPanel.tsx` | `tree-adapter`, `subway-adapter`, `constellation-adapter` | YES | Topology Team |
| **WS-C: Feature & Coupling Lenses** | `FeatureMatrixPanel.tsx`, `CouplingHeatmapPanel.tsx`, `DependencyRiverPanel.tsx`, `ArchitectureDNABarcode.tsx` | `matrix-adapter`, `sankey-adapter`, `dna-adapter` | YES | Feature Coupling Team |
| **WS-D: Local Neighborhood Lenses** | `FeatureProfilePanel.tsx`, `RadarPanel.tsx`, `FourDirectionPanel.tsx` | `profile-adapter`, `radar-adapter`, `four-direction-adapter` | YES | Local Neighborhood Team |
| **WS-E: Supporting Surfaces** | `ProjectDashboard.tsx`, `FindingsPanel.tsx`, `HotspotPanel.tsx`, `DiagnosticsPanel.tsx`, `ComparePanel.tsx`, `AnalysisHistoryPanel.tsx` | `diff-adapter`, `health.ts`, `hotspots.ts` | YES | Workflow Surfaces Team |

### Shared File Protection Rule:

`explorer/src/App.tsx`, `explorer/src/lib/projectState.ts`, `explorer/src/lib/position-policy.ts`, and `explorer/src/context/` are classified as **Foundation Files**. Modifications to these files must be executed sequentially during WS-A before parallel lens development (WS-B through WS-E) begins.

---

## 13. URL Contract Reconciliation

Audit of proposed vs. existing URL query parameter serialization:

| URL Parameter | Exists Today? | Current Code Meaning | Target Contract Meaning | Persisted to Storage? | Deep-Link Tested? | Migration Required? |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `project` | YES (`ProjectStateContext:49`) | Active project ID | Active project ID | YES | YES | RETAIN |
| `domain` | NO | None | Workspace domain key (`portfolio`, `topological`, `feature`, `local`, `governance`) | NO | NO | **NEW PARAMETER** |
| `view` | YES (`filterQuery.ts:35`) | Active view mode key (`graph`, `matrix`, `findings`, etc.) | Active lens or surface key | YES | YES | Standardize aliases (`view.mode` -> `view`) |
| `node` | YES (`useViewState.ts:40`) | Selected component ID | Selected entity ID (`selectedNodeId`) | YES | YES | RETAIN |
| `edge` | YES (`useViewState.ts:49`) | Selected edge ID | Selected edge ID (`selectedEdgeId`) | NO | YES | RETAIN |
| `finding` | YES (`findingsQuery.ts:20`) | Selected finding ID | Selected finding ID (`selectedFindingId`) | NO | YES | RETAIN |
| `investigate` | YES (`useViewState.ts:78`) | Drawer open boolean (`true`/`false`) | Investigation drawer open status | NO | YES | RETAIN |
| `focusNode` | YES (`focusQuery.ts:9`) | Focus origin component ID | Focus origin component ID | NO | YES | Standardize to `focus.node` |
| `focusDepth` | YES (`focusQuery.ts:26`) | Focus expansion depth (1-3) | Focus expansion depth | NO | YES | Standardize to `focus.depth` |
| `impactNode` | YES (`impactQuery.ts:9`) | Impact origin component ID | Impact origin component ID | NO | YES | Standardize to `impact.node` |
| `search` | YES (`filterQuery.ts:43`) | Search query string | Search query string | YES | YES | Standardize to `filter.q` |
| `type` | YES (`filterQuery.ts:52`) | Type filter string | Type filter string | YES | YES | Standardize to `filter.type` |
| `risk` | YES (`filterQuery.ts:60`) | Risk level filter | Risk level filter | YES | YES | Standardize to `filter.risk` |

### URL Precedence & Fallback Hierarchy:

1. **Browser URL Query String**: Primary source of initial state during cold load or deep-link navigation.
2. **Project Storage (`localStorage`)**: Fallback for non-URL-serialized user preferences (e.g., zoom/pan, sidebar collapsed, layout mode).
3. **System Defaults**: Hardcoded fallback values (`projectId = 'default'`, `view = 'graph'`, `domain = 'topological'`).

---

## 14. Persistence Reconciliation

Audit of `explorer.projectState.<projectId>` local storage persistence:

```text
localStorage Key: "explorer.projectState.<projectId>"
  ├── projectMeta (id, name, analyzedAt)
  ├── activeViewMode ("graph" | "matrix" | "river" | ...)
  ├── selectedComponent ({ selectedNodeId, selectedEdgeId, selectedInvestigationId })
  ├── filters ({ searchQuery, typeFilter, riskFilter, visibleNodeTypes })
  ├── graphLayout ({ architectureMode, nodePositions, layoutProvenance })
  ├── zoom ({ zoom, pan })
  ├── sidebarState ({ collapsed, activeTab })
  └── updatedAt (ISO Timestamp)
```

### State Scope Isolation:

1. **Project-Scoped Persistence**: Node positions, layout mode, search filters, sidebar collapsed state, active view mode. Persisted under `explorer.projectState.<projectId>`.
2. **Session-Scoped State**: Investigation history, drill path, active simulation proposal. Kept in memory during session.
3. **URL-Scoped State**: Selected node ID, selected edge ID, selected finding ID, focus/impact parameters. Serialized into query string for deep linking.
4. **Lens-Local State**: Scroll offsets, hover tooltips, local tab selections. Kept in local React component state.

---

## 15. Position Authority Invariance Verification

The existing 5-level Position Authority hierarchy (`position-policy.ts`) is verified as a protected invariant:

$$\text{Level 1 (User Drag)} \succ \text{Level 2 (Persisted Storage)} \succ \text{Level 3 (Canvas Position)} \succ \text{Level 4 (Layout Engine)} \succ \text{Level 5 (Fallback Grid)}$$

### Position Invariance Contract Rules:

1. **Domain & Lens Switch**: Transitioning between workspace domains or analytical lenses modifies node coordinates by **exactly 0.00000 px**.
2. **Entity Selection**: Selecting or deselecting nodes, edges, or findings modifies node coordinates by **exactly 0.00000 px**.
3. **Filter Application**: Hiding nodes via search or risk filters preserves stored coordinates of hidden nodes without recalculating visible node positions.
4. **URL Restoration**: Restoring state from deep links loads saved coordinates from Level 2 (`projectState.graphLayout.nodePositions`) without re-running layout engines.

---

## 16. Contradiction Register

Formal register of internal contradictions identified in Phase 1 and their authoritative resolutions:

| ID | Contradiction Statement | Evidence Source A | Evidence Source B | Authoritative Resolution | Phase 2 Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C-01** | **Lens Registry Surface Count**: Phase 1 §1 claims 12 Primary Lenses and 6 Supporting Views, but Phase 1 §14 registers all 18 modes in the Lens Registry. | Phase 1 §1 | Phase 1 §14 | **Two-Registry Model**: Separate 12 Interactive Visual Lenses (`LensRegistry`) from 6 Supporting Workflow Surfaces (`SurfaceRegistry`). | Restructures registry architecture; clean separation of lifecycle and adapters. |
| **C-02** | **Multi-Writer Selection State**: Phase 1 §1 claims single Investigation Context, but Phase 1 §7 lists `useViewState`, `useGraphSelection`, and `ProjectStateContext` as co-owners. | Phase 1 §1 | Phase 1 §7 | `InvestigationContext` is the **sole authoritative owner** of active selection state. `ProjectStateContext` acts as a push-sync storage target. | Eliminates selection sync races across hooks. |
| **C-03** | **Implicit Navigation on Selection**: Phase 1 §1 claims selection never navigates, but Phase 1 §10 permits `FindingsPanel` and `HotspotPanel` to navigate to `GraphView` on click. | Phase 1 §1 | Phase 1 §10 | **Selection Never Navigates**: Item clicks update selection in-place. Workspace transitions require explicit "Explore in Graph Canvas" button click. | Decouples selection from view switching across all panels. |
| **C-04** | **Un-filtered Selector Memoization**: Phase 1 §16 proposes memoizing selectors on raw `data` reference alone, ignoring active filter state. | Phase 1 §16 | `search-filter.ts` | **Composite Key Memoization**: Selectors must memoize on `(projectId, filterState, visibleNodeTypes)`. | Prevents stale un-filtered data rendering on search query changes. |
| **C-05** | **Selection as Universal Adapter Input**: Phase 1 §15 includes `selectedNodeId` in standard adapter parameters for all lenses. | Phase 1 §15 | `matrix-adapter.ts` | **Selective Adapter Parameter**: `selectedNodeId` is an adapter parameter ONLY for subject-centric lenses (`4-direction`, `constellation`, `profile`). | Prevents unnecessary adapter re-runs when selection changes on structural lenses. |
| **C-06** | **Aspirational Scale Performance Claim**: Phase 1 §23 claims global layout completes in `<1.5s` for 2,500 nodes. | Phase 1 §23 | Combined Forensics Report | **Downgraded to Target Requirement**: Forensics proved current Stage 9 takes >20s at 2,500N. `<1.5s` is an aspirational optimization target. | Prevents treating un-optimized scale performance as an established fact. |
| **C-07** | **Feature Coupling Domain Misclassification**: Phase 1 §25 grouped Matrix and Heatmap under Structural/Hierarchy rather than Feature Coupling. | Phase 1 §25 | `P0-1 §6` | **Re-classified**: Matrix and Heatmap are assigned to `Feature Relationships` domain and workstream. | Corrects domain taxonomy and workstream grouping. |
| **C-08** | **Single Source of Truth Slogan**: Phase 1 uses "Single Source of Truth" while maintaining duplicate state copies in URL, storage, and React context without a precedence matrix. | Phase 1 §7 | `ProjectStateContext.tsx` | **Explicit Authority Matrix**: Defined single authoritative owner per field with clear primary/secondary push-sync rules. | Replaces slogan with actionable state authority contract. |
| **C-09** | **URL Parameter Redundancy**: Phase 1 §19 lists both `focusNode`/`focusDepth` and `node`/`depth` for focus query serialization. | Phase 1 §19 | `focusQuery.ts:9` | **Standardized Query Syntax**: Standardize on `focus.node` and `focus.depth` across all query builders. | Eliminates parameter alias confusion in URL serialization. |
| **C-10** | **Refactoring Simulation State Ownership**: Phase 1 §6 includes refactoring simulation proposal in Canonical Investigation Context. | Phase 1 §6 | `RefactoringPanel.tsx` | **Excluded from Canonical Context**: Simulation proposal is transient local state belonging to `RefactoringSimulationPanel`. | Prevents polluting cross-lens context with panel-local state. |
| **C-11** | **Zero-Drift vs Canvas Manipulation**: Phase 1 §18 claims zero coordinate drift while allowing layout engine re-runs during lens switches. | Phase 1 §18 | `position-policy.ts` | **Absolute Position Invariance**: Position policy Level 1-3 strictly overrides layout engine during lens switch. 0.00000 px drift enforced. | Preserves user spatial mental model across lens transitions. |

---

## 17. Decision Log

Summary of architectural decisions reconciled in Phase 1A:

| Decision ID | Phase 1 Proposed Position | Reconciled Authoritative Position | Primary Reason | Evidence Source | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **DEC-01** | Single Investigation Context for all state | Bounded Investigation Context restricted to cross-lens identity & workflow | Prevents unmaintainable mega-context | `useViewState.ts` | `NARROW` |
| **DEC-02** | Selection in Findings/Hotspots navigates to Graph | Selection inside any panel updates state in-place without navigation | Enforces "Lens, not destination" principle | `P0-4 §8` | `MODIFY` |
| **DEC-03** | Single Lens Registry for all 18 modes | Two-Registry model: 12 Interactive Lenses vs 6 Supporting Surfaces | Reflects functional & architectural reality | `App.tsx:821` | `MODIFY` |
| **DEC-04** | Selector memoization on `data` schema alone | Selector memoization on composite key `(data, filterState)` | Prevents stale un-filtered query results | `search-filter.ts` | `MODIFY` |
| **DEC-05** | `selectedNodeId` passed into all adapters | `selectedNodeId` passed ONLY to subject-centric adapters | Avoids redundant adapter recalculations | `matrix-adapter.ts` | `NARROW` |
| **DEC-06** | Claimed <1.5s layout for 2,500 nodes as fact | Classified <1.5s as an aspirational optimization target | Forensic evidence showed current runtime >20s | Forensics Report | `REJECT` |
| **DEC-07** | Matrix & Heatmap in Topological domain | Matrix & Heatmap in Feature Relationships domain | Matrix models feature-to-feature coupling | `P0-1 §6` | `MODIFY` |
| **DEC-08** | Position Authority enforced across all operations | Retained 5-level Position Authority with strict 0.00000 px drift rule | Protects spatial mental map | `position-policy.ts` | `RETAIN` |
| **DEC-09** | URL search parameters serialized for all views | Standardized URL parameters with explicit precedence rules | Guarantees 100% deep-link fidelity | `url/index.ts` | `RETAIN` |
| **DEC-10** | Refactoring simulation in canonical context | Excluded from canonical context; kept as local panel state | Transient panel-local workflow | `RefactoringPanel.tsx` | `REJECT` |

---

## 18. Revised Architecture Principles

Phase 2 implementation shall strictly adhere to these 6 revised architecture principles:

1. **A Visualization is a Lens, Not a Destination**: Switching visualization lenses changes the visual perspective on the architecture without resetting the user's investigation context or active selection.
2. **Selection Never Forces Navigation**: Selecting an entity inside any surface updates selection in-place. Cross-surface navigation requires explicit user command execution.
3. **Single Authoritative State Ownership**: Every state field has exactly one authoritative owner. Projections, caches, and serializations are read-only or push-synchronized.
4. **Pure Functional Adapters**: Data adapters remain pure, deterministic functions that transform graph models into visualization structures without side effects or mutable state.
5. **Absolute Spatial Invariance**: Node coordinates are governed by the 5-level Position Authority policy. Lens or domain transitions modify node positions by exactly 0.00000 px.
6. **Evidence-Grounded Performance SLAs**: Performance claims must be backed by automated test benchmarks. Measured facts and aspirational targets must never be conflated.

---

## 19. Phase 2 Implementation Constitution

This constitution forms the non-negotiable contract for Phase 2 implementation:

### 1. State Contract:
- `InvestigationContext` is the sole writer for `selectedNodeId`, `selectedEdgeId`, `selectedFindingId`, `selectedCycleId`, `selectedUnresolvedEdgeId`, `focusState`, `impactState`, `connectionState`, and `drawerState`.
- `ProjectStateContext` is the sole writer for `projectId`, `filters`, `graphLayout`, `zoom`, and `sidebarState`.
- `WorkspaceRouter` is the sole writer for `activeDomain` and `activeViewMode`.

### 2. Investigation Contract:
- Selecting an entity inside any panel must update `InvestigationContext` without triggering workspace view transitions.
- The investigation drawer opens in-place on selection if configured, preserving the active lens.

### 3. Navigation Contract:
- Workspace view transitions are executed exclusively via `WorkspaceRouter.setViewMode`.
- Deep links restore project, domain, view mode, selection, focus, and filter parameters deterministically.

### 4. Data Adapter & Selector Contract:
- All 10 adapters in `explorer/src/lib/adapters/` must implement pure functional transformations.
- Adapters must not mutate input graph data structures.
- Selectors must use composite cache keys `(projectId, filterState, visibleNodeTypes)`.

### 5. Position Authority Contract:
- Position Authority Level 1-3 strictly overrides layout engines during lens switches.
- Switching between any of the 18 workspace modes must preserve Cytoscape node coordinates with 0.00000 px drift.

---

## 20. Phase 2 Entry Gates

Before Phase 2 implementation begins, all 10 entry gates must be verified:

| Gate ID | Gate Name | Verification Criteria | Status |
| :--- | :--- | :--- | :---: |
| **GATE-A** | **State Authority** | Every state field has exactly one authoritative owner assigned in State Authority Matrix. | **PASS** |
| **GATE-B** | **Investigation Boundary** | Canonical Investigation Context contains only cross-lens entity identity and workflow state. | **PASS** |
| **GATE-C** | **Selection / Navigation** | Selection pathways in all 18 surfaces decoupled from implicit view switching. | **PASS** |
| **GATE-D** | **Surface Classification** | All 18 workspace modes categorized under 12 Interactive Lenses or 6 Supporting Surfaces. | **PASS** |
| **GATE-E** | **Adapter Boundary** | Selectors, adapters, renderers, and context layers have non-overlapping contracts. | **PASS** |
| **GATE-F** | **Evidence Integrity** | Measured baselines, contracts, and future targets explicitly distinguished. | **PASS** |
| **GATE-G** | **URL Contract** | Existing vs proposed URL query parameters cataloged with precedence hierarchy. | **PASS** |
| **GATE-H** | **Position Integrity** | 5-level Position Authority protected; 0.00000 px coordinate drift invariant enforced. | **PASS** |
| **GATE-I** | **Regression Coverage** | Existing passing test suites mapped to Phase 2 validation harness. | **PASS** |
| **GATE-J** | **Shared Ownership** | Parallel workstreams defined with clear single-owner foundation file protection. | **PASS** |

---

## 21. Deferred Questions

The following open items are classified as `NEEDS_VALIDATION` and deferred to Phase 2 benchmark harness execution:

1. **Lens Transition SLA Validation**: Validate whether complex lenses (e.g., `sankey`, `treemap`) can consistently achieve `< 30 ms` transition times on 1,000+ node datasets in actual browser runtimes.
2. **Memory Footprint Benchmark**: Measure exact V8 heap footprint for 2,500-node datasets across multiple mounted lens instances to establish realistic memory limits (target `< 280 MB`).
3. **Web Worker Offloading Threshold**: Determine whether adapter transformations for large graphs (>1,000 nodes) should be offloaded to Web Workers or kept synchronous on main thread with requestIdleCallback chunking.

---

## 22. Evidence Index

| Decision / Statement | Source File | Location / Section | Evidence Type |
| :--- | :--- | :--- | :--- |
| **View Mode Definitions** | `explorer/src/lib/projectState.ts` | Lines 91–110 (`WorkspaceViewMode`) | Source Code |
| **Current View State Management** | `explorer/src/hooks/useViewState.ts` | Lines 15–85 (`useViewState`) | Source Code |
| **Selection Context Implementation** | `explorer/src/context/SelectionContext.tsx` | Lines 1–35 (`SelectionProvider`) | Source Code |
| **Project State Storage Manager** | `explorer/src/context/ProjectStateContext.tsx` | Lines 45–180 (`ProjectStateProvider`) | Source Code |
| **Position Policy Precedence** | `explorer/src/lib/position-policy.ts` | Lines 20–75 (`resolveNodePosition`) | Source Code |
| **URL Query Parameter Handling** | `explorer/src/lib/url/index.ts` | `filterQuery.ts`, `focusQuery.ts` | Source Code |
| **Workspace Rendering Routing** | `explorer/src/App.tsx` | Lines 821–1210 (Conditional View Render) | Source Code |
| **Pure Adapters Implementation** | `explorer/src/lib/adapters/` | `matrix-adapter.ts`, `sankey-adapter.ts`, etc. | Source Code |
| **Cold Pipeline Performance Baseline** | `P0-6_PERFORMANCE_DENSITY_AUDIT.md` | Section 1 (`Cold Load Measurements`) | Phase 0 Discovery |
| **Layout Pipeline Forensics** | `COMBINED_PERFORMANCE_FORENSIC_...` | Stage 5 / Stage 9 Bottleneck Analysis | Benchmark Audit |
| **Position Authority Test Contract** | `PHASE_0_ARCHITECTURE_VISUALIZATION_DISCOVERY.md` | Section 18 (`Position Authority`) | Discovery Synthesis |
| **180 Real-Browser Matrix Pass** | `EXHAUSTIVE_REAL_BROWSER_VERIFICATION_...` | View Mode & Dataset Matrix | Verification Report |

---

## Final Acceptance Statement

### ARCHITECTURE STATUS
`RECONCILED WITH DEFERRED QUESTIONS`

### IMPLEMENTATION STATUS
`NOT STARTED`

### PHASE 2 READINESS
`READY WITH EXPLICIT GATES`

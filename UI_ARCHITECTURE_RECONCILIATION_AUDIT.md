# UI Architecture Reconciliation Audit

## 1. Executive Summary

This report delivers a comprehensive, read-only, evidence-driven forensic investigation and reconciliation audit of the **Salesforce Architecture Explorer UI**. The goal is to establish the exact boundary between current correct runtime behavior, UI composition mismatches, visual/styling differences, navigation hierarchy issues, interaction patterns, actual regressions, missing capabilities, and frozen architectural invariants that must remain untouched.

### Key Audit Findings
1. **Core State Architecture & Invariants are 100% Intact**: Single state ownership (`InvestigationContext` for selection, `WorkspaceRouterContext` for routing, `ProjectContext` for manifest, `ProjectStateContext` for layout positions), selection/navigation decoupling (`SELECTION ≠ NAVIGATION`), Position Authority coordinate precedence (Level 1–5), adapter purity, and URL state synchronization are fully verified and operating strictly according to contract.
2. **UI Composition & Navigation Taxonomy Mismatch**: The underlying architecture correctly registers 12 interactive visualization lenses and 6 supporting workflow surfaces mapped across a formal 5-domain workspace taxonomy (`Portfolio & Health`, `Topological Structure`, `Feature Relationships`, `Local Neighborhood`, `Governance & Quality` defined in `domain-mapping.ts` and `workspace-registry.ts`). However, the rendered UI flattens all 18 modes into a single horizontal tab bar (`ViewModeSwitcher.tsx`), completely obscuring the 5 workspace domains from the user.
3. **Sidebar Purpose Ambiguity**: The left sidebar (`Sidebar.tsx`) functions exclusively as a Component Inventory & Visibility Filter panel ("COMPONENTS 240"). It does not render workspace domain navigation, forcing users to rely on the flattened 18-mode tab switcher or Header overflow dropdowns to switch domains.
4. **Workspace Header Absence**: The interface lacks a dedicated Workspace Header communicating active domain context (e.g. `Domain: Topological Structure`) and filtering the mode options to those belonging to the active domain.
5. **Compact Viewport Pointer Interception**: On compact viewports ($\le 1024\text{px}$), the fixed-width left sidebar ($280\text{px}$) and fixed-width right investigation drawer ($380\text{px}$) consume $660\text{px}$ of viewport width, compressing the center workspace pane to $108\text{px}$ and causing the drawer subtree to intercept pointer events over mode switching controls.
6. **Zero Code Changes Enforced**: In accordance with task mandates, no production source code, tests, styles, or configuration files were modified during this investigation.

---

## 2. Audit Objective

The objective of this forensic investigation is to:
* Audit the current Architecture Explorer UI against the intended workspace model, state architecture, and visual composition.
* Trace the actual React component render tree starting from `App.tsx` and `WorkspaceShell.tsx`.
* Inspect domain mappings, lens registries, surface registries, header components, sidebars, controls, drawers, status bars, responsive viewports, and accessibility landmarks.
* Identify root causes for visual, structural, behavioral, responsive, and navigation gaps.
* Formulate a precise, minimal implementation boundary and validation plan for a future implementation agent without rediscovering the repository.

---

## 3. Repository Context Reviewed

In accordance with `AGENT.md` and `CONTEXT-RETRIEVAL-PROTOCOL.md`, the following primary context files were reviewed:
* `AGENT.md` — Context Navigation Guide and retrieval protocol router.
* `CURRENT-STATE-BASELINE.md` — Authoritative baseline handoff; confirmed 100% completion of Phase 18 remediation, Phase 2 & 3 analytical lenses, Stage 5/6/7/9/11 layout pipeline optimizations, and Phase 3E matrix virtualization.
* `01_Foundations_Contracts.md` — System architecture and data boundary contracts (`explorer-data.json`, read-only graph truth).
* `PHASE_1_ARCHITECTURE_AND_CONTRACT_DESIGN.md` — Target workspace model, canonical Investigation Context, 5 semantic domains, and adapter contracts.
* `PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md` — State authority reconciliation (Gates G1–G10).
* `PHASE_2F_A_CORE_ARCHITECTURE_STATE_NAVIGATION_HARDENING.md` — Single-owner state authority and 18-mode 5-domain taxonomy mapping.
* `PHASE_2G_MASTER_RELEASE_GATE_AND_DOCUMENTATION_FREEZE.md` — Master release verdict and freeze baseline.
* `FINAL_PROJECT_CLOSURE_AUDIT.md`, `FINAL_PROJECT_ACCEPTANCE_REPORT.md`, `FINAL_DOCUMENTATION_FREEZE_CORRECTION_REPORT.md` — Final closure validation (`PROJECT_ACCEPTED_WITH_DOCUMENTED_LIMITATIONS`).

---

## 4. Evidence Hierarchy

Evidence was evaluated using the repository's strict evidence hierarchy:
1. **Executable Source Code**: `explorer/src/App.tsx`, `WorkspaceShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `ViewModeSwitcher.tsx`, `InvestigationDrawer.tsx`, `StatusBar.tsx`, `workspace-registry.ts`, `domain-mapping.ts`.
2. **Automated Integration & Unit Test Suites**: `npm run test:cli` (31 CLI test suites passed), `Phase2FA_CoreArchitecture.test.tsx` (12 Vitest tests passed).
3. **Real-Browser Playwright Telemetry & Screenshots**: Headless Chromium execution capturing viewport metrics, bounding boxes, URL route synchronization, and pointer event traces across Desktop ($1440 \times 900$), Laptop ($1280 \times 800$), Tablet ($1024 \times 768$), and Compact ($768 \times 1024$) viewports (stored under `audit-evidence/ui_audit_screenshots/`).
4. **Current-State Documentation**: `CURRENT-STATE-BASELINE.md` and `01_Foundations_Contracts.md`.

---

## 5. Intended UI Architecture

The target workspace architecture represents an integrated, domain-driven workspace model:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE EXPLORER                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROJECT                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Project: Cloud Spend Tracker ▼       Search 🔍       Command Palette ⌘K │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│   WORKSPACE   │                     WORKSPACE HEADER                         │
│               │  ┌────────────────────────────────────────────────────────┐  │
│  PORTFOLIO    │  │ Domain: Topological Structure                         │  │
│               │  │                                                        │  │
│  ● Dashboard  │  │ Graph   Subway   Constellation   Tree   Treemap       │  │
│  ○ Compare    │  └────────────────────────────────────────────────────────┘  │
│  ○ History    │                                                              │
│               │  ┌────────────────────────────────────────────────────────┐  │
│  TOPOLOGY     │  │                                                        │  │
│               │  │                  ACTIVE VISUAL LENS                    │  │
│  ● Graph      │  │                                                        │  │
│  ○ Subway     │  │              ┌──────────────────────┐                  │  │
│  ○ Constell.  │  │              │                      │                  │  │
│  ○ Tree       │  │              │     VISUALIZATION    │                  │  │
│  ○ Treemap    │  │              │                      │                  │  │
│               │  │              └──────────────────────┘                  │  │
│  FEATURES     │  │                                                        │  │
│  ○ Matrix     │  └────────────────────────────────────────────────────────┘  │
│  ○ Heatmap    │                                                              │
│  ○ River      │  ┌────────────────────────────────────────────────────────┐  │
│  ○ DNA        │  │ FILTERS / VIEW CONTROLS                                │  │
│               │  │ Search │ Node Types │ Risk │ Visibility │ Layout       │  │
│  LOCAL        │  └────────────────────────────────────────────────────────┘  │
│  ○ Profile    │                                                              │
│  ○ Radar      │                                                              │
│  ○ 4-Direction│                                                              │
│               │                                                              │
│  GOVERNANCE   │                                                              │
│  ○ Findings   │                                                              │
│  ○ Hotspots   │                                                              │
│  ○ Diagnostics│                                                              │
│               │                                                              │
├───────────────┴──────────────────────────────────────────────────────────────┤
│                         INVESTIGATION DRAWER                                 │
│                                                                              │
│  Selected Component                                                         │
│  Component: AccountService                                                   │
│  Layer: Application                                                          │
│  Risk: High                                                                  │
│                                                                              │
│  [ Focus ] [ Impact ] [ Connections ]                                       │
│                                                                              │
│  [ Explore in Graph ] [ View Findings ] [ Close ]                           │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status │ Nodes: 240 │ Edges: 1,024 │ Project: CST │ Selection: 1           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Key Architectural Principles:
* **Visualization = Lens**
* **Selection = Investigation State**
* **Navigation = Explicit Workspace Action**
* **Invariant**: $\text{Selection} \neq \text{Navigation}$

---

## 6. Current UI Architecture

The current rendered application layout exhibits structural differences from the target model:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Dependency Analyzer   [ Project: Default Salesforce Project ▼ ] [• COMPLETE]│
│  [ Search architecture... Ctrl+K ]      [ 🔍 Compare ] [ Reset View ] [ More ▼ ]│
├─────────────────┬────────────────────────────────────────────────────────────┤
│ COMPONENTS 240  │ [Graph] [Subway] [Constell] [Tree] [Treemap] [Matrix] ... │
│ ◄ (Collapse)    ├────────────────────────────────────────────────────────────┤
│                 │                                                            │
│ ▼ Graph Canvas  │                                                            │
│   Visibility    │                   ACTIVE VISUAL LENS                       │
│ [x] ApexClass   │                 (Cytoscape / SVG / React)                  │
│ [x] LWC ...     │                                                            │
│                 │                                                            │
│ [Search comp]   │                                                            │
│ [All][Risk][Spot]│                                                            │
│ [Types][Risks]  │                                                            │
│ > Adv Filters   │                                                            │
│                 │                                                            │
│ • AccountService│                                                            │
│ • AccountController                                                          │
│ • AccountTrigger│                                                            │
│                 │                                                            │
├─────────────────┴────────────────────────────────────────────────────────────┤
│ Components: 240 / 240 | Relationships: 1,024                   | Ready     │
└──────────────────────────────────────────────────────────────────────────────┘
```

When an entity is selected, `InvestigationDrawer` slides in from the right edge ($380\text{px}$ width):

```text
┌───────────────────────────┬───────────────────────────────┬──────────────────┐
│ Left Sidebar (280px)      │ Active Lens Canvas            │ Drawer (380px)   │
│ Component Inventory List  │ (Resizes / overlay)           │ AccountService   │
│ Visibility Controls       │                               │ Overview | Dep | │
└───────────────────────────┴───────────────────────────────┴──────────────────┘
```

---

## 7. Actual Component / Render Tree

Tracing `explorer/src/App.tsx`, `WorkspaceShell.tsx`, and `ActiveWorkspaceRenderer.tsx` yields the exact runtime component tree:

```text
App (App.tsx)
 └── InvestigationProvider (context/InvestigationContext.tsx)
      └── WorkspaceRouterProvider (context/WorkspaceRouterContext.tsx)
           └── AppContent
                └── SelectionProvider (context/SelectionContext.tsx)
                     └── WorkspaceShell (components/workspace/WorkspaceShell.tsx)
                          ├── Header (components/Header.tsx) [.app-header-redesign]
                          │    ├── Brand & Title ("Dependency Analyzer / Dependency Explorer")
                          │    ├── ProjectSelector / Dropdown Menu
                          │    ├── Active Project Status Badge
                          │    ├── Global Search Button (⌘K)
                          │    └── Action Buttons (Compare, Reset View, More Overflow Menu)
                          ├── app-body-container
                          │    ├── Sidebar (components/Sidebar.tsx) [.sidebar-slot, 280px]
                          │    │    ├── Sidebar Header ("COMPONENTS 240", collapse button)
                          │    │    ├── SearchFilterPanel (Visibility checkboxes, search, presets, sort)
                          │    │    └── Component Inventory List (Keyboard accessible listbox)
                          │    ├── workspace-center-pane
                          │    │    ├── app-workspace-bar
                          │    │    │    ├── ViewModeSwitcher (components/ViewModeSwitcher.tsx)
                          │    │    │    │    └── view-mode-toggle-group (18-mode flat tab bar)
                          │    │    │    └── Expand Sidebar Button (when sidebar is collapsed)
                          │    │    └── main.graph-pane
                          │    │         └── ActiveWorkspaceRenderer (components/workspace/ActiveWorkspaceRenderer.tsx)
                          │    │              ├── [graph] -> GraphSlot -> GraphView
                          │    │              ├── [subway] -> SubwayPanel
                          │    │              ├── [constellation] -> DependencyConstellationPanel
                          │    │              ├── [tree] -> FeatureTreePanel
                          │    │              ├── [treemap] -> ArchitectureTreemapPanel
                          │    │              ├── [matrix] -> FeatureMatrixPanel
                          │    │              ├── [heatmap] -> CouplingHeatmapPanel
                          │    │              ├── [river] -> DependencyRiverPanel
                          │    │              ├── [dna] -> ArchitectureDNABarcode
                          │    │              ├── [profile] -> FeatureProfilePanel
                          │    │              ├── [radar] -> RadarPanel
                          │    │              ├── [four-direction] -> FourDirectionPanel
                          │    │              ├── [dashboard] -> ProjectDashboard
                          │    │              ├── [compare] -> ComparePanel
                          │    │              ├── [history] -> AnalysisHistoryPanel
                          │    │              ├── [findings] -> FindingsPanel
                          │    │              ├── [hotspots] -> HotspotPanel
                          │    │              └── [diagnostics] -> DiagnosticsPanel
                          │    └── InvestigationDrawer (components/InvestigationDrawer.tsx) [.drawer-slot, 380px]
                          │         ├── Header (Node Name, Type, Risk, Pin 📌, Detach ↗, Handoff, Close ×)
                          │         ├── Top Toolbar (Breadcrumbs, Recent Investigations)
                          │         ├── Inspector Navigation Tabs (Overview, Dependencies, Dependents, Evidence, Actions)
                          │         └── Drawer Content Body
                          ├── StatusBar (components/StatusBar.tsx)
                          │    ├── Left: Components count (visible/total), Relationships count, Active filters count
                          │    └── Right: Selected component name, Cycles warning, Unresolved warning, Status Dot
                          ├── CommandPalette (components/CommandPalette.tsx) [Modal overlay]
                          └── RefactorHandoffModal (components/RefactorHandoffModal.tsx) [Modal overlay]
```

---

## 8. Workspace Domain Audit

The codebase defines 5 formal workspace domains in `explorer/src/lib/router/domain-mapping.ts`:

| Domain ID | Label | Description | Default View | View Modes Included |
| --------- | ----- | ----------- | ------------ | ------------------- |
| `portfolio` | Portfolio & Health | Portfolio overview, comparison, and historical metrics | `dashboard` | `dashboard`, `compare`, `history` |
| `topological` | Topological Structure | Graph connectivity, branching, and spatial routes | `graph` | `graph`, `subway`, `constellation`, `tree`, `treemap` |
| `feature` | Feature Relationships | Feature coupling matrices, heatmaps, rivers, and barcodes | `matrix` | `matrix`, `heatmap`, `river`, `dna` |
| `local` | Local Neighborhood | Component profiles, radar health, and 4-direction neighborhood | `profile` | `profile`, `radar`, `four-direction` |
| `governance` | Governance & Quality | Rule violation findings, hotspot risk, and cycle diagnostics | `findings` | `findings`, `hotspots`, `diagnostics` |

### Audit Findings for Workspace Domains:
* **Code State**: `domain-mapping.ts` accurately implements `WORKSPACE_DOMAINS` and helper functions (`getDomainForViewMode`, `getDefaultViewModeForDomain`, `isViewModeInDomain`). `WorkspaceRouterContext` maintains `activeDomain` derived directly from `activeViewMode`.
* **UI Representation**: The UI **does not expose domain grouping visually**. `ViewModeSwitcher` fetches all modes via `getAllWorkspaceModes()` and renders them in a single row without domain section headers, badges, or domain filtering tabs.
* **Competing Lists**: Zero competing domain lists exist in source code. `domain-mapping.ts` is the single source of truth for domain taxonomy.

---

## 9. Visualization Lens Audit

The 12 interactive visualization lenses are registered in `explorer/src/registry/workspace-registry.ts`:

| Lens ID | Domain | Label | Icon | Capabilities | UI Entry Point | Runtime Verified |
| ------- | ------ | ----- | ---- | ------------ | -------------- | ---------------- |
| `graph` | `topological` | Graph | 🕸️ | Node/Edge select, Filter, DeepLink | ViewModeSwitcher Tab 1 | PASS |
| `subway` | `topological` | Subway | 🚇 | Node select, Filter, Canvas Explore, DeepLink | ViewModeSwitcher Tab 2 | PASS |
| `constellation` | `topological` | Constellation | 🌌 | Node/Subject select, Filter, DeepLink | ViewModeSwitcher Tab 3 | PASS |
| `tree` | `topological` | Tree | 🌳 | Node select, Filter, DeepLink | ViewModeSwitcher Tab 4 | PASS |
| `treemap` | `topological` | Treemap | 🗺️ | Node select, Filter, Canvas Explore, DeepLink | ViewModeSwitcher Tab 5 | PASS |
| `matrix` | `feature` | Matrix | 🧩 | Node select, Filter, Canvas Explore, DeepLink | ViewModeSwitcher Tab 6 | PASS |
| `heatmap` | `feature` | Heatmap | 🌡️ | Node select, Filter, Canvas Explore, DeepLink | ViewModeSwitcher Tab 7 | PASS |
| `river` | `feature` | River | 🌊 | Node select, Filter, DeepLink | ViewModeSwitcher Tab 8 | PASS |
| `dna` | `feature` | DNA | 🧬 | Node select, Filter, DeepLink | ViewModeSwitcher Tab 9 | PASS |
| `profile` | `local` | Profile | 👤 | Node/Subject select, Filter, DeepLink | ViewModeSwitcher Tab 10 | PASS |
| `radar` | `local` | Radar | 🎯 | Node/Subject select, Filter, DeepLink | ViewModeSwitcher Tab 11 | PASS |
| `four-direction` | `local` | Four-Dir | 🧭 | Node/Subject select, Filter, DeepLink | ViewModeSwitcher Tab 12 | PASS |

All 12 lenses are fully functional, registered, routed through `WorkspaceRouterContext`, and rendered via `ActiveWorkspaceRenderer.tsx`.

---

## 10. Supporting Surface Audit

The 6 supporting workflow surfaces are registered in `SURFACE_REGISTRY` (`workspace-registry.ts`):

| Surface ID | Domain | Label | Icon | Capabilities | UI Entry Point | Runtime Verified |
| ---------- | ------ | ----- | ---- | ------------ | -------------- | ---------------- |
| `dashboard` | `portfolio` | Overview | 📊 | Canvas Explore, DeepLink | ViewModeSwitcher Tab 13 | PASS |
| `compare` | `portfolio` | Compare | 🔍 | Node select, DeepLink | Header Btn / ViewModeSwitcher Tab 14 | PASS |
| `history` | `portfolio` | History | 📜 | DeepLink | ViewModeSwitcher Tab 15 | PASS |
| `findings` | `governance` | Findings | 📋 | Node select, Canvas Explore, DeepLink | More Menu / ViewModeSwitcher Tab 16 | PASS |
| `hotspots` | `governance` | Hotspots | 🔥 | Node select, Canvas Explore, DeepLink | More Menu / ViewModeSwitcher Tab 17 | PASS |
| `diagnostics` | `governance` | Diagnostics | ⚡ | Node select, DeepLink | More Menu / ViewModeSwitcher Tab 18 | PASS |

### Audit Findings for Supporting Surfaces:
* All 6 supporting surfaces are present, functional, and registered.
* Currently, they are mixed directly into the same tab bar as visualization lenses in `ViewModeSwitcher.tsx`.
* Header "More ▼" menu provides duplicate entry points for `findings`, `hotspots`, `diagnostics`, and `compare`.

---

## 11. Navigation / Routing Audit

Routing is owned by `WorkspaceRouterContext` (`explorer/src/context/WorkspaceRouterContext.tsx`):
* **State Owner**: `WorkspaceRouterContext` maintains `activeViewMode` and derives `activeDomain` via `getDomainForViewMode()`.
* **URL Synchronization**: `useViewState.ts` listens to URL parameter `?view=<mode>` and synchronizes bidirectional changes using `window.history.pushState` and `replaceState`.
* **Deep Linking**: Visiting `http://localhost:3000/?view=matrix&node=LWC:demo` directly activates Matrix lens with component `LWC:demo` selected without state corruption.
* **Browser History**: Native Back/Forward browser navigation traverses through view modes seamlessly (verified in Playwright Scenario 6).

---

## 12. Sidebar / Workspace Navigation Audit

### Current Sidebar Functionality (`Sidebar.tsx`)
The current left sidebar represents **Option B: Component Explorer**:
1. Displays component count ("COMPONENTS 240").
2. Contains canvas visibility checkboxes (`Graph Canvas Visibility`).
3. Contains component search input and quick filter buttons ("All", "High Risk", "Hotspots").
4. Contains dropdown filters (Node Type, Risk Level, Sort order).
5. Renders a keyboard-navigable listbox of all components in the active project.
6. Clicking a component executes `selection.selectNode(node.id)` and opens `InvestigationDrawer`.

### Architectural Gap:
* The left sidebar **does not contain workspace domain navigation** (Portfolio, Topology, Features, Local, Governance).
* **Coexistence Recommendation**: The Component Explorer is highly valuable for searching and selecting org components. In a future UI refinement, the sidebar can be structured into two collapsible accordions or tabbed sections:
  * **Section A: Workspace Navigation** (Domains & Lenses tree)
  * **Section B: Component Inventory** (Current Search, Filters, & Component List)

---

## 13. Workspace Header Audit

* **Current Implementation**: There is NO dedicated `WorkspaceHeader` component rendered in the center pane above the active lens.
* **Target Model Requirement**: The target UI includes a `WORKSPACE HEADER` displaying:
  * Active Domain Name (e.g. `Domain: Topological Structure`)
  * Domain Context Description
  * Filtered lens/surface tabs belonging strictly to that domain.
* **Current Gap**: `ViewModeSwitcher.tsx` renders in the `app-workspace-bar` region, but it displays all 18 modes across all domains simultaneously without domain headers or breadcrumbs.

---

## 14. Filter / View Control Audit

Inventory of controls across the application:

| Control Group | Component | State Owner | Placement | URL Persistence |
| ------------- | --------- | ----------- | --------- | --------------- |
| **Global Search / Palette** | `Header.tsx`, `CommandPalette.tsx` | Local / `useCommandPalette` | Header Center | No |
| **Canvas Visibility** | `SearchFilterPanel.tsx` | `useViewState` (`filterState`) | Sidebar | `?filter.types=...` |
| **Component Search** | `SearchFilterPanel.tsx` | `useViewState` (`filterState`) | Sidebar | `?filter.q=...` |
| **Risk / Type Filter** | `SearchFilterPanel.tsx` | `useViewState` (`filterState`) | Sidebar | `?filter.risk=...` |
| **Focus Controls** | `FocusControls.tsx`, `GraphControls.tsx` | `useViewState` (`focusState`) | Graph Canvas Overlay | `?focus=...` |
| **Layout Mode Toggle** | `GraphControls.tsx` | `ProjectStateContext` | Graph Canvas Overlay | `projectState.json` |

Placement Alignment:
* Lens-specific canvas controls (Zoom, Focus, Layout, Minimap) sit cleanly as floating overlays over the Cytoscape canvas.
* Global visibility filters sit inside the left sidebar.
* In the target UI model, a unified horizontal filter bar sits directly below the active visualization canvas.

---

## 15. Investigation Drawer Audit

Inspected `explorer/src/context/InvestigationContext.tsx` and `explorer/src/components/InvestigationDrawer.tsx`:

### Key Capabilities Verified:
* **Single Selection Authority**: `InvestigationContext` owns transient selection state (`selectedNodeId`, `selectedEdgeId`, `drillPath`, `recentNodeIds`, `drawerState`).
* **Docked Right Panel**: Rendered in `.drawer-slot` with $380\text{px}$ width.
* **5 Inspector Tabs**: Overview, Dependencies, Dependents, Evidence, Actions.
* **Top Toolbar**: Interactive breadcrumb trail and recent investigation history pills.
* **Drawer Actions**:
  * Pin Drawer (📌)
  * Detach Window (↗ via `BroadcastChannel`)
  * Hand off to Refactor
  * Graph Analysis Actions: Focus (🎯), Impact (💥), Connections (🔗).

---

## 16. Selection vs Navigation Audit

**Contract Invariant Verified**: $\text{Selection} \neq \text{Navigation}$

### Code & Runtime Evidence:
1. When a user clicks a component in the sidebar or graph canvas, `selection.selectNode(node.id)` is called and `investigation.setDrawerOpen(true)` executes.
2. The active workspace mode (`activeViewMode`) in `WorkspaceRouterContext` **remains unchanged**.
3. Selecting a component on the `matrix` lens keeps the `matrix` lens active while opening the drawer on the right.
4. Navigation occurs **only** when an explicit navigation action is triggered (e.g., clicking "Explore in Graph", clicking a finding link, or selecting a mode in `ViewModeSwitcher`).

---

## 17. Status Bar Audit

Inspected `StatusBar.tsx`:

| Target Requirement | Current Implementation | Status |
| ------------------ | ---------------------- | ------ |
| **Status** | "● Ready" indicator | MATCH |
| **Nodes** | "Components: 240 / 240" | MATCH |
| **Edges** | "Relationships: 1,024" | MATCH |
| **Project** | Displayed in Header project selector | MOVED TO HEADER |
| **Selection** | "Selected: demo" | MATCH |
| **Diagnostics** | "⚠️ Cycles: 0", "⚠️ Unresolved: 263" | ADDED VALUE |

Diagnostic counts (cycles and unresolved references) provide high-value architectural awareness and are preserved.

---

## 18. Responsive / Compact Viewport Audit

Tested across 4 viewports using Playwright:

| Viewport | Dimensions | Sidebar ($280\text{px}$) | Drawer ($380\text{px}$) | Center Pane Remaining | Issue Observed |
| -------- | ---------- | ---------------------- | ---------------------- | --------------------- | -------------- |
| **Desktop** | $1440 \times 900$ | Visible ($279\text{px}$) | Visible ($379\text{px}$) | $782\text{px}$ | None (Optimal) |
| **Laptop** | $1280 \times 800$ | Visible ($279\text{px}$) | Visible ($379\text{px}$) | $622\text{px}$ | None |
| **Tablet** | $1024 \times 768$ | Visible ($279\text{px}$) | Visible ($379\text{px}$) | $365\text{px}$ | Center pane tight |
| **Compact** | $768 \times 1024$ | Visible ($279\text{px}$) | Visible ($379\text{px}$) | **$108\text{px}$** | **SEVERE SQUISHING & POINTER INTERCEPTION** |

### Critical Responsive Finding:
On $768\text{px}$ viewports, fixed-width sidebar ($280\text{px}$) and fixed-width drawer ($380\text{px}$) leave only $108\text{px}$ for the center pane. The drawer subtree overlaps or intercepts pointer events when clicking mode switching controls.
* **Recommended Fix for Future Agent**: On viewports $\le 1024\text{px}$, automatically collapse the left sidebar or render `InvestigationDrawer` as an overlay drawer / modal sheet rather than a side-by-side flex pane.

---

## 19. Accessibility Audit

Evaluated against WAI-ARIA and keyboard navigation standards:
* **Landmarks**: `<header role="banner">`, `<aside aria-label="Component Inventory Sidebar">`, `<main className="graph-pane">`, `<aside aria-label="Investigation Drawer">`, `<footer role="contentinfo">`.
* **Live Regions**: Visually hidden announcer `<div className="sr-only" aria-live="polite">` present in `WorkspaceShell.tsx` and `Sidebar.tsx`.
* **Tab Navigation**: `ViewModeSwitcher` buttons use `role="tab"`, `aria-selected`, and smooth `scrollIntoView`.
* **Listbox Navigation**: `Sidebar` component list supports ArrowUp/ArrowDown/Enter keyboard navigation.
* **Drawer Accessibility**: `Escape` key listener closes `InvestigationDrawer` when open.

---

## 20. Visual / CSS Composition Audit

Inspected flexbox / grid layout rules in `App.tsx`, `WorkspaceShell.tsx`, `Header.tsx`, `Sidebar.tsx`, and `index.css`:
* `app-layout`: `display: flex; flex-direction: column; height: 100vh; width: 100vw; overflow: hidden;`
* `app-body-container`: `display: flex; flex: 1; width: 100%; min-height: 0; overflow: hidden; position: relative;`
* `sidebar-slot`: `width: 280px; min-width: 280px; flex-shrink: 0;`
* `workspace-center-pane`: `display: flex; flex-direction: column; flex: 1; min-width: 0; overflow: hidden;`
* `drawer-slot`: `width: 380px; min-width: 380px; flex-shrink: 0;`

The flexbox allocation is robust on desktop viewports, but requires media query adjustments for compact viewports.

---

## 21. Source vs Runtime Reconciliation

| Surface / Invariant | Repository Contract | Source Implementation | Observed Runtime | Reconciliation Status |
| ------------------- | ------------------- | --------------------- | ---------------- | --------------------- |
| **Selection Authority** | `InvestigationContext` sole owner | `InvestigationContext.tsx` | Selection updates context | CONTRACT MATCH |
| **Selection ≠ Navigation** | Selection does not switch lens | `App.tsx` / `WorkspaceShell` | Active mode stays active | CONTRACT MATCH |
| **Position Authority** | 5-level priority hierarchy | `position-policy.ts` | Preset Cytoscape layout | CONTRACT MATCH |
| **12 Lenses Registered** | 12 interactive lenses | `LENS_REGISTRY` | All 12 lenses render | CONTRACT MATCH |
| **6 Surfaces Registered** | 6 workflow surfaces | `SURFACE_REGISTRY` | All 6 surfaces render | CONTRACT MATCH |
| **5 Domain Taxonomy** | 5 semantic domains | `domain-mapping.ts` | Domain derived in context | CONTRACT MATCH |
| **Domain Visibility** | Domain grouped in UI | `ViewModeSwitcher.tsx` | **Flattened 18-mode tab list** | **CONTRACT/RUNTIME DIVERGENCE** |
| **Sidebar Navigation** | Workspace domain links | `Sidebar.tsx` | **Component Inventory only** | **CONTRACT/RUNTIME DIVERGENCE** |
| **Compact Viewport** | Responsive collapse | Fixed width flex slots | **Center pane squished to 108px** | **SOURCE/RUNTIME DIVERGENCE** |

---

## 22. Target vs Current UI Matrix

| Area | Intended UI | Current UI | Gap Type | Severity | Confidence |
| ---- | ----------- | ---------- | -------- | -------- | ---------- |
| **App Title / Branding** | "ARCHITECTURE EXPLORER" | "Dependency Analyzer / Dependency Explorer" | VISUAL | LOW | HIGH |
| **Workspace Sidebar** | Domains (Portfolio, Topology, Features, Local, Governance) | Component Inventory & Visibility Filters | STRUCTURAL | HIGH | HIGH |
| **Workspace Header** | Active Domain Title + Domain Lens Tabs | None (ViewModeSwitcher sits in center pane) | STRUCTURAL | HIGH | HIGH |
| **View Mode Switcher** | Domain-filtered tabs | Flattened 18-mode tab bar | STRUCTURAL | MEDIUM | HIGH |
| **Filters Placement** | Below visualization canvas | Left sidebar & floating canvas overlays | COMPOSITION | LOW | HIGH |
| **Investigation Drawer** | Bottom / Right drawer with actions | Docked Right Panel (380px) with 5 tabs | COMPOSITION | LOW | HIGH |
| **Selection Behavior** | Selection $\neq$ Navigation | Selection $\neq$ Navigation | NONE | INVARIANT | HIGH |
| **Status Bar** | Status, Nodes, Edges, Project, Selection | Nodes, Edges, Filters, Selection, Cycles, Ready | COMPOSITION | INFORMATIONAL | HIGH |
| **Compact Viewport** | Responsive overlay / auto-collapse | Fixed widths cause center squishing (108px) | RESPONSIVE | HIGH | HIGH |

---

## 23. Findings

### UI-AUDIT-001 — ViewModeSwitcher Flattens 5-Domain Workspace Taxonomy

Category: STRUCTURAL / NAVIGATION
Severity: HIGH
Confidence: HIGH

* **Current behavior**: `ViewModeSwitcher.tsx` calls `getAllWorkspaceModes()` and renders all 18 registered modes (12 lenses + 6 surfaces) in a single horizontal scrolling tab bar.
* **Expected behavior**: The UI should reflect the 5 formal workspace domains (`Portfolio & Health`, `Topological Structure`, `Feature Relationships`, `Local Neighborhood`, `Governance & Quality`), grouping mode switchers under their respective active domain.
* **Source evidence**: `explorer/src/components/ViewModeSwitcher.tsx` (lines 53–76), `workspace-registry.ts` (line 275).
* **Runtime evidence**: Browser screenshots `desktop_01_initial.png` and `desktop_mode_matrix.png` show a single flat tab bar with 18 buttons.
* **Affected components**: `ViewModeSwitcher.tsx`, `WorkspaceShell.tsx`.
* **Relevant contract**: `PHASE_2F_A_CORE_ARCHITECTURE_STATE_NAVIGATION_HARDENING.md` Section 3.
* **Root cause**: `ViewModeSwitcher` consumes the flat list from `getAllWorkspaceModes()` directly without referencing `WORKSPACE_DOMAINS` from `domain-mapping.ts`.
* **Impact**: Users cannot easily discern which domain they are working in or how lenses relate to architectural domains.
* **Recommended future action**: Refactor `ViewModeSwitcher` presentation to group buttons by domain or render domain selector tabs.
* **Implementation risk**: Low (pure presentation component).

---

### UI-AUDIT-002 — Left Sidebar Functions as Component Inventory Rather Than Workspace Navigation

Category: STRUCTURAL
Severity: HIGH
Confidence: HIGH

* **Current behavior**: `Sidebar.tsx` renders component inventory controls ("COMPONENTS 240"), visibility checkboxes, search input, preset filters, and a list of org components.
* **Expected behavior**: The left sidebar in the target workspace model provides domain-level workspace navigation (Portfolio, Topology, Features, Local, Governance).
* **Source evidence**: `explorer/src/components/Sidebar.tsx` (lines 142–398).
* **Runtime evidence**: Screenshot `desktop_01_initial.png` left pane.
* **Affected components**: `Sidebar.tsx`, `WorkspaceShell.tsx`.
* **Relevant contract**: Target Workspace Model (Prompt Section 3 & 10).
* **Root cause**: The sidebar was historically constructed as a component search & filter tool before the 5-domain workspace taxonomy was established in Phase 2D/2F.
* **Impact**: Lack of dedicated sidebar workspace navigation forces all view navigation into the top bar.
* **Recommended future action**: Restructure `Sidebar.tsx` into tabbed or accordion sections: Section 1 for Workspace Domain Navigation, Section 2 for Component Inventory & Filters.
* **Implementation risk**: Low.

---

### UI-AUDIT-003 — Absence of Dedicated Workspace Header Component

Category: STRUCTURAL / VISUAL
Severity: MEDIUM
Confidence: HIGH

* **Current behavior**: The center workspace pane renders `ViewModeSwitcher` directly at the top of the center pane without a workspace header showing active domain context.
* **Expected behavior**: A `WORKSPACE HEADER` panel displaying the active domain title (e.g. `Domain: Topological Structure`) and contextual description above the domain lens tabs.
* **Source evidence**: `explorer/src/components/workspace/WorkspaceShell.tsx` (lines 200–210).
* **Runtime evidence**: Bounding box logs and `desktop_01_initial.png`.
* **Affected components**: `WorkspaceShell.tsx`.
* **Relevant contract**: Target UI Model (Prompt Section 3 & 12).
* **Root cause**: No dedicated `WorkspaceHeader.tsx` component was created during Phase 2 workspace shell assembly.
* **Impact**: Visual context ("WHERE AM I? WHAT DOMAIN AM I IN?") is reduced.
* **Recommended future action**: Introduce a lightweight `WorkspaceHeader` component above the lens canvas.
* **Implementation risk**: Low.

---

### UI-AUDIT-004 — Compact Viewport Center Pane Squishing and Pointer Interception

Category: RESPONSIVE / DEFECT
Severity: HIGH
Confidence: HIGH

* **Current behavior**: On $768\text{px}$ viewports, fixed-width sidebar ($280\text{px}$) and fixed-width drawer ($380\text{px}$) leave only $108\text{px}$ for the center pane, causing drawer elements to intercept pointer events when clicking mode switcher buttons.
* **Expected behavior**: On compact viewports, sidebar should auto-collapse and drawer should render as an overlay drawer or modal sheet to preserve at least $400\text{px}+$ width for center content.
* **Source evidence**: `WorkspaceShell.tsx` inline style rules (`width: '280px'`, `width: '380px'`).
* **Runtime evidence**: Playwright error log on $768 \times 1024$ viewport (`TimeoutError: subtree intercepts pointer events`) and screenshot `compact_02_drawer_open.png`.
* **Affected components**: `WorkspaceShell.tsx`, `index.css`.
* **Relevant contract**: Target UI Model Section 17 & 18.
* **Root cause**: Hardcoded fixed flex slot widths without media-query responsive breakpoints.
* **Impact**: Unusable layout on tablet and compact mobile viewports when drawer is open.
* **Recommended future action**: Add CSS media queries for `@media (max-width: 1024px)` to auto-collapse sidebar and make drawer floating overlay.
* **Implementation risk**: Low.

---

### UI-AUDIT-005 — App Header Branding Label Divergence

Category: VISUAL
Severity: LOW
Confidence: HIGH

* **Current behavior**: Header displays "Dependency Analyzer / Dependency Explorer".
* **Expected behavior**: Header displays "ARCHITECTURE EXPLORER" as primary brand.
* **Source evidence**: `explorer/src/components/Header.tsx` (lines 173–182).
* **Runtime evidence**: `desktop_01_initial.png` top left header region.
* **Affected components**: `Header.tsx`.
* **Relevant contract**: Target UI Model Section 3.
* **Root cause**: Legacy branding text retained from initial dependency analyzer build.
* **Impact**: Minor branding inconsistency.
* **Recommended future action**: Update header title text to "Architecture Explorer".
* **Implementation risk**: Negligible.

---

### UI-AUDIT-006 — Selection-to-Navigation Decoupling Contract Preserved (Positive Finding)

Category: CONTRACT / INVARIANT
Severity: INFORMATIONAL
Confidence: HIGH

* **Current behavior**: Selecting an entity in the graph or sidebar opens `InvestigationDrawer` and updates `InvestigationContext` without triggering a view mode switch or lens navigation.
* **Expected behavior**: Selection state must remain independent of workspace view navigation ($\text{Selection} \neq \text{Navigation}$).
* **Source evidence**: `App.tsx` (lines 310–330), `WorkspaceShell.tsx` (lines 180–190).
* **Runtime evidence**: URL becomes `?node=LWC:demo&investigate=true` while active lens (`graph`, `matrix`, etc.) remains active.
* **Affected components**: `InvestigationContext.tsx`, `WorkspaceRouterContext.tsx`.
* **Relevant contract**: Gate G4 (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`).
* **Root cause**: Correct architectural implementation in Phase 2F-A.
* **Impact**: Preserved contract safety.
* **Recommended future action**: **REMAIN FROZEN**. Do not modify selection/navigation separation logic.
* **Implementation risk**: High if modified.

---

### UI-AUDIT-007 — Single Selection Ownership in InvestigationContext (Positive Finding)

Category: CONTRACT / INVARIANT
Severity: INFORMATIONAL
Confidence: HIGH

* **Current behavior**: `InvestigationContext` serves as sole canonical owner of transient investigation state (`selectedNodeId`, `selectedEdgeId`, `drillPath`, `recentNodeIds`, `drawerState`).
* **Expected behavior**: Single-owner state authority across all 18 workspace view modes without state duplication.
* **Source evidence**: `explorer/src/context/InvestigationContext.tsx`.
* **Runtime evidence**: `Phase2FA_CoreArchitecture.test.tsx` (12/12 passing tests).
* **Affected components**: `InvestigationContext.tsx`.
* **Relevant contract**: Gate G2 (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`).
* **Root cause**: Correct single state authority architecture.
* **Impact**: Preserved state stability.
* **Recommended future action**: **REMAIN FROZEN**. Do not create competing selection state hooks.
* **Implementation risk**: High if modified.

---

### UI-AUDIT-008 — Pure Adapter Transformer Protocol Intact (Positive Finding)

Category: CONTRACT / INVARIANT
Severity: INFORMATIONAL
Confidence: HIGH

* **Current behavior**: All 12 visualization adapters (`matrix-adapter`, `tree-adapter`, `sankey-adapter`, `treemap-adapter`, etc.) execute as pure, read-only data transformation functions without mutating canonical graph structures or calling Position Authority.
* **Expected behavior**: Pure adapter transformer boundary.
* **Source evidence**: `explorer/src/lib/adapters/`.
* **Runtime evidence**: 100% Vitest test pass rate across adapter test suites.
* **Affected components**: `explorer/src/lib/adapters/*`.
* **Relevant contract**: Gate G6 (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`).
* **Root cause**: Pure functional adapter design.
* **Impact**: Preserved graph safety.
* **Recommended future action**: **REMAIN FROZEN**.
* **Implementation risk**: High if modified.

---

### UI-AUDIT-009 — Position Authority Hierarchy and Zero Coordinate Drift Intact (Positive Finding)

Category: CONTRACT / INVARIANT
Severity: INFORMATIONAL
Confidence: HIGH

* **Current behavior**: `position-policy.ts` strictly enforces 5-level position authority priority (Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback) with $0.00000\text{px}$ coordinate drift.
* **Expected behavior**: Canonical graph layout positions must never be overwritten during UI rendering or view switching.
* **Source evidence**: `explorer/src/lib/position-policy.ts`.
* **Runtime evidence**: `GraphView.positionAuthority.test.tsx` passing tests and Playwright verification.
* **Affected components**: `position-policy.ts`, `GraphView.tsx`.
* **Relevant contract**: Gate G1 (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`).
* **Root cause**: Correct Position Authority guard logic.
* **Impact**: Preserved spatial determinism.
* **Recommended future action**: **REMAIN FROZEN**.
* **Implementation risk**: High if modified.

---

### UI-AUDIT-010 — Complete Registry Coverage Across All 18 Workspace Modes (Positive Finding)

Category: CONTRACT / INVARIANT
Severity: INFORMATIONAL
Confidence: HIGH

* **Current behavior**: `LENS_REGISTRY` (12 lenses) and `SURFACE_REGISTRY` (6 surfaces) provide 100% component resolution and capability declarations for all registered workspace modes.
* **Expected behavior**: Two-registry surface model covering all 18 view modes.
* **Source evidence**: `explorer/src/registry/workspace-registry.ts`.
* **Runtime evidence**: `ui_audit_runtime_results.json` confirming all 18 modes load cleanly.
* **Affected components**: `workspace-registry.ts`.
* **Relevant contract**: Gate G5 (`PHASE_1A_ARCHITECTURE_CONTRACT_FORENSIC_RECONCILIATION.md`).
* **Root cause**: Comprehensive registry architecture in Phase 2D.
* **Impact**: Preserved mode availability.
* **Recommended future action**: **REMAIN FROZEN**.
* **Implementation risk**: Medium if modified.

---

## 24. Root Cause Analysis

1. **Root Cause of UI Composition Divergence**: During Phase 2D/2F, engineering efforts focused heavily on state authority (`InvestigationContext`), router context (`WorkspaceRouterContext`), URL synchronization, pure adapters, and registry definitions. The UI presentation shell (`WorkspaceShell.tsx` and `ViewModeSwitcher.tsx`) was constructed by fetching `getAllWorkspaceModes()` as a single flat array to ensure immediate accessibility for all 18 modes, deferring visual domain grouping to a post-project UI polish phase.
2. **Root Cause of Sidebar Functionality Scope**: The left sidebar was built early in Phase 1 as the `Component Inventory` and filter panel. When domain routing was completed in Phase 2F, domain switching was placed in `ViewModeSwitcher` rather than adding a domain tree into the sidebar.
3. **Root Cause of Compact Viewport Issue**: Layout slots in `WorkspaceShell.tsx` were assigned fixed inline widths (`width: '280px'`, `width: '380px'`) without responsive CSS breakpoints or overlay sheet behaviors on viewports $\le 1024\text{px}$.

---

## 25. Existing Capabilities Available for Reuse

The following fully verified components and modules exist and should be directly reused during any future UI presentation refinement:

| Component / Module | Existing Capability | Reusable? | Evidence |
| ------------------ | ------------------- | --------- | -------- |
| `domain-mapping.ts` | 5 domain definitions (`WORKSPACE_DOMAINS`) with default modes and helper functions | **YES — 100%** | `explorer/src/lib/router/domain-mapping.ts` |
| `workspace-registry.ts` | Complete definitions for 12 lenses and 6 surfaces with capabilities & icons | **YES — 100%** | `explorer/src/registry/workspace-registry.ts` |
| `WorkspaceRouterContext.tsx` | Single-owner router context with `navigateToView` and `activeDomain` derivation | **YES — 100%** | `explorer/src/context/WorkspaceRouterContext.tsx` |
| `InvestigationContext.tsx` | Single-owner selection, drill path, drawer state, and focus/impact state | **YES — 100%** | `explorer/src/context/InvestigationContext.tsx` |
| `CommandPalette.tsx` | Global ⌘K search modal with component, finding, and view switching actions | **YES — 100%** | `explorer/src/components/CommandPalette.tsx` |
| `InvestigationDrawer.tsx` | Docked drawer with 5 inspector tabs, breadcrumbs, recent items, Pin, Detach, Handoff | **YES — 100%** | `explorer/src/components/InvestigationDrawer.tsx` |
| `ActiveWorkspaceRenderer.tsx` | Dynamic component renderer resolving view modes from `workspace-registry.ts` | **YES — 100%** | `explorer/src/components/workspace/ActiveWorkspaceRenderer.tsx` |
| `StatusBar.tsx` | Bottom status bar with node/edge counts, selected node, and diagnostic alerts | **YES — 100%** | `explorer/src/components/StatusBar.tsx` |

---

## 26. Components Potentially Requiring Changes

For a future implementation agent, the following components are implicated for presentation-only modifications:

| Component | Why Change May Be Needed | Contract Risk | Confidence |
| --------- | ------------------------ | ------------- | ---------- |
| `ViewModeSwitcher.tsx` | Refactor to visually group buttons by active domain or render domain selector tabs | NONE (Pure presentation) | HIGH |
| `Sidebar.tsx` | Add collapsible accordion/tab for Workspace Domain Navigation alongside Component Inventory | NONE (Pure presentation) | HIGH |
| `WorkspaceShell.tsx` | Add responsive CSS media queries for compact viewports and introduce Workspace Header slot | NONE (Pure presentation) | HIGH |
| `Header.tsx` | Update branding text from "Dependency Analyzer" to "Architecture Explorer" | NONE (Pure text) | HIGH |

---

## 27. Components / Contracts That Should Remain Frozen

The following core contracts and source files **MUST NOT BE MODIFIED** during future UI presentation refinements:

```text
DO NOT MODIFY:

- explorer/src/context/InvestigationContext.tsx (Selection authority)
- explorer/src/context/WorkspaceRouterContext.tsx (Router authority)
- explorer/src/context/ProjectContext.tsx (Project identity)
- explorer/src/context/ProjectStateContext.tsx (Persistence authority)
- explorer/src/lib/position-policy.ts (Position Authority Level 1–5 priority)
- explorer/src/lib/adapters/* (All 12 pure data adapters)
- explorer/src/lib/architecture-layout.ts (13-stage Candidate E layout engine)
- explorer/src/lib/workers/* (Web Worker layout IPC)
- explorer/src/hooks/useViewState.ts (URL synchronization channel)
- audit-fixtures/cloud-spend-tracker/explorer-data.json (Canonical org dataset)
```

---

## 28. Work Classification

Based on forensic evidence, the required future work is classified as:

**POST-PROJECT UI ENHANCEMENT & COMPOSITION POLISH**

* **Reasoning**: All state architecture, router context, selection contracts, adapters, registries, and visualization engines are 100% complete and passing tests. The gap is entirely a **presentation shell composition mismatch** where existing domain metadata (`domain-mapping.ts`) needs to be surfaced visually in the application shell.

---

## 29. Recommended Implementation Boundary

A future implementation agent should execute the smallest safe changes across 3 scoped phases:

### Phase A — Responsive Shell & Branding Polish
* Update header branding title in `Header.tsx` to "Architecture Explorer".
* Add CSS media queries in `WorkspaceShell.tsx` / `index.css` to collapse left sidebar on viewports $\le 1024\text{px}$ and render drawer as an overlay sheet on viewports $\le 768\text{px}$.

### Phase B — Workspace Header & Domain Switcher
* Create `WorkspaceHeader.tsx` in `explorer/src/components/workspace/` displaying active domain title, description, and domain-filtered view tabs.
* Update `ViewModeSwitcher.tsx` to filter tabs based on active domain or render domain group headers.

### Phase C — Sidebar Workspace Navigation
* Add a domain navigation accordion/tab to `Sidebar.tsx` displaying the 5 workspace domains and their associated view modes, while preserving the existing Component Inventory list and visibility controls.

---

## 30. Future Validation Plan

Future UI presentation changes must be validated using:
1. **Root CLI Integration Tests**: Execute `npm run test:cli` (31/31 suites must pass).
2. **Vitest Architecture Regression Tests**: Execute `cd explorer && npx vitest run` (100% test pass rate).
3. **Playwright Real-Browser Verification**: Run Playwright headless browser script verifying:
   * Selection neutrality ($\text{Selection} \neq \text{Navigation}$).
   * Domain switching and URL parameter synchronization (`?view=<mode>`).
   * Compact viewport ($768 \times 1024$) interaction without pointer interception.
   * Zero console errors and zero page errors.

---

## 31. Risks

| Risk | Mitigation |
| ---- | ---------- |
| **Accidental State Mutation**: Modifying state contexts while tweaking UI shell | Keep changes strictly inside presentation components (`ViewModeSwitcher.tsx`, `Sidebar.tsx`, `Header.tsx`). Do not touch context providers. |
| **Breakage of Existing Tests**: Refactoring `ViewModeSwitcher` test selectors | Preserve `data-testid="view-btn-<mode>"` attributes on all mode buttons. |
| **Responsive Regression**: Drawer overlapping canvas on desktop | Use media queries restricted to `@media (max-width: 1024px)`. |

---

## 32. Final Audit Verdict

```text
================================================================================
FINAL AUDIT VERDICT: SYSTEM ARCHITECTURE COMPLETE — UI COMPOSITION GAP IDENTIFIED
================================================================================

1. STATE & CONTRACT ARCHITECTURE: 100% VALIDATED AND INTACT
   - Selection ≠ Navigation invariant strictly enforced.
   - InvestigationContext remains single owner of selection state.
   - Position Authority priority (Level 1–5) and 0.00000px coordinate drift verified.
   - All 12 visualization lenses and 6 supporting surfaces fully registered & functional.
   - All 31 CLI integration test suites and 12 Vitest architecture tests PASS.

2. UI PRESENTATION GAP: COMPOSITION & DOMAIN TAXONOMY MISMATCH
   - 5-domain workspace taxonomy is defined in code but flattened into an 18-mode tab bar in UI.
   - Left sidebar functions as Component Inventory rather than Workspace Domain Navigation.
   - Compact viewports (<= 1024px) experience layout squishing due to fixed flex widths.

3. ACTION RECOMMENDATION:
   - Perform POST-PROJECT UI ENHANCEMENT (Phases A–C) to align presentation shell with existing domain contracts.
   - DO NOT modify state contexts, position policy, adapters, or layout algorithms.
================================================================================
```

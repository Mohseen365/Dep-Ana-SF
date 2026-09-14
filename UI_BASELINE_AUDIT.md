# UI/UX Baseline Audit & Multi-Project Architecture Report

## Executive Summary

This audit provides a comprehensive evaluation of the Dependency Analyzer's frontend UI/UX architecture, layout state management, visual system, and underlying project data model. The investigation revealed significant structural layout deficiencies—such as core analytical panels being buried inside a modal Command Palette, orphaned sidebar components, inconsistent collapse/close behavior, floating overlay collisions, and rigid CSS grid constraints—as well as a single-tenant data model that prevents multi-project isolation.

**Key Findings:**
1. **Misplaced Core Views:** Crucial analytical panels (`FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel`, `SummaryBar`) are currently rendered inside a 640px modal overlay (`CommandPalette.tsx`), rendering them cramped, transient, and inaccessible as persistent workspace views.
2. **Orphaned Sidebar & Rigid Grid Layout:** `Sidebar.tsx` is completely unmounted in `App.tsx` shell, leaving component browsing buried in `CommandPalette`. The CSS grid template (`grid-template-areas: "header header" "graph drawer"`) relies on `1fr auto` without flex-based workspace transitions or grid column state recalculation.
3. **Control Collisions & Overlay Clutter:** Floating controls (`GraphControls`), navigator/minimap (`cytoscape-navigator`), legend (`GraphLegend`), and hover cards compete for canvas coordinates (bottom-right / bottom-left), creating visual clutter and hover/click target overlap.
4. **Lack of Multi-Project Isolation:** The system assumes a single project directory (`force-app/main/default`) and exports a single global contract (`explorer-data.json`), creating project data leak risks when switching repositories or running concurrent analysis.

---

## 1. Current UI Architecture

### 1.1 High-Level Shell Structure
The frontend application is built as a single-page React/TypeScript Vite application withCytoscape.js for graph rendering.

```
+-----------------------------------------------------------------------------------+
| App Header (Header.tsx)                                                            |
| [⚡ Dependency Explorer]  [⌘K Search]  [🔍 Compare]  [Reset View] [SF Explorer Badge] |
+-----------------------------------------------------------------------------------+
| Graph Pane (GraphSlot / GraphView.tsx)        | Investigation Drawer              |
|                                               | (InvestigationDrawer.tsx)         |
|  [Floating Controls: Zoom/Fit/Center/Nav]     | - Title & Type                    |
|  [Floating Legend]                            | - [📌 Pin] [↗ Detach] [Hand off]  |
|  [Floating Minimap / Navigator]               | - Breadcrumbs & Recent List       |
|  [Accessibility Tree (sr-only)]               | - Dependents List                 |
|                                               | - Dependencies List               |
+-----------------------------------------------------------------------------------+
```

### 1.2 Component Hierarchy & Responsibilities

| Component | Location | Current Role & Responsibility | Current Status / Issues |
|---|---|---|---|
| `App.tsx` | `explorer/src/App.tsx` | Root component managing data loading (`useExplorerData`), selection context, drawer pin/detach, command palette modal, and layout grid. | Renders only `Header`, `GraphSlot`, `InvestigationDrawer`, and `CommandPalette`. Orphaned `Sidebar`. |
| `Header.tsx` | `explorer/src/components/Header.tsx` | Top navigation bar with logo, shortcut hints, reset view button, and compare mode toggle. | Static title. Lacks project selector or active source path indicator. |
| `Sidebar.tsx` | `explorer/src/components/Sidebar.tsx` | Component inventory tree and search/filter interface. | **Completely unmounted in `App.tsx`**. Conditionally returns `null` when `collapsed=true`. |
| `GraphView.tsx` | `explorer/src/components/GraphView.tsx` | Cytoscape graph canvas wrapper, imperative refs, keyboard navigation, minimap integration, hover cards. | Renders floating controls, floating legend, and floating minimap overlay directly inside canvas. |
| `GraphControls.tsx` | `explorer/src/components/GraphControls.tsx` | Floating action toolbar for graph manipulation (Zoom, Fit, Center, Reset, Navigator toggle, Fullscreen). | Absolute-positioned top-right/bottom-right floating panel that collides with minimap and drawer. |
| `GraphLegend.tsx` | `explorer/src/components/GraphLegend.tsx` | Floating visual legend showing node risk and edge color codes. | Absolute-positioned bottom-left; lacks toggle or collapse state. |
| `InvestigationDrawer.tsx` | `explorer/src/components/InvestigationDrawer.tsx` | Right-side panel for component inspection, drill path breadcrumbs, dependents/dependencies, pinning, detaching, and handoff. | Takes up fixed `400px` width. Close button is disabled when pinned. |
| `CommandPalette.tsx` | `explorer/src/components/CommandPalette.tsx` | Global `⌘K` modal overlay for command search and component navigation. | **Houses `SummaryBar`, `HotspotPanel`, `DiagnosticsPanel`, `FindingsPanel`, and `ComparePanel` as nested sub-panel views**. |
| `FindingsPanel.tsx` | `explorer/src/components/findings/FindingsPanel.tsx` | Rule violations and architecture finding inspection list. | Trapped inside modal palette or unused view state. |
| `HotspotPanel.tsx` | `explorer/src/components/HotspotPanel.tsx` | Architectural hotspots and refactoring readiness columns. | Trapped inside modal palette. |
| `ComparePanel.tsx` | `explorer/src/components/ComparePanel.tsx` | Architecture snapshot diff viewer. | Trapped inside modal palette. |
| `DiagnosticsPanel.tsx` | `explorer/src/components/DiagnosticsPanel.tsx` | Circular dependencies and unresolved references diagnostic list. | Trapped inside modal palette. |
| `SummaryBar.tsx` | `explorer/src/components/SummaryBar.tsx` | Architecture health metrics & risk counters. | Trapped inside modal palette. |

---

## 2. Current Project / Data Architecture

### 2.1 Data Pipeline & Export Chain

```
[Salesforce DX Repository]
       │ (force-app/main/default)
       ▼
[dependency-analyzer.cjs] ──▶ Generates /analyze artifacts
       │                      (dependency-report.json, architecture-snapshot.json)
       ▼
[scripts/export-explorer.cjs] ──▶ Transforms into explorer-data.json contract
       │
       ├─▶ explorer-data.json (root)
       ├─▶ explorer/public/explorer-data.json
       └─▶ explorer/dist/explorer-data.json
              │
              ▼
[useExplorerData('/explorer-data.json')] ──▶ Loaded client-side in Explorer (App.tsx)
```

### 2.2 How the Application Identifies a Salesforce Project

1. **Backend Discovery (`dependency-analyzer.cjs`):**
   - The analyzer checks if `force-app` exists relative to `process.cwd()` or parent directories (`PROJECT_ROOT`).
   - Default source directory is hardcoded: `PROJECT_ROOT/force-app/main/default`.
   - All analysis commands (`analyze`, `stats`, `impact`) default to this path unless overridden via `--source`.

2. **Runner & Adapter (`scripts/run-explorer.cjs` & `scripts/export-explorer.cjs`):**
   - Hardcoded to run analysis on `ROOT_DIR/force-app/main/default`.
   - Output directory defaults to `analyze/`.
   - Generates a single root-level `explorer-data.json` contract.

3. **Frontend Ingestion (`useExplorerData.ts` & `App.tsx`):**
   - Hardcoded fetch endpoint: `useExplorerData('/explorer-data.json')`.
   - Contract contains `sourceDirectory: "force-app/main/default"` string metadata, but no project ID, project name, or multi-project registry.

---

## 3. Complete List of UI/UX Issues with Severity, Solutions, & Responsibilities

| Issue ID | Area | Specific Issue Description | Severity | Recommended Solution | Files/Components Responsible |
|---|---|---|---|---|---|
| **UI-01** | Architecture / Layout | **Core Analytical Panels Trapped in Modal Palette:** `SummaryBar`, `HotspotPanel`, `DiagnosticsPanel`, `FindingsPanel`, and `ComparePanel` are rendered inside `CommandPalette.tsx` (`max-width: 640px`). Users cannot view findings or hotspots alongside the graph. | **P0** | Extract analytical panels out of `CommandPalette` into dedicated tabbed workspace views or dockable side panels. Command Palette should only trigger view switches or quick actions. | `CommandPalette.tsx`, `App.tsx`, `ViewModeSwitcher.tsx`, `Header.tsx` |
| **UI-02** | Sidebar | **Orphaned Sidebar Component:** `Sidebar.tsx` is completely missing from `App.tsx` shell, leaving component list browsing unavailable outside `CommandPalette`. | **P0** | Mount `Sidebar` in main `App.tsx` layout within a collapsible left drawer/dock, managed by layout state. | `App.tsx`, `Sidebar.tsx`, `index.css` |
| **UI-03** | Sidebar / Layout | **Collapsed Sidebar Layout Width Consumption:** If `Sidebar.tsx` is rendered, returning `null` when `collapsed=true` leaves grid/flex column width reserved or abruptly shifts layout without transition. | **P1** | Use CSS CSS Grid or Flexbox with `width: 0` or CSS transition classes (`sidebar-collapsed`), triggering `cy.resize()` on transition completion. | `Sidebar.tsx`, `index.css`, `GraphView.tsx` |
| **UI-04** | Layout / Canvas | **Graph Space Reclamation Failure:** Closing `InvestigationDrawer` or collapsing sidebar does not immediately update Cytoscape canvas dimensions, leading to stretched nodes or whitespace until window resize. | **P0** | Bind `ResizeObserver` and `transitionend` events on `.graph-pane` and call `cy.resize()` and `fitToScreen()` smoothly. | `GraphView.tsx`, `App.tsx`, `index.css` |
| **UI-05** | Drawer | **Inspector Space Reservation After Closing:** `InvestigationDrawer` uses fixed `width: 400px` in CSS Grid (`grid-template-columns: 1fr auto`). Unmounting leaves empty DOM space if CSS grid template areas are hardcoded. | **P1** | Convert `.app-layout` to flexible CSS Grid (`grid-template-columns: [sidebar] auto [graph] 1fr [drawer] auto`) with explicit open/closed transition states. | `App.tsx`, `InvestigationDrawer.tsx`, `index.css` |
| **UI-06** | Graph Workspace | **Minimap Overlay Space Consumption & Close State:** Minimap overlay (`.minimap-container` / `.cytoscape-navigator`) remains fixed at `bottom: 14px; right: 14px; width: 200px; height: 150px`. Closing it via `×` hides DOM (`display: none`) but `GraphControls` button state is out of sync. | **P1** | Unify minimap visibility state between `GraphView` and `GraphControls`. Move minimap into an expandable floating widget with clean open/close state. | `GraphView.tsx`, `GraphControls.cjs`, `index.css` |
| **UI-07** | Graph Workspace | **Overlapping Floating Controls:** Floating controls (`GraphControls`), Minimap, Hover Cards, and `GraphLegend` compete for bottom-right/bottom-left coordinates, causing visual overlap on smaller viewports. | **P1** | Standardize overlay placement: Top-Right = Viewport Controls, Bottom-Right = Minimap (toggleable), Bottom-Left = Legend (collapsible). Stack with z-index boundaries. | `GraphControls.tsx`, `GraphLegend.tsx`, `GraphView.tsx`, `index.css` |
| **UI-08** | Drawer / Controls | **Inconsistent Collapse & Close Behavior:** Close button (`×`) in `InvestigationDrawer` is disabled when drawer is pinned (`isPinned=true`), forcing users to figure out they must unpin first. | **P1** | Allow close button (`×`) to close drawer directly, automatically updating `isPinned=false` or closing pinned state smoothly. | `InvestigationDrawer.tsx`, `App.tsx` |
| **UI-09** | Sidebar / Controls | **Duplicate Collapse Arrows & Controls:** Duplicate `◀` toggle in `Sidebar.tsx`, header reset buttons vs. graph control reset layout vs. command palette reset. | **P2** | Consolidate controls into standardized icon buttons with unified tooltips and keyboard shortcuts. | `Sidebar.tsx`, `GraphControls.tsx`, `Header.tsx` |
| **UI-010** | Visual System | **Excessive Borders & Visual Clutter:** Almost every card, badge, header, list item, and panel has explicit `1px solid #334155` borders, creating high visual noise and heavy grids. | **P2** | Refactor CSS variables to use subtle background elevation, drop shadows, and borderless card grouping. | `index.css`, `panels.css`, `graph.css` |
| **UI-011** | Visual System | **Excessive Badges & Unclear Hierarchy:** Drawer items render 3-4 badges simultaneously (`Direct/Transitive`, `Impact: N`, `Type`, `Risk: HIGH`), overwhelming row content. | **P2** | Streamline list item meta badges to 1-2 essential indicators (e.g., Risk dot + Impact score). | `InvestigationDrawer.tsx`, `Sidebar.tsx` |
| **UI-012** | State Management | **Poor Panel State Management:** Panel states (finding selection, focus mode, impact analysis, compare mode) are scattered across independent hooks (`useViewState`, `useGraphSelection`, `useCompareState`) with manual sync in `useEffect`. | **P1** | Refactor workspace state into a consolidated state context or reducer (`WorkspaceContext`) managing active view, selection, and overlay panels. | `App.tsx`, `hooks/useViewState.ts`, `context/SelectionContext.tsx` |
| **UI-013** | Workspace | **Invisible / Empty Layout Columns:** When sidebar or drawer is unmounted without grid template column adjustments, browser renders empty layout tracks. | **P1** | Ensure grid template dynamically adapts `grid-template-columns` based on open panel states (`[sidebar] auto [graph] 1fr [drawer] auto`). | `App.tsx`, `index.css` |
| **UI-014** | Header | **Lack of Project & Source Context in Header:** Header displays fixed title "Dependency Explorer" and badge "Salesforce Architecture Explorer" without showing active repository or project name. | **P1** | Add project indicator dropdown / name badge in header (`Header.tsx`) showing active project and source directory. | `Header.tsx`, `App.tsx` |
| **UI-015** | Accessibility | **Accessibility & Keyboard Navigation Deficiencies:** Node keyboard navigation in `GraphView.tsx` uses basic arrow keys but lacks visible focus ring on Cytoscape canvas. Screen reader list (`.sr-only`) is static. | **P2** | Add visible focus outline to canvas container, improve ARIA tree attributes, and ensure all modal panels have trap-focus and escape key handlers. | `GraphView.tsx`, `CommandPalette.tsx`, `InvestigationDrawer.tsx` |
| **UI-016** | Responsive | **Poor Responsive Behavior on Small Screens:** Fixed widths (`400px` drawer, `640px` palette, `200px` minimap) cause horizontal scrolling and overlap on screens < 1024px. | **P2** | Add media queries: on mobile/tablet (< 768px), drawer becomes bottom sheet or full overlay; palette takes 95% width. | `index.css`, `InvestigationDrawer.tsx`, `CommandPalette.tsx` |
| **UI-017** | Hover Cards | **Hover Card Flicker on Link Movement:** Node hover card has `pointer-events: none` on container but `pointer-events: auto` on link, causing rapid mouseover/mouseout toggling when hovering near link. | **P2** | Add padding buffer and debounced mouseout delay to hover card state. | `GraphView.tsx`, `NodeHoverCard.tsx` |
| **UI-018** | Empty / Loading | **Poor Empty & Error State Handling:** No data / fetch error screen is simple text. Empty search in sidebar uses inline hardcoded styles (`style={{ padding: "16px 12px", ... }}`). | **P2** | Move inline styles to CSS modules/classes. Design rich empty states with actionable reset buttons. | `Sidebar.tsx`, `App.tsx`, `index.css` |

---

## 4. Multi-Project Architecture Audit

### 4.1 Current Multi-Project Capabilities vs. Gaps

| Dimension | Current State | Audit Finding / Assessment |
|---|---|---|
| **Data Storage Location** | Single root file `explorer-data.json`, `explorer/public/explorer-data.json`, `analyze/` folder. | **Single-Tenant.** Running analysis on Project B overwrites Project A's artifacts. |
| **Multi-Project Support** | None. System assumes a single repository at `force-app/main/default`. | **Unsupported.** No project ID, no registry, no project metadata schema. |
| **Project Data Leakage** | High. `localStorage` keys (`explorer.drawer.pinned`, `explorer.drawer.detached`) and URL selection parameters do not scope to project ID. | **Risk of Data Mixing.** Switching projects retains selection/node IDs from previous project. |
| **Project Representation** | Implicit. Represented only by string `sourceDirectory` in `explorer-data.json`. | **Inadequate.** Needs explicit `ProjectManifest` model (`id`, `name`, `path`, `sourceHash`, `lastAnalyzed`). |

### 4.2 Multi-Project Architectural Requirements

#### 1. How a Project Should Be Represented
A project should be represented as a discrete entity within a project manifest and contract schema:

```typescript
export interface ProjectMetadata {
  id: string; // Slug, e.g., 'core-crm', 'billing-app'
  name: string; // Human readable title
  sourceDirectory: string; // e.g., 'force-app/main/default'
  repositoryPath?: string;
  generatedAt: string;
  sourceHash: string;
  summary: ExplorerSummary;
}

export interface MultiProjectManifest {
  manifestVersion: '1.0.0';
  activeProjectId: string;
  projects: ProjectMetadata[];
}
```

#### 2. What State Should Be Project-Specific
The following application state must be scoped by `projectId`:
- Active selection (`selectedNodeId`, `selectedEdgeId`)
- Focus state (`focusState`)
- Search & filter state (`filterState`)
- Impact state (`impactState`)
- Investigation drill path & recent node history (`drillPath`, `recentNodeIds`)
- Drawer pinned state (`explorer.${projectId}.drawer.pinned`)
- Drawer detached state (`explorer.${projectId}.drawer.detached`)
- Compare snapshots (`leftSnapshot`, `rightSnapshot`)
- URL state (`?project=core-crm&node=ApexClass:Foo`)

#### 3. How Project Switching Should Work
1. User selects a project from `Header` dropdown or command palette.
2. `ProjectContext` updates `activeProjectId`.
3. URL updates to `?project=[projectId]`.
4. Selection context and workspace states clear/reset.
5. `useExplorerData` fetches project-specific data (`/data/projects/[projectId]/explorer-data.json`).
6. Cytoscape graph clears, rebuilds elements, runs layout, and performs `fitToScreen()`.

#### 4. How Analysis Results Should Be Separated
- Output directory structure:
  ```
  analyze/
  ├── projects/
  │   ├── core-crm/
  │   │   ├── dependency-report.json
  │   │   └── explorer-data.json
  │   └── billing-app/
  │       ├── dependency-report.json
  │       └── explorer-data.json
  └── project-manifest.json
  ```
- Adapter script support: `node scripts/export-explorer.cjs --project core-crm --input analyze/projects/core-crm`

#### 5. Files Required to Change for Project Isolation

1. `scripts/export-explorer.cjs`: Update adapter to accept `--project-id` and write to project-isolated directories and project manifest.
2. `scripts/run-explorer.cjs`: Update workflow runner to support `--project` CLI argument.
3. `explorer/src/types/explorer.ts`: Add `ProjectMetadata` and `MultiProjectManifest` interfaces.
4. `explorer/src/hooks/useExplorerData.ts`: Accept `projectId` argument and fetch project-scoped data contracts.
5. `explorer/src/context/ProjectContext.tsx`: Create new project context managing project list, active project, and switching.
6. `explorer/src/hooks/useViewState.ts`: Scope URL parameter sync and `localStorage` keys with `projectId`.
7. `explorer/src/components/Header.tsx`: Add `ProjectSelector` dropdown component.

---

## 5. Proposed Ownership Boundaries & Parallel Implementation

To allow safe, concurrent implementation across engineering teams without merge conflicts or regressions, work is divided into 4 isolated workstreams:

```
+-----------------------------------------------------------------------------------+
| WORKSTREAM A: Shell, Layout & Panel Integration (UI Architecture & Grid)           |
| Files: App.tsx, index.css, ViewModeSwitcher.tsx, Sidebar.tsx                      |
+-----------------------------------------------------------------------------------+
| WORKSTREAM B: Graph Workspace, Overlays & Controls (Cytoscape Canvas & Controls)   |
| Files: GraphView.tsx, GraphControls.tsx, GraphLegend.tsx, graph.css                |
+-----------------------------------------------------------------------------------+
| WORKSTREAM C: Inspector, Panels & Visual System Hardening (Drawer & Panels)        |
| Files: InvestigationDrawer.tsx, FindingsPanel.tsx, HotspotPanel.tsx, panels.css  |
+-----------------------------------------------------------------------------------+
| WORKSTREAM D: Multi-Project Engine & State Isolation (Multi-Project & Data)        |
| Files: export-explorer.cjs, run-explorer.cjs, useExplorerData.ts, Header.tsx      |
+-----------------------------------------------------------------------------------+
```

### Workstream Detail & Boundaries

#### Workstream A: Shell, Layout & Panel Integration
- **Owner:** Frontend Layout Lead
- **Scope:** Main app shell layout, grid tracks, tab/workspace view switcher, sidebar mounting.
- **Components/Files:** `explorer/src/App.tsx`, `explorer/src/index.css`, `explorer/src/components/Sidebar.tsx`, `explorer/src/components/ViewModeSwitcher.tsx`, `explorer/src/components/CommandPalette.tsx`.
- **Key Task:** Extract analytical panels (`SummaryBar`, `Hotspots`, `Findings`, `Diagnostics`, `Compare`) from `CommandPalette.tsx` into primary workspace tabs or side dockable panels; mount `Sidebar` in main shell.

#### Workstream B: Graph Workspace & Overlay Controls
- **Owner:** Cytoscape / Visualization Engineer
- **Scope:** Cytoscape graph canvas, floating overlay alignment, minimap toggle sync, graph resize observers.
- **Components/Files:** `explorer/src/components/GraphView.tsx`, `explorer/src/components/GraphControls.tsx`, `explorer/src/components/GraphLegend.tsx`, `explorer/src/components/graph-internals/`.
- **Key Task:** Fix graph resize reclamation, standardize floating control positions (Top-Right = Controls, Bottom-Right = Minimap, Bottom-Left = Legend), fix hover card link flicker.

#### Workstream C: Inspector Drawer & Visual System
- **Owner:** UI Component Engineer
- **Scope:** `InvestigationDrawer` fixes, close/pin behavior, visual hierarchy, badge consolidation, CSS cleanup.
- **Components/Files:** `explorer/src/components/InvestigationDrawer.tsx`, `explorer/src/components/findings/FindingsPanel.tsx`, `explorer/src/components/HotspotPanel.tsx`, `explorer/src/components/panels/panels.css`.
- **Key Task:** Fix pinned drawer close button behavior, remove inline styles, streamline badge counts, clean up borders and dark contrast.

#### Workstream D: Multi-Project Isolation & State Engine
- **Owner:** Data Architecture Lead
- **Scope:** Data contract multi-project schema, project switching, `ProjectContext`, project-scoped `localStorage`/URL sync, CLI export update.
- **Components/Files:** `scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `explorer/src/types/explorer.ts`, `explorer/src/hooks/useExplorerData.ts`, `explorer/src/hooks/useViewState.ts`, `explorer/src/components/Header.tsx`.
- **Key Task:** Implement multi-project manifest, update adapter scripts to export project-isolated data, add `ProjectSelector` to `Header.tsx`.

---

## 6. Dependencies Between Workstreams

```
┌────────────────────────────────────────────────────────────────┐
│ Workstream D: Multi-Project Engine & Data Contract Schema      │
│ (Defines ProjectMetadata & ProjectContext)                     │
└───────────────────────────────┬────────────────────────────────┘
                                │ (Provides ProjectContext & Header Selector)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│ Workstream A: Shell Layout, Main Grid & Workspace Views       │
│ (Mounts Sidebar, Workspace Tabs, Layout Grid Tracks)          │
└───────────────┬────────────────────────────────┬───────────────┘
                │                                │
                ▼                                ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Workstream B: Graph Workspace│  │ Workstream C: Inspector      │
│ & Canvas Resize Observers    │  │ Drawer & Visual System       │
└──────────────────────────────┘  └──────────────────────────────┘
```

1. **Workstream D ──▶ Workstream A:** Workstream A requires `ProjectContext` from Workstream D to display project context in Header and trigger layout resets on project switch.
2. **Workstream A ──▶ Workstream B:** Workstream B needs Workstream A's CSS grid track definitions to attach `ResizeObserver` and `transitionend` handlers for smooth graph resizing.
3. **Workstream A ──▶ Workstream C:** Workstream C relies on Workstream A's panel layout structure to position dockable panels or drawers cleanly.

---

## 7. Risks & Mitigation Strategies

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Graph Stretched/Squished on Panel Toggle** | Medium | Workstream B must listen to `transitionend` events on `.graph-pane` and trigger `cy.resize()` and `cy.fit()`. |
| **Breaking Existing CLI or Test Contracts** | High | Keep default non-project export fallback (`explorer-data.json`) in `scripts/export-explorer.cjs` for backward compatibility with existing tests. |
| **State Desynchronization on Project Switch** | High | Workstream D must implement a single `resetWorkspaceState()` method in `ProjectContext` that flushes selection, drill paths, and URL params upon project change. |
| **Modal Focus Lock in Command Palette** | Low | Ensure `CommandPalette.tsx` keyboard listener handles Escape key cleanly without blocking background graph shortcuts when closed. |

---

## 8. Proposed Parallel Execution Plan

### Phase 1: Foundation & Data Isolation (Days 1–2)
- **Workstream D:** Update `scripts/export-explorer.cjs` and `scripts/run-explorer.cjs` to generate `project-manifest.json` and project-scoped explorer data. Create `ProjectContext.tsx` and update `useExplorerData.ts`.
- **Workstream A:** Audit and prepare CSS Grid tracks in `index.css` for dynamic panel slots (`[sidebar] auto [graph] 1fr [drawer] auto`).

### Phase 2: Main Workspace & Panel Extraction (Days 3–4)
- **Workstream A:** Extract `SummaryBar`, `Hotspots`, `Findings`, `Diagnostics`, and `Compare` from `CommandPalette.tsx` into top-level workspace tabs/views. Mount `Sidebar.tsx` in left dock.
- **Workstream B:** Refactor `GraphControls.tsx`, `GraphLegend.tsx`, and `GraphView.tsx` overlays. Attach `ResizeObserver` for graph canvas auto-resizing.
- **Workstream C:** Refactor `InvestigationDrawer.tsx` close/pin behavior and streamline badge counts. Clean up CSS borders in `panels.css`.

### Phase 3: Integration, Accessibility & Responsive Polish (Days 5–6)
- **Workstream D & A:** Connect `Header.tsx` project selector to `ProjectContext`.
- **Workstream B & C:** Test Cytoscape layout resizing during panel collapses/expansions.
- **All Workstreams:** Apply responsive media queries, verify keyboard accessibility (`⌘K`, Escape, Arrow keys), and run test suites (`npm run test:cli`, `cd explorer && npm test`).

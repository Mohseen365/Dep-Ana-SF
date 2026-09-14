# Authoritative File Ownership Contract

## Executive Overview
This document defines the strict, non-overlapping file-ownership boundaries for parallel execution of all upcoming UI/UX and multi-project implementation phases (2A through 2I).

### Core Rule of Ownership
To guarantee that multiple parallel AI agents or engineering workstreams do not create merge conflicts, overwrite work, or break system invariants:
1. **A file MUST NOT have multiple parallel owners.**
2. Every relevant repository file is classified as exactly one of:
   - **OWNED BY ONE PHASE** (Exclusive right to modify)
   - **SHARED / INTEGRATION ONLY** (Frozen during parallel work; modified only during final integration)
   - **READ-ONLY DEPENDENCY** (Read allowed; modification strictly forbidden)

---

## 1. Master File Ownership Contract Table

| File Path | Owner / Classification | Allowed Responsibility | Other Phases Access |
|---|---|---|---|
| `explorer/src/App.tsx` | **SHARED / INTEGRATION ONLY** | Main layout shell composition and provider wiring | Read-Only for 2A-2I |
| `explorer/src/main.tsx` | **SHARED / INTEGRATION ONLY** | Application root mount | Read-Only for 2A-2I |
| `explorer/src/index.css` | **Phase 2A** | App layout grid, container CSS, CSS custom properties, dead space elimination | Read-Only for 2B-2I |
| `explorer/src/components/Header.tsx` | **Phase 2F** | Top navigation, header actions, shortcut hints | Read-Only for 2A-2E, 2G-2I |
| `explorer/src/components/Header.test.tsx` | **Phase 2F** | Unit tests for Header | Read-Only for 2A-2E, 2G-2I |
| `explorer/src/components/Sidebar.tsx` | **Phase 2C** | Component list sidebar container and toggle | Read-Only for 2A, 2B, 2D-2I |
| `explorer/src/components/SearchFilterPanel.tsx` | **Phase 2C** | Search and filter controls inside sidebar | Read-Only for 2A, 2B, 2D-2I |
| `explorer/src/components/GraphView.tsx` | **Phase 2B** | Cytoscape graph canvas, resize handling, canvas events | Read-Only for 2A, 2C-2I |
| `explorer/src/components/GraphView.test.tsx` | **Phase 2B** | GraphView component tests | Read-Only for 2A, 2C-2I |
| `explorer/src/components/GraphControls.tsx` | **Phase 2B** | Floating canvas zoom, fit, reset, and navigator controls | Read-Only for 2A, 2C-2I |
| `explorer/src/components/GraphControls.test.tsx` | **Phase 2B** | GraphControls component tests | Read-Only for 2A, 2C-2I |
| `explorer/src/components/GraphLegend.tsx` | **Phase 2B** | Floating graph color/risk legend overlay | Read-Only for 2A, 2C-2I |
| `explorer/src/components/graph-internals/NodeHoverCard.tsx` | **Phase 2B** | Graph node hover tooltip card | Read-Only for 2A, 2C-2I |
| `explorer/src/components/graph-internals/EdgeHoverCard.tsx` | **Phase 2B** | Graph edge hover tooltip card | Read-Only for 2A, 2C-2I |
| `explorer/src/components/graph-internals/graph.css` | **Phase 2B** | Cytoscape and canvas internal styling | Read-Only for 2A, 2C-2I |
| `explorer/src/components/InvestigationDrawer.tsx` | **Phase 2D** | Component inspector drawer, drill path, pinning, detaching | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/InvestigationDrawer.test.tsx` | **Phase 2D** | InvestigationDrawer unit tests | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/Breadcrumbs.tsx` | **Phase 2D** | Drill path breadcrumb navigation component | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/Breadcrumbs.test.tsx` | **Phase 2D** | Breadcrumbs unit tests | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/findings/FindingsPanel.tsx` | **Phase 2E** | Architecture rule findings list and resolution | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/findings/findings.css` | **Phase 2E** | Findings panel styling | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/FindingsPanel.test.tsx` | **Phase 2E** | FindingsPanel unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/HotspotPanel.tsx` | **Phase 2E** | Hotspots and refactoring readiness panel | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/HotspotPanel.test.tsx` | **Phase 2E** | HotspotPanel unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/ImpactControls.tsx` | **Phase 2E** | Blast radius and impact analysis controls | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/ImpactControls.test.tsx` | **Phase 2E** | ImpactControls unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/ComparePanel.tsx` | **Phase 2E** | Architecture snapshot diff viewer | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/ComparePanel.test.tsx` | **Phase 2E** | ComparePanel unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/DiagnosticsPanel.tsx` | **Phase 2E** | Circular dependencies and unresolved references panel | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/DiagnosticsPanel.test.tsx` | **Phase 2E** | DiagnosticsPanel unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/SummaryBar.tsx` | **Phase 2E** | Health metrics summary counter bar | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/SummaryBar.test.tsx` | **Phase 2E** | SummaryBar unit tests | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/panels/panels.css` | **Phase 2E** | Panel-specific CSS styles | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/CommandPalette.tsx` | **Phase 2F** | Search palette & command execution modal | Read-Only for 2A-2E, 2G-2I |
| `explorer/src/components/CommandPalette.test.tsx` | **Phase 2F** | CommandPalette unit tests | Read-Only for 2A-2E, 2G-2I |
| `explorer/src/components/FocusControls.tsx` | **Phase 2B** | Neighborhood focus depth controls | Read-Only for 2A, 2C-2I |
| `explorer/src/components/RefactorHandoffModal.tsx` | **Phase 2D** | Refactor handoff confirmation modal | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/RefactorHandoffModal.test.tsx` | **Phase 2D** | RefactorHandoffModal unit tests | Read-Only for 2A-2C, 2E-2I |
| `explorer/src/components/StatusBar.tsx` | **Phase 2A** | Bottom viewport status indicator bar | Read-Only for 2B-2I |
| `explorer/src/components/HealthSummary.tsx` | **Phase 2E** | Overall health score summary component | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/components/ViewModeSwitcher.tsx` | **Phase 2A** | Main workspace view mode toggle bar | Read-Only for 2B-2I |
| `explorer/src/components/ProjectSelector.tsx` | **Phase 2G** | *(New Component)* Salesforce project selector dropdown | Read-Only for 2A-2F, 2H-2I |
| `explorer/src/components/ProjectCreationModal.tsx` | **Phase 2G** | *(New Component)* New Salesforce project registration modal | Read-Only for 2A-2F, 2H-2I |
| `explorer/src/components/ProjectDashboard.tsx` | **Phase 2H** | *(New Component)* Multi-project portfolio overview dashboard | Read-Only for 2A-2G, 2I |
| `explorer/src/context/SelectionContext.tsx` | **Phase 2A** | Graph selection context provider | Read-Only for 2B-2I |
| `explorer/src/context/ProjectContext.tsx` | **Phase 2G** | *(New Context)* Multi-project state context provider | Read-Only for 2A-2F, 2H-2I |
| `explorer/src/hooks/useExplorerData.ts` | **Phase 2G** | Data contract loading hook (project-aware) | Read-Only for 2A-2F, 2H-2I |
| `explorer/src/hooks/useViewState.ts` | **Phase 2A** | View mode, focus, and URL query parameter sync | Read-Only for 2B-2I |
| `explorer/src/hooks/useGraphSelection.ts` | **Phase 2A** | Selection hook wrapper | Read-Only for 2B-2I |
| `explorer/src/hooks/useCommandPalette.ts` | **Phase 2F** | Command palette keyboard & modal state hook | Read-Only for 2A-2E, 2G-2I |
| `explorer/src/hooks/useCompareState.ts` | **Phase 2E** | Snapshot comparison state hook | Read-Only for 2A-2D, 2F-2I |
| `explorer/src/hooks/useUserPreferences.ts` | **Phase 2I** | User preference persistence hook | Read-Only for 2A-2H |
| `explorer/src/types/explorer.ts` | **Phase 2G** | Shared data schema and project contract types | Read-Only for 2A-2F, 2H-2I |
| `scripts/export-explorer.cjs` | **Phase 2G** | Explorer data adapter script | Read-Only for 2A-2F, 2H-2I |
| `scripts/run-explorer.cjs` | **Phase 2G** | Workflow runner script | Read-Only for 2A-2F, 2H-2I |
| `dependency-analyzer.cjs` | **READ-ONLY DEPENDENCY** | Authoritative core analyzer engine | **READ-ONLY FOR ALL PHASES** |

---

## 2. Phase-by-Phase Ownership Boundaries

### Phase 2A — Layout / Sidebar / Dead Space
* **Purpose:** Refactor layout grid, eliminate invisible column gaps, fix space reclamation upon panel toggles, and construct clean workspace view containers.
* **Owned files:**
  - `explorer/src/index.css`
  - `explorer/src/components/StatusBar.tsx`
  - `explorer/src/components/ViewModeSwitcher.tsx`
  - `explorer/src/context/SelectionContext.tsx`
  - `explorer/src/hooks/useViewState.ts`
  - `explorer/src/hooks/useGraphSelection.ts`
* **Read-only files:**
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/components/Sidebar.tsx`
  - `explorer/src/components/InvestigationDrawer.tsx`
  - `explorer/src/types/explorer.ts`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
  - `scripts/export-explorer.cjs`
  - `explorer/src/components/GraphView.tsx`
* **Dependencies:** None (Foundation phase).
* **Potential conflicts:** Grid track changes in `index.css` could affect drawer positioning if class names change without communication.
* **Expected outputs:** CSS Grid system with zero reserved dead space when panels are collapsed; `useViewState` hook capable of driving view modes.

---

### Phase 2B — Graph Workspace / Navigator
* **Purpose:** Fix Cytoscape canvas auto-resizing, standardize floating overlay positioning (Top-Right = Controls, Bottom-Right = Minimap, Bottom-Left = Legend), and resolve hover card link flicker.
* **Owned files:**
  - `explorer/src/components/GraphView.tsx`
  - `explorer/src/components/GraphView.test.tsx`
  - `explorer/src/components/GraphControls.tsx`
  - `explorer/src/components/GraphControls.test.tsx`
  - `explorer/src/components/GraphLegend.tsx`
  - `explorer/src/components/FocusControls.tsx`
  - `explorer/src/components/graph-internals/NodeHoverCard.tsx`
  - `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
  - `explorer/src/components/graph-internals/graph.css`
* **Read-only files:**
  - `explorer/src/lib/graph-builder.ts`
  - `explorer/src/lib/graph-interactions.ts`
  - `explorer/src/lib/graph-layout.ts`
  - `explorer/src/lib/graph-style.ts`
  - `explorer/src/index.css`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
  - `explorer/src/lib/graph-builder.ts` (Graph semantics freeze)
* **Dependencies:** Phase 2A (Requires layout CSS container classes).
* **Potential conflicts:** Minimap `display: none` DOM toggling vs state property synchronization in `GraphControls`.
* **Expected outputs:** Clean Cytoscape canvas that automatically calls `cy.resize()` on viewport changes without overlay collisions.

---

### Phase 2C — Component Sidebar
* **Purpose:** Mount `Sidebar.tsx` into the main application layout, implement collapsible dock behavior, and provide component search and filtering.
* **Owned files:**
  - `explorer/src/components/Sidebar.tsx`
  - `explorer/src/components/SearchFilterPanel.tsx`
* **Read-only files:**
  - `explorer/src/lib/search-filter.ts`
  - `explorer/src/types/explorer.ts`
  - `explorer/src/index.css`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
  - `explorer/src/hooks/useViewState.ts`
* **Dependencies:** Phase 2A (Requires grid container slot for sidebar).
* **Potential conflicts:** Search filter state updates competing with global URL query parameters.
* **Expected outputs:** Functional left sidebar tree component that smoothly collapses without leaving empty layout space.

---

### Phase 2D — Inspector / Investigation Drawer
* **Purpose:** Refactor `InvestigationDrawer` close and pin interactions, clean up breadcrumbs/recent lists, and standardize refactor handoff confirmation.
* **Owned files:**
  - `explorer/src/components/InvestigationDrawer.tsx`
  - `explorer/src/components/InvestigationDrawer.test.tsx`
  - `explorer/src/components/Breadcrumbs.tsx`
  - `explorer/src/components/Breadcrumbs.test.tsx`
  - `explorer/src/components/RefactorHandoffModal.tsx`
  - `explorer/src/components/RefactorHandoffModal.test.tsx`
* **Read-only files:**
  - `explorer/src/lib/drill.ts`
  - `explorer/src/lib/detached-drawer.ts`
  - `explorer/src/lib/refactor-handoff.ts`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
* **Dependencies:** Phase 2A (Requires right drawer grid track).
* **Potential conflicts:** Drawer pin state vs close button disabled property logic.
* **Expected outputs:** Polished inspection drawer that closes directly (auto-unpinning) and presents streamlined badges.

---

### Phase 2E — Findings / Hotspots / Impact / Compare
* **Purpose:** Extract core analytical panels (`FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel`, `SummaryBar`, `HealthSummary`) out of modal popups into dedicated workspace views.
* **Owned files:**
  - `explorer/src/components/findings/FindingsPanel.tsx`
  - `explorer/src/components/findings/findings.css`
  - `explorer/src/components/FindingsPanel.test.tsx`
  - `explorer/src/components/HotspotPanel.tsx`
  - `explorer/src/components/HotspotPanel.test.tsx`
  - `explorer/src/components/ImpactControls.tsx`
  - `explorer/src/components/ImpactControls.test.tsx`
  - `explorer/src/components/ComparePanel.tsx`
  - `explorer/src/components/ComparePanel.test.tsx`
  - `explorer/src/components/DiagnosticsPanel.tsx`
  - `explorer/src/components/DiagnosticsPanel.test.tsx`
  - `explorer/src/components/SummaryBar.tsx`
  - `explorer/src/components/SummaryBar.test.tsx`
  - `explorer/src/components/HealthSummary.tsx`
  - `explorer/src/components/HealthSummary.test.tsx`
  - `explorer/src/components/panels/panels.css`
  - `explorer/src/hooks/useCompareState.ts`
* **Read-only files:**
  - `explorer/src/lib/intelligence/index.ts`
  - `explorer/src/lib/impact-analysis.ts`
  - `explorer/src/types/explorer.ts`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
  - `explorer/src/components/CommandPalette.tsx` (Read-only reference for command triggers)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
  - `explorer/src/lib/intelligence/rules/`
* **Dependencies:** Phase 2A (Requires view mode state and tab layout tracks).
* **Potential conflicts:** Panel styles clashing with global CSS variables.
* **Expected outputs:** Standalone analytical panels suitable for full-screen workspace rendering outside of modal overlays.

---

### Phase 2F — Header / Search / Navigation
* **Purpose:** Refactor header actions, build unified command palette trigger (`⌘K`), and streamline global navigation shortcuts.
* **Owned files:**
  - `explorer/src/components/Header.tsx`
  - `explorer/src/components/Header.test.tsx`
  - `explorer/src/components/CommandPalette.tsx`
  - `explorer/src/components/CommandPalette.test.tsx`
  - `explorer/src/hooks/useCommandPalette.ts`
  - `explorer/src/hooks/useCommandPalette.test.ts`
* **Read-only files:**
  - `explorer/src/lib/search-filter.ts`
  - `explorer/src/types/explorer.ts`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
* **Dependencies:** Phase 2E (Command palette delegates panel rendering to top-level view modes).
* **Potential conflicts:** Keyboard shortcut collision (`⌘K` vs browser default / Cytoscape hotkeys).
* **Expected outputs:** Fast, lightweight command palette focusing on quick navigation and command actions rather than housing heavy nested panels.

---

### Phase 2G — Project Selector / Project Creation
* **Purpose:** Build the multi-project foundation, project selector dropdown, project creation modal, data contract schema updates, and project-aware export adapter scripts.
* **Owned files:**
  - `explorer/src/components/ProjectSelector.tsx` *(New)*
  - `explorer/src/components/ProjectCreationModal.tsx` *(New)*
  - `explorer/src/context/ProjectContext.tsx` *(New)*
  - `explorer/src/hooks/useExplorerData.ts`
  - `explorer/src/hooks/useExplorerData.test.ts`
  - `explorer/src/types/explorer.ts`
  - `scripts/export-explorer.cjs`
  - `scripts/run-explorer.cjs`
* **Read-only files:**
  - `dependency-analyzer.cjs`
* **Shared/integration files:**
  - `explorer/src/components/Header.tsx` (Integrates ProjectSelector)
  - `explorer/src/App.tsx` (Wraps with ProjectProvider)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
* **Dependencies:** None (Can run in parallel with 2A-2F).
* **Potential conflicts:** Backwards compatibility with existing single-file `explorer-data.json` test fixtures.
* **Expected outputs:** ProjectContext and export scripts supporting isolated project datasets (`/data/projects/[projectId]/explorer-data.json`).

---

### Phase 2H — Project Dashboard
* **Purpose:** Construct multi-project portfolio overview dashboard displaying repository comparison metrics, health scores, and cross-project analysis summary.
* **Owned files:**
  - `explorer/src/components/ProjectDashboard.tsx` *(New)*
* **Read-only files:**
  - `explorer/src/context/ProjectContext.tsx`
  - `explorer/src/types/explorer.ts`
* **Shared/integration files:**
  - `explorer/src/App.tsx` (Final integration only)
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
* **Dependencies:** Phase 2G (Requires `ProjectContext` and project metadata schema).
* **Potential conflicts:** Portfolio summary calculations conflicting with single-project metrics.
* **Expected outputs:** Responsive dashboard component summarizing multi-project health and risk distribution.

---

### Phase 2I — Responsive / Accessibility
* **Purpose:** Implement mobile/tablet media queries (<1024px, <768px), ARIA landmarks, visible focus rings, and high-contrast accessibility modes.
* **Owned files:**
  - `explorer/src/hooks/useUserPreferences.ts`
* **Read-only files:**
  - All component files across 2A-2H
* **Shared/integration files:**
  - `explorer/src/index.css` (Integration phase stylesheet additions)
  - `explorer/src/App.tsx`
* **Files that MUST NOT be modified:**
  - `dependency-analyzer.cjs`
* **Dependencies:** Phases 2A through 2H.
* **Potential conflicts:** Focus outline styling interfering with Cytoscape node selection highlights.
* **Expected outputs:** High-contrast CSS rules, tablet/mobile layout breakpoints, and accessibility enhancements across all views.

---

## 3. Specific File Categorizations

### 3.1 Global JS Files
- `explorer/src/main.tsx`
- `explorer/src/detached.tsx`

### 3.2 Global CSS Files
- `explorer/src/index.css`
- `explorer/src/components/panels/panels.css`
- `explorer/src/components/findings/findings.css`
- `explorer/src/components/graph-internals/graph.css`

### 3.3 Shared Components
- `explorer/src/components/ErrorBoundary.tsx`
- `explorer/src/components/Breadcrumbs.tsx`
- `explorer/src/components/RefactorHandoffModal.tsx`

### 3.4 Application Entry Points
- `explorer/index.html`
- `explorer/src/main.tsx`
- `explorer/src/App.tsx`

### 3.5 State-Management Files
- `explorer/src/context/SelectionContext.tsx`
- `explorer/src/context/ProjectContext.tsx` *(New)*
- `explorer/src/hooks/useViewState.ts`
- `explorer/src/hooks/useGraphSelection.ts`
- `explorer/src/hooks/useCompareState.ts`
- `explorer/src/hooks/useCommandPalette.ts`

### 3.6 Routing / Navigation Files
- `explorer/src/hooks/useViewState.ts`
- `explorer/src/lib/url/index.ts`
- `explorer/src/lib/url/filterQuery.ts`
- `explorer/src/lib/url/investigationQuery.ts`

### 3.7 Project / Data-Storage Files
- `explorer/src/types/explorer.ts`
- `explorer/src/hooks/useExplorerData.ts`
- `scripts/export-explorer.cjs`
- `scripts/run-explorer.cjs`

### 3.8 Cytoscape Files
- `explorer/src/components/GraphView.tsx`
- `explorer/src/lib/graph-builder.ts`
- `explorer/src/lib/graph-interactions.ts`
- `explorer/src/lib/graph-layout.ts`
- `explorer/src/lib/graph-style.ts`

### 3.9 Integration-Only Files (Modified strictly during final integration)
- `explorer/src/App.tsx`
- `explorer/src/main.tsx`

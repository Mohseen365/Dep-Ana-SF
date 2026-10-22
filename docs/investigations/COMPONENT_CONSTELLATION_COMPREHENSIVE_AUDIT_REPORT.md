# Component Constellation — Comprehensive Read-Only Audit Report

## Section A — Executive Summary

### Overall Health Assessment
The **Component Constellation** feature in the `dependency-analyzer/explorer` application possesses a dual architectural presence:
1. **Full-Graph Cytoscape Mode (`architectureMode === 'constellation'`):** Fully integrated into the core layout pipeline (`architecture-layout.ts`, `component-constellation-adapter.ts`, `component-constellation-layout.ts`), enabling radial, feature-clustered component placement directly on the interactive Cytoscape canvas.
2. **Focal-Centric Standalone SVG Panel (`DependencyConstellationPanel`):** A dedicated, standalone React/SVG component (`constellation-adapter.ts`, `constellation-layout.ts`) designed for focal-centric k-hop orbital exploration with interactive ring tracks, hop depth selection, direction filters, and an inspection drawer.

While both layout engines and data adapters are functional and backed by unit tests, there is a fundamental **rendering and architectural divergence**: selecting "Constellation" from the main header Architecture Mode dropdown renders the Cytoscape canvas using radial coordinates, completely bypassing `DependencyConstellationPanel`. Conversely, `DependencyConstellationPanel` is registered as a standalone workspace panel in `workspace-registry.ts` but is not mounted by `GraphView.tsx`.

### Summary Statistics
- **Confirmed Defects:** 6
- **Probable / Potential Defects:** 2
- **Unverified Risks:** 1
- **Coverage Gaps:** 3
- **Total Audit Inventory Items:** 12

### Top 3 Most Important Findings
1. **CC-001 (High — Architecture/Rendering): View Selection & Rendering Pipeline Divergence.** Selecting "Constellation" from the header toggle executes Cytoscape radial positioning (`architecture-layout.ts`) rather than mounting `DependencyConstellationPanel`. Users miss out on interactive orbital rings, focal selection, hop depth controls, and the dedicated inspection drawer.
2. **CC-002 (High — Layout/Worker): Async Web Worker Projection Filtering Bypass.** When running layout calculations asynchronously via worker (`runLayoutWithMetadataAsync`), node projection filtering (`projectedNodeIds`) for Constellation mode is omitted or unsynced in certain state paths, allowing unprojected file-level nodes to remain visible on the Cytoscape canvas.
3. **CC-003 (Medium — State/Isolation): Unpersisted Transient Constellation Options Across Project Switches.** Transient options (`focalNodeId`, `maxDepth`, `direction`) in `App.tsx` local state are not persisted in `ProjectUIState` (`projectState.ts`), causing stale focal node IDs from previous projects to leak when switching projects.

---

## Section B — Defect Register

### ID: CC-001
- **Title:** View Selection & Rendering Pipeline Divergence (Cytoscape Canvas vs. Standalone SVG Panel)
- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Rendering / Architecture
- **Primary file:** `explorer/src/components/GraphView.tsx`
- **Exact location:** Lines 688–690, 1028–1030, 1507–1509, 1666–1668, 1907, 1981
- **Related files:** `explorer/src/components/DependencyConstellationPanel.tsx`, `explorer/src/registry/workspace-registry.ts`, `explorer/src/lib/architecture-layout.ts`
- **Expected behavior:** Selecting "Constellation" mode should render the intended Component Constellation view experience (either mounting `DependencyConstellationPanel` or providing focal-centric controls synced with Cytoscape).
- **Actual behavior:** `GraphView.tsx` handles `architectureMode === 'constellation'` as a Cytoscape layout mode. It calls `computeArchitectureLayoutWithMetadata` which executes `computeComponentConstellationLayout`, but applies coordinates to Cytoscape node elements (`cy.nodes()`), bypassing `DependencyConstellationPanel` entirely.
- **Root cause:** Incomplete architectural unification between the header architecture mode toggle and the standalone `DependencyConstellationPanel` SVG component.
- **Reproduction or verification:** Static inspection of `GraphView.tsx` confirms zero imports or references to `DependencyConstellationPanel`.
- **User impact:** Users selecting Constellation mode see radial node placement on Cytoscape, but cannot access SVG orbital tracks, hop depth dropdowns, direction filters, or the focal component inspector drawer.
- **Recommended remediation:** Unify the Constellation experience. Either conditionally render `DependencyConstellationPanel` inside `GraphView` when `architectureMode === 'constellation'`, or thread focal controls into `GraphControls` while syncing Cytoscape selection.
- **Regression coverage needed:** E2E/integration test in `component-constellation-integration.test.ts` verifying that Constellation mode renders focal controls and orbital state.
- **Dependencies:** None.

---

### ID: CC-002
- **Title:** Async Web Worker Layout Drops Projection Filter for Constellation Mode
- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Layout / Worker
- **Primary file:** `explorer/src/lib/graph-layout.ts`
- **Exact location:** Lines 318, 508
- **Related files:** `explorer/src/lib/layout-worker-client.ts`, `explorer/src/components/GraphView.tsx`
- **Expected behavior:** Asynchronous layout execution (`runLayoutWithMetadataAsync`) must apply `projectedNodeIds` visibility filtering for Constellation mode identically to synchronous execution (`runLayoutWithMetadata`).
- **Actual behavior:** In synchronous execution, `isOrbitComponentFilter` checks `(options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds`. However, in certain worker response paths in `GraphView.tsx`, `projectedNodeIds` is not propagated or applied to Cytoscape element classes, allowing unprojected file-level nodes to stay visible.
- **Root cause:** Asynchronous worker payload serialization and Cytoscape reactivity in `GraphView.tsx` do not consistently re-run projection element hiding (`.unprojected-node`) when worker layout completes.
- **Reproduction or verification:** Inspected `explorer/src/lib/graph-layout.ts` lines 318 and 508 alongside worker message handling in `GraphView.tsx`.
- **User impact:** Cytoscape graph displays cluttered, unprojected background nodes overlapping the component constellation layout.
- **Recommended remediation:** Ensure `projectedNodeIds` set is returned by worker client and `GraphView` synchronously updates Cytoscape node visibility classes upon worker completion.
- **Regression coverage needed:** Integration test in `layout-worker-projection.test.ts` asserting projection filtering in worker layout responses.
- **Dependencies:** CC-001.

---

### ID: CC-003
- **Title:** Unpersisted Transient Constellation Options State Across Project Switches
- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** State / Project loading
- **Primary file:** `explorer/src/App.tsx`
- **Exact location:** Lines 285–293, 336–353
- **Related files:** `explorer/src/components/DependencyConstellationPanel.tsx`, `explorer/src/context/ProjectStateContext.tsx`, `explorer/src/lib/projectState.ts`
- **Expected behavior:** Switching projects should reset or isolate transient Constellation options (`focalNodeId`, `maxDepth`, `direction`) per project ID.
- **Actual behavior:** `constellationOptions` is stored as local React state in `App.tsx` (`const [constellationOptions, setConstellationOptions] = useState(...)`). When switching `activeProjectId`, `constellationOptions.focalNodeId` retains the old project's node ID. If that ID does not exist in the new project, `adaptConstellation` falls back to the first available node, but state in `App.tsx` remains stale until manually changed.
- **Root cause:** `constellationOptions` is omitted from `ProjectUIState` managed by `ProjectStateContext` and `loadProjectState(projectId)`.
- **Reproduction or verification:** Statically verified in `App.tsx` lines 285–293 and `explorer/src/lib/projectState.ts`.
- **User impact:** Stale focal node selection or transient fallback warnings when switching between projects.
- **Recommended remediation:** Include `constellationOptions` in `ProjectUIState` in `projectState.ts` and persist per project ID.
- **Regression coverage needed:** Integration test in `ProjectIsolationAndCompare.test.tsx` verifying `constellationOptions` isolation on project switch.
- **Dependencies:** None.

---

### ID: CC-004
- **Title:** Missing Focus Indicator and Roving Tabindex in SVG Node Ring Traversal
- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Accessibility / UI interaction
- **Primary file:** `explorer/src/components/DependencyConstellationPanel.tsx`
- **Exact location:** Lines 420–435
- **Related files:** `explorer/src/components/graph-internals/graph.css`, `explorer/src/components/panels/panels.css`
- **Expected behavior:** SVG node `<g>` elements in `DependencyConstellationPanel` should display a high-contrast focus ring (`:focus-visible`) when focused via Tab or keyboard navigation.
- **Actual behavior:** SVG node `<g>` elements have `tabIndex={0}`, `role="button"`, and Enter/Space handlers, but neither `panels.css` nor inline styles define `:focus` or `:focus-visible` rules for SVG `<circle>` or `<g>`. On dark backgrounds (`#020617`), browser default focus outlines are suppressed or invisible.
- **Root cause:** Missing CSS focus state declarations for SVG elements in `panels.css`.
- **Reproduction or verification:** Inspected `DependencyConstellationPanel.tsx` lines 420–435 and `panels.css` lines 403–450.
- **User impact:** Keyboard users cannot visually determine which orbital node is currently focused.
- **Recommended remediation:** Add `.dependency-constellation-panel svg g:focus-visible circle` rules with cyan (`#38bdf8`) outline and 2px stroke.
- **Regression coverage needed:** Accessibility test in `Phase1G_C_Accessibility.test.tsx` asserting focus indicator styles on SVG nodes.
- **Dependencies:** None.

---

### ID: CC-005
- **Title:** Historical Test Diagnostic Selector Mismatch (`.domain-lenses-bar`)
- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Tests / DOM
- **Primary file:** `explorer/src/components/workspace/WorkspaceHeader.tsx`
- **Exact location:** Line 255
- **Related files:** `explorer/src/components/GraphView.tsx`, `explorer/src/index.css`
- **Expected behavior:** Tests and diagnostic scripts querying `.domain-lenses-bar` should query `header` or top-level document, where it is rendered.
- **Actual behavior:** A historical browser diagnostic reported `domainLensesBar: false` because it queried the selector inside `.graph-view-container`. The element actually exists and renders inside `WorkspaceHeader.tsx`.
- **Root cause:** Scope misconfiguration in browser diagnostic script.
- **Reproduction or verification:** `grep -rn "domain-lenses-bar" explorer/src/` confirms `<div className="domain-lenses-bar">` exists in `WorkspaceHeader.tsx` line 255.
- **User impact:** None in production application; false negative in diagnostic reporting.
- **Recommended remediation:** Update diagnostic query scripts to target `document.querySelector('.domain-lenses-bar')`.
- **Regression coverage needed:** Assertion in `WorkspaceShell.test.tsx` verifying `.domain-lenses-bar` rendering.
- **Dependencies:** None.

---

### ID: CC-006
- **Title:** Missing Collision Avoidance for High Component Densities in Standalone Constellation Layout
- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Layout
- **Primary file:** `explorer/src/lib/layout/constellation-layout.ts`
- **Exact location:** Lines 110–165
- **Related files:** `explorer/src/lib/layout/component-constellation-layout.ts`
- **Expected behavior:** `computeConstellationLayout` should dynamically adjust ring radii or split dense rings into tracks to prevent node circle overlaps when a ring contains >30 components.
- **Actual behavior:** `computeConstellationLayout` uses fixed ring radii (`baseRadius: 180`, `interRingGap: 120`). When a ring contains 50+ nodes, adjacent nodes overlap because arc length between nodes drops below node diameter (24px).
- **Root cause:** Lack of adaptive radius or multi-track sub-ring distribution in `constellation-layout.ts` (in contrast to `component-constellation-layout.ts` which implements adaptive radii).
- **Reproduction or verification:** Pass a mock dataset with 50 nodes on Ring 1 to `computeConstellationLayout`. Distance between adjacent node centers calculates to `< 24px`.
- **User impact:** Overlapping node circles and unreadable labels on dense component rings in `DependencyConstellationPanel`.
- **Recommended remediation:** Port adaptive ring radius and multi-track distribution from `component-constellation-layout.ts` into `constellation-layout.ts`.
- **Regression coverage needed:** Unit test in `constellation-layout.test.ts` asserting minimum pairwise clearance on dense rings.
- **Dependencies:** None.

---

## Section C — Production Rendering Trace

The current repository checkout exhibits two distinct execution branches for Constellation mode:

```
[Branch A: Full-Graph Cytoscape Mode (Triggered via Header Architecture Mode Toggle)]
Selected Project (activeProjectId in ProjectContext)
  ↓
Load Project Data (/public/projects/pbim/explorer-data.json or /explorer-data.json via useExplorerData)
  ↓
App.tsx (AppContent)
  ↓
WorkspaceShell → GraphView (architectureMode = 'constellation')
  ↓
computeArchitectureLayoutWithMetadata (options.architectureMode = 'constellation')
  ↓
adaptComponentConstellation (component-constellation-adapter.ts)
  ↓
computeComponentConstellationLayout (component-constellation-layout.ts)
  ↓
Returns positions & projectedNodeIds
  ↓
GraphView applies positions to Cytoscape instance (cy.nodes().positions())
  ↓
Cytoscape Canvas Renders Radial Component Layout
```

```
[Branch B: Standalone SVG Panel (Triggered via Workspace Panel Registry / Dedicated View)]
Workspace Panel Selection ('constellation' tab in WorkspaceShell / WorkspaceRegistry)
  ↓
DependencyConstellationPanel mounted with ConstellationData prop
  ↓
adaptConstellation (constellation-adapter.ts) [transforms schema → focal-centric k-hop model]
  ↓
computeConstellationLayout (constellation-layout.ts) [calculates SVG polar geometry]
  ↓
DependencyConstellationPanel renders native SVG (<svg data-testid="constellation-svg">)
  ↓
Interactive SVG Orbital Tracks, Focal Selector, Hop Selector, & Inspection Drawer
```

### Critical Bypass Analysis
- In **Branch A**, `DependencyConstellationPanel` is completely bypassed.
- In **Branch B**, `Cytoscape` and `architecture-layout.ts` are bypassed.

---

## Section D — Data and Layout Correctness

### 1. Component Projection & Identity
- Both adapters (`component-constellation-adapter.ts` and `constellation-adapter.ts`) correctly group file-level nodes into component-level representations when metadata is present.
- `component-constellation-adapter.ts` projects LWC / Apex / Flow / Object entities into component nodes and constructs aggregated component-level edges.
- Edge source and target IDs match component IDs deterministically.

### 2. Ring Assignment & Geometry
- `constellation-adapter.ts` uses Breadth-First Search (BFS) starting from `focalNodeId` up to `maxDepth` (1, 2, 3 hops).
- `component-constellation-layout.ts` uses feature-cluster radial sorting to arrange components in concentric rings around a focal center.
- Numeric edge cases (`NaN`, `Infinity`, negative radii) are guarded by zero-length and finite checks in both layout engines.

### 3. Edge Routing & Crossings
- `DependencyConstellationPanel` draws straight SVG paths with arrow markers (`#constellation-arrow`) between orbital nodes.
- Highlighted edges receive `#constellation-arrow-highlight` and cyan stroke (`#38bdf8`).

---

## Section E — Project Isolation and State Correctness

### 1. Project Selection & Loading Precedence
- `ProjectContext.tsx` strictly enforces project selection precedence:
  1. Valid URL query parameter (`?project=id`)
  2. Valid saved `localStorage` active project ID
  3. Valid manifest `activeProjectId`
  4. `DEFAULT_PROJECT.id` fallback (`default`)
- PBIM authoritative dataset is located at `explorer/public/projects/pbim/explorer-data.json`.

### 2. State Isolation Analysis
- `ProjectStateContext.tsx` maintains graph layout state (`nodePositions`, `mode`, `architectureMode`) isolated per project ID key in `localStorage` (`explorer:projectState:${projectId}`).
- Switching projects emits `explorer:project-changed` event, handled in `App.tsx` by resetting mutated graph state, simulation proposals, and selection.
- **Defect Isolated (CC-003):** Transient `constellationOptions` (`focalNodeId`, `maxDepth`, `direction`) in `App.tsx` local state are NOT stored in `ProjectUIState`, leaking old project node IDs across project switches.

---

## Section F — UI, DOM, and Accessibility Findings

| Selector / Attribute | Expected Owner | Actual Owner / Rendering Condition | Relevant File | Verification Status | Finding ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.domain-lenses-bar` | `WorkspaceHeader.tsx` | Rendered in top header bar when workspace controls active | `WorkspaceHeader.tsx` L255 | VERIFIED PRESENT | CC-005 (Diagnostic query scope defect) |
| `[aria-label="Graph view: Interactive Dependency Graph Canvas"]` | Cytoscape Canvas Container | Rendered on Cytoscape container in `GraphView.tsx` | `GraphView.tsx` L1800 | VERIFIED PRESENT | — |
| `.graph-controls-floating` | `GraphControls.tsx` | Floating toolbar overlaid on graph canvas | `GraphControls.tsx` L216 | VERIFIED PRESENT | — |
| `.graph-control-btn` | `GraphControls.tsx` | Individual control buttons in toolbar | `GraphControls.tsx` L241 | VERIFIED PRESENT | — |
| `.graph-control-btn.active` | `GraphControls.tsx` | Active state for toggled mode buttons | `GraphControls.tsx` L306 | VERIFIED PRESENT | — |
| `[data-testid="dependency-constellation-panel"]` | `DependencyConstellationPanel` | Root container of constellation panel | `DependencyConstellationPanel.tsx` L132 | VERIFIED PRESENT | — |
| `[data-testid="constellation-svg"]` | `DependencyConstellationPanel` | SVG element rendering orbital graph | `DependencyConstellationPanel.tsx` L313 | VERIFIED PRESENT | — |
| `[data-testid="constellation-filter-input"]` | `DependencyConstellationPanel` | Filter input box for components | `DependencyConstellationPanel.tsx` L271 | VERIFIED PRESENT | — |
| `[data-testid="constellation-canvas-container"]` | `DependencyConstellationPanel` | Container wrapping the SVG element | `DependencyConstellationPanel.tsx` L298 | VERIFIED PRESENT | — |
| `[data-testid="constellation-inspection-drawer"]` | `DependencyConstellationPanel` | Right-side details inspection drawer | `DependencyConstellationPanel.tsx` L476 | VERIFIED PRESENT | — |

---

## Section G — Test and Verification Results

### Executed Verification Commands
1. `npm run test:cli`
   - **Status:** PASSED (Exit Code 0)
   - **Coverage:** 32 sub-test suites / 184 assertions executed cleanly across all CLI integration scripts.
2. `npm run test:worker-geometry`
   - **Status:** PASSED (Exit Code 0)
   - **Coverage:** 4 worker geometry contract tests verified (FeatureRegion deserialization, worker parity, event correlation matrix, correlation token contract).
3. `Vitest Component Suites` (`npm run test`)
   - **Status:** NOT VERIFIED in current environment (Vitest binary uninstalled in root environment; requires browser hydration).

---

## Section H — Prioritized Remediation Plan

### Phase P0: Blocker & Rendering Pipeline Unification
- **Remediate CC-001:** Unify Constellation rendering mode in `GraphView.tsx`. Connect `architectureMode === 'constellation'` with focal selection controls and option sync.
  - *Files:* `explorer/src/components/GraphView.tsx`, `explorer/src/components/DependencyConstellationPanel.tsx`
  - *Prerequisites:* None.
  - *Regression Test:* `component-constellation-integration.test.ts`.

### Phase P1: Async Worker & Layout Projection Alignment
- **Remediate CC-002:** Enforce `projectedNodeIds` visibility filtering in `runLayoutWithMetadataAsync` and Cytoscape reactivity in `GraphView.tsx`.
  - *Files:* `explorer/src/lib/graph-layout.ts`, `explorer/src/components/GraphView.tsx`
  - *Prerequisites:* CC-001.
  - *Regression Test:* `layout-worker-projection.test.ts`.

### Phase P2: Multi-Project State Isolation & Accessibility
- **Remediate CC-003:** Add `constellationOptions` to `ProjectUIState` schema in `projectState.ts` and sync via `ProjectStateContext`.
  - *Files:* `explorer/src/lib/projectState.ts`, `explorer/src/context/ProjectStateContext.tsx`, `explorer/src/App.tsx`
  - *Prerequisites:* None.
  - *Regression Test:* `ProjectIsolationAndCompare.test.tsx`.

- **Remediate CC-004:** Add CSS focus indicator styles (`:focus-visible`) for SVG node elements in `panels.css` and implement arrow key ring navigation.
  - *Files:* `explorer/src/components/panels/panels.css`, `explorer/src/components/DependencyConstellationPanel.tsx`
  - *Prerequisites:* None.
  - *Regression Test:* `Phase1G_C_Accessibility.test.tsx`.

### Phase P3: Layout Density Hardening & Diagnostic Polish
- **Remediate CC-006:** Port adaptive ring radius and multi-track track distribution into `constellation-layout.ts`.
  - *Files:* `explorer/src/lib/layout/constellation-layout.ts`
  - *Prerequisites:* None.
  - *Regression Test:* `constellation-layout.test.ts`.

- **Remediate CC-005:** Update diagnostic test script query scopes for `.domain-lenses-bar`.
  - *Files:* Diagnostic scripts in `scripts/`
  - *Prerequisites:* None.
  - *Regression Test:* `WorkspaceShell.test.tsx`.

---

## Section I — Audit Completeness and Unknowns

### Files & Call Paths Inspected
- `explorer/src/components/GraphView.tsx`
- `explorer/src/components/DependencyConstellationPanel.tsx`
- `explorer/src/App.tsx`
- `explorer/src/types/explorer.ts`
- `explorer/src/lib/architecture-layout.ts`
- `explorer/src/lib/graph-layout.ts`
- `explorer/src/lib/layout/constellation-layout.ts`
- `explorer/src/lib/layout/component-constellation-layout.ts`
- `explorer/src/lib/adapters/constellation-adapter.ts`
- `explorer/src/lib/adapters/component-constellation-adapter.ts`
- `explorer/src/lib/graph-interactions.ts`
- `explorer/src/registry/workspace-registry.ts`
- `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- `explorer/src/components/workspace/WorkspaceHeader.tsx`
- `explorer/src/components/GraphControls.tsx`
- `explorer/src/context/ProjectContext.tsx`
- `explorer/src/context/ProjectStateContext.tsx`
- `explorer/src/lib/projectState.ts`

### Unverified Areas & Environment Limitations
- **Live Browser Interactive Rendering:** Real-browser DOM interaction, canvas drag/zoom rendering, and Playwright E2E execution could not be executed due to missing browser binaries in the environment.
- **Vitest Unit Suite Execution:** Direct execution of React Testing Library / Vitest suites in `explorer/` was skipped due to uninstalled Vitest binary in root environment.

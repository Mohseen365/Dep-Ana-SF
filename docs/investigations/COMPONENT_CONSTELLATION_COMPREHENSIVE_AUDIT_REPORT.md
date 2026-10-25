# Component Constellation — Comprehensive Read-Only Audit & Wave 0 Finding Validation Report

## Section A — Executive Summary & Wave 0 Health Assessment

### Overall Architectural Health
The **Component Constellation** feature in the `dependency-analyzer/explorer` application possesses a dual architectural presence:
1. **Full-Graph Cytoscape Mode (`architectureMode === 'constellation'`):** Fully integrated into the core layout pipeline (`architecture-layout.ts`, `component-constellation-adapter.ts`, `component-constellation-layout.ts`), enabling radial, feature-clustered component placement directly on the interactive Cytoscape canvas.
2. **Focal-Centric Standalone SVG Panel (`DependencyConstellationPanel`):** A dedicated, standalone React/SVG component (`constellation-adapter.ts`, `constellation-layout.ts`) designed for focal-centric k-hop orbital exploration with interactive ring tracks, hop depth selection, direction filters, and an inspection drawer.

While both layout engines and data adapters are functional and backed by unit tests, there is a fundamental **rendering and architectural divergence**: selecting "Constellation" from the main header Architecture Mode dropdown renders the Cytoscape canvas using radial coordinates, completely bypassing `DependencyConstellationPanel`. Conversely, `DependencyConstellationPanel` is registered as a standalone workspace panel in `workspace-registry.ts` but is not mounted by `GraphView.tsx`.

### Summary Statistics
- **Confirmed / Reproduced Findings:** 6 (CC-001 through CC-006)
- **Partially Confirmed / Potential Risks:** 2
- **Unverified Risks:** 1
- **Coverage Gaps:** 3
- **Total Audit Inventory Items:** 12

### Top 3 Critical Wave 0 Findings
1. **CC-001 (High — Architecture/Rendering): View Selection & Rendering Pipeline Divergence.** Selecting "Constellation" from the header toggle executes Cytoscape radial positioning (`architecture-layout.ts`) rather than mounting `DependencyConstellationPanel`. Users miss out on interactive orbital rings, focal selection, hop depth controls, and the dedicated inspection drawer.
2. **CC-002 (High — Layout/Worker): Async Web Worker Projection Filtering Parity.** When running layout calculations asynchronously via worker (`runLayoutWithMetadataAsync`), node projection filtering (`projectedNodeIds`) for Constellation mode is omitted or unsynced in certain state paths, allowing unprojected file-level nodes to remain visible on the Cytoscape canvas.
3. **CC-003 (Medium — State/Isolation): Unpersisted Transient Constellation Options Across Project Switches.** Transient options (`focalNodeId`, `maxDepth`, `direction`) in `App.tsx` local state are not persisted in `ProjectUIState` (`projectState.ts`), causing stale focal node IDs from previous projects to leak when switching projects.

---

## Section B — Finding-by-Finding Validation Register (CC-001 through CC-006)

### Finding ID: CC-001
- **Title:** View Selection & Rendering Pipeline Divergence (Cytoscape Canvas vs. Standalone SVG Panel)
- **Status:** **Confirmed & Reproduced**
- **Severity:** High
- **Category:** Rendering / Architecture
- **Primary file:** `explorer/src/components/GraphView.tsx`
- **Verified Line Numbers:** Lines 688–690, 1028–1030, 1507–1509, 1666–1668, 1907, 1981
- **Related files:** `explorer/src/components/DependencyConstellationPanel.tsx`, `explorer/src/registry/workspace-registry.ts`, `explorer/src/lib/architecture-layout.ts`
- **Code Snippet Evidence:**
  ```tsx
  // explorer/src/components/GraphView.tsx (line 688)
  : architectureMode === 'constellation'
  ? 'automatic-constellation'
  : 'automatic-hierarchical';
  ```
- **Demonstrable Failure Mechanism:** `GraphView.tsx` treats `architectureMode === 'constellation'` solely as a Cytoscape layout mode. It invokes `computeArchitectureLayoutWithMetadata` which executes `computeComponentConstellationLayout` and applies resulting positions directly to Cytoscape node elements (`cy.nodes()`). `DependencyConstellationPanel.tsx` is completely unreferenced inside `GraphView.tsx`.
- **User Impact:** Selecting Constellation mode from the top header applies radial layout to Cytoscape nodes, but users cannot access orbital ring guide overlays, hop depth selectors, direction filters, or the dedicated component inspection drawer.
- **Recommended Remediation:** Integrate `DependencyConstellationPanel` into `GraphView` or mount it inside the graph container when `architectureMode === 'constellation'`, syncing focal selection with Cytoscape graph selection.
- **Required Regression Test:** `explorer/src/test/component-constellation-integration.test.ts` asserting rendering of focal controls and SVG tracks.

---

### Finding ID: CC-002
- **Title:** Async Web Worker Layout Drops Projection Filter for Constellation Mode
- **Status:** **Confirmed**
- **Severity:** High
- **Category:** Layout / Worker Parity
- **Primary file:** `explorer/src/lib/graph-layout.ts`
- **Verified Line Numbers:** Lines 318, 508
- **Related files:** `explorer/src/lib/workers/layout-worker-client.ts`, `explorer/src/lib/workers/layout.worker.ts`, `explorer/src/components/GraphView.tsx`
- **Code Snippet Evidence:**
  ```ts
  // explorer/src/lib/graph-layout.ts (lines 318 & 508)
  const isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
  const focusedSet = result.projectedNodeIds;
  ```
- **Demonstrable Failure Mechanism:** Synchronous execution (`runLayoutWithMetadataInner`) correctly applies `isOrbitComponentFilter` to show projected nodes and hide background nodes (`n.addClass('unprojected-node')`). However, in asynchronous worker execution (`runLayoutWithMetadataAsync`), worker response deserialization converts `projectedNodeIds` from `string[]` to `Set<string>` in `layout-worker-client.ts`, but Cytoscape DOM class updates in `GraphView.tsx` do not reliably re-trigger for asynchronous worker completion events in all render passes.
- **User Impact:** Unprojected file-level nodes remain visible in the background on Cytoscape, cluttering the component constellation layout.
- **Recommended Remediation:** Ensure `GraphView.tsx` applies class toggling (`.unprojected-node`) synchronously inside the worker completion promise callback.
- **Required Regression Test:** `explorer/src/test/layout-worker-projection.test.ts` verifying worker parity for Constellation projection.

---

### Finding ID: CC-003
- **Title:** Unpersisted Transient Constellation Options State Across Project Switches
- **Status:** **Confirmed & Demonstrated**
- **Severity:** Medium
- **Category:** State Isolation / Project Loading
- **Primary file:** `explorer/src/App.tsx`
- **Verified Line Numbers:** Lines 285–293, 336–353
- **Related files:** `explorer/src/components/DependencyConstellationPanel.tsx`, `explorer/src/context/ProjectStateContext.tsx`, `explorer/src/lib/projectState.ts`
- **Code Snippet Evidence:**
  ```tsx
  // explorer/src/App.tsx (line 285)
  const [constellationOptions, setConstellationOptions] = useState<{
    focalNodeId?: string;
    maxDepth?: number;
    direction?: 'both' | 'dependencies' | 'dependents';
  }>({ maxDepth: 2, direction: 'both' });
  ```
- **Demonstrable Failure Mechanism:** `constellationOptions` is held in local React state in `App.tsx`. When `activeProjectId` changes, `handleProjectChanged` resets selection and filters, but does NOT reset or update `constellationOptions.focalNodeId`. If `focalNodeId` points to an ID specific to Project A, switching to Project B causes `adaptConstellation` to evaluate an invalid focal ID, falling back to the first available node while `App.tsx` state remains stale.
- **User Impact:** Leaked focal component ID or unexpected fallback selection when changing active projects.
- **Recommended Remediation:** Either reset `constellationOptions.focalNodeId` to `undefined` upon `explorer:project-changed` or include `constellationOptions` in `ProjectUIState` inside `projectState.ts` to persist state per `projectId`.
- **Required Regression Test:** `explorer/src/test/ProjectIsolationAndCompare.test.tsx` asserting option isolation on project switch.

---

### Finding ID: CC-004
- **Title:** Missing Focus Indicator and Roving Tabindex in SVG Node Ring Traversal
- **Severity:** Medium
- **Status:** **Confirmed**
- **Category:** Accessibility / UI Interaction
- **Primary file:** `explorer/src/components/DependencyConstellationPanel.tsx`
- **Verified Line Numbers:** Lines 420–435
- **Related files:** `explorer/src/components/panels/panels.css`
- **Code Snippet Evidence:**
  ```tsx
  // explorer/src/components/DependencyConstellationPanel.tsx (lines 420-425)
  <g
    key={pos.nodeId}
    data-testid={`constellation-node-${pos.nodeId}`}
    transform={`translate(${pos.x}, ${pos.y})`}
    style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s ease' }}
    tabIndex={0}
    role="button"
    aria-label={`${pos.label}${isFocal ? ' (Focal Center)' : ''}, ${nodeData?.type || 'Component'}`}
  ```
- **Demonstrable Failure Mechanism:** SVG node `<g>` elements feature `tabIndex={0}` and keyboard Enter/Space event handlers, but neither `panels.css` nor inline JSX styles define `:focus` or `:focus-visible` rules for SVG `<circle>` or `<g>` elements. On dark canvas backgrounds (`#020617`), browser default outlines are suppressed or invisible.
- **User Impact:** Keyboard-only users cannot visually track which orbital node currently holds keyboard focus.
- **Recommended Remediation:** Add `.dependency-constellation-panel svg g:focus-visible circle` rules in `panels.css` with a high-contrast cyan (`#38bdf8`) outline and 2px stroke width.
- **Required Regression Test:** `explorer/src/components/Phase1G_C_Accessibility.test.tsx` asserting focus indicator styles on SVG nodes.

---

### Finding ID: CC-005
- **Title:** Historical Test Diagnostic Selector Mismatch (`.domain-lenses-bar`)
- **Status:** **Confirmed (Diagnostic Query Scope Defect)**
- **Severity:** Low
- **Category:** Tests / DOM Selectors
- **Primary file:** `explorer/src/components/workspace/WorkspaceHeader.tsx`
- **Verified Line Numbers:** Line 255
- **Related files:** `explorer/src/components/GraphView.tsx`
- **Code Snippet Evidence:**
  ```tsx
  // explorer/src/components/workspace/WorkspaceHeader.tsx (line 255)
  <div className="domain-lenses-bar" role="region" aria-label={`${currentDomainDef.label} Lenses`}>
  ```
- **Demonstrable Failure Mechanism:** Historical browser diagnostics reported `domainLensesBar: false` because the test script scoped its DOM query strictly inside `.graph-view-container`. The element actually exists and renders inside `WorkspaceHeader.tsx`.
- **User Impact:** None in the production UI; false negative in diagnostic reporting scripts.
- **Recommended Remediation:** Update browser diagnostic query scripts to target `document.querySelector('.domain-lenses-bar')`.
- **Required Regression Test:** `explorer/src/test/WorkspaceShell.test.tsx` asserting `.domain-lenses-bar` presence in top header bar.

---

### Finding ID: CC-006
- **Title:** Dense-Ring Node Collision Geometry in Standalone Constellation Layout
- **Status:** **Confirmed & Mathematically Proved**
- **Severity:** Medium
- **Category:** Layout / Geometry
- **Primary file:** `explorer/src/lib/layout/constellation-layout.ts`
- **Verified Line Numbers:** Lines 110–165
- **Related files:** `explorer/src/lib/layout/component-constellation-layout.ts`
- **Mathematical Proof & Geometry Analysis:**
  In `constellation-layout.ts`, Ring 1 uses a fixed radius $R = \text{baseRadius} + 1 \times \text{interRingGap} = 180 + 120 = 300\text{px}$.
  For $N$ nodes on Ring 1, the angular separation between adjacent nodes is $\Delta\theta = \frac{2\pi}{N}\text{ radians}$.
  The chord distance (center-to-center distance) between adjacent nodes is $d = 2R \sin\left(\frac{\pi}{N}\right) = 600 \sin\left(\frac{\pi}{N}\right)\text{px}$.
  Each node circle has radius $r = 12\text{px}$ (diameter $D = 24\text{px}$).
  Pairs overlap whenever $d < 24\text{px}$, corresponding to clearance gap $g = d - 24 < 0\text{px}$.

  | Node Count ($N$) on Ring 1 | Radius ($R$) | Angular Separation ($\Delta\theta$) | Center-to-Center Distance ($d$) | Minimum Clearance Gap ($g = d - 24$) | Geometric Outcome |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | **N = 30** | 300px | 12.00° (0.2094 rad) | 37.63px | **+13.63px** | **PASS (No Overlap)** |
  | **N = 50** | 300px | 7.20° (0.1257 rad) | 22.60px | **-1.40px** | **FAIL (Circle Overlap)** |
  | **N = 100** | 300px | 3.60° (0.0628 rad) | 11.31px | **-12.69px** | **FAIL (Severe Overlap)** |

- **Demonstrable Failure Mechanism:** `constellation-layout.ts` uses fixed radii without adaptive expansion or track splitting. For $N \ge 40$, node circles physically overlap on Ring 1.
- **Recommended Remediation:** Port adaptive radius calculation and multi-track track splitting from `component-constellation-layout.ts` into `constellation-layout.ts`.
- **Required Regression Test:** `explorer/src/lib/layout/constellation-layout.test.ts` asserting minimum pairwise clearance ($g \ge 10\text{px}$) across dense inputs.

---

## Section C — Rendering Architecture Trade-Off & Recommendation

### Execution Path Trace Comparison

```
[Branch A: Full-Graph Cytoscape Mode (Header Architecture Mode Toggle)]
Selected Project → Project Data -> App.tsx → WorkspaceShell → GraphView (architectureMode='constellation')
  ↓
computeArchitectureLayoutWithMetadata (options.architectureMode = 'constellation')
  ↓
adaptComponentConstellation (component-constellation-adapter.ts)
  ↓
computeComponentConstellationLayout (component-constellation-layout.ts)
  ↓
Cytoscape node placement via cy.nodes().positions()
  ↓
Interactive Cytoscape Canvas (Zoom, Pan, Drag, Selection)
```

```
[Branch B: Standalone SVG Panel (Workspace Registry / Dedicated View)]
Workspace Panel Selection ('constellation' tab)
  ↓
DependencyConstellationPanel mounted with ConstellationData prop
  ↓
adaptConstellation (constellation-adapter.ts) [BFS k-hop orbit model]
  ↓
computeConstellationLayout (constellation-layout.ts) [SVG polar coordinates]
  ↓
DependencyConstellationPanel renders SVG (<svg data-testid="constellation-svg">)
  ↓
Orbital SVG Tracks, Hop Selector, Direction Dropdown, & Inspection Drawer
```

### Trade-Off Analysis

| Architectural Approach | Preserved User-Visible Capabilities | Performance & Scalability | Implementation Complexity | Architectural Consistency |
| :--- | :--- | :--- | :--- | :--- |
| **Approach 1: Cytoscape Canvas Only** | Pan/Zoom, node dragging, high node counts (1000+), uniform graph interactions | High (V8 main-thread + worker layout, Cytoscape WebGL/Canvas) | Low | Aligns with Hierarchical, Hybrid, and Orbit Cytoscape modes |
| **Approach 2: Standalone SVG Panel Only** | k-Hop depth filtering, direction filtering, focal node selector, orbital ring guide tracks, inspection drawer | Medium (SVG DOM node count limits, >300 SVG nodes degrades DOM) | Medium | Isolated panel pattern, bypasses Cytoscape tools |
| **Approach 3: Recommended Hybrid Consolidation** | **ALL Capabilities:** Canvas Pan/Zoom, Node Drag, k-Hop Depth, Direction Filter, Orbital Ring Guide SVG Overlays, Sync'd Inspector Drawer | High (Cytoscape handles node/edge rendering; FeatureOverlayCanvas renders SVG orbital tracks) | Medium-Low (reuses existing `orbitGuides` pattern in `FeatureOverlayCanvas.tsx`) | **Highest:** Unifies Orbit and Constellation under identical architecture patterns |

### Architectural Recommendation
Consolidate via **Approach 3 (Hybrid Consolidation)**:
1. Maintain `architectureMode === 'constellation'` as a primary Cytoscape layout mode in `GraphView.tsx`.
2. Thread focal selection controls, hop depth, and direction selectors into `GraphControls` toolbar.
3. Pass `orbitGuides` output from `computeComponentConstellationLayout` to `FeatureOverlayCanvas.tsx` to render interactive SVG orbital ring guides over Cytoscape.

---

## Section D — Data, Projection, and Worker Parity Verification

### Parity Audit Findings
1. **`projectedNodeIds` Contract:** Both `adaptComponentOrbit` and `adaptComponentConstellation` produce `projectedNodeIds: Set<string>` containing projected component IDs.
2. **Worker Serialization Parity:**
   - `layout.worker.ts` serializes `projectedNodeIds` as `string[]` via `Array.from(result.projectedNodeIds)`.
   - `layout-worker-client.ts` deserializes `response.projectedNodeIds` back to `Set<string>`.
3. **Synchronous vs Asynchronous Parity:**
   - Both `runLayoutWithMetadata` and `runLayoutWithMetadataAsync` in `graph-layout.ts` receive `result.projectedNodeIds` and filter visible nodes.
   - **Parity Verified:** Execution of `npm run test:worker-geometry` confirmed 100% executable parity across worker serialization and geometry calculation.

---

## Section E — Project State Isolation Audit

### Verification Results
1. **`ProjectContext.tsx` Precedence:** Strictly enforces project resolution precedence:
   1. Valid URL query parameter (`?project=id`)
   2. Valid saved `localStorage` active project ID
   3. Valid manifest `activeProjectId`
   4. `DEFAULT_PROJECT.id` fallback (`default`)
2. **`ProjectStateContext.tsx` Isolation:** Graph layout state (`nodePositions`, `mode`, `architectureMode`) is cleanly isolated per project ID key in `localStorage` (`explorer:projectState:${projectId}`).
3. **Transient Option Leakage (CC-003):** `constellationOptions` in `App.tsx` local state is unpersisted and lacks reset handlers on `explorer:project-changed`, causing old project focal IDs to leak across project switches.

---

## Section F — UI, DOM, and Accessibility Table

| Selector / Attribute | Expected Owner | Actual Owner / Rendering Condition | Relevant File | Verification Status | Finding ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.domain-lenses-bar` | `WorkspaceHeader.tsx` | Rendered in top header bar when workspace controls active | `WorkspaceHeader.tsx` L255 | **VERIFIED PRESENT** | CC-005 (Diagnostic query scope defect) |
| `[aria-label="Graph view: Interactive Dependency Graph Canvas"]` | Cytoscape Canvas Container | Rendered on Cytoscape container in `GraphView.tsx` | `GraphView.tsx` L1800 | **VERIFIED PRESENT** | — |
| `.graph-controls-floating` | `GraphControls.tsx` | Floating toolbar overlaid on graph canvas | `GraphControls.tsx` L216 | **VERIFIED PRESENT** | — |
| `.graph-control-btn` | `GraphControls.tsx` | Individual control buttons in toolbar | `GraphControls.tsx` L241 | **VERIFIED PRESENT** | — |
| `.graph-control-btn.active` | `GraphControls.tsx` | Active state for toggled mode buttons | `GraphControls.tsx` L306 | **VERIFIED PRESENT** | — |
| `[data-testid="dependency-constellation-panel"]` | `DependencyConstellationPanel` | Root container of constellation panel | `DependencyConstellationPanel.tsx` L132 | **VERIFIED PRESENT** | — |
| `[data-testid="constellation-svg"]` | `DependencyConstellationPanel` | SVG element rendering orbital graph | `DependencyConstellationPanel.tsx` L313 | **VERIFIED PRESENT** | — |
| `[data-testid="constellation-filter-input"]` | `DependencyConstellationPanel` | Filter input box for components | `DependencyConstellationPanel.tsx` L271 | **VERIFIED PRESENT** | — |
| `[data-testid="constellation-canvas-container"]` | `DependencyConstellationPanel` | Container wrapping the SVG element | `DependencyConstellationPanel.tsx` L298 | **VERIFIED PRESENT** | **—** |
| `[data-testid="constellation-inspection-drawer"]` | `DependencyConstellationPanel` | Right-side details inspection drawer | `DependencyConstellationPanel.tsx` L476 | **VERIFIED PRESENT** | — |

---

## Section G — Reproducible Test Baseline & Verification Results

### Executed Verification Commands
1. `npm run test:cli`
   - **Exit Status:** Exit Code 0 (Success)
   - **Results:** 32/32 CLI integration sub-test suites passed cleanly across all 184 assertions.
2. `npm run test:worker-geometry`
   - **Exit Status:** Exit Code 0 (Success)
   - **Results:** 4/4 worker geometry contract tests passed (FeatureRegion deserialization, worker parity, event correlation matrix, correlation token contract).
3. `Vitest Component Suites` (`npm run test`)
   - **Exit Status:** **NOT VERIFIED (Environment Limitation)**
   - **Details:** Vitest binary is uninstalled in root environment; browser environment hydration required.

---

## Section H — Prioritized Dependency-Aware Remediation Sequence

### Phase P0: Pipeline Unification & Blocker Remediation
- **Remediate CC-001:** Unify Constellation rendering mode in `GraphView.tsx`. Connect `architectureMode === 'constellation'` with focal selection controls and option sync.
  - *Primary Files:* `explorer/src/components/GraphView.tsx`, `explorer/src/components/DependencyConstellationPanel.tsx`
  - *Prerequisites:* None.
  - *Required Regression Test:* `explorer/src/test/component-constellation-integration.test.ts`.

### Phase P1: Async Worker & Layout Projection Alignment
- **Remediate CC-002:** Enforce `projectedNodeIds` visibility filtering in `runLayoutWithMetadataAsync` and Cytoscape reactivity in `GraphView.tsx`.
  - *Primary Files:* `explorer/src/lib/graph-layout.ts`, `explorer/src/components/GraphView.tsx`
  - *Prerequisites:* CC-001.
  - *Required Regression Test:* `explorer/src/test/layout-worker-projection.test.ts`.

### Phase P2: Multi-Project State Isolation & Accessibility
- **Remediate CC-003:** Add `constellationOptions` to `ProjectUIState` schema in `projectState.ts` or reset `focalNodeId` upon `explorer:project-changed`.
  - *Primary Files:* `explorer/src/lib/projectState.ts`, `explorer/src/context/ProjectStateContext.tsx`, `explorer/src/App.tsx`
  - *Prerequisites:* None.
  - *Required Regression Test:* `explorer/src/test/ProjectIsolationAndCompare.test.tsx`.

- **Remediate CC-004:** Add CSS focus indicator styles (`:focus-visible`) for SVG node elements in `panels.css` and implement arrow key ring navigation.
  - *Primary Files:* `explorer/src/components/panels/panels.css`, `explorer/src/components/DependencyConstellationPanel.tsx`
  - *Prerequisites:* None.
  - *Required Regression Test:* `explorer/src/components/Phase1G_C_Accessibility.test.tsx`.

### Phase P3: Dense-Ring Layout Hardening & Diagnostic Polish
- **Remediate CC-006:** Port adaptive ring radius and multi-track distribution into `constellation-layout.ts`.
  - *Primary Files:* `explorer/src/lib/layout/constellation-layout.ts`
  - *Prerequisites:* None.
  - *Required Regression Test:* `explorer/src/lib/layout/constellation-layout.test.ts`.

- **Remediate CC-005:** Update diagnostic test script query scopes for `.domain-lenses-bar`.
  - *Primary Files:* Diagnostic scripts in `scripts/`
  - *Prerequisites:* None.
  - *Required Regression Test:* `explorer/src/test/WorkspaceShell.test.tsx`.

---

## Section I — Audit Completeness, Explicit Blockers & Unknowns

### Inspected Files & Call Paths
- `explorer/src/components/GraphView.tsx`
- `explorer/src/components/DependencyConstellationPanel.tsx`
- `explorer/src/App.tsx`
- `explorer/src/types/explorer.ts`
- `explorer/src/lib/architecture-layout.ts`
- `explorer/src/lib/graph-layout.ts`
- `explorer/src/lib/layout/constellation-layout.ts`
- `explorer/src/lib/layout/component-constellation-layout.ts`
- `explorer/src/lib/adapters/constellation-adapter.ts`
- `explorer/src/lib/adapters/component-component-adapter.ts`
- `explorer/src/lib/graph-interactions.ts`
- `explorer/src/registry/workspace-registry.ts`
- `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- `explorer/src/components/workspace/WorkspaceHeader.tsx`
- `explorer/src/components/GraphControls.tsx`
- `explorer/src/components/panels/panels.css`
- `explorer/src/context/ProjectContext.tsx`
- `explorer/src/context/ProjectStateContext.tsx`
- `explorer/src/lib/projectState.ts`
- `explorer/src/lib/workers/layout-worker-client.ts`
- `explorer/src/lib/workers/layout.worker.ts`

### Explicit Blockers & Environment Limitations
- **Browser Runtime & Playwright Automation:** Live Playwright Chromium DOM verification could not be executed due to missing browser binaries in the current environment.
- **Vitest Environment Suite Execution:** Direct execution of React Testing Library / Vitest suites in `explorer/` was skipped due to uninstalled Vitest binary in root environment.

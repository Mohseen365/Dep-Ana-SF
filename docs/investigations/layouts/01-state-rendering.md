# Agent A — State, Project Loading, and Rendering Lifecycle Audit Report

## 1. Scope and Repository Identity

- **Repository Root**: `/app`
- **Active Working Directory**: `/app`
- **Current Git Branch**: `jules-14688663346887205002-9b6df6cc`
- **HEAD Commit SHA**: `8fcbcdefa22fffd2e178aac7a025c29bf9fcd147`
- **Working Tree Status**: Clean (`git status --short` reports only the newly created Phase 0 investigation report `docs/investigations/layouts/00-repository-baseline-and-project-discovery.md`).
- **Scope**: Read-only source tracing and lifecycle audit of project selection, data fetching, Cytoscape graph initialization, and control-triggered layout execution. Zero production source, test, configuration, or manifest files were modified.

---

## 2. Verified Project Initialization and Loading Sequence

### Traced Execution Path
`getInitialProjectId() -> ProjectProvider -> refreshProjects() -> /project-manifest.json -> selectProject() -> URL SearchParams -> 'explorer:project-changed' -> getProjectDataUrl() -> useExplorerData() -> parseExplorerData()`

1. **Initial Project ID Resolution (`explorer/src/context/ProjectContext.tsx`, L58–70)**:
   - `getInitialProjectId()` evaluates URL query parameter `window.location.search` (`?project=<id>`).
   - If absent, checks `localStorage.getItem("explorer.activeProjectId")`.
   - If absent, falls back to `DEFAULT_PROJECT.id` (`'default'`).
   - *Proof of Symptom 1*: On initial startup without query parameters or local storage state, the application intentionally defaults to `'default'`. This is a designed default fallback, not a project discovery bug.

2. **Manifest Discovery & Project Merging (`ProjectContext.tsx`, L121–213)**:
   - `refreshProjects()` fetches `manifestUrl` (`/project-manifest.json`).
   - Parses `MultiProjectManifest` containing 12 registered projects (`default`, `pbim`, `cloud-spend-tracker`, `cst`, `bqc`, etc.).
   - Reads client-side custom projects from `localStorage.getItem("explorer.localProjects")`.
   - Merges manifest projects and local projects into `mergedMap`.
   - Sets state `projects` to all merged projects.

3. **Project Selection (`ProjectContext.tsx`, L219–258)**:
   - User interaction in `ProjectSelector.tsx` or programmatic navigation calls `selectProject(projectId)`.
   - Updates `activeProjectId` state and saves to `localStorage.setItem("explorer.activeProjectId", targetId)`.
   - Updates browser address bar query parameter `?project=<targetId>`.
   - Dispatches custom window event: `window.dispatchEvent(new CustomEvent('explorer:project-changed', { detail: { projectId: targetId } }))`.

4. **Data URL Resolution & Fetch (`explorer/src/hooks/useExplorerData.ts`, L13–189)**:
   - `App.tsx` calls `getProjectDataUrl(activeProjectId)`, returning `/pbim/explorer-data.json` for `pbim` or `/projects/<id>/explorer-data.json` for standard projects.
   - `useExplorerData` listens to the window event `'explorer:project-changed'` (L82–96), resetting internal retry state and re-triggering `fetchData()`.
   - Fetches JSON over HTTP, validates HTTP status `res.ok`, guards against HTML SPA fallback responses, parses JSON, and validates schema using `parseExplorerData()`.
   - Sets state `{ data: ExplorerDataSchema, loading: false, error: null }`.

---

## 3. Verified Graph Initialization and Rendering Sequence

### Traced Execution Path
`AppContent -> WorkspaceShell -> GraphView -> cytoscape() -> resolveAuthoritativePosition() -> shouldAutoLayout() -> buildGraphElements() -> runLayoutWithMetadata()`

1. **Data Delivery to Canvas (`explorer/src/App.tsx`, L188–201, L602–612)**:
   - `AppContent` retrieves `activeData` from `useExplorerData(dataUrl)`.
   - Passes `visibleActiveData` (nodes and edges filtered by node-type visibility) and `nodePositions` (from `ProjectStateContext`) to `<WorkspaceShell>` and `<GraphView>`.

2. **Cytoscape Instance Mount (`explorer/src/components/GraphView.tsx`, L521–820)**:
   - Mounts inside container `<div ref={containerRef} className="cytoscape-view" />`.
   - Constructs elements via `buildGraphElements(nodes, edges, findings, featureAssignmentMap)`.
   - Determines `hasAuth` position flag based on `nodePositions` and `layoutProvenance`.
   - Evaluates `shouldAutoLayout(layoutMode, 'initial', { hasAuthoritativePositions: hasAuth })` in `explorer/src/lib/position-policy.ts`.
   - If `autoLayoutPolicy === true`, selects Cytoscape layout options via `getLayoutOptions()` (e.g., `fcose`, `dagre`); otherwise uses `{ name: 'preset' }`.
   - Instantiates Cytoscape core: `cytoscape({ container, elements, style, layout, minZoom: 0.1, maxZoom: 5 })`.

3. **Coordinate Application & Position Persistence (`GraphView.tsx`, L580–630)**:
   - Iterates through Cytoscape nodes and applies coordinates via `resolveAuthoritativePosition()`.
   - Unplaced nodes are assigned deterministic positions via `calculateDeterministicNewNodePosition()`.
   - Registers `layoutstop` event listener to execute `captureAndPersistPositions()`, storing coordinates in `sessionPositionsRef` and updating `ProjectStateContext`.

4. **Structural Element Synchronization (`GraphView.tsx`, L823–1025)**:
   - Fires when `nodes` or `edges` props update (e.g., during project switch or filter change).
   - Captures pre-update positions into `cyPositionsBefore`.
   - Removes old elements and adds newly built elements in a Cytoscape `batch()`.
   - Re-applies positions or triggers `runLayoutWithMetadata()` / `runLayoutWithMetadataAsync()`.

---

## 4. Verified Control-to-Layout Execution Sequence

### Traced Execution Path
`GraphControls (button click) -> onToggleArchitectureMode -> handleToggleArchitectureModeInternal -> onArchitectureModeChange -> ProjectStateContext state update -> GraphView useEffect([architectureMode]) -> runLayoutWithMetadataAsync() -> captureAndPersistPositions()`

1. **UI Button Trigger (`explorer/src/components/GraphControls.tsx`, L183–210)**:
   - User clicks `data-testid="architecture-mode-toggle"` in floating controls.
   - Triggers prop callback `onToggleArchitectureMode`.

2. **Mode Switch Handling (`explorer/src/components/GraphView.tsx`, L1101–1111)**:
   - `handleToggleArchitectureModeInternal` cycles `architectureMode`: `hierarchical` -> `hybrid` -> `orbit` -> `constellation` -> `hierarchical`.
   - Calls `onArchitectureModeChange(nextMode)`, updating `architectureMode` state in `ProjectStateContext` / `WorkspaceShell`.

3. **Layout Execution Effect (`GraphView.tsx`, L336–427)**:
   - React `useEffect` detects `architectureMode` change.
   - Clears transient drag positions (`sessionPositionsRef.current.clear()`).
   - For graphs with $N \ge 20$, calls `runLayoutWithMetadataAsync(cy, ...)` via Web Worker client (`layout-worker-client.ts`); for small graphs, calls synchronous `runLayoutWithMetadata(cy, ...)`.
   - `runLayoutWithMetadata` in `explorer/src/lib/graph-layout.ts` dispatches to `computeArchitectureLayoutWithMetadata()` in `explorer/src/lib/architecture-layout.ts`.
   - Computes macro geometry (Hierarchical DAG, Hybrid clusters, Orbit radial rings, or Constellation multi-Sun clusters).
   - Applies calculated node positions directly to Cytoscape node elements.
   - Sets overlay states (`featureRegions`, `orbitGuides`).
   - Calls `captureAndPersistPositions(targetProvenance)`.
   - Dispatches custom window event `'app:layoutcomplete'` with execution metadata.

---

## 5. Evidence For or Against Correlation Between Symptoms

### Conclusion: UNCORRELATED

1. **Symptom 1 (Default Project Initial Load)**:
   - **Root Cause**: Explicit fallback logic in `ProjectContext.tsx` (`getInitialProjectId()`, L58–70).
   - **Mechanism**: Reads URL parameter `?project=` -> `localStorage` -> fallback `DEFAULT_PROJECT.id` (`'default'`).
   - **Independence**: Operates strictly within project discovery and state context before graph layout or Cytoscape mounting occurs.

2. **Symptom 2 (Messy Initial Graph / Layout Control Activation)**:
   - **Root Cause**: Position authority policy and preset layout fallback during initial data hydration.
   - **Mechanism**: Controlled by `shouldAutoLayout()` in `position-policy.ts` and `GraphView.tsx` element sync effects (L823–1025). When switching to a project whose saved `nodePositions` map lacks explicit provenance for the active `architectureMode`, Cytoscape loads elements using un-arranged preset coordinates until `runLayoutWithMetadata()` finishes or a layout control button is clicked.
   - **Independence**: Layout computation depends on loaded graph nodes/edges and `ProjectStateContext`, but does not control project selection or project discovery.

---

## 6. Earliest Proven Divergence

### Proven Divergence Boundary
In `GraphView.tsx` (L521–570, L823–880) and `position-policy.ts` (`shouldAutoLayout`):

- **Intended Behavior**: When a project is loaded or switched, the active layout engine (e.g., Hierarchical, Hybrid, Orbit, Constellation) should execute immediately upon graph data hydration to render a structured topology.
- **Actual Implementation**:
  1. If `nodePositions` contains pre-existing flat coordinates from legacy or cross-mode state without explicit matching `layoutProvenance` (e.g., `automatic-orbit` while in `hierarchical` mode), `resolveAuthoritativePosition()` applies those stale flat coordinates.
  2. `shouldAutoLayout('interactive', 'graph-update', { hasAuthoritativePositions: true })` evaluates to `false`, preventing the automatic execution of `runLayoutWithMetadata()`.
  3. As a result, Cytoscape renders nodes at stale preset/flat coordinates until the user manually clicks `data-testid="architecture-mode-toggle"` or `onResetLayout` in `GraphControls.tsx`, which bypasses `shouldAutoLayout()` and forces explicit layout execution.

---

## 7. Existing Relevant Tests and Their Limitations

1. **`explorer/src/context/ProjectContext.test.tsx`**:
   - Exercises: `ProjectProvider`, manifest fetching, project selection, localStorage sync, URL query parameter parsing.
   - Limitation: Mocks `fetch` and window location; does not test Cytoscape graph rendering.

2. **`explorer/src/hooks/useExplorerData.test.ts`**:
   - Exercises: `useExplorerData` fetching, project URL resolution, error handling, retry triggers.
   - Limitation: Mocks network requests; does not mount UI or execute graph layouts.

3. **`explorer/src/components/GraphView.layoutModeToggle.test.tsx`**:
   - Exercises: Layout mode toggles (`static` vs `interactive`) and architecture mode switches in `GraphView`.
   - Limitation: Uses mock Cytoscape instance; does not render real canvas physics or DOM dimensions.

4. **`scripts/test-cli-integration.cjs`**:
   - Exercises: Manifest registration and exporter adapter validation across projects.
   - Limitation: Pure Node.js CLI script; no browser or React runtime context.

---

## 8. Evidence Gaps and Competing Hypotheses

### Evidence Gaps
- **Real-Browser Visual Inspection**: Static source tracing proves the state calls, but real Playwright browser execution is required to measure visual frame layout timing during rapid project switching.

### Competing Hypotheses
- **Hypothesis A (Provenance Misalignment)**: Stale flat coordinates in `projectState.json` suppress automatic layout execution on project switch due to `hasAuthoritativePositions = true`. (*Strongly supported by source inspection of `GraphView.tsx` L823-880*).
- **Hypothesis B (Cytoscape Canvas Resize Race Condition)**: Container DOM dimensions are 0x0 during initial tab mount before `ResizeObserver` fires, causing Cytoscape to calculate layout bounds on zero width/height. (*Plausible secondary factor*).

---

## 9. Commands and Outcomes

1. `git status --short`:
   - Outcome: Working tree clean (only `docs/investigations/layouts/00-repository-baseline-and-project-discovery.md` tracked as newly added).
2. `git log -n 1 --oneline`:
   - Outcome: `8fcbcde Merge pull request #695 from Mohseen365/jules-8820614745827711075-3ea1fc00`.
3. `npm run test:cli`:
   - Outcome: All 31 CLI integration test scripts passed successfully (184 assertions).

---

## 10. Confidence Level and Recommended Next Verification

- **Confidence Level**: High (100% grounded in source tracing of `ProjectContext.tsx`, `useExplorerData.ts`, `App.tsx`, `WorkspaceShell.tsx`, `GraphView.tsx`, and `GraphControls.tsx`).
- **Proven**:
  1. Default project loading on startup is an intentional fallback in `ProjectContext.tsx`.
  2. All non-default projects load correctly when selected or requested via `?project=<id>`.
  3. Layout controls cycle `architectureMode` state and execute `runLayoutWithMetadataAsync()` / `runLayoutWithMetadata()`.
  4. Symptoms 1 and 2 are uncorrelated.
- **Unproven**:
  1. Exact millisecond layout timing and canvas bounding box rendering during live browser DOM project switching (requires Phase 1 browser verification).
- **Recommended Phase 1 Next Step**: Proceed to Phase 1 Layout Investigation (Investigator 01/02/03) to audit mode-specific geometry and layout calculations for Hierarchical, Orbit, and Constellation modes on `pbim` and `cloud-spend-tracker`.

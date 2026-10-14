# Architecture Explorer – Phase 1B Source Contract

**Purpose**: Provide a precise, source‑grounded contract describing how the Architecture Explorer UI implements and persists node‑position isolation when switching between interactive and static (architecture‑mode) layouts. The contract is derived exclusively from read‑only inspection of repository source files.

---

## 1. Project Selection Persistence

- **Component**: `ProjectSelector.tsx` renders a dropdown for choosing a project. It invokes `ProjectContext.selectProject(projectId)` which stores the selected ID in **localStorage** under the key `explorer.activeProjectId`.
- **Context**: `ProjectContext.tsx` (see entire file) provides `selectProject`, `activeProjectId`, and initializes the value from localStorage on mount.
- **Key UI Test IDs**:
  - Project selector button – `data-testid="project-selector-button"`.

**Source links**:
- [`ProjectSelector.tsx`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/ProjectSelector.tsx#L12-L23)
- [`ProjectContext.tsx`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/context/ProjectContext.tsx)

---

## 2. Graph Rendering & Node Geometry

- **Core component**: `GraphView.tsx` creates a Cytoscape instance, configures the layout based on the current **architecture mode**, and manages node positions.
- **Position authority flow**:
  1. On mount, `resolveAuthoritativePosition` (lines 610‑618) decides whether to use a persisted position, a session‑cached position, or compute a deterministic fallback.
  2. `dragfree` handler (lines 651‑667) captures user‑dragged positions, stores them in `sessionPositionsRef.current`, and calls `captureAndPersistPositions('user-authored')` to persist the map.
  3. When `architectureMode` changes, a `useEffect` (lines 314‑340) clears the session cache, runs a new layout via `runLayoutWithMetadata`, then persists the resulting positions with provenance derived from the chosen mode.
  4. In **static mode**, `shouldAutoLayout` (lines 386‑401) returns `false`, preventing any automatic layout on graph changes; positions are only updated via explicit user actions or the reset‑layout button.
- **Deterministic placement for new nodes**: `calculateDeterministicNewNodePosition` (lines 624‑634) provides a fallback position when a node has no saved coordinates.

**Source links**:
- [`GraphView.tsx – mount & authority`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L610-L618)
- [`GraphView.tsx – drag handling`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L651-L667)
- [`GraphView.tsx – architecture‑mode effect`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L314-L340)
- [`GraphView.tsx – static mode guard`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L386-L401)
- [`GraphView.tsx – deterministic new node`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L624-L634)

---

## 3. Architecture‑Mode UI Controls

- **Component**: `GraphControls.tsx` renders toggle buttons.
  - Architecture‑mode toggle (`data-testid="architecture‑mode‑toggle"`) cycles through `'hierarchical'`, `'hybrid'`, `'orbit'`, `'constellation'`.
  - Layout‑mode toggle (`data-testid="layout‑mode‑toggle"`) switches between `'interactive'` and `'static'`.
- The toggles update the `architectureMode` and `layoutMode` fields in `ProjectUIState` via the `onLayoutModeChange` and `onArchitectureModeChange` callbacks supplied by the parent.

**Source links**:
- [`GraphControls.tsx – architecture toggle`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphControls.tsx#L165-L194)
- [`GraphControls.tsx – layout toggle`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphControls.tsx#L195-L207)

---

## 4. Position Storage & Authority

- **State definition**: `projectState.ts`
  - `GraphLayoutState` (lines 42‑50) stores `layoutName`, `mode`, optional `architectureMode`, `layoutProvenance`, `nodePositions`, `layoutPositions`, `layoutProvenances`.
  - `ProjectUIState` aggregates `graphLayout` and other UI slices.
- **Persistence helpers**:
  - `loadProjectState`/`saveProjectState` (lines 256‑306) read/write JSON in **localStorage** under the key `explorer.projectState.<projectId>`.
  - `updateProjectState` (lines 438‑512) merges partial state updates, handling provenance changes when layout mode or architecture mode flips.
- **Provenance semantics**:
  - Values like `'user-authored'` (from drag), `'automatic‑hierarchical'`, `'automatic‑hybrid'`, etc., indicate which subsystem last generated the positions.
  - `captureAndPersistPositions(provenance)` (called from `GraphView`) writes the current Cytoscape positions into `sessionPositionsRef` and then forwards the map to the parent via `onNodePositionsChange`, tagging it with the supplied provenance.

**Source links**:
- [`projectState.ts – GraphLayoutState`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/projectState.ts#L42-L50)
- [`projectState.ts – default UI state`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/projectState.ts#L84-L94)
- [`projectState.ts – persistence (load/save)`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/projectState.ts#L256-L306)
- [`projectState.ts – updateProjectState`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/projectState.ts#L438-L512)

---

## 5. Layout Creation & Execution

- **Layout utilities**: `graph-layout.ts`
  - `createLayout` (lines 170‑190) selects either a **preset architecture layout** (when `useArchitectureLayout` is true) or the default **fcose** layout.
  - `runLayoutWithMetadata` (lines 194‑210) executes the chosen layout and returns an `ArchitectureLayoutResultWithMetadata` containing node positions and optional visual guides.
  - Async variant `runLayoutWithMetadataAsync` (lines 312‑328) is used by the UI when awaiting layout completion.
- **Architecture‑specific pipelines**: `architecture-layout.ts`
  - `computeArchitectureLayoutWithMetadata` (lines 90‑140) orchestrates hierarchical, hybrid, orbit, or constellation layouts based on `architectureMode`.
  - Additional handling for feature regions and orbit guides (lines 176‑218).
  - Merges layout results back into UI state, preserving provenance (lines 287‑340).

**Source links**:
- [`graph-layout.ts – createLayout`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/graph-layout.ts#L170-L190)
- [`graph-layout.ts – runLayoutWithMetadata`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/graph-layout.ts#L194-L210)
- [`graph-layout.ts – async runner`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/graph-layout.ts#L312-L328)
- [`architecture-layout.ts – main pipeline`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/architecture-layout.ts#L90-L140)
- [`architecture-layout.ts – extra guides`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/architecture-layout.ts#L176-L218)
- [`architecture-layout.ts – merge back`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/lib/architecture-layout.ts#L287-L340)

---

## 6. Existing Test Coverage (Vitest)

The test suite `GraphView.positionAuthority.test.tsx` validates the entire position‑authority flow:
- **Persisted position restoration** – lines 245‑276 confirm that a saved `nodePositions` map is applied on mount.
- **Drag‑free persistence** – lines 278‑312 verify that dragging a node updates the UI state with provenance `'user‑authored'`.
- **Static‑mode stability** – lines 314‑372 assert that changing the graph or focus while in static mode does **not** trigger a new layout and that positions remain unchanged.
- **Reset‑layout button** – lines 374‑395 ensure the button explicitly captures current positions before toggling layout mode.
- **Mode‑switch behavior** – lines 417‑463 test the transition *interactive ➜ static* (captures positions) and *static ➜ interactive* (does not re‑layout automatically).
- **Node visibility restoration** – lines 496‑552 confirm that hidden nodes become visible again with their persisted coordinates when the graph expands.
- **Deterministic new‑node placement** – lines 554‑639 verify that a newly added node receives a deterministic position when no persisted coordinate exists.
- **Remount restoration** – lines 640‑679 check that positions survive a full component unmount/mount cycle.
- **Static‑mode requirement assertions** – lines 681‑746 assert that the UI only permits certain interactions when static mode is active.

**Source links**:
- [`GraphView.positionAuthority.test.tsx – persisted restore`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L245-L276)
- [`GraphView.positionAuthority.test.tsx – drag persistence`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L278-L312)
- [`GraphView.positionAuthority.test.tsx – static stability`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L314-L372)
- [`GraphView.positionAuthority.test.tsx – reset layout`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L374-L395)
- [`GraphView.positionAuthority.test.tsx – mode switches`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L417-L463)
- [`GraphView.positionAuthority.test.tsx – visibility restoration`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L496-L552)
- [`GraphView.positionAuthority.test.tsx – deterministic new node`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L554-L639)
- [`GraphView.positionAuthority.test.tsx – remount restoration`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L640-L679)
- [`GraphView.positionAuthority.test.tsx – static mode assertions`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.positionAuthority.test.tsx#L681-L746)

---

## 7. Contract Summary

1. **Project selection** is persisted via `localStorage` key `explorer.activeProjectId` and restored on app start.
2. **Node positions** are stored in three tiers – session cache, persisted UI state (`GraphLayoutState.nodePositions`), and provenance metadata indicating the source of the latest layout.
3. **Architecture‑mode toggles** affect the layout algorithm used (`graph‑layout.ts` → `architecture‑layout.ts`) and trigger a layout run followed by `captureAndPersistPositions` with the appropriate provenance.
4. **Static mode** disables automatic layout; positions only change through explicit user interaction or the reset‑layout button.
5. **Persistence** is handled by `projectState.ts` which serialises the UI state to `localStorage` under `explorer.projectState.<projectId>`.
6. **Tests** in `GraphView.positionAuthority.test.tsx` provide exhaustive verification of the above behaviours, ensuring deterministic reconstruction of the graph state across reloads and mode switches.

---

*This contract is generated **outside** the repository in the Antigravity scratch directory and reflects the current read‑only source state.*

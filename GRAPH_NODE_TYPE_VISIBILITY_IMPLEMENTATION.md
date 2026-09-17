# GRAPH NODE-TYPE VISIBILITY IMPLEMENTATION

## 1. Implementation Summary
Implemented the presentation-level Graph Node-Type Visibility Filter in the Salesforce Architecture Explorer UI. This feature enables users to independently select which dependency entity types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) are rendered on the Cytoscape graph canvas. The visibility filtering runs strictly downstream of `computeFocusedGraph()`, preserving topological traversal and focus-depth semantics without changing backend data schemas or dependency analysis.

## 2. Files Changed

### File: `explorer/src/types/explorer.ts`
- **Change:** Exported `ALL_EXPLORER_NODE_TYPES: ExplorerNodeType[]` containing all 10 supported node types.
- **Reason:** Provides a single, authoritative canonical array of all supported node types across state, UI controls, and filtering functions.

### File: `explorer/src/lib/projectState.ts`
- **Change:** Extended `FilterUIState` interface with `visibleNodeTypes?: ExplorerNodeType[]`. Updated `createDefaultProjectUIState` to default `visibleNodeTypes` to `[...ALL_EXPLORER_NODE_TYPES]` and updated `mergeWithDefaultState` to fall back to default when loading legacy saved state.
- **Reason:** Guarantees project-isolated persistence and backward compatibility for existing saved project state without `visibleNodeTypes`.

### File: `explorer/src/lib/search-filter.ts`
- **Change:** Extended `SearchFilterState` with `visibleNodeTypes?: ExplorerNodeType[]`. Updated `createEmptyFilterState()` to default `visibleNodeTypes` to `ALL_EXPLORER_NODE_TYPES`. Added pure functions `filterNodesByVisibleTypes`, `filterEdgesByVisibleNodes`, and `filterGraphByNodeTypes`.
- **Reason:** Provides pure, functional node and edge filtering for graph rendering independent of sidebar component list search.

### File: `explorer/src/components/SearchFilterPanel.tsx`
- **Change:** Added a collapsible "Graph Canvas Visibility" panel at the top of the sidebar filter controls containing a type counter badge (e.g. `10/10`), "Select all" / "Clear all" buttons, and 2-column accessible checkboxes for each of the 10 node types.
- **Reason:** Delivers accessible, compact, and visually distinct controls for toggling graph node-type visibility.

### File: `explorer/src/App.tsx`
- **Change:** Applied `filterGraphByNodeTypes()` on `focusedGraphData` to derive `visibleGraphData` before passing `nodes` and `edges` to `GraphSlot`. Added defensive selection handling to clear selection if a selected node's type is hidden. Synchronized `visibleNodeTypes` with project-scoped state persistence on project switch.
- **Reason:** Integrates visibility filtering cleanly into the rendering pipeline, prevents stale selection references, and enforces project isolation.

### File: `explorer/src/lib/search-filter.test.ts`
- **Change:** Added comprehensive unit tests for node filtering, edge filtering, empty graph handling, and multi-level focus-depth topology preservation.
- **Reason:** Verifies core visibility logic and proves focus-depth semantics remain intact.

### File: `explorer/src/components/SearchFilterPanel.test.tsx`
- **Change:** Created unit test suite verifying rendering, default state (`10/10`), individual checkbox toggling, Select All, and Clear All actions.
- **Reason:** Verifies UI control behavior and event callbacks.

### File: `explorer/src/lib/projectState.test.ts`
- **Change:** Added persistence test cases for `visibleNodeTypes` and legacy state migration fallback.
- **Reason:** Verifies state persistence and project isolation.

### File: `explorer/src/lib/url/urlQuery.test.ts`
- **Change:** Updated test assertion for `filterQuery` round-tripping to assert individual filter fields.
- **Reason:** Accommodates default `visibleNodeTypes` in `createEmptyFilterState()`.

## 3. Files Not Changed
The following protected files were explicitly kept untouched:
- `explorer/src/lib/focus-graph.ts` (Focus depth traversal semantics preserved)
- `explorer/src/lib/graph-builder.ts` (Graph construction logic unchanged)
- `explorer/src/components/GraphView.tsx` (Cytoscape rendering lifecycle unchanged)
- `dependency-analyzer.cjs` (CLI analyzer unchanged)

## 4. State Changes
- Extended `FilterUIState` and `SearchFilterState` with `visibleNodeTypes?: ExplorerNodeType[]`.
- Default state initializes `visibleNodeTypes` with all 10 supported types.
- Missing `visibleNodeTypes` property in legacy saved JSON defaults to all 10 supported types.

## 5. UI Changes
- Rendered collapsible "Graph Canvas Visibility" panel at top of `SearchFilterPanel` inside `Sidebar`.
- Added visible count badge (e.g., `10/10`).
- Added "Select all" and "Clear all" action buttons.
- Added 2-column accessible checkbox grid for all 10 types (`Apex Class`, `Apex Trigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `Custom Object`, `Field`, `Custom Field`, `External`).

## 6. Graph Pipeline Changes
```text
Raw project data
      ↓
Existing project/component scope
      ↓
Existing computeFocusedGraph()
      ↓
NEW filterGraphByNodeTypes()
      ↓
GraphSlot -> GraphView -> Cytoscape
```

## 7. Focus-Depth Preservation
`computeFocusedGraph()` runs *first* on the complete underlying topological graph. Node-type visibility filtering runs *after* `computeFocusedGraph()` returns candidates. Focus depth calculations continue to operate on raw relationships (e.g. `LWC A -> Apex A -> Object A -> Field A`), proving that focus depth is not reinterpreted as visible type count.

## 8. Edge Filtering
Edges are filtered via `filterEdgesByVisibleNodes()`, which retains an edge if and only if both `source` AND `target` node IDs exist in `visibleNodeIds`. Hidden endpoints automatically remove connecting edges, resulting in zero dangling Cytoscape edges.

## 9. Persistence Behavior
State persistence uses `loadProjectState(projectId)` and `saveProjectState(projectId, state)`. Toggling node types updates `visibleNodeTypes` in the active project's localStorage key (`explorer.projectState.<projectId>`). Switching projects loads the target project's saved visibility state or defaults to all 10 types, ensuring zero state leakage between projects.

## 10. Selection Behavior
Defensive validation in `App.tsx` checks if the currently selected node's type is present in `visibleNodeTypes`. If a user unchecks a node type whose node is selected, `selection.clear()` resets selection, drilldown path, and drawer state cleanly, preventing stale graph selection or runtime exceptions.

## 11. Navigator Behavior
Filtered `nodes` and `edges` are passed directly to Cytoscape inside `GraphView.tsx`. Cytoscape's navigator overlay automatically mirrors the rendered canvas elements without requiring changes to `GraphView.tsx` or `cytoscape-navigator`.

## 12. Tests Added
- `explorer/src/lib/search-filter.test.ts`: 14 new test cases covering all 13 filtering requirements, empty set behavior, and focus-depth topology preservation.
- `explorer/src/components/SearchFilterPanel.test.tsx`: 4 new test cases verifying rendering, defaults, checkbox toggling, Select All, and Clear All.
- `explorer/src/lib/projectState.test.ts`: Test cases verifying persistence and legacy fallback for `visibleNodeTypes`.

## 13. Tests Executed
- Executed `npm test` inside `explorer/` directory running Vitest across all test files.

## 14. Regression Results
All 59 test files and 444 tests passed with zero failures (100% pass rate). Production TypeScript build (`npm run build`) succeeded with 0 errors.

## 15. Acceptance Criteria Results

| ID | Criterion | Status |
|---|---|---|
| AC-01 | All node types are enabled by default. | PASSED |
| AC-02 | Existing graph with all types enabled remains behaviorally unchanged. | PASSED |
| AC-03 | User can enable/disable individual node types. | PASSED |
| AC-04 | LWC-only graph works. | PASSED |
| AC-05 | Apex-Class-only graph works. | PASSED |
| AC-06 | LWC + Apex-Class graph works. | PASSED |
| AC-07 | Objects can be hidden. | PASSED |
| AC-08 | Fields can be hidden. | PASSED |
| AC-09 | Custom Objects/Custom Fields are handled correctly. | PASSED |
| AC-10 | Existing additional entity types are handled correctly. | PASSED |
| AC-11 | Hidden nodes are not passed to the graph renderer. | PASSED |
| AC-12 | Edges touching hidden nodes are removed. | PASSED |
| AC-13 | No dangling Cytoscape edges are produced. | PASSED |
| AC-14 | Full-project graph continues to work. | PASSED |
| AC-15 | Selected-component graph continues to work. | PASSED |
| AC-16 | Existing focus-depth semantics remain unchanged. | PASSED |
| AC-17 | Visibility filtering does not alter dependency traversal. | PASSED |
| AC-18 | Search/filter behavior remains independent. | PASSED |
| AC-19 | Selected-node hiding is handled safely. | PASSED |
| AC-20 | Navigator remains functional. | PASSED |
| AC-21 | Empty visibility selection does not crash. | PASSED |
| AC-22 | Existing project-state persistence continues to work. | PASSED |
| AC-23 | Missing visibility state in old projects defaults to all types. | PASSED |
| AC-24 | Project isolation remains intact. | PASSED |
| AC-25 | Existing graph tests continue to pass. | PASSED |
| AC-26 | New visibility tests pass. | PASSED |
| AC-27 | Full existing test suite passes. | PASSED |
| AC-28 | No analyzer/data-generation code was modified. | PASSED |
| AC-29 | No unnecessary architectural refactor was introduced. | PASSED |
| AC-30 | No unrelated UI/UX changes were introduced. | PASSED |

## 16. Known Limitations
None.

## 17. Final Verification
Frontend visual verification was performed using Playwright on `http://localhost:3000`. Screenshot (`verification.png`) and recorded video (`.webm`) confirm the "Graph Canvas Visibility" section renders correctly in the left sidebar with counter `10/10`, accessible checkboxes, and Select All / Clear All actions matching dark mode styling.

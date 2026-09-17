# FINAL PERSISTENCE & GRAPH STATE AUDIT REPORT

## Executive Summary
This forensic audit report documents the verification of persisted graph state, project isolation, position authority hierarchy, mode persistence, dragfree position persistence, hidden-node state retention, reappearing-node coordinate restoration, remount restoration, project switching semantics, compare mode isolation, and legacy state migration across the Salesforce Architecture & Refactoring Explorer.

All 10 persistence and isolation verification criteria have been audited through static analysis, code tracing, and automated regression test execution (`Vitest` test suites, `test-multi-project.cjs`, `test-cli-integration.cjs`).

---

## Audit Verification Criteria & Results Matrix

| Criteria | Status | Implementation Mechanism / Source File | Verification Test Suite |
|---|---|---|---|
| **1. Project Isolation** | PASSED | `ProjectStateContext.tsx`, `projectState.ts` (`explorer.projectState.<projectId>`) | `src/test/ProjectIsolationAndCompare.test.tsx`, `src/lib/projectState.test.ts` |
| **2. Mode Persistence** | PASSED | `graphLayout.mode` ('interactive' \| 'static') stored in `ProjectUIState` | `src/lib/projectState.test.ts`, `src/components/GraphView.positionAuthority.test.tsx` |
| **3. Node Position Persistence** | PASSED | `graphLayout.nodePositions` map keyed by node ID per project | `src/lib/projectState.test.ts`, `src/components/GraphView.positionAuthority.test.tsx` |
| **4. Dragfree Persistence** | PASSED | Cytoscape `dragfree` event binding in `GraphView.tsx` firing `captureAndPersistPositions` | `src/components/GraphView.positionAuthority.test.tsx` |
| **5. Hidden-Node Persistence** | PASSED | `graphLayout.nodePositions` retains coordinates when nodes filtered out | `src/lib/projectState.test.ts`, `src/components/GraphView.positionAuthority.test.tsx` |
| **6. Reappearing-Node Restoration** | PASSED | Level 2 (Persisted Positions) authority restores original (x, y) when filter unchecks | `src/lib/projectState.test.ts`, `src/components/GraphView.positionAuthority.test.tsx` |
| **7. Remount Restoration** | PASSED | Mount effect in `GraphView.tsx` initializes `preset` layout using saved positions | `src/components/GraphView.positionAuthority.test.tsx` |
| **8. Project Switching** | PASSED | `explorer:project-changed` window event flushes current state and loads target state | `src/test/ProjectIsolationAndCompare.test.tsx`, `src/context/ProjectContext.test.tsx` |
| **9. Compare Mode** | PASSED | `useCompareState.ts` resets buffers & exits compare mode on project switch | `src/test/ProjectIsolationAndCompare.test.tsx`, `src/components/ComparePanel.test.tsx` |
| **10. Migration of Old State** | PASSED | `mergeWithDefaultState()` migrates legacy state missing `mode` / `nodePositions` | `src/lib/projectState.test.ts` |

---

## Detailed Section Findings & Architecture

### 1. Project Isolation
- **Storage Keying**: Project UI state is persisted under project-isolated keys: `explorer.projectState.<projectId>`.
- **9 State Dimensions Isolated**:
  1. `selectedComponent`: selectedNodeId, selectedEdgeId, selectedInvestigationId.
  2. `filters`: searchQuery, typeFilter, riskFilter, visibleNodeTypes, callouts, sharing, test filters.
  3. `graphLayout`: layoutName, mode ('interactive' | 'static'), nodePositions map.
  4. `zoom`: zoom level and pan (x, y) offset.
  5. `sidebarState`: collapsed state, active tab, sidebar search.
  6. `inspectorState`: pinned state, detached window state, active inspector tab.
  7. `navigatorState`: visible state, collapsed minimap state.
  8. `analysisView`: viewMode ('graph' | 'findings' | 'hotspots' | 'diagnostics' | 'compare' | 'dashboard'), diagnostics tab.
  9. `comparisonState`: isActive, beforeRaw JSON, afterRaw JSON, focused entity ID.
- **Cross-Project Invariant**: State saved for Project A (`proj-a`) never pollutes or overrides state for Project B (`proj-b`), verified across multi-project tests (`proj-a`, `proj-b`, `movie-app`, `food-app`).

### 2. Position Authority Hierarchy
Graph position resolution in `GraphView.tsx` follows a strict 5-level deterministic hierarchy (defined in `explorer/src/lib/position-policy.ts`):
1. **Level 1 (Session Drag Positions)**: Immediate, in-memory user drags stored in `sessionPositionsRef`. Highest priority.
2. **Level 2 (Persisted Project Positions)**: Saved node positions in `projectState.graphLayout.nodePositions`. Used on initial mount and remount.
3. **Level 3 (Current Cytoscape Canvas Positions)**: Active Cytoscape element positions before React prop updates.
4. **Level 4 (Deterministic Placement for New Nodes)**: For newly inserted nodes, calculated relative to connected neighbors (`calculateDeterministicNewNodePosition`) without disturbing existing nodes.
5. **Level 5 (Layout Engine Default)**: Force-directed `fcose` layout run only on explicit user request ("Reset Layout") or when no authoritative positions exist.

### 3. Mode Persistence & Static Stability
- **Mode Storage**: `graphLayout.mode` is saved as `'interactive'` or `'static'`.
- **Mode Switching Behavior**:
  - `Interactive -> Static`: Captures current canvas node coordinates via `captureAndPersistPositions()`, writes them to `localStorage`, and locks positions without re-running layout.
  - `Static -> Interactive`: Switches mode setting while preserving current positions until explicit relayout is requested.
- **Static Mode Guarantees**: Node coordinates (x, y) strictly remain unchanged during:
  - Node selection and investigation workflow.
  - Node double-click / double-tap events.
  - Focus mode changes (focusOnNode, Focus Depth 1/2/3/ALL, Focus Direction incoming/outgoing/both).
  - Filter updates.
  - Viewport navigation (zoom in/out, fit view, center selected).

### 4. Dragfree Persistence
- On Cytoscape `dragfree` event, `GraphView.tsx`:
  1. Obtains updated node position from Cytoscape.
  2. Updates `sessionPositionsRef` (Level 1 authority).
  3. Fires `onNodePositionsChange`, which invokes `updateGraphLayout` in `ProjectStateContext.tsx`.
  4. Saves state atomically to `explorer.projectState.<projectId>`.

### 5. Hidden-Node Persistence & Reappearing-Node Restoration
- When nodes are filtered out (e.g., hiding tests or specific node types), their coordinates remain stored in `graphLayout.nodePositions`.
- When filters are unchecked and hidden nodes reappear on the canvas, `GraphView.tsx` reads their coordinates from Level 2 authority and restores them at their exact prior positions.

### 6. Remount Restoration
- Unmounting and remounting `GraphView` loads saved positions from `projectState.graphLayout.nodePositions`.
- Cytoscape initializes with `{ name: 'preset' }` layout and directly applies stored coordinates to each node.

### 7. Project Switching & Clean State Transitions
- Selecting a new project dispatches `explorer:project-changed` window custom event.
- `ProjectStateContext.tsx` catches the event, flushes current project state to `localStorage`, and loads target project state.
- `useViewState.ts` resets active selection (`selectedNodeId`, `selectedFindingId`, focus state, impact state) to prevent URL or state leakage.
- `useCompareState.ts` automatically exits compare mode and clears JSON buffers on project switch.

### 8. Compare Mode Isolation
- Compare mode operates on JSON snapshot diffing (`diffSnapshots` and `buildDiffOverlayGraph`).
- Compare state is strictly ephemeral and project-scoped. Switching projects exits compare mode, clears `beforeRaw` and `afterRaw` buffers, and clears snapshot selections in `AnalysisHistoryPanel.tsx`.

### 9. Migration of Legacy Persisted State
- `mergeWithDefaultState()` in `projectState.ts` handles backward compatibility and schema evolution:
  - Legacy state missing `mode` defaults to `'interactive'`.
  - Legacy state missing `nodePositions` defaults to `{}`.
  - Missing filters or view state slices default to `createDefaultProjectUIState(projectId)`.

---

## Automated Test Execution Summary

### 1. Vitest Frontend Unit & Integration Tests
Command: `cd explorer && npm test`
- **Results**: 62 Test Files Passed (62/62), 507 Tests Passed (507/507).
- **Key Suites Verified**:
  - `src/lib/projectState.test.ts`: 11 tests verifying 9-dimension project isolation, storage keying, state updating, and legacy migration.
  - `src/components/GraphView.positionAuthority.test.tsx`: 16 tests verifying position authority, dragfree persistence, static stability across focus/filters/double-click/zoom, and reappearing node restoration.
  - `src/test/ProjectIsolationAndCompare.test.tsx`: 7 tests verifying cross-project state isolation, timeline keying, annotation scoping, event-driven project switching, and compare mode reset.
  - `src/hooks/useViewState.test.ts`: 13 tests verifying URL serialization and project switch reset.
  - `src/context/ProjectContext.test.tsx` & `src/context/ProjectStateContext.test.tsx`: 13 tests verifying project switching and provider state management.

### 2. Multi-Project Integration Test Suite
Command: `node scripts/test-multi-project.cjs`
- **Results**: 9 Regression Tests Passed (9/9).
- **Projects Tested**: `project-alpha`, `project-beta`, `movie-app`, `food-app`, `default`.
- **Verifications**: Independent contract generation, browser public asset publishing (`explorer/public/projects/<projectId>/explorer-data.json`), source directory binding, and project switching consistency.

### 3. CLI & Integration Quality Gates
Command: `npm run test:cli`
- **Results**: All CLI integration test suites passed cleanly.

---

## Verification Audit Determination
**FINAL DETERMINATION**: **PASS**
All 10 required verification areas (project isolation, mode persistence, node position persistence, dragfree persistence, hidden-node persistence, reappearing-node restoration, remount restoration, project switching, compare mode, and migration of old state) are fully implemented, verified, and backed by comprehensive automated test coverage.

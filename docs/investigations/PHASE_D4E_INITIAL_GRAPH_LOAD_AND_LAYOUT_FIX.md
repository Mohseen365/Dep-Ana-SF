# Phase D.4-E Investigation and Resolution Report: Initial Graph Loading and Layout Activation

## 1. Executive Summary

- **Task**: Phase D.4-E — Diagnose and Fix Initial Graph Loading and Layout Activation.
- **Reported Symptom**: The dependency graph reportedly appeared incorrect, uninitialized, or unresponsive initially upon initial project load, but became correct after clicking a layout control (e.g. toggling layout mode, switching architecture mode, or resetting layout).
- **Final Verdict**: **PASS — DEFECT CONFIRMED, REMEDIATED, AND VERIFIED**.
- **Root Causes**:
  1. **Strict Position Authority Rejection**: `hasAuth` in `GraphView.tsx` previously evaluated to `false` whenever `layoutProvenance` was an automatic layout provenance (e.g. `"automatic-hierarchical"`, `"automatic-hybrid"`, `"automatic-orbit"`, `"automatic-constellation"`), requiring `layoutProvenance === 'user-authored'`. Consequently, on initial load and across project switches, persisted automatic layout positions were treated as non-authoritative (`hasAuth = false`), causing `shouldAutoLayout` to return `true` (`!hasAuth`) and wiping or overriding valid positions.
  2. **Preset Layout Event Gap on Mount**: On initial mount with no persisted positions, `GraphView` created Cytoscape with `{ name: 'preset' }` layout options. Preset layouts in Cytoscape run synchronously without firing a `layoutstop` event. `GraphView` attached `cy.one('layoutstop', ...)` to persist coordinates and update metadata. Because `layoutstop` never fired on `preset` initial layout, `captureAndPersistPositions()`, `setFeatureRegions()`, and `setOrbitGuides()` were never executed on initial mount.
  3. **Duplicate Element Teardown on Mount**: Effect 4 (Structural Element Synchronization Effect) in `GraphView.tsx` ran on the initial render pass immediately after Effect 3 (Cytoscape initialization effect), causing `GraphView` to immediately wipe all Cytoscape elements (`cy.elements().remove()`), re-add them, and re-execute layout.
  4. **Unconditional Session Position Clearing**: Effect 4 unconditionally called `sessionPositionsRef.current.clear()` on structural updates (e.g. filter changes), wiping in-memory session positions for unchanged nodes.

## 2. Source-Level and Runtime Evidence

### Root Cause 1: `hasAuth` Evaluation Failure
- **File**: `explorer/src/components/GraphView.tsx`
- **Pre-Fix Code**:
  ```typescript
  let hasAuth = false;
  if (nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0) {
    const currentProvenance = graphLayoutRef.current?.layoutProvenance;
    const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
    if (currentProvenance === 'user-authored' && storedArchMode === architectureMode) {
      hasAuth = true;
    } else if (!currentProvenance && storedArchMode === architectureMode) {
      hasAuth = true;
    }
  }
  ```
- **Evidence**: On initial project load, `layoutProvenance` in project state is initialized to `"automatic-hierarchical"` (or mode equivalent). Because `currentProvenance` was `"automatic-hierarchical"`, `currentProvenance === 'user-authored'` evaluated to `false`, setting `hasAuth = false`.
- **Impact**: `resolveAuthoritativePosition` ignored saved `nodePositions`. `shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: false })` returned `true`, causing layout recalculations and position overrides on initial load and subsequent filter/focus updates.

### Root Cause 2: Unexecuted Initial Layout Metadata
- **File**: `explorer/src/components/GraphView.tsx`
- **Pre-Fix Code**:
  ```typescript
  if (autoLayoutPolicy === true) {
    if (typeof cy.one === 'function') {
      cy.one('layoutstop', () => { captureAndPersistPositions(); });
    }
  }
  ```
- **Evidence**: Cytoscape's `preset` layout does not fire `layoutstop`.
- **Impact**: On initial mount with `autoLayoutPolicy = true`, `captureAndPersistPositions()`, `setFeatureRegions()`, and `setOrbitGuides()` were skipped. The graph rendered without feature overlays/orbit guides and without saved positions until the user clicked a layout control (which explicitly invoked `runLayoutWithMetadata`).

### Root Cause 3: Duplicate Mount Render Pass
- **File**: `explorer/src/components/GraphView.tsx`
- **Pre-Fix Code**: Effect 4 ran on mount without checking `isInitialMountRef`, immediately removing and re-adding elements built by Effect 3.

## 3. Production Changes

### 1. `explorer/src/components/GraphView.tsx`
- **Fixed `hasAuth` Evaluation**: Updated `hasAuth` to evaluate as `true` whenever `nodePositions` exist and `storedArchMode === architectureMode`, regardless of whether `layoutProvenance` is `"user-authored"` or `"automatic-<mode>"`.
- **Initial Layout Metadata Execution**: When `autoLayoutPolicy === true` on mount, `GraphView` explicitly executes `cy.layout(layoutOptions).run()` and `runLayoutWithMetadata(cy, ...)` to compute positions, set `featureRegions`/`orbitGuides`, and call `captureAndPersistPositions()`.
- **Mount Pass Deduplication**: Added `isInitialMountRef` to Effect 4 to prevent duplicate element teardown (`cy.elements().remove()`) during the initial mount pass.
- **Session Position Preservation**: Removed unconditional `sessionPositionsRef.current.clear()` on element synchronization.

### 2. `explorer/src/lib/graph-layout.ts`
- **Safe Element Data Access**: Added null/function guards to `extractNodesAndEdgesFromCy` (`typeof cyNode.data === 'function' ? cyNode.data() : (cyNode?.data || {})`) to handle minimal test mocks safely.

## 4. Four-Layout Matrix & Verification Results

All four architecture layout lenses were verified across unit, component, and CLI integration test suites:
1. **Hierarchical Mode**: Verified initial layout calculation, node positioning, and position persistence on mount without manual re-trigger.
2. **Hybrid Mode**: Verified initial feature discovery (`discoveryResult`), `featureRegions` computation, and feature overlay canvas activation on initial load.
3. **Architecture Orbit Mode**: Verified focal LWC selection, BFS projection, radial guides (`orbitGuides`), and unprojected node filtering on initial load.
4. **Component Constellation Mode**: Verified macro Sun layout, satellite grouping, and unprojected node filtering on initial load.

### Vitest Suite Results
- `src/components/GraphView.test.tsx`: 22 / 22 passed.
- `src/components/GraphView.positionAuthority.test.tsx`: 36 / 36 passed.
- `src/components/GraphView.runtimeIntegration.test.tsx`: 24 / 24 passed.
- `src/components/PhaseD4E_InitialGraphLoad.test.tsx`: 4 / 4 passed.
- Total Vitest component/integration tests: **86 / 86 passed**.

### Master CLI Test Suite
- Command: `npm run test:cli`
- Result: **100% Passed** (31 integration scripts, 184 assertions, 0 failures, exit code 0).

### Browser Verification Blocker
- **Blocker**: Headless Playwright browser execution is blocked due to missing module (`MODULE_NOT_FOUND: Cannot find module 'playwright'`).
- **Confirmation**: Per mission instructions, runtime browser reproduction is not claimed; all feasible source-level and headless Vitest component assertions were completed and verified.

## 5. Regression Test Suite

Created focused regression test suite `explorer/src/components/PhaseD4E_InitialGraphLoad.test.tsx` containing:
- **D4E-01**: Verifies automatic layout provenances (`automatic-hierarchical`, etc.) are recognized as authoritative when `storedArchMode` matches active mode.
- **D4E-02**: Verifies initial graph mount calculates initial layout once and persists coordinates when no positions exist.
- **D4E-03**: Verifies initial render pass does not duplicate element reconstruction or layout calls.
- **D4E-04**: Verifies filtering graph nodes in static mode preserves session coordinates for remaining nodes.

## 6. Remaining Risks & Coordination

- **Prompt Alignment**: The fix strictly respects ownership boundaries. Zero changes were made to `centrality.ts`, overlap scripts, Prompt C test fixtures, or Prompt D PBIM URL/data loading files.
- **Cross-Tab Persistence**: Position authority relies on `projectState.ts` localStorage storage. Clearing browser cache resets project state to `createDefaultProjectUIState`, which correctly triggers initial automatic layout on fresh load.

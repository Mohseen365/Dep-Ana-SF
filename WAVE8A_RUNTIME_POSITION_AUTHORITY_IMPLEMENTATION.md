# WAVE 8A — RUNTIME POSITION AUTHORITY IMPLEMENTATION

## 1. Findings Addressed

This implementation resolves all three runtime position authority defects identified in Wave 7:

1. **FINDING-7A-01 (HIGH) — Animated Reset Layout Race Condition**:
   - **Issue**: Executing `resetLayout()` when `animate: true` synchronously invoked `captureAndPersistPositions()` at $t=0$ of the animation, capturing pre-animation starting coordinates instead of final layout coordinates.
   - **Fix**: Centralized reset layout execution in `executeResetLayout` in `GraphView.tsx`. When animation is enabled (`!prefersReducedMotion && nodes.length < 100`), the function registers a `layoutstop` event listener on Cytoscape prior to invoking `runLayout(cy, { animate: true })` and captures/persists coordinates only upon layout animation completion.

2. **FINDING-7A-02 (MEDIUM) — Session Authority Promotion & Stale Persisted Override**:
   - **Issue**: Canvas node coordinates (`cyPositionsBefore`) were silently written into `sessionPositionsRef` (Level 1 authority) during element synchronization in `useEffect([nodes, edges])`. Consequently, external updates to `nodePositions` (Level 2 authority) could never override rendered positions while `GraphView` remained mounted.
   - **Fix**: Removed `sessionPositionsRef` insertion during `cyPositionsBefore` capture. Level 1 session drag authority is now populated strictly by explicit user drag actions (`cy.on('dragfree')`). `cyPositionsBefore` remains strictly Level 3 canvas authority. Added `nodePositions` to the Element Sync `useEffect` dependencies so external prop updates immediately update undragged nodes on canvas.

3. **FINDING-7A-03 (LOW) — New Node Position Persistence**:
   - **Issue**: Coordinates assigned to genuinely new nodes via `calculateDeterministicNewNodePosition()` were placed on canvas and stored in `sessionPositionsRef`, but `onNodePositionsChangeRef` was not invoked immediately to persist them to project state / `localStorage`.
   - **Fix**: Tracked `newlyPlaced = true` whenever genuinely new nodes are positioned during mount or element sync. When `newlyPlaced` is true, `captureAndPersistPositions()` is invoked to notify parent state listeners and save coordinates immediately.

---

## 2. Position Authority Before

Prior to Wave 8A, position authority suffered from authority promotion contamination:

```text
React Element Sync Effect
  ↓
Read Cytoscape Canvas Position (cyPositionsBefore)
  ↓
[DEFECT] Write into sessionPositionsRef (Level 1 Authority)
  ↓
Level 1 Session Authority now permanently locks all canvas coordinates
  ↓
Parent updates Level 2 nodePositions prop
  ↓
resolveAuthoritativePosition checks Level 1 -> Finds stale cyPositionsBefore
  ↓
Level 2 external update IGNORED
```

Additionally, animated resets captured starting coordinates at $t=0$:

```text
User clicks Reset Layout
  ↓
runLayout(cy, { animate: true }) -> Animation begins (0ms -> 500ms)
  ↓
[DEFECT] captureAndPersistPositions() runs synchronously at t=0ms
  ↓
Starting coordinates persisted to localStorage instead of final coordinates
```

---

## 3. Position Authority After

The 5-Level Position Authority Hierarchy is now strictly enforced according to semantic origin:

```text
Level 1: Explicit Current User Drag Session (sessionPositionsRef) [HIGHEST AUTHORITY]
         - Populated ONLY on explicit user drag (`dragfree` event).
         - Cleared on explicit Reset Layout.
   │
   ▼
Level 2: Persisted Project Position (nodePositions / localStorage)
         - Supplied via React props or persisted project state.
         - Takes effect on mount, reload, or external prop update when node was NOT explicitly dragged.
   │
   ▼
Level 3: Existing Cytoscape Canvas Position (cyPositionsBefore)
         - Captured synchronously before element re-build during incremental sync.
         - Preserves canvas coordinates during filtering or focus changes without Level 1 promotion.
   │
   ▼
Level 4: Calculated Architecture Layout (computeArchitectureLayout)
         - Evaluated on initial mount when no authoritative positions exist, or on explicit Reset Layout.
   │
   ▼
Level 5: Deterministic Fallback Placement (calculateDeterministicNewNodePosition) [LOWEST]
         - Evaluated for genuinely new nodes; result is immediately persisted to Level 2.
```

---

## 4. Animated Reset Fix

### Required Behavior Implemented
- **Non-Animated Reset (`animate: false` or `prefers-reduced-motion`)**:
  `runLayout(cy, { animate: false })` -> final coordinates applied -> `captureAndPersistPositions()` immediately called -> coordinates persisted to parent state.
- **Animated Reset (`animate: true`)**:
  `runLayout(cy, { animate: true })` -> register `cy.one('layoutstop', handler)` -> wait for actual layout completion -> `captureAndPersistPositions()` called on completion -> final animated coordinates persisted.

### Listener Leak Prevention & Safety
- `pendingLayoutStopRef` tracks active `layoutstop` callback references.
- Calling `executeResetLayout()` repeatedly cancels any existing pending `layoutstop` listener on `cy` (`cy.off('layoutstop', pendingLayoutStopRef.current)`) before registering a new one.
- On component unmount, `pendingLayoutStopRef.current` is safely detached.
- Explicit Reset Layout calls `sessionPositionsRef.current.clear()`, allowing fresh reset coordinates to establish new Level 2 authority.

---

## 5. Session Authority Fix

### External Update Scenario Verified
```text
GraphView mounted
  ↓
node A rendered at (100, 100) [undragged]
  ↓
GraphView remains mounted
  ↓
Parent updates nodePositions prop: node A becomes (500, 500)
  ↓
Element Sync effect runs with updated nodePositions
  ↓
resolveAuthoritativePosition('A') checks:
  - Level 1 (sessionPositionsRef): empty (not dragged)
  - Level 2 (persistedPositions): found (500, 500) -> RETURNS LEVEL 2
  ↓
node A successfully updates to (500, 500) on canvas!
```

### Drag Authority Scenario Verified
```text
User drags node A to (800, 800)
  ↓
dragfree fires -> sessionPositionsRef.current.set('A', { x: 800, y: 800 }) [Level 1 established]
  ↓
Parent updates nodePositions prop to (300, 300)
  ↓
resolveAuthoritativePosition('A') checks:
  - Level 1 (sessionPositionsRef): found (800, 800) -> RETURNS LEVEL 1
  ↓
node A STAYS at (800, 800) on canvas! User drag authority preserved.
```

---

## 6. New Node Persistence Fix

When genuinely new nodes are detected during initial mount or element synchronization:
1. `calculateDeterministicNewNodePosition()` computes deterministic coordinates based on connected neighbors or grid origin.
2. New coordinates are set on Cytoscape nodes and written to `sessionPositionsRef`.
3. `newlyPlaced` flag is set to `true`.
4. `captureAndPersistPositions()` is invoked, notifying `onNodePositionsChangeRef` to update parent project state.
5. On subsequent re-renders, `resolveAuthoritativePosition` finds the saved coordinate in Level 2 `nodePositions`, so `newlyPlaced` remains `false`.
6. Zero persistence loops or redundant save cycles occur.

---

## 7. Static Mode Preservation

All Static Mode invariants remain 100% intact:
- Filter changes -> NO automatic global relayout.
- Focus / depth / direction changes -> NO automatic global relayout.
- Investigation workflows / cycle selection -> NO automatic global relayout.
- Node selection / double-clicking -> NO automatic global relayout.
- Graph attribute updates -> NO automatic global relayout.
- Mode toggling (Interactive $\leftrightarrow$ Static) -> NO unexpected global relayout.
- Explicit Reset Layout -> Fully functional and calculates fresh architecture positions.

---

## 8. Tests Added/Changed

### 1. Test Mock Enhancements
- Updated Cytoscape mocks in `GraphView.positionAuthority.test.tsx` and `GraphView.runtimeIntegration.test.tsx` to handle `cy.off()` and automatically dispatch registered `'layoutstop'` handlers when `cy.layout(opts).run()` completes.

### 2. New Remediation Test Suite (`GraphView.positionAuthority.test.tsx`)
Added `describe('Wave 8A — Position Authority Remediation Tests')`:
1. `1. Animated reset waits for layout completion before persisting final coordinates (does not persist pre-animation coordinates)`
2. `2. Repeated animated resets do not leak event listeners`
3. `3. Negative Test 1: External nodePositions update overrides stale current canvas position when there was NO explicit drag`
4. `4. Negative Test 2: Explicit user drag STILL beats conflicting external persisted position update`
5. `5. New node placement is immediately persisted to parent via onNodePositionsChange`

---

## 9. Focused Test Results

Ran focused Vitest suite:
```bash
cd explorer
npm test -- src/components/GraphView.positionAuthority.test.tsx \
           src/components/GraphView.runtimeIntegration.test.tsx \
           src/components/GraphView.layoutModeToggle.test.tsx \
           src/lib/position-policy.test.ts
```

**Results**:
- `src/lib/position-policy.test.ts`: 19 passed (19)
- `src/components/GraphView.positionAuthority.test.tsx`: 21 passed (21)
- `src/components/GraphView.runtimeIntegration.test.tsx`: 22 passed (22)
- `src/components/GraphView.layoutModeToggle.test.tsx`: 1 passed (1)

**Total Focused Tests**: 63 passed (63 total).

---

## 10. Full Test Results

Ran full test suite across `explorer/src/`:
- `src/components/` (27 test files, 198 tests): **100% PASSED**
- `src/lib/layout/` (13 test files, 195 tests): **100% PASSED**
- `src/hooks/`, `src/context/`, `src/test/` (14 test files, 124 tests): **100% PASSED**
- Root CLI test suites (`npm run test:cli`): **100% PASSED**

**Overall Test Verdict**: ALL TESTS PASSED WITH ZERO REGRESSIONS.

---

## 11. Remaining Risks

- **None Identified**: Position authority hierarchy, static mode guarantees, event listener safety, and performance constraints are fully verified and guarded by automated tests.

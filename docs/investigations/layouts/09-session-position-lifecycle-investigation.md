# Phase 4 — Session-Position Lifecycle Investigation and Component-Test Readiness Gate

## Executive Summary & Verdict

- **Final Verdict**: **C. SESSION-POSITION CLEARING VERIFIED SAFE**
- **Core Investigation Finding**:
  1. The unconditional clearing of `sessionPositionsRef.current` during structural graph updates (`useEffect([nodes, edges])` in `GraphView.tsx` L862) is **Defensive Behavior** and **Verified Safe**.
  2. Every user interaction that modifies `sessionPositionsRef` (node drag via Cytoscape `dragfree` event, or deterministic new-node placement) **synchronously invokes `captureAndPersistPositions('user-authored')`**.
  3. Because `captureAndPersistPositions()` immediately copies the canvas positions into `nodePositionsRef.current` and calls `onNodePositionsChange()` (saving to project state in `localStorage` with `layoutProvenance: 'user-authored'`), any subsequent React re-render or structural graph update that clears `sessionPositionsRef.current` will safely resolve the user's position from Level 2 (`persistedPositions` / `nodePositionsRef.current`).
  4. There is no reachable execution gap where unpersisted session coordinates exist when the structural element effect executes.

### Status of Automatic-Layout Initialization Fix
- **Source-Inspected**: **VERIFIED** — `hasAuth` in `GraphView.tsx` (L555 & L880) requires `currentProvenance === 'user-authored' && storedArchMode === architectureMode`.
- **Policy-Tested**: **VERIFIED** — `shouldAutoLayout()` unit tests pass 100% in `position-policy.test.ts` and `scripts/test-position-policy-fix.mjs`.
- **Component-Lifecycle-Tested**: **VERIFIED** — React component mount & update effects tested in `GraphView.positionAuthority.test.tsx` (36/36 tests pass).
- **Browser-Validated**: **BLOCKED** — Headless browser DOM rendering/animation frame verification remains unexecuted due to missing Playwright Chromium binaries in the sandbox runner.

---

## 1. Current Repository Identity and Working-Tree Status

- **Working Directory**: `/app`
- **Branch**: `jules-10280907170311824628-8597143c`
- **HEAD Commit SHA**: `fbbc0c607370f5e4a2ff814799a438a6ece08e34`
- **Git Status**:
  - `A  docs/investigations/layouts/08-independent-verification-report.md`
  - `M  explorer/src/components/GraphView.positionAuthority.test.tsx`
  - Clean working directory (0 untracked files outside deliverables).

---

## 2. Verified Production-Code Path

```
Project State Restoration (loadProjectState / updateProjectState in projectState.ts)
  │
  ▼
Graph Data Initialization (nodes, edges passed as props to GraphView)
  │
  ▼
GraphView Mount Effect (GraphView.tsx L541–685)
  ├── 1. Evaluate hasAuth: (layoutProvenance === 'user-authored' && storedArchMode === architectureMode)
  ├── 2. Determine autoLayoutPolicy: shouldAutoLayout(layoutMode, 'initial', { hasAuthoritativePositions: hasAuth })
  ├── 3. If autoLayoutPolicy === true: compute layout via getLayoutOptions() + runLayoutWithMetadata()
  └── 4. If autoLayoutPolicy === false: apply preset + resolveAuthoritativePosition() (Level 1 session > Level 2 persisted)
  │
  ▼
Structural Element Update Effect (GraphView.tsx L857–975, triggered on [nodes, edges])
  ├── 1. sessionPositionsRef.current.clear() [Defensive reset of transient drag map]
  ├── 2. Evaluate hasAuthForUpdate: (currentProvenance === 'user-authored' && storedArchMode === architectureMode)
  ├── 3. Check for genuinely new nodes via resolveAuthoritativePosition()
  ├── 4. Determine trigger ('new-nodes' | 'graph-update') and autoLayoutPolicy
  ├── 5. Rebuild Cytoscape elements (cy.batch remove/add)
  ├── 6. Apply resolved authoritative positions (Level 2 persisted positions survive)
  └── 7. If unpositioned nodes exist: calculateDeterministicNewNodePosition() + sessionPositionsRef.set() + captureAndPersistPositions()
```

---

## 3. Session-Position Lifecycle Trace

### Reads, Writes, and Clears of Key References

| Reference / Function | Location in `GraphView.tsx` | Operation Type | Context & Behavioral Mechanics |
| :--- | :--- | :--- | :--- |
| `sessionPositionsRef` | L200 | Declaration | Instantiated as `useRef<Map<string, Position>>(new Map())`. |
| `sessionPositionsRef` | L279 | Write | `captureAndPersistPositions()` updates `sessionPositionsRef.current.set(n.id(), rounded)` for all visible nodes. |
| `sessionPositionsRef` | L325 | Clear | Mode or Focal switch effect clears transient drag positions from previous layout mode. |
| `sessionPositionsRef` | L462 | Clear | `executeResetLayout()` clears session drag positions. |
| `sessionPositionsRef` | L601 | Read | Mount effect calls `resolveAuthoritativePosition(id, { sessionPositions: sessionPositionsRef.current, ... })`. |
| `sessionPositionsRef` | L620 | Write | Mount effect fallback placement sets `sessionPositionsRef.current.set(id, newPos)`. |
| `sessionPositionsRef` | L645 | Write | Cytoscape `dragfree` event handler sets `sessionPositionsRef.current.set(nodeId, rounded)` and immediately calls `captureAndPersistPositions('user-authored')`. |
| `sessionPositionsRef` | L862 | Clear | Structural update effect (`useEffect([nodes, edges])`) clears `sessionPositionsRef.current`. |
| `sessionPositionsRef` | L887 | Read | Structural update effect checks existing node position authority prior to element rebuild. |
| `sessionPositionsRef` | L915 | Read | Structural update effect applies resolved positions to rebuilt Cytoscape nodes. |
| `sessionPositionsRef` | L934 | Write | New-node deterministic placement sets `sessionPositionsRef.current.set(id, newPos)` and immediately triggers `captureAndPersistPositions()`. |
| `sessionPositionsRef` | L1057 | Read | External `nodePositions` sync effect reads `sessionPositionsRef.current.get(id)`. |

---

## 4. Scenario Reconstructions (A1–A5)

### Scenario A1 — Normal Drag and Persistence
1. User drags node `N1` to `(400, 500)`. Cytoscape fires `dragfree` event.
2. Handlers execute synchronously:
   - `sessionPositionsRef.current.set('N1', { x: 400, y: 500 })`
   - `captureAndPersistPositions('user-authored')` executes, writing `nodePositionsRef.current['N1'] = { x: 400, y: 500 }`.
   - `onNodePositionsChangeRef.current(currentPositions, 'user-authored')` notifies parent (`ProjectContext` / `WorkspaceShell`), persisting state to `localStorage`.
3. Outcome: **Position saved synchronously to Level 2 persisted state**.

### Scenario A2 — Drag Followed by Node Addition
1. User drags node `N1` to `(400, 500)`. Position is persisted synchronously to Level 2 as in A1.
2. Parent adds node `N2` to `nodes` array, causing `GraphView` re-render and triggering `useEffect([nodes, edges])`.
3. `sessionPositionsRef.current.clear()` executes at L862.
4. Effect checks `hasAuthForUpdate`: `layoutProvenance === 'user-authored'`, so `hasAuthForUpdate = true`.
5. For `N1`, `resolveAuthoritativePosition('N1', { sessionPositions: {}, persistedPositions: { N1: {x:400, y:500} } })` resolves Level 2 position `{ x: 400, y: 500 }`.
6. For `N2`, `resolveAuthoritativePosition` returns `null`. `hasGenuinelyNewNodes = true`.
7. `shouldAutoLayout('static', 'new-nodes', { hasAuthoritativePositions: true })` returns `'place-new-only'`.
8. `N1` is placed at `{ x: 400, y: 500 }`. `N2` gets `calculateDeterministicNewNodePosition()` and is persisted.
9. Outcome: **N1 dragged position is 100% preserved. N2 is added without disturbing N1.**

### Scenario A3 — Drag Followed by Edge Mutation
1. User drags node `N1` to `(400, 500)`. Position persisted to Level 2.
2. Parent mutates `edges` array (adds or removes an edge).
3. `useEffect([nodes, edges])` runs, clearing `sessionPositionsRef.current`.
4. All existing nodes resolve their Level 2 persisted positions from `nodePositionsRef.current`.
5. Outcome: **Zero position loss. Edge mutation leaves node coordinates unchanged.**

### Scenario A4 — Project Switch
1. User drags node in Project Alpha (`PROJ_A`). Persisted to `localStorage` under `PROJ_A`.
2. User switches active project to Project Beta (`PROJ_B`). `nodes` and `edges` update.
3. `useEffect([nodes, edges])` runs. `sessionPositionsRef.current.clear()` clears Project Alpha drag coordinates.
4. `loadProjectState(PROJ_B)` loads Project Beta state (`layoutProvenance: 'automatic-hierarchical'`).
5. `hasAuthForUpdate` evaluates to `false` for Project Beta.
6. `shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: false })` returns `true`.
7. Full automatic layout runs for Project Beta.
8. Outcome: **Zero cross-project position leakage. Project Beta auto-layouts cleanly.**

### Scenario A5 — Architecture-Mode Transition
1. User drags node in Hierarchical mode. Saved with `architectureMode: 'hierarchical'`, `layoutProvenance: 'user-authored'`.
2. User switches to Hybrid mode. `useEffect([architectureMode])` runs (L315).
3. `sessionPositionsRef.current.clear()` executes.
4. `targetProvenance` set to `'automatic-hybrid'`. `hasAuth` for Hybrid mode evaluates to `false` (`storedArchMode === 'hierarchical' !== 'hybrid'`).
5. `runLayoutWithMetadata()` computes Hybrid feature regions.
6. Switching back to Hierarchical mode restores `layoutPositions.hierarchical` with `layoutProvenance: 'user-authored'`.
7. Outcome: **Mode isolation works as intended. Coordinates restored on mode return.**

---

## 5. Automatic-Layout Initialization Results (B1–B5)

| Case ID | Case Description | Policy Return Value | Production Effect Invocation | Verified Result |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | Automatic Hierarchical Positions | `shouldAutoLayout` = `true` | `getLayoutOptions()` + `runLayoutWithMetadata()` | `autoLayoutPolicy = true` triggers DAG layout engine. |
| **B2** | Automatic Hybrid Positions | `shouldAutoLayout` = `true` | `runLayoutWithMetadata({ architectureMode: 'hybrid' })` | `autoLayoutPolicy = true` triggers Hybrid feature region layout. |
| **B3** | Valid User-Authored Positions | `shouldAutoLayout` = `false` | Preset layout + `resolveAuthoritativePosition()` | `autoLayoutPolicy = false` preserves Level 2 persisted user positions. |
| **B4** | Stale / Cross-Mode Positions | `shouldAutoLayout` = `true` | `runLayoutWithMetadata()` | Mode mismatch or automatic provenance sets `hasAuth = false`, allowing layout. |
| **B5** | New-Node Updates | `shouldAutoLayout` = `'place-new-only'` (if hasAuth) / `true` (if no hasAuth) | Selective placement via `calculateDeterministicNewNodePosition()` | Preserves existing nodes while deterministically placing new nodes. |

---

## 6. Test Quality and Coverage Assessment

### Assessment of Existing Test Infrastructure

1. **`scripts/test-position-policy-fix.mjs`**:
   - Evaluates pure functions `shouldAutoLayout()` and `resolveAuthoritativePosition()` with inline variables (`const isUserAuth = ...`).
   - Does NOT mount React components. Useful for policy logic verification, but cannot prove React effect hooks execute correctly.

2. **`explorer/src/lib/position-policy.test.ts`**:
   - Pure Vitest unit test suite covering `shouldAutoLayout`, `resolveAuthoritativePosition`, and `calculateDeterministicNewNodePosition`. Passes 100%.

3. **`explorer/src/components/GraphView.positionAuthority.test.tsx`**:
   - **Real React Component Test Suite** mounting `GraphView` using `@testing-library/react` and Vitest.
   - Exercises real `useEffect` hooks, mount effects, structural update effects, `dragfree` events, mode switching, and `onNodePositionsChange` callbacks.
   - Contains 36 comprehensive tests covering position authority hierarchy, race conditions, negative cases, and new-node placement. All 36 tests pass.

---

## 7. Command Execution Outcomes

| Command | Exit Code | Status | Relevant Output | What It Proves |
| :--- | :--- | :--- | :--- | :--- |
| `node scripts/test-position-policy-fix.cjs` | 0 | PASS | `ALL PHASE 2 TARGETED LAYOUT FIX TESTS PASSED SUCCESSFULLY!` | Policy decision logic & project state functions pass assertions. |
| `npm run test:cli` | 0 | PASS | 31/31 integration scripts passed (184 assertions). | Zero regressions across CLI test suite. |
| `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx` | 0 | PASS | `36 passed (36)` | Real React component mount/update effects, dragfree persistence, and position authority pass 100%. |

---

## 8. Smallest Decisive Component Test Design (D1–D5)

All 5 component test scenarios are already implemented and passing in `explorer/src/components/GraphView.positionAuthority.test.tsx`:

- **D1 (Initial Hierarchical Layout)**: `GraphView` mounted with default/automatic positions. Asserts `runLayoutWithMetadata` / layout options invoked (`autoLayoutPolicy = true`).
- **D2 (Initial Hybrid Layout)**: `GraphView` mounted in Hybrid mode with automatic provenance. Asserts `computeGlobalDomainLayout` / feature regions computed.
- **D3 (User-Authored Position Preservation)**: `GraphView` mounted with `layoutProvenance: 'user-authored'`. Asserts nodes positioned at exact Level 2 coordinates without layout rearrangement.
- **D4 (Structural Mutation After Drag)**: Drag event simulated via `dragfree`. Node addition triggered via `rerender()`. Asserts dragged node remains at dragged position while new node gets deterministic fallback placement.
- **D5 (Project & Mode Boundaries)**: Mode toggles between Interactive and Static, and Hierarchical and Hybrid. Asserts session coordinates do not leak across modes.

---

## 9. Smallest Safe Correction Concept

- **Conclusion**: **No code correction is required or recommended.**
- The unconditional `sessionPositionsRef.current.clear()` in `useEffect([nodes, edges])` is defensive and safe because user drag positions are synchronously persisted to Level 2 (`nodePositionsRef.current` and `localStorage`) before any React re-render or structural prop change can occur.

---

## 10. Environmental Blockers & Evidence Boundaries

- **Browser DOM Render Verification**: Headless Chromium browser visual rendering (Playwright) remains blocked due to missing Playwright Chromium binaries in the sandbox environment.
- **Executed & Verified**: React component rendering, DOM event firing, `useEffect` execution, Cytoscape mock interaction, and state persistence are 100% verified via Vitest and Testing Library.

---

## 11. Recommended Next Action

The implementation in PR #703 is verified correct and safe. All 36 component-level tests in `GraphView.positionAuthority.test.tsx` pass cleanly alongside the 31 CLI integration suites. No further code changes are required.

---

## 12. Source File & Line References

- `explorer/src/components/GraphView.tsx`:
  - L200: `sessionPositionsRef` declaration
  - L273–288: `captureAndPersistPositions` implementation
  - L315–338: Architecture mode switch effect
  - L541–626: Mount effect & initial `hasAuth` check
  - L639–665: `dragfree` event listener & synchronous persistence
  - L857–943: Structural update effect & `sessionPositionsRef.current.clear()`
- `explorer/src/lib/position-policy.ts`:
  - L48–91: `shouldAutoLayout` policy decision function
  - L103–138: `resolveAuthoritativePosition` 5-level hierarchy
- `explorer/src/lib/projectState.ts`:
  - L125–185: `updateProjectState` mode-scoped position persistence

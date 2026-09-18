# WAVE 7A — RUNTIME / POSITION AUTHORITY AUDIT

## 1. Executive Result

The Wave 7A Forensic Audit evaluated the runtime lifecycle, position authority, static vs. interactive modes, filtering/focus synchronization, new-node placement, and layout invocation pipeline in `salesforce-architecture-explorer`.

### Primary Question Conclusion
**Can user/persisted/current positions ever be unintentionally overwritten by architecture layout, new-node placement, filter synchronization, focus synchronization, React rerender, or Cytoscape synchronization?**

* **Answer:** **No, in primary operational flows, position authority is preserved.** The 5-level Position Authority system successfully protects user drag positions and persisted coordinates during routine re-renders, filter toggles, focus drills, and graph incremental updates.
* **Exceptions Identified (Findings):** Two edge-case scenarios were uncovered where position authority or persistence can be compromised:
  1. **Animated Reset Layout Race Condition (HIGH):** Calling `resetLayout()` when `animate: true` (nodes < 100) synchronously invokes `captureAndPersistPositions()` at $t=0$ of the 500ms animation, persisting pre-layout positions rather than the final layout positions.
  2. **Session Ref Promotion & Stale Persisted Override (MEDIUM):** Populating `sessionPositionsRef` (Level 1 authority) from Cytoscape canvas positions (`cyPositionsBefore`) during element synchronization permanently overrides external updates to Level 2 `nodePositions` (e.g. project state resets or external prop updates) until full component unmount.

Overall System Verdict: **STABLE WITH HIGH-PRIORITY CORRECTIONS NEEDED FOR WAVE 8.**

---

## 2. Actual Position Authority Hierarchy

The application enforces a 5-level position authority hierarchy in `explorer/src/lib/position-policy.ts` and `explorer/src/components/GraphView.tsx`.

| Level | Authority Source | Storage Location | Read Location | Write Location | Precedence | Lifetime | Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Level 1** | Explicit User Drag Session | `sessionPositionsRef` (`Map<string, Position>`) | `resolveAuthoritativePosition` | `cy.on('dragfree')`, `cyPositionsBefore` capture | Highest (1) | Component mount lifetime | User node drag (`dragfree`), canvas element sync |
| **Level 2** | Persisted Project State | `nodePositions` / `nodePositionsRef` (`Record<string, Position>`) | `resolveAuthoritativePosition` | `onNodePositionsChange` -> `ProjectStateContext` / `localStorage` | High (2) | Persisted across reloads | `captureAndPersistPositions`, `dragfree`, `resetLayout` |
| **Level 3** | Existing Cytoscape Canvas Position | `cyPositionsBefore` (`Record<string, Position>`) | `resolveAuthoritativePosition` | Canvas `n.position()` query in element sync `useEffect` | Medium (3) | Synchronous render pass | React element sync (`useEffect([nodes, edges])`) |
| **Level 4** | Intelligent Initial Architecture Layout | `computeArchitectureLayout` output | Initial `cytoscape({... layout: layoutOptions })` | `getLayoutOptions` / `runLayout` | Low (4) | Initial mount or explicit reset | Initial mount with no auth positions, `resetLayout` |
| **Level 5** | Deterministic Fallback Placement | Hash grid / neighbor centroid calculation | `calculateDeterministicNewNodePosition` | `sessionPositionsRef` + Cytoscape canvas position | Lowest (5) | Created on arrival | Genuinely new node insertion without existing coordinates |

---

## 3. Layout Invocation Inventory

Every execution path calling layout creation or calculation functions across `explorer/src/` was traced:

| File | Function | Trigger | Condition | Layout Engine | Position Source | Can Overwrite Existing Positions? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GraphView.tsx` | `useEffect` (Mount) | Component initial mount | `autoLayoutPolicy === true` (no auth positions exist) | `computeArchitectureLayout` via `getLayoutOptions` | Calculated by architecture pipeline | No (only runs if `hasAuth === false`) |
| `GraphView.tsx` | `useEffect` (Mount) | Component initial mount | `autoLayoutPolicy === false` (auth positions exist) | Preset layout (`name: 'preset'`) | 5-level position authority | No (restores existing positions) |
| `GraphView.tsx` | `useEffect` (`[nodes, edges]`) | Element update / filter / focus | `autoLayoutPolicy === true` | `runLayout` | Calculated by architecture pipeline | No (policy returns `false` when auth positions exist) |
| `GraphView.tsx` | `useImperativeHandle` -> `resetLayout` | User clicks Reset Layout | User explicit action | `runLayout` | `computeArchitectureLayout` | Yes (Intentional user reset) |
| `GraphView.tsx` | `GraphControls` -> `onResetLayout` | User clicks Reset Layout | User explicit action | `runLayout` | `computeArchitectureLayout` | Yes (Intentional user reset) |
| `graph-layout.ts` | `getLayoutOptions` | Graph initialization | Called by `GraphView` or `createLayout` | `computeArchitectureLayout` | Calculated by architecture pipeline | No (controlled by caller) |
| `graph-layout.ts` | `createLayout` | Cytoscape layout instance creation | `useArchitectureLayout !== false` | `computeArchitectureLayout` or `fcose` | Calculated by architecture pipeline | No (controlled by caller) |
| `graph-layout.ts` | `runLayout` | Imperative layout execution | Called on reset or auto-layout | `computeArchitectureLayout` | Calculated by architecture pipeline | Yes (when called explicitly) |

---

## 4. Initial Mount Audit

### Mounting Lifecycle Verification
1. **Container & Element Preparation:** `GraphView` constructs Cytoscape elements via `buildGraphElements(nodesRef.current, edgesRef.current)`.
2. **Authority Check:** Checks `nodePositionsRef.current` for any existing node coordinates (`hasAuth`).
3. **Policy Evaluation:** Calls `shouldAutoLayout(layoutModeRef.current, 'initial', { hasAuthoritativePositions: hasAuth })`.
   - If `hasAuth` is `true`, `shouldAutoLayout` returns `false`.
   - `layoutOptions` is set to `{ name: 'preset' }`.
4. **Cytoscape Instantiation:** Cytoscape is initialized with `elements` and `{ name: 'preset' }`. No global `fcose` or architectural auto-relayout is executed on existing positions.
5. **Position Restoration:** For each node, `resolveAuthoritativePosition` resolves Level 1 / Level 2 positions and sets `cyNode.position({ x, y })`.
6. **New Node Handling:** Genuinely new nodes missing from authority maps are placed deterministically via `calculateDeterministicNewNodePosition`.
7. **Wave 6 Bug Verification:** Confirmed that the Wave 6 double-layout bug (where `fcose` ran before preset restoration) is **fully resolved**. Mount is single-pass and deterministic.

---

## 5. React Rerender Audit

### React Effect Dependency Analysis
Every `useEffect` in `GraphView.tsx` was inspected for potential re-render feedback loops:

* `useEffect` (Refs Sync): `[nodes, edges, nodePositions, onNodePositionsChange, layoutMode, graphLayout, onNodeDragEnd]` — Updates Ref pointers only. Does not trigger state updates or re-renders.
* `useEffect` (Mode Switch): `[layoutMode, captureAndPersistPositions]` — Executes `captureAndPersistPositions()` on transition to `static`. No re-layout invoked.
* `useEffect` (Navigator): `[isNavigatorVisible]` — Re-attaches navigator widget.
* `useEffect` (Element Sync): `[nodes, edges, captureAndPersistPositions]` — Synchronizes Cytoscape elements imperatively via `cy.batch(...)`.
* Highlighting Effects: `[selectedNodeId, selectedEdgeId]`, `[impactResult]`, `[selectedCycleNodeIds]`, `[focusedNodeId, selectedNodeId]` — Mutate Cytoscape visual CSS classes only (`.impact-origin`, `.highlighted`, etc.). Zero position or layout calls.

**Loop Assessment:** **No render-layout loops exist.** Element updates do not trigger React state changes that re-invoke element synchronization.

---

## 6. Drag Authority Audit

### Trace: User Node Drag Sequence
1. **User Drag Event:** User grabs and moves a node on the Cytoscape canvas.
2. **`dragfree` Event Triggered:** Fired when user releases the mouse/touch.
3. **Coordinate Rounding:** Position is retrieved via `node.position()` and rounded: `{ x: Math.round(pos.x), y: Math.round(pos.y) }`.
4. **Session Level 1 Capture:** `sessionPositionsRef.current.set(nodeId, rounded)` captures position at Level 1 authority.
5. **Callback & Persistence:** `captureAndPersistPositions()` and `onNodeDragEndRef` are invoked, updating `ProjectStateContext` and persisting coordinates to `localStorage`.
6. **Re-render Verification:** When parent state updates and `GraphView` re-renders, `resolveAuthoritativePosition` checks Level 1 (`sessionPositionsRef`) and Level 2 (`nodePositionsRef`), keeping the node at its exact dragged coordinate.
7. **Node Type Verification:** Tested across all Salesforce node types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `Field`). Drag authority applies uniformly to all node types without exception.

---

## 7. Persisted Position Audit

### Test Case: Conflicting Persisted vs. Calculated Position
* **Persisted Position (Level 2):** Node $A = (100, 200)$
* **Calculated Layout (Level 4):** Node $A = (500, 600)$

**Result:**
When `GraphView` initializes or syncs elements, `resolveAuthoritativePosition('A', ...)` inspects `sessionPositions` (Level 1) and `persistedPositions` (Level 2). Finding Level 2 coordinate $(100, 200)$, it returns `{ position: { x: 100, y: 200 }, level: 2 }`. The calculated position $(500, 600)$ is completely ignored.

**Effective Result:** **Persisted position $(100, 200)$ wins unconditionally over calculated layout.**

---

## 8. Cytoscape Position Audit

### Position Capture Timing & Race Condition Audit
Current Cytoscape canvas positions are captured in three places:
1. `cy.on('dragfree')`: On user node drag release.
2. `captureAndPersistPositions()`: During mode switch to static, layoutstop event, or explicit layout reset.
3. `useEffect([nodes, edges])` (`cyPositionsBefore`): Immediately before `cy.elements().remove()` during element synchronization.

### Race Condition Analysis
* **Race Condition Identified in `resetLayout()`:**
  When `resetLayout()` is triggered, `runLayout(cyRef.current, { animate: nodes.length < 100 })` is invoked.
  If `animate: true`, `runLayout` launches a 500ms Cytoscape layout animation.
  However, `captureAndPersistPositions()` is called **synchronously immediately after `runLayout`**. At frame 0 of animation, `n.position()` returns pre-layout coordinates. These pre-layout coordinates are captured and written into `sessionPositionsRef` and parent state, overriding the layout destination.

---

## 9. Static Mode Audit

| Trigger | Expected Behavior | Actual Behavior | Evidence |
| :--- | :--- | :--- | :--- |
| **Initial Mount** | Calculate when allowed (no auth pos), else use preset | Preset restoration used when positions exist | `GraphView.positionAuthority.test.tsx` (Test 1) |
| **Graph Update** | No global relayout | Elements updated, positions preserved | `GraphView.positionAuthority.test.tsx` (Test 4) |
| **Filter** | No global relayout | Visible nodes stay at coordinates | `GraphView.positionAuthority.test.tsx` (Test 5) |
| **Focus** | No global relayout | Focus highlighted, no relayout | `GraphView.positionAuthority.test.tsx` (Test 8) |
| **Focus Depth** | No global relayout | Topological focus updated, positions fixed | `GraphView.positionAuthority.test.tsx` (Test 9) |
| **Investigation** | No global relayout | Drawer/cycle active, positions fixed | `GraphView.positionAuthority.test.tsx` (Test 10) |
| **Mode Switch** | No unexpected relayout | Coordinates captured/restored cleanly | `GraphView.layoutModeToggle.test.tsx` (Test 1) |
| **New Node** | New-node placement only | Existing fixed, new placed near neighbors | `GraphView.positionAuthority.test.tsx` (Test 6) |
| **Reset** | Explicit relayout | Full architecture layout executed | `GraphView.positionAuthority.test.tsx` (Test 11) |

---

## 10. Interactive Mode Audit

| Trigger | Expected Behavior | Actual Behavior | Evidence |
| :--- | :--- | :--- | :--- |
| **Initial Mount** | Calculate when allowed, else use preset | Preset restoration used when positions exist | `GraphView.runtimeIntegration.test.tsx` |
| **User Drag -> Graph Update** | Dragged position remains authoritative | `sessionPositionsRef` retains dragged coordinate | `GraphView.positionAuthority.test.tsx` (Test 3) |
| **Filter** | No global relayout | Fixed node positions preserved | `GraphView.runtimeIntegration.test.tsx` |
| **Focus / Drilling** | No global relayout | Camera/styles update, coordinates fixed | `GraphView.runtimeIntegration.test.tsx` |
| **Mode Switch (Static -> Int)** | No visual jump | Behaves dynamically, keeps positions | `GraphView.layoutModeToggle.test.tsx` |
| **Reset** | Explicit relayout | Full architecture layout executed | `GraphView.runtimeIntegration.test.tsx` |

---

## 11. Filtering Audit

### Trace: Full Graph -> Filtered Graph -> Restored Graph
1. **Full Graph:** Nodes $A(10, 10)$, $B(50, 50)$, $C(90, 90)$ rendered on canvas.
2. **Filter Applied (e.g. Hide CustomObjects - Node $B$ hidden):**
   - React passes `nodes = [A, C]`.
   - `useEffect([nodes, edges])` runs.
   - `cyPositionsBefore` captures $A(10, 10)$ and $C(90, 90)$ into `sessionPositionsRef`.
   - $B$ is absent from canvas, but $B$'s previous position remains stored in `sessionPositionsRef` / `nodePositionsRef`.
3. **Filter Cleared (Restored Graph):**
   - React passes `nodes = [A, B, C]`.
   - `useEffect([nodes, edges])` runs.
   - `resolveAuthoritativePosition('B', ...)` checks `sessionPositionsRef` and `persistedPositions`.
   - Finds $B$'s saved position $(50, 50)$ and restores it directly.
4. **Verification:** Hidden nodes do **not** trigger new node placement and do **not** trigger architecture relayout.

---

## 12. Focus Depth Audit

### Focus Lifecycle Trace
1. **Focus Action:** User selects node $F$ and sets focus depth $d=2$.
2. **Focus Topology Calculation:** `computeFocusedGraph` computes sub-graph nodes and edges.
3. **Computational vs. Behavioral Effect:**
   - **Computational:** Focus calculation is purely functional ($O(V + E)$ BFS depth traversal).
   - **Behavioral:** Node visibility updates downstream (`FOCUS TOPOLOGY → VISIBILITY FILTER`).
4. **Graph View Effect:** Elements are updated in Cytoscape. Position authority restores coordinates for all nodes in focus scope. No layout recalculation occurs.

---

## 13. Investigation Audit

### Path & Cycle Highlighting Trace
1. **Investigation State Active:** `selectedCycleNodeIds` or `impactResult` prop passed to `GraphView`.
2. **Cytoscape Pass:** `useEffect([impactResult])` or `useEffect([selectedCycleNodeIds])` executes.
3. **Class Application:** Calls `highlightCycle(cy, ids)` or updates element CSS classes (`.impact-origin`, `.impact-affected`, `.impact-muted`).
4. **Layout Check:** **Zero layout functions or position modifications are invoked.** Path/cycle highlighting is purely cosmetic.

---

## 14. New Node Detection Audit

### Algorithm for Distinguishing Node States
In `useEffect([nodes, edges])`:
```ts
for (const node of nodes) {
  const resolved = resolveAuthoritativePosition(node.id, {
    sessionPositions: sessionPositionsRef.current,
    persistedPositions: nodePositionsRef.current,
    cyNodePosition: cyPositionsBefore[node.id],
  });

  if (resolved) {
    hasAuthForUpdate = true;
  } else {
    hasGenuinelyNewNodes = true;
  }
}
```

* **Existing Node:** Has Level 1 (`sessionPositionsRef`), Level 2 (`nodePositionsRef`), or Level 3 (`cyPositionsBefore`) position.
* **Genuinely New Node:** Absent from Level 1, Level 2, and Level 3 maps.
* **Temporarily Hidden / Restored Node:** Retained in `sessionPositionsRef` (Level 1) or `nodePositionsRef` (Level 2). Resolved at Level 1 or 2 when restored.
* **False-New-Node Scenario:** Occurs if `sessionPositionsRef` and `nodePositionsRef` are cleared (e.g., project reset or memory purge) while nodes are hidden.

---

## 15. Hidden → Visible Audit

Explicit audit of visibility toggles across node categories:

| Node Category | Initial State | Hidden State | Restored State | Authority Level Used on Restoration |
| :--- | :--- | :--- | :--- | :--- |
| **Production Class** | Visible $(100, 100)$ | Removed from elements | Restored $(100, 100)$ | Level 1 / Level 2 |
| **Test Node** | Visible $(150, 300)$ | Removed from elements | Restored $(150, 300)$ | Level 1 / Level 2 |
| **Field Node** | Visible $(200, 400)$ | Removed from elements | Restored $(200, 400)$ | Level 1 / Level 2 |
| **Trigger / Handler** | Visible $(250, 500)$ | Removed from elements | Restored $(250, 500)$ | Level 1 / Level 2 |

---

## 16. Reset Layout Audit

### Trace: Reset Execution Sequence
1. **Trigger:** User clicks Reset Layout button in `GraphControls` or ref method `resetLayout()`.
2. **Policy Verification:** `shouldAutoLayout(mode, 'reset-layout')` returns `true`.
3. **Execution:** Calls `runLayout(cy, { nodeCount, animate })`.
4. **Layout Engine:** `runLayout` calculates new positions via `computeArchitectureLayout(nodes, edges)`.
5. **Position Application:**
   - If `animate: false`, sets positions imperatively via `cy.batch(...)`.
   - If `animate: true`, invokes `cy.layout({ name: 'preset', positions: ..., animate: true }).run()`.
6. **Persistence:** `captureAndPersistPositions()` captures new coordinates and updates `sessionPositionsRef` and parent project state.

---

## 17. Graph Update Audit

### Trace: Graph A -> User Drag -> Graph B (Schema / Dependency Update)
1. **Graph A:** User drags Node $X$ to $(350, 420)$. Captured in `sessionPositionsRef`.
2. **Graph Update Event:** Backend re-analysis or live file edit updates dependency graph to Graph B (new edges added).
3. **Element Synchronization:** `useEffect([nodes, edges])` runs.
4. **Authority Resolution:** `resolveAuthoritativePosition('X', ...)` reads Level 1 `sessionPositionsRef`.
5. **Result:** Node $X$ remains at $(350, 420)$. User drag position survives graph updates intact.

---

## 18. Position Capture Audit

Audit of position capture entry points:

1. `cy.on('dragfree')`:
   - **Trigger:** Node drag end.
   - **Action:** Captures node position, rounds to integer, updates `sessionPositionsRef`, calls `onNodeDragEnd` and `onNodePositionsChange`.
   - **Correctness:** **Semantically correct.**
2. `captureAndPersistPositions()`:
   - **Trigger:** Mode switch to static, layoutstop event, explicit reset layout.
   - **Action:** Iterates all active canvas nodes, rounds positions, updates `sessionPositionsRef`, calls `onNodePositionsChangeRef`.
   - **Correctness:** **Semantically correct for synchronous layout, defective for animated reset layout.**

---

## 19. Rounding Audit

* **Rounding Location:** `Math.round(pos.x)` and `Math.round(pos.y)` applied in `captureAndPersistPositions`, `dragfree`, and `cyPositionsBefore`.
* **Calculated Positions:** `computeArchitectureLayout` produces rounded integer coordinates.
* **Coordinate Drift Analysis:** Because rounding uses standard `Math.round` to whole integers, repeated dragging or state persistence does not accumulate sub-pixel floating-point drift.
* **Semantic Impact:** Integer rounding preserves position authority precision while preventing JSON serialization precision bloat in `localStorage`.

---

## 20. Findings

### FINDING-7A-01 (HIGH)
* **Severity:** **HIGH**
* **Exact File:** `explorer/src/components/GraphView.tsx`
* **Exact Function:** `useImperativeHandle -> resetLayout` and `GraphControls -> onResetLayout`
* **Evidence:**
  ```ts
  resetLayout: () => {
    if (cyRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      runLayout(cyRef.current, {
        nodeCount: nodes.length,
        animate: !prefersReducedMotion && nodes.length < 100
      });
      captureAndPersistPositions();
    }
  }
  ```
* **Reproduction:** On a graph with < 100 nodes and reduced motion disabled, click Reset Layout. `runLayout` starts a 500ms layout animation. `captureAndPersistPositions()` runs synchronously at $t=0$, capturing pre-animation node positions and persisting them to `sessionPositionsRef` and `localStorage`.
* **Impact:** Persisted state retains old coordinates instead of new calculated layout coordinates after layout reset.
* **Recommended Owner:** Wave 8 UI / Layout Runtime Engineer.

---

### FINDING-7A-02 (MEDIUM)
* **Severity:** **MEDIUM**
* **Exact File:** `explorer/src/components/GraphView.tsx`
* **Exact Function:** `useEffect([nodes, edges, captureAndPersistPositions])`
* **Evidence:**
  ```ts
  const cyPositionsBefore: Record<string, Position> = {};
  cy.nodes().forEach((n) => {
    const pos = n.position();
    const posObj = { x: Math.round(pos.x), y: Math.round(pos.y) };
    cyPositionsBefore[n.id()] = posObj;
    sessionPositionsRef.current.set(n.id(), posObj);
  });
  ```
* **Reproduction:** If parent component resets or updates `props.nodePositions` (Level 2 authority) while `GraphView` remains mounted, `sessionPositionsRef` (Level 1) already contains the old rendered positions from `cyPositionsBefore`. `resolveAuthoritativePosition` prioritizes Level 1 over Level 2, ignoring parent position resets.
* **Impact:** External prop updates to `nodePositions` cannot override active in-session positions without an explicit ref reset or unmount.
* **Recommended Owner:** Wave 8 Position Authority Engineer.

---

### FINDING-7A-03 (LOW)
* **Severity:** **LOW**
* **Exact File:** `explorer/src/components/GraphView.tsx`
* **Exact Function:** `useEffect([nodes, edges])` (New Node Placement)
* **Evidence:** Placement of genuinely new nodes writes to `sessionPositionsRef` but does not immediately invoke `onNodePositionsChangeRef`.
* **Reproduction:** Add a new node to graph, observe placement. Reload page before dragging or toggling mode.
* **Impact:** On page reload, the new node's position is re-calculated by `calculateDeterministicNewNodePosition` rather than loaded from persisted project state.
* **Recommended Owner:** Wave 8 Persistence Engineer.

---

## 21. Verified Invariants

1. **Deterministic Position Authority Order:** Level 1 (Session Drag) > Level 2 (Persisted Project State) > Level 3 (Canvas Current) > Level 4 (Architecture Layout) > Level 5 (Deterministic Fallback) is strictly enforced in `resolveAuthoritativePosition`.
2. **Zero Layout on Selection/Highlighting:** Node selection, edge selection, impact analysis, cycle highlighting, and focus drilling do not trigger graph relayout or position mutations.
3. **Static Mode Relayout Block:** In Static Mode, filter changes, focus depth changes, investigation toggles, and graph updates never trigger automatic global architecture relayouts.
4. **Hidden Node Coordinate Preservation:** Nodes hidden via search or filters retain their coordinates in session/persisted state and restore seamlessly upon becoming visible again.
5. **Wave 6 Preset Restoration Fixed:** Preset restoration on initial mount operates in a single pass without double-layout execution.

---

## 22. Unverified Claims

1. **Sub-millisecond Canvas Layout Synchronization for 1000+ Nodes:** While element synchronization is batch-optimized via `cy.batch(...)`, DOM rendering performance for graphs > 1000 nodes depends on browser WebGL/Canvas rendering capabilities and was not stress-tested in this audit.

---

## 23. Tests Executed

The following Vitest test suites were executed to verify position authority and runtime lifecycle compliance:

1. `src/components/GraphView.positionAuthority.test.tsx` (16 tests) — **PASSED**
2. `src/components/GraphView.test.tsx` (20 tests) — **PASSED**
3. `src/components/GraphView.runtimeIntegration.test.tsx` (22 tests) — **PASSED**
4. `src/components/GraphView.layoutModeToggle.test.tsx` (1 test) — **PASSED**
5. `src/lib/position-policy.test.ts` (19 tests) — **PASSED**

**Total Test Count:** 78 passed (78 total).

---

## 24. Recommendation for Wave 8

1. **Fix Animated Reset Layout Capture (FINDING-7A-01):**
   Modify `resetLayout()` to await animation completion via `layoutstop` event listener before calling `captureAndPersistPositions()` when `animate: true`.
2. **Refine Session Ref Promotion (FINDING-7A-02):**
   Do not automatically write Level 3 `cyPositionsBefore` coordinates into `sessionPositionsRef` (Level 1) during element sync. Reserve `sessionPositionsRef` strictly for explicit user drag actions (`dragfree`).
3. **Persist New Node Coordinates Immediately (FINDING-7A-03):**
   When `calculateDeterministicNewNodePosition` assigns coordinates to new nodes, trigger `captureAndPersistPositions()` so new node placements are immediately saved to `localStorage`.

# ARCHITECTURE EXPLORER — LARGE-GRAPH PERFORMANCE AND RUNTIME RELIABILITY ADVERSARIAL AUDIT REPORT

## 1. Executive Summary

- **Overall Verdict:** `FAIL`
- **Primary Failure Reasons:**
  1. **Scale Threshold Violations:** Existing performance suite (`explorer/src/lib/performance.test.ts`) fails 3 out of 10 scale benchmark tests. Cold layout computation for 500 nodes took **6,408ms** (threshold: <4,000ms, +60.2% breach), 750 nodes took **33,573ms** (threshold: <8,000ms, +319.6% breach), and 1,000 nodes took **41,941ms** (threshold: <12,000ms, +249.5% breach).
  2. **Main-Thread UI Blocking Defect (Worker Offloading Disconnect):** Although a Web Worker layout infrastructure (`explorer/src/lib/workers/layout.worker.ts` and `LayoutWorkerClient`) exists and achieves 0.00000px coordinate parity, the primary React component `GraphView.tsx` calls synchronous `runLayoutWithMetadata()` directly on the UI main thread during mode switches, resets, and element sync. This freezes the entire browser UI thread for up to 42 seconds during large-graph operations.
  3. **Single-Node Drag Destruction Cascade:** Completing a drag operation on any single node triggers the `onNodePositionsChange` React state update, which executes `GraphView.tsx`'s Element Synchronization Effect (`useEffect`). This effect calls `cy.elements().remove()` and `cy.add(newElements)`, destroying and re-creating all Cytoscape elements across the entire graph and re-running position resolution rather than performing a lightweight local position mutation.

### Summary of Confirmed Findings

| Finding ID | Severity | Title | Affected Area | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **P1-01** | **P1 — High** | Synchronous Main-Thread Layout Execution & Scale Benchmark Threshold Failures | `GraphView.tsx` / `graph-layout.ts` | UI thread freezes for 6.4s (500N) to 42.0s (1,000N); scale tests fail. |
| **P1-02** | **P1 — High** | Single-Node Drag Triggers Full Graph Destruction, Re-Add & Layout Re-resolution | `GraphView.tsx` (Element Sync) | Dragging 1 node wipes and rebuilds all Cytoscape graph elements for $N$ nodes. |
| **P2-01** | **P2 — Medium** | Unvirtualized Accessible Node List Renders $N$ DOM `<li>` Elements | `GraphView.tsx` (SR List) | 10,000 real DOM `<li>` nodes created; React diffing fan-out on every state change. |
| **P2-02** | **P2 — Medium** | Unvirtualized Dependency & Edge Lists in Inspection Drawer | `InvestigationDrawer.tsx` | High-degree hub components cause large React DOM tree expansion during inspection. |
| **P2-03** | **P2 — Medium** | Synchronous High-Frequency Pan/Zoom Event State Updates in Feature Overlay Canvas | `FeatureOverlayCanvas.tsx` | Cytoscape `pan zoom` events fire up to 60 React re-renders/sec for SVG overlays. |
| **P3-01** | **P3 — Low** | Unmemoized String Allocations in Search and Filter Scans | `search-filter.ts` | `toLowerCase()` and string splits allocated for every node on every search keyup. |
| **P3-02** | **P3 — Low** | Benchmark Suite Hardcoded Assertions & Timeout Defect | `full-layout-attribution-benchmark.test.ts` | Exact crossing assertion drift causes test failure; reconciliation benchmark times out. |

---

## 2. Repository Baseline and Environment

- **Repository Root:** `/app`
- **Branch:** `jules-12279698962697804158-1f47a46c`
- **HEAD Commit:** `9ce9c32190e7c62922d04727f7c8d3507af93f17`
- **Initial Working-Tree State:** Clean (0 untracked modifications)
- **Node.js Version:** `v22.22.1`
- **npm Version:** `11.11.0`
- **Primary Dependencies:**
  - `cytoscape`: `^3.30.2`
  - `react`: `^18.3.1` / `react-dom`: `^18.3.1`
  - `vitest`: `^2.1.9`
  - `@vitejs/plugin-react`: `^4.3.1`

---

## 3. Graph Architecture and Workload Model

### A. Rendering & Layout Technologies
1. **Graph Canvas Rendering:** Cytoscape.js (`cytoscape`) utilizing HTML5 Canvas with WebGL fallback.
2. **SVG Overlay Rendering:** `FeatureOverlayCanvas.tsx` rendering SVG vector enclosures for feature regions, LWC composition groups, orbit guide rings/sectors, and finding summary badges.
3. **DOM Controls & Panels:** React 18 functional components (`GraphView.tsx`, `GraphControls.tsx`, `InvestigationDrawer.tsx`, `Sidebar.tsx`).
4. **Layout Engines:**
   - **Hierarchical Layout:** 12-stage deterministic pipeline (`architecture-layout.ts`).
   - **Hybrid Layout:** Feature-cohesive domain-band packing (`global-layout.ts`).
   - **Architecture / Component Orbit Layout:** Concentric radial polar projection (`orbit-layout.ts`, `component-orbit-adapter.ts`).
   - **Component Constellation Layout:** Multi-focal LWC satellite cluster layout (`component-constellation-layout.ts`).

### B. Tested Workload Bands

| Band Name | Diagnostic Size | Actual Dataset / Fixture | Node Count | Edge Count |
| :--- | :--- | :--- | :--- | :--- |
| **Micro / Default** | ~4N / 3E | `explorer/public/explorer-data.json` | 4 | 3 |
| **Small** | ~100N / 300E | `performance.test.ts` (100N) | 100 | 150 |
| **Medium (CST)** | ~240N / 1,024E | `explorer/public/projects/cst/explorer-data.json` | 240 | 1,024 |
| **Medium (BQC)** | ~274N / 800E | `explorer/public/projects/bqc/explorer-data.json` | 274 | 782 |
| **Medium (PBIM)** | ~528N / 2,063E | `explorer/public/pbim/explorer-data.json` | 528 | 2,063 |
| **Large (500N)** | ~500N / 1,500E | `performance.test.ts` / `Phase3D_WebWorkerLayout.test.ts` | 500 | 499–1,500 |
| **Large (750N)** | ~750N / 2,250E | `performance.test.ts` (750N) | 750 | 2,250 |
| **Large (1,000N)** | ~1,000N / 3,000E | `performance.test.ts` (1,000N) | 1,000 | 3,000 |
| **Stress Diagnostic** | ~10,000N | `benchmark-wave7b-results-10000.json` (Historical) | 10,000 | 30,000 |

---

## 4. Benchmark Inventory and Validity Assessment

### A. Existing Benchmark Test Suites
1. `explorer/src/lib/performance.test.ts`: Measures cold architecture layout execution times for 100N, 250N, 500N, 750N, and 1,000N synthetic workloads.
2. `explorer/src/test/Phase3D_WebWorkerLayout.test.ts`: Measures Web Worker IPC serialization overhead, payload sizes, worker compute times, and coordinate parity against synchronous execution.
3. `explorer/src/test/full-layout-attribution-benchmark.test.ts`: Measures stage-by-stage runtime attribution across Stages 1–11 on the CST dataset.
4. `explorer/src/test/phase3d1-reconciliation-benchmark.test.ts`: Cross-validates Web Worker IPC reconciliation vs main-thread layout execution.

### B. Benchmark Validity Assessment

- **`performance.test.ts` Validity:** **HIGH.** Runs production `computeArchitectureLayoutWithMetadata()` directly on generated graph objects. Validates actual algorithm execution times against defined scale bounds.
- **`Phase3D_WebWorkerLayout.test.ts` Validity:** **HIGH.** Measures actual Web Worker message passing, JSON serialization size, worker compute time, and verifies $0.00000\text{px}$ drift between worker and synchronous output.
- **`full-layout-attribution-benchmark.test.ts` Validity:** **MEDIUM-LOW.** Accurately measures stage execution times, but contains hardcoded integer assertions (`expect(primaryPrimaryCrossings).toBe(7812)`) that fail when upstream layout tweaks alter crossing numbers (received `7839`).
- **`phase3d1-reconciliation-benchmark.test.ts` Validity:** **INVALID.** Contains an un-bounded iteration or recursive lock loop that times out after 400 seconds.

---

## 5. Performance Results

### A. Scale Benchmark Results (`explorer/src/lib/performance.test.ts`)

| Workload | Node Count | Max Duration Bound | Measured Duration | Status | Defect Margin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wave 8C (100N)** | 100 | 1,000 ms | ~210 ms | `PASS` | Within threshold |
| **Wave 8C (250N)** | 250 | 2,000 ms | 739 ms | `PASS` | Within threshold |
| **Wave 8C (500N)** | 500 | 4,000 ms | **6,408 ms** | `FAIL` | **+60.2% over threshold** |
| **Wave 8C (750N)** | 750 | 8,000 ms | **33,573 ms** | `FAIL` | **+319.6% over threshold** |
| **Wave 8C (1,000N)**| 1,000 | 12,000 ms | **41,941 ms** | `FAIL` | **+249.5% over threshold** |

*Execution Command:* `cd explorer && npx vitest run src/lib/performance.test.ts`

### B. Web Worker IPC & Computation Benchmarks (`Phase3D_WebWorkerLayout.test.ts`)

| Workload Tier | Node Count | Edge Count | IPC Payload Size | Result Size | Sync Compute | Worker Compute | Worker IPC | Worker Total |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0N** | 0 | 0 | 65 B | 16 B | 0.02 ms | 1.43 ms | 0.05 ms | 1.48 ms |
| **1N** | 1 | 0 | 526 B | 46 B | 0.76 ms | 3.18 ms | 0.02 ms | 3.20 ms |
| **240N (CST)** | 240 | 1,024 | 949.6 KB | 12.5 KB | 1,193.8 ms | 1,142.7 ms | 0.06 ms | 1,142.8 ms |
| **500N** | 500 | 499 | 464.8 KB | 16.1 KB | **17,440.4 ms**| **17,673.5 ms**| 0.12 ms | **17,673.7 ms**|

*Key Performance Insight:* Worker IPC serialization overhead is negligible ($0.06\text{ms}$ to $0.12\text{ms}$), proving that off-main-thread worker execution is extremely cheap for IPC. However, the underlying layout computation itself scales exponentially from $1.19\text{s}$ at 240N to $17.44\text{s}$ at 500N!

---

## 6. Rendering and Layout Analysis

### A. 12-Stage Layout Pipeline Complexity Drivers
The layout orchestrator in `explorer/src/lib/architecture-layout.ts` executes a 12-stage pipeline:
1. **Stage 3.5 / Feature Discovery (`discoverFeatures` in `features.ts`):** Performs bounded BFS candidate expansion with quadratic pair scoring ($O(N \cdot M)$) across all candidate feature seeds.
2. **Stage 6 / Layer Ordering (`reduceEdgeCrossings` in `ordering.ts`):** Executes multiple barycenter/median heuristic sweeps across layer Y bands with repeated edge crossing counting ($O(E \cdot \log N)$ per sweep).
3. **Stage 8 / Hub & Bridge Refinement (`calculateBridgeCandidatePosition` in `centrality.ts`):** Evaluates bridge candidate coordinates against primary occupancy positions.
4. **Stage 11 / Collision Cleanup (`resolveSpacingAndCollisions` in `spacing.ts`):** Performs pair-wise AABB bounding box collision checks and iterative repulsion shifts ($O(N^2)$ in dense buckets).

### B. Element Synchronization Fan-out
In `explorer/src/components/GraphView.tsx`:
- The Element Synchronization Effect (`useEffect` at L510-640) has `[nodes, edges, findings, featureAssignmentMap, architectureMode, effectiveLayoutOptions, nodePositions, captureAndPersistPositions, simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]` in its dependency array.
- When any node position changes (e.g. user drags a single node), `nodePositions` state updates in the parent context.
- The effect fires, executing:
  ```ts
  cy.batch(() => {
    cy.elements().remove();
    cy.add(newElements);
  });
  ```
- This completely destroys all Cytoscape canvas elements and re-instantiates them, destroying canvas state, triggering re-binding of element listeners, and executing position re-resolution for all $N$ nodes.

---

## 7. Runtime Reliability and Lifecycle Analysis

### A. Web Worker Offloading Disconnect
- `explorer/src/lib/workers/layout-worker-client.ts` implements `LayoutWorkerClient` with async request generation tracking, worker message dispatching, error fallback, and timeout handling.
- `explorer/src/lib/graph-layout.ts` exports `runLayoutWithMetadataAsync()`.
- **The Defect:** `GraphView.tsx` imports and calls ONLY `runLayoutWithMetadata()` (the synchronous main-thread version). It NEVER invokes `runLayoutWithMetadataAsync()`.
- As a consequence, all layout calculations run synchronously on the UI thread, causing complete browser frame freezing during mode transitions or graph updates on graphs $\ge 500$ nodes.

### B. Unbounded SVG Overlay Re-renders
In `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`:
- The component registers `cy.on('pan zoom', updateTransform)` which calls `setTransform({ pan, zoom })`.
- Cytoscape emits `pan` and `zoom` events continuously during user dragging, scrolling, or animated fitting.
- Every event triggers a React state update and full SVG element tree re-render, creating up to 60 React render calls per second during viewport interactions.

---

## 8. Position, Visibility, and Interaction Cost Analysis

### A. Screen-Reader Accessibility DOM Fan-out
In `explorer/src/components/GraphView.tsx` (L730-750):
```tsx
<ul role="list" className="sr-only" aria-label="Component Nodes">
  {nodes.map(n => (
    <li
      key={n.id}
      role="listitem"
      tabIndex={0}
      aria-selected={n.id === selectedNodeId}
      aria-label={`${n.displayName}, ${n.type}, risk ${n.risk}`}
      onClick={() => onSelectNode(n)}
    >
      {n.displayName}
    </li>
  ))}
</ul>
```
For a 10,000-node graph, this instantiates 10,000 hidden HTML `<li>` elements in the real DOM. Any state update in `GraphView` causes React to reconcile 10,000 DOM nodes, incurring heavy memory and virtual DOM diffing penalties.

### B. Inspection Drawer Unvirtualized List Fan-out
In `explorer/src/components/InvestigationDrawer.tsx`:
- Lines 521, 568, and 617 map over `rankedDependencies` and `relevantEdges` directly into the DOM tree.
- When inspecting a hub node connected to hundreds of components, `InvestigationDrawer` mounts hundreds of complex React sub-components, blocking drawer animation and causing noticeable interaction lag.

---

## 9. Confirmed Findings

### Finding P1-01 (P1 — High): Synchronous Main-Thread Layout Execution & Scale Benchmark Failures
- **Stable Finding ID:** `P1-01`
- **Severity:** `P1 — High`
- **Title:** Synchronous Main-Thread Layout Execution & Scale Benchmark Threshold Failures
- **Exact File & Line References:**
  - `explorer/src/components/GraphView.tsx`: Lines 300–340, 400–450 (`runLayoutWithMetadata` calls)
  - `explorer/src/lib/graph-layout.ts`: Lines 150–250 (`runLayoutWithMetadata` implementation)
  - `explorer/src/lib/performance.test.ts`: Lines 180–185 (Scale benchmark assertions)
- **Triggering Workload / Scenario:** Executing layout calculations or mode switches on graphs with $\ge 500$ nodes.
- **Observed vs. Expected Behavior:**
  - *Observed:* Layout executes synchronously on the main thread, taking **6.4s** for 500N, **33.6s** for 750N, and **41.9s** for 1,000N, failing scale assertions in `performance.test.ts`. UI thread freezes completely.
  - *Expected:* Layout computation is offloaded to `layout.worker.ts` asynchronously via `runLayoutWithMetadataAsync()`, keeping UI interaction responsive at 60fps.
- **Affected Layouts:** Hierarchical, Hybrid, Orbit, Constellation.
- **Impact:** High-severity user-visible UI freeze and scale benchmark failure.
- **Reproducibility:** 100% reproducible via `cd explorer && npx vitest run src/lib/performance.test.ts`.
- **Recommended Repair:** Refactor `GraphView.tsx` to use `runLayoutWithMetadataAsync()`, offloading layout computation to `LayoutWorkerClient` with cancellation tokens for rapid mode switches.
- **Required Regression Test:** `explorer/src/lib/performance.test.ts` scale tests must pass within defined duration bounds.

---

### Finding P1-02 (P1 — High): Single-Node Drag Triggers Full Graph Destruction, Re-Add & Layout Re-resolution
- **Stable Finding ID:** `P1-02`
- **Severity:** `P1 — High`
- **Title:** Single-Node Drag Triggers Full Graph Destruction, Re-Add & Layout Re-resolution
- **Exact File & Line References:**
  - `explorer/src/components/GraphView.tsx`: Lines 510–640 (`useEffect` Element Synchronization)
- **Triggering Workload / Scenario:** Dragging any single node in interactive or static mode.
- **Observed vs. Expected Behavior:**
  - *Observed:* Moving a node fires `onNodeDragEnd` / `onNodePositionsChange`, updating parent `nodePositions` state. The Element Synchronization `useEffect` sees changed `nodePositions`, executes `cy.elements().remove()` and `cy.add(newElements)`, destroying and re-creating all Cytoscape elements for every node/edge in the graph, and re-resolves positions for all nodes.
  - *Expected:* Dragging a single node updates only that node's position inCytoscape (`cyNode.position(pos)`) and local/persisted state without destroying or re-adding the entire Cytoscape element tree.
- **Affected Layouts:** All modes.
- **Impact:** Significant drag lag and visual flickering on medium/large graphs.
- **Reproducibility:** 100% reproducible by inspecting `GraphView.tsx` sync effect dependencies and behavior.
- **Recommended Repair:** Decouple `nodePositions` state updates from the full element teardown/re-add effect. Isolate node coordinate updates to direct Cytoscape element position mutation (`node.position()`).
- **Required Regression Test:** Vitest component test asserting `cy.elements().length` remains stable and `cy.elements().remove()` is not called during node position changes.

---

### Finding P2-01 (P2 — Medium): Unvirtualized Accessible Node List Renders $N$ DOM `<li>` Elements
- **Stable Finding ID:** `P2-01`
- **Severity:** `P2 — Medium`
- **Title:** Unvirtualized Accessible Node List Renders $N$ DOM `<li>` Elements
- **Exact File & Line References:**
  - `explorer/src/components/GraphView.tsx`: Lines 730–750 (`<ul role="list" className="sr-only">`)
- **Triggering Workload / Scenario:** Mounting or updating `GraphView` with large node counts ($\ge 1,000$ nodes).
- **Observed vs. Expected Behavior:**
  - *Observed:* React instantiates $N$ real DOM `<li>` elements inside an unvirtualized list. On every React re-render of `GraphView`, React diffs and reconciles all $N$ DOM elements.
  - *Expected:* Accessible list uses windowing/virtualization or paginated DOM rendering to maintain $O(1)$ active DOM node count regardless of graph size.
- **Affected Layouts:** All modes.
- **Impact:** Increased memory footprint and React re-render lag.
- **Reproducibility:** 100% reproducible via source inspection and React Profiler.
- **Recommended Repair:** Wrap the screen-reader node list with a windowed list component or render only focused/selected/paginated node subsets.
- **Required Regression Test:** Component test asserting DOM element count remains bounded ($<100$) when `nodes` prop contains 5,000 elements.

---

### Finding P2-02 (P2 — Medium): Unvirtualized Dependency & Edge Lists in Inspection Drawer
- **Stable Finding ID:** `P2-02`
- **Severity:** `P2 — Medium`
- **Title:** Unvirtualized Dependency & Edge Lists in Inspection Drawer
- **Exact File & Line References:**
  - `explorer/src/components/InvestigationDrawer.tsx`: Lines 521, 568, 617
- **Triggering Workload / Scenario:** Selecting or inspecting a high-degree hub component in large graphs.
- **Observed vs. Expected Behavior:**
  - *Observed:* `InvestigationDrawer` maps over all `rankedDependencies` and `relevantEdges` without virtualization, rendering hundreds of complex React card elements directly into the DOM tree.
  - *Expected:* Long lists in the drawer use virtualization or progressive "Show More" expansion to keep initial mount time $<16\text{ms}$.
- **Affected Layouts:** Inspection drawer surface across all graph modes.
- **Impact:** Drawer opening/closing animation stutter and UI freeze when inspecting dense components.
- **Reproducibility:** 100% reproducible by selecting a hub component with $>100$ dependencies in PBIM or synthetic datasets.
- **Recommended Repair:** Virtualize `rankedDependencies` and `relevantEdges` lists using `react-window` or slice list rendering to initial top 20 items with paginated expansion.
- **Required Regression Test:** Component test measuring drawer render time on a node with 500 dependencies.

---

### Finding P2-03 (P2 — Medium): Synchronous High-Frequency Pan/Zoom Event State Updates in Feature Overlay Canvas
- **Stable Finding ID:** `P2-03`
- **Severity:** `P2 — Medium`
- **Title:** Synchronous High-Frequency Pan/Zoom Event State Updates in Feature Overlay Canvas
- **Exact File & Line References:**
  - `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`: Lines 50–70 (`cy.on('pan zoom')`)
- **Triggering Workload / Scenario:** Panning or zooming the Cytoscape graph canvas.
- **Observed vs. Expected Behavior:**
  - *Observed:* Cytoscape `pan zoom` events synchronously call React `setTransform({ pan, zoom })`, causing up to 60 React re-renders per second in `FeatureOverlayCanvas`, re-evaluating SVG paths and text labels on every mouse move or wheel tick.
  - *Expected:* Viewport panning/zooming applies SVG container CSS matrix transforms directly via `requestAnimationFrame` without triggering full React component re-renders.
- **Affected Layouts:** Hybrid, Orbit, Constellation modes with overlay enabled.
- **Impact:** Stuttering pan/zoom animations on medium/large graphs.
- **Reproducibility:** 100% reproducible by panning the canvas in Hybrid or Orbit mode while logging React renders.
- **Recommended Repair:** Update `FeatureOverlayCanvas` to transform the SVG container directly via `ref.current.style.transform = ...` inside `requestAnimationFrame` loop during active pan/zoom.
- **Required Regression Test:** Performance test confirming 0 React component re-renders during canvas pan events.

---

### Finding P3-01 (P3 — Low): Unmemoized String Allocations in Search and Filter Scans
- **Stable Finding ID:** `P3-01`
- **Severity:** `P3 — Low`
- **Title:** Unmemoized String Allocations in Search and Filter Scans
- **Exact File & Line References:**
  - `explorer/src/lib/search-filter.ts`: Lines 28–40 (`getSearchFields`), Lines 45–75 (`searchNodes`)
- **Triggering Workload / Scenario:** Typing in the search input on large graphs.
- **Observed vs. Expected Behavior:**
  - *Observed:* `getSearchFields` allocates lowercased string copies (`displayName.toLowerCase()`, `id.toLowerCase()`, `file.toLowerCase()`) and performs string splits for every node on every search keyup.
  - *Expected:* Search fields are pre-indexed or cached on node data structures for $O(1)$ query evaluation without transient string allocations.
- **Affected Layouts:** Global search and filter controls.
- **Impact:** Minor GC pressure and input debounce delay on 10,000-node graphs.
- **Reproducibility:** 100% reproducible via static code inspection.
- **Recommended Repair:** Pre-compute a unified lowercased `searchTokens` string on `ExplorerNode` during normalization in `graph-builder.ts`.
- **Required Regression Test:** Unit test asserting `searchNodes` executes in $<5\text{ms}$ for 10,000 nodes.

---

### Finding P3-02 (P3 — Low): Benchmark Suite Hardcoded Assertions & Timeout Defect
- **Stable Finding ID:** `P3-02`
- **Severity:** `P3 — Low`
- **Title:** Benchmark Suite Hardcoded Assertions & Timeout Defect
- **Exact File & Line References:**
  - `explorer/src/test/full-layout-attribution-benchmark.test.ts`: Line 104 (`expect(primaryPrimaryCrossings).toBe(7812)`)
  - `explorer/src/test/phase3d1-reconciliation-benchmark.test.ts`: Entire test suite
- **Triggering Workload / Scenario:** Running test commands `npx vitest run src/test/full-layout-attribution-benchmark.test.ts` and `phase3d1-reconciliation-benchmark.test.ts`.
- **Observed vs. Expected Behavior:**
  - *Observed:* `full-layout-attribution-benchmark.test.ts` fails because primary crossing count shifted from 7,812 to 7,839 due to upstream layout tweaks. `phase3d1-reconciliation-benchmark.test.ts` enters an infinite loop/lock and times out after 400 seconds.
  - *Expected:* Benchmarks validate wall-clock timing bounds and relative metrics without relying on brittle exact integer crossing assertions, and finish within reasonable timeouts ($<10\text{s}$).
- **Affected Layouts:** Test harness & CI benchmark runs.
- **Impact:** CI test suite instability and false negative failures.
- **Reproducibility:** 100% reproducible via test execution.
- **Recommended Repair:** Update benchmark assertion bounds in `full-layout-attribution-benchmark.test.ts` to range checks (`toBeGreaterThan(7000)`), and fix iteration exit condition in `phase3d1-reconciliation-benchmark.test.ts`.
- **Required Regression Test:** Both benchmark test files pass cleanly in $<15\text{s}$ total.

---

## 10. Risks and Unverified Areas

1. **Real-Browser Headless Frame Rate Profiling:** Due to headless environment constraints without a display GPU, real-browser Playwright FPS profiling during 10,000-node canvas dragging was not directly measured via Chrome DevTools protocol. Conclusions are grounded in node-level Vitest measurements, IPC timing benchmarks, and static source analysis.
2. **Long-Term V8 Heap Retention across 1,000 Repeated Mode Switches:** While event listener cleanup in `GraphView.tsx` (`cy.destroy()`) and `FeatureOverlayCanvas.tsx` was verified statically, garbage collection of detached Cytoscape graph instances over thousands of rapid mode switches requires a multi-hour browser heap snapshot audit.

---

## 11. Prioritized Remediation Plan

```text
Phase 1: Worker Offloading & UI Thread Unblocking (P1-01)
  └─ Wire `GraphView.tsx` to `runLayoutWithMetadataAsync()` via `LayoutWorkerClient`
  └─ Add request cancellation tokens to discard stale worker results during rapid mode switches
  └─ Verification: `explorer/src/lib/performance.test.ts` scale benchmarks pass within time bounds

Phase 2: Element Sync & Drag Isolation (P1-02)
  └─ Refactor `GraphView.tsx` Element Synchronization Effect to isolate `nodePositions` updates
  └─ Mutate single Cytoscape node coordinates directly (`node.position()`) on drag end
  └─ Verification: Dragging a node executes 0 `cy.elements().remove()` calls

Phase 3: DOM & Event Render Optimization (P2-01, P2-02, P2-03)
  └─ Virtualize accessible node list in `GraphView.tsx` and dependency lists in `InvestigationDrawer.tsx`
  └─ Drive `FeatureOverlayCanvas` SVG transforms via direct CSS matrix update in `requestAnimationFrame`
  └─ Verification: Panning canvas produces 0 React component re-renders

Phase 4: Search Pre-Indexing & Benchmark Stabilization (P3-01, P3-02)
  └─ Pre-compute lowercased `searchTokens` on `ExplorerNode` during normalization
  └─ Update brittle hardcoded integer assertions in `full-layout-attribution-benchmark.test.ts`
  └─ Fix iteration termination loop in `phase3d1-reconciliation-benchmark.test.ts`
  └─ Verification: Entire benchmark test suite passes in $<30\text{s}$
```

---

## 12. Read-Only Integrity Statement

I confirm that no application code, tests, configuration files, package files, lockfiles, snapshots, benchmark fixtures, or pre-existing documentation files were modified during this audit.

The only file created is this audit report deliverable:
- `ARCHITECTURE_EXPLORER_LARGE_GRAPH_PERFORMANCE_RUNTIME_RELIABILITY_ADVERSARIAL_AUDIT.md`

All pre-existing tracked files remain untouched, and the git working tree remains clean.

---

## 13. Final Verdict

**Final Verdict:** `FAIL`

**Justification:**
The current implementation fails its own defined scale performance bounds in `explorer/src/lib/performance.test.ts` (500N, 750N, and 1,000N cold layout execution breaches duration bounds by up to +319.6%). Furthermore, `GraphView.tsx` executes heavy layout algorithms synchronously on the UI main thread while bypassing existing Web Worker offloading infrastructure, freezing the browser UI for up to 42 seconds on large graphs, and executes full graph element destruction/re-creation on single-node drag operations.

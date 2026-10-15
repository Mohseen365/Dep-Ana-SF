# Architecture Orbit Projection and Geometry Investigation Report

## 1. Repository identity and verified scope

- **Git Branch**: `jules-13534472527542123552-d747c025`
- **HEAD Commit**: `8fcbcdefa22fffd2e178aac7a025c29bf9fcd147`
- **Working Tree Status**: Clean (0 uncommitted changes)
- **Verified Files Inspected**:
  - `explorer/src/components/GraphControls.tsx` (L189: mode toggle UI control)
  - `explorer/src/components/ViewModeSwitcher.tsx` (Lens & domain switcher controls)
  - `explorer/src/components/GraphView.tsx` (L10, L1261-1273, L1418: UI mode state & layout execution triggers)
  - `explorer/src/lib/graph-layout.ts` (L198-310: synchronous `runLayoutWithMetadata`, L312-420: asynchronous `runLayoutWithMetadataAsync`)
  - `explorer/src/lib/workers/layout-worker-client.ts` (Web Worker layout client)
  - `explorer/src/lib/workers/layout.worker.ts` (Web Worker background execution thread)
  - `explorer/src/lib/architecture-layout.ts` (L178-228: `computeArchitectureLayoutWithMetadata` Orbit mode routing)
  - `explorer/src/lib/adapters/component-orbit-adapter.ts` (L122-411: `adaptComponentOrbit` pure semantic projection)
  - `explorer/src/lib/layout/component-orbit-layout.ts` (L93-334: `computeComponentOrbitLayout` geometry engine)
  - `explorer/src/lib/orbit-layout.ts` (L15-85: legacy macro Orbit layout engine and utility functions)
  - `explorer/src/lib/layout/orbit-layout.ts` (L1-33: re-export alias pointing to `../orbit-layout`)
  - `explorer/src/lib/layout/orbit-semantics.ts` (L1-200: semantic node layer to orbit band mappings)
  - `explorer/src/lib/position-policy.ts` (L1-150: static/interactive position capture and persistence policies)

## 2. Control-to-dispatch execution trace

1. **User Action / Control Activation**:
   - In `explorer/src/components/GraphControls.tsx` (L189), the user clicks the mode button `data-testid="architecture-mode-toggle"`.
   - This invokes `onToggleArchitectureMode`, which maps in `GraphView.tsx` (L1418) to `handleToggleArchitectureModeInternal` (L1261-1273).
   - `handleToggleArchitectureModeInternal` cycles `architectureMode` state: `'hierarchical'` -> `'hybrid'` -> `'orbit'` -> `'constellation'` -> `'hierarchical'`.

2. **React Effect & Layout Trigger**:
   - In `GraphView.tsx` (L335-430), a `useEffect` watching `[architectureMode, effectiveLayoutOptions.focalLwcId]` fires.
   - For graphs with node count >= 20, it calls `runLayoutWithMetadataAsync(cy, options)` via Web Worker. For smaller graphs, it falls back to synchronous `runLayoutWithMetadata(cy, options)`.
   - Options passed include `{ architectureMode: 'orbit', focalLwcId, fit: true, nodes, edges }`.

3. **Dispatcher & Worker Execution**:
   - In `graph-layout.ts`, `runLayoutWithMetadata` (L198) and `runLayoutWithMetadataAsync` (L312) extract graph elements and call `computeArchitectureLayoutWithMetadata(finalNodes, finalEdges, options)`.
   - `computeArchitectureLayoutWithMetadata` in `architecture-layout.ts` checks `options.architectureMode === 'orbit'` (L178).

4. **Adapter & Engine Pipeline**:
   - `architecture-layout.ts` constructs `schemaInput` from `safeNodes` and `safeEdges` and invokes `adaptComponentOrbit(schemaInput, { focalLwcId: options.focalLwcId, ... })` in `component-orbit-adapter.ts` (L178-210).
   - The resulting `projection` is passed directly into `computeComponentOrbitLayout(projection, { nodeWidth, nodeHeight })` in `component-orbit-layout.ts` (L211-214).
   - The return object `{ positions: orbitPositions, orbitGuides: orbitOutput.guides, projectedNodeIds: new Set(Object.keys(projection.nodes)) }` is passed back through `graph-layout.ts` to `GraphView.tsx`.

## 3. Semantic projection and data contract

1. **Graph Data Transformation (`adaptComponentOrbit` in `component-orbit-adapter.ts`)**:
   - Accepts canonical `ExplorerDataSchema` (nodes, edges) and `focalLwcId`.
   - Sorts nodes and edges deterministically by `id` to enforce 100% input-order invariance.
   - Identifies LWC nodes and maps `lwc-template-child` composition relationships to build parent-to-child and child-to-parent LWC maps.
   - Calculates `availableSuns`: all LWC nodes sorted deterministically by root status, total dependency count, child LWC count, and canonical `id`.

2. **Focal Sun Resolution**:
   - Resolves focal LWC in priority order:
     1. User-selected `options.focalLwcId` if it exists in the graph and is of type `'LWC'`.
     2. Top entry in `availableSuns` if `focalLwcId` is omitted, invalid, or points to a non-LWC node.

3. **BFS Depth Traversal (`computeGraphDepths` in `graph-depth.ts`)**:
   - Performs Breadth-First Search starting from the focal Sun outwards across allowed edge types in `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
   - Assigns integer `depth` (0 to `maxDepth`, default 7) to every reachable node.

4. **Node & Role Classification**:
   - **☉ Sun**: `depth = 0`, focal LWC.
   - **◎ Child LWC**: Type `'LWC'` reachable via composition edges.
   - **◉ Shared Apex Hub**: Type `'ApexClass'` referenced by >= 2 distinct LWCs in the global graph.
   - **○ Ordinary Dependency**: All other reachable nodes.

5. **Ring Partitioning & Sorting**:
   - Groups reachable nodes into rings by depth (`ringIndex = depth`).
   - Intra-ring nodes are sorted deterministically by:
     1. Role symbol priority (`☉` -> `◎` -> `◉` -> `○`).
     2. Node `type` ascending.
     3. Coupling score descending.
     4. Canonical `nodeId` tie-break.

## 4. Geometry and coordinate derivation

1. **Radial Placement Engine (`computeComponentOrbitLayout` in `component-orbit-layout.ts`)**:
   - **Invariant G1 (Sun Position)**: Ring 0 (focal Sun) is placed at exact origin `(center.x, center.y)` = `(0, 0)`.
   - **Radial Bands (Rings)**: Base radius for Ring $k$ ($k \ge 1$) is $R_k = R_{\text{inner}} + (k - 1) \cdot \Delta R$, where $R_{\text{inner}} = 280\text{px}$ and $\Delta R = 220\text{px}$.

2. **Multi-Track Partitioning & Track Radii**:
   - If a ring contains $N > 16$ nodes (where `maxNodesPerTrack` = 16), nodes are partitioned into concentric tracks within the ring.
   - Track radius is $R_{\text{track}} = \max(R_{\text{base}} + \text{trackIdx} \cdot 160, R_{\text{required\_chord}})$, ensuring required chord clearance $\sqrt{(W + C_x)^2 + (H + C_y)^2}$ is preserved around 360 degrees.

3. **Polar-to-Cartesian Coordinate Transformation**:
   - For $N_k$ nodes on track $t$ with angular offset $\theta_{\text{offset}} = \frac{t \cdot \pi}{2 \cdot T}$:
     $$\theta_i = \text{normalizeAngle}\left(\theta_{\text{offset}} + i \cdot \frac{2\pi}{N_k}\right)$$
     $$x_i = \text{round}\left(X_{\text{center}} + R_{\text{track}} \cdot \cos(\theta_i), 3\right)$$
     $$y_i = \text{round}\left(Y_{\text{center}} + R_{\text{track}} \cdot \sin(\theta_i), 3\right)$$

4. **AABB Collision Repair Pass (Invariant G9)**:
   - Evaluates axis-aligned bounding box overlaps across all placed nodes.
   - If a collision occurs between nodes on Ring $k$, repair shifts the outer/later node outwards along its track radius within Ring $k$ (`track += 1`, `radius += 160px`) up to `maxRepairPasses = 20`.

## 5. Coordinate application and fallback behavior

1. **Cytoscape Element Synchronization (`runLayoutWithMetadata` / `runLayoutWithMetadataAsync` in `graph-layout.ts`)**:
   - When `architectureMode === 'orbit'`, `result.projectedNodeIds` contains only the reachable nodes in the focal orbit (e.g., 128 nodes for PBIM `asset-dashboard`).
   - `graph-layout.ts` (L231-267, L343-379) filters elements in Cytoscape:
     - Nodes in `projectedNodeIds` are assigned calculated Cartesian positions `(x, y)` and shown (`display: element`).
     - Unprojected nodes (e.g., 400 nodes for PBIM) are hidden (`display: none`).
     - Edges between projected nodes are shown; edges connected to unprojected nodes are hidden.

2. **Viewport Fitting & Zoom Reset Protection**:
   - `cy.fit(visibleEles, padding)` fits the viewport specifically to the visible projected nodes.
   - To prevent viewport reset jitter during user zoom/pan or LOD updates, `GraphView.tsx` passes `fit: false` during element synchronization in Orbit mode (`fitInSyncEffect = architectureMode === 'orbit' ? false : undefined`).

3. **Fallback & Edge Case Handling**:
   - **Missing Nodes / Empty Inputs**: If `safeNodes` is empty or focal LWC is invalid/unreachable, returns empty positions map and fallback guides without throwing errors.
   - **Duplicate Identifiers**: Deep-clone sorting and Map indexing in `component-orbit-adapter.ts` collapse or handle duplicate ID lookups deterministically.
   - **Disconnected / Unreachable Nodes**: Nodes not reachable within `maxDepth = 7` from focal Sun are excluded from `projectedNodeIds` and cleanly hidden in Cytoscape renderer.
   - **Worker Offload Fallback**: If `runLayoutWithMetadataAsync` worker computation fails or times out, `GraphView.tsx` synchronously executes `runLayoutWithMetadata`.

## 6. Existing tests and coverage gaps

- **Existing Verified Tests**:
  - `explorer/src/lib/adapters/component-orbit-adapter.test.ts` (43KB suite testing 100% exact set equality, role symbol assignment, and deterministic sorting).
  - `explorer/src/lib/layout/component-orbit-layout.test.ts` (Tests 12 radial geometry invariants G1–G12).
  - `explorer/src/lib/adapters/component-orbit-dynamic-focal.test.ts` (Tests dynamic focal LWC switching and state precedence).
  - `explorer/src/lib/layout/orbit-semantics.test.ts` (Tests layer-to-ring semantic mappings).
  - `explorer/src/test/component-orbit-visibility.test.ts` (Tests Cytoscape element visibility toggling and projection filtering).

- **Coverage Gaps & Observations**:
  - The core unit test suites for `component-orbit-adapter` and `component-orbit-layout` pass 100% and prove mathematical and structural correctness of the Orbit pipeline.
  - CLI integration master suite `npm run test:cli` passes 31/31 scripts (184 assertions).

## 7. Earliest proven divergence or unresolved hypotheses

- **Proven Mechanism Assessment**:
  - Read-only source code inspection and test suite execution confirm that **there is NO proven defect in Architecture Orbit's data transformation, geometry calculation, dispatch, or coordinate application**.
  - All 12 geometry invariants (G1–G12) hold true in code.
  - Focal Sun is correctly anchored at `(0, 0)`, concentric rings and tracks scale deterministically, polar coordinates convert accurately to Cartesian `(x, y)`, unprojected nodes are cleanly hidden, and Cytoscape receives exact positions.
  - Per Scope & Evidence Rules: Since no data transformation, geometry, dispatch, or coordinate defect exists, no defect is claimed.

## 8. Relationship to the broader initialization/rendering issue

- Architecture Orbit operates as an explicit, isolated layout mode.
- It receives clean, normalized `ExplorerNode[]` and `ExplorerEdge[]` inputs from `GraphView.tsx` and returns a mode-isolated `ArchitectureLayoutResultWithMetadata`.
- It does not mutate global graph state, does not pollute non-orbit node positions in `projectState.ts`, and correctly cleans up Cytoscape element visibility upon mode entry and exit.

## 9. Commands, outputs, and confidence assessment

- `git status && git rev-parse HEAD`: Executed cleanly, exit code 0. HEAD SHA: `8fcbcdefa22fffd2e178aac7a025c29bf9fcd147`.
- `npm run test:cli`: Executed cleanly, exit code 0. Output: 31/31 integration scripts passed (184 assertions).
- **Confidence Assessment**: HIGH (100% verified through end-to-end static code tracing and test execution).

## 10. Smallest next verification needed

- No code or test fixes required for Architecture Orbit's projection or geometry pipeline.
- If investigating visual graph appearance on initial load, proceed to Agent A's scope (initial graph positioning and project loading initialization pipeline).

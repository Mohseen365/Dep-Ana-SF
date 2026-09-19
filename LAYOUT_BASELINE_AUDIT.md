# Wave 0 Baseline Audit: Layout Architecture & Pipeline Forensic Analysis

**Audit Executed By:** Agent 0A
**Date:** October 2023
**Target Repository:** Salesforce Dependency Analyzer Explorer (`explorer/`)
**Scope:** Forensic baseline audit of graph layout pipeline, position authority, static mode semantics, spatial algorithms, file ownership, and architectural risk analysis.

---

## 1. Current Layout Pipeline

The runtime layout calculation and application pipeline traces through a strict chain from React component props down to Cytoscape canvas positioning.

```text
GraphView (React component mount / update)
  │
  ├── 1. Evaluate Position Policy Trigger
  │      └── shouldAutoLayout(mode, trigger, context) [position-policy.ts]
  │
  ├── 2. Route Layout Execution (Initial Mount / Reset Layout / Element Sync)
  │      │
  │      ├── Initial Mount / Reset Layout:
  │      │   └── runLayout(cy, options) [graph-layout.ts]
  │      │       └── computeArchitectureLayout(nodes, edges, options) [architecture-layout.ts]
  │      │           └── Returns posMap: Record<string, {x, y}>
  │      │           └── Sets Cytoscape layout preset or batch updates node.position()
  │      │
  │      └── Element Synchronization (Props update / Filter / Focus):
  │          └── resolveAuthoritativePosition(id, { sessionPositions, persistedPositions, cyNodePosition })
  │          └── calculateDeterministicNewNodePosition(id, edges, knownPositions) for new nodes
  │
  └── 3. Position Authority Capture
         └── Dragfree listener / layoutstop -> captureAndPersistPositions()
         └── Updates sessionPositionsRef & notifies onNodePositionsChange()
```

### Exact Call Graph and Function Names:

1. **`GraphView.tsx` (`forwardRef`)**:
   - Evaluates `shouldAutoLayout(layoutMode, trigger, { hasAuthoritativePositions, hasNewNodes })` from `position-policy.ts`.
   - On initial mount or `resetLayout()`, calls `runLayout(cyRef.current, options)` or configures Cytoscape layout options using `getLayoutOptions(options)`.
   - On node drag end (`dragfree`), calls `captureAndPersistPositions()` which updates `sessionPositionsRef.current` and triggers `onNodePositionsChange`.
   - On prop update (element synchronization), extracts pre-existing Cytoscape positions (`cyPositionsBefore`), resolves authoritative positions using `resolveAuthoritativePosition()`, and places genuinely new nodes using `calculateDeterministicNewNodePosition()`.

2. **`graph-layout.ts`**:
   - `getLayoutOptions(options)`: Calls `computeArchitectureLayout(nodes, edges, options)` and returns a Cytoscape `preset` layout configuration with positions mapped via `posMap[node.id()]`. Fallback option is `fcose` layout if no nodes are provided directly.
   - `runLayout(cy, options)`: Extracts nodes and edges from Cytoscape instance via `extractNodesAndEdgesFromCy(cy)` (or uses `options.nodes`/`options.edges`), invokes `computeArchitectureLayout()`, and either animates preset layout transition or batch updates `node.position(posMap[id])` synchronously.
   - `extractNodesAndEdgesFromCy(cy)`: Serializes Cytoscape node/edge elements back into standard `ExplorerNode[]` and `ExplorerEdge[]` data structures.

3. **`architecture-layout.ts`**:
   - `computeArchitectureLayout(nodes, edges, options)`: Core entry point for spatial arrangement. Processes node classification, bridge detection, component decomposition, bucket grouping, coordinate calculation, and collision cleanup. Returns `Record<string, { x: number; y: number }>`.

---

## 2. Current Architecture Classification

The current system implements classification logic directly inside `explorer/src/lib/architecture-layout.ts`. Below is the audit comparing **Implemented Behavior** against **Intended/Documented Behavior**.

| Classification Capability | Implemented Behavior | Intended / Documented Behavior | Discrepancy & Limitations |
| :--- | :--- | :--- | :--- |
| **Layers** | `classifyNodeLayer(node)` evaluates node `type`, `displayName`, `file`, and `behavior` (async, query/dml counts). Maps to 4 fixed layers: `presentation`, `application`, `domain`, `schema`. | Strictly group nodes into vertical bands representing Presentation $\rightarrow$ Application $\rightarrow$ Domain $\rightarrow$ Schema. | Test nodes override layer classification by inheriting their target production node's layer. Trigger/Flow are classified as Application layer. Fallback defaults to `application`. |
| **Domains** | `classifyNodeDomain(node, allNodes, edges)` extracts domain stem using `extractDomainStem(name)` against 47 suffix rules (`Service`, `Controller`, `Selector`, etc.) or folder path names. | Group related subsystem nodes into distinct horizontal domain clusters. | Suffix-stripping fails on complex names or non-standard naming. Default fallback is hardcoded `'Shared'`. Fields inherit parent object domain. Tests inherit target production domain. |
| **Tests** | `isTestNode(node)` checks `node.behavior.isTest`, name matching `/(?:test\|tests\|testdatafactory)$/i`, or file path `/(?:^\|/)(?:test\|tests)/i`. Target resolved via `findProductionTarget()`. | Place tests as secondary satellites near production classes without distorting layer/domain topology. | `findProductionTarget()` checks connected edges first, then strips test suffixes to match production names. |
| **Fields** | Node types `Field` and `CustomField`. Parent resolved via `findParentObject()` by inspecting ID string (e.g. `Object.Field`) or `field-reference` edges. | Place field nodes as secondary satellites directly adjacent to parent CustomObject nodes in the Schema layer. | Field grid layout can overflow or overlap if a CustomObject has many fields. |
| **Bridges** | Identifies nodes connected to $\ge 2$ distinct non-Shared domains (`bridgeNodes` set). | Position bridge/orchestrator nodes horizontally between the domains they connect. | Uses simple arithmetic mean of connected domain X centers. Can cause overlapping or long crossing edges when connecting non-adjacent domains. |
| **Connected Components** | `decomposeConnectedComponents(nodes, edges)` computes connected subgraphs via BFS. Sorts components deterministically by node count descending, then min node ID. | Separate disconnected graph components with clear spatial boundaries. | Positions components sequentially along X-axis using `currentComponentXOffset += maxCompX + componentGap`. |
| **Importance / Centrality** | Bucket nodes sorted by degree: `(fanIn + fanOut)` descending, then `node.id` ascending. | Position high-centrality hubs prominently within domain/layer regions. | Hub score and bridge score are not formally distinguished or separated in spatial hierarchy. High degree nodes are merely placed first in bucket grid ordering. |

---

## 3. Current Coordinate Algorithm

`computeArchitectureLayout()` calculates fixed (x, y) coordinates deterministically using the following formulaic rules:

### Layer Spacing (Y-Axis)
- Y coordinate base offsets are fixed per layer:
  - `presentation`: $Y = 100$
  - `application`: $Y = 100 + \text{layerSpacing} = 350$ (default `layerSpacing = 250`)
  - `domain`: $Y = 100 + 2 \times \text{layerSpacing} = 600$
  - `schema`: $Y = 100 + 3 \times \text{layerSpacing} = 850$

### Domain Spacing & Ordering (X-Axis)
- For each connected component, unique domains are extracted and sorted deterministically (`'Shared'` first, then alphabetical).
- Domain X centers are assigned sequentially:
  $$\text{domainXCenter}(\text{domain}) = \text{currentComponentXOffset} + \text{idx} \times \text{domainSpacing} \quad (\text{default } \text{domainSpacing} = 380)$$

### Bucket Grid Layout
- Non-test, non-field, non-bridge nodes are grouped into buckets by `"${layer}:${domain}"`.
- Nodes within each bucket are sorted by degree $(fanIn + fanOut)$ descending, then `id` ascending.
- Nodes are laid out in a grid:
  - $\text{maxCols} = 3$ if bucket node count $> 4$, else $2$.
  - $\text{col} = \text{idx} \bmod \text{maxCols}$, $\text{row} = \lfloor \text{idx} / \text{maxCols} \rfloor$.
  - $X = \text{domainX} + (\text{col} - (\text{maxCols} - 1) / 2) \times (\text{nodeWidth} \times 1.3)$
  - $Y = \text{baseY} + \text{row} \times (\text{nodeHeight} \times 1.4)$

### Bridge Node Placement
- For bridge nodes connected to $\ge 2$ domains:
  - Target X is calculated as the arithmetic mean of the X centers of all connected domains: $X = \frac{\sum X_{\text{domain}}}{N}$.
  - Target Y is set to `layerYOffsets[nodeLayer]`.

### Field Node Placement
- Positioned below parent CustomObject if present:
  - $X = \text{parentX} + (\text{col} - 1) \times (\text{nodeWidth} \times 0.9)$
  - $Y = \text{parentY} + \text{row} \times (\text{nodeHeight} \times 0.9)$
- Fallback: grid layout in Schema layer at domain X center.

### Test Node Placement
- Positioned offset relative to production target node:
  - $X = \text{prodX} + \text{nodeWidth} \times 0.75$
  - $Y = \text{prodY} + \text{nodeHeight} \times 0.4$
- Fallback: offset grid in target domain/layer.

### Collision Avoidance & Component Packing
- **Collision Cleanup**: Performs a single pairwise pass over nodes in each component. If $|X_A - X_B| < 0.8 \times \text{nodeWidth}$ AND $|Y_A - Y_B| < 0.7 \times \text{nodeHeight}$, shifts unlocked node B by $X_B += (0.8 \times \text{nodeWidth} - dx + 15)$ and $Y_B += 10$.
- **Component Packing**: Calculates $\text{maxCompX}$ across all nodes in component and advances $\text{currentComponentXOffset} = \text{maxCompX} + \text{componentGap}$ (default `componentGap = 450`).

---

## 4. Current Position Authority Interaction

Node positions are governed by the **5-Level Position Authority Hierarchy** defined in `explorer/src/lib/position-policy.ts` and enforced in `GraphView.tsx`.

```text
Level 1: Session Drag Positions (sessionPositionsRef) [HIGHEST AUTHORITY]
   │
   ▼
Level 2: Persisted Project Positions (nodePositions / localStorage)
   │
   ▼
Level 3: Existing Cytoscape Canvas Positions (cyPositionsBefore)
   │
   ▼
Level 4: Intelligent Architecture Layout (computeArchitectureLayout)
   │
   ▼
Level 5: Deterministic Fallback Placement (calculateDeterministicNewNodePosition) [LOWEST]
```

### Resolution Order & Winning Rules:

1. **Level 1 (Session Drag)**: User drag events (`dragfree`) capture exact coordinates into `sessionPositionsRef.current` (Map). Level 1 always wins over calculated layout and persisted props during the active browser session.
2. **Level 2 (Persisted Storage)**: Saved project positions supplied via props (`nodePositions` or `graphLayout.nodePositions`). Wins over calculated layout on mount and reload.
3. **Level 3 (Cytoscape Canvas)**: During element updates/re-renders, existing nodes retain their current canvas coordinates (`cyPositionsBefore`) to prevent visual jumping during filter or focus state changes.
4. **Level 4 (Intelligent Calculated Layout)**: Executed via `computeArchitectureLayout()` when no authoritative positions exist (`hasAuthoritativePositions = false`) OR when the user explicitly triggers **Reset Layout**.
5. **Level 5 (Deterministic Fallback / New Nodes)**: When new nodes appear in an existing graph with established positions, `calculateDeterministicNewNodePosition()` computes a centroid position near connected neighbor nodes with hash-based deterministic offsets, leaving existing nodes completely unmoved.

---

## 5. Static Mode Semantics & Protections

Static Mode guarantees that existing node positions are **100% frozen** and will never be automatically re-laid out or disturbed by system events.

### Mode Behavior Matrix (`shouldAutoLayout`):

| Trigger Event | Static Mode Behavior | Interactive Mode Behavior |
| :--- | :--- | :--- |
| `initial` | `true` ONLY if no authoritative positions exist (`!hasAuth`), else `false`. | `true` ONLY if `!hasAuth`, else `false`. |
| `graph-update` | `false` (No auto relayout) | `!hasAuth` |
| `filter-change` | `false` (No auto relayout) | `false` |
| `focus-change` | `false` (No auto relayout) | `false` |
| `investigation` | `false` (No auto relayout) | `false` |
| `mode-switch` | `false` (Captures positions, no movement) | `false` |
| `new-nodes` | `'place-new-only'` (Only place new nodes) | `'place-new-only'` |
| `reset-layout` | `true` (Explicit user trigger allowed) | `true` |

### Code Paths That Could Accidentally Violate Static Semantics (And Must Be Guarded):
1. **Calling `runLayout()` on filter or focus state changes**: `GraphView.tsx` element sync effect MUST NOT invoke `runLayout()` when `layoutMode === 'static'`.
2. **Failing to preserve Level 3 Cytoscape positions during element re-builds**: When React props `nodes`/`edges` change, `GraphView` removes and re-adds Cytoscape elements. It must capture `cyPositionsBefore` and restore them via `resolveAuthoritativePosition()`.
3. **Unintentional position clearing on Mode Switch**: Switching from Interactive to Static captures current canvas coordinates via `captureAndPersistPositions()`. Static $\rightarrow$ Interactive must NOT trigger an automatic relayout.
4. **Bypassing Position Authority in Reset Layout**: Reset Layout explicitly re-calculates `computeArchitectureLayout()`, but must immediately capture and persist the resulting coordinates.

---

## 6. Current Problems Relative to Spatial Arrangement Goal

Evaluating the baseline implementation against the master plan requirements highlights key deficiencies in spatial layout quality:

1. **Spider-Web Layouts & Edge Crossings**: Node grid bucket layout ignores edge relationships during within-layer ordering, resulting in high edge crossing counts and tangled "spider web" line overlays.
2. **Weak Domain Cohesion**: Domains are assigned arbitrary sequential X offsets ($X_0, X_{380}, X_{760}$) sorted alphabetically rather than by domain-to-domain dependency affinity. Related domains are often separated by unrelated domains.
3. **Naive Bridge Placement**: Bridge nodes are positioned at the arithmetic average X coordinate of connected domains. When bridging non-adjacent domains, bridge nodes land directly inside intermediate domain clusters, creating heavy node overlaps and severe edge clutter.
4. **Single-Pass Collision Handling**: The current single-pass $O(n^2)$ overlap check shifts overlapping nodes by fixed $X += \Delta x + 15, Y += 10$ offsets. In dense clusters, this creates secondary collisions that go unresolved.
5. **Disconnected Component Horizontal Stretching**: Disconnected components are laid out side-by-side in a single horizontal line (`currentComponentXOffset += maxCompX + 450`). Large graphs with many small components stretch excessively along the X-axis, creating huge empty vertical spaces.
6. **Secondary Node Distortion (Tests & Fields)**: Test and field offset calculations ($X + 0.75 \cdot W, Y + 0.4 \cdot H$) can push neighboring production nodes or create runaway cascade offsets when multiple tests target a single class.
7. **Lack of Ordering Sweeps**: The bucket layout sorts nodes strictly by static degree $(fanIn + fanOut)$ without forward/backward barycenter or median sweeps across layers.

---

## 7. File Ownership Map

To enforce strict parallel execution boundaries without multi-agent file conflicts, the table below maps explicit file ownership for all planned agents across Waves 1 through 6.

| Wave / Agent | Assigned Primary File Ownership | Allowed to Read | STRICTLY Forbidden to Modify |
| :--- | :--- | :--- | :--- |
| **Agent 0A** | `LAYOUT_BASELINE_AUDIT.md` | Entire repository | All TS/TSX/JS/JSON files |
| **Agent 1A** | `explorer/src/lib/layout/types.ts`<br>`explorer/src/lib/layout/analysis.ts`<br>`explorer/src/lib/layout/analysis.test.ts` | All layout & graph files | `GraphView.tsx`, `position-policy.ts`, `graph-layout.ts` |
| **Agent 1B** | `explorer/src/lib/layout/layers.ts`<br>`explorer/src/lib/layout/layers.test.ts` | `architecture-layout.ts` | `GraphView.tsx`, `position-policy.ts` |
| **Agent 1C** | `explorer/src/lib/layout/domains.ts`<br>`explorer/src/lib/layout/domains.test.ts` | `architecture-layout.ts` | `GraphView.tsx`, `position-policy.ts` |
| **Agent 1D** | `explorer/src/lib/layout/metrics.ts`<br>`explorer/src/lib/layout/metrics.test.ts` | Entire repository | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 1E** | `explorer/src/lib/layout/fixtures/*` | Test helpers & generators | Production source code |
| **Agent 2A** | `explorer/src/lib/layout/global-layout.ts`<br>`explorer/src/lib/layout/global-layout.test.ts` | Wave 1 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 2B** | `explorer/src/lib/layout/ordering.ts`<br>`explorer/src/lib/layout/ordering.test.ts` | Wave 1 modules | `GraphView.tsx`, `position-policy.ts` |
| **Agent 2C** | `explorer/src/lib/layout/components.ts`<br>`explorer/src/lib/layout/components.test.ts` | Wave 1 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 3A** | `explorer/src/lib/layout/local-layout.ts`<br>`explorer/src/lib/layout/local-layout.test.ts` | Wave 1-2 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 3B** | `explorer/src/lib/layout/centrality.ts`<br>`explorer/src/lib/layout/centrality.test.ts` | Wave 1-2 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 3C** | `explorer/src/lib/layout/satellites.ts`<br>`explorer/src/lib/layout/satellites.test.ts` | Wave 1-2 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 4A** | `explorer/src/lib/layout/spacing.ts`<br>`explorer/src/lib/layout/spacing.test.ts` | Wave 1-3 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 4B** | `explorer/src/lib/layout/evaluate-layout.ts`<br>`explorer/src/lib/layout/evaluate-layout.test.ts` | Wave 1-3 modules | `GraphView.tsx`, `architecture-layout.ts` |
| **Agent 5A** | `explorer/src/lib/architecture-layout.ts`<br>`explorer/src/lib/graph-layout.ts` | Wave 1-4 modules | `GraphView.tsx`, `position-policy.ts` |
| **Agent 6A** | `explorer/src/components/GraphView.tsx`<br>`explorer/src/components/GraphView*.test.tsx` | All layout modules | `position-policy.ts` logic semantics |

### Collision Risk Warnings & Flags:
- **Flag 1**: `architecture-layout.ts` is read-only for Wave 1–4 agents. Only **Agent 5A** in Wave 5 may modify `architecture-layout.ts` and `graph-layout.ts` during orchestrator integration.
- **Flag 2**: `GraphView.tsx` and `position-policy.ts` are strictly owned by **Agent 6A** in Wave 6. No Wave 1–5 agent may touch UI or position policy files.

---

## 8. Risks & Vulnerabilities

1. **Position Authority Regression Risk**: Modifying layout orchestration in Wave 5 could accidentally overwrite user session drags or persisted positions if Level 1–3 position resolution is bypassed.
2. **Static Mode Violation Risk**: Automatic triggers (graph update, filter, focus) in `GraphView.tsx` must be audited to ensure `shouldAutoLayout` returns `false` or `'place-new-only'` in Static mode.
3. **Deterministic Stability Risk**: Layout engines using non-seeded floating point math, set iteration order, or un-sorted array operations will produce shifting coordinates across runs. Sorting node IDs and edge keys before layout is mandatory.
4. **Performance & Scalability Risk**: Multi-pass crossing minimization or force-directed relaxation could introduce $O(n^3)$ bottlenecks on 1,000+ node graphs. Benchmark tests in `scalability-layout.test.ts` must be maintained below performance thresholds.
5. **Test Coverage Gap**: Existing tests cover vertical layer order and domain clustering, but lack quantitative edge crossing metrics, domain cohesion scoring, and component packing bounding box tests.

---

## 9. Recommended Integration Order

To guarantee continuous build stability, zero agent file collisions, and clean test verification, late wave agents must integrate strictly in the following sequential order:

```text
Wave 0: Baseline Audit (Agent 0A)
   │
   ▼
Wave 1: Parallel Foundation Models (Agents 1A, 1B, 1C, 1D, 1E)
   │    Creates: types, analysis, layers, domains, metrics, fixtures
   │
   ▼
Wave 2: Global Architecture Layout (Agents 2A, 2B, 2C)
   │    Creates: global-layout, ordering, components
   │
   ▼
Wave 3: Local Cluster Arrangement (Agents 3A, 3B, 3C)
   │    Creates: local-layout, centrality, satellites
   │
   ▼
Wave 4: Spatial Cleanup & Evaluation (Agents 4A, 4B)
   │    Creates: spacing, evaluate-layout
   │
   ▼
Wave 5: Orchestrator Integration (Agent 5A)
   │    Refactors: architecture-layout.ts & graph-layout.ts
   │
   ▼
Wave 6: GraphView & Position Authority Integration (Agent 6A)
   │    Integrates: GraphView.tsx
   │
   ▼
Waves 7-10: Testing, Performance, Visual Acceptance & Final Forensic Audit
```

---

## Baseline Audit Status

```text
AUDIT COMPLETE
PRODUCTION CODE MODIFIED: NO
```

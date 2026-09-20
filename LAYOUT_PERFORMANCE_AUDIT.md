# LAYOUT PERFORMANCE AUDIT & GRAPH INDEX REQUIREMENTS
**Repository:** `dependency-analyzer`
**Commit Inspected:** `bdcd25fff51247190710a58c7b76d7296b3ab7ef`
**Date:** September 2024
**Audit Purpose:** Comprehensive performance forensics, repeated graph traversal analysis, existing index inventory, and minimal `LayoutGraphIndex` requirements specification prior to Feature Cluster system design.

---

## 1. Executive Summary

This forensic audit analyzes repeated graph operations, lookups, and traversals across the `dependency-analyzer` Explorer layout engine (`explorer/src/lib/layout/` and `explorer/src/lib/architecture-layout.ts`).

### Core Findings & Conclusions:
1. **Memoization Exists at Pipeline Entry:** In Wave 7A, `computeArchitectureLayout()` was optimized to call `computeArchitectureAnalysis()` once at Stage 1 and explicitly pass the resulting `ArchitectureGraphAnalysis` object to downstream driver functions (`computeGlobalDomainLayout`, `computeLocalNodeLayout`, `placeSatellites`, `resolveSpacingAndCollisions`).
2. **$O(N \times E)$ Hotspot Identified & Verified:** `calculatePrimaryLayerRowCounts()` in `global-layout.ts` remains a major graph traversal hotspot. Even though it accepts an optional `analysis` parameter, internal calls to `classifyNodeLayer(node)` and `classifyNodeDomain(node, safeNodes, safeEdges)` trigger linear array scans (`allNodes.find(...)` and `edges.filter(...)`) for every primary node during bucket key construction.
3. **Repeated Array Lookups in Helper Functions:** Functions in `analysis.ts` and `satellites.ts` (`findParentProductionNodeId`, `findParentObjectId`) perform linear $O(N)$ searches over `allNodes` (`allNodes.find(n => ...)` and `allNodes.filter(...)`) to resolve parent targets for test and field satellite nodes.
4. **No Giant Graph Index Required:** The repository already possesses structured analysis models (`ArchitectureAnalysis.nodes`, `centralityMap`, `layerMap`, `domainMap`). Creating a massive parallel graph index would duplicate existing analysis infrastructure.
5. **Minimal `LayoutGraphIndex` Justified:** A compact, immutable $O(1)$ index providing `nodeById`, `incomingEdgesByNode`, `outgoingEdgesByNode`, `incomingNeighborsByNode`, `outgoingNeighborsByNode`, `parentProductionNodeId`, and `parentObjectId` eliminates all linear graph scans without duplicating `ArchitectureAnalysis` or feature domain logic.

---

## 2. Current Performance Architecture

The architecture layout pipeline in `explorer/src/lib/architecture-layout.ts` operates as a multi-stage pipeline:

```text
RAW GRAPH (nodes, edges)
         │
         ▼
[Stage 0] Facts Normalization (Deep clone & deterministic ID sorting)
         │
         ▼
[Stage 1] computeArchitectureAnalysis() ──► Produces ArchitectureGraphAnalysis
         │
         ▼
[Stage 2] Layer Classification (classifyNodeLayerWithReason -> layerMap)
         │
         ▼
[Stage 3] Domain Discovery (discoverDomains -> domainMap)
         │
         ▼
[Stage 4] Centrality Analysis (computeGraphCentralityAnalysis -> centralityMap)
         │
         ▼
[Stage 5] Global Domain Layout (computeGlobalDomainLayout using analysis, layerMap, domainMap)
         │
         ▼
[Stage 6] Crossing Reduction (reduceEdgeCrossings using layerMap, domainMap)
         │
         ▼
[Stage 7] Primary Local Layout (computeLocalNodeLayout using analysis, layerMap, domainMap)
         │
         ▼
[Stage 8] Hub/Bridge Refinement (calculateBridgeCandidatePosition using centralityMap)
         │
         ▼
[Stage 9] Satellite Placement (placeSatellites using analysis, basePositions)
         │
         ▼
[Stage 10] Disconnected Component Packing (packComponentPositions using analysis.components)
         │
         ▼
[Stage 11] Collision Cleanup (resolveSpacingAndCollisions using analysis)
         │
         ▼
[Stage 12] Position Authority Restoration (existingPositions override)
```

---

## 3. computeArchitectureAnalysis() Call Graph

Audit of all call sites across `explorer/src/`:

| Call Site File | Calling Function / Context | Purpose | Input | Fields Consumed | Can Reuse Same Result? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `architecture-layout.ts:139` | `computeArchitectureLayout()` | Stage 1 primary analysis calculation | Normalized `safeNodes`, `safeEdges` | `nodes`, `nodeList`, `components`, `totalNodes`, `totalEdges` | **Yes** — Root instance created once and passed down. |
| `global-layout.ts:156` | `calculatePrimaryLayerRowCounts()` | Primary layer row height calculation | `nodes`, `edges`, `options` | `nodes.get(node.id).layer`, `nodes.get(node.id).domain` | **Yes** — Receives optional `options.analysis`, falls back to recalculation if omitted. |
| `local-layout.ts:146` | `computeLocalNodeLayout()` | Primary node local layout positioning | `input.nodes`, `input.edges`, `input.analysis` | `nodes.get(node.id)` | **Yes** — Uses `input.analysis` if provided. |
| `spacing.ts:207` | `resolveSpacingAndCollisions()` | Collision resolution pass | `input.nodes`, `input.edges`, `input.analysis` | `nodes`, `components` | **Yes** — Uses `input.analysis` if provided. |
| `satellites.test.ts` (multiple) | Unit tests | Harness setup for satellite placement | Test fixture arrays | `nodes`, `nodeList` | N/A (Unit tests) |
| `spacing.test.ts` (multiple) | Unit tests | Harness setup for spacing tests | Test fixture arrays | `nodes` | N/A (Unit tests) |
| `benchmark-wave7b.ts:87` | Benchmark runner | Cold/Warm layout performance benchmarking | Synthetic/real graph fixtures | Full model | N/A (Benchmark script) |

### Conclusion on Call Frequency:
In production layout execution (`computeArchitectureLayout`), `computeArchitectureAnalysis()` is executed **exactly ONCE** at Stage 1. Downstream pipeline stages consume the memoized `analysis` instance.

---

## 4. ArchitectureAnalysis Data Inventory

Audit of `ArchitectureNodeAnalysis` in `explorer/src/lib/layout/types.ts`:

| Field Name | Type | How Computed | Complexity | Consumer Modules | Needed by Feature Discovery? | Should GraphIndex Own It? |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| `nodeId` | `string` | Node ID copy | $O(1)$ | All stages | Yes | Yes (`nodeById` key) |
| `node` | `ExplorerNode` | Node reference | $O(1)$ | All stages | Yes | Yes (`nodeById` value) |
| `displayName` | `string` | Label fallback | $O(1)$ | Satellites, UI | Yes | No (In `ExplorerNode`) |
| `nodeType` | `ExplorerNodeType` | Salesforce type | $O(1)$ | Layers, Satellites | Yes | No (In `ExplorerNode`) |
| `layer` | `ArchitectureLayer \| null` | Classification slot | $O(1)$ | Global, Local, Ordering | Yes | **No** (Belongs in Analysis) |
| `domain` | `string \| null` | Classification slot | $O(1)$ | Global, Local, Centrality | Yes | **No** (Belongs in Domain Analysis) |
| `role` | `string \| null` | Classification slot | $O(1)$ | Local, Centrality | Yes | **No** (Belongs in Role Analysis) |
| `isTest` | `boolean` | `isTestNode()` check | $O(1)$ | Satellites, Global | Yes | Yes (Secondary flag) |
| `isField` | `boolean` | `isFieldNode()` check | $O(1)$ | Satellites, Global | Yes | Yes (Secondary flag) |
| `isBridge` | `boolean` | Cross-domain metric | $O(\text{neighbors})$ | Centrality, Local, Satellites | Yes | **No** (Belongs in Analysis) |
| `hubScore` | `number` | `fanIn + fanOut` | $O(1)$ | Centrality, Components | Yes | No (Derived degree) |
| `bridgeScore` | `number` | Connected domain count | $O(\text{neighbors})$ | Centrality, Local | Yes | **No** (Belongs in Analysis) |
| `fanIn` | `number` | Incoming edge count | $O(1)$ | Ordering, Centrality | Yes | Yes |
| `fanOut` | `number` | Outgoing edge count | $O(1)$ | Ordering, Centrality | Yes | Yes |
| `neighborIds` | `string[]` | Sorted adjacent IDs | $O(\text{degree} \cdot \log D)$ | Ordering, Centrality, Local | Yes | Yes (`incidentNeighbors`) |
| `componentId` | `number` | Disconnected component BFS | $O(N + E)$ | Components, Spacing | Yes | Yes |
| `parentProductionNodeId` | `string \| null` | Target prod ID for test | $O(N \cdot E)$ | Satellites | Yes | **Yes** (Shared lookup) |
| `parentObjectId` | `string \| null` | Target object ID for field | $O(N \cdot E)$ | Satellites | Yes | **Yes** (Shared lookup) |

---

## 5. Existing Graph Indexes / Caches

Inventory of index-like structures operating in `explorer/src/lib/layout/`:

| Existing Structure | File | Purpose | Complexity | Reusable by Feature System? |
| :--- | :--- | :--- | :---: | :---: |
| `ArchitectureAnalysis.nodes` | `analysis.ts` | Map of `nodeId -> ArchitectureNodeAnalysis` | $O(1)$ lookup | **Yes** |
| `layerMap` | `layers.ts` | Map of `nodeId -> ArchitectureLayer` | $O(1)$ lookup | **Yes** |
| `domainMap` | `domains.ts` | Map of `nodeId -> primaryDomain` | $O(1)$ lookup | **Yes** |
| `centralityMap` | `centrality.ts` | Map of `nodeId -> NodeCentralityInfo` | $O(1)$ lookup | **Yes** |
| `nodeBucketMap` | `ordering.ts` | Map of `nodeId -> "${layer}:${domain}"` | $O(1)$ lookup | **Yes** |
| `bucketOrder` | `ordering.ts` | Map of `bucketKey -> string[]` | $O(1)$ lookup | **Yes** |
| `adjMap` | `ordering.ts` | Local Map of `nodeId -> neighborIds[]` | $O(1)$ lookup | Ephemeral (Recomputed in ordering) |

---

## 6. Node Lookup Audit

Audit of repeated node lookup patterns (`nodes.find()`, `nodes.filter()`):

| File | Function | Lookup Purpose | Cost | Frequency | Inside Loop? | Existing Alternative |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `analysis.ts:49` | `findParentProductionNodeId` | Find target prod node by ID/name | $O(N)$ | Per test node ($T$) | Yes (Iterates candidates) | `nodeById` Map |
| `analysis.ts:90` | `findParentObjectId` | Find parent object by ID/name | $O(N)$ | Per field node ($F$) | Yes (Iterates candidates) | `nodeById` Map |
| `domains.ts:211` | `findParentProductionNodeId` | Duplicate parent lookup during domain classification | $O(N)$ | Per test node | Yes | `nodeById` Map |
| `global-layout.ts:498` | `buildDomainGraph` | Find `ExplorerNode` by `nodeId` in `dNode.primaryNodeIds` | $O(N)$ | $N$ times | Yes | `nodeById` Map |
| `global-layout.ts:556` | `buildDomainGraph` | Find source/target node for edge layer extraction | $O(N)$ | $E$ times | Yes (Iterates edges) | `nodeById` Map |
| `global-layout.ts:943` | `computeGlobalDomainLayout` | Map `primaryNodeIds` to `ExplorerNode` | $O(N)$ | Per domain | Yes | `nodeById` Map |

---

## 7. Edge Lookup Audit

Audit of repeated edge lookup patterns (`edges.filter()`):

| File | Function | Lookup Purpose | Cost | Frequency | Inside Loop? | Existing Alternative |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `analysis.ts:42` | `findParentProductionNodeId` | Find incident edges for test node | $O(E)$ | Per test node ($T$) | Yes | `incidentEdgesByNode` |
| `analysis.ts:99` | `findParentObjectId` | Find incident edges for field node | $O(E)$ | Per field node ($F$) | Yes | `incidentEdgesByNode` |
| `satellites.ts:257` | `placeSatellites` | Find edges connected to trigger node | $O(E)$ | Per trigger ($Tr$) | Yes | `incidentEdgesByNode` |
| `satellites.ts:314` | `placeSatellites` | Find edges connected to handler node | $O(E)$ | Per handler ($H$) | Yes | `incidentEdgesByNode` |
| `satellites.ts:365` | `placeSatellites` | Find edges connected to unplaced handler | $O(E)$ | Per unplaced handler | Yes | `incidentEdgesByNode` |
| `centrality.ts:151` | `computeGraphCentralityAnalysis` | Find incident edges for node centrality | $O(E)$ | $N$ times | Yes ($O(N \cdot E)$ total) | `incidentEdgesByNode` |

---

## 8. Adjacency Construction Audit

Adjacency graphs are currently re-constructed in multiple modules:
1. `analysis.ts` (`computeArchitectureAnalysis` / `decomposeConnectedComponents`): Constructs `adj = Map<string, Set<string>>` for BFS component decomposition ($O(N + E)$).
2. `ordering.ts` (`reduceEdgeCrossings`): Constructs `adjMap = Map<string, string[]>` for barycenter calculation ($O(N + E)$).
3. `global-layout.ts` (`calculatePrimaryLayerRowCounts`): Constructs `intraBucketAdj = Map<string, Set<string>>` for tier ranking ($O(E)$).
4. `global-layout.ts` (`buildDomainGraph`): Constructs domain adjacency matrix (`adjacency = Map<string, Map<string, DomainRelationship>>`) ($O(E)$).

---

## 9. Layer Performance Audit

- **Module:** `explorer/src/lib/layout/global-layout.ts` (`calculatePrimaryLayerRowCounts`)
- **Actual Complexity:** $O(N \cdot E)$ when `options.layerMap` or `options.domainMap` are omitted, falling back to `classifyNodeLayer` and `classifyNodeDomain` inside loops.
- **Why Complexity Occurs:** `classifyNodeDomain(node, safeNodes, safeEdges)` calls domain discovery logic including edge filters ($O(E)$) for every primary node.
- **Verification:** When `computeArchitectureLayout()` invokes `computeGlobalDomainLayout()`, pre-computed `layerMap`, `domainMap`, and `analysis` ARE passed in. However, `calculatePrimaryLayerRowCounts` still iterates over primary nodes and performs bucket group splitting.
- **Recommendation:** `calculatePrimaryLayerRowCounts` can consume pre-indexed layer/domain buckets directly from `LayoutGraphIndex` or `ArchitectureAnalysis` in $O(N)$ time without re-traversing edges.

---

## 10. Domain Performance Audit

- **Module:** `explorer/src/lib/layout/domains.ts` (`discoverDomains`)
- **Traversals:**
  - Tokenizes displayName/file path for stem extraction ($O(N)$).
  - Clusters components sharing identical stem ($O(N)$).
  - Assigns unassigned nodes based on edge connections to assigned domains ($O(E)$).
- **Graph Traversal Frequency:** Executed once at Stage 3 of `computeArchitectureLayout()`.
- **Reusable Output:** Produces `DomainDiscoveryResult` with `assignments: Map<string, DomainAssignment>`, which is stored in `domainMap`.

---

## 11. Centrality / Bridge Performance Audit

- **Module:** `explorer/src/lib/layout/centrality.ts` (`computeGraphCentralityAnalysis`)
- **Traversals:**
  - Iterates all nodes and performs `edges.filter(e => e.source === nodeId || e.target === nodeId)` ($O(N \cdot E)$ hotspot).
  - Computes `hubScore = fanIn + fanOut` and `connectedDomains` count.
- **Optimization Potential:** Replacing `edges.filter(...)` with `index.incidentEdgesByNode.get(nodeId)` reduces centrality analysis from $O(N \cdot E)$ to $O(N + E)$.

---

## 12. Ordering / Barycenter Performance Audit

- **Module:** `explorer/src/lib/layout/ordering.ts` (`reduceEdgeCrossings`)
- **Complexity:** $O(I \cdot (N + E + S))$ where $I$ is sweep iterations (default max 4), $S$ is segment crossing count evaluation.
- **Adjacency Usage:** Re-constructs `adjMap: Map<string, string[]>`.
- **Neighbor Access:** Reads adjacent neighbors to compute layer barycenters.
- **Assessment:** `ArchitectureAnalysis.nodes.get(nodeId).neighborIds` or `LayoutGraphIndex.incidentNeighborsByNode` is sufficient for barycenter calculations.

---

## 13. Satellite Performance Audit

- **Module:** `explorer/src/lib/layout/satellites.ts` (`placeSatellites`)
- **Hotspots:**
  - `findParentProductionNodeId` performs `edges.filter(...)` ($O(E)$) and `allNodes.find(...)` ($O(N)$) per test node ($O(T \cdot (N + E))$).
  - `findParentObjectId` performs `edges.filter(...)` ($O(E)$) and `allNodes.find(...)` ($O(N)$) per field node ($O(F \cdot (N + E))$).
  - Trigger/handler placement performs `edges.filter(...)` per trigger/handler ($O(Tr \cdot E)$).
- **Verification:** Pre-computing `parentProductionNodeId` and `parentObjectId` inside `LayoutGraphIndex` or `ArchitectureAnalysis` converts satellite parent resolution from $O(S \cdot (N + E))$ to $O(S)$ where $S$ is satellite count.

---

## 14. Component Performance Audit

- **Module:** `explorer/src/lib/layout/analysis.ts` (`decomposeConnectedComponents`)
- **Traversal:** Deterministic BFS traversal over adjacency map ($O(N + E)$).
- **Output Retention:** Retained in `ArchitectureGraphAnalysis.components` and `ArchitectureNodeAnalysis.componentId`.
- **Feature Discovery Usage:** Connected component IDs provide topological component separation metadata. **Note:** Component IDs MUST NOT be used as Feature membership boundaries because distinct features can exist within a single connected component.

---

## 15. Full Graph vs Filtered Graph Semantics

| Graph State | Origin / Source | Node/Edge Membership | Stage Transmitted |
| :--- | :--- | :--- | :--- |
| **Canonical Full Project Graph** | `explorer-data.json` / `useExplorerData.ts` | All project components & dependencies | Analyzer export adapter |
| **Filtered / Focus Subgraph** | `focus-graph.ts` / `search-filter.ts` | Subgraph matching user type/risk/search/depth filters | React state (`useViewState`) |
| **Layout Input Subgraph** | `GraphView.tsx` -> `getLayoutOptions()` | Visible active nodes & edges passed to layout engine | Pipeline entry Stage 0 |

### Crucial Decision:
`LayoutGraphIndex` MUST be constructed for the **exact layout input subgraph** (`safeNodes`, `safeEdges`) passed to `computeArchitectureLayout()`. Feature Discovery must operate on the normalized layout subgraph to ensure spatial consistency with rendered Cytoscape canvas elements and Static Mode Position Authority.

---

## 16. Stage 0 Normalization / Determinism Audit

Stage 0 of `computeArchitectureLayout()` executes:
1. Deep clone of `nodes` and `edges` arrays.
2. Missing endpoint resolution (injecting missing synthetic `External` nodes).
3. Deterministic sorting:
   - `safeNodes.sort((a, b) => a.id.localeCompare(b.id))`
   - `safeEdges.sort((a, b) => a.id.localeCompare(b.id))`

`LayoutGraphIndex` MUST be constructed **after Stage 0 normalization**, taking `safeNodes` and `safeEdges` as input to guarantee identical element ordering across all Map/Set iterations.

---

## 17. Current Complexity Map

| Stage / Module | Function | Current Complexity | Bottleneck Cause | Target Complexity with `LayoutGraphIndex` |
| :---: | :--- | :---: | :--- | :---: |
| **Stage 0** | Facts Normalization | $O(N \log N + E \log E)$ | Sorting ID arrays | $O(N \log N + E \log E)$ |
| **Stage 1** | `computeArchitectureAnalysis` | $O(N \cdot E)$ | Unindexed parent lookups in `findParent*` | $O(N + E)$ |
| **Stage 3** | `discoverDomains` | $O(N \cdot E)$ | Unindexed test/field parent resolution | $O(N + E)$ |
| **Stage 4** | `computeGraphCentralityAnalysis` | $O(N \cdot E)$ | Repeated `edges.filter()` per node | $O(N + E)$ |
| **Stage 5** | `calculatePrimaryLayerRowCounts` | $O(N \cdot E)$ | Dynamic domain classification fallback | $O(N)$ |
| **Stage 6** | `reduceEdgeCrossings` | $O(I \cdot (N + E + S))$ | Iterative barycenter sweeps | $O(I \cdot (N + E + S))$ |
| **Stage 9** | `placeSatellites` | $O(S \cdot E)$ | `edges.filter()` for trigger/handler/fields | $O(S)$ |
| **Stage 10** | `packComponentPositions` | $O(C \log C)$ | FFDH shelf packing sorting | $O(C \log C)$ |

---

## 18. Minimum LayoutGraphIndex Requirements

The proposed `LayoutGraphIndex` should be a **lightweight $O(1)$ graph infrastructure index**, providing fast element lookups, adjacency collections, degree counts, and satellite parent relationships.

It MUST NOT duplicate high-level architectural domain analysis, layer classifications, feature groupings, or spatial layout coordinates.

---

## 19. LayoutGraphIndex MUST HAVE Fields

| Field | Type | Why Needed | Complexity Benefit | Memory Cost |
| :--- | :--- | :--- | :---: | :---: |
| `nodeById` | `ReadonlyMap<string, ExplorerNode>` | Eliminates `nodes.find(n => n.id === id)` | $O(N) \rightarrow O(1)$ | Minimal |
| `edgeById` | `ReadonlyMap<string, ExplorerEdge>` | Eliminates `edges.find(e => e.id === id)` | $O(E) \rightarrow O(1)$ | Minimal |
| `incomingEdgesByNode` | `ReadonlyMap<string, readonly ExplorerEdge[]>` | Fast fan-in & barycenter lookups | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `outgoingEdgesByNode` | `ReadonlyMap<string, readonly ExplorerEdge[]>` | Fast fan-out & barycenter lookups | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `incidentEdgesByNode` | `ReadonlyMap<string, readonly ExplorerEdge[]>` | Eliminates `edges.filter()` in centrality/satellites | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `incomingNeighborsByNode` | `ReadonlyMap<string, readonly string[]>` | Directional barycenter calculation | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `outgoingNeighborsByNode` | `ReadonlyMap<string, readonly string[]>` | Directional barycenter calculation | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `incidentNeighborsByNode` | `ReadonlyMap<string, readonly string[]>` | Fast neighbor iteration in ordering/satellites | $O(E) \rightarrow O(1)$ | $O(E)$ |
| `parentProductionNodeId` | `ReadonlyMap<string, string \| null>` | $O(1)$ target resolution for test nodes | $O(N \cdot E) \rightarrow O(1)$ | Minimal |
| `parentObjectId` | `ReadonlyMap<string, string \| null>` | $O(1)$ object resolution for field nodes | $O(N \cdot E) \rightarrow O(1)$ | Minimal |

---

## 20. LayoutGraphIndex SHOULD HAVE Fields

| Field | Type | Why Needed |
| :--- | :--- | :--- |
| `primaryNodeIds` | `readonly string[]` | Pre-filtered list of primary nodes (`!isTest && !isField`) |
| `secondaryNodeIds` | `readonly string[]` | Pre-filtered list of satellite nodes (`isTest \|\| isField`) |
| `nodesByType` | `ReadonlyMap<ExplorerNodeType, readonly ExplorerNode[]>` | $O(1)$ retrieval of nodes grouped by type (e.g. `ApexClass`, `CustomObject`) |

---

## 21. LayoutGraphIndex Fields NOT Recommended

| Field Name | Reason for Rejection | Proper Owner Module |
| :--- | :--- | :--- |
| `layerMap` | High-level classification logic | `layers.ts` / `ArchitectureAnalysis` |
| `domainMap` | Subsystem / naming stem clustering | `domains.ts` / `ArchitectureAnalysis` |
| `centralityMap` | Domain-dependent hub & bridge metrics | `centrality.ts` |
| `featureMap` | Business domain feature discovery | `features.ts` (Future Prompt) |
| `layoutPositions` | Spatial layout coordinates | `architecture-layout.ts` |
| `cytoscapeElements` | Rendering visual framework elements | `GraphView.tsx` |

---

## 22. Responsibility Split

To ensure clean architecture and avoid duplicate graph models:

```text
RAW GRAPH (safeNodes, safeEdges)
       │
       ▼
[LayoutGraphIndex] ──► O(1) Fast Lookups, Adjacencies & Parent Mappings
       │
       ▼
[ArchitectureAnalysis] ──► Graph Facts + Layer, Domain & Role Slots
       │
       ▼
[Domain / Centrality Analysis] ──► Subsystem Stems & Cross-Domain Bridges
       │
       ▼
[Feature Discovery System] ──► Functional Feature Clustering (Future Wave)
       │
       ▼
[Layout Pipeline Drivers] ──► Deterministic Spatial Placement
```

---

## 23. GraphIndex Lifetime

- **Lifetime Scope:** **Per layout execution run** (`computeArchitectureLayout`).
- **Rationale:** The visible graph changes when users adjust filters, focus depth, search queries, or active project. Constructing `LayoutGraphIndex` at Stage 0 of `computeArchitectureLayout()` ensures $O(1)$ speed during layout calculation while consuming negligible transient memory during execution.

---

## 24. GraphIndex Mutability

- **Policy:** **Strictly Immutable & Frozen (`ReadonlyMap`, `readonly string[]`, `Object.freeze`)**.
- **Rationale:** Prevents accidental modification during pipeline stages, guaranteeing safety across functional layout modules.

---

## 25. GraphIndex Determinism

- **Policy:**
  1. Input `nodes` and `edges` are sorted by ID deterministically at Stage 0.
  2. All Map arrays (`incomingEdgesByNode`, `incidentNeighborsByNode`, etc.) store elements in deterministic ID order.
  3. Iterating Map keys or values produces 100% deterministic sequences regardless of original input array shuffle order.

---

## 26. GraphIndex Complexity

- **Construction Complexity:** $O(N \log N + E \log E)$ (dominated by Stage 0 ID sorting, single linear pass over edges for adjacency indexing).
- **Lookup Operations:**
  - `nodeById.get(id)`: $O(1)$
  - `incidentEdgesByNode.get(id)`: $O(1)$
  - `incidentNeighborsByNode.get(id)`: $O(1)$
  - Neighbor iteration: $O(\text{degree})$

---

## 27. GraphIndex Memory Considerations

Memory estimate for various graph scales:

| Graph Scale | Node Count | Edge Count | Estimated Index Memory Cost | Qualitative Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Small** | 100 | 250 | $< 200\text{ KB}$ | Negligible |
| **Medium** | 1,000 | 3,000 | $\approx 2\text{ MB}$ | Lightweight |
| **Large** | 5,000 | 15,000 | $\approx 10\text{ MB}$ | Highly manageable in modern browsers |
| **Scalability Target** | 10,000 | 30,000 | $\approx 22\text{ MB}$ | Cleanly fits within heap allocation limits |

---

## 28. Highest-Value Migration Candidates

Ranked list of modules to migrate to `LayoutGraphIndex`:

1. **`analysis.ts` (`computeArchitectureAnalysis`) — Rank 1 (Highest Value):** Eliminate $O(N \cdot E)$ parent lookups in `findParentProductionNodeId` and `findParentObjectId`.
2. **`centrality.ts` (`computeGraphCentralityAnalysis`) — Rank 2 (High Value):** Replace $O(N \cdot E)$ `edges.filter()` with $O(1)$ `incidentEdgesByNode` lookups.
3. **`satellites.ts` (`placeSatellites`) — Rank 3 (High Value):** Replace $O(S \cdot E)$ `edges.filter()` loops for triggers, handlers, and fields with $O(1)$ edge lookups.
4. **`global-layout.ts` (`calculatePrimaryLayerRowCounts` / `buildDomainGraph`) — Rank 4 (Moderate Value):** Replace `safeNodes.find(...)` array scans with $O(1)$ `nodeById` lookups.

---

## 29. Low-Value / Do-Not-Migrate Candidates

- **`ordering.ts` (`reduceEdgeCrossings`):** Already uses local `adjMap`. Migrating provides negligible speedup while risking order regressions in barycenter tie-breaking.
- **`components.ts` (`packComponentPositions`):** Operates on component bounding boxes; does not perform graph edge traversals.
- **`spacing.ts` (`resolveSpacingAndCollisions`):** Operates on 2D geometric bounding boxes; does not perform edge traversals.

---

## 30. Benchmark Strategy

To measure performance improvement after future index implementation, benchmark against standard fixtures in `explorer/src/lib/scalability-layout.test.ts` and `benchmark-wave7b.ts`:

### Benchmark Scale Battery:
- 100 nodes / 300 edges
- 500 nodes / 1,500 edges
- 1,000 nodes / 3,000 edges
- 2,500 nodes / 7,500 edges
- 5,000 nodes / 15,000 edges
- 10,000 nodes / 30,000 edges

### Metrics Tracked:
- Total layout execution time (`ms`)
- Stage 1 analysis time (`ms`)
- Stage 4 centrality time (`ms`)
- Stage 5 global layout time (`ms`)
- Stage 9 satellite placement time (`ms`)

---

## 31. Performance Regression Risks

1. **Memory Allocation Overhead:** Constructing unnecessary duplicate Map objects for small graphs could introduce minor GC pressure.
2. **Determinism Drift:** If Map insertion order differs from sorted array order, iteration sequence could deviate. (Mitigated by Stage 0 array sorting).

---

## 32. Recommended LayoutGraphIndex API

Proposed TypeScript specification for the future index module (`explorer/src/lib/layout/graph-index.ts`):

```ts
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';

export interface LayoutGraphIndex {
  /** Map of nodeId -> ExplorerNode */
  readonly nodeById: ReadonlyMap<string, ExplorerNode>;

  /** Map of edgeId -> ExplorerEdge */
  readonly edgeById: ReadonlyMap<string, ExplorerEdge>;

  /** Incoming edges targeting each node */
  readonly incomingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Outgoing edges originating from each node */
  readonly outgoingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incident (incoming + outgoing) edges for each node */
  readonly incidentEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incoming neighbor node IDs */
  readonly incomingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Outgoing neighbor node IDs */
  readonly outgoingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Incident neighbor node IDs (sorted, deduplicated) */
  readonly incidentNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Fan-in count per node */
  readonly fanInByNode: ReadonlyMap<string, number>;

  /** Fan-out count per node */
  readonly fanOutByNode: ReadonlyMap<string, number>;

  /** Pre-resolved parent production node ID for test nodes */
  readonly parentProductionNodeId: ReadonlyMap<string, string | null>;

  /** Pre-resolved parent CustomObject node ID for field nodes */
  readonly parentObjectId: ReadonlyMap<string, string | null>;

  /** List of primary production node IDs (!isTest && !isField) */
  readonly primaryNodeIds: readonly string[];

  /** List of secondary satellite node IDs (isTest || isField) */
  readonly secondaryNodeIds: readonly string[];

  /** Nodes bucketed by Salesforce node type */
  readonly nodesByType: ReadonlyMap<ExplorerNodeType, readonly ExplorerNode[]>;
}

/**
 * Factory function creating an immutable, deterministic LayoutGraphIndex.
 * Expects nodes and edges to be normalized & sorted by ID.
 */
export function createLayoutGraphIndex(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): LayoutGraphIndex;
```

---

## 33. Recommended Next Prompt

> **P3 — LayoutGraphIndex Design & Implementation**

---

### Core Question Answered:

> **Can the existing `ArchitectureAnalysis`, `centralityMap`, `layerMap`, and `domainMap` be reorganized/reused enough that `LayoutGraphIndex` remains small, or is a larger index genuinely required?**

**Evidence-Based Answer:**
Yes, the existing analytical models (`ArchitectureAnalysis`, `centralityMap`, `layerMap`, `domainMap`) can and SHOULD be preserved as the higher-level analytical layer. A **small, targeted `LayoutGraphIndex`** providing $O(1)$ node lookups, incident edge arrays, and satellite parent mappings is all that is required. A larger index would duplicate domain logic and increase memory footprint without providing additional performance benefit.

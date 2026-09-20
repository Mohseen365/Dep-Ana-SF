# LAYOUT GRAPH INDEX DESIGN CONTRACT

**Repository:** `dependency-analyzer`
**Authoritative Reference:** `LAYOUT_PERFORMANCE_AUDIT.md`
**Phase:** Wave 1 — Prompt 3 (Design-Only Pass)
**Status:** Frozen Design Contract for P4 Implementation

---

## 1. Executive Summary

This design document defines the architectural contract for the upcoming `LayoutGraphIndex` in the Explorer layout engine (`explorer/src/lib/layout/`). Based on the forensic evidence collected in `LAYOUT_PERFORMANCE_AUDIT.md` and verified against current production code in `explorer/src/lib/architecture-layout.ts`, `analysis.ts`, `centrality.ts`, `global-layout.ts`, and `satellites.ts`, this pass freezes the minimal graph index API.

### Core Architectural Decisions:
1. **Zero High-Level Analytical Logic in Index:** High-level architectural analysis (`layerMap`, `domainMap`, `centralityMap`, `ArchitectureAnalysis`) remains owned by existing analysis modules. `LayoutGraphIndex` is strictly a fast, $O(1)$ graph infrastructure lookups and adjacency container.
2. **Post-Stage 0 Boundary:** The index is constructed exactly once per `computeArchitectureLayout()` run, immediately after Stage 0 normalization (`safeNodes` and `safeEdges` deep cloning, missing endpoint injection, and ID sorting).
3. **Immutable & Deterministic:** The index is 100% deterministic, immutable, and transiently scoped to a single layout pipeline execution.
4. **Minimal API Scope:** Out of 15 candidate fields evaluated from P2, **7 fields are REQUIRED** (`nodeById`, `incomingEdgesByNode`, `outgoingEdgesByNode`, `incidentEdgesByNode`, `incomingNeighborsByNode`, `outgoingNeighborsByNode`, `incidentNeighborsByNode`), **2 fields are DERIVED/SHARED** (`parentProductionNodeId`, `parentObjectId`), and **6 fields are REJECTED or MOVED** (`edgeById`, `fanInByNode`, `fanOutByNode`, `primaryNodeIds`, `secondaryNodeIds`, `nodesByType`) to prevent duplicate models and hidden layout-policy leaks.

---

## 2. P2 Findings Verified Against Code

A forensic verification of `LAYOUT_PERFORMANCE_AUDIT.md` against current production source code yielded the following confirmations:

| Audit Finding | Current Code Verification | Status / Recommendation |
| :--- | :--- | :--- |
| **Memoization at Entry** | In `architecture-layout.ts:139`, `computeArchitectureAnalysis()` is executed once at Stage 1 and passed downstream. | **VERIFIED:** Index should be constructed right after Stage 0 normalization and passed into `computeArchitectureAnalysis()`. |
| **$O(N \cdot E)$ Centrality Scan** | `computeGraphCentralityAnalysis` (`centrality.ts:151`) executes `edges.filter(e => e.source === nodeId || e.target === nodeId)` for every node in a loop. | **VERIFIED:** Replacing `edges.filter(...)` with `index.incidentEdgesByNode.get(nodeId)` reduces centrality analysis from $O(N \cdot E)$ to $O(N + E)$. |
| **$O(N \cdot E)$ Parent Scans** | `findParentProductionNodeId` and `findParentObjectId` (`analysis.ts:42,99`) execute `edges.filter(...)` and `allNodes.find(...)` inside satellite loops. | **VERIFIED:** Index pre-calculating parent targets or providing $O(1)$ node/incident edge lookups converts parent resolution to $O(1)$. |
| **Global Layout Fallback** | `calculatePrimaryLayerRowCounts` (`global-layout.ts:156`) falls back to `classifyNodeDomain` ($O(E)$) when options maps are missing. | **VERIFIED:** Receiving pre-indexed node lookups and analysis guarantees $O(N)$ bucket grouping without re-traversals. |
| **Ordering Barycenter Adjacency** | `reduceEdgeCrossings` (`ordering.ts`) constructs local `adjMap`. | **VERIFIED:** Local adjacency construction in `ordering.ts` takes negligible time ($O(N+E)$) and changing its sweep structures poses regression risks. Do NOT migrate ordering in P4. |

---

## 3. Graph Boundary

The boundary for `LayoutGraphIndex` is strictly the normalized, canonical layout input subgraph:

```text
RAW INPUT (nodes, edges)
         │
         ▼
[Stage 0 Normalization]
   1. Deep clone `nodes` & `edges` into `safeNodes` & `safeEdges`.
   2. Missing endpoint resolution: Detect endpoints in `safeEdges` missing from `safeNodes` and append synthetic `type: 'External'` nodes.
   3. Deterministic sorting: `safeNodes.sort((a,b) => a.id.localeCompare(b.id))` and `safeEdges.sort((a,b) => a.id.localeCompare(b.id))`.
         │
         ▼
[LayoutGraphIndex Boundary] (safeNodes, safeEdges)
         │
         ▼
createLayoutGraphIndex(safeNodes, safeEdges)
```

### Boundary Specifics:
- **Stage 0 Start & End:** Begins at function entry of `computeArchitectureLayout()` and ends right after `safeNodes.sort()` and `safeEdges.sort()`.
- **Synthetic Endpoints:** Injected inside Stage 0 before sorting. Thus, `safeNodes` contains all valid nodes (original + synthetic) before `createLayoutGraphIndex()` is called.
- **Deterministic Sorting:** `safeNodes` and `safeEdges` are deterministically ordered by `id.localeCompare()` before index creation.
- **Post-Index Immutability:** Nothing mutates `safeNodes` or `safeEdges` after Stage 0. No elements are added, removed, or reordered during layout calculation.
- **Object References:** `LayoutGraphIndex` safely retains direct references to the `ExplorerNode` and `ExplorerEdge` objects in `safeNodes` and `safeEdges`.

---

## 4. Responsibility / Ownership Matrix

To prevent duplicate graph models and ambiguous architectural boundaries, ownership across modules is strictly partitioned:

| Concern | LayoutGraphIndex | ArchitectureAnalysis | Layers | Domains | Centrality |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **node lookup (`nodeById`)** | **Authoritative ($O(1)$)** | Consumes Index | — | — | — |
| **edge lookup** | In `incidentEdges` | Consumes Index | — | — | — |
| **adjacency (`incoming/outgoing/incident`)** | **Authoritative ($O(1)$)** | Consumes Index | — | — | — |
| **degree (`fanIn / fanOut`)** | Derived (`edges.length`) | **Authoritative** | — | — | — |
| **component ID (`componentId`)** | — | **Authoritative** | — | — | — |
| **test parent (`parentProductionNodeId`)** | Shared Lookup ($O(1)$) | **Authoritative** | — | — | — |
| **field parent (`parentObjectId`)** | Shared Lookup ($O(1)$) | **Authoritative** | — | — | — |
| **layer (`layerMap`)** | — | Stores Slot | **Authoritative** | — | — |
| **domain (`domainMap`)** | — | Stores Slot | — | **Authoritative** | — |
| **spatial role (`spatialRole`)** | — | — | — | — | **Authoritative** |
| **bridge/hub score (`hubScore`, `bridgeScore`)** | — | Stores Slot | — | — | **Authoritative** |
| **feature membership** | — | — | — | — | — |
| **spatial coordinates (`x, y`)** | — | — | — | — | — |

---

## 5. Final Minimal API

The exact TypeScript interface and factory specification to be created in `explorer/src/lib/layout/graph-index.ts`:

```ts
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

/**
 * Minimal, deterministic, immutable graph infrastructure index.
 * Built once per computeArchitectureLayout() run after Stage 0 normalization.
 */
export interface LayoutGraphIndex {
  /** Fast O(1) lookup map of nodeId -> ExplorerNode */
  readonly nodeById: ReadonlyMap<string, ExplorerNode>;

  /** Incoming edges targeting each node (sorted deterministically by edge ID) */
  readonly incomingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Outgoing edges originating from each node (sorted deterministically by edge ID) */
  readonly outgoingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incident (incoming + outgoing) edges for each node (sorted deterministically by edge ID) */
  readonly incidentEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incoming neighbor node IDs targeting each node (sorted deterministically by node ID, deduplicated) */
  readonly incomingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Outgoing neighbor node IDs originating from each node (sorted deterministically by node ID, deduplicated) */
  readonly outgoingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Incident neighbor node IDs for each node (sorted deterministically by node ID, deduplicated) */
  readonly incidentNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Resolved target production node ID for test nodes (or null if unanchored/non-test) */
  readonly parentProductionNodeId: ReadonlyMap<string, string | null>;

  /** Resolved parent CustomObject node ID for field nodes (or null if unanchored/non-field) */
  readonly parentObjectId: ReadonlyMap<string, string | null>;
}

/**
 * Factory function creating an immutable, deterministic LayoutGraphIndex.
 * Requires nodes and edges to be normalized & sorted by ID (Stage 0 output).
 */
export function createLayoutGraphIndex(
  safeNodes: readonly ExplorerNode[],
  safeEdges: readonly ExplorerEdge[]
): LayoutGraphIndex;
```

---

## 6. Field-by-Field Decision Table

Every candidate field from P2 was systematically evaluated against repository needs:

| Field Name | Decision | Classification | Justification |
| :--- | :---: | :--- | :--- |
| `nodeById` | **REQUIRED** | REQUIRED | Eliminates $O(N)$ `safeNodes.find()` scans across all downstream stages. |
| `edgeById` | **REJECTED** | REMOVE | Zero consumers in current code require $O(1)$ lookup of edge object by edge ID. Edge traversals occur via node adjacency. Saving map allocation saves GC overhead. |
| `incomingEdgesByNode` | **REQUIRED** | REQUIRED | Required for barycenter calculations, fan-in metrics, and directional traversal. |
| `outgoingEdgesByNode` | **REQUIRED** | REQUIRED | Required for barycenter calculations, fan-out metrics, and directional traversal. |
| `incidentEdgesByNode` | **REQUIRED** | REQUIRED | Eliminates $O(N \cdot E)$ `edges.filter()` scans in centrality and satellite placement. |
| `incomingNeighborsByNode` | **REQUIRED** | REQUIRED | Enables $O(\text{degree})$ directional barycenter calculation. |
| `outgoingNeighborsByNode` | **REQUIRED** | REQUIRED | Enables $O(\text{degree})$ directional barycenter calculation. |
| `incidentNeighborsByNode` | **REQUIRED** | REQUIRED | Replaces repeated neighbor array construction in `analysis.ts`, `centrality.ts`, and `satellites.ts`. |
| `fanInByNode` | **REJECTED** | DERIVED FROM ANOTHER FIELD | `incomingEdgesByNode.get(id)?.length ?? 0` is $O(1)$ without allocating a separate Map. |
| `fanOutByNode` | **REJECTED** | DERIVED FROM ANOTHER FIELD | `outgoingEdgesByNode.get(id)?.length ?? 0` is $O(1)$ without allocating a separate Map. |
| `parentProductionNodeId` | **RETAINED** | DERIVED / SHARED LOOKUP | Converts test parent resolution from $O(T \cdot (N+E))$ to $O(1)$. Shared by `analysis.ts`, `domains.ts`, and `satellites.ts`. |
| `parentObjectId` | **RETAINED** | DERIVED / SHARED LOOKUP | Converts field object resolution from $O(F \cdot (N+E))$ to $O(1)$. Shared by `analysis.ts` and `satellites.ts`. |
| `primaryNodeIds` | **REJECTED** | BETTER OWNED BY EXISTING MODULE | Belongs in layout policy / domain analysis (`isPrimaryNode()`). Putting it in index leaks layout classification rules into graph infrastructure. |
| `secondaryNodeIds` | **REJECTED** | BETTER OWNED BY EXISTING MODULE | Belongs in layout policy / satellite engine (`isTestNode() \|\| isFieldNode()`). |
| `nodesByType` | **REJECTED** | REMOVE | $O(N)$ filtering by node type during initialization is fast enough on demand; pre-grouping into a multi-map adds API surface without performance gain in layout pipeline. |

---

## 7. Determinism Contract

`LayoutGraphIndex` enforces strict determinism guarantees under all input perturbations:

### Input Invariant Rules:
1. **Node Array Shuffling:** Shuffling input `nodes` before Stage 0 results in identical index Maps because Stage 0 sorts `safeNodes` by `id.localeCompare()`.
2. **Edge Array Shuffling:** Shuffling input `edges` before Stage 0 results in identical index Maps because Stage 0 sorts `safeEdges` by `id.localeCompare()`.
3. **Reversed Edges:** Edge direction (`source` vs `target`) is preserved deterministically.
4. **Duplicate Node / Edge IDs:** Stage 0 filtering and index creation treat IDs uniquely. Map iteration order follows sorted ID order.

### Canonical Ordering Rules:
- **Map Keys:** Map keys (`nodeById`, `incidentEdgesByNode`, etc.) are inserted in alphabetical `id` order.
- **Edge Arrays (`incomingEdgesByNode`, `outgoingEdgesByNode`, `incidentEdgesByNode`):** Arrays are sorted by `edge.id.localeCompare()`.
- **Neighbor Arrays (`incomingNeighborsByNode`, `outgoingNeighborsByNode`, `incidentNeighborsByNode`):** Neighbor ID arrays are sorted alphabetically by neighbor `nodeId` and deduplicated.
- **Self-Loops:** Self-loops (`source === target`) are excluded from neighbor arrays but included in incident edge arrays.
- **Multi-Edges (Parallel Edges):** If multiple edges exist between the same source and target, all edges appear in edge arrays, but duplicate neighbor IDs are removed in neighbor arrays.

---

## 8. Mutability / Lifetime Contract

### Pipeline Lifetime Scope:
```text
computeArchitectureLayout()
   │
   ├── Stage 0: safeNodes, safeEdges normalized & sorted
   ├── createLayoutGraphIndex(safeNodes, safeEdges) ──► Index Created
   ├── Stage 1: computeArchitectureAnalysis(..., index)
   ├── Stage 2: Layer classification
   ├── Stage 3: Domain discovery
   ├── Stage 4: Centrality analysis
   ├── ... Downstream layout stages read index ...
   └── Layout return ──► Index becomes unreachable and is garbage collected
```

### Mutability & Defense Rules:
- **No `Object.freeze()` on Maps:** Standard JavaScript `Map` objects cannot be frozen with `Object.freeze()` (freezing a Map prevents setting properties, but `Map.prototype.set` still works or throws unexpectedly). Instead, the index interface exposes `ReadonlyMap<K, V>`.
- **Frozen Arrays:** All returned arrays (`readonly ExplorerEdge[]`, `readonly string[]`) are frozen via `Object.freeze()` in non-production or constructed from immutable copies to prevent caller array mutations (`.push()`, `.sort()`).
- **Defensive API Access:** `index.incidentEdgesByNode.get(nodeId)` returns `readonly ExplorerEdge[]`. If a nodeId is unknown or has 0 incident edges, the index returns an empty frozen array `[]` rather than `undefined` to eliminate downstream null checks.
- **Map Entries for Zero-Degree Nodes:** Every node in `safeNodes` has an explicit key entry in `nodeById`, `incomingEdgesByNode`, `outgoingEdgesByNode`, `incidentEdgesByNode`, `incomingNeighborsByNode`, `outgoingNeighborsByNode`, `incidentNeighborsByNode`, `parentProductionNodeId`, and `parentObjectId`.

---

## 9. Parent Resolution Semantics

Parent resolution logic in `analysis.ts` is a known performance hotspot. `LayoutGraphIndex` pre-computes parent resolution at construction using the exact existing semantics:

### Test Production Parent (`parentProductionNodeId`) Semantics:
1. **Target Qualification:** A production parent target MUST NOT be a test node (`!isTestNode(n)`).
2. **Step 1 — Direct Edge Check:** Inspect incident edges of `testNode`. Find all connected non-test nodes.
   - If one or more connected non-test nodes exist, sort candidate node IDs alphabetically (`localeCompare`) and select the first ID.
3. **Step 2 — Naming Convention Match:** If no direct connected non-test node exists, strip trailing `test`, `tests`, or `testdatafactory` (case-insensitive) from `testNode.displayName || testNode.id`.
   - If `strippedName` is non-empty and different from `testName`, search `safeNodes` for non-test nodes where `n.displayName === strippedName` or `n.id.endsWith(':' + strippedName)`.
   - If matching production nodes are found, sort by `n.id.localeCompare` and select the first ID.
4. **Fallback:** Return `null` if no matching production node is found.

### Field Object Parent (`parentObjectId`) Semantics:
1. **Target Qualification:** A parent object target MUST be of type `'Object'`, `'CustomObject'`, or `'External'`.
2. **Step 1 — ID Structure Match:** Split `fieldNode.id` by `'.'`.
   - If `idParts.length >= 2`, extract `parentObjName` from `idParts[0]` by stripping prefixes `^(Object|CustomObject|Field|CustomField):`.
   - Search `safeNodes` for candidate parent objects where `n.displayName === parentObjName` or `n.id.endsWith(':' + parentObjName)`.
   - If found, select the matching node ID.
3. **Step 2 — Connected Edge Check:** If ID structure match fails, inspect incident edges of `fieldNode`. Find all connected object/custom object/external nodes.
   - Sort candidate parent IDs alphabetically (`localeCompare`) and select the first ID.
4. **Fallback:** Return `null` if no parent object is found.

---

## 10. Primary / Secondary Classification Decision

### Recommendation: REJECT from `LayoutGraphIndex`.

### Rationale:
- Classification of a node as "primary" vs "secondary/satellite" relies on `isTestNode(node)` and `isFieldNode(node)`.
- While `isTest` and `isField` are node facts, grouping nodes into `primaryNodeIds` and `secondaryNodeIds` reflects layout-stage partitioning policy used specifically in Stage 7 (`computeLocalNodeLayout`) and Stage 9 (`placeSatellites`).
- Placing these arrays on `LayoutGraphIndex` would turn the index into a hidden layout-policy container.
- Consumers that require primary node lists can easily perform `safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n))` or read `ArchitectureAnalysis.nodeList`.

---

## 11. Nodes-by-Type Decision

### Recommendation: REJECT from `LayoutGraphIndex`.

### Rationale:
- Filtering nodes by `ExplorerNodeType` (e.g. `'ApexClass'`, `'CustomObject'`, `'LWC'`) is an $O(N)$ operation over `safeNodes`.
- Analysis of layout modules and future Feature Cluster discovery requirements shows that type-based lookups are either done once at initialization or during domain classification.
- Storing a `ReadonlyMap<ExplorerNodeType, readonly ExplorerNode[]>` on `LayoutGraphIndex` increases memory footprint and map initialization overhead for all graph sizes without providing measurable performance gains.
- If specific modules need type-grouped arrays, they can build local maps on demand.

---

## 12. Feature System Boundary

The upcoming Feature Cluster System will build on top of the graph infrastructure established in Wave 1. The boundary between `LayoutGraphIndex` and the Feature System is strictly enforced:

```text
LayoutGraphIndex (Graph Facts & Adjacency Infrastructure)
       │
       ▼
Feature Role Analysis (e.g., Controllers, Services, Selectors)
       │
       ▼
Feature Discovery Engine (Cluster Identification & Boundary Resolution)
       │
       ▼
Feature Cluster Model (Feature Groups & Spatial Metadata)
```

### Strict Boundary Rules:
`LayoutGraphIndex` **MUST NOT** contain:
- Feature IDs or feature names
- Feature cluster membership maps
- Feature centrality or cohesion scores
- Domain-to-feature mappings
- Business domain semantics
- Visual or spatial feature coordinates

---

## 13. Migration Contract

The following existing functions and code paths are approved for migration to consume `LayoutGraphIndex` in Wave 1 — Prompt 4 (P4):

### 1. `analysis.ts` (`computeArchitectureAnalysis`)
- **Current:** Calls `findParentProductionNodeId` and `findParentObjectId` which perform $O(N \cdot E)$ scans.
- **After Index:** Reads `index.parentProductionNodeId.get(id)` and `index.parentObjectId.get(id)` in $O(1)$ time.
- **Complexity:** $O(N \cdot E) \rightarrow O(N)$.
- **Risk:** Zero behavioral risk (index uses identical resolution logic).

### 2. `centrality.ts` (`computeGraphCentralityAnalysis` / `computeNodeBridgeAnalysis`)
- **Current:** Iterates all nodes and executes `edges.filter(e => e.source === nodeId || e.target === nodeId)` ($O(N \cdot E)$).
- **After Index:** Reads `index.incidentEdgesByNode.get(nodeId)` in $O(1)$ time.
- **Complexity:** $O(N \cdot E) \rightarrow O(N + E)$.
- **Risk:** Low risk; edge arrays in index preserve sorted order.

### 3. `satellites.ts` (`placeSatellites`)
- **Current:** Executes `edges.filter(...)` for triggers, handlers, and fields per satellite node ($O(S \cdot E)$).
- **After Index:** Reads `index.incidentEdgesByNode.get(nodeId)` and `index.nodeById.get(otherId)`.
- **Complexity:** $O(S \cdot E) \rightarrow O(S)$.
- **Risk:** Low risk; satellite placement order remains identical.

### 4. `global-layout.ts` (`calculatePrimaryLayerRowCounts` & `buildDomainGraph`)
- **Current:** Uses `safeNodes.find(n => n.id === nodeId)` linear array scans.
- **After Index:** Replaces `find()` with `index.nodeById.get(nodeId)`.
- **Complexity:** $O(N^2) \rightarrow O(N)$.
- **Risk:** Zero risk; exact reference lookup.

---

## 14. Non-Migration Decisions

The following modules **MUST NOT** be migrated in P4:

1. **`ordering.ts` (`reduceEdgeCrossings`):**
   - **Reason:** `reduceEdgeCrossings` already constructs a lightweight local `adjMap: Map<string, string[]>` during initialization ($O(N+E)$). Barycenter sweeps perform array indexed lookups over `adjMap`. Migrating to `LayoutGraphIndex` would yield negligible performance gains while introducing risks of subtle barycenter tie-breaking reorderings.
2. **`components.ts` (`packComponentPositions`):**
   - **Reason:** Operates purely on component bounding boxes (`ComponentLocalLayout`) using 2D shelf packing algorithms; performs zero graph traversals.
3. **`spacing.ts` (`resolveSpacingAndCollisions`):**
   - **Reason:** Operates on 2D bounding boxes and geometric clearances; does not perform graph edge lookups.

---

## 15. Error / Invariant Policy

### Validation & Error Handling Rules:

1. **Duplicate Node IDs:**
   - **Policy:** If duplicate node IDs exist in input `nodes`, Stage 0 retains the last node instance during array normalization. `createLayoutGraphIndex` assumes node IDs in `safeNodes` are unique. If a duplicate is detected during index creation, the index throws `Error('[LayoutGraphIndex] Duplicate node ID detected: ...')`.
2. **Duplicate Edge IDs:**
   - **Policy:** If duplicate edge IDs exist in input `edges`, `createLayoutGraphIndex` throws `Error('[LayoutGraphIndex] Duplicate edge ID detected: ...')`.
3. **Dangling / Missing Endpoints:**
   - **Policy:** Stage 0 injects synthetic `External` nodes for any edge endpoints missing from `safeNodes` prior to index creation. If an edge endpoint is missing during index construction, `createLayoutGraphIndex` throws `Error('[LayoutGraphIndex] Edge refers to unknown endpoint node: ...')` to prevent corrupting downstream layout calculations.
4. **Self-Loops & Parallel Edges:**
   - **Policy:** Self-loops are excluded from `incomingNeighborsByNode`, `outgoingNeighborsByNode`, and `incidentNeighborsByNode`, but retained in `incidentEdgesByNode`. Parallel edges are indexed in edge arrays, while neighbor ID arrays store unique neighbor IDs.

---

## 16. Test Contract

P4 must implement a comprehensive unit test suite in `explorer/src/lib/layout/graph-index.test.ts` covering:

### 1. Construction & Boundary Tests:
- Empty graph (`nodes = []`, `edges = []`).
- Single isolated node.
- Graph with disconnected isolated nodes.
- Graph with directed edges, self-loops, and multi-edges between the same pair.
- Normalization verification: synthetic missing endpoints created in Stage 0 are correctly indexed in `nodeById` and neighbor maps.

### 2. Lookup & Adjacency Tests:
- Verify `nodeById.get(id)` returns exact node reference in $O(1)$.
- Verify `incomingEdgesByNode`, `outgoingEdgesByNode`, and `incidentEdgesByNode` return correct edge subsets.
- Verify `incomingNeighborsByNode`, `outgoingNeighborsByNode`, and `incidentNeighborsByNode` return sorted, deduplicated neighbor IDs.
- Verify unknown node lookups return empty frozen arrays `[]` rather than `undefined`.

### 3. Parent Resolution Compatibility Tests:
- Test production parent resolution: Verify test classes matching naming conventions (e.g. `OrderServiceTest` -> `OrderService`) and direct edge connections resolve to identical parent IDs as `findParentProductionNodeId()`.
- Field parent resolution: Verify field nodes (e.g. `Object:Account.Field:Phone`) resolve to identical parent object IDs as `findParentObjectId()`.

### 4. Determinism Verification Tests:
- Shuffle input `nodes` array 10 times and verify `createLayoutGraphIndex` produces identical serialized key/value structures.
- Shuffle input `edges` array 10 times and verify identical output.
- Reverse edge input arrays and verify identical output.

### 5. Immutability Tests:
- Assert that returned arrays (`incomingEdgesByNode.get(id)`, `incidentNeighborsByNode.get(id)`) are frozen (`Object.isFrozen(arr) === true`).
- Assert that attempting to modify returned arrays in strict mode throws `TypeError`.

---

## 17. Performance Measurement Contract

To verify the performance benefit of `LayoutGraphIndex` without relying solely on downstream stage speedups, P4/P5 must benchmark the layout pipeline using `explorer/src/lib/scalability-layout.test.ts` across synthetic Salesforce graph scales:

### Benchmark Scale Matrix:
- **500 nodes / 1,500 edges**
- **1,000 nodes / 3,000 edges**
- **2,500 nodes / 7,500 edges**
- **5,000 nodes / 15,000 edges**
- **10,000 nodes / 30,000 edges**

### Sub-Stage Telemetry Telemetry Points:
1. `indexConstructionTimeMs`
2. `stage1AnalysisTimeMs`
3. `stage4CentralityTimeMs`
4. `stage5GlobalLayoutTimeMs`
5. `stage9SatelliteTimeMs`
6. `totalPipelineLayoutTimeMs`

### Net Layout Speedup Criteria:
The index implementation is successful if:
1. Net pipeline layout runtime `totalPipelineLayoutTimeMs` decreases at scale ($\ge 2,500$ nodes).
2. Stage 1 (`computeArchitectureAnalysis`) and Stage 4 (`computeGraphCentralityAnalysis`) show $\ge 50\%$ reduction in execution time at large scale.
3. Index construction time remains $< 5\%$ of total layout runtime.

---

## 18. P4 Implementation Plan

The implementation sequence for P4:

1. **Phase 1: Create `graph-index.ts` Infrastructure**
   - Implement `createLayoutGraphIndex()` in `explorer/src/lib/layout/graph-index.ts`.
   - Implement unit test suite in `explorer/src/lib/layout/graph-index.test.ts`.
   - Verify 100% test coverage and determinism invariants.

2. **Phase 2: Integrate Index into Stage 0 (`architecture-layout.ts`)**
   - Construct `index = createLayoutGraphIndex(safeNodes, safeEdges)` in Stage 0.
   - Pass `index` to `computeArchitectureAnalysis(safeNodes, safeEdges, { index, ... })`.

3. **Phase 3: Migrate `analysis.ts`**
   - Update `computeArchitectureAnalysis` to use `index.parentProductionNodeId` and `index.parentObjectId`.

4. **Phase 4: Migrate `centrality.ts`**
   - Update `computeGraphCentralityAnalysis` and `computeNodeBridgeAnalysis` to use `index.incidentEdgesByNode`.

5. **Phase 5: Migrate `satellites.ts`**
   - Update `placeSatellites` to use `index.incidentEdgesByNode` and `index.nodeById`.

6. **Phase 6: Migrate `global-layout.ts`**
   - Update `calculatePrimaryLayerRowCounts` and `buildDomainGraph` to use `index.nodeById`.

7. **Phase 7: Comprehensive Regression & Benchmark Verification**
   - Run full unit test suite (`npm test`).
   - Run scalability benchmarks (`scalability-layout.test.ts`).
   - Verify zero node coordinate shifts across existing fixtures.

---

## 19. Risks

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Coordinate Drift / Layout Geometry Changes** | High | P4 must verify that node positions generated before and after index migration are 100% identical (`expect(positionsAfter).toEqual(positionsBefore)`). |
| **Array Shuffle Order Iteration Regressions** | Medium | Stage 0 sorts `safeNodes` and `safeEdges` by ID before index construction. All index Maps iterate keys in sorted ID order. |
| **Memory Allocation GC Spikes** | Low | Index maps are lightweight ($< 10\text{ MB}$ at 5,000 nodes). Unused fields (`edgeById`, `nodesByType`) were explicitly rejected to minimize heap pressure. |

---

## 20. Open Questions

- **Question 1:** Should `LayoutGraphIndex` eventually be exposed to the UI layer for interactive hover/highlighting lookups?
  *Answer:* No. Interactive UI components (like `GraphView.tsx`) consume Cytoscape canvas APIs or state hooks. `LayoutGraphIndex` is transient to the layout calculation pipeline.

- **Question 2:** Will Feature Discovery in Wave 2 need additional adjacency indices?
  *Answer:* Feature Discovery can consume `LayoutGraphIndex.incomingNeighborsByNode` and `outgoingNeighborsByNode` directly without requiring modifications to the index structure.

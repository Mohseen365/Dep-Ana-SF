# Connection Analysis Algorithm Documentation

## Overview

The **Connection Analysis** module (`dependency-analyzer/explorer/src/lib/connection-analysis.ts`) upgrades existing Focus and neighborhood graph traversal capabilities into a deterministic, method-aware sub-graph and interaction path engine.

It allows developers and architectural tools to isolate multi-step component and method calls starting from any origin node within Salesforce architecture graphs.

---

## Data Model

```ts
interface ConnectionAnalysis {
  origin: string;
  direction: FocusDirection; // 'dependencies' | 'dependents' | 'both'
  depth: FocusDepth; // 1 | 2 | 3 | 'ALL'
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  paths: ConnectionPath[];
}

interface ConnectionPath {
  origin: string;
  target: string;
  direction: "dependencies" | "dependents";
  depth: number;
  steps: ConnectionPathStep[];
  orderedPath: string[]; // e.g. ["A.execute()", "B.process()", "C.validate()"]
  edges: ExplorerEdge[];
}

interface ConnectionPathStep {
  component: string;
  method: string | null;
  relationship: ExplorerRelationshipType | null;
  depth: number;
  edge?: ExplorerEdge;
}
```

---

## Algorithm Description

### 1. Adjacency Map Construction

The algorithm indexes all input `ExplorerEdge` objects into an `O(1)` adjacency structure:

- `outgoing`: Maps source node ID to outgoing edges (dependencies).
- `incoming`: Maps target node ID to incoming edges (dependents).

### 2. Reachable Subgraph Neighborhood Isolation

Breadth-First Search (BFS) is performed from `origin` according to the requested `direction` (`dependencies`, `dependents`, or `both`) and `depth` bound (`1`, `2`, `3`, or `'ALL'`). The reachable node ID set determines the filtered `nodes` and `edges` included in `ConnectionAnalysis`.

### 3. Path Traversal & Method Context Preservation

Path traversal expands paths iteratively with queue-based exploration:

- **Per-Path Visited Sets**: Each traversal state maintains a per-path `visitedNodes` set. When an edge points to a node already in the current path's visited set (e.g., `A -> B -> C -> A`), the path terminates at the cycle step to guarantee **cycle safety** without infinite loops.
- **Method Preservation**: Method names are extracted directly from edge metadata (`canonical.source.method`, `canonical.target.method`, `methodOwner`, `method`).
  - Origin step method is populated from the first edge's source method if available.
  - Subsequence steps retain the target method (for dependencies) or caller source method (for dependents) associated _strictly with the traversed edge_.
  - Unrelated methods on intermediate components are **not exposed** on the path step.

### 4. Determinism

- All node lookups use deterministic Map structures.
- Discovered paths are sorted deterministically by:
  1. Direction (`dependencies` < `dependents`)
  2. Depth (`1` < `2` < `3`)
  3. Target component ID
  4. Formatted path key (`orderedPath.join('->')`)

---

## Handled Test Cases

1. `A -> B`: Direct dependency path of length 1.
2. `A -> B -> C`: Transitive dependency path of length 2.
3. `A -> B -> C -> D`: Transitive path chain up to depth 3 and `ALL`.
4. `A -> B -> C -> A`: Circular dependency / cycle safety (terminates gracefully).
5. `A -> B.process() -> C.validate()`: Retains exact method context per step (`A.execute() -> B.process() -> C.validate()`).
6. `A -> B.process()` where B has unrelated methods: Unrelated methods on B are isolated and excluded from path context.
7. `dependents` direction (`D <- C <- B <- A`): Upstream callers traversed cleanly.
8. `both` direction: Downstream dependencies and upstream dependents analyzed simultaneously.

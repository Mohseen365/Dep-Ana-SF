import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

export type GraphDepthDirection = 'dependencies' | 'dependents' | 'both';

export interface GraphDepthOptions {
  maxDepth?: number;
  direction?: GraphDepthDirection;
  allowedEdgeTypes?: Set<string> | string[];
  excludedEdgeTypes?: Set<string> | string[];
}

export interface GraphDepthResult {
  focalNodeId: string;
  depthMap: Map<string, number>;
  reachableNodeIds: string[];
  reachableEdges: ExplorerEdge[];
  maxDepthReached: number;
}

interface AdjacencyMap {
  outgoing: Map<string, ExplorerEdge[]>;
  incoming: Map<string, ExplorerEdge[]>;
}

function buildFilteredAdjacencyMap(
  edges: ExplorerEdge[],
  allowedSet: Set<string> | null,
  excludedSet: Set<string> | null
): AdjacencyMap {
  const outgoing = new Map<string, ExplorerEdge[]>();
  const incoming = new Map<string, ExplorerEdge[]>();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const relType = edge.relationshipType;

    if (allowedSet && !allowedSet.has(relType)) {
      continue;
    }
    if (excludedSet && excludedSet.has(relType)) {
      continue;
    }

    let outList = outgoing.get(edge.source);
    if (!outList) {
      outList = [];
      outgoing.set(edge.source, outList);
    }
    outList.push(edge);

    let inList = incoming.get(edge.target);
    if (!inList) {
      inList = [];
      incoming.set(edge.target, inList);
    }
    inList.push(edge);
  }

  // Deterministically sort adjacency edge lists by target/source and relationshipType
  outgoing.forEach((list) => {
    list.sort((a, b) => {
      const tDiff = a.target.localeCompare(b.target);
      if (tDiff !== 0) return tDiff;
      const rDiff = (a.relationshipType || '').localeCompare(b.relationshipType || '');
      if (rDiff !== 0) return rDiff;
      return (a.id || '').localeCompare(b.id || '');
    });
  });

  incoming.forEach((list) => {
    list.sort((a, b) => {
      const sDiff = a.source.localeCompare(b.source);
      if (sDiff !== 0) return sDiff;
      const rDiff = (a.relationshipType || '').localeCompare(b.relationshipType || '');
      if (rDiff !== 0) return rDiff;
      return (a.id || '').localeCompare(b.id || '');
    });
  });

  return { outgoing, incoming };
}

/**
 * Pure, deterministic Breadth-First Search (BFS) graph depth calculator.
 * Computes minimum directed shortest-path distance from a focal node.
 * Guarantees zero graph mutation, cycle safety, and input-order determinism.
 */
export function computeGraphDepths(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  focusNodeId: string | null | undefined,
  options: GraphDepthOptions = {}
): GraphDepthResult {
  const maxDepth = options.maxDepth ?? 7;
  const direction = options.direction ?? 'dependencies';

  const allowedSet = options.allowedEdgeTypes
    ? new Set(options.allowedEdgeTypes)
    : null;
  const excludedSet = options.excludedEdgeTypes
    ? new Set(options.excludedEdgeTypes)
    : null;

  // Build node lookup map
  const validNodeIds = new Set<string>();
  if (Array.isArray(nodes)) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] && nodes[i].id) {
        validNodeIds.add(nodes[i].id);
      }
    }
  }

  // Validate focal node existence
  if (!focusNodeId || !validNodeIds.has(focusNodeId)) {
    return {
      focalNodeId: focusNodeId || '',
      depthMap: new Map(),
      reachableNodeIds: [],
      reachableEdges: [],
      maxDepthReached: 0,
    };
  }

  const safeEdges = Array.isArray(edges) ? edges : [];
  const adj = buildFilteredAdjacencyMap(safeEdges, allowedSet, excludedSet);

  const depthMap = new Map<string, number>();
  depthMap.set(focusNodeId, 0);

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: focusNodeId, depth: 0 }];
  let maxDepthReached = 0;

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth > maxDepthReached) {
      maxDepthReached = depth;
    }

    if (depth >= maxDepth) {
      continue;
    }

    if (direction === 'dependencies' || direction === 'both') {
      const outEdges = adj.outgoing.get(nodeId);
      if (outEdges) {
        for (let i = 0; i < outEdges.length; i++) {
          const targetId = outEdges[i].target;
          if (!depthMap.has(targetId) && validNodeIds.has(targetId)) {
            depthMap.set(targetId, depth + 1);
            queue.push({ nodeId: targetId, depth: depth + 1 });
          }
        }
      }
    }

    if (direction === 'dependents' || direction === 'both') {
      const inEdges = adj.incoming.get(nodeId);
      if (inEdges) {
        for (let i = 0; i < inEdges.length; i++) {
          const sourceId = inEdges[i].source;
          if (!depthMap.has(sourceId) && validNodeIds.has(sourceId)) {
            depthMap.set(sourceId, depth + 1);
            queue.push({ nodeId: sourceId, depth: depth + 1 });
          }
        }
      }
    }
  }

  const reachableNodeIds = Array.from(depthMap.keys()).sort((a, b) => a.localeCompare(b));

  // Collect reachable edges (edges where both source and target are reachable and pass edge filters)
  const reachableEdges: ExplorerEdge[] = [];
  const seenEdgeKeys = new Set<string>();

  for (let i = 0; i < safeEdges.length; i++) {
    const edge = safeEdges[i];
    const relType = edge.relationshipType;

    if (allowedSet && !allowedSet.has(relType)) continue;
    if (excludedSet && excludedSet.has(relType)) continue;

    if (depthMap.has(edge.source) && depthMap.has(edge.target)) {
      const edgeKey = edge.id || `${edge.source}->${edge.target}:${edge.relationshipType}:${i}`;
      if (!seenEdgeKeys.has(edgeKey)) {
        seenEdgeKeys.add(edgeKey);
        reachableEdges.push(edge);
      }
    }
  }

  // Sort reachable edges deterministically
  reachableEdges.sort((a, b) => {
    const sDiff = a.source.localeCompare(b.source);
    if (sDiff !== 0) return sDiff;
    const tDiff = a.target.localeCompare(b.target);
    if (tDiff !== 0) return tDiff;
    const rDiff = (a.relationshipType || '').localeCompare(b.relationshipType || '');
    if (rDiff !== 0) return rDiff;
    return (a.id || '').localeCompare(b.id || '');
  });

  return {
    focalNodeId: focusNodeId,
    depthMap,
    reachableNodeIds,
    reachableEdges,
    maxDepthReached,
  };
}

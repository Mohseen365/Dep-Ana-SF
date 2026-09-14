import { ExplorerNode, ExplorerEdge } from '../types/explorer';

export type FocusDirection = 'both' | 'dependencies' | 'dependents';
export type FocusDepth = 1 | 2 | 3 | 'ALL';

export interface FocusState {
  enabled: boolean;
  focusNodeId: string | null;
  direction: FocusDirection;
  depth: FocusDepth;
}

export interface FocusedGraphData {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  centerNodeId: string | null;
}

interface EdgeAdjacencyMap {
  outgoing: Map<string, ExplorerEdge[]>;
  incoming: Map<string, ExplorerEdge[]>;
}

function buildAdjacencyMap(edges: ExplorerEdge[]): EdgeAdjacencyMap {
  const outgoing = new Map<string, ExplorerEdge[]>();
  const incoming = new Map<string, ExplorerEdge[]>();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

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

  return { outgoing, incoming };
}

function getReachableNodesOut(
  adj: EdgeAdjacencyMap,
  startNodeId: string,
  maxDepth: number | 'ALL'
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (maxDepth !== 'ALL' && depth >= maxDepth) continue;

    const outgoingEdges = adj.outgoing.get(nodeId);
    if (outgoingEdges) {
      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        if (!visited.has(edge.target)) {
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }
  }

  return visited;
}

function getReachableNodesIn(
  adj: EdgeAdjacencyMap,
  startNodeId: string,
  maxDepth: number | 'ALL'
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (maxDepth !== 'ALL' && depth >= maxDepth) continue;

    const incomingEdges = adj.incoming.get(nodeId);
    if (incomingEdges) {
      for (let i = 0; i < incomingEdges.length; i++) {
        const edge = incomingEdges[i];
        if (!visited.has(edge.source)) {
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      }
    }
  }

  return visited;
}

export function computeFocusedGraph(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  focusState: FocusState
): FocusedGraphData {
  if (!focusState.enabled || !focusState.focusNodeId) {
    return { nodes: [], edges: [], centerNodeId: null };
  }

  const { focusNodeId, direction, depth } = focusState;
  const adj = buildAdjacencyMap(edges);
  const reachableNodes = new Set<string>();

  if (direction === 'dependencies' || direction === 'both') {
    const outNodes = getReachableNodesOut(adj, focusNodeId, depth);
    outNodes.forEach(n => reachableNodes.add(n));
  }

  if (direction === 'dependents' || direction === 'both') {
    const inNodes = getReachableNodesIn(adj, focusNodeId, depth);
    inNodes.forEach(n => reachableNodes.add(n));
  }

  reachableNodes.add(focusNodeId);

  const focusedNodes: ExplorerNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (reachableNodes.has(nodes[i].id)) {
      focusedNodes.push(nodes[i]);
    }
  }

  const focusedEdges: ExplorerEdge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (reachableNodes.has(e.source) && reachableNodes.has(e.target)) {
      focusedEdges.push(e);
    }
  }

  return {
    nodes: focusedNodes,
    edges: focusedEdges,
    centerNodeId: focusNodeId
  };
}

export function hasConnections(
  edges: ExplorerEdge[],
  nodeId: string,
  _direction: FocusDirection
): { hasDependencies: boolean; hasDependents: boolean } {
  let hasDependencies = false;
  let hasDependents = false;

  for (let i = 0; i < edges.length; i++) {
    if (edges[i].source === nodeId) hasDependencies = true;
    if (edges[i].target === nodeId) hasDependents = true;
    if (hasDependencies && hasDependents) break;
  }

  return {
    hasDependencies,
    hasDependents
  };
}

export function createEmptyFocusState(): FocusState {
  return {
    enabled: false,
    focusNodeId: null,
    direction: 'both',
    depth: 2
  };
}

export function isFocusActive(focusState: FocusState): boolean {
  return focusState.enabled && !!focusState.focusNodeId;
}

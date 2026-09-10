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

/**
 * Get the set of nodes reachable from startNode within maxDepth hops in the outgoing direction.
 * Outgoing = dependencies (what this node depends on)
 * depth 1 = start node + direct dependencies
 * depth 2 = start node + direct dependencies + their dependencies
 */
function getReachableNodesOut(
  edges: ExplorerEdge[],
  startNodeId: string,
  maxDepth: number | 'ALL'
): Set<string> {
  const visited = new Set<string>();
  // Queue stores {nodeId, depth} where depth is the number of edges from startNode
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    
    // Add to visited
    visited.add(nodeId);
    
    // Only explore further if we haven't reached max depth
    // depth 0 = start node, depth 1 = 1 hop away, etc.
    if (maxDepth !== 'ALL' && depth >= maxDepth) continue;
    
    // Find all outgoing edges (dependencies)
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        queue.push({ nodeId: edge.target, depth: depth + 1 });
      }
    }
  }
  
  return visited;
}

/**
 * Get the set of nodes reachable from startNode within maxDepth hops in the incoming direction.
 * Incoming = dependents (what depends on this node)
 */
function getReachableNodesIn(
  edges: ExplorerEdge[],
  startNodeId: string,
  maxDepth: number | 'ALL'
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    
    // Add to visited
    visited.add(nodeId);
    
    // Only explore further if we haven't reached max depth
    if (maxDepth !== 'ALL' && depth >= maxDepth) continue;
    
    // Find all incoming edges (dependents)
    const incomingEdges = edges.filter(e => e.target === nodeId);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        queue.push({ nodeId: edge.source, depth: depth + 1 });
      }
    }
  }
  
  return visited;
}

/**
 * Build the focused subgraph based on focus state.
 * Uses the original analyzer data and computes deterministically.
 */
export function computeFocusedGraph(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  focusState: FocusState
): FocusedGraphData {
  // If not focused, return empty (caller should use full data)
  if (!focusState.enabled || !focusState.focusNodeId) {
    return { nodes: [], edges: [], centerNodeId: null };
  }

  const { focusNodeId, direction, depth } = focusState;
  
  // Build sets of nodes based on direction
  let reachableNodes = new Set<string>();
  
  if (direction === 'dependencies' || direction === 'both') {
    const outNodes = getReachableNodesOut(edges, focusNodeId, depth);
    outNodes.forEach(n => reachableNodes.add(n));
  }
  
  if (direction === 'dependents' || direction === 'both') {
    const inNodes = getReachableNodesIn(edges, focusNodeId, depth);
    inNodes.forEach(n => reachableNodes.add(n));
  }
  
  // Always include the focus node itself
  reachableNodes.add(focusNodeId);
  
  // Filter nodes to only include reachable ones
  const focusedNodes = nodes.filter(n => reachableNodes.has(n.id));
  
  // Filter edges to only include those where both source and target are in the reachable set
  const focusedEdges = edges.filter(
    e => reachableNodes.has(e.source) && reachableNodes.has(e.target)
  );
  
  return {
    nodes: focusedNodes,
    edges: focusedEdges,
    centerNodeId: focusNodeId
  };
}

/**
 * Check if a node has any connections.
 * Direction parameter kept for potential future use but currently checks both.
 */
export function hasConnections(
  edges: ExplorerEdge[],
  nodeId: string,
  _direction: FocusDirection
): { hasDependencies: boolean; hasDependents: boolean } {
  const outgoing = edges.filter(e => e.source === nodeId);
  const incoming = edges.filter(e => e.target === nodeId);
  
  return {
    hasDependencies: outgoing.length > 0,
    hasDependents: incoming.length > 0
  };
}

/**
 * Create empty focus state.
 */
export function createEmptyFocusState(): FocusState {
  return {
    enabled: false,
    focusNodeId: null,
    direction: 'both',
    depth: 2
  };
}

/**
 * Check if focus is enabled and has valid state.
 */
export function isFocusActive(focusState: FocusState): boolean {
  return focusState.enabled && !!focusState.focusNodeId;
}
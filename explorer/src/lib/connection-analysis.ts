import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerRelationshipType,
} from '../types/explorer';
import { FocusDirection, FocusDepth } from './focus-graph';

/**
 * Options for running Connection Analysis.
 */
export interface ConnectionAnalysisOptions {
  /** The starting node ID for connection analysis. */
  origin: string;
  /** Direction of graph traversal: 'dependencies' (outgoing), 'dependents' (incoming), or 'both'. */
  direction: FocusDirection;
  /** Maximum traversal depth: 1, 2, 3, or 'ALL'. */
  depth: FocusDepth;
  /** Optional maximum number of paths to collect per direction. */
  maxPaths?: number;
  /** If true, filter output paths to investigation candidates. */
  showOnlyInvestigation?: boolean;
}

/**
 * Represents a single step in a connection path.
 */
export interface ConnectionPathStep {
  /** Component ID at this step. */
  component: string;
  /** Method or function name, if available. */
  method: string | null;
  /** Relationship type of the edge leading to this step. */
  relationship: ExplorerRelationshipType | string | null;
  /** Depth (hop count) from the origin node. */
  depth: number;
  /** The specific edge traversed to reach this step. */
  edge?: ExplorerEdge;
}

/**
 * Represents a specific ordered path of component/method interactions.
 */
export interface ConnectionPath {
  origin: string;
  target: string;
  direction: 'dependencies' | 'dependents';
  depth: number;
  steps: ConnectionPathStep[];
  orderedPath: string[];
  edges: ExplorerEdge[];
  hasCycle: boolean;
  duplicateCount?: number;
  rank?: number;
  isInvestigationCandidate?: boolean;
}

/**
 * Result of a Connection Analysis execution.
 */
export interface ConnectionAnalysis {
  origin: string;
  direction: FocusDirection;
  depth: FocusDepth;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  paths: ConnectionPath[];
  totalPathCount: number;
  collapsedPathCount: number;
  cyclePathCount: number;
  investigationPathCount: number;
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

function formatStepString(step: ConnectionPathStep): string {
  if (step.method) {
    return `${step.component}.${step.method}()`;
  }
  return step.component;
}

function computePathRankAndFlags(
  path: ConnectionPath,
  nodeMap: Map<string, ExplorerNode>
): { rank: number; isInvestigationCandidate: boolean } {
  let score = 100 - path.depth * 5;
  let isCandidate = false;

  if (path.hasCycle) {
    score += 50;
    isCandidate = true;
  }

  for (let i = 0; i < path.steps.length; i++) {
    const step = path.steps[i];
    const node = nodeMap.get(step.component);
    if (node) {
      if (node.risk === 'HIGH') {
        score += 30;
        isCandidate = true;
      } else if (node.risk === 'MEDIUM') {
        score += 10;
      }
    }

    if (step.edge) {
      if (step.edge.unresolved) {
        score += 40;
        isCandidate = true;
      }
    }
  }

  return { rank: score, isInvestigationCandidate: isCandidate };
}

/**
 * Executes method-aware Connection Analysis starting from an origin node.
 */
export function analyzeConnections(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ConnectionAnalysisOptions
): ConnectionAnalysis {
  const { origin: originId, direction, depth, maxPaths = 500, showOnlyInvestigation = false } = options;
  const adj = buildAdjacencyMap(edges);
  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));

  if (!originId || !nodeMap.has(originId)) {
    return {
      origin: originId,
      direction,
      depth,
      nodes: [],
      edges: [],
      paths: [],
      totalPathCount: 0,
      collapsedPathCount: 0,
      cyclePathCount: 0,
      investigationPathCount: 0
    };
  }

  // Calculate reachable nodes for graph isolation
  const reachableNodes = new Set<string>();
  if (direction === 'dependencies' || direction === 'both') {
    const outNodes = getReachableNodesOut(adj, originId, depth);
    outNodes.forEach(n => reachableNodes.add(n));
  }
  if (direction === 'dependents' || direction === 'both') {
    const inNodes = getReachableNodesIn(adj, originId, depth);
    inNodes.forEach(n => reachableNodes.add(n));
  }
  reachableNodes.add(originId);

  const rawPaths: ConnectionPath[] = [];

  // Traversal 1: Downstream (dependencies)
  if (direction === 'dependencies' || direction === 'both') {
    const queue: Array<{
      currentId: string;
      visitedNodes: Set<string>;
      steps: ConnectionPathStep[];
      traversedEdges: ExplorerEdge[];
    }> = [{
      currentId: originId,
      visitedNodes: new Set([originId]),
      steps: [{ component: originId, method: null, relationship: null, depth: 0 }],
      traversedEdges: []
    }];

    while (queue.length > 0 && rawPaths.length < maxPaths) {
      const state = queue.shift()!;
      const currentDepth = state.steps.length - 1;

      if (depth !== 'ALL' && currentDepth >= depth) {
        continue;
      }

      const outEdges = adj.outgoing.get(state.currentId) || [];
      for (let i = 0; i < outEdges.length; i++) {
        const edge = outEdges[i];
        const targetId = edge.target;

        const sourceMethod = edge.canonical?.source?.method || edge.methodOwner || null;
        const targetMethod = edge.canonical?.target?.method || edge.method || null;

        const updatedInitialSteps = state.steps.map((s, idx) =>
          idx === 0 && s.method === null && sourceMethod ? { ...s, method: sourceMethod } : s
        );

        const nextStep: ConnectionPathStep = {
          component: targetId,
          method: targetMethod,
          relationship: edge.relationshipType,
          depth: currentDepth + 1,
          edge
        };

        const updatedSteps = [...updatedInitialSteps, nextStep];
        const updatedEdges = [...state.traversedEdges, edge];
        const orderedPath = updatedSteps.map(formatStepString);
        const hasCycle = state.visitedNodes.has(targetId);

        const connPath: ConnectionPath = {
          origin: originId,
          target: targetId,
          direction: 'dependencies',
          depth: currentDepth + 1,
          steps: updatedSteps,
          orderedPath,
          edges: updatedEdges,
          hasCycle
        };

        rawPaths.push(connPath);

        if (!hasCycle) {
          const nextVisited = new Set(state.visitedNodes);
          nextVisited.add(targetId);
          queue.push({
            currentId: targetId,
            visitedNodes: nextVisited,
            steps: updatedSteps,
            traversedEdges: updatedEdges
          });
        }

        if (rawPaths.length >= maxPaths) break;
      }
    }
  }

  // Traversal 2: Upstream (dependents)
  if (direction === 'dependents' || direction === 'both') {
    const queue: Array<{
      currentId: string;
      visitedNodes: Set<string>;
      steps: ConnectionPathStep[];
      traversedEdges: ExplorerEdge[];
    }> = [{
      currentId: originId,
      visitedNodes: new Set([originId]),
      steps: [{ component: originId, method: null, relationship: null, depth: 0 }],
      traversedEdges: []
    }];

    while (queue.length > 0 && rawPaths.length < maxPaths) {
      const state = queue.shift()!;
      const currentDepth = state.steps.length - 1;

      if (depth !== 'ALL' && currentDepth >= depth) {
        continue;
      }

      const inEdges = adj.incoming.get(state.currentId) || [];
      for (let i = 0; i < inEdges.length; i++) {
        const edge = inEdges[i];
        const sourceId = edge.source; // caller component

        const sourceMethod = edge.canonical?.source?.method || edge.methodOwner || null;
        const targetMethod = edge.canonical?.target?.method || edge.method || null;

        const updatedInitialSteps = state.steps.map((s, idx) =>
          idx === 0 && s.method === null && targetMethod ? { ...s, method: targetMethod } : s
        );

        const nextStep: ConnectionPathStep = {
          component: sourceId,
          method: sourceMethod,
          relationship: edge.relationshipType,
          depth: currentDepth + 1,
          edge
        };

        const updatedSteps = [...updatedInitialSteps, nextStep];
        const updatedEdges = [...state.traversedEdges, edge];
        const orderedPath = updatedSteps.map(formatStepString);
        const hasCycle = state.visitedNodes.has(sourceId);

        const connPath: ConnectionPath = {
          origin: originId,
          target: sourceId,
          direction: 'dependents',
          depth: currentDepth + 1,
          steps: updatedSteps,
          orderedPath,
          edges: updatedEdges,
          hasCycle
        };

        rawPaths.push(connPath);

        if (!hasCycle) {
          const nextVisited = new Set(state.visitedNodes);
          nextVisited.add(sourceId);
          queue.push({
            currentId: sourceId,
            visitedNodes: nextVisited,
            steps: updatedSteps,
            traversedEdges: updatedEdges
          });
        }

        if (rawPaths.length >= maxPaths) break;
      }
    }
  }

  const totalPathCount = rawPaths.length;

  // Duplicate Path Collapse & Metadata Annotation
  const pathMap = new Map<string, ConnectionPath>();
  for (let i = 0; i < rawPaths.length; i++) {
    const path = rawPaths[i];
    const signature = `${path.direction}:${path.orderedPath.join('->')}`;
    const existing = pathMap.get(signature);
    if (existing) {
      existing.duplicateCount = (existing.duplicateCount || 1) + 1;
    } else {
      path.duplicateCount = 1;
      const { rank, isInvestigationCandidate } = computePathRankAndFlags(path, nodeMap);
      path.rank = rank;
      path.isInvestigationCandidate = isCandidate(isInvestigationCandidate);
      pathMap.set(signature, path);
    }
  }

  function isCandidate(flag: boolean) {
    return flag;
  }

  let processedPaths = Array.from(pathMap.values());
  const collapsedPathCount = processedPaths.length;
  const cyclePathCount = processedPaths.filter(p => p.hasCycle).length;
  const investigationPathCount = processedPaths.filter(p => p.isInvestigationCandidate).length;

  // Apply "show only investigation" filter if requested
  if (showOnlyInvestigation) {
    processedPaths = processedPaths.filter(p => p.isInvestigationCandidate);
  }

  // Filter focused nodes and edges
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

  // Deterministic sorting of paths: rank descending, then direction, depth, target, path key
  processedPaths.sort((a, b) => {
    if ((b.rank || 0) !== (a.rank || 0)) return (b.rank || 0) - (a.rank || 0);
    if (a.direction !== b.direction) return a.direction.localeCompare(b.direction);
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return a.orderedPath.join('->').localeCompare(b.orderedPath.join('->'));
  });

  return {
    origin: originId,
    direction,
    depth,
    nodes: focusedNodes,
    edges: focusedEdges,
    paths: processedPaths,
    totalPathCount,
    collapsedPathCount,
    cyclePathCount,
    investigationPathCount
  };
}

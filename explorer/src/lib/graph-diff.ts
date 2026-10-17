import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';

export interface GraphDiffResult {
  addedNodes: ExplorerNode[];
  removedNodes: ExplorerNode[];
  modifiedNodes: ExplorerNode[];
  unchangedNodes: ExplorerNode[];
  addedEdges: ExplorerEdge[];
  removedEdges: ExplorerEdge[];
  unchangedEdges: ExplorerEdge[];
  summary: {
    addedNodesCount: number;
    removedNodesCount: number;
    modifiedNodesCount: number;
    addedEdgesCount: number;
    removedEdgesCount: number;
    netNodeChange: number;
    netEdgeChange: number;
  };
}

function isNodeModified(base: ExplorerNode, curr: ExplorerNode): boolean {
  if (base.risk !== curr.risk) return true;
  if (base.type !== curr.type) return true;
  if (base.metrics?.fanIn !== curr.metrics?.fanIn) return true;
  if (base.metrics?.fanOut !== curr.metrics?.fanOut) return true;
  if (base.metrics?.coupling !== curr.metrics?.coupling) return true;
  if (base.metrics?.score !== curr.metrics?.score) return true;
  if (Boolean(base.refactoringReadiness?.hasCycles) !== Boolean(curr.refactoringReadiness?.hasCycles)) return true;
  if (Boolean(base.refactoringReadiness?.hasUnresolved) !== Boolean(curr.refactoringReadiness?.hasUnresolved)) return true;
  return false;
}

export function computeGraphDiff(
  baseline: ExplorerDataSchema,
  current: ExplorerDataSchema
): GraphDiffResult {
  const baseNodes = baseline?.nodes ?? [];
  const currNodes = current?.nodes ?? [];
  const baseEdges = baseline?.edges ?? [];
  const currEdges = current?.edges ?? [];

  const baseNodeMap = new Map<string, ExplorerNode>(baseNodes.map((n) => [n.id, n]));
  const currNodeMap = new Map<string, ExplorerNode>(currNodes.map((n) => [n.id, n]));

  const addedNodes: ExplorerNode[] = [];
  const modifiedNodes: ExplorerNode[] = [];
  const unchangedNodes: ExplorerNode[] = [];

  currNodes.forEach((currNode) => {
    const baseNode = baseNodeMap.get(currNode.id);
    if (!baseNode) {
      addedNodes.push(currNode);
    } else if (isNodeModified(baseNode, currNode)) {
      modifiedNodes.push(currNode);
    } else {
      unchangedNodes.push(currNode);
    }
  });

  const removedNodes: ExplorerNode[] = [];
  baseNodes.forEach((baseNode) => {
    if (!currNodeMap.has(baseNode.id)) {
      removedNodes.push(baseNode);
    }
  });

  const getEdgeKey = (e: ExplorerEdge) => e.id || `${e.source}->${e.target}:${e.relationshipType}`;
  const baseEdgeMap = new Map<string, ExplorerEdge>(baseEdges.map((e) => [getEdgeKey(e), e]));
  const currEdgeMap = new Map<string, ExplorerEdge>(currEdges.map((e) => [getEdgeKey(e), e]));

  const addedEdges: ExplorerEdge[] = [];
  const unchangedEdges: ExplorerEdge[] = [];

  currEdges.forEach((currEdge) => {
    const key = getEdgeKey(currEdge);
    if (!baseEdgeMap.has(key)) {
      addedEdges.push(currEdge);
    } else {
      unchangedEdges.push(currEdge);
    }
  });

  const removedEdges: ExplorerEdge[] = [];
  baseEdges.forEach((baseEdge) => {
    const key = getEdgeKey(baseEdge);
    if (!currEdgeMap.has(key)) {
      removedEdges.push(baseEdge);
    }
  });

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    unchangedNodes,
    addedEdges,
    removedEdges,
    unchangedEdges,
    summary: {
      addedNodesCount: addedNodes.length,
      removedNodesCount: removedNodes.length,
      modifiedNodesCount: modifiedNodes.length,
      addedEdgesCount: addedEdges.length,
      removedEdgesCount: removedEdges.length,
      netNodeChange: addedNodes.length - removedNodes.length,
      netEdgeChange: addedEdges.length - removedEdges.length,
    },
  };
}

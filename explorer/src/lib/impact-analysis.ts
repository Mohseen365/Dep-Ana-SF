import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerComponentImpactSummary } from '../types/explorer';

export type ImpactDepth = 1 | 2 | 3 | 'ALL';

export interface ImpactState {
  enabled: boolean;
  originNodeId: string | null;
  depth: ImpactDepth;
}

export interface ImpactMetrics {
  directDependentsCount: number;
  transitiveDependentsCount: number;
  impactedComponentsCount: number;
  impactedTestsCount: number;
  cyclesInvolvedCount: number;
  unresolvedCount: number;
  visibleImpactedCount: number;
}

export interface ImpactAnalysisResult {
  originNodeId: string;
  originNode: ExplorerNode | null;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
  directDependentIds: string[];
  transitiveDependentIds: string[];
  impactedTestNodeIds: string[];
  summaryMetrics: ImpactMetrics;
}

/**
 * Create initial empty impact state.
 */
export function createEmptyImpactState(): ImpactState {
  return {
    enabled: false,
    originNodeId: null,
    depth: 'ALL'
  };
}

/**
 * Check if impact mode is currently active.
 */
export function isImpactActive(impactState: ImpactState): boolean {
  return impactState.enabled && !!impactState.originNodeId;
}

/**
 * Traverses incoming edges (dependents) up to maxDepth hops away from startNodeId.
 * An edge with target = startNodeId has source = direct dependent.
 */
export function getAffectedNodesIn(
  edges: ExplorerEdge[],
  startNodeId: string,
  maxDepth: ImpactDepth
): Set<string> {
  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (maxDepth !== 'ALL' && depth >= maxDepth) continue;

    // Find all incoming edges (edges pointing to current nodeId)
    const incomingEdges = edges.filter(e => e.target === nodeId);
    for (const edge of incomingEdges) {
      const dependentSource = edge.source;
      if (!visited.has(dependentSource)) {
        visited.add(dependentSource);
        queue.push({ nodeId: dependentSource, depth: depth + 1 });
      }
    }
  }

  return visited;
}

/**
 * Compute detailed impact analysis for the active origin node.
 */
export function computeImpactAnalysis(
  data: ExplorerDataSchema,
  impactState: ImpactState,
  visibleNodeIds?: Set<string>
): ImpactAnalysisResult | null {
  if (!isImpactActive(impactState) || !impactState.originNodeId) {
    return null;
  }

  const originNodeId = impactState.originNodeId;
  const originNode = data.nodes.find(n => n.id === originNodeId) || null;

  if (!originNode) {
    return null;
  }

  const impactSummary: ExplorerComponentImpactSummary = data.impactSummaries[originNodeId] || {
    id: originNodeId,
    directDependencies: [],
    directDependents: [],
    transitiveDependencies: [],
    transitiveDependents: [],
    impactedTests: [],
    totalImpactCount: 0
  };

  // Traversal based on graph edges for the specified depth
  const affectedNodeIds = getAffectedNodesIn(data.edges, originNodeId, impactState.depth);

  // Edges where both source and target are within the affected node set
  const affectedEdgeIds = new Set<string>();
  data.edges.forEach(edge => {
    if (affectedNodeIds.has(edge.source) && affectedNodeIds.has(edge.target)) {
      affectedEdgeIds.add(edge.id);
    }
  });

  // Calculate cycles involved: cycle groups that contain at least one affected node
  const cyclesInvolvedCount = data.cycles.filter(cycle =>
    cycle.nodes.some(nodeId => affectedNodeIds.has(nodeId))
  ).length;

  // Calculate unresolved references count in affected set
  const unresolvedCount = data.edges.filter(
    e => e.unresolved && (affectedNodeIds.has(e.source) || affectedNodeIds.has(e.target))
  ).length;

  // Count visible affected components (excluding origin) if filter set is passed
  const affectedExcludingOrigin = Array.from(affectedNodeIds).filter(id => id !== originNodeId);
  const visibleImpactedCount = visibleNodeIds
    ? affectedExcludingOrigin.filter(id => visibleNodeIds.has(id)).length
    : affectedExcludingOrigin.length;

  return {
    originNodeId,
    originNode,
    affectedNodeIds,
    affectedEdgeIds,
    directDependentIds: impactSummary.directDependents,
    transitiveDependentIds: impactSummary.transitiveDependents,
    impactedTestNodeIds: impactSummary.impactedTests,
    summaryMetrics: {
      directDependentsCount: impactSummary.directDependents.length,
      transitiveDependentsCount: impactSummary.transitiveDependents.length,
      impactedComponentsCount: impactSummary.transitiveDependents.length, // total dependents affected
      impactedTestsCount: impactSummary.impactedTests.length,
      cyclesInvolvedCount,
      unresolvedCount,
      visibleImpactedCount
    }
  };
}

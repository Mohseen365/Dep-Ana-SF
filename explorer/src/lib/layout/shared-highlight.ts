import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureDiscoveryResult } from './features';

export interface SharedHighlightResult {
  /** Mode of highlight */
  type: 'shared_to_features' | 'feature_to_shared' | 'none';
  /** The primary active node or feature ID triggering the highlight */
  activeId: string;
  /** Set of connected Shared Infrastructure node IDs */
  sharedNodeIds: string[];
  /** Set of connected Feature Cluster IDs */
  featureIds: string[];
  /** All connected node IDs (shared + feature members) */
  connectedNodeIds: string[];
  /** Connecting edge IDs between shared nodes and feature members */
  connectedEdgeIds: string[];
}

/**
 * Derives fast O(connected features) shared infrastructure relationships for a selected or hovered node.
 * Does not recompute layout or graph indexing on hover.
 */
export function getSharedHighlightData(
  selectedOrHoveredNodeId: string,
  discoveryResult: FeatureDiscoveryResult,
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): SharedHighlightResult {
  const emptyResult: SharedHighlightResult = {
    type: 'none',
    activeId: selectedOrHoveredNodeId,
    sharedNodeIds: [],
    featureIds: [],
    connectedNodeIds: [],
    connectedEdgeIds: [],
  };

  if (!selectedOrHoveredNodeId || !discoveryResult) {
    return emptyResult;
  }

  const assignment = discoveryResult.assignments.get(selectedOrHoveredNodeId);
  if (!assignment) {
    return emptyResult;
  }

  const safeEdges = Array.isArray(edges) ? edges : [];

  // Case 1: Hovering / selecting a Shared Infrastructure node
  if (assignment.isShared || assignment.primaryFeatureId === 'Shared' || assignment.featureRole === 'SharedInfrastructure') {
    const connectedFeatureIds = [...assignment.secondaryFeatureIds];

    // Find features that reference this shared node
    discoveryResult.features.forEach((feature) => {
      if (feature.secondaryNodeIds.includes(selectedOrHoveredNodeId) && !connectedFeatureIds.includes(feature.id)) {
        connectedFeatureIds.push(feature.id);
      }
    });

    connectedFeatureIds.sort((a, b) => a.localeCompare(b));

    const connectedNodeIds = new Set<string>([selectedOrHoveredNodeId]);
    connectedFeatureIds.forEach((fId) => {
      const feat = discoveryResult.features.get(fId);
      if (feat) {
        feat.primaryNodeIds.forEach((id) => connectedNodeIds.add(id));
      }
    });

    const connectedEdgeIds = new Set<string>();
    safeEdges.forEach((edge) => {
      if (
        (edge.source === selectedOrHoveredNodeId && connectedNodeIds.has(edge.target)) ||
        (edge.target === selectedOrHoveredNodeId && connectedNodeIds.has(edge.source))
      ) {
        connectedEdgeIds.add(edge.id);
      }
    });

    return {
      type: 'shared_to_features',
      activeId: selectedOrHoveredNodeId,
      sharedNodeIds: [selectedOrHoveredNodeId],
      featureIds: connectedFeatureIds,
      connectedNodeIds: Array.from(connectedNodeIds).sort((a, b) => a.localeCompare(b)),
      connectedEdgeIds: Array.from(connectedEdgeIds).sort((a, b) => a.localeCompare(b)),
    };
  }

  // Case 2: Hovering / selecting a Feature member node -> Highlight connected Shared Infrastructure
  const primaryFeatureId = assignment.primaryFeatureId;
  if (primaryFeatureId && primaryFeatureId !== 'Shared' && primaryFeatureId !== 'Unassigned') {
    const feature = discoveryResult.features.get(primaryFeatureId);
    if (feature) {
      const sharedNodeIds = [...feature.secondaryNodeIds].filter((id) => {
        const a = discoveryResult.assignments.get(id);
        return a && (a.isShared || a.primaryFeatureId === 'Shared' || a.featureRole === 'SharedInfrastructure');
      });

      sharedNodeIds.sort((a, b) => a.localeCompare(b));

      const featureMemberSet = new Set<string>(feature.primaryNodeIds);
      const connectedNodeIds = new Set<string>([...feature.primaryNodeIds, ...sharedNodeIds]);

      const connectedEdgeIds = new Set<string>();
      safeEdges.forEach((edge) => {
        if (
          (featureMemberSet.has(edge.source) && sharedNodeIds.includes(edge.target)) ||
          (featureMemberSet.has(edge.target) && sharedNodeIds.includes(edge.source))
        ) {
          connectedEdgeIds.add(edge.id);
        }
      });

      return {
        type: 'feature_to_shared',
        activeId: primaryFeatureId,
        sharedNodeIds,
        featureIds: [primaryFeatureId],
        connectedNodeIds: Array.from(connectedNodeIds).sort((a, b) => a.localeCompare(b)),
        connectedEdgeIds: Array.from(connectedEdgeIds).sort((a, b) => a.localeCompare(b)),
      };
    }
  }

  return emptyResult;
}

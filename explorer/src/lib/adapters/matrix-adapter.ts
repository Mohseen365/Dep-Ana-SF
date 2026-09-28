import type { ExplorerDataSchema } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import { discoverFeatures, type FeatureDiscoveryOptions } from '../layout/features';
import {
  buildFeatureDependencyMatrix,
  compute2DFeatureBandOrdering,
} from '../layout/feature-ordering';
import { buildDomainGraph } from '../layout/global-layout';

export interface MatrixAdapterOptions extends FeatureDiscoveryOptions {}

export interface FeatureMatrixHeader {
  id: string;
  name: string;
  anchorNodeId: string;
  primaryLayer: ArchitectureLayer;
  primaryDomain: string;
  primaryNodeCount: number;
  secondaryNodeCount: number;
  orderIndex: number;
}

export interface FeatureMatrixCell {
  sourceFeatureId: string;
  targetFeatureId: string;
  sourceIndex: number;
  targetIndex: number;
  directWeight: number;
  directionalFlow: number;
  sharedNodeWeight: number;
  combinedWeight: number;
}

export interface FeatureMatrixSummary {
  totalFeatures: number;
  totalDependencies: number;
  maxCombinedWeight: number;
}

export interface FeatureMatrixData {
  features: FeatureMatrixHeader[];
  orderedFeatureIds: string[];
  cells: FeatureMatrixCell[];
  summary: FeatureMatrixSummary;
}

/**
 * Pure, deterministic visualization data adapter for the Feature Matrix lens.
 * Reads canonical ExplorerDataSchema and existing feature analytics primitives
 * to produce typed, compact matrix data.
 */
export function adaptFeatureMatrix(
  input: ExplorerDataSchema,
  options: MatrixAdapterOptions = {}
): FeatureMatrixData {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];

  // 1. Discover Feature Clusters using data-driven candidate score threshold if not explicitly provided
  const dataDrivenMinScore = options.minCandidateScore ?? (nodes.length > 0 && nodes.length < 20 ? 1.0 : 3.0);
  const discoveryOptions: FeatureDiscoveryOptions = {
    ...options,
    minCandidateScore: dataDrivenMinScore,
  };
  const discovery = discoverFeatures(nodes, edges, discoveryOptions);

  // 2. Build feature mapping
  const featureMap = new Map<string, string>();
  discovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });
  nodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  // 3. Build domain graph representation using existing primitive
  const featureGraph = buildDomainGraph(nodes, edges, undefined, options.index, featureMap);

  // 4. Build feature dependency matrix using existing primitive
  const matrix = buildFeatureDependencyMatrix(nodes, edges, featureGraph, featureMap);

  // 5. Compute deterministic 2D feature band placement and ordering
  const bandOrdering = compute2DFeatureBandOrdering(matrix);
  const orderedFeatureIds = bandOrdering.orderedFeatures;

  // 6. Construct feature matrix headers
  const featureIndexMap = new Map<string, number>();
  orderedFeatureIds.forEach((id, idx) => {
    featureIndexMap.set(id, idx);
  });

  const features: FeatureMatrixHeader[] = orderedFeatureIds.map((id, idx) => {
    const cluster = discovery.features.get(id);
    return {
      id,
      name: cluster?.name ?? id.replace(/^feature_/, ''),
      anchorNodeId: cluster?.anchorNodeId ?? '',
      primaryLayer: matrix.featurePrimaryLayers.get(id) ?? 'application',
      primaryDomain: matrix.featurePrimaryDomains.get(id) ?? 'Shared',
      primaryNodeCount: cluster?.primaryNodeIds?.length ?? 0,
      secondaryNodeCount: cluster?.secondaryNodeIds?.length ?? 0,
      orderIndex: idx,
    };
  });

  // 7. Construct matrix dependency cells
  const cells: FeatureMatrixCell[] = [];
  let maxCombinedWeight = 0;

  for (let i = 0; i < orderedFeatureIds.length; i++) {
    const f1 = orderedFeatureIds[i];
    const idx1 = i;

    for (let j = 0; j < orderedFeatureIds.length; j++) {
      if (i === j) continue;
      const f2 = orderedFeatureIds[j];
      const idx2 = j;

      const directWeight = matrix.directWeights.get(f1)?.get(f2) ?? 0;
      const directionalFlow = matrix.directionalFlow.get(f1)?.get(f2) ?? 0;
      const sharedNodeWeight = matrix.sharedNodeWeights.get(f1)?.get(f2) ?? 0;
      const combinedWeight = matrix.combinedWeights.get(f1)?.get(f2) ?? 0;

      if (combinedWeight > 0 || directWeight > 0 || sharedNodeWeight > 0) {
        if (combinedWeight > maxCombinedWeight) {
          maxCombinedWeight = combinedWeight;
        }
        cells.push({
          sourceFeatureId: f1,
          targetFeatureId: f2,
          sourceIndex: idx1,
          targetIndex: idx2,
          directWeight,
          directionalFlow,
          sharedNodeWeight,
          combinedWeight,
        });
      }
    }
  }

  // Sort cells deterministically by sourceIndex then targetIndex
  cells.sort((a, b) => a.sourceIndex - b.sourceIndex || a.targetIndex - b.targetIndex);

  // 8. Summary statistics
  const summary: FeatureMatrixSummary = {
    totalFeatures: features.length,
    totalDependencies: cells.length,
    maxCombinedWeight,
  };

  return {
    features,
    orderedFeatureIds,
    cells,
    summary,
  };
}

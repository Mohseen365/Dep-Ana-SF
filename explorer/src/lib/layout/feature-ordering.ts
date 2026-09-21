import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { DomainGraph } from './global-layout';
import type { ArchitectureLayer } from './types';
import { classifyNodeLayer } from './layers';

export type FeatureOrderingStrategy =
  | 'A_DISCOVERY'
  | 'B_WEIGHTED_BARYCENTER'
  | 'C_WEIGHTED_MEDIAN'
  | 'D_BARYCENTRIC_SWEEPS'
  | 'E_DOMAIN_AWARE'
  | 'F_SHARED_HIERARCHY_AWARE';

export interface FeatureDependencyMatrix {
  featureIds: string[];
  directWeights: Map<string, Map<string, number>>;
  directionalFlow: Map<string, Map<string, number>>;
  sharedNodeWeights: Map<string, Map<string, number>>;
  combinedWeights: Map<string, Map<string, number>>;
  featurePrimaryLayers: Map<string, ArchitectureLayer>;
  featurePrimaryDomains: Map<string, string>;
}

const LAYER_ORDER: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];
const LAYER_PRIORITY: Record<ArchitectureLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

/**
 * Builds a deterministic feature dependency model from graph nodes, edges, and feature assignments.
 */
export function buildFeatureDependencyMatrix(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  featureGraph: DomainGraph,
  featureMap: Map<string, string>
): FeatureDependencyMatrix {
  const featureIds = Array.from(featureGraph.nodes.keys()).sort((a, b) => a.localeCompare(b));

  const directWeights = new Map<string, Map<string, number>>();
  const directionalFlow = new Map<string, Map<string, number>>();
  const sharedNodeWeights = new Map<string, Map<string, number>>();
  const combinedWeights = new Map<string, Map<string, number>>();
  const featurePrimaryLayers = new Map<string, ArchitectureLayer>();
  const featurePrimaryDomains = new Map<string, string>();

  featureIds.forEach(f1 => {
    directWeights.set(f1, new Map());
    directionalFlow.set(f1, new Map());
    sharedNodeWeights.set(f1, new Map());
    combinedWeights.set(f1, new Map());

    const dNode = featureGraph.nodes.get(f1);
    featurePrimaryLayers.set(f1, dNode ? dNode.primaryLayer : 'application');
    featurePrimaryDomains.set(f1, dNode?.primaryDomain || extractDomainFromFeatureId(f1));

    featureIds.forEach(f2 => {
      directWeights.get(f1)!.set(f2, 0);
      directionalFlow.get(f1)!.set(f2, 0);
      sharedNodeWeights.get(f1)!.set(f2, 0);
      combinedWeights.get(f1)!.set(f2, 0);
    });
  });

  // 1. Direct Edges & Directional Flow
  edges.forEach(e => {
    const f1 = featureMap.get(e.source) || 'Unassigned';
    const f2 = featureMap.get(e.target) || 'Unassigned';
    if (f1 !== f2 && directWeights.has(f1) && directWeights.get(f1)!.has(f2)) {
      directWeights.get(f1)!.set(f2, (directWeights.get(f1)!.get(f2) || 0) + 1);

      directionalFlow.get(f1)!.set(f2, (directionalFlow.get(f1)!.get(f2) || 0) + 1);
      directionalFlow.get(f2)!.set(f1, (directionalFlow.get(f2)!.get(f1) || 0) - 1);
    }
  });

  // 2. Shared Node Connections (nodes connected to multiple features)
  const nodeConnectedFeatures = new Map<string, Set<string>>();
  nodes.forEach(n => nodeConnectedFeatures.set(n.id, new Set()));

  edges.forEach(e => {
    const f1 = featureMap.get(e.source) || 'Unassigned';
    const f2 = featureMap.get(e.target) || 'Unassigned';
    if (nodeConnectedFeatures.has(e.source)) nodeConnectedFeatures.get(e.source)!.add(f2);
    if (nodeConnectedFeatures.has(e.target)) nodeConnectedFeatures.get(e.target)!.add(f1);
  });

  nodes.forEach(n => {
    const cFeatures = Array.from(nodeConnectedFeatures.get(n.id) || []).filter(f => sharedNodeWeights.has(f));
    const isSharedOrUnassigned = featureMap.get(n.id) === 'Shared' || featureMap.get(n.id) === 'Unassigned';
    const nodeWeight = isSharedOrUnassigned ? 0.2 : 1.0;

    for (let i = 0; i < cFeatures.length; i++) {
      for (let j = i + 1; j < cFeatures.length; j++) {
        const f1 = cFeatures[i];
        const f2 = cFeatures[j];
        if (f1 !== f2) {
          sharedNodeWeights.get(f1)!.set(f2, (sharedNodeWeights.get(f1)!.get(f2) || 0) + nodeWeight);
          sharedNodeWeights.get(f2)!.set(f1, (sharedNodeWeights.get(f2)!.get(f1) || 0) + nodeWeight);
        }
      }
    }
  });

  // 3. Calculate Combined Weights
  featureIds.forEach(f1 => {
    featureIds.forEach(f2 => {
      if (f1 === f2) return;
      const direct = (directWeights.get(f1)!.get(f2) || 0) + (directWeights.get(f2)!.get(f1) || 0);
      const shared = sharedNodeWeights.get(f1)!.get(f2) || 0;

      const combined = direct * 3.0 + shared * 1.0;
      combinedWeights.get(f1)!.set(f2, combined);
    });
  });

  return {
    featureIds,
    directWeights,
    directionalFlow,
    sharedNodeWeights,
    combinedWeights,
    featurePrimaryLayers,
    featurePrimaryDomains,
  };
}

function extractDomainFromFeatureId(featureId: string): string {
  const clean = featureId.replace(/^feature_/, '');
  const suffixes = ['Controller', 'Service', 'Selector', 'Repository', 'Handler', 'Helper', 'Test', 'Trigger'];
  for (const suffix of suffixes) {
    if (clean.length > suffix.length && clean.endsWith(suffix)) {
      return clean.slice(0, clean.length - suffix.length);
    }
  }
  return clean;
}

/**
 * Strategy A: Discovery Order
 */
export function orderStrategyA_Discovery(matrix: FeatureDependencyMatrix): string[] {
  return [...matrix.featureIds].sort((a, b) => a.localeCompare(b));
}

/**
 * Strategy B: Weighted Barycenter Ordering
 */
export function orderStrategyB_WeightedBarycenter(matrix: FeatureDependencyMatrix): string[] {
  const ordered = [...matrix.featureIds].sort((a, b) => a.localeCompare(b));
  const posMap = new Map<string, number>();
  ordered.forEach((f, idx) => posMap.set(f, idx));

  const barycenters = new Map<string, number>();
  ordered.forEach(f1 => {
    let weightSum = 0;
    let posSum = 0;
    matrix.featureIds.forEach(f2 => {
      if (f1 === f2) return;
      const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
      if (w > 0) {
        posSum += (posMap.get(f2) ?? 0) * w;
        weightSum += w;
      }
    });
    barycenters.set(f1, weightSum > 0 ? posSum / weightSum : posMap.get(f1) || 0);
  });

  return ordered.sort((a, b) => {
    const bA = barycenters.get(a) ?? 0;
    const bB = barycenters.get(b) ?? 0;
    if (Math.abs(bA - bB) > 1e-6) return bA - bB;
    return a.localeCompare(b);
  });
}

/**
 * Strategy C: Weighted Median Ordering
 */
export function orderStrategyC_WeightedMedian(matrix: FeatureDependencyMatrix): string[] {
  const ordered = [...matrix.featureIds].sort((a, b) => a.localeCompare(b));
  const posMap = new Map<string, number>();
  ordered.forEach((f, idx) => posMap.set(f, idx));

  const medians = new Map<string, number>();
  ordered.forEach(f1 => {
    const neighbors: { pos: number; weight: number }[] = [];
    matrix.featureIds.forEach(f2 => {
      if (f1 === f2) return;
      const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
      if (w > 0) {
        neighbors.push({ pos: posMap.get(f2) ?? 0, weight: w });
      }
    });

    if (neighbors.length === 0) {
      medians.set(f1, posMap.get(f1) || 0);
    } else {
      neighbors.sort((a, b) => a.pos - b.pos);
      const totalW = neighbors.reduce((sum, n) => sum + n.weight, 0);
      let cumulative = 0;
      let medianPos = neighbors[0].pos;
      for (const n of neighbors) {
        cumulative += n.weight;
        if (cumulative >= totalW / 2) {
          medianPos = n.pos;
          break;
        }
      }
      medians.set(f1, medianPos);
    }
  });

  return ordered.sort((a, b) => {
    const mA = medians.get(a) ?? 0;
    const mB = medians.get(b) ?? 0;
    if (Math.abs(mA - mB) > 1e-6) return mA - mB;
    return a.localeCompare(b);
  });
}

/**
 * Strategy D: Forward / Backward Barycentric Sweeps
 */
export function orderStrategyD_BarycentricSweeps(matrix: FeatureDependencyMatrix, iterations = 8): string[] {
  let ordered = [...matrix.featureIds].sort((a, b) => a.localeCompare(b));

  for (let pass = 0; pass < iterations; pass++) {
    const isForward = pass % 2 === 0;
    const posMap = new Map<string, number>();
    ordered.forEach((f, idx) => posMap.set(f, idx));

    const barycenters = new Map<string, number>();

    ordered.forEach(f1 => {
      let weightSum = 0;
      let posSum = 0;

      matrix.featureIds.forEach(f2 => {
        if (f1 === f2) return;
        const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
        if (w > 0) {
          const flow = matrix.directionalFlow.get(f1)?.get(f2) || 0;
          const dirBias = isForward ? -flow * 0.1 : flow * 0.1;
          posSum += ((posMap.get(f2) ?? 0) + dirBias) * w;
          weightSum += w;
        }
      });

      barycenters.set(f1, weightSum > 0 ? posSum / weightSum : posMap.get(f1) || 0);
    });

    ordered.sort((a, b) => {
      const bA = barycenters.get(a) ?? 0;
      const bB = barycenters.get(b) ?? 0;
      if (Math.abs(bA - bB) > 1e-6) return bA - bB;
      return a.localeCompare(b);
    });
  }

  return ordered;
}

/**
 * Strategy E: Domain-Aware Ordering
 */
export function orderStrategyE_DomainAware(matrix: FeatureDependencyMatrix): string[] {
  const domainGroups = new Map<string, string[]>();
  matrix.featureIds.forEach(f => {
    const dom = matrix.featurePrimaryDomains.get(f) || 'Shared';
    if (!domainGroups.has(dom)) domainGroups.set(dom, []);
    domainGroups.get(dom)!.push(f);
  });

  const orderedDomains = Array.from(domainGroups.keys()).sort((a, b) => a.localeCompare(b));
  const result: string[] = [];

  orderedDomains.forEach(dom => {
    const fList = domainGroups.get(dom)!;
    fList.sort((a, b) => a.localeCompare(b));
    result.push(...fList);
  });

  return result;
}

/**
 * Strategy F: Layer-Aligned Shared-Infrastructure & Hierarchy-Aware Ordering
 */
export function orderStrategyF_SharedHierarchyAware(matrix: FeatureDependencyMatrix): string[] {
  // Group features by architectural layer
  const featuresByLayer = new Map<ArchitectureLayer, string[]>();
  LAYER_ORDER.forEach(l => featuresByLayer.set(l, []));

  matrix.featureIds.forEach(f => {
    const layer = matrix.featurePrimaryLayers.get(f) || 'application';
    featuresByLayer.get(layer)!.push(f);
  });

  LAYER_ORDER.forEach(l => {
    featuresByLayer.get(l)!.sort((a, b) => a.localeCompare(b));
  });

  // Global position map across all features
  const globalPosMap = new Map<string, number>();
  let currentPos = 0;
  LAYER_ORDER.forEach(l => {
    featuresByLayer.get(l)!.forEach(f => {
      globalPosMap.set(f, currentPos++);
    });
  });

  // Iterative cross-layer barycentric sweeps (8 passes)
  for (let pass = 0; pass < 8; pass++) {
    const isForward = pass % 2 === 0;
    const layersToSweep = isForward ? LAYER_ORDER : [...LAYER_ORDER].reverse();

    layersToSweep.forEach(layer => {
      const layerFeatures = featuresByLayer.get(layer)!;
      if (layerFeatures.length <= 1) return;

      const barycenters = new Map<string, number>();

      layerFeatures.forEach(f1 => {
        let weightSum = 0;
        let posSum = 0;

        matrix.featureIds.forEach(f2 => {
          if (f1 === f2) return;
          const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
          if (w > 0) {
            const f2Pos = globalPosMap.get(f2) ?? 0;
            const flow = matrix.directionalFlow.get(f1)?.get(f2) || 0;
            const dirBias = isForward ? -flow * 0.05 : flow * 0.05;

            // Give higher weight to cross-layer dependencies
            const l1 = matrix.featurePrimaryLayers.get(f1) || 'application';
            const l2 = matrix.featurePrimaryLayers.get(f2) || 'application';
            const crossLayerMultiplier = l1 !== l2 ? 2.0 : 1.0;

            posSum += (f2Pos + dirBias) * w * crossLayerMultiplier;
            weightSum += w * crossLayerMultiplier;
          }
        });

        barycenters.set(f1, weightSum > 0 ? posSum / weightSum : globalPosMap.get(f1) || 0);
      });

      layerFeatures.sort((a, b) => {
        const bA = barycenters.get(a) ?? 0;
        const bB = barycenters.get(b) ?? 0;
        if (Math.abs(bA - bB) > 1e-6) return bA - bB;
        // Deterministic tie-breaker
        return a.localeCompare(b);
      });
    });

    // Re-assign global positions after layer sorting
    currentPos = 0;
    LAYER_ORDER.forEach(l => {
      featuresByLayer.get(l)!.forEach(f => {
        globalPosMap.set(f, currentPos++);
      });
    });
  }

  // Construct final ordered feature list layer by layer
  const finalOrdered: string[] = [];
  LAYER_ORDER.forEach(l => {
    finalOrdered.push(...featuresByLayer.get(l)!);
  });

  return finalOrdered;
}

/**
 * Main entry point for feature ordering.
 */
export function determineGlobalFeatureOrder(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  featureGraph: DomainGraph,
  featureMap: Map<string, string>,
  strategy: FeatureOrderingStrategy = 'F_SHARED_HIERARCHY_AWARE'
): string[] {
  const matrix = buildFeatureDependencyMatrix(nodes, edges, featureGraph, featureMap);

  switch (strategy) {
    case 'A_DISCOVERY':
      return orderStrategyA_Discovery(matrix);
    case 'B_WEIGHTED_BARYCENTER':
      return orderStrategyB_WeightedBarycenter(matrix);
    case 'C_WEIGHTED_MEDIAN':
      return orderStrategyC_WeightedMedian(matrix);
    case 'D_BARYCENTRIC_SWEEPS':
      return orderStrategyD_BarycentricSweeps(matrix);
    case 'E_DOMAIN_AWARE':
      return orderStrategyE_DomainAware(matrix);
    case 'F_SHARED_HIERARCHY_AWARE':
    default:
      return orderStrategyF_SharedHierarchyAware(matrix);
  }
}

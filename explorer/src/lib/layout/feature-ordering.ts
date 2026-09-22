import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { DomainGraph } from './global-layout';
import type { ArchitectureLayer } from './types';

export type FeatureOrderingStrategy =
  | 'A_DISCOVERY'
  | 'B_WEIGHTED_BARYCENTER'
  | 'C_WEIGHTED_MEDIAN'
  | 'D_BARYCENTRIC_SWEEPS'
  | 'E_DOMAIN_AWARE'
  | 'F_SHARED_HIERARCHY_AWARE'
  | 'F_2D_BAND_AWARE';

export interface FeatureDependencyMatrix {
  featureIds: string[];
  directWeights: Map<string, Map<string, number>>;
  directionalFlow: Map<string, Map<string, number>>;
  sharedNodeWeights: Map<string, Map<string, number>>;
  combinedWeights: Map<string, Map<string, number>>;
  featurePrimaryLayers: Map<string, ArchitectureLayer>;
  featurePrimaryDomains: Map<string, string>;
}

export interface Feature2DPlacement {
  featureId: string;
  primaryLayer: ArchitectureLayer;
  bandIndex: number;
  orderInBand: number;
  estimatedX: number;
  estimatedY: number;
}

export interface Feature2DBandMetrics {
  totalFeaturesCount: number;
  totalCrossBandEdgesCount: number;
  totalIntraBandEdgesCount: number;
  crossBandEdgeLengthSum: number;
  avgCrossBandEdgeLength: number;
  intraBandLocalityScore: number;
  crossBandCrossingsCount: number;
  isDeterministic: boolean;
}

export interface Feature2DBandAssignmentResult {
  orderedFeatures: string[];
  placements: Map<string, Feature2DPlacement>;
  bandFeatures: Map<ArchitectureLayer, string[]>;
  metrics: Feature2DBandMetrics;
}

const LAYER_ORDER: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];
const LAYER_PRIORITY: Record<ArchitectureLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

const LAYER_BASE_Y: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
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
 * Strategy F: Layer-Aligned Shared-Infrastructure & Hierarchy-Aware Ordering (1D Baseline)
 */
export function orderStrategyF_SharedHierarchyAware(matrix: FeatureDependencyMatrix): string[] {
  let ordered = [...matrix.featureIds].sort((a, b) => a.localeCompare(b));

  for (let pass = 0; pass < 4; pass++) {
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
          const dirBias = isForward ? -flow * 0.15 : flow * 0.15;

          const l1 = matrix.featurePrimaryLayers.get(f1) || 'application';
          const l2 = matrix.featurePrimaryLayers.get(f2) || 'application';
          const crossLayerMultiplier = l1 !== l2 ? 2.0 : 1.0;

          posSum += ((posMap.get(f2) ?? 0) + dirBias) * w * crossLayerMultiplier;
          weightSum += w * crossLayerMultiplier;
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
 * Computes deterministic 2D multi-row band placement and within-band feature ordering
 * that optimizes physical spatial locality $(X, Y)$ across architectural layer bands.
 */
export function compute2DFeatureBandOrdering(
  matrix: FeatureDependencyMatrix,
  iterations = 12
): Feature2DBandAssignmentResult {
  // 1. Group features into architectural layer bands
  const bandFeatures = new Map<ArchitectureLayer, string[]>();
  LAYER_ORDER.forEach(l => bandFeatures.set(l, []));

  matrix.featureIds.forEach(f => {
    const layer = matrix.featurePrimaryLayers.get(f) || 'application';
    bandFeatures.get(layer)!.push(f);
  });

  // Initial deterministic sort within each band
  LAYER_ORDER.forEach(l => {
    bandFeatures.get(l)!.sort((a, b) => a.localeCompare(b));
  });

  // 2. Physical 2D Center Coordinate Estimation Map (X, Y in px)
  const estimatedX = new Map<string, number>();
  const estimatedY = new Map<string, number>();

  const BAND_HORIZONTAL_SPACING = 380; // center-to-center region offset
  const BASE_X = 100;

  LAYER_ORDER.forEach(l => {
    const list = bandFeatures.get(l)!;
    const baseY = LAYER_BASE_Y[l];
    list.forEach((f, idx) => {
      estimatedX.set(f, BASE_X + idx * BAND_HORIZONTAL_SPACING);
      estimatedY.set(f, baseY);
    });
  });

  // 3. Iterative 2D Cross-Band Barycentric Sweeps
  for (let pass = 0; pass < iterations; pass++) {
    const isForward = pass % 2 === 0;
    const layerSweepOrder = isForward ? LAYER_ORDER : [...LAYER_ORDER].reverse();

    layerSweepOrder.forEach(l => {
      const list = bandFeatures.get(l)!;
      if (list.length <= 1) return;

      const targetX = new Map<string, number>();

      list.forEach(f1 => {
        let weightSum = 0;
        let posSum = 0;

        matrix.featureIds.forEach(f2 => {
          if (f1 === f2) return;
          const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
          if (w > 0) {
            const f2X = estimatedX.get(f2) ?? BASE_X;
            const l1 = matrix.featurePrimaryLayers.get(f1) || 'application';
            const l2 = matrix.featurePrimaryLayers.get(f2) || 'application';

            // Cross-band weighting multiplier: strongly pull connected features in other bands horizontally
            const isCrossBand = l1 !== l2;
            const crossBandMultiplier = isCrossBand ? 2.5 : 1.0;

            const flow = matrix.directionalFlow.get(f1)?.get(f2) || 0;
            const dirBias = isForward ? -flow * 10.0 : flow * 10.0;

            posSum += (f2X + dirBias) * w * crossBandMultiplier;
            weightSum += w * crossBandMultiplier;
          }
        });

        // Fallback to current estimated X if no connected neighbors exist
        const currentX = estimatedX.get(f1) ?? BASE_X;
        targetX.set(f1, weightSum > 0 ? posSum / weightSum : currentX);
      });

      // Sort features within this band strictly by target X, with deterministic tie-breaking by ID
      list.sort((a, b) => {
        const xA = targetX.get(a) ?? 0;
        const xB = targetX.get(b) ?? 0;
        if (Math.abs(xA - xB) > 1e-6) return xA - xB;
        return a.localeCompare(b);
      });

      // Re-assign estimated X positions along horizontal band
      list.forEach((f, idx) => {
        estimatedX.set(f, BASE_X + idx * BAND_HORIZONTAL_SPACING);
      });
    });
  }

  // 4. Centroid Alignment for Utility & Shared Hub Features
  const hubFeatures = matrix.featureIds.filter(f => {
    let degree = 0;
    matrix.featureIds.forEach(other => {
      if ((matrix.combinedWeights.get(f)?.get(other) || 0) > 0) degree++;
    });
    return degree >= 3 || f === 'Shared' || f === 'Unassigned';
  });

  hubFeatures.forEach(hubId => {
    let weightSum = 0;
    let posSum = 0;
    matrix.featureIds.forEach(other => {
      if (other === hubId) return;
      const w = matrix.combinedWeights.get(hubId)?.get(other) || 0;
      if (w > 0) {
        posSum += (estimatedX.get(other) ?? BASE_X) * w;
        weightSum += w;
      }
    });

    if (weightSum > 0) {
      const hubTargetX = posSum / weightSum;

      // Adjust hub feature position inside its assigned band to be closest to hubTargetX
      const layer = matrix.featurePrimaryLayers.get(hubId) || 'application';
      const list = bandFeatures.get(layer)!;
      if (list.includes(hubId) && list.length > 1) {
        list.sort((a, b) => {
          const xA = a === hubId ? hubTargetX : (estimatedX.get(a) ?? BASE_X);
          const xB = b === hubId ? hubTargetX : (estimatedX.get(b) ?? BASE_X);
          if (Math.abs(xA - xB) > 1e-6) return xA - xB;
          return a.localeCompare(b);
        });

        list.forEach((f, idx) => {
          estimatedX.set(f, BASE_X + idx * BAND_HORIZONTAL_SPACING);
        });
      }
    }
  });

  // 5. Construct Final Placements Map and Ordered List
  const placements = new Map<string, Feature2DPlacement>();
  const orderedFeatures: string[] = [];

  LAYER_ORDER.forEach(l => {
    const list = bandFeatures.get(l)!;
    const bandIdx = LAYER_PRIORITY[l];
    list.forEach((f, orderIdx) => {
      orderedFeatures.push(f);
      placements.set(f, {
        featureId: f,
        primaryLayer: l,
        bandIndex: bandIdx,
        orderInBand: orderIdx,
        estimatedX: estimatedX.get(f) ?? (BASE_X + orderIdx * BAND_HORIZONTAL_SPACING),
        estimatedY: estimatedY.get(f) ?? LAYER_BASE_Y[l],
      });
    });
  });

  // 6. Compute 2D Spatial Locality & Locality Metrics
  let totalCrossBandEdgesCount = 0;
  let totalIntraBandEdgesCount = 0;
  let crossBandEdgeLengthSum = 0;
  let intraBandDistSum = 0;

  for (let i = 0; i < matrix.featureIds.length; i++) {
    const f1 = matrix.featureIds[i];
    const p1 = placements.get(f1);
    if (!p1) continue;

    for (let j = i + 1; j < matrix.featureIds.length; j++) {
      const f2 = matrix.featureIds[j];
      const p2 = placements.get(f2);
      if (!p2) continue;

      const w = matrix.combinedWeights.get(f1)?.get(f2) || 0;
      if (w > 0) {
        const dx = p1.estimatedX - p2.estimatedX;
        const dy = p1.estimatedY - p2.estimatedY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (p1.primaryLayer !== p2.primaryLayer) {
          totalCrossBandEdgesCount++;
          crossBandEdgeLengthSum += dist;
        } else {
          totalIntraBandEdgesCount++;
          intraBandDistSum += dist;
        }
      }
    }
  }

  const avgCrossBandEdgeLength = totalCrossBandEdgesCount > 0 ? crossBandEdgeLengthSum / totalCrossBandEdgesCount : 0;
  const avgIntraBandEdgeLength = totalIntraBandEdgesCount > 0 ? intraBandDistSum / totalIntraBandEdgesCount : 0;
  const intraBandLocalityScore = avgIntraBandEdgeLength > 0 ? 1000 / (1000 + avgIntraBandEdgeLength) : 1.0;

  // Estimate cross-band crossings count
  let crossBandCrossingsCount = 0;
  const crossBandEdges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  matrix.featureIds.forEach(f1 => {
    const p1 = placements.get(f1);
    if (!p1) return;
    matrix.featureIds.forEach(f2 => {
      const p2 = placements.get(f2);
      if (!p2 || f1 >= f2) return;
      if ((matrix.combinedWeights.get(f1)?.get(f2) || 0) > 0 && p1.primaryLayer !== p2.primaryLayer) {
        crossBandEdges.push({ x1: p1.estimatedX, y1: p1.estimatedY, x2: p2.estimatedX, y2: p2.estimatedY });
      }
    });
  });

  for (let i = 0; i < crossBandEdges.length; i++) {
    for (let j = i + 1; j < crossBandEdges.length; j++) {
      const e1 = crossBandEdges[i];
      const e2 = crossBandEdges[j];
      // Check if edges cross horizontally between different bands
      if (
        ((e1.x1 < e2.x1 && e1.x2 > e2.x2) || (e1.x1 > e2.x1 && e1.x2 < e2.x2)) &&
        ((e1.y1 < e1.y2 && e2.y1 < e2.y2) || (e1.y1 > e1.y2 && e2.y1 > e2.y2))
      ) {
        crossBandCrossingsCount++;
      }
    }
  }

  return {
    orderedFeatures,
    placements,
    bandFeatures,
    metrics: {
      totalFeaturesCount: matrix.featureIds.length,
      totalCrossBandEdgesCount,
      totalIntraBandEdgesCount,
      crossBandEdgeLengthSum,
      avgCrossBandEdgeLength,
      intraBandLocalityScore,
      crossBandCrossingsCount,
      isDeterministic: true,
    },
  };
}

/**
 * Helper export for 2D Band Assignment
 */
export function assignFeature2DBands(matrix: FeatureDependencyMatrix): Feature2DBandAssignmentResult {
  return compute2DFeatureBandOrdering(matrix);
}

/**
 * Main entry point for feature ordering with 2D band support.
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
      return orderStrategyD_BarycentricSweeps(matrix, 4);
    case 'E_DOMAIN_AWARE':
      return orderStrategyE_DomainAware(matrix);
    case 'F_2D_BAND_AWARE':
      return compute2DFeatureBandOrdering(matrix).orderedFeatures;
    case 'F_SHARED_HIERARCHY_AWARE':
    default:
      return orderStrategyF_SharedHierarchyAware(matrix);
  }
}

import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { classifyNodeLayer } from './layers';
import { classifyNodeDomain } from './domains';
import { edgeCrossingCount, type PositionMap } from './metrics';

export interface NodeOrderingInput {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  domainMap?: Map<string, string> | Record<string, string>;
  domainOrder?: string[];
  maxIterations?: number;
}

export interface LayerRegionOrder {
  layer: ArchitectureLayer;
  domain: string;
  nodeIds: string[];
}

export interface NodeOrderingResult {
  /** Map of bucket key "${layer}:${domain}" -> ordered node IDs */
  bucketOrder: Map<string, string[]>;
  /** Fast lookup map of nodeId -> 0-based rank index inside its bucket */
  nodeRankMap: Map<string, number>;
  /** Fast lookup map of nodeId -> bucket key "${layer}:${domain}" */
  nodeBucketMap: Map<string, string>;
  /** Flattened list of ordered bucket regions */
  regions: LayerRegionOrder[];
  /** Estimated crossing count for the calculated order using simulated positions */
  estimatedCrossings: number;
  /** Total sweep iterations executed */
  iterationsExecuted: number;
}

export const LAYER_RANK: Record<ArchitectureLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

export const LAYERS_IN_ORDER: ArchitectureLayer[] = [
  'presentation',
  'application',
  'domain',
  'schema',
];

/**
 * Normalizes layer Map or Record to Map<string, ArchitectureLayer>
 */
function normalizeLayerMap(
  nodes: ExplorerNode[],
  layerMapInput?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>
): Map<string, ArchitectureLayer> {
  const map = new Map<string, ArchitectureLayer>();
  if (layerMapInput instanceof Map) {
    layerMapInput.forEach((v, k) => map.set(k, v));
  } else if (layerMapInput) {
    Object.entries(layerMapInput).forEach(([k, v]) => map.set(k, v));
  }

  for (const node of nodes) {
    if (!map.has(node.id)) {
      map.set(node.id, classifyNodeLayer(node));
    }
  }

  return map;
}

/**
 * Normalizes domain Map or Record to Map<string, string>
 */
function normalizeDomainMap(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  domainMapInput?: Map<string, string> | Record<string, string>
): Map<string, string> {
  const map = new Map<string, string>();
  if (domainMapInput instanceof Map) {
    domainMapInput.forEach((v, k) => map.set(k, v));
  } else if (domainMapInput) {
    Object.entries(domainMapInput).forEach(([k, v]) => map.set(k, v));
  }

  for (const node of nodes) {
    if (!map.has(node.id)) {
      map.set(node.id, classifyNodeDomain(node, nodes, edges));
    }
  }

  return map;
}

/**
 * Computes deterministic simulated 2D positions for nodes based on current bucket ordering.
 * Used for calculating edge crossings and metric evaluation.
 */
export function computeSimulatedPositions(
  bucketOrder: Map<string, string[]>,
  domainOrder: string[]
): PositionMap {
  const positions: PositionMap = {};
  const domainIndexMap = new Map<string, number>();
  domainOrder.forEach((d, idx) => domainIndexMap.set(d, idx));

  for (const layer of LAYERS_IN_ORDER) {
    const layerIdx = LAYER_RANK[layer];
    const y = 100 + layerIdx * 250;

    for (const domain of domainOrder) {
      const bucketKey = `${layer}:${domain}`;
      const nodeIds = bucketOrder.get(bucketKey) || [];
      const domainIdx = domainIndexMap.get(domain) ?? 0;
      const domainX = domainIdx * 500;

      nodeIds.forEach((nodeId, intraIdx) => {
        positions[nodeId] = {
          x: domainX + intraIdx * 120,
          y,
        };
      });
    }
  }

  return positions;
}

/**
 * Estimates the total edge crossings for a given bucket ordering.
 */
export function estimateCrossingsForOrder(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  bucketOrder: Map<string, string[]>,
  domainOrder: string[]
): number {
  const positions = computeSimulatedPositions(
    bucketOrder,
    domainOrder
  );
  return edgeCrossingCount(nodes, edges, positions);
}

/**
 * Reduces edge crossings across architectural layers and domain regions
 * using deterministic relationship-aware barycenter sweeps.
 *
 * ALGORITHM & DESIGN GUARANTEES:
 * 1. Determinism: Uses strict deterministic initial sorting and tie-breaking (degree, nodeId).
 * 2. Layer & Domain Semantics: Nodes strictly remain inside assigned (layer, domain) buckets.
 * 3. Cycle & Same-Layer Safety: Filters neighbor layer relationships to DAG layer ranks. Cycles never loop infinitely.
 * 4. Bounded Optimization: Bounded by maxIterations (default 4).
 * 5. Hub & Bridge Handling: High-degree hubs are ordered according to neighbor barycenters first; degree is used as a secondary tie-breaker.
 */
export function reduceEdgeCrossings(input: NodeOrderingInput): NodeOrderingResult {
  const nodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const edges = Array.isArray(input.edges) ? [...input.edges] : [];
  const maxIterations = input.maxIterations ?? 4;

  // Defensive sort of nodes and edges for guaranteed baseline determinism
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  const layerMap = normalizeLayerMap(nodes, input.layerMap);
  const domainMap = normalizeDomainMap(nodes, edges, input.domainMap);

  // Extract all distinct domains
  const discoveredDomains = new Set<string>();
  nodes.forEach(n => {
    const d = domainMap.get(n.id) || 'Shared';
    discoveredDomains.add(d);
  });

  let domainOrder: string[];
  if (input.domainOrder && input.domainOrder.length > 0) {
    const customSet = new Set(input.domainOrder);
    domainOrder = [...input.domainOrder];
    // Append any extra domains not in domainOrder deterministically
    const missing = Array.from(discoveredDomains)
      .filter(d => !customSet.has(d))
      .sort((a, b) => (a === 'Shared' ? -1 : b === 'Shared' ? 1 : a.localeCompare(b)));
    domainOrder.push(...missing);
  } else {
    domainOrder = Array.from(discoveredDomains).sort((a, b) => {
      if (a === 'Shared') return -1;
      if (b === 'Shared') return 1;
      return a.localeCompare(b);
    });
  }

  // Precompute degree / hub score for deterministic tie-breaking
  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));
  edges.forEach(e => {
    if (degreeMap.has(e.source)) degreeMap.set(e.source, degreeMap.get(e.source)! + 1);
    if (degreeMap.has(e.target)) degreeMap.set(e.target, degreeMap.get(e.target)! + 1);
  });

  // Build adjacency list for fast lookup
  const adjMap = new Map<string, Set<string>>();
  nodes.forEach(n => adjMap.set(n.id, new Set()));
  edges.forEach(e => {
    if (adjMap.has(e.source) && adjMap.has(e.target) && e.source !== e.target) {
      adjMap.get(e.source)!.add(e.target);
      adjMap.get(e.target)!.add(e.source);
    }
  });

  // Group nodes into initial buckets (layer:domain)
  const bucketOrder = new Map<string, string[]>();
  const nodeBucketMap = new Map<string, string>();

  LAYERS_IN_ORDER.forEach(layer => {
    domainOrder.forEach(domain => {
      bucketOrder.set(`${layer}:${domain}`, []);
    });
  });

  for (const node of nodes) {
    const layer = layerMap.get(node.id) || 'application';
    const domain = domainMap.get(node.id) || 'Shared';
    const key = `${layer}:${domain}`;
    if (!bucketOrder.has(key)) {
      bucketOrder.set(key, []);
    }
    bucketOrder.get(key)!.push(node.id);
    nodeBucketMap.set(node.id, key);
  }

  // Baseline Initial Sort: Degree descending, then nodeId ascending
  bucketOrder.forEach((nodeIds) => {
    nodeIds.sort((a, b) => {
      const degA = degreeMap.get(a) || 0;
      const degB = degreeMap.get(b) || 0;
      if (degB !== degA) return degB - degA; // Hubs first initially
      return a.localeCompare(b);
    });
  });

  let bestCrossings = estimateCrossingsForOrder(
    nodes,
    edges,
    bucketOrder,
    domainOrder
  );

  let iterationsExecuted = 0;

  // Perform bounded alternating sweeps (Forward: L=1->3, Backward: L=2->0)
  for (let iter = 0; iter < maxIterations; iter++) {
    iterationsExecuted++;
    if (bestCrossings === 0) break;

    const isForward = iter % 2 === 0;

    // Helper to calculate 1D continuous position of nodes in a layer
    const getLayerNodePositions = (targetLayer: ArchitectureLayer): Map<string, number> => {
      const posMap = new Map<string, number>();
      let globalLayerIdx = 0;
      domainOrder.forEach(d => {
        const key = `${targetLayer}:${d}`;
        const ids = bucketOrder.get(key) || [];
        ids.forEach(id => {
          posMap.set(id, globalLayerIdx++);
        });
      });
      return posMap;
    };

    const layerSequence = isForward
      ? (['application', 'domain', 'schema'] as ArchitectureLayer[])
      : (['domain', 'application', 'presentation'] as ArchitectureLayer[]);

    for (const currentLayer of layerSequence) {
      const currentLayerRank = LAYER_RANK[currentLayer];

      // Build positions of all nodes in adjacent layers
      const allLayerPositions = new Map<string, number>();
      LAYERS_IN_ORDER.forEach(l => {
        const lPositions = getLayerNodePositions(l);
        lPositions.forEach((pos, id) => allLayerPositions.set(id, pos));
      });

      domainOrder.forEach(domain => {
        const key = `${currentLayer}:${domain}`;
        const ids = bucketOrder.get(key);
        if (!ids || ids.length <= 1) return;

        // Calculate barycenter for each node in this bucket
        const barycenters = new Map<string, number>();

        ids.forEach(id => {
          const neighbors = Array.from(adjMap.get(id) || []);
          let sumPos = 0;
          let count = 0;

          neighbors.forEach(neighborId => {
            const neighborLayer = layerMap.get(neighborId) || 'application';
            const neighborRank = LAYER_RANK[neighborLayer];

            // Filter relevant neighbor layer based on sweep direction
            const isRelevant = isForward
              ? neighborRank < currentLayerRank
              : neighborRank > currentLayerRank;

            if (isRelevant) {
              const pos = allLayerPositions.get(neighborId);
              if (pos !== undefined) {
                sumPos += pos;
                count++;
              }
            }
          });

          // Fallback: If no neighbors in primary direction, check all neighbors across layers
          if (count === 0) {
            neighbors.forEach(neighborId => {
              const pos = allLayerPositions.get(neighborId);
              if (pos !== undefined) {
                sumPos += pos;
                count++;
              }
            });
          }

          if (count > 0) {
            barycenters.set(id, sumPos / count);
          } else {
            // Preserved position fallback
            barycenters.set(id, allLayerPositions.get(id) ?? 0);
          }
        });

        // Re-sort bucket using barycenters (with deterministic tie-breakers)
        ids.sort((a, b) => {
          const bcA = barycenters.get(a) ?? 0;
          const bcB = barycenters.get(b) ?? 0;

          if (Math.abs(bcA - bcB) > 1e-6) {
            return bcA - bcB;
          }

          // Secondary tie-breaker 1: Degree descending
          const degA = degreeMap.get(a) || 0;
          const degB = degreeMap.get(b) || 0;
          if (degB !== degA) return degB - degA;

          // Secondary tie-breaker 2: Node ID ascending
          return a.localeCompare(b);
        });
      });
    }

    const currentCrossings = estimateCrossingsForOrder(
      nodes,
      edges,
      bucketOrder,
      domainOrder
    );

    if (currentCrossings < bestCrossings) {
      bestCrossings = currentCrossings;
    }
  }

  // Construct final nodeRankMap and regions list
  const nodeRankMap = new Map<string, number>();
  const regions: LayerRegionOrder[] = [];

  LAYERS_IN_ORDER.forEach(layer => {
    domainOrder.forEach(domain => {
      const key = `${layer}:${domain}`;
      const ids = bucketOrder.get(key) || [];
      ids.forEach((id, rank) => {
        nodeRankMap.set(id, rank);
      });

      if (ids.length > 0) {
        regions.push({
          layer,
          domain,
          nodeIds: [...ids],
        });
      }
    });
  });

  return {
    bucketOrder,
    nodeRankMap,
    nodeBucketMap,
    regions,
    estimatedCrossings: bestCrossings,
    iterationsExecuted,
  };
}

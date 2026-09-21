import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { classifyNodeLayer } from './layers';
import { discoverDomains } from './domains';
import type { PositionMap } from './metrics';

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

  const unassigned = nodes.filter(n => !map.has(n.id));
  if (unassigned.length > 0) {
    const discovery = discoverDomains(nodes, edges);
    for (let i = 0; i < unassigned.length; i++) {
      const node = unassigned[i];
      const assignment = discovery.assignments.get(node.id);
      map.set(node.id, assignment ? assignment.primaryDomain : 'Shared');
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
 * Fast exact edge crossing calculation using bounding-box pre-filtering.
 */
function fastEdgeCrossingCount(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  const EPSILON = 1e-9;
  interface Segment {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    sourceId: string;
    targetId: string;
  }

  const segments: Segment[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      const minX = pos1.x < pos2.x ? pos1.x : pos2.x;
      const maxX = pos1.x > pos2.x ? pos1.x : pos2.x;
      const minY = pos1.y < pos2.y ? pos1.y : pos2.y;
      const maxY = pos1.y > pos2.y ? pos1.y : pos2.y;
      segments.push({
        p1: pos1,
        p2: pos2,
        minX,
        maxX,
        minY,
        maxY,
        sourceId: edge.source,
        targetId: edge.target,
      });
    }
  }

  // Sort segments deterministically by minX to enable sweep-line pruning
  segments.sort((a, b) => {
    if (Math.abs(a.minX - b.minX) > EPSILON) return a.minX - b.minX;
    if (Math.abs(a.maxX - b.maxX) > EPSILON) return a.maxX - b.maxX;
    if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
    return a.targetId.localeCompare(b.targetId);
  });

  let crossings = 0;
  const len = segments.length;

  for (let i = 0; i < len; i++) {
    const s1 = segments[i];
    for (let j = i + 1; j < len; j++) {
      const s2 = segments[j];

      // Sweep-line early exit: if s2's left bound is beyond s1's right bound, no subsequent segment can intersect s1
      if (s2.minX > s1.maxX + EPSILON) {
        break;
      }

      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        continue;
      }

      if (
        s1.maxX < s2.minX - EPSILON ||
        s1.minY > s2.maxY + EPSILON ||
        s1.maxY < s2.minY - EPSILON
      ) {
        continue;
      }

      if (
        Math.abs(s1.p1.y - s2.p1.y) < EPSILON &&
        Math.abs(s1.p2.y - s2.p2.y) < EPSILON
      ) {
        if ((s1.p1.x - s2.p1.x) * (s1.p2.x - s2.p2.x) < -EPSILON) {
          crossings++;
        }
        continue;
      }

      const cp1 = (s1.p2.x - s1.p1.x) * (s2.p1.y - s1.p1.y) - (s1.p2.y - s1.p1.y) * (s2.p1.x - s1.p1.x);
      const cp2 = (s1.p2.x - s1.p1.x) * (s2.p2.y - s1.p1.y) - (s1.p2.y - s1.p1.y) * (s2.p2.x - s1.p1.x);
      const cp3 = (s2.p2.x - s2.p1.x) * (s1.p1.y - s2.p1.y) - (s2.p2.y - s2.p1.y) * (s1.p1.x - s2.p1.x);
      const cp4 = (s2.p2.x - s2.p1.x) * (s1.p2.y - s2.p1.y) - (s2.p2.y - s2.p1.y) * (s1.p2.x - s2.p1.x);

      const s1Straddle = (cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON);
      const s2Straddle = (cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON);

      if (s1Straddle && s2Straddle) {
        crossings++;
        continue;
      }

      const isCollinear =
        Math.abs(cp1) <= EPSILON &&
        Math.abs(cp2) <= EPSILON &&
        Math.abs(cp3) <= EPSILON &&
        Math.abs(cp4) <= EPSILON;

      if (isCollinear) {
        const useX = Math.abs(s1.p1.x - s1.p2.x) > EPSILON;
        const a1 = useX ? s1.p1.x : s1.p1.y;
        const a2 = useX ? s1.p2.x : s1.p2.y;
        const minA = a1 < a2 ? a1 : a2;
        const maxA = a1 > a2 ? a1 : a2;

        const b1 = useX ? s2.p1.x : s2.p1.y;
        const b2 = useX ? s2.p2.x : s2.p2.y;
        const minB = b1 < b2 ? b1 : b2;
        const maxB = b1 > b2 ? b1 : b2;

        const overlapMin = minA > minB ? minA : minB;
        const overlapMax = maxA < maxB ? maxA : maxB;

        if (overlapMax - overlapMin > EPSILON) {
          crossings++;
        }
      }
    }
  }

  return crossings;
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
  return fastEdgeCrossingCount(nodes, edges, positions);
}

/**
 * Reduces edge crossings across architectural layers and domain regions
 * using deterministic relationship-aware barycenter sweeps.
 */
export function reduceEdgeCrossings(input: NodeOrderingInput): NodeOrderingResult {
  const nodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const edges = Array.isArray(input.edges) ? [...input.edges] : [];
  const maxIterations = input.maxIterations ?? 8;

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  const layerMap = normalizeLayerMap(nodes, input.layerMap);
  const domainMap = normalizeDomainMap(nodes, edges, input.domainMap);

  const discoveredDomains = new Set<string>();
  nodes.forEach(n => {
    const d = domainMap.get(n.id) || 'Shared';
    discoveredDomains.add(d);
  });

  let domainOrder: string[];
  if (input.domainOrder && input.domainOrder.length > 0) {
    const customSet = new Set(input.domainOrder);
    domainOrder = [...input.domainOrder];
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

  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));
  edges.forEach(e => {
    if (degreeMap.has(e.source)) degreeMap.set(e.source, degreeMap.get(e.source)! + 1);
    if (degreeMap.has(e.target)) degreeMap.set(e.target, degreeMap.get(e.target)! + 1);
  });

  const adjMap = new Map<string, string[]>();
  nodes.forEach(n => adjMap.set(n.id, []));
  edges.forEach(e => {
    if (e.source !== e.target && adjMap.has(e.source) && adjMap.has(e.target)) {
      adjMap.get(e.source)!.push(e.target);
      adjMap.get(e.target)!.push(e.source);
    }
  });

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

  bucketOrder.forEach((nodeIds) => {
    nodeIds.sort((a, b) => {
      const degA = degreeMap.get(a) || 0;
      const degB = degreeMap.get(b) || 0;
      if (degB !== degA) return degB - degA;
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

  for (let iter = 0; iter < maxIterations; iter++) {
    iterationsExecuted++;
    if (bestCrossings === 0) break;

    const isForward = iter % 2 === 0;

    const layerSequence = isForward
      ? (['application', 'domain', 'schema'] as ArchitectureLayer[])
      : (['domain', 'application', 'presentation'] as ArchitectureLayer[]);

    let sweepOrderChanged = false;

    for (const currentLayer of layerSequence) {
      const currentLayerRank = LAYER_RANK[currentLayer];

      const allLayerPositions = new Map<string, number>();
      for (let lIdx = 0; lIdx < LAYERS_IN_ORDER.length; lIdx++) {
        const l = LAYERS_IN_ORDER[lIdx];
        let globalLayerIdx = 0;
        for (let dIdx = 0; dIdx < domainOrder.length; dIdx++) {
          const d = domainOrder[dIdx];
          const key = `${l}:${d}`;
          const ids = bucketOrder.get(key);
          if (ids) {
            for (let i = 0; i < ids.length; i++) {
              allLayerPositions.set(ids[i], globalLayerIdx++);
            }
          }
        }
      }

      for (let dIdx = 0; dIdx < domainOrder.length; dIdx++) {
        const domain = domainOrder[dIdx];
        const key = `${currentLayer}:${domain}`;
        const ids = bucketOrder.get(key);
        if (!ids || ids.length <= 1) continue;

        const barycenters = new Map<string, number>();

        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const neighbors = adjMap.get(id) || [];
          let sumPos = 0;
          let count = 0;

          for (let j = 0; j < neighbors.length; j++) {
            const neighborId = neighbors[j];
            const neighborLayer = layerMap.get(neighborId) || 'application';
            const neighborRank = LAYER_RANK[neighborLayer];

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
          }

          if (count === 0) {
            for (let j = 0; j < neighbors.length; j++) {
              const neighborId = neighbors[j];
              const pos = allLayerPositions.get(neighborId);
              if (pos !== undefined) {
                sumPos += pos;
                count++;
              }
            }
          }

          if (count > 0) {
            barycenters.set(id, sumPos / count);
          } else {
            barycenters.set(id, allLayerPositions.get(id) ?? 0);
          }
        }

        const prevOrder = [...ids];
        ids.sort((a, b) => {
          const bcA = barycenters.get(a) ?? 0;
          const bcB = barycenters.get(b) ?? 0;

          if (Math.abs(bcA - bcB) > 1e-6) {
            return bcA - bcB;
          }

          const degA = degreeMap.get(a) || 0;
          const degB = degreeMap.get(b) || 0;
          if (degB !== degA) return degB - degA;

          return a.localeCompare(b);
        });

        for (let i = 0; i < ids.length; i++) {
          if (ids[i] !== prevOrder[i]) {
            sweepOrderChanged = true;
            break;
          }
        }
      }
    }

    if (!sweepOrderChanged) {
      break;
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

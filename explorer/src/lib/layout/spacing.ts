import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis, ArchitectureNodeAnalysis } from './types';
import { computeArchitectureAnalysis } from './analysis';
import { classifyNodeLayer } from './layers';
import { classifyNodeDomain } from './domains';
import type { PositionMap } from './metrics';

export interface LayerRange {
  yMin: number;
  yMax: number;
}

export interface DomainRange {
  xMin: number;
  xMax: number;
}

export interface ComponentBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface SpacingOptions {
  /** Node width for bounding box clearance calculation (default: 120) */
  nodeWidth?: number;
  /** Node height for bounding box clearance calculation (default: 60) */
  nodeHeight?: number;
  /** Minimum horizontal clearance gap between adjacent node bounding boxes (default: 40) */
  horizontalGap?: number;
  /** Minimum vertical clearance gap between adjacent node bounding boxes (default: 40) */
  verticalGap?: number;
  /** Maximum iteration passes before terminating (default: 30) */
  maxIterations?: number;
  /** Custom layer mapping (nodeId -> ArchitectureLayer) */
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  /** Custom domain mapping (nodeId -> domain string) */
  domainMap?: Map<string, string> | Record<string, string>;
  /** Allowed Y ranges per layer to preserve vertical layer separation */
  layerBounds?: Map<ArchitectureLayer, LayerRange> | Record<string, LayerRange>;
  /** Allowed X ranges per domain to preserve horizontal domain separation */
  domainBounds?: Map<string, DomainRange> | Record<string, DomainRange>;
  /** Allowed bounding boxes per connected component to preserve component separation */
  componentBounds?: Map<number, ComponentBounds> | Record<number, ComponentBounds>;
  /** Maximum distance a satellite (test/field) can be displaced from its parent target (default: 300) */
  maxSatelliteDistance?: number;
}

export interface CleanupInput {
  /** All graph nodes */
  nodes: ExplorerNode[];
  /** Graph edges */
  edges?: ExplorerEdge[];
  /** Initial calculated positions from previous layout stages */
  positions: PositionMap;
  /** Precomputed architecture analysis from Wave 1A */
  analysis?: ArchitectureGraphAnalysis;
  /** Configuration geometry, spacing, and constraint options */
  options?: SpacingOptions;
}

export interface SpacingResult {
  /** Cleaned/resolved positions */
  positions: PositionMap;
  /** Number of iterations executed */
  iterations: number;
  /** Initial number of overlapping node pairs */
  initialOverlapCount: number;
  /** Final remaining number of overlapping node pairs (0 if fully resolved) */
  finalOverlapCount: number;
  /** Maximum displacement applied to any single node relative to input position */
  maxDisplacement: number;
  /** Total cumulative displacement across all nodes */
  totalDisplacement: number;
}

const EPSILON = 1e-3;

/**
 * Calculates deterministic priority weight for a node.
 * Higher priority nodes absorb less displacement when colliding with lower priority nodes.
 */
function getNodePriorityWeight(
  node: ExplorerNode,
  analysisNode?: ArchitectureNodeAnalysis
): number {
  const isField = analysisNode ? analysisNode.isField : (node.type === 'Field' || node.type === 'CustomField');
  const isTest = analysisNode ? analysisNode.isTest : (node.behavior?.isTest ?? false);
  const isBridge = analysisNode ? analysisNode.isBridge : false;

  const rawFanIn = node.metrics?.fanIn || 0;
  const rawFanOut = node.metrics?.fanOut || 0;
  const rawDegree = rawFanIn + rawFanOut;

  const hubScore = Math.max(analysisNode ? analysisNode.hubScore : 0, rawDegree);
  const bridgeScore = analysisNode ? analysisNode.bridgeScore : 0;
  const isTriggerOrHandler =
    node.type === 'ApexTrigger' ||
    node.type === 'Flow' ||
    (analysisNode?.role?.toLowerCase().includes('handler') ?? false);

  if (isField) {
    return 10;
  }
  if (isTest) {
    return 20;
  }
  if (isTriggerOrHandler) {
    return 40 + Math.min(10, hubScore);
  }
  if (isBridge) {
    return 80 + bridgeScore + hubScore;
  }
  if (hubScore >= 4) {
    return 70 + hubScore;
  }
  return 50 + hubScore;
}

/**
 * Clamps a coordinate value to lie within a [min, max] range.
 */
function clamp(val: number, min: number, max: number): number {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

/**
 * 2D Spatial Hash Grid for $O(N)$ candidate pair detection.
 */
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, string[]>;

  constructor(cellSize: number) {
    this.cellSize = Math.max(10, cellSize);
    this.grid = new Map();
  }

  private getKey(col: number, row: number): string {
    return `${col}:${row}`;
  }

  public clear(): void {
    this.grid.clear();
  }

  public insert(id: string, x: number, y: number): void {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    const key = this.getKey(col, row);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(id);
  }

  public getCandidates(x: number, y: number): string[] {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    const candidates: string[] = [];

    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const key = this.getKey(col + dc, row + dr);
        const cell = this.grid.get(key);
        if (cell) {
          candidates.push(...cell);
        }
      }
    }
    return candidates;
  }
}

/**
 * WAVE 4A — SPACING, COLLISION & GEOMETRIC CLEANUP
 *
 * Deterministic spatial cleanup layer that removes node overlaps, enforces readable
 * minimum spacing, preserves architectural layers/domains/components, and maintains
 * local satellite relationships (tests and fields near target production/object nodes).
 */
export function resolveSpacingAndCollisions(input: CleanupInput): SpacingResult {
  const safeNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const safeEdges = Array.isArray(input.edges) ? [...input.edges] : [];

  // Sort nodes deterministically by ID
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));

  const options = input.options || {};
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const maxIterations = options.maxIterations ?? 30;
  const maxSatelliteDistance = options.maxSatelliteDistance ?? 300;

  const requiredDx = nodeWidth + horizontalGap;
  const requiredDy = nodeHeight + verticalGap;

  // Resolve graph analysis
  const analysis = input.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, {
    layerMap: options.layerMap,
    domainMap: options.domainMap,
  });

  // Normalize layer map
  const layerMap = new Map<string, ArchitectureLayer>();
  if (options.layerMap instanceof Map) {
    options.layerMap.forEach((v, k) => layerMap.set(k, v));
  } else if (options.layerMap) {
    Object.entries(options.layerMap).forEach(([k, v]) => layerMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!layerMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      layerMap.set(node.id, nodeAnalysis?.layer || classifyNodeLayer(node));
    }
  });

  // Normalize domain map
  const domainMap = new Map<string, string>();
  if (options.domainMap instanceof Map) {
    options.domainMap.forEach((v, k) => domainMap.set(k, v));
  } else if (options.domainMap) {
    Object.entries(options.domainMap).forEach(([k, v]) => domainMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!domainMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      domainMap.set(node.id, nodeAnalysis?.domain || classifyNodeDomain(node, safeNodes, safeEdges));
    }
  });

  // Normalize layer bounds
  const layerBoundsMap = new Map<ArchitectureLayer, LayerRange>();
  if (options.layerBounds instanceof Map) {
    options.layerBounds.forEach((v, k) => layerBoundsMap.set(k, v));
  } else if (options.layerBounds) {
    Object.entries(options.layerBounds).forEach(([k, v]) => layerBoundsMap.set(k as ArchitectureLayer, v));
  }

  // Normalize domain bounds
  const domainBoundsMap = new Map<string, DomainRange>();
  if (options.domainBounds instanceof Map) {
    options.domainBounds.forEach((v, k) => domainBoundsMap.set(k, v));
  } else if (options.domainBounds) {
    Object.entries(options.domainBounds).forEach(([k, v]) => domainBoundsMap.set(k, v));
  }

  // Normalize component bounds
  const componentBoundsMap = new Map<number, ComponentBounds>();
  if (options.componentBounds instanceof Map) {
    options.componentBounds.forEach((v, k) => componentBoundsMap.set(k, v));
  } else if (options.componentBounds) {
    Object.entries(options.componentBounds).forEach(([k, v]) => componentBoundsMap.set(Number(k), v));
  }

  // Clone initial positions
  const initialPositions: PositionMap = {};
  const currentPositions: PositionMap = {};
  safeNodes.forEach(node => {
    const pos = input.positions[node.id];
    if (pos) {
      initialPositions[node.id] = { x: pos.x, y: pos.y };
      currentPositions[node.id] = { x: pos.x, y: pos.y };
    }
  });

  // Calculate node priority weights
  const priorityWeights = new Map<string, number>();
  safeNodes.forEach(node => {
    const nodeAnalysis = analysis.nodes.get(node.id);
    priorityWeights.set(node.id, getNodePriorityWeight(node, nodeAnalysis));
  });

  // Parent lookup map for satellite distance clamping
  const parentTargetMap = new Map<string, string>();
  safeNodes.forEach(node => {
    const nodeAnalysis = analysis.nodes.get(node.id);
    if (nodeAnalysis?.isTest && nodeAnalysis.parentProductionNodeId) {
      parentTargetMap.set(node.id, nodeAnalysis.parentProductionNodeId);
    } else if (nodeAnalysis?.isField && nodeAnalysis.parentObjectId) {
      parentTargetMap.set(node.id, nodeAnalysis.parentObjectId);
    }
  });

  // Helper to count active overlaps
  const getOverlapCount = (posMap: PositionMap): number => {
    const activeIds = safeNodes.map(n => n.id).filter(id => posMap[id] !== undefined);
    let count = 0;
    for (let i = 0; i < activeIds.length; i++) {
      const idA = activeIds[i];
      const posA = posMap[idA];
      for (let j = i + 1; j < activeIds.length; j++) {
        const idB = activeIds[j];
        const posB = posMap[idB];
        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);
        if (dx < requiredDx - EPSILON && dy < requiredDy - EPSILON) {
          count++;
        }
      }
    }
    return count;
  };

  const initialOverlapCount = getOverlapCount(currentPositions);

  if (safeNodes.length <= 1 || initialOverlapCount === 0) {
    return {
      positions: currentPositions,
      iterations: 0,
      initialOverlapCount,
      finalOverlapCount: initialOverlapCount,
      maxDisplacement: 0,
      totalDisplacement: 0,
    };
  }

  const applyNodeConstraints = (id: string): void => {
    const pos = currentPositions[id];
    if (!pos) return;

    // 1. Layer boundary clamping
    const layer = layerMap.get(id);
    if (layer && layerBoundsMap.has(layer)) {
      const range = layerBoundsMap.get(layer)!;
      pos.y = clamp(pos.y, range.yMin, range.yMax);
    }

    // 2. Domain boundary clamping
    const domain = domainMap.get(id);
    if (domain && domainBoundsMap.has(domain)) {
      const range = domainBoundsMap.get(domain)!;
      pos.x = clamp(pos.x, range.xMin, range.xMax);
    }

    // 3. Component boundary clamping
    const nodeAnalysis = analysis.nodes.get(id);
    if (nodeAnalysis && componentBoundsMap.has(nodeAnalysis.componentId)) {
      const bounds = componentBoundsMap.get(nodeAnalysis.componentId)!;
      pos.x = clamp(pos.x, bounds.xMin, bounds.xMax);
      pos.y = clamp(pos.y, bounds.yMin, bounds.yMax);
    }

    // 4. Satellite locality tether clamping
    const parentId = parentTargetMap.get(id);
    if (parentId && currentPositions[parentId]) {
      const parentPos = currentPositions[parentId];
      const dist = Math.sqrt(Math.pow(pos.x - parentPos.x, 2) + Math.pow(pos.y - parentPos.y, 2));
      if (dist > maxSatelliteDistance && dist > EPSILON) {
        pos.x = parentPos.x + ((pos.x - parentPos.x) * maxSatelliteDistance) / dist;
        pos.y = parentPos.y + ((pos.y - parentPos.y) * maxSatelliteDistance) / dist;
      }
    }
  };

  const spatialGrid = new SpatialGrid(Math.max(requiredDx, requiredDy));

  let iteration = 0;
  while (iteration < maxIterations) {
    iteration++;

    spatialGrid.clear();
    safeNodes.forEach(node => {
      const pos = currentPositions[node.id];
      if (pos) {
        spatialGrid.insert(node.id, pos.x, pos.y);
      }
    });

    const collidingPairKeys = new Set<string>();
    const collidingPairs: Array<{ idA: string; idB: string }> = [];

    safeNodes.forEach(nodeA => {
      const posA = currentPositions[nodeA.id];
      if (!posA) return;

      const candidates = spatialGrid.getCandidates(posA.x, posA.y);
      candidates.forEach(idB => {
        if (nodeA.id >= idB) return;
        const posB = currentPositions[idB];
        if (!posB) return;

        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);

        if (dx < requiredDx - EPSILON && dy < requiredDy - EPSILON) {
          const pairKey = `${nodeA.id}:${idB}`;
          if (!collidingPairKeys.has(pairKey)) {
            collidingPairKeys.add(pairKey);
            collidingPairs.push({ idA: nodeA.id, idB });
          }
        }
      });
    });

    if (collidingPairs.length === 0) {
      break;
    }

    collidingPairs.sort((p1, p2) => `${p1.idA}:${p1.idB}`.localeCompare(`${p2.idA}:${p2.idB}`));

    let resolvesInThisPass = 0;

    collidingPairs.forEach(({ idA, idB }) => {
      const posA = currentPositions[idA];
      const posB = currentPositions[idB];
      if (!posA || !posB) return;

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);

      if (dx >= requiredDx - EPSILON || dy >= requiredDy - EPSILON) {
        return;
      }

      resolvesInThisPass++;

      const overlapX = requiredDx - dx;
      const overlapY = requiredDy - dy;

      const ratioX = dx / requiredDx;
      const ratioY = dy / requiredDy;

      let resolveOnX = false;
      if (Math.abs(ratioX - ratioY) > 1e-4) {
        resolveOnX = ratioX > ratioY;
      } else {
        resolveOnX = overlapX < overlapY;
      }

      const initA = initialPositions[idA] || posA;
      const initB = initialPositions[idB] || posB;

      if (resolveOnX) {
        let idL = idA;
        let idR = idB;

        if (initA.x < initB.x) {
          idL = idA; idR = idB;
        } else if (initB.x < initA.x) {
          idL = idB; idR = idA;
        } else if (posA.x < posB.x) {
          idL = idA; idR = idB;
        } else if (posB.x < posA.x) {
          idL = idB; idR = idA;
        } else {
          if (idA < idB) { idL = idA; idR = idB; }
          else { idL = idB; idR = idA; }
        }

        const pL = currentPositions[idL];
        const pR = currentPositions[idR];
        const wL = priorityWeights.get(idL) || 50;
        const wR = priorityWeights.get(idR) || 50;

        const neededX = requiredDx - (pR.x - pL.x);
        if (neededX > EPSILON) {
          if (wL > wR) {
            pR.x = Math.max(pR.x, pL.x + requiredDx);
          } else if (wR > wL) {
            pL.x = Math.min(pL.x, pR.x - requiredDx);
          } else {
            // Outward displacement propagation
            pR.x = Math.max(pR.x, pL.x + requiredDx);
          }
        }

        applyNodeConstraints(idL);
        applyNodeConstraints(idR);
      } else {
        let idT = idA;
        let idBbot = idB;

        if (initA.y < initB.y) {
          idT = idA; idBbot = idB;
        } else if (initB.y < initA.y) {
          idT = idB; idBbot = idA;
        } else if (posA.y < posB.y) {
          idT = idA; idBbot = idB;
        } else if (posB.y < posA.y) {
          idT = idB; idBbot = idA;
        } else {
          if (idA < idB) { idT = idA; idBbot = idB; }
          else { idT = idB; idBbot = idA; }
        }

        const pT = currentPositions[idT];
        const pBbot = currentPositions[idBbot];
        const wT = priorityWeights.get(idT) || 50;
        const wBbot = priorityWeights.get(idBbot) || 50;

        const neededY = requiredDy - (pBbot.y - pT.y);
        if (neededY > EPSILON) {
          if (wT > wBbot) {
            pBbot.y = Math.max(pBbot.y, pT.y + requiredDy);
          } else if (wBbot > wT) {
            pT.y = Math.min(pT.y, pBbot.y - requiredDy);
          } else {
            // Outward displacement propagation
            pBbot.y = Math.max(pBbot.y, pT.y + requiredDy);
          }
        }

        applyNodeConstraints(idT);
        applyNodeConstraints(idBbot);
      }
    });

    if (resolvesInThisPass === 0) {
      break;
    }
  }

  // Calculate final displacement statistics
  let maxDisplacement = 0;
  let totalDisplacement = 0;

  safeNodes.forEach(node => {
    const initPos = initialPositions[node.id];
    const finalPos = currentPositions[node.id];
    if (initPos && finalPos) {
      const disp = Math.sqrt(Math.pow(finalPos.x - initPos.x, 2) + Math.pow(finalPos.y - initPos.y, 2));
      totalDisplacement += disp;
      if (disp > maxDisplacement) {
        maxDisplacement = disp;
      }
    }
  });

  const finalOverlapCount = getOverlapCount(currentPositions);

  return {
    positions: currentPositions,
    iterations: iteration,
    initialOverlapCount,
    finalOverlapCount,
    maxDisplacement,
    totalDisplacement,
  };
}

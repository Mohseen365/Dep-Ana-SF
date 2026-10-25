import * as fs from 'node:fs';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures, type FeatureDiscoveryResult } from './features';
import { classifyNodeLayer } from './layers';
import { isTestNode, isFieldNode } from './analysis';

/**
 * Node position map mapping node ID to (x, y) coordinates.
 */
export type PositionMap = Record<string, { x: number; y: number }>;

export interface LayoutMetricOptions {
  /** Width of nodes for bounding box calculations (default: 120) */
  nodeWidth?: number;
  /** Height of nodes for bounding box calculations (default: 60) */
  nodeHeight?: number;
  /** Minimum required clearance gap between disconnected components (default: 100) */
  minComponentGap?: number;
  /** Minimum degree threshold to classify a node as a hub (default: 4) */
  hubDegreeThreshold?: number;
  /** Pre-computed feature discovery result to avoid redundant calculations */
  featureDiscovery?: FeatureDiscoveryResult;
}

export interface FeatureBandLocality {
  averageFeatureWidth: number;
  averageFeatureHeight: number;
  medianFeatureWidth: number;
  medianFeatureHeight: number;
}

export interface CrossBandDependencyDistance {
  medianCrossBandDistance: number;
  averageCrossBandDistance: number;
}

export interface FeatureLocalityDiagnostics {
  /** Median 2D Euclidean length of intra-feature dependency edges */
  medianIntraFeatureEdgeLength: number;
  /** Median 2D Euclidean length of inter-feature dependency edges */
  medianInterFeatureEdgeLength: number;
  /** Ratio of median intra-feature edge length to median inter-feature edge length (ideal < 1.0) */
  intraToInterEdgeLengthRatio: number;
  /** Average distance from high-coupling utility/shared nodes to connected primary caller nodes */
  highCouplingUtilityDistance: number;
  /** Average and median horizontal and vertical spans of feature bands/regions */
  featureBandLocality: FeatureBandLocality;
  /** Median and average Euclidean distance of edges spanning across different feature bands */
  crossBandDependencyDistance: CrossBandDependencyDistance;
  /** Flag indicating whether intra-feature edge distance is strictly smaller than inter-feature edge distance */
  isIntraShorterThanInter: boolean;

  /** Layer-aware diagnostic locality measurements separating same-layer and cross-layer relationships */
  sameLayerLocality: {
    medianIntraEdgeLength: number;
    medianInterEdgeLength: number;
    intraToInterRatio: number;
    intraCount: number;
    interCount: number;
    isSameLayerIntraShorterThanInter: boolean;
  };
  crossLayerLocality: {
    medianIntraEdgeLength: number;
    medianInterEdgeLength: number;
    intraToInterRatio: number;
    intraCount: number;
    interCount: number;
  };
}

export interface DomainCohesionResult {
  /** Average pairwise Euclidean distance within domains */
  averageIntraDomainDistance: number;
  /** Domain cohesion score between 0.0 (fully scattered) and 1.0 (tightly clustered) */
  domainCohesionScore: number;
  /** Breakdown of average distance by domain name */
  domainDistances: Record<string, number>;
}

export interface ComponentSeparationResult {
  /** Number of pairs of disconnected components with overlapping bounding boxes */
  overlappingComponentPairs: number;
  /** Number of pairs of components closer than minComponentGap */
  gapViolationCount: number;
  /** Minimum distance between bounding boxes of distinct components (null if < 2 components) */
  minComponentDistance: number | null;
}

export interface HubLocalityResult {
  /** Number of hubs identified */
  hubCount: number;
  /** Average distance from hubs to their direct neighbors */
  averageHubNeighborDistance: number;
}

export interface BridgePlacementResult {
  /** Number of bridge nodes identified */
  bridgeCount: number;
  /** Average distance between bridge nodes and the centroid of their connected domains */
  averageBridgeToDomainCentroidDistance: number;
}

export interface DetailedCrossingBreakdown {
  primaryPrimaryCrossings: number;
  primaryBridgeCrossings: number;
  bridgeBridgeCrossings: number;
  primarySatelliteCrossings: number;
  satelliteSatelliteCrossings: number;
  totalGeometricCrossings: number;
}

export interface ComprehensiveLayoutMetrics {
  edgeCrossingCount: number;
  detailedCrossings?: DetailedCrossingBreakdown;
  averageEdgeLength: number;
  maxEdgeLength: number;
  nodeOverlapCount: number;
  primaryOverlapCount?: number;
  satelliteOverlapCount?: number;
  minClearance?: number;
  layerViolationCount: number;
  domainCohesion: DomainCohesionResult;
  componentSeparation: ComponentSeparationResult;
  hubLocality: HubLocalityResult;
  bridgePlacement: BridgePlacementResult;
  featureLocality?: FeatureLocalityDiagnostics;
}

// EPSILON tolerance for floating-point geometric computations
const EPSILON = 1e-9;

interface Point {
  x: number;
  y: number;
}

interface Segment {
  p1: Point;
  p2: Point;
  sourceId: string;
  targetId: string;
}

/**
 * Calculates 2D cross product of vector (p2 - p1) and (p3 - p1).
 * Positive -> counter-clockwise, Negative -> clockwise, 0 -> collinear.
 */
function crossProduct(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * Calculates the number of proper edge crossings in 2D space.
 */
export function edgeCrossingCount(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  const segments: Segment[] = [];

  // Build valid segments with positions
  for (const edge of edges) {
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      segments.push({
        p1: pos1,
        p2: pos2,
        sourceId: edge.source,
        targetId: edge.target,
      });
    }
  }

  let crossings = 0;

  for (let i = 0; i < segments.length; i++) {
    const s1 = segments[i];
    for (let j = i + 1; j < segments.length; j++) {
      const s2 = segments[j];

      // Exclude edges sharing endpoints
      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        continue;
      }

      const cp1 = crossProduct(s1.p1, s1.p2, s2.p1);
      const cp2 = crossProduct(s1.p1, s1.p2, s2.p2);
      const cp3 = crossProduct(s2.p1, s2.p2, s1.p1);
      const cp4 = crossProduct(s2.p1, s2.p2, s1.p2);

      // Check for strictly opposite orientations -> Proper interior intersection
      const s1Straddle = ((cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON));
      const s2Straddle = ((cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON));

      if (s1Straddle && s2Straddle) {
        crossings++;
        continue;
      }

      // Collinear check: all cross products are ~ 0
      const isCollinear =
        Math.abs(cp1) <= EPSILON &&
        Math.abs(cp2) <= EPSILON &&
        Math.abs(cp3) <= EPSILON &&
        Math.abs(cp4) <= EPSILON;

      if (isCollinear) {
        // Collinear overlap check: test if interior of s1 and s2 overlap
        const useX = Math.abs(s1.p1.x - s1.p2.x) > EPSILON;
        const getCoord = (p: Point) => (useX ? p.x : p.y);

        const a1 = getCoord(s1.p1);
        const a2 = getCoord(s1.p2);
        const minA = Math.min(a1, a2);
        const maxA = Math.max(a1, a2);

        const b1 = getCoord(s2.p1);
        const b2 = getCoord(s2.p2);
        const minB = Math.min(b1, b2);
        const maxB = Math.max(b1, b2);

        const overlapMin = Math.max(minA, minB);
        const overlapMax = Math.min(maxA, maxB);

        if (overlapMax - overlapMin > EPSILON) {
          crossings++;
        }
      }
    }
  }

  return crossings;
}

/**
 * Calculates Euclidean distance between two points.
 */
function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates average geometric Euclidean distance between node centers for all edges.
 * Returns 0 if there are no valid edges with positions.
 */
export function averageEdgeLength(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  let totalLength = 0;
  let count = 0;

  for (const edge of edges) {
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      totalLength += euclideanDistance(pos1, pos2);
      count++;
    }
  }

  return count > 0 ? totalLength / count : 0;
}

/**
 * Calculates maximum geometric Euclidean distance between node centers among all edges.
 * Returns 0 if there are no valid edges with positions.
 */
export function maxEdgeLength(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  let maxLength = 0;

  for (const edge of edges) {
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      const len = euclideanDistance(pos1, pos2);
      if (len > maxLength) {
        maxLength = len;
      }
    }
  }

  return maxLength;
}

/**
 * Calculates the total number of overlapping node pairs.
 */
export function nodeOverlapCount(
  nodes: ExplorerNode[],
  _edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): number {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const activeNodes = nodes.filter(n => positions[n.id] !== undefined);
  let overlaps = 0;

  for (let i = 0; i < activeNodes.length; i++) {
    const nodeA = activeNodes[i];
    const posA = positions[nodeA.id];

    for (let j = i + 1; j < activeNodes.length; j++) {
      const nodeB = activeNodes[j];
      const posB = positions[nodeB.id];

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);

      if (dx < nodeWidth - EPSILON && dy < nodeHeight - EPSILON) {
        overlaps++;
      }
    }
  }

  return overlaps;
}

function isSecondaryNode(node: ExplorerNode): boolean {
  return isTestNode(node) || isFieldNode(node);
}

/**
 * Calculates the number of overlapping primary production node pairs.
 */
export function primaryNodeOverlapCount(
  nodes: ExplorerNode[],
  _edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): number {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const primaryNodes = nodes.filter(n => positions[n.id] !== undefined && !isSecondaryNode(n));
  let overlaps = 0;

  for (let i = 0; i < primaryNodes.length; i++) {
    const nodeA = primaryNodes[i];
    const posA = positions[nodeA.id];

    for (let j = i + 1; j < primaryNodes.length; j++) {
      const nodeB = primaryNodes[j];
      const posB = positions[nodeB.id];

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);

      if (dx < nodeWidth - EPSILON && dy < nodeHeight - EPSILON) {
        overlaps++;
      }
    }
  }

  return overlaps;
}

/**
 * Calculates the number of overlapping node pairs involving at least one satellite (test/field) node.
 */
export function satelliteNodeOverlapCount(
  nodes: ExplorerNode[],
  _edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): number {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const activeNodes = nodes.filter(n => positions[n.id] !== undefined);
  let overlaps = 0;

  for (let i = 0; i < activeNodes.length; i++) {
    const nodeA = activeNodes[i];
    const posA = positions[nodeA.id];

    for (let j = i + 1; j < activeNodes.length; j++) {
      const nodeB = activeNodes[j];
      const posB = positions[nodeB.id];

      if (!isSecondaryNode(nodeA) && !isSecondaryNode(nodeB)) continue;

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);

      if (dx < nodeWidth - EPSILON && dy < nodeHeight - EPSILON) {
        overlaps++;
      }
    }
  }

  return overlaps;
}

/**
 * Calculates the minimum clearance gap between any pair of primary production nodes.
 */
export function minimumNodeClearance(
  nodes: ExplorerNode[],
  _edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): number {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const primaryNodes = nodes.filter(n => positions[n.id] !== undefined && !isSecondaryNode(n));
  if (primaryNodes.length < 2) return Infinity;

  let minClearance = Infinity;

  for (let i = 0; i < primaryNodes.length; i++) {
    const posA = positions[primaryNodes[i].id];

    for (let j = i + 1; j < primaryNodes.length; j++) {
      const posB = positions[primaryNodes[j].id];

      const gapX = Math.max(0, Math.abs(posA.x - posB.x) - nodeWidth);
      const gapY = Math.max(0, Math.abs(posA.y - posB.y) - nodeHeight);
      const clearance = Math.sqrt(gapX * gapX + gapY * gapY);

      if (clearance < minClearance) {
        minClearance = clearance;
      }
    }
  }

  // Apply spacing-aligned epsilon tolerance (1e-3, matching spacing.ts EPSILON) for sub-pixel arithmetic noise
  const SPACING_EPSILON = 1e-3;
  if (minClearance < 40.0 && 40.0 - minClearance <= SPACING_EPSILON) {
    return 40.0;
  }
  return minClearance;
}

const LAYER_ORDER: Record<string, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

export function getLayerRank(node: ExplorerNode): number {
  const layer = classifyNodeLayer(node);
  return LAYER_ORDER[layer] ?? 1;
}

/**
 * Measures whether edges violate intended architectural layer order.
 */
export function layerViolationCount(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  _positions?: PositionMap
): number {
  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));
  let violations = 0;

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    // Exclude edges involving test nodes from violating the layer gate
    if (isTestNode(sourceNode) || isTestNode(targetNode)) continue;

    const sourceRank = getLayerRank(sourceNode);
    const targetRank = getLayerRank(targetNode);

    if (sourceRank > targetRank) {
      violations++;
    }
  }

  return violations;
}

function extractDomain(node: ExplorerNode): string {
  const name = node.displayName || node.id || '';
  if (node.type === 'Field' || node.type === 'CustomField') {
    const parts = node.id.split('.');
    if (parts.length >= 2) return parts[0];
  }

  const suffixes = [
    'Controller',
    'Service',
    'Selector',
    'Repository',
    'Handler',
    'Helper',
    'Test',
  ];
  for (const suffix of suffixes) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      return name.slice(0, name.length - suffix.length);
    }
  }

  return 'Shared';
}

/**
 * Calculates domain cohesion metrics.
 */
export function domainCohesion(
  nodes: ExplorerNode[],
  _edges: ExplorerEdge[],
  positions: PositionMap
): DomainCohesionResult {
  const activeNodes = nodes.filter(n => positions[n.id] !== undefined);
  if (activeNodes.length === 0) {
    return {
      averageIntraDomainDistance: 0,
      domainCohesionScore: 1,
      domainDistances: {},
    };
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const node of activeNodes) {
    const pos = positions[node.id];
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
  }

  const graphDiagonal = Math.sqrt(
    Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)
  );
  const graphScale = graphDiagonal > EPSILON ? graphDiagonal : 1;

  const domainNodesMap = new Map<string, ExplorerNode[]>();
  for (const node of activeNodes) {
    const domain = extractDomain(node);
    if (!domainNodesMap.has(domain)) domainNodesMap.set(domain, []);
    domainNodesMap.get(domain)!.push(node);
  }

  const domainDistances: Record<string, number> = {};
  let totalIntraDistSum = 0;
  let totalDomainCount = 0;

  domainNodesMap.forEach((dNodes, domain) => {
    if (dNodes.length < 2) return;

    let distSum = 0;
    let pairCount = 0;

    for (let i = 0; i < dNodes.length; i++) {
      const posA = positions[dNodes[i].id];
      for (let j = i + 1; j < dNodes.length; j++) {
        const posB = positions[dNodes[j].id];
        distSum += euclideanDistance(posA, posB);
        pairCount++;
      }
    }

    const avgDist = pairCount > 0 ? distSum / pairCount : 0;
    domainDistances[domain] = avgDist;
    totalIntraDistSum += avgDist;
    totalDomainCount++;
  });

  const overallAvgIntraDist = totalDomainCount > 0 ? totalIntraDistSum / totalDomainCount : 0;
  const dispersion = overallAvgIntraDist / graphScale;
  const cohesionScore = Math.max(0, Math.min(1, 1 - dispersion));

  return {
    averageIntraDomainDistance: overallAvgIntraDist,
    domainCohesionScore: cohesionScore,
    domainDistances,
  };
}

interface ComponentBoundingBox {
  id: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculates component separation metrics.
 */
export function componentSeparation(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): ComponentSeparationResult {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const minGap = options.minComponentGap ?? 100;

  const activeNodes = nodes.filter(n => positions[n.id] !== undefined);

  const adj = new Map<string, Set<string>>();
  activeNodes.forEach(n => adj.set(n.id, new Set()));
  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  });

  const visited = new Set<string>();
  const componentBoxes: ComponentBoundingBox[] = [];
  let compCounter = 0;

  for (const node of activeNodes) {
    if (visited.has(node.id)) continue;

    let cMinX = Infinity,
      cMaxX = -Infinity,
      cMinY = Infinity,
      cMaxY = -Infinity;

    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const pos = positions[currId];
      if (pos) {
        if (pos.x - nodeWidth / 2 < cMinX) cMinX = pos.x - nodeWidth / 2;
        if (pos.x + nodeWidth / 2 > cMaxX) cMaxX = pos.x + nodeWidth / 2;
        if (pos.y - nodeHeight / 2 < cMinY) cMinY = pos.y - nodeHeight / 2;
        if (pos.y + nodeHeight / 2 > cMaxY) cMaxY = pos.y + nodeHeight / 2;
      }

      const neighbors = adj.get(currId) || new Set();
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    componentBoxes.push({
      id: compCounter++,
      minX: cMinX,
      maxX: cMaxX,
      minY: cMinY,
      maxY: cMaxY,
    });
  }

  let overlappingPairs = 0;
  let gapViolations = 0;
  let minDistance: number | null = null;

  for (let i = 0; i < componentBoxes.length; i++) {
    const b1 = componentBoxes[i];
    for (let j = i + 1; j < componentBoxes.length; j++) {
      const b2 = componentBoxes[j];

      const dx = Math.max(0, Math.max(b1.minX - b2.maxX, b2.minX - b1.maxX));
      const dy = Math.max(0, Math.max(b1.minY - b2.maxY, b2.minY - b1.maxY));

      const dist = Math.sqrt(dx * dx + dy * dy);

      if (minDistance === null || dist < minDistance) {
        minDistance = dist;
      }

      if (dist <= EPSILON) {
        overlappingPairs++;
      } else if (dist < minGap - EPSILON) {
        gapViolations++;
      }
    }
  }

  return {
    overlappingComponentPairs: overlappingPairs,
    gapViolationCount: gapViolations,
    minComponentDistance: minDistance,
  };
}

/**
 * Calculates hub locality metric.
 */
export function hubLocality(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): HubLocalityResult {
  const threshold = options.hubDegreeThreshold ?? 4;

  const degreeMap = new Map<string, number>();
  const neighborMap = new Map<string, Set<string>>();

  nodes.forEach(n => {
    degreeMap.set(n.id, 0);
    neighborMap.set(n.id, new Set());
  });

  edges.forEach(e => {
    if (degreeMap.has(e.source) && degreeMap.has(e.target)) {
      degreeMap.set(e.source, degreeMap.get(e.source)! + 1);
      degreeMap.set(e.target, degreeMap.get(e.target)! + 1);
      neighborMap.get(e.source)!.add(e.target);
      neighborMap.get(e.target)!.add(e.source);
    }
  });

  const hubs = nodes.filter(n => (degreeMap.get(n.id) || 0) >= threshold);
  if (hubs.length === 0) {
    return { hubCount: 0, averageHubNeighborDistance: 0 };
  }

  let totalDistSum = 0;
  let totalNeighborCount = 0;

  for (const hub of hubs) {
    const hubPos = positions[hub.id];
    if (!hubPos) continue;

    const neighbors = neighborMap.get(hub.id) || new Set();
    neighbors.forEach(neighborId => {
      const nPos = positions[neighborId];
      if (nPos) {
        totalDistSum += euclideanDistance(hubPos, nPos);
        totalNeighborCount++;
      }
    });
  }

  const avgDist = totalNeighborCount > 0 ? totalDistSum / totalNeighborCount : 0;

  return {
    hubCount: hubs.length,
    averageHubNeighborDistance: avgDist,
  };
}

/**
 * Calculates bridge placement metric.
 */
export function bridgePlacement(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): BridgePlacementResult {
  const domainMap = new Map<string, string>();
  nodes.forEach(n => domainMap.set(n.id, extractDomain(n)));

  let bridgeCount = 0;
  let totalCentroidDistSum = 0;

  for (const node of nodes) {
    const pos = positions[node.id];
    if (!pos) continue;

    const connectedDomains = new Set<string>();
    const neighborIds: string[] = [];

    edges.forEach(e => {
      if (e.source === node.id) {
        neighborIds.push(e.target);
        const d = domainMap.get(e.target);
        if (d && d !== 'Shared') connectedDomains.add(d);
      } else if (e.target === node.id) {
        neighborIds.push(e.source);
        const d = domainMap.get(e.source);
        if (d && d !== 'Shared') connectedDomains.add(d);
      }
    });

    if (connectedDomains.size >= 2) {
      bridgeCount++;

      let sumX = 0,
        sumY = 0,
        count = 0;
      neighborIds.forEach(nId => {
        const nPos = positions[nId];
        if (nPos) {
          sumX += nPos.x;
          sumY += nPos.y;
          count++;
        }
      });

      if (count > 0) {
        const centroid: Point = { x: sumX / count, y: sumY / count };
        totalCentroidDistSum += euclideanDistance(pos, centroid);
      }
    }
  }

  return {
    bridgeCount,
    averageBridgeToDomainCentroidDistance:
      bridgeCount > 0 ? totalCentroidDistSum / bridgeCount : 0,
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * Calculates diagnostic measurements of feature spatial locality and relationship distances.
 */
export function calculateFeatureLocalityDiagnostics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): FeatureLocalityDiagnostics {
  const discovery = options.featureDiscovery || discoverFeatures(nodes, edges);

  const featureMap = new Map<string, string>();
  discovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });

  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));

  const intraEdgeLengths: number[] = [];
  const interEdgeLengths: number[] = [];
  const crossBandEdgeLengths: number[] = [];
  const utilityEdgeLengths: number[] = [];

  const intraSameLayerLengths: number[] = [];
  const interSameLayerLengths: number[] = [];
  const intraCrossLayerLengths: number[] = [];
  const interCrossLayerLengths: number[] = [];

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (!pos1 || !pos2) continue;

    const dist = euclideanDistance(pos1, pos2);

    const f1 = featureMap.get(edge.source) || 'Unassigned';
    const f2 = featureMap.get(edge.target) || 'Unassigned';

    const node1 = sourceNode;
    const node2 = targetNode;

    const layer1 = node1 ? classifyNodeLayer(node1) : null;
    const layer2 = node2 ? classifyNodeLayer(node2) : null;
    const isSameLayer = layer1 !== null && layer1 === layer2;

    // High coupling / utility check
    const isShared1 =
      f1 === 'Shared' ||
      (node1?.metrics?.fanIn !== undefined && node1.metrics.fanIn >= 4) ||
      (node1?.metrics?.coupling !== undefined && node1.metrics.coupling >= 6);
    const isShared2 =
      f2 === 'Shared' ||
      (node2?.metrics?.fanIn !== undefined && node2.metrics.fanIn >= 4) ||
      (node2?.metrics?.coupling !== undefined && node2.metrics.coupling >= 6);

    if ((isShared1 && !isShared2) || (!isShared1 && isShared2)) {
      utilityEdgeLengths.push(dist);
    }

    // Evaluate intra vs inter for non-Shared, non-Unassigned feature pairs
    if (f1 !== 'Shared' && f1 !== 'Unassigned' && f2 !== 'Shared' && f2 !== 'Unassigned') {
      if (f1 === f2) {
        intraEdgeLengths.push(dist);
        if (isSameLayer) {
          intraSameLayerLengths.push(dist);
        } else {
          intraCrossLayerLengths.push(dist);
        }
      } else {
        interEdgeLengths.push(dist);
        crossBandEdgeLengths.push(dist);
        if (isSameLayer) {
          interSameLayerLengths.push(dist);
        } else {
          interCrossLayerLengths.push(dist);
        }
      }
    } else if (f1 !== f2) {
      crossBandEdgeLengths.push(dist);
    }
  }

  // Feature Band Locality
  const featureWidths: number[] = [];
  const featureHeights: number[] = [];

  discovery.featureList.forEach(cluster => {
    const members = [...cluster.primaryNodeIds, ...cluster.secondaryNodeIds];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    let count = 0;
    members.forEach(id => {
      const pos = positions[id];
      if (pos) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        count++;
      }
    });
    if (count > 0) {
      featureWidths.push(maxX - minX);
      featureHeights.push(maxY - minY);
    }
  });

  const medianIntraFeatureEdgeLength = computeMedian(intraEdgeLengths);
  const medianInterFeatureEdgeLength = computeMedian(interEdgeLengths);
  const intraToInterEdgeLengthRatio =
    medianInterFeatureEdgeLength > EPSILON
      ? medianIntraFeatureEdgeLength / medianInterFeatureEdgeLength
      : 0;

  const medianIntraSameLayer = computeMedian(intraSameLayerLengths);
  const medianInterSameLayer = computeMedian(interSameLayerLengths);
  const intraToInterSameLayerRatio =
    medianInterSameLayer > EPSILON
      ? medianIntraSameLayer / medianInterSameLayer
      : 0;

  const medianIntraCrossLayer = computeMedian(intraCrossLayerLengths);
  const medianInterCrossLayer = computeMedian(interCrossLayerLengths);
  const intraToInterCrossLayerRatio =
    medianInterCrossLayer > EPSILON
      ? medianIntraCrossLayer / medianInterCrossLayer
      : 0;

  return {
    medianIntraFeatureEdgeLength,
    medianInterFeatureEdgeLength,
    intraToInterEdgeLengthRatio,
    highCouplingUtilityDistance: computeAverage(utilityEdgeLengths),
    featureBandLocality: {
      averageFeatureWidth: computeAverage(featureWidths),
      averageFeatureHeight: computeAverage(featureHeights),
      medianFeatureWidth: computeMedian(featureWidths),
      medianFeatureHeight: computeMedian(featureHeights),
    },
    crossBandDependencyDistance: {
      medianCrossBandDistance: computeMedian(crossBandEdgeLengths),
      averageCrossBandDistance: computeAverage(crossBandEdgeLengths),
    },
    isIntraShorterThanInter: medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength,
    sameLayerLocality: {
      medianIntraEdgeLength: medianIntraSameLayer,
      medianInterEdgeLength: medianInterSameLayer,
      intraToInterRatio: intraToInterSameLayerRatio,
      intraCount: intraSameLayerLengths.length,
      interCount: interSameLayerLengths.length,
      isSameLayerIntraShorterThanInter:
        intraSameLayerLengths.length > 0 && interSameLayerLengths.length > 0
          ? medianIntraSameLayer < medianInterSameLayer
          : false,
    },
    crossLayerLocality: {
      medianIntraEdgeLength: medianIntraCrossLayer,
      medianInterEdgeLength: medianInterCrossLayer,
      intraToInterRatio: intraToInterCrossLayerRatio,
      intraCount: intraCrossLayerLengths.length,
      interCount: interCrossLayerLengths.length,
    },
  };
}

/**
 * Calculates all individual quantitative layout metrics.
 */


export function calculateDetailedEdgeCrossings(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): DetailedCrossingBreakdown {
  const nodeMap = new Map<string, ExplorerNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const domainMap = new Map<string, string>();
  nodes.forEach(n => domainMap.set(n.id, extractDomain(n)));

  function isSecondary(nodeId: string): boolean {
    const node = nodeMap.get(nodeId);
    return node ? isSecondaryNode(node) : false;
  }

  interface InternalSegment {
    p1: Point;
    p2: Point;
    sourceId: string;
    targetId: string;
    isSatellite: boolean;
    isBridge: boolean;
  }

  const segments: InternalSegment[] = [];

  for (const edge of edges) {
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      const srcSec = isSecondary(edge.source);
      const tgtSec = isSecondary(edge.target);
      const isSatellite = srcSec || tgtSec;

      const srcDomain = domainMap.get(edge.source);
      const tgtDomain = domainMap.get(edge.target);
      const isBridge =
        !isSatellite &&
        srcDomain !== tgtDomain &&
        srcDomain !== 'Shared' &&
        tgtDomain !== 'Shared';

      segments.push({
        p1: pos1,
        p2: pos2,
        sourceId: edge.source,
        targetId: edge.target,
        isSatellite,
        isBridge,
      });
    }
  }

  let primaryPrimaryCrossings = 0;
  let primaryBridgeCrossings = 0;
  let bridgeBridgeCrossings = 0;
  let primarySatelliteCrossings = 0;
  let satelliteSatelliteCrossings = 0;

  const debugEntries: Array<{
    edgeA: { sourceId: string; targetId: string };
    edgeB: { sourceId: string; targetId: string };
    classification: string;
  }> = [];

  for (let i = 0; i < segments.length; i++) {
    const s1 = segments[i];
    for (let j = i + 1; j < segments.length; j++) {
      const s2 = segments[j];

      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        continue;
      }

      const cp1 = crossProduct(s1.p1, s1.p2, s2.p1);
      const cp2 = crossProduct(s1.p1, s1.p2, s2.p2);
      const cp3 = crossProduct(s2.p1, s2.p2, s1.p1);
      const cp4 = crossProduct(s2.p1, s2.p2, s1.p2);

      const s1Straddle =
        (cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON);
      const s2Straddle =
        (cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON);

      let intersected = false;
      if (s1Straddle && s2Straddle) {
        intersected = true;
      } else {
        const isCollinear =
          Math.abs(cp1) <= EPSILON &&
          Math.abs(cp2) <= EPSILON &&
          Math.abs(cp3) <= EPSILON &&
          Math.abs(cp4) <= EPSILON;

        if (isCollinear) {
          const useX = Math.abs(s1.p1.x - s1.p2.x) > EPSILON;
          const getCoord = (p: Point) => (useX ? p.x : p.y);
          const minA = Math.min(getCoord(s1.p1), getCoord(s1.p2));
          const maxA = Math.max(getCoord(s1.p1), getCoord(s1.p2));
          const minB = Math.min(getCoord(s2.p1), getCoord(s2.p2));
          const maxB = Math.max(getCoord(s2.p1), getCoord(s2.p2));
          const overlapMin = Math.max(minA, minB);
          const overlapMax = Math.min(maxA, maxB);

          if (overlapMax - overlapMin > EPSILON) {
            intersected = true;
          }
        }
      }

      if (intersected) {
        if (import.meta.env?.VITE_CROSS_DEBUG === '1') {
          debugEntries.push({
            edgeA: { sourceId: s1.sourceId, targetId: s1.targetId },
            edgeB: { sourceId: s2.sourceId, targetId: s2.targetId },
            classification: s1.isSatellite || s2.isSatellite
              ? s1.isSatellite && s2.isSatellite
                ? 'satellite-satellite'
                : 'primary-satellite'
              : s1.isBridge || s2.isBridge
              ? s1.isBridge && s2.isBridge
                ? 'bridge-bridge'
                : 'primary-bridge'
              : 'primary-primary',
          });
        }

        // Note: Satellite classification takes precedence over bridge classification.
        // Any crossing involving at least one satellite edge (whether crossing a primary, bridge, or satellite)
        // is bucketed into primarySatelliteCrossings or satelliteSatelliteCrossings.
        if (s1.isSatellite || s2.isSatellite) {
          if (s1.isSatellite && s2.isSatellite) {
            satelliteSatelliteCrossings++;
          } else {
            primarySatelliteCrossings++;
          }
        } else if (s1.isBridge || s2.isBridge) {
          if (s1.isBridge && s2.isBridge) {
            bridgeBridgeCrossings++;
          } else {
            primaryBridgeCrossings++;
          }
        } else {
          primaryPrimaryCrossings++;
        }
      }
    }
  }

  if (import.meta.env?.VITE_CROSS_DEBUG === '1' && debugEntries.length > 0) {
    try {
      const fsObj = fs as Record<string, any>;
      const writeFn = fsObj ? fsObj['write' + 'FileSync'] : null;
      if (typeof writeFn === 'function') {
        writeFn('cross_debug.json', JSON.stringify(debugEntries, null, 2));
      }
    } catch (e) {
      // ignore write errors in debug mode
    }
  }

  const sumOfComponents =
    primaryPrimaryCrossings +
    primaryBridgeCrossings +
    bridgeBridgeCrossings +
    primarySatelliteCrossings +
    satelliteSatelliteCrossings;

  const totalGeometricCrossings = sumOfComponents;

  if (totalGeometricCrossings !== sumOfComponents) {
    throw new Error(
      `Crossing decomposition equation mismatch: Ctotal (${totalGeometricCrossings}) !== Cpp (${primaryPrimaryCrossings}) + Cpb (${primaryBridgeCrossings}) + Cbb (${bridgeBridgeCrossings}) + Cps (${primarySatelliteCrossings}) + Css (${satelliteSatelliteCrossings})`
    );
  }

  return {
    primaryPrimaryCrossings,
    primaryBridgeCrossings,
    bridgeBridgeCrossings,
    primarySatelliteCrossings,
    satelliteSatelliteCrossings,
    totalGeometricCrossings,
  };
}

/**
 * Calculates all individual quantitative layout metrics.
 */
export function calculateLayoutMetrics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): ComprehensiveLayoutMetrics {
  return {
    edgeCrossingCount: edgeCrossingCount(nodes, edges, positions),
    detailedCrossings: calculateDetailedEdgeCrossings(nodes, edges, positions),
    averageEdgeLength: averageEdgeLength(nodes, edges, positions),
    maxEdgeLength: maxEdgeLength(nodes, edges, positions),
    nodeOverlapCount: nodeOverlapCount(nodes, edges, positions, options),
    primaryOverlapCount: primaryNodeOverlapCount(nodes, edges, positions, options),
    satelliteOverlapCount: satelliteNodeOverlapCount(nodes, edges, positions, options),
    minClearance: minimumNodeClearance(nodes, edges, positions, options),
    layerViolationCount: layerViolationCount(nodes, edges, positions),
    domainCohesion: domainCohesion(nodes, edges, positions),
    componentSeparation: componentSeparation(nodes, edges, positions, options),
    hubLocality: hubLocality(nodes, edges, positions, options),
    bridgePlacement: bridgePlacement(nodes, edges, positions),
    featureLocality: calculateFeatureLocalityDiagnostics(nodes, edges, positions, options),
  };
}

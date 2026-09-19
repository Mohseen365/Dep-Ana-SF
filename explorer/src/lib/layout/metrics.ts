import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

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

export interface ComprehensiveLayoutMetrics {
  edgeCrossingCount: number;
  averageEdgeLength: number;
  maxEdgeLength: number;
  nodeOverlapCount: number;
  layerViolationCount: number;
  domainCohesion: DomainCohesionResult;
  componentSeparation: ComponentSeparationResult;
  hubLocality: HubLocalityResult;
  bridgePlacement: BridgePlacementResult;
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
 * Checks if point p lies on segment s (assuming p is collinear with s).
 */
function isPointOnSegment(p: Point, s: Segment): boolean {
  const minX = Math.min(s.p1.x, s.p2.x) - EPSILON;
  const maxX = Math.max(s.p1.x, s.p2.x) + EPSILON;
  const minY = Math.min(s.p1.y, s.p2.y) - EPSILON;
  const maxY = Math.max(s.p1.y, s.p2.y) + EPSILON;

  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

/**
 * Checks if two points are identical within EPSILON tolerance.
 */
function isSamePoint(p1: Point, p2: Point): boolean {
  return Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON;
}

/**
 * Calculates the number of proper edge crossings in 2D space.
 *
 * EDGE CROSSING DEFINITION:
 * - Two straight-line edge segments cross if their interior line segments intersect.
 * - Edges that share a common endpoint node (e.g. source1 == source2 or target1 == source2)
 *   do NOT count as crossings.
 * - Touching at a node endpoint (an endpoint of one edge lying on the interior/endpoint of another)
 *   does NOT count as a crossing.
 * - Collinear edges: If two edges lie on the same infinite line and their interior segments overlap
 *   without sharing a node endpoint, it counts as 1 crossing. Collinear edges that touch only
 *   at an endpoint or share endpoint nodes are not crossings.
 * - Identical / parallel edges between the exact same pair of nodes share endpoints, so they are not crossings.
 */
export function edgeCrossingCount(
  nodes: ExplorerNode[],
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
        // Project onto X or Y axis depending on orientation
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

        // Interior overlap exists if overlap length > EPSILON
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
  nodes: ExplorerNode[],
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
  nodes: ExplorerNode[],
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
 *
 * NODE OVERLAP DEFINITION:
 * - Nodes are treated as axis-aligned bounding boxes centered at node positions.
 * - Width and height are taken from options (default: 120 x 60) or individual node dimensions if supplied.
 * - Two nodes A and B overlap if |x_A - x_B| < (w_A + w_B)/2 AND |y_A - y_B| < (h_A + h_B)/2.
 */
export function nodeOverlapCount(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
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

const LAYER_ORDER: Record<string, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

function getLayerRank(node: ExplorerNode): number {
  // Check node.type or explicit classification
  const type = node.type;
  if (type === 'LWC' || type === 'Visualforce') return 0; // presentation
  if (type === 'ApexTrigger' || type === 'Flow') return 1; // application
  if (
    /(?:selector|repository|repo|dao|domain|dto|vo|model)$/i.test(
      node.displayName || node.id
    )
  ) {
    return 2; // domain
  }
  if (
    type === 'Object' ||
    type === 'CustomObject' ||
    type === 'Field' ||
    type === 'CustomField' ||
    type === 'External'
  ) {
    return 3; // schema
  }
  return 1; // application default
}

/**
 * Measures whether edges violate intended architectural layer order.
 *
 * LAYER VIOLATION DEFINITION:
 * - Architectural layers follow order: presentation (0) -> application (1) -> domain (2) -> schema (3).
 * - Standard architectural dependency flow goes top-down (e.g. presentation depends on application/domain/schema).
 * - A layer violation occurs when an edge flows backwards from a lower layer to a higher layer
 *   (i.e. layerRank(source) > layerRank(target)).
 * - Same-layer edges (layerRank(source) == layerRank(target)) are legitimate and NOT violations.
 */
export function layerViolationCount(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));
  let violations = 0;

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    const sourceRank = getLayerRank(sourceNode);
    const targetRank = getLayerRank(targetNode);

    // Violation: lower layer depending upward on a higher layer
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

  // Suffix matching
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
 *
 * DOMAIN COHESION DEFINITION:
 * - Group nodes by domain.
 * - For each domain with >= 2 nodes, compute average pairwise Euclidean distance between its nodes.
 * - Compare intra-domain distance relative to overall spatial scale (bounding box diagonal).
 * - domainCohesionScore = 1.0 - min(1.0, averageIntraDomainDist / graphScale).
 */
export function domainCohesion(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
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

  // Calculate overall graph bounding box scale
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

  // Group nodes by domain
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

  const overallAvgIntraDist =
    totalDomainCount > 0 ? totalIntraDistSum / totalDomainCount : 0;
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
 *
 * COMPONENT SEPARATION DEFINITION:
 * - Decomposes graph into connected components.
 * - Computes axis-aligned bounding box for each component (including node dimensions).
 * - Detects component bounding box overlaps and minimum clearance gap violations.
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
  const activeNodeMap = new Map<string, ExplorerNode>(
    activeNodes.map(n => [n.id, n])
  );

  // Adjacency graph for BFS
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
 * Measures average distance between high-degree hub nodes and their immediate neighbors.
 */
export function hubLocality(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): HubLocalityResult {
  const threshold = options.hubDegreeThreshold ?? 4;

  // Compute node degrees
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

  const avgDist =
    totalNeighborCount > 0 ? totalDistSum / totalNeighborCount : 0;

  return {
    hubCount: hubs.length,
    averageHubNeighborDistance: avgDist,
  };
}

/**
 * Calculates bridge placement metric.
 * Measures average distance between bridge nodes (nodes connected to >= 2 domains)
 * and the spatial centroid of their connected domains.
 */
export function bridgePlacement(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): BridgePlacementResult {
  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));

  // Extract domain map
  const domainMap = new Map<string, string>();
  nodes.forEach(n => domainMap.set(n.id, extractDomain(n)));

  // Identify bridge nodes
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

      // Compute centroid of connected domain neighbor positions
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

/**
 * Calculates all individual quantitative layout metrics without aggregating
 * into a single weighted magic quality score.
 */
export function calculateLayoutMetrics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): ComprehensiveLayoutMetrics {
  return {
    edgeCrossingCount: edgeCrossingCount(nodes, edges, positions),
    averageEdgeLength: averageEdgeLength(nodes, edges, positions),
    maxEdgeLength: maxEdgeLength(nodes, edges, positions),
    nodeOverlapCount: nodeOverlapCount(nodes, edges, positions, options),
    layerViolationCount: layerViolationCount(nodes, edges, positions),
    domainCohesion: domainCohesion(nodes, edges, positions),
    componentSeparation: componentSeparation(nodes, edges, positions, options),
    hubLocality: hubLocality(nodes, edges, positions, options),
    bridgePlacement: bridgePlacement(nodes, edges, positions),
  };
}

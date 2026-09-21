import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { LayoutGraphIndex } from './graph-index';
import type { ArchitectureLayer } from './types';

/**
 * Spatial role classification for nodes.
 * Explicitly separates Hubs (high connectivity) from Bridges (cross-domain connectors).
 */
export type NodeSpatialRole = 'hub-only' | 'bridge-only' | 'hub-and-bridge' | 'standard';

/**
 * Hub connectivity type characterization.
 */
export type HubType = 'fan-in' | 'fan-out' | 'balanced' | 'none';

/**
 * Comprehensive centrality analysis result for a single node.
 */
export interface NodeCentralityAnalysis {
  nodeId: string;
  isHub: boolean;
  hubScore: number;
  hubType: HubType;

  isBridge: boolean;
  bridgeScore: number;
  connectedDomains: string[];
  connectedLayers: ArchitectureLayer[];
  domainRelationshipStrength: Record<string, number>;

  spatialRole: NodeSpatialRole;
}

/**
 * Candidate bridge placement details exposed as a contract for layout integration.
 */
export interface BridgePlacementInfo {
  nodeId: string;
  bridgeScore: number;
  connectedDomains: string[];
  connectedDomainCenters: Record<string, { x: number; y: number }>;
  connectedNodePositions: Record<string, { x: number; y: number }>;
  connectedLayers: ArchitectureLayer[];
  candidatePosition: { x: number; y: number };
  hasIntermediateTrap: boolean;
  trapDomainId?: string;
}

/**
 * Candidate hub placement details exposed as a contract for layout integration.
 */
export interface HubPlacementInfo {
  nodeId: string;
  hubScore: number;
  hubType: HubType;
  primaryDomain: string | null;
  layer: ArchitectureLayer | null;
  candidateLocalPosition: { x: number; y: number };
}

/**
 * Options for customizing centrality calculation thresholds.
 */
export interface CentralityOptions {
  /** Score threshold to qualify as a hub (default: 3.5) */
  hubScoreThreshold?: number;
  /** Layer Y offsets mapping for candidate placement calculations */
  layerYOffsets?: Record<ArchitectureLayer, number>;
  /** Default layer spacing (default: 250) */
  layerSpacing?: number;
  /** Default node height (default: 60) */
  nodeHeight?: number;
  /** Node width for clearance calculations (default: 120) */
  nodeWidth?: number;
  /** Minimum horizontal clearance gap between nodes (default: 40) */
  horizontalGap?: number;
  /** Minimum vertical clearance gap between nodes (default: 40) */
  verticalGap?: number;
  /** Previously allocated bridge positions or existing positions map */
  allocatedPositions?: Record<string, { x: number; y: number }>;
  /** Optional transient LayoutGraphIndex for fast infrastructure lookups */
  index?: LayoutGraphIndex;
}

/**
 * Internal module-level registry of allocated bridge positions within a layout run.
 */
const activeBridgeAllocations = new Map<string, { x: number; y: number }>();

/**
 * Resets the active bridge allocations registry (called at the start of centrality analysis).
 */
export function clearBridgeAllocations(): void {
  activeBridgeAllocations.clear();
}

/**
 * Calculates hub metrics and classification for a single node.
 */
export function computeNodeHubMetrics(
  fanIn: number,
  fanOut: number,
  avgDomainDegree: number = 2.0,
  threshold: number = 3.5
): { hubScore: number; isHub: boolean; hubType: HubType } {
  const totalDegree = fanIn + fanOut;
  if (totalDegree === 0) {
    return { hubScore: 0, isHub: false, hubType: 'none' };
  }

  const balanceFactor = 1 - Math.abs(fanIn - fanOut) / Math.max(1, totalDegree);
  const relativeDomainDegree = totalDegree / Math.max(1, avgDomainDegree);

  const hubScore = Math.round((totalDegree * 0.7 + balanceFactor * 0.5 + relativeDomainDegree * 1.0) * 100) / 100;

  const isHub = hubScore >= threshold || totalDegree >= 4;

  let hubType: HubType = 'none';
  if (isHub) {
    if (fanIn > 2 * fanOut) {
      hubType = 'fan-in';
    } else if (fanOut > 2 * fanIn) {
      hubType = 'fan-out';
    } else {
      hubType = 'balanced';
    }
  }

  return { hubScore, isHub, hubType };
}

/**
 * Calculates cross-domain bridge metrics and relationship strengths for a node.
 */
export function computeNodeBridgeAnalysis(
  nodeId: string,
  nodeDomain: string | null,
  _nodeLayer: ArchitectureLayer | null,
  edges: ExplorerEdge[],
  domainMap: Map<string, string>,
  layerMap: Map<string, ArchitectureLayer>,
  index?: LayoutGraphIndex
): {
  isBridge: boolean;
  bridgeScore: number;
  connectedDomains: string[];
  connectedLayers: ArchitectureLayer[];
  domainRelationshipStrength: Record<string, number>;
} {
  const domainEdgeCounts = new Map<string, number>();
  const connectedLayerSet = new Set<ArchitectureLayer>();

  const ownDomain = nodeDomain || domainMap.get(nodeId);

  const nodeEdges = index
    ? index.incidentEdgesByNode.get(nodeId) || []
    : edges.filter(e => e.source === nodeId || e.target === nodeId);

  for (const edge of nodeEdges) {
    const otherId = edge.source === nodeId ? edge.target : edge.source;
    const neighborDomain = domainMap.get(otherId);
    const neighborLayer = layerMap.get(otherId);

    if (neighborLayer) {
      connectedLayerSet.add(neighborLayer);
    }

    if (neighborDomain && neighborDomain !== 'Shared' && neighborDomain !== ownDomain) {
      domainEdgeCounts.set(
        neighborDomain,
        (domainEdgeCounts.get(neighborDomain) || 0) + 1
      );
    }
  }

  const connectedDomains = Array.from(domainEdgeCounts.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  const domainRelationshipStrength: Record<string, number> = {};
  let totalCrossDomainEdges = 0;

  for (const domain of connectedDomains) {
    const count = domainEdgeCounts.get(domain) || 0;
    domainRelationshipStrength[domain] = count;
    totalCrossDomainEdges += count;
  }

  const allInvolvedDomains = new Set<string>(connectedDomains);
  if (ownDomain && ownDomain !== 'Shared') {
    allInvolvedDomains.add(ownDomain);
  }

  const layerOrder: Record<ArchitectureLayer, number> = {
    presentation: 0,
    application: 1,
    domain: 2,
    schema: 3,
  };
  const connectedLayers = Array.from(connectedLayerSet).sort(
    (a, b) => layerOrder[a] - layerOrder[b]
  );

  const distinctDomainsCount = allInvolvedDomains.size;
  const isBridge = distinctDomainsCount >= 2;
  const bridgeScore = isBridge ? distinctDomainsCount * 10 + totalCrossDomainEdges : 0;

  return {
    isBridge,
    bridgeScore,
    connectedDomains,
    connectedLayers,
    domainRelationshipStrength,
  };
}

/**
 * Computes complete spatial centrality analysis across all nodes in a graph.
 */
export function computeGraphCentralityAnalysis(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  domainMap: Map<string, string>,
  layerMap: Map<string, ArchitectureLayer>,
  options: CentralityOptions = {}
): Map<string, NodeCentralityAnalysis> {
  clearBridgeAllocations();

  const hubThreshold = options.hubScoreThreshold ?? 3.5;
  const index = options.index;

  const domainDegreeSum = new Map<string, number>();
  const domainNodeCount = new Map<string, number>();

  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();

  nodes.forEach(n => {
    fanInMap.set(n.id, 0);
    fanOutMap.set(n.id, 0);
  });

  edges.forEach(e => {
    if (fanOutMap.has(e.source)) fanOutMap.set(e.source, (fanOutMap.get(e.source) || 0) + 1);
    if (fanInMap.has(e.target)) fanInMap.set(e.target, (fanInMap.get(e.target) || 0) + 1);
  });

  nodes.forEach(n => {
    const domain = domainMap.get(n.id) || 'Shared';
    const degree = (fanInMap.get(n.id) || 0) + (fanOutMap.get(n.id) || 0);
    domainDegreeSum.set(domain, (domainDegreeSum.get(domain) || 0) + degree);
    domainNodeCount.set(domain, (domainNodeCount.get(domain) || 0) + 1);
  });

  const resultMap = new Map<string, NodeCentralityAnalysis>();

  const sortedNodeIds = nodes.map(n => n.id).sort((a, b) => a.localeCompare(b));

  for (const nodeId of sortedNodeIds) {
    const fanIn = fanInMap.get(nodeId) || 0;
    const fanOut = fanOutMap.get(nodeId) || 0;
    const domain = domainMap.get(nodeId) || 'Shared';
    const layer = layerMap.get(nodeId) || null;

    const avgDomainDegree =
      (domainNodeCount.get(domain) || 0) > 0
        ? (domainDegreeSum.get(domain) || 0) / domainNodeCount.get(domain)!
        : 2.0;

    const { hubScore, isHub, hubType } = computeNodeHubMetrics(
      fanIn,
      fanOut,
      avgDomainDegree,
      hubThreshold
    );

    const {
      isBridge,
      bridgeScore,
      connectedDomains,
      connectedLayers,
      domainRelationshipStrength,
    } = computeNodeBridgeAnalysis(nodeId, domain, layer, edges, domainMap, layerMap, index);

    let spatialRole: NodeSpatialRole = 'standard';
    if (isHub && isBridge) {
      spatialRole = 'hub-and-bridge';
    } else if (isHub) {
      spatialRole = 'hub-only';
    } else if (isBridge) {
      spatialRole = 'bridge-only';
    }

    resultMap.set(nodeId, {
      nodeId,
      isHub,
      hubScore,
      hubType,
      isBridge,
      bridgeScore,
      connectedDomains,
      connectedLayers,
      domainRelationshipStrength,
      spatialRole,
    });
  }

  return resultMap;
}

/**
 * Calculates a relationship-aware candidate placement position for a cross-domain bridge node.
 */
export function calculateBridgeCandidatePosition(
  nodeId: string,
  nodeLayer: ArchitectureLayer | null,
  connectedDomains: string[],
  domainXCenters: Record<string, number>,
  domainBounds: Record<string, { minX: number; maxX: number }>,
  neighborPositions: Record<string, { x: number; y: number }>,
  options: CentralityOptions = {}
): BridgePlacementInfo {
  const layerSpacing = options.layerSpacing ?? 250;
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;

  const minDx = nodeWidth + horizontalGap;
  const minDy = nodeHeight + verticalGap;

  const layerYOffsets = options.layerYOffsets ?? {
    presentation: 100,
    application: 100 + layerSpacing,
    domain: 100 + 2 * layerSpacing,
    schema: 100 + 3 * layerSpacing,
  };

  const layer = nodeLayer || 'application';
  const baseY = layerYOffsets[layer];

  const connectedDomainCenters: Record<string, { x: number; y: number }> = {};
  const connectedNodePositions: Record<string, { x: number; y: number }> = {};
  const connectedLayersSet = new Set<ArchitectureLayer>();

  let sumX = 0;
  let domainCount = 0;

  const sortedConnectedDomains = [...connectedDomains].sort((a, b) => a.localeCompare(b));

  for (const domain of sortedConnectedDomains) {
    if (domainXCenters[domain] !== undefined) {
      const x = domainXCenters[domain];
      connectedDomainCenters[domain] = { x, y: baseY };
      sumX += x;
      domainCount++;
    }
  }

  const neighborKeys = Object.keys(neighborPositions).sort((a, b) => a.localeCompare(b));
  let neighborSumX = 0;
  let neighborSumY = 0;
  let neighborCount = 0;

  for (const key of neighborKeys) {
    const pos = neighborPositions[key];
    if (pos) {
      connectedNodePositions[key] = { ...pos };
      neighborSumX += pos.x;
      neighborSumY += pos.y;
      neighborCount++;
    }
  }

  let candidateX = 0;
  let candidateY = baseY;

  if (neighborCount > 0) {
    candidateX = neighborSumX / neighborCount;
    candidateY = neighborSumY / neighborCount;
  } else if (domainCount > 0) {
    candidateX = sumX / domainCount;
    candidateY = baseY;
  }

  let hasIntermediateTrap = false;
  let trapDomainId: string | undefined = undefined;

  const connectedDomainSet = new Set(sortedConnectedDomains);
  const allDomainIds = Object.keys(domainBounds).sort((a, b) => a.localeCompare(b));

  for (const domainId of allDomainIds) {
    if (connectedDomainSet.has(domainId) || domainId === 'Shared') continue;

    const bounds = domainBounds[domainId];
    if (!bounds) continue;

    const margin = nodeWidth * 0.5;
    if (candidateX >= bounds.minX - margin && candidateX <= bounds.maxX + margin) {
      hasIntermediateTrap = true;
      trapDomainId = domainId;
      break;
    }
  }

  if (hasIntermediateTrap || sortedConnectedDomains.length >= 2) {
    const layerOrder: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];
    const layerIdx = layerOrder.indexOf(layer);
    let corridorGap = layerSpacing;

    if (layerIdx > 0) {
      const prevLayer = layerOrder[layerIdx - 1];
      const prevY = layerYOffsets[prevLayer];
      if (prevY !== undefined && prevY < baseY) {
        corridorGap = baseY - prevY;
      }
    } else if (layerIdx < layerOrder.length - 1) {
      const nextLayer = layerOrder[layerIdx + 1];
      const nextY = layerYOffsets[nextLayer];
      if (nextY !== undefined && nextY > baseY) {
        corridorGap = nextY - baseY;
      }
    }

    const minClearance = nodeHeight * 0.5 + verticalGap * 0.5;
    const geometryDisplacement = Math.max(minClearance, corridorGap * 0.5);

    candidateY = baseY - geometryDisplacement;
  }

  const existingPositions: Record<string, { x: number; y: number }> = {
    ...neighborPositions,
    ...Object.fromEntries(activeBridgeAllocations.entries()),
    ...(options.allocatedPositions || {}),
  };

  let finalX = candidateX;
  let finalY = candidateY;
  let shiftIndex = 0;

  while (true) {
    let collides = false;
    for (const [otherId, otherPos] of Object.entries(existingPositions)) {
      if (otherId === nodeId) continue;
      if (
        Math.abs(otherPos.x - finalX) < minDx - 1e-3 &&
        Math.abs(otherPos.y - finalY) < minDy - 1e-3
      ) {
        collides = true;
        break;
      }
    }

    if (!collides) break;

    shiftIndex++;
    const dir = shiftIndex % 2 === 1 ? -1 : 1;
    const step = Math.ceil(shiftIndex / 2);
    finalX = candidateX + dir * step * minDx;
  }

  const finalPos = {
    x: Math.round(finalX * 100) / 100,
    y: Math.round(finalY * 100) / 100,
  };

  activeBridgeAllocations.set(nodeId, finalPos);

  return {
    nodeId,
    bridgeScore: sortedConnectedDomains.length * 10,
    connectedDomains: sortedConnectedDomains,
    connectedDomainCenters,
    connectedNodePositions,
    connectedLayers: Array.from(connectedLayersSet),
    candidatePosition: finalPos,
    hasIntermediateTrap,
    trapDomainId,
  };
}

/**
 * Calculates a local spatial placement position for a high-centrality hub node
 * inside its primary domain region.
 */
export function calculateHubCandidatePosition(
  nodeId: string,
  hubScore: number,
  hubType: HubType,
  primaryDomain: string | null,
  layer: ArchitectureLayer | null,
  domainXCenter: number,
  baseYOffset: number
): HubPlacementInfo {
  const x = domainXCenter;
  let y = baseYOffset;

  if (hubType === 'fan-in') {
    y += 20;
  } else if (hubType === 'fan-out') {
    y -= 20;
  }

  return {
    nodeId,
    hubScore,
    hubType,
    primaryDomain,
    layer,
    candidateLocalPosition: {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    },
  };
}

/**
 * Conceptual 5-category spatial classification for Hybrid Layout Workstream B3.
 */
export type ConceptualNodeCategory =
  | 'feature-local'
  | 'multi-feature'
  | 'shared-infrastructure'
  | 'bridge'
  | 'satellite';

/**
 * Classifies a node into one of the 5 Workstream B3 conceptual categories:
 * 1. satellite: secondary node (test, field, trigger/handler)
 * 2. shared-infrastructure: high fan-in node or node in 'Shared' domain/feature
 * 3. bridge: node connecting multiple distinct features/domains
 * 4. multi-feature: node connected to 2+ features without full bridge status
 * 5. feature-local: node strongly tied to a single feature region
 */
export function classifyNodeConceptualCategory(
  nodeId: string,
  node: ExplorerNode,
  centrality: NodeCentralityAnalysis,
  domainOrFeature: string | null,
  connectedRegions: string[],
  isSharedOrUnassigned?: boolean
): ConceptualNodeCategory {
  const name = node.displayName || node.id;
  const isTest =
    node.behavior?.isTest ||
    /(?:test|tests|testdatafactory)$/i.test(name) ||
    (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file));
  const isField = node.type === 'Field' || node.type === 'CustomField';
  const isTrigger = node.type === 'ApexTrigger' || /(?:trigger|triggers)$/i.test(name);
  const isHandler = /(?:handler|handlers)$/i.test(name) && !isTest;

  if (isTest || isField || isTrigger || isHandler) {
    return 'satellite';
  }

  if (
    isSharedOrUnassigned ||
    domainOrFeature === 'Shared' ||
    domainOrFeature === 'Unassigned'
  ) {
    return 'shared-infrastructure';
  }

  if (centrality.isBridge || connectedRegions.length >= 2) {
    return 'bridge';
  }

  if (connectedRegions.length === 1) {
    return 'multi-feature';
  }

  return 'feature-local';
}

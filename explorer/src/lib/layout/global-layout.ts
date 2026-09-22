import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { LayoutGraphIndex } from './graph-index';
import type { ArchitectureLayer, ArchitectureGraphAnalysis } from './types';
import { classifyNodeLayer } from './layers';
import { discoverDomains, classifyNodeDomain, type DomainDiscoveryResult } from './domains';
import { discoverFeatures, type FeatureDiscoveryResult } from './features';
import { determineGlobalFeatureOrder, type FeatureOrderingStrategy } from './feature-ordering';
import { computeArchitectureAnalysis } from './analysis';
import { calculateLayoutMetrics, type ComprehensiveLayoutMetrics, type PositionMap } from './metrics';

export interface DomainRelationship {
  sourceDomain: string;
  targetDomain: string;
  edgeCount: number;
  reverseEdgeCount: number;
  totalEdgeCount: number;
  strength: number;
  isBidirectional: boolean;
  layerSpan: ArchitectureLayer[];
}

export interface DomainNode {
  domain: string;
  nodeCount: number;
  primaryNodeCount: number;
  layers: ArchitectureLayer[];
  primaryLayer: ArchitectureLayer;
  nodeIds: string[];
  primaryNodeIds: string[];
  connectedDomains: string[];
  degree: number;
  isShared: boolean;
  primaryDomain?: string;
}

export interface FeatureRegion extends DomainRegion {
  featureId: string;
  domainId?: string;
}

export interface GlobalFeatureLayoutOptions extends GlobalLayoutOptions {
  featureDiscovery?: FeatureDiscoveryResult;
  featureMap?: Map<string, string> | Record<string, string>;
  featureOrderingStrategy?: FeatureOrderingStrategy;
}

export interface GlobalFeatureLayoutResult extends GlobalLayoutResult {
  featureRegions: Map<string, FeatureRegion>;
  featureGraph: DomainGraph;
  orderedFeatures: string[];
}

export interface DomainGraph {
  nodes: Map<string, DomainNode>;
  nodeList: DomainNode[];
  edges: DomainRelationship[];
  adjacency: Map<string, Map<string, DomainRelationship>>;
}

export interface DomainRegion {
  domain: string;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  nodeCount: number;
  primaryNodeCount?: number;
  primaryLayer: ArchitectureLayer;
  orderIndex: number;
}

export interface GlobalLayoutOptions {
  /** Horizontal spacing center-to-center offset between adjacent domain regions (default: 380) */
  domainSpacing?: number;
  /** Vertical spacing between layer Y coordinates (default: 250) */
  layerSpacing?: number;
  /** Base X origin coordinate (default: 100) */
  baseX?: number;
  /** Base Y origin coordinate (default: 100) */
  baseY?: number;
  /** Node width for region bounds calculation (default: 120) */
  nodeWidth?: number;
  /** Node height for region bounds calculation (default: 60) */
  nodeHeight?: number;
  /** Minimum region width for spatial containers (default: 160) */
  minRegionWidth?: number;
  /** Optional pre-computed architecture analysis model to reuse */
  analysis?: ArchitectureGraphAnalysis;
  /** Optional pre-computed domain discovery result to reuse */
  domainDiscovery?: DomainDiscoveryResult;
  /** Optional pre-computed layer map to reuse */
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  /** Optional pre-computed domain map to reuse */
  domainMap?: Map<string, string> | Record<string, string>;
  /** Optional pre-computed ordered domains/features */
  orderedDomains?: string[];
  /** Optional transient LayoutGraphIndex for fast infrastructure lookups */
  index?: LayoutGraphIndex;
}

export interface GlobalLayoutResult {
  domainGraph: DomainGraph;
  domainRegions: Map<string, DomainRegion>;
  nodeRegions: Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>;
  orderedDomains: string[];
  metrics: ComprehensiveLayoutMetrics | null;
  layerYMap: Record<ArchitectureLayer, number>;
  layerRowCounts: Record<ArchitectureLayer, number>;
  layerHeights: Record<ArchitectureLayer, number>;
}

export const LAYER_Y_MAP: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

const LAYER_PRIORITY: Record<ArchitectureLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

const LAYERS_IN_ORDER: ArchitectureLayer[] = [
  'presentation',
  'application',
  'domain',
  'schema',
];

function isFieldNode(node: ExplorerNode): boolean {
  return node.type === 'Field' || node.type === 'CustomField';
}

function isPrimaryNode(node: ExplorerNode): boolean {
  const isTest =
    node.behavior?.isTest ||
    (typeof node.file === 'string' &&
      /(?:^|\/)(?:test|tests)\//i.test(node.file)) ||
    /(?:test|tests|testdatafactory)$/i.test(
      node.displayName || node.id || ''
    );

  const isField = isFieldNode(node);

  return !isTest && !isField;
}

/**
 * Calculates primary production node row requirements per architectural layer
 * across all domains.
 */
export function calculatePrimaryLayerRowCounts(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options?: {
    layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
    domainMap?: Map<string, string> | Record<string, string>;
    analysis?: ArchitectureGraphAnalysis;
    index?: LayoutGraphIndex;
  }
): Record<
  ArchitectureLayer,
  {
    maxRows: number;
    domainRows: Record<string, number>;
    primaryCount: number;
  }
> {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const analysis =
    options?.analysis ||
    computeArchitectureAnalysis(safeNodes, safeEdges, options);

  const layerMap = new Map<string, ArchitectureLayer>();

  if (options?.layerMap instanceof Map) {
    options.layerMap.forEach((v, k) => layerMap.set(k, v));
  } else if (options?.layerMap) {
    Object.entries(options.layerMap).forEach(([k, v]) =>
      layerMap.set(k, v)
    );
  }

  const domainMap = new Map<string, string>();

  if (options?.domainMap instanceof Map) {
    options.domainMap.forEach((v, k) => domainMap.set(k, v));
  } else if (options?.domainMap) {
    Object.entries(options.domainMap).forEach(([k, v]) =>
      domainMap.set(k, v)
    );
  }

  const primaryNodes = safeNodes.filter(isPrimaryNode);

  const bucketNodesMap = new Map<string, string[]>();

  primaryNodes.forEach(node => {
    const layer =
      layerMap.get(node.id) ||
      analysis.nodes.get(node.id)?.layer ||
      classifyNodeLayer(node);

    const domain =
      domainMap.get(node.id) ||
      analysis.nodes.get(node.id)?.domain ||
      classifyNodeDomain(node, safeNodes, safeEdges);

    const key = `${layer}:${domain}`;

    if (!bucketNodesMap.has(key)) {
      bucketNodesMap.set(key, []);
    }

    bucketNodesMap.get(key)!.push(node.id);
  });

  const primaryNodeSet = new Set(primaryNodes.map(n => n.id));

  const intraBucketAdj = new Map<string, Set<string>>();
  const intraBucketInDegree = new Map<string, number>();
  const intraBucketOutDegree = new Map<string, number>();

  primaryNodes.forEach(n => {
    intraBucketAdj.set(n.id, new Set());
    intraBucketInDegree.set(n.id, 0);
    intraBucketOutDegree.set(n.id, 0);
  });

  safeEdges.forEach(e => {
    if (
      primaryNodeSet.has(e.source) &&
      primaryNodeSet.has(e.target) &&
      e.source !== e.target
    ) {
      intraBucketAdj.get(e.source)?.add(e.target);

      intraBucketOutDegree.set(
        e.source,
        (intraBucketOutDegree.get(e.source) || 0) + 1
      );

      intraBucketInDegree.set(
        e.target,
        (intraBucketInDegree.get(e.target) || 0) + 1
      );
    }
  });

  const result: Record<
    ArchitectureLayer,
    {
      maxRows: number;
      domainRows: Record<string, number>;
      primaryCount: number;
    }
  > = {
    presentation: {
      maxRows: 0,
      domainRows: {},
      primaryCount: 0,
    },
    application: {
      maxRows: 0,
      domainRows: {},
      primaryCount: 0,
    },
    domain: {
      maxRows: 0,
      domainRows: {},
      primaryCount: 0,
    },
    schema: {
      maxRows: 0,
      domainRows: {},
      primaryCount: 0,
    },
  };

  LAYERS_IN_ORDER.forEach(layer => {
    bucketNodesMap.forEach((nodeIds, bucketKey) => {
      const [bLayer, bDomain] = bucketKey.split(':');

      if (bLayer !== layer || nodeIds.length === 0) {
        return;
      }

      result[layer].primaryCount += nodeIds.length;

      const tier0: string[] = [];
      const tier1: string[] = [];
      const tier2: string[] = [];

      if (nodeIds.length <= 2) {
        if (nodeIds.length === 2) {
          const [n1, n2] = nodeIds;

          const n1ToN2 = intraBucketAdj.get(n1)?.has(n2);
          const n2ToN1 = intraBucketAdj.get(n2)?.has(n1);

          if (n1ToN2 && !n2ToN1) {
            tier0.push(n1);
            tier2.push(n2);
          } else if (n2ToN1 && !n1ToN2) {
            tier0.push(n2);
            tier1.push(n1);
          } else {
            tier1.push(n1, n2);
          }
        } else {
          tier1.push(...nodeIds);
        }
      } else {
        nodeIds.forEach(id => {
          const inDeg = intraBucketInDegree.get(id) || 0;
          const outDeg = intraBucketOutDegree.get(id) || 0;

          if (outDeg > 0 && inDeg === 0) {
            tier0.push(id);
          } else if (inDeg > 0 && outDeg === 0) {
            tier2.push(id);
          } else if (outDeg > inDeg) {
            tier0.push(id);
          } else if (inDeg > outDeg) {
            tier2.push(id);
          } else {
            tier1.push(id);
          }
        });
      }

      const tiers = [tier0, tier1, tier2].filter(
        t => t.length > 0
      );

      if (tiers.length === 0) {
        tiers.push(nodeIds);
      }

      const MAX_COLS = 4;

      let domainRowCount = 0;

      tiers.forEach(tNodes => {
        domainRowCount += Math.ceil(
          tNodes.length / MAX_COLS
        );
      });

      result[layer].domainRows[bDomain] = domainRowCount;

      if (
        domainRowCount >
        result[layer].maxRows
      ) {
        result[layer].maxRows = domainRowCount;
      }
    });
  });

  return result;
}

export interface DynamicLayerYResult {
  layerYMap: Record<ArchitectureLayer, number>;
  layerRowCounts: Record<ArchitectureLayer, number>;
  layerHeights: Record<ArchitectureLayer, number>;
}

/**
 * Computes deterministic dynamic architectural layer Y coordinates
 * based on primary-node geometry.
 */
export function computeDynamicLayerYMap(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalLayoutOptions = {}
): DynamicLayerYResult {
  const nodeHeight = options.nodeHeight ?? 60;
  const verticalGap = 40;

  const interLayerGap =
    options.layerSpacing !== undefined &&
    options.layerSpacing !== 250
      ? options.layerSpacing
      : nodeHeight + verticalGap;

  const baseY = options.baseY ?? 100;

  const rowCounts = calculatePrimaryLayerRowCounts(
    nodes,
    edges,
    options
  );

  const layerYMap: Record<ArchitectureLayer, number> = {
    presentation: baseY,
    application: baseY,
    domain: baseY,
    schema: baseY,
  };

  const layerRowCounts: Record<ArchitectureLayer, number> = {
    presentation: 0,
    application: 0,
    domain: 0,
    schema: 0,
  };

  const layerHeights: Record<ArchitectureLayer, number> = {
    presentation: 0,
    application: 0,
    domain: 0,
    schema: 0,
  };

  let currentY = baseY;

  LAYERS_IN_ORDER.forEach(layer => {
    const maxRows = rowCounts[layer].maxRows;

    layerRowCounts[layer] = maxRows;

    const height =
      maxRows > 0
        ? maxRows * nodeHeight +
          (maxRows - 1) * verticalGap
        : 0;

    layerHeights[layer] = height;
    layerYMap[layer] = currentY;

    if (maxRows > 0) {
      currentY += height + interLayerGap;
    }
  });

  return {
    layerYMap,
    layerRowCounts,
    layerHeights,
  };
}

/**
 * Builds a deterministic Domain Graph from Explorer nodes and edges.
 */
export function buildDomainGraph(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  domainResult?: DomainDiscoveryResult,
  index?: LayoutGraphIndex,
  domainMapInput?: Map<string, string> | Record<string, string>
): DomainGraph {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const discovery = domainResult || discoverDomains(safeNodes, safeEdges);

  const domainNodeMap = new Map<string, DomainNode>();
  const nodeToDomainMap = new Map<string, string>();

  if (domainMapInput instanceof Map) {
    domainMapInput.forEach((v, k) => nodeToDomainMap.set(k, v));
  } else if (domainMapInput) {
    Object.entries(domainMapInput).forEach(([k, v]) => nodeToDomainMap.set(k, v));
  }

  discovery.assignments.forEach((assignment, nodeId) => {
    if (!nodeToDomainMap.has(nodeId)) {
      nodeToDomainMap.set(nodeId, assignment.primaryDomain);
    }
  });

  safeNodes.forEach(node => {
    const domain = nodeToDomainMap.get(node.id) || 'Shared';
    const layer = classifyNodeLayer(node);

    if (!domainNodeMap.has(domain)) {
      domainNodeMap.set(domain, {
        domain,
        nodeCount: 0,
        primaryNodeCount: 0,
        layers: [],
        primaryLayer: 'application',
        nodeIds: [],
        primaryNodeIds: [],
        connectedDomains: [],
        degree: 0,
        isShared: domain === 'Shared',
      });
    }

    const dNode = domainNodeMap.get(domain)!;
    dNode.nodeCount++;
    dNode.nodeIds.push(node.id);
    if (isPrimaryNode(node)) {
      dNode.primaryNodeCount++;
      dNode.primaryNodeIds.push(node.id);
    }
    if (!dNode.layers.includes(layer)) {
      dNode.layers.push(layer);
    }
    if (!dNode.primaryDomain) {
      const assignment = discovery.assignments.get(node.id);
      if (assignment) {
        dNode.primaryDomain = assignment.primaryDomain;
      }
    }
  });

  domainNodeMap.forEach(dNode => {
    dNode.nodeIds.sort((a, b) => a.localeCompare(b));
    dNode.primaryNodeIds.sort((a, b) => a.localeCompare(b));
    dNode.layers.sort((a, b) => LAYER_PRIORITY[a] - LAYER_PRIORITY[b]);

    const layerCounts: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };

    const targetNodeIds = dNode.primaryNodeIds.length > 0 ? dNode.primaryNodeIds : dNode.nodeIds;

    targetNodeIds.forEach(nodeId => {
      const node = index ? index.nodeById.get(nodeId) : safeNodes.find(n => n.id === nodeId);
      if (node) {
        const layer = classifyNodeLayer(node);
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      }
    });

    let bestLayer: ArchitectureLayer = 'application';
    let maxCount = -1;

    (Object.keys(layerCounts) as ArchitectureLayer[]).forEach(l => {
      if (layerCounts[l] > maxCount) {
        maxCount = layerCounts[l];
        bestLayer = l;
      } else if (layerCounts[l] === maxCount && maxCount > 0) {
        if (LAYER_PRIORITY[l] < LAYER_PRIORITY[bestLayer]) {
          bestLayer = l;
        }
      }
    });

    dNode.primaryLayer = bestLayer;
  });

  const relationshipCounts = new Map<string, {
    source: string;
    target: string;
    forward: number;
    backward: number;
    layers: Set<ArchitectureLayer>;
  }>();

  safeEdges.forEach(edge => {
    const srcDomain = nodeToDomainMap.get(edge.source) || 'Shared';
    const tgtDomain = nodeToDomainMap.get(edge.target) || 'Shared';

    if (srcDomain === tgtDomain) return;

    const [d1, d2] = [srcDomain, tgtDomain].sort((a, b) => a.localeCompare(b));
    const pairKey = `${d1}<->${d2}`;

    if (!relationshipCounts.has(pairKey)) {
      relationshipCounts.set(pairKey, {
        source: d1,
        target: d2,
        forward: 0,
        backward: 0,
        layers: new Set<ArchitectureLayer>(),
      });
    }

    const rel = relationshipCounts.get(pairKey)!;
    if (srcDomain === d1) {
      rel.forward++;
    } else {
      rel.backward++;
    }

    const srcNode = index ? index.nodeById.get(edge.source) : safeNodes.find(n => n.id === edge.source);
    const tgtNode = index ? index.nodeById.get(edge.target) : safeNodes.find(n => n.id === edge.target);
    if (srcNode) rel.layers.add(classifyNodeLayer(srcNode));
    if (tgtNode) rel.layers.add(classifyNodeLayer(tgtNode));
  });

  const domainRelationships: DomainRelationship[] = [];
  const adjacency = new Map<string, Map<string, DomainRelationship>>();

  domainNodeMap.forEach((_, domain) => {
    adjacency.set(domain, new Map());
  });

  let maxCrossEdges = 1;
  relationshipCounts.forEach(rel => {
    const tot = rel.forward + rel.backward;
    if (tot > maxCrossEdges) maxCrossEdges = tot;
  });

  const sortedPairKeys = Array.from(relationshipCounts.keys()).sort((a, b) => a.localeCompare(b));

  sortedPairKeys.forEach(pairKey => {
    const rel = relationshipCounts.get(pairKey)!;
    const totalEdgeCount = rel.forward + rel.backward;
    const strength = totalEdgeCount / maxCrossEdges;
    const isBidirectional = rel.forward > 0 && rel.backward > 0;
    const layerSpan = Array.from(rel.layers).sort((a, b) => LAYER_PRIORITY[a] - LAYER_PRIORITY[b]);

    if (rel.forward > 0 || rel.backward > 0) {
      const relationship: DomainRelationship = {
        sourceDomain: rel.source,
        targetDomain: rel.target,
        edgeCount: rel.forward,
        reverseEdgeCount: rel.backward,
        totalEdgeCount,
        strength,
        isBidirectional,
        layerSpan,
      };

      domainRelationships.push(relationship);

      if (adjacency.has(rel.source)) {
        adjacency.get(rel.source)!.set(rel.target, relationship);
      }
      if (adjacency.has(rel.target)) {
        adjacency.get(rel.target)!.set(rel.source, relationship);
      }

      const d1Node = domainNodeMap.get(rel.source);
      const d2Node = domainNodeMap.get(rel.target);

      if (d1Node) {
        if (!d1Node.connectedDomains.includes(rel.target)) {
          d1Node.connectedDomains.push(rel.target);
        }
        d1Node.degree += totalEdgeCount;
      }
      if (d2Node) {
        if (!d2Node.connectedDomains.includes(rel.source)) {
          d2Node.connectedDomains.push(rel.source);
        }
        d2Node.degree += totalEdgeCount;
      }
    }
  });

  domainNodeMap.forEach(dNode => {
    dNode.connectedDomains.sort((a, b) => a.localeCompare(b));
  });

  const nodeList = Array.from(domainNodeMap.values()).sort((a, b) => {
    if (a.isShared) return -1;
    if (b.isShared) return 1;
    return a.domain.localeCompare(b.domain);
  });

  return {
    nodes: domainNodeMap,
    nodeList,
    edges: domainRelationships,
    adjacency,
  };
}

/**
 * Computes deterministic global domain spatial ordering based on domain dependency graph.
 */
export function determineGlobalDomainOrder(domainGraph: DomainGraph): string[] {
  const domains = Array.from(domainGraph.nodes.keys());
  if (domains.length <= 1) return domains;

  const nonSharedDomains = domains.filter(d => d !== 'Shared');
  const hasShared = domains.includes('Shared');

  if (nonSharedDomains.length === 0) return ['Shared'];

  const flowScores = new Map<string, {
    outDegree: number;
    inDegree: number;
    netFlow: number;
    connectedCount: number;
    totalEdges: number;
  }>();

  nonSharedDomains.forEach(d => {
    flowScores.set(d, {
      outDegree: 0,
      inDegree: 0,
      netFlow: 0,
      connectedCount: 0,
      totalEdges: 0,
    });
  });

  domainGraph.edges.forEach(rel => {
    if (rel.sourceDomain !== 'Shared' && rel.targetDomain !== 'Shared') {
      const srcStats = flowScores.get(rel.sourceDomain);
      const tgtStats = flowScores.get(rel.targetDomain);

      if (srcStats) {
        srcStats.outDegree += rel.edgeCount;
        srcStats.inDegree += rel.reverseEdgeCount;
        srcStats.totalEdges += rel.totalEdgeCount;
        srcStats.connectedCount++;
      }
      if (tgtStats) {
        tgtStats.outDegree += rel.reverseEdgeCount;
        tgtStats.inDegree += rel.edgeCount;
        tgtStats.totalEdges += rel.totalEdgeCount;
        tgtStats.connectedCount++;
      }
    }
  });

  nonSharedDomains.forEach(d => {
    const stats = flowScores.get(d)!;
    stats.netFlow = stats.outDegree - stats.inDegree;
  });

  const visited = new Set<string>();
  const domainComponents: string[][] = [];

  const sortedNonShared = [...nonSharedDomains].sort((a, b) => a.localeCompare(b));

  for (const startDomain of sortedNonShared) {
    if (visited.has(startDomain)) continue;

    const comp: string[] = [];
    const queue = [startDomain];
    visited.add(startDomain);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      comp.push(curr);

      const neighbors = domainGraph.nodes.get(curr)?.connectedDomains || [];
      neighbors.forEach(n => {
        if (n !== 'Shared' && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      });
    }

    comp.sort((a, b) => a.localeCompare(b));
    domainComponents.push(comp);
  }

  domainComponents.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return (a[0] || '').localeCompare(b[0] || '');
  });

  const orderedBusinessDomains: string[] = [];

  for (const comp of domainComponents) {
    if (comp.length === 1) {
      orderedBusinessDomains.push(comp[0]);
      continue;
    }

    const stemParentMap = new Map<string, string>();
    comp.forEach(d => {
      comp.forEach(parentCand => {
        if (d !== parentCand && d.length > parentCand.length && d.startsWith(parentCand)) {
          const suffix = d.slice(parentCand.length);
          if (/^(?:Header|Portal|Trigger|Bridge|Ext|Extension|Service|Controller|Manager)$/i.test(suffix)) {
            stemParentMap.set(d, parentCand);
          }
        }
      });
    });

    let starHub: string | null = null;
    let maxHubConn = 0;

    comp.forEach(d => {
      const stats = flowScores.get(d);
      if (stats && stats.connectedCount >= 3 && stats.connectedCount > maxHubConn) {
        maxHubConn = stats.connectedCount;
        starHub = d;
      }
    });

    if (starHub) {
      const hub = starHub as string;
      const hubNeighbors = (domainGraph.nodes.get(hub)?.connectedDomains || []).filter(
        n => n !== 'Shared' && comp.includes(n)
      );

      const pureLeaves = hubNeighbors.filter(n => {
        const stats = flowScores.get(n);
        return stats && stats.connectedCount === 1;
      });

      if (pureLeaves.length >= 3 && pureLeaves.length >= hubNeighbors.length - 1) {
        pureLeaves.sort((a, b) => a.localeCompare(b));
        const nonLeaves = comp.filter(d => d !== hub && !pureLeaves.includes(d));
        nonLeaves.sort((a, b) => a.localeCompare(b));

        const leftLeaves = pureLeaves.slice(0, Math.ceil(pureLeaves.length / 2));
        const rightLeaves = pureLeaves.slice(Math.ceil(pureLeaves.length / 2));

        const compStarOrdered = [
          ...nonLeaves,
          ...leftLeaves,
          hub,
          ...rightLeaves,
        ];

        orderedBusinessDomains.push(...compStarOrdered);
        continue;
      }
    }

    let compOrdered = [...comp].sort((a, b) => {
      const statsA = flowScores.get(a)!;
      const statsB = flowScores.get(b)!;

      const parentA = stemParentMap.get(a);
      const parentB = stemParentMap.get(b);
      if (parentA === b) return 1;
      if (parentB === a) return -1;

      if (statsB.netFlow !== statsA.netFlow) {
        return statsB.netFlow - statsA.netFlow;
      }
      if (statsB.totalEdges !== statsA.totalEdges) {
        return statsB.totalEdges - statsA.totalEdges;
      }
      const domA = domainGraph.nodes.get(a)?.primaryDomain || a;
      const domB = domainGraph.nodes.get(b)?.primaryDomain || b;
      if (domA !== domB) return domA.localeCompare(domB);
      return a.localeCompare(b);
    });

    for (let pass = 0; pass < 3; pass++) {
      const posMap = new Map<string, number>();
      compOrdered.forEach((d, idx) => posMap.set(d, idx));

      const barycenters = new Map<string, number>();

      const subDomainsPerParent = new Map<string, string[]>();
      stemParentMap.forEach((parent, subDomain) => {
        if (!subDomainsPerParent.has(parent)) {
          subDomainsPerParent.set(parent, []);
        }
        subDomainsPerParent.get(parent)!.push(subDomain);
      });
      subDomainsPerParent.forEach(subs => subs.sort((a, b) => a.localeCompare(b)));

      compOrdered.forEach(d => {
        const parent = stemParentMap.get(d);
        if (parent && posMap.has(parent)) {
          const siblings = subDomainsPerParent.get(parent) || [d];
          const sibIdx = siblings.indexOf(d);
          barycenters.set(d, (posMap.get(parent) ?? 0) + 0.001 * (sibIdx + 1));
          return;
        }

        const neighbors = (domainGraph.nodes.get(d)?.connectedDomains || []).filter(
          n => n !== 'Shared' && comp.includes(n)
        );
        if (neighbors.length === 0) {
          barycenters.set(d, posMap.get(d) || 0);
        } else {
          let sumPos = 0;
          let weightSum = 0;
          neighbors.forEach(n => {
            const rel = domainGraph.adjacency.get(d)?.get(n);
            const w = rel ? rel.totalEdgeCount : 1;
            const dirBias = rel ? (rel.sourceDomain === d ? -0.05 : 0.05) : 0;
            sumPos += ((posMap.get(n) ?? 0) + dirBias) * w;
            weightSum += w;
          });
          barycenters.set(d, sumPos / weightSum);
        }
      });

      compOrdered.sort((a, b) => {
        const bA = barycenters.get(a) ?? 0;
        const bB = barycenters.get(b) ?? 0;
        if (Math.abs(bA - bB) > 1e-6) {
          return bA - bB;
        }
        const statsA = flowScores.get(a)!;
        const statsB = flowScores.get(b)!;
        if (statsB.netFlow !== statsA.netFlow) {
          return statsB.netFlow - statsA.netFlow;
        }
        return a.localeCompare(b);
      });
    }

    orderedBusinessDomains.push(...compOrdered);
  }

  if (!hasShared) {
    return orderedBusinessDomains;
  }

  const sharedNode = domainGraph.nodes.get('Shared');
  const connectedToShared = (sharedNode?.connectedDomains || []).filter(d => d !== 'Shared');

  if (connectedToShared.length === 0 || orderedBusinessDomains.length <= 1) {
    return [...orderedBusinessDomains, 'Shared'];
  }

  const connectedIndices = connectedToShared
    .map(d => orderedBusinessDomains.indexOf(d))
    .filter(idx => idx !== -1);

  if (connectedIndices.length === 0) {
    return [...orderedBusinessDomains, 'Shared'];
  }

  const avgIndex = connectedIndices.reduce((sum, idx) => sum + idx, 0) / connectedIndices.length;
  const insertIndex = Math.round(avgIndex);

  const finalOrdered: string[] = [];
  orderedBusinessDomains.forEach((d, idx) => {
    if (idx === insertIndex) {
      finalOrdered.push('Shared');
    }
    finalOrdered.push(d);
  });

  if (!finalOrdered.includes('Shared')) {
    finalOrdered.push('Shared');
  }

  return finalOrdered;
}

/**
 * Computes deterministic global domain spatial layout.
 */
export function computeGlobalDomainLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalLayoutOptions = {}
): GlobalLayoutResult {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];
  const index = options.index;

  const baseX = options.baseX ?? 100;
  const baseY = options.baseY ?? 100;
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const domainGraph = buildDomainGraph(safeNodes, safeEdges, options.domainDiscovery, index, options.domainMap);
  const orderedDomains = options.orderedDomains || determineGlobalDomainOrder(domainGraph);

  const dynamicLayerResult = computeDynamicLayerYMap(safeNodes, safeEdges, options);
  const layerYMap = dynamicLayerResult.layerYMap;

  const domainRegions = new Map<string, DomainRegion>();
  const nodeRegions = new Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>();

  // Calculate dimensions and aggregate width for each domain
  let totalWidthSum = 0;
  const domainDimensions = new Map<string, { width: number; height: number; primaryLayer: ArchitectureLayer }>();

  orderedDomains.forEach(domain => {
    const dNode = domainGraph.nodes.get(domain);
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';

    const primaryNodesInDomain = dNode
      ? dNode.primaryNodeIds
          .map(id => (index ? index.nodeById.get(id) : safeNodes.find(n => n.id === id)))
          .filter((n): n is ExplorerNode => n !== undefined)
      : [];

    const layerCounts: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };

    primaryNodesInDomain.forEach(node => {
      const layer = classifyNodeLayer(node);
      layerCounts[layer] = (layerCounts[layer] || 0) + 1;
    });

    const representedLayers = LAYERS_IN_ORDER.filter(l => layerCounts[l] > 0);

    const maxCols = Math.max(
      1,
      ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.min(4, layerCounts[l]) : 0))
    );

    const maxRows = Math.max(
      1,
      ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.ceil(layerCounts[l] / 4) : 0))
    );

    const primaryWidth = maxCols * nodeWidth + Math.max(0, maxCols - 1) * 40;
    const primaryHeight = maxRows * nodeHeight + Math.max(0, maxRows - 1) * 40;

    // Minimum region width for spatial container
    const defaultMin = options.minRegionWidth ?? 160;
    const minWidth = options.minRegionWidth !== undefined
      ? options.minRegionWidth
      : (primaryNodesInDomain.length > 1 ? defaultMin : 160);
    const regionWidth = Math.max(minWidth, primaryWidth + 40);

    // Multi-layer vertical height calculation spanning represented layers
    let regionHeight: number;
    if (representedLayers.length > 1) {
      const firstLayer = representedLayers[0];
      const lastLayer = representedLayers[representedLayers.length - 1];
      const minY = layerYMap[firstLayer];
      const maxY = layerYMap[lastLayer] + (dynamicLayerResult.layerHeights[lastLayer] || nodeHeight);
      regionHeight = Math.max(100, maxY - minY + 40);
    } else {
      regionHeight = Math.max(100, primaryHeight + 40);
    }

    domainDimensions.set(domain, { width: regionWidth, height: regionHeight, primaryLayer });
    totalWidthSum += regionWidth + 60;
  });

  const isMultiRowNeeded = orderedDomains.length >= 25 || totalWidthSum > 5000;

  if (!isMultiRowNeeded) {
    // 1D Linear Placement for small domain graphs (preserves existing 1D invariants & tests)
    let currentX = baseX;

    orderedDomains.forEach((domain, orderIndex) => {
      const dNode = domainGraph.nodes.get(domain);
      const nodeCount = dNode ? dNode.nodeCount : 1;
      const primaryNodeCount = dNode ? dNode.primaryNodeCount : 0;
      const primaryLayer = dNode ? dNode.primaryLayer : 'application';
      const dim = domainDimensions.get(domain)!;

      if (orderIndex > 0) {
        for (let k = 0; k < orderIndex; k++) {
          const prevDomain = orderedDomains[k];
          const prevRegion = domainRegions.get(prevDomain);
          if (prevRegion) {
            const rel = domainGraph.adjacency.get(prevDomain)?.get(domain);
            const strength = rel ? rel.strength : 0;
            const minGap = 40;
            const maxGap = 80;
            const domainGap = maxGap - strength * (maxGap - minGap);
            currentX = Math.max(currentX, prevRegion.xMax + domainGap);
          }
        }
      }

      const xCenter = currentX + dim.width / 2;

      // Determine represented layers in domain/feature
      const primaryNodesInDomain = dNode
        ? dNode.primaryNodeIds
            .map(id => (index ? index.nodeById.get(id) : safeNodes.find(n => n.id === id)))
            .filter((n): n is ExplorerNode => n !== undefined)
        : [];

      const layerCounts: Record<ArchitectureLayer, number> = {
        presentation: 0,
        application: 0,
        domain: 0,
        schema: 0,
      };
      primaryNodesInDomain.forEach(node => {
        const layer = classifyNodeLayer(node);
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      });
      const representedLayers = LAYERS_IN_ORDER.filter(l => layerCounts[l] > 0);

      let yMin: number;
      let yMax: number;
      let yCenter: number;

      if (representedLayers.length > 1) {
        const firstLayer = representedLayers[0];
        const lastLayer = representedLayers[representedLayers.length - 1];
        yMin = layerYMap[firstLayer] - 20;
        yMax = layerYMap[lastLayer] + (dynamicLayerResult.layerHeights[lastLayer] || nodeHeight) + 20;
        yCenter = (yMin + yMax) / 2;
      } else {
        const layerBaseY = layerYMap[primaryLayer] ?? baseY;
        yCenter = layerBaseY + dim.height / 2;
        yMin = yCenter - dim.height / 2;
        yMax = yCenter + dim.height / 2;
      }

      const xMin = currentX;
      const xMax = currentX + dim.width;

      const region: DomainRegion = {
        domain,
        xCenter,
        yCenter,
        width: dim.width,
        height: dim.height,
        xMin,
        xMax,
        yMin,
        yMax,
        nodeCount,
        primaryNodeCount,
        primaryLayer,
        orderIndex,
      };

      domainRegions.set(domain, region);

      if (dNode) {
        dNode.nodeIds.forEach(nodeId => {
          nodeRegions.set(nodeId, {
            domain,
            xCenter,
            yCenter,
            width: dim.width,
            height: dim.height,
          });
        });
      }
    });
  } else {
    // 2D Multi-Row Domain Band Packing for large domain graphs
    const domainsByLayer: Record<ArchitectureLayer, string[]> = {
      presentation: [],
      application: [],
      domain: [],
      schema: [],
    };

    orderedDomains.forEach(domain => {
      const dNode = domainGraph.nodes.get(domain);
      const primaryLayer = dNode ? dNode.primaryLayer : 'application';
      domainsByLayer[primaryLayer].push(domain);
    });

    const targetRowWidth = Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6)));
    let currentY = baseY;

    LAYERS_IN_ORDER.forEach(layer => {
      const layerDomains = domainsByLayer[layer];
      if (layerDomains.length === 0) return;

      let currentX = baseX;
      let maxRowHeightInLayer = 0;
      let rowIdx = 0;

      layerDomains.forEach((domain, idx) => {
        const dim = domainDimensions.get(domain)!;
        const dNode = domainGraph.nodes.get(domain);

        let domainGap = 80;
        if (idx > 0) {
          const prevDomain = layerDomains[idx - 1];
          const rel = domainGraph.adjacency.get(prevDomain)?.get(domain);
          const strength = rel ? rel.strength : 0;
          domainGap = 100 - strength * 20;
        }

        if (currentX > baseX && currentX + dim.width > targetRowWidth) {
          rowIdx++;
          currentX = baseX + (rowIdx % 5) * 40;
          currentY += maxRowHeightInLayer + 60;
          maxRowHeightInLayer = 0;
        }

        if (idx > 0) {
          const prevRegion = domainRegions.get(layerDomains[idx - 1]);
          if (prevRegion && prevRegion.yMin === currentY) {
            currentX = Math.max(currentX, prevRegion.xMax + domainGap);
          }
        }

        const xMin = currentX;
        const xMax = currentX + dim.width;
        const xCenter = currentX + dim.width / 2;
        const yMin = currentY;
        const yMax = currentY + dim.height;
        const yCenter = currentY + dim.height / 2;

        const region: DomainRegion = {
          domain,
          xCenter,
          yCenter,
          width: dim.width,
          height: dim.height,
          xMin,
          xMax,
          yMin,
          yMax,
          nodeCount: dNode ? dNode.nodeCount : 1,
          primaryNodeCount: dNode ? dNode.primaryNodeCount : 0,
          primaryLayer: layer,
          orderIndex: idx,
        };

        domainRegions.set(domain, region);

        if (dNode) {
          dNode.nodeIds.forEach(nodeId => {
            nodeRegions.set(nodeId, {
              domain,
              xCenter,
              yCenter,
              width: dim.width,
              height: dim.height,
            });
          });
        }

        currentX = xMax + domainGap;
        if (dim.height > maxRowHeightInLayer) {
          maxRowHeightInLayer = dim.height;
        }
      });

      currentY += maxRowHeightInLayer + 120;
    });
  }

  const candidatePositions: PositionMap = {};
  nodeRegions.forEach((region, nodeId) => {
    candidatePositions[nodeId] = { x: region.xCenter, y: region.yCenter };
  });

  let metrics: ComprehensiveLayoutMetrics | null = null;
  if (safeNodes.length > 0 && Object.keys(candidatePositions).length > 0) {
    metrics = calculateLayoutMetrics(safeNodes, safeEdges, candidatePositions, {
      nodeWidth,
      nodeHeight,
    });
  }

  return {
    domainGraph,
    domainRegions,
    nodeRegions,
    orderedDomains,
    metrics,
    layerYMap,
    layerRowCounts: dynamicLayerResult.layerRowCounts,
    layerHeights: dynamicLayerResult.layerHeights,
  };
}

/**
 * Computes deterministic global feature spatial layout by parameterizing
 * domain region packing math around feature cluster assignments.
 */
export function computeGlobalFeatureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalFeatureLayoutOptions = {}
): GlobalFeatureLayoutResult {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = options.index;
  const analysis = options.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, { index });
  const layerMap = options.layerMap;
  const domainMap = options.domainMap;

  // Resolve feature map from options or feature discovery
  const featureMap = new Map<string, string>();
  if (options.featureMap instanceof Map) {
    options.featureMap.forEach((v, k) => featureMap.set(k, v));
  } else if (options.featureMap) {
    Object.entries(options.featureMap).forEach(([k, v]) => featureMap.set(k, v));
  } else {
    const discovery = options.featureDiscovery || discoverFeatures(safeNodes, safeEdges, {
      index,
      analysis,
      layerMap,
      domainMap,
    });
    discovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });
  }

  // Fallback for unmapped nodes
  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  const featureGraph = buildDomainGraph(safeNodes, safeEdges, options.domainDiscovery, index, featureMap);
  const orderedFeatures = options.orderedDomains || determineGlobalFeatureOrder(
    safeNodes,
    safeEdges,
    featureGraph,
    featureMap,
    options.featureOrderingStrategy ?? 'F_SHARED_HIERARCHY_AWARE'
  );

  // Re-use computeGlobalDomainLayout with featureMap passed as domainMap, minRegionWidth=280, and pre-calculated feature order
  const globalResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
    ...options,
    analysis,
    index,
    orderedDomains: orderedFeatures,
    minRegionWidth: options.minRegionWidth ?? 280,
    domainMap: featureMap,
  });

  const featureRegions = new Map<string, FeatureRegion>();
  globalResult.domainRegions.forEach((region, featureId) => {
    let domainId: string | undefined = undefined;
    if (options.featureDiscovery) {
      domainId = options.featureDiscovery.features.get(featureId)?.domains[0];
    }

    featureRegions.set(featureId, {
      ...region,
      featureId,
      domainId,
    });
  });

  return {
    ...globalResult,
    featureRegions,
    featureGraph: globalResult.domainGraph,
    orderedFeatures: globalResult.orderedDomains,
  };
}

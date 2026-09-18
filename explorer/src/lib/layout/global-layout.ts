import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { classifyNodeLayer } from './layers';
import { discoverDomains, type DomainDiscoveryResult } from './domains';
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
  layers: ArchitectureLayer[];
  primaryLayer: ArchitectureLayer;
  nodeIds: string[];
  connectedDomains: string[];
  degree: number;
  isShared: boolean;
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
}

export interface GlobalLayoutResult {
  domainGraph: DomainGraph;
  domainRegions: Map<string, DomainRegion>;
  nodeRegions: Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>;
  orderedDomains: string[];
  metrics: ComprehensiveLayoutMetrics | null;
}

const LAYER_Y_MAP: Record<ArchitectureLayer, number> = {
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

/**
 * Builds a deterministic Domain Graph from Explorer nodes and edges.
 * Summarizes cross-domain dependency edges, directional strengths, layer profiles,
 * and domain degrees without changing individual node semantics.
 */
export function buildDomainGraph(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  domainResult?: DomainDiscoveryResult
): DomainGraph {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  // Deterministic sorting of inputs
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const discovery = domainResult || discoverDomains(safeNodes, safeEdges);

  // Group nodes by domain and determine domain layer profiles
  const domainNodeMap = new Map<string, DomainNode>();
  const nodeToDomainMap = new Map<string, string>();

  // Map each node to its primary domain
  discovery.assignments.forEach((assignment, nodeId) => {
    nodeToDomainMap.set(nodeId, assignment.primaryDomain);
  });

  // Process nodes to build domain nodes
  safeNodes.forEach(node => {
    const domain = nodeToDomainMap.get(node.id) || 'Shared';
    const layer = classifyNodeLayer(node);

    if (!domainNodeMap.has(domain)) {
      domainNodeMap.set(domain, {
        domain,
        nodeCount: 0,
        layers: [],
        primaryLayer: 'application',
        nodeIds: [],
        connectedDomains: [],
        degree: 0,
        isShared: domain === 'Shared',
      });
    }

    const dNode = domainNodeMap.get(domain)!;
    dNode.nodeCount++;
    dNode.nodeIds.push(node.id);
    if (!dNode.layers.includes(layer)) {
      dNode.layers.push(layer);
    }
  });

  // Calculate primary layer for each domain (most frequent layer, tie-breaker layer priority)
  domainNodeMap.forEach(dNode => {
    dNode.nodeIds.sort((a, b) => a.localeCompare(b));
    dNode.layers.sort((a, b) => LAYER_PRIORITY[a] - LAYER_PRIORITY[b]);

    const layerCounts: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };

    dNode.nodeIds.forEach(nodeId => {
      const node = safeNodes.find(n => n.id === nodeId);
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
        // Tie-breaker: earlier layer priority
        if (LAYER_PRIORITY[l] < LAYER_PRIORITY[bestLayer]) {
          bestLayer = l;
        }
      }
    });

    dNode.primaryLayer = bestLayer;
  });

  // Cross-domain relationship counting
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

    if (srcDomain === tgtDomain) return; // Intra-domain edge ignored for domain graph

    // Unique relationship key (alphabetic domain pair)
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

    const srcNode = safeNodes.find(n => n.id === edge.source);
    const tgtNode = safeNodes.find(n => n.id === edge.target);
    if (srcNode) rel.layers.add(classifyNodeLayer(srcNode));
    if (tgtNode) rel.layers.add(classifyNodeLayer(tgtNode));
  });

  // Build domain relationships list
  const domainRelationships: DomainRelationship[] = [];
  const adjacency = new Map<string, Map<string, DomainRelationship>>();

  // Initialize adjacency map
  domainNodeMap.forEach((_, domain) => {
    adjacency.set(domain, new Map());
  });

  // Find max edge count for strength normalization
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

    // Forward relationship
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

      // Update connected domains and degree
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

  // Final cleanup on domain nodes
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
 * Computes deterministic global domain spatial ordering based on domain dependency graph
 * relationships, directionality, hub centrality, and layer structure.
 *
 * Rule: Alphabetical order is strictly a fallback tie-breaker when structural metrics are equal.
 */
export function determineGlobalDomainOrder(domainGraph: DomainGraph): string[] {
  const domains = Array.from(domainGraph.nodes.keys());
  if (domains.length <= 1) return domains;

  const nonSharedDomains = domains.filter(d => d !== 'Shared');
  const hasShared = domains.includes('Shared');

  if (nonSharedDomains.length === 0) return ['Shared'];

  // Calculate dependency flow scores for business domains
  // Outgoing dependencies -> domain serves as upstream or orchestrator
  // Incoming dependencies -> domain serves as downstream dependency
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

  // Separate connected domain subgraphs/components
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

  // Sort components by size descending, then min domain name
  domainComponents.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return (a[0] || '').localeCompare(b[0] || '');
  });

  // Order domains within each component using barycenter/dependency flow
  const orderedBusinessDomains: string[] = [];

  for (const comp of domainComponents) {
    if (comp.length === 1) {
      orderedBusinessDomains.push(comp[0]);
      continue;
    }

    // Sort nodes in component initially by netFlow descending (orchestrators/upstream first),
    // then total edge degree descending, then alphabetical tie-breaker
    const compOrdered = [...comp].sort((a, b) => {
      const statsA = flowScores.get(a)!;
      const statsB = flowScores.get(b)!;

      if (statsB.netFlow !== statsA.netFlow) {
        return statsB.netFlow - statsA.netFlow;
      }
      if (statsB.totalEdges !== statsA.totalEdges) {
        return statsB.totalEdges - statsA.totalEdges;
      }
      return a.localeCompare(b);
    });

    // Barycentric 2-pass sweep to minimize cross-domain edge lengths
    for (let pass = 0; pass < 2; pass++) {
      const posMap = new Map<string, number>();
      compOrdered.forEach((d, idx) => posMap.set(d, idx));

      const barycenters = new Map<string, number>();

      compOrdered.forEach(d => {
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
            sumPos += (posMap.get(n) ?? 0) * w;
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
        return a.localeCompare(b);
      });
    }

    orderedBusinessDomains.push(...compOrdered);
  }

  // Handle Shared domain placement:
  // Shared domain should NOT automatically swallow or distort business domain locality.
  // Place Shared domain at a balanced intermediate or central position near its connected domains.
  if (!hasShared) {
    return orderedBusinessDomains;
  }

  const sharedNode = domainGraph.nodes.get('Shared');
  const connectedToShared = (sharedNode?.connectedDomains || []).filter(d => d !== 'Shared');

  if (connectedToShared.length === 0 || orderedBusinessDomains.length <= 1) {
    // If no specific connected business domains or 1 domain, place Shared at the end
    return [...orderedBusinessDomains, 'Shared'];
  }

  // Calculate average index of domains connected to Shared
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
 * Computes deterministic global domain spatial layout, determining spatial region bounds
 * for each domain and candidate node region assignments.
 */
export function computeGlobalDomainLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalLayoutOptions = {}
): GlobalLayoutResult {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  const domainSpacing = options.domainSpacing ?? 380;
  const layerSpacing = options.layerSpacing ?? 250;
  const baseX = options.baseX ?? 100;
  const baseY = options.baseY ?? 100;
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  // Build domain graph
  const domainGraph = buildDomainGraph(safeNodes, safeEdges);

  // Determine relationship-aware global domain spatial order
  const orderedDomains = determineGlobalDomainOrder(domainGraph);

  // Compute spatial regions for domains
  const domainRegions = new Map<string, DomainRegion>();
  const nodeRegions = new Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>();

  let currentX = baseX;

  orderedDomains.forEach((domain, orderIndex) => {
    const dNode = domainGraph.nodes.get(domain);
    const nodeCount = dNode ? dNode.nodeCount : 1;
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';

    // Width proportional to estimated grid columns for domain node count
    const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nodeCount))));
    const rows = Math.max(1, Math.ceil(nodeCount / cols));

    const regionWidth = Math.max(220, cols * (nodeWidth * 1.3) + 40);
    const regionHeight = Math.max(150, rows * (nodeHeight * 1.4) + 40);

    const xCenter = currentX + regionWidth / 2;
    const layerBaseY = baseY + (LAYER_Y_MAP[primaryLayer] || 350) - 100;
    const yCenter = layerBaseY + regionHeight / 2;

    const xMin = xCenter - regionWidth / 2;
    const xMax = xCenter + regionWidth / 2;
    const yMin = yCenter - regionHeight / 2;
    const yMax = yCenter + regionHeight / 2;

    const region: DomainRegion = {
      domain,
      xCenter,
      yCenter,
      width: regionWidth,
      height: regionHeight,
      xMin,
      xMax,
      yMin,
      yMax,
      nodeCount,
      primaryLayer,
      orderIndex,
    };

    domainRegions.set(domain, region);

    // Map each node in domain to candidate region
    if (dNode) {
      dNode.nodeIds.forEach(nodeId => {
        nodeRegions.set(nodeId, {
          domain,
          xCenter,
          yCenter,
          width: regionWidth,
          height: regionHeight,
        });
      });
    }

    // Advance X coordinate for next domain region
    currentX += regionWidth + (domainSpacing - 220);
  });

  // Build candidate position map to evaluate layout metrics
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
  };
}

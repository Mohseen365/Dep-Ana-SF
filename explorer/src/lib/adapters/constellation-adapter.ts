import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerRelationshipType } from '../../types/explorer';
import { discoverFeatures, FeatureDiscoveryOptions } from '../layout/features';
import { classifyNodeLayer } from '../layout/layers';
import { FocusDirection, FocusDepth } from '../focus-graph';

export interface ConstellationFocalNode {
  id: string;
  displayName: string;
  type: string;
  file: string;
  risk: string;
  featureId: string;
  featureName: string;
  layerName: string;
  metrics: {
    fanIn: number;
    fanOut: number;
    coupling: number;
    score: number;
  };
}

export interface ConstellationNode {
  nodeId: string;
  displayName: string;
  type: string;
  file: string;
  risk: string;
  featureId: string;
  featureName: string;
  layerName: string;
  hopDistance: number; // 0 for focal node, 1, 2, 3...
  metrics: {
    fanIn: number;
    fanOut: number;
    coupling: number;
    score: number;
  };
  incomingCount: number;
  outgoingCount: number;
}

export interface ConstellationEdgeProvenance {
  edgeId: string;
  sourceComponentName: string;
  targetComponentName: string;
  relationshipType: string;
}

export interface ConstellationEdge {
  edgeId: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType | string;
  sourceHop: number;
  targetHop: number;
  isSameRing: boolean;
  isCrossRing: boolean;
  provenance: ConstellationEdgeProvenance;
}

export interface ConstellationRing {
  ringIndex: number; // 1, 2, 3...
  hopDistance: number;
  label: string;
  items: ConstellationNode[];
  totalCount: number;
}

export interface ConstellationSummary {
  focalNodeId: string;
  totalNodes: number;
  totalEdges: number;
  ringCount: number;
  maxHopDepth: number;
}

export interface ConstellationAvailableNode {
  id: string;
  displayName: string;
  type: string;
  featureName: string;
  layerName: string;
  coupling: number;
}

export interface ConstellationData {
  focalNode: ConstellationFocalNode | null;
  rings: ConstellationRing[];
  nodes: Record<string, ConstellationNode>;
  edges: ConstellationEdge[];
  availableNodes: ConstellationAvailableNode[];
  summary: ConstellationSummary;
  options: {
    focalNodeId: string | null;
    maxDepth: number;
    direction: FocusDirection;
  };
}

export interface ConstellationAdapterOptions extends FeatureDiscoveryOptions {
  focalNodeId?: string | null;
  maxDepth?: number; // 1, 2, 3 default 2
  direction?: FocusDirection; // 'both' | 'dependencies' | 'dependents' default 'both'
}

interface EdgeAdjacencyMap {
  outgoing: Map<string, ExplorerEdge[]>;
  incoming: Map<string, ExplorerEdge[]>;
}

function buildAdjacencyMap(edges: ExplorerEdge[]): EdgeAdjacencyMap {
  const outgoing = new Map<string, ExplorerEdge[]>();
  const incoming = new Map<string, ExplorerEdge[]>();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

    let outList = outgoing.get(edge.source);
    if (!outList) {
      outList = [];
      outgoing.set(edge.source, outList);
    }
    outList.push(edge);

    let inList = incoming.get(edge.target);
    if (!inList) {
      inList = [];
      incoming.set(edge.target, inList);
    }
    inList.push(edge);
  }

  return { outgoing, incoming };
}

/**
 * Pure, deterministic data adapter for the Dependency Constellation lens.
 * Transforms canonical ExplorerDataSchema into a focal-centric polar orbit model.
 * Guarantees zero input graph mutation and bit-for-bit deterministic output.
 */
export function adaptConstellation(
  input: ExplorerDataSchema,
  options: ConstellationAdapterOptions = {}
): ConstellationData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Ensure safe nodes and edges (each edge having an id)
  const safeNodes = rawNodes.map(n => ({ ...n }));
  const safeEdges = rawEdges.map((e, idx) => ({
    ...e,
    id: e.id || `edge_${e.source}_${e.target}_${e.relationshipType}_${idx}`
  }));

  const nodes: ExplorerNode[] = [...safeNodes].sort((a, b) => a.id.localeCompare(b.id));

  // Run feature discovery
  const discovery = discoverFeatures(nodes, safeEdges, options);

  // Helper maps for node feature & layer lookup
  const nodeMap = new Map<string, ExplorerNode>();
  const nodeFeatureMap = new Map<string, { id: string; name: string }>();
  const nodeLayerMap = new Map<string, string>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, node);

    const assignment = discovery.assignments.get(node.id);
    const featureId = assignment?.primaryFeatureId ?? 'Unassigned';
    const cluster = discovery.features.get(featureId);
    const featureName = cluster?.name ?? featureId.replace(/^feature_/, '');

    nodeFeatureMap.set(node.id, { id: featureId, name: featureName });
    nodeLayerMap.set(node.id, classifyNodeLayer(node));
  });

  // Prepare available nodes for subject selection (sorted by coupling descending, then ID)
  const availableNodes: ConstellationAvailableNode[] = nodes
    .map((node) => {
      const feat = nodeFeatureMap.get(node.id) || { id: 'Unassigned', name: 'Unassigned' };
      const layer = nodeLayerMap.get(node.id) || 'General';
      const coupling = node.metrics?.coupling ?? (node.metrics?.fanIn ?? 0) + (node.metrics?.fanOut ?? 0);
      return {
        id: node.id,
        displayName: node.displayName || node.id,
        type: node.type,
        featureName: feat.name,
        layerName: layer,
        coupling,
      };
    })
    .sort((a, b) => {
      if (b.coupling !== a.coupling) return b.coupling - a.coupling;
      return a.id.localeCompare(b.id);
    });

  // Determine focal node ID
  let focalNodeId: string | null = options.focalNodeId ?? null;
  if (!focalNodeId && availableNodes.length > 0) {
    focalNodeId = availableNodes[0].id;
  } else if (focalNodeId && !nodeMap.has(focalNodeId)) {
    // Fallback if provided ID is missing
    focalNodeId = availableNodes.length > 0 ? availableNodes[0].id : null;
  }

  const maxDepth = options.maxDepth ?? 2;
  const direction: FocusDirection = options.direction ?? 'both';

  // Empty graph or missing focal node
  if (!focalNodeId || !nodeMap.has(focalNodeId)) {
    return {
      focalNode: null,
      rings: [],
      nodes: {},
      edges: [],
      availableNodes,
      summary: {
        focalNodeId: '',
        totalNodes: 0,
        totalEdges: 0,
        ringCount: 0,
        maxHopDepth: 0,
      },
      options: {
        focalNodeId: null,
        maxDepth,
        direction,
      },
    };
  }

  const focalRawNode = nodeMap.get(focalNodeId)!;
  const focalFeat = nodeFeatureMap.get(focalNodeId)!;
  const focalLayer = nodeLayerMap.get(focalNodeId)!;

  const focalNode: ConstellationFocalNode = {
    id: focalRawNode.id,
    displayName: focalRawNode.displayName || focalRawNode.id,
    type: focalRawNode.type,
    file: focalRawNode.file,
    risk: focalRawNode.risk,
    featureId: focalFeat.id,
    featureName: focalFeat.name,
    layerName: focalLayer,
    metrics: {
      fanIn: focalRawNode.metrics?.fanIn ?? 0,
      fanOut: focalRawNode.metrics?.fanOut ?? 0,
      coupling: focalRawNode.metrics?.coupling ?? 0,
      score: focalRawNode.metrics?.score ?? 0,
    },
  };

  // Breadth-First Search (BFS) to compute k-hop distances
  const adj = buildAdjacencyMap(rawEdges);
  const hopDistances = new Map<string, number>();
  hopDistances.set(focalNodeId, 0);

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: focalNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    if (direction === 'dependencies' || direction === 'both') {
      const outEdges = adj.outgoing.get(nodeId) || [];
      for (let i = 0; i < outEdges.length; i++) {
        const targetId = outEdges[i].target;
        if (!hopDistances.has(targetId) && nodeMap.has(targetId)) {
          hopDistances.set(targetId, depth + 1);
          queue.push({ nodeId: targetId, depth: depth + 1 });
        }
      }
    }

    if (direction === 'dependents' || direction === 'both') {
      const inEdges = adj.incoming.get(nodeId) || [];
      for (let i = 0; i < inEdges.length; i++) {
        const sourceId = inEdges[i].source;
        if (!hopDistances.has(sourceId) && nodeMap.has(sourceId)) {
          hopDistances.set(sourceId, depth + 1);
          queue.push({ nodeId: sourceId, depth: depth + 1 });
        }
      }
    }
  }

  // Filter edges within the constellation neighborhood
  const constellationEdgeMap = new Map<string, ExplorerEdge>();
  rawEdges.forEach((edge) => {
    if (hopDistances.has(edge.source) && hopDistances.has(edge.target)) {
      const edgeKey = `${edge.source}->${edge.target}:${edge.relationshipType}`;
      if (!constellationEdgeMap.has(edgeKey)) {
        constellationEdgeMap.set(edgeKey, edge);
      }
    }
  });

  // Calculate in/out edge counts within constellation view
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  constellationEdgeMap.forEach((edge) => {
    outDegreeMap.set(edge.source, (outDegreeMap.get(edge.source) || 0) + 1);
    inDegreeMap.set(edge.target, (inDegreeMap.get(edge.target) || 0) + 1);
  });

  // Group nodes by hop distance into rings (hop 1, 2, 3...)
  const ringNodesMap = new Map<number, ConstellationNode[]>();
  const nodesDict: Record<string, ConstellationNode> = {};

  hopDistances.forEach((hop, nodeId) => {
    const rawNode = nodeMap.get(nodeId)!;
    const feat = nodeFeatureMap.get(nodeId)!;
    const layer = nodeLayerMap.get(nodeId)!;

    const cNode: ConstellationNode = {
      nodeId: rawNode.id,
      displayName: rawNode.displayName || rawNode.id,
      type: rawNode.type,
      file: rawNode.file,
      risk: rawNode.risk,
      featureId: feat.id,
      featureName: feat.name,
      layerName: layer,
      hopDistance: hop,
      metrics: {
        fanIn: rawNode.metrics?.fanIn ?? 0,
        fanOut: rawNode.metrics?.fanOut ?? 0,
        coupling: rawNode.metrics?.coupling ?? 0,
        score: rawNode.metrics?.score ?? 0,
      },
      incomingCount: inDegreeMap.get(nodeId) || 0,
      outgoingCount: outDegreeMap.get(nodeId) || 0,
    };

    nodesDict[nodeId] = cNode;

    if (hop > 0) {
      if (!ringNodesMap.has(hop)) {
        ringNodesMap.set(hop, []);
      }
      ringNodesMap.get(hop)!.push(cNode);
    }
  });

  // Build sorted rings
  const ringIndices = Array.from(ringNodesMap.keys()).sort((a, b) => a - b);
  const rings: ConstellationRing[] = [];

  ringIndices.forEach((hop) => {
    const items = ringNodesMap.get(hop)!;

    // Deterministic intra-ring node ordering:
    // 1. Feature Name ascending
    // 2. Layer Name ascending
    // 3. Coupling descending
    // 4. Canonical nodeId tie-break
    items.sort((a, b) => {
      if (a.featureName !== b.featureName) return a.featureName.localeCompare(b.featureName);
      if (a.layerName !== b.layerName) return a.layerName.localeCompare(b.layerName);
      if (b.metrics.coupling !== a.metrics.coupling) return b.metrics.coupling - a.metrics.coupling;
      return a.nodeId.localeCompare(b.nodeId);
    });

    rings.push({
      ringIndex: hop,
      hopDistance: hop,
      label: `${hop}-Hop Orbit (${items.length} ${items.length === 1 ? 'component' : 'components'})`,
      items,
      totalCount: items.length,
    });
  });

  // Build ConstellationEdges with provenance and hop metadata
  const constellationEdges: ConstellationEdge[] = [];
  const sortedEdges = Array.from(constellationEdgeMap.values()).sort((a, b) => {
    const sDiff = a.source.localeCompare(b.source);
    if (sDiff !== 0) return sDiff;
    const tDiff = a.target.localeCompare(b.target);
    if (tDiff !== 0) return tDiff;
    return a.relationshipType.localeCompare(b.relationshipType);
  });

  sortedEdges.forEach((edge, index) => {
    const sHop = hopDistances.get(edge.source) ?? -1;
    const tHop = hopDistances.get(edge.target) ?? -1;
    const sNode = nodeMap.get(edge.source);
    const tNode = nodeMap.get(edge.target);

    const edgeId = `constellation_edge_${edge.source}_${edge.target}_${edge.relationshipType}_${index}`;

    constellationEdges.push({
      edgeId,
      source: edge.source,
      target: edge.target,
      relationshipType: edge.relationshipType,
      sourceHop: sHop,
      targetHop: tHop,
      isSameRing: sHop === tHop,
      isCrossRing: sHop !== tHop,
      provenance: {
        edgeId,
        sourceComponentName: sNode?.displayName || edge.source,
        targetComponentName: tNode?.displayName || edge.target,
        relationshipType: edge.relationshipType,
      },
    });
  });

  const totalNeighborhoodNodes = Object.keys(nodesDict).length;

  return {
    focalNode,
    rings,
    nodes: nodesDict,
    edges: constellationEdges,
    availableNodes,
    summary: {
      focalNodeId,
      totalNodes: totalNeighborhoodNodes,
      totalEdges: constellationEdges.length,
      ringCount: rings.length,
      maxHopDepth: maxDepth,
    },
    options: {
      focalNodeId,
      maxDepth,
      direction,
    },
  };
}

import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type {
  ArchitectureLayer,
  ArchitectureNodeAnalysis,
  ConnectedComponentAnalysis,
  ArchitectureGraphAnalysis,
  ArchitectureAnalysisOptions,
} from './types';

/**
 * Determines whether a node represents a unit test class or component based on
 * factual node attributes (behavior flags, displayName naming conventions, or file path).
 */
export function isTestNode(node: ExplorerNode): boolean {
  if (node.behavior?.isTest) return true;
  const name = node.displayName || node.id || '';
  if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
  if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
  return false;
}

/**
 * Determines whether a node represents an object field or custom field.
 */
export function isFieldNode(node: ExplorerNode): boolean {
  return node.type === 'Field' || node.type === 'CustomField';
}

/**
 * Resolves the target production node ID for a test node by checking:
 * 1. Direct connected edges to a non-test node
 * 2. Naming convention match (e.g. OrderServiceTest -> OrderService)
 */
export function findParentProductionNodeId(
  testNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): string | null {
  const testName = testNode.displayName || testNode.id;

  // 1. Direct edge check for connected non-test nodes
  const connectedEdges = edges.filter(
    e => e.source === testNode.id || e.target === testNode.id
  );
  const connectedCandidateIds: string[] = [];

  for (const edge of connectedEdges) {
    const otherId = edge.source === testNode.id ? edge.target : edge.source;
    const targetNode = allNodes.find(n => n.id === otherId && !isTestNode(n));
    if (targetNode) {
      connectedCandidateIds.push(targetNode.id);
    }
  }

  if (connectedCandidateIds.length > 0) {
    // Return deterministically sorted candidate
    connectedCandidateIds.sort((a, b) => a.localeCompare(b));
    return connectedCandidateIds[0];
  }

  // 2. Name convention match (OrderServiceTest -> OrderService)
  const strippedName = testName.replace(/(?:test|tests|testdatafactory)$/i, '');
  if (strippedName && strippedName !== testName) {
    const matchingProdNodes = allNodes.filter(
      n => !isTestNode(n) && (n.displayName === strippedName || n.id.endsWith(`:${strippedName}`))
    );
    if (matchingProdNodes.length > 0) {
      matchingProdNodes.sort((a, b) => a.id.localeCompare(b.id));
      return matchingProdNodes[0].id;
    }
  }

  return null;
}

/**
 * Resolves the parent CustomObject/Object node ID for a field node by checking:
 * 1. Node ID structure (e.g., Object:Account.Field:Phone -> Account)
 * 2. Connected field-reference edges to Object / CustomObject nodes
 */
export function findParentObjectId(
  fieldNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): string | null {
  // 1. Check ID structure
  const idParts = fieldNode.id.split('.');
  if (idParts.length >= 2) {
    const parentObjName = idParts[0].replace(/^(?:Object|CustomObject|Field|CustomField):/, '');
    const parentObj = allNodes.find(
      n =>
        (n.type === 'Object' || n.type === 'CustomObject' || n.type === 'External') &&
        (n.displayName === parentObjName || n.id.endsWith(`:${parentObjName}`))
    );
    if (parentObj) return parentObj.id;
  }

  // 2. Check connected edges
  const fieldEdges = edges.filter(
    e => e.source === fieldNode.id || e.target === fieldNode.id
  );
  const parentObjCandidates: string[] = [];

  for (const edge of fieldEdges) {
    const otherId = edge.source === fieldNode.id ? edge.target : edge.source;
    const parentObj = allNodes.find(
      n => (n.type === 'Object' || n.type === 'CustomObject' || n.type === 'External') && n.id === otherId
    );
    if (parentObj) {
      parentObjCandidates.push(parentObj.id);
    }
  }

  if (parentObjCandidates.length > 0) {
    parentObjCandidates.sort((a, b) => a.localeCompare(b));
    return parentObjCandidates[0];
  }

  return null;
}

/**
 * Calculates cross-domain bridge score and bridge flag for a node given its connected neighbors
 * and a domain mapping.
 */
export function computeNodeBridgeMetrics(
  nodeId: string,
  neighborIds: string[],
  domainMap: Map<string, string>,
  nodeDomain?: string | null
): { bridgeScore: number; isBridge: boolean } {
  if (domainMap.size === 0) {
    return { bridgeScore: 0, isBridge: false };
  }

  const connectedDomains = new Set<string>();
  const ownDomain = nodeDomain || domainMap.get(nodeId);

  for (const neighborId of neighborIds) {
    const neighborDomain = domainMap.get(neighborId);
    if (neighborDomain && neighborDomain !== 'Shared' && neighborDomain !== ownDomain) {
      connectedDomains.add(neighborDomain);
    }
  }

  const bridgeScore = connectedDomains.size;
  const isBridge = bridgeScore >= 2;

  return { bridgeScore, isBridge };
}

/**
 * Decomposes a graph into connected components using deterministic BFS traversal.
 * Components are sorted by node count descending, then min node ID ascending.
 */
function decomposeConnectedComponents(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): {
  components: ConnectedComponentAnalysis[];
  nodeComponentMap: Map<string, number>;
} {
  const nodeMap = new Map<string, ExplorerNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const adj = new Map<string, Set<string>>();
  nodes.forEach(n => adj.set(n.id, new Set()));

  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target) && e.source !== e.target) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  });

  // Also link satellite nodes to parent nodes so components include satellites
  nodes.forEach(n => {
    if (isTestNode(n)) {
      const parentProdId = findParentProductionNodeId(n, nodes, edges);
      if (parentProdId && adj.has(parentProdId)) {
        adj.get(n.id)!.add(parentProdId);
        adj.get(parentProdId)!.add(n.id);
      }
    } else if (isFieldNode(n)) {
      const parentObjId = findParentObjectId(n, nodes, edges);
      if (parentObjId && adj.has(parentObjId)) {
        adj.get(n.id)!.add(parentObjId);
        adj.get(parentObjId)!.add(n.id);
      }
    }
  });

  const visited = new Set<string>();
  const rawComponents: { nodeIds: string[]; edgeIds: string[] }[] = [];

  // Deterministic traversal order starting from sorted node IDs
  const sortedNodeIds = nodes.map(n => n.id).sort((a, b) => a.localeCompare(b));

  for (const nodeId of sortedNodeIds) {
    if (visited.has(nodeId)) continue;

    const compNodeIds: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      compNodeIds.push(curr);

      const neighbors = Array.from(adj.get(curr) || []).sort((a, b) => a.localeCompare(b));
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    compNodeIds.sort((a, b) => a.localeCompare(b));
    const compNodeSet = new Set(compNodeIds);

    const compEdgeIds = edges
      .filter(e => compNodeSet.has(e.source) && compNodeSet.has(e.target))
      .map(e => e.id)
      .sort((a, b) => a.localeCompare(b));

    rawComponents.push({
      nodeIds: compNodeIds,
      edgeIds: compEdgeIds,
    });
  }

  // Sort components deterministically: size descending, then min node ID ascending
  rawComponents.sort((a, b) => {
    if (b.nodeIds.length !== a.nodeIds.length) {
      return b.nodeIds.length - a.nodeIds.length;
    }
    const minA = a.nodeIds[0] || '';
    const minB = b.nodeIds[0] || '';
    return minA.localeCompare(minB);
  });

  const components: ConnectedComponentAnalysis[] = [];
  const nodeComponentMap = new Map<string, number>();

  rawComponents.forEach((comp, idx) => {
    const componentId = idx;
    components.push({
      componentId,
      nodeIds: comp.nodeIds,
      edgeIds: comp.edgeIds,
    });
    comp.nodeIds.forEach(id => {
      nodeComponentMap.set(id, componentId);
    });
  });

  return { components, nodeComponentMap };
}

/**
 * Builds the deterministic intermediate architecture analysis model for a graph.
 * Exposes slots for layer, domain, and role classification while computing all
 * underlying graph facts, degree centrality, bridge metrics, and component topology.
 */
export function computeArchitectureAnalysis(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureAnalysisOptions = {}
): ArchitectureGraphAnalysis {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  // Normalize options maps
  const layerMap = options.layerMap instanceof Map
    ? options.layerMap
    : options.layerMap
    ? new Map(Object.entries(options.layerMap))
    : new Map<string, ArchitectureLayer>();

  const domainMap = options.domainMap instanceof Map
    ? options.domainMap
    : options.domainMap
    ? new Map(Object.entries(options.domainMap))
    : new Map<string, string>();

  const roleMap = options.roleMap instanceof Map
    ? options.roleMap
    : options.roleMap
    ? new Map(Object.entries(options.roleMap))
    : new Map<string, string>();

  // Ensure synthetic missing endpoint nodes exist in safeNodes
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
  });

  // Sort nodes deterministically by ID
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));

  // Compute graph degrees & adjacency
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();
  const neighborSets = new Map<string, Set<string>>();

  safeNodes.forEach(n => {
    fanInMap.set(n.id, 0);
    fanOutMap.set(n.id, 0);
    neighborSets.set(n.id, new Set());
  });

  safeEdges.forEach(e => {
    if (fanOutMap.has(e.source)) {
      fanOutMap.set(e.source, (fanOutMap.get(e.source) || 0) + 1);
    }
    if (fanInMap.has(e.target)) {
      fanInMap.set(e.target, (fanInMap.get(e.target) || 0) + 1);
    }

    if (neighborSets.has(e.source) && neighborSets.has(e.target) && e.source !== e.target) {
      neighborSets.get(e.source)!.add(e.target);
      neighborSets.get(e.target)!.add(e.source);
    }
  });

  // Compute connected components
  const { components, nodeComponentMap } = decomposeConnectedComponents(safeNodes, safeEdges);

  // Construct individual node analysis models
  const analysisNodeMap = new Map<string, ArchitectureNodeAnalysis>();
  const analysisNodeList: ArchitectureNodeAnalysis[] = [];

  for (const node of safeNodes) {
    const id = node.id;
    const fanIn = fanInMap.get(id) || 0;
    const fanOut = fanOutMap.get(id) || 0;
    const hubScore = fanIn + fanOut;

    const neighborIds = Array.from(neighborSets.get(id) || []).sort((a, b) => a.localeCompare(b));
    const isTest = isTestNode(node);
    const isField = isFieldNode(node);

    const parentProductionNodeId = isTest
      ? findParentProductionNodeId(node, safeNodes, safeEdges)
      : null;

    const parentObjectId = isField
      ? findParentObjectId(node, safeNodes, safeEdges)
      : null;

    const layer = layerMap.get(id) || null;
    const domain = domainMap.get(id) || null;
    const role = roleMap.get(id) || null;

    const { bridgeScore, isBridge } = computeNodeBridgeMetrics(id, neighborIds, domainMap, domain);

    const nodeAnalysis: ArchitectureNodeAnalysis = {
      nodeId: id,
      node,
      displayName: node.displayName || id,
      nodeType: node.type,
      layer,
      domain,
      role,
      isTest,
      isField,
      isBridge,
      hubScore,
      bridgeScore,
      fanIn,
      fanOut,
      neighborIds,
      componentId: nodeComponentMap.get(id) ?? 0,
      parentProductionNodeId,
      parentObjectId,
    };

    analysisNodeMap.set(id, nodeAnalysis);
    analysisNodeList.push(nodeAnalysis);
  }

  return {
    nodes: analysisNodeMap,
    nodeList: analysisNodeList,
    components,
    totalNodes: safeNodes.length,
    totalEdges: safeEdges.length,
  };
}

/**
 * Updates an existing ArchitectureGraphAnalysis with layer classifications.
 * Returns a new ArchitectureGraphAnalysis without mutating inputs.
 */
export function applyLayerClassification(
  analysis: ArchitectureGraphAnalysis,
  layerMap: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>
): ArchitectureGraphAnalysis {
  const normalizedMap = layerMap instanceof Map
    ? layerMap
    : new Map(Object.entries(layerMap));

  const updatedNodes = new Map<string, ArchitectureNodeAnalysis>();
  const updatedList: ArchitectureNodeAnalysis[] = [];

  for (const item of analysis.nodeList) {
    const newLayer = normalizedMap.get(item.nodeId) || item.layer;
    const updatedItem: ArchitectureNodeAnalysis = {
      ...item,
      layer: newLayer,
    };
    updatedNodes.set(item.nodeId, updatedItem);
    updatedList.push(updatedItem);
  }

  return {
    ...analysis,
    nodes: updatedNodes,
    nodeList: updatedList,
  };
}

/**
 * Updates an existing ArchitectureGraphAnalysis with domain classifications
 * and recalculates bridge scores and bridge flags deterministically.
 * Returns a new ArchitectureGraphAnalysis without mutating inputs.
 */
export function applyDomainClassification(
  analysis: ArchitectureGraphAnalysis,
  domainMap: Map<string, string> | Record<string, string>
): ArchitectureGraphAnalysis {
  const normalizedMap = domainMap instanceof Map
    ? domainMap
    : new Map(Object.entries(domainMap));

  const updatedNodes = new Map<string, ArchitectureNodeAnalysis>();
  const updatedList: ArchitectureNodeAnalysis[] = [];

  for (const item of analysis.nodeList) {
    const newDomain = normalizedMap.get(item.nodeId) || item.domain;
    const { bridgeScore, isBridge } = computeNodeBridgeMetrics(
      item.nodeId,
      item.neighborIds,
      normalizedMap,
      newDomain
    );

    const updatedItem: ArchitectureNodeAnalysis = {
      ...item,
      domain: newDomain,
      bridgeScore,
      isBridge,
    };
    updatedNodes.set(item.nodeId, updatedItem);
    updatedList.push(updatedItem);
  }

  return {
    ...analysis,
    nodes: updatedNodes,
    nodeList: updatedList,
  };
}

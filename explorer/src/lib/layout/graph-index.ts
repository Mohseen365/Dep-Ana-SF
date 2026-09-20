import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { isTestNode, isFieldNode } from './analysis';

/**
 * Minimal, deterministic, immutable graph infrastructure index.
 * Built once per computeArchitectureLayout() run after Stage 0 normalization.
 */
export interface LayoutGraphIndex {
  /** Fast O(1) lookup map of nodeId -> ExplorerNode */
  readonly nodeById: ReadonlyMap<string, ExplorerNode>;

  /** Incoming edges targeting each node (sorted deterministically by edge ID) */
  readonly incomingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Outgoing edges originating from each node (sorted deterministically by edge ID) */
  readonly outgoingEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incident (incoming + outgoing) edges for each node (sorted deterministically by edge ID) */
  readonly incidentEdgesByNode: ReadonlyMap<string, readonly ExplorerEdge[]>;

  /** Incoming neighbor node IDs targeting each node (sorted deterministically by node ID, deduplicated) */
  readonly incomingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Outgoing neighbor node IDs originating from each node (sorted deterministically by node ID, deduplicated) */
  readonly outgoingNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Incident neighbor node IDs for each node (sorted deterministically by node ID, deduplicated) */
  readonly incidentNeighborsByNode: ReadonlyMap<string, readonly string[]>;

  /** Resolved target production node ID for test nodes (or null if unanchored/non-test) */
  readonly parentProductionNodeId: ReadonlyMap<string, string | null>;

  /** Resolved parent CustomObject node ID for field nodes (or null if unanchored/non-field) */
  readonly parentObjectId: ReadonlyMap<string, string | null>;
}

/**
 * Resolves the target production node ID for a test node using exact P3 design rules.
 */
function resolveParentProductionNodeId(
  testNode: ExplorerNode,
  safeNodes: readonly ExplorerNode[],
  incidentEdges: readonly ExplorerEdge[],
  nodeById: Map<string, ExplorerNode>
): string | null {
  if (!isTestNode(testNode)) {
    return null;
  }

  const testName = testNode.displayName || testNode.id;

  // Step 1: Direct connected edges to non-test nodes
  const connectedCandidateIds: string[] = [];
  for (const edge of incidentEdges) {
    const otherId = edge.source === testNode.id ? edge.target : edge.source;
    const targetNode = nodeById.get(otherId);
    if (targetNode && !isTestNode(targetNode)) {
      connectedCandidateIds.push(targetNode.id);
    }
  }

  if (connectedCandidateIds.length > 0) {
    connectedCandidateIds.sort((a, b) => a.localeCompare(b));
    return connectedCandidateIds[0];
  }

  // Step 2: Naming convention match (e.g. OrderServiceTest -> OrderService)
  const strippedName = testName.replace(/(?:test|tests|testdatafactory)$/i, '');
  if (strippedName && strippedName !== testName) {
    const matchingProdNodes = safeNodes.filter(
      n => !isTestNode(n) && (n.displayName === strippedName || n.id.endsWith(`:${strippedName}`))
    );
    if (matchingProdNodes.length > 0) {
      const sortedMatching = [...matchingProdNodes].sort((a, b) => a.id.localeCompare(b.id));
      return sortedMatching[0].id;
    }
  }

  return null;
}

/**
 * Resolves the parent CustomObject/Object node ID for a field node using exact P3 design rules.
 */
function resolveParentObjectId(
  fieldNode: ExplorerNode,
  safeNodes: readonly ExplorerNode[],
  incidentEdges: readonly ExplorerEdge[],
  nodeById: Map<string, ExplorerNode>
): string | null {
  if (!isFieldNode(fieldNode)) {
    return null;
  }

  // Step 1: Check ID structure (e.g., Object:Account.Field:Phone -> Account)
  const idParts = fieldNode.id.split('.');
  if (idParts.length >= 2) {
    const parentObjName = idParts[0].replace(/^(?:Object|CustomObject|Field|CustomField):/, '');
    const parentObj = safeNodes.find(
      n =>
        (n.type === 'Object' || n.type === 'CustomObject' || n.type === 'External') &&
        (n.displayName === parentObjName || n.id.endsWith(`:${parentObjName}`))
    );
    if (parentObj) return parentObj.id;
  }

  // Step 2: Connected field-reference edges to Object / CustomObject / External nodes
  const parentObjCandidates: string[] = [];
  for (const edge of incidentEdges) {
    const otherId = edge.source === fieldNode.id ? edge.target : edge.source;
    const parentObj = nodeById.get(otherId);
    if (
      parentObj &&
      (parentObj.type === 'Object' || parentObj.type === 'CustomObject' || parentObj.type === 'External')
    ) {
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
 * Factory function creating an immutable, deterministic LayoutGraphIndex.
 * Requires nodes and edges to be normalized & sorted by ID (Stage 0 output).
 */
export function createLayoutGraphIndex(
  safeNodes: readonly ExplorerNode[],
  safeEdges: readonly ExplorerEdge[]
): LayoutGraphIndex {
  const nodeById = new Map<string, ExplorerNode>();
  const incomingEdgesByNode = new Map<string, ExplorerEdge[]>();
  const outgoingEdgesByNode = new Map<string, ExplorerEdge[]>();
  const incidentEdgesByNode = new Map<string, ExplorerEdge[]>();

  const incomingNeighborsSet = new Map<string, Set<string>>();
  const outgoingNeighborsSet = new Map<string, Set<string>>();
  const incidentNeighborsSet = new Map<string, Set<string>>();

  // Step 1: Populate nodeById and initialize edge/neighbor collections for all nodes
  for (const node of safeNodes) {
    if (nodeById.has(node.id)) {
      throw new Error(`[LayoutGraphIndex] Duplicate node ID detected: ${node.id}`);
    }
    nodeById.set(node.id, node);

    incomingEdgesByNode.set(node.id, []);
    outgoingEdgesByNode.set(node.id, []);
    incidentEdgesByNode.set(node.id, []);

    incomingNeighborsSet.set(node.id, new Set());
    outgoingNeighborsSet.set(node.id, new Set());
    incidentNeighborsSet.set(node.id, new Set());
  }

  // Step 2: Process edges (validate endpoints & duplicate edge IDs, map adjacencies)
  const seenEdgeIds = new Set<string>();

  for (const edge of safeEdges) {
    if (seenEdgeIds.has(edge.id)) {
      throw new Error(`[LayoutGraphIndex] Duplicate edge ID detected: ${edge.id}`);
    }
    seenEdgeIds.add(edge.id);

    if (!nodeById.has(edge.source)) {
      throw new Error(`[LayoutGraphIndex] Edge refers to unknown endpoint node: ${edge.source}`);
    }
    if (!nodeById.has(edge.target)) {
      throw new Error(`[LayoutGraphIndex] Edge refers to unknown endpoint node: ${edge.target}`);
    }

    const sourceOutEdges = outgoingEdgesByNode.get(edge.source)!;
    const sourceIncEdges = incidentEdgesByNode.get(edge.source)!;
    const targetInEdges = incomingEdgesByNode.get(edge.target)!;

    sourceOutEdges.push(edge);
    sourceIncEdges.push(edge);

    targetInEdges.push(edge);

    if (edge.source !== edge.target) {
      const targetIncEdges = incidentEdgesByNode.get(edge.target)!;
      targetIncEdges.push(edge);

      outgoingNeighborsSet.get(edge.source)!.add(edge.target);
      incidentNeighborsSet.get(edge.source)!.add(edge.target);

      incomingNeighborsSet.get(edge.target)!.add(edge.source);
      incidentNeighborsSet.get(edge.target)!.add(edge.source);
    }
  }

  // Step 3: Sort & freeze edge arrays and convert neighbor sets to sorted, frozen arrays
  const incomingNeighborsByNode = new Map<string, readonly string[]>();
  const outgoingNeighborsByNode = new Map<string, readonly string[]>();
  const incidentNeighborsByNode = new Map<string, readonly string[]>();

  const frozenIncomingEdges = new Map<string, readonly ExplorerEdge[]>();
  const frozenOutgoingEdges = new Map<string, readonly ExplorerEdge[]>();
  const frozenIncidentEdges = new Map<string, readonly ExplorerEdge[]>();

  for (const node of safeNodes) {
    const id = node.id;

    // Sort edges deterministically by edge ID
    const inEdges = incomingEdgesByNode.get(id)!.sort((a, b) => a.id.localeCompare(b.id));
    const outEdges = outgoingEdgesByNode.get(id)!.sort((a, b) => a.id.localeCompare(b.id));
    const incEdges = incidentEdgesByNode.get(id)!.sort((a, b) => a.id.localeCompare(b.id));

    frozenIncomingEdges.set(id, Object.freeze([...inEdges]));
    frozenOutgoingEdges.set(id, Object.freeze([...outEdges]));
    frozenIncidentEdges.set(id, Object.freeze([...incEdges]));

    // Sort neighbors deterministically by node ID
    const inNeighbors = Array.from(incomingNeighborsSet.get(id)!).sort((a, b) => a.localeCompare(b));
    const outNeighbors = Array.from(outgoingNeighborsSet.get(id)!).sort((a, b) => a.localeCompare(b));
    const incNeighbors = Array.from(incidentNeighborsSet.get(id)!).sort((a, b) => a.localeCompare(b));

    incomingNeighborsByNode.set(id, Object.freeze(inNeighbors));
    outgoingNeighborsByNode.set(id, Object.freeze(outNeighbors));
    incidentNeighborsByNode.set(id, Object.freeze(incNeighbors));
  }

  // Step 4: Resolve parent production node and parent object ID mappings
  const parentProductionNodeIdMap = new Map<string, string | null>();
  const parentObjectIdMap = new Map<string, string | null>();

  for (const node of safeNodes) {
    const id = node.id;
    const incidentEdges = frozenIncidentEdges.get(id) || [];

    const prodParent = resolveParentProductionNodeId(node, safeNodes, incidentEdges, nodeById);
    const objParent = resolveParentObjectId(node, safeNodes, incidentEdges, nodeById);

    parentProductionNodeIdMap.set(id, prodParent);
    parentObjectIdMap.set(id, objParent);
  }

  return {
    nodeById,
    incomingEdgesByNode: frozenIncomingEdges,
    outgoingEdgesByNode: frozenOutgoingEdges,
    incidentEdgesByNode: frozenIncidentEdges,
    incomingNeighborsByNode,
    outgoingNeighborsByNode,
    incidentNeighborsByNode,
    parentProductionNodeId: parentProductionNodeIdMap,
    parentObjectId: parentObjectIdMap,
  };
}

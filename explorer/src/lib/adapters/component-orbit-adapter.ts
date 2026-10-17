import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ExplorerRelationshipType,
} from '../../types/explorer';
import { computeGraphDepths, GraphDepthOptions } from '../graph-depth';

export type ComponentOrbitRoleSymbol = '☉' | '◎' | '◉' | '○';

export interface ComponentOrbitNode {
  nodeId: string;
  displayName: string;
  type: ExplorerNodeType;
  file: string;
  risk: string;
  depth: number;
  ringIndex: number;
  roleSymbol: ComponentOrbitRoleSymbol;
  isSun: boolean;
  isChildLwc: boolean;
  isSharedHub: boolean;
  dependentLwcCount: number;
  dependentLwcIds: string[];
  childLwcTargets: string[];
  metrics: {
    fanIn: number;
    fanOut: number;
    coupling: number;
    score: number;
  };
  provenance: {
    sourceGraphNodeId: string;
    nodeType: string;
  };
}

export interface ComponentOrbitEdgeProvenance {
  sourceEdgeId: string;
  sourceComponentName: string;
  targetComponentName: string;
  relationshipType: string;
}

export interface ComponentOrbitEdge {
  edgeId: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType | string;
  sourceDepth: number;
  targetDepth: number;
  isSameRing: boolean;
  isCrossRing: boolean;
  isCompositionEdge: boolean;
  isControllerEdge: boolean;
  provenance: ComponentOrbitEdgeProvenance;
}

export interface ComponentOrbitRing {
  ringIndex: number;
  depth: number;
  label: string;
  items: ComponentOrbitNode[];
  totalCount: number;
}

export interface ComponentOrbitSummary {
  focalLwcId: string;
  totalReachableNodes: number;
  totalUnreachableNodes: number;
  totalEdges: number;
  maxDepth: number;
  ringCount: number;
  childLwcCount: number;
  sharedHubCount: number;
}

export interface ComponentOrbitAvailableSun {
  id: string;
  displayName: string;
  childLwcCount: number;
  totalDependencyCount: number;
  isRootLwc: boolean;
}

export interface ComponentOrbitAdapterOptions {
  focalLwcId?: string | null;
  maxDepth?: number;
  direction?: 'dependencies' | 'dependents' | 'both';
  includeTestReferences?: boolean;
}

export interface ComponentOrbitProjection {
  focus: ComponentOrbitNode | null;
  rings: ComponentOrbitRing[];
  nodes: Record<string, ComponentOrbitNode>;
  edges: ComponentOrbitEdge[];
  availableSuns: ComponentOrbitAvailableSun[];
  unreachableNodeIds: string[];
  summary: ComponentOrbitSummary;
  options: ComponentOrbitAdapterOptions;
}

/**
 * Authoritative edge relationship types included by default in Component Orbit dependency traversal.
 * Excludes 'test-reference' by default unless includeTestReferences: true is passed.
 */
export const DEFAULT_COMPONENT_ORBIT_EDGE_TYPES: Set<string> = new Set([
  'lwc-template-child',
  'lwc-apex',
  'method-call',
  'instantiation',
  'type-reference',
  'soql-object',
  'soql-field',
  'implements',
  'trigger-handler',
  'trigger-object',
  'generic-type',
  'extends',
  'SOQL',
  'DML',
  'aura-enabled',
  'lwc-import',
  'field-reference',
  'trigger-on',
  'visualforce-controller',
  'event-publisher',
  'unknown',
]);

/**
 * Pure, deterministic semantic projection adapter for Component Orbit.
 * Maps canonical ExplorerDataSchema and a focal LWC into a focal-centric depth projection.
 * Enforces zero graph mutation, exact node identity conservation, shared Apex hub detection (◉),
 * child LWC classification (◎), and 100% input-order determinism.
 */
export function adaptComponentOrbit(
  input: ExplorerDataSchema,
  options: ComponentOrbitAdapterOptions = {}
): ComponentOrbitProjection {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Deep clone check / ensure non-mutation safety
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges: ExplorerEdge[] = [...rawEdges].sort((a, b) => {
    const sDiff = a.source.localeCompare(b.source);
    if (sDiff !== 0) return sDiff;
    const tDiff = a.target.localeCompare(b.target);
    if (tDiff !== 0) return tDiff;
    const rDiff = (a.relationshipType || '').localeCompare(b.relationshipType || '');
    if (rDiff !== 0) return rDiff;
    return (a.id || '').localeCompare(b.id || '');
  });

  const nodeMap = new Map<string, ExplorerNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const includeTestReferences = options.includeTestReferences ?? false;

  // Edge type filter sets
  const allowedEdgeTypes = new Set(DEFAULT_COMPONENT_ORBIT_EDGE_TYPES);
  if (includeTestReferences) {
    allowedEdgeTypes.add('test-reference');
  }

  // Build global LWC composition and dependency maps across full graph
  const lwcNodes = nodes.filter((n) => n.type === 'LWC');
  const lwcSet = new Set<string>(lwcNodes.map((n) => n.id));

  // Parent LWC -> Child LWCs map via lwc-template-child
  const parentToChildLwcsMap = new Map<string, Set<string>>();
  const childToParentLwcsMap = new Map<string, Set<string>>();

  // Apex -> dependent LWCs map (LWCs that directly invoke or reference this node)
  const nodeDependentLwcsMap = new Map<string, Set<string>>();
  const outgoingEdgeCountMap = new Map<string, number>();

  edges.forEach((edge) => {
    if (!allowedEdgeTypes.has(edge.relationshipType)) {
      return;
    }

    outgoingEdgeCountMap.set(edge.source, (outgoingEdgeCountMap.get(edge.source) || 0) + 1);

    const sourceIsLwc = lwcSet.has(edge.source);
    const targetIsLwc = lwcSet.has(edge.target);

    if (edge.relationshipType === 'lwc-template-child' && sourceIsLwc && targetIsLwc) {
      if (!parentToChildLwcsMap.has(edge.source)) {
        parentToChildLwcsMap.set(edge.source, new Set());
      }
      parentToChildLwcsMap.get(edge.source)!.add(edge.target);

      if (!childToParentLwcsMap.has(edge.target)) {
        childToParentLwcsMap.set(edge.target, new Set());
      }
      childToParentLwcsMap.get(edge.target)!.add(edge.source);
    }

    if (sourceIsLwc && !targetIsLwc && nodeMap.has(edge.target)) {
      if (!nodeDependentLwcsMap.has(edge.target)) {
        nodeDependentLwcsMap.set(edge.target, new Set());
      }
      nodeDependentLwcsMap.get(edge.target)!.add(edge.source);
    }
  });

  // Calculate available LWC Suns sorted deterministically
  const availableSuns: ComponentOrbitAvailableSun[] = lwcNodes
    .map((lwc) => {
      const childLwcs = parentToChildLwcsMap.get(lwc.id);
      const childLwcCount = childLwcs ? childLwcs.size : 0;
      const parents = childToParentLwcsMap.get(lwc.id);
      const isRootLwc = !parents || parents.size === 0;

      // Count direct outgoing edges from this LWC
      const outCount = outgoingEdgeCountMap.get(lwc.id) || 0;

      return {
        id: lwc.id,
        displayName: lwc.displayName || lwc.id,
        childLwcCount,
        totalDependencyCount: outCount,
        isRootLwc,
      };
    })
    .sort((a, b) => {
      // Priority 1: Root LWC first
      if (a.isRootLwc !== b.isRootLwc) return a.isRootLwc ? -1 : 1;
      // Priority 2: Higher dependency count
      if (b.totalDependencyCount !== a.totalDependencyCount) {
        return b.totalDependencyCount - a.totalDependencyCount;
      }
      // Priority 3: Higher child LWC count
      if (b.childLwcCount !== a.childLwcCount) {
        return b.childLwcCount - a.childLwcCount;
      }
      // Priority 4: Canonical ID tie-break
      return a.id.localeCompare(b.id);
    });

  // Focus resolution:
  // 1. If options.focalLwcId is provided AND exists in nodeMap AND is type 'LWC': use it.
  // 2. If options.focalLwcId is provided BUT invalid or non-LWC (e.g. ApexClass): reject and fall back to availableSuns default.
  // 3. If null/omitted: pick highest-coupling root LWC from availableSuns.
  let focalLwcId: string | null = null;

  if (options.focalLwcId && nodeMap.has(options.focalLwcId)) {
    const specifiedNode = nodeMap.get(options.focalLwcId)!;
    if (specifiedNode.type === 'LWC') {
      focalLwcId = specifiedNode.id;
    }
  }

  if (!focalLwcId && availableSuns.length > 0) {
    focalLwcId = availableSuns[0].id;
  }

  const maxDepth = options.maxDepth ?? 7;
  const direction = options.direction ?? 'dependencies';

  // Handle empty graph or missing focal LWC
  if (!focalLwcId || !nodeMap.has(focalLwcId)) {
    return {
      focus: null,
      rings: [],
      nodes: {},
      edges: [],
      availableSuns,
      unreachableNodeIds: nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b)),
      summary: {
        focalLwcId: options.focalLwcId || '',
        totalReachableNodes: 0,
        totalUnreachableNodes: nodes.length,
        totalEdges: 0,
        maxDepth: 0,
        ringCount: 0,
        childLwcCount: 0,
        sharedHubCount: 0,
      },
      options: {
        focalLwcId: options.focalLwcId ?? null,
        maxDepth,
        direction,
        includeTestReferences,
      },
    };
  }

  // Compute graph depths using pure depth engine
  const depthOptions: GraphDepthOptions = {
    maxDepth,
    direction,
    allowedEdgeTypes,
  };

  const depthResult = computeGraphDepths(nodes, edges, focalLwcId, depthOptions);
  const { depthMap, reachableNodeIds, reachableEdges } = depthResult;

  const reachableSet = new Set(reachableNodeIds);
  const unreachableNodeIds = nodes
    .map((n) => n.id)
    .filter((id) => !reachableSet.has(id))
    .sort((a, b) => a.localeCompare(b));

  // Build projected nodes
  const nodesDict: Record<string, ComponentOrbitNode> = {};
  const ringNodesMap = new Map<number, ComponentOrbitNode[]>();

  let childLwcCount = 0;
  let sharedHubCount = 0;

  reachableNodeIds.forEach((nodeId) => {
    const rawNode = nodeMap.get(nodeId)!;
    const depth = depthMap.get(nodeId) ?? 0;
    const isSun = nodeId === focalLwcId;

    // Child LWC classification: type LWC + reachable via lwc-template-child composition edge
    const isChildLwc = !isSun && rawNode.type === 'LWC' && childToParentLwcsMap.has(nodeId);
    if (isChildLwc) childLwcCount++;

    // Shared Apex Hub classification: ApexClass + referenced by >= 2 distinct reachable LWCs in projection
    const dependentLwcs = nodeDependentLwcsMap.get(nodeId);
    const dependentLwcIds = dependentLwcs
      ? Array.from(dependentLwcs).filter(l => reachableSet.has(l)).sort((a, b) => a.localeCompare(b))
      : [];
    const dependentLwcCount = dependentLwcIds.length;

    const isSharedHub = rawNode.type === 'ApexClass' && dependentLwcCount >= 2;
    if (isSharedHub) sharedHubCount++;

    // Assign role symbol:
    // ☉ = Sun (Focal LWC)
    // ◎ = Child LWC
    // ◉ = Shared Apex Hub
    // ○ = Ordinary Dependency
    let roleSymbol: ComponentOrbitRoleSymbol = '○';
    if (isSun) {
      roleSymbol = '☉';
    } else if (isChildLwc) {
      roleSymbol = '◎';
    } else if (isSharedHub) {
      roleSymbol = '◉';
    }

    // Child LWC targets for drill-down navigation
    const childLwcSet = parentToChildLwcsMap.get(nodeId);
    const childLwcTargets = childLwcSet
      ? Array.from(childLwcSet).sort((a, b) => a.localeCompare(b))
      : [];

    const cNode: ComponentOrbitNode = {
      nodeId: rawNode.id,
      displayName: rawNode.displayName || rawNode.id,
      type: rawNode.type,
      file: rawNode.file,
      risk: rawNode.risk,
      depth,
      ringIndex: depth,
      roleSymbol,
      isSun,
      isChildLwc,
      isSharedHub,
      dependentLwcCount,
      dependentLwcIds,
      childLwcTargets,
      metrics: {
        fanIn: rawNode.metrics?.fanIn ?? 0,
        fanOut: rawNode.metrics?.fanOut ?? 0,
        coupling: rawNode.metrics?.coupling ?? 0,
        score: rawNode.metrics?.score ?? 0,
      },
      provenance: {
        sourceGraphNodeId: rawNode.id,
        nodeType: rawNode.type,
      },
    };

    nodesDict[nodeId] = cNode;

    if (!ringNodesMap.has(depth)) {
      ringNodesMap.set(depth, []);
    }
    ringNodesMap.get(depth)!.push(cNode);
  });

  // Build sorted rings
  const ringIndices = Array.from(ringNodesMap.keys()).sort((a, b) => a - b);
  const rings: ComponentOrbitRing[] = [];

  ringIndices.forEach((ringIndex) => {
    const items = ringNodesMap.get(ringIndex)!;

    // Deterministic intra-ring ordering:
    // 1. Role symbol priority (☉ -> ◎ -> ◉ -> ○)
    // 2. Node Type ascending
    // 3. Coupling score descending
    // 4. Canonical nodeId tie-break
    items.sort((a, b) => {
      const rolePriority: Record<ComponentOrbitRoleSymbol, number> = {
        '☉': 0,
        '◎': 1,
        '◉': 2,
        '○': 3,
      };
      if (rolePriority[a.roleSymbol] !== rolePriority[b.roleSymbol]) {
        return rolePriority[a.roleSymbol] - rolePriority[b.roleSymbol];
      }
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (b.metrics.coupling !== a.metrics.coupling) {
        return b.metrics.coupling - a.metrics.coupling;
      }
      return a.nodeId.localeCompare(b.nodeId);
    });

    let label = `${ringIndex}-Hop Dependencies`;
    if (ringIndex === 0) {
      label = 'Focus Component (Sun)';
    } else if (ringIndex === 1) {
      label = 'Direct Dependencies (1-Hop)';
    }

    rings.push({
      ringIndex,
      depth: ringIndex,
      label,
      items,
      totalCount: items.length,
    });
  });

  // Build projected edges with provenance and relationship metadata
  const projectedEdges: ComponentOrbitEdge[] = [];

  reachableEdges.forEach((edge, index) => {
    const sourceDepth = depthMap.get(edge.source) ?? 0;
    const targetDepth = depthMap.get(edge.target) ?? 0;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    const edgeId = edge.id || `comp_orbit_edge_${edge.source}_${edge.target}_${edge.relationshipType}_${index}`;
    const isCompositionEdge = edge.relationshipType === 'lwc-template-child';
    const isControllerEdge = edge.relationshipType === 'lwc-apex';

    projectedEdges.push({
      edgeId,
      source: edge.source,
      target: edge.target,
      relationshipType: edge.relationshipType,
      sourceDepth,
      targetDepth,
      isSameRing: sourceDepth === targetDepth,
      isCrossRing: sourceDepth !== targetDepth,
      isCompositionEdge,
      isControllerEdge,
      provenance: {
        sourceEdgeId: edge.id || edgeId,
        sourceComponentName: sourceNode?.displayName || edge.source,
        targetComponentName: targetNode?.displayName || edge.target,
        relationshipType: edge.relationshipType,
      },
    });
  });

  const focalNodeObj = nodesDict[focalLwcId] || null;

  return {
    focus: focalNodeObj,
    rings,
    nodes: nodesDict,
    edges: projectedEdges,
    availableSuns,
    unreachableNodeIds,
    summary: {
      focalLwcId,
      totalReachableNodes: Object.keys(nodesDict).length,
      totalUnreachableNodes: unreachableNodeIds.length,
      totalEdges: projectedEdges.length,
      maxDepth: depthResult.maxDepthReached,
      ringCount: rings.length,
      childLwcCount,
      sharedHubCount,
    },
    options: {
      focalLwcId,
      maxDepth,
      direction,
      includeTestReferences,
    },
  };
}

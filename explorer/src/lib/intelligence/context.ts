/**
 * Architecture Intelligence Foundation - ArchitectureContext and ArchitectureIndexes Construction
 *
 * Provides factory functions for building read-only ArchitectureIndexes and
 * ArchitectureContext instances from ExplorerDataSchema with runtime immutability.
 */

import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerCycleGroup,
  ExplorerUnresolvedReference,
  ExplorerComponentImpactSummary,
  ExplorerNodeType,
  ArchitectureIndexes,
  ArchitectureContext,
  IntelligenceConfig
} from "./types";
import { ImmutableMap, DEFAULT_INTELLIGENCE_CONFIG } from "./types";

/**
 * Recursively freezes an object and all nested properties to guarantee runtime immutability.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) {
    return obj as Readonly<T>;
  }

  // Freeze Map / Set contents
  if (obj instanceof Map) {
    obj.forEach((val) => deepFreeze(val));
    return Object.freeze(obj) as unknown as Readonly<T>;
  }

  if (obj instanceof Set) {
    obj.forEach((val) => deepFreeze(val));
    return Object.freeze(obj) as unknown as Readonly<T>;
  }

  // Freeze arrays and objects
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];
  for (const name of propNames) {
    const value = obj[name];
    if (value !== null && typeof value === "object") {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}

/**
 * Performs a deep defensive clone of a JSON-serializable object.
 */
function deepClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Builds read-only O(1) ArchitectureIndexes over an Explorer dataset.
 */
export function buildArchitectureIndexes(data: ExplorerDataSchema): ArchitectureIndexes {
  // Defensive clone of data arrays to ensure context isolation
  const clonedData = deepClone(data);

  const nodeByIdMap = new Map<string, ExplorerNode>();
  const nodesByTypeMap = new Map<ExplorerNodeType, ExplorerNode[]>();
  const outgoingEdgesMap = new Map<string, ExplorerEdge[]>();
  const incomingEdgesMap = new Map<string, ExplorerEdge[]>();
  const cyclesByNodeIdMap = new Map<string, ExplorerCycleGroup[]>();
  const unresolvedBySourceIdMap = new Map<string, ExplorerUnresolvedReference[]>();
  const impactByNodeIdMap = new Map<string, ExplorerComponentImpactSummary>();

  // Index Nodes
  clonedData.nodes.forEach((node: ExplorerNode) => {
    const frozenNode = deepFreeze(node);
    nodeByIdMap.set(node.id, frozenNode);

    if (!nodesByTypeMap.has(node.type)) {
      nodesByTypeMap.set(node.type, []);
    }
    nodesByTypeMap.get(node.type)!.push(frozenNode);
  });

  const frozenNodesByType = new Map<ExplorerNodeType, readonly ExplorerNode[]>();
  nodesByTypeMap.forEach((list: ExplorerNode[], type: ExplorerNodeType) => {
    frozenNodesByType.set(type, deepFreeze(list));
  });

  // Index Edges
  clonedData.edges.forEach((edge: ExplorerEdge) => {
    const frozenEdge = deepFreeze(edge);

    if (!outgoingEdgesMap.has(edge.source)) {
      outgoingEdgesMap.set(edge.source, []);
    }
    outgoingEdgesMap.get(edge.source)!.push(frozenEdge);

    if (!incomingEdgesMap.has(edge.target)) {
      incomingEdgesMap.set(edge.target, []);
    }
    incomingEdgesMap.get(edge.target)!.push(frozenEdge);
  });

  const frozenOutgoingEdges = new Map<string, readonly ExplorerEdge[]>();
  outgoingEdgesMap.forEach((list: ExplorerEdge[], src: string) => {
    frozenOutgoingEdges.set(src, deepFreeze(list));
  });

  const frozenIncomingEdges = new Map<string, readonly ExplorerEdge[]>();
  incomingEdgesMap.forEach((list: ExplorerEdge[], tgt: string) => {
    frozenIncomingEdges.set(tgt, deepFreeze(list));
  });

  // Index Cycles
  clonedData.cycles.forEach((cycle: ExplorerCycleGroup) => {
    const frozenCycle = deepFreeze(cycle);
    cycle.nodes.forEach((nodeId: string) => {
      if (!cyclesByNodeIdMap.has(nodeId)) {
        cyclesByNodeIdMap.set(nodeId, []);
      }
      cyclesByNodeIdMap.get(nodeId)!.push(frozenCycle);
    });
  });

  const frozenCyclesByNode = new Map<string, readonly ExplorerCycleGroup[]>();
  cyclesByNodeIdMap.forEach((list: ExplorerCycleGroup[], nodeId: string) => {
    frozenCyclesByNode.set(nodeId, deepFreeze(list));
  });

  // Index Unresolved References
  clonedData.unresolvedReferences.forEach((unresolved: ExplorerUnresolvedReference) => {
    const frozenUnresolved = deepFreeze(unresolved);
    if (!unresolvedBySourceIdMap.has(unresolved.sourceNodeId)) {
      unresolvedBySourceIdMap.set(unresolved.sourceNodeId, []);
    }
    unresolvedBySourceIdMap.get(unresolved.sourceNodeId)!.push(frozenUnresolved);
  });

  const frozenUnresolvedBySource = new Map<string, readonly ExplorerUnresolvedReference[]>();
  unresolvedBySourceIdMap.forEach((list: ExplorerUnresolvedReference[], srcId: string) => {
    frozenUnresolvedBySource.set(srcId, deepFreeze(list));
  });

  // Index Impact Summaries
  if (clonedData.impactSummaries) {
    Object.entries(clonedData.impactSummaries).forEach(([nodeId, summary]: [string, ExplorerComponentImpactSummary]) => {
      impactByNodeIdMap.set(nodeId, deepFreeze(summary));
    });
  }

  return deepFreeze({
    nodeById: new ImmutableMap(nodeByIdMap),
    nodesByType: new ImmutableMap(frozenNodesByType),
    outgoingEdges: new ImmutableMap(frozenOutgoingEdges),
    incomingEdges: new ImmutableMap(frozenIncomingEdges),
    cyclesByNodeId: new ImmutableMap(frozenCyclesByNode),
    unresolvedBySourceId: new ImmutableMap(frozenUnresolvedBySource),
    impactByNodeId: new ImmutableMap(impactByNodeIdMap)
  }) as ArchitectureIndexes;
}

/**
 * Creates a read-only ArchitectureContext over an Explorer dataset.
 */
export function createArchitectureContext(
  data: ExplorerDataSchema,
  config: IntelligenceConfig = DEFAULT_INTELLIGENCE_CONFIG
): ArchitectureContext {
  const clonedData = deepFreeze(deepClone(data));
  const clonedConfig = deepFreeze(deepClone(config));
  const indexes = buildArchitectureIndexes(data);

  return deepFreeze({
    data: clonedData,
    config: clonedConfig,
    indexes
  }) as ArchitectureContext;
}

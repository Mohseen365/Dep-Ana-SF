/**
 * Architecture Intelligence Foundation - ArchitectureContext and ArchitectureIndexes Construction
 *
 * Provides factory functions for building read-only ArchitectureIndexes and
 * ArchitectureContext instances from ExplorerDataSchema.
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
import { DEFAULT_INTELLIGENCE_CONFIG } from "./types";

/**
 * Builds read-only O(1) ArchitectureIndexes over an Explorer dataset.
 */
export function buildArchitectureIndexes(data: ExplorerDataSchema): ArchitectureIndexes {
  const nodeByIdMap = new Map<string, ExplorerNode>();
  const nodesByTypeMap = new Map<ExplorerNodeType, ExplorerNode[]>();
  const outgoingEdgesMap = new Map<string, ExplorerEdge[]>();
  const incomingEdgesMap = new Map<string, ExplorerEdge[]>();
  const cyclesByNodeIdMap = new Map<string, ExplorerCycleGroup[]>();
  const unresolvedBySourceIdMap = new Map<string, ExplorerUnresolvedReference[]>();
  const impactByNodeIdMap = new Map<string, ExplorerComponentImpactSummary>();

  // Index Nodes
  data.nodes.forEach((node: ExplorerNode) => {
    nodeByIdMap.set(node.id, Object.freeze({ ...node }));

    if (!nodesByTypeMap.has(node.type)) {
      nodesByTypeMap.set(node.type, []);
    }
    nodesByTypeMap.get(node.type)!.push(Object.freeze({ ...node }));
  });

  // Freeze node lists per type
  nodesByTypeMap.forEach((list: ExplorerNode[], type: ExplorerNodeType) => {
    nodesByTypeMap.set(type, Object.freeze(list) as unknown as ExplorerNode[]);
  });

  // Index Edges
  data.edges.forEach((edge: ExplorerEdge) => {
    const frozenEdge = Object.freeze({ ...edge });

    if (!outgoingEdgesMap.has(edge.source)) {
      outgoingEdgesMap.set(edge.source, []);
    }
    outgoingEdgesMap.get(edge.source)!.push(frozenEdge);

    if (!incomingEdgesMap.has(edge.target)) {
      incomingEdgesMap.set(edge.target, []);
    }
    incomingEdgesMap.get(edge.target)!.push(frozenEdge);
  });

  // Freeze edge lists per node
  outgoingEdgesMap.forEach((list: ExplorerEdge[], src: string) => {
    outgoingEdgesMap.set(src, Object.freeze(list) as unknown as ExplorerEdge[]);
  });
  incomingEdgesMap.forEach((list: ExplorerEdge[], tgt: string) => {
    incomingEdgesMap.set(tgt, Object.freeze(list) as unknown as ExplorerEdge[]);
  });

  // Index Cycles
  data.cycles.forEach((cycle: ExplorerCycleGroup) => {
    const frozenCycle = Object.freeze({ ...cycle, nodes: [...cycle.nodes] });
    cycle.nodes.forEach((nodeId: string) => {
      if (!cyclesByNodeIdMap.has(nodeId)) {
        cyclesByNodeIdMap.set(nodeId, []);
      }
      cyclesByNodeIdMap.get(nodeId)!.push(frozenCycle);
    });
  });

  cyclesByNodeIdMap.forEach((list: ExplorerCycleGroup[], nodeId: string) => {
    cyclesByNodeIdMap.set(nodeId, Object.freeze(list) as unknown as ExplorerCycleGroup[]);
  });

  // Index Unresolved References
  data.unresolvedReferences.forEach((unresolved: ExplorerUnresolvedReference) => {
    const frozenUnresolved = Object.freeze({ ...unresolved });
    if (!unresolvedBySourceIdMap.has(unresolved.sourceNodeId)) {
      unresolvedBySourceIdMap.set(unresolved.sourceNodeId, []);
    }
    unresolvedBySourceIdMap.get(unresolved.sourceNodeId)!.push(frozenUnresolved);
  });

  unresolvedBySourceIdMap.forEach((list: ExplorerUnresolvedReference[], srcId: string) => {
    unresolvedBySourceIdMap.set(srcId, Object.freeze(list) as unknown as ExplorerUnresolvedReference[]);
  });

  // Index Impact Summaries
  if (data.impactSummaries) {
    Object.entries(data.impactSummaries).forEach(([nodeId, summary]: [string, ExplorerComponentImpactSummary]) => {
      impactByNodeIdMap.set(
        nodeId,
        Object.freeze({
          ...summary,
          directDependencies: [...summary.directDependencies],
          directDependents: [...summary.directDependents],
          transitiveDependencies: [...summary.transitiveDependencies],
          transitiveDependents: [...summary.transitiveDependents],
          impactedTests: [...summary.impactedTests]
        })
      );
    });
  }

  return Object.freeze({
    nodeById: nodeByIdMap,
    nodesByType: nodesByTypeMap,
    outgoingEdges: outgoingEdgesMap,
    incomingEdges: incomingEdgesMap,
    cyclesByNodeId: cyclesByNodeIdMap,
    unresolvedBySourceId: unresolvedBySourceIdMap,
    impactByNodeId: impactByNodeIdMap
  });
}

/**
 * Creates a read-only ArchitectureContext over an Explorer dataset.
 */
export function createArchitectureContext(
  data: ExplorerDataSchema,
  config: IntelligenceConfig = DEFAULT_INTELLIGENCE_CONFIG
): ArchitectureContext {
  const indexes = buildArchitectureIndexes(data);

  return Object.freeze({
    data: Object.freeze({ ...data }),
    config: Object.freeze({ ...config }),
    indexes
  });
}

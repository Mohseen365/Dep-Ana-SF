import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ElementDefinition, NodeDefinition, EdgeDefinition } from 'cytoscape';
import type { ArchitectureFinding, FindingSeverity } from './intelligence';

export interface GraphNodeData {
  id: string;
  label: string;
  type: string;
  risk: string;
  coupling: number;
  fanIn: number;
  fanOut: number;
  isTest: boolean;
  hasCycles: boolean;
  hasUnresolved: boolean;
  file: string;
  findingCount?: number;
  maxFindingSeverity?: FindingSeverity | null;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  method: string | null;
  unresolved: boolean;
  evidence: string;
  isInterFeature: boolean;
}

export function getFindingStatsForNode(
  nodeId: string,
  findings?: ArchitectureFinding[]
): { findingCount: number; maxFindingSeverity: FindingSeverity | null } {
  if (!findings || findings.length === 0) {
    return { findingCount: 0, maxFindingSeverity: null };
  }

  let count = 0;
  let maxSev: FindingSeverity | null = null;
  const severityRank: Record<FindingSeverity, number> = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1,
  };

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    if (f.nodeIds && f.nodeIds.includes(nodeId)) {
      count++;
      if (!maxSev || severityRank[f.severity] > severityRank[maxSev]) {
        maxSev = f.severity;
      }
    }
  }

  return { findingCount: count, maxFindingSeverity: maxSev };
}

export function buildGraphElements(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  findings?: ArchitectureFinding[],
  featureMap?: Map<string, string>
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  
  // Fast Set lookup for known nodes
  const knownNodeIds = new Set<string>(nodes.map(n => n.id));
  
  // Add all explicit nodes
  for (let i = 0; i < nodes.length; i++) {
    elements.push(createNodeElement(nodes[i], findings));
  }
  
  // Check for implicit external edge endpoints
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!knownNodeIds.has(edge.source)) {
      knownNodeIds.add(edge.source);
      elements.push(createExternalNodeElement(edge.source));
    }
    if (!knownNodeIds.has(edge.target)) {
      knownNodeIds.add(edge.target);
      elements.push(createExternalNodeElement(edge.target));
    }
    elements.push(createEdgeElement(edge, featureMap));
  }
  
  return elements;
}

function createNodeElement(
  node: ExplorerNode,
  findings?: ArchitectureFinding[]
): NodeDefinition {
  const { findingCount, maxFindingSeverity } = getFindingStatsForNode(node.id, findings);

  const nodeData: GraphNodeData = {
    id: node.id,
    label: node.displayName,
    type: node.type,
    risk: node.risk,
    coupling: node.metrics.coupling,
    fanIn: node.metrics.fanIn,
    fanOut: node.metrics.fanOut,
    isTest: Boolean(node.behavior?.isTest),
    hasCycles: node.refactoringReadiness.hasCycles,
    hasUnresolved: node.refactoringReadiness.hasUnresolved,
    file: node.file,
    findingCount,
    maxFindingSeverity,
  };
  
  return {
    data: nodeData,
    group: 'nodes'
  };
}

function createExternalNodeElement(nodeId: string): NodeDefinition {
  const parts = nodeId.split(':');
  const type = parts.length >= 2 ? parts[0] : 'External';
  const name = parts.length >= 2 ? parts.slice(1).join(':') : nodeId;
  
  const nodeData: GraphNodeData = {
    id: nodeId,
    label: name,
    type: type,
    risk: 'LOW',
    coupling: 0,
    fanIn: 0,
    fanOut: 0,
    isTest: false,
    hasCycles: false,
    hasUnresolved: false,
    file: ''
  };
  
  return {
    data: nodeData,
    group: 'nodes'
  };
}

function createEdgeElement(
  edge: ExplorerEdge,
  featureMap?: Map<string, string>
): EdgeDefinition {
  const sourceFeature = featureMap?.get(edge.source);
  const targetFeature = featureMap?.get(edge.target);
  // isInterFeature: true only when BOTH endpoints have a known, non-utility feature
  // and those features differ. Unassigned / Shared edges are treated as intra-feature.
  const isInterFeature = Boolean(
    sourceFeature &&
    targetFeature &&
    sourceFeature !== 'Unassigned' &&
    targetFeature !== 'Unassigned' &&
    sourceFeature !== 'Shared' &&
    targetFeature !== 'Shared' &&
    sourceFeature !== targetFeature
  );

  const edgeData: GraphEdgeData = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType: edge.relationshipType,
    method: edge.method,
    unresolved: edge.unresolved,
    evidence: edge.evidence,
    isInterFeature,
  };
  
  return {
    data: edgeData,
    group: 'edges'
  };
}

export function createNodeMap(nodes: ExplorerNode[]): Map<string, ExplorerNode> {
  const map = new Map<string, ExplorerNode>();
  for (let i = 0; i < nodes.length; i++) {
    map.set(nodes[i].id, nodes[i]);
  }
  return map;
}

export function getNodeById(
  nodes: ExplorerNode[],
  nodeId: string
): ExplorerNode | undefined {
  return nodes.find(n => n.id === nodeId);
}

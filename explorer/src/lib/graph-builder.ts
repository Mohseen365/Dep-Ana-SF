import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ElementDefinition, NodeDefinition, EdgeDefinition } from 'cytoscape';

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
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  method: string | null;
  unresolved: boolean;
  evidence: string;
}

export function buildGraphElements(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  
  // Track known node IDs from explicit nodes
  const knownNodeIds = new Set<string>();
  
  // Add all explicit nodes from the data
  for (const node of nodes) {
    knownNodeIds.add(node.id);
    elements.push(createNodeElement(node));
  }
  
  // Check for edge endpoints that are not in explicit nodes
  // These may be external dependencies or unresolved references
  for (const edge of edges) {
    // Add source if not known
    if (!knownNodeIds.has(edge.source)) {
      knownNodeIds.add(edge.source);
      elements.push(createExternalNodeElement(edge.source));
    }
    
    // Add target if not known
    if (!knownNodeIds.has(edge.target)) {
      knownNodeIds.add(edge.target);
      elements.push(createExternalNodeElement(edge.target));
    }
    
    // Add the edge
    elements.push(createEdgeElement(edge));
  }
  
  return elements;
}

function createNodeElement(node: ExplorerNode): NodeDefinition {
  const nodeData: GraphNodeData = {
    id: node.id,
    label: node.displayName,
    type: node.type,
    risk: node.risk,
    coupling: node.metrics.coupling,
    fanIn: node.metrics.fanIn,
    fanOut: node.metrics.fanOut,
    isTest: node.behavior.isTest,
    hasCycles: node.refactoringReadiness.hasCycles,
    hasUnresolved: node.refactoringReadiness.hasUnresolved,
    file: node.file
  };
  
  return {
    data: nodeData,
    group: 'nodes'
  };
}

function createExternalNodeElement(nodeId: string): NodeDefinition {
  // Parse node ID - format is typically "Type:Name"
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

function createEdgeElement(edge: ExplorerEdge): EdgeDefinition {
  const edgeData: GraphEdgeData = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType: edge.relationshipType,
    method: edge.method,
    unresolved: edge.unresolved,
    evidence: edge.evidence
  };
  
  return {
    data: edgeData,
    group: 'edges'
  };
}

export function getNodeById(
  nodes: ExplorerNode[],
  nodeId: string
): ExplorerNode | undefined {
  return nodes.find(n => n.id === nodeId);
}
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema, Position } from '../types/explorer';
import type { ArchitectureFinding } from './intelligence';
import { runArchitectureRules } from './intelligence';

export type RefactoringOperationType =
  | 'add-node'
  | 'remove-node'
  | 'add-edge'
  | 'remove-edge'
  | 'modify-node';

export interface AddNodeOperation {
  type: 'add-node';
  node: ExplorerNode;
}

export interface RemoveNodeOperation {
  type: 'remove-node';
  nodeId: string;
}

export interface AddEdgeOperation {
  type: 'add-edge';
  edge: ExplorerEdge;
}

export interface RemoveEdgeOperation {
  type: 'remove-edge';
  edgeId: string;
}

export interface ModifyNodeOperation {
  type: 'modify-node';
  nodeId: string;
  changes: Partial<ExplorerNode>;
}

export type RefactoringOperation =
  | AddNodeOperation
  | RemoveNodeOperation
  | AddEdgeOperation
  | RemoveEdgeOperation
  | ModifyNodeOperation;

export interface RefactoringStep {
  id: string;
  title: string;
  description: string;
  operations: RefactoringOperation[];
}

export interface RefactoringProposal {
  id: string;
  title: string;
  description: string;
  originNodeId?: string;
  originFindingId?: string;
  steps: RefactoringStep[];
}

export interface FindingDelta {
  resolved: ArchitectureFinding[];
  introduced: ArchitectureFinding[];
  unchanged: ArchitectureFinding[];
  changed: ArchitectureFinding[];
}

export interface StepImpact {
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  affectedComponentNames: string[];
  findingDelta: FindingDelta;
  stepDescription: string;
}

export function applySimulationOperations(
  graphData: ExplorerDataSchema,
  operations: RefactoringOperation[]
): ExplorerDataSchema {
  let nodes = [...graphData.nodes];
  let edges = [...graphData.edges];

  for (const op of operations) {
    switch (op.type) {
      case 'add-node': {
        if (!nodes.some(n => n.id === op.node.id)) {
          nodes.push({ ...op.node });
        }
        break;
      }
      case 'remove-node': {
        nodes = nodes.filter(n => n.id !== op.nodeId);
        edges = edges.filter(e => e.source !== op.nodeId && e.target !== op.nodeId);
        break;
      }
      case 'add-edge': {
        if (!edges.some(e => e.id === op.edge.id)) {
          edges.push({ ...op.edge });
        }
        break;
      }
      case 'remove-edge': {
        edges = edges.filter(e => e.id !== op.edgeId);
        break;
      }
      case 'modify-node': {
        nodes = nodes.map(n => {
          if (n.id === op.nodeId) {
            return { ...n, ...op.changes };
          }
          return n;
        });
        break;
      }
    }
  }

  return {
    ...graphData,
    nodes,
    edges,
  };
}

export function computeFindingDelta(
  beforeFindings: ArchitectureFinding[],
  afterFindings: ArchitectureFinding[]
): FindingDelta {
  const beforeMap = new Map<string, ArchitectureFinding>();
  beforeFindings.forEach(f => beforeMap.set(f.id, f));

  const afterMap = new Map<string, ArchitectureFinding>();
  afterFindings.forEach(f => afterMap.set(f.id, f));

  const resolved: ArchitectureFinding[] = [];
  const introduced: ArchitectureFinding[] = [];
  const unchanged: ArchitectureFinding[] = [];
  const changed: ArchitectureFinding[] = [];

  for (const [id, before] of beforeMap.entries()) {
    if (!afterMap.has(id)) {
      resolved.push(before);
    } else {
      const after = afterMap.get(id)!;
      if (
        after.severity !== before.severity ||
        after.description !== before.description ||
        JSON.stringify(after.affectedNodeIds) !== JSON.stringify(before.affectedNodeIds)
      ) {
        changed.push(after);
      } else {
        unchanged.push(after);
      }
    }
  }

  for (const [id, after] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      introduced.push(after);
    }
  }

  return { resolved, introduced, unchanged, changed };
}

export function computeStepImpact(
  baseGraph: ExplorerDataSchema,
  currentGraph: ExplorerDataSchema,
  beforeFindings: ArchitectureFinding[],
  operations: RefactoringOperation[]
): StepImpact {
  const affectedNodeIdsSet = new Set<string>();
  const affectedEdgeIdsSet = new Set<string>();

  for (const op of operations) {
    switch (op.type) {
      case 'add-node':
        affectedNodeIdsSet.add(op.node.id);
        break;
      case 'remove-node':
        affectedNodeIdsSet.add(op.nodeId);
        break;
      case 'add-edge':
        affectedEdgeIdsSet.add(op.edge.id);
        affectedNodeIdsSet.add(op.edge.source);
        affectedNodeIdsSet.add(op.edge.target);
        break;
      case 'remove-edge':
        affectedEdgeIdsSet.add(op.edgeId);
        const removedEdge = baseGraph.edges.find(e => e.id === op.edgeId);
        if (removedEdge) {
          affectedNodeIdsSet.add(removedEdge.source);
          affectedNodeIdsSet.add(removedEdge.target);
        }
        break;
      case 'modify-node':
        affectedNodeIdsSet.add(op.nodeId);
        break;
    }
  }

  const affectedComponentNames = Array.from(affectedNodeIdsSet)
    .map(id => {
      const node = currentGraph.nodes.find(n => n.id === id) || baseGraph.nodes.find(n => n.id === id);
      return node ? node.displayName || node.id : id;
    })
    .sort();

  const afterFindings = runArchitectureRules(currentGraph);
  const findingDelta = computeFindingDelta(beforeFindings, afterFindings);

  const stepDescription = operations
    .map(op => {
      switch (op.type) {
        case 'add-node': return `Add node ${op.node.displayName || op.node.id}`;
        case 'remove-node': return `Remove node ${op.nodeId}`;
        case 'add-edge': return `Add dependency from ${op.edge.source} to ${op.edge.target}`;
        case 'remove-edge': return `Remove dependency ${op.edge.id}`;
        case 'modify-node': return `Modify node ${op.nodeId}`;
      }
    })
    .join('; ');

  return {
    affectedNodeIds: Array.from(affectedNodeIdsSet),
    affectedEdgeIds: Array.from(affectedEdgeIdsSet),
    affectedComponentNames,
    findingDelta,
    stepDescription,
  };
}

export function computeTemporarySimulatedPositions(
  simulatedNodes: ExplorerNode[],
  simulatedEdges: ExplorerEdge[],
  basePositions: Record<string, Position>
): Record<string, Position> {
  const resultPositions: Record<string, Position> = { ...basePositions };

  const unpositionedNodes = simulatedNodes.filter(n => !resultPositions[n.id]);

  if (unpositionedNodes.length === 0) {
    return resultPositions;
  }

  unpositionedNodes.forEach((node, index) => {
    const connectedEdges = simulatedEdges.filter(
      e => e.source === node.id || e.target === node.id
    );

    const neighborIds = connectedEdges
      .map(e => (e.source === node.id ? e.target : e.source))
      .filter(neighborId => resultPositions[neighborId]);

    if (neighborIds.length > 0) {
      let sumX = 0;
      let sumY = 0;
      neighborIds.forEach(id => {
        sumX += resultPositions[id].x;
        sumY += resultPositions[id].y;
      });

      const offsetAngle = (index * 0.5) % (2 * Math.PI);
      const offsetRadius = 120;

      resultPositions[node.id] = {
        x: sumX / neighborIds.length + Math.cos(offsetAngle) * offsetRadius,
        y: sumY / neighborIds.length + Math.sin(offsetAngle) * offsetRadius,
      };
    } else {
      resultPositions[node.id] = {
        x: 400 + (index % 5) * 150,
        y: 400 + Math.floor(index / 5) * 150,
      };
    }
  });

  return resultPositions;
}

export function createProposalFromTargetNodes(
  targetNodeIds: string[],
  graphData: ExplorerDataSchema
): RefactoringProposal {
  const primaryNode = graphData.nodes.find(n => n.id === targetNodeIds[0]);
  const title = primaryNode
    ? `Refactor & Decouple ${primaryNode.displayName || primaryNode.id}`
    : `Refactor Component Cluster`;

  const helperNodeId = `${primaryNode?.id || 'component'}-extracted-helper`;
  const helperNode: ExplorerNode = {
    id: helperNodeId,
    displayName: `${primaryNode?.displayName || 'Component'}Helper`,
    type: 'ApexClass',
    layer: 'application',
    risk: 'LOW',
    metrics: { linesOfCode: 80, fanIn: 1, fanOut: 1, cyclomaticComplexity: 3, weightedMethodCount: 3 },
  };

  const newEdge: ExplorerEdge = {
    id: `edge-${primaryNode?.id || 'orig'}-to-${helperNodeId}`,
    source: primaryNode?.id || targetNodeIds[0],
    target: helperNodeId,
    relationshipType: 'calls',
    label: 'delegates to',
  };

  return {
    id: `proposal-${Date.now()}`,
    title,
    description: `Extract helper responsibility and decouple high fan-out dependencies for ${primaryNode?.displayName || 'target components'}.`,
    originNodeId: targetNodeIds[0],
    steps: [
      {
        id: 'step-1',
        title: `Extract Sub-Component from ${primaryNode?.displayName || 'Target'}`,
        description: `Isolate high-coupling responsibility from ${primaryNode?.displayName || 'Target'} into a dedicated Apex Service component.`,
        operations: [
          { type: 'add-node', node: helperNode },
          { type: 'add-edge', edge: newEdge },
        ],
      },
      {
        id: 'step-2',
        title: `Reroute Direct Calls`,
        description: `Direct downstream callers to use the extracted service helper directly.`,
        operations: targetNodeIds.slice(1).map(targetId => ({
          type: 'add-edge',
          edge: {
            id: `edge-${targetId}-to-${helperNodeId}`,
            source: targetId,
            target: helperNodeId,
            relationshipType: 'calls',
            label: 'calls helper',
          },
        })),
      },
    ],
  };
}

export function createProposalFromFinding(
  finding: ArchitectureFinding,
  graphData: ExplorerDataSchema
): RefactoringProposal {
  const affectedNodes = finding.affectedNodeIds
    .map(id => graphData.nodes.find(n => n.id === id))
    .filter((n): n is ExplorerNode => n !== undefined);

  const primaryNode = affectedNodes[0];

  return {
    id: `proposal-finding-${finding.id}`,
    title: `Remediate ${finding.title}`,
    description: `Targeted architectural sequence to resolve ${finding.title} (${finding.severity} severity).`,
    originFindingId: finding.id,
    originNodeId: primaryNode?.id,
    steps: [
      {
        id: 'step-remediate-1',
        title: `Extract Responsibility from ${primaryNode?.displayName || 'Component'}`,
        description: `Decouple cyclic / high-coupling dependencies reported in finding ${finding.id}.`,
        operations: primaryNode
          ? [
              {
                type: 'add-node',
                node: {
                  id: `${primaryNode.id}-service`,
                  displayName: `${primaryNode.displayName || primaryNode.id}Service`,
                  type: 'ApexClass',
                  layer: 'domain',
                  risk: 'LOW',
                  metrics: { linesOfCode: 100, fanIn: 1, fanOut: 0, cyclomaticComplexity: 4, weightedMethodCount: 4 },
                },
              },
              {
                type: 'add-edge',
                edge: {
                  id: `edge-${primaryNode.id}-to-${primaryNode.id}-service`,
                  source: primaryNode.id,
                  target: `${primaryNode.id}-service`,
                  relationshipType: 'calls',
                  label: 'uses service',
                },
              },
            ]
          : [],
      },
    ],
  };
}

import { describe, it, expect } from 'vitest';
import {
  applySimulationOperations,
  computeFindingDelta,
  computeStepImpact,
  computeTemporarySimulatedPositions,
  createProposalFromTargetNodes,
  createProposalFromFinding,
  type RefactoringOperation,
} from './refactoring-simulation';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureFinding } from './intelligence';

const sampleGraph: ExplorerDataSchema = {
  metadata: {
    generatedAt: '2025-01-01',
    version: '1.0',
    analyzerVersion: '1.0',
    totalNodes: 3,
    totalEdges: 2,
    sourceProject: 'test-project',
  },
  nodes: [
    { id: 'node-1', displayName: 'ServiceA', type: 'ApexClass', layer: 'application', risk: 'LOW', metrics: { linesOfCode: 100, fanIn: 0, fanOut: 1, cyclomaticComplexity: 5, weightedMethodCount: 5 } },
    { id: 'node-2', displayName: 'ServiceB', type: 'ApexClass', layer: 'domain', risk: 'MEDIUM', metrics: { linesOfCode: 200, fanIn: 1, fanOut: 1, cyclomaticComplexity: 10, weightedMethodCount: 10 } },
    { id: 'node-3', displayName: 'RepoC', type: 'ApexClass', layer: 'schema', risk: 'LOW', metrics: { linesOfCode: 50, fanIn: 1, fanOut: 0, cyclomaticComplexity: 2, weightedMethodCount: 2 } },
  ],
  edges: [
    { id: 'edge-1-2', source: 'node-1', target: 'node-2', relationshipType: 'calls' },
    { id: 'edge-2-3', source: 'node-2', target: 'node-3', relationshipType: 'calls' },
  ],
  impactSummaries: {},
  entryPoints: [],
  databaseAccess: [],
  cycles: [],
  unresolvedReferences: [],
  metrics: {
    totalComponents: 3,
    highRiskComponents: 0,
    mediumRiskComponents: 1,
    lowRiskComponents: 2,
    circularDependencyCount: 0,
    unresolvedReferenceCount: 0,
    averageCyclomaticComplexity: 5.67,
  },
  riskDistribution: { HIGH: 0, MEDIUM: 1, LOW: 2 },
  layerDistribution: { presentation: 0, application: 1, domain: 1, schema: 1 },
};

describe('Refactoring Simulation Engine', () => {
  it('should apply add-node and add-edge operations immutably', () => {
    const newNode: ExplorerNode = {
      id: 'node-new',
      displayName: 'ServiceHelper',
      type: 'ApexClass',
      layer: 'application',
      risk: 'LOW',
      metrics: { linesOfCode: 40, fanIn: 1, fanOut: 0, cyclomaticComplexity: 2, weightedMethodCount: 2 },
    };
    const newEdge: ExplorerEdge = {
      id: 'edge-1-new',
      source: 'node-1',
      target: 'node-new',
      relationshipType: 'calls',
    };

    const ops: RefactoringOperation[] = [
      { type: 'add-node', node: newNode },
      { type: 'add-edge', edge: newEdge },
    ];

    const result = applySimulationOperations(sampleGraph, ops);

    expect(sampleGraph.nodes.length).toBe(3);
    expect(result.nodes.length).toBe(4);
    expect(result.edges.length).toBe(3);
    expect(result.nodes.find(n => n.id === 'node-new')).toBeDefined();
  });

  it('should apply remove-node and cascade remove connected edges', () => {
    const ops: RefactoringOperation[] = [
      { type: 'remove-node', nodeId: 'node-2' },
    ];

    const result = applySimulationOperations(sampleGraph, ops);

    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(0);
  });

  it('should compute finding delta correctly', () => {
    const finding1: ArchitectureFinding = {
      id: 'rule-1',
      ruleId: 'HIGH_FAN_OUT',
      severity: 'HIGH',
      title: 'High Fan-out',
      description: 'Component node-1 has fan-out 10',
      affectedNodeIds: ['node-1'],
    };
    const finding2: ArchitectureFinding = {
      id: 'rule-2',
      ruleId: 'CIRCULAR_DEPENDENCY',
      severity: 'CRITICAL',
      title: 'Circular dependency',
      description: 'Cycle detected between node-1 and node-2',
      affectedNodeIds: ['node-1', 'node-2'],
    };

    const before = [finding1, finding2];
    const after = [
      { ...finding1, description: 'Component node-1 has fan-out 5', severity: 'MEDIUM' as const },
    ];

    const delta = computeFindingDelta(before, after);

    expect(delta.resolved.length).toBe(1);
    expect(delta.resolved[0].id).toBe('rule-2');
    expect(delta.changed.length).toBe(1);
    expect(delta.changed[0].id).toBe('rule-1');
    expect(delta.introduced.length).toBe(0);
  });

  it('should compute deterministic temporary simulated positions using neighbor centroids', () => {
    const basePositions = {
      'node-1': { x: 100, y: 100 },
      'node-2': { x: 300, y: 100 },
    };

    const simulatedNodes = [
      ...sampleGraph.nodes,
      { id: 'node-sim', displayName: 'Sim', type: 'ApexClass' } as ExplorerNode,
    ];
    const simulatedEdges = [
      ...sampleGraph.edges,
      { id: 'edge-sim', source: 'node-1', target: 'node-sim' } as ExplorerEdge,
    ];

    const positions = computeTemporarySimulatedPositions(simulatedNodes, simulatedEdges, basePositions);

    expect(positions['node-1']).toEqual({ x: 100, y: 100 });
    expect(positions['node-2']).toEqual({ x: 300, y: 100 });
    expect(positions['node-sim']).toBeDefined();
    expect(typeof positions['node-sim'].x).toBe('number');
    expect(typeof positions['node-sim'].y).toBe('number');
  });

  it('should create proposal from target nodes and finding', () => {
    const proposalFromNodes = createProposalFromTargetNodes(['node-1', 'node-2'], sampleGraph);
    expect(proposalFromNodes.steps.length).toBe(2);
    expect(proposalFromNodes.originNodeId).toBe('node-1');

    const finding: ArchitectureFinding = {
      id: 'f-1',
      ruleId: 'HIGH_RISK_SURFACE',
      severity: 'HIGH',
      title: 'High Risk Surface',
      description: 'High risk component',
      affectedNodeIds: ['node-2'],
    };

    const proposalFromFinding = createProposalFromFinding(finding, sampleGraph);
    expect(proposalFromFinding.originFindingId).toBe('f-1');
    expect(proposalFromFinding.steps.length).toBe(1);
  });
});

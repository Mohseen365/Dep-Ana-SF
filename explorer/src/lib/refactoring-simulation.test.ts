import { describe, it, expect } from 'vitest';
import {
  applySimulationOperations,
  computeFindingDelta,
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
  summary: {
    nodeCount: 3,
    edgeCount: 2,
    highRiskCount: 0,
    mediumRiskCount: 1,
    lowRiskCount: 2,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: { files: 3, apexClasses: 3, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 },
  },
  nodes: [
    {
      id: 'node-1',
      displayName: 'ServiceA',
      type: 'ApexClass',
      file: 'ServiceA.cls',
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 5 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'node-2',
      displayName: 'ServiceB',
      type: 'ApexClass',
      file: 'ServiceB.cls',
      risk: 'MEDIUM',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'node-3',
      displayName: 'RepoC',
      type: 'ApexClass',
      file: 'RepoC.cls',
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 3 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ],
  edges: [
    {
      id: 'edge-1-2',
      source: 'node-1',
      target: 'node-2',
      relationshipType: 'method-call',
      method: 'doCall',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: 1,
      column: 1,
      methodOwner: 'node-2',
      file: 'ServiceA.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ServiceA' },
        target: { type: 'ApexClass', name: 'ServiceB' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    },
    {
      id: 'edge-2-3',
      source: 'node-2',
      target: 'node-3',
      relationshipType: 'method-call',
      method: 'doCall',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: 1,
      column: 1,
      methodOwner: 'node-3',
      file: 'ServiceB.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ServiceB' },
        target: { type: 'ApexClass', name: 'RepoC' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    },
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
      file: 'ServiceHelper.cls',
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 3 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    };
    const newEdge: ExplorerEdge = {
      id: 'edge-1-new',
      source: 'node-1',
      target: 'node-new',
      relationshipType: 'method-call',
      method: 'doCall',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: 1,
      column: 1,
      methodOwner: 'node-new',
      file: 'ServiceA.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ServiceA' },
        target: { type: 'ApexClass', name: 'ServiceHelper' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
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
      type: 'HIGH_FAN_OUT',
      severity: 'HIGH',
      title: 'High Fan-out',
      description: 'Component node-1 has fan-out 10',
      nodeIds: ['node-1'],
      edgeIds: [],
      evidence: [],
      provenance: { origin: 'DERIVED_RULE', source: 'rule', facts: {} },
      rule: { ruleId: 'HIGH_FAN_OUT', ruleVersion: '1.0', name: 'High Fan Out' },
    };
    const finding2: ArchitectureFinding = {
      id: 'rule-2',
      type: 'CIRCULAR_DEPENDENCY',
      severity: 'CRITICAL',
      title: 'Circular dependency',
      description: 'Cycle detected between node-1 and node-2',
      nodeIds: ['node-1', 'node-2'],
      edgeIds: [],
      evidence: [],
      provenance: { origin: 'DERIVED_RULE', source: 'rule', facts: {} },
      rule: { ruleId: 'CIRCULAR_DEPENDENCY', ruleVersion: '1.0', name: 'Circular Dependency' },
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
      type: 'HIGH_RISK_SURFACE',
      severity: 'HIGH',
      title: 'High Risk Surface',
      description: 'High risk component',
      nodeIds: ['node-2'],
      edgeIds: [],
      evidence: [],
      provenance: { origin: 'DERIVED_RULE', source: 'rule', facts: {} },
      rule: { ruleId: 'HIGH_RISK_SURFACE', ruleVersion: '1.0', name: 'High Risk Surface' },
    };

    const proposalFromFinding = createProposalFromFinding(finding, sampleGraph);
    expect(proposalFromFinding.originFindingId).toBe('f-1');
    expect(proposalFromFinding.steps.length).toBe(1);
  });
});

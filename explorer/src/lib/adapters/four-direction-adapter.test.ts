import { describe, it, expect } from 'vitest';
import { adaptFourDirectionView } from './four-direction-adapter';
import { ExplorerDataSchema } from '../../types/explorer';

describe('Four-Direction Adapter', () => {
  const sampleSchema: ExplorerDataSchema = {
    schemaVersion: '1.0',
    analyzerVersion: '1.0',
    generatedAt: '2026-09-27T00:00:00Z',
    sourceDirectory: '/project/src',
    summary: {
      nodeCount: 4,
      edgeCount: 3,
      highRiskCount: 1,
      mediumRiskCount: 1,
      lowRiskCount: 2,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 4,
        apexClasses: 3,
        apexTriggers: 0,
        lwcJs: 1,
        lwcHtml: 1,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes: [
      {
        id: 'ApexClass:OrderController',
        displayName: 'OrderController',
        type: 'ApexClass',
        file: 'OrderController.cls',
        metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 50 },
        risk: 'HIGH',
        riskReasons: ['High coupling'],
        behavior: {
          isTest: false,
          publicContractsCount: 2,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 1,
          dmlCount: 1,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: true,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
      {
        id: 'LWC:OrderView',
        displayName: 'OrderView',
        type: 'LWC',
        file: 'orderView.js',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 },
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
      },
      {
        id: 'ApexClass:OrderService',
        displayName: 'OrderService',
        type: 'ApexClass',
        file: 'OrderService.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 30 },
        risk: 'MEDIUM',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 2,
          dmlCount: 1,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
      {
        id: 'ApexClass:LoggerUtil',
        displayName: 'LoggerUtil',
        type: 'ApexClass',
        file: 'LoggerUtil.cls',
        metrics: { fanIn: 5, fanOut: 0, coupling: 5, unresolved: 0, score: 20 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
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
          testCoverageStatus: 'COVERED',
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'LWC:OrderView',
        target: 'ApexClass:OrderController',
        relationshipType: 'lwc-apex',
        method: 'getOrders',
        evidence: 'OrderController.getOrders()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 12,
        column: 4,
        methodOwner: 'OrderController',
        file: 'orderView.js',
        canonical: {
          source: { type: 'LWC', name: 'OrderView' },
          target: { type: 'ApexClass', name: 'OrderController', method: 'getOrders' },
          relationship: { type: 'lwc-apex', resolution: 'EXACT' },
          location: { line: 12, column: 4 },
        },
      },
      {
        id: 'edge_2',
        source: 'ApexClass:OrderController',
        target: 'ApexClass:OrderService',
        relationshipType: 'instantiation',
        method: null,
        evidence: 'new OrderService()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 25,
        column: 8,
        methodOwner: 'OrderController',
        file: 'OrderController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'OrderController' },
          target: { type: 'ApexClass', name: 'OrderService' },
          relationship: { type: 'instantiation', resolution: 'EXACT' },
          location: { line: 25, column: 8 },
        },
      },
      {
        id: 'edge_3',
        source: 'ApexClass:OrderController',
        target: 'ApexClass:LoggerUtil',
        relationshipType: 'method-call',
        method: 'log',
        evidence: 'LoggerUtil.log()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 30,
        column: 8,
        methodOwner: 'LoggerUtil',
        file: 'OrderController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'OrderController' },
          target: { type: 'ApexClass', name: 'LoggerUtil', method: 'log' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 30, column: 8 },
        },
      },
    ],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };

  it('handles empty graph schema safely', () => {
    const emptySchema: ExplorerDataSchema = {
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: 0,
          apexClasses: 0,
          apexTriggers: 0,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0,
        },
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const res = adaptFourDirectionView(emptySchema);
    expect(res.subject).toBeNull();
    expect(res.summary.totalNeighbors).toBe(0);
    expect(res.quadrants.up.items).toHaveLength(0);
  });

  it('transforms valid graph and defaults to highest risk node as subject', () => {
    const res = adaptFourDirectionView(sampleSchema);
    expect(res.subject).not.toBeNull();
    expect(res.subject?.nodeId).toBe('ApexClass:OrderController');
    expect(res.summary.totalNeighbors).toBe(3);
    expect(res.availableNodes).toHaveLength(4);
  });

  it('respects explicitly selected node ID and maps neighbors into cardinal quadrants', () => {
    const res = adaptFourDirectionView(sampleSchema, { selectedNodeId: 'LWC:OrderView' });
    expect(res.subject?.nodeId).toBe('LWC:OrderView');
    expect(res.summary.selectedNodeId).toBe('LWC:OrderView');
    expect(res.summary.totalNeighbors).toBe(1);
    expect(res.quadrants.left.items).toHaveLength(1);
    expect(res.quadrants.left.items[0].nodeId).toBe('ApexClass:OrderController');
  });

  it('does not mutate input schema or nodes', () => {
    const nodesOriginal = JSON.stringify(sampleSchema.nodes);
    const edgesOriginal = JSON.stringify(sampleSchema.edges);

    Object.freeze(sampleSchema);
    Object.freeze(sampleSchema.nodes);
    Object.freeze(sampleSchema.edges);

    const res = adaptFourDirectionView(sampleSchema, { selectedNodeId: 'ApexClass:OrderController' });
    expect(res.subject).toBeDefined();

    expect(JSON.stringify(sampleSchema.nodes)).toBe(nodesOriginal);
    expect(JSON.stringify(sampleSchema.edges)).toBe(edgesOriginal);
  });

  it('produces deterministic output across input shuffling', () => {
    const shuffledSchema: ExplorerDataSchema = {
      ...sampleSchema,
      nodes: [...sampleSchema.nodes].reverse(),
      edges: [...sampleSchema.edges].reverse(),
    };

    const res1 = adaptFourDirectionView(sampleSchema, { selectedNodeId: 'ApexClass:OrderController' });
    const res2 = adaptFourDirectionView(shuffledSchema, { selectedNodeId: 'ApexClass:OrderController' });

    expect(res1).toEqual(res2);
  });
});

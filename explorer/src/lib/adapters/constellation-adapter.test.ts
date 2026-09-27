import { describe, it, expect } from 'vitest';
import { adaptConstellation } from './constellation-adapter';
import { ExplorerDataSchema } from '../../types/explorer';

describe('Constellation Adapter', () => {
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
      {
        id: 'ApexClass:OrderService',
        displayName: 'OrderService',
        type: 'ApexClass',
        file: 'OrderService.cls',
        metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 40 },
        risk: 'MEDIUM',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 1,
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
      {
        id: 'ApexClass:OrderRepository',
        displayName: 'OrderRepository',
        type: 'ApexClass',
        file: 'OrderRepository.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 20 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 1,
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
        source: 'LWC:OrderView',
        target: 'ApexClass:OrderController',
        relationshipType: 'calls',
      },
      {
        source: 'ApexClass:OrderController',
        target: 'ApexClass:OrderService',
        relationshipType: 'calls',
      },
      {
        source: 'ApexClass:OrderService',
        target: 'ApexClass:OrderRepository',
        relationshipType: 'queries',
      },
    ],
  };

  it('adapts schema with focal node and produces concentric rings', () => {
    const data = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
      maxDepth: 2,
    });

    expect(data.focalNode).not.toBeNull();
    expect(data.focalNode?.id).toBe('ApexClass:OrderController');
    expect(data.summary.totalNodes).toBe(4);
    expect(data.rings.length).toBe(2); // 1-hop and 2-hop rings

    // Ring 1 should contain 1-hop neighbors: LWC:OrderView (caller) and ApexClass:OrderService (callee)
    const ring1 = data.rings.find((r) => r.hopDistance === 1);
    expect(ring1).toBeDefined();
    expect(ring1?.items.length).toBe(2);

    // Ring 2 should contain 2-hop neighbor: ApexClass:OrderRepository
    const ring2 = data.rings.find((r) => r.hopDistance === 2);
    expect(ring2).toBeDefined();
    expect(ring2?.items.length).toBe(1);
    expect(ring2?.items[0].nodeId).toBe('ApexClass:OrderRepository');
  });

  it('guarantees input schema immutability', () => {
    const originalSchemaJson = JSON.stringify(sampleSchema);
    adaptConstellation(sampleSchema, { focalNodeId: 'ApexClass:OrderController' });
    expect(JSON.stringify(sampleSchema)).toBe(originalSchemaJson);
  });

  it('handles empty schema gracefully', () => {
    const emptySchema: ExplorerDataSchema = {
      ...sampleSchema,
      nodes: [],
      edges: [],
    };
    const data = adaptConstellation(emptySchema);
    expect(data.focalNode).toBeNull();
    expect(data.rings).toEqual([]);
    expect(data.edges).toEqual([]);
    expect(data.summary.totalNodes).toBe(0);
  });

  it('produces deterministic ordering across executions', () => {
    const run1 = adaptConstellation(sampleSchema, { focalNodeId: 'ApexClass:OrderController' });
    const run2 = adaptConstellation(sampleSchema, { focalNodeId: 'ApexClass:OrderController' });

    expect(run1).toEqual(run2);
  });

  it('filters by focus direction (dependencies vs dependents)', () => {
    // Incoming only (dependents) for OrderController -> should include LWC:OrderView
    const depData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
      direction: 'dependents',
    });
    expect(depData.summary.totalNodes).toBe(2); // OrderController + OrderView
    expect(depData.nodes['LWC:OrderView']).toBeDefined();
    expect(depData.nodes['ApexClass:OrderService']).toBeUndefined();

    // Outgoing only (dependencies) for OrderController -> should include ApexClass:OrderService
    const outData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
      direction: 'dependencies',
    });
    expect(outData.nodes['ApexClass:OrderService']).toBeDefined();
    expect(outData.nodes['LWC:OrderView']).toBeUndefined();
  });

  it('handles single node graph without errors', () => {
    const singleNodeSchema: ExplorerDataSchema = {
      ...sampleSchema,
      nodes: [sampleSchema.nodes[0]],
      edges: [],
    };

    const data = adaptConstellation(singleNodeSchema);
    expect(data.focalNode?.id).toBe('ApexClass:OrderController');
    expect(data.rings).toEqual([]);
    expect(data.summary.totalNodes).toBe(1);
    expect(data.edges).toEqual([]);
  });
});

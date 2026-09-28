import { describe, it, expect } from 'vitest';
import { adaptConstellation } from './constellation-adapter';
import type { ExplorerDataSchema } from '../../types/explorer';
import { createMockNode, createMockEdge, createMockDataSchema } from '../../test/mock-factories';

describe('Constellation Adapter', () => {
  const nodeController = createMockNode('ApexClass:OrderController', 'OrderController', 'ApexClass', 'HIGH', 'OrderController.cls');
  nodeController.metrics = { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 50 };

  const nodeView = createMockNode('LWC:OrderView', 'OrderView', 'LWC', 'LOW', 'orderView.js');
  nodeView.metrics = { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 };

  const nodeService = createMockNode('ApexClass:OrderService', 'OrderService', 'ApexClass', 'MEDIUM', 'OrderService.cls');
  nodeService.metrics = { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 40 };

  const nodeRepo = createMockNode('ApexClass:OrderRepository', 'OrderRepository', 'ApexClass', 'LOW', 'OrderRepository.cls');
  nodeRepo.metrics = { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 20 };

  const sampleSchema: ExplorerDataSchema = {
    ...createMockDataSchema(
      [nodeController, nodeView, nodeService, nodeRepo],
      [
        createMockEdge('e1', 'LWC:OrderView', 'ApexClass:OrderController', 'method-call'),
        createMockEdge('e2', 'ApexClass:OrderController', 'ApexClass:OrderService', 'method-call'),
        createMockEdge('e3', 'ApexClass:OrderService', 'ApexClass:OrderRepository', 'type-reference'),
      ]
    ),
    schemaVersion: '1.0',
    analyzerVersion: '1.0',
    generatedAt: '2026-09-27T00:00:00Z',
    sourceDirectory: '/project/src',
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

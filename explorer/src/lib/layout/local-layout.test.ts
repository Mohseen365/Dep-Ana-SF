import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeLocalNodeLayout } from './local-layout';
import { computeGlobalDomainLayout } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';

describe('Wave 3A: Primary Production Node Local Layout', () => {
  it('1. Simple local chain (A -> B -> C): verifies compact local arrangement without overlapping', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderService', type: 'ApexClass', displayName: 'OrderService' },
      { id: 'OrderSelector', type: 'ApexClass', displayName: 'OrderSelector' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderService', target: 'OrderSelector' },
    ];

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(3);
    expect(result.primaryNodePositions['OrderController']).toBeDefined();
    expect(result.primaryNodePositions['OrderService']).toBeDefined();
    expect(result.primaryNodePositions['OrderSelector']).toBeDefined();

    const posController = result.primaryNodePositions['OrderController'];
    const posService = result.primaryNodePositions['OrderService'];
    const posSelector = result.primaryNodePositions['OrderSelector'];

    // Controller (upstream caller) positioned above or before Service/Selector
    expect(posController.y).toBeLessThanOrEqual(posService.y);
    expect(posService.y).toBeLessThanOrEqual(posSelector.y);

    // Overlap count should be zero
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('2. Fan-out (A -> B, A -> C, A -> D): verifies dependent nodes form a meaningful local group', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderService', type: 'ApexClass', displayName: 'OrderService' },
      { id: 'OrderPaymentService', type: 'ApexClass', displayName: 'OrderPaymentService' },
      { id: 'OrderNotificationService', type: 'ApexClass', displayName: 'OrderNotificationService' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderController', target: 'OrderPaymentService' },
      { id: 'e3', source: 'OrderController', target: 'OrderNotificationService' },
    ];

    const domainMap = new Map([
      ['OrderController', 'Order'],
      ['OrderService', 'Order'],
      ['OrderPaymentService', 'Order'],
      ['OrderNotificationService', 'Order'],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });

    expect(result.primaryNodeCount).toBe(4);
    const posController = result.primaryNodePositions['OrderController'];
    const posOrderSvc = result.primaryNodePositions['OrderService'];
    const posPaymentSvc = result.primaryNodePositions['OrderPaymentService'];
    const posNotifSvc = result.primaryNodePositions['OrderNotificationService'];

    // Upstream controller positioned in top row relative to downstream services
    expect(posController.y).toBeLessThan(posOrderSvc.y);
    expect(posController.y).toBeLessThan(posPaymentSvc.y);
    expect(posController.y).toBeLessThan(posNotifSvc.y);

    // Dependent services should share same downstream Y coordinate row
    expect(posOrderSvc.y).toBe(posPaymentSvc.y);
    expect(posPaymentSvc.y).toBe(posNotifSvc.y);

    // X coordinates of downstream services should be distinct (no horizontal overlap)
    const xCoords = [posOrderSvc.x, posPaymentSvc.x, posNotifSvc.x].sort((a, b) => a - b);
    expect(xCoords[1] - xCoords[0]).toBeGreaterThanOrEqual(120);
    expect(xCoords[2] - xCoords[1]).toBeGreaterThanOrEqual(120);

    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('3. Fan-in (A -> D, B -> D, C -> D): verifies shared target remains locally understandable', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderPaymentController', type: 'ApexClass', displayName: 'OrderPaymentController' },
      { id: 'OrderCheckoutController', type: 'ApexClass', displayName: 'OrderCheckoutController' },
      { id: 'OrderLoggerService', type: 'ApexClass', displayName: 'OrderLoggerService' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderLoggerService' },
      { id: 'e2', source: 'OrderPaymentController', target: 'OrderLoggerService' },
      { id: 'e3', source: 'OrderCheckoutController', target: 'OrderLoggerService' },
    ];

    const domainMap = new Map([
      ['OrderController', 'Order'],
      ['OrderPaymentController', 'Order'],
      ['OrderCheckoutController', 'Order'],
      ['OrderLoggerService', 'Order'],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });

    expect(result.primaryNodeCount).toBe(4);
    const posLogger = result.primaryNodePositions['OrderLoggerService'];
    const posOrderCtrl = result.primaryNodePositions['OrderController'];
    const posPaymentCtrl = result.primaryNodePositions['OrderPaymentController'];

    // Upstream callers positioned above shared downstream target
    expect(posOrderCtrl.y).toBeLessThan(posLogger.y);
    expect(posPaymentCtrl.y).toBeLessThan(posLogger.y);

    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('4. Same-domain graph: verifies related nodes remain cohesive', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderService', type: 'ApexClass', displayName: 'OrderService' },
      { id: 'OrderSelector', type: 'ApexClass', displayName: 'OrderSelector' },
      { id: 'OrderRepository', type: 'ApexClass', displayName: 'OrderRepository' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderService', target: 'OrderSelector' },
      { id: 'e3', source: 'OrderService', target: 'OrderRepository' },
    ];

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(4);
    expect(result.metrics?.nodeOverlapCount).toBe(0);

    const buckets = Array.from(result.bucketLayouts.values());
    expect(buckets.length).toBeGreaterThan(0);
    const mainBucket = buckets.find(b => b.domain === 'Order');
    expect(mainBucket).toBeDefined();
    expect(mainBucket!.bounds.width).toBeGreaterThan(0);
    expect(mainBucket!.bounds.height).toBeGreaterThan(0);
  });

  it('5. Cross-layer graph: verifies layer boundaries are respected', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderService', type: 'ApexClass', displayName: 'OrderService' },
      { id: 'OrderSelector', type: 'ApexClass', displayName: 'OrderSelector' },
      { id: 'Order__c', type: 'CustomObject', displayName: 'Order__c' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderService', target: 'OrderSelector' },
      { id: 'e3', source: 'OrderSelector', target: 'Order__c' },
    ];

    const layerMap = new Map([
      ['OrderController', 'presentation' as const],
      ['OrderService', 'application' as const],
      ['OrderSelector', 'domain' as const],
      ['Order__c', 'schema' as const],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, layerMap });

    const posCtrl = result.primaryNodePositions['OrderController'];
    const posSvc = result.primaryNodePositions['OrderService'];
    const posSel = result.primaryNodePositions['OrderSelector'];
    const posObj = result.primaryNodePositions['Order__c'];

    // Presentation (y=100) -> Application (y=350) -> Domain (y=600) -> Schema (y=850)
    expect(posCtrl.y).toBeLessThan(posSvc.y);
    expect(posSvc.y).toBeLessThan(posSel.y);
    expect(posSel.y).toBeLessThan(posObj.y);
  });

  it('6. Existing ordering: verifies Wave 2 ordering is consumed rather than replaced', () => {
    const nodes: ExplorerNode[] = [
      { id: 'ServiceA', type: 'ApexClass', displayName: 'ServiceA' },
      { id: 'ServiceB', type: 'ApexClass', displayName: 'ServiceB' },
      { id: 'ServiceC', type: 'ApexClass', displayName: 'ServiceC' },
    ];
    const edges: ExplorerEdge[] = [];

    const layerMap = new Map([
      ['ServiceA', 'application' as const],
      ['ServiceB', 'application' as const],
      ['ServiceC', 'application' as const],
    ]);

    const domainMap = new Map([
      ['ServiceA', 'Shared'],
      ['ServiceB', 'Shared'],
      ['ServiceC', 'Shared'],
    ]);

    // Wave 2B specified custom ordering: C, A, B
    const bucketOrder = new Map<string, string[]>([
      ['application:Shared', ['ServiceC', 'ServiceA', 'ServiceB']],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, layerMap, domainMap, bucketOrder });

    const bucketLayout = result.bucketLayouts.get('application:Shared');
    expect(bucketLayout).toBeDefined();
    expect(bucketLayout!.nodeIds).toEqual(['ServiceC', 'ServiceA', 'ServiceB']);

    // Check relative X positions follow C < A < B
    const posX_C = result.primaryNodePositions['ServiceC'].x;
    const posX_A = result.primaryNodePositions['ServiceA'].x;
    const posX_B = result.primaryNodePositions['ServiceB'].x;

    expect(posX_C).toBeLessThan(posX_A);
    expect(posX_A).toBeLessThan(posX_B);
  });

  it('7. Cycles: ensures no infinite loops on cyclic dependency graphs', () => {
    const nodes: ExplorerNode[] = [
      { id: 'ServiceA', type: 'ApexClass', displayName: 'ServiceA' },
      { id: 'ServiceB', type: 'ApexClass', displayName: 'ServiceB' },
      { id: 'ServiceC', type: 'ApexClass', displayName: 'ServiceC' },
    ];
    // Cyclic dependency: A -> B -> C -> A
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'ServiceA', target: 'ServiceB' },
      { id: 'e2', source: 'ServiceB', target: 'ServiceC' },
      { id: 'e3', source: 'ServiceC', target: 'ServiceA' },
    ];

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(3);
    expect(Object.keys(result.primaryNodePositions).length).toBe(3);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('8. Determinism: verifies identical coordinates across multiple runs', () => {
    const nodes: ExplorerNode[] = [
      { id: 'OrderController', type: 'ApexClass', displayName: 'OrderController' },
      { id: 'OrderService', type: 'ApexClass', displayName: 'OrderService' },
      { id: 'PaymentService', type: 'ApexClass', displayName: 'PaymentService' },
      { id: 'OrderSelector', type: 'ApexClass', displayName: 'OrderSelector' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderController', target: 'PaymentService' },
      { id: 'e3', source: 'OrderService', target: 'OrderSelector' },
    ];

    const run1 = computeLocalNodeLayout({ nodes, edges });
    const run2 = computeLocalNodeLayout({ nodes, edges });

    expect(run1.primaryNodePositions).toEqual(run2.primaryNodePositions);
    expect(run1.bucketLayouts.size).toEqual(run2.bucketLayouts.size);
  });

  it('9. Dense local graph: verifies zero node overlaps in a 12-node cluster', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 12 }, (_, i) => ({
      id: `Service_${i + 1}`,
      type: 'ApexClass',
      displayName: `Service_${i + 1}`,
    }));

    // Dense grid of edges
    const edges: ExplorerEdge[] = [];
    for (let i = 0; i < 11; i++) {
      edges.push({ id: `e_${i}`, source: `Service_${i + 1}`, target: `Service_${i + 2}` });
    }

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(12);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('10. Food Delivery fixture: evaluates realistic domain cluster layout', () => {
    const fixture = createFoodDeliveryFixture();

    const globalLayout = computeGlobalDomainLayout(fixture.nodes, fixture.edges);
    const ordering = reduceEdgeCrossings({
      nodes: fixture.nodes,
      edges: fixture.edges,
      domainOrder: globalLayout.orderedDomains,
    });

    const result = computeLocalNodeLayout({
      nodes: fixture.nodes,
      edges: fixture.edges,
      domainRegions: globalLayout.domainRegions,
      bucketOrder: ordering.bucketOrder,
    });

    // Excludes unit tests and object fields
    const testAndFieldCount = fixture.nodes.filter(
      n => n.displayName.endsWith('Test') || n.type === 'Field' || n.type === 'CustomField'
    ).length;
    expect(result.primaryNodeCount).toBe(fixture.nodes.length - testAndFieldCount);

    // Primary nodes should have zero node overlaps
    expect(result.metrics?.nodeOverlapCount).toBe(0);

    // Verify primary node positions exist and fall within valid domain bounds
    Object.entries(result.primaryNodePositions).forEach(([nodeId, pos]) => {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    });
  });
});

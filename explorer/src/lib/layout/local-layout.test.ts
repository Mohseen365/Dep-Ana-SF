import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import { computeLocalNodeLayout } from './local-layout';
import { computeGlobalDomainLayout } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';
import { createNode, createEdge } from './fixtures/builder';

function makeNode(id: string, type: ExplorerNodeType = 'ApexClass', displayName?: string): ExplorerNode {
  return createNode(id, type, { displayName: displayName || id });
}

function makeEdge(source: string, target: string): ExplorerEdge {
  return createEdge(source, target);
}

describe('Wave 3A: Primary Production Node Local Layout', () => {
  it('1. Simple local chain (A -> B -> C): verifies compact local arrangement without overlapping', () => {
    const nodes: ExplorerNode[] = [
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderService', 'ApexClass', 'OrderService'),
      makeNode('OrderSelector', 'ApexClass', 'OrderSelector'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderService'),
      makeEdge('OrderService', 'OrderSelector'),
    ];

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(3);
    expect(result.primaryNodePositions['OrderController']).toBeDefined();
    expect(result.primaryNodePositions['OrderService']).toBeDefined();
    expect(result.primaryNodePositions['OrderSelector']).toBeDefined();

    const posController = result.primaryNodePositions['OrderController'];
    const posService = result.primaryNodePositions['OrderService'];
    const posSelector = result.primaryNodePositions['OrderSelector'];

    expect(posController.y).toBeLessThanOrEqual(posService.y);
    expect(posService.y).toBeLessThanOrEqual(posSelector.y);

    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('2. Fan-out (A -> B, A -> C, A -> D): verifies dependent nodes form a meaningful local group', () => {
    const nodes: ExplorerNode[] = [
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderService', 'ApexClass', 'OrderService'),
      makeNode('OrderPaymentService', 'ApexClass', 'OrderPaymentService'),
      makeNode('OrderNotificationService', 'ApexClass', 'OrderNotificationService'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderService'),
      makeEdge('OrderController', 'OrderPaymentService'),
      makeEdge('OrderController', 'OrderNotificationService'),
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

    expect(posController.y).toBeLessThan(posOrderSvc.y);
    expect(posController.y).toBeLessThan(posPaymentSvc.y);
    expect(posController.y).toBeLessThan(posNotifSvc.y);

    expect(posOrderSvc.y).toBe(posPaymentSvc.y);
    expect(posPaymentSvc.y).toBe(posNotifSvc.y);

    const xCoords = [posOrderSvc.x, posPaymentSvc.x, posNotifSvc.x].sort((a, b) => a - b);
    expect(xCoords[1] - xCoords[0]).toBeGreaterThanOrEqual(120);
    expect(xCoords[2] - xCoords[1]).toBeGreaterThanOrEqual(120);

    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('3. Fan-in (A -> D, B -> D, C -> D): verifies shared target remains locally understandable', () => {
    const nodes: ExplorerNode[] = [
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderPaymentController', 'ApexClass', 'OrderPaymentController'),
      makeNode('OrderCheckoutController', 'ApexClass', 'OrderCheckoutController'),
      makeNode('OrderLoggerService', 'ApexClass', 'OrderLoggerService'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderLoggerService'),
      makeEdge('OrderPaymentController', 'OrderLoggerService'),
      makeEdge('OrderCheckoutController', 'OrderLoggerService'),
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

    expect(posOrderCtrl.y).toBeLessThan(posLogger.y);
    expect(posPaymentCtrl.y).toBeLessThan(posLogger.y);

    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('4. Same-domain graph: verifies related nodes remain cohesive', () => {
    const nodes: ExplorerNode[] = [
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderService', 'ApexClass', 'OrderService'),
      makeNode('OrderSelector', 'ApexClass', 'OrderSelector'),
      makeNode('OrderRepository', 'ApexClass', 'OrderRepository'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderService'),
      makeEdge('OrderService', 'OrderSelector'),
      makeEdge('OrderService', 'OrderRepository'),
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
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderService', 'ApexClass', 'OrderService'),
      makeNode('OrderSelector', 'ApexClass', 'OrderSelector'),
      makeNode('Order__c', 'CustomObject', 'Order__c'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderService'),
      makeEdge('OrderService', 'OrderSelector'),
      makeEdge('OrderSelector', 'Order__c'),
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

    expect(posCtrl.y).toBeLessThan(posSvc.y);
    expect(posSvc.y).toBeLessThan(posSel.y);
    expect(posSel.y).toBeLessThan(posObj.y);
  });

  it('6. Existing ordering: verifies Wave 2 ordering is consumed rather than replaced', () => {
    const nodes: ExplorerNode[] = [
      makeNode('ServiceA', 'ApexClass', 'ServiceA'),
      makeNode('ServiceB', 'ApexClass', 'ServiceB'),
      makeNode('ServiceC', 'ApexClass', 'ServiceC'),
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

    const bucketOrder = new Map<string, string[]>([
      ['application:Shared', ['ServiceC', 'ServiceA', 'ServiceB']],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, layerMap, domainMap, bucketOrder });

    const bucketLayout = result.bucketLayouts.get('application:Shared');
    expect(bucketLayout).toBeDefined();
    expect(bucketLayout!.nodeIds).toEqual(['ServiceC', 'ServiceA', 'ServiceB']);

    const posX_C = result.primaryNodePositions['ServiceC'].x;
    const posX_A = result.primaryNodePositions['ServiceA'].x;
    const posX_B = result.primaryNodePositions['ServiceB'].x;

    expect(posX_C).toBeLessThan(posX_A);
    expect(posX_A).toBeLessThan(posX_B);
  });

  it('7. Cycles: ensures no infinite loops on cyclic dependency graphs', () => {
    const nodes: ExplorerNode[] = [
      makeNode('ServiceA', 'ApexClass', 'ServiceA'),
      makeNode('ServiceB', 'ApexClass', 'ServiceB'),
      makeNode('ServiceC', 'ApexClass', 'ServiceC'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('ServiceA', 'ServiceB'),
      makeEdge('ServiceB', 'ServiceC'),
      makeEdge('ServiceC', 'ServiceA'),
    ];

    const result = computeLocalNodeLayout({ nodes, edges });

    expect(result.primaryNodeCount).toBe(3);
    expect(Object.keys(result.primaryNodePositions).length).toBe(3);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('8. Determinism: verifies identical coordinates across multiple runs', () => {
    const nodes: ExplorerNode[] = [
      makeNode('OrderController', 'ApexClass', 'OrderController'),
      makeNode('OrderService', 'ApexClass', 'OrderService'),
      makeNode('PaymentService', 'ApexClass', 'PaymentService'),
      makeNode('OrderSelector', 'ApexClass', 'OrderSelector'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('OrderController', 'OrderService'),
      makeEdge('OrderController', 'PaymentService'),
      makeEdge('OrderService', 'OrderSelector'),
    ];

    const run1 = computeLocalNodeLayout({ nodes, edges });
    const run2 = computeLocalNodeLayout({ nodes, edges });

    expect(run1.primaryNodePositions).toEqual(run2.primaryNodePositions);
    expect(run1.bucketLayouts.size).toEqual(run2.bucketLayouts.size);
  });

  it('9. Dense local graph: verifies zero node overlaps in a 12-node cluster', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 12 }, (_, i) =>
      makeNode(`Service_${i + 1}`, 'ApexClass', `Service_${i + 1}`)
    );

    const edges: ExplorerEdge[] = [];
    for (let i = 0; i < 11; i++) {
      edges.push(makeEdge(`Service_${i + 1}`, `Service_${i + 2}`));
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

    const testAndFieldCount = fixture.nodes.filter(
      n => n.displayName.endsWith('Test') || n.type === 'Field' || n.type === 'CustomField'
    ).length;
    expect(result.primaryNodeCount).toBe(fixture.nodes.length - testAndFieldCount);

    expect(result.metrics?.nodeOverlapCount).toBe(0);

    Object.entries(result.primaryNodePositions).forEach(([_nodeId, pos]) => {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    });
  });

  it('11. Compact one-row placement: verifies exact 40px horizontal clearance gap in a 3-node row', () => {
    const nodes: ExplorerNode[] = [
      makeNode('SvcA', 'ApexClass', 'SvcA'),
      makeNode('SvcB', 'ApexClass', 'SvcB'),
      makeNode('SvcC', 'ApexClass', 'SvcC'),
    ];
    const edges: ExplorerEdge[] = [];
    const domainMap = new Map([['SvcA', 'DomainX'], ['SvcB', 'DomainX'], ['SvcC', 'DomainX']]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posA = result.primaryNodePositions['SvcA'];
    const posB = result.primaryNodePositions['SvcB'];
    const posC = result.primaryNodePositions['SvcC'];

    const xs = [posA.x, posB.x, posC.x].sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBe(160);
    expect(xs[2] - xs[1]).toBe(160);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('12. Multi-row balanced placement: verifies 5 nodes in a tier are chunked into balanced rows (3 + 2)', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 5 }, (_, i) =>
      makeNode(`Handler_${i + 1}`, 'ApexClass', `Handler_${i + 1}`)
    );
    const edges: ExplorerEdge[] = [];
    const domainMap = new Map(nodes.map(n => [n.id, 'Shared']));

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const bucket = result.bucketLayouts.get('application:Shared');

    expect(bucket).toBeDefined();
    expect(bucket!.rows).toBe(2);
    expect(bucket!.cols).toBe(3);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('13. Relationship-aware ordering: aligns connected callers and callees vertically', () => {
    const nodes: ExplorerNode[] = [
      makeNode('CtrlA', 'ApexClass', 'CtrlA'),
      makeNode('CtrlB', 'ApexClass', 'CtrlB'),
      makeNode('SvcA', 'ApexClass', 'SvcA'),
      makeNode('SvcB', 'ApexClass', 'SvcB'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('CtrlA', 'SvcB'),
      makeEdge('CtrlB', 'SvcA'),
    ];
    const domainMap = new Map([
      ['CtrlA', 'App'], ['CtrlB', 'App'], ['SvcA', 'App'], ['SvcB', 'App']
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posCtrlA = result.primaryNodePositions['CtrlA'];
    const posSvcB = result.primaryNodePositions['SvcB'];

    expect(posCtrlA.x).toBe(posSvcB.x);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('14. Hub-heavy local placement: centers high-degree hub nodes within local tier rows', () => {
    const nodes: ExplorerNode[] = [
      makeNode('CentralHub', 'ApexClass', 'CentralHub'),
      makeNode('Client1', 'ApexClass', 'Client1'),
      makeNode('Client2', 'ApexClass', 'Client2'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('Client1', 'CentralHub'),
      makeEdge('Client2', 'CentralHub'),
    ];
    const domainMap = new Map([
      ['CentralHub', 'Core'], ['Client1', 'Core'], ['Client2', 'Core']
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posHub = result.primaryNodePositions['CentralHub'];
    const posC1 = result.primaryNodePositions['Client1'];
    const posC2 = result.primaryNodePositions['Client2'];

    const midXCallers = (posC1.x + posC2.x) / 2;
    expect(posHub.x).toBeCloseTo(midXCallers, 1);
    expect(posHub.y).toBeGreaterThan(posC1.y);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('15. Long-chain local placement: arranges sequential chain with readable flow and 0 overlaps', () => {
    const nodes: ExplorerNode[] = [
      makeNode('Step1', 'ApexClass', 'Step1'),
      makeNode('Step2', 'ApexClass', 'Step2'),
      makeNode('Step3', 'ApexClass', 'Step3'),
      makeNode('Step4', 'ApexClass', 'Step4'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('Step1', 'Step2'),
      makeEdge('Step2', 'Step3'),
      makeEdge('Step3', 'Step4'),
    ];
    const domainMap = new Map(nodes.map(n => [n.id, 'Workflow']));

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });

    expect(result.primaryNodeCount).toBe(4);
    expect(result.metrics?.nodeOverlapCount).toBe(0);

    const pos1 = result.primaryNodePositions['Step1'];
    const pos2 = result.primaryNodePositions['Step2'];
    const pos3 = result.primaryNodePositions['Step3'];
    const pos4 = result.primaryNodePositions['Step4'];

    expect(pos1.y).toBeLessThanOrEqual(pos2.y);
    expect(pos2.y).toBeLessThanOrEqual(pos3.y);
    expect(pos3.y).toBeLessThanOrEqual(pos4.y);
  });

  it('16. Deterministic ordering: guarantees identical position outputs across multiple runs', () => {
    const nodes: ExplorerNode[] = [
      makeNode('NodeAlpha', 'ApexClass', 'NodeAlpha'),
      makeNode('NodeBeta', 'ApexClass', 'NodeBeta'),
      makeNode('NodeGamma', 'ApexClass', 'NodeGamma'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('NodeAlpha', 'NodeBeta'),
    ];

    const run1 = computeLocalNodeLayout({ nodes, edges });
    const run2 = computeLocalNodeLayout({ nodes, edges });

    expect(run1.primaryNodePositions).toEqual(run2.primaryNodePositions);
  });

  it('17. Shuffled-input invariance: produces identical positions regardless of input array ordering', () => {
    const nodes1: ExplorerNode[] = [
      makeNode('Alpha', 'ApexClass', 'Alpha'),
      makeNode('Beta', 'ApexClass', 'Beta'),
      makeNode('Gamma', 'ApexClass', 'Gamma'),
    ];
    const edges1: ExplorerEdge[] = [
      makeEdge('Alpha', 'Beta'),
      makeEdge('Beta', 'Gamma'),
    ];

    const nodes2 = [...nodes1].reverse();
    const edges2 = [...edges1].reverse();

    const result1 = computeLocalNodeLayout({ nodes: nodes1, edges: edges1 });
    const result2 = computeLocalNodeLayout({ nodes: nodes2, edges: edges2 });

    expect(result1.primaryNodePositions).toEqual(result2.primaryNodePositions);
  });

  it('18. Zero node overlaps: guarantees 0 overlapping bounding boxes across multi-tier layouts', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 9 }, (_, i) =>
      makeNode(`Comp_${i + 1}`, 'ApexClass', `Comp_${i + 1}`)
    );
    const edges: ExplorerEdge[] = [
      makeEdge('Comp_1', 'Comp_4'),
      makeEdge('Comp_2', 'Comp_5'),
      makeEdge('Comp_3', 'Comp_6'),
      makeEdge('Comp_4', 'Comp_7'),
      makeEdge('Comp_5', 'Comp_8'),
    ];
    const domainMap = new Map(nodes.map(n => [n.id, 'Cluster']));

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('19. Architectural-layer preservation: maintains primary node layer Y bounds', () => {
    const nodes: ExplorerNode[] = [
      makeNode('Controller', 'ApexClass', 'Controller'),
      makeNode('Service', 'ApexClass', 'Service'),
      makeNode('Selector', 'ApexClass', 'Selector'),
      makeNode('Object__c', 'CustomObject', 'Object__c'),
    ];
    const edges: ExplorerEdge[] = [
      makeEdge('Controller', 'Service'),
      makeEdge('Service', 'Selector'),
      makeEdge('Selector', 'Object__c'),
    ];
    const layerMap = new Map<string, 'presentation' | 'application' | 'domain' | 'schema'>([
      ['Controller', 'presentation'],
      ['Service', 'application'],
      ['Selector', 'domain'],
      ['Object__c', 'schema'],
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, layerMap });

    expect(result.primaryNodePositions['Controller'].y).toBe(100);
    expect(result.primaryNodePositions['Service'].y).toBe(350);
    expect(result.primaryNodePositions['Selector'].y).toBe(600);
    expect(result.primaryNodePositions['Object__c'].y).toBe(850);
  });
});

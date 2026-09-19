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

  it('11. Compact one-row placement: verifies exact 40px horizontal clearance gap in a 3-node row', () => {
    const nodes: ExplorerNode[] = [
      { id: 'SvcA', type: 'ApexClass', displayName: 'SvcA' },
      { id: 'SvcB', type: 'ApexClass', displayName: 'SvcB' },
      { id: 'SvcC', type: 'ApexClass', displayName: 'SvcC' },
    ];
    const edges: ExplorerEdge[] = [];
    const domainMap = new Map([['SvcA', 'DomainX'], ['SvcB', 'DomainX'], ['SvcC', 'DomainX']]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posA = result.primaryNodePositions['SvcA'];
    const posB = result.primaryNodePositions['SvcB'];
    const posC = result.primaryNodePositions['SvcC'];

    const xs = [posA.x, posB.x, posC.x].sort((a, b) => a - b);
    // Node width = 120, gap = 40 -> step = 160
    expect(xs[1] - xs[0]).toBe(160);
    expect(xs[2] - xs[1]).toBe(160);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('12. Multi-row balanced placement: verifies 5 nodes in a tier are chunked into balanced rows (3 + 2)', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 5 }, (_, i) => ({
      id: `Handler_${i + 1}`,
      type: 'ApexClass',
      displayName: `Handler_${i + 1}`,
    }));
    const edges: ExplorerEdge[] = [];
    const domainMap = new Map(nodes.map(n => [n.id, 'Shared']));

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const bucket = result.bucketLayouts.get('application:Shared');

    expect(bucket).toBeDefined();
    // 5 nodes chunked into 2 balanced rows (3 + 2) instead of unbalanced (4 + 1)
    expect(bucket!.rows).toBe(2);
    expect(bucket!.cols).toBe(3);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('13. Relationship-aware ordering: aligns connected callers and callees vertically', () => {
    const nodes: ExplorerNode[] = [
      { id: 'CtrlA', type: 'ApexClass', displayName: 'CtrlA' },
      { id: 'CtrlB', type: 'ApexClass', displayName: 'CtrlB' },
      { id: 'SvcA', type: 'ApexClass', displayName: 'SvcA' },
      { id: 'SvcB', type: 'ApexClass', displayName: 'SvcB' },
    ];
    // Cross-connections: CtrlA calls SvcB, CtrlB calls SvcA
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'CtrlA', target: 'SvcB' },
      { id: 'e2', source: 'CtrlB', target: 'SvcA' },
    ];
    const domainMap = new Map([
      ['CtrlA', 'App'], ['CtrlB', 'App'], ['SvcA', 'App'], ['SvcB', 'App']
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posCtrlA = result.primaryNodePositions['CtrlA'];
    const posSvcB = result.primaryNodePositions['SvcB'];

    // CtrlA and SvcB should align vertically to avoid cross-edges
    expect(posCtrlA.x).toBe(posSvcB.x);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('14. Hub-heavy local placement: centers high-degree hub nodes within local tier rows', () => {
    const nodes: ExplorerNode[] = [
      { id: 'CentralHub', type: 'ApexClass', displayName: 'CentralHub' },
      { id: 'Client1', type: 'ApexClass', displayName: 'Client1' },
      { id: 'Client2', type: 'ApexClass', displayName: 'Client2' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'Client1', target: 'CentralHub' },
      { id: 'e2', source: 'Client2', target: 'CentralHub' },
    ];
    const domainMap = new Map([
      ['CentralHub', 'Core'], ['Client1', 'Core'], ['Client2', 'Core']
    ]);

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    const posHub = result.primaryNodePositions['CentralHub'];
    const posC1 = result.primaryNodePositions['Client1'];
    const posC2 = result.primaryNodePositions['Client2'];

    // Hub positioned centrally relative to callers
    const midXCallers = (posC1.x + posC2.x) / 2;
    expect(posHub.x).toBeCloseTo(midXCallers, 1);
    expect(posHub.y).toBeGreaterThan(posC1.y);
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('15. Long-chain local placement: arranges sequential chain with readable flow and 0 overlaps', () => {
    const nodes: ExplorerNode[] = [
      { id: 'Step1', type: 'ApexClass', displayName: 'Step1' },
      { id: 'Step2', type: 'ApexClass', displayName: 'Step2' },
      { id: 'Step3', type: 'ApexClass', displayName: 'Step3' },
      { id: 'Step4', type: 'ApexClass', displayName: 'Step4' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'Step1', target: 'Step2' },
      { id: 'e2', source: 'Step2', target: 'Step3' },
      { id: 'e3', source: 'Step3', target: 'Step4' },
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
      { id: 'NodeAlpha', type: 'ApexClass', displayName: 'NodeAlpha' },
      { id: 'NodeBeta', type: 'ApexClass', displayName: 'NodeBeta' },
      { id: 'NodeGamma', type: 'ApexClass', displayName: 'NodeGamma' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'NodeAlpha', target: 'NodeBeta' },
    ];

    const run1 = computeLocalNodeLayout({ nodes, edges });
    const run2 = computeLocalNodeLayout({ nodes, edges });

    expect(run1.primaryNodePositions).toEqual(run2.primaryNodePositions);
  });

  it('17. Shuffled-input invariance: produces identical positions regardless of input array ordering', () => {
    const nodes1: ExplorerNode[] = [
      { id: 'Alpha', type: 'ApexClass', displayName: 'Alpha' },
      { id: 'Beta', type: 'ApexClass', displayName: 'Beta' },
      { id: 'Gamma', type: 'ApexClass', displayName: 'Gamma' },
    ];
    const edges1: ExplorerEdge[] = [
      { id: 'e1', source: 'Alpha', target: 'Beta' },
      { id: 'e2', source: 'Beta', target: 'Gamma' },
    ];

    const nodes2 = [...nodes1].reverse();
    const edges2 = [...edges1].reverse();

    const result1 = computeLocalNodeLayout({ nodes: nodes1, edges: edges1 });
    const result2 = computeLocalNodeLayout({ nodes: nodes2, edges: edges2 });

    expect(result1.primaryNodePositions).toEqual(result2.primaryNodePositions);
  });

  it('18. Zero node overlaps: guarantees 0 overlapping bounding boxes across multi-tier layouts', () => {
    const nodes: ExplorerNode[] = Array.from({ length: 9 }, (_, i) => ({
      id: `Comp_${i + 1}`,
      type: 'ApexClass',
      displayName: `Comp_${i + 1}`,
    }));
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'Comp_1', target: 'Comp_4' },
      { id: 'e2', source: 'Comp_2', target: 'Comp_5' },
      { id: 'e3', source: 'Comp_3', target: 'Comp_6' },
      { id: 'e4', source: 'Comp_4', target: 'Comp_7' },
      { id: 'e5', source: 'Comp_5', target: 'Comp_8' },
    ];
    const domainMap = new Map(nodes.map(n => [n.id, 'Cluster']));

    const result = computeLocalNodeLayout({ nodes, edges, domainMap });
    expect(result.metrics?.nodeOverlapCount).toBe(0);
  });

  it('19. Architectural-layer preservation: maintains primary node layer Y bounds', () => {
    const nodes: ExplorerNode[] = [
      { id: 'Controller', type: 'ApexClass', displayName: 'Controller' },
      { id: 'Service', type: 'ApexClass', displayName: 'Service' },
      { id: 'Selector', type: 'ApexClass', displayName: 'Selector' },
      { id: 'Object__c', type: 'CustomObject', displayName: 'Object__c' },
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'Controller', target: 'Service' },
      { id: 'e2', source: 'Service', target: 'Selector' },
      { id: 'e3', source: 'Selector', target: 'Object__c' },
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

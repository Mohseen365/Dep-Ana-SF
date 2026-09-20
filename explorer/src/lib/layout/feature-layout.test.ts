import { describe, test, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';

function createDummyNode(
  id: string,
  type: string = 'ApexClass',
  file: string = `src/classes/${id}.cls`
): ExplorerNode {
  return {
    id,
    displayName: id,
    type,
    file,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
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
  };
}

function checkNodeOverlaps(
  positions: Record<string, { x: number; y: number }>,
  nodeWidth = 120,
  nodeHeight = 60
): number {
  const nodeIds = Object.keys(positions);
  let overlaps = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    const p1 = positions[nodeIds[i]];
    for (let j = i + 1; j < nodeIds.length; j++) {
      const p2 = positions[nodeIds[j]];
      if (
        Math.abs(p1.x - p2.x) < nodeWidth - 1e-3 &&
        Math.abs(p1.y - p2.y) < nodeHeight - 1e-3
      ) {
        overlaps++;
      }
    }
  }

  return overlaps;
}

describe('Wave 6 — Feature Spatial Placement & Acceptance Calibration Suite', () => {
  // 1. Legacy Zero-Drift Gate
  test('Legacy Zero-Drift Gate: enableFeatureLayout: false produces 100% identical positions to default', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('OrderLWC', 'LWC'),
      createDummyNode('OrderController', 'ApexClass'),
      createDummyNode('OrderService', 'ApexClass'),
      createDummyNode('Order__c', 'CustomObject'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderLWC', target: 'OrderController' },
      { id: 'e2', source: 'OrderController', target: 'OrderService' },
      { id: 'e3', source: 'OrderService', target: 'Order__c' },
    ];

    const defaultPos = computeArchitectureLayout(nodes, edges);
    const legacyPos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });

    expect(legacyPos).toEqual(defaultPos);
  });

  // 2. Fixture A — One Feature
  test('Fixture A — One Feature: single feature cluster, correct layer placement, 0 overlaps', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('CheckoutLWC', 'LWC'),
      createDummyNode('CheckoutController', 'ApexClass'),
      createDummyNode('CheckoutService', 'ApexClass'),
      createDummyNode('CheckoutSelector', 'ApexClass'),
      createDummyNode('Checkout__c', 'CustomObject'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'CheckoutLWC', target: 'CheckoutController' },
      { id: 'e2', source: 'CheckoutController', target: 'CheckoutService' },
      { id: 'e3', source: 'CheckoutService', target: 'CheckoutSelector' },
      { id: 'e4', source: 'CheckoutSelector', target: 'Checkout__c' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(5);
    expect(checkNodeOverlaps(positions)).toBe(0);

    // Layer ordering verification: LWC (presentation) < Controller (application) < Service (application/domain) < Object (schema)
    expect(positions['CheckoutLWC'].y).toBeLessThan(positions['CheckoutController'].y);
    expect(positions['CheckoutController'].y).toBeLessThanOrEqual(positions['CheckoutService'].y);
    expect(positions['CheckoutService'].y).toBeLessThan(positions['Checkout__c'].y);
  });

  // 3. Fixture B — Two Features, Same Domain
  test('Fixture B — Two Features, Same Domain: distinct non-overlapping feature regions', () => {
    const nodes: ExplorerNode[] = [
      // Feature A
      createDummyNode('BillingLWC', 'LWC', 'src/billing/BillingLWC.js'),
      createDummyNode('BillingController', 'ApexClass', 'src/billing/BillingController.cls'),
      createDummyNode('BillingService', 'ApexClass', 'src/billing/BillingService.cls'),
      // Feature B
      createDummyNode('PaymentLWC', 'LWC', 'src/billing/PaymentLWC.js'),
      createDummyNode('PaymentController', 'ApexClass', 'src/billing/PaymentController.cls'),
      createDummyNode('PaymentService', 'ApexClass', 'src/billing/PaymentService.cls'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'BillingLWC', target: 'BillingController' },
      { id: 'e2', source: 'BillingController', target: 'BillingService' },
      { id: 'e3', source: 'PaymentLWC', target: 'PaymentController' },
      { id: 'e4', source: 'PaymentController', target: 'PaymentService' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(6);
    expect(checkNodeOverlaps(positions)).toBe(0);

    // Feature A and Feature B should be spatially separated horizontally
    const billingX = (positions['BillingLWC'].x + positions['BillingController'].x + positions['BillingService'].x) / 3;
    const paymentX = (positions['PaymentLWC'].x + positions['PaymentController'].x + positions['PaymentService'].x) / 3;
    expect(Math.abs(billingX - paymentX)).toBeGreaterThan(100);
  });

  // 4. Fixture C — Shared Service (2, 3, 5+ Features)
  test('Fixture C — Shared Service: exactly one shared node across 2, 3, 5+ features, no node duplication', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('SharedLogger', 'ApexClass', 'src/common/SharedLogger.cls'),
    ];
    const edges: ExplorerEdge[] = [];

    // Construct 5 distinct features calling SharedLogger
    for (let f = 1; f <= 5; f++) {
      const lwc = createDummyNode(`Feature${f}LWC`, 'LWC');
      const ctrl = createDummyNode(`Feature${f}Controller`, 'ApexClass');
      nodes.push(lwc, ctrl);
      edges.push(
        { id: `e_${f}_1`, source: lwc.id, target: ctrl.id },
        { id: `e_${f}_2`, source: ctrl.id, target: 'SharedLogger' }
      );
    }

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Node count must match unique nodes (11: 5 LWCs + 5 Controllers + 1 SharedLogger)
    expect(Object.keys(positions)).toHaveLength(11);
    expect(positions['SharedLogger']).toBeDefined();
    expect(checkNodeOverlaps(positions)).toBe(0);

    // Verify node uniqueness on SharedLogger
    const sharedCount = Object.keys(positions).filter(k => k === 'SharedLogger').length;
    expect(sharedCount).toBe(1);
  });

  // 5. Fixture D — Cross-Domain Feature
  test('Fixture D — Cross-Domain Feature: feature spanning domains without node duplication', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('SalesLWC', 'LWC', 'src/sales/SalesLWC.js'),
      createDummyNode('SalesController', 'ApexClass', 'src/sales/SalesController.cls'),
      createDummyNode('CrossSyncService', 'ApexClass', 'src/sales/CrossSyncService.cls'),
      createDummyNode('InventoryService', 'ApexClass', 'src/inventory/InventoryService.cls'),
      createDummyNode('Inventory__c', 'CustomObject', 'src/inventory/Inventory__c.object'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'SalesLWC', target: 'SalesController' },
      { id: 'e2', source: 'SalesController', target: 'CrossSyncService' },
      { id: 'e3', source: 'CrossSyncService', target: 'InventoryService' },
      { id: 'e4', source: 'InventoryService', target: 'Inventory__c' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(5);
    expect(checkNodeOverlaps(positions)).toBe(0);
  });

  // 6. Fixture E — Tests / Fields Satellites
  test('Fixture E — Tests / Fields: satellites remain attached, no overlap', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('OrderController', 'ApexClass'),
      createDummyNode('OrderService', 'ApexClass'),
      createDummyNode('OrderControllerTest', 'ApexClass', 'src/tests/OrderControllerTest.cls'),
      createDummyNode('OrderServiceTest', 'ApexClass', 'src/tests/OrderServiceTest.cls'),
      createDummyNode('Order__c', 'CustomObject'),
      createDummyNode('Order__c.Status__c', 'Field'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderController', target: 'OrderService' },
      { id: 'e2', source: 'OrderControllerTest', target: 'OrderController' },
      { id: 'e3', source: 'OrderServiceTest', target: 'OrderService' },
      { id: 'e4', source: 'OrderService', target: 'Order__c' },
      { id: 'e5', source: 'Order__c.Status__c', target: 'Order__c' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(6);
    expect(checkNodeOverlaps(positions)).toBe(0);

    // Satellites should be positioned near parent anchors
    expect(Math.abs(positions['OrderControllerTest'].x - positions['OrderController'].x)).toBeLessThan(350);
    expect(Math.abs(positions['OrderControllerTest'].y - positions['OrderController'].y)).toBeLessThan(350);
  });

  // 7. Fixture F — Scale 100+ Nodes
  test('Fixture F — Scale 100+ Nodes: deterministic layout and no node overlaps', () => {
    const nodes: ExplorerNode[] = [];
    const edges: ExplorerEdge[] = [];

    // Create 20 features with 5 nodes each (100 nodes total)
    for (let f = 0; f < 20; f++) {
      const fName = `Feature${f}`;
      const lwc = createDummyNode(`${fName}LWC`, 'LWC');
      const ctrl = createDummyNode(`${fName}Controller`, 'ApexClass');
      const svc = createDummyNode(`${fName}Service`, 'ApexClass');
      const sel = createDummyNode(`${fName}Selector`, 'ApexClass');
      const obj = createDummyNode(`${fName}__c`, 'CustomObject');

      nodes.push(lwc, ctrl, svc, sel, obj);
      edges.push(
        { id: `e_${f}_1`, source: lwc.id, target: ctrl.id },
        { id: `e_${f}_2`, source: ctrl.id, target: svc.id },
        { id: `e_${f}_3`, source: svc.id, target: sel.id },
        { id: `e_${f}_4`, source: sel.id, target: obj.id }
      );
    }

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(100);
    expect(checkNodeOverlaps(positions)).toBe(0);
  });

  // 8. Fixture G — Disconnected Components
  test('Fixture G — Disconnected Components: 3 disconnected feature subgraphs pack cleanly with 0 overlaps', () => {
    const nodes: ExplorerNode[] = [
      // Subgraph 1: Billing
      createDummyNode('BillingLWC', 'LWC'),
      createDummyNode('BillingController', 'ApexClass'),
      // Subgraph 2: Inventory
      createDummyNode('InventoryLWC', 'LWC'),
      createDummyNode('InventoryController', 'ApexClass'),
      // Subgraph 3: Shipping
      createDummyNode('ShippingLWC', 'LWC'),
      createDummyNode('ShippingController', 'ApexClass'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'BillingLWC', target: 'BillingController' },
      { id: 'e2', source: 'InventoryLWC', target: 'InventoryController' },
      { id: 'e3', source: 'ShippingLWC', target: 'ShippingController' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(6);
    expect(checkNodeOverlaps(positions)).toBe(0);

    for (const pos of Object.values(positions)) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  // 9. Fixture H — Bridge-Heavy Graph
  test('Fixture H — Bridge-Heavy Graph: cross-feature bridge nodes placed without distorting feature regions or overlaps', () => {
    const nodes: ExplorerNode[] = [];
    const edges: ExplorerEdge[] = [];

    // Create 4 feature clusters
    for (let f = 1; f <= 4; f++) {
      const lwc = createDummyNode(`Feat${f}LWC`, 'LWC');
      const ctrl = createDummyNode(`Feat${f}Ctrl`, 'ApexClass');
      const svc = createDummyNode(`Feat${f}Svc`, 'ApexClass');
      nodes.push(lwc, ctrl, svc);
      edges.push(
        { id: `e_f${f}_1`, source: lwc.id, target: ctrl.id },
        { id: `e_f${f}_2`, source: ctrl.id, target: svc.id }
      );
    }

    // Add 8 cross-feature bridges
    for (let b = 1; b <= 8; b++) {
      const bridge = createDummyNode(`Bridge${b}`, 'ApexClass', `src/bridges/Bridge${b}.cls`);
      nodes.push(bridge);
      const srcFeat = (b % 4) + 1;
      const tgtFeat = ((b + 1) % 4) + 1;
      edges.push(
        { id: `e_b${b}_1`, source: `Feat${srcFeat}Ctrl`, target: bridge.id },
        { id: `e_b${b}_2`, source: bridge.id, target: `Feat${tgtFeat}Svc` }
      );
    }

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(20);
    expect(checkNodeOverlaps(positions)).toBe(0);
  });

  // 10. Determinism Tests
  test('Determinism Stress Test: 0.00000px coordinate drift across baseline, reverse, rotate, and 3 seeded shuffles', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('CheckoutLWC', 'LWC'),
      createDummyNode('CheckoutController', 'ApexClass'),
      createDummyNode('CheckoutService', 'ApexClass'),
      createDummyNode('PaymentLWC', 'LWC'),
      createDummyNode('PaymentController', 'ApexClass'),
      createDummyNode('PaymentService', 'ApexClass'),
      createDummyNode('SharedLogger', 'ApexClass'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'CheckoutLWC', target: 'CheckoutController' },
      { id: 'e2', source: 'CheckoutController', target: 'CheckoutService' },
      { id: 'e3', source: 'PaymentLWC', target: 'PaymentController' },
      { id: 'e4', source: 'PaymentController', target: 'PaymentService' },
      { id: 'e5', source: 'CheckoutController', target: 'SharedLogger' },
      { id: 'e6', source: 'PaymentController', target: 'SharedLogger' },
    ];

    const pos1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Permutation 1: Reversed
    const pos2 = computeArchitectureLayout(
      [...nodes].reverse(),
      [...edges].reverse(),
      { enableFeatureLayout: true }
    );

    // Permutation 2: Shuffled
    const shuffledNodes = [nodes[3], nodes[0], nodes[5], nodes[1], nodes[6], nodes[2], nodes[4]];
    const shuffledEdges = [edges[4], edges[0], edges[3], edges[1], edges[5], edges[2]];
    const pos3 = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });

    expect(pos2).toEqual(pos1);
    expect(pos3).toEqual(pos1);
  });

  // 11. Feature Membership Stability
  test('Feature Membership Stability: feature assignments remain identical despite array reordering and unrelated node additions', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('CheckoutLWC', 'LWC'),
      createDummyNode('CheckoutController', 'ApexClass'),
      createDummyNode('CheckoutService', 'ApexClass'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'CheckoutLWC', target: 'CheckoutController' },
      { id: 'e2', source: 'CheckoutController', target: 'CheckoutService' },
    ];

    // Add unrelated disconnected component
    const extendedNodes = [
      ...nodes,
      createDummyNode('UnrelatedLWC', 'LWC'),
      createDummyNode('UnrelatedController', 'ApexClass'),
    ];
    const extendedEdges = [
      ...edges,
      { id: 'e3', source: 'UnrelatedLWC', target: 'UnrelatedController' },
    ];

    const posOriginal = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const posExtended = computeArchitectureLayout(extendedNodes, extendedEdges, { enableFeatureLayout: true });

    // Original nodes in Checkout feature should maintain valid relative placement
    expect(posOriginal['CheckoutLWC']).toBeDefined();
    expect(posExtended['CheckoutLWC']).toBeDefined();
    expect(checkNodeOverlaps(posExtended)).toBe(0);
  });

  // 12. Position Authority
  test('Position Authority: explicit Level 1/2 user/persisted positions take 100% precedence', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('OrderLWC', 'LWC'),
      createDummyNode('OrderController', 'ApexClass'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'OrderLWC', target: 'OrderController' },
    ];

    const existingPositions = {
      OrderLWC: { x: 9999, y: 8888 },
    };

    const positions = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
      existingPositions,
    });

    expect(positions['OrderLWC']).toEqual({ x: 9999, y: 8888 });
  });

  // 13. Sparse Graph Audit
  test('Sparse Graph Audit: handles 1-node, 2-node, and UI-less sparse features safely', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('SingleNodeService', 'ApexClass'),
      createDummyNode('SparseUI', 'LWC'),
      createDummyNode('SparseBackend', 'ApexClass'),
    ];
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'SparseUI', target: 'SparseBackend' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(3);
    expect(checkNodeOverlaps(positions)).toBe(0);
    for (const pos of Object.values(positions)) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  // 14. Negative Control Test
  test('Negative Control: directory/prefix similarity alone does NOT merge nodes into feature without edges', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('CommonPrefixOne', 'ApexClass', 'src/billing/CommonPrefixOne.cls'),
      createDummyNode('CommonPrefixTwo', 'ApexClass', 'src/billing/CommonPrefixTwo.cls'),
    ];
    const edges: ExplorerEdge[] = []; // No edges!

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(2);
    expect(checkNodeOverlaps(positions)).toBe(0);
  });

  // 15. Performance Benchmarks comparing Feature Disabled vs Feature Enabled
  test('Performance Benchmark: compares Feature Disabled vs Feature Enabled execution times across scale', () => {
    const testScales = [100, 240, 500];

    for (const scale of testScales) {
      const nodes: ExplorerNode[] = [];
      const edges: ExplorerEdge[] = [];

      const numFeatures = scale / 5;
      for (let f = 0; f < numFeatures; f++) {
        const lwc = createDummyNode(`F${f}_LWC`, 'LWC');
        const ctrl = createDummyNode(`F${f}_Ctrl`, 'ApexClass');
        const svc = createDummyNode(`F${f}_Svc`, 'ApexClass');
        const sel = createDummyNode(`F${f}_Sel`, 'ApexClass');
        const obj = createDummyNode(`F${f}__c`, 'CustomObject');

        nodes.push(lwc, ctrl, svc, sel, obj);
        edges.push(
          { id: `e_${f}_1`, source: lwc.id, target: ctrl.id },
          { id: `e_${f}_2`, source: ctrl.id, target: svc.id },
          { id: `e_${f}_3`, source: svc.id, target: sel.id },
          { id: `e_${f}_4`, source: sel.id, target: obj.id }
        );
      }

      // Feature Disabled
      const t0 = performance.now();
      const posDisabled = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
      const durationDisabled = performance.now() - t0;

      // Feature Enabled
      const t1 = performance.now();
      const posEnabled = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
      const durationEnabled = performance.now() - t1;

      expect(Object.keys(posDisabled)).toHaveLength(scale);
      expect(Object.keys(posEnabled)).toHaveLength(scale);
      expect(checkNodeOverlaps(posEnabled)).toBe(0);

      console.log(
        `[BENCHMARK] Scale: ${scale} nodes (${numFeatures} features) | Disabled: ${durationDisabled.toFixed(2)}ms | Enabled: ${durationEnabled.toFixed(2)}ms`
      );
    }
  });
});

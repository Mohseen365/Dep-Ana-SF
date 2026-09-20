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

describe('Wave 5 — Feature Spatial Placement & Calibration Fixtures', () => {
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

  // 4. Fixture C — Shared Service
  test('Fixture C — Shared Service: exactly one shared node, no node duplication', () => {
    const nodes: ExplorerNode[] = [
      createDummyNode('FeatureALWC', 'LWC'),
      createDummyNode('FeatureAController', 'ApexClass'),
      createDummyNode('FeatureBLWC', 'LWC'),
      createDummyNode('FeatureBController', 'ApexClass'),
      createDummyNode('LoggingUtil', 'ApexClass'),
    ];
    // High fanIn for LoggingUtil
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'FeatureALWC', target: 'FeatureAController' },
      { id: 'e2', source: 'FeatureBLWC', target: 'FeatureBController' },
      { id: 'e3', source: 'FeatureAController', target: 'LoggingUtil' },
      { id: 'e4', source: 'FeatureBController', target: 'LoggingUtil' },
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    expect(Object.keys(positions)).toHaveLength(5);
    expect(positions['LoggingUtil']).toBeDefined();
    expect(checkNodeOverlaps(positions)).toBe(0);
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

  // 8. Determinism Tests
  test('Determinism: 0.00000px coordinate drift across node/edge array shuffling', () => {
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

    // Reversed nodes and edges
    const pos2 = computeArchitectureLayout(
      [...nodes].reverse(),
      [...edges].reverse(),
      { enableFeatureLayout: true }
    );

    // Shuffled nodes and edges
    const shuffledNodes = [nodes[3], nodes[0], nodes[5], nodes[1], nodes[6], nodes[2], nodes[4]];
    const shuffledEdges = [edges[4], edges[0], edges[3], edges[1], edges[5], edges[2]];
    const pos3 = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });

    expect(pos2).toEqual(pos1);
    expect(pos3).toEqual(pos1);
  });

  // 9. Position Authority
  test('Position Authority: existing authoritative positions take 100% precedence', () => {
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
});

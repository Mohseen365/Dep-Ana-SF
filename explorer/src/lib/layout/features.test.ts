import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';

function createNode(id: string, displayName: string, type: string, extra: Partial<ExplorerNode> = {}): ExplorerNode {
  return {
    id,
    displayName,
    type: type as any,
    file: extra.file || `classes/${displayName}.cls`,
    metrics: extra.metrics || { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: extra.behavior || {
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
    ...extra,
  };
}

function createEdge(id: string, source: string, target: string): ExplorerEdge {
  return { id, source, target } as ExplorerEdge;
}

describe('features module (Feature Discovery)', () => {
  describe('Seed Selection & Priority Ranking', () => {
    it('ranks LWC and Controllers above utilities and prevents utilities/tests/objects from seeding', () => {
      const nodes = [
        createNode('LWC:checkoutComponent', 'checkoutComponent', 'LWC'),
        createNode('ApexClass:OrderController', 'OrderController', 'ApexClass'),
        createNode('ApexClass:AppLogger', 'AppLogger', 'ApexClass', { metrics: { fanIn: 10, fanOut: 0, coupling: 10, unresolved: 0, score: 0 } }),
        createNode('Object:Order__c', 'Order__c', 'CustomObject'),
        createNode('ApexClass:OrderControllerTest', 'OrderControllerTest', 'ApexClass', { behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 } }),
      ];

      const edges = [
        createEdge('e1', 'LWC:checkoutComponent', 'ApexClass:OrderController'),
        createEdge('e2', 'ApexClass:OrderController', 'ApexClass:AppLogger'),
        createEdge('e3', 'ApexClass:OrderControllerTest', 'ApexClass:OrderController'),
      ];

      const result = discoverFeatures(nodes, edges);

      // AppLogger, Order__c, OrderControllerTest must NOT seed features
      const featureAnchors = result.featureList.map(f => f.anchorNodeId);
      expect(featureAnchors).toContain('LWC:checkoutComponent');
      expect(featureAnchors).not.toContain('ApexClass:AppLogger');
      expect(featureAnchors).not.toContain('Object:Order__c');
      expect(featureAnchors).not.toContain('ApexClass:OrderControllerTest');
    });

    it('breaks ties deterministically using localeCompare on node ID', () => {
      const nodes = [
        createNode('ApexClass:BController', 'BController', 'ApexClass'),
        createNode('ApexClass:AController', 'AController', 'ApexClass'),
      ];
      const edges: ExplorerEdge[] = [];

      const result1 = discoverFeatures(nodes, edges);
      const result2 = discoverFeatures([...nodes].reverse(), edges);

      expect(result1.featureList.map(f => f.id)).toEqual(result2.featureList.map(f => f.id));
      expect(result1.featureList[0].anchorNodeId).toBe('ApexClass:AController');
      expect(result1.featureList[1].anchorNodeId).toBe('ApexClass:BController');
    });
  });

  describe('Candidate Expansion & Architectural Chain Alignment', () => {
    it('forms strong feature affinity along LWC -> Controller -> Service -> Selector chain', () => {
      const nodes = [
        createNode('LWC:orderHeader', 'orderHeader', 'LWC'),
        createNode('ApexClass:OrderController', 'OrderController', 'ApexClass'),
        createNode('ApexClass:OrderService', 'OrderService', 'ApexClass'),
        createNode('ApexClass:OrderSelector', 'OrderSelector', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'LWC:orderHeader', 'ApexClass:OrderController'),
        createEdge('e2', 'ApexClass:OrderController', 'ApexClass:OrderService'),
        createEdge('e3', 'ApexClass:OrderService', 'ApexClass:OrderSelector'),
      ];

      const result = discoverFeatures(nodes, edges);

      expect(result.featureList.length).toBe(1);
      const feat = result.featureList[0];
      expect(feat.primaryNodeIds).toContain('LWC:orderHeader');
      expect(feat.primaryNodeIds).toContain('ApexClass:OrderController');
      expect(feat.primaryNodeIds).toContain('ApexClass:OrderService');
      expect(feat.primaryNodeIds).toContain('ApexClass:OrderSelector');
    });

    it('prevents disconnected nodes from becoming one Feature', () => {
      const nodes = [
        createNode('ApexClass:OrderController', 'OrderController', 'ApexClass'),
        createNode('ApexClass:OrderService', 'OrderService', 'ApexClass'),
        createNode('ApexClass:BillingController', 'BillingController', 'ApexClass'),
        createNode('ApexClass:BillingService', 'BillingService', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:OrderController', 'ApexClass:OrderService'),
        createEdge('e2', 'ApexClass:BillingController', 'ApexClass:BillingService'),
      ];

      const result = discoverFeatures(nodes, edges);

      expect(result.featureList.length).toBe(2);
      const orderFeat = result.features.get('feature_OrderController');
      const billingFeat = result.features.get('feature_BillingController');

      expect(orderFeat?.primaryNodeIds).toEqual(['ApexClass:OrderController', 'ApexClass:OrderService']);
      expect(billingFeat?.primaryNodeIds).toEqual(['ApexClass:BillingController', 'ApexClass:BillingService']);
    });

    it('does NOT create feature membership from domain match alone without dependency edges', () => {
      const nodes = [
        createNode('ApexClass:OrderController', 'OrderController', 'ApexClass'),
        createNode('ApexClass:OrderHelper', 'OrderHelper', 'ApexClass'),
      ];
      const edges: ExplorerEdge[] = []; // No edges!

      const domainMap = new Map([
        ['ApexClass:OrderController', 'Billing'],
        ['ApexClass:OrderHelper', 'Billing'],
      ]);

      const result = discoverFeatures(nodes, edges, { domainMap });

      // Because there are no dependency edges, domain match alone yields score < 3.0 and does not merge them into one feature
      expect(result.featureList.length).toBe(2);
    });
  });

  describe('Shared Infrastructure Protection & Multi-Membership', () => {
    it('isolates shared logger between two features without merging features or duplicating nodes', () => {
      const nodes = [
        createNode('ApexClass:CheckoutController', 'CheckoutController', 'ApexClass'),
        createNode('ApexClass:CheckoutService', 'CheckoutService', 'ApexClass'),
        createNode('ApexClass:InventoryController', 'InventoryController', 'ApexClass'),
        createNode('ApexClass:InventoryService', 'InventoryService', 'ApexClass'),
        createNode('ApexClass:AppLogger', 'AppLogger', 'ApexClass', { metrics: { fanIn: 6, fanOut: 0, coupling: 6, unresolved: 0, score: 0 } }),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:CheckoutController', 'ApexClass:CheckoutService'),
        createEdge('e2', 'ApexClass:CheckoutService', 'ApexClass:AppLogger'),
        createEdge('e3', 'ApexClass:InventoryController', 'ApexClass:InventoryService'),
        createEdge('e4', 'ApexClass:InventoryService', 'ApexClass:AppLogger'),
      ];

      const result = discoverFeatures(nodes, edges);

      // Feature A (Checkout) and Feature B (Inventory) remain distinct
      expect(result.featureList.length).toBe(2);
      const checkoutFeat = result.features.get('feature_CheckoutController');
      const inventoryFeat = result.features.get('feature_InventoryController');

      expect(checkoutFeat?.primaryNodeIds).not.toContain('ApexClass:InventoryController');
      expect(inventoryFeat?.primaryNodeIds).not.toContain('ApexClass:CheckoutController');

      // AppLogger is listed as secondary in both features
      expect(checkoutFeat?.secondaryNodeIds).toContain('ApexClass:AppLogger');
      expect(inventoryFeat?.secondaryNodeIds).toContain('ApexClass:AppLogger');

      // Exactly ONE node assignment entry for AppLogger with primaryFeatureId = 'Shared'
      const loggerAssignment = result.assignments.get('ApexClass:AppLogger');
      expect(loggerAssignment).toBeDefined();
      expect(loggerAssignment?.primaryFeatureId).toBe('Shared');
      expect(loggerAssignment?.secondaryFeatureIds.length).toBe(2);
      expect(loggerAssignment?.isShared).toBe(true);

      // Ensure total assignment count equals node count (zero node duplication)
      expect(result.assignments.size).toBe(nodes.length);
    });
  });

  describe('Satellites Inheritance', () => {
    it('attaches test node to production target feature as secondary satellite', () => {
      const nodes = [
        createNode('ApexClass:OrderController', 'OrderController', 'ApexClass'),
        createNode('ApexClass:OrderService', 'OrderService', 'ApexClass'),
        createNode('ApexClass:OrderServiceTest', 'OrderServiceTest', 'ApexClass', {
          behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        }),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:OrderController', 'ApexClass:OrderService'),
        createEdge('e2', 'ApexClass:OrderServiceTest', 'ApexClass:OrderService'),
      ];

      const result = discoverFeatures(nodes, edges);

      const feat = result.features.get('feature_OrderController');
      expect(feat?.secondaryNodeIds).toContain('ApexClass:OrderServiceTest');

      const testAssignment = result.assignments.get('ApexClass:OrderServiceTest');
      expect(testAssignment?.primaryFeatureId).toBe('feature_OrderController');
      expect(testAssignment?.featureRole).toBe('FeatureTest');
    });
  });

  describe('Determinism & Shuffling Invariance', () => {
    it('produces 100% identical feature assignments regardless of input node and edge array ordering', () => {
      const nodes = [
        createNode('LWC:cartView', 'cartView', 'LWC'),
        createNode('ApexClass:CartController', 'CartController', 'ApexClass'),
        createNode('ApexClass:CartService', 'CartService', 'CartService'),
        createNode('ApexClass:PaymentGateway', 'PaymentGateway', 'ApexClass'),
        createNode('ApexClass:AppLogger', 'AppLogger', 'ApexClass', { metrics: { fanIn: 8, fanOut: 0, coupling: 8, unresolved: 0, score: 0 } }),
      ];

      const edges = [
        createEdge('e1', 'LWC:cartView', 'ApexClass:CartController'),
        createEdge('e2', 'ApexClass:CartController', 'ApexClass:CartService'),
        createEdge('e3', 'ApexClass:CartService', 'ApexClass:PaymentGateway'),
        createEdge('e4', 'ApexClass:CartService', 'ApexClass:AppLogger'),
      ];

      const run1 = discoverFeatures(nodes, edges);
      const run2 = discoverFeatures([...nodes].reverse(), [...edges].reverse());

      expect(run1.featureList.map(f => f.id)).toEqual(run2.featureList.map(f => f.id));
      expect(Array.from(run1.assignments.entries())).toEqual(Array.from(run2.assignments.entries()));
    });
  });

  describe('Performance Benchmark', () => {
    it('executes within sub-frame latency (< 50ms) for 100+ node graph', () => {
      const nodes: ExplorerNode[] = [];
      const edges: ExplorerEdge[] = [];

      for (let i = 0; i < 20; i++) {
        const lwcId = `LWC:comp_${i}`;
        const ctrlId = `ApexClass:Ctrl_${i}`;
        const svcId = `ApexClass:Svc_${i}`;
        const selId = `ApexClass:Sel_${i}`;
        const testId = `ApexClass:SvcTest_${i}`;

        nodes.push(createNode(lwcId, `comp_${i}`, 'LWC'));
        nodes.push(createNode(ctrlId, `Ctrl_${i}`, 'ApexClass'));
        nodes.push(createNode(svcId, `Svc_${i}`, 'ApexClass'));
        nodes.push(createNode(selId, `Sel_${i}`, 'ApexClass'));
        nodes.push(createNode(testId, `SvcTest_${i}`, 'ApexClass', { behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 } }));

        edges.push(createEdge(`e_${i}_1`, lwcId, ctrlId));
        edges.push(createEdge(`e_${i}_2`, ctrlId, svcId));
        edges.push(createEdge(`e_${i}_3`, svcId, selId));
        edges.push(createEdge(`e_${i}_4`, testId, svcId));
      }

      // Shared logger
      const loggerId = 'ApexClass:GlobalLogger';
      nodes.push(createNode(loggerId, 'GlobalLogger', 'ApexClass', { metrics: { fanIn: 20, fanOut: 0, coupling: 20, unresolved: 0, score: 0 } }));
      for (let i = 0; i < 20; i++) {
        edges.push(createEdge(`e_log_${i}`, `ApexClass:Svc_${i}`, loggerId));
      }

      const start = performance.now();
      const result = discoverFeatures(nodes, edges);
      const elapsed = performance.now() - start;

      expect(result.featureList.length).toBe(20);
      expect(elapsed).toBeLessThan(50); // < 50ms
    });
  });
});

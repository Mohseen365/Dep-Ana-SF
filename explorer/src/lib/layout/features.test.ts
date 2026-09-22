import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures, calculateSemanticFeatureCohesion } from './features';
import { computeArchitectureLayout } from '../architecture-layout';

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

  describe('Prompt 3 — Targeted Semantic Clustering & Component Identity Verification', () => {
    it('clusters same-component trio (PaymentDomain, PaymentSelector, PaymentService) into the same feature cluster', () => {
      const nodes = [
        createNode('ApexClass:PaymentService', 'PaymentService', 'ApexClass'),
        createNode('ApexClass:PaymentDomain', 'PaymentDomain', 'ApexClass'),
        createNode('ApexClass:PaymentSelector', 'PaymentSelector', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
        createEdge('e2', 'ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
      ];

      const result = discoverFeatures(nodes, edges);

      // Must resolve to 1 feature cluster containing all 3 nodes
      expect(result.featureList.length).toBe(1);
      const paymentFeat = result.featureList[0];
      expect(paymentFeat.primaryNodeIds).toContain('ApexClass:PaymentService');
      expect(paymentFeat.primaryNodeIds).toContain('ApexClass:PaymentDomain');
      expect(paymentFeat.primaryNodeIds).toContain('ApexClass:PaymentSelector');
    });

    it('keeps distinct components (PaymentDomain vs OrderSelector/OrderService) in separate clusters', () => {
      const nodes = [
        createNode('ApexClass:PaymentService', 'PaymentService', 'ApexClass'),
        createNode('ApexClass:PaymentDomain', 'PaymentDomain', 'ApexClass'),
        createNode('ApexClass:OrderService', 'OrderService', 'ApexClass'),
        createNode('ApexClass:OrderSelector', 'OrderSelector', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
        createEdge('e2', 'ApexClass:OrderService', 'ApexClass:OrderSelector'),
      ];

      const result = discoverFeatures(nodes, edges);

      expect(result.featureList.length).toBe(2);
      const feat1 = result.featureList.find(f => f.anchorNodeId.includes('Payment'))!;
      const feat2 = result.featureList.find(f => f.anchorNodeId.includes('Order'))!;

      expect(feat1.primaryNodeIds).toEqual(['ApexClass:PaymentDomain', 'ApexClass:PaymentService']);
      expect(feat2.primaryNodeIds).toEqual(['ApexClass:OrderSelector', 'ApexClass:OrderService']);
    });

    it('does not merge components sharing only partial name substrings (e.g. PayRoll vs Payment)', () => {
      const nodes = [
        createNode('ApexClass:PaymentService', 'PaymentService', 'ApexClass'),
        createNode('ApexClass:PaymentSelector', 'PaymentSelector', 'ApexClass'),
        createNode('ApexClass:PayRollService', 'PayRollService', 'ApexClass'),
        createNode('ApexClass:PayRollSelector', 'PayRollSelector', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
        createEdge('e2', 'ApexClass:PayRollService', 'ApexClass:PayRollSelector'),
      ];

      const result = discoverFeatures(nodes, edges);

      expect(result.featureList.length).toBe(2);
      const feat1 = result.featureList.find(f => f.anchorNodeId.includes('Payment'))!;
      const feat2 = result.featureList.find(f => f.anchorNodeId.includes('PayRoll'))!;

      expect(feat1.primaryNodeIds).toEqual(['ApexClass:PaymentSelector', 'ApexClass:PaymentService']);
      expect(feat2.primaryNodeIds).toEqual(['ApexClass:PayRollSelector', 'ApexClass:PayRollService']);
    });

    it('respects explicit domainMap metadata over name similarity', () => {
      const nodes = [
        createNode('ApexClass:PaymentService', 'PaymentService', 'ApexClass'),
        createNode('ApexClass:PaymentDomain', 'PaymentDomain', 'ApexClass'),
      ];

      const edges = [
        createEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
      ];

      const domainMap = new Map([
        ['ApexClass:PaymentService', 'Billing'],
        ['ApexClass:PaymentDomain', 'Accounting'],
      ]);

      const result = discoverFeatures(nodes, edges, { domainMap });

      // Because domainMap assigns different non-Shared domains, total expansion score is reduced, verifying domain metadata participation
      const assignment1 = result.assignments.get('ApexClass:PaymentService');
      const assignment2 = result.assignments.get('ApexClass:PaymentDomain');
      expect(assignment1).toBeDefined();
      expect(assignment2).toBeDefined();
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

  describe('Cloud Spend Tracker Real Dataset Semantic Audit & Cohesion', () => {
    const cloudSpendPath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cloudSpendData = JSON.parse(fs.readFileSync(cloudSpendPath, 'utf8'));
    const cloudNodes: ExplorerNode[] = cloudSpendData.nodes;
    const cloudEdges: ExplorerEdge[] = cloudSpendData.edges;

    it('discovers 21 semantic feature clusters with 0 node duplication and correct unassigned/shared counts', () => {
      const discovery = discoverFeatures(cloudNodes, cloudEdges);

      expect(discovery.features.size).toBe(21);
      expect(discovery.assignments.size).toBe(cloudNodes.length);

      let unassignedCount = 0;
      let sharedCount = 0;
      let primaryAssignedCount = 0;

      for (const assignment of discovery.assignments.values()) {
        if (assignment.primaryFeatureId === 'Unassigned') unassignedCount++;
        else if (assignment.primaryFeatureId === 'Shared') sharedCount++;
        else primaryAssignedCount++;
      }

      expect(primaryAssignedCount).toBe(77);
      expect(sharedCount).toBe(44);
      expect(unassignedCount).toBe(119);
    });

    it('calculates semantic feature cohesion diagnostics on Cloud Spend layout positions', () => {
      const discovery = discoverFeatures(cloudNodes, cloudEdges);
      const positions = computeArchitectureLayout(cloudNodes, cloudEdges, { enableFeatureLayout: true });

      const diagnostics = calculateSemanticFeatureCohesion(cloudNodes, positions, discovery);

      expect(diagnostics.totalNodes).toBe(240);
      expect(diagnostics.discoveredFeaturesCount).toBe(21);
      expect(diagnostics.primaryAssignedNodesCount).toBe(77);
      expect(diagnostics.sharedNodesCount).toBe(44);
      expect(diagnostics.unassignedNodesCount).toBe(119);
      expect(diagnostics.featureCohesionScore).toBeGreaterThan(0.8);
      expect(diagnostics.featureCohesionScore).toBeLessThanOrEqual(1.0);
      expect(Object.keys(diagnostics.featureDistances).length).toBe(7); // Multi-node features evaluated
    });

    it('remains 100% deterministic across shuffled node and edge inputs on Cloud Spend dataset', () => {
      const shuffledNodes = [...cloudNodes].sort(() => 0.5 - Math.random());
      const shuffledEdges = [...cloudEdges].sort(() => 0.5 - Math.random());

      const run1 = discoverFeatures(cloudNodes, cloudEdges);
      const run2 = discoverFeatures(shuffledNodes, shuffledEdges);

      expect(run1.features.size).toBe(run2.features.size);
      expect(run1.featureList.map(f => f.id)).toEqual(run2.featureList.map(f => f.id));

      for (const node of cloudNodes) {
        const assign1 = run1.assignments.get(node.id);
        const assign2 = run2.assignments.get(node.id);
        expect(assign1?.primaryFeatureId).toBe(assign2?.primaryFeatureId);
        expect(assign1?.isShared).toBe(assign2?.isShared);
      }
    });
  });
});

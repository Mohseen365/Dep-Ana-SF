import { describe, it, expect, vi } from 'vitest';
import {
  computeArchitectureLayout,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
} from './architecture-layout';
import * as analysisModule from './layout/analysis';
import * as domainsModule from './layout/domains';
import { evaluateLayout } from './layout/evaluate-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

function createMockNode(overrides: Partial<ExplorerNode>): ExplorerNode {
  const id = overrides.id || 'ApexClass:TestNode';
  const name = overrides.displayName || id.split(':').pop() || 'TestNode';
  return {
    id,
    displayName: name,
    type: overrides.type || 'ApexClass',
    file: overrides.file || `force-app/main/default/classes/${name}.cls`,
    metrics: {
      fanIn: 2,
      fanOut: 2,
      coupling: 4,
      unresolved: 0,
      score: 5,
      ...overrides.metrics,
    },
    risk: overrides.risk || 'LOW',
    riskReasons: overrides.riskReasons || [],
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 0,
      dmlCount: 0,
      calloutCount: 0,
      ...overrides.behavior,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
      ...overrides.refactoringReadiness,
    },
  };
}

function createMockEdge(source: string, target: string, id?: string): ExplorerEdge {
  return {
    id: id || `${source}->${target}`,
    source,
    target,
    relationshipType: 'method-call',
    method: 'call',
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: null,
    column: null,
    methodOwner: null,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  };
}

describe('Intelligent Architecture-Aware Layout Engine', () => {
  describe('Classification Helpers', () => {
    it('extracts domain stems correctly', () => {
      expect(extractDomainStem('OrderService')).toBe('Order');
      expect(extractDomainStem('OrderController')).toBe('Order');
      expect(extractDomainStem('PaymentProcessor')).toBe('Payment');
      expect(extractDomainStem('BillingRepository')).toBe('Billing');
      expect(extractDomainStem('AccountSelector')).toBe('Account');
      expect(extractDomainStem('Util')).toBe(null);
    });

    it('identifies test nodes correctly', () => {
      const prodNode = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      const testNode = createMockNode({
        id: 'ApexClass:OrderServiceTest',
        displayName: 'OrderServiceTest',
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      });
      expect(isTestNode(prodNode)).toBe(false);
      expect(isTestNode(testNode)).toBe(true);
    });

    it('classifies architectural layers correctly', () => {
      const lwcNode = createMockNode({ type: 'LWC', displayName: 'orderSummary' });
      const controllerNode = createMockNode({ type: 'ApexClass', displayName: 'OrderController' });
      const domainNode = createMockNode({ type: 'ApexClass', displayName: 'OrderSelector' });
      const schemaNode = createMockNode({ type: 'CustomObject', displayName: 'Order__c' });

      expect(classifyNodeLayer(lwcNode)).toBe('presentation');
      expect(classifyNodeLayer(controllerNode)).toBe('application');
      expect(classifyNodeLayer(domainNode)).toBe('domain');
      expect(classifyNodeLayer(schemaNode)).toBe('schema');
    });
  });

  describe('WAVE 5 REQUIRED INTEGRATION TESTS', () => {
    it('Test 1 — Basic layered architecture: LWC -> Controller -> Service -> Selector -> Object -> Field', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController', type: 'ApexClass' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService', type: 'ApexClass' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector', type: 'ApexClass' }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
        createMockNode({ id: 'Order__c.Status__c', displayName: 'Status__c', type: 'CustomField' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('LWC:OrderView', 'ApexClass:OrderController'),
        createMockEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:OrderService', 'ApexClass:OrderSelector'),
        createMockEdge('ApexClass:OrderSelector', 'CustomObject:Order__c'),
        createMockEdge('Order__c.Status__c', 'CustomObject:Order__c'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      nodes.forEach(n => {
        expect(positions[n.id]).toBeDefined();
        expect(Number.isFinite(positions[n.id].x)).toBe(true);
        expect(Number.isFinite(positions[n.id].y)).toBe(true);
      });

      const yPres = positions['LWC:OrderView'].y;
      const yApp = positions['ApexClass:OrderController'].y;
      const yDom = positions['ApexClass:OrderSelector'].y;
      const ySchema = positions['CustomObject:Order__c'].y;

      expect(yPres).toBeLessThan(yApp);
      expect(yApp).toBeLessThan(yDom);
      expect(yDom).toBeLessThan(ySchema);

      const objPos = positions['CustomObject:Order__c'];
      const fieldPos = positions['Order__c.Status__c'];
      expect(Math.abs(objPos.x - fieldPos.x)).toBeLessThan(200);
      expect(Math.abs(objPos.y - fieldPos.y)).toBeLessThan(200);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 2 — Two domains: Order & Payment with cross-domain dependency', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:PaymentSelector', displayName: 'PaymentSelector' }),
        createMockNode({ id: 'ApexClass:CheckoutBridge', displayName: 'CheckoutBridge' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexClass:OrderService', 'ApexClass:OrderSelector'),
        createMockEdge('ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
        createMockEdge('ApexClass:CheckoutBridge', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:CheckoutBridge', 'ApexClass:PaymentService'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const orderDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:OrderSelector'].x);
      const crossDomainDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:PaymentService'].x);

      expect(orderDist).toBeLessThan(crossDomainDist);

      const xOrder = positions['ApexClass:OrderService'].x;
      const xPayment = positions['ApexClass:PaymentService'].x;
      const xBridge = positions['ApexClass:CheckoutBridge'].x;
      const minX = Math.min(xOrder, xPayment);
      const maxX = Math.max(xOrder, xPayment);

      expect(xBridge).toBeGreaterThanOrEqual(minX - 50);
      expect(xBridge).toBeLessThanOrEqual(maxX + 50);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 3 — Hub-heavy graph: Central HUB node with surrounding callers and callees', () => {
      const hubNode = createMockNode({ id: 'ApexClass:CentralHub', displayName: 'CentralHub' });
      const nodes = [
        hubNode,
        createMockNode({ id: 'ApexClass:CallerA', displayName: 'CallerA' }),
        createMockNode({ id: 'ApexClass:CallerB', displayName: 'CallerB' }),
        createMockNode({ id: 'ApexClass:CalleeC', displayName: 'CalleeC' }),
        createMockNode({ id: 'ApexClass:CalleeD', displayName: 'CalleeD' }),
      ];

      const edges = [
        createMockEdge('ApexClass:CallerA', 'ApexClass:CentralHub'),
        createMockEdge('ApexClass:CallerB', 'ApexClass:CentralHub'),
        createMockEdge('ApexClass:CentralHub', 'ApexClass:CalleeC'),
        createMockEdge('ApexClass:CentralHub', 'ApexClass:CalleeD'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const hubPos = positions['ApexClass:CentralHub'];
      const avgNeighborX =
        (positions['ApexClass:CallerA'].x +
          positions['ApexClass:CallerB'].x +
          positions['ApexClass:CalleeC'].x +
          positions['ApexClass:CalleeD'].x) / 4;

      expect(Math.abs(hubPos.x - avgNeighborX)).toBeLessThan(300);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 4 — Bridge-heavy graph: Cross-domain bridge between domains', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:BillingService', displayName: 'BillingService' }),
        createMockNode({ id: 'ApexClass:TriBridge', displayName: 'TriBridge' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexClass:TriBridge', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:TriBridge', 'ApexClass:PaymentService'),
        createMockEdge('ApexClass:TriBridge', 'ApexClass:BillingService'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      expect(positions['ApexClass:TriBridge']).toBeDefined();
      expect(positions['ApexClass:OrderService']).toBeDefined();
      expect(positions['ApexClass:PaymentService']).toBeDefined();
      expect(positions['ApexClass:BillingService']).toBeDefined();

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 5 — Tests and fields: Production node with multiple tests and Object with fields', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:OrderServiceTest', displayName: 'OrderServiceTest', behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 } }),
        createMockNode({ id: 'ApexClass:OrderServiceMockTest', displayName: 'OrderServiceMockTest', behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 } }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
        createMockNode({ id: 'Order__c.Total__c', displayName: 'Total__c', type: 'CustomField' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexClass:OrderServiceTest', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:OrderServiceMockTest', 'ApexClass:OrderService'),
        createMockEdge('Order__c.Total__c', 'CustomObject:Order__c'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const prodPos = positions['ApexClass:OrderService'];
      const testPos1 = positions['ApexClass:OrderServiceTest'];
      const testPos2 = positions['ApexClass:OrderServiceMockTest'];

      expect(Math.abs(prodPos.x - testPos1.x)).toBeLessThan(500);
      expect(Math.abs(prodPos.x - testPos2.x)).toBeLessThan(500);

      const objPos = positions['CustomObject:Order__c'];
      const fieldPos = positions['Order__c.Total__c'];
      expect(Math.abs(objPos.x - fieldPos.x)).toBeLessThan(200);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 6 — Trigger / Handler: Microcluster proximity without pulling unrelated nodes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexTrigger:AccountTrigger', displayName: 'AccountTrigger', type: 'ApexTrigger' }),
        createMockNode({ id: 'ApexClass:AccountTriggerHandler', displayName: 'AccountTriggerHandler', type: 'ApexClass' }),
        createMockNode({ id: 'ApexClass:UnrelatedService', displayName: 'UnrelatedService', type: 'ApexClass' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexTrigger:AccountTrigger', 'ApexClass:AccountTriggerHandler'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const trigPos = positions['ApexTrigger:AccountTrigger'];
      const handPos = positions['ApexClass:AccountTriggerHandler'];
      const unrelPos = positions['ApexClass:UnrelatedService'];

      const microclusterDist = Math.sqrt(Math.pow(trigPos.x - handPos.x, 2) + Math.pow(trigPos.y - handPos.y, 2));
      const unrelDist = Math.sqrt(Math.pow(trigPos.x - unrelPos.x, 2) + Math.pow(trigPos.y - unrelPos.y, 2));

      expect(microclusterDist).toBeLessThan(unrelDist);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 7 — Disconnected components: Multiple disconnected components of different sizes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:CompA1', displayName: 'CompA1' }),
        createMockNode({ id: 'ApexClass:CompA2', displayName: 'CompA2' }),
        createMockNode({ id: 'ApexClass:CompB1', displayName: 'CompB1' }),
        createMockNode({ id: 'ApexClass:CompB2', displayName: 'CompB2' }),
        createMockNode({ id: 'ApexClass:CompB3', displayName: 'CompB3' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexClass:CompA1', 'ApexClass:CompA2'),
        createMockEdge('ApexClass:CompB1', 'ApexClass:CompB2'),
        createMockEdge('ApexClass:CompB2', 'ApexClass:CompB3'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const maxXCompA = Math.max(positions['ApexClass:CompA1'].x, positions['ApexClass:CompA2'].x);
      const minXCompB = Math.min(positions['ApexClass:CompB1'].x, positions['ApexClass:CompB2'].x, positions['ApexClass:CompB3'].x);

      expect(Math.abs(minXCompB - maxXCompA)).toBeGreaterThan(100);

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 8 — Dense graph: Dense fixture with many cross edges', () => {
      const nodes: ExplorerNode[] = Array.from({ length: 15 }, (_, i) =>
        createMockNode({ id: `ApexClass:DenseNode_${i}`, displayName: `DenseNode_${i}` })
      );

      const edges: ExplorerEdge[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < Math.min(nodes.length, i + 4); j++) {
          edges.push(createMockEdge(nodes[i].id, nodes[j].id));
        }
      }

      const positions = computeArchitectureLayout(nodes, edges);

      nodes.forEach(n => {
        expect(positions[n.id]).toBeDefined();
        expect(Number.isFinite(positions[n.id].x)).toBe(true);
        expect(Number.isFinite(positions[n.id].y)).toBe(true);
        expect(Number.isNaN(positions[n.id].x)).toBe(false);
        expect(Number.isNaN(positions[n.id].y)).toBe(false);
      });

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('Test 9 — Large graph (100+ nodes): Bounded execution, finite coordinates, determinism', () => {
      const nodes: ExplorerNode[] = Array.from({ length: 100 }, (_, i) =>
        createMockNode({
          id: `ApexClass:LargeNode_${i}`,
          displayName: `LargeNode_${i}`,
          type: i % 10 === 0 ? 'CustomObject' : i % 5 === 0 ? 'LWC' : 'ApexClass',
        })
      );

      const edges: ExplorerEdge[] = [];
      for (let i = 0; i < 90; i++) {
        edges.push(createMockEdge(`ApexClass:LargeNode_${i}`, `ApexClass:LargeNode_${i + 1}`));
      }

      const startTime = performance.now();
      const run1 = computeArchitectureLayout(nodes, edges);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(3000);

      const run2 = computeArchitectureLayout(nodes, edges);
      expect(run1).toEqual(run2);

      nodes.forEach(n => {
        expect(run1[n.id]).toBeDefined();
        expect(Number.isFinite(run1[n.id].x)).toBe(true);
        expect(Number.isFinite(run1[n.id].y)).toBe(true);
      });
    });

    it('Test 10 — Existing Positions: Authoritative position preservation in existingPositions', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:ExistingNode', displayName: 'ExistingNode' }),
        createMockNode({ id: 'ApexClass:NewNode', displayName: 'NewNode' }),
      ];

      const edges: ExplorerEdge[] = [];
      const existingPositions = {
        'ApexClass:ExistingNode': { x: 777, y: 888 },
      };

      const positions = computeArchitectureLayout(nodes, edges, { existingPositions });

      expect(positions['ApexClass:ExistingNode']).toEqual({ x: 777, y: 888 });
      expect(positions['ApexClass:NewNode']).toBeDefined();
      expect(positions['ApexClass:NewNode']).not.toEqual({ x: 777, y: 888 });
    });

    it('Test 11 — Deterministic reproducibility on identical inputs', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('LWC:OrderView', 'ApexClass:OrderController'),
        createMockEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:OrderService', 'ApexClass:PaymentService'),
        createMockEdge('ApexClass:OrderService', 'CustomObject:Order__c'),
      ];

      const run1 = computeArchitectureLayout(nodes, edges);
      const run2 = computeArchitectureLayout(nodes, edges);
      const run3 = computeArchitectureLayout(nodes, edges);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });
  });

  describe('WAVE 7A PERFORMANCE OPTIMIZATION VERIFICATION', () => {
    it('executes computeArchitectureAnalysis and discoverDomains exactly ONCE per layout run', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('LWC:OrderView', 'ApexClass:OrderController'),
        createMockEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:OrderService', 'ApexClass:PaymentService'),
        createMockEdge('ApexClass:OrderService', 'CustomObject:Order__c'),
      ];

      const analysisSpy = vi.spyOn(analysisModule, 'computeArchitectureAnalysis');
      const domainsSpy = vi.spyOn(domainsModule, 'discoverDomains');

      analysisSpy.mockClear();
      domainsSpy.mockClear();

      const positions = computeArchitectureLayout(nodes, edges);

      expect(positions).toBeDefined();
      expect(Object.keys(positions).length).toBe(nodes.length);

      expect(analysisSpy).toHaveBeenCalledTimes(1);
      expect(domainsSpy).toHaveBeenCalledTimes(1);

      analysisSpy.mockRestore();
      domainsSpy.mockRestore();
    });
  });

  describe('HYBRID LAYOUT PROMPT 2 PIPELINE INTEGRATION VERIFICATION', () => {
    it('1. Feature Layout Toggle: enableFeatureLayout false vs true produces valid non-overlapping layouts', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:PaymentSelector', displayName: 'PaymentSelector' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('LWC:OrderView', 'ApexClass:OrderController'),
        createMockEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
        createMockEdge('ApexClass:OrderService', 'ApexClass:PaymentService'),
        createMockEdge('ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
      ];

      const domainPositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
      const featurePositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      expect(domainPositions).toBeDefined();
      expect(featurePositions).toBeDefined();

      const evalDomain = evaluateLayout(nodes, edges, domainPositions);
      const evalFeature = evaluateLayout(nodes, edges, featurePositions);

      expect(evalDomain.nodeOverlapCount).toBe(0);
      expect(evalFeature.nodeOverlapCount).toBe(0);
    });

    it('2. Feature Map Propagation: Feature map survives through global, ordering, local, and cleanup passes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:FeatureA_Svc', displayName: 'FeatureA_Svc' }),
        createMockNode({ id: 'ApexClass:FeatureA_Sel', displayName: 'FeatureA_Sel' }),
        createMockNode({ id: 'ApexClass:FeatureB_Svc', displayName: 'FeatureB_Svc' }),
        createMockNode({ id: 'ApexClass:FeatureB_Sel', displayName: 'FeatureB_Sel' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge('ApexClass:FeatureA_Svc', 'ApexClass:FeatureA_Sel'),
        createMockEdge('ApexClass:FeatureB_Svc', 'ApexClass:FeatureB_Sel'),
        createMockEdge('ApexClass:FeatureA_Svc', 'ApexClass:FeatureB_Svc'),
      ];

      const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      nodes.forEach(n => {
        expect(positions[n.id]).toBeDefined();
        expect(Number.isFinite(positions[n.id].x)).toBe(true);
        expect(Number.isFinite(positions[n.id].y)).toBe(true);
      });

      const evalMetrics = evaluateLayout(nodes, edges, positions);
      expect(evalMetrics.nodeOverlapCount).toBe(0);
    });

    it('3. Dense Region Safety: 50-node dense cluster retains physical node separation without overlaps', () => {
      const nodes: ExplorerNode[] = Array.from({ length: 50 }, (_, i) =>
        createMockNode({ id: `ApexClass:DenseCluster_${i}`, displayName: `DenseCluster_${i}` })
      );

      const edges: ExplorerEdge[] = [];
      for (let i = 0; i < 49; i++) {
        edges.push(createMockEdge(`ApexClass:DenseCluster_${i}`, `ApexClass:DenseCluster_${i + 1}`));
        if (i % 3 === 0 && i + 5 < 50) {
          edges.push(createMockEdge(`ApexClass:DenseCluster_${i}`, `ApexClass:DenseCluster_${i + 5}`));
        }
      }

      const domainPos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
      const featurePos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const evalDomain = evaluateLayout(nodes, edges, domainPos);
      const evalFeature = evaluateLayout(nodes, edges, featurePos);

      expect(evalDomain.nodeOverlapCount).toBe(0);
      expect(evalFeature.nodeOverlapCount).toBe(0);
    });

    it('4. Position Authority Invariance: Level 1/2 user/persisted positions take 100% precedence in both modes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:NodeA', displayName: 'NodeA' }),
        createMockNode({ id: 'ApexClass:NodeB', displayName: 'NodeB' }),
      ];
      const edges: ExplorerEdge[] = [createMockEdge('ApexClass:NodeA', 'ApexClass:NodeB')];

      const existingPositions = {
        'ApexClass:NodeA': { x: 500, y: 500 },
      };

      const domainPos = computeArchitectureLayout(nodes, edges, { existingPositions, enableFeatureLayout: false });
      const featurePos = computeArchitectureLayout(nodes, edges, { existingPositions, enableFeatureLayout: true });

      expect(domainPos['ApexClass:NodeA']).toEqual({ x: 500, y: 500 });
      expect(featurePos['ApexClass:NodeA']).toEqual({ x: 500, y: 500 });
    });
  });
});

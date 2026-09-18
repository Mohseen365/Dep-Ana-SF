import { describe, it, expect } from 'vitest';
import {
  computeArchitectureLayout,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
} from './architecture-layout';
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
      expect(extractDomainStem('Util')).toBe(null); // Generic stem
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

      // Verify finite deterministic positions
      nodes.forEach(n => {
        expect(positions[n.id]).toBeDefined();
        expect(Number.isFinite(positions[n.id].x)).toBe(true);
        expect(Number.isFinite(positions[n.id].y)).toBe(true);
      });

      // Verify layer vertical ordering
      const yPres = positions['LWC:OrderView'].y;
      const yApp = positions['ApexClass:OrderController'].y;
      const yDom = positions['ApexClass:OrderSelector'].y;
      const ySchema = positions['CustomObject:Order__c'].y;

      expect(yPres).toBeLessThan(yApp);
      expect(yApp).toBeLessThan(yDom);
      expect(yDom).toBeLessThan(ySchema);

      // Verify field near parent object
      const objPos = positions['CustomObject:Order__c'];
      const fieldPos = positions['Order__c.Status__c'];
      expect(Math.abs(objPos.x - fieldPos.x)).toBeLessThan(200);
      expect(Math.abs(objPos.y - fieldPos.y)).toBeLessThan(200);

      // Verify zero node overlaps
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

      // Bridge is placed between connected domains
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

      // Hub node sits spatially near average of neighbors
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

      const xOrder = positions['ApexClass:OrderService'].x;
      const xPayment = positions['ApexClass:PaymentService'].x;
      const xBilling = positions['ApexClass:BillingService'].x;

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

      expect(duration).toBeLessThan(3000); // Bounded execution expectation

      const run2 = computeArchitectureLayout(nodes, edges);
      expect(run1).toEqual(run2); // 100% Deterministic

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
});

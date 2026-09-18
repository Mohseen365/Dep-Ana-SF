import { describe, it, expect } from 'vitest';
import {
  discoverDomains,
  classifyNodeDomain,
  extractDomainStem,
  extractDomainFromPath,
  isTestNode,
  findProductionTarget,
  findParentObject,
} from './domains';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

function createMockNode(overrides: Partial<ExplorerNode>): ExplorerNode {
  return {
    id: overrides.id || 'ApexClass:TestNode',
    displayName: overrides.displayName || 'TestNode',
    type: overrides.type || 'ApexClass',
    file: overrides.file || 'force-app/main/default/classes/TestNode.cls',
    metrics: {
      fanIn: 1,
      fanOut: 1,
      coupling: 2,
      unresolved: 0,
      score: 3,
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

function createMockEdge(overrides: Partial<ExplorerEdge>): ExplorerEdge {
  return {
    id: overrides.id || 'e1',
    source: overrides.source || 'n1',
    target: overrides.target || 'n2',
    relationshipType: overrides.relationshipType || 'method-call',
    method: overrides.method || null,
    evidence: overrides.evidence || '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: null,
    column: null,
    methodOwner: null,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: 'Source' },
      target: { type: 'ApexClass', name: 'Target' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  };
}

describe('Deterministic Domain / Subsystem Discovery Engine', () => {
  describe('Helper Functions', () => {
    it('extracts domain stems cleanly while rejecting generic stems', () => {
      expect(extractDomainStem('OrderService')).toBe('Order');
      expect(extractDomainStem('OrderController')).toBe('Order');
      expect(extractDomainStem('OrderSelector')).toBe('Order');
      expect(extractDomainStem('PaymentProcessor')).toBe('Payment');
      expect(extractDomainStem('BillingRepository')).toBe('Billing');
      expect(extractDomainStem('CommonUtil')).toBe(null);
      expect(extractDomainStem('SharedHelper')).toBe(null);
      expect(extractDomainStem('BaseService')).toBe(null);
    });

    it('extracts domain from directory folder paths', () => {
      expect(extractDomainFromPath('force-app/main/default/classes/order/OrderProcessor.cls')).toBe('Order');
      expect(extractDomainFromPath('force-app/main/default/classes/payment/PaymentHandler.cls')).toBe('Payment');
      expect(extractDomainFromPath('force-app/main/default/classes/Common/Util.cls')).toBe(null); // Generic folder
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

    it('finds production target for test nodes', () => {
      const prodNode = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      const testNode = createMockNode({
        id: 'ApexClass:OrderServiceTest',
        displayName: 'OrderServiceTest',
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      });
      const found = findProductionTarget(testNode, [prodNode, testNode], []);
      expect(found?.id).toBe('ApexClass:OrderService');
    });

    it('finds parent object for field nodes', () => {
      const parentObj = createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' });
      const fieldNode = createMockNode({ id: 'Order__c.Status__c', displayName: 'Status__c', type: 'CustomField' });
      const found = findParentObject(fieldNode, [parentObj, fieldNode], []);
      expect(found?.id).toBe('CustomObject:Order__c');
    });
  });

  describe('Domain Classification Scenarios', () => {
    it('groups same-domain classes together by naming stem', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' }),
        createMockNode({ id: 'ApexClass:OrderRepository', displayName: 'OrderRepository' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
      ];

      const { assignments } = discoverDomains(nodes, []);

      expect(assignments.get('ApexClass:OrderController')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:OrderService')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:OrderSelector')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:OrderRepository')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:PaymentService')?.primaryDomain).toBe('Payment');
    });

    it('classifies generic shared utilities as Shared with documented reasoning', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:CommonUtil', displayName: 'CommonUtil' }),
        createMockNode({ id: 'ApexClass:SharedHelper', displayName: 'SharedHelper' }),
        createMockNode({ id: 'ApexClass:BaseService', displayName: 'BaseService' }),
      ];

      const { assignments } = discoverDomains(nodes, []);

      const utilAssignment = assignments.get('ApexClass:CommonUtil');
      expect(utilAssignment?.primaryDomain).toBe('Shared');
      expect(utilAssignment?.reason).toContain('Shared');

      const helperAssignment = assignments.get('ApexClass:SharedHelper');
      expect(helperAssignment?.primaryDomain).toBe('Shared');

      const baseAssignment = assignments.get('ApexClass:BaseService');
      expect(baseAssignment?.primaryDomain).toBe('Shared');
    });

    it('uses directory folder structure to infer domain when available', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({
          id: 'ApexClass:CustomOrderHandler',
          displayName: 'CustomOrderHandler',
          file: 'force-app/main/default/classes/order/CustomOrderHandler.cls',
        }),
        createMockNode({
          id: 'ApexClass:PaymentAdapter',
          displayName: 'PaymentAdapter',
          file: 'force-app/main/default/classes/payment/PaymentAdapter.cls',
        }),
      ];

      const { assignments } = discoverDomains(nodes, []);

      expect(assignments.get('ApexClass:CustomOrderHandler')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:PaymentAdapter')?.primaryDomain).toBe('Payment');
    });

    it('uses connected graph neighborhood to resolve domain cohesion for ambiguous nodes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' }),
        createMockNode({ id: 'ApexClass:DataProcessor', displayName: 'DataProcessor' }), // Ambiguous generic stem
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge({ id: 'e1', source: 'ApexClass:DataProcessor', target: 'ApexClass:OrderService' }),
        createMockEdge({ id: 'e2', source: 'ApexClass:DataProcessor', target: 'ApexClass:OrderSelector' }),
      ];

      const { assignments } = discoverDomains(nodes, edges);

      const processorAssignment = assignments.get('ApexClass:DataProcessor');
      expect(processorAssignment?.primaryDomain).toBe('Order');
      expect(processorAssignment?.reason).toContain('Inferred from graph neighborhood cohesion');
    });

    it('identifies cross-domain nodes and exposes connected domains for bridge analysis', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:CheckoutOrchestrator', displayName: 'CheckoutOrchestrator' }),
        createMockNode({ id: 'ApexClass:MainOrchestrator', displayName: 'MainOrchestrator' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge({ id: 'e1', source: 'ApexClass:CheckoutOrchestrator', target: 'ApexClass:OrderService' }),
        createMockEdge({ id: 'e2', source: 'ApexClass:CheckoutOrchestrator', target: 'ApexClass:PaymentService' }),
        createMockEdge({ id: 'e3', source: 'ApexClass:MainOrchestrator', target: 'ApexClass:OrderService' }),
        createMockEdge({ id: 'e4', source: 'ApexClass:MainOrchestrator', target: 'ApexClass:PaymentService' }),
      ];

      const { assignments } = discoverDomains(nodes, edges);

      const checkoutOrchestrator = assignments.get('ApexClass:CheckoutOrchestrator');
      expect(checkoutOrchestrator?.primaryDomain).toBe('Checkout');
      expect(checkoutOrchestrator?.connectedDomains).toEqual(['Order', 'Payment']);

      const mainOrchestrator = assignments.get('ApexClass:MainOrchestrator');
      expect(mainOrchestrator?.primaryDomain).toBe('Shared');
      expect(mainOrchestrator?.connectedDomains).toEqual(['Order', 'Payment']);
    });

    it('ensures test nodes inherit their production target domain', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({
          id: 'ApexClass:OrderServiceTest',
          displayName: 'OrderServiceTest',
          behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        }),
      ];

      const { assignments } = discoverDomains(nodes, []);

      expect(assignments.get('ApexClass:OrderServiceTest')?.primaryDomain).toBe('Order');
      expect(assignments.get('ApexClass:OrderServiceTest')?.reason).toContain('Test inherited domain');
    });

    it('ensures field nodes inherit their parent object domain', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
        createMockNode({ id: 'Order__c.Status__c', displayName: 'Status__c', type: 'CustomField' }),
      ];

      const edges: ExplorerEdge[] = [
        createMockEdge({
          id: 'e1',
          source: 'Order__c.Status__c',
          target: 'CustomObject:Order__c',
          relationshipType: 'field-reference',
        }),
      ];

      const { assignments } = discoverDomains(nodes, edges);

      expect(assignments.get('Order__c.Status__c')?.primaryDomain).toBe('Order');
      expect(assignments.get('Order__c.Status__c')?.reason).toContain('Field inherited domain');
    });

    it('guarantees 100% deterministic output regardless of input array order', () => {
      const nodeA = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      const nodeB = createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' });
      const nodeC = createMockNode({ id: 'ApexClass:CheckoutOrchestrator', displayName: 'CheckoutOrchestrator' });

      const edge1 = createMockEdge({ id: 'e1', source: 'ApexClass:CheckoutOrchestrator', target: 'ApexClass:OrderService' });
      const edge2 = createMockEdge({ id: 'e2', source: 'ApexClass:CheckoutOrchestrator', target: 'ApexClass:PaymentService' });

      const res1 = discoverDomains([nodeA, nodeB, nodeC], [edge1, edge2]);
      const res2 = discoverDomains([nodeC, nodeA, nodeB], [edge2, edge1]);

      expect(res1.allDomains).toEqual(res2.allDomains);
      expect(res1.domainToNodes).toEqual(res2.domainToNodes);
      expect(Array.from(res1.assignments.entries())).toEqual(Array.from(res2.assignments.entries()));
    });

    it('provides backward-compatible classifyNodeDomain function', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:BillingService', displayName: 'BillingService' }),
      ];

      const domain = classifyNodeDomain(nodes[0], nodes, []);
      expect(domain).toBe('Billing');
    });
  });
});

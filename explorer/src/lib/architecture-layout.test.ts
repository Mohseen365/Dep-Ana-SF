import { describe, it, expect } from 'vitest';
import {
  computeArchitectureLayout,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
} from './architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

function createMockNode(overrides: Partial<ExplorerNode>): ExplorerNode {
  return {
    id: overrides.id || 'ApexClass:TestNode',
    displayName: overrides.displayName || 'TestNode',
    type: overrides.type || 'ApexClass',
    file: overrides.file || 'force-app/main/default/classes/TestNode.cls',
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

  describe('Structural Layout Verification', () => {
    it('respects architectural vertical layers (Presentation < Application < Domain < Schema)', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController', type: 'ApexClass' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector', type: 'ApexClass' }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
      ];

      const edges: ExplorerEdge[] = [];
      const positions = computeArchitectureLayout(nodes, edges);

      const yPresentation = positions['LWC:OrderView'].y;
      const yApplication = positions['ApexClass:OrderController'].y;
      const yDomain = positions['ApexClass:OrderSelector'].y;
      const ySchema = positions['CustomObject:Order__c'].y;

      expect(yPresentation).toBeLessThan(yApplication);
      expect(yApplication).toBeLessThan(yDomain);
      expect(yDomain).toBeLessThan(ySchema);
    });

    it('clusters same-domain nodes horizontally', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:PaymentSelector', displayName: 'PaymentSelector' }),
      ];

      const edges: ExplorerEdge[] = [];
      const positions = computeArchitectureLayout(nodes, edges);

      const orderDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:OrderSelector'].x);
      const crossDomainDist = Math.abs(positions['ApexClass:OrderService'].x - positions['ApexClass:PaymentService'].x);

      expect(orderDist).toBeLessThan(crossDomainDist);
    });

    it('positions bridge nodes in intermediary spatial positions between connected domains', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'ApexClass:CheckoutOrchestrator', displayName: 'CheckoutOrchestrator' }),
      ];

      const edges: ExplorerEdge[] = [
        {
          id: 'e1',
          source: 'ApexClass:CheckoutOrchestrator',
          target: 'ApexClass:OrderService',
          relationshipType: 'method-call',
          method: 'create',
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
            source: { type: 'ApexClass', name: 'CheckoutOrchestrator' },
            target: { type: 'ApexClass', name: 'OrderService' },
            relationship: { type: 'method-call', resolution: 'EXACT' },
            location: {},
          },
        },
        {
          id: 'e2',
          source: 'ApexClass:CheckoutOrchestrator',
          target: 'ApexClass:PaymentService',
          relationshipType: 'method-call',
          method: 'process',
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
            source: { type: 'ApexClass', name: 'CheckoutOrchestrator' },
            target: { type: 'ApexClass', name: 'PaymentService' },
            relationship: { type: 'method-call', resolution: 'EXACT' },
            location: {},
          },
        },
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const xOrder = positions['ApexClass:OrderService'].x;
      const xPayment = positions['ApexClass:PaymentService'].x;
      const xBridge = positions['ApexClass:CheckoutOrchestrator'].x;

      const minX = Math.min(xOrder, xPayment);
      const maxX = Math.max(xOrder, xPayment);

      expect(xBridge).toBeGreaterThanOrEqual(minX);
      expect(xBridge).toBeLessThanOrEqual(maxX);
    });

    it('places test nodes near corresponding production nodes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({
          id: 'ApexClass:OrderServiceTest',
          displayName: 'OrderServiceTest',
          behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        }),
      ];

      const edges: ExplorerEdge[] = [];
      const positions = computeArchitectureLayout(nodes, edges);

      const prodPos = positions['ApexClass:OrderService'];
      const testPos = positions['ApexClass:OrderServiceTest'];

      const dx = Math.abs(prodPos.x - testPos.x);
      const dy = Math.abs(prodPos.y - testPos.y);

      expect(dx).toBeLessThan(200);
      expect(dy).toBeLessThan(100);
    });

    it('places field nodes near parent object nodes', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
        createMockNode({ id: 'Order__c.TotalAmount__c', displayName: 'TotalAmount__c', type: 'CustomField' }),
      ];

      const edges: ExplorerEdge[] = [];
      const positions = computeArchitectureLayout(nodes, edges);

      const objPos = positions['CustomObject:Order__c'];
      const fieldPos = positions['Order__c.TotalAmount__c'];

      const dx = Math.abs(objPos.x - fieldPos.x);
      const dy = Math.abs(objPos.y - fieldPos.y);

      expect(dx).toBeLessThan(200);
      expect(dy).toBeLessThan(150);
    });

    it('separates disconnected graph components with spatial offsets', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:CompA1', displayName: 'CompA1' }),
        createMockNode({ id: 'ApexClass:CompA2', displayName: 'CompA2' }),
        createMockNode({ id: 'ApexClass:CompB1', displayName: 'CompB1' }),
        createMockNode({ id: 'ApexClass:CompB2', displayName: 'CompB2' }),
      ];

      const edges: ExplorerEdge[] = [
        {
          id: 'eA',
          source: 'ApexClass:CompA1',
          target: 'ApexClass:CompA2',
          relationshipType: 'method-call',
          method: null,
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
            source: { type: 'ApexClass', name: 'CompA1' },
            target: { type: 'ApexClass', name: 'CompA2' },
            relationship: { type: 'method-call', resolution: 'EXACT' },
            location: {},
          },
        },
        {
          id: 'eB',
          source: 'ApexClass:CompB1',
          target: 'ApexClass:CompB2',
          relationshipType: 'method-call',
          method: null,
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
            source: { type: 'ApexClass', name: 'CompB1' },
            target: { type: 'ApexClass', name: 'CompB2' },
            relationship: { type: 'method-call', resolution: 'EXACT' },
            location: {},
          },
        },
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const maxXCompA = Math.max(positions['ApexClass:CompA1'].x, positions['ApexClass:CompA2'].x);
      const minXCompB = Math.min(positions['ApexClass:CompB1'].x, positions['ApexClass:CompB2'].x);

      expect(minXCompB).toBeGreaterThan(maxXCompA + 150);
    });

    it('guarantees 100% deterministic positions across repeated runs', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'LWC:OrderView', displayName: 'OrderView', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' }),
        createMockNode({ id: 'ApexClass:PaymentService', displayName: 'PaymentService' }),
        createMockNode({ id: 'CustomObject:Order__c', displayName: 'Order__c', type: 'CustomObject' }),
      ];

      const edges: ExplorerEdge[] = [];

      const run1 = computeArchitectureLayout(nodes, edges);
      const run2 = computeArchitectureLayout(nodes, edges);
      const run3 = computeArchitectureLayout(nodes, edges);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });

    it('ensures no overlapping node positions by enforcing minimum clearance', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:NodeA', displayName: 'NodeA' }),
        createMockNode({ id: 'ApexClass:NodeB', displayName: 'NodeB' }),
        createMockNode({ id: 'ApexClass:NodeC', displayName: 'NodeC' }),
        createMockNode({ id: 'ApexClass:NodeD', displayName: 'NodeD' }),
      ];

      const edges: ExplorerEdge[] = [];
      const positions = computeArchitectureLayout(nodes, edges, { nodeWidth: 100, nodeHeight: 50 });

      const nodeIds = Object.keys(positions);
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const pos1 = positions[nodeIds[i]];
          const pos2 = positions[nodeIds[j]];

          const dx = Math.abs(pos1.x - pos2.x);
          const dy = Math.abs(pos1.y - pos2.y);

          const overlaps = dx < 60 && dy < 30;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('preserves existing authoritative node positions when requested', () => {
      const nodes: ExplorerNode[] = [
        createMockNode({ id: 'ApexClass:ExistingNode', displayName: 'ExistingNode' }),
        createMockNode({ id: 'ApexClass:NewNode', displayName: 'NewNode' }),
      ];

      const edges: ExplorerEdge[] = [];
      const existingPositions = {
        'ApexClass:ExistingNode': { x: 1234, y: 5678 },
      };

      const positions = computeArchitectureLayout(nodes, edges, { existingPositions });

      expect(positions['ApexClass:ExistingNode']).toEqual({ x: 1234, y: 5678 });
      expect(positions['ApexClass:NewNode']).toBeDefined();
      expect(positions['ApexClass:NewNode']).not.toEqual({ x: 1234, y: 5678 });
    });
  });
});

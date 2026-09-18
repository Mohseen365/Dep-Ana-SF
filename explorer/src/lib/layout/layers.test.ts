import { describe, it, expect } from 'vitest';
import {
  classifyNodeLayer,
  classifyNodeLayerWithReason,
  isTestNode,
} from './layers';
import type { ExplorerNode } from '../../types/explorer';

function createMockNode(overrides: Partial<ExplorerNode>): ExplorerNode {
  return {
    id: overrides.id || 'ApexClass:TestComponent',
    displayName: overrides.displayName || 'TestComponent',
    type: overrides.type || 'ApexClass',
    file: overrides.file || 'force-app/main/default/classes/TestComponent.cls',
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

describe('Architectural Layer Classifier (Agent 1B)', () => {
  describe('Known Salesforce Node Types', () => {
    it('classifies LWC and Visualforce as presentation layer', () => {
      const lwcNode = createMockNode({ type: 'LWC', displayName: 'orderSummary' });
      const vfNode = createMockNode({ type: 'Visualforce', displayName: 'InvoicePage' });

      expect(classifyNodeLayer(lwcNode)).toBe('presentation');
      expect(classifyNodeLayer(vfNode)).toBe('presentation');
    });

    it('classifies ApexTrigger and Flow as application layer', () => {
      const triggerNode = createMockNode({ type: 'ApexTrigger', displayName: 'OrderTrigger' });
      const flowNode = createMockNode({ type: 'Flow', displayName: 'SubmitOrderFlow' });

      expect(classifyNodeLayer(triggerNode)).toBe('application');
      expect(classifyNodeLayer(flowNode)).toBe('application');
    });

    it('classifies Object, CustomObject, Field, CustomField, External as schema layer', () => {
      const objNode = createMockNode({ type: 'Object', displayName: 'Account' });
      const customObjNode = createMockNode({ type: 'CustomObject', displayName: 'Invoice__c' });
      const fieldNode = createMockNode({ type: 'Field', displayName: 'Name' });
      const customFieldNode = createMockNode({ type: 'CustomField', displayName: 'Amount__c' });
      const externalNode = createMockNode({ type: 'External', displayName: 'ExternalService' });

      expect(classifyNodeLayer(objNode)).toBe('schema');
      expect(classifyNodeLayer(customObjNode)).toBe('schema');
      expect(classifyNodeLayer(fieldNode)).toBe('schema');
      expect(classifyNodeLayer(customFieldNode)).toBe('schema');
      expect(classifyNodeLayer(externalNode)).toBe('schema');
    });
  });

  describe('Known Naming Patterns (Special Cases)', () => {
    it('classifies Controller, Service, Handler, Manager, Processor, Batch, Queueable, Schedulable as application layer', () => {
      const controllers = [
        createMockNode({ displayName: 'AccountController' }),
        createMockNode({ displayName: 'PaymentControllerExtension' }),
        createMockNode({ displayName: 'OrderService' }),
        createMockNode({ displayName: 'OrderHandler' }),
        createMockNode({ displayName: 'InventoryManager' }),
        createMockNode({ displayName: 'PaymentProcessor' }),
        createMockNode({ displayName: 'OrderBatch' }),
        createMockNode({ displayName: 'BillingQueueable' }),
        createMockNode({ displayName: 'CleanUpSchedulable' }),
      ];

      controllers.forEach(node => {
        expect(classifyNodeLayer(node)).toBe('application');
      });
    });

    it('classifies Selector, Repository, DAO, Model, DTO, Wrapper as domain layer', () => {
      const domains = [
        createMockNode({ displayName: 'AccountSelector' }),
        createMockNode({ displayName: 'OrderRepository' }),
        createMockNode({ displayName: 'PaymentRepo' }),
        createMockNode({ displayName: 'CustomerDAO' }),
        createMockNode({ displayName: 'OrderModel' }),
        createMockNode({ displayName: 'PaymentDTO' }),
        createMockNode({ displayName: 'AccountWrapper' }),
        createMockNode({ displayName: 'InvoiceQueries' }),
        createMockNode({ displayName: 'OrderFinder' }),
      ];

      domains.forEach(node => {
        expect(classifyNodeLayer(node)).toBe('domain');
      });
    });
  });

  describe('Behavior-Based Classification', () => {
    it('classifies Apex class with async execution behavior as application layer', () => {
      const asyncNode = createMockNode({
        displayName: 'DataSyncEngine',
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: ['@future', 'Queueable'],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
      });

      expect(classifyNodeLayer(asyncNode)).toBe('application');
    });

    it('classifies Apex class with query or DML activity as domain layer unless named as Controller/Service', () => {
      const dataHeavyNode = createMockNode({
        displayName: 'CustomDataHelper',
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 5,
          dmlCount: 2,
          calloutCount: 0,
        },
      });

      const controllerNodeWithQueries = createMockNode({
        displayName: 'OrderController',
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 3,
          dmlCount: 1,
          calloutCount: 0,
        },
      });

      expect(classifyNodeLayer(dataHeavyNode)).toBe('domain');
      expect(classifyNodeLayer(controllerNodeWithQueries)).toBe('application');
    });
  });

  describe('Path-Based Classification', () => {
    it('classifies components under LWC, Aura, or Pages folders as presentation layer', () => {
      const lwcPathNode = createMockNode({
        type: 'ApexClass',
        displayName: 'customComponentHelper',
        file: 'force-app/main/default/lwc/orderView/orderView.js',
      });
      const pagesPathNode = createMockNode({
        type: 'ApexClass',
        displayName: 'pdfGenerator',
        file: 'force-app/main/default/pages/InvoicePdf.page',
      });

      expect(classifyNodeLayer(lwcPathNode)).toBe('presentation');
      expect(classifyNodeLayer(pagesPathNode)).toBe('presentation');
    });
  });

  describe('Fallback Classification & Ambiguous Nodes', () => {
    it('classifies generic utility or ambiguous ApexClass to application layer deterministically', () => {
      const genericNode = createMockNode({ displayName: 'StringUtils' });
      const constantsNode = createMockNode({ displayName: 'AppConstants' });

      expect(classifyNodeLayer(genericNode)).toBe('application');
      expect(classifyNodeLayer(constantsNode)).toBe('application');
    });

    it('produces identical deterministic layer results on repeated invocations', () => {
      const node = createMockNode({ displayName: 'OrderService' });

      const run1 = classifyNodeLayer(node);
      const run2 = classifyNodeLayer(node);
      const run3 = classifyNodeLayer(node);

      expect(run1).toBe('application');
      expect(run1).toBe(run2);
      expect(run2).toBe(run3);
    });
  });

  describe('Test Node & Production Context Inheritance', () => {
    it('correctly identifies test nodes via isTestNode helper', () => {
      const prodNode = createMockNode({ displayName: 'OrderService' });
      const testNodeByName = createMockNode({ displayName: 'OrderServiceTest' });
      const testNodeByFlag = createMockNode({
        displayName: 'OrderHelper',
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      });

      expect(isTestNode(prodNode)).toBe(false);
      expect(isTestNode(testNodeByName)).toBe(true);
      expect(isTestNode(testNodeByFlag)).toBe(true);
    });

    it('inherits target production node layer when provided via classification context', () => {
      const domainProdNode = createMockNode({ type: 'ApexClass', displayName: 'OrderSelector' }); // domain
      const testNode = createMockNode({ type: 'ApexClass', displayName: 'OrderSelectorTest' });

      const result = classifyNodeLayer(testNode, {
        targetProductionNode: domainProdNode,
      });

      expect(result).toBe('domain');
    });

    it('respects explicit productionTargetLayer override in context', () => {
      const testNode = createMockNode({ type: 'ApexClass', displayName: 'CustomTest' });

      const result = classifyNodeLayer(testNode, {
        isTestNode: true,
        productionTargetLayer: 'schema',
      });

      expect(result).toBe('schema');
    });
  });

  describe('Explainable Diagnostic Output', () => {
    it('returns structured diagnostic reason and confidence score', () => {
      const schemaNode = createMockNode({ type: 'CustomObject', displayName: 'Account' });
      const result = classifyNodeLayerWithReason(schemaNode);

      expect(result.layer).toBe('schema');
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('schema layer');
    });
  });
});

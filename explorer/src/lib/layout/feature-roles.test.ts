import { describe, it, expect } from 'vitest';
import type { ExplorerNode } from '../../types/explorer';
import {
  classifyFeatureRole,
  isFeatureSeedCandidate,
  isSharedInfrastructure,
  classifyAllFeatureRoles,
} from './feature-roles';

function createMockNode(overrides: Partial<ExplorerNode> = {}): ExplorerNode {
  return {
    id: overrides.id || 'ApexClass:TestComponent',
    displayName: overrides.displayName || 'TestComponent',
    type: overrides.type || 'ApexClass',
    file: overrides.file || 'classes/TestComponent.cls',
    metrics: overrides.metrics || { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: overrides.behavior || {
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
    ...overrides,
  };
}

describe('feature-roles module', () => {
  describe('classifyFeatureRole', () => {
    it('maps LWC to FeatureAnchor', () => {
      const node = createMockNode({ id: 'LWC:orderHeader', displayName: 'orderHeader', type: 'LWC' });
      const role = classifyFeatureRole(node, { layer: 'presentation' });
      expect(role).toBe('FeatureAnchor');
    });

    it('maps Controller to FeatureAnchor', () => {
      const node = createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' });
      const role = classifyFeatureRole(node, { layer: 'application', roleOverride: 'controller' });
      expect(role).toBe('FeatureAnchor');
    });

    it('maps Service to FeatureCore', () => {
      const node = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      const role = classifyFeatureRole(node, { layer: 'application', roleOverride: 'service' });
      expect(role).toBe('FeatureCore');
    });

    it('maps Selector to FeatureData', () => {
      const node = createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' });
      const role = classifyFeatureRole(node, { layer: 'domain', roleOverride: 'selector' });
      expect(role).toBe('FeatureData');
    });

    it('maps CustomObject to FeatureData', () => {
      const node = createMockNode({ id: 'Object:Order__c', displayName: 'Order__c', type: 'CustomObject' });
      const role = classifyFeatureRole(node, { layer: 'schema' });
      expect(role).toBe('FeatureData');
    });

    it('maps Test class to FeatureTest', () => {
      const node = createMockNode({
        id: 'ApexClass:OrderServiceTest',
        displayName: 'OrderServiceTest',
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      });
      const role = classifyFeatureRole(node, { layer: 'application' });
      expect(role).toBe('FeatureTest');
    });

    it('maps Logger / Utility to SharedInfrastructure', () => {
      const loggerNode = createMockNode({ id: 'ApexClass:AppLogger', displayName: 'AppLogger' });
      const role = classifyFeatureRole(loggerNode, {
        layer: 'application',
        roleOverride: 'utility',
      });
      expect(role).toBe('SharedInfrastructure');
    });

    it('maps high fan-in component to SharedInfrastructure', () => {
      const node = createMockNode({
        id: 'ApexClass:CommonHelper',
        displayName: 'CommonHelper',
        metrics: { fanIn: 8, fanOut: 0, coupling: 8, unresolved: 0, score: 0 },
      });
      const role = classifyFeatureRole(node, {
        analysisNode: { fanIn: 8 } as any,
      });
      expect(role).toBe('SharedInfrastructure');
    });

    it('maps Bridge node to FeatureBridge', () => {
      const node = createMockNode({ id: 'ApexClass:PaymentGatewayBridge', displayName: 'PaymentGatewayBridge' });
      const role = classifyFeatureRole(node, {
        centrality: { isBridge: true } as any,
      });
      expect(role).toBe('FeatureBridge');
    });
  });

  describe('isSharedInfrastructure', () => {
    it('returns true when fanIn >= 5', () => {
      const node = createMockNode({ id: 'ApexClass:SharedUtil', displayName: 'SharedUtil' });
      expect(isSharedInfrastructure(node, { analysisNode: { fanIn: 5 } as any })).toBe(true);
    });

    it('returns true when role is utility or configuration', () => {
      const utilNode = createMockNode({ id: 'ApexClass:StringUtil', displayName: 'StringUtil' });
      expect(isSharedInfrastructure(utilNode, { roleOverride: 'utility' })).toBe(true);

      const configNode = createMockNode({ id: 'ApexClass:AppConfig', displayName: 'AppConfig' });
      expect(isSharedInfrastructure(configNode, { roleOverride: 'configuration' })).toBe(true);
    });

    it('returns true when connected across >= 3 distinct domains', () => {
      const node = createMockNode({ id: 'ApexClass:CrossDomainService', displayName: 'CrossDomainService' });
      expect(isSharedInfrastructure(node, { connectedDomainsCount: 3 })).toBe(true);
    });

    it('returns false for regular service with low fan-in and single domain', () => {
      const node = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      expect(isSharedInfrastructure(node, { analysisNode: { fanIn: 2 } as any, connectedDomainsCount: 1 })).toBe(false);
    });
  });

  describe('isFeatureSeedCandidate', () => {
    it('allows LWC, Controller, and Service entry points to seed', () => {
      const lwcNode = createMockNode({ id: 'LWC:checkout', displayName: 'checkout', type: 'LWC' });
      expect(isFeatureSeedCandidate(lwcNode, 'FeatureAnchor')).toBe(true);

      const controllerNode = createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' });
      expect(isFeatureSeedCandidate(controllerNode, 'FeatureAnchor')).toBe(true);

      const serviceNode = createMockNode({ id: 'ApexClass:OrderService', displayName: 'OrderService' });
      expect(isFeatureSeedCandidate(serviceNode, 'FeatureCore')).toBe(true);
    });

    it('disallows Tests, Fields, Custom Objects, Shared Infrastructure, and Selectors from seeding', () => {
      const testNode = createMockNode({
        id: 'ApexClass:OrderServiceTest',
        displayName: 'OrderServiceTest',
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      });
      expect(isFeatureSeedCandidate(testNode, 'FeatureTest')).toBe(false);

      const objectNode = createMockNode({ id: 'Object:Account', displayName: 'Account', type: 'Object' });
      expect(isFeatureSeedCandidate(objectNode, 'FeatureData')).toBe(false);

      const loggerNode = createMockNode({ id: 'ApexClass:AppLogger', displayName: 'AppLogger' });
      expect(isFeatureSeedCandidate(loggerNode, 'SharedInfrastructure')).toBe(false);

      const selectorNode = createMockNode({ id: 'ApexClass:OrderSelector', displayName: 'OrderSelector' });
      expect(isFeatureSeedCandidate(selectorNode, 'FeatureData')).toBe(false);
    });
  });

  describe('classifyAllFeatureRoles determinism', () => {
    it('produces identical output regardless of input array order', () => {
      const nodes = [
        createMockNode({ id: 'ApexClass:OrderController', displayName: 'OrderController' }),
        createMockNode({ id: 'LWC:orderHeader', displayName: 'orderHeader', type: 'LWC' }),
        createMockNode({ id: 'ApexClass:AppLogger', displayName: 'AppLogger' }),
      ];

      const roles1 = classifyAllFeatureRoles(nodes);
      const roles2 = classifyAllFeatureRoles([...nodes].reverse());

      expect(Array.from(roles1.entries())).toEqual(Array.from(roles2.entries()));
    });
  });
});

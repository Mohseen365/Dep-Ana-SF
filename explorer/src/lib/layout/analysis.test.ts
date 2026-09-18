import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  isTestNode,
  isFieldNode,
  findParentProductionNodeId,
  findParentObjectId,
} from './analysis';

function createDummyNode(
  id: string,
  type: ExplorerNode['type'] = 'ApexClass',
  displayName?: string,
  isTest = false
): ExplorerNode {
  return {
    id,
    displayName: displayName || id.split(':').pop() || id,
    type,
    file: isTest ? `force-app/main/default/classes/${id}.cls` : `force-app/main/default/classes/${id}.cls`,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest,
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
      testCoverageStatus: isTest ? 'COVERED' : 'UNTESTED',
    },
  };
}

function createDummyEdge(
  source: string,
  target: string,
  relationshipType: ExplorerEdge['relationshipType'] = 'method-call'
): ExplorerEdge {
  return {
    id: `edge:${source}->${target}`,
    source,
    target,
    relationshipType,
    method: null,
    evidence: 'test evidence',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 10,
    column: 5,
    methodOwner: null,
    file: 'force-app/main/default/classes/Test.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: relationshipType, resolution: 'EXACT' },
      location: { line: 10, column: 5 },
    },
  };
}

describe('Architecture Layout Analysis Engine (Wave 1A)', () => {
  describe('Determinism & Immutability', () => {
    it('produces deep structural equality for identical inputs across multiple runs', () => {
      const nodes: ExplorerNode[] = [
        createDummyNode('OrderController'),
        createDummyNode('OrderService'),
        createDummyNode('OrderRepository'),
      ];
      const edges: ExplorerEdge[] = [
        createDummyEdge('OrderController', 'OrderService'),
        createDummyEdge('OrderService', 'OrderRepository'),
      ];

      const analysisA = computeArchitectureAnalysis(nodes, edges);
      const analysisB = computeArchitectureAnalysis(nodes, edges);

      expect(analysisA.totalNodes).toBe(analysisB.totalNodes);
      expect(analysisA.totalEdges).toBe(analysisB.totalEdges);
      expect(analysisA.nodeList).toEqual(analysisB.nodeList);
      expect(analysisA.components).toEqual(analysisB.components);
    });

    it('produces identical output regardless of input array ordering (node/edge shuffling)', () => {
      const node1 = createDummyNode('Alpha');
      const node2 = createDummyNode('Beta');
      const node3 = createDummyNode('Gamma');

      const edge1 = createDummyEdge('Alpha', 'Beta');
      const edge2 = createDummyEdge('Beta', 'Gamma');

      const order1 = computeArchitectureAnalysis([node1, node2, node3], [edge1, edge2]);
      const order2 = computeArchitectureAnalysis([node3, node1, node2], [edge2, edge1]);

      expect(order1.nodeList.map(n => n.nodeId)).toEqual(order2.nodeList.map(n => n.nodeId));
      expect(order1.components).toEqual(order2.components);
      expect(order1.nodes.get('Beta')).toEqual(order2.nodes.get('Beta'));
    });
  });

  describe('Degree Calculation & Neighbor Lists', () => {
    it('calculates fanIn, fanOut, hubScore, and neighborIds accurately on a known graph', () => {
      const nodes = [
        createDummyNode('Controller'),
        createDummyNode('Service'),
        createDummyNode('Helper'),
      ];
      const edges = [
        createDummyEdge('Controller', 'Service'),
        createDummyEdge('Helper', 'Service'),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);

      const serviceAnalysis = analysis.nodes.get('Service')!;
      expect(serviceAnalysis.fanIn).toBe(2);
      expect(serviceAnalysis.fanOut).toBe(0);
      expect(serviceAnalysis.hubScore).toBe(2);
      expect(serviceAnalysis.neighborIds).toEqual(['Controller', 'Helper']);

      const controllerAnalysis = analysis.nodes.get('Controller')!;
      expect(controllerAnalysis.fanIn).toBe(0);
      expect(controllerAnalysis.fanOut).toBe(1);
      expect(controllerAnalysis.hubScore).toBe(1);
      expect(controllerAnalysis.neighborIds).toEqual(['Service']);
    });
  });

  describe('Connected Components Topology', () => {
    it('handles a single connected component graph', () => {
      const nodes = [createDummyNode('A'), createDummyNode('B')];
      const edges = [createDummyEdge('A', 'B')];

      const analysis = computeArchitectureAnalysis(nodes, edges);

      expect(analysis.components).toHaveLength(1);
      expect(analysis.components[0].componentId).toBe(0);
      expect(analysis.components[0].nodeIds).toEqual(['A', 'B']);
    });

    it('handles multiple disconnected components and isolated nodes', () => {
      const nodes = [
        createDummyNode('A'),
        createDummyNode('B'),
        createDummyNode('C'),
        createDummyNode('D'),
        createDummyNode('Isolated'),
      ];
      const edges = [
        createDummyEdge('A', 'B'),
        createDummyEdge('B', 'C'),
        createDummyEdge('C', 'A'),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);

      // Largest component (A, B, C) size 3 -> componentId 0
      // Next component (D) size 1 -> componentId 1
      // Next component (Isolated) size 1 -> componentId 2
      expect(analysis.components).toHaveLength(3);
      expect(analysis.components[0].nodeIds).toEqual(['A', 'B', 'C']);
      expect(analysis.nodes.get('A')?.componentId).toBe(0);
      expect(analysis.nodes.get('Isolated')?.componentId).toBeGreaterThan(0);
    });
  });

  describe('Hub vs Bridge Metrics Independence', () => {
    it('distinguishes graph centrality (hubScore) from cross-domain boundary connectivity (bridgeScore)', () => {
      const nodes = [
        createDummyNode('HubClass'),
        createDummyNode('Class1'),
        createDummyNode('Class2'),
        createDummyNode('Class3'),
        createDummyNode('BridgeClass'),
      ];

      const edges = [
        createDummyEdge('Class1', 'HubClass'),
        createDummyEdge('Class2', 'HubClass'),
        createDummyEdge('Class3', 'HubClass'),
        createDummyEdge('Class1', 'BridgeClass'),
        createDummyEdge('Class2', 'BridgeClass'),
      ];

      // Domain mapping: Class1 in DomainA, Class2 in DomainB, HubClass in DomainA
      const domainMap = new Map<string, string>([
        ['Class1', 'Order'],
        ['Class2', 'Payment'],
        ['Class3', 'Order'],
        ['HubClass', 'Order'],
        ['BridgeClass', 'Shared'],
      ]);

      const analysis = computeArchitectureAnalysis(nodes, edges, { domainMap });

      const hub = analysis.nodes.get('HubClass')!;
      expect(hub.hubScore).toBe(3);
      // HubClass connects to Class1 (Order), Class2 (Payment), Class3 (Order)
      // Connected non-Shared distinct domains = Payment (1 domain)
      expect(hub.bridgeScore).toBe(1);
      expect(hub.isBridge).toBe(false);

      const bridge = analysis.nodes.get('BridgeClass')!;
      // Bridge connects to Class1 (Order) and Class2 (Payment)
      expect(bridge.bridgeScore).toBe(2);
      expect(bridge.isBridge).toBe(true);
    });
  });

  describe('Satellite Metadata & Relationships (Tests & Fields)', () => {
    it('identifies test nodes and resolves target production nodes', () => {
      const prodNode = createDummyNode('OrderService');
      const testNode = createDummyNode('OrderServiceTest', 'ApexClass', 'OrderServiceTest', true);
      const edges = [createDummyEdge('OrderServiceTest', 'OrderService', 'test-reference')];

      expect(isTestNode(testNode)).toBe(true);
      expect(findParentProductionNodeId(testNode, [prodNode, testNode], edges)).toBe('OrderService');

      const analysis = computeArchitectureAnalysis([prodNode, testNode], edges);

      const testAnalysis = analysis.nodes.get('OrderServiceTest')!;
      expect(testAnalysis.isTest).toBe(true);
      expect(testAnalysis.parentProductionNodeId).toBe('OrderService');

      const prodAnalysis = analysis.nodes.get('OrderService')!;
      expect(prodAnalysis.isTest).toBe(false);
      expect(prodAnalysis.parentProductionNodeId).toBeNull();
    });

    it('identifies field nodes and resolves parent object nodes', () => {
      const objectNode = createDummyNode('Object:Account', 'CustomObject', 'Account');
      const fieldNode = createDummyNode('Object:Account.Field:Phone', 'CustomField', 'Phone');
      const edges = [createDummyEdge('Object:Account.Field:Phone', 'Object:Account', 'field-reference')];

      expect(isFieldNode(fieldNode)).toBe(true);
      expect(findParentObjectId(fieldNode, [objectNode, fieldNode], edges)).toBe('Object:Account');

      const analysis = computeArchitectureAnalysis([objectNode, fieldNode], edges);

      const fieldAnalysis = analysis.nodes.get('Object:Account.Field:Phone')!;
      expect(fieldAnalysis.isField).toBe(true);
      expect(fieldAnalysis.parentObjectId).toBe('Object:Account');
    });
  });

  describe('Classification Helpers (applyLayerClassification & applyDomainClassification)', () => {
    it('allows downstream stages to populate layers and domains without mutating original analysis', () => {
      const nodes = [
        createDummyNode('Controller'),
        createDummyNode('Service'),
      ];
      const edges = [createDummyEdge('Controller', 'Service')];

      const baseAnalysis = computeArchitectureAnalysis(nodes, edges);
      expect(baseAnalysis.nodes.get('Controller')?.layer).toBeNull();
      expect(baseAnalysis.nodes.get('Controller')?.domain).toBeNull();

      // Apply Layer Classification (Wave 1B simulation)
      const withLayers = applyLayerClassification(baseAnalysis, {
        Controller: 'presentation',
        Service: 'application',
      });

      expect(withLayers.nodes.get('Controller')?.layer).toBe('presentation');
      expect(withLayers.nodes.get('Service')?.layer).toBe('application');
      expect(baseAnalysis.nodes.get('Controller')?.layer).toBeNull(); // Immutable

      // Apply Domain Classification (Wave 1C simulation)
      const withDomains = applyDomainClassification(withLayers, {
        Controller: 'Order',
        Service: 'Payment',
      });

      expect(withDomains.nodes.get('Controller')?.domain).toBe('Order');
      expect(withDomains.nodes.get('Service')?.domain).toBe('Payment');
      expect(withDomains.nodes.get('Controller')?.layer).toBe('presentation'); // Retains layer
    });
  });
});

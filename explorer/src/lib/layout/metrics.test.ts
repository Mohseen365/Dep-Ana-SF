import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import { createEdge } from './fixtures/builder';
import {
  edgeCrossingCount,
  calculateDetailedEdgeCrossings,
  averageEdgeLength,
  maxEdgeLength,
  nodeOverlapCount,
  layerViolationCount,
  domainCohesion,
  componentSeparation,
  hubLocality,
  bridgePlacement,
  calculateLayoutMetrics,
} from './metrics';

function makeNode(id: string, type: ExplorerNodeType = 'ApexClass', displayName?: string): ExplorerNode {
  return {
    id,
    displayName: displayName || id,
    type,
    file: '',
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

describe('Quantitative Layout Metrics Library', () => {
  describe('edgeCrossingCount', () => {
    it('returns 0 for parallel edges with 0 crossings', () => {
      const nodes = [
        makeNode('A'),
        makeNode('B'),
        makeNode('C'),
        makeNode('D'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A', 'B'),
        createEdge('C', 'D'),
      ];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 0, y: 100 },
        C: { x: 50, y: 0 },
        D: { x: 50, y: 100 },
      };

      expect(edgeCrossingCount(nodes, edges, positions)).toBe(0);
    });

    it('returns 1 for an exact X-crossing of 2 edges', () => {
      const nodes = [
        makeNode('A'),
        makeNode('B'),
        makeNode('C'),
        makeNode('D'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A', 'B'),
        createEdge('C', 'D'),
      ];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 100, y: 100 },
        C: { x: 0, y: 100 },
        D: { x: 100, y: 0 },
      };

      expect(edgeCrossingCount(nodes, edges, positions)).toBe(1);
    });

    it('returns 0 for edges sharing a common endpoint node', () => {
      const nodes = [
        makeNode('A'),
        makeNode('B'),
        makeNode('C'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A', 'B'),
        createEdge('A', 'C'),
      ];
      const positions = {
        A: { x: 50, y: 0 },
        B: { x: 0, y: 100 },
        C: { x: 100, y: 100 },
      };

      expect(edgeCrossingCount(nodes, edges, positions)).toBe(0);
    });

    it('returns multiple crossings for a complex crossed grid graph', () => {
      const nodes = [
        makeNode('A1'), makeNode('A2'), makeNode('A3'),
        makeNode('B1'), makeNode('B2'), makeNode('B3'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A1', 'B3'),
        createEdge('A2', 'B2'),
        createEdge('A3', 'B1'),
      ];
      const positions = {
        A1: { x: 0, y: 0 },
        A2: { x: 100, y: 0 },
        A3: { x: 200, y: 0 },
        B1: { x: 0, y: 100 },
        B2: { x: 100, y: 100 },
        B3: { x: 200, y: 100 },
      };

      expect(edgeCrossingCount(nodes, edges, positions)).toBe(3);
    });

    it('handles collinear overlapping edges deterministically', () => {
      const nodes = [
        makeNode('A'), makeNode('B'),
        makeNode('C'), makeNode('D'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A', 'B'),
        createEdge('C', 'D'),
      ];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 100, y: 0 },
        C: { x: 50, y: 0 },
        D: { x: 150, y: 0 },
      };

      expect(edgeCrossingCount(nodes, edges, positions)).toBe(1);
    });
  });

  describe('edge length metrics', () => {
    it('computes exact averageEdgeLength and maxEdgeLength', () => {
      const nodes = [
        makeNode('A'),
        makeNode('B'),
        makeNode('C'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A', 'B'), // dist 100
        createEdge('A', 'C'), // dist 200
      ];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 100, y: 0 },
        C: { x: 0, y: 200 },
      };

      expect(averageEdgeLength(nodes, edges, positions)).toBe(150);
      expect(maxEdgeLength(nodes, edges, positions)).toBe(200);
    });

    it('returns 0 for empty edge list', () => {
      const nodes = [makeNode('A')];
      const positions = { A: { x: 0, y: 0 } };

      expect(averageEdgeLength(nodes, [], positions)).toBe(0);
      expect(maxEdgeLength(nodes, [], positions)).toBe(0);
    });
  });

  describe('nodeOverlapCount', () => {
    it('returns 0 for non-overlapping nodes', () => {
      const nodes = [makeNode('A'), makeNode('B')];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 200, y: 0 },
      };

      expect(nodeOverlapCount(nodes, [], positions, { nodeWidth: 120, nodeHeight: 60 })).toBe(0);
    });

    it('returns 1 for overlapping nodes', () => {
      const nodes = [makeNode('A'), makeNode('B')];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 50, y: 20 },
      };

      expect(nodeOverlapCount(nodes, [], positions, { nodeWidth: 120, nodeHeight: 60 })).toBe(1);
    });
  });

  describe('layerViolationCount', () => {
    it('returns 0 for valid top-down architectural layer arrangement', () => {
      const nodes = [
        makeNode('LWC', 'LWC', 'MyView'),
        makeNode('Ctrl', 'ApexTrigger', 'MyController'),
        makeNode('Repo', 'ApexClass', 'OrderRepository'),
        makeNode('Obj', 'CustomObject', 'Account'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('LWC', 'Ctrl'),
        createEdge('Ctrl', 'Repo'),
        createEdge('Repo', 'Obj'),
      ];
      const positions = {
        LWC: { x: 0, y: 0 },
        Ctrl: { x: 0, y: 100 },
        Repo: { x: 0, y: 200 },
        Obj: { x: 0, y: 300 },
      };

      expect(layerViolationCount(nodes, edges, positions)).toBe(0);
    });

    it('detects backward layer violations (schema -> presentation)', () => {
      const nodes = [
        makeNode('LWC', 'LWC', 'MyView'),
        makeNode('Obj', 'CustomObject', 'Account'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('Obj', 'LWC'),
      ];
      const positions = {
        LWC: { x: 0, y: 0 },
        Obj: { x: 0, y: 300 },
      };

      expect(layerViolationCount(nodes, edges, positions)).toBe(1);
    });
  });

  describe('domainCohesion', () => {
    it('measures cohesive domain vs scattered domain', () => {
      const nodes = [
        makeNode('OrderService', 'ApexClass', 'OrderService'),
        makeNode('OrderController', 'ApexClass', 'OrderController'),
        makeNode('PaymentService', 'ApexClass', 'PaymentService'),
        makeNode('PaymentController', 'ApexClass', 'PaymentController'),
      ];

      const cohesivePositions = {
        OrderService: { x: 0, y: 0 },
        OrderController: { x: 20, y: 20 },
        PaymentService: { x: 1000, y: 1000 },
        PaymentController: { x: 1020, y: 1020 },
      };

      const cohesiveRes = domainCohesion(nodes, [], cohesivePositions);

      const scatteredPositions = {
        OrderService: { x: 0, y: 0 },
        OrderController: { x: 1000, y: 1000 },
        PaymentService: { x: 500, y: 0 },
        PaymentController: { x: 500, y: 1000 },
      };

      const scatteredRes = domainCohesion(nodes, [], scatteredPositions);

      expect(cohesiveRes.averageIntraDomainDistance).toBeLessThan(scatteredRes.averageIntraDomainDistance);
      expect(cohesiveRes.domainCohesionScore).toBeGreaterThan(scatteredRes.domainCohesionScore);
    });
  });

  describe('componentSeparation', () => {
    it('detects separated vs overlapping components', () => {
      const nodes = [
        makeNode('A1'), makeNode('A2'),
        makeNode('B1'), makeNode('B2'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('A1', 'A2'),
        createEdge('B1', 'B2'),
      ];

      const separatedPositions = {
        A1: { x: 0, y: 0 },
        A2: { x: 50, y: 0 },
        B1: { x: 500, y: 0 },
        B2: { x: 550, y: 0 },
      };

      const sepRes = componentSeparation(nodes, edges, separatedPositions, { minComponentGap: 100 });
      expect(sepRes.overlappingComponentPairs).toBe(0);
      expect(sepRes.gapViolationCount).toBe(0);

      const overlappingPositions = {
        A1: { x: 0, y: 0 },
        A2: { x: 100, y: 0 },
        B1: { x: 20, y: 0 },
        B2: { x: 80, y: 0 },
      };

      const overlapRes = componentSeparation(nodes, edges, overlappingPositions, { minComponentGap: 100 });
      expect(overlapRes.overlappingComponentPairs).toBe(1);
    });
  });

  describe('hubLocality and bridgePlacement', () => {
    it('calculates hub locality and bridge placement metrics', () => {
      const nodes = [
        makeNode('Hub', 'ApexClass', 'HubClass'),
        makeNode('N1'), makeNode('N2'), makeNode('N3'), makeNode('N4'),
        makeNode('OrderService', 'ApexClass', 'OrderService'),
        makeNode('PaymentService', 'ApexClass', 'PaymentService'),
        makeNode('BridgeController', 'ApexClass', 'BridgeController'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('Hub', 'N1'),
        createEdge('Hub', 'N2'),
        createEdge('Hub', 'N3'),
        createEdge('Hub', 'N4'),
        createEdge('BridgeController', 'OrderService'),
        createEdge('BridgeController', 'PaymentService'),
      ];

      const positions = {
        Hub: { x: 0, y: 0 },
        N1: { x: 10, y: 0 },
        N2: { x: -10, y: 0 },
        N3: { x: 0, y: 10 },
        N4: { x: 0, y: -10 },
        OrderService: { x: 0, y: 200 },
        PaymentService: { x: 200, y: 200 },
        BridgeController: { x: 100, y: 200 },
      };

      const hubRes = hubLocality(nodes, edges, positions, { hubDegreeThreshold: 4 });
      expect(hubRes.hubCount).toBe(1);
      expect(hubRes.averageHubNeighborDistance).toBe(10);

      const bridgeRes = bridgePlacement(nodes, edges, positions);
      expect(bridgeRes.bridgeCount).toBe(1);
      expect(bridgeRes.averageBridgeToDomainCentroidDistance).toBe(0);
    });
  });

  describe('calculateDetailedEdgeCrossings breakdown', () => {
    it('categorizes edge crossings into primary, bridge, and satellite categories accurately', () => {
      const nodes = [
        makeNode('OrderService', 'ApexClass', 'OrderService'),
        makeNode('PaymentService', 'ApexClass', 'PaymentService'),
        makeNode('OrderController', 'ApexClass', 'OrderController'),
        makeNode('PaymentController', 'ApexClass', 'PaymentController'),
        makeNode('Field:Order.Amount__c', 'CustomField', 'Field:Order.Amount__c'),
        makeNode('Field:Payment.Status__c', 'CustomField', 'Field:Payment.Status__c'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('OrderController', 'PaymentService'),
        createEdge('PaymentController', 'OrderService'),
        createEdge('Field:Order.Amount__c', 'PaymentService'),
        createEdge('Field:Payment.Status__c', 'OrderService'),
      ];

      const positions = {
        OrderController: { x: 0, y: 0 },
        PaymentService: { x: 200, y: 200 },
        PaymentController: { x: 0, y: 200 },
        OrderService: { x: 200, y: 0 },
        'Field:Order.Amount__c': { x: 0, y: 50 },
        'Field:Payment.Status__c': { x: 0, y: 150 },
      };

      const breakdown = calculateDetailedEdgeCrossings(nodes, edges, positions);
      expect(breakdown.primaryBridgeCrossings + breakdown.bridgeBridgeCrossings + breakdown.primaryPrimaryCrossings).toBeDefined();
      expect(breakdown.totalGeometricCrossings).toBeGreaterThan(0);
    });
  });

  describe('calculateLayoutMetrics comprehensive runner', () => {
    it('produces complete metric object without magic weighted scores', () => {
      const nodes = [makeNode('A'), makeNode('B')];
      const edges: ExplorerEdge[] = [createEdge('A', 'B')];
      const positions = {
        A: { x: 0, y: 0 },
        B: { x: 200, y: 0 },
      };

      const metrics = calculateLayoutMetrics(nodes, edges, positions);

      expect(metrics.edgeCrossingCount).toBeDefined();
      expect(metrics.averageEdgeLength).toBe(200);
      expect(metrics.maxEdgeLength).toBe(200);
      expect(metrics.nodeOverlapCount).toBe(0);
      expect(metrics.layerViolationCount).toBe(0);
      expect(metrics.domainCohesion).toBeDefined();
      expect(metrics.componentSeparation).toBeDefined();
      expect(metrics.hubLocality).toBeDefined();
      expect(metrics.bridgePlacement).toBeDefined();
      expect(metrics.featureLocality?.sameLayerLocality).toBeDefined();
      expect(metrics.featureLocality?.crossLayerLocality).toBeDefined();
    });

    it('calculates same-layer and cross-layer feature locality metrics cleanly', () => {
      const nodes = [
        makeNode('Page', 'LWC', 'OrderView'),
        makeNode('Comp', 'LWC', 'OrderCard'),
        makeNode('Service', 'ApexClass', 'OrderService'),
        makeNode('Repo', 'ApexClass', 'OrderRepository'),
      ];
      const edges: ExplorerEdge[] = [
        createEdge('Page', 'Comp'),      // intra-feature, same layer (presentation-presentation)
        createEdge('Page', 'Service'),   // intra-feature, cross layer (presentation-application)
        createEdge('Service', 'Repo'),   // intra-feature, cross layer (application-domain)
      ];
      const positions = {
        Page: { x: 0, y: 0 },
        Comp: { x: 100, y: 0 },
        Service: { x: 0, y: 350 },
        Repo: { x: 0, y: 600 },
      };

      const metrics = calculateLayoutMetrics(nodes, edges, positions);
      const featureLocality = metrics.featureLocality!;

      expect(featureLocality.sameLayerLocality).toEqual({
        medianIntraEdgeLength: 100,
        medianInterEdgeLength: 0,
        intraToInterRatio: 0,
        intraCount: 1,
        interCount: 0,
        isSameLayerIntraShorterThanInter: false,
      });

      expect(featureLocality.crossLayerLocality).toEqual({
        medianIntraEdgeLength: 300,
        medianInterEdgeLength: 0,
        intraToInterRatio: 0,
        intraCount: 2,
        interCount: 0,
      });
    });
  });
});

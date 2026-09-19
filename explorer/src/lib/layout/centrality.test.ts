import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import {
  computeNodeHubMetrics,
  computeNodeBridgeAnalysis,
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
  calculateHubCandidatePosition,
} from './centrality';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { createBridgeHeavyFixture } from './fixtures/bridge-heavy';
import { createDenseCrossDomainFixture } from './fixtures/dense-cross-domain';
import { createNode, createEdge } from './fixtures/builder';

function makeMockNode(
  id: string,
  type: ExplorerNode['type'] = 'ApexClass'
): ExplorerNode {
  return createNode(id, type);
}

describe('Centrality Intelligence Engine (Wave 3B, Wave 8B & Wave 3C)', () => {
  describe('Hub Analysis & Classification', () => {
    it('1. High fan-in hub: correctly identifies fan-in hub type and score', () => {
      const { hubScore, isHub, hubType } = computeNodeHubMetrics(10, 1, 2.0, 3.5);
      expect(isHub).toBe(true);
      expect(hubType).toBe('fan-in');
      expect(hubScore).toBeGreaterThan(5.0);
    });

    it('2. High fan-out hub: correctly identifies fan-out hub type and score', () => {
      const { hubScore, isHub, hubType } = computeNodeHubMetrics(1, 10, 2.0, 3.5);
      expect(isHub).toBe(true);
      expect(hubType).toBe('fan-out');
      expect(hubScore).toBeGreaterThan(5.0);
    });

    it('3. Balanced hub: correctly identifies balanced hub type with equal fan-in and fan-out', () => {
      const { hubScore, isHub, hubType } = computeNodeHubMetrics(5, 5, 2.0, 3.5);
      expect(isHub).toBe(true);
      expect(hubType).toBe('balanced');
      expect(hubScore).toBeGreaterThan(6.0);
    });

    it('4. Same-domain high-degree node: qualifies as a hub but NOT a bridge', () => {
      const nodes: ExplorerNode[] = [
        makeMockNode('OrderService'),
        makeMockNode('OrderHelper1'),
        makeMockNode('OrderHelper2'),
        makeMockNode('OrderHelper3'),
        makeMockNode('OrderHelper4'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('OrderService', 'OrderHelper1'),
        createEdge('OrderService', 'OrderHelper2'),
        createEdge('OrderService', 'OrderHelper3'),
        createEdge('OrderService', 'OrderHelper4'),
      ];

      const domainMap = new Map<string, string>([
        ['OrderService', 'Order'],
        ['OrderHelper1', 'Order'],
        ['OrderHelper2', 'Order'],
        ['OrderHelper3', 'Order'],
        ['OrderHelper4', 'Order'],
      ]);

      const layerMap = new Map<string, ArchitectureLayer>([
        ['OrderService', 'application'],
        ['OrderHelper1', 'domain'],
        ['OrderHelper2', 'domain'],
        ['OrderHelper3', 'domain'],
        ['OrderHelper4', 'domain'],
      ]);

      const analysisMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);
      const orderServiceCentrality = analysisMap.get('OrderService')!;

      expect(orderServiceCentrality.isHub).toBe(true);
      expect(orderServiceCentrality.isBridge).toBe(false);
      expect(orderServiceCentrality.spatialRole).toBe('hub-only');
    });
  });

  describe('Bridge Analysis & Neighborhood Mapping', () => {
    it('5. Two-domain bridge: connects two distinct non-Shared domains', () => {
      const edges: ExplorerEdge[] = [
        createEdge('BridgeController', 'OrderService'),
        createEdge('BridgeController', 'PaymentProcessor'),
      ];

      const domainMap = new Map<string, string>([
        ['BridgeController', 'Order'],
        ['OrderService', 'Order'],
        ['PaymentProcessor', 'Payment'],
      ]);

      const layerMap = new Map<string, ArchitectureLayer>([
        ['BridgeController', 'application'],
        ['OrderService', 'domain'],
        ['PaymentProcessor', 'domain'],
      ]);

      const analysis = computeNodeBridgeAnalysis(
        'BridgeController',
        'Order',
        'application',
        edges,
        domainMap,
        layerMap
      );

      expect(analysis.isBridge).toBe(true);
      expect(analysis.connectedDomains).toEqual(['Payment']);
      expect(analysis.bridgeScore).toBeGreaterThan(0);
    });

    it('6. Three-domain bridge: connects three distinct domains and records relationship strengths', () => {
      const nodes = [
        makeMockNode('Orchestrator'),
        makeMockNode('OrderService'),
        makeMockNode('PaymentProcessor'),
        makeMockNode('InventoryManager'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('Orchestrator', 'OrderService'),
        createEdge('Orchestrator', 'PaymentProcessor'),
        createEdge('Orchestrator', 'InventoryManager'),
      ];

      const domainMap = new Map<string, string>([
        ['Orchestrator', 'Shared'],
        ['OrderService', 'Order'],
        ['PaymentProcessor', 'Payment'],
        ['InventoryManager', 'Inventory'],
      ]);

      const layerMap = new Map<string, ArchitectureLayer>([
        ['Orchestrator', 'application'],
        ['OrderService', 'domain'],
        ['PaymentProcessor', 'domain'],
        ['InventoryManager', 'domain'],
      ]);

      const analysisMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);
      const orchestratorCentrality = analysisMap.get('Orchestrator')!;

      expect(orchestratorCentrality.isBridge).toBe(true);
      expect(orchestratorCentrality.connectedDomains).toEqual(['Inventory', 'Order', 'Payment']);
      expect(orchestratorCentrality.bridgeScore).toBe(33);
    });

    it('7. Hub + bridge: single node satisfies both roles without collapsing category', () => {
      const nodes = [
        makeMockNode('MasterGateway'),
        makeMockNode('OrderA'),
        makeMockNode('OrderB'),
        makeMockNode('PaymentA'),
        makeMockNode('PaymentB'),
        makeMockNode('BillingA'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('MasterGateway', 'OrderA'),
        createEdge('MasterGateway', 'OrderB'),
        createEdge('MasterGateway', 'PaymentA'),
        createEdge('MasterGateway', 'PaymentB'),
        createEdge('MasterGateway', 'BillingA'),
      ];

      const domainMap = new Map<string, string>([
        ['MasterGateway', 'Core'],
        ['OrderA', 'Order'],
        ['OrderB', 'Order'],
        ['PaymentA', 'Payment'],
        ['PaymentB', 'Payment'],
        ['BillingA', 'Billing'],
      ]);

      const layerMap = new Map<string, ArchitectureLayer>([
        ['MasterGateway', 'application'],
        ['OrderA', 'domain'],
        ['OrderB', 'domain'],
        ['PaymentA', 'domain'],
        ['PaymentB', 'domain'],
        ['BillingA', 'domain'],
      ]);

      const analysisMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);
      const masterGatewayCentrality = analysisMap.get('MasterGateway')!;

      expect(masterGatewayCentrality.isHub).toBe(true);
      expect(masterGatewayCentrality.isBridge).toBe(true);
      expect(masterGatewayCentrality.spatialRole).toBe('hub-and-bridge');
    });

    it('8. Non-bridge: node with many neighbors within its own domain is NOT a bridge', () => {
      const nodes = [
        makeMockNode('OrderManager'),
        makeMockNode('OrderA'),
        makeMockNode('OrderB'),
        makeMockNode('OrderC'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('OrderManager', 'OrderA'),
        createEdge('OrderManager', 'OrderB'),
        createEdge('OrderManager', 'OrderC'),
      ];

      const domainMap = new Map<string, string>([
        ['OrderManager', 'Order'],
        ['OrderA', 'Order'],
        ['OrderB', 'Order'],
        ['OrderC', 'Order'],
      ]);

      const layerMap = new Map<string, ArchitectureLayer>([
        ['OrderManager', 'application'],
        ['OrderA', 'domain'],
        ['OrderB', 'domain'],
        ['OrderC', 'domain'],
      ]);

      const analysisMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);
      const orderManagerCentrality = analysisMap.get('OrderManager')!;

      expect(orderManagerCentrality.isBridge).toBe(false);
      expect(orderManagerCentrality.connectedDomains).toEqual([]);
    });
  });

  describe('Intermediate-Domain Trap Avoidance & Placement Candidate', () => {
    it('9. Intermediate-domain trap: detects trap when midpoint falls inside unconnected Domain B and applies corridor offset', () => {
      const domainXCenters = {
        DomainA: 0,
        DomainB: 380,
        DomainC: 760,
      };

      const domainBounds = {
        DomainA: { minX: -100, maxX: 100 },
        DomainB: { minX: 280, maxX: 480 },
        DomainC: { minX: 660, maxX: 860 },
      };

      const connectedDomains = ['DomainA', 'DomainC'];
      const neighborPositions = {};

      const placement = calculateBridgeCandidatePosition(
        'CrossBridgeNode',
        'application',
        connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing: 250, nodeWidth: 120 }
      );

      expect(placement.hasIntermediateTrap).toBe(true);
      expect(placement.trapDomainId).toBe('DomainB');
      expect(placement.candidatePosition.y).toBeLessThan(350);
      expect(placement.candidatePosition.x).toBe(380);
    });

    it('Hub candidate placement: positions fan-in vs fan-out hubs deterministically', () => {
      const fanInPlacement = calculateHubCandidatePosition(
        'FanInHub',
        5.0,
        'fan-in',
        'Order',
        'application',
        380,
        350
      );

      const fanOutPlacement = calculateHubCandidatePosition(
        'FanOutHub',
        5.0,
        'fan-out',
        'Order',
        'application',
        380,
        350
      );

      expect(fanInPlacement.candidateLocalPosition.y).toBe(370);
      expect(fanOutPlacement.candidateLocalPosition.y).toBe(330);
    });
  });

  describe('WAVE 8B — Multi-Bridge Separation & Determinism', () => {
    it('2-domain bridge: places bridge connecting Order and Payment at distinct valid coordinates with domain connectivity preserved', () => {
      const nodes = [
        makeMockNode('OrderService'),
        makeMockNode('PaymentProcessor'),
        makeMockNode('OrderPaymentAdapter'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('OrderPaymentAdapter', 'OrderService'),
        createEdge('OrderPaymentAdapter', 'PaymentProcessor'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const pAdapter = positions['OrderPaymentAdapter'];
      const pOrder = positions['OrderService'];
      const pPayment = positions['PaymentProcessor'];

      expect(pAdapter).toBeDefined();
      expect(Number.isFinite(pAdapter.x)).toBe(true);
      expect(Number.isFinite(pAdapter.y)).toBe(true);

      expect(pAdapter).not.toEqual(pOrder);
      expect(pAdapter).not.toEqual(pPayment);

      const metrics = evaluateLayout(nodes, edges, positions);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('3-domain bridge: places orchestrator connecting Order, Payment, and Inventory with valid distinct coordinates', () => {
      const nodes = [
        makeMockNode('OrderService'),
        makeMockNode('PaymentProcessor'),
        makeMockNode('InventoryManager'),
        makeMockNode('MasterOrchestrator'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('MasterOrchestrator', 'OrderService'),
        createEdge('MasterOrchestrator', 'PaymentProcessor'),
        createEdge('MasterOrchestrator', 'InventoryManager'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const pOrch = positions['MasterOrchestrator'];
      expect(Number.isFinite(pOrch.x)).toBe(true);
      expect(Number.isFinite(pOrch.y)).toBe(true);

      const metrics = evaluateLayout(nodes, edges, positions);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('multiple bridges across different domain pairs: places Order-Payment bridges and Billing-Inventory bridges without collisions', () => {
      const nodes = [
        makeMockNode('OrderService'),
        makeMockNode('PaymentProcessor'),
        makeMockNode('OrderPaymentBridge1'),
        makeMockNode('OrderPaymentBridge2'),

        makeMockNode('BillingService'),
        makeMockNode('InventoryManager'),
        makeMockNode('BillingInventoryBridge1'),
        makeMockNode('BillingInventoryBridge2'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('OrderPaymentBridge1', 'OrderService'),
        createEdge('OrderPaymentBridge1', 'PaymentProcessor'),
        createEdge('OrderPaymentBridge2', 'OrderService'),
        createEdge('OrderPaymentBridge2', 'PaymentProcessor'),

        createEdge('BillingInventoryBridge1', 'BillingService'),
        createEdge('BillingInventoryBridge1', 'InventoryManager'),
        createEdge('BillingInventoryBridge2', 'BillingService'),
        createEdge('BillingInventoryBridge2', 'InventoryManager'),
      ];

      const positions = computeArchitectureLayout(nodes, edges);

      const coords = Object.values(positions).map(p => `${p.x}:${p.y}`);
      const uniqueCoords = new Set(coords);
      expect(uniqueCoords.size).toBe(8);

      const metrics = evaluateLayout(nodes, edges, positions);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('places multiple bridge nodes connecting the same domain pair at distinct non-overlapping coordinates', () => {
      const domainXCenters = {
        OrderDomain: 100,
        PaymentDomain: 900,
      };

      const domainBounds = {
        OrderDomain: { minX: 0, maxX: 200 },
        PaymentDomain: { minX: 800, maxX: 1000 },
      };

      const connectedDomains = ['OrderDomain', 'PaymentDomain'];

      const bridge1 = calculateBridgeCandidatePosition(
        'BridgeA',
        'application',
        connectedDomains,
        domainXCenters,
        domainBounds,
        {},
        { nodeWidth: 120, nodeHeight: 60 }
      );

      const allocatedPositions = { BridgeA: bridge1.candidatePosition };

      const bridge2 = calculateBridgeCandidatePosition(
        'BridgeB',
        'application',
        connectedDomains,
        domainXCenters,
        domainBounds,
        {},
        { nodeWidth: 120, nodeHeight: 60, allocatedPositions }
      );

      expect(bridge1.candidatePosition).not.toEqual(bridge2.candidatePosition);
      const dx = Math.abs(bridge1.candidatePosition.x - bridge2.candidatePosition.x);
      const dy = Math.abs(bridge1.candidatePosition.y - bridge2.candidatePosition.y);
      expect(dx >= 120 || dy >= 60).toBe(true);
    });

    it('FIND-7C-03 Remediation: Bridge-Heavy fixture layout achieves nodeOverlapCount === 0', () => {
      const fixture = createBridgeHeavyFixture();
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);

      expect(metrics.nodeOverlapCount).toBe(0);
      Object.values(positions).forEach(p => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });

    it('10. Determinism: produces identical results across repeated executions regardless of input order', () => {
      const nodes = [
        makeMockNode('A_Node'),
        makeMockNode('B_Node'),
        makeMockNode('C_Node'),
        makeMockNode('D_Node'),
      ];

      const edges: ExplorerEdge[] = [
        createEdge('A_Node', 'B_Node'),
        createEdge('A_Node', 'C_Node'),
        createEdge('A_Node', 'D_Node'),
      ];

      const domainMap1 = new Map<string, string>([
        ['A_Node', 'Domain1'],
        ['B_Node', 'Domain2'],
        ['C_Node', 'Domain3'],
        ['D_Node', 'Domain1'],
      ]);

      const layerMap1 = new Map<string, ArchitectureLayer>([
        ['A_Node', 'application'],
        ['B_Node', 'domain'],
        ['C_Node', 'domain'],
        ['D_Node', 'domain'],
      ]);

      const result1 = computeGraphCentralityAnalysis(nodes, edges, domainMap1, layerMap1);

      const shuffledNodes = [...nodes].reverse();
      const shuffledEdges = [...edges].reverse();

      const result2 = computeGraphCentralityAnalysis(shuffledNodes, shuffledEdges, domainMap1, layerMap1);

      expect(Array.from(result1.keys())).toEqual(Array.from(result2.keys()));
      expect(result1.get('A_Node')).toEqual(result2.get('A_Node'));
    });
  });

  describe('WAVE 3C — Bridge Geometry Optimization Requirements', () => {
    it('1. Bridge candidate not inside unrelated domain: detects trap and places bridge outside trap domain interior', () => {
      const domainXCenters = {
        DomainA: 0,
        DomainB: 400,
        DomainC: 800,
      };

      const domainBounds = {
        DomainA: { minX: -100, maxX: 100 },
        DomainB: { minX: 300, maxX: 500 },
        DomainC: { minX: 700, maxX: 900 },
      };

      const connectedDomains = ['DomainA', 'DomainC'];

      const placement = calculateBridgeCandidatePosition(
        'CrossDomainBridge',
        'application',
        connectedDomains,
        domainXCenters,
        domainBounds,
        {},
        {
          layerSpacing: 250,
          layerYOffsets: {
            presentation: 100,
            application: 350,
            domain: 600,
            schema: 850,
          },
        }
      );

      expect(placement.hasIntermediateTrap).toBe(true);
      expect(placement.trapDomainId).toBe('DomainB');
      expect(placement.candidatePosition.y).not.toBe(350);
      expect(placement.candidatePosition.y).toBe(225);
    });

    it('2. Minimum valid displacement: dynamically calculates displacement based on layerYOffsets rather than fixed 125px', () => {
      const domainXCenters = { DomainA: 100, DomainB: 500, DomainC: 900 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 400, maxX: 600 },
        DomainC: { minX: 800, maxX: 1000 },
      };

      const customLayerYOffsets: Record<ArchitectureLayer, number> = {
        presentation: 100,
        application: 200,
        domain: 300,
        schema: 400,
      };

      const placement = calculateBridgeCandidatePosition(
        'CompactBridge',
        'application',
        ['DomainA', 'DomainC'],
        domainXCenters,
        domainBounds,
        {},
        { layerYOffsets: customLayerYOffsets }
      );

      expect(placement.hasIntermediateTrap).toBe(true);
      expect(placement.candidatePosition.y).toBe(150);
    });

    it('3. Dynamic layer-Y compatibility: correctly respects Wave 2B dynamic layer map', () => {
      const dynamicYMap: Record<ArchitectureLayer, number> = {
        presentation: 100,
        application: 280,
        domain: 520,
        schema: 800,
      };

      const domainXCenters = { DomainA: 100, DomainB: 500, DomainC: 900 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 400, maxX: 600 },
        DomainC: { minX: 800, maxX: 1000 },
      };

      const placement = calculateBridgeCandidatePosition(
        'DynamicBridge',
        'application',
        ['DomainA', 'DomainC'],
        domainXCenters,
        domainBounds,
        {},
        { layerYOffsets: dynamicYMap }
      );

      expect(placement.candidatePosition.y).toBe(190);
    });

    it('4. Multiple bridges: places multiple bridges connecting same/different domain pairs without overlap', () => {
      const domainXCenters = { DomainA: 100, DomainB: 900 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 800, maxX: 1000 },
      };

      const b1 = calculateBridgeCandidatePosition('Bridge1', 'application', ['DomainA', 'DomainB'], domainXCenters, domainBounds, {});
      const b2 = calculateBridgeCandidatePosition('Bridge2', 'application', ['DomainA', 'DomainB'], domainXCenters, domainBounds, {}, { allocatedPositions: { Bridge1: b1.candidatePosition } });
      const b3 = calculateBridgeCandidatePosition('Bridge3', 'application', ['DomainA', 'DomainB'], domainXCenters, domainBounds, {}, { allocatedPositions: { Bridge1: b1.candidatePosition, Bridge2: b2.candidatePosition } });

      const positions = [b1.candidatePosition, b2.candidatePosition, b3.candidatePosition];
      const posKeys = new Set(positions.map(p => `${p.x}:${p.y}`));

      expect(posKeys.size).toBe(3);
    });

    it('5. Dense cross-domain graph acceptance: computes layout with zero overlaps and valid coordinates', () => {
      const fixture = createDenseCrossDomainFixture();
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);

      expect(metrics.nodeOverlapCount).toBe(0);
      expect(metrics.edgeCrossingCount).toBeLessThanOrEqual(7);
      Object.values(positions).forEach(p => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });

    it('6. Bridge-heavy graph acceptance: computes layout with zero overlaps and no crossing regression', () => {
      const fixture = createBridgeHeavyFixture();
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);

      expect(metrics.nodeOverlapCount).toBe(0);
      expect(metrics.edgeCrossingCount).toBeLessThanOrEqual(6);
      Object.values(positions).forEach(p => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });

    it('7. Deterministic tie-breaking: yields invariant bridge positions under node/edge shuffling', () => {
      const fixture = createBridgeHeavyFixture();

      const pos1 = computeArchitectureLayout(fixture.nodes, fixture.edges);

      const shuffledNodes = [...fixture.nodes].reverse();
      const shuffledEdges = [...fixture.edges].reverse();
      const pos2 = computeArchitectureLayout(shuffledNodes, shuffledEdges);

      expect(pos1).toEqual(pos2);
    });

    it('8. Zero overlap requirement: guarantees zero node overlaps across all bridge-bearing layouts', () => {
      const dense = createDenseCrossDomainFixture();
      const bridge = createBridgeHeavyFixture();

      const denseMetrics = evaluateLayout(dense.nodes, dense.edges, computeArchitectureLayout(dense.nodes, dense.edges));
      const bridgeMetrics = evaluateLayout(bridge.nodes, bridge.edges, computeArchitectureLayout(bridge.nodes, bridge.edges));

      expect(denseMetrics.nodeOverlapCount).toBe(0);
      expect(bridgeMetrics.nodeOverlapCount).toBe(0);
    });

    it('9. No crossing regression: maintains crossing efficiency without introducing invalid geometry', () => {
      const dense = createDenseCrossDomainFixture();
      const metrics = evaluateLayout(dense.nodes, dense.edges, computeArchitectureLayout(dense.nodes, dense.edges));

      expect(metrics.edgeCrossingCount).toBeLessThanOrEqual(7);
      expect(metrics.maxEdgeLength).toBeLessThanOrEqual(1404);
    });
  });
});

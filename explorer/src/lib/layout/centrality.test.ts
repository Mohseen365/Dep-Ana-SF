import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import {
  computeNodeHubMetrics,
  computeNodeBridgeAnalysis,
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
  calculateHubCandidatePosition,
  classifyNodeConceptualCategory,
  clearBridgeAllocations,
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
      expect(placement.candidatePosition.y).toBe(250);
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
      expect(placement.candidatePosition.y).toBe(250);
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
      expect(placement.candidatePosition.y).toBe(100);
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

      expect(placement.candidatePosition.y).toBe(380);
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
      expect(metrics.edgeCrossingCount).toBeLessThanOrEqual(10);
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

      expect(metrics.edgeCrossingCount).toBeLessThanOrEqual(10);
      expect(metrics.maxEdgeLength).toBeLessThanOrEqual(1404);
    });
  });

  describe('Workstream B3 Conceptual Category Classification & Trap Handling', () => {
    it('classifies nodes into 5 B3 conceptual categories cleanly', () => {
      const testNode = makeMockNode('OrderServiceTest', 'ApexClass');
      testNode.behavior = { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 };

      const dummyCent = {
        nodeId: 'node1',
        isHub: false,
        hubScore: 1,
        hubType: 'none' as const,
        isBridge: false,
        bridgeScore: 0,
        connectedDomains: [],
        connectedLayers: [],
        domainRelationshipStrength: {},
        spatialRole: 'standard' as const,
      };

      expect(classifyNodeConceptualCategory('OrderServiceTest', testNode, dummyCent, 'Order', [])).toBe('satellite');

      const sharedNode = makeMockNode('CurrencyUtils', 'ApexClass');
      expect(classifyNodeConceptualCategory('CurrencyUtils', sharedNode, dummyCent, 'Shared', [])).toBe('shared-infrastructure');

      const bridgeNode = makeMockNode('OrderPaymentBridge', 'ApexClass');
      const bridgeCent = { ...dummyCent, isBridge: true };
      expect(classifyNodeConceptualCategory('OrderPaymentBridge', bridgeNode, bridgeCent, 'Order', ['Order', 'Payment'])).toBe('bridge');

      const multiFeatNode = makeMockNode('MultiFeatNode', 'ApexClass');
      expect(classifyNodeConceptualCategory('MultiFeatNode', multiFeatNode, dummyCent, 'Order', ['Payment'])).toBe('multi-feature');

      const localNode = makeMockNode('LocalHelper', 'ApexClass');
      expect(classifyNodeConceptualCategory('LocalHelper', localNode, dummyCent, 'Order', [])).toBe('feature-local');
    });

    it('detects intermediate trap domain when candidate X falls inside domain bounds', () => {
      const domainXCenters = {
        FeatureA: 0,
        DomainB: 380,
        FeatureB: 760,
      };

      const domainBounds = {
        FeatureA: { minX: -100, maxX: 100 },
        DomainB: { minX: 280, maxX: 480 },
        FeatureB: { minX: 660, maxX: 860 },
      };

      const connectedDomains = ['FeatureA', 'FeatureB'];

      const placement = calculateBridgeCandidatePosition(
        'BridgeCrossDomainB',
        'application',
        connectedDomains,
        domainXCenters,
        domainBounds,
        {},
        { layerSpacing: 250, nodeWidth: 120 }
      );

      expect(placement.hasIntermediateTrap).toBe(true);
      expect(placement.trapDomainId).toBe('DomainB');
    });
  });

  describe('SB-1C Stage 8 Corridor-Aware Dynamic Expansion & 3-Lane Placement Suite', () => {
    it('Test 1 — Normal corridor: 1-2 bridges, no expansion, no collision, deterministic', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 100, DomainB: 900 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 800, maxX: 1000 },
      };

      const b1 = calculateBridgeCandidatePosition(
        'Bridge1',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        { nodeWidth: 120, nodeHeight: 60, corridorPopulation: 2 }
      );

      const b2 = calculateBridgeCandidatePosition(
        'Bridge2',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        { nodeWidth: 120, nodeHeight: 60, corridorPopulation: 2, allocatedPositions: { Bridge1: b1.candidatePosition } }
      );

      expect(b1.isExhausted).not.toBe(true);
      expect(b2.isExhausted).not.toBe(true);
      expect(b1.candidatePosition).not.toEqual(b2.candidatePosition);
      const dx = Math.abs(b1.candidatePosition.x - b2.candidatePosition.x);
      const dy = Math.abs(b1.candidatePosition.y - b2.candidatePosition.y);
      expect(dx >= 160 || dy >= 100).toBe(true);
    });

    it('Test 2 — Dense corridor: >= 8 bridges, utilizes multiple Y lanes, zero overlap', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 100, DomainB: 500 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 400, maxX: 600 },
      };

      const bridges: Array<{ x: number; y: number }> = [];
      const allocatedPositions: Record<string, { x: number; y: number }> = {};

      for (let i = 1; i <= 8; i++) {
        const id = `DenseBridge_${i}`;
        const res = calculateBridgeCandidatePosition(
          id,
          'application',
          ['DomainA', 'DomainB'],
          domainXCenters,
          domainBounds,
          {},
          { nodeWidth: 120, nodeHeight: 60, corridorPopulation: 8, allocatedPositions }
        );
        expect(res.isExhausted).not.toBe(true);
        allocatedPositions[id] = res.candidatePosition;
        bridges.push(res.candidatePosition);
      }

      // Confirm all 8 positions are distinct and pairwise non-overlapping
      const keys = new Set(bridges.map(p => `${p.x}:${p.y}`));
      expect(keys.size).toBe(8);

      const uniqueYValues = new Set(bridges.map(p => p.y));
      expect(uniqueYValues.size).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < bridges.length; i++) {
        for (let j = i + 1; j < bridges.length; j++) {
          const dx = Math.abs(bridges[i].x - bridges[j].x);
          const dy = Math.abs(bridges[i].y - bridges[j].y);
          expect(dx >= 160 || dy >= 100).toBe(true);
        }
      }
    });

    it('Test 3 — Primary-blocked Y0: primary nodes occupy center-lane, bridges move to legal alternate lane', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 100, DomainB: 300 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 200, maxX: 400 },
      };

      // Block Y0 = 350 at X = 200 with primary node
      const primaryPositions = {
        PrimaryNode1: { x: 200, y: 350 },
      };

      const res = calculateBridgeCandidatePosition(
        'BlockedY0Bridge',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        {
          nodeWidth: 120,
          nodeHeight: 60,
          layerYOffsets: { presentation: 100, application: 350, domain: 600, schema: 850 },
          allocatedPositions: primaryPositions,
        }
      );

      expect(res.isExhausted).not.toBe(true);
      expect(res.candidatePosition.y).not.toBe(350);
      expect([250, 450]).toContain(res.candidatePosition.y);
    });

    it('Test 4 — Fragmented occupancy: actual geometry determines placement, not capacity formula', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 100, DomainB: 500 };
      const domainBounds = {
        DomainA: { minX: 0, maxX: 200 },
        DomainB: { minX: 400, maxX: 600 },
      };

      // Fragmented occupancy across Y0, Y0-100, Y0+100
      const allocatedPositions = {
        Primary1: { x: 160, y: 350 },
        Primary2: { x: 320, y: 250 },
        Primary3: { x: 480, y: 450 },
      };

      const res = calculateBridgeCandidatePosition(
        'FragBridge',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        {
          nodeWidth: 120,
          nodeHeight: 60,
          layerYOffsets: { presentation: 100, application: 350, domain: 600, schema: 850 },
          allocatedPositions,
        }
      );

      expect(res.isExhausted).not.toBe(true);
      // Ensure it does not collide with any allocated position
      for (const [_, pos] of Object.entries(allocatedPositions)) {
        const dx = Math.abs(res.candidatePosition.x - pos.x);
        const dy = Math.abs(res.candidatePosition.y - pos.y);
        expect(dx >= 160 || dy >= 100).toBe(true);
      }
    });

    it('Test 5 — Dynamic expansion: initial bounds intentionally blocked, symmetric expansion outward', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 200, DomainB: 200 };
      const domainBounds = {
        DomainA: { minX: 100, maxX: 300 },
        DomainB: { minX: 100, maxX: 300 },
      };

      // Completely block initial legal bounds [0, 400] across all 3 Y lanes (250, 350, 450)
      const allocatedPositions: Record<string, { x: number; y: number }> = {};
      const xPositions = [0, 160, 320, 480];
      const yLanes = [250, 350, 450];
      let pIdx = 0;
      for (const x of xPositions) {
        for (const y of yLanes) {
          pIdx++;
          allocatedPositions[`Blocker_${pIdx}`] = { x, y };
        }
      }

      const res = calculateBridgeCandidatePosition(
        'ExpandingBridge',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        {
          nodeWidth: 120,
          nodeHeight: 60,
          layerYOffsets: { presentation: 100, application: 350, domain: 600, schema: 850 },
          corridorPopulation: 10,
          allocatedPositions,
        }
      );

      expect(res.isExhausted).not.toBe(true);
      expect(res.candidatePosition.x < 0 || res.candidatePosition.x > 480).toBe(true);
    });

    it('Test 6 — Explicit exhaustion: construct intentionally impossible search space', () => {
      clearBridgeAllocations();
      const domainXCenters = { DomainA: 200, DomainB: 200 };
      const domainBounds = {
        DomainA: { minX: 100, maxX: 300 },
        DomainB: { minX: 100, maxX: 300 },
      };

      // Completely block grid from step -100 to +100 outward from X0 = 200 across all 3 Y lanes
      const allocatedPositions: Record<string, { x: number; y: number }> = {};
      let pIdx = 0;
      for (let step = -100; step <= 100; step++) {
        const x = 200 + step * 160;
        for (const y of [250, 350, 450]) {
          pIdx++;
          allocatedPositions[`SuperBlocker_${pIdx}`] = { x, y };
        }
      }

      const res = calculateBridgeCandidatePosition(
        'ExhaustedBridge',
        'application',
        ['DomainA', 'DomainB'],
        domainXCenters,
        domainBounds,
        {},
        {
          nodeWidth: 120,
          nodeHeight: 60,
          layerYOffsets: { presentation: 100, application: 350, domain: 600, schema: 850 },
          corridorPopulation: 2, // maxExpansionSteps = max(50, 2) = 50 -> search max ±8000px
          allocatedPositions,
        }
      );

      expect(res.isExhausted).toBe(true);
      expect(res.exhaustionTelemetry).toBeDefined();
      expect(res.exhaustionTelemetry?.reason).toBe('FINITE_SEARCH_SPACE_EXHAUSTED');
    });

    it('Test 7 — Repeated execution: 10x repeated execution yields zero coordinate drift', () => {
      const fixture = createBridgeHeavyFixture();

      const runs: Array<Record<string, { x: number; y: number }>> = [];
      for (let run = 0; run < 10; run++) {
        runs.push(computeArchitectureLayout(fixture.nodes, fixture.edges));
      }

      const baselineRun = runs[0];
      for (let run = 1; run < 10; run++) {
        expect(runs[run]).toEqual(baselineRun);
      }
    });

    it('Test 8 — Input ordering: shuffled equivalent input yields bit-for-bit identical bridge positions', () => {
      const fixture = createBridgeHeavyFixture();

      const originalPositions = computeArchitectureLayout(fixture.nodes, fixture.edges);

      const shuffledNodes = [...fixture.nodes].reverse();
      const shuffledEdges = [...fixture.edges].reverse();
      const shuffledPositions = computeArchitectureLayout(shuffledNodes, shuffledEdges);

      expect(shuffledPositions).toEqual(originalPositions);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import type { PositionMap } from './metrics';
import {
  evaluateLayout,
  compareLayoutMetrics,
  evaluateSatelliteLocality,
} from './evaluate-layout';
import { createScale100PlusFixture } from './fixtures/scale-100-plus';

function makeNode(
  id: string,
  type: ExplorerNodeType = 'ApexClass',
  overrides: Partial<ExplorerNode> = {}
): ExplorerNode {
  return {
    id,
    type,
    displayName: id,
    file: `force-app/main/default/classes/${id}.cls`,
    metrics: {
      loc: 100,
      cyclomaticComplexity: 5,
      cognitiveComplexity: 3,
      fanIn: 1,
      fanOut: 1,
      soqlCount: 0,
      dmlCount: 0,
    },
    risk: 'LOW',
    riskReasons: [],
    ...overrides,
  };
}

function makeEdge(
  source: string,
  target: string,
  overrides: Partial<ExplorerEdge> = {}
): ExplorerEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    relationshipType: 'calls',
    method: 'execute',
    evidence: 'test evidence',
    unresolved: false,
    ...overrides,
  };
}

describe('Wave 4B Layout Evaluator & Objective Metrics', () => {
  it('A. No crossings: returns edgeCrossingCount = 0 for non-intersecting edges', () => {
    const nodes = [
      makeNode('N1'),
      makeNode('N2'),
      makeNode('N3'),
      makeNode('N4'),
    ];
    const edges = [
      makeEdge('N1', 'N2'),
      makeEdge('N3', 'N4'),
    ];
    const positions: PositionMap = {
      N1: { x: 0, y: 0 },
      N2: { x: 0, y: 100 },
      N3: { x: 100, y: 0 },
      N4: { x: 100, y: 100 },
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.edgeCrossingCount).toBe(0);
  });

  it('B. Known crossing: identifies exact crossing count for X-shaped edges', () => {
    const nodes = [
      makeNode('N1'),
      makeNode('N2'),
      makeNode('N3'),
      makeNode('N4'),
    ];
    const edges = [
      makeEdge('N1', 'N4'), // (0,0) -> (100,100)
      makeEdge('N2', 'N3'), // (0,100) -> (100,0)
    ];
    const positions: PositionMap = {
      N1: { x: 0, y: 0 },
      N2: { x: 0, y: 100 },
      N3: { x: 100, y: 0 },
      N4: { x: 100, y: 100 },
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.edgeCrossingCount).toBe(1);
  });

  it('C. Shared endpoint: edges sharing a node do not count as crossing', () => {
    const nodes = [
      makeNode('Hub'),
      makeNode('TargetA'),
      makeNode('TargetB'),
    ];
    const edges = [
      makeEdge('Hub', 'TargetA'),
      makeEdge('Hub', 'TargetB'),
    ];
    const positions: PositionMap = {
      Hub: { x: 50, y: 50 },
      TargetA: { x: 0, y: 100 },
      TargetB: { x: 100, y: 100 },
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.edgeCrossingCount).toBe(0);
  });

  it('D. Known overlap: measures exact node bounding box overlap count', () => {
    const nodes = [
      makeNode('N1'),
      makeNode('N2'),
      makeNode('N3'),
    ];
    const edges: ExplorerEdge[] = [];
    // Node default dimensions: 120 width x 60 height
    const positions: PositionMap = {
      N1: { x: 0, y: 0 },
      N2: { x: 30, y: 20 }, // Overlaps with N1
      N3: { x: 500, y: 500 }, // Far away, no overlap
    };

    const metrics = evaluateLayout(nodes, edges, positions, { nodeWidth: 120, nodeHeight: 60 });
    expect(metrics.nodeOverlapCount).toBe(1);
  });

  it('E. Edge lengths: computes exact average, median, and max edge length', () => {
    const nodes = [
      makeNode('A'),
      makeNode('B'),
      makeNode('C'),
      makeNode('D'),
    ];
    // Edge A->B: dist = 100
    // Edge B->C: dist = 200
    // Edge C->D: dist = 300
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('B', 'C'),
      makeEdge('C', 'D'),
    ];
    const positions: PositionMap = {
      A: { x: 0, y: 0 },
      B: { x: 100, y: 0 },
      C: { x: 300, y: 0 },
      D: { x: 600, y: 0 },
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.averageEdgeLength).toBe(200);
    expect(metrics.medianEdgeLength).toBe(200);
    expect(metrics.maxEdgeLength).toBe(300);
  });

  it('F. Layer violation: measures backward cross-layer edges correctly', () => {
    const nodes = [
      makeNode('View', 'LWC'), // Presentation (0)
      makeNode('AppService', 'ApexClass', { displayName: 'AppService' }), // Application (1)
      makeNode('DomainObj', 'ApexClass', { displayName: 'DomainSelector' }), // Domain (2)
      makeNode('CustomDb', 'CustomObject'), // Schema (3)
    ];
    const edges = [
      makeEdge('View', 'AppService'), // Presentation -> Application (Valid, top-down)
      makeEdge('CustomDb', 'View'), // Schema -> Presentation (VIOLATION, bottom-up)
    ];
    const positions: PositionMap = {
      View: { x: 0, y: 100 },
      AppService: { x: 0, y: 350 },
      DomainObj: { x: 0, y: 600 },
      CustomDb: { x: 0, y: 850 },
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.layerViolationCount).toBe(1);
    expect(metrics.layerViolationEdges).toEqual([
      { source: 'CustomDb', target: 'View' },
    ]);
  });

  it('G. Domain cohesion: computes domain intra-distance metrics', () => {
    const nodes = [
      makeNode('OrderService', 'ApexClass', { displayName: 'OrderService' }),
      makeNode('OrderController', 'ApexClass', { displayName: 'OrderController' }),
      makeNode('PaymentService', 'ApexClass', { displayName: 'PaymentService' }),
      makeNode('PaymentController', 'ApexClass', { displayName: 'PaymentController' }),
    ];
    const edges: ExplorerEdge[] = [];
    const positions: PositionMap = {
      OrderService: { x: 100, y: 100 },
      OrderController: { x: 150, y: 100 }, // Dist = 50
      PaymentService: { x: 800, y: 800 },
      PaymentController: { x: 800, y: 900 }, // Dist = 100
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.domainCohesion.domainDistances.Order).toBe(50);
    expect(metrics.domainCohesion.domainDistances.Payment).toBe(100);
    expect(metrics.domainCohesion.averageIntraDomainDistance).toBe(75);
    expect(metrics.domainCohesion.domainCohesionScore).toBeGreaterThan(0);
    expect(metrics.domainCohesion.domainCohesionScore).toBeLessThanOrEqual(1.0);
  });

  it('H. Component separation: evaluates disconnected subgraph clearances', () => {
    const nodes = [
      makeNode('C1_A'),
      makeNode('C1_B'),
      makeNode('C2_A'),
      makeNode('C2_B'),
    ];
    const edges = [
      makeEdge('C1_A', 'C1_B'),
      makeEdge('C2_A', 'C2_B'),
    ];
    const positions: PositionMap = {
      C1_A: { x: 0, y: 0 },
      C1_B: { x: 50, y: 0 },
      C2_A: { x: 100, y: 0 }, // Very close to Component 1
      C2_B: { x: 150, y: 0 },
    };

    const metrics = evaluateLayout(nodes, edges, positions, {
      nodeWidth: 120,
      nodeHeight: 60,
      minComponentGap: 200,
    });

    expect(metrics.componentSeparation.overlappingComponentPairs).toBeGreaterThan(0);
    expect(metrics.componentSeparation.gapViolationCount).toBeGreaterThanOrEqual(0);
  });

  it('I. Hub locality: measures distance from high-degree hub to neighbors', () => {
    const nodes = [
      makeNode('HubNode'),
      makeNode('N1'),
      makeNode('N2'),
      makeNode('N3'),
      makeNode('N4'),
    ];
    const edges = [
      makeEdge('HubNode', 'N1'),
      makeEdge('HubNode', 'N2'),
      makeEdge('HubNode', 'N3'),
      makeEdge('HubNode', 'N4'),
    ];
    const positions: PositionMap = {
      HubNode: { x: 100, y: 100 },
      N1: { x: 100, y: 0 },   // dist 100
      N2: { x: 100, y: 200 }, // dist 100
      N3: { x: 0, y: 100 },   // dist 100
      N4: { x: 200, y: 100 }, // dist 100
    };

    const metrics = evaluateLayout(nodes, edges, positions, { hubDegreeThreshold: 4 });
    expect(metrics.hubLocality.hubCount).toBe(1);
    expect(metrics.hubLocality.averageHubNeighborDistance).toBe(100);
  });

  it('J. Bridge locality: measures bridge distance to connected domain centroids', () => {
    const nodes = [
      makeNode('OrderService', 'ApexClass', { displayName: 'OrderService' }),
      makeNode('PaymentService', 'ApexClass', { displayName: 'PaymentService' }),
      makeNode('BridgeController', 'ApexClass', { displayName: 'SharedBridge' }),
    ];
    const edges = [
      makeEdge('BridgeController', 'OrderService'),
      makeEdge('BridgeController', 'PaymentService'),
    ];
    const positions: PositionMap = {
      OrderService: { x: 0, y: 0 },
      PaymentService: { x: 200, y: 0 },
      BridgeController: { x: 100, y: 0 }, // Positioned exactly at centroid (100, 0)
    };

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.bridgeLocality.bridgeCount).toBe(1);
    expect(metrics.bridgeLocality.averageBridgeToDomainCentroidDistance).toBe(0);
  });

  it('K. Satellite locality: evaluates test, field, and trigger-handler distances', () => {
    const nodes = [
      makeNode('AccountService', 'ApexClass', { displayName: 'AccountService' }),
      makeNode('AccountServiceTest', 'ApexClass', {
        displayName: 'AccountServiceTest',
        behavior: {
          isTest: true,
          soqlCount: 0,
          dmlCount: 0,
        },
      }),
      makeNode('Account', 'CustomObject'),
      makeNode('Account.Active__c', 'CustomField'),
      makeNode('AccountTrigger', 'ApexTrigger'),
      makeNode('AccountTriggerHandler', 'ApexClass', { displayName: 'AccountTriggerHandler' }),
    ];

    const edges = [
      makeEdge('AccountServiceTest', 'AccountService'),
      makeEdge('Account.Active__c', 'Account'),
      makeEdge('AccountTrigger', 'AccountTriggerHandler'),
    ];

    const positions: PositionMap = {
      AccountService: { x: 0, y: 0 },
      AccountServiceTest: { x: 100, y: 0 }, // dist = 100
      Account: { x: 0, y: 500 },
      'Account.Active__c': { x: 0, y: 550 }, // dist = 50
      AccountTrigger: { x: 200, y: 200 },
      AccountTriggerHandler: { x: 200, y: 300 }, // dist = 100
    };

    const sat = evaluateSatelliteLocality(nodes, edges, positions);
    expect(sat.averageTestToTargetDistance).toBe(100);
    expect(sat.testDistances['AccountServiceTest']).toBe(100);

    expect(sat.averageFieldToObjectDistance).toBe(50);
    expect(sat.fieldDistances['Account.Active__c']).toBe(50);

    expect(sat.averageTriggerToHandlerDistance).toBe(100);
    expect(sat.triggerHandlerDistances['AccountTrigger->AccountTriggerHandler']).toBe(100);
  });

  it('L. Determinism: identical input graph & positions produce identical metrics', () => {
    const fixture = createScale100PlusFixture();
    const positions: PositionMap = {};
    fixture.nodes.forEach((n, idx) => {
      positions[n.id] = { x: (idx % 10) * 100, y: Math.floor(idx / 10) * 100 };
    });

    const eval1 = evaluateLayout(fixture.nodes, fixture.edges, positions);
    const eval2 = evaluateLayout(fixture.nodes, fixture.edges, positions);

    expect(eval1).toEqual(eval2);
  });

  it('M. Baseline comparison: provides raw metric deltas without interpretation', () => {
    const beforeMetrics = evaluateLayout(
      [makeNode('A'), makeNode('B')],
      [makeEdge('A', 'B')],
      { A: { x: 0, y: 0 }, B: { x: 200, y: 0 } }
    );

    const afterMetrics = evaluateLayout(
      [makeNode('A'), makeNode('B')],
      [makeEdge('A', 'B')],
      { A: { x: 0, y: 0 }, B: { x: 300, y: 0 } }
    );

    const comparison = compareLayoutMetrics(beforeMetrics, afterMetrics);

    expect(comparison.averageEdgeLengthDelta).toBe(100); // 300 - 200 = 100
    expect(comparison.maxEdgeLengthDelta).toBe(100);
    expect(comparison.edgeCrossingCountDelta).toBe(0);
    expect(comparison.nodeOverlapCountDelta).toBe(0);
  });

  it('N. Large graph fixture: benchmark 100+ node fixture evaluates deterministically & fast', () => {
    const fixture = createScale100PlusFixture();
    expect(fixture.nodes.length).toBeGreaterThanOrEqual(100);

    const positions: PositionMap = {};
    fixture.nodes.forEach((n, idx) => {
      positions[n.id] = { x: (idx % 15) * 120, y: Math.floor(idx / 15) * 100 };
    });

    const startTime = performance.now();
    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    const duration = performance.now() - startTime;

    expect(metrics.averageEdgeLength).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Must complete within 1 second
  });
});

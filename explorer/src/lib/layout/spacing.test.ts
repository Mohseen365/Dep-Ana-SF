import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import { computeArchitectureAnalysis } from './analysis';
import { resolveSpacingAndCollisions } from './spacing';
import { nodeOverlapCount } from './metrics';

function makeNode(
  id: string,
  type: ExplorerNodeType = 'ApexClass',
  displayName?: string,
  fanIn = 0,
  fanOut = 0
): ExplorerNode {
  const name = displayName || id;
  return {
    id,
    displayName: name,
    type,
    file: `classes/${name}.cls`,
    metrics: { fanIn, fanOut, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: /(?:test|tests)$/i.test(name),
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

function makeEdge(source: string, target: string): ExplorerEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    relationshipType: 'method-call',
    method: null,
    evidence: 'test-evidence',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: null,
    file: 'test-file.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: { line: 1, column: 1 },
    },
  };
}

describe('spacing.ts — Wave 4A Geometric Cleanup & Spacing Engine', () => {
  it('A. No collision: input with valid spacing leaves positions unchanged', () => {
    const nodeA = makeNode('AccountService');
    const nodeB = makeNode('ContactService');
    const nodes = [nodeA, nodeB];
    const positions = {
      AccountService: { x: 100, y: 100 },
      ContactService: { x: 500, y: 500 },
    };

    const result = resolveSpacingAndCollisions({ nodes, positions });

    expect(result.initialOverlapCount).toBe(0);
    expect(result.finalOverlapCount).toBe(0);
    expect(result.iterations).toBe(0);
    expect(result.maxDisplacement).toBe(0);
    expect(result.positions['AccountService']).toEqual({ x: 100, y: 100 });
    expect(result.positions['ContactService']).toEqual({ x: 500, y: 500 });
  });

  it('B. Exact overlap: multiple nodes starting at exact same coordinate resolve deterministically', () => {
    const node1 = makeNode('Node1');
    const node2 = makeNode('Node2');
    const node3 = makeNode('Node3');
    const nodes = [node1, node2, node3];
    const positions = {
      Node1: { x: 300, y: 300 },
      Node2: { x: 300, y: 300 },
      Node3: { x: 300, y: 300 },
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      positions,
      options: { nodeWidth: 120, nodeHeight: 60, horizontalGap: 40, verticalGap: 40 },
    });

    expect(result.initialOverlapCount).toBeGreaterThan(0);
    expect(result.finalOverlapCount).toBe(0);

    const overlaps = nodeOverlapCount(nodes, [], result.positions, { nodeWidth: 120, nodeHeight: 60 });
    expect(overlaps).toBe(0);

    // Verify positions are distinct
    const p1 = result.positions['Node1'];
    const p2 = result.positions['Node2'];
    const p3 = result.positions['Node3'];
    expect(p1).not.toEqual(p2);
    expect(p2).not.toEqual(p3);
    expect(p1).not.toEqual(p3);
  });

  it('C. Partial overlap: collision resolved and minimum gap preserved', () => {
    const nodeA = makeNode('OrderService');
    const nodeB = makeNode('PaymentService');
    const nodes = [nodeA, nodeB];
    // Required clearance: width(120) + horizGap(40) = 160, height(60) + vertGap(40) = 100
    const positions = {
      OrderService: { x: 200, y: 200 },
      PaymentService: { x: 250, y: 220 }, // dx=50 < 160, dy=20 < 100
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      positions,
      options: { nodeWidth: 120, nodeHeight: 60, horizontalGap: 40, verticalGap: 40 },
    });

    expect(result.finalOverlapCount).toBe(0);

    const pA = result.positions['OrderService'];
    const pB = result.positions['PaymentService'];
    const dx = Math.abs(pA.x - pB.x);
    const dy = Math.abs(pA.y - pB.y);

    // At least one axis must satisfy minimum clearance gap
    expect(dx >= 160 - 1e-4 || dy >= 100 - 1e-4).toBe(true);
  });

  it('D. Dense cluster: 10+ overlapping nodes resolved within bounded iterations', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => makeNode(`ClusterNode_${i}`));
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, idx) => {
      positions[n.id] = { x: 400 + (idx % 3) * 10, y: 400 + Math.floor(idx / 3) * 10 };
    });

    const result = resolveSpacingAndCollisions({
      nodes,
      positions,
      options: { nodeWidth: 100, nodeHeight: 50, horizontalGap: 20, verticalGap: 20, maxIterations: 50 },
    });

    expect(result.finalOverlapCount).toBe(0);
    expect(result.iterations).toBeLessThanOrEqual(50);

    const overlaps = nodeOverlapCount(nodes, [], result.positions, { nodeWidth: 100, nodeHeight: 50 });
    expect(overlaps).toBe(0);
  });

  it('E. Hub preservation: hub node absorbs less displacement than ordinary node', () => {
    const hub = makeNode('CentralHub', 'ApexClass', 'CentralHub', 10, 10);
    const ordinary = makeNode('LeafNode', 'ApexClass', 'LeafNode', 0, 0);
    const nodes = [hub, ordinary];
    const positions = {
      CentralHub: { x: 300, y: 300 },
      LeafNode: { x: 320, y: 320 },
    };

    const result = resolveSpacingAndCollisions({ nodes, positions });

    const initHub = positions['CentralHub'];
    const initOrd = positions['LeafNode'];
    const finalHub = result.positions['CentralHub'];
    const finalOrd = result.positions['LeafNode'];

    const hubDisplacement = Math.sqrt(Math.pow(finalHub.x - initHub.x, 2) + Math.pow(finalHub.y - initHub.y, 2));
    const ordDisplacement = Math.sqrt(Math.pow(finalOrd.x - initOrd.x, 2) + Math.pow(finalOrd.y - initOrd.y, 2));

    expect(hubDisplacement).toBeLessThan(ordDisplacement);
  });

  it('F. Bridge preservation: bridge node absorbs less displacement than ordinary node', () => {
    const bridge = makeNode('OrderPaymentBridge', 'ApexClass', 'OrderPaymentBridge');
    const ord = makeNode('OrdinaryHelper', 'ApexClass', 'OrdinaryHelper');

    // Bridge connects two distinct domain classes
    const dom1 = makeNode('OrderService', 'ApexClass', 'OrderService');
    const dom2 = makeNode('PaymentProcessor', 'ApexClass', 'PaymentProcessor');

    const nodes = [dom1, dom2, bridge, ord];
    const edges = [
      makeEdge('OrderPaymentBridge', 'OrderService'),
      makeEdge('OrderPaymentBridge', 'PaymentProcessor'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const positions = {
      OrderService: { x: 100, y: 350 },
      PaymentProcessor: { x: 800, y: 350 },
      OrderPaymentBridge: { x: 400, y: 350 },
      OrdinaryHelper: { x: 420, y: 350 },
    };

    const result = resolveSpacingAndCollisions({ nodes, edges, analysis, positions });

    const initBridge = positions['OrderPaymentBridge'];
    const initOrd = positions['OrdinaryHelper'];
    const finalBridge = result.positions['OrderPaymentBridge'];
    const finalOrd = result.positions['OrdinaryHelper'];

    const bridgeDisp = Math.sqrt(Math.pow(finalBridge.x - initBridge.x, 2) + Math.pow(finalBridge.y - initBridge.y, 2));
    const ordDisp = Math.sqrt(Math.pow(finalOrd.x - initOrd.x, 2) + Math.pow(finalOrd.y - initOrd.y, 2));

    expect(bridgeDisp).toBeLessThan(ordDisp);
  });

  it('G. Satellite preservation: tests and fields remain close to target parent node', () => {
    const prod = makeNode('AccountService');
    const test = makeNode('AccountServiceTest');
    const obj = makeNode('Account', 'Object', 'Account');
    const field = makeNode('Account.Name', 'Field', 'Name');

    const nodes = [prod, test, obj, field];
    const edges = [
      makeEdge('AccountServiceTest', 'AccountService'),
      makeEdge('Account.Name', 'Account'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const positions = {
      AccountService: { x: 200, y: 350 },
      AccountServiceTest: { x: 210, y: 350 }, // Overlaps prod
      Account: { x: 200, y: 850 },
      'Account.Name': { x: 210, y: 850 }, // Overlaps object
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      edges,
      analysis,
      positions,
      options: { maxSatelliteDistance: 250 },
    });

    const posProd = result.positions['AccountService'];
    const posTest = result.positions['AccountServiceTest'];
    const posObj = result.positions['Account'];
    const posField = result.positions['Account.Name'];

    const testDist = Math.sqrt(Math.pow(posTest.x - posProd.x, 2) + Math.pow(posTest.y - posProd.y, 2));
    const fieldDist = Math.sqrt(Math.pow(posField.x - posObj.x, 2) + Math.pow(posField.y - posObj.y, 2));

    expect(testDist).toBeLessThanOrEqual(250);
    expect(fieldDist).toBeLessThanOrEqual(250);
  });

  it('H. Layer preservation: collision resolution does not shift node outside layer bounds', () => {
    const appNode1 = makeNode('AppService1');
    const appNode2 = makeNode('AppService2');
    const nodes = [appNode1, appNode2];
    const positions = {
      AppService1: { x: 300, y: 350 },
      AppService2: { x: 300, y: 360 },
    };

    const layerBounds = {
      application: { yMin: 300, yMax: 450 },
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      positions,
      options: { layerBounds },
    });

    expect(result.positions['AppService1'].y).toBeGreaterThanOrEqual(300);
    expect(result.positions['AppService1'].y).toBeLessThanOrEqual(450);
    expect(result.positions['AppService2'].y).toBeGreaterThanOrEqual(300);
    expect(result.positions['AppService2'].y).toBeLessThanOrEqual(450);
  });

  it('I. Domain preservation: collision resolution respects domain boundary constraints', () => {
    const node1 = makeNode('BillingService');
    const node2 = makeNode('BillingHelper');
    const nodes = [node1, node2];
    const positions = {
      BillingService: { x: 200, y: 350 },
      BillingHelper: { x: 210, y: 350 },
    };

    const domainBounds = {
      Billing: { xMin: 150, xMax: 350 },
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      positions,
      options: { domainBounds, domainMap: { BillingService: 'Billing', BillingHelper: 'Billing' } },
    });

    expect(result.positions['BillingService'].x).toBeGreaterThanOrEqual(150);
    expect(result.positions['BillingService'].x).toBeLessThanOrEqual(350);
    expect(result.positions['BillingHelper'].x).toBeGreaterThanOrEqual(150);
    expect(result.positions['BillingHelper'].x).toBeLessThanOrEqual(350);
  });

  it('J. Component preservation: disconnected components remain within their component bounds', () => {
    const c1Node = makeNode('Comp1Class');
    const c2Node = makeNode('Comp2Class');
    const nodes = [c1Node, c2Node];
    const positions = {
      Comp1Class: { x: 200, y: 200 },
      Comp2Class: { x: 210, y: 200 },
    };

    const analysis = computeArchitectureAnalysis(nodes, []);
    const componentBounds = {
      0: { xMin: 0, xMax: 400, yMin: 0, yMax: 500 },
      1: { xMin: 500, xMax: 900, yMin: 0, yMax: 500 },
    };

    const result = resolveSpacingAndCollisions({
      nodes,
      analysis,
      positions,
      options: { componentBounds },
    });

    const pos1 = result.positions['Comp1Class'];
    const pos2 = result.positions['Comp2Class'];

    expect(pos1.x).toBeGreaterThanOrEqual(0);
    expect(pos1.x).toBeLessThanOrEqual(400);
    expect(pos2.x).toBeGreaterThanOrEqual(500);
    expect(pos2.x).toBeLessThanOrEqual(900);
  });

  it('K. Determinism: identical input produces identical coordinates across multiple runs', () => {
    const nodeA = makeNode('AlphaService');
    const nodeB = makeNode('BetaService');
    const nodeC = makeNode('GammaService');
    const nodes = [nodeA, nodeB, nodeC];
    const positions = {
      AlphaService: { x: 300, y: 300 },
      BetaService: { x: 310, y: 305 },
      GammaService: { x: 295, y: 315 },
    };

    const run1 = resolveSpacingAndCollisions({ nodes, positions });
    const run2 = resolveSpacingAndCollisions({ nodes, positions });
    const run3 = resolveSpacingAndCollisions({ nodes, positions });

    expect(run1.positions).toEqual(run2.positions);
    expect(run2.positions).toEqual(run3.positions);
  });

  it('L. Large graph: 100+ node fixture resolves deterministically within bounded iterations', () => {
    const nodes: ExplorerNode[] = [];
    const edges: ExplorerEdge[] = [];
    const positions: Record<string, { x: number; y: number }> = {};

    // Generate 120 nodes in 4 layers x 3 domains
    const domains = ['Order', 'Payment', 'Customer'];
    const layers = ['controller', 'service', 'selector', 'object'];

    let counter = 0;
    domains.forEach((dom, dIdx) => {
      layers.forEach((lay, lIdx) => {
        for (let i = 0; i < 10; i++) {
          const id = `${dom}_${lay}_${i}`;
          const type: ExplorerNodeType = lay === 'object' ? 'Object' : 'ApexClass';
          nodes.push(makeNode(id, type, id));

          // Deliberately introduce overlapping grid clusters
          positions[id] = {
            x: 100 + dIdx * 350 + (i % 3) * 15,
            y: 100 + lIdx * 250 + Math.floor(i / 3) * 15,
          };
          counter++;
        }
      });
    });

    expect(nodes.length).toBe(120);

    const startTime = Date.now();
    const result = resolveSpacingAndCollisions({
      nodes,
      edges,
      positions,
      options: { nodeWidth: 120, nodeHeight: 60, horizontalGap: 30, verticalGap: 30, maxIterations: 50 },
    });
    const duration = Date.now() - startTime;

    expect(result.finalOverlapCount).toBe(0);
    expect(result.iterations).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(1000); // Must resolve fast under 1 second

    const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
    expect(overlaps).toBe(0);
  });
});

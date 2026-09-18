import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureAnalysis } from './analysis';
import { placeSatellites } from './satellites';
import { nodeOverlapCount, calculateLayoutMetrics } from './metrics';

function makeNode(id: string, type: ExplorerNode['type'] = 'ApexClass', displayName?: string): ExplorerNode {
  return {
    id,
    displayName: displayName || id,
    type,
    file: type === 'ApexClass' ? `classes/${displayName || id}.cls` : undefined,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: /(?:test|tests)$/i.test(displayName || id),
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
    label: 'depends_on',
  };
}

describe('satellites.ts - Test / Field / Trigger Satellite Layout Engine', () => {
  it('1. One production node + one test: verifies proximity and target anchor alignment', () => {
    const prod = makeNode('OrderService');
    const test = makeNode('OrderServiceTest');
    const nodes = [prod, test];
    const edges = [makeEdge('OrderServiceTest', 'OrderService')];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = { OrderService: { x: 300, y: 350 } };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(result.placedTestsCount).toBe(1);
    expect(result.positions['OrderService']).toEqual({ x: 300, y: 350 }); // Primary unmoved

    const testPos = result.positions['OrderServiceTest'];
    expect(testPos).toBeDefined();
    // Test should be placed to the right of target (x > 300, close y)
    expect(testPos.x).toBeGreaterThan(300);
    expect(Math.abs(testPos.y - 350)).toBeLessThan(50);
  });

  it('2. One production node + many tests: verifies compact test cluster', () => {
    const prod = makeNode('PaymentService');
    const test1 = makeNode('PaymentServiceTest');
    const test2 = makeNode('PaymentServiceMockTest');
    const test3 = makeNode('PaymentServiceUnitTest');
    const nodes = [prod, test1, test2, test3];
    const edges = [
      makeEdge('PaymentServiceTest', 'PaymentService'),
      makeEdge('PaymentServiceMockTest', 'PaymentService'),
      makeEdge('PaymentServiceUnitTest', 'PaymentService'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = { PaymentService: { x: 500, y: 350 } };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(result.placedTestsCount).toBe(3);
    // Primary remains anchor
    expect(result.positions['PaymentService']).toEqual({ x: 500, y: 350 });

    const p1 = result.positions['PaymentServiceTest'];
    const p2 = result.positions['PaymentServiceMockTest'];
    const p3 = result.positions['PaymentServiceUnitTest'];

    // Verify all tests are placed near anchor
    [p1, p2, p3].forEach(p => {
      expect(p.x).toBeGreaterThan(500);
      expect(Math.abs(p.y - 350)).toBeLessThan(150);
    });

    // Check no overlap among tests
    const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
    expect(overlaps).toBe(0);
  });

  it('3. Multiple production nodes + tests: verifies correct target association', () => {
    const prodA = makeNode('AccountService');
    const testA = makeNode('AccountServiceTest');
    const prodB = makeNode('ContactService');
    const testB = makeNode('ContactServiceTest');

    const nodes = [prodA, testA, prodB, testB];
    const edges = [
      makeEdge('AccountServiceTest', 'AccountService'),
      makeEdge('ContactServiceTest', 'ContactService'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {
      AccountService: { x: 100, y: 350 },
      ContactService: { x: 800, y: 350 },
    };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    const posTestA = result.positions['AccountServiceTest'];
    const posTestB = result.positions['ContactServiceTest'];

    // TestA should be anchored around AccountService (x ~ 230)
    expect(Math.abs(posTestA.x - 100)).toBeLessThan(250);
    // TestB should be anchored around ContactService (x ~ 930)
    expect(Math.abs(posTestB.x - 800)).toBeLessThan(250);
  });

  it('4. One object + many fields: verifies field cluster locality', () => {
    const account = makeNode('Account', 'Object', 'Account');
    const field1 = makeNode('Account.Name', 'Field', 'Name');
    const field2 = makeNode('Account.Phone', 'Field', 'Phone');
    const field3 = makeNode('Account.Industry', 'Field', 'Industry');
    const field4 = makeNode('Account.Rating', 'Field', 'Rating');

    const nodes = [account, field1, field2, field3, field4];
    const edges = [
      makeEdge('Account.Name', 'Account'),
      makeEdge('Account.Phone', 'Account'),
      makeEdge('Account.Industry', 'Account'),
      makeEdge('Account.Rating', 'Account'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = { Account: { x: 400, y: 850 } };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(result.placedFieldsCount).toBe(4);
    expect(result.positions['Account']).toEqual({ x: 400, y: 850 });

    const f1 = result.positions['Account.Name'];
    const f2 = result.positions['Account.Phone'];
    const f3 = result.positions['Account.Industry'];
    const f4 = result.positions['Account.Rating'];

    // Fields should be placed directly below account (y > 850)
    [f1, f2, f3, f4].forEach(f => {
      expect(f.y).toBeGreaterThan(850);
      expect(Math.abs(f.x - 400)).toBeLessThan(300);
    });

    const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 100, nodeHeight: 40 });
    expect(overlaps).toBe(0);
  });

  it('5. Multiple objects + fields: verifies fields do not cross into unrelated objects', () => {
    const objA = makeNode('Account', 'Object', 'Account');
    const fA1 = makeNode('Account.Name', 'Field', 'Name');

    const objB = makeNode('Opportunity', 'Object', 'Opportunity');
    const fB1 = makeNode('Opportunity.Amount', 'Field', 'Amount');

    const nodes = [objA, fA1, objB, fB1];
    const edges = [makeEdge('Account.Name', 'Account'), makeEdge('Opportunity.Amount', 'Opportunity')];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {
      Account: { x: 100, y: 850 },
      Opportunity: { x: 900, y: 850 },
    };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    const posFA = result.positions['Account.Name'];
    const posFB = result.positions['Opportunity.Amount'];

    expect(Math.abs(posFA.x - 100)).toBeLessThan(200);
    expect(Math.abs(posFB.x - 900)).toBeLessThan(200);
  });

  it('6. Trigger + handler: verifies local relationship', () => {
    const account = makeNode('Account', 'Object', 'Account');
    const trigger = makeNode('AccountTrigger', 'ApexTrigger');
    const handler = makeNode('AccountTriggerHandler', 'ApexClass');

    const nodes = [account, trigger, handler];
    const edges = [
      makeEdge('AccountTrigger', 'Account'),
      makeEdge('AccountTrigger', 'AccountTriggerHandler'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = { Account: { x: 400, y: 850 } };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(result.placedMicroclusterCount).toBeGreaterThanOrEqual(2);

    const trigPos = result.positions['AccountTrigger'];
    const handPos = result.positions['AccountTriggerHandler'];

    expect(trigPos).toBeDefined();
    expect(handPos).toBeDefined();
    // Trigger and handler should be close to each other
    const dist = Math.sqrt(Math.pow(trigPos.x - handPos.x, 2) + Math.pow(trigPos.y - handPos.y, 2));
    expect(dist).toBeLessThan(300);
  });

  it('7. Trigger + handler + service: verifies microcluster coherence', () => {
    const account = makeNode('Account', 'Object', 'Account');
    const trigger = makeNode('AccountTrigger', 'ApexTrigger');
    const handler = makeNode('AccountTriggerHandler', 'ApexClass');
    const service = makeNode('AccountService', 'ApexClass');

    const nodes = [account, trigger, handler, service];
    const edges = [
      makeEdge('AccountTrigger', 'Account'),
      makeEdge('AccountTrigger', 'AccountTriggerHandler'),
      makeEdge('AccountTriggerHandler', 'AccountService'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {
      Account: { x: 400, y: 850 },
      AccountService: { x: 400, y: 350 },
    };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    const handPos = result.positions['AccountTriggerHandler'];
    expect(handPos).toBeDefined();
    // Handler should sit coherently near application layer
    expect(handPos.y).toBeGreaterThanOrEqual(350);
    expect(handPos.y).toBeLessThanOrEqual(850);
  });

  it('8. Missing test target: verifies deterministic fallback', () => {
    const orphanTest = makeNode('OrphanServiceTest', 'ApexClass');
    const nodes = [orphanTest];
    const edges: ExplorerEdge[] = [];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {};

    const result = placeSatellites(nodes, edges, analysis, primaryPositions, { defaultDomainX: 200 });

    expect(result.placedTestsCount).toBe(1);
    const pos = result.positions['OrphanServiceTest'];
    expect(pos).toBeDefined();
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });

  it('9. Missing field parent: verifies deterministic fallback', () => {
    const orphanField = makeNode('CustomObj.OrphanField', 'Field', 'OrphanField');
    const nodes = [orphanField];
    const edges: ExplorerEdge[] = [];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {};

    const result = placeSatellites(nodes, edges, analysis, primaryPositions, { defaultDomainX: 200 });

    expect(result.placedFieldsCount).toBe(1);
    const pos = result.positions['CustomObj.OrphanField'];
    expect(pos).toBeDefined();
    expect(pos.y).toBeGreaterThanOrEqual(850); // Schema fallback layer
  });

  it('10. Dense satellite case: verifies no uncontrolled overlap', () => {
    const prod = makeNode('OrderService');
    const tests = Array.from({ length: 8 }, (_, i) => makeNode(`OrderService${i}Test`));

    const obj = makeNode('Order__c', 'Object', 'Order__c');
    const fields = Array.from({ length: 10 }, (_, i) => makeNode(`Order__c.Field_${i}`, 'Field', `Field_${i}`));

    const nodes = [prod, ...tests, obj, ...fields];
    const edges: ExplorerEdge[] = [
      ...tests.map(t => makeEdge(t.id, prod.id)),
      ...fields.map(f => makeEdge(f.id, obj.id)),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {
      OrderService: { x: 300, y: 350 },
      Order__c: { x: 300, y: 850 },
    };

    const result = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(result.placedTestsCount).toBe(8);
    expect(result.placedFieldsCount).toBe(10);

    const metrics = calculateLayoutMetrics(nodes, edges, result.positions, { nodeWidth: 100, nodeHeight: 40 });
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('11. Determinism: run the same graph repeatedly and verify identical positions', () => {
    const prod = makeNode('OrderService');
    const testA = makeNode('OrderServiceTestA');
    const testB = makeNode('OrderServiceTestB');
    const obj = makeNode('Order__c', 'Object', 'Order__c');
    const fieldA = makeNode('Order__c.Status', 'Field', 'Status');

    const nodes = [prod, testA, testB, obj, fieldA];
    const edges = [
      makeEdge('OrderServiceTestA', 'OrderService'),
      makeEdge('OrderServiceTestB', 'OrderService'),
      makeEdge('Order__c.Status', 'Order__c'),
    ];

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const primaryPositions = {
      OrderService: { x: 200, y: 350 },
      Order__c: { x: 200, y: 850 },
    };

    const run1 = placeSatellites(nodes, edges, analysis, primaryPositions);
    const run2 = placeSatellites(nodes, edges, analysis, primaryPositions);
    const run3 = placeSatellites(nodes, edges, analysis, primaryPositions);

    expect(run1.positions).toEqual(run2.positions);
    expect(run2.positions).toEqual(run3.positions);
  });
});

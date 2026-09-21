import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureAnalysis } from './analysis';
import { placeSatellites } from './satellites';
import { nodeOverlapCount, calculateLayoutMetrics } from './metrics';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { createFieldHeavyFixture } from './fixtures/field-heavy';
import { createTestHeavyFixture } from './fixtures/test-heavy';

function makeNode(id: string, type: ExplorerNode['type'] = 'ApexClass', displayName?: string): ExplorerNode {
  const name = displayName || id;
  return {
    id,
    displayName: name,
    type,
    file: type === 'ApexClass' ? `classes/${name}.cls` : '',
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: /(?:test|tests)/i.test(name),
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
    relationshipType: 'type-reference',
    method: null,
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: 1,
    column: 1,
    methodOwner: source,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source, method: null },
      target: { type: 'ApexClass', name: target, method: null },
      relationship: { type: 'type-reference', resolution: 'EXACT' },
      location: { line: 1, column: 1 },
    },
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
    expect(result.positions['OrderService']).toEqual({ x: 300, y: 350 });

    const testPos = result.positions['OrderServiceTest'];
    expect(testPos).toBeDefined();
    expect(testPos.x).toBeGreaterThan(300);
    expect(Math.abs(testPos.y - 350)).toBeLessThan(150);
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
    expect(result.positions['PaymentService']).toEqual({ x: 500, y: 350 });

    const p1 = result.positions['PaymentServiceTest'];
    const p2 = result.positions['PaymentServiceMockTest'];
    const p3 = result.positions['PaymentServiceUnitTest'];

    [p1, p2, p3].forEach(p => {
      expect(p.x).toBeGreaterThan(500);
      expect(Math.abs(p.y - 350)).toBeLessThan(250);
    });

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

    expect(Math.abs(posTestA.x - 100)).toBeLessThan(280);
    expect(Math.abs(posTestB.x - 800)).toBeLessThan(280);
  });

  it('4. One object + many fields: verifies field cluster locality', () => {
    const account = makeNode('Account', 'CustomObject', 'Account');
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

    [f1, f2, f3, f4].forEach(f => {
      expect(f.y).toBeGreaterThan(850);
      expect(Math.abs(f.x - 400)).toBeLessThan(300);
    });

    const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 100, nodeHeight: 40 });
    expect(overlaps).toBe(0);
  });

  it('5. Multiple objects + fields: verifies fields do not cross into unrelated objects', () => {
    const objA = makeNode('Account', 'CustomObject', 'Account');
    const fA1 = makeNode('Account.Name', 'Field', 'Name');

    const objB = makeNode('Opportunity', 'CustomObject', 'Opportunity');
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

    expect(Math.abs(posFA.x - 100)).toBeLessThan(250);
    expect(Math.abs(posFB.x - 900)).toBeLessThan(250);
  });

  it('6. Trigger + handler: verifies local relationship', () => {
    const account = makeNode('Account', 'CustomObject', 'Account');
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
    const dist = Math.sqrt(Math.pow(trigPos.x - handPos.x, 2) + Math.pow(trigPos.y - handPos.y, 2));
    expect(dist).toBeLessThan(350);
  });

  it('7. Trigger + handler + service: verifies microcluster coherence', () => {
    const account = makeNode('Account', 'CustomObject', 'Account');
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
    expect(pos.y).toBeGreaterThanOrEqual(850);
  });

  it('10. Dense satellite case: verifies no uncontrolled overlap', () => {
    const prod = makeNode('OrderService');
    const tests = Array.from({ length: 8 }, (_, i) => makeNode(`OrderService${i}Test`));

    const obj = makeNode('Order__c', 'CustomObject', 'Order__c');
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
    const obj = makeNode('Order__c', 'CustomObject', 'Order__c');
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

  describe('WAVE 3B — Satellite Geometry Optimization Tests', () => {
    it('Trigger anchor locality: trigger Y position is anchored relative to parent object position', () => {
      const account = makeNode('Account', 'CustomObject', 'Account');
      const trigger = makeNode('AccountTrigger', 'ApexTrigger');
      const nodes = [account, trigger];
      const edges = [makeEdge('AccountTrigger', 'Account')];

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = { Account: { x: 400, y: 850 } };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions);

      const trigPos = result.positions['AccountTrigger'];
      expect(trigPos).toBeDefined();
      expect(trigPos.x).toBe(400);
      expect(Math.abs(trigPos.y - 850)).toBeLessThan(150);
      expect(trigPos.y).toBe(750);
    });

    it('Mixed field and test satellites in single component: 0 overlaps and clear separation', () => {
      const service = makeNode('OrderService', 'ApexClass', 'OrderService');
      const tests = Array.from({ length: 5 }, (_, i) => makeNode(`OrderService_${i + 1}Test`, 'ApexClass', `OrderService_${i + 1}Test`));
      const obj = makeNode('Order__c', 'CustomObject', 'Order__c');
      const fields = Array.from({ length: 10 }, (_, i) => makeNode(`Order__c.Field_${i + 1}`, 'Field', `Field_${i + 1}`));

      const nodes = [service, ...tests, obj, ...fields];
      const edges = [
        ...tests.map(t => makeEdge(t.id, service.id)),
        ...fields.map(f => makeEdge(f.id, obj.id)),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = {
        OrderService: { x: 300, y: 350 },
        Order__c: { x: 300, y: 850 },
      };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions);

      expect(result.placedTestsCount).toBe(5);
      expect(result.placedFieldsCount).toBe(10);

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
      expect(overlaps).toBe(0);
    });

    it('50 fields aspect-ratio compaction: field grid forms a compact, well-proportioned shape under object', () => {
      const parentObj = makeNode('Account', 'CustomObject', 'Account');
      const fields = Array.from({ length: 50 }, (_, i) => makeNode(`Account.Field_${i + 1}`, 'Field', `Field_${i + 1}`));

      const nodes = [parentObj, ...fields];
      const edges = fields.map(f => makeEdge(f.id, parentObj.id));

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = { Account: { x: 400, y: 850 } };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions);

      const fieldKeys = fields.map(f => f.id);
      let minX = Infinity, maxX = -Infinity;
      fieldKeys.forEach(k => {
        const p = result.positions[k];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      });

      const clusterWidth = maxX - minX + 120;
      expect(clusterWidth).toBeLessThanOrEqual(1400);

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
      expect(overlaps).toBe(0);
    });

    it('50 tests aspect-ratio compaction: test cluster forms a compact side-anchored grid beside target', () => {
      const prod = makeNode('BillingService', 'ApexClass', 'BillingService');
      const tests = Array.from({ length: 50 }, (_, i) => makeNode(`BillingService_${i + 1}Test`, 'ApexClass', `BillingService_${i + 1}Test`));

      const nodes = [prod, ...tests];
      const edges = tests.map(t => makeEdge(t.id, prod.id));

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = { BillingService: { x: 300, y: 350 } };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions);

      const testKeys = tests.map(t => t.id);
      let minY = Infinity, maxY = -Infinity;
      testKeys.forEach(k => {
        const p = result.positions[k];
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      const clusterHeight = maxY - minY + 60;
      expect(clusterHeight).toBeLessThanOrEqual(1300);

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
      expect(overlaps).toBe(0);
    });
  });

  describe('WAVE 8B — Field Satellite Scalability Tests (1, 2, 4, 8, 16, 24, 50, 100 fields)', () => {
    [1, 2, 4, 8, 16, 24, 50, 100].forEach(count => {
      it(`places ${count} fields around a parent object with zero overlaps and unshifted parent`, () => {
        const parentObj = makeNode('Account', 'CustomObject', 'Account');
        const fields = Array.from({ length: count }, (_, i) =>
          makeNode(`Account.Field_${String(i + 1).padStart(3, '0')}`, 'Field', `Field_${i + 1}`)
        );

        const nodes = [parentObj, ...fields];
        const edges = fields.map(f => makeEdge(f.id, parentObj.id));

        const analysis = computeArchitectureAnalysis(nodes, edges);
        const primaryPositions = { Account: { x: 400, y: 850 } };

        const result = placeSatellites(nodes, edges, analysis, primaryPositions, {
          nodeWidth: 120,
          nodeHeight: 60,
        });

        expect(result.positions['Account']).toEqual({ x: 400, y: 850 });

        const fieldPositions = fields.map(f => result.positions[f.id]);
        expect(fieldPositions.length).toBe(count);

        const uniqueCoords = new Set(fieldPositions.map(p => `${p.x}:${p.y}`));
        expect(uniqueCoords.size).toBe(count);

        const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
        expect(overlaps).toBe(0);

        fieldPositions.forEach(p => {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        });
      });
    });

    it('multi-parent object field cluster isolation: fields of Object A do not collide with Object B or Object B fields', () => {
      const parentA = makeNode('Account', 'CustomObject', 'Account');
      const fieldsA = Array.from({ length: 15 }, (_, i) =>
        makeNode(`Account.Field_${i + 1}`, 'Field', `Field_${i + 1}`)
      );

      const parentB = makeNode('Contact', 'CustomObject', 'Contact');
      const fieldsB = Array.from({ length: 15 }, (_, i) =>
        makeNode(`Contact.Field_${i + 1}`, 'Field', `Field_${i + 1}`)
      );

      const nodes = [parentA, ...fieldsA, parentB, ...fieldsB];
      const edges = [
        ...fieldsA.map(f => makeEdge(f.id, parentA.id)),
        ...fieldsB.map(f => makeEdge(f.id, parentB.id)),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = {
        Account: { x: 100, y: 850 },
        Contact: { x: 900, y: 850 },
      };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions, {
        nodeWidth: 120,
        nodeHeight: 60,
      });

      expect(result.positions['Account']).toEqual({ x: 100, y: 850 });
      expect(result.positions['Contact']).toEqual({ x: 900, y: 850 });

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
      expect(overlaps).toBe(0);
    });
  });

  describe('WAVE 8B — Test Satellite Scalability Tests (1, 2, 5, 10, 25, 50, 100 tests)', () => {
    [1, 2, 5, 10, 25, 50, 100].forEach(count => {
      it(`places ${count} test satellites around a production target with zero overlaps and unshifted target`, () => {
        const targetProd = makeNode('PaymentProcessor', 'ApexClass', 'PaymentProcessor');
        const tests = Array.from({ length: count }, (_, i) =>
          makeNode(`PaymentProcessor_${String(i + 1).padStart(3, '0')}Test`, 'ApexClass', `PaymentProcessor_${i + 1}Test`)
        );

        const nodes = [targetProd, ...tests];
        const edges = tests.map(t => makeEdge(t.id, targetProd.id));

        const analysis = computeArchitectureAnalysis(nodes, edges);
        const primaryPositions = { PaymentProcessor: { x: 300, y: 350 } };

        const result = placeSatellites(nodes, edges, analysis, primaryPositions, {
          nodeWidth: 120,
          nodeHeight: 60,
        });

        expect(result.positions['PaymentProcessor']).toEqual({ x: 300, y: 350 });

        const testPositions = tests.map(t => result.positions[t.id]);
        expect(testPositions.length).toBe(count);

        const uniqueCoords = new Set(testPositions.map(p => `${p.x}:${p.y}`));
        expect(uniqueCoords.size).toBe(count);

        const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
        expect(overlaps).toBe(0);

        testPositions.forEach(p => {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        });
      });
    });

    it('multi-production target test satellite cluster isolation: tests for Target A do not collide with Target B or its tests', () => {
      const prodA = makeNode('OrderService', 'ApexClass', 'OrderService');
      const testsA = Array.from({ length: 20 }, (_, i) => makeNode(`OrderService_${i + 1}Test`, 'ApexClass', `OrderService_${i + 1}Test`));

      const prodB = makeNode('BillingService', 'ApexClass', 'BillingService');
      const testsB = Array.from({ length: 20 }, (_, i) => makeNode(`BillingService_${i + 1}Test`, 'ApexClass', `BillingService_${i + 1}Test`));

      const nodes = [prodA, ...testsA, prodB, ...testsB];
      const edges = [
        ...testsA.map(t => makeEdge(t.id, prodA.id)),
        ...testsB.map(t => makeEdge(t.id, prodB.id)),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = {
        OrderService: { x: 200, y: 350 },
        BillingService: { x: 1000, y: 350 },
      };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions, {
        nodeWidth: 120,
        nodeHeight: 60,
      });

      expect(result.positions['OrderService']).toEqual({ x: 200, y: 350 });
      expect(result.positions['BillingService']).toEqual({ x: 1000, y: 350 });

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, { nodeWidth: 120, nodeHeight: 60 });
      expect(overlaps).toBe(0);
    });
  });

  describe('WAVE 8B — Dimension-Safety Configuration Tests', () => {
    it('uses configured node dimensions and spacing parameters (160x80) for collision-free placement', () => {
      const prod = makeNode('CustomService', 'ApexClass', 'CustomService');
      const tests = Array.from({ length: 10 }, (_, i) => makeNode(`CustomService_${i + 1}Test`, 'ApexClass', `CustomService_${i + 1}Test`));

      const nodes = [prod, ...tests];
      const edges = tests.map(t => makeEdge(t.id, prod.id));

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = { CustomService: { x: 400, y: 400 } };

      const customGeom = {
        nodeWidth: 160,
        nodeHeight: 80,
        horizontalGap: 50,
        verticalGap: 50,
      };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions, customGeom);

      const overlaps = nodeOverlapCount(nodes, edges, result.positions, customGeom);
      expect(overlaps).toBe(0);
    });
  });

  describe('WAVE 8B — Input Ordering Determinism Tests', () => {
    it('produces 100% identical satellite positions when node and edge arrays are reversed', () => {
      const prod = makeNode('OrderService');
      const testA = makeNode('OrderServiceTestA');
      const testB = makeNode('OrderServiceTestB');
      const testC = makeNode('OrderServiceTestC');
      const obj = makeNode('Order__c', 'CustomObject', 'Order__c');
      const fieldA = makeNode('Order__c.FieldA', 'Field', 'FieldA');
      const fieldB = makeNode('Order__c.FieldB', 'Field', 'FieldB');

      const nodes = [prod, testA, testB, testC, obj, fieldA, fieldB];
      const edges = [
        makeEdge('OrderServiceTestA', 'OrderService'),
        makeEdge('OrderServiceTestB', 'OrderService'),
        makeEdge('OrderServiceTestC', 'OrderService'),
        makeEdge('Order__c.FieldA', 'Order__c'),
        makeEdge('Order__c.FieldB', 'Order__c'),
      ];

      const analysis1 = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = {
        OrderService: { x: 200, y: 350 },
        Order__c: { x: 200, y: 850 },
      };

      const result1 = placeSatellites(nodes, edges, analysis1, primaryPositions);

      const reversedNodes = [...nodes].reverse();
      const reversedEdges = [...edges].reverse();
      const analysis2 = computeArchitectureAnalysis(reversedNodes, reversedEdges);

      const result2 = placeSatellites(reversedNodes, reversedEdges, analysis2, primaryPositions);

      expect(result1.positions).toEqual(result2.positions);
    });
  });

  describe('WAVE 8B — Full Fixture Overlap Remediation Verification', () => {
    it('FIND-7C-01 Remediation: Field-Heavy fixture layout achieves nodeOverlapCount === 0', () => {
      const fixture = createFieldHeavyFixture();
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);

      expect(metrics.nodeOverlapCount).toBe(0);
      Object.values(positions).forEach(p => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });

    it('FIND-7C-02 Remediation: Test-Heavy fixture layout achieves nodeOverlapCount === 0', () => {
      const fixture = createTestHeavyFixture();
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);

      expect(metrics.nodeOverlapCount).toBe(0);
      Object.values(positions).forEach(p => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });
  });

  describe('Workstream B3 Satellite Locality & Primary Immutability Requirements', () => {
    it('strictly guarantees primary node coordinates remain unchanged during satellite placement', () => {
      const prodA = makeNode('PrimaryServiceA', 'ApexClass', 'PrimaryServiceA');
      const prodB = makeNode('PrimaryServiceB', 'ApexClass', 'PrimaryServiceB');
      const testA1 = makeNode('PrimaryServiceATest1', 'ApexClass', 'PrimaryServiceATest1');
      const testA2 = makeNode('PrimaryServiceATest2', 'ApexClass', 'PrimaryServiceATest2');

      const nodes = [prodA, prodB, testA1, testA2];
      const edges = [
        makeEdge('PrimaryServiceATest1', 'PrimaryServiceA'),
        makeEdge('PrimaryServiceATest2', 'PrimaryServiceA'),
      ];

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const primaryPositions = {
        PrimaryServiceA: { x: 123.45, y: 678.9 },
        PrimaryServiceB: { x: 987.65, y: 432.1 },
      };

      const result = placeSatellites(nodes, edges, analysis, primaryPositions);

      expect(result.positions['PrimaryServiceA']).toEqual({ x: 123.45, y: 678.9 });
      expect(result.positions['PrimaryServiceB']).toEqual({ x: 987.65, y: 432.1 });
    });
  });
});

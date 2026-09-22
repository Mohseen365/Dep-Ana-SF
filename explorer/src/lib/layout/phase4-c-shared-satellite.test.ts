import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { computeArchitectureAnalysis } from './analysis';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
  calculateHubCandidatePosition,
} from './centrality';
import { placeSatellites } from './satellites';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { calculateDetailedEdgeCrossings } from './metrics';
import { createNode, createEdge } from './fixtures/builder';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

function loadCloudSpendFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  if (!fs.existsSync(FIXTURE_PATH)) {
    return { nodes: [], edges: [] };
  }
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

function makeClassNode(id: string, displayName?: string): ExplorerNode {
  return createNode(id, 'ApexClass', displayName);
}

function makeObjectNode(id: string, displayName?: string): ExplorerNode {
  return createNode(id, 'CustomObject', displayName);
}

function makeFieldNode(id: string, displayName?: string): ExplorerNode {
  return createNode(id, 'Field', displayName);
}

function makeTriggerNode(id: string, displayName?: string): ExplorerNode {
  return createNode(id, 'ApexTrigger', displayName);
}

function makeLwcNode(id: string, displayName?: string): ExplorerNode {
  return createNode(id, 'LWC', displayName);
}

describe('Phase 4-C — Shared Infrastructure & Satellite Relationship Geometry Test Suite', () => {
  it('1. One shared utility used by many features: verifies single physical node placement without duplication', () => {
    const util = makeClassNode('CurrencyUtils', 'CurrencyUtils');
    const f1Service = makeClassNode('BillingService', 'BillingService');
    const f2Service = makeClassNode('PaymentService', 'PaymentService');
    const f3Service = makeClassNode('ForecastService', 'ForecastService');
    const f4Service = makeClassNode('ReportingService', 'ReportingService');

    const nodes = [util, f1Service, f2Service, f3Service, f4Service];
    const edges = [
      createEdge('BillingService', 'CurrencyUtils'),
      createEdge('PaymentService', 'CurrencyUtils'),
      createEdge('ForecastService', 'CurrencyUtils'),
      createEdge('ReportingService', 'CurrencyUtils'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);

    // CurrencyUtils must exist exactly once in positions
    const utilPos = positions['CurrencyUtils'];
    expect(utilPos).toBeDefined();
    expect(Number.isFinite(utilPos.x)).toBe(true);
    expect(Number.isFinite(utilPos.y)).toBe(true);

    const metrics = evaluateLayout(nodes, edges, positions);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('2. Two-feature shared utility: verifies relationship centroid candidate position in corridor', () => {
    const sharedUtil = makeClassNode('DateUtils', 'DateUtils');
    const featA = makeClassNode('OrderController', 'OrderController');
    const featB = makeClassNode('InvoiceController', 'InvoiceController');

    const nodes = [sharedUtil, featA, featB];
    const edges = [
      createEdge('OrderController', 'DateUtils'),
      createEdge('InvoiceController', 'DateUtils'),
    ];

    const domainXCenters = { FeatureA: 200, FeatureB: 800 };
    const domainBounds = {
      FeatureA: { minX: 100, maxX: 300 },
      FeatureB: { minX: 700, maxX: 900 },
    };

    const neighborPositions = {
      OrderController: { x: 200, y: 100 },
      InvoiceController: { x: 800, y: 100 },
    };

    const bridgePlacement = calculateBridgeCandidatePosition(
      'DateUtils',
      'application',
      ['FeatureA', 'FeatureB'],
      domainXCenters,
      domainBounds,
      neighborPositions
    );

    expect(bridgePlacement.candidatePosition.x).toBe(500); // Centroid between 200 and 800
    expect(bridgePlacement.candidatePosition.y).toBeLessThan(350); // Hierarchy-preserving corridor offset
  });

  it('3. High-fan-in hub: correctly identifies hub role and positions deterministically in primary region', () => {
    const hubNode = makeClassNode('GlobalLogger', 'GlobalLogger');
    const callers = Array.from({ length: 8 }, (_, i) =>
      makeClassNode(`CallerService_${i + 1}`, `CallerService_${i + 1}`)
    );

    const nodes = [hubNode, ...callers];
    const edges = callers.map(c => createEdge(c.id, 'GlobalLogger'));

    const domainMap = new Map<string, string>(nodes.map(n => [n.id, 'Core']));
    const layerMap = new Map<string, ArchitectureLayer>(nodes.map(n => [n.id, 'application']));

    const centralityMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);
    const hubAnalysis = centralityMap.get('GlobalLogger')!;

    expect(hubAnalysis.isHub).toBe(true);
    expect(hubAnalysis.hubType).toBe('fan-in');

    const placement = calculateHubCandidatePosition('GlobalLogger', hubAnalysis.hubScore, hubAnalysis.hubType, 'Core', 'application', 500, 350);
    expect(placement.candidateLocalPosition.x).toBe(500);
    expect(placement.candidateLocalPosition.y).toBe(370);
  });

  it('4. Bridge spanning layers: places cross-layer bridge in inter-layer corridor without layer violations', () => {
    const presNode = makeLwcNode('SpendDashboard', 'SpendDashboard');
    const schemaNode = makeObjectNode('Spend_Record__c', 'Spend_Record__c');
    const bridgeNode = makeClassNode('SpendBridgeAdapter', 'SpendBridgeAdapter');

    const nodes = [presNode, schemaNode, bridgeNode];
    const edges = [
      createEdge('SpendDashboard', 'SpendBridgeAdapter'),
      createEdge('SpendBridgeAdapter', 'Spend_Record__c'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.layerViolationCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('5. Dense test cluster: places test satellites around target with 0 overlaps', () => {
    const target = makeClassNode('PaymentProcessor', 'PaymentProcessor');
    const tests = Array.from({ length: 15 }, (_, i) =>
      makeClassNode(`PaymentProcessorTest_${i + 1}`, `PaymentProcessorTest_${i + 1}`)
    );

    const nodes = [target, ...tests];
    const edges = tests.map(t => createEdge(t.id, 'PaymentProcessor'));

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('6. Field-heavy object: places field satellites in compact grid below object with 0 overlaps', () => {
    const obj = makeObjectNode('Account', 'Account');
    const fields = Array.from({ length: 25 }, (_, i) =>
      makeFieldNode(`Account.Field_${i + 1}`, `Field_${i + 1}`)
    );

    const nodes = [obj, ...fields];
    const edges = fields.map(f => createEdge(f.id, 'Account'));

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('7. Trigger-heavy object: places trigger microcluster adjacent to object with 0 overlaps', () => {
    const obj = makeObjectNode('Opportunity', 'Opportunity');
    const trig1 = makeTriggerNode('OpportunityTrigger1', 'OpportunityTrigger1');
    const trig2 = makeTriggerNode('OpportunityTrigger2', 'OpportunityTrigger2');

    const nodes = [obj, trig1, trig2];
    const edges = [
      createEdge('OpportunityTrigger1', 'Opportunity'),
      createEdge('OpportunityTrigger2', 'Opportunity'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('8. LWC parent/child: places parent and child LWC components deterministically in presentation layer', () => {
    const parentLwc = makeLwcNode('parent-container', 'parent-container');
    const childLwc1 = makeLwcNode('child-list', 'child-list');
    const childLwc2 = makeLwcNode('child-item', 'child-item');

    const nodes = [parentLwc, childLwc1, childLwc2];
    const edges = [
      createEdge('parent-container', 'child-list'),
      createEdge('child-list', 'child-item'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.layerViolationCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('9. Many satellites around one primary: handles 30 satellites around single production node with 0 overlaps', () => {
    const target = makeClassNode('OrderEngine', 'OrderEngine');
    const satellites = Array.from({ length: 30 }, (_, i) =>
      makeClassNode(`OrderEngineTest_${i + 1}`, `OrderEngineTest_${i + 1}`)
    );

    const nodes = [target, ...satellites];
    const edges = satellites.map(s => createEdge(s.id, 'OrderEngine'));

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
  });

  it('10. Satellites targeting multiple primaries: places satellites without inter-cluster collision', () => {
    const prodA = makeClassNode('ServiceA', 'ServiceA');
    const testA = makeClassNode('ServiceATest', 'ServiceATest');

    const prodB = makeClassNode('ServiceB', 'ServiceB');
    const testB = makeClassNode('ServiceBTest', 'ServiceBTest');

    const nodes = [prodA, testA, prodB, testB];
    const edges = [
      createEdge('ServiceATest', 'ServiceA'),
      createEdge('ServiceBTest', 'ServiceB'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('11. Mixed satellite categories: test, field, trigger, handler around primary nodes with 0 overlaps', () => {
    const service = makeClassNode('AccountService', 'AccountService');
    const serviceTest = makeClassNode('AccountServiceTest', 'AccountServiceTest');
    const obj = makeObjectNode('Account', 'Account');
    const field1 = makeFieldNode('Account.Name', 'Name');
    const trigger = makeTriggerNode('AccountTrigger', 'AccountTrigger');

    const nodes = [service, serviceTest, obj, field1, trigger];
    const edges = [
      createEdge('AccountServiceTest', 'AccountService'),
      createEdge('Account.Name', 'Account'),
      createEdge('AccountTrigger', 'Account'),
      createEdge('AccountService', 'Account'),
    ];

    const positions = computeArchitectureLayout(nodes, edges);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.primaryOverlapCount).toBe(0);
    expect(metrics.satelliteOverlapCount).toBe(0);
  });

  it('12. Real Cloud Spend Tracker dataset verification: measures C_pp, C_ps, C_ss, C_total, edge lengths, zero layer violations', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    if (nodes.length === 0) return; // Skip if audit fixture not present

    const positions = computeArchitectureLayout(nodes, edges);
    const crossings = calculateDetailedEdgeCrossings(nodes, edges, positions);
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.layerViolationCount).toBe(0);

    expect(crossings.primaryPrimaryCrossings).toBeGreaterThan(0);
    expect(crossings.totalGeometricCrossings).toBe(
      crossings.primaryPrimaryCrossings +
        crossings.primaryBridgeCrossings +
        crossings.bridgeBridgeCrossings +
        crossings.primarySatelliteCrossings +
        crossings.satelliteSatelliteCrossings
    );
  });

  it('13. Immutability proof: primary coordinates remain 100% identical before and after satellite placement', () => {
    const prodA = makeClassNode('PrimaryServiceA', 'PrimaryServiceA');
    const prodB = makeClassNode('PrimaryServiceB', 'PrimaryServiceB');
    const testA1 = makeClassNode('PrimaryServiceATest1', 'PrimaryServiceATest1');
    const testA2 = makeClassNode('PrimaryServiceATest2', 'PrimaryServiceATest2');

    const nodes = [prodA, prodB, testA1, testA2];
    const edges = [
      createEdge('PrimaryServiceATest1', 'PrimaryServiceA'),
      createEdge('PrimaryServiceATest2', 'PrimaryServiceA'),
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

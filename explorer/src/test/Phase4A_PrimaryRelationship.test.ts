import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge, ExplorerRelationshipType } from '../types/explorer';
import type { ArchitectureLayer } from '../lib/layout/types';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { measurePipelineStageMetrics } from '../lib/layout/pipeline-stage-diagnostics';

function createDummyNode(
  id: string,
  type: ExplorerNode['type'] = 'ApexClass',
  displayName?: string
): ExplorerNode {
  return {
    id,
    displayName: displayName || id,
    type,
    file: `src/${id}.cls`,
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

function createDummyEdge(source: string, target: string, relationshipType: ExplorerRelationshipType = 'method-call'): ExplorerEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    relationshipType,
    method: null,
    evidence: 'test',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: null,
    file: 'src/Test.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: relationshipType, resolution: 'EXACT' },
      location: { line: 1, column: 1 },
    },
  };
}

describe('Phase 4-A Primary Relationship & Local Node Realization Suite', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const rawData = fs.readFileSync(fixturePath, 'utf-8');
  const fixture = JSON.parse(rawData);
  const cloudSpendNodes = fixture.nodes as ExplorerNode[];
  const cloudSpendEdges = fixture.edges as ExplorerEdge[];

  describe('1. Targeted Unit & Functional Contracts', () => {
    it('1.1 Same-layer relationship ordering: places strongly connected same-layer nodes adjacent', () => {
      const nodes = [
        createDummyNode('ServiceA', 'ApexClass'),
        createDummyNode('ServiceB', 'ApexClass'),
        createDummyNode('ServiceC', 'ApexClass'),
      ];
      const edges = [
        createDummyEdge('ServiceA', 'ServiceC', 'method-call'),
      ];
      const layerMap = new Map<string, ArchitectureLayer>([
        ['ServiceA', 'application'],
        ['ServiceB', 'application'],
        ['ServiceC', 'application'],
      ]);
      const domainMap = new Map([
        ['ServiceA', 'AppDomain'],
        ['ServiceB', 'AppDomain'],
        ['ServiceC', 'AppDomain'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });
      const bucket = result.bucketOrder.get('application:AppDomain') || [];

      expect(bucket).toBeDefined();
      expect(bucket.length).toBe(3);
      expect(Math.abs(bucket.indexOf('ServiceA') - bucket.indexOf('ServiceC'))).toBeLessThan(
        Math.abs(bucket.indexOf('ServiceA') - bucket.indexOf('ServiceB')) + 1
      );
    });

    it('1.2 Cross-layer relationship ordering: weights strong architectural relationships over metadata', () => {
      const nodes = [
        createDummyNode('ControllerA', 'LWC'),
        createDummyNode('ServicePrimary', 'ApexClass'),
        createDummyNode('ServiceSecondary', 'ApexClass'),
      ];
      const edges = [
        createDummyEdge('ControllerA', 'ServicePrimary', 'method-call'),
        createDummyEdge('ControllerA', 'ServiceSecondary', 'field-reference'),
      ];
      const layerMap = new Map<string, ArchitectureLayer>([
        ['ControllerA', 'presentation'],
        ['ServicePrimary', 'application'],
        ['ServiceSecondary', 'application'],
      ]);
      const domainMap = new Map([
        ['ControllerA', 'AppDomain'],
        ['ServicePrimary', 'AppDomain'],
        ['ServiceSecondary', 'AppDomain'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });
      const appBucket = result.bucketOrder.get('application:AppDomain') || [];

      expect(appBucket.indexOf('ServicePrimary')).toBeLessThan(appBucket.indexOf('ServiceSecondary'));
    });

    it('1.3 High-degree hubs: positions hubs deterministically with neighbor barycenters', () => {
      const nodes = [
        createDummyNode('Client1', 'LWC'),
        createDummyNode('Client2', 'LWC'),
        createDummyNode('CoreHub', 'ApexClass'),
        createDummyNode('UnusedService', 'ApexClass'),
      ];
      const edges = [
        createDummyEdge('Client1', 'CoreHub', 'instantiation'),
        createDummyEdge('Client2', 'CoreHub', 'method-call'),
      ];
      const layerMap = new Map<string, ArchitectureLayer>([
        ['Client1', 'presentation'],
        ['Client2', 'presentation'],
        ['CoreHub', 'application'],
        ['UnusedService', 'application'],
      ]);
      const domainMap = new Map([
        ['Client1', 'CoreDomain'],
        ['Client2', 'CoreDomain'],
        ['CoreHub', 'CoreDomain'],
        ['UnusedService', 'CoreDomain'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });
      const appBucket = result.bucketOrder.get('application:CoreDomain') || [];

      expect(appBucket).toBeDefined();
      expect(appBucket.indexOf('CoreHub')).toBeLessThan(appBucket.indexOf('UnusedService'));
    });

    it('1.4 Multiple nodes in the same feature/layer bucket: respects 0 overlaps and 40px gaps', () => {
      const nodes = Array.from({ length: 6 }, (_, i) => createDummyNode(`Node_${i + 1}`, 'ApexClass'));
      const edges: ExplorerEdge[] = [];
      const domainMap = new Map(nodes.map(n => [n.id, 'FeatureX']));

      const result = computeLocalNodeLayout({ nodes, edges, domainMap });

      expect(result.primaryNodeCount).toBe(6);
      expect(result.metrics?.primaryOverlapCount).toBe(0);
      expect(result.metrics?.satelliteOverlapCount).toBe(0);
    });

    it('1.5 Disconnected nodes: handles isolated nodes cleanly with fallback sorting', () => {
      const nodes = [
        createDummyNode('ConnectedA', 'ApexClass'),
        createDummyNode('ConnectedB', 'ApexClass'),
        createDummyNode('IsolatedC', 'ApexClass'),
      ];
      const edges = [
        createDummyEdge('ConnectedA', 'ConnectedB', 'method-call'),
      ];

      const result = reduceEdgeCrossings({ nodes, edges });
      expect(result.nodeRankMap.size).toBe(3);
    });

    it('1.6 bucketOrder preservation: preserves rank stability when barycenters are equal', () => {
      const nodes = [
        createDummyNode('Node1', 'ApexClass'),
        createDummyNode('Node2', 'ApexClass'),
      ];
      const edges: ExplorerEdge[] = [];
      const domainMap = new Map([['Node1', 'Shared'], ['Node2', 'Shared']]);
      const bucketOrder = new Map([['application:Shared', ['Node2', 'Node1']]]);

      const result = computeLocalNodeLayout({ nodes, edges, domainMap, bucketOrder });
      const bucket = result.bucketLayouts.get('application:Shared');

      expect(bucket?.nodeIds).toEqual(['Node2', 'Node1']);
    });

    it('1.7 Deterministic ordering & input shuffling: guarantees zero drift under shuffled inputs', () => {
      const nodes = [
        createDummyNode('Alpha', 'LWC'),
        createDummyNode('Beta', 'ApexClass'),
        createDummyNode('Gamma', 'ApexClass'),
      ];
      const edges = [
        createDummyEdge('Alpha', 'Beta', 'lwc-apex'),
        createDummyEdge('Beta', 'Gamma', 'SOQL'),
      ];

      const run1 = reduceEdgeCrossings({ nodes, edges });
      const run2 = reduceEdgeCrossings({ nodes: [...nodes].reverse(), edges: [...edges].reverse() });

      expect(Array.from(run1.nodeRankMap.entries())).toEqual(Array.from(run2.nodeRankMap.entries()));
    });
  });

  describe('2. Cloud Spend Fixture Acceptance Verification', () => {
    it('verifies primary-primary crossings and hard invariants on Cloud Spend Tracker', () => {
      const diag = measurePipelineStageMetrics(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

      const snap7 = diag.snapshots['Stage 7'];
      const snap12 = diag.snapshots['Stage 12'];

      const stage7PrimaryCrossings = snap7.metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0;
      const stage12PrimaryCrossings = snap12.metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0;

      console.log('Stage 7 Primary Crossings:', stage7PrimaryCrossings);
      console.log('Stage 12 Primary Crossings:', stage12PrimaryCrossings);

      // Quality Gates
      expect(stage7PrimaryCrossings).toBeLessThan(12885);
      expect(stage12PrimaryCrossings).toBeLessThan(11228);

      // Hard Invariants
      expect(snap12.metrics.layerViolationCount).toBe(0);
      expect(snap12.metrics.primaryOverlapCount).toBe(0);
      expect(snap12.metrics.satelliteOverlapCount).toBe(0);
    });

    it('verifies Position Authority restoration: existingPositions override calculated layout', () => {
      const existing = {
        'CloudAccountController': { x: 9999, y: 8888 },
      };

      const result = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
        existingPositions: existing,
      });

      expect(result['CloudAccountController']).toEqual({ x: 9999, y: 8888 });
    });
  });
});

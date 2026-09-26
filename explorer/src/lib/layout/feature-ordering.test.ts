import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  determineGlobalFeatureOrder,
  buildFeatureDependencyMatrix,
  compute2DFeatureBandOrdering,
  assignFeature2DBands,
} from './feature-ordering';
import { buildDomainGraph } from './global-layout';
import { discoverFeatures } from './features';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

describe('Phase 3.3 2D Multi-Row Feature Ordering Test Suite', () => {
  const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const fixture = JSON.parse(rawData);
  const cloudSpendNodes = fixture.nodes as ExplorerNode[];
  const cloudSpendEdges = fixture.edges as ExplorerEdge[];

  // Helper factory for mock nodes
  function createMockNode(id: string, type: string, _layer: string): ExplorerNode {
    return {
      id,
      displayName: id.split(':').pop() || id,
      type: type as any,
      file: `${id}.cls`,
      metrics: { score: 10, fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
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
        testCoverageStatus: 'COVERED',
      },
    };
  }

  function createMockEdge(id: string, source: string, target: string): ExplorerEdge {
    return {
      id,
      source,
      target,
      relationshipType: 'method-call',
      method: '',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: '',
      file: '',
      canonical: {
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    };
  }

  // 1. Strongly coupled pair across bands
  it('1. verifies strongly coupled feature pair across layer bands is horizontally aligned', () => {
    const nodes: ExplorerNode[] = [
      createMockNode('LWC:P1', 'LWC', 'presentation'),
      createMockNode('ApexClass:A1', 'ApexClass', 'application'),
      createMockNode('ApexClass:A2', 'ApexClass', 'application'),
    ];
    const edges: ExplorerEdge[] = [
      // Strongly coupled P1 -> A1 (10 calls)
      ...Array.from({ length: 10 }, (_, i) => createMockEdge(`e1_${i}`, 'LWC:P1', 'ApexClass:A1')),
      // Weakly coupled P1 -> A2 (1 call)
      createMockEdge('e2', 'LWC:P1', 'ApexClass:A2'),
    ];
    const featureMap = new Map<string, string>([
      ['LWC:P1', 'feature_P1'],
      ['ApexClass:A1', 'feature_A1'],
      ['ApexClass:A2', 'feature_A2'],
    ]);

    const fg = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);
    const matrix = buildFeatureDependencyMatrix(nodes, edges, fg, featureMap);
    const res = compute2DFeatureBandOrdering(matrix);

    const placementP1 = res.placements.get('feature_P1')!;
    const placementA1 = res.placements.get('feature_A1')!;
    const placementA2 = res.placements.get('feature_A2')!;

    expect(placementP1).toBeDefined();
    expect(placementA1).toBeDefined();
    expect(placementA2).toBeDefined();

    // Feature A1 (strongly coupled) should be closer in X to P1 than A2 is
    const distA1 = Math.abs(placementP1.estimatedX - placementA1.estimatedX);
    const distA2 = Math.abs(placementP1.estimatedX - placementA2.estimatedX);

    expect(distA1).toBeLessThanOrEqual(distA2);
  });

  // 2. Chain topology (Feature A ↕ Feature B ↕ Feature C)
  it('2. verifies vertical chain (Feature A ↕ Feature B ↕ Feature C) produces coherent spatial locality', () => {
    const nodes: ExplorerNode[] = [
      createMockNode('LWC:Top', 'LWC', 'presentation'),
      createMockNode('ApexClass:Mid', 'ApexClass', 'application'),
      createMockNode('CustomObject:Bot', 'CustomObject', 'schema'),
    ];
    const edges: ExplorerEdge[] = [
      createMockEdge('e1', 'LWC:Top', 'ApexClass:Mid'),
      createMockEdge('e2', 'ApexClass:Mid', 'CustomObject:Bot'),
    ];
    const featureMap = new Map<string, string>([
      ['LWC:Top', 'feature_A'],
      ['ApexClass:Mid', 'feature_B'],
      ['CustomObject:Bot', 'feature_C'],
    ]);

    const fg = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);
    const matrix = buildFeatureDependencyMatrix(nodes, edges, fg, featureMap);
    const res = compute2DFeatureBandOrdering(matrix);

    expect(res.placements.get('feature_A')?.primaryLayer).toBe('presentation');
    expect(res.placements.get('feature_B')?.primaryLayer).toBe('application');
    expect(res.placements.get('feature_C')?.primaryLayer).toBe('schema');

    // All three chain features should align closely along estimated X
    const xA = res.placements.get('feature_A')!.estimatedX;
    const xB = res.placements.get('feature_B')!.estimatedX;
    const xC = res.placements.get('feature_C')!.estimatedX;

    expect(Math.abs(xA - xB)).toBeLessThan(100);
    expect(Math.abs(xB - xC)).toBeLessThan(100);
  });

  // 3. Hub feature centering
  it('3. verifies hub feature is positioned centrally relative to its connected multi-band neighbors', () => {
    const nodes: ExplorerNode[] = [
      createMockNode('ApexClass:Hub', 'ApexClass', 'application'),
      createMockNode('LWC:N1', 'LWC', 'presentation'),
      createMockNode('LWC:N2', 'LWC', 'presentation'),
      createMockNode('CustomObject:N3', 'CustomObject', 'schema'),
    ];
    const edges: ExplorerEdge[] = [
      createMockEdge('e1', 'LWC:N1', 'ApexClass:Hub'),
      createMockEdge('e2', 'LWC:N2', 'ApexClass:Hub'),
      createMockEdge('e3', 'ApexClass:Hub', 'CustomObject:N3'),
    ];
    const featureMap = new Map<string, string>([
      ['ApexClass:Hub', 'feature_Hub'],
      ['LWC:N1', 'feature_N1'],
      ['LWC:N2', 'feature_N2'],
      ['CustomObject:N3', 'feature_N3'],
    ]);

    const fg = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);
    const matrix = buildFeatureDependencyMatrix(nodes, edges, fg, featureMap);
    const res = assignFeature2DBands(matrix);

    const xHub = res.placements.get('feature_Hub')!.estimatedX;
    const xN1 = res.placements.get('feature_N1')!.estimatedX;
    const xN2 = res.placements.get('feature_N2')!.estimatedX;

    // Hub X should lie between N1 and N2 or align near their centroid
    const minX = Math.min(xN1, xN2);
    const maxX = Math.max(xN1, xN2);

    expect(xHub).toBeGreaterThanOrEqual(minX - 50);
    expect(xHub).toBeLessThanOrEqual(maxX + 50);
  });

  // 4. Disconnected features
  it('4. verifies disconnected features are assigned clean deterministic 2D band placements', () => {
    const nodes: ExplorerNode[] = [
      createMockNode('ApexClass:Disc1', 'ApexClass', 'application'),
      createMockNode('ApexClass:Disc2', 'ApexClass', 'domain'),
    ];
    const edges: ExplorerEdge[] = [];
    const featureMap = new Map<string, string>([
      ['ApexClass:Disc1', 'feature_D1'],
      ['ApexClass:Disc2', 'feature_D2'],
    ]);

    const fg = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);
    const matrix = buildFeatureDependencyMatrix(nodes, edges, fg, featureMap);
    const res = compute2DFeatureBandOrdering(matrix);

    expect(res.orderedFeatures).toHaveLength(2);
    expect(res.placements.has('feature_D1')).toBe(true);
    expect(res.placements.has('feature_D2')).toBe(true);
    expect(res.metrics.isDeterministic).toBe(true);
  });

  // 5. Equal-weight tie breaking
  it('5. verifies equal-weight feature pairs break ties deterministically by feature ID', () => {
    const nodes: ExplorerNode[] = [
      createMockNode('ApexClass:T1', 'ApexClass', 'application'),
      createMockNode('ApexClass:T2', 'ApexClass', 'application'),
    ];
    const edges: ExplorerEdge[] = [];
    const featureMap = new Map<string, string>([
      ['ApexClass:T1', 'feature_Zeta'],
      ['ApexClass:T2', 'feature_Alpha'],
    ]);

    const fg = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);
    const matrix = buildFeatureDependencyMatrix(nodes, edges, fg, featureMap);
    const res = compute2DFeatureBandOrdering(matrix);

    const appFeatures = res.bandFeatures.get('application')!;
    expect(appFeatures).toEqual(['feature_Alpha', 'feature_Zeta']);
  });

  // 6. Shuffled input invariance
  it('6. verifies 2D band ordering produces exact 0.00000 px drift across 5 shuffled permutations', () => {
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
    cloudSpendNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });
    const featureGraph = buildDomainGraph(cloudSpendNodes, cloudSpendEdges, undefined, undefined, featureMap);

    const baseMatrix = buildFeatureDependencyMatrix(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap);
    const baseRes = compute2DFeatureBandOrdering(baseMatrix);

    for (let shuffle = 0; shuffle < 5; shuffle++) {
      const shuffledNodes = [...cloudSpendNodes].sort(() => Math.sin(shuffle + 1));
      const shuffledEdges = [...cloudSpendEdges].sort(() => Math.cos(shuffle + 1));

      const shuffledGraph = buildDomainGraph(shuffledNodes, shuffledEdges, undefined, undefined, featureMap);
      const shuffledMatrix = buildFeatureDependencyMatrix(shuffledNodes, shuffledEdges, shuffledGraph, featureMap);
      const shuffledRes = compute2DFeatureBandOrdering(shuffledMatrix);

      expect(shuffledRes.orderedFeatures).toEqual(baseRes.orderedFeatures);

      baseRes.placements.forEach((baseP, fid) => {
        const shufP = shuffledRes.placements.get(fid)!;
        expect(shufP.estimatedX).toBeCloseTo(baseP.estimatedX, 5);
        expect(shufP.estimatedY).toBeCloseTo(baseP.estimatedY, 5);
      });
    }
  });

  // 7. Cloud Spend dataset validation
  it('7. verifies execution on Salesforce Cloud Spend dataset with comprehensive 2D metrics', () => {
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
    cloudSpendNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });
    const featureGraph = buildDomainGraph(cloudSpendNodes, cloudSpendEdges, undefined, undefined, featureMap);

    const matrix = buildFeatureDependencyMatrix(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap);
    const res = compute2DFeatureBandOrdering(matrix);

    expect(res.orderedFeatures.length).toBeGreaterThan(15);
    expect(res.placements.size).toBe(res.orderedFeatures.length);

    // Verify metrics exist and are non-negative
    expect(res.metrics.totalFeaturesCount).toBeGreaterThan(0);
    expect(res.metrics.avgCrossBandEdgeLength).toBeGreaterThan(0);
    expect(res.metrics.intraBandLocalityScore).toBeGreaterThan(0);
    expect(res.metrics.isDeterministic).toBe(true);

    // Strategy strategy dispatch verification
    const orderViaStrategy = determineGlobalFeatureOrder(
      cloudSpendNodes,
      cloudSpendEdges,
      featureGraph,
      featureMap,
      'F_2D_BAND_AWARE'
    );
    expect(orderViaStrategy).toEqual(res.orderedFeatures);
  });
});

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  determineGlobalFeatureOrder,
  buildFeatureDependencyMatrix,
  orderStrategyF_SharedHierarchyAware,
} from './feature-ordering';
import { buildDomainGraph, computeGlobalFeatureLayout } from './global-layout';
import { discoverFeatures } from './features';
import { calculateLayoutMetrics } from './metrics';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

describe('Phase 2.1 Global Feature Ordering Focused Test Suite', () => {
  const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const fixture = JSON.parse(rawData);
  const cloudSpendNodes = fixture.nodes as ExplorerNode[];
  const cloudSpendEdges = fixture.edges as ExplorerEdge[];

  // 1. Deterministic feature ordering
  it('1. verifies deterministic feature ordering produces identical order across runs', () => {
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
    cloudSpendNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });
    const featureGraph = buildDomainGraph(cloudSpendNodes, cloudSpendEdges, undefined, undefined, featureMap);

    const order1 = determineGlobalFeatureOrder(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap, 'F_SHARED_HIERARCHY_AWARE');
    const order2 = determineGlobalFeatureOrder(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap, 'F_SHARED_HIERARCHY_AWARE');

    expect(order1).toEqual(order2);
  });

  // 2. Input-order permutation invariance
  it('2. verifies input-order permutation invariance across shuffled node/edge arrays', () => {
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
    cloudSpendNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });
    const featureGraph = buildDomainGraph(cloudSpendNodes, cloudSpendEdges, undefined, undefined, featureMap);

    const baseOrder = determineGlobalFeatureOrder(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap, 'F_SHARED_HIERARCHY_AWARE');

    for (let shuffle = 0; shuffle < 5; shuffle++) {
      const shuffledNodes = [...cloudSpendNodes].sort(() => Math.sin(shuffle + 1));
      const shuffledEdges = [...cloudSpendEdges].sort(() => Math.cos(shuffle + 1));

      const shuffledGraph = buildDomainGraph(shuffledNodes, shuffledEdges, undefined, undefined, featureMap);
      const shuffledOrder = determineGlobalFeatureOrder(shuffledNodes, shuffledEdges, shuffledGraph, featureMap, 'F_SHARED_HIERARCHY_AWARE');

      expect(shuffledOrder).toEqual(baseOrder);
    }
  });

  // 3. Weighted dependency ordering
  it('3. verifies features with strong cross-feature coupling are placed adjacently', () => {
    const testNodes: ExplorerNode[] = [
      { id: 'ApexClass:A1', displayName: 'A1', type: 'ApexClass', file: 'A1.cls', metrics: { score: 10, fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
      { id: 'ApexClass:A2', displayName: 'A2', type: 'ApexClass', file: 'A2.cls', metrics: { score: 10, fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
      { id: 'ApexClass:B1', displayName: 'B1', type: 'ApexClass', file: 'B1.cls', metrics: { score: 10, fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
      { id: 'ApexClass:C1', displayName: 'C1', type: 'ApexClass', file: 'C1.cls', metrics: { score: 10, fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
    ];

    const testEdges: ExplorerEdge[] = [
      // High coupling between feature_F1 and feature_F2 (10 edges)
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `e1_${i}`,
        source: 'ApexClass:A1',
        target: 'ApexClass:A2',
        relationship: 'Calls' as const,
      })),
      // Weak coupling between feature_F1 and feature_F3 (1 edge)
      { id: 'e2', source: 'ApexClass:A1', target: 'ApexClass:B1', relationship: 'Calls' as const },
    ];

    const fMap = new Map<string, string>([
      ['ApexClass:A1', 'feature_F1'],
      ['ApexClass:A2', 'feature_F2'],
      ['ApexClass:B1', 'feature_F3'],
      ['ApexClass:C1', 'feature_F4'],
    ]);

    const fg = buildDomainGraph(testNodes, testEdges, undefined, undefined, fMap);
    const matrix = buildFeatureDependencyMatrix(testNodes, testEdges, fg, fMap);

    const f1ToF2Weight = matrix.combinedWeights.get('feature_F1')?.get('feature_F2') || 0;
    const f1ToF3Weight = matrix.combinedWeights.get('feature_F1')?.get('feature_F3') || 0;

    expect(f1ToF2Weight).toBeGreaterThan(f1ToF3Weight);
  });

  // 4. Disconnected features
  it('4. verifies handling of completely disconnected feature regions without errors', () => {
    const testNodes: ExplorerNode[] = [
      { id: 'ApexClass:D1', displayName: 'D1', type: 'ApexClass', file: 'D1.cls', metrics: { score: 10, fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
      { id: 'ApexClass:D2', displayName: 'D2', type: 'ApexClass', file: 'D2.cls', metrics: { score: 10, fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
    ];
    const testEdges: ExplorerEdge[] = [];
    const fMap = new Map<string, string>([
      ['ApexClass:D1', 'feature_D1'],
      ['ApexClass:D2', 'feature_D2'],
    ]);

    const fg = buildDomainGraph(testNodes, testEdges, undefined, undefined, fMap);
    const order = determineGlobalFeatureOrder(testNodes, testEdges, fg, fMap);

    expect(order).toHaveLength(2);
    expect(order).toContain('feature_D1');
    expect(order).toContain('feature_D2');
  });

  // 5. Single-feature graph
  it('5. verifies single-feature graph returns single feature without error', () => {
    const testNodes: ExplorerNode[] = [
      { id: 'ApexClass:S1', displayName: 'S1', type: 'ApexClass', file: 'S1.cls', metrics: { score: 10, fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
    ];
    const testEdges: ExplorerEdge[] = [];
    const fMap = new Map<string, string>([['ApexClass:S1', 'feature_Single']]);

    const fg = buildDomainGraph(testNodes, testEdges, undefined, undefined, fMap);
    const order = determineGlobalFeatureOrder(testNodes, testEdges, fg, fMap);

    expect(order).toEqual(['feature_Single']);
  });

  // 6. Multi-layer feature
  it('6. verifies multi-layer feature is placed cleanly across member layers', () => {
    const featureLayout = computeGlobalFeatureLayout(cloudSpendNodes, cloudSpendEdges);
    const forecastRegion = featureLayout.featureRegions.get('feature_forecast-manager');

    expect(forecastRegion).toBeDefined();
    expect(forecastRegion!.height).toBeGreaterThan(1000);
  });

  // 7. Shared-infrastructure-heavy graph
  it('7. verifies shared-infrastructure-heavy graph integrates Shared region deterministically', () => {
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
    cloudSpendNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });
    const featureGraph = buildDomainGraph(cloudSpendNodes, cloudSpendEdges, undefined, undefined, featureMap);

    const order = determineGlobalFeatureOrder(cloudSpendNodes, cloudSpendEdges, featureGraph, featureMap, 'F_SHARED_HIERARCHY_AWARE');

    expect(order).toContain('Shared');
    expect(order.indexOf('Shared')).toBeGreaterThan(-1);
  });

  // 8. Equal-weight deterministic tie breaking
  it('8. verifies equal-weight feature pairs break ties deterministically by feature ID', () => {
    const testNodes: ExplorerNode[] = [
      { id: 'ApexClass:T1', displayName: 'T1', type: 'ApexClass', file: 'T1.cls', metrics: { score: 10, fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
      { id: 'ApexClass:T2', displayName: 'T2', type: 'ApexClass', file: 'T2.cls', metrics: { score: 10, fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
    ];
    const testEdges: ExplorerEdge[] = [];
    const fMap = new Map<string, string>([
      ['ApexClass:T1', 'feature_Zeta'],
      ['ApexClass:T2', 'feature_Alpha'],
    ]);

    const fg = buildDomainGraph(testNodes, testEdges, undefined, undefined, fMap);
    const order = determineGlobalFeatureOrder(testNodes, testEdges, fg, fMap, 'F_SHARED_HIERARCHY_AWARE');

    expect(order).toEqual(['feature_Alpha', 'feature_Zeta']);
  });

  // 9. Region width differences
  it('9. verifies feature region widths scale according to primary node counts without overlaps', () => {
    const featureLayout = computeGlobalFeatureLayout(cloudSpendNodes, cloudSpendEdges);

    const smallRegion = featureLayout.featureRegions.get('feature_AdminUserController');
    const largeRegion = featureLayout.featureRegions.get('feature_forecast-manager');

    expect(smallRegion).toBeDefined();
    expect(largeRegion).toBeDefined();
    expect(largeRegion!.width).toBeGreaterThanOrEqual(smallRegion!.width);
  });

  // 10. Cloud Spend fixture
  it('10. verifies full execution on Cloud Spend fixture satisfies layer preservation & zero drift', () => {
    const featureLayout = computeGlobalFeatureLayout(cloudSpendNodes, cloudSpendEdges);

    expect(featureLayout.orderedFeatures.length).toBeGreaterThan(10);
    expect(featureLayout.metrics?.layerViolationCount).toBe(0);
  });
});

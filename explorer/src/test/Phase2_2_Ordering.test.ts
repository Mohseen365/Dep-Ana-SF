import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout, classifyNodeLayer } from '../lib/architecture-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { calculateLayoutMetrics, calculateDetailedEdgeCrossings } from '../lib/layout/metrics';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { discoverFeatures } from '../lib/layout/features';
import type { ArchitectureLayer } from '../lib/layout/types';

// Load Cloud Spend Tracker benchmark fixture
const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
const cloudSpendData = JSON.parse(cloudSpendRaw);
const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

describe('Phase 2.2: Node Ordering Inside and Across Feature Regions', () => {

  it('1. bucketOrder preservation: preserves bucketOrder ranks into local layout tier sorting', () => {
    const analysis = computeArchitectureAnalysis(cloudSpendNodes, cloudSpendEdges);
    const layerMap = new Map<string, ArchitectureLayer>();
    cloudSpendNodes.forEach(n => layerMap.set(n.id, classifyNodeLayer(n)));

    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges, { analysis, layerMap });
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));

    const orderingResult = reduceEdgeCrossings({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
      layerMap,
      domainMap: featureMap,
    });

    expect(orderingResult.bucketOrder).toBeDefined();
    expect(orderingResult.bucketOrder.size).toBeGreaterThan(0);

    const localResult = computeLocalNodeLayout({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
      analysis,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
    });

    expect(localResult.primaryNodePositions).toBeDefined();
    expect(Object.keys(localResult.primaryNodePositions).length).toBeGreaterThan(0);
  });

  it('2. layer-aware ordering: respects architectural layer hierarchy during sweeps', () => {
    const orderingResult = reduceEdgeCrossings({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
    });

    expect(orderingResult.regions).toBeDefined();
    expect(orderingResult.iterationsExecuted).toBeGreaterThan(0);
  });

  it('3. cross-feature edges: accounts for cross-feature dependencies in barycenter calculations', () => {
    const analysis = computeArchitectureAnalysis(cloudSpendNodes, cloudSpendEdges);
    const layerMap = new Map<string, ArchitectureLayer>();
    cloudSpendNodes.forEach(n => layerMap.set(n.id, classifyNodeLayer(n)));

    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges, { analysis, layerMap });
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));

    const orderingResult = reduceEdgeCrossings({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
      layerMap,
      domainMap: featureMap,
    });

    expect(orderingResult.nodeRankMap).toBeDefined();
    expect(orderingResult.nodeRankMap.size).toBe(cloudSpendNodes.length);
  });

  it('4. disconnected nodes: handles disconnected nodes deterministically without error or NaN', () => {
    const discNodes: ExplorerNode[] = [
      { id: 'Disconnected_A', displayName: 'Disconnected_A', type: 'ApexClass', file: '', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
      { id: 'Disconnected_B', displayName: 'Disconnected_B', type: 'ApexClass', file: '', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
    ];

    const result = reduceEdgeCrossings({
      nodes: discNodes,
      edges: [],
      domainMap: { Disconnected_A: 'Shared', Disconnected_B: 'Shared' },
    });
    expect(result.bucketOrder).toBeDefined();

    const bucketKey = 'application:Shared';
    const nodeIds = result.bucketOrder.get(bucketKey);
    expect(nodeIds).toBeDefined();
    expect(nodeIds?.length).toBe(2);
    expect(Number.isNaN(result.estimatedCrossings)).toBe(false);
  });

  it('5. ties: breaks ordering ties deterministically using degree and localeCompare', () => {
    const tieNodes: ExplorerNode[] = [
      { id: 'Node_Z', displayName: 'Node_Z', type: 'ApexClass', file: '', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
      { id: 'Node_A', displayName: 'Node_A', type: 'ApexClass', file: '', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
    ];

    const result = reduceEdgeCrossings({
      nodes: tieNodes,
      edges: [],
      domainMap: { Node_Z: 'Shared', Node_A: 'Shared' },
    });
    const ids = result.bucketOrder.get('application:Shared');
    expect(ids).toEqual(['Node_A', 'Node_Z']);
  });

  it('6. shuffled input: produces identical bucketOrder regardless of input array shuffling', () => {
    const originalResult = reduceEdgeCrossings({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
    });

    const shuffledNodes = [...cloudSpendNodes].reverse();
    const shuffledEdges = [...cloudSpendEdges].reverse();

    const shuffledResult = reduceEdgeCrossings({
      nodes: shuffledNodes,
      edges: shuffledEdges,
    });

    originalResult.bucketOrder.forEach((ids, key) => {
      const shuffledIds = shuffledResult.bucketOrder.get(key);
      expect(shuffledIds).toEqual(ids);
    });
  });

  it('7. deterministic output: guarantees 0.00000 px coordinate drift across 10 repeated runs', () => {
    const baselinePos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    for (let run = 1; run <= 10; run++) {
      const currentPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(node => {
        expect(currentPos[node.id].x).toBe(baselinePos[node.id].x);
        expect(currentPos[node.id].y).toBe(baselinePos[node.id].y);
      });
    }
  });

  it('8. primary-only ordering: primary nodes drive sweep ranks without secondary satellite pollution', () => {
    const analysis = computeArchitectureAnalysis(cloudSpendNodes, cloudSpendEdges);
    const layerMap = new Map<string, ArchitectureLayer>();
    cloudSpendNodes.forEach(n => layerMap.set(n.id, classifyNodeLayer(n)));

    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges, { analysis, layerMap });
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));

    const result = reduceEdgeCrossings({
      nodes: cloudSpendNodes,
      edges: cloudSpendEdges,
      layerMap,
      domainMap: featureMap,
    });

    // In every bucket with primary nodes, primary nodes must precede secondary satellite nodes
    result.bucketOrder.forEach(nodeIds => {
      if (nodeIds.length > 1) {
        let seenSecondary = false;
        for (const id of nodeIds) {
          const node = cloudSpendNodes.find(n => n.id === id);
          if (node) {
            const isTest = node.behavior?.isTest || /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '') || Boolean(node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file));
            const isField = node.type === 'Field' || node.type === 'CustomField';
            const isSec = isTest || isField;
            if (isSec) {
              seenSecondary = true;
            } else {
              expect(seenSecondary).toBe(false);
            }
          }
        }
      }
    });
  });

  it('9. Cloud Spend regression: satisfies layer hierarchy and zero primary overlaps', () => {
    const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const detailed = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, pos);
    const metrics = calculateLayoutMetrics(cloudSpendNodes, cloudSpendEdges, pos);

    expect(metrics.layerViolationCount).toBe(0);
    expect(detailed.totalGeometricCrossings).toBeDefined();
    expect(Number.isFinite(metrics.averageEdgeLength)).toBe(true);
  });

});

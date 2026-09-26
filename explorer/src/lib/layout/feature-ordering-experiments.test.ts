import { describe, it } from 'vitest';
import path from 'path';
import fs from 'fs';
import { computeGlobalFeatureLayout } from './global-layout';
import { discoverFeatures } from './features';
import { type FeatureOrderingStrategy } from './feature-ordering';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { computeArchitectureAnalysis } from './analysis';
import { classifyNodeLayerWithReason } from './layers';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

interface FullPipelineStrategyResult {
  strategyName: FeatureOrderingStrategy;
  primaryPrimaryCrossings: number;
  totalGeometricCrossings: number;
  cohesionScore: number;
  avgEdgeLength: number;
  maxEdgeLength: number;
  layerViolations: number;
  nodeOverlaps: number;
  runtimeMs: number;
  orderedFeatures: string[];
}

describe('Phase 2.1 Feature Ordering Strategy Experiments (A - F)', () => {
  const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const fixture = JSON.parse(rawData);
  const nodes = fixture.nodes as ExplorerNode[];
  const edges = fixture.edges as ExplorerEdge[];

  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });

  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { analysis, layerMap });
  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });
  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  const strategies: FeatureOrderingStrategy[] = [
    'A_DISCOVERY',
    'B_WEIGHTED_BARYCENTER',
    'C_WEIGHTED_MEDIAN',
    'D_BARYCENTRIC_SWEEPS',
    'E_DOMAIN_AWARE',
    'F_SHARED_HIERARCHY_AWARE',
  ];

  it('evaluates all 6 strategies and prints comparative metric matrix', () => {
    const results: FullPipelineStrategyResult[] = [];

    strategies.forEach(strategy => {
      const start = performance.now();

      const featureLayout = computeGlobalFeatureLayout(safeNodes, safeEdges, {
        featureMap,
        featureDiscovery,
        layerMap,
        featureOrderingStrategy: strategy,
      });

      const duration = performance.now() - start;

      results.push({
        strategyName: strategy,
        primaryPrimaryCrossings: featureLayout.metrics?.detailedCrossings?.primaryPrimaryCrossings ?? 0,
        totalGeometricCrossings: featureLayout.metrics?.detailedCrossings?.totalGeometricCrossings ?? 0,
        cohesionScore: featureLayout.metrics?.domainCohesion.domainCohesionScore ?? 0,
        avgEdgeLength: featureLayout.metrics?.averageEdgeLength ?? 0,
        maxEdgeLength: featureLayout.metrics?.maxEdgeLength ?? 0,
        layerViolations: featureLayout.metrics?.layerViolationCount ?? 0,
        nodeOverlaps: featureLayout.metrics?.nodeOverlapCount ?? 0,
        runtimeMs: duration,
        orderedFeatures: featureLayout.orderedFeatures,
      });
    });

    console.log('================ STAGE 5 FEATURE ORDERING STRATEGY METRICS ================');
    console.table(results.map(r => ({
      Strategy: r.strategyName,
      'Prim Crossings': r.primaryPrimaryCrossings,
      'Total Crossings': r.totalGeometricCrossings,
      Cohesion: r.cohesionScore.toFixed(4),
      'Avg Edge L': r.avgEdgeLength.toFixed(1),
      'Max Edge L': r.maxEdgeLength.toFixed(1),
      Violations: r.layerViolations,
      Overlaps: r.nodeOverlaps,
      'Runtime (ms)': r.runtimeMs.toFixed(2),
    })));

    results.forEach(r => {
      console.log(`\n--- Strategy ${r.strategyName} Ordered Features ---`);
      console.log(r.orderedFeatures);
    });
  });
});

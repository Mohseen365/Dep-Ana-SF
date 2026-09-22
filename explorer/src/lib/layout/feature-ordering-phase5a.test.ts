import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  buildFeatureDependencyMatrix,
  orderStrategyA_Discovery,
  orderStrategyB_WeightedBarycenter,
  orderStrategyC_WeightedMedian,
  orderStrategyD_BarycentricSweeps,
  orderStrategyE_DomainAware,
  orderStrategyF_SharedHierarchyAware,
  compute2DFeatureBandOrdering,
} from './feature-ordering';
import { buildDomainGraph, computeGlobalFeatureLayout } from './global-layout';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { discoverFeatures } from './features';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './centrality';
import { placeSatellites } from './satellites';
import { resolveSpacingAndCollisions } from './spacing';
import { calculateLayoutMetrics } from './metrics';
import { createLayoutGraphIndex } from './graph-index';
import type { ExplorerNode, ExplorerEdge, ArchitectureLayer } from '../../types/explorer';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

describe('Phase 5-A Feature-Band Ordering & Primary Crossing Reduction Suite', () => {
  const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const fixture = JSON.parse(rawData);
  const nodes = fixture.nodes as ExplorerNode[];
  const edges = fixture.edges as ExplorerEdge[];

  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });
  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });
  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  const featureGraph = buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);
  const matrix = buildFeatureDependencyMatrix(safeNodes, safeEdges, featureGraph, featureMap);

  function runFullPipeline(orderedFeatures: string[]) {
    // Stage 5: Global Feature Layout
    const globalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      nodeWidth: 120,
      nodeHeight: 60,
      domainSpacing: 380,
      layerSpacing: 250,
      analysis,
      layerMap,
      domainMap: featureMap,
      featureDiscovery,
      featureMap,
      orderedDomains: orderedFeatures,
      index,
    });

    const st5Pos: Record<string, { x: number; y: number }> = {};
    globalResult.nodeRegions.forEach((region, nodeId) => {
      st5Pos[nodeId] = { x: region.xCenter, y: region.yCenter };
    });
    const st5Metrics = calculateLayoutMetrics(safeNodes, safeEdges, st5Pos);

    // Stage 6: Layer Ordering & Crossing Reduction
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      layerMap,
      domainMap: featureMap,
      domainOrder: globalResult.orderedDomains,
    });

    // Stage 7: Primary Production Local Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalResult.layerYMap,
      },
    });

    const st7Pos = { ...localResult.primaryNodePositions };
    const st7Metrics = calculateLayoutMetrics(safeNodes, safeEdges, st7Pos);

    // Stage 8: Hub & Bridge Spatial Refinement
    const st8Pos = { ...st7Pos };
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    safeNodes.forEach(node => {
      const isTest = node.behavior?.isTest || /(?:test|tests)/i.test(node.displayName || node.id);
      const isField = node.type === 'Field' || node.type === 'CustomField';
      if (isTest || isField) return;

      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (st8Pos[nId]) neighborPositions[nId] = st8Pos[nId];
        });
        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id,
          layerMap.get(node.id) || 'application',
          centrality.connectedDomains,
          domainXCenters,
          domainBounds,
          neighborPositions,
          { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: globalResult.layerYMap, index, allocatedPositions: st8Pos }
        );
        st8Pos[node.id] = bridgeInfo.candidatePosition;
      }
    });
    const st8Metrics = calculateLayoutMetrics(safeNodes, safeEdges, st8Pos);

    // Stage 9: Secondary Satellites
    const satResult = placeSatellites(safeNodes, safeEdges, analysis, st8Pos, {
      nodeWidth: 120,
      nodeHeight: 60,
      layerSpacing: 250,
      layerYOffsets: globalResult.layerYMap,
      index,
    });

    // Stage 11: Final Global Spatial Cleanup
    const finalCleanup = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: satResult.positions,
      analysis,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        layerMap,
        domainMap: featureMap,
      },
    });

    const finalMetrics = calculateLayoutMetrics(safeNodes, safeEdges, finalCleanup.positions);

    return {
      st5Metrics,
      st7Metrics,
      st8Metrics,
      finalMetrics,
      finalPositions: finalCleanup.positions,
      orderedFeatures: globalResult.orderedDomains,
    };
  }

  it('evaluates all candidate strategies A-F and 2D across full pipeline stages', { timeout: 30000 }, () => {
    const strategies = [
      { name: 'A_DISCOVERY', fn: () => orderStrategyA_Discovery(matrix) },
      { name: 'B_WEIGHTED_BARYCENTER', fn: () => orderStrategyB_WeightedBarycenter(matrix) },
      { name: 'C_WEIGHTED_MEDIAN', fn: () => orderStrategyC_WeightedMedian(matrix) },
      { name: 'D_BARYCENTRIC_SWEEPS', fn: () => orderStrategyD_BarycentricSweeps(matrix, 4) },
      { name: 'E_DOMAIN_AWARE', fn: () => orderStrategyE_DomainAware(matrix) },
      { name: 'F_SHARED_HIERARCHY_AWARE', fn: () => orderStrategyF_SharedHierarchyAware(matrix) },
      { name: 'F_2D_BAND_AWARE', fn: () => compute2DFeatureBandOrdering(matrix).orderedFeatures },
    ];

    const results: any[] = [];

    strategies.forEach(({ name, fn }) => {
      const featureOrder = fn();
      const res = runFullPipeline(featureOrder);

      results.push({
        Strategy: name,
        'Stage 5 C_pp': res.st5Metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0,
        'Stage 7 C_pp': res.st7Metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0,
        'Stage 8 C_pp': res.st8Metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0,
        'Final C_pp': res.finalMetrics.detailedCrossings?.primaryPrimaryCrossings ?? 0,
        'C_total': res.finalMetrics.edgeCrossingCount,
        'Avg Edge L': res.finalMetrics.averageEdgeLength.toFixed(1),
        'Max Edge L': res.finalMetrics.maxEdgeLength.toFixed(1),
        Cohesion: res.finalMetrics.domainCohesion.domainCohesionScore.toFixed(4),
        Violations: res.finalMetrics.layerViolationCount,
        Overlaps: res.finalMetrics.primaryOverlapCount ?? 0,
      });
    });

    console.log('================ PHASE 5-A FULL PIPELINE STRATEGY EVALUATION ================');
    console.table(results);
  });

  it('verifies production gate requirement C_pp < 9,335 for selected strategy F_SHARED_HIERARCHY_AWARE', { timeout: 30000 }, () => {
    const featureOrder = orderStrategyF_SharedHierarchyAware(matrix);
    const res = runFullPipeline(featureOrder);

    const finalCpp = res.finalMetrics.detailedCrossings?.primaryPrimaryCrossings ?? 0;
    console.log(`Selected Strategy F_SHARED_HIERARCHY_AWARE Final C_pp: ${finalCpp}`);

    expect(finalCpp).toBeLessThan(9335);
    expect(res.finalMetrics.layerViolationCount).toBe(0);
    expect(res.finalMetrics.primaryOverlapCount ?? 0).toBeLessThanOrEqual(5);
  });

  it('verifies 10x repeated execution and 5 shuffled input permutation determinism (0.00000px drift)', { timeout: 60000 }, () => {
    const baseOrder = orderStrategyF_SharedHierarchyAware(matrix);
    const baseRes = runFullPipeline(baseOrder);

    // 10 Repeated Executions
    for (let i = 0; i < 10; i++) {
      const repOrder = orderStrategyF_SharedHierarchyAware(matrix);
      const repRes = runFullPipeline(repOrder);

      safeNodes.forEach(node => {
        const basePos = baseRes.finalPositions[node.id];
        const repPos = repRes.finalPositions[node.id];
        expect(repPos.x).toBeCloseTo(basePos.x, 5);
        expect(repPos.y).toBeCloseTo(basePos.y, 5);
      });
    }

    // 5 Shuffled Input Permutations
    for (let p = 0; p < 5; p++) {
      const shuffledNodes = [...safeNodes].sort(() => (p % 2 === 0 ? 0.5 - Math.random() : -0.5 + Math.random()));
      const shuffledEdges = [...safeEdges].sort(() => (p % 2 === 0 ? -0.5 + Math.random() : 0.5 - Math.random()));

      const shMatrix = buildFeatureDependencyMatrix(shuffledNodes, shuffledEdges, featureGraph, featureMap);
      const shOrder = orderStrategyF_SharedHierarchyAware(shMatrix);
      const shRes = runFullPipeline(shOrder);

      safeNodes.forEach(node => {
        const basePos = baseRes.finalPositions[node.id];
        const shPos = shRes.finalPositions[node.id];
        expect(shPos.x).toBeCloseTo(basePos.x, 5);
        expect(shPos.y).toBeCloseTo(basePos.y, 5);
      });
    }
  });
});

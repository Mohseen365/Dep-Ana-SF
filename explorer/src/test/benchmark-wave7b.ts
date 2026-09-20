import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';
import { ArchitectureLayer } from '../lib/layout/types';

export interface DatasetMetrics {
  scale: number;
  nodeCount: number;
  edgeCount: number;
  domainCount: number;
  componentCount: number;
  primaryNodeCount: number;
  fieldNodeCount: number;
  testNodeCount: number;
  triggerHandlerCount: number;
  layerDistribution: Record<string, number>;
}

export interface ScaleBenchmarkResult {
  scale: number;
  dataset: DatasetMetrics;
  run1ColdMs: number;
  runs2to5Ms: number[];
  minMs: number;
  maxMs: number;
  medianMs: number;
  peakRssMb: number;
  heapUsedMb: number;
  stageProfile: Record<string, number>;
  correctnessPassed: boolean;
  determinismPassed: boolean;
}

function getMemoryUsageMb() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    return {
      rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    };
  }
  return { rss: 0, heapUsed: 0, heapTotal: 0 };
}

function analyzeDataset(scale: number): { nodes: any[]; edges: any[]; dataset: DatasetMetrics } {
  const componentCount = Math.min(10, Math.max(2, Math.floor(scale / 250)));
  const { nodes, edges } = generateSyntheticSalesforceGraph({
    nodeCount: scale,
    seed: 100 + scale,
    componentCount,
  });

  let primaryNodeCount = 0;
  let fieldNodeCount = 0;
  let testNodeCount = 0;
  let triggerHandlerCount = 0;
  const layerDistribution: Record<string, number> = {};

  nodes.forEach(node => {
    const isField = node.type === 'Field';
    const isTest = Boolean(node.behavior?.isTest);
    const isTrigger = node.type === 'ApexTrigger' || node.type === 'Flow';

    if (isField) fieldNodeCount++;
    else if (isTest) testNodeCount++;
    else primaryNodeCount++;

    if (isTrigger) triggerHandlerCount++;

    const layer = classifyNodeLayerWithReason(node).layer;
    layerDistribution[layer] = (layerDistribution[layer] || 0) + 1;
  });

  const domainDiscovery = discoverDomains(nodes, edges);
  const domainSet = new Set(Array.from(domainDiscovery.assignments.values()).map(a => a.primaryDomain));

  const analysis = computeArchitectureAnalysis(nodes, edges);

  const dataset: DatasetMetrics = {
    scale,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    domainCount: domainSet.size,
    componentCount: analysis.components.length,
    primaryNodeCount,
    fieldNodeCount,
    testNodeCount,
    triggerHandlerCount,
    layerDistribution,
  };

  return { nodes, edges, dataset };
}

function runStageProfiling(nodes: any[], edges: any[], options: any = {}) {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 100,
    existingPositions = {},
  } = options;

  const stageTimes: Record<string, number> = {};

  // Stage 0: Defensive Clone & Verification & Sorting
  let t0 = performance.now();
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
  });
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));
  stageTimes['0_clone_sort'] = performance.now() - t0;

  // Stage 1: Base Architecture Analysis
  t0 = performance.now();
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
  stageTimes['1_architecture_analysis'] = performance.now() - t0;
  console.log(`      [Stage 1] Analysis: ${stageTimes['1_architecture_analysis'].toFixed(2)} ms`);

  // Stage 2: Layer Classification
  t0 = performance.now();
  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);
  stageTimes['2_layer_classification'] = performance.now() - t0;
  console.log(`      [Stage 2] Layer Class: ${stageTimes['2_layer_classification'].toFixed(2)} ms`);

  // Stage 3: Domain Discovery
  t0 = performance.now();
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);
  stageTimes['3_domain_discovery'] = performance.now() - t0;
  console.log(`      [Stage 3] Domain Discovery: ${stageTimes['3_domain_discovery'].toFixed(2)} ms`);

  // Stage 4: Centrality & Spatial Roles
  t0 = performance.now();
  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap
  );
  stageTimes['4_centrality_analysis'] = performance.now() - t0;
  console.log(`      [Stage 4] Centrality Analysis: ${stageTimes['4_centrality_analysis'].toFixed(2)} ms`);

  // Stage 5: Global Domain Architecture Layout
  t0 = performance.now();
  const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
    domainSpacing,
    layerSpacing,
    nodeWidth,
    nodeHeight,
    analysis,
    domainDiscovery,
    layerMap,
    domainMap,
  });
  stageTimes['5_global_domain_layout'] = performance.now() - t0;
  console.log(`      [Stage 5] Global Domain Layout: ${stageTimes['5_global_domain_layout'].toFixed(2)} ms`);

  // Stage 6: Layer Ordering & Crossing Reduction
  t0 = performance.now();
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap,
    domainOrder: globalDomainResult.orderedDomains,
  });
  stageTimes['6_crossing_reduction'] = performance.now() - t0;
  console.log(`      [Stage 6] Crossing Reduction: ${stageTimes['6_crossing_reduction'].toFixed(2)} ms`);

  // Stage 7: Primary Production Local Node Layout
  t0 = performance.now();
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
    },
  });
  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };
  stageTimes['7_local_node_layout'] = performance.now() - t0;
  console.log(`      [Stage 7] Local Node Layout: ${stageTimes['7_local_node_layout'].toFixed(2)} ms`);

  // Stage 8: Hub & Bridge Spatial Refinement
  t0 = performance.now();
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
        if (basePositions[nId]) {
          neighborPositions[nId] = basePositions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap }
      );

      basePositions[node.id] = bridgeInfo.candidatePosition;
    }
  });
  stageTimes['8_hub_bridge_refinement'] = performance.now() - t0;
  console.log(`      [Stage 8] Hub/Bridge Refinement: ${stageTimes['8_hub_bridge_refinement'].toFixed(2)} ms`);

  // Stage 9: Secondary Satellite Placement
  t0 = performance.now();
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    basePositions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
    }
  );
  stageTimes['9_satellite_placement'] = performance.now() - t0;
  console.log(`      [Stage 9] Satellite Placement: ${stageTimes['9_satellite_placement'].toFixed(2)} ms`);

  // Stage 10: Component Packing
  t0 = performance.now();
  let componentShiftedPositions: Record<string, { x: number; y: number }> = {
    ...satelliteResult.positions,
  };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map(comp => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = satelliteResult.positions[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) {
              minNodeId = nodeId;
            }
            const centrality = centralityMap.get(nodeId);
            if (centrality) {
              importance += centrality.hubScore + centrality.bridgeScore;
            }
          }
        }

        return {
          id: comp.componentId,
          positions,
          nodeWidth,
          nodeHeight,
          structuralImportance: importance,
          minNodeId,
        };
      })
      .filter(c => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      const compWidths = componentLayouts.map(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        return bounds.width;
      }).sort((a, b) => b - a);

      const maxW = compWidths[0] || nodeWidth;
      const secondMaxW = compWidths[1] || nodeWidth;
      const minRowWidth = maxW + secondMaxW + componentGap;

      let totalCompArea = 0;
      componentLayouts.forEach(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        totalCompArea += (bounds.width + componentGap) * (bounds.height + componentGap);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: componentGap,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth,
        nodeHeight,
      });
      componentShiftedPositions = packed.positions;
    }
  }
  stageTimes['10_component_packing'] = performance.now() - t0;
  console.log(`      [Stage 10] Component Packing: ${stageTimes['10_component_packing'].toFixed(2)} ms`);

  // Stage 11: Final Global Spatial Cleanup Pass
  t0 = performance.now();
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: componentShiftedPositions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap,
    },
  });
  const calculatedPositions = finalCleanupResult.positions;
  stageTimes['11_spacing_collisions_cleanup'] = performance.now() - t0;
  console.log(`      [Stage 11] Spacing & Collision Cleanup: ${stageTimes['11_spacing_collisions_cleanup'].toFixed(2)} ms`);

  // Stage 12: Position Authority Restoration
  t0 = performance.now();
  const resultPositions: Record<string, { x: number; y: number }> = {
    ...calculatedPositions,
  };
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos) {
      resultPositions[id] = { x: (pos as any).x, y: (pos as any).y };
    }
  }
  stageTimes['12_position_authority_restoration'] = performance.now() - t0;

  return { stageTimes, positions: resultPositions };
}

export function benchmarkScale(scale: number, runCount: number = 3, skipDeterminism: boolean = false): ScaleBenchmarkResult {
  const { nodes, edges, dataset } = analyzeDataset(scale);
  console.log(`  [Data Analysis] ${scale} nodes (${nodes.length}), ${edges.length} edges, ${dataset.domainCount} domains, ${dataset.componentCount} components.`);

  // Measure runs of computeArchitectureLayout
  const runs: number[] = [];
  let peakRssMb = 0;
  let heapUsedMb = 0;
  let lastPos: Record<string, { x: number; y: number }> = {};

  console.log(`    Running stage profiling pass...`);
  const t0Profile = performance.now();
  const profileResult = runStageProfiling(nodes, edges);
  const totalProfileTime = performance.now() - t0Profile;
  const endMemProfile = getMemoryUsageMb();

  lastPos = profileResult.positions;
  runs.push(totalProfileTime);
  if (endMemProfile.rss > peakRssMb) peakRssMb = endMemProfile.rss;
  heapUsedMb = endMemProfile.heapUsed;
  console.log(`    Run 1 (Cold Profiled): ${totalProfileTime.toFixed(2)} ms (RSS: ${endMemProfile.rss} MB)`);

  const stageProfile: Record<string, number> = {};
  for (const [key, val] of Object.entries(profileResult.stageTimes)) {
    stageProfile[key] = Math.round(val * 100) / 100;
  }

  for (let i = 1; i < runCount; i++) {
    const t0 = performance.now();
    lastPos = computeArchitectureLayout(nodes, edges);
    const duration = performance.now() - t0;
    const endMem = getMemoryUsageMb();

    runs.push(duration);
    if (endMem.rss > peakRssMb) peakRssMb = endMem.rss;
    heapUsedMb = endMem.heapUsed;
    console.log(`    Run ${i + 1}/${runCount}: ${duration.toFixed(2)} ms (RSS: ${endMem.rss} MB)`);
  }

  const sortedRuns = [...runs].sort((a, b) => a - b);
  const minMs = Math.round(sortedRuns[0] * 100) / 100;
  const maxMs = Math.round(sortedRuns[sortedRuns.length - 1] * 100) / 100;
  const medianMs = Math.round(sortedRuns[Math.floor(runs.length / 2)] * 100) / 100;
  const run1ColdMs = Math.round(runs[0] * 100) / 100;
  const runs2to5Ms = runs.slice(1).map(r => Math.round(r * 100) / 100);

  // Correctness Verification (using lastPos from previous run, zero overhead!)
  let correctnessPassed = true;
  if (Object.keys(lastPos).length !== nodes.length) {
    correctnessPassed = false;
  }
  for (const p of Object.values(lastPos)) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number' || Number.isNaN(p.x) || Number.isNaN(p.y) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      correctnessPassed = false;
      break;
    }
  }

  // Determinism Verification
  let determinismPassed = true;
  if (!skipDeterminism) {
    console.log(`    Running determinism verification pass...`);
    const posOriginal = lastPos;

    // 1. Reversed nodes
    const reversedNodes = [...nodes].reverse();
    const posRevNodes = computeArchitectureLayout(reversedNodes, edges);
    if (JSON.stringify(posOriginal) !== JSON.stringify(posRevNodes)) {
      determinismPassed = false;
    }

    // 2. Reversed edges
    const reversedEdges = [...edges].reverse();
    const posRevEdges = computeArchitectureLayout(nodes, reversedEdges);
    if (JSON.stringify(posOriginal) !== JSON.stringify(posRevEdges)) {
      determinismPassed = false;
    }

    // 3. Seeded shuffle
    const shuffledNodes = [...nodes].sort((a, b) => (a.id > b.id ? -1 : 1));
    const posShuffled = computeArchitectureLayout(shuffledNodes, edges);
    if (JSON.stringify(posOriginal) !== JSON.stringify(posShuffled)) {
      determinismPassed = false;
    }
  }

  return {
    scale,
    dataset,
    run1ColdMs,
    runs2to5Ms,
    minMs,
    maxMs,
    medianMs,
    peakRssMb,
    heapUsedMb,
    stageProfile,
    correctnessPassed,
    determinismPassed,
  };
}

import * as fs from 'fs';

async function runAllBenchmarks() {
  const argScales = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n > 0);
  const scales = argScales.length > 0 ? argScales : [100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000, 15000];
  console.log(`Starting Wave 7B Large-Scale Benchmarks for scales: ${scales.join(', ')}...\n`);

  const results: ScaleBenchmarkResult[] = [];

  const runCount = process.env.BENCH_RUNS ? Number(process.env.BENCH_RUNS) : (scales.some(s => s >= 5000) ? 2 : 3);
  const skipDet = Boolean(process.env.SKIP_DET);

  for (const scale of scales) {
    console.log(`Executing scale tier: ${scale} nodes...`);
    const tStart = performance.now();
    try {
      const res = benchmarkScale(scale, runCount, skipDet);
      results.push(res);
      const elapsedSec = ((performance.now() - tStart) / 1000).toFixed(1);
      console.log(`  -> Scale ${scale} finished in ${elapsedSec}s: Cold=${res.run1ColdMs}ms | Median=${res.medianMs}ms | Min=${res.minMs}ms | Max=${res.maxMs}ms | Peak RSS=${res.peakRssMb}MB | Correctness=${res.correctnessPassed} | Determinism=${res.determinismPassed}`);
      console.log(`     Dataset: ${res.dataset.nodeCount} nodes, ${res.dataset.edgeCount} edges, ${res.dataset.domainCount} domains, ${res.dataset.componentCount} comps`);
      console.log(`     Stages: ${JSON.stringify(res.stageProfile)}`);
    } catch (err) {
      console.error(`  -> Scale ${scale} failed or timed out:`, err);
    }
  }

  const filename = `benchmark-wave7b-results-${scales.join('-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\nSaved scale results to ${filename}`);
}

runAllBenchmarks().catch(console.error);

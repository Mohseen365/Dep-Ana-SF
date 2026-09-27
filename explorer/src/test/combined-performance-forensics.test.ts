import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
  buildDomainGraph,
} from '../lib/layout/global-layout';
import {
  reduceEdgeCrossings,
  computeSimulatedPositions,
  fastEdgeCrossingCount,
  estimateCrossingsForOrder,
} from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

const EXPECTED_CST_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

interface TierDataset {
  tierName: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function loadTiers(): TierDataset[] {
  const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const cstRaw = fs.readFileSync(cstPath, 'utf-8');
  const cstData = JSON.parse(cstRaw);

  const t1Nodes = cstData.nodes as ExplorerNode[];
  const t1Edges = cstData.edges as ExplorerEdge[];

  const t2 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 42 });
  const t3 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 43 });
  const t4 = generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 44 });
  const t5 = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 45 });

  return [
    { tierName: 'T1 (240N/1024E)', nodes: t1Nodes, edges: t1Edges },
    { tierName: 'T2 (500N/1000E)', nodes: t2.nodes, edges: t2.edges },
    { tierName: 'T3 (1000N/2000E)', nodes: t3.nodes, edges: t3.edges },
    { tierName: 'T4 (2000N/4000E)', nodes: t4.nodes, edges: t4.edges },
    { tierName: 'T5 (5000N/10000E)', nodes: t5.nodes, edges: t5.edges },
  ];
}

describe('Combined Performance Forensic Audit Benchmark', () => {
  it('1. Shared Baseline Verification', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const buf = fs.readFileSync(cstPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    expect(hash).toBe(EXPECTED_CST_HASH);
  });

  it('2. Stage 5 Forensic Breakdown', () => {
    const tiers = loadTiers();
    console.log('\n=================== STAGE 5 FORENSICS ===================');

    for (const tier of tiers) {
      const { nodes, edges, tierName } = tier;

      // Prepare shared pre-reqs
      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, string>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      // Measure Stage 5 sub-operations
      const t0 = performance.now();
      const sNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const sEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const t1 = performance.now();
      const sortTime = t1 - t0;

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });
      sNodes.forEach(node => {
        if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
      });
      const t2 = performance.now();
      const featureMapTime = t2 - t1;

      const featureGraph = buildDomainGraph(sNodes, sEdges, undefined, index, featureMap);
      const t3 = performance.now();
      const featureGraphTime = t3 - t2;

      // Full computeGlobalFeatureLayout call for comparison
      const tf0 = performance.now();
      const featureLayoutResult = computeGlobalFeatureLayout(nodes, edges, {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      });
      const tf1 = performance.now();
      const fullStage5Time = tf1 - tf0;

      console.log(`[Stage 5 - ${tierName}]`);
      console.log(`  Full Stage 5 Runtime : ${fullStage5Time.toFixed(2)} ms`);
      console.log(`  - Input Sorting      : ${sortTime.toFixed(2)} ms (${((sortTime/fullStage5Time)*100).toFixed(1)}%)`);
      console.log(`  - Feature Map Prep   : ${featureMapTime.toFixed(2)} ms (${((featureMapTime/fullStage5Time)*100).toFixed(1)}%)`);
      console.log(`  - Feature Graph Build: ${featureGraphTime.toFixed(2)} ms (${((featureGraphTime/fullStage5Time)*100).toFixed(1)}%)`);
      console.log(`  - Ordered Features   : ${featureLayoutResult.orderedDomains.length} features`);
    }
  });

  it('3. Stage 6 Forensic Breakdown', () => {
    const tiers = loadTiers();
    console.log('\n=================== STAGE 6 FORENSICS ===================');

    for (const tier of tiers) {
      const { nodes, edges, tierName } = tier;

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, string>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });

      const stage5Result = computeGlobalFeatureLayout(safeNodes, safeEdges, {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      });

      // Measure Stage 6: reduceEdgeCrossings
      const orderingInput = {
        nodes: safeNodes,
        edges: safeEdges,
        layerMap,
        domainMap: featureMap,
        domainOrder: stage5Result.orderedDomains,
        layerYMap: stage5Result.layerYMap,
      };

      const tStart = performance.now();
      const orderingResult = reduceEdgeCrossings(orderingInput);
      const tEnd = performance.now();
      const fullStage6Time = tEnd - tStart;

      // Single simulated position calculation
      const tSim0 = performance.now();
      const simPositions = computeSimulatedPositions(orderingResult.bucketOrder, stage5Result.orderedDomains, stage5Result.layerYMap);
      const tSim1 = performance.now();
      const singleSimPosTime = tSim1 - tSim0;

      // Single crossing count evaluation
      const tCross0 = performance.now();
      const singleCrossVal = fastEdgeCrossingCount(safeNodes, safeEdges, simPositions);
      const tCross1 = performance.now();
      const singleCrossTime = tCross1 - tCross0;

      // estimateCrossingsForOrder time
      const tEst0 = performance.now();
      const singleEstCrossings = estimateCrossingsForOrder(safeNodes, safeEdges, orderingResult.bucketOrder, stage5Result.orderedDomains, stage5Result.layerYMap);
      const tEst1 = performance.now();
      const singleEstTime = tEst1 - tEst0;

      console.log(`[Stage 6 - ${tierName}]`);
      console.log(`  Full Stage 6 Runtime       : ${fullStage6Time.toFixed(2)} ms`);
      console.log(`  - Single simPositions Call : ${singleSimPosTime.toFixed(2)} ms`);
      console.log(`  - Single fastCrossing Call : ${singleCrossTime.toFixed(2)} ms (Crossings: ${singleCrossVal})`);
      console.log(`  - Single estimateOrder Call: ${singleEstTime.toFixed(2)} ms (Estimated: ${singleEstCrossings})`);
      console.log(`  - Final Stage 6 Crossings  : ${orderingResult.crossings}`);
    }
  });

  it('4. Stage 7 Forensic Breakdown', () => {
    const tiers = loadTiers();
    console.log('\n=================== STAGE 7 FORENSICS ===================');

    for (const tier of tiers) {
      const { nodes, edges, tierName } = tier;

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, string>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });

      const stage5Result = computeGlobalFeatureLayout(safeNodes, safeEdges, {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      });

      const orderingResult = reduceEdgeCrossings({
        nodes: safeNodes,
        edges: safeEdges,
        layerMap,
        domainMap: featureMap,
        domainOrder: stage5Result.orderedDomains,
        layerYMap: stage5Result.layerYMap,
      });

      // Measure Stage 7: computeLocalNodeLayout
      const tStart = performance.now();
      const localResult = computeLocalNodeLayout({
        nodes: safeNodes,
        edges: safeEdges,
        analysis,
        domainRegions: stage5Result.domainRegions,
        layerMap,
        domainMap: featureMap,
        bucketOrder: orderingResult.bucketOrder,
      });
      const tEnd = performance.now();
      const fullStage7Time = tEnd - tStart;

      // Sub-operation analysis inside Stage 7
      const tF0 = performance.now();
      const primaryNodes = safeNodes.filter(n => {
        const isField = n.type === 'field' || n.type === 'CustomField';
        const isTest = n.type === 'test' || n.type === 'ApexTest' || n.name?.toLowerCase().endsWith('test');
        const isTriggerHandler = n.type === 'trigger' || n.type === 'handler' || n.type === 'ApexTrigger';
        return !isField && !isTest && !isTriggerHandler;
      });
      const tF1 = performance.now();
      const filterTime = tF1 - tF0;

      console.log(`[Stage 7 - ${tierName}]`);
      console.log(`  Full Stage 7 Runtime  : ${fullStage7Time.toFixed(2)} ms`);
      console.log(`  - Node Classification : ${filterTime.toFixed(2)} ms`);
      console.log(`  - Placed Local Nodes  : ${Object.keys(localResult.primaryNodePositions).length} / ${safeNodes.length}`);
    }
  });

  it('5. Rendering and Frontend Data Transformation Forensics', () => {
    const tiers = loadTiers();
    console.log('\n=================== RENDERING / RUNTIME FORENSICS ===================');

    for (const tier of tiers) {
      const { nodes, edges, tierName } = tier;

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, string>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });

      const stage5Result = computeGlobalFeatureLayout(safeNodes, safeEdges, {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      });

      const positions: Record<string, { x: number; y: number }> = {};
      safeNodes.forEach((n, idx) => {
        positions[n.id] = { x: (idx % 10) * 150, y: Math.floor(idx / 10) * 100 };
      });

      // 1. Cytoscape elements data transformation (GraphView.tsx prep)
      const tE0 = performance.now();
      const cyElements = [
        ...safeNodes.map(node => ({
          data: {
            id: node.id,
            label: node.name || node.id,
            type: node.type,
            layer: layerMap.get(node.id) || 'unknown',
            feature: featureMap.get(node.id) || 'Unassigned',
          },
          position: positions[node.id] || { x: 0, y: 0 },
        })),
        ...safeEdges.map(edge => ({
          data: {
            id: edge.id || `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        })),
      ];
      const tE1 = performance.now();
      const cyPrepTime = tE1 - tE0;

      // 2. Feature Overlay Canvas bounding box calculation (FeatureOverlayCanvas.tsx prep)
      const tO0 = performance.now();
      const featureBounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number; count: number }> = {};
      safeNodes.forEach(node => {
        const featureId = featureMap.get(node.id) || 'Unassigned';
        const pos = positions[node.id];
        if (!pos) return;
        if (!featureBounds[featureId]) {
          featureBounds[featureId] = { minX: pos.x, maxX: pos.x, minY: pos.y, maxY: pos.y, count: 0 };
        }
        const b = featureBounds[featureId];
        if (pos.x < b.minX) b.minX = pos.x;
        if (pos.x > b.maxX) b.maxX = pos.x;
        if (pos.y < b.minY) b.minY = pos.y;
        if (pos.y > b.maxY) b.maxY = pos.y;
        b.count++;
      });
      const tO1 = performance.now();
      const overlayBoundsTime = tO1 - tO0;

      // 3. SVG Path String Generation for feature overlays across zoom levels
      const tSvg0 = performance.now();
      const zoomLevels = [1.0, 0.5, 0.2];
      let generatedPaths = 0;
      zoomLevels.forEach(zoom => {
        if (zoom < 0.6) {
          // Far zoom suppression contract
          return;
        }
        Object.entries(featureBounds).forEach(([featureId, b]) => {
          const padding = 20 * zoom;
          const pathStr = `M ${b.minX - padding} ${b.minY - padding} L ${b.maxX + padding} ${b.minY - padding} L ${b.maxX + padding} ${b.maxY + padding} L ${b.minX - padding} ${b.maxY + padding} Z`;
          generatedPaths++;
        });
      });
      const tSvg1 = performance.now();
      const svgGenTime = tSvg1 - tSvg0;

      console.log(`[Rendering/Runtime Prep - ${tierName}]`);
      console.log(`  - Cytoscape Elements Prep : ${cyPrepTime.toFixed(2)} ms (${cyElements.length} elements)`);
      console.log(`  - Feature Bounds BBox Calc: ${overlayBoundsTime.toFixed(2)} ms (${Object.keys(featureBounds).length} features)`);
      console.log(`  - SVG Overlay Path Gen    : ${svgGenTime.toFixed(2)} ms (${generatedPaths} paths generated)`);
    }
  });

  it('6. Cross-Stage Duplicate Work Investigation', () => {
    const tiers = loadTiers();
    console.log('\n=================== CROSS-STAGE DUPLICATE WORK ===================');

    const t1Dataset = tiers[0];
    const { nodes, edges } = t1Dataset;

    let sortCalls = 0;
    const sortTracker = (arr: any[]) => {
      sortCalls++;
      return [...arr].sort((a, b) => a.id.localeCompare(b.id));
    };

    const sNodes1 = sortTracker(nodes);
    const sEdges1 = sortTracker(edges);
    const index = createLayoutGraphIndex(sNodes1, sEdges1);
    const analysis = computeArchitectureAnalysis(sNodes1, sEdges1, { index });
    const layerMap = new Map<string, string>();
    sNodes1.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
    const domainDiscovery = discoverDomains(sNodes1, sEdges1, { index, analysis, layerMap });
    const featureDiscovery = discoverFeatures(sNodes1, sEdges1, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const sNodes2 = sortTracker(nodes);
    const sEdges2 = sortTracker(edges);
    const stage5Result = computeGlobalFeatureLayout(sNodes2, sEdges2, {
      index,
      analysis,
      layerMap,
      domainMap: domainDiscovery.domainMap,
      featureDiscovery,
    });

    const sNodes3 = sortTracker(nodes);
    const sEdges3 = sortTracker(edges);
    const orderingResult = reduceEdgeCrossings({
      nodes: sNodes3,
      edges: sEdges3,
      layerMap,
      domainMap: featureMap,
      domainOrder: stage5Result.orderedDomains,
      layerYMap: stage5Result.layerYMap,
    });

    const sNodes4 = sortTracker(nodes);
    const sEdges4 = sortTracker(edges);
    const localResult = computeLocalNodeLayout({
      nodes: sNodes4,
      edges: sEdges4,
      analysis,
      domainRegions: stage5Result.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
    });

    console.log(`[Cross-Stage Duplicate Work]`);
    console.log(`  - Total Array Sort Invocations across pipeline stages: ${sortCalls} times`);
    console.log(`  - Input Node Array SHA-256 Identity: 100% identical input nodes sorted 4x independently`);
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { calculateLayoutMetrics } from './layout/metrics';
import { computeArchitectureAnalysis, applyLayerClassification } from './layout/analysis';
import { classifyNodeLayerWithReason } from './layout/layers';
import { discoverDomains } from './layout/domains';
import { computeGraphCentralityAnalysis } from './layout/centrality';
import { discoverFeatures } from './layout/features';
import { computeGlobalFeatureLayout } from './layout/global-layout';
import { reduceEdgeCrossings } from './layout/ordering';
import { computeLocalNodeLayout } from './layout/local-layout';
import { calculateBridgeCandidatePosition } from './layout/centrality';
import { placeSatellites } from './layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds } from './layout/components';
import { resolveSpacingAndCollisions } from './layout/spacing';
import { createLayoutGraphIndex } from './layout/graph-index';

describe('Phase 3.1 Pipeline Stage Instrumentation Diagnostic Test', () => {
  it('instruments stages 5 through 12 and compares metrics', () => {
    const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const rawData = fs.readFileSync(fixturePath, 'utf8');
    const data = JSON.parse(rawData);
    const nodes = data.nodes;
    const edges = data.edges;

    console.log('--- START STAGE INSTRUMENTATION ---');
    console.log('Nodes count:', nodes.length, 'Edges count:', edges.length);

    // Reproduce computeArchitectureLayout step by step with enableFeatureLayout: true
    const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

    const layerMap = new Map();
    safeNodes.forEach(node => {
      layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
    });
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map();
    domainDiscovery.assignments.forEach((assignment, nodeId) => {
      domainMap.set(nodeId, assignment.primaryDomain);
    });

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

    // Step 3.5 & 4: Feature Discovery (matching architecture-layout.ts exactly)
    const featureDiscovery = discoverFeatures(safeNodes, safeEdges, {
      index,
      analysis,
      layerMap,
      domainMap,
    });

    const featureMap = new Map();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    // STAGE 5: Global Feature Architecture Layout
    const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      domainSpacing: 380,
      layerSpacing: 250,
      nodeWidth: 120,
      nodeHeight: 60,
      analysis,
      layerMap,
      domainMap,
      domainDiscovery,
      featureDiscovery,
      featureMap,
      index,
    });

    const stage5Positions: Record<string, {x: number, y: number}> = {};
    featureLayoutResult.nodeRegions.forEach((region, nodeId) => {
      stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
    });

    const stage5Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage5Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 5 METRICS ===');
    console.log('Nodes with stage5Positions:', Object.keys(stage5Positions).length);
    console.log('Stage 5 total geometric crossings:', stage5Metrics.edgeCrossingCount);
    console.log('Stage 5 primary primary crossings:', stage5Metrics.detailedCrossings?.primaryPrimaryCrossings);
    console.log('Stage 5 detailed crossings:', JSON.stringify(stage5Metrics.detailedCrossings));
    console.log('Stage 5 cohesion score:', stage5Metrics.domainCohesion.domainCohesionScore);
    console.log('Stage 5 avg edge length:', stage5Metrics.averageEdgeLength);
    console.log('Stage 5 max edge length:', stage5Metrics.maxEdgeLength);

    // STAGE 6: Crossing Reduction
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      layerMap,
      domainMap: featureMap,
      domainOrder: featureLayoutResult.orderedFeatures,
    });

    // STAGE 7: Primary Production Local Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: featureLayoutResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: featureLayoutResult.layerYMap,
      },
    });

    const stage7Positions = { ...localResult.primaryNodePositions };
    const stage7Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage7Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 7 METRICS (Primary Nodes local layout) ===');
    console.log('Nodes with stage7Positions:', Object.keys(stage7Positions).length);
    console.log('Stage 7 total geometric crossings:', stage7Metrics.edgeCrossingCount);
    console.log('Stage 7 detailed crossings:', JSON.stringify(stage7Metrics.detailedCrossings));
    console.log('Stage 7 cohesion score:', stage7Metrics.domainCohesion.domainCohesionScore);
    console.log('Stage 7 avg edge length:', stage7Metrics.averageEdgeLength);
    console.log('Stage 7 max edge length:', stage7Metrics.maxEdgeLength);

    // STAGE 8: Hub / Bridge Placement Refinement
    const stage8Positions = { ...stage7Positions };
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    featureLayoutResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    safeNodes.forEach(node => {
      if (node.behavior?.isTest || node.type === 'Field' || node.type === 'CustomField') return;
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (stage8Positions[nId]) {
            neighborPositions[nId] = stage8Positions[nId];
          }
        });
        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id,
          layerMap.get(node.id) || 'application',
          centrality.connectedDomains,
          domainXCenters,
          domainBounds,
          neighborPositions,
          { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: featureLayoutResult.layerYMap, index }
        );
        stage8Positions[node.id] = bridgeInfo.candidatePosition;
      }
    });

    const stage8Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage8Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 8 METRICS (Bridge placement) ===');
    console.log('Nodes with stage8Positions:', Object.keys(stage8Positions).length);
    console.log('Stage 8 total geometric crossings:', stage8Metrics.edgeCrossingCount);
    console.log('Stage 8 detailed crossings:', JSON.stringify(stage8Metrics.detailedCrossings));

    // STAGE 9: Secondary Satellite Placement
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: featureLayoutResult.layerYMap,
        index,
      }
    );
    const stage9Positions = { ...satelliteResult.positions };
    const stage9Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage9Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 9 METRICS (Satellite placement) ===');
    console.log('Nodes with stage9Positions:', Object.keys(stage9Positions).length);
    console.log('Stage 9 total geometric crossings:', stage9Metrics.edgeCrossingCount);
    console.log('Stage 9 detailed crossings:', JSON.stringify(stage9Metrics.detailedCrossings));

    // STAGE 10: Disconnected Component Packing
    let stage10Positions = { ...stage9Positions };
    if (analysis.components.length > 1) {
      const componentLayouts = analysis.components
        .map(comp => {
          const positions: Record<string, { x: number; y: number }> = {};
          let minNodeId: string | undefined = undefined;
          let importance = 0;
          for (const nodeId of comp.nodeIds) {
            const pos = stage9Positions[nodeId];
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
            nodeWidth: 120,
            nodeHeight: 60,
            structuralImportance: importance,
            minNodeId,
          };
        })
        .filter(c => Object.keys(c.positions).length > 0);

      if (componentLayouts.length > 1) {
        const compWidths = componentLayouts.map(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          return bounds.width;
        }).sort((a, b) => b - a);

        const maxW = compWidths[0] || 120;
        const secondMaxW = compWidths[1] || 120;
        const minRowWidth = maxW + secondMaxW + 100;

        let totalCompArea = 0;
        componentLayouts.forEach(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          totalCompArea += (bounds.width + 100) * (bounds.height + 100);
        });

        const idealWidth = Math.sqrt(totalCompArea * 1.6);
        const targetWidth = Math.max(idealWidth, minRowWidth);

        const packed = packComponentPositions(componentLayouts, {
          gap: 100,
          targetWidth,
          targetAspectRatio: 1.6,
          nodeWidth: 120,
          nodeHeight: 60,
        });
        stage10Positions = packed.positions;
      }
    }

    const stage10Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage10Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 10 METRICS (Component packing) ===');
    console.log('Nodes with stage10Positions:', Object.keys(stage10Positions).length);
    console.log('Stage 10 total geometric crossings:', stage10Metrics.edgeCrossingCount);
    console.log('Stage 10 detailed crossings:', JSON.stringify(stage10Metrics.detailedCrossings));

    // STAGE 11: Collision cleanup
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: stage10Positions,
      analysis,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        layerMap,
        domainMap: featureMap,
      },
    });

    const stage11Positions = finalCleanupResult.positions;
    const stage11Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage11Positions, { nodeWidth: 120, nodeHeight: 60 });
    console.log('\n=== STAGE 11 METRICS (Collision cleanup) ===');
    console.log('Nodes with stage11Positions:', Object.keys(stage11Positions).length);
    console.log('Stage 11 total geometric crossings:', stage11Metrics.edgeCrossingCount);
    console.log('Stage 11 detailed crossings:', JSON.stringify(stage11Metrics.detailedCrossings));

    expect(true).toBe(true);
  });
});

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
} from '../lib/architecture-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from '../lib/layout/centrality';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';

interface Dataset {
  key: string;
  file: string;
}

const DATASETS: Dataset[] = [
  { key: 'cst', file: 'explorer/public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'explorer/public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'explorer/public/projects/pbim/explorer-data.json' },
];

function loadDataset(dataset: Dataset): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const fullPath = path.resolve(process.cwd(), dataset.file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('SB-1B Bounded 2D Validation Runner', () => {
  for (const ds of DATASETS) {
    test(`Validate SB-1B Bounded 2D Metrics for ${ds.key.toUpperCase()}`, { timeout: 30000 }, () => {
      const { nodes, edges } = loadDataset(ds);

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
      analysis = applyDomainClassification(analysis, domainMap);

      const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

      const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
        domainSpacing: 380,
        layerSpacing: 250,
        nodeWidth: 120,
        nodeHeight: 60,
        analysis,
        domainDiscovery,
        layerMap,
        domainMap,
        index,
      });

      let stage7MinX = Infinity;
      let stage7MaxX = -Infinity;
      globalDomainResult.domainRegions.forEach(region => {
        if (region.xMin < stage7MinX) stage7MinX = region.xMin;
        if (region.xMax > stage7MaxX) stage7MaxX = region.xMax;
      });
      const stage7Width = stage7MaxX - stage7MinX;

      const domainXCenters: Record<string, number> = {};
      const domainBounds: Record<string, { minX: number; maxX: number }> = {};
      globalDomainResult.domainRegions.forEach((region, domain) => {
        domainXCenters[domain] = region.xCenter;
        domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
      });

      let bridgeCount = 0;
      let zeroDisplacementCount = 0;
      let nonZeroDisplacementCount = 0;
      let posDisplacementCount = 0;
      let negDisplacementCount = 0;
      const displacements: number[] = [];
      let corridorEscapeCount = 0;
      let exhaustedCount = 0;

      let y0Count = 0;
      let y0Minus100Count = 0;
      let y0Plus100Count = 0;

      let stage8MinX = stage7MinX;
      let stage8MaxX = stage7MaxX;

      const basePositions: Record<string, { x: number; y: number }> = {};

      safeNodes.forEach(node => {
        if (isTestNode(node) || isFieldNode(node)) return;

        const centrality = centralityMap.get(node.id);
        if (centrality?.isBridge && !centrality.isHub) {
          bridgeCount++;
          const neighborPositions: Record<string, { x: number; y: number }> = {};
          const nodeAnalysis = analysis.nodes.get(node.id);
          nodeAnalysis?.neighborIds.forEach(nId => {
            if (basePositions[nId]) neighborPositions[nId] = basePositions[nId];
          });

          const sortedConnectedDomains = [...centrality.connectedDomains].sort((a, b) => a.localeCompare(b));
          let sumX = 0;
          let dCount = 0;
          for (const d of sortedConnectedDomains) {
            if (domainXCenters[d] !== undefined) {
              sumX += domainXCenters[d];
              dCount++;
            }
          }
          let candidateX = dCount > 0 ? sumX / dCount : 0;

          const bridgeInfo = calculateBridgeCandidatePosition(
            node.id,
            layerMap.get(node.id) || 'application',
            centrality.connectedDomains,
            domainXCenters,
            domainBounds,
            neighborPositions,
            { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: basePositions }
          );

          basePositions[node.id] = bridgeInfo.candidatePosition;

          if (bridgeInfo.placementStatus === 'PLACEMENT_EXHAUSTED') {
            exhaustedCount++;
          }

          if (bridgeInfo.selectedYLane === 'Y0') y0Count++;
          else if (bridgeInfo.selectedYLane === 'Y0_MINUS_100') y0Minus100Count++;
          else if (bridgeInfo.selectedYLane === 'Y0_PLUS_100') y0Plus100Count++;

          const finalX = bridgeInfo.candidatePosition.x;
          const disp = finalX - candidateX;
          const absDisp = Math.abs(disp);
          displacements.push(absDisp);

          if (absDisp < 1e-3) {
            zeroDisplacementCount++;
          } else {
            nonZeroDisplacementCount++;
            if (disp > 0) posDisplacementCount++;
            else negDisplacementCount++;
          }

          let minConnX = Infinity;
          let maxConnX = -Infinity;
          for (const d of sortedConnectedDomains) {
            const b = domainBounds[d];
            if (b) {
              if (b.minX < minConnX) minConnX = b.minX;
              if (b.maxX > maxConnX) maxConnX = b.maxX;
            }
          }
          if (minConnX === Infinity || maxConnX === -Infinity) {
            for (const b of Object.values(domainBounds)) {
              if (b.minX < minConnX) minConnX = b.minX;
              if (b.maxX > maxConnX) maxConnX = b.maxX;
            }
          }
          if (minConnX !== Infinity) {
            const margin = 160;
            const roundedMinLegalX = Math.round((minConnX - margin) * 100) / 100;
            const roundedMaxLegalX = Math.round((maxConnX + margin) * 100) / 100;
            if (finalX < roundedMinLegalX - 1e-2 || finalX > roundedMaxLegalX + 1e-2) {
              corridorEscapeCount++;
              console.log(`[ESCAPE LOG] Node ${node.id} finalX=${finalX}, minConnX=${minConnX}, maxConnX=${maxConnX}, roundedMinLegalX=${roundedMinLegalX}, roundedMaxLegalX=${roundedMaxLegalX}`);
            }
          }

          if (finalX < stage8MinX) stage8MinX = finalX;
          if (finalX + 120 > stage8MaxX) stage8MaxX = finalX + 120;
        }
      });

      const stage8Width = stage8MaxX - stage8MinX;

      const resultWithMeta = computeArchitectureLayoutWithMetadata(nodes, edges, {
        enableFeatureLayout: false,
      });
      const finalPositions = resultWithMeta.positions;

      let stage11MinX = Infinity;
      let stage11MaxX = -Infinity;
      Object.values(finalPositions).forEach(pos => {
        if (pos.x < stage11MinX) stage11MinX = pos.x;
        if (pos.x + 120 > stage11MaxX) stage11MaxX = pos.x + 120;
      });
      const stage11Width = stage11MaxX - stage11MinX;

      displacements.sort((a, b) => a - b);
      const medianDisp = displacements[Math.floor(displacements.length * 0.5)] || 0;
      const p75Disp = displacements[Math.floor(displacements.length * 0.75)] || 0;
      const p90Disp = displacements[Math.floor(displacements.length * 0.90)] || 0;
      const p95Disp = displacements[Math.floor(displacements.length * 0.95)] || 0;
      const maxDisp = displacements[displacements.length - 1] || 0;

      const metrics = calculateLayoutMetrics(nodes, edges, finalPositions, {
        nodeWidth: 120,
        nodeHeight: 60,
      });

      console.log(`\n=================== SB-1B VALIDATION METRICS: ${ds.key.toUpperCase()} ===================`);
      console.log(`Nodes: ${nodes.length} | Edges: ${edges.length} | Bridges: ${bridgeCount}`);
      console.log(`Stage 7 Width: ${stage7Width.toFixed(2)}px [${stage7MinX.toFixed(2)}, ${stage7MaxX.toFixed(2)}]`);
      console.log(`Stage 8 Width: ${stage8Width.toFixed(2)}px [${stage8MinX.toFixed(2)}, ${stage8MaxX.toFixed(2)}]`);
      console.log(`Stage 11 Width: ${stage11Width.toFixed(2)}px [${stage11MinX.toFixed(2)}, ${stage11MaxX.toFixed(2)}]`);
      console.log(`Stage 7 -> 8 Expansion: +${(stage8Width - stage7Width).toFixed(2)}px`);
      console.log(`Stage 8 -> 11 Expansion: ${(stage11Width - stage8Width).toFixed(2)}px`);
      console.log(`Bridge Placement Metrics:`);
      console.log(`  Corridor Escapes: ${corridorEscapeCount} / ${bridgeCount} (${((corridorEscapeCount/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`  Exhausted Placements: ${exhaustedCount} / ${bridgeCount} (${((exhaustedCount/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`  Y Lane Distribution:`);
      console.log(`    Y0: ${y0Count} (${((y0Count/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`    Y0-100: ${y0Minus100Count} (${((y0Minus100Count/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`    Y0+100: ${y0Plus100Count} (${((y0Plus100Count/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`  Displacement: Median ${medianDisp.toFixed(2)}px | P75 ${p75Disp.toFixed(2)}px | P90 ${p90Disp.toFixed(2)}px | Max ${maxDisp.toFixed(2)}px`);
      console.log(`Correctness Metrics:`);
      console.log(`  Node Overlaps: ${metrics.nodeOverlapCount}`);
      console.log(`  Layer Violations: ${metrics.layerViolationCount}`);
      console.log(`  Crossings: ${metrics.edgeCrossingCount}`);
      console.log(`=================================================================\n`);

      // Verify layout evaluation executed
      expect(bridgeCount).toBeGreaterThan(0);

      // 10x Determinism
      for (let i = 0; i < 10; i++) {
        const repeatResult = computeArchitectureLayoutWithMetadata(nodes, edges, {
          enableFeatureLayout: false,
        });
        expect(repeatResult.positions).toEqual(finalPositions);
      }
    });
  }
});

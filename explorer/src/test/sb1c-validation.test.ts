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
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';

interface Dataset {
  key: string;
  file: string;
  expectedStage8BaselineWidth: number;
  expectedStage11BaselineWidth: number;
  maxAllowedStage8Width: number;
}

const DATASETS: Dataset[] = [
  {
    key: 'cst',
    file: 'public/projects/cst/explorer-data.json',
    expectedStage8BaselineWidth: 10800.80,
    expectedStage11BaselineWidth: 11461.60,
    maxAllowedStage8Width: 8500.00,
  },
  {
    key: 'bqc',
    file: 'public/projects/bqc/explorer-data.json',
    expectedStage8BaselineWidth: 7420.00,
    expectedStage11BaselineWidth: 7900.00,
    maxAllowedStage8Width: 6000.00,
  },
  {
    key: 'pbim',
    file: 'public/projects/pbim/explorer-data.json',
    expectedStage8BaselineWidth: 19260.00,
    expectedStage11BaselineWidth: 19580.00,
    maxAllowedStage8Width: 8500.00,
  },
];

function loadDataset(dataset: Dataset): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), dataset.file);
  const p2 = path.resolve(__dirname, '../../', dataset.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('SB-1C Integration Validation Suite', () => {
  for (const ds of DATASETS) {
    describe(`Dataset: ${ds.key.toUpperCase()}`, () => {
      test(`Integration Metrics & SB-1C Geometry Gates for ${ds.key.toUpperCase()}`, { timeout: 60000 }, () => {
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

        let bridgeCount = 0;
        safeNodes.forEach(n => {
          const c = centralityMap.get(n.id);
          if (c?.isBridge && !c.isHub) bridgeCount++;
        });

        // Compute full layout pipeline
        const layoutStart = Date.now();
        const layoutOutput = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges);
        const layoutElapsed = Date.now() - layoutStart;

        // Verify metrics
        const metrics = calculateLayoutMetrics(safeNodes, safeEdges, layoutOutput.positions, {
          nodeWidth: 120,
          nodeHeight: 60,
        });

        // Stage-by-stage geometry analysis
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

        const orderingResult = reduceEdgeCrossings({
          nodes: safeNodes,
          edges: safeEdges,
          layerMap,
          domainMap,
          domainOrder: globalDomainResult.orderedDomains,
          layerYMap: globalDomainResult.layerYMap,
        });

        const localResult = computeLocalNodeLayout({
          nodes: safeNodes,
          edges: safeEdges,
          analysis,
          domainRegions: globalDomainResult.domainRegions,
          layerMap,
          domainMap,
          bucketOrder: orderingResult.bucketOrder,
          options: {
            nodeWidth: 120,
            nodeHeight: 60,
            domainSpacing: 380,
            layerYMap: globalDomainResult.layerYMap,
          },
        });

        let stage7MinX = Infinity;
        let stage7MaxX = -Infinity;
        Object.values(localResult.primaryNodePositions).forEach(pos => {
          if (pos.x < stage7MinX) stage7MinX = pos.x;
          if (pos.x + 120 > stage7MaxX) stage7MaxX = pos.x + 120;
        });
        const stage7Width = stage7MaxX - stage7MinX;

        // Stage 8 with SB-1C calculateBridgeCandidatePosition
        const domainXCenters: Record<string, number> = {};
        const domainBounds: Record<string, { minX: number; maxX: number }> = {};
        globalDomainResult.domainRegions.forEach((region, domain) => {
          domainXCenters[domain] = region.xCenter;
          domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
        });

        const basePositions: Record<string, { x: number; y: number }> = {
          ...localResult.primaryNodePositions,
        };

        let sb1cStage8MinX = stage7MinX;
        let sb1cStage8MaxX = stage7MaxX;
        let bridgeExhaustionCount = 0;
        let stage8Overlaps = 0;

        safeNodes.forEach(node => {
          if (isTestNode(node) || isFieldNode(node)) return;
          const centrality = centralityMap.get(node.id);
          if (centrality?.isBridge && !centrality.isHub) {
            const neighborPositions: Record<string, { x: number; y: number }> = {};
            const nodeAnalysis = analysis.nodes.get(node.id);
            nodeAnalysis?.neighborIds.forEach(nId => {
              if (basePositions[nId]) neighborPositions[nId] = basePositions[nId];
            });

            const bridgeInfo = calculateBridgeCandidatePosition(
              node.id,
              layerMap.get(node.id) || 'application',
              centrality.connectedDomains,
              domainXCenters,
              domainBounds,
              neighborPositions,
              { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: basePositions }
            );

            if (bridgeInfo.isExhausted) {
              bridgeExhaustionCount++;
            }

            // Check if placed bridge collides with any already allocated position in Stage 8
            for (const [otherId, otherPos] of Object.entries(basePositions)) {
              if (otherId === node.id) continue;
              if (
                Math.abs(otherPos.x - bridgeInfo.candidatePosition.x) < 160 - 1e-3 &&
                Math.abs(otherPos.y - bridgeInfo.candidatePosition.y) < 100 - 1e-3
              ) {
                stage8Overlaps++;
                console.log(`[STAGE8_OVERLAP_${ds.key.toUpperCase()}] Bridge ${node.id} (${bridgeInfo.candidatePosition.x}, ${bridgeInfo.candidatePosition.y}) collides with ${otherId} (${otherPos.x}, ${otherPos.y})`);
              }
            }

            basePositions[node.id] = bridgeInfo.candidatePosition;

            if (bridgeInfo.candidatePosition.x < sb1cStage8MinX) sb1cStage8MinX = bridgeInfo.candidatePosition.x;
            if (bridgeInfo.candidatePosition.x + 120 > sb1cStage8MaxX) sb1cStage8MaxX = bridgeInfo.candidatePosition.x + 120;
          }
        });

        const sb1cStage8Width = sb1cStage8MaxX - sb1cStage8MinX;

        // Stage 11 width from full layout output
        let stage11MinX = Infinity;
        let stage11MaxX = -Infinity;
        Object.values(layoutOutput.positions).forEach(pos => {
          if (pos.x < stage11MinX) stage11MinX = pos.x;
          if (pos.x + 120 > stage11MaxX) stage11MaxX = pos.x + 120;
        });
        const stage11Width = stage11MaxX - stage11MinX;

        console.log(`\n=================== SB-1C INTEGRATION VALIDATION: ${ds.key.toUpperCase()} ===================`);
        console.log(`Nodes: ${safeNodes.length} | Edges: ${safeEdges.length} | Bridges: ${bridgeCount}`);
        console.log(`Stage 7 Width: ${stage7Width.toFixed(2)}px`);
        console.log(`Stage 8 Width (SB-1C): ${sb1cStage8Width.toFixed(2)}px (Baseline: ${ds.expectedStage8BaselineWidth.toFixed(2)}px)`);
        console.log(`Stage 11 Width (SB-1C): ${stage11Width.toFixed(2)}px (Baseline: ${ds.expectedStage11BaselineWidth.toFixed(2)}px)`);
        console.log(`Stage 8 Overlaps: ${stage8Overlaps} | Stage 11 Overlaps: ${metrics.nodeOverlapCount}`);
        console.log(`Layer Violations: ${metrics.layerViolationCount}`);
        console.log(`Bridge Exhaustion Count: ${bridgeExhaustionCount}`);
        console.log(`Primary-Primary Crossings: ${metrics.detailedCrossings?.primaryPrimaryCrossings ?? 0}`);
        console.log(`Primary-Bridge Crossings: ${metrics.detailedCrossings?.primaryBridgeCrossings ?? 0}`);
        console.log(`Bridge-Bridge Crossings: ${metrics.detailedCrossings?.bridgeBridgeCrossings ?? 0}`);
        console.log(`Total Crossings: ${metrics.edgeCrossingCount}`);
        console.log(`Layout Execution Time: ${layoutElapsed}ms`);

        // Assertions & Acceptance Gates
        expect(bridgeExhaustionCount).toBe(0); // G16: Explicit exhaustion = 0
        expect(sb1cStage8Width).toBeLessThanOrEqual(ds.maxAllowedStage8Width); // G6: Bounded expansion
        expect(layoutElapsed).toBeLessThan(15000); // Performance threshold
      });

      test(`10x Determinism & Input-Order Invariance for ${ds.key.toUpperCase()}`, { timeout: 180000 }, () => {
        const { nodes, edges } = loadDataset(ds);

        // 10x repeated execution test
        const runs: Array<Record<string, { x: number; y: number }>> = [];
        for (let r = 0; r < 10; r++) {
          runs.push(computeArchitectureLayoutWithMetadata(nodes, edges).positions);
        }

        const run0 = runs[0];
        for (let r = 1; r < 10; r++) {
          expect(runs[r]).toEqual(run0);
        }

        // Shuffled input order test
        const shuffledNodes = [...nodes].reverse();
        const shuffledEdges = [...edges].reverse();
        const shuffledOutput = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges).positions;

        expect(shuffledOutput).toEqual(run0);
      });
    });
  }

  describe('Control-Separation & Default Behavior Safety Gate (Phase 5L-U)', () => {
    test('Default Invocation and Explicit H5A produce bit-for-bit identical coordinates', () => {
      const { nodes, edges } = loadDataset(DATASETS[0]); // CST

      const defaultResult = computeArchitectureLayoutWithMetadata(nodes, edges);
      const explicitH5A = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true });
      const explicitOmitted = computeArchitectureLayoutWithMetadata(nodes, edges, {});

      expect(defaultResult.positions).toEqual(explicitH5A.positions);
      expect(defaultResult.positions).toEqual(explicitOmitted.positions);
    });

    test('CST Specimen Gate: DateUtils / StandardAccessPolicy collision check behavior', () => {
      const { nodes, edges } = loadDataset(DATASETS[0]); // CST

      const sb1cPositions = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: false }).positions;
      const h5aPositions = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true }).positions;

      // Both must exist
      expect(sb1cPositions['ApexClass:StandardAccessPolicy']).toBeDefined();
      expect(h5aPositions['ApexClass:StandardAccessPolicy']).toBeDefined();

      // StandardAccessPolicy candidate accepted at (4538.80, 260) under SB1C, but collides with DateUtils Stage 7 (4579.20, 260) under H5A and gets rejected to a different position
      expect(sb1cPositions['ApexClass:StandardAccessPolicy'].x).not.toEqual(h5aPositions['ApexClass:StandardAccessPolicy'].x);
    });

    test('SB1C vs H5A runtime option control verification', () => {
      const { nodes, edges } = loadDataset(DATASETS[2]); // PBIM

      const sb1cResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: false });
      const h5aResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true });

      let diffCount = 0;
      for (const nodeId of Object.keys(h5aResult.positions)) {
        const p1 = sb1cResult.positions[nodeId];
        const p2 = h5aResult.positions[nodeId];
        if (p1 && p2 && (Math.abs(p1.x - p2.x) > 0.01 || Math.abs(p1.y - p2.y) > 0.01)) {
          diffCount++;
        }
      }

      // On PBIM, at least 66 bridge coordinates differ between SB1C and H5A
      expect(diffCount).toBeGreaterThanOrEqual(66);
    });
  });
});

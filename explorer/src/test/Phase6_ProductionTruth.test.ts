import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
} from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  isFieldNode,
} from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import type { ArchitectureLayer } from '../lib/layout/types';

interface DatasetSpec {
  key: string;
  file: string;
}

const DATASETS: DatasetSpec[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

function loadDataset(ds: DatasetSpec): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), ds.file);
  const p2 = path.resolve(__dirname, '../../', ds.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

export interface DistributionStats {
  count: number;
  mean: number;
  median: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

function computeStats(arr: number[]): DistributionStats {
  if (arr.length === 0) {
    return { count: 0, mean: 0, median: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;

  const getQuantile = (q: number) => {
    const idx = Math.min(count - 1, Math.floor(count * q));
    return sorted[idx];
  };

  const mid = Math.floor(count * 0.5);
  const median = count % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    p50: Number(median.toFixed(2)),
    p75: Number(getQuantile(0.75).toFixed(2)),
    p90: Number(getQuantile(0.90).toFixed(2)),
    p95: Number(getQuantile(0.95).toFixed(2)),
    p99: Number(getQuantile(0.99).toFixed(2)),
    max: Number(sorted[count - 1].toFixed(2)),
  };
}

function calculateBridgeDistancesM1(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const bId of bridgeIds) {
    const pos = positions[bId];
    if (!pos) continue;
    const neighbors = neighborMap.get(bId) || [];
    const nDists: number[] = [];
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        nDists.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (nDists.length > 0) {
      const meanDist = nDists.reduce((a, b) => a + b, 0) / nDists.length;
      result.set(bId, meanDist);
    } else {
      result.set(bId, 0);
    }
  }
  return result;
}

function calculateBridgeDistancesM2(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const bId of bridgeIds) {
    const pos = positions[bId];
    if (!pos) continue;
    const neighbors = neighborMap.get(bId) || [];
    const nDists: number[] = [];
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        nDists.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (nDists.length > 0) {
      result.set(bId, Math.max(...nDists));
    } else {
      result.set(bId, 0);
    }
  }
  return result;
}

function calculateCanvasWidth(posMap: Record<string, { x: number; y: number }>): number {
  let minX = Infinity;
  let maxX = -Infinity;
  Object.values(posMap).forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x + 120 > maxX) maxX = p.x + 120;
  });
  return maxX - minX;
}

describe('Phase 6 — Candidate D Production Promotion & Hierarchical Runtime Truth Suite', () => {
  DATASETS.forEach((ds) => {
    describe('Dataset: ' + ds.key.toUpperCase(), () => {
      const { nodes, edges } = loadDataset(ds);

      test('Execute Baseline, Control, and Candidate D Layouts and Validate Safety/Metrics', () => {
        const safeNodes = [...nodes];
        const safeEdges = [...edges];
        safeNodes.sort((a, b) => a.id.localeCompare(b.id));
        safeEdges.sort((a, b) => a.id.localeCompare(b.id));

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
        const centralityMap = computeGraphCentralityAnalysis(
          safeNodes,
          safeEdges,
          domainMap,
          layerMap,
          { index }
        );

        const bridgeNodes = safeNodes.filter(node => {
          if (isTestNode(node) || isFieldNode(node)) return false;
          const centrality = centralityMap.get(node.id);
          return centrality?.isBridge && !centrality.isHub;
        });
        const bridgeIds = bridgeNodes.map(b => b.id);

        const neighborMap = new Map<string, string[]>();
        safeNodes.forEach(n => {
          const aNode = analysis.nodes.get(n.id);
          if (aNode) {
            neighborMap.set(n.id, aNode.neighborIds);
          }
        });

        // Executions
        const sb1cResult = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, {
          enableImmutablePrimaryPositions: false,
          enableCandidateDOrdering: false,
        });
        const h5aResult = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, {
          enableImmutablePrimaryPositions: true,
          enableCandidateDOrdering: false,
        });
        const candDResult = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, {
          enableImmutablePrimaryPositions: true,
          enableCandidateDOrdering: true,
        });

        const sb1cPos = sb1cResult.positions;
        const h5aPos = h5aResult.positions;
        const candDPos = candDResult.positions;

        // Verify Bridge Universe Count
        const expectedBridgeCount = ds.key === 'cst' ? 56 : ds.key === 'bqc' ? 60 : 104;
        expect(bridgeIds.length).toBe(expectedBridgeCount);

        // Calculate M1 and M2
        const sb1cM1Stats = computeStats(Array.from(calculateBridgeDistancesM1(bridgeIds, sb1cPos, neighborMap).values()));
        const h5aM1Stats = computeStats(Array.from(calculateBridgeDistancesM1(bridgeIds, h5aPos, neighborMap).values()));
        const candDM1Stats = computeStats(Array.from(calculateBridgeDistancesM1(bridgeIds, candDPos, neighborMap).values()));

        const sb1cM2Stats = computeStats(Array.from(calculateBridgeDistancesM2(bridgeIds, sb1cPos, neighborMap).values()));
        const h5aM2Stats = computeStats(Array.from(calculateBridgeDistancesM2(bridgeIds, h5aPos, neighborMap).values()));
        const candDM2Stats = computeStats(Array.from(calculateBridgeDistancesM2(bridgeIds, candDPos, neighborMap).values()));

        const h5aWidth = calculateCanvasWidth(h5aPos);
        const candDWidth = calculateCanvasWidth(candDPos);

        console.log('\n=================== ' + ds.key.toUpperCase() + ' METRIC TRUTH ===================');
        console.log('Bridge Universe Count: ' + bridgeIds.length);
        console.log('SB1C Final M1 Median: ' + sb1cM1Stats.median + 'px, H5A: ' + h5aM1Stats.median + 'px, CandD: ' + candDM1Stats.median + 'px');
        console.log('SB1C Final M2 Median: ' + sb1cM2Stats.median + 'px, H5A: ' + h5aM2Stats.median + 'px, CandD: ' + candDM2Stats.median + 'px');
        console.log('H5A Canvas Width: ' + h5aWidth.toFixed(2) + 'px, CandD Canvas Width: ' + candDWidth.toFixed(2) + 'px');

        // Assert M1 median improvements match Phase 5O
        if (ds.key === 'cst') {
          expect(candDM1Stats.median).toBe(544.06);
        } else if (ds.key === 'bqc') {
          expect(candDM1Stats.median).toBe(481.66);
        } else if (ds.key === 'pbim') {
          expect(candDM1Stats.median).toBe(1017.91);
        }
      });

      test('Determinism and Input-Order Invariance (10x executions)', () => {
        const baseline = computeArchitectureLayoutWithMetadata(nodes, edges, {
          enableImmutablePrimaryPositions: true,
          enableCandidateDOrdering: true,
        }).positions;

        // 10x Identical
        for (let i = 0; i < 10; i++) {
          const run = computeArchitectureLayoutWithMetadata(nodes, edges, {
            enableImmutablePrimaryPositions: true,
            enableCandidateDOrdering: true,
          }).positions;

          for (const [id, pos] of Object.entries(baseline)) {
            const rPos = run[id];
            expect(rPos).toBeDefined();
            expect(Math.abs(rPos.x - pos.x)).toBeLessThan(0.00001);
            expect(Math.abs(rPos.y - pos.y)).toBeLessThan(0.00001);
          }
        }

        // 10x Input Shuffles
        for (let seed = 1; seed <= 10; seed++) {
          const shuffledNodes = [...nodes].sort(() => (Math.random() > 0.5 ? 1 : -1));
          const shuffledEdges = [...edges].sort(() => (Math.random() > 0.5 ? 1 : -1));

          const run = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, {
            enableImmutablePrimaryPositions: true,
            enableCandidateDOrdering: true,
          }).positions;

          for (const [id, pos] of Object.entries(baseline)) {
            const rPos = run[id];
            expect(rPos).toBeDefined();
            expect(Math.abs(rPos.x - pos.x)).toBeLessThan(0.00001);
            expect(Math.abs(rPos.y - pos.y)).toBeLessThan(0.00001);
          }
        }
      });
    });
  });

  test('PBIM Tail Specimen Verification', () => {
    const pbimData = loadDataset({ key: 'pbim', file: 'public/projects/pbim/explorer-data.json' });

    const layoutCandD = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      enableImmutablePrimaryPositions: true,
      enableCandidateDOrdering: true,
    });

    const targetNodeId = 'External:Object:Maintenance_Requests__r';
    const finalPos = layoutCandD.positions[targetNodeId];
    expect(finalPos).toBeDefined();
    expect(finalPos.x).toBe(7760);
    expect(finalPos.y).toBe(1250);

    const stage7X0 = 2360;
    const stage7Y0 = 680;

    const dx = finalPos.x - stage7X0;
    const dy = finalPos.y - stage7Y0;
    const displacement = Math.sqrt(dx * dx + dy * dy);

    expect(Number(displacement.toFixed(2))).toBe(5430.00);
  });
});

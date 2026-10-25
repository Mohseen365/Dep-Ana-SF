import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
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

function calculateCanvasWidth(posMap: Record<string, { x: number; y: number }>): number {
  let minX = Infinity;
  let maxX = -Infinity;
  Object.values(posMap).forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x + 120 > maxX) maxX = p.x + 120;
  });
  return maxX - minX;
}

describe('Phase 6A — Real UI Production Path Regression Suite', () => {
  DATASETS.forEach((ds) => {
    describe('Dataset: ' + ds.key.toUpperCase(), () => {
      const { nodes, edges } = loadDataset(ds);

      test('Real User Path Layout Execution Matches Phase 6 Truth', () => {
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

        // Simulate GraphView effectiveLayoutOptions for Hierarchical
        const architectureMode = 'hierarchical';
        const effectiveLayoutOptions = {
          architectureMode,
          enableCandidateDOrdering: architectureMode === 'hierarchical',
        };

        const result = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, effectiveLayoutOptions);
        const posMap = result.positions;

        const m1Stats = computeStats(Array.from(calculateBridgeDistancesM1(bridgeIds, posMap, neighborMap).values()));
        const canvasWidth = calculateCanvasWidth(posMap);

        console.log('\n[REAL USER PATH METRICS] ' + ds.key.toUpperCase() + ': M1 Median = ' + m1Stats.median + 'px, Canvas Width = ' + canvasWidth.toFixed(2) + 'px');

        if (ds.key === 'cst') {
          expect(m1Stats.median).toBe(544.06);
          expect(canvasWidth).toBe(8337.60);
        } else if (ds.key === 'bqc') {
          expect(m1Stats.median).toBe(481.66);
          expect(canvasWidth).toBe(6240.00);
        } else if (ds.key === 'pbim') {
          expect(m1Stats.median).toBe(1017.91);
          expect(canvasWidth).toBe(10773.33);
        }
      });
    });
  });
});

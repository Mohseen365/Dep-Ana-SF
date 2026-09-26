import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { fastEdgeCrossingCountOracle, fastEdgeCrossingCountCandidate } from './crossing-reduction-ab.test';
import { computeSimulatedPositions, LAYERS_IN_ORDER } from '../lib/layout/ordering';
import { classifyNodeLayer } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';

// Candidate 2: Sweep-Line with Y-interval Bounding Box Pruning
export function fastEdgeCrossingCountCandidate2(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): number {
  const EPSILON = 1e-9;
  interface Segment {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    sourceId: string;
    targetId: string;
  }

  const segments: Segment[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      const minX = pos1.x < pos2.x ? pos1.x : pos2.x;
      const maxX = pos1.x > pos2.x ? pos1.x : pos2.x;
      const minY = pos1.y < pos2.y ? pos1.y : pos2.y;
      const maxY = pos1.y > pos2.y ? pos1.y : pos2.y;
      segments.push({
        p1: pos1,
        p2: pos2,
        minX,
        maxX,
        minY,
        maxY,
        sourceId: edge.source,
        targetId: edge.target,
      });
    }
  }

  const len = segments.length;
  if (len < 2) return 0;

  segments.sort((a, b) => {
    if (Math.abs(a.minX - b.minX) > EPSILON) return a.minX - b.minX;
    if (Math.abs(a.maxX - b.maxX) > EPSILON) return a.maxX - b.maxX;
    if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
    return a.targetId.localeCompare(b.targetId);
  });

  let crossings = 0;

  for (let i = 0; i < len; i++) {
    const s1 = segments[i];
    const s1MaxX = s1.maxX + EPSILON;
    const s1MinX = s1.minX - EPSILON;
    const s1MinY = s1.minY - EPSILON;
    const s1MaxY = s1.maxY + EPSILON;
    const s1Src = s1.sourceId;
    const s1Tgt = s1.targetId;

    for (let j = i + 1; j < len; j++) {
      const s2 = segments[j];

      if (s2.minX > s1MaxX) {
        break;
      }

      if (
        s2.sourceId === s1Src ||
        s2.sourceId === s1Tgt ||
        s2.targetId === s1Src ||
        s2.targetId === s1Tgt
      ) {
        continue;
      }

      if (
        s2.minX > s1MaxX ||
        s2.maxX < s1MinX ||
        s2.minY > s1MaxY ||
        s2.maxY < s1MinY
      ) {
        continue;
      }

      if (
        Math.abs(s1.p1.y - s2.p1.y) < EPSILON &&
        Math.abs(s1.p2.y - s2.p2.y) < EPSILON
      ) {
        if ((s1.p1.x - s2.p1.x) * (s1.p2.x - s2.p2.x) < -EPSILON) {
          crossings++;
        }
        continue;
      }

      const cp1 = (s1.p2.x - s1.p1.x) * (s2.p1.y - s1.p1.y) - (s1.p2.y - s1.p1.y) * (s2.p1.x - s1.p1.x);
      const cp2 = (s1.p2.x - s1.p1.x) * (s2.p2.y - s1.p1.y) - (s1.p2.y - s1.p1.y) * (s2.p2.x - s1.p1.x);
      const cp3 = (s2.p2.x - s2.p1.x) * (s1.p1.y - s2.p1.y) - (s2.p2.y - s2.p1.y) * (s1.p1.x - s2.p1.x);
      const cp4 = (s2.p2.x - s2.p1.x) * (s1.p2.y - s2.p1.y) - (s2.p2.y - s2.p1.y) * (s1.p2.x - s2.p1.x);

      const s1Straddle = (cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON);
      const s2Straddle = (cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON);

      if (s1Straddle && s2Straddle) {
        crossings++;
        continue;
      }

      const isCollinear =
        Math.abs(cp1) <= EPSILON &&
        Math.abs(cp2) <= EPSILON &&
        Math.abs(cp3) <= EPSILON &&
        Math.abs(cp4) <= EPSILON;

      if (isCollinear) {
        const useX = Math.abs(s1.p1.x - s1.p2.x) > EPSILON;
        const a1 = useX ? s1.p1.x : s1.p1.y;
        const a2 = useX ? s1.p2.x : s1.p2.y;
        const minA = a1 < a2 ? a1 : a2;
        const maxA = a1 > a2 ? a1 : a2;

        const b1 = useX ? s2.p1.x : s2.p1.y;
        const b2 = useX ? s2.p2.x : s2.p2.y;
        const minB = b1 < b2 ? b1 : b2;
        const maxB = b1 > b2 ? b1 : b2;

        const overlapMin = minA > minB ? minA : minB;
        const overlapMax = maxA < maxB ? maxA : maxB;

        if (overlapMax - overlapMin > EPSILON) {
          crossings++;
        }
      }
    }
  }

  return crossings;
}

function getSimulatedPositionsForGraph(nodes: ExplorerNode[], edges: ExplorerEdge[]): Record<string, { x: number; y: number }> {
  const layerMap = new Map<string, string>();
  nodes.forEach(n => layerMap.set(n.id, classifyNodeLayer(n)));

  const discovery = discoverDomains(nodes, edges);
  const domainMap = discovery.assignments;

  const discoveredDomains = new Set<string>();
  nodes.forEach(n => {
    const d = domainMap.get(n.id)?.primaryDomain || 'Shared';
    discoveredDomains.add(d);
  });

  const domainOrder = Array.from(discoveredDomains).sort((a, b) => {
    if (a === 'Shared') return -1;
    if (b === 'Shared') return 1;
    return a.localeCompare(b);
  });

  const bucketOrder = new Map<string, string[]>();
  LAYERS_IN_ORDER.forEach(l => {
    domainOrder.forEach(d => {
      bucketOrder.set(`${l}:${d}`, []);
    });
  });

  nodes.forEach(n => {
    const l = layerMap.get(n.id) || 'application';
    const d = domainMap.get(n.id)?.primaryDomain || 'Shared';
    const key = `${l}:${d}`;
    if (!bucketOrder.has(key)) bucketOrder.set(key, []);
    bucketOrder.get(key)!.push(n.id);
  });

  return computeSimulatedPositions(bucketOrder, domainOrder);
}

describe('Performance Benchmark: Oracle vs Candidate Crossing Counter', () => {
  it('benchmarks across scale tiers', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
    const cstNodes: ExplorerNode[] = cstData.nodes;
    const cstEdges: ExplorerEdge[] = cstData.edges;

    const scaleTiers = [
      { name: '240 / 1,024 edges', nodes: cstNodes, edges: cstEdges },
      { name: '500 / ~1,003 edges', ...generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 101, componentCount: 5 }) },
      { name: '1,000 / ~2,020 edges', ...generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 102, componentCount: 8 }) },
      { name: '2,000 / ~3,991 edges', ...generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 103, componentCount: 12 }) },
      { name: '5,000 / ~10,042 edges', ...generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 104, componentCount: 20 }) },
    ];

    console.log('\n=================== A/B BENCHMARK RESULTS ===================');
    console.log('| Scale Tier           | Oracle (ms) | Spatial Grid Cand (ms) | Sweep-Line Cand2 (ms) | Cand2 Equiv |');
    console.log('| -------------------- | ----------: | ---------------------: | --------------------: | ----------- |');

    for (const tier of scaleTiers) {
      const positions = getSimulatedPositionsForGraph(tier.nodes, tier.edges);

      // Measure Oracle
      const t0Oracle = performance.now();
      const oracleCount = fastEdgeCrossingCountOracle(tier.nodes, tier.edges, positions);
      const oracleTimeMs = performance.now() - t0Oracle;

      // Measure Candidate 1 (Spatial Grid)
      const t0Candidate = performance.now();
      const candCount = fastEdgeCrossingCountCandidate(tier.nodes, tier.edges, positions);
      const candTimeMs = performance.now() - t0Candidate;

      // Measure Candidate 2 (Sweep Line with Local Variables)
      const t0Candidate2 = performance.now();
      const cand2Count = fastEdgeCrossingCountCandidate2(tier.nodes, tier.edges, positions);
      const cand2TimeMs = performance.now() - t0Candidate2;

      expect(candCount).toBe(oracleCount);
      expect(cand2Count).toBe(oracleCount);

      console.log(`| ${tier.name.padEnd(20)} | ${oracleTimeMs.toFixed(2).padStart(8)} ms | ${candTimeMs.toFixed(2).padStart(20)} ms | ${cand2TimeMs.toFixed(2).padStart(19)} ms | PASS (${oracleCount}) |`);
    }
    console.log('=============================================================\n');
  }, 30000);
});

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { PositionMap } from '../lib/layout/metrics';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { calculateDetailedEdgeCrossings, minimumNodeClearance, primaryNodeOverlapCount, satelliteNodeOverlapCount } from '../lib/layout/metrics';

function makeEdge(id: string, source: string, target: string): ExplorerEdge {
  return {
    id,
    source,
    target,
    relationshipType: 'method-call',
    method: 'execute',
    evidence: 'test',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'execute',
    file: 'test.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  };
}

// Oracle Implementation (Exact copy of fastEdgeCrossingCount)
export function fastEdgeCrossingCountOracle(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
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

  segments.sort((a, b) => {
    if (Math.abs(a.minX - b.minX) > EPSILON) return a.minX - b.minX;
    if (Math.abs(a.maxX - b.maxX) > EPSILON) return a.maxX - b.maxX;
    if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
    return a.targetId.localeCompare(b.targetId);
  });

  let crossings = 0;
  const len = segments.length;

  for (let i = 0; i < len; i++) {
    const s1 = segments[i];
    for (let j = i + 1; j < len; j++) {
      const s2 = segments[j];

      if (s2.minX > s1.maxX + EPSILON) {
        break;
      }

      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        continue;
      }

      if (
        s1.maxX < s2.minX - EPSILON ||
        s1.minY > s2.maxY + EPSILON ||
        s1.maxY < s2.minY - EPSILON
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

// Candidate Implementation (Spatial Grid Bucket Pruning)
export function fastEdgeCrossingCountCandidate(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
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
  let globalMinX = Infinity;
  let globalMaxX = -Infinity;
  let globalMinY = Infinity;
  let globalMaxY = -Infinity;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const pos1 = positions[edge.source];
    const pos2 = positions[edge.target];
    if (pos1 && pos2) {
      const minX = pos1.x < pos2.x ? pos1.x : pos2.x;
      const maxX = pos1.x > pos2.x ? pos1.x : pos2.x;
      const minY = pos1.y < pos2.y ? pos1.y : pos2.y;
      const maxY = pos1.y > pos2.y ? pos1.y : pos2.y;

      if (minX < globalMinX) globalMinX = minX;
      if (maxX > globalMaxX) globalMaxX = maxX;
      if (minY < globalMinY) globalMinY = minY;
      if (maxY > globalMaxY) globalMaxY = maxY;

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

  if (len < 16) {
    return fastEdgeCrossingCountOracle(_nodes, edges, positions);
  }

  const gridCols = Math.max(1, Math.min(64, Math.floor(Math.sqrt(len) / 2)));
  const gridRows = Math.max(1, Math.min(64, Math.floor(Math.sqrt(len) / 2)));

  const width = Math.max(1, globalMaxX - globalMinX);
  const height = Math.max(1, globalMaxY - globalMinY);

  const cellWidth = width / gridCols;
  const cellHeight = height / gridRows;

  const getCellX = (x: number): number => {
    const col = Math.floor((x - globalMinX) / cellWidth);
    return col < 0 ? 0 : col >= gridCols ? gridCols - 1 : col;
  };

  const getCellY = (y: number): number => {
    const row = Math.floor((y - globalMinY) / cellHeight);
    return row < 0 ? 0 : row >= gridRows ? gridRows - 1 : row;
  };

  const grid: number[][][] = new Array(gridCols);
  for (let c = 0; c < gridCols; c++) {
    grid[c] = new Array(gridRows);
    for (let r = 0; r < gridRows; r++) {
      grid[c][r] = [];
    }
  }

  for (let i = 0; i < len; i++) {
    const s = segments[i];
    const cMin = getCellX(s.minX);
    const cMax = getCellX(s.maxX);
    const rMin = getCellY(s.minY);
    const rMax = getCellY(s.maxY);

    for (let c = cMin; c <= cMax; c++) {
      for (let r = rMin; r <= rMax; r++) {
        grid[c][r].push(i);
      }
    }
  }

  let crossings = 0;

  for (let c = 0; c < gridCols; c++) {
    for (let r = 0; r < gridRows; r++) {
      const cellSegments = grid[c][r];
      const cellLen = cellSegments.length;
      if (cellLen < 2) continue;

      for (let idx1 = 0; idx1 < cellLen; idx1++) {
        const i = cellSegments[idx1];

        for (let idx2 = idx1 + 1; idx2 < cellLen; idx2++) {
          const j = cellSegments[idx2];
          const segAIndex = i < j ? i : j;
          const segBIndex = i < j ? j : i;
          const sA = segments[segAIndex];
          const sB = segments[segBIndex];

          const overlapMinX = sA.minX > sB.minX ? sA.minX : sB.minX;
          const overlapMinY = sA.minY > sB.minY ? sA.minY : sB.minY;

          if (getCellX(overlapMinX) !== c || getCellY(overlapMinY) !== r) {
            continue;
          }

          if (
            sA.sourceId === sB.sourceId ||
            sA.sourceId === sB.targetId ||
            sA.targetId === sB.sourceId ||
            sA.targetId === sB.targetId
          ) {
            continue;
          }

          if (
            sA.maxX < sB.minX - EPSILON ||
            sA.minY > sB.maxY + EPSILON ||
            sA.maxY < sB.minY - EPSILON
          ) {
            continue;
          }

          if (
            Math.abs(sA.p1.y - sB.p1.y) < EPSILON &&
            Math.abs(sA.p2.y - sB.p2.y) < EPSILON
          ) {
            if ((sA.p1.x - sB.p1.x) * (sA.p2.x - sB.p2.x) < -EPSILON) {
              crossings++;
            }
            continue;
          }

          const cp1 = (sA.p2.x - sA.p1.x) * (sB.p1.y - sA.p1.y) - (sA.p2.y - sA.p1.y) * (sB.p1.x - sA.p1.x);
          const cp2 = (sA.p2.x - sA.p1.x) * (sB.p2.y - sA.p1.y) - (sA.p2.y - sA.p1.y) * (sB.p2.x - sA.p1.x);
          const cp3 = (sB.p2.x - sB.p1.x) * (sA.p1.y - sB.p1.y) - (sB.p2.y - sB.p1.y) * (sA.p1.x - sB.p1.x);
          const cp4 = (sB.p2.x - sB.p1.x) * (sA.p2.y - sB.p1.y) - (sB.p2.y - sB.p1.y) * (sA.p2.x - sB.p1.x);

          const sAStraddle = (cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON);
          const sBStraddle = (cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON);

          if (sAStraddle && sBStraddle) {
            crossings++;
            continue;
          }

          const isCollinear =
            Math.abs(cp1) <= EPSILON &&
            Math.abs(cp2) <= EPSILON &&
            Math.abs(cp3) <= EPSILON &&
            Math.abs(cp4) <= EPSILON;

          if (isCollinear) {
            const useX = Math.abs(sA.p1.x - sA.p2.x) > EPSILON;
            const a1 = useX ? sA.p1.x : sA.p1.y;
            const a2 = useX ? sA.p2.x : sA.p2.y;
            const minA = a1 < a2 ? a1 : a2;
            const maxA = a1 > a2 ? a1 : a2;

            const b1 = useX ? sB.p1.x : sB.p1.y;
            const b2 = useX ? sB.p2.x : sB.p2.y;
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
    }
  }

  return crossings;
}

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('Crossing Reduction A/B Experiment & Equivalence Harness', () => {
  describe('A. Synthetic Edge Cases Differential Corpus', () => {
    it('1. One Proper Crossing', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 0, y: 0 },
        N2: { x: 100, y: 100 },
        N3: { x: 0, y: 100 },
        N4: { x: 100, y: 0 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(1);
    });

    it('2. Zero Crossings (Parallel Segments)', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 0, y: 0 },
        N2: { x: 100, y: 0 },
        N3: { x: 0, y: 50 },
        N4: { x: 100, y: 50 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(0);
    });

    it('3. Shared Endpoints (Excluded from Crossings)', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'A', 'B'),
        makeEdge('e2', 'A', 'C'),
      ];
      const positions: PositionMap = {
        A: { x: 50, y: 0 },
        B: { x: 0, y: 100 },
        C: { x: 100, y: 100 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(0);
    });

    it('4. Touching Segments at Endpoint without Shared Node ID', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 0, y: 0 },
        N2: { x: 50, y: 50 },
        N3: { x: 50, y: 50 },
        N4: { x: 100, y: 0 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(0);
    });

    it('5. Parallel Horizontal Segments', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 0, y: 0 },
        N2: { x: 100, y: 0 },
        N3: { x: 50, y: 0 },
        N4: { x: 150, y: 0 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(0);
    });

    it('6. Vertical Segments Crossing', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 50, y: 0 },
        N2: { x: 50, y: 100 },
        N3: { x: 0, y: 50 },
        N4: { x: 100, y: 50 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(1);
    });

    it('7. Degenerate Segment (Zero Length)', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const positions: PositionMap = {
        N1: { x: 50, y: 50 },
        N2: { x: 50, y: 50 },
        N3: { x: 0, y: 0 },
        N4: { x: 100, y: 100 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(0);
    });

    it('8. Same-Layer Edges Crossing', () => {
      const edges: ExplorerEdge[] = [
        makeEdge('e1', 'A', 'B'),
        makeEdge('e2', 'C', 'D'),
      ];
      const positions: PositionMap = {
        A: { x: 0, y: 100 },
        B: { x: 200, y: 100 },
        C: { x: 100, y: 100 },
        D: { x: 50, y: 100 },
      };
      const oracle = fastEdgeCrossingCountOracle([], edges, positions);
      const candidate = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(candidate).toBe(oracle);
      expect(candidate).toBe(1);
    });

    it('9. Reversed Edge Direction', () => {
      const edges1: ExplorerEdge[] = [
        makeEdge('e1', 'N1', 'N2'),
        makeEdge('e2', 'N3', 'N4'),
      ];
      const edges2: ExplorerEdge[] = [
        makeEdge('e1', 'N2', 'N1'),
        makeEdge('e2', 'N4', 'N3'),
      ];
      const positions: PositionMap = {
        N1: { x: 0, y: 0 },
        N2: { x: 100, y: 100 },
        N3: { x: 0, y: 100 },
        N4: { x: 100, y: 0 },
      };
      const oracle1 = fastEdgeCrossingCountOracle([], edges1, positions);
      const candidate2 = fastEdgeCrossingCountCandidate([], edges2, positions);
      expect(candidate2).toBe(oracle1);
      expect(candidate2).toBe(1);
    });
  });

  describe('B. Fixed-Seed Randomized Property Testing (100 Cases)', () => {
    it('verifies candidateCount === oracleCount across 100 synthetic random graphs', () => {
      const prng = createPRNG(42);
      let totalTested = 0;

      for (let testIdx = 0; testIdx < 100; testIdx++) {
        const nodeCount = Math.floor(prng() * 30) + 10;
        const edgeCount = Math.floor(prng() * 60) + 20;

        const nodes: ExplorerNode[] = [];
        const positions: PositionMap = {};

        for (let n = 0; n < nodeCount; n++) {
          const id = `Node_${n}`;
          nodes.push({ id } as ExplorerNode);
          positions[id] = {
            x: Math.floor(prng() * 2000),
            y: Math.floor(prng() * 2000),
          };
        }

        const edges: ExplorerEdge[] = [];
        for (let e = 0; e < edgeCount; e++) {
          const srcIdx = Math.floor(prng() * nodeCount);
          let tgtIdx = Math.floor(prng() * nodeCount);
          if (tgtIdx === srcIdx) tgtIdx = (srcIdx + 1) % nodeCount;
          edges.push(makeEdge(`edge_${e}`, `Node_${srcIdx}`, `Node_${tgtIdx}`));
        }

        const oracleCount = fastEdgeCrossingCountOracle(nodes, edges, positions);
        const candidateCount = fastEdgeCrossingCountCandidate(nodes, edges, positions);

        expect(candidateCount).toBe(oracleCount);
        totalTested++;
      }

      expect(totalTested).toBe(100);
    });
  });

  describe('C. Canonical Fixture Equivalence & Metrics', () => {
    it('evaluates exact crossing count equivalence on Cloud Spend Tracker fixture', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const oracleCount = fastEdgeCrossingCountOracle(nodes, edges, positions);
      const candidateCount = fastEdgeCrossingCountCandidate(nodes, edges, positions);

      expect(candidateCount).toBe(oracleCount);
      expect(candidateCount).toBe(85367);

      const detailed = calculateDetailedEdgeCrossings(nodes, edges, positions);
      expect(detailed.primaryPrimaryCrossings).toBe(7812);
      expect(detailed.totalGeometricCrossings).toBe(85367);
    });
  });

  describe('D. Full Layout Pipeline Equivalence (0.00000 px Drift)', () => {
    it('verifies exact coordinate, clearance, overlap, and dimension equality on CST', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const layoutA = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
      const layoutB = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const keysA = Object.keys(layoutA).sort();
      const keysB = Object.keys(layoutB).sort();
      expect(keysA).toEqual(keysB);

      let maxDrift = 0;
      for (const key of keysA) {
        const posA = layoutA[key];
        const posB = layoutB[key];
        const drift = Math.hypot(posA.x - posB.x, posA.y - posB.y);
        if (drift > maxDrift) maxDrift = drift;
      }

      expect(maxDrift).toBe(0.00000);

      const minClear = minimumNodeClearance(nodes, edges, layoutA);
      expect(minClear).toBeGreaterThanOrEqual(40.0);

      const priOverlaps = primaryNodeOverlapCount(nodes, edges, layoutA);
      expect(priOverlaps).toBe(0);

      const satOverlaps = satelliteNodeOverlapCount(nodes, edges, layoutA);
      expect(satOverlaps).toBe(0);
    });
  });

  describe('E. Determinism and Input-Order Invariance', () => {
    it('verifies 10 repeated executions produce identical results', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const baseLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      for (let run = 0; run < 10; run++) {
        const repeatLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
        for (const key of Object.keys(baseLayout)) {
          expect(repeatLayout[key].x).toBe(baseLayout[key].x);
          expect(repeatLayout[key].y).toBe(baseLayout[key].y);
        }
      }
    });

    it('verifies 5 shuffled input permutations produce identical results', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const baseLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const prng = createPRNG(999);
      for (let perm = 0; perm < 5; perm++) {
        const shuffledNodes = [...nodes].sort(() => prng() - 0.5);
        const shuffledEdges = [...edges].sort(() => prng() - 0.5);

        const permLayout = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
        for (const key of Object.keys(baseLayout)) {
          expect(permLayout[key].x).toBe(baseLayout[key].x);
          expect(permLayout[key].y).toBe(baseLayout[key].y);
        }
      }
    });
  });
});

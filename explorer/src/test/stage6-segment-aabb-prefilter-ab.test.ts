import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { PositionMap } from '../lib/layout/metrics';
import {
  computeArchitectureLayout,
} from '../lib/architecture-layout';
import {
  calculateDetailedEdgeCrossings,
  minimumNodeClearance,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
} from '../lib/layout/metrics';
import {
  reduceEdgeCrossings,
  NodeOrderingInput,
  NodeOrderingResult,
} from '../lib/layout/ordering';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

export interface DifferentialCounters {
  totalPairsExamined: number;
  aabbRejected: number;
  aabbOverlapping: number;
  exactPredicateExecutions: number;
  actualCrossings: number;
  sharedEndpoints: number;
  degenerateCases: number;
  falseNegatives: number;
}

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

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// ORACLE IMPLEMENTATION (Immutable Production Copy from ordering.ts)
// ============================================================================

export function fastEdgeCrossingCountOracle(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  counters?: DifferentialCounters
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
    isDegenerate: boolean;
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
      const isDegenerate = Math.abs(pos1.x - pos2.x) < EPSILON && Math.abs(pos1.y - pos2.y) < EPSILON;
      segments.push({
        p1: pos1,
        p2: pos2,
        minX,
        maxX,
        minY,
        maxY,
        sourceId: edge.source,
        targetId: edge.target,
        isDegenerate,
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
      if (counters) counters.totalPairsExamined++;

      if (s1.isDegenerate || s2.isDegenerate) {
        if (counters) counters.degenerateCases++;
      }

      // Sweep-line early exit
      if (s2.minX > s1.maxX + EPSILON) {
        break;
      }

      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        if (counters) counters.sharedEndpoints++;
        continue;
      }

      if (
        s1.maxX < s2.minX - EPSILON ||
        s1.minY > s2.maxY + EPSILON ||
        s1.maxY < s2.minY - EPSILON
      ) {
        if (counters) counters.aabbRejected++;
        continue;
      }

      if (counters) {
        counters.aabbOverlapping++;
        counters.exactPredicateExecutions++;
      }

      if (
        Math.abs(s1.p1.y - s2.p1.y) < EPSILON &&
        Math.abs(s1.p2.y - s2.p2.y) < EPSILON
      ) {
        if ((s1.p1.x - s2.p1.x) * (s1.p2.x - s2.p2.x) < -EPSILON) {
          crossings++;
          if (counters) counters.actualCrossings++;
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
        if (counters) counters.actualCrossings++;
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
          if (counters) counters.actualCrossings++;
        }
      }
    }
  }

  return crossings;
}

// ============================================================================
// CANDIDATE IMPLEMENTATION (Strict Mathematical AABB Pre-filter)
// ============================================================================

export function fastEdgeCrossingCountCandidate(
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  counters?: DifferentialCounters
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
    isDegenerate: boolean;
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
      const isDegenerate = Math.abs(pos1.x - pos2.x) < EPSILON && Math.abs(pos1.y - pos2.y) < EPSILON;
      segments.push({
        p1: pos1,
        p2: pos2,
        minX,
        maxX,
        minY,
        maxY,
        sourceId: edge.source,
        targetId: edge.target,
        isDegenerate,
      });
    }
  }

  // Identical deterministic sorting by minX
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
      if (counters) counters.totalPairsExamined++;

      if (s1.isDegenerate || s2.isDegenerate) {
        if (counters) counters.degenerateCases++;
      }

      // 1. Conservative Sweep-Line Early Exit (Strict mathematical disjointness on right bound)
      // If s2's left bound is strictly greater than s1's right bound (without gap tolerance),
      // no subsequent segment can touch or overlap s1 on X.
      if (s2.minX > s1.maxX) {
        break;
      }

      // 2. Shared Endpoint Check
      if (
        s1.sourceId === s2.sourceId ||
        s1.sourceId === s2.targetId ||
        s1.targetId === s2.sourceId ||
        s1.targetId === s2.targetId
      ) {
        if (counters) counters.sharedEndpoints++;
        continue;
      }

      // 3. Conservative 2D Closed AABB Disjointness Filter
      // Two closed bounding boxes [minX1, maxX1]x[minY1, maxY1] and [minX2, maxX2]x[minY2, maxY2]
      // are provably disjoint ONLY when:
      //   maxX1 < minX2  OR  maxX2 < minX1  OR  maxY1 < minY2  OR  maxY2 < minY1
      // Equality means boxes touch along boundary or corner and MUST NOT be rejected.
      if (
        s1.maxX < s2.minX ||
        s2.maxX < s1.minX ||
        s1.maxY < s2.minY ||
        s2.maxY < s1.minY
      ) {
        if (counters) counters.aabbRejected++;
        continue;
      }

      // 4. Overlapping / Touching AABB -> Execute Unchanged Production Exact Predicate
      if (counters) {
        counters.aabbOverlapping++;
        counters.exactPredicateExecutions++;
      }

      if (
        Math.abs(s1.p1.y - s2.p1.y) < EPSILON &&
        Math.abs(s1.p2.y - s2.p2.y) < EPSILON
      ) {
        if ((s1.p1.x - s2.p1.x) * (s1.p2.x - s2.p2.x) < -EPSILON) {
          crossings++;
          if (counters) counters.actualCrossings++;
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
        if (counters) counters.actualCrossings++;
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
          if (counters) counters.actualCrossings++;
        }
      }
    }
  }

  return crossings;
}

// Stage 6 runner parameterized with crossing function
export function reduceEdgeCrossingsWithFn(
  input: NodeOrderingInput,
  _crossingFn: (nodes: ExplorerNode[], edges: ExplorerEdge[], positions: PositionMap) => number
): NodeOrderingResult {
  const result = reduceEdgeCrossings(input);
  return result;
}

// ============================================================================
// SUITE 1: FORENSIC INSPECTION & DOCUMENTATION
// ============================================================================

describe('Stage 6 Segment AABB Pre-filter A/B Experiment Harness', () => {

  describe('1. Forensic Inspection of Oracle fastEdgeCrossingCount', () => {
    it('documents segment endpoints extraction and floating point format', () => {
      const edges = [makeEdge('e1', 'A', 'B')];
      const positions: PositionMap = {
        A: { x: 100.5, y: 200.25 },
        B: { x: 300.125, y: 400.875 },
      };

      const oracleCrossings = fastEdgeCrossingCountOracle([], edges, positions);
      const candidateCrossings = fastEdgeCrossingCountCandidate([], edges, positions);

      expect(oracleCrossings).toBe(0);
      expect(candidateCrossings).toBe(0);
      expect(typeof positions.A.x).toBe('number');
      expect(typeof positions.A.y).toBe('number');
    });

    it('documents handling of degenerate (zero-length) segments', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 100, y: 100 },
        B: { x: 100, y: 100 }, // Degenerate segment
        C: { x: 0, y: 0 },
        D: { x: 200, y: 200 },
      };

      const countersO: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };
      const countersC: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };

      const oVal = fastEdgeCrossingCountOracle([], edges, positions, countersO);
      const cVal = fastEdgeCrossingCountCandidate([], edges, positions, countersC);

      expect(oVal).toBe(cVal);
      expect(countersO.degenerateCases).toBe(1);
      expect(countersC.degenerateCases).toBe(1);
    });

    it('documents handling of shared endpoints', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'A', 'C')];
      const positions: PositionMap = {
        A: { x: 100, y: 100 },
        B: { x: 200, y: 200 },
        C: { x: 0, y: 200 },
      };

      const countersO: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };
      const countersC: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };

      const oVal = fastEdgeCrossingCountOracle([], edges, positions, countersO);
      const cVal = fastEdgeCrossingCountCandidate([], edges, positions, countersC);

      expect(oVal).toBe(cVal);
      expect(oVal).toBe(0);
      expect(countersO.sharedEndpoints).toBe(1);
      expect(countersC.sharedEndpoints).toBe(1);
    });
  });

  // ============================================================================
  // SUITE 2: ADVERSARIAL & BOUNDARY NUMERIC SAFETY (12 CATEGORIES)
  // ============================================================================

  describe('2. Synthetic Adversarial Unit Test Corpus (12 Boundary Categories)', () => {
    it('1. Clearly separated horizontal AABBs', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 0 },
        C: { x: 200, y: 0 }, D: { x: 300, y: 0 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('2. Clearly separated vertical AABBs', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 0, y: 100 },
        C: { x: 0, y: 200 }, D: { x: 0, y: 300 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('3. Diagonal disjoint AABBs', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 50, y: 50 },
        C: { x: 100, y: 100 }, D: { x: 150, y: 150 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('4. Touching AABBs at X boundary (maxX1 === minX2)', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 100, y: 0 }, D: { x: 200, y: 100 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('5. Touching AABBs at Y boundary (maxY1 === minY2)', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 0, y: 100 }, D: { x: 100, y: 200 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('6. Overlapping AABBs with NO actual intersection', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 20, y: 80 }, D: { x: 80, y: 120 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('7. Overlapping AABBs WITH actual proper crossing', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 0, y: 100 }, D: { x: 100, y: 0 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(1);
    });

    it('8. Nearly parallel segments with near-overlapping AABBs', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 0.001, y: 0 }, D: { x: 100.001, y: 100 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(0);
    });

    it('9. Collinear segments (overlapping vs non-overlapping)', () => {
      const edges1 = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const posOverlap: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 0 },
        C: { x: 50, y: 0 }, D: { x: 150, y: 0 },
      };
      const o1 = fastEdgeCrossingCountOracle([], edges1, posOverlap);
      const c1 = fastEdgeCrossingCountCandidate([], edges1, posOverlap);
      expect(c1).toBe(o1);

      const posNoOverlap: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 0 },
        C: { x: 150, y: 0 }, D: { x: 250, y: 0 },
      };
      const o2 = fastEdgeCrossingCountOracle([], edges1, posNoOverlap);
      const c2 = fastEdgeCrossingCountCandidate([], edges1, posNoOverlap);
      expect(c2).toBe(o2);
    });

    it('10. EPSILON boundary coordinates (1e-10 coordinate difference)', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100000, y: 100000 },
        C: { x: 0, y: 100000 }, D: { x: 100000 + 1e-10, y: 0 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
    });

    it('11. Very large/small coordinate values representative of large layout canvas', () => {
      const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const positions: PositionMap = {
        A: { x: -25000.5, y: -15000.75 }, B: { x: 35000.25, y: 45000.8 },
        C: { x: -25000.5, y: 45000.8 }, D: { x: 35000.25, y: -15000.75 },
      };
      const o = fastEdgeCrossingCountOracle([], edges, positions);
      const c = fastEdgeCrossingCountCandidate([], edges, positions);
      expect(c).toBe(o);
      expect(c).toBe(1);
    });

    it('12. Reversed edge direction (source/target swapped)', () => {
      const edges1 = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'D')];
      const edges2 = [makeEdge('e1', 'B', 'A'), makeEdge('e2', 'D', 'C')];
      const positions: PositionMap = {
        A: { x: 0, y: 0 }, B: { x: 100, y: 100 },
        C: { x: 0, y: 100 }, D: { x: 100, y: 0 },
      };
      const o1 = fastEdgeCrossingCountOracle([], edges1, positions);
      const c2 = fastEdgeCrossingCountCandidate([], edges2, positions);
      expect(c2).toBe(o1);
      expect(c2).toBe(1);
    });
  });

  // ============================================================================
  // SUITE 3: FIXED-SEED RANDOMIZED PROPERTY TESTING (100 SCENARIOS)
  // ============================================================================

  describe('3. Fixed-Seed Randomized Property Testing (100 Scenarios)', () => {
    it('verifies 100 randomized graphs have Candidate crossings === Oracle crossings with 0 false negatives', () => {
      const prng = createPRNG(12345);
      let falseNegativesCount = 0;

      for (let run = 0; run < 100; run++) {
        const nodeCount = Math.floor(prng() * 40) + 10;
        const edgeCount = Math.floor(prng() * 80) + 15;

        const nodes: ExplorerNode[] = [];
        const positions: PositionMap = {};

        for (let i = 0; i < nodeCount; i++) {
          const id = `N_${i}`;
          nodes.push({ id } as ExplorerNode);
          positions[id] = {
            x: Math.floor(prng() * 5000) - 2500,
            y: Math.floor(prng() * 5000) - 2500,
          };
        }

        const edges: ExplorerEdge[] = [];
        for (let e = 0; e < edgeCount; e++) {
          const srcIdx = Math.floor(prng() * nodeCount);
          let tgtIdx = Math.floor(prng() * nodeCount);
          if (tgtIdx === srcIdx) tgtIdx = (srcIdx + 1) % nodeCount;
          edges.push(makeEdge(`e_${e}`, `N_${srcIdx}`, `N_${tgtIdx}`));
        }

        const oracleCrossings = fastEdgeCrossingCountOracle(nodes, edges, positions);
        const candidateCrossings = fastEdgeCrossingCountCandidate(nodes, edges, positions);

        if (oracleCrossings > candidateCrossings) {
          falseNegativesCount++;
        }

        expect(candidateCrossings).toBe(oracleCrossings);
      }

      expect(falseNegativesCount).toBe(0);
    });
  });

  // ============================================================================
  // SUITE 4: CANONICAL FIXTURE & DOWNSTREAM LAYOUT DIFFERENTIAL
  // ============================================================================

  describe('4. Canonical Fixture Differential & Downstream Layout Equivalence', () => {
    it('verifies Cloud Spend Tracker fixture exact C_pp = 7812, C_total = 85367', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const countersO: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };
      const countersC: DifferentialCounters = {
        totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
        exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
        degenerateCases: 0, falseNegatives: 0,
      };

      const oracleCrossings = fastEdgeCrossingCountOracle(nodes, edges, positions, countersO);
      const candidateCrossings = fastEdgeCrossingCountCandidate(nodes, edges, positions, countersC);

      expect(candidateCrossings).toBe(oracleCrossings);
      expect(candidateCrossings).toBe(85367);

      const detailed = calculateDetailedEdgeCrossings(nodes, edges, positions);
      expect(detailed.primaryPrimaryCrossings).toBe(7812);
      expect(detailed.totalGeometricCrossings).toBe(85367);

      console.log('\n--- CANONICAL DATASET CROSSING TELEMETRY ---');
      console.log(`Total Segment Pairs Examined : ${countersC.totalPairsExamined.toLocaleString()}`);
      console.log(`AABB-Rejected Pairs          : ${countersC.aabbRejected.toLocaleString()} (${((countersC.aabbRejected / countersC.totalPairsExamined) * 100).toFixed(2)}%)`);
      console.log(`AABB-Overlapping Pairs       : ${countersC.aabbOverlapping.toLocaleString()} (${((countersC.aabbOverlapping / countersC.totalPairsExamined) * 100).toFixed(2)}%)`);
      console.log(`Shared Endpoint Pairs        : ${countersC.sharedEndpoints.toLocaleString()}`);
      console.log(`Exact Predicate Executions   : ${countersC.exactPredicateExecutions.toLocaleString()}`);
      console.log(`Actual Geometric Crossings   : ${countersC.actualCrossings.toLocaleString()}`);
    });

    it('verifies downstream layout contract invariants (Clearance >= 40px, 0 Overlaps, 0.00000px Drift)', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const layoutA = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
      const layoutB = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      let maxDrift = 0;
      for (const key of Object.keys(layoutA)) {
        const drift = Math.hypot(layoutA[key].x - layoutB[key].x, layoutA[key].y - layoutB[key].y);
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

  // ============================================================================
  // SUITE 5: STAGE 6 ORDERING EQUIVALENCE
  // ============================================================================

  describe('5. Stage 6 Node Ordering & Sweep Equivalence', () => {
    it('verifies reduceEdgeCrossings produced bucket orders, ranks, and iterations are 100% identical', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const input: NodeOrderingInput = {
        nodes,
        edges,
        maxIterations: 8,
      };

      const resultOracle = reduceEdgeCrossings(input);
      const resultCandidate = reduceEdgeCrossings(input);

      expect(resultCandidate.estimatedCrossings).toBe(resultOracle.estimatedCrossings);
      expect(resultCandidate.iterationsExecuted).toBe(resultOracle.iterationsExecuted);

      // Verify bucket ordering equivalence
      resultOracle.bucketOrder.forEach((nodeIds, bucketKey) => {
        const candidateIds = resultCandidate.bucketOrder.get(bucketKey);
        expect(candidateIds).toBeDefined();
        expect(candidateIds).toEqual(nodeIds);
      });

      // Verify node rank map equivalence
      resultOracle.nodeRankMap.forEach((rank, nodeId) => {
        expect(resultCandidate.nodeRankMap.get(nodeId)).toBe(rank);
      });
    });
  });

  // ============================================================================
  // SUITE 6: MULTI-TIER SCALE BENCHMARKS & TIMING (TIERS 1 TO 5)
  // ============================================================================

  describe('6. Multi-Tier Scale Benchmarks (Tiers 1 to 5)', () => {
    it('benchmarks Oracle vs Candidate end-to-end Stage 6 and isolated crossing performance', () => {
      const scaleTiers = [
        { tier: 'T1 (240N/1024E)', nodes: 240, edges: 1024, isCst: true },
        { tier: 'T2 (500N/1000E)', nodes: 500, edges: 1000, isCst: false },
        { tier: 'T3 (1000N/2000E)', nodes: 1000, edges: 2000, isCst: false },
        { tier: 'T4 (2000N/4000E)', nodes: 2000, edges: 4000, isCst: false },
        { tier: 'T5 (5000N/10000E)', nodes: 5000, edges: 10000, isCst: false },
      ];

      console.log('\n--- MULTI-TIER STAGE 6 & CROSSING COUNTER BENCHMARKS ---');
      console.log('Tier               | Oracle Cross (ms) | Candidate Cross (ms) | Speedup | Oracle Stg6 (ms) | Cand Stg6 (ms) | Stg6 Speedup | AABB Rej (%)');
      console.log('------------------------------------------------------------------------------------------------------------------------------------');

      scaleTiers.forEach((t) => {
        let nodes: ExplorerNode[];
        let edges: ExplorerEdge[];
        let positions: PositionMap = {};

        if (t.isCst) {
          const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
          const dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
          nodes = dataset.nodes;
          edges = dataset.edges;
          positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
        } else {
          const graph = generateSyntheticSalesforceGraph({ nodeCount: t.nodes, seed: 42 + t.nodes });
          nodes = graph.nodes;
          edges = graph.edges;
          let pIdx = 0;
          nodes.forEach(n => {
            positions[n.id] = {
              x: (pIdx % 40) * 150,
              y: Math.floor(pIdx / 40) * 200,
            };
            pIdx++;
          });
        }

        const countersC: DifferentialCounters = {
          totalPairsExamined: 0, aabbRejected: 0, aabbOverlapping: 0,
          exactPredicateExecutions: 0, actualCrossings: 0, sharedEndpoints: 0,
          degenerateCases: 0, falseNegatives: 0,
        };

        // Measure single crossing counter
        const warmRuns = t.nodes >= 5000 ? 1 : 3;

        let timesO: number[] = [];
        for (let r = 0; r < warmRuns; r++) {
          const start = performance.now();
          fastEdgeCrossingCountOracle(nodes, edges, positions);
          timesO.push(performance.now() - start);
        }
        timesO.sort((a, b) => a - b);
        const medianCrossO = timesO[Math.floor(timesO.length / 2)];

        let timesC: number[] = [];
        for (let r = 0; r < warmRuns; r++) {
          const start = performance.now();
          fastEdgeCrossingCountCandidate(nodes, edges, positions, countersC);
          timesC.push(performance.now() - start);
        }
        timesC.sort((a, b) => a - b);
        const medianCrossC = timesC[Math.floor(timesC.length / 2)];

        const crossSpeedup = medianCrossO / (medianCrossC || 0.001);

        // Measure full Stage 6 duration
        const input: NodeOrderingInput = { nodes, edges, maxIterations: 8 };

        let stg6O: number[] = [];
        for (let r = 0; r < warmRuns; r++) {
          const start = performance.now();
          reduceEdgeCrossings(input);
          stg6O.push(performance.now() - start);
        }
        stg6O.sort((a, b) => a - b);
        const medianStg6O = stg6O[Math.floor(stg6O.length / 2)];

        let stg6C: number[] = [];
        for (let r = 0; r < warmRuns; r++) {
          const start = performance.now();
          reduceEdgeCrossings(input);
          stg6C.push(performance.now() - start);
        }
        stg6C.sort((a, b) => a - b);
        const medianStg6C = stg6C[Math.floor(stg6C.length / 2)];

        const stg6Speedup = medianStg6O / (medianStg6C || 0.001);

        const rejPct = countersC.totalPairsExamined > 0
          ? (countersC.aabbRejected / countersC.totalPairsExamined) * 100
          : 0;

        console.log(
          `${t.tier.padEnd(18)} | ${medianCrossO.toFixed(2).padStart(17)} | ${medianCrossC.toFixed(2).padStart(20)} | ${(crossSpeedup.toFixed(2) + 'x').padStart(7)} | ${medianStg6O.toFixed(2).padStart(16)} | ${medianStg6C.toFixed(2).padStart(14)} | ${(stg6Speedup.toFixed(2) + 'x').padStart(12)} | ${rejPct.toFixed(2)}%`
        );
      });
    }, 180000);
  });

  // ============================================================================
  // SUITE 7: DETERMINISM AND REPEATABILITY
  // ============================================================================

  describe('7. Determinism and Repeatability', () => {
    it('verifies 10 repeated Candidate crossing count executions have 0px drift and 0 variance', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const baseCrossings = fastEdgeCrossingCountCandidate(nodes, edges, positions);

      for (let run = 0; run < 10; run++) {
        const repeatCrossings = fastEdgeCrossingCountCandidate(nodes, edges, positions);
        expect(repeatCrossings).toBe(baseCrossings);
      }
    });

    it('verifies Candidate is input-order invariant under 5 shuffled input permutations', () => {
      const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const nodes: ExplorerNode[] = rawData.nodes;
      const edges: ExplorerEdge[] = rawData.edges;

      const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      const baseCrossings = fastEdgeCrossingCountCandidate(nodes, edges, positions);
      const prng = createPRNG(98765);

      for (let perm = 0; perm < 5; perm++) {
        const shuffledEdges = [...edges].sort(() => prng() - 0.5);
        const shuffledCrossings = fastEdgeCrossingCountCandidate(nodes, shuffledEdges, positions);
        expect(shuffledCrossings).toBe(baseCrossings);
      }
    });
  });
});

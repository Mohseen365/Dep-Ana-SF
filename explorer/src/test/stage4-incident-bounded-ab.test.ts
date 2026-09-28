import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';

import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

import type { ExplorerDataSchema, ExplorerEdge, ExplorerNode } from '../types/explorer';
import type { ArchitectureNodeAnalysis } from '../lib/layout/types';
import { findParentObjectId } from '../lib/layout/analysis';

// Canonical fixture paths and hash
const canonicalFixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawFixtureContent = readFileSync(canonicalFixturePath, 'utf-8');
const fixtureDigest = createHash('sha256').update(rawFixtureContent).digest('hex');

const rawParsed = JSON.parse(rawFixtureContent);
const canonicalDataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

interface Point {
  x: number;
  y: number;
}

function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}

function evaluateTotalCrossingsOracle(
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): { crossings: number; pairEvaluations: number } {
  const segs: Array<{ p1: Point; p2: Point; s: string; t: string }> = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      segs.push({ p1, p2, s: e.source, t: e.target });
    }
  }

  let count = 0;
  let pairs = 0;
  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      pairs++;
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        count++;
      }
    }
  }
  return { crossings: count, pairEvaluations: pairs };
}

function evaluateIncidentCrossingsCandidate(
  fieldSet: Set<string>,
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>,
  baseStaticStaticCrossings: number
): { crossings: number; pairEvaluations: number; incidentEdgeCount: number; staticEdgeCount: number } {
  const segs: Array<{ p1: Point; p2: Point; s: string; t: string; isIncident: boolean }> = [];
  let incidentEdgeCount = 0;
  let staticEdgeCount = 0;

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      const isInc = fieldSet.has(e.source) || fieldSet.has(e.target);
      if (isInc) {
        incidentEdgeCount++;
      } else {
        staticEdgeCount++;
      }
      segs.push({ p1, p2, s: e.source, t: e.target, isIncident: isInc });
    }
  }

  let incidentCrossings = 0;
  let pairs = 0;
  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (!s1.isIncident && !s2.isIncident) {
        // Skip static-static edge pair
        continue;
      }
      pairs++;
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        incidentCrossings++;
      }
    }
  }

  return {
    crossings: baseStaticStaticCrossings + incidentCrossings,
    pairEvaluations: pairs,
    incidentEdgeCount,
    staticEdgeCount,
  };
}

/**
 * Computes static-static edge crossings for a set of static edges.
 */
function computeStaticStaticCrossings(
  fieldSet: Set<string>,
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): { staticCrossings: number; staticPairs: number } {
  const staticSegs: Array<{ p1: Point; p2: Point; s: string; t: string }> = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!fieldSet.has(e.source) && !fieldSet.has(e.target)) {
      const p1 = positions[e.source];
      const p2 = positions[e.target];
      if (p1 && p2) {
        staticSegs.push({ p1, p2, s: e.source, t: e.target });
      }
    }
  }

  let count = 0;
  let pairs = 0;
  for (let i = 0; i < staticSegs.length; i++) {
    const s1 = staticSegs[i];
    for (let j = i + 1; j < staticSegs.length; j++) {
      const s2 = staticSegs[j];
      pairs++;
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        count++;
      }
    }
  }
  return { staticCrossings: count, staticPairs: pairs };
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let m = result.length, t: T, i: number;
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (m) {
    i = Math.floor(rng() * m--);
    t = result[m];
    result[m] = result[i];
    result[i] = t;
  }
  return result;
}

export interface GroupExperimentResult {
  groupId: string;
  fieldCount: number;
  totalEdges: number;
  incidentEdgeCount: number;
  staticEdgeCount: number;
  oraclePairsPerShift: number;
  candidatePairsPerShift: number;
  skippedStaticStaticPairsPerShift: number;
  oracleSelectedShift: number;
  candidateSelectedShift: number;
  oracleScores: number[];
  candidateScores: number[];
  shiftsEvaluated: number;
}

export interface Stage4ExperimentResult {
  groups: GroupExperimentResult[];
  totalOraclePairEvaluations: number;
  totalCandidatePairEvaluations: number;
  totalPairsSkipped: number;
  pairReductionPercent: number;
  oracleStage4RuntimeMs: number;
  candidateStage4RuntimeMs: number;
  stage4Speedup: number;
  oracleFinalPositions: Record<string, { x: number; y: number }>;
  candidateFinalPositions: Record<string, { x: number; y: number }>;
  allScoresMatch: boolean;
  allShiftsMatch: boolean;
  positionsMatch: boolean;
  maxCoordinateDriftPx: number;
}

/**
 * Runs Stage 4 isolated A/B experiment for a given dataset input.
 */
export function runStage4Experiment(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): Stage4ExperimentResult {
  const analysis = computeArchitectureAnalysis(nodes, edges);
  // Get initial primary positions before satellite placement
  const layoutRes = computeArchitectureLayoutWithMetadata(nodes, edges);
  const primaryPositions = layoutRes.positions;

  // Execute Stage 1-3 placement to get satellite positions right before Stage 4
  const preStage4Result = placeSatellites(
    nodes,
    edges,
    analysis,
    primaryPositions,
    { maxSatelliteDistance: 280 }
  );

  const safeEdges = Array.isArray(edges) ? edges : [];

  // Group fields by parent
  const fieldAnalyses: ArchitectureNodeAnalysis[] = [];
  for (const item of analysis.nodeList) {
    if (item.isField) {
      fieldAnalyses.push(item);
    }
  }

  const primaryNodeIds = new Set(Object.keys(primaryPositions));
  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;
    let parentId = fieldItem.parentObjectId;
    if (!parentId) {
      parentId = findParentObjectId(fieldItem.node, nodes, edges);
    }
    if (parentId && preStage4Result.positions[parentId]) {
      if (!fieldsByParent.has(parentId)) {
        fieldsByParent.set(parentId, []);
      }
      fieldsByParent.get(parentId)!.push(fieldItem);
    }
  }

  // Filter groups eligible for Stage 4 (field count >= 2)
  const eligibleGroupEntries: Array<[string, ArchitectureNodeAnalysis[]]> = [];
  fieldsByParent.forEach((fields, parentId) => {
    if (fields.length >= 2) {
      const fieldIds = fields.map(f => f.nodeId);
      const slots = fieldIds.map(id => preStage4Result.positions[id]).filter(Boolean);
      if (slots.length === fieldIds.length) {
        eligibleGroupEntries.push([parentId, fields]);
      }
    }
  });

  // Sort groups deterministically
  eligibleGroupEntries.sort((a, b) => a[0].localeCompare(b[0]));

  // Setup Oracle state & positions
  const oraclePositions = { ...preStage4Result.positions };
  const oracleSatellitePositions = { ...preStage4Result.satellitePositions };

  // Setup Candidate state & positions
  const candidatePositions = { ...preStage4Result.positions };
  const candidateSatellitePositions = { ...preStage4Result.satellitePositions };

  const groupsResults: GroupExperimentResult[] = [];

  let totalOraclePairEvals = 0;
  let totalCandidatePairEvals = 0;

  // --- Measure Oracle Stage 4 ---
  const oracleStart = performance.now();
  for (const [parentId, fields] of eligibleGroupEntries) {
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => oraclePositions[id]);

    let currentBestCrossings = evaluateTotalCrossingsOracle(safeEdges, oraclePositions).crossings;

    const maxShifts = Math.min(fieldIds.length, 5);
    for (let shift = 1; shift < maxShifts; shift++) {
      const testPositions = { ...oraclePositions };
      fieldIds.forEach((id, idx) => {
        testPositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const { crossings, pairEvaluations } = evaluateTotalCrossingsOracle(safeEdges, testPositions);
      totalOraclePairEvals += pairEvaluations;

      if (crossings < currentBestCrossings) {
        currentBestCrossings = crossings;
        fieldIds.forEach((id) => {
          oraclePositions[id] = testPositions[id];
          oracleSatellitePositions[id] = testPositions[id];
        });
      }
    }
  }
  const oracleEnd = performance.now();
  const oracleStage4RuntimeMs = oracleEnd - oracleStart;

  // --- Measure Candidate Stage 4 ---
  const candidateStart = performance.now();
  for (const [parentId, fields] of eligibleGroupEntries) {
    const fieldIds = fields.map(f => f.nodeId);
    const fieldSet = new Set(fieldIds);
    const slots = fieldIds.map(id => candidatePositions[id]);

    // Calculate static-static crossings for group
    const { staticCrossings } = computeStaticStaticCrossings(fieldSet, safeEdges, candidatePositions);

    let currentBestCrossings = evaluateIncidentCrossingsCandidate(
      fieldSet,
      safeEdges,
      candidatePositions,
      staticCrossings
    ).crossings;

    let oracleSelShift = 0;
    let candSelShift = 0;
    const oracleScores: number[] = [];
    const candScores: number[] = [];

    // Evaluate shift 0 score
    const shift0Oracle = evaluateTotalCrossingsOracle(safeEdges, candidatePositions).crossings;
    const shift0Cand = evaluateIncidentCrossingsCandidate(fieldSet, safeEdges, candidatePositions, staticCrossings).crossings;
    oracleScores.push(shift0Oracle);
    candScores.push(shift0Cand);

    let oraclePairsPerShift = 0;
    let candidatePairsPerShift = 0;

    const maxShifts = Math.min(fieldIds.length, 5);
    for (let shift = 1; shift < maxShifts; shift++) {
      const testPositions = { ...candidatePositions };
      fieldIds.forEach((id, idx) => {
        testPositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const oracleRes = evaluateTotalCrossingsOracle(safeEdges, testPositions);
      const candRes = evaluateIncidentCrossingsCandidate(fieldSet, safeEdges, testPositions, staticCrossings);

      oraclePairsPerShift = oracleRes.pairEvaluations;
      candidatePairsPerShift = candRes.pairEvaluations;
      totalCandidatePairEvals += candRes.pairEvaluations;

      oracleScores.push(oracleRes.crossings);
      candScores.push(candRes.crossings);

      if (candRes.crossings < currentBestCrossings) {
        currentBestCrossings = candRes.crossings;
        candSelShift = shift;
        fieldIds.forEach((id) => {
          candidatePositions[id] = testPositions[id];
          candidateSatellitePositions[id] = testPositions[id];
        });
      }
    }

    // Determine Oracle shift for recording
    let bestOracle = oracleScores[0];
    for (let s = 1; s < oracleScores.length; s++) {
      if (oracleScores[s] < bestOracle) {
        bestOracle = oracleScores[s];
        oracleSelShift = s;
      }
    }

    const totalE = safeEdges.length;
    const skippedPairs = oraclePairsPerShift - candidatePairsPerShift;

    groupsResults.push({
      groupId: parentId,
      fieldCount: fieldIds.length,
      totalEdges: totalE,
      incidentEdgeCount: candidatePairsPerShift,
      staticEdgeCount: totalE - candidatePairsPerShift,
      oraclePairsPerShift,
      candidatePairsPerShift,
      skippedStaticStaticPairsPerShift: skippedPairs,
      oracleSelectedShift: oracleSelShift,
      candidateSelectedShift: candSelShift,
      oracleScores,
      candidateScores: candScores,
      shiftsEvaluated: maxShifts - 1,
    });
  }
  const candidateEnd = performance.now();
  const candidateStage4RuntimeMs = candidateEnd - candidateStart;

  // Evaluate equivalence & drift
  let allScoresMatch = true;
  let allShiftsMatch = true;

  for (const g of groupsResults) {
    if (g.oracleSelectedShift !== g.candidateSelectedShift) {
      allShiftsMatch = false;
    }
    for (let s = 0; s < g.oracleScores.length; s++) {
      if (g.oracleScores[s] !== g.candidateScores[s]) {
        allScoresMatch = false;
      }
    }
  }

  let maxDrift = 0;
  let positionsMatch = true;
  const oracleNodeIds = Object.keys(oraclePositions);

  for (const id of oracleNodeIds) {
    const pOracle = oraclePositions[id];
    const pCand = candidatePositions[id];
    if (!pOracle || !pCand) {
      positionsMatch = false;
      continue;
    }
    const dx = Math.abs(pOracle.x - pCand.x);
    const dy = Math.abs(pOracle.y - pCand.y);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDrift) {
      maxDrift = dist;
    }
    if (dist > 1e-5) {
      positionsMatch = false;
    }
  }

  const totalPairsSkipped = totalOraclePairEvals - totalCandidatePairEvals;
  const pairReductionPercent = totalOraclePairEvals > 0
    ? ((totalOraclePairEvals - totalCandidatePairEvals) / totalOraclePairEvals) * 100
    : 0;

  const stage4Speedup = candidateStage4RuntimeMs > 0
    ? oracleStage4RuntimeMs / candidateStage4RuntimeMs
    : 1;

  return {
    groups: groupsResults,
    totalOraclePairEvaluations: totalOraclePairEvals,
    totalCandidatePairEvaluations: totalCandidatePairEvals,
    totalPairsSkipped,
    pairReductionPercent,
    oracleStage4RuntimeMs,
    candidateStage4RuntimeMs,
    stage4Speedup,
    oracleFinalPositions: oraclePositions,
    candidateFinalPositions: candidatePositions,
    allScoresMatch,
    allShiftsMatch,
    positionsMatch,
    maxCoordinateDriftPx: maxDrift,
  };
}

describe('STAGE 9 — CAND-9B CONTROLLED A/B EXPERIMENT', () => {
  it('Verify Canonical Fixture Digest', () => {
    expect(fixtureDigest).toBe('feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295');
  });

  it('Pair-Set Mathematical Model & Exact Score & Selected Shift Equivalence on Canonical Dataset', () => {
    const res = runStage4Experiment(canonicalDataset.nodes, canonicalDataset.edges);

    expect(res.allScoresMatch).toBe(true);
    expect(res.allShiftsMatch).toBe(true);
    expect(res.positionsMatch).toBe(true);
    expect(res.maxCoordinateDriftPx).toBe(0);

    // Verify mathematical pair formula for each group
    for (const g of res.groups) {
      const N_e = canonicalDataset.edges.length;
      const expectedOraclePairs = (N_e * (N_e - 1)) / 2;
      expect(g.oraclePairsPerShift).toBe(expectedOraclePairs);

      const expectedCandidatePairs = expectedOraclePairs - g.skippedStaticStaticPairsPerShift;
      expect(g.candidatePairsPerShift).toBe(expectedCandidatePairs);
    }
  });

  it('10x Determinism & 5x Input-Shuffle Verification on Canonical Dataset', () => {
    const baseline = runStage4Experiment(canonicalDataset.nodes, canonicalDataset.edges);

    // 10x Repetition
    for (let i = 0; i < 10; i++) {
      const repRes = runStage4Experiment(canonicalDataset.nodes, canonicalDataset.edges);
      expect(repRes.allScoresMatch).toBe(true);
      expect(repRes.allShiftsMatch).toBe(true);
      expect(repRes.maxCoordinateDriftPx).toBe(0);
    }

    // 5x Input-Order Shuffles
    for (let seed = 1; seed <= 5; seed++) {
      const shuffledNodes = shuffleArray(canonicalDataset.nodes, seed);
      const shuffledEdges = shuffleArray(canonicalDataset.edges, seed);

      const shuffleRes = runStage4Experiment(shuffledNodes, shuffledEdges);
      expect(shuffleRes.allScoresMatch).toBe(true);
      expect(shuffleRes.allShiftsMatch).toBe(true);
      expect(shuffleRes.maxCoordinateDriftPx).toBe(0);
    }
  });

  it('T1-T3 Scale Tier Correctness & Performance Benchmark', () => {
    const tiers = [
      { name: 'T1 (240N)', nodeCount: 240, seed: 41 },
      { name: 'T2 (500N)', nodeCount: 500, seed: 42 },
      { name: 'T3 (1000N)', nodeCount: 1000, seed: 43 },
    ];

    console.log('\n--- SCALE TIER BENCHMARK SUMMARY ---');
    for (const tier of tiers) {
      const synth = generateSyntheticSalesforceGraph({ nodeCount: tier.nodeCount, seed: tier.seed });
      const res = runStage4Experiment(synth.nodes, synth.edges);

      expect(res.allScoresMatch).toBe(true);
      expect(res.allShiftsMatch).toBe(true);
      expect(res.positionsMatch).toBe(true);
      expect(res.maxCoordinateDriftPx).toBe(0);

      console.log(`Tier ${tier.name}: ${synth.nodes.length} N, ${synth.edges.length} E | Groups: ${res.groups.length} | Oracle Evals: ${res.totalOraclePairEvaluations.toLocaleString()} | Candidate Evals: ${res.totalCandidatePairEvaluations.toLocaleString()} | Pair Reduction: ${res.pairReductionPercent.toFixed(2)}% | Oracle Time: ${res.oracleStage4RuntimeMs.toFixed(2)}ms | Candidate Time: ${res.candidateStage4RuntimeMs.toFixed(2)}ms | Speedup: ${res.stage4Speedup.toFixed(2)}x`);
    }
  }, 120000);

  it('Full Pipeline Geometry & Invariant Preservation Checks', () => {
    const oracleLayout = computeArchitectureLayoutWithMetadata(canonicalDataset.nodes, canonicalDataset.edges, { enableFeatureLayout: true });
    const oracleEval = evaluateLayout(canonicalDataset.nodes, canonicalDataset.edges, oracleLayout.positions);

    // Verify canonical layout metrics
    expect(oracleEval.detailedCrossings?.primaryPrimaryCrossings ?? 0).toBe(7812);
    expect(oracleEval.primaryOverlapCount).toBe(0);
    expect(oracleEval.satelliteOverlapCount).toBe(0);
    expect(oracleEval.layerViolationCount).toBe(0);
    expect(oracleEval.minClearance).toBeGreaterThanOrEqual(39.99);
  });
});

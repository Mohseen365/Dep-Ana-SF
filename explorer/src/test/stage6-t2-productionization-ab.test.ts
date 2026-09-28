import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  reduceEdgeCrossings,
  estimateCrossingsForOrder,
  LAYERS_IN_ORDER,
  LAYER_RANK,
} from '../lib/layout/ordering';
import type { NodeOrderingInput } from '../lib/layout/ordering';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { minimumNodeClearance } from '../lib/layout/metrics';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import {
  reduceEdgeCrossingsOracleWithCount,
  reduceEdgeCrossingsCandidate,
  hashBucketOrder,
} from './stage6-t2-t3-performance.test';

// ─── Helpers ──────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function lcgShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function loadCanonicalFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const fixtureRaw = fs.readFileSync(
    path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'),
    'utf-8'
  );
  const fixture = JSON.parse(fixtureRaw);
  return { nodes: fixture.nodes as ExplorerNode[], edges: fixture.edges as ExplorerEdge[] };
}

// ─── Test Suite ──────────────────────────────────────────────────────────

describe('Stage 6 T2 Productionization A/B Experiment', () => {

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 1: Direct Oracle vs T2 Production Correctness (1000 topologies)
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 1: 1000-topology Oracle vs T2 production correctness', { timeout: 600_000 }, () => {
    const sizes = [80, 120, 200, 300];
    const seedsPerSize = 250;
    let exactCases = 0;
    let mismatches = 0;
    const mismatchDetails: string[] = [];

    for (const size of sizes) {
      for (let seed = 1; seed <= seedsPerSize; seed++) {
        const synthetic = generateSyntheticSalesforceGraph({ nodeCount: size, seed });
        const input: NodeOrderingInput = { nodes: synthetic.nodes, edges: synthetic.edges };

        // Oracle (no T2 — from test harness)
        const oracleRes = reduceEdgeCrossingsOracleWithCount(input);
        // Production T2 (the real production function, now with T2 baked in)
        const t2ProdRes = reduceEdgeCrossings(input);

        const scoreMatch = oracleRes.result.estimatedCrossings === t2ProdRes.estimatedCrossings;
        const orderMatch = hashBucketOrder(oracleRes.result.bucketOrder) === hashBucketOrder(t2ProdRes.bucketOrder);

        if (scoreMatch && orderMatch) {
          exactCases++;
        } else {
          mismatches++;
          mismatchDetails.push(
            `N=${size} seed=${seed}: Oracle=${oracleRes.result.estimatedCrossings} T2Prod=${t2ProdRes.estimatedCrossings} scoreMatch=${scoreMatch} orderMatch=${orderMatch}`
          );
        }
      }
    }

    console.log(`\n=== TEST 1: Oracle vs T2 Production Correctness ===`);
    console.log(`Total cases: ${exactCases + mismatches}`);
    console.log(`Exact matches: ${exactCases}`);
    console.log(`Mismatches: ${mismatches}`);
    if (mismatchDetails.length > 0) {
      console.log(`Mismatch details:\n${mismatchDetails.join('\n')}`);
    }

    expect(exactCases).toBe(1000);
    expect(mismatches).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 2: Canonical Fixture Validation
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 2: Canonical fixture Oracle vs T2 production + full pipeline', { timeout: 120_000 }, () => {
    const { nodes, edges } = loadCanonicalFixture();
    const input: NodeOrderingInput = { nodes, edges };

    // Oracle vs T2 production
    const oracleRes = reduceEdgeCrossingsOracleWithCount(input);
    const t2ProdRes = reduceEdgeCrossings(input);

    console.log(`\n=== TEST 2: Canonical Fixture ===`);
    console.log(`Oracle crossings: ${oracleRes.result.estimatedCrossings}`);
    console.log(`T2 Prod crossings: ${t2ProdRes.estimatedCrossings}`);
    console.log(`Oracle evals: ${oracleRes.crossingEvaluations}`);
    console.log(`Oracle iterations: ${oracleRes.result.iterationsExecuted}`);
    console.log(`T2 Prod iterations: ${t2ProdRes.iterationsExecuted}`);

    expect(oracleRes.result.estimatedCrossings).toBe(t2ProdRes.estimatedCrossings);
    expect(hashBucketOrder(oracleRes.result.bucketOrder)).toBe(hashBucketOrder(t2ProdRes.bucketOrder));

    // Full pipeline
    const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const positionRecord = layoutResult.positions;

    const evaluation = evaluateLayout(nodes, edges, positionRecord);
    const clearance = minimumNodeClearance(nodes, edges, positionRecord);

    const cpp = evaluation.detailedCrossings?.primaryPrimaryCrossings;
    const ctotal = evaluation.edgeCrossingCount;

    console.log(`C_pp: ${cpp}`);
    console.log(`C_total: ${ctotal}`);
    console.log(`Min clearance: ${clearance.toFixed(5)}px`);
    console.log(`Primary overlaps: ${evaluation.primaryOverlapCount}`);
    console.log(`Satellite overlaps: ${evaluation.satelliteOverlapCount}`);
    console.log(`Layer violations: ${evaluation.layerViolationCount}`);

    expect(cpp).toBe(7812);
    expect(ctotal).toBe(85367);
    expect(clearance).toBeGreaterThanOrEqual(40.0);
    expect(evaluation.primaryOverlapCount).toBe(0);
    expect(evaluation.satelliteOverlapCount).toBe(0);
    expect(evaluation.layerViolationCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 3: Determinism (10 consecutive runs)
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 3: Determinism — 10 consecutive canonical runs', { timeout: 300_000 }, () => {
    const { nodes, edges } = loadCanonicalFixture();
    const runs: Record<string, { x: number; y: number }>[] = [];

    for (let run = 0; run < 10; run++) {
      const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
      const positionRecord = layoutResult.positions;
      runs.push(positionRecord);
    }

    let maxDrift = 0;
    const baselineRun = runs[0];
    for (let run = 1; run < runs.length; run++) {
      for (const nodeId of Object.keys(baselineRun)) {
        const base = baselineRun[nodeId];
        const current = runs[run][nodeId];
        if (!base || !current) continue;
        const dx = Math.abs(base.x - current.x);
        const dy = Math.abs(base.y - current.y);
        maxDrift = Math.max(maxDrift, dx, dy);
      }
    }

    console.log(`\n=== TEST 3: Determinism ===`);
    console.log(`Max drift across 10 runs: ${maxDrift.toFixed(5)}px`);

    expect(maxDrift).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 4: Shuffled-Input Invariance (5 permutations)
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 4: Shuffled-input invariance — 5 permutations', { timeout: 300_000 }, () => {
    const { nodes, edges } = loadCanonicalFixture();

    // Baseline (unshuffled)
    const baselineOrdering = reduceEdgeCrossings({ nodes, edges });
    const baselineHash = hashBucketOrder(baselineOrdering.bucketOrder);
    const baselineScore = baselineOrdering.estimatedCrossings;

    const baselineLayout = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const baselinePositions = baselineLayout.positions;

    let maxDrift = 0;
    let orderingMismatches = 0;

    for (let seed = 1; seed <= 5; seed++) {
      const shuffledNodes = lcgShuffle(nodes, seed);
      const shuffledEdges = lcgShuffle(edges, seed + 1000);

      // Stage 6 ordering
      const shuffledOrdering = reduceEdgeCrossings({ nodes: shuffledNodes, edges: shuffledEdges });
      const shuffledHash = hashBucketOrder(shuffledOrdering.bucketOrder);

      if (shuffledHash !== baselineHash || shuffledOrdering.estimatedCrossings !== baselineScore) {
        orderingMismatches++;
      }

      // Full pipeline
      const shuffledLayout = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
      const shuffledPositions = shuffledLayout.positions;

      for (const nodeId of Object.keys(baselinePositions)) {
        const base = baselinePositions[nodeId];
        const shuffled = shuffledPositions[nodeId];
        if (!base || !shuffled) continue;
        const dx = Math.abs(base.x - shuffled.x);
        const dy = Math.abs(base.y - shuffled.y);
        maxDrift = Math.max(maxDrift, dx, dy);
      }
    }

    console.log(`\n=== TEST 4: Shuffled-Input Invariance ===`);
    console.log(`Ordering mismatches: ${orderingMismatches}`);
    console.log(`Max geometry drift: ${maxDrift.toFixed(5)}px`);

    expect(orderingMismatches).toBe(0);
    expect(maxDrift).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 5: Crossing-Evaluation Telemetry
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 5: Crossing-evaluation telemetry across 5 scale tiers', { timeout: 300_000 }, () => {
    const tiers = [
      { name: 'T1', nodeCount: 240, seed: 42 },
      { name: 'T2', nodeCount: 500, seed: 100 },
      { name: 'T3', nodeCount: 1000, seed: 200 },
      { name: 'T4', nodeCount: 2000, seed: 300 },
      { name: 'T5', nodeCount: 5000, seed: 500 },
    ];

    console.log(`\n=== TEST 5: Crossing-Evaluation Telemetry ===`);
    console.log(`${'Tier'.padEnd(6)} | ${'Nodes'.padEnd(6)} | ${'Edges'.padEnd(7)} | ${'Oracle Evals'.padEnd(13)} | ${'T2 Evals'.padEnd(10)} | ${'Saved'.padEnd(7)} | ${'Reduction'.padEnd(10)}`);
    console.log('-'.repeat(75));

    for (const tier of tiers) {
      const synthetic = generateSyntheticSalesforceGraph({ nodeCount: tier.nodeCount, seed: tier.seed });
      const input: NodeOrderingInput = { nodes: synthetic.nodes, edges: synthetic.edges };

      const oracleRes = reduceEdgeCrossingsOracleWithCount(input);
      const t2CandidateRes = reduceEdgeCrossingsCandidate(input, 2);

      const saved = oracleRes.crossingEvaluations - t2CandidateRes.crossingEvaluations;
      const reductionPct = ((saved / oracleRes.crossingEvaluations) * 100).toFixed(1);

      console.log(
        `${tier.name.padEnd(6)} | ${String(synthetic.nodes.length).padEnd(6)} | ${String(synthetic.edges.length).padEnd(7)} | ${String(oracleRes.crossingEvaluations).padEnd(13)} | ${String(t2CandidateRes.crossingEvaluations).padEnd(10)} | ${String(saved).padEnd(7)} | ${reductionPct}%`
      );

      // T2 must never use more evaluations than Oracle
      expect(t2CandidateRes.crossingEvaluations).toBeLessThanOrEqual(oracleRes.crossingEvaluations);

      // T2 must produce same crossing score as Oracle
      expect(t2CandidateRes.result.estimatedCrossings).toBe(oracleRes.result.estimatedCrossings);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 6: Stage 6 Performance A/B (5 scale tiers)
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 6: Stage 6 performance A/B — 5 scale tiers', { timeout: 600_000 }, () => {
    const tiers = [
      { name: 'T1', nodeCount: 240, seed: 42 },
      { name: 'T2', nodeCount: 500, seed: 100 },
      { name: 'T3', nodeCount: 1000, seed: 200 },
      { name: 'T4', nodeCount: 2000, seed: 300 },
      { name: 'T5', nodeCount: 5000, seed: 500 },
    ];

    console.log(`\n=== TEST 6: Stage 6 Performance A/B ===`);

    for (const tier of tiers) {
      const synthetic = generateSyntheticSalesforceGraph({ nodeCount: tier.nodeCount, seed: tier.seed });
      const input: NodeOrderingInput = { nodes: synthetic.nodes, edges: synthetic.edges };

      // Cold runs
      const oracleColdStart = performance.now();
      const oracleColdRes = reduceEdgeCrossingsOracleWithCount(input);
      const oracleColdMs = performance.now() - oracleColdStart;

      const t2ColdStart = performance.now();
      const t2ColdRes = reduceEdgeCrossings(input);
      const t2ColdMs = performance.now() - t2ColdStart;

      // Warm runs (5 each)
      const oracleWarmMs: number[] = [];
      const t2WarmMs: number[] = [];

      for (let w = 0; w < 5; w++) {
        const os = performance.now();
        reduceEdgeCrossingsOracleWithCount(input);
        oracleWarmMs.push(performance.now() - os);

        const ts = performance.now();
        reduceEdgeCrossings(input);
        t2WarmMs.push(performance.now() - ts);
      }

      const oracleMedian = median(oracleWarmMs);
      const t2Median = median(t2WarmMs);
      const speedup = t2Median > 0 ? oracleMedian / t2Median : 0;
      const saving = oracleMedian - t2Median;

      console.log(`\n--- ${tier.name}: ${tier.nodeCount} nodes / ${synthetic.edges.length} edges ---`);
      console.log(`  Oracle: cold=${oracleColdMs.toFixed(2)}ms  warm=[${oracleWarmMs.map(v => v.toFixed(2)).join(', ')}]`);
      console.log(`  Oracle: min=${Math.min(...oracleWarmMs).toFixed(2)}ms  median=${oracleMedian.toFixed(2)}ms  max=${Math.max(...oracleWarmMs).toFixed(2)}ms`);
      console.log(`  T2 Prod: cold=${t2ColdMs.toFixed(2)}ms  warm=[${t2WarmMs.map(v => v.toFixed(2)).join(', ')}]`);
      console.log(`  T2 Prod: min=${Math.min(...t2WarmMs).toFixed(2)}ms  median=${t2Median.toFixed(2)}ms  max=${Math.max(...t2WarmMs).toFixed(2)}ms`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x   Saving: ${saving.toFixed(2)}ms`);
      console.log(`  Oracle score: ${oracleColdRes.result.estimatedCrossings}  T2 score: ${t2ColdRes.estimatedCrossings}`);
      console.log(`  Oracle sweeps: ${oracleColdRes.result.iterationsExecuted}  T2 sweeps: ${t2ColdRes.iterationsExecuted}`);

      // Correctness gate (not performance)
      expect(oracleColdRes.result.estimatedCrossings).toBe(t2ColdRes.estimatedCrossings);
      expect(hashBucketOrder(oracleColdRes.result.bucketOrder)).toBe(hashBucketOrder(t2ColdRes.bucketOrder));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST 7: Full-Pipeline Performance A/B
  // ═══════════════════════════════════════════════════════════════════════
  it('Test 7: Full-pipeline performance A/B — 3 scale tiers', { timeout: 600_000 }, () => {
    const tiers = [
      { name: 'T1', nodeCount: 240, seed: 42 },
      { name: 'T2', nodeCount: 500, seed: 100 },
      { name: 'T3', nodeCount: 1000, seed: 200 },
    ];

    console.log(`\n=== TEST 7: Full-Pipeline Performance A/B ===`);
    console.log('(Production function now has T2 — measuring full computeArchitectureLayoutWithMetadata)');

    for (const tier of tiers) {
      const synthetic = generateSyntheticSalesforceGraph({ nodeCount: tier.nodeCount, seed: tier.seed });

      // Cold run
      const coldStart = performance.now();
      const coldResult = computeArchitectureLayoutWithMetadata(synthetic.nodes, synthetic.edges);
      const coldMs = performance.now() - coldStart;

      // Warm runs
      const warmMs: number[] = [];
      for (let w = 0; w < 3; w++) {
        const ws = performance.now();
        computeArchitectureLayoutWithMetadata(synthetic.nodes, synthetic.edges);
        warmMs.push(performance.now() - ws);
      }

      const warmMedian = median(warmMs);

      console.log(`\n--- ${tier.name}: ${tier.nodeCount} nodes / ${synthetic.edges.length} edges ---`);
      console.log(`  Cold: ${coldMs.toFixed(2)}ms`);
      console.log(`  Warm: [${warmMs.map(v => v.toFixed(2)).join(', ')}]  median=${warmMedian.toFixed(2)}ms`);

      // Sanity: layout produced a result
      expect(coldResult).toBeDefined();
      expect(coldResult.positions).toBeDefined();
    }
  });
});

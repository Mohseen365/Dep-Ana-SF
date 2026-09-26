import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Stage 11 Forensic Scale Matrix', () => {
  function runTierBenchmark(name: string, nodes: ExplorerNode[], edges: ExplorerEdge[]) {
    const tStartFull = performance.now();
    const layoutPositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const fullLayoutMs = performance.now() - tStartFull;

    const spacingResult = resolveSpacingAndCollisions({
      nodes,
      edges,
      positions: layoutPositions,
      options: { enableTelemetry: true },
    });

    const telem = spacingResult.telemetry!;

    console.log(`\n=================== ${name}: ${nodes.length} Nodes / ${edges.length} Edges ===================`);
    console.log(`Full Layout Pipeline Duration: ${fullLayoutMs.toFixed(2)} ms (${(fullLayoutMs / 1000).toFixed(2)} s)`);
    console.log(`Stage 11 Total Duration (A)  : ${telem.stage11TotalMs.toFixed(2)} ms (${(telem.stage11TotalMs / 1000).toFixed(2)} s)`);
    console.log(`Stage 11 % of Full Layout    : ${((telem.stage11TotalMs / Math.max(1, fullLayoutMs)) * 100).toFixed(2)}%`);
    console.log(`Iterations Executed          : ${spacingResult.iterations}`);
    console.log(`Initial Overlap Pairs        : ${spacingResult.initialOverlapCount}`);
    console.log(`Final Overlap Pairs          : ${spacingResult.finalOverlapCount}`);
    console.log(`Max Displacement             : ${spacingResult.maxDisplacement.toFixed(2)} px`);
    console.log(`Total Displacement           : ${spacingResult.totalDisplacement.toFixed(2)} px`);
    console.log(`Candidate Pairs Generated    : ${telem.totalCandidatesGenerated}`);
    console.log(`Candidate Pairs Tested       : ${telem.totalCandidatesTested}`);
    console.log(`Collisions Found             : ${telem.totalCollisionsDetected}`);
    console.log(`Repairs Applied              : ${telem.totalRepairsApplied}`);
    console.log(`Max Candidates / Iteration   : ${telem.maxCandidatesPerIteration}`);
    console.log(`Max Collisions / Iteration   : ${telem.maxCollisionsPerIteration}`);
    console.log(`Avg Candidates / Iteration   : ${telem.avgCandidatesPerIteration.toFixed(2)}`);
    console.log(`Avg Collisions / Iteration   : ${telem.avgCollisionsPerIteration.toFixed(2)}`);
    console.log(`Avg Repairs / Iteration      : ${telem.avgRepairsPerIteration.toFixed(2)}`);
    console.log(`Time Breakdown:`);
    console.log(`  - Metric E (Geometry Setup): ${telem.geometryRecomputationMs.toFixed(2)} ms (${((telem.geometryRecomputationMs / Math.max(1, telem.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric B (Candidate Gen) : ${telem.candidateGenTotalMs.toFixed(2)} ms (${((telem.candidateGenTotalMs / Math.max(1, telem.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric C (Collision Test): ${telem.collisionTestTotalMs.toFixed(2)} ms (${((telem.collisionTestTotalMs / Math.max(1, telem.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric D (Resolution)     : ${telem.resolutionTotalMs.toFixed(2)} ms (${((telem.resolutionTotalMs / Math.max(1, telem.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric G (Unclassified)   : ${telem.unclassifiedMs.toFixed(2)} ms (${((telem.unclassifiedMs / Math.max(1, telem.stage11TotalMs)) * 100).toFixed(1)}%)`);

    if (telem.iterations.length > 0) {
      console.log(`Iteration Trace:`);
      telem.iterations.forEach(it => {
        console.log(`  Iter ${it.iteration}: duration=${it.durationMs.toFixed(2)}ms, candGen=${it.candidateGenMs.toFixed(2)}ms, test=${it.collisionTestMs.toFixed(2)}ms, res=${it.resolutionMs.toFixed(2)}ms, candidates=${it.candidatePairsGenerated}, tested=${it.candidatePairsTested}, collisions=${it.collisionsFound}, repairs=${it.repairsApplied}`);
      });
    }

    expect(spacingResult.finalOverlapCount).toBe(0);
    return telem;
  }

  it('Tier 1: 240 Nodes / 1024 Edges (CST)', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
    runTierBenchmark('Tier 1 (CST)', cstData.nodes, cstData.edges);
  }, 30000);

  it('Tier 2: 500 Nodes / ~1003 Edges', () => {
    const tier2 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 42, componentCount: 5 });
    runTierBenchmark('Tier 2', tier2.nodes, tier2.edges);
  }, 30000);

  it('Tier 3: 1000 Nodes / ~2020 Edges', () => {
    const tier3 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 42, componentCount: 8 });
    runTierBenchmark('Tier 3', tier3.nodes, tier3.edges);
  }, 60000);

  it('Tier 4: 2000 Nodes / ~3991 Edges', () => {
    const tier4 = generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 42, componentCount: 12 });
    runTierBenchmark('Tier 4', tier4.nodes, tier4.edges);
  }, 120000);

  it('Tier 5 Isolated Stage 11 Direct Benchmark (5,000 Nodes / 10,042 Edges)', () => {
    const tier5 = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 42, componentCount: 20 });

    // Create synthetic positions on a grid to simulate Stage 10 output
    const positions: Record<string, { x: number; y: number }> = {};
    const cols = 100;
    tier5.nodes.forEach((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions[n.id] = { x: col * 160, y: row * 100 };
    });

    const spacingResultClean = resolveSpacingAndCollisions({
      nodes: tier5.nodes,
      edges: tier5.edges,
      positions,
      options: { enableTelemetry: true },
    });

    const telemClean = spacingResultClean.telemetry!;
    console.log(`\n=================== Tier 5 Direct Non-Overlapping (5000 Nodes) ===================`);
    console.log(`Stage 11 Duration (Metric A) : ${telemClean.stage11TotalMs.toFixed(2)} ms`);
    console.log(`Metric E (Geometry Setup)    : ${telemClean.geometryRecomputationMs.toFixed(2)} ms`);
    console.log(`Initial Overlaps             : ${spacingResultClean.initialOverlapCount}`);

    expect(spacingResultClean.finalOverlapCount).toBe(0);

    // Now inject 200 deliberate dense overlaps to test collision cleanup resolution under heavy collision load at 5000 nodes!
    const overlappingPositions: Record<string, { x: number; y: number }> = { ...positions };
    for (let i = 0; i < 200; i++) {
      const nodeA = tier5.nodes[i * 2];
      const nodeB = tier5.nodes[i * 2 + 1];
      if (nodeA && nodeB) {
        overlappingPositions[nodeB.id] = { ...overlappingPositions[nodeA.id] };
      }
    }

    const spacingResultColliding = resolveSpacingAndCollisions({
      nodes: tier5.nodes,
      edges: tier5.edges,
      positions: overlappingPositions,
      options: { enableTelemetry: true },
    });

    const telemColliding = spacingResultColliding.telemetry!;
    console.log(`\n=================== Tier 5 Direct With Injected Overlaps (5000 Nodes, 200 Collisions) ===================`);
    console.log(`Stage 11 Duration (Metric A) : ${telemColliding.stage11TotalMs.toFixed(2)} ms (${(telemColliding.stage11TotalMs / 1000).toFixed(2)} s)`);
    console.log(`Iterations Executed          : ${spacingResultColliding.iterations}`);
    console.log(`Initial Overlaps             : ${spacingResultColliding.initialOverlapCount}`);
    console.log(`Final Overlaps               : ${spacingResultColliding.finalOverlapCount}`);
    console.log(`Total Candidates Generated   : ${telemColliding.totalCandidatesGenerated}`);
    console.log(`Total Candidates Tested      : ${telemColliding.totalCandidatesTested}`);
    console.log(`Total Collisions Detected    : ${telemColliding.totalCollisionsDetected}`);
    console.log(`Total Repairs Applied        : ${telemColliding.totalRepairsApplied}`);
    console.log(`Time Breakdown:`);
    console.log(`  - Metric E (Geometry Setup): ${telemColliding.geometryRecomputationMs.toFixed(2)} ms (${((telemColliding.geometryRecomputationMs / Math.max(1, telemColliding.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric B (Candidate Gen) : ${telemColliding.candidateGenTotalMs.toFixed(2)} ms (${((telemColliding.candidateGenTotalMs / Math.max(1, telemColliding.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric C (Collision Test): ${telemColliding.collisionTestTotalMs.toFixed(2)} ms (${((telemColliding.collisionTestTotalMs / Math.max(1, telemColliding.stage11TotalMs)) * 100).toFixed(1)}%)`);
    console.log(`  - Metric D (Resolution)     : ${telemColliding.resolutionTotalMs.toFixed(2)} ms (${((telemColliding.resolutionTotalMs / Math.max(1, telemColliding.stage11TotalMs)) * 100).toFixed(1)}%)`);

    if (telemColliding.iterations.length > 0) {
      console.log(`Iteration Trace:`);
      telemColliding.iterations.forEach(it => {
        console.log(`  Iter ${it.iteration}: duration=${it.durationMs.toFixed(2)}ms, candGen=${it.candidateGenMs.toFixed(2)}ms, test=${it.collisionTestMs.toFixed(2)}ms, res=${it.resolutionMs.toFixed(2)}ms, candidates=${it.candidatePairsGenerated}, tested=${it.candidatePairsTested}, collisions=${it.collisionsFound}, repairs=${it.repairsApplied}`);
      });
    }

    expect(spacingResultColliding.initialOverlapCount).toBeGreaterThan(0);
    expect(telemColliding.stage11TotalMs).toBeGreaterThan(0);
  }, 60000);

  it('verifies 100% bit-for-bit coordinate identity with vs without telemetry on CST fixture', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));

    const runWithoutTelem = resolveSpacingAndCollisions({
      nodes: cstData.nodes,
      edges: cstData.edges,
      positions: computeArchitectureLayout(cstData.nodes, cstData.edges, { enableFeatureLayout: true }),
      options: { enableTelemetry: false },
    });

    const runWithTelem = resolveSpacingAndCollisions({
      nodes: cstData.nodes,
      edges: cstData.edges,
      positions: computeArchitectureLayout(cstData.nodes, cstData.edges, { enableFeatureLayout: true }),
      options: { enableTelemetry: true },
    });

    let maxDrift = 0;
    Object.keys(runWithoutTelem.positions).forEach(nodeId => {
      const posA = runWithoutTelem.positions[nodeId];
      const posB = runWithTelem.positions[nodeId];
      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);
      maxDrift = Math.max(maxDrift, dx, dy);
    });

    expect(maxDrift).toBe(0);
    expect(runWithoutTelem.iterations).toBe(runWithTelem.iterations);
    expect(runWithoutTelem.finalOverlapCount).toBe(runWithTelem.finalOverlapCount);
  });
});

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

interface GraphFixture {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function loadCloudSpendFixture(): GraphFixture {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  const data = JSON.parse(raw);
  return {
    nodes: data.nodes || [],
    edges: data.edges || [],
  };
}

describe('Phase 3.7 — Multi-Row Hybrid Composition Performance, Complexity & Determinism Verification', () => {
  const cloudSpend = loadCloudSpendFixture();

  const phase2Baselines = {
    cloudSpend: 216.21,
    scale500: 587.42,
    scale1000: 1909.96,
    scale2000: 9741.86,
    scale5000: 95271.72,
  };

  it('1. Latency & Scaling Benchmarks: Cloud Spend, 500, 1000, 2000, 5000 nodes', { timeout: 180000 }, () => {
    console.log('\n==================================================');
    console.log('PHASE 3.7 MULTI-ROW HYBRID COMPOSITION PERFORMANCE');
    console.log('==================================================');
    console.log('Dataset / Scale | Phase 2 Baseline | Phase 3.7 Candidate | Compliance');

    // Cloud Spend Tracker (240 nodes, 1024 edges)
    const t0CS = performance.now();
    const csPositions = computeArchitectureLayout(cloudSpend.nodes, cloudSpend.edges, { enableFeatureLayout: true });
    const t1CS = performance.now();
    const csTime = Math.round((t1CS - t0CS) * 100) / 100;
    expect(Object.keys(csPositions).length).toBeGreaterThan(0);
    console.log(`Cloud Spend (240N) | ${phase2Baselines.cloudSpend} ms | ${csTime} ms | ${csTime <= phase2Baselines.cloudSpend * 1.5 ? 'PASSED' : 'WARNING'}`);

    // Synthetic 500 nodes
    const graph500 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 500 });
    const t0_500 = performance.now();
    const pos500 = computeArchitectureLayout(graph500.nodes, graph500.edges, { enableFeatureLayout: true });
    const time500 = Math.round((performance.now() - t0_500) * 100) / 100;
    expect(Object.keys(pos500).length).toBeGreaterThan(0);
    console.log(`Synthetic 500N | ${phase2Baselines.scale500} ms | ${time500} ms | ${time500 <= phase2Baselines.scale500 * 1.5 ? 'PASSED' : 'WARNING'}`);

    // Synthetic 1000 nodes
    const graph1000 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 1000 });
    const t0_1000 = performance.now();
    const pos1000 = computeArchitectureLayout(graph1000.nodes, graph1000.edges, { enableFeatureLayout: true });
    const time1000 = Math.round((performance.now() - t0_1000) * 100) / 100;
    expect(Object.keys(pos1000).length).toBeGreaterThan(0);
    console.log(`Synthetic 1000N | ${phase2Baselines.scale1000} ms | ${time1000} ms | ${time1000 <= phase2Baselines.scale1000 * 1.5 ? 'PASSED' : 'WARNING'}`);

    // Synthetic 2000 nodes
    const graph2000 = generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 2000 });
    const t0_2000 = performance.now();
    const pos2000 = computeArchitectureLayout(graph2000.nodes, graph2000.edges, { enableFeatureLayout: true });
    const time2000 = Math.round((performance.now() - t0_2000) * 100) / 100;
    expect(Object.keys(pos2000).length).toBeGreaterThan(0);
    console.log(`Synthetic 2000N | ${phase2Baselines.scale2000} ms | ${time2000} ms | ${time2000 <= phase2Baselines.scale2000 * 1.5 ? 'PASSED' : 'WARNING'}`);

    // Synthetic 5000 nodes
    const graph5000 = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 5000 });
    const t0_5000 = performance.now();
    const pos5000 = computeArchitectureLayout(graph5000.nodes, graph5000.edges, { enableFeatureLayout: true });
    const time5000 = Math.round((performance.now() - t0_5000) * 100) / 100;
    expect(Object.keys(pos5000).length).toBeGreaterThan(0);
    console.log(`Synthetic 5000N | ${phase2Baselines.scale5000} ms | ${time5000} ms | ${time5000 <= phase2Baselines.scale5000 * 1.5 ? 'PASSED' : 'WARNING'}`);
    console.log('==================================================\n');
  });

  it('2. 10 Identical Sequential Executions: 0.00000 px Drift Requirement', () => {
    const canonicalPositions = computeArchitectureLayout(cloudSpend.nodes, cloudSpend.edges, { enableFeatureLayout: true });

    for (let run = 1; run <= 10; run++) {
      const repeatPositions = computeArchitectureLayout(cloudSpend.nodes, cloudSpend.edges, { enableFeatureLayout: true });
      expect(Object.keys(repeatPositions).length).toEqual(Object.keys(canonicalPositions).length);

      for (const [nodeId, pos] of Object.entries(canonicalPositions)) {
        const rPos = repeatPositions[nodeId];
        expect(rPos, `Node ${nodeId} missing in run ${run}`).toBeDefined();
        const driftX = Math.abs(rPos.x - pos.x);
        const driftY = Math.abs(rPos.y - pos.y);
        expect(driftX, `Node ${nodeId} x drifted in run ${run}`).toBe(0);
        expect(driftY, `Node ${nodeId} y drifted in run ${run}`).toBe(0);
      }
    }
  });

  it('3. 5 Shuffled Input Permutations: Input Order Determinism (0.00000 px Drift)', () => {
    const canonicalPositions = computeArchitectureLayout(cloudSpend.nodes, cloudSpend.edges, { enableFeatureLayout: true });

    const seeds = [101, 202, 303, 404, 505];
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      // Deterministic shuffle using LCG random seed
      let lcg = seed;
      const pseudoRandom = () => {
        lcg = (lcg * 1664525 + 1013904223) % 4294967296;
        return lcg / 4294967296;
      };

      const shuffledNodes = [...cloudSpend.nodes].sort(() => pseudoRandom() - 0.5);
      const shuffledEdges = [...cloudSpend.edges].sort(() => pseudoRandom() - 0.5);

      const shuffledPositions = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });

      for (const [nodeId, pos] of Object.entries(canonicalPositions)) {
        const sPos = shuffledPositions[nodeId];
        expect(sPos, `Node ${nodeId} missing under shuffle permutation ${i + 1}`).toBeDefined();
        const driftX = Math.abs(sPos.x - pos.x);
        const driftY = Math.abs(sPos.y - pos.y);
        expect(driftX, `Node ${nodeId} x changed under shuffle permutation ${i + 1}`).toBe(0);
        expect(driftY, `Node ${nodeId} y changed under shuffle permutation ${i + 1}`).toBe(0);
      }
    }
  });
});

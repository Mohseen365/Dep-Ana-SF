import { describe, it, expect } from 'vitest';
import { ALL_BENCHMARK_FIXTURES } from './fixtures';
import { computeArchitectureLayout } from '../architecture-layout';
import { createLayoutGraphIndex } from './graph-index';
import { generateSyntheticSalesforceGraph } from '../../test/scalability-generator';

describe('Gate E — Determinism & Zero Coordinate Drift Gate', () => {
  it('verifies 100% exact coordinate equality (zero drift) across all 13 benchmark fixtures', () => {
    for (const fixture of ALL_BENCHMARK_FIXTURES) {
      const canonicalPositions = computeArchitectureLayout(fixture.nodes, fixture.edges);

      // Run layout 3 times sequentially
      for (let run = 0; run < 3; run++) {
        const repeatPositions = computeArchitectureLayout(fixture.nodes, fixture.edges);
        expect(Object.keys(repeatPositions).length).toEqual(Object.keys(canonicalPositions).length);

        for (const [nodeId, pos] of Object.entries(canonicalPositions)) {
          expect(repeatPositions[nodeId], `Node ${nodeId} position missing in run ${run}`).toBeDefined();
          expect(repeatPositions[nodeId].x, `Node ${nodeId} x moved in run ${run}`).toBe(pos.x);
          expect(repeatPositions[nodeId].y, `Node ${nodeId} y moved in run ${run}`).toBe(pos.y);
        }
      }
    }
  });

  it('verifies determinism under Stage 0 input node and edge array shuffling', () => {
    for (const fixture of ALL_BENCHMARK_FIXTURES) {
      const canonicalPositions = computeArchitectureLayout(fixture.nodes, fixture.edges);

      for (let shuffleRun = 0; shuffleRun < 5; shuffleRun++) {
        const shuffledNodes = [...fixture.nodes].sort(() => Math.random() - 0.5);
        const shuffledEdges = [...fixture.edges].sort(() => Math.random() - 0.5);

        const shuffledPositions = computeArchitectureLayout(shuffledNodes, shuffledEdges);

        for (const [nodeId, pos] of Object.entries(canonicalPositions)) {
          expect(shuffledPositions[nodeId].x, `Node ${nodeId} x changed under shuffle`).toBe(pos.x);
          expect(shuffledPositions[nodeId].y, `Node ${nodeId} y changed under shuffle`).toBe(pos.y);
        }
      }
    }
  });

  it('verifies Position Authority restoration: existingPositions override calculated layout', () => {
    const fixture = ALL_BENCHMARK_FIXTURES[0];
    const existing = {
      [fixture.nodes[0].id]: { x: 9999, y: -8888 },
      [fixture.nodes[1].id]: { x: 1234, y: 5678 },
    };

    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges, { existingPositions: existing });

    expect(positions[fixture.nodes[0].id]).toEqual({ x: 9999, y: -8888 });
    expect(positions[fixture.nodes[1].id]).toEqual({ x: 1234, y: 5678 });
  });

  it('runs scalability benchmarks and measures telemetry timings across synthetic Salesforce graphs', () => {
    const scales = [
      { nodes: 100 },
      { nodes: 500 },
      { nodes: 1000 },
      { nodes: 2500 },
    ];

    console.log('\n--- LAYOUT GRAPH INDEX SCALABILITY BENCHMARKS ---');
    console.log('Scale (N) | Index Construction (ms) | Total Layout (ms)');

    for (const scale of scales) {
      const graph = generateSyntheticSalesforceGraph({
        nodeCount: scale.nodes,
        seed: 42 + scale.nodes,
      });

      // Index construction timing
      const t0Index = performance.now();
      createLayoutGraphIndex(graph.nodes, graph.edges);
      const t1Index = performance.now();
      const indexTimeMs = Math.round((t1Index - t0Index) * 100) / 100;

      // Total layout timing
      const t0Total = performance.now();
      const positions = computeArchitectureLayout(graph.nodes, graph.edges);
      const t1Total = performance.now();
      const totalTimeMs = Math.round((t1Total - t0Total) * 100) / 100;

      expect(Object.keys(positions).length).toBeGreaterThanOrEqual(scale.nodes);

      console.log(`${scale.nodes} nodes | ${indexTimeMs}ms | ${totalTimeMs}ms`);
    }
  });
});

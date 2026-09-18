import { describe, it, expect } from 'vitest';
import { generateSyntheticSalesforceGraph } from '../test/scalability-generator';
import { computeArchitectureLayout } from './architecture-layout';

describe('Large Scale Architecture Layout Benchmarks & Invariants', () => {
  const scales = [500, 1000, 2000, 5000, 10000];

  scales.forEach(nodeCount => {
    it(`computes deterministic architecture layout cleanly for ${nodeCount} nodes`, () => {
      const { nodes, edges } = generateSyntheticSalesforceGraph({
        nodeCount,
        seed: 100 + nodeCount,
        componentCount: Math.min(10, Math.max(2, Math.floor(nodeCount / 250))),
      });

      expect(nodes.length).toBe(nodeCount);

      const startTime = performance.now();
      const positions = computeArchitectureLayout(nodes, edges);
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      // 1. Verify all nodes received position coordinates
      expect(Object.keys(positions).length).toBe(nodes.length);

      // 2. Coordinate validity check
      for (const pos of Object.values(positions)) {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
        expect(Number.isNaN(pos.x)).toBe(false);
        expect(Number.isNaN(pos.y)).toBe(false);
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }

      // 3. Determinism check (Run 2 with identical input + seed must produce identical coordinates)
      const positionsRun2 = computeArchitectureLayout(nodes, edges);
      expect(positionsRun2).toEqual(positions);

      // Log scale benchmark telemetry
      console.log(
        `[SCALE BENCHMARK] Scale: ${nodeCount} nodes | Edges: ${edges.length} | Layout Duration: ${durationMs.toFixed(2)}ms`
      );
    });
  });

  it('preserves architectural invariants at large scale (2,000 nodes)', () => {
    const { nodes, edges } = generateSyntheticSalesforceGraph({
      nodeCount: 2000,
      seed: 999,
      componentCount: 4,
    });

    const positions = computeArchitectureLayout(nodes, edges);

    // Layer y-offset assertions
    const lwcNode = nodes.find(n => n.type === 'LWC');
    const objectNode = nodes.find(n => n.type === 'Object');

    if (lwcNode && objectNode) {
      const lwcPosY = positions[lwcNode.id].y;
      const objectPosY = positions[objectNode.id].y;
      // Presentation layer (LWC) must be positioned above Schema layer (Object)
      expect(lwcPosY).toBeLessThan(objectPosY);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { ALL_BENCHMARK_FIXTURES } from './fixtures';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';

describe('Wave 4D Authoritative Measurement & Contract Validation', () => {

  it('verifies 0 node overlaps across all 13 benchmark fixtures', () => {
    ALL_BENCHMARK_FIXTURES.forEach(fixture => {
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
      expect(metrics.nodeOverlapCount, `Fixture ${fixture.id} has node overlaps`).toBe(0);
    });
  });

  it('verifies 100% determinism on repeated execution across all 13 benchmark fixtures', () => {
    ALL_BENCHMARK_FIXTURES.forEach(fixture => {
      const pos1 = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const pos2 = computeArchitectureLayout(fixture.nodes, fixture.edges);
      expect(pos1).toEqual(pos2);
    });
  });

  it('verifies 100% determinism under node and edge array shuffling', () => {
    // Seeded pseudo-random shuffle helper
    function shuffle<T>(array: T[], seed: number): T[] {
      const arr = [...array];
      let m = arr.length;
      let t: T;
      let i: number;
      let s = seed;
      while (m) {
        s = (s * 9301 + 49297) % 233280;
        i = Math.floor((s / 233280) * m--);
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
      }
      return arr;
    }

    const testFixtures = ALL_BENCHMARK_FIXTURES.filter(f =>
      ['hub-heavy', 'long-chain', 'dense-cross-domain', 'scale-100-plus', 'disconnected-components'].includes(f.id)
    );

    testFixtures.forEach(fixture => {
      const basePos = computeArchitectureLayout(fixture.nodes, fixture.edges);

      for (let run = 1; run <= 5; run++) {
        const shuffledNodes = shuffle(fixture.nodes, run * 100 + 7);
        const shuffledEdges = shuffle(fixture.edges, run * 200 + 13);

        const shuffledPos = computeArchitectureLayout(shuffledNodes, shuffledEdges);
        expect(shuffledPos, `Fixture ${fixture.id} differs after shuffle run ${run}`).toEqual(basePos);
      }
    });
  });

  it('verifies Position Authority Contract (existing positions take precedence)', () => {
    const fixture = ALL_BENCHMARK_FIXTURES.find(f => f.id === 'hub-heavy')!;
    const existingPositions: Record<string, { x: number; y: number }> = {
      'ApexClass:AuditLogger': { x: 9999, y: 8888 },
      'ApexClass:NotificationDispatcher': { x: -1234, y: -5678 },
    };

    const result = computeArchitectureLayout(fixture.nodes, fixture.edges, { existingPositions });

    expect(result['ApexClass:AuditLogger']).toEqual({ x: 9999, y: 8888 });
    expect(result['ApexClass:NotificationDispatcher']).toEqual({ x: -1234, y: -5678 });
  });

});

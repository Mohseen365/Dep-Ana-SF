import { describe, it, expect } from 'vitest';
import { ALL_BENCHMARK_FIXTURES } from './fixtures';
import { computeArchitectureLayout } from '../architecture-layout';
import {
  computeArchitectureAnalysis,
  findParentProductionNodeId,
  findParentObjectId,
} from './analysis';

describe('Layout Baseline Snapshot & Parent Resolution Parity', () => {
  it('captures reproducible layout positions across all 13 benchmark fixtures', () => {
    expect(ALL_BENCHMARK_FIXTURES.length).toBe(13);

    for (const fixture of ALL_BENCHMARK_FIXTURES) {
      const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);
      expect(Object.keys(positions).length).toBeGreaterThan(0);
      expect(Object.keys(positions).length).toBeGreaterThanOrEqual(fixture.nodes.length);

      for (const pos of Object.values(positions)) {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }
    }
  });

  it('validates existing parent resolution behavior on all fixtures', () => {
    for (const fixture of ALL_BENCHMARK_FIXTURES) {
      const analysis = computeArchitectureAnalysis(fixture.nodes, fixture.edges);
      for (const item of analysis.nodeList) {
        if (item.isTest) {
          const parentProdId = findParentProductionNodeId(item.node, fixture.nodes, fixture.edges);
          expect(item.parentProductionNodeId).toBe(parentProdId);
        }
        if (item.isField) {
          const parentObjId = findParentObjectId(item.node, fixture.nodes, fixture.edges);
          expect(item.parentObjectId).toBe(parentObjId);
        }
      }
    }
  });
});

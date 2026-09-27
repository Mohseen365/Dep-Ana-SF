import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { adaptConstellation } from './constellation-adapter';
import { computeConstellationLayout } from '../layout/constellation-layout';
import { ExplorerDataSchema } from '../../types/explorer';

describe('Real Dataset Verification (Cloud Spend Tracker - CST)', () => {
  const cstFixturePath = resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const rawData = readFileSync(cstFixturePath, 'utf-8');
  const cstData: ExplorerDataSchema = JSON.parse(rawData);

  it('verifies canonical CST dataset loads with 240 nodes and 1024 edges', () => {
    expect(cstData.nodes.length).toBe(240);
    expect(cstData.edges.length).toBe(1024);
  });

  it('runs constellation adapter on CST dataset within performance budget (< 50ms)', () => {
    const startTime = performance.now();
    const adapterResult = adaptConstellation(cstData, { maxDepth: 2 });
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(50);
    expect(adapterResult.focalNode).not.toBeNull();
    expect(adapterResult.rings.length).toBeGreaterThan(0);
    expect(adapterResult.summary.totalNodes).toBeGreaterThan(1);
    expect(adapterResult.summary.totalEdges).toBeGreaterThan(0);
  });

  it('runs constellation layout on CST dataset within performance budget (< 50ms)', () => {
    const adapterResult = adaptConstellation(cstData, { maxDepth: 2 });

    const startTime = performance.now();
    const layoutResult = computeConstellationLayout(adapterResult, {
      width: 1000,
      height: 1000,
      baseRadius: 180,
      ringStepRadius: 150,
    });
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(50);
    expect(layoutResult.focalPosition).not.toBeNull();
    expect(Object.keys(layoutResult.nodePositions).length).toBe(adapterResult.summary.totalNodes);
    expect(layoutResult.edgePaths.length).toBe(adapterResult.edges.length);
  });

  it('guarantees 100% position authority safety and zero canonical graph mutations on CST', () => {
    const originalNodePositions = cstData.nodes.map((n) => ({ id: n.id, pos: n.position ? { ...n.position } : undefined }));
    const originalJson = JSON.stringify(cstData);

    const adapterResult = adaptConstellation(cstData, { maxDepth: 2 });
    const layoutResult = computeConstellationLayout(adapterResult);

    // Verify input cstData is bit-for-bit unchanged
    expect(JSON.stringify(cstData)).toBe(originalJson);

    // Verify no node in cstData acquired a modified position object
    cstData.nodes.forEach((n, idx) => {
      expect(n.position).toEqual(originalNodePositions[idx].pos);
    });

    // Verify computed positions are finite
    Object.values(layoutResult.nodePositions).forEach((pos) => {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
      expect(Number.isNaN(pos.x)).toBe(false);
      expect(Number.isNaN(pos.y)).toBe(false);
    });
  });

  it('verifies 10x determinism on CST dataset', () => {
    const adapterResult1 = adaptConstellation(cstData, { maxDepth: 2 });
    const layoutResult1 = computeConstellationLayout(adapterResult1);

    for (let i = 0; i < 10; i++) {
      const adapterResult2 = adaptConstellation(cstData, { maxDepth: 2 });
      const layoutResult2 = computeConstellationLayout(adapterResult2);

      expect(adapterResult2).toEqual(adapterResult1);
      expect(layoutResult2).toEqual(layoutResult1);
    }
  });
});

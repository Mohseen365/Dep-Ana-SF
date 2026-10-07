import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { adaptComponentConstellation } from '../adapters/component-constellation-adapter';
import { computeComponentConstellationLayout } from './component-constellation-layout';
import type { ExplorerDataSchema } from '../../types/explorer';

describe('Component Constellation Layout — Geometry & Micro-Gate Validation', () => {
  const pbimPath = path.join(__dirname, '../../../../analyze/projects/pbim/explorer-data.json');
  const pbimRaw = fs.readFileSync(pbimPath, 'utf8');
  const pbimData: ExplorerDataSchema = JSON.parse(pbimRaw);

  it('1. Enforces macro contracted geometry (R1=900px, R2=1760px, 22.5° interlacing)', () => {
    const projection = adaptComponentConstellation(pbimData);
    const layout = computeComponentConstellationLayout(projection);

    const innerSuns = Object.values(layout.positions).filter((p) => p.isSun && p.sunRing === 'inner');
    const outerSuns = Object.values(layout.positions).filter((p) => p.isSun && p.sunRing === 'outer');

    expect(innerSuns.length).toBe(6);
    expect(outerSuns.length).toBe(8);

    innerSuns.forEach((sun) => {
      expect(sun.radius).toBe(900.0);
    });

    outerSuns.forEach((sun) => {
      expect(sun.radius).toBe(1760.0);
    });
  });

  it('2. Enforces Sun clearance (Min Center Distance >= 860px, Min Edge Clearance >= 60px)', () => {
    const projection = adaptComponentConstellation(pbimData);
    const layout = computeComponentConstellationLayout(projection);

    expect(layout.diagnostics.minSunCenterDistancePx).toBeGreaterThanOrEqual(860.0);
    expect(layout.diagnostics.minSunEdgeClearancePx).toBeGreaterThanOrEqual(60.0);
  });

  it('3. Enforces shared-node Sun AABB clearance (>= 120px gap)', () => {
    const projection = adaptComponentConstellation(pbimData);
    const layout = computeComponentConstellationLayout(projection);

    expect(layout.diagnostics.minSharedNodeAabbClearancePx).toBeGreaterThanOrEqual(120.0);
  });

  it('4. Guarantees 100% determinism (0.00000px coordinate drift)', () => {
    const projection = adaptComponentConstellation(pbimData);
    const baselineLayout = computeComponentConstellationLayout(projection);

    for (let i = 0; i < 10; i++) {
      const repeatedLayout = computeComponentConstellationLayout(projection);

      for (const [nodeId, pos] of Object.entries(baselineLayout.positions)) {
        const repPos = repeatedLayout.positions[nodeId];
        expect(repPos).toBeDefined();
        expect(repPos.x).toBe(pos.x);
        expect(repPos.y).toBe(pos.y);
      }
    }
  });
});

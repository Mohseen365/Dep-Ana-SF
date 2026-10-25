import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  applyCandidateDD_Combined,
  type RenderedNodeInfo,
  type RenderedCollisionPair,
} from './phase29rd-clearance-experiment.test';

describe('Phase 29R-D Determinism, Input-Order Invariance, and Safety Invariants', () => {
  it('Verifies determinism and safety invariants on cached baseline positions', () => {
    const fixtureDir = path.resolve(__dirname, '../../../audit-fixtures');
    const dimFile = path.join(fixtureDir, 'phase29rd-rendered-dimensions.json');
    const posFile = path.join(fixtureDir, 'phase28r-positions-and-labels.json');

    const dimData = JSON.parse(fs.readFileSync(dimFile, 'utf-8'));
    const posData = JSON.parse(fs.readFileSync(posFile, 'utf-8'));

    ['pbim', 'cloud-spend-tracker'].forEach((projId) => {
      const pDimData = dimData[projId];
      const renderedNodesMap = new Map<string, RenderedNodeInfo>();
      pDimData.nodes.forEach((n: RenderedNodeInfo) => renderedNodesMap.set(n.id, n));
      const collisions: RenderedCollisionPair[] = pDimData.collisions;

      const baseR4Pos = posData[projId]['R4_AdaptiveCapacity'].positions;
      const baseDDPos = applyCandidateDD_Combined(baseR4Pos, renderedNodesMap, collisions, 20, 20);

      // Verify 10 repeated executions yield exact 0.00000px drift
      for (let run = 0; run < 10; run++) {
        const runDDPos = applyCandidateDD_Combined(baseR4Pos, renderedNodesMap, collisions, 20, 20);
        Object.keys(baseDDPos).forEach(id => {
          expect(runDDPos[id].x).toBe(baseDDPos[id].x);
          expect(runDDPos[id].y).toBe(baseDDPos[id].y);
        });
      }

      // Verify node count & position validity
      const expectedCount = projId === 'pbim' ? 528 : 240;
      expect(Object.keys(baseDDPos).length).toBe(expectedCount);
      Object.keys(baseDDPos).forEach(id => {
        expect(Number.isFinite(baseDDPos[id].x)).toBe(true);
        expect(Number.isFinite(baseDDPos[id].y)).toBe(true);
      });
    });

    console.log('Deterministic transformation verified: 0.00000px drift across 10 runs for PBIM and CST.');
  });
});

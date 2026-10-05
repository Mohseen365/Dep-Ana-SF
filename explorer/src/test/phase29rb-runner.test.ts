import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadRealProjectData,
  runCandidateP28Pipeline,
  getDisplayLabel,
  getLabelDimensions,
  type CandidateP28Config,
  type CandidateP28Result,
} from './phase28r-adaptive-capacity.test';

describe('Phase 29R-B Independent Analytical Reproduction', () => {
  it('Reproduces Candidate Matrix R0-R4 on PBIM and CST', { timeout: 300000 }, () => {
    const pbim = loadRealProjectData('pbim');
    const cst = loadRealProjectData('cloud-spend-tracker');

    const configs: CandidateP28Config[] = [
      { candidateId: 'R0_P27E_Reproduction', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 4, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R1_maxCols3', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 3, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R2_maxCols2', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 2, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R3_maxCols1', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 1, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R4_AdaptiveCapacity', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, adaptiveCapacity: true, minHorizontalGap: 40, minVerticalGap: 40 },
    ];

    console.log('--- PBIM REPRODUCTION ---');
    for (const cfg of configs) {
      const res = runCandidateP28Pipeline(pbim.nodes, pbim.edges, cfg);
      console.log(`[PBIM] ${cfg.candidateId.padEnd(24)} | W=${res.m3_width} H=${res.m4_height} Area=${(res.m5_area/1e6).toFixed(1)}M | ShapeAABB=${res.m10_aabbCollisions} LabelAABB=${res.m11_labelAabbCollisions}`);
    }

    console.log('\n--- CST REPRODUCTION ---');
    for (const cfg of configs) {
      const res = runCandidateP28Pipeline(cst.nodes, cst.edges, cfg);
      console.log(`[CST]  ${cfg.candidateId.padEnd(24)} | W=${res.m3_width} H=${res.m4_height} Area=${(res.m5_area/1e6).toFixed(1)}M | ShapeAABB=${res.m10_aabbCollisions} LabelAABB=${res.m11_labelAabbCollisions}`);
    }
  });

  it('Enumerates all PBIM R4 and CST R4 collision pairs', { timeout: 300000 }, () => {
    const pbim = loadRealProjectData('pbim');
    const cst = loadRealProjectData('cloud-spend-tracker');

    const configR4: CandidateP28Config = { candidateId: 'R4_AdaptiveCapacity', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, adaptiveCapacity: true, minHorizontalGap: 40, minVerticalGap: 40 };

    function getCollisionPairs(nodes: any[], edges: any[], projId: string) {
      const res = runCandidateP28Pipeline(nodes, edges, configR4);
      const positions = res.positions;
      const displayLabels = res.displayLabels;
      const nodeIds = Object.keys(positions);

      const nodeList = nodeIds.map(id => {
        const rawNode = nodes.find(n => n.id === id)!;
        const label = displayLabels[id];
        const dim = getLabelDimensions(label);
        return {
          id,
          x: positions[id].x,
          y: positions[id].y,
          label,
          width: dim.width,
          height: dim.height,
        };
      });

      const shapePairs: any[] = [];
      const labelPairs: any[] = [];

      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = nodeList[i];
          const b = nodeList[j];

          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);

          if (dx < 120 - 1e-3 && dy < 60 - 1e-3) {
            shapePairs.push({
              nodeA: a.id,
              nodeB: b.id,
              centerA: { x: a.x, y: a.y },
              centerB: { x: b.x, y: b.y },
              dx,
              dy,
              overlapX: 120 - dx,
              overlapY: 60 - dy,
            });
          }

          const reqW = (a.width + b.width) / 2;
          const reqH = (a.height + b.height) / 2;
          if (dx < reqW - 1e-3 && dy < reqH - 1e-3) {
            let axisClass = 'TRUE_2D';
            if (dy < 10) axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
            else if (dy <= 160) axisClass = 'ADJACENT_ROW_2D';

            labelPairs.push({
              nodeA: a.id,
              nodeB: b.id,
              centerA: { x: a.x, y: a.y },
              centerB: { x: b.x, y: b.y },
              labelA: a.label,
              labelB: b.label,
              widthA: a.width,
              heightA: a.height,
              widthB: b.width,
              heightB: b.height,
              dx,
              dy,
              overlapX: reqW - dx,
              overlapY: reqH - dy,
              axisClass,
            });
          }
        }
      }

      return { shapePairs, labelPairs, result: res };
    }

    const pbimDetails = getCollisionPairs(pbim.nodes, pbim.edges, 'pbim');
    const cstDetails = getCollisionPairs(cst.nodes, cst.edges, 'cloud-spend-tracker');

    console.log(`\nPBIM R4 Shape Collision Pairs Count: ${pbimDetails.shapePairs.length}`);
    console.log(`PBIM R4 Label Collision Pairs Count: ${pbimDetails.labelPairs.length}`);

    console.log(`\nCST R4 Shape Collision Pairs Count: ${cstDetails.shapePairs.length}`);
    console.log(`CST R4 Label Collision Pairs Count: ${cstDetails.labelPairs.length}`);

    expect(pbimDetails.shapePairs.length).toBe(0);
    expect(pbimDetails.labelPairs.length).toBe(75);
    expect(cstDetails.shapePairs.length).toBe(1);
    expect(cstDetails.labelPairs.length).toBe(21);

    fs.writeFileSync(
      path.resolve(__dirname, '../../../audit-fixtures/phase29rb-pairs.json'),
      JSON.stringify({ pbim: pbimDetails, cst: cstDetails }, null, 2)
    );
  });
});

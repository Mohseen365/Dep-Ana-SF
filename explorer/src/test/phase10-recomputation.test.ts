import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { adaptConstellation } from '../lib/adapters/constellation-adapter';
import { computeMultiTrackConstellationLayout } from './phase9-constellation-multi-track-experiment.test';

function loadDS(file: string) {
  const p1 = path.resolve(process.cwd(), file);
  const p2 = path.resolve(process.cwd(), 'explorer', file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

describe('Phase 10 — Complete Pair Audit, Cross-Dataset Recomputation & Table Reconciliation', () => {
  test('Audit Cross-Dataset Collision Counts (T=4, Δr=40px, Strategy B)', () => {
    const cstData = loadDS('public/projects/cst/explorer-data.json');
    const bqcData = loadDS('public/projects/bqc/explorer-data.json');
    const pbimData = loadDS('public/projects/pbim/explorer-data.json');

    const scenarios = [
      { name: 'CST Org_Hierarchy 3-hop', data: cstData, focal: 'Object:Organization_Hierarchy__c', depth: 3, reportCount: 0 },
      { name: 'BQC Bouquet_Order__c 2-hop', data: bqcData, focal: 'Object:Bouquet_Order__c', depth: 2, reportCount: 2 },
      { name: 'BQC Bouquet_Order__c 3-hop', data: bqcData, focal: 'Object:Bouquet_Order__c', depth: 3, reportCount: 4 },
      { name: 'PBIM Maintenance_Request__c 2-hop', data: pbimData, focal: 'Object:Maintenance_Request__c', depth: 2, reportCount: 0 },
      { name: 'PBIM Maintenance_Request__c 3-hop', data: pbimData, focal: 'Object:Maintenance_Request__c', depth: 3, reportCount: 4 },
    ];

    scenarios.forEach((scen) => {
      const constData = adaptConstellation(scen.data, {
        focalNodeId: scen.focal,
        maxDepth: scen.depth,
        direction: 'both',
      });

      const res = computeMultiTrackConstellationLayout(constData, {
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        radiusAlignment: 'BASE_OUTWARD',
        sparseThreshold: 40,
      });

      expect(res.totalAabbOverlaps).toBe(scen.reportCount);
    });
  });

  test('Verify Locality, Canvas, and Capacity Metrics for PBIM 2-hop & 3-hop', () => {
    const pbimData = loadDS('public/projects/pbim/explorer-data.json');

    const constData2 = adaptConstellation(pbimData, { focalNodeId: 'Object:Maintenance_Request__c', maxDepth: 2 });
    const constData3 = adaptConstellation(pbimData, { focalNodeId: 'Object:Maintenance_Request__c', maxDepth: 3 });

    const res2 = computeMultiTrackConstellationLayout(constData2, {
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: 40,
    });

    const res3 = computeMultiTrackConstellationLayout(constData3, {
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: 40,
    });

    // Check occupied canvas width
    expect(res2.occupiedBoundingBox.width).toBe(922.48);
    expect(res3.occupiedBoundingBox.width).toBe(1224.00);

    // Check locality
    expect(res2.connectedEdgeLocality.median).toBe(384.31);
    expect(res3.connectedEdgeLocality.median).toBe(406.56);
  });
});

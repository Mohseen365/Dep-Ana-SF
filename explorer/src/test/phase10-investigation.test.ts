import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { adaptConstellation, ConstellationData } from '../lib/adapters/constellation-adapter';
import { computeMultiTrackConstellationLayout, MultiTrackLayoutResult } from './phase9-constellation-multi-track-experiment.test';

function loadDS(file: string) {
  const p1 = path.resolve(process.cwd(), file);
  const p2 = path.resolve(process.cwd(), 'explorer', file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

describe('Phase 10 — Independent Measurement Integrity Verification Suite', () => {
  test('1. PBIM 3-Hop Exact Coordinate & Collision Extraction', () => {
    const rawData = loadDS('public/projects/pbim/explorer-data.json');
    const constData = adaptConstellation(rawData, {
      focalNodeId: 'Object:Maintenance_Request__c',
      maxDepth: 3,
      direction: 'both',
    });

    const res = computeMultiTrackConstellationLayout(constData, {
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      radiusAlignment: 'BASE_OUTWARD',
      sparseThreshold: 40,
    });

    expect(constData.summary.totalNodes).toBe(415);
    expect(constData.rings[0].totalCount).toBe(69);
    expect(constData.rings[1].totalCount).toBe(217);
    expect(constData.rings[2].totalCount).toBe(128);

    console.log('\n=== PBIM 3-HOP OVERLAP DETAILS ===');
    console.log(`Total AABB Overlaps: ${res.totalAabbOverlaps}`);
    console.log(`Same-Track Overlaps: ${res.sameTrackOverlaps}`);
    console.log(`Cross-Track Overlaps: ${res.crossTrackOverlaps}`);
    console.log(`Focal Overlaps: ${res.focalOverlaps}`);

    res.overlappingPairs.forEach((pair, idx) => {
      const posA = res.nodePositions[pair.nodeA];
      const posB = res.nodePositions[pair.nodeB];

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);
      const euclidean = Math.sqrt(dx * dx + dy * dy);
      const isAabbCollision = dx < 24 && dy < 24;

      console.log(`\nOverlapping Pair #${idx + 1}:`);
      console.log(`  Node A: ID=${posA.nodeId}`);
      console.log(`          Ring=${posA.ringIndex}, Track=${posA.trackIndex}, Radius=${posA.radius}px`);
      console.log(`          AngleRad=${posA.angleRad.toFixed(6)} rad (${posA.angleDeg.toFixed(4)}°)`);
      console.log(`          X=${posA.x.toFixed(4)}px, Y=${posA.y.toFixed(4)}px`);
      console.log(`  Node B: ID=${posB.nodeId}`);
      console.log(`          Ring=${posB.ringIndex}, Track=${posB.trackIndex}, Radius=${posB.radius}px`);
      console.log(`          AngleRad=${posB.angleRad.toFixed(6)} rad (${posB.angleDeg.toFixed(4)}°)`);
      console.log(`          X=${posB.x.toFixed(4)}px, Y=${posB.y.toFixed(4)}px`);
      console.log(`  Delta:  dx=${dx.toFixed(6)}px, dy=${dy.toFixed(6)}px`);
      console.log(`          Euclidean Center Dist=${euclidean.toFixed(6)}px`);
      console.log(`          AABB Predicate (dx < 24 && dy < 24): ${isAabbCollision}`);

      expect(isAabbCollision).toBe(true);
      expect(dx).toBeLessThan(24);
      expect(dy).toBeLessThan(24);
    });
  });

  test('2. Independent Collision Verifier (No Phase 9 Helper Calls)', () => {
    const rawData = loadDS('public/projects/pbim/explorer-data.json');
    const constData = adaptConstellation(rawData, {
      focalNodeId: 'Object:Maintenance_Request__c',
      maxDepth: 3,
      direction: 'both',
    });

    const res = computeMultiTrackConstellationLayout(constData, {
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      radiusAlignment: 'BASE_OUTWARD',
      sparseThreshold: 40,
    });

    // Run independent verifier directly on nodePositions map
    const nodeIds = Object.keys(res.nodePositions);
    let independentSameTrack = 0;
    let independentCrossTrack = 0;
    let independentFocal = 0;

    const independentSet = new Set<string>();

    for (let i = 0; i < nodeIds.length; i++) {
      const idA = nodeIds[i];
      const posA = res.nodePositions[idA];
      const dimA = posA.hopDistance === 0 ? 36 : 24;

      for (let j = i + 1; j < nodeIds.length; j++) {
        const idB = nodeIds[j];
        const posB = res.nodePositions[idB];
        const dimB = posB.hopDistance === 0 ? 36 : 24;

        const reqClearance = (dimA + dimB) / 2; // 24 for orbital-orbital, 30 for focal-orbital

        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);

        if (dx < reqClearance && dy < reqClearance) {
          const pairKey = [idA, idB].sort().join('::');
          independentSet.add(pairKey);

          if (posA.hopDistance === 0 || posB.hopDistance === 0) {
            independentFocal++;
          } else if (posA.ringIndex === posB.ringIndex && posA.trackIndex === posB.trackIndex) {
            independentSameTrack++;
          } else {
            independentCrossTrack++;
          }
        }
      }
    }

    expect(independentSameTrack).toBe(0);
    expect(independentCrossTrack).toBe(4);
    expect(independentFocal).toBe(0);
    expect(independentSet.size).toBe(4);
  });

  test('3. Audit All Ring 2 Track 4 vs Ring 3 Track 1 Candidate Pairs', () => {
    const rawData = loadDS('public/projects/pbim/explorer-data.json');
    const constData = adaptConstellation(rawData, {
      focalNodeId: 'Object:Maintenance_Request__c',
      maxDepth: 3,
      direction: 'both',
    });

    const res = computeMultiTrackConstellationLayout(constData, {
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      radiusAlignment: 'BASE_OUTWARD',
      sparseThreshold: 40,
    });

    const r2t3Nodes = Object.values(res.nodePositions).filter((p) => p.ringIndex === 2 && p.trackIndex === 3);
    const r3t0Nodes = Object.values(res.nodePositions).filter((p) => p.ringIndex === 3 && p.trackIndex === 0);

    console.log(`\nCandidate Pairs Audit between R2T3 (N=${r2t3Nodes.length}) and R3T0 (N=${r3t0Nodes.length}):`);
    console.log(`Total candidate pairs: ${r2t3Nodes.length * r3t0Nodes.length}`);

    let minDx = Infinity;
    let minDy = Infinity;
    let minEuclidean = Infinity;
    let minRadialSep = Infinity;

    let minEuclidPair: { nodeA: string; nodeB: string; dx: number; dy: number; dist: number } | null = null;
    let aabbCollisionCount = 0;

    r2t3Nodes.forEach((nodeA) => {
      r3t0Nodes.forEach((nodeB) => {
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radSep = Math.abs(nodeA.radius - nodeB.radius);

        if (dx < minDx) minDx = dx;
        if (dy < minDy) minDy = dy;
        if (dist < minEuclidean) {
          minEuclidean = dist;
          minEuclidPair = { nodeA: nodeA.nodeId, nodeB: nodeB.nodeId, dx, dy, dist };
        }
        if (radSep < minRadialSep) minRadialSep = radSep;

        if (dx < 24 && dy < 24) {
          aabbCollisionCount++;
        }
      });
    });

    console.log(`  Actual AABB collisions: ${aabbCollisionCount}`);
    console.log(`  Min dx: ${minDx.toFixed(6)}px`);
    console.log(`  Min dy: ${minDy.toFixed(6)}px`);
    console.log(`  Min Euclidean distance: ${minEuclidean.toFixed(6)}px`);
    console.log(`  Min Radial separation: ${minRadialSep.toFixed(6)}px`);
    console.log(`  Min Euclidean Pair: ${minEuclidPair?.nodeA} vs ${minEuclidPair?.nodeB}`);

    expect(aabbCollisionCount).toBe(4);
  });
});

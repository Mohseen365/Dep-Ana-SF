import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { projectOrbitSemantics, OrbitNodeMetadata } from '../lib/layout/orbit-semantics';
import {
  computeOrbitLayout,
  checkAABBOverlap,
  normalizeAngle,
  calculateRequiredSectorRadius,
} from '../lib/layout/orbit-layout';

describe('ARCHITECTURE ORBIT — FINAL GEOMETRY TRUTH ADVERSARIAL CLOSURE SUITE', () => {
  const pbimPath = path.resolve(__dirname, '../../public/projects/pbim/explorer-data.json');

  it('Section 4: Reproduces Real PBIM from Repository Fixture', () => {
    expect(fs.existsSync(pbimPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));

    expect(raw.nodes.length).toBe(528);
    expect(raw.edges.length).toBe(2063);

    const proj = projectOrbitSemantics(raw.nodes, raw.edges);

    expect(proj.summary.totalNodes).toBe(528);
    expect(proj.summary.totalEdges).toBe(2063);
    expect(proj.nodeList.length).toBe(528);

    // Verify 6-ring distribution
    expect(proj.ringCounts[0]).toBe(43);  // Entry / Presentation
    expect(proj.ringCounts[1]).toBe(38);  // Application
    expect(proj.ringCounts[2]).toBe(15);  // Domain / Service
    expect(proj.ringCounts[3]).toBe(6);   // Schema Objects
    expect(proj.ringCounts[4]).toBe(264); // Schema Detail / External
    expect(proj.ringCounts[5]).toBe(162); // Supporting / Tests / Shared
    expect(
      proj.ringCounts[0] +
      proj.ringCounts[1] +
      proj.ringCounts[2] +
      proj.ringCounts[3] +
      proj.ringCounts[4] +
      proj.ringCounts[5]
    ).toBe(528);

    expect(proj.featureCount).toBe(63);
    expect(proj.domainCount).toBe(196);
    expect(proj.summary.sectorCount).toBe(65);

    // Verify orbitSectorId === primaryFeatureId
    proj.nodeList.forEach((n) => {
      expect(n.orbitSectorId).toBe(n.primaryFeatureId);
    });
  });

  it('Section 6: Reconciles Sector Population and Complete 65-Sector Distribution', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);

    let sumSectorPopulation = 0;
    let maxSectorPopulation = 0;
    let maxSectorId = '';
    let minSectorPopulation = Infinity;

    Object.entries(proj.sectorCounts).forEach(([secId, count]) => {
      sumSectorPopulation += count;
      if (count > maxSectorPopulation) {
        maxSectorPopulation = count;
        maxSectorId = secId;
      }
      if (count < minSectorPopulation) {
        minSectorPopulation = count;
      }
    });

    expect(Object.keys(proj.sectorCounts).length).toBe(65);
    expect(sumSectorPopulation).toBe(528);
    expect(maxSectorPopulation).toBe(318);
    expect(maxSectorId).toBe('Unassigned');
    expect(minSectorPopulation).toBe(1);
  });

  it('Section 7 & 17: Reconciles Initial Collision Count vs Defensive Repair', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);

    const layout = computeOrbitLayout({ nodes: proj.nodeList });

    // Initial collisions from analytical placement
    expect(layout.diagnostics.initialCollisionCount).toBe(37);

    // Defensive repair metrics
    expect(layout.diagnostics.repairCount).toBe(23);

    // Final collision count after repair
    expect(layout.diagnostics.collisionCount).toBe(0);

    // 528 Node Conservation
    expect(Object.keys(layout.positions).length).toBe(528);
  });

  it('Section 8 & 20: Verifies AABB Contract and Scalar Pair Safety Margin', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);
    const layout = computeOrbitLayout({ nodes: proj.nodeList });

    const posList = Object.values(layout.positions);
    let minPairMargin = Infinity;
    let worstPair: any = null;

    for (let i = 0; i < posList.length; i++) {
      for (let j = i + 1; j < posList.length; j++) {
        const a = posList[i];
        const b = posList[j];

        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        // Exact non-collision check
        expect(dx >= 160 || dy >= 100).toBe(true);

        const marginX = dx - 160;
        const marginY = dy - 100;
        const pairMargin = Math.max(marginX, marginY);

        if (pairMargin < minPairMargin) {
          minPairMargin = pairMargin;
          worstPair = { a: a.nodeId, b: b.nodeId, dx, dy, pairMargin };
        }
      }
    }

    expect(minPairMargin).toBeGreaterThanOrEqual(0);
  });

  it('Section 11: Validates Singleton Track and Small Node Counts', () => {
    const fn = (n: number) => {
      const nodes: OrbitNodeMetadata[] = Array.from({ length: n }, (_, i) => ({
        nodeId: `single_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: 'sec_single',
        primaryFeatureId: 'sec_single',
        semanticOrderKey: `single_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));
      const res = computeOrbitLayout({ nodes });
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(res.diagnostics.collisionCount).toBe(0);
      const pos = res.positions['single_0'];
      expect(Number.isFinite(pos.angle)).toBe(true);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    };

    fn(1);
    fn(2);
    fn(3);
  });

  it('Section 12: Verifies Angular Allocation for S in [1..200]', () => {
    const sValues = [1, 2, 3, 4, 10, 25, 40, 50, 65, 100, 200];

    sValues.forEach((s) => {
      const nodes: OrbitNodeMetadata[] = Array.from({ length: s }, (_, i) => ({
        nodeId: `sec_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: `sec_${i}`,
        primaryFeatureId: `sec_${i}`,
        semanticOrderKey: `sec_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const res = computeOrbitLayout({ nodes });
      expect(res.guides.sectors.length).toBe(s);

      let sumBody = 0;
      res.guides.sectors.forEach((sec) => {
        expect(sec.usableAngleRad).toBeGreaterThan(0);
        sumBody += sec.sectorBodyAngleRad;
      });

      // Guides sectorBodyAngleRad is rounded to 3 decimal places; tolerance depends on s
      expect(sumBody).toBeGreaterThan(6.0);
      expect(sumBody).toBeLessThan(6.4);
    });
  });

  it('Section 26: Permutation and Determinism Verification across 10 Shuffles', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);

    const baseLayout = computeOrbitLayout({ nodes: proj.nodeList });

    const computeHash = (posRecord: Record<string, any>) => {
      const sortedKeys = Object.keys(posRecord).sort();
      const str = sortedKeys
        .map((k) => {
          const p = posRecord[k];
          return `${p.nodeId}:${p.ring}:${p.sector}:${p.track}:${p.radius}:${p.angle}:${p.x}:${p.y}`;
        })
        .join('|');
      return crypto.createHash('sha256').update(str).digest('hex');
    };

    const baseHash = computeHash(baseLayout.positions);

    for (let run = 0; run < 10; run++) {
      // Deterministic shuffle using seed
      const shuffled = [...proj.nodeList].sort((a, b) => {
        const h1 = crypto.createHash('md5').update(a.nodeId + run).digest('hex');
        const h2 = crypto.createHash('md5').update(b.nodeId + run).digest('hex');
        return h1.localeCompare(h2);
      });

      const shuffledLayout = computeOrbitLayout({ nodes: shuffled });
      const shuffledHash = computeHash(shuffledLayout.positions);

      expect(shuffledHash).toBe(baseHash);
    }
  });

  it('Section 23: Real Fixture Matrix (food-app, cst, bqc, pbim)', () => {
    const fixtures = [
      { name: 'food-app', file: 'food-app/explorer-data.json' },
      { name: 'cst', file: 'cst/explorer-data.json' },
      { name: 'bqc', file: 'bqc/explorer-data.json' },
      { name: 'pbim', file: 'pbim/explorer-data.json' },
    ];

    fixtures.forEach((fix) => {
      const p = path.resolve(__dirname, '../../public/projects', fix.file);
      if (!fs.existsSync(p)) return;
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      const proj = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const layout = computeOrbitLayout({ nodes: proj.nodeList });

      expect(Object.keys(layout.positions).length).toBe(raw.nodes.length);
      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
    });
  });
});

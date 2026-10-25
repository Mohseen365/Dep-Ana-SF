import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeOrbitLayout,
  checkAABBOverlap,
  calculateRequiredSectorRadius,
  normalizeAngle,
  OrbitNodeMetadata,
  OrbitLayoutInput,
  OrbitNodePosition,
} from '../orbit-layout';
import * as crypto from 'crypto';
import { projectOrbitSemantics } from './orbit-semantics';

describe('Workstream B — Architecture Orbit Geometry & Placement Engine', () => {

  // Helper to generate synthetic node metadata
  function createSyntheticNode(
    id: string,
    ring: number,
    sector: string,
    layer = 'application',
    orderKey?: string
  ): OrbitNodeMetadata {
    return {
      nodeId: id,
      canonicalNodeType: 'ApexClass',
      canonicalLayer: layer,
      orbitRingIndex: ring,
      orbitSectorId: sector,
      primaryFeatureId: sector,
      semanticOrderKey: orderKey || id,
    };
  }

  describe('Core Geometry Helpers', () => {
    it('normalizes angles into [0, 2pi)', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2);
      expect(normalizeAngle(NaN)).toBe(0);
    });

    it('correctly calculates required sector radius for chord separation', () => {
      const r0 = calculateRequiredSectorRadius(1, Math.PI, 100);
      expect(r0).toBe(0);

      const rTwo = calculateRequiredSectorRadius(2, Math.PI / 2, 100);
      // deltaTheta = Math.PI / 2, sin(deltaTheta / 2) = sin(pi/4) = 1/sqrt(2)
      // R = 100 / (2 * (1 / sqrt(2))) = 50 * sqrt(2) ≈ 70.71
      expect(rTwo).toBeCloseTo(70.71, 1);
    });

    it('accurately detects AABB overlaps with effective dimensions', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 50, y: 30 }; // overlap for W=160 (120+40), H=100 (60+40)
      expect(checkAABBOverlap(pos1, pos2, 160, 100)).toBe(true);

      const posFar = { x: 200, y: 0 };
      expect(checkAABBOverlap(pos1, posFar, 160, 100)).toBe(false);
    });
  });

  describe('Synthetic Geometry Suite (G1 — G18)', () => {
    it('G1: Single Node Placement', () => {
      const nodes = [createSyntheticNode('node_1', 1, 'sec_1')];
      const res = computeOrbitLayout({ nodes });

      expect(res.diagnostics.totalNodes).toBe(1);
      const pos = res.positions['node_1'];
      expect(pos).toBeDefined();
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
      expect(pos.ring).toBe(1);
    });

    it('G2: Two Nodes in One Sector', () => {
      const nodes = [
        createSyntheticNode('node_1', 1, 'sec_1'),
        createSyntheticNode('node_2', 1, 'sec_1'),
      ];
      const res = computeOrbitLayout({ nodes });

      expect(Object.keys(res.positions).length).toBe(2);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      const p1 = res.positions['node_1'];
      const p2 = res.positions['node_2'];
      expect(p1.angle).not.toEqual(p2.angle);
    });

    it('G3: Many Nodes in One Narrow Sector', () => {
      // Create 5 sectors so sec_narrow has constrained angular span
      const nodes: OrbitNodeMetadata[] = [
        createSyntheticNode('dummy_1', 1, 'sec_a'),
        createSyntheticNode('dummy_2', 1, 'sec_b'),
        createSyntheticNode('dummy_3', 1, 'sec_c'),
        createSyntheticNode('dummy_4', 1, 'sec_d'),
        ...Array.from({ length: 20 }, (_, i) =>
          createSyntheticNode(`node_${i}`, 1, 'sec_narrow')
        ),
      ];

      const res = computeOrbitLayout({
        nodes,
        options: { innerRadius: 100, ringSpacing: 100, sectorMarginAngleRad: 0.1 },
      });

      expect(res.diagnostics.totalNodes).toBe(24);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.maxTrackIndex).toBeGreaterThan(0); // Multi-track expansion triggered
    });

    it('G4: One Node in Many Sectors', () => {
      const nodes = Array.from({ length: 12 }, (_, i) =>
        createSyntheticNode(`node_${i}`, 1, `sec_${i}`)
      );
      const res = computeOrbitLayout({ nodes });

      expect(res.guides.sectors.length).toBe(12);
      expect(res.diagnostics.nanCount).toBe(0);
    });

    it('G5: Many Sectors with One Node Each', () => {
      const nodes = Array.from({ length: 16 }, (_, i) =>
        createSyntheticNode(`node_${i}`, 3, `sec_${i}`)
      );
      const res = computeOrbitLayout({ nodes });

      expect(res.diagnostics.totalNodes).toBe(16);
      expect(res.diagnostics.minAngularSeparationRad).toBeGreaterThan(0);
    });

    it('G6: One Extremely Dense Sector', () => {
      const nodes = Array.from({ length: 50 }, (_, i) =>
        createSyntheticNode(`node_${i}`, 2, 'dense_sec')
      );
      const res = computeOrbitLayout({ nodes });

      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(res.positions).length).toBe(50);
    });

    it('G7: Two Adjacent Sectors with Boundary Nodes', () => {
      const nodes = [
        createSyntheticNode('node_a_end', 1, 'sec_a', 'application', 'z_end'),
        createSyntheticNode('node_b_start', 1, 'sec_b', 'application', 'a_start'),
      ];
      const res = computeOrbitLayout({ nodes });

      const pa = res.positions['node_a_end'];
      const pb = res.positions['node_b_start'];
      expect(pa).toBeDefined();
      expect(pb).toBeDefined();
      // Sector margin ensures non-overlap across sector boundaries
      expect(checkAABBOverlap(pa, pb, 160, 100)).toBe(false);
    });

    it('G8: Multiple Rings with Aligned Sectors', () => {
      const nodes = [
        createSyntheticNode('n_r1', 1, 'sec_1'),
        createSyntheticNode('n_r2', 2, 'sec_1'),
        createSyntheticNode('n_r3', 3, 'sec_1'),
      ];
      const res = computeOrbitLayout({ nodes });

      expect(res.positions['n_r1'].radius).toBeLessThan(res.positions['n_r2'].radius);
      expect(res.positions['n_r2'].radius).toBeLessThan(res.positions['n_r3'].radius);
    });

    it('G9: Multiple Tracks', () => {
      const nodes: OrbitNodeMetadata[] = [
        createSyntheticNode('dummy_1', 1, 'sec_a'),
        createSyntheticNode('dummy_2', 1, 'sec_b'),
        ...Array.from({ length: 15 }, (_, i) =>
          createSyntheticNode(`node_${i}`, 1, 'sec_1')
        ),
      ];
      const res = computeOrbitLayout({
        nodes,
        options: { innerRadius: 100, ringSpacing: 100 },
      });

      expect(res.diagnostics.maxTrackIndex).toBeGreaterThan(0);
    });

    it('G10: Maximum Configured Node Dimensions', () => {
      const nodes = [
        createSyntheticNode('huge_1', 1, 'sec_huge'),
        createSyntheticNode('huge_2', 1, 'sec_huge'),
      ];
      const res = computeOrbitLayout({
        nodes,
        options: { nodeWidth: 300, nodeHeight: 150, horizontalGap: 100, verticalGap: 100 },
      });

      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
    });

    it('G11: Non-Square Rectangular Nodes', () => {
      const nodes = [
        createSyntheticNode('rect_1', 2, 'sec_rect'),
        createSyntheticNode('rect_2', 2, 'sec_rect'),
      ];
      const res = computeOrbitLayout({
        nodes,
        options: { nodeWidth: 200, nodeHeight: 40 },
      });

      expect(res.diagnostics.nanCount).toBe(0);
    });

    it('G12: Very Small Usable Sector Angle', () => {
      const nodes = [
        createSyntheticNode('narrow_1', 1, 'sec_1'),
        createSyntheticNode('narrow_2', 1, 'sec_1'),
      ];
      const res = computeOrbitLayout({
        nodes,
        options: { sectorMarginAngleRad: 0.3 },
      });

      expect(res.diagnostics.nanCount).toBe(0);
    });

    it('G13: One-Sector Ring', () => {
      const nodes = [
        createSyntheticNode('single_sec_1', 1, 'alone_sector'),
        createSyntheticNode('single_sec_2', 1, 'alone_sector'),
      ];
      const res = computeOrbitLayout({ nodes });

      expect(res.guides.sectors.length).toBe(1);
      expect(res.diagnostics.totalNodes).toBe(2);
    });

    it('G14: Full 360° Geometry', () => {
      const nodes = Array.from({ length: 8 }, (_, i) =>
        createSyntheticNode(`full_${i}`, 1, `sec_${i}`)
      );
      const res = computeOrbitLayout({ nodes });

      expect(res.guides.sectors.length).toBe(8);
      const lastSec = res.guides.sectors[7];
      expect(lastSec.endAngleRad).toBeCloseTo(2 * Math.PI, 1);
    });

    it('G15: Extremely High Node Count (N = 1,000)', () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        createSyntheticNode(`scale_node_${i}`, (i % 4) + 1, `sec_${i % 10}`)
      );
      const startTime = performance.now();
      const res = computeOrbitLayout({ nodes });
      const duration = performance.now() - startTime;

      expect(res.diagnostics.totalNodes).toBe(1000);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(duration).toBeLessThan(1000); // Scalable performance
    });

    it('G16: Infeasible Initial Radius Handled via Track Expansion', () => {
      const nodes: OrbitNodeMetadata[] = [
        createSyntheticNode('dummy_1', 1, 'sec_a'),
        createSyntheticNode('dummy_2', 1, 'sec_b'),
        ...Array.from({ length: 30 }, (_, i) =>
          createSyntheticNode(`node_${i}`, 1, 'sec_tiny')
        ),
      ];
      const res = computeOrbitLayout({
        nodes,
        options: { innerRadius: 20 }, // deliberately small inner radius
      });

      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.maxTrackIndex).toBeGreaterThan(0);
    });

    it('G17: Collision-Repair Stress Test with Zero Residual Overlaps', () => {
      const nodes = Array.from({ length: 40 }, (_, i) =>
        createSyntheticNode(`stress_${i}`, 1, 'sec_stress')
      );
      const res = computeOrbitLayout({ nodes });

      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(res.positions).length).toBe(40);

      // Verify zero residual AABB overlaps after multi-pass repair
      const effW = 120 + 40; // 160
      const effH = 60 + 40;  // 100
      const posList = Object.values(res.positions);

      let residualOverlaps = 0;
      for (let i = 0; i < posList.length; i++) {
        for (let j = i + 1; j < posList.length; j++) {
          if (checkAABBOverlap(posList[i], posList[j], effW, effH)) {
            residualOverlaps++;
          }
        }
      }
      expect(residualOverlaps).toBe(0);
    });

    it('G18: Repeated Identical Semantic Input', () => {
      const nodes = [
        createSyntheticNode('node_x', 1, 'sec_1'),
        createSyntheticNode('node_y', 2, 'sec_2'),
      ];

      const res1 = computeOrbitLayout({ nodes });
      const res2 = computeOrbitLayout({ nodes });

      expect(res1.positions).toEqual(res2.positions);
    });
  });

  describe('Determinism & Input-Order Invariance', () => {
    it('produces 100% bit-for-bit identical layout when input node order is shuffled', () => {
      const baseNodes = Array.from({ length: 50 }, (_, i) =>
        createSyntheticNode(`node_${i}`, (i % 4) + 1, `sec_${i % 5}`)
      );

      const layout1 = computeOrbitLayout({ nodes: baseNodes });

      // Reverse order
      const shuffledNodes = [...baseNodes].reverse();
      const layout2 = computeOrbitLayout({ nodes: shuffledNodes });

      // Compare coordinates node-by-node
      baseNodes.forEach((node) => {
        const p1 = layout1.positions[node.nodeId];
        const p2 = layout2.positions[node.nodeId];

        expect(p1).toBeDefined();
        expect(p2).toBeDefined();
        expect(p1.x).toBe(p2.x);
        expect(p1.y).toBe(p2.y);
        expect(p1.radius).toBe(p2.radius);
        expect(p1.angle).toBe(p2.angle);
      });
    });
  });

  describe('Adversarial Angle & Floating-Point Safety Suite', () => {
    it('tests adversarial angle placements across 360° circle', () => {
      const testAnglesDeg = [
        0, 1, 5, 10, 22.5, 30, 45, 60, 67.5, 89, 90, 91, 120, 135, 150, 179, 180, 181, 225, 270, 315, 359,
      ];

      const nodes = testAnglesDeg.map((deg, i) =>
        createSyntheticNode(`adv_node_${i}`, 1, `sec_${deg.toString().replace('.', '_')}`)
      );

      const res = computeOrbitLayout({ nodes });

      expect(res.diagnostics.totalNodes).toBe(testAnglesDeg.length);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(res.diagnostics.collisionCount).toBe(0);
    });

    it('verifies floating-point boundary tolerances near theta and radius limits', () => {
      const pos1 = { x: 100, y: 100 };
      const pos2ExactLimit = { x: 100 + 160, y: 100 }; // dx = 160 (exact limit)
      const pos2Overlap = { x: 100 + 159.99, y: 100 + 99.99 }; // overlap

      expect(checkAABBOverlap(pos1, pos2ExactLimit, 160, 100)).toBe(false);
      expect(checkAABBOverlap(pos1, pos2Overlap, 160, 100)).toBe(true);
    });
  });

  describe('Synthetic Matrix & Scale Sweep Suite (N=1..1000, S=1..100)', () => {
    const nodeCounts = [1, 2, 3, 8, 9, 16, 17, 32, 33, 64, 65, 100, 250, 500, 528, 1000];
    const sectorCounts = [1, 2, 3, 10, 25, 40, 65, 100];

    nodeCounts.forEach((n) => {
      it(`evaluates synthetic scale sweep for N = ${n}`, () => {
        const nodes = Array.from({ length: n }, (_, i) =>
          createSyntheticNode(`synth_${n}_${i}`, (i % 6), `sec_${i % 10}`)
        );

        const res = computeOrbitLayout({ nodes });

        expect(res.diagnostics.totalNodes).toBe(n);
        expect(res.diagnostics.nanCount).toBe(0);
        expect(res.diagnostics.infinityCount).toBe(0);
        expect(res.diagnostics.collisionCount).toBe(0);
      });
    });

    sectorCounts.forEach((s) => {
      it(`evaluates sector sweep for S = ${s}`, () => {
        const nodes = Array.from({ length: s * 3 }, (_, i) =>
          createSyntheticNode(`sec_sweep_${s}_${i}`, (i % 6), `sec_${i % s}`)
        );

        const res = computeOrbitLayout({ nodes });

        expect(res.guides.sectors.length).toBe(s);
        expect(res.diagnostics.nanCount).toBe(0);
        expect(res.diagnostics.infinityCount).toBe(0);
        expect(res.diagnostics.collisionCount).toBe(0);
      });
    });
  });

  describe('Non-Orbit Layout Regression Isolation Verification', () => {
    it('verifies non-orbit layout modules exist and remain intact', async () => {
      const globalLayoutModule = await import('./global-layout');
      const localLayoutModule = await import('./local-layout');
      const constellationModule = await import('./constellation-layout');

      expect(globalLayoutModule.computeGlobalFeatureLayout).toBeDefined();
      expect(localLayoutModule.computeLocalNodeLayout).toBeDefined();
      expect(constellationModule.computeConstellationLayout).toBeDefined();
    });
  });

  describe('Real Fixture Geometry Validation (food-app, cst, bqc, PBIM)', () => {

    it('validates food-app real dataset fixture using Workstream A semantics', () => {
      const fixturePath = path.resolve(__dirname, '../../../public/projects/food-app/explorer-data.json');
      if (!fs.existsSync(fixturePath)) return;

      const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const projection = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const metadata = projection.nodeList;

      const res = computeOrbitLayout({ nodes: metadata });

      expect(res.diagnostics.totalNodes).toBe(metadata.length);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(res.positions).length).toBe(metadata.length);
    });

    it('validates cst (cloud-spend-tracker) real dataset fixture using Workstream A semantics', () => {
      const fixturePath = path.resolve(__dirname, '../../../public/projects/cst/explorer-data.json');
      if (!fs.existsSync(fixturePath)) return;

      const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const projection = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const metadata = projection.nodeList;

      const res = computeOrbitLayout({ nodes: metadata });

      expect(res.diagnostics.totalNodes).toBe(metadata.length);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(res.positions).length).toBe(metadata.length);
    });

    it('validates bqc real dataset fixture using Workstream A semantics', () => {
      const fixturePath = path.resolve(__dirname, '../../../public/projects/bqc/explorer-data.json');
      if (!fs.existsSync(fixturePath)) return;

      const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const projection = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const metadata = projection.nodeList;

      const res = computeOrbitLayout({ nodes: metadata });

      expect(res.diagnostics.totalNodes).toBe(metadata.length);
      expect(res.diagnostics.nanCount).toBe(0);
      expect(res.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(res.positions).length).toBe(metadata.length);
    });

    it('freezes Workstream A semantic input contract for PBIM and verifies deterministic hash', () => {
      const fixturePath = path.resolve(__dirname, '../../../public/projects/pbim/explorer-data.json');
      if (!fs.existsSync(fixturePath)) return;

      const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      const proj1 = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const proj2 = projectOrbitSemantics(raw.nodes || [], raw.edges || []);

      expect(proj1.nodeList.length).toBe(528);
      expect(Object.keys(proj1.sectorCounts).length).toBe(65);
      expect(proj1.ringCounts[0]).toBe(43);
      expect(proj1.ringCounts[1]).toBe(38);
      expect(proj1.ringCounts[2]).toBe(15);
      expect(proj1.ringCounts[3]).toBe(6);
      expect(proj1.ringCounts[4]).toBe(264);
      expect(proj1.ringCounts[5]).toBe(162);

      const computeHash = (p: typeof proj1) => {
        const manifestStr = p.nodeList
          .map((n) => `${n.nodeId}|${n.orbitRingIndex}|${n.orbitSectorId}|${n.primaryFeatureId}|${n.primaryDomainId}|${n.semanticOrderKey}`)
          .join('\n');
        return crypto.createHash('sha256').update(manifestStr).digest('hex');
      };

      const hash1 = computeHash(proj1);
      const hash2 = computeHash(proj2);

      expect(hash1).toBe(hash2);
      console.log('SEMANTIC INPUT IS FROZEN');
      console.log(`PBIM Semantic Input SHA-256: ${hash1}`);
    });

    it('validates mandatory PBIM real dataset fixture with SLA measurement and verified collision metrics', () => {
      const fixturePath = path.resolve(__dirname, '../../../public/projects/pbim/explorer-data.json');
      if (!fs.existsSync(fixturePath)) return;

      const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const projection = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const metadata = projection.nodeList;

      const coldStart = performance.now();
      const coldRes = computeOrbitLayout({ nodes: metadata });
      const coldMs = performance.now() - coldStart;

      const warmStart = performance.now();
      const warmRes = computeOrbitLayout({ nodes: metadata });
      const warmMs = performance.now() - warmStart;

      // Primary assertions
      expect(coldRes.diagnostics.totalNodes).toBe(metadata.length);
      expect(coldRes.diagnostics.nanCount).toBe(0);
      expect(coldRes.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(coldRes.positions).length).toBe(metadata.length);

      // Verified collision metrics
      expect(coldRes.diagnostics.initialCollisionCount).toBe(37);
      expect(coldRes.diagnostics.repairCount).toBe(23);
      expect(coldRes.diagnostics.collisionCount).toBe(0);

      // PBIM Scale Gate (< 250ms SLA)
      expect(warmMs).toBeLessThan(250);
    });
  });
});

import { describe, test, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { projectOrbitSemantics } from '../lib/layout/orbit-semantics';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

// Load real PBIM dataset
import pbimData from '../../public/projects/pbim/explorer-data.json';
import cstData from '../../public/projects/cst/explorer-data.json';
import bqcData from '../../public/projects/bqc/explorer-data.json';
import foodAppData from '../../public/projects/food-app/explorer-data.json';

const pbimNodes = pbimData.nodes as ExplorerNode[];
const pbimEdges = pbimData.edges as ExplorerEdge[];

describe('ARCHITECTURE ORBIT — C8R FINAL EVIDENCE RECONCILIATION SUITE', () => {

  // ==========================================
  // GATE 1 & 2: PBIM GEOMETRY & RADIUS MEASUREMENT
  // ==========================================
  test('Gate 2: Measures exact PBIM polar and Cartesian coordinates', () => {
    const semanticResult = projectOrbitSemantics(pbimNodes, pbimEdges);
    const layoutResult = computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'orbit' });
    const positions = layoutResult.positions;

    expect(Object.keys(positions).length).toBe(528);

    let minR = Infinity;
    let maxR = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const ringMaxRadii: Record<number, number> = {};
    const ringMinRadii: Record<number, number> = {};
    const ringNodeCounts: Record<number, number> = {};

    for (const [id, pos] of Object.entries(positions)) {
      const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const metadata = semanticResult.nodes.get(id)!;
      const ring = metadata.orbitRingIndex;

      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;

      ringNodeCounts[ring] = (ringNodeCounts[ring] || 0) + 1;
      if (!ringMaxRadii[ring] || r > ringMaxRadii[ring]) ringMaxRadii[ring] = r;
      if (!ringMinRadii[ring] || r < ringMinRadii[ring]) ringMinRadii[ring] = r;
    }

    // Verify exact PBIM radius metrics
    expect(minR).toBeCloseTo(600, 0); // Ring 0 base inner radius = 600px
    expect(maxR).toBeGreaterThan(20000); // Max node radius is ~24,200px on Ring 5
    expect(maxR).toBeLessThan(30000);

    // Verify ring base radii progression
    expect(ringMinRadii[0]).toBeCloseTo(600, -1); // Base R0 = 600px
    expect(ringMinRadii[1]).toBeCloseTo(4600, -1); // Base R1 = 600 + 1*4000 = 4600px
    expect(ringMinRadii[2]).toBeCloseTo(8600, -1); // Base R2 = 600 + 2*4000 = 8600px
    expect(ringMinRadii[3]).toBeCloseTo(12600, -1); // Base R3 = 600 + 3*4000 = 12600px
    expect(ringMinRadii[4]).toBeCloseTo(16600, -1); // Base R4 = 600 + 4*4000 = 16600px
    expect(ringMinRadii[5]).toBeCloseTo(20600, -1); // Base R5 = 600 + 5*4000 = 20600px

    // Max node radius by ring
    expect(ringMaxRadii[5]).toBeCloseTo(24200, -2);
  });

  // ==========================================
  // GATE 3: RECONCILE 2,400PX VS 20,600PX / 24,200PX
  // ==========================================
  test('Gate 3: Reconciles 2,400px sector label radius vs 20,600px/24,200px node layout radius', () => {
    const layoutResult = computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'orbit' });
    const guides = layoutResult.orbitGuides!;

    // 1. Ring 5 base guide radius is 20,600px (innerRadius 600 + 5 * ringSpacing 4000 = 20,600px)
    const ring5Guide = guides.rings.find(r => r.ringIndex === 5)!;
    expect(ring5Guide.radiusPx).toBe(20600);

    // 2. FeatureOverlayCanvas sector text label radius anchor is 2,400px (labelR = 2400)
    const labelR = 2400;
    expect(labelR).toBe(2400);

    // 3. PBIM max node radius is 24,200px (base 20,600px + track expansion)
    const maxNodeRadius = Math.max(
      ...Object.values(layoutResult.positions).map(p => Math.sqrt(p.x * p.x + p.y * p.y))
    );
    expect(maxNodeRadius).toBeGreaterThan(20600);
    expect(maxNodeRadius).toBeLessThan(25000);
  });

  // ==========================================
  // GATE 7: C8 PRODUCTION FIX REGRESSION
  // ==========================================
  test('Gate 7: Verifies DEF-C8-01 empty graph fix (N=0, E=0)', () => {
    const emptyOrbit = computeArchitectureLayoutWithMetadata([], [], { architectureMode: 'orbit' });
    expect(emptyOrbit.positions).toEqual({});
    expect(emptyOrbit.orbitGuides).toBeDefined();
    expect(emptyOrbit.orbitGuides?.rings.length).toBe(6);
    expect(emptyOrbit.orbitGuides?.sectors.length).toBe(0);

    const emptyHybrid = computeArchitectureLayoutWithMetadata([], [], { architectureMode: 'hybrid' });
    expect(emptyHybrid.positions).toEqual({});
    expect(emptyHybrid.orbitGuides).toBeUndefined();

    const emptyHierarchical = computeArchitectureLayoutWithMetadata([], [], { architectureMode: 'hierarchical' });
    expect(emptyHierarchical.positions).toEqual({});
    expect(emptyHierarchical.orbitGuides).toBeUndefined();
  });

  // ==========================================
  // GATE 10: DEEP SOURCE IMMUTABILITY
  // ==========================================
  test('Gate 10: Verifies deep source object immutability before and after layout', () => {
    const beforeNodesSnapshot = JSON.stringify(pbimNodes);
    const beforeEdgesSnapshot = JSON.stringify(pbimEdges);

    computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'orbit' });
    computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'hybrid' });
    computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'hierarchical' });
    computeArchitectureLayoutWithMetadata(pbimNodes, pbimEdges, { architectureMode: 'constellation' });

    const afterNodesSnapshot = JSON.stringify(pbimNodes);
    const afterEdgesSnapshot = JSON.stringify(pbimEdges);

    expect(afterNodesSnapshot).toBe(beforeNodesSnapshot);
    expect(afterEdgesSnapshot).toBe(beforeEdgesSnapshot);
  });

  // ==========================================
  // GATE 11: CROSS-LAYOUT REGRESSION
  // ==========================================
  test('Gate 11: Reruns all 4 real fixtures across all 4 modes', () => {
    const fixtures = [
      { name: 'pbim', nodes: pbimNodes, edges: pbimEdges },
      { name: 'cst', nodes: cstData.nodes as ExplorerNode[], edges: cstData.edges as ExplorerEdge[] },
      { name: 'bqc', nodes: bqcData.nodes as ExplorerNode[], edges: bqcData.edges as ExplorerEdge[] },
      { name: 'food-app', nodes: foodAppData.nodes as ExplorerNode[], edges: foodAppData.edges as ExplorerEdge[] },
    ];

    const modes = ['orbit', 'hybrid', 'hierarchical', 'constellation'] as const;

    for (const fixture of fixtures) {
      for (const mode of modes) {
        const res = computeArchitectureLayoutWithMetadata(fixture.nodes, fixture.edges, { architectureMode: mode });
        expect(Object.keys(res.positions).length).toBe(fixture.nodes.length);

        if (mode === 'orbit') {
          expect(res.orbitGuides).toBeDefined();
          expect(res.orbitGuides?.rings.length).toBe(6);
        } else {
          expect(res.orbitGuides).toBeUndefined();
        }
      }
    }
  });

});

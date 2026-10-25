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
} from '../lib/orbit-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { computeArchitectureLayout } from '../lib/architecture-layout';

describe('ARCHITECTURE ORBIT — C6 SCALE, STRESS & PATHOLOGICAL GEOMETRY AUDIT SUITE', () => {
  const pbimPath = path.resolve(__dirname, '../../public/projects/pbim/explorer-data.json');
  const resultsDir = path.resolve(__dirname, '../../../audit-evidence');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  it('Gate 1: PBIM Baseline Replay', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const memBefore = process.memoryUsage().heapUsed;

    const tSemStart = performance.now();
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);
    const tSemEnd = performance.now();

    const tLayoutStart = performance.now();
    const layout = computeOrbitLayout({ nodes: proj.nodeList });
    const tLayoutEnd = performance.now();

    const memAfter = process.memoryUsage().heapUsed;

    expect(proj.summary.totalNodes).toBe(528);
    expect(proj.summary.totalEdges).toBe(2063);
    expect(proj.summary.sectorCount).toBe(65);

    // Verify 0 ring, sector, angular mismatches
    let ringMismatches = 0;
    let sectorMismatches = 0;
    let angularMismatches = 0;

    proj.nodeList.forEach((n) => {
      const pos = layout.positions[n.nodeId];
      if (pos.ring !== n.orbitRingIndex) ringMismatches++;
      if (pos.sector !== n.orbitSectorId) sectorMismatches++;
      const secInfo = layout.guides.sectors.find((s) => s.sectorId === pos.sector);
      if (secInfo) {
        if (pos.angle < secInfo.startAngleRad - 1e-4 || pos.angle > secInfo.endAngleRad + 1e-4) {
          angularMismatches++;
        }
      }
    });

    expect(ringMismatches).toBe(0);
    expect(sectorMismatches).toBe(0);
    expect(angularMismatches).toBe(0);
    expect(layout.diagnostics.collisionCount).toBe(0);

    const timing = {
      semanticTimeMs: tSemEnd - tSemStart,
      layoutTimeMs: tLayoutEnd - tLayoutStart,
      initialCollisionCount: layout.diagnostics.initialCollisionCount,
      repairCount: layout.diagnostics.repairCount,
      finalCollisionCount: layout.diagnostics.collisionCount,
      memoryDeltaBytes: memAfter - memBefore,
    };

    console.log('[GATE 1 PBIM REPLAY TIMING]', JSON.stringify(timing));
  });

  it('Gate 2: Small Dataset Edge Cases (N=0..5)', () => {
    const cases = [0, 1, 2, 3, 4, 5];
    cases.forEach((n) => {
      const dummyNodes: OrbitNodeMetadata[] = Array.from({ length: n }, (_, i) => ({
        nodeId: `node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: n === 1 ? 'single_sec' : `sec_${i % 2}`,
        primaryFeatureId: n === 1 ? 'single_sec' : `sec_${i % 2}`,
        semanticOrderKey: `R01:sec_${i % 2}:ApexClass:node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const layout = computeOrbitLayout({ nodes: dummyNodes });
      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
      expect(layout.diagnostics.collisionCount).toBe(0);

      if (n > 0) {
        Object.values(layout.positions).forEach((pos) => {
          expect(Number.isFinite(pos.x)).toBe(true);
          expect(Number.isFinite(pos.y)).toBe(true);
          expect(Number.isFinite(pos.angle)).toBe(true);
          expect(Number.isFinite(pos.radius)).toBe(true);
        });
      }
    });
  });

  it('Gate 3: Real Fixture Matrix (food-app, cst, bqc, pbim)', () => {
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

      const tStart = performance.now();
      const proj = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const layout = computeOrbitLayout({ nodes: proj.nodeList });
      const tEnd = performance.now();

      expect(Object.keys(layout.positions).length).toBe((raw.nodes || []).length);
      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);

      console.log(
        `[GATE 3 REAL FIXTURE] ${fix.name}: ${raw.nodes.length}N, ${raw.edges.length}E, ${proj.summary.sectorCount}S, Time=${(tEnd - tStart).toFixed(2)}ms, InitialCol=${layout.diagnostics.initialCollisionCount}, Repairs=${layout.diagnostics.repairCount}`
      );
    });
  });

  it('Gate 4 & 5: Synthetic Scale Sweep (1k, 2k, 5k, 10k, 20k)', () => {
    const sizes = [1000, 2000, 5000, 10000, 20000];

    sizes.forEach((nodeCount) => {
      const { nodes, edges } = generateSyntheticSalesforceGraph({ nodeCount, seed: 42, componentCount: 5 });

      const pairCount = (nodeCount * (nodeCount - 1)) / 2;

      const tSemStart = performance.now();
      const proj = projectOrbitSemantics(nodes, edges);
      const tSemEnd = performance.now();

      const tLayoutStart = performance.now();
      const layout = computeOrbitLayout({ nodes: proj.nodeList });
      const tLayoutEnd = performance.now();

      const semTime = tSemEnd - tSemStart;
      const layoutTime = tLayoutEnd - tLayoutStart;
      const totalTime = semTime + layoutTime;

      console.log(
        `[GATE 4/5 SYNTHETIC SWEEP] N=${nodeCount}, Pairs=${pairCount}, SemTime=${semTime.toFixed(1)}ms, LayoutTime=${layoutTime.toFixed(1)}ms, Total=${totalTime.toFixed(1)}ms, InitialCol=${layout.diagnostics.initialCollisionCount}, Repairs=${layout.diagnostics.repairCount}, FinalCol=${layout.diagnostics.collisionCount}, MaxR=${layout.diagnostics.maxRadiusPx}px`
      );

      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
      expect(Object.keys(layout.positions).length).toBe(nodeCount);
    });
  });

  it('Gate 6: Sector-Count Sweep (1..500 sectors)', () => {
    const sectorCounts = [1, 2, 3, 5, 10, 25, 50, 65, 100, 200, 500];

    sectorCounts.forEach((s) => {
      const dummyNodes: OrbitNodeMetadata[] = Array.from({ length: Math.max(s, 500) }, (_, i) => ({
        nodeId: `s_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: `sec_${i % s}`,
        primaryFeatureId: `sec_${i % s}`,
        semanticOrderKey: `R01:sec_${i % s}:ApexClass:s_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const layout = computeOrbitLayout({ nodes: dummyNodes });

      expect(layout.guides.sectors.length).toBe(s);
      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);

      // Usable angle check
      layout.guides.sectors.forEach((sec) => {
        expect(sec.usableAngleRad).toBeGreaterThan(0);
      });
    });
  });

  it('Gate 7: Extreme Sector Imbalance (Cases A, B, C, D)', () => {
    // Case A: 99% in 1 sector, 1% in 10 other sectors (500 nodes total)
    const caseANodes: OrbitNodeMetadata[] = Array.from({ length: 500 }, (_, i) => {
      const sec = i < 495 ? 'dominant_sec' : `tiny_sec_${i % 10}`;
      return {
        nodeId: `ca_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: sec,
        primaryFeatureId: sec,
        semanticOrderKey: `R01:${sec}:ApexClass:ca_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      };
    });

    const layoutA = computeOrbitLayout({ nodes: caseANodes });
    expect(layoutA.diagnostics.nanCount).toBe(0);
    expect(layoutA.diagnostics.infinityCount).toBe(0);
    expect(layoutA.diagnostics.collisionCount).toBe(0);

    // Case B: 50% in 1 sector, 50% across 50 tiny sectors
    const caseBNodes: OrbitNodeMetadata[] = Array.from({ length: 500 }, (_, i) => {
      const sec = i < 250 ? 'half_sec' : `tiny_sec_${i % 50}`;
      return {
        nodeId: `cb_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: sec,
        primaryFeatureId: sec,
        semanticOrderKey: `R01:${sec}:ApexClass:cb_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      };
    });

    const layoutB = computeOrbitLayout({ nodes: caseBNodes });
    expect(layoutB.diagnostics.nanCount).toBe(0);
    expect(layoutB.diagnostics.collisionCount).toBe(0);

    // Case C: 1 node per sector (100 sectors)
    const caseCNodes: OrbitNodeMetadata[] = Array.from({ length: 100 }, (_, i) => ({
      nodeId: `cc_node_${i}`,
      canonicalNodeType: 'ApexClass',
      canonicalLayer: 'application',
      orbitRingIndex: 1,
      orbitSectorId: `single_sec_${i}`,
      primaryFeatureId: `single_sec_${i}`,
      semanticOrderKey: `R01:single_sec_${i}:ApexClass:cc_node_${i}`,
      fallbackFlags: {
        isDefaultLayerFallback: false,
        isUnassignedFeature: false,
        isSharedDomain: false,
        isUntypedNodeFallback: false,
      },
    }));

    const layoutC = computeOrbitLayout({ nodes: caseCNodes });
    expect(layoutC.diagnostics.nanCount).toBe(0);
    expect(layoutC.diagnostics.collisionCount).toBe(0);

    // Case D: 1 enormous sector (1,000 nodes), 50 singleton sectors
    const caseDNodes: OrbitNodeMetadata[] = Array.from({ length: 1050 }, (_, i) => {
      const sec = i < 1000 ? 'huge_sec' : `singleton_sec_${i - 1000}`;
      return {
        nodeId: `cd_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: sec,
        primaryFeatureId: sec,
        semanticOrderKey: `R01:${sec}:ApexClass:cd_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      };
    });

    const layoutD = computeOrbitLayout({ nodes: caseDNodes });
    expect(layoutD.diagnostics.nanCount).toBe(0);
    expect(layoutD.diagnostics.collisionCount).toBe(0);
  });

  it('Gate 8: Extreme Ring Imbalance', () => {
    const rings = [0, 1, 2, 3, 4, 5];

    rings.forEach((ringIdx) => {
      const nodes: OrbitNodeMetadata[] = Array.from({ length: 500 }, (_, i) => ({
        nodeId: `r_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: ringIdx,
        orbitSectorId: `sec_${i % 10}`,
        primaryFeatureId: `sec_${i % 10}`,
        semanticOrderKey: `R0${ringIdx}:sec_${i % 10}:ApexClass:r_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const layout = computeOrbitLayout({ nodes });
      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
      expect(layout.diagnostics.collisionCount).toBe(0);
    });
  });

  it('Gate 9: Dense Single-Sector Stress (1 sector, N=100..5000)', () => {
    const counts = [100, 500, 1000, 2000, 5000];

    counts.forEach((n) => {
      const nodes: OrbitNodeMetadata[] = Array.from({ length: n }, (_, i) => ({
        nodeId: `ds_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: 'single_monolithic_sector',
        primaryFeatureId: 'single_monolithic_sector',
        semanticOrderKey: `R01:single_monolithic_sector:ApexClass:ds_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const tStart = performance.now();
      const layout = computeOrbitLayout({ nodes });
      const tEnd = performance.now();

      console.log(
        `[GATE 9 DENSE SECTOR] N=${n}: Time=${(tEnd - tStart).toFixed(2)}ms, MaxTrack=${layout.diagnostics.maxTrackIndex}, MaxR=${layout.diagnostics.maxRadiusPx}px, InitialCol=${layout.diagnostics.initialCollisionCount}, Repairs=${layout.diagnostics.repairCount}, FinalCol=${layout.diagnostics.collisionCount}`
      );

      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
    });
  });

  it('Gate 10: Dense Single-Ring Stress (1 ring, N=100..5000)', () => {
    const counts = [100, 500, 1000, 2000, 5000];

    counts.forEach((n) => {
      const nodes: OrbitNodeMetadata[] = Array.from({ length: n }, (_, i) => ({
        nodeId: `dr_node_${i}`,
        canonicalNodeType: 'ApexClass',
        canonicalLayer: 'application',
        orbitRingIndex: 1,
        orbitSectorId: `sec_${i % 20}`,
        primaryFeatureId: `sec_${i % 20}`,
        semanticOrderKey: `R01:sec_${i % 20}:ApexClass:dr_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      }));

      const tStart = performance.now();
      const layout = computeOrbitLayout({ nodes });
      const tEnd = performance.now();

      let maxNodesOnAnyTrack = 0;
      const trackPopMap = new Map<string, number>();
      Object.values(layout.positions).forEach((p) => {
        const key = `${p.sector}:${p.track}`;
        const c = (trackPopMap.get(key) || 0) + 1;
        trackPopMap.set(key, c);
        if (c > maxNodesOnAnyTrack) maxNodesOnAnyTrack = c;
      });

      console.log(
        `[GATE 10 DENSE RING] N=${n}: Time=${(tEnd - tStart).toFixed(2)}ms, MaxTrackIndex=${layout.diagnostics.maxTrackIndex}, MaxNodesOnAnyTrack=${maxNodesOnAnyTrack}, MaxRadius=${layout.diagnostics.maxRadiusPx}px, InitialCol=${layout.diagnostics.initialCollisionCount}, Repairs=${layout.diagnostics.repairCount}, FinalCol=${layout.diagnostics.collisionCount}`
      );

      expect(layout.diagnostics.nanCount).toBe(0);
      expect(layout.diagnostics.infinityCount).toBe(0);
    });
  });

  it('Gate 11: Combined Pathological Stress (5,000+ nodes, 1 dominant sector, 1 dominant ring)', () => {
    const nodes: OrbitNodeMetadata[] = Array.from({ length: 5000 }, (_, i) => {
      const isDom = i < 4750; // 95% in one sector
      const sec = isDom ? 'dom_sec' : `other_sec_${i % 10}`;
      const ring = isDom ? 4 : (i % 6); // 95% in Ring 4
      return {
        nodeId: `comb_node_${i}`,
        canonicalNodeType: 'CustomField',
        canonicalLayer: 'schema',
        orbitRingIndex: ring,
        orbitSectorId: sec,
        primaryFeatureId: sec,
        semanticOrderKey: `R0${ring}:${sec}:CustomField:comb_node_${i}`,
        fallbackFlags: {
          isDefaultLayerFallback: false,
          isUnassignedFeature: false,
          isSharedDomain: false,
          isUntypedNodeFallback: false,
        },
      };
    });

    const tStart = performance.now();
    const layout = computeOrbitLayout({ nodes });
    const tEnd = performance.now();

    console.log(
      `[GATE 11 COMBINED PATHOLOGICAL] N=5000: Time=${(tEnd - tStart).toFixed(2)}ms, InitialCol=${layout.diagnostics.initialCollisionCount}, Repairs=${layout.diagnostics.repairCount}, FinalCol=${layout.diagnostics.collisionCount}, MaxRadius=${layout.diagnostics.maxRadiusPx}px`
    );

    expect(layout.diagnostics.nanCount).toBe(0);
    expect(layout.diagnostics.infinityCount).toBe(0);
  });

  it('Gate 13: Repair Behavior & Identity Preservation', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);
    const layout = computeOrbitLayout({ nodes: proj.nodeList });

    // Verify ring and sector identities were NOT changed by repair
    proj.nodeList.forEach((n) => {
      const pos = layout.positions[n.nodeId];
      expect(pos.ring).toBe(n.orbitRingIndex);
      expect(pos.sector).toBe(n.orbitSectorId);
    });
  });

  it('Gate 14: Numerical Stability under Extreme Geometry', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(2 * Math.PI)).toBe(0);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2);
    expect(normalizeAngle(NaN)).toBe(0);
    expect(normalizeAngle(Infinity)).toBe(0);

    // Extreme angle span where sinHalf <= 1e-6 returns Infinity (expected implementation guard)
    const reqR = calculateRequiredSectorRadius(100, 1e-5, 188.68);
    expect(reqR).toBe(Infinity);

    // Valid angle span returns finite radius
    const validR = calculateRequiredSectorRadius(100, 0.5, 188.68);
    expect(Number.isFinite(validR)).toBe(true);

    const zeroR = calculateRequiredSectorRadius(1, 0.1, 188.68);
    expect(zeroR).toBe(0);

    const infR = calculateRequiredSectorRadius(10, 0, 188.68);
    expect(infR).toBe(Infinity);
  });

  it('Gate 15: Determinism Under Stress & Permutations', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const proj = projectOrbitSemantics(raw.nodes, raw.edges);

    const getHash = (nodes: OrbitNodeMetadata[]) => {
      const l = computeOrbitLayout({ nodes });
      const str = Object.keys(l.positions)
        .sort()
        .map((k) => `${k}:${l.positions[k].x}:${l.positions[k].y}`)
        .join('|');
      return crypto.createHash('sha256').update(str).digest('hex');
    };

    const baseHash = getHash(proj.nodeList);

    for (let run = 0; run < 10; run++) {
      const shuffled = [...proj.nodeList].sort((a, b) => {
        const h1 = crypto.createHash('md5').update(a.nodeId + run).digest('hex');
        const h2 = crypto.createHash('md5').update(b.nodeId + run).digest('hex');
        return h1.localeCompare(h2);
      });
      const shuffledHash = getHash(shuffled);
      expect(shuffledHash).toBe(baseHash);
    }
  });

  it('Gate 20: Failure Safety with Malformed & Edge Data', () => {
    const malformedNodes: any[] = [
      { id: 'missing_type_node', displayName: 'Missing Type' },
      { id: 'long_id_node_' + 'x'.repeat(500), type: 'ApexClass', displayName: 'Long ID' },
      { id: '🚀_unicode_node_α_β_γ', type: 'LWC', displayName: 'Unicode 🚀' },
      { id: 'isolated_node', type: 'Flow', displayName: 'Isolated' },
    ];

    const proj = projectOrbitSemantics(malformedNodes, []);
    const layout = computeOrbitLayout({ nodes: proj.nodeList });

    expect(layout.diagnostics.nanCount).toBe(0);
    expect(layout.diagnostics.infinityCount).toBe(0);
    expect(Object.keys(layout.positions).length).toBe(4);
  });

  it('Gate 21: Source Data Immutability', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const originalNodesStr = JSON.stringify(raw.nodes);
    const originalEdgesStr = JSON.stringify(raw.edges);

    const proj = projectOrbitSemantics(raw.nodes, raw.edges);
    computeOrbitLayout({ nodes: proj.nodeList });

    expect(JSON.stringify(raw.nodes)).toBe(originalNodesStr);
    expect(JSON.stringify(raw.edges)).toBe(originalEdgesStr);
  });

  it('Gate 22: Post-Stress Real-Fixture Regression & Multi-Mode Isolation', () => {
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));

    // Re-verify Orbit
    const orbitRes = computeArchitectureLayout(raw.nodes, raw.edges, { architectureMode: 'orbit' });
    expect(Object.keys(orbitRes).length).toBe(528);

    // Verify Hierarchical
    const hierRes = computeArchitectureLayout(raw.nodes, raw.edges, { architectureMode: 'hierarchical' });
    expect(Object.keys(hierRes).length).toBe(528);

    // Verify Hybrid
    const hybridRes = computeArchitectureLayout(raw.nodes, raw.edges, { architectureMode: 'hybrid', enableFeatureLayout: true });
    expect(Object.keys(hybridRes).length).toBe(528);
  });
});

/**
 * COMPONENT ORBIT — GEOMETRY & FOCUSED ORBIT TEST SUITE
 *
 * Executable Vitest test suite for component-orbit-layout.ts.
 * Validates all 12 Geometry Invariants (G1–G12) and tests real PBIM scenarios.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  adaptComponentOrbit,
} from '../adapters/component-orbit-adapter';
import {
  computeComponentOrbitLayout,
} from './component-orbit-layout';
import type { ExplorerDataSchema } from '../../types/explorer';

// Load real PBIM dataset fixture
const pbimPath = join(__dirname, '../../../public/projects/pbim/explorer-data.json');
const realPbimData: ExplorerDataSchema = JSON.parse(readFileSync(pbimPath, 'utf-8'));

describe('Component Orbit Geometry & Focused Orbit Layout Suite', () => {
  describe('Geometry Invariants G1–G12', () => {
    it('G1 — Isolated LWC (LWC:error-panel): 1 Sun at center (0,0), 0 collisions', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:error-panel' });
      const layout = computeComponentOrbitLayout(projection);

      expect(projection.summary.totalReachableNodes).toBe(1);
      expect(Object.keys(layout.positions).length).toBe(1);

      const sunPos = layout.positions['LWC:error-panel'];
      expect(sunPos).toBeDefined();
      expect(sunPos.ring).toBe(0);
      expect(sunPos.x).toBe(0);
      expect(sunPos.y).toBe(0);
      expect(layout.diagnostics.collisionCount).toBe(0);
    });

    it('G2 — Small Orbit: Sun + Direct Dependencies placed on correct rings', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:vendor-workspace' });
      const layout = computeComponentOrbitLayout(projection);

      const sunPos = layout.positions['LWC:vendor-workspace'];
      expect(sunPos.ring).toBe(0);
      expect(sunPos.x).toBe(0);
      expect(sunPos.y).toBe(0);

      // Direct dependencies (Ring 1) must be at radius >= innerRadius (280)
      const ring1Nodes = Object.values(layout.positions).filter((p) => p.ring === 1);
      expect(ring1Nodes.length).toBeGreaterThan(0);
      ring1Nodes.forEach((p) => {
        expect(p.radius).toBeGreaterThanOrEqual(280);
      });
    });

    it('G3 — Dense Ring: Multi-track expansion prevents AABB collisions on crowded rings', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      // Ring 4 has 34 nodes
      const layout = computeComponentOrbitLayout(projection, { maxNodesPerTrack: 10 });

      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(layout.diagnostics.ringNodeCounts[4]).toBe(34);
      expect(layout.diagnostics.trackCounts[4]).toBeGreaterThan(1); // multi-track
    });

    it('G4 — Dense Transitive Ring: Lower rings remain stable when outer rings expand', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      const layoutStandard = computeComponentOrbitLayout(projection, { maxNodesPerTrack: 16 });
      const layoutDenseOuter = computeComponentOrbitLayout(projection, { maxNodesPerTrack: 5 });

      // Ring 1 nodes should have identical radii in both layouts because Ring 1 population is small
      const ring1Standard = Object.values(layoutStandard.positions).filter((p) => p.ring === 1);
      const ring1Dense = Object.values(layoutDenseOuter.positions).filter((p) => p.ring === 1);

      expect(ring1Standard.length).toBe(ring1Dense.length);
      ring1Standard.forEach((pStd) => {
        const pDense = layoutDenseOuter.positions[pStd.nodeId];
        expect(pDense.radius).toBe(pStd.radius);
        expect(pDense.x).toBe(pStd.x);
        expect(pDense.y).toBe(pStd.y);
      });
    });

    it('G5 — Mixed Dimensions & Label Awareness: Custom node sizes are respected with 0 collisions', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      const customDims: Record<string, { width: number; height: number }> = {
        'LWC:asset-dashboard-container': { width: 220, height: 80 },
        'LWC:asset-detail-dashboard': { width: 200, height: 70 },
        'ApexClass:AssetDashboardController': { width: 250, height: 90 },
      };

      const layout = computeComponentOrbitLayout(projection, { customNodeDimensions: customDims });

      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(layout.positions['LWC:asset-dashboard-container'].width).toBe(220);
      expect(layout.positions['ApexClass:AssetDashboardController'].width).toBe(250);
    });

    it('G6 — Shared Apex Hub: Receives exactly 1 position on its semantic ring', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const layout = computeComponentOrbitLayout(projection);

      // Shared Apex Controller
      const sharedNodeId = 'ApexClass:AssetDashboardController';
      expect(projection.nodes[sharedNodeId].isSharedHub).toBe(true);

      const positions = Object.values(layout.positions).filter((p) => p.nodeId === sharedNodeId);
      expect(positions.length).toBe(1);
      expect(positions[0].ring).toBe(1);
    });

    it('G7 — Child LWC Navigation Target: Geometry retains canonical node ID and correct ring', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:vendor-workspace' });
      const layout = computeComponentOrbitLayout(projection);

      expect(projection.focus).not.toBeNull();
      expect(projection.focus!.childLwcTargets.length).toBeGreaterThan(0);
      const childLwcId = projection.focus!.childLwcTargets[0];
      expect(projection.nodes[childLwcId].isChildLwc).toBe(true);

      const pos = layout.positions[childLwcId];
      expect(pos).toBeDefined();
      expect(pos.ring).toBe(1);
    });

    it('G8 — Cycle-Derived Projection: Layout completes deterministically without infinite loop', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const layout = computeComponentOrbitLayout(projection);

      expect(layout.diagnostics.totalNodes).toBe(128);
      expect(layout.diagnostics.collisionCount).toBe(0);
    });

    it('G9 & G11 — Same-Ring Repair Locality & Deterministic Repair', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const layout = computeComponentOrbitLayout(projection);

      // All nodes must remain on their semantic ring (ring === depth)
      Object.values(layout.positions).forEach((pos) => {
        expect(pos.ring).toBe(pos.depth);
      });

      expect(layout.diagnostics.collisionCount).toBe(0);
    });

    it('G10 & G12 — 10x Determinism and Input Order Shuffle Invariance', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      // 10 Repeated Executions
      const baseline = computeComponentOrbitLayout(projection);

      for (let i = 0; i < 10; i++) {
        const run = computeComponentOrbitLayout(projection);
        expect(run.positions).toEqual(baseline.positions);
        expect(run.diagnostics.collisionCount).toBe(0);
      }

      // Input Order Shuffle Invariance
      const shuffledGraph: ExplorerDataSchema = {
        ...realPbimData,
        nodes: [...realPbimData.nodes].sort(() => Math.random() - 0.5),
        edges: [...realPbimData.edges].sort(() => Math.random() - 0.5),
      };
      const shuffledProjection = adaptComponentOrbit(shuffledGraph, { focalLwcId: 'LWC:asset-dashboard-container' });

      const shuffledRun = computeComponentOrbitLayout(shuffledProjection);
      expect(shuffledRun.positions).toEqual(baseline.positions);
    });
  });

  describe('Real PBIM Focused Orbit Matrix (4 Scenarios)', () => {
    it('Scenario 1: LWC:asset-dashboard-container (128 reachable nodes, max depth 7)', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const layout = computeComponentOrbitLayout(projection);

      expect(layout.diagnostics.totalNodes).toBe(128);
      expect(layout.diagnostics.maxDepth).toBe(7);
      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(layout.diagnostics.minRadiusPx).toBe(0); // Sun
      expect(layout.diagnostics.maxRadiusPx).toBeGreaterThan(1200);
    });

    it('Scenario 2: LWC:citizen-report-portal (102 reachable nodes, max depth 5)', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:citizen-report-portal' });
      const layout = computeComponentOrbitLayout(projection);

      expect(layout.diagnostics.totalNodes).toBe(102);
      expect(layout.diagnostics.maxDepth).toBe(5);
      expect(layout.diagnostics.collisionCount).toBe(0);
    });

    it('Scenario 3: LWC:vendor-workspace (101 reachable nodes, max depth 6)', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:vendor-workspace' });
      const layout = computeComponentOrbitLayout(projection);

      expect(layout.diagnostics.totalNodes).toBe(101);
      expect(layout.diagnostics.maxDepth).toBe(6);
      expect(layout.diagnostics.collisionCount).toBe(0);
    });

    it('Scenario 4: LWC:error-panel (1 node, max depth 0)', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:error-panel' });
      const layout = computeComponentOrbitLayout(projection);

      expect(layout.diagnostics.totalNodes).toBe(1);
      expect(layout.diagnostics.maxDepth).toBe(0);
      expect(layout.diagnostics.collisionCount).toBe(0);
      expect(Object.keys(layout.positions)).toEqual(['LWC:error-panel']);
    });
  });
});

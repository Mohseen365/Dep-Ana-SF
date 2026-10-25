import { describe, it, expect } from 'vitest';
import type { ExplorerDataSchema } from '../../types/explorer';
import { adaptComponentOrbit } from './component-orbit-adapter';
import { computeComponentOrbitLayout } from '../layout/component-orbit-layout';
import * as fs from 'fs';
import * as path from 'path';

describe('Dynamic Architecture Orbit Focal LWC Selection Unit & Integration Suite', () => {
  // Load real canonical PBIM dataset (528 nodes, 2063 edges, 30 LWCs)
  const pbimPath = path.resolve(__dirname, '../../../public/projects/pbim/explorer-data.json');
  const rawPbimJson = fs.readFileSync(pbimPath, 'utf-8');
  const realPbimData: ExplorerDataSchema = JSON.parse(rawPbimJson);

  describe('1. Selection of Valid LWC as Sun & Origin (0,0)', () => {
    it('uses selected LWC as Sun and places it at origin (0,0) without stale displacement', () => {
      const focalId = 'LWC:asset-dashboard-container';
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focalId });

      expect(projection.focus?.nodeId).toBe(focalId);
      expect(projection.focus?.isSun).toBe(true);
      expect(projection.focus?.roleSymbol).toBe('☉');
      expect(projection.summary.focalLwcId).toBe(focalId);

      const layout = computeComponentOrbitLayout(projection);
      const sunPos = layout.positions[focalId];

      expect(sunPos).toBeDefined();
      expect(sunPos.x).toBe(0);
      expect(sunPos.y).toBe(0);
      expect(sunPos.ring).toBe(0);
      expect(sunPos.radius).toBe(0);
    });
  });

  describe('2. Selection of Non-LWC Entities & Fallback Behavior', () => {
    it('rejects ApexClass as Sun and falls back to deterministic default LWC', () => {
      const apexClassId = 'ApexClass:AssetDashboardController';
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: apexClassId });

      // ApexClass cannot be Sun -> falls back to top available LWC
      expect(projection.focus?.type).toBe('LWC');
      expect(projection.focus?.nodeId).not.toBe(apexClassId);
      expect(projection.focus?.isSun).toBe(true);

      const layout = computeComponentOrbitLayout(projection);
      const sunId = projection.focus!.nodeId;
      expect(layout.positions[sunId].x).toBe(0);
      expect(layout.positions[sunId].y).toBe(0);
    });

    it('rejects CustomObject / CustomField as Sun and falls back to deterministic default LWC', () => {
      const objId = 'CustomObject:Asset__c';
      const fieldId = 'CustomField:Asset__c.Name';

      const projObj = adaptComponentOrbit(realPbimData, { focalLwcId: objId });
      expect(projObj.focus?.type).toBe('LWC');
      expect(projObj.focus?.nodeId).not.toBe(objId);

      const projField = adaptComponentOrbit(realPbimData, { focalLwcId: fieldId });
      expect(projField.focus?.type).toBe('LWC');
      expect(projField.focus?.nodeId).not.toBe(fieldId);
    });
  });

  describe('3. Focus Transition Matrix on Real PBIM', () => {
    const matrix = [
      { prev: 'LWC:vendor-assignment-panel', next: 'LWC:asset-dashboard-container', expectedDepth: 7, expectedReachable: 128 },
      { prev: 'LWC:asset-dashboard-container', next: 'LWC:vendor-workspace', expectedDepth: 6, expectedReachable: 101 },
      { prev: 'LWC:vendor-workspace', next: 'LWC:citizen-report-portal', expectedDepth: 5, expectedReachable: 102 },
      { prev: 'LWC:citizen-report-portal', next: 'LWC:error-panel', expectedDepth: 0, expectedReachable: 1 },
      { prev: 'LWC:error-panel', next: 'LWC:asset-dashboard-container', expectedDepth: 7, expectedReachable: 128 },
    ];

    matrix.forEach(({ prev, next, expectedDepth, expectedReachable }) => {
      it(`transitions focus from ${prev} -> ${next} cleanly with updated BFS projection and Sun at (0,0)`, () => {
        // Step 1: prev projection
        const prevProj = adaptComponentOrbit(realPbimData, { focalLwcId: prev });
        expect(prevProj.focus?.nodeId).toBe(prev);

        // Step 2: next projection
        const nextProj = adaptComponentOrbit(realPbimData, { focalLwcId: next });
        expect(nextProj.focus?.nodeId).toBe(next);
        expect(nextProj.focus?.isSun).toBe(true);
        expect(nextProj.summary.focalLwcId).toBe(next);
        expect(nextProj.summary.totalReachableNodes).toBe(expectedReachable);
        expect(nextProj.summary.maxDepth).toBe(expectedDepth);

        // Verify layout geometry
        const layout = computeComponentOrbitLayout(nextProj);
        expect(layout.positions[next].x).toBe(0);
        expect(layout.positions[next].y).toBe(0);
        expect(layout.positions[next].radius).toBe(0);

        // Verify old Sun is no longer at origin (unless it is error-panel where it is unreachable)
        if (prev !== next && layout.positions[prev]) {
          expect(layout.positions[prev].radius).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('4. Determinism & Input-Order Invariance Across Selections', () => {
    it('produces bit-for-bit identical coordinates across repeated selections and input shuffles', () => {
      const focalId = 'LWC:citizen-report-portal';
      const baseProj = adaptComponentOrbit(realPbimData, { focalLwcId: focalId });
      const baseLayout = computeComponentOrbitLayout(baseProj);

      for (let i = 0; i < 10; i++) {
        const shuffledData: ExplorerDataSchema = {
          ...realPbimData,
          nodes: [...realPbimData.nodes].sort(() => Math.random() - 0.5),
          edges: [...realPbimData.edges].sort(() => Math.random() - 0.5),
        };

        const shuffledProj = adaptComponentOrbit(shuffledData, { focalLwcId: focalId });
        const shuffledLayout = computeComponentOrbitLayout(shuffledProj);

        expect(shuffledProj.summary).toEqual(baseProj.summary);
        Object.keys(baseLayout.positions).forEach((nodeId) => {
          expect(shuffledLayout.positions[nodeId].x).toBe(baseLayout.positions[nodeId].x);
          expect(shuffledLayout.positions[nodeId].y).toBe(baseLayout.positions[nodeId].y);
        });
      }
    });
  });

  describe('5. Dataset & Graph Immutability Invariant', () => {
    it('guarantees zero mutation to node IDs, edge IDs, or PBIM graph dataset during focal transitions', () => {
      const originalJson = JSON.stringify(realPbimData);

      adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:vendor-workspace' });
      adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:citizen-report-portal' });
      adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:error-panel' });

      expect(JSON.stringify(realPbimData)).toBe(originalJson);
    });
  });

  describe('6. State Precedence Order (Selected LWC > Stale Focal LWC > Focused Fallback > Default)', () => {
    function deriveFocalLwcId(
      nodes: typeof realPbimData.nodes,
      selectedNodeId: string | null,
      layoutOptionsFocalLwcId: string | null | undefined,
      focusedNodeId: string | null = null
    ): string | null {
      const isLwcNode = (id: string | null | undefined): boolean => {
        if (!id) return false;
        return nodes.some((n) => n.id === id && n.type === 'LWC');
      };

      return (
        (isLwcNode(selectedNodeId) ? selectedNodeId : null) ??
        (isLwcNode(layoutOptionsFocalLwcId) ? layoutOptionsFocalLwcId : null) ??
        (isLwcNode(focusedNodeId) ? focusedNodeId : null) ??
        null
      );
    }

    it('Test A: selected LWC (LWC:asset-dashboard-container) overrides stale focal (LWC:vendor-assignment-panel)', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        'LWC:asset-dashboard-container',
        'LWC:vendor-assignment-panel'
      );
      expect(focal).toBe('LWC:asset-dashboard-container');
    });

    it('Test B: selected LWC (LWC:vendor-workspace) overrides stale focal (LWC:vendor-assignment-panel)', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        'LWC:vendor-workspace',
        'LWC:vendor-assignment-panel'
      );
      expect(focal).toBe('LWC:vendor-workspace');
    });

    it('Test C: selected LWC (LWC:citizen-report-portal) overrides stale focal (LWC:vendor-assignment-panel)', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        'LWC:citizen-report-portal',
        'LWC:vendor-assignment-panel'
      );
      expect(focal).toBe('LWC:citizen-report-portal');
    });

    it('Test D: selected LWC (LWC:error-panel) overrides stale focal (LWC:asset-dashboard-container)', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        'LWC:error-panel',
        'LWC:asset-dashboard-container'
      );
      expect(focal).toBe('LWC:error-panel');
    });

    it('Test E: non-LWC selection (ApexClass) does NOT become Sun, fallback focal is preserved', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        'ApexClass:AssetDashboardController',
        'LWC:vendor-assignment-panel'
      );
      expect(focal).toBe('LWC:vendor-assignment-panel');
    });

    it('Test F: null selection preserves layoutOptions focal fallback', () => {
      const focal = deriveFocalLwcId(
        realPbimData.nodes,
        null,
        'LWC:vendor-assignment-panel'
      );
      expect(focal).toBe('LWC:vendor-assignment-panel');
    });
  });
});

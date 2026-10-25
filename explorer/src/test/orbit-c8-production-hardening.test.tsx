import { describe, test, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { projectOrbitSemantics } from '../lib/layout/orbit-semantics';
import { computeOrbitLayout, checkAABBOverlap, normalizeAngle, calculateRequiredSectorRadius } from '../lib/orbit-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { mergeWithDefaultState } from '../lib/projectState';

// Load real datasets for testing
import pbimData from '../../public/projects/pbim/explorer-data.json';
import cstData from '../../public/projects/cst/explorer-data.json';
import bqcData from '../../public/projects/bqc/explorer-data.json';
import foodAppData from '../../public/projects/food-app/explorer-data.json';

const realFixtures = {
  pbim: { nodes: pbimData.nodes as ExplorerNode[], edges: pbimData.edges as ExplorerEdge[] },
  cst: { nodes: cstData.nodes as ExplorerNode[], edges: cstData.edges as ExplorerEdge[] },
  bqc: { nodes: bqcData.nodes as ExplorerNode[], edges: bqcData.edges as ExplorerEdge[] },
  'food-app': { nodes: foodAppData.nodes as ExplorerNode[], edges: foodAppData.edges as ExplorerEdge[] },
};

describe('ARCHITECTURE ORBIT — C8 PRODUCTION HARDENING TEST SUITE', () => {

  // ==========================================
  // GATE 2: EMPTY DATASET (N=0, E=0)
  // ==========================================
  describe('Gate 2: Empty Dataset (N=0, E=0)', () => {
    test('Handles N=0, E=0 in Orbit mode safely', () => {
      const result = computeArchitectureLayoutWithMetadata([], [], { architectureMode: 'orbit' });
      expect(result.positions).toEqual({});
      expect(result.orbitGuides).toBeDefined();
      expect(result.orbitGuides?.rings.length).toBe(6);
      expect(result.orbitGuides?.sectors.length).toBe(0);

      const semantics = projectOrbitSemantics([], []);
      expect(semantics.nodeList.length).toBe(0);
      expect(semantics.summary.totalNodes).toBe(0);

      const orbitLayout = computeOrbitLayout({ nodes: [] });
      expect(Object.keys(orbitLayout.positions).length).toBe(0);
      expect(orbitLayout.diagnostics.totalNodes).toBe(0);
      expect(Number.isFinite(orbitLayout.diagnostics.minRadiusPx)).toBe(true);
      expect(Number.isFinite(orbitLayout.diagnostics.maxRadiusPx)).toBe(true);
      expect(orbitLayout.diagnostics.nanCount).toBe(0);
      expect(orbitLayout.diagnostics.infinityCount).toBe(0);
    });

    test('Handles N=0, E=0 across all four modes safely', () => {
      const modes = ['orbit', 'hybrid', 'hierarchical', 'constellation'] as const;
      for (const mode of modes) {
        const res = computeArchitectureLayoutWithMetadata([], [], { architectureMode: mode as any });
        expect(res.positions).toBeDefined();
        expect(Object.keys(res.positions).length).toBe(0);
      }
    });
  });

  // ==========================================
  // GATE 3: MINIMAL DATASETS
  // ==========================================
  describe('Gate 3: Minimal Datasets', () => {
    test('N=1, E=0', () => {
      const nodes: ExplorerNode[] = [
        {
          id: 'singleNode',
          displayName: 'SingleNode',
          type: 'LWC',
          file: 'lwc/singleNode/singleNode.js',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ];
      const res = computeArchitectureLayoutWithMetadata(nodes, [], { architectureMode: 'orbit' });
      expect(Object.keys(res.positions).length).toBe(1);
      expect(Number.isFinite(res.positions['singleNode'].x)).toBe(true);
      expect(Number.isFinite(res.positions['singleNode'].y)).toBe(true);
      expect(res.orbitGuides?.rings.length).toBe(6);
      expect(res.orbitGuides?.sectors.length).toBe(1);
    });

    test('N=2, E=0 and N=2, E=1', () => {
      const nodes: ExplorerNode[] = [
        {
          id: 'n1',
          displayName: 'Node1',
          type: 'LWC',
          file: 'lwc/n1/n1.js',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'n2',
          displayName: 'Node2',
          type: 'ApexClass',
          file: 'classes/Node2.cls',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ];

      const res0 = computeArchitectureLayoutWithMetadata(nodes, [], { architectureMode: 'orbit' });
      expect(Object.keys(res0.positions).length).toBe(2);
      expect(Number.isFinite(res0.positions['n1'].x)).toBe(true);
      expect(Number.isFinite(res0.positions['n2'].x)).toBe(true);
      expect(checkAABBOverlap(res0.positions['n1'], res0.positions['n2'], 160, 100)).toBe(false);

      const edges: ExplorerEdge[] = [{ source: 'n1', target: 'n2', type: 'calls' }];
      const res1 = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
      expect(Object.keys(res1.positions).length).toBe(2);
      expect(Number.isFinite(res1.positions['n1'].x)).toBe(true);
      expect(Number.isFinite(res1.positions['n2'].x)).toBe(true);
      expect(checkAABBOverlap(res1.positions['n1'], res1.positions['n2'], 160, 100)).toBe(false);
    });

    test('All nodes sharing one sector and all nodes sharing one ring', () => {
      const nodes: ExplorerNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `node_${i}`,
        displayName: `Node_${i}`,
        type: 'LWC', // All LWC -> Ring 0
        file: `lwc/featureA/node_${i}.js`, // All featureA -> Same sector
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      }));

      const res = computeArchitectureLayoutWithMetadata(nodes, [], { architectureMode: 'orbit' });
      expect(Object.keys(res.positions).length).toBe(10);

      // Check no two nodes overlap
      const posList = Object.values(res.positions);
      for (let i = 0; i < posList.length; i++) {
        for (let j = i + 1; j < posList.length; j++) {
          expect(checkAABBOverlap(posList[i], posList[j], 160, 100)).toBe(false);
        }
      }
    });
  });

  // ==========================================
  // GATE 4: MALFORMED / INCOMPLETE SEMANTIC DATA
  // ==========================================
  describe('Gate 4: Malformed / Incomplete Semantic Data', () => {
    test('Handles missing type, file, behavior, and malformed metadata deterministically', () => {
      const malformedNodes: any[] = [
        { id: 'malformed_1' }, // Missing type, file, metrics, behavior
        { id: 'malformed_2', type: undefined, file: '' },
        { id: 'malformed_3', type: 'UnknownType', file: 'unknown/path/File.cls' },
        { id: 'malformed_4', type: null, displayName: '123' },
      ];

      const semantics = projectOrbitSemantics(malformedNodes as ExplorerNode[], []);
      expect(semantics.nodeList.length).toBe(4);

      for (const meta of semantics.nodeList) {
        expect(meta.orbitRingIndex).toBeGreaterThanOrEqual(0);
        expect(meta.orbitRingIndex).toBeLessThanOrEqual(5);
        expect(meta.orbitSectorId).toBeDefined();
        expect(meta.semanticOrderKey).toBeDefined();
      }

      const res = computeArchitectureLayoutWithMetadata(malformedNodes as ExplorerNode[], [], { architectureMode: 'orbit' });
      expect(Object.keys(res.positions).length).toBe(4);

      for (const pos of Object.values(res.positions)) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(pos.x).not.toBeNaN();
        expect(pos.y).not.toBeNaN();
      }
    });
  });

  // ==========================================
  // GATE 5: FILTERING DURING ORBIT
  // ==========================================
  describe('Gate 5: Filtering During Orbit', () => {
    test('Filtering nodes recalculates visible nodes only with no stale coordinates', () => {
      const { nodes, edges } = realFixtures.pbim;

      const fullRes = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
      expect(Object.keys(fullRes.positions).length).toBe(nodes.length);

      // Filter to LWCs only
      const filteredGraph = filterGraphByNodeTypes(nodes, edges, new Set(['LWC']));
      const filteredRes = computeArchitectureLayoutWithMetadata(filteredGraph.nodes, filteredGraph.edges, { architectureMode: 'orbit' });

      expect(Object.keys(filteredRes.positions).length).toBe(filteredGraph.nodes.length);
      expect(filteredGraph.nodes.length).toBeLessThan(nodes.length);

      for (const node of filteredGraph.nodes) {
        expect(filteredRes.positions[node.id]).toBeDefined();
        expect(Number.isFinite(filteredRes.positions[node.id].x)).toBe(true);
      }

      // Restore full graph
      const restoredRes = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
      expect(restoredRes.positions).toEqual(fullRes.positions);
    });
  });

  // ==========================================
  // GATE 7: RAPID MODE SWITCHING & STRESS
  // ==========================================
  describe('Gate 7: Rapid Mode Switching', () => {
    test('Executes 30 rapid mode switch cycles with 0 coordinate drift', () => {
      const { nodes, edges } = realFixtures.cst;
      const modes = ['orbit', 'hybrid', 'hierarchical', 'constellation'] as const;

      const initialOrbit = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });

      for (let cycle = 0; cycle < 30; cycle++) {
        for (const mode of modes) {
          const res = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: mode });
          expect(Object.keys(res.positions).length).toBe(nodes.length);
        }
      }

      const finalOrbit = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
      expect(finalOrbit.positions).toEqual(initialOrbit.positions);
    });
  });

  // ==========================================
  // GATE 9: PERSISTENCE & RELOAD EDGE CASES
  // ==========================================
  describe('Gate 9: Persistence & Reload Edge Cases', () => {
    test('mergeWithDefaultState hydrations and fallback behavior', () => {
      const hydratedDefault = mergeWithDefaultState('default', {});
      expect(hydratedDefault.graphLayout.architectureMode).toBe('hierarchical');

      const hydratedOrbit = mergeWithDefaultState('default', {
        graphLayout: { architectureMode: 'orbit' as any } as any,
      });
      expect(hydratedOrbit.graphLayout.architectureMode).toBe('orbit');

      const hydratedInvalid = mergeWithDefaultState('default', {
        graphLayout: { architectureMode: 'invalid_mode' as any } as any,
      });
      expect(hydratedInvalid.graphLayout.architectureMode).toBe('hierarchical');
    });

    test('User-authored position overrides take precedence without corrupting layout calculation', () => {
      const { nodes, edges } = realFixtures['food-app'];
      const userPositions = {
        'food-app-node-1': { x: 9999, y: 8888 },
      };

      const res = computeArchitectureLayoutWithMetadata(nodes, edges, {
        architectureMode: 'orbit',
        existingPositions: userPositions,
      });

      expect(res.positions['food-app-node-1']).toEqual({ x: 9999, y: 8888 });
    });
  });

  // ==========================================
  // GATE 10: EDGE INTEGRITY
  // ==========================================
  describe('Gate 10: Edge Integrity', () => {
    test('Every edge in real fixtures references valid nodes post-layout', () => {
      for (const [name, fixture] of Object.entries(realFixtures)) {
        const res = computeArchitectureLayoutWithMetadata(fixture.nodes, fixture.edges, { architectureMode: 'orbit' });
        const nodeSet = new Set(Object.keys(res.positions));

        for (const edge of fixture.edges) {
          expect(nodeSet.has(edge.source)).toBe(true);
          expect(nodeSet.has(edge.target)).toBe(true);
        }
      }
    });
  });

  // ==========================================
  // GATE 11: NUMERICAL SAFETY
  // ==========================================
  describe('Gate 11: Numerical Safety', () => {
    test('Mathematical functions handle boundary cases safely', () => {
      expect(normalizeAngle(NaN)).toBe(0);
      expect(normalizeAngle(Infinity)).toBe(0);
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);

      expect(calculateRequiredSectorRadius(0, 1.0, 100)).toBe(0);
      expect(calculateRequiredSectorRadius(1, 1.0, 100)).toBe(0);
      expect(calculateRequiredSectorRadius(5, 0, 100)).toBe(Infinity);
      expect(calculateRequiredSectorRadius(5, 1e-8, 100)).toBe(Infinity);
    });
  });

  // ==========================================
  // GATE 12 & 17: REAL FIXTURE MATRIX
  // ==========================================
  describe('Gate 17: Real Fixture Matrix Execution', () => {
    test('Validates real fixtures across all 4 modes', () => {
      const modes = ['orbit', 'hybrid', 'hierarchical', 'constellation'] as const;

      for (const [fixtureName, fixture] of Object.entries(realFixtures)) {
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

});

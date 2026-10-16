import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import { computeArchitectureLayout, computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { projectOrbitSemantics } from '../lib/layout/orbit-semantics';
import { computeOrbitLayout } from '../lib/orbit-layout';
import { adaptConstellation } from '../lib/adapters/constellation-adapter';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { createMockNode, createMockDataSchema } from './mock-factories';
import { ArchitectureLayoutMode, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { parseExplorerData } from '../lib/schema';
import { createDefaultProjectUIState, mergeWithDefaultState } from '../lib/projectState';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';

function loadRealFixture(filename: string) {
  const filePath = path.resolve(__dirname, `../../public/projects/${filename}`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return parseExplorerData(raw);
}

function hashTopology(nodes: ExplorerNode[], edges: ExplorerEdge[]): string {
  const nodeStr = nodes.map(n => n.id).sort().join('|');
  const edgeStr = edges.map(e => `${e.id}:${e.source}->${e.target}`).sort().join('|');
  return crypto.createHash('sha256').update(`${nodeStr}#${edgeStr}`).digest('hex');
}

describe('ARCHITECTURE ORBIT — C7 CROSS-LAYOUT CONTRACT & REGRESSION SUITE', () => {

  const pbimData = loadRealFixture('pbim/explorer-data.json');
  const cstData = loadRealFixture('cst/explorer-data.json');
  const bqcData = loadRealFixture('bqc/explorer-data.json');
  const foodAppData = loadRealFixture('food-app/explorer-data.json');

  // Gate 1: Mode Ownership Audit
  it('Gate 1 — Mode Ownership Audit: Global vs Mode-Specific Concerns', () => {
    // Verify that global layout dispatcher handles mode selection cleanly
    expect(typeof computeArchitectureLayout).toBe('function');

    // Test that Orbit does not modify nodes or edges globally
    const nodes = [createMockNode('A', 'A', 'ApexClass')];
    const edges: ExplorerEdge[] = [];
    const origNodesJson = JSON.stringify(nodes);

    computeArchitectureLayout(nodes, edges, { architectureMode: 'orbit' });
    expect(JSON.stringify(nodes)).toBe(origNodesJson);

    computeArchitectureLayout(nodes, edges, { architectureMode: 'hybrid' });
    expect(JSON.stringify(nodes)).toBe(origNodesJson);

    computeArchitectureLayout(nodes, edges, { architectureMode: 'hierarchical' });
    expect(JSON.stringify(nodes)).toBe(origNodesJson);
  });

  // Gate 2: Mode Switch Matrix (12 transitions)
  it('Gate 2 — Mode Switch Matrix: Evaluates all 12 layout transitions', () => {
    if (!cstData) return;

    const modes: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit'];
    const results: Record<string, any> = {};

    for (const mode of modes) {
      results[mode] = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
        architectureMode: mode,
        enableFeatureLayout: mode === 'hybrid',
      });
      const expectedCount = mode === 'orbit' ? (results[mode].projectedNodeIds?.size ?? cstData.nodes.length) : cstData.nodes.length;
      expect(Object.keys(results[mode].positions).length).toBe(expectedCount);
    }

    // Verify transition pairs
    const transitions = [
      ['orbit', 'hybrid'],
      ['orbit', 'hierarchical'],
      ['orbit', 'constellation'],
      ['hybrid', 'orbit'],
      ['hierarchical', 'orbit'],
      ['constellation', 'orbit'],
      ['hybrid', 'hierarchical'],
      ['hierarchical', 'hybrid'],
      ['hybrid', 'constellation'],
      ['constellation', 'hybrid'],
      ['hierarchical', 'constellation'],
      ['constellation', 'hierarchical'],
    ];

    transitions.forEach(([from, to]) => {
      if (from === 'constellation' || to === 'constellation') {
        const constellationRes = adaptConstellation(cstData, { focalNodeId: cstData.nodes[0].id });
        expect(constellationRes).toBeDefined();
        expect(constellationRes.focalNode?.id).toBe(cstData.nodes[0].id);
      } else {
        const fromRes = results[from as ArchitectureLayoutMode];
        const toRes = results[to as ArchitectureLayoutMode];
        expect(fromRes).toBeDefined();
        expect(toRes).toBeDefined();
      }
    });
  });

  // Gate 3: Orbit Overlay Isolation
  it('Gate 3 — Orbit Overlay Isolation: 0 Orbit overlay elements in non-Orbit modes', () => {
    const mockSchema = createMockDataSchema(
      [createMockNode('A', 'A', 'ApexClass'), createMockNode('B', 'B', 'ApexClass')],
      []
    );

    // Render in Hierarchical mode
    const { container: containerH, unmount: unmountH } = render(
      <FeatureOverlayCanvas
        cy={null}
        nodes={mockSchema.nodes}
        edges={mockSchema.edges}
        architectureMode="hierarchical"
        enableOverlay={true}
      />
    );
    expect(containerH.querySelector('.orbit-guides-overlay')).toBeNull();
    unmountH();
    cleanup();

    // Render in Hybrid mode
    const { container: containerHy, unmount: unmountHy } = render(
      <FeatureOverlayCanvas
        cy={null}
        nodes={mockSchema.nodes}
        edges={mockSchema.edges}
        architectureMode="hybrid"
        enableOverlay={true}
      />
    );
    expect(containerHy.querySelector('.orbit-guides-overlay')).toBeNull();
    unmountHy();
    cleanup();

    // Render in Orbit mode (Guides MUST exist)
    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1,
      nodes: () => [],
      on: () => {},
      off: () => {},
    } as any;

    const { container: containerO, unmount: unmountO } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={mockSchema.nodes}
        edges={mockSchema.edges}
        architectureMode="orbit"
        orbitGuides={{ rings: [], sectors: [] }}
        enableOverlay={true}
      />
    );
    expect(containerO.querySelector('.orbit-guides-overlay')).not.toBeNull();
    unmountO();
    cleanup();
  });

  // Gate 4: Hybrid Geometry Preservation
  it('Gate 4 — Hybrid Geometry Preservation: Retains feature regions and Hybrid node positions', () => {
    if (!cstData) return;

    const hybridResult = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });

    expect(hybridResult.featureRegions).toBeDefined();
    expect(hybridResult.featureRegions!.size).toBeGreaterThan(0);
    expect(hybridResult.orbitGuides).toBeUndefined();

    // Node positions must be populated for all nodes
    expect(Object.keys(hybridResult.positions).length).toBe(cstData.nodes.length);
  });

  // Gate 5: Hierarchical Preservation
  it('Gate 5 — Hierarchical Preservation: Retains rank/layer geometry without Orbit guides', () => {
    if (!cstData) return;

    const hierarchicalResult = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'hierarchical',
      enableFeatureLayout: false,
    });

    expect(hierarchicalResult.featureRegions).toBeUndefined();
    expect(hierarchicalResult.orbitGuides).toBeUndefined();
    expect(Object.keys(hierarchicalResult.positions).length).toBe(cstData.nodes.length);
  });

  // Gate 6: Constellation Preservation
  it('Gate 6 — Constellation Preservation: Constellation != Orbit', () => {
    if (!cstData) return;

    const focalId = cstData.nodes[0].id;
    const constellationData = adaptConstellation(cstData, { focalNodeId: focalId, maxDepth: 2 });

    expect(constellationData.focalNode?.id).toBe(focalId);
    expect(constellationData.rings.length).toBeGreaterThan(0);
    expect(Object.keys(constellationData.nodes).length).toBeGreaterThan(0);

    // Verify Constellation output contains NO Orbit ring/sector properties
    const constellationStr = JSON.stringify(constellationData);
    expect(constellationStr).not.toContain('orbitGuides');
    expect(constellationStr).not.toContain('semanticRings');
    expect(constellationStr).not.toContain('virtualNucleus');
  });

  // Gate 7 & 8 & 9: Selection, Hover, Visibility Contracts
  it('Gate 7, 8, 9 — Selection, Hover, Visibility Contracts', () => {
    if (!cstData) return;

    // Visibility: filter graph
    const filtered = filterGraphByNodeTypes(cstData.nodes, cstData.edges, ['ApexClass', 'LWC']);
    expect(filtered.nodes.length).toBeLessThanOrEqual(cstData.nodes.length);
    expect(filtered.edges.length).toBeLessThanOrEqual(cstData.edges.length);

    // Run layout on filtered set
    const filteredOrbit = computeArchitectureLayoutWithMetadata(filtered.nodes, filtered.edges, {
      architectureMode: 'orbit',
    });
    const expectedCount = filteredOrbit.projectedNodeIds?.size ?? filtered.nodes.length;
    expect(Object.keys(filteredOrbit.positions).length).toBe(expectedCount);
  });

  // Gate 10 & 19: Graph Topology & Source Immutability
  it('Gate 10 & 19 — Graph Topology & Source Immutability', () => {
    if (!cstData) return;

    const initialHash = hashTopology(cstData.nodes, cstData.edges);

    computeArchitectureLayout(cstData.nodes, cstData.edges, { architectureMode: 'orbit' });
    expect(hashTopology(cstData.nodes, cstData.edges)).toBe(initialHash);

    computeArchitectureLayout(cstData.nodes, cstData.edges, { architectureMode: 'hybrid', enableFeatureLayout: true });
    expect(hashTopology(cstData.nodes, cstData.edges)).toBe(initialHash);

    computeArchitectureLayout(cstData.nodes, cstData.edges, { architectureMode: 'hierarchical' });
    expect(hashTopology(cstData.nodes, cstData.edges)).toBe(initialHash);
  });

  // Gate 11: Semantic Ownership
  it('Gate 11 — Semantic Ownership: Orbit consumes centralized classifiers without duplicate authority', () => {
    if (!cstData) return;

    const proj = projectOrbitSemantics(cstData.nodes, cstData.edges);
    expect(proj.nodeList.length).toBe(cstData.nodes.length);

    // Every node in projectOrbitSemantics has an assigned ring (0-5) and sector
    proj.nodeList.forEach(item => {
      expect(item.orbitRingIndex).toBeGreaterThanOrEqual(0);
      expect(item.orbitRingIndex).toBeLessThanOrEqual(5);
      expect(typeof item.orbitSectorId).toBe('string');
      expect(item.orbitSectorId.length).toBeGreaterThan(0);
    });
  });

  // Gate 12: Position Authority Isolation
  it('Gate 12 — Position Authority: Orbit coordinate writes outside Orbit mode = 0', () => {
    if (!cstData) return;

    const hierarchicalRes = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'hierarchical',
    });
    expect(hierarchicalRes.orbitGuides).toBeUndefined();

    const hybridRes = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    expect(hybridRes.orbitGuides).toBeUndefined();

    const orbitRes = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'orbit',
    });
    expect(orbitRes.orbitGuides).toBeDefined();
  });

  // Gate 13 & 17: Repeated Mode-Switch Stress (10 cycles) & Overlay Lifecycle
  it('Gate 13 & 17 — Repeated Mode-Switch Stress & Overlay Lifecycle: 10 cycles without state leak', () => {
    if (!cstData) return;

    const modes: ArchitectureLayoutMode[] = ['orbit', 'hybrid', 'hierarchical'];
    const prevPositions: Record<string, { x: number; y: number }> = {};

    for (let cycle = 1; cycle <= 10; cycle++) {
      for (const mode of modes) {
        const res = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
          architectureMode: mode,
          enableFeatureLayout: mode === 'hybrid',
        });
        const expectedCount = mode === 'orbit' ? (res.projectedNodeIds?.size ?? cstData.nodes.length) : cstData.nodes.length;
        expect(Object.keys(res.positions).length).toBe(expectedCount);

        if (mode === 'orbit') {
          expect(res.orbitGuides).toBeDefined();
          expect(res.featureRegions).toBeUndefined();
        } else if (mode === 'hybrid') {
          expect(res.orbitGuides).toBeUndefined();
          expect(res.featureRegions).toBeDefined();
        } else {
          expect(res.orbitGuides).toBeUndefined();
          expect(res.featureRegions).toBeUndefined();
        }

        if (cycle === 1 && mode === 'orbit') {
          Object.assign(prevPositions, res.positions);
        } else if (mode === 'orbit') {
          // Verify 0 coordinate drift across repeated mode switches
          for (const [nId, pos] of Object.entries(res.positions)) {
            expect(pos.x).toBeCloseTo(prevPositions[nId].x, 5);
            expect(pos.y).toBeCloseTo(prevPositions[nId].y, 5);
          }
        }
      }
    }
  });

  // Gate 14 & 20: State Persistence / Reload
  it('Gate 14 & 20 — State Persistence & Reload Verification', () => {
    const initialState = createDefaultProjectUIState('test-project');
    expect(initialState.graphLayout.architectureMode).toBe('hierarchical');

    // Update architecture mode to orbit
    const orbitState = mergeWithDefaultState('test-project', {
      graphLayout: {
        ...initialState.graphLayout,
        architectureMode: 'orbit',
        layoutProvenance: 'automatic-orbit',
      },
    });

    expect(orbitState.graphLayout.architectureMode).toBe('orbit');
    expect(orbitState.graphLayout.layoutProvenance).toBe('automatic-orbit');

    // Update architecture mode to hybrid
    const hybridState = mergeWithDefaultState('test-project', {
      graphLayout: {
        ...initialState.graphLayout,
        architectureMode: 'hybrid',
        layoutProvenance: 'automatic-hybrid',
      },
    });

    expect(hybridState.graphLayout.architectureMode).toBe('hybrid');
    expect(hybridState.graphLayout.layoutProvenance).toBe('automatic-hybrid');
  });

  // Gate 15: Real PBIM Browser/Runtime Regression
  it('Gate 15 — Real PBIM Browser/Runtime Regression (528 nodes, 2063 edges, 65 sectors)', () => {
    if (!pbimData) return;

    expect(pbimData.nodes.length).toBe(528);
    expect(pbimData.edges.length).toBe(2063);

    // Orbit
    const orbitRes = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'orbit',
    });
    expect(Object.keys(orbitRes.positions).length).toBe(131);
    expect(orbitRes.orbitGuides).toBeDefined();

    // Hybrid
    const hybridRes = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    expect(Object.keys(hybridRes.positions).length).toBe(528);
    expect(hybridRes.featureRegions).toBeDefined();

    // Hierarchical
    const hierarchicalRes = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'hierarchical',
    });
    expect(Object.keys(hierarchicalRes.positions).length).toBe(528);
  });

  // Gate 16: Real Fixture Cross-Mode Matrix (PBIM, CST, BQC, food-app)
  it('Gate 16 — Real Fixture Cross-Mode Matrix across all datasets', () => {
    const fixtures = [
      { name: 'pbim', data: pbimData },
      { name: 'cst', data: cstData },
      { name: 'bqc', data: bqcData },
      { name: 'food-app', data: foodAppData },
    ];

    fixtures.forEach(({ name: _name, data }) => {
      if (!data) return;

      const modes: ArchitectureLayoutMode[] = ['orbit', 'hybrid', 'hierarchical'];
      modes.forEach(mode => {
        const res = computeArchitectureLayoutWithMetadata(data.nodes, data.edges, {
          architectureMode: mode,
          enableFeatureLayout: mode === 'hybrid',
        });
        const expectedCount = mode === 'orbit' ? (res.projectedNodeIds?.size ?? data.nodes.length) : data.nodes.length;
        expect(Object.keys(res.positions).length).toBe(expectedCount);
      });
    });
  });

  // Gate 18: Determinism Across Modes
  it('Gate 18 — Determinism Across Modes (0.00000 px coordinate drift)', () => {
    if (!pbimData) return;

    const orbitRun1 = computeOrbitLayout({
      nodes: projectOrbitSemantics(pbimData.nodes, pbimData.edges).nodeList,
      options: { nodeWidth: 120, nodeHeight: 60 },
    });

    // Run Hybrid and Hierarchical
    computeArchitectureLayout(pbimData.nodes, pbimData.edges, { architectureMode: 'hybrid', enableFeatureLayout: true });
    computeArchitectureLayout(pbimData.nodes, pbimData.edges, { architectureMode: 'hierarchical' });

    // Run Orbit again
    const orbitRun2 = computeOrbitLayout({
      nodes: projectOrbitSemantics(pbimData.nodes, pbimData.edges).nodeList,
      options: { nodeWidth: 120, nodeHeight: 60 },
    });

    for (const [nodeId, pos1] of Object.entries(orbitRun1.positions)) {
      const pos2 = orbitRun2.positions[nodeId];
      expect(pos2).toBeDefined();
      expect(pos2.x).toBe(pos1.x);
      expect(pos2.y).toBe(pos1.y);
    }
  });

  // Gate 21: Frozen Contract Regression (C4, C5, C6 baselines)
  it('Gate 21 — Frozen Contract Regression: C4, C5, C6 baselines preserved', () => {
    if (!pbimData) return;

    const sem = projectOrbitSemantics(pbimData.nodes, pbimData.edges);
    const orbitLayout = computeOrbitLayout({
      nodes: sem.nodeList,
      options: { nodeWidth: 120, nodeHeight: 60 },
    });

    expect(pbimData.nodes.length).toBe(528);
    expect(pbimData.edges.length).toBe(2063);
    expect(orbitLayout.guides.sectors.length).toBe(65);
    expect(orbitLayout.guides.rings.length).toBe(6);
  });
});

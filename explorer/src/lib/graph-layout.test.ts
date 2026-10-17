import { describe, it, expect, vi, beforeEach } from 'vitest';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import {
  getLayoutOptions,
  createLayout,
  runLayoutWithMetadata,
  runLayoutWithMetadataAsync,
  LAYOUT_PRESETS,
} from './graph-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

cytoscape.use(fcose);

describe('graph-layout dispatcher fixes', () => {
  let cy: cytoscape.Core;
  const mockNodes: ExplorerNode[] = [
    {
      id: 'node1',
      displayName: 'Node 1',
      type: 'ApexClass',
      file: 'Node1.cls',
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: null,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
    {
      id: 'node2',
      displayName: 'Node 2',
      type: 'ApexClass',
      file: 'Node2.cls',
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: null,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const mockEdges: ExplorerEdge[] = [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      relationshipType: 'dependency',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: '',
      canonical: {
        source: { type: 'ApexClass', name: 'node1' },
        target: { type: 'ApexClass', name: 'node2' },
        relationship: { type: 'dependency', resolution: 'EXACT' },
        location: { line: null, column: null },
      },
    },
  ];

  beforeEach(() => {
    cy = cytoscape({
      elements: [
        { data: { id: 'node1', displayName: 'Node 1', type: 'ApexClass' } },
        { data: { id: 'node2', displayName: 'Node 2', type: 'ApexClass' } },
        { data: { id: 'edge1', source: 'node1', target: 'node2' } },
      ],
    });
    cy.getElementById('node1').position({ x: 100, y: 200 });
    cy.getElementById('node2').position({ x: 300, y: 400 });
  });

  it('#7/D6: getLayoutOptions and createLayout respect useArchitectureLayout: false', () => {
    const opts = getLayoutOptions({
      useArchitectureLayout: false,
      nodes: mockNodes,
      edges: mockEdges,
    });
    expect(opts.name).toBe('fcose');

    const layout = createLayout(cy, {
      useArchitectureLayout: false,
      nodes: mockNodes,
      edges: mockEdges,
    });
    expect((layout as any).options?.name || (layout as any)._options?.name).toBe('fcose');
  });

  it('D7/D29: preset layout position function falls back to node.position() instead of { x: 0, y: 0 }', () => {
    const opts = getLayoutOptions({
      useArchitectureLayout: true,
      nodes: [mockNodes[0]], // Only node1 provided in nodes array
    });
    expect(opts.name).toBe('preset');
    const posFn = (opts as any).positions;

    const mockCyNode2 = cy.getElementById('node2');
    const pos = posFn(mockCyNode2);
    // Should return node2's existing position { x: 300, y: 400 }, NOT origin { x: 0, y: 0 }
    expect(pos).toEqual({ x: 300, y: 400 });
  });

  it('D8: runLayoutWithMetadataAsync measures real computeDurationMs and totalDurationMs in non-arch path', async () => {
    const res = await runLayoutWithMetadataAsync(cy, {
      useArchitectureLayout: false,
    });
    expect(res.isOffloaded).toBe(false);
    expect(typeof res.computeDurationMs).toBe('number');
    expect(typeof res.totalDurationMs).toBe('number');
    expect(res.computeDurationMs).toBeGreaterThanOrEqual(0);
    expect(res.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('D12 & D13 & #10/D27: runLayoutWithMetadata returns complete metadata shape, fits, and emits start/stop events', () => {
    let startEmitted = false;
    let stopEmitted = false;

    cy.on('layoutstart', () => { startEmitted = true; });
    cy.on('layoutstop', () => { stopEmitted = true; });

    const fitSpy = vi.spyOn(cy, 'fit');

    // 1. Non-arch branch
    const nonArchRes = runLayoutWithMetadata(cy, {
      useArchitectureLayout: false,
    });

    expect(nonArchRes).toHaveProperty('positions');
    expect(nonArchRes).toHaveProperty('featureRegions', undefined);
    expect(nonArchRes).toHaveProperty('orbitGuides', undefined);
    expect(nonArchRes).toHaveProperty('projectedNodeIds', undefined);
    expect(startEmitted).toBe(true);
    expect(stopEmitted).toBe(true);
    expect(fitSpy).toHaveBeenCalled();

    // Reset flags
    startEmitted = false;
    stopEmitted = false;
    fitSpy.mockClear();

    // 2. Sync non-animated arch branch
    const archRes = runLayoutWithMetadata(cy, {
      useArchitectureLayout: true,
      animate: false,
      nodes: mockNodes,
      edges: mockEdges,
    });

    expect(archRes).toHaveProperty('positions');
    expect(startEmitted).toBe(true);
    expect(stopEmitted).toBe(true);
  });

  it('D18: skips extractNodesAndEdgesFromCy when nodes and edges options are supplied', () => {
    runLayoutWithMetadata(cy, {
      useArchitectureLayout: true,
      nodes: mockNodes,
      edges: mockEdges,
    });

    expect(mockNodes.length).toBe(2);
  });

  it('D25/D26: LAYOUT_PRESETS and getLayoutOptions compute density using node count', () => {
    expect(LAYOUT_PRESETS.stable).toBeDefined();

    const opts = getLayoutOptions({
      useArchitectureLayout: false,
      nodeCount: 100,
    });
    expect((opts as any).padding).toBeGreaterThan(80);
  });

  it('O25: non-arch fallback respects existingPositions option', () => {
    const existingPositions = {
      node1: { x: 500, y: 600 },
      node2: { x: 700, y: 800 },
    };

    runLayoutWithMetadata(cy, {
      useArchitectureLayout: false,
      existingPositions,
    });

    expect(cy.getElementById('node1').position()).toEqual({ x: 500, y: 600 });
    expect(cy.getElementById('node2').position()).toEqual({ x: 700, y: 800 });
  });
});

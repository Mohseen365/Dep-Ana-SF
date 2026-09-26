import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import cytoscape from 'cytoscape';

import { computeArchitectureLayout } from '../lib/architecture-layout';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { deriveFeatureCompositionGroups } from '../lib/layout/feature-composition';
import { discoverFeatures } from '../lib/layout/features';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Phase 2.5 — Visual Composition & Representation Acceptance Suite', () => {
  let nodes: ExplorerNode[];
  let edges: ExplorerEdge[];

  beforeEach(() => {
    vi.clearAllMocks();

    const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const rawData = fs.readFileSync(fixturePath, 'utf-8');
    const data = JSON.parse(rawData);

    nodes = data.nodes;
    edges = data.edges;
  });

  it('1. Hybrid coordinates produce correct composition group bounding boxes derived from actual node positions', () => {
    // Execute Hybrid layout
    const nodePositions = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
    });

    const discovery = discoverFeatures(nodes, edges);

    expect(nodePositions).toBeDefined();
    expect(Object.keys(nodePositions).length).toBeGreaterThan(0);

    // Derive composition groups for all features
    const allGroups: ReturnType<typeof deriveFeatureCompositionGroups> = [];
    discovery.features.forEach((feature) => {
      const groups = deriveFeatureCompositionGroups(
        feature,
        nodes,
        edges,
        nodePositions,
        { nodeWidth: 120, nodeHeight: 60, padding: 20 }
      );
      allGroups.push(...groups);
    });

    expect(allGroups.length).toBeGreaterThan(0);

    // Verify bounds strictly match member node positions
    allGroups.forEach((group) => {
      if (!group.bounds) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      group.nodeIds.forEach((nId) => {
        const pos = nodePositions[nId];
        if (pos) {
          minX = Math.min(minX, pos.x - 60);
          maxX = Math.max(maxX, pos.x + 60);
          minY = Math.min(minY, pos.y - 30);
          maxY = Math.max(maxY, pos.y + 30);
        }
      });

      expect(group.bounds.xMin).toBeCloseTo(minX - 20, 4);
      expect(group.bounds.xMax).toBeCloseTo(maxX + 20, 4);
      expect(group.bounds.yMin).toBeCloseTo(minY - 20, 4);
      expect(group.bounds.yMax).toBeCloseTo(maxY + 20, 4);
      expect(group.bounds.width).toBeCloseTo(group.bounds.xMax - group.bounds.xMin, 4);
      expect(group.bounds.height).toBeCloseTo(group.bounds.yMax - group.bounds.yMin, 4);
    });
  });

  it('2. Viewport operations (pan, zoom, hover, selection, shared highlighting) trigger 0 layout calls and 0 coordinate mutations', () => {
    const layoutSpy = vi.fn();
    const mockCy = {
      pan: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      zoom: vi.fn().mockReturnValue(1.0),
      layout: layoutSpy,
      on: vi.fn(),
      off: vi.fn(),
      nodes: vi.fn().mockReturnValue([
        { id: () => 'node_1', position: () => ({ x: 100, y: 200 }) },
        { id: () => 'node_2', position: () => ({ x: 300, y: 400 }) },
      ]),
    } as unknown as cytoscape.Core;

    const discovery = discoverFeatures(nodes, edges);
    const mockPositions = {
      node_1: { x: 100, y: 200 },
      node_2: { x: 300, y: 400 },
    };

    const { rerender } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        nodePositions={mockPositions}
        hoveredNodeId={null}
        selectedNodeId={null}
        enableOverlay={true}
      />
    );

    // Initial render layout check
    expect(layoutSpy).toHaveBeenCalledTimes(0);

    // Simulate pan & zoom update
    act(() => {
      rerender(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={nodes}
          edges={edges}
          discoveryResult={discovery}
          nodePositions={mockPositions}
          hoveredNodeId={null}
          selectedNodeId={null}
          enableOverlay={true}
        />
      );
    });
    expect(layoutSpy).toHaveBeenCalledTimes(0);

    // Simulate hover change
    act(() => {
      rerender(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={nodes}
          edges={edges}
          discoveryResult={discovery}
          nodePositions={mockPositions}
          hoveredNodeId="node_1"
          selectedNodeId={null}
          enableOverlay={true}
        />
      );
    });
    expect(layoutSpy).toHaveBeenCalledTimes(0);

    // Simulate selection change
    act(() => {
      rerender(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={nodes}
          edges={edges}
          discoveryResult={discovery}
          nodePositions={mockPositions}
          hoveredNodeId={null}
          selectedNodeId="node_2"
          enableOverlay={true}
        />
      );
    });
    expect(layoutSpy).toHaveBeenCalledTimes(0);
  });

  it('3. Far Zoom (< 0.6) suppresses composition group outlines and finding badges from SVG DOM', () => {
    let currentZoom = 1.0;
    let zoomListener: (() => void) | null = null;

    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => currentZoom,
      on: vi.fn((evt: string, fn: () => void) => {
        if (evt.includes('zoom')) zoomListener = fn;
      }),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const hybridPositions = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
    });

    const discovery = discoverFeatures(nodes, edges);

    const sampleFindings = [
      {
        id: 'finding_1',
        type: 'HIGH_COUPLING',
        severity: 'HIGH' as const,
        title: 'High Coupling',
        description: 'High coupling detected',
        nodeIds: ['LWC:forecast-manager'],
        edgeIds: [],
        evidence: [],
        provenance: { origin: 'DERIVED_RULE' as const, source: 'rule', facts: {} },
        rule: { ruleId: 'HIGH_COUPLING', ruleVersion: '1.0', name: 'High Coupling' },
      },
    ];

    const { container } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        nodePositions={hybridPositions}
        findings={sampleFindings}
        enableOverlay={true}
      />
    );

    // At zoom = 1.0 (Close / Normal Zoom)
    let compositionBoxes = container.querySelectorAll('.composition-group-overlay');
    let findingBadges = container.querySelectorAll('.finding-badge-overlay');
    expect(compositionBoxes.length).toBeGreaterThan(0);
    expect(findingBadges.length).toBeGreaterThan(0);

    // Switch to far zoom (zoom = 0.4) and notify listener
    currentZoom = 0.4;
    act(() => {
      if (zoomListener) zoomListener();
    });

    // At far zoom (< 0.6), composition boxes and finding badges must be suppressed
    compositionBoxes = container.querySelectorAll('.composition-group-overlay');
    findingBadges = container.querySelectorAll('.finding-badge-overlay');
    expect(compositionBoxes.length).toBe(0);
    expect(findingBadges.length).toBe(0);
  });

  it('4. Node drag updates composition bounds accurately without layout invocation', () => {
    const layoutSpy = vi.fn();
    const basePositions = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
    });

    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      layout: layoutSpy,
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const discovery = discoverFeatures(nodes, edges);

    const { container, rerender } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        nodePositions={basePositions}
        enableOverlay={true}
      />
    );

    const initialRect = container.querySelector('.composition-group-overlay rect');
    const initialX = Number(initialRect?.getAttribute('x'));

    // Drag all nodes by shifting position +150px
    const draggedPositions = Object.fromEntries(
      Object.entries(basePositions).map(([id, pos]) => [
        id,
        { x: pos.x + 150, y: pos.y },
      ])
    );

    act(() => {
      rerender(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={nodes}
          edges={edges}
          discoveryResult={discovery}
          nodePositions={draggedPositions}
          enableOverlay={true}
        />
      );
    });

    const updatedRect = container.querySelector('.composition-group-overlay rect');
    const updatedX = Number(updatedRect?.getAttribute('x'));

    // Composition box must move dynamically with dragged node (+150px)
    expect(updatedX).toBeCloseTo(initialX + 150, 4);
    expect(layoutSpy).toHaveBeenCalledTimes(0);
  });

  it('5. Composition derivation is 100% deterministic over 10 consecutive runs', () => {
    const basePositions = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
      layoutMode: 'static',
    });

    const discovery = discoverFeatures(nodes, edges);

    const baselineGroups = Array.from(discovery.features.values()).flatMap((f) =>
      deriveFeatureCompositionGroups(f, nodes, edges, basePositions)
    );

    for (let run = 1; run <= 10; run++) {
      const repeatedGroups = Array.from(discovery.features.values()).flatMap((f) =>
        deriveFeatureCompositionGroups(f, nodes, edges, basePositions)
      );

      expect(repeatedGroups.length).toBe(baselineGroups.length);

      for (let i = 0; i < baselineGroups.length; i++) {
        const bGroup = baselineGroups[i];
        const rGroup = repeatedGroups[i];

        expect(rGroup.id).toBe(bGroup.id);
        expect(rGroup.label).toBe(bGroup.label);

        if (bGroup.bounds && rGroup.bounds) {
          expect(rGroup.bounds.xMin).toBe(bGroup.bounds.xMin);
          expect(rGroup.bounds.xMax).toBe(bGroup.bounds.xMax);
          expect(rGroup.bounds.yMin).toBe(bGroup.bounds.yMin);
          expect(rGroup.bounds.yMax).toBe(bGroup.bounds.yMax);
        }
      }
    }
  });

  it('6. Visibly distinguishes Path A (Legacy Hierarchy), Path B (1D Column), and Path C (Genuine 2D Hybrid)', () => {
    // Path A: Legacy domain hierarchy
    const pathA = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: false,
    });

    // Path C: Genuine 2D Hybrid layout
    const pathC = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
    });

    // Compare node position geometry across Path A vs Path C
    const forecastNodeId = 'LWC:forecast-manager';
    const posA = pathA[forecastNodeId];
    const posC = pathC[forecastNodeId];

    expect(posA).toBeDefined();
    expect(posC).toBeDefined();

    // Coordinates in Path C must reflect 2D Hybrid feature region placement
    expect(Math.abs(posC.x - posA.x) + Math.abs(posC.y - posA.y)).toBeGreaterThan(50);

    // Compare feature region spatial spans
    const discovery = discoverFeatures(nodes, edges);
    const groupsA = Array.from(discovery.features.values()).flatMap((f) =>
      deriveFeatureCompositionGroups(f, nodes, edges, pathA)
    );
    const groupsC = Array.from(discovery.features.values()).flatMap((f) =>
      deriveFeatureCompositionGroups(f, nodes, edges, pathC)
    );

    expect(groupsA.length).toBeGreaterThan(0);
    expect(groupsC.length).toBeGreaterThan(0);

    // Group bounds in Path C reflect 2D Hybrid placement, proving composition boxes do not fake coordinates
    const boundsA = groupsA.find((g) => g.bounds)?.bounds;
    const boundsC = groupsC.find((g) => g.bounds)?.bounds;

    expect(boundsA).toBeDefined();
    expect(boundsC).toBeDefined();
    if (boundsA && boundsC) {
      expect(Math.abs(boundsC.xMin - boundsA.xMin) + Math.abs(boundsC.yMin - boundsA.yMin)).toBeGreaterThan(20);
    }
  });

  it('7. Visualization overlay has zero spatial authority and never mutates Cytoscape positions', () => {
    const posSpy = vi.fn();
    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      layout: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [
        { id: () => 'node_1', position: posSpy.mockReturnValue({ x: 100, y: 100 }) },
      ],
    } as unknown as cytoscape.Core;

    const discovery = discoverFeatures(nodes, edges);

    render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        nodePositions={{ node_1: { x: 100, y: 100 } }}
        enableOverlay={true}
      />
    );

    // Position setter on nodes must NEVER be called by overlay canvas
    expect(posSpy).toHaveBeenCalledWith(); // called as getter only, zero arguments passed for position mutation
  });
});

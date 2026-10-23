import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import cytoscape from 'cytoscape';
import { GraphView } from '../components/GraphView';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

const mockFit = vi.fn();
const mockZoom = vi.fn().mockReturnValue(1);
const mockCenter = vi.fn();

vi.mock('cytoscape', () => {
  const mockCy = {
    use: vi.fn(),
    autolock: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    elements: vi.fn().mockReturnValue({
      filter: vi.fn().mockReturnValue([{ id: () => 'LWC:test-comp-1', visible: () => true }]),
      removeClass: vi.fn(),
      addClass: vi.fn(),
    }),
    on: vi.fn(),
    off: vi.fn(),
    zoom: mockZoom,
    center: mockCenter,
    fit: mockFit,
    batch: vi.fn((cb) => cb()),
    destroy: vi.fn(),
    destroyed: vi.fn().mockReturnValue(false),
  };
  const cytoscape = vi.fn().mockReturnValue(mockCy);
  (cytoscape as any).use = vi.fn();
  return { default: cytoscape };
});

describe('GraphView Constellation & Orbit Viewport Fitting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyNodes: ExplorerNode[] = [
    {
      id: 'LWC:test-comp-1',
      displayName: 'test-comp-1',
      type: 'LWC',
      file: 'test-comp-1.js',
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, score: 0 },
      behavior: { isTest: false, asyncPatterns: [] },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const dummyEdges: ExplorerEdge[] = [];

  it('invokes cy.fit with padding 50 for constellation architecture mode when autoLayoutPolicy is false', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={dummyNodes}
        edges={dummyEdges}
        architectureMode="constellation"
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          architectureMode: 'constellation',
          layoutProvenance: 'user-authored',
          nodePositions: { 'LWC:test-comp-1': { x: 100, y: 100 } },
        }}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    expect(mockFit).toHaveBeenCalledWith(expect.anything(), 50);
  });

  it('invokes cy.fit with padding 50 for orbit architecture mode when autoLayoutPolicy is false', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={dummyNodes}
        edges={dummyEdges}
        architectureMode="orbit"
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          architectureMode: 'orbit',
          layoutProvenance: 'user-authored',
          nodePositions: { 'LWC:test-comp-1': { x: 100, y: 100 } },
        }}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    expect(mockFit).toHaveBeenCalledWith(expect.anything(), 50);
  });

  it('invokes cy.zoom and cy.center instead of cy.fit for hierarchical architecture mode when autoLayoutPolicy is false', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={dummyNodes}
        edges={dummyEdges}
        architectureMode="hierarchical"
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          architectureMode: 'hierarchical',
          layoutProvenance: 'user-authored',
          nodePositions: { 'LWC:test-comp-1': { x: 100, y: 100 } },
        }}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    expect(mockFit).not.toHaveBeenCalled();
    expect(mockZoom).toHaveBeenCalledWith(1.4);
    expect(mockCenter).toHaveBeenCalled();
  });
});

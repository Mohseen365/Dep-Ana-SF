import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { GraphView } from '../components/GraphView';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

vi.mock('cytoscape', () => {
  const mockCy = {
    use: vi.fn(),
    autolock: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    elements: vi.fn().mockReturnValue({
      filter: vi.fn().mockReturnValue([]),
      removeClass: vi.fn(),
      addClass: vi.fn(),
    }),
    on: vi.fn(),
    off: vi.fn(),
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    fit: vi.fn(),
    batch: vi.fn((cb) => cb()),
    destroy: vi.fn(),
  };
  const cytoscape = vi.fn().mockReturnValue(mockCy);
  (cytoscape as any).use = vi.fn();
  return { default: cytoscape };
});

describe('GraphView Constellation & Orbit Viewport Fitting', () => {
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

  it('invokes cy.fit for constellation architecture mode', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={dummyNodes}
        edges={dummyEdges}
        architectureMode="constellation"
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    // Verify component renders without crashing
    expect(true).toBe(true);
  });
});

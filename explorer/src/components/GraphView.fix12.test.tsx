import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GraphView } from './GraphView';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape and plugins
const { mockElementsRemove, mockCytoscapeFn } = vi.hoisted(() => {
  const mockElementsRemove = vi.fn();
  const mockElementsCollection = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    unselect: vi.fn().mockReturnThis(),
    remove: mockElementsRemove,
    forEach: vi.fn(() => {}),
    map: vi.fn(() => []),
    filter: vi.fn(() => mockElementsCollection),
    toArray: vi.fn().mockReturnValue([]),
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue(mockElementsCollection),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
    off: vi.fn(),
    one: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockReturnValue({
      length: 0,
      isNode: () => false,
      isEdge: () => false,
      neighborhood: () => []
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() })
  };

  const mockCytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  mockCytoscapeFn.use = vi.fn();

  return { mockElementsRemove, mockCy, mockCytoscapeFn };
});

vi.mock('cytoscape', () => ({ default: mockCytoscapeFn }));
vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockNodes: ExplorerNode[] = [
  {
    id: 'NodeA',
    displayName: 'Node A',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    refactoringReadiness: {
      hasCycles: false,
      hasUnresolved: false,
      isHighRisk: false,
      testCoverageStatus: 'UNCOVERED',
    },
  },
];

const mockEdges: ExplorerEdge[] = [];

describe('Fix #12 — Drop architectureMode from structuralFingerprint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switching architectureMode does not trigger cy.elements().remove() teardown', () => {
    const { rerender } = render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        architectureMode="hierarchical"
      />
    );

    mockElementsRemove.mockClear();

    // Switch architectureMode from hierarchical to orbit
    rerender(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        architectureMode="orbit"
      />
    );

    // Assert cy.elements().remove() was NOT called because architectureMode was dropped from structuralFingerprint
    expect(mockElementsRemove).not.toHaveBeenCalled();
  });
});

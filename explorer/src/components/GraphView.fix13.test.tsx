import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GraphView } from './GraphView';
import type { ExplorerNode } from '../types/explorer';

// Mock cytoscape and plugins
const { mockCy, mockCytoscapeFn, layoutStartListeners } = vi.hoisted(() => {
  const layoutStartListeners: Function[] = [];
  const layoutStopListeners: Function[] = [];
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
    on: vi.fn((event: string, ...args: any[]) => {
      if (event === 'layoutstart') {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') layoutStartListeners.push(cb);
      }
      if (event === 'layoutstop') {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') layoutStopListeners.push(cb);
      }
    }),
    off: vi.fn(),
    one: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    destroyed: vi.fn().mockReturnValue(false),
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

  return { mockElementsRemove, mockCy, mockCytoscapeFn, layoutStartListeners, layoutStopListeners };
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
      testCoverageStatus: 'UNTESTED',
    },
  },
];

const mockNodesUpdated: ExplorerNode[] = [
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
      testCoverageStatus: 'UNTESTED',
    },
  },
  {
    id: 'NodeB',
    displayName: 'Node B',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    refactoringReadiness: {
      hasCycles: false,
      hasUnresolved: false,
      isHighRisk: false,
      testCoverageStatus: 'UNTESTED',
    },
  },
];

describe('Fix #13 — Don\'t let isLayoutRunningRef get stuck on mid-flight teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets isLayoutRunning when structural-sync removes elements mid-layout', () => {
    const graphLayout = {
      architectureMode: 'hierarchical' as const,
      layoutProvenance: 'user-authored' as const,
      mode: 'interactive' as const,
      nodePositions: {},
    };

    const { rerender } = render(
      <GraphView
        nodes={mockNodes}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        graphLayout={graphLayout}
      />
    );

    // Trigger layoutstart mid-flight (so layout is running)
    layoutStartListeners.forEach((fn) => fn());

    // Before structural sync, layout is marked running
    // Now trigger structural sync (updating nodes) which calls cy.elements().remove() without layoutstop
    rerender(
      <GraphView
        nodes={mockNodesUpdated}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        graphLayout={graphLayout}
      />
    );

    // Set up mock node
    let pos = { x: 0, y: 0 };
    const mockCyNode = {
      id: () => 'NodeA',
      position: vi.fn((newPos?: { x: number; y: number }) => {
        if (newPos) pos = newPos;
        return pos;
      }),
    };
    mockCy.nodes.mockReturnValue([mockCyNode] as any);

    // Rerender with new node positions - position-only sync effect should NOT early return because isLayoutRunning was reset!
    rerender(
      <GraphView
        nodes={mockNodesUpdated}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        graphLayout={graphLayout}
        nodePositions={{ NodeA: { x: 100, y: 200 } }}
      />
    );

    // Assert position-only effect executed position update
    expect(mockCyNode.position).toHaveBeenCalledWith({ x: 100, y: 200 });
  });
});

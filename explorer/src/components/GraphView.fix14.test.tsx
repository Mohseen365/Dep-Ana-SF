import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GraphView } from './GraphView';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { createMockNode, createMockEdge } from '../test/mock-factories';

// Mock cytoscape and plugins
const { mockCytoscapeFn, mouseoverNodeListeners, mouseoverEdgeListeners } = vi.hoisted(() => {
  const mouseoverNodeListeners: Function[] = [];
  const mouseoverEdgeListeners: Function[] = [];
  const mockElementsCollection = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    unselect: vi.fn().mockReturnThis(),
    remove: vi.fn(),
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
    on: vi.fn((event: string, targetOrCb: any, cb?: any) => {
      const handler = typeof cb === 'function' ? cb : targetOrCb;
      if (event === 'mouseover' && targetOrCb === 'node') {
        mouseoverNodeListeners.push(handler);
      }
      if (event === 'mouseover' && targetOrCb === 'edge') {
        mouseoverEdgeListeners.push(handler);
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

  return { mockCy, mockCytoscapeFn, mouseoverNodeListeners, mouseoverEdgeListeners };
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

const mockNodes: ExplorerNode[] = Array.from({ length: 250 }, (_, i) =>
  createMockNode(`Node_${i}`, `Node ${i}`, 'ApexClass', 'LOW')
);

const mockEdges: ExplorerEdge[] = Array.from({ length: 250 }, (_, i) =>
  createMockEdge(`Edge_${i}`, `Node_${i}`, `Node_${(i + 1) % 250}`, 'method-call')
);

describe('Fix #14 — O(1) node and edge lookup in hover handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Map O(1) lookup during mouseover hover and does not invoke Array.prototype.find', () => {
    const graphLayout = {
      architectureMode: 'hierarchical' as const,
      layoutProvenance: 'user-authored' as const,
      mode: 'interactive' as const,
      nodePositions: {},
    };

    render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        graphLayout={graphLayout}
      />
    );

    const findSpy = vi.spyOn(Array.prototype, 'find');

    // Simulate mouseover on Node_100
    const nodeHoverEvt = {
      target: { id: () => 'Node_100', addClass: vi.fn(), removeClass: vi.fn() },
      renderedPosition: { x: 100, y: 100 },
    };

    mouseoverNodeListeners.forEach((handler) => handler(nodeHoverEvt));

    // Assert Array.prototype.find was NOT called during node hover
    expect(findSpy).not.toHaveBeenCalled();

    // Simulate mouseover on Edge_100
    const edgeHoverEvt = {
      target: { id: () => 'Edge_100', addClass: vi.fn(), removeClass: vi.fn() },
      renderedPosition: { x: 100, y: 100 },
    };

    mouseoverEdgeListeners.forEach((handler) => handler(edgeHoverEvt));

    // Assert Array.prototype.find was STILL not called during edge hover
    expect(findSpy).not.toHaveBeenCalled();

    findSpy.mockRestore();
  });
});

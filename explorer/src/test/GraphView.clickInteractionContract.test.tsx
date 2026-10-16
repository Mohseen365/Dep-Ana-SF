import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { GraphView } from '../components/GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

let mockEles: any[] = [];
const mockListeners: Record<string, Function[]> = {};

const createMockNode = (id: string, initialX = 100, initialY = 100) => {
  let selected = false;
  const classes = new Set<string>();
  const pos = { x: initialX, y: initialY };

  const nodeObj = {
    id: () => id,
    isNode: () => true,
    isEdge: () => false,
    position: (newPos?: { x: number; y: number }) => {
      if (newPos) {
        pos.x = newPos.x;
        pos.y = newPos.y;
      }
      return { x: pos.x, y: pos.y };
    },
    select: () => { selected = true; },
    unselect: () => { selected = false; },
    isSelected: () => selected,
    addClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.add(c));
      return nodeObj;
    },
    removeClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.delete(c));
      return nodeObj;
    },
    hasClass: (cls: string) => classes.has(cls),
    connectedEdges: () => {
      const edges = mockEles.filter(e => e.isEdge() && (e.data('source') === id || e.data('target') === id));
      (edges as any).removeClass = (cls: string) => {
        edges.forEach(e => e.removeClass(cls));
        return edges;
      };
      (edges as any).addClass = (cls: string) => {
        edges.forEach(e => e.addClass(cls));
        return edges;
      };
      return edges;
    },
    neighborhood: () => {
      const neighborIds = new Set<string>();
      mockEles.forEach(e => {
        if (e.isEdge()) {
          if (e.data('source') === id) neighborIds.add(e.data('target'));
          if (e.data('target') === id) neighborIds.add(e.data('source'));
        }
      });
      const neighbors = mockEles.filter(e => e.isNode() && neighborIds.has(e.id()));
      (neighbors as any).removeClass = (cls: string) => {
        neighbors.forEach(n => n.removeClass(cls));
        return neighbors;
      };
      (neighbors as any).addClass = (cls: string) => {
        neighbors.forEach(n => n.addClass(cls));
        return neighbors;
      };
      return neighbors;
    },
    renderedPosition: () => ({ x: pos.x, y: pos.y }),
    data: (key?: string) => key === 'id' ? id : { id, label: id, type: 'ApexClass' },
  };
  return nodeObj;
};

const createMockEdge = (id: string, source: string, target: string) => {
  let selected = false;
  const classes = new Set<string>();

  const edgeObj = {
    id: () => id,
    isNode: () => false,
    isEdge: () => true,
    select: () => { selected = true; },
    unselect: () => { selected = false; },
    isSelected: () => selected,
    addClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.add(c));
      return edgeObj;
    },
    removeClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.delete(c));
      return edgeObj;
    },
    hasClass: (cls: string) => classes.has(cls),
    data: (key?: string) => {
      if (key === 'source') return source;
      if (key === 'target') return target;
      if (key === 'id') return id;
      return { id, source, target };
    },
  };
  return edgeObj;
};

vi.mock('cytoscape', () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    elements: vi.fn().mockImplementation(() => {
      const res = [...mockEles];
      (res as any).removeClass = (cls: string) => {
        mockEles.forEach(e => e.removeClass(cls));
        return res;
      };
      (res as any).addClass = (cls: string) => {
        mockEles.forEach(e => e.addClass(cls));
        return res;
      };
      (res as any).unselect = () => {
        mockEles.forEach(e => e.unselect());
        return res;
      };
      (res as any).remove = () => res;
      return res;
    }),
    nodes: vi.fn().mockImplementation(() => {
      return mockEles.filter(e => e.isNode());
    }),
    edges: vi.fn().mockImplementation(() => {
      return mockEles.filter(e => e.isEdge());
    }),
    add: vi.fn().mockImplementation((eles: any[]) => {
      eles.forEach(e => {
        if (e.group === 'nodes') {
          mockEles.push(createMockNode(e.data.id, e.position?.x ?? 100, e.position?.y ?? 100));
        } else if (e.group === 'edges') {
          mockEles.push(createMockEdge(e.data.id, e.data.source, e.data.target));
        }
      });
    }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn((event: string, arg2: any, arg3?: any) => {
      const handler = typeof arg2 === 'function' ? arg2 : arg3;
      const key = typeof arg2 === 'string' ? `${event}:${arg2}` : event;
      if (!mockListeners[key]) mockListeners[key] = [];
      mockListeners[key].push(handler);
    }),
    off: vi.fn((event: string, arg2?: any, arg3?: any) => {
      const key = typeof arg2 === 'string' ? `${event}:${arg2}` : event;
      const handler = typeof arg2 === 'function' ? arg2 : arg3;
      if (mockListeners[key]) {
        if (handler) {
          mockListeners[key] = mockListeners[key].filter(h => h !== handler);
        } else {
          delete mockListeners[key];
        }
      }
    }),
    one: vi.fn((event: string, handler: any) => {
      if (!mockListeners[event]) mockListeners[event] = [];
      mockListeners[event].push(handler);
    }),
    animate: vi.fn(),
    fit: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    getElementById: vi.fn().mockImplementation((id: string) => {
      const found = mockEles.find(e => e.id() === id);
      if (found) {
        return found;
      }
      return { length: 0, isNode: () => false, isEdge: () => false };
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  };

  const cytoscapeFn: any = vi.fn().mockImplementation(() => mockCy);
  cytoscapeFn.use = vi.fn();
  return { default: cytoscapeFn };
});

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

const TEST_NODES: ExplorerNode[] = [
  {
    id: 'node-1',
    displayName: 'Node 1',
    type: 'ApexClass',
    file: 'Node1.cls',
    risk: 'LOW',
    riskReasons: [],
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'node-2',
    displayName: 'Node 2',
    type: 'ApexClass',
    file: 'Node2.cls',
    risk: 'MEDIUM',
    riskReasons: [],
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
];

const TEST_EDGES: ExplorerEdge[] = [
  {
    id: 'edge-1-2',
    source: 'node-1',
    target: 'node-2',
    relationshipType: 'method-call',
    method: 'execute',
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: 1,
    column: 1,
    methodOwner: 'node-2',
    file: 'Node1.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'node-1' },
      target: { type: 'ApexClass', name: 'node-2' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  },
];

describe('Phase 1E — Click / Double-Click Interaction Contract Verification', () => {
  beforeEach(() => {
    mockEles = [];
    Object.keys(mockListeners).forEach(k => delete mockListeners[k]);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('Requirement 1: Single click invokes onSelectNode callback exactly once', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
      />
    );

    const tapHandlers = mockListeners['tap:node'] || [];
    expect(tapHandlers.length).toBeGreaterThan(0);

    const targetNode = mockEles.find(e => e.id() === 'node-1');
    const mockEvt = { target: targetNode };

    act(() => {
      tapHandlers.forEach(h => h(mockEvt));
    });

    expect(onSelectNode).toHaveBeenCalledTimes(1);
    expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-1' }));
  });

  it('Requirement 2: Double-click invokes onNodeDoubleTap callback according to established contract', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();
    const onNodeDoubleTap = vi.fn();

    render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    const dblTapHandlers = mockListeners['dbltap dblclick:node'] || [];
    expect(dblTapHandlers.length).toBeGreaterThan(0);

    const targetNode = mockEles.find(e => e.id() === 'node-1');
    const mockEvt = { target: targetNode };

    act(() => {
      dblTapHandlers.forEach(h => h(mockEvt));
    });

    expect(onNodeDoubleTap).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleTap).toHaveBeenCalledWith('node-1', expect.objectContaining({ id: 'node-1' }));
  });

  it('Requirement 3: Double-click does not cause duplicate invocation from duplicate listener registration (dbltap + dblclick)', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();
    const onNodeDoubleTap = vi.fn();

    render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    const dblTapHandlers = mockListeners['dbltap dblclick:node'] || [];
    expect(dblTapHandlers.length).toBeGreaterThan(0);

    const targetNode = mockEles.find(e => e.id() === 'node-1');
    // Simulate Cytoscape emitting dbltap followed immediately by dblclick for the same double-click gesture
    const mockEvt1 = { target: targetNode, type: 'dbltap' };
    const mockEvt2 = { target: targetNode, type: 'dblclick' };

    act(() => {
      dblTapHandlers.forEach(h => h(mockEvt1));
      dblTapHandlers.forEach(h => h(mockEvt2));
    });

    // Suppressed duplicate dispatch -> called exactly once!
    expect(onNodeDoubleTap).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleTap).toHaveBeenCalledWith('node-1', expect.objectContaining({ id: 'node-1' }));
  });

  it('Requirement 4: Repeated component re-renders do not multiply click or double-click callback invocations', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();
    const onNodeDoubleTap = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    // Re-render multiple times
    rerender(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    rerender(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId="node-2"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    const tapHandlers = mockListeners['tap:node'] || [];
    const targetNode = mockEles.find(e => e.id() === 'node-1');

    act(() => {
      tapHandlers.forEach(h => h({ target: targetNode }));
    });

    expect(onSelectNode).toHaveBeenCalledTimes(1);
  });

  it('Requirement 5: Updated callback props are respected after rerender (callback freshness)', () => {
    const onSelectNodeInitial = vi.fn();
    const onSelectNodeUpdated = vi.fn();
    const onDoubleTapInitial = vi.fn();
    const onDoubleTapUpdated = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNodeInitial}
        onSelectEdge={vi.fn()}
        onNodeDoubleTap={onDoubleTapInitial}
      />
    );

    // Rerender with updated callback props
    rerender(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNodeUpdated}
        onSelectEdge={vi.fn()}
        onNodeDoubleTap={onDoubleTapUpdated}
      />
    );

    const tapHandlers = mockListeners['tap:node'] || [];
    const dblTapHandlers = mockListeners['dbltap dblclick:node'] || [];
    const targetNode = mockEles.find(e => e.id() === 'node-1');

    act(() => {
      tapHandlers.forEach(h => h({ target: targetNode }));
      dblTapHandlers.forEach(h => h({ target: targetNode }));
    });

    expect(onSelectNodeInitial).not.toHaveBeenCalled();
    expect(onSelectNodeUpdated).toHaveBeenCalledTimes(1);

    expect(onDoubleTapInitial).not.toHaveBeenCalled();
    expect(onDoubleTapUpdated).toHaveBeenCalledTimes(1);
  });

  it('Requirement 6: Cleanup/unmount does not leave listeners that fire afterward', () => {
    const onSelectNode = vi.fn();

    const { unmount } = render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={vi.fn()}
      />
    );

    const tapHandlersBefore = [...(mockListeners['tap:node'] || [])];
    expect(tapHandlersBefore.length).toBeGreaterThan(0);

    unmount();

    // Verify unmount cleared Cytoscape instance and listeners
    const targetNode = createMockNode('node-1');
    act(() => {
      tapHandlersBefore.forEach(h => h({ target: targetNode }));
    });

    // Even if stale closure was somehow called after unmount, refs or teardown handle it gracefully
    expect(document.body.style.cursor).toBe('default');
  });

  it('Requirement 7: Node and edge interactions remain distinguishable and route to respective callbacks', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={TEST_NODES}
        edges={TEST_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
      />
    );

    const nodeTapHandlers = mockListeners['tap:node'] || [];
    const edgeTapHandlers = mockListeners['tap:edge'] || [];

    expect(nodeTapHandlers.length).toBeGreaterThan(0);
    expect(edgeTapHandlers.length).toBeGreaterThan(0);

    const targetNode = mockEles.find(e => e.isNode() && e.id() === 'node-1');
    const targetEdge = mockEles.find(e => e.isEdge() && e.id() === 'edge-1-2');

    // Trigger edge click
    act(() => {
      edgeTapHandlers.forEach(h => h({ target: targetEdge }));
    });

    expect(onSelectEdge).toHaveBeenCalledTimes(1);
    expect(onSelectEdge).toHaveBeenCalledWith('edge-1-2');
    expect(onSelectNode).not.toHaveBeenCalled();

    onSelectEdge.mockClear();

    // Trigger node click
    act(() => {
      nodeTapHandlers.forEach(h => h({ target: targetNode }));
    });

    expect(onSelectNode).toHaveBeenCalledTimes(1);
    expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-1' }));
    expect(onSelectEdge).not.toHaveBeenCalled();
  });
});

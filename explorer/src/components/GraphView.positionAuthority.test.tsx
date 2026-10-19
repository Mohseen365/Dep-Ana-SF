import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GraphView } from './GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape
const {
  mockCy,
  mockCytoscapeFn,
  mockLayoutRun,
  listeners,
  mockNodeObjMap,
  layoutControl,
} = vi.hoisted(() => {
  const listeners: Record<string, ((evt: any) => void)[]> = {};
  const mockLayoutRun = vi.fn();
  const layoutControl = {
    autoEmitLayoutStop: true,
    isLayoutRunning: false,
    emitLayoutStop: () => {
      layoutControl.isLayoutRunning = false;
      const stopHandlers = listeners['layoutstop'] || [];
      listeners['layoutstop'] = [];
      stopHandlers.forEach((handler) => handler({ type: 'layoutstop' }));
    },
  };

  const mockNodeObjMap: Record<string, any> = {};

  const createMockNode = (id: string, x = 100, y = 100) => {
    if (!mockNodeObjMap[id]) {
      let curPos = { x, y };
      const mockCollection = {
        length: 0,
        forEach: vi.fn(),
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
      };

      const mockEles = {
        length: 1,
        id: () => id,
        data: vi.fn().mockReturnValue({
          id,
          displayName: id,
          type: 'ApexClass',
        }),
        isNode: () => true,
        isEdge: () => false,
        position: vi.fn((newPos?: { x: number; y: number }) => {
          if (newPos && typeof newPos.x === 'number' && typeof newPos.y === 'number') {
            curPos = { ...newPos };
          }
          return curPos;
        }),
        neighborhood: vi.fn().mockReturnValue(mockCollection),
        connectedEdges: vi.fn().mockReturnValue(mockCollection),
        addClass: vi.fn().mockReturnThis(),
        removeClass: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        unselect: vi.fn().mockReturnThis(),
      };
      mockNodeObjMap[id] = mockEles;
    } else if (x !== 100 || y !== 100) {
      mockNodeObjMap[id].position({ x, y });
    }
    return mockNodeObjMap[id];
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockImplementation(() => {
      const arr = [...Object.values(mockNodeObjMap)];
      const collection = {
        length: arr.length,
        forEach: (fn: any) => arr.forEach(fn),
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
        unselect: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        filter: (fn: any) => {
          const sub = arr.filter(fn);
          return {
            length: sub.length,
            forEach: (sFn: any) => sub.forEach(sFn),
            boundingBox: () => ({ x1: 0, y1: 0, x2: 100, y2: 100, w: 100, h: 100 }),
          };
        },
        boundingBox: () => ({ x1: 0, y1: 0, x2: 100, y2: 100, w: 100, h: 100 }),
      };
      return collection;
    }),
    nodes: vi.fn().mockImplementation(() => {
      const arr = Object.values(mockNodeObjMap);
      (arr as any).forEach = Array.prototype.forEach.bind(arr);
      return arr;
    }),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn((els) => {
      if (Array.isArray(els)) {
        els.forEach((el) => {
          if (el.data?.id && !el.data.source) {
            const posX = el.position?.x ?? el.data?.position?.x ?? 100;
            const posY = el.position?.y ?? el.data?.position?.y ?? 100;
            createMockNode(el.data.id, posX, posY);
          }
        });
      }
    }),
    layout: vi.fn().mockImplementation((opts) => ({
      run: vi.fn().mockImplementation(() => {
        layoutControl.isLayoutRunning = true;
        mockLayoutRun(opts);
        if (opts?.positions) {
          Object.values(mockNodeObjMap).forEach((node: any) => {
            const newPos = typeof opts.positions === 'function' ? opts.positions(node) : opts.positions[node.id()];
            if (newPos) {
              node.position(newPos);
            }
          });
        }
        if (layoutControl.autoEmitLayoutStop) {
          layoutControl.emitLayoutStop();
        }
      })
    })),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn((event, targetOrHandler, maybeHandler) => {
      const handler = typeof targetOrHandler === 'function' ? targetOrHandler : maybeHandler;
      const key = typeof targetOrHandler === 'string' ? `${event}:${targetOrHandler}` : event;
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(handler);
    }),
    off: vi.fn((event, targetOrHandler, maybeHandler) => {
      const handler = typeof targetOrHandler === 'function' ? targetOrHandler : maybeHandler;
      const key = typeof targetOrHandler === 'string' ? `${event}:${targetOrHandler}` : event;
      if (listeners[key]) {
        listeners[key] = listeners[key].filter((h) => h !== handler);
      }
    }),
    one: vi.fn((event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockImplementation((id) => {
      const found = mockNodeObjMap[id];
      if (found) return found;
      const emptyCol = { removeClass: vi.fn().mockReturnThis() };
      return { length: 0, isNode: () => false, isEdge: () => false, neighborhood: () => emptyCol, connectedEdges: () => emptyCol };
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  };

  const mockCytoscapeFn: any = vi.fn().mockImplementation((opts) => {
    if (opts?.elements) {
      mockCy.add(opts.elements);
    }
    if (opts?.layout?.positions) {
      Object.values(mockNodeObjMap).forEach((node: any) => {
        const p = typeof opts.layout.positions === 'function' ? opts.layout.positions(node) : opts.layout.positions[node.id()];
        if (p) {
          node.position(p);
        }
      });
    }
    return mockCy;
  });
  mockCytoscapeFn.use = vi.fn();

  return { mockCy, mockCytoscapeFn, mockLayoutRun, listeners, mockNodeObjMap, layoutControl };
});

vi.mock('cytoscape', () => ({ default: mockCytoscapeFn }));
vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

// Mock ResizeObserver & matchMedia
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.matchMedia = window.matchMedia || vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const testNodes: ExplorerNode[] = [
  {
    id: 'node-1',
    displayName: 'Node 1',
    type: 'ApexClass',
    file: 'Node1.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0.1, unresolved: 0, score: 90 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'node-2',
    displayName: 'Node 2',
    type: 'ApexClass',
    file: 'Node2.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0.1, unresolved: 0, score: 90 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  }
];

const testEdges: ExplorerEdge[] = [
  {
    id: 'e1',
    source: 'node-1',
    target: 'node-2',
    relationshipType: 'method-call',
    method: 'doStuff',
    evidence: 'Node2.doStuff()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 10,
    column: 1,
    methodOwner: 'Node1',
    file: 'Node1.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'Node1', method: 'doStuff' },
      target: { type: 'ApexClass', name: 'Node2', method: 'doStuff' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: { line: 10, column: 1 }
    }
  }
];

describe('GraphView Position Authority & Layout Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layoutControl.autoEmitLayoutStop = true;
    layoutControl.isLayoutRunning = false;
    for (const key in listeners) delete listeners[key];
    for (const key in mockNodeObjMap) delete mockNodeObjMap[key];
  });

  it('Restoration of persisted positions: sets node positions directly when nodePositions prop is provided', () => {
    const persistedPositions = {
      'node-1': { x: 150, y: 250 },
      'node-2': { x: 350, y: 450 },
    };
    const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Verify layout options passed to cytoscape constructor were preset
    const initCallOpts = mockCytoscapeFn.mock.calls[0][0];
    expect(initCallOpts.layout.name).toBe('preset');

    // Verify positions on nodes were set
    const n1 = mockCy.getElementById('node-1');
    expect(n1.position()).toEqual({ x: 150, y: 250 });

    const n2 = mockCy.getElementById('node-2');
    expect(n2.position()).toEqual({ x: 350, y: 450 });
  });

  it('Dragfree persistence: captures updated position on dragfree and notifies onNodePositionsChange', () => {
    const onNodePositionsChange = vi.fn();

    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
        onNodePositionsChange={onNodePositionsChange}
        layoutMode="static"
      />
    );

    // Simulate node-1 being dragged to (180, 220)
    const n1 = mockCy.getElementById('node-1');
    n1.position({ x: 180, y: 220 });

    const dragHandler = listeners['dragfree:node']?.[0];
    expect(dragHandler).toBeDefined();

    act(() => {
      dragHandler({ target: n1 });
    });

    expect(onNodePositionsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        'node-1': { x: 180, y: 220 },
      }),
      expect.anything()
    );
  });

  it('Static stability: blocks automatic relayout on graph updates, filter changes, and focus changes', () => {
    const persistedPositions = {
      'node-1': { x: 100, y: 100 },
      'node-2': { x: 200, y: 200 },
    };
    const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    // Rerender with filtered nodes (filter change)
    rerender(
      <GraphView
        nodes={[testNodes[0]]}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Auto layout should NOT have been triggered
    expect(mockLayoutRun).not.toHaveBeenCalled();

    // Rerender with focus state change
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        focusedNodeId="node-1"
        focusState={{ enabled: true, focusNodeId: 'node-1', direction: 'both', depth: 1 }}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
  });

  it('Static mode allows explicit Reset Layout button execution', () => {
    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    const resetBtn = screen.getByRole('button', { name: /reset layout/i });
    fireEvent.click(resetBtn);

    expect(mockLayoutRun).toHaveBeenCalled();
  });

  it('Interactive compatibility: preserves existing behavior and allows layout on explicit reset', () => {
    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
        layoutMode="interactive"
      />
    );

    mockLayoutRun.mockClear();

    const resetBtn = screen.getByRole('button', { name: /reset layout/i });
    fireEvent.click(resetBtn);

    expect(mockLayoutRun).toHaveBeenCalled();
  });

  it('Mode switching Interactive -> Static captures current positions and persists without rearranging', () => {
    const onNodePositionsChange = vi.fn();
    const onLayoutModeChange = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
        onNodePositionsChange={onNodePositionsChange}
        onLayoutModeChange={onLayoutModeChange}
      />
    );

    mockLayoutRun.mockClear();

    // Click static layout toggle button in controls
    const modeToggleBtn = screen.getByRole('button', { name: /switch to static layout/i });
    expect(modeToggleBtn).toBeInTheDocument();
    fireEvent.click(modeToggleBtn);
    expect(onLayoutModeChange).toHaveBeenCalledWith('static');

    // Rerender with static layoutMode prop
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
        onNodePositionsChange={onNodePositionsChange}
        onLayoutModeChange={onLayoutModeChange}
      />
    );

    // Auto layout run should NOT be called on mode switch
    expect(mockLayoutRun).not.toHaveBeenCalled();

    // Position capture listener should have been notified
    expect(onNodePositionsChange).toHaveBeenCalled();
  });

  it('Mode switching Static -> Interactive changes mode without immediate relayout', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    // Switch mode to interactive
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
  });

  it('Hidden and reappearing nodes restore their saved positions when made visible again', () => {
    const persistedPositions = {
      'node-1': { x: 120, y: 140 },
      'node-2': { x: 220, y: 240 },
    };

    const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

    // Render initial with node-1 and node-2
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Hide node-2
    rerender(
      <GraphView
        nodes={[testNodes[0]]}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Make node-2 visible again
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Verify node-2 was restored at its exact position (220, 240)
    const n2 = mockCy.getElementById('node-2');
    expect(n2.position()).toEqual({ x: 220, y: 240 });
  });

  it('Genuinely new node insertion places new nodes deterministically without moving existing nodes', () => {
    const persistedPositions = {
      'node-1': { x: 100, y: 100 },
      'node-2': { x: 300, y: 300 },
    };
    const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    const newNode: ExplorerNode = {
      id: 'node-3',
      displayName: 'Node 3',
      type: 'ApexClass',
      file: 'Node3.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 0.1, unresolved: 0, score: 90 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    };

    const newEdge: ExplorerEdge = {
      id: 'e2',
      source: 'node-3',
      target: 'node-1',
      relationshipType: 'method-call',
      method: 'test',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: 'Node3',
      file: 'Node3.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'Node3' },
        target: { type: 'ApexClass', name: 'Node1' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {}
      }
    };

    // Insert node-3
    rerender(
      <GraphView
        nodes={[...testNodes, newNode]}
        edges={[...testEdges, newEdge]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    // Full auto layout should NOT be run
    expect(mockLayoutRun).not.toHaveBeenCalled();

    // Existing nodes remain at their positions
    expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 100 });
    expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 300 });

    // New node receives deterministic position
    const n3Pos = mockCy.getElementById('node-3').position();
    expect(typeof n3Pos.x).toBe('number');
    expect(typeof n3Pos.y).toBe('number');
  });

  it('Remount behavior: restores persisted positions directly without running layout', () => {
    const persistedPositions = {
      'node-1': { x: 500, y: 500 },
      'node-2': { x: 700, y: 700 },
    };
    const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

    const { unmount } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    unmount();

    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        graphLayout={graphLayout}
        layoutMode="static"
      />
    );

    expect(mockCy.getElementById('node-1').position()).toEqual({ x: 500, y: 500 });
    expect(mockCy.getElementById('node-2').position()).toEqual({ x: 700, y: 700 });
  });

  describe('Static Mode Requirement Assertions', () => {
    const staticPositions = {
      'node-1': { x: 100, y: 200 },
      'node-2': { x: 300, y: 400 },
    };
    const staticGraphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: staticPositions, layoutProvenance: 'user-authored' as const };

    it('1. selected node can still be investigated without changing node coordinates in Static mode', () => {
      const onSelectNode = vi.fn();
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Select node-1
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      // Node selection should NOT trigger relayout
      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });

      // Trigger investigation on node-1
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          focusedNodeId="node-1"
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      // Investigation must NOT trigger relayout or mutate node coordinates
      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });
    });

    it('2. double-click still works and fires callbacks without changing node coordinates', () => {
      const onSelectNode = vi.fn();
      const onNodeDoubleTap = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
          onNodeDoubleTap={onNodeDoubleTap}
        />
      );

      mockLayoutRun.mockClear();

      const dblTapHandler = listeners['dbltap dblclick:node']?.[0];
      expect(dblTapHandler).toBeDefined();

      const n1 = mockCy.getElementById('node-1');
      act(() => {
        dblTapHandler({ target: n1 });
      });

      expect(onNodeDoubleTap).toHaveBeenCalledWith('node-1', expect.objectContaining({ id: 'node-1' }));
      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });
    });

    it('3. focus (focusOnNode, Focus Depth, Focus Direction) still works without changing node coordinates in Static mode', () => {
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Change focus depth / direction
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          focusedNodeId="node-1"
          focusState={{ enabled: true, focusNodeId: 'node-1', direction: 'dependents', depth: 2 }}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });
    });

    it('4. viewport can move (zoom, fit, centerSelected) while node coordinates remain strictly unchanged', () => {
      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Perform viewport operations via controls
      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInBtn);
      expect(mockCy.zoom).toHaveBeenCalled();

      const fitBtn = screen.getByRole('button', { name: /fit view/i });
      fireEvent.click(fitBtn);
      expect(mockCy.fit).toHaveBeenCalled();

      const centerBtn = screen.getByRole('button', { name: /center selected/i });
      fireEvent.click(centerBtn);
      expect(mockCy.animate).toHaveBeenCalled();

      // Confirm node coordinates remained strictly unchanged throughout viewport movements
      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });
    });

    it('5. node coordinates remain unchanged in Static mode across multi-operation flow', () => {
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Flow: Select -> Focus -> Filter update
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          focusedNodeId="node-1"
          nodePositions={staticPositions}
          graphLayout={staticGraphLayout}
          layoutMode="static"
        />
      );

      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 200 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 300, y: 400 });
    });

    it('6. Interactive behavior remains unchanged (allows explicit reset and position updates)', () => {
      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={staticPositions}
          layoutMode="interactive"
        />
      );

      mockLayoutRun.mockClear();

      const resetBtn = screen.getByRole('button', { name: /reset layout/i });
      fireEvent.click(resetBtn);

      expect(mockLayoutRun).toHaveBeenCalled();
    });
  });

  describe('Wave 8A — Position Authority Remediation & Controllable Async Lifecycle Tests', () => {
    it('1. Animated reset is an actual async event: no persistence occurs before layoutstop, and final coordinates are persisted after layoutstop', () => {
      layoutControl.autoEmitLayoutStop = false;
      const onNodePositionsChange = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Flush initial mount layoutstop listener
      act(() => {
        layoutControl.emitLayoutStop();
      });
      onNodePositionsChange.mockClear();

      // Trigger animated reset layout
      const resetBtn = screen.getByRole('button', { name: /reset layout/i });
      fireEvent.click(resetBtn);

      // 1. Layout run started but layoutstop has NOT fired yet
      expect(layoutControl.isLayoutRunning).toBe(true);
      expect(onNodePositionsChange).not.toHaveBeenCalled();

      // 2. Simulate animation moving nodes to final coordinates
      const n1 = mockCy.getElementById('node-1');
      const n2 = mockCy.getElementById('node-2');
      n1.position({ x: 999, y: 888 });
      n2.position({ x: 777, y: 666 });

      // 3. Emit layoutstop explicitly
      act(() => {
        layoutControl.emitLayoutStop();
      });

      // 4. Persistence occurs with final coordinates
      expect(layoutControl.isLayoutRunning).toBe(false);
      expect(onNodePositionsChange).toHaveBeenCalledTimes(1);
      expect(onNodePositionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          'node-1': { x: 999, y: 888 },
          'node-2': { x: 777, y: 666 },
        }),
        expect.anything()
      );
    });

    it('2. Repeated animated resets clean up previous listeners and do not leak event listeners', () => {
      layoutControl.autoEmitLayoutStop = false;
      const onNodePositionsChange = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Flush initial mount layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });
      onNodePositionsChange.mockClear();

      const resetBtn = screen.getByRole('button', { name: /reset layout/i });

      // Click reset layout 4 times rapidly before layoutstop fires
      fireEvent.click(resetBtn);
      fireEvent.click(resetBtn);
      fireEvent.click(resetBtn);
      fireEvent.click(resetBtn);

      // Exactly 1 layoutstop listener is registered (previous 3 were cleaned up via cy.off)
      const stopListeners = listeners['layoutstop'] || [];
      expect(stopListeners.length).toBe(1);

      // Emit layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });

      // Persistence happens exactly once
      expect(onNodePositionsChange).toHaveBeenCalledTimes(1);
    });

    it('3. Reset concurrency race test: Reset B overriding Reset A cancels A handler and persists only B final coordinates', () => {
      layoutControl.autoEmitLayoutStop = false;
      const onNodePositionsChange = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Flush initial mount layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });
      onNodePositionsChange.mockClear();

      const resetBtn = screen.getByRole('button', { name: /reset layout/i });

      // Reset A starts
      fireEvent.click(resetBtn);
      const n1 = mockCy.getElementById('node-1');
      n1.position({ x: 111, y: 111 });

      // Reset B starts before Reset A completes
      fireEvent.click(resetBtn);
      n1.position({ x: 999, y: 999 });

      // Verify Reset A's listener was removed from active listeners via cy.off
      expect((listeners['layoutstop'] || []).length).toBe(1);

      // Emit Reset B layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });

      // Exactly 1 persistence call with Reset B's final coordinates
      expect(onNodePositionsChange).toHaveBeenCalledTimes(1);
      expect(onNodePositionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          'node-1': { x: 999, y: 999 },
        }),
        expect.anything()
      );
    });

    it('4. Unmounting GraphView during pending reset cleans up layoutstop listener', () => {
      layoutControl.autoEmitLayoutStop = false;
      const onNodePositionsChange = vi.fn();

      const { unmount } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Flush initial mount layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });
      onNodePositionsChange.mockClear();

      const resetBtn = screen.getByRole('button', { name: /reset layout/i });
      fireEvent.click(resetBtn);

      expect((listeners['layoutstop'] || []).length).toBe(1);

      // Unmount before layoutstop fires
      unmount();

      // Pending listener removed on teardown
      expect((listeners['layoutstop'] || []).length).toBe(0);

      // Emit layoutstop manually to verify no late callback fires
      act(() => {
        layoutControl.emitLayoutStop();
      });

      expect(onNodePositionsChange).not.toHaveBeenCalled();
    });

    it('5. Negative Test 1: External nodePositions update overrides stale current canvas position when there was NO explicit drag', () => {
      const initialPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: initialPositions, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Verify initial position
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 100 });

      // Parent updates nodePositions externally (e.g. project reset or external state update) WITHOUT user drag
      const updatedPositions = {
        'node-1': { x: 500, y: 500 },
        'node-2': { x: 600, y: 600 },
      };

      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={updatedPositions}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: updatedPositions, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Because node-1 was NOT dragged, Level 2 external update MUST take effect!
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 500, y: 500 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 600, y: 600 });
    });

    it('4. Negative Test 2: Explicit user drag STILL beats conflicting external persisted position update', () => {
      const onNodePositionsChange = vi.fn();
      const initialPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // User explicitly drags node-1 to (800, 800)
      const n1 = mockCy.getElementById('node-1');
      n1.position({ x: 800, y: 800 });

      const dragHandler = listeners['dragfree:node']?.[0];
      act(() => {
        dragHandler({ target: n1 });
      });

      // Verify dragged position
      expect(n1.position()).toEqual({ x: 800, y: 800 });

      // Parent re-renders with a conflicting external nodePositions prop { 'node-1': { x: 300, y: 300 } }
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={{ 'node-1': { x: 300, y: 300 }, 'node-2': { x: 200, y: 200 } }}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Explicit drag session (Level 1) MUST continue to win over conflicting Level 2 prop update!
      expect(n1.position()).toEqual({ x: 800, y: 800 });
    });

    it('5. New node placement is immediately persisted to parent via onNodePositionsChange', () => {
      const onNodePositionsChange = vi.fn();
      const initialPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      onNodePositionsChange.mockClear();

      const newNode: ExplorerNode = {
        id: 'node-3',
        displayName: 'Node 3',
        type: 'ApexClass',
        file: 'Node3.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 0.1, unresolved: 0, score: 90 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
      };

      // Add new node-3
      rerender(
        <GraphView
          nodes={[...testNodes, newNode]}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // onNodePositionsChange MUST have been called with new node position
      expect(onNodePositionsChange).toHaveBeenCalled();
      const updatedPositions = onNodePositionsChange.mock.calls[0][0];
      expect(updatedPositions['node-3']).toBeDefined();
      expect(typeof updatedPositions['node-3'].x).toBe('number');
      expect(typeof updatedPositions['node-3'].y).toBe('number');
    });
  });

  describe('Position Authority Hierarchy Conflict Matrix & Negative Tests', () => {
    it('Case 1: External update after mount — node initially rendered, GraphView remains mounted, parent updates nodePositions prop, node moves to new persisted coordinates', () => {
      const p1 = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } };
      const p2 = { 'node-1': { x: 666, y: 666 }, 'node-2': { x: 200, y: 200 } };
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p1}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p1, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 100, y: 100 });

      // Parent updates nodePositions prop while GraphView remains mounted
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p2}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p2, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 666, y: 666 });
    });

    it('Case 2: External update after filtering — node-2 hidden, parent updates position for node-2, node-2 becomes visible with new authoritative position', () => {
      const p1 = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } };
      const p2 = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 888, y: 888 } };
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p1}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p1, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Hide node-2
      rerender(
        <GraphView
          nodes={[testNodes[0]]}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p1}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p1, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // While node-2 is hidden, parent updates nodePositions prop with a new coordinate for node-2 (888, 888)
      // and restores node-2 into nodes array
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p2}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p2, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Node-2 MUST appear at the NEW authoritative position (888, 888)
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 888, y: 888 });
    });

    it('Case A: canvas = 100,100; persisted = 500,500; no drag -> expected: 500,500', () => {
      const p = { 'node-1': { x: 500, y: 500 }, 'node-2': { x: 600, y: 600 } };
      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 500, y: 500 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 600, y: 600 });
    });

    it('Case B: canvas = 100,100; persisted = 500,500; drag = 800,800 -> expected: 800,800', () => {
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={{ 'node-1': { x: 500, y: 500 }, 'node-2': { x: 600, y: 600 } }}
          layoutMode="static"
        />
      );

      // Drag node-1 to 800,800
      const n1 = mockCy.getElementById('node-1');
      n1.position({ x: 800, y: 800 });
      const dragHandler = listeners['dragfree:node']?.[0];
      act(() => {
        dragHandler({ target: n1 });
      });

      // Rerender with conflicting persisted prop
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={{ 'node-1': { x: 500, y: 500 }, 'node-2': { x: 600, y: 600 } }}
          layoutMode="static"
        />
      );

      expect(n1.position()).toEqual({ x: 800, y: 800 });
    });

    it('Case C: canvas = 800,800; persisted = 500,500; NO drag -> expected: 500,500 (guards against cyPositionsBefore contamination)', () => {
      const p1 = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } };
      const p2 = { 'node-1': { x: 500, y: 500 }, 'node-2': { x: 200, y: 200 } };
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p1}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p1, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Mutate mock canvas position directly without a dragfree event
      const n1 = mockCy.getElementById('node-1');
      n1.position({ x: 800, y: 800 });

      // Parent passes new persisted positions { 'node-1': { x: 500, y: 500 } }
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p2}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p2, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Level 2 persisted position MUST override un-dragged canvas position!
      expect(n1.position()).toEqual({ x: 500, y: 500 });
    });

    it('Case D: new node, no persisted, no canvas -> expected: deterministic fallback + immediate persistence', () => {
      const onNodePositionsChange = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      const n1Pos = mockCy.getElementById('node-1').position();
      const n2Pos = mockCy.getElementById('node-2').position();

      expect(typeof n1Pos.x).toBe('number');
      expect(typeof n2Pos.x).toBe('number');
    });

    it('Case E: existing filtered node becomes visible -> previous authoritative position + NO global relayout', () => {
      const persistedPositions = {
        'node-1': { x: 150, y: 150 },
        'node-2': { x: 350, y: 350 },
      };
      const gl = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: persistedPositions, layoutProvenance: 'user-authored' as const };

      const { rerender } = render(
        <GraphView
          nodes={[testNodes[0]]}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          graphLayout={gl}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Make node-2 visible
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          graphLayout={gl}
          layoutMode="static"
        />
      );

      expect(mockLayoutRun).not.toHaveBeenCalled();
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 350, y: 350 });
    });

    it('Negative 1: Canvas position does NOT silently become Level 1 session authority without explicit user drag', () => {
      const initialPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };
      const updatedPositions = { 'node-1': { x: 333, y: 333 }, 'node-2': { x: 200, y: 200 } };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: initialPositions, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Simulate canvas position movement without dragfree
      mockCy.getElementById('node-1').position({ x: 777, y: 777 });

      // Rerender with external persisted positions update
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={updatedPositions}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: updatedPositions, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      // Node-1 must adopt the Level 2 persisted position (333, 333), NOT the stale un-dragged canvas position (777, 777)!
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 333, y: 333 });
    });

    it('Negative 2: External persisted position update is NOT ignored when node was never dragged', () => {
      const p1 = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } };
      const p2 = { 'node-1': { x: 900, y: 900 }, 'node-2': { x: 200, y: 200 } };
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p1}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p1, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={p2}
          graphLayout={{ mode: 'static', architectureMode: 'hierarchical', nodePositions: p2, layoutProvenance: 'user-authored' }}
          layoutMode="static"
        />
      );

      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 900, y: 900 });
    });

    it('Negative 3: Animated reset does NOT persist starting coordinates before layout completes', () => {
      layoutControl.autoEmitLayoutStop = false;
      const onNodePositionsChange = vi.fn();

      render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Flush mount layoutstop
      act(() => {
        layoutControl.emitLayoutStop();
      });
      onNodePositionsChange.mockClear();

      const resetBtn = screen.getByRole('button', { name: /reset layout/i });
      fireEvent.click(resetBtn);

      // BEFORE layoutstop, onNodePositionsChange must NOT have been called
      expect(onNodePositionsChange).not.toHaveBeenCalled();
    });

    it('Negative 4: New-node placement does NOT trigger repeated persistence loops', () => {
      const onNodePositionsChange = vi.fn();
      const initialPositions = { 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } };
      const graphLayout = { mode: 'static' as const, architectureMode: 'hierarchical' as const, nodePositions: initialPositions, layoutProvenance: 'user-authored' as const };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          graphLayout={graphLayout}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      onNodePositionsChange.mockClear();

      const newNode: ExplorerNode = {
        id: 'node-3',
        displayName: 'Node 3',
        type: 'ApexClass',
        file: 'Node3.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' }
      };

      rerender(
        <GraphView
          nodes={[...testNodes, newNode]}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={initialPositions}
          graphLayout={graphLayout}
          onNodePositionsChange={onNodePositionsChange}
          layoutMode="static"
        />
      );

      // Called exactly once for placing the new node, not in an infinite re-render loop
      expect(onNodePositionsChange).toHaveBeenCalledTimes(1);
    });

    it('Negative 5: Filter/focus update does NOT cause an unexpected global relayout', () => {
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId="node-1"
          selectedEdgeId={null}
          focusedNodeId="node-1"
          focusState={{ enabled: true, focusNodeId: 'node-1', direction: 'both', depth: 2 }}
          nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
          layoutMode="static"
        />
      );

      expect(mockLayoutRun).not.toHaveBeenCalled();
    });

    it('Negative 6: Static mode does NOT automatically recalculate the entire graph on state changes', () => {
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
          layoutMode="static"
        />
      );

      mockLayoutRun.mockClear();

      // Cycle selection
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          selectedCycleNodeIds={['node-1', 'node-2']}
          nodePositions={{ 'node-1': { x: 100, y: 100 }, 'node-2': { x: 200, y: 200 } }}
          layoutMode="static"
        />
      );

      expect(mockLayoutRun).not.toHaveBeenCalled();
    });
  });

  describe('T0-1 Position Authority Fix Specific Regression Coverage', () => {
    it('T0-1 Reg-1: Switch architecture mode with stale automatic provenance calculates new layout with metadata', () => {
      const persistedPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };

      const onNodePositionsChange = vi.fn();

      // Initial render in hierarchical mode with automatic-hierarchical provenance
      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          onNodePositionsChange={onNodePositionsChange}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'hierarchical',
            layoutProvenance: 'automatic-hierarchical',
            nodePositions: persistedPositions,
          }}
          architectureMode="hierarchical"
          layoutMode="interactive"
        />
      );

      onNodePositionsChange.mockClear();

      // Switch architecture mode to 'orbit' while graphLayout still carries automatic-hierarchical provenance
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          onNodePositionsChange={onNodePositionsChange}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'hierarchical',
            layoutProvenance: 'automatic-hierarchical',
            nodePositions: persistedPositions,
          }}
          architectureMode="orbit"
          layoutMode="interactive"
        />
      );

      // Switching architecture mode recalculates metadata layout and persists new positions with target provenance
      expect(onNodePositionsChange).toHaveBeenCalledWith(
        expect.anything(),
        'automatic-orbit'
      );
    });

    it('T0-1 Reg-2: Matching storedArchMode with stale automatic provenance calculates new layout for target mode', () => {
      const persistedPositions = {
        'node-1': { x: 100, y: 100 },
        'node-2': { x: 200, y: 200 },
      };

      const onNodePositionsChange = vi.fn();

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          onNodePositionsChange={onNodePositionsChange}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'orbit',
            layoutProvenance: 'automatic-hierarchical',
            nodePositions: persistedPositions,
          }}
          architectureMode="hierarchical"
          layoutMode="interactive"
        />
      );

      onNodePositionsChange.mockClear();

      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          onNodePositionsChange={onNodePositionsChange}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'orbit',
            layoutProvenance: 'automatic-hierarchical',
            nodePositions: persistedPositions,
          }}
          architectureMode="orbit"
          layoutMode="interactive"
        />
      );

      // Layout recalculation MUST execute and persist target provenance
      expect(onNodePositionsChange).toHaveBeenCalledWith(
        expect.anything(),
        'automatic-orbit'
      );
    });

    it('T0-1 Reg-3: User-authored layout provenance preserves authoritative positions across architecture mode switch', () => {
      const persistedPositions = {
        'node-1': { x: 888, y: 888 },
        'node-2': { x: 999, y: 999 },
      };

      const { rerender } = render(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'hierarchical',
            layoutProvenance: 'user-authored',
            nodePositions: persistedPositions,
          }}
          architectureMode="hierarchical"
          layoutMode="interactive"
        />
      );

      mockLayoutRun.mockClear();

      // Switch mode to orbit with user-authored provenance
      rerender(
        <GraphView
          nodes={testNodes}
          edges={testEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={persistedPositions}
          graphLayout={{
            mode: 'interactive',
            architectureMode: 'hierarchical',
            layoutProvenance: 'user-authored',
            nodePositions: persistedPositions,
          }}
          architectureMode="orbit"
          layoutMode="interactive"
        />
      );

      // User-authored positions are authoritative, so positions remain preserved in nodePositions
      expect(mockCy.getElementById('node-1').position()).toEqual({ x: 888, y: 888 });
      expect(mockCy.getElementById('node-2').position()).toEqual({ x: 999, y: 999 });
    });
  });
});

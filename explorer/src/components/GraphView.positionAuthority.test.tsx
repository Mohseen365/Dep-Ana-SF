import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GraphView } from './GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape
const { mockCy, mockCytoscapeFn, mockLayoutRun, listeners, mockNodeObjMap } = vi.hoisted(() => {
  const listeners: Record<string, ((evt: any) => void)[]> = {};
  const mockLayoutRun = vi.fn();

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
    }
    return mockNodeObjMap[id];
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue({
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      unselect: vi.fn().mockReturnThis(),
      remove: vi.fn(),
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
            createMockNode(el.data.id, el.position?.x ?? 100, el.position?.y ?? 100);
          }
        });
      }
    }),
    layout: vi.fn().mockReturnValue({ run: mockLayoutRun }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn((event, targetOrHandler, maybeHandler) => {
      const handler = typeof targetOrHandler === 'function' ? targetOrHandler : maybeHandler;
      const key = typeof targetOrHandler === 'string' ? `${event}:${targetOrHandler}` : event;
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(handler);
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
    return mockCy;
  });
  mockCytoscapeFn.use = vi.fn();

  return { mockCy, mockCytoscapeFn, mockLayoutRun, listeners, mockNodeObjMap };
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
    for (const key in listeners) delete listeners[key];
    for (const key in mockNodeObjMap) delete mockNodeObjMap[key];
  });

  it('Restoration of persisted positions: sets node positions directly when nodePositions prop is provided', () => {
    const persistedPositions = {
      'node-1': { x: 150, y: 250 },
      'node-2': { x: 350, y: 450 },
    };

    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
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
      })
    );
  });

  it('Static stability: blocks automatic relayout on graph updates, filter changes, and focus changes', () => {
    const persistedPositions = {
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
        nodePositions={persistedPositions}
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

    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
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

    const { unmount } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
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
});

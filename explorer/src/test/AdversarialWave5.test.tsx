import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GraphView } from '../components/GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  captureNodePositions,
  expectPositionsEqual,
  expectOnlyNodesMoved,
  expectNoExistingNodesMoved,
} from './position-test-helpers';

// Mock cytoscape setup
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
        data: vi.fn().mockImplementation((key?: string) => {
          if (key === 'id') return id;
          if (key === 'type') return 'ApexClass';
          return { id, displayName: id, type: 'ApexClass' };
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
  },
  {
    id: 'node-3',
    displayName: 'Node 3',
    type: 'CustomObject',
    file: 'Node3.object',
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
  },
  {
    id: 'e2',
    source: 'node-2',
    target: 'node-3',
    relationshipType: 'field-reference',
    method: 'field',
    evidence: 'Node3__c',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 15,
    column: 1,
    methodOwner: 'Node2',
    file: 'Node2.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'Node2' },
      target: { type: 'CustomObject', name: 'Node3' },
      relationship: { type: 'field-reference', resolution: 'EXACT' },
      location: { line: 15, column: 1 }
    }
  }
];

const initialPositions = {
  'node-1': { x: 100, y: 150 },
  'node-2': { x: 300, y: 350 },
  'node-3': { x: 500, y: 550 },
};

describe('Wave 5 Adversarial Verification Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in listeners) delete listeners[key];
    for (const key in mockNodeObjMap) delete mockNodeObjMap[key];
  });

  it('Matrix Row 1: node-type filter preserves coordinates of existing/surviving nodes', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Hide CustomObject (node-3)
    rerender(
      <GraphView
        nodes={[testNodes[0], testNodes[1]]}
        edges={[testEdges[0]]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectNoExistingNodesMoved(before, after, ['node-1', 'node-2']);
  });

  it('Matrix Row 2: Focus Depth changes preserve node coordinates', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        focusedNodeId="node-1"
        focusState={{ enabled: true, focusNodeId: 'node-1', direction: 'both', depth: 1 }}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Expand focus depth from 1 to 2
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
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 3: Focus Direction changes preserve node coordinates', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-2"
        selectedEdgeId={null}
        focusedNodeId="node-2"
        focusState={{ enabled: true, focusNodeId: 'node-2', direction: 'dependencies', depth: 1 }}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Switch focus direction from dependencies to dependents
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-2"
        selectedEdgeId={null}
        focusedNodeId="node-2"
        focusState={{ enabled: true, focusNodeId: 'node-2', direction: 'dependents', depth: 1 }}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 4 & 5: Component scope and full project scope changes preserve node coordinates', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Switch selection to node-3
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-3"
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    // Clear selection back to full project scope
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 6 & 7: Investigation drawer open, drill, and double-click preserve node coordinates', () => {
    const onNodeDoubleTap = vi.fn();
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
        onNodeDoubleTap={onNodeDoubleTap}
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Double tap node-1
    const dblTapHandler = listeners['dbltap dblclick:node']?.[0];
    const n1 = mockCy.getElementById('node-1');
    act(() => {
      dblTapHandler({ target: n1 });
    });

    expect(onNodeDoubleTap).toHaveBeenCalledWith('node-1', expect.anything());

    // Enter investigation on node-1
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        focusedNodeId="node-1"
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 8 & 9: Viewport operations (zoom, pan, fit, center, resize) do NOT modify node coordinates', () => {
    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="node-1"
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Perform zoom and fit actions
    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
    fireEvent.click(zoomInBtn);

    const fitBtn = screen.getByRole('button', { name: /fit view/i });
    fireEvent.click(fitBtn);

    const centerBtn = screen.getByRole('button', { name: /center selected/i });
    fireEvent.click(centerBtn);

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 10: Mode Switch Interactive ↔ Static preserves exact coordinates without relayout', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="interactive"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Switch to static
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    // Switch back to interactive
    rerender(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="interactive"
      />
    );

    const after = captureNodePositions(mockCy);
    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectPositionsEqual(before, after);
  });

  it('Matrix Row 11: Reset Layout explicitly re-computes and updates positions', () => {
    render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    const resetBtn = screen.getByRole('button', { name: /reset layout/i });
    fireEvent.click(resetBtn);

    expect(mockLayoutRun).toHaveBeenCalled();
  });

  it('Matrix Row 12: User dragging moves ONLY the dragged node', () => {
    const onNodePositionsChange = vi.fn();
    render(
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

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    // Drag node-1 from (100, 150) to (180, 280)
    const n1 = mockCy.getElementById('node-1');
    n1.position({ x: 180, y: 280 });

    const dragHandler = listeners['dragfree:node']?.[0];
    act(() => {
      dragHandler({ target: n1 });
    });

    const after = captureNodePositions(mockCy);

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectOnlyNodesMoved(before, after, ['node-1']);
    expect(onNodePositionsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        'node-1': { x: 180, y: 280 },
      })
    );
  });

  it('Matrix Row 13: Genuinely new node insertion leaves existing nodes 100% unmoved', () => {
    const { rerender } = render(
      <GraphView
        nodes={testNodes}
        edges={testEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const before = captureNodePositions(mockCy);
    mockLayoutRun.mockClear();

    const newNode: ExplorerNode = {
      id: 'node-4',
      displayName: 'Node 4',
      type: 'ApexClass',
      file: 'Node4.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 0.1, unresolved: 0, score: 90 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    };

    const newEdge: ExplorerEdge = {
      id: 'e3',
      source: 'node-4',
      target: 'node-1',
      relationshipType: 'method-call',
      method: 'execute',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: 'Node4',
      file: 'Node4.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'Node4' },
        target: { type: 'ApexClass', name: 'Node1' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {}
      }
    };

    // Insert node-4
    rerender(
      <GraphView
        nodes={[...testNodes, newNode]}
        edges={[...testEdges, newEdge]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={initialPositions}
        layoutMode="static"
      />
    );

    const after = captureNodePositions(mockCy);

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expectNoExistingNodesMoved(before, after, ['node-1', 'node-2', 'node-3']);
    expect(after['node-4']).toBeDefined();
    expect(typeof after['node-4'].x).toBe('number');
    expect(typeof after['node-4'].y).toBe('number');
  });
});

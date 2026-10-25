import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GraphView } from './GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

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
          type: id.includes('LWC') ? 'LWC' : 'ApexClass',
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
    layout: vi.fn().mockImplementation((opts) => ({
      run: vi.fn().mockImplementation(() => {
        mockLayoutRun(opts);
        if (opts?.positions) {
          Object.values(mockNodeObjMap).forEach((node: any) => {
            const newPos = typeof opts.positions === 'function' ? opts.positions(node) : opts.positions[node.id()];
            if (newPos) {
              node.position(newPos);
            }
          });
        }
        const stopHandlers = listeners['layoutstop'] || [];
        listeners['layoutstop'] = [];
        stopHandlers.forEach((handler) => handler({ type: 'layoutstop' }));
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
      const emptyCol = { removeClass: vi.fn().mockReturnThis(), addClass: vi.fn().mockReturnThis() };
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

const sampleNodes: ExplorerNode[] = [
  {
    id: 'ApexClass:ServiceA',
    displayName: 'ServiceA',
    type: 'ApexClass',
    file: 'ServiceA.cls',
    metrics: { fanIn: 5, fanOut: 2, coupling: 0.5, unresolved: 0, score: 70 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 2, asyncPatterns: [], securitySignalsCount: 0, queryCount: 1, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'ApexClass:ServiceB',
    displayName: 'ServiceB',
    type: 'ApexClass',
    file: 'ServiceB.cls',
    metrics: { fanIn: 1, fanOut: 3, coupling: 0.3, unresolved: 0, score: 40 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  }
];

const sampleEdges: ExplorerEdge[] = [
  {
    id: 'e1',
    source: 'ApexClass:ServiceA',
    target: 'ApexClass:ServiceB',
    relationshipType: 'method-call',
    method: 'execute',
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: 'ServiceA',
    file: 'ServiceA.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'ServiceA' },
      target: { type: 'ApexClass', name: 'ServiceB' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {}
    }
  }
];

describe('Phase D.4-E Regression Suite: Initial Graph Load & Layout Activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in listeners) delete listeners[key];
    for (const key in mockNodeObjMap) delete mockNodeObjMap[key];
  });

  it('D4E-01: Treat automatic layout provenance as authoritative when storedArchMode matches active mode', () => {
    const persistedPositions = {
      'ApexClass:ServiceA': { x: 350, y: 450 },
      'ApexClass:ServiceB': { x: 550, y: 650 },
    };

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        graphLayout={{
          mode: 'interactive',
          architectureMode: 'hierarchical',
          layoutProvenance: 'automatic-hierarchical',
          nodePositions: persistedPositions,
        }}
        nodePositions={persistedPositions}
      />
    );

    expect(mockCy.getElementById('ApexClass:ServiceA').position()).toEqual({ x: 350, y: 450 });
    expect(mockCy.getElementById('ApexClass:ServiceB').position()).toEqual({ x: 550, y: 650 });
  });

  it('D4E-02: Initial graph mount calculates initial layout once and persists coordinates when no positions exist', () => {
    const onNodePositionsChange = vi.fn();

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        onNodePositionsChange={onNodePositionsChange}
      />
    );

    expect(mockCytoscapeFn).toHaveBeenCalledTimes(1);
    expect(mockLayoutRun).toHaveBeenCalledTimes(1);
    expect(onNodePositionsChange).toHaveBeenCalled();
  });

  it('D4E-03: Does not duplicate element reconstruction or layout calls on initial render pass', () => {
    const removeSpy = mockCy.elements().remove;

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    // Initial mount pass should not trigger structural element teardown
    expect(removeSpy).not.toHaveBeenCalled();
    expect(mockLayoutRun).toHaveBeenCalledTimes(1);
  });

  it('D4E-04: Filtering graph nodes in static mode preserves session coordinates for remaining nodes', () => {
    const persistedPositions = {
      'ApexClass:ServiceA': { x: 200, y: 300 },
      'ApexClass:ServiceB': { x: 400, y: 500 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          architectureMode: 'hierarchical',
          layoutProvenance: 'automatic-hierarchical',
          nodePositions: persistedPositions,
        }}
        nodePositions={persistedPositions}
      />
    );

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={[sampleNodes[0]]}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          architectureMode: 'hierarchical',
          layoutProvenance: 'automatic-hierarchical',
          nodePositions: persistedPositions,
        }}
        nodePositions={persistedPositions}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:ServiceA').position()).toEqual({ x: 200, y: 300 });
  });
});

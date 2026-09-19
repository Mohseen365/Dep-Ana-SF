import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GraphView } from './GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';

// Mock cytoscape and plugins
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
          type: id.includes('Trigger') ? 'ApexTrigger' : id.includes('LWC') ? 'LWC' : 'ApexClass',
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
    id: 'ApexClass:HubService',
    displayName: 'HubService',
    type: 'ApexClass',
    file: 'HubService.cls',
    metrics: { fanIn: 10, fanOut: 10, coupling: 0.8, unresolved: 0, score: 95 },
    risk: 'HIGH',
    riskReasons: ['High centrality'],
    behavior: { isTest: false, publicContractsCount: 10, asyncPatterns: [], securitySignalsCount: 0, queryCount: 5, dmlCount: 2, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'ApexClass:BridgeAdapter',
    displayName: 'BridgeAdapter',
    type: 'ApexClass',
    file: 'BridgeAdapter.cls',
    metrics: { fanIn: 3, fanOut: 4, coupling: 0.6, unresolved: 0, score: 80 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 4, asyncPatterns: [], securitySignalsCount: 0, queryCount: 2, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'ApexClass:HubServiceTest',
    displayName: 'HubServiceTest',
    type: 'ApexClass',
    file: 'HubServiceTest.cls',
    metrics: { fanIn: 0, fanOut: 1, coupling: 0.1, unresolved: 0, score: 20 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'LWC:hubComponent',
    displayName: 'hubComponent',
    type: 'LWC',
    file: 'hubComponent.js',
    metrics: { fanIn: 0, fanOut: 1, coupling: 0.2, unresolved: 0, score: 30 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  }
];

const sampleEdges: ExplorerEdge[] = [
  {
    id: 'e1',
    source: 'ApexClass:BridgeAdapter',
    target: 'ApexClass:HubService',
    relationshipType: 'method-call',
    method: 'execute',
    evidence: 'HubService.execute()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 10,
    column: 1,
    methodOwner: 'BridgeAdapter',
    file: 'BridgeAdapter.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'BridgeAdapter' },
      target: { type: 'ApexClass', name: 'HubService' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {}
    }
  },
  {
    id: 'e2',
    source: 'ApexClass:HubServiceTest',
    target: 'ApexClass:HubService',
    relationshipType: 'test-reference',
    method: 'testExecution',
    evidence: 'HubService.execute()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: 'HubServiceTest',
    file: 'HubServiceTest.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'HubServiceTest' },
      target: { type: 'ApexClass', name: 'HubService' },
      relationship: { type: 'test-reference', resolution: 'EXACT' },
      location: {}
    }
  },
  {
    id: 'e3',
    source: 'LWC:hubComponent',
    target: 'ApexClass:HubService',
    relationshipType: 'method-call',
    method: 'getHubData',
    evidence: '@AuraEnabled',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: 'hubComponent',
    file: 'hubComponent.js',
    canonical: {
      source: { type: 'LWC', name: 'hubComponent' },
      target: { type: 'ApexClass', name: 'HubService' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {}
    }
  }
];

describe('Wave 6 — Runtime Integration & Position Authority Test Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in listeners) delete listeners[key];
    for (const key in mockNodeObjMap) delete mockNodeObjMap[key];
  });

  it('1. Initial architecture-aware layout: verifies GraphView receives positions calculated by computeArchitectureLayout', () => {
    const expectedPositions = computeArchitectureLayout(sampleNodes, sampleEdges);

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

    const initOpts = mockCytoscapeFn.mock.calls[0][0];
    expect(initOpts.layout.name).toBe('preset');

    for (const node of sampleNodes) {
      const posFn = initOpts.layout.positions;
      const computedPos = posFn({ id: () => node.id });
      expect(computedPos).toEqual(expectedPositions[node.id]);
    }
  });

  it('2. Authoritative dragged positions: user drag remains authoritative across re-renders (single, hub, bridge, satellite)', () => {
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

    const hubNode = mockCy.getElementById('ApexClass:HubService');
    const bridgeNode = mockCy.getElementById('ApexClass:BridgeAdapter');
    const satNode = mockCy.getElementById('ApexClass:HubServiceTest');

    hubNode.position({ x: 999, y: 888 });
    bridgeNode.position({ x: 777, y: 666 });
    satNode.position({ x: 555, y: 444 });

    const dragHandler = listeners['dragfree:node']?.[0];
    expect(dragHandler).toBeDefined();

    act(() => {
      dragHandler({ target: hubNode });
      dragHandler({ target: bridgeNode });
      dragHandler({ target: satNode });
    });

    expect(hubNode.position()).toEqual({ x: 999, y: 888 });
    expect(bridgeNode.position()).toEqual({ x: 777, y: 666 });
    expect(satNode.position()).toEqual({ x: 555, y: 444 });
  });

  it('3. Persisted position precedence: persisted positions override calculated layout on mount/reload', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 123, y: 456 },
      'ApexClass:BridgeAdapter': { x: 234, y: 567 },
    };

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 123, y: 456 });
    expect(mockCy.getElementById('ApexClass:BridgeAdapter').position()).toEqual({ x: 234, y: 567 });
  });

  it('4. Static initial layout: calculates architecture layout once on initial mount if no positions exist', () => {
    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    const initOpts = mockCytoscapeFn.mock.calls[0][0];
    expect(initOpts.layout.name).toBe('preset');
  });

  it('5. Static filter regression: hiding/restoring node types does not trigger automatic relayout', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 100, y: 100 },
      'ApexClass:BridgeAdapter': { x: 200, y: 200 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    const apexOnlyNodes = sampleNodes.filter(n => n.type === 'ApexClass');
    rerender(
      <GraphView
        nodes={apexOnlyNodes}
        edges={sampleEdges.filter(e => e.source.startsWith('ApexClass') && e.target.startsWith('ApexClass'))}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 100, y: 100 });
  });

  it('6. Static focus-depth regression: changing focus node, depth, and direction does not trigger relayout', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 100, y: 100 },
      'ApexClass:BridgeAdapter': { x: 200, y: 200 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="ApexClass:HubService"
        selectedEdgeId={null}
        focusedNodeId="ApexClass:HubService"
        focusState={{ enabled: true, focusNodeId: 'ApexClass:HubService', direction: 'dependencies', depth: 1 }}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="ApexClass:HubService"
        selectedEdgeId={null}
        focusedNodeId="ApexClass:HubService"
        focusState={{ enabled: true, focusNodeId: 'ApexClass:HubService', direction: 'dependencies', depth: 2 }}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 100, y: 100 });
  });

  it('7. Interactive drag regression: dragged positions survive graph updates without forced layout', () => {
    const onNodePositionsChange = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
        onNodePositionsChange={onNodePositionsChange}
      />
    );

    const hubNode = mockCy.getElementById('ApexClass:HubService');
    hubNode.position({ x: 800, y: 800 });

    const dragHandler = listeners['dragfree:node']?.[0];
    act(() => {
      dragHandler({ target: hubNode });
    });

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="ApexClass:HubService"
        selectedEdgeId={null}
        layoutMode="interactive"
        onNodePositionsChange={onNodePositionsChange}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 800, y: 800 });
  });

  it('8. Mode-switch regression: switching Static <-> Interactive does not trigger visual rearrangement', () => {
    const onLayoutModeChange = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
        onLayoutModeChange={onLayoutModeChange}
      />
    );

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
        onLayoutModeChange={onLayoutModeChange}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
        onLayoutModeChange={onLayoutModeChange}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
  });

  it('9. Explicit reset layout: recalculates architecture layout and persists new positions', () => {
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
        layoutMode="static"
      />
    );

    mockLayoutRun.mockClear();

    const resetBtn = screen.getByRole('button', { name: /reset layout/i });
    fireEvent.click(resetBtn);

    expect(mockLayoutRun).toHaveBeenCalled();
    expect(onNodePositionsChange).toHaveBeenCalled();
  });

  it('10. New node placement: adding a new node places it deterministically without moving existing nodes', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 100, y: 100 },
      'ApexClass:BridgeAdapter': { x: 200, y: 200 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes.slice(0, 2)}
        edges={sampleEdges.slice(0, 1)}
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
      id: 'ApexClass:NewService',
      displayName: 'NewService',
      type: 'ApexClass',
      file: 'NewService.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 0.1, unresolved: 0, score: 50 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    };

    const newEdge: ExplorerEdge = {
      id: 'e4',
      source: 'ApexClass:NewService',
      target: 'ApexClass:HubService',
      relationshipType: 'method-call',
      method: 'call',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: 'NewService',
      file: 'NewService.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'NewService' },
        target: { type: 'ApexClass', name: 'HubService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {}
      }
    };

    rerender(
      <GraphView
        nodes={[...sampleNodes.slice(0, 2), newNode]}
        edges={[sampleEdges[0], newEdge]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 100, y: 100 });
    expect(mockCy.getElementById('ApexClass:BridgeAdapter').position()).toEqual({ x: 200, y: 200 });

    const newPos = mockCy.getElementById('ApexClass:NewService').position();
    expect(typeof newPos.x).toBe('number');
    expect(typeof newPos.y).toBe('number');
    expect(isNaN(newPos.x)).toBe(false);
    expect(isNaN(newPos.y)).toBe(false);
  });

  it('11. Hidden -> Visible node restoration: restored nodes recover authoritative coordinates', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 300, y: 300 },
      'ApexClass:BridgeAdapter': { x: 400, y: 400 },
    };

    const { rerender } = render(
      <GraphView
        nodes={[sampleNodes[0]]}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    rerender(
      <GraphView
        nodes={[sampleNodes[0], sampleNodes[1]]}
        edges={[sampleEdges[0]]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        layoutMode="static"
      />
    );

    expect(mockCy.getElementById('ApexClass:BridgeAdapter').position()).toEqual({ x: 400, y: 400 });
  });

  it('12. Filter + Drag combination: dragging node A then filtering and restoring preserves A at dragged position', () => {
    const onNodePositionsChange = vi.fn();

    const { rerender } = render(
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

    const hubNode = mockCy.getElementById('ApexClass:HubService');
    hubNode.position({ x: 999, y: 999 });

    const dragHandler = listeners['dragfree:node']?.[0];
    act(() => {
      dragHandler({ target: hubNode });
    });

    mockLayoutRun.mockClear();

    const apexNodes = sampleNodes.filter(n => n.type === 'ApexClass');
    rerender(
      <GraphView
        nodes={apexNodes}
        edges={sampleEdges.slice(0, 2)}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        onNodePositionsChange={onNodePositionsChange}
      />
    );

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 999, y: 999 });

    rerender(
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

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 999, y: 999 });
  });

  it('13. Reset + Filter combination: explicit reset followed by filter retains reset positions', () => {
    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    const resetBtn = screen.getByRole('button', { name: /reset layout/i });
    fireEvent.click(resetBtn);

    const posAfterReset = mockCy.getElementById('ApexClass:HubService').position();

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={sampleNodes.slice(0, 2)}
        edges={sampleEdges.slice(0, 1)}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="static"
      />
    );

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual(posAfterReset);
  });

  it('14. Persistence + Filter combination: persisted positions remain authoritative across filter cycles', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 500, y: 500 },
      'ApexClass:BridgeAdapter': { x: 600, y: 600 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    rerender(
      <GraphView
        nodes={[sampleNodes[0]]}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 500, y: 500 });
    expect(mockCy.getElementById('ApexClass:BridgeAdapter').position()).toEqual({ x: 600, y: 600 });
  });

  it('15. Graph update with existing positions: existing nodes retain positions, architecture layout does not override', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 111, y: 222 },
      'ApexClass:BridgeAdapter': { x: 333, y: 444 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    mockLayoutRun.mockClear();

    const updatedEdges = [...sampleEdges];
    updatedEdges[0] = { ...updatedEdges[0], evidence: 'Updated evidence' };

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={updatedEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 111, y: 222 });
    expect(mockCy.getElementById('ApexClass:BridgeAdapter').position()).toEqual({ x: 333, y: 444 });
  });

  it('16. Investigation mode regression: highlighting / path selection does not trigger unintended relayout', () => {
    const persistedPositions = {
      'ApexClass:HubService': { x: 100, y: 200 },
      'ApexClass:BridgeAdapter': { x: 300, y: 400 },
    };

    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
      />
    );

    mockLayoutRun.mockClear();

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        selectedCycleNodeIds={['ApexClass:HubService', 'ApexClass:BridgeAdapter']}
        nodePositions={persistedPositions}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
    expect(mockCy.getElementById('ApexClass:HubService').position()).toEqual({ x: 100, y: 200 });

    rerender(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        selectedCycleNodeIds={null}
        nodePositions={persistedPositions}
      />
    );

    expect(mockLayoutRun).not.toHaveBeenCalled();
  });

  it('17. Double-layout prevention: initial mount executes layout configuration once without duplicate runs', () => {
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

    expect(mockCytoscapeFn).toHaveBeenCalledTimes(1);
    expect(mockLayoutRun).not.toHaveBeenCalled();
  });

  it('18. No automatic force-layout override: preset architecture layout is not replaced by fcose', () => {
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

    const initOpts = mockCytoscapeFn.mock.calls[0][0];
    expect(initOpts.layout.name).toBe('preset');
  });

  it('19. Empty graph handling safety: handles empty node array without crashing', () => {
    expect(() => {
      render(
        <GraphView
          nodes={[]}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );
    }).not.toThrow();
  });

  it('20. Single node graph handling safety: renders single node graph without crashing or NaN coordinates', () => {
    const singleNode = [sampleNodes[0]];

    expect(() => {
      render(
        <GraphView
          nodes={singleNode}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );
    }).not.toThrow();

    const pos = mockCy.getElementById('ApexClass:HubService').position();
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(isNaN(pos.x)).toBe(false);
    expect(isNaN(pos.y)).toBe(false);
  });

  it('21. Disconnected graph handling safety: places disconnected components deterministically without crashing', () => {
    const disconnectedNodes: ExplorerNode[] = [
      ...sampleNodes,
      {
        id: 'ApexClass:Isolated1',
        displayName: 'Isolated1',
        type: 'ApexClass',
        file: 'Isolated1.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 10 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' }
      }
    ];

    expect(() => {
      render(
        <GraphView
          nodes={disconnectedNodes}
          edges={sampleEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );
    }).not.toThrow();

    const isoPos = mockCy.getElementById('ApexClass:Isolated1').position();
    expect(typeof isoPos.x).toBe('number');
    expect(typeof isoPos.y).toBe('number');
    expect(isNaN(isoPos.x)).toBe(false);
    expect(isNaN(isoPos.y)).toBe(false);
  });

  it('22. Large graph / render stability: handles 50+ nodes without layout loops or memory leaks', () => {
    const largeNodes: ExplorerNode[] = Array.from({ length: 50 }, (_, i) => ({
      id: `ApexClass:Class${i}`,
      displayName: `Class${i}`,
      type: 'ApexClass',
      file: `Class${i}.cls`,
      metrics: { fanIn: i % 5, fanOut: (i + 1) % 5, coupling: 0.2, unresolved: 0, score: 50 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    }));

    const largeEdges: ExplorerEdge[] = Array.from({ length: 49 }, (_, i) => ({
      id: `edge${i}`,
      source: `ApexClass:Class${i}`,
      target: `ApexClass:Class${i + 1}`,
      relationshipType: 'method-call',
      method: 'call',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: `Class${i}`,
      file: `Class${i}.cls`,
      canonical: {
        source: { type: 'ApexClass', name: `Class${i}` },
        target: { type: 'ApexClass', name: `Class${i + 1}` },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {}
      }
    }));

    const { rerender } = render(
      <GraphView
        nodes={largeNodes}
        edges={largeEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    for (let i = 0; i < 5; i++) {
      rerender(
        <GraphView
          nodes={largeNodes}
          edges={largeEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={`ApexClass:Class${i}`}
          selectedEdgeId={null}
        />
      );
    }

    expect(mockCytoscapeFn).toHaveBeenCalledTimes(1);
  });

  it('23. Undefined and empty cycle selection handling: handles empty cycle array, null, and undefined without throwing errors or mutating positions', () => {
    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        selectedCycleNodeIds={[]}
      />
    );

    expect(() => {
      rerender(
        <GraphView
          nodes={sampleNodes}
          edges={sampleEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          selectedCycleNodeIds={null}
        />
      );
    }).not.toThrow();

    expect(() => {
      rerender(
        <GraphView
          nodes={sampleNodes}
          edges={sampleEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          selectedCycleNodeIds={undefined}
        />
      );
    }).not.toThrow();
  });

  it('24. Missing nodePositions and missing edges safety: renders safely when nodePositions is undefined and edges is empty array', () => {
    expect(() => {
      render(
        <GraphView
          nodes={sampleNodes}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          nodePositions={undefined}
        />
      );
    }).not.toThrow();

    const hubPos = mockCy.getElementById('ApexClass:HubService').position();
    expect(typeof hubPos.x).toBe('number');
    expect(typeof hubPos.y).toBe('number');
    expect(Number.isFinite(hubPos.x)).toBe(true);
    expect(Number.isFinite(hubPos.y)).toBe(true);
  });
});

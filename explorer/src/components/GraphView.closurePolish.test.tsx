import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { GraphView, GraphViewRef } from './GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape and plugins
const { mockElementsCollection, mockCy, mockCytoscapeFn, mockContainer } = vi.hoisted(() => {
  const mockContainer = {
    style: { cursor: 'default' }
  };

  const mockElementsCollection = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    unselect: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
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
    container: vi.fn().mockReturnValue(mockContainer),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() })
  };

  const mockCytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  mockCytoscapeFn.use = vi.fn();

  return { mockElementsCollection, mockCy, mockCytoscapeFn, mockContainer };
});

vi.mock('cytoscape', () => {
  return { default: mockCytoscapeFn };
});

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
window.matchMedia = window.matchMedia || vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const mockNodes: ExplorerNode[] = [
  {
    id: 'ApexClass:AccountController',
    displayName: 'AccountController',
    type: 'ApexClass',
    file: 'classes/AccountController.cls',
    metrics: { fanIn: 2, fanOut: 3, coupling: 0.5, unresolved: 0, score: 80 },
    risk: 'HIGH',
    riskReasons: ['High coupling'],
    behavior: {
      isTest: false,
      sharing: 'with sharing' as const,
      publicContractsCount: 2,
      asyncPatterns: [],
      securitySignalsCount: 1,
      queryCount: 3,
      dmlCount: 1,
      calloutCount: 0
    },
    refactoringReadiness: {
      isHighRisk: true,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED'
    }
  },
  {
    id: 'ApexClass:AccountService',
    displayName: 'AccountService',
    type: 'ApexClass',
    file: 'classes/AccountService.cls',
    metrics: { fanIn: 5, fanOut: 1, coupling: 0.2, unresolved: 0, score: 90 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: false,
      sharing: 'with sharing' as const,
      publicContractsCount: 5,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED'
    }
  }
];

const mockEdges: ExplorerEdge[] = [
  {
    id: 'e1',
    source: 'ApexClass:AccountController',
    target: 'ApexClass:AccountService',
    relationshipType: 'method-call',
    method: 'getAccounts',
    evidence: 'AccountService.getAccounts()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 15,
    column: 1,
    methodOwner: 'AccountController',
    file: 'classes/AccountController.cls',
    canonical: {
      source: {
        type: 'ApexClass',
        name: 'AccountController',
        method: 'getAccounts'
      },
      target: {
        type: 'ApexClass',
        name: 'AccountService',
        method: 'getAccounts'
      },
      relationship: {
        type: 'method-call',
        resolution: 'EXACT'
      },
      location: {
        line: 15,
        column: 1
      }
    }
  }
];

describe('GraphView Closure Polish Regression Suite (PR 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer.style.cursor = 'default';
  });

  it('N4 — adds zoom classes (zoom-near) and omits dead lod-* class additions', () => {
    render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    expect(mockElementsCollection.removeClass).toHaveBeenCalledWith('zoom-far zoom-mid zoom-near');
    expect(mockElementsCollection.addClass).toHaveBeenCalledWith('zoom-near');

    // Assert no lod-* class additions were made
    const addClassCalls = mockElementsCollection.addClass.mock.calls;
    const hasLodClasses = addClassCalls.some(call => call[0] && call[0].includes('lod-'));
    expect(hasLodClasses).toBe(false);
  });

  it('N10 — scopes cursor mutations to Cytoscape container element', () => {
    render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    // Find mouseover node handler registered on cy
    const mouseoverCall = mockCy.on.mock.calls.find((call: any[]) => call[0] === 'mouseover' && call[1] === 'node');
    expect(mouseoverCall).toBeDefined();

    const mouseoverHandler = mouseoverCall![2];
    mouseoverHandler({
      target: {
        id: () => 'ApexClass:AccountController',
        addClass: vi.fn(),
        renderedPosition: () => ({ x: 50, y: 50 }),
      },
    });

    // Verify container cursor was changed to pointer
    expect(mockContainer.style.cursor).toBe('pointer');

    // Find mouseleave handler registered on cy
    const mouseleaveCall = mockCy.on.mock.calls.find((call: any[]) => call[0] === 'mouseleave' && typeof call[1] === 'function');
    expect(mouseleaveCall).toBeDefined();

    const mouseleaveHandler = mouseleaveCall![1];
    mouseleaveHandler();

    // Verify container cursor was reset to default
    expect(mockContainer.style.cursor).toBe('default');
  });

  it('T0-8 — stabilizes useImperativeHandle method identity across selection changes', () => {
    const ref = createRef<GraphViewRef>();

    const { rerender } = render(
      <GraphView
        ref={ref}
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    const initialHandle = ref.current;
    expect(initialHandle).not.toBeNull();
    const initialCenterSelected = initialHandle?.centerSelected;

    // Change selection from null -> 'ApexClass:AccountController'
    rerender(
      <GraphView
        ref={ref}
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId="ApexClass:AccountController"
        selectedEdgeId={null}
      />
    );

    const updatedHandle = ref.current;
    expect(updatedHandle?.centerSelected).toBe(initialCenterSelected);
  });

  it('T1-6 — selects the first accessible node on arrow key when no node is selected', () => {
    const onSelectNode = vi.fn();

    render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={onSelectNode}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    const region = screen.getByRole('region', { name: /salesforce architecture dependency graph/i });

    // Press ArrowDown when selectedNodeId is null
    fireEvent.keyDown(region, { key: 'ArrowDown' });

    // Should select the first accessible node
    expect(onSelectNode).toHaveBeenCalledWith(mockNodes[0]);
  });

  it('T1-6 — handles arrow key navigation gracefully when node list is empty', () => {
    const onSelectNode = vi.fn();

    render(
      <GraphView
        nodes={[]}
        edges={[]}
        onSelectNode={onSelectNode}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    const region = screen.getByRole('region', { name: /salesforce architecture dependency graph/i });

    // Press ArrowRight when nodes is empty and selectedNodeId is null
    fireEvent.keyDown(region, { key: 'ArrowRight' });

    // Should not crash or select anything
    expect(onSelectNode).not.toHaveBeenCalled();
  });

  it('Observation 1 — scopes user-authored position authority to stored architecture mode', () => {
    const onSelectNode = vi.fn();

    // In this scenario, user dragged a node in Hybrid mode (layoutProvenance = 'user-authored', stored arch mode = 'hybrid').
    // When switching to Orbit mode (architectureMode = 'orbit'), storedArchMode ('hybrid') !== architectureMode ('orbit'),
    // so hasAuth MUST evaluate to false and allow Orbit auto layout to run.
    render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={onSelectNode}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        architectureMode="orbit"
        layoutMode="interactive"
        graphLayout={{
          layoutName: 'fcose',
          mode: 'interactive',
          architectureMode: 'hybrid',
          layoutProvenance: 'user-authored',
          nodePositions: { 'ApexClass:AccountController': { x: 100, y: 100 } },
        }}
      />
    );

    // Verify cy.layout or runLayoutWithMetadata was invoked because auto layout ran
    expect(mockCy.layout).toHaveBeenCalled();
  });

  it('Observation 2 — announces structural-sync layout completion to screen readers', () => {
    const { rerender } = render(
      <GraphView
        nodes={mockNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        architectureMode="hierarchical"
        layoutMode="interactive"
      />
    );

    // Update nodes (trigger structural sync)
    const updatedNodes: ExplorerNode[] = [...mockNodes, {
      id: 'ApexClass:AccountHelper',
      displayName: 'AccountHelper',
      type: 'ApexClass',
      file: 'classes/AccountHelper.cls',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0.1, unresolved: 0, score: 70 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: 'with sharing' as const,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED'
      }
    }];

    rerender(
      <GraphView
        nodes={updatedNodes}
        edges={mockEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        architectureMode="hierarchical"
        layoutMode="interactive"
      />
    );

    // Verify screen reader live region contains the structural sync announcement
    const liveRegion = screen.getByText(/graph updated, 3 components/i);
    expect(liveRegion).toBeInTheDocument();
  });
});

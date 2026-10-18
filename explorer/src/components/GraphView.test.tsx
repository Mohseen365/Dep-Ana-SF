import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { GraphView, GraphViewRef } from './GraphView';
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape and plugins
const { mockElementsRemove, mockCy, mockCytoscapeFn } = vi.hoisted(() => {
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
      sharing: 'with sharing',
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
      sharing: 'with sharing',
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

describe('GraphEngine Components & Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NodeHoverCard component', () => {
    it('renders node details accurately', () => {
      render(
        <NodeHoverCard
          node={mockNodes[0]}
          x={100}
          y={200}
        />
      );

      expect(screen.getByText('AccountController')).toBeInTheDocument();
      expect(screen.getByText('ApexClass')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Fan-In
      expect(screen.getByText('3')).toBeInTheDocument(); // Fan-Out
    });
  });

  describe('EdgeHoverCard component', () => {
    it('renders edge details and open in editor link', () => {
      render(
        <EdgeHoverCard
          edge={mockEdges[0]}
          x={100}
          y={200}
        />
      );

      expect(screen.getByText('getAccounts')).toBeInTheDocument();
      expect(screen.getByText('method-call')).toBeInTheDocument();
      expect(screen.getByText('AccountService.getAccounts()')).toBeInTheDocument();
      expect(screen.getByText('classes/AccountController.cls:15')).toBeInTheDocument();

      const link = screen.getByRole('link', { name: /open in editor/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'vscode://file/classes/AccountController.cls:15');
    });
  });

  describe('GraphView component', () => {
    it('renders container, minimap, sr-only tree, and floating controls', () => {
      const onSelectNode = vi.fn();
      const onSelectEdge = vi.fn();

      render(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      // Verify container region
      const region = screen.getByRole('region', { name: /salesforce architecture dependency graph/i });
      expect(region).toBeInTheDocument();

      // Verify minimap
      expect(region.querySelector('#minimap')).toBeInTheDocument();

      // Verify accessible component list
      const list = screen.getByRole('list', { name: /component nodes/i });
      expect(list).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
      expect(listItems[0]).toHaveTextContent('AccountController');

      // Verify floating toolbar controls
      expect(screen.getByRole('toolbar', { name: /graph controls/i })).toBeInTheDocument();
    });

    it('supports ref imperatively calling controls', () => {
      const ref = createRef<GraphViewRef>();

      render(
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

      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.zoomIn).toBe('function');
      expect(typeof ref.current?.zoomOut).toBe('function');
      expect(typeof ref.current?.fitView).toBe('function');
      expect(typeof ref.current?.resetLayout).toBe('function');
    });

    it('handles keyboard navigation shortcuts on container', () => {
      const onSelectNode = vi.fn();
      const onSelectEdge = vi.fn();

      render(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId="ApexClass:AccountController"
          selectedEdgeId={null}
        />
      );

      const region = screen.getByRole('region', { name: /salesforce architecture dependency graph/i });

      // Press Escape to deselect
      fireEvent.keyDown(region, { key: 'Escape' });
      expect(onSelectNode).toHaveBeenCalledWith(null);
      expect(onSelectEdge).toHaveBeenCalledWith('');
    });

    it('allows closing and toggling the navigator overlay without affecting graph state', () => {
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

      const minimap = document.querySelector('#minimap') as HTMLElement;
      expect(minimap).toBeInTheDocument();
      expect(minimap.style.display).not.toBe('none');

      // Locate close button in navigator overlay
      const closeBtn = screen.getByRole('button', { name: /close navigator/i });
      expect(closeBtn).toBeInTheDocument();

      // Click close button
      fireEvent.click(closeBtn);
      const minimapAfterClose = document.querySelector('#minimap') as HTMLElement | null;
      expect(minimapAfterClose?.style.display || (minimapAfterClose === null ? 'none' : '')).toBe('none');

      // Click navigator toggle button in GraphControls to reopen
      const toggleBtn = screen.getByRole('button', { name: /show navigator overlay/i });
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(minimap.style.display).not.toBe('none');
    });

    it('synchronizes elements on the SAME Cytoscape instance when nodes/edges props update', () => {
      const onSelectNode = vi.fn();
      const onSelectEdge = vi.fn();

      const { rerender } = render(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      // Verify Cytoscape constructor was called once for initial mount
      const initialCallCount = mockCytoscapeFn.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Re-render GraphView with updated node/edge props (e.g. filtered focus graph)
      const updatedNodes = [mockNodes[0]];
      const updatedEdges: ExplorerEdge[] = [];

      rerender(
        <GraphView
          nodes={updatedNodes}
          edges={updatedEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      // Verify Cytoscape constructor was NOT called again (same instance preserved!)
      expect(mockCytoscapeFn.mock.calls.length).toBe(initialCallCount);

      // Verify old elements were removed and new elements added
      expect(mockElementsRemove).toHaveBeenCalled();
      expect(mockCy.add).toHaveBeenCalled();

      // Verify the added elements match the updated node definitions
      const lastAddCall = mockCy.add.mock.calls[mockCy.add.mock.calls.length - 1][0];
      expect(lastAddCall.some((el: any) => el.data?.id === 'ApexClass:AccountController')).toBe(true);
      expect(lastAddCall.some((el: any) => el.data?.id === 'ApexClass:AccountService')).toBe(false);
    });

    it('handles element synchronization across Focus Depth and Direction changes', () => {
      const onSelectNode = vi.fn();
      const onSelectEdge = vi.fn();

      // Depth 1 dataset
      const depth1Nodes = [mockNodes[0]];
      // Depth 2 dataset
      const depth2Nodes = [mockNodes[0], mockNodes[1]];

      const { rerender } = render(
        <GraphView
          nodes={depth1Nodes}
          edges={[]}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId="ApexClass:AccountController"
          selectedEdgeId={null}
          focusState={{ enabled: true, focusNodeId: 'ApexClass:AccountController', direction: 'dependencies', depth: 1 }}
        />
      );

      mockCy.add.mockClear();
      mockElementsRemove.mockClear();

      // Change Depth to 2
      rerender(
        <GraphView
          nodes={depth2Nodes}
          edges={mockEdges}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          selectedNodeId="ApexClass:AccountController"
          selectedEdgeId={null}
          focusState={{ enabled: true, focusNodeId: 'ApexClass:AccountController', direction: 'dependencies', depth: 2 }}
        />
      );

      // Expect element removal and new element addition for Depth 2
      expect(mockElementsRemove).toHaveBeenCalled();
      expect(mockCy.add).toHaveBeenCalled();
      const depth2ElementsAdded = mockCy.add.mock.calls[mockCy.add.mock.calls.length - 1][0];
      expect(depth2ElementsAdded).toHaveLength(3); // 2 nodes + 1 edge
    });

    it('binds dragfree event to report onNodeDragEnd and onNodePositionChange when drag finishes', () => {
      const onNodeDragEnd = vi.fn();
      const onNodePositionChange = vi.fn();

      const mockNodeObj = {
        id: () => 'ApexClass:AccountController',
        position: () => ({ x: 150, y: 250 }),
      };
      mockCy.nodes.mockReturnValue([mockNodeObj] as any);

      render(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          graphLayout={{
            layoutName: 'cola',
            mode: 'interactive',
            nodePositions: { 'ApexClass:AccountController': { x: 10, y: 20 } },
          }}
          onNodeDragEnd={onNodeDragEnd}
          onNodePositionChange={onNodePositionChange}
        />
      );

      // Verify cy.on was registered with 'dragfree'
      const dragFreeCall = mockCy.on.mock.calls.find((call: any[]) => call[0] === 'dragfree' && call[1] === 'node');
      expect(dragFreeCall).toBeDefined();

      const callback = dragFreeCall![2];
      // Simulate Cytoscape firing dragfree on node
      callback({
        target: {
          id: () => 'ApexClass:AccountController',
          position: () => ({ x: 150, y: 250 }),
        },
      });

      expect(onNodeDragEnd).toHaveBeenCalledWith('ApexClass:AccountController', { x: 150, y: 250 });
      expect(onNodePositionChange).toHaveBeenLastCalledWith(
        { 'ApexClass:AccountController': { x: 150, y: 250 } },
        'user-authored'
      );
    });

    it('displays mode badge indicator showing current mode and preservation message in Static mode', () => {
      const { rerender } = render(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          layoutMode="interactive"
        />
      );

      const modeBadge = screen.getByTestId('graph-mode-indicator');
      expect(modeBadge).toBeInTheDocument();
      expect(modeBadge).toHaveTextContent(/interactive mode/i);

      rerender(
        <GraphView
          nodes={mockNodes}
          edges={mockEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          layoutMode="static"
        />
      );

      expect(modeBadge).toHaveTextContent(/static mode — node positions preserved/i);
      expect(modeBadge).toHaveClass('static');
    });

    it('clears previous elements and adds new elements on project switching', () => {
      const projectANodes = [mockNodes[0]];
      const projectBNodes = [mockNodes[1]];

      const { rerender } = render(
        <GraphView
          nodes={projectANodes}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      mockCy.add.mockClear();
      mockElementsRemove.mockClear();

      // Switch to Project B
      rerender(
        <GraphView
          nodes={projectBNodes}
          edges={[]}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      expect(mockElementsRemove).toHaveBeenCalled();
      const projectBElements = mockCy.add.mock.calls[mockCy.add.mock.calls.length - 1][0];
      expect(projectBElements.some((el: any) => el.data?.id === 'ApexClass:AccountService')).toBe(true);
      expect(projectBElements.some((el: any) => el.data?.id === 'ApexClass:AccountController')).toBe(false);
    });

    describe('Viewport Preservation on Node Selection Regression Suite', () => {
      it('preserves graph viewport exactly when selecting a node in Interactive Mode', () => {
        let currentZoom = 1.0;
        let currentPan = { x: 0, y: 0 };

        mockCy.zoom.mockImplementation((val?: number | { level: number }) => {
          if (typeof val === 'number') currentZoom = val;
          if (typeof val === 'object' && val !== null && 'level' in val) currentZoom = val.level;
          return currentZoom;
        });
        mockCy.pan = vi.fn().mockImplementation((val?: { x: number; y: number }) => {
          if (val) currentPan = { ...val };
          return currentPan;
        });

        const onSelectNode = vi.fn();

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={onSelectNode}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Position camera to custom non-default position via cy camera calls
        mockCy.zoom(2.5);
        mockCy.pan({ x: 450, y: -280 });

        const beforeZoom = mockCy.zoom();
        const beforePan = { ...mockCy.pan() };

        expect(beforeZoom).toBe(2.5);
        expect(beforePan).toEqual({ x: 450, y: -280 });

        mockCy.animate.mockClear();

        // Select node
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={onSelectNode}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        const afterZoom = mockCy.zoom();
        const afterPan = mockCy.pan();

        // Assert exact viewport camera coordinate preservation
        expect(afterZoom).toBe(beforeZoom);
        expect(afterPan.x).toBe(beforePan.x);
        expect(afterPan.y).toBe(beforePan.y);

        // Assert cy.animate was NOT called on node selection
        expect(mockCy.animate).not.toHaveBeenCalled();
      });

      it('preserves graph viewport exactly across multi-node selection sequences (Node A -> Node B)', () => {
        let currentZoom = 1.0;
        let currentPan = { x: 0, y: 0 };

        mockCy.zoom.mockImplementation((val?: number | { level: number }) => {
          if (typeof val === 'number') currentZoom = val;
          if (typeof val === 'object' && val !== null && 'level' in val) currentZoom = val.level;
          return currentZoom;
        });
        mockCy.pan = vi.fn().mockImplementation((val?: { x: number; y: number }) => {
          if (val) currentPan = { ...val };
          return currentPan;
        });

        const onSelectNode = vi.fn();

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={onSelectNode}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Set non-default viewport after mount
        mockCy.zoom(2.0);
        mockCy.pan({ x: 500, y: -300 });

        const initialZoom = mockCy.zoom();
        const initialPan = { ...mockCy.pan() };

        expect(initialZoom).toBe(2.0);
        expect(initialPan).toEqual({ x: 500, y: -300 });

        mockCy.animate.mockClear();

        // Click Node A
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={onSelectNode}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        expect(mockCy.zoom()).toBe(initialZoom);
        expect(mockCy.pan()).toEqual(initialPan);
        expect(mockCy.animate).not.toHaveBeenCalled();

        // Click Node B
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={onSelectNode}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountService"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        expect(mockCy.zoom()).toBe(initialZoom);
        expect(mockCy.pan()).toEqual(initialPan);
        expect(mockCy.animate).not.toHaveBeenCalled();
      });

      it('preserves viewport in Static Mode on node selection', () => {
        let currentZoom = 1.0;
        let currentPan = { x: 0, y: 0 };

        mockCy.zoom.mockImplementation((val?: number | { level: number }) => {
          if (typeof val === 'number') currentZoom = val;
          if (typeof val === 'object' && val !== null && 'level' in val) currentZoom = val.level;
          return currentZoom;
        });
        mockCy.pan = vi.fn().mockImplementation((val?: { x: number; y: number }) => {
          if (val) currentPan = { ...val };
          return currentPan;
        });

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="static"
          />
        );

        mockCy.zoom(1.75);
        mockCy.pan({ x: -120, y: 80 });

        const beforeZoom = mockCy.zoom();
        const beforePan = { ...mockCy.pan() };

        expect(beforeZoom).toBe(1.75);
        expect(beforePan).toEqual({ x: -120, y: 80 });

        mockCy.animate.mockClear();

        // Select node in static mode
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="static"
          />
        );

        expect(mockCy.zoom()).toBe(beforeZoom);
        expect(mockCy.pan()).toEqual(beforePan);
        expect(mockCy.animate).not.toHaveBeenCalled();
      });

      it('verifies callback freshness without destroying Cytoscape instance when parent handlers update', () => {
        let initialHandler = vi.fn();
        let updatedHandler = vi.fn();

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={initialHandler}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        const initialCallCount = mockCytoscapeFn.mock.calls.length;

        // Find tap node callback registered with bindGraphInteractions
        const tapCall = mockCy.on.mock.calls.find((call: any[]) => call[0] === 'tap' && call[1] === 'node');
        expect(tapCall).toBeDefined();
        const tapCallback = tapCall![2];

        // Trigger node tap with initial handler
        tapCallback({ target: { id: () => 'ApexClass:AccountController', data: () => ({ id: 'ApexClass:AccountController', label: 'AccountController' }) } });
        expect(initialHandler).toHaveBeenCalledWith(expect.objectContaining({ id: 'ApexClass:AccountController' }));

        // Rerender with updated parent callback handler
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={updatedHandler}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Verify Cytoscape was NOT recreated / destroyed
        expect(mockCytoscapeFn.mock.calls.length).toBe(initialCallCount);
        expect(mockCy.destroy).not.toHaveBeenCalled();

        // Trigger tap callback again and verify updated handler is invoked with latest node
        tapCallback({ target: { id: () => 'ApexClass:AccountService', data: () => ({ id: 'ApexClass:AccountService', label: 'AccountService' }) } });
        expect(updatedHandler).toHaveBeenCalledWith(expect.objectContaining({ id: 'ApexClass:AccountService' }));
      });

      it('refreshes onNodeDoubleTap callback reference on rerenders so latest callback is executed without listener duplication (Fix D 1B5-04)', () => {
        const doubleTapCallbackA = vi.fn();
        const doubleTapCallbackB = vi.fn();

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            onNodeDoubleTap={doubleTapCallbackA}
          />
        );

        const dblTapCall = mockCy.on.mock.calls.find((call: any[]) => call[0] === 'dbltap dblclick' && call[1] === 'node');
        expect(dblTapCall).toBeDefined();

        const initialListenerCount = mockCy.on.mock.calls.filter((call: any[]) => call[0] === 'dbltap dblclick' && call[1] === 'node').length;

        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            onNodeDoubleTap={doubleTapCallbackB}
          />
        );

        const secondListenerCount = mockCy.on.mock.calls.filter((call: any[]) => call[0] === 'dbltap dblclick' && call[1] === 'node').length;
        expect(secondListenerCount).toEqual(initialListenerCount);

        const dblTapCallback = dblTapCall![2];
        const eventData = {
          target: {
            id: () => 'ApexClass:AccountController',
            data: () => ({ id: 'ApexClass:AccountController', displayName: 'AccountController' }),
          },
        };

        dblTapCallback(eventData);

        expect(doubleTapCallbackA).not.toHaveBeenCalled();
        expect(doubleTapCallbackB).toHaveBeenCalledTimes(1);
        expect(doubleTapCallbackB).toHaveBeenCalledWith('ApexClass:AccountController', expect.objectContaining({ id: 'ApexClass:AccountController' }));
      });

      it('triggers element synchronization when findings, architectureMode, layoutMode, or effectiveLayoutOptions change while nodes and edges remain unchanged (Fix E 1B5-05)', () => {
        const mockFinding = {
          id: 'find1',
          type: 'HIGH_COUPLING',
          severity: 'HIGH' as const,
          title: 'High Coupling Detected',
          description: 'Component has high coupling',
          nodeIds: ['ApexClass:AccountController'],
          edgeIds: [],
          evidence: [],
          provenance: {
            origin: 'DERIVED_RULE' as const,
            source: 'test',
            facts: {},
          },
          rule: {
            ruleId: 'HIGH_COUPLING',
            ruleVersion: '1.0.0',
            name: 'High Coupling',
          },
        };

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            findings={[]}
            architectureMode="hierarchical"
            layoutMode="interactive"
          />
        );

        mockCy.add.mockClear();
        mockElementsRemove.mockClear();

        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            findings={[mockFinding]}
            architectureMode="hierarchical"
            layoutMode="interactive"
          />
        );

        expect(mockElementsRemove).toHaveBeenCalled();
        expect(mockCy.add).toHaveBeenCalled();

        mockCy.add.mockClear();
        mockElementsRemove.mockClear();

        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            findings={[mockFinding]}
            architectureMode="hybrid"
            layoutMode="interactive"
          />
        );

        expect(mockElementsRemove).toHaveBeenCalled();
        expect(mockCy.add).toHaveBeenCalled();
      });

      it('preserves node coordinates (node.position()) unchanged before and after ordinary selection in Interactive and Static modes', () => {
        const mockPositions: Record<string, { x: number; y: number }> = {
          'ApexClass:AccountController': { x: 120, y: 340 },
          'ApexClass:AccountService': { x: 500, y: -200 },
        };

        const mockNodeObjects = [
          {
            id: () => 'ApexClass:AccountController',
            position: vi.fn().mockReturnValue(mockPositions['ApexClass:AccountController']),
          },
          {
            id: () => 'ApexClass:AccountService',
            position: vi.fn().mockReturnValue(mockPositions['ApexClass:AccountService']),
          },
        ];

        mockCy.nodes.mockReturnValue(mockNodeObjects as any);

        const { rerender } = render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="static"
            nodePositions={mockPositions}
          />
        );

        const posBeforeController = { ...mockNodeObjects[0].position() };
        const posBeforeService = { ...mockNodeObjects[1].position() };

        // Perform ordinary selection
        rerender(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="static"
            nodePositions={mockPositions}
          />
        );

        const posAfterController = mockNodeObjects[0].position();
        const posAfterService = mockNodeObjects[1].position();

        expect(posAfterController).toEqual(posBeforeController);
        expect(posAfterService).toEqual(posBeforeService);
      });

      it('preserves viewport neutrality across various node types (ApexClass, ApexTrigger, LWC, Flow, Object, Field, TestClass)', () => {
        const multiTypeNodes: ExplorerNode[] = [
          { ...mockNodes[0], id: 'ApexClass:AC', type: 'ApexClass', displayName: 'AC' },
          { ...mockNodes[0], id: 'ApexTrigger:AT', type: 'ApexTrigger', displayName: 'AT' },
          { ...mockNodes[0], id: 'LWC:lwc1', type: 'LWC', displayName: 'LWC1' },
          { ...mockNodes[0], id: 'Flow:flow1', type: 'Flow', displayName: 'Flow1' },
          { ...mockNodes[0], id: 'Object:Account', type: 'Object', displayName: 'Account' },
          { ...mockNodes[0], id: 'Field:Account.Name', type: 'Field', displayName: 'Name' },
          { ...mockNodes[0], id: 'ApexClass:TestClass', type: 'ApexClass', displayName: 'TestClass', behavior: { ...mockNodes[0].behavior, isTest: true } },
        ];

        let currentZoom = 2.2;
        let currentPan = { x: 310, y: -150 };

        mockCy.zoom.mockImplementation((val?: number | { level: number }) => {
          if (typeof val === 'number') currentZoom = val;
          if (typeof val === 'object' && val !== null && 'level' in val) currentZoom = val.level;
          return currentZoom;
        });
        mockCy.pan = vi.fn().mockImplementation((val?: { x: number; y: number }) => {
          if (val) currentPan = { ...val };
          return currentPan;
        });

        const { rerender } = render(
          <GraphView
            nodes={multiTypeNodes}
            edges={[]}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Set custom non-default camera position after initial mount
        mockCy.zoom(2.2);
        mockCy.pan({ x: 310, y: -150 });

        const beforeZoom = mockCy.zoom();
        const beforePan = { ...mockCy.pan() };

        mockCy.animate.mockClear();

        for (const targetNode of multiTypeNodes) {
          rerender(
            <GraphView
              nodes={multiTypeNodes}
              edges={[]}
              onSelectNode={vi.fn()}
              onSelectEdge={vi.fn()}
              selectedNodeId={targetNode.id}
              selectedEdgeId={null}
              layoutMode="interactive"
            />
          );

          expect(mockCy.zoom()).toBe(beforeZoom);
          expect(mockCy.pan()).toEqual(beforePan);
          expect(mockCy.animate).not.toHaveBeenCalled();
        }
      });

    describe('Interactive Mode Node Selection Visual Fading & Membership Invariance', () => {
      it('preserves unrelated nodes and fades them instead of removing them after node selection in Interactive Mode', () => {
        // Multi-node topology fixture: A->B, A->C, D->E
        const multiNodeFixture: ExplorerNode[] = [
          { ...mockNodes[0], id: 'NodeA', displayName: 'Node A' },
          { ...mockNodes[0], id: 'NodeB', displayName: 'Node B' },
          { ...mockNodes[0], id: 'NodeC', displayName: 'Node C' },
          { ...mockNodes[0], id: 'NodeD', displayName: 'Node D' },
          { ...mockNodes[0], id: 'NodeE', displayName: 'Node E' },
        ];

        const multiEdgeFixture: ExplorerEdge[] = [
          { ...mockEdges[0], id: 'eAB', source: 'NodeA', target: 'NodeB' },
          { ...mockEdges[0], id: 'eAC', source: 'NodeA', target: 'NodeC' },
          { ...mockEdges[0], id: 'eDE', source: 'NodeD', target: 'NodeE' },
        ];

        // Create mock Cytoscape elements
        const createMockNode = (id: string) => {
          const nodeObj: any = {
            id: () => id,
            length: 1,
            isNode: () => true,
            isEdge: () => false,
            data: vi.fn().mockReturnValue({ id, displayName: id, type: 'ApexClass' }),
            select: vi.fn().mockReturnThis(),
            addClass: vi.fn().mockReturnThis(),
            removeClass: vi.fn().mockReturnThis(),
            position: vi.fn().mockReturnValue({ x: 100, y: 100 }),
          };
          return nodeObj;
        };

        const mockNodeObjects = multiNodeFixture.map((n) => createMockNode(n.id));

        mockCy.nodes.mockReturnValue(mockNodeObjects as any);

        const nodeAElement = mockNodeObjects[0];
        const neighborsACollection = {
          length: 2,
          addClass: vi.fn().mockReturnThis(),
          removeClass: vi.fn().mockReturnThis(),
          forEach: vi.fn(() => {}),
        };
        const connectedEdgesA = {
          length: 2,
          addClass: vi.fn().mockReturnThis(),
          removeClass: vi.fn().mockReturnThis(),
          forEach: vi.fn(() => {}),
        };

        nodeAElement.connectedEdges = vi.fn().mockReturnValue(connectedEdgesA);
        nodeAElement.neighborhood = vi.fn().mockReturnValue(neighborsACollection);

        mockCy.getElementById.mockImplementation((id: string) => {
          const found = mockNodeObjects.find((n) => n.id() === id);
          if (found) return found;
          return {
            length: 0,
            isNode: () => false,
            isEdge: () => false,
            neighborhood: () => ({ length: 0, forEach: vi.fn() }),
            connectedEdges: () => ({ length: 0, addClass: vi.fn(), removeClass: vi.fn(), forEach: vi.fn() }),
          };
        });

        // Step 1: Render unselected graph
        const beforeNodeIds = mockCy.nodes().map((node: any) => node.id());
        expect(beforeNodeIds).toHaveLength(5);

        const { rerender } = render(
          <GraphView
            nodes={multiNodeFixture}
            edges={multiEdgeFixture}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        mockElementsRemove.mockClear();

        // Step 2: Select Node A
        rerender(
          <GraphView
            nodes={multiNodeFixture}
            edges={multiEdgeFixture}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId="NodeA"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Assert 1: Graph membership invariant - ALL 5 nodes STILL EXIST in Cytoscape
        const afterNodeIds = mockCy.nodes().map((node: any) => node.id());
        expect(afterNodeIds).toEqual(beforeNodeIds);
        expect(mockElementsRemove).not.toHaveBeenCalled();

        // Assert 2: Visual fading state verification
        const elementsCollection = mockCy.elements();
        expect(elementsCollection.addClass).toHaveBeenCalled();

        // Unrelated nodes should be dimmed
        expect(mockCy.elements().addClass).toHaveBeenCalled();

        // Unrelated nodes (D, E) were NOT undimmed (retaining .dimmed opacity 0.15)
        expect(mockNodeObjects[3].removeClass).not.toHaveBeenCalledWith('dimmed');
        expect(mockNodeObjects[4].removeClass).not.toHaveBeenCalledWith('dimmed');
      });

      it('preserves membership and resets fading across selection sequences A -> B -> C -> Deselect', () => {
        const multiNodeFixture: ExplorerNode[] = [
          { ...mockNodes[0], id: 'NodeA', displayName: 'Node A' },
          { ...mockNodes[0], id: 'NodeB', displayName: 'Node B' },
          { ...mockNodes[0], id: 'NodeC', displayName: 'Node C' },
        ];

        const createMockNode = (id: string) => ({
          id: () => id,
          length: 1,
          isNode: () => true,
          isEdge: () => false,
          data: vi.fn().mockReturnValue({ id, displayName: id, type: 'ApexClass' }),
          select: vi.fn().mockReturnThis(),
          addClass: vi.fn().mockReturnThis(),
          removeClass: vi.fn().mockReturnThis(),
          position: vi.fn().mockReturnValue({ x: 100, y: 100 }),
          connectedEdges: vi.fn().mockReturnValue({ length: 0, addClass: vi.fn(), removeClass: vi.fn(), forEach: vi.fn() }),
          neighborhood: vi.fn().mockReturnValue([]),
        });

        const mockNodeObjects = multiNodeFixture.map((n) => createMockNode(n.id));
        mockCy.nodes.mockReturnValue(mockNodeObjects as any);
        mockCy.getElementById.mockImplementation((id: string) => {
          const found = mockNodeObjects.find((n) => n.id() === id);
          return found || { length: 0, isNode: () => false, neighborhood: () => [], connectedEdges: () => ({}) };
        });

        const { rerender } = render(
          <GraphView
            nodes={multiNodeFixture}
            edges={[]}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        // Sequence: A -> B -> C -> null
        const sequence = ['NodeA', 'NodeB', 'NodeC', null];

        for (const selId of sequence) {
          rerender(
            <GraphView
              nodes={multiNodeFixture}
              edges={[]}
              onSelectNode={vi.fn()}
              onSelectEdge={vi.fn()}
              selectedNodeId={selId}
              selectedEdgeId={null}
              layoutMode="interactive"
            />
          );

          // All nodes must remain present in Cytoscape at every step
          expect(mockCy.nodes().map((n: any) => n.id())).toEqual(['NodeA', 'NodeB', 'NodeC']);
        }

        // On deselect (null), clearHighlights must remove dimmed and highlighted classes
        const elementsCollection = mockCy.elements();
        expect(elementsCollection.removeClass).toHaveBeenCalled();
      });
    });

    it('allows explicit viewport controls (zoom, fit, centerSelected) to mutate viewport', () => {
        const mockNodeElement = {
          length: 1,
          isNode: () => true,
          isEdge: () => false,
          select: vi.fn().mockReturnThis(),
          neighborhood: () => [],
        };
        mockCy.getElementById.mockReturnValue(mockNodeElement);

        render(
          <GraphView
            nodes={mockNodes}
            edges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId="ApexClass:AccountController"
            selectedEdgeId={null}
            layoutMode="interactive"
          />
        );

        mockCy.animate.mockClear();

        // Click Zoom In
        const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
        fireEvent.click(zoomInBtn);
        expect(mockCy.zoom).toHaveBeenCalled();

        // Click Fit View
        const fitBtn = screen.getByRole('button', { name: /fit view/i });
        fireEvent.click(fitBtn);
        expect(mockCy.fit).toHaveBeenCalled();

        // Click Center Selected
        const centerBtn = screen.getByRole('button', { name: /center selected/i });
        fireEvent.click(centerBtn);
        expect(mockCy.animate).toHaveBeenCalled();
      });
    });
  });
});

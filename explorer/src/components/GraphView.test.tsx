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
    remove: mockElementsRemove
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
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

      // Verify accessible tree
      const tree = screen.getByRole('tree', { name: /component nodes/i });
      expect(tree).toBeInTheDocument();
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems).toHaveLength(2);
      expect(treeItems[0]).toHaveTextContent('AccountController');

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
      expect(onNodePositionChange).toHaveBeenCalledWith({
        'ApexClass:AccountController': { x: 150, y: 250 },
      });
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
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { GraphView, GraphViewRef } from './GraphView';
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape and plugins
vi.mock('cytoscape', () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue({
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      unselect: vi.fn().mockReturnThis()
    }),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
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

  const cytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  cytoscapeFn.use = vi.fn();
  return { default: cytoscapeFn };
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
      expect(document.querySelector('#minimap')?.style.display || (document.querySelector('#minimap') === null ? 'none' : '')).toBe('none');

      // Click navigator toggle button in GraphControls to reopen
      const toggleBtn = screen.getByRole('button', { name: /show navigator overlay/i });
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(minimap.style.display).not.toBe('none');
    });
  });
});

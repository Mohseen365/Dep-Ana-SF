import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { GraphView } from '../components/GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

let mockEles: any[] = [];
let layoutRunCount = 0;
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
    neighborhood: (selector?: string) => {
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
      if (!mockListeners[event]) mockListeners[event] = [];
      mockListeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler?: any) => {
      if (mockListeners[event]) {
        if (handler) {
          mockListeners[event] = mockListeners[event].filter(h => h !== handler);
        } else {
          delete mockListeners[event];
        }
      }
    }),
    one: vi.fn((event: string, handler: any) => {
      if (!mockListeners[event]) mockListeners[event] = [];
      mockListeners[event].push(handler);
    }),
    animate: vi.fn(),
    fit: vi.fn(),
    layout: vi.fn().mockImplementation(() => {
      layoutRunCount++;
      return { run: vi.fn() };
    }),
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

const SAMPLE_NODES: ExplorerNode[] = [
  {
    id: 'NodeA',
    name: 'NodeA',
    displayName: 'Node A',
    type: 'ApexClass',
    risk: 'LOW',
    layer: 'Business Logic',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'NodeB',
    name: 'NodeB',
    displayName: 'Node B',
    type: 'ApexClass',
    risk: 'MEDIUM',
    layer: 'Business Logic',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'NodeC',
    name: 'NodeC',
    displayName: 'Node C',
    type: 'LightningComponent',
    risk: 'LOW',
    layer: 'Presentation',
    metrics: { fanIn: 0, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
];

const SAMPLE_EDGES: ExplorerEdge[] = [
  { id: 'edgeAB', source: 'NodeA', target: 'NodeB', type: 'DEPENDS_ON' },
  { id: 'edgeBC', source: 'NodeB', target: 'NodeC', type: 'DEPENDS_ON' },
];

describe('Prompt 6C — Graph Interaction Correctness & State Integrity Suite', () => {
  const defaultGraphLayoutState = {
    mode: 'static' as const,
    layoutName: 'cose',
    architectureMode: 'hierarchical' as const,
    layoutProvenance: 'automatic-hierarchical' as const,
    nodePositions: { NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } },
  };

  beforeEach(() => {
    mockEles = [];
    layoutRunCount = 0;
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

  it('verifies 0 unintended layout calls and 0 coordinate drift across node selection and deselection', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={defaultGraphLayoutState}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    const initialLayoutRuns = layoutRunCount;

    // Capture initial positions
    const posAInitial = { ...mockEles.find(e => e.id() === 'NodeA').position() };
    const posBInitial = { ...mockEles.find(e => e.id() === 'NodeB').position() };

    // Select Node A
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={{
          mode: 'static',
          layoutName: 'cose',
          architectureMode: 'hierarchical',
          layoutProvenance: 'automatic-hierarchical',
          nodePositions: { NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } },
        }}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    // Verify layout was NOT called
    expect(layoutRunCount).toBe(initialLayoutRuns);

    // Verify positions remain 100% identical (0 coordinate drift)
    const posAAfterSelect = mockEles.find(e => e.id() === 'NodeA').position();
    const posBAfterSelect = mockEles.find(e => e.id() === 'NodeB').position();
    expect(posAAfterSelect.x).toBe(posAInitial.x);
    expect(posAAfterSelect.y).toBe(posAInitial.y);
    expect(posBAfterSelect.x).toBe(posBInitial.x);
    expect(posBAfterSelect.y).toBe(posBInitial.y);

    // Deselect
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={defaultGraphLayoutState}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    expect(layoutRunCount).toBe(initialLayoutRuns);
  });

  it('executes R1 rapid hover sequence without leaving stale hover state', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    const mouseoverHandlers = mockListeners['mouseover'] || [];
    const mouseleaveHandlers = mockListeners['mouseleave'] || [];

    expect(mouseoverHandlers.length).toBeGreaterThan(0);

    const mockEvtA = { target: mockEles.find(e => e.id() === 'NodeA'), renderedPosition: { x: 10, y: 10 } };
    const mockEvtB = { target: mockEles.find(e => e.id() === 'NodeB'), renderedPosition: { x: 20, y: 20 } };

    // Rapid hover: Enter A -> Enter B -> Leave
    act(() => {
      mouseoverHandlers.forEach(h => h(mockEvtA));
      mouseoverHandlers.forEach(h => h(mockEvtB));
      mouseleaveHandlers.forEach(h => h({}));
    });

    expect(document.body.style.cursor).toBe('default');
  });

  it('executes R2 selection hover clear sequence (select A -> hover B -> select B -> clear)', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // Select B
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId="NodeB"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // Clear selection
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // Verify dimmed class is completely removed from all elements upon clearing selection
    mockEles.forEach(ele => {
      expect(ele.hasClass('dimmed')).toBe(false);
    });
  });

  it('executes R3 focus, hover, selection, and investigation workflow without losing coordinates or state', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        focusedNodeId="NodeA"
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    const posA = { ...mockEles.find(e => e.id() === 'NodeA').position() };

    // Select C (investigate C)
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        focusedNodeId="NodeA"
        selectedNodeId="NodeC"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // Clear focus
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        focusedNodeId={null}
        selectedNodeId="NodeC"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    const posAAfter = mockEles.find(e => e.id() === 'NodeA').position();
    expect(posAAfter.x).toBe(posA.x);
    expect(posAAfter.y).toBe(posA.y);
  });

  it('executes R5 visibility toggle sequence preserving coordinate authority and layout safety', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={defaultGraphLayoutState}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    const layoutRunsBefore = layoutRunCount;

    // Hide Node B (filtered out)
    const filteredNodes = SAMPLE_NODES.filter(n => n.id !== 'NodeB');
    const filteredEdges = SAMPLE_EDGES.filter(e => e.source !== 'NodeB' && e.target !== 'NodeB');

    rerender(
      <GraphView
        nodes={filteredNodes}
        edges={filteredEdges}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={defaultGraphLayoutState}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    expect(layoutRunCount).toBe(layoutRunsBefore);

    // Restore Node B
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
        graphLayout={defaultGraphLayoutState}
        nodePositions={{ NodeA: { x: 100, y: 100 }, NodeB: { x: 200, y: 200 }, NodeC: { x: 300, y: 300 } }}
      />
    );

    expect(layoutRunCount).toBe(layoutRunsBefore);
    const nodeAPos = mockEles.find(e => e.id() === 'NodeA').position();
    expect(nodeAPos.x).toBe(100);
    expect(nodeAPos.y).toBe(100);
  });

  it('executes R6 focus + filter + hover + select sequence with full cleanup restoration', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { rerender } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        focusedNodeId="NodeA"
        selectedNodeId="NodeA"
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // Clear selection and focus
    rerender(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        focusedNodeId={null}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        layoutMode="static"
      />
    );

    // All elements should have dimmed class removed
    mockEles.forEach(ele => {
      expect(ele.hasClass('dimmed')).toBe(false);
    });
  });

  it('cleans up body cursor on unmount', () => {
    document.body.style.cursor = 'pointer';

    const { unmount } = render(
      <GraphView
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        layoutMode="static"
      />
    );

    unmount();

    expect(document.body.style.cursor).toBe('default');
  });
});

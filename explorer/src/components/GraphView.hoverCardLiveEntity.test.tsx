import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';
import { createMockNode, createMockEdge } from '../test/mock-factories';

let mockListeners: Record<string, Function[]> = {};

vi.mock('cytoscape', () => {
  const mockElements = {
    remove: vi.fn(),
    removeClass: vi.fn(),
    addClass: vi.fn(),
    unselect: vi.fn(),
    select: vi.fn(),
    forEach: vi.fn(),
    filter: vi.fn(() => ({ forEach: vi.fn() })),
  };
  const mockCy = {
    on: vi.fn((event: string, selectorOrCb: any, cb?: any) => {
      const evtName = typeof selectorOrCb === 'string' ? `${event}:${selectorOrCb}` : event;
      const handler = typeof selectorOrCb === 'function' ? selectorOrCb : cb;
      if (!mockListeners[evtName]) mockListeners[evtName] = [];
      mockListeners[evtName].push(handler);
    }),
    off: vi.fn(),
    destroy: vi.fn(),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    zoom: vi.fn(() => 1),
    nodes: vi.fn(() => []),
    edges: vi.fn(() => []),
    batch: vi.fn((fn: () => void) => fn()),
    elements: vi.fn(() => mockElements),
    add: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    resize: vi.fn(),
    userZoomingEnabled: vi.fn(),
    fit: vi.fn(),
    center: vi.fn(),
    $: vi.fn(() => ({ select: vi.fn(), unselect: vi.fn(), removeClass: vi.fn(), addClass: vi.fn() })),
  };
  const cytoscapeFn = vi.fn(() => mockCy) as any;
  cytoscapeFn.use = vi.fn();
  return {
    default: cytoscapeFn,
  };
});

import { GraphView } from './GraphView';

describe('GraphView Hover Card Live Entity Lookup', () => {
  beforeEach(() => {
    mockListeners = {};
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const node1: ExplorerNode = createMockNode('node-1', 'Node 1 Initial', 'ApexClass', 'LOW');

  const node2: ExplorerNode = createMockNode('node-2', 'Node 2 Initial', 'ApexClass', 'LOW');

  const edge1: ExplorerEdge = createMockEdge('edge-1', 'node-1', 'node-2', 'method-call');

  it('updates node hover card when nodes or findings prop changes, and hides card if node is removed', () => {
    const { rerender, container } = render(
      <GraphView
        nodes={[node1, node2]}
        edges={[edge1]}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
      />
    );

    // Trigger mouseover for node
    act(() => {
      const handlers = mockListeners['mouseover:node'] || [];
      handlers.forEach((fn) =>
        fn({
          target: { id: () => 'node-1', addClass: vi.fn(), removeClass: vi.fn() },
          renderedPosition: { x: 100, y: 100 },
        })
      );
      vi.advanceTimersByTime(300);
    });

    const hoverCardEl = container.querySelector('.node-hover-card');
    expect(hoverCardEl).not.toBeNull();
    expect(hoverCardEl).toHaveTextContent('Node 1 Initial');

    // Rerender with updated node displayName and updated findings
    const updatedNode1: ExplorerNode = {
      ...node1,
      displayName: 'Node 1 Updated',
    };
    const findings: ArchitectureFinding[] = [
      {
        id: 'f1',
        title: 'High Coupling',
        severity: 'HIGH',
        type: 'HIGH_COUPLING',
        description: 'High coupling detected',
        nodeIds: ['node-1'],
        edgeIds: [],
        evidence: [],
        provenance: {
          origin: 'DERIVED_RULE',
          source: 'CouplingRule',
          facts: {},
        },
        rule: {
          ruleId: 'HIGH_COUPLING',
          ruleVersion: '1.0.0',
          name: 'High Coupling',
        },
      },
    ];

    rerender(
      <GraphView
        nodes={[updatedNode1, node2]}
        edges={[edge1]}
        findings={findings}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
      />
    );

    const updatedCardEl = container.querySelector('.node-hover-card');
    expect(updatedCardEl).not.toBeNull();
    expect(updatedCardEl).toHaveTextContent('Node 1 Updated');
    expect(updatedCardEl).toHaveTextContent('1 issue');

    // Rerender with node-1 removed from nodes prop
    rerender(
      <GraphView
        nodes={[node2]}
        edges={[]}
        selectedNodeId={null}
        selectedEdgeId={null}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
      />
    );

    expect(container.querySelector('.node-hover-card')).toBeNull();
  });
});

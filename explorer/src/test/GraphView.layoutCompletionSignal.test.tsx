import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { GraphView } from '../components/GraphView';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

vi.mock('cytoscape', () => {
  const mockCy = {
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    elements: vi.fn().mockReturnValue({
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      unselect: vi.fn().mockReturnThis(),
    }),
    style: vi.fn().mockReturnThis(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    on: vi.fn(),
    off: vi.fn(),
    one: vi.fn(),
    add: vi.fn(),
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    resize: vi.fn(),
    batch: vi.fn((cb) => cb()),
    destroy: vi.fn(),
    getElementById: vi.fn().mockReturnValue([]),
  };
  const cytoscape = vi.fn().mockReturnValue(mockCy);
  (cytoscape as any).use = vi.fn();
  return { default: cytoscape };
});

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

describe('GraphView Layout Completion Event Signal Suite', () => {
  const dummyNodes: ExplorerNode[] = [
    {
      id: 'node1',
      label: 'Node 1',
      displayName: 'Node 1',
      type: 'ApexClass',
      risk: 'LOW',
      metrics: { coupling: 1, fanIn: 1, fanOut: 0, cyclomaticComplexity: 1, linesOfCode: 10 },
      refactoringReadiness: { hasCycles: false, hasUnresolved: false, readinessScore: 100 }
    },
    {
      id: 'node2',
      label: 'Node 2',
      displayName: 'Node 2',
      type: 'ApexClass',
      risk: 'LOW',
      metrics: { coupling: 1, fanIn: 0, fanOut: 1, cyclomaticComplexity: 1, linesOfCode: 10 },
      refactoringReadiness: { hasCycles: false, hasUnresolved: false, readinessScore: 100 }
    },
  ];

  const dummyEdges: ExplorerEdge[] = [
    { id: 'edge1', source: 'node1', target: 'node2', label: 'uses' },
  ];

  beforeEach(() => {
    delete (window as any).__LAST_LAYOUT_COMPLETED__;
  });

  it('dispatches app:layoutcomplete event and sets window.__LAST_LAYOUT_COMPLETED__ on architecture mode change', async () => {
    let firedDetail: any = null;
    const listener = (evt: any) => {
      firedDetail = evt.detail;
    };

    window.addEventListener('app:layoutcomplete', listener);

    const { rerender } = render(
      <GraphView
        nodes={dummyNodes}
        edges={dummyEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        architectureMode="hierarchical"
      />
    );

    act(() => {
      rerender(
        <GraphView
          nodes={dummyNodes}
          edges={dummyEdges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
          architectureMode="hybrid"
        />
      );
    });

    window.removeEventListener('app:layoutcomplete', listener);

    expect(firedDetail).not.toBeNull();
    expect(firedDetail.architectureMode).toBe('hybrid');
    expect(firedDetail.nodeCount).toBe(2);
    expect(firedDetail.edgeCount).toBe(1);
    expect(firedDetail.outcome).toBe('complete');
    expect((window as any).__LAST_LAYOUT_COMPLETED__).toEqual(firedDetail);
  });
});

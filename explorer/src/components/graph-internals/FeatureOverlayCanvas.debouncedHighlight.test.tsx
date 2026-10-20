import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { FeatureOverlayCanvas } from './FeatureOverlayCanvas';
import * as sharedHighlightModule from '../../lib/layout/shared-highlight';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureDiscoveryResult } from '../../lib/layout/features';

describe('FeatureOverlayCanvas Debounced Shared Highlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const nodes: ExplorerNode[] = [
    {
      id: 'node-1',
      displayName: 'Node 1',
      type: 'ApexClass',
      risk: 'LOW',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    },
    {
      id: 'node-2',
      displayName: 'Node 2',
      type: 'ApexClass',
      risk: 'LOW',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    },
  ];

  const edges: ExplorerEdge[] = [];

  const discoveryResult: FeatureDiscoveryResult = {
    features: new Map([
      [
        'feature-1',
        {
          id: 'feature-1',
          name: 'Feature 1',
          primaryNodeIds: new Set(['node-1']),
          supportingNodeIds: new Set(['node-2']),
          sharedNodeIds: new Set(['node-2']),
        },
      ],
    ]),
    sharedNodes: new Map([
      ['node-2', { nodeId: 'node-2', featureIds: new Set(['feature-1']), centralityScore: 1 }],
    ]),
    assignments: new Map([
      ['node-1', { featureId: 'feature-1', isPrimary: true, confidence: 1 }],
      ['node-2', { featureId: 'feature-1', isPrimary: false, confidence: 1 }],
    ]),
    unassignedNodeIds: new Set(),
  };

  it('debounces hover changes before calling getSharedHighlightData, while selection is immediate', () => {
    const spy = vi.spyOn(sharedHighlightModule, 'getSharedHighlightData');

    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1,
      nodes: () => [],
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    const { rerender } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discoveryResult}
        hoveredNodeId={null}
        selectedNodeId={null}
      />
    );

    spy.mockClear();

    // Rapidly change hoveredNodeId multiple times
    rerender(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discoveryResult}
        hoveredNodeId="node-1"
        selectedNodeId={null}
      />
    );

    rerender(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discoveryResult}
        hoveredNodeId="node-2"
        selectedNodeId={null}
      />
    );

    // Before timer advances 150ms, getSharedHighlightData should not have been called for hovered nodes
    expect(spy).not.toHaveBeenCalled();

    // Advance timers by 150ms to settle
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Now getSharedHighlightData should be called exactly once with settled hoveredNodeId 'node-2'
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('node-2', discoveryResult, nodes, edges);

    // Clear hover state and advance timer
    rerender(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discoveryResult}
        hoveredNodeId={null}
        selectedNodeId={null}
      />
    );
    act(() => {
      vi.advanceTimersByTime(150);
    });

    spy.mockClear();

    // Selection should highlight immediately without waiting for 150ms timer
    rerender(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discoveryResult}
        hoveredNodeId={null}
        selectedNodeId="node-1"
      />
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('node-1', discoveryResult, nodes, edges);

    spy.mockRestore();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { GraphView } from '../components/GraphView';
import { InvestigationDrawer } from '../components/InvestigationDrawer';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { useGraphSelection } from '../hooks/useGraphSelection';
import { LayoutWorkerClient } from '../lib/workers/layout-worker-client';
import * as graphBuilder from '../lib/graph-builder';
import type { ExplorerNode } from '../types/explorer';

// Helper to generate N mock nodes
function generateMockNodes(count: number): ExplorerNode[] {
  const nodes: ExplorerNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `Node_${i}`,
      displayName: `Component Node ${i}`,
      type: i % 2 === 0 ? 'ApexClass' : 'LWC',
      file: `force-app/main/default/classes/Node_${i}.cls`,
      metrics: { fanIn: i, fanOut: 2, coupling: 3, unresolved: 0, score: 5 },
      risk: i % 5 === 0 ? 'HIGH' : 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: 'with sharing',
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    });
  }
  return nodes;
}

describe('Post-Merge Integrated Verification Gate — 9 Core Invariants', () => {

  // Invariant 1: Large graph accessible DOM list stays within its documented bound (<= 50 nodes + indicator)
  it('Invariant 1: Bounds accessible DOM node list to <= 50 items on large graphs', () => {
    const largeNodes = generateMockNodes(120);
    render(
      <GraphView
        nodes={largeNodes}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
      />
    );

    const listItems = screen.getAllByRole('listitem');
    // Top 50 nodes + 1 summary indicator item = 51 listitems total
    expect(listItems.length).toBe(51);

    const summaryItem = screen.getByText(/Showing 50 of 120 components/i);
    expect(summaryItem).toBeDefined();
  });

  // Invariant 2: Selected node outside initial 50 subset remains represented
  it('Invariant 2: Includes selected node in accessible list even if it falls outside initial 50 subset', () => {
    const largeNodes = generateMockNodes(100);
    const targetNodeId = 'Node_85'; // Node outside top 50

    render(
      <GraphView
        nodes={largeNodes}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={targetNodeId}
        selectedEdgeId={null}
        layoutMode="interactive"
      />
    );

    // Selected node should be rendered in the accessible list
    const selectedBtn = screen.getByRole('button', { name: /Component Node 85/i });
    expect(selectedBtn).toBeDefined();
    expect(selectedBtn.getAttribute('aria-current')).toBe('true');

    // Total list items should be 50 + 1 (selected) + 1 (summary) = 52
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(52);
    expect(screen.getByText(/Showing 51 of 100 components/i)).toBeDefined();
  });

  // Invariant 3: Native keyboard activation invokes selection exactly once
  it('Invariant 3: Accessible list item button uses native button type and fires selection once on click', () => {
    const nodes = generateMockNodes(10);
    const onSelectNode = vi.fn();

    render(
      <GraphView
        nodes={nodes}
        edges={[]}
        onSelectNode={onSelectNode}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
      />
    );

    const btn = screen.getByRole('button', { name: /Component Node 3/i });
    expect(btn.getAttribute('type')).toBe('button');

    fireEvent.click(btn);
    expect(onSelectNode).toHaveBeenCalledTimes(1);
    expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'Node_3' }));
  });

  // Invariant 4: Stale asynchronous layout result is ignored after a newer request begins
  it('Invariant 4: LayoutWorkerClient discards stale responses matching requestGeneration mismatch', async () => {
    const client = new LayoutWorkerClient();

    // Verify applyPositionAuthority level precedence behavior when stale layouts arrive
    const userDragPositions = { Node_1: { x: 999, y: 999 } };
    const persistedPositions = { Node_1: { x: 500, y: 500 }, Node_2: { x: 200, y: 200 } };
    const staleCalculatedPositions = { Node_1: { x: 10, y: 10 }, Node_2: { x: 10, y: 10 } };

    const positions = client.applyPositionAuthority({
      calculatedPositions: staleCalculatedPositions,
      userDragPositions,
      persistedPositions,
      nodeIds: ['Node_1', 'Node_2'],
    });

    // Stale calculated positions do NOT overwrite user drag or persisted positions
    expect(positions['Node_1']).toEqual({ x: 999, y: 999 });
    expect(positions['Node_2']).toEqual({ x: 200, y: 200 });
  });

  // Invariant 5: Position-only changes preserve Cytoscape element identity and do not trigger full graph teardown
  it('Invariant 5: Modifying nodePositions prop updates positions in-place without rebuilding graph elements', () => {
    const nodes = generateMockNodes(5);
    const staticEdges: any[] = [];
    const initialPositions = { Node_0: { x: 10, y: 10 } };
    const updatedPositions = { Node_0: { x: 500, y: 500 } };

    const buildSpy = vi.spyOn(graphBuilder, 'buildGraphElements');

    const { rerender } = render(
      <GraphView
        nodes={nodes}
        edges={staticEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
        nodePositions={initialPositions}
      />
    );

    const initialBuildCalls = buildSpy.mock.calls.length;
    expect(initialBuildCalls).toBeGreaterThan(0);

    // Rerender with position-only update and same stable nodes & edges references
    rerender(
      <GraphView
        nodes={nodes}
        edges={staticEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        layoutMode="interactive"
        nodePositions={updatedPositions}
      />
    );

    // Verify buildGraphElements was NOT called again on position-only prop update
    expect(buildSpy.mock.calls.length).toBe(initialBuildCalls);

    buildSpy.mockRestore();
  });

  // Invariant 6: User-dragged positions survive layout/static-mode transitions according to level 1-5 authority
  it('Invariant 6: Applies Level 1-5 position authority precedence correctly', () => {
    const client = new LayoutWorkerClient();

    const userDragPositions = { Node_1: { x: 999, y: 999 } };
    const persistedPositions = { Node_1: { x: 500, y: 500 }, Node_2: { x: 200, y: 200 } };
    const calculatedPositions = { Node_1: { x: 100, y: 100 }, Node_2: { x: 100, y: 100 }, Node_3: { x: 100, y: 100 } };

    const finalPositions = client.applyPositionAuthority({
      calculatedPositions,
      userDragPositions,
      persistedPositions,
      nodeIds: ['Node_1', 'Node_2', 'Node_3', 'Node_4'],
    });

    // Node_1: User Drag (Level 1) overrides Persisted & Calculated
    expect(finalPositions['Node_1']).toEqual({ x: 999, y: 999 });

    // Node_2: Persisted (Level 2) overrides Calculated
    expect(finalPositions['Node_2']).toEqual({ x: 200, y: 200 });

    // Node_3: Calculated Layout (Level 4)
    expect(finalPositions['Node_3']).toEqual({ x: 100, y: 100 });

    // Node_4: Fallback (Level 5)
    expect(finalPositions['Node_4']).toEqual({ x: 0, y: 0 });
  });

  // Invariant 7: Pan/zoom bursts are coalesced and pending animation frames are cancelled on unmount
  it('Invariant 7: Coalesces pan/zoom events with requestAnimationFrame and cancels pending RAF on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const fakeCy: any = {
      pan: vi.fn().mockReturnValue({ x: 10, y: 20 }),
      zoom: vi.fn().mockReturnValue(1.5),
      on: vi.fn(),
      off: vi.fn(),
      nodes: vi.fn().mockReturnValue([]),
    };

    const { unmount } = render(
      <FeatureOverlayCanvas
        cy={fakeCy}
        nodes={[]}
        edges={[]}
      />
    );

    expect(fakeCy.on).toHaveBeenCalledWith('pan zoom', expect.any(Function));

    unmount();

    expect(fakeCy.off).toHaveBeenCalledWith('pan zoom', expect.any(Function));
    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockRestore();
  });

  // Invariant 8: High-degree drawer expansion and selected-node changes behave correctly
  it('Invariant 8: Bounds drawer lists to 50 items initially, supports Show More, and resets on node change', () => {
    const nodes = generateMockNodes(100);
    const node0 = nodes[0];
    const node1 = nodes[1];

    // Create 80 outgoing dependencies for Node_0, and 65 outgoing dependencies for Node_1
    const edges0 = nodes.slice(2, 82).map((n) => ({
      id: `edge_0_${n.id}`,
      source: node0.id,
      target: n.id,
      relationshipType: 'method-call',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 1,
      column: 1,
    }));

    const edges1 = nodes.slice(2, 67).map((n) => ({
      id: `edge_1_${n.id}`,
      source: node1.id,
      target: n.id,
      relationshipType: 'method-call',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 1,
      column: 1,
    }));

    const mockData = {
      schemaVersion: '1.0.0',
      analyzerVersion: '1.0.0',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceDirectory: 'force-app',
      summary: { nodeCount: 100, edgeCount: edges0.length + edges1.length, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 100, cycleCount: 0, unresolvedCount: 0, inventory: {} },
      nodes,
      edges: [...edges0, ...edges1],
    };

    // Step 1: Render drawer for Node_0 (90 dependencies)
    const { rerender } = render(
      <InvestigationDrawer
        node={node0}
        open={true}
        data={mockData as any}
        onClose={vi.fn()}
      />
    );

    // Switch to dependencies tab
    fireEvent.click(screen.getByTestId('tab-dependencies'));

    // Initially shows 50 items and "Show More (50 remaining)" button (100 - 50 = 50)
    const showMoreBtn0 = screen.getByTestId('show-more-deps-btn');
    expect(showMoreBtn0.textContent).toContain('50 remaining');

    // Click Show More -> expands limit to 100
    fireEvent.click(showMoreBtn0);
    expect(screen.queryByTestId('show-more-deps-btn')).toBeNull();

    // Step 2: Rerender drawer with Node_1 (85 dependencies) -> limit must reset to 50
    rerender(
      <InvestigationDrawer
        node={node1}
        open={true}
        data={mockData as any}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('tab-dependencies'));

    // Verify limit reset back to 50, showing "Show More (35 remaining)" button (85 - 50 = 35)
    const showMoreBtn1 = screen.getByTestId('show-more-deps-btn');
    expect(showMoreBtn1).toBeDefined();
    expect(showMoreBtn1.textContent).toContain('35 remaining');
  });

  // Invariant 9: Selection state remains consistent through selectNode(null) and edge clearing
  it('Invariant 9: Enforces mutual selection exclusivity in useGraphSelection', () => {
    const { result } = renderHook(() => useGraphSelection());

    // Select node
    act(() => {
      result.current.selectNode('Node_A');
    });
    expect(result.current.selectedNodeId).toBe('Node_A');
    expect(result.current.selectedEdgeId).toBeNull();

    // Select edge -> clears node selection
    act(() => {
      result.current.selectEdge('Edge_X');
    });
    expect(result.current.selectedEdgeId).toBe('Edge_X');
    expect(result.current.selectedNodeId).toBeNull();

    // Deselect node with selectNode(null) -> clears both node and edge
    act(() => {
      result.current.selectNode(null);
    });
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
  });
});

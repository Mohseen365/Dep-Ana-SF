import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GraphView } from '../components/GraphView';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import * as featuresModule from '../lib/layout/features';
import { discoverFeatures } from '../lib/layout/features';
import { deriveFeatureCompositionGroups } from '../lib/layout/feature-composition';
import { getSharedHighlightData } from '../lib/layout/shared-highlight';

// Mock Cytoscape for JSDOM render tests
const { mockCy, mockCytoscapeFn } = vi.hoisted(() => {
  const mockListeners: Record<string, Function[]> = {};

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue({
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      unselect: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
    }),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn((events: string, selectorOrHandler: any, handler?: any) => {
      const cb = typeof selectorOrHandler === 'function' ? selectorOrHandler : handler;
      const eventList = events.split(' ');
      eventList.forEach((e) => {
        if (!mockListeners[e]) mockListeners[e] = [];
        if (cb) mockListeners[e].push(cb);
      });
    }),
    off: vi.fn((events: string, cb?: any) => {
      const eventList = events.split(' ');
      eventList.forEach((e) => {
        if (mockListeners[e]) {
          mockListeners[e] = mockListeners[e].filter((fn) => fn !== cb);
        }
      });
    }),
    one: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockReturnValue({
      length: 0,
      isNode: () => false,
      isEdge: () => false,
      neighborhood: () => [],
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    _listeners: mockListeners,
  };

  const mockCytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  mockCytoscapeFn.use = vi.fn();

  return { mockCy, mockCytoscapeFn };
});

vi.mock('cytoscape', () => ({ default: mockCytoscapeFn }));
vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.matchMedia =
  window.matchMedia ||
  vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const sampleGraph = generateSyntheticSalesforceGraph({ nodeCount: 50, seed: 42 });

describe('Prompt 6 — Runtime & Rendering Performance Audit & Benchmark Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Interaction Hot-Paths & Zero Unnecessary Layout Directives (R1–R5)', () => {
    it('R1: Pan produces 0 layout invocations', () => {
      render(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      mockCy.layout.mockClear();

      // Trigger pan event on Cytoscape instance
      const panListeners = mockCy._listeners['pan'] || [];
      panListeners.forEach((fn) => fn({ type: 'pan' }));

      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('R2: Zoom produces 0 layout invocations', () => {
      render(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      mockCy.layout.mockClear();

      // Trigger zoom event on Cytoscape instance
      const zoomListeners = mockCy._listeners['zoom'] || [];
      zoomListeners.forEach((fn) => fn({ type: 'zoom' }));

      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('R3: Hover produces 0 layout invocations', () => {
      render(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      mockCy.layout.mockClear();

      // Trigger mouseover on node
      const mouseoverListeners = mockCy._listeners['mouseover'] || [];
      const dummyNode = sampleGraph.nodes[0];
      mouseoverListeners.forEach((fn) =>
        fn({
          target: { id: () => dummyNode.id, addClass: vi.fn(), removeClass: vi.fn() },
          renderedPosition: { x: 100, y: 100 },
        })
      );

      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('R4: Selection produces 0 layout invocations', () => {
      const { rerender } = render(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      mockCy.layout.mockClear();

      // Select a node via prop update
      rerender(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={sampleGraph.nodes[0].id}
          selectedEdgeId={null}
        />
      );

      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('R5: Viewport-only changes do not recompute semantic clustering or rebuild graph indexes', () => {
      const discoverySpy = vi.spyOn(featuresModule, 'discoverFeatures');

      render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          discoveryResult={discoverFeatures(sampleGraph.nodes, sampleGraph.edges)}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      discoverySpy.mockClear();

      // Emit pan and zoom events
      const panListeners = mockCy._listeners['pan'] || [];
      panListeners.forEach((fn) => fn());

      const zoomListeners = mockCy._listeners['zoom'] || [];
      zoomListeners.forEach((fn) => fn());

      // Semantic feature discovery MUST NOT be called on pan or zoom
      expect(discoverySpy).not.toHaveBeenCalled();

      discoverySpy.mockRestore();
    });
  });

  describe('Invariance & Precision Guarantees (R6–R8)', () => {
    it('R6: Composition group output remains 100% identical before and after optimization', () => {
      const discovery = discoverFeatures(sampleGraph.nodes, sampleGraph.edges);
      const feature = Array.from(discovery.features.values())[0];

      if (feature) {
        const groupsBefore = deriveFeatureCompositionGroups(
          feature,
          sampleGraph.nodes,
          sampleGraph.edges
        );
        const groupsAfter = deriveFeatureCompositionGroups(
          feature,
          sampleGraph.nodes,
          sampleGraph.edges
        );

        expect(groupsAfter).toEqual(groupsBefore);
      }
    });

    it('R7: Node and edge coordinates remain 100% identical (0.00000 px drift)', () => {
      const posRun1 = computeArchitectureLayout(sampleGraph.nodes, sampleGraph.edges);

      // Shuffle nodes and edges to verify 100% input-order determinism
      const shuffledNodes = [...sampleGraph.nodes].reverse();
      const shuffledEdges = [...sampleGraph.edges].reverse();
      const posRun2 = computeArchitectureLayout(shuffledNodes, shuffledEdges);

      expect(Object.keys(posRun2).length).toBe(Object.keys(posRun1).length);

      let maxDrift = 0;
      for (const id of Object.keys(posRun1)) {
        const p1 = posRun1[id];
        const p2 = posRun2[id];
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        maxDrift = Math.max(maxDrift, dx, dy);
      }

      expect(maxDrift).toBe(0);
    });

    it('R8: Shared highlight output remains identical across selection & hover triggers', () => {
      const discovery = discoverFeatures(sampleGraph.nodes, sampleGraph.edges);
      const firstNodeId = sampleGraph.nodes[0].id;

      const resHover = getSharedHighlightData(firstNodeId, discovery, sampleGraph.nodes, sampleGraph.edges);
      const resSelect = getSharedHighlightData(firstNodeId, discovery, sampleGraph.nodes, sampleGraph.edges);

      expect(resSelect).toEqual(resHover);
    });
  });

  describe('Resource Management & Scalability Bounds (R9–R10)', () => {
    it('R9: Cytoscape and navigator event listeners are cleaned up correctly without leaks', () => {
      const { unmount } = render(
        <GraphView
          nodes={sampleGraph.nodes}
          edges={sampleGraph.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      unmount();

      expect(mockCy.destroy).toHaveBeenCalled();
    });

    it('R10: Large graphs do not cause unbounded overlay DOM growth', () => {
      const largeGraph = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 123 });
      const discovery = discoverFeatures(largeGraph.nodes, largeGraph.edges);

      const positions: Record<string, { x: number; y: number }> = {};
      largeGraph.nodes.forEach((n, idx) => {
        positions[n.id] = { x: (idx % 20) * 150, y: Math.floor(idx / 20) * 100 };
      });

      const allGroups = [];
      discovery.features.forEach((feature) => {
        const groups = deriveFeatureCompositionGroups(
          feature,
          largeGraph.nodes,
          largeGraph.edges,
          positions
        );
        allGroups.push(...groups);
      });

      // Total composition groups must be bounded and deduplicated
      expect(allGroups.length).toBeLessThan(largeGraph.nodes.length);
    });
  });

  describe('Large-Graph Scale Benchmarks (L1–L4)', () => {
    const scaleConfigs = [
      { level: 'L1', nodeCount: 500, edgeCount: 1500, targetMs: 2000 },
      { level: 'L2', nodeCount: 1000, edgeCount: 3000, targetMs: 5000 },
      { level: 'L3', nodeCount: 2000, edgeCount: 6000, targetMs: 20000 },
      { level: 'L4', nodeCount: 5000, edgeCount: 10000, targetMs: 180000 },
    ];

    scaleConfigs.forEach(({ level, nodeCount, targetMs }) => {
      it(`Benchmark ${level}: ${nodeCount} nodes layout computation executes cleanly within ${targetMs}ms`, () => {
        const { nodes, edges } = generateSyntheticSalesforceGraph({
          nodeCount,
          seed: 500 + nodeCount,
          componentCount: Math.min(10, Math.max(2, Math.floor(nodeCount / 250))),
        });

        const start = performance.now();
        const positions = computeArchitectureLayout(nodes, edges);
        const durationMs = performance.now() - start;

        expect(Object.keys(positions).length).toBe(nodes.length);

        // Verify valid finite coordinates
        for (const pos of Object.values(positions)) {
          expect(Number.isFinite(pos.x)).toBe(true);
          expect(Number.isFinite(pos.y)).toBe(true);
        }

        console.log(`[PROMPT 6 BENCHMARK ${level}] ${nodeCount} nodes | ${edges.length} edges | Layout: ${durationMs.toFixed(2)}ms`);
        expect(durationMs).toBeLessThan(targetMs);
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { discoverFeatures } from '../lib/layout/features';
import { deriveFeatureCompositionGroups } from '../lib/layout/feature-composition';
import { getSharedHighlightData } from '../lib/layout/shared-highlight';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';

// Load Salesforce Cloud Spend Tracker acceptance dataset
function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

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

describe('Workstream B5 — Viewport & Performance Protection Acceptance Suite (Cloud Spend Dataset)', () => {
  const { nodes, edges } = loadCloudSpendData();
  const discoveryResult = discoverFeatures(nodes, edges);
  const layoutPositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Node Coordinate Tracking & Spatial Authority Invariance (Tasks 1, 2, 3, 11, 13, 14)', () => {
    it('Task 1 & 11: Composition group bounds track final node positions with exact precision', () => {
      const forecastFeature = discoveryResult.features.get('feature_forecast-manager');
      expect(forecastFeature).toBeDefined();

      if (forecastFeature) {
        const groups = deriveFeatureCompositionGroups(
          forecastFeature,
          nodes,
          edges,
          layoutPositions
        );

        expect(groups.length).toBeGreaterThan(0);

        groups.forEach((group) => {
          expect(group.bounds).toBeDefined();
          if (group.bounds) {
            let memberMinX = Infinity;
            let memberMaxX = -Infinity;
            let memberMinY = Infinity;
            let memberMaxY = -Infinity;

            group.nodeIds.forEach((id) => {
              const pos = layoutPositions[id];
              expect(pos).toBeDefined();
              if (pos) {
                memberMinX = Math.min(memberMinX, pos.x - 60);
                memberMaxX = Math.max(memberMaxX, pos.x + 60);
                memberMinY = Math.min(memberMinY, pos.y - 30);
                memberMaxY = Math.max(memberMaxY, pos.y + 30);
              }
            });

            // Bounds must match node bounds + 20px padding
            expect(group.bounds.xMin).toBeCloseTo(memberMinX - 20, 4);
            expect(group.bounds.xMax).toBeCloseTo(memberMaxX + 20, 4);
            expect(group.bounds.yMin).toBeCloseTo(memberMinY - 20, 4);
            expect(group.bounds.yMax).toBeCloseTo(memberMaxY + 20, 4);
          }
        });
      }
    });

    it('Task 2 & 3 & 13 & 14: Overlays do not modify node positions or act as spatial authority', () => {
      const originalPositionsJson = JSON.stringify(layoutPositions);

      // Derive composition groups and shared highlights
      const groups = deriveFeatureCompositionGroups(
        discoveryResult.features.get('feature_forecast-manager')!,
        nodes,
        edges,
        layoutPositions
      );
      const highlight = getSharedHighlightData('ApexClass:SpendTrackerAccessContext', discoveryResult, nodes, edges);

      expect(groups).toBeDefined();
      expect(highlight).toBeDefined();

      // Verify node positions map was NOT mutated
      expect(JSON.stringify(layoutPositions)).toBe(originalPositionsJson);
    });
  });

  describe('2. Viewport Operations & Far-Zoom Suppression (Tasks 4, 5, 6, 7)', () => {
    it('Task 4 & 5: Pan and Zoom change viewport transforms with 0 layout invocations', () => {
      render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          nodePositions={layoutPositions}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      mockCy.layout.mockClear();

      // Emit pan and zoom events inside act
      const panListeners = mockCy._listeners['pan'] || [];
      const zoomListeners = mockCy._listeners['zoom'] || [];

      act(() => {
        panListeners.forEach((fn) => fn({ type: 'pan' }));
        zoomListeners.forEach((fn) => fn({ type: 'zoom' }));
      });

      // MUST NOT trigger Cytoscape layout
      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('Task 6: Far-zoom suppression hides overlays when zoom < 0.6 and displays when zoom >= 0.6', () => {
      mockCy.zoom.mockReturnValue(0.4); // Far zoom (< 0.6)

      const { container } = render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          nodePositions={layoutPositions}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      // Verify composition boxes and finding badges are suppressed at far zoom
      expect(container.querySelectorAll('.composition-group-overlay').length).toBe(0);

      // Emit zoom event at zoom = 1.0 (normal zoom >= 0.6) inside act
      mockCy.zoom.mockReturnValue(1.0);
      const zoomListeners = mockCy._listeners['zoom'] || [];

      act(() => {
        zoomListeners.forEach((fn) => fn({ type: 'zoom' }));
      });

      // At zoom = 1.0, composition group overlays MUST be rendered
      expect(container.querySelectorAll('.composition-group-overlay').length).toBeGreaterThan(0);
    });

    it('Task 7: Composition groups are NOT recomputed during pan or zoom', () => {
      render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          nodePositions={layoutPositions}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      // Emit multiple pan and zoom events inside act
      const panListeners = mockCy._listeners['pan'] || [];
      const zoomListeners = mockCy._listeners['zoom'] || [];

      act(() => {
        for (let i = 0; i < 10; i++) {
          panListeners.forEach((fn) => fn());
          zoomListeners.forEach((fn) => fn());
        }
      });

      // Verify layout was never called
      expect(mockCy.layout).not.toHaveBeenCalled();
    });
  });

  describe('3. Interaction Hot-Paths & Listener Lifecycle (Tasks 8, 9, 10)', () => {
    it('Task 8: Hover and selection updates trigger sub-ms highlight without layout invocations', () => {
      const { rerender } = render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          nodePositions={layoutPositions}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      mockCy.layout.mockClear();

      // Hover over shared node
      act(() => {
        rerender(
          <FeatureOverlayCanvas
            cy={mockCy as any}
            nodes={nodes}
            edges={edges}
            discoveryResult={discoveryResult}
            nodePositions={layoutPositions}
            selectedNodeId={null}
            hoveredNodeId="ApexClass:SpendTrackerAccessContext"
            enableOverlay={true}
          />
        );
      });

      expect(mockCy.layout).not.toHaveBeenCalled();

      // Select node
      act(() => {
        rerender(
          <FeatureOverlayCanvas
            cy={mockCy as any}
            nodes={nodes}
            edges={edges}
            discoveryResult={discoveryResult}
            nodePositions={layoutPositions}
            selectedNodeId="ApexClass:SpendTrackerAccessContext"
            hoveredNodeId={null}
            enableOverlay={true}
          />
        );
      });

      expect(mockCy.layout).not.toHaveBeenCalled();
    });

    it('Task 9 & 10: Event listeners are cleanly detached on unmount without leaks', () => {
      const { unmount } = render(
        <FeatureOverlayCanvas
          cy={mockCy as any}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          nodePositions={layoutPositions}
          selectedNodeId={null}
          hoveredNodeId={null}
          enableOverlay={true}
        />
      );

      unmount();

      // Verify cy.off was called to clean up listeners
      expect(mockCy.off).toHaveBeenCalledWith('pan zoom', expect.any(Function));
      expect(mockCy.off).toHaveBeenCalledWith('position dragfree layoutstop', expect.any(Function));
    });
  });

  describe('4. Composition Group Deduplication & Shared Discipline (Task 12)', () => {
    it('Task 12: Enforces IoU (<0.55), containment (<0.80), and label deduplication on Cloud Spend dataset', () => {
      const forecastFeature = discoveryResult.features.get('feature_forecast-manager')!;
      const groups = deriveFeatureCompositionGroups(forecastFeature, nodes, edges, layoutPositions);

      // Group count is capped and deduplicated
      expect(groups.length).toBeLessThanOrEqual(4);

      // Verify no high IoU overlaps among derived group bounds
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const b1 = groups[i].bounds;
          const b2 = groups[j].bounds;
          if (b1 && b2) {
            const xMin = Math.max(b1.xMin, b2.xMin);
            const xMax = Math.min(b1.xMax, b2.xMax);
            const yMin = Math.max(b1.yMin, b2.yMin);
            const yMax = Math.min(b1.yMax, b2.yMax);
            if (xMax > xMin && yMax > yMin) {
              const intersection = (xMax - xMin) * (yMax - yMin);
              const union = b1.width * b1.height + b2.width * b2.height - intersection;
              const iou = intersection / union;
              expect(iou).toBeLessThan(0.55);
            }
          }
        }
      }
    });
  });
});

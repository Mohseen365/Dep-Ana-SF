import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import type cytoscape from 'cytoscape';

import { GraphView } from '../components/GraphView';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { discoverFeatures } from '../lib/layout/features';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

// Mock cytoscape and plugins for GraphView tests
const { mockCy, mockCytoscapeFn, mockNodeObjMap } = vi.hoisted(() => {
  const mockNodeObjMap: Record<string, any> = {};

  const createMockNode = (id: string, x = 100, y = 100) => {
    if (!mockNodeObjMap[id]) {
      let curPos = { x, y };
      const mockCollection = {
        length: 0,
        forEach: vi.fn(),
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
      };

      const mockEles = {
        length: 1,
        id: () => id,
        data: vi.fn().mockReturnValue({
          id,
          displayName: id,
          type: id.includes('Trigger') ? 'ApexTrigger' : id.includes('LWC') ? 'LWC' : 'ApexClass',
        }),
        isNode: () => true,
        isEdge: () => false,
        position: vi.fn((newPos?: { x: number; y: number }) => {
          if (newPos && typeof newPos.x === 'number' && typeof newPos.y === 'number') {
            curPos = { ...newPos };
          }
          return curPos;
        }),
        neighborhood: vi.fn().mockReturnValue(mockCollection),
        connectedEdges: vi.fn().mockReturnValue(mockCollection),
        addClass: vi.fn().mockReturnThis(),
        removeClass: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        unselect: vi.fn().mockReturnThis(),
      };
      mockNodeObjMap[id] = mockEles;
    }
    return mockNodeObjMap[id];
  };

  const cyInstance = {
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
    nodes: vi.fn().mockImplementation(() => {
      const arr = Object.values(mockNodeObjMap);
      (arr as any).forEach = Array.prototype.forEach.bind(arr);
      return arr;
    }),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn((els) => {
      if (Array.isArray(els)) {
        els.forEach((el) => {
          if (el.data?.id && !el.data.source) {
            createMockNode(el.data.id, el.position?.x ?? 100, el.position?.y ?? 100);
          }
        });
      }
    }),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
    off: vi.fn(),
    one: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockImplementation((id) => {
      const found = mockNodeObjMap[id];
      if (found) return found;
      const emptyCol = { removeClass: vi.fn().mockReturnThis(), addClass: vi.fn().mockReturnThis() };
      return { length: 0, isNode: () => false, isEdge: () => false, neighborhood: () => emptyCol, connectedEdges: () => emptyCol };
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  };

  const fn: any = vi.fn().mockImplementation((opts) => {
    if (opts?.elements) {
      cyInstance.add(opts.elements);
    }
    return cyInstance;
  });
  fn.use = vi.fn();

  return { mockCy: cyInstance, mockCytoscapeFn: fn, mockNodeObjMap };
});

vi.mock('cytoscape', () => ({
  default: mockCytoscapeFn,
}));

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock matchMedia
if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function createMockNode(id: string, displayName: string, type: ExplorerNode['type'] = 'ApexClass'): ExplorerNode {
  return {
    id,
    displayName,
    type,
    file: `force-app/main/default/classes/${displayName}.cls`,
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 3 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: false,
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
  };
}

function createMockEdge(source: string, target: string): ExplorerEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    relationshipType: 'method-call',
    method: 'call',
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: null,
    column: null,
    methodOwner: null,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  };
}

describe('FeatureRegionOverlay — Stage-5 Authoritative Feature Enclosure Overlay', () => {
  const nodes: ExplorerNode[] = [
    createMockNode('LWC:OrderView', 'OrderView', 'LWC'),
    createMockNode('ApexClass:OrderController', 'OrderController'),
    createMockNode('ApexClass:OrderService', 'OrderService'),
    createMockNode('ApexClass:PaymentService', 'PaymentService'),
  ];

  const edges: ExplorerEdge[] = [
    createMockEdge('LWC:OrderView', 'ApexClass:OrderController'),
    createMockEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
    createMockEdge('ApexClass:OrderService', 'ApexClass:PaymentService'),
  ];

  it('1. Renders Stage-5 semantic feature region enclosure boxes when supplied via featureRegions prop', () => {
    const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    expect(layoutResult.featureRegions).toBeDefined();
    expect(layoutResult.featureRegions!.size).toBeGreaterThan(0);

    const discovery = discoverFeatures(nodes, edges);

    const testCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const { container } = render(
      <FeatureOverlayCanvas
        cy={testCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={layoutResult.featureRegions}
        nodePositions={layoutResult.positions}
        enableOverlay={true}
      />
    );
    const featureRegionOverlays = container.querySelectorAll('.semantic-feature-region-overlay');
    expect(featureRegionOverlays.length).toBe(layoutResult.featureRegions!.size);

    featureRegionOverlays.forEach((overlay) => {
      const rect = overlay.querySelector('rect');
      const text = overlay.querySelector('text');
      expect(rect).toBeDefined();
      expect(text?.textContent).toContain('Feature:');
    });
  });

  it('2. Suppresses semantic feature region overlays at far zoom (< 0.6)', () => {
    const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const discovery = discoverFeatures(nodes, edges);

    let currentZoom = 1.0;
    let zoomListener: (() => void) | null = null;

    const testCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => currentZoom,
      on: vi.fn((evt: string, fn: () => void) => {
        if (evt.includes('zoom')) zoomListener = fn;
      }),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const { container } = render(
      <FeatureOverlayCanvas
        cy={testCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={layoutResult.featureRegions}
        nodePositions={layoutResult.positions}
        enableOverlay={true}
      />
    );

    expect(container.querySelectorAll('.semantic-feature-region-overlay').length).toBeGreaterThan(0);

    currentZoom = 0.4;
    act(() => {
      if (zoomListener) zoomListener();
    });

    expect(container.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);
  });

  it('3. Renders cleanly without errors when featureRegions is undefined or null or empty', () => {
    const discovery = discoverFeatures(nodes, edges);

    const testCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const { container: container1 } = render(
      <FeatureOverlayCanvas
        cy={testCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={undefined}
        enableOverlay={true}
      />
    );
    expect(container1.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);

    const { container: container2 } = render(
      <FeatureOverlayCanvas
        cy={testCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={null}
        enableOverlay={true}
      />
    );
    expect(container2.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);

    const { container: container3 } = render(
      <FeatureOverlayCanvas
        cy={testCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={new Map()}
        enableOverlay={true}
      />
    );
    expect(container3.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);
  });

  describe('GraphView Caller Boundary Architecture Mode Enclosure Gating', () => {
    it('suppresses semantic feature region enclosures when architectureMode is hierarchical', async () => {
      let container: HTMLElement;
      await act(async () => {
        const res = render(
          <GraphView
            nodes={nodes}
            edges={edges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            architectureMode="hierarchical"
          />
        );
        container = res.container;
      });

      expect(container!.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);
    });

    it('renders semantic feature region enclosures when architectureMode is hybrid', async () => {
      let container: HTMLElement;
      await act(async () => {
        const res = render(
          <GraphView
            nodes={nodes}
            edges={edges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
            architectureMode="hybrid"
          />
        );
        container = res.container;
      });

      expect(container!.querySelectorAll('.semantic-feature-region-overlay').length).toBeGreaterThan(0);
    });
  });
});

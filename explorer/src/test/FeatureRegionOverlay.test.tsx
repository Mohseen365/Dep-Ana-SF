import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import type cytoscape from 'cytoscape';

import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { discoverFeatures } from '../lib/layout/features';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

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

    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const { container } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
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

    const mockCy = {
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
        cy={mockCy}
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

    const mockCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1.0,
      on: vi.fn(),
      off: vi.fn(),
      nodes: () => [],
    } as unknown as cytoscape.Core;

    const { container: container1 } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
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
        cy={mockCy}
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
        cy={mockCy}
        nodes={nodes}
        edges={edges}
        discoveryResult={discovery}
        featureRegions={new Map()}
        enableOverlay={true}
      />
    );
    expect(container3.querySelectorAll('.semantic-feature-region-overlay').length).toBe(0);
  });
});

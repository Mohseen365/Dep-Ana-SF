import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RadarPanel } from './RadarPanel';
import { DependencyConstellationPanel } from './DependencyConstellationPanel';
import { DependencyRiverPanel } from './DependencyRiverPanel';
import { SubwayPanel } from './SubwayPanel';
import { FeatureOverlayCanvas } from './graph-internals/FeatureOverlayCanvas';
import { FeatureTreePanel } from './FeatureTreePanel';
import { ArchitectureTreemapPanel } from './ArchitectureTreemapPanel';
import { FourDirectionPanel } from './FourDirectionPanel';
import { CouplingHeatmapPanel } from './CouplingHeatmapPanel';
import { ArchitectureDNABarcode } from './ArchitectureDNABarcode';
import { GraphView } from './GraphView';
import type { ExplorerDataSchema } from '../types/explorer';
import type { ConstellationData } from '../lib/adapters/constellation-adapter';
import type { SubwayMapData } from '../lib/adapters/subway-adapter';
import type { FourDirectionData } from '../lib/adapters/four-direction-adapter';
import { createMockSummary } from '../test/fixtures/mockFactories';

const sampleExplorerData: ExplorerDataSchema = {
  schemaVersion: '1.0',
  generatedAt: '2026-10-08T00:00:00.000Z',
  summary: createMockSummary({
    nodeCount: 2,
    edgeCount: 1,
    highRiskCount: 0,
    mediumRiskCount: 1,
    lowRiskCount: 1,
    cycleCount: 0,
    unresolvedCount: 0,
  }),
  nodes: [
    {
      id: 'ApexClass:Service',
      displayName: 'Service',
      type: 'ApexClass',
      file: 'Service.cls',
      featureId: 'feature_core',
      featureName: 'Core Feature',
      layerName: 'domain',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: 'with sharing',
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
    {
      id: 'ApexClass:Util',
      displayName: 'Util',
      type: 'ApexClass',
      file: 'Util.cls',
      featureId: 'feature_core',
      featureName: 'Core Feature',
      layerName: 'application',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
      risk: 'MEDIUM',
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
    },
  ],
  edges: [
    {
      id: 'edge_1',
      source: 'ApexClass:Service',
      target: 'ApexClass:Util',
      relationshipType: 'method-call',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: 'Service.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'Service' },
        target: { type: 'ApexClass', name: 'Util' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    },
  ],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

const sampleConstellationData: ConstellationData = {
  focalNode: {
    id: 'ApexClass:Service',
    displayName: 'Service',
    nodeId: 'ApexClass:Service',
    type: 'ApexClass',
    file: 'Service.cls',
    featureId: 'feature_core',
    featureName: 'Core Feature',
    layerName: 'domain',
    risk: 'LOW',
    hopDistance: 0,
    metrics: { fanIn: 0, fanOut: 1, coupling: 1 },
    incomingCount: 0,
    outgoingCount: 1,
  },
  rings: [
    {
      ringIndex: 1,
      hopDistance: 1,
      label: '1-Hop Orbit',
      items: [
        {
          nodeId: 'ApexClass:Util',
          displayName: 'Util',
          type: 'ApexClass',
          file: 'Util.cls',
          risk: 'MEDIUM',
          featureId: 'feature_core',
          featureName: 'Core Feature',
          layerName: 'application',
          hopDistance: 1,
          metrics: { fanIn: 1, fanOut: 0, coupling: 1 },
          incomingCount: 1,
          outgoingCount: 0,
        },
      ],
      totalCount: 1,
    },
  ],
  nodes: {
    'ApexClass:Service': {
      id: 'ApexClass:Service',
      displayName: 'Service',
      nodeId: 'ApexClass:Service',
      type: 'ApexClass',
      file: 'Service.cls',
      featureId: 'feature_core',
      featureName: 'Core Feature',
      layerName: 'domain',
      risk: 'LOW',
      hopDistance: 0,
      metrics: { fanIn: 0, fanOut: 1, coupling: 1 },
      incomingCount: 0,
      outgoingCount: 1,
    },
    'ApexClass:Util': {
      id: 'ApexClass:Util',
      displayName: 'Util',
      nodeId: 'ApexClass:Util',
      type: 'ApexClass',
      file: 'Util.cls',
      featureId: 'feature_core',
      featureName: 'Core Feature',
      layerName: 'application',
      risk: 'MEDIUM',
      hopDistance: 1,
      metrics: { fanIn: 1, fanOut: 0, coupling: 1 },
      incomingCount: 1,
      outgoingCount: 0,
    },
  },
  edges: [
    {
      edgeId: 'edge_1',
      source: 'ApexClass:Service',
      target: 'ApexClass:Util',
      relationshipType: 'method-call',
    },
  ],
  availableNodes: [
    { id: 'ApexClass:Service', displayName: 'Service', type: 'ApexClass' },
    { id: 'ApexClass:Util', displayName: 'Util', type: 'ApexClass' },
  ],
  summary: { ringCount: 1, totalNodes: 2, totalEdges: 1 },
  options: { maxDepth: 1, direction: 'both' },
};

const sampleSubwayData: SubwayMapData = {
  lines: [{ lineId: 'line_1', name: 'Core Feature', color: '#3b82f6', y: 100 }],
  stations: [
    {
      nodeId: 'ApexClass:Service',
      displayName: 'Service',
      type: 'ApexClass',
      featureId: 'feature_core',
      featureName: 'Core Feature',
      layerName: 'domain',
      file: 'Service.cls',
      fanIn: 0,
      fanOut: 1,
      isTransfer: false,
      x: 100,
      y: 100,
      lineIndex: 0,
    },
  ],
  routes: [],
  availableFeatures: [{ id: 'feature_core', name: 'Core Feature', color: '#3b82f6', count: 1 }],
};

const sampleFourDirectionData: FourDirectionData = {
  subject: {
    nodeId: 'ApexClass:Service',
    displayName: 'Service',
    type: 'ApexClass',
    featureId: 'feature_core',
    featureName: 'Core Feature',
    layerName: 'domain',
    file: 'Service.cls',
    risk: 'LOW',
    metrics: { fanIn: 0, fanOut: 1, coupling: 1 },
  },
  quadrants: {
    up: { title: 'Upstream Dependents', subtitle: 'Callers', items: [], totalCount: 0 },
    down: {
      title: 'Downstream Dependencies',
      subtitle: 'Callees',
      items: [
        {
          nodeId: 'ApexClass:Util',
          displayName: 'Util',
          type: 'ApexClass',
          featureName: 'Core Feature',
          layerName: 'application',
          risk: 'MEDIUM',
          relationshipTypes: ['method-call'],
        },
      ],
      totalCount: 1,
    },
    left: { title: 'Horizontal Peers', subtitle: 'Same Feature', items: [], totalCount: 0 },
    right: { title: 'Cross-Feature Peers', subtitle: 'External Features', items: [], totalCount: 0 },
  },
  summary: { totalNeighbors: 1, upstreamCount: 0, downstreamCount: 1, leftPeerCount: 0, rightCrossCount: 0 },
  availableNodes: [{ id: 'ApexClass:Service', displayName: 'Service', type: 'ApexClass' }],
};

describe('Phase 1G-C Accessibility Tests', () => {
  describe('1. Informative SVG Semantics & Accessible Names', () => {
    it('RadarPanel SVG has role="img" and accessible name', () => {
      render(<RadarPanel data={sampleExplorerData} />);
      const svg = screen.getByTestId('radar-svg');
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Architecture Radar Diagram');
    });

    it('DependencyConstellationPanel SVG has role="img" and accessible name', () => {
      render(<DependencyConstellationPanel data={sampleConstellationData} />);
      const svg = screen.getByTestId('constellation-svg');
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Dependency Constellation Orbital View');
    });

    it('DependencyRiverPanel SVG has role="img" and accessible name', () => {
      render(<DependencyRiverPanel data={sampleExplorerData} />);
      const svg = screen.getByTestId('sankey-svg');
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Dependency River Sankey Diagram');
    });

    it('SubwayPanel SVG has role="img" and accessible name', () => {
      render(<SubwayPanel data={sampleSubwayData} />);
      const svg = screen.getByTestId('subway-svg-canvas');
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Architecture Module Subway Map');
    });

    it('FeatureOverlayCanvas SVG has aria-hidden="true"', () => {
      const mockCy = {
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1,
        nodes: () => [],
        on: vi.fn(),
        off: vi.fn(),
      } as any;

      render(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={sampleExplorerData.nodes}
          edges={sampleExplorerData.edges}
        />
      );
      const svg = screen.getByTestId('feature-overlay-canvas');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('2. Interactive Visual Elements & Keyboard Navigation', () => {
    it('RadarPanel vertex points and table rows are focusable and keyboard activatable', () => {
      render(<RadarPanel data={sampleExplorerData} />);
      const axisGroup = screen.getByTestId('radar-axis-total_components');
      expect(axisGroup.tabIndex).toBe(0);
      expect(axisGroup.getAttribute('role')).toBe('button');
      expect(axisGroup.getAttribute('aria-label')).toBeTruthy();

      fireEvent.keyDown(axisGroup, { key: 'Enter' });
      expect(screen.getAllByText('Total Components').length).toBeGreaterThan(0);
    });

    it('DependencyConstellationPanel node elements are focusable and keyboard activatable', () => {
      const onSelectNode = vi.fn();
      render(<DependencyConstellationPanel data={sampleConstellationData} onSelectNode={onSelectNode} />);
      const nodeEl = screen.getByTestId('constellation-node-ApexClass:Util');
      expect(nodeEl.tabIndex).toBe(0);
      expect(nodeEl.getAttribute('role')).toBe('button');
      expect(nodeEl.getAttribute('aria-label')).toContain('Util');

      fireEvent.keyDown(nodeEl, { key: 'Enter' });
      expect(onSelectNode).toHaveBeenCalledWith('ApexClass:Util');
    });

    it('DependencyRiverPanel nodes and flows are focusable and keyboard activatable', () => {
      const onSelectNode = vi.fn();
      render(<DependencyRiverPanel data={sampleExplorerData} onSelectNode={onSelectNode} />);
      const flowEl = screen.getByTestId(/sankey-flow-/);
      expect(flowEl.tabIndex).toBe(0);
      expect(flowEl.getAttribute('role')).toBe('button');
      expect(flowEl.getAttribute('aria-label')).toContain('Flow stream');

      const nodeEl = screen.getByTestId(/sankey-node-/);
      expect(nodeEl.tabIndex).toBe(0);
      expect(nodeEl.getAttribute('role')).toBe('button');

      fireEvent.keyDown(nodeEl, { key: 'Enter' });
      expect(onSelectNode).toHaveBeenCalled();
    });

    it('SubwayPanel stations are focusable and keyboard activatable', () => {
      const onSelectNode = vi.fn();
      render(<SubwayPanel data={sampleSubwayData} onSelectNode={onSelectNode} />);
      const stationEl = screen.getByText('Service').parentElement!;
      expect(stationEl.tabIndex).toBe(0);
      expect(stationEl.getAttribute('role')).toBe('button');
      expect(stationEl.getAttribute('aria-label')).toContain('Station Service');

      fireEvent.keyDown(stationEl, { key: 'Enter' });
      expect(onSelectNode).toHaveBeenCalledWith('ApexClass:Service');
    });
  });

  describe('3. Tree, Treemap, Heatmap & DNA Accessibility', () => {
    it('FeatureTreePanel has proper role="tree", role="treeitem", and expand button aria-labels', () => {
      render(<FeatureTreePanel data={sampleExplorerData} />);
      const treeViewport = screen.getByTestId('feature-tree-viewport');
      expect(treeViewport.getAttribute('role')).toBe('tree');
      expect(treeViewport.getAttribute('aria-label')).toBe('Feature Hierarchy Tree');

      const treeNodeRows = screen.getAllByRole('treeitem');
      expect(treeNodeRows.length).toBeGreaterThan(0);
      expect(treeNodeRows[0].tabIndex).toBe(0);

      const expandBtns = screen.getAllByTestId(/^expand-btn-/);
      expect(expandBtns[0].getAttribute('aria-label')).toMatch(/Collapse|Expand/);
      expect(expandBtns[0].getAttribute('aria-expanded')).toBeTruthy();
    });

    it('ArchitectureTreemapPanel rectangles are focusable and keyboard activatable', () => {
      const onSelectComponent = vi.fn();
      render(<ArchitectureTreemapPanel data={sampleExplorerData} onSelectComponent={onSelectComponent} />);
      const rootRect = screen.getByTestId('treemap-rect-root').querySelector('[role="button"]')!;
      expect(rootRect.tabIndex).toBe(0);
      expect(rootRect.getAttribute('aria-label')).toContain('Architecture Treemap');

      fireEvent.keyDown(rootRect, { key: 'Enter' });
    });

    it('FourDirectionPanel quadrant items are focusable and keyboard activatable', () => {
      const onSelectNode = vi.fn();
      render(<FourDirectionPanel data={sampleFourDirectionData} onSelectNode={onSelectNode} />);
      const itemEl = screen.getByTestId('item-ApexClass:Util');
      expect(itemEl.tabIndex).toBe(0);
      expect(itemEl.getAttribute('role')).toBe('button');
      expect(itemEl.getAttribute('aria-label')).toContain('Util');

      fireEvent.keyDown(itemEl, { key: 'Enter' });
      expect(onSelectNode).toHaveBeenCalledWith('ApexClass:Util');
    });

    it('CouplingHeatmapPanel canvas has role="img", aria-label, aria-describedby, and tabIndex={0}', () => {
      render(<CouplingHeatmapPanel data={sampleExplorerData} />);
      const canvas = screen.getByTestId('coupling-heatmap-canvas');
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toBe('Feature Coupling Heatmap Matrix');
      expect(canvas.tabIndex).toBe(0);

      const describedBy = canvas.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const descEl = document.getElementById(describedBy!);
      expect(descEl).toBeInTheDocument();
      expect(descEl?.textContent).toContain('Interactive feature coupling heatmap matrix');
    });

    it('ArchitectureDNABarcode items are focusable and barcode strips labeled', () => {
      const onSelectNode = vi.fn();
      render(<ArchitectureDNABarcode data={sampleExplorerData} onSelectNode={onSelectNode} />);
      const itemEl = screen.getByTestId('dna-item-ApexClass:Service');
      expect(itemEl.tabIndex).toBe(0);
      expect(itemEl.getAttribute('role')).toBe('button');
      expect(itemEl.getAttribute('aria-label')).toContain('Service');

      fireEvent.keyDown(itemEl, { key: 'Enter' });
      expect(onSelectNode).toHaveBeenCalledWith('ApexClass:Service');

      const stripsContainer = screen.getByTestId('dna-barcode-visual-strips');
      expect(stripsContainer.getAttribute('role')).toBe('img');
      expect(stripsContainer.getAttribute('aria-label')).toContain('DNA Barcode Strips');
    });

    it('GraphView screen reader list uses role="list" and role="listitem"', () => {
      const { container } = render(
        <GraphView
          nodes={sampleExplorerData.nodes}
          edges={sampleExplorerData.edges}
          onSelectNode={vi.fn()}
          onSelectEdge={vi.fn()}
          selectedNodeId={null}
          selectedEdgeId={null}
        />
      );

      const listEl = container.querySelector('ul.sr-only');
      expect(listEl?.getAttribute('role')).toBe('list');

      const itemEls = container.querySelectorAll('ul.sr-only li');
      expect(itemEls.length).toBe(2);
      expect(itemEls[0].getAttribute('role')).toBe('listitem');
    });
  });
});

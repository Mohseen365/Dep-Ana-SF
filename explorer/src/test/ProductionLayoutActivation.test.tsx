import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { GraphView, GraphViewRef } from '../components/GraphView';
import * as graphLayoutModule from '../lib/graph-layout';
import * as archLayoutModule from '../lib/architecture-layout';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

vi.mock('cytoscape', () => {
  const mockCy = {
    use: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    elements: vi.fn().mockReturnValue({ remove: vi.fn(), removeClass: vi.fn(), addClass: vi.fn() }),
    add: vi.fn(),
    batch: vi.fn((cb: any) => cb()),
    on: vi.fn(),
    off: vi.fn(),
    one: vi.fn(),
    destroy: vi.fn(),
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    resize: vi.fn(),
    getElementById: vi.fn().mockReturnValue({ length: 0 }),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    fit: vi.fn(),
  };
  const cytoscapeFactory: any = vi.fn(() => mockCy);
  cytoscapeFactory.use = vi.fn();
  return {
    default: cytoscapeFactory,
  };
});

vi.mock('cytoscape-fcose', () => ({ default: {} }));
vi.mock('cytoscape-navigator', () => ({ default: {} }));

describe('Production Layout Activation & Option Propagation (Workstream B4)', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'Apex1',
      displayName: 'Apex1',
      type: 'ApexClass',
      file: 'Apex1.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 },
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
        testCoverageStatus: 'TESTED',
      },
    },
    {
      id: 'Apex2',
      displayName: 'Apex2',
      type: 'ApexClass',
      file: 'Apex2.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 10 },
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
        testCoverageStatus: 'TESTED',
      },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'e1',
      source: 'Apex1',
      target: 'Apex2',
      relationshipType: 'Calls',
      method: 'test',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: 1,
      column: 1,
      methodOwner: 'Apex2',
      file: 'Apex1.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'Apex1' },
        target: { type: 'ApexClass', name: 'Apex2' },
        relationship: { type: 'Calls', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults enableFeatureLayout to false when omitted in production GraphView props', () => {
    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    expect(getLayoutOptionsSpy).toHaveBeenCalled();
    const passedOptions = getLayoutOptionsSpy.mock.calls[0][0];
    expect(passedOptions?.enableFeatureLayout).toBe(false);
  });

  it('propagates enableFeatureLayout: true through initial load when explicitly provided', () => {
    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureLayout={true}
      />
    );

    expect(getLayoutOptionsSpy).toHaveBeenCalled();
    const passedOptions = getLayoutOptionsSpy.mock.calls[0][0];
    expect(passedOptions?.enableFeatureLayout).toBe(true);
  });

  it('propagates custom layoutOptions through initial load', () => {
    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureLayout={true}
        layoutOptions={{ domainSpacing: 500, layerSpacing: 300 }}
      />
    );

    expect(getLayoutOptionsSpy).toHaveBeenCalled();
    const passedOptions = getLayoutOptionsSpy.mock.calls[0][0];
    expect(passedOptions?.enableFeatureLayout).toBe(true);
    expect(passedOptions?.domainSpacing).toBe(500);
    expect(passedOptions?.layerSpacing).toBe(300);
  });

  it('propagates enableFeatureLayout: true through explicit Reset Layout action', () => {
    const runLayoutSpy = vi.spyOn(graphLayoutModule, 'runLayout');
    const ref = React.createRef<GraphViewRef>();

    render(
      <GraphView
        ref={ref}
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureLayout={true}
      />
    );

    act(() => {
      ref.current?.resetLayout();
    });

    expect(runLayoutSpy).toHaveBeenCalled();
    const passedOptions = runLayoutSpy.mock.calls[0][1];
    expect(passedOptions?.enableFeatureLayout).toBe(true);
  });

  it('preserves Level 2 persisted positions and does not overwrite them when enableFeatureLayout: true is enabled', () => {
    const persistedPositions = {
      Apex1: { x: 100, y: 100 },
      Apex2: { x: 200, y: 200 },
    };

    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        nodePositions={persistedPositions}
        enableFeatureLayout={true}
      />
    );

    // When authoritative persisted positions exist, auto-layout should NOT run on mount
    expect(getLayoutOptionsSpy).not.toHaveBeenCalled();
  });

  it('maintains project switching state isolation when enableFeatureLayout varies between projects', () => {
    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    // Project A without feature layout
    const { rerender } = render(
      <GraphView
        nodes={sampleNodes}
        edges={sampleEdges}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureLayout={false}
      />
    );

    expect(getLayoutOptionsSpy.mock.calls[0][0]?.enableFeatureLayout).toBe(false);

    getLayoutOptionsSpy.mockClear();

    // Switch to Project B with feature layout enabled
    const newNodes = [{ ...sampleNodes[0], id: 'ProjectB_Apex' }];
    rerender(
      <GraphView
        nodes={newNodes}
        edges={[]}
        onSelectNode={vi.fn()}
        onSelectEdge={vi.fn()}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureLayout={true}
      />
    );

    // The element sync effect should pass enableFeatureLayout: true for Project B
    const lastCall = getLayoutOptionsSpy.mock.calls[getLayoutOptionsSpy.mock.calls.length - 1];
    expect(lastCall[0]?.enableFeatureLayout).toBe(true);
  });
});

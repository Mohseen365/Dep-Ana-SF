import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { GraphView, GraphViewRef } from '../components/GraphView';
import * as graphLayoutModule from '../lib/graph-layout';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

let mockEles: any[] = [];

const createMockNode = (id: string, initialX = 100, initialY = 100) => {
  let selected = false;
  const classes = new Set<string>();
  const pos = { x: initialX, y: initialY };

  const nodeObj = {
    id: () => id,
    isNode: () => true,
    isEdge: () => false,
    position: (newPos?: { x: number; y: number }) => {
      if (newPos) {
        pos.x = newPos.x;
        pos.y = newPos.y;
      }
      return { x: pos.x, y: pos.y };
    },
    select: () => { selected = true; },
    unselect: () => { selected = false; },
    isSelected: () => selected,
    addClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.add(c));
      return nodeObj;
    },
    removeClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.delete(c));
      return nodeObj;
    },
    hasClass: (cls: string) => classes.has(cls),
    connectedEdges: () => [],
    neighborhood: () => [],
    renderedPosition: () => ({ x: pos.x, y: pos.y }),
    data: (key?: string) => key === 'id' ? id : { id, label: id, type: 'ApexClass' },
  };
  return nodeObj;
};

const createMockEdge = (id: string, source: string, target: string) => {
  let selected = false;
  const classes = new Set<string>();

  const edgeObj = {
    id: () => id,
    isNode: () => false,
    isEdge: () => true,
    select: () => { selected = true; },
    unselect: () => { selected = false; },
    isSelected: () => selected,
    addClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.add(c));
      return edgeObj;
    },
    removeClass: (cls: string) => {
      cls.split(' ').forEach(c => c && classes.delete(c));
      return edgeObj;
    },
    hasClass: (cls: string) => classes.has(cls),
    data: (key?: string) => {
      if (key === 'source') return source;
      if (key === 'target') return target;
      if (key === 'id') return id;
      return { id, source, target };
    },
  };
  return edgeObj;
};

vi.mock('cytoscape', () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    elements: vi.fn().mockImplementation(() => {
      const res = [...mockEles];
      (res as any).removeClass = (cls: string) => {
        mockEles.forEach(e => e.removeClass(cls));
        return res;
      };
      (res as any).addClass = (cls: string) => {
        mockEles.forEach(e => e.addClass(cls));
        return res;
      };
      (res as any).unselect = () => {
        mockEles.forEach(e => e.unselect());
        return res;
      };
      (res as any).remove = () => res;
      return res;
    }),
    nodes: vi.fn().mockImplementation(() => {
      const nodesList = mockEles.filter(e => e.isNode());
      return nodesList;
    }),
    edges: vi.fn().mockImplementation(() => {
      return mockEles.filter(e => e.isEdge());
    }),
    add: vi.fn().mockImplementation((eles: any[]) => {
      eles.forEach(e => {
        if (e.group === 'nodes') {
          mockEles.push(createMockNode(e.data.id, e.position?.x ?? 100, e.position?.y ?? 100));
        } else if (e.group === 'edges') {
          mockEles.push(createMockEdge(e.data.id, e.data.source, e.data.target));
        }
      });
    }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
    off: vi.fn(),
    one: vi.fn(),
    destroy: vi.fn(),
    zoomOut: vi.fn(),
    zoomIn: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    getElementById: vi.fn().mockImplementation((id: string) => {
      const found = mockEles.find(e => e.id() === id);
      if (found) {
        return {
          ...found,
          length: 1,
        };
      }
      return { length: 0, isNode: () => false, isEdge: () => false };
    }),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  };

  const cytoscapeFn: any = vi.fn().mockImplementation(() => mockCy);
  cytoscapeFn.use = vi.fn();
  return { default: cytoscapeFn };
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
        testCoverageStatus: 'COVERED',
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
        testCoverageStatus: 'COVERED',
      },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'e1',
      source: 'Apex1',
      target: 'Apex2',
      relationshipType: 'method-call',
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
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  beforeEach(() => {
    mockEles = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Do not call vi.restoreAllMocks() as it clears factory mock implementations
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
    const runLayoutSpy = vi.spyOn(graphLayoutModule, 'runLayout');
    const getLayoutOptionsSpy = vi.spyOn(graphLayoutModule, 'getLayoutOptions');

    // Project A without feature layout
    render(
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

    runLayoutSpy.mockClear();

    // Switch to Project B with feature layout enabled (remounting for new project)
    const newNodes = [{ ...sampleNodes[0], id: 'ProjectB_Apex' }];
    render(
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

    expect(getLayoutOptionsSpy).toHaveBeenCalled();
    const lastCall = getLayoutOptionsSpy.mock.calls[getLayoutOptionsSpy.mock.calls.length - 1];
    expect(lastCall[0]?.enableFeatureLayout).toBe(true);
  });
});

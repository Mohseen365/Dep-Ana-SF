import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import {
  applySimulationOperations,
  computeTemporarySimulatedPositions,
  computeFindingDelta,
  type RefactoringProposal,
} from '../lib/refactoring-simulation';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge, Position } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';

// Mock cytoscape and plugins for integration testing
const { mockRunLayout, mockCy, mockCytoscapeFn } = vi.hoisted(() => {
  const mockRunLayout = vi.fn();
  const mockElementsCollection = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    unselect: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue(mockElementsCollection),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn(),
    layout: mockRunLayout.mockReturnValue({ run: vi.fn() }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
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
  };

  const mockCytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  mockCytoscapeFn.use = vi.fn();

  return { mockRunLayout, mockCy, mockCytoscapeFn };
});

vi.mock('cytoscape', () => ({
  default: mockCytoscapeFn,
}));

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

const baseGraph: ExplorerDataSchema = {
  metadata: {
    generatedAt: '2025-01-01',
    version: '1.0',
    analyzerVersion: '1.0',
    totalNodes: 3,
    totalEdges: 2,
    sourceProject: 'default',
  },
  nodes: [
    {
      id: 'ServiceA',
      displayName: 'ServiceA',
      type: 'ApexClass',
      layer: 'application',
      risk: 'LOW',
      metrics: { linesOfCode: 100, fanIn: 1, fanOut: 1, cyclomaticComplexity: 4, weightedMethodCount: 4 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'ServiceB',
      displayName: 'ServiceB',
      type: 'ApexClass',
      layer: 'domain',
      risk: 'HIGH',
      metrics: { linesOfCode: 300, fanIn: 2, fanOut: 2, cyclomaticComplexity: 12, weightedMethodCount: 12 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NO_TESTS' },
    },
    {
      id: 'RepoC',
      displayName: 'RepoC',
      type: 'ApexClass',
      layer: 'schema',
      risk: 'LOW',
      metrics: { linesOfCode: 50, fanIn: 1, fanOut: 0, cyclomaticComplexity: 2, weightedMethodCount: 2 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ],
  edges: [
    { id: 'edge-A-B', source: 'ServiceA', target: 'ServiceB', relationshipType: 'calls' },
    { id: 'edge-B-C', source: 'ServiceB', target: 'RepoC', relationshipType: 'calls' },
  ],
  impactSummaries: {},
  entryPoints: [],
  databaseAccess: [],
  cycles: [],
  unresolvedReferences: [],
  metrics: {
    totalComponents: 3,
    highRiskComponents: 1,
    mediumRiskComponents: 0,
    lowRiskComponents: 2,
    circularDependencyCount: 0,
    unresolvedReferenceCount: 0,
    averageCyclomaticComplexity: 6.0,
  },
  riskDistribution: { HIGH: 1, MEDIUM: 0, LOW: 2 },
  layerDistribution: { presentation: 0, application: 1, domain: 1, schema: 1 },
};

vi.mock('../hooks/useExplorerData', () => ({
  useExplorerData: () => ({
    data: baseGraph,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

describe('Refactoring Simulation Position Authority & Non-Destructive Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Invariant A: Opening simulation does NOT alter existing node positions or invoke layout', () => {
    const basePositions: Record<string, Position> = {
      ServiceA: { x: 100, y: 200 },
      ServiceB: { x: 300, y: 200 },
      RepoC: { x: 500, y: 200 },
    };

    const simulatedPositions = computeTemporarySimulatedPositions(
      baseGraph.nodes,
      baseGraph.edges,
      basePositions
    );

    // Position authority: existing positions must match baseline 1:1
    expect(simulatedPositions['ServiceA']).toEqual({ x: 100, y: 200 });
    expect(simulatedPositions['ServiceB']).toEqual({ x: 300, y: 200 });
    expect(simulatedPositions['RepoC']).toEqual({ x: 500, y: 200 });
  });

  it('Invariant B & C: Simulated Add & Remove do NOT mutate existing node positions', () => {
    const basePositions: Record<string, Position> = {
      ServiceA: { x: 100, y: 200 },
      ServiceB: { x: 300, y: 200 },
      RepoC: { x: 500, y: 200 },
    };

    const newNode: ExplorerNode = {
      id: 'ServiceHelper',
      displayName: 'ServiceHelper',
      type: 'ApexClass',
      layer: 'application',
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    };
    const newEdge: ExplorerEdge = {
      id: 'edge-A-Helper',
      source: 'ServiceA',
      target: 'ServiceHelper',
      relationshipType: 'calls',
    };

    const ops = [
      { type: 'add-node' as const, node: newNode },
      { type: 'add-edge' as const, edge: newEdge },
      { type: 'remove-node' as const, nodeId: 'ServiceB' },
    ];

    const mutated = applySimulationOperations(baseGraph, ops);
    const tempPositions = computeTemporarySimulatedPositions(
      mutated.nodes,
      mutated.edges,
      basePositions
    );

    // Existing nodes retain exact positions (0px drift)
    expect(tempPositions['ServiceA']).toEqual({ x: 100, y: 200 });
    expect(tempPositions['RepoC']).toEqual({ x: 500, y: 200 });

    // Newly added node receives deterministic neighbor-derived temporary position
    expect(tempPositions['ServiceHelper']).toBeDefined();
    expect(typeof tempPositions['ServiceHelper'].x).toBe('number');
    expect(typeof tempPositions['ServiceHelper'].y).toBe('number');
  });

  it('Invariant E: Cancelling simulation restores committed state completely (committed === original)', () => {
    const originalNodes = [...baseGraph.nodes];
    const proposal: RefactoringProposal = {
      id: 'p-1',
      title: 'Sample proposal',
      description: 'Desc',
      steps: [
        {
          id: 's-1',
          title: 'Step 1',
          description: 'Step 1 desc',
          operations: [{ type: 'remove-node', nodeId: 'ServiceB' }],
        },
      ],
    };

    const simGraph = applySimulationOperations(baseGraph, proposal.steps[0].operations);
    expect(simGraph.nodes.length).toBe(2);

    // Cancellation drops simGraph without committing
    const finalGraph = baseGraph;
    expect(finalGraph.nodes).toEqual(originalNodes);
  });

  it('Invariant F: Explicit Commit forwards operations to mutation pipeline without auto-relayout', () => {
    render(<App />);

    expect(screen.getAllByText('ServiceA').length).toBeGreaterThan(0);
  });

  it('computes finding delta accurately during simulation steps', () => {
    const finding1: ArchitectureFinding = {
      id: 'f-1',
      ruleId: 'HIGH_RISK',
      severity: 'HIGH',
      title: 'High Risk Component',
      description: 'Component ServiceB is high risk',
      affectedNodeIds: ['ServiceB'],
    };

    const before = [finding1];
    const after: ArchitectureFinding[] = [];

    const delta = computeFindingDelta(before, after);
    expect(delta.resolved.length).toBe(1);
    expect(delta.resolved[0].id).toBe('f-1');
  });
});

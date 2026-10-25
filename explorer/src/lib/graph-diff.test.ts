import { describe, it, expect } from 'vitest';
import { computeGraphDiff } from './graph-diff';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';

const mockCanonical = {
  source: { type: 'ApexClass' as const, name: 'A' },
  target: { type: 'ApexClass' as const, name: 'B' },
  relationship: { type: 'method-call' as const, resolution: 'EXACT' as const },
  location: { line: 1, column: 1 },
};

const createNode = (id: string, name: string, type: any, risk: any): ExplorerNode => ({
  id,
  displayName: name,
  type,
  file: `${name}.cls`,
  risk,
  riskReasons: [],
  metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
  behavior: { isTest: false, sharing: 'with sharing', publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
  refactoringReadiness: { isHighRisk: risk === 'HIGH', hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
});

const createEdge = (id: string, source: string, target: string, relationshipType: any): ExplorerEdge => ({
  id,
  source,
  target,
  relationshipType,
  method: null,
  evidence: '',
  unresolved: false,
  resolutionClassification: 'RESOLVED_LOCAL',
  resolutionStrategy: 'EXACT',
  confidence: '1.0',
  line: 1,
  column: 1,
  methodOwner: null,
  file: 'A.cls',
  canonical: mockCanonical,
});

describe('graph-diff (F8)', () => {
  const createMockData = (): ExplorerDataSchema => ({
    schemaVersion: '1.0',
    analyzerVersion: '1.0',
    generatedAt: '2026-01-01T00:00:00Z',
    sourceDirectory: 'force-app',
    summary: { nodeCount: 2, edgeCount: 1, highRiskCount: 1, mediumRiskCount: 0, lowRiskCount: 1, cycleCount: 0, unresolvedCount: 0, inventory: { files: 2, apexClasses: 2, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
    nodes: [
      createNode('nodeA', 'A', 'ApexClass', 'LOW'),
      createNode('nodeB', 'B', 'ApexClass', 'HIGH'),
    ],
    edges: [
      createEdge('edgeAB', 'nodeA', 'nodeB', 'method-call'),
    ],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  });

  it('detects added, removed, and modified nodes and edges', () => {
    const baseline = createMockData();
    const current = createMockData();

    current.nodes = [
      { ...baseline.nodes[0], risk: 'HIGH' },
      createNode('nodeC', 'C', 'LWC', 'LOW'),
    ];
    current.edges = [
      createEdge('edgeAC', 'nodeA', 'nodeC', 'instantiation'),
    ];

    const diff = computeGraphDiff(baseline, current);

    expect(diff.summary.addedNodesCount).toBe(1);
    expect(diff.addedNodes[0].id).toBe('nodeC');

    expect(diff.summary.removedNodesCount).toBe(1);
    expect(diff.removedNodes[0].id).toBe('nodeB');

    expect(diff.summary.modifiedNodesCount).toBe(1);
    expect(diff.modifiedNodes[0].id).toBe('nodeA');

    expect(diff.summary.addedEdgesCount).toBe(1);
    expect(diff.addedEdges[0].id).toBe('edgeAC');

    expect(diff.summary.removedEdgesCount).toBe(1);
    expect(diff.removedEdges[0].id).toBe('edgeAB');

    expect(diff.summary.netNodeChange).toBe(0);
    expect(diff.summary.netEdgeChange).toBe(0);
  });

  it('returns zero changes when baseline and current are identical', () => {
    const baseline = createMockData();
    const current = createMockData();

    const diff = computeGraphDiff(baseline, current);

    expect(diff.summary.addedNodesCount).toBe(0);
    expect(diff.summary.removedNodesCount).toBe(0);
    expect(diff.summary.modifiedNodesCount).toBe(0);
    expect(diff.unchangedNodes).toHaveLength(2);
  });
});

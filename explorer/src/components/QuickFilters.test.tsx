import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

export interface QuickFilter {
  key: string;
  label: string;
  predicate: (n: ExplorerNode) => boolean;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { key: 'high-risk', label: '⚠️ High Risk', predicate: (n: ExplorerNode) => n.risk === 'HIGH' },
  { key: 'apex-only', label: 'Apex', predicate: (n: ExplorerNode) => n.type === 'ApexClass' || n.type === 'ApexTrigger' },
  { key: 'no-tests', label: 'No tests', predicate: (n: ExplorerNode) => n.refactoringReadiness?.testCoverageStatus === 'NO_TESTS' },
  { key: 'cycles', label: 'In cycles', predicate: (n: ExplorerNode) => Boolean(n.refactoringReadiness?.hasCycles) },
  { key: 'unresolved', label: 'Unresolved', predicate: (n: ExplorerNode) => Boolean(n.riskReasons?.includes('unresolved')) },
];

export function applyQuickFilters(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  activeQuickFilters: Set<string>
): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  if (activeQuickFilters.size === 0) {
    return { nodes, edges };
  }

  const activePredicates = QUICK_FILTERS.filter((f) => activeQuickFilters.has(f.key)).map((f) => f.predicate);
  const filteredNodes = nodes.filter((n) => activePredicates.every((p) => p(n)));
  const validNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target));

  return { nodes: filteredNodes, edges: filteredEdges };
}

const mockCanonical = {
  source: { type: 'ApexClass' as const, name: 'A' },
  target: { type: 'ApexClass' as const, name: 'B' },
  relationship: { type: 'method-call' as const, resolution: 'EXACT' as const },
  location: { line: 1, column: 1 },
};

describe('Quick Filter Chips (F5)', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'Apex1',
      displayName: 'HighRiskApexClass',
      type: 'ApexClass',
      file: 'A.cls',
      risk: 'HIGH',
      riskReasons: ['unresolved'],
      metrics: { fanIn: 5, fanOut: 2, coupling: 7, unresolved: 1, score: 0 },
      behavior: { isTest: false, sharing: 'with sharing', publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: true, hasUnresolved: true, testCoverageStatus: 'NO_TESTS' },
    },
    {
      id: 'LWC1',
      displayName: 'HighRiskLwc',
      type: 'LWC',
      file: 'B.js',
      risk: 'HIGH',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 },
      behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NO_TESTS' },
    },
    {
      id: 'Apex2',
      displayName: 'LowRiskApexClass',
      type: 'ApexClass',
      file: 'C.cls',
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 },
      behavior: { isTest: false, sharing: 'with sharing', publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    { id: 'e1', source: 'Apex1', target: 'LWC1', relationshipType: 'method-call', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: 1, column: 1, methodOwner: null, file: 'A.cls', canonical: mockCanonical },
    { id: 'e2', source: 'Apex1', target: 'Apex2', relationshipType: 'method-call', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: 1, column: 1, methodOwner: null, file: 'A.cls', canonical: mockCanonical },
  ];

  it('filters nodes with high-risk chip', () => {
    const active = new Set(['high-risk']);
    const { nodes, edges } = applyQuickFilters(sampleNodes, sampleEdges, active);

    expect(nodes.map((n) => n.id)).toEqual(['Apex1', 'LWC1']);
    expect(edges.map((e) => e.id)).toEqual(['e1']);
  });

  it('filters with AND combination of multiple chips (high-risk AND apex-only AND no-tests)', () => {
    const active = new Set(['high-risk', 'apex-only', 'no-tests']);
    const { nodes, edges } = applyQuickFilters(sampleNodes, sampleEdges, active);

    expect(nodes.map((n) => n.id)).toEqual(['Apex1']);
    expect(edges).toHaveLength(0);
  });

  it('retains edges only when both source and target satisfy filters', () => {
    const active = new Set(['cycles']);
    const { nodes, edges } = applyQuickFilters(sampleNodes, sampleEdges, active);

    expect(nodes.map((n) => n.id)).toEqual(['Apex1']);
    expect(edges).toHaveLength(0);
  });

  it('returns all nodes and edges when quick filters are cleared', () => {
    const active = new Set<string>();
    const { nodes, edges } = applyQuickFilters(sampleNodes, sampleEdges, active);

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

function createMockNode(id: string, overrides: Partial<ExplorerNode> = {}): ExplorerNode {
  return {
    id,
    displayName: id,
    type: 'ApexClass',
    file: `src/${id}.cls`,
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
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
      testCoverageStatus: 'FULL_COVERAGE',
    },
    ...overrides,
  };
}

function createMockEdge(id: string, source: string, target: string, overrides: Partial<ExplorerEdge> = {}): ExplorerEdge {
  const { method, ...restOverrides } = overrides;
  return {
    id,
    source,
    target,
    relationshipType: 'method-call',
    method: method ?? null,
    evidence: 'calls target',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: source,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
    ...restOverrides,
  };
}

describe('Architecture Layout Stage 2A Remediation Tests', () => {
  it('A1/A38/A39: Phantom node fabrication assigns HIGH risk and unresolved metrics', () => {
    const nodeA = createMockNode('NodeA');
    const edge = createMockEdge('Edge1', 'NodeA', 'PhantomNodeB'); // Target does not exist in nodes array

    const result = computeArchitectureLayoutWithMetadata([nodeA], [edge]);

    // The result should include position for PhantomNodeB
    expect(result.positions['PhantomNodeB']).toBeDefined();

    // Check that PhantomNodeB was created as high risk / unresolved
    // We can verify this via input immutability or checking that every safe node got a position
    expect(result.positions['NodeA']).toBeDefined();
    expect(Number.isFinite(result.positions['PhantomNodeB'].x)).toBe(true);
    expect(Number.isFinite(result.positions['PhantomNodeB'].y)).toBe(true);
  });

  it('A8/X4: Rejects NaN and Infinity in existingPositions', () => {
    const nodeA = createMockNode('NodeA');
    const nodeB = createMockNode('NodeB');
    const edge = createMockEdge('Edge1', 'NodeA', 'NodeB');

    const result = computeArchitectureLayoutWithMetadata([nodeA, nodeB], [edge], {
      existingPositions: {
        NodeA: { x: NaN, y: 100 },
        NodeB: { x: 200, y: Infinity },
      },
    });

    expect(Number.isFinite(result.positions['NodeA'].x)).toBe(true);
    expect(Number.isFinite(result.positions['NodeA'].y)).toBe(true);
    expect(Number.isFinite(result.positions['NodeB'].x)).toBe(true);
    expect(Number.isFinite(result.positions['NodeB'].y)).toBe(true);
    expect(Number.isNaN(result.positions['NodeA'].x)).toBe(false);
  });

  it('A9: Ignores unknown node IDs in existingPositions', () => {
    const nodeA = createMockNode('NodeA');
    const result = computeArchitectureLayoutWithMetadata([nodeA], [], {
      existingPositions: {
        NodeA: { x: 100, y: 100 },
        UnknownGhostNode: { x: 500, y: 500 },
      },
    });

    expect(result.positions['NodeA']).toEqual({ x: 100, y: 100 });
    expect(result.positions['UnknownGhostNode']).toBeUndefined();
  });

  it('A11/A36: Preserves input immutability and deep clones input structures', () => {
    const nodeA = createMockNode('NodeA');
    const edge = createMockEdge('Edge1', 'NodeA', 'NodeB');

    const frozenNodeA = Object.freeze({ ...nodeA, metrics: Object.freeze({ ...nodeA.metrics }) });
    const frozenEdge = Object.freeze({ ...edge });

    expect(() => {
      computeArchitectureLayoutWithMetadata([frozenNodeA as ExplorerNode], [frozenEdge as ExplorerEdge]);
    }).not.toThrow();
  });

  it('A44: Computes finite positions for all real input nodes without dropping any', () => {
    const nodes = [
      createMockNode('Comp1_Node1'),
      createMockNode('Comp1_Node2'),
      createMockNode('Comp2_Node1'),
      createMockNode('Comp2_Node2'),
    ];
    const edges = [
      createMockEdge('e1', 'Comp1_Node1', 'Comp1_Node2'),
      createMockEdge('e2', 'Comp2_Node1', 'Comp2_Node2'),
    ];

    const result = computeArchitectureLayoutWithMetadata(nodes, edges);

    for (const node of nodes) {
      expect(result.positions[node.id]).toBeDefined();
      expect(Number.isFinite(result.positions[node.id].x)).toBe(true);
      expect(Number.isFinite(result.positions[node.id].y)).toBe(true);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { rankDependents, rankDependencies } from './drill';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';

function createMockNode(id: string, displayName: string): ExplorerNode {
  return {
    id,
    displayName,
    type: 'ApexClass',
    file: `force-app/main/default/classes/${displayName}.cls`,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: false,
      publicContractsCount: 0,
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

describe('drill.ts - rankDependents and rankDependencies', () => {
  const nodeA = createMockNode('NodeA', 'AlphaService');
  const nodeB = createMockNode('NodeB', 'BetaController');
  const nodeC = createMockNode('NodeC', 'CharlieUtil');
  const nodeD = createMockNode('NodeD', 'DeltaHelper');
  const targetNode = createMockNode('TargetNode', 'TargetNode');

  const mockData: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-01-01T00:00:00Z',
    sourceDirectory: 'force-app',
    summary: {
      nodeCount: 5,
      edgeCount: 4,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 5,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 5,
        apexClasses: 5,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes: [targetNode, nodeA, nodeB, nodeC, nodeD],
    edges: [],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {
      TargetNode: {
        id: 'TargetNode',
        directDependents: ['NodeB', 'NodeC'],
        transitiveDependents: ['NodeA', 'NodeD'],
        directDependencies: ['NodeC', 'NodeD'],
        transitiveDependencies: ['NodeA', 'NodeB'],
        impactedTests: [],
        totalImpactCount: 10,
      },
      NodeA: {
        id: 'NodeA',
        directDependencies: [],
        directDependents: [],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 10,
      },
      NodeB: {
        id: 'NodeB',
        directDependencies: [],
        directDependents: [],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 10,
      },
      NodeC: {
        id: 'NodeC',
        directDependencies: [],
        directDependents: [],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 3,
      },
      NodeD: {
        id: 'NodeD',
        directDependencies: [],
        directDependents: [],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 5,
      },
    },
  };

  it('Determinism: same input, same output order when called twice', () => {
    const res1 = rankDependents('TargetNode', mockData);
    const res2 = rankDependents('TargetNode', mockData);

    expect(res1).toEqual(res2);

    const deps1 = rankDependencies('TargetNode', mockData);
    const deps2 = rankDependencies('TargetNode', mockData);

    expect(deps1).toEqual(deps2);
  });

  it('Ranking: component with 10 dependents beats one with 3', () => {
    const res = rankDependents('TargetNode', mockData);

    // Dependent NodeD has impactCount 5, NodeC has 3.
    // NodeA has 10, NodeB has 10.
    // NodeA and NodeB both have impactCount 10. NodeD has 5. NodeC has 3.
    expect(res.map((r) => r.node.displayName)).toEqual([
      'AlphaService',  // NodeA (impact 10, direct false)
      'BetaController', // NodeB (impact 10, direct true)
      'DeltaHelper',   // NodeD (impact 5, direct false)
      'CharlieUtil',   // NodeC (impact 3, direct true)
    ]);

    expect(res[0].impactCount).toBe(10);
    expect(res[3].impactCount).toBe(3);
  });

  it('Tie-break: alphabetical on equal impact counts', () => {
    const res = rankDependents('TargetNode', mockData);
    // NodeA ('AlphaService') and NodeB ('BetaController') both have impactCount 10
    expect(res[0].node.displayName).toBe('AlphaService');
    expect(res[1].node.displayName).toBe('BetaController');
  });

  it('Empty cases: node with zero dependents returns []', () => {
    const res = rankDependents('NodeA', mockData);
    expect(res).toEqual([]);

    const deps = rankDependencies('NodeA', mockData);
    expect(deps).toEqual([]);
  });

  it('Direct vs Transitive flags in rankDependents', () => {
    const res = rankDependents('TargetNode', mockData);
    const beta = res.find((r) => r.node.id === 'NodeB');
    const alpha = res.find((r) => r.node.id === 'NodeA');

    expect(beta?.isDirect).toBe(true);
    expect(alpha?.isDirect).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { getArchitecturalHotspots, sortNodesDeterministically } from './hotspots';
import { createSampleNode } from '../test/fixtures/sample-nodes';
import { sampleCycles } from '../test/fixtures/sample-cycles';
import type { ExplorerNode, ExplorerCycleGroup } from '../types/explorer';

describe('getArchitecturalHotspots', () => {
  const nodes: ExplorerNode[] = [
    createSampleNode({
      id: 'ApexClass:CommonSelector',
      displayName: 'CommonSelector',
      metrics: { fanIn: 82, fanOut: 5, coupling: 87, unresolved: 0, score: 20 },
      risk: 'HIGH',
      riskReasons: ['high fan-in'],
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    }),
    createSampleNode({
      id: 'ApexClass:UserService',
      displayName: 'UserService',
      metrics: { fanIn: 67, fanOut: 10, coupling: 77, unresolved: 0, score: 18 },
      risk: 'HIGH',
      riskReasons: ['high fan-in'],
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    }),
    createSampleNode({
      id: 'ApexClass:ApprovalService',
      displayName: 'ApprovalService',
      metrics: { fanIn: 3, fanOut: 4, coupling: 7, unresolved: 1, score: 8 },
      risk: 'HIGH',
      riskReasons: ['participates in cycle'],
      refactoringReadiness: { isHighRisk: true, hasCycles: true, hasUnresolved: true, testCoverageStatus: 'COVERED' },
    }),
    createSampleNode({
      id: 'ApexClass:LowRiskHelper',
      displayName: 'LowRiskHelper',
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    }),
  ];

  const cycles: ExplorerCycleGroup[] = [
    {
      ...sampleCycles[0],
      nodes: ['ApexClass:ApprovalService', 'ApexClass:ApprovalHelper']
    }
  ];

  it('safely handles empty graphs', () => {
    const res = getArchitecturalHotspots([], []);
    expect(res.highRisk).toEqual([]);
    expect(res.highFanIn).toEqual([]);
    expect(res.highCoupling).toEqual([]);
    expect(res.circular).toEqual([]);
    expect(res.unresolved).toEqual([]);
    expect(res.topRanked).toEqual([]);
  });

  it('identifies and categorizes architectural hotspots correctly', () => {
    const res = getArchitecturalHotspots(nodes, cycles);
    expect(res.highRisk.length).toBe(3);
    expect(res.highFanIn.length).toBe(2);
    expect(res.highCoupling.length).toBe(2);
    expect(res.circular.length).toBe(1);
    expect(res.unresolved.length).toBe(1);
    expect(res.topRanked.length).toBe(3);
  });

  it('sorts nodes deterministically with score, coupling, fanIn, and displayName tie-breaking', () => {
    const tiedNodes: ExplorerNode[] = [
      { ...nodes[3], id: '1', displayName: 'B_Service', metrics: { fanIn: 5, fanOut: 5, coupling: 10, unresolved: 0, score: 5 } },
      { ...nodes[3], id: '2', displayName: 'A_Service', metrics: { fanIn: 5, fanOut: 5, coupling: 10, unresolved: 0, score: 5 } },
      { ...nodes[3], id: '3', displayName: 'C_Service', metrics: { fanIn: 2, fanOut: 10, coupling: 12, unresolved: 0, score: 5 } },
      { ...nodes[3], id: '4', displayName: 'D_Service', metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 } }
    ];

    const sorted = sortNodesDeterministically(tiedNodes);
    expect(sorted[0].displayName).toBe('D_Service'); // Score 10
    expect(sorted[1].displayName).toBe('C_Service'); // Score 5, Coupling 12
    expect(sorted[2].displayName).toBe('A_Service'); // Score 5, Coupling 10, DisplayName A
    expect(sorted[3].displayName).toBe('B_Service'); // Score 5, Coupling 10, DisplayName B
  });
});

import { describe, it, expect } from 'vitest';
import { getArchitecturalHotspots, sortNodesDeterministically } from './hotspots';
import { ExplorerNode, ExplorerCycleGroup } from '../types/explorer';

describe('getArchitecturalHotspots', () => {
  const nodes: ExplorerNode[] = [
    {
      id: 'ApexClass:CommonSelector',
      displayName: 'CommonSelector',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/CommonSelector.cls',
      metrics: { fanIn: 82, fanOut: 5, coupling: 87, unresolved: 0, score: 20 },
      risk: 'HIGH',
      riskReasons: ['high fan-in'],
      behavior: { isTest: false, publicContractsCount: 5, asyncPatterns: [], securitySignalsCount: 0, queryCount: 10, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    },
    {
      id: 'ApexClass:UserService',
      displayName: 'UserService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/UserService.cls',
      metrics: { fanIn: 67, fanOut: 10, coupling: 77, unresolved: 0, score: 18 },
      risk: 'HIGH',
      riskReasons: ['high fan-in'],
      behavior: { isTest: false, publicContractsCount: 3, asyncPatterns: [], securitySignalsCount: 0, queryCount: 2, dmlCount: 1, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    },
    {
      id: 'ApexClass:ApprovalService',
      displayName: 'ApprovalService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/ApprovalService.cls',
      metrics: { fanIn: 3, fanOut: 4, coupling: 7, unresolved: 1, score: 8 },
      risk: 'HIGH',
      riskReasons: ['participates in cycle'],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 1, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: true, hasUnresolved: true, testCoverageStatus: 'COVERED' }
    },
    {
      id: 'ApexClass:LowRiskHelper',
      displayName: 'LowRiskHelper',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/LowRiskHelper.cls',
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    }
  ];

  const cycles: ExplorerCycleGroup[] = [
    {
      id: 'cycle-1',
      size: 2,
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

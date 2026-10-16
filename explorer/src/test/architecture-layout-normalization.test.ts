import { describe, test, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Tier A3 — Edge Endpoint Normalization Hoisting', () => {
  const nodes: ExplorerNode[] = [
    {
      id: 'LWC:focal-comp',
      displayName: 'FocalComp',
      type: 'LWC',
      file: 'focalComp.js',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const edges: ExplorerEdge[] = [
    {
      id: 'edge-unresolved-1',
      source: 'LWC:focal-comp',
      target: 'ApexClass:UndeclaredService',
      relationshipType: 'lwc-apex',
      method: null,
      evidence: '',
      unresolved: true,
      resolutionClassification: 'UNKNOWN',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: '',
      canonical: { source: { type: 'LWC', name: 'LWC:focal-comp' }, target: { type: 'ApexClass', name: 'ApexClass:UndeclaredService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} },
    },
  ];

  test('Orbit mode includes synthetic External endpoint node for undeclared edge targets', () => {
    const orbitRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-comp',
    });

    expect(orbitRes.positions['ApexClass:UndeclaredService']).toBeDefined();
    expect(orbitRes.projectedNodeIds?.has('ApexClass:UndeclaredService')).toBe(true);
  });

  test('Constellation mode includes synthetic External endpoint node for undeclared edge targets', () => {
    const constellationRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'constellation',
    });

    expect(constellationRes.positions['ApexClass:UndeclaredService']).toBeDefined();
    expect(constellationRes.projectedNodeIds?.has('ApexClass:UndeclaredService')).toBe(true);
  });
});

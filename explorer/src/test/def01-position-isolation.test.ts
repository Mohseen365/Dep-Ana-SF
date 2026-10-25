import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

describe('DEF-01 Behavioral Regression Test Suite — Position-Key Isolation', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'LWC:focal-a',
      displayName: 'focal-a',
      type: 'LWC',
      file: 'a.js',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
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
    },
    {
      id: 'ApexClass:service-b',
      displayName: 'service-b',
      type: 'ApexClass',
      file: 'b.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
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
    },
    {
      id: 'ApexClass:unreachable-c',
      displayName: 'unreachable-c',
      type: 'ApexClass',
      file: 'c.cls',
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
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'e1',
      source: 'LWC:focal-a',
      target: 'ApexClass:service-b',
      relationshipType: 'lwc-apex',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: null,
      file: 'a.js',
      canonical: {
        source: { type: 'LWC', name: 'focal-a' },
        target: { type: 'ApexClass', name: 'service-b' },
        relationship: { type: 'lwc-apex', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  const staleExistingPositions = {
    'LWC:focal-a': { x: 100, y: 100 },
    'ApexClass:service-b': { x: 200, y: 200 },
    'ApexClass:unreachable-c': { x: 999, y: 999 }, // Stale position for unprojected node
  };

  it('Required Test A — Orbit Mode Position-Key Isolation: unprojected node IDs are absent in result.positions', () => {
    const result = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-a',
      existingPositions: staleExistingPositions,
    });

    const returnedKeys = new Set(Object.keys(result.positions));
    const projectedKeys = result.projectedNodeIds || new Set();

    expect(returnedKeys.has('LWC:focal-a')).toBe(true);
    expect(returnedKeys.has('ApexClass:service-b')).toBe(true);

    // DEF-01 core assertion: unprojected node 'ApexClass:unreachable-c' must NOT be in result.positions
    expect(returnedKeys.has('ApexClass:unreachable-c')).toBe(false);

    // Verify key set equivalence with projectedNodeIds
    expect(returnedKeys).toEqual(projectedKeys);
  });

  it('Required Test B — Constellation Mode Position-Key Isolation: unprojected node IDs are absent in result.positions', () => {
    const result = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'constellation',
      existingPositions: staleExistingPositions,
    });

    const returnedKeys = new Set(Object.keys(result.positions));
    const projectedKeys = result.projectedNodeIds || new Set();

    expect(returnedKeys.has('LWC:focal-a')).toBe(true);
    expect(returnedKeys.has('ApexClass:service-b')).toBe(true);

    // DEF-01 core assertion: unprojected node 'ApexClass:unreachable-c' must NOT be in result.positions
    expect(returnedKeys.has('ApexClass:unreachable-c')).toBe(false);

    // Verify key set equivalence with projectedNodeIds
    expect(returnedKeys).toEqual(projectedKeys);
  });

  it('Required Test C — Existing Behavior Preservation: projected node coordinate calculation remains deterministic and non-mutated', () => {
    const resultNoExisting = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-a',
    });

    const resultWithExisting = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-a',
      existingPositions: staleExistingPositions,
    });

    // Positions calculated for projected nodes must match bit-for-bit regardless of stale existingPositions
    expect(resultWithExisting.positions['LWC:focal-a']).toEqual(resultNoExisting.positions['LWC:focal-a']);
    expect(resultWithExisting.positions['ApexClass:service-b']).toEqual(resultNoExisting.positions['ApexClass:service-b']);
  });

  it('Required Test D — Cross-Focal Position Isolation: changing focal LWC produces strictly focal-projected nodes', () => {
    const multiLwcNodes: ExplorerNode[] = [
      ...sampleNodes,
      {
        id: 'LWC:focal-d',
        displayName: 'focal-d',
        type: 'LWC',
        file: 'd.js',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
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
      },
      {
        id: 'ApexClass:service-e',
        displayName: 'service-e',
        type: 'ApexClass',
        file: 'e.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
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
      },
    ];

    const multiLwcEdges: ExplorerEdge[] = [
      ...sampleEdges,
      {
        id: 'e2',
        source: 'LWC:focal-d',
        target: 'ApexClass:service-e',
        relationshipType: 'lwc-apex',
        method: null,
        evidence: '',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 1,
        column: 1,
        methodOwner: null,
        file: 'd.js',
        canonical: {
          source: { type: 'LWC', name: 'focal-d' },
          target: { type: 'ApexClass', name: 'service-e' },
          relationship: { type: 'lwc-apex', resolution: 'EXACT' },
          location: {},
        },
      },
    ];

    // Simulate switching focus to LWC:focal-d while passing previous LWC:focal-a positions as existingPositions
    const resultFocalD = computeArchitectureLayoutWithMetadata(multiLwcNodes, multiLwcEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-d',
      existingPositions: {
        'LWC:focal-a': { x: 0, y: 0 },
        'ApexClass:service-b': { x: 200, y: 200 },
      },
    });

    const keysD = new Set(Object.keys(resultFocalD.positions));
    expect(keysD.has('LWC:focal-d')).toBe(true);
    expect(keysD.has('ApexClass:service-e')).toBe(true);

    // Stale focal-a nodes must be omitted from focal-d positions map
    expect(keysD.has('LWC:focal-a')).toBe(false);
    expect(keysD.has('ApexClass:service-b')).toBe(false);
  });
});

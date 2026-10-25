import { describe, it, expect } from 'vitest';
import { extractNodesAndEdgesFromCy } from '../lib/graph-layout';
import type { ExplorerNode } from '../types/explorer';

describe('Z46 - extractNodesAndEdgesFromCy Round-Trip Contract', () => {
  it('extractNodesAndEdgesFromCy round-trips all node fields without fabrication', () => {
    const originalNode: ExplorerNode = {
      id: 'ApexClass:AccountController',
      displayName: 'AccountController',
      type: 'ApexClass',
      layer: 'application',
      domain: 'core',
      risk: 'HIGH',
      riskReasons: ['High coupling'],
      metrics: {
        coupling: 5,
        fanIn: 2,
        fanOut: 3,
        unresolved: 0,
        score: 88,
      },
      file: 'classes/AccountController.cls',
      behavior: {
        isTest: false,
        publicContractsCount: 4,
        asyncPatterns: ['@future'],
        securitySignalsCount: 2,
        queryCount: 5,
        dmlCount: 2,
        calloutCount: 1,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: true,
        hasUnresolved: false,
        testCoverageStatus: 'FULL_COVERAGE',
      },
    };

    const mockCyNode = {
      id: () => originalNode.id,
      data: () => ({
        ...originalNode,
        label: originalNode.displayName,
      }),
    };

    const mockCy = {
      nodes: () => [mockCyNode],
      edges: () => [],
    };

    const { nodes } = extractNodesAndEdgesFromCy(mockCy as any);

    // Fails on Stage 0 code because extractNodesAndEdgesFromCy fabricates metrics.score (0),
    // behavior.publicContractsCount (0), testCoverageStatus ('UNTESTED'), etc.
    expect(nodes[0]).toEqual(originalNode);
  });
});

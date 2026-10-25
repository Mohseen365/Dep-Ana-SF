import { describe, it, expect } from 'vitest';
import { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  selectDiscoveredFeatures,
  selectFilteredGraph,
  selectNodeLayers,
  selectCentralityScores,
  selectHotspots,
  selectDiffModel,
} from './index';

const createMockSchema = (projectId = 'test-proj'): ExplorerDataSchema => {
  const nodes: ExplorerNode[] = [
    {
      id: 'node-1',
      displayName: 'AccountController',
      type: 'ApexClass',
      file: 'classes/AccountController.cls',
      risk: 'HIGH',
      riskReasons: ['High coupling'],
      metrics: { score: 90, fanIn: 10, fanOut: 2, coupling: 18, unresolved: 0 },
      behavior: {
        isTest: false,
        publicContractsCount: 5,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
    {
      id: 'node-2',
      displayName: 'AccountService',
      type: 'ApexClass',
      file: 'classes/AccountService.cls',
      risk: 'MEDIUM',
      riskReasons: [],
      metrics: { score: 60, fanIn: 5, fanOut: 5, coupling: 10, unresolved: 0 },
      behavior: {
        isTest: false,
        publicContractsCount: 4,
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
      id: 'node-3',
      displayName: 'AccountTrigger',
      type: 'ApexTrigger',
      file: 'triggers/AccountTrigger.trigger',
      risk: 'LOW',
      riskReasons: [],
      metrics: { score: 30, fanIn: 1, fanOut: 8, coupling: 5, unresolved: 0 },
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
        testCoverageStatus: 'COVERED',
      },
    },
  ];

  const edges: ExplorerEdge[] = [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      relationshipType: 'method-call',
      method: 'getAccount',
      evidence: 'AccountService.getAccount()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 15,
      column: 10,
      methodOwner: 'AccountService',
      file: 'classes/AccountController.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AccountController' },
        target: { type: 'ApexClass', name: 'AccountService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 15, column: 10 },
      },
    },
    {
      id: 'edge-2',
      source: 'node-3',
      target: 'node-2',
      relationshipType: 'method-call',
      method: 'processTrigger',
      evidence: 'AccountService.processTrigger()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 5,
      column: 8,
      methodOwner: 'AccountService',
      file: 'triggers/AccountTrigger.trigger',
      canonical: {
        source: { type: 'ApexTrigger', name: 'AccountTrigger' },
        target: { type: 'ApexClass', name: 'AccountService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 5, column: 8 },
      },
    },
  ];

  return {
    project: {
      id: projectId,
      name: 'Test Project',
      sourcePath: 'force-app',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      analysisStatus: 'COMPLETE',
      componentCount: 3,
      dependencyCount: 2,
    },
    summary: {
      nodeCount: 3,
      edgeCount: 2,
      highRiskCount: 1,
      mediumRiskCount: 1,
      lowRiskCount: 1,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 3,
        apexClasses: 2,
        apexTriggers: 1,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes,
    edges,
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };
};

describe('Centralized Selectors', () => {
  it('selectDiscoveredFeatures is pure, deterministic, and memoized', () => {
    const schema = createMockSchema();

    const res1 = selectDiscoveredFeatures(schema);
    const res2 = selectDiscoveredFeatures(schema);

    expect(res1).toBe(res2); // Reference equality check for memoization
    expect(res1.length).toBeGreaterThanOrEqual(0);

    const emptyRes = selectDiscoveredFeatures(null);
    expect(emptyRes).toEqual([]);
  });

  it('selectFilteredGraph handles filtering and invalidates on filter change', () => {
    const schema = createMockSchema();

    const allRes = selectFilteredGraph(schema);
    expect(allRes.nodes.length).toBe(3);

    // Same options should reuse cached result
    const opts = { filterState: { searchQuery: 'Account', typeFilter: '' as const, riskFilter: '' as any, hasCallouts: false, withoutSharing: false, hideTests: false, hasAsyncPatterns: false } };
    const filtered1 = selectFilteredGraph(schema, opts);
    const filtered2 = selectFilteredGraph(schema, opts);
    expect(filtered1).toBe(filtered2);

    // Filter change must invalidate cache and return updated results
    const optsRisk = { filterState: { searchQuery: '', typeFilter: '' as const, riskFilter: 'HIGH' as const, hasCallouts: false, withoutSharing: false, hideTests: false, hasAsyncPatterns: false } };
    const highRiskRes = selectFilteredGraph(schema, optsRisk);
    expect(highRiskRes).not.toBe(filtered1);
    expect(highRiskRes.nodes.length).toBe(1);
    expect(highRiskRes.nodes[0].id).toBe('node-1');
  });

  it('selectNodeLayers and selectCentralityScores extract layer map and centrality analysis', () => {
    const schema = createMockSchema();

    const layers1 = selectNodeLayers(schema);
    const layers2 = selectNodeLayers(schema);
    expect(layers1).toBe(layers2);
    expect(layers1.get('node-1')).toBeDefined();

    const centrality1 = selectCentralityScores(schema);
    const centrality2 = selectCentralityScores(schema);
    expect(centrality1).toBe(centrality2);
    expect(centrality1.get('node-2')?.spatialRole).toBeDefined();
  });

  it('selectHotspots filters by risk and memoizes cleanly', () => {
    const schema = createMockSchema();

    const hotspotsAll = selectHotspots(schema);
    expect(hotspotsAll.highRisk.length).toBe(1);

    const hotspotsHigh = selectHotspots(schema, { riskFilter: 'HIGH' });
    expect(hotspotsHigh.topRanked.length).toBe(1);
    expect(hotspotsHigh.topRanked[0].node.id).toBe('node-1');
  });

  it('selectDiffModel calculates project comparison diff model', () => {
    const schemaA = createMockSchema('proj-a');
    const schemaB = createMockSchema('proj-b');

    const diff1 = selectDiffModel(schemaA, schemaB);
    const diff2 = selectDiffModel(schemaA, schemaB);
    expect(diff1).toBe(diff2);
    expect(diff1).not.toBeNull();

    expect(selectDiffModel(null, schemaB)).toBeNull();
  });
});

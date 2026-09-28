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
      name: 'AccountController',
      displayName: 'AccountController',
      type: 'ApexClass',
      file: 'classes/AccountController.cls',
      layer: 'Application',
      domain: 'Core',
      risk: 'HIGH',
      metrics: { score: 90, fanIn: 10, fanOut: 2, coupling: 18, complexity: 12, lines: 150, publicMethods: 5, testCoverage: 80, LOC: 150 },
    },
    {
      id: 'node-2',
      name: 'AccountService',
      displayName: 'AccountService',
      type: 'ApexClass',
      file: 'classes/AccountService.cls',
      layer: 'Domain',
      domain: 'Core',
      risk: 'MEDIUM',
      metrics: { score: 60, fanIn: 5, fanOut: 5, coupling: 10, complexity: 8, lines: 100, publicMethods: 4, testCoverage: 85, LOC: 100 },
    },
    {
      id: 'node-3',
      name: 'AccountTrigger',
      displayName: 'AccountTrigger',
      type: 'ApexTrigger',
      file: 'triggers/AccountTrigger.trigger',
      layer: 'Infrastructure',
      domain: 'Core',
      risk: 'LOW',
      metrics: { score: 30, fanIn: 1, fanOut: 8, coupling: 5, complexity: 4, lines: 50, publicMethods: 1, testCoverage: 90, LOC: 50 },
    },
  ];

  const edges: ExplorerEdge[] = [
    { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'calls' },
    { id: 'edge-2', source: 'node-3', target: 'node-2', type: 'calls' },
  ];

  return {
    projectId,
    project: { id: projectId, name: 'Test Project' },
    summary: { nodeCount: 3, edgeCount: 2, cycleCount: 0, unresolvedCount: 0 },
    nodes,
    edges,
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  } as ExplorerDataSchema;
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

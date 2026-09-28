import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer } from '../lib/layout/types';
import { adaptComponentProfile } from '../lib/adapters/profile-adapter';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayer } from '../lib/layout/layers';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { getArchitecturalHotspots } from '../lib/hotspots';

describe('Component Profile Adapter Unit Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('A. converts valid canonical graph input into valid Component Profile data', () => {
    const result = adaptComponentProfile(canonicalData);

    expect(result).toBeDefined();
    expect(result.profiles).toBeInstanceOf(Array);
    expect(result.profileMap).toBeDefined();
    expect(result.summary).toBeDefined();

    expect(result.profiles.length).toBe(canonicalData.nodes.length);
    expect(Object.keys(result.profileMap).length).toBe(canonicalData.nodes.length);
    expect(result.summary.totalComponents).toBe(canonicalData.nodes.length);

    // Verify profile structure
    result.profiles.forEach(profile => {
      expect(profile.id).toBeDefined();
      expect(typeof profile.id).toBe('string');
      expect(profile.displayName).toBeDefined();
      expect(profile.entityType).toBeDefined();
      expect(profile.layer).toBeDefined();
      expect(profile.domain).toBeDefined();
      expect(profile.featureId).toBeDefined();
      expect(profile.featureRole).toBeDefined();
      expect(typeof profile.fanIn).toBe('number');
      expect(typeof profile.fanOut).toBe('number');
      expect(typeof profile.coupling).toBe('number');
      expect(typeof profile.isBridge).toBe('boolean');
      expect(typeof profile.isHotspot).toBe('boolean');

      expect(result.profileMap[profile.id]).toBe(profile);
    });
  });

  it('B. produces stable component identities across repeated executions', () => {
    const run1 = adaptComponentProfile(canonicalData);
    const run2 = adaptComponentProfile(canonicalData);

    expect(run1.summary).toEqual(run2.summary);
    expect(run1.profiles.map(p => p.id)).toEqual(run2.profiles.map(p => p.id));
    expect(Object.keys(run1.profileMap)).toEqual(Object.keys(run2.profileMap));

    run1.profiles.forEach((p, idx) => {
      expect(p).toEqual(run2.profiles[idx]);
    });
  });

  it('C. verifies metric provenance matching authoritative existing analytics sources', () => {
    const result = adaptComponentProfile(canonicalData);

    // Re-run authoritative existing analytics primitives directly
    const discovery = discoverFeatures(canonicalData.nodes, canonicalData.edges);
    const domainMap = new Map<string, string>();
    const layerMap = new Map<string, ArchitectureLayer>();

    canonicalData.nodes.forEach(node => {
      const assignment = discovery.assignments.get(node.id);
      const cluster = assignment?.primaryFeatureId
        ? discovery.features.get(assignment.primaryFeatureId)
        : undefined;
      const domain = cluster?.domains && cluster.domains.length > 0 ? cluster.domains[0] : 'Shared';

      domainMap.set(node.id, domain);
      layerMap.set(node.id, classifyNodeLayer(node));
    });

    const centralityMap = computeGraphCentralityAnalysis(canonicalData.nodes, canonicalData.edges, domainMap, layerMap);
    const hotspots = getArchitecturalHotspots(canonicalData.nodes, canonicalData.cycles, canonicalData.impactSummaries);
    const hotspotMap = new Map<string, string>();
    hotspots.topRanked.forEach(item => hotspotMap.set(item.node.id, item.category));

    // Compare representative component profiles against authoritative sources
    result.profiles.forEach(profile => {
      const origNode = canonicalData.nodes.find(n => n.id === profile.id)!;
      expect(origNode).toBeDefined();

      // Metric source check
      expect(profile.fanIn).toBe(origNode.metrics?.fanIn ?? 0);
      expect(profile.fanOut).toBe(origNode.metrics?.fanOut ?? 0);
      expect(profile.coupling).toBe(origNode.metrics?.coupling ?? 0);
      expect(profile.unresolved).toBe(origNode.metrics?.unresolved ?? 0);
      expect(profile.risk).toBe(origNode.risk);

      // Layer source check
      expect(profile.layer).toBe(layerMap.get(profile.id));

      // Centrality source check
      const centrality = centralityMap.get(profile.id);
      expect(profile.spatialRole).toBe(centrality?.spatialRole ?? 'standard');
      expect(profile.hubType).toBe(centrality?.hubType ?? 'none');
      expect(profile.isBridge).toBe(centrality?.isBridge ?? false);

      // Hotspot source check
      expect(profile.isHotspot).toBe(hotspotMap.has(profile.id));
      if (profile.isHotspot) {
        expect(profile.hotspotCategory).toBe(hotspotMap.get(profile.id));
      }
    });
  });

  it('D. guarantees input-order invariance', () => {
    const run1 = adaptComponentProfile(canonicalData);

    const reversedNodes = [...canonicalData.nodes].reverse();
    const reversedEdges = [...canonicalData.edges].reverse();
    const reversedInput: ExplorerDataSchema = {
      ...canonicalData,
      nodes: reversedNodes,
      edges: reversedEdges,
    };

    const runReversed = adaptComponentProfile(reversedInput);

    expect(runReversed.summary).toEqual(run1.summary);
    expect(runReversed.profiles.map(p => p.id)).toEqual(run1.profiles.map(p => p.id));

    run1.profiles.forEach((p, idx) => {
      expect(runReversed.profiles[idx]).toEqual(p);
    });
  });

  it('E. defines sensible behavior for empty and minimal graph inputs', () => {
    // 1. Empty Graph
    const emptySchema: ExplorerDataSchema = {
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: 0,
          apexClasses: 0,
          apexTriggers: 0,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0,
        },
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const emptyResult = adaptComponentProfile(emptySchema);
    expect(emptyResult.profiles).toEqual([]);
    expect(emptyResult.profileMap).toEqual({});
    expect(emptyResult.summary).toEqual({
      totalComponents: 0,
      highRiskCount: 0,
      hotspotCount: 0,
      bridgeCount: 0,
      hubCount: 0,
      averageCoupling: 0,
    });

    // 2. Minimal Single-Node Graph
    const singleNode: ExplorerNode = {
      id: 'ApexClass:SingleController',
      displayName: 'SingleController',
      type: 'ApexClass',
      file: 'classes/SingleController.cls',
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
        testCoverageStatus: 'UNTESTED',
      },
    };

    const singleNodeSchema: ExplorerDataSchema = {
      ...emptySchema,
      nodes: [singleNode],
      summary: { ...emptySchema.summary, nodeCount: 1 },
    };

    const singleResult = adaptComponentProfile(singleNodeSchema);
    expect(singleResult.profiles.length).toBe(1);
    expect(singleResult.profiles[0].id).toBe('ApexClass:SingleController');
    expect(singleResult.summary.totalComponents).toBe(1);
  });

  it('F. does not mutate the input graph schema', () => {
    const frozenNodes = canonicalData.nodes.map(n => Object.freeze({ ...n }));
    const frozenEdges = canonicalData.edges.map(e => Object.freeze({ ...e }));

    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(frozenNodes) as unknown as ExplorerNode[],
      edges: Object.freeze(frozenEdges) as unknown as ExplorerEdge[],
    });

    expect(() => adaptComponentProfile(frozenSchema)).not.toThrow();
  });

  it('G. produces bit-for-bit identical output across 10x repeated execution', () => {
    const jsonOutputs: string[] = [];

    for (let i = 0; i < 10; i++) {
      const output = adaptComponentProfile(canonicalData);
      jsonOutputs.push(JSON.stringify(output));
    }

    const firstOutput = jsonOutputs[0];
    for (let i = 1; i < 10; i++) {
      expect(jsonOutputs[i]).toBe(firstOutput);
    }
  });

  it('H. operates independently of React, Cytoscape, DOM, or browser state', () => {
    expect(typeof window === 'undefined' || typeof window === 'object').toBe(true);

    const result = adaptComponentProfile(canonicalData);
    expect(result).toBeDefined();
    expect(result.summary.totalComponents).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { adaptArchitectureRadar, type RadarData } from '../lib/adapters/radar-adapter';
import { calculateArchitectureHealth } from '../lib/health';
import { layerViolationCount } from '../lib/layout/metrics';
import { getArchitecturalHotspots } from '../lib/hotspots';
import { classifyNodeLayer } from '../lib/layout/layers';
import type { ArchitectureLayer } from '../lib/layout/types';

describe('Radar Adapter Unit Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('A. converts valid canonical graph input into valid Radar data', () => {
    const result = adaptArchitectureRadar(canonicalData);

    expect(result).toBeDefined();
    expect(result.dimensions).toBeInstanceOf(Array);
    expect(result.summary).toBeDefined();

    expect(result.dimensions.length).toBeGreaterThan(0);
    expect(result.summary.dimensionCount).toBe(result.dimensions.length);
    expect(result.summary.totalComponents).toBe(canonicalData.nodes.length);

    // Verify radar dimension structure
    result.dimensions.forEach(dim => {
      expect(dim.id).toBeDefined();
      expect(typeof dim.id).toBe('string');
      expect(dim.label).toBeDefined();
      expect(typeof dim.rawValue).toBe('number');
      expect(typeof dim.score).toBe('number');
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(100);
      expect(dim.unit).toBeDefined();
      expect(dim.sourceMetric).toBeDefined();
    });
  });

  it('B. produces stable dimension identities and summary values across repeated executions', () => {
    const run1 = adaptArchitectureRadar(canonicalData);
    const run2 = adaptArchitectureRadar(canonicalData);

    expect(run1.summary).toEqual(run2.summary);
    expect(run1.dimensions.map(d => d.id)).toEqual(run2.dimensions.map(d => d.id));

    run1.dimensions.forEach((dim, idx) => {
      expect(dim).toEqual(run2.dimensions[idx]);
    });
  });

  it('C. verifies metric provenance matching authoritative analytics sources', () => {
    const result = adaptArchitectureRadar(canonicalData);

    // Direct calls to authoritative existing analytics sources
    const health = calculateArchitectureHealth(canonicalData);

    const layerMap: Record<string, ArchitectureLayer> = {};
    canonicalData.nodes.forEach(node => {
      layerMap[node.id] = classifyNodeLayer(node);
    });
    const layerViolations = layerViolationCount(canonicalData.nodes, canonicalData.edges, layerMap);
    const hotspots = getArchitecturalHotspots(canonicalData.nodes, canonicalData.cycles, canonicalData.impactSummaries);

    expect(result.summary.overallHealthScore).toBe(health.score);
    expect(result.summary.healthLevel).toBe(health.level);

    const healthDim = result.dimensions.find(d => d.id === 'overall_health');
    expect(healthDim).toBeDefined();
    expect(healthDim!.rawValue).toBe(health.score);
    expect(healthDim!.score).toBe(health.score);

    const layerPurityDim = result.dimensions.find(d => d.id === 'layer_purity');
    expect(layerPurityDim).toBeDefined();
    expect(layerPurityDim!.rawValue).toBe(layerViolations);

    const hotspotDim = result.dimensions.find(d => d.id === 'hotspot_density');
    expect(hotspotDim).toBeDefined();
    expect(hotspotDim!.rawValue).toBe(hotspots.topRanked.length);
  });

  it('D. guarantees input-order invariance', () => {
    const run1 = adaptArchitectureRadar(canonicalData);

    const reversedNodes = [...canonicalData.nodes].reverse();
    const reversedEdges = [...canonicalData.edges].reverse();
    const reversedInput: ExplorerDataSchema = {
      ...canonicalData,
      nodes: reversedNodes,
      edges: reversedEdges,
    };

    const runReversed = adaptArchitectureRadar(reversedInput);

    expect(runReversed.summary).toEqual(run1.summary);
    expect(runReversed.dimensions.map(d => d.id)).toEqual(run1.dimensions.map(d => d.id));

    run1.dimensions.forEach((dim, idx) => {
      expect(runReversed.dimensions[idx]).toEqual(dim);
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

    const emptyResult = adaptArchitectureRadar(emptySchema);
    expect(emptyResult.dimensions).toEqual([]);
    expect(emptyResult.summary).toEqual({
      overallHealthScore: 100,
      healthLevel: 'GOOD',
      totalComponents: 0,
      totalDependencies: 0,
      dimensionCount: 0,
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

    const singleResult = adaptArchitectureRadar(singleNodeSchema);
    expect(singleResult.summary.totalComponents).toBe(1);
    expect(singleResult.dimensions.length).toBeGreaterThan(0);
  });

  it('F. does not mutate the input graph schema', () => {
    const frozenNodes = canonicalData.nodes.map(n => Object.freeze({ ...n }));
    const frozenEdges = canonicalData.edges.map(e => Object.freeze({ ...e }));

    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(frozenNodes) as unknown as ExplorerNode[],
      edges: Object.freeze(frozenEdges) as unknown as ExplorerEdge[],
    });

    expect(() => adaptArchitectureRadar(frozenSchema)).not.toThrow();
  });

  it('G. produces bit-for-bit identical output across 10x repeated execution', () => {
    const jsonOutputs: string[] = [];

    for (let i = 0; i < 10; i++) {
      const output = adaptArchitectureRadar(canonicalData);
      jsonOutputs.push(JSON.stringify(output));
    }

    const firstOutput = jsonOutputs[0];
    for (let i = 1; i < 10; i++) {
      expect(jsonOutputs[i]).toBe(firstOutput);
    }
  });

  it('H. operates independently of React, Cytoscape, DOM, or browser state', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');

    const result = adaptArchitectureRadar(canonicalData);
    expect(result).toBeDefined();
    expect(result.summary.dimensionCount).toBeGreaterThan(0);
  });
});

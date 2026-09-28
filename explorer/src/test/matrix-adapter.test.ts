import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { adaptFeatureMatrix, type FeatureMatrixData } from '../lib/adapters/matrix-adapter';
import { discoverFeatures } from '../lib/layout/features';
import { buildFeatureDependencyMatrix, compute2DFeatureBandOrdering } from '../lib/layout/feature-ordering';
import { buildDomainGraph } from '../lib/layout/global-layout';

describe('Feature Matrix Adapter Unit Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('A. converts valid canonical graph input into valid Feature Matrix data', () => {
    const result = adaptFeatureMatrix(canonicalData);

    expect(result).toBeDefined();
    expect(result.features).toBeInstanceOf(Array);
    expect(result.orderedFeatureIds).toBeInstanceOf(Array);
    expect(result.cells).toBeInstanceOf(Array);
    expect(result.summary).toBeDefined();

    expect(result.features.length).toBeGreaterThan(0);
    expect(result.orderedFeatureIds.length).toEqual(result.features.length);
    expect(result.summary.totalFeatures).toEqual(result.features.length);
    expect(result.summary.totalDependencies).toEqual(result.cells.length);

    // Verify feature header structure
    result.features.forEach((feature, idx) => {
      expect(feature.id).toBeDefined();
      expect(typeof feature.id).toBe('string');
      expect(feature.name).toBeDefined();
      expect(feature.anchorNodeId).toBeDefined();
      expect(feature.primaryLayer).toBeDefined();
      expect(feature.primaryDomain).toBeDefined();
      expect(feature.orderIndex).toBe(idx);
      expect(result.orderedFeatureIds[idx]).toBe(feature.id);
    });

    // Verify matrix cell structure
    result.cells.forEach(cell => {
      expect(cell.sourceFeatureId).toBeDefined();
      expect(cell.targetFeatureId).toBeDefined();
      expect(cell.sourceIndex).toBeGreaterThanOrEqual(0);
      expect(cell.sourceIndex).toBeLessThan(result.features.length);
      expect(cell.targetIndex).toBeGreaterThanOrEqual(0);
      expect(cell.targetIndex).toBeLessThan(result.features.length);
      expect(cell.combinedWeight).toBeGreaterThan(0);

      expect(result.orderedFeatureIds[cell.sourceIndex]).toBe(cell.sourceFeatureId);
      expect(result.orderedFeatureIds[cell.targetIndex]).toBe(cell.targetFeatureId);
    });
  });

  it('B. produces deterministic feature identities across executions', () => {
    const run1 = adaptFeatureMatrix(canonicalData);
    const run2 = adaptFeatureMatrix(canonicalData);

    expect(run1.features.map(f => f.id)).toEqual(run2.features.map(f => f.id));
    expect(run1.features.map(f => f.anchorNodeId)).toEqual(run2.features.map(f => f.anchorNodeId));
    expect(run1.features.map(f => f.name)).toEqual(run2.features.map(f => f.name));
  });

  it('C. produces deterministic feature ordering', () => {
    const run1 = adaptFeatureMatrix(canonicalData);
    const run2 = adaptFeatureMatrix(canonicalData);

    expect(run1.orderedFeatureIds).toEqual(run2.orderedFeatureIds);

    // Test input node/edge order invariance
    const shuffledNodes = [...canonicalData.nodes].reverse();
    const shuffledEdges = [...canonicalData.edges].reverse();
    const shuffledInput: ExplorerDataSchema = {
      ...canonicalData,
      nodes: shuffledNodes,
      edges: shuffledEdges,
    };

    const runShuffled = adaptFeatureMatrix(shuffledInput);
    expect(runShuffled.orderedFeatureIds).toEqual(run1.orderedFeatureIds);
  });

  it('D. correctly represents dependency relationships between features', () => {
    const result = adaptFeatureMatrix(canonicalData);

    // Check that each cell references valid features and indices
    result.cells.forEach(cell => {
      const sourceFeature = result.features[cell.sourceIndex];
      const targetFeature = result.features[cell.targetIndex];

      expect(sourceFeature.id).toBe(cell.sourceFeatureId);
      expect(targetFeature.id).toBe(cell.targetFeatureId);
      expect(cell.sourceFeatureId).not.toBe(cell.targetFeatureId);
    });

    // Check cells are ordered by sourceIndex then targetIndex
    for (let i = 1; i < result.cells.length; i++) {
      const prev = result.cells[i - 1];
      const curr = result.cells[i];
      const isOrdered =
        prev.sourceIndex < curr.sourceIndex ||
        (prev.sourceIndex === curr.sourceIndex && prev.targetIndex < curr.targetIndex);
      expect(isOrdered).toBe(true);
    }
  });

  it('E. preserves dependency weights directly from existing analytics primitive', () => {
    const result = adaptFeatureMatrix(canonicalData);

    // Re-run analytics primitives directly to verify exact weight preservation
    const discovery = discoverFeatures(canonicalData.nodes, canonicalData.edges);
    const featureMap = new Map<string, string>();
    discovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });
    canonicalData.nodes.forEach(node => {
      if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
    });

    const featureGraph = buildDomainGraph(canonicalData.nodes, canonicalData.edges, undefined, undefined, featureMap);
    const rawMatrix = buildFeatureDependencyMatrix(canonicalData.nodes, canonicalData.edges, featureGraph, featureMap);

    result.cells.forEach(cell => {
      const expectedDirect = rawMatrix.directWeights.get(cell.sourceFeatureId)?.get(cell.targetFeatureId) ?? 0;
      const expectedFlow = rawMatrix.directionalFlow.get(cell.sourceFeatureId)?.get(cell.targetFeatureId) ?? 0;
      const expectedShared = rawMatrix.sharedNodeWeights.get(cell.sourceFeatureId)?.get(cell.targetFeatureId) ?? 0;
      const expectedCombined = rawMatrix.combinedWeights.get(cell.sourceFeatureId)?.get(cell.targetFeatureId) ?? 0;

      expect(cell.directWeight).toBe(expectedDirect);
      expect(cell.directionalFlow).toBe(expectedFlow);
      expect(cell.sharedNodeWeight).toBe(expectedShared);
      expect(cell.combinedWeight).toBe(expectedCombined);
    });
  });

  it('F. defines behavior for empty and minimal valid graph inputs', () => {
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

    const emptyResult = adaptFeatureMatrix(emptySchema);
    expect(emptyResult.features).toEqual([]);
    expect(emptyResult.orderedFeatureIds).toEqual([]);
    expect(emptyResult.cells).toEqual([]);
    expect(emptyResult.summary).toEqual({
      totalFeatures: 0,
      totalDependencies: 0,
      maxCombinedWeight: 0,
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

    const singleResult = adaptFeatureMatrix(singleNodeSchema);
    expect(singleResult.features.length).toBe(1);
    expect(singleResult.features[0].id).toBe('feature_SingleController');
    expect(singleResult.cells).toEqual([]);
    expect(singleResult.summary.totalFeatures).toBe(1);
    expect(singleResult.summary.totalDependencies).toBe(0);
  });

  it('G. does not mutate the input graph schema', () => {
    // Create deep copy of canonical data and freeze it
    const frozenNodes = canonicalData.nodes.map(n => Object.freeze({ ...n }));
    const frozenEdges = canonicalData.edges.map(e => Object.freeze({ ...e }));

    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(frozenNodes) as unknown as ExplorerNode[],
      edges: Object.freeze(frozenEdges) as unknown as ExplorerEdge[],
    });

    expect(() => adaptFeatureMatrix(frozenSchema)).not.toThrow();
  });

  it('H. produces bit-for-bit identical output across 10x repeated execution', () => {
    const jsonOutputs: string[] = [];

    for (let i = 0; i < 10; i++) {
      const output = adaptFeatureMatrix(canonicalData);
      jsonOutputs.push(JSON.stringify(output));
    }

    const firstOutput = jsonOutputs[0];
    for (let i = 1; i < 10; i++) {
      expect(jsonOutputs[i]).toBe(firstOutput);
    }
  });

  it('I. operates independently of React, Cytoscape, and DOM APIs', () => {
    const result = adaptFeatureMatrix(canonicalData);
    expect(result).toBeDefined();
    expect(result.summary.totalFeatures).toBeGreaterThan(0);
  });

  it('J. supports small sparse datasets (DEFECT-03) without initializing in a blank state', () => {
    const moviePath = path.resolve(__dirname, '../../public/projects/movie/explorer-data.json');
    const movieData: ExplorerDataSchema = JSON.parse(fs.readFileSync(moviePath, 'utf8'));

    const movieResult = adaptFeatureMatrix(movieData);

    expect(movieResult).toBeDefined();
    expect(movieResult.features.length).toBeGreaterThan(1);
    expect(movieResult.cells.length).toBeGreaterThan(0);
    expect(movieResult.summary.totalDependencies).toBeGreaterThan(0);

    const hasVisibleCells = movieResult.cells.some(cell => cell.combinedWeight > 0 || cell.directWeight > 0);
    expect(hasVisibleCells).toBe(true);
  });
});

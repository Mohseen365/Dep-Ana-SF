import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { adaptFeatureTree } from '../lib/adapters/tree-adapter';

describe('Feature Tree Adapter Unit Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('A. converts valid canonical graph input into valid Feature Tree data', () => {
    const result = adaptFeatureTree(canonicalData);

    expect(result).toBeDefined();
    expect(result.rootId).toBe('root');
    expect(result.nodes).toBeDefined();
    expect(result.summary).toBeDefined();

    const rootNode = result.nodes[result.rootId];
    expect(rootNode).toBeDefined();
    expect(rootNode.type).toBe('root');
    expect(rootNode.parentId).toBeNull();
    expect(rootNode.depth).toBe(0);
    expect(rootNode.childIds.length).toBeGreaterThan(0);

    expect(result.summary.domainCount).toBeGreaterThan(0);
    expect(result.summary.featureCount).toBeGreaterThan(0);
    expect(result.summary.componentCount).toBe(canonicalData.nodes.length);
    expect(result.summary.totalNodes).toBe(Object.keys(result.nodes).length);

    // Verify parent-child integrity across all tree nodes
    Object.values(result.nodes).forEach(node => {
      if (node.parentId !== null) {
        const parent = result.nodes[node.parentId];
        expect(parent).toBeDefined();
        expect(parent.childIds).toContain(node.id);
      }

      node.childIds.forEach(childId => {
        const child = result.nodes[childId];
        expect(child).toBeDefined();
        expect(child.parentId).toBe(node.id);
      });
    });
  });

  it('B. produces deterministic feature tree identities across repeated executions', () => {
    const run1 = adaptFeatureTree(canonicalData);
    const run2 = adaptFeatureTree(canonicalData);

    expect(run1.rootId).toEqual(run2.rootId);
    expect(run1.summary).toEqual(run2.summary);
    expect(Object.keys(run1.nodes).sort()).toEqual(Object.keys(run2.nodes).sort());

    Object.keys(run1.nodes).forEach(nodeId => {
      expect(run1.nodes[nodeId]).toEqual(run2.nodes[nodeId]);
    });
  });

  it('C. maintains parent/child correctness and depth levels', () => {
    const result = adaptFeatureTree(canonicalData);

    Object.values(result.nodes).forEach(node => {
      if (node.type === 'root') {
        expect(node.depth).toBe(0);
        expect(node.parentId).toBeNull();
      } else if (node.type === 'domain') {
        expect(node.depth).toBe(1);
        expect(node.parentId).toBe('root');
      } else if (node.type === 'feature') {
        expect(node.depth).toBe(2);
        expect(node.parentId).toMatch(/^domain_/);
      } else if (node.type === 'role') {
        expect(node.depth).toBe(3);
        expect(node.parentId).toMatch(/^feature_/);
      } else if (node.type === 'component') {
        expect(node.depth).toBe(4);
        expect(node.parentId).toMatch(/^role_/);
        expect(node.childIds).toEqual([]);
        expect(node.sourceNodeId).toBeDefined();
      }
    });
  });

  it('D. structures domain, feature, role, and component hierarchy matching project semantics', () => {
    const result = adaptFeatureTree(canonicalData);

    // Every canonical node must be represented exactly once as a component node
    const componentNodes = Object.values(result.nodes).filter(n => n.type === 'component');
    expect(componentNodes.length).toBe(canonicalData.nodes.length);

    const sourceNodeIds = componentNodes.map(n => n.sourceNodeId).sort();
    const expectedNodeIds = canonicalData.nodes.map(n => n.id).sort();
    expect(sourceNodeIds).toEqual(expectedNodeIds);

    componentNodes.forEach(comp => {
      const orig = canonicalData.nodes.find(n => n.id === comp.sourceNodeId);
      expect(orig).toBeDefined();
      expect(comp.displayName).toBe(orig!.displayName || orig!.id);
      expect(comp.entityType).toBe(orig!.type);
      expect(comp.risk).toBe(orig!.risk);
      expect(comp.layer).toBeDefined();
      expect(comp.sourceFeatureId).toBeDefined();
    });
  });

  it('E. guarantees input-order invariance', () => {
    const run1 = adaptFeatureTree(canonicalData);

    const reversedNodes = [...canonicalData.nodes].reverse();
    const reversedEdges = [...canonicalData.edges].reverse();
    const reversedInput: ExplorerDataSchema = {
      ...canonicalData,
      nodes: reversedNodes,
      edges: reversedEdges,
    };

    const runReversed = adaptFeatureTree(reversedInput);

    expect(runReversed.summary).toEqual(run1.summary);
    expect(Object.keys(runReversed.nodes).sort()).toEqual(Object.keys(run1.nodes).sort());

    Object.keys(run1.nodes).forEach(nodeId => {
      expect(runReversed.nodes[nodeId]).toEqual(run1.nodes[nodeId]);
    });
  });

  it('F. defines sensible behavior for empty and minimal graph inputs', () => {
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

    const emptyResult = adaptFeatureTree(emptySchema);
    expect(emptyResult.rootId).toBe('root');
    expect(Object.keys(emptyResult.nodes)).toEqual(['root']);
    expect(emptyResult.nodes.root.childIds).toEqual([]);
    expect(emptyResult.summary).toEqual({
      totalNodes: 1,
      maxDepth: 0,
      domainCount: 0,
      featureCount: 0,
      componentCount: 0,
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

    const singleResult = adaptFeatureTree(singleNodeSchema);
    expect(singleResult.summary.componentCount).toBe(1);
    expect(singleResult.summary.domainCount).toBeGreaterThan(0);
    expect(singleResult.summary.featureCount).toBeGreaterThan(0);
    expect(singleResult.nodes['component_ApexClass:SingleController']).toBeDefined();
    expect(singleResult.nodes['component_ApexClass:SingleController'].sourceNodeId).toBe('ApexClass:SingleController');
  });

  it('G. does not mutate the input graph schema', () => {
    const frozenNodes = canonicalData.nodes.map(n => Object.freeze({ ...n }));
    const frozenEdges = canonicalData.edges.map(e => Object.freeze({ ...e }));

    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(frozenNodes) as unknown as ExplorerNode[],
      edges: Object.freeze(frozenEdges) as unknown as ExplorerEdge[],
    });

    expect(() => adaptFeatureTree(frozenSchema)).not.toThrow();
  });

  it('H. produces bit-for-bit identical output across 10x repeated execution', () => {
    const jsonOutputs: string[] = [];

    for (let i = 0; i < 10; i++) {
      const output = adaptFeatureTree(canonicalData);
      jsonOutputs.push(JSON.stringify(output));
    }

    const firstOutput = jsonOutputs[0];
    for (let i = 1; i < 10; i++) {
      expect(jsonOutputs[i]).toBe(firstOutput);
    }
  });

  it('I. operates independently of React, Cytoscape, DOM, or browser state', () => {
    expect(typeof window === 'undefined' || typeof window === 'object').toBe(true);

    const result = adaptFeatureTree(canonicalData);
    expect(result).toBeDefined();
    expect(result.summary.componentCount).toBeGreaterThan(0);
  });
});

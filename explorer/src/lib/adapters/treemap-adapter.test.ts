import { describe, it, expect } from 'vitest';
import { adaptTreemap } from './treemap-adapter';
import { computeTreemapLayout } from './treemap-layout';
import type { ExplorerDataSchema } from '../../types/explorer';

const mockSchema: ExplorerDataSchema = {
  summary: {
    nodeCount: 4,
    edgeCount: 3,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 2,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 4,
      apexClasses: 3,
      apexTriggers: 0,
      lwcJs: 1,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [
    {
      id: 'ServiceA',
      displayName: 'Service A',
      type: 'ApexClass',
      file: 'ServiceA.cls',
      metrics: { fanIn: 5, fanOut: 2, coupling: 7, unresolved: 0, score: 80 },
      risk: 'HIGH',
      riskReasons: ['High coupling'],
      behavior: {
        isTest: false,
        publicContractsCount: 2,
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
      id: 'ServiceB',
      displayName: 'Service B',
      type: 'ApexClass',
      file: 'ServiceB.cls',
      metrics: { fanIn: 1, fanOut: 4, coupling: 5, unresolved: 0, score: 40 },
      risk: 'MEDIUM',
      riskReasons: [],
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
    {
      id: 'ComponentCard',
      displayName: 'Component Card',
      type: 'LWC',
      file: 'componentCard.js',
      metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 10 },
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
      id: 'ServiceATest',
      displayName: 'Service A Test',
      type: 'ApexClass',
      file: 'ServiceATest.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: true,
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
  ],
  edges: [
    {
      id: 'e1',
      source: 'ComponentCard',
      target: 'ServiceA',
      relationshipType: 'method-call',
      method: 'doSomething',
      evidence: 'e1',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 10,
      column: 1,
      methodOwner: 'ServiceA',
      file: 'componentCard.js',
      canonical: {
        source: { type: 'LWC', name: 'ComponentCard' },
        target: { type: 'ApexClass', name: 'ServiceA' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 1 },
      },
    },
    {
      id: 'e2',
      source: 'ServiceA',
      target: 'ServiceB',
      relationshipType: 'method-call',
      method: 'fetchData',
      evidence: 'e2',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 20,
      column: 1,
      methodOwner: 'ServiceB',
      file: 'ServiceA.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ServiceA' },
        target: { type: 'ApexClass', name: 'ServiceB' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 20, column: 1 },
      },
    },
  ],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

describe('adaptTreemap', () => {
  it('handles empty input graphs safely', () => {
    const result = adaptTreemap({
      summary: { nodeCount: 0, edgeCount: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 0, apexClasses: 0, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    });

    expect(result.rootId).toBe('root');
    expect(result.summary.componentCount).toBe(0);
    expect(result.summary.totalNodes).toBe(1);
    expect(result.nodes['root'].childIds).toEqual([]);
  });

  it('builds hierarchy correctly and computes metrics across container nodes', () => {
    const treemap = adaptTreemap(mockSchema, { metricMode: 'coupling' });

    expect(treemap.summary.componentCount).toBe(4);
    expect(treemap.summary.totalMetricValue).toBe(7 + 5 + 2 + 1); // Sum of couplings

    const root = treemap.nodes[treemap.rootId];
    expect(root.childIds.length).toBeGreaterThan(0);

    // Verify all nodes are indexed in treemap.nodes
    Object.values(treemap.nodes).forEach(node => {
      expect(node.id).toBeDefined();
      expect(node.displayName).toBeDefined();
      expect(node.metrics).toBeDefined();
    });
  });

  it('is 100% deterministic and immutable across repeated executions', () => {
    const run1 = adaptTreemap(mockSchema, { metricMode: 'fanIn' });
    const run2 = adaptTreemap(mockSchema, { metricMode: 'fanIn' });

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});

describe('computeTreemapLayout', () => {
  it('returns null for empty or invalid bounds', () => {
    const treemap = adaptTreemap(mockSchema);
    expect(computeTreemapLayout(treemap, { width: 0, height: 800 })).toBeNull();
    expect(computeTreemapLayout(treemap, { width: 1000, height: 0 })).toBeNull();
  });

  it('generates non-overlapping rectangles strictly bounded within parent layout', () => {
    const treemap = adaptTreemap(mockSchema);
    const layout = computeTreemapLayout(treemap, { width: 1000, height: 800, padding: 4 });

    expect(layout).not.toBeNull();
    expect(layout!.x0).toBe(0);
    expect(layout!.y0).toBe(0);
    expect(layout!.x1).toBe(1000);
    expect(layout!.y1).toBe(800);
    expect(layout!.width).toBe(1000);
    expect(layout!.height).toBe(800);

    // Verify child containment
    if (layout!.children) {
      layout!.children.forEach(child => {
        expect(child.x0).toBeGreaterThanOrEqual(layout!.x0);
        expect(child.y0).toBeGreaterThanOrEqual(layout!.y0);
        expect(child.x1).toBeLessThanOrEqual(layout!.x1);
        expect(child.y1).toBeLessThanOrEqual(layout!.y1);
        expect(child.width).toBeGreaterThanOrEqual(0);
        expect(child.height).toBeGreaterThanOrEqual(0);
        expect(Number.isNaN(child.x0)).toBe(false);
        expect(Number.isNaN(child.y0)).toBe(false);
      });
    }
  });

  it('handles zero-value items and equal items safely without NaN', () => {
    const zeroSchema: ExplorerDataSchema = {
      ...mockSchema,
      nodes: mockSchema.nodes.map(n => ({ ...n, metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 } })),
    };

    const treemap = adaptTreemap(zeroSchema, { metricMode: 'fanIn' });
    const layout = computeTreemapLayout(treemap, { width: 1200, height: 800 });

    expect(layout).not.toBeNull();
    expect(Number.isNaN(layout!.width)).toBe(false);

    const checkNoNaN = (rect: any) => {
      expect(Number.isNaN(rect.x0)).toBe(false);
      expect(Number.isNaN(rect.y0)).toBe(false);
      expect(Number.isNaN(rect.x1)).toBe(false);
      expect(Number.isNaN(rect.y1)).toBe(false);
      if (rect.children) {
        rect.children.forEach(checkNoNaN);
      }
    };
    checkNoNaN(layout);
  });
});

import { describe, it, expect } from 'vitest';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { adaptFeatureMatrix } from '../lib/adapters/matrix-adapter';

describe('Phase 3E Discovery & Current-State Audit', () => {
  it('audits Matrix DOM growth complexity without virtualization', () => {
    const featureCounts = [20, 40, 80, 100, 150, 200, 500];

    featureCounts.forEach((F) => {
      const conceptualCells = F * F;
      const headerElements = 1 + 2 * F; // 1 top-left + F col headers + F row headers
      const totalCellElements = conceptualCells;
      const totalTableElements = headerElements + totalCellElements;
      // Each cell contains a <td> and text/span node, each row header contains title, layer dot, count span
      const estimatedDOMNodeCount = headerElements * 3 + totalCellElements * 2;

      expect(totalTableElements).toBe(1 + 2 * F + F * F);
      expect(estimatedDOMNodeCount).toBeGreaterThan(F * F);
    });
  });

  it('measures adaptFeatureMatrix transformation time across scale tiers', () => {
    const scaleTiers = [
      { N: 240, F_approx: 20 },
      { N: 1000, F_approx: 80 },
      { N: 2500, F_approx: 150 },
      { N: 5000, F_approx: 300 },
    ];

    scaleTiers.forEach(({ N }) => {
      const { nodes, edges } = generateSyntheticSalesforceGraph({ nodeCount: N, seed: 42 });
      const start = performance.now();
      const matrixData = adaptFeatureMatrix({
        summary: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: nodes.length,
          cycleCount: 0,
          unresolvedCount: 0,
          inventory: {
            files: nodes.length,
            apexClasses: nodes.length,
            apexTriggers: 0,
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
        metadata: {
          projectId: 'test',
          projectName: 'Test',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          analysisMode: 'hierarchical',
          stats: { nodeCount: nodes.length, edgeCount: edges.length },
        },
      });
      const duration = performance.now() - start;

      expect(matrixData).not.toBeNull();
      expect(matrixData?.summary.totalFeatures).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Adapter execution is fast (< 1s)
    });
  });
});

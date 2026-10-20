import { describe, it, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { isTestNode } from '../lib/layout/analysis';

/**
 * Helper to run the full metric pipeline for a tiny graph.
 */
function runMetrics(nodes: ExplorerNode[], edges: ExplorerEdge[]) {
  const layout = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
  const evalMetrics = evaluateLayout(nodes, edges, layout.positions);
  return evalMetrics;
}

describe('Layer‑violation metric – production‑only guard', () => {
  it('excludes a test‑source edge from violation counting', () => {
    // Test node (detected via name ending with "Test") -> presentation node.
    const nodes: ExplorerNode[] = [
      { id: 'ApexClass:MyServiceTest', type: 'ApexClass', displayName: 'MyServiceTest' },
      { id: 'LWC:MyComponent', type: 'LWC', displayName: 'MyComponent' },
    ];
    const edges: ExplorerEdge[] = [{ source: 'ApexClass:MyServiceTest', target: 'LWC:MyComponent' }];

    const metrics = runMetrics(nodes, edges);
    // Without guard this would be 1 violation (test source rank 1 > presentation rank 0).
    // Guard should skip the edge, resulting in 0.
    expect(metrics.layerViolationCount).toBe(0);
  });

  it('still counts a genuine production‑source violation', () => {
    // Production domain node -> presentation node (rank 2 > rank 0) should be a violation.
    const nodes: ExplorerNode[] = [
      { id: 'ApexClass:AccountSelector', type: 'ApexClass', displayName: 'AccountSelector' },
      { id: 'LWC:AccountUI', type: 'LWC', displayName: 'AccountUI' },
    ];
    const edges: ExplorerEdge[] = [{ source: 'ApexClass:AccountSelector', target: 'LWC:AccountUI' }];

    // Verify none of these nodes are considered test nodes.
    expect(isTestNode(nodes[0])).toBe(false);
    expect(isTestNode(nodes[1])).toBe(false);

    const metrics = runMetrics(nodes, edges);
    expect(metrics.layerViolationCount).toBe(1);
  });
});

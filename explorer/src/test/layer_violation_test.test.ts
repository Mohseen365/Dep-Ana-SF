import { describe, it, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { isTestNode } from '../lib/layout/analysis';
import { createMockNode, createMockEdge } from './mock-factories';

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
      createMockNode('ApexClass:MyServiceTest', 'MyServiceTest', 'ApexClass', 'LOW', 'MyServiceTest.cls', true),
      createMockNode('LWC:MyComponent', 'MyComponent', 'LWC', 'LOW', 'MyComponent.js', false),
    ];
    const edges: ExplorerEdge[] = [
      createMockEdge('edge-1', 'ApexClass:MyServiceTest', 'LWC:MyComponent'),
    ];

    const metrics = runMetrics(nodes, edges);
    // Without guard this would be 1 violation (test source rank 1 > presentation rank 0).
    // Guard should skip the edge, resulting in 0.
    expect(metrics.layerViolationCount).toBe(0);
  });

  it('still counts a genuine production‑source violation', () => {
    // Production domain node -> presentation node (rank 2 > rank 0) should be a violation.
    const nodes: ExplorerNode[] = [
      createMockNode('ApexClass:AccountSelector', 'AccountSelector', 'ApexClass', 'LOW', 'AccountSelector.cls', false),
      createMockNode('LWC:AccountUI', 'AccountUI', 'LWC', 'LOW', 'AccountUI.js', false),
    ];
    const edges: ExplorerEdge[] = [
      createMockEdge('edge-2', 'ApexClass:AccountSelector', 'LWC:AccountUI'),
    ];

    // Verify none of these nodes are considered test nodes.
    expect(isTestNode(nodes[0])).toBe(false);
    expect(isTestNode(nodes[1])).toBe(false);

    const metrics = runMetrics(nodes, edges);
    expect(metrics.layerViolationCount).toBe(1);
  });
});

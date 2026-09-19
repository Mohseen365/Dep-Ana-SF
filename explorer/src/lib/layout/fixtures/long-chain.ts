import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createLongChainFixture(): BenchmarkFixture {
  const chainLength = 15;
  const nodes = [];
  const edges = [];

  for (let i = 1; i <= chainLength; i++) {
    const charCode = String.fromCharCode(64 + i); // A, B, C, ...
    const id = `ApexClass:Step${charCode}`;
    nodes.push(createNode(id, 'ApexClass', { displayName: `Step${charCode}` }));

    if (i > 1) {
      const prevCharCode = String.fromCharCode(64 + i - 1);
      const prevId = `ApexClass:Step${prevCharCode}`;
      edges.push(createEdge(prevId, id, { relationshipType: 'method-call' }));
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'long-chain',
    name: 'Long Dependency Chain',
    description: 'A linear dependency chain of 15 sequential Apex classes (StepA -> StepB -> ... -> StepO).',
    purpose: 'Tests dependency direction flow, layer/rank distribution, edge-length minimization, and preventing serpentine distortion.',
    targetFailures: ['edge crossings', 'degree-only ordering'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      chainLength,
    },
  };
}

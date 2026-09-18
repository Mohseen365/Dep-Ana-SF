import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createSparseGraphFixture(): BenchmarkFixture {
  const nodeCount = 32;
  const nodes = [];
  const edges = [];

  for (let i = 1; i <= nodeCount; i++) {
    const pad = String(i).padStart(2, '0');
    nodes.push(createNode(`ApexClass:SparseModule_${pad}`, 'ApexClass', { displayName: `SparseModule_${pad}` }));
  }

  // Add only 4 sparse edges connecting pairs
  edges.push(createEdge('ApexClass:SparseModule_01', 'ApexClass:SparseModule_02'));
  edges.push(createEdge('ApexClass:SparseModule_05', 'ApexClass:SparseModule_06'));
  edges.push(createEdge('ApexClass:SparseModule_10', 'ApexClass:SparseModule_11'));
  edges.push(createEdge('ApexClass:SparseModule_20', 'ApexClass:SparseModule_21'));

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'sparse-graph',
    name: 'Sparse Graph Architecture',
    description: '32 nodes with only 4 scattered relationships.',
    purpose: 'Tests that un-connected/sparse nodes do not cause giant empty-space pathologies or unnecessary tight artificial clustering.',
    targetFailures: ['horizontal disconnected-component stretching', 'single-pass collision failures'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
}

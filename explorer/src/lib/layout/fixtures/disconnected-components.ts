import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createDisconnectedComponentsFixture(): BenchmarkFixture {
  const nodes = [
    // Component 1: Tiny (2 nodes)
    createNode('ApexClass:TinyUtilA', 'ApexClass'),
    createNode('ApexClass:TinyUtilB', 'ApexClass'),

    // Component 2: Tall (4 nodes vertical flow)
    createNode('LWC:TallView', 'LWC'),
    createNode('ApexClass:TallController', 'ApexClass'),
    createNode('ApexClass:TallService', 'ApexClass'),
    createNode('CustomObject:TallObj__c', 'CustomObject'),

    // Component 3: Wide (5 nodes horizontal domain)
    createNode('ApexClass:WideA', 'ApexClass'),
    createNode('ApexClass:WideB', 'ApexClass'),
    createNode('ApexClass:WideC', 'ApexClass'),
    createNode('ApexClass:WideD', 'ApexClass'),
    createNode('ApexClass:WideHub', 'ApexClass'),

    // Component 4: Medium (3 nodes)
    createNode('ApexClass:MediumAlpha', 'ApexClass'),
    createNode('ApexClass:MediumBeta', 'ApexClass'),
    createNode('CustomObject:MediumData__c', 'CustomObject'),

    // Component 5: Large (6 nodes)
    createNode('LWC:LargePortal', 'LWC'),
    createNode('ApexClass:LargeController', 'ApexClass'),
    createNode('ApexClass:LargeService', 'ApexClass'),
    createNode('ApexClass:LargeSelector', 'ApexClass'),
    createNode('ApexClass:LargeHelper', 'ApexClass'),
    createNode('CustomObject:LargeHeader__c', 'CustomObject'),
  ];

  const edges = [
    // Component 1 edges
    createEdge('ApexClass:TinyUtilA', 'ApexClass:TinyUtilB'),

    // Component 2 edges
    createEdge('LWC:TallView', 'ApexClass:TallController'),
    createEdge('ApexClass:TallController', 'ApexClass:TallService'),
    createEdge('ApexClass:TallService', 'CustomObject:TallObj__c'),

    // Component 3 edges (Hub to 4 nodes)
    createEdge('ApexClass:WideA', 'ApexClass:WideHub'),
    createEdge('ApexClass:WideB', 'ApexClass:WideHub'),
    createEdge('ApexClass:WideC', 'ApexClass:WideHub'),
    createEdge('ApexClass:WideD', 'ApexClass:WideHub'),

    // Component 4 edges
    createEdge('ApexClass:MediumAlpha', 'ApexClass:MediumBeta'),
    createEdge('ApexClass:MediumBeta', 'CustomObject:MediumData__c'),

    // Component 5 edges
    createEdge('LWC:LargePortal', 'ApexClass:LargeController'),
    createEdge('ApexClass:LargeController', 'ApexClass:LargeService'),
    createEdge('ApexClass:LargeService', 'ApexClass:LargeSelector'),
    createEdge('ApexClass:LargeService', 'ApexClass:LargeHelper'),
    createEdge('ApexClass:LargeSelector', 'CustomObject:LargeHeader__c'),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'disconnected-components',
    name: 'Disconnected Components Benchmark',
    description: '5 disconnected components with varying aspect ratios and node counts (Tiny, Tall, Wide, Medium, Large).',
    purpose: 'Exposes naive single-line horizontal component stretching, tests 2D bounding-box component packing and overlap avoidance.',
    targetFailures: ['horizontal disconnected-component stretching', 'single-pass collision failures'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      componentCount: 5,
    },
  };
}

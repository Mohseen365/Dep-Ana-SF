import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createDenseCrossDomainFixture(): BenchmarkFixture {
  const nodes = [
    // Domain A (Sales)
    createNode('ApexClass:SalesController', 'ApexClass'),
    createNode('ApexClass:SalesService', 'ApexClass'),
    createNode('ApexClass:SalesSelector', 'ApexClass'),

    // Domain B (Marketing)
    createNode('ApexClass:MarketingController', 'ApexClass'),
    createNode('ApexClass:MarketingService', 'ApexClass'),
    createNode('ApexClass:MarketingSelector', 'ApexClass'),

    // Domain C (Analytics)
    createNode('ApexClass:AnalyticsEngine', 'ApexClass'),
    createNode('ApexClass:AnalyticsService', 'ApexClass'),
    createNode('ApexClass:AnalyticsStore', 'ApexClass'),
  ];

  const edges = [
    // Domain A internal
    createEdge('ApexClass:SalesController', 'ApexClass:SalesService'),
    createEdge('ApexClass:SalesService', 'ApexClass:SalesSelector'),

    // Domain B internal
    createEdge('ApexClass:MarketingController', 'ApexClass:MarketingService'),
    createEdge('ApexClass:MarketingService', 'ApexClass:MarketingSelector'),

    // Domain C internal
    createEdge('ApexClass:AnalyticsEngine', 'ApexClass:AnalyticsService'),
    createEdge('ApexClass:AnalyticsService', 'ApexClass:AnalyticsStore'),

    // Heavy Cross-Domain Edges (A <-> B)
    createEdge('ApexClass:SalesService', 'ApexClass:MarketingService'),
    createEdge('ApexClass:MarketingController', 'ApexClass:SalesService'),

    // Heavy Cross-Domain Edges (A <-> C)
    createEdge('ApexClass:SalesService', 'ApexClass:AnalyticsEngine'),
    createEdge('ApexClass:SalesSelector', 'ApexClass:AnalyticsService'),

    // Heavy Cross-Domain Edges (B <-> C)
    createEdge('ApexClass:MarketingService', 'ApexClass:AnalyticsEngine'),
    createEdge('ApexClass:MarketingSelector', 'ApexClass:AnalyticsStore'),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'dense-cross-domain',
    name: 'Dense Cross-Domain Graph',
    description: '3 domains (Sales, Marketing, Analytics) connected by a high density of cross-domain edges.',
    purpose: 'Exposes edge crossing failures, domain splitting, and tests crossing minimization algorithms.',
    targetFailures: ['edge crossings', 'weak domain cohesion', 'naive bridge placement'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: 3,
    },
  };
}

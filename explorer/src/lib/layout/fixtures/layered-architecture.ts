import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createLayeredArchitectureFixture(): BenchmarkFixture {
  const nodes = [
    // Presentation
    createNode('LWC:OrderView', 'LWC', { file: 'lwc/orderView/orderView.js' }),
    createNode('LWC:CustomerPortal', 'LWC', { file: 'lwc/customerPortal/customerPortal.js' }),

    // Application
    createNode('ApexClass:OrderController', 'ApexClass'),
    createNode('ApexClass:CustomerController', 'ApexClass'),

    // Domain
    createNode('ApexClass:OrderService', 'ApexClass'),
    createNode('ApexClass:CustomerService', 'ApexClass'),
    createNode('ApexClass:OrderSelector', 'ApexClass'),
    createNode('ApexClass:CustomerSelector', 'ApexClass'),

    // Schema
    createNode('CustomObject:Order__c', 'CustomObject', { file: 'objects/Order__c.object-meta.xml' }),
    createNode('CustomObject:Account', 'Object', { file: 'objects/Account.object-meta.xml' }),
  ];

  const edges = [
    // LWC -> Controller
    createEdge('LWC:OrderView', 'ApexClass:OrderController', { relationshipType: 'lwc-apex' }),
    createEdge('LWC:CustomerPortal', 'ApexClass:CustomerController', { relationshipType: 'lwc-apex' }),

    // Controller -> Service
    createEdge('ApexClass:OrderController', 'ApexClass:OrderService', { relationshipType: 'method-call' }),
    createEdge('ApexClass:CustomerController', 'ApexClass:CustomerService', { relationshipType: 'method-call' }),

    // Service -> Selector
    createEdge('ApexClass:OrderService', 'ApexClass:OrderSelector', { relationshipType: 'method-call' }),
    createEdge('ApexClass:CustomerService', 'ApexClass:CustomerSelector', { relationshipType: 'method-call' }),

    // Selector -> Object
    createEdge('ApexClass:OrderSelector', 'CustomObject:Order__c', { relationshipType: 'SOQL' }),
    createEdge('ApexClass:CustomerSelector', 'CustomObject:Account', { relationshipType: 'SOQL' }),

    // Cross-layer dependency (OrderService -> CustomerSelector)
    createEdge('ApexClass:OrderService', 'ApexClass:CustomerSelector', { relationshipType: 'method-call' }),
  ];

  // Ensure nodes and edges are sorted deterministically
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'layered-architecture',
    name: 'Layered Architecture Benchmark',
    description: 'A clean 4-tier Salesforce architecture (Presentation -> Application -> Domain -> Schema).',
    purpose: 'Tests layer classification, vertical layer ordering, and clean dependency flow across architectural tiers.',
    targetFailures: ['degree-only ordering', 'edge crossings'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      layerCount: 4,
      domainCount: 2,
    },
  };
}

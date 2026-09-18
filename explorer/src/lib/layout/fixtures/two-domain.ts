import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createTwoDomainFixture(): BenchmarkFixture {
  const nodes = [
    // Domain A (Billing)
    createNode('ApexClass:BillingController', 'ApexClass'),
    createNode('ApexClass:BillingService', 'ApexClass'),
    createNode('ApexClass:BillingSelector', 'ApexClass'),
    createNode('CustomObject:Invoice__c', 'CustomObject'),

    // Domain B (Shipping)
    createNode('ApexClass:ShippingController', 'ApexClass'),
    createNode('ApexClass:ShippingService', 'ApexClass'),
    createNode('ApexClass:ShippingSelector', 'ApexClass'),
    createNode('CustomObject:Shipment__c', 'CustomObject'),
  ];

  const edges = [
    // Domain A internal dependencies
    createEdge('ApexClass:BillingController', 'ApexClass:BillingService', { relationshipType: 'method-call' }),
    createEdge('ApexClass:BillingService', 'ApexClass:BillingSelector', { relationshipType: 'method-call' }),
    createEdge('ApexClass:BillingSelector', 'CustomObject:Invoice__c', { relationshipType: 'SOQL' }),

    // Domain B internal dependencies
    createEdge('ApexClass:ShippingController', 'ApexClass:ShippingService', { relationshipType: 'method-call' }),
    createEdge('ApexClass:ShippingService', 'ApexClass:ShippingSelector', { relationshipType: 'method-call' }),
    createEdge('ApexClass:ShippingSelector', 'CustomObject:Shipment__c', { relationshipType: 'SOQL' }),

    // Controlled Cross-Domain Dependency (BillingService -> ShippingService)
    createEdge('ApexClass:BillingService', 'ApexClass:ShippingService', { relationshipType: 'method-call' }),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'two-domain',
    name: 'Two Domain Graph',
    description: 'Two distinct domains (Billing and Shipping) with strong internal cohesion and a single cross-domain relationship.',
    purpose: 'Tests domain spatial cohesion and domain boundary separation.',
    targetFailures: ['weak domain cohesion', 'naive bridge placement'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: 2,
    },
  };
}

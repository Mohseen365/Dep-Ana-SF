import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createFieldHeavyFixture(): BenchmarkFixture {
  const fields = [
    'AccountName__c', 'AccountNumber__c', 'BillingAddress__c', 'ShippingAddress__c',
    'CreditLimit__c', 'Status__c', 'TaxId__c', 'Industry__c', 'Rating__c', 'Phone__c',
    'Fax__c', 'Website__c', 'Ownership__c', 'TickerSymbol__c', 'Description__c',
    'IsActive__c', 'Category__c', 'ExternalId__c', 'SyncStatus__c', 'LastSync__c',
    'Region__c', 'Tier__c', 'DiscountRate__c', 'Manager__c', 'Notes__c',
  ];

  const nodes = [
    // CustomObject
    createNode('CustomObject:Account', 'CustomObject', { file: 'objects/Account.object-meta.xml' }),

    // Field Nodes
    ...fields.map(fieldName =>
      createNode(`Field:Account.${fieldName}`, 'Field', {
        displayName: fieldName,
        file: `objects/Account/fields/${fieldName}.field-meta.xml`,
      })
    ),
  ];

  const edges = fields.map(fieldName =>
    createEdge(`Field:Account.${fieldName}`, 'CustomObject:Account', {
      relationshipType: 'field-reference',
    })
  );

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'field-heavy',
    name: 'Field-Heavy CustomObject',
    description: 'A single CustomObject node with 25 child field satellites.',
    purpose: 'Tests field locality, grid/compact satellite packing, collision prevention, and avoiding production-node displacement.',
    targetFailures: ['test/field distortion', 'single-pass collision failures'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasFields: true,
    },
  };
}

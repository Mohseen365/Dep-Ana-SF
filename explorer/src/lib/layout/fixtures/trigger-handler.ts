import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createTriggerHandlerFixture(): BenchmarkFixture {
  const nodes = [
    // Schema Layer
    createNode('CustomObject:Opportunity', 'CustomObject'),

    // Application Layer - Triggers & Handlers
    createNode('ApexTrigger:OpportunityTrigger', 'ApexTrigger', { file: 'triggers/OpportunityTrigger.trigger' }),
    createNode('ApexClass:OpportunityTriggerHandler', 'ApexClass'),
    createNode('ApexClass:OpportunityTriggerHelper', 'ApexClass'),

    // Application / Domain Layer - Services
    createNode('ApexClass:OpportunityService', 'ApexClass'),
    createNode('ApexClass:OpportunityValidationService', 'ApexClass'),

    // Domain / Selector Layer
    createNode('ApexClass:OpportunitySelector', 'ApexClass'),
  ];

  const edges = [
    // Trigger on Object
    createEdge('ApexTrigger:OpportunityTrigger', 'CustomObject:Opportunity', { relationshipType: 'trigger-on' }),

    // Trigger calls Handler
    createEdge('ApexTrigger:OpportunityTrigger', 'ApexClass:OpportunityTriggerHandler', { relationshipType: 'trigger-handler' }),

    // Handler calls Helper & Services
    createEdge('ApexClass:OpportunityTriggerHandler', 'ApexClass:OpportunityTriggerHelper'),
    createEdge('ApexClass:OpportunityTriggerHandler', 'ApexClass:OpportunityService'),
    createEdge('ApexClass:OpportunityTriggerHandler', 'ApexClass:OpportunityValidationService'),

    // Service calls Selector
    createEdge('ApexClass:OpportunityService', 'ApexClass:OpportunitySelector'),
    createEdge('ApexClass:OpportunitySelector', 'CustomObject:Opportunity', { relationshipType: 'SOQL' }),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'trigger-handler',
    name: 'Trigger / Handler Microcluster',
    description: 'Standard Salesforce pattern: CustomObject -> ApexTrigger -> TriggerHandler -> TriggerHelper -> Service.',
    purpose: 'Tests trigger/handler microcluster spatial locality and layer semantics (Trigger in Application layer, Object in Schema layer).',
    targetFailures: ['weak domain cohesion', 'degree-only ordering', 'edge crossings'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: 1,
    },
  };
}

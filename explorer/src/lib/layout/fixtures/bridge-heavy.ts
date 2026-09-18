import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createBridgeHeavyFixture(): BenchmarkFixture {
  const nodes = [
    // Domain A (Sales)
    createNode('ApexClass:OpportunityService', 'ApexClass'),
    createNode('ApexClass:OpportunitySelector', 'ApexClass'),
    createNode('CustomObject:Opportunity', 'Object'),

    // Domain B (Service)
    createNode('ApexClass:CaseService', 'ApexClass'),
    createNode('ApexClass:CaseSelector', 'ApexClass'),
    createNode('CustomObject:Case', 'Object'),

    // Domain C (Inventory)
    createNode('ApexClass:ProductService', 'ApexClass'),
    createNode('ApexClass:StockSelector', 'ApexClass'),
    createNode('CustomObject:Product2', 'Object'),

    // Bridge Nodes connecting A <-> B, A <-> C, B <-> C
    createNode('ApexClass:SalesToServiceBridge', 'ApexClass'), // A <-> B
    createNode('ApexClass:SalesToInventoryBridge', 'ApexClass'), // A <-> C
    createNode('ApexClass:ServiceToInventoryBridge', 'ApexClass'), // B <-> C
    createNode('ApexClass:CentralOrchestratorBridge', 'ApexClass'), // A <-> B <-> C
  ];

  const edges = [
    // Domain A internal
    createEdge('ApexClass:OpportunityService', 'ApexClass:OpportunitySelector'),
    createEdge('ApexClass:OpportunitySelector', 'CustomObject:Opportunity', { relationshipType: 'SOQL' }),

    // Domain B internal
    createEdge('ApexClass:CaseService', 'ApexClass:CaseSelector'),
    createEdge('ApexClass:CaseSelector', 'CustomObject:Case', { relationshipType: 'SOQL' }),

    // Domain C internal
    createEdge('ApexClass:ProductService', 'ApexClass:StockSelector'),
    createEdge('ApexClass:StockSelector', 'CustomObject:Product2', { relationshipType: 'SOQL' }),

    // A <-> Bridge AB <-> B
    createEdge('ApexClass:OpportunityService', 'ApexClass:SalesToServiceBridge'),
    createEdge('ApexClass:SalesToServiceBridge', 'ApexClass:CaseService'),

    // A <-> Bridge AC <-> C
    createEdge('ApexClass:OpportunityService', 'ApexClass:SalesToInventoryBridge'),
    createEdge('ApexClass:SalesToInventoryBridge', 'ApexClass:ProductService'),

    // B <-> Bridge BC <-> C
    createEdge('ApexClass:CaseService', 'ApexClass:ServiceToInventoryBridge'),
    createEdge('ApexClass:ServiceToInventoryBridge', 'ApexClass:ProductService'),

    // Central Orchestrator Bridge connecting all three
    createEdge('ApexClass:OpportunityService', 'ApexClass:CentralOrchestratorBridge'),
    createEdge('ApexClass:CaseService', 'ApexClass:CentralOrchestratorBridge'),
    createEdge('ApexClass:ProductService', 'ApexClass:CentralOrchestratorBridge'),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'bridge-heavy',
    name: 'Bridge-Heavy Architecture',
    description: 'Multiple domains interconnected through dedicated cross-domain bridge nodes.',
    purpose: 'Exposes naive bridge placement (arithmetic mean placement into wrong clusters) and edge crossings between inter-connected domains.',
    targetFailures: ['naive bridge placement', 'edge crossings', 'weak domain cohesion'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: 3,
      hasBridges: true,
    },
  };
}

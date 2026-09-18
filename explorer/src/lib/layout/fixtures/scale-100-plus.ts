import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createScale100PlusFixture(): BenchmarkFixture {
  const nodes = [];
  const edges = [];

  const domains = ['Customer', 'Order', 'Inventory', 'Billing', 'Analytics', 'Notification', 'Support', 'Shipping'];

  // Generate 8 Domains with Presentation, Application, Domain, Schema layers
  domains.forEach(domain => {
    const lwc = createNode(`LWC:${domain}Portal`, 'LWC', { file: `lwc/${domain.toLowerCase()}Portal/${domain.toLowerCase()}Portal.js` });
    const ctrl = createNode(`ApexClass:${domain}Controller`, 'ApexClass');
    const trg = createNode(`ApexTrigger:${domain}Trigger`, 'ApexTrigger', { file: `triggers/${domain}Trigger.trigger` });
    const hnd = createNode(`ApexClass:${domain}TriggerHandler`, 'ApexClass');
    const svc = createNode(`ApexClass:${domain}Service`, 'ApexClass');
    const sel = createNode(`ApexClass:${domain}Selector`, 'ApexClass');
    const obj = createNode(`CustomObject:${domain}Header__c`, 'CustomObject', { file: `objects/${domain}Header__c.object-meta.xml` });
    const test = createNode(`ApexClass:${domain}ServiceTest`, 'ApexClass', { isTest: true });

    nodes.push(lwc, ctrl, trg, hnd, svc, sel, obj, test);

    // Add fields (4 per domain object)
    for (let f = 1; f <= 4; f++) {
      const field = createNode(`Field:${domain}Header__c.Field_${f}__c`, 'Field', {
        displayName: `Field_${f}__c`,
        file: `objects/${domain}Header__c/fields/Field_${f}__c.field-meta.xml`,
      });
      nodes.push(field);
      edges.push(createEdge(`Field:${domain}Header__c.Field_${f}__c`, `CustomObject:${domain}Header__c`, { relationshipType: 'field-reference' }));
    }

    // Intra-domain edges
    edges.push(createEdge(`LWC:${domain}Portal`, `ApexClass:${domain}Controller`, { relationshipType: 'lwc-apex' }));
    edges.push(createEdge(`ApexClass:${domain}Controller`, `ApexClass:${domain}Service`));
    edges.push(createEdge(`ApexTrigger:${domain}Trigger`, `CustomObject:${domain}Header__c`, { relationshipType: 'trigger-on' }));
    edges.push(createEdge(`ApexTrigger:${domain}Trigger`, `ApexClass:${domain}TriggerHandler`, { relationshipType: 'trigger-handler' }));
    edges.push(createEdge(`ApexClass:${domain}TriggerHandler`, `ApexClass:${domain}Service`));
    edges.push(createEdge(`ApexClass:${domain}Service`, `ApexClass:${domain}Selector`));
    edges.push(createEdge(`ApexClass:${domain}Selector`, `CustomObject:${domain}Header__c`, { relationshipType: 'SOQL' }));
    edges.push(createEdge(`ApexClass:${domain}ServiceTest`, `ApexClass:${domain}Service`, { relationshipType: 'test-reference' }));
  });

  // Hubs
  const globalLogger = createNode('ApexClass:GlobalSystemLogger', 'ApexClass');
  const globalEventBus = createNode('ApexClass:GlobalEventDispatcher', 'ApexClass');
  nodes.push(globalLogger, globalEventBus);

  domains.forEach(d => {
    edges.push(createEdge(`ApexClass:${d}Service`, 'ApexClass:GlobalSystemLogger'));
    edges.push(createEdge('ApexClass:GlobalEventDispatcher', `ApexClass:${d}Service`));
  });

  // Bridges
  const orderBillingBridge = createNode('ApexClass:OrderToBillingBridge', 'ApexClass');
  const customerOrderBridge = createNode('ApexClass:CustomerToOrderBridge', 'ApexClass');
  const inventoryNotificationBridge = createNode('ApexClass:InventoryToNotificationBridge', 'ApexClass');
  nodes.push(orderBillingBridge, customerOrderBridge, inventoryNotificationBridge);

  edges.push(createEdge('ApexClass:OrderService', 'ApexClass:OrderToBillingBridge'));
  edges.push(createEdge('ApexClass:OrderToBillingBridge', 'ApexClass:BillingService'));

  edges.push(createEdge('ApexClass:CustomerService', 'ApexClass:CustomerToOrderBridge'));
  edges.push(createEdge('ApexClass:CustomerToOrderBridge', 'ApexClass:OrderService'));

  edges.push(createEdge('ApexClass:InventoryService', 'ApexClass:InventoryToNotificationBridge'));
  edges.push(createEdge('ApexClass:InventoryToNotificationBridge', 'ApexClass:NotificationService'));

  // Disconnected Component (10 standalone utility nodes)
  for (let u = 1; u <= 10; u++) {
    const utilNode = createNode(`ApexClass:StandaloneUtility_${u}`, 'ApexClass');
    nodes.push(utilNode);
  }
  edges.push(createEdge('ApexClass:StandaloneUtility_1', 'ApexClass:StandaloneUtility_2'));
  edges.push(createEdge('ApexClass:StandaloneUtility_3', 'ApexClass:StandaloneUtility_4'));

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'scale-100-plus',
    name: '100+ Node Large Architecture Benchmark',
    description: 'Deterministic 100+ node benchmark graph combining multiple layers, domains, hubs, bridges, satellites, and disconnected components.',
    purpose: 'Validates scalability, performance, determinism, and layout quality on a realistic large-scale graph.',
    targetFailures: [
      'edge crossings',
      'weak domain cohesion',
      'naive bridge placement',
      'single-pass collision failures',
      'horizontal disconnected-component stretching',
      'test/field distortion',
      'degree-only ordering',
    ],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: domains.length,
      hasTests: true,
      hasFields: true,
      hasBridges: true,
      hasHubs: true,
      componentCount: 8,
    },
  };
}

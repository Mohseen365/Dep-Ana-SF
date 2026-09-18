import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createFoodDeliveryFixture(): BenchmarkFixture {
  const nodes = [
    // Customer Domain
    createNode('LWC:CustomerPortal', 'LWC'),
    createNode('ApexClass:CustomerController', 'ApexClass'),
    createNode('ApexClass:CustomerService', 'ApexClass'),
    createNode('ApexClass:CustomerSelector', 'ApexClass'),
    createNode('CustomObject:Customer__c', 'CustomObject'),
    createNode('Field:Customer__c.Email__c', 'Field'),

    // Restaurant Domain
    createNode('LWC:MenuViewer', 'LWC'),
    createNode('ApexClass:RestaurantController', 'ApexClass'),
    createNode('ApexClass:RestaurantService', 'ApexClass'),
    createNode('ApexClass:RestaurantSelector', 'ApexClass'),
    createNode('CustomObject:Restaurant__c', 'CustomObject'),
    createNode('CustomObject:MenuItem__c', 'CustomObject'),

    // Order Domain
    createNode('LWC:OrderCheckout', 'LWC'),
    createNode('ApexClass:OrderController', 'ApexClass'),
    createNode('ApexClass:OrderService', 'ApexClass'),
    createNode('ApexClass:OrderSelector', 'ApexClass'),
    createNode('CustomObject:Order__c', 'CustomObject'),
    createNode('ApexClass:OrderServiceTest', 'ApexClass', { isTest: true }),

    // Payment Domain
    createNode('ApexClass:PaymentGateway', 'ApexClass'),
    createNode('ApexClass:PaymentProcessor', 'ApexClass'),
    createNode('ApexClass:PaymentService', 'ApexClass'),
    createNode('CustomObject:Payment__c', 'CustomObject'),

    // Delivery Domain
    createNode('ApexClass:DeliveryManager', 'ApexClass'),
    createNode('ApexClass:DeliveryService', 'ApexClass'),
    createNode('ApexClass:DriverSelector', 'ApexClass'),
    createNode('CustomObject:Delivery__c', 'CustomObject'),
  ];

  const edges = [
    // Customer Domain internal
    createEdge('LWC:CustomerPortal', 'ApexClass:CustomerController', { relationshipType: 'lwc-apex' }),
    createEdge('ApexClass:CustomerController', 'ApexClass:CustomerService'),
    createEdge('ApexClass:CustomerService', 'ApexClass:CustomerSelector'),
    createEdge('ApexClass:CustomerSelector', 'CustomObject:Customer__c', { relationshipType: 'SOQL' }),
    createEdge('Field:Customer__c.Email__c', 'CustomObject:Customer__c', { relationshipType: 'field-reference' }),

    // Restaurant Domain internal
    createEdge('LWC:MenuViewer', 'ApexClass:RestaurantController', { relationshipType: 'lwc-apex' }),
    createEdge('ApexClass:RestaurantController', 'ApexClass:RestaurantService'),
    createEdge('ApexClass:RestaurantService', 'ApexClass:RestaurantSelector'),
    createEdge('ApexClass:RestaurantSelector', 'CustomObject:Restaurant__c', { relationshipType: 'SOQL' }),
    createEdge('ApexClass:RestaurantSelector', 'CustomObject:MenuItem__c', { relationshipType: 'SOQL' }),

    // Order Domain internal
    createEdge('LWC:OrderCheckout', 'ApexClass:OrderController', { relationshipType: 'lwc-apex' }),
    createEdge('ApexClass:OrderController', 'ApexClass:OrderService'),
    createEdge('ApexClass:OrderService', 'ApexClass:OrderSelector'),
    createEdge('ApexClass:OrderSelector', 'CustomObject:Order__c', { relationshipType: 'SOQL' }),
    createEdge('ApexClass:OrderServiceTest', 'ApexClass:OrderService', { relationshipType: 'test-reference' }),

    // Payment Domain internal
    createEdge('ApexClass:PaymentProcessor', 'ApexClass:PaymentGateway'),
    createEdge('ApexClass:PaymentService', 'ApexClass:PaymentProcessor'),
    createEdge('ApexClass:PaymentService', 'CustomObject:Payment__c', { relationshipType: 'SOQL' }),

    // Delivery Domain internal
    createEdge('ApexClass:DeliveryManager', 'ApexClass:DeliveryService'),
    createEdge('ApexClass:DeliveryService', 'ApexClass:DriverSelector'),
    createEdge('ApexClass:DeliveryService', 'CustomObject:Delivery__c', { relationshipType: 'SOQL' }),

    // Cross-Domain Orchestration Relationships
    createEdge('ApexClass:OrderService', 'ApexClass:CustomerService'),
    createEdge('ApexClass:OrderService', 'ApexClass:RestaurantService'),
    createEdge('ApexClass:OrderService', 'ApexClass:PaymentService'),
    createEdge('ApexClass:OrderService', 'ApexClass:DeliveryService'),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'food-delivery',
    name: 'Food Delivery Architecture',
    description: 'Realistic multi-domain enterprise architecture (Customer, Restaurant, Order, Payment, Delivery).',
    purpose: 'Exposes complex multi-domain arrangement, bridge orchestration, and satellite placement across realistic Salesforce layers.',
    targetFailures: ['weak domain cohesion', 'naive bridge placement', 'edge crossings'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      domainCount: 5,
      hasTests: true,
      hasFields: true,
      hasBridges: true,
    },
  };
}

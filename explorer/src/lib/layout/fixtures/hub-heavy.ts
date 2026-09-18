import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createHubHeavyFixture(): BenchmarkFixture {
  const nodes = [
    // Central Fan-In Hub (e.g. AuditLogger used by everyone)
    createNode('ApexClass:AuditLogger', 'ApexClass'),

    // Central Fan-Out Hub (e.g. NotificationDispatcher calling many targets)
    createNode('ApexClass:NotificationDispatcher', 'ApexClass'),

    // Client services calling AuditLogger
    createNode('ApexClass:AccountService', 'ApexClass'),
    createNode('ApexClass:BillingService', 'ApexClass'),
    createNode('ApexClass:CaseService', 'ApexClass'),
    createNode('ApexClass:ContactService', 'ApexClass'),
    createNode('ApexClass:LeadService', 'ApexClass'),
    createNode('ApexClass:OpportunityService', 'ApexClass'),
    createNode('ApexClass:OrderService', 'ApexClass'),

    // Target services called by NotificationDispatcher
    createNode('ApexClass:EmailSender', 'ApexClass'),
    createNode('ApexClass:InAppNotifier', 'ApexClass'),
    createNode('ApexClass:PushNotifier', 'ApexClass'),
    createNode('ApexClass:SlackNotifier', 'ApexClass'),
    createNode('ApexClass:SmsGateway', 'ApexClass'),
    createNode('ApexClass:WebhookPublisher', 'ApexClass'),
  ];

  const edges = [
    // Fan-In to AuditLogger
    createEdge('ApexClass:AccountService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:BillingService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:CaseService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:ContactService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:LeadService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:OpportunityService', 'ApexClass:AuditLogger'),
    createEdge('ApexClass:OrderService', 'ApexClass:AuditLogger'),

    // Fan-In to NotificationDispatcher
    createEdge('ApexClass:AccountService', 'ApexClass:NotificationDispatcher'),
    createEdge('ApexClass:CaseService', 'ApexClass:NotificationDispatcher'),
    createEdge('ApexClass:OrderService', 'ApexClass:NotificationDispatcher'),

    // Fan-Out from NotificationDispatcher
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:EmailSender'),
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:InAppNotifier'),
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:PushNotifier'),
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:SlackNotifier'),
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:SmsGateway'),
    createEdge('ApexClass:NotificationDispatcher', 'ApexClass:WebhookPublisher'),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'hub-heavy',
    name: 'Hub-Heavy Architecture',
    description: 'Graph dominated by high fan-in and high fan-out central hub nodes.',
    purpose: 'Tests hub centrality placement, radial vs grid placement, and edge-length minimization around central hubs.',
    targetFailures: ['degree-only ordering', 'single-pass collision failures'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasHubs: true,
    },
  };
}

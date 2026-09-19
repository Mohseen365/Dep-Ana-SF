import type { BenchmarkFixture } from './types';
import { createNode, createEdge, recalculateNodeMetrics } from './builder';

export function createTestHeavyFixture(): BenchmarkFixture {
  const nodes = [
    // Production Node
    createNode('ApexClass:PaymentProcessor', 'ApexClass'),
    createNode('ApexClass:PaymentGateway', 'ApexClass'),

    // Tests targeting PaymentProcessor
    createNode('ApexClass:PaymentProcessorTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorUnitTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorIntTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorSecurityTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorPerfTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorMockTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorExceptionTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorEdgeCaseTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorBatchTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorValidationTest', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorDataFactory', 'ApexClass', { isTest: true }),
    createNode('ApexClass:PaymentProcessorUtilTest', 'ApexClass', { isTest: true }),
  ];

  const edges = [
    createEdge('ApexClass:PaymentProcessor', 'ApexClass:PaymentGateway'),

    // All tests point to PaymentProcessor
    createEdge('ApexClass:PaymentProcessorTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorUnitTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorIntTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorSecurityTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorPerfTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorMockTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorExceptionTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorEdgeCaseTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorBatchTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorValidationTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorDataFactory', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
    createEdge('ApexClass:PaymentProcessorUtilTest', 'ApexClass:PaymentProcessor', { relationshipType: 'test-reference' }),
  ];

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  recalculateNodeMetrics(nodes, edges);

  return {
    id: 'test-heavy',
    name: 'Test-Heavy Architecture',
    description: 'Single production node surrounded by 12 test satellites and test data factories.',
    purpose: 'Verifies that test satellites form compact local clusters near their target and do not distort production node positions or act as architecture hubs.',
    targetFailures: ['test/field distortion', 'degree-only ordering', 'single-pass collision failures'],
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasTests: true,
    },
  };
}

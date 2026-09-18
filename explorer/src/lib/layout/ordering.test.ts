import { describe, it, expect } from 'vitest';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';
import {
  reduceEdgeCrossings,
  type NodeOrderingInput,
} from './ordering';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType, ExplorerRelationshipType } from '../../types/explorer';
import type { ArchitectureLayer } from './types';

function createDummyNode(
  id: string,
  type: ExplorerNodeType = 'ApexClass',
  displayName?: string
): ExplorerNode {
  return {
    id,
    displayName: displayName || id,
    type,
    file: `src/${id}.cls`,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: false,
      publicContractsCount: 0,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 0,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'UNTESTED',
    },
  };
}

function createDummyEdge(source: string, target: string): ExplorerEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'calls',
    relationshipType: 'calls' as ExplorerRelationshipType,
  };
}

describe('Layer Ordering & Edge Crossing Minimization (Agent 2B)', () => {
  describe('Simple Crossing Reduction', () => {
    it('eliminates a simple edge crossing between two layers (A->Y and B->X)', () => {
      // Layer 0 (presentation): Node A, Node B
      // Layer 1 (application): Node X, Node Y
      // Edges: A -> Y, B -> X
      const nodes: ExplorerNode[] = [
        createDummyNode('A', 'LWC'),
        createDummyNode('B', 'LWC'),
        createDummyNode('X', 'ApexClass'),
        createDummyNode('Y', 'ApexClass'),
      ];

      const edges: ExplorerEdge[] = [
        createDummyEdge('A', 'Y'),
        createDummyEdge('B', 'X'),
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['A', 'presentation'],
        ['B', 'presentation'],
        ['X', 'application'],
        ['Y', 'application'],
      ]);

      const domainMap = new Map<string, string>([
        ['A', 'DomainA'],
        ['B', 'DomainA'],
        ['X', 'DomainA'],
        ['Y', 'DomainA'],
      ]);

      const result = reduceEdgeCrossings({
        nodes,
        edges,
        layerMap,
        domainMap,
      });

      // Bucket key for application layer
      const appBucket = result.bucketOrder.get('application:DomainA') || [];
      const presBucket = result.bucketOrder.get('presentation:DomainA') || [];

      // Either presentation is [A, B] and app is [Y, X], or pres is [B, A] and app is [X, Y]
      const presIndexA = presBucket.indexOf('A');
      const presIndexB = presBucket.indexOf('B');
      const appIndexX = appBucket.indexOf('X');
      const appIndexY = appBucket.indexOf('Y');

      // Check relative order: A comes before B iff Y comes before X
      const presOrderAFirst = presIndexA < presIndexB;
      const appOrderYFirst = appIndexY < appIndexX;
      expect(presOrderAFirst).toBe(appOrderYFirst);

      // Verify estimated crossings is 0
      expect(result.estimatedCrossings).toBe(0);
    });
  });

  describe('Multi-edge Crossing Reduction', () => {
    it('reduces crossings in a multi-edge dense layer setup', () => {
      // Presentation layer: P1, P2, P3
      // Application layer: A1, A2, A3
      // Edges intentionally crossed: P1->A3, P2->A2, P3->A1
      const nodes = [
        createDummyNode('P1', 'LWC'),
        createDummyNode('P2', 'LWC'),
        createDummyNode('P3', 'LWC'),
        createDummyNode('A1', 'ApexClass'),
        createDummyNode('A2', 'ApexClass'),
        createDummyNode('A3', 'ApexClass'),
      ];

      const edges = [
        createDummyEdge('P1', 'A3'),
        createDummyEdge('P2', 'A2'),
        createDummyEdge('P3', 'A1'),
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['P1', 'presentation'],
        ['P2', 'presentation'],
        ['P3', 'presentation'],
        ['A1', 'application'],
        ['A2', 'application'],
        ['A3', 'application'],
      ]);

      const domainMap = new Map<string, string>([
        ['P1', 'DomainA'],
        ['P2', 'DomainA'],
        ['P3', 'DomainA'],
        ['A1', 'DomainA'],
        ['A2', 'DomainA'],
        ['A3', 'DomainA'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });

      // After ordering, P1,P2,P3 aligned with A3,A2,A1 eliminates all crossings
      expect(result.estimatedCrossings).toBe(0);
    });
  });

  describe('Same-layer Edges', () => {
    it('handles same-layer edges safely without crashing or throwing errors', () => {
      const nodes = [
        createDummyNode('A1', 'ApexClass'),
        createDummyNode('A2', 'ApexClass'),
        createDummyNode('A3', 'ApexClass'),
      ];

      // Edges within same application layer: A1 -> A2, A2 -> A3, A3 -> A1 (cycle)
      const edges = [
        createDummyEdge('A1', 'A2'),
        createDummyEdge('A2', 'A3'),
        createDummyEdge('A3', 'A1'),
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['A1', 'application'],
        ['A2', 'application'],
        ['A3', 'application'],
      ]);

      expect(() => {
        const result = reduceEdgeCrossings({ nodes, edges, layerMap });
        expect(result.regions.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('Cycles', () => {
    it('handles cyclic graphs safely without crashing or infinite loops', () => {
      const nodes = [
        createDummyNode('ServiceA', 'ApexClass'),
        createDummyNode('ServiceB', 'ApexClass'),
        createDummyNode('SelectorA', 'ApexClass'),
      ];

      const edges = [
        createDummyEdge('ServiceA', 'ServiceB'),
        createDummyEdge('ServiceB', 'SelectorA'),
        createDummyEdge('SelectorA', 'ServiceA'), // Cycle
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['ServiceA', 'application'],
        ['ServiceB', 'application'],
        ['SelectorA', 'domain'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, maxIterations: 6 });

      expect(result.iterationsExecuted).toBeLessThanOrEqual(6);
      expect(result.nodeRankMap.size).toBe(3);
    });
  });

  describe('Hub Handling', () => {
    it('orders hubs according to neighbor barycenters rather than degree alone', () => {
      // Hub Node H has degree 3 (connected to P1, P2, P3 on left)
      // Node N has degree 1 (connected to P4 on right)
      const nodes = [
        createDummyNode('P1', 'LWC'),
        createDummyNode('P2', 'LWC'),
        createDummyNode('P3', 'LWC'),
        createDummyNode('P4', 'LWC'),
        createDummyNode('HubH', 'ApexClass'),
        createDummyNode('NodeN', 'ApexClass'),
      ];

      const edges = [
        createDummyEdge('P1', 'HubH'),
        createDummyEdge('P2', 'HubH'),
        createDummyEdge('P3', 'HubH'),
        createDummyEdge('P4', 'NodeN'),
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['P1', 'presentation'],
        ['P2', 'presentation'],
        ['P3', 'presentation'],
        ['P4', 'presentation'],
        ['HubH', 'application'],
        ['NodeN', 'application'],
      ]);

      const domainMap = new Map<string, string>([
        ['P1', 'D1'],
        ['P2', 'D1'],
        ['P3', 'D1'],
        ['P4', 'D1'],
        ['HubH', 'D1'],
        ['NodeN', 'D1'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });

      const appBucket = result.bucketOrder.get('application:D1') || [];
      // HubH is connected to P1,P2,P3 (indices 0,1,2 in presentation), so its barycenter is ~1.0
      // NodeN is connected to P4 (index 3 in presentation), so its barycenter is 3.0
      // HubH should come before NodeN because of barycenter (1.0 < 3.0), not purely because degree was higher
      expect(appBucket.indexOf('HubH')).toBeLessThan(appBucket.indexOf('NodeN'));
    });
  });

  describe('Domain Boundary Preservation', () => {
    it('strictly preserves domain bucket boundaries and does not move nodes between domains', () => {
      const nodes = [
        createDummyNode('CustomerController', 'ApexClass'),
        createDummyNode('OrderController', 'ApexClass'),
      ];

      const edges = [
        createDummyEdge('CustomerController', 'OrderController'),
      ];

      const layerMap = new Map<string, ArchitectureLayer>([
        ['CustomerController', 'application'],
        ['OrderController', 'application'],
      ]);

      const domainMap = new Map<string, string>([
        ['CustomerController', 'Customer'],
        ['OrderController', 'Order'],
      ]);

      const result = reduceEdgeCrossings({ nodes, edges, layerMap, domainMap });

      const customerBucket = result.bucketOrder.get('application:Customer') || [];
      const orderBucket = result.bucketOrder.get('application:Order') || [];

      expect(customerBucket).toEqual(['CustomerController']);
      expect(orderBucket).toEqual(['OrderController']);
      expect(result.nodeBucketMap.get('CustomerController')).toBe('application:Customer');
      expect(result.nodeBucketMap.get('OrderController')).toBe('application:Order');
    });
  });

  describe('Determinism Guarantee', () => {
    it('produces identical output given shuffled node and edge input arrays', () => {
      const fixture = createFoodDeliveryFixture();

      const input1: NodeOrderingInput = {
        nodes: [...fixture.nodes],
        edges: [...fixture.edges],
      };

      // Shuffle nodes and edges
      const shuffledNodes = [...fixture.nodes].reverse();
      const shuffledEdges = [...fixture.edges].reverse();

      const input2: NodeOrderingInput = {
        nodes: shuffledNodes,
        edges: shuffledEdges,
      };

      const result1 = reduceEdgeCrossings(input1);
      const result2 = reduceEdgeCrossings(input2);

      expect(result1.estimatedCrossings).toBe(result2.estimatedCrossings);
      expect(Array.from(result1.nodeRankMap.entries())).toEqual(
        Array.from(result2.nodeRankMap.entries())
      );
      expect(Array.from(result1.bucketOrder.entries())).toEqual(
        Array.from(result2.bucketOrder.entries())
      );
    });
  });

  describe('Food Delivery Fixture Benchmark', () => {
    it('executes against Food Delivery benchmark fixture and records crossing metrics', () => {
      const fixture = createFoodDeliveryFixture();

      const result = reduceEdgeCrossings({
        nodes: fixture.nodes,
        edges: fixture.edges,
      });

      expect(result.iterationsExecuted).toBeGreaterThan(0);
      expect(result.iterationsExecuted).toBeLessThanOrEqual(4);
      expect(result.regions.length).toBeGreaterThan(0);
      expect(result.estimatedCrossings).toBeLessThanOrEqual(6);
    });
  });
});

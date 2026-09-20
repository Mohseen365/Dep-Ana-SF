import { describe, it, expect } from 'vitest';
import { createLayoutGraphIndex } from './graph-index';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

function createDummyNode(id: string, overrides: Partial<ExplorerNode> = {}): ExplorerNode {
  return {
    id,
    displayName: id.split(':').pop() || id,
    type: 'ApexClass',
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
    ...overrides,
  };
}

function createDummyEdge(id: string, source: string, target: string): ExplorerEdge {
  return {
    id,
    source,
    target,
    relationshipType: 'method-call',
    method: 'execute',
    evidence: 'calls',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'execute',
    file: 'src/A.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: { line: 1, column: 1 },
    },
  };
}

describe('LayoutGraphIndex Unit Tests', () => {
  it('handles empty graph', () => {
    const index = createLayoutGraphIndex([], []);
    expect(index.nodeById.size).toBe(0);
    expect(index.incomingEdgesByNode.size).toBe(0);
    expect(index.outgoingEdgesByNode.size).toBe(0);
    expect(index.incidentEdgesByNode.size).toBe(0);
    expect(index.incomingNeighborsByNode.size).toBe(0);
    expect(index.outgoingNeighborsByNode.size).toBe(0);
    expect(index.incidentNeighborsByNode.size).toBe(0);
    expect(index.parentProductionNodeId.size).toBe(0);
    expect(index.parentObjectId.size).toBe(0);
  });

  it('handles single node with empty adjacency arrays', () => {
    const nodeA = createDummyNode('A');
    const index = createLayoutGraphIndex([nodeA], []);

    expect(index.nodeById.get('A')).toBe(nodeA);
    expect(index.incomingEdgesByNode.get('A')).toEqual([]);
    expect(index.outgoingEdgesByNode.get('A')).toEqual([]);
    expect(index.incidentEdgesByNode.get('A')).toEqual([]);
    expect(index.incomingNeighborsByNode.get('A')).toEqual([]);
    expect(index.outgoingNeighborsByNode.get('A')).toEqual([]);
    expect(index.incidentNeighborsByNode.get('A')).toEqual([]);
    expect(index.parentProductionNodeId.get('A')).toBeNull();
    expect(index.parentObjectId.get('A')).toBeNull();
  });

  it('handles directed graph correctly', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const edge1 = createDummyEdge('e1', 'A', 'B');

    const index = createLayoutGraphIndex([nodeA, nodeB], [edge1]);

    expect(index.outgoingEdgesByNode.get('A')).toEqual([edge1]);
    expect(index.incomingEdgesByNode.get('A')).toEqual([]);
    expect(index.incidentEdgesByNode.get('A')).toEqual([edge1]);
    expect(index.outgoingNeighborsByNode.get('A')).toEqual(['B']);
    expect(index.incomingNeighborsByNode.get('A')).toEqual([]);
    expect(index.incidentNeighborsByNode.get('A')).toEqual(['B']);

    expect(index.incomingEdgesByNode.get('B')).toEqual([edge1]);
    expect(index.outgoingEdgesByNode.get('B')).toEqual([]);
    expect(index.incidentEdgesByNode.get('B')).toEqual([edge1]);
    expect(index.incomingNeighborsByNode.get('B')).toEqual(['A']);
    expect(index.outgoingNeighborsByNode.get('B')).toEqual([]);
    expect(index.incidentNeighborsByNode.get('B')).toEqual(['A']);
  });

  it('handles multi-edge (parallel) graph: all edges in edge arrays, single neighbor in neighbor arrays', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const edge1 = createDummyEdge('e1', 'A', 'B');
    const edge2 = createDummyEdge('e2', 'A', 'B');

    const index = createLayoutGraphIndex([nodeA, nodeB], [edge2, edge1]);

    expect(index.outgoingEdgesByNode.get('A')).toEqual([edge1, edge2]);
    expect(index.outgoingNeighborsByNode.get('A')).toEqual(['B']);
    expect(index.incidentNeighborsByNode.get('A')).toEqual(['B']);
  });

  it('handles self-loops: included in incident edges, excluded from neighbor arrays', () => {
    const nodeA = createDummyNode('A');
    const loopEdge = createDummyEdge('e_loop', 'A', 'A');

    const index = createLayoutGraphIndex([nodeA], [loopEdge]);

    expect(index.incidentEdgesByNode.get('A')).toEqual([loopEdge]);
    expect(index.outgoingEdgesByNode.get('A')).toEqual([loopEdge]);
    expect(index.incomingEdgesByNode.get('A')).toEqual([loopEdge]);

    expect(index.incidentNeighborsByNode.get('A')).toEqual([]);
    expect(index.outgoingNeighborsByNode.get('A')).toEqual([]);
    expect(index.incomingNeighborsByNode.get('A')).toEqual([]);
  });

  it('handles disconnected graph with independent adjacencies', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const nodeC = createDummyNode('C');
    const edge1 = createDummyEdge('e1', 'A', 'B');

    const index = createLayoutGraphIndex([nodeA, nodeB, nodeC], [edge1]);

    expect(index.incidentNeighborsByNode.get('C')).toEqual([]);
    expect(index.incidentEdgesByNode.get('C')).toEqual([]);
  });

  it('throws deterministic error on missing endpoints', () => {
    const nodeA = createDummyNode('A');
    const edge1 = createDummyEdge('e1', 'A', 'UNKNOWN');

    expect(() => createLayoutGraphIndex([nodeA], [edge1])).toThrow(
      '[LayoutGraphIndex] Edge refers to unknown endpoint node: UNKNOWN'
    );
  });

  it('throws deterministic error on duplicate node IDs', () => {
    const nodeA1 = createDummyNode('A');
    const nodeA2 = createDummyNode('A');

    expect(() => createLayoutGraphIndex([nodeA1, nodeA2], [])).toThrow(
      '[LayoutGraphIndex] Duplicate node ID detected: A'
    );
  });

  it('throws deterministic error on duplicate edge IDs', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const edge1a = createDummyEdge('e1', 'A', 'B');
    const edge1b = createDummyEdge('e1', 'A', 'B');

    expect(() => createLayoutGraphIndex([nodeA, nodeB], [edge1a, edge1b])).toThrow(
      '[LayoutGraphIndex] Duplicate edge ID detected: e1'
    );
  });

  it('resolves test -> production parent correctly (direct edge, naming, fallback, ambiguous sorting)', () => {
    // Case 1: Direct edge to non-test node
    const test1 = createDummyNode('OrderServiceTest', { behavior: { ...createDummyNode('x').behavior, isTest: true } });
    const prod1 = createDummyNode('OrderService');
    const prod2 = createDummyNode('AccountService');
    const edge1 = createDummyEdge('e1', 'OrderServiceTest', 'AccountService');
    const edge2 = createDummyEdge('e2', 'OrderServiceTest', 'OrderService');

    const index1 = createLayoutGraphIndex([prod2, prod1, test1], [edge2, edge1]);
    expect(index1.parentProductionNodeId.get('OrderServiceTest')).toBe('AccountService'); // Alphabetically AccountService < OrderService

    // Case 2: Naming convention match (no connected edges)
    const test2 = createDummyNode('CustomerTest', { behavior: { ...createDummyNode('x').behavior, isTest: true } });
    const prodCustomer = createDummyNode('Customer');
    const index2 = createLayoutGraphIndex([prodCustomer, test2], []);
    expect(index2.parentProductionNodeId.get('CustomerTest')).toBe('Customer');

    // Case 3: Fallback (unanchored test node)
    const test3 = createDummyNode('UnanchoredTest', { behavior: { ...createDummyNode('x').behavior, isTest: true } });
    const index3 = createLayoutGraphIndex([test3], []);
    expect(index3.parentProductionNodeId.get('UnanchoredTest')).toBeNull();
  });

  it('resolves field -> object parent correctly (ID structure, edge connection, fallback)', () => {
    // Case 1: ID structure match
    const field1 = createDummyNode('Object:Account.Field:Phone', { type: 'Field' });
    const object1 = createDummyNode('Object:Account', { type: 'Object', displayName: 'Account' });

    const index1 = createLayoutGraphIndex([object1, field1], []);
    expect(index1.parentObjectId.get('Object:Account.Field:Phone')).toBe('Object:Account');

    // Case 2: Connected edge match when ID structure does not match
    const field2 = createDummyNode('CustomField:Rating', { type: 'CustomField' });
    const object2 = createDummyNode('CustomObject:Contact', { type: 'CustomObject' });
    const edge1 = createDummyEdge('e1', 'CustomField:Rating', 'CustomObject:Contact');

    const index2 = createLayoutGraphIndex([object2, field2], [edge1]);
    expect(index2.parentObjectId.get('CustomField:Rating')).toBe('CustomObject:Contact');

    // Case 3: Fallback null
    const field3 = createDummyNode('Field:Standalone', { type: 'Field' });
    const index3 = createLayoutGraphIndex([field3], []);
    expect(index3.parentObjectId.get('Field:Standalone')).toBeNull();
  });

  it('guarantees determinism under Stage 0 sorted input shuffling', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const nodeC = createDummyNode('C');
    const edge1 = createDummyEdge('e1', 'A', 'B');
    const edge2 = createDummyEdge('e2', 'A', 'C');
    const edge3 = createDummyEdge('e3', 'B', 'C');

    const canonicalNodes = [nodeA, nodeB, nodeC].sort((a, b) => a.id.localeCompare(b.id));
    const canonicalEdges = [edge1, edge2, edge3].sort((a, b) => a.id.localeCompare(b.id));

    const baseIndex = createLayoutGraphIndex(canonicalNodes, canonicalEdges);

    // Shuffle 10 times and re-sort via Stage 0 rule
    for (let i = 0; i < 10; i++) {
      const shuffledNodes = [...canonicalNodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...canonicalEdges].sort(() => Math.random() - 0.5);

      // Stage 0 normalization sort
      shuffledNodes.sort((a, b) => a.id.localeCompare(b.id));
      shuffledEdges.sort((a, b) => a.id.localeCompare(b.id));

      const testIndex = createLayoutGraphIndex(shuffledNodes, shuffledEdges);

      expect(Array.from(testIndex.nodeById.keys())).toEqual(Array.from(baseIndex.nodeById.keys()));
      expect(Array.from(testIndex.incidentNeighborsByNode.get('A')!)).toEqual(
        Array.from(baseIndex.incidentNeighborsByNode.get('A')!)
      );
      expect(Array.from(testIndex.incidentEdgesByNode.get('A')!).map(e => e.id)).toEqual(
        Array.from(baseIndex.incidentEdgesByNode.get('A')!).map(e => e.id)
      );
    }
  });

  it('enforces runtime immutability on returned arrays', () => {
    const nodeA = createDummyNode('A');
    const nodeB = createDummyNode('B');
    const edge1 = createDummyEdge('e1', 'A', 'B');

    const index = createLayoutGraphIndex([nodeA, nodeB], [edge1]);

    const incidentEdges = index.incidentEdgesByNode.get('A')!;
    const incidentNeighbors = index.incidentNeighborsByNode.get('A')!;

    expect(Object.isFrozen(incidentEdges)).toBe(true);
    expect(Object.isFrozen(incidentNeighbors)).toBe(true);

    expect(() => {
      (incidentEdges as any).push(createDummyEdge('e2', 'A', 'B'));
    }).toThrow();

    expect(() => {
      (incidentNeighbors as any).push('C');
    }).toThrow();
  });
});

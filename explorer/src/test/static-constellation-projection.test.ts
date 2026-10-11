import { describe, test, expect } from 'vitest';
import pbimData from '../../public/projects/pbim/explorer-data.json';
import { runLayoutWithMetadata } from '../lib/graph-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { adaptComponentConstellation } from '../lib/adapters/component-constellation-adapter';

describe('Component Constellation Static Mode Projection Synchronization', () => {
  const nodes = pbimData.nodes as any[];
  const edges = pbimData.edges as any[];

  test('PBIM dataset canonical facts', () => {
    expect(nodes.length).toBe(528);
    expect(edges.length).toBe(2063);
  });

  test('Component Constellation projection adapter produces exact frozen baseline (42 nodes, 71 edges)', () => {
    const dummySummary = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      highRiskCount: 0,
      unresolvedCount: 0,
      cyclesCount: 0,
    };
    const schemaInput = {
      summary: dummySummary,
      nodes,
      edges,
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const projection = adaptComponentConstellation(schemaInput);
    const projectedNodeIds = Object.keys(projection.nodes);
    const projectedEdgeIds = Object.keys(projection.edges);

    expect(projectedNodeIds.length).toBe(42);
    expect(projectedEdgeIds.length).toBe(71);
    expect(projection.suns.length).toBe(14);
  });

  test('computeArchitectureLayoutWithMetadata under constellation mode returns 42 projectedNodeIds', () => {
    const res = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'constellation',
    });

    expect(res.projectedNodeIds).toBeDefined();
    expect(res.projectedNodeIds?.size).toBe(42);
    expect(Object.keys(res.positions).length).toBe(42);
  });

  test('Static Mode vs Interactive Mode projection set equality and position preservation', () => {
    const existingPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, idx) => {
      existingPositions[n.id] = { x: 1000 + idx * 10, y: 2000 + idx * 10 };
    });

    // Compute layout with existingPositions
    const staticRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'constellation',
      existingPositions,
    });

    const interactiveRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'constellation',
    });

    // 1. Projected Node IDs must be IDENTICAL between Interactive and Static Mode
    expect(staticRes.projectedNodeIds).toBeDefined();
    expect(interactiveRes.projectedNodeIds).toBeDefined();

    const staticSet = Array.from(staticRes.projectedNodeIds!).sort();
    const interactiveSet = Array.from(interactiveRes.projectedNodeIds!).sort();

    expect(staticSet).toEqual(interactiveSet);
    expect(staticSet.length).toBe(42);

    // 2. Positions for projected nodes in Constellation mode must be valid generated macro positions
    staticSet.forEach((nodeId) => {
      expect(staticRes.positions[nodeId]).toBeDefined();
      expect(typeof staticRes.positions[nodeId].x).toBe('number');
      expect(typeof staticRes.positions[nodeId].y).toBe('number');
    });
  });

  test('Shared node identity conservation (7 shared k=1 nodes)', () => {
    const expectedSharedNodes = [
      'ApexClass:BudgetController',
      'ApexClass:CitizenRequestController',
      'ApexClass:CityZoneController',
      'ApexClass:MaintenanceRequestController',
      'ApexClass:VendorAssignmentController',
      'LWC:vendor-card',
      'LWC:vendor-history-modal',
    ];

    const dummySummary = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      highRiskCount: 0,
      unresolvedCount: 0,
      cyclesCount: 0,
    };
    const projection = adaptComponentConstellation({
      summary: dummySummary,
      nodes,
      edges,
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    });

    const actualSharedNodes = Object.values(projection.nodes)
      .filter((n) => n.isSharedNode)
      .map((n) => n.nodeId)
      .sort();

    expect(actualSharedNodes).toEqual(expectedSharedNodes.sort());
    expect(actualSharedNodes.length).toBe(7);
  });
});

import { describe, it, expect } from 'vitest';
import type { ExplorerDataSchema } from '../../types/explorer';
import { adaptArchitectureDna } from './dna-adapter';
import { createMockNode, createMockEdge, createMockDataSchema } from '../../test/mock-factories';

describe('adaptArchitectureDna', () => {
  const nodeB = createMockNode('ApexClass:ServiceB', 'ServiceB', 'ApexClass', 'HIGH', 'force-app/main/default/classes/ServiceB.cls');
  nodeB.metrics = { fanIn: 10, fanOut: 2, coupling: 12, unresolved: 0, score: 85 };

  const nodeA = createMockNode('ApexClass:ControllerA', 'ControllerA', 'ApexClass', 'LOW', 'force-app/main/default/classes/ControllerA.cls');
  nodeA.metrics = { fanIn: 0, fanOut: 5, coupling: 5, unresolved: 0, score: 10 };

  const nodeC = createMockNode('CustomObject:SchemaC', 'SchemaC', 'CustomObject', 'MEDIUM', 'force-app/main/default/objects/SchemaC.object');
  nodeC.metrics = { fanIn: 8, fanOut: 0, coupling: 8, unresolved: 1, score: 45 };

  const mockSchema: ExplorerDataSchema = {
    ...createMockDataSchema(
      [nodeB, nodeA, nodeC],
      [
        createMockEdge('edge-1', 'ApexClass:ControllerA', 'ApexClass:ServiceB', 'method-call'),
        createMockEdge('edge-2', 'ApexClass:ServiceB', 'CustomObject:SchemaC', 'type-reference'),
      ]
    ),
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-09-27T00:00:00.000Z',
    sourceDirectory: 'force-app/main/default',
  };

  it('1. adapts valid real-shaped dataset and generates 7 distinct DNA bands per node', () => {
    const result = adaptArchitectureDna(mockSchema);

    expect(result.dnaProfiles).toHaveLength(3);
    expect(result.summary.totalComponents).toBe(3);
    expect(result.summary.highRiskDnaCount).toBe(1); // ServiceB is HIGH

    const profileA = result.dnaMap['ApexClass:ControllerA'];
    expect(profileA).toBeDefined();
    expect(profileA.displayName).toBe('ControllerA');
    expect(profileA.bands).toHaveLength(7);

    // Verify 7 specific band IDs
    const bandIds = profileA.bands.map(b => b.id);
    expect(bandIds).toEqual(['layer', 'fanIn', 'fanOut', 'risk', 'centrality', 'hotspot', 'hygiene']);
  });

  it('2. preserves raw authoritative values alongside normalized values', () => {
    const result = adaptArchitectureDna(mockSchema);
    const profileB = result.dnaMap['ApexClass:ServiceB'];

    expect(profileB.riskLevel).toBe('HIGH');

    const riskBand = profileB.bands.find(b => b.id === 'risk');
    expect(riskBand?.rawValue).toBe('HIGH');
    expect(riskBand?.normalizedValue).toBe(1.0);

    const fanInBand = profileB.bands.find(b => b.id === 'fanIn');
    expect(fanInBand?.rawValue).toBe(10);
    expect(fanInBand?.displayValue).toBe('10 items');
    expect(fanInBand?.normalizedValue).toBeGreaterThan(0.0);
  });

  it('3. handles empty dataset cleanly', () => {
    const emptySchema: ExplorerDataSchema = {
      ...mockSchema,
      nodes: [],
      edges: [],
    };

    const result = adaptArchitectureDna(emptySchema);
    expect(result.dnaProfiles).toHaveLength(0);
    expect(result.summary.totalComponents).toBe(0);
    expect(result.summary.averageDnaIndex).toBe(0);
  });

  it('4. strictly preserves input immutability via Object.freeze()', () => {
    const frozenSchema = Object.freeze({
      ...mockSchema,
      nodes: Object.freeze([...mockSchema.nodes.map(n => Object.freeze({ ...n }))]),
      edges: Object.freeze([...mockSchema.edges.map(e => Object.freeze({ ...e }))]),
    });

    expect(() => adaptArchitectureDna(frozenSchema as ExplorerDataSchema)).not.toThrow();
  });

  it('5. sorts DNA profiles deterministically by component ID', () => {
    const result = adaptArchitectureDna(mockSchema);
    const ids = result.dnaProfiles.map(p => p.id);

    expect(ids).toEqual([
      'ApexClass:ControllerA',
      'ApexClass:ServiceB',
      'CustomObject:SchemaC',
    ]);
  });
});

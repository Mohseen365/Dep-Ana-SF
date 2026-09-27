import { describe, it, expect } from 'vitest';
import type { ExplorerDataSchema } from '../../types/explorer';
import { adaptArchitectureDna } from './dna-adapter';

describe('adaptArchitectureDna', () => {
  const mockSchema: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-09-27T00:00:00.000Z',
    sourceDirectory: 'force-app/main/default',
    project: {
      id: 'test-project',
      name: 'Test Project',
      description: 'Test Dataset',
      sourcePath: 'force-app/main/default',
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      lastAnalyzedAt: '2026-09-27T00:00:00.000Z',
      analysisStatus: 'COMPLETE',
      componentCount: 3,
      dependencyCount: 2,
    },
    nodes: [
      {
        id: 'ApexClass:ServiceB',
        name: 'ServiceB',
        displayName: 'ServiceB',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/ServiceB.cls',
        layer: 'domain',
        domain: 'DomainB',
        risk: 'HIGH',
        metrics: { fanIn: 10, fanOut: 2, coupling: 12, unresolved: 0, score: 85 },
        refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false },
      },
      {
        id: 'ApexClass:ControllerA',
        name: 'ControllerA',
        displayName: 'ControllerA',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/ControllerA.cls',
        layer: 'presentation',
        domain: 'DomainA',
        risk: 'LOW',
        metrics: { fanIn: 0, fanOut: 5, coupling: 5, unresolved: 0, score: 10 },
      },
      {
        id: 'CustomObject:SchemaC',
        name: 'SchemaC',
        displayName: 'SchemaC',
        type: 'CustomObject',
        file: 'force-app/main/default/objects/SchemaC.object',
        layer: 'schema',
        domain: 'DomainC',
        risk: 'MEDIUM',
        metrics: { fanIn: 8, fanOut: 0, coupling: 8, unresolved: 1, score: 45 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: true },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'ApexClass:ControllerA',
        target: 'ApexClass:ServiceB',
        type: 'calls',
      },
      {
        id: 'edge-2',
        source: 'ApexClass:ServiceB',
        target: 'CustomObject:SchemaC',
        type: 'references',
      },
    ],
    cycles: [],
    impactSummaries: {},
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

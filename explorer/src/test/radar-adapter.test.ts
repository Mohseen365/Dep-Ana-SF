// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { adaptRadarDimensions, RadarData } from '../lib/adapters/radar-adapter';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { calculateArchitectureHealth } from '../lib/health';
import { getArchitecturalHotspots } from '../lib/hotspots';

function loadCanonicalFixture(): ExplorerDataSchema {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw) as ExplorerDataSchema;
}

describe('Radar Adapter (`explorer/src/lib/adapters/radar-adapter.ts`)', () => {
  // Test A: Real project graph conversion
  it('Test A: converts valid canonical Cloud Spend Tracker fixture into valid RadarData', () => {
    const fixture = loadCanonicalFixture();
    const result: RadarData = adaptRadarDimensions(fixture);

    expect(result).toBeDefined();
    expect(result.dimensions.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.missingPrimitives).toBeDefined();

    expect(result.summary.totalComponents).toBe(fixture.nodes.length);
    expect(result.summary.totalDependencies).toBe(fixture.edges.length);
    expect(result.summary.architectureHealthScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.architectureHealthScore).toBeLessThanOrEqual(100);
  });

  // Test B: Dimension provenance
  it('Test B: maps dimensions cleanly to authoritative source metrics', () => {
    const fixture = loadCanonicalFixture();
    const result = adaptRadarDimensions(fixture);

    const healthMetric = calculateArchitectureHealth(fixture);
    const hotspotMetric = getArchitecturalHotspots(fixture.nodes, fixture.cycles || []);

    const healthDim = result.dimensions.find(d => d.id === 'architecture_health');
    expect(healthDim?.value).toBe(healthMetric.score);
    expect(healthDim?.sourceMetric).toContain('calculateArchitectureHealth');

    const riskDim = result.dimensions.find(d => d.id === 'risk_exposure');
    expect(riskDim?.value).toBe(healthMetric.riskPercent);

    const hotspotDim = result.dimensions.find(d => d.id === 'architectural_hotspots');
    expect(hotspotDim?.value).toBe(hotspotMetric.topRanked.length);

    const cycleDim = result.dimensions.find(d => d.id === 'circular_dependencies');
    expect(cycleDim?.value).toBe(fixture.cycles.length);
  });

  // Test C: No invented scoring
  it('Test C: does NOT invent unbacked scoring algorithms and explicitly documents missing primitives', () => {
    const fixture = loadCanonicalFixture();
    const result = adaptRadarDimensions(fixture);

    // Verify that dimensions without authoritative scores have hasAuthoritativeScore === false
    const cycleDim = result.dimensions.find(d => d.id === 'circular_dependencies');
    expect(cycleDim?.hasAuthoritativeScore).toBe(false);
    expect(cycleDim?.unit).toBe('count');

    // Missing primitives must explicitly record unbacked radar concepts
    expect(result.missingPrimitives.map(m => m.dimension)).toEqual(
      expect.arrayContaining(['Layer Purity Score', 'Dependency Health Index', 'Test Coverage Score'])
    );
  });

  // Test D: Stable dimension identities & ordering
  it('Test D: produces stable dimension identities and ordering', () => {
    const fixture = loadCanonicalFixture();
    const run1 = adaptRadarDimensions(fixture);
    const run2 = adaptRadarDimensions(fixture);

    const ids1 = run1.dimensions.map(d => d.id);
    const ids2 = run2.dimensions.map(d => d.id);

    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual([
      'architecture_health',
      'risk_exposure',
      'circular_dependencies',
      'unresolved_references',
      'architectural_hotspots',
      'high_risk_components',
      'medium_risk_components',
      'total_components',
      'total_dependencies'
    ]);
  });

  // Test E: Input-order invariance
  it('Test E: yields 100% identical radar data regardless of input node/edge array order', () => {
    const fixture = loadCanonicalFixture();

    const normal = adaptRadarDimensions(fixture);

    const reversedFixture: ExplorerDataSchema = {
      ...fixture,
      nodes: [...fixture.nodes].reverse(),
      edges: [...fixture.edges].reverse(),
      cycles: [...(fixture.cycles || [])].reverse()
    };

    const reversed = adaptRadarDimensions(reversedFixture);

    expect(JSON.stringify(normal)).toBe(JSON.stringify(reversed));
  });

  // Test F: Empty / minimal graph
  it('Test F: handles empty and minimal graph inputs gracefully', () => {
    const emptyGraph: ExplorerDataSchema = {
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: 0, apexClasses: 0, apexTriggers: 0, lwcJs: 0, lwcHtml: 0,
          visualforce: 0, flows: 0, objects: 0, fields: 0
        }
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {}
    };

    const result = adaptRadarDimensions(emptyGraph);

    expect(result.summary.totalComponents).toBe(0);
    expect(result.summary.architectureHealthScore).toBe(100);
    expect(result.summary.healthLevel).toBe('GOOD');
  });

  // Test G: Input immutability
  it('Test G: respects absolute input immutability when input is Object.freeze()-ed', () => {
    const fixture = loadCanonicalFixture();

    const frozenFixture: ExplorerDataSchema = Object.freeze({
      ...fixture,
      nodes: Object.freeze(fixture.nodes.map(n => Object.freeze({ ...n }))) as unknown as ExplorerNode[],
      edges: Object.freeze(fixture.edges.map(e => Object.freeze({ ...e }))) as unknown as ExplorerEdge[],
      cycles: Object.freeze((fixture.cycles || []).map(c => Object.freeze({ ...c }))) as unknown as any[]
    });

    expect(() => adaptRadarDimensions(frozenFixture)).not.toThrow();
  });

  // Test H: 10x repeated execution determinism
  it('Test H: produces 100% bit-for-bit identical stringified output across 10x repeated calls', () => {
    const fixture = loadCanonicalFixture();

    const baseline = JSON.stringify(adaptRadarDimensions(fixture));

    for (let i = 0; i < 10; i++) {
      const current = JSON.stringify(adaptRadarDimensions(fixture));
      expect(current).toBe(baseline);
    }
  });

  // Test I: Runtime independence
  it('Test I: has zero runtime dependencies on window, document, Cytoscape, or React', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');

    const fixture = loadCanonicalFixture();
    const result = adaptRadarDimensions(fixture);

    expect(result).toBeDefined();
  });
});

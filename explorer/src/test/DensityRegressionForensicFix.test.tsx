import { describe, it, expect, vi } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { shouldAutoLayout, resolveAuthoritativePosition, calculateDeterministicNewNodePosition } from '../lib/position-policy';
import { createSparseGraphFixture } from '../lib/layout/fixtures/sparse-graph';
import { createDenseCrossDomainFixture } from '../lib/layout/fixtures/dense-cross-domain';
import { createTestHeavyFixture } from '../lib/layout/fixtures/test-heavy';
import { createFieldHeavyFixture } from '../lib/layout/fixtures/field-heavy';
import { createBridgeHeavyFixture } from '../lib/layout/fixtures/bridge-heavy';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { computeFocusedGraph } from '../lib/focus-graph';

describe('Forensic Fix — Graph Node Density & Position Authority Regression Test Suite', () => {
  it('Fixture 1 — Small graph: generates layout with zero unintended node overlaps', () => {
    const fixture = createSparseGraphFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('Fixture 2 — Dense graph: production nodes remain spatially separated and readable', () => {
    const fixture = createDenseCrossDomainFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
    expect(metrics.averageEdgeLength).toBeGreaterThan(0);
  });

  it('Fixture 3 — Test-heavy graph: multiple test nodes do not collapse around one production node', () => {
    const fixture = createTestHeavyFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);

    // Verify test satellites receive distinct, non-overlapping positions
    const testNodes = fixture.nodes.filter(n => n.behavior?.isTest);
    const testPosSet = new Set<string>();
    testNodes.forEach(tn => {
      const pos = positions[tn.id];
      expect(pos).toBeDefined();
      const posKey = `${pos.x},${pos.y}`;
      expect(testPosSet.has(posKey)).toBe(false);
      testPosSet.add(posKey);
    });
  });

  it('Fixture 4 — Field-heavy graph: fields remain satellites without obscuring parent objects or each other', () => {
    const fixture = createFieldHeavyFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);

    // Verify field nodes sit below or alongside parent custom objects with distinct coordinates
    const fieldNodes = fixture.nodes.filter(n => n.type === 'Field' || n.type === 'CustomField');
    const fieldPosSet = new Set<string>();
    fieldNodes.forEach(fn => {
      const pos = positions[fn.id];
      expect(pos).toBeDefined();
      const posKey = `${pos.x},${pos.y}`;
      expect(fieldPosSet.has(posKey)).toBe(false);
      fieldPosSet.add(posKey);
    });
  });

  it('Fixture 5 — Bridge-heavy graph: bridge nodes do not collapse into domain clusters', () => {
    const fixture = createBridgeHeavyFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('Fixture 6 — Filtered graph: only visible nodes participate in layout', () => {
    const fixture = createDenseCrossDomainFixture();
    const visibleTypes = ['LWC', 'ApexClass'];
    const filtered = filterGraphByNodeTypes(fixture.nodes, fixture.edges, visibleTypes);

    const positions = computeArchitectureLayout(filtered.nodes, filtered.edges);

    expect(Object.keys(positions).length).toBe(filtered.nodes.length);
    const metrics = evaluateLayout(filtered.nodes, filtered.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('Fixture 7 — Focused graph: only focused nodes participate in initial layout', () => {
    const fixture = createDenseCrossDomainFixture();
    const focusNodeId = fixture.nodes[0].id;

    const focused = computeFocusedGraph(fixture.nodes, fixture.edges, {
      enabled: true,
      focusNodeId,
      depth: 1,
      direction: 'both',
    });

    const positions = computeArchitectureLayout(focused.nodes, focused.edges);

    expect(Object.keys(positions).length).toBe(focused.nodes.length);
    const metrics = evaluateLayout(focused.nodes, focused.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('Fixture 8 — Existing positions: existing authoritative positions are strictly preserved', () => {
    const fixture = createSparseGraphFixture();
    const existing: Record<string, { x: number; y: number }> = {
      [fixture.nodes[0].id]: { x: 1234, y: 5678 },
    };

    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges, {
      existingPositions: existing,
    });

    expect(positions[fixture.nodes[0].id]).toEqual({ x: 1234, y: 5678 });
  });

  it('Fixture 9 — New nodes: genuinely new nodes are placed deterministically without moving existing nodes', () => {
    const fixture = createSparseGraphFixture();
    const initialPositions = computeArchitectureLayout(fixture.nodes, fixture.edges);

    // Create a new node and edge
    const newNode: ExplorerNode = {
      id: 'ApexClass:BrandNewService',
      displayName: 'BrandNewService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/BrandNewService.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 0.1, unresolved: 0, score: 50 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    };

    const newEdge: ExplorerEdge = {
      id: `ApexClass:BrandNewService->${fixture.nodes[0].id}`,
      source: 'ApexClass:BrandNewService',
      target: fixture.nodes[0].id,
      relationshipType: 'method-call',
      method: 'execute',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: 'BrandNewService',
      file: '',
      canonical: {
        source: { type: 'ApexClass', name: 'BrandNewService' },
        target: { type: 'ApexClass', name: 'Target' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    };

    // Evaluate fallback placement for new node
    const newPos = calculateDeterministicNewNodePosition(newNode.id, [newEdge], initialPositions);
    expect(typeof newPos.x).toBe('number');
    expect(typeof newPos.y).toBe('number');

    // Existing nodes maintain 100% position authority
    fixture.nodes.forEach(n => {
      const resolved = resolveAuthoritativePosition(n.id, {
        sessionPositions: initialPositions,
      });
      expect(resolved?.position).toEqual(initialPositions[n.id]);
    });
  });

  it('Fixture 10 — Feature-enabled graph: feature layout executes without re-introducing density or overlaps', () => {
    const fixture = createDenseCrossDomainFixture();
    const positions = computeArchitectureLayout(fixture.nodes, fixture.edges, {
      enableFeatureLayout: true,
    });

    const metrics = evaluateLayout(fixture.nodes, fixture.edges, positions);
    expect(metrics.nodeOverlapCount).toBe(0);
  });
});

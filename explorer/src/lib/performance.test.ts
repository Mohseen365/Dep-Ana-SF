import { describe, it, expect } from 'vitest';
import { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { buildGraphElements } from './graph-builder';
import { applyFilters } from './search-filter';
import { computeFocusedGraph } from './focus-graph';
import { calculateArchitectureHealth } from './health';
import { computeArchitectureLayout } from './architecture-layout';

function generateTestGraph(nodeCount: number, edgeDensityRatio: number = 1.5) {
  const nodes: ExplorerNode[] = [];
  const edges: ExplorerEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const id = `ApexClass:Component_${i}`;
    const risk = i % 10 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW';
    nodes.push({
      id,
      displayName: `Component_${i}`,
      type: 'ApexClass',
      file: `force-app/main/default/classes/Component_${i}.cls`,
      metrics: {
        fanIn: Math.floor(i % 8),
        fanOut: Math.floor(i % 5),
        coupling: Math.floor(i % 8) + Math.floor(i % 5),
        unresolved: i % 20 === 0 ? 1 : 0,
        score: risk === 'HIGH' ? 12 : risk === 'MEDIUM' ? 5 : 1
      },
      risk,
      riskReasons: risk === 'HIGH' ? ['high risk'] : [],
      behavior: {
        isTest: i % 5 === 0,
        publicContractsCount: 2,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: risk === 'HIGH',
        hasCycles: i % 15 === 0,
        hasUnresolved: i % 20 === 0,
        testCoverageStatus: 'COVERED'
      }
    });
  }

  const edgeCount = Math.floor(nodeCount * edgeDensityRatio);
  for (let e = 0; e < edgeCount; e++) {
    const srcIndex = e % nodeCount;
    const tgtIndex = (e * 7 + 1) % nodeCount;
    if (srcIndex !== tgtIndex) {
      const src = nodes[srcIndex].id;
      const tgt = nodes[tgtIndex].id;
      edges.push({
        id: `${src}|${tgt}|method-call|${e}`,
        source: src,
        target: tgt,
        relationshipType: 'method-call',
        method: 'doWork',
        evidence: 'doWork()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 10,
        column: 5,
        methodOwner: 'execute',
        file: nodes[srcIndex].file,
        canonical: {
          source: { type: 'ApexClass', name: nodes[srcIndex].displayName, method: 'execute' },
          target: { type: 'ApexClass', name: nodes[tgtIndex].displayName, method: 'doWork' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 10, column: 5 }
        }
      });
    }
  }

  return { nodes, edges };
}

describe('Large Graph Performance Benchmarks', () => {
  const nodeCounts = [100, 500, 1000, 5000];

  nodeCounts.forEach(count => {
    it(`handles ${count} nodes dataset operations cleanly`, () => {
      const { nodes, edges } = generateTestGraph(count);

      // 1. Element creation timing
      const t0 = performance.now();
      const elements = buildGraphElements(nodes, edges);
      const t1 = performance.now();
      expect(elements.length).toBeGreaterThan(count);
      expect(t1 - t0).toBeLessThan(1000); // Must complete under 1 sec

      // 2. Filter application timing
      const t2 = performance.now();
      const filtered = applyFilters(nodes, edges, { searchQuery: 'Component_5', typeFilter: '', riskFilter: '' });
      const t3 = performance.now();
      expect(filtered.nodes.length).toBeGreaterThan(0);
      expect(t3 - t2).toBeLessThan(500);

      // 3. Focus calculation timing
      const t4 = performance.now();
      const focused = computeFocusedGraph(nodes, edges, {
        enabled: true,
        focusNodeId: nodes[0].id,
        direction: 'both',
        depth: 2
      });
      const t5 = performance.now();
      expect(focused.nodes.length).toBeGreaterThan(0);
      expect(t5 - t4).toBeLessThan(500);

      // 4. Architecture health timing
      const mockSchema: ExplorerDataSchema = {
        schemaVersion: '1.0.0',
        analyzerVersion: '13.0.0',
        generatedAt: new Date().toISOString(),
        sourceDirectory: 'force-app/main/default',
        summary: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          highRiskCount: nodes.filter(n => n.risk === 'HIGH').length,
          mediumRiskCount: nodes.filter(n => n.risk === 'MEDIUM').length,
          lowRiskCount: nodes.filter(n => n.risk === 'LOW').length,
          cycleCount: 2,
          unresolvedCount: 5,
          inventory: { files: count, apexClasses: count, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 }
        },
        nodes,
        edges,
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {}
      };

      const t6 = performance.now();
      const health = calculateArchitectureHealth(mockSchema);
      const t7 = performance.now();
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(t7 - t6).toBeLessThan(200);
    });
  });
});

describe('Architecture Layout Scalability Benchmarks (Wave 8C)', () => {
  const layoutScales = [
    { count: 100, maxDurationMs: 500 },
    { count: 250, maxDurationMs: 1000 },
    { count: 500, maxDurationMs: 2000 },
    { count: 750, maxDurationMs: 3000 },
    { count: 1000, maxDurationMs: 5000 },
  ];

  layoutScales.forEach(({ count, maxDurationMs }) => {
    it(`computes architecture layout for ${count} nodes under ${maxDurationMs}ms threshold`, () => {
      const { nodes, edges } = generateTestGraph(count);

      // Warm-up run
      computeArchitectureLayout(nodes, edges);

      // Multiple sample runs for environment stability
      const samples: number[] = [];
      let lastPositions = {};

      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        lastPositions = computeArchitectureLayout(nodes, edges);
        const end = performance.now();
        samples.push(end - start);
      }

      samples.sort((a, b) => a - b);
      const medianDuration = samples[1];

      // 1. All nodes receive finite positions
      expect(Object.keys(lastPositions).length).toBe(count);
      for (const pos of Object.values(lastPositions) as { x: number; y: number }[]) {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }

      // 2. Performance expectation bound check (prevents CI flakiness via median sampling)
      expect(medianDuration).toBeLessThan(maxDurationMs);
    });
  });
});

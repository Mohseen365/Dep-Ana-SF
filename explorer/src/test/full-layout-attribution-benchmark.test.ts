import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { calculateLayoutMetrics } from '../lib/layout/metrics';

const EXPECTED_CST_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';
const RESULTS_JSON_PATH = path.resolve(__dirname, 'full-layout-attribution-results.json');

describe('Full Layout Stage-by-Stage Runtime Attribution Benchmark', () => {
  it('1. verifies canonical CST fixture SHA-256 and topology', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const fileBuffer = fs.readFileSync(cstPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    expect(hash).toBe(EXPECTED_CST_HASH);

    const data = JSON.parse(fileBuffer.toString('utf-8'));
    expect(data.nodes.length).toBe(240);
    expect(data.edges.length).toBe(1024);
  });

  it('2. verifies benchmark telemetry dataset contains all 5 scale tiers for both modes', () => {
    expect(fs.existsSync(RESULTS_JSON_PATH)).toBe(true);
    const results = JSON.parse(fs.readFileSync(RESULTS_JSON_PATH, 'utf-8'));

    expect(results.activeFeatureMode).toHaveLength(5);
    expect(results.prodDefaultMode).toHaveLength(5);

    const activeTiers = results.activeFeatureMode.map((t: any) => t.tier);
    expect(activeTiers).toContain('Tier 1 (240N)');
    expect(activeTiers).toContain('Tier 2 (500N)');
    expect(activeTiers).toContain('Tier 3 (1,000N)');
    expect(activeTiers).toContain('Tier 4 (2,000N)');
    expect(activeTiers).toContain('Tier 5 (5,000N)');

    for (const record of results.activeFeatureMode) {
      expect(record.cold.fullDurationMs).toBeGreaterThan(0);
      expect(record.cold.coveragePercent).toBeGreaterThanOrEqual(99.0);
      expect(record.warm.fullDurationMs).toBeGreaterThan(0);
      expect(record.warm.coveragePercent).toBeGreaterThanOrEqual(99.0);
      for (let i = 0; i <= 12; i++) {
        expect(record.cold.stageTimesMs[`Stage ${i}`]).toBeDefined();
        expect(record.warm.stageTimesMs[`Stage ${i}`]).toBeDefined();
      }
    }
  });

  it('3. verifies top stage internal decomposition and instrumentation overhead', () => {
    const results = JSON.parse(fs.readFileSync(RESULTS_JSON_PATH, 'utf-8'));
    expect(results.topStageDecomposition['Tier 1 (240N)']).toBeDefined();
    expect(results.measurementOverhead['Tier 1 (240N)']).toBeDefined();

    const overhead = results.measurementOverhead['Tier 1 (240N)'];
    expect(overhead.overheadRatio).toBeLessThan(1.05); // Less than 1% overhead
  });

  it('4. verifies correctness invariants and determinism on CST', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
    const cstNodes = cstData.nodes as ExplorerNode[];
    const cstEdges = cstData.edges as ExplorerEdge[];

    const layoutResult1 = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, { enableFeatureLayout: true });
    const metrics1 = calculateLayoutMetrics(cstNodes, cstEdges, layoutResult1.positions, { nodeWidth: 120, nodeHeight: 60 });

    // 10x repetition determinism
    let max10xDrift = 0;
    for (let r = 0; r < 10; r++) {
      const rep = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, { enableFeatureLayout: true });
      for (const [id, pos] of Object.entries(layoutResult1.positions)) {
        const dX = Math.abs(pos.x - rep.positions[id].x);
        const dY = Math.abs(pos.y - rep.positions[id].y);
        if (dX > max10xDrift) max10xDrift = dX;
        if (dY > max10xDrift) max10xDrift = dY;
      }
    }

    // 5x shuffled input order invariance
    let maxShuffledDrift = 0;
    for (let s = 0; s < 5; s++) {
      const shufNodes = [...cstNodes].sort(() => Math.random() - 0.5);
      const shufEdges = [...cstEdges].sort(() => Math.random() - 0.5);
      const shufResult = computeArchitectureLayoutWithMetadata(shufNodes, shufEdges, { enableFeatureLayout: true });

      for (const [id, pos] of Object.entries(layoutResult1.positions)) {
        const dX = Math.abs(pos.x - shufResult.positions[id].x);
        const dY = Math.abs(pos.y - shufResult.positions[id].y);
        if (dX > maxShuffledDrift) maxShuffledDrift = dX;
        if (dY > maxShuffledDrift) maxShuffledDrift = dY;
      }
    }

    // Compute bounding width
    let minX = Infinity, maxX = -Infinity;
    for (const pos of Object.values(layoutResult1.positions)) {
      if (pos.x - 60 < minX) minX = pos.x - 60;
      if (pos.x + 60 > maxX) maxX = pos.x + 60;
    }
    const hybridWidth = maxX - minX;

    expect(metrics1.detailedCrossings?.primaryPrimaryCrossings).toBeGreaterThan(7000);
    expect(metrics1.detailedCrossings?.primaryPrimaryCrossings).toBeLessThan(8500);
    expect(metrics1.edgeCrossingCount).toBeGreaterThan(75000);
    expect(metrics1.edgeCrossingCount).toBeLessThan(95000);
    expect(metrics1.minClearance).toBeGreaterThanOrEqual(39.999);
    expect(metrics1.primaryOverlapCount).toBe(0);
    expect(metrics1.satelliteOverlapCount).toBe(0);
    expect(metrics1.layerViolationCount).toBe(0);
    expect(Math.abs(hybridWidth - 3299.74)).toBeLessThan(10.0);
    expect(max10xDrift).toBe(0);
    expect(maxShuffledDrift).toBe(0);
  });
});

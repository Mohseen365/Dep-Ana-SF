import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { measurePipelineStageMetrics } from './pipeline-stage-diagnostics';
import { computeArchitectureLayout } from '../architecture-layout';

describe('Stage Instrumentation & Metric Conservation Test Suite', () => {
  const fixturePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('verifies stage metric consistency and primary crossing conservation from Stage 8 to Stage 11', () => {
    const result = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    expect(result.snapshots['Stage 5']).toBeDefined();
    expect(result.snapshots['Stage 7']).toBeDefined();
    expect(result.snapshots['Stage 8']).toBeDefined();
    expect(result.snapshots['Stage 9']).toBeDefined();
    expect(result.snapshots['Stage 10']).toBeDefined();
    expect(result.snapshots['Stage 11']).toBeDefined();

    const stage8PrimaryCrossings = result.snapshots['Stage 8'].metrics.detailedCrossings?.primaryPrimaryCrossings;
    const stage9PrimaryCrossings = result.snapshots['Stage 9'].metrics.detailedCrossings?.primaryPrimaryCrossings;
    const stage11PrimaryCrossings = result.snapshots['Stage 11'].metrics.detailedCrossings?.primaryPrimaryCrossings;

    expect(stage8PrimaryCrossings).toBeGreaterThan(0);
    expect(stage9PrimaryCrossings).toBe(stage8PrimaryCrossings);
    expect(Math.abs((stage11PrimaryCrossings ?? 0) - (stage8PrimaryCrossings ?? 0))).toBeLessThanOrEqual(20);
  });

  it('verifies 3x determinism and zero coordinate drift across repeated stage executions', { timeout: 20000 }, () => {
    const run1 = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    for (let i = 0; i < 3; i++) {
      const runN = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

      ['Stage 5', 'Stage 7', 'Stage 8', 'Stage 9', 'Stage 11'].forEach(stg => {
        const pos1 = run1.snapshots[stg].positions;
        const posN = runN.snapshots[stg].positions;

        expect(Object.keys(posN).length).toBe(Object.keys(pos1).length);

        for (const [id, p1] of Object.entries(pos1)) {
          const pN = posN[id];
          expect(pN).toBeDefined();
          const dx = Math.abs(pN.x - p1.x);
          const dy = Math.abs(pN.y - p1.y);
          expect(dx).toBeLessThan(1e-5);
          expect(dy).toBeLessThan(1e-5);
        }
      });
    }
  });

  it('verifies shuffled input order produces identical stage metrics', () => {
    const baseline = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    const shuffledNodes = [...data.nodes].sort(() => Math.random() - 0.5);
    const shuffledEdges = [...data.edges].sort(() => Math.random() - 0.5);

    const shuffledResult = measurePipelineStageMetrics(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });

    ['Stage 5', 'Stage 7', 'Stage 8', 'Stage 9', 'Stage 11'].forEach(stg => {
      const bCrossings = baseline.snapshots[stg].metrics.edgeCrossingCount;
      const sCrossings = shuffledResult.snapshots[stg].metrics.edgeCrossingCount;
      expect(sCrossings).toBe(bCrossings);
    });
  });

  it('verifies stage instrumentation is purely read-only and produces identical output to computeArchitectureLayout', () => {
    const diagnostics = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });
    const directLayout = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: true });

    const stage11Positions = diagnostics.snapshots['Stage 11'].positions;

    expect(Object.keys(stage11Positions).length).toBe(Object.keys(directLayout).length);

    for (const [id, pos] of Object.entries(directLayout)) {
      const diagPos = stage11Positions[id];
      expect(diagPos).toBeDefined();
      expect(Math.abs(diagPos.x - pos.x)).toBeLessThan(1e-5);
      expect(Math.abs(diagPos.y - pos.y)).toBeLessThan(1e-5);
    }
  });
});

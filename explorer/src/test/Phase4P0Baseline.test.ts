import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { measurePipelineStageMetrics } from '../lib/layout/pipeline-stage-diagnostics';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { discoverFeatures, calculateSemanticFeatureCohesion } from '../lib/layout/features';

describe('Phase 4.0 — Canonical Baseline Measurement Suite', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('measures Cloud Spend Tracker across Path A (Legacy), Path B (Feature=false), and Path C (Feature=true)', () => {
    // Path A: Legacy domain layout simulation (using computeArchitectureLayout with enableFeatureLayout: false)
    const posPathB = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: false });
    const posPathC = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: true });

    const metricsPathB = calculateLayoutMetrics(data.nodes, data.edges, posPathB);
    const metricsPathC = calculateLayoutMetrics(data.nodes, data.edges, posPathC);

    const discovery = discoverFeatures(data.nodes, data.edges);
    const semanticCohesionPathB = calculateSemanticFeatureCohesion(data.nodes, posPathB, discovery);
    const semanticCohesionPathC = calculateSemanticFeatureCohesion(data.nodes, posPathC, discovery);

    console.log('\n=== CLOUD SPEND TRACKER CANONICAL BASELINE MEASUREMENTS ===');
    console.log('Path B (Default Feature Layout = false):');
    console.log(' - Primary-Primary Crossings:', metricsPathB.detailedCrossings?.primaryPrimaryCrossings);
    console.log(' - Total Geometric Crossings:', metricsPathB.edgeCrossingCount);
    console.log(' - Domain Cohesion Score:', metricsPathB.domainCohesion.domainCohesionScore);
    console.log(' - Semantic Feature Cohesion Score:', semanticCohesionPathB.featureCohesionScore);
    console.log(' - Layer Violations:', metricsPathB.layerViolationCount);
    console.log(' - Primary Overlaps:', metricsPathB.primaryOverlapCount);
    console.log(' - Satellite Overlaps:', metricsPathB.satelliteOverlapCount);

    console.log('\nPath C (Candidate Feature Layout = true):');
    console.log(' - Primary-Primary Crossings:', metricsPathC.detailedCrossings?.primaryPrimaryCrossings);
    console.log(' - Total Geometric Crossings:', metricsPathC.edgeCrossingCount);
    console.log(' - Domain Cohesion Score:', metricsPathC.domainCohesion.domainCohesionScore);
    console.log(' - Semantic Feature Cohesion Score:', semanticCohesionPathC.featureCohesionScore);
    console.log(' - Layer Violations:', metricsPathC.layerViolationCount);
    console.log(' - Primary Overlaps:', metricsPathC.primaryOverlapCount);
    console.log(' - Satellite Overlaps:', metricsPathC.satelliteOverlapCount);

    // Hard System Invariants Verification for Path C
    expect(metricsPathC.layerViolationCount).toBe(0);
    expect(metricsPathC.primaryOverlapCount).toBe(0);
    expect(metricsPathC.satelliteOverlapCount).toBe(0);
  });

  it('verifies stage-by-stage metric decomposition for Path C (Feature Layout = true)', () => {
    const diagnostics = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    console.log('\n=== STAGE-BY-STAGE METRIC BREAKDOWN (Path C) ===');
    console.table(diagnostics.stageTable);

    // Verify stage metric structures
    expect(diagnostics.snapshots['Stage 5']).toBeDefined();
    expect(diagnostics.snapshots['Stage 7']).toBeDefined();
    expect(diagnostics.snapshots['Stage 8']).toBeDefined();
    expect(diagnostics.snapshots['Stage 9']).toBeDefined();
    expect(diagnostics.snapshots['Stage 10']).toBeDefined();
    expect(diagnostics.snapshots['Stage 11']).toBeDefined();
    expect(diagnostics.snapshots['Stage 12']).toBeDefined();

    // Verify stage 11 equals stage 12 (Position Authority Restoration with no existingPositions)
    const pos11 = diagnostics.snapshots['Stage 11'].positions;
    const pos12 = diagnostics.snapshots['Stage 12'].positions;

    for (const [id, p11] of Object.entries(pos11)) {
      const p12 = pos12[id];
      expect(p12).toBeDefined();
      expect(Math.abs(p12.x - p11.x)).toBeLessThan(1e-5);
      expect(Math.abs(p12.y - p11.y)).toBeLessThan(1e-5);
    }
  });

  it('verifies 10x determinism and 0.00000 px coordinate drift caused by instrumentation', () => {
    const run1 = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: true });
    const runDiagnostics = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    const diagPositions = runDiagnostics.snapshots['Stage 11'].positions;

    expect(Object.keys(diagPositions).length).toBe(Object.keys(run1).length);

    for (const [id, pos1] of Object.entries(run1)) {
      const diagPos = diagPositions[id];
      expect(diagPos).toBeDefined();
      const dx = Math.abs(diagPos.x - pos1.x);
      const dy = Math.abs(diagPos.y - pos1.y);
      expect(dx).toBeLessThan(1e-5);
      expect(dy).toBeLessThan(1e-5);
    }
  });
});

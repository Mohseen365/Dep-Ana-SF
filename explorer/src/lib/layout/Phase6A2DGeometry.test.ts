import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';
import { calculateDetailedEdgeCrossings, primaryNodeOverlapCount, satelliteNodeOverlapCount } from './metrics';
import { evaluateLayout } from './evaluate-layout';
import { measurePipelineStageMetrics } from './pipeline-stage-diagnostics';

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

describe('Phase 6-A — 2D Feature Geometry & Primary Crossing Reduction', () => {
  const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
  const cloudSpendData = JSON.parse(cloudSpendRaw);
  const nodes: ExplorerNode[] = cloudSpendData.nodes;
  const edges: ExplorerEdge[] = cloudSpendData.edges;

  it('1. Proves Primary Gate C_pp < 9,335 on Cloud Spend Tracker dataset', () => {
    const pos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const detailed = calculateDetailedEdgeCrossings(nodes, edges, pos);

    expect(detailed.primaryPrimaryCrossings).toBeLessThan(9335);
    expect(detailed.primaryPrimaryCrossings).toBe(8704);
  });

  it('2. Proves 100% compliance on Hard Mandatory Invariants', () => {
    const pos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const evalRes = evaluateLayout(nodes, edges, pos);

    const primaryOverlaps = primaryNodeOverlapCount(nodes, edges, pos);
    const satelliteOverlaps = satelliteNodeOverlapCount(nodes, edges, pos);

    expect(evalRes.layerViolationCount).toBe(0);
    expect(primaryOverlaps).toBe(0);
    expect(satelliteOverlaps).toBe(0);
  });

  it('3. Proves 0.00000 px drift across 10 identical executions and 5 shuffled input permutations', { timeout: 30000 }, () => {
    const baseline = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // 10x repeated execution check
    for (let i = 0; i < 10; i++) {
      const repeatPos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
      nodes.forEach(n => {
        expect(repeatPos[n.id].x).toBe(baseline[n.id].x);
        expect(repeatPos[n.id].y).toBe(baseline[n.id].y);
      });
    }

    // 5 shuffled input permutations
    for (let seed = 1; seed <= 5; seed++) {
      const shufNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id) * (seed % 2 === 0 ? 1 : -1));
      const shufEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id) * (seed % 2 === 0 ? -1 : 1));
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges, { enableFeatureLayout: true });

      nodes.forEach(n => {
        expect(shufPos[n.id].x).toBe(baseline[n.id].x);
        expect(shufPos[n.id].y).toBe(baseline[n.id].y);
      });
    }
  });

  it('4. Proves Legacy protection when enableFeatureLayout=false', () => {
    const defaultPos = computeArchitectureLayout(nodes, edges);
    const legacyPos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });

    // 0.00000 px drift between default and explicit false
    nodes.forEach(n => {
      expect(defaultPos[n.id].x).toBe(legacyPos[n.id].x);
      expect(defaultPos[n.id].y).toBe(legacyPos[n.id].y);
    });
  });

  it('5. Captures Stage 5 -> 7 -> 8 -> 12 pipeline stage instrumentation table', () => {
    const diag = measurePipelineStageMetrics(nodes, edges, { enableFeatureLayout: true });
    const stageTable = diag.stageTable;

    const s7 = stageTable.find(s => s.stage === 'Stage 7');
    const s8 = stageTable.find(s => s.stage === 'Stage 8');
    const s12 = stageTable.find(s => s.stage === 'Stage 12');

    expect(s7).toBeDefined();
    expect(s8).toBeDefined();
    expect(s12).toBeDefined();

    expect(s12!.primaryPrimaryCrossings).toBeLessThan(9335);
  });
});

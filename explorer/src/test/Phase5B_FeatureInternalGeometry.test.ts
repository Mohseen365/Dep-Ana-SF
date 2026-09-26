import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import {
  calculateFeatureLocalityDiagnostics,
  calculateDetailedEdgeCrossings,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
} from '../lib/layout/metrics';
import { discoverFeatures } from '../lib/layout/features';

function computePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
const cloudSpendData = JSON.parse(cloudSpendRaw);
const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

describe('Phase 5-B — Comprehensive Spacing Strategies & Locality Evaluation', () => {
  it('evaluates Strategies A-F on Salesforce Cloud Spend Tracker dataset', { timeout: 60000 }, () => {
    const strategies = [
      { name: 'Strategy A (Baseline 250px)', options: { enableFeatureLayout: true, layerSpacing: 250 } },
      { name: 'Strategy B (220px)', options: { enableFeatureLayout: true, layerSpacing: 220 } },
      { name: 'Strategy C (200px)', options: { enableFeatureLayout: true, layerSpacing: 200 } },
      { name: 'Strategy D (180px)', options: { enableFeatureLayout: true, layerSpacing: 180 } },
      { name: 'Strategy E (Adaptive Layer Occupancy)', options: { enableFeatureLayout: true, layerSpacing: 120 } },
      { name: 'Strategy F (Adaptive Feature Clearance & Compact Inter-Layer)', options: { enableFeatureLayout: true, layerSpacing: 60 } },
    ];

    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assign, nodeId) => {
      featureMap.set(nodeId, assign.primaryFeatureId);
    });

    console.log('\n========================================================================================================================');
    console.log('PHASE 5-B STRATEGY COMPARISON MATRIX (Cloud Spend Tracker: 240 nodes, 1,024 edges)');
    console.log('========================================================================================================================\n');

    strategies.forEach(strat => {
      const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, strat.options);

      const metrics = evaluateLayout(cloudSpendNodes, cloudSpendEdges, pos);
      const detailed = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, pos);
      const locality = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, pos);
      const priOverlaps = primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, pos);
      const satOverlaps = satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, pos);

      const intraLengths: number[] = [];
      const interLengths: number[] = [];
      cloudSpendEdges.forEach(e => {
        const p1 = pos[e.source];
        const p2 = pos[e.target];
        if (!p1 || !p2) return;
        const f1 = featureMap.get(e.source) || 'Unassigned';
        const f2 = featureMap.get(e.target) || 'Unassigned';
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (f1 !== 'Shared' && f1 !== 'Unassigned' && f2 !== 'Shared' && f2 !== 'Unassigned') {
          if (f1 === f2) intraLengths.push(dist);
          else interLengths.push(dist);
        }
      });

      const p75Intra = computePercentile(intraLengths, 0.75);
      const p90Intra = computePercentile(intraLengths, 0.90);
      const p75Inter = computePercentile(interLengths, 0.75);
      const p90Inter = computePercentile(interLengths, 0.90);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      cloudSpendNodes.forEach(n => {
        const p = pos[n.id];
        if (p) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      });
      const canvasW = Math.round(maxX - minX);
      const canvasH = Math.round(maxY - minY);
      const aspect = (canvasW / (canvasH || 1)).toFixed(2);

      // 10x Determinism
      let determinismDrift = 0;
      for (let run = 1; run <= 10; run++) {
        const repeatPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, strat.options);
        cloudSpendNodes.forEach(n => {
          const dx = Math.abs(repeatPos[n.id].x - pos[n.id].x);
          const dy = Math.abs(repeatPos[n.id].y - pos[n.id].y);
          determinismDrift = Math.max(determinismDrift, dx, dy);
        });
      }

      console.log(`--- ${strat.name} ---`);
      console.log(`  Med Intra: ${locality.medianIntraFeatureEdgeLength.toFixed(2)} px | P75 Intra: ${p75Intra.toFixed(2)} px | P90 Intra: ${p90Intra.toFixed(2)} px`);
      console.log(`  Med Inter: ${locality.medianInterFeatureEdgeLength.toFixed(2)} px | P75 Inter: ${p75Inter.toFixed(2)} px | P90 Inter: ${p90Inter.toFixed(2)} px`);
      console.log(`  Intra/Inter Ratio: ${locality.intraToInterEdgeLengthRatio.toFixed(4)} (Required: < 1.0000)`);
      console.log(`  Locality Gate (Intra < Inter): ${locality.medianIntraFeatureEdgeLength < locality.medianInterFeatureEdgeLength ? 'PASS' : 'FAIL'}`);
      console.log(`  Primary Crossings C_pp: ${detailed.primaryPrimaryCrossings} | Total Crossings C_total: ${detailed.totalGeometricCrossings}`);
      console.log(`  Layer Violations: ${metrics.layerViolationCount} | Primary Overlaps: ${priOverlaps} | Satellite Overlaps: ${satOverlaps}`);
      console.log(`  Canvas: ${canvasW} x ${canvasH} px (Aspect: ${aspect}:1)`);
      console.log(`  10x Determinism Drift: ${determinismDrift.toFixed(5)} px\n`);

      // Verify Hard Invariants
      expect(metrics.layerViolationCount).toBe(0);
      expect(priOverlaps).toBe(0);
      expect(satOverlaps).toBe(0);
      expect(determinismDrift).toBe(0);
    });
  });
});

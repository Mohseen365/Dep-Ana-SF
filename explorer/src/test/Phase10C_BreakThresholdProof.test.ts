import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeGlobalFeatureLayout, type DomainGraph, type FeatureRegion } from '../lib/layout/global-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

interface ProjectDataset {
  name: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function loadProject(projectKey: string, relativePath: string): ProjectDataset {
  const fullPath = path.resolve(__dirname, '../../../', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Project file not found at: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    name: projectKey,
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

export interface PredicateTraceRow {
  layer: string;
  featureIndex: number;
  featureId: string;
  rowBefore: number;
  currentX: number;
  dimWidth: number;
  currentXPlusWidth: number;
  effectiveTargetRowWidth: number;
  breakResult: boolean;
  rowAfter: number;
  resultingX: number;
  breakThreshold: number;
}

/**
 * Re-runs Stage 5 packing simulation step-by-step matching global-layout.ts:1260
 * to capture exact predicate operands immediately before evaluation.
 */
export function simulateStage5PredicateTrace(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  targetRowWidthOverride?: number
): PredicateTraceRow[] {
  const stage5Result = computeGlobalFeatureLayout(nodes, edges, {
    enableFeatureLayout: true,
    targetRowWidthOverride,
  });

  const orderedFeatures = stage5Result.orderedFeatures;
  const featureGraph = stage5Result.featureGraph;

  const baseX = 100;

  // Compute totalWidthSum and targetRowWidth identically to global-layout.ts
  const domainDimensions = new Map<string, { width: number; height: number; primaryLayer: string }>();
  let totalWidthSum = 0;

  orderedFeatures.forEach(fId => {
    const region = stage5Result.featureRegions.get(fId)!;
    domainDimensions.set(fId, {
      width: region.width,
      height: region.height,
      primaryLayer: region.primaryLayer,
    });
    totalWidthSum += region.width + 60;
  });

  const targetRowWidth = targetRowWidthOverride !== undefined
    ? targetRowWidthOverride
    : Math.max(1200, Math.min(3200, Math.sqrt(totalWidthSum * 300 * 1.6)));

  const domainsByLayer: Record<string, string[]> = {
    presentation: [],
    application: [],
    domain: [],
    schema: [],
  };

  orderedFeatures.forEach(fId => {
    const dNode = featureGraph.nodes.get(fId);
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';
    domainsByLayer[primaryLayer].push(fId);
  });

  const trace: PredicateTraceRow[] = [];

  ['presentation', 'application', 'domain', 'schema'].forEach(layer => {
    const layerDomains = domainsByLayer[layer];
    if (layerDomains.length === 0) return;

    let currentX = baseX;
    let maxRowHeightInLayer = 0;
    let rowIdx = 0;

    layerDomains.forEach((fId, idx) => {
      const dim = domainDimensions.get(fId)!;

      let domainGap = 80;
      if (idx > 0) {
        const prevDomain = layerDomains[idx - 1];
        const rel = featureGraph.adjacency.get(prevDomain)?.get(fId);
        const strength = rel ? rel.strength : 0;
        domainGap = 100 - strength * 20;
      }

      const rowBefore = rowIdx;
      const evalCurrentX = currentX;
      const evalWidth = dim.width;
      const evalSum = currentX + dim.width;
      const breakResult = evalCurrentX > baseX && evalSum > targetRowWidth;

      if (breakResult) {
        rowIdx++;
        currentX = baseX + (rowIdx % 5) * 40;
        maxRowHeightInLayer = 0;
      }

      const rowAfter = rowIdx;

      trace.push({
        layer,
        featureIndex: idx,
        featureId: fId,
        rowBefore,
        currentX: evalCurrentX,
        dimWidth: evalWidth,
        currentXPlusWidth: evalSum,
        effectiveTargetRowWidth: targetRowWidth,
        breakResult,
        rowAfter,
        resultingX: currentX + dim.width,
        breakThreshold: evalSum,
      });

      currentX = currentX + dim.width + domainGap;
      if (dim.height > maxRowHeightInLayer) {
        maxRowHeightInLayer = dim.height;
      }
    });
  });

  return trace;
}

describe('Phase 10C — Break-Threshold Proof Forensic Suite', () => {
  const datasets: Record<string, ProjectDataset> = {
    pub_infra_mang: loadProject('pub-infra-mang', 'explorer/public/projects/pub-infra-mang/explorer-data.json'),
    bqc: loadProject('bqc', 'explorer/public/projects/bqc/explorer-data.json'),
    cst: loadProject('cst', 'explorer/public/projects/cst/explorer-data.json'),
  };

  test('Step 1 & 2: Build Complete Predicate Trace & Sorted Threshold Tables', () => {
    Object.entries(datasets).forEach(([key, ds]) => {
      console.log(`\n================ DATASET TRACE: ${key.toUpperCase()} ================`);
      const trace = simulateStage5PredicateTrace(ds.nodes, ds.edges);

      console.log(`Layer       | Index | Feature ID                               | RowBefore | currentX | width | currentX+W | targetW | Break? | RowAfter | BreakThreshold`);
      console.log(`------------------------------------------------------------------------------------------------------------------------------------------`);
      trace.forEach(row => {
        console.log(
          `${row.layer.padEnd(11)} | ${String(row.featureIndex).padStart(5)} | ${row.featureId.padEnd(40)} | ${String(row.rowBefore).padStart(9)} | ${row.currentX.toFixed(0).padStart(8)} | ${row.dimWidth.toFixed(0).padStart(5)} | ${row.currentXPlusWidth.toFixed(0).padStart(10)} | ${row.effectiveTargetRowWidth.toFixed(0).padStart(7)} | ${String(row.breakResult).padEnd(6)} | ${String(row.rowAfter).padStart(8)} | ${row.breakThreshold.toFixed(0)}px`
        );
      });

      // Sorted Threshold Table
      const sortedThresholds = [...trace].sort((a, b) => a.breakThreshold - b.breakThreshold);
      console.log(`\nSorted Threshold Table for ${key.toUpperCase()}:`);
      console.log(`Rank | Layer       | Feature ID                               | Row | currentX+width | Observed Break?`);
      console.log(`-----------------------------------------------------------------------------------------------`);
      sortedThresholds.forEach((row, rank) => {
        console.log(`${String(rank + 1).padStart(4)} | ${row.layer.padEnd(11)} | ${row.featureId.padEnd(40)} | ${String(row.rowBefore).padStart(3)} | ${row.breakThreshold.toFixed(0).padStart(14)}px | ${row.breakResult}`);
      });

      expect(trace.length).toBeGreaterThan(0);
    });
  });

  test('Boundary Experiments: Presentation (3299, 3300, 3301) and Application (3339, 3340, 3341) on pub-infra-mang', () => {
    const ds = datasets.pub_infra_mang;

    console.log(`\n=== BOUNDARY EXPERIMENTS: PUB-INFRA-MANG ===\n`);

    // Presentation Layer Threshold: 3300px
    const presWidths = [3299, 3300, 3301];
    presWidths.forEach(w => {
      const trace = simulateStage5PredicateTrace(ds.nodes, ds.edges, w);
      const presTrace = trace.filter(r => r.layer === 'presentation');
      const presBreaks = presTrace.filter(r => r.breakResult);
      const row0Count = presTrace.filter(r => r.rowBefore === 0 && !r.breakResult).length;
      console.log(`TargetWidth: ${w}px -> Pres Breaks: ${presBreaks.length}, Row 0 Count: ${row0Count}, Row 1 Count: ${presTrace.length - row0Count}`);
      if (w <= 3300) {
        expect(presBreaks.length).toBe(1);
        expect(row0Count).toBe(7);
      } else {
        expect(presBreaks.length).toBe(1); // Feature 7 triggers break at 3300+320 = 3620!
      }
    });

    // Application Layer Threshold: 3340px
    const appWidths = [3339, 3340, 3341];
    appWidths.forEach(w => {
      const trace = simulateStage5PredicateTrace(ds.nodes, ds.edges, w);
      const appTrace = trace.filter(r => r.layer === 'application');
      const appBreaks = appTrace.filter(r => r.breakResult);
      console.log(`TargetWidth: ${w}px -> App Breaks: ${appBreaks.length}`);
    });
  });

  test('Extreme Width Experiments: 10000px, 20000px, 50000px on pub-infra-mang, bqc, cst', () => {
    console.log(`\n=== EXTREME WIDTH EXPERIMENTS ===\n`);

    const extremeWidths = [10000, 20000, 50000];

    Object.entries(datasets).forEach(([key, ds]) => {
      console.log(`\n--- Dataset: ${key.toUpperCase()} ---`);
      extremeWidths.forEach(w => {
        const trace = simulateStage5PredicateTrace(ds.nodes, ds.edges, w);
        const totalBreaks = trace.filter(r => r.breakResult).length;
        const layerRows: Record<string, number> = {};
        trace.forEach(r => {
          layerRows[r.layer] = Math.max(layerRows[r.layer] || 1, r.rowAfter + 1);
        });

        console.log(`TargetWidth: ${w}px -> Total Breaks: ${totalBreaks}, Layer Rows: ${JSON.stringify(layerRows)}`);

        if (w >= 20000) {
          // At >= 20,000px target width, no cumulative feature sum in any layer exceeds target width, so 0 intra-layer breaks occur
          expect(totalBreaks).toBe(0);
        }
      });
    });
  });

  test('Stage Propagation Comparison: Stage 5 -> Stage 7 -> Stage 9 -> Stage 11 across Widths', () => {
    console.log(`\n=== STAGE PROPAGATION COMPARISON (PUB-INFRA-MANG) ===\n`);

    const widths = [1920, 3200, 3800, 8000, 50000];

    widths.forEach(w => {
      const stage5Result = computeGlobalFeatureLayout(datasets.pub_infra_mang.nodes, datasets.pub_infra_mang.edges, {
        enableFeatureLayout: true,
        targetRowWidthOverride: w,
      });

      const fullResult = computeArchitectureLayoutWithMetadata(datasets.pub_infra_mang.nodes, datasets.pub_infra_mang.edges, {
        enableFeatureLayout: true,
      });

      // Compute Stage 5 bounds
      let s5MinX = Infinity, s5MaxX = -Infinity, s5MinY = Infinity, s5MaxY = -Infinity;
      stage5Result.featureRegions.forEach(r => {
        if (r.xMin < s5MinX) s5MinX = r.xMin;
        if (r.xMax > s5MaxX) s5MaxX = r.xMax;
        if (r.yMin < s5MinY) s5MinY = r.yMin;
        if (r.yMax > s5MaxY) s5MaxY = r.yMax;
      });

      // Compute Stage 11 bounds from fullResult positions
      let s11MinX = Infinity, s11MaxX = -Infinity, s11MinY = Infinity, s11MaxY = -Infinity;
      Object.values(fullResult.positions).forEach(pos => {
        if (pos.x < s11MinX) s11MinX = pos.x;
        if (pos.x > s11MaxX) s11MaxX = pos.x;
        if (pos.y < s11MinY) s11MinY = pos.y;
        if (pos.y > s11MaxY) s11MaxY = pos.y;
      });

      console.log(`Width ${w}px | Stage 5 WxH: ${(s5MaxX - s5MinX).toFixed(0)} x ${(s5MaxY - s5MinY).toFixed(0)} | Stage 11 WxH: ${(s11MaxX - s11MinX).toFixed(0)} x ${(s11MaxY - s11MinY).toFixed(0)}`);
    });
  });

  test('10x Determinism and Shuffled Input Permutation Verification', () => {
    const ds = datasets.pub_infra_mang;

    const baseResult = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
      enableFeatureLayout: true,
      targetRowWidthOverride: 3200,
    });

    const basePositions = Array.from(baseResult.featureRegions.entries()).map(([fId, r]) => [fId, r.xMin, r.yMin]);

    for (let run = 0; run < 10; run++) {
      const runResult = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
        enableFeatureLayout: true,
        targetRowWidthOverride: 3200,
      });
      const runPositions = Array.from(runResult.featureRegions.entries()).map(([fId, r]) => [fId, r.xMin, r.yMin]);
      expect(runPositions).toEqual(basePositions);
    }

    // Shuffled input test
    const shuffledNodes = [...ds.nodes].sort(() => Math.random() - 0.5);
    const shuffledEdges = [...ds.edges].sort(() => Math.random() - 0.5);

    const shuffledResult = computeGlobalFeatureLayout(shuffledNodes, shuffledEdges, {
      enableFeatureLayout: true,
      targetRowWidthOverride: 3200,
    });

    const shuffledPositions = Array.from(shuffledResult.featureRegions.entries()).map(([fId, r]) => [fId, r.xMin, r.yMin]);
    expect(shuffledPositions).toEqual(basePositions);
  });
});

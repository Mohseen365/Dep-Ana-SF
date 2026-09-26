import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeGlobalFeatureLayout } from '../lib/layout/global-layout';

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

describe('Phase 10B — Row-Break Constraint Forensics Harness', () => {
  const datasets: Record<string, ProjectDataset> = {
    pub_infra_mang: loadProject('pub-infra-mang', 'explorer/public/projects/pub-infra-mang/explorer-data.json'),
    bqc: loadProject('bqc', 'explorer/public/projects/bqc/explorer-data.json'),
    cst: loadProject('cst', 'explorer/public/projects/cst/explorer-data.json'),
  };

  test('Stage 5 Runtime Row-Break Forensics Trace', () => {
    console.log('\n=== PHASE 10B: STAGE 5 ROW-BREAK FORENSICS TRACE ===\n');

    Object.entries(datasets).forEach(([key, ds]) => {
      console.log(`\n================ DATASET: ${key.toUpperCase()} ================`);

      const stage5Result = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
        enableFeatureLayout: true,
      });

      console.log(`Dataset [${key}]: ${ds.nodes.length} nodes, ${ds.edges.length} edges, ${stage5Result.featureRegions.size} features`);

      const layers: Record<string, string[]> = { presentation: [], application: [], domain: [], schema: [] };
      stage5Result.featureRegions.forEach((region, featureId) => {
        const layer = region.primaryLayer || 'application';
        if (layers[layer]) layers[layer].push(featureId);
      });

      Object.entries(layers).forEach(([layerName, fIds]) => {
        if (fIds.length === 0) return;
        console.log(`\n  Layer Band: [${layerName.toUpperCase()}] (${fIds.length} features)`);

        fIds.forEach((fId, idx) => {
          const region = stage5Result.featureRegions.get(fId)!;
          console.log(`    [Feature ${idx}] ID: ${fId.padEnd(40)} | W=${region.width.toFixed(0)}px, H=${region.height.toFixed(0)}px | xMin=${region.xMin.toFixed(0)}px, xMax=${region.xMax.toFixed(0)}px, yMin=${region.yMin.toFixed(0)}px`);
        });
      });

      expect(stage5Result.featureRegions.size).toBeGreaterThan(0);
    });
  });

  test('Targeted Critical Threshold Testing for PUB-INFRA-MANG', () => {
    console.log('\n=== PHASE 10B: TARGETED CRITICAL THRESHOLD TESTING (PUB-INFRA-MANG) ===\n');

    const ds = datasets.pub_infra_mang;

    // Test targeted widths below 3300px (1200, 1500, 2000, 2500, 3000) vs above 3300px (3300, 3500, 4000, 6000)
    const testWidths = [1200, 1500, 2000, 2500, 3000, 3200, 3300, 3500, 4000, 6000];

    console.log(`Testing Targeted Widths Across Threshold Boundaries for PUB-INFRA-MANG:`);
    console.log(`  ${'Target Width'.padEnd(15)} | Pres Rows | App Rows | Dom Rows | Sch Rows | Total Rows | Presentation Row 0 Feature Count`);
    console.log(`  ${'-'.repeat(95)}`);

    testWidths.forEach(width => {
      const stage5Result = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
        enableFeatureLayout: true,
        targetRowWidthOverride: width,
      });

      const layers: Record<string, string[]> = { presentation: [], application: [], domain: [], schema: [] };
      stage5Result.featureRegions.forEach((region, fId) => {
        const layer = region.primaryLayer || 'application';
        if (layers[layer]) layers[layer].push(fId);
      });

      const rowCounts: Record<string, number> = {};
      let totalRows = 0;
      let presRow0Count = 0;

      Object.entries(layers).forEach(([layerName, fIds]) => {
        if (fIds.length === 0) {
          rowCounts[layerName] = 0;
          return;
        }
        const rowsMap = new Map<number, string[]>();
        fIds.forEach(fId => {
          const y = stage5Result.featureRegions.get(fId)!.yMin;
          if (!rowsMap.has(y)) rowsMap.set(y, []);
          rowsMap.get(y)!.push(fId);
        });
        rowCounts[layerName] = rowsMap.size;
        totalRows += rowsMap.size;

        if (layerName === 'presentation') {
          const firstRowY = Math.min(...Array.from(rowsMap.keys()));
          presRow0Count = rowsMap.get(firstRowY)?.length || 0;
        }
      });

      console.log(`  ${(width.toFixed(0) + 'px').padEnd(15)} | ${String(rowCounts.presentation).padStart(9)} | ${String(rowCounts.application).padStart(8)} | ${String(rowCounts.domain).padStart(8)} | ${String(rowCounts.schema).padStart(8)} | ${String(totalRows).padStart(10)} | ${presRow0Count} features in Row 0`);
    });
  });
});

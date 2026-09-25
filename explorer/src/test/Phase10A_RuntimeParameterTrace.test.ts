import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { computeGlobalFeatureLayout, computeGlobalDomainLayout } from '../lib/layout/global-layout';

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

describe('Phase 10A — Runtime Packing Parameter Trace Audit', () => {
  const datasets: Record<string, ProjectDataset> = {
    pub_infra_mang: loadProject('pub-infra-mang', 'explorer/public/projects/pub-infra-mang/explorer-data.json'),
    bqc: loadProject('bqc', 'explorer/public/projects/bqc/explorer-data.json'),
    cst: loadProject('cst', 'explorer/public/projects/cst/explorer-data.json'),
  };

  test('Trace Parameter Flow & Effective targetRowWidth Calculation', () => {
    console.log('\n=== PHASE 10A: PARAMETER VALUE TRACE ===\n');

    Object.entries(datasets).forEach(([key, ds]) => {
      const stage5Result = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
        enableFeatureLayout: true,
      });

      console.log(`Dataset: [${key}] (${ds.nodes.length} nodes, ${ds.edges.length} edges)`);
      console.log(`  Features Count: ${stage5Result.featureRegions.size}`);
      console.log(`  Ordered Features: ${stage5Result.orderedFeatures.length}`);

      const layers: Record<string, string[]> = {
        presentation: [],
        application: [],
        domain: [],
        schema: [],
      };

      stage5Result.featureRegions.forEach((region, featureId) => {
        const layer = region.primaryLayer || 'application';
        if (layers[layer]) {
          layers[layer].push(featureId);
        }
      });

      console.log(`  Layer Band Feature Counts:`);
      console.log(`    presentation: ${layers.presentation.length}`);
      console.log(`    application:  ${layers.application.length}`);
      console.log(`    domain:       ${layers.domain.length}`);
      console.log(`    schema:       ${layers.schema.length}`);

      console.log(`  Stage 5 Feature Region Bounds & Rows:`);
      Object.entries(layers).forEach(([layerName, fIds]) => {
        if (fIds.length === 0) return;
        const rowsMap = new Map<number, string[]>();
        fIds.forEach(fId => {
          const region = stage5Result.featureRegions.get(fId)!;
          const y = region.yMin;
          if (!rowsMap.has(y)) rowsMap.set(y, []);
          rowsMap.get(y)!.push(fId);
        });

        console.log(`    Layer [${layerName.toUpperCase()}] (${fIds.length} features, ${rowsMap.size} rows):`);
        let rIdx = 0;
        rowsMap.forEach((rowFeatures, yMin) => {
          const maxH = Math.max(...rowFeatures.map(f => stage5Result.featureRegions.get(f)!.height));
          const maxW = Math.max(...rowFeatures.map(f => stage5Result.featureRegions.get(f)!.xMax));
          console.log(`      Row ${rIdx} (yMin=${yMin}px, maxH=${maxH}px, xMax=${maxW}px): ${rowFeatures.length} features -> [${rowFeatures.slice(0, 5).join(', ')}${rowFeatures.length > 5 ? '...' : ''}]`);
          rIdx++;
        });
      });
      console.log('\n');

      expect(stage5Result.featureRegions.size).toBeGreaterThan(0);
    });
  });

  test('Five Explicit Target Row Width Experiments & Feature Row Membership Matrix', () => {
    console.log('\n=== PHASE 10A: FIVE EXPLICIT WIDTH EXPERIMENTS & ROW MEMBERSHIP MATRIX ===\n');

    const widths = [1920, 3800, 4800, 6000, 8000];

    Object.entries(datasets).forEach(([dsKey, ds]) => {
      console.log(`\n================ DATASET: ${dsKey.toUpperCase()} ================`);

      const matrix: Record<string, Record<number, number>> = {}; // featureId -> { width -> rowIndex }

      widths.forEach(width => {
        // Direct computeGlobalFeatureLayout call with targetRowWidthOverride
        const stage5Result = computeGlobalFeatureLayout(ds.nodes, ds.edges, {
          enableFeatureLayout: true,
          targetRowWidthOverride: width,
        });

        // Group features by layer and compute row indices
        const layers: Record<string, string[]> = { presentation: [], application: [], domain: [], schema: [] };
        stage5Result.featureRegions.forEach((region, fId) => {
          const layer = region.primaryLayer || 'application';
          if (layers[layer]) layers[layer].push(fId);
        });

        let globalRowIndex = 0;
        Object.entries(layers).forEach(([_, fIds]) => {
          if (fIds.length === 0) return;
          const rowsMap = new Map<number, string[]>();
          fIds.forEach(fId => {
            const y = stage5Result.featureRegions.get(fId)!.yMin;
            if (!rowsMap.has(y)) rowsMap.set(y, []);
            rowsMap.get(y)!.push(fId);
          });

          rowsMap.forEach((rowFeatures) => {
            rowFeatures.forEach(fId => {
              if (!matrix[fId]) matrix[fId] = {};
              matrix[fId][width] = globalRowIndex;
            });
            globalRowIndex++;
          });
        });

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        stage5Result.featureRegions.forEach(r => {
          if (r.xMin < minX) minX = r.xMin;
          if (r.xMax > maxX) maxX = r.xMax;
          if (r.yMin < minY) minY = r.yMin;
          if (r.yMax > maxY) maxY = r.yMax;
        });

        console.log(`[Target Width = ${width}px] Total Rows: ${globalRowIndex} | Bounds: ${maxX - minX}px (W) x ${maxY - minY}px (H)`);
      });

      // Sample first 10 features to display row membership matrix
      console.log(`\n  Feature Row Membership Matrix Sample (First 10 Features):`);
      console.log(`  ${'Feature ID'.padEnd(45)} | 1920 | 3800 | 4800 | 6000 | 8000`);
      console.log(`  ${'-'.repeat(75)}`);
      Object.keys(matrix).slice(0, 10).forEach(fId => {
        const r1920 = matrix[fId][1920];
        const r3800 = matrix[fId][3800];
        const r4800 = matrix[fId][4800];
        const r6000 = matrix[fId][6000];
        const r8000 = matrix[fId][8000];
        console.log(`  ${fId.padEnd(45)} | ${String(r1920).padStart(4)} | ${String(r3800).padStart(4)} | ${String(r4800).padStart(4)} | ${String(r6000).padStart(4)} | ${String(r8000).padStart(4)}`);
      });
    });
  });
});

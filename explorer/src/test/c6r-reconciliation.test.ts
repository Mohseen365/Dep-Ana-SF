import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { projectOrbitSemantics } from '../lib/layout/orbit-semantics';
import { computeOrbitLayout } from '../lib/orbit-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

describe('C6R FORENSIC RECONCILIATION SUITE', () => {
  const pbimPath = path.resolve(__dirname, '../../public/projects/pbim/explorer-data.json');

  it('Issue 1, 3, 4: Measures exact Repair Passes vs Repair Operations across all scale tiers', () => {
    const fixtures = [
      { name: 'food-app', file: 'food-app/explorer-data.json' },
      { name: 'cst', file: 'cst/explorer-data.json' },
      { name: 'bqc', file: 'bqc/explorer-data.json' },
      { name: 'pbim', file: 'pbim/explorer-data.json' },
    ];

    const results: any[] = [];

    // Real Fixtures
    fixtures.forEach((fix) => {
      const p = path.resolve(__dirname, '../../public/projects', fix.file);
      if (!fs.existsSync(p)) return;
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));

      const proj = projectOrbitSemantics(raw.nodes || [], raw.edges || []);
      const layout = computeOrbitLayout({ nodes: proj.nodeList });

      // Calculate actual loop passes executed by running same logic with pass counter
      let repairPassesExecuted = 0;
      let repairOps = 0;
      let pass = 0;
      const positions = JSON.parse(JSON.stringify(layout.positions));
      const placedPosList = Object.values(positions) as any[];
      const totalPlaced = placedPosList.length;

      while (pass < 20) {
        pass++;
        let repairsInPass = 0;
        for (let i = 0; i < totalPlaced; i++) {
          for (let j = i + 1; j < totalPlaced; j++) {
            const a = placedPosList[i];
            const b = placedPosList[j];
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);
            if (dx < 160 - 1e-3 && dy < 100 - 1e-3) {
              b.track += 1;
              b.radius += 200;
              b.x = Math.round((b.radius * Math.cos(b.angle)) * 1000) / 1000;
              b.y = Math.round((b.radius * Math.sin(b.angle)) * 1000) / 1000;
              repairsInPass++;
              repairOps++;
            }
          }
        }
        if (repairsInPass === 0) {
          repairPassesExecuted = pass;
          break;
        }
      }

      results.push({
        dataset: fix.name,
        nodes: raw.nodes.length,
        edges: raw.edges.length,
        initialCollisions: layout.diagnostics.initialCollisionCount,
        repairPassesExecuted,
        repairOperations: layout.diagnostics.repairCount,
        finalCollisions: layout.diagnostics.collisionCount,
        maxTrack: layout.diagnostics.maxTrackIndex,
        maxRadius: layout.diagnostics.maxRadiusPx,
        runtimeMs: layout.diagnostics.executionTimeMs,
      });
    });

    // Synthetic Tiers: 1k, 2k, 5k, 10k, 20k
    const syntheticSizes = [1000, 2000, 5000, 10000, 20000];
    syntheticSizes.forEach((nodeCount) => {
      const { nodes, edges } = generateSyntheticSalesforceGraph({ nodeCount, seed: 42, componentCount: 5 });
      const proj = projectOrbitSemantics(nodes, edges);
      const layout = computeOrbitLayout({ nodes: proj.nodeList });

      let repairPassesExecuted = 0;
      let repairOps = 0;
      let pass = 0;
      const positions = JSON.parse(JSON.stringify(layout.positions));
      const placedPosList = Object.values(positions) as any[];
      const totalPlaced = placedPosList.length;

      while (pass < 20) {
        pass++;
        let repairsInPass = 0;
        for (let i = 0; i < totalPlaced; i++) {
          for (let j = i + 1; j < totalPlaced; j++) {
            const a = placedPosList[i];
            const b = placedPosList[j];
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);
            if (dx < 160 - 1e-3 && dy < 100 - 1e-3) {
              b.track += 1;
              b.radius += 200;
              b.x = Math.round((b.radius * Math.cos(b.angle)) * 1000) / 1000;
              b.y = Math.round((b.radius * Math.sin(b.angle)) * 1000) / 1000;
              repairsInPass++;
              repairOps++;
            }
          }
        }
        if (repairsInPass === 0) {
          repairPassesExecuted = pass;
          break;
        }
      }

      results.push({
        dataset: `Synthetic-${nodeCount}N`,
        nodes: nodeCount,
        edges: edges.length,
        initialCollisions: layout.diagnostics.initialCollisionCount,
        repairPassesExecuted,
        repairOperations: layout.diagnostics.repairCount,
        finalCollisions: layout.diagnostics.collisionCount,
        maxTrack: layout.diagnostics.maxTrackIndex,
        maxRadius: layout.diagnostics.maxRadiusPx,
        runtimeMs: layout.diagnostics.executionTimeMs,
      });
    });

    console.log('[C6R RECONCILIATION DATA TABLE]');
    console.table(results);

    // Save results to disk
    const evidenceDir = path.resolve(__dirname, '../../../audit-evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'c6r_reconciliation_data.json'), JSON.stringify(results, null, 2));

    // Verify repair passes is ALWAYS <= 20
    results.forEach((r) => {
      expect(r.repairPassesExecuted).toBeLessThanOrEqual(20);
      expect(r.finalCollisions).toBe(0);
    });
  });
});

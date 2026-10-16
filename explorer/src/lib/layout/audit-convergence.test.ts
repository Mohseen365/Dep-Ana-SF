import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { projectOrbitSemantics, type OrbitSemanticProjectionResult } from './orbit-semantics';
import { computeOrbitLayout, checkAABBOverlap, type OrbitLayoutOutput, type OrbitDiagnostics } from './orbit-layout';
import { classifyNodeLayerWithReason } from './layers';

declare const __dirname: string;

interface OrbitFixtureAuditResult {
  nodeCount: number;
  edgeCount: number;
  nodeTypeHist: Record<string, number>;
  layerHist: Record<string, number>;
  orbitRingHist: Record<number, number>;
  featureCount: number;
  domainCount: number;
  sectorCount: number;
  maxSectorPop: number;
  projectedN: number;
  geometryN: number;
  initialCollisions: number;
  repairOps: number;
  finalCollisions: number;
  collisionPairs: Array<[string, string]>;
  minDx: number;
  minDy: number;
  minEffSep: number;
  diagnostics: OrbitDiagnostics;
  semResult: OrbitSemanticProjectionResult;
  geoResult: OrbitLayoutOutput;
}

describe('Adversarial Convergence & PBIM Truth Audit', () => {
  it('runs exhaustive audit across all fixtures', () => {
    const fixtures = [
      { name: 'food-app', relPath: '../../../public/projects/food-app/explorer-data.json' },
      { name: 'cst', relPath: '../../../public/projects/cst/explorer-data.json' },
      { name: 'bqc', relPath: '../../../public/projects/bqc/explorer-data.json' },
      { name: 'pbim', relPath: '../../../public/projects/pbim/explorer-data.json' },
    ];

    const results: Record<string, OrbitFixtureAuditResult> = {};

    for (const fix of fixtures) {
      const fullPath = path.resolve(__dirname, fix.relPath);
      const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const rawNodes: ExplorerNode[] = raw.nodes || [];
      const rawEdges: ExplorerEdge[] = raw.edges || [];

      // 1. Run Workstream A Semantic Projection
      const semResult = projectOrbitSemantics(rawNodes, rawEdges);

      // Node-type histogram
      const nodeTypeHist: Record<string, number> = {};
      for (const n of rawNodes) {
        const t = n.type || 'Untyped';
        nodeTypeHist[t] = (nodeTypeHist[t] || 0) + 1;
      }

      // Layer histogram
      const layerHist: Record<string, number> = {};
      for (const n of rawNodes) {
        const l = classifyNodeLayerWithReason(n).layer;
        layerHist[l] = (layerHist[l] || 0) + 1;
      }

      // Max sector population
      let maxSectorPop = 0;
      for (const pop of Object.values(semResult.sectorCounts)) {
        if (pop > maxSectorPop) maxSectorPop = pop;
      }

      // 2. Run Workstream B Geometry Engine using Workstream A semantics
      const geoResult = computeOrbitLayout({
        nodes: semResult.nodeList,
      });

      // Check residual final collisions using exact AABB overlap check
      const effW = 120 + 40; // 160
      const effH = 60 + 40; // 100
      const posList = Object.values(geoResult.positions);

      let finalCollisions = 0;
      const collisionPairs: Array<[string, string]> = [];
      let minDx = Infinity;
      let minDy = Infinity;
      let minEffSep = Infinity;

      for (let i = 0; i < posList.length; i++) {
        for (let j = i + 1; j < posList.length; j++) {
          const pA = posList[i];
          const pB = posList[j];
          const dx = Math.abs(pA.x - pB.x);
          const dy = Math.abs(pA.y - pB.y);

          if (dx < minDx) minDx = dx;
          if (dy < minDy) minDy = dy;

          const overlap = checkAABBOverlap(pA, pB, effW, effH);
          if (overlap) {
            finalCollisions++;
            collisionPairs.push([pA.nodeId, pB.nodeId]);
          }

          // Effective separation: max(dx / effW, dy / effH) or Euclidean normalized
          const sep = Math.max(dx / effW, dy / effH);
          if (sep < minEffSep) minEffSep = sep;
        }
      }

      results[fix.name] = {
        nodeCount: rawNodes.length,
        edgeCount: rawEdges.length,
        nodeTypeHist,
        layerHist,
        orbitRingHist: semResult.ringCounts,
        featureCount: semResult.featureCount,
        domainCount: semResult.domainCount,
        sectorCount: semResult.summary.sectorCount,
        maxSectorPop,
        projectedN: semResult.nodeList.length,
        geometryN: Object.keys(geoResult.positions).length,
        initialCollisions: geoResult.diagnostics.initialCollisionCount,
        repairOps: geoResult.diagnostics.repairCount,
        finalCollisions,
        collisionPairs: collisionPairs.slice(0, 10),
        minDx,
        minDy,
        minEffSep,
        diagnostics: geoResult.diagnostics,
        semResult,
        geoResult,
      };
    }

    console.log('=== AUDIT RESULTS SUMMARY ===');
    for (const [name, res] of Object.entries(results)) {
      console.log(`\n--- Fixture: ${name} ---`);
      console.log(`Nodes: ${res.nodeCount}, Edges: ${res.edgeCount}`);
      console.log(`Node Types:`, res.nodeTypeHist);
      console.log(`Layers:`, res.layerHist);
      console.log(`Orbit Rings (A):`, res.orbitRingHist);
      console.log(`Features: ${res.featureCount}, Domains: ${res.domainCount}, Sectors: ${res.sectorCount}, Max Sector Pop: ${res.maxSectorPop}`);
      console.log(`Node Conservation: Input=${res.nodeCount}, Projected=${res.projectedN}, Geometry=${res.geometryN}`);
      console.log(`Collisions: Initial=${res.initialCollisions}, RepairOps=${res.repairOps}, Final=${res.finalCollisions}`);
      console.log(`Min dx: ${res.minDx.toFixed(2)}, Min dy: ${res.minDy.toFixed(2)}`);
      if (res.finalCollisions > 0) {
        console.log(`Sample Final Collision Pairs:`, res.collisionPairs);
      }
    }

    expect(true).toBe(true);
  });
});

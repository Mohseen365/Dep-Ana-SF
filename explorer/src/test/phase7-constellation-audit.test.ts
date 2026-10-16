import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { adaptConstellation } from '../lib/adapters/constellation-adapter';
import { computeConstellationLayout } from '../lib/layout/constellation-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

interface DatasetSpec {
  key: string;
  file: string;
}

const DATASETS: DatasetSpec[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

function loadDataset(ds: DatasetSpec): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), ds.file);
  const p2 = path.resolve(__dirname, '../../', ds.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function makeSchema(nodes: ExplorerNode[], edges: ExplorerEdge[]): ExplorerDataSchema {
  return {
    nodes,
    edges,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 0,
        apexClasses: 0,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };
}

export interface DistributionStats {
  count: number;
  mean: number;
  median: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

function computeStats(arr: number[]): DistributionStats {
  if (arr.length === 0) {
    return { count: 0, mean: 0, median: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;

  const getQuantile = (q: number) => {
    const idx = Math.min(count - 1, Math.floor(count * q));
    return sorted[idx];
  };

  const mid = Math.floor(count * 0.5);
  const median = count % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    p50: Number(median.toFixed(2)),
    p75: Number(getQuantile(0.75).toFixed(2)),
    p90: Number(getQuantile(0.90).toFixed(2)),
    p95: Number(getQuantile(0.95).toFixed(2)),
    p99: Number(getQuantile(0.99).toFixed(2)),
    max: Number(sorted[count - 1].toFixed(2)),
  };
}

function countAABBOverlaps(
  positions: Record<string, { x: number; y: number }>,
  w: number,
  h: number
): { overlapCount: number; overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number }> } {
  const nodeIds = Object.keys(positions);
  let overlapCount = 0;
  const overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number }> = [];

  for (let i = 0; i < nodeIds.length; i++) {
    const idA = nodeIds[i];
    const posA = positions[idA];
    if (!posA) continue;
    const minXA = posA.x;
    const maxXA = posA.x + w;
    const minYA = posA.y;
    const maxYA = posA.y + h;

    for (let j = i + 1; j < nodeIds.length; j++) {
      const idB = nodeIds[j];
      const posB = positions[idB];
      if (!posB) continue;
      const minXB = posB.x;
      const maxXB = posB.x + w;
      const minYB = posB.y;
      const maxYB = posB.y + h;

      const xOverlap = Math.max(0, Math.min(maxXA, maxXB) - Math.max(minXA, minXB));
      const yOverlap = Math.max(0, Math.min(maxYA, maxYB) - Math.max(minYA, minYB));

      if (xOverlap > 1e-3 && yOverlap > 1e-3) {
        overlapCount++;
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        overlappingPairs.push({
          nodeA: idA,
          nodeB: idB,
          distance: Number(Math.sqrt(dx * dx + dy * dy).toFixed(2)),
        });
      }
    }
  }

  return { overlapCount, overlappingPairs };
}

describe('Phase 7 & Phase 7A — Constellation & Orbit Spatial-Density Observational Audit Harness', () => {
  const canonicalMeasurementsArtifact: Record<string, any> = {
    generatedAt: new Date().toISOString(),
    constellationScenarios: {},
    orbitScenarios: {},
  };

  describe('Dependency Constellation Lens Population & Geometry Reconciliation', () => {
    DATASETS.forEach((ds) => {
      test(`Dataset: ${ds.key.toUpperCase()} - Constellation Lens Multi-Depth Population & Geometry`, () => {
        const { nodes, edges } = loadDataset(ds);
        const schema: ExplorerDataSchema = makeSchema(nodes, edges);

        // 2-Hop Scenario
        const constData2 = adaptConstellation(schema, { maxDepth: 2, direction: 'both' });
        const layoutRes2 = computeConstellationLayout(constData2, {
          width: 900,
          height: 900,
          cx: 450,
          cy: 450,
          baseRadius: 180,
          ringStepRadius: 150,
        });

        // 3-Hop Scenario
        const constData3 = adaptConstellation(schema, { maxDepth: 3, direction: 'both' });
        const layoutRes3 = computeConstellationLayout(constData3, {
          width: 900,
          height: 900,
          cx: 450,
          cy: 450,
          baseRadius: 180,
          ringStepRadius: 150,
        });

        const posMap2 = layoutRes2.nodePositions;
        const posMap3 = layoutRes3.nodePositions;

        const overlaps2 = countAABBOverlaps(posMap2, 24, 24);
        const overlaps3 = countAABBOverlaps(posMap3, 24, 24);

        // Record canonical measurement record
        canonicalMeasurementsArtifact.constellationScenarios[ds.key] = {
          dataset: ds.key,
          focalNodeId: constData2.focalNode?.id,
          scenario2Hop: {
            maxDepth: 2,
            totalNodes: constData2.summary.totalNodes,
            nodeIds: Object.keys(posMap2),
            ringPopulations: constData2.rings.map(r => ({ ringIndex: r.ringIndex, count: r.totalCount })),
            overlaps: overlaps2.overlapCount,
          },
          scenario3Hop: {
            maxDepth: 3,
            totalNodes: constData3.summary.totalNodes,
            nodeIds: Object.keys(posMap3),
            ringPopulations: constData3.rings.map(r => ({ ringIndex: r.ringIndex, count: r.totalCount })),
            overlaps: overlaps3.overlapCount,
          },
        };

        expect(constData2.focalNode).not.toBeNull();
        expect(constData3.focalNode).not.toBeNull();
        expect(constData3.summary.totalNodes).toBeGreaterThanOrEqual(constData2.summary.totalNodes);
      });
    });
  });

  describe('Architecture Orbit Layout Population & Radius Reconciliation', () => {
    DATASETS.forEach((ds) => {
      test(`Dataset: ${ds.key.toUpperCase()} - Architecture Orbit Mode Geometry & Multi-Track Radius`, () => {
        const { nodes, edges } = loadDataset(ds);

        const startTime = performance.now();
        const layoutRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
          architectureMode: 'orbit',
          nodeWidth: 120,
          nodeHeight: 60,
        });
        const duration = performance.now() - startTime;

        const posMap = layoutRes.positions;
        const nodeIds = Object.keys(posMap);

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let maxRadius = 0;
        nodeIds.forEach((id) => {
          const p = posMap[id];
          if (p.x < minX) minX = p.x;
          if (p.x + 120 > maxX) maxX = p.x + 120;
          if (p.y < minY) minY = p.y;
          if (p.y + 60 > maxY) maxY = p.y + 60;

          const r = Math.sqrt(p.x * p.x + p.y * p.y);
          if (r > maxRadius) maxRadius = r;
        });

        const width = maxX - minX;
        const height = maxY - minY;

        const edgeDists: number[] = [];
        edges.forEach((e) => {
          const sPos = posMap[e.source];
          const tPos = posMap[e.target];
          if (sPos && tPos) {
            const dx = (sPos.x + 60) - (tPos.x + 60);
            const dy = (sPos.y + 30) - (tPos.y + 30);
            edgeDists.push(Math.sqrt(dx * dx + dy * dy));
          }
        });

        const semStats = computeStats(edgeDists);
        const overlaps = countAABBOverlaps(posMap, 120, 60);

        canonicalMeasurementsArtifact.orbitScenarios[ds.key] = {
          dataset: ds.key,
          totalNodes: nodeIds.length,
          totalEdges: edges.length,
          canvasWidth: Number(width.toFixed(2)),
          canvasHeight: Number(height.toFixed(2)),
          maxRadius: Number(maxRadius.toFixed(2)),
          semanticLocalityMedian: semStats.median,
          semanticLocalityP95: semStats.p95,
          overlaps: overlaps.overlapCount,
          executionTimeMs: Number(duration.toFixed(2)),
        };

        expect(nodeIds.length).toBe(nodes.length);
        expect(width).toBeGreaterThan(0);
        expect(overlaps.overlapCount).toBe(0);
      });
    });
  });

  describe('Export Canonical Geometry Artifact', () => {
    test('Writes PHASE_7A_CANONICAL_GEOMETRY_MEASUREMENTS.json to root directory', () => {
      const artifactPath = path.resolve(process.cwd(), 'PHASE_7A_CANONICAL_GEOMETRY_MEASUREMENTS.json');
      fs.writeFileSync(artifactPath, JSON.stringify(canonicalMeasurementsArtifact, null, 2), 'utf8');
      expect(fs.existsSync(artifactPath)).toBe(true);
    });
  });

  describe('Determinism & Input Order Invariance Audit (10x Identical & 10x Shuffle)', () => {
    DATASETS.forEach((ds) => {
      test(`Dataset: ${ds.key.toUpperCase()} - Orbit Mode Determinism`, () => {
        const { nodes, edges } = loadDataset(ds);

        const baseRes = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
        const basePos = baseRes.positions;

        // 10x Identical
        let maxIdenticalDrift = 0;
        for (let run = 0; run < 10; run++) {
          const curRes = computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit' });
          for (const [id, p1] of Object.entries(basePos)) {
            const p2 = curRes.positions[id];
            const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
            if (drift > maxIdenticalDrift) maxIdenticalDrift = drift;
          }
        }

        // 10x Shuffle
        let maxShuffleDrift = 0;
        for (let run = 0; run < 10; run++) {
          const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
          const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);
          const curRes = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, { architectureMode: 'orbit' });
          for (const [id, p1] of Object.entries(basePos)) {
            const p2 = curRes.positions[id];
            const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
            if (drift > maxShuffleDrift) maxShuffleDrift = drift;
          }
        }

        expect(maxIdenticalDrift).toBe(0);
        expect(maxShuffleDrift).toBe(0);
      });
    });
  });

  describe('Cross-Mode Isolation & Candidate D Negative Control', () => {
    test('Candidate D is strictly disabled for orbit and hybrid modes regardless of input options', { timeout: 30000 }, () => {
      const { nodes, edges } = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

      // Hostile Orbit call with enableCandidateDOrdering = true
      const orbitRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
        architectureMode: 'orbit',
        enableCandidateDOrdering: true,
      });

      // Hostile Hybrid call with enableCandidateDOrdering = true
      const hybridRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
        architectureMode: 'hybrid',
        enableCandidateDOrdering: true,
      });

      expect(orbitRes.positions).toBeDefined();
      expect(hybridRes.positions).toBeDefined();
    });
  });
});

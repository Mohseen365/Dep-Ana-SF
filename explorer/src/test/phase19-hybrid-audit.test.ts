import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeArchitectureLayoutWithMetadata,
} from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { discoverFeatures } from '../lib/layout/features';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';

const PROJECT_IDS = [
  'cst',
  'bqc',
  'pbim',
  'cloud-spend-tracker',
  'food-app',
  'movie',
  'movie-app',
  'project-b',
  'pub-infra-mang',
  'test-canonical-project',
  'test-norm-proj',
];

interface DatasetMetrics {
  projectId: string;
  nodeCount: number;
  edgeCount: number;
  componentCount: number;
  maxDegree: number;
  graphDensity: number;
  occupiedWidth: number;
  occupiedHeight: number;
  occupiedArea: number;
  emptySpaceRatio: number;
  occupiedGraphScale: number;
  // Edge Distance Metrics
  edgeMin: number;
  edgeMedian: number;
  edgeP75: number;
  edgeP95: number;
  edgeP99: number;
  edgeMax: number;
  // Normalized Edge Distance
  normEdgeMin: number;
  normEdgeMedian: number;
  normEdgeP75: number;
  normEdgeP95: number;
  normEdgeP99: number;
  normEdgeMax: number;
  // Nearest Neighbor
  nnMedian: number;
  nnP75: number;
  nnP95: number;
  nnP99: number;
  nnMax: number;
  // Semantic Neighbor
  intraFeatureMedian: number;
  intraFeatureP95: number;
  satelliteTetherMedian: number;
  satelliteTetherP95: number;
  // Component Separation
  minComponentSeparation: number;
  // AABB Collisions
  aabbCollisions: number;
  // Determinism
  determinismDrift: number;
  // Input Order Invariance
  inputOrderDrift: number;
  // Performance (ms)
  perfMinMs: number;
  perfMedianMs: number;
  perfP95Ms: number;
  perfMaxMs: number;
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const idx = (sortedArr.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

function loadProjectData(projectId: string): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, `../../public/projects/${projectId}/explorer-data.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Project file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function calculateDegreeStats(nodes: ExplorerNode[], edges: ExplorerEdge[]): { maxDegree: number; density: number } {
  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));
  edges.forEach(e => {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  });
  let maxDegree = 0;
  degreeMap.forEach(d => {
    if (d > maxDegree) maxDegree = d;
  });
  const N = nodes.length;
  const E = edges.length;
  const density = N > 1 ? (2 * E) / (N * (N - 1)) : 0;
  return { maxDegree, density };
}

function evaluateAABBCollisions(
  positions: Record<string, { x: number; y: number }>,
  nodeWidth = 120,
  nodeHeight = 60
): number {
  const entries = Object.entries(positions);
  let collisions = 0;
  for (let i = 0; i < entries.length; i++) {
    const [, posA] = entries[i];
    for (let j = i + 1; j < entries.length; j++) {
      const [, posB] = entries[j];
      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);
      if (dx < nodeWidth && dy < nodeHeight) {
        collisions++;
      }
    }
  }
  return collisions;
}

describe('Phase 19 — Clean-Room Hybrid Spatial-Density Audit', () => {
  const resultsMatrix: DatasetMetrics[] = [];

  test('Execute Hybrid Layout Audit across all 11 project datasets', async () => {
    for (const projectId of PROJECT_IDS) {
      console.log(`Auditing dataset: ${projectId}...`);
      const { nodes, edges } = loadProjectData(projectId);
      const nodeWidth = 120;
      const nodeHeight = 60;

      // 1. Compute Hybrid Layout Baseline
      const startMs = performance.now();
      const res = computeArchitectureLayoutWithMetadata(nodes, edges, {
        architectureMode: 'hybrid',
        enableFeatureLayout: true,
        nodeWidth,
        nodeHeight,
      });
      const endMs = performance.now();
      const baselinePositions = res.positions;
      const initialExecTime = endMs - startMs;

      const N = nodes.length;
      const E = edges.length;
      if (N === 0) continue;

      // Degree & Density
      const { maxDegree, density } = calculateDegreeStats(nodes, edges);

      // Components
      const analysis = computeArchitectureAnalysis(nodes, edges);
      const comps = analysis.components;
      const componentCount = comps.length;

      // Spatial Footprint (M1, M2, M3, M4)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pos of Object.values(baselinePositions)) {
        const left = pos.x - nodeWidth / 2;
        const right = pos.x + nodeWidth / 2;
        const top = pos.y - nodeHeight / 2;
        const bottom = pos.y + nodeHeight / 2;
        if (left < minX) minX = left;
        if (right > maxX) maxX = right;
        if (top < minY) minY = top;
        if (bottom > maxY) maxY = bottom;
      }

      const occupiedWidth = maxX > minX ? maxX - minX : nodeWidth;
      const occupiedHeight = maxY > minY ? maxY - minY : nodeHeight;
      const occupiedArea = occupiedWidth * occupiedHeight;
      const totalNodeArea = N * nodeWidth * nodeHeight;
      const emptySpaceRatio = Math.max(0, 1 - totalNodeArea / occupiedArea);
      const occupiedGraphScale = Math.sqrt(occupiedWidth * occupiedWidth + occupiedHeight * occupiedHeight);

      // Connected-Edge Distance (M5, M8, Normalization)
      const edgeDistances: number[] = [];
      const normEdgeDistances: number[] = [];

      for (const e of edges) {
        const p1 = baselinePositions[e.source];
        const p2 = baselinePositions[e.target];
        if (p1 && p2) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          edgeDistances.push(dist);
          normEdgeDistances.push(occupiedGraphScale > 0 ? dist / occupiedGraphScale : 0);
        }
      }
      edgeDistances.sort((a, b) => a - b);
      normEdgeDistances.sort((a, b) => a - b);

      const edgeMin = percentile(edgeDistances, 0);
      const edgeMedian = percentile(edgeDistances, 0.5);
      const edgeP75 = percentile(edgeDistances, 0.75);
      const edgeP95 = percentile(edgeDistances, 0.95);
      const edgeP99 = percentile(edgeDistances, 0.99);
      const edgeMax = percentile(edgeDistances, 1.0);

      const normEdgeMin = percentile(normEdgeDistances, 0);
      const normEdgeMedian = percentile(normEdgeDistances, 0.5);
      const normEdgeP75 = percentile(normEdgeDistances, 0.75);
      const normEdgeP95 = percentile(normEdgeDistances, 0.95);
      const normEdgeP99 = percentile(normEdgeDistances, 0.99);
      const normEdgeMax = percentile(normEdgeDistances, 1.0);

      // Nearest-Neighbor Distance (M7)
      const nodeIds = Object.keys(baselinePositions);
      const nnDistances: number[] = [];
      for (let i = 0; i < nodeIds.length; i++) {
        const id1 = nodeIds[i];
        const p1 = baselinePositions[id1];
        let minDist = Infinity;
        for (let j = 0; j < nodeIds.length; j++) {
          if (i === j) continue;
          const id2 = nodeIds[j];
          const p2 = baselinePositions[id2];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) minDist = dist;
        }
        if (minDist !== Infinity) {
          nnDistances.push(minDist);
        }
      }
      nnDistances.sort((a, b) => a - b);

      const nnMedian = percentile(nnDistances, 0.5);
      const nnP75 = percentile(nnDistances, 0.75);
      const nnP95 = percentile(nnDistances, 0.95);
      const nnP99 = percentile(nnDistances, 0.99);
      const nnMax = percentile(nnDistances, 1.0);

      // Semantic-Neighbor Distance (M6)
      const featureDisc = discoverFeatures(nodes, edges);
      const featureGroups = new Map<string, string[]>();
      featureDisc.assignments.forEach((assignment, nodeId) => {
        const fId = assignment.primaryFeatureId;
        if (!featureGroups.has(fId)) featureGroups.set(fId, []);
        featureGroups.get(fId)!.push(nodeId);
      });

      const intraFeatureDists: number[] = [];
      featureGroups.forEach((members) => {
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const p1 = baselinePositions[members[i]];
            const p2 = baselinePositions[members[j]];
            if (p1 && p2) {
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              intraFeatureDists.push(Math.sqrt(dx * dx + dy * dy));
            }
          }
        }
      });
      intraFeatureDists.sort((a, b) => a - b);
      const intraFeatureMedian = percentile(intraFeatureDists, 0.5);
      const intraFeatureP95 = percentile(intraFeatureDists, 0.95);

      // Satellite Tethers (Tests & Fields to targets)
      const satelliteTetherDists: number[] = [];
      nodes.forEach(node => {
        if (node.behavior?.isTest || node.type === 'CustomField') {
          const pSat = baselinePositions[node.id];
          if (!pSat) return;
          // find connected target production node
          edges.forEach(e => {
            if (e.source === node.id || e.target === node.id) {
              const targetId = e.source === node.id ? e.target : e.source;
              const pTarget = baselinePositions[targetId];
              if (pTarget) {
                const dx = pSat.x - pTarget.x;
                const dy = pSat.y - pTarget.y;
                satelliteTetherDists.push(Math.sqrt(dx * dx + dy * dy));
              }
            }
          });
        }
      });
      satelliteTetherDists.sort((a, b) => a - b);
      const satelliteTetherMedian = percentile(satelliteTetherDists, 0.5);
      const satelliteTetherP95 = percentile(satelliteTetherDists, 0.95);

      // Component Separation (M9)
      let minComponentSeparation = Infinity;
      if (comps.length > 1) {
        const compBounds = comps.map(c => {
          let cMinX = Infinity, cMaxX = -Infinity, cMinY = Infinity, cMaxY = -Infinity;
          c.nodeIds.forEach(id => {
            const pos = baselinePositions[id];
            if (pos) {
              if (pos.x - nodeWidth / 2 < cMinX) cMinX = pos.x - nodeWidth / 2;
              if (pos.x + nodeWidth / 2 > cMaxX) cMaxX = pos.x + nodeWidth / 2;
              if (pos.y - nodeHeight / 2 < cMinY) cMinY = pos.y - nodeHeight / 2;
              if (pos.y + nodeHeight / 2 > cMaxY) cMaxY = pos.y + nodeHeight / 2;
            }
          });
          return { cMinX, cMaxX, cMinY, cMaxY };
        });

        for (let i = 0; i < compBounds.length; i++) {
          for (let j = i + 1; j < compBounds.length; j++) {
            const b1 = compBounds[i];
            const b2 = compBounds[j];
            const dx = Math.max(0, Math.max(b1.cMinX - b2.cMaxX, b2.cMinX - b1.cMaxX));
            const dy = Math.max(0, Math.max(b1.cMinY - b2.cMaxY, b2.cMinY - b1.cMaxY));
            const sep = Math.sqrt(dx * dx + dy * dy);
            if (sep < minComponentSeparation) {
              minComponentSeparation = sep;
            }
          }
        }
      }
      if (minComponentSeparation === Infinity) minComponentSeparation = 0;

      // AABB Collisions
      const aabbCollisions = evaluateAABBCollisions(baselinePositions, nodeWidth, nodeHeight);

      // Determinism Audit (3x Repeat Executions)
      let maxDeterminismDrift = 0;
      for (let run = 0; run < 3; run++) {
        const repeatRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
          architectureMode: 'hybrid',
          enableFeatureLayout: true,
          nodeWidth,
          nodeHeight,
        }).positions;

        for (const [id, pos] of Object.entries(baselinePositions)) {
          const rPos = repeatRes[id];
          if (rPos) {
            const drift = Math.sqrt((pos.x - rPos.x) ** 2 + (pos.y - rPos.y) ** 2);
            if (drift > maxDeterminismDrift) maxDeterminismDrift = drift;
          }
        }
      }

      // Input-Order Invariance Audit (3x Shuffled Permutations)
      let maxInputOrderDrift = 0;
      for (let run = 0; run < 3; run++) {
        const shuffledNodes = [...nodes];
        const shuffledEdges = [...edges];
        for (let i = shuffledNodes.length - 1; i > 0; i--) {
          const j = (i * 17 + run * 31) % (i + 1);
          const tmp = shuffledNodes[i];
          shuffledNodes[i] = shuffledNodes[j];
          shuffledNodes[j] = tmp;
        }
        for (let i = shuffledEdges.length - 1; i > 0; i--) {
          const j = (i * 13 + run * 29) % (i + 1);
          const tmp = shuffledEdges[i];
          shuffledEdges[i] = shuffledEdges[j];
          shuffledEdges[j] = tmp;
        }

        const shuffledRes = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, {
          architectureMode: 'hybrid',
          enableFeatureLayout: true,
          nodeWidth,
          nodeHeight,
        }).positions;

        for (const [id, pos] of Object.entries(baselinePositions)) {
          const sPos = shuffledRes[id];
          if (sPos) {
            const drift = Math.sqrt((pos.x - sPos.x) ** 2 + (pos.y - sPos.y) ** 2);
            if (drift > maxInputOrderDrift) maxInputOrderDrift = drift;
          }
        }
      }

      // Performance Audit (3 Runs Timing)
      const timings: number[] = [initialExecTime];
      for (let run = 0; run < 2; run++) {
        const t0 = performance.now();
        computeArchitectureLayoutWithMetadata(nodes, edges, {
          architectureMode: 'hybrid',
          enableFeatureLayout: true,
          nodeWidth,
          nodeHeight,
        });
        const t1 = performance.now();
        timings.push(t1 - t0);
      }
      timings.sort((a, b) => a - b);
      const perfMinMs = percentile(timings, 0);
      const perfMedianMs = percentile(timings, 0.5);
      const perfP95Ms = percentile(timings, 0.95);
      const perfMaxMs = percentile(timings, 1.0);

      const metrics: DatasetMetrics = {
        projectId,
        nodeCount: N,
        edgeCount: E,
        componentCount,
        maxDegree,
        graphDensity: Number(density.toFixed(4)),
        occupiedWidth: Math.round(occupiedWidth),
        occupiedHeight: Math.round(occupiedHeight),
        occupiedArea: Math.round(occupiedArea),
        emptySpaceRatio: Number(emptySpaceRatio.toFixed(4)),
        occupiedGraphScale: Math.round(occupiedGraphScale),
        edgeMin: Math.round(edgeMin),
        edgeMedian: Math.round(edgeMedian),
        edgeP75: Math.round(edgeP75),
        edgeP95: Math.round(edgeP95),
        edgeP99: Math.round(edgeP99),
        edgeMax: Math.round(edgeMax),
        normEdgeMin: Number(normEdgeMin.toFixed(4)),
        normEdgeMedian: Number(normEdgeMedian.toFixed(4)),
        normEdgeP75: Number(normEdgeP75.toFixed(4)),
        normEdgeP95: Number(normEdgeP95.toFixed(4)),
        normEdgeP99: Number(normEdgeP99.toFixed(4)),
        normEdgeMax: Number(normEdgeMax.toFixed(4)),
        nnMedian: Math.round(nnMedian),
        nnP75: Math.round(nnP75),
        nnP95: Math.round(nnP95),
        nnP99: Math.round(nnP99),
        nnMax: Math.round(nnMax),
        intraFeatureMedian: Math.round(intraFeatureMedian),
        intraFeatureP95: Math.round(intraFeatureP95),
        satelliteTetherMedian: Math.round(satelliteTetherMedian),
        satelliteTetherP95: Math.round(satelliteTetherP95),
        minComponentSeparation: Math.round(minComponentSeparation),
        aabbCollisions,
        determinismDrift: maxDeterminismDrift,
        inputOrderDrift: maxInputOrderDrift,
        perfMinMs: Number(perfMinMs.toFixed(2)),
        perfMedianMs: Number(perfMedianMs.toFixed(2)),
        perfP95Ms: Number(perfP95Ms.toFixed(2)),
        perfMaxMs: Number(perfMaxMs.toFixed(2)),
      };

      resultsMatrix.push(metrics);

      // Invariants assertions
      expect(aabbCollisions).toBe(0);
      expect(maxDeterminismDrift).toBe(0);
      expect(maxInputOrderDrift).toBe(0);
    }

    // Write full audit JSON for report inclusion
    const jsonDir = path.resolve(__dirname, '../../../audit-fixtures');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    const jsonPath = path.resolve(jsonDir, 'phase19-hybrid-audit-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(resultsMatrix, null, 2));
    console.log(`Phase 19 Audit results written to ${jsonPath}`);
  }, 600000);
});

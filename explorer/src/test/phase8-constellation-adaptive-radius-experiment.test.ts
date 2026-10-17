import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { adaptConstellation, type ConstellationData } from '../lib/adapters/constellation-adapter';
import crypto from 'crypto';

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

export interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
  radius: number;
  angleRad: number;
  angleDeg: number;
  hopDistance: number;
  ringIndex: number;
  label: string;
}

export interface RingGeometry {
  ringIndex: number;
  hopDistance: number;
  count: number;
  baselineRadius: number;
  minCollisionFreeRadius: number;
  adaptiveRadius: number;
  baselineChord: number;
  adaptiveChord: number;
}

export interface Stats {
  count: number;
  mean: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export interface ExperimentalLayoutResult {
  focalPosition: NodePosition | null;
  nodePositions: Record<string, NodePosition>;
  ringGeometries: RingGeometry[];
  occupiedBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    area: number;
  };
  emptySpacePercentBaselineViewBox: number; // ViewBox = 900x900 (810,000 px^2)
  emptySpacePercentOccupiedViewBox: number; // ViewBox fit tightly to bounding box + 40px margin
  aabbOverlaps: number;
  overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number }>;
  connectedEdgeLocality: Stats;
  nearestNeighborLocality: Stats;
  nodeOrderingHash: string;
}

const ORBITAL_NODE_DIAMETER = 24; // 24px
const FOCAL_NODE_DIAMETER = 36; // 36px
const DEFAULT_VIEWBOX_WIDTH = 900;
const DEFAULT_VIEWBOX_HEIGHT = 900;
const DEFAULT_BASE_RADIUS = 180;
const DEFAULT_RING_STEP = 150;

/**
 * Pure experimental layout harness for Constellation adaptive ring radius investigation.
 */
export function computeExperimentalConstellationLayout(
  data: ConstellationData,
  mode: 'A_BASELINE' | 'B_COLLISION_MIN' | 'C_CONTROLLED_INTER_RING',
  customOptions: {
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
    startAngleRad?: number;
  } = {}
): ExperimentalLayoutResult {
  const width = customOptions.width ?? DEFAULT_VIEWBOX_WIDTH;
  const height = customOptions.height ?? DEFAULT_VIEWBOX_HEIGHT;
  const cx = customOptions.cx ?? width / 2;
  const cy = customOptions.cy ?? height / 2;
  const startAngleRad = customOptions.startAngleRad ?? -Math.PI / 2;

  if (!data.focalNode) {
    return {
      focalPosition: null,
      nodePositions: {},
      ringGeometries: [],
      occupiedBoundingBox: { minX: cx, maxX: cx, minY: cy, maxY: cy, width: 0, height: 0, area: 0 },
      emptySpacePercentBaselineViewBox: 100,
      emptySpacePercentOccupiedViewBox: 100,
      aabbOverlaps: 0,
      overlappingPairs: [],
      connectedEdgeLocality: { count: 0, mean: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 },
      nearestNeighborLocality: { count: 0, mean: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 },
      nodeOrderingHash: '',
    };
  }

  const focalPosition: NodePosition = {
    nodeId: data.focalNode.id,
    x: cx,
    y: cy,
    radius: 0,
    angleRad: 0,
    angleDeg: 0,
    hopDistance: 0,
    ringIndex: 0,
    label: data.focalNode.displayName,
  };

  const nodePositions: Record<string, NodePosition> = {};
  nodePositions[data.focalNode.id] = focalPosition;

  // Node ordering sequence tracking
  const nodeSequence: string[] = [data.focalNode.id];

  const ringGeometries: RingGeometry[] = [];

  let previousRingRadius = 0;

  data.rings.forEach((ring) => {
    const hop = ring.hopDistance;
    const count = ring.totalCount;
    const baselineRadius = DEFAULT_BASE_RADIUS + (hop - 1) * DEFAULT_RING_STEP;

    // Minimum collision-free radius formula: R_min = D / (2 sin(PI / N))
    let minCollisionFreeRadius = 0;
    if (count >= 2) {
      const sinVal = Math.sin(Math.PI / count);
      minCollisionFreeRadius = ORBITAL_NODE_DIAMETER / (2 * sinVal);
    }

    let adaptiveRadius = baselineRadius;
    if (mode === 'A_BASELINE') {
      adaptiveRadius = baselineRadius;
    } else if (mode === 'B_COLLISION_MIN') {
      adaptiveRadius = Math.max(baselineRadius, minCollisionFreeRadius);
    } else if (mode === 'C_CONTROLLED_INTER_RING') {
      const requiredByMin = Math.max(baselineRadius, minCollisionFreeRadius);
      const requiredByInterRing = previousRingRadius + DEFAULT_RING_STEP;
      adaptiveRadius = Math.max(requiredByMin, requiredByInterRing);
    }

    previousRingRadius = adaptiveRadius;

    const baselineChord = count >= 2 ? 2 * baselineRadius * Math.sin(Math.PI / count) : count === 1 ? Infinity : 0;
    const adaptiveChord = count >= 2 ? 2 * adaptiveRadius * Math.sin(Math.PI / count) : count === 1 ? Infinity : 0;

    ringGeometries.push({
      ringIndex: ring.ringIndex,
      hopDistance: hop,
      count,
      baselineRadius,
      minCollisionFreeRadius: Number(minCollisionFreeRadius.toFixed(2)),
      adaptiveRadius: Number(adaptiveRadius.toFixed(2)),
      baselineChord: Number(baselineChord.toFixed(2)),
      adaptiveChord: Number(adaptiveChord.toFixed(2)),
    });

    if (count === 0) return;

    const angleStep = (2 * Math.PI) / count;

    ring.items.forEach((item, index) => {
      nodeSequence.push(item.nodeId);

      const angleRad = startAngleRad + index * angleStep;
      let angleDeg = (angleRad * 180) / Math.PI;
      while (angleDeg < 0) angleDeg += 360;
      angleDeg = angleDeg % 360;

      const x = cx + adaptiveRadius * Math.cos(angleRad);
      const y = cy + adaptiveRadius * Math.sin(angleRad);

      nodePositions[item.nodeId] = {
        nodeId: item.nodeId,
        x,
        y,
        radius: adaptiveRadius,
        angleRad,
        angleDeg,
        hopDistance: hop,
        ringIndex: ring.ringIndex,
        label: item.displayName,
      };
    });
  });

  const nodeOrderingHash = crypto.createHash('sha256').update(nodeSequence.join('|')).digest('hex');

  // Compute Occupied Bounding Box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  Object.values(nodePositions).forEach((pos) => {
    const nodeR = pos.hopDistance === 0 ? FOCAL_NODE_DIAMETER / 2 : ORBITAL_NODE_DIAMETER / 2;
    if (pos.x - nodeR < minX) minX = pos.x - nodeR;
    if (pos.x + nodeR > maxX) maxX = pos.x + nodeR;
    if (pos.y - nodeR < minY) minY = pos.y - nodeR;
    if (pos.y + nodeR > maxY) maxY = pos.y + nodeR;
  });

  const occWidth = maxX - minX;
  const occHeight = maxY - minY;
  const occArea = occWidth * occHeight;

  const viewBoxAreaBaseline = 900 * 900;
  const emptySpacePercentBaselineViewBox = Number((Math.max(0, 1 - occArea / viewBoxAreaBaseline) * 100).toFixed(2));

  // If bounding box exceeds viewBox, viewBox must expand to contain bounding box + 40px padding
  const requiredViewBoxWidth = Math.max(900, occWidth + 80);
  const requiredViewBoxHeight = Math.max(900, occHeight + 80);
  const requiredViewBoxArea = requiredViewBoxWidth * requiredViewBoxHeight;
  const emptySpacePercentOccupiedViewBox = Number((Math.max(0, 1 - occArea / requiredViewBoxArea) * 100).toFixed(2));

  // Perform pairwise geometric AABB collision checking
  const nodeIds = Object.keys(nodePositions);
  let aabbOverlaps = 0;
  const overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number }> = [];

  for (let i = 0; i < nodeIds.length; i++) {
    const idA = nodeIds[i];
    const posA = nodePositions[idA];
    const dimA = posA.hopDistance === 0 ? FOCAL_NODE_DIAMETER : ORBITAL_NODE_DIAMETER;
    const minXA = posA.x - dimA / 2;
    const maxXA = posA.x + dimA / 2;
    const minYA = posA.y - dimA / 2;
    const maxYA = posA.y + dimA / 2;

    for (let j = i + 1; j < nodeIds.length; j++) {
      const idB = nodeIds[j];
      const posB = nodePositions[idB];
      const dimB = posB.hopDistance === 0 ? FOCAL_NODE_DIAMETER : ORBITAL_NODE_DIAMETER;
      const minXB = posB.x - dimB / 2;
      const maxXB = posB.x + dimB / 2;
      const minYB = posB.y - dimB / 2;
      const maxYB = posB.y + dimB / 2;

      const xOverlap = Math.max(0, Math.min(maxXA, maxXB) - Math.max(minXA, minXB));
      const yOverlap = Math.max(0, Math.min(maxYA, maxYB) - Math.max(minYA, minYB));

      if (xOverlap > 1e-3 && yOverlap > 1e-3) {
        aabbOverlaps++;
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

  // Calculate Connected Edge Semantic Locality
  const edgeDistances: number[] = [];
  data.edges.forEach((edge) => {
    const pA = nodePositions[edge.source];
    const pB = nodePositions[edge.target];
    if (pA && pB) {
      const dx = pA.x - pB.x;
      const dy = pA.y - pB.y;
      edgeDistances.push(Math.sqrt(dx * dx + dy * dy));
    }
  });

  const connectedEdgeLocality = computeStats(edgeDistances);

  // Calculate Nearest-Neighbor Locality
  const nnDistances: number[] = [];
  for (let i = 0; i < nodeIds.length; i++) {
    const pA = nodePositions[nodeIds[i]];
    let minDist = Infinity;
    for (let j = 0; j < nodeIds.length; j++) {
      if (i === j) continue;
      const pB = nodePositions[nodeIds[j]];
      const dx = pA.x - pB.x;
      const dy = pA.y - pB.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
    if (minDist !== Infinity) {
      nnDistances.push(minDist);
    }
  }

  const nearestNeighborLocality = computeStats(nnDistances);

  return {
    focalPosition,
    nodePositions,
    ringGeometries,
    occupiedBoundingBox: {
      minX: Number(minX.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      minY: Number(minY.toFixed(2)),
      maxY: Number(maxY.toFixed(2)),
      width: Number(occWidth.toFixed(2)),
      height: Number(occHeight.toFixed(2)),
      area: Number(occArea.toFixed(2)),
    },
    emptySpacePercentBaselineViewBox,
    emptySpacePercentOccupiedViewBox,
    aabbOverlaps,
    overlappingPairs,
    connectedEdgeLocality,
    nearestNeighborLocality,
    nodeOrderingHash,
  };
}

function computeStats(arr: number[]): Stats {
  if (arr.length === 0) {
    return { count: 0, mean: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
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
    p75: Number(getQuantile(0.75).toFixed(2)),
    p90: Number(getQuantile(0.90).toFixed(2)),
    p95: Number(getQuantile(0.95).toFixed(2)),
    p99: Number(getQuantile(0.99).toFixed(2)),
    max: Number(sorted[count - 1].toFixed(2)),
  };
}

interface ScenarioSpec {
  datasetKey: string;
  focalNodeId: string;
  maxDepth: number;
  label: string;
}

const CANONICAL_SCENARIOS: ScenarioSpec[] = [
  { datasetKey: 'cst', focalNodeId: 'ApexClass:AccountController', maxDepth: 2, label: 'CST AccountController 2-hop' },
  { datasetKey: 'cst', focalNodeId: 'Object:Organization_Hierarchy__c', maxDepth: 3, label: 'CST Org_Hierarchy 3-hop' },
  { datasetKey: 'bqc', focalNodeId: 'Object:Bouquet_Order__c', maxDepth: 2, label: 'BQC Bouquet_Order__c 2-hop' },
  { datasetKey: 'bqc', focalNodeId: 'Object:Bouquet_Order__c', maxDepth: 3, label: 'BQC Bouquet_Order__c 3-hop' },
  { datasetKey: 'pbim', focalNodeId: 'Object:Maintenance_Request__c', maxDepth: 2, label: 'PBIM Maintenance_Request__c 2-hop' },
  { datasetKey: 'pbim', focalNodeId: 'Object:Maintenance_Request__c', maxDepth: 3, label: 'PBIM Maintenance_Request__c 3-hop' },
];

describe('Phase 8 — Constellation Adaptive-Radius Controlled Density Experiment', () => {
  const experimentalResultsSummary: Record<string, any> = {};

  CANONICAL_SCENARIOS.forEach((scen) => {
    test(`Scenario: ${scen.label}`, () => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const schema: ExplorerDataSchema = makeSchema(nodes, edges);

      const constData = adaptConstellation(schema, {
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        direction: 'both',
      });

      const resBaseline = computeExperimentalConstellationLayout(constData, 'A_BASELINE');
      const resAdaptMin = computeExperimentalConstellationLayout(constData, 'B_COLLISION_MIN');
      const resAdaptControlled = computeExperimentalConstellationLayout(constData, 'C_CONTROLLED_INTER_RING');

      // Verify angular ordering lock across all 3 models
      expect(resBaseline.nodeOrderingHash).toEqual(resAdaptMin.nodeOrderingHash);
      expect(resAdaptMin.nodeOrderingHash).toEqual(resAdaptControlled.nodeOrderingHash);

      experimentalResultsSummary[scen.label] = {
        label: scen.label,
        dataset: scen.datasetKey,
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        totalNodes: constData.summary.totalNodes,
        totalEdges: constData.summary.totalEdges,
        baseline: resBaseline,
        adaptiveMin: resAdaptMin,
        adaptiveControlled: resAdaptControlled,
      };
    });
  });

  test('Determinism & Input Order Invariance (10x Identical & 10x Shuffle)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'cst')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const schema: ExplorerDataSchema = makeSchema(nodes, edges);

    const constData = adaptConstellation(schema, {
      focalNodeId: 'Object:Organization_Hierarchy__c',
      maxDepth: 3,
    });

    const baseRes = computeExperimentalConstellationLayout(constData, 'C_CONTROLLED_INTER_RING');
    const baseHash = baseRes.nodeOrderingHash;
    const basePos = baseRes.nodePositions;

    // 10x Identical
    for (let run = 0; run < 10; run++) {
      const curRes = computeExperimentalConstellationLayout(constData, 'C_CONTROLLED_INTER_RING');
      expect(curRes.nodeOrderingHash).toEqual(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = curRes.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }

    // 10x Shuffle Input
    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);
      const shuffledSchema: ExplorerDataSchema = makeSchema(shuffledNodes, shuffledEdges);
      const curData = adaptConstellation(shuffledSchema, {
        focalNodeId: 'Object:Organization_Hierarchy__c',
        maxDepth: 3,
      });

      const curRes = computeExperimentalConstellationLayout(curData, 'C_CONTROLLED_INTER_RING');
      expect(curRes.nodeOrderingHash).toEqual(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = curRes.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }
  });

  test('Dump experiment summary JSON to root for analysis', () => {
    const artifactPath = path.resolve(process.cwd(), 'PHASE_8_EXPERIMENT_RESULTS_DUMP.json');
    fs.writeFileSync(artifactPath, JSON.stringify(experimentalResultsSummary, null, 2), 'utf8');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});

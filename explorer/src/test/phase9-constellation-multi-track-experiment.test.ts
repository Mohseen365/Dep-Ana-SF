import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { adaptConstellation, type ConstellationData } from '../lib/adapters/constellation-adapter';

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

export type Strategy = 'STRATEGY_A' | 'STRATEGY_B'; // A: Sequential, B: Interleaved

export interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
  radius: number;
  angleRad: number;
  angleDeg: number;
  hopDistance: number;
  ringIndex: number;
  trackIndex: number; // 0-based index of sub-track (0..T-1)
  label: string;
}

export interface TrackGeometry {
  ringIndex: number;
  hopDistance: number;
  trackIndex: number; // 0..T-1
  count: number;
  radius: number;
  minChord: number;
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

export interface MultiTrackLayoutResult {
  focalPosition: NodePosition | null;
  nodePositions: Record<string, NodePosition>;
  trackGeometries: TrackGeometry[];
  occupiedBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    area: number;
  };
  sameTrackOverlaps: number;
  crossTrackOverlaps: number;
  focalOverlaps: number;
  totalAabbOverlaps: number;
  overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number; type: 'SAME_TRACK' | 'CROSS_TRACK' | 'FOCAL' }>;
  crossTrackMinSeparation: {
    minDeltaR: number;
    minDx: number;
    minDy: number;
    minEuclidean: number;
  };
  connectedEdgeLocality: Stats;
  sameRingEdgeLengthStats: Stats;
  crossRingEdgeLengthStats: Stats;
  nodeOrderingHash: string;
}

const ORBITAL_NODE_DIAMETER = 24; // 24px
const FOCAL_NODE_DIAMETER = 36; // 36px
const DEFAULT_VIEWBOX_WIDTH = 900;
const DEFAULT_VIEWBOX_HEIGHT = 900;
const DEFAULT_BASE_RADIUS = 180;
const DEFAULT_RING_STEP = 150;

export interface MultiTrackOptions {
  trackCount: number; // T = 1, 2, 3, 4, 5, 6
  trackSpacing: number; // delta r = 20, 25, 30, 40, 50 px
  strategy: Strategy;
  radiusAlignment?: 'BASE_OUTWARD' | 'CENTERED';
  sparseThreshold?: number; // N <= 40 -> T = 1
}

export function computeMultiTrackConstellationLayout(
  data: ConstellationData,
  options: MultiTrackOptions,
  customViewport: { width?: number; height?: number; cx?: number; cy?: number; startAngleRad?: number } = {}
): MultiTrackLayoutResult {
  const width = customViewport.width ?? DEFAULT_VIEWBOX_WIDTH;
  const height = customViewport.height ?? DEFAULT_VIEWBOX_HEIGHT;
  const cx = customViewport.cx ?? width / 2;
  const cy = customViewport.cy ?? height / 2;
  const startAngleRad = customViewport.startAngleRad ?? -Math.PI / 2;

  const sparseThreshold = options.sparseThreshold ?? 40;
  const radiusAlignment = options.radiusAlignment ?? 'BASE_OUTWARD';

  if (!data.focalNode) {
    return {
      focalPosition: null,
      nodePositions: {},
      trackGeometries: [],
      occupiedBoundingBox: { minX: cx, maxX: cx, minY: cy, maxY: cy, width: 0, height: 0, area: 0 },
      sameTrackOverlaps: 0,
      crossTrackOverlaps: 0,
      focalOverlaps: 0,
      totalAabbOverlaps: 0,
      overlappingPairs: [],
      crossTrackMinSeparation: { minDeltaR: Infinity, minDx: Infinity, minDy: Infinity, minEuclidean: Infinity },
      connectedEdgeLocality: emptyStats(),
      sameRingEdgeLengthStats: emptyStats(),
      crossRingEdgeLengthStats: emptyStats(),
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
    trackIndex: 0,
    label: data.focalNode.displayName,
  };

  const nodePositions: Record<string, NodePosition> = {};
  nodePositions[data.focalNode.id] = focalPosition;

  const nodeSequence: string[] = [data.focalNode.id];
  const trackGeometries: TrackGeometry[] = [];

  data.rings.forEach((ring) => {
    const hop = ring.hopDistance;
    const ringNodes = ring.items;
    const N = ring.totalCount;
    const baseHopRadius = DEFAULT_BASE_RADIUS + (hop - 1) * DEFAULT_RING_STEP;

    if (N === 0) return;

    // Sparse view protection: if N <= sparseThreshold, enforce T = 1
    const effectiveT = N <= sparseThreshold ? 1 : options.trackCount;

    const baseCount = Math.floor(N / effectiveT);
    const remainder = N % effectiveT;
    const trackCounts: number[] = [];
    for (let t = 0; t < effectiveT; t++) {
      trackCounts.push(baseCount + (t < remainder ? 1 : 0));
    }

    const trackNodeLists: typeof ringNodes[] = Array.from({ length: effectiveT }, () => []);

    if (options.strategy === 'STRATEGY_A') {
      let idx = 0;
      for (let t = 0; t < effectiveT; t++) {
        const countForTrack = trackCounts[t];
        for (let c = 0; c < countForTrack; c++) {
          trackNodeLists[t].push(ringNodes[idx++]);
        }
      }
    } else {
      for (let i = 0; i < N; i++) {
        const t = i % effectiveT;
        trackNodeLists[t].push(ringNodes[i]);
      }
    }

    for (let t = 0; t < effectiveT; t++) {
      const trackItems = trackNodeLists[t];
      const count = trackItems.length;

      let trackRadius = baseHopRadius;
      if (effectiveT > 1) {
        if (radiusAlignment === 'BASE_OUTWARD') {
          trackRadius = baseHopRadius + t * options.trackSpacing;
        } else {
          trackRadius = baseHopRadius + (t - (effectiveT - 1) / 2) * options.trackSpacing;
        }
      }

      const minChord = count >= 2 ? 2 * trackRadius * Math.sin(Math.PI / count) : count === 1 ? Infinity : 0;

      trackGeometries.push({
        ringIndex: ring.ringIndex,
        hopDistance: hop,
        trackIndex: t,
        count,
        radius: Number(trackRadius.toFixed(2)),
        minChord: Number(minChord.toFixed(2)),
      });

      if (count === 0) continue;

      const angleStep = (2 * Math.PI) / count;

      trackItems.forEach((item, index) => {
        nodeSequence.push(item.nodeId);

        const angleRad = startAngleRad + index * angleStep;
        let angleDeg = (angleRad * 180) / Math.PI;
        while (angleDeg < 0) angleDeg += 360;
        angleDeg = angleDeg % 360;

        const x = cx + trackRadius * Math.cos(angleRad);
        const y = cy + trackRadius * Math.sin(angleRad);

        nodePositions[item.nodeId] = {
          nodeId: item.nodeId,
          x,
          y,
          radius: trackRadius,
          angleRad,
          angleDeg,
          hopDistance: hop,
          ringIndex: ring.ringIndex,
          trackIndex: t,
          label: item.displayName,
        };
      });
    }
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

  // Collision and Cross-Track Separation Analysis
  const nodeIds = Object.keys(nodePositions);
  let sameTrackOverlaps = 0;
  let crossTrackOverlaps = 0;
  let focalOverlaps = 0;
  const overlappingPairs: Array<{ nodeA: string; nodeB: string; distance: number; type: 'SAME_TRACK' | 'CROSS_TRACK' | 'FOCAL' }> = [];

  let minDeltaR = Infinity;
  let minDx = Infinity;
  let minDy = Infinity;
  let minEuclidean = Infinity;

  for (let i = 0; i < nodeIds.length; i++) {
    const idA = nodeIds[i];
    const posA = nodePositions[idA];
    const isFocalA = posA.hopDistance === 0;
    const dimA = isFocalA ? FOCAL_NODE_DIAMETER : ORBITAL_NODE_DIAMETER;

    for (let j = i + 1; j < nodeIds.length; j++) {
      const idB = nodeIds[j];
      const posB = nodePositions[idB];
      const isFocalB = posB.hopDistance === 0;
      const dimB = isFocalB ? FOCAL_NODE_DIAMETER : ORBITAL_NODE_DIAMETER;

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!isFocalA && !isFocalB && (posA.ringIndex !== posB.ringIndex || posA.trackIndex !== posB.trackIndex)) {
        const deltaR = Math.abs(posA.radius - posB.radius);
        if (deltaR < minDeltaR) minDeltaR = deltaR;
        if (dx < minDx) minDx = dx;
        if (dy < minDy) minDy = dy;
        if (dist < minEuclidean) minEuclidean = dist;
      }

      const reqClearance = (dimA + dimB) / 2;

      if (dx < reqClearance - 1e-3 && dy < reqClearance - 1e-3) {
        let type: 'SAME_TRACK' | 'CROSS_TRACK' | 'FOCAL' = 'CROSS_TRACK';
        if (isFocalA || isFocalB) {
          type = 'FOCAL';
          focalOverlaps++;
        } else if (posA.ringIndex === posB.ringIndex && posA.trackIndex === posB.trackIndex) {
          type = 'SAME_TRACK';
          sameTrackOverlaps++;
        } else {
          type = 'CROSS_TRACK';
          crossTrackOverlaps++;
        }

        overlappingPairs.push({
          nodeA: idA,
          nodeB: idB,
          distance: Number(dist.toFixed(2)),
          type,
        });
      }
    }
  }

  const connectedDistances: number[] = [];
  const sameRingEdgeLengths: number[] = [];
  const crossRingEdgeLengths: number[] = [];

  data.edges.forEach((edge) => {
    const pA = nodePositions[edge.source];
    const pB = nodePositions[edge.target];
    if (pA && pB) {
      const dx = pA.x - pB.x;
      const dy = pA.y - pB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      connectedDistances.push(dist);

      if (edge.isSameRing) {
        sameRingEdgeLengths.push(dist);
      } else {
        crossRingEdgeLengths.push(dist);
      }
    }
  });

  return {
    focalPosition,
    nodePositions,
    trackGeometries,
    occupiedBoundingBox: {
      minX: Number(minX.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      minY: Number(minY.toFixed(2)),
      maxY: Number(maxY.toFixed(2)),
      width: Number(occWidth.toFixed(2)),
      height: Number(occHeight.toFixed(2)),
      area: Number(occArea.toFixed(2)),
    },
    sameTrackOverlaps,
    crossTrackOverlaps,
    focalOverlaps,
    totalAabbOverlaps: sameTrackOverlaps + crossTrackOverlaps + focalOverlaps,
    overlappingPairs,
    crossTrackMinSeparation: {
      minDeltaR: Number(minDeltaR.toFixed(2)),
      minDx: Number(minDx.toFixed(2)),
      minDy: Number(minDy.toFixed(2)),
      minEuclidean: Number(minEuclidean.toFixed(2)),
    },
    connectedEdgeLocality: computeStats(connectedDistances),
    sameRingEdgeLengthStats: computeStats(sameRingEdgeLengths),
    crossRingEdgeLengthStats: computeStats(crossRingEdgeLengths),
    nodeOrderingHash,
  };
}

function emptyStats(): Stats {
  return { count: 0, mean: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
}

function computeStats(arr: number[]): Stats {
  if (arr.length === 0) return emptyStats();
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

describe('Phase 9 — Constellation Multi-Track Sub-Ring Capacity Controlled Experiment', () => {
  const summaryData: Record<string, any> = {};

  CANONICAL_SCENARIOS.forEach((scen) => {
    test(`Scenario Population Reproduction & Multi-Track Suite: ${scen.label}`, () => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const schema: ExplorerDataSchema = makeSchema(nodes, edges);

      const constData = adaptConstellation(schema, {
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        direction: 'both',
      });

      if (scen.label === 'CST AccountController 2-hop') {
        expect(constData.summary.totalNodes).toBe(37);
        expect(constData.rings[0].totalCount).toBe(3);
        expect(constData.rings[1].totalCount).toBe(33);
      } else if (scen.label === 'CST Org_Hierarchy 3-hop') {
        expect(constData.summary.totalNodes).toBe(205);
        expect(constData.rings[0].totalCount).toBe(29);
        expect(constData.rings[1].totalCount).toBe(120);
        expect(constData.rings[2].totalCount).toBe(55);
      } else if (scen.label === 'BQC Bouquet_Order__c 2-hop') {
        expect(constData.summary.totalNodes).toBe(134);
        expect(constData.rings[0].totalCount).toBe(35);
        expect(constData.rings[1].totalCount).toBe(98);
      } else if (scen.label === 'BQC Bouquet_Order__c 3-hop') {
        expect(constData.summary.totalNodes).toBe(169);
        expect(constData.rings[0].totalCount).toBe(35);
        expect(constData.rings[1].totalCount).toBe(98);
        expect(constData.rings[2].totalCount).toBe(35);
      } else if (scen.label === 'PBIM Maintenance_Request__c 2-hop') {
        expect(constData.summary.totalNodes).toBe(287);
        expect(constData.rings[0].totalCount).toBe(69);
        expect(constData.rings[1].totalCount).toBe(217);
      } else if (scen.label === 'PBIM Maintenance_Request__c 3-hop') {
        expect(constData.summary.totalNodes).toBe(415);
        expect(constData.rings[0].totalCount).toBe(69);
        expect(constData.rings[1].totalCount).toBe(217);
        expect(constData.rings[2].totalCount).toBe(128);
      }

      const matrixResults: any[] = [];
      const trackCounts = [1, 2, 3, 4, 5, 6];
      const trackSpacings = [20, 25, 30, 40, 50];
      const strategies: Strategy[] = ['STRATEGY_A', 'STRATEGY_B'];

      strategies.forEach((strategy) => {
        trackCounts.forEach((T) => {
          trackSpacings.forEach((spacing) => {
            const res = computeMultiTrackConstellationLayout(constData, {
              trackCount: T,
              trackSpacing: spacing,
              strategy,
              radiusAlignment: 'BASE_OUTWARD',
              sparseThreshold: 40,
            });

            matrixResults.push({
              strategy,
              T,
              spacing,
              sameTrackOverlaps: res.sameTrackOverlaps,
              crossTrackOverlaps: res.crossTrackOverlaps,
              focalOverlaps: res.focalOverlaps,
              totalOverlaps: res.totalAabbOverlaps,
              occupiedWidth: res.occupiedBoundingBox.width,
              occupiedHeight: res.occupiedBoundingBox.height,
              medianEdgeLocality: res.connectedEdgeLocality.median,
              p95EdgeLocality: res.connectedEdgeLocality.p95,
              maxEdgeLocality: res.connectedEdgeLocality.max,
              crossTrackMinSep: res.crossTrackMinSeparation,
              trackGeometries: res.trackGeometries,
              overlappingPairsCount: res.overlappingPairs.length,
            });
          });
        });
      });

      summaryData[scen.label] = {
        label: scen.label,
        summary: constData.summary,
        matrixResults,
      };
    });
  });

  test('Capacity Curve Evaluation', () => {
    const capacityCurve: any[] = [];
    const baseR = 330;
    const nodeD = 24;

    for (let T = 1; T <= 6; T++) {
      const maxNodesTrack1D = Math.floor(Math.PI / Math.asin(nodeD / (2 * baseR)));
      const totalSafeCapacity1D = T * maxNodesTrack1D;

      const maxNodesTrackAABB = Math.floor(Math.PI / Math.asin((nodeD * Math.SQRT2) / (2 * baseR)));
      const totalSafeCapacityAABB = T * maxNodesTrackAABB;

      capacityCurve.push({
        trackCount: T,
        maxNodesTrack1D,
        totalSafeCapacity1D,
        maxNodesTrackAABB,
        totalSafeCapacityAABB,
      });
    }

    summaryData['capacityCurve'] = capacityCurve;
  });

  test('Determinism and Input-Order Invariance (10x Identical & 10x Shuffle)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'pbim')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const schema: ExplorerDataSchema = makeSchema(nodes, edges);

    const constData = adaptConstellation(schema, {
      focalNodeId: 'Object:Maintenance_Request__c',
      maxDepth: 3,
    });

    const opt: MultiTrackOptions = {
      trackCount: 4,
      trackSpacing: 25,
      strategy: 'STRATEGY_A',
      sparseThreshold: 40,
    };

    const baseRes = computeMultiTrackConstellationLayout(constData, opt);
    const baseHash = baseRes.nodeOrderingHash;
    const basePos = baseRes.nodePositions;

    for (let run = 0; run < 10; run++) {
      const res = computeMultiTrackConstellationLayout(constData, opt);
      expect(res.nodeOrderingHash).toBe(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = res.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }

    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);
      const shuffledSchema: ExplorerDataSchema = makeSchema(shuffledNodes, shuffledEdges);
      const curData = adaptConstellation(shuffledSchema, {
        focalNodeId: 'Object:Maintenance_Request__c',
        maxDepth: 3,
      });

      const res = computeMultiTrackConstellationLayout(curData, opt);
      expect(res.nodeOrderingHash).toBe(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = res.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }
  });

  test('Dump multi-track experiment summary JSON for report generation', () => {
    const artifactPath = path.resolve(process.cwd(), 'PHASE_9_MULTI_TRACK_EXPERIMENT_DUMP.json');
    fs.writeFileSync(artifactPath, JSON.stringify(summaryData, null, 2), 'utf8');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});

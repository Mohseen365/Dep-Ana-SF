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

export interface AdjacentTrackAudit {
  ringA: number;
  trackA: number;
  radiusA: number;
  ringB: number;
  trackB: number;
  radiusB: number;
  radialSeparation: number;
  minDx: number;
  minDy: number;
  minEuclidean: number;
  aabbCollisions: number;
}

export interface ConstellationExperimentResult {
  focalPosition: NodePosition | null;
  nodePositions: Record<string, NodePosition>;
  trackGeometries: TrackGeometry[];
  ringBaseRadii: Record<number, number>;
  ringOuterRadii: Record<number, number>;
  interRingGaps: Record<string, number>; // e.g. "Ring1-2": gap_px
  occupiedBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    area: number;
  };
  impliedScaleFactor: number; // for 900x900 viewBox
  sameTrackOverlaps: number;
  crossTrackOverlaps: number;
  sameRingCrossTrackOverlaps: number;
  crossRingOverlaps: number;
  focalOverlaps: number;
  totalAabbOverlaps: number;
  overlappingPairs: Array<{
    nodeA: string;
    nodeB: string;
    distance: number;
    dx: number;
    dy: number;
    type: 'SAME_TRACK' | 'SAME_RING_CROSS_TRACK' | 'CROSS_RING' | 'FOCAL';
  }>;
  adjacentTrackAudits: AdjacentTrackAudit[];
  connectedEdgeLocality: Stats;
  sameRingEdgeLengthStats: Stats;
  crossRingEdgeLengthStats: Stats;
  nodeOrderingHash: string;
  executionTimeMs: number;
}

const ORBITAL_NODE_DIAMETER = 24; // 24px
const FOCAL_NODE_DIAMETER = 36; // 36px
const DEFAULT_VIEWBOX_WIDTH = 900;
const DEFAULT_VIEWBOX_HEIGHT = 900;
const DEFAULT_CX = 450;
const DEFAULT_CY = 450;
const DEFAULT_R1_BASE_RADIUS = 180;
const DEFAULT_RING_STEP = 150;
const DEFAULT_TRACK_SPACING = 40;

export type InterRingStepModel =
  | 'PHASE_11_FORMULA' // Model A: baseRadius(k) = 180 + sum_{i=1}^{k-1} (150 + (T_i - 1)*40)
  | 'MINIMUM_GAP_FORMULA' // Model B: baseRadius(k+1) = outerRadius(k) + S_k
  | 'FIXED_STEP_SWEEP'; // Model C: fixed step sweep across S in {100..160}

export interface Phase12ExperimentOptions {
  model: InterRingStepModel;
  trackCount: number; // T = 1, 2, 3, 4
  trackSpacing?: number; // delta r = 40
  strategy?: Strategy;
  fixedRingStep?: number; // for FIXED_STEP_SWEEP
  radialGapS?: number; // for MINIMUM_GAP_FORMULA
  perRingGapS?: Record<string, number>; // e.g. {"1-2": 110, "2-3": 120}
  sparseThreshold?: number; // N <= threshold -> T = 1
  perRingTrackCounts?: Record<number, number>; // Override T per ring
}

function emptyStats(): Stats {
  return { count: 0, mean: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
}

function calculateStats(numbers: number[]): Stats {
  if (!numbers || numbers.length === 0) return emptyStats();
  const sorted = [...numbers].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  const getPercentile = (p: number) => {
    if (count === 1) return sorted[0];
    const index = (p / 100) * (count - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= count) return sorted[count - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    count,
    mean,
    median: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    max: sorted[count - 1],
  };
}

export function computeConstellationLayoutPhase12(
  data: ConstellationData,
  options: Phase12ExperimentOptions,
  customViewport: { width?: number; height?: number; cx?: number; cy?: number; startAngleRad?: number } = {}
): ConstellationExperimentResult {
  const startTime = performance.now();
  const width = customViewport.width ?? DEFAULT_VIEWBOX_WIDTH;
  const height = customViewport.height ?? DEFAULT_VIEWBOX_HEIGHT;
  const cx = customViewport.cx ?? width / 2;
  const cy = customViewport.cy ?? height / 2;
  const startAngleRad = customViewport.startAngleRad ?? -Math.PI / 2;

  const sparseThreshold = options.sparseThreshold ?? 40;
  const trackSpacing = options.trackSpacing ?? DEFAULT_TRACK_SPACING;
  const strategy = options.strategy ?? 'STRATEGY_B';

  if (!data.focalNode) {
    return {
      focalPosition: null,
      nodePositions: {},
      trackGeometries: [],
      ringBaseRadii: {},
      ringOuterRadii: {},
      interRingGaps: {},
      occupiedBoundingBox: { minX: cx, maxX: cx, minY: cy, maxY: cy, width: 0, height: 0, area: 0 },
      impliedScaleFactor: 1.0,
      sameTrackOverlaps: 0,
      crossTrackOverlaps: 0,
      sameRingCrossTrackOverlaps: 0,
      crossRingOverlaps: 0,
      focalOverlaps: 0,
      totalAabbOverlaps: 0,
      overlappingPairs: [],
      adjacentTrackAudits: [],
      connectedEdgeLocality: emptyStats(),
      sameRingEdgeLengthStats: emptyStats(),
      crossRingEdgeLengthStats: emptyStats(),
      nodeOrderingHash: '',
      executionTimeMs: 0,
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
  const ringBaseRadii: Record<number, number> = {};
  const ringOuterRadii: Record<number, number> = {};
  const interRingGaps: Record<string, number> = {};

  let currentBaseRadius = DEFAULT_R1_BASE_RADIUS;

  data.rings.forEach((ring, index) => {
    const hop = ring.hopDistance;
    const N = ring.totalCount;

    // Determine effective track count T for this ring
    let effectiveT = options.trackCount;
    if (options.perRingTrackCounts && options.perRingTrackCounts[hop] !== undefined) {
      effectiveT = options.perRingTrackCounts[hop];
    } else if (N <= sparseThreshold) {
      effectiveT = 1;
    }

    if (index === 0) {
      currentBaseRadius = DEFAULT_R1_BASE_RADIUS;
    } else {
      const prevRing = data.rings[index - 1];
      const prevHop = prevRing.hopDistance;
      const prevN = prevRing.totalCount;
      let prevEffectiveT = options.trackCount;
      if (options.perRingTrackCounts && options.perRingTrackCounts[prevHop] !== undefined) {
        prevEffectiveT = options.perRingTrackCounts[prevHop];
      } else if (prevN <= sparseThreshold) {
        prevEffectiveT = 1;
      }

      const prevBaseR = ringBaseRadii[prevHop];
      const prevOuterR = prevBaseR + (prevEffectiveT - 1) * trackSpacing;

      if (options.model === 'PHASE_11_FORMULA') {
        const step = DEFAULT_RING_STEP + (prevEffectiveT - 1) * trackSpacing;
        currentBaseRadius = prevBaseR + step;
        interRingGaps[`Ring${prevHop}-${hop}`] = currentBaseRadius - prevOuterR;
      } else if (options.model === 'MINIMUM_GAP_FORMULA') {
        const key = `Ring${prevHop}-${hop}`;
        const gapS = options.perRingGapS?.[key] ?? options.radialGapS ?? 150;
        currentBaseRadius = prevOuterR + gapS;
        interRingGaps[key] = gapS;
      } else if (options.model === 'FIXED_STEP_SWEEP') {
        const fixedStep = options.fixedRingStep ?? DEFAULT_RING_STEP;
        currentBaseRadius = prevBaseR + fixedStep;
        interRingGaps[`Ring${prevHop}-${hop}`] = currentBaseRadius - prevOuterR;
      }
    }

    ringBaseRadii[hop] = currentBaseRadius;
    const outerR = currentBaseRadius + (effectiveT - 1) * trackSpacing;
    ringOuterRadii[hop] = outerR;

    if (N === 0) return;

    const baseCount = Math.floor(N / effectiveT);
    const remainder = N % effectiveT;
    const trackCounts: number[] = [];
    for (let t = 0; t < effectiveT; t++) {
      trackCounts.push(baseCount + (t < remainder ? 1 : 0));
    }

    const ringNodes = ring.items;
    const trackNodeLists: typeof ringNodes[] = Array.from({ length: effectiveT }, () => []);

    if (strategy === 'STRATEGY_A') {
      let idx = 0;
      for (let t = 0; t < effectiveT; t++) {
        const countForTrack = trackCounts[t];
        for (let c = 0; c < countForTrack; c++) {
          trackNodeLists[t].push(ringNodes[idx++]);
        }
      }
    } else {
      // STRATEGY_B Interleaved
      for (let i = 0; i < N; i++) {
        const t = i % effectiveT;
        trackNodeLists[t].push(ringNodes[i]);
      }
    }

    // Assign positions per sub-track
    for (let t = 0; t < effectiveT; t++) {
      const trackNodes = trackNodeLists[t];
      const trackCount = trackNodes.length;
      const trackRadius = currentBaseRadius + t * trackSpacing;

      if (trackCount === 0) continue;

      const angleStep = (2 * Math.PI) / trackCount;
      const minChord = 2 * trackRadius * Math.sin(Math.PI / trackCount);

      trackGeometries.push({
        ringIndex: hop,
        hopDistance: hop,
        trackIndex: t,
        count: trackCount,
        radius: trackRadius,
        minChord,
      });

      for (let i = 0; i < trackCount; i++) {
        const node = trackNodes[i];
        const angleRad = startAngleRad + i * angleStep;
        const angleDeg = (angleRad * 180) / Math.PI;
        const x = cx + trackRadius * Math.cos(angleRad);
        const y = cy + trackRadius * Math.sin(angleRad);

        const pos: NodePosition = {
          nodeId: node.nodeId,
          x,
          y,
          radius: trackRadius,
          angleRad,
          angleDeg,
          hopDistance: hop,
          ringIndex: hop,
          trackIndex: t,
          label: node.displayName,
        };

        nodePositions[node.nodeId] = pos;
        nodeSequence.push(node.nodeId);
      }
    }
  });

  // Calculate Bounding Box
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  Object.values(nodePositions).forEach((p) => {
    const halfD = p.hopDistance === 0 ? FOCAL_NODE_DIAMETER / 2 : ORBITAL_NODE_DIAMETER / 2;
    if (p.x - halfD < minX) minX = p.x - halfD;
    if (p.x + halfD > maxX) maxX = p.x + halfD;
    if (p.y - halfD < minY) minY = p.y - halfD;
    if (p.y + halfD > maxY) maxY = p.y + halfD;
  });

  const bboxWidth = Math.max(0, maxX - minX);
  const bboxHeight = Math.max(0, maxY - minY);
  const bboxArea = bboxWidth * bboxHeight;
  const maxDim = Math.max(bboxWidth, bboxHeight);
  const availableViewportSpan = 900 - 40; // 860px with 20px padding
  const impliedScaleFactor = maxDim > 0 ? Math.min(1.0, availableViewportSpan / maxDim) : 1.0;

  // Audit AABB Collisions
  // Predicate: dx < 24 && dy < 24 (for non-focal orbital nodes, diameter = 24px)
  // For focal node (diameter = 36px), focal collision if dx < (18 + 12) = 30 && dy < (18 + 12) = 30
  let sameTrackOverlaps = 0;
  let crossTrackOverlaps = 0;
  let sameRingCrossTrackOverlaps = 0;
  let crossRingOverlaps = 0;
  let focalOverlaps = 0;

  const overlappingPairs: Array<{
    nodeA: string;
    nodeB: string;
    distance: number;
    dx: number;
    dy: number;
    type: 'SAME_TRACK' | 'SAME_RING_CROSS_TRACK' | 'CROSS_RING' | 'FOCAL';
  }> = [];

  const allPosList = Object.values(nodePositions);
  for (let i = 0; i < allPosList.length; i++) {
    for (let j = i + 1; j < allPosList.length; j++) {
      const p1 = allPosList[i];
      const p2 = allPosList[j];

      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isP1Focal = p1.hopDistance === 0;
      const isP2Focal = p2.hopDistance === 0;

      if (isP1Focal || isP2Focal) {
        // Focal node (diameter 36) vs orbital (diameter 24)
        if (dx < 30 && dy < 30) {
          focalOverlaps++;
          overlappingPairs.push({
            nodeA: p1.nodeId,
            nodeB: p2.nodeId,
            distance: dist,
            dx,
            dy,
            type: 'FOCAL',
          });
        }
      } else {
        // Orbital node vs orbital node (diameter 24)
        if (dx < 24 && dy < 24) {
          if (p1.hopDistance === p2.hopDistance) {
            if (p1.trackIndex === p2.trackIndex) {
              sameTrackOverlaps++;
              overlappingPairs.push({
                nodeA: p1.nodeId,
                nodeB: p2.nodeId,
                distance: dist,
                dx,
                dy,
                type: 'SAME_TRACK',
              });
            } else {
              sameRingCrossTrackOverlaps++;
              crossTrackOverlaps++;
              overlappingPairs.push({
                nodeA: p1.nodeId,
                nodeB: p2.nodeId,
                distance: dist,
                dx,
                dy,
                type: 'SAME_RING_CROSS_TRACK',
              });
            }
          } else {
            crossRingOverlaps++;
            overlappingPairs.push({
              nodeA: p1.nodeId,
              nodeB: p2.nodeId,
              distance: dist,
              dx,
              dy,
              type: 'CROSS_RING',
            });
          }
        }
      }
    }
  }

  const totalAabbOverlaps =
    sameTrackOverlaps + sameRingCrossTrackOverlaps + crossRingOverlaps + focalOverlaps;

  // Audit Adjacent Track Geometry
  const adjacentTrackAudits: AdjacentTrackAudit[] = [];
  for (let k = 0; k < trackGeometries.length - 1; k++) {
    const tA = trackGeometries[k];
    const tB = trackGeometries[k + 1];

    if (tA.ringIndex === tB.ringIndex || tB.ringIndex === tA.ringIndex + 1) {
      const nodesA = allPosList.filter(
        (p) => p.ringIndex === tA.ringIndex && p.trackIndex === tA.trackIndex
      );
      const nodesB = allPosList.filter(
        (p) => p.ringIndex === tB.ringIndex && p.trackIndex === tB.trackIndex
      );

      let minDx = Infinity;
      let minDy = Infinity;
      let minEuclidean = Infinity;
      let aabbCount = 0;

      nodesA.forEach((nA) => {
        nodesB.forEach((nB) => {
          const dx = Math.abs(nA.x - nB.x);
          const dy = Math.abs(nA.y - nB.y);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (dx < minDx) minDx = dx;
          if (dy < minDy) minDy = dy;
          if (d < minEuclidean) minEuclidean = d;
          if (dx < 24 && dy < 24) aabbCount++;
        });
      });

      adjacentTrackAudits.push({
        ringA: tA.ringIndex,
        trackA: tA.trackIndex,
        radiusA: tA.radius,
        ringB: tB.ringIndex,
        trackB: tB.trackIndex,
        radiusB: tB.radius,
        radialSeparation: Math.abs(tB.radius - tA.radius),
        minDx,
        minDy,
        minEuclidean,
        aabbCollisions: aabbCount,
      });
    }
  }

  // Calculate Connected Edge Locality
  const allEdgeLengths: number[] = [];
  const sameRingEdgeLengths: number[] = [];
  const crossRingEdgeLengths: number[] = [];

  data.edges.forEach((e) => {
    const p1 = nodePositions[e.source];
    const p2 = nodePositions[e.target];
    if (p1 && p2) {
      const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      allEdgeLengths.push(dist);
      if (e.isSameRing) sameRingEdgeLengths.push(dist);
      if (e.isCrossRing) crossRingEdgeLengths.push(dist);
    }
  });

  const connectedEdgeLocality = calculateStats(allEdgeLengths);
  const sameRingEdgeLengthStats = calculateStats(sameRingEdgeLengths);
  const crossRingEdgeLengthStats = calculateStats(crossRingEdgeLengths);

  const hash = crypto
    .createHash('sha256')
    .update(
      nodeSequence
        .map((id) => {
          const p = nodePositions[id];
          return `${id}:${p.x.toFixed(6)},${p.y.toFixed(6)},${p.ringIndex},${p.trackIndex}`;
        })
        .join('|')
    )
    .digest('hex');

  const endTime = performance.now();

  return {
    focalPosition,
    nodePositions,
    trackGeometries,
    ringBaseRadii,
    ringOuterRadii,
    interRingGaps,
    occupiedBoundingBox: {
      minX,
      maxX,
      minY,
      maxY,
      width: bboxWidth,
      height: bboxHeight,
      area: bboxArea,
    },
    impliedScaleFactor,
    sameTrackOverlaps,
    crossTrackOverlaps,
    sameRingCrossTrackOverlaps,
    crossRingOverlaps,
    focalOverlaps,
    totalAabbOverlaps,
    overlappingPairs,
    adjacentTrackAudits,
    connectedEdgeLocality,
    sameRingEdgeLengthStats,
    crossRingEdgeLengthStats,
    nodeOrderingHash: hash,
    executionTimeMs: endTime - startTime,
  };
}

export const CANONICAL_SCENARIOS = [
  {
    label: 'CST AccountController 2-hop',
    datasetKey: 'cst',
    focalNodeId: 'ApexClass:AccountController',
    maxDepth: 2,
  },
  {
    label: 'CST Org_Hierarchy 3-hop',
    datasetKey: 'cst',
    focalNodeId: 'ApexClass:Org_Hierarchy',
    maxDepth: 3,
  },
  {
    label: 'BQC Bouquet_Order__c 2-hop',
    datasetKey: 'bqc',
    focalNodeId: 'Object:Bouquet_Order__c',
    maxDepth: 2,
  },
  {
    label: 'BQC Bouquet_Order__c 3-hop',
    datasetKey: 'bqc',
    focalNodeId: 'Object:Bouquet_Order__c',
    maxDepth: 3,
  },
  {
    label: 'PBIM Maintenance_Request__c 2-hop',
    datasetKey: 'pbim',
    focalNodeId: 'Object:Maintenance_Request__c',
    maxDepth: 2,
  },
  {
    label: 'PBIM Maintenance_Request__c 3-hop',
    datasetKey: 'pbim',
    focalNodeId: 'Object:Maintenance_Request__c',
    maxDepth: 3,
  },
];

describe('PHASE 12 — Constellation Minimum-Safe-Spacing and Sparse-Collision Reconciliation Test Suite', () => {
  const summaryResults: Record<string, any> = {};

  test('Canonical Population Verification & Setup', () => {
    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation(
        { nodes, edges },
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

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
    });
  });

  test('Experiment A: Minimum Inter-Ring Step Sweep (Fine Sweep S in {100..160})', () => {
    const sweepSteps = [
      100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160,
    ];
    const sweepResultsPerScenario: Record<string, Record<number, any>> = {};
    const empiricalMinSafeGapPerBoundary: Record<string, number> = {};

    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation(
        { nodes, edges },
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

      const scenarioStepResults: Record<number, any> = {};

      sweepSteps.forEach((gapS) => {
        const res = computeConstellationLayoutPhase12(constData, {
          model: 'MINIMUM_GAP_FORMULA',
          trackCount: 4,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          radialGapS: gapS,
          sparseThreshold: 30, // Using N<=30 sparse threshold to isolate inter-ring step
        });

        scenarioStepResults[gapS] = {
          totalOverlaps: res.totalAabbOverlaps,
          crossRingOverlaps: res.crossRingOverlaps,
          sameTrackOverlaps: res.sameTrackOverlaps,
          occupiedWidth: res.occupiedBoundingBox.width,
          occupiedHeight: res.occupiedBoundingBox.height,
          medianLocality: res.connectedEdgeLocality.median,
          p95Locality: res.connectedEdgeLocality.p95,
          maxLocality: res.connectedEdgeLocality.max,
        };
      });

      sweepResultsPerScenario[scen.label] = scenarioStepResults;
    });

    summaryResults['experimentA_fineSweep'] = sweepResultsPerScenario;
  });

  test('Experiment B: BQC Ring 1 N=35 Deep Audit (T in {1, 2, 3, 4})', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'bqc')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const constData = adaptConstellation(
      { nodes, edges },
      {
        focalNodeId: 'Object:Bouquet_Order__c',
        maxDepth: 3,
        direction: 'both',
      }
    );

    const bqcRing1Audit: Record<number, any> = {};

    [1, 2, 3, 4].forEach((T1) => {
      const res = computeConstellationLayoutPhase12(constData, {
        model: 'MINIMUM_GAP_FORMULA',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 0, // Force perRingTrackCounts override
        perRingTrackCounts: { 1: T1, 2: 4, 3: 4 },
        radialGapS: 120,
      });

      bqcRing1Audit[T1] = {
        T1,
        totalOverlaps: res.totalAabbOverlaps,
        sameTrackOverlaps: res.sameTrackOverlaps,
        crossTrackOverlaps: res.crossTrackOverlaps,
        crossRingOverlaps: res.crossRingOverlaps,
        focalOverlaps: res.focalOverlaps,
        overlappingPairs: res.overlappingPairs,
        occupiedWidth: res.occupiedBoundingBox.width,
        occupiedHeight: res.occupiedBoundingBox.height,
        occupiedArea: res.occupiedBoundingBox.area,
        medianLocality: res.connectedEdgeLocality.median,
        p95Locality: res.connectedEdgeLocality.p95,
        maxLocality: res.connectedEdgeLocality.max,
      };
    });

    summaryResults['bqcRing1Audit'] = bqcRing1Audit;

    // Verify key insight: T1 = 1 on N=35 yields same-track overlaps, while T1 >= 2 eliminates same-track overlaps!
    expect(bqcRing1Audit[1].sameTrackOverlaps).toBeGreaterThan(0);
    expect(bqcRing1Audit[2].sameTrackOverlaps).toBe(0);
  });

  test('Experiment B: Sparse Threshold Sweep N_threshold in {20, 25, 30, 35, 40, 45, 50}', () => {
    const thresholds = [20, 25, 30, 35, 40, 45, 50];
    const sparseSweepResults: Record<string, Record<number, any>> = {};

    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation(
        { nodes, edges },
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

      const scenarioThresholdResults: Record<number, any> = {};

      thresholds.forEach((thresh) => {
        const res = computeConstellationLayoutPhase12(constData, {
          model: 'MINIMUM_GAP_FORMULA',
          trackCount: 4,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          sparseThreshold: thresh,
          radialGapS: 120,
        });

        scenarioThresholdResults[thresh] = {
          sparseThreshold: thresh,
          totalOverlaps: res.totalAabbOverlaps,
          sameTrackOverlaps: res.sameTrackOverlaps,
          crossRingOverlaps: res.crossRingOverlaps,
          occupiedWidth: res.occupiedBoundingBox.width,
          occupiedHeight: res.occupiedBoundingBox.height,
          medianLocality: res.connectedEdgeLocality.median,
          p95Locality: res.connectedEdgeLocality.p95,
        };
      });

      sparseSweepResults[scen.label] = scenarioThresholdResults;
    });

    summaryResults['sparseThresholdSweep'] = sparseSweepResults;
  });

  test('Final Candidate Geometry Evaluation Across Canonical Matrix', () => {
    // Candidate 1: Phase 11 Model B (N<=40 -> T=1, Gap = 150 + (T-1)*40)
    // Candidate 2: Phase 12 Minimum-Gap S=120px with N_threshold=30 (N<=30 -> T=1)
    // Candidate 3: Phase 12 Adaptive Gap (S_1-2 = 100px, S_2-3 = 110px) with N_threshold=30
    const candidateComparison: Record<string, any> = {};

    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation(
        { nodes, edges },
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

      const cand1_Phase11 = computeConstellationLayoutPhase12(constData, {
        model: 'PHASE_11_FORMULA',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 40,
      });

      const cand2_MinGap120_Thresh30 = computeConstellationLayoutPhase12(constData, {
        model: 'MINIMUM_GAP_FORMULA',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 30,
        radialGapS: 120,
      });

      const cand3_MinGap100_Thresh30 = computeConstellationLayoutPhase12(constData, {
        model: 'MINIMUM_GAP_FORMULA',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 30,
        perRingGapS: { 'Ring1-2': 100, 'Ring2-3': 110 },
      });

      candidateComparison[scen.label] = {
        cand1_Phase11: {
          totalOverlaps: cand1_Phase11.totalAabbOverlaps,
          sameTrackOverlaps: cand1_Phase11.sameTrackOverlaps,
          crossRingOverlaps: cand1_Phase11.crossRingOverlaps,
          occupiedWidth: cand1_Phase11.occupiedBoundingBox.width,
          occupiedHeight: cand1_Phase11.occupiedBoundingBox.height,
          occupiedArea: cand1_Phase11.occupiedBoundingBox.area,
          medianLocality: cand1_Phase11.connectedEdgeLocality.median,
          p95Locality: cand1_Phase11.connectedEdgeLocality.p95,
          maxLocality: cand1_Phase11.connectedEdgeLocality.max,
        },
        cand2_MinGap120_Thresh30: {
          totalOverlaps: cand2_MinGap120_Thresh30.totalAabbOverlaps,
          sameTrackOverlaps: cand2_MinGap120_Thresh30.sameTrackOverlaps,
          crossRingOverlaps: cand2_MinGap120_Thresh30.crossRingOverlaps,
          occupiedWidth: cand2_MinGap120_Thresh30.occupiedBoundingBox.width,
          occupiedHeight: cand2_MinGap120_Thresh30.occupiedBoundingBox.height,
          occupiedArea: cand2_MinGap120_Thresh30.occupiedBoundingBox.area,
          medianLocality: cand2_MinGap120_Thresh30.connectedEdgeLocality.median,
          p95Locality: cand2_MinGap120_Thresh30.connectedEdgeLocality.p95,
          maxLocality: cand2_MinGap120_Thresh30.connectedEdgeLocality.max,
        },
        cand3_MinGap100_Thresh30: {
          totalOverlaps: cand3_MinGap100_Thresh30.totalAabbOverlaps,
          sameTrackOverlaps: cand3_MinGap100_Thresh30.sameTrackOverlaps,
          crossRingOverlaps: cand3_MinGap100_Thresh30.crossRingOverlaps,
          occupiedWidth: cand3_MinGap100_Thresh30.occupiedBoundingBox.width,
          occupiedHeight: cand3_MinGap100_Thresh30.occupiedBoundingBox.height,
          occupiedArea: cand3_MinGap100_Thresh30.occupiedBoundingBox.area,
          medianLocality: cand3_MinGap100_Thresh30.connectedEdgeLocality.median,
          p95Locality: cand3_MinGap100_Thresh30.connectedEdgeLocality.p95,
          maxLocality: cand3_MinGap100_Thresh30.connectedEdgeLocality.max,
        },
      };
    });

    summaryResults['candidateComparison'] = candidateComparison;
  });

  test('Determinism & Input-Order Invariance for Phase 12 Candidate (10x Run & 10x Shuffle)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'pbim')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const constData = adaptConstellation(
      { nodes, edges },
      {
        focalNodeId: 'Object:Maintenance_Request__c',
        maxDepth: 3,
        direction: 'both',
      }
    );

    const opt: Phase12ExperimentOptions = {
      model: 'MINIMUM_GAP_FORMULA',
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: 30,
      radialGapS: 120,
    };

    const baseRes = computeConstellationLayoutPhase12(constData, opt);
    const baseHash = baseRes.nodeOrderingHash;
    const basePos = baseRes.nodePositions;

    // 10x Identical Runs
    for (let run = 0; run < 10; run++) {
      const res = computeConstellationLayoutPhase12(constData, opt);
      expect(res.nodeOrderingHash).toBe(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = res.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }

    // 10x Shuffled Inputs
    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);
      const curData = adaptConstellation(
        { nodes: shuffledNodes, edges: shuffledEdges },
        {
          focalNodeId: 'Object:Maintenance_Request__c',
          maxDepth: 3,
          direction: 'both',
        }
      );

      const res = computeConstellationLayoutPhase12(curData, opt);
      expect(res.nodeOrderingHash).toBe(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = res.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }
  });

  test('Harness Performance Measurement across CST, BQC, PBIM', () => {
    const perfResults: Record<string, number> = {};

    DATASETS.forEach((ds) => {
      const { nodes, edges } = loadDataset(ds);
      const constData = adaptConstellation(
        { nodes, edges },
        {
          focalNodeId: nodes[0]?.id,
          maxDepth: 3,
          direction: 'both',
        }
      );

      const iterations = 50;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeConstellationLayoutPhase12(constData, {
          model: 'MINIMUM_GAP_FORMULA',
          trackCount: 4,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          sparseThreshold: 30,
          radialGapS: 120,
        });
      }
      const end = performance.now();
      perfResults[ds.key] = (end - start) / iterations;
    });

    summaryResults['harnessPerformance'] = perfResults;
    expect(perfResults['pbim']).toBeLessThan(50); // Fast harness execution < 50ms
  });

  test('Dump Phase 12 Experiment Summary Results JSON', () => {
    const artifactPath = path.resolve(process.cwd(), 'PHASE_12_EXPERIMENT_RESULTS_DUMP.json');
    fs.writeFileSync(artifactPath, JSON.stringify(summaryResults, null, 2), 'utf8');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});

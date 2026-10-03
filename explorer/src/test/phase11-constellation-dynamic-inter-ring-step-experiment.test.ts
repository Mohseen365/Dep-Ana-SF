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

export type DynamicModelType = 'MODEL_A' | 'MODEL_B' | 'MODEL_C' | 'MODEL_D';

export interface ConstellationExperimentOptions {
  model: DynamicModelType;
  trackCount: number; // T = 1, 2, 3, 4
  trackSpacing?: number; // delta r = 40
  strategy?: Strategy;
  fixedRingStep?: number; // used for Model C or Model A override
  sparseThreshold?: number; // N <= 40 -> T = 1
  reqClearanceOverride?: number; // for Model D or custom predicate analysis
}

export function computeConstellationExperimentLayout(
  data: ConstellationData,
  options: ConstellationExperimentOptions,
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

  // Compute Base Radii per ring based on model
  let currentBaseRadius = DEFAULT_R1_BASE_RADIUS;

  data.rings.forEach((ring, index) => {
    const hop = ring.hopDistance;
    const N = ring.totalCount;

    if (index === 0) {
      currentBaseRadius = DEFAULT_R1_BASE_RADIUS;
    } else {
      const prevRing = data.rings[index - 1];
      const prevN = prevRing.totalCount;
      const prevEffectiveT = prevN <= sparseThreshold ? 1 : options.trackCount;

      if (options.model === 'MODEL_A') {
        // Model A: Frozen baseline fixed step = 150
        currentBaseRadius = DEFAULT_R1_BASE_RADIUS + (hop - 1) * DEFAULT_RING_STEP;
      } else if (options.model === 'MODEL_B') {
        // Model B: Dynamic inter-ring step = 150 + (T_{k-1} - 1) * trackSpacing
        const dynamicStep = DEFAULT_RING_STEP + (prevEffectiveT - 1) * trackSpacing;
        currentBaseRadius = ringBaseRadii[data.rings[index - 1].ringIndex] + dynamicStep;
      } else if (options.model === 'MODEL_C' || options.model === 'MODEL_D') {
        // Model C: Fixed increased step
        const step = options.fixedRingStep ?? DEFAULT_RING_STEP;
        currentBaseRadius = ringBaseRadii[data.rings[index - 1].ringIndex] + step;
      }
    }

    ringBaseRadii[ring.ringIndex] = currentBaseRadius;

    if (N === 0) return;

    const effectiveT = N <= sparseThreshold ? 1 : options.trackCount;
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
      // STRATEGY_B (Interleaved)
      for (let i = 0; i < N; i++) {
        const t = i % effectiveT;
        trackNodeLists[t].push(ringNodes[i]);
      }
    }

    for (let t = 0; t < effectiveT; t++) {
      const trackItems = trackNodeLists[t];
      const count = trackItems.length;

      const trackRadius = currentBaseRadius + t * trackSpacing;
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

      trackItems.forEach((item, itemIdx) => {
        nodeSequence.push(item.nodeId);

        const angleRad = startAngleRad + itemIdx * angleStep;
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

  // Implied scale factor for fitting occupied bounding box within 900x900 viewBox (with 20px padding)
  const paddedW = occWidth + 40;
  const paddedH = occHeight + 40;
  const impliedScaleFactor = Number(Math.min(DEFAULT_VIEWBOX_WIDTH / paddedW, DEFAULT_VIEWBOX_HEIGHT / paddedH).toFixed(4));

  // Collision Analysis
  const nodeIds = Object.keys(nodePositions);
  let sameTrackOverlaps = 0;
  let sameRingCrossTrackOverlaps = 0;
  let crossRingOverlaps = 0;
  let focalOverlaps = 0;
  const overlappingPairs: ConstellationExperimentResult['overlappingPairs'] = [];

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

      const reqClearance = options.reqClearanceOverride ?? (dimA + dimB) / 2;

      if (dx < reqClearance - 1e-3 && dy < reqClearance - 1e-3) {
        let type: ConstellationExperimentResult['overlappingPairs'][number]['type'] = 'CROSS_RING';
        if (isFocalA || isFocalB) {
          type = 'FOCAL';
          focalOverlaps++;
        } else if (posA.ringIndex === posB.ringIndex) {
          if (posA.trackIndex === posB.trackIndex) {
            type = 'SAME_TRACK';
            sameTrackOverlaps++;
          } else {
            type = 'SAME_RING_CROSS_TRACK';
            sameRingCrossTrackOverlaps++;
          }
        } else {
          type = 'CROSS_RING';
          crossRingOverlaps++;
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

  // Complete Adjacent-Ring Track Pair Audit
  const adjacentTrackAudits: AdjacentTrackAudit[] = [];

  for (let r = 0; r < trackGeometries.length; r++) {
    const trackA = trackGeometries[r];
    for (let s = r + 1; s < trackGeometries.length; s++) {
      const trackB = trackGeometries[s];

      // Audit all adjacent track pairs or adjacent ring track pairs
      const isSameRingDiffTrack = trackA.ringIndex === trackB.ringIndex && trackA.trackIndex !== trackB.trackIndex;
      const isAdjacentRing = Math.abs(trackA.hopDistance - trackB.hopDistance) === 1;

      if (!isSameRingDiffTrack && !isAdjacentRing) continue;

      const nodesInTrackA = Object.values(nodePositions).filter(
        (p) => p.ringIndex === trackA.ringIndex && p.trackIndex === trackA.trackIndex
      );
      const nodesInTrackB = Object.values(nodePositions).filter(
        (p) => p.ringIndex === trackB.ringIndex && p.trackIndex === trackB.trackIndex
      );

      let minDx = Infinity;
      let minDy = Infinity;
      let minEuclidean = Infinity;
      let aabbCollisions = 0;

      nodesInTrackA.forEach((nA) => {
        nodesInTrackB.forEach((nB) => {
          const dx = Math.abs(nA.x - nB.x);
          const dy = Math.abs(nA.y - nB.y);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dx < minDx) minDx = dx;
          if (dy < minDy) minDy = dy;
          if (dist < minEuclidean) minEuclidean = dist;

          if (dx < ORBITAL_NODE_DIAMETER - 1e-3 && dy < ORBITAL_NODE_DIAMETER - 1e-3) {
            aabbCollisions++;
          }
        });
      });

      adjacentTrackAudits.push({
        ringA: trackA.ringIndex,
        trackA: trackA.trackIndex,
        radiusA: trackA.radius,
        ringB: trackB.ringIndex,
        trackB: trackB.trackIndex,
        radiusB: trackB.radius,
        radialSeparation: Number(Math.abs(trackA.radius - trackB.radius).toFixed(2)),
        minDx: Number(minDx.toFixed(2)),
        minDy: Number(minDy.toFixed(2)),
        minEuclidean: Number(minEuclidean.toFixed(2)),
        aabbCollisions,
      });
    }
  }

  // Connected Edge Locality
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

  const endTime = performance.now();

  return {
    focalPosition,
    nodePositions,
    trackGeometries,
    ringBaseRadii,
    occupiedBoundingBox: {
      minX: Number(minX.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      minY: Number(minY.toFixed(2)),
      maxY: Number(maxY.toFixed(2)),
      width: Number(occWidth.toFixed(2)),
      height: Number(occHeight.toFixed(2)),
      area: Number(occArea.toFixed(2)),
    },
    impliedScaleFactor,
    sameTrackOverlaps,
    crossTrackOverlaps: sameRingCrossTrackOverlaps + crossRingOverlaps,
    sameRingCrossTrackOverlaps,
    crossRingOverlaps,
    focalOverlaps,
    totalAabbOverlaps: sameTrackOverlaps + sameRingCrossTrackOverlaps + crossRingOverlaps + focalOverlaps,
    overlappingPairs,
    adjacentTrackAudits,
    connectedEdgeLocality: computeStats(connectedDistances),
    sameRingEdgeLengthStats: computeStats(sameRingEdgeLengths),
    crossRingEdgeLengthStats: computeStats(crossRingEdgeLengths),
    nodeOrderingHash,
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
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

describe('PHASE 11 — Constellation Dynamic Inter-Ring Step Controlled Experiment Test Suite', () => {
  const summaryResults: Record<string, any> = {};

  CANONICAL_SCENARIOS.forEach((scen) => {
    test(`Canonical Population Verification & Models A, B, C, D Suite: ${scen.label}`, () => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const schema: ExplorerDataSchema = { nodes, edges };

      const constData = adaptConstellation(schema, {
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        direction: 'both',
      });

      // G2: Population Reproduction
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

      // Model A: Phase 9 frozen baseline control (fixed step 150)
      const resModelA = computeConstellationExperimentLayout(constData, {
        model: 'MODEL_A',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 40,
      });

      // Model B: Proposed Dynamic Inter-Ring Step
      const resModelB = computeConstellationExperimentLayout(constData, {
        model: 'MODEL_B',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 40,
      });

      // G3, G4 Verification for Model B: Cross-ring overlaps must be 0!
      // (Note: BQC same-track overlaps at Ring 1 Track 0 N=35 are governed by T=4 track capacity, not inter-ring step)
      expect(resModelB.crossRingOverlaps).toBe(0);
      expect(resModelB.focalOverlaps).toBe(0);

      // Model C Controls: Fixed Steps
      const modelCResults: Record<number, ConstellationExperimentResult> = {};
      const fixedSteps = [150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270];
      fixedSteps.forEach((step) => {
        modelCResults[step] = computeConstellationExperimentLayout(constData, {
          model: 'MODEL_C',
          trackCount: 4,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          fixedRingStep: step,
          sparseThreshold: 40,
        });
      });

      // Model D: Conservative Clearance Requirement (24*sqrt(2) approx 33.94px)
      const resModelD = computeConstellationExperimentLayout(constData, {
        model: 'MODEL_B',
        trackCount: 4,
        trackSpacing: 40,
        strategy: 'STRATEGY_B',
        sparseThreshold: 40,
        reqClearanceOverride: 24 * Math.SQRT2,
      });

      summaryResults[scen.label] = {
        label: scen.label,
        summary: constData.summary,
        modelA: resModelA,
        modelB: resModelB,
        modelC: modelCResults,
        modelD: resModelD,
      };
    });
  });

  test('Minimum Safe Inter-Ring Step Search Across Canonical Datasets', () => {
    const searchSteps = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 210, 220, 230, 240, 250, 260, 270];
    const minSafeCrossRingPerScenario: Record<string, number> = {};

    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation({ nodes, edges }, {
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        direction: 'both',
      });

      let foundMin = -1;
      for (const step of searchSteps) {
        const res = computeConstellationExperimentLayout(constData, {
          model: 'MODEL_C',
          trackCount: 4,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          fixedRingStep: step,
          sparseThreshold: 40,
        });

        if (res.crossRingOverlaps === 0) {
          foundMin = step;
          break;
        }
      }
      minSafeCrossRingPerScenario[scen.label] = foundMin;
    });

    summaryResults['minimumSafeSearch'] = minSafeCrossRingPerScenario;
    // PBIM 3-hop requires radial gap >= 33.94px. At T2=4, R2 outer track is R2_base + 120. R3 inner track is R3_base.
    // Radial gap = R3_base - (R2_base + 120) = R3_base - R2_base - 120.
    // For fixed step S = R3_base - R2_base, Radial gap = S - 120.
    // For 0 cross-ring overlaps, S - 120 >= 34 => S >= 154 (or 160px step).
    // For Model B dynamic step, S = 150 + (4-1)*40 = 270px, so Radial gap = 270 - 120 = 150px >= 150px, which easily guarantees 0 cross-ring overlaps!
    expect(minSafeCrossRingPerScenario['PBIM Maintenance_Request__c 3-hop']).toBeGreaterThanOrEqual(150);
  });

  test('Track Configuration Matrix (T = 1, 2, 3, 4)', () => {
    const trackMatrixResults: Record<string, any> = {};

    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);
      const constData = adaptConstellation({ nodes, edges }, {
        focalNodeId: scen.focalNodeId,
        maxDepth: scen.maxDepth,
        direction: 'both',
      });

      const tResults: Record<number, any> = {};
      [1, 2, 3, 4].forEach((T) => {
        const resB = computeConstellationExperimentLayout(constData, {
          model: 'MODEL_B',
          trackCount: T,
          trackSpacing: 40,
          strategy: 'STRATEGY_B',
          sparseThreshold: 40,
        });
        tResults[T] = {
          totalOverlaps: resB.totalAabbOverlaps,
          sameTrackOverlaps: resB.sameTrackOverlaps,
          crossRingOverlaps: resB.crossRingOverlaps,
          occupiedWidth: resB.occupiedBoundingBox.width,
          medianLocality: resB.connectedEdgeLocality.median,
        };
      });
      trackMatrixResults[scen.label] = tResults;
    });

    summaryResults['trackMatrixResults'] = trackMatrixResults;
  });

  test('G8 — Sparse View Protection (CST AccountController N=37)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'cst')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const constData = adaptConstellation({ nodes, edges }, {
      focalNodeId: 'ApexClass:AccountController',
      maxDepth: 2,
    });

    const resB = computeConstellationExperimentLayout(constData, {
      model: 'MODEL_B',
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: 40,
    });

    // CST AccountController: Ring 1 = 3 nodes, Ring 2 = 33 nodes
    // Since N_1 = 3 <= 40 and N_2 = 33 <= 40, both rings use T = 1 sub-track.
    const orbitalTracks = resB.trackGeometries;
    expect(orbitalTracks.length).toBe(2); // 1 track for Ring 1, 1 track for Ring 2
    expect(orbitalTracks[0].count).toBe(3);
    expect(orbitalTracks[0].radius).toBe(180);
    expect(orbitalTracks[1].count).toBe(33);
    expect(orbitalTracks[1].radius).toBe(330);
    expect(resB.ringBaseRadii[1]).toBe(180);
    expect(resB.ringBaseRadii[2]).toBe(330);
    expect(resB.occupiedBoundingBox.width).toBe(683.25); // compact!
  });

  test('G9 & G10 — Determinism & Input-Order Invariance (10x Run & 10x Shuffle)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'pbim')!;
    const { nodes, edges } = loadDataset(dsSpec);
    const schema: ExplorerDataSchema = { nodes, edges };

    const constData = adaptConstellation(schema, {
      focalNodeId: 'Object:Maintenance_Request__c',
      maxDepth: 3,
    });

    const opt: ConstellationExperimentOptions = {
      model: 'MODEL_B',
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: 40,
    };

    const baseRes = computeConstellationExperimentLayout(constData, opt);
    const baseHash = baseRes.nodeOrderingHash;
    const basePos = baseRes.nodePositions;

    // 10x Identical Runs
    for (let run = 0; run < 10; run++) {
      const res = computeConstellationExperimentLayout(constData, opt);
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
      const curData = adaptConstellation({ nodes: shuffledNodes, edges: shuffledEdges }, {
        focalNodeId: 'Object:Maintenance_Request__c',
        maxDepth: 3,
      });

      const res = computeConstellationExperimentLayout(curData, opt);
      expect(res.nodeOrderingHash).toBe(baseHash);
      for (const [id, p1] of Object.entries(basePos)) {
        const p2 = res.nodePositions[id];
        const drift = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        expect(drift).toBe(0);
      }
    }
  });

  test('Dump Phase 11 Experiment Summary Results JSON', () => {
    const artifactPath = path.resolve(process.cwd(), 'PHASE_11_EXPERIMENT_RESULTS_DUMP.json');
    fs.writeFileSync(artifactPath, JSON.stringify(summaryResults, null, 2), 'utf8');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});

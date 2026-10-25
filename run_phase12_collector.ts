import * as fs from 'fs';
import * as path from 'path';
import { adaptConstellation } from './explorer/src/lib/adapters/constellation-adapter';
import {
  computeConstellationLayoutPhase12,
  CANONICAL_SCENARIOS,
  Phase12ExperimentOptions,
} from './explorer/src/test/phase12-constellation-minimum-safe-spacing-experiment.test';

const DATASETS = [
  { key: 'cst', file: 'explorer/public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'explorer/public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'explorer/public/projects/pbim/explorer-data.json' },
];

function loadDataset(key: string) {
  const ds = DATASETS.find(d => d.key === key)!;
  const fullPath = path.resolve(process.cwd(), ds.file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
}

const reportData: Record<string, any> = {};

// 1. Fine Step Sweep S in {100..160} across canonical matrix
const sweepSteps = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160];
const fineSweepData: Record<string, any> = {};

CANONICAL_SCENARIOS.forEach(scen => {
  const { nodes, edges } = loadDataset(scen.datasetKey);
  const constData = adaptConstellation({ nodes, edges }, {
    focalNodeId: scen.focalNodeId,
    maxDepth: scen.maxDepth,
    direction: 'both',
  });

  const stepRes: Record<number, any> = {};
  sweepSteps.forEach(gapS => {
    const res = computeConstellationLayoutPhase12(constData, {
      model: 'MINIMUM_GAP_FORMULA',
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      radialGapS: gapS,
      sparseThreshold: 30, // N<=30 sparse threshold
    });
    stepRes[gapS] = {
      totalOverlaps: res.totalAabbOverlaps,
      sameTrackOverlaps: res.sameTrackOverlaps,
      crossRingOverlaps: res.crossRingOverlaps,
      occupiedWidth: res.occupiedBoundingBox.width,
      occupiedHeight: res.occupiedBoundingBox.height,
      occupiedArea: res.occupiedBoundingBox.area,
      medianLocality: res.connectedEdgeLocality.median,
      p95Locality: res.connectedEdgeLocality.p95,
      maxLocality: res.connectedEdgeLocality.max,
      interRingGaps: res.interRingGaps,
      adjacentTrackAudits: res.adjacentTrackAudits,
    };
  });
  fineSweepData[scen.label] = stepRes;
});

reportData['fineSweepData'] = fineSweepData;

// 2. BQC Ring 1 N=35 Deep Audit
const { nodes: bqcNodes, edges: bqcEdges } = loadDataset('bqc');
const bqcConstData = adaptConstellation({ nodes: bqcNodes, edges: bqcEdges }, {
  focalNodeId: 'Object:Bouquet_Order__c',
  maxDepth: 3,
  direction: 'both',
});

const bqcAuditData: Record<number, any> = {};
[1, 2, 3, 4].forEach(T1 => {
  const res = computeConstellationLayoutPhase12(bqcConstData, {
    model: 'MINIMUM_GAP_FORMULA',
    trackCount: 4,
    trackSpacing: 40,
    strategy: 'STRATEGY_B',
    sparseThreshold: 0,
    perRingTrackCounts: { 1: T1, 2: 4, 3: 4 },
    radialGapS: 120,
  });

  bqcAuditData[T1] = {
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

reportData['bqcAuditData'] = bqcAuditData;

// 3. Sparse Threshold Sweep
const thresholds = [20, 25, 30, 35, 40, 45, 50];
const sparseSweepData: Record<string, any> = {};

CANONICAL_SCENARIOS.forEach(scen => {
  const { nodes, edges } = loadDataset(scen.datasetKey);
  const constData = adaptConstellation({ nodes, edges }, {
    focalNodeId: scen.focalNodeId,
    maxDepth: scen.maxDepth,
    direction: 'both',
  });

  const threshRes: Record<number, any> = {};
  thresholds.forEach(thresh => {
    const res = computeConstellationLayoutPhase12(constData, {
      model: 'MINIMUM_GAP_FORMULA',
      trackCount: 4,
      trackSpacing: 40,
      strategy: 'STRATEGY_B',
      sparseThreshold: thresh,
      radialGapS: 120,
    });
    threshRes[thresh] = {
      sparseThreshold: thresh,
      totalOverlaps: res.totalAabbOverlaps,
      sameTrackOverlaps: res.sameTrackOverlaps,
      crossRingOverlaps: res.crossRingOverlaps,
      occupiedWidth: res.occupiedBoundingBox.width,
      occupiedHeight: res.occupiedBoundingBox.height,
      occupiedArea: res.occupiedBoundingBox.area,
      medianLocality: res.connectedEdgeLocality.median,
      p95Locality: res.connectedEdgeLocality.p95,
      maxLocality: res.connectedEdgeLocality.max,
      tPerRing: constData.rings.map(r => r.totalCount <= thresh ? 1 : 4),
    };
  });
  sparseSweepData[scen.label] = threshRes;
});

reportData['sparseSweepData'] = sparseSweepData;

// 4. Candidate Geometry Matrix (Phase 7 Baseline, Phase 9, Phase 11 Model B, Phase 12 Candidate S=120/Thresh=30)
const canonicalMatrix: Record<string, any> = {};

CANONICAL_SCENARIOS.forEach(scen => {
  const { nodes, edges } = loadDataset(scen.datasetKey);
  const constData = adaptConstellation({ nodes, edges }, {
    focalNodeId: scen.focalNodeId,
    maxDepth: scen.maxDepth,
    direction: 'both',
  });

  // Phase 9 Multi-Track Baseline (Fixed step 150, T=4, Thresh=40)
  const resPhase9 = computeConstellationLayoutPhase12(constData, {
    model: 'FIXED_STEP_SWEEP',
    fixedRingStep: 150,
    trackCount: 4,
    trackSpacing: 40,
    strategy: 'STRATEGY_B',
    sparseThreshold: 40,
  });

  // Phase 11 Model B Baseline (Dynamic step = 150 + (T-1)*40, T=4, Thresh=40)
  const resPhase11 = computeConstellationLayoutPhase12(constData, {
    model: 'PHASE_11_FORMULA',
    trackCount: 4,
    trackSpacing: 40,
    strategy: 'STRATEGY_B',
    sparseThreshold: 40,
  });

  // Phase 12 Candidate (S=120px gap, T=4, Thresh=30)
  const resPhase12 = computeConstellationLayoutPhase12(constData, {
    model: 'MINIMUM_GAP_FORMULA',
    trackCount: 4,
    trackSpacing: 40,
    strategy: 'STRATEGY_B',
    sparseThreshold: 30,
    radialGapS: 120,
  });

  canonicalMatrix[scen.label] = {
    summary: {
      totalNodes: constData.summary.totalNodes,
      ringPopulations: constData.rings.map(r => r.totalCount),
    },
    phase9: {
      tPerRing: constData.rings.map(r => r.totalCount <= 40 ? 1 : 4),
      baseRadii: resPhase9.ringBaseRadii,
      totalOverlaps: resPhase9.totalAabbOverlaps,
      sameTrackOverlaps: resPhase9.sameTrackOverlaps,
      crossRingOverlaps: resPhase9.crossRingOverlaps,
      occupiedWidth: resPhase9.occupiedBoundingBox.width,
      occupiedHeight: resPhase9.occupiedBoundingBox.height,
      occupiedArea: resPhase9.occupiedBoundingBox.area,
      medianLocality: resPhase9.connectedEdgeLocality.median,
      p95Locality: resPhase9.connectedEdgeLocality.p95,
      maxLocality: resPhase9.connectedEdgeLocality.max,
    },
    phase11: {
      tPerRing: constData.rings.map(r => r.totalCount <= 40 ? 1 : 4),
      baseRadii: resPhase11.ringBaseRadii,
      totalOverlaps: resPhase11.totalAabbOverlaps,
      sameTrackOverlaps: resPhase11.sameTrackOverlaps,
      crossRingOverlaps: resPhase11.crossRingOverlaps,
      occupiedWidth: resPhase11.occupiedBoundingBox.width,
      occupiedHeight: resPhase11.occupiedBoundingBox.height,
      occupiedArea: resPhase11.occupiedBoundingBox.area,
      medianLocality: resPhase11.connectedEdgeLocality.median,
      p95Locality: resPhase11.connectedEdgeLocality.p95,
      maxLocality: resPhase11.connectedEdgeLocality.max,
    },
    phase12: {
      tPerRing: constData.rings.map(r => r.totalCount <= 30 ? 1 : 4),
      baseRadii: resPhase12.ringBaseRadii,
      outerRadii: resPhase12.ringOuterRadii,
      interRingGaps: resPhase12.interRingGaps,
      totalOverlaps: resPhase12.totalAabbOverlaps,
      sameTrackOverlaps: resPhase12.sameTrackOverlaps,
      crossRingOverlaps: resPhase12.crossRingOverlaps,
      occupiedWidth: resPhase12.occupiedBoundingBox.width,
      occupiedHeight: resPhase12.occupiedBoundingBox.height,
      occupiedArea: resPhase12.occupiedBoundingBox.area,
      widthRatioVsPhase9: resPhase12.occupiedBoundingBox.width / resPhase9.occupiedBoundingBox.width,
      heightRatioVsPhase9: resPhase12.occupiedBoundingBox.height / resPhase9.occupiedBoundingBox.height,
      areaRatioVsPhase9: resPhase12.occupiedBoundingBox.area / resPhase9.occupiedBoundingBox.area,
      widthRatioVsPhase11: resPhase12.occupiedBoundingBox.width / resPhase11.occupiedBoundingBox.width,
      heightRatioVsPhase11: resPhase12.occupiedBoundingBox.height / resPhase11.occupiedBoundingBox.height,
      areaRatioVsPhase11: resPhase12.occupiedBoundingBox.area / resPhase11.occupiedBoundingBox.area,
      medianLocality: resPhase12.connectedEdgeLocality.median,
      p95Locality: resPhase12.connectedEdgeLocality.p95,
      maxLocality: resPhase12.connectedEdgeLocality.max,
    },
  };
});

reportData['canonicalMatrix'] = canonicalMatrix;

fs.writeFileSync('phase12_collected_metrics.json', JSON.stringify(reportData, null, 2), 'utf8');
console.log('Successfully generated phase12_collected_metrics.json');

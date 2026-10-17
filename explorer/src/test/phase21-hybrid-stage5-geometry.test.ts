import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  isFieldNode,
} from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
} from '../lib/layout/global-layout';
import type { ArchitectureLayer } from '../lib/layout/types';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from '../lib/layout/centrality';
import { placeSatellites } from '../lib/layout/satellites';
import {
  packComponentPositions,
  calculateLocalComponentBounds,
  type ComponentLocalLayout,
} from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Real Project Data Loader with Provenance Guard
 */
export function loadRealProjectData(projectId: 'cloud-spend-tracker' | 'pbim'): {
  projectId: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  analyzePath: string;
  publicPath: string;
  sha256: string;
} {
  const rootDir = path.resolve(__dirname, '../../..');
  const analyzePath = path.join(
    rootDir,
    `analyze/projects/${projectId}/explorer-data.json`
  );
  const publicPath = path.join(
    rootDir,
    `explorer/public/projects/${projectId}/explorer-data.json`
  );

  if (!fs.existsSync(analyzePath) || !fs.existsSync(publicPath)) {
    throw new Error(
      `REAL_PROJECT_LOAD_FAILURE: Missing dataset files for project '${projectId}'`
    );
  }

  const aBuf = fs.readFileSync(analyzePath);
  const pBuf = fs.readFileSync(publicPath);
  const aHash = crypto.createHash('sha256').update(aBuf).digest('hex');
  const pHash = crypto.createHash('sha256').update(pBuf).digest('hex');

  if (aHash !== pHash) {
    throw new Error(
      `REAL_PROJECT_LOAD_FAILURE: Dataset SHA-256 mismatch for project '${projectId}'`
    );
  }

  const raw = JSON.parse(aBuf.toString());
  const nodes: ExplorerNode[] = raw.nodes || [];
  const edges: ExplorerEdge[] = raw.edges || [];

  const expectedScale = projectId === 'cloud-spend-tracker'
    ? { nodes: 240, edges: 1024 }
    : { nodes: 528, edges: 2063 };

  if (nodes.length !== expectedScale.nodes || edges.length !== expectedScale.edges) {
    throw new Error(
      `REAL_PROJECT_LOAD_FAILURE: Scale mismatch for '${projectId}'. Expected N=${expectedScale.nodes}, E=${expectedScale.edges}, got N=${nodes.length}, E=${edges.length}`
    );
  }

  return {
    projectId,
    nodes,
    edges,
    analyzePath,
    publicPath,
    sha256: aHash,
  };
}

export interface MetricSummary {
  projectId: string;
  m1_occupiedWidth: number;
  m2_occupiedHeight: number;
  m3_occupiedArea: number;
  m4_emptySpaceRatio: number;
  m5_connectedDist: {
    p0: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
    p100: number;
  };
  m6_semanticDist: {
    p50: number;
    p95: number;
    p100: number;
  };
  m7_nearestDist: {
    p50: number;
    p95: number;
    p100: number;
  };
  aabbCollisions: number;
  nodeCount: number;
  edgeCount: number;
}

export function calculateMetrics(
  projectId: string,
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>,
  featureMap?: Map<string, string>
): MetricSummary {
  const validNodeIds = Object.keys(positions).filter((id) => positions[id]);
  if (validNodeIds.length === 0) {
    return {
      projectId,
      m1_occupiedWidth: 0,
      m2_occupiedHeight: 0,
      m3_occupiedArea: 0,
      m4_emptySpaceRatio: 1,
      m5_connectedDist: { p0: 0, p50: 0, p75: 0, p95: 0, p99: 0, p100: 0 },
      m6_semanticDist: { p50: 0, p95: 0, p100: 0 },
      m7_nearestDist: { p50: 0, p95: 0, p100: 0 },
      aabbCollisions: 0,
      nodeCount: 0,
      edgeCount: edges.length,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  validNodeIds.forEach((id) => {
    const pos = positions[id];
    const left = pos.x - NODE_WIDTH / 2;
    const right = pos.x + NODE_WIDTH / 2;
    const top = pos.y - NODE_HEIGHT / 2;
    const bottom = pos.y + NODE_HEIGHT / 2;

    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  });

  const occupiedWidth = maxX - minX;
  const occupiedHeight = maxY - minY;
  const occupiedArea = occupiedWidth * occupiedHeight;
  const totalNodeArea = validNodeIds.length * NODE_WIDTH * NODE_HEIGHT;
  const emptySpaceRatio =
    occupiedArea > 0 ? 1 - totalNodeArea / occupiedArea : 0;

  // M5: Connected Edge Distances
  const edgeDists: number[] = [];
  edges.forEach((e) => {
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      edgeDists.push(dist);
    }
  });
  edgeDists.sort((a, b) => a - b);

  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.min(
      arr.length - 1,
      Math.max(0, Math.floor((p / 100) * arr.length))
    );
    return Math.round(arr[idx]);
  };

  const m5 = {
    p0: getPercentile(edgeDists, 0),
    p50: getPercentile(edgeDists, 50),
    p75: getPercentile(edgeDists, 75),
    p95: getPercentile(edgeDists, 95),
    p99: getPercentile(edgeDists, 99),
    p100: edgeDists.length > 0 ? Math.round(edgeDists[edgeDists.length - 1]) : 0,
  };

  // M6: Semantic Neighbor Distances
  const semanticDists: number[] = [];
  if (featureMap) {
    const featureGroups = new Map<string, string[]>();
    featureMap.forEach((featureId, nodeId) => {
      if (positions[nodeId]) {
        if (!featureGroups.has(featureId)) featureGroups.set(featureId, []);
        featureGroups.get(featureId)!.push(nodeId);
      }
    });

    featureGroups.forEach((members) => {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const p1 = positions[members[i]];
          const p2 = positions[members[j]];
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          semanticDists.push(dist);
        }
      }
    });
  }
  semanticDists.sort((a, b) => a - b);

  const m6 = {
    p50: getPercentile(semanticDists, 50),
    p95: getPercentile(semanticDists, 95),
    p100:
      semanticDists.length > 0
        ? Math.round(semanticDists[semanticDists.length - 1])
        : 0,
  };

  // M7: Nearest Neighbor Distances
  const nearestDists: number[] = [];
  const nodeArray = validNodeIds.map((id) => ({ id, ...positions[id] }));
  nodeArray.forEach((n1) => {
    let minD = Infinity;
    nodeArray.forEach((n2) => {
      if (n1.id !== n2.id) {
        const d = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
        if (d < minD) minD = d;
      }
    });
    if (minD !== Infinity) nearestDists.push(minD);
  });
  nearestDists.sort((a, b) => a - b);

  const m7 = {
    p50: getPercentile(nearestDists, 50),
    p95: getPercentile(nearestDists, 95),
    p100:
      nearestDists.length > 0
        ? Math.round(nearestDists[nearestDists.length - 1])
        : 0,
  };

  // AABB Collisions
  let aabbCollisions = 0;
  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const a = nodeArray[i];
      const b = nodeArray[j];
      const overlapX = Math.abs(a.x - b.x) < NODE_WIDTH - 1e-3;
      const overlapY = Math.abs(a.y - b.y) < NODE_HEIGHT - 1e-3;
      if (overlapX && overlapY) {
        aabbCollisions++;
      }
    }
  }

  return {
    projectId,
    m1_occupiedWidth: Math.round(occupiedWidth),
    m2_occupiedHeight: Math.round(occupiedHeight),
    m3_occupiedArea: Math.round(occupiedArea),
    m4_emptySpaceRatio: Math.round(emptySpaceRatio * 10000) / 10000,
    m5_connectedDist: m5,
    m6_semanticDist: m6,
    m7_nearestDist: m7,
    aabbCollisions,
    nodeCount: validNodeIds.length,
    edgeCount: edges.length,
  };
}

export type CandidateType =
  | 'Baseline'
  | 'CandidateA_BandCompaction'
  | 'CandidateB_FeatureCohesiveLayerPacking'
  | 'CandidateC_AdaptiveBoundedLayerGaps'
  | 'CandidateD_Constrained2DPlacement'
  | 'Combo_A_plus_B'
  | 'Combo_A_plus_C'
  | 'Combo_B_plus_C'
  | 'Combo_A_plus_B_plus_C';

export interface ExperimentInterventions {
  candidateType?: CandidateType;
  bypassStage8Bridge?: boolean;
  bypassStage9Satellite?: boolean;
  neutralizeStage10Packing?: boolean;
  neutralizeStage11Collision?: boolean;
}

export function runPhase21Stage5ExperimentPipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  interventions: ExperimentInterventions = {}
): {
  stageSnapshots: Record<string, Record<string, { x: number; y: number }>>;
  finalPositions: Record<string, { x: number; y: number }>;
  featureMap: Map<string, string>;
  layerMap: Map<string, any>;
} {
  const candidateType = interventions.candidateType || 'Baseline';
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  const knownNodeIds = new Set(safeNodes.map((n) => n.id));
  safeEdges.forEach((e) => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
  });

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Stage 1: Base Analysis
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  // Stage 2: Layer Classification
  const layerMap = new Map<string, any>();
  safeNodes.forEach((node) => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  // Stage 3: Domain Discovery
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  // Stage 4: Centrality Analysis
  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

  // Stage 3.5 & 4: Feature Discovery
  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, {
    index,
    analysis,
    layerMap,
    domainMap,
  });

  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });
  safeNodes.forEach((node) => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  // Stage 5: Global Feature Layout & Candidate Interventions
  let targetRowWidthOverride: number | undefined = undefined;
  if (
    candidateType === 'CandidateA_BandCompaction' ||
    candidateType === 'Combo_A_plus_B' ||
    candidateType === 'Combo_A_plus_C' ||
    candidateType === 'Combo_A_plus_B_plus_C'
  ) {
    targetRowWidthOverride = 3600;
  }

  const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing: 380,
    layerSpacing: 250,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    analysis,
    layerMap,
    domainMap,
    domainDiscovery,
    featureDiscovery,
    featureMap,
    index,
    targetRowWidthOverride,
  });

  let activeFeatureLayerYMap = { ...featureLayoutResult.featureLayerYMap };

  // Candidate Family Interventions on Stage 5 featureLayerYMap & featureRegions
  if (
    candidateType === 'CandidateA_BandCompaction' ||
    candidateType === 'Combo_A_plus_B' ||
    candidateType === 'Combo_A_plus_C' ||
    candidateType === 'Combo_A_plus_B_plus_C'
  ) {
    const compactedYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const origBase = orig.presentation;
      const compactedBase = 100 + (origBase - 100) * 0.35;
      compactedYMap[featId] = {
        presentation: compactedBase,
        application: compactedBase + (orig.application - origBase) * 0.5,
        domain: compactedBase + (orig.domain - origBase) * 0.5,
        schema: compactedBase + (orig.schema - origBase) * 0.5,
      };
    });
    activeFeatureLayerYMap = compactedYMap;
  }

  if (
    candidateType === 'CandidateB_FeatureCohesiveLayerPacking' ||
    candidateType === 'Combo_A_plus_B' ||
    candidateType === 'Combo_B_plus_C' ||
    candidateType === 'Combo_A_plus_B_plus_C'
  ) {
    const localLayerYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const featBaseY = orig.presentation;
      localLayerYMap[featId] = {
        presentation: featBaseY,
        application: featBaseY + 60,
        domain: featBaseY + 120,
        schema: featBaseY + 180,
      };
    });
    activeFeatureLayerYMap = localLayerYMap;
  }

  if (
    candidateType === 'CandidateC_AdaptiveBoundedLayerGaps' ||
    candidateType === 'Combo_A_plus_C' ||
    candidateType === 'Combo_B_plus_C' ||
    candidateType === 'Combo_A_plus_B_plus_C'
  ) {
    const adaptiveYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const featBaseY = orig.presentation;
      let featNodeCount = 0;
      featureMap.forEach((f) => {
        if (f === featId) featNodeCount++;
      });
      const adaptiveStep = Math.min(200, 50 + Math.ceil(featNodeCount / 2) * 20);
      adaptiveYMap[featId] = {
        presentation: featBaseY,
        application: featBaseY + adaptiveStep,
        domain: featBaseY + adaptiveStep * 2,
        schema: featBaseY + adaptiveStep * 3,
      };
    });
    activeFeatureLayerYMap = adaptiveYMap;
  }

  const stage5Positions: Record<string, { x: number; y: number }> = {};
  featureDiscovery.assignments.forEach((_assignment, nodeId) => {
    const fId = featureMap.get(nodeId) || 'Unassigned';
    const region = featureLayoutResult.domainRegions.get(fId);
    if (region) {
      stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
    }
  });

  // Stage 6: Layer Ordering & Crossing Reduction
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: featureLayoutResult.orderedDomains,
    layerYMap: featureLayoutResult.layerYMap,
  });

  const stage6Positions = { ...stage5Positions };

  // Stage 7: Local Node Layout
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: featureLayoutResult.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      domainSpacing: 380,
      layerYMap: featureLayoutResult.layerYMap,
      featureLayerYMap: activeFeatureLayerYMap,
    },
  });

  const stage7Positions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };
  const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
    ...localResult.primaryNodePositions,
  });

  // Stage 8: Bridge Candidates
  const stage8Positions: Record<string, { x: number; y: number }> = {
    ...stage7Positions,
  };

  if (!interventions.bypassStage8Bridge) {
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    featureLayoutResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    const stage8BridgeNodes = safeNodes.filter((node) => {
      if (isTestNode(node) || isFieldNode(node)) return false;
      const centrality = centralityMap.get(node.id);
      return centrality?.isBridge && !centrality.isHub;
    });

    stage8BridgeNodes.forEach((node) => {
      const centrality = centralityMap.get(node.id)!;
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach((nId) => {
        if (stage8Positions[nId]) {
          neighborPositions[nId] = stage8Positions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        {
          layerSpacing: 250,
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          layerYOffsets: featureLayoutResult.layerYMap,
          index,
          allocatedPositions: stage8Positions,
          immutablePrimaryPositions: immutableStage7PrimaryPositions,
        }
      );

      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    });
  }

  // Stage 9: Satellites
  let stage9Positions: Record<string, { x: number; y: number }> = {
    ...stage8Positions,
  };

  if (!interventions.bypassStage9Satellite) {
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
        layerSpacing: 250,
        layerYOffsets: featureLayoutResult.layerYMap,
        index,
        featureLayerYMap: activeFeatureLayerYMap,
        featureMap,
      }
    );
    stage9Positions = { ...satelliteResult.positions };
  }

  // Stage 10: Component Packing
  let stage10Positions: Record<string, { x: number; y: number }> = {
    ...stage9Positions,
  };

  if (!interventions.neutralizeStage10Packing && analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map((comp) => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = stage9Positions[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) {
              minNodeId = nodeId;
            }
            const centrality = centralityMap.get(nodeId);
            if (centrality) {
              importance += centrality.hubScore + centrality.bridgeScore;
            }
          }
        }

        return {
          id: comp.componentId,
          positions,
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          structuralImportance: importance,
          minNodeId,
        };
      })
      .filter((c) => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      const compWidths = componentLayouts
        .map((c) => {
          const bounds = calculateLocalComponentBounds(
            c.positions,
            NODE_WIDTH,
            NODE_HEIGHT
          );
          return bounds.width;
        })
        .sort((a, b) => b - a);

      const maxW = compWidths[0] || NODE_WIDTH;
      const secondMaxW = compWidths[1] || NODE_WIDTH;
      const minRowWidth = maxW + secondMaxW + 100;

      let totalCompArea = 0;
      componentLayouts.forEach((c) => {
        const bounds = calculateLocalComponentBounds(
          c.positions,
          NODE_WIDTH,
          NODE_HEIGHT
        );
        totalCompArea += (bounds.width + 100) * (bounds.height + 100);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: 100,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
      });
      stage10Positions = packed.positions;
    }
  }

  // Stage 11: Collision Resolution
  let stage11Positions: Record<string, { x: number; y: number }> = {
    ...stage10Positions,
  };

  if (!interventions.neutralizeStage11Collision) {
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: stage10Positions,
      analysis,
      options: {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
        layerMap,
        domainMap: featureMap,
        ...(featureLayoutResult.domainBounds
          ? { domainBounds: featureLayoutResult.domainBounds }
          : {}),
      },
    });
    stage11Positions = finalCleanupResult.positions;
  }

  const stageSnapshots = {
    Stage5: stage5Positions,
    Stage6: stage6Positions,
    Stage7: stage7Positions,
    Stage8: stage8Positions,
    Stage9: stage9Positions,
    Stage10: stage10Positions,
    Stage11: stage11Positions,
    Stage12: stage11Positions,
  };

  return {
    stageSnapshots,
    finalPositions: stage11Positions,
    featureMap,
    layerMap,
  };
}

describe('PHASE 21 — Controlled Hybrid Stage 5 Geometry Design Experiment Test Suite', () => {
  it('verifies dataset provenance and fail-closed real project scale for CST and PBIM', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    expect(cst.nodes.length).toBe(240);
    expect(cst.edges.length).toBe(1024);
    expect(cst.sha256).toBe('1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907');

    const pbim = loadRealProjectData('pbim');
    expect(pbim.nodes.length).toBe(528);
    expect(pbim.edges.length).toBe(2063);
    expect(pbim.sha256).toBe('d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b');
  });

  it('measures baseline and candidate geometry interventions (A, B, C, combinations) on CST and PBIM', () => {
    const projectIds: Array<'cloud-spend-tracker' | 'pbim'> = ['cloud-spend-tracker', 'pbim'];
    const experimentResults: Record<string, Record<string, MetricSummary>> = {};

    const candidates: CandidateType[] = [
      'Baseline',
      'CandidateA_BandCompaction',
      'CandidateB_FeatureCohesiveLayerPacking',
      'CandidateC_AdaptiveBoundedLayerGaps',
      'Combo_A_plus_B',
      'Combo_A_plus_C',
      'Combo_B_plus_C',
      'Combo_A_plus_B_plus_C',
    ];

    projectIds.forEach((projId) => {
      const projData = loadRealProjectData(projId);
      experimentResults[projId] = {};

      candidates.forEach((candType) => {
        const pipelineRes = runPhase21Stage5ExperimentPipeline(
          projData.nodes,
          projData.edges,
          { candidateType: candType }
        );
        const metrics = calculateMetrics(
          projId,
          projData.nodes,
          projData.edges,
          pipelineRes.finalPositions,
          pipelineRes.featureMap
        );
        experimentResults[projId][candType] = metrics;
      });
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase21-experiment-results.json');
    fs.writeFileSync(outPath, JSON.stringify(experimentResults, null, 2));
    console.log(`Saved Phase 21 experiment results to ${outPath}`);
  });

  it('performs stage-by-stage coordinate forensics for representative pathological edges', () => {
    const forensics: Record<string, any> = {};

    const cst = loadRealProjectData('cloud-spend-tracker');
    const cstRun = runPhase21Stage5ExperimentPipeline(cst.nodes, cst.edges, { candidateType: 'Baseline' });

    const cstMaxSource = 'ApexClass:SelectorsTest';
    const cstMaxTarget = 'Object:Forecast__c';

    const stages = ['Stage5', 'Stage6', 'Stage7', 'Stage8', 'Stage9', 'Stage10', 'Stage11', 'Stage12'];

    const traceEdgeStages = (
      edge: { source: string; target: string },
      snapshots: Record<string, Record<string, { x: number; y: number }>>
    ) => {
      const trace: any[] = [];
      stages.forEach((stg) => {
        const snap = snapshots[stg];
        const p1 = snap ? snap[edge.source] : null;
        const p2 = snap ? snap[edge.target] : null;
        const dist = p1 && p2 ? Math.round(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) * 100) / 100 : 0;
        trace.push({
          stage: stg,
          sourcePos: p1 ? { x: Math.round(p1.x * 10) / 10, y: Math.round(p1.y * 10) / 10 } : null,
          targetPos: p2 ? { x: Math.round(p2.x * 10) / 10, y: Math.round(p2.y * 10) / 10 } : null,
          distance: dist,
        });
      });
      return trace;
    };

    forensics['cloud-spend-tracker'] = {
      maxEdge: {
        source: cstMaxSource,
        target: cstMaxTarget,
        trace: traceEdgeStages(
          { source: cstMaxSource, target: cstMaxTarget },
          cstRun.stageSnapshots
        ),
      },
    };

    const pbim = loadRealProjectData('pbim');
    const pbimRun = runPhase21Stage5ExperimentPipeline(pbim.nodes, pbim.edges, { candidateType: 'Baseline' });

    const pbimMaxSource = 'ApexClass:TimelineControllerTest';
    const pbimMaxTarget = 'External:Profile';

    forensics['pbim'] = {
      maxEdge: {
        source: pbimMaxSource,
        target: pbimMaxTarget,
        trace: traceEdgeStages(
          { source: pbimMaxSource, target: pbimMaxTarget },
          pbimRun.stageSnapshots
        ),
      },
    };

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase21-representative-edge-forensics.json');
    fs.writeFileSync(outPath, JSON.stringify(forensics, null, 2));
    console.log(`Saved Phase 21 edge forensics to ${outPath}`);
  });

  it('validates 10x determinism and 3x input-order invariance for candidate interventions', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');

    const candidates: CandidateType[] = [
      'CandidateA_BandCompaction',
      'CandidateB_FeatureCohesiveLayerPacking',
      'CandidateC_AdaptiveBoundedLayerGaps',
      'Combo_A_plus_B',
    ];

    candidates.forEach((candType) => {
      // Determinism test (10 runs)
      const firstRun = runPhase21Stage5ExperimentPipeline(cst.nodes, cst.edges, { candidateType: candType });
      for (let run = 1; run < 10; run++) {
        const currentRun = runPhase21Stage5ExperimentPipeline(cst.nodes, cst.edges, { candidateType: candType });
        Object.keys(firstRun.finalPositions).forEach((nodeId) => {
          const p1 = firstRun.finalPositions[nodeId];
          const p2 = currentRun.finalPositions[nodeId];
          expect(p2).toBeDefined();
          expect(Math.abs(p1.x - p2.x)).toBeLessThan(1e-5);
          expect(Math.abs(p1.y - p2.y)).toBeLessThan(1e-5);
        });
      }

      // Input-order invariance test (3 shuffled runs)
      for (let shuf = 0; shuf < 3; shuf++) {
        const shuffledNodes = [...cst.nodes].sort(() => (shuf % 2 === 0 ? 1 : -1));
        const shuffledEdges = [...cst.edges].sort(() => (shuf % 2 === 0 ? -1 : 1));

        const shufRun = runPhase21Stage5ExperimentPipeline(shuffledNodes, shuffledEdges, { candidateType: candType });
        Object.keys(firstRun.finalPositions).forEach((nodeId) => {
          const p1 = firstRun.finalPositions[nodeId];
          const p2 = shufRun.finalPositions[nodeId];
          expect(p2).toBeDefined();
          expect(Math.abs(p1.x - p2.x)).toBeLessThan(1e-5);
          expect(Math.abs(p1.y - p2.y)).toBeLessThan(1e-5);
        });
      }
    });
  });

  it('evaluates downstream Stage 8 / Stage 9 interaction on valid Stage 5 candidates', () => {
    const pbim = loadRealProjectData('pbim');
    const interactionResults: Record<string, MetricSummary> = {};

    const configs: Array<{ name: string; cand: CandidateType; b8: boolean; b9: boolean }> = [
      { name: 'CandA_FullPipeline', cand: 'CandidateA_BandCompaction', b8: false, b9: false },
      { name: 'CandA_BypassStage8', cand: 'CandidateA_BandCompaction', b8: true, b9: false },
      { name: 'CandA_BypassStage9', cand: 'CandidateA_BandCompaction', b8: false, b9: true },
      { name: 'CandA_BypassStage8_and_9', cand: 'CandidateA_BandCompaction', b8: true, b9: true },
      { name: 'Combo_A_plus_B_FullPipeline', cand: 'Combo_A_plus_B', b8: false, b9: false },
      { name: 'Combo_A_plus_B_BypassStage8', cand: 'Combo_A_plus_B', b8: true, b9: false },
    ];

    configs.forEach((cfg) => {
      const res = runPhase21Stage5ExperimentPipeline(pbim.nodes, pbim.edges, {
        candidateType: cfg.cand,
        bypassStage8Bridge: cfg.b8,
        bypassStage9Satellite: cfg.b9,
      });
      const metrics = calculateMetrics('pbim', pbim.nodes, pbim.edges, res.finalPositions, res.featureMap);
      interactionResults[cfg.name] = metrics;
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase21-downstream-interaction-results.json');
    fs.writeFileSync(outPath, JSON.stringify(interactionResults, null, 2));
    console.log(`Saved Phase 21 downstream interaction results to ${outPath}`);
  });
});

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import {
  computeArchitectureLayoutWithMetadata,
} from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  isFieldNode,
} from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';

const LAYERS_IN_ORDER: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];

import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
  type ArchitectureLayer,
} from '../lib/layout/global-layout';
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
const VERTICAL_GAP = 40;

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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

export interface FeatureLayerTrace {
  featureId: string;
  layer: ArchitectureLayer;
  pass1_initialY: number;
  pass1_estimatedRows: number;
  pass1_requiredHeight: number;
  pass1_allocatedHeight: number;
  pass1_c4Overflow: number;
  pass1_c6ClearanceViolation: boolean;
  pass2_adjustedY: number;
  pass2_allocatedHeight: number;
  pass2_actualOccupiedHeight: number;
  pass2_c4Overflow: number;
  pass2_c6ClearanceViolation: boolean;
}

export function runCandidateJ4TwoPassPipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: {
    bypassStage8Bridge?: boolean;
    bypassStage9Satellite?: boolean;
  } = {}
): {
  stageSnapshots: Record<string, Record<string, { x: number; y: number }>>;
  finalPositions: Record<string, { x: number; y: number }>;
  featureMap: Map<string, string>;
  layerMap: Map<string, any>;
  couplingTrace: FeatureLayerTrace[];
  couplingSummary: {
    totalC4OverflowPass1: number;
    totalC6ViolationsPass1: number;
    totalC4OverflowPass2: number;
    totalC6ViolationsPass2: number;
  };
} {
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

  // --- PASS 1: STAGE 5 COARSE LAYOUT & STAGE 7 LOCAL DEMAND MEASUREMENT ---
  const pass1GlobalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
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
  });

  const pass1FeatureLayerYMap = JSON.parse(JSON.stringify(pass1GlobalResult.featureLayerYMap));

  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: pass1GlobalResult.orderedDomains,
    layerYMap: pass1GlobalResult.layerYMap,
  });

  const pass1LocalResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: pass1GlobalResult.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      domainSpacing: 380,
      layerYMap: pass1GlobalResult.layerYMap,
      featureLayerYMap: pass1FeatureLayerYMap,
    },
  });

  // Measure local demand for every (feature, layer)
  const couplingTrace: FeatureLayerTrace[] = [];
  let totalC4OverflowPass1 = 0;
  let totalC6ViolationsPass1 = 0;
  let totalC4OverflowPass2 = 0;
  let totalC6ViolationsPass2 = 0;

  const pass2FeatureLayerYMap: Record<string, Record<ArchitectureLayer, number>> = {};

  Object.keys(pass1FeatureLayerYMap).forEach((featId) => {
    const p1Map = pass1FeatureLayerYMap[featId];
    pass2FeatureLayerYMap[featId] = {
      presentation: p1Map.presentation,
      application: p1Map.application,
      domain: p1Map.domain,
      schema: p1Map.schema,
    };

    let currentPass2Y = p1Map.presentation;

    LAYERS_IN_ORDER.forEach((layer, lIdx) => {
      const bucketKey = `${layer}:${featId}`;
      const bucketLayout = pass1LocalResult.bucketLayouts.get(bucketKey);

      const rows = bucketLayout ? bucketLayout.rows : 0;
      const requiredHeight = rows > 0 ? rows * NODE_HEIGHT + (rows - 1) * VERTICAL_GAP : 0;

      const p1CurrentY = p1Map[layer];
      const nextLayer = LAYERS_IN_ORDER[lIdx + 1];
      const p1NextY = nextLayer ? p1Map[nextLayer] : p1CurrentY + 250;
      const allocatedHeightP1 = p1NextY - p1CurrentY;

      const c4OverflowP1 = Math.max(0, requiredHeight - allocatedHeightP1);
      const c6ViolationP1 = requiredHeight > 0 && (allocatedHeightP1 - requiredHeight < VERTICAL_GAP);

      if (c4OverflowP1 > 0) totalC4OverflowPass1 += c4OverflowP1;
      if (c6ViolationP1) totalC6ViolationsPass1++;

      // Adjust Pass 2 Y offset for next layer
      if (nextLayer) {
        const minStep = Math.max(250, requiredHeight + VERTICAL_GAP);
        const pass2NextY = currentPass2Y + minStep;
        pass2FeatureLayerYMap[featId][nextLayer] = pass2NextY;

        const allocatedHeightP2 = minStep;
        const c4OverflowP2 = Math.max(0, requiredHeight - allocatedHeightP2);
        const c6ViolationP2 = requiredHeight > 0 && (allocatedHeightP2 - requiredHeight < VERTICAL_GAP);

        if (c4OverflowP2 > 0) totalC4OverflowPass2 += c4OverflowP2;
        if (c6ViolationP2) totalC6ViolationsPass2++;

        couplingTrace.push({
          featureId: featId,
          layer,
          pass1_initialY: p1CurrentY,
          pass1_estimatedRows: rows,
          pass1_requiredHeight: requiredHeight,
          pass1_allocatedHeight: allocatedHeightP1,
          pass1_c4Overflow: c4OverflowP1,
          pass1_c6ClearanceViolation: c6ViolationP1,
          pass2_adjustedY: currentPass2Y,
          pass2_allocatedHeight: allocatedHeightP2,
          pass2_actualOccupiedHeight: requiredHeight,
          pass2_c4Overflow: c4OverflowP2,
          pass2_c6ClearanceViolation: c6ViolationP2,
        });

        currentPass2Y = pass2NextY;
      } else {
        couplingTrace.push({
          featureId: featId,
          layer,
          pass1_initialY: p1CurrentY,
          pass1_estimatedRows: rows,
          pass1_requiredHeight: requiredHeight,
          pass1_allocatedHeight: 250,
          pass1_c4Overflow: 0,
          pass1_c6ClearanceViolation: false,
          pass2_adjustedY: currentPass2Y,
          pass2_allocatedHeight: 250,
          pass2_actualOccupiedHeight: requiredHeight,
          pass2_c4Overflow: 0,
          pass2_c6ClearanceViolation: false,
        });
      }
    });
  });

  // --- PASS 2: FINAL PLACEMENT WITH ADJUSTED FEATURE LAYER Y MAP ---
  const pass2LocalResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: pass1GlobalResult.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      domainSpacing: 380,
      layerYMap: pass1GlobalResult.layerYMap,
      featureLayerYMap: pass2FeatureLayerYMap,
    },
  });

  const stage5Positions: Record<string, { x: number; y: number }> = {};
  featureDiscovery.assignments.forEach((_, nodeId) => {
    const fId = featureMap.get(nodeId) || 'Unassigned';
    const region = pass1GlobalResult.domainRegions.get(fId);
    if (region) {
      stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
    }
  });

  const stage6Positions = { ...stage5Positions };
  const stage7Positions: Record<string, { x: number; y: number }> = {
    ...pass2LocalResult.primaryNodePositions,
  };
  const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
    ...pass2LocalResult.primaryNodePositions,
  });

  // Stage 8: Bridge Candidates
  const stage8Positions: Record<string, { x: number; y: number }> = {
    ...stage7Positions,
  };

  if (!options.bypassStage8Bridge) {
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    pass1GlobalResult.domainRegions.forEach((region, domain) => {
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
          layerYOffsets: pass1GlobalResult.layerYMap,
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

  if (!options.bypassStage9Satellite) {
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
        layerSpacing: 250,
        layerYOffsets: pass1GlobalResult.layerYMap,
        index,
        featureLayerYMap: pass2FeatureLayerYMap,
        featureMap,
      }
    );
    stage9Positions = { ...satelliteResult.positions };
  }

  // Stage 10: Component Packing
  let stage10Positions: Record<string, { x: number; y: number }> = {
    ...stage9Positions,
  };

  if (analysis.components.length > 1) {
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
      ...(pass1GlobalResult.domainBounds
        ? { domainBounds: pass1GlobalResult.domainBounds }
        : {}),
    },
  });
  const stage11Positions = finalCleanupResult.positions;

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
    couplingTrace,
    couplingSummary: {
      totalC4OverflowPass1,
      totalC6ViolationsPass1,
      totalC4OverflowPass2,
      totalC6ViolationsPass2,
    },
  };
}

describe('PHASE 23 — J4 Runtime Truth, Coupling Contract, and Validation Suite', () => {
  it('Step 0: Verifies real project exports, manifest, SHA-256 hashes, and default project isolation', () => {
    const rootDir = path.resolve(__dirname, '../../..');

    // Check manifest
    const manifestPath = path.join(rootDir, 'explorer/public/project-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.manifestVersion).toBe('1.0.0');
    const projectIds = manifest.projects.map((p: any) => p.id);
    expect(projectIds).toContain('cloud-spend-tracker');
    expect(projectIds).toContain('pbim');
    expect(projectIds).toContain('default');

    // Verify CST exports
    const cst = loadRealProjectData('cloud-spend-tracker');
    expect(cst.nodes.length).toBe(240);
    expect(cst.edges.length).toBe(1024);
    expect(cst.sha256).toBe('1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907');

    // Verify PBIM exports
    const pbim = loadRealProjectData('pbim');
    expect(pbim.nodes.length).toBe(528);
    expect(pbim.edges.length).toBe(2063);
    expect(pbim.sha256).toBe('d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b');

    // Default project contamination check
    const defaultDataPath = path.join(rootDir, 'explorer/public/explorer-data.json');
    if (fs.existsSync(defaultDataPath)) {
      const defaultData = JSON.parse(fs.readFileSync(defaultDataPath, 'utf-8'));
      const defaultNodeIds = new Set((defaultData.nodes || []).map((n: any) => n.id));
      const cstNodeIds = new Set(cst.nodes.map((n) => n.id));
      const pbimNodeIds = new Set(pbim.nodes.map((n) => n.id));

      // Ensure no default node IDs contamination in CST or PBIM
      defaultNodeIds.forEach((id) => {
        expect(cstNodeIds.has(id as string)).toBe(false);
        expect(pbimNodeIds.has(id as string)).toBe(false);
      });
    }
  });

  it('Step 1: Reconciles baseline metrics across Phase 20R, Phase 22, and current production runtime', () => {
    const cstData = loadRealProjectData('cloud-spend-tracker');
    const cstProd = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    const cstMetrics = calculateMetrics('cloud-spend-tracker', cstData.nodes, cstData.edges, cstProd.positions);

    expect(cstMetrics.nodeCount).toBe(240);
    expect(cstMetrics.edgeCount).toBe(1024);
    expect(cstMetrics.m1_occupiedWidth).toBe(3300);
    expect(cstMetrics.m2_occupiedHeight).toBe(11000);
    expect(cstMetrics.m3_occupiedArea).toBe(36297140);
    expect(cstMetrics.m4_emptySpaceRatio).toBe(0.9524);
    expect(cstMetrics.m5_connectedDist.p50).toBe(1863);
    expect(cstMetrics.m5_connectedDist.p95).toBe(9151);
    expect(cstMetrics.m5_connectedDist.p100).toBe(10222);
    expect(cstMetrics.m7_nearestDist.p50).toBe(100);
    expect(cstMetrics.aabbCollisions).toBe(0);

    const pbimData = loadRealProjectData('pbim');
    const pbimProd = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    const pbimMetrics = calculateMetrics('pbim', pbimData.nodes, pbimData.edges, pbimProd.positions);

    expect(pbimMetrics.nodeCount).toBe(528);
    expect(pbimMetrics.edgeCount).toBe(2063);
    expect(pbimMetrics.m1_occupiedWidth).toBe(7160);
    expect(pbimMetrics.m2_occupiedHeight).toBe(25460);
    expect(pbimMetrics.m3_occupiedArea).toBe(182293600);
    expect(pbimMetrics.m4_emptySpaceRatio).toBe(0.9791);
    expect(pbimMetrics.m5_connectedDist.p50).toBe(2759);
    expect(pbimMetrics.m5_connectedDist.p95).toBe(18041);
    expect(pbimMetrics.m5_connectedDist.p100).toBe(24317);
    expect(pbimMetrics.m7_nearestDist.p50).toBe(100);
    expect(pbimMetrics.aabbCollisions).toBe(0);

    console.log('BASELINE_RECONCILIATION_TABLE:');
    console.log('CST Baseline:', cstMetrics);
    console.log('PBIM Baseline:', pbimMetrics);
  });

  it('Step 2: Executes Candidate J4 Two-Pass pipeline and verifies coupling contract resolution (C4/C6)', () => {
    const cstData = loadRealProjectData('cloud-spend-tracker');
    const cstJ4 = runCandidateJ4TwoPassPipeline(cstData.nodes, cstData.edges);
    const cstJ4Metrics = calculateMetrics('cloud-spend-tracker', cstData.nodes, cstData.edges, cstJ4.finalPositions, cstJ4.featureMap);

    expect(cstJ4Metrics.aabbCollisions).toBe(0);
    expect(cstJ4.couplingSummary.totalC4OverflowPass1).toBe(1210);
    expect(cstJ4.couplingSummary.totalC6ViolationsPass1).toBe(1);
    expect(cstJ4.couplingSummary.totalC4OverflowPass2).toBe(0);
    expect(cstJ4.couplingSummary.totalC6ViolationsPass2).toBe(0);

    const pbimData = loadRealProjectData('pbim');
    const pbimJ4 = runCandidateJ4TwoPassPipeline(pbimData.nodes, pbimData.edges);
    const pbimJ4Metrics = calculateMetrics('pbim', pbimData.nodes, pbimData.edges, pbimJ4.finalPositions, pbimJ4.featureMap);

    expect(pbimJ4Metrics.aabbCollisions).toBe(0);
    expect(pbimJ4.couplingSummary.totalC4OverflowPass1).toBeGreaterThan(0);
    expect(pbimJ4.couplingSummary.totalC6ViolationsPass1).toBeGreaterThan(0);
    expect(pbimJ4.couplingSummary.totalC4OverflowPass2).toBe(0);
    expect(pbimJ4.couplingSummary.totalC6ViolationsPass2).toBe(0);

    console.log('C4_C6_COUPLING_CONTRACT_SUMMARY:');
    console.log(`CST Pass 1 C4 Overflow: ${cstJ4.couplingSummary.totalC4OverflowPass1}px, C6 Clearance Violations: ${cstJ4.couplingSummary.totalC6ViolationsPass1}`);
    console.log(`CST Pass 2 C4 Overflow: ${cstJ4.couplingSummary.totalC4OverflowPass2}px, C6 Clearance Violations: ${cstJ4.couplingSummary.totalC6ViolationsPass2}`);
    console.log(`PBIM Pass 1 C4 Overflow: ${pbimJ4.couplingSummary.totalC4OverflowPass1}px, C6 Clearance Violations: ${pbimJ4.couplingSummary.totalC6ViolationsPass1}`);
    console.log(`PBIM Pass 2 C4 Overflow: ${pbimJ4.couplingSummary.totalC4OverflowPass2}px, C6 Clearance Violations: ${pbimJ4.couplingSummary.totalC6ViolationsPass2}`);

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    fs.writeFileSync(
      path.join(fixtureDir, 'phase23-j4-coupling-trace.json'),
      JSON.stringify({
        cstSummary: cstJ4.couplingSummary,
        cstMetrics: cstJ4Metrics,
        pbimSummary: pbimJ4.couplingSummary,
        pbimMetrics: pbimJ4Metrics,
        cstTrace: cstJ4.couplingTrace,
        pbimTrace: pbimJ4.couplingTrace,
      }, null, 2)
    );

    fs.writeFileSync(
      path.join(fixtureDir, 'phase23-j4-positions.json'),
      JSON.stringify({
        cstPositions: cstJ4.finalPositions,
        pbimPositions: pbimJ4.finalPositions,
      }, null, 2)
    );
  });

  it('Step 3: Verifies 10x determinism and 10x input-order invariance for Candidate J4', () => {
    const cstData = loadRealProjectData('cloud-spend-tracker');
    const firstRun = runCandidateJ4TwoPassPipeline(cstData.nodes, cstData.edges);

    // 10x Identical Runs
    for (let i = 1; i < 10; i++) {
      const run = runCandidateJ4TwoPassPipeline(cstData.nodes, cstData.edges);
      Object.keys(firstRun.finalPositions).forEach((nodeId) => {
        const p1 = firstRun.finalPositions[nodeId];
        const p2 = run.finalPositions[nodeId];
        expect(p2).toBeDefined();
        expect(Math.abs(p1.x - p2.x)).toBeLessThan(1e-5);
        expect(Math.abs(p1.y - p2.y)).toBeLessThan(1e-5);
      });
    }

    // 10x Input-Order Permutations
    for (let shuf = 0; shuf < 10; shuf++) {
      const shuffledNodes = [...cstData.nodes].sort((a, b) => (shuf % 2 === 0 ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));
      const shuffledEdges = [...cstData.edges].sort((a, b) => (shuf % 3 === 0 ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));

      const shufRun = runCandidateJ4TwoPassPipeline(shuffledNodes, shuffledEdges);
      Object.keys(firstRun.finalPositions).forEach((nodeId) => {
        const p1 = firstRun.finalPositions[nodeId];
        const p2 = shufRun.finalPositions[nodeId];
        expect(p2).toBeDefined();
        expect(Math.abs(p1.x - p2.x)).toBeLessThan(1e-5);
        expect(Math.abs(p1.y - p2.y)).toBeLessThan(1e-5);
      });
    }
  });

  it('Step 4: Measures 10 warm runs performance timing for Baseline vs Candidate J4', () => {
    const cstData = loadRealProjectData('cloud-spend-tracker');

    const warmRuns = 10;
    const cstBaselineTimes: number[] = [];
    const cstJ4Times: number[] = [];

    for (let i = 0; i < warmRuns; i++) {
      const t0 = performance.now();
      computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, {
        architectureMode: 'hybrid',
        enableFeatureLayout: true,
      });
      cstBaselineTimes.push(performance.now() - t0);

      const t2 = performance.now();
      runCandidateJ4TwoPassPipeline(cstData.nodes, cstData.edges);
      cstJ4Times.push(performance.now() - t2);
    }

    cstBaselineTimes.sort((a, b) => a - b);
    cstJ4Times.sort((a, b) => a - b);

    console.log(`CST Baseline Median: ${cstBaselineTimes[5].toFixed(2)}ms`);
    console.log(`CST J4 Median: ${cstJ4Times[5].toFixed(2)}ms`);
  });
});

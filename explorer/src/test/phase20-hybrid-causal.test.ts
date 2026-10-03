import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
} from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
} from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
  computeGlobalDomainLayout,
  computeFeatureLayerYMap,
  type FeatureRegion,
  type DomainRegion,
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
import { isFieldNode } from '../lib/layout/analysis';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadProjectData(projectId: string): {
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

  const aBuf = fs.readFileSync(analyzePath);
  const pBuf = fs.readFileSync(publicPath);
  const aHash = crypto.createHash('sha256').update(aBuf).digest('hex');
  const pHash = crypto.createHash('sha256').update(pBuf).digest('hex');

  if (aHash !== pHash) {
    throw new Error(
      `Dataset provenance mismatch for project ${projectId}: analyze SHA ${aHash} !== public SHA ${pHash}`
    );
  }

  const raw = JSON.parse(aBuf.toString());
  return {
    nodes: raw.nodes || [],
    edges: raw.edges || [],
    analyzePath,
    publicPath,
    sha256: aHash,
  };
}

export interface MetricSummary {
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
}

function calculateMetrics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>,
  featureMap?: Map<string, string>
): MetricSummary {
  const validNodeIds = Object.keys(positions).filter((id) => positions[id]);
  if (validNodeIds.length === 0) {
    return {
      m1_occupiedWidth: 0,
      m2_occupiedHeight: 0,
      m3_occupiedArea: 0,
      m4_emptySpaceRatio: 1,
      m5_connectedDist: { p0: 0, p50: 0, p75: 0, p95: 0, p99: 0, p100: 0 },
      m6_semanticDist: { p50: 0, p95: 0, p100: 0 },
      m7_nearestDist: { p50: 0, p95: 0, p100: 0 },
      aabbCollisions: 0,
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
      const overlapX =
        Math.abs(a.x - b.x) < NODE_WIDTH - 1e-3;
      const overlapY =
        Math.abs(a.y - b.y) < NODE_HEIGHT - 1e-3;
      if (overlapX && overlapY) {
        aabbCollisions++;
      }
    }
  }

  return {
    m1_occupiedWidth: Math.round(occupiedWidth),
    m2_occupiedHeight: Math.round(occupiedHeight),
    m3_occupiedArea: Math.round(occupiedArea),
    m4_emptySpaceRatio: Math.round(emptySpaceRatio * 10000) / 10000,
    m5_connectedDist: m5,
    m6_semanticDist: m6,
    m7_nearestDist: m7,
    aabbCollisions,
  };
}

/**
 * Pipeline instrumentation harness to capture exact stage-by-stage node positions.
 */
export function runCustomPipelineWithStageSnapshots(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  interventions: {
    relaxLayerSupremacy?: boolean;
    relaxFeatureBandStacking?: boolean;
    bypassStage8Bridge?: boolean;
    bypassStage9Satellite?: boolean;
    neutralizeStage10Packing?: boolean;
    neutralizeStage11Collision?: boolean;
  } = {}
): {
  stageSnapshots: Record<string, Record<string, { x: number; y: number }>>;
  finalPositions: Record<string, { x: number; y: number }>;
  featureMap: Map<string, string>;
  layerMap: Map<string, any>;
} {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  // Stage 0: Defensive Clone & Sort
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

  // Stage 1: Base Architecture Analysis
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

  // Stage 4: Centrality
  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

  // Stage 3.5 & 4: Semantic Feature Discovery
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

  // Stage 5: Global Feature Layout
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
  });

  let activeFeatureLayerYMap = featureLayoutResult.featureLayerYMap;

  // Controlled Intervention A: Relax Layer Supremacy
  // If relaxLayerSupremacy is active, flatten featureLayerYMap so all layers within a feature start at featureBaseY without layer step gaps
  if (interventions.relaxLayerSupremacy && activeFeatureLayerYMap) {
    const flattened: Record<string, Record<string, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const baseY = orig.presentation; // use featureBaseY
      flattened[featId] = {
        presentation: baseY,
        application: baseY,
        domain: baseY,
        schema: baseY,
      };
    });
    activeFeatureLayerYMap = flattened as any;
  }

  // Controlled Intervention B: Relax Feature Band Stacking
  // If relaxFeatureBandStacking is active, set all feature base Y coordinates to a constant (100)
  if (interventions.relaxFeatureBandStacking && activeFeatureLayerYMap) {
    const flattenedStacking: Record<string, Record<string, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const origBaseY = orig.presentation;
      flattenedStacking[featId] = {
        presentation: 100 + (orig.presentation - origBaseY),
        application: 100 + (orig.application - origBaseY),
        domain: 100 + (orig.domain - origBaseY),
        schema: 100 + (orig.schema - origBaseY),
      };
    });
    activeFeatureLayerYMap = flattenedStacking as any;
  }

  // Stage 5 snapshot positions (domain region centroids)
  const stage5Positions: Record<string, { x: number; y: number }> = {};
  featureDiscovery.assignments.forEach((_, nodeId) => {
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

describe('Phase 20 - Hybrid Causal Attribution Audit', () => {
  it('verifies dataset provenance for Cloud Spend Tracker and PBIM', () => {
    const cst = loadProjectData('cloud-spend-tracker');
    expect(cst.nodes.length).toBe(240);
    expect(cst.edges.length).toBe(1024);
    expect(cst.sha256).toBe(
      '1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907'
    );

    const pbim = loadProjectData('pbim');
    expect(pbim.nodes.length).toBe(528);
    expect(pbim.edges.length).toBe(2063);
    expect(pbim.sha256).toBe(
      'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b'
    );
  });

  it('reproduces Phase 19R baseline metrics for CST and PBIM', () => {
    const cst = loadProjectData('cloud-spend-tracker');
    const cstProd = computeArchitectureLayoutWithMetadata(cst.nodes, cst.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    const cstMetrics = calculateMetrics(cst.nodes, cst.edges, cstProd.positions);

    expect(cstMetrics.m1_occupiedWidth).toBe(3300);
    expect(cstMetrics.m2_occupiedHeight).toBe(11000);
    expect(cstMetrics.m5_connectedDist.p50).toBeGreaterThanOrEqual(1800);
    expect(cstMetrics.m5_connectedDist.p100).toBe(10222);
    expect(cstMetrics.aabbCollisions).toBe(0);

    const pbim = loadProjectData('pbim');
    const pbimProd = computeArchitectureLayoutWithMetadata(pbim.nodes, pbim.edges, {
      architectureMode: 'hybrid',
      enableFeatureLayout: true,
    });
    const pbimMetrics = calculateMetrics(pbim.nodes, pbim.edges, pbimProd.positions);

    expect(pbimMetrics.m1_occupiedWidth).toBe(7160);
    expect(pbimMetrics.m2_occupiedHeight).toBe(25460);
    expect(pbimMetrics.m5_connectedDist.p50).toBeGreaterThanOrEqual(2700);
    expect(pbimMetrics.m5_connectedDist.p100).toBe(24317);
    expect(pbimMetrics.aabbCollisions).toBe(0);
  });

  it('executes controlled experiments A through F and combinations on CST and PBIM', () => {
    const projects = ['cloud-spend-tracker', 'pbim'];
    const experimentResults: Record<string, Record<string, MetricSummary>> = {};

    const experimentConfigs: Record<
      string,
      {
        relaxLayerSupremacy?: boolean;
        relaxFeatureBandStacking?: boolean;
        bypassStage8Bridge?: boolean;
        bypassStage9Satellite?: boolean;
        neutralizeStage10Packing?: boolean;
        neutralizeStage11Collision?: boolean;
      }
    > = {
      Baseline: {},
      MechanismA_LayerSupremacy: { relaxLayerSupremacy: true },
      MechanismB_FeatureBandStacking: { relaxFeatureBandStacking: true },
      MechanismC_Stage8Bridge: { bypassStage8Bridge: true },
      MechanismD_Stage9Satellite: { bypassStage9Satellite: true },
      MechanismE_Stage10Packing: { neutralizeStage10Packing: true },
      MechanismF_Stage11Collision: { neutralizeStage11Collision: true },
      Combo_A_plus_B: { relaxLayerSupremacy: true, relaxFeatureBandStacking: true },
      Combo_A_plus_C: { relaxLayerSupremacy: true, bypassStage8Bridge: true },
      Combo_B_plus_C: { relaxFeatureBandStacking: true, bypassStage8Bridge: true },
      Combo_A_plus_B_plus_C: {
        relaxLayerSupremacy: true,
        relaxFeatureBandStacking: true,
        bypassStage8Bridge: true,
      },
    };

    projects.forEach((projId) => {
      const projData = loadProjectData(projId);
      experimentResults[projId] = {};

      Object.entries(experimentConfigs).forEach(([expName, config]) => {
        const pipelineRes = runCustomPipelineWithStageSnapshots(
          projData.nodes,
          projData.edges,
          config
        );
        const metrics = calculateMetrics(
          projData.nodes,
          projData.edges,
          pipelineRes.finalPositions,
          pipelineRes.featureMap
        );
        experimentResults[projId][expName] = metrics;
      });
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase20-experiment-results.json');
    fs.writeFileSync(outPath, JSON.stringify(experimentResults, null, 2));
    console.log(`Saved experiment results to ${outPath}`);
  });

  it('performs stage-by-stage coordinate ownership & representative edge forensics', () => {
    const forensics: Record<string, any> = {};

    // Cloud Spend Tracker Representative Edges
    const cst = loadProjectData('cloud-spend-tracker');
    const cstRun = runCustomPipelineWithStageSnapshots(cst.nodes, cst.edges);

    // Target pathological edge: SelectorsTest -> Forecast__c
    const cstMaxSource = 'ApexClass:SelectorsTest';
    const cstMaxTarget = 'Object:Forecast__c';

    // Find 5 high-distance edges and 5 median-range edges from final stage
    const cstFinalPositions = cstRun.finalPositions;
    const cstEdgesWithDist = cst.edges.map((e) => {
      const p1 = cstFinalPositions[e.source];
      const p2 = cstFinalPositions[e.target];
      const dist = p1 && p2 ? Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) : 0;
      return { edge: e, dist };
    }).sort((a, b) => b.dist - a.dist);

    const cstHighEdges = cstEdgesWithDist.slice(0, 5);
    const cstMidIdx = Math.floor(cstEdgesWithDist.length / 2);
    const cstMedianEdges = cstEdgesWithDist.slice(cstMidIdx - 2, cstMidIdx + 3);

    const stages = ['Stage5', 'Stage6', 'Stage7', 'Stage8', 'Stage9', 'Stage10', 'Stage11', 'Stage12'];

    const traceEdgeStages = (
      edge: ExplorerEdge,
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
          { id: 'max-cst', source: cstMaxSource, target: cstMaxTarget },
          cstRun.stageSnapshots
        ),
      },
      highEdges: cstHighEdges.map((e) => ({
        source: e.edge.source,
        target: e.edge.target,
        finalDist: Math.round(e.dist),
        trace: traceEdgeStages(e.edge, cstRun.stageSnapshots),
      })),
      medianEdges: cstMedianEdges.map((e) => ({
        source: e.edge.source,
        target: e.edge.target,
        finalDist: Math.round(e.dist),
        trace: traceEdgeStages(e.edge, cstRun.stageSnapshots),
      })),
    };

    // PBIM Representative Edges
    const pbim = loadProjectData('pbim');
    const pbimRun = runCustomPipelineWithStageSnapshots(pbim.nodes, pbim.edges);

    const pbimMaxSource = 'ApexClass:TimelineControllerTest';
    const pbimMaxTarget = 'External:Profile';

    const pbimFinalPositions = pbimRun.finalPositions;
    const pbimEdgesWithDist = pbim.edges.map((e) => {
      const p1 = pbimFinalPositions[e.source];
      const p2 = pbimFinalPositions[e.target];
      const dist = p1 && p2 ? Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) : 0;
      return { edge: e, dist };
    }).sort((a, b) => b.dist - a.dist);

    const pbimHighEdges = pbimEdgesWithDist.slice(0, 5);
    const pbimMidIdx = Math.floor(pbimEdgesWithDist.length / 2);
    const pbimMedianEdges = pbimEdgesWithDist.slice(pbimMidIdx - 2, pbimMidIdx + 3);

    forensics['pbim'] = {
      maxEdge: {
        source: pbimMaxSource,
        target: pbimMaxTarget,
        trace: traceEdgeStages(
          { id: 'max-pbim', source: pbimMaxSource, target: pbimMaxTarget },
          pbimRun.stageSnapshots
        ),
      },
      highEdges: pbimHighEdges.map((e) => ({
        source: e.edge.source,
        target: e.edge.target,
        finalDist: Math.round(e.dist),
        trace: traceEdgeStages(e.edge, pbimRun.stageSnapshots),
      })),
      medianEdges: pbimMedianEdges.map((e) => ({
        source: e.edge.source,
        target: e.edge.target,
        finalDist: Math.round(e.dist),
        trace: traceEdgeStages(e.edge, pbimRun.stageSnapshots),
      })),
    };

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase20-representative-edge-forensics.json');
    fs.writeFileSync(outPath, JSON.stringify(forensics, null, 2));
    console.log(`Saved representative edge forensics to ${outPath}`);
  });

  it('measures performance execution times for baseline and interventions', () => {
    const timingResults: Record<string, any> = {};
    const projects = ['cloud-spend-tracker', 'pbim'];

    projects.forEach((projId) => {
      const proj = loadProjectData(projId);
      timingResults[projId] = {};

      const runs = 5;
      const times: number[] = [];
      for (let i = 0; i < runs; i++) {
        const t0 = performance.now();
        computeArchitectureLayoutWithMetadata(proj.nodes, proj.edges, {
          architectureMode: 'hybrid',
          enableFeatureLayout: true,
        });
        const t1 = performance.now();
        times.push(t1 - t0);
      }
      times.sort((a, b) => a - b);
      timingResults[projId]['Baseline'] = {
        min: Math.round(times[0] * 100) / 100,
        median: Math.round(times[Math.floor(runs / 2)] * 100) / 100,
        max: Math.round(times[runs - 1] * 100) / 100,
      };
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase20-timing-results.json');
    fs.writeFileSync(outPath, JSON.stringify(timingResults, null, 2));
    console.log(`Saved timing results to ${outPath}`);
  });
});

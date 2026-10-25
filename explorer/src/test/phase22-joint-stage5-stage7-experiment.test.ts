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
  ComponentLocalLayout,
} from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;

const isPrimaryNode = (node: ExplorerNode) => !isTestNode(node) && !isFieldNode(node);

export function ensureDirExists(dirPath: string) {
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
      `REAL_PROJECT_LOAD_FAILURE: SHA256 mismatch between analyze/ and explorer/public/ for '${projectId}'`
    );
  }

  const raw = JSON.parse(aBuf.toString('utf-8'));
  return {
    projectId,
    nodes: raw.nodes || [],
    edges: raw.edges || [],
    analyzePath,
    publicPath,
    sha256: aHash,
  };
}

export type CandidateType =
  | 'Baseline'
  | 'CandidateJ1_RegionAwareClearance'
  | 'CandidateJ2_DemandDrivenSizing'
  | 'CandidateJ3_BoundedAdaptiveGap'
  | 'CandidateJ4_TwoPassFeedback'
  | 'CandidateJ5_ConstrainedCoupledCompaction';

export interface ExperimentInterventions {
  candidateType?: CandidateType;
  bypassStage8Bridge?: boolean;
  bypassStage9Satellite?: boolean;
}

export interface CouplingMetrics {
  stage5AllocatedHeightTotal: number;
  stage7RequiredHeightTotal: number;
  demandToAllocationRatio: number; // required / allocated
  regionOverflowTotal: number;
  regionUtilization: number;
  clearanceViolationsCount: number;
  perFeatureMetrics: Record<
    string,
    {
      allocatedHeight: number;
      requiredHeight: number;
      overflow: number;
      utilization: number;
      layerDemand: Record<ArchitectureLayer, { allocated: number; required: number }>;
    }
  >;
}

export interface MetricSummary {
  projectId: string;
  candidateType: CandidateType;
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
  coupling: CouplingMetrics;
  runtimeMs?: number;
}

export function runPhase22JointExperimentPipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  interventions: ExperimentInterventions = {}
): {
  stageSnapshots: Record<string, Record<string, { x: number; y: number }>>;
  finalPositions: Record<string, { x: number; y: number }>;
  featureMap: Map<string, string>;
  layerMap: Map<string, ArchitectureLayer>;
  couplingMetrics: CouplingMetrics;
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
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  // Stage 2: Layer Classification
  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach((node) => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer as ArchitectureLayer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  // Stage 3: Domain & Feature Discovery
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

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

  // Stage 5 Setup & Candidate Customization
  let targetRowWidthOverride: number | undefined = undefined;
  if (candidateType === 'CandidateJ5_ConstrainedCoupledCompaction') {
    targetRowWidthOverride = 3600;
  }

  // Calculate pre-pass Stage 7 local demand for J2, J4, J5
  const primaryNodes = safeNodes.filter(isPrimaryNode);
  const bucketNodesMap = new Map<string, string[]>();
  primaryNodes.forEach((node) => {
    const layer = layerMap.get(node.id) || 'application';
    const feature = featureMap.get(node.id) || 'Unassigned';
    const key = `${layer}:${feature}`;
    if (!bucketNodesMap.has(key)) bucketNodesMap.set(key, []);
    bucketNodesMap.get(key)!.push(node.id);
  });

  const stage7RequiredRowsMap: Record<string, Record<ArchitectureLayer, number>> = {};
  featureDiscovery.features.forEach((_, featId) => {
    stage7RequiredRowsMap[featId] = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };
  });
  if (!stage7RequiredRowsMap['Unassigned']) {
    stage7RequiredRowsMap['Unassigned'] = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };
  }

  bucketNodesMap.forEach((nodeIds, bucketKey) => {
    const [layer, feature] = bucketKey.split(':') as [ArchitectureLayer, string];
    if (!stage7RequiredRowsMap[feature]) {
      stage7RequiredRowsMap[feature] = {
        presentation: 0,
        application: 0,
        domain: 0,
        schema: 0,
      };
    }
    const count = nodeIds.length;
    let numRows = 1;
    if (count > 4) {
      numRows = Math.ceil(count / 4);
    }
    stage7RequiredRowsMap[feature][layer] = numRows;
  });

  // Custom Feature Layer Spacing options based on candidates
  let customFeatureLayerSpacing = 120;
  if (candidateType === 'CandidateJ3_BoundedAdaptiveGap') {
    customFeatureLayerSpacing = 60;
  }

  let featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing: 380,
    layerSpacing: 250,
    featureLayerSpacing: customFeatureLayerSpacing,
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

  // Candidate J2 / J5 Demand-Driven Feature Region Sizing
  if (
    candidateType === 'CandidateJ2_DemandDrivenSizing' ||
    candidateType === 'CandidateJ5_ConstrainedCoupledCompaction'
  ) {
    const demandDrivenYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const orig = activeFeatureLayerYMap[featId];
      const featBaseY = featureLayoutResult.featureRegions.get(featId)?.yMin ?? orig.presentation;
      let currY = featBaseY;
      demandDrivenYMap[featId] = {
        presentation: currY,
        application: currY,
        domain: currY,
        schema: currY,
      };

      LAYERS_IN_ORDER.forEach((layer) => {
        const reqRows = stage7RequiredRowsMap[featId]?.[layer] || 0;
        demandDrivenYMap[featId][layer] = currY;
        if (reqRows > 0) {
          const reqHeight = reqRows * NODE_HEIGHT + (reqRows - 1) * 40;
          currY += reqHeight + 120;
        }
      });
    });
    activeFeatureLayerYMap = demandDrivenYMap;
  }

  // Candidate J3: Bounded Adaptive Layer Gap
  if (candidateType === 'CandidateJ3_BoundedAdaptiveGap') {
    const adaptiveYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const featBaseY = featureLayoutResult.featureRegions.get(featId)?.yMin ?? 100;
      let featNodeCount = 0;
      featureMap.forEach((f) => {
        if (f === featId) featNodeCount++;
      });
      const adaptiveInterLayerGap = Math.max(40, Math.min(120, 30 + Math.ceil(featNodeCount / 4) * 15));

      let currY = featBaseY;
      adaptiveYMap[featId] = {
        presentation: currY,
        application: currY,
        domain: currY,
        schema: currY,
      };

      LAYERS_IN_ORDER.forEach((layer) => {
        const reqRows = stage7RequiredRowsMap[featId]?.[layer] || 0;
        adaptiveYMap[featId][layer] = currY;
        if (reqRows > 0) {
          const reqHeight = reqRows * NODE_HEIGHT + (reqRows - 1) * 30;
          currY += reqHeight + adaptiveInterLayerGap;
        }
      });
    });
    activeFeatureLayerYMap = adaptiveYMap;
  }

  const stageSnapshots: Record<string, Record<string, { x: number; y: number }>> = {};

  // Snapshot Stage 5 coordinates
  const stage5Positions: Record<string, { x: number; y: number }> = {};
  safeNodes.forEach((n) => {
    const feat = featureMap.get(n.id) || 'Unassigned';
    const reg = featureLayoutResult.featureRegions.get(feat);
    const lyr = layerMap.get(n.id) || 'application';
    const baseY = activeFeatureLayerYMap[feat]?.[lyr] ?? 100;
    stage5Positions[n.id] = {
      x: reg ? reg.xCenter : 100,
      y: baseY,
    };
  });
  stageSnapshots['Stage5'] = { ...stage5Positions };

  // Stage 6: Layer Ordering & Crossing Reduction
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: featureLayoutResult.orderedFeatures,
    layerYMap: featureLayoutResult.layerYMap,
  });
  stageSnapshots['Stage6'] = { ...stage5Positions };

  // Stage 7: Primary Local Layout & Candidate J1 / J4 Feedback
  let localResult = computeLocalNodeLayout({
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

  // Candidate J4 Two-Pass Feedback Refinement
  if (candidateType === 'CandidateJ4_TwoPassFeedback') {
    const measuredLayerBounds: Record<string, Record<ArchitectureLayer, { minY: number; maxY: number }>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      measuredLayerBounds[featId] = {
        presentation: { minY: Infinity, maxY: -Infinity },
        application: { minY: Infinity, maxY: -Infinity },
        domain: { minY: Infinity, maxY: -Infinity },
        schema: { minY: Infinity, maxY: -Infinity },
      };
    });

    Object.entries(localResult.primaryNodePositions).forEach(([nodeId, pos]) => {
      const feat = featureMap.get(nodeId) || 'Unassigned';
      const lyr = layerMap.get(nodeId) || 'application';
      if (measuredLayerBounds[feat]?.[lyr]) {
        if (pos.y < measuredLayerBounds[feat][lyr].minY) measuredLayerBounds[feat][lyr].minY = pos.y;
        if (pos.y > measuredLayerBounds[feat][lyr].maxY) measuredLayerBounds[feat][lyr].maxY = pos.y;
      }
    });

    const feedbackYMap: Record<string, Record<ArchitectureLayer, number>> = {};
    Object.keys(activeFeatureLayerYMap).forEach((featId) => {
      const featBaseY = featureLayoutResult.featureRegions.get(featId)?.yMin ?? 100;
      let currY = featBaseY;
      feedbackYMap[featId] = {
        presentation: currY,
        application: currY,
        domain: currY,
        schema: currY,
      };

      LAYERS_IN_ORDER.forEach((layer) => {
        const bounds = measuredLayerBounds[featId]?.[layer];
        feedbackYMap[featId][layer] = currY;
        if (bounds && bounds.minY !== Infinity) {
          const reqHeight = bounds.maxY - bounds.minY + NODE_HEIGHT;
          currY += reqHeight + 80;
        }
      });
    });
    activeFeatureLayerYMap = feedbackYMap;

    localResult = computeLocalNodeLayout({
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
  }

  // Candidate J1: Region-Aware Local Clearance Adjustment
  if (candidateType === 'CandidateJ1_RegionAwareClearance') {
    const regionAdjustedPositions = { ...localResult.primaryNodePositions };
    const featureLayerNodes = new Map<string, string[]>();
    Object.keys(regionAdjustedPositions).forEach((nodeId) => {
      const feat = featureMap.get(nodeId) || 'Unassigned';
      const lyr = layerMap.get(nodeId) || 'application';
      const key = `${feat}:${lyr}`;
      if (!featureLayerNodes.has(key)) featureLayerNodes.set(key, []);
      featureLayerNodes.get(key)!.push(nodeId);
    });

    featureLayerNodes.forEach((nodeIds, key) => {
      const [feat, lyr] = key.split(':') as [string, ArchitectureLayer];
      const layerIdx = LAYERS_IN_ORDER.indexOf(lyr);
      const nextLyr = layerIdx < LAYERS_IN_ORDER.length - 1 ? LAYERS_IN_ORDER[layerIdx + 1] : null;

      const currentBaseY = activeFeatureLayerYMap[feat]?.[lyr] ?? 100;
      const nextBaseY = nextLyr ? (activeFeatureLayerYMap[feat]?.[nextLyr] ?? currentBaseY + 500) : currentBaseY + 500;
      const maxAllowedY = nextBaseY - NODE_HEIGHT / 2 - 20;

      const overflowNodes = nodeIds.filter((id) => regionAdjustedPositions[id].y > maxAllowedY);
      if (overflowNodes.length > 0) {
        const minY = Math.min(...nodeIds.map((id) => regionAdjustedPositions[id].y));
        const maxY = Math.max(...nodeIds.map((id) => regionAdjustedPositions[id].y));
        const currentSpan = maxY - minY;
        const targetSpan = Math.max(0, maxAllowedY - currentBaseY);

        if (currentSpan > 0 && targetSpan > 0) {
          const scale = Math.min(1.0, targetSpan / currentSpan);
          nodeIds.forEach((id) => {
            const origY = regionAdjustedPositions[id].y;
            regionAdjustedPositions[id].y = currentBaseY + (origY - currentBaseY) * scale;
          });
        }
      }
    });

    localResult = {
      ...localResult,
      primaryNodePositions: regionAdjustedPositions,
    };
  }

  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };
  stageSnapshots['Stage7'] = { ...basePositions };

  // Stage 8: Hub & Bridge Spatial Refinement
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

  if (!interventions.bypassStage8Bridge) {
    stage8BridgeNodes.forEach((node) => {
      const centrality = centralityMap.get(node.id)!;
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach((nId) => {
        if (basePositions[nId]) {
          neighborPositions[nId] = basePositions[nId];
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
          allocatedPositions: basePositions,
        }
      );

      basePositions[node.id] = bridgeInfo.candidatePosition;
    });
  }
  stageSnapshots['Stage8'] = { ...basePositions };

  // Stage 9: Secondary Satellite Placement
  let satelliteResult = { positions: { ...basePositions } };
  if (!interventions.bypassStage9Satellite) {
    satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      basePositions,
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
  }
  stageSnapshots['Stage9'] = { ...satelliteResult.positions };

  // Stage 10: Disconnected Component Packing
  let componentShiftedPositions: Record<string, { x: number; y: number }> = {
    ...satelliteResult.positions,
  };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map((comp) => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = satelliteResult.positions[nodeId];
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
          const bounds = calculateLocalComponentBounds(c.positions, NODE_WIDTH, NODE_HEIGHT);
          return bounds.width;
        })
        .sort((a, b) => b - a);

      const maxW = compWidths[0] || NODE_WIDTH;
      const secondMaxW = compWidths[1] || NODE_WIDTH;
      const minRowWidth = maxW + secondMaxW + 80;

      let totalCompArea = 0;
      componentLayouts.forEach((c) => {
        const bounds = calculateLocalComponentBounds(c.positions, NODE_WIDTH, NODE_HEIGHT);
        totalCompArea += (bounds.width + 80) * (bounds.height + 80);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: 80,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
      });
      componentShiftedPositions = packed.positions;
    }
  }
  stageSnapshots['Stage10'] = { ...componentShiftedPositions };

  // Stage 11: Final Global Spatial Cleanup
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: componentShiftedPositions,
    analysis,
    options: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      layerMap,
      domainMap: featureMap,
      domainBounds: featureLayoutResult.domainBounds,
    },
  });
  stageSnapshots['Stage11'] = { ...finalCleanupResult.positions };
  stageSnapshots['Stage12'] = { ...finalCleanupResult.positions };

  // Compute C1–C7 Coupling Metrics
  let totalAllocatedHeight = 0;
  let totalRequiredHeight = 0;
  let totalOverflow = 0;
  let clearanceViolationsCount = 0;
  const perFeatureMetrics: CouplingMetrics['perFeatureMetrics'] = {};

  featureDiscovery.features.forEach((_, featId) => {
    const yMap = activeFeatureLayerYMap[featId] || { presentation: 100, application: 100, domain: 100, schema: 100 };

    let featAllocatedHeight = 0;
    let featRequiredHeight = 0;
    let featOverflow = 0;
    const layerDemand: CouplingMetrics['perFeatureMetrics'][string]['layerDemand'] = {
      presentation: { allocated: 0, required: 0 },
      application: { allocated: 0, required: 0 },
      domain: { allocated: 0, required: 0 },
      schema: { allocated: 0, required: 0 },
    };

    LAYERS_IN_ORDER.forEach((layer, idx) => {
      const reqRows = stage7RequiredRowsMap[featId]?.[layer] || 0;
      const reqH = reqRows > 0 ? reqRows * NODE_HEIGHT + (reqRows - 1) * 40 : 0;

      let allocH = 0;
      if (idx < LAYERS_IN_ORDER.length - 1) {
        const nextLyr = LAYERS_IN_ORDER[idx + 1];
        allocH = Math.max(0, (yMap[nextLyr] ?? yMap[layer]) - yMap[layer] - 120);
      } else {
        allocH = reqH > 0 ? reqH + 40 : 100;
      }

      layerDemand[layer] = { allocated: allocH, required: reqH };

      if (reqH > allocH + 1e-3) {
        clearanceViolationsCount++;
        featOverflow += (reqH - allocH);
      }

      featAllocatedHeight += allocH;
      featRequiredHeight += reqH;
    });

    totalAllocatedHeight += featAllocatedHeight;
    totalRequiredHeight += featRequiredHeight;
    totalOverflow += featOverflow;

    perFeatureMetrics[featId] = {
      allocatedHeight: featAllocatedHeight,
      requiredHeight: featRequiredHeight,
      overflow: featOverflow,
      utilization: featAllocatedHeight > 0 ? featRequiredHeight / featAllocatedHeight : 0,
      layerDemand,
    };
  });

  const couplingMetrics: CouplingMetrics = {
    stage5AllocatedHeightTotal: totalAllocatedHeight,
    stage7RequiredHeightTotal: totalRequiredHeight,
    demandToAllocationRatio: totalAllocatedHeight > 0 ? totalRequiredHeight / totalAllocatedHeight : 0,
    regionOverflowTotal: totalOverflow,
    regionUtilization: totalAllocatedHeight > 0 ? totalRequiredHeight / totalAllocatedHeight : 0,
    clearanceViolationsCount,
    perFeatureMetrics,
  };

  return {
    stageSnapshots,
    finalPositions: finalCleanupResult.positions,
    featureMap,
    layerMap,
    couplingMetrics,
  };
}

export function calculateMetrics(
  projectId: string,
  candidateType: CandidateType,
  _nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>,
  couplingMetrics: CouplingMetrics,
  featureMap?: Map<string, string>,
  runtimeMs?: number
): MetricSummary {
  const validNodeIds = Object.keys(positions).filter((id) => positions[id]);
  if (validNodeIds.length === 0) {
    return {
      projectId,
      candidateType,
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
      coupling: couplingMetrics,
      runtimeMs,
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
  const emptySpaceRatio = occupiedArea > 0 ? 1 - totalNodeArea / occupiedArea : 0;

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
    p100: semanticDists.length > 0 ? Math.round(semanticDists[semanticDists.length - 1]) : 0,
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
    p100: nearestDists.length > 0 ? Math.round(nearestDists[nearestDists.length - 1]) : 0,
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
    candidateType,
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
    coupling: couplingMetrics,
    runtimeMs,
  };
}

describe('PHASE 22 — Joint Stage 5 + Stage 7 Coupled Hybrid Layout Experiment Suite', () => {
  it('verifies dataset provenance and fail-closed real project scale for CST and PBIM', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    expect(cst.nodes.length).toBe(240);
    expect(cst.edges.length).toBe(1024);
    expect(cst.sha256).toBe('1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907');

    const pbim = loadRealProjectData('pbim');
    expect(pbim.nodes.length).toBe(528);
    expect(pbim.edges.length).toBe(2063);
    expect(pbim.sha256).toBe('395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d');
  });

  it('measures baseline and candidates J1–J5 on CST and PBIM datasets', () => {
    const projectIds: Array<'cloud-spend-tracker' | 'pbim'> = ['cloud-spend-tracker', 'pbim'];
    const experimentResults: Record<string, Record<string, MetricSummary>> = {};

    const candidates: CandidateType[] = [
      'Baseline',
      'CandidateJ1_RegionAwareClearance',
      'CandidateJ2_DemandDrivenSizing',
      'CandidateJ3_BoundedAdaptiveGap',
      'CandidateJ4_TwoPassFeedback',
      'CandidateJ5_ConstrainedCoupledCompaction',
    ];

    projectIds.forEach((projId) => {
      const projData = loadRealProjectData(projId);
      experimentResults[projId] = {};

      candidates.forEach((candType) => {
        const t0 = performance.now();
        const pipelineRes = runPhase22JointExperimentPipeline(
          projData.nodes,
          projData.edges,
          { candidateType: candType }
        );
        const t1 = performance.now();
        const runtimeMs = Math.round((t1 - t0) * 100) / 100;

        const metrics = calculateMetrics(
          projId,
          candType,
          projData.nodes,
          projData.edges,
          pipelineRes.finalPositions,
          pipelineRes.couplingMetrics,
          pipelineRes.featureMap,
          runtimeMs
        );
        experimentResults[projId][candType] = metrics;
      });
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase22-experiment-results.json');
    fs.writeFileSync(outPath, JSON.stringify(experimentResults, null, 2));
    console.log(`Saved Phase 22 experiment results to ${outPath}`);
  });

  it('performs stage-by-stage coordinate forensics for representative pathological edges', () => {
    const forensics: Record<string, any> = {};

    const cst = loadRealProjectData('cloud-spend-tracker');
    const cstRun = runPhase22JointExperimentPipeline(cst.nodes, cst.edges, { candidateType: 'Baseline' });

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
        let distState: number | 'UNAVAILABLE' = 'UNAVAILABLE';
        if (p1 && p2) {
          distState = Math.round(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) * 100) / 100;
        }
        trace.push({
          stage: stg,
          sourcePos: p1 ? { x: Math.round(p1.x * 10) / 10, y: Math.round(p1.y * 10) / 10 } : null,
          targetPos: p2 ? { x: Math.round(p2.x * 10) / 10, y: Math.round(p2.y * 10) / 10 } : null,
          distance: distState,
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
    const pbimRun = runPhase22JointExperimentPipeline(pbim.nodes, pbim.edges, { candidateType: 'Baseline' });

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
    const outPath = path.join(fixtureDir, 'phase22-representative-edge-forensics.json');
    fs.writeFileSync(outPath, JSON.stringify(forensics, null, 2));
    console.log(`Saved Phase 22 edge forensics to ${outPath}`);
  });

  it('validates 10x determinism and 10x input-order invariance for candidate interventions', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');

    const candidates: CandidateType[] = [
      'CandidateJ1_RegionAwareClearance',
      'CandidateJ2_DemandDrivenSizing',
      'CandidateJ3_BoundedAdaptiveGap',
      'CandidateJ4_TwoPassFeedback',
      'CandidateJ5_ConstrainedCoupledCompaction',
    ];

    candidates.forEach((candType) => {
      // Determinism test (10 runs)
      const firstRun = runPhase22JointExperimentPipeline(cst.nodes, cst.edges, { candidateType: candType });
      for (let run = 1; run < 10; run++) {
        const currentRun = runPhase22JointExperimentPipeline(cst.nodes, cst.edges, { candidateType: candType });
        Object.keys(firstRun.finalPositions).forEach((nodeId) => {
          const p1 = firstRun.finalPositions[nodeId];
          const p2 = currentRun.finalPositions[nodeId];
          expect(p2).toBeDefined();
          expect(Math.abs(p1.x - p2.x)).toBeLessThan(1e-5);
          expect(Math.abs(p1.y - p2.y)).toBeLessThan(1e-5);
        });
      }

      // Input-order invariance test (10 shuffled runs)
      for (let shuf = 0; shuf < 10; shuf++) {
        const shuffledNodes = [...cst.nodes].sort(() => (shuf % 2 === 0 ? 1 : -1));
        const shuffledEdges = [...cst.edges].sort(() => (shuf % 2 === 0 ? -1 : 1));

        const shufRun = runPhase22JointExperimentPipeline(shuffledNodes, shuffledEdges, { candidateType: candType });
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

  it('evaluates downstream Stage 8 / Stage 9 interaction on surviving candidates', () => {
    const pbim = loadRealProjectData('pbim');
    const interactionResults: Record<string, MetricSummary> = {};

    const configs: Array<{ name: string; cand: CandidateType; b8: boolean; b9: boolean }> = [
      { name: 'CandJ2_FullPipeline', cand: 'CandidateJ2_DemandDrivenSizing', b8: false, b9: false },
      { name: 'CandJ2_BypassStage8', cand: 'CandidateJ2_DemandDrivenSizing', b8: true, b9: false },
      { name: 'CandJ2_BypassStage9', cand: 'CandidateJ2_DemandDrivenSizing', b8: false, b9: true },
      { name: 'CandJ2_BypassStage8_and_9', cand: 'CandidateJ2_DemandDrivenSizing', b8: true, b9: true },
      { name: 'CandJ4_FullPipeline', cand: 'CandidateJ4_TwoPassFeedback', b8: false, b9: false },
      { name: 'CandJ4_BypassStage8', cand: 'CandidateJ4_TwoPassFeedback', b8: true, b9: false },
    ];

    configs.forEach((cfg) => {
      const res = runPhase22JointExperimentPipeline(pbim.nodes, pbim.edges, {
        candidateType: cfg.cand,
        bypassStage8Bridge: cfg.b8,
        bypassStage9Satellite: cfg.b9,
      });
      const metrics = calculateMetrics('pbim', cfg.cand, pbim.nodes, pbim.edges, res.finalPositions, res.couplingMetrics, res.featureMap);
      interactionResults[cfg.name] = metrics;
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);
    const outPath = path.join(fixtureDir, 'phase22-downstream-interaction-results.json');
    fs.writeFileSync(outPath, JSON.stringify(interactionResults, null, 2));
    console.log(`Saved Phase 22 downstream interaction results to ${outPath}`);
  });
});

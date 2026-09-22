import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayoutOptions } from '../architecture-layout';
import type { ComprehensiveLayoutMetrics, PositionMap } from './metrics';
import { calculateLayoutMetrics } from './metrics';
import { createLayoutGraphIndex } from './graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './centrality';
import { classifyAllFeatureRoles, type FeatureRoleContext } from './feature-roles';
import { discoverFeatures } from './features';
import { computeGlobalFeatureLayout, computeGlobalDomainLayout } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import { placeSatellites } from './satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './components';
import { resolveSpacingAndCollisions } from './spacing';

export interface StageMetricSnapshot {
  stageNumber: number;
  stageName: string;
  positions: PositionMap;
  positionedNodeCount: number;
  metrics: ComprehensiveLayoutMetrics;
}

export interface PipelineDiagnosticsResult {
  snapshots: Record<string, StageMetricSnapshot>;
  stageTable: {
    stage: string;
    stageName: string;
    positionedNodeCount: number;
    primaryPrimaryCrossings: number;
    totalCrossings: number;
    avgEdgeLength: number;
    maxEdgeLength: number;
    cohesionScore: number;
    layerViolations: number;
    primaryOverlaps: number;
    satelliteOverlaps: number;
    minClearance: number;
  }[];
}

function isSecondaryNode(node: ExplorerNode): boolean {
  const isTest =
    node.behavior?.isTest ||
    (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file)) ||
    /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '');
  const isField = node.type === 'Field' || node.type === 'CustomField';
  return isTest || isField;
}

/**
 * Stage Diagnostic Instrumentation Engine
 *
 * Runs the deterministic layout pipeline and captures canonical metrics at each stage:
 * Stage 5: Global Feature Layout
 * Stage 6: Ordering (Bucket Ranks)
 * Stage 7: Local Primary Node Placement
 * Stage 8: Hub / Bridge Refinement
 * Stage 9: Secondary Satellite Placement
 * Stage 10: Component Packing
 * Stage 11: Final Collision Cleanup
 * Stage 12: Position Authority Restoration
 */
export function measurePipelineStageMetrics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): PipelineDiagnosticsResult {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 100,
    existingPositions = {},
    enableFeatureLayout = true,
  } = options;

  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
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
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
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
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
  });

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Stage 1-4 Analysis setup
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

  const featureRoleContextMap = new Map<string, FeatureRoleContext>();
  safeNodes.forEach(node => {
    featureRoleContextMap.set(node.id, {
      layer: layerMap.get(node.id) || null,
      analysisNode: analysis.nodes.get(node.id) || null,
      centrality: centralityMap.get(node.id) || null,
      roleOverride: analysis.nodes.get(node.id)?.role || null,
    });
  });
  const featureRoles = classifyAllFeatureRoles(safeNodes, featureRoleContextMap);

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

  const snapshots: Record<string, StageMetricSnapshot> = {};

  // Stage 5: Global Feature Layout
  let globalDomainResult;
  let activeSpatialMap: Map<string, string>;

  if (enableFeatureLayout) {
    globalDomainResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      layerMap,
      domainMap,
      domainDiscovery,
      featureDiscovery,
      featureMap,
      index,
    });
    activeSpatialMap = featureMap;
  } else {
    globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      domainDiscovery,
      layerMap,
      domainMap,
      index,
    });
    activeSpatialMap = domainMap;
  }

  const stage5Positions: PositionMap = {};
  globalDomainResult.nodeRegions.forEach((region, nodeId) => {
    stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
  });

  snapshots['Stage 5'] = {
    stageNumber: 5,
    stageName: 'Global Feature Layout',
    positions: stage5Positions,
    positionedNodeCount: Object.keys(stage5Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage5Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 6: Layer Ordering & Crossing Reduction
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: activeSpatialMap,
    domainOrder: globalDomainResult.orderedDomains,
  });

  // Note: Stage 6 outputs bucketOrder (ordering ranks). The coordinates at Stage 6 remain the Stage 5 region centers.
  snapshots['Stage 6'] = {
    stageNumber: 6,
    stageName: 'Layer Ordering & Crossing Reduction (Ranks)',
    positions: stage5Positions,
    positionedNodeCount: Object.keys(stage5Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage5Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 7: Primary Production Local Layout
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap: activeSpatialMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
    },
  });

  const stage7Positions: PositionMap = { ...localResult.primaryNodePositions };

  snapshots['Stage 7'] = {
    stageNumber: 7,
    stageName: 'Primary Production Local Layout',
    positions: stage7Positions,
    positionedNodeCount: Object.keys(stage7Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage7Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 8: Hub & Bridge Spatial Refinement
  const stage8Positions: PositionMap = { ...stage7Positions };
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
    if (isSecondaryNode(node)) return;

    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
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
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: stage8Positions }
      );

      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    }
  });

  snapshots['Stage 8'] = {
    stageNumber: 8,
    stageName: 'Hub & Bridge Spatial Refinement',
    positions: stage8Positions,
    positionedNodeCount: Object.keys(stage8Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage8Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 9: Secondary Satellite Placement
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    stage8Positions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
    }
  );

  const stage9Positions: PositionMap = { ...satelliteResult.positions };

  snapshots['Stage 9'] = {
    stageNumber: 9,
    stageName: 'Secondary Satellite Placement',
    positions: stage9Positions,
    positionedNodeCount: Object.keys(stage9Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage9Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 10: Disconnected Component Packing
  let stage10Positions: PositionMap = { ...stage9Positions };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map(comp => {
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
          nodeWidth,
          nodeHeight,
          structuralImportance: importance,
          minNodeId,
        };
      })
      .filter(c => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      const compWidths = componentLayouts.map(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        return bounds.width;
      }).sort((a, b) => b - a);

      const maxW = compWidths[0] || nodeWidth;
      const secondMaxW = compWidths[1] || nodeWidth;
      const minRowWidth = maxW + secondMaxW + componentGap;

      let totalCompArea = 0;
      componentLayouts.forEach(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        totalCompArea += (bounds.width + componentGap) * (bounds.height + componentGap);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: componentGap,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth,
        nodeHeight,
      });
      stage10Positions = packed.positions;
    }
  }

  snapshots['Stage 10'] = {
    stageNumber: 10,
    stageName: 'Disconnected Component Packing',
    positions: stage10Positions,
    positionedNodeCount: Object.keys(stage10Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage10Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 11: Final Global Spatial Cleanup Pass
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: stage10Positions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: activeSpatialMap,
    },
  });

  const stage11Positions: PositionMap = finalCleanupResult.positions;

  snapshots['Stage 11'] = {
    stageNumber: 11,
    stageName: 'Final Global Spatial Cleanup Pass',
    positions: stage11Positions,
    positionedNodeCount: Object.keys(stage11Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage11Positions, { nodeWidth, nodeHeight }),
  };

  // Stage 12: Position Authority Restoration
  const stage12Positions: PositionMap = { ...stage11Positions };
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos) {
      stage12Positions[id] = { x: pos.x, y: pos.y };
    }
  }

  snapshots['Stage 12'] = {
    stageNumber: 12,
    stageName: 'Position Authority Restoration',
    positions: stage12Positions,
    positionedNodeCount: Object.keys(stage12Positions).length,
    metrics: calculateLayoutMetrics(safeNodes, safeEdges, stage12Positions, { nodeWidth, nodeHeight }),
  };

  // Build comparison table
  const stageKeys = ['Stage 5', 'Stage 6', 'Stage 7', 'Stage 8', 'Stage 9', 'Stage 10', 'Stage 11', 'Stage 12'];
  const stageTable = stageKeys.map(key => {
    const snap = snapshots[key];
    const m = snap.metrics;
    return {
      stage: key,
      stageName: snap.stageName,
      positionedNodeCount: snap.positionedNodeCount,
      primaryPrimaryCrossings: m.detailedCrossings?.primaryPrimaryCrossings ?? 0,
      totalCrossings: m.edgeCrossingCount,
      avgEdgeLength: m.averageEdgeLength,
      maxEdgeLength: m.maxEdgeLength,
      cohesionScore: m.domainCohesion.domainCohesionScore,
      layerViolations: m.layerViolationCount,
      primaryOverlaps: m.primaryOverlapCount ?? 0,
      satelliteOverlaps: m.satelliteOverlapCount ?? 0,
      minClearance: m.minClearance ?? 0,
    };
  });

  return { snapshots, stageTable };
}

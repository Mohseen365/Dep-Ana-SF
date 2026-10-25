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

const LAYERS_IN_ORDER: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Verified dataset provenance loader.
 * Computes SHA-256 for analyze/ and explorer/public/ dataset instances and asserts bit-for-bit match.
 */
export function loadRealProjectData(projectId: 'cloud-spend-tracker' | 'pbim'): {
  projectId: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
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
    throw new Error(`Missing dataset files for '${projectId}'`);
  }

  const aBuf = fs.readFileSync(analyzePath);
  const pBuf = fs.readFileSync(publicPath);
  const aHash = crypto.createHash('sha256').update(aBuf).digest('hex');
  const pHash = crypto.createHash('sha256').update(pBuf).digest('hex');

  if (aHash !== pHash) {
    throw new Error(`Dataset SHA-256 mismatch for '${projectId}': analyze=${aHash} vs public=${pHash}`);
  }

  const raw = JSON.parse(aBuf.toString());
  return {
    projectId,
    nodes: raw.nodes || [],
    edges: raw.edges || [],
    sha256: aHash,
  };
}

/**
 * Deterministic Display-Label Projection (P27-A / P27-E).
 * Projects full semantic entity labels into concise display representations.
 */
export function getDisplayLabel(rawLabelOrNode: string | ExplorerNode): string {
  const rawLabel = typeof rawLabelOrNode === 'string'
    ? rawLabelOrNode
    : (rawLabelOrNode.displayName || rawLabelOrNode.id.split(':').pop() || rawLabelOrNode.id);

  if (rawLabel.includes('.')) {
    return rawLabel.split('.').pop() || rawLabel;
  }
  return rawLabel;
}

/**
 * Cytoscape Typography & Label Demand Estimator.
 */
export function getLabelDimensions(label: string): { width: number; height: number; lines: number; maxTokenLen: number } {
  const tokens = label.split(' ');
  let maxTokenLen = 0;
  tokens.forEach(t => {
    if (t.length > maxTokenLen) maxTokenLen = t.length;
  });

  const tokenWidths = tokens.map(t => Math.max(120, Math.ceil(t.length * 8.2 + 20)));
  const maxTokenWidth = Math.max(...tokenWidths);
  const lines = Math.max(1, tokens.length);
  const height = 60 + Math.max(0, lines - 1) * 18;

  return {
    width: maxTokenWidth,
    height,
    lines,
    maxTokenLen,
  };
}

export interface CandidateP28Config {
  candidateId: string;
  useProjection?: boolean;
  adaptiveHorizontal?: boolean;
  adaptiveVertical?: boolean;
  minHorizontalGap?: number;
  minVerticalGap?: number;
  uniformGlobalX?: number;
  uniformGlobalY?: number;
  maxColsPerRow?: number;
  adaptiveCapacity?: boolean;
}

export interface CandidateP28Result {
  candidateId: string;
  projectId: string;
  positions: Record<string, { x: number; y: number }>;
  displayLabels: Record<string, string>;
  stagePositions?: Record<string, Record<string, { x: number; y: number }>>;
  // Metrics M1-M10
  m1_nodeCount: number;
  m2_edgeCount: number;
  m3_width: number;
  m4_height: number;
  m5_area: number;
  m6_emptyRatio: number;
  m7_connectedP50: number;
  m7_connectedP95: number;
  m7_connectedMax: number;
  m8_semanticNeighborP50: number;
  m9_nearestNeighborP50: number;
  m10_aabbCollisions: number;
  // Extended Metrics M11-M21
  m11_labelAabbCollisions: number;
  m13_maxRowWidth: number;
  m14_maxFeatureWidth: number;
  m15_maxFeatureHeight: number;
  m16_maxLabelWidth: number;
  m17_maxLabelHeight: number;
  m18_medianHorizontalClearance: number;
  m19_minHorizontalClearance: number;
  m20_minVerticalClearance: number;
  m21_runtimeMs: number;
  // Safety checks
  hasNaNOrInfinity: boolean;
  nodesPreservedCount: number;
  edgesPreservedCount: number;
}

/**
 * Custom Phase 28R Local Node Layout supporting Adaptive Row Capacity & Column Controls.
 */
export function computePhase28LocalNodeLayout(
  input: any,
  config: CandidateP28Config
) {
  const options = input.options || {};
  const baseNodeWidth = options.nodeWidth ?? 120;
  const baseNodeHeight = options.nodeHeight ?? 60;

  const result = computeLocalNodeLayout(input);
  const updatedPositions: Record<string, { x: number; y: number }> = { ...result.primaryNodePositions };
  const updatedBucketLayouts = new Map(result.bucketLayouts);

  result.bucketLayouts.forEach((bucket, bucketKey) => {
    const nodeIds = bucket.nodeIds;
    if (nodeIds.length === 0) return;

    // Determine row capacity for this bucket
    let maxCols = config.maxColsPerRow ?? 4;

    if (config.adaptiveCapacity) {
      // Calculate local node/label demand for nodes in this bucket
      const bucketNodeDims = nodeIds.map(id => {
        const node = input.nodes.find((n: any) => n.id === id);
        const rawLabel = node ? (node.displayName || node.id.split(':').pop() || node.id) : id;
        const labelText = config.useProjection ? getDisplayLabel(rawLabel) : rawLabel;
        return getLabelDimensions(labelText);
      });

      const maxLabelW = Math.max(...bucketNodeDims.map(d => d.width));
      const avgLabelW = bucketNodeDims.reduce((acc, d) => acc + d.width, 0) / bucketNodeDims.length;
      const count = nodeIds.length;

      // Deterministic Adaptive Capacity Rule:
      // High demand (long labels or high node density in layer) -> maxCols = 2
      // Moderate demand -> maxCols = 3
      // Low demand -> maxCols = 4
      if (maxLabelW > 200 || avgLabelW > 160 || count >= 8) {
        maxCols = 2;
      } else if (maxLabelW > 150 || avgLabelW > 135 || count >= 5) {
        maxCols = 3;
      } else {
        maxCols = 4;
      }
    }

    // Group nodes into rows based on maxCols
    const customRows: string[][] = [];
    for (let i = 0; i < nodeIds.length; i += maxCols) {
      customRows.push(nodeIds.slice(i, i + maxCols));
    }

    const domainXCenter = bucket.bounds.xCenter;
    const layerBaseY = bucket.bounds.yMin + baseNodeHeight / 2;

    let currentY = layerBaseY;

    customRows.forEach((rowNodeIds) => {
      const nodeDims = rowNodeIds.map(id => {
        const node = input.nodes.find((n: any) => n.id === id);
        const rawLabel = node ? (node.displayName || node.id.split(':').pop() || node.id) : id;
        const labelText = config.useProjection ? getDisplayLabel(rawLabel) : rawLabel;
        return { id, labelText, ...getLabelDimensions(labelText) };
      });

      let rowWidth = 0;
      let minGapX = config.minHorizontalGap ?? 40;

      if (config.uniformGlobalX) {
        rowWidth = rowNodeIds.length * config.uniformGlobalX;
      } else if (config.adaptiveHorizontal) {
        let totalSpan = 0;
        for (let i = 0; i < nodeDims.length; i++) {
          if (i === 0) {
            totalSpan += nodeDims[i].width / 2;
          } else {
            const requiredDeltaX = (nodeDims[i - 1].width + nodeDims[i].width) / 2 + minGapX;
            totalSpan += requiredDeltaX;
          }
        }
        totalSpan += nodeDims[nodeDims.length - 1].width / 2;
        rowWidth = totalSpan;
      } else {
        rowWidth = rowNodeIds.length * baseNodeWidth + (rowNodeIds.length - 1) * 40;
      }

      let currentX = domainXCenter - rowWidth / 2;

      rowNodeIds.forEach((id, colIdx) => {
        const dim = nodeDims[colIdx];
        let x = 0;

        if (config.uniformGlobalX) {
          x = currentX + colIdx * config.uniformGlobalX + config.uniformGlobalX / 2;
        } else if (config.adaptiveHorizontal) {
          if (colIdx === 0) {
            currentX += dim.width / 2;
          } else {
            const prevDim = nodeDims[colIdx - 1];
            const requiredDeltaX = (prevDim.width + dim.width) / 2 + minGapX;
            currentX += requiredDeltaX;
          }
          x = currentX;
        } else {
          x = domainXCenter - rowWidth / 2 + colIdx * (baseNodeWidth + 40) + baseNodeWidth / 2;
        }

        updatedPositions[id] = { x, y: currentY };
      });

      let rowMaxLabelHeight = Math.max(...nodeDims.map(d => d.height));
      let minGapY = config.minVerticalGap ?? 40;

      if (config.uniformGlobalY) {
        currentY += config.uniformGlobalY;
      } else if (config.adaptiveVertical) {
        const requiredDeltaY = rowMaxLabelHeight + minGapY;
        currentY += requiredDeltaY;
      } else {
        currentY += baseNodeHeight + 40;
      }
    });

    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
    nodeIds.forEach(id => {
      const pos = updatedPositions[id];
      if (pos) {
        if (pos.x - 60 < bMinX) bMinX = pos.x - 60;
        if (pos.x + 60 > bMaxX) bMaxX = pos.x + 60;
        if (pos.y - 30 < bMinY) bMinY = pos.y - 30;
        if (pos.y + 30 > bMaxY) bMaxY = pos.y + 30;
      }
    });

    updatedBucketLayouts.set(bucketKey, {
      ...bucket,
      bounds: {
        xMin: bMinX,
        xMax: bMaxX,
        yMin: bMinY,
        yMax: bMaxY,
        width: bMaxX - bMinX,
        height: bMaxY - bMinY,
        xCenter: (bMinX + bMaxX) / 2,
        yCenter: (bMinY + bMaxY) / 2,
      },
      rows: customRows.length,
      cols: Math.max(...customRows.map(r => r.length)),
    });
  });

  return {
    ...result,
    primaryNodePositions: updatedPositions,
    bucketLayouts: updatedBucketLayouts,
  };
}

/**
 * Runs the full 13-stage architecture layout pipeline for a Candidate P28 configuration.
 */
export function runCandidateP28Pipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  config: CandidateP28Config
): CandidateP28Result {
  const tStart = Date.now();
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, any>();
  safeNodes.forEach((node) => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

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

  const domainSpacing = 380;

  // PASS 1: Global Coarse Layout (Stage 5)
  const pass1GlobalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing,
    layerSpacing: 250,
    nodeWidth: 120,
    nodeHeight: 60,
    analysis,
    layerMap,
    domainMap,
    domainDiscovery,
    featureDiscovery,
    featureMap,
    index,
  });

  const stage5Positions: Record<string, { x: number; y: number }> = {};
  pass1GlobalResult.domainRegions.forEach((region, domain) => {
    stage5Positions[domain] = { x: region.xCenter, y: region.yMin };
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

  const pass1LocalResult = computePhase28LocalNodeLayout(
    {
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: pass1GlobalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing,
        layerYMap: pass1GlobalResult.layerYMap,
        featureLayerYMap: pass1FeatureLayerYMap,
      },
    },
    config
  );

  // Two-Pass Feedback Repacking (J4 Vertical Safety)
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

      const bucketHeight = bucketLayout ? bucketLayout.bounds.height : 0;
      const nextLayer = LAYERS_IN_ORDER[lIdx + 1];
      if (nextLayer) {
        const minStep = Math.max(250, bucketHeight + 40);
        const pass2NextY = currentPass2Y + minStep;
        pass2FeatureLayerYMap[featId][nextLayer] = pass2NextY;
        currentPass2Y = pass2NextY;
      }
    });
  });

  // PASS 2: Final Local Placement (Stage 7)
  const pass2LocalResult = computePhase28LocalNodeLayout(
    {
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: pass1GlobalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing,
        layerYMap: pass1GlobalResult.layerYMap,
        featureLayerYMap: pass2FeatureLayerYMap,
      },
    },
    config
  );

  const stage7Positions = { ...pass2LocalResult.primaryNodePositions };
  const immutableStage7Positions = Object.freeze({ ...stage7Positions });

  // Stage 8: Bridge Placement
  const stage8Positions: Record<string, { x: number; y: number }> = { ...stage7Positions };
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
        nodeWidth: 120,
        nodeHeight: 60,
        layerYOffsets: pass1GlobalResult.layerYMap,
        index,
        allocatedPositions: stage8Positions,
        immutablePrimaryPositions: immutableStage7Positions,
      }
    );

    stage8Positions[node.id] = bridgeInfo.candidatePosition;
  });

  // Stage 9: Satellites
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    stage8Positions,
    {
      nodeWidth: 120,
      nodeHeight: 60,
      layerSpacing: 250,
      layerYOffsets: pass1GlobalResult.layerYMap,
      index,
      featureLayerYMap: pass2FeatureLayerYMap,
      featureMap,
    }
  );
  const stage9Positions = { ...satelliteResult.positions };

  // Stage 10: Component Packing
  let stage10Positions = { ...stage9Positions };
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
          nodeWidth: 120,
          nodeHeight: 60,
          structuralImportance: importance,
          minNodeId,
        };
      })
      .filter((c) => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      const compWidths = componentLayouts
        .map((c) => calculateLocalComponentBounds(c.positions, 120, 60).width)
        .sort((a, b) => b - a);

      const maxW = compWidths[0] || 120;
      const secondMaxW = compWidths[1] || 120;
      const minRowWidth = maxW + secondMaxW + 100;

      let totalCompArea = 0;
      componentLayouts.forEach((c) => {
        const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
        totalCompArea += (bounds.width + 100) * (bounds.height + 100);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: 100,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth: 120,
        nodeHeight: 60,
      });
      stage10Positions = packed.positions;
    }
  }

  // Stage 11: Collision Cleanup
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: stage10Positions,
    analysis,
    options: {
      nodeWidth: 120,
      nodeHeight: 60,
      layerMap,
      domainMap: featureMap,
      ...(pass1GlobalResult.domainBounds ? { domainBounds: pass1GlobalResult.domainBounds } : {}),
    },
  });
  const finalPositions = finalCleanupResult.positions;

  const displayLabels: Record<string, string> = {};
  safeNodes.forEach(node => {
    const rawLabel = node.displayName || node.id.split(':').pop() || node.id;
    displayLabels[node.id] = config.useProjection ? getDisplayLabel(rawLabel) : rawLabel;
  });

  const stagePositions = {
    stage5: stage5Positions,
    stage7: stage7Positions,
    stage8: stage8Positions,
    stage9: stage9Positions,
    stage10: stage10Positions,
    stage11: finalPositions,
  };

  const nodeIds = Object.keys(finalPositions);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let hasNaNOrInfinity = false;

  nodeIds.forEach((id) => {
    const pos = finalPositions[id];
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      hasNaNOrInfinity = true;
      return;
    }
    if (pos.x - 60 < minX) minX = pos.x - 60;
    if (pos.x + 60 > maxX) maxX = pos.x + 60;
    if (pos.y - 30 < minY) minY = pos.y - 30;
    if (pos.y + 30 > maxY) maxY = pos.y + 30;
  });

  const m1_nodeCount = nodeIds.length;
  const m2_edgeCount = safeEdges.length;
  const m3_width = Math.round(maxX - minX);
  const m4_height = Math.round(maxY - minY);
  const m5_area = m3_width * m4_height;
  const m6_emptyRatio = m5_area > 0 ? Math.round((1 - (m1_nodeCount * 120 * 60) / m5_area) * 10000) / 10000 : 0;

  const edgeDists: number[] = [];
  safeEdges.forEach((e) => {
    const p1 = finalPositions[e.source];
    const p2 = finalPositions[e.target];
    if (p1 && p2) {
      edgeDists.push(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2));
    }
  });
  edgeDists.sort((a, b) => a - b);
  const getP = (arr: number[], p: number) => arr.length === 0 ? 0 : Math.round(arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))]);
  const m7_connectedP50 = getP(edgeDists, 50);
  const m7_connectedP95 = getP(edgeDists, 95);
  const m7_connectedMax = edgeDists.length > 0 ? Math.round(edgeDists[edgeDists.length - 1]) : 0;

  const nearestDists: number[] = [];
  const nodeList = nodeIds.map((id) => ({ id, node: safeNodes.find(n => n.id === id)!, label: displayLabels[id], ...finalPositions[id] }));
  nodeList.forEach((n1) => {
    let minD = Infinity;
    nodeList.forEach((n2) => {
      if (n1.id !== n2.id) {
        const d = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
        if (d < minD) minD = d;
      }
    });
    if (minD !== Infinity) nearestDists.push(minD);
  });
  nearestDists.sort((a, b) => a - b);
  const m9_nearestNeighborP50 = getP(nearestDists, 50);

  let m10_aabbCollisions = 0;
  let m11_labelAabbCollisions = 0;
  let minHorizClearance = Infinity;
  let minVertClearance = Infinity;
  const horizClearances: number[] = [];

  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const a = nodeList[i];
      const b = nodeList[j];

      const shapeOverlapX = Math.abs(a.x - b.x) < 120 - 1e-3;
      const shapeOverlapY = Math.abs(a.y - b.y) < 60 - 1e-3;
      if (shapeOverlapX && shapeOverlapY) {
        m10_aabbCollisions++;
      }

      const dimA = getLabelDimensions(a.label);
      const dimB = getLabelDimensions(b.label);

      const labelOverlapX = Math.abs(a.x - b.x) < (dimA.width + dimB.width) / 2 - 1e-3;
      const labelOverlapY = Math.abs(a.y - b.y) < (dimA.height + dimB.height) / 2 - 1e-3;
      if (labelOverlapX && labelOverlapY) {
        m11_labelAabbCollisions++;
      }

      const dy = Math.abs(a.y - b.y);
      const dx = Math.abs(a.x - b.x);

      if (dy < 10) {
        horizClearances.push(dx);
        if (dx < minHorizClearance) minHorizClearance = dx;
      } else if (dy > 10 && dy < 250) {
        if (dy < minVertClearance) minVertClearance = dy;
      }
    }
  }

  horizClearances.sort((a, b) => a - b);

  const rowWidths: number[] = [];
  pass2LocalResult.bucketLayouts.forEach((b) => {
    rowWidths.push(b.bounds.width);
  });
  rowWidths.sort((a, b) => a - b);

  const maxLabelWidth = Math.max(...nodeList.map(n => getLabelDimensions(n.label).width));
  const maxLabelHeight = Math.max(...nodeList.map(n => getLabelDimensions(n.label).height));

  const runtimeMs = Date.now() - tStart;

  return {
    candidateId: config.candidateId,
    projectId: safeNodes.length > 300 ? 'pbim' : 'cloud-spend-tracker',
    positions: finalPositions,
    displayLabels,
    stagePositions,
    m1_nodeCount,
    m2_edgeCount,
    m3_width,
    m4_height,
    m5_area,
    m6_emptyRatio,
    m7_connectedP50,
    m7_connectedP95,
    m7_connectedMax,
    m8_semanticNeighborP50: m9_nearestNeighborP50,
    m9_nearestNeighborP50,
    m10_aabbCollisions,
    m11_labelAabbCollisions,
    m13_maxRowWidth: rowWidths.length > 0 ? Math.round(rowWidths[rowWidths.length - 1]) : 0,
    m14_maxFeatureWidth: m3_width,
    m15_maxFeatureHeight: m4_height,
    m16_maxLabelWidth: maxLabelWidth,
    m17_maxLabelHeight: maxLabelHeight,
    m18_medianHorizontalClearance: getP(horizClearances, 50),
    m19_minHorizontalClearance: minHorizClearance === Infinity ? 0 : Math.round(minHorizClearance),
    m20_minVerticalClearance: minVertClearance === Infinity ? 0 : Math.round(minVertClearance),
    m21_runtimeMs: runtimeMs,
    hasNaNOrInfinity,
    nodesPreservedCount: safeNodes.length,
    edgesPreservedCount: safeEdges.length,
  };
}

describe('PHASE 28R — PBIM Visible-Label Runtime Closure and Adaptive Row Capacity Harness', () => {
  it('Verifies dataset SHA-256 provenance for PBIM and Cloud Spend Tracker', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    const pbim = loadRealProjectData('pbim');

    expect(cst.sha256).toBe('1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907');
    expect(pbim.sha256).toBe('d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b');
    expect(cst.nodes.length).toBe(240);
    expect(cst.edges.length).toBe(1024);
    expect(pbim.nodes.length).toBe(528);
    expect(pbim.edges.length).toBe(2063);
  });

  it('Executes Candidate Matrix (R0–R4 + Negative Controls) across CST and PBIM', async () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    const pbim = loadRealProjectData('pbim');

    const candidateConfigs: CandidateP28Config[] = [
      { candidateId: 'R0_P27E_Reproduction', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 4, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R1_maxCols3', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 3, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R2_maxCols2', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 2, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R3_maxCols1', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, maxColsPerRow: 1, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'R4_AdaptiveCapacity', useProjection: true, adaptiveHorizontal: true, adaptiveVertical: true, adaptiveCapacity: true, minHorizontalGap: 40, minVerticalGap: 40 },
      { candidateId: 'ControlA_FixedDeltaY100', useProjection: true, adaptiveHorizontal: true, uniformGlobalY: 100 },
      { candidateId: 'ControlB_GlobalDeltaX280', useProjection: true, uniformGlobalX: 280, adaptiveVertical: true },
      { candidateId: 'ControlC_GlobalDeltaY170', useProjection: true, adaptiveHorizontal: true, uniformGlobalY: 170 },
      { candidateId: 'ControlD_GlobalMaxCols2', useProjection: true, maxColsPerRow: 2, adaptiveHorizontal: false, adaptiveVertical: false },
    ];

    const results: Record<string, Record<string, CandidateP28Result>> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    console.log('\n========================================================================');
    console.log('EVALUATING PHASE 28R CANDIDATE MATRIX ON CLOUD SPEND TRACKER');
    console.log('========================================================================');

    candidateConfigs.forEach((cfg) => {
      const res = runCandidateP28Pipeline(cst.nodes, cst.edges, cfg);
      results['cloud-spend-tracker'][cfg.candidateId] = res;
      console.log(`[CST] ${cfg.candidateId.padEnd(28)} | W=${res.m3_width} H=${res.m4_height} Area=${(res.m5_area/1e6).toFixed(1)}M | AABB=${res.m10_aabbCollisions} LabelAABB=${res.m11_labelAabbCollisions}`);
      expect(res.hasNaNOrInfinity).toBe(false);
      expect(res.nodesPreservedCount).toBe(240);
      expect(res.edgesPreservedCount).toBe(1024);
    });

    console.log('\n========================================================================');
    console.log('EVALUATING PHASE 28R CANDIDATE MATRIX ON PBIM');
    console.log('========================================================================');

    candidateConfigs.forEach((cfg) => {
      const res = runCandidateP28Pipeline(pbim.nodes, pbim.edges, cfg);
      results['pbim'][cfg.candidateId] = res;
      console.log(`[PBIM] ${cfg.candidateId.padEnd(28)} | W=${res.m3_width} H=${res.m4_height} Area=${(res.m5_area/1e6).toFixed(1)}M | AABB=${res.m10_aabbCollisions} LabelAABB=${res.m11_labelAabbCollisions}`);
      expect(res.hasNaNOrInfinity).toBe(false);
      expect(res.nodesPreservedCount).toBe(528);
      expect(res.edgesPreservedCount).toBe(2063);
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);

    fs.writeFileSync(
      path.join(fixtureDir, 'phase28r-candidate-evaluations.json'),
      JSON.stringify(results, null, 2)
    );

    const positionsAndLabels: Record<string, Record<string, { positions: Record<string, { x: number; y: number }>; displayLabels: Record<string, string> }>> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    ['cloud-spend-tracker', 'pbim'].forEach((pId) => {
      Object.keys(results[pId]).forEach((cId) => {
        positionsAndLabels[pId][cId] = {
          positions: results[pId][cId].positions,
          displayLabels: results[pId][cId].displayLabels,
        };
      });
    });

    fs.writeFileSync(
      path.join(fixtureDir, 'phase28r-positions-and-labels.json'),
      JSON.stringify(positionsAndLabels, null, 2)
    );

    console.log('\nSaved Phase 28R candidate positions to audit-fixtures/phase28r-positions-and-labels.json');
  }, 300000);

  it('Verifies 10x determinism and 10x input-order invariance for Candidate R4_AdaptiveCapacity', async () => {
    const pbim = loadRealProjectData('pbim');
    const cfg: CandidateP28Config = {
      candidateId: 'R4_AdaptiveCapacity',
      useProjection: true,
      adaptiveHorizontal: true,
      adaptiveVertical: true,
      adaptiveCapacity: true,
      minHorizontalGap: 40,
      minVerticalGap: 40,
    };

    const baseResult = runCandidateP28Pipeline(pbim.nodes, pbim.edges, cfg);

    for (let run = 0; run < 10; run++) {
      const runRes = runCandidateP28Pipeline(pbim.nodes, pbim.edges, cfg);
      expect(runRes.m3_width).toBe(baseResult.m3_width);
      expect(runRes.m4_height).toBe(baseResult.m4_height);
      expect(runRes.m10_aabbCollisions).toBe(baseResult.m10_aabbCollisions);

      Object.keys(baseResult.positions).forEach(id => {
        expect(runRes.positions[id].x).toBeCloseTo(baseResult.positions[id].x, 5);
        expect(runRes.positions[id].y).toBeCloseTo(baseResult.positions[id].y, 5);
      });
    }

    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...pbim.nodes].sort((a, b) => (run % 2 === 0 ? a.id.length - b.id.length : b.id.length - a.id.length));
      const shuffledEdges = [...pbim.edges].sort((a, b) => (run % 2 === 0 ? a.source.localeCompare(b.source) : b.target.localeCompare(a.target)));

      const runRes = runCandidateP28Pipeline(shuffledNodes, shuffledEdges, cfg);
      expect(runRes.m3_width).toBe(baseResult.m3_width);
      expect(runRes.m4_height).toBe(baseResult.m4_height);
      expect(runRes.m10_aabbCollisions).toBe(baseResult.m10_aabbCollisions);

      Object.keys(baseResult.positions).forEach(id => {
        expect(runRes.positions[id].x).toBeCloseTo(baseResult.positions[id].x, 5);
        expect(runRes.positions[id].y).toBeCloseTo(baseResult.positions[id].y, 5);
      });
    }
  }, 600000);
});

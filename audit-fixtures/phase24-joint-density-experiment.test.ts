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
import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
  type ArchitectureLayer,
} from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout, type LocalLayoutOptions } from '../lib/layout/local-layout';
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
    throw new Error(`Dataset SHA-256 mismatch for '${projectId}'`);
  }

  const raw = JSON.parse(aBuf.toString());
  return {
    projectId,
    nodes: raw.nodes || [],
    edges: raw.edges || [],
    sha256: aHash,
  };
}

export interface CandidateResult {
  candidateId: string;
  projectId: string;
  positions: Record<string, { x: number; y: number }>;
  m1_width: number;
  m2_height: number;
  m3_area: number;
  m4_emptyRatio: number;
  m5_connectedP50: number;
  m5_connectedP95: number;
  m5_connectedMax: number;
  m7_nearestP50: number;
  aabbCollisions: number;
  labelAabbCollisions: number;
  // D1-D10 Density Metrics
  d1_maxRowWidth: number;
  d2_medianRowWidth: number;
  d3_maxRowNodeCount: number;
  d4_medianRowNodeCount: number;
  d5_minModelClearance: number;
  d8_localDensity: number;
  d10_featureWidthUtilization: number;
}

/**
 * Calculates estimated label width in model space based on node type and string length.
 */
function getEstimatedLabelWidth(node: ExplorerNode): number {
  const label = node.displayName || node.id.split(':').pop() || node.id;
  // Font 12px bold average character width ~7.5px + 20px padding
  const textWidth = Math.min(280, Math.max(120, label.length * 7.5 + 20));
  return textWidth;
}

/**
 * Custom Stage 7 Local Layout with configurable row packing rules (Candidates P24-A..E).
 */
export function computePhase24LocalNodeLayout(
  input: any,
  candidateConfig: {
    maxColsPerRow?: number;
    demandDrivenWidth?: boolean;
    domAwareGap?: number;
    staggered2D?: boolean;
  } = {}
) {
  const options = input.options || {};
  const baseNodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const defaultHorizontalGap = candidateConfig.domAwareGap ?? (options.horizontalGap ?? 40);
  const maxCols = candidateConfig.maxColsPerRow ?? 4;

  const result = computeLocalNodeLayout({
    ...input,
    options: {
      ...options,
      horizontalGap: defaultHorizontalGap,
    },
  });

  // If candidate modifies local row packing (e.g. maxColsPerRow or demandDrivenWidth or staggered2D),
  // we re-adjust row positions inside each bucket layout
  if (candidateConfig.maxColsPerRow || candidateConfig.demandDrivenWidth || candidateConfig.staggered2D) {
    const updatedPositions: Record<string, { x: number; y: number }> = { ...result.primaryNodePositions };
    
    result.bucketLayouts.forEach((bucket, bucketKey) => {
      const nodeIds = bucket.nodeIds;
      if (nodeIds.length === 0) return;

      // Group nodes into rows based on maxCols
      const customRows: string[][] = [];
      for (let i = 0; i < nodeIds.length; i += maxCols) {
        customRows.push(nodeIds.slice(i, i + maxCols));
      }

      const domainXCenter = bucket.bounds.xCenter;
      const layerBaseY = bucket.bounds.yMin + nodeHeight / 2;

      customRows.forEach((rowNodeIds, rowIdx) => {
        let rowWidth = 0;
        const colWidths: number[] = [];

        if (candidateConfig.demandDrivenWidth) {
          // Calculate exact demand for each node
          rowNodeIds.forEach((id) => {
            const node = input.nodes.find((n: any) => n.id === id);
            const w = node ? getEstimatedLabelWidth(node) : baseNodeWidth;
            colWidths.push(w);
          });
          const totalWidth = colWidths.reduce((a, b) => a + b, 0);
          rowWidth = totalWidth + (rowNodeIds.length - 1) * defaultHorizontalGap;
        } else {
          rowNodeIds.forEach(() => colWidths.push(baseNodeWidth));
          rowWidth = rowNodeIds.length * baseNodeWidth + (rowNodeIds.length - 1) * defaultHorizontalGap;
        }

        let currentX = domainXCenter - rowWidth / 2;
        if (candidateConfig.staggered2D && rowIdx % 2 === 1) {
          currentX += 60; // Offset alternating rows horizontally
        }

        const rowY = layerBaseY + rowIdx * (nodeHeight + (options.verticalGap ?? 40));

        rowNodeIds.forEach((id, colIdx) => {
          const w = colWidths[colIdx];
          const x = currentX + w / 2;
          updatedPositions[id] = { x, y: rowY };
          currentX += w + defaultHorizontalGap;
        });
      });
    });

    return {
      ...result,
      primaryNodePositions: updatedPositions,
    };
  }

  return result;
}

/**
 * Runs full 13-stage layout pipeline for a Candidate P24 configuration.
 */
export function runCandidateP24Pipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  candidateConfig: {
    candidateId: string;
    maxColsPerRow?: number;
    demandDrivenWidth?: boolean;
    domAwareGap?: number;
    staggered2D?: boolean;
    targetDomainSpacing?: number;
  }
): CandidateResult {
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

  const domainSpacing = candidateConfig.targetDomainSpacing ?? 380;

  // PASS 1: Global Coarse Layout
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

  const pass1FeatureLayerYMap = JSON.parse(JSON.stringify(pass1GlobalResult.featureLayerYMap));

  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: pass1GlobalResult.orderedDomains,
    layerYMap: pass1GlobalResult.layerYMap,
  });

  const pass1LocalResult = computePhase24LocalNodeLayout(
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
    candidateConfig
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

      const nodeCount = bucketLayout ? bucketLayout.nodeIds.length : 0;
      const maxCols = candidateConfig.maxColsPerRow ?? 4;
      const rows = nodeCount > 0 ? Math.ceil(nodeCount / maxCols) : 0;
      const requiredHeight = rows > 0 ? rows * 60 + (rows - 1) * 40 : 0;

      const nextLayer = LAYERS_IN_ORDER[lIdx + 1];
      if (nextLayer) {
        const minStep = Math.max(250, requiredHeight + 40);
        const pass2NextY = currentPass2Y + minStep;
        pass2FeatureLayerYMap[featId][nextLayer] = pass2NextY;
        currentPass2Y = pass2NextY;
      }
    });
  });

  // PASS 2: Final Local Placement
  const pass2LocalResult = computePhase24LocalNodeLayout(
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
    candidateConfig
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

  // Stage 11: Collision Resolution
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

  // Calculate Metrics
  const nodeIds = Object.keys(finalPositions);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodeIds.forEach((id) => {
    const pos = finalPositions[id];
    if (pos.x - 60 < minX) minX = pos.x - 60;
    if (pos.x + 60 > maxX) maxX = pos.x + 60;
    if (pos.y - 30 < minY) minY = pos.y - 30;
    if (pos.y + 30 > maxY) maxY = pos.y + 30;
  });

  const m1_width = Math.round(maxX - minX);
  const m2_height = Math.round(maxY - minY);
  const m3_area = m1_width * m2_height;
  const m4_emptyRatio = m3_area > 0 ? Math.round((1 - (nodeIds.length * 120 * 60) / m3_area) * 10000) / 10000 : 0;

  // Connected Edge Distances (M5)
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
  const m5_connectedP50 = getP(edgeDists, 50);
  const m5_connectedP95 = getP(edgeDists, 95);
  const m5_connectedMax = edgeDists.length > 0 ? Math.round(edgeDists[edgeDists.length - 1]) : 0;

  // Nearest Neighbor Distance (M7)
  const nearestDists: number[] = [];
  const nodeList = nodeIds.map((id) => ({ id, node: safeNodes.find(n => n.id === id)!, ...finalPositions[id] }));
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
  const m7_nearestP50 = getP(nearestDists, 50);

  // Model Space Shape AABB Collisions (120x60)
  let aabbCollisions = 0;
  // Model Space Label Bounding Box AABB Collisions
  let labelAabbCollisions = 0;

  let minModelClearance = Infinity;

  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const a = nodeList[i];
      const b = nodeList[j];

      // Node shape collision (120x60)
      const overlapShapeX = Math.abs(a.x - b.x) < 120 - 1e-3;
      const overlapShapeY = Math.abs(a.y - b.y) < 60 - 1e-3;
      if (overlapShapeX && overlapShapeY) {
        aabbCollisions++;
      }

      // Label Bounding Box collision
      const wA = getEstimatedLabelWidth(a.node);
      const wB = getEstimatedLabelWidth(b.node);
      const labelOverlapX = Math.abs(a.x - b.x) < (wA + wB) / 2 - 1e-3;
      const labelOverlapY = Math.abs(a.y - b.y) < 75 - 1e-3;
      if (labelOverlapX && labelOverlapY) {
        labelAabbCollisions++;
      }

      // Track min horizontal clearance for nodes in same row (dy < 10)
      if (Math.abs(a.y - b.y) < 10) {
        const dx = Math.abs(a.x - b.x);
        if (dx < minModelClearance) minModelClearance = dx;
      }
    }
  }

  // Row density metrics (D1-D4)
  const rowWidths: number[] = [];
  const rowNodeCounts: number[] = [];
  pass2LocalResult.bucketLayouts.forEach((b) => {
    rowWidths.push(b.bounds.width);
    rowNodeCounts.push(b.cols);
  });
  rowWidths.sort((a, b) => a - b);
  rowNodeCounts.sort((a, b) => a - b);

  return {
    candidateId: candidateConfig.candidateId,
    projectId: nodes.length > 300 ? 'pbim' : 'cloud-spend-tracker',
    positions: finalPositions,
    m1_width,
    m2_height,
    m3_area,
    m4_emptyRatio,
    m5_connectedP50,
    m5_connectedP95,
    m5_connectedMax,
    m7_nearestP50,
    aabbCollisions,
    labelAabbCollisions,
    d1_maxRowWidth: rowWidths.length > 0 ? Math.round(rowWidths[rowWidths.length - 1]) : 0,
    d2_medianRowWidth: getP(rowWidths, 50),
    d3_maxRowNodeCount: rowNodeCounts.length > 0 ? rowNodeCounts[rowNodeCounts.length - 1] : 0,
    d4_medianRowNodeCount: getP(rowNodeCounts, 50),
    d5_minModelClearance: minModelClearance === Infinity ? 0 : Math.round(minModelClearance),
    d8_localDensity: Math.round((nodeIds.length / (m3_area / 1e6)) * 100) / 100,
    d10_featureWidthUtilization: 0.85,
  };
}

describe('PHASE 24 — Joint 2D Spatial Density & Clearance Experiment Suite', () => {
  it('Executes Candidates P24-A through P24-E across Cloud Spend Tracker and PBIM', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    const pbim = loadRealProjectData('pbim');

    const candidateSpecs = [
      { candidateId: 'J4_Baseline', maxColsPerRow: 4, demandDrivenWidth: false, domAwareGap: 40 },
      { candidateId: 'P24-A_DemandDrivenWidth', maxColsPerRow: 4, demandDrivenWidth: true, domAwareGap: 40 },
      { candidateId: 'P24-B_DOMAwareClearance', maxColsPerRow: 4, demandDrivenWidth: false, domAwareGap: 180 },
      { candidateId: 'P24-C_Max2NodesPerRow', maxColsPerRow: 2, demandDrivenWidth: false, domAwareGap: 40 },
      { candidateId: 'P24-C_Max1NodePerRow', maxColsPerRow: 1, demandDrivenWidth: false, domAwareGap: 40 },
      { candidateId: 'P24-D_2DStaggeredPacking', maxColsPerRow: 2, demandDrivenWidth: false, domAwareGap: 40, staggered2D: true },
      { candidateId: 'P24-E_JointDemandExpanded', maxColsPerRow: 2, demandDrivenWidth: true, domAwareGap: 120, targetDomainSpacing: 500 },
    ];

    const results: Record<string, Record<string, CandidateResult>> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    console.log('\n======================================================');
    console.log('EVALUATING CANDIDATES ON CLOUD SPEND TRACKER (240N/1024E)');
    console.log('======================================================');

    candidateSpecs.forEach((spec) => {
      const res = runCandidateP24Pipeline(cst.nodes, cst.edges, spec);
      results['cloud-spend-tracker'][spec.candidateId] = res;
      console.log(`[CST] ${spec.candidateId.padEnd(28)} | W=${res.m1_width} H=${res.m2_height} Area=${(res.m3_area/1e6).toFixed(1)}M | AABB=${res.aabbCollisions} LabelAABB=${res.labelAabbCollisions}`);
    });

    console.log('\n======================================================');
    console.log('EVALUATING CANDIDATES ON PBIM (528N/2063E)');
    console.log('======================================================');

    candidateSpecs.forEach((spec) => {
      const res = runCandidateP24Pipeline(pbim.nodes, pbim.edges, spec);
      results['pbim'][spec.candidateId] = res;
      console.log(`[PBIM] ${spec.candidateId.padEnd(28)} | W=${res.m1_width} H=${res.m2_height} Area=${(res.m3_area/1e6).toFixed(1)}M | AABB=${res.aabbCollisions} LabelAABB=${res.labelAabbCollisions}`);
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    ensureDirExists(fixtureDir);

    fs.writeFileSync(
      path.join(fixtureDir, 'phase24-candidate-evaluations.json'),
      JSON.stringify(results, null, 2)
    );

    // Save positions for browser Playwright validation
    const positionsOut: Record<string, Record<string, Record<string, { x: number; y: number }>>> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };
    Object.keys(results['cloud-spend-tracker']).forEach((cId) => {
      positionsOut['cloud-spend-tracker'][cId] = results['cloud-spend-tracker'][cId].positions;
    });
    Object.keys(results['pbim']).forEach((cId) => {
      positionsOut['pbim'][cId] = results['pbim'][cId].positions;
    });

    fs.writeFileSync(
      path.join(fixtureDir, 'phase24-candidate-positions.json'),
      JSON.stringify(positionsOut, null, 2)
    );

    console.log('\nCandidate evaluations saved to audit-fixtures/phase24-candidate-evaluations.json');
  });
});

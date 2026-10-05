import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadRealProjectData,
  getDisplayLabel,
  getLabelDimensions,
  type CandidateP28Config,
  type CandidateP28Result,
} from './phase28r-adaptive-capacity.test';
import {
  applyCandidateDA_PairSpecific,
  applyCandidateDB_AffectedRowRepack,
  applyCandidateDC_AffectedRowVertical,
  applyCandidateDD_Combined,
  type RenderedNodeInfo,
  type RenderedCollisionPair,
} from './phase29rd-clearance-experiment.test';
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
import { computeGlobalFeatureLayout, type ArchitectureLayer } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computePhase28LocalNodeLayout } from './phase28r-adaptive-capacity.test';
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

export interface RenderedModelCollision {
  nodeA: string;
  nodeB: string;
  labelA: string;
  labelB: string;
  centerA: { x: number; y: number };
  centerB: { x: number; y: number };
  overlapX: number;
  overlapY: number;
  axisClass: 'SAME_ROW_HORIZONTAL_PRIMARY' | 'ADJACENT_ROW_2D' | 'VERTICAL_ONLY' | 'TRUE_2D';
}

/**
 * Calculates rendered label collisions in model space using extracted node model dimensions.
 */
export function calculateRenderedLabelCollisions(
  positions: Record<string, { x: number; y: number }>,
  renderedNodesMap: Map<string, RenderedNodeInfo>
): {
  collisions: RenderedModelCollision[];
  sameRow: number;
  adjacentRow: number;
  verticalOnly: number;
  true2D: number;
} {
  const nodeIds = Object.keys(positions);
  const N = nodeIds.length;
  const nodesData = nodeIds.map(id => {
    const pos = positions[id];
    const dim = renderedNodesMap.get(id) || { modelWidth: 120, modelHeight: 60 };
    return {
      id,
      posX: pos.x,
      posY: pos.y,
      x1: pos.x - dim.modelWidth / 2,
      x2: pos.x + dim.modelWidth / 2,
      y1: pos.y - dim.modelHeight / 2,
      y2: pos.y + dim.modelHeight / 2,
      dim,
    };
  });

  const sorted = [...nodesData].sort((a, b) => a.x1 - b.x1);
  const collisions: RenderedModelCollision[] = [];
  let sameRow = 0, adjacentRow = 0, verticalOnly = 0, true2D = 0;

  for (let i = 0; i < N; i++) {
    const nA = sorted[i];
    for (let j = i + 1; j < N; j++) {
      const nB = sorted[j];
      if (nB.x1 >= nA.x2) break;

      const overlapX = Math.min(nA.x2, nB.x2) - Math.max(nA.x1, nB.x1);
      const overlapY = Math.min(nA.y2, nB.y2) - Math.max(nA.y1, nB.y1);

      if (overlapX > 1e-3 && overlapY > 1e-3) {
        const dx = Math.abs(nA.posX - nB.posX);
        const dy = Math.abs(nA.posY - nB.posY);

        let axisClass: 'SAME_ROW_HORIZONTAL_PRIMARY' | 'ADJACENT_ROW_2D' | 'VERTICAL_ONLY' | 'TRUE_2D' = 'TRUE_2D';
        if (dy < 10) {
          axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
          sameRow++;
        } else if (dx < 10) {
          axisClass = 'VERTICAL_ONLY';
          verticalOnly++;
        } else if (dy <= 160) {
          axisClass = 'ADJACENT_ROW_2D';
          adjacentRow++;
        } else {
          true2D++;
        }

        collisions.push({
          nodeA: nA.id,
          nodeB: nB.id,
          labelA: nA.id,
          labelB: nB.id,
          centerA: { x: nA.posX, y: nA.posY },
          centerB: { x: nB.posX, y: nB.posY },
          overlapX,
          overlapY,
          axisClass,
        });
      }
    }
  }

  return { collisions, sameRow, adjacentRow, verticalOnly, true2D };
}

/**
 * Calculates model shape AABB collisions (dx < 120 and dy < 60).
 */
export function calculateShapeCollisions(
  positions: Record<string, { x: number; y: number }>
): { count: number; pairs: Array<{ nodeA: string; nodeB: string; dx: number; dy: number }> } {
  const ids = Object.keys(positions);
  const N = ids.length;
  let count = 0;
  const pairs: Array<{ nodeA: string; nodeB: string; dx: number; dy: number }> = [];

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const idA = ids[i];
      const idB = ids[j];
      const dx = Math.abs(positions[idA].x - positions[idB].x);
      const dy = Math.abs(positions[idA].y - positions[idB].y);

      if (dx < 120 - 1e-3 && dy < 60 - 1e-3) {
        count++;
        pairs.push({ nodeA: idA, nodeB: idB, dx, dy });
      }
    }
  }

  return { count, pairs };
}

/**
 * Computes graph footprint (width, height, area).
 */
export function calculateFootprint(positions: Record<string, { x: number; y: number }>): {
  width: number;
  height: number;
  area: number;
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  Object.values(positions).forEach(pos => {
    if (pos.x - 60 < minX) minX = pos.x - 60;
    if (pos.x + 60 > maxX) maxX = pos.x + 60;
    if (pos.y - 30 < minY) minY = pos.y - 30;
    if (pos.y + 30 > maxY) maxY = pos.y + 30;
  });

  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);
  const area = width * height;
  return { width, height, area };
}

/**
 * Candidate E-A: Stage 7 + Stage 8 Coupled Clearance Pipeline
 */
export function runCandidateEA(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  maxIterations = 3
) {
  // Pass 1: Run baseline R4 pipeline to get Stage 7 primary positions
  const cfgR4: CandidateP28Config = {
    candidateId: 'R4_AdaptiveCapacity',
    useProjection: true,
    adaptiveHorizontal: true,
    adaptiveVertical: true,
    adaptiveCapacity: true,
    minHorizontalGap: 40,
    minVerticalGap: 40,
  };

  // Build full pipeline
  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, any>();
  safeNodes.forEach((node) => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((a, id) => domainMap.set(id, a.primaryDomain));
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });
  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });
  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
  safeNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });

  const globalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing: 380,
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

  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: globalResult.orderedDomains,
    layerYMap: globalResult.layerYMap,
  });

  // Stage 7 initial local node layout
  const pass2LocalResult = computePhase28LocalNodeLayout(
    {
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalResult.layerYMap,
        featureLayerYMap: globalResult.featureLayerYMap,
      },
    },
    cfgR4
  );

  let currentStage7Positions = { ...pass2LocalResult.primaryNodePositions };
  let iteration = 0;

  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  const stage8BridgeNodes = safeNodes.filter((node) => {
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  });

  let finalPositions: Record<string, { x: number; y: number }> = {};
  let affectedNodesCount = 0;
  let affectedBridgesCount = 0;

  while (iteration < maxIterations) {
    iteration++;

    // 1. Measure collisions on current Stage 7 primary positions
    const p7Coll = calculateRenderedLabelCollisions(currentStage7Positions, renderedNodesMap);

    // Apply Stage 7 local browser clearance
    const dummyCollPairs: RenderedCollisionPair[] = p7Coll.collisions.map(c => ({
      nodeA: c.nodeA, nodeB: c.nodeB, labelA: c.labelA, labelB: c.labelB,
      centerA: c.centerA, centerB: c.centerB, modelWidthA: 120, modelHeightA: 60,
      modelWidthB: 120, modelHeightB: 60, overlapXRendered: c.overlapX, overlapYRendered: c.overlapY,
      overlapXModel: c.overlapX, overlapYModel: c.overlapY, axisClass: c.axisClass,
    }));

    const clearedStage7Positions = applyCandidateDD_Combined(
      currentStage7Positions,
      renderedNodesMap,
      dummyCollPairs,
      20,
      20
    );

    // Track how many primary nodes moved
    let movedPrimary = 0;
    Object.keys(clearedStage7Positions).forEach(id => {
      if (
        Math.abs(clearedStage7Positions[id].x - currentStage7Positions[id].x) > 1e-3 ||
        Math.abs(clearedStage7Positions[id].y - currentStage7Positions[id].y) > 1e-3
      ) {
        movedPrimary++;
      }
    });
    affectedNodesCount = Math.max(affectedNodesCount, movedPrimary);

    currentStage7Positions = clearedStage7Positions;
    const immutableStage7 = Object.freeze({ ...currentStage7Positions });

    // 2. Recompute Stage 8 bridge candidate placement against new Stage 7 primary positions
    const stage8Positions: Record<string, { x: number; y: number }> = { ...currentStage7Positions };

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
          layerYOffsets: globalResult.layerYMap,
          index,
          allocatedPositions: stage8Positions,
          immutablePrimaryPositions: immutableStage7,
        }
      );

      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    });

    // 3. Stage 9 satellites
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: globalResult.layerYMap,
        index,
        featureLayerYMap: globalResult.featureLayerYMap,
        featureMap,
      }
    );

    // 4. Stage 10 components
    let stage10Positions = { ...satelliteResult.positions };
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
              if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
              const centrality = centralityMap.get(nodeId);
              if (centrality) importance += centrality.hubScore + centrality.bridgeScore;
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

    // 5. Stage 11 collision cleanup
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
        ...(globalResult.domainBounds ? { domainBounds: globalResult.domainBounds } : {}),
      },
    });

    finalPositions = finalCleanupResult.positions;
    const finalColl = calculateRenderedLabelCollisions(finalPositions, renderedNodesMap);

    if (finalColl.collisions.length === 0) break;
  }

  const collResult = calculateRenderedLabelCollisions(finalPositions, renderedNodesMap);
  const shapeResult = calculateShapeCollisions(finalPositions);
  const footprint = calculateFootprint(finalPositions);

  return {
    candidateId: 'Candidate_E_A',
    positions: finalPositions,
    iterationCount: iteration,
    affectedNodesCount,
    affectedBridgesCount,
    renderedCollisionsCount: collResult.collisions.length,
    collisionsDetail: collResult,
    shapeCollisionsCount: shapeResult.count,
    footprint,
  };
}

/**
 * Candidate E-B: Stage 11-Aware Pre-Clearance
 */
export function runCandidateEB(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  renderedNodesMap: Map<string, RenderedNodeInfo>
) {
  // 1. Run full baseline R4 layout pipeline to Stage 10 and Stage 11
  const cfgR4: CandidateP28Config = {
    candidateId: 'R4_AdaptiveCapacity',
    useProjection: true,
    adaptiveHorizontal: true,
    adaptiveVertical: true,
    adaptiveCapacity: true,
    minHorizontalGap: 40,
    minVerticalGap: 40,
  };

  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, any>();
  safeNodes.forEach((node) => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((a, id) => domainMap.set(id, a.primaryDomain));
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });
  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });
  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
  safeNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });

  const globalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing: 380,
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

  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: globalResult.orderedDomains,
    layerYMap: globalResult.layerYMap,
  });

  const pass2LocalResult = computePhase28LocalNodeLayout(
    {
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalResult.layerYMap,
        featureLayerYMap: globalResult.featureLayerYMap,
      },
    },
    cfgR4
  );

  const stage7Positions = { ...pass2LocalResult.primaryNodePositions };
  const stage8Positions: Record<string, { x: number; y: number }> = { ...stage7Positions };

  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalResult.domainRegions.forEach((region, domain) => {
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
      if (stage8Positions[nId]) neighborPositions[nId] = stage8Positions[nId];
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
        layerYOffsets: globalResult.layerYMap,
        index,
        allocatedPositions: stage8Positions,
        immutablePrimaryPositions: Object.freeze({ ...stage7Positions }),
      }
    );
    stage8Positions[node.id] = bridgeInfo.candidatePosition;
  });

  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    stage8Positions,
    {
      nodeWidth: 120,
      nodeHeight: 60,
      layerSpacing: 250,
      layerYOffsets: globalResult.layerYMap,
      index,
      featureLayerYMap: globalResult.featureLayerYMap,
      featureMap,
    }
  );

  const preCleanupPositions = { ...satelliteResult.positions };

  // Run Stage 11 first time
  const cleanupResult1 = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: preCleanupPositions,
    analysis,
    options: {
      nodeWidth: 120,
      nodeHeight: 60,
      layerMap,
      domainMap: featureMap,
      ...(globalResult.domainBounds ? { domainBounds: globalResult.domainBounds } : {}),
    },
  });

  const postCleanupPositions1 = cleanupResult1.positions;

  // Capture displacement vectors V = P_post - P_pre
  const displacementVectors: Record<string, { dx: number; dy: number }> = {};
  let displacedNodesCount = 0;
  Object.keys(preCleanupPositions).forEach(id => {
    const pre = preCleanupPositions[id];
    const post = postCleanupPositions1[id];
    if (pre && post) {
      const dx = post.x - pre.x;
      const dy = post.y - pre.y;
      displacementVectors[id] = { dx, dy };
      if (Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3) displacedNodesCount++;
    }
  });

  // Project nodes to post-cleanup positions P_proj = P_pre + V
  const projectedPositions: Record<string, { x: number; y: number }> = {};
  Object.keys(preCleanupPositions).forEach(id => {
    const pre = preCleanupPositions[id];
    const vec = displacementVectors[id] || { dx: 0, dy: 0 };
    projectedPositions[id] = { x: pre.x + vec.dx, y: pre.y + vec.dy };
  });

  // Calculate rendered-label clearance at projected positions P_proj
  const projColl = calculateRenderedLabelCollisions(projectedPositions, renderedNodesMap);
  const dummyCollPairs: RenderedCollisionPair[] = projColl.collisions.map(c => ({
    nodeA: c.nodeA, nodeB: c.nodeB, labelA: c.labelA, labelB: c.labelB,
    centerA: c.centerA, centerB: c.centerB, modelWidthA: 120, modelHeightA: 60,
    modelWidthB: 120, modelHeightB: 60, overlapXRendered: c.overlapX, overlapYRendered: c.overlapY,
    overlapXModel: c.overlapX, overlapYModel: c.overlapY, axisClass: c.axisClass,
  }));

  const preClearedPositions = applyCandidateDD_Combined(
    projectedPositions,
    renderedNodesMap,
    dummyCollPairs,
    20,
    20
  );

  // Rerun Stage 11 on preClearedPositions
  const cleanupResult2 = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: preClearedPositions,
    analysis,
    options: {
      nodeWidth: 120,
      nodeHeight: 60,
      layerMap,
      domainMap: featureMap,
      ...(globalResult.domainBounds ? { domainBounds: globalResult.domainBounds } : {}),
    },
  });

  const finalPositions = cleanupResult2.positions;
  const collResult = calculateRenderedLabelCollisions(finalPositions, renderedNodesMap);
  const shapeResult = calculateShapeCollisions(finalPositions);
  const footprint = calculateFootprint(finalPositions);

  return {
    candidateId: 'Candidate_E_B',
    positions: finalPositions,
    displacedNodesCount,
    renderedCollisionsCount: collResult.collisions.length,
    collisionsDetail: collResult,
    shapeCollisionsCount: shapeResult.count,
    footprint,
  };
}

/**
 * Candidate E-C: Joint Stage 7 + Stage 8 + Stage 11 Closure Pipeline
 */
export function runCandidateEC(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  maxPasses = 3
) {
  const cfgR4: CandidateP28Config = {
    candidateId: 'R4_AdaptiveCapacity',
    useProjection: true,
    adaptiveHorizontal: true,
    adaptiveVertical: true,
    adaptiveCapacity: true,
    minHorizontalGap: 40,
    minVerticalGap: 40,
  };

  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, any>();
  safeNodes.forEach((node) => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((a, id) => domainMap.set(id, a.primaryDomain));
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });
  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });
  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((a, id) => featureMap.set(id, a.primaryFeatureId));
  safeNodes.forEach(n => { if (!featureMap.has(n.id)) featureMap.set(n.id, 'Unassigned'); });

  const globalResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing: 380,
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

  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: globalResult.orderedDomains,
    layerYMap: globalResult.layerYMap,
  });

  let passCount = 0;

  // Initial Pass 1 Stage 7 Local Layout
  const pass2LocalResult = computePhase28LocalNodeLayout(
    {
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalResult.layerYMap,
        featureLayerYMap: globalResult.featureLayerYMap,
      },
    },
    cfgR4
  );

  let currentStage7Positions = { ...pass2LocalResult.primaryNodePositions };
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  const stage8BridgeNodes = safeNodes.filter((node) => {
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  });

  let finalPositions: Record<string, { x: number; y: number }> = {};

  while (passCount < maxPasses) {
    passCount++;

    // Stage 7 Clearance
    const p7Coll = calculateRenderedLabelCollisions(currentStage7Positions, renderedNodesMap);
    const dummyP7Pairs: RenderedCollisionPair[] = p7Coll.collisions.map(c => ({
      nodeA: c.nodeA, nodeB: c.nodeB, labelA: c.labelA, labelB: c.labelB,
      centerA: c.centerA, centerB: c.centerB, modelWidthA: 120, modelHeightA: 60,
      modelWidthB: 120, modelHeightB: 60, overlapXRendered: c.overlapX, overlapYRendered: c.overlapY,
      overlapXModel: c.overlapX, overlapYModel: c.overlapY, axisClass: c.axisClass,
    }));

    const clearedStage7Positions = applyCandidateDD_Combined(
      currentStage7Positions,
      renderedNodesMap,
      dummyP7Pairs,
      20,
      20
    );

    currentStage7Positions = clearedStage7Positions;
    const immutableStage7 = Object.freeze({ ...currentStage7Positions });

    // Stage 8
    const stage8Positions: Record<string, { x: number; y: number }> = { ...currentStage7Positions };
    stage8BridgeNodes.forEach((node) => {
      const centrality = centralityMap.get(node.id)!;
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach((nId) => {
        if (stage8Positions[nId]) neighborPositions[nId] = stage8Positions[nId];
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
          layerYOffsets: globalResult.layerYMap,
          index,
          allocatedPositions: stage8Positions,
          immutablePrimaryPositions: immutableStage7,
        }
      );
      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    });

    // Stage 9
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: globalResult.layerYMap,
        index,
        featureLayerYMap: globalResult.featureLayerYMap,
        featureMap,
      }
    );

    // Stage 10
    let stage10Positions = { ...satelliteResult.positions };
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
              if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
              const centrality = centralityMap.get(nodeId);
              if (centrality) importance += centrality.hubScore + centrality.bridgeScore;
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

    // Stage 11
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
        ...(globalResult.domainBounds ? { domainBounds: globalResult.domainBounds } : {}),
      },
    });

    finalPositions = finalCleanupResult.positions;

    // Check residual collisions
    const collCheck = calculateRenderedLabelCollisions(finalPositions, renderedNodesMap);
    if (collCheck.collisions.length === 0) break;

    // Apply residual clearance to post-Stage 11 positions to feed into next pass
    const dummyFinalPairs: RenderedCollisionPair[] = collCheck.collisions.map(c => ({
      nodeA: c.nodeA, nodeB: c.nodeB, labelA: c.labelA, labelB: c.labelB,
      centerA: c.centerA, centerB: c.centerB, modelWidthA: 120, modelHeightA: 60,
      modelWidthB: 120, modelHeightB: 60, overlapXRendered: c.overlapX, overlapYRendered: c.overlapY,
      overlapXModel: c.overlapX, overlapYModel: c.overlapY, axisClass: c.axisClass,
    }));

    const residualCleared = applyCandidateDD_Combined(
      finalPositions,
      renderedNodesMap,
      dummyFinalPairs,
      20,
      20
    );

    // Update Stage 7 primary positions with cleared positions
    Object.keys(currentStage7Positions).forEach(id => {
      if (residualCleared[id]) {
        currentStage7Positions[id] = residualCleared[id];
      }
    });
  }

  const collResult = calculateRenderedLabelCollisions(finalPositions, renderedNodesMap);
  const shapeResult = calculateShapeCollisions(finalPositions);
  const footprint = calculateFootprint(finalPositions);

  return {
    candidateId: 'Candidate_E_C',
    positions: finalPositions,
    passCount,
    renderedCollisionsCount: collResult.collisions.length,
    collisionsDetail: collResult,
    shapeCollisionsCount: shapeResult.count,
    footprint,
  };
}

describe('Phase 29R-E Joint Multi-Stage Coupled Geometry Experiments', () => {
  it('Evaluates Candidates E-A, E-B, E-C across PBIM and CST', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');

    const dimFile = path.join(fixtureDir, 'phase29rd-rendered-dimensions.json');
    if (!fs.existsSync(dimFile)) {
      throw new Error('phase29rd-rendered-dimensions.json missing!');
    }
    const dimData = JSON.parse(fs.readFileSync(dimFile, 'utf-8'));

    const pbim = loadRealProjectData('pbim');
    const cst = loadRealProjectData('cloud-spend-tracker');

    const experimentalOutputs: Record<string, any> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    const coupledResults: Record<string, any> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    for (const projId of ['pbim', 'cloud-spend-tracker'] as const) {
      const projData = projId === 'pbim' ? pbim : cst;
      const nodeDimsMap = new Map<string, RenderedNodeInfo>();
      dimData[projId].nodes.forEach((n: RenderedNodeInfo) => nodeDimsMap.set(n.id, n));

      console.log(`\n======================================================`);
      console.log(`EVALUATING COUPLED CANDIDATES FOR ${projId.toUpperCase()}`);
      console.log(`======================================================`);

      // 1. Candidate E-A
      const resEA = runCandidateEA(projData.nodes, projData.edges, nodeDimsMap, 3);
      coupledResults[projId]['Candidate_E_A'] = resEA;
      experimentalOutputs[projId]['Candidate_E_A'] = {
        positions: resEA.positions,
        displayLabels: projData.nodes.reduce((acc, n) => {
          acc[n.id] = getDisplayLabel(n.displayName || n.id.split(':').pop() || n.id);
          return acc;
        }, {} as Record<string, string>),
      };
      console.log(`[${projId.toUpperCase()}] Candidate_E_A: Rendered Collisions=${resEA.renderedCollisionsCount} (SameRow=${resEA.collisionsDetail.sameRow}, AdjRow=${resEA.collisionsDetail.adjacentRow}) | ShapeAABB=${resEA.shapeCollisionsCount} | Footprint W=${resEA.footprint.width} H=${resEA.footprint.height} Area=${(resEA.footprint.area/1e6).toFixed(1)}M`);

      // 2. Candidate E-B
      const resEB = runCandidateEB(projData.nodes, projData.edges, nodeDimsMap);
      coupledResults[projId]['Candidate_E_B'] = resEB;
      experimentalOutputs[projId]['Candidate_E_B'] = {
        positions: resEB.positions,
        displayLabels: projData.nodes.reduce((acc, n) => {
          acc[n.id] = getDisplayLabel(n.displayName || n.id.split(':').pop() || n.id);
          return acc;
        }, {} as Record<string, string>),
      };
      console.log(`[${projId.toUpperCase()}] Candidate_E_B: Rendered Collisions=${resEB.renderedCollisionsCount} (SameRow=${resEB.collisionsDetail.sameRow}, AdjRow=${resEB.collisionsDetail.adjacentRow}) | ShapeAABB=${resEB.shapeCollisionsCount} | Footprint W=${resEB.footprint.width} H=${resEB.footprint.height} Area=${(resEB.footprint.area/1e6).toFixed(1)}M`);

      // 3. Candidate E-C
      const resEC = runCandidateEC(projData.nodes, projData.edges, nodeDimsMap, 3);
      coupledResults[projId]['Candidate_E_C'] = resEC;
      experimentalOutputs[projId]['Candidate_E_C'] = {
        positions: resEC.positions,
        displayLabels: projData.nodes.reduce((acc, n) => {
          acc[n.id] = getDisplayLabel(n.displayName || n.id.split(':').pop() || n.id);
          return acc;
        }, {} as Record<string, string>),
      };
      console.log(`[${projId.toUpperCase()}] Candidate_E_C: Rendered Collisions=${resEC.renderedCollisionsCount} (SameRow=${resEC.collisionsDetail.sameRow}, AdjRow=${resEC.collisionsDetail.adjacentRow}) | ShapeAABB=${resEC.shapeCollisionsCount} | Footprint W=${resEC.footprint.width} H=${resEC.footprint.height} Area=${(resEC.footprint.area/1e6).toFixed(1)}M`);
    }

    fs.writeFileSync(
      path.join(fixtureDir, 'phase29re-experimental-positions.json'),
      JSON.stringify(experimentalOutputs, null, 2)
    );

    fs.writeFileSync(
      path.join(fixtureDir, 'phase29re-coupled-results.json'),
      JSON.stringify(coupledResults, null, 2)
    );

    console.log('\nSaved Phase 29R-E experimental positions and results to audit-fixtures/!');
  }, 120000);
});

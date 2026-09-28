import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  placeSatellites,
  isTriggerNode,
  isHandlerNode,
  SatelliteLayoutOptions,
  SatellitePlacementResult,
} from '../lib/layout/satellites';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { findParentProductionNodeId, findParentObjectId } from '../lib/layout/analysis';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis, ArchitectureNodeAnalysis } from '../lib/layout/types';

export interface Point {
  x: number;
  y: number;
}

export interface CandidateSlotRecord {
  row: number;
  col: number;
  ringRadius: number;
  x: number;
  y: number;
  dist: number;
  manhattanGridDist: number;
  manhattanPixelDist: number;
  directionalScore: number;
  aspectPenalty: number;
  vectorPenalty: number;
  primaryCrossings: number;
  satelliteCrossings: number;
  crossingPenalty: number;
  tetherPenalty: number;
  effectiveScore: number;
  sortedRank: number;
  isSelected: boolean;
}

export interface RingAnalysisRecord {
  ringRadius: number;
  totalGridSlots: number;
  scoreableCount: number;
  selectedCount: number;
  bestScore: number | null;
  worstScore: number | null;
}

export interface CallTelemetryRecord {
  callIndex: number;
  category: 'trigger' | 'handler' | 'field' | 'test';
  nodeId: string;
  count: number;
  maxSearchRadius: number;
  gridWidth: number;
  gridHeight: number;
  theoreticalGridPositions: number;
  actualGridIterations: number;
  anchorExclusions: number;
  biasExclusions: number;
  occupancyRejections: number;
  scoreableCandidatesCount: number;
  effectiveMaxDist: number;
  scoreableInsideEffectiveDist: number;
  scoreableOutsideEffectiveDist: number;
  selectedCount: number;
  maxSelectedRank: number;
  maxSelectedRingRadius: number;
  maxSelectedDist: number;
  lastSelectedScore: number | null;
  firstUnselectedScore: number | null;
  scoreMargin: number | null;
  ringBreakdown: RingAnalysisRecord[];
  allCandidates: CandidateSlotRecord[];
  fallbackTriggered: boolean;
  fallbackRadius: number;
  fallbackCandidatesGenerated: number;
  fallbackCandidatesSelected: number;
}

export interface AggregateForensicTelemetry {
  calls: CallTelemetryRecord[];
}

export const forensicTelemetry: AggregateForensicTelemetry = {
  calls: [],
};

export function resetForensicTelemetry() {
  forensicTelemetry.calls = [];
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

export function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}

export function isSlotOccupied(
  candidateX: number,
  candidateY: number,
  occupied: Point[],
  minDx: number,
  minDy: number
): boolean {
  for (let i = 0; i < occupied.length; i++) {
    const pos = occupied[i];
    if (
      Math.abs(pos.x - candidateX) < minDx - 1e-3 &&
      Math.abs(pos.y - candidateY) < minDy - 1e-3
    ) {
      return true;
    }
  }
  return false;
}

export function generateSatelliteSlotsInstrumented(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  category: 'trigger' | 'handler' | 'field' | 'test',
  nodeId: string,
  targetVector?: Point,
  primarySegments?: Array<{ p1: Point; p2: Point }>,
  placedSatelliteSegments?: Array<{ p1: Point; p2: Point }>,
  incidentEndpoints?: Point[]
): Point[] {
  if (count <= 0) return [];

  const callIdx = forensicTelemetry.calls.length + 1;
  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  const effectiveMaxDist = Math.max(
    maxDistance,
    Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
  );

  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
  const gridWidth = 2 * maxSearchRadius + 1;
  const gridHeight = 2 * maxSearchRadius + 1;
  const theoreticalGridPositions = gridWidth * gridHeight;

  let actualGridIterations = 0;
  let anchorExclusions = 0;
  let biasExclusions = 0;
  let occupancyRejections = 0;

  const rawCandidates: Array<{
    x: number;
    y: number;
    dist: number;
    effectiveScore: number;
    row: number;
    col: number;
    ringRadius: number;
    manhattanGridDist: number;
    manhattanPixelDist: number;
    directionalScore: number;
    aspectPenalty: number;
    vectorPenalty: number;
    primaryCrossings: number;
    satelliteCrossings: number;
    crossingPenalty: number;
    tetherPenalty: number;
  }> = [];

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      actualGridIterations++;

      if (c === 0 && r === 0) {
        anchorExclusions++;
        continue;
      }

      if (bias === 'test' && c === 0) {
        biasExclusions++;
        continue;
      }

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      if (isSlotOccupied(x, y, occupied, dx, dy)) {
        occupancyRejections++;
        continue;
      }

      const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

      let directionalScore = 1.0;
      if (bias === 'test' && c < 0) directionalScore = 1.2;

      let aspectPenalty = 0;
      if (bias === 'field') {
        if (r <= 0) aspectPenalty += 400.0;
        if (Math.abs(c) > 2) aspectPenalty += Math.abs(c) * dx * 2.0;
        else aspectPenalty += (Math.abs(r) - 1) * dy * 0.2;
      } else if (bias === 'test') {
        if (Math.abs(r) > 3) aspectPenalty += (Math.abs(r) - 3) * dy * 1.5;
      }

      let vectorPenalty = 0;
      if (targetVector && (targetVector.x !== 0 || targetVector.y !== 0)) {
        const slotVecX = c * dx;
        const slotVecY = r * dy;
        const dot = slotVecX * targetVector.x + slotVecY * targetVector.y;
        if (dot > 0) vectorPenalty = dot * 0.5;
      }

      let primaryCrossings = 0;
      let satelliteCrossings = 0;
      const candPoint = { x, y };
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];

        if (primarySegments && primarySegments.length > 0) {
          for (let i = 0; i < primarySegments.length; i++) {
            if (segmentsIntersect(ep, candPoint, primarySegments[i].p1, primarySegments[i].p2)) {
              primaryCrossings++;
            }
          }
        }

        if (placedSatelliteSegments && placedSatelliteSegments.length > 0) {
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            if (segmentsIntersect(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
              satelliteCrossings++;
            }
          }
        }
      }

      const crossingPenalty = primaryCrossings * 2000.0 + satelliteCrossings * 800.0;
      const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
      const effectiveScore = dist * directionalScore + aspectPenalty + vectorPenalty + crossingPenalty + tetherPenalty;

      rawCandidates.push({
        x,
        y,
        dist,
        effectiveScore,
        row: r,
        col: c,
        ringRadius: Math.max(Math.abs(r), Math.abs(c)),
        manhattanGridDist: Math.abs(r) + Math.abs(c),
        manhattanPixelDist: Math.abs(c * dx) + Math.abs(r * dy),
        directionalScore,
        aspectPenalty,
        vectorPenalty,
        primaryCrossings,
        satelliteCrossings,
        crossingPenalty,
        tetherPenalty,
      });
    }
  }

  rawCandidates.sort((a, b) => {
    if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
      return a.effectiveScore - b.effectiveScore;
    }
    if (Math.abs(a.dist - b.dist) > 1e-4) {
      return a.dist - b.dist;
    }
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const selectedCount = Math.min(count, rawCandidates.length);
  const selectedSlots = rawCandidates.slice(0, selectedCount).map(s => ({ x: s.x, y: s.y }));

  let fallbackTriggered = false;
  let fallbackRadius = 0;
  let fallbackCandidatesGenerated = 0;
  let fallbackCandidatesSelected = 0;

  if (selectedSlots.length < count) {
    fallbackTriggered = true;
    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      fallbackRadius = r;
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        fallbackCandidatesGenerated++;
        if (selectedSlots.length >= count) break;
        if (bias === 'test' && c === 0) continue;
        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;
        const combinedOccupied = [...occupied, ...selectedSlots];
        if (!isSlotOccupied(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
          fallbackCandidatesSelected++;
        }
      }
      r++;
    }
  }

  const allCandidates: CandidateSlotRecord[] = rawCandidates.map((cand, idx) => {
    const sortedRank = idx + 1;
    return {
      row: cand.row,
      col: cand.col,
      ringRadius: cand.ringRadius,
      x: cand.x,
      y: cand.y,
      dist: cand.dist,
      manhattanGridDist: cand.manhattanGridDist,
      manhattanPixelDist: cand.manhattanPixelDist,
      directionalScore: cand.directionalScore,
      aspectPenalty: cand.aspectPenalty,
      vectorPenalty: cand.vectorPenalty,
      primaryCrossings: cand.primaryCrossings,
      satelliteCrossings: cand.satelliteCrossings,
      crossingPenalty: cand.crossingPenalty,
      tetherPenalty: cand.tetherPenalty,
      effectiveScore: cand.effectiveScore,
      sortedRank,
      isSelected: sortedRank <= selectedCount,
    };
  });

  const ringBreakdown: RingAnalysisRecord[] = [];
  for (let ring = 1; ring <= maxSearchRadius; ring++) {
    const totalSlotsInRing = 8 * ring;
    const ringCandidates = allCandidates.filter(c => c.ringRadius === ring);
    const scoreableCount = ringCandidates.length;
    const selectedInRing = ringCandidates.filter(c => c.isSelected).length;

    let bestScore: number | null = null;
    let worstScore: number | null = null;
    if (scoreableCount > 0) {
      bestScore = Math.min(...ringCandidates.map(c => c.effectiveScore));
      worstScore = Math.max(...ringCandidates.map(c => c.effectiveScore));
    }

    ringBreakdown.push({
      ringRadius: ring,
      totalGridSlots: totalSlotsInRing,
      scoreableCount,
      selectedCount: selectedInRing,
      bestScore,
      worstScore,
    });
  }

  let maxSelectedRank = 0;
  let maxSelectedRingRadius = 0;
  let maxSelectedDist = 0;
  let lastSelectedScore: number | null = null;
  let firstUnselectedScore: number | null = null;
  let scoreMargin: number | null = null;

  const selectedCandidates = allCandidates.filter(c => c.isSelected);
  if (selectedCandidates.length > 0) {
    maxSelectedRank = Math.max(...selectedCandidates.map(c => c.sortedRank));
    maxSelectedRingRadius = Math.max(...selectedCandidates.map(c => c.ringRadius));
    maxSelectedDist = Math.max(...selectedCandidates.map(c => c.dist));
    lastSelectedScore = allCandidates[selectedCount - 1].effectiveScore;
  }

  if (allCandidates.length > selectedCount) {
    firstUnselectedScore = allCandidates[selectedCount].effectiveScore;
  }

  if (lastSelectedScore !== null && firstUnselectedScore !== null) {
    scoreMargin = firstUnselectedScore - lastSelectedScore;
  }

  let scoreableInsideEffectiveDist = 0;
  let scoreableOutsideEffectiveDist = 0;
  for (const cand of allCandidates) {
    if (cand.dist <= effectiveMaxDist) {
      scoreableInsideEffectiveDist++;
    } else {
      scoreableOutsideEffectiveDist++;
    }
  }

  forensicTelemetry.calls.push({
    callIndex: callIdx,
    category,
    nodeId,
    count,
    maxSearchRadius,
    gridWidth,
    gridHeight,
    theoreticalGridPositions,
    actualGridIterations,
    anchorExclusions,
    biasExclusions,
    occupancyRejections,
    scoreableCandidatesCount: allCandidates.length,
    effectiveMaxDist,
    scoreableInsideEffectiveDist,
    scoreableOutsideEffectiveDist,
    selectedCount,
    maxSelectedRank,
    maxSelectedRingRadius,
    maxSelectedDist,
    lastSelectedScore,
    firstUnselectedScore,
    scoreMargin,
    ringBreakdown,
    allCandidates,
    fallbackTriggered,
    fallbackRadius,
    fallbackCandidatesGenerated,
    fallbackCandidatesSelected,
  });

  return selectedSlots;
}

export function placeSatellitesInstrumented(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {}
): SatellitePlacementResult {
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const maxSatelliteDistance = options.maxSatelliteDistance ?? 280;
  const layerYOffsets = options.layerYOffsets ?? DEFAULT_LAYER_Y_OFFSETS;

  const _featureMap: Map<string, string> | null = options.featureMap instanceof Map
    ? options.featureMap
    : options.featureMap
      ? new Map(Object.entries(options.featureMap))
      : null;

  function resolveLayerY(nodeId: string, layer: ArchitectureLayer): number {
    if (options.featureLayerYMap && _featureMap) {
      const featureId = _featureMap.get(nodeId);
      if (featureId) {
        const fMap = options.featureLayerYMap instanceof Map
          ? options.featureLayerYMap.get(featureId)
          : options.featureLayerYMap[featureId];
        if (fMap && fMap[layer] !== undefined) return fMap[layer];
      }
    }
    return layerYOffsets[layer] ?? DEFAULT_LAYER_Y_OFFSETS[layer];
  }

  const defaultDomainX = options.defaultDomainX ?? 0;
  const index = options.index;

  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const satellitePositions: Record<string, { x: number; y: number }> = {};
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  const occupiedList: Point[] = Object.values(primaryPositions).map(p => ({ x: p.x, y: p.y }));

  const primarySegments: Array<{ p1: Point; p2: Point }> = [];
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) {
        primarySegments.push({ p1, p2 });
      }
    }
  }

  const placedSatelliteSegments: Array<{ p1: Point; p2: Point }> = [];

  const allAnalyses = analysis.nodeList;
  const nodeAnalysisMap = analysis.nodes;

  const testAnalyses: ArchitectureNodeAnalysis[] = [];
  const fieldAnalyses: ArchitectureNodeAnalysis[] = [];
  const triggerAnalyses: ArchitectureNodeAnalysis[] = [];
  const handlerAnalyses: ArchitectureNodeAnalysis[] = [];

  for (const item of allAnalyses) {
    if (item.isTest) {
      testAnalyses.push(item);
    } else if (item.isField) {
      fieldAnalyses.push(item);
    } else if (isTriggerNode(item)) {
      triggerAnalyses.push(item);
    } else if (isHandlerNode(item)) {
      handlerAnalyses.push(item);
    }
  }

  testAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  fieldAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  triggerAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  handlerAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  let placedMicroclusterCount = 0;

  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue;

    const connectedEdges = index
      ? index.incidentEdgesByNode.get(triggerItem.nodeId) || []
      : safeEdges.filter(e => e.source === triggerItem.nodeId || e.target === triggerItem.nodeId);

    let parentObjectPos: Point | null = null;
    let connectedHandlerId: string | null = null;

    for (const edge of connectedEdges) {
      const otherId = edge.source === triggerItem.nodeId ? edge.target : edge.source;
      const otherAnalysis = nodeAnalysisMap.get(otherId);
      if (otherAnalysis) {
        if (
          (otherAnalysis.nodeType === 'Object' || otherAnalysis.nodeType === 'CustomObject') &&
          positions[otherId]
        ) {
          parentObjectPos = positions[otherId];
        } else if (isHandlerNode(otherAnalysis)) {
          connectedHandlerId = otherId;
        }
      }
    }

    let trigX = parentObjectPos ? parentObjectPos.x : defaultDomainX;
    let trigY = parentObjectPos
      ? parentObjectPos.y - (nodeHeight + verticalGap)
      : resolveLayerY(triggerItem.nodeId, 'application');

    const minDx = nodeWidth + horizontalGap;
    const minDy = nodeHeight + verticalGap;
    if (isSlotOccupied(trigX, trigY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsInstrumented(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        'trigger',
        triggerItem.nodeId
      );
      if (slots.length > 0) {
        trigX = slots[0].x;
        trigY = slots[0].y;
      }
    }

    positions[triggerItem.nodeId] = { x: trigX, y: trigY };
    satellitePositions[triggerItem.nodeId] = { x: trigX, y: trigY };
    occupiedList.push({ x: trigX, y: trigY });
    placedMicroclusterCount++;

    if (connectedHandlerId && !primaryNodeIds.has(connectedHandlerId)) {
      const handlerItem = nodeAnalysisMap.get(connectedHandlerId);
      if (handlerItem && !positions[connectedHandlerId]) {
        const handlerEdges = index
          ? index.incidentEdgesByNode.get(connectedHandlerId) || []
          : safeEdges.filter(e => e.source === connectedHandlerId || e.target === connectedHandlerId);
        let servicePos: Point | null = null;

        for (const hEdge of handlerEdges) {
          const hOtherId = hEdge.source === connectedHandlerId ? hEdge.target : hEdge.source;
          if (hOtherId !== triggerItem.nodeId && positions[hOtherId]) {
            servicePos = positions[hOtherId];
            break;
          }
        }

        let handlerX = trigX + nodeWidth + horizontalGap;
        let handlerY = trigY;

        if (servicePos) {
          handlerX = (trigX + servicePos.x) / 2;
          handlerY = (trigY + servicePos.y) / 2;
        }

        if (isSlotOccupied(handlerX, handlerY, occupiedList, minDx, minDy)) {
          const handlerSlots = generateSatelliteSlotsInstrumented(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            maxSatelliteDistance,
            'neutral',
            'handler',
            connectedHandlerId
          );
          if (handlerSlots.length > 0) {
            handlerX = handlerSlots[0].x;
            handlerY = handlerSlots[0].y;
          }
        }

        positions[connectedHandlerId] = { x: handlerX, y: handlerY };
        satellitePositions[connectedHandlerId] = { x: handlerX, y: handlerY };
        occupiedList.push({ x: handlerX, y: handlerY });
        placedMicroclusterCount++;
      }
    }
  }

  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue;

    const connectedEdges = index
      ? index.incidentEdgesByNode.get(handlerItem.nodeId) || []
      : safeEdges.filter(e => e.source === handlerItem.nodeId || e.target === handlerItem.nodeId);

    let anchorPos: Point | null = null;
    for (const edge of connectedEdges) {
      const otherId = edge.source === handlerItem.nodeId ? edge.target : edge.source;
      if (positions[otherId]) {
        anchorPos = positions[otherId];
        break;
      }
    }

    let hX = anchorPos ? anchorPos.x + nodeWidth + horizontalGap : defaultDomainX;
    let hY = anchorPos ? anchorPos.y : resolveLayerY(handlerItem.nodeId, 'application');

    const minDx = nodeWidth + horizontalGap;
    const minDy = nodeHeight + verticalGap;
    if (isSlotOccupied(hX, hY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsInstrumented(
        { x: hX, y: hY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        'handler',
        handlerItem.nodeId
      );
      if (slots.length > 0) {
        hX = slots[0].x;
        hY = slots[0].y;
      }
    }

    positions[handlerItem.nodeId] = { x: hX, y: hY };
    satellitePositions[handlerItem.nodeId] = { x: hX, y: hY };
    occupiedList.push({ x: hX, y: hY });
    placedMicroclusterCount++;
  }

  // STAGE 2: FIELDS
  let placedFieldsCount = 0;
  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredFields: ArchitectureNodeAnalysis[] = [];

  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;

    let parentId = fieldItem.parentObjectId;
    if (!parentId) {
      parentId = index
        ? index.parentObjectId.get(fieldItem.nodeId) ?? null
        : findParentObjectId(fieldItem.node, nodes, safeEdges);
    }

    if (parentId && positions[parentId]) {
      if (!fieldsByParent.has(parentId)) {
        fieldsByParent.set(parentId, []);
      }
      fieldsByParent.get(parentId)!.push(fieldItem);
    } else {
      unanchoredFields.push(fieldItem);
    }
  }

  fieldsByParent.forEach((fields, parentId) => {
    fields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const parentPos = positions[parentId];

    const pEdges = index
      ? index.incidentEdgesByNode.get(parentId) || []
      : safeEdges.filter(e => e.source === parentId || e.target === parentId);

    let sumDx = 0;
    let sumDy = 0;
    let pCount = 0;

    for (const e of pEdges) {
      const otherId = e.source === parentId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - parentPos.x;
        sumDy += positions[otherId].y - parentPos.y;
        pCount++;
      }
    }

    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlotsInstrumented(
      parentPos,
      fields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      'field',
      parentId,
      targetVector,
      primarySegments,
      placedSatelliteSegments
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };

      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: parentPos, p2: { x: slot.x, y: slot.y } });
      placedFieldsCount++;
    });
  });

  unanchoredFields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredFields.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredFields[0].nodeId, 'schema'),
    };
    const fallbackSlots = generateSatelliteSlotsInstrumented(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      'field',
      'unanchored_fields'
    );

    unanchoredFields.forEach((fieldItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + (nodeHeight + verticalGap),
      };

      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedFieldsCount++;
    });
  }

  // STAGE 3: TESTS
  let placedTestsCount = 0;
  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredTests: ArchitectureNodeAnalysis[] = [];

  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue;

    let targetId = testItem.parentProductionNodeId;
    if (!targetId) {
      targetId = index
        ? index.parentProductionNodeId.get(testItem.nodeId) ?? null
        : findParentProductionNodeId(testItem.node, nodes, safeEdges);
    }

    if (targetId && positions[targetId]) {
      if (!testsByTarget.has(targetId)) {
        testsByTarget.set(targetId, []);
      }
      testsByTarget.get(targetId)!.push(testItem);
    } else {
      unanchoredTests.push(testItem);
    }
  }

  testsByTarget.forEach((tests, targetId) => {
    tests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const targetPos = positions[targetId];

    const tEdges = index
      ? index.incidentEdgesByNode.get(targetId) || []
      : safeEdges.filter(e => e.source === targetId || e.target === targetId);

    let sumDx = 0;
    let sumDy = 0;
    let pCount = 0;

    for (const e of tEdges) {
      const otherId = e.source === targetId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - targetPos.x;
        sumDy += positions[otherId].y - targetPos.y;
        pCount++;
      }
    }

    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlotsInstrumented(
      targetPos,
      tests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      'test',
      targetId,
      targetVector,
      primarySegments,
      placedSatelliteSegments
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: targetPos, p2: { x: slot.x, y: slot.y } });
      placedTestsCount++;
    });
  });

  unanchoredTests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredTests.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredTests[0].nodeId, 'application'),
    };
    const fallbackSlots = generateSatelliteSlotsInstrumented(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      'test',
      'unanchored_tests'
    );

    unanchoredTests.forEach((testItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: fallbackAnchor.x, y: fallbackAnchor.y });
      placedTestsCount++;
    });
  }

  // STAGE 4: PERMUTATIONS
  function evaluateCrossings(
    eList: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>
  ): number {
    const segs: { p1: Point; p2: Point; s: string; t: string }[] = [];
    for (let i = 0; i < eList.length; i++) {
      const e = eList[i];
      const p1 = posMap[e.source];
      const p2 = posMap[e.target];
      if (p1 && p2) segs.push({ p1, p2, s: e.source, t: e.target });
    }
    let count = 0;
    for (let i = 0; i < segs.length; i++) {
      const s1 = segs[i];
      for (let j = i + 1; j < segs.length; j++) {
        const s2 = segs[j];
        if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
        if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) count++;
      }
    }
    return count;
  }

  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    let currentBestCrossings = evaluateCrossings(safeEdges, positions);

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateCrossings(safeEdges, candidatePositions);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
          satellitePositions[id] = candidatePositions[id];
        });
      }
    }
  });

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}

// --------------------------------------------------------------------------
// TEST SUITE
// --------------------------------------------------------------------------
const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Stage 9 Candidate Slot Enumeration Necessity Forensic Suite', () => {

  it('1. Canonical CST Fixture Forensic Candidate Space Telemetry', () => {
    resetForensicTelemetry();
    const nodes = dataset.nodes;
    const edges = dataset.edges;
    const analysis = computeArchitectureAnalysis(nodes, edges);

    const layerMap = new Map<string, ArchitectureLayer>();
    nodes.forEach(node => {
      layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
    });

    const domainDiscovery = discoverDomains(nodes, edges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => {
      domainMap.set(nodeId, assignment.primaryDomain);
    });

    const featureDiscovery = discoverFeatures(nodes, edges, { analysis, layerMap, domainMap });
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const fullResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult.positions[item.nodeId];
        }
      }
    }

    const oracleResult = placeSatellites(nodes, edges, analysis, primaryPositions, { featureMap });
    const instrumentedResult = placeSatellitesInstrumented(nodes, edges, analysis, primaryPositions, { featureMap });

    expect(Object.keys(instrumentedResult.positions).length).toBe(Object.keys(oracleResult.positions).length);
    for (const key of Object.keys(oracleResult.positions)) {
      expect(instrumentedResult.positions[key]).toEqual(oracleResult.positions[key]);
    }

    const calls = forensicTelemetry.calls;
    console.log(`\n--- CANONICAL CST FORENSIC TELEMETRY SUMMARY (${calls.length} calls) ---`);

    let totalTheoretical = 0;
    let totalIterations = 0;
    let totalAnchorExclusions = 0;
    let totalBiasExclusions = 0;
    let totalOccupancyRejections = 0;
    let totalScoreable = 0;
    let totalSelected = 0;

    calls.forEach(c => {
      totalTheoretical += c.theoreticalGridPositions;
      totalIterations += c.actualGridIterations;
      totalAnchorExclusions += c.anchorExclusions;
      totalBiasExclusions += c.biasExclusions;
      totalOccupancyRejections += c.occupancyRejections;
      totalScoreable += c.scoreableCandidatesCount;
      totalSelected += c.selectedCount;
    });

    console.log(`Total Theoretical Positions : ${totalTheoretical.toLocaleString()}`);
    console.log(`Actual Grid Iterations      : ${totalIterations.toLocaleString()}`);
    console.log(`Anchor Exclusions           : ${totalAnchorExclusions.toLocaleString()}`);
    console.log(`Bias Exclusions             : ${totalBiasExclusions.toLocaleString()}`);
    console.log(`Occupancy Rejections        : ${totalOccupancyRejections.toLocaleString()}`);
    console.log(`Scoreable Candidates        : ${totalScoreable.toLocaleString()}`);
    console.log(`Selected Candidates         : ${totalSelected.toLocaleString()}`);
    console.log(`Survival % (Selected/Scorable) : ${((totalSelected / totalScoreable) * 100).toFixed(4)}%`);

    // Category breakdown
    const categories = ['trigger', 'handler', 'field', 'test'] as const;
    console.log('\n--- CATEGORY BREAKDOWN (CST) ---');
    categories.forEach(cat => {
      const catCalls = calls.filter(c => c.category === cat);
      if (catCalls.length > 0) {
        let catTheoretical = 0, catScoreable = 0, catSelected = 0;
        catCalls.forEach(c => {
          catTheoretical += c.theoreticalGridPositions;
          catScoreable += c.scoreableCandidatesCount;
          catSelected += c.selectedCount;
        });
        console.log(
          `Category ${cat.padEnd(8)} | Calls: ${catCalls.length.toString().padStart(2)} | Theoretical: ${catTheoretical.toLocaleString().padStart(6)} | Scoreable: ${catScoreable.toLocaleString().padStart(6)} | Selected: ${catSelected.toString().padStart(3)} | Survival: ${((catSelected / catScoreable) * 100).toFixed(3)}%`
        );
      }
    });

    // Ring Breakdown Summary across all CST calls
    console.log('\n--- RING / RADIUS BREAKDOWN SUMMARY (CST) ---');
    console.log('Ring Radius | Total Grid Slots | Scoreable Count | Selected Count | Selection Ratio (%)');
    console.log('--------------------------------------------------------------------------------------');
    for (let r = 1; r <= 12; r++) {
      let rSlots = 0, rScoreable = 0, rSelected = 0;
      calls.forEach(c => {
        const ringRec = c.ringBreakdown.find(rb => rb.ringRadius === r);
        if (ringRec) {
          rSlots += ringRec.totalGridSlots;
          rScoreable += ringRec.scoreableCount;
          rSelected += ringRec.selectedCount;
        }
      });
      const ratio = rScoreable > 0 ? ((rSelected / rScoreable) * 100).toFixed(3) + '%' : '0.000%';
      console.log(
        `Ring ${r.toString().padStart(2)}    | ${rSlots.toLocaleString().padStart(16)} | ${rScoreable.toLocaleString().padStart(15)} | ${rSelected.toString().padStart(14)} | ${ratio.padStart(19)}`
      );
    }
  });

  it('2. Multi-Tier Scale Forensic Telemetry (Tiers 1 to 5)', { timeout: 600000 }, () => {
    const scaleTiers = [
      { tier: 'Tier 1', nodeCount: 240 },
      { tier: 'Tier 2', nodeCount: 500 },
      { tier: 'Tier 3', nodeCount: 1000 },
      { tier: 'Tier 4', nodeCount: 2000 },
      { tier: 'Tier 5', nodeCount: 5000 },
    ];

    console.log('\n========================================================================================================');
    console.log('         STAGE 9 CANDIDATE SLOT ENUMERATION FORENSIC SCALE MATRIX');
    console.log('========================================================================================================');
    console.log('Tier   | Calls | Theoretical | Scoreable | Selected | Survival % | Max Rank | Max Ring | Fallback Calls');
    console.log('--------------------------------------------------------------------------------------------------------');

    for (const t of scaleTiers) {
      let nodes: ExplorerNode[];
      let edges: ExplorerEdge[];

      if (t.nodeCount === 240) {
        nodes = dataset.nodes;
        edges = dataset.edges;
      } else {
        const synthetic = generateSyntheticSalesforceGraph({ nodeCount: t.nodeCount, seed: 42 });
        nodes = synthetic.nodes;
        edges = synthetic.edges;
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);

      const primaryPositions: Record<string, { x: number; y: number }> = {};
      analysis.nodeList.forEach((item, idx) => {
        if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
          primaryPositions[item.nodeId] = {
            x: (idx % 20) * 200,
            y: Math.floor(idx / 20) * 300,
          };
        }
      });

      resetForensicTelemetry();
      const res = placeSatellitesInstrumented(nodes, edges, analysis, primaryPositions);

      const calls = forensicTelemetry.calls;
      let totalTheoretical = 0;
      let totalScoreable = 0;
      let totalSelected = 0;
      let maxRank = 0;
      let maxRing = 0;
      let fallbackCalls = 0;

      calls.forEach(c => {
        totalTheoretical += c.theoreticalGridPositions;
        totalScoreable += c.scoreableCandidatesCount;
        totalSelected += c.selectedCount;
        if (c.maxSelectedRank > maxRank) maxRank = c.maxSelectedRank;
        if (c.maxSelectedRingRadius > maxRing) maxRing = c.maxSelectedRingRadius;
        if (c.fallbackTriggered) fallbackCalls++;
      });

      const survivalPct = totalScoreable > 0 ? ((totalSelected / totalScoreable) * 100).toFixed(3) + '%' : 'N/A';

      console.log(
        `${t.tier.padEnd(6)} | ` +
        `${calls.length.toString().padStart(5)} | ` +
        `${totalTheoretical.toLocaleString().padStart(11)} | ` +
        `${totalScoreable.toLocaleString().padStart(9)} | ` +
        `${totalSelected.toString().padStart(8)} | ` +
        `${survivalPct.padStart(10)} | ` +
        `${maxRank.toString().padStart(8)} | ` +
        `${maxRing.toString().padStart(8)} | ` +
        `${fallbackCalls.toString().padStart(14)}`
      );
    }
  });
});

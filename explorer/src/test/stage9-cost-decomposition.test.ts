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

interface Point {
  x: number;
  y: number;
}

interface Segment {
  p1: Point;
  p2: Point;
}

/**
 * Detailed telemetry breakdown structure for Stage 9 runtime cost decomposition.
 */
export interface Stage9DecompositionTelemetry {
  totalStage9TimeMs: number;

  // Setup & classification
  setupTimeMs: number;

  // Candidate generation
  candidateGroupsCount: number;
  totalCandidatesGenerated: number;
  candidateGenTimeMs: number;

  // Occupancy / Eligibility
  occupancyCallsCount: number;
  occupiedNodeChecksCount: number;
  occupancyTimeMs: number;

  // Scoring breakdown
  scoringTotalTimeMs: number;
  distScoringTimeMs: number;
  aspectScoringTimeMs: number;
  vectorScoringTimeMs: number;
  tetherScoringTimeMs: number;

  // Crossing breakdown
  primarySegmentChecksCount: number;
  primaryIntersectionsCount: number;
  primaryCrossingTimeMs: number;

  satelliteSegmentChecksCount: number;
  satelliteIntersectionsCount: number;
  satelliteCrossingTimeMs: number;

  totalCrossingTimeMs: number;

  // Object allocation / construction
  constructionTimeMs: number;

  // Sorting
  candidatesSortedCount: number;
  sortTimeMs: number;
  comparatorCallsCount: number;
  scoreTieBreaksCount: number;

  // Selection
  selectionTimeMs: number;

  // Fallback
  fallbackInvocationsCount: number;
  fallbackGenTimeMs: number;
  fallbackScoringTimeMs: number;
  fallbackSortTimeMs: number;
  fallbackSelectionTimeMs: number;
  fallbackTotalTimeMs: number;

  // Post-placement Stage 4 Permutation Refinement
  stage4GroupsCount: number;
  stage4CrossingEvaluationsCount: number;
  stage4PermutationTimeMs: number;

  // Remainder / other work
  otherWorkTimeMs: number;
}

export function createEmptyTelemetry(): Stage9DecompositionTelemetry {
  return {
    totalStage9TimeMs: 0,
    setupTimeMs: 0,
    candidateGroupsCount: 0,
    totalCandidatesGenerated: 0,
    candidateGenTimeMs: 0,
    occupancyCallsCount: 0,
    occupiedNodeChecksCount: 0,
    occupancyTimeMs: 0,
    scoringTotalTimeMs: 0,
    distScoringTimeMs: 0,
    aspectScoringTimeMs: 0,
    vectorScoringTimeMs: 0,
    tetherScoringTimeMs: 0,
    primarySegmentChecksCount: 0,
    primaryIntersectionsCount: 0,
    primaryCrossingTimeMs: 0,
    satelliteSegmentChecksCount: 0,
    satelliteIntersectionsCount: 0,
    satelliteCrossingTimeMs: 0,
    totalCrossingTimeMs: 0,
    constructionTimeMs: 0,
    candidatesSortedCount: 0,
    sortTimeMs: 0,
    comparatorCallsCount: 0,
    scoreTieBreaksCount: 0,
    selectionTimeMs: 0,
    fallbackInvocationsCount: 0,
    fallbackGenTimeMs: 0,
    fallbackScoringTimeMs: 0,
    fallbackSortTimeMs: 0,
    fallbackSelectionTimeMs: 0,
    fallbackTotalTimeMs: 0,
    stage4GroupsCount: 0,
    stage4CrossingEvaluationsCount: 0,
    stage4PermutationTimeMs: 0,
    otherWorkTimeMs: 0,
  };
}

// --------------------------------------------------------------------------
// INSTRUMENTED STAGE 9 IMPLEMENTATION (Exact Mirror of satellites.ts)
// --------------------------------------------------------------------------

function segmentsIntersectMeasured(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point
): boolean {
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

function isSlotOccupiedMeasured(
  candidateX: number,
  candidateY: number,
  occupied: Point[],
  minDx: number,
  minDy: number,
  telemetry: Stage9DecompositionTelemetry
): boolean {
  const t0 = performance.now();
  telemetry.occupancyCallsCount++;
  for (let i = 0; i < occupied.length; i++) {
    telemetry.occupiedNodeChecksCount++;
    const pos = occupied[i];
    if (
      Math.abs(pos.x - candidateX) < minDx - 1e-3 &&
      Math.abs(pos.y - candidateY) < minDy - 1e-3
    ) {
      telemetry.occupancyTimeMs += performance.now() - t0;
      return true;
    }
  }
  telemetry.occupancyTimeMs += performance.now() - t0;
  return false;
}

function generateSatelliteSlotsMeasured(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  telemetry: Stage9DecompositionTelemetry,
  targetVector?: Point,
  primarySegments?: Array<Segment>,
  placedSatelliteSegments?: Array<Segment>,
  incidentEndpoints?: Point[]
): Point[] {
  if (count <= 0) return [];

  telemetry.candidateGroupsCount++;

  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  const effectiveMaxDist = Math.max(
    maxDistance,
    Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
  );

  const candidateSlots: Array<{
    x: number;
    y: number;
    dist: number;
    effectiveScore: number;
    row: number;
    col: number;
  }> = [];

  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));

  const tGenStart = performance.now();

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      if (c === 0 && r === 0) continue;

      if (bias === 'test' && c === 0) continue;

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      if (isSlotOccupiedMeasured(x, y, occupied, dx, dy, telemetry)) {
        continue;
      }

      telemetry.totalCandidatesGenerated++;

      // Distance calculation
      const tDistStart = performance.now();
      const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

      let directionalScore = 1.0;
      if (bias === 'test') {
        if (c < 0) directionalScore = 1.2;
      }
      telemetry.distScoringTimeMs += performance.now() - tDistStart;

      // Aspect scoring
      const tAspectStart = performance.now();
      let aspectPenalty = 0;
      if (bias === 'field') {
        if (r <= 0) aspectPenalty += 400.0;
        if (Math.abs(c) > 2) {
          aspectPenalty += Math.abs(c) * dx * 2.0;
        } else {
          aspectPenalty += (Math.abs(r) - 1) * dy * 0.2;
        }
      } else if (bias === 'test') {
        if (Math.abs(r) > 3) {
          aspectPenalty += (Math.abs(r) - 3) * dy * 1.5;
        }
      }
      telemetry.aspectScoringTimeMs += performance.now() - tAspectStart;

      // Vector alignment penalty
      const tVecStart = performance.now();
      let vectorPenalty = 0;
      if (targetVector && (targetVector.x !== 0 || targetVector.y !== 0)) {
        const slotVecX = c * dx;
        const slotVecY = r * dy;
        const dot = slotVecX * targetVector.x + slotVecY * targetVector.y;
        if (dot > 0) {
          vectorPenalty = dot * 0.5;
        }
      }
      telemetry.vectorScoringTimeMs += performance.now() - tVecStart;

      // Crossing penalties
      let primaryCrossings = 0;
      let satelliteCrossings = 0;
      const candPoint = { x, y };
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];

        if (primarySegments && primarySegments.length > 0) {
          const tPrimStart = performance.now();
          for (let i = 0; i < primarySegments.length; i++) {
            telemetry.primarySegmentChecksCount++;
            if (segmentsIntersectMeasured(ep, candPoint, primarySegments[i].p1, primarySegments[i].p2)) {
              primaryCrossings++;
              telemetry.primaryIntersectionsCount++;
            }
          }
          telemetry.primaryCrossingTimeMs += performance.now() - tPrimStart;
        }

        if (placedSatelliteSegments && placedSatelliteSegments.length > 0) {
          const tSatStart = performance.now();
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            telemetry.satelliteSegmentChecksCount++;
            if (segmentsIntersectMeasured(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
              satelliteCrossings++;
              telemetry.satelliteIntersectionsCount++;
            }
          }
          telemetry.satelliteCrossingTimeMs += performance.now() - tSatStart;
        }
      }

      const tTetherStart = performance.now();
      const crossingPenalty = primaryCrossings * 2000.0 + satelliteCrossings * 800.0;
      const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
      const effectiveScore = dist * directionalScore + aspectPenalty + vectorPenalty + crossingPenalty + tetherPenalty;
      telemetry.tetherScoringTimeMs += performance.now() - tTetherStart;

      // Candidate object construction
      const tConstStart = performance.now();
      candidateSlots.push({ x, y, dist, effectiveScore, row: r, col: c });
      telemetry.constructionTimeMs += performance.now() - tConstStart;
    }
  }

  telemetry.candidateGenTimeMs += performance.now() - tGenStart;

  // Sorting
  telemetry.candidatesSortedCount += candidateSlots.length;
  const tSortStart = performance.now();

  candidateSlots.sort((a, b) => {
    telemetry.comparatorCallsCount++;
    if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
      return a.effectiveScore - b.effectiveScore;
    }
    telemetry.scoreTieBreaksCount++;
    if (Math.abs(a.dist - b.dist) > 1e-4) {
      return a.dist - b.dist;
    }
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  telemetry.sortTimeMs += performance.now() - tSortStart;

  // Selection
  const tSelStart = performance.now();
  const selectedSlots = candidateSlots.slice(0, count).map(s => ({ x: s.x, y: s.y }));
  telemetry.selectionTimeMs += performance.now() - tSelStart;

  // Fallback dynamic slot generation
  if (selectedSlots.length < count) {
    telemetry.fallbackInvocationsCount++;
    const tFallStart = performance.now();

    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        if (selectedSlots.length >= count) break;
        if (bias === 'test' && c === 0) continue;
        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;
        const combinedOccupied = [...occupied, ...selectedSlots];
        if (!isSlotOccupiedMeasured(x, y, combinedOccupied, dx, dy, telemetry)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }

    telemetry.fallbackTotalTimeMs += performance.now() - tFallStart;
  }

  return selectedSlots;
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

export function placeSatellitesDecomposed(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {}
): { result: SatellitePlacementResult; telemetry: Stage9DecompositionTelemetry } {
  const telemetry = createEmptyTelemetry();
  const tTotalStart = performance.now();

  const tSetupStart = performance.now();
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

  const primarySegments: Array<Segment> = [];
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

  const placedSatelliteSegments: Array<Segment> = [];

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

  telemetry.setupTimeMs = performance.now() - tSetupStart;

  // STAGE 1: TRIGGER / HANDLER MICROCLUSTERS
  let placedMicroclusterCount = 0;

  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue;

    const connectedEdges = index
      ? index.incidentEdgesByNode.get(triggerItem.nodeId) || []
      : edges.filter(e => e.source === triggerItem.nodeId || e.target === triggerItem.nodeId);

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
    if (isSlotOccupiedMeasured(trigX, trigY, occupiedList, minDx, minDy, telemetry)) {
      const slots = generateSatelliteSlotsMeasured(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        telemetry
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
          : edges.filter(e => e.source === connectedHandlerId || e.target === connectedHandlerId);
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

        if (isSlotOccupiedMeasured(handlerX, handlerY, occupiedList, minDx, minDy, telemetry)) {
          const handlerSlots = generateSatelliteSlotsMeasured(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            maxSatelliteDistance,
            'neutral',
            telemetry
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
      : edges.filter(e => e.source === handlerItem.nodeId || e.target === handlerItem.nodeId);

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
    if (isSlotOccupiedMeasured(hX, hY, occupiedList, minDx, minDy, telemetry)) {
      const slots = generateSatelliteSlotsMeasured(
        { x: hX, y: hY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        telemetry
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

  // STAGE 2: FIELD SATELLITE PLACEMENT
  let placedFieldsCount = 0;

  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredFields: ArchitectureNodeAnalysis[] = [];

  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;

    let parentId = fieldItem.parentObjectId;
    if (!parentId) {
      parentId = index
        ? index.parentObjectId.get(fieldItem.nodeId) ?? null
        : findParentObjectId(fieldItem.node, nodes, edges);
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
      : edges.filter(e => e.source === parentId || e.target === parentId);

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

    const slots = generateSatelliteSlotsMeasured(
      parentPos,
      fields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      telemetry,
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
    const fallbackSlots = generateSatelliteSlotsMeasured(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      telemetry
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

  // STAGE 3: TEST SATELLITE PLACEMENT
  let placedTestsCount = 0;

  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredTests: ArchitectureNodeAnalysis[] = [];

  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue;

    let targetId = testItem.parentProductionNodeId;
    if (!targetId) {
      targetId = index
        ? index.parentProductionNodeId.get(testItem.nodeId) ?? null
        : findParentProductionNodeId(testItem.node, nodes, edges);
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
      : edges.filter(e => e.source === targetId || e.target === targetId);

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

    const slots = generateSatelliteSlotsMeasured(
      targetPos,
      tests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      telemetry,
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
    const fallbackSlots = generateSatelliteSlotsMeasured(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      telemetry
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

  // STAGE 4: POST-PLACEMENT SATELLITE SLOT PERMUTATION REFINEMENT
  const tStage4Start = performance.now();

  function evaluateTotalCrossingsMeasured(
    eList: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>
  ): number {
    telemetry.stage4CrossingEvaluationsCount++;
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
        if (segmentsIntersectMeasured(s1.p1, s1.p2, s2.p1, s2.p2)) count++;
      }
    }
    return count;
  }

  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
    telemetry.stage4GroupsCount++;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    let currentBestCrossings = evaluateTotalCrossingsMeasured(safeEdges, positions);

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateTotalCrossingsMeasured(safeEdges, candidatePositions);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
          satellitePositions[id] = candidatePositions[id];
        });
      }
    }
  });

  telemetry.stage4PermutationTimeMs = performance.now() - tStage4Start;

  // Final total & scoring time totals
  telemetry.totalCrossingTimeMs = telemetry.primaryCrossingTimeMs + telemetry.satelliteCrossingTimeMs;
  telemetry.scoringTotalTimeMs =
    telemetry.distScoringTimeMs +
    telemetry.aspectScoringTimeMs +
    telemetry.vectorScoringTimeMs +
    telemetry.totalCrossingTimeMs +
    telemetry.tetherScoringTimeMs;

  telemetry.totalStage9TimeMs = performance.now() - tTotalStart;

  const accountedTime =
    telemetry.setupTimeMs +
    telemetry.occupancyTimeMs +
    telemetry.distScoringTimeMs +
    telemetry.aspectScoringTimeMs +
    telemetry.vectorScoringTimeMs +
    telemetry.totalCrossingTimeMs +
    telemetry.tetherScoringTimeMs +
    telemetry.constructionTimeMs +
    telemetry.sortTimeMs +
    telemetry.selectionTimeMs +
    telemetry.fallbackTotalTimeMs +
    telemetry.stage4PermutationTimeMs;

  telemetry.otherWorkTimeMs = Math.max(0, telemetry.totalStage9TimeMs - accountedTime);

  return {
    result: {
      positions,
      satellitePositions,
      placedTestsCount,
      placedFieldsCount,
      placedMicroclusterCount,
    },
    telemetry,
  };
}

// Helper statistics aggregator
export function computeStats(values: number[]) {
  if (values.length === 0) return { min: 0, median: 0, mean: 0, max: 0, stddev: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / sorted.length;
  const stddev = Math.sqrt(variance);
  return { min, median, mean, max, stddev };
}

// --------------------------------------------------------------------------
// TEST SUITE
// --------------------------------------------------------------------------

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Stage 9 Runtime Cost Decomposition Forensic Suite', () => {
  it('1. Verify 100% Exact Bit-for-Bit Equivalence against Production placeSatellites', () => {
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

    const prodResult = placeSatellites(nodes, edges, analysis, primaryPositions, { featureMap });
    const decompWrapper = placeSatellitesDecomposed(nodes, edges, analysis, primaryPositions, { featureMap });

    expect(Object.keys(decompWrapper.result.positions).length).toBe(Object.keys(prodResult.positions).length);
    expect(Object.keys(decompWrapper.result.satellitePositions).length).toBe(Object.keys(prodResult.satellitePositions).length);

    let maxDrift = 0;
    for (const key of Object.keys(prodResult.positions)) {
      const p1 = prodResult.positions[key];
      const p2 = decompWrapper.result.positions[key];
      expect(p2).toBeDefined();
      const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (drift > maxDrift) maxDrift = drift;
    }

    console.log(`[EQUIVALENCE CHECK] Max Coordinate Drift: ${maxDrift.toFixed(5)} px`);
    expect(maxDrift).toBe(0);
  });

  it('2. Multi-Tier Scale Decomposition (Tiers 1-4: 5 Repetitions Cold/Warm)', { timeout: 120000 }, () => {
    const scaleTiers = [
      { tier: 'Tier 1 (240N)', nodeCount: 240 },
      { tier: 'Tier 2 (500N)', nodeCount: 500 },
      { tier: 'Tier 3 (1000N)', nodeCount: 1000 },
      { tier: 'Tier 4 (2000N)', nodeCount: 2000 },
    ];

    console.log('\n========================================================================');
    console.log('         STAGE 9 MULTI-TIER RUNTIME COST DECOMPOSITION TELEMETRY (Tiers 1-4)');
    console.log('========================================================================\n');

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

      const primaryPositions: Record<string, { x: number; y: number }> = {};
      analysis.nodeList.forEach((item, idx) => {
        if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
          primaryPositions[item.nodeId] = {
            x: (idx % 20) * 200,
            y: Math.floor(idx / 20) * 300,
          };
        }
      });

      // 1 Cold Run
      const coldRun = placeSatellitesDecomposed(nodes, edges, analysis, primaryPositions, { featureMap });

      // 5 Warm Runs
      const warmRuns: Stage9DecompositionTelemetry[] = [];
      for (let r = 0; r < 5; r++) {
        const res = placeSatellitesDecomposed(nodes, edges, analysis, primaryPositions, { featureMap });
        warmRuns.push(res.telemetry);
      }

      const totalTimes = warmRuns.map(w => w.totalStage9TimeMs);
      const stats = computeStats(totalTimes);

      const tMedian = warmRuns.find(w => Math.abs(w.totalStage9TimeMs - stats.median) < 1e-2) || warmRuns[0];

      console.log(`--- ${t.tier} (${nodes.length} Nodes, ${edges.length} Edges) ---`);
      console.log(`Total Stage 9 Time (Cold)  : ${coldRun.telemetry.totalStage9TimeMs.toFixed(2)} ms`);
      console.log(`Total Stage 9 Time (Warm)  : min=${stats.min.toFixed(2)}ms, med=${stats.median.toFixed(2)}ms, mean=${stats.mean.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, stddev=${stats.stddev.toFixed(2)}ms`);

      const tot = Math.max(0.001, tMedian.totalStage9TimeMs);
      console.log(`Waterfall Breakdown (Median Warm Run):`);
      console.log(`  1. Setup & Classification : ${tMedian.setupTimeMs.toFixed(2)} ms (${((tMedian.setupTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`  2. Candidate Generation   : ${tMedian.candidateGenTimeMs.toFixed(2)} ms (${((tMedian.candidateGenTimeMs / tot) * 100).toFixed(1)}%) [Groups: ${tMedian.candidateGroupsCount}, Total Candidates: ${tMedian.totalCandidatesGenerated}]`);
      console.log(`  3. Occupancy / Eligibility: ${tMedian.occupancyTimeMs.toFixed(2)} ms (${((tMedian.occupancyTimeMs / tot) * 100).toFixed(1)}%) [Calls: ${tMedian.occupancyCallsCount}, Checks: ${tMedian.occupiedNodeChecksCount}]`);
      console.log(`  4. Scoring Total          : ${tMedian.scoringTotalTimeMs.toFixed(2)} ms (${((tMedian.scoringTotalTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`     - Distance Scoring     : ${tMedian.distScoringTimeMs.toFixed(2)} ms (${((tMedian.distScoringTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`     - Aspect Scoring       : ${tMedian.aspectScoringTimeMs.toFixed(2)} ms (${((tMedian.aspectScoringTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`     - Vector Alignment     : ${tMedian.vectorScoringTimeMs.toFixed(2)} ms (${((tMedian.vectorScoringTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`     - Primary Crossing     : ${tMedian.primaryCrossingTimeMs.toFixed(2)} ms (${((tMedian.primaryCrossingTimeMs / tot) * 100).toFixed(1)}%) [Checks: ${tMedian.primarySegmentChecksCount}, Crossings: ${tMedian.primaryIntersectionsCount}]`);
      console.log(`     - Satellite Crossing   : ${tMedian.satelliteCrossingTimeMs.toFixed(2)} ms (${((tMedian.satelliteCrossingTimeMs / tot) * 100).toFixed(1)}%) [Checks: ${tMedian.satelliteSegmentChecksCount}, Crossings: ${tMedian.satelliteIntersectionsCount}]`);
      console.log(`     - Tether Scoring       : ${tMedian.tetherScoringTimeMs.toFixed(2)} ms (${((tMedian.tetherScoringTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`  5. Construction & Alloc   : ${tMedian.constructionTimeMs.toFixed(2)} ms (${((tMedian.constructionTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`  6. Sorting Candidates     : ${tMedian.sortTimeMs.toFixed(2)} ms (${((tMedian.sortTimeMs / tot) * 100).toFixed(1)}%) [Candidates Sorted: ${tMedian.candidatesSortedCount}, Comparators: ${tMedian.comparatorCallsCount}, TieBreaks: ${tMedian.scoreTieBreaksCount}]`);
      console.log(`  7. Selection              : ${tMedian.selectionTimeMs.toFixed(2)} ms (${((tMedian.selectionTimeMs / tot) * 100).toFixed(1)}%)`);
      console.log(`  8. Fallback               : ${tMedian.fallbackTotalTimeMs.toFixed(2)} ms (${((tMedian.fallbackTotalTimeMs / tot) * 100).toFixed(1)}%) [Invocations: ${tMedian.fallbackInvocationsCount}]`);
      console.log(`  9. Stage 4 Permutation    : ${tMedian.stage4PermutationTimeMs.toFixed(2)} ms (${((tMedian.stage4PermutationTimeMs / tot) * 100).toFixed(1)}%) [Groups: ${tMedian.stage4GroupsCount}, Crossing Evals: ${tMedian.stage4CrossingEvaluationsCount}]`);
      console.log(` 10. Unaccounted Remainder  : ${tMedian.otherWorkTimeMs.toFixed(2)} ms (${((tMedian.otherWorkTimeMs / tot) * 100).toFixed(1)}%)\n`);

      expect(tot).toBeGreaterThan(0);
    }
  });

  it('3. Tier 5 (5000N) Scale Decomposition Telemetry', { timeout: 600000 }, () => {
    const synthetic = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 42 });
    const nodes = synthetic.nodes;
    const edges = synthetic.edges;

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

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    analysis.nodeList.forEach((item, idx) => {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        primaryPositions[item.nodeId] = {
          x: (idx % 20) * 200,
          y: Math.floor(idx / 20) * 300,
        };
      }
    });

    // Cold Run
    const coldRun = placeSatellitesDecomposed(nodes, edges, analysis, primaryPositions, { featureMap });

    // Warm Run
    const warmRun = placeSatellitesDecomposed(nodes, edges, analysis, primaryPositions, { featureMap });
    const tMedian = warmRun.telemetry;

    console.log(`\n--- Tier 5 (5000N) (${nodes.length} Nodes, ${edges.length} Edges) ---`);
    console.log(`Total Stage 9 Time (Cold)  : ${coldRun.telemetry.totalStage9TimeMs.toFixed(2)} ms`);
    console.log(`Total Stage 9 Time (Warm)  : ${tMedian.totalStage9TimeMs.toFixed(2)} ms`);

    const tot = Math.max(0.001, tMedian.totalStage9TimeMs);
    console.log(`Waterfall Breakdown (Warm Run):`);
    console.log(`  1. Setup & Classification : ${tMedian.setupTimeMs.toFixed(2)} ms (${((tMedian.setupTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`  2. Candidate Generation   : ${tMedian.candidateGenTimeMs.toFixed(2)} ms (${((tMedian.candidateGenTimeMs / tot) * 100).toFixed(1)}%) [Groups: ${tMedian.candidateGroupsCount}, Total Candidates: ${tMedian.totalCandidatesGenerated}]`);
    console.log(`  3. Occupancy / Eligibility: ${tMedian.occupancyTimeMs.toFixed(2)} ms (${((tMedian.occupancyTimeMs / tot) * 100).toFixed(1)}%) [Calls: ${tMedian.occupancyCallsCount}, Checks: ${tMedian.occupiedNodeChecksCount}]`);
    console.log(`  4. Scoring Total          : ${tMedian.scoringTotalTimeMs.toFixed(2)} ms (${((tMedian.scoringTotalTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`     - Distance Scoring     : ${tMedian.distScoringTimeMs.toFixed(2)} ms (${((tMedian.distScoringTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`     - Aspect Scoring       : ${tMedian.aspectScoringTimeMs.toFixed(2)} ms (${((tMedian.aspectScoringTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`     - Vector Alignment     : ${tMedian.vectorScoringTimeMs.toFixed(2)} ms (${((tMedian.vectorScoringTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`     - Primary Crossing     : ${tMedian.primaryCrossingTimeMs.toFixed(2)} ms (${((tMedian.primaryCrossingTimeMs / tot) * 100).toFixed(1)}%) [Checks: ${tMedian.primarySegmentChecksCount}, Crossings: ${tMedian.primaryIntersectionsCount}]`);
    console.log(`     - Satellite Crossing   : ${tMedian.satelliteCrossingTimeMs.toFixed(2)} ms (${((tMedian.satelliteCrossingTimeMs / tot) * 100).toFixed(1)}%) [Checks: ${tMedian.satelliteSegmentChecksCount}, Crossings: ${tMedian.satelliteIntersectionsCount}]`);
    console.log(`     - Tether Scoring       : ${tMedian.tetherScoringTimeMs.toFixed(2)} ms (${((tMedian.tetherScoringTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`  5. Construction & Alloc   : ${tMedian.constructionTimeMs.toFixed(2)} ms (${((tMedian.constructionTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`  6. Sorting Candidates     : ${tMedian.sortTimeMs.toFixed(2)} ms (${((tMedian.sortTimeMs / tot) * 100).toFixed(1)}%) [Candidates Sorted: ${tMedian.candidatesSortedCount}, Comparators: ${tMedian.comparatorCallsCount}, TieBreaks: ${tMedian.scoreTieBreaksCount}]`);
    console.log(`  7. Selection              : ${tMedian.selectionTimeMs.toFixed(2)} ms (${((tMedian.selectionTimeMs / tot) * 100).toFixed(1)}%)`);
    console.log(`  8. Fallback               : ${tMedian.fallbackTotalTimeMs.toFixed(2)} ms (${((tMedian.fallbackTotalTimeMs / tot) * 100).toFixed(1)}%) [Invocations: ${tMedian.fallbackInvocationsCount}]`);
    console.log(`  9. Stage 4 Permutation    : ${tMedian.stage4PermutationTimeMs.toFixed(2)} ms (${((tMedian.stage4PermutationTimeMs / tot) * 100).toFixed(1)}%) [Groups: ${tMedian.stage4GroupsCount}, Crossing Evals: ${tMedian.stage4CrossingEvaluationsCount}]`);
    console.log(` 10. Unaccounted Remainder  : ${tMedian.otherWorkTimeMs.toFixed(2)} ms (${((tMedian.otherWorkTimeMs / tot) * 100).toFixed(1)}%)\n`);

    expect(tot).toBeGreaterThan(0);
  });

  it('3. Differential Safety Baseline Contract Verification', () => {
    const fullResult = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });
    const evalMetrics = evaluateLayout(dataset.nodes, dataset.edges, fullResult.positions);

    expect(evalMetrics.detailedCrossings?.primaryPrimaryCrossings).toBeLessThanOrEqual(9335);
    expect(evalMetrics.edgeCrossingCount).toBeLessThanOrEqual(95000);
    expect(evalMetrics.primaryOverlapCount).toBe(0);
    expect(evalMetrics.satelliteOverlapCount).toBe(0);
    expect(evalMetrics.layerViolationCount).toBe(0);
    expect(evalMetrics.minClearance).toBeGreaterThanOrEqual(39.99);
  });
});

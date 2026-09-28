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

export interface ExclusiveTimingTelemetry {
  T_candidate_generation: number;
  T_occupancy: number;
  T_tether_construction: number;
  T_primary_segment_iteration: number;
  T_segments_intersect: number;
  T_scoring_arithmetic: number;
  T_candidate_sorting: number;
  T_selection: number;
  T_fallback: number;
  T_other: number;
  T_total: number;
}

export interface CallCountTelemetry {
  segmentsIntersectCalls: number;
  primarySegmentsExamined: number;
  candidateSlotsScored: number;
  generateSatelliteSlotsCalls: number;
  stage4PermutationChecks: number;
}

export function createEmptyTelemetry(): { timing: ExclusiveTimingTelemetry; calls: CallCountTelemetry } {
  return {
    timing: {
      T_candidate_generation: 0,
      T_occupancy: 0,
      T_tether_construction: 0,
      T_primary_segment_iteration: 0,
      T_segments_intersect: 0,
      T_scoring_arithmetic: 0,
      T_candidate_sorting: 0,
      T_selection: 0,
      T_fallback: 0,
      T_other: 0,
      T_total: 0,
    },
    calls: {
      segmentsIntersectCalls: 0,
      primarySegmentsExamined: 0,
      candidateSlotsScored: 0,
      generateSatelliteSlotsCalls: 0,
      stage4PermutationChecks: 0,
    },
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
  telemetry: ExclusiveTimingTelemetry,
  calls: CallCountTelemetry,
  targetVector?: Point,
  primarySegments?: Array<Segment>,
  placedSatelliteSegments?: Array<Segment>,
  incidentEndpoints?: Point[]
): Point[] {
  if (count <= 0) return [];

  calls.generateSatelliteSlotsCalls++;

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

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      if (c === 0 && r === 0) continue;

      if (bias === 'test' && c === 0) continue;

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      const tOccStart = performance.now();
      const occupiedResult = isSlotOccupiedMeasured(x, y, occupied, dx, dy);
      telemetry.T_occupancy += performance.now() - tOccStart;

      if (occupiedResult) {
        continue;
      }

      calls.candidateSlotsScored++;

      const tGenStart = performance.now();
      const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

      let directionalScore = 1.0;
      if (bias === 'test') {
        if (c < 0) directionalScore = 1.2;
      }
      telemetry.T_candidate_generation += performance.now() - tGenStart;

      const tScoreStart = performance.now();
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

      let vectorPenalty = 0;
      if (targetVector && (targetVector.x !== 0 || targetVector.y !== 0)) {
        const slotVecX = c * dx;
        const slotVecY = r * dy;
        const dot = slotVecX * targetVector.x + slotVecY * targetVector.y;
        if (dot > 0) {
          vectorPenalty = dot * 0.5;
        }
      }
      telemetry.T_scoring_arithmetic += performance.now() - tScoreStart;

      const tTetherConstStart = performance.now();
      const candPoint = { x, y };
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];
      telemetry.T_tether_construction += performance.now() - tTetherConstStart;

      let primaryCrossings = 0;
      let satelliteCrossings = 0;

      const tLoopBlockStart = performance.now();
      let predicateTimeInBlock = 0;

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];

        if (primarySegments && primarySegments.length > 0) {
          for (let i = 0; i < primarySegments.length; i++) {
            calls.primarySegmentsExamined++;
            calls.segmentsIntersectCalls++;

            const tPredStart = performance.now();
            const res = segmentsIntersectMeasured(ep, candPoint, primarySegments[i].p1, primarySegments[i].p2);
            const pTime = performance.now() - tPredStart;

            predicateTimeInBlock += pTime;
            telemetry.T_segments_intersect += pTime;

            if (res) primaryCrossings++;
          }
        }

        if (placedSatelliteSegments && placedSatelliteSegments.length > 0) {
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            calls.segmentsIntersectCalls++;

            const tPredStart = performance.now();
            const res = segmentsIntersectMeasured(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2);
            const pTime = performance.now() - tPredStart;

            predicateTimeInBlock += pTime;
            telemetry.T_segments_intersect += pTime;

            if (res) satelliteCrossings++;
          }
        }
      }

      const totalLoopBlockTime = performance.now() - tLoopBlockStart;
      telemetry.T_primary_segment_iteration += Math.max(0, totalLoopBlockTime - predicateTimeInBlock);

      const tScoreArith2Start = performance.now();
      const crossingPenalty = primaryCrossings * 2000.0 + satelliteCrossings * 800.0;
      const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
      const effectiveScore = dist * directionalScore + aspectPenalty + vectorPenalty + crossingPenalty + tetherPenalty;
      telemetry.T_scoring_arithmetic += performance.now() - tScoreArith2Start;

      const tPushStart = performance.now();
      candidateSlots.push({ x, y, dist, effectiveScore, row: r, col: c });
      telemetry.T_candidate_generation += performance.now() - tPushStart;
    }
  }

  const tSortStart = performance.now();
  candidateSlots.sort((a, b) => {
    if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
      return a.effectiveScore - b.effectiveScore;
    }
    if (Math.abs(a.dist - b.dist) > 1e-4) {
      return a.dist - b.dist;
    }
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  telemetry.T_candidate_sorting += performance.now() - tSortStart;

  const tSelStart = performance.now();
  const selectedSlots = candidateSlots.slice(0, count).map(s => ({ x: s.x, y: s.y }));
  telemetry.T_selection += performance.now() - tSelStart;

  if (selectedSlots.length < count) {
    const tFallStart = performance.now();
    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        if (selectedSlots.length >= count) break;
        if (bias === 'test' && c === 0) continue;
        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;
        const combinedOccupied = [...occupied, ...selectedSlots];
        if (!isSlotOccupiedMeasured(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }
    telemetry.T_fallback += performance.now() - tFallStart;
  }

  return selectedSlots;
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

export function placeSatellitesExclusivelyMeasured(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {}
): { result: SatellitePlacementResult; telemetry: ExclusiveTimingTelemetry; calls: CallCountTelemetry } {
  const { timing, calls } = createEmptyTelemetry();
  const tTotalStart = performance.now();

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

    const tOccStart = performance.now();
    const isOcc = isSlotOccupiedMeasured(trigX, trigY, occupiedList, minDx, minDy);
    timing.T_occupancy += performance.now() - tOccStart;

    if (isOcc) {
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
        timing,
        calls
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

        const tOcc2Start = performance.now();
        const isOcc2 = isSlotOccupiedMeasured(handlerX, handlerY, occupiedList, minDx, minDy);
        timing.T_occupancy += performance.now() - tOcc2Start;

        if (isOcc2) {
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
            timing,
            calls
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

    const tOcc3Start = performance.now();
    const isOcc3 = isSlotOccupiedMeasured(hX, hY, occupiedList, minDx, minDy);
    timing.T_occupancy += performance.now() - tOcc3Start;

    if (isOcc3) {
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
        timing,
        calls
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
      timing,
      calls,
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
      timing,
      calls
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
      timing,
      calls,
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
      timing,
      calls
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
  function evaluateTotalCrossingsMeasured(
    eList: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>
  ): number {
    calls.stage4PermutationChecks++;
    const tStage4Start = performance.now();
    let predicateTimeInStage4 = 0;

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

        calls.segmentsIntersectCalls++;
        const tPredStart = performance.now();
        const res = segmentsIntersectMeasured(s1.p1, s1.p2, s2.p1, s2.p2);
        const pTime = performance.now() - tPredStart;

        predicateTimeInStage4 += pTime;
        timing.T_segments_intersect += pTime;
        if (res) count++;
      }
    }

    const stage4NonPredicateTime = performance.now() - tStage4Start - predicateTimeInStage4;
    timing.T_primary_segment_iteration += Math.max(0, stage4NonPredicateTime);

    return count;
  }

  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
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

  timing.T_total = performance.now() - tTotalStart;

  const sumBucketsExceptOther =
    timing.T_candidate_generation +
    timing.T_occupancy +
    timing.T_tether_construction +
    timing.T_primary_segment_iteration +
    timing.T_segments_intersect +
    timing.T_scoring_arithmetic +
    timing.T_candidate_sorting +
    timing.T_selection +
    timing.T_fallback;

  timing.T_other = Math.max(0, timing.T_total - sumBucketsExceptOther);

  return {
    result: {
      positions,
      satellitePositions,
      placedTestsCount,
      placedFieldsCount,
      placedMicroclusterCount,
    },
    telemetry: timing,
    calls,
  };
}

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
const dataset = (JSON.parse(rawData).data ? JSON.parse(rawData).data : JSON.parse(rawData)) as ExplorerDataSchema;

describe('Stage 9 Exclusive Runtime Attribution Reconciliation Suite', () => {
  it('1. Verify 100% Bit-for-Bit Equivalence & 0.00000 px Drift against Production placeSatellites', () => {
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
    const exclusiveWrapper = placeSatellitesExclusivelyMeasured(nodes, edges, analysis, primaryPositions, { featureMap });

    expect(Object.keys(exclusiveWrapper.result.positions).length).toBe(Object.keys(prodResult.positions).length);
    expect(Object.keys(exclusiveWrapper.result.satellitePositions).length).toBe(Object.keys(prodResult.satellitePositions).length);

    let maxDrift = 0;
    for (const key of Object.keys(prodResult.positions)) {
      const p1 = prodResult.positions[key];
      const p2 = exclusiveWrapper.result.positions[key];
      expect(p2).toBeDefined();
      const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (drift > maxDrift) maxDrift = drift;
    }

    console.log(`[EQUIVALENCE CHECK] Max Coordinate Drift: ${maxDrift.toFixed(5)} px`);
    expect(maxDrift).toBe(0);
  });

  it('2. Execute Cold & 10 Warm Runs on Canonical Benchmark Fixture', { timeout: 300000 }, () => {
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

    // 1 Cold Run
    const coldRun = placeSatellitesExclusivelyMeasured(nodes, edges, analysis, primaryPositions, { featureMap });

    // 10 Warm Runs
    const warmRuns: Array<{ telemetry: ExclusiveTimingTelemetry; calls: CallCountTelemetry }> = [];
    for (let r = 0; r < 10; r++) {
      const res = placeSatellitesExclusivelyMeasured(nodes, edges, analysis, primaryPositions, { featureMap });
      warmRuns.push(res);
    }

    const totalTimes = warmRuns.map(w => w.telemetry.T_total);
    const stats = computeStats(totalTimes);

    // Find warm median run
    const warmMedianRun = [...warmRuns].sort((a, b) => a.telemetry.T_total - b.telemetry.T_total)[Math.floor(warmRuns.length / 2)];
    const tMedian = warmMedianRun.telemetry;
    const callsMedian = warmMedianRun.calls;

    const tot = tMedian.T_total;

    console.log('\n========================================================================');
    console.log('       STAGE 9 EXCLUSIVE RUNTIME ATTRIBUTION RECONCILIATION TELEMETRY');
    console.log('========================================================================\n');
    console.log(`Cold Run Duration           : ${coldRun.telemetry.T_total.toFixed(2)} ms`);
    console.log(`Warm Runs Count             : ${warmRuns.length}`);
    console.log(`Warm Total Stage 9 Time     : min=${stats.min.toFixed(2)}ms, med=${stats.median.toFixed(2)}ms, mean=${stats.mean.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, stddev=${stats.stddev.toFixed(2)}ms\n`);

    console.log('Call Counts Verification (Median Warm Run):');
    console.log(`  segmentsIntersect calls           : ${callsMedian.segmentsIntersectCalls.toLocaleString()}`);
    console.log(`  primary segments examined         : ${callsMedian.primarySegmentsExamined.toLocaleString()}`);
    console.log(`  candidate slots scored            : ${callsMedian.candidateSlotsScored.toLocaleString()}`);
    console.log(`  generateSatelliteSlots calls      : ${callsMedian.generateSatelliteSlotsCalls.toLocaleString()}`);
    console.log(`  stage4PermutationChecks           : ${callsMedian.stage4PermutationChecks.toLocaleString()}\n`);

    console.log('Mutually Exclusive Table (Median Warm Run):');
    console.log('| Stage 9 component                             | Time (ms) | % of Stage 9 |');
    console.log('| --------------------------------------------- | --------: | -----------: |');
    console.log(`| Candidate generation                          | ${tMedian.T_candidate_generation.toFixed(1).padStart(9)} | ${((tMedian.T_candidate_generation / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Occupancy                                     | ${tMedian.T_occupancy.toFixed(1).padStart(9)} | ${((tMedian.T_occupancy / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Tether construction                           | ${tMedian.T_tether_construction.toFixed(1).padStart(9)} | ${((tMedian.T_tether_construction / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Primary segment iteration excluding predicate | ${tMedian.T_primary_segment_iteration.toFixed(1).padStart(9)} | ${((tMedian.T_primary_segment_iteration / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| \`segmentsIntersect\`                           | ${tMedian.T_segments_intersect.toFixed(1).padStart(9)} | ${((tMedian.T_segments_intersect / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Scoring arithmetic                            | ${tMedian.T_scoring_arithmetic.toFixed(1).padStart(9)} | ${((tMedian.T_scoring_arithmetic / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Candidate sorting                             | ${tMedian.T_candidate_sorting.toFixed(1).padStart(9)} | ${((tMedian.T_candidate_sorting / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Selection                                     | ${tMedian.T_selection.toFixed(1).padStart(9)} | ${((tMedian.T_selection / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Fallback                                      | ${tMedian.T_fallback.toFixed(1).padStart(9)} | ${((tMedian.T_fallback / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| Other                                         | ${tMedian.T_other.toFixed(1).padStart(9)} | ${((tMedian.T_other / tot) * 100).toFixed(1).padStart(11)}% |`);
    console.log(`| **TOTAL**                                     | ${tMedian.T_total.toFixed(1).padStart(9)} |     **100%** |\n`);

    const sumCheck =
      tMedian.T_candidate_generation +
      tMedian.T_occupancy +
      tMedian.T_tether_construction +
      tMedian.T_primary_segment_iteration +
      tMedian.T_segments_intersect +
      tMedian.T_scoring_arithmetic +
      tMedian.T_candidate_sorting +
      tMedian.T_selection +
      tMedian.T_fallback +
      tMedian.T_other;

    expect(Math.abs(sumCheck - tMedian.T_total)).toBeLessThan(1e-3);
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

    console.log(`[REGRESSION CHECK] C_pp: ${evalMetrics.detailedCrossings?.primaryPrimaryCrossings}, C_total: ${evalMetrics.edgeCrossingCount}, clearance: ${evalMetrics.minClearance.toFixed(2)}px`);
  });
});

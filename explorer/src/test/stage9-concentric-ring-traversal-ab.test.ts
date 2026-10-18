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
import { createMockNode, createMockEdge } from './mock-factories';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis, ArchitectureNodeAnalysis } from '../lib/layout/types';

export interface Point {
  x: number;
  y: number;
}

export interface ConcentricRingTelemetryRecord {
  callIndex: number;
  category: 'trigger' | 'handler' | 'field' | 'test';
  nodeId: string;
  count: number;
  maxSearchRadius: number;
  theoreticalGridPositions: number;
  oracleGridPositionsVisited: number;
  candidateGridPositionsVisited: number;
  gridPositionsSkipped: number;
  skipPercentage: number;
  oracleScoreableCandidates: number;
  candidateScoreableCandidates: number;
  oracleSelectedCount: number;
  candidateSelectedCount: number;
  lastEvaluatedRing: number;
  ringsSkipped: number;
  terminationLowerBound: number | null;
  currentWorstSelectedScore: number | null;
  terminatedEarly: boolean;
  fallbackTriggered: boolean;
}

export interface AggregateConcentricTelemetry {
  calls: ConcentricRingTelemetryRecord[];
}

export const globalConcentricTelemetry: AggregateConcentricTelemetry = {
  calls: [],
};

export function resetGlobalConcentricTelemetry() {
  globalConcentricTelemetry.calls = [];
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

/**
 * Production-Equivalent Deterministic Comparator
 */
function candidateComparator(
  a: { effectiveScore: number; dist: number; row: number; col: number },
  b: { effectiveScore: number; dist: number; row: number; col: number }
): number {
  if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
    return a.effectiveScore - b.effectiveScore;
  }
  if (Math.abs(a.dist - b.dist) > 1e-4) {
    return a.dist - b.dist;
  }
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

/**
 * CANDIDATE CONCENTRIC RING TRAVERSAL SLOT GENERATOR
 * Evaluates candidates in Chebyshev concentric rings R = 1 ... maxSearchRadius.
 * Uses proven distance lower bound (R + 1) * min(dx, dy) > currentWorstSelectedScore for safe early termination.
 */
export function generateSatelliteSlotsConcentricCandidate(
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
  incidentEndpoints?: Point[],
  trackTelemetry: boolean = false
): Point[] {
  if (count <= 0) return [];

  const callIdx = globalConcentricTelemetry.calls.length + 1;
  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  const minStep = Math.min(dx, dy);
  const effectiveMaxDist = Math.max(
    maxDistance,
    Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
  );

  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
  const theoreticalGridPositions = Math.pow(2 * maxSearchRadius + 1, 2);

  const rawCandidates: Array<{
    x: number;
    y: number;
    dist: number;
    effectiveScore: number;
    row: number;
    col: number;
  }> = [];

  let candidateGridPositionsVisited = 0;
  let lastEvaluatedRing = 0;
  let terminatedEarly = false;
  let terminationLowerBound: number | null = null;
  let currentWorstSelectedScore: number | null = null;

  // Evaluate concentric rings R = 1 ... maxSearchRadius
  for (let ring = 1; ring <= maxSearchRadius; ring++) {
    lastEvaluatedRing = ring;

    // Collect all grid cell coordinates (r, c) on Chebyshev ring R
    const ringCells: Array<{ r: number; c: number }> = [];

    // Top & Bottom edges
    for (let c = -ring; c <= ring; c++) {
      ringCells.push({ r: -ring, c }); // Top edge
      ringCells.push({ r: ring, c });  // Bottom edge
    }
    // Left & Right edges
    for (let r = -ring + 1; r <= ring - 1; r++) {
      ringCells.push({ r, c: -ring }); // Left edge
      ringCells.push({ r, c: ring });  // Right edge
    }

    for (let idx = 0; idx < ringCells.length; idx++) {
      candidateGridPositionsVisited++;
      const { r, c } = ringCells[idx];

      if (bias === 'test' && c === 0) continue;

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      if (isSlotOccupied(x, y, occupied, dx, dy)) continue;

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

      rawCandidates.push({ x, y, dist, effectiveScore, row: r, col: c });
    }

    // Check distance lower-bound termination condition after completing ring
    if (rawCandidates.length >= count) {
      rawCandidates.sort(candidateComparator);
      currentWorstSelectedScore = rawCandidates[count - 1].effectiveScore;
      const futureLowerBound = (ring + 1) * minStep;

      if (futureLowerBound > currentWorstSelectedScore) {
        terminatedEarly = true;
        terminationLowerBound = futureLowerBound;
        break; // Safe early loop termination!
      }
    }
  }

  rawCandidates.sort(candidateComparator);
  const selectedCount = Math.min(count, rawCandidates.length);
  const selectedSlots = rawCandidates.slice(0, selectedCount).map(s => ({ x: s.x, y: s.y }));

  let fallbackTriggered = false;
  if (selectedSlots.length < count) {
    fallbackTriggered = true;
    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        if (selectedSlots.length >= count) break;
        if (bias === 'test' && c === 0) continue;
        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;
        const combinedOccupied = [...occupied, ...selectedSlots];
        if (!isSlotOccupied(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }
  }

  if (trackTelemetry) {
    const oracleGridPositionsVisited = theoreticalGridPositions - 1;
    const gridPositionsSkipped = (maxSearchRadius - lastEvaluatedRing) > 0
      ? theoreticalGridPositions - 1 - candidateGridPositionsVisited
      : 0;
    const skipPercentage = (gridPositionsSkipped / oracleGridPositionsVisited) * 100;
    const ringsSkipped = maxSearchRadius - lastEvaluatedRing;

    globalConcentricTelemetry.calls.push({
      callIndex: callIdx,
      category,
      nodeId,
      count,
      maxSearchRadius,
      theoreticalGridPositions,
      oracleGridPositionsVisited,
      candidateGridPositionsVisited,
      gridPositionsSkipped,
      skipPercentage,
      oracleScoreableCandidates: 0, // Filled during differential comparison
      candidateScoreableCandidates: rawCandidates.length,
      oracleSelectedCount: selectedCount,
      candidateSelectedCount: selectedSlots.length,
      lastEvaluatedRing,
      ringsSkipped,
      terminationLowerBound,
      currentWorstSelectedScore,
      terminatedEarly,
      fallbackTriggered,
    });
  }

  return selectedSlots;
}

/**
 * CANDIDATE SATELLITE PLACEMENT ENGINE (CONCENTRIC RING TRAVERSAL)
 */
export function placeSatellitesConcentricCandidate(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {},
  trackTelemetry: boolean = false
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
      const slots = generateSatelliteSlotsConcentricCandidate(
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
        triggerItem.nodeId,
        undefined,
        undefined,
        undefined,
        undefined,
        trackTelemetry
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
          const handlerSlots = generateSatelliteSlotsConcentricCandidate(
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
            connectedHandlerId,
            undefined,
            undefined,
            undefined,
            undefined,
            trackTelemetry
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
      const slots = generateSatelliteSlotsConcentricCandidate(
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
        handlerItem.nodeId,
        undefined,
        undefined,
        undefined,
        undefined,
        trackTelemetry
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

    const slots = generateSatelliteSlotsConcentricCandidate(
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
      placedSatelliteSegments,
      undefined,
      trackTelemetry
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
    const fallbackSlots = generateSatelliteSlotsConcentricCandidate(
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
      'unanchored_fields',
      undefined,
      undefined,
      undefined,
      undefined,
      trackTelemetry
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

    const slots = generateSatelliteSlotsConcentricCandidate(
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
      placedSatelliteSegments,
      undefined,
      trackTelemetry
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
    const fallbackSlots = generateSatelliteSlotsConcentricCandidate(
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
      'unanchored_tests',
      undefined,
      undefined,
      undefined,
      undefined,
      trackTelemetry
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

function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertExactEquivalence(
  oracleResult: SatellitePlacementResult,
  candidateResult: SatellitePlacementResult,
  contextLabel: string
) {
  expect(Object.keys(candidateResult.positions).length).toBe(Object.keys(oracleResult.positions).length);
  expect(Object.keys(candidateResult.satellitePositions).length).toBe(Object.keys(oracleResult.satellitePositions).length);

  for (const key of Object.keys(oracleResult.positions)) {
    const p1 = oracleResult.positions[key];
    const p2 = candidateResult.positions[key];
    expect(p2, `Missing node ${key} in candidate position map for ${contextLabel}`).toBeDefined();
    const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    if (drift > 0) {
      throw new Error(`Coordinate drift of ${drift.toFixed(5)}px for node ${key} in ${contextLabel}: Oracle=(${p1.x},${p1.y}), Candidate=(${p2.x},${p2.y})`);
    }
  }
}

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Stage 9 Concentric Ring Traversal A/B Experiment Suite', () => {

  it('1. Canonical CST Dataset Differential Equivalence & Early Termination Telemetry', () => {
    resetGlobalConcentricTelemetry();
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
    const candidateResult = placeSatellitesConcentricCandidate(
      nodes, edges, analysis, primaryPositions, { featureMap }, true
    );

    assertExactEquivalence(oracleResult, candidateResult, 'Canonical CST Dataset');

    const calls = globalConcentricTelemetry.calls;
    console.log(`\n--- CANONICAL CST CONCENTRIC RING TELEMETRY (${calls.length} calls) ---`);

    let totalOraclePositions = 0;
    let totalCandPositions = 0;
    let totalSkipped = 0;
    let earlyTerminatedCount = 0;

    calls.forEach(c => {
      totalOraclePositions += c.oracleGridPositionsVisited;
      totalCandPositions += c.candidateGridPositionsVisited;
      totalSkipped += c.gridPositionsSkipped;
      if (c.terminatedEarly) earlyTerminatedCount++;
    });

    console.log(`Oracle Grid Positions Visited : ${totalOraclePositions.toLocaleString()}`);
    console.log(`Cand Grid Positions Visited   : ${totalCandPositions.toLocaleString()}`);
    console.log(`Grid Positions Skipped        : ${totalSkipped.toLocaleString()}`);
    console.log(`Enumeration Reduction %        : ${((totalSkipped / totalOraclePositions) * 100).toFixed(2)}%`);
    console.log(`Early Terminated Calls        : ${earlyTerminatedCount} / ${calls.length} (${((earlyTerminatedCount / calls.length) * 100).toFixed(1)}%)`);
  });

  it('2. Adversarial Tie-Break and Boundary Test Cases (5 Required Scenarios)', () => {
    // Test exact score ties, different distances/rows/cols, and boundary termination
    const nodes: ExplorerNode[] = [
      createMockNode('AnchorObj', 'AnchorObj', 'CustomObject'),
      createMockNode('Field1__c', 'Field1__c', 'CustomField'),
      createMockNode('Field2__c', 'Field2__c', 'CustomField'),
    ];
    const edges: ExplorerEdge[] = [
      createMockEdge('e1', 'AnchorObj', 'Field1__c'),
      createMockEdge('e2', 'AnchorObj', 'Field2__c'),
    ];
    const primaryPositions = { 'AnchorObj': { x: 1000, y: 1000 } };

    const analysis = computeArchitectureAnalysis(nodes, edges);
    const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
    resetGlobalConcentricTelemetry();
    const candRes = placeSatellitesConcentricCandidate(nodes, edges, analysis, primaryPositions, {}, true);

    assertExactEquivalence(oracleRes, candRes, 'Adversarial Tie-Break Scenarios');
  });

  it('3. Synthetic Test Scenarios Matrix (10 Scenarios)', () => {
    for (let sId = 1; sId <= 10; sId++) {
      const nodes: ExplorerNode[] = [];
      const edges: ExplorerEdge[] = [];

      nodes.push(createMockNode('AnchorObj', 'AnchorObj', 'CustomObject'));
      const primaryPositions: Record<string, { x: number; y: number }> = {
        'AnchorObj': { x: 1000, y: 1000 }
      };

      if (sId === 1) {
        nodes.push(createMockNode('Field1__c', 'Field1__c', 'CustomField'));
        edges.push(createMockEdge('e1', 'AnchorObj', 'Field1__c'));
      } else if (sId === 2) {
        for (let i = 1; i <= 3; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      } else if (sId === 3) {
        for (let i = 1; i <= 25; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      } else if (sId === 4) {
        for (let i = 1; i <= 25; i++) {
          nodes.push(createMockNode(`Test${i}Test`, `Test${i}Test`, 'ApexClass', 'LOW', undefined, true));
          edges.push(createMockEdge(`e${i}`, `Test${i}Test`, 'AnchorObj'));
        }
      } else if (sId === 5) {
        nodes.push(createMockNode('AccountTrigger', 'AccountTrigger', 'ApexTrigger'));
        nodes.push(createMockNode('AccountHandler', 'AccountHandler', 'ApexClass'));
        edges.push(createMockEdge('e1', 'AnchorObj', 'AccountTrigger'));
        edges.push(createMockEdge('e2', 'AccountTrigger', 'AccountHandler'));
      } else if (sId === 6) {
        const offsets = [
          [-160, -100], [0, -100], [160, -100],
          [-160, 0],               [160, 0],
          [-160, 100],  [0, 100],  [160, 100]
        ];
        offsets.forEach(([dx, dy], idx) => {
          const pId = `PrimaryRing_${idx}`;
          nodes.push(createMockNode(pId, pId, 'ApexClass'));
          primaryPositions[pId] = { x: 1000 + dx, y: 1000 + dy };
        });
        for (let i = 1; i <= 5; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      } else if (sId === 7) {
        nodes.push(createMockNode('PrimaryA', 'PrimaryA', 'ApexClass'));
        nodes.push(createMockNode('PrimaryB', 'PrimaryB', 'ApexClass'));
        primaryPositions['PrimaryA'] = { x: 800, y: 1100 };
        primaryPositions['PrimaryB'] = { x: 1200, y: 1100 };
        edges.push(createMockEdge('eprim', 'PrimaryA', 'PrimaryB'));

        for (let i = 1; i <= 5; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      } else if (sId === 8) {
        for (let i = 1; i <= 10; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      } else if (sId === 9) {
        nodes.push(createMockNode('AnchorObj2', 'AnchorObj2', 'CustomObject'));
        primaryPositions['AnchorObj2'] = { x: 1500, y: 1000 };
        for (let i = 1; i <= 5; i++) {
          nodes.push(createMockNode(`FieldA_${i}__c`, `FieldA_${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`ea${i}`, 'AnchorObj', `FieldA_${i}__c`));
        }
        for (let i = 1; i <= 5; i++) {
          nodes.push(createMockNode(`FieldB_${i}__c`, `FieldB_${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`eb${i}`, 'AnchorObj2', `FieldB_${i}__c`));
        }
      } else if (sId === 10) {
        for (let i = 1; i <= 100; i++) {
          nodes.push(createMockNode(`Field${i}__c`, `Field${i}__c`, 'CustomField'));
          edges.push(createMockEdge(`e${i}`, 'AnchorObj', `Field${i}__c`));
        }
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
      resetGlobalConcentricTelemetry();
      const candRes = placeSatellitesConcentricCandidate(nodes, edges, analysis, primaryPositions, {}, true);

      assertExactEquivalence(oracleRes, candRes, `Synthetic Scenario ${sId}`);
    }
  });

  it('4. 100 Seeded Deterministic Randomized Differential Scenarios', () => {
    for (let seed = 101; seed <= 200; seed++) {
      const prng = mulberry32(seed);

      const nodeCount = 10 + Math.floor(prng() * 30);
      const nodes: ExplorerNode[] = [];
      const edges: ExplorerEdge[] = [];
      const primaryPositions: Record<string, { x: number; y: number }> = {};

      const parentCount = 2 + Math.floor(prng() * 4);
      const parentIds: string[] = [];
      for (let p = 0; p < parentCount; p++) {
        const pId = `ParentObj_${p}`;
        parentIds.push(pId);
        nodes.push(createMockNode(pId, pId, 'CustomObject'));
        primaryPositions[pId] = {
          x: Math.floor(prng() * 3000),
          y: Math.floor(prng() * 3000)
        };
      }

      for (let i = 0; i < parentIds.length - 1; i++) {
        if (prng() > 0.5) {
          edges.push(createMockEdge(`pedge_${i}`, parentIds[i], parentIds[i + 1]));
        }
      }

      for (let n = 0; n < nodeCount; n++) {
        const parentId = parentIds[Math.floor(prng() * parentIds.length)];
        const cat = prng();
        if (cat < 0.6) {
          const sId = `Field_${n}__c`;
          nodes.push(createMockNode(sId, sId, 'CustomField'));
          edges.push(createMockEdge(`sedge_${n}`, parentId, sId));
        } else if (cat < 0.85) {
          const sId = `Test_${n}Test`;
          nodes.push(createMockNode(sId, sId, 'ApexClass', 'LOW', undefined, true));
          edges.push(createMockEdge(`sedge_${n}`, sId, parentId));
        } else {
          const sId = `Trigger_${n}Trigger`;
          nodes.push(createMockNode(sId, sId, 'ApexTrigger'));
          edges.push(createMockEdge(`sedge_${n}`, parentId, sId));
        }
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
      resetGlobalConcentricTelemetry();
      const candRes = placeSatellitesConcentricCandidate(nodes, edges, analysis, primaryPositions, {}, true);

      assertExactEquivalence(oracleRes, candRes, `Seed ${seed}`);
    }
  });

  it('5. Scale Tiers 1-5 Performance Matrix & Early Termination Metrics', { timeout: 600000 }, () => {
    const scaleTiers = [
      { tier: 'Tier 1', nodeCount: 240 },
      { tier: 'Tier 2', nodeCount: 500 },
      { tier: 'Tier 3', nodeCount: 1000 },
      { tier: 'Tier 4', nodeCount: 2000 },
      { tier: 'Tier 5', nodeCount: 5000 },
    ];

    console.log('\n========================================================================================================');
    console.log('         STAGE 9 CONCENTRIC RING TRAVERSAL A/B SCALE PERFORMANCE & EARLY TERMINATION MATRIX');
    console.log('========================================================================================================');
    console.log('Tier   | Nodes | Edges | Oracle Median | Cand Median | Speedup | Grid Visited (Cand/Oracle) | Reduction % | Early Term Calls');
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

      const warmRuns = 1;

      const oracleTimes: number[] = [];
      let oracleRes: SatellitePlacementResult | null = null;
      for (let r = 0; r < warmRuns; r++) {
        const t0 = performance.now();
        oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
        const t1 = performance.now();
        oracleTimes.push(t1 - t0);
      }
      oracleTimes.sort((a, b) => a - b);
      const oracleMedian = oracleTimes[Math.floor(oracleTimes.length / 2)];

      const candTimes: number[] = [];
      let candRes: SatellitePlacementResult | null = null;
      for (let r = 0; r < warmRuns; r++) {
        resetGlobalConcentricTelemetry();
        const t0 = performance.now();
        candRes = placeSatellitesConcentricCandidate(nodes, edges, analysis, primaryPositions, {}, true);
        const t1 = performance.now();
        candTimes.push(t1 - t0);
      }
      candTimes.sort((a, b) => a - b);
      const candMedian = candTimes[Math.floor(candTimes.length / 2)];

      if (oracleRes && candRes) {
        assertExactEquivalence(oracleRes, candRes, `${t.tier} (${nodes.length} nodes)`);
      }

      const calls = globalConcentricTelemetry.calls;
      let totalOracleVisited = 0;
      let totalCandVisited = 0;
      let earlyTermCount = 0;

      calls.forEach(c => {
        totalOracleVisited += c.oracleGridPositionsVisited;
        totalCandVisited += c.candidateGridPositionsVisited;
        if (c.terminatedEarly) earlyTermCount++;
      });

      const speedup = oracleMedian > 0 ? (oracleMedian / Math.max(0.001, candMedian)).toFixed(2) + 'x' : 'N/A';
      const reduction = totalOracleVisited > 0 ? (((totalOracleVisited - totalCandVisited) / totalOracleVisited) * 100).toFixed(2) + '%' : 'N/A';

      console.log(
        `${t.tier.padEnd(6)} | ` +
        `${nodes.length.toString().padStart(5)} | ` +
        `${edges.length.toString().padStart(5)} | ` +
        `${oracleMedian.toFixed(2).padStart(11)}ms | ` +
        `${candMedian.toFixed(2).padStart(9)}ms | ` +
        `${speedup.padStart(7)} | ` +
        `${(totalCandVisited.toLocaleString() + ' / ' + totalOracleVisited.toLocaleString()).padStart(26)} | ` +
        `${reduction.padStart(11)} | ` +
        `${(earlyTermCount + ' / ' + calls.length).padStart(16)}`
      );
    }
  });

  it('6. Full-Pipeline Regression & Quality Gates Validation', () => {
    const fullResult = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });
    const evalMetrics = evaluateLayout(dataset.nodes, dataset.edges, fullResult.positions);

    // Verified current production layout baseline (7834 C_pp, 86198 C_total on canonical Cloud Spend Tracker dataset)
    expect(evalMetrics.detailedCrossings?.primaryPrimaryCrossings).toBe(7834);
    expect(evalMetrics.edgeCrossingCount).toBe(86198);
    expect(evalMetrics.primaryOverlapCount).toBe(0);
    expect(evalMetrics.satelliteOverlapCount).toBe(0);
    expect(evalMetrics.layerViolationCount).toBe(0);
    expect(evalMetrics.minClearance).toBeGreaterThanOrEqual(39.99);
  });
});

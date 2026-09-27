import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type {
  ArchitectureGraphAnalysis,
  ArchitectureNodeAnalysis,
  ArchitectureLayer,
} from '../lib/layout/types';
import {
  computeArchitectureAnalysis,
  findParentProductionNodeId,
  findParentObjectId,
} from '../lib/layout/analysis';
import {
  isTriggerNode,
  isHandlerNode,
  SatelliteLayoutOptions,
  SatellitePlacementResult,
  placeSatellites,
} from '../lib/layout/satellites';
import {
  computeArchitectureLayoutWithMetadata,
} from '../lib/architecture-layout';
import { minimumNodeClearance } from '../lib/layout/metrics';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

interface Point {
  x: number;
  y: number;
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

// ============================================================================
// Types and Structures for Primary Segment Metadata Reuse Candidate
// ============================================================================

export interface PrimarySegmentMetadata {
  p1: Point;
  p2: Point;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PrimaryMetadataTelemetry {
  primarySegmentsCount: number;
  metadataBuildDurationMs: number;
  primaryIntersectionInvocations: number;
  primaryAabbRejected: number;
  primaryAabbPassed: number;
  satelliteIntersectionInvocations: number;
}

export const globalMetadataTelemetry: PrimaryMetadataTelemetry = {
  primarySegmentsCount: 0,
  metadataBuildDurationMs: 0,
  primaryIntersectionInvocations: 0,
  primaryAabbRejected: 0,
  primaryAabbPassed: 0,
  satelliteIntersectionInvocations: 0,
};

export function resetGlobalMetadataTelemetry() {
  globalMetadataTelemetry.primarySegmentsCount = 0;
  globalMetadataTelemetry.metadataBuildDurationMs = 0;
  globalMetadataTelemetry.primaryIntersectionInvocations = 0;
  globalMetadataTelemetry.primaryAabbRejected = 0;
  globalMetadataTelemetry.primaryAabbPassed = 0;
  globalMetadataTelemetry.satelliteIntersectionInvocations = 0;
}

/**
 * Standard Oracle segmentsIntersect implementation
 */
export function segmentsIntersectOracle(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
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

/**
 * Candidate Primary-Segment Intersection Evaluation reusing precomputed PrimarySegmentMetadata
 */
export function primarySegmentIntersectsCandidate(
  candMinX: number,
  candMaxX: number,
  candMinY: number,
  candMaxY: number,
  candP1: Point,
  candP2: Point,
  prim: PrimarySegmentMetadata,
  trackTelemetry: boolean = false
): boolean {
  if (trackTelemetry) {
    globalMetadataTelemetry.primaryIntersectionInvocations++;
  }

  // AABB disjoint rejection test reusing precomputed prim.minX/maxX/minY/maxY
  if (
    candMaxX < prim.minX ||
    candMinX > prim.maxX ||
    candMaxY < prim.minY ||
    candMinY > prim.maxY
  ) {
    if (trackTelemetry) {
      globalMetadataTelemetry.primaryAabbRejected++;
    }
    return false;
  }

  if (trackTelemetry) {
    globalMetadataTelemetry.primaryAabbPassed++;
  }

  // Shared endpoint exclusion
  const p1 = candP1;
  const p2 = candP2;
  const q1 = prim.p1;
  const q2 = prim.p2;

  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  // Straddle cross product check
  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}

function isSlotOccupied(
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
 * Candidate Implementation of placeSatellites with Immutable Primary Segment Metadata Reuse
 */
export function placeSatellitesPrimaryMetadataCandidate(
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

  // Build immutable primary segment metadata ONCE
  const tBuildStart = performance.now();
  const primarySegmentsMetadata: PrimarySegmentMetadata[] = [];
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) {
        primarySegmentsMetadata.push({
          p1,
          p2,
          minX: p1.x < p2.x ? p1.x : p2.x,
          maxX: p1.x > p2.x ? p1.x : p2.x,
          minY: p1.y < p2.y ? p1.y : p2.y,
          maxY: p1.y > p2.y ? p1.y : p2.y,
        });
      }
    }
  }
  const tBuildEnd = performance.now();
  if (trackTelemetry) {
    globalMetadataTelemetry.primarySegmentsCount = primarySegmentsMetadata.length;
    globalMetadataTelemetry.metadataBuildDurationMs = tBuildEnd - tBuildStart;
  }

  // Placed satellite segments (mutable as satellites are placed)
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

  function generateSlotsCandidate(
    anchor: Point,
    count: number,
    occupied: Point[],
    bias: 'field' | 'test' | 'neutral',
    targetVector?: Point,
    primMeta?: PrimarySegmentMetadata[],
    satSegs?: Array<{ p1: Point; p2: Point }>,
    incidentEndpoints?: Point[]
  ): Point[] {
    if (count <= 0) return [];

    const dx = nodeWidth + horizontalGap;
    const dy = nodeHeight + verticalGap;
    const effectiveMaxDist = Math.max(
      maxSatelliteDistance,
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

          // Compute candidate tether AABB scalar once per candidate tether
          const candMinX = ep.x < candPoint.x ? ep.x : candPoint.x;
          const candMaxX = ep.x > candPoint.x ? ep.x : candPoint.x;
          const candMinY = ep.y < candPoint.y ? ep.y : candPoint.y;
          const candMaxY = ep.y > candPoint.y ? ep.y : candPoint.y;

          if (primMeta && primMeta.length > 0) {
            for (let i = 0; i < primMeta.length; i++) {
              if (
                primarySegmentIntersectsCandidate(
                  candMinX,
                  candMaxX,
                  candMinY,
                  candMaxY,
                  ep,
                  candPoint,
                  primMeta[i],
                  trackTelemetry
                )
              ) {
                primaryCrossings++;
              }
            }
          }

          if (satSegs && satSegs.length > 0) {
            for (let i = 0; i < satSegs.length; i++) {
              if (trackTelemetry) globalMetadataTelemetry.satelliteIntersectionInvocations++;
              if (segmentsIntersectOracle(ep, candPoint, satSegs[i].p1, satSegs[i].p2)) {
                satelliteCrossings++;
              }
            }
          }
        }

        const crossingPenalty = primaryCrossings * 2000.0 + satelliteCrossings * 800.0;
        const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
        const effectiveScore = dist * directionalScore + aspectPenalty + vectorPenalty + crossingPenalty + tetherPenalty;

        candidateSlots.push({ x, y, dist, effectiveScore, row: r, col: c });
      }
    }

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

    const selectedSlots = candidateSlots.slice(0, count).map(s => ({ x: s.x, y: s.y }));

    if (selectedSlots.length < count) {
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

    return selectedSlots;
  }

  function evaluateCrossingsCandidate(
    edgs: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>
  ): number {
    interface EdgeSeg {
      p1: Point;
      p2: Point;
      s: string;
      t: string;
    }
    const segs: EdgeSeg[] = [];
    for (let i = 0; i < edgs.length; i++) {
      const e = edgs[i];
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
        if (segmentsIntersectOracle(s1.p1, s1.p2, s2.p1, s2.p2)) count++;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // STAGE 1: TRIGGER / HANDLER
  // --------------------------------------------------------------------------
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
      const slots = generateSlotsCandidate(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        'neutral'
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
          const handlerSlots = generateSlotsCandidate(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            'neutral'
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
      const slots = generateSlotsCandidate(
        { x: hX, y: hY },
        1,
        occupiedList,
        'neutral'
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

  // --------------------------------------------------------------------------
  // STAGE 2: FIELDS
  // --------------------------------------------------------------------------
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

    const slots = generateSlotsCandidate(
      parentPos,
      fields.length,
      occupiedList,
      'field',
      targetVector,
      primarySegmentsMetadata,
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
    const fallbackSlots = generateSlotsCandidate(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      'field'
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

  // --------------------------------------------------------------------------
  // STAGE 3: TESTS
  // --------------------------------------------------------------------------
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

    const slots = generateSlotsCandidate(
      targetPos,
      tests.length,
      occupiedList,
      'test',
      targetVector,
      primarySegmentsMetadata,
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
    const fallbackSlots = generateSlotsCandidate(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      'test'
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

  // --------------------------------------------------------------------------
  // STAGE 4: PERMUTATIONS
  // --------------------------------------------------------------------------
  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    let currentBestCrossings = evaluateCrossingsCandidate(safeEdges, positions);

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateCrossingsCandidate(safeEdges, candidatePositions);
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

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Stage 9 Primary Segment Metadata Reuse A/B Experiment', () => {

  it('1. Direct Geometry Differential Tests (12 Required Edge Cases)', () => {
    const testCases: Array<{
      name: string;
      p1: Point;
      p2: Point;
      q1: Point;
      q2: Point;
    }> = [
      {
        name: '1. clearly disjoint horizontal segments',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 },
        q1: { x: 20, y: 0 }, q2: { x: 30, y: 0 },
      },
      {
        name: '2. clearly disjoint vertical segments',
        p1: { x: 0, y: 0 }, p2: { x: 0, y: 10 },
        q1: { x: 0, y: 20 }, q2: { x: 0, y: 30 },
      },
      {
        name: '3. diagonal disjoint segments',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 20, y: 20 }, q2: { x: 30, y: 30 },
      },
      {
        name: '4. true crossing',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 0, y: 10 }, q2: { x: 10, y: 0 },
      },
      {
        name: '5. endpoint touching',
        p1: { x: 0, y: 5 }, p2: { x: 10, y: 5 },
        q1: { x: 5, y: 5 }, q2: { x: 5, y: 15 },
      },
      {
        name: '6. shared endpoint',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 10, y: 10 }, q2: { x: 20, y: 0 },
      },
      {
        name: '7. collinear non-overlap',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 15, y: 15 }, q2: { x: 25, y: 25 },
      },
      {
        name: '8. collinear overlap',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 5, y: 5 }, q2: { x: 15, y: 15 },
      },
      {
        name: '9. near-boundary intersection',
        p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 },
        q1: { x: 0.01, y: 10 }, q2: { x: 10.01, y: 0 },
      },
      {
        name: '10. EPS-sensitive geometry',
        p1: { x: 0, y: 0 }, p2: { x: 100000, y: 100000 },
        q1: { x: 0, y: 100000 }, q2: { x: 100000.0000000001, y: 0 },
      },
      {
        name: '11. reversed segment direction',
        p1: { x: 10, y: 10 }, p2: { x: 0, y: 0 },
        q1: { x: 10, y: 0 }, q2: { x: 0, y: 10 },
      },
      {
        name: '12. zero-length segment',
        p1: { x: 5, y: 5 }, p2: { x: 5, y: 5 },
        q1: { x: 0, y: 0 }, q2: { x: 10, y: 10 },
      },
    ];

    console.log('\n--- DIRECT PRIMARY GEOMETRY DIFFERENTIAL TESTS (12/12) ---');
    testCases.forEach((tc) => {
      const oracleRes = segmentsIntersectOracle(tc.p1, tc.p2, tc.q1, tc.q2);

      const candMinX = tc.p1.x < tc.p2.x ? tc.p1.x : tc.p2.x;
      const candMaxX = tc.p1.x > tc.p2.x ? tc.p1.x : tc.p2.x;
      const candMinY = tc.p1.y < tc.p2.y ? tc.p1.y : tc.p2.y;
      const candMaxY = tc.p1.y > tc.p2.y ? tc.p1.y : tc.p2.y;

      const primMeta: PrimarySegmentMetadata = {
        p1: tc.q1,
        p2: tc.q2,
        minX: tc.q1.x < tc.q2.x ? tc.q1.x : tc.q2.x,
        maxX: tc.q1.x > tc.q2.x ? tc.q1.x : tc.q2.x,
        minY: tc.q1.y < tc.q2.y ? tc.q1.y : tc.q2.y,
        maxY: tc.q1.y > tc.q2.y ? tc.q1.y : tc.q2.y,
      };

      const candRes = primarySegmentIntersectsCandidate(
        candMinX,
        candMaxX,
        candMinY,
        candMaxY,
        tc.p1,
        tc.p2,
        primMeta,
        false
      );

      console.log(
        `${tc.name.padEnd(55)} | Oracle = ${String(oracleRes).padEnd(5)} | Candidate = ${String(candRes).padEnd(5)} | Match = ${oracleRes === candRes}`
      );

      expect(candRes).toBe(oracleRes);
    });
  });

  it('2. Stage 9 Differential Results & Telemetry on Canonical Dataset', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
    );
    const rawData = fs.readFileSync(fixturePath, 'utf-8');
    const dataset = JSON.parse(rawData);

    const analysis = computeArchitectureAnalysis(dataset.nodes, dataset.edges);
    const layout = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    dataset.nodes.forEach((n: ExplorerNode) => {
      const isSat = n.behavior?.isTest ||
                    n.type === 'Field' ||
                    n.type === 'ApexTrigger' ||
                    /(?:trigger|triggers|handler|handlers)$/i.test(n.displayName || n.id);
      if (!isSat && layout.positions[n.id]) {
        primaryPositions[n.id] = layout.positions[n.id];
      }
    });

    // Run Oracle
    const oracleResult = placeSatellites(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true }
    );

    // Run Candidate
    resetGlobalMetadataTelemetry();
    const candidateResult = placeSatellitesPrimaryMetadataCandidate(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true },
      true
    );

    // Differential asserts
    expect(candidateResult.placedTestsCount).toBe(oracleResult.placedTestsCount);
    expect(candidateResult.placedFieldsCount).toBe(oracleResult.placedFieldsCount);
    expect(candidateResult.placedMicroclusterCount).toBe(oracleResult.placedMicroclusterCount);

    let maxDrift = 0;
    Object.keys(oracleResult.positions).forEach((nodeId) => {
      const posO = oracleResult.positions[nodeId];
      const posC = candidateResult.positions[nodeId];
      expect(posC).toBeDefined();
      const drift = Math.sqrt(Math.pow(posO.x - posC.x, 2) + Math.pow(posO.y - posC.y, 2));
      if (drift > maxDrift) maxDrift = drift;
    });

    console.log('\n--- CANONICAL DATASET DIFFERENTIAL RESULTS ---');
    console.log(`Max Coordinate Drift      : ${maxDrift.toFixed(5)} px`);
    console.log(`Placed Tests Match        : ${candidateResult.placedTestsCount} vs ${oracleResult.placedTestsCount}`);
    console.log(`Placed Fields Match       : ${candidateResult.placedFieldsCount} vs ${oracleResult.placedFieldsCount}`);

    expect(maxDrift).toBe(0);

    const tel = globalMetadataTelemetry;
    const rejPct = (tel.primaryAabbRejected / tel.primaryIntersectionInvocations) * 100;

    console.log('\n--- PRIMARY METADATA TELEMETRY ---');
    console.log(`Primary Segments Count         : ${tel.primarySegmentsCount}`);
    console.log(`Metadata Build Duration        : ${tel.metadataBuildDurationMs.toFixed(3)} ms`);
    console.log(`Primary Intersection Calls     : ${tel.primaryIntersectionInvocations.toLocaleString()}`);
    console.log(`Primary AABB Rejected          : ${tel.primaryAabbRejected.toLocaleString()}`);
    console.log(`Primary AABB Passed            : ${tel.primaryAabbPassed.toLocaleString()}`);
    console.log(`Primary AABB Rejection %       : ${rejPct.toFixed(2)}%`);
    console.log(`Satellite Intersection Calls   : ${tel.satelliteIntersectionInvocations.toLocaleString()}`);
  });

  it('3. Multi-Tier Timing Benchmarks (Tiers 1 to 5)', () => {
    const scaleTiers = [
      { tier: 'Tier 1 (CST)', nodes: 240, edges: 1024, isCst: true },
      { tier: 'Tier 2', nodes: 500, edges: 1019, isCst: false },
      { tier: 'Tier 3', nodes: 1000, edges: 1990, isCst: false },
      { tier: 'Tier 4', nodes: 2000, edges: 3952, isCst: false },
      { tier: 'Tier 5', nodes: 5000, edges: 10024, isCst: false },
    ];

    console.log('\n--- MULTI-TIER PRIMARY METADATA A/B TIMING BENCHMARKS ---');
    console.log('Tier        | Nodes | Oracle ms | Candidate ms | Delta (ms) | Ratio | Meta Build ms | Prim Rej %');
    console.log('--------------------------------------------------------------------------------------------------');

    scaleTiers.forEach((t) => {
      let nodes: ExplorerNode[];
      let edges: ExplorerEdge[];
      let primaryPositions: Record<string, { x: number; y: number }> = {};

      if (t.isCst) {
        const fixturePath = path.resolve(
          __dirname,
          '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
        );
        const dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
        nodes = dataset.nodes;
        edges = dataset.edges;
        const layout = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
        nodes.forEach((n: ExplorerNode) => {
          const isSat = n.behavior?.isTest ||
                        n.type === 'Field' ||
                        n.type === 'ApexTrigger' ||
                        /(?:trigger|triggers|handler|handlers)$/i.test(n.displayName || n.id);
          if (!isSat && layout.positions[n.id]) {
            primaryPositions[n.id] = layout.positions[n.id];
          }
        });
      } else {
        const graph = generateSyntheticSalesforceGraph({ nodeCount: t.nodes, seed: 42 });
        nodes = graph.nodes;
        edges = graph.edges;
        let pIdx = 0;
        nodes.forEach(n => {
          const isSat = n.behavior?.isTest ||
                        n.type === 'Field' ||
                        n.type === 'ApexTrigger' ||
                        /(?:trigger|triggers|handler|handlers)$/i.test(n.displayName || n.id);
          if (!isSat) {
            primaryPositions[n.id] = {
              x: (pIdx % 30) * 200,
              y: Math.floor(pIdx / 30) * 150 + 200,
            };
            pIdx++;
          }
        });
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const warmRuns = t.nodes >= 5000 ? 1 : 3;

      // Oracle Benchmark
      let oracleTimes: number[] = [];
      for (let i = 0; i < warmRuns; i++) {
        const start = performance.now();
        placeSatellites(nodes, edges, analysis, primaryPositions, { enableFeatureLayout: true });
        const end = performance.now();
        oracleTimes.push(end - start);
      }
      oracleTimes.sort((a, b) => a - b);
      const oracleMedian = oracleTimes[Math.floor(oracleTimes.length / 2)];

      // Candidate Benchmark
      resetGlobalMetadataTelemetry();
      let candidateTimes: number[] = [];
      for (let i = 0; i < warmRuns; i++) {
        resetGlobalMetadataTelemetry();
        const start = performance.now();
        placeSatellitesPrimaryMetadataCandidate(nodes, edges, analysis, primaryPositions, { enableFeatureLayout: true }, true);
        const end = performance.now();
        candidateTimes.push(end - start);
      }
      candidateTimes.sort((a, b) => a - b);
      const candidateMedian = candidateTimes[Math.floor(candidateTimes.length / 2)];

      const delta = candidateMedian - oracleMedian;
      const ratio = oracleMedian / candidateMedian;
      const tel = globalMetadataTelemetry;
      const rejPct = tel.primaryIntersectionInvocations > 0 ? (tel.primaryAabbRejected / tel.primaryIntersectionInvocations) * 100 : 0;

      console.log(
        `${t.tier.padEnd(11)} | ${String(t.nodes).padStart(5)} | ${oracleMedian.toFixed(2).padStart(9)} | ${candidateMedian.toFixed(2).padStart(12)} | ${(delta > 0 ? '+' : '') + delta.toFixed(2).padStart(9)} | ${(ratio.toFixed(2) + 'x').padStart(5)} | ${tel.metadataBuildDurationMs.toFixed(3).padStart(13)} | ${rejPct.toFixed(2)}%`
      );
    });
  }, 300000);

  it('4. Production Regression Gates Validation on Canonical Dataset', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
    );
    const dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const analysis = computeArchitectureAnalysis(dataset.nodes, dataset.edges);

    const layout = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    dataset.nodes.forEach((n: ExplorerNode) => {
      const isSat = n.behavior?.isTest ||
                    n.type === 'Field' ||
                    n.type === 'ApexTrigger' ||
                    /(?:trigger|triggers|handler|handlers)$/i.test(n.displayName || n.id);
      if (!isSat && layout.positions[n.id]) {
        primaryPositions[n.id] = layout.positions[n.id];
      }
    });

    const satResultCandidate = placeSatellitesPrimaryMetadataCandidate(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true },
      false
    );

    const clearance = minimumNodeClearance(dataset.nodes, dataset.edges, satResultCandidate.positions, { nodeWidth: 120, nodeHeight: 60 });

    console.log('\n--- PRODUCTION REGRESSION GATES ---');
    console.log(`Minimum Physical Clearance : ${clearance.toFixed(2)} px`);

    expect(clearance).toBeGreaterThanOrEqual(40.0 - 1e-3);
  });
});

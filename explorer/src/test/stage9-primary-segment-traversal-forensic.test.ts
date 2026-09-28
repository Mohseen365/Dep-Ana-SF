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

export interface GroupTraversalMetrics {
  groupIndex: number;
  anchor: Point;
  bias: 'field' | 'test' | 'neutral';
  candidateCount: number;
  primarySegmentCount: number;
  totalPairExaminations: number;
  aabbDisjointPairs: number;
  aabbOverlappingPairs: number;
  actualIntersections: number;
  sharedEndpointPairs: number;
}

export interface PrimarySegmentTraversalMetrics {
  totalExaminations: number;
  aabbDisjointPairs: number;
  aabbOverlappingPairs: number;
  actualIntersections: number;
  sharedEndpointPairs: number;

  groups: GroupTraversalMetrics[];

  primarySegmentExaminationsMap: Map<string, number>;
  candidateGeometryEvaluationsMap: Map<string, number>;
}

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

function generateSatelliteSlotsTraversalMeasured(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  metrics: PrimarySegmentTraversalMetrics,
  groupIndex: number,
  targetVector?: Point,
  primarySegments?: Array<Segment>,
  placedSatelliteSegments?: Array<Segment>,
  incidentEndpoints?: Point[]
): Point[] {
  if (count <= 0) return [];

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

  const primSegCount = primarySegments ? primarySegments.length : 0;
  const groupMetrics: GroupTraversalMetrics = {
    groupIndex,
    anchor,
    bias,
    candidateCount: 0,
    primarySegmentCount: primSegCount,
    totalPairExaminations: 0,
    aabbDisjointPairs: 0,
    aabbOverlappingPairs: 0,
    actualIntersections: 0,
    sharedEndpointPairs: 0,
  };

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      if (c === 0 && r === 0) continue;
      if (bias === 'test' && c === 0) continue;

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      if (isSlotOccupiedMeasured(x, y, occupied, dx, dy)) {
        continue;
      }

      groupMetrics.candidateCount++;

      const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

      let directionalScore = 1.0;
      if (bias === 'test' && c < 0) directionalScore = 1.2;

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

      let primaryCrossings = 0;
      let satelliteCrossings = 0;
      const candPoint = { x, y };
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];

        // Tether geometry key
        const tetherKey = `${ep.x},${ep.y}->${candPoint.x},${candPoint.y}`;
        const prevTetherCount = metrics.candidateGeometryEvaluationsMap.get(tetherKey) || 0;
        metrics.candidateGeometryEvaluationsMap.set(tetherKey, prevTetherCount + 1);

        const candMinX = Math.min(ep.x, candPoint.x);
        const candMaxX = Math.max(ep.x, candPoint.x);
        const candMinY = Math.min(ep.y, candPoint.y);
        const candMaxY = Math.max(ep.y, candPoint.y);

        if (primarySegments && primarySegments.length > 0) {
          for (let i = 0; i < primarySegments.length; i++) {
            const pSeg = primarySegments[i];

            // Primary segment key
            const segKey = `${pSeg.p1.x},${pSeg.p1.y}->${pSeg.p2.x},${pSeg.p2.y}`;
            const prevSegCount = metrics.primarySegmentExaminationsMap.get(segKey) || 0;
            metrics.primarySegmentExaminationsMap.set(segKey, prevSegCount + 1);

            metrics.totalExaminations++;
            groupMetrics.totalPairExaminations++;

            const segMinX = Math.min(pSeg.p1.x, pSeg.p2.x);
            const segMaxX = Math.max(pSeg.p1.x, pSeg.p2.x);
            const segMinY = Math.min(pSeg.p1.y, pSeg.p2.y);
            const segMaxY = Math.max(pSeg.p1.y, pSeg.p2.y);

            const isDisjoint =
              candMaxX < segMinX ||
              candMinX > segMaxX ||
              candMaxY < segMinY ||
              candMinY > segMaxY;

            if (isDisjoint) {
              metrics.aabbDisjointPairs++;
              groupMetrics.aabbDisjointPairs++;
            } else {
              metrics.aabbOverlappingPairs++;
              groupMetrics.aabbOverlappingPairs++;

              // Check shared endpoints
              const isShared =
                (ep.x === pSeg.p1.x && ep.y === pSeg.p1.y) ||
                (ep.x === pSeg.p2.x && ep.y === pSeg.p2.y) ||
                (candPoint.x === pSeg.p1.x && candPoint.y === pSeg.p1.y) ||
                (candPoint.x === pSeg.p2.x && candPoint.y === pSeg.p2.y);

              if (isShared) {
                metrics.sharedEndpointPairs++;
                groupMetrics.sharedEndpointPairs++;
              }
            }

            const isIntersect = segmentsIntersectMeasured(ep, candPoint, pSeg.p1, pSeg.p2);
            if (isIntersect) {
              primaryCrossings++;
              metrics.actualIntersections++;
              groupMetrics.actualIntersections++;
            }
          }
        }

        if (placedSatelliteSegments && placedSatelliteSegments.length > 0) {
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            if (segmentsIntersectMeasured(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
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

  metrics.groups.push(groupMetrics);

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
        if (!isSlotOccupiedMeasured(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }
  }

  return selectedSlots;
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

export function placeSatellitesTraversalMeasured(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {}
): { result: SatellitePlacementResult; metrics: PrimarySegmentTraversalMetrics } {
  const metrics: PrimarySegmentTraversalMetrics = {
    totalExaminations: 0,
    aabbDisjointPairs: 0,
    aabbOverlappingPairs: 0,
    actualIntersections: 0,
    sharedEndpointPairs: 0,
    groups: [],
    primarySegmentExaminationsMap: new Map(),
    candidateGeometryEvaluationsMap: new Map(),
  };

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

  let groupCounter = 0;

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

    if (isSlotOccupiedMeasured(trigX, trigY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsTraversalMeasured(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        metrics,
        groupCounter++
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

        if (isSlotOccupiedMeasured(handlerX, handlerY, occupiedList, minDx, minDy)) {
          const handlerSlots = generateSatelliteSlotsTraversalMeasured(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            maxSatelliteDistance,
            'neutral',
            metrics,
            groupCounter++
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

    if (isSlotOccupiedMeasured(hX, hY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsTraversalMeasured(
        { x: hX, y: hY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        metrics,
        groupCounter++
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

    const slots = generateSatelliteSlotsTraversalMeasured(
      parentPos,
      fields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      metrics,
      groupCounter++,
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
    const fallbackSlots = generateSatelliteSlotsTraversalMeasured(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      metrics,
      groupCounter++
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

    const slots = generateSatelliteSlotsTraversalMeasured(
      targetPos,
      tests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      metrics,
      groupCounter++,
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
    const fallbackSlots = generateSatelliteSlotsTraversalMeasured(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      metrics,
      groupCounter++
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

  return {
    result: {
      positions,
      satellitePositions,
      placedTestsCount,
      placedFieldsCount,
      placedMicroclusterCount,
    },
    metrics,
  };
}

export function computeQuantiles(values: number[], quantiles: number[]) {
  if (values.length === 0) return quantiles.map(() => 0);
  const sorted = [...values].sort((a, b) => a - b);
  return quantiles.map(q => {
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    return sorted[idx];
  });
}

// --------------------------------------------------------------------------
// TEST SUITE
// --------------------------------------------------------------------------

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const dataset = (JSON.parse(rawData).data ? JSON.parse(rawData).data : JSON.parse(rawData)) as ExplorerDataSchema;

describe('Stage 9 Primary Segment Traversal Necessity Forensic Suite', () => {
  it('1. Verify Bit-for-Bit Equivalence & 0.00000 px Drift against Production placeSatellites', () => {
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
    const travWrapper = placeSatellitesTraversalMeasured(nodes, edges, analysis, primaryPositions, { featureMap });

    expect(Object.keys(travWrapper.result.positions).length).toBe(Object.keys(prodResult.positions).length);
    expect(Object.keys(travWrapper.result.satellitePositions).length).toBe(Object.keys(prodResult.satellitePositions).length);

    let maxDrift = 0;
    for (const key of Object.keys(prodResult.positions)) {
      const p1 = prodResult.positions[key];
      const p2 = travWrapper.result.positions[key];
      expect(p2).toBeDefined();
      const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (drift > maxDrift) maxDrift = drift;
    }

    console.log(`[EQUIVALENCE CHECK] Max Coordinate Drift: ${maxDrift.toFixed(5)} px`);
    expect(maxDrift).toBe(0);
  });

  it('2. Canonical Benchmark Fixture Traversal Forensics', { timeout: 120000 }, () => {
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

    const travWrapper = placeSatellitesTraversalMeasured(nodes, edges, analysis, primaryPositions, { featureMap });
    const m = travWrapper.metrics;

    const total = m.totalExaminations;
    const disjointPct = ((m.aabbDisjointPairs / total) * 100).toFixed(2);
    const overlapPct = ((m.aabbOverlappingPairs / total) * 100).toFixed(2);
    const actualPct = ((m.actualIntersections / total) * 100).toFixed(2);
    const sharedPct = ((m.sharedEndpointPairs / total) * 100).toFixed(2);

    console.log('\n========================================================================');
    console.log('      STAGE 9 PRIMARY SEGMENT TRAVERSAL NECESSITY FORENSIC RESULTS');
    console.log('========================================================================\n');
    console.log(`Total Primary-Segment Examinations : ${total.toLocaleString()}`);
    console.log(`AABB-Disjoint Pairs               : ${m.aabbDisjointPairs.toLocaleString()} (${disjointPct}%)`);
    console.log(`AABB-Overlapping Pairs            : ${m.aabbOverlappingPairs.toLocaleString()} (${overlapPct}%)`);
    console.log(`Actual Intersections              : ${m.actualIntersections.toLocaleString()} (${actualPct}%)`);
    console.log(`Shared Endpoint Pairs             : ${m.sharedEndpointPairs.toLocaleString()} (${sharedPct}%)\n`);

    // Primary segment reuse stats
    const segCounts = Array.from(m.primarySegmentExaminationsMap.values());
    const [segMin, segMed, segP95, segMax] = computeQuantiles(segCounts, [0, 0.5, 0.95, 1]);
    const uniqueSegs = segCounts.length;
    const avgSegExam = total / uniqueSegs;

    console.log('Primary Segment Reuse Analysis:');
    console.log(`  Unique Primary Segments          : ${uniqueSegs.toLocaleString()}`);
    console.log(`  Total Examinations               : ${total.toLocaleString()}`);
    console.log(`  Avg Examinations per Segment     : ${avgSegExam.toFixed(1)}`);
    console.log(`  Min Examinations                 : ${segMin}`);
    console.log(`  Median Examinations              : ${segMed}`);
    console.log(`  P95 Examinations                 : ${segP95}`);
    console.log(`  Max Examinations                 : ${segMax}\n`);

    // Candidate geometry reuse stats
    const candCounts = Array.from(m.candidateGeometryEvaluationsMap.values());
    const uniqueCands = candCounts.length;
    const totalCandEvals = candCounts.reduce((sum, v) => sum + v, 0);
    const avgCandEval = totalCandEvals / uniqueCands;

    console.log('Candidate Geometry Reuse Analysis:');
    console.log(`  Unique Candidate Geometries      : ${uniqueCands.toLocaleString()}`);
    console.log(`  Total Candidate Evaluations      : ${totalCandEvals.toLocaleString()}`);
    console.log(`  Avg Evaluations per Geometry     : ${avgCandEval.toFixed(2)}\n`);

    console.log('Group Distribution Summary (34 Groups Total):');
    m.groups.forEach(g => {
      const gTot = g.totalPairExaminations;
      const gDisjPct = gTot > 0 ? ((g.aabbDisjointPairs / gTot) * 100).toFixed(1) : '0.0';
      console.log(`  Group ${String(g.groupIndex).padStart(2)} (${g.bias.padStart(7)}): Candidates=${String(g.candidateCount).padStart(5)}, Segments=${String(g.primarySegmentCount).padStart(3)}, TotalPairs=${String(gTot).padStart(8)}, Disjoint=${String(g.aabbDisjointPairs).padStart(8)} (${gDisjPct.padStart(5)}%), Intersects=${g.actualIntersections}`);
    });

    expect(total).toBeGreaterThan(0);
    expect(m.aabbDisjointPairs).toBeGreaterThan(0);
  });

  it('3. Multi-Tier Scale Traversal Forensics (Tiers 1-4)', { timeout: 120000 }, () => {
    const scaleTiers = [
      { tier: 'Tier 1 (240N)', nodeCount: 240 },
      { tier: 'Tier 2 (500N)', nodeCount: 500 },
      { tier: 'Tier 3 (1000N)', nodeCount: 1000 },
      { tier: 'Tier 4 (2000N)', nodeCount: 2000 },
    ];

    console.log('\n========================================================================');
    console.log('            STAGE 9 TRAVERSAL NECESSITY MULTI-TIER SCALE ANALYSIS');
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

      const travWrapper = placeSatellitesTraversalMeasured(nodes, edges, analysis, primaryPositions, { featureMap });
      const m = travWrapper.metrics;

      const total = m.totalExaminations;
      const disjointPct = total > 0 ? ((m.aabbDisjointPairs / total) * 100).toFixed(2) : '0.00';
      const overlapPct = total > 0 ? ((m.aabbOverlappingPairs / total) * 100).toFixed(2) : '0.00';
      const actualPct = total > 0 ? ((m.actualIntersections / total) * 100).toFixed(2) : '0.00';

      console.log(`--- ${t.tier} (${nodes.length} Nodes, ${edges.length} Edges) ---`);
      console.log(`  Total Examinations  : ${total.toLocaleString()}`);
      console.log(`  AABB-Disjoint       : ${m.aabbDisjointPairs.toLocaleString()} (${disjointPct}%)`);
      console.log(`  AABB-Overlapping    : ${m.aabbOverlappingPairs.toLocaleString()} (${overlapPct}%)`);
      console.log(`  Actual Intersections: ${m.actualIntersections.toLocaleString()} (${actualPct}%)\n`);

      expect(total).toBeGreaterThan(0);
    }
  });
});

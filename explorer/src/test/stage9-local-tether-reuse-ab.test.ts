import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureGraphAnalysis, ArchitectureNodeAnalysis, ArchitectureLayer } from '../lib/layout/types';
import { computeArchitectureAnalysis, findParentObjectId, findParentProductionNodeId } from '../lib/layout/analysis';
import { isTriggerNode, isHandlerNode, SatelliteLayoutOptions, SatellitePlacementResult } from '../lib/layout/satellites';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { calculateDetailedEdgeCrossings } from '../lib/layout/metrics';
import { minimumNodeClearance } from '../lib/layout/metrics';

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

function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
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

function evaluateTotalCrossings(
  edgesList: ExplorerEdge[],
  posMap: Record<string, { x: number; y: number }>
): number {
  interface EdgeSeg {
    p1: Point;
    p2: Point;
    s: string;
    t: string;
  }
  const segs: EdgeSeg[] = [];
  for (let i = 0; i < edgesList.length; i++) {
    const e = edgesList[i];
    const p1 = posMap[e.source];
    const p2 = posMap[e.target];
    if (p1 && p2) {
      segs.push({ p1, p2, s: e.source, t: e.target });
    }
  }

  let count = 0;
  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        count++;
      }
    }
  }
  return count;
}

// Telemetry counters
export interface ExperimentTelemetry {
  primaryIntersectionCalls: number;
  candScoringTimeMs: number;
  stage9TotalTimeMs: number;
}

// ============================================================================
// ORACLE & CANDIDATE IMPLEMENTATIONS
// ============================================================================

function runPlaceSatellitesRunner(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {},
  isCandidateMode: boolean,
  telemetry: ExperimentTelemetry
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

  function generateSlots(
    anchor: Point,
    count: number,
    occupied: Point[],
    bias: 'field' | 'test' | 'neutral',
    targetVector?: Point,
    primSegs?: Array<{ p1: Point; p2: Point }>,
    satSegs?: Array<{ p1: Point; p2: Point }>,
    incidentEndpoints?: Point[]
  ): Point[] {
    const startScoring = performance.now();
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

        if (!isCandidateMode) {
          // ORACLE
          for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
            const ep = endpointsToTest[epIdx];

            if (primSegs && primSegs.length > 0) {
              for (let i = 0; i < primSegs.length; i++) {
                telemetry.primaryIntersectionCalls++;
                if (segmentsIntersect(ep, candPoint, primSegs[i].p1, primSegs[i].p2)) {
                  primaryCrossings++;
                }
              }
            }

            if (satSegs && satSegs.length > 0) {
              for (let i = 0; i < satSegs.length; i++) {
                if (segmentsIntersect(ep, candPoint, satSegs[i].p1, satSegs[i].p2)) {
                  satelliteCrossings++;
                }
              }
            }
          }
        } else {
          // CANDIDATE: Tightly isolated local candidate tether crossing result reuse
          // Within one candidate slot, if two incident endpoints in endpointsToTest have identical coordinates
          // (or if anchor is repeated), compute primary segment crossing result once for that tether geometry.
          let prevEpX = NaN;
          let prevEpY = NaN;
          let prevEpPrimaryCrossings = 0;

          for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
            const ep = endpointsToTest[epIdx];

            if (epIdx > 0 && ep.x === prevEpX && ep.y === prevEpY) {
              // REUSE local primary crossing count for identical tether geometry
              primaryCrossings += prevEpPrimaryCrossings;
            } else {
              let localEpPrimaryCrossings = 0;
              if (primSegs && primSegs.length > 0) {
                for (let i = 0; i < primSegs.length; i++) {
                  telemetry.primaryIntersectionCalls++;
                  if (segmentsIntersect(ep, candPoint, primSegs[i].p1, primSegs[i].p2)) {
                    localEpPrimaryCrossings++;
                  }
                }
              }
              primaryCrossings += localEpPrimaryCrossings;
              prevEpX = ep.x;
              prevEpY = ep.y;
              prevEpPrimaryCrossings = localEpPrimaryCrossings;
            }

            if (satSegs && satSegs.length > 0) {
              for (let i = 0; i < satSegs.length; i++) {
                if (segmentsIntersect(ep, candPoint, satSegs[i].p1, satSegs[i].p2)) {
                  satelliteCrossings++;
                }
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

    telemetry.candScoringTimeMs += (performance.now() - startScoring);
    return selectedSlots;
  }

  const startStage9 = performance.now();

  // STAGE 1: TRIGGER / HANDLER
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
      const slots = generateSlots(
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
          const handlerSlots = generateSlots(
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
      const slots = generateSlots(
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

    const slots = generateSlots(
      parentPos,
      fields.length,
      occupiedList,
      'field',
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
    const fallbackSlots = generateSlots(
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

    const slots = generateSlots(
      targetPos,
      tests.length,
      occupiedList,
      'test',
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
    const fallbackSlots = generateSlots(
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

  // STAGE 4: Slot Permutation Refinement
  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    // Stage 4 crossing evaluation using evaluateTotalCrossings
    let currentBestCrossings = evaluateTotalCrossings(safeEdges, positions);

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateTotalCrossings(safeEdges, candidatePositions);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
          satellitePositions[id] = candidatePositions[id];
        });
      }
    }
  });

  telemetry.stage9TotalTimeMs = performance.now() - startStage9;

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}

describe('Stage 9 Local Candidate-Tether Crossing Reuse A/B Experiment Suite', () => {
  it('1. Execute Differential A/B Experiment on Canonical Cloud Spend Tracker Dataset', { timeout: 120000 }, () => {
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

    // Benchmark Oracle (Warm median of 5 runs)
    const oracleTelemetryList: ExperimentTelemetry[] = [];
    let oracleResult: SatellitePlacementResult | null = null;

    for (let i = 0; i < 5; i++) {
      const tel: ExperimentTelemetry = { primaryIntersectionCalls: 0, candScoringTimeMs: 0, stage9TotalTimeMs: 0 };
      const res = runPlaceSatellitesRunner(dataset.nodes, dataset.edges, analysis, primaryPositions, { enableFeatureLayout: true }, false, tel);
      oracleTelemetryList.push(tel);
      if (i === 0) oracleResult = res;
    }

    // Benchmark Candidate (Warm median of 5 runs)
    const candTelemetryList: ExperimentTelemetry[] = [];
    let candResult: SatellitePlacementResult | null = null;

    for (let i = 0; i < 5; i++) {
      const tel: ExperimentTelemetry = { primaryIntersectionCalls: 0, candScoringTimeMs: 0, stage9TotalTimeMs: 0 };
      const res = runPlaceSatellitesRunner(dataset.nodes, dataset.edges, analysis, primaryPositions, { enableFeatureLayout: true }, true, tel);
      candTelemetryList.push(tel);
      if (i === 0) candResult = res;
    }

    oracleTelemetryList.sort((a, b) => a.stage9TotalTimeMs - b.stage9TotalTimeMs);
    candTelemetryList.sort((a, b) => a.stage9TotalTimeMs - b.stage9TotalTimeMs);

    const oracleMedianTel = oracleTelemetryList[2];
    const candMedianTel = candTelemetryList[2];

    // Evaluate differential geometry
    let maxDrift = 0;
    Object.keys(oracleResult!.positions).forEach((nodeId) => {
      const posO = oracleResult!.positions[nodeId];
      const posC = candResult!.positions[nodeId];
      expect(posC).toBeDefined();
      const drift = Math.sqrt(Math.pow(posO.x - posC.x, 2) + Math.pow(posO.y - posC.y, 2));
      if (drift > maxDrift) maxDrift = drift;
    });

    // Evaluate full layout crossings using calculateDetailedEdgeCrossings
    const detailedCrossingsOracle = calculateDetailedEdgeCrossings(dataset.nodes, dataset.edges, oracleResult!.positions);
    const detailedCrossingsCand = calculateDetailedEdgeCrossings(dataset.nodes, dataset.edges, candResult!.positions);
    const clearanceCand = minimumNodeClearance(dataset.nodes, dataset.edges, candResult!.positions, { nodeWidth: 120, nodeHeight: 60 });

    const callsOracle = oracleMedianTel.primaryIntersectionCalls;
    const callsCand = candMedianTel.primaryIntersectionCalls;
    const callsAvoided = callsOracle - callsCand;
    const avoidancePct = (callsAvoided / callsOracle) * 100;

    console.log('\n================================================================');
    console.log('STAGE 9 LOCAL CANDIDATE TETHER CROSSING REUSE A/B RESULTS');
    console.log('================================================================');
    console.log(`Oracle Primary Intersection Calls   : ${callsOracle.toLocaleString()}`);
    console.log(`Candidate Primary Intersection Calls: ${callsCand.toLocaleString()}`);
    console.log(`Intersection Calls Avoided          : ${callsAvoided.toLocaleString()} (${avoidancePct.toFixed(2)}%)`);
    console.log('----------------------------------------------------------------');
    console.log(`Candidate Scoring Time (Oracle)     : ${oracleMedianTel.candScoringTimeMs.toFixed(2)} ms`);
    console.log(`Candidate Scoring Time (Candidate)  : ${candMedianTel.candScoringTimeMs.toFixed(2)} ms`);
    console.log(`Stage 9 Total Time (Oracle)         : ${oracleMedianTel.stage9TotalTimeMs.toFixed(2)} ms`);
    console.log(`Stage 9 Total Time (Candidate)      : ${candMedianTel.stage9TotalTimeMs.toFixed(2)} ms`);
    console.log('----------------------------------------------------------------');
    console.log(`Max Coordinate Drift                : ${maxDrift.toFixed(5)} px`);
    console.log(`Candidate C_pp Primary Crossings    : ${detailedCrossingsCand.primaryPrimaryCrossings}`);
    console.log(`Candidate C_total Total Crossings   : ${detailedCrossingsCand.totalGeometricCrossings}`);
    console.log(`Minimum Physical Clearance          : ${clearanceCand.toFixed(2)} px`);
    console.log('================================================================\n');

    // Assert exact semantic equivalence
    expect(maxDrift).toBe(0);
    expect(detailedCrossingsCand.primaryPrimaryCrossings).toBe(detailedCrossingsOracle.primaryPrimaryCrossings);
    expect(detailedCrossingsCand.totalGeometricCrossings).toBe(detailedCrossingsOracle.totalGeometricCrossings);
    expect(clearanceCand).toBeGreaterThanOrEqual(40.0 - 1e-3);
  });
});

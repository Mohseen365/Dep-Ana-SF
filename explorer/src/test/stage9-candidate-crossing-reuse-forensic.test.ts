import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureGraphAnalysis, ArchitectureNodeAnalysis, ArchitectureLayer } from '../lib/layout/types';
import { computeArchitectureAnalysis, findParentObjectId, findParentProductionNodeId } from '../lib/layout/analysis';
import { isTriggerNode, isHandlerNode, SatelliteLayoutOptions, SatellitePlacementResult } from '../lib/layout/satellites';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

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

// ============================================================================
// High-Precision Forensic Tracker for Stage 9 Candidate Scoring
// ============================================================================

export class CandidateCrossingTracker {
  public totalCalls = 0;

  public tetherMap = new Map<string, number>();
  public primarySegMap = new Map<string, number>();

  private nextTetherId = 1;
  private nextPrimarySegId = 1;
  public genCallCount = 0;

  // Global pair tracking: pairKey -> count
  public globalPairCounts = new Map<string, number>();
  // Global pair result tracking: pairKey -> bitmask (1 = true, 2 = false, 3 = both)
  public globalPairResults = new Map<string, number>();

  // Scope A: Within ONE candidate scoring operation
  // Map of slotKey (`${genCallId}:${slotIndex}`) -> Map<pairKey, count>
  public scopeA_map = new Map<string, Map<string, number>>();

  // Scope B: Within ONE generateSatelliteSlots call
  // Map of genCallId -> Map<pairKey, count>
  public scopeB_map = new Map<number, Map<string, number>>();

  // Category breakdown: category -> Map<pairKey, count>
  public categoryMap = new Map<string, Map<string, number>>();

  public getTetherId(ep: Point, candPoint: Point): number {
    const key = `${ep.x},${ep.y}->${candPoint.x},${candPoint.y}`;
    let id = this.tetherMap.get(key);
    if (id === undefined) {
      id = this.nextTetherId++;
      this.tetherMap.set(key, id);
    }
    return id;
  }

  public getPrimarySegId(p1: Point, p2: Point): number {
    const key = `${p1.x},${p1.y}->${p2.x},${p2.y}`;
    let id = this.primarySegMap.get(key);
    if (id === undefined) {
      id = this.nextPrimarySegId++;
      this.primarySegMap.set(key, id);
    }
    return id;
  }

  public recordEvaluation(
    genCallId: number,
    category: 'field' | 'test' | 'trigger' | 'handler',
    anchor: Point,
    slotIndex: number,
    candPoint: Point,
    ep: Point,
    primarySeg: { p1: Point; p2: Point },
    result: boolean
  ) {
    this.totalCalls++;
    const tetherId = this.getTetherId(ep, candPoint);
    const primSegId = this.getPrimarySegId(primarySeg.p1, primarySeg.p2);

    const pairKey = `${tetherId}:${primSegId}`;

    // 1. Global pair count & result
    this.globalPairCounts.set(pairKey, (this.globalPairCounts.get(pairKey) || 0) + 1);
    const currentMask = this.globalPairResults.get(pairKey) || 0;
    const newMask = currentMask | (result ? 1 : 2);
    this.globalPairResults.set(pairKey, newMask);

    // 2. Scope A: Within ONE candidate scoring operation
    const slotKey = `${genCallId}:${slotIndex}`;
    let slotPairs = this.scopeA_map.get(slotKey);
    if (!slotPairs) {
      slotPairs = new Map<string, number>();
      this.scopeA_map.set(slotKey, slotPairs);
    }
    slotPairs.set(pairKey, (slotPairs.get(pairKey) || 0) + 1);

    // 3. Scope B: Within ONE generateSatelliteSlots call
    let genPairs = this.scopeB_map.get(genCallId);
    if (!genPairs) {
      genPairs = new Map<string, number>();
      this.scopeB_map.set(genCallId, genPairs);
    }
    genPairs.set(pairKey, (genPairs.get(pairKey) || 0) + 1);

    // 4. Category breakdown
    let catPairs = this.categoryMap.get(category);
    if (!catPairs) {
      catPairs = new Map<string, number>();
      this.categoryMap.set(category, catPairs);
    }
    catPairs.set(pairKey, (catPairs.get(pairKey) || 0) + 1);
  }
}

// ============================================================================
// Instrument Place Satellites (Stage 9 Candidate Scoring ONLY)
// ============================================================================

export function runInstrumentedStage9Scoring(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {},
  tracker: CandidateCrossingTracker
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

  function generateSlotsInstrumented(
    anchor: Point,
    count: number,
    occupied: Point[],
    bias: 'field' | 'test' | 'neutral',
    targetVector?: Point,
    primSegs?: Array<{ p1: Point; p2: Point }>,
    satSegs?: Array<{ p1: Point; p2: Point }>,
    incidentEndpoints?: Point[]
  ): Point[] {
    tracker.genCallCount++;
    const genCallId = tracker.genCallCount;

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
    let slotIndexCounter = 0;

    for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
      for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
        if (c === 0 && r === 0) continue;

        if (bias === 'test' && c === 0) continue;

        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;

        if (isSlotOccupied(x, y, occupied, dx, dy)) continue;

        slotIndexCounter++;
        const currentSlotIdx = slotIndexCounter;

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

          if (primSegs && primSegs.length > 0) {
            for (let i = 0; i < primSegs.length; i++) {
              const res = segmentsIntersect(ep, candPoint, primSegs[i].p1, primSegs[i].p2);
              tracker.recordEvaluation(
                genCallId,
                bias === 'field' ? 'field' : bias === 'test' ? 'test' : 'neutral' as any,
                anchor,
                currentSlotIdx,
                candPoint,
                ep,
                primSegs[i],
                res
              );
              if (res) primaryCrossings++;
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

  // --- STAGE 1: TRIGGER / HANDLER ---
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
      const slots = generateSlotsInstrumented(
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
          const handlerSlots = generateSlotsInstrumented(
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
      const slots = generateSlotsInstrumented(
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

  // --- STAGE 2: FIELDS ---
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

    const slots = generateSlotsInstrumented(
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
    const fallbackSlots = generateSlotsInstrumented(
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

  // --- STAGE 3: TESTS ---
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

    const slots = generateSlotsInstrumented(
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
    const fallbackSlots = generateSlotsInstrumented(
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

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}

describe('Stage 9 Candidate Crossing Reuse Forensic Test Suite', () => {
  it('1. Execute Forensic Instrumentation on Canonical Cloud Spend Tracker Dataset', { timeout: 120000 }, () => {
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

    const tracker = new CandidateCrossingTracker();
    runInstrumentedStage9Scoring(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true },
      tracker
    );

    const totalCalls = tracker.totalCalls;
    const tetherCount = tracker.tetherMap.size;
    const primSegCount = tracker.primarySegMap.size;

    // Scope A: Within ONE candidate scoring operation
    let scopeA_totalCalls = 0;
    let scopeA_uniquePairs = 0;
    let scopeA_dups = 0;
    let scopeA_maxReuse = 0;

    tracker.scopeA_map.forEach((pairMap) => {
      pairMap.forEach((cnt) => {
        scopeA_totalCalls += cnt;
        scopeA_uniquePairs++;
        if (cnt > 1) scopeA_dups += (cnt - 1);
        if (cnt > scopeA_maxReuse) scopeA_maxReuse = cnt;
      });
    });

    // Scope B: Within ONE generateSatelliteSlots call
    let scopeB_totalCalls = 0;
    let scopeB_uniquePairs = 0;
    let scopeB_dups = 0;
    let scopeB_maxReuse = 0;

    tracker.scopeB_map.forEach((pairMap) => {
      pairMap.forEach((cnt) => {
        scopeB_totalCalls += cnt;
        scopeB_uniquePairs++;
        if (cnt > 1) scopeB_dups += (cnt - 1);
        if (cnt > scopeB_maxReuse) scopeB_maxReuse = cnt;
      });
    });

    // Scope C / Combined: Across all Stage 9 calls
    let global_uniquePairs = tracker.globalPairCounts.size;
    let global_dups = 0;
    let global_maxReuse = 0;

    tracker.globalPairCounts.forEach((cnt) => {
      if (cnt > 1) global_dups += (cnt - 1);
      if (cnt > global_maxReuse) global_maxReuse = cnt;
    });

    // Across Stage 9 calls (Scope C: duplicate calls occurring across distinct generateSatelliteSlots calls)
    let scopeC_totalCalls = totalCalls;
    let scopeC_uniquePairs = global_uniquePairs; // global unique pairs across calls
    let scopeC_dups = scopeB_uniquePairs - global_uniquePairs;
    let scopeC_dupPct = (scopeC_dups / totalCalls) * 100;

    // Max reuse across Stage 9 calls for any pair across calls
    let pairInGenCalls = new Map<string, number>();
    tracker.scopeB_map.forEach((pairMap) => {
      pairMap.forEach((_, pairKey) => {
        pairInGenCalls.set(pairKey, (pairInGenCalls.get(pairKey) || 0) + 1);
      });
    });
    let scopeC_maxReuse = 0;
    pairInGenCalls.forEach((cnt) => {
      if (cnt > scopeC_maxReuse) scopeC_maxReuse = cnt;
    });

    let inconsistentResultCount = 0;
    tracker.globalPairResults.forEach((mask) => {
      if (mask === 3) inconsistentResultCount++; // both true (1) and false (2) observed
    });

    console.log('\n================================================================');
    console.log('STAGE 9 CANDIDATE CROSSING REUSE FORENSIC RESULTS');
    console.log('================================================================');
    console.log(`Total Primary Intersection Calls : ${totalCalls.toLocaleString()}`);
    console.log(`Unique Candidate Tethers        : ${tetherCount.toLocaleString()}`);
    console.log(`Unique Primary Segments         : ${primSegCount.toLocaleString()}`);
    console.log(`Unique Global (Tether, PrimarySeg) Pairs : ${global_uniquePairs.toLocaleString()}`);
    console.log(`Inconsistent Results across identical pairs : ${inconsistentResultCount}`);
    console.log('----------------------------------------------------------------');
    console.log('Scope A (One scoring operation):');
    console.log(`  Total Calls  : ${scopeA_totalCalls.toLocaleString()}`);
    console.log(`  Unique Pairs : ${scopeA_uniquePairs.toLocaleString()}`);
    console.log(`  Dups         : ${scopeA_dups.toLocaleString()} (${((scopeA_dups / scopeA_totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Max Reuse    : ${scopeA_maxReuse}`);
    console.log('----------------------------------------------------------------');
    console.log('Scope B (One generateSatelliteSlots call):');
    console.log(`  Total Calls  : ${scopeB_totalCalls.toLocaleString()}`);
    console.log(`  Unique Pairs : ${scopeB_uniquePairs.toLocaleString()}`);
    console.log(`  Dups         : ${scopeB_dups.toLocaleString()} (${((scopeB_dups / scopeB_totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Max Reuse    : ${scopeB_maxReuse}`);
    console.log('----------------------------------------------------------------');
    console.log('Scope C (Across Stage 9 calls):');
    console.log(`  Total Calls  : ${scopeC_totalCalls.toLocaleString()}`);
    console.log(`  Unique Pairs : ${scopeC_uniquePairs.toLocaleString()}`);
    console.log(`  Dups         : ${scopeC_dups.toLocaleString()} (${scopeC_dupPct.toFixed(2)}%)`);
    console.log(`  Max Reuse    : ${scopeC_maxReuse}`);
    console.log('----------------------------------------------------------------');
    console.log('Scope Combined (All Stage 9 calls):');
    console.log(`  Total Calls  : ${totalCalls.toLocaleString()}`);
    console.log(`  Unique Pairs : ${global_uniquePairs.toLocaleString()}`);
    console.log(`  Dups         : ${global_dups.toLocaleString()} (${((global_dups / totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Max Reuse    : ${global_maxReuse}`);
    console.log('================================================================\n');

    expect(totalCalls).toBeGreaterThan(0);
    expect(inconsistentResultCount).toBe(0);
  });
});

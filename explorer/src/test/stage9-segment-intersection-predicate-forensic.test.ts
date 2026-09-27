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

// ============================================================================
// LIGHTWEIGHT FORENSIC TRACKER & TELEMETRY
// ============================================================================

export interface PredicateInvocationMetrics {
  totalCalls: number;
  sharedEndpointExits: number;
  fullArithmeticPath: number;
  properIntersections: number;
  parallelNonIntersections: number;
  collinearCalls: number;
  degenerateCalls: number;

  // Progress & Cross Products
  crossProductsCalculated: number;
  reachedCrossProducts: number;
  reachedFinalDecision: number;

  // Geometry Summary Aggregates (Streaming min/max/sum)
  tetherLenMin: number;
  tetherLenMax: number;
  tetherLenSum: number;
  primaryLenMin: number;
  primaryLenMax: number;
  primaryLenSum: number;

  tetherDxMax: number;
  tetherDyMax: number;
  primaryDxMax: number;
  primaryDyMax: number;

  // Degenerate / Special
  zeroLengthTethers: number;
  zeroLengthPrimarySegs: number;
  parallelPairs: number;
  nearlyCollinearPairs: number;

  // Repetition (sampled via bounded maps or counts)
  exactSameCoordinates: number;
  samePrimaryDiffTether: number;
  sameTetherDiffPrimary: number;
  completelyDifferent: number;
}

export interface PredicateTimingMetrics {
  totalStage9TimeMs: number;
  totalPredicateTimeMs: number;
  argumentPrepTimeMs: number;
  candidateTetherConstructionTimeMs: number;
  primaryAccessTimeMs: number;
  loopOverheadTimeMs: number;
}

export class PredicateForensicTracker {
  public metrics: PredicateInvocationMetrics = {
    totalCalls: 0,
    sharedEndpointExits: 0,
    fullArithmeticPath: 0,
    properIntersections: 0,
    parallelNonIntersections: 0,
    collinearCalls: 0,
    degenerateCalls: 0,
    crossProductsCalculated: 0,
    reachedCrossProducts: 0,
    reachedFinalDecision: 0,
    tetherLenMin: Infinity,
    tetherLenMax: -Infinity,
    tetherLenSum: 0,
    primaryLenMin: Infinity,
    primaryLenMax: -Infinity,
    primaryLenSum: 0,
    tetherDxMax: -Infinity,
    tetherDyMax: -Infinity,
    primaryDxMax: -Infinity,
    primaryDyMax: -Infinity,
    zeroLengthTethers: 0,
    zeroLengthPrimarySegs: 0,
    parallelPairs: 0,
    nearlyCollinearPairs: 0,
    exactSameCoordinates: 0,
    samePrimaryDiffTether: 0,
    sameTetherDiffPrimary: 0,
    completelyDifferent: 0,
  };

  private tetherKeySet = new Map<string, number>();
  private primaryKeySet = new Map<string, number>();
  private exactPairSet = new Map<string, number>();

  public evaluateInstrumented(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
    const m = this.metrics;
    m.totalCalls++;

    // Geometry dimensions
    const tDx = Math.abs(p2.x - p1.x);
    const tDy = Math.abs(p2.y - p1.y);
    const tLen = Math.sqrt(tDx * tDx + tDy * tDy);

    const pDx = Math.abs(q2.x - q1.x);
    const pDy = Math.abs(q2.y - q1.y);
    const pLen = Math.sqrt(pDx * pDx + pDy * pDy);

    // Streaming Stats
    if (tLen < m.tetherLenMin) m.tetherLenMin = tLen;
    if (tLen > m.tetherLenMax) m.tetherLenMax = tLen;
    m.tetherLenSum += tLen;

    if (pLen < m.primaryLenMin) m.primaryLenMin = pLen;
    if (pLen > m.primaryLenMax) m.primaryLenMax = pLen;
    m.primaryLenSum += pLen;

    if (tDx > m.tetherDxMax) m.tetherDxMax = tDx;
    if (tDy > m.tetherDyMax) m.tetherDyMax = tDy;
    if (pDx > m.primaryDxMax) m.primaryDxMax = pDx;
    if (pDy > m.primaryDyMax) m.primaryDyMax = pDy;

    if (tLen < 1e-9) m.zeroLengthTethers++;
    if (pLen < 1e-9) m.zeroLengthPrimarySegs++;
    if (tLen < 1e-9 || pLen < 1e-9) m.degenerateCalls++;

    // Repetition Analysis
    const tKey = `${p1.x},${p1.y}->${p2.x},${p2.y}`;
    const pKey = `${q1.x},${q1.y}->${q2.x},${q2.y}`;
    const pairKey = `${tKey}|${pKey}`;

    const prevPair = this.exactPairSet.get(pairKey);
    const prevTether = this.tetherKeySet.get(tKey);
    const prevPrimary = this.primaryKeySet.get(pKey);

    if (prevPair !== undefined) {
      m.exactSameCoordinates++;
    } else if (prevPrimary !== undefined && prevTether === undefined) {
      m.samePrimaryDiffTether++;
    } else if (prevTether !== undefined && prevPrimary === undefined) {
      m.sameTetherDiffPrimary++;
    } else {
      m.completelyDifferent++;
    }

    this.exactPairSet.set(pairKey, (prevPair || 0) + 1);
    this.tetherKeySet.set(tKey, (prevTether || 0) + 1);
    this.primaryKeySet.set(pKey, (prevPrimary || 0) + 1);

    // 1. Shared Endpoints
    if (
      (p1.x === q1.x && p1.y === q1.y) ||
      (p1.x === q2.x && p1.y === q2.y) ||
      (p2.x === q1.x && p2.y === q1.y) ||
      (p2.x === q2.x && p2.y === q2.y)
    ) {
      m.sharedEndpointExits++;
      return false;
    }

    // 2. Full Arithmetic Path
    m.reachedCrossProducts++;
    m.fullArithmeticPath++;

    const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
    const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
    const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
    const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

    m.crossProductsCalculated += 4;

    const EPS = 1e-9;
    const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
    const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

    m.reachedFinalDecision++;

    // Parallel & Collinear checks
    if (Math.abs(cp1) < EPS && Math.abs(cp2) < EPS && Math.abs(cp3) < EPS && Math.abs(cp4) < EPS) {
      m.collinearCalls++;
    } else if ((cp1 > EPS && cp2 > EPS) || (cp1 < -EPS && cp2 < -EPS) || (cp3 > EPS && cp4 > EPS) || (cp3 < -EPS && cp4 < -EPS)) {
      m.parallelNonIntersections++;
    }

    if (Math.abs(cp1) < 1e-4 || Math.abs(cp2) < 1e-4 || Math.abs(cp3) < 1e-4 || Math.abs(cp4) < 1e-4) {
      m.nearlyCollinearPairs++;
    }

    const res = straddle1 && straddle2;
    if (res) m.properIntersections++;

    return res;
  }
}

// ============================================================================
// INSTRUMENTED RUNNER
// ============================================================================

export function runInstrumentedStage9Forensics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {},
  tracker: PredicateForensicTracker,
  timing: PredicateTimingMetrics
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

        const tCandStart = performance.now();
        const candPoint = { x, y };
        timing.candidateTetherConstructionTimeMs += (performance.now() - tCandStart);

        const tPrepStart = performance.now();
        const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];
        timing.argumentPrepTimeMs += (performance.now() - tPrepStart);

        const tLoopStart = performance.now();
        for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
          const ep = endpointsToTest[epIdx];

          if (primSegs && primSegs.length > 0) {
            for (let i = 0; i < primSegs.length; i++) {
              const tAccessStart = performance.now();
              const pSeg = primSegs[i];
              timing.primaryAccessTimeMs += (performance.now() - tAccessStart);

              const tPredStart = performance.now();
              const res = tracker.evaluateInstrumented(ep, candPoint, pSeg.p1, pSeg.p2);
              timing.totalPredicateTimeMs += (performance.now() - tPredStart);

              if (res) primaryCrossings++;
            }
          }

          if (satSegs && satSegs.length > 0) {
            for (let i = 0; i < satSegs.length; i++) {
              const pSeg = satSegs[i];
              if (tracker.evaluateInstrumented(ep, candPoint, pSeg.p1, pSeg.p2)) {
                satelliteCrossings++;
              }
            }
          }
        }
        timing.loopOverheadTimeMs += (performance.now() - tLoopStart);

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

  timing.totalStage9TimeMs = performance.now() - startStage9;

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}

describe('Stage 9 Segment Intersection Predicate Forensic Measurement Suite', () => {
  it('1. Execute Comprehensive Predicate Forensics on Canonical Dataset', { timeout: 120000 }, () => {
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

    const tracker = new PredicateForensicTracker();
    const timing: PredicateTimingMetrics = {
      totalStage9TimeMs: 0,
      totalPredicateTimeMs: 0,
      argumentPrepTimeMs: 0,
      candidateTetherConstructionTimeMs: 0,
      primaryAccessTimeMs: 0,
      loopOverheadTimeMs: 0,
    };

    runInstrumentedStage9Forensics(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true },
      tracker,
      timing
    );

    const m = tracker.metrics;

    const tLenAvg = m.tetherLenSum / m.totalCalls;
    const pLenAvg = m.primaryLenSum / m.totalCalls;

    console.log('\n================================================================');
    console.log('STAGE 9 SEGMENT INTERSECTION PREDICATE FORENSIC MEASUREMENTS');
    console.log('================================================================');
    console.log(`Total Predicate Invocations      : ${m.totalCalls.toLocaleString()}`);
    console.log(`Shared Endpoint Exits (Early)    : ${m.sharedEndpointExits.toLocaleString()} (${((m.sharedEndpointExits / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`Full Arithmetic Path Reached     : ${m.fullArithmeticPath.toLocaleString()} (${((m.fullArithmeticPath / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`Proper Intersections (Straddle)  : ${m.properIntersections.toLocaleString()} (${((m.properIntersections / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`Parallel Non-Intersections       : ${m.parallelNonIntersections.toLocaleString()} (${((m.parallelNonIntersections / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`Collinear Calls                  : ${m.collinearCalls.toLocaleString()} (${((m.collinearCalls / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`Degenerate Calls                 : ${m.degenerateCalls.toLocaleString()} (${((m.degenerateCalls / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log('----------------------------------------------------------------');
    console.log('Progress & Cross-Products:');
    console.log(`  Cross-Products Calculated      : ${m.crossProductsCalculated.toLocaleString()}`);
    console.log(`  Avg Cross-Products / Call      : ${(m.crossProductsCalculated / m.totalCalls).toFixed(2)}`);
    console.log('----------------------------------------------------------------');
    console.log('Geometry Distributions:');
    console.log(`  Candidate Tether Length (px)   : min=${m.tetherLenMin.toFixed(1)}, avg=${tLenAvg.toFixed(1)}, max=${m.tetherLenMax.toFixed(1)}`);
    console.log(`  Primary Segment Length (px)    : min=${m.primaryLenMin.toFixed(1)}, avg=${pLenAvg.toFixed(1)}, max=${m.primaryLenMax.toFixed(1)}`);
    console.log(`  Candidate Tether Max (dx/dy)   : dx=${m.tetherDxMax.toFixed(1)}, dy=${m.tetherDyMax.toFixed(1)}`);
    console.log(`  Primary Segment Max (dx/dy)    : dx=${m.primaryDxMax.toFixed(1)}, dy=${m.primaryDyMax.toFixed(1)}`);
    console.log('----------------------------------------------------------------');
    console.log('Repetition Analysis:');
    console.log(`  Exact Same Coordinates         : ${m.exactSameCoordinates.toLocaleString()} (${((m.exactSameCoordinates / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Same Primary, Different Tether : ${m.samePrimaryDiffTether.toLocaleString()} (${((m.samePrimaryDiffTether / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Same Tether, Different Primary : ${m.sameTetherDiffPrimary.toLocaleString()} (${((m.sameTetherDiffPrimary / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log(`  Completely Different           : ${m.completelyDifferent.toLocaleString()} (${((m.completelyDifferent / m.totalCalls) * 100).toFixed(2)}%)`);
    console.log('----------------------------------------------------------------');
    console.log('Runtime Attribution (Aggregated):');
    console.log(`  Stage 9 Total Time             : ${timing.totalStage9TimeMs.toFixed(2)} ms`);
    console.log(`  Predicate Time                 : ${timing.totalPredicateTimeMs.toFixed(2)} ms (${((timing.totalPredicateTimeMs / timing.totalStage9TimeMs) * 100).toFixed(1)}%)`);
    console.log(`  Primary Segment Access Time    : ${timing.primaryAccessTimeMs.toFixed(2)} ms (${((timing.primaryAccessTimeMs / timing.totalStage9TimeMs) * 100).toFixed(1)}%)`);
    console.log(`  Candidate Tether Construction  : ${timing.candidateTetherConstructionTimeMs.toFixed(2)} ms (${((timing.candidateTetherConstructionTimeMs / timing.totalStage9TimeMs) * 100).toFixed(1)}%)`);
    console.log(`  Argument Preparation Time      : ${timing.argumentPrepTimeMs.toFixed(2)} ms (${((timing.argumentPrepTimeMs / timing.totalStage9TimeMs) * 100).toFixed(1)}%)`);
    console.log(`  Loop Overhead Time             : ${timing.loopOverheadTimeMs.toFixed(2)} ms (${((timing.loopOverheadTimeMs / timing.totalStage9TimeMs) * 100).toFixed(1)}%)`);
    console.log('================================================================\n');

    expect(m.totalCalls).toBeGreaterThan(0);
    expect(m.fullArithmeticPath).toBeGreaterThan(0);
  });
});

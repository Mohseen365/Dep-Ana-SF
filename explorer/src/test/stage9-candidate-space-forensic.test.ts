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

function evaluateTotalCrossings(
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): number {
  interface EdgeSeg {
    p1: Point;
    p2: Point;
    s: string;
    t: string;
  }
  const segs: EdgeSeg[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1 = positions[e.source];
    const p2 = positions[e.target];
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

export interface CandidateSlotRecord {
  x: number;
  y: number;
  dist: number;
  effectiveScore: number;
  row: number;
  col: number;
  chebyshevRadius: number;
  gridDistance: number;
  directionalScore: number;
  aspectPenalty: number;
  vectorPenalty: number;
  crossingPenalty: number;
  tetherPenalty: number;
  isTestBiasExcluded: boolean;
  isOccupancyRejected: boolean;
  isScoreable: boolean;
  isSelected: boolean;
  selectedRank?: number;
}

export interface TelemetryGroupInvocation {
  groupCategory: 'trigger' | 'handler' | 'field' | 'test';
  groupId: string;
  anchor: Point;
  count: number;
  maxSearchRadius: number;
  effectiveMaxDist: number;
  totalGeneratedCoordinates: number;
  anchorExcludedCount: number; // 1
  biasExcludedCount: number;
  occupancyRejectedCount: number;
  distanceRejectedCount: number; // 0
  scoreableCount: number;
  selectedCount: number;
  fallbackTriggered: boolean;
  fallbackInitialRadius?: number;
  fallbackInitialCandidateCount?: number;
  fallbackInitialEligibleCount?: number;
  fallbackExpandedRadius?: number;
  fallbackAdditionalCandidateCount?: number;
  fallbackFinalEligibleCount?: number;
  fallbackFinalSelectedCount?: number;
  maxSelectedRadius: number;
  maxSelectedDistance: number;
  minSelectedRadius: number;
  minSelectedDistance: number;
  selectionBoundaryScoreDelta?: number;
  selectionBoundaryDistanceDelta?: number;
  firstUnselectedScore?: number;
  firstUnselectedDistance?: number;
  firstUnselectedRow?: number;
  firstUnselectedCol?: number;
  lastSelectedScore?: number;
  lastSelectedDistance?: number;
  lastSelectedRow?: number;
  lastSelectedCol?: number;
  tieScoreExactCount: number;
  tieScoreEpsilonCount: number;
  tieDistExactCount: number;
  tieRowExactCount: number;
  tieColExactCount: number;
  candidates: CandidateSlotRecord[];
}

export class InstrumentingSatelliteEngine {
  public invocations: TelemetryGroupInvocation[] = [];

  public generateSatelliteSlotsInstrumented(
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
    groupId: string,
    targetVector?: Point,
    primarySegments?: Array<{ p1: Point; p2: Point }>,
    placedSatelliteSegments?: Array<{ p1: Point; p2: Point }>,
    incidentEndpoints?: Point[]
  ): Point[] {
    if (count <= 0) return [];

    const dx = nodeWidth + horizontalGap;
    const dy = nodeHeight + verticalGap;
    const effectiveMaxDist = Math.max(
      maxDistance,
      Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
    );

    const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
    const totalGridCoordinates = Math.pow(2 * maxSearchRadius + 1, 2) - 1;

    let biasExcludedCount = 0;
    let occupancyRejectedCount = 0;
    const allRecords: CandidateSlotRecord[] = [];

    const candidateSlots: Array<{
      x: number;
      y: number;
      dist: number;
      effectiveScore: number;
      row: number;
      col: number;
      directionalScore: number;
      aspectPenalty: number;
      vectorPenalty: number;
      crossingPenalty: number;
      tetherPenalty: number;
    }> = [];

    for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
      for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
        if (c === 0 && r === 0) continue; // Skip anchor

        const isTestBias = bias === 'test' && c === 0;
        if (isTestBias) {
          biasExcludedCount++;
          allRecords.push({
            x: anchor.x + c * dx,
            y: anchor.y + r * dy,
            dist: Math.sqrt(Math.pow(c * dx, 2) + Math.pow(r * dy, 2)),
            effectiveScore: Infinity,
            row: r,
            col: c,
            chebyshevRadius: Math.max(Math.abs(r), Math.abs(c)),
            gridDistance: Math.abs(r) + Math.abs(c),
            directionalScore: 0,
            aspectPenalty: 0,
            vectorPenalty: 0,
            crossingPenalty: 0,
            tetherPenalty: 0,
            isTestBiasExcluded: true,
            isOccupancyRejected: false,
            isScoreable: false,
            isSelected: false,
          });
          continue;
        }

        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;

        const isOcc = isSlotOccupied(x, y, occupied, dx, dy);
        if (isOcc) {
          occupancyRejectedCount++;
          allRecords.push({
            x,
            y,
            dist: Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2)),
            effectiveScore: Infinity,
            row: r,
            col: c,
            chebyshevRadius: Math.max(Math.abs(r), Math.abs(c)),
            gridDistance: Math.abs(r) + Math.abs(c),
            directionalScore: 0,
            aspectPenalty: 0,
            vectorPenalty: 0,
            crossingPenalty: 0,
            tetherPenalty: 0,
            isTestBiasExcluded: false,
            isOccupancyRejected: true,
            isScoreable: false,
            isSelected: false,
          });
          continue;
        }

        const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        let directionalScore = 1.0;
        if (bias === 'test') {
          if (c < 0) directionalScore = 1.2;
        }

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
        const endpointsToTest = incidentEndpoints && incidentEndpoints.length > 0 ? incidentEndpoints : [anchor];

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

        candidateSlots.push({
          x,
          y,
          dist,
          effectiveScore,
          row: r,
          col: c,
          directionalScore,
          aspectPenalty,
          vectorPenalty,
          crossingPenalty,
          tetherPenalty,
        });

        allRecords.push({
          x,
          y,
          dist,
          effectiveScore,
          row: r,
          col: c,
          chebyshevRadius: Math.max(Math.abs(r), Math.abs(c)),
          gridDistance: Math.abs(r) + Math.abs(c),
          directionalScore,
          aspectPenalty,
          vectorPenalty,
          crossingPenalty,
          tetherPenalty,
          isTestBiasExcluded: false,
          isOccupancyRejected: false,
          isScoreable: true,
          isSelected: false,
        });
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

    let tieScoreExactCount = 0;
    let tieScoreEpsilonCount = 0;
    let tieDistExactCount = 0;
    let tieRowExactCount = 0;
    let tieColExactCount = 0;

    for (let i = 0; i < candidateSlots.length - 1; i++) {
      const c1 = candidateSlots[i];
      const c2 = candidateSlots[i + 1];
      if (c1.effectiveScore === c2.effectiveScore) tieScoreExactCount++;
      if (Math.abs(c1.effectiveScore - c2.effectiveScore) <= 1e-4) tieScoreEpsilonCount++;
      if (Math.abs(c1.dist - c2.dist) <= 1e-4) tieDistExactCount++;
      if (c1.row === c2.row) tieRowExactCount++;
      if (c1.col === c2.col) tieColExactCount++;
    }

    const selectedCandidateSlots = candidateSlots.slice(0, count);
    const selectedSlots = selectedCandidateSlots.map(s => ({ x: s.x, y: s.y }));

    let fallbackTriggered = false;
    let fallbackInitialRadius = maxSearchRadius;
    let fallbackInitialCandidateCount = totalGridCoordinates;
    let fallbackInitialEligibleCount = candidateSlots.length;
    let fallbackExpandedRadius: number | undefined;
    let fallbackAdditionalCandidateCount: number | undefined;
    let fallbackFinalEligibleCount: number | undefined;
    let fallbackFinalSelectedCount: number | undefined;

    if (selectedSlots.length < count) {
      fallbackTriggered = true;
      let r = 1;
      let addedCandidates = 0;
      while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
        for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
          if (selectedSlots.length >= count) break;
          if (bias === 'test' && c === 0) continue;
          const x = anchor.x + c * dx;
          const y = anchor.y + r * dy;
          const combinedOccupied = [...occupied, ...selectedSlots];
          if (!isSlotOccupied(x, y, combinedOccupied, dx, dy)) {
            selectedSlots.push({ x, y });
            addedCandidates++;
          }
        }
        r++;
      }
      fallbackExpandedRadius = maxSearchRadius + 20;
      fallbackAdditionalCandidateCount = addedCandidates;
      fallbackFinalEligibleCount = candidateSlots.length + addedCandidates;
      fallbackFinalSelectedCount = selectedSlots.length;
    }

    for (let idx = 0; idx < selectedCandidateSlots.length; idx++) {
      const sel = selectedCandidateSlots[idx];
      const match = allRecords.find(rec => rec.row === sel.row && rec.col === sel.col);
      if (match) {
        match.isSelected = true;
        match.selectedRank = idx + 1;
      }
    }

    let maxSelectedRadius = 0;
    let minSelectedRadius = Infinity;
    let maxSelectedDistance = 0;
    let minSelectedDistance = Infinity;

    for (const sel of selectedCandidateSlots) {
      const rad = Math.max(Math.abs(sel.row), Math.abs(sel.col));
      if (rad > maxSelectedRadius) maxSelectedRadius = rad;
      if (rad < minSelectedRadius) minSelectedRadius = rad;
      if (sel.dist > maxSelectedDistance) maxSelectedDistance = sel.dist;
      if (sel.dist < minSelectedDistance) minSelectedDistance = sel.dist;
    }

    if (selectedCandidateSlots.length === 0) {
      minSelectedRadius = 0;
      minSelectedDistance = 0;
    }

    const firstUnselected = candidateSlots[count];
    const lastSelected = selectedCandidateSlots[selectedCandidateSlots.length - 1];

    const invocationRecord: TelemetryGroupInvocation = {
      groupCategory: category,
      groupId,
      anchor,
      count,
      maxSearchRadius,
      effectiveMaxDist,
      totalGeneratedCoordinates: totalGridCoordinates,
      anchorExcludedCount: 1,
      biasExcludedCount,
      occupancyRejectedCount,
      distanceRejectedCount: 0,
      scoreableCount: candidateSlots.length,
      selectedCount: selectedSlots.length,
      fallbackTriggered,
      fallbackInitialRadius,
      fallbackInitialCandidateCount,
      fallbackInitialEligibleCount,
      fallbackExpandedRadius,
      fallbackAdditionalCandidateCount,
      fallbackFinalEligibleCount,
      fallbackFinalSelectedCount,
      maxSelectedRadius,
      maxSelectedDistance,
      minSelectedRadius,
      minSelectedDistance,
      selectionBoundaryScoreDelta:
        firstUnselected && lastSelected
          ? firstUnselected.effectiveScore - lastSelected.effectiveScore
          : undefined,
      selectionBoundaryDistanceDelta:
        firstUnselected && lastSelected
          ? firstUnselected.dist - lastSelected.dist
          : undefined,
      firstUnselectedScore: firstUnselected?.effectiveScore,
      firstUnselectedDistance: firstUnselected?.dist,
      firstUnselectedRow: firstUnselected?.row,
      firstUnselectedCol: firstUnselected?.col,
      lastSelectedScore: lastSelected?.effectiveScore,
      lastSelectedDistance: lastSelected?.dist,
      lastSelectedRow: lastSelected?.row,
      lastSelectedCol: lastSelected?.col,
      tieScoreExactCount,
      tieScoreEpsilonCount,
      tieDistExactCount,
      tieRowExactCount,
      tieColExactCount,
      candidates: allRecords,
    };

    this.invocations.push(invocationRecord);

    return selectedSlots;
  }

  public placeSatellitesInstrumented(
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
        if (p1 && p2) primarySegments.push({ p1, p2 });
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
      if (item.isTest) testAnalyses.push(item);
      else if (item.isField) fieldAnalyses.push(item);
      else if (isTriggerNode(item)) triggerAnalyses.push(item);
      else if (isHandlerNode(item)) handlerAnalyses.push(item);
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
        : edges.filter(e => e.source === triggerItem.nodeId || e.target === triggerItem.nodeId);

      let parentObjectPos: Point | null = null;
      let connectedHandlerId: string | null = null;

      for (const edge of connectedEdges) {
        const otherId = edge.source === triggerItem.nodeId ? edge.target : edge.source;
        const otherAnalysis = nodeAnalysisMap.get(otherId);
        if (otherAnalysis) {
          if ((otherAnalysis.nodeType === 'Object' || otherAnalysis.nodeType === 'CustomObject') && positions[otherId]) {
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
        const slots = this.generateSatelliteSlotsInstrumented(
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

          if (isSlotOccupied(handlerX, handlerY, occupiedList, minDx, minDy)) {
            const handlerSlots = this.generateSatelliteSlotsInstrumented(
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
      if (isSlotOccupied(hX, hY, occupiedList, minDx, minDy)) {
        const slots = this.generateSatelliteSlotsInstrumented(
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

      const slots = this.generateSatelliteSlotsInstrumented(
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
      const fallbackSlots = this.generateSatelliteSlotsInstrumented(
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
        'unanchored-fields'
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

      const slots = this.generateSatelliteSlotsInstrumented(
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
      const fallbackSlots = this.generateSatelliteSlotsInstrumented(
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
        'unanchored-tests'
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

    fieldsByParent.forEach((fields) => {
      if (fields.length < 2) return;
      const fieldIds = fields.map(f => f.nodeId);
      const slots = fieldIds.map(id => positions[id]).filter(Boolean);
      if (slots.length !== fieldIds.length) return;

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

    return {
      positions,
      satellitePositions,
      placedTestsCount,
      placedFieldsCount,
      placedMicroclusterCount,
    };
  }
}

describe('Stage 9 Candidate Space and Selection Forensic Harness', () => {
  it('1. Candidate Search Space Scaling Formula Verification', () => {
    const counts = [1, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

    console.log('\n--- SEARCH SPACE SCALING MATRIX ---');
    console.log('Count | maxSearchRadius | Grid Width x Height | Total Enumerated | Anchor Excluded');
    console.log('---------------------------------------------------------------------------------');

    counts.forEach(count => {
      const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
      const width = 2 * maxSearchRadius + 1;
      const height = 2 * maxSearchRadius + 1;
      const totalEnumerated = width * height - 1;
      const anchorExcluded = 1;

      console.log(
        `${String(count).padStart(5)} | ` +
        `${String(maxSearchRadius).padStart(15)} | ` +
        `${String(width + 'x' + height).padStart(19)} | ` +
        `${String(totalEnumerated).padStart(16)} | ` +
        `${String(anchorExcluded).padStart(15)}`
      );

      expect(maxSearchRadius).toBe(Math.max(12, Math.ceil(Math.sqrt(count) * 3)));
      expect(totalEnumerated).toBe((2 * maxSearchRadius + 1) * (2 * maxSearchRadius + 1) - 1);
    });
  });

  it('2. Empirical Telemetry on Canonical Dataset', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
    );
    const rawData = fs.readFileSync(fixturePath, 'utf-8');
    const dataset = JSON.parse(rawData);

    const engine = new InstrumentingSatelliteEngine();
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

    const satResult = engine.placeSatellitesInstrumented(
      dataset.nodes,
      dataset.edges,
      analysis,
      primaryPositions,
      { enableFeatureLayout: true }
    );

    expect(satResult.positions).toBeDefined();
    expect(engine.invocations.length).toBeGreaterThan(0);

    let totalGen = 0;
    let totalAnchorExc = 0;
    let totalBiasExc = 0;
    let totalOccRej = 0;
    let totalDistRej = 0;
    let totalScoreable = 0;
    let totalSelected = 0;

    const categoryStats: Record<string, { gen: number; scoreable: number; sel: number }> = {
      trigger: { gen: 0, scoreable: 0, sel: 0 },
      handler: { gen: 0, scoreable: 0, sel: 0 },
      field: { gen: 0, scoreable: 0, sel: 0 },
      test: { gen: 0, scoreable: 0, sel: 0 },
    };

    engine.invocations.forEach(inv => {
      totalGen += inv.totalGeneratedCoordinates;
      totalAnchorExc += inv.anchorExcludedCount;
      totalBiasExc += inv.biasExcludedCount;
      totalOccRej += inv.occupancyRejectedCount;
      totalDistRej += inv.distanceRejectedCount;
      totalScoreable += inv.scoreableCount;
      totalSelected += inv.selectedCount;

      categoryStats[inv.groupCategory].gen += inv.totalGeneratedCoordinates;
      categoryStats[inv.groupCategory].scoreable += inv.scoreableCount;
      categoryStats[inv.groupCategory].sel += inv.selectedCount;
    });

    console.log('\n--- CANONICAL DATASET FUNNEL SUMMARY ---');
    console.log(`Total Group Invocations: ${engine.invocations.length}`);
    console.log(`Generated Coordinates  : ${totalGen}`);
    console.log(`Anchor Excluded        : ${totalAnchorExc}`);
    console.log(`Bias Excluded          : ${totalBiasExc}`);
    console.log(`Occupancy Rejected     : ${totalOccRej}`);
    console.log(`Distance Rejected      : ${totalDistRej}`);
    console.log(`Scoreable Candidates   : ${totalScoreable}`);
    console.log(`Selected Candidates    : ${totalSelected}`);

    console.log('\n--- CANDIDATE SURVIVAL RATIOS ---');
    console.log(`eligible / generated   : ${(totalScoreable / totalGen).toFixed(6)}`);
    console.log(`scoreable / generated  : ${(totalScoreable / totalGen).toFixed(6)}`);
    console.log(`selected / generated   : ${(totalSelected / totalGen).toFixed(6)}`);
    console.log(`selected / scoreable   : ${(totalSelected / totalScoreable).toFixed(6)}`);

    console.log('\n--- BY CATEGORY ---');
    Object.entries(categoryStats).forEach(([cat, stats]) => {
      console.log(
        `${cat.padEnd(10)}: Generated = ${stats.gen}, Scoreable = ${stats.scoreable}, Selected = ${stats.sel}`
      );
    });

    // Score & Distance analysis across invocations
    console.log('\n--- BOUNDARY & DISTANCE ANALYSIS (SAMPLE INVOCATIONS) ---');
    engine.invocations.slice(0, 5).forEach(inv => {
      console.log(
        `Group: ${inv.groupId} (${inv.groupCategory}) | Count: ${inv.count} | Max Radius: ${inv.maxSearchRadius} | ` +
        `Max Sel Radius: ${inv.maxSelectedRadius} | Max Sel Dist: ${inv.maxSelectedDistance.toFixed(2)}px | ` +
        `First Unsel Score: ${inv.firstUnselectedScore?.toFixed(2)} | Score Delta: ${inv.selectionBoundaryScoreDelta?.toFixed(2)}`
      );
    });
  });

  it('3. Scale Matrix Telemetry (Tiers 2 to 5)', () => {
    const scaleTiers = [
      { tier: 'Tier 2', nodes: 500 },
      { tier: 'Tier 3', nodes: 1000 },
      { tier: 'Tier 4', nodes: 2000 },
      { tier: 'Tier 5', nodes: 5000 },
    ];

    console.log('\n--- SCALE MATRIX TELEMETRY ---');
    console.log('Tier   | Nodes | Invocations | Generated | Scoreable | Selected | Max Sel Radius | Fallbacks');
    console.log('----------------------------------------------------------------------------------------');

    scaleTiers.forEach(t => {
      const graph = generateSyntheticSalesforceGraph({ nodeCount: t.nodes, seed: 42 });
      const analysis = computeArchitectureAnalysis(graph.nodes, graph.edges);

      const primaryPositions: Record<string, { x: number; y: number }> = {};
      let pIdx = 0;
      graph.nodes.forEach(n => {
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

      const engine = new InstrumentingSatelliteEngine();
      engine.placeSatellitesInstrumented(graph.nodes, graph.edges, analysis, primaryPositions, {
        enableFeatureLayout: true,
      });

      let gen = 0;
      let scoreable = 0;
      let sel = 0;
      let maxRad = 0;
      let fallbacks = 0;

      engine.invocations.forEach(inv => {
        gen += inv.totalGeneratedCoordinates;
        scoreable += inv.scoreableCount;
        sel += inv.selectedCount;
        if (inv.maxSelectedRadius > maxRad) maxRad = inv.maxSelectedRadius;
        if (inv.fallbackTriggered) fallbacks++;
      });

      console.log(
        `${t.tier.padEnd(6)} | ` +
        `${String(t.nodes).padStart(5)} | ` +
        `${String(engine.invocations.length).padStart(11)} | ` +
        `${String(gen).padStart(9)} | ` +
        `${String(scoreable).padStart(9)} | ` +
        `${String(sel).padStart(8)} | ` +
        `${String(maxRad).padStart(14)} | ` +
        `${String(fallbacks).padStart(9)}`
      );
    });
  }, 120000);

  it('4. 10 Deterministic Adversarial Placement Scenarios', () => {
    const engine = new InstrumentingSatelliteEngine();

    const s1 = engine.generateSatelliteSlotsInstrumented(
      { x: 1000, y: 1000 }, 3, [], 120, 60, 40, 40, 280, 'neutral', 'field', 's1'
    );
    expect(s1.length).toBe(3);

    const occupiedNearby: Point[] = [];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === 0 && c === 0) continue;
        occupiedNearby.push({ x: 1000 + c * 160, y: 1000 + r * 100 });
      }
    }
    const s2 = engine.generateSatelliteSlotsInstrumented(
      { x: 1000, y: 1000 }, 2, occupiedNearby, 120, 60, 40, 40, 280, 'field', 'field', 's2'
    );
    expect(s2.length).toBe(2);

    const s3 = engine.generateSatelliteSlotsInstrumented(
      { x: 1000, y: 1000 }, 2, [], 120, 60, 40, 40, 280, 'test', 'test', 's3'
    );
    expect(s3[0].x).toBeGreaterThan(1000);

    const targetVector = { x: 500, y: 0 };
    const s4 = engine.generateSatelliteSlotsInstrumented(
      { x: 1000, y: 1000 }, 2, [], 120, 60, 40, 40, 280, 'field', 'field', 's4', targetVector
    );
    expect(s4.length).toBe(2);

    const primarySegments = [{ p1: { x: 1000, y: 900 }, p2: { x: 1000, y: 1100 } }];
    const s5 = engine.generateSatelliteSlotsInstrumented(
      { x: 1000, y: 1000 }, 2, [], 120, 60, 40, 40, 280, 'field', 'field', 's5', undefined, primarySegments
    );
    expect(s5.length).toBe(2);

    const s6 = engine.generateSatelliteSlotsInstrumented(
      { x: 0, y: 0 }, 1, [], 120, 60, 40, 40, 100, 'neutral', 'trigger', 's6'
    );
    expect(s6.length).toBe(1);

    const innerRingOccupied: Point[] = [
      { x: 160, y: 0 }, { x: -160, y: 0 }, { x: 0, y: 100 }, { x: 0, y: -100 },
      { x: 160, y: 100 }, { x: -160, y: 100 }, { x: 160, y: -100 }, { x: -160, y: -100 }
    ];
    const s7 = engine.generateSatelliteSlotsInstrumented(
      { x: 0, y: 0 }, 2, innerRingOccupied, 120, 60, 40, 40, 280, 'field', 'field', 's7'
    );
    expect(s7.length).toBe(2);

    const s8 = engine.generateSatelliteSlotsInstrumented(
      { x: 0, y: 0 }, 4, [], 120, 60, 40, 40, 280, 'neutral', 'trigger', 's8'
    );
    expect(s8.length).toBe(4);

    const heavyOccupied: Point[] = [];
    for (let r = -10; r <= 10; r++) {
      for (let c = -10; c <= 10; c++) {
        if (r === 0 && c === 0) continue;
        if (Math.abs(r) < 10 || Math.abs(c) < 10) {
          heavyOccupied.push({ x: c * 160, y: r * 100 });
        }
      }
    }
    const s9 = engine.generateSatelliteSlotsInstrumented(
      { x: 0, y: 0 }, 2, heavyOccupied, 120, 60, 40, 40, 280, 'field', 'field', 's9'
    );
    expect(s9.length).toBe(2);

    const fullOccupied: Point[] = [];
    for (let r = -12; r <= 12; r++) {
      for (let c = -12; c <= 12; c++) {
        if (r === 0 && c === 0) continue;
        fullOccupied.push({ x: c * 160, y: r * 100 });
      }
    }
    const s10 = engine.generateSatelliteSlotsInstrumented(
      { x: 0, y: 0 }, 2, fullOccupied, 120, 60, 40, 40, 280, 'field', 'field', 's10'
    );
    expect(s10.length).toBe(2);
    expect(engine.invocations[engine.invocations.length - 1].fallbackTriggered).toBe(true);

    console.log('\n--- ADVERSARIAL SCENARIOS COMPLETED (10/10 PASS) ---');
  });

  it('5. 100 Deterministic Seeded Randomized Scenarios', () => {
    function mulberry32(a: number) {
      return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 8), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    let maxRadAcross100 = 0;
    let fallbackCountAcross100 = 0;
    let totalGenAcross100 = 0;
    let totalScoreableAcross100 = 0;

    for (let seed = 1; seed <= 100; seed++) {
      const rand = mulberry32(seed);
      const satCount = Math.floor(rand() * 30) + 1;
      const occupiedCount = Math.floor(rand() * 50);

      const occupied: Point[] = [];
      for (let o = 0; o < occupiedCount; o++) {
        occupied.push({
          x: (Math.floor(rand() * 10) - 5) * 160,
          y: (Math.floor(rand() * 10) - 5) * 100,
        });
      }

      const engine = new InstrumentingSatelliteEngine();
      engine.generateSatelliteSlotsInstrumented(
        { x: 0, y: 0 },
        satCount,
        occupied,
        120,
        60,
        40,
        40,
        280,
        seed % 2 === 0 ? 'field' : 'test',
        seed % 2 === 0 ? 'field' : 'test',
        `seed-${seed}`
      );

      const inv = engine.invocations[0];
      if (inv.maxSelectedRadius > maxRadAcross100) maxRadAcross100 = inv.maxSelectedRadius;
      if (inv.fallbackTriggered) fallbackCountAcross100++;
      totalGenAcross100 += inv.totalGeneratedCoordinates;
      totalScoreableAcross100 += inv.scoreableCount;
    }

    console.log('\n--- 100 SEEDED RANDOMIZED SCENARIOS SUMMARY ---');
    console.log(`Max Selected Radius Across 100 Seeds : ${maxRadAcross100}`);
    console.log(`Fallback Frequency Across 100 Seeds  : ${fallbackCountAcross100} / 100`);
    console.log(`Average Candidate Survival Ratio     : ${(totalScoreableAcross100 / totalGenAcross100).toFixed(6)}`);

    expect(maxRadAcross100).toBeLessThanOrEqual(32);
  });

  it('6. Production Regression Gates Validation', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
    );
    const rawData = fs.readFileSync(fixturePath, 'utf-8');
    const dataset = JSON.parse(rawData);

    const layout = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });

    const clearance = minimumNodeClearance(dataset.nodes, dataset.edges, layout.positions, { nodeWidth: 120, nodeHeight: 60 });

    console.log('\n--- PRODUCTION REGRESSION GATES ---');
    console.log(`Minimum Physical Clearance : ${clearance.toFixed(2)} px`);

    expect(clearance).toBeGreaterThanOrEqual(40.0 - 1e-3);
  });
});

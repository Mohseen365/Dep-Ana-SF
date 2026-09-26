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

export interface AccountingCounters {
  oracleOccupancyChecks: number;
  candidateOccupancyChecks: number;
  oraclePrimarySegmentChecks: number;
  candidatePrimarySegmentChecks: number;
  oracleSatelliteSegmentChecks: number;
  candidateSatelliteSegmentChecks: number;
}

export const globalAccounting: AccountingCounters = {
  oracleOccupancyChecks: 0,
  candidateOccupancyChecks: 0,
  oraclePrimarySegmentChecks: 0,
  candidatePrimarySegmentChecks: 0,
  oracleSatelliteSegmentChecks: 0,
  candidateSatelliteSegmentChecks: 0,
};

export function resetAccounting() {
  globalAccounting.oracleOccupancyChecks = 0;
  globalAccounting.candidateOccupancyChecks = 0;
  globalAccounting.oraclePrimarySegmentChecks = 0;
  globalAccounting.candidatePrimarySegmentChecks = 0;
  globalAccounting.oracleSatelliteSegmentChecks = 0;
  globalAccounting.candidateSatelliteSegmentChecks = 0;
}

// --------------------------------------------------------------------------
// EXACT ORACLE PREDICATES (from satellites.ts)
// --------------------------------------------------------------------------
export function oracleSegmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
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

export function oracleIsSlotOccupied(
  candidateX: number,
  candidateY: number,
  occupied: Point[],
  minDx: number,
  minDy: number
): boolean {
  for (let i = 0; i < occupied.length; i++) {
    globalAccounting.oracleOccupancyChecks++;
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

// --------------------------------------------------------------------------
// CANDIDATE SPATIAL INDEX STRUCTURES
// --------------------------------------------------------------------------
export class SpatialPointIndex {
  private cellSize: number;
  private grid: Map<string, Point[]> = new Map();

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
  }

  private getKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  public insert(p: Point): void {
    const cx = Math.floor(p.x / this.cellSize);
    const cy = Math.floor(p.y / this.cellSize);
    const key = this.getKey(cx, cy);
    let list = this.grid.get(key);
    if (!list) {
      list = [];
      this.grid.set(key, list);
    }
    list.push(p);
  }

  public queryBoundingBox(minX: number, maxX: number, minY: number, maxY: number): Point[] {
    const startCx = Math.floor(minX / this.cellSize);
    const endCx = Math.floor(maxX / this.cellSize);
    const startCy = Math.floor(minY / this.cellSize);
    const endCy = Math.floor(maxY / this.cellSize);

    const candidates: Point[] = [];
    for (let cx = startCx; cx <= endCx; cx++) {
      for (let cy = startCy; cy <= endCy; cy++) {
        const list = this.grid.get(this.getKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            candidates.push(list[i]);
          }
        }
      }
    }
    return candidates;
  }
}

export class SpatialSegmentIndex {
  private cellSize: number;
  private grid: Map<string, { segment: Segment; id: number }[]> = new Map();
  private nextId = 0;

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
  }

  private getKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  public insert(seg: Segment): void {
    const id = this.nextId++;
    const minX = Math.min(seg.p1.x, seg.p2.x);
    const maxX = Math.max(seg.p1.x, seg.p2.x);
    const minY = Math.min(seg.p1.y, seg.p2.y);
    const maxY = Math.max(seg.p1.y, seg.p2.y);

    const startCx = Math.floor(minX / this.cellSize);
    const endCx = Math.floor(maxX / this.cellSize);
    const startCy = Math.floor(minY / this.cellSize);
    const endCy = Math.floor(maxY / this.cellSize);

    const item = { segment: seg, id };
    for (let cx = startCx; cx <= endCx; cx++) {
      for (let cy = startCy; cy <= endCy; cy++) {
        const key = this.getKey(cx, cy);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(item);
      }
    }
  }

  public querySegmentAABB(seg: Segment): Segment[] {
    const minX = Math.min(seg.p1.x, seg.p2.x);
    const maxX = Math.max(seg.p1.x, seg.p2.x);
    const minY = Math.min(seg.p1.y, seg.p2.y);
    const maxY = Math.max(seg.p1.y, seg.p2.y);

    const startCx = Math.floor(minX / this.cellSize);
    const endCx = Math.floor(maxX / this.cellSize);
    const startCy = Math.floor(minY / this.cellSize);
    const endCy = Math.floor(maxY / this.cellSize);

    const seenIds = new Set<number>();
    const candidates: Segment[] = [];

    for (let cx = startCx; cx <= endCx; cx++) {
      for (let cy = startCy; cy <= endCy; cy++) {
        const list = this.grid.get(this.getKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            if (!seenIds.has(entry.id)) {
              seenIds.add(entry.id);
              const s = entry.segment;
              const sMinX = Math.min(s.p1.x, s.p2.x);
              const sMaxX = Math.max(s.p1.x, s.p2.x);
              const sMinY = Math.min(s.p1.y, s.p2.y);
              const sMaxY = Math.max(s.p1.y, s.p2.y);

              if (!(sMaxX < minX || sMinX > maxX || sMaxY < minY || sMinY > maxY)) {
                candidates.push(s);
              }
            }
          }
        }
      }
    }
    return candidates;
  }
}

// --------------------------------------------------------------------------
// CANDIDATE SPATIAL SLOT GENERATOR
// --------------------------------------------------------------------------
function generateSatelliteSlotsSpatial(
  anchor: Point,
  count: number,
  occupied: Point[],
  occupiedIndex: SpatialPointIndex,
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  targetVector?: Point,
  primarySegments?: Array<Segment>,
  primarySegmentsIndex?: SpatialSegmentIndex,
  placedSatelliteSegments?: Array<Segment>,
  placedSatelliteSegmentsIndex?: SpatialSegmentIndex,
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

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      if (c === 0 && r === 0) continue;

      if (bias === 'test' && c === 0) continue;

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      const candidatePoints = occupiedIndex.queryBoundingBox(x - dx, x + dx, y - dy, y + dy);
      let isOccupied = false;
      for (let i = 0; i < candidatePoints.length; i++) {
        globalAccounting.candidateOccupancyChecks++;
        const pos = candidatePoints[i];
        if (
          Math.abs(pos.x - x) < dx - 1e-3 &&
          Math.abs(pos.y - y) < dy - 1e-3
        ) {
          isOccupied = true;
          break;
        }
      }

      if (isOccupied) continue;

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
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];
        const testSeg: Segment = { p1: ep, p2: candPoint };

        if (primarySegmentsIndex && primarySegments) {
          const candidatePrimarySegs = primarySegmentsIndex.querySegmentAABB(testSeg);
          for (let i = 0; i < candidatePrimarySegs.length; i++) {
            globalAccounting.candidatePrimarySegmentChecks++;
            if (oracleSegmentsIntersect(ep, candPoint, candidatePrimarySegs[i].p1, candidatePrimarySegs[i].p2)) {
              primaryCrossings++;
            }
          }
          for (let i = 0; i < primarySegments.length; i++) {
            globalAccounting.oraclePrimarySegmentChecks++;
          }
        }

        if (placedSatelliteSegmentsIndex && placedSatelliteSegments) {
          const candidateSatSegs = placedSatelliteSegmentsIndex.querySegmentAABB(testSeg);
          for (let i = 0; i < candidateSatSegs.length; i++) {
            globalAccounting.candidateSatelliteSegmentChecks++;
            if (oracleSegmentsIntersect(ep, candPoint, candidateSatSegs[i].p1, candidateSatSegs[i].p2)) {
              satelliteCrossings++;
            }
          }
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            globalAccounting.oracleSatelliteSegmentChecks++;
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
        if (!oracleIsSlotOccupied(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }
  }

  return selectedSlots;
}

// --------------------------------------------------------------------------
// CANDIDATE SPATIAL SATELLITE PLACEMENT ENGINE
// --------------------------------------------------------------------------
const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

export function placeSatellitesSpatial(
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
  const occupiedIndex = new SpatialPointIndex(200);
  for (let i = 0; i < occupiedList.length; i++) {
    occupiedIndex.insert(occupiedList[i]);
  }

  const primarySegments: Array<Segment> = [];
  const primarySegmentsIndex = new SpatialSegmentIndex(200);
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) {
        const seg = { p1, p2 };
        primarySegments.push(seg);
        primarySegmentsIndex.insert(seg);
      }
    }
  }

  const placedSatelliteSegments: Array<Segment> = [];
  const placedSatelliteSegmentsIndex = new SpatialSegmentIndex(200);

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
    if (oracleIsSlotOccupied(trigX, trigY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsSpatial(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        occupiedIndex,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral'
      );
      if (slots.length > 0) {
        trigX = slots[0].x;
        trigY = slots[0].y;
      }
    }

    const trigPoint = { x: trigX, y: trigY };
    positions[triggerItem.nodeId] = trigPoint;
    satellitePositions[triggerItem.nodeId] = trigPoint;
    occupiedList.push(trigPoint);
    occupiedIndex.insert(trigPoint);
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

        if (oracleIsSlotOccupied(handlerX, handlerY, occupiedList, minDx, minDy)) {
          const handlerSlots = generateSatelliteSlotsSpatial(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            occupiedIndex,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            maxSatelliteDistance,
            'neutral'
          );
          if (handlerSlots.length > 0) {
            handlerX = handlerSlots[0].x;
            handlerY = handlerSlots[0].y;
          }
        }

        const hPoint = { x: handlerX, y: handlerY };
        positions[connectedHandlerId] = hPoint;
        satellitePositions[connectedHandlerId] = hPoint;
        occupiedList.push(hPoint);
        occupiedIndex.insert(hPoint);
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
    if (oracleIsSlotOccupied(hX, hY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlotsSpatial(
        { x: hX, y: hY },
        1,
        occupiedList,
        occupiedIndex,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral'
      );
      if (slots.length > 0) {
        hX = slots[0].x;
        hY = slots[0].y;
      }
    }

    const hPoint = { x: hX, y: hY };
    positions[handlerItem.nodeId] = hPoint;
    satellitePositions[handlerItem.nodeId] = hPoint;
    occupiedList.push(hPoint);
    occupiedIndex.insert(hPoint);
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

    const slots = generateSatelliteSlotsSpatial(
      parentPos,
      fields.length,
      occupiedList,
      occupiedIndex,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      targetVector,
      primarySegments,
      primarySegmentsIndex,
      placedSatelliteSegments,
      placedSatelliteSegmentsIndex
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };

      const point = { x: slot.x, y: slot.y };
      positions[fieldItem.nodeId] = point;
      satellitePositions[fieldItem.nodeId] = point;
      occupiedList.push(point);
      occupiedIndex.insert(point);

      const satSeg = { p1: parentPos, p2: point };
      placedSatelliteSegments.push(satSeg);
      placedSatelliteSegmentsIndex.insert(satSeg);

      placedFieldsCount++;
    });
  });

  unanchoredFields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredFields.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredFields[0].nodeId, 'schema'),
    };
    const fallbackSlots = generateSatelliteSlotsSpatial(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      occupiedIndex,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field'
    );

    unanchoredFields.forEach((fieldItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + (nodeHeight + verticalGap),
      };

      const point = { x: slot.x, y: slot.y };
      positions[fieldItem.nodeId] = point;
      satellitePositions[fieldItem.nodeId] = point;
      occupiedList.push(point);
      occupiedIndex.insert(point);
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

    const slots = generateSatelliteSlotsSpatial(
      targetPos,
      tests.length,
      occupiedList,
      occupiedIndex,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      targetVector,
      primarySegments,
      primarySegmentsIndex,
      placedSatelliteSegments,
      placedSatelliteSegmentsIndex
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };

      const point = { x: slot.x, y: slot.y };
      positions[testItem.nodeId] = point;
      satellitePositions[testItem.nodeId] = point;
      occupiedList.push(point);
      occupiedIndex.insert(point);

      const satSeg = { p1: targetPos, p2: point };
      placedSatelliteSegments.push(satSeg);
      placedSatelliteSegmentsIndex.insert(satSeg);

      placedTestsCount++;
    });
  });

  unanchoredTests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredTests.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredTests[0].nodeId, 'application'),
    };
    const fallbackSlots = generateSatelliteSlotsSpatial(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      occupiedIndex,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test'
    );

    unanchoredTests.forEach((testItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + idx * (nodeHeight + verticalGap),
      };

      const point = { x: slot.x, y: slot.y };
      positions[testItem.nodeId] = point;
      satellitePositions[testItem.nodeId] = point;
      occupiedList.push(point);
      occupiedIndex.insert(point);
      placedTestsCount++;
    });
  }

  // STAGE 4: POST-PLACEMENT SATELLITE SLOT PERMUTATION REFINEMENT
  function evaluateTotalCrossings(
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
        if (oracleSegmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) count++;
      }
    }
    return count;
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

// --------------------------------------------------------------------------
// PRNG FOR DETERMINISTIC RANDOMIZED TESTING
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// TEST SUITE
// --------------------------------------------------------------------------
const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Stage 9 Spatial Index A/B Differential Test Suite', () => {
  it('1. Canonical Cloud Spend Tracker Dataset Differential Equivalence', () => {
    resetAccounting();
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
    const candidateResult = placeSatellitesSpatial(nodes, edges, analysis, primaryPositions, { featureMap });

    assertExactEquivalence(oracleResult, candidateResult, 'Canonical CST Dataset');
  });

  it('2. Adversarial Occupancy Boundary Tests', () => {
    const minDx = 160;
    const minDy = 100;
    const occupied = [{ x: 500, y: 500 }];

    const testCases = [
      { candX: 500 + 159.998, candY: 500, expected: true, label: 'dx = 159.998 (Occupied)' },
      { candX: 500 + 160.000, candY: 500, expected: false, label: 'dx = 160.000 (Unoccupied)' },
      { candX: 500 + 160.002, candY: 500, expected: false, label: 'dx = 160.002 (Unoccupied)' },
      { candX: 500, candY: 500 + 99.998, expected: true, label: 'dy = 99.998 (Occupied)' },
      { candX: 500, candY: 500 + 100.000, expected: false, label: 'dy = 100.000 (Unoccupied)' },
      { candX: 500, candY: 500 + 100.002, expected: false, label: 'dy = 100.002 (Unoccupied)' },
    ];

    for (const tc of testCases) {
      const oracleRes = oracleIsSlotOccupied(tc.candX, tc.candY, occupied, minDx, minDy);
      expect(oracleRes, tc.label).toBe(tc.expected);

      const ptIndex = new SpatialPointIndex(200);
      ptIndex.insert(occupied[0]);
      const queried = ptIndex.queryBoundingBox(tc.candX - minDx, tc.candX + minDx, tc.candY - minDy, tc.candY + minDy);

      let candRes = false;
      for (const pt of queried) {
        if (Math.abs(pt.x - tc.candX) < minDx - 1e-3 && Math.abs(pt.y - tc.candY) < minDy - 1e-3) {
          candRes = true;
          break;
        }
      }
      expect(candRes, `Candidate ${tc.label}`).toBe(tc.expected);
    }
  });

  it('3. Adversarial Segment Intersection Boundary Tests', () => {
    const segmentTestCases = [
      {
        label: 'True Crossing',
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 100 },
        q1: { x: 0, y: 100 }, q2: { x: 100, y: 0 },
        expected: true
      },
      {
        label: 'Near Crossing (Parallel Shift)',
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 100 },
        q1: { x: 10, y: 0 }, q2: { x: 110, y: 100 },
        expected: false
      },
      {
        label: 'Shared Endpoint',
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 100 },
        q1: { x: 0, y: 0 }, q2: { x: 50, y: 100 },
        expected: false
      },
      {
        label: 'Endpoint Touching Interior',
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 },
        q1: { x: 50, y: 0 }, q2: { x: 50, y: 50 },
        expected: false
      },
      {
        label: 'Collinear Overlap',
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 },
        q1: { x: 50, y: 0 }, q2: { x: 150, y: 0 },
        expected: false
      },
      {
        label: 'Zero Length Segment',
        p1: { x: 50, y: 50 }, p2: { x: 50, y: 50 },
        q1: { x: 0, y: 0 }, q2: { x: 100, y: 100 },
        expected: false
      }
    ];

    for (const tc of segmentTestCases) {
      const oracleRes = oracleSegmentsIntersect(tc.p1, tc.p2, tc.q1, tc.q2);
      expect(oracleRes, tc.label).toBe(tc.expected);

      const segIndex = new SpatialSegmentIndex(200);
      segIndex.insert({ p1: tc.q1, p2: tc.q2 });
      const candidates = segIndex.querySegmentAABB({ p1: tc.p1, p2: tc.p2 });

      let candRes = false;
      for (const s of candidates) {
        if (oracleSegmentsIntersect(tc.p1, tc.p2, s.p1, s.p2)) {
          candRes = true;
          break;
        }
      }
      expect(candRes, `Candidate ${tc.label}`).toBe(tc.expected);
    }
  });

  it('4. Synthetic Test Scenarios Matrix (10 Scenarios)', () => {
    for (let sId = 1; sId <= 10; sId++) {
      const nodes: ExplorerNode[] = [];
      const edges: ExplorerEdge[] = [];

      nodes.push({ id: 'AnchorObj', name: 'AnchorObj', data: { name: 'AnchorObj', label: 'AnchorObj' } });
      const primaryPositions: Record<string, { x: number; y: number }> = {
        'AnchorObj': { x: 1000, y: 1000 }
      };

      if (sId === 1) {
        nodes.push({ id: 'Field1__c', name: 'Field1__c', data: { name: 'Field1__c', isField: true } });
        edges.push({ id: 'e1', source: 'AnchorObj', target: 'Field1__c', data: {} });
      } else if (sId === 2) {
        for (let i = 1; i <= 3; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      } else if (sId === 3) {
        for (let i = 1; i <= 25; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      } else if (sId === 4) {
        for (let i = 1; i <= 25; i++) {
          nodes.push({ id: `Test${i}Test`, name: `Test${i}Test`, data: { name: `Test${i}Test`, isTest: true } });
          edges.push({ id: `e${i}`, source: `Test${i}Test`, target: 'AnchorObj', data: {} });
        }
      } else if (sId === 5) {
        nodes.push({ id: 'AccountTrigger', name: 'AccountTrigger', data: { name: 'AccountTrigger', type: 'ApexTrigger' } });
        nodes.push({ id: 'AccountHandler', name: 'AccountHandler', data: { name: 'AccountHandler' } });
        edges.push({ id: 'e1', source: 'AnchorObj', target: 'AccountTrigger', data: {} });
        edges.push({ id: 'e2', source: 'AccountTrigger', target: 'AccountHandler', data: {} });
      } else if (sId === 6) {
        const offsets = [
          [-160, -100], [0, -100], [160, -100],
          [-160, 0],               [160, 0],
          [-160, 100],  [0, 100],  [160, 100]
        ];
        offsets.forEach(([dx, dy], idx) => {
          const pId = `PrimaryRing_${idx}`;
          nodes.push({ id: pId, name: pId, data: { name: pId } });
          primaryPositions[pId] = { x: 1000 + dx, y: 1000 + dy };
        });
        for (let i = 1; i <= 5; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      } else if (sId === 7) {
        nodes.push({ id: 'PrimaryA', name: 'PrimaryA', data: {} });
        nodes.push({ id: 'PrimaryB', name: 'PrimaryB', data: {} });
        primaryPositions['PrimaryA'] = { x: 800, y: 1100 };
        primaryPositions['PrimaryB'] = { x: 1200, y: 1100 };
        edges.push({ id: 'eprim', source: 'PrimaryA', target: 'PrimaryB', data: {} });

        for (let i = 1; i <= 5; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      } else if (sId === 8) {
        for (let i = 1; i <= 10; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      } else if (sId === 9) {
        nodes.push({ id: 'AnchorObj2', name: 'AnchorObj2', data: {} });
        primaryPositions['AnchorObj2'] = { x: 1500, y: 1000 };
        for (let i = 1; i <= 5; i++) {
          nodes.push({ id: `FieldA_${i}__c`, name: `FieldA_${i}__c`, data: { name: `FieldA_${i}__c`, isField: true } });
          edges.push({ id: `ea${i}`, source: 'AnchorObj', target: `FieldA_${i}__c`, data: {} });
        }
        for (let i = 1; i <= 5; i++) {
          nodes.push({ id: `FieldB_${i}__c`, name: `FieldB_${i}__c`, data: { name: `FieldB_${i}__c`, isField: true } });
          edges.push({ id: `eb${i}`, source: 'AnchorObj2', target: `FieldB_${i}__c`, data: {} });
        }
      } else if (sId === 10) {
        for (let i = 1; i <= 100; i++) {
          nodes.push({ id: `Field${i}__c`, name: `Field${i}__c`, data: { name: `Field${i}__c`, isField: true } });
          edges.push({ id: `e${i}`, source: 'AnchorObj', target: `Field${i}__c`, data: {} });
        }
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
      const candRes = placeSatellitesSpatial(nodes, edges, analysis, primaryPositions);

      assertExactEquivalence(oracleRes, candRes, `Synthetic Scenario ${sId}`);
    }
  });

  it('5. 100 Seeded Deterministic Randomized Differential Scenarios', () => {
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
        nodes.push({ id: pId, name: pId, data: { name: pId, type: 'CustomObject' } });
        primaryPositions[pId] = {
          x: Math.floor(prng() * 3000),
          y: Math.floor(prng() * 3000)
        };
      }

      for (let i = 0; i < parentIds.length - 1; i++) {
        if (prng() > 0.5) {
          edges.push({
            id: `pedge_${i}`,
            source: parentIds[i],
            target: parentIds[i + 1],
            data: {}
          });
        }
      }

      for (let n = 0; n < nodeCount; n++) {
        const parentId = parentIds[Math.floor(prng() * parentIds.length)];
        const cat = prng();
        if (cat < 0.6) {
          const sId = `Field_${n}__c`;
          nodes.push({ id: sId, name: sId, data: { name: sId, isField: true } });
          edges.push({ id: `sedge_${n}`, source: parentId, target: sId, data: {} });
        } else if (cat < 0.85) {
          const sId = `Test_${n}Test`;
          nodes.push({ id: sId, name: sId, data: { name: sId, isTest: true } });
          edges.push({ id: `sedge_${n}`, source: sId, target: parentId, data: {} });
        } else {
          const sId = `Trigger_${n}Trigger`;
          nodes.push({ id: sId, name: sId, data: { name: sId, type: 'ApexTrigger' } });
          edges.push({ id: `sedge_${n}`, source: parentId, target: sId, data: {} });
        }
      }

      const analysis = computeArchitectureAnalysis(nodes, edges);
      const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
      const candRes = placeSatellitesSpatial(nodes, edges, analysis, primaryPositions);

      try {
        assertExactEquivalence(oracleRes, candRes, `Seed ${seed}`);
      } catch (err) {
        console.error(`[FAILURE] Seed ${seed} failed differential comparison!`);
        throw err;
      }
    }
  });

  it('6. Scale Tiers 1-5 Performance Matrix & Geometry-Check Accounting', { timeout: 600000 }, () => {
    const scaleTiers = [
      { tier: 'Tier 1', nodeCount: 240, runOracle: true },
      { tier: 'Tier 2', nodeCount: 500, runOracle: true },
      { tier: 'Tier 3', nodeCount: 1000, runOracle: true },
      { tier: 'Tier 4', nodeCount: 2000, runOracle: true },
      { tier: 'Tier 5', nodeCount: 5000, runOracle: true },
    ];

    console.log('\n========================================================================');
    console.log('         STAGE 9 SPATIAL INDEX A/B SCALE PERFORMANCE MATRIX');
    console.log('========================================================================');
    console.log('Tier   | Nodes | Edges | Oracle Time | Candidate Time | Speedup | Oracle Checks | Cand Checks | Reduction');
    console.log('---------------------------------------------------------------------------------------------------------');

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

      // Measured Candidate pass
      resetAccounting();
      const t0Cand = performance.now();
      const candRes = placeSatellitesSpatial(nodes, edges, analysis, primaryPositions);
      const t1Cand = performance.now();
      const candTime = t1Cand - t0Cand;
      const candChecks = globalAccounting.candidateOccupancyChecks + globalAccounting.candidatePrimarySegmentChecks + globalAccounting.candidateSatelliteSegmentChecks;

      let oracleTime = 0;
      let oracleChecks = 0;

      if (t.runOracle) {
        resetAccounting();
        const t0Oracle = performance.now();
        const oracleRes = placeSatellites(nodes, edges, analysis, primaryPositions);
        const t1Oracle = performance.now();
        oracleTime = t1Oracle - t0Oracle;
        oracleChecks = globalAccounting.oracleOccupancyChecks + globalAccounting.oraclePrimarySegmentChecks + globalAccounting.oracleSatelliteSegmentChecks;

        assertExactEquivalence(oracleRes, candRes, `${t.tier} (${nodes.length} nodes)`);
      }

      const speedup = oracleTime > 0 ? (oracleTime / Math.max(0.001, candTime)).toFixed(2) + 'x' : 'N/A';
      const checkRatio = oracleChecks > 0 ? ((1 - candChecks / oracleChecks) * 100).toFixed(1) + '%' : 'N/A';

      console.log(
        `${t.tier.padEnd(6)} | ` +
        `${nodes.length.toString().padStart(5)} | ` +
        `${edges.length.toString().padStart(5)} | ` +
        `${(oracleTime > 0 ? oracleTime.toFixed(2) + 'ms' : 'N/A').padStart(11)} | ` +
        `${candTime.toFixed(2).padStart(11)}ms | ` +
        `${speedup.padStart(7)} | ` +
        `${(oracleChecks > 0 ? oracleChecks.toString() : 'N/A').padStart(13)} | ` +
        `${candChecks.toString().padStart(11)} | ` +
        `${checkRatio.padStart(9)}`
      );
    }
  });

  it('7. Full-Pipeline Regression & Quality Gates Validation', () => {
    const fullResult = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });
    const evalMetrics = evaluateLayout(dataset.nodes, dataset.edges, fullResult.positions);

    expect(evalMetrics.detailedCrossings?.primaryPrimaryCrossings).toBe(7812);
    expect(evalMetrics.edgeCrossingCount).toBe(85367);
    expect(evalMetrics.primaryOverlapCount).toBe(0);
    expect(evalMetrics.satelliteOverlapCount).toBe(0);
    expect(evalMetrics.layerViolationCount).toBe(0);
    expect(evalMetrics.minClearance).toBeGreaterThanOrEqual(39.99);
  });
});

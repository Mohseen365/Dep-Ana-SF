import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { performance } from 'perf_hooks';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import type { ExplorerDataSchema, ExplorerEdge, ExplorerNode } from '../types/explorer';
import type { ArchitectureGraphAnalysis, ArchitectureNodeAnalysis } from '../lib/layout/types';
import { findParentProductionNodeId, findParentObjectId } from '../lib/layout/analysis';

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const canonicalDataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let m = result.length, t: T, i: number;
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (m) {
    i = Math.floor(rng() * m--);
    t = result[m];
    result[m] = result[i];
    result[i] = t;
  }
  return result;
}

interface Point {
  x: number;
  y: number;
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

function isTriggerNode(nodeAnalysis: ArchitectureNodeAnalysis): boolean {
  if (nodeAnalysis.nodeType === 'ApexTrigger') return true;
  const name = nodeAnalysis.displayName || nodeAnalysis.nodeId;
  return /(?:trigger|triggers)$/i.test(name);
}

function isHandlerNode(nodeAnalysis: ArchitectureNodeAnalysis): boolean {
  const name = nodeAnalysis.displayName || nodeAnalysis.nodeId;
  return /(?:handler|handlers|controllerextension|controllerext)$/i.test(name) && !nodeAnalysis.isTest;
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

interface RunStats {
  positions: Record<string, { x: number; y: number }>;
  stage4TimeMs: number;
  fullPipelineTimeMs: number;
  segmentIntersectCalls: number;
  cacheHits: number;
  cacheMisses: number;
  selectedPermutations: Array<{ parentId: string; shift: number }>;
}

/**
 * Standard Production (Oracle) Stage 4 Satellite Layout Engine
 */
function runOracleStage9(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>
): RunStats {
  const startFull = performance.now();
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = 120;
  const nodeHeight = 60;
  const horizontalGap = 40;
  const verticalGap = 40;
  const maxSatelliteDistance = 280;

  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  const primarySegments: Array<{ p1: Point; p2: Point }> = [];
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) primarySegments.push({ p1, p2 });
    }
  }

  const occupiedList: Point[] = Object.values(primaryPositions).map(p => ({ x: p.x, y: p.y }));
  const placedSatelliteSegments: Array<{ p1: Point; p2: Point }> = [];

  const allAnalyses = analysis.nodeList;
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

  function generateSatelliteSlots(
    anchor: Point,
    count: number,
    occupied: Point[],
    bias: 'field' | 'test' | 'neutral',
    targetVector?: Point
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
        const ep = anchor;

        for (let i = 0; i < primarySegments.length; i++) {
          if (segmentsIntersect(ep, candPoint, primarySegments[i].p1, primarySegments[i].p2)) {
            primaryCrossings++;
          }
        }

        for (let i = 0; i < placedSatelliteSegments.length; i++) {
          if (segmentsIntersect(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
            satelliteCrossings++;
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

  let segmentIntersectCalls = 0;

  function evaluateTotalCrossingsOracle(
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
        segmentIntersectCalls++;
        if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
          count++;
        }
      }
    }
    return count;
  }

  // Stage 1 Triggers / Handlers
  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue;
    positions[triggerItem.nodeId] = { x: 0, y: 350 };
    occupiedList.push({ x: 0, y: 350 });
  }
  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue;
    positions[handlerItem.nodeId] = { x: 160, y: 350 };
    occupiedList.push({ x: 160, y: 350 });
  }

  // Stage 2 Fields
  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;
    const parentId = fieldItem.parentObjectId || findParentObjectId(fieldItem.node, nodes, edges);
    if (parentId && positions[parentId]) {
      if (!fieldsByParent.has(parentId)) fieldsByParent.set(parentId, []);
      fieldsByParent.get(parentId)!.push(fieldItem);
    }
  }

  fieldsByParent.forEach((fields, parentId) => {
    fields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const parentPos = positions[parentId];

    const pEdges = edges.filter(e => e.source === parentId || e.target === parentId);
    let sumDx = 0, sumDy = 0, pCount = 0;
    for (const e of pEdges) {
      const otherId = e.source === parentId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - parentPos.x;
        sumDy += positions[otherId].y - parentPos.y;
        pCount++;
      }
    }
    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      parentPos,
      fields.length,
      occupiedList,
      'field',
      targetVector
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };
      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: parentPos, p2: { x: slot.x, y: slot.y } });
    });
  });

  // Stage 3 Tests
  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue;
    const targetId = testItem.parentProductionNodeId || findParentProductionNodeId(testItem.node, nodes, edges);
    if (targetId && positions[targetId]) {
      if (!testsByTarget.has(targetId)) testsByTarget.set(targetId, []);
      testsByTarget.get(targetId)!.push(testItem);
    }
  }

  testsByTarget.forEach((tests, targetId) => {
    tests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const targetPos = positions[targetId];

    const tEdges = edges.filter(e => e.source === targetId || e.target === targetId);
    let sumDx = 0, sumDy = 0, pCount = 0;
    for (const e of tEdges) {
      const otherId = e.source === targetId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - targetPos.x;
        sumDy += positions[otherId].y - targetPos.y;
        pCount++;
      }
    }
    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      targetPos,
      tests.length,
      occupiedList,
      'test',
      targetVector
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };
      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: targetPos, p2: { x: slot.x, y: slot.y } });
    });
  });

  // STAGE 4: Slot Permutation Refinement
  const startStage4 = performance.now();
  const selectedPermutations: Array<{ parentId: string; shift: number }> = [];

  fieldsByParent.forEach((fields, parentId) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    let currentBestCrossings = evaluateTotalCrossingsOracle(safeEdges, positions);
    let bestShift = 0;

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateTotalCrossingsOracle(safeEdges, candidatePositions);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        bestShift = shift;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
        });
      }
    }
    selectedPermutations.push({ parentId, shift: bestShift });
  });

  const endStage4 = performance.now();
  const endFull = performance.now();

  return {
    positions,
    stage4TimeMs: endStage4 - startStage4,
    fullPipelineTimeMs: endFull - startFull,
    segmentIntersectCalls,
    cacheHits: 0,
    cacheMisses: segmentIntersectCalls,
    selectedPermutations,
  };
}

/**
 * Candidate Stage 4 Satellite Layout Engine with Fast Allocation-Efficient Edge-Pair Memoization
 */
function runCandidateStage9(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>
): RunStats {
  const startFull = performance.now();
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = 120;
  const nodeHeight = 60;
  const horizontalGap = 40;
  const verticalGap = 40;
  const maxSatelliteDistance = 280;

  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  const primarySegments: Array<{ p1: Point; p2: Point }> = [];
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) primarySegments.push({ p1, p2 });
    }
  }

  const occupiedList: Point[] = Object.values(primaryPositions).map(p => ({ x: p.x, y: p.y }));
  const placedSatelliteSegments: Array<{ p1: Point; p2: Point }> = [];

  const allAnalyses = analysis.nodeList;
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

  function generateSatelliteSlots(
    anchor: Point,
    count: number,
    occupied: Point[],
    bias: 'field' | 'test' | 'neutral',
    targetVector?: Point
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
        const ep = anchor;

        for (let i = 0; i < primarySegments.length; i++) {
          if (segmentsIntersect(ep, candPoint, primarySegments[i].p1, primarySegments[i].p2)) {
            primaryCrossings++;
          }
        }

        for (let i = 0; i < placedSatelliteSegments.length; i++) {
          if (segmentsIntersect(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
            satelliteCrossings++;
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

  // Candidate Test-Only Exact Edge-Pair Memoization Cache for Stage 4
  const edgePairCache = new Map<bigint, boolean>();
  let cacheHits = 0;
  let cacheMisses = 0;
  let segmentIntersectCalls = 0;

  function evaluateTotalCrossingsCandidate(
    edgesList: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>,
    fieldSlotMap?: Map<string, number>
  ): number {
    interface EdgeSeg {
      index: number;
      p1: Point;
      p2: Point;
      s: string;
      t: string;
      stateId: number;
    }
    const segs: EdgeSeg[] = [];
    for (let i = 0; i < edgesList.length; i++) {
      const e = edgesList[i];
      const p1 = posMap[e.source];
      const p2 = posMap[e.target];
      if (p1 && p2) {
        let slotId = 0;
        if (fieldSlotMap) {
          const sSlot = fieldSlotMap.get(e.source);
          const tSlot = fieldSlotMap.get(e.target);
          if (sSlot !== undefined) slotId = sSlot + 1;
          else if (tSlot !== undefined) slotId = tSlot + 1;
        }
        const stateId = (i << 6) | slotId;
        segs.push({ index: i, p1, p2, s: e.source, t: e.target, stateId });
      }
    }

    let count = 0;
    for (let i = 0; i < segs.length; i++) {
      const s1 = segs[i];
      for (let j = i + 1; j < segs.length; j++) {
        const s2 = segs[j];
        if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;

        const stA = s1.stateId < s2.stateId ? s1.stateId : s2.stateId;
        const stB = s1.stateId < s2.stateId ? s2.stateId : s1.stateId;
        const key = (BigInt(stA) << 24n) | BigInt(stB);

        const cached = edgePairCache.get(key);
        let res: boolean;

        if (cached !== undefined) {
          cacheHits++;
          res = cached;
        } else {
          cacheMisses++;
          segmentIntersectCalls++;
          res = segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2);
          edgePairCache.set(key, res);
        }

        if (res) count++;
      }
    }
    return count;
  }

  // Stage 1 Triggers / Handlers
  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue;
    positions[triggerItem.nodeId] = { x: 0, y: 350 };
    occupiedList.push({ x: 0, y: 350 });
  }
  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue;
    positions[handlerItem.nodeId] = { x: 160, y: 350 };
    occupiedList.push({ x: 160, y: 350 });
  }

  // Stage 2 Fields
  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;
    const parentId = fieldItem.parentObjectId || findParentObjectId(fieldItem.node, nodes, edges);
    if (parentId && positions[parentId]) {
      if (!fieldsByParent.has(parentId)) fieldsByParent.set(parentId, []);
      fieldsByParent.get(parentId)!.push(fieldItem);
    }
  }

  fieldsByParent.forEach((fields, parentId) => {
    fields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const parentPos = positions[parentId];

    const pEdges = edges.filter(e => e.source === parentId || e.target === parentId);
    let sumDx = 0, sumDy = 0, pCount = 0;
    for (const e of pEdges) {
      const otherId = e.source === parentId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - parentPos.x;
        sumDy += positions[otherId].y - parentPos.y;
        pCount++;
      }
    }
    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      parentPos,
      fields.length,
      occupiedList,
      'field',
      targetVector
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };
      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: parentPos, p2: { x: slot.x, y: slot.y } });
    });
  });

  // Stage 3 Tests
  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue;
    const targetId = testItem.parentProductionNodeId || findParentProductionNodeId(testItem.node, nodes, edges);
    if (targetId && positions[targetId]) {
      if (!testsByTarget.has(targetId)) testsByTarget.set(targetId, []);
      testsByTarget.get(targetId)!.push(testItem);
    }
  }

  testsByTarget.forEach((tests, targetId) => {
    tests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const targetPos = positions[targetId];

    const tEdges = edges.filter(e => e.source === targetId || e.target === targetId);
    let sumDx = 0, sumDy = 0, pCount = 0;
    for (const e of tEdges) {
      const otherId = e.source === targetId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - targetPos.x;
        sumDy += positions[otherId].y - targetPos.y;
        pCount++;
      }
    }
    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      targetPos,
      tests.length,
      occupiedList,
      'test',
      targetVector
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };
      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: targetPos, p2: { x: slot.x, y: slot.y } });
    });
  });

  // STAGE 4: Slot Permutation Refinement
  const startStage4 = performance.now();
  const selectedPermutations: Array<{ parentId: string; shift: number }> = [];

  fieldsByParent.forEach((fields, parentId) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    const initialFieldSlotMap = new Map<string, number>();
    fieldIds.forEach((id, idx) => initialFieldSlotMap.set(id, idx));

    let currentBestCrossings = evaluateTotalCrossingsCandidate(safeEdges, positions, initialFieldSlotMap);
    let bestShift = 0;

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      const candidateFieldSlotMap = new Map<string, number>();

      fieldIds.forEach((id, idx) => {
        const slotIdx = (idx + shift) % fieldIds.length;
        candidatePositions[id] = slots[slotIdx];
        candidateFieldSlotMap.set(id, slotIdx);
      });

      const candidateCrossings = evaluateTotalCrossingsCandidate(safeEdges, candidatePositions, candidateFieldSlotMap);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        bestShift = shift;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
        });
      }
    }
    selectedPermutations.push({ parentId, shift: bestShift });
  });

  const endStage4 = performance.now();
  const endFull = performance.now();

  return {
    positions,
    stage4TimeMs: endStage4 - startStage4,
    fullPipelineTimeMs: endFull - startFull,
    segmentIntersectCalls,
    cacheHits,
    cacheMisses,
    selectedPermutations,
  };
}

describe('Stage 4 Exact Edge-Pair Memoization A/B Experiment', () => {
  it('1. Oracle vs Candidate Benchmark on Canonical Fixture', () => {
    const nodes = canonicalDataset.nodes;
    const edges = canonicalDataset.edges;
    const analysis = computeArchitectureAnalysis(nodes, edges);
    const fullResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult.positions[item.nodeId];
        }
      }
    }

    // Warm-up runs
    runOracleStage9(nodes, edges, analysis, primaryPositions);
    runCandidateStage9(nodes, edges, analysis, primaryPositions);

    // Warm benchmark iterations (3 warm runs each)
    const oracleRuns: RunStats[] = [];
    const candidateRuns: RunStats[] = [];

    for (let r = 0; r < 3; r++) {
      oracleRuns.push(runOracleStage9(nodes, edges, analysis, primaryPositions));
      candidateRuns.push(runCandidateStage9(nodes, edges, analysis, primaryPositions));
    }

    const medianOracleStage4Time = oracleRuns.map(r => r.stage4TimeMs).sort((a, b) => a - b)[1];
    const medianCandidateStage4Time = candidateRuns.map(r => r.stage4TimeMs).sort((a, b) => a - b)[1];

    const medianOracleFullTime = oracleRuns.map(r => r.fullPipelineTimeMs).sort((a, b) => a - b)[1];
    const medianCandidateFullTime = candidateRuns.map(r => r.fullPipelineTimeMs).sort((a, b) => a - b)[1];

    const cand = candidateRuns[0];
    const oracle = oracleRuns[0];

    // Coordinate drift check
    let maxDrift = 0;
    for (const id of Object.keys(oracle.positions)) {
      const p1 = oracle.positions[id];
      const p2 = cand.positions[id];
      const d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (d > maxDrift) maxDrift = d;
    }

    // Evaluate layout metrics
    const oracleEval = evaluateLayout(nodes, edges, oracle.positions);
    const candEval = evaluateLayout(nodes, edges, cand.positions);

    // Permutation equality check
    expect(cand.selectedPermutations).toEqual(oracle.selectedPermutations);

    // Hard regression gates check
    expect(maxDrift).toBe(0);
    expect(candEval.detailedCrossings?.primaryPrimaryCrossings).toBe(oracleEval.detailedCrossings?.primaryPrimaryCrossings);
    expect(candEval.edgeCrossingCount).toBe(oracleEval.edgeCrossingCount);
    expect(candEval.primaryOverlapCount).toBe(oracleEval.primaryOverlapCount);
    expect(candEval.satelliteOverlapCount).toBe(oracleEval.satelliteOverlapCount);
    expect(candEval.layerViolationCount).toBe(oracleEval.layerViolationCount);
    expect(candEval.minClearance).toBe(oracleEval.minClearance);

    const stage4Delta = medianCandidateStage4Time - medianOracleStage4Time;
    const stage4ImprovementPct = medianOracleStage4Time > 0
      ? ((medianOracleStage4Time - medianCandidateStage4Time) / medianOracleStage4Time) * 100
      : 0;

    const hitRate = cand.cacheHits + cand.cacheMisses > 0
      ? (cand.cacheHits / (cand.cacheHits + cand.cacheMisses)) * 100
      : 0;

    console.log('\n================================================================');
    console.log('STAGE 4 EXACT EDGE-PAIR MEMOIZATION A/B BENCHMARK RESULTS');
    console.log('================================================================');
    console.log(`Oracle Stage 4 Median Time    : ${medianOracleStage4Time.toFixed(2)} ms`);
    console.log(`Candidate Stage 4 Median Time : ${medianCandidateStage4Time.toFixed(2)} ms`);
    console.log(`Stage 4 Time Delta            : ${stage4Delta.toFixed(2)} ms (${stage4ImprovementPct.toFixed(2)}% improvement)`);
    console.log(`Oracle Full Pipeline Median   : ${medianOracleFullTime.toFixed(2)} ms`);
    console.log(`Candidate Full Pipeline Median: ${medianCandidateFullTime.toFixed(2)} ms`);
    console.log(`Oracle Segments Intersect Calls : ${oracle.segmentIntersectCalls}`);
    console.log(`Candidate Intersect Executions  : ${cand.segmentIntersectCalls}`);
    console.log(`Candidate Cache Hits           : ${cand.cacheHits}`);
    console.log(`Candidate Cache Misses         : ${cand.cacheMisses}`);
    console.log(`Cache Hit Rate                 : ${hitRate.toFixed(2)}%`);
    console.log(`Coordinate Drift               : ${maxDrift.toFixed(5)} px`);
    console.log(`C_pp                           : ${candEval.detailedCrossings?.primaryPrimaryCrossings}`);
    console.log(`C_total                        : ${candEval.edgeCrossingCount}`);
    console.log('================================================================\n');

    expect(oracle.positions).toEqual(cand.positions);
  });

  it('2. Shuffled Input & Determinism Validation', () => {
    const nodes = canonicalDataset.nodes;
    const edges = canonicalDataset.edges;
    const analysis = computeArchitectureAnalysis(nodes, edges);
    const fullResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult.positions[item.nodeId];
        }
      }
    }

    const baseCand = runCandidateStage9(nodes, edges, analysis, primaryPositions);

    // Determinism
    for (let i = 0; i < 3; i++) {
      const run = runCandidateStage9(nodes, edges, analysis, primaryPositions);
      expect(run.positions).toEqual(baseCand.positions);
    }

    // Shuffled input order
    const shuffledNodes = shuffleArray(nodes, 301);
    const shuffledEdges = shuffleArray(edges, 311);
    const shuffledAnalysis = computeArchitectureAnalysis(shuffledNodes, shuffledEdges);

    const run = runCandidateStage9(shuffledNodes, shuffledEdges, shuffledAnalysis, primaryPositions);

    let maxDrift = 0;
    for (const id of Object.keys(baseCand.positions)) {
      const p1 = baseCand.positions[id];
      const p2 = run.positions[id];
      if (p1 && p2) {
        const d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        if (d > maxDrift) maxDrift = d;
      }
    }
    expect(maxDrift).toBe(0);
  });
});

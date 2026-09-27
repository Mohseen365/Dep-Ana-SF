import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerDataSchema, ExplorerEdge, ExplorerNode } from '../types/explorer';
import type { ArchitectureGraphAnalysis, ArchitectureNodeAnalysis } from '../lib/layout/types';
import { findParentProductionNodeId, findParentObjectId } from '../lib/layout/analysis';

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const canonicalDataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

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

export class IntersectionTracker {
  totalS9 = 0;
  totalS4 = 0;

  countS9 = new Map<string, number>();
  countS4 = new Map<string, number>();

  resS9 = new Map<string, boolean>();
  resS4 = new Map<string, boolean>();

  inconsistentCount = 0;

  recordS9(pairKey: string, result: boolean) {
    this.totalS9++;
    const prevCount = this.countS9.get(pairKey) || 0;
    this.countS9.set(pairKey, prevCount + 1);

    const prevRes = this.resS9.get(pairKey);
    if (prevRes !== undefined && prevRes !== result) {
      this.inconsistentCount++;
    } else {
      this.resS9.set(pairKey, result);
    }
  }

  recordS4(pairKey: string, result: boolean) {
    this.totalS4++;
    const prevCount = this.countS4.get(pairKey) || 0;
    this.countS4.set(pairKey, prevCount + 1);

    const prevRes = this.resS4.get(pairKey);
    if (prevRes !== undefined && prevRes !== result) {
      this.inconsistentCount++;
    } else {
      this.resS4.set(pairKey, result);
    }

    const s9Res = this.resS9.get(pairKey);
    if (s9Res !== undefined && s9Res !== result) {
      this.inconsistentCount++;
    }
  }

  getMetrics() {
    const uniqueS9 = this.countS9.size;
    const dupsS9 = this.totalS9 - uniqueS9;
    const dupPctS9 = this.totalS9 > 0 ? (dupsS9 / this.totalS9) * 100 : 0;
    let maxReuseS9 = 0;
    for (const c of this.countS9.values()) {
      if (c > maxReuseS9) maxReuseS9 = c;
    }

    const uniqueS4 = this.countS4.size;
    const dupsS4 = this.totalS4 - uniqueS4;
    const dupPctS4 = this.totalS4 > 0 ? (dupsS4 / this.totalS4) * 100 : 0;
    let maxReuseS4 = 0;
    for (const c of this.countS4.values()) {
      if (c > maxReuseS4) maxReuseS4 = c;
    }

    // Combined metrics
    const combinedCount = new Map<string, number>();
    for (const [k, v] of this.countS9.entries()) {
      combinedCount.set(k, (combinedCount.get(k) || 0) + v);
    }
    for (const [k, v] of this.countS4.entries()) {
      combinedCount.set(k, (combinedCount.get(k) || 0) + v);
    }

    const totalCombined = this.totalS9 + this.totalS4;
    const uniqueCombined = combinedCount.size;
    const dupsCombined = totalCombined - uniqueCombined;
    const dupPctCombined = totalCombined > 0 ? (dupsCombined / totalCombined) * 100 : 0;
    let maxReuseCombined = 0;
    for (const c of combinedCount.values()) {
      if (c > maxReuseCombined) maxReuseCombined = c;
    }

    let crossBoundaryCount = 0;
    for (const k of this.countS4.keys()) {
      if (this.countS9.has(k)) crossBoundaryCount++;
    }

    return {
      s9: {
        total: this.totalS9,
        unique: uniqueS9,
        dups: dupsS9,
        dupPct: dupPctS9,
        maxReuse: maxReuseS9,
      },
      s4: {
        total: this.totalS4,
        unique: uniqueS4,
        dups: dupsS4,
        dupPct: dupPctS4,
        maxReuse: maxReuseS4,
      },
      combined: {
        total: totalCombined,
        unique: uniqueCombined,
        dups: dupsCombined,
        dupPct: dupPctCombined,
        maxReuse: maxReuseCombined,
      },
      crossBoundaryKeys: crossBoundaryCount,
      inconsistentCount: this.inconsistentCount,
    };
  }
}

/**
 * Instrumented version of placeSatellites for measurement only.
 * Production files remain 100% unchanged.
 */
function placeSatellitesMeasured(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  tracker: IntersectionTracker
): Record<string, { x: number; y: number }> {
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = 120;
  const nodeHeight = 60;
  const horizontalGap = 40;
  const verticalGap = 40;
  const maxSatelliteDistance = 280;

  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  const primaryEdgeIndexMap = new Map<string, number>();
  const primarySegments: Array<{ p1: Point; p2: Point; edgeId: string; index: number }> = [];

  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) {
        const idx = primarySegments.length;
        primarySegments.push({ p1, p2, edgeId: e.id, index: idx });
        primaryEdgeIndexMap.set(e.id, idx);
      }
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

  function generateSatelliteSlotsMeasured(
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

        const tetherKey = `Tether(${ep.x},${ep.y}->${candPoint.x},${candPoint.y})`;

        for (let i = 0; i < primarySegments.length; i++) {
          const prim = primarySegments[i];
          const res = segmentsIntersect(ep, candPoint, prim.p1, prim.p2);
          if (res) primaryCrossings++;

          tracker.recordS9(`${tetherKey} | PrimSeg(${prim.index})`, res);
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

  function evaluateTotalCrossingsMeasured(
    edgesList: ExplorerEdge[],
    posMap: Record<string, { x: number; y: number }>
  ): number {
    interface EdgeSeg {
      p1: Point;
      p2: Point;
      s: string;
      t: string;
      edgeId: string;
      isPrimary: boolean;
      primaryIndex?: number;
    }
    const segs: EdgeSeg[] = [];
    for (let i = 0; i < edgesList.length; i++) {
      const e = edgesList[i];
      const p1 = posMap[e.source];
      const p2 = posMap[e.target];
      if (p1 && p2) {
        const primIdx = primaryEdgeIndexMap.get(e.id);
        segs.push({
          p1,
          p2,
          s: e.source,
          t: e.target,
          edgeId: e.id,
          isPrimary: primIdx !== undefined,
          primaryIndex: primIdx,
        });
      }
    }

    let count = 0;
    for (let i = 0; i < segs.length; i++) {
      const s1 = segs[i];
      for (let j = i + 1; j < segs.length; j++) {
        const s2 = segs[j];
        if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;

        const res = segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2);
        if (res) count++;

        if (s1.isPrimary && !s2.isPrimary) {
          const tetherKey = `Tether(${s2.p1.x},${s2.p1.y}->${s2.p2.x},${s2.p2.y})`;
          tracker.recordS4(`${tetherKey} | PrimSeg(${s1.primaryIndex})`, res);
        } else if (!s1.isPrimary && s2.isPrimary) {
          const tetherKey = `Tether(${s1.p1.x},${s1.p1.y}->${s1.p2.x},${s1.p2.y})`;
          tracker.recordS4(`${tetherKey} | PrimSeg(${s2.primaryIndex})`, res);
        } else if (s1.isPrimary && s2.isPrimary) {
          const tetherKey = `Tether(${s1.p1.x},${s1.p1.y}->${s1.p2.x},${s1.p2.y})`;
          tracker.recordS4(`${tetherKey} | PrimSeg(${s2.primaryIndex})`, res);
        }
      }
    }
    return count;
  }

  // --- STAGE 1: Microclusters ---
  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue;
    let trigX = 0;
    let trigY = 350;
    positions[triggerItem.nodeId] = { x: trigX, y: trigY };
    occupiedList.push({ x: trigX, y: trigY });
  }

  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue;
    let hX = 0 + nodeWidth + horizontalGap;
    let hY = 350;
    positions[handlerItem.nodeId] = { x: hX, y: hY };
    occupiedList.push({ x: hX, y: hY });
  }

  // --- STAGE 2: Fields ---
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

    const slots = generateSatelliteSlotsMeasured(
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

  // --- STAGE 3: Tests ---
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

    const slots = generateSatelliteSlotsMeasured(
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

  // --- STAGE 4: Slot Permutation Refinement ---
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
        });
      }
    }
  });

  return positions;
}

describe('Stage 9 Intersection Duplicate-Reuse Forensic Investigation', () => {
  it('1. Measure Exact Duplicate Work for Canonical Cloud Spend Tracker Fixture', () => {
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

    const tracker = new IntersectionTracker();
    placeSatellitesMeasured(nodes, edges, analysis, primaryPositions, tracker);

    const m = tracker.getMetrics();

    console.log('\n================================================================');
    console.log('CANONICAL CLOUD SPEND TRACKER FORENSIC MEASUREMENTS');
    console.log('================================================================');
    console.log(`Stage 9 Scoring Calls    : Total=${m.s9.total}, Unique=${m.s9.unique}, Dups=${m.s9.dups} (${m.s9.dupPct.toFixed(2)}%), MaxReuse=${m.s9.maxReuse}`);
    console.log(`Stage 4 Refinement Calls : Total=${m.s4.total}, Unique=${m.s4.unique}, Dups=${m.s4.dups} (${m.s4.dupPct.toFixed(2)}%), MaxReuse=${m.s4.maxReuse}`);
    console.log(`Combined Calls           : Total=${m.combined.total}, Unique=${m.combined.unique}, Dups=${m.combined.dups} (${m.combined.dupPct.toFixed(2)}%), MaxReuse=${m.combined.maxReuse}`);
    console.log(`Stage 9 -> Stage 4 Shared Keys: ${m.crossBoundaryKeys}`);
    console.log(`Inconsistent Results across identical pairs: ${m.inconsistentCount}`);
    console.log('================================================================\n');

    expect(m.inconsistentCount).toBe(0);
  });
});

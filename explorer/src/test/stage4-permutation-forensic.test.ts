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

export interface PermutationRecord {
  groupId: string;
  fieldCount: number;
  shift: number;
  assignmentStateKey: string;
  crossingScore: number;
  isDuplicateState: boolean;
}

export interface GroupSummary {
  groupId: string;
  fieldCount: number;
  evaluations: number;
  uniqueStates: number;
  repeats: number;
  scores: number[];
}

/**
 * Instrumented Stage 4 layout measurement harness.
 * Production source code remains 100% untouched.
 */
function measureStage4Permutations(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>
): {
  records: PermutationRecord[];
  groupSummaries: GroupSummary[];
  totalGroups: number;
  totalEvaluations: number;
  totalUniqueStates: number;
  totalExactDuplicates: number;
  maxEvaluationsPerGroup: number;
} {
  const records: PermutationRecord[] = [];
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

  // STAGE 4: Slot Permutation Refinement Instrumentation
  const groupSummaries: GroupSummary[] = [];

  fieldsByParent.forEach((fields, parentId) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    const seenGroupStates = new Set<string>();
    const groupScores: number[] = [];

    // Helper to form state key for field -> slot assignment
    function buildStateKey(candPos: Record<string, { x: number; y: number }>): string {
      return fieldIds.map(id => `${id}:${candPos[id].x},${candPos[id].y}`).join('|');
    }

    // Baseline (shift 0)
    let currentBestCrossings = evaluateTotalCrossings(safeEdges, positions);
    const baseKey = buildStateKey(positions);
    seenGroupStates.add(baseKey);
    groupScores.push(currentBestCrossings);

    records.push({
      groupId: parentId,
      fieldCount: fieldIds.length,
      shift: 0,
      assignmentStateKey: baseKey,
      crossingScore: currentBestCrossings,
      isDuplicateState: false,
    });

    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candKey = buildStateKey(candidatePositions);
      const isDup = seenGroupStates.has(candKey);
      seenGroupStates.add(candKey);

      const candidateCrossings = evaluateTotalCrossings(safeEdges, candidatePositions);
      groupScores.push(candidateCrossings);

      records.push({
        groupId: parentId,
        fieldCount: fieldIds.length,
        shift,
        assignmentStateKey: candKey,
        crossingScore: candidateCrossings,
        isDuplicateState: isDup,
      });

      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
        });
      }
    }

    const groupEvals = Math.min(fieldIds.length, 5);
    const uniqueStates = seenGroupStates.size;
    const repeats = groupEvals - uniqueStates;

    groupSummaries.push({
      groupId: parentId,
      fieldCount: fieldIds.length,
      evaluations: groupEvals,
      uniqueStates,
      repeats,
      scores: groupScores,
    });
  });

  const totalGroups = groupSummaries.length;
  const totalEvaluations = records.length;
  const totalUniqueStates = groupSummaries.reduce((sum, g) => sum + g.uniqueStates, 0);
  const totalExactDuplicates = groupSummaries.reduce((sum, g) => sum + g.repeats, 0);
  const maxEvaluationsPerGroup = Math.max(...groupSummaries.map(g => g.evaluations), 0);

  return {
    records,
    groupSummaries,
    totalGroups,
    totalEvaluations,
    totalUniqueStates,
    totalExactDuplicates,
    maxEvaluationsPerGroup,
  };
}

describe('Stage 4 Permutation Evaluation Forensic Investigation', () => {
  it('1. Measure Current Stage 4 Permutation Work for Canonical Cloud Spend Tracker Fixture', () => {
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

    const res = measureStage4Permutations(nodes, edges, analysis, primaryPositions);

    console.log('\n================================================================');
    console.log('STAGE 4 PERMUTATION EVALUATION FORENSIC MEASUREMENTS');
    console.log('================================================================');
    console.log(`Stage 4 Field Parent Groups      : ${res.totalGroups}`);
    console.log(`Total Permutation Evaluations    : ${res.totalEvaluations}`);
    console.log(`Unique Permutation States        : ${res.totalUniqueStates}`);
    console.log(`Exact Duplicate Evaluations      : ${res.totalExactDuplicates}`);
    console.log(`Maximum Evaluations Per Group    : ${res.maxEvaluationsPerGroup}`);
    console.log('----------------------------------------------------------------');
    console.log('Per-Group Breakdown:');
    res.groupSummaries.forEach((g) => {
      console.log(`  Group: ${g.groupId.padEnd(25)} | Fields: ${g.fieldCount} | Evals: ${g.evaluations} | Unique: ${g.uniqueStates} | Repeats: ${g.repeats} | Scores: [${g.scores.join(', ')}]`);
    });
    console.log('================================================================\n');

    expect(res.totalGroups).toBeGreaterThan(0);
    expect(res.totalExactDuplicates).toBe(0);
  });
});

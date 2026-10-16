import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tokenizeChunk } from './phase30a-softwrap-experiment.test';
import { loadRealProjectData } from './phase28r-adaptive-capacity.test';

export interface RowGroup {
  rowIndex: number;
  yBase: number;
  nodeIds: string[];
  maxModelHeight: number;
  featureOrBucketKey?: string;
}

export interface LocalClearanceConfig {
  candidateId: string;
  strategy: 'A_RowBoundary' | 'B_NodeLevel';
  gapY: number;
  usePipelineCoupling?: boolean;
}

export interface DisplacedNodeMetric {
  id: string;
  origX: number;
  origY: number;
  newX: number;
  newY: number;
  displacement: number;
}

export interface ClearanceExecutionResult {
  candidateId: string;
  projectId: string;
  strategy: 'A_RowBoundary' | 'B_NodeLevel';
  gapY: number;
  positions: Record<string, { x: number; y: number }>;
  displayLabels: Record<string, string>;
  totalNodes: number;
  nodesMoved: number;
  pctMoved: number;
  meanDisplacement: number;
  p95Displacement: number;
  maxDisplacement: number;
  changedRowCount: number;
  unchangedRowCount: number;
  width: number;
  height: number;
  area: number;
  deltaWidthVsR4: number;
  deltaHeightVsR4: number;
  deltaAreaVsR4: number;
  hasNaNOrInfinity: boolean;
  downstreamCascade: boolean;
}

export function getChunkedLabelHeight(displayLabel: string): number {
  const lines = displayLabel.split('\n').length;
  return Math.max(60, 60 + (lines - 1) * 18);
}

export function groupNodesIntoRows(
  positions: Record<string, { x: number; y: number }>,
  displayLabels: Record<string, string>,
  tolerance: number = 2.0
): RowGroup[] {
  const nodeIds = Object.keys(positions);
  const sortedByY = [...nodeIds].sort((a, b) => positions[a].y - positions[b].y);

  const rows: RowGroup[] = [];

  sortedByY.forEach((id) => {
    const pos = positions[id];
    const label = displayLabels[id] || id;
    const h = getChunkedLabelHeight(label);

    let foundRow = rows.find((r) => Math.abs(r.yBase - pos.y) <= tolerance);
    if (!foundRow) {
      foundRow = {
        rowIndex: rows.length,
        yBase: pos.y,
        nodeIds: [],
        maxModelHeight: h,
      };
      rows.push(foundRow);
    }

    foundRow.nodeIds.push(id);
    if (h > foundRow.maxModelHeight) {
      foundRow.maxModelHeight = h;
    }
  });

  rows.sort((a, b) => a.yBase - b.yBase);
  rows.forEach((r, idx) => (r.rowIndex = idx));

  return rows;
}

export function applyStrategyARowClearance(
  basePositions: Record<string, { x: number; y: number }>,
  displayLabels: Record<string, string>,
  gapY: number
): {
  positions: Record<string, { x: number; y: number }>;
  rows: RowGroup[];
  changedRowsCount: number;
  unchangedRowsCount: number;
} {
  const rows = groupNodesIntoRows(basePositions, displayLabels);
  const updatedPositions: Record<string, { x: number; y: number }> = { ...basePositions };

  let cumulativeShift = 0;
  let changedRowsCount = 0;
  let unchangedRowsCount = 0;

  const newYBases: number[] = new Array(rows.length).fill(0);

  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      newYBases[0] = rows[0].yBase;
    } else {
      const prevY = newYBases[i - 1];
      const prevRow = rows[i - 1];
      const currRow = rows[i];

      const reqDy = prevRow.maxModelHeight / 2 + currRow.maxModelHeight / 2 + gapY;
      const targetY = prevY + reqDy;
      const unshiftedY = currRow.yBase + cumulativeShift;

      if (targetY > unshiftedY) {
        newYBases[i] = targetY;
        cumulativeShift = targetY - currRow.yBase;
        changedRowsCount++;
      } else {
        newYBases[i] = unshiftedY;
        unchangedRowsCount++;
      }
    }

    const shift = newYBases[i] - rows[i].yBase;
    rows[i].nodeIds.forEach((id) => {
      updatedPositions[id] = {
        x: basePositions[id].x,
        y: basePositions[id].y + shift,
      };
    });
  }

  return {
    positions: updatedPositions,
    rows,
    changedRowsCount,
    unchangedRowsCount,
  };
}

export function applyStrategyBNodeClearance(
  basePositions: Record<string, { x: number; y: number }>,
  displayLabels: Record<string, string>,
  gapY: number
): {
  positions: Record<string, { x: number; y: number }>;
  rows: RowGroup[];
  changedRowsCount: number;
  unchangedRowsCount: number;
} {
  const rows = groupNodesIntoRows(basePositions, displayLabels);
  const updatedPositions: Record<string, { x: number; y: number }> = { ...basePositions };

  let changedRowsCount = 0;
  let unchangedRowsCount = 0;

  for (let i = 0; i < rows.length - 1; i++) {
    const rowA = rows[i];
    const rowB = rows[i + 1];

    let rowHadMoves = false;

    rowB.nodeIds.forEach((idB) => {
      const posB = updatedPositions[idB];
      const hB = getChunkedLabelHeight(displayLabels[idB] || idB);

      let maxRequiredYForB = posB.y;

      rowA.nodeIds.forEach((idA) => {
        const posA = updatedPositions[idA];
        const hA = getChunkedLabelHeight(displayLabels[idA] || idA);

        const dx = Math.abs(posA.x - posB.x);
        if (dx < 120) {
          const reqDy = hA / 2 + hB / 2 + gapY;
          const targetY = posA.y + reqDy;
          if (targetY > maxRequiredYForB) {
            maxRequiredYForB = targetY;
          }
        }
      });

      if (maxRequiredYForB > posB.y) {
        updatedPositions[idB] = {
          x: posB.x,
          y: maxRequiredYForB,
        };
        rowHadMoves = true;
      }
    });

    if (rowHadMoves) changedRowsCount++;
    else unchangedRowsCount++;
  }

  return {
    positions: updatedPositions,
    rows,
    changedRowsCount,
    unchangedRowsCount,
  };
}

export function evaluateLocalClearanceCandidate(
  projectId: 'cloud-spend-tracker' | 'pbim',
  baseR4Positions: Record<string, { x: number; y: number }>,
  baseR4Labels: Record<string, string>,
  baseArea: number,
  baseWidth: number,
  baseHeight: number,
  config: LocalClearanceConfig
): ClearanceExecutionResult {
  const displayLabels: Record<string, string> = {};
  Object.keys(baseR4Labels).forEach((id) => {
    const raw = baseR4Labels[id];
    displayLabels[id] = tokenizeChunk(raw, 12);
  });

  const basePositions = baseR4Positions;

  let clearanceRes: {
    positions: Record<string, { x: number; y: number }>;
    rows: RowGroup[];
    changedRowsCount: number;
    unchangedRowsCount: number;
  };

  if (config.strategy === 'A_RowBoundary') {
    clearanceRes = applyStrategyARowClearance(basePositions, displayLabels, config.gapY);
  } else {
    clearanceRes = applyStrategyBNodeClearance(basePositions, displayLabels, config.gapY);
  }

  const finalPositions = clearanceRes.positions;
  const nodeIds = Object.keys(finalPositions);
  const totalNodes = nodeIds.length;

  const displacements: DisplacedNodeMetric[] = [];
  let movedCount = 0;
  let hasNaNOrInfinity = false;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodeIds.forEach((id) => {
    const orig = basePositions[id];
    const curr = finalPositions[id];

    if (!curr || !Number.isFinite(curr.x) || !Number.isFinite(curr.y)) {
      hasNaNOrInfinity = true;
      return;
    }

    if (curr.x - 60 < minX) minX = curr.x - 60;
    if (curr.x + 60 > maxX) maxX = curr.x + 60;
    if (curr.y - 30 < minY) minY = curr.y - 30;
    if (curr.y + 30 > maxY) maxY = curr.y + 30;

    const dx = curr.x - orig.x;
    const dy = curr.y - orig.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1e-3) {
      movedCount++;
      displacements.push({
        id,
        origX: orig.x,
        origY: orig.y,
        newX: curr.x,
        newY: curr.y,
        displacement: dist,
      });
    }
  });

  displacements.sort((a, b) => a.displacement - b.displacement);

  const meanDisp =
    movedCount > 0
      ? displacements.reduce((acc, d) => acc + d.displacement, 0) / movedCount
      : 0;

  const p95Disp =
    movedCount > 0
      ? displacements[Math.floor(displacements.length * 0.95)].displacement
      : 0;

  const maxDisp =
    movedCount > 0 ? displacements[displacements.length - 1].displacement : 0;

  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);
  const area = width * height;

  const deltaWidthVsR4 = width - baseWidth;
  const deltaHeightVsR4 = height - baseHeight;
  const deltaAreaVsR4 = area - baseArea;

  return {
    candidateId: config.candidateId,
    projectId,
    strategy: config.strategy,
    gapY: config.gapY,
    positions: finalPositions,
    displayLabels,
    totalNodes,
    nodesMoved: movedCount,
    pctMoved: Math.round((movedCount / totalNodes) * 10000) / 100,
    meanDisplacement: Math.round(meanDisp * 100) / 100,
    p95Displacement: Math.round(p95Disp * 100) / 100,
    maxDisplacement: Math.round(maxDisp * 100) / 100,
    changedRowCount: clearanceRes.changedRowsCount,
    unchangedRowCount: clearanceRes.unchangedRowsCount,
    width,
    height,
    area,
    deltaWidthVsR4,
    deltaHeightVsR4,
    deltaAreaVsR4,
    hasNaNOrInfinity,
    downstreamCascade: movedCount > totalNodes * 0.8,
  };
}

function loadR4FixturePositions(projectId: 'cloud-spend-tracker' | 'pbim') {
  const rootDir = path.resolve(__dirname, '../../..');
  const posPath = path.join(rootDir, 'audit-fixtures', 'phase28r-positions-and-labels.json');
  if (!fs.existsSync(posPath)) {
    throw new Error(`Fixture file not found: ${posPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
  const projData = raw[projectId]['R4_AdaptiveCapacity'];

  const positions: Record<string, { x: number; y: number }> = projData.positions;
  const displayLabels: Record<string, string> = projData.displayLabels;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  Object.keys(positions).forEach((id) => {
    const p = positions[id];
    if (p.x - 60 < minX) minX = p.x - 60;
    if (p.x + 60 > maxX) maxX = p.x + 60;
    if (p.y - 30 < minY) minY = p.y - 30;
    if (p.y + 30 > maxY) maxY = p.y + 30;
  });

  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);
  const area = width * height;

  return { positions, displayLabels, width, height, area };
}

describe('PHASE 30B — Adaptive Label-Height Row Clearance Harness', () => {
  it('Verifies real project dataset provenance and R4 baseline execution', () => {
    const cst = loadRealProjectData('cloud-spend-tracker');
    const pbim = loadRealProjectData('pbim');

    expect(cst.sha256).toBe('1597135320cbf0a13e6ee932e13b8dbdeb6771e0745f1ab1651fe08a17087907');
    expect(pbim.sha256).toBe('d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b');
    expect(cst.nodes.length).toBe(240);
    expect(pbim.nodes.length).toBe(528);
  });

  it('Executes Strategy A and Strategy B across Candidate Matrix (gapY = 0, 2, 5, 10, 15, 20, 25, 30) for PBIM and CST', () => {
    const projectsToEvaluate: ('pbim' | 'cloud-spend-tracker')[] = ['pbim', 'cloud-spend-tracker'];
    const strategies: ('A_RowBoundary' | 'B_NodeLevel')[] = ['A_RowBoundary', 'B_NodeLevel'];
    const gaps = [0, 2, 5, 10, 15, 20, 25, 30];

    const evalResults: ClearanceExecutionResult[] = [];
    const positionsAndLabelsToExport: Record<
      string,
      Record<string, { positions: Record<string, { x: number; y: number }>; displayLabels: Record<string, string> }>
    > = {
      pbim: {},
      'cloud-spend-tracker': {},
    };

    projectsToEvaluate.forEach((projId) => {
      const baseR4 = loadR4FixturePositions(projId);

      // Baseline R4
      positionsAndLabelsToExport[projId]['R4_Baseline'] = {
        positions: baseR4.positions,
        displayLabels: baseR4.displayLabels,
      };

      // 30A-Chunk (Soft wrap, no vertical correction)
      const chunkedLabels: Record<string, string> = {};
      Object.keys(baseR4.displayLabels).forEach((id) => {
        chunkedLabels[id] = tokenizeChunk(baseR4.displayLabels[id], 12);
      });
      positionsAndLabelsToExport[projId]['30A-Chunk'] = {
        positions: baseR4.positions,
        displayLabels: chunkedLabels,
      };

      strategies.forEach((strategy) => {
        gaps.forEach((gapY) => {
          const candId = `30B_${strategy}_gapY${gapY}`;
          const res = evaluateLocalClearanceCandidate(
            projId,
            baseR4.positions,
            baseR4.displayLabels,
            baseR4.area,
            baseR4.width,
            baseR4.height,
            { candidateId: candId, strategy, gapY }
          );

          evalResults.push(res);
          positionsAndLabelsToExport[projId][candId] = {
            positions: res.positions,
            displayLabels: res.displayLabels,
          };

          expect(res.hasNaNOrInfinity).toBe(false);
        });
      });
    });

    const rootDir = path.resolve(__dirname, '../../..');
    const fixtureDir = path.join(rootDir, 'audit-fixtures');
    if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

    fs.writeFileSync(
      path.join(fixtureDir, 'phase30b-candidate-evaluations.json'),
      JSON.stringify(evalResults, null, 2)
    );

    fs.writeFileSync(
      path.join(fixtureDir, 'phase30b-positions-and-labels.json'),
      JSON.stringify(positionsAndLabelsToExport, null, 2)
    );

    console.log('Saved Phase 30B candidate positions to audit-fixtures/phase30b-positions-and-labels.json');
  });

  it('Verifies 10x determinism and 10x input-order invariance for Strategy A gapY=10', () => {
    const baseR4 = loadR4FixturePositions('pbim');

    const baseEval = evaluateLocalClearanceCandidate(
      'pbim',
      baseR4.positions,
      baseR4.displayLabels,
      baseR4.area,
      baseR4.width,
      baseR4.height,
      {
        candidateId: '30B_A_RowBoundary_gapY10',
        strategy: 'A_RowBoundary',
        gapY: 10,
      }
    );

    // 10x Determinism
    for (let run = 0; run < 10; run++) {
      const runEval = evaluateLocalClearanceCandidate(
        'pbim',
        baseR4.positions,
        baseR4.displayLabels,
        baseR4.area,
        baseR4.width,
        baseR4.height,
        {
          candidateId: '30B_A_RowBoundary_gapY10',
          strategy: 'A_RowBoundary',
          gapY: 10,
        }
      );

      expect(runEval.width).toBe(baseEval.width);
      expect(runEval.height).toBe(baseEval.height);
      expect(runEval.nodesMoved).toBe(baseEval.nodesMoved);
      Object.keys(baseEval.positions).forEach((id) => {
        expect(runEval.positions[id].x).toBeCloseTo(baseEval.positions[id].x, 5);
        expect(runEval.positions[id].y).toBeCloseTo(baseEval.positions[id].y, 5);
      });
    }

    // 10x Input-Order Invariance
    const nodeIds = Object.keys(baseR4.positions);
    for (let run = 0; run < 10; run++) {
      const shuffledPositions: Record<string, { x: number; y: number }> = {};
      const shuffledLabels: Record<string, string> = {};

      const shuffledKeys = [...nodeIds].sort((a, b) =>
        run % 2 === 0 ? a.length - b.length : b.localeCompare(a)
      );

      shuffledKeys.forEach((id) => {
        shuffledPositions[id] = baseR4.positions[id];
        shuffledLabels[id] = baseR4.displayLabels[id];
      });

      const shuffledEval = evaluateLocalClearanceCandidate(
        'pbim',
        shuffledPositions,
        shuffledLabels,
        baseR4.area,
        baseR4.width,
        baseR4.height,
        {
          candidateId: '30B_A_RowBoundary_gapY10',
          strategy: 'A_RowBoundary',
          gapY: 10,
        }
      );

      expect(shuffledEval.width).toBe(baseEval.width);
      expect(shuffledEval.height).toBe(baseEval.height);
      expect(shuffledEval.nodesMoved).toBe(baseEval.nodesMoved);
      Object.keys(baseEval.positions).forEach((id) => {
        expect(shuffledEval.positions[id].x).toBeCloseTo(baseEval.positions[id].x, 5);
        expect(shuffledEval.positions[id].y).toBeCloseTo(baseEval.positions[id].y, 5);
      });
    }
  });
});

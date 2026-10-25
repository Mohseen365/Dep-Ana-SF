import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

export interface RenderedNodeInfo {
  id: string;
  label: string;
  posX: number;
  posY: number;
  rx1: number;
  ry1: number;
  rx2: number;
  ry2: number;
  renderedWidth: number;
  renderedHeight: number;
  modelWidth: number;
  modelHeight: number;
  zoom: number;
}

export interface RenderedCollisionPair {
  nodeA: string;
  nodeB: string;
  labelA: string;
  labelB: string;
  centerA: { x: number; y: number };
  centerB: { x: number; y: number };
  modelWidthA: number;
  modelHeightA: number;
  modelWidthB: number;
  modelHeightB: number;
  overlapXRendered: number;
  overlapYRendered: number;
  overlapXModel: number;
  overlapYModel: number;
  axisClass: 'SAME_ROW_HORIZONTAL_PRIMARY' | 'ADJACENT_ROW_2D' | 'TRUE_2D';
}

/**
 * Candidate D-A: Pair-Specific Horizontal Clearance
 * Local X-displacement of same-row colliding node pairs using:
 * requiredDx = (modelWidthA / 2) + (modelWidthB / 2) + requiredGap
 */
export function applyCandidateDA_PairSpecific(
  positions: Record<string, { x: number; y: number }>,
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  collisions: RenderedCollisionPair[],
  gapX: number
): Record<string, { x: number; y: number }> {
  const newPositions: Record<string, { x: number; y: number }> = {};
  Object.keys(positions).forEach(id => {
    newPositions[id] = { ...positions[id] };
  });

  const sameRowCollisions = collisions.filter(c => c.axisClass === 'SAME_ROW_HORIZONTAL_PRIMARY');

  // Group into connected horizontal components (colliding chains)
  const nodeIdsWithCollision = new Set<string>();
  sameRowCollisions.forEach(c => {
    nodeIdsWithCollision.add(c.nodeA);
    nodeIdsWithCollision.add(c.nodeB);
  });

  // Find rows (by y coordinate within 10px)
  const rowsMap = new Map<number, string[]>();
  nodeIdsWithCollision.forEach(id => {
    const y = newPositions[id].y;
    let foundY: number | null = null;
    for (const rY of rowsMap.keys()) {
      if (Math.abs(rY - y) < 10) {
        foundY = rY;
        break;
      }
    }
    if (foundY !== null) {
      rowsMap.get(foundY)!.push(id);
    } else {
      rowsMap.set(y, [id]);
    }
  });

  // Repack each colliding cluster in each row
  rowsMap.forEach((rowNodeIds, _rowY) => {
    // Sort nodes in row horizontally by original X position
    rowNodeIds.sort((a, b) => newPositions[a].x - newPositions[b].x);

    // Calculate required deltaX for each adjacent pair in chain
    for (let i = 1; i < rowNodeIds.length; i++) {
      const prevId = rowNodeIds[i - 1];
      const currId = rowNodeIds[i];

      const prevInfo = renderedNodesMap.get(prevId)!;
      const currInfo = renderedNodesMap.get(currId)!;

      const prevW = prevInfo ? prevInfo.modelWidth : 120;
      const currW = currInfo ? currInfo.modelWidth : 120;

      const minRequiredDx = (prevW + currW) / 2 + gapX;
      const currentDx = newPositions[currId].x - newPositions[prevId].x;

      if (currentDx < minRequiredDx) {
        const shiftX = minRequiredDx - currentDx;
        // Shift currId and all downstream nodes in this chain to the right
        for (let j = i; j < rowNodeIds.length; j++) {
          newPositions[rowNodeIds[j]].x += shiftX;
        }
      }
    }
  });

  return newPositions;
}

/**
 * Candidate D-B: Affected-Row Repacking
 * Repack only rows containing browser same-row collisions based on model-equivalent
 * rendered label widths and gap sweep (0, 10, 20, 40px), keeping unaffected rows untouched.
 */
export function applyCandidateDB_AffectedRowRepack(
  positions: Record<string, { x: number; y: number }>,
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  collisions: RenderedCollisionPair[],
  gapX: number
): Record<string, { x: number; y: number }> {
  const newPositions: Record<string, { x: number; y: number }> = {};
  Object.keys(positions).forEach(id => {
    newPositions[id] = { ...positions[id] };
  });

  const sameRowCollisions = collisions.filter(c => c.axisClass === 'SAME_ROW_HORIZONTAL_PRIMARY');

  // Identify affected row Y coordinates
  const affectedYSet = new Set<number>();
  sameRowCollisions.forEach(c => {
    const yA = newPositions[c.nodeA].y;
    affectedYSet.add(yA);
  });

  // Group ALL nodes in the graph by row Y (within 10px)
  const allRowsMap = new Map<number, string[]>();
  Object.keys(newPositions).forEach(id => {
    const y = newPositions[id].y;
    let foundY: number | null = null;
    for (const rY of allRowsMap.keys()) {
      if (Math.abs(rY - y) < 10) {
        foundY = rY;
        break;
      }
    }
    if (foundY !== null) {
      allRowsMap.get(foundY)!.push(id);
    } else {
      allRowsMap.set(y, [id]);
    }
  });

  // Repack only affected rows
  allRowsMap.forEach((rowNodeIds, rowY) => {
    // Check if this row is affected
    let isAffected = false;
    for (const affY of affectedYSet) {
      if (Math.abs(affY - rowY) < 10) {
        isAffected = true;
        break;
      }
    }

    if (!isAffected) return; // Keep unaffected row intact

    // Sort row nodes horizontally
    rowNodeIds.sort((a, b) => positions[a].x - positions[b].x);

    // Compute original center X of row to maintain row alignment center
    const origMinX = Math.min(...rowNodeIds.map(id => positions[id].x));
    const origMaxX = Math.max(...rowNodeIds.map(id => positions[id].x));
    const origCenterX = (origMinX + origMaxX) / 2;

    // Calculate total required width for row
    const nodeDims = rowNodeIds.map(id => {
      const info = renderedNodesMap.get(id);
      return { id, width: info ? info.modelWidth : 120 };
    });

    let totalSpan = 0;
    for (let i = 0; i < nodeDims.length; i++) {
      if (i === 0) totalSpan += nodeDims[i].width / 2;
      else {
        totalSpan += (nodeDims[i - 1].width + nodeDims[i].width) / 2 + gapX;
      }
    }
    totalSpan += nodeDims[nodeDims.length - 1].width / 2;

    let currentX = origCenterX - totalSpan / 2;
    nodeDims.forEach((dim, idx) => {
      if (idx === 0) {
        currentX += dim.width / 2;
      } else {
        currentX += (nodeDims[idx - 1].width + dim.width) / 2 + gapX;
      }
      newPositions[dim.id].x = currentX;
    });
  });

  return newPositions;
}

/**
 * Candidate D-C: Affected-Row Vertical Clearance
 * Local Y-displacement for adjacent-row vertical collision pairs using:
 * requiredDy = (modelHeightA / 2) + (modelHeightB / 2) + requiredGap
 */
export function applyCandidateDC_AffectedRowVertical(
  positions: Record<string, { x: number; y: number }>,
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  collisions: RenderedCollisionPair[],
  gapY: number
): Record<string, { x: number; y: number }> {
  const newPositions: Record<string, { x: number; y: number }> = {};
  Object.keys(positions).forEach(id => {
    newPositions[id] = { ...positions[id] };
  });

  const adjacentRowCollisions = collisions.filter(c => c.axisClass === 'ADJACENT_ROW_2D');

  // Identify adjacent row pairs that collide
  // Group all nodes by row Y
  const rowsMap = new Map<number, string[]>();
  Object.keys(newPositions).forEach(id => {
    const y = newPositions[id].y;
    let foundY: number | null = null;
    for (const rY of rowsMap.keys()) {
      if (Math.abs(rY - y) < 10) {
        foundY = rY;
        break;
      }
    }
    if (foundY !== null) {
      rowsMap.get(foundY)!.push(id);
    } else {
      rowsMap.set(y, [id]);
    }
  });

  const sortedRowYs = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  // For each adjacent row pair, check if there are any vertical collisions
  for (let r = 1; r < sortedRowYs.length; r++) {
    const prevRowY = sortedRowYs[r - 1];
    const currRowY = sortedRowYs[r];

    const prevRowNodes = rowsMap.get(prevRowY)!;
    const currRowNodes = rowsMap.get(currRowY)!;

    // Check if any collision exists between prevRowNodes and currRowNodes
    let maxRequiredDy = currRowY - prevRowY; // default

    adjacentRowCollisions.forEach(c => {
      const inPrev = prevRowNodes.includes(c.nodeA) || prevRowNodes.includes(c.nodeB);
      const inCurr = currRowNodes.includes(c.nodeA) || currRowNodes.includes(c.nodeB);

      if (inPrev && inCurr) {
        const infoA = renderedNodesMap.get(c.nodeA)!;
        const infoB = renderedNodesMap.get(c.nodeB)!;

        const hA = infoA ? infoA.modelHeight : 60;
        const hB = infoB ? infoB.modelHeight : 60;

        const reqDy = (hA + hB) / 2 + gapY;
        if (reqDy > maxRequiredDy) {
          maxRequiredDy = reqDy;
        }
      }
    });

    const actualDy = currRowY - prevRowY;
    if (maxRequiredDy > actualDy) {
      const shiftY = maxRequiredDy - actualDy;
      // Shift currRow and all subsequent rows down by shiftY
      for (let s = r; s < sortedRowYs.length; s++) {
        const rowYToShift = sortedRowYs[s];
        rowsMap.get(rowYToShift)!.forEach(id => {
          newPositions[id].y += shiftY;
        });
      }
    }
  }

  return newPositions;
}

/**
 * Candidate D-D: Combined Local Clearance
 * Combines affected-row horizontal repacking (Candidate D-B) followed by affected-row vertical clearance (Candidate D-C).
 */
export function applyCandidateDD_Combined(
  positions: Record<string, { x: number; y: number }>,
  renderedNodesMap: Map<string, RenderedNodeInfo>,
  collisions: RenderedCollisionPair[],
  gapX: number,
  gapY: number
): Record<string, { x: number; y: number }> {
  // Step 1: Horizontal affected-row repacking
  const posH = applyCandidateDB_AffectedRowRepack(positions, renderedNodesMap, collisions, gapX);
  // Step 2: Vertical affected-row clearance
  const posHV = applyCandidateDC_AffectedRowVertical(posH, renderedNodesMap, collisions, gapY);
  return posHV;
}

describe('Phase 29R-D Local Clearance Transformation Harness', () => {
  it('Loads rendered dimensions and generates experimental candidate layouts for PBIM and CST', () => {
    const fixtureDir = path.resolve(__dirname, '../../../audit-fixtures');
    const dimFile = path.join(fixtureDir, 'phase29rd-rendered-dimensions.json');

    if (!fs.existsSync(dimFile)) {
      throw new Error('phase29rd-rendered-dimensions.json not found! Run extractor first.');
    }

    const dimData = JSON.parse(fs.readFileSync(dimFile, 'utf-8'));
    const posFile = path.join(fixtureDir, 'phase28r-positions-and-labels.json');
    const posData = JSON.parse(fs.readFileSync(posFile, 'utf-8'));

    const experimentalOutputs: Record<string, any> = {
      'cloud-spend-tracker': {},
      'pbim': {},
    };

    for (const projId of ['pbim', 'cloud-spend-tracker']) {
      const pData = dimData[projId];
      const r4Pos = posData[projId]['R4_AdaptiveCapacity'].positions;
      const displayLabels = posData[projId]['R4_AdaptiveCapacity'].displayLabels;

      const renderedNodesMap = new Map<string, RenderedNodeInfo>();
      pData.nodes.forEach((n: RenderedNodeInfo) => renderedNodesMap.set(n.id, n));
      const collisions: RenderedCollisionPair[] = pData.collisions;

      console.log(`\n======================================================`);
      console.log(`GENERATING EXPERIMENTAL CANDIDATES FOR ${projId.toUpperCase()}`);
      console.log(`======================================================`);

      // Gap sweeps: 0, 10, 20, 40
      const gaps = [0, 10, 20, 40];

      // D-A Sweep
      gaps.forEach(gapX => {
        const candId = `D_A_pair_gapX${gapX}`;
        const positions = applyCandidateDA_PairSpecific(r4Pos, renderedNodesMap, collisions, gapX);
        experimentalOutputs[projId][candId] = { positions, displayLabels };
      });

      // D-B Sweep
      gaps.forEach(gapX => {
        const candId = `D_B_row_gapX${gapX}`;
        const positions = applyCandidateDB_AffectedRowRepack(r4Pos, renderedNodesMap, collisions, gapX);
        experimentalOutputs[projId][candId] = { positions, displayLabels };
      });

      // D-C Sweep
      gaps.forEach(gapY => {
        const candId = `D_C_vert_gapY${gapY}`;
        const positions = applyCandidateDC_AffectedRowVertical(r4Pos, renderedNodesMap, collisions, gapY);
        experimentalOutputs[projId][candId] = { positions, displayLabels };
      });

      // D-D Sweep (Combination of best gapX and gapY)
      gaps.forEach(gapX => {
        gaps.forEach(gapY => {
          const candId = `D_D_comb_gapX${gapX}_gapY${gapY}`;
          const positions = applyCandidateDD_Combined(r4Pos, renderedNodesMap, collisions, gapX, gapY);
          experimentalOutputs[projId][candId] = { positions, displayLabels };
        });
      });

      console.log(`Generated ${Object.keys(experimentalOutputs[projId]).length} experimental candidate layouts for ${projId}`);
    }

    fs.writeFileSync(
      path.join(fixtureDir, 'phase29rd-experimental-positions.json'),
      JSON.stringify(experimentalOutputs, null, 2)
    );

    console.log('\nSaved Phase 29R-D experimental positions to audit-fixtures/phase29rd-experimental-positions.json');
  });
});

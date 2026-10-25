/**
 * Pure AABB Overlap and Candidate Geometry Validation Core Module
 * Phase D.4-B implementation
 */

/**
 * Normalizes and validates a bounding box object.
 * Supports both {x, y, w, h} and {x1, y1, x2, y2} formats.
 * Returns normalized {x1, y1, x2, y2, w, h, x, y} or null if invalid.
 */
function normalizeAndValidateBoundingBox(bb) {
  if (!bb || typeof bb !== 'object') {
    return null;
  }

  let x1, y1, x2, y2, w, h;

  if (typeof bb.x === 'number' && typeof bb.y === 'number' && typeof bb.w === 'number' && typeof bb.h === 'number') {
    x1 = bb.x;
    y1 = bb.y;
    w = bb.w;
    h = bb.h;
    x2 = x1 + w;
    y2 = y1 + h;
  } else if (typeof bb.x1 === 'number' && typeof bb.y1 === 'number' && typeof bb.x2 === 'number' && typeof bb.y2 === 'number') {
    x1 = bb.x1;
    y1 = bb.y1;
    x2 = bb.x2;
    y2 = bb.y2;
    w = x2 - x1;
    h = y2 - y1;
  } else {
    return null;
  }

  const x = x1;
  const y = y1;

  // Strict finite check
  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2) ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }

  // Dimension check: width and height must be strictly positive
  if (w <= 0 || h <= 0) {
    return null;
  }

  return { x1, y1, x2, y2, w, h, x, y };
}

/**
 * Evaluates pairwise AABB collision between two normalized boxes.
 */
function isAABBOverlap(boxA, boxB) {
  return (
    boxA.x1 < boxB.x2 &&
    boxA.x2 > boxB.x1 &&
    boxA.y1 < boxB.y2 &&
    boxA.y2 > boxB.y1
  );
}

/**
 * Evaluates overlap validation for a graph view.
 *
 * @param {Array<Object>} nodes Array of node objects, e.g.:
 *   { id: string, visible?: boolean, bb?: Object, isExpected?: boolean }
 * @param {Object} [options] Evaluation options:
 *   - expectedNodeIds: Set<string> | Array<string> | null
 *   - mode: string
 *   - allowUnprojectedHidden: boolean (default: true)
 * @returns {Object} Structured report:
 *   {
 *     mode: string,
 *     expectedCandidateCount: number,
 *     measuredCandidateCount: number,
 *     invalidGeometryCount: number,
 *     missingCandidateCount: number,
 *     unprojectedExcludedCount: number,
 *     overlapCount: number,
 *     overlappingPairs: Array<[string, string]>,
 *     conclusive: boolean,
 *     status: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
 *   }
 */
function evaluateOverlapValidation(nodes = [], options = {}) {
  const mode = options.mode || 'unknown';
  const rawExpectedSet = options.expectedNodeIds
    ? (options.expectedNodeIds instanceof Set ? options.expectedNodeIds : new Set(options.expectedNodeIds))
    : null;

  const nodeMap = new Map();
  for (const node of nodes) {
    if (node && typeof node.id === 'string') {
      nodeMap.set(node.id, node);
    }
  }

  // Determine candidate IDs
  let candidateIds = new Set();
  if (rawExpectedSet) {
    candidateIds = new Set(rawExpectedSet);
  } else {
    // If no expected Set provided, consider all visible nodes OR nodes marked isExpected as candidates.
    // If a node is visible or explicitly marked isExpected, it's a candidate.
    for (const node of nodes) {
      if (!node) continue;
      if (node.isExpected === true || node.visible !== false) {
        candidateIds.add(node.id);
      }
    }
  }

  const expectedCandidateCount = candidateIds.size;
  let measuredCandidateCount = 0;
  let invalidGeometryCount = 0;
  let missingCandidateCount = 0;
  let unprojectedExcludedCount = 0;

  // Track unprojected nodes that were excluded
  for (const node of nodes) {
    if (node && !candidateIds.has(node.id)) {
      unprojectedExcludedCount++;
    }
  }

  const measuredBoxes = [];

  for (const candidateId of candidateIds) {
    const node = nodeMap.get(candidateId);
    if (!node) {
      // Required expected node is completely missing from graph data
      missingCandidateCount++;
      continue;
    }

    if (node.visible === false) {
      // Required candidate is explicitly marked hidden
      missingCandidateCount++;
      continue;
    }

    const normBb = normalizeAndValidateBoundingBox(node.bb || node.renderedBoundingBox);
    if (!normBb) {
      // Required candidate has missing, zero-sized, non-finite, or malformed geometry
      invalidGeometryCount++;
      continue;
    }

    measuredBoxes.push({
      id: candidateId,
      box: normBb,
    });
    measuredCandidateCount++;
  }

  // Calculate pairwise overlaps among measured candidates
  const overlappingPairs = [];
  for (let i = 0; i < measuredBoxes.length; i++) {
    for (let j = i + 1; j < measuredBoxes.length; j++) {
      if (isAABBOverlap(measuredBoxes[i].box, measuredBoxes[j].box)) {
        overlappingPairs.push([measuredBoxes[i].id, measuredBoxes[j].id]);
      }
    }
  }

  const overlapCount = overlappingPairs.length;

  // Conclusive determination:
  // Must be conclusive ONLY IF:
  // 1. All expected candidates were measured (missingCandidateCount === 0)
  // 2. No candidates had invalid geometry (invalidGeometryCount === 0)
  // Note: if expectedCandidateCount === 0, it's valid if graph was truly expected empty,
  // but if expected > 0 and measured < expected, it's INCONCLUSIVE.
  const hasInvalidOrMissing = invalidGeometryCount > 0 || missingCandidateCount > 0;
  const conclusive = !hasInvalidOrMissing;

  let status = 'INCONCLUSIVE';
  if (!conclusive) {
    status = 'INCONCLUSIVE';
  } else if (overlapCount > 0) {
    status = 'FAIL';
  } else {
    status = 'PASS';
  }

  return {
    mode,
    expectedCandidateCount,
    measuredCandidateCount,
    invalidGeometryCount,
    missingCandidateCount,
    unprojectedExcludedCount,
    overlapCount,
    overlappingPairs,
    conclusive,
    status,
  };
}

module.exports = {
  normalizeAndValidateBoundingBox,
  isAABBOverlap,
  evaluateOverlapValidation,
};

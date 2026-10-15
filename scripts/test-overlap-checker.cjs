const assert = require('assert');
const {
  normalizeAndValidateBoundingBox,
  isAABBOverlap,
  evaluateOverlapValidation,
} = require('./overlap_checker_core.cjs');

console.log('Running Overlap Checker Core Unit Test Suite...');

// Test 1: Overlapping AABBs
(() => {
  console.log('Test 1: Overlapping AABBs...');
  const nodes = [
    { id: 'nodeA', bb: { x: 0, y: 0, w: 100, h: 100 } },
    { id: 'nodeB', bb: { x: 50, y: 50, w: 100, h: 100 } },
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 2);
  assert.strictEqual(res.measuredCandidateCount, 2);
  assert.strictEqual(res.invalidGeometryCount, 0);
  assert.strictEqual(res.overlapCount, 1);
  assert.strictEqual(res.conclusive, true);
  assert.strictEqual(res.status, 'FAIL');
  assert.deepStrictEqual(res.overlappingPairs, [['nodeA', 'nodeB']]);
  console.log('  ✓ Test 1 PASSED');
})();

// Test 2: Non-overlapping AABBs
(() => {
  console.log('Test 2: Non-overlapping AABBs...');
  const nodes = [
    { id: 'nodeA', bb: { x: 0, y: 0, w: 100, h: 100 } },
    { id: 'nodeB', bb: { x: 200, y: 200, w: 100, h: 100 } },
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 2);
  assert.strictEqual(res.measuredCandidateCount, 2);
  assert.strictEqual(res.invalidGeometryCount, 0);
  assert.strictEqual(res.overlapCount, 0);
  assert.strictEqual(res.conclusive, true);
  assert.strictEqual(res.status, 'PASS');
  console.log('  ✓ Test 2 PASSED');
})();

// Test 3: Zero-width or zero-height bounds
(() => {
  console.log('Test 3: Zero-width or zero-height bounds...');
  const nodes = [
    { id: 'nodeA', bb: { x: 0, y: 0, w: 0, h: 100 } },
    { id: 'nodeB', bb: { x: 0, y: 0, w: 100, h: 0 } },
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 2);
  assert.strictEqual(res.measuredCandidateCount, 0);
  assert.strictEqual(res.invalidGeometryCount, 2);
  assert.strictEqual(res.overlapCount, 0);
  assert.strictEqual(res.conclusive, false);
  assert.strictEqual(res.status, 'INCONCLUSIVE');
  console.log('  ✓ Test 3 PASSED');
})();

// Test 4: Missing bounds (null, undefined, non-object)
(() => {
  console.log('Test 4: Missing bounds...');
  const nodes = [
    { id: 'nodeA', bb: null },
    { id: 'nodeB', bb: undefined },
    { id: 'nodeC' },
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 3);
  assert.strictEqual(res.measuredCandidateCount, 0);
  assert.strictEqual(res.invalidGeometryCount, 3);
  assert.strictEqual(res.conclusive, false);
  assert.strictEqual(res.status, 'INCONCLUSIVE');
  console.log('  ✓ Test 4 PASSED');
})();

// Test 5: Non-finite coordinates and dimensions (NaN, Infinity)
(() => {
  console.log('Test 5: Non-finite coordinates and dimensions...');
  const nodes = [
    { id: 'nodeA', bb: { x: NaN, y: 0, w: 100, h: 100 } },
    { id: 'nodeB', bb: { x: 0, y: 0, w: Infinity, h: 100 } },
    { id: 'nodeC', bb: { x: 0, y: -Infinity, w: 100, h: 100 } },
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 3);
  assert.strictEqual(res.measuredCandidateCount, 0);
  assert.strictEqual(res.invalidGeometryCount, 3);
  assert.strictEqual(res.conclusive, false);
  assert.strictEqual(res.status, 'INCONCLUSIVE');
  console.log('  ✓ Test 5 PASSED');
})();

// Test 6: Hidden/unrendered nodes according to actual candidate-set contract
(() => {
  console.log('Test 6: Hidden/unrendered nodes according to candidate-set contract...');
  // Scenario: 2 nodes expected in projection set. 1 unrelated node is hidden and NOT expected.
  const nodes = [
    { id: 'focal', visible: true, bb: { x: 0, y: 0, w: 50, h: 50 } },
    { id: 'satellite', visible: true, bb: { x: 100, y: 100, w: 50, h: 50 } },
    { id: 'unrelatedHidden', visible: false, bb: { x: 0, y: 0, w: 0, h: 0 } },
  ];
  const expectedSet = new Set(['focal', 'satellite']);
  const res = evaluateOverlapValidation(nodes, {
    mode: 'orbit',
    expectedNodeIds: expectedSet,
  });
  assert.strictEqual(res.expectedCandidateCount, 2);
  assert.strictEqual(res.measuredCandidateCount, 2);
  assert.strictEqual(res.invalidGeometryCount, 0);
  assert.strictEqual(res.missingCandidateCount, 0);
  assert.strictEqual(res.unprojectedExcludedCount, 1);
  assert.strictEqual(res.overlapCount, 0);
  assert.strictEqual(res.conclusive, true);
  assert.strictEqual(res.status, 'PASS');
  console.log('  ✓ Test 6 PASSED');
})();

// Test 7: Empty candidate sets
(() => {
  console.log('Test 7: Empty candidate sets...');
  const res = evaluateOverlapValidation([], {
    mode: 'hierarchical',
    expectedNodeIds: new Set(),
  });
  assert.strictEqual(res.expectedCandidateCount, 0);
  assert.strictEqual(res.measuredCandidateCount, 0);
  assert.strictEqual(res.invalidGeometryCount, 0);
  assert.strictEqual(res.overlapCount, 0);
  assert.strictEqual(res.conclusive, true);
  assert.strictEqual(res.status, 'PASS');
  console.log('  ✓ Test 7 PASSED');
})();

// Test 8: Missing required nodes (expected node absent or hidden)
(() => {
  console.log('Test 8: Missing required nodes...');
  const nodes = [
    { id: 'focal', visible: true, bb: { x: 0, y: 0, w: 50, h: 50 } },
    { id: 'satelliteRequiredButHidden', visible: false, bb: { x: 0, y: 0, w: 50, h: 50 } },
  ];
  const expectedSet = new Set(['focal', 'satelliteRequiredButHidden', 'missingFromGraphEntirely']);
  const res = evaluateOverlapValidation(nodes, {
    mode: 'constellation',
    expectedNodeIds: expectedSet,
  });
  assert.strictEqual(res.expectedCandidateCount, 3);
  assert.strictEqual(res.measuredCandidateCount, 1);
  assert.strictEqual(res.missingCandidateCount, 2); // 1 hidden, 1 absent
  assert.strictEqual(res.conclusive, false);
  assert.strictEqual(res.status, 'INCONCLUSIVE');
  console.log('  ✓ Test 8 PASSED');
})();

// Test 9: Invalid geometry must not yield a successful zero-overlap result
(() => {
  console.log('Test 9: Invalid geometry prevents false zero-overlap PASS...');
  const nodes = [
    { id: 'nodeA', bb: { x: 0, y: 0, w: 100, h: 100 } },
    { id: 'nodeB', bb: { x: 0, y: 0, w: 0, h: 0 } }, // Malformed
  ];
  const res = evaluateOverlapValidation(nodes, { mode: 'test' });
  assert.strictEqual(res.expectedCandidateCount, 2);
  assert.strictEqual(res.measuredCandidateCount, 1);
  assert.strictEqual(res.invalidGeometryCount, 1);
  assert.strictEqual(res.overlapCount, 0); // 0 pairwise overlaps among measurable
  assert.strictEqual(res.conclusive, false); // MUST NOT be conclusive
  assert.notStrictEqual(res.status, 'PASS'); // MUST NOT PASS
  assert.strictEqual(res.status, 'INCONCLUSIVE');
  console.log('  ✓ Test 9 PASSED');
})();

// Test 10: Supports {x1, y1, x2, y2} bounding box format
(() => {
  console.log('Test 10: {x1, y1, x2, y2} bounding box format support...');
  const bb1 = normalizeAndValidateBoundingBox({ x1: 10, y1: 20, x2: 110, y2: 120 });
  assert.deepStrictEqual(bb1, { x1: 10, y1: 20, x2: 110, y2: 120, w: 100, h: 100, x: 10, y: 20 });

  const isOverlap = isAABBOverlap(
    { x1: 0, y1: 0, x2: 100, y2: 100 },
    { x1: 50, y1: 50, x2: 150, y2: 150 }
  );
  assert.strictEqual(isOverlap, true);
  console.log('  ✓ Test 10 PASSED');
})();

console.log('\nALL OVERLAP CHECKER CORE TESTS PASSED SUCCESSFULLY!\n');

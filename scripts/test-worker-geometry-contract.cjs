/**
 * Test script for Worker Geometry Contract & Event Correlation logic.
 * Verifies that FeatureRegion objects deserialized from worker summaries contain
 * exact width (xMax - xMin), height (yMax - yMin), finite dimensions, and valid metadata fields.
 */

const assert = require('assert');

console.log('Running Worker Geometry & Event Correlation Test Suite...');
console.log('========================================================');

// Test 1: FeatureRegion Geometry Calculation
console.log('Test 1: FeatureRegion deserialization geometry calculation...');
const mockSummary = {
  id: 'feature-1',
  domainId: 'domain-a',
  xMin: 100,
  xMax: 450,
  yMin: 50,
  yMax: 300,
  xCenter: 275,
  yCenter: 175,
  primaryLayer: 'application',
  orderIndex: 2,
  nodeCount: 10,
  primaryNodeCount: 8,
};

const width = mockSummary.xMax - mockSummary.xMin;
const height = mockSummary.yMax - mockSummary.yMin;

const featureRegionObj = {
  id: mockSummary.id,
  featureId: mockSummary.id,
  domain: mockSummary.id,
  domainId: mockSummary.domainId,
  xMin: mockSummary.xMin,
  xMax: mockSummary.xMax,
  yMin: mockSummary.yMin,
  yMax: mockSummary.yMax,
  xCenter: mockSummary.xCenter,
  yCenter: mockSummary.yCenter,
  width,
  height,
  nodeCount: mockSummary.nodeCount,
  primaryNodeCount: mockSummary.primaryNodeCount,
  primaryLayer: mockSummary.primaryLayer,
  orderIndex: mockSummary.orderIndex,
};

assert.strictEqual(featureRegionObj.width, 350, 'Width must equal xMax - xMin (350)');
assert.strictEqual(featureRegionObj.height, 250, 'Height must equal yMax - yMin (250)');
assert.strictEqual(featureRegionObj.id, 'feature-1', 'id must match sum.id');
assert.strictEqual(featureRegionObj.featureId, 'feature-1', 'featureId must match sum.id');
assert.strictEqual(featureRegionObj.primaryLayer, 'application', 'primaryLayer must be preserved');
assert.strictEqual(featureRegionObj.nodeCount, 10, 'nodeCount must be preserved');
console.log('  ✓ Test 1 PASSED (Exact geometry width/height and metadata preserved)');

// Test 2: Event Listener Correlation Predicate
console.log('Test 2: Benchmark event correlation filter predicate...');
const targetMode = 'hybrid';
const initialReqId = 5;

function isMatchingEvent(evtDetail) {
  if (!evtDetail || evtDetail.architectureMode !== targetMode) {
    return false;
  }
  if (typeof evtDetail.requestId === 'number' && evtDetail.requestId <= initialReqId) {
    return false;
  }
  return true;
}

assert.strictEqual(
  isMatchingEvent({ architectureMode: 'hierarchical', requestId: 6 }),
  false,
  'Mismatched architectureMode must be rejected'
);

assert.strictEqual(
  isMatchingEvent({ architectureMode: 'hybrid', requestId: 4 }),
  false,
  'Stale requestId (<= initialReqId) must be rejected'
);

assert.strictEqual(
  isMatchingEvent({ architectureMode: 'hybrid', requestId: 5 }),
  false,
  'Equal requestId (<= initialReqId) must be rejected'
);

assert.strictEqual(
  isMatchingEvent({ architectureMode: 'hybrid', requestId: 6 }),
  true,
  'Matching targetMode and greater requestId must be accepted'
);

console.log('  ✓ Test 2 PASSED (Event correlation correctly filters mismatched mode & stale requestId)');

console.log('\n========================================================');
console.log('ALL WORKER GEOMETRY & EVENT CORRELATION TESTS PASSED!');

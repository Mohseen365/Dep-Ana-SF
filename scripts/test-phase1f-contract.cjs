const assert = require('assert');

// Mock localStorage for node runner environment
if (typeof global.window === 'undefined') {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i) => Array.from(store.keys())[i] || null,
    },
  };
}

const {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
} = require('./explorer/src/lib/projectState');

const { resolveAuthoritativePosition } = require('./explorer/src/lib/position-policy');

const TEST_PROJECT_ID = 'test-proj-phase1f';

console.log('Running Phase 1F Standalone Position Persistence Contract Tests...');

// Setup
clearProjectState(TEST_PROJECT_ID);

// Test A
console.log('Test A: Same-layout drag persistence...');
const initialState = createDefaultProjectUIState(TEST_PROJECT_ID);
saveProjectState(TEST_PROJECT_ID, initialState);

const draggedPositions = {
  'ApexClass:OrderController': { x: 350, y: 450 },
  'ApexClass:OrderService': { x: 500, y: 600 },
};

const updatedA = updateProjectState(TEST_PROJECT_ID, {
  graphLayout: {
    architectureMode: 'hierarchical',
    nodePositions: draggedPositions,
    layoutProvenance: 'user-authored',
  },
});

assert.strictEqual(updatedA.graphLayout.architectureMode, 'hierarchical');
assert.deepStrictEqual(updatedA.graphLayout.nodePositions, draggedPositions);
assert.strictEqual(updatedA.graphLayout.layoutProvenance, 'user-authored');
assert.deepStrictEqual(updatedA.graphLayout.layoutPositions.hierarchical, draggedPositions);
assert.strictEqual(updatedA.graphLayout.layoutProvenances.hierarchical, 'user-authored');

const reloadedA = loadProjectState(TEST_PROJECT_ID);
assert.deepStrictEqual(reloadedA.graphLayout.nodePositions, draggedPositions);
assert.deepStrictEqual(reloadedA.graphLayout.layoutPositions.hierarchical, draggedPositions);
assert.strictEqual(reloadedA.graphLayout.layoutProvenances.hierarchical, 'user-authored');
console.log('  ✓ Test A PASSED');

// Test B
console.log('Test B: Cross-layout isolation...');
const hierPositions = { 'ApexClass:OrderController': { x: 100, y: 200 } };
updateProjectState(TEST_PROJECT_ID, {
  graphLayout: {
    architectureMode: 'hierarchical',
    nodePositions: hierPositions,
    layoutProvenance: 'user-authored',
  },
});

const orbitState = updateProjectState(TEST_PROJECT_ID, {
  graphLayout: {
    architectureMode: 'orbit',
    layoutProvenance: 'automatic-orbit',
  },
});

assert.strictEqual(orbitState.graphLayout.architectureMode, 'orbit');
assert.deepStrictEqual(orbitState.graphLayout.nodePositions, {});
assert.strictEqual(orbitState.graphLayout.layoutProvenance, 'automatic-orbit');
assert.deepStrictEqual(orbitState.graphLayout.layoutPositions.hierarchical, hierPositions);
assert.strictEqual(orbitState.graphLayout.layoutProvenances.hierarchical, 'user-authored');

const orbitPositions = { 'ApexClass:OrderController': { x: 800, y: 800 } };
const orbitUpdated = updateProjectState(TEST_PROJECT_ID, {
  graphLayout: {
    architectureMode: 'orbit',
    nodePositions: orbitPositions,
    layoutProvenance: 'user-authored',
  },
});

assert.deepStrictEqual(orbitUpdated.graphLayout.nodePositions, orbitPositions);
assert.deepStrictEqual(orbitUpdated.graphLayout.layoutPositions.orbit, orbitPositions);
assert.deepStrictEqual(orbitUpdated.graphLayout.layoutPositions.hierarchical, hierPositions);
console.log('  ✓ Test B PASSED');

// Test C
console.log('Test C: Round-trip restoration across all 4 modes...');
const posHier = { 'Node-1': { x: 10, y: 20 } };
const posHybrid = { 'Node-1': { x: 30, y: 40 } };
const posOrbit = { 'Node-1': { x: 50, y: 60 } };
const posConstellation = { 'Node-1': { x: 70, y: 80 } };

updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'hierarchical', nodePositions: posHier, layoutProvenance: 'user-authored' } });
updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'hybrid', nodePositions: posHybrid, layoutProvenance: 'user-authored' } });
updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'orbit', nodePositions: posOrbit, layoutProvenance: 'user-authored' } });
updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'constellation', nodePositions: posConstellation, layoutProvenance: 'user-authored' } });

assert.deepStrictEqual(updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'hierarchical' } }).graphLayout.nodePositions, posHier);
assert.deepStrictEqual(updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'hybrid' } }).graphLayout.nodePositions, posHybrid);
assert.deepStrictEqual(updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'orbit' } }).graphLayout.nodePositions, posOrbit);
assert.deepStrictEqual(updateProjectState(TEST_PROJECT_ID, { graphLayout: { architectureMode: 'constellation' } }).graphLayout.nodePositions, posConstellation);
console.log('  ✓ Test C PASSED');

// Test D
console.log('Test D: Provenance correctness & level isolation...');
const userPos = { 'Node-A': { x: 123, y: 456 } };
const resolvedSession = resolveAuthoritativePosition('Node-A', { sessionPositions: userPos, persistedPositions: userPos, hasAuthoritativePositions: true });
assert.strictEqual(resolvedSession.level, 1);
assert.deepStrictEqual(resolvedSession.position, { x: 123, y: 456 });

const resolvedPersisted = resolveAuthoritativePosition('Node-A', { persistedPositions: userPos, hasAuthoritativePositions: true });
assert.strictEqual(resolvedPersisted.level, 2);

const resolvedStale = resolveAuthoritativePosition('Node-A', { persistedPositions: userPos, hasAuthoritativePositions: false });
assert.strictEqual(resolvedStale, null);
console.log('  ✓ Test D PASSED');

// Test E
console.log('Test E: Legacy project state normalization...');
const legacyFlatPositions = { 'ApexClass:LegacyController': { x: 999, y: 888 } };
saveProjectState(TEST_PROJECT_ID, {
  projectId: TEST_PROJECT_ID,
  graphLayout: {
    mode: 'interactive',
    architectureMode: 'hierarchical',
    nodePositions: legacyFlatPositions,
  },
});

const loadedE = loadProjectState(TEST_PROJECT_ID);
assert.strictEqual(loadedE.graphLayout.architectureMode, 'hierarchical');
assert.deepStrictEqual(loadedE.graphLayout.nodePositions, legacyFlatPositions);
assert.deepStrictEqual(loadedE.graphLayout.layoutPositions.hierarchical, legacyFlatPositions);
assert.strictEqual(loadedE.graphLayout.layoutProvenances.hierarchical, 'automatic-hierarchical');
console.log('  ✓ Test E PASSED');

// Test F
console.log('Test F: Node lifecycle and identity...');
const initialPositions = { 'Node-1': { x: 100, y: 100 } };
assert.strictEqual(resolveAuthoritativePosition('Node-Deleted', { persistedPositions: initialPositions, hasAuthoritativePositions: true }), null);
assert.deepStrictEqual(resolveAuthoritativePosition('Node-1', { persistedPositions: initialPositions, hasAuthoritativePositions: true }).position, { x: 100, y: 100 });
console.log('  ✓ Test F PASSED');

// Test G
console.log('Test G: Layout options & transient UI setting immunity...');
updateProjectState(TEST_PROJECT_ID, { zoom: { zoom: 1.8, pan: { x: 20, y: 20 } } });
const loadedG = loadProjectState(TEST_PROJECT_ID);
assert.strictEqual(loadedG.zoom.zoom, 1.8);
assert.deepStrictEqual(loadedG.graphLayout.nodePositions, loadedE.graphLayout.nodePositions);
console.log('  ✓ Test G PASSED');

console.log('\nALL PHASE 1F POSITION CONTRACT TESTS PASSED SUCCESSFULLY!');

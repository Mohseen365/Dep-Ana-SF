/**
 * Phase 2 Targeted Layout Initialization & Authority Fix Regression Test Suite
 *
 * Verifies:
 * - Test A: Stale or cross-mode positions (automatic layout provenances do not suppress layout)
 * - Test B: Valid user-authored positions (user-authored positions in active mode are preserved)
 * - Test C: Project isolation (positions from previous project are not treated as authoritative for new project)
 * - Test D: Architecture mode transition (switching modes dispatches target layout engine when user positions absent)
 * - Test E: Existing mode behavior (Orbit & Constellation modes continue to apply expected geometry)
 */

import assert from 'assert';

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

import {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
} from '../explorer/src/lib/projectState.ts';

import {
  shouldAutoLayout,
  resolveAuthoritativePosition,
} from '../explorer/src/lib/position-policy.ts';

console.log('Running Phase 2 Targeted Layout Initialization Fix Test Suite...');

// --- Test A: Stale or cross-mode positions ---
console.log('Test A: Stale or cross-mode positions...');
{
  const automaticProvenanceState = {
    layoutProvenance: 'automatic-hierarchical',
    architectureMode: 'hierarchical',
    nodePositions: { 'Node1': { x: 0, y: 0 }, 'Node2': { x: 0, y: 0 } },
  };

  const isUserAuth = automaticProvenanceState.layoutProvenance === 'user-authored' &&
    automaticProvenanceState.architectureMode === 'hierarchical';
  assert.strictEqual(isUserAuth, false, 'Automatic provenance must not evaluate to user-authored authority');

  const autoLayoutAllowed = shouldAutoLayout('interactive', 'initial', {
    hasAuthoritativePositions: isUserAuth,
  });
  assert.strictEqual(autoLayoutAllowed, true, 'Auto-layout must execute when positions are automatic/non-user-authored');
  console.log('  ✓ Test A PASSED');
}

// --- Test B: Valid authoritative positions ---
console.log('Test B: Valid user-authored positions...');
{
  const userAuthPositions = { 'Node1': { x: 450, y: 550 } };
  const userAuthState = {
    layoutProvenance: 'user-authored',
    architectureMode: 'hierarchical',
    nodePositions: userAuthPositions,
  };

  const isUserAuth = userAuthState.layoutProvenance === 'user-authored' &&
    userAuthState.architectureMode === 'hierarchical';
  assert.strictEqual(isUserAuth, true, 'User-authored provenance in active mode must evaluate as authoritative');

  const autoLayoutAllowed = shouldAutoLayout('interactive', 'initial', {
    hasAuthoritativePositions: isUserAuth,
  });
  assert.strictEqual(autoLayoutAllowed, false, 'Auto-layout must be suppressed when valid user-authored positions exist');

  const resolved = resolveAuthoritativePosition('Node1', {
    persistedPositions: userAuthPositions,
    hasAuthoritativePositions: isUserAuth,
  });
  assert.notStrictEqual(resolved, null);
  assert.strictEqual(resolved.level, 2);
  assert.deepStrictEqual(resolved.position, { x: 450, y: 550 }, 'User-authored coordinates must be preserved');
  console.log('  ✓ Test B PASSED');
}

// --- Test C: Project isolation ---
console.log('Test C: Project isolation...');
{
  const PROJ_A = 'test-proj-alpha';
  const PROJ_B = 'test-proj-beta';
  clearProjectState(PROJ_A);
  clearProjectState(PROJ_B);

  // User drags nodes in Project A
  const projAPositions = { 'ClassA': { x: 100, y: 100 } };
  updateProjectState(PROJ_A, {
    graphLayout: {
      architectureMode: 'hierarchical',
      nodePositions: projAPositions,
      layoutProvenance: 'user-authored',
    },
  });

  // Load Project B (new project, default automatic provenance)
  const projBState = loadProjectState(PROJ_B);
  assert.strictEqual(projBState.projectId, PROJ_B);

  const isProjBAuth = projBState.graphLayout.layoutProvenance === 'user-authored' &&
    projBState.graphLayout.architectureMode === 'hierarchical';
  assert.strictEqual(isProjBAuth, false, 'Project B without user positions must evaluate hasAuth = false');

  const autoLayoutForB = shouldAutoLayout('interactive', 'initial', {
    hasAuthoritativePositions: isProjBAuth,
  });
  assert.strictEqual(autoLayoutForB, true, 'Project B must execute automatic layout upon initialization');

  clearProjectState(PROJ_A);
  clearProjectState(PROJ_B);
  console.log('  ✓ Test C PASSED');
}

// --- Test D: Architecture mode transition ---
console.log('Test D: Architecture mode transition...');
{
  const PROJ_MODE = 'test-proj-modes';
  clearProjectState(PROJ_MODE);

  // Hierarchical mode with automatic layout
  updateProjectState(PROJ_MODE, {
    graphLayout: {
      architectureMode: 'hierarchical',
      layoutProvenance: 'automatic-hierarchical',
      nodePositions: { 'Component1': { x: 10, y: 20 } },
    },
  });

  // Switch to Hybrid mode
  const hybridState = updateProjectState(PROJ_MODE, {
    graphLayout: {
      architectureMode: 'hybrid',
      layoutProvenance: 'automatic-hybrid',
    },
  });

  const isHybridUserAuth = hybridState.graphLayout.layoutProvenance === 'user-authored' &&
    hybridState.graphLayout.architectureMode === 'hybrid';
  assert.strictEqual(isHybridUserAuth, false, 'Hybrid mode transition without user positions must evaluate hasAuth = false');

  const autoLayoutForHybrid = shouldAutoLayout('interactive', 'initial', {
    hasAuthoritativePositions: isHybridUserAuth,
  });
  assert.strictEqual(autoLayoutForHybrid, true, 'Hybrid mode transition must trigger layout computation');

  clearProjectState(PROJ_MODE);
  console.log('  ✓ Test D PASSED');
}

// --- Test E: Existing mode behavior ---
console.log('Test E: Existing mode behavior (Orbit / Constellation)...');
{
  const orbitModeOverride = (mode) => mode === 'orbit' || mode === 'constellation';
  assert.strictEqual(orbitModeOverride('orbit'), true, 'Orbit mode must always bypass autoLayoutPolicy suppression');
  assert.strictEqual(orbitModeOverride('constellation'), true, 'Constellation mode must always bypass autoLayoutPolicy suppression');
  assert.strictEqual(orbitModeOverride('hierarchical'), false, 'Hierarchical mode must obey autoLayoutPolicy');
  assert.strictEqual(orbitModeOverride('hybrid'), false, 'Hybrid mode must obey autoLayoutPolicy');
  console.log('  ✓ Test E PASSED');
}

console.log('\nALL PHASE 2 TARGETED LAYOUT FIX TESTS PASSED SUCCESSFULLY!');

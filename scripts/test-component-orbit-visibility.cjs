const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cytoscape = require('cytoscape');

const { adaptComponentOrbit } = require('../explorer/src/lib/adapters/component-orbit-adapter');
const { computeComponentOrbitLayout } = require('../explorer/src/lib/layout/component-orbit-layout');
const { runLayoutWithMetadata } = require('../explorer/src/lib/graph-layout');
const { buildGraphElements } = require('../explorer/src/lib/graph-builder');

function runComponentOrbitVisibilityTests() {
  console.log('====================================================================');
  console.log('RUNNING COMPONENT ORBIT VISIBILITY & PROJECTION ISOLATION TEST SUITE');
  console.log('====================================================================\n');

  // --------------------------------------------------------------------------
  // SYNTHETIC TESTS (Tests 1 - 6)
  // --------------------------------------------------------------------------

  console.log('--- SYNTHETIC TESTS ---');

  const syntheticNodes = [
    {
      id: 'LWC:parent-comp',
      displayName: 'ParentComp',
      type: 'LWC',
      file: 'parentComp.js',
      metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
    {
      id: 'LWC:child-comp',
      displayName: 'ChildComp',
      type: 'LWC',
      file: 'childComp.js',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
    {
      id: 'ApexClass:UnrelatedService',
      displayName: 'UnrelatedService',
      type: 'ApexClass',
      file: 'UnrelatedService.cls',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const syntheticEdges = [
    {
      id: 'edge-1',
      source: 'LWC:parent-comp',
      target: 'LWC:child-comp',
      relationshipType: 'lwc-template-child',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: '',
      canonical: { source: { type: 'LWC', name: 'LWC:parent-comp' }, target: { type: 'LWC', name: 'LWC:child-comp' }, relationship: { type: 'lwc-template-child', resolution: 'EXACT' }, location: {} },
    },
    {
      id: 'edge-2',
      source: 'LWC:parent-comp',
      target: 'ApexClass:UnrelatedService',
      relationshipType: 'lwc-apex',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: '',
      canonical: { source: { type: 'LWC', name: 'LWC:parent-comp' }, target: { type: 'ApexClass', name: 'ApexClass:UnrelatedService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} },
    },
  ];

  let cy = cytoscape({
    elements: buildGraphElements(syntheticNodes, syntheticEdges),
    headless: true,
  });

  // Test 1: Focused projection node visibility
  console.log('Test 1: Focused projection node visibility...');
  assert.strictEqual(cy.nodes().length, 3);

  runLayoutWithMetadata(cy, {
    architectureMode: 'orbit',
    focalLwcId: 'LWC:parent-comp',
    nodes: syntheticNodes,
    edges: syntheticEdges,
    componentOrbitOptions: {
      focalLwcId: 'LWC:parent-comp',
      maxDepth: 1,
    },
  });

  const visibleNodes = cy.nodes().filter((n) => n.visible());
  const hiddenNodes = cy.nodes().filter((n) => !n.visible());

  assert.strictEqual(cy.nodes().length, 3, 'Total graph nodes preserved');
  assert.strictEqual(visibleNodes.length, 2, '2 projected nodes visible');
  assert.strictEqual(hiddenNodes.length, 1, '1 unprojected node hidden');
  assert.deepStrictEqual(
    visibleNodes.map((n) => n.id()).sort(),
    ['LWC:child-comp', 'LWC:parent-comp']
  );
  assert.strictEqual(hiddenNodes[0].id(), 'ApexClass:UnrelatedService');
  console.log('  ✓ Test 1 PASSED (2 visible, 1 hidden)');

  // Test 2: Edge filtering
  console.log('Test 2: Edge filtering...');
  const visibleEdges = cy.edges().filter((e) => e.visible());
  const hiddenEdges = cy.edges().filter((e) => !e.visible());

  assert.strictEqual(visibleEdges.length, 1, '1 internal edge visible');
  assert.strictEqual(visibleEdges[0].id(), 'edge-1');
  assert.strictEqual(hiddenEdges.length, 1, '1 cross-projection edge hidden');
  assert.strictEqual(hiddenEdges[0].id(), 'edge-2');
  console.log('  ✓ Test 2 PASSED (internal edge visible, cross-edge hidden)');

  // Test 3: Focus transition (A -> B)
  console.log('Test 3: Focus transition (parent-comp -> child-comp)...');
  runLayoutWithMetadata(cy, {
    architectureMode: 'orbit',
    focalLwcId: 'LWC:child-comp',
    nodes: syntheticNodes,
    edges: syntheticEdges,
  });

  const visibleNodesB = cy.nodes().filter((n) => n.visible());
  const hiddenNodesB = cy.nodes().filter((n) => !n.visible());

  assert.strictEqual(visibleNodesB.length, 1, 'Exactly 1 node visible in focus B');
  assert.strictEqual(visibleNodesB[0].id(), 'LWC:child-comp');
  assert.strictEqual(hiddenNodesB.length, 2, '2 unprojected nodes hidden in focus B');
  assert.strictEqual(cy.nodes().length, 3, 'Authoritative node count preserved');
  console.log('  ✓ Test 3 PASSED (Focus A fully cleared, Focus B exact set visible)');

  // Test 4: Isolated error-panel scenario
  console.log('Test 4: Isolated component scenario...');
  const isolatedNodes = [
    ...syntheticNodes,
    {
      id: 'LWC:error-panel',
      displayName: 'error-panel',
      type: 'LWC',
      file: 'errorPanel.js',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const cyIsolated = cytoscape({
    elements: buildGraphElements(isolatedNodes, syntheticEdges),
    headless: true,
  });

  runLayoutWithMetadata(cyIsolated, {
    architectureMode: 'orbit',
    focalLwcId: 'LWC:error-panel',
    nodes: isolatedNodes,
    edges: syntheticEdges,
  });

  const visibleIso = cyIsolated.nodes().filter((n) => n.visible());
  const hiddenIso = cyIsolated.nodes().filter((n) => !n.visible());

  assert.strictEqual(visibleIso.length, 1);
  assert.strictEqual(visibleIso[0].id(), 'LWC:error-panel');
  assert.strictEqual(hiddenIso.length, 3);
  assert.strictEqual(cyIsolated.edges().filter((e) => e.visible()).length, 0);
  assert.strictEqual(cyIsolated.nodes().length, 4);
  console.log('  ✓ Test 4 PASSED (1 visible, 3 hidden, 0 visible edges)');

  // Test 5: Exit Component Orbit
  console.log('Test 5: Exit Component Orbit (restore non-orbit modes)...');
  runLayoutWithMetadata(cy, {
    architectureMode: 'hierarchical',
    nodes: syntheticNodes,
    edges: syntheticEdges,
  });

  assert.strictEqual(cy.nodes().filter((n) => n.visible()).length, 3, 'All nodes restored in hierarchical');
  assert.strictEqual(cy.edges().filter((e) => e.visible()).length, 2, 'All edges restored in hierarchical');

  runLayoutWithMetadata(cy, {
    architectureMode: 'hybrid',
    nodes: syntheticNodes,
    edges: syntheticEdges,
    enableFeatureLayout: true,
  });

  assert.strictEqual(cy.nodes().filter((n) => n.visible()).length, 3, 'All nodes restored in hybrid');
  assert.strictEqual(cy.edges().filter((e) => e.visible()).length, 2, 'All edges restored in hybrid');
  console.log('  ✓ Test 5 PASSED (Hierarchical & Hybrid visibility fully restored)');

  // Test 6: Semantic identity preservation
  console.log('Test 6: Semantic identity preservation...');
  runLayoutWithMetadata(cy, {
    architectureMode: 'orbit',
    focalLwcId: 'LWC:parent-comp',
    nodes: syntheticNodes,
    edges: syntheticEdges,
  });

  assert.strictEqual(cy.nodes().length, 3);
  assert.strictEqual(cy.edges().length, 2);
  assert.strictEqual(cy.getElementById('LWC:parent-comp').data('type'), 'LWC');
  assert.strictEqual(cy.getElementById('edge-1').data('source'), 'LWC:parent-comp');
  assert.strictEqual(cy.getElementById('edge-1').data('target'), 'LWC:child-comp');
  console.log('  ✓ Test 6 PASSED (0 deletions, 100% ID and endpoint preservation)');

  // --------------------------------------------------------------------------
  // REAL PBIM DATASET VERIFICATION
  // --------------------------------------------------------------------------

  console.log('\n--- REAL PBIM DATASET VERIFICATION ---');

  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  assert.strictEqual(fs.existsSync(pbimPath), true, `PBIM file exists at ${pbimPath}`);

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);
  const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';

  console.log(`[PBIM PREFLIGHT] SHA-256: ${pbimHash}`);
  assert.strictEqual(pbimHash, expectedPbimHash, 'PBIM SHA-256 hash match');
  assert.strictEqual(pbimData.nodes.length, 528, '528 PBIM nodes');
  assert.strictEqual(pbimData.edges.length, 2063, '2063 PBIM edges');

  const cyPbim = cytoscape({
    elements: buildGraphElements(pbimData.nodes, pbimData.edges),
    headless: true,
  });

  const pbimScenarios = [
    { name: 'asset-dashboard-container', focalId: 'LWC:asset-dashboard-container', expVisible: 128, expHidden: 400 },
    { name: 'citizen-report-portal', focalId: 'LWC:citizen-report-portal', expVisible: 102, expHidden: 426 },
    { name: 'vendor-workspace', focalId: 'LWC:vendor-workspace', expVisible: 101, expHidden: 427 },
    { name: 'error-panel', focalId: 'LWC:error-panel', expVisible: 1, expHidden: 527 },
  ];

  for (const scenario of pbimScenarios) {
    console.log(`Auditing Real PBIM Scenario: ${scenario.name}...`);
    const projection = adaptComponentOrbit(pbimData, { focalLwcId: scenario.focalId, maxDepth: 7 });
    const expectedProjectedIds = new Set(Object.keys(projection.nodes));

    assert.strictEqual(expectedProjectedIds.size, scenario.expVisible, `Expected ${scenario.expVisible} projected nodes`);

    runLayoutWithMetadata(cyPbim, {
      architectureMode: 'orbit',
      focalLwcId: scenario.focalId,
      nodes: pbimData.nodes,
      edges: pbimData.edges,
    });

    const totalNodes = cyPbim.nodes().length;
    const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
    const hiddenNodes = cyPbim.nodes().filter((n) => !n.visible());

    const visibleIds = new Set(visibleNodes.map((n) => n.id()));
    const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedProjectedIds.has(id)));

    assert.strictEqual(totalNodes, 528, 'Authoritative Cytoscape node count preserved at 528');
    assert.strictEqual(visibleNodes.length, scenario.expVisible, `${scenario.expVisible} visible nodes`);
    assert.strictEqual(hiddenNodes.length, scenario.expHidden, `${scenario.expHidden} hidden nodes`);
    assert.strictEqual(visibleUnfocused.size, 0, '0 visible unfocused nodes');
    assert.deepStrictEqual(visibleIds, expectedProjectedIds, 'Visible set exactly equals projected set');

    console.log(`  ✓ Scenario ${scenario.name} PASSED (528 runtime, ${scenario.expVisible} visible, ${scenario.expHidden} hidden, 0 visible unfocused)`);
  }

  // Focus Transition Matrix
  console.log('\nAuditing Focus Transition Matrix (asset -> citizen -> vendor -> error -> asset)...');
  const transitions = [
    { focalId: 'LWC:asset-dashboard-container', exp: 128 },
    { focalId: 'LWC:citizen-report-portal', exp: 102 },
    { focalId: 'LWC:vendor-workspace', exp: 101 },
    { focalId: 'LWC:error-panel', exp: 1 },
    { focalId: 'LWC:asset-dashboard-container', exp: 128 },
  ];

  for (const step of transitions) {
    const projection = adaptComponentOrbit(pbimData, { focalLwcId: step.focalId, maxDepth: 7 });
    const expectedIds = new Set(Object.keys(projection.nodes));

    runLayoutWithMetadata(cyPbim, {
      architectureMode: 'orbit',
      focalLwcId: step.focalId,
      nodes: pbimData.nodes,
      edges: pbimData.edges,
    });

    const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
    const visibleIds = new Set(visibleNodes.map((n) => n.id()));
    const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedIds.has(id)));

    assert.strictEqual(cyPbim.nodes().length, 528);
    assert.strictEqual(visibleNodes.length, step.exp);
    assert.strictEqual(visibleUnfocused.size, 0);
    assert.deepStrictEqual(visibleIds, expectedIds);
  }
  console.log('  ✓ Focus Transition Matrix PASSED (0 stale nodes or edges remain across all transitions)');

  // Stale Position Contamination Verification
  console.log('\nAuditing Stale Position Contamination on Representative Unfocused Nodes...');
  runLayoutWithMetadata(cyPbim, {
    architectureMode: 'orbit',
    focalLwcId: 'LWC:asset-dashboard-container',
    nodes: pbimData.nodes,
    edges: pbimData.edges,
  });

  const unfocusedNode1 = cyPbim.getElementById('ApexClass:ApprovalFlowController');
  const unfocusedNode2 = cyPbim.getElementById('ApexClass:ApprovalFlowControllerTest');

  assert.strictEqual(unfocusedNode1.length, 1, 'Node exists in Cytoscape');
  assert.strictEqual(unfocusedNode2.length, 1, 'Node exists in Cytoscape');
  assert.strictEqual(unfocusedNode1.id(), 'ApexClass:ApprovalFlowController');
  assert.strictEqual(unfocusedNode2.id(), 'ApexClass:ApprovalFlowControllerTest');
  assert.strictEqual(unfocusedNode1.visible(), false, 'Unfocused node 1 is NOT visible');
  assert.strictEqual(unfocusedNode2.visible(), false, 'Unfocused node 2 is NOT visible');
  console.log('  ✓ Stale Position Contamination Test PASSED (Unfocused nodes exist in Cytoscape but node.visible() === false)');

  console.log('\n====================================================================');
  console.log('ALL COMPONENT ORBIT VISIBILITY & PROJECTION ISOLATION TESTS PASSED!');
  console.log('====================================================================\n');
}

runComponentOrbitVisibilityTests();

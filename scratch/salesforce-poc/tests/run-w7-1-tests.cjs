/**
 * run-w7-1-tests.cjs
 * Hardened Unit Test Suite for Task W7-1: daDiagnosticsView LWC
 *
 * Verifies:
 * 1. Component initialization and default state.
 * 2. Diagnostic scorecard derivations (health score, cycles, unassigned ratio, coverage density).
 * 3. Layer distribution table generation.
 * 4. Empty payload handling (zero counts, no crash).
 * 5. Malformed payload handling (clean error state).
 * 6. Preserves SELECTION != NAVIGATION (read-only view, no side effects).
 * 7. Preserves shared graph payload immutability.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createDiagnosticsInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaDiagnosticsView', 'class DaDiagnosticsView');
    code += '\nreturn DaDiagnosticsView;';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._dispatchedEvents = [];
            }
            dispatchEvent(evt) {
                this._dispatchedEvents.push(evt);
            }
        }
    };

    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    return new ctor();
}

async function runW71Tests() {
    console.log('Running Task W7-1 (daDiagnosticsView LWC) Test Suite...');
    console.log('=====================================================');

    const comp = createDiagnosticsInstance();
    assert.strictEqual(comp.isEmpty, true, 'Initially empty without payload');
    assert.strictEqual(comp.totalNodes, 0);
    console.log('  ✓ 1. Initial default state verified');

    const samplePayload = {
        nodes: [
            { id: 'ApexClass.AccountService', label: 'AccountService', layer: 'Service', risk: 'HIGH', coverageStatus: 'COVERED', coverageDensity: 85 },
            { id: 'ApexClass.AccountSelector', label: 'AccountSelector', layer: 'Selector', risk: 'LOW', coverageStatus: 'COVERED', coverageDensity: 90 },
            { id: 'ApexClass.LegacyEngine', label: 'LegacyEngine', layer: 'Unassigned', risk: 'HIGH', coverageStatus: 'UNTESTED', hasCycle: true },
            { id: 'LWC.accountCard', label: 'accountCard', layer: 'UI', risk: 'LOW', coverageStatus: 'UNTESTED' }
        ],
        edges: [
            { id: 'e1', source: 'LWC.accountCard', target: 'ApexClass.AccountService' },
            { id: 'e2', source: 'ApexClass.LegacyEngine', target: 'ApexClass.LegacyEngine', isUnresolved: true }
        ],
        cycles: [
            { id: 'c1', nodeIds: ['ApexClass.LegacyEngine'] }
        ]
    };

    // Snapshot baseline BEFORE assigning input or executing component operations
    const baselineSnapshot = JSON.parse(JSON.stringify(samplePayload));

    // Assign actual unfrozen payload under test directly to component
    comp.payload = samplePayload;
    assert.strictEqual(comp.isEmpty, false);
    assert.strictEqual(comp.totalNodes, 4, '4 total nodes');
    assert.strictEqual(comp.cycleCount, 1, '1 cycle group');
    assert.strictEqual(comp.cyclicNodesCount, 1, '1 cyclic node');
    assert.strictEqual(comp.unassignedCount, 1, '1 unassigned node');
    assert.strictEqual(comp.unassignedPercent, 25, '25% unassigned');
    assert.strictEqual(comp.coveredNodesCount, 2, '2 covered nodes');
    assert.strictEqual(comp.untestedNodesCount, 2, '2 untested nodes');
    assert.strictEqual(comp.coverageDensityPercent, 50, '50% coverage');
    assert.strictEqual(comp.highRiskCount, 2, '2 high risk nodes');
    assert.strictEqual(comp.unresolvedCount, 1, '1 unresolved edge');
    console.log('  ✓ 2. Health metrics and scorecard derivation verified');

    // 3. Health score computation
    const score = comp.healthScore;
    assert.ok(score < 80 && score >= 0, `Health score reflects debt penalties: ${score}`);
    assert.strictEqual(comp.healthScoreClass, 'card-value health-warning');
    console.log('  ✓ 3. Weighted health score and styling threshold verified');

    // 4. Layer breakdown
    const breakdowns = comp.layerBreakdowns;
    assert.strictEqual(breakdowns.length, 4, '4 layers mapped');
    const serviceLayer = breakdowns.find(b => b.layer === 'Service');
    assert.strictEqual(serviceLayer.count, 1);
    assert.strictEqual(serviceLayer.covered, 1);
    assert.strictEqual(serviceLayer.highRisk, 1);
    console.log('  ✓ 4. Layer breakdown distribution verified');

    // 5. Empty and malformed payload resilience
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.healthScore, 100);

    comp.payload = '{"bad": json';
    assert.strictEqual(comp.hasError, true);
    console.log('  ✓ 5. Empty and malformed payload resilience verified');

    // Read-only invariant: confirm no events dispatched
    assert.strictEqual(comp._dispatchedEvents.length, 0, 'Diagnostics view is read-only and must emit zero events');

    // 6. Real Payload Immutability Verification (Full object integrity)
    assert.deepStrictEqual(samplePayload, baselineSnapshot, 'Component mutated the original input payload');

    // Negative controls in isolated harness: verify comparison detects mutations
    const negNodeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNodeTest.nodes[0].coverageDensity = 10;
    assert.throws(() => {
        assert.deepStrictEqual(negNodeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect node property mutation');

    const negEdgeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negEdgeTest.edges[0].target = 'ApexClass.Mutated';
    assert.throws(() => {
        assert.deepStrictEqual(negEdgeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect edge property mutation');

    const negNestedTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNestedTest.nodes[0].nested = { test: true };
    assert.throws(() => {
        assert.deepStrictEqual(negNestedTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect nested property mutation');

    console.log('  ✓ 6. Payload immutability preserved');

    console.log('=====================================================');
    console.log('Task W7-1 Test Results: ALL 6 TESTS PASSED');
}

runW71Tests().catch(err => {
    console.error('Task W7-1 Test Failure:', err);
    process.exit(1);
});

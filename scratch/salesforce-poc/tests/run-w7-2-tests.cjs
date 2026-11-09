/**
 * run-w7-2-tests.cjs
 * Hardened Unit Test Suite for Task W7-2: daArchitectureDnaBarcode LWC
 *
 * Verifies:
 * 1. Component initialization and defaults.
 * 2. Deterministic barcode band rendering and width calculation.
 * 3. Multi-dimensional color mapping (layer, risk, coverage, coupling).
 * 4. Active profile derivation and details card rendering.
 * 5. Selection event emission (nodeselect, bubbles, composed, SELECTION != NAVIGATION).
 * 6. Empty and malformed payload resilience.
 * 7. Shared graph payload immutability.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createBarcodeInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaArchitectureDnaBarcode', 'class DaArchitectureDnaBarcode');
    code += '\nreturn DaArchitectureDnaBarcode;';

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

async function runW72Tests() {
    console.log('Running Task W7-2 (daArchitectureDnaBarcode LWC) Test Suite...');
    console.log('===========================================================');

    const comp = createBarcodeInstance();
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.selectedDimension, 'layer');
    console.log('  ✓ 1. Initial default state verified');

    const samplePayload = {
        nodes: [
            { id: 'ApexClass.AccountService', label: 'AccountService', layer: 'Service', risk: 'HIGH', coverageStatus: 'COVERED', coupling: 16 },
            { id: 'ApexClass.AccountSelector', label: 'AccountSelector', layer: 'Selector', risk: 'LOW', coverageStatus: 'COVERED', coupling: 4 },
            { id: 'ApexClass.LegacyEngine', label: 'LegacyEngine', layer: 'Unassigned', risk: 'HIGH', coverageStatus: 'UNTESTED', coupling: 9 },
            { id: 'LWC.accountCard', label: 'accountCard', layer: 'UI', risk: 'LOW', coverageStatus: 'UNKNOWN', coupling: 2 }
        ],
        edges: []
    };

    // Snapshot baseline BEFORE assigning input or executing component operations
    const baselineSnapshot = JSON.parse(JSON.stringify(samplePayload));

    // Assign actual unfrozen payload under test directly to component
    comp.payload = samplePayload;
    assert.strictEqual(comp.isEmpty, false);
    assert.strictEqual(comp.renderedBands.length, 4, '4 barcode bands generated');
    assert.strictEqual(comp.renderedBands[0].w, 250, '1000px / 4 nodes = 250px band width');
    console.log('  ✓ 2. Barcode strip rendering and deterministic band width verified');

    // 3. Multi-dimensional color mapping
    // Dimension: layer
    comp.selectedDimension = 'layer';
    assert.ok(comp.renderedBands.some(b => b.fill === '#10b981'), 'Service layer color mapped');

    // Dimension: risk
    comp.selectedDimension = 'risk';
    assert.ok(comp.renderedBands.some(b => b.fill === '#ef4444'), 'High risk color mapped');

    // Dimension: coverage
    comp.selectedDimension = 'coverage';
    assert.ok(comp.renderedBands.some(b => b.fill === '#ef4444'), 'Untested coverage red mapped');
    assert.ok(comp.renderedBands.some(b => b.fill === '#10b981'), 'Covered green mapped');

    // Dimension: coupling
    comp.selectedDimension = 'coupling';
    assert.ok(comp.renderedBands.some(b => b.fill === '#ef4444'), 'Hotspot coupling (>15) red mapped');
    console.log('  ✓ 3. Multi-dimensional barcode color mappings verified');

    // 4. Active node profile
    assert.strictEqual(comp.activeNode.id, samplePayload.nodes[0].id);
    comp.selectedNodeId = 'ApexClass.AccountSelector';
    assert.strictEqual(comp.activeNode.id, 'ApexClass.AccountSelector');
    console.log('  ✓ 4. Active component profile resolution verified');

    // 5. Band click CustomEvent emission adhering to CONTRACT-06 & SELECTION != NAVIGATION
    comp.handleBandClick({ currentTarget: { dataset: { nodeId: 'ApexClass.AccountService' } } });
    assert.strictEqual(comp._dispatchedEvents.length, 1);
    const evt = comp._dispatchedEvents[0];
    assert.strictEqual(evt.type, 'nodeselect');
    assert.strictEqual(evt.detail.nodeId, 'ApexClass.AccountService');
    assert.strictEqual(evt.detail.sourceView, 'barcode');
    assert.strictEqual(evt.bubbles, true);
    assert.strictEqual(evt.composed, true);
    assert.strictEqual(evt.cancelable, false, 'Event cancelable must be false per CONTRACT-06');
    console.log('  ✓ 5. Band click nodeselect event verified (SELECTION != NAVIGATION)');

    // 6. Empty and malformed handling
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.renderedBands.length, 0);

    comp.payload = '{ invalid';
    assert.strictEqual(comp.hasError, true);
    console.log('  ✓ 6. Empty and malformed payload resilience verified');

    // 7. Real Payload Immutability Verification (Full object integrity)
    assert.deepStrictEqual(samplePayload, baselineSnapshot, 'Component mutated the original input payload');

    // Negative controls in isolated harness: verify comparison detects node, edge, and nested mutations
    const negNodeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNodeTest.nodes[0].coupling = 999;
    assert.throws(() => {
        assert.deepStrictEqual(negNodeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect node property mutation');

    const negEdgeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negEdgeTest.edges.push({ id: 'e_mutated', source: 'a', target: 'b' });
    assert.throws(() => {
        assert.deepStrictEqual(negEdgeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect edge collection mutation');

    const negNestedTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNestedTest.nodes[0].nested = { test: true };
    assert.throws(() => {
        assert.deepStrictEqual(negNestedTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect nested property mutation');

    console.log('  ✓ 7. Payload immutability preserved');

    console.log('===========================================================');
    console.log('Task W7-2 Test Results: ALL 7 TESTS PASSED');
}

runW72Tests().catch(err => {
    console.error('Task W7-2 Test Failure:', err);
    process.exit(1);
});

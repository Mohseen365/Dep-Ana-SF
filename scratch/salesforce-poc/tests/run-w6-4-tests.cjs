/**
 * run-w6-4-tests.cjs
 * Hardened Unit Test Suite for Task W6-4: daHotspotsView LWC
 *
 * Verifies:
 * 1. Component initialization and defaults.
 * 2. Hotspot identification via coupling > 15.
 * 3. Hotspot identification via fanIn > 10.
 * 4. Hotspot identification via cycles and HIGH risk.
 * 5. Deterministic severity ranking.
 * 6. Category, risk, and search filtering.
 * 7. Selection event emission (nodeselect, bubbles, composed, SELECTION != NAVIGATION).
 * 8. Empty and malformed payload resilience.
 * 9. Input graph payload immutability.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createHotspotsInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daHotspotsView/daHotspotsView.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaHotspotsView', 'class DaHotspotsView');
    code += '\nreturn DaHotspotsView;';

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

async function runW64Tests() {
    console.log('Running Task W6-4 (daHotspotsView LWC) Test Suite...');
    console.log('==================================================');

    const comp = createHotspotsInstance();
    assert.strictEqual(comp.isEmpty, true, 'Initially empty');
    assert.strictEqual(comp.selectedCategory, 'all');
    console.log('  ✓ 1. Initial default state verified');

    const samplePayload = {
        nodes: [
            // Hotspot 1: High Coupling (22)
            { id: 'ApexClass.GodClass', label: 'GodClass', layer: 'Domain', risk: 'HIGH', coupling: 22, fanIn: 12, fanOut: 10, loc: 1200 },
            // Hotspot 2: High Fan-In (14)
            { id: 'ApexClass.SharedUtil', label: 'SharedUtil', layer: 'Utility', risk: 'LOW', coupling: 15, fanIn: 14, fanOut: 1, loc: 250 },
            // Hotspot 3: Cyclic participant
            { id: 'ApexClass.CycleA', label: 'CycleA', layer: 'Service', risk: 'MEDIUM', coupling: 4, fanIn: 2, fanOut: 2, hasCycle: true },
            // Non-hotspot: Normal node
            { id: 'ApexClass.NormalService', label: 'NormalService', layer: 'Service', risk: 'LOW', coupling: 3, fanIn: 1, fanOut: 2, hasCycle: false }
        ],
        cycles: [
            { id: 'c1', nodeIds: ['ApexClass.CycleA'] }
        ]
    };

    // Snapshot baseline BEFORE assigning input or executing component operations
    const baselineSnapshot = JSON.parse(JSON.stringify(samplePayload));

    // Assign actual unfrozen payload under test directly to component
    comp.payload = samplePayload;
    assert.strictEqual(comp.isEmpty, false);
    // GodClass, SharedUtil, CycleA should be hotspots; NormalService should NOT
    assert.strictEqual(comp.hotspots.length, 3, 'Exactly 3 hotspots qualified');
    assert.strictEqual(comp.hotspots[0].id, 'ApexClass.GodClass', 'Highest severity ranked first');
    console.log('  ✓ 2. Hotspot threshold detection and deterministic ranking verified');

    // 3. Category filtering (Coupling > 15)
    comp.selectedCategory = 'coupling';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.GodClass');

    // 4. Category filtering (Fan-In > 10)
    comp.selectedCategory = 'fanIn';
    assert.strictEqual(comp.filteredHotspots.length, 2, 'GodClass (12) and SharedUtil (14)');

    // 5. Category filtering (Cycles)
    comp.selectedCategory = 'cycles';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.CycleA');
    comp.selectedCategory = 'all'; // Reset
    console.log('  ✓ 3. Category filtering verified');

    // 6. Risk filtering
    comp.selectedRisk = 'HIGH';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.GodClass');
    comp.selectedRisk = ''; // Reset

    // 7. Search filtering
    comp.searchQuery = 'Shared';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.SharedUtil');
    comp.searchQuery = ''; // Reset
    console.log('  ✓ 4. Risk and search filtering verified');

    // 8. Selection CustomEvent emission adhering to CONTRACT-06 & SELECTION != NAVIGATION
    comp.handleRowClick({ currentTarget: { dataset: { nodeId: 'ApexClass.GodClass' } } });
    assert.strictEqual(comp._dispatchedEvents.length, 1);
    const evt = comp._dispatchedEvents[0];
    assert.strictEqual(evt.type, 'nodeselect');
    assert.strictEqual(evt.detail.nodeId, 'ApexClass.GodClass');
    assert.strictEqual(evt.detail.sourceView, 'hotspots');
    assert.strictEqual(evt.bubbles, true);
    assert.strictEqual(evt.composed, true);
    assert.strictEqual(evt.cancelable, false, 'Event cancelable must be false per CONTRACT-06');
    console.log('  ✓ 5. Row click nodeselect event verified (SELECTION != NAVIGATION)');

    // 9. Empty and malformed handling
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.filteredHotspots.length, 0);

    comp.payload = '{ invalid';
    assert.strictEqual(comp.hasError, true);
    assert.strictEqual(comp.filteredHotspots.length, 0);
    console.log('  ✓ 6. Empty and malformed payload resilience verified');

    // 10. Real Payload Immutability Verification (Full object integrity)
    assert.deepStrictEqual(samplePayload, baselineSnapshot, 'Component mutated the original input payload');

    // Negative controls in isolated harness: verify comparison detects mutations
    const negNodeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNodeTest.nodes[0].coupling = 999;
    assert.throws(() => {
        assert.deepStrictEqual(negNodeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect node property mutation');

    const negEdgeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negEdgeTest.cycles[0].nodeIds = ['ApexClass.Mutated'];
    assert.throws(() => {
        assert.deepStrictEqual(negEdgeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect cycle/edge property mutation');

    const negNestedTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNestedTest.nodes[0].nested = { test: true };
    assert.throws(() => {
        assert.deepStrictEqual(negNestedTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect nested property mutation');

    console.log('  ✓ 7. Payload immutability preserved');

    console.log('==================================================');
    console.log('Task W6-4 Test Results: ALL 7 TESTS PASSED');
}

runW64Tests().catch(err => {
    console.error('Task W6-4 Test Failure:', err);
    process.exit(1);
});

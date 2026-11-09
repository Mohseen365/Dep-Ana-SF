/**
 * run-w6-4-tests.cjs
 * Hardened Unit Test Suite for Task W6-4: daHotspotsView LWC
 *
 * Verifies:
 * 1. Component initialization and default state.
 * 2. Hotspot threshold detection and deterministic ranking (Severity Score DESC, ID ASC).
 * 3. Category filtering (all, coupling, fanIn, cycles).
 * 4. Risk and search query filtering.
 * 5. Row click selection event emission adhering to CONTRACT-06 & SELECTION != NAVIGATION.
 * 6. Empty and malformed payload resilience.
 * 7. Real payload immutability preserved.
 * 8. @api graphPayload and @api payload property aliases.
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

    const CustomEvent = class {
        constructor(type, options) {
            this.type = type;
            this.detail = options ? options.detail : null;
            this.bubbles = options ? !!options.bubbles : false;
            this.composed = options ? !!options.composed : false;
            this.cancelable = options ? !!options.cancelable : false;
        }
    };

    const ctor = new Function('LightningElement', 'CustomEvent', code)(LwcMock.LightningElement, CustomEvent);
    return new ctor();
}

async function runW64Tests() {
    console.log('Running Task W6-4 (daHotspotsView LWC) Test Suite...');
    console.log('==================================================');

    const comp = createHotspotsInstance();
    assert.strictEqual(comp.isEmpty, true, 'Initially empty without payload');
    assert.strictEqual(comp.selectedCategory, 'all');
    console.log('  ✓ 1. Initial default state verified');

    const samplePayload = {
        nodes: [
            { id: 'ApexClass.GodClass', label: 'GodClass', layer: 'Domain', risk: 'HIGH', coupling: 20, fanIn: 15, fanOut: 5, cyclomaticComplexity: 45, loc: 1200 },
            { id: 'ApexClass.SharedUtil', label: 'SharedUtil', layer: 'Core', risk: 'MEDIUM', coupling: 12, fanIn: 18, fanOut: 2, cyclomaticComplexity: 10, loc: 300 },
            { id: 'ApexClass.CycleA', label: 'CycleA', layer: 'Service', risk: 'LOW', coupling: 4, fanIn: 2, fanOut: 2, cyclomaticComplexity: 5, loc: 150, hasCycle: true },
            { id: 'ApexClass.CleanService', label: 'CleanService', layer: 'Service', risk: 'LOW', coupling: 2, fanIn: 1, fanOut: 1, cyclomaticComplexity: 3, loc: 80 }
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
    assert.strictEqual(comp.hotspots.length, 3, 'CleanService excluded, 3 hotspots identified');

    // 2. Ranking verification (GodClass score: 40(risk) + 20(coupling) + 15(fanIn) = 75)
    const top = comp.filteredHotspots[0];
    assert.strictEqual(top.id, 'ApexClass.GodClass');
    assert.strictEqual(top.rank, 1);
    assert.strictEqual(top.score, 75);
    console.log('  ✓ 2. Hotspot threshold detection and deterministic ranking verified');

    // 3. Category filtering
    comp.selectedCategory = 'coupling';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.GodClass');

    comp.selectedCategory = 'fanIn';
    assert.strictEqual(comp.filteredHotspots.length, 2);

    comp.selectedCategory = 'cycles';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.CycleA');
    comp.selectedCategory = 'all'; // Reset
    console.log('  ✓ 3. Category filtering verified');

    // 4. Risk filtering
    comp.selectedRisk = 'HIGH';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.GodClass');
    comp.selectedRisk = ''; // Reset

    // 5. Search filtering
    comp.searchQuery = 'Shared';
    assert.strictEqual(comp.filteredHotspots.length, 1);
    assert.strictEqual(comp.filteredHotspots[0].id, 'ApexClass.SharedUtil');
    comp.searchQuery = ''; // Reset
    console.log('  ✓ 4. Risk and search filtering verified');

    // 6. Selection CustomEvent emission adhering to CONTRACT-06 & SELECTION != NAVIGATION
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

    // 7. Empty and malformed handling
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.filteredHotspots.length, 0);

    comp.payload = '{ invalid';
    assert.strictEqual(comp.hasError, true);
    assert.strictEqual(comp.filteredHotspots.length, 0);
    console.log('  ✓ 6. Empty and malformed payload resilience verified');

    // 8. Property alias verification (@api graphPayload)
    const compAlias = createHotspotsInstance();
    compAlias.graphPayload = samplePayload;
    assert.strictEqual(compAlias.isEmpty, false);
    assert.strictEqual(compAlias.hotspots.length, 3);
    console.log('  ✓ 7. Property alias graphPayload and payload verified');

    // 9. Real Payload Immutability Verification (Full object integrity)
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

    console.log('  ✓ 8. Payload immutability preserved');

    console.log('==================================================');
    console.log('Task W6-4 Test Results: ALL 8 TESTS PASSED');
}

runW64Tests().catch(err => {
    console.error('Task W6-4 Test Failure:', err);
    process.exit(1);
});

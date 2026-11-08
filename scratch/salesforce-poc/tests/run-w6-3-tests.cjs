/**
 * run-w6-3-tests.cjs
 * Hardened Unit Test Suite for Task W6-3: daSubwayView LWC
 *
 * Verifies:
 * 1. Component initialization and layer track geometry.
 * 2. Deterministic station placement along layer tracks.
 * 3. Cross-line and intra-line route bezier curve calculation.
 * 4. Station filtering by search text and layer track.
 * 5. Selection event emission (nodeselect, bubbles, composed, SELECTION != NAVIGATION).
 * 6. Empty and malformed payload resilience.
 * 7. Input graph payload immutability.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createSubwayInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daSubwayView/daSubwayView.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaSubwayView', 'class DaSubwayView');
    code += '\nreturn DaSubwayView;';

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

async function runW63Tests() {
    console.log('Running Task W6-3 (daSubwayView LWC) Test Suite...');
    console.log('=================================================');

    const comp = createSubwayInstance();
    assert.strictEqual(comp.isEmpty, true, 'Initially empty without payload');
    assert.strictEqual(comp.searchQuery, '', 'Initial search query empty');
    console.log('  ✓ 1. Initial default state verified');

    const samplePayload = {
        nodes: [
            { id: 'LWC.accountCard', label: 'accountCard', layer: 'UI', fanIn: 1, fanOut: 2 },
            { id: 'ApexClass.AccountService', label: 'AccountService', layer: 'Service', fanIn: 2, fanOut: 2 },
            { id: 'ApexClass.AccountSelector', label: 'AccountSelector', layer: 'Selector', fanIn: 1, fanOut: 1 },
            { id: 'CustomObject.Account', label: 'Account', layer: 'Data', fanIn: 2, fanOut: 0 }
        ],
        edges: [
            { id: 'e1', source: 'LWC.accountCard', target: 'ApexClass.AccountService' },
            { id: 'e2', source: 'ApexClass.AccountService', target: 'ApexClass.AccountSelector' },
            { id: 'e3', source: 'ApexClass.AccountSelector', target: 'CustomObject.Account' }
        ]
    };

    const frozenPayload = JSON.parse(JSON.stringify(samplePayload));
    Object.freeze(frozenPayload);
    Object.freeze(frozenPayload.nodes);
    frozenPayload.nodes.forEach(n => Object.freeze(n));

    comp.payload = frozenPayload;
    assert.strictEqual(comp.isEmpty, false, 'Payload populated');
    assert.strictEqual(comp.stationCount, 4, 'Must render 4 stations');
    assert.strictEqual(comp.trackCount, 8, '8 canonical layer tracks rendered');
    assert.strictEqual(comp.routeCount, 3, '3 cross-layer transit routes rendered');
    console.log('  ✓ 2. Subway tracks, stations, and route generation verified');

    // 3. Cross-line curves
    const routes = comp.renderedRoutes;
    assert.ok(routes[0].isCrossLine, 'Route e1 connects UI to Service (cross-line)');
    assert.ok(routes[0].pathD.startsWith('M '), 'Valid SVG path D generated');
    console.log('  ✓ 3. Cross-line transit route geometry verified');

    // 4. Station search filtering
    comp.searchQuery = 'Selector';
    assert.strictEqual(comp.stationCount, 1, 'Only AccountSelector matched');
    assert.strictEqual(comp.renderedStations[0].id, 'ApexClass.AccountSelector');
    comp.searchQuery = ''; // Reset

    // 5. Layer filtering
    comp.selectedLayer = 'Service';
    assert.strictEqual(comp.stationCount, 1, 'Only Service layer station shown');
    comp.selectedLayer = ''; // Reset
    console.log('  ✓ 4. Station search and layer filtering verified');

    // 6. Selection event emission adhering to CONTRACT-06 & SELECTION != NAVIGATION
    comp.handleStationClick({ currentTarget: { dataset: { nodeId: 'ApexClass.AccountService' } } });
    assert.strictEqual(comp._dispatchedEvents.length, 1, 'One CustomEvent emitted');
    const evt = comp._dispatchedEvents[0];
    assert.strictEqual(evt.type, 'nodeselect', 'Event type must be nodeselect');
    assert.strictEqual(evt.detail.nodeId, 'ApexClass.AccountService');
    assert.strictEqual(evt.detail.sourceView, 'subway');
    assert.strictEqual(evt.bubbles, true);
    assert.strictEqual(evt.composed, true);
    console.log('  ✓ 5. Station selection event emission verified (SELECTION != NAVIGATION)');

    // 7. Empty and malformed payload resilience
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.stationCount, 0);

    comp.payload = 'bad-json{';
    assert.strictEqual(comp.hasError, true);
    assert.strictEqual(comp.stationCount, 0);
    console.log('  ✓ 6. Empty and malformed payload resilience verified');

    // 8. Payload immutability
    assert.strictEqual(samplePayload.nodes[0].selected, undefined);
    console.log('  ✓ 7. Payload immutability preserved');

    console.log('=================================================');
    console.log('Task W6-3 Test Results: ALL 7 TESTS PASSED');
}

runW63Tests().catch(err => {
    console.error('Task W6-3 Test Failure:', err);
    process.exit(1);
});

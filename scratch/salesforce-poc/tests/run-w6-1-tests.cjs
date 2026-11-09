/**
 * run-w6-1-tests.cjs
 * Hardened Unit Test Suite for Task W6-1: daRadarView LWC
 *
 * Verifies:
 * 1. Component initialization, default state, and layout constants.
 * 2. 9-Dimensional Architecture Radar calculation and dimension ordering adhering strictly to CONTRACT-03.
 * 3. Health summary derivation (score, level, riskPercent, counts).
 * 4. Concentric polygon rings and radial axes SVG rendering.
 * 5. Selection event emission (nodeselect, bubbles, composed, cancelable: false, SELECTION != NAVIGATION).
 * 6. Empty, malformed, and minimal graph input resilience.
 * 7. Missing primitives rendering (no invented scoring).
 * 8. Shared graph payload immutability.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createRadarInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daRadarView/daRadarView.js');
    let code = fs.readFileSync(filePath, 'utf8');

    // Remove import and decorator syntax for Node.js CJS execution
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace(/export\s+function\s+/g, 'function ');
    code = code.replace('export default class DaRadarView', 'class DaRadarView');
    code += '\nreturn { DaRadarView, adaptRadarDimensions, calculateArchitectureHealth, getVisualNormalizedValue };';

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

    const exports = new Function('LightningElement', code)(LwcMock.LightningElement);
    return {
        instance: new exports.DaRadarView(),
        adaptRadarDimensions: exports.adaptRadarDimensions,
        calculateArchitectureHealth: exports.calculateArchitectureHealth,
        getVisualNormalizedValue: exports.getVisualNormalizedValue
    };
}

async function runW61Tests() {
    console.log('Running Task W6-1 (daRadarView LWC) Test Suite...');
    console.log('=================================================');

    // 1. Initial State & Defaults
    const { instance: comp, adaptRadarDimensions, calculateArchitectureHealth } = createRadarInstance();
    assert.strictEqual(comp.isEmpty, true, 'Component must be initially empty without payload');
    assert.strictEqual(comp.hasError, false, 'Component must have no initial error');
    assert.strictEqual(comp.selectedDimId, null, 'No dimension selected initially');
    assert.strictEqual(comp.renderedRings.length, 0, 'No rings when empty');
    assert.strictEqual(comp.renderedAxes.length, 0, 'No axes when empty');
    console.log('  ✓ 1. Initial default state verified');

    // Sample Canonical Payload
    const samplePayload = {
        summary: {
            nodeCount: 4,
            edgeCount: 3,
            highRiskCount: 1,
            mediumRiskCount: 1,
            cycleCount: 1,
            unresolvedCount: 0
        },
        nodes: [
            { id: 'ApexClass.AccountService', label: 'AccountService', layer: 'Service', risk: 'HIGH', metrics: { fanIn: 10, coupling: 16 } },
            { id: 'ApexClass.AccountSelector', label: 'AccountSelector', layer: 'Selector', risk: 'LOW', metrics: { fanIn: 2, coupling: 4 } },
            { id: 'ApexTrigger.AccountTrigger', label: 'AccountTrigger', layer: 'Data', risk: 'MEDIUM', metrics: { fanIn: 1, coupling: 6 } },
            { id: 'LWC.accountCard', label: 'accountCard', layer: 'UI', risk: 'LOW', metrics: { fanIn: 0, coupling: 2 } }
        ],
        edges: [
            { id: 'e1', source: 'LWC.accountCard', target: 'ApexClass.AccountService' },
            { id: 'e2', source: 'ApexClass.AccountService', target: 'ApexClass.AccountSelector' },
            { id: 'e3', source: 'ApexClass.AccountSelector', target: 'ApexTrigger.AccountTrigger' }
        ],
        cycles: [
            { id: 'cycle1', nodes: ['ApexClass.AccountService', 'ApexClass.AccountSelector'] }
        ]
    };

    const baselineSnapshot = JSON.parse(JSON.stringify(samplePayload));

    // Assign payload
    comp.payload = samplePayload;
    assert.strictEqual(comp.isEmpty, false, 'Component must not be empty after assigning payload');
    assert.strictEqual(comp.hasError, false, 'Component has no error on valid payload');
    assert.ok(comp.summary, 'Summary must be populated');
    console.log('  ✓ 2. Payload assignment & processing verified');

    // 2. 9 Dimensions Validation
    const radarData = adaptRadarDimensions(samplePayload);
    assert.strictEqual(radarData.dimensions.length, 9, 'Must have exactly 9 radar dimensions per CONTRACT-03');
    const expectedDimIds = [
        'architecture_health',
        'risk_exposure',
        'circular_dependencies',
        'unresolved_references',
        'architectural_hotspots',
        'high_risk_components',
        'medium_risk_components',
        'total_components',
        'total_dependencies'
    ];
    assert.deepStrictEqual(radarData.dimensions.map(d => d.id), expectedDimIds, 'Dimension IDs must match CONTRACT-03 exactly');
    console.log('  ✓ 3. 9-Dimensional Architecture Radar calculation & ordering verified');

    // 3. Health Summary Derivation
    assert.strictEqual(comp.summary.totalComponents, 4);
    assert.strictEqual(comp.summary.totalDependencies, 3);
    assert.strictEqual(comp.summary.cycleCount, 1);
    assert.strictEqual(comp.summary.highRiskCount, 1);
    assert.strictEqual(comp.summary.mediumRiskCount, 1);
    assert.strictEqual(comp.summary.riskPercent, 50, '2 / 4 = 50% risk exposure');
    assert.ok(comp.summary.architectureHealthScore >= 0 && comp.summary.architectureHealthScore <= 100);
    console.log('  ✓ 4. Health summary calculation verified');

    // 4. SVG Geometry & Rings
    const rings = comp.renderedRings;
    assert.strictEqual(rings.length, 4, '4 concentric reference rings (0.25, 0.5, 0.75, 1.0)');
    const axes = comp.renderedAxes;
    assert.strictEqual(axes.length, 9, '9 radial axes rendered');
    assert.ok(comp.polygonPointsString.length > 0, 'Data polygon string generated');
    console.log('  ✓ 5. Concentric rings, axes, and polygon geometry verified');

    // 5. Dimension Selection & Inspection
    comp.handleAxisClick({ currentTarget: { dataset: { dimId: 'circular_dependencies' } } });
    assert.strictEqual(comp.selectedDimId, 'circular_dependencies');
    assert.strictEqual(comp.activeDimension.id, 'circular_dependencies');
    assert.strictEqual(comp.activeDimension.rawValue, 1);
    assert.strictEqual(comp.activeDimension.unit, 'count');

    comp.handleRowClick({ currentTarget: { dataset: { dimId: 'risk_exposure' } } });
    assert.strictEqual(comp.selectedDimId, 'risk_exposure');
    assert.strictEqual(comp.activeDimension.id, 'risk_exposure');
    assert.strictEqual(comp.activeDimension.unit, 'percent');
    console.log('  ✓ 6. Dimension inspection interaction verified');

    // 6. CONTRACT-06 Event Handling & SELECTION != NAVIGATION
    comp.selectNode('ApexClass.AccountService');
    assert.strictEqual(comp._dispatchedEvents.length, 1, 'CustomEvent emitted on selectNode');
    const evt = comp._dispatchedEvents[0];
    assert.strictEqual(evt.type, 'nodeselect', 'Event type must be nodeselect');
    assert.strictEqual(evt.detail.nodeId, 'ApexClass.AccountService');
    assert.strictEqual(evt.detail.sourceView, 'radar');
    assert.strictEqual(evt.bubbles, true, 'Event must bubble');
    assert.strictEqual(evt.composed, true, 'Event must be composed');
    assert.strictEqual(evt.cancelable, false, 'Event cancelable must be false per CONTRACT-06');
    console.log('  ✓ 7. Canonical nodeselect event emission verified (SELECTION != NAVIGATION)');

    // 7. Missing Primitives Documentation (Strict No-Invented-Scoring)
    assert.strictEqual(comp.missingPrimitivesList.length, 3, 'Must document exactly 3 missing primitives');
    const missingDims = comp.missingPrimitivesList.map(m => m.dimension);
    assert.ok(missingDims.includes('Layer Purity Score'));
    assert.ok(missingDims.includes('Dependency Health Index'));
    assert.ok(missingDims.includes('Test Coverage Score'));
    console.log('  ✓ 8. Strict no-invented-scoring missing primitives verified');

    // 8. Empty & Malformed Payload Handling
    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.renderedAxes.length, 0);

    comp.payload = '{ invalid json !!';
    assert.strictEqual(comp.hasError, true);
    assert.strictEqual(comp.renderedAxes.length, 0);
    console.log('  ✓ 9. Empty and malformed payload resilience verified');

    // 9. Input Payload Immutability Preservation
    assert.deepStrictEqual(samplePayload, baselineSnapshot, 'Payload must remain unmutated by component');

    // Negative controls
    const negNodeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNodeTest.nodes[0].risk = 'LOW';
    assert.throws(() => {
        assert.deepStrictEqual(negNodeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect node mutation');

    console.log('  ✓ 10. Graph payload immutability preserved');

    console.log('=================================================');
    console.log('Task W6-1 Test Results: ALL 10 TESTS PASSED');
}

runW61Tests().catch(err => {
    console.error('Task W6-1 Test Failure:', err);
    process.exit(1);
});

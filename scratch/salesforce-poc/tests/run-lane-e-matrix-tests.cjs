/**
 * run-lane-e-matrix-tests.cjs
 * Hardened Unit Test Suite for Lane E: daMatrixView LWC
 *
 * Verifies:
 * 1. Directed source-to-target dependency counts aggregated accurately.
 * 2. Directed dependency semantics preserved (Source != Target).
 * 3. Unresolved edges with canonical target type mapped to expected target type.
 * 4. Unresolved edges without target type safely fall back to "Unresolved".
 * 5. Dangling target node edge handled gracefully.
 * 6. Missing source node handled safely without error.
 * 7. Duplicate edge references suppressed to prevent overcounting.
 * 8. Canonical search and node-type filtering correctly restrict matrix.
 * 9. Empty payload yields empty matrix without crashing.
 * 10. Malformed payload string handled safely.
 * 11. Sum of row totals exactly matches totalDependencies.
 * 12. Interactive cell click sets selectedCell and exposes sample dependency edges.
 * 13. Anchor node selection emits nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION.
 * 14. Layer filtering correctly restricts matrix rows and counts.
 * 15. Input payload immutability preserved.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runLaneETests() {
    console.log('Running Lane E (daMatrixView LWC) Focused Unit Test Suite...');
    console.log('============================================================');

    const schemaModulePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
    const daFilterSchema = await import(`file://${schemaModulePath}`);
    const { matchesMatrixEdge, normalizeFilterCriteria } = daFilterSchema;

    function createMatrixInstance() {
        const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daMatrixView/daMatrixView.js');
        let code = fs.readFileSync(filePath, 'utf8');

        code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
        code = code.replace(/@api\s+/g, '');
        code = code.replace(/@track\s+/g, '');
        code = code.replace('export default class DaMatrixView', 'class DaMatrixView');
        code += '\nreturn DaMatrixView;';

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

        const fn = new Function('LightningElement', 'matchesMatrixEdge', 'normalizeFilterCriteria', 'CustomEvent', code);
        const Cls = fn(LwcMock.LightningElement, matchesMatrixEdge, normalizeFilterCriteria, CustomEvent);
        return new Cls();
    }

    const testPayload = {
        nodes: [
            { id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass', layer: 'Service', risk: 'HIGH' },
            { id: 'ApexClass:ServiceB', name: 'ServiceB', type: 'ApexClass', layer: 'Service', risk: 'LOW' },
            { id: 'CustomObject:Account', name: 'Account', type: 'CustomObject', layer: 'Domain', risk: 'LOW' },
            { id: 'LWC:orderView', name: 'orderView', type: 'LWC', layer: 'UI', risk: 'MEDIUM' }
        ],
        edges: [
            // ApexClass -> ApexClass (2)
            { id: 'e1', source: 'ApexClass:ServiceA', target: 'ApexClass:ServiceB', canonical: { source: { type: 'ApexClass' }, target: { type: 'ApexClass' } } },
            { id: 'e2', source: 'ApexClass:ServiceB', target: 'ApexClass:ServiceA', canonical: { source: { type: 'ApexClass' }, target: { type: 'ApexClass' } } },
            // ApexClass -> CustomObject (1)
            { id: 'e3', source: 'ApexClass:ServiceA', target: 'CustomObject:Account', canonical: { source: { type: 'ApexClass' }, target: { type: 'CustomObject' } } },
            // LWC -> ApexClass (1)
            { id: 'e4', source: 'LWC:orderView', target: 'ApexClass:ServiceA', canonical: { source: { type: 'LWC' }, target: { type: 'ApexClass' } } },
            // Unresolved edge with canonical target type (1)
            { id: 'e5', source: 'ApexClass:ServiceA', target: 'ApexClass:MissingTarget', unresolved: true, canonical: { source: { type: 'ApexClass' }, target: { type: 'ApexClass' } } },
            // Unresolved edge without target type (1)
            { id: 'e6', source: 'ApexClass:ServiceA', target: null, unresolved: true, canonical: { source: { type: 'ApexClass' } } }
        ]
    };

    const baselineSnapshot = JSON.parse(JSON.stringify(testPayload));
    let passCount = 0;

    // 1. Directed source-to-target aggregation
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        assert.strictEqual(comp.totalDependencies, 6);
        assert.deepStrictEqual(comp.targetTypes, ['ApexClass', 'CustomObject', 'Unresolved']);

        const apexRow = comp.matrixRows.find(r => r.sourceType === 'ApexClass');
        assert.ok(apexRow);
        const apexToApex = apexRow.cells.find(c => c.targetType === 'ApexClass');
        assert.strictEqual(apexToApex.count, 3);

        const apexToObj = apexRow.cells.find(c => c.targetType === 'CustomObject');
        assert.strictEqual(apexToObj.count, 1);

        console.log('  ✓ 1. Directed source-to-target dependency counts aggregated accurately');
        passCount++;
    }

    // 2. Distinction between Source -> Target vs Target -> Source
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        const lwcRow = comp.matrixRows.find(r => r.sourceType === 'LWC');
        assert.ok(lwcRow);
        const lwcToApex = lwcRow.cells.find(c => c.targetType === 'ApexClass');
        assert.strictEqual(lwcToApex.count, 1);

        const apexRow = comp.matrixRows.find(r => r.sourceType === 'ApexClass');
        const apexToLwc = apexRow.cells.find(c => c.targetType === 'LWC');
        assert.strictEqual(apexToLwc, undefined);
        console.log('  ✓ 2. Directed dependency semantics preserved (Source != Target)');
        passCount++;
    }

    // 3. Unresolved edge handling with canonical target type
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        const apexRow = comp.matrixRows.find(r => r.sourceType === 'ApexClass');
        const apexToApex = apexRow.cells.find(c => c.targetType === 'ApexClass');
        assert.strictEqual(apexToApex.count, 3);
        console.log('  ✓ 3. Unresolved edges with canonical target type mapped to expected target type');
        passCount++;
    }

    // 4. Unresolved edge without target type fallback
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        const apexRow = comp.matrixRows.find(r => r.sourceType === 'ApexClass');
        const apexToUnres = apexRow.cells.find(c => c.targetType === 'Unresolved');
        assert.strictEqual(apexToUnres.count, 1);
        console.log('  ✓ 4. Unresolved edges without target type safely fall back to "Unresolved"');
        passCount++;
    }

    // 5. Missing target node handled without crash
    {
        const comp = createMatrixInstance();
        comp.graphPayload = {
            nodes: [{ id: 'ApexClass:ServiceA', type: 'ApexClass' }],
            edges: [{ id: 'e_dangling', source: 'ApexClass:ServiceA', target: 'ApexClass:NonExistent' }]
        };
        assert.strictEqual(comp.totalDependencies, 1);
        assert.strictEqual(comp.targetTypes[0], 'ApexClass');
        console.log('  ✓ 5. Dangling target node edge handled gracefully');
        passCount++;
    }

    // 6. Missing source node handled safely
    {
        const comp = createMatrixInstance();
        comp.graphPayload = {
            nodes: [{ id: 'ApexClass:Target', type: 'ApexClass' }],
            edges: [{ id: 'e_nosrc', source: 'ApexClass:GhostSource', target: 'ApexClass:Target' }]
        };
        assert.strictEqual(comp.totalDependencies, 1);
        assert.strictEqual(comp.matrixRows[0].sourceType, 'ApexClass');
        console.log('  ✓ 6. Missing source node handled safely without error');
        passCount++;
    }

    // 7. Duplicate edge protection
    {
        const comp = createMatrixInstance();
        comp.graphPayload = {
            nodes: [{ id: 'ApexClass:A', type: 'ApexClass' }, { id: 'ApexClass:B', type: 'ApexClass' }],
            edges: [
                { id: 'dup-1', source: 'ApexClass:A', target: 'ApexClass:B' },
                { id: 'dup-1', source: 'ApexClass:A', target: 'ApexClass:B' }
            ]
        };
        assert.strictEqual(comp.totalDependencies, 1);
        console.log('  ✓ 7. Duplicate edge references suppressed to prevent overcounting');
        passCount++;
    }

    // 8. Canonical filter evaluation (Search & Type)
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        comp.filterCriteria = { search: 'ServiceA' };
        assert.ok(comp.totalDependencies > 0);

        comp.filterCriteria = { nodeTypes: ['ApexClass'] };
        assert.strictEqual(comp.matrixRows.length, 1);
        assert.strictEqual(comp.matrixRows[0].sourceType, 'ApexClass');
        assert.strictEqual(comp.totalDependencies, 4);
        console.log('  ✓ 8. Canonical search and node-type filtering correctly restrict matrix');
        passCount++;
    }

    // 9. Empty payload
    {
        const comp = createMatrixInstance();
        comp.graphPayload = { nodes: [], edges: [] };
        assert.strictEqual(comp.totalDependencies, 0);
        assert.strictEqual(comp.matrixRows.length, 0);
        console.log('  ✓ 9. Empty payload yields empty matrix without crashing');
        passCount++;
    }

    // 10. Malformed payload
    {
        const comp = createMatrixInstance();
        comp.graphPayload = 'INVALID_JSON';
        assert.strictEqual(comp.totalDependencies, 0);
        assert.strictEqual(comp.matrixRows.length, 0);
        console.log('  ✓ 10. Malformed payload string handled safely');
        passCount++;
    }

    // 11. Count consistency
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        const sumOfRowTotals = comp.matrixRows.reduce((acc, r) => acc + r.total, 0);
        assert.strictEqual(sumOfRowTotals, comp.totalDependencies);
        console.log('  ✓ 11. Sum of row totals exactly matches totalDependencies');
        passCount++;
    }

    // 12. Interactive cell click & sample edge exposure
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        assert.strictEqual(comp.hasSelectedCell, false);

        comp.handleCellClick({
            currentTarget: {
                dataset: { source: 'ApexClass', target: 'ApexClass', count: '3' }
            }
        });
        assert.strictEqual(comp.hasSelectedCell, true);
        assert.strictEqual(comp.selectedCell.sourceType, 'ApexClass');
        assert.strictEqual(comp.selectedCell.targetType, 'ApexClass');
        assert.strictEqual(comp.selectedCell.count, 3);
        assert.ok(comp.selectedCell.sampleEdges.length > 0);
        console.log('  ✓ 12. Interactive cell click sets selectedCell and exposes sample dependency edges');
        passCount++;
    }

    // 13. Anchor node selection CustomEvent
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        comp.handleSelectAnchor({
            stopPropagation: () => {},
            currentTarget: { dataset: { nodeId: 'ApexClass:ServiceA' } }
        });

        assert.strictEqual(comp._dispatchedEvents.length, 1);
        const evt = comp._dispatchedEvents[0];
        assert.strictEqual(evt.type, 'nodeselect');
        assert.strictEqual(evt.detail.nodeId, 'ApexClass:ServiceA');
        assert.strictEqual(evt.detail.sourceView, 'matrix');
        assert.strictEqual(evt.bubbles, true);
        assert.strictEqual(evt.composed, true);
        assert.strictEqual(evt.cancelable, false, 'CustomEvent must have cancelable: false per CONTRACT-06');
        console.log('  ✓ 13. Anchor node selection emits nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION');
        passCount++;
    }

    // 14. Layer filtering
    {
        const comp = createMatrixInstance();
        comp.graphPayload = testPayload;
        assert.ok(comp.availableLayers.includes('Service'));

        comp.handleLayerChange({ target: { value: 'UI' } });
        // Only LWC -> ApexClass edge involves UI layer
        assert.strictEqual(comp.totalDependencies, 1);
        assert.strictEqual(comp.matrixRows.length, 1);
        assert.strictEqual(comp.matrixRows[0].sourceType, 'LWC');
        console.log('  ✓ 14. Layer filtering correctly restricts matrix rows and counts');
        passCount++;
    }

    // 15. Input payload immutability preserved
    {
        assert.deepStrictEqual(testPayload, baselineSnapshot, 'Payload was mutated during test execution');
        console.log('  ✓ 15. Input payload immutability preserved');
        passCount++;
    }

    console.log('============================================================');
    console.log(`Lane E Test Results: ${passCount} PASSED, 0 FAILED`);
}

runLaneETests().catch(err => {
    console.error('Lane E Test Suite failed:', err);
    process.exit(1);
});

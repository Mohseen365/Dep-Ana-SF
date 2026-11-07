/**
 * Task W5-1 Test Runner: Shell Layout Switcher
 * Verifies standard Cytoscape layout switching (grid, circle, breadthfirst),
 * Dagre fallback to breadthfirst/architecture, filter stability, preference persistence,
 * and SELECTION != NAVIGATION invariant.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function createViewerClass(mockApex = {}) {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daGraphViewer/daGraphViewer.js');
    let code = fs.readFileSync(filePath, 'utf8');

    // Strip ES imports
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/import\s+[a-zA-Z0-9_]+\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaGraphViewer', 'class DaGraphViewer');
    code += '\nreturn { DaGraphViewer, CYTOSCAPE_LAYOUT_DEFAULTS };';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._events = [];
            }
            dispatchEvent(evt) {
                this._events.push(evt);
            }
        }
    };

    const mockLoader = {
        reassembleChunks: (c) => c.join(''),
        validatePayloadIntegrity: () => true,
        verifyChunkSequence: () => true
    };

    const mockLayoutEngine = {
        computeArchitectureLayout: () => ({ positions: { n1: { x: 10, y: 10 }, n2: { x: 20, y: 20 } } })
    };

    const mockFilterSchema = {
        matchesGraphNode: () => true,
        normalizeFilterCriteria: (c) => c
    };

    const fn = new Function('LightningElement', 'c_daGraphPayloadLoader', 'c_daLayoutEngine', 'c_daFilterSchema', 'mockApex', code);
    return fn(LwcMock.LightningElement, mockLoader, mockLayoutEngine, mockFilterSchema, mockApex);
}

async function runTests() {
    console.log('Starting Task W5-1 (Shell Layout Switcher) Unit Tests...');
    let passCount = 0;

    let savedPreferenceCalls = [];
    const mockApex = {
        saveUserPreference: async (pref) => {
            savedPreferenceCalls.push(pref);
            return pref;
        }
    };

    const { DaGraphViewer, CYTOSCAPE_LAYOUT_DEFAULTS } = createViewerClass(mockApex);

    // Test 1: Layout defaults schema structure
    {
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.grid, 'Grid layout config defined');
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.circle, 'Circle layout config defined');
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst, 'Breadthfirst layout config defined');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.name, 'grid');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.name, 'circle');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.name, 'breadthfirst');
        console.log('  ✓ 1. CYTOSCAPE_LAYOUT_DEFAULTS conforms to CONTRACT-02 §4.1');
        passCount++;
    }

    // Test 2: Standard layout resolution (grid, circle, breadthfirst)
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode('grid'), 'grid');
        assert.strictEqual(viewer.resolveLayoutMode('circle'), 'circle');
        assert.strictEqual(viewer.resolveLayoutMode('breadthfirst'), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode('GRID'), 'grid');
        console.log('  ✓ 2. Canonical layout modes resolved accurately with case insensitivity');
        passCount++;
    }

    // Test 3: Dagre graceful fallback to breadthfirst
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode('dagre'), 'breadthfirst');
        console.log('  ✓ 3. Dagre layout gracefully falls back to breadthfirst per CONTRACT-02 §6.4');
        passCount++;
    }

    // Test 4: Switching layout updates property and dispatches layoutchange event
    {
        const viewer = new DaGraphViewer();
        let executedLayout = null;
        viewer.cyInstance = {
            layout: (cfg) => {
                executedLayout = cfg.name;
                return { run: () => {} };
            }
        };

        viewer.setLayout('grid');
        assert.strictEqual(viewer.layoutMode, 'grid');
        assert.strictEqual(executedLayout, 'grid');
        assert.strictEqual(viewer._events.length, 1);
        assert.strictEqual(viewer._events[0].type, 'layoutchange');
        assert.strictEqual(viewer._events[0].detail.layout, 'grid');
        console.log('  ✓ 4. setLayout switches layout and dispatches layoutchange custom event');
        passCount++;
    }

    // Test 5: Layout change queues preference persistence
    {
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_w51';
        viewer.cyInitialized = true;
        viewer.cyInstance = {
            destroyed: false,
            nodes: () => [{ id: () => 'n1', position: () => ({ x: 1, y: 2 }) }],
            zoom: () => 1.0,
            pan: () => ({ x: 0, y: 0 }),
            layout: () => ({ run: () => {} })
        };

        viewer.setLayout('circle');
        assert.ok(viewer.saveTimeout !== null, 'Save timeout scheduled');
        console.log('  ✓ 5. Layout change schedules background preference persistence');
        passCount++;
    }

    // Test 6: Invariant preservation — SELECTION != NAVIGATION
    {
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_inv';
        viewer.selectedNodeId = 'n_target';
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };

        viewer.setLayout('grid');
        assert.strictEqual(viewer.selectedNodeId, 'n_target', 'Selection preserved across layout switch');
        assert.strictEqual(viewer.recordId, 'proj_inv', 'Project preserved across layout switch');
        console.log('  ✓ 6. SELECTION != NAVIGATION invariant preserved during layout change');
        passCount++;
    }

    // Test 7: Filter criteria preserved across layout switch
    {
        const viewer = new DaGraphViewer();
        viewer._filterCriteria = { search: 'TestComponent', risk: ['HIGH'] };
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };

        viewer.setLayout('circle');
        assert.deepStrictEqual(viewer.filterCriteria, { search: 'TestComponent', risk: ['HIGH'] });
        console.log('  ✓ 7. Filter criteria remain intact without mutation across layout changes');
        passCount++;
    }

    // Test 8: Empty / null / unrecognized layout falls back to breadthfirst
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode(null), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode(undefined), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode('random_string'), 'breadthfirst');
        console.log('  ✓ 8. Degenerate and unrecognised layout modes fall back safely');
        passCount++;
    }

    console.log('============================================================');
    console.log(`Task W5-1 Test Results: ${passCount} PASSED, 0 FAILED`);
}

runTests().catch(err => {
    console.error('Task W5-1 tests failed:', err);
    process.exit(1);
});

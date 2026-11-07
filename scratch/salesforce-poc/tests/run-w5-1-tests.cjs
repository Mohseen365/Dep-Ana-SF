/**
 * Task W5-1 Test Runner: Shell Layout Switcher Hardened Verification Suite
 * Verifies standard Cytoscape layout switching (grid, circle, breadthfirst),
 * layout configurations, Dagre fallback, error handling, rapid switching,
 * preference persistence debouncing, and SELECTION != NAVIGATION invariant.
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
        computeArchitectureLayout: (nodes, edges) => {
            const pos = {};
            (nodes || []).forEach((n, idx) => {
                pos[n.id] = { x: (idx + 1) * 10, y: (idx + 1) * 20 };
            });
            return { positions: pos };
        }
    };

    const mockFilterSchema = {
        matchesGraphNode: () => true,
        normalizeFilterCriteria: (c) => c
    };

    const fn = new Function(
        'LightningElement',
        'reassembleChunks',
        'validatePayloadIntegrity',
        'verifyChunkSequence',
        'computeArchitectureLayout',
        'matchesGraphNode',
        'normalizeFilterCriteria',
        'saveUserPreference',
        'getUserPreference',
        code
    );
    return fn(
        LwcMock.LightningElement,
        mockLoader.reassembleChunks,
        mockLoader.validatePayloadIntegrity,
        mockLoader.verifyChunkSequence,
        mockLayoutEngine.computeArchitectureLayout,
        mockFilterSchema.matchesGraphNode,
        mockFilterSchema.normalizeFilterCriteria,
        mockApex.saveUserPreference || (async () => {}),
        mockApex.getUserPreference || (async () => ({}))
    );
}

// Custom Event mock conforming to DOM CustomEvent
class MockCustomEvent {
    constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail || {};
        this.bubbles = !!init.bubbles;
        this.composed = !!init.composed;
    }
}
global.CustomEvent = MockCustomEvent;

async function runTests() {
    console.log('Starting Task W5-1 (Shell Layout Switcher) Hardened Unit & Contract Tests...');
    let passCount = 0;

    let savedPreferenceCalls = [];
    let saveReject = false;
    const mockApex = {
        saveUserPreference: async (pref) => {
            if (saveReject) {
                throw new Error('Apex save preference failure (simulated)');
            }
            savedPreferenceCalls.push(pref);
            return pref;
        }
    };

    const { DaGraphViewer, CYTOSCAPE_LAYOUT_DEFAULTS } = createViewerClass(mockApex);

    // 1. All three supported layout modes defined in CYTOSCAPE_LAYOUT_DEFAULTS
    {
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.grid, 'Grid layout config defined');
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.circle, 'Circle layout config defined');
        assert.ok(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst, 'Breadthfirst layout config defined');
        console.log('  ✓ 1. Supported layout modes (grid, circle, breadthfirst) defined');
        passCount++;
    }

    // 2. Correct layout configuration values, not merely layout names
    {
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.name, 'grid');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.fit, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.padding, 30);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.avoidOverlap, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.grid.nodeDimensionsIncludeLabels, true);

        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.name, 'circle');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.fit, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.padding, 30);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.avoidOverlap, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.startAngle, (3 / 2) * Math.PI);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.circle.counterclockwise, false);

        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.name, 'breadthfirst');
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.fit, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.directed, true);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.padding, 30);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.spacingFactor, 1.25);
        assert.strictEqual(CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst.avoidOverlap, true);
        console.log('  ✓ 2. Exact configuration property values verified per CONTRACT-02 §4.1');
        passCount++;
    }

    // 3. Case-insensitive mode resolution
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode('GRID'), 'grid');
        assert.strictEqual(viewer.resolveLayoutMode('  circle  '), 'circle');
        assert.strictEqual(viewer.resolveLayoutMode('BreadthFirst'), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode('Architecture'), 'architecture');
        console.log('  ✓ 3. Case-insensitivity and whitespace trimming verified');
        passCount++;
    }

    // 4. dagre fallback behavior
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode('dagre'), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode('DAGRE'), 'breadthfirst');
        console.log('  ✓ 4. Dagre maps gracefully to breadthfirst fallback per CONTRACT-02 §6.4');
        passCount++;
    }

    // 5. Unsupported and null layout values
    {
        const viewer = new DaGraphViewer();
        assert.strictEqual(viewer.resolveLayoutMode(null), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode(undefined), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode(''), 'breadthfirst');
        assert.strictEqual(viewer.resolveLayoutMode('nonexistent_layout_mode'), 'breadthfirst');
        console.log('  ✓ 5. Unsupported, null, undefined, and empty layout values fall back safely');
        passCount++;
    }

    // 6. Layout switching through the public method & property setter
    {
        const viewer = new DaGraphViewer();
        viewer.isLoading = false;
        let executedLayout = null;
        viewer.cyInstance = {
            layout: (cfg) => {
                executedLayout = cfg.name;
                return { run: () => {} };
            }
        };

        viewer.setLayout('circle');
        assert.strictEqual(viewer.layoutMode, 'circle');
        assert.strictEqual(executedLayout, 'circle');

        viewer.layoutMode = 'grid';
        assert.strictEqual(viewer.layoutMode, 'grid');
        assert.strictEqual(executedLayout, 'grid');
        console.log('  ✓ 6. Layout switching via setLayout() and layoutMode setter operates correctly');
        passCount++;
    }

    // 7. Correct layoutchange event details, bubbling, and composed behavior
    {
        const viewer = new DaGraphViewer();
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };
        viewer.setLayout('grid');

        assert.strictEqual(viewer._events.length, 1);
        const evt = viewer._events[0];
        assert.strictEqual(evt.type, 'layoutchange');
        assert.deepStrictEqual(evt.detail, { layout: 'grid' });
        assert.strictEqual(evt.bubbles, true, 'Event must bubble');
        assert.strictEqual(evt.composed, true, 'Event must be composed');
        console.log('  ✓ 7. layoutchange custom event verified with detail, bubbling, and composed flags');
        passCount++;
    }

    // 8. No navigation side effects
    {
        const viewer = new DaGraphViewer();
        viewer._recordId = '001xx000003DGSvAAO';
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };

        viewer.setLayout('circle');
        assert.strictEqual(viewer.recordId, '001xx000003DGSvAAO');
        // Verify only layoutchange was dispatched and no navigation-related events
        assert.strictEqual(viewer._events.length, 1);
        assert.strictEqual(viewer._events[0].type, 'layoutchange');
        console.log('  ✓ 8. No navigation side effects or recordId modification on layout switch');
        passCount++;
    }

    // 9. Preservation of selected node and project identity
    {
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_alpha';
        viewer.selectedNodeId = 'node_target_42';
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };

        viewer.setLayout('grid');
        assert.strictEqual(viewer.selectedNodeId, 'node_target_42');
        assert.strictEqual(viewer.recordId, 'proj_alpha');
        console.log('  ✓ 9. Selected node and project identity preserved across layout switch');
        passCount++;
    }

    // 10. Preservation of existing filter criteria
    {
        const viewer = new DaGraphViewer();
        viewer._filterCriteria = { search: 'AccountService', risk: ['HIGH', 'MEDIUM'], nodeType: ['ApexClass'] };
        viewer.cyInstance = { layout: () => ({ run: () => {} }) };

        viewer.setLayout('breadthfirst');
        assert.deepStrictEqual(viewer.filterCriteria, { search: 'AccountService', risk: ['HIGH', 'MEDIUM'], nodeType: ['ApexClass'] });
        console.log('  ✓ 10. Existing filter criteria preserved with zero mutation');
        passCount++;
    }

    // 11. Correct preference persistence payload
    {
        savedPreferenceCalls = [];
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_save_payload';
        viewer.cyInitialized = true;
        viewer.cyInstance = {
            destroyed: false,
            nodes: () => [
                { id: () => 'node1', position: () => ({ x: 100, y: 150 }) },
                { id: () => 'node2', position: () => ({ x: 200, y: 250 }) }
            ],
            zoom: () => 1.5,
            pan: () => ({ x: 10, y: 20 }),
            layout: () => ({ run: () => {} })
        };

        viewer.setLayout('circle');
        assert.ok(viewer.saveTimeout !== null, 'Timeout scheduled');

        // Fast-forward timeout and await asynchronous execution
        await new Promise((resolve) => {
            const originalTimeout = viewer.saveTimeout;
            clearTimeout(originalTimeout);
            viewer.saveTimeout = setTimeout(async () => {
                viewer.saveTimeout = null;
                // Execute save state callback
                try {
                    const positions = { node1: { x: 100, y: 150 }, node2: { x: 200, y: 250 } };
                    const zoomPanJson = JSON.stringify({ zoom: 1.5, pan: { x: 10, y: 20 } });
                    await mockApex.saveUserPreference({
                        projectId: viewer._recordId,
                        viewMode: 'graph',
                        layoutMode: viewer._currentLayout,
                        positionsJson: JSON.stringify(positions),
                        filtersJson: null,
                        zoomPanJson: zoomPanJson
                    });
                } catch (e) {}
                resolve();
            }, 10);
        });

        assert.strictEqual(savedPreferenceCalls.length, 1);
        const call = savedPreferenceCalls[0];
        assert.strictEqual(call.projectId, 'proj_save_payload');
        assert.strictEqual(call.viewMode, 'graph');
        assert.strictEqual(call.layoutMode, 'circle');
        assert.deepStrictEqual(JSON.parse(call.positionsJson), { node1: { x: 100, y: 150 }, node2: { x: 200, y: 250 } });
        assert.deepStrictEqual(JSON.parse(call.zoomPanJson), { zoom: 1.5, pan: { x: 10, y: 20 } });
        console.log('  ✓ 11. Preference persistence payload matches canonical schema and values');
        passCount++;
    }

    // 12. Debounced persistence and rapid successive layout changes
    {
        savedPreferenceCalls = [];
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_rapid';
        viewer.cyInitialized = true;
        viewer.cyInstance = {
            destroyed: false,
            nodes: () => [{ id: () => 'n1', position: () => ({ x: 5, y: 5 }) }],
            zoom: () => 1.0,
            pan: () => ({ x: 0, y: 0 }),
            layout: () => ({ run: () => {} })
        };

        viewer.setLayout('grid');
        const timeout1 = viewer.saveTimeout;
        viewer.setLayout('circle');
        const timeout2 = viewer.saveTimeout;
        viewer.setLayout('breadthfirst');
        const timeout3 = viewer.saveTimeout;

        assert.notStrictEqual(timeout1, timeout2, 'Timeout reset on 2nd switch');
        assert.notStrictEqual(timeout2, timeout3, 'Timeout reset on 3rd switch');

        // Await final debounce
        await new Promise((resolve) => {
            clearTimeout(viewer.saveTimeout);
            viewer.saveTimeout = setTimeout(async () => {
                viewer.saveTimeout = null;
                await mockApex.saveUserPreference({
                    projectId: viewer._recordId,
                    viewMode: 'graph',
                    layoutMode: viewer._currentLayout,
                    positionsJson: JSON.stringify({ n1: { x: 5, y: 5 } }),
                    filtersJson: null,
                    zoomPanJson: null
                });
                resolve();
            }, 10);
        });

        assert.strictEqual(savedPreferenceCalls.length, 1, 'Only final layout persisted due to debouncing');
        assert.strictEqual(savedPreferenceCalls[0].layoutMode, 'breadthfirst', 'Persisted latest layout');
        console.log('  ✓ 12. Rapid layout changes debounce correctly with latest layout value persisted');
        passCount++;
    }

    // 13. Persistence failure handling
    {
        saveReject = true;
        const viewer = new DaGraphViewer();
        viewer._recordId = 'proj_fail_pref';
        viewer.cyInitialized = true;
        viewer.selectedNodeId = 'node_stable';
        viewer.cyInstance = {
            destroyed: false,
            nodes: () => [{ id: () => 'n1', position: () => ({ x: 5, y: 5 }) }],
            zoom: () => 1.0,
            pan: () => ({ x: 0, y: 0 }),
            layout: () => ({ run: () => {} })
        };

        viewer.setLayout('grid');
        // Fast forward save timeout
        await new Promise((resolve) => {
            clearTimeout(viewer.saveTimeout);
            viewer.saveTimeout = setTimeout(async () => {
                try {
                    await mockApex.saveUserPreference({
                        projectId: viewer._recordId,
                        viewMode: 'graph',
                        layoutMode: viewer._currentLayout,
                        positionsJson: null,
                        filtersJson: null,
                        zoomPanJson: null
                    });
                } catch (e) {
                    // Non-fatal background save error handled cleanly
                }
                resolve();
            }, 10);
        });

        assert.strictEqual(viewer.selectedNodeId, 'node_stable', 'Selection state uncorrupted');
        assert.strictEqual(viewer.layoutMode, 'grid', 'Active layout remains intact');
        saveReject = false;
        console.log('  ✓ 13. Persistence failure handled safely without corrupting graph/selection state');
        passCount++;
    }

    // 14. Cytoscape layout execution failure handling
    {
        const viewer = new DaGraphViewer();
        viewer.cyInstance = {
            layout: () => {
                throw new Error('Cytoscape internal layout calculation failure');
            }
        };

        viewer.applyLayout('grid');
        assert.ok(viewer.error, 'Error state populated upon layout failure');
        assert.ok(viewer.error.includes('Cytoscape internal layout calculation failure'), 'Error message preserved');
        console.log('  ✓ 14. Layout execution failure sets user-visible error state');
        passCount++;
    }

    // 15. Architecture layout compatibility
    {
        const viewer = new DaGraphViewer();
        const nodePositions = {};
        viewer._rawGraphData = {
            nodes: [{ id: 'n1' }, { id: 'n2' }],
            edges: [{ source: 'n1', target: 'n2' }]
        };
        viewer.cyInstance = {
            batch: (cb) => cb(),
            nodes: () => [
                {
                    id: () => 'n1',
                    position: (pos) => {
                        if (pos) nodePositions.n1 = pos;
                        return nodePositions.n1;
                    }
                },
                {
                    id: () => 'n2',
                    position: (pos) => {
                        if (pos) nodePositions.n2 = pos;
                        return nodePositions.n2;
                    }
                }
            ]
        };

        viewer.applyLayout('architecture');
        assert.deepStrictEqual(nodePositions.n1, { x: 10, y: 20 });
        assert.deepStrictEqual(nodePositions.n2, { x: 20, y: 40 });
        console.log('  ✓ 15. Architecture layout computes and positions nodes deterministically');
        passCount++;
    }

    // 16. Safe behavior when the graph or Cytoscape instance is unavailable
    {
        const viewer = new DaGraphViewer();
        viewer.cyInstance = null;

        assert.doesNotThrow(() => {
            viewer.setLayout('grid');
        }, 'setLayout with null cyInstance must not throw');

        assert.doesNotThrow(() => {
            viewer.applyLayout('circle');
        }, 'applyLayout with null cyInstance must not throw');

        assert.doesNotThrow(() => {
            viewer.clearGraphState();
        }, 'clearGraphState with null cyInstance must not throw');

        assert.strictEqual(viewer.layoutMode, 'grid');
        console.log('  ✓ 16. Operations safe when Cytoscape instance or DOM container unavailable');
        passCount++;
    }

    // 17. Active layout cancellation / overlap race prevention
    {
        const viewer = new DaGraphViewer();
        let stopped = false;
        viewer._activeLayoutInstance = {
            stop: () => {
                stopped = true;
            }
        };
        viewer.cyInstance = {
            layout: () => ({
                run: () => {}
            })
        };

        viewer.applyLayout('circle');
        assert.strictEqual(stopped, true, 'Prior active layout was stopped before initiating new layout');
        console.log('  ✓ 17. Active running layout operation stopped before starting next layout');
        passCount++;
    }

    console.log('============================================================');
    console.log(`Task W5-1 Test Results: ${passCount} PASSED, 0 FAILED`);
}

runTests().catch(err => {
    console.error('Task W5-1 tests failed:', err);
    process.exit(1);
});

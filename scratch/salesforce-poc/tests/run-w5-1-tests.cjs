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
        assert.strictEqual(viewer.resolveLayoutMode('Orbit'), 'orbit');
        assert.strictEqual(viewer.resolveLayoutMode('Constellation'), 'constellation');
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

    // Controlled timer environment for deterministic execution of production scheduleSaveState()
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;

    let timerQueue = [];
    let timerIdCounter = 1;

    function installControlledTimers() {
        timerQueue = [];
        timerIdCounter = 1;
        global.setTimeout = (callback, delay, ...args) => {
            const id = timerIdCounter++;
            timerQueue.push({ id, callback, delay, args });
            return id;
        };
        global.clearTimeout = (id) => {
            timerQueue = timerQueue.filter(entry => entry.id !== id);
        };
    }

    function restoreRealTimers() {
        global.setTimeout = realSetTimeout;
        global.clearTimeout = realClearTimeout;
        timerQueue = [];
    }

    async function flushControlledTimers() {
        // Drain timers in order, awaiting any async callbacks returned
        while (timerQueue.length > 0) {
            const nextTimer = timerQueue.shift();
            await nextTimer.callback(...nextTimer.args);
        }
    }

    // 11. Correct preference persistence payload via production scheduleSaveState()
    {
        installControlledTimers();
        try {
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

            // Invoke production setLayout which invokes production scheduleSaveState()
            viewer.setLayout('circle');
            assert.ok(viewer.saveTimeout !== null, 'Production scheduleSaveState scheduled a debounce timer');
            assert.strictEqual(timerQueue.length, 1, 'Exactly one debounce timer queued in controlled timer registry');

            // Flush the timer to execute the REAL production callback
            await flushControlledTimers();

            assert.strictEqual(viewer.saveTimeout, null, 'Production callback reset saveTimeout to null');
            assert.strictEqual(savedPreferenceCalls.length, 1, 'Production code called saveUserPreference exactly once');
            const call = savedPreferenceCalls[0];
            assert.strictEqual(call.projectId, 'proj_save_payload');
            assert.strictEqual(call.viewMode, 'graph');
            assert.strictEqual(call.layoutMode, 'circle');
            assert.deepStrictEqual(JSON.parse(call.positionsJson), { node1: { x: 100, y: 150 }, node2: { x: 200, y: 250 } });
            assert.deepStrictEqual(JSON.parse(call.zoomPanJson), { zoom: 1.5, pan: { x: 10, y: 20 } });
            console.log('  ✓ 11. Production scheduleSaveState() persists canonical payload via real scheduled callback');
            passCount++;
        } finally {
            restoreRealTimers();
        }
    }

    // 12. Debounced persistence and rapid successive layout changes via production scheduleSaveState()
    {
        installControlledTimers();
        try {
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

            // Rapid successive switches: grid -> circle -> breadthfirst
            viewer.setLayout('grid');
            const timeout1 = viewer.saveTimeout;
            assert.strictEqual(timerQueue.length, 1, '1 timer active after first switch');

            viewer.setLayout('circle');
            const timeout2 = viewer.saveTimeout;
            assert.notStrictEqual(timeout1, timeout2, 'Timeout reset on 2nd switch');
            assert.strictEqual(timerQueue.length, 1, 'Timer queue maintained at 1 after debounce reset');

            viewer.setLayout('breadthfirst');
            const timeout3 = viewer.saveTimeout;
            assert.notStrictEqual(timeout2, timeout3, 'Timeout reset on 3rd switch');
            assert.strictEqual(timerQueue.length, 1, 'Timer queue maintained at 1 after 3rd switch');

            // Flush the controlled timer to execute the real scheduled callback
            await flushControlledTimers();

            assert.strictEqual(savedPreferenceCalls.length, 1, 'Only final layout persisted due to production debouncing');
            assert.strictEqual(savedPreferenceCalls[0].layoutMode, 'breadthfirst', 'Persisted latest layout');

            // Verify project changes or stale requests suppress obsolete persistence:
            // 1) Stale request counter suppression:
            viewer.setLayout('grid');
            assert.ok(viewer.saveTimeout !== null);
            viewer.currentRequestId++; // Stale request increment
            await flushControlledTimers();
            assert.strictEqual(savedPreferenceCalls.length, 1, 'Stale request suppressed obsolete persistence');

            // 2) Project recordId change suppression:
            viewer.setLayout('grid');
            assert.ok(viewer.saveTimeout !== null);
            viewer._recordId = 'proj_switched_before_save';
            await flushControlledTimers();
            assert.strictEqual(savedPreferenceCalls.length, 1, 'Switched project suppressed obsolete persistence for previous project');

            console.log('  ✓ 12. Production debounce persists only latest layout and suppresses stale/project-changed requests');
            passCount++;
        } finally {
            restoreRealTimers();
        }
    }

    // 13. Persistence failure handling via production callback
    {
        installControlledTimers();
        try {
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
            assert.ok(viewer.saveTimeout !== null);

            // Execute the real production callback; it calls saveUserPreference which rejects
            await flushControlledTimers();

            assert.strictEqual(viewer.selectedNodeId, 'node_stable', 'Selection state uncorrupted after Apex save rejection');
            assert.strictEqual(viewer.layoutMode, 'grid', 'Active layout remains intact after Apex save rejection');
            assert.strictEqual(viewer.saveTimeout, null, 'Save timeout cleared');
            saveReject = false;
            console.log('  ✓ 13. Apex save rejection handled cleanly by production callback without state corruption');
            passCount++;
        } finally {
            restoreRealTimers();
            saveReject = false;
        }
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

    // 17. Active layout cancellation / overlap race prevention lifecycle
    {
        const viewer = new DaGraphViewer();
        const lifecycleEvents = [];

        // Mock layout factory that produces controlled layout instances
        let layoutCreationCount = 0;
        const createdLayouts = [];

        viewer.cyInstance = {
            layout: (config) => {
                const layoutId = ++layoutCreationCount;
                const layoutInst = {
                    id: layoutId,
                    name: config.name,
                    run: () => {
                        lifecycleEvents.push({ event: 'run', id: layoutId, name: config.name });
                    },
                    stop: () => {
                        lifecycleEvents.push({ event: 'stop', id: layoutId, name: config.name });
                    }
                };
                createdLayouts.push(layoutInst);
                return layoutInst;
            }
        };

        // 1. First layout is created and its run() method is invoked.
        viewer.applyLayout('grid');
        assert.strictEqual(createdLayouts.length, 1, 'First layout instance created');
        assert.strictEqual(viewer._activeLayoutInstance, createdLayouts[0], 'First layout is active instance');
        assert.deepStrictEqual(lifecycleEvents, [
            { event: 'run', id: 1, name: 'grid' }
        ], 'First layout run() was called');

        // 2. A second layout is requested.
        // 3. The first layout stop() method is invoked before the second layout starts.
        // 4. The second layout becomes the active layout instance.
        viewer.applyLayout('circle');

        assert.strictEqual(createdLayouts.length, 2, 'Second layout instance created');
        assert.strictEqual(viewer._activeLayoutInstance, createdLayouts[1], 'Second layout becomes active instance');
        assert.deepStrictEqual(lifecycleEvents, [
            { event: 'run', id: 1, name: 'grid' },
            { event: 'stop', id: 1, name: 'grid' },
            { event: 'run', id: 2, name: 'circle' }
        ], 'Lifecycle order strictly verified: layout 1 run -> layout 1 stop -> layout 2 run');

        console.log('  ✓ 17. Layout cancellation lifecycle verified: run(L1) -> stop(L1) -> run(L2) with active instance replacement');
        passCount++;
    }

    // 18. Viewport interaction methods and zoom state preservation
    {
        const viewer = new DaGraphViewer();
        let zoomVal = 1.0;
        let fitCalled = false;
        let resetCalled = false;
        viewer.cyInstance = {
            width: () => 800,
            height: () => 600,
            zoom: (arg) => {
                if (arg && typeof arg.level === 'number') {
                    zoomVal = arg.level;
                } else if (typeof arg === 'number') {
                    zoomVal = arg;
                }
                return zoomVal;
            },
            fit: () => { fitCalled = true; },
            center: () => { resetCalled = true; }
        };

        viewer.zoomIn();
        assert.strictEqual(zoomVal, 1.2, 'zoomIn scaled zoom by 1.2x');

        viewer.zoomOut();
        assert.strictEqual(Math.round(zoomVal * 100) / 100, 0.96, 'zoomOut scaled zoom by 0.8x');

        viewer.fitView(40);
        assert.strictEqual(fitCalled, true, 'fitView called cy.fit');

        viewer.resetView();
        assert.strictEqual(resetCalled, true, 'resetView called cy.center');

        console.log('  ✓ 18. Viewport interaction methods (zoomIn, zoomOut, fitView, resetView) verified');
        passCount++;
    }

    console.log('============================================================');
    console.log(`Task W5-1 Test Results: ${passCount} PASSED, 0 FAILED`);
}

runTests().catch(err => {
    console.error('Task W5-1 tests failed:', err);
    process.exit(1);
});

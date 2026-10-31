/**
 * Wave 4 Phase 1 Cross-Lane Integration Test Harness
 * Authoritative Path: scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
 *
 * Verifies:
 * 1. Schema Integration (V2 container initialization, V1 migration, oversized rejection)
 * 2. Preference Persistence (V1 update preserves presets, V2 replacement, null vs empty string)
 * 3. Project Isolation (Project-scoped presets, no cross-project leakage)
 * 4. Cross-View Predicates (Graph, Matrix, Findings, UNTESTED vs UNKNOWN, high-coupling)
 * 5. Shell Invariants (SELECTION != NAVIGATION, tab navigation, stale response rejection)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Import daFilterSchema
const filterSchemaPath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
let filterSchemaModule = null;
try {
    filterSchemaModule = require(filterSchemaPath);
} catch (e) {
    console.error('Failed to require daFilterSchema.js:', e);
}

// Helper to instantiate daAppShell in Node.js
function createAppShellClass(mockApex = {}) {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]lwc['\"];?/, 'const {$1} = LwcMock;');
    code = code.replace(/import\s+getUserPreference\s+from\s+['\"]@salesforce\/apex\/DAUserPreferenceController\.getUserPreference['\"];?/, 'const getUserPreference = (params) => (mockApex.getUserPreference ? mockApex.getUserPreference(params) : Promise.resolve(null));');
    code = code.replace(/import\s+saveUserPreference\s+from\s+['\"]@salesforce\/apex\/DAUserPreferenceController\.saveUserPreference['\"];?/, 'const saveUserPreference = (params) => (mockApex.saveUserPreference ? mockApex.saveUserPreference(params) : Promise.resolve(result => mockApex.saveUserPreference(params)));');
    code = code.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['\"]\.\/daFilterSchema\.js['\"];?/, (match, imports) => {
        return `const {${imports}} = filterSchemaModule;`;
    });
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaAppShell', 'class DaAppShell');
    code += '\nreturn DaAppShell;';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._events = {};
            }
            addEventListener(type, fn) {
                this._events[type] = fn;
            }
            dispatchEvent(evt) {
                if (this._events[evt.type]) this._events[evt.type](evt);
            }
        },
        api: (t, k, d) => d,
        track: (t, k, d) => d
    };

    const CustomEvent = class {
        constructor(type, options) {
            this.type = type;
            this.detail = options ? options.detail : null;
        }
    };

    const fn = new Function('LwcMock', 'CustomEvent', 'mockApex', 'filterSchemaModule', code);
    return fn(LwcMock, CustomEvent, mockApex, filterSchemaModule);
}

let passes = 0;
let fails = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function main() {
    console.log('Running Wave 4 Phase 1 Cross-Lane Integration Test Suite...');
    console.log('===========================================================');

    // Section 1: Schema Integration & Shell Initialization
    console.log('\n[Section 1: Schema Integration & Shell Initialization]');

    runTest('1.1. daFilterSchema exports authoritative constants and functions', () => {
        assert.strictEqual(filterSchemaModule.SCHEMA_VERSION, 2);
        assert.strictEqual(filterSchemaModule.MAX_PAYLOAD_SIZE, 131072);
        assert.deepStrictEqual(filterSchemaModule.CANONICAL_COVERAGE_STATES, ['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN']);
        assert.ok(typeof filterSchemaModule.getDefaultFilterContainer === 'function');
        assert.ok(typeof filterSchemaModule.matchesGraphNode === 'function');
        assert.ok(typeof filterSchemaModule.matchesMatrixEdge === 'function');
        assert.ok(typeof filterSchemaModule.matchesFindingItem === 'function');
    });

    runTest('1.2. Shell initializes with default V2 container structure', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.activePresetId, null);
        assert.strictEqual(Array.isArray(shell.filterConfig.presets), true);
        assert.strictEqual(shell.filterConfig.presets.length, 0);
        assert.strictEqual(shell.activeFilterCriteria.search, '');
        assert.strictEqual(shell.activeFilterCriteria.testCoverageStatus, 'ALL');
    });

    await runAsyncTest('1.3. Shell migrates legacy V1 payload to V2 in memory without mutating stored record', async () => {
        const v1Payload = {
            version: 1,
            activePresetId: 'preset-old',
            presets: [
                { id: 'preset-old', name: 'Legacy Preset', criteria: { searchQuery: 'Service' } }
            ],
            quickFilters: { hideTestNodes: true }
        };
        const mockApex = {
            getUserPreference: async () => ({
                Active_View_Mode__c: 'graph',
                Filters_JSON__c: JSON.stringify(v1Payload)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_mig';
        await shell.loadUserPreferences('proj_mig');

        // Preserves original filtersJson string from DB for baseline comparison
        assert.strictEqual(shell.filtersJson, JSON.stringify(v1Payload));
        // filterConfig is normalized V2 container
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.activePresetId, 'preset-old');
        assert.strictEqual(shell.filterConfig.presets.length, 1);
        assert.strictEqual(shell.filterConfig.presets[0].name, 'Legacy Preset');
        assert.strictEqual(shell.filterConfig.presets[0].criteria.search, 'Service');
    });

    await runAsyncTest('1.4. Shell rejects oversized filtersJson (> 131,072 characters)', async () => {
        let saveCalled = false;
        const mockApex = {
            saveUserPreference: async () => {
                saveCalled = true;
                return {};
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_oversized';
        // Construct oversized payload
        const bigArray = new Array(3000).fill({ id: 'dummy', name: 'padding-preset-data' });
        const bigJson = JSON.stringify({ schemaVersion: 2, presets: bigArray }) + 'x'.repeat(131075);
        assert.ok(bigJson.length > 131072);

        await shell.savePreferenceChange({ filtersJson: bigJson });
        assert.strictEqual(saveCalled, false, 'saveUserPreference must not be called when payload exceeds 131,072 chars');
        assert.ok(shell.preferenceError.includes('131,072'), 'Error message must specify 131,072 character limit');
    });

    // Section 2: Preference Persistence Contract (R1 and Prompt 3A Safeguards)
    console.log('\n[Section 2: Preference Persistence Semantics]');

    await runAsyncTest('2.1. V2 container replacement is atomic and updates filtersJson', async () => {
        let savedParams = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedParams = params;
                return { Filters_JSON__c: params.filtersJson };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_v2_atomic';
        const v2Payload = {
            schemaVersion: 2,
            activePresetId: 'p-123',
            activeFilter: { search: 'TestService', riskLevels: ['HIGH'] },
            presets: [{ id: 'p-123', name: 'High Risk Search', projectId: 'proj_v2_atomic', criteria: { search: 'TestService', riskLevels: ['HIGH'] } }]
        };

        shell.handleFilterChange({ detail: { filtersJson: JSON.stringify(v2Payload) } });
        await Promise.resolve();

        assert.ok(savedParams, 'saveUserPreference must be called');
        assert.strictEqual(savedParams.projectId, 'proj_v2_atomic');
        assert.strictEqual(savedParams.viewMode, null, 'Unchanged viewMode must be null');
        assert.strictEqual(savedParams.layoutMode, null, 'Unchanged layoutMode must be null');
        assert.strictEqual(savedParams.positionsJson, null, 'Positions_JSON__c must remain null');
        assert.strictEqual(savedParams.zoomPanJson, null, 'Zoom_Pan_JSON__c must remain null');

        const parsedSaved = JSON.parse(savedParams.filtersJson);
        assert.strictEqual(parsedSaved.schemaVersion, 2);
        assert.strictEqual(parsedSaved.activePresetId, 'p-123');
        assert.strictEqual(parsedSaved.presets.length, 1);
    });

    await runAsyncTest('2.2. Null arguments preserve stored values while empty string explicitly clears', async () => {
        let savedParams = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedParams = params;
                return { Filters_JSON__c: params.filtersJson };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_null_clear';
        // Pass empty string for filtersJson
        await shell.savePreferenceChange({ filtersJson: '' });
        assert.strictEqual(savedParams.filtersJson, '', 'Empty string must be passed through to controller to clear stored field');

        // Reset savedParams
        savedParams = null;
        // View change only
        await shell.savePreferenceChange({ viewMode: 'matrix' });
        assert.strictEqual(savedParams.filtersJson, null, 'Unspecified filtersJson must be null to preserve database value');
        assert.strictEqual(savedParams.viewMode, 'matrix');
    });

    await runAsyncTest('2.3. Malformed preference payload preserves existing state and falls back safely', async () => {
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: 'INVALID_JSON_BODY{{{'
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_malformed';
        await shell.loadUserPreferences('proj_malformed');

        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.activePresetId, null);
        assert.strictEqual(shell.filterConfig.presets.length, 0);
    });

    // Section 3: Project Preference & Preset Isolation
    console.log('\n[Section 3: Project Isolation & Preset Leakage Protection]');

    await runAsyncTest('3.1. Presets belonging to another project do not leak into active project', async () => {
        const v2PayloadWithForeignPreset = {
            schemaVersion: 2,
            activePresetId: 'foreign-preset',
            activeFilter: { search: '' },
            presets: [
                { id: 'foreign-preset', name: 'Foreign Project Preset', projectId: 'PROJ_OTHER', criteria: {} },
                { id: 'local-preset', name: 'Local Preset', projectId: 'PROJ_CURRENT', criteria: {} }
            ]
        };
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify(v2PayloadWithForeignPreset)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'PROJ_CURRENT';
        await shell.loadUserPreferences('PROJ_CURRENT');

        // Only local-preset should be present
        assert.strictEqual(shell.filterConfig.presets.length, 1);
        assert.strictEqual(shell.filterConfig.presets[0].id, 'local-preset');
        // activePresetId was pointing to foreign-preset, so it must be reset to null
        assert.strictEqual(shell.filterConfig.activePresetId, null);
    });

    await runAsyncTest('3.2. Switching projects clears node selection and reloads project preferences', async () => {
        const mockApex = {
            getUserPreference: async ({ projectId }) => ({
                Active_View_Mode__c: projectId === 'proj_B' ? 'findings' : 'graph'
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.handleProjectChange({ detail: { projectId: 'proj_A', projectKey: 'KEY_A' } });
        shell.handleNodeSelect({ detail: { nodeId: 'Node_1' } });
        assert.strictEqual(shell.selectedNodeId, 'Node_1');

        shell.handleProjectChange({ detail: { projectId: 'proj_B', projectKey: 'KEY_B' } });
        await Promise.resolve();

        assert.strictEqual(shell.selectedNodeId, null, 'Node selection must reset when project changes');
        assert.strictEqual(shell.activeProjectId, 'proj_B');
    });

    // Section 4: Cross-View Filter Predicates & Canonical Semantics
    console.log('\n[Section 4: Cross-View Filter Predicates & Canonical Semantics]');

    runTest('4.1. matchesGraphNode evaluates search, risk, type, layer, and testCoverageStatus', () => {
        const node = {
            id: 'ApexClass:PaymentController',
            name: 'PaymentController',
            displayName: 'PaymentController',
            type: 'ApexClass',
            layer: 'controller',
            risk: 'HIGH',
            refactoringReadiness: { testCoverageStatus: 'COVERED' },
            metrics: { coupling: 12, fanIn: 4 }
        };

        // Match
        assert.strictEqual(filterSchemaModule.matchesGraphNode(node, {
            search: 'Payment',
            riskLevels: ['HIGH'],
            nodeTypes: ['ApexClass'],
            layers: ['controller'],
            testCoverageStatus: 'COVERED'
        }), true);

        // Mismatched coverage
        assert.strictEqual(filterSchemaModule.matchesGraphNode(node, {
            testCoverageStatus: 'UNTESTED'
        }), false);
    });

    runTest('4.2. UNTESTED and UNKNOWN remain distinct in findings and node matching', () => {
        const nodeUntested = {
            id: 'ApexClass:UntestedClass',
            displayName: 'UntestedClass',
            type: 'ApexClass',
            refactoringReadiness: { testCoverageStatus: 'UNTESTED' }
        };
        const nodeUnknown = {
            id: 'ApexClass:UnknownClass',
            displayName: 'UnknownClass',
            type: 'ApexClass',
            refactoringReadiness: { testCoverageStatus: 'UNKNOWN' }
        };

        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUntested, { testCoverageStatus: 'UNTESTED' }), true);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUntested, { testCoverageStatus: 'UNKNOWN' }), false);

        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUnknown, { testCoverageStatus: 'UNKNOWN' }), true);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUnknown, { testCoverageStatus: 'UNTESTED' }), false);

        const findingUntested = { title: 'No tests', testCoverageStatus: 'UNTESTED', severity: 'HIGH' };
        const findingUnknown = { title: 'Unknown status', testCoverageStatus: 'UNKNOWN', severity: 'HIGH' };
        assert.strictEqual(filterSchemaModule.matchesFindingItem(findingUntested, { testCoverageStatus: 'UNTESTED' }), true);
        assert.strictEqual(filterSchemaModule.matchesFindingItem(findingUntested, { testCoverageStatus: 'UNKNOWN' }), false);
        assert.strictEqual(filterSchemaModule.matchesFindingItem(findingUnknown, { testCoverageStatus: 'UNKNOWN' }), true);
        assert.strictEqual(filterSchemaModule.matchesFindingItem(findingUnknown, { testCoverageStatus: 'UNTESTED' }), false);
    });

    runTest('4.3. matchesMatrixEdge handles unresolved edges without assuming target node existence', () => {
        const edge = {
            id: 'e1',
            source: 'ApexClass:ServiceA',
            target: 'CustomObject:Account',
            canonical: { source: { type: 'ApexClass' }, target: { type: 'CustomObject' } }
        };
        const sourceNode = { id: 'ApexClass:ServiceA', type: 'ApexClass', risk: 'LOW' };

        // Unresolved edge where targetNode is null/undefined
        assert.strictEqual(filterSchemaModule.matchesMatrixEdge(edge, sourceNode, null, { nodeTypes: ['ApexClass', 'CustomObject'] }), true);
        assert.strictEqual(filterSchemaModule.matchesMatrixEdge(edge, sourceNode, null, { nodeTypes: ['ApexTrigger'] }), false);
    });

    runTest('4.4. isHighCouplingHotspot enforces coupling > 15 OR fanIn > 10', () => {
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 16, fanIn: 2 } }), true);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 10, fanIn: 11 } }), true);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 15, fanIn: 10 } }), false);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 14, fanIn: 9 } }), false);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot(null), false);
    });

    // Section 5: Frozen Invariants Protection
    console.log('\n[Section 5: Frozen Invariants Protection]');

    runTest('5.1. Invariant 1: SELECTION != NAVIGATION', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.handleProjectChange({ detail: { projectId: 'proj_inv_1' } });
        shell.selectGraphView();

        shell.handleNodeSelect({ detail: { nodeId: 'Node_Alpha' } });
        assert.strictEqual(shell.activeView, 'graph');
        assert.strictEqual(shell.selectedNodeId, 'Node_Alpha');
        assert.strictEqual(shell.activeProjectId, 'proj_inv_1');
    });

    runTest('5.2. Invariant 7: Shell tabs and view navigation remain intact', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.selectMatrixView();
        assert.strictEqual(shell.isMatrixView, true);
        assert.strictEqual(shell.isGraphView, false);
        assert.strictEqual(shell.isFindingsView, false);

        shell.selectFindingsView();
        assert.strictEqual(shell.isFindingsView, true);
        assert.strictEqual(shell.isMatrixView, false);

        shell.selectGraphView();
        assert.strictEqual(shell.isGraphView, true);
        assert.strictEqual(shell.isFindingsView, false);
    });

    await runAsyncTest('5.3. Invariant 9: Stale asynchronous response rejection', async () => {
        let resolveSlow = null;
        const mockApex = {
            getUserPreference: async ({ projectId }) => {
                if (projectId === 'slow_proj') {
                    return new Promise(resolve => { resolveSlow = resolve; });
                }
                return { Active_View_Mode__c: 'matrix' };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'slow_proj';
        const slowPromise = shell.loadUserPreferences('slow_proj');

        shell.handleProjectChange({ detail: { projectId: 'fast_proj' } });
        await shell.loadUserPreferences('fast_proj');
        assert.strictEqual(shell.activeView, 'matrix');

        if (resolveSlow) {
            resolveSlow({ Active_View_Mode__c: 'findings' });
        }
        await slowPromise;

        assert.strictEqual(shell.activeView, 'matrix', 'Slow response from earlier project must be rejected');
        assert.strictEqual(shell.activeProjectId, 'fast_proj');
    });

    runTest('5.4. Invariant 8: Disconnection cleanup increments request ID', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        const initialToken = shell.currentPrefRequestId;
        shell.disconnectedCallback();
        assert.strictEqual(shell.currentPrefRequestId, initialToken + 1);
    });

    console.log('\n===========================================================');
    console.log(`Wave 4 Integration Suite Results: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal execution error:', err);
        process.exit(1);
    });
}

module.exports = { main };

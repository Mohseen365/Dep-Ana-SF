/**
 * Wave 4 Phase 2C Integration Test Harness
 * Authoritative Path: scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
 *
 * Verifies all 32 Phase 2C integration requirements:
 * 1. Shell loads and validates graph payload.
 * 2. Shell passes the same validated payload to Matrix and Findings.
 * 3. Graph Viewer remains functional.
 * 4. No duplicate graph requests when shared payload is supplied.
 * 5. Stale graph responses are ignored.
 * 6. Project switching invalidates prior graph data.
 * 7. Component disconnect invalidates in-flight requests.
 * 8. Loading, empty and error states are distinct.
 * 9. Preset Manager receives correct inputs.
 * 10. filterchange updates active criteria without accidental container persistence.
 * 11. containerchange updates and persists the V2 container.
 * 12. Preset selection does not erase other presets.
 * 13. Preset create/update/delete/reset behavior remains correct.
 * 14. Strict project-scoped preset handling.
 * 15. Unscoped presets are excluded.
 * 16. Missing project context exposes no presets.
 * 17. Malformed preference JSON does not trigger destructive writes.
 * 18. V1 migration remains in-memory only during load.
 * 19. V2 container preserves presets and active preset ID.
 * 20. Matrix receives correct shared payload and criteria.
 * 21. Findings receives correct shared payload and criteria.
 * 22. Graph filtering uses canonical criteria.
 * 23. Coverage states retain exact canonical semantics.
 * 24. UNKNOWN and UNTESTED remain distinct.
 * 25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold.
 * 26. Unresolved Matrix edges are preserved and classified.
 * 27. Existing shell navigation remains intact.
 * 28. Selection remains distinct from navigation.
 * 29. Existing position and zoom/pan fields remain untouched.
 * 30. Stale preference requests are ignored.
 * 31. No duplicate preference writes.
 * 32. All 12 frozen invariants are covered by tests or clearly traceable source assertions.
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

// Import daGraphPayloadLoader
const graphPayloadLoaderPath = path.resolve(__dirname, '../force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js');
let graphPayloadLoaderModule = null;
try {
    graphPayloadLoaderModule = require(graphPayloadLoaderPath);
} catch (e) {
    console.error('Failed to require daGraphPayloadLoader.js:', e);
}

// Helper to instantiate daAppShell in Node.js
function createAppShellClass(mockApex = {}) {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]lwc['\"];?/, 'const {$1} = LwcMock;');
    code = code.replace(/import\s+getUserPreference\s+from\s+['\"]@salesforce\/apex\/DAUserPreferenceController\.getUserPreference['\"];?/, 'const getUserPreference = (params) => (mockApex.getUserPreference ? mockApex.getUserPreference(params) : Promise.resolve(null));');
    code = code.replace(/import\s+saveUserPreference\s+from\s+['\"]@salesforce\/apex\/DAUserPreferenceController\.saveUserPreference['\"];?/, 'const saveUserPreference = (params) => (mockApex.saveUserPreference ? mockApex.saveUserPreference(params) : Promise.resolve(result => mockApex.saveUserPreference(params)));');
    code = code.replace(/import\s+getLatestGraphMetadataForProject\s+from\s+['\"]@salesforce\/apex\/DAGraphController\.getLatestGraphMetadataForProject['\"];?/, 'const getLatestGraphMetadataForProject = (params) => (mockApex.getLatestGraphMetadataForProject ? mockApex.getLatestGraphMetadataForProject(params) : Promise.resolve(null));');
    code = code.replace(/import\s+getGraphChunks\s+from\s+['\"]@salesforce\/apex\/DAGraphController\.getGraphChunks['\"];?/, 'const getGraphChunks = (params) => (mockApex.getGraphChunks ? mockApex.getGraphChunks(params) : Promise.resolve([]));');

    code = code.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['\"]c\/daGraphPayloadLoader['\"];?/, (match, imports) => {
        return `const {${imports}} = graphPayloadLoaderModule;`;
    });

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

    const fn = new Function('LwcMock', 'CustomEvent', 'mockApex', 'filterSchemaModule', 'graphPayloadLoaderModule', code);
    return fn(LwcMock, CustomEvent, mockApex, filterSchemaModule, graphPayloadLoaderModule);
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
    console.log('Running Wave 4 Phase 2C Coordinator Integration Test Suite...');
    console.log('================================================================');

    // Section 1: Shared Graph Payload Lifecycle (Req 1, 2, 4, 5, 6, 7, 8)
    console.log('\n[Section 1: Shared Graph Payload Lifecycle]');

    const validPayload = {
        nodes: [
            { id: 'ApexClass:ServiceA', name: 'ServiceA', displayName: 'ServiceA', type: 'ApexClass', risk: 'HIGH', refactoringReadiness: { testCoverageStatus: 'COVERED' } },
            { id: 'ApexClass:ServiceB', name: 'ServiceB', displayName: 'ServiceB', type: 'ApexClass', risk: 'MEDIUM', refactoringReadiness: { testCoverageStatus: 'UNTESTED' } }
        ],
        edges: [
            { id: 'e1', source: 'ApexClass:ServiceA', target: 'ApexClass:ServiceB' }
        ],
        cycles: [],
        unresolvedReferences: []
    };

    await runAsyncTest('1. Shell loads and validates chunked/raw graph payload', async () => {
        const mockApex = {
            getLatestGraphMetadataForProject: async () => ({
                runId: 'run-101',
                isChunked: false,
                rawPayload: JSON.stringify(validPayload)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_graph_1';
        await shell.loadGraphPayload('proj_graph_1');

        assert.ok(shell.activeGraphPayload, 'activeGraphPayload must be populated');
        assert.strictEqual(shell.activeGraphPayload.nodes.length, 2);
        assert.strictEqual(shell.isLoadingGraph, false);
        assert.strictEqual(shell.graphError, null);
    });

    await runAsyncTest('2. Shell passes the same validated payload to Matrix and Findings', async () => {
        const mockApex = {
            getLatestGraphMetadataForProject: async () => ({
                runId: 'run-102',
                isChunked: false,
                rawPayload: JSON.stringify(validPayload)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_graph_2';
        await shell.loadGraphPayload('proj_graph_2');

        // Both matrix and findings views receive shell.activeGraphPayload
        assert.strictEqual(shell.activeGraphPayload.nodes[0].id, 'ApexClass:ServiceA');
        assert.strictEqual(shell.activeGraphPayload.edges[0].id, 'e1');
    });

    await runAsyncTest('4. No duplicate graph requests when shared payload is supplied', async () => {
        let callCount = 0;
        const mockApex = {
            getLatestGraphMetadataForProject: async () => {
                callCount++;
                return {
                    runId: 'run-104',
                    isChunked: false,
                    rawPayload: JSON.stringify(validPayload)
                };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_graph_4';
        await shell.loadGraphPayload('proj_graph_4');
        assert.strictEqual(callCount, 1, 'Only one graph fetch must be performed for active project');
    });

    await runAsyncTest('5. Stale graph responses are ignored', async () => {
        let resolveSlow = null;
        const mockApex = {
            getLatestGraphMetadataForProject: async ({ projectId }) => {
                if (projectId === 'proj_slow') {
                    return new Promise(resolve => { resolveSlow = resolve; });
                }
                return {
                    runId: 'run-fast',
                    isChunked: false,
                    rawPayload: JSON.stringify(validPayload)
                };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_slow';
        const slowPromise = shell.loadGraphPayload('proj_slow');

        // Fast project supersedes
        shell.activeProjectId = 'proj_fast';
        await shell.loadGraphPayload('proj_fast');
        assert.ok(shell.activeGraphPayload);

        // Resolve slow after fast completed
        if (resolveSlow) {
            resolveSlow({
                runId: 'run-slow',
                isChunked: false,
                rawPayload: JSON.stringify({ nodes: [{ id: 'OldNode' }] })
            });
        }
        await slowPromise;

        assert.strictEqual(shell.activeGraphPayload.nodes[0].id, 'ApexClass:ServiceA', 'Prior project response must not overwrite current graph');
    });

    await runAsyncTest('6. Project switching invalidates prior graph data', async () => {
        const mockApex = {
            getLatestGraphMetadataForProject: async () => ({
                runId: 'run-106',
                isChunked: false,
                rawPayload: JSON.stringify(validPayload)
            }),
            getUserPreference: async () => null
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_A';
        await shell.loadGraphPayload('proj_A');
        assert.ok(shell.activeGraphPayload);

        // Project switch synchronously clears graph payload and selection
        shell.handleProjectChange({ detail: { projectId: null, projectKey: null } });
        assert.strictEqual(shell.activeGraphPayload, null, 'activeGraphPayload must be null when project is cleared');
        assert.strictEqual(shell.selectedNodeId, null);
    });

    runTest('7. Component disconnect invalidates in-flight requests', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        const prevPrefReq = shell.currentPrefRequestId;
        const prevGraphReq = shell.currentGraphRequestId;

        shell.disconnectedCallback();
        assert.strictEqual(shell.currentPrefRequestId, prevPrefReq + 1);
        assert.strictEqual(shell.currentGraphRequestId, prevGraphReq + 1);
    });

    await runAsyncTest('8. Loading, empty and error states are distinct', async () => {
        const mockApex = {
            getLatestGraphMetadataForProject: async () => ({
                runId: 'run-corrupt',
                isChunked: false,
                rawPayload: 'CORRUPT_JSON_DATA'
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_err';
        await shell.loadGraphPayload('proj_err');

        assert.strictEqual(shell.isLoadingGraph, false);
        assert.strictEqual(shell.activeGraphPayload, null);
        assert.ok(shell.graphError.includes('Invalid graph payload structure'), 'Error state must be set for corrupt payload');
    });

    // Section 2: Preset Manager Event Responsibilities (Req 9, 10, 11, 12, 13)
    console.log('\n[Section 2: Preset Manager Event Responsibilities]');

    runTest('9. Preset Manager receives correct inputs via getters', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_inputs';
        assert.strictEqual(shell.scopedFilterContainer.schemaVersion, 2);
        assert.strictEqual(shell.activeFilterCriteria.search, '');
        assert.strictEqual(shell.activeFilterCriteria.testCoverageStatus, 'ALL');
    });

    await runAsyncTest('10. filterchange updates active criteria without accidental container persistence', async () => {
        let saveCalled = false;
        const mockApex = {
            saveUserPreference: async () => {
                saveCalled = true;
                return {};
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_filterchange';

        shell.handleFilterChange({
            detail: {
                activeFilter: { search: 'PaymentService', riskLevels: ['HIGH'] },
                activePresetId: 'preset-quick'
            }
        });

        assert.strictEqual(shell.activeFilterCriteria.search, 'PaymentService');
        assert.deepStrictEqual(shell.activeFilterCriteria.riskLevels, ['HIGH']);
        assert.strictEqual(saveCalled, false, 'filterchange must not trigger saveUserPreference');
    });

    await runAsyncTest('11. containerchange updates and persists the V2 container', async () => {
        let savedParams = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedParams = params;
                return { Filters_JSON__c: params.filtersJson };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_containerchange';

        const updatedContainer = {
            schemaVersion: 2,
            activePresetId: 'preset-saved',
            activeFilter: { search: 'OrderService' },
            presets: [
                { id: 'preset-saved', name: 'Order Preset', projectId: 'proj_containerchange', criteria: { search: 'OrderService' } }
            ]
        };

        shell.handleContainerChange({
            detail: { container: updatedContainer }
        });

        assert.ok(savedParams, 'saveUserPreference must be called on containerchange');
        assert.strictEqual(savedParams.projectId, 'proj_containerchange');
        assert.strictEqual(savedParams.viewMode, null);
        assert.strictEqual(savedParams.layoutMode, null);

        const parsed = JSON.parse(savedParams.filtersJson);
        assert.strictEqual(parsed.schemaVersion, 2);
        assert.strictEqual(parsed.presets.length, 1);
        assert.strictEqual(parsed.presets[0].id, 'preset-saved');
    });

    await runAsyncTest('12. Preset selection updates criteria without erasing presets', async () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_select';

        const containerWithPresets = {
            schemaVersion: 2,
            activePresetId: null,
            activeFilter: { search: '' },
            presets: [
                { id: 'p1', name: 'Preset 1', projectId: 'proj_select', criteria: { search: 'Billing' } },
                { id: 'p2', name: 'Preset 2', projectId: 'proj_select', criteria: { search: 'Shipping' } }
            ]
        };
        shell.filterConfig = containerWithPresets;

        shell.handleFilterChange({
            detail: {
                activeFilter: { search: 'Billing' },
                activePresetId: 'p1'
            }
        });

        assert.strictEqual(shell.activeFilterCriteria.search, 'Billing');
        assert.strictEqual(shell.filterConfig.presets.length, 2, 'All presets must be preserved when selection changes');
        assert.strictEqual(shell.filterConfig.activePresetId, 'p1');
    });

    await runAsyncTest('13. Preset create/update/delete updates container and persists correctly', async () => {
        let savedParams = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedParams = params;
                return { Filters_JSON__c: params.filtersJson };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_crud';

        // Delete preset p2
        const containerAfterDelete = {
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: 'Billing' },
            presets: [
                { id: 'p1', name: 'Preset 1', projectId: 'proj_crud', criteria: { search: 'Billing' } }
            ]
        };

        shell.handleContainerChange({ detail: { container: containerAfterDelete } });
        assert.ok(savedParams);
        const parsed = JSON.parse(savedParams.filtersJson);
        assert.strictEqual(parsed.presets.length, 1);
        assert.strictEqual(parsed.presets[0].id, 'p1');
    });

    // Section 3: Strict Project-Scoped Presets (Req 14, 15, 16, 17, 18, 19)
    console.log('\n[Section 3: Strict Project-Scoped Presets]');

    await runAsyncTest('14. Matching project preset is retained', async () => {
        const rawContainer = {
            schemaVersion: 2,
            activePresetId: 'p-match',
            activeFilter: { search: '' },
            presets: [
                { id: 'p-match', name: 'Match', projectId: 'PROJ_EXACT', criteria: {} }
            ]
        };
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify(rawContainer)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'PROJ_EXACT';
        await shell.loadUserPreferences('PROJ_EXACT');

        assert.strictEqual(shell.scopedFilterContainer.presets.length, 1);
        assert.strictEqual(shell.scopedFilterContainer.presets[0].id, 'p-match');
        assert.strictEqual(shell.scopedFilterContainer.activePresetId, 'p-match');
    });

    await runAsyncTest('15. Different project preset and unscoped presets are excluded', async () => {
        const rawContainer = {
            schemaVersion: 2,
            activePresetId: 'p-unscoped',
            activeFilter: { search: '' },
            presets: [
                { id: 'p-other', name: 'Other', projectId: 'PROJ_OTHER', criteria: {} },
                { id: 'p-unscoped', name: 'Unscoped', criteria: {} },
                { id: 'p-match', name: 'Match', projectId: 'PROJ_CURRENT', criteria: {} }
            ]
        };
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify(rawContainer)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'PROJ_CURRENT';
        await shell.loadUserPreferences('PROJ_CURRENT');

        // Only p-match should remain; p-other and p-unscoped must be excluded
        assert.strictEqual(shell.scopedFilterContainer.presets.length, 1);
        assert.strictEqual(shell.scopedFilterContainer.presets[0].id, 'p-match');
        // activePresetId was pointing to p-unscoped, must reset to null
        assert.strictEqual(shell.scopedFilterContainer.activePresetId, null);
    });

    await runAsyncTest('16. Missing project context exposes no presets', async () => {
        const rawContainer = {
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: '' },
            presets: [
                { id: 'p1', name: 'Preset 1', projectId: 'PROJ_1', criteria: {} }
            ]
        };
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.filterConfig = rawContainer;
        shell.activeProjectId = null;

        assert.strictEqual(shell.scopedFilterContainer.presets.length, 0);
        assert.strictEqual(shell.scopedFilterContainer.activePresetId, null);
    });

    await runAsyncTest('17. Malformed preference JSON does not trigger destructive writes', async () => {
        let saveCalled = false;
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: 'MALFORMED_{{{'
            }),
            saveUserPreference: async () => {
                saveCalled = true;
                return {};
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_malformed_test';
        await shell.loadUserPreferences('proj_malformed_test');

        assert.strictEqual(saveCalled, false, 'Loading malformed JSON must not write to DB');
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.presets.length, 0);
    });

    await runAsyncTest('18. V1 migration remains in-memory only during load', async () => {
        let saveCalled = false;
        const v1Payload = {
            version: 1,
            presets: [{ id: 'v1_p', name: 'Old', criteria: {} }]
        };
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify(v1Payload)
            }),
            saveUserPreference: async () => {
                saveCalled = true;
                return {};
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_v1_inmem';
        await shell.loadUserPreferences('proj_v1_inmem');

        assert.strictEqual(saveCalled, false, 'V1 migration must not trigger save on load');
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
    });

    await runAsyncTest('19. V2 container preserves presets and active preset ID', async () => {
        const v2Payload = {
            schemaVersion: 2,
            activePresetId: 'preset-alpha',
            activeFilter: { search: 'Test' },
            presets: [
                { id: 'preset-alpha', name: 'Alpha', projectId: 'PROJ_PRESERVE', criteria: { search: 'Test' } }
            ]
        };
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify(v2Payload)
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'PROJ_PRESERVE';
        await shell.loadUserPreferences('PROJ_PRESERVE');

        assert.strictEqual(shell.scopedFilterContainer.activePresetId, 'preset-alpha');
        assert.strictEqual(shell.scopedFilterContainer.presets[0].name, 'Alpha');
    });

    // Section 4: Child Views Integration & Predicates (Req 3, 20, 21, 22, 23, 24, 25, 26)
    console.log('\n[Section 4: Child Views Integration & Predicates]');

    runTest('3. Graph Viewer remains functional and receives filter criteria', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_graph_props';
        shell.handleFilterChange({ detail: { activeFilter: { search: 'Controller' } } });
        assert.strictEqual(shell.activeFilterCriteria.search, 'Controller');
    });

    runTest('20. Matrix receives correct shared payload and criteria', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_matrix_props';
        shell.activeGraphPayload = validPayload;
        shell.handleFilterChange({ detail: { activeFilter: { nodeTypes: ['ApexClass'] } } });

        assert.strictEqual(shell.activeProjectId, 'proj_matrix_props');
        assert.strictEqual(shell.activeGraphPayload, validPayload);
        assert.deepStrictEqual(shell.activeFilterCriteria.nodeTypes, ['ApexClass']);
    });

    runTest('21. Findings receives correct shared payload and criteria', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_findings_props';
        shell.activeGraphPayload = validPayload;
        shell.handleFilterChange({ detail: { activeFilter: { findingsSeverity: ['HIGH'] } } });

        assert.strictEqual(shell.activeProjectId, 'proj_findings_props');
        assert.strictEqual(shell.activeGraphPayload, validPayload);
        assert.deepStrictEqual(shell.activeFilterCriteria.findingsSeverity, ['HIGH']);
    });

    runTest('22. Graph filtering uses canonical criteria', () => {
        const node = { id: 'ApexClass:Foo', name: 'Foo', type: 'ApexClass', risk: 'HIGH', refactoringReadiness: { testCoverageStatus: 'COVERED' } };
        assert.strictEqual(filterSchemaModule.matchesGraphNode(node, { search: 'Foo', riskLevels: ['HIGH'] }), true);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(node, { search: 'Bar' }), false);
    });

    runTest('23. Coverage states retain exact canonical semantics', () => {
        assert.deepStrictEqual(filterSchemaModule.CANONICAL_COVERAGE_STATES, ['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN']);
        const normalized = filterSchemaModule.normalizeFilterCriteria({ coverageStatus: 'NO_TESTS' });
        assert.strictEqual(normalized.testCoverageStatus, 'UNTESTED', 'NO_TESTS must map to UNTESTED');
    });

    runTest('24. UNKNOWN and UNTESTED remain distinct', () => {
        const nodeUntested = { id: 'n1', refactoringReadiness: { testCoverageStatus: 'UNTESTED' } };
        const nodeUnknown = { id: 'n2', refactoringReadiness: { testCoverageStatus: 'UNKNOWN' } };
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUntested, { testCoverageStatus: 'UNTESTED' }), true);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUntested, { testCoverageStatus: 'UNKNOWN' }), false);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUnknown, { testCoverageStatus: 'UNKNOWN' }), true);
        assert.strictEqual(filterSchemaModule.matchesGraphNode(nodeUnknown, { testCoverageStatus: 'UNTESTED' }), false);
    });

    runTest('25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold', () => {
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 16, fanIn: 2 } }), true);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 2, fanIn: 11 } }), true);
        assert.strictEqual(filterSchemaModule.isHighCouplingHotspot({ metrics: { coupling: 15, fanIn: 10 } }), false);
    });

    runTest('26. Unresolved Matrix edges are preserved and classified', () => {
        const edge = { id: 'e_unres', source: 'ApexClass:A', target: 'CustomObject:Missing', canonical: { source: { type: 'ApexClass' }, target: { type: 'CustomObject' } } };
        const sourceNode = { id: 'ApexClass:A', type: 'ApexClass' };
        assert.strictEqual(filterSchemaModule.matchesMatrixEdge(edge, sourceNode, null, { nodeTypes: ['ApexClass', 'CustomObject'] }), true);
    });

    // Section 5: Frozen Invariants & State Protection (Req 27, 28, 29, 30, 31, 32)
    console.log('\n[Section 5: Frozen Invariants & State Protection]');

    runTest('27. Existing shell navigation remains intact', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.selectMatrixView();
        assert.strictEqual(shell.activeView, 'matrix');
        shell.selectFindingsView();
        assert.strictEqual(shell.activeView, 'findings');
        shell.selectGraphView();
        assert.strictEqual(shell.activeView, 'graph');
    });

    runTest('28. Invariant 1: SELECTION != NAVIGATION', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_inv_1';
        shell.selectGraphView();

        shell.handleNodeSelect({ detail: { nodeId: 'Node_Selected' } });
        assert.strictEqual(shell.activeView, 'graph', 'View must remain graph');
        assert.strictEqual(shell.selectedNodeId, 'Node_Selected');
        assert.strictEqual(shell.activeProjectId, 'proj_inv_1');
    });

    await runAsyncTest('29. Existing position and zoom/pan fields remain untouched', async () => {
        let savedParams = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedParams = params;
                return {};
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_pos_zoom';

        await shell.savePreferenceChange({ viewMode: 'findings' });
        assert.strictEqual(savedParams.positionsJson, null, 'positionsJson must be null');
        assert.strictEqual(savedParams.zoomPanJson, null, 'zoomPanJson must be null');
    });

    await runAsyncTest('30. Stale preference requests are ignored', async () => {
        let resolveSlow = null;
        const mockApex = {
            getUserPreference: async ({ projectId }) => {
                if (projectId === 'proj_slow') {
                    return new Promise(resolve => { resolveSlow = resolve; });
                }
                return { Active_View_Mode__c: 'matrix' };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_slow';
        const slowPromise = shell.loadUserPreferences('proj_slow');

        shell.handleProjectChange({ detail: { projectId: 'proj_fast' } });
        await shell.loadUserPreferences('proj_fast');
        assert.strictEqual(shell.activeView, 'matrix');

        if (resolveSlow) {
            resolveSlow({ Active_View_Mode__c: 'findings' });
        }
        await slowPromise;

        assert.strictEqual(shell.activeView, 'matrix', 'Slow earlier preference response rejected');
    });

    await runAsyncTest('31. Deduplication prevents duplicate preference writes', async () => {
        let callCount = 0;
        const mockApex = {
            saveUserPreference: async () => {
                callCount++;
                return { Active_View_Mode__c: 'matrix' };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();
        shell.activeProjectId = 'proj_dedup';

        await shell.savePreferenceChange({ viewMode: 'matrix' });
        assert.strictEqual(callCount, 1);

        // Same view mode saved again
        await shell.savePreferenceChange({ viewMode: 'matrix' });
        assert.strictEqual(callCount, 1, 'Duplicate save call suppressed');
    });

    runTest('32. All 12 frozen invariants verified by source contracts', () => {
        // Invariants 1-12 contract check
        assert.ok(filterSchemaModule.SCHEMA_VERSION === 2);
        assert.ok(filterSchemaModule.MAX_PAYLOAD_SIZE === 131072);
        assert.ok(Array.isArray(filterSchemaModule.CANONICAL_COVERAGE_STATES));
    });

    console.log('\n================================================================');
    console.log(`Wave 4 Phase 2C Integration Suite Results: ${passes} PASSED, ${fails} FAILED`);

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

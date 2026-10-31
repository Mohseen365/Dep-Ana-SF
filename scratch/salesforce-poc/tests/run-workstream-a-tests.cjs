/**
 * Workstream A Offline Unit Test Suite
 * Tests daAppShell (FEAT-SHELL-01, FEAT-SHELL-02, FEAT-DATA-03) and daProjectSelector (FEAT-SHELL-03)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Helper to create daProjectSelector instance in Node.js simulation
function createProjectSelectorClass(mockApex) {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daProjectSelector/daProjectSelector.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]lwc['\"];?/, 'const {$1} = LwcMock;');
    code = code.replace(/import\s+getProjects\s+from\s+['\"]@salesforce\/apex\/DAGraphController\.getProjects['\"];?/, 'const getProjects = () => mockApex.getProjects();');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaProjectSelector', 'class DaProjectSelector');
    code += '\nreturn DaProjectSelector;';

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
            this.bubbles = options ? options.bubbles : false;
            this.composed = options ? options.composed : false;
        }
    };

    const fn = new Function('LwcMock', 'CustomEvent', 'mockApex', code);
    return fn(LwcMock, CustomEvent, mockApex);
}

const filterSchemaPath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
let filterSchemaModule = null;
try {
    filterSchemaModule = require(filterSchemaPath);
} catch (e) {}

// Helper to create daAppShell instance in Node.js simulation with mock Apex preference controller
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
    console.log('Running Workstream A LWC Offline Unit Tests (daAppShell & daProjectSelector)...');
    console.log('================================================================================');

    // 1. Application shell initial render
    runTest('1. Application shell initial render defaults', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();
        assert.strictEqual(shell.activeView, 'graph');
        assert.strictEqual(shell.isGraphView, true);
        assert.strictEqual(shell.isMatrixView, false);
        assert.strictEqual(shell.isFindingsView, false);
        assert.strictEqual(shell.activeProjectId, null);
        assert.strictEqual(shell.activeProjectKey, null);
        assert.strictEqual(shell.selectedNodeId, null);
        assert.strictEqual(shell.displayProjectKey, 'None Selected');
        assert.strictEqual(shell.statusText, 'No Project');
        assert.strictEqual(shell.statusBadgeClass, 'slds-badge slds-theme_warning');
    });

    // 2. Navigation among approved existing views
    runTest('2. Navigation among approved existing views (Graph, Matrix, Findings)', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.selectMatrixView();
        assert.strictEqual(shell.activeView, 'matrix');
        assert.strictEqual(shell.isMatrixView, true);
        assert.strictEqual(shell.isGraphView, false);
        assert.strictEqual(shell.activeViewLabel, 'Dependency Matrix');

        shell.selectFindingsView();
        assert.strictEqual(shell.activeView, 'findings');
        assert.strictEqual(shell.isFindingsView, true);
        assert.strictEqual(shell.activeViewLabel, 'Findings & Alerts');

        shell.selectGraphView();
        assert.strictEqual(shell.activeView, 'graph');
        assert.strictEqual(shell.isGraphView, true);
        assert.strictEqual(shell.activeViewLabel, 'Graph Viewer');
    });

    // 3. Project selector loading and populated state
    await runAsyncTest('3. Project selector loading and populated state', async () => {
        const mockProjects = [
            { Id: 'p1', Name: 'Project One', Project_Key__c: 'PROJ_1' },
            { Id: 'p2', Name: 'Project Two', Project_Key__c: 'PROJ_2' }
        ];
        const mockApex = {
            getProjects: async () => mockProjects
        };
        const DaProjectSelector = createProjectSelectorClass(mockApex);
        const selector = new DaProjectSelector();

        let eventFired = false;
        let eventDetail = null;
        selector.addEventListener('projectchange', (evt) => {
            eventFired = true;
            eventDetail = evt.detail;
        });

        await selector.loadProjects();

        assert.strictEqual(selector.isLoading, false);
        assert.strictEqual(selector.error, null);
        assert.strictEqual(selector.isEmpty, false);
        assert.strictEqual(selector.projects.length, 2);
        assert.strictEqual(selector.formattedProjects.length, 2);
        assert.strictEqual(selector.formattedProjects[0].label, 'Project One (PROJ_1)');
        assert.strictEqual(selector.formattedProjects[0].value, 'p1');
        // Auto-selects first project on initial fetch
        assert.strictEqual(eventFired, true);
        assert.strictEqual(eventDetail.projectId, 'p1');
        assert.strictEqual(eventDetail.projectKey, 'PROJ_1');
    });

    // 4. Empty project-list behavior
    await runAsyncTest('4. Empty project-list behavior', async () => {
        const mockApex = {
            getProjects: async () => []
        };
        const DaProjectSelector = createProjectSelectorClass(mockApex);
        const selector = new DaProjectSelector();

        await selector.loadProjects();

        assert.strictEqual(selector.isLoading, false);
        assert.strictEqual(selector.error, null);
        assert.strictEqual(selector.isEmpty, true);
        assert.strictEqual(selector.formattedProjects.length, 0);
    });

    // 5. Project-list request failure behavior
    await runAsyncTest('5. Project-list request failure behavior', async () => {
        const mockApex = {
            getProjects: async () => { throw new Error('SOQL query failed'); }
        };
        const DaProjectSelector = createProjectSelectorClass(mockApex);
        const selector = new DaProjectSelector();

        await selector.loadProjects();

        assert.strictEqual(selector.isLoading, false);
        assert.strictEqual(selector.error.includes('SOQL query failed'), true);
        assert.strictEqual(selector.isEmpty, false);
    });

    // 6. Selecting a project updates parent-owned project context
    runTest('6. Selecting a project updates parent-owned project context', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_abc', projectKey: 'KEY_ABC' }
        });

        assert.strictEqual(shell.activeProjectId, 'proj_abc');
        assert.strictEqual(shell.activeProjectKey, 'KEY_ABC');
        assert.strictEqual(shell.displayProjectKey, 'KEY_ABC');
        assert.strictEqual(shell.statusText, 'Active');
        assert.strictEqual(shell.statusBadgeClass, 'slds-badge slds-theme_success');
    });

    // 7. Active graph viewer receives correct project ID via recordId
    runTest('7. Active graph viewer receives correct project ID binding', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_xyz', projectKey: 'KEY_XYZ' }
        });

        assert.strictEqual(shell.activeProjectId, 'proj_xyz');
    });

    // 8. Switching views does not silently change the project
    runTest('8. Switching views preserves active project context and selection', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_keep', projectKey: 'KEY_KEEP' }
        });
        shell.handleNodeSelect({ detail: { nodeId: 'node_42' } });

        assert.strictEqual(shell.activeProjectId, 'proj_keep');
        assert.strictEqual(shell.selectedNodeId, 'node_42');

        shell.selectMatrixView();
        assert.strictEqual(shell.activeProjectId, 'proj_keep');
        assert.strictEqual(shell.selectedNodeId, 'node_42');

        shell.selectFindingsView();
        assert.strictEqual(shell.activeProjectId, 'proj_keep');
        assert.strictEqual(shell.selectedNodeId, 'node_42');
    });

    // 9. Re-selecting the same project does not cause unnecessary reloads or changes
    runTest('9. Re-selecting the same project suppresses redundant updates', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_1', projectKey: 'KEY_1' }
        });
        shell.handleNodeSelect({ detail: { nodeId: 'node_100' } });

        // Re-select same project
        shell.handleProjectChange({
            detail: { projectId: 'proj_1', projectKey: 'KEY_1' }
        });

        // Selection is NOT cleared on duplicate selection of same project
        assert.strictEqual(shell.selectedNodeId, 'node_100');
    });

    // 10. Graph-node selection does not change selected project or navigate views
    runTest('10. Graph-node selection does NOT alter project or navigate views (SELECTION != NAVIGATION)', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_sel', projectKey: 'KEY_SEL' }
        });
        assert.strictEqual(shell.activeView, 'graph');

        // Node selection event from graph viewer
        shell.handleNodeSelect({ detail: { nodeId: 'ApexClass:AccountController' } });

        assert.strictEqual(shell.selectedNodeId, 'ApexClass:AccountController');
        assert.strictEqual(shell.activeProjectId, 'proj_sel');
        assert.strictEqual(shell.activeView, 'graph');
    });

    // 11. Project switching clears prior node selection
    runTest('11. Project switching clears prior node selection to prevent stale state', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.handleProjectChange({
            detail: { projectId: 'proj_old', projectKey: 'KEY_OLD' }
        });
        shell.handleNodeSelect({ detail: { nodeId: 'node_old' } });
        assert.strictEqual(shell.selectedNodeId, 'node_old');

        // Switch to new project
        shell.handleProjectChange({
            detail: { projectId: 'proj_new', projectKey: 'KEY_NEW' }
        });

        assert.strictEqual(shell.activeProjectId, 'proj_new');
        assert.strictEqual(shell.selectedNodeId, null, 'Node selection must be reset on project change');
    });

    // 12. Accessibility and tab index properties contract
    runTest('12. Accessibility and tab index properties contract', () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        assert.strictEqual(shell.graphTabIndex, 0);
        assert.strictEqual(shell.matrixTabIndex, -1);
        assert.strictEqual(shell.findingsTabIndex, -1);

        shell.selectMatrixView();
        assert.strictEqual(shell.graphTabIndex, -1);
        assert.strictEqual(shell.matrixTabIndex, 0);
        assert.strictEqual(shell.findingsTabIndex, -1);
    });

    // 13. daAppShell HTML template incorporates c-da-annotation-panel component
    runTest('13. daAppShell HTML template integrates c-da-annotation-panel with active project and node bindings', () => {
        const htmlPath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        assert.strictEqual(html.includes('<c-da-annotation-panel'), true, 'daAppShell.html must embed c-da-annotation-panel');
        assert.strictEqual(html.includes('project-id={activeProjectId}'), true, 'c-da-annotation-panel must bind project-id');
        assert.strictEqual(html.includes('selected-node-id={selectedNodeId}'), true, 'c-da-annotation-panel must bind selected-node-id');
    });

    // =========================================================================
    // FEAT-DATA-03 Mandatory Prompt 3B Test Scenarios (14-33)
    // =========================================================================

    // 14. Load preferences for initial project
    await runAsyncTest('14. Load preferences for the initial project', async () => {
        let queriedProjectId = null;
        const mockApex = {
            getUserPreference: async ({ projectId }) => {
                queriedProjectId = projectId;
                return {
                    Active_View_Mode__c: 'matrix',
                    Active_Layout_Mode__c: 'orbit',
                    Filters_JSON__c: JSON.stringify({ schemaVersion: 2, activePresetId: 'test', presets: [] })
                };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_initial';
        await shell.loadUserPreferences('proj_initial');

        assert.strictEqual(queriedProjectId, 'proj_initial');
        assert.strictEqual(shell.activeView, 'matrix');
        assert.strictEqual(shell.activeLayout, 'orbit');
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
    });

    // 15. Load preferences after changing projects
    await runAsyncTest('15. Load preferences after changing projects', async () => {
        const preferencesByProject = {
            proj_A: { Active_View_Mode__c: 'matrix', Active_Layout_Mode__c: 'orbit' },
            proj_B: { Active_View_Mode__c: 'findings', Active_Layout_Mode__c: 'constellation' }
        };
        const mockApex = {
            getUserPreference: async ({ projectId }) => preferencesByProject[projectId] || null
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.handleProjectChange({ detail: { projectId: 'proj_A', projectKey: 'KEY_A' } });
        await shell.loadUserPreferences('proj_A');
        assert.strictEqual(shell.activeView, 'matrix');
        assert.strictEqual(shell.activeLayout, 'orbit');

        shell.handleProjectChange({ detail: { projectId: 'proj_B', projectKey: 'KEY_B' } });
        await shell.loadUserPreferences('proj_B');
        assert.strictEqual(shell.activeView, 'findings');
        assert.strictEqual(shell.activeLayout, 'constellation');
    });

    // 16. Reject a stale response from a previous project
    await runAsyncTest('16. Reject a stale response from a previous project', async () => {
        let resolveSlowRequest = null;
        const mockApex = {
            getUserPreference: async ({ projectId }) => {
                if (projectId === 'proj_slow') {
                    return new Promise(resolve => { resolveSlowRequest = resolve; });
                }
                return { Active_View_Mode__c: 'findings', Active_Layout_Mode__c: 'cose' };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        // 1. Start slow request for proj_slow
        shell.activeProjectId = 'proj_slow';
        const slowPromise = shell.loadUserPreferences('proj_slow');

        // 2. Rapidly switch to proj_fast
        shell.handleProjectChange({ detail: { projectId: 'proj_fast', projectKey: 'KEY_FAST' } });
        await shell.loadUserPreferences('proj_fast');
        assert.strictEqual(shell.activeView, 'findings');

        // 3. Complete slow response from proj_slow after switch
        if (resolveSlowRequest) {
            resolveSlowRequest({ Active_View_Mode__c: 'matrix', Active_Layout_Mode__c: 'orbit' });
        }
        await slowPromise;

        // Active view must NOT be overwritten by stale proj_slow response
        assert.strictEqual(shell.activeView, 'findings');
        assert.strictEqual(shell.activeProjectId, 'proj_fast');
    });

    // 17. Restore a valid saved active view
    await runAsyncTest('17. Restore a valid saved active view', async () => {
        const mockApex = {
            getUserPreference: async () => ({ Active_View_Mode__c: 'findings' })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_1';
        await shell.loadUserPreferences('proj_1');
        assert.strictEqual(shell.activeView, 'findings');
        assert.strictEqual(shell.isFindingsView, true);
    });

    // 18. Restore a valid saved layout
    await runAsyncTest('18. Restore a valid saved layout', async () => {
        const mockApex = {
            getUserPreference: async () => ({ Active_Layout_Mode__c: 'cose_bilkent' })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_1';
        await shell.loadUserPreferences('proj_1');
        assert.strictEqual(shell.activeLayout, 'cose_bilkent');
    });

    // 19. Restore valid versioned filter JSON
    await runAsyncTest('19. Restore valid versioned filter JSON', async () => {
        const validFilterJson = JSON.stringify({
            schemaVersion: 2,
            activePresetId: 'custom-preset-1',
            activeFilter: { search: 'AccountController' },
            presets: [{ id: 'custom-preset-1', name: 'Custom 1', projectId: 'proj_1', criteria: { search: 'AccountController' } }]
        });
        const mockApex = {
            getUserPreference: async () => ({ Filters_JSON__c: validFilterJson })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_1';
        await shell.loadUserPreferences('proj_1');
        assert.strictEqual(shell.filtersJson, validFilterJson);
        assert.strictEqual(shell.filterConfig.activePresetId, 'custom-preset-1');
        assert.strictEqual(shell.filterConfig.activeFilter.search, 'AccountController');
    });

    // 20. Handle missing preferences (returns null from Apex)
    await runAsyncTest('20. Handle missing preferences', async () => {
        const mockApex = {
            getUserPreference: async () => null
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_new';
        await shell.loadUserPreferences('proj_new');
        assert.strictEqual(shell.activeView, 'graph');
        assert.strictEqual(shell.activeLayout, 'cose');
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.preferenceError, null);
    });

    // 21. Handle malformed filter JSON
    await runAsyncTest('21. Handle malformed filter JSON', async () => {
        const mockApex = {
            getUserPreference: async () => ({ Filters_JSON__c: '{ invalid json syntax ...' })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_corrupt';
        await shell.loadUserPreferences('proj_corrupt');
        // Malformed JSON must fall back cleanly to default criteria without throwing or crashing
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.activePresetId, null);
    });

    // 22. Handle unsupported schema versions
    await runAsyncTest('22. Handle unsupported schema versions', async () => {
        const mockApex = {
            getUserPreference: async () => ({
                Filters_JSON__c: JSON.stringify({ schemaVersion: 999, activePresetId: 'future-schema' })
            })
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_future';
        await shell.loadUserPreferences('proj_future');
        // Unsupported version must fall back to approved schema defaults
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.activePresetId, null);
    });

    // 23. Apply approved empty-filter fallback
    await runAsyncTest('23. Apply approved empty-filter fallback', async () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.resetPreferencesToDefaults();
        assert.strictEqual(shell.filterConfig.schemaVersion, 2);
        assert.strictEqual(shell.filterConfig.presets.length, 0);
        assert.strictEqual(shell.filterConfig.activeFilter.search, '');
    });

    // 24. Change only layout while preserving unrelated preferences
    await runAsyncTest('24. Change only layout while preserving unrelated preferences', async () => {
        let savedPayload = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedPayload = params;
                return { Active_Layout_Mode__c: params.layoutMode };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_1';
        shell.handleLayoutSelect({ detail: { layoutMode: 'orbit' } });
        await shell.savePreferenceChange({ layoutMode: 'orbit' });

        assert.strictEqual(savedPayload.projectId, 'proj_1');
        assert.strictEqual(savedPayload.layoutMode, 'orbit');
        assert.strictEqual(savedPayload.viewMode, null);
        assert.strictEqual(savedPayload.filtersJson, null);
        assert.strictEqual(savedPayload.positionsJson, null);
        assert.strictEqual(savedPayload.zoomPanJson, null);
    });

    // 25. Change only filters while preserving unrelated preferences
    await runAsyncTest('25. Change only filters while preserving unrelated preferences', async () => {
        let savedPayload = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedPayload = params;
                return { Filters_JSON__c: params.filtersJson };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        const newFilterJson = JSON.stringify({
            $schema: 'https://dependency-analyzer.salesforce.com/schemas/v1/filter-preset.json',
            version: 1,
            activePresetId: 'filter-2',
            presets: [],
            quickFilters: {}
        });

        shell.activeProjectId = 'proj_1';
        shell.handleFilterChange({ detail: { filtersJson: newFilterJson } });
        await shell.savePreferenceChange({ filtersJson: newFilterJson });

        assert.strictEqual(savedPayload.projectId, 'proj_1');
        assert.strictEqual(savedPayload.filtersJson, newFilterJson);
        assert.strictEqual(savedPayload.viewMode, null);
        assert.strictEqual(savedPayload.layoutMode, null);
        assert.strictEqual(savedPayload.positionsJson, null);
        assert.strictEqual(savedPayload.zoomPanJson, null);
    });

    // 26. Change only active view while preserving unrelated preferences
    await runAsyncTest('26. Change only active view while preserving unrelated preferences', async () => {
        let savedPayload = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedPayload = params;
                return { Active_View_Mode__c: params.viewMode };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_1';
        shell.selectMatrixView();

        assert.strictEqual(savedPayload.projectId, 'proj_1');
        assert.strictEqual(savedPayload.viewMode, 'matrix');
        assert.strictEqual(savedPayload.layoutMode, null);
        assert.strictEqual(savedPayload.filtersJson, null);
        assert.strictEqual(savedPayload.positionsJson, null);
        assert.strictEqual(savedPayload.zoomPanJson, null);
    });

    // 27. Ensure graph positions are not overwritten during preference saves
    await runAsyncTest('27. Ensure graph positions are not overwritten during preference saves', async () => {
        let savedPayload = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedPayload = params;
                return { Active_View_Mode__c: params.viewMode };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_positions_check';
        await shell.savePreferenceChange({ viewMode: 'findings' });

        assert.strictEqual(savedPayload.positionsJson, null, 'Must explicitly pass null for positionsJson to prevent overwriting ViewState');
    });

    // 28. Ensure zoom/pan is not overwritten during preference saves
    await runAsyncTest('28. Ensure zoom/pan is not overwritten during preference saves', async () => {
        let savedPayload = null;
        const mockApex = {
            saveUserPreference: async (params) => {
                savedPayload = params;
                return { Active_View_Mode__c: params.viewMode };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_zoom_check';
        await shell.savePreferenceChange({ viewMode: 'graph' });

        assert.strictEqual(savedPayload.zoomPanJson, null, 'Must explicitly pass null for zoomPanJson to prevent overwriting ViewState');
    });

    // 29. Prevent redundant saves
    await runAsyncTest('29. Prevent redundant saves', async () => {
        let saveCallCount = 0;
        const mockApex = {
            saveUserPreference: async () => {
                saveCallCount++;
                return { Active_View_Mode__c: 'matrix' };
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_dedup';
        await shell.savePreferenceChange({ viewMode: 'matrix' });
        assert.strictEqual(saveCallCount, 1);

        // Attempt second save with identical viewMode value
        await shell.savePreferenceChange({ viewMode: 'matrix' });
        assert.strictEqual(saveCallCount, 1, 'Duplicate save with unchanged payload must be suppressed');
    });

    // 30. Handle save failures
    await runAsyncTest('30. Handle save failures', async () => {
        const mockApex = {
            saveUserPreference: async () => { throw new Error('DML governor limit exceeded'); }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_fail';
        await shell.savePreferenceChange({ viewMode: 'findings' });

        assert.strictEqual(shell.preferenceError.includes('DML governor limit exceeded'), true);
        assert.strictEqual(shell.activeProjectId, 'proj_fail', 'Local state must remain intact on save failure');
    });

    // 31. Prevent duplicate load/save operations
    await runAsyncTest('31. Prevent duplicate load/save operations', async () => {
        let getUserPrefCallCount = 0;
        const mockApex = {
            getUserPreference: async () => {
                getUserPrefCallCount++;
                return null;
            }
        };
        const DaAppShell = createAppShellClass(mockApex);
        const shell = new DaAppShell();

        // Re-selecting same project does not trigger second preference load
        shell.handleProjectChange({ detail: { projectId: 'proj_same', projectKey: 'KEY_SAME' } });
        assert.strictEqual(getUserPrefCallCount, 1);

        shell.handleProjectChange({ detail: { projectId: 'proj_same', projectKey: 'KEY_SAME' } });
        assert.strictEqual(getUserPrefCallCount, 1);
    });

    // 32. Preserve SELECTION != NAVIGATION invariant
    await runAsyncTest('32. Preserve SELECTION != NAVIGATION invariant during preference changes', async () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_inv';
        shell.handleNodeSelect({ detail: { nodeId: 'Node_Alpha' } });
        assert.strictEqual(shell.selectedNodeId, 'Node_Alpha');

        // View switch
        shell.selectMatrixView();
        assert.strictEqual(shell.selectedNodeId, 'Node_Alpha', 'Node selection must be preserved across view switches');
        assert.strictEqual(shell.activeProjectId, 'proj_inv', 'Active project must not change on view switch');
    });

    // 33. Preserve existing component lifecycle cleanup
    await runAsyncTest('33. Preserve existing component lifecycle cleanup', async () => {
        const DaAppShell = createAppShellClass();
        const shell = new DaAppShell();

        shell.activeProjectId = 'proj_life';
        const initialReqId = shell.currentPrefRequestId;

        shell.disconnectedCallback();
        assert.strictEqual(shell.currentPrefRequestId, initialReqId + 1, 'Disconnect must bump request token to invalidate in-flight calls');
    });

    console.log('\n================================================================================');
    console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error running Workstream A test suite:', err);
    process.exit(1);
});

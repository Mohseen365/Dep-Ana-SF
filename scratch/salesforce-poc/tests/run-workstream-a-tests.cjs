/**
 * Workstream A Offline Unit Test Suite
 * Tests daAppShell (FEAT-SHELL-01, FEAT-SHELL-02) and daProjectSelector (FEAT-SHELL-03)
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

// Helper to create daAppShell instance in Node.js simulation
function createAppShellClass() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]lwc['\"];?/, 'const {$1} = LwcMock;');
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

    const fn = new Function('LwcMock', 'CustomEvent', code);
    return fn(LwcMock, CustomEvent);
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
        // Template passes recordId={activeProjectId} to c-da-graph-viewer
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

    // 11. Project switching does not display stale graph content (clears node selection)
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

    // 12. Accessibility and responsive properties check
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

/**
 * Agent 5 Existing LWC Component Integration Verification Test Runner
 *
 * Verifies:
 * 1. daSankeyView:
 *    - Workspace registration & mounting contract adherence
 *    - Separation between layout ('sankey'), workspace view ('river'), and LWC component ('daSankeyView')
 *    - Graph-selection semantics & CONTRACT-06 compliance (SELECTION != NAVIGATION)
 *    - Native SVG rendering, keyboard/accessibility behavior
 *
 * 2. daSnapshotComparisonModal:
 *    - Header action routing / triggers
 *    - Preservation of comparison behavior (CONTRACT-05 tabular structural diff)
 *    - Verification that it is NOT registered as a workspace visualization view
 *    - Keyboard & accessibility behavior (dialog, aria-modal, etc.)
 *
 * 3. daPresetManager:
 *    - Project-scoped filter preset management workflow
 *    - Preservation of container schema V2 and capacity limits
 *    - Verification that it is NOT registered as a visualization view
 *
 * 4. Shared Shell Protection:
 *    - Coordinator D1 ownership of daAppShell.*, daHeader.*, daSidebar.*
 *    - Verification of exact integration specifications and non-tampering of protected paths
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        testsFailed++;
    }
}

console.log('Running Agent 5 Component Integration Verification Suite...');
console.log('===========================================================\n');

// ---------------------------------------------------------------------------
// Suite 1: Component File Integrity & Metadata Inspection
// ---------------------------------------------------------------------------
console.log('[Suite 1: Component File Integrity & Metadata Inspection]');

test('1.1 daSankeyView files exist, non-empty, and specify correct metadata', () => {
    const basePath = path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView');
    const files = ['daSankeyView.js', 'daSankeyView.html', 'daSankeyView.css', 'daSankeyView.js-meta.xml'];
    files.forEach(f => {
        const fullPath = path.join(basePath, f);
        assert.ok(fs.existsSync(fullPath), `Missing file: ${f}`);
        assert.ok(fs.statSync(fullPath).size > 0, `File is empty: ${f}`);
    });

    const meta = fs.readFileSync(path.join(basePath, 'daSankeyView.js-meta.xml'), 'utf8');
    assert.ok(meta.includes('<apiVersion>60.0</apiVersion>'), 'daSankeyView API version must be 60.0');
    assert.ok(meta.includes('<isExposed>true</isExposed>'), 'daSankeyView must be exposed');
});

test('1.2 daSnapshotComparisonModal files exist, non-empty, and specify correct metadata', () => {
    const basePath = path.resolve(__dirname, '../force-app/main/default/lwc/daSnapshotComparisonModal');
    const files = ['daSnapshotComparisonModal.js', 'daSnapshotComparisonModal.html', 'daSnapshotComparisonModal.css', 'daSnapshotComparisonModal.js-meta.xml'];
    files.forEach(f => {
        const fullPath = path.join(basePath, f);
        assert.ok(fs.existsSync(fullPath), `Missing file: ${f}`);
        assert.ok(fs.statSync(fullPath).size > 0, `File is empty: ${f}`);
    });

    const meta = fs.readFileSync(path.join(basePath, 'daSnapshotComparisonModal.js-meta.xml'), 'utf8');
    assert.ok(meta.includes('<apiVersion>60.0</apiVersion>'), 'daSnapshotComparisonModal API version must be 60.0');
    assert.ok(meta.includes('<isExposed>true</isExposed>'), 'daSnapshotComparisonModal must be exposed');
});

test('1.3 daPresetManager files exist, non-empty, and specify correct metadata', () => {
    const basePath = path.resolve(__dirname, '../force-app/main/default/lwc/daPresetManager');
    const files = ['daPresetManager.js', 'daPresetManager.html', 'daPresetManager.css', 'daPresetManager.js-meta.xml'];
    files.forEach(f => {
        const fullPath = path.join(basePath, f);
        assert.ok(fs.existsSync(fullPath), `Missing file: ${f}`);
        assert.ok(fs.statSync(fullPath).size > 0, `File is empty: ${f}`);
    });

    const meta = fs.readFileSync(path.join(basePath, 'daPresetManager.js-meta.xml'), 'utf8');
    assert.ok(meta.includes('<apiVersion>60.0</apiVersion>'), 'daPresetManager API version must be 60.0');
    assert.ok(meta.includes('<isExposed>true</isExposed>'), 'daPresetManager must be exposed');
});

// ---------------------------------------------------------------------------
// Suite 2: daSankeyView Inspection & Distinction Verification
// ---------------------------------------------------------------------------
console.log('\n[Suite 2: daSankeyView Workspace Distinction & Selection Semantics]');

test('2.1 daSankeyView preserves distinction between layout, view, and component', () => {
    const jsSource = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js'), 'utf8');

    // Layout identifier is 'sankey', workspace view mode is 'river', component is 'daSankeyView'
    assert.ok(jsSource.includes("sourceView: 'river'"), "Sankey event dispatches with sourceView: 'river'");
    assert.ok(jsSource.includes("sourceComponent: 'daSankeyView'"), "Sankey event dispatches with sourceComponent: 'daSankeyView'");
    assert.ok(!jsSource.includes("sourceView: 'sankey'"), "Must NOT confuse view mode 'river' with layout algorithm 'sankey'");
});

test('2.2 daSankeyView strictly adheres to CONTRACT-06 Selection DTO & SELECTION != NAVIGATION', () => {
    const jsSource = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js'), 'utf8');

    assert.ok(jsSource.includes("this.dispatchEvent(new CustomEvent('nodeselect'"), 'Dispatches nodeselect event');
    assert.ok(jsSource.includes("bubbles: true"), 'bubbles flag set to true');
    assert.ok(jsSource.includes("composed: true"), 'composed flag set to true');
    assert.ok(jsSource.includes("cancelable: false"), 'cancelable flag set to false');
    assert.ok(jsSource.includes("nodeId"), 'detail includes nodeId');
    assert.ok(jsSource.includes("meta: {"), 'detail includes meta');

    // Verify zero navigation side effects
    assert.ok(!jsSource.includes("activeView ="), 'Selection must not alter active view');
    assert.ok(!jsSource.includes("history.pushState"), 'Selection must not trigger pushState navigation');
});

test('2.3 daSankeyView enforces zero-D3 and single Cytoscape canvas invariants', () => {
    const jsSource = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js'), 'utf8');
    assert.strictEqual(jsSource.includes("import d3"), false, 'No D3 import');
    assert.strictEqual(jsSource.includes("d3."), false, 'No D3 usage');
    assert.strictEqual(jsSource.includes("cytoscape"), false, 'No cytoscape usage');
});

test('2.4 daSankeyView keyboard & accessibility behavior', () => {
    const jsSource = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js'), 'utf8');
    const htmlSource = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.html'), 'utf8');

    assert.ok(jsSource.includes('handleNodeKeyDown'), 'Handles keyboard events on nodes');
    assert.ok(jsSource.includes("event.key === 'Enter'") && jsSource.includes("event.key === ' '"), 'Supports Enter and Space key activation');
    assert.ok(htmlSource.includes('role="button"'), 'SVG node groups specify role="button"');
    assert.ok(htmlSource.includes('tabindex="0"'), 'SVG nodes are focusable via tabindex="0"');
    assert.ok(htmlSource.includes('aria-label='), 'Exposes aria-label for accessibility');
});

// ---------------------------------------------------------------------------
// Suite 3: daSnapshotComparisonModal Inspection & Registration Governance
// ---------------------------------------------------------------------------
console.log('\n[Suite 3: daSnapshotComparisonModal Header Action & Non-View Invariant]');

test('3.1 Header action routes compare action to history/compare modal workflow', () => {
    const headerJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daHeader/daHeader.js'), 'utf8');
    const headerHtml = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daHeader/daHeader.html'), 'utf8');
    const appShellJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js'), 'utf8');

    assert.ok(headerHtml.includes('data-action="compare"'), 'Header contains compare action button');
    assert.ok(headerJs.includes('handleActionTrigger'), 'Header dispatches actiontrigger on click');
    assert.ok(appShellJs.includes("action === 'compare'"), 'AppShell intercepts compare action trigger');
});

test('3.2 daSnapshotComparisonModal is NOT registered as a workspace visualization view in APPROVED_VIEWS', () => {
    const appShellJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js'), 'utf8');

    const approvedViewsMatch = appShellJs.match(/const APPROVED_VIEWS = \[([\s\S]*?)\];/);
    assert.ok(approvedViewsMatch, 'APPROVED_VIEWS array found in daAppShell.js');
    const approvedViews = approvedViewsMatch[1];

    assert.ok(!approvedViews.includes("'daSnapshotComparisonModal'"), 'daSnapshotComparisonModal must not be in APPROVED_VIEWS');
    assert.ok(!approvedViews.includes("'snapshotComparison'"), 'snapshotComparison must not be in APPROVED_VIEWS');
});

test('3.3 daSnapshotComparisonModal enforces CONTRACT-05 diff limits and single Cytoscape canvas invariant', () => {
    const modalJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js'), 'utf8');

    assert.ok(modalJs.includes('SINGLE_SNAPSHOT_MAX_SIZE = 5242880'), '5 MB single snapshot cap');
    assert.ok(modalJs.includes('COMBINED_SNAPSHOT_MAX_SIZE = 10485760'), '10 MB combined payload cap');
    assert.ok(modalJs.includes('MAX_CHUNKS_PER_BATCH = 10'), 'Max 10 chunks per batch');
    assert.ok(!modalJs.includes('cytoscape('), 'Must NOT instantiate Cytoscape canvas');
});

test('3.4 daSnapshotComparisonModal accessibility and keyboard dialog behavior', () => {
    const modalHtml = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.html'), 'utf8');

    assert.ok(modalHtml.includes('role="dialog"'), 'Exposes role="dialog"');
    assert.ok(modalHtml.includes('aria-modal="true"'), 'Exposes aria-modal="true"');
    assert.ok(modalHtml.includes('aria-labelledby="modal-heading-01"'), 'Labels dialog header with aria-labelledby');
});

// ---------------------------------------------------------------------------
// Suite 4: daPresetManager Inspection & Filter Workflow
// ---------------------------------------------------------------------------
console.log('\n[Suite 4: daPresetManager Filter Workflow & Non-View Invariant]');

test('4.1 daPresetManager is NOT registered as a workspace visualization view', () => {
    const appShellJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daAppShell.js'), 'utf8');

    const approvedViewsMatch = appShellJs.match(/const APPROVED_VIEWS = \[([\s\S]*?)\];/);
    const approvedViews = approvedViewsMatch[1];

    assert.ok(!approvedViews.includes("'daPresetManager'"), 'daPresetManager must not be in APPROVED_VIEWS');
    assert.ok(!approvedViews.includes("'preset'"), 'preset must not be in APPROVED_VIEWS');
    assert.ok(!approvedViews.includes("'presets'"), 'presets must not be in APPROVED_VIEWS');
});

test('4.2 daPresetManager filter-management workflow and events', () => {
    const presetJs = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daPresetManager/daPresetManager.js'), 'utf8');

    assert.ok(presetJs.includes("this.dispatchEvent(new CustomEvent('filterchange'"), 'Dispatches filterchange event');
    assert.ok(presetJs.includes("this.dispatchEvent(new CustomEvent('containerchange'"), 'Dispatches containerchange event');
    assert.ok(presetJs.includes('projectId'), 'Integrates with active project context');
});

test('4.3 daPresetManager accessibility and modal interaction', () => {
    const presetHtml = fs.readFileSync(path.resolve(__dirname, '../force-app/main/default/lwc/daPresetManager/daPresetManager.html'), 'utf8');

    assert.ok(presetHtml.includes('role="dialog"'), 'Save modal exposes role="dialog"');
    assert.ok(presetHtml.includes('aria-modal="true"'), 'Save modal exposes aria-modal="true"');
    assert.ok(presetHtml.includes('class="slds-assistive-text"'), 'Includes assistive text for screen readers');
});

// ---------------------------------------------------------------------------
// Suite 5: Shared Shell & CONTRACT-08 Governance Protection Boundary
// ---------------------------------------------------------------------------
console.log('\n[Suite 5: Shell Governance & Coordinator D1 Ownership Protection]');

test('5.1 daAppShell.*, daHeader.*, daSidebar.* are protected and owned exclusively by D1', () => {
    const regPath = path.resolve(__dirname, '../../../PHASE_1_IMPLEMENTATION_FILE_OWNERSHIP_REGISTER.csv');
    assert.ok(fs.existsSync(regPath), 'Ownership register exists');
    const content = fs.readFileSync(regPath, 'utf8');

    assert.ok(content.includes('daAppShell.*,Integration Coordinator D1,D1 Exclusively'), 'daAppShell.* owned exclusively by D1');
    assert.ok(content.includes('daHeader.*,Integration Coordinator D1,D1 Exclusively'), 'daHeader.* owned exclusively by D1');
    assert.ok(content.includes('daSidebar.*,Integration Coordinator D1,D1 Exclusively'), 'daSidebar.* owned exclusively by D1');
    assert.ok(content.includes('Agent 5,Agent 5,"D1, D2",Agent 5 & Agent 10,Integration Coordinator D1,STRICT: Must NOT modify daAppShell.* daHeader.* daSidebar.*'), 'Agent 5 strictly prohibited from editing shell files');
});

test('5.2 CONTRACT-08 workspace registration contract integrity verified', () => {
    const contractPath = path.resolve(__dirname, '../../../docs/waves-5-9/phase-a3/CONTRACT_08_WORKSPACE_REGISTRATION_AND_MOUNT.md');
    assert.ok(fs.existsSync(contractPath), 'CONTRACT-08 exists');
    const content = fs.readFileSync(contractPath, 'utf8');

    assert.ok(content.includes('CONTRACT-08'), 'Contract ID matches');
    assert.ok(content.includes('Coordinator-Exclusive Shell Ownership'), 'Shell ownership protection documented');
    assert.ok(content.includes('Lazy DOM Mounting Invariant'), 'Lazy DOM mounting documented');
});

console.log('===========================================================');
console.log(`Agent 5 Integration Verification Results: ${testsPassed} PASSED, ${testsFailed} FAILED\n`);

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

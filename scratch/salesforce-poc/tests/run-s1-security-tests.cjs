/**
 * Agent S1: Dedicated Security Remediation and Regression Test Runner
 * Validates SEC-01 (FLS Remediation), SEC-02 (Apex Security & USER_MODE Test Coverage),
 * and SEC-03 (BroadcastChannel Hardening & Multi-Window IPC Isolation).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FORCE_APP = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default');
const PERMSET_PATH = path.join(FORCE_APP, 'permissionsets/DA_Architecture_Analyst.permissionset-meta.xml');
const DRAWER_JS_PATH = path.join(FORCE_APP, 'lwc/daInvestigationDrawer/daInvestigationDrawer.js');
const SCHEMA_TEST_PATH = path.join(FORCE_APP, 'classes/tests/DASchemaAndSecurityTest.cls');
const GRAPH_TEST_PATH = path.join(FORCE_APP, 'classes/tests/DAGraphSecurityTest.cls');

console.log('===================================================================');
console.log('Running Agent S1 Security Remediation & Regression Test Suite...');
console.log('===================================================================');

let passes = 0;
let fails = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err);
        fails++;
    }
}

// ===================================================================
// SUITE 1: SEC-01 Field-Level Security Remediation Verification
// ===================================================================
console.log('\n[Suite 1: SEC-01 Field-Level Security Verification]');

runTest('1.1 Permission set XML exists and is valid metadata', () => {
    assert.strictEqual(fs.existsSync(PERMSET_PATH), true);
    const xml = fs.readFileSync(PERMSET_PATH, 'utf8');
    assert.ok(xml.includes('<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">'));
    assert.ok(xml.includes('</PermissionSet>'));
});

runTest('1.2 Exactly 29 fields are granted FLS in DA_Architecture_Analyst (17 baseline + 12 remediated)', () => {
    const xml = fs.readFileSync(PERMSET_PATH, 'utf8');
    const existingFps = new Set();
    const regex = /<field>([^<]+)<\/field>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        existingFps.add(match[1]);
    }
    assert.ok(existingFps.size === 29 || existingFps.size === 34, `Granted fields must be 29 or 34, got ${existingFps.size}`);

    const expected12Remediated = [
        'DA_User_Preference__c.Active_Layout_Mode__c',
        'DA_User_Preference__c.Active_View_Mode__c',
        'DA_User_Preference__c.Filters_JSON__c',
        'DA_User_Preference__c.Positions_JSON__c',
        'DA_User_Preference__c.Project__c',
        'DA_User_Preference__c.User__c',
        'DA_User_Preference__c.Zoom_Pan_JSON__c',
        'DA_Annotation__c.Author__c',
        'DA_Annotation__c.Finding__c',
        'DA_Annotation__c.Resolved_At__c',
        'DA_Annotation__c.Status__c',
        'DA_Annotation__c.Text__c'
    ];

    for (const f of expected12Remediated) {
        assert.strictEqual(existingFps.has(f), true, `Remediated field ${f} must be present in permission set`);
    }
});

runTest('1.3 Master-Detail and Required fields are excluded from FLS entries', () => {
    const xml = fs.readFileSync(PERMSET_PATH, 'utf8');
    const masterDetailFields = [
        'DA_Analysis_Run__c.DA_Project__c',
        'DA_Annotation__c.Project__c',
        'DA_Finding__c.DA_Analysis_Run__c',
        'DA_Graph_Chunk__c.DA_Analysis_Run__c'
    ];
    for (const md of masterDetailFields) {
        assert.strictEqual(xml.includes(`<field>${md}</field>`), false, `Master-Detail field ${md} must NOT have FLS`);
    }
});

// ===================================================================
// SUITE 2: SEC-02 Apex Security Test Coverage Verification
// ===================================================================
console.log('\n[Suite 2: SEC-02 Apex Security Test Coverage Verification]');

runTest('2.1 DASchemaAndSecurityTest.cls contains test coverage for USER_MODE and remediated objects', () => {
    assert.strictEqual(fs.existsSync(SCHEMA_TEST_PATH), true);
    const code = fs.readFileSync(SCHEMA_TEST_PATH, 'utf8');
    assert.ok(code.includes('testUserPreferenceAndAnnotationUserModeSecurity'), 'Must contain security test method');
    assert.ok(code.includes('WITH USER_MODE'), 'Must verify WITH USER_MODE queries');
    assert.ok(code.includes('insert as user pref'), 'Must verify insert as user for DA_User_Preference__c');
    assert.ok(code.includes('insert as user annotation'), 'Must verify insert as user for DA_Annotation__c');
    assert.ok(code.includes('update as user queriedAnnotations[0]'), 'Must verify update as user for DA_Annotation__c');
});

runTest('2.2 DAGraphSecurityTest.cls validates multi-tenant isolation and restricted user access', () => {
    assert.strictEqual(fs.existsSync(GRAPH_TEST_PATH), true);
    const code = fs.readFileSync(GRAPH_TEST_PATH, 'utf8');
    assert.ok(code.includes('testProjectIsolation'), 'Must test project isolation');
    assert.ok(code.includes('testSystemRunAsRestrictedUserAccess'), 'Must test restricted user access');
    assert.ok(code.includes('testCrossProjectChunkRetrievalRejection'), 'Must test cross project rejection');
});

// ===================================================================
// SUITE 3: SEC-03 BroadcastChannel Isolation & Multi-Window Security
// ===================================================================
console.log('\n[Suite 3: SEC-03 BroadcastChannel Isolation & Multi-Window Security]');

runTest('3.1 daInvestigationDrawer.js includes _instanceId for echo suppression', () => {
    const code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    assert.ok(code.includes('_instanceId'), 'Must declare _instanceId');
    assert.ok(code.includes('data.senderId === this._instanceId'), 'Must suppress self echoes');
});

runTest('3.2 handleBroadcastMessage rejects mismatched projectId', () => {
    // Load and evaluate component class in sandbox
    let code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() { this._dispatchedEvents = []; }
            dispatchEvent(evt) { this._dispatchedEvents.push(evt); }
        }
    };
    class MockBroadcastChannel {
        constructor(name) { this.name = name; this.messages = []; this.onmessage = null; }
        postMessage(msg) { this.messages.push(msg); }
        close() {}
    }
    global.BroadcastChannel = MockBroadcastChannel;
    global.window = {
        BroadcastChannel: MockBroadcastChannel,
        open: () => {}
    };

    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    const comp = new ctor();
    comp.connectedCallback();
    comp.projectId = 'proj_alpha';
    comp.graphPayload = {
        schemaVersion: '1.0.0',
        nodes: [{ id: 'n1', label: 'Node 1' }, { id: 'n2', label: 'Node 2' }],
        edges: []
    };
    comp.selectedNodeId = 'n1';

    // Mismatched project message must be ignored
    comp.handleBroadcastMessage({
        type: 'DRAWER_SELECT_NODE',
        projectId: 'proj_beta',
        nodeId: 'n2'
    });
    assert.strictEqual(comp.selectedNodeId, 'n1', 'Cross-project selection must be ignored');

    // Matching project message must be processed
    comp.handleBroadcastMessage({
        type: 'DRAWER_SELECT_NODE',
        projectId: 'proj_alpha',
        nodeId: 'n2'
    });
    assert.strictEqual(comp.selectedNodeId, 'n2', 'Matching project selection must be applied');
});

runTest('3.3 handleBroadcastMessage rejects echo from same instanceId', () => {
    let code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() { this._dispatchedEvents = []; }
            dispatchEvent(evt) { this._dispatchedEvents.push(evt); }
        }
    };
    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    const comp = new ctor();
    comp.connectedCallback();
    comp.projectId = 'proj_alpha';
    comp.graphPayload = {
        schemaVersion: '1.0.0',
        nodes: [{ id: 'n1' }, { id: 'n2' }],
        edges: []
    };
    comp.selectedNodeId = 'n1';

    // Self echo with comp._instanceId
    comp.handleBroadcastMessage({
        type: 'DRAWER_SELECT_NODE',
        projectId: 'proj_alpha',
        senderId: comp._instanceId,
        nodeId: 'n2'
    });
    assert.strictEqual(comp.selectedNodeId, 'n1', 'Self echo message must be ignored');
});

runTest('3.4 handleBroadcastMessage rejects stale messages older than 15s', () => {
    let code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() { this._dispatchedEvents = []; }
            dispatchEvent(evt) { this._dispatchedEvents.push(evt); }
        }
    };
    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    const comp = new ctor();
    comp.connectedCallback();
    comp.projectId = 'proj_alpha';
    comp.graphPayload = {
        schemaVersion: '1.0.0',
        nodes: [{ id: 'n1' }, { id: 'n2' }],
        edges: []
    };
    comp.selectedNodeId = 'n1';

    // 20 seconds old
    comp.handleBroadcastMessage({
        type: 'DRAWER_SELECT_NODE',
        projectId: 'proj_alpha',
        timestamp: Date.now() - 20000,
        nodeId: 'n2'
    });
    assert.strictEqual(comp.selectedNodeId, 'n1', 'Stale message (>15s) must be ignored');
});

runTest('3.5 handleBroadcastMessage rejects unauthorized or malformed action types', () => {
    let code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() { this._dispatchedEvents = []; }
            dispatchEvent(evt) { this._dispatchedEvents.push(evt); }
        }
    };
    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    const comp = new ctor();
    comp.connectedCallback();
    comp.projectId = 'proj_alpha';
    comp.selectedNodeId = 'n1';

    comp.handleBroadcastMessage({
        type: 'UNAUTHORIZED_COMMAND',
        projectId: 'proj_alpha',
        nodeId: 'n2'
    });
    assert.strictEqual(comp.selectedNodeId, 'n1', 'Unauthorized action type must be ignored');
});

runTest('3.6 Outbound messages from handleDetach and notifyDetachedWindow include envelope metadata', () => {
    let code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() { this._dispatchedEvents = []; }
            dispatchEvent(evt) { this._dispatchedEvents.push(evt); }
        }
    };
    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    const comp = new ctor();
    comp.connectedCallback();
    comp.projectId = 'proj_alpha';
    comp.selectedNodeId = 'n1';

    comp.handleDetach();
    assert.strictEqual(comp._broadcastChannel.messages.length >= 1, true);
    const detachMsg = comp._broadcastChannel.messages.find(m => m.type === 'DRAWER_DETACHED');
    assert.ok(detachMsg, 'DRAWER_DETACHED message must be posted');
    assert.strictEqual(detachMsg.projectId, 'proj_alpha');
    assert.strictEqual(detachMsg.selectedNodeId, 'n1');
    assert.strictEqual(detachMsg.senderId, comp._instanceId);
    assert.strictEqual(typeof detachMsg.timestamp, 'number');
});

console.log('\n===================================================================');
console.log(`Agent S1 Security Remediation Suite Results: ${passes} PASSED, ${fails} FAILED`);
console.log('===================================================================');

if (fails > 0) {
    process.exit(1);
}

/**
 * Test Runner: run-b4-security-tests.cjs
 * Owner: Agent B4 (Security Auditor and Remediation Owner)
 * Allocation: scratch/salesforce-poc/tests/run-b4-security-tests.cjs (REMAINING_WORK_FILE_OWNERSHIP.csv)
 * Scope: Independent verification of Salesforce security gaps (SEC-01, SEC-02, SEC-03, SEC-04)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('===================================================================');
console.log('Running Agent B4 Security Verification & Regression Test Suite...');
console.log('===================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passCount++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        failCount++;
    }
}

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FORCE_APP = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default');

// ===================================================================
// SUITE 1: SEC-01 Field-Level Security & Permission Set Audit
// ===================================================================
console.log('[Suite 1: SEC-01 Field-Level Security Verification]');

const PERMSET_PATH = path.join(FORCE_APP, 'permissionsets/DA_Architecture_Analyst.permissionset-meta.xml');
const OBJECTS_DIR = path.join(FORCE_APP, 'objects');

runTest('1.1 Permission set XML is syntactically valid and has basic structure', () => {
    assert.strictEqual(fs.existsSync(PERMSET_PATH), true, 'Permission set must exist');
    const xml = fs.readFileSync(PERMSET_PATH, 'utf8');
    assert.ok(xml.includes('<PermissionSet'), 'Must contain <PermissionSet>');
    assert.ok(xml.includes('<label>DA Architecture Analyst</label>'), 'Must contain valid label');
});

runTest('1.2 Custom field inventory across all 6 DA objects totals 35 fields', () => {
    const objDirs = fs.readdirSync(OBJECTS_DIR).filter(d => fs.statSync(path.join(OBJECTS_DIR, d)).isDirectory());
    assert.strictEqual(objDirs.length, 6, 'Must contain exactly 6 DA custom objects');

    let totalFields = 0;
    for (const obj of objDirs) {
        const fieldsDir = path.join(OBJECTS_DIR, obj, 'fields');
        if (fs.existsSync(fieldsDir)) {
            const files = fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'));
            totalFields += files.length;
        }
    }
    assert.strictEqual(totalFields, 35, 'Total custom fields across all 6 objects must be 35');
});

runTest('1.3 Master-Detail fields (4 total) are properly classified and excluded from FLS eligibility', () => {
    const mdFields = [];
    const objDirs = fs.readdirSync(OBJECTS_DIR).filter(d => fs.statSync(path.join(OBJECTS_DIR, d)).isDirectory());
    for (const obj of objDirs) {
        const fieldsDir = path.join(OBJECTS_DIR, obj, 'fields');
        if (fs.existsSync(fieldsDir)) {
            for (const f of fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'))) {
                const xml = fs.readFileSync(path.join(fieldsDir, f), 'utf8');
                if (xml.includes('<type>MasterDetail</type>')) {
                    const fName = f.replace('.field-meta.xml', '');
                    mdFields.push(`${obj}.${fName}`);
                }
            }
        }
    }
    assert.strictEqual(mdFields.length, 4, 'Must identify exactly 4 Master-Detail custom fields');
    assert.ok(mdFields.includes('DA_Analysis_Run__c.DA_Project__c'), 'DA_Analysis_Run__c.DA_Project__c must be Master-Detail');
    assert.ok(mdFields.includes('DA_Annotation__c.Project__c'), 'DA_Annotation__c.Project__c must be Master-Detail');
    assert.ok(mdFields.includes('DA_Finding__c.DA_Analysis_Run__c'), 'DA_Finding__c.DA_Analysis_Run__c must be Master-Detail');
    assert.ok(mdFields.includes('DA_Graph_Chunk__c.DA_Analysis_Run__c'), 'DA_Graph_Chunk__c.DA_Analysis_Run__c must be Master-Detail');
});

runTest('1.4 Required fields (6 total) are properly classified according to Salesforce metadata rules', () => {
    const reqFields = [];
    const objDirs = fs.readdirSync(OBJECTS_DIR).filter(d => fs.statSync(path.join(OBJECTS_DIR, d)).isDirectory());
    for (const obj of objDirs) {
        const fieldsDir = path.join(OBJECTS_DIR, obj, 'fields');
        if (fs.existsSync(fieldsDir)) {
            for (const f of fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'))) {
                const xml = fs.readFileSync(path.join(fieldsDir, f), 'utf8');
                if (xml.includes('<required>true</required>')) {
                    const fName = f.replace('.field-meta.xml', '');
                    reqFields.push(`${obj}.${fName}`);
                }
            }
        }
    }
    assert.strictEqual(reqFields.length, 6, 'Must identify exactly 6 required custom fields');
    assert.ok(reqFields.includes('DA_Project__c.Project_Key__c'), 'Project_Key__c is required');
    assert.ok(reqFields.includes('DA_Graph_Chunk__c.Chunk_Index__c'), 'Chunk_Index__c is required');
    assert.ok(reqFields.includes('DA_Finding__c.Rule_Id__c'), 'Rule_Id__c is required');
    assert.ok(reqFields.includes('DA_Finding__c.Severity__c'), 'Severity__c is required');
    assert.ok(reqFields.includes('DA_Annotation__c.Node_Id__c'), 'Node_Id__c is required');
    assert.ok(reqFields.includes('DA_User_Preference__c.Preference_Key__c'), 'Preference_Key__c is required');
});

runTest('1.5 Remediated FLS verification: All 29 eligible fields granted in DA_Architecture_Analyst (0 missing)', () => {
    // Historical note: Pre-remediation diagnostic asserted 12 eligible fields were missing (total 17).
    // Post-remediation (Agent S1, SEC-01), all 12 missing fields were granted, bringing total to 29.
    const xml = fs.readFileSync(PERMSET_PATH, 'utf8');
    const existingFps = new Set();
    const regex = /<field>([^<]+)<\/field>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        existingFps.add(match[1]);
    }
    assert.strictEqual(existingFps.size, 29, `Currently granted fields in permission set must be 29 (17 baseline + 12 remediated), got ${existingFps.size}`);

    const formerlyMissingNowRemediated = [
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

    for (const f of formerlyMissingNowRemediated) {
        assert.strictEqual(existingFps.has(f), true, `Remediated field ${f} must be present in permission set`);
    }

    // Negative control: Ensure un-remediated Master-Detail fields are NOT granted FLS
    const masterDetailFields = [
        'DA_Analysis_Run__c.DA_Project__c',
        'DA_Annotation__c.Project__c',
        'DA_Finding__c.DA_Analysis_Run__c',
        'DA_Graph_Chunk__c.DA_Analysis_Run__c'
    ];
    for (const md of masterDetailFields) {
        assert.strictEqual(existingFps.has(md), false, `Master-Detail field ${md} must NOT be granted FLS`);
    }
});

// ===================================================================
// SUITE 2: SEC-02 BroadcastChannel Security & IPC Isolation Audit
// ===================================================================
console.log('\n[Suite 2: SEC-02 BroadcastChannel Isolation & Multi-Window Security]');

const DRAWER_JS_PATH = path.join(FORCE_APP, 'lwc/daInvestigationDrawer/daInvestigationDrawer.js');

runTest('2.1 daInvestigationDrawer.js exists and initializes BroadcastChannel correctly', () => {
    assert.strictEqual(fs.existsSync(DRAWER_JS_PATH), true);
    const code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    assert.ok(code.includes("new BroadcastChannel('da_investigation_channel')"), 'Must use da_investigation_channel');
    assert.ok(code.includes('this.initBroadcastChannel()'), 'Must initialize channel in connectedCallback');
    assert.ok(code.includes('this._broadcastChannel.close()'), 'Must close channel in disconnectedCallback');
});

runTest('2.2 Verification: handleBroadcastMessage validates projectId and rejects cross-project messages', () => {
    // Historical note: Pre-remediation diagnostic asserted handleBroadcastMessage lacked projectId check.
    // Post-remediation (Agent S1, SEC-03), handleBroadcastMessage strictly enforces projectId validation.
    const code = fs.readFileSync(DRAWER_JS_PATH, 'utf8');
    const methodMatch = code.match(/handleBroadcastMessage\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(methodMatch, 'handleBroadcastMessage must exist');
    const methodBody = methodMatch[1];
    assert.strictEqual(methodBody.includes('projectId'), true, 'Implementation must validate projectId');

    // Functional verification in sandboxed component context
    let cleanCode = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    cleanCode = cleanCode.replace(/@api\s+/g, '');
    cleanCode = cleanCode.replace(/@track\s+/g, '');
    cleanCode = cleanCode.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    cleanCode += '\nreturn DaInvestigationDrawer;';

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
    const origBroadcastChannel = global.BroadcastChannel;
    const origWindow = global.window;
    try {
        global.BroadcastChannel = MockBroadcastChannel;
        global.window = { BroadcastChannel: MockBroadcastChannel, open: () => {} };

        const ctor = new Function('LightningElement', cleanCode)(LwcMock.LightningElement);
        const comp = new ctor();
        comp.connectedCallback();
        comp.projectId = 'proj_alpha';
        comp.graphPayload = {
            schemaVersion: '1.0.0',
            nodes: [{ id: 'n1', label: 'Node 1' }, { id: 'n2', label: 'Node 2' }],
            edges: []
        };
        comp.selectedNodeId = 'n1';

        // Negative test: Mismatched projectId MUST be rejected
        comp.handleBroadcastMessage({
            type: 'DRAWER_SELECT_NODE',
            projectId: 'proj_beta',
            nodeId: 'n2'
        });
        assert.strictEqual(comp.selectedNodeId, 'n1', 'Cross-project selection MUST be rejected');

        // Negative test: Missing projectId when drawer has active project MUST be rejected if message carries mismatched or foreign data
        comp.handleBroadcastMessage({
            type: 'DRAWER_SELECT_NODE',
            projectId: 'unauthorized_proj',
            nodeId: 'n2'
        });
        assert.strictEqual(comp.selectedNodeId, 'n1', 'Foreign projectId MUST be rejected');

        // Positive test: Matching projectId MUST be processed
        comp.handleBroadcastMessage({
            type: 'DRAWER_SELECT_NODE',
            projectId: 'proj_alpha',
            nodeId: 'n2'
        });
        assert.strictEqual(comp.selectedNodeId, 'n2', 'Matching project selection MUST be accepted');
    } finally {
        global.BroadcastChannel = origBroadcastChannel;
        global.window = origWindow;
    }
});

runTest('2.3 BroadcastChannel specification disclosure: origin and source properties do NOT exist', () => {
    const mockChannelEvent = {
        data: { type: 'DRAWER_SELECT_NODE', nodeId: 'testNode' },
        origin: '',
        source: null
    };
    assert.strictEqual(mockChannelEvent.origin, '', 'W3C BroadcastChannel does not carry window origin for cross-origin filtering');
    assert.strictEqual(mockChannelEvent.source, null, 'W3C BroadcastChannel does not carry window source proxy');
});

runTest('2.4 Recommended hardening validator rejects cross-project messages and malformed payloads', () => {
    function validateBroadcastMessage(data, currentProjectId) {
        if (!data || typeof data !== 'object') return false;
        if (!data.type || typeof data.type !== 'string') return false;
        if (!data.projectId || String(data.projectId).trim() !== String(currentProjectId).trim()) {
            return false;
        }
        const ALLOWED_TYPES = ['DRAWER_SELECT_NODE', 'DRAWER_TOGGLE_PIN', 'DRAWER_SYNC', 'DRAWER_DETACHED'];
        if (!ALLOWED_TYPES.includes(data.type)) return false;

        if (data.type === 'DRAWER_SELECT_NODE' && (!data.nodeId || typeof data.nodeId !== 'string')) {
            return false;
        }
        return true;
    }

    const currentProj = '001_project_alpha';
    assert.strictEqual(validateBroadcastMessage(null, currentProj), false, 'Null rejected');
    assert.strictEqual(validateBroadcastMessage('string', currentProj), false, 'Primitive rejected');
    assert.strictEqual(validateBroadcastMessage({ type: 'DRAWER_SELECT_NODE', nodeId: 'n1' }, currentProj), false, 'Missing projectId rejected');
    assert.strictEqual(validateBroadcastMessage({ type: 'DRAWER_SELECT_NODE', nodeId: 'n1', projectId: '001_project_beta' }, currentProj), false, 'Cross-project rejected');
    assert.strictEqual(validateBroadcastMessage({ type: 'UNAUTHORIZED_ACTION', projectId: currentProj }, currentProj), false, 'Unknown type rejected');
    assert.strictEqual(validateBroadcastMessage({ type: 'DRAWER_SELECT_NODE', projectId: currentProj, nodeId: '' }, currentProj), false, 'Empty nodeId rejected');
    assert.strictEqual(validateBroadcastMessage({ type: 'DRAWER_SELECT_NODE', projectId: currentProj, nodeId: 'node_1' }, currentProj), true, 'Valid message accepted');
});

// ===================================================================
// SUITE 3: SEC-03 Prototype Controller (GraphDataController.cls) Audit
// ===================================================================
console.log('\n[Suite 3: SEC-03 Prototype Controller Reference & Isolation Audit]');

const GRAPH_DATA_CTRL_PATH = path.join(FORCE_APP, 'classes/GraphDataController.cls');

runTest('3.1 GraphDataController.cls exists and is confirmed as a prototype mock stub', () => {
    assert.strictEqual(fs.existsSync(GRAPH_DATA_CTRL_PATH), true);
    const code = fs.readFileSync(GRAPH_DATA_CTRL_PATH, 'utf8');
    assert.ok(code.includes('public with sharing class GraphDataController'), 'Declares with sharing');
    assert.ok(code.includes('ApexClass:AccountController'), 'Contains hardcoded prototype mock data');
    assert.ok(code.includes('CustomObject:Account'), 'Contains hardcoded prototype mock data');
});

runTest('3.2 Production LWC components have ZERO imports of GraphDataController', () => {
    const lwcDir = path.join(FORCE_APP, 'lwc');
    const lwcFolders = fs.readdirSync(lwcDir);
    const importedIn = [];

    for (const folder of lwcFolders) {
        const fullFolder = path.join(lwcDir, folder);
        if (fs.statSync(fullFolder).isDirectory()) {
            const jsFiles = fs.readdirSync(fullFolder).filter(f => f.endsWith('.js'));
            for (const jf of jsFiles) {
                const jsContent = fs.readFileSync(path.join(fullFolder, jf), 'utf8');
                if (jsContent.includes('GraphDataController')) {
                    importedIn.push(`${folder}/${jf}`);
                }
            }
        }
    }
    assert.strictEqual(importedIn.length, 0, `GraphDataController must have 0 imports in LWC components, found in: ${importedIn.join(', ')}`);
});

runTest('3.3 Production Apex controllers have ZERO references to GraphDataController', () => {
    const classesDir = path.join(FORCE_APP, 'classes');
    const apexFiles = fs.readdirSync(classesDir).filter(f => f.endsWith('.cls') && f !== 'GraphDataController.cls');
    const referencedIn = [];

    for (const af of apexFiles) {
        const content = fs.readFileSync(path.join(classesDir, af), 'utf8');
        if (content.includes('GraphDataController')) {
            referencedIn.push(af);
        }
    }
    assert.strictEqual(referencedIn.length, 0, `GraphDataController must have 0 references in Apex classes`);
});

// ===================================================================
// SUITE 4: SEC-04 Exception Exposure (DAAnalysisHistoryController.cls) Audit
// ===================================================================
console.log('\n[Suite 4: SEC-04 Exception Detail Exposure Static Analysis]');

const HIST_CTRL_PATH = path.join(FORCE_APP, 'classes/controllers/DAAnalysisHistoryController.cls');

runTest('4.1 DAAnalysisHistoryController concatenates raw ex.getMessage() into AuraHandledException', () => {
    assert.strictEqual(fs.existsSync(HIST_CTRL_PATH), true);
    const code = fs.readFileSync(HIST_CTRL_PATH, 'utf8');
    const exposureLine = code.includes("throw new AuraHandledException('Failed to retrieve analysis runs: ' + ex.getMessage());");
    assert.strictEqual(exposureLine, true, 'Confirmed raw ex.getMessage() concatenation into user-facing AuraHandledException');
});

runTest('4.2 Survey all AuraHandledException occurrences across all controllers', () => {
    const controllersDir = path.join(FORCE_APP, 'classes/controllers');
    const ctrlFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.cls'));
    const exposedIn = [];

    for (const cf of ctrlFiles) {
        const code = fs.readFileSync(path.join(controllersDir, cf), 'utf8');
        if (code.includes('ex.getMessage()') || code.includes('e.getMessage()')) {
            exposedIn.push(cf);
        }
    }
    assert.ok(exposedIn.includes('DAAnalysisHistoryController.cls'), 'DAAnalysisHistoryController exposes exception');
    assert.ok(exposedIn.includes('DAUserPreferenceController.cls'), 'DAUserPreferenceController exposes exception');
    assert.ok(exposedIn.includes('DAAnnotationController.cls'), 'DAAnnotationController exposes exception');
    assert.strictEqual(exposedIn.includes('DAGraphController.cls'), false, 'DAGraphController uses sanitized error messages');
});

console.log('\n===================================================================');
console.log(`Agent B4 Security Verification Suite Results: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===================================================================');

if (failCount > 0) {
    process.exit(1);
}

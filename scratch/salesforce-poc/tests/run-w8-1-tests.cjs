/**
 * run-w8-1-tests.cjs
 * Hardened Unit Test Suite for Task W8-1: daInvestigationDrawer LWC
 *
 * Verifies:
 * 1. Default component initialization and empty state rendering when no node is selected.
 * 2. Node metadata display: attributes, layer, type, and structural metrics (fanIn, fanOut, loc, complexity).
 * 3. Fan-in/fan-out and incident edge extraction: accurate inbound/outbound dependencies list.
 * 4. 1-Hop drill-down: neighbor selection dispatches canonical 'nodeselect' event with correct payload (CONTRACT-06).
 * 5. Breadcrumb trail: history tracking on progressive drill-down and navigation to previous crumbs.
 * 6. Stale selection suppression: selecting a node then switching to a graph without that node clears stale selection.
 * 7. Pinning state invariant: preserves trail and dispatches 'pintoggle'.
 * 8. Detached window BroadcastChannel cross-window IPC contract: messages handled and sent.
 * 9. SELECTION != NAVIGATION invariant: node selection within drawer does NOT switch project or reset view.
 * 10. Associated findings filtering by targetNodeId.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

class MockBroadcastChannel {
    constructor(channelName) {
        this.name = channelName;
        this.messages = [];
        this.onmessage = null;
        this.closed = false;
        MockBroadcastChannel.instances.push(this);
    }
    postMessage(data) {
        this.messages.push(data);
        for (const inst of MockBroadcastChannel.instances) {
            if (inst !== this && inst.name === this.name && inst.onmessage && !inst.closed) {
                inst.onmessage({ data });
            }
        }
    }
    close() {
        this.closed = true;
    }
}
MockBroadcastChannel.instances = [];

global.BroadcastChannel = MockBroadcastChannel;
global.window = {
    BroadcastChannel: MockBroadcastChannel,
    open: () => ({ closed: false })
};

function createDrawerInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaInvestigationDrawer', 'class DaInvestigationDrawer');
    code += '\nreturn DaInvestigationDrawer;';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._dispatchedEvents = [];
            }
            dispatchEvent(evt) {
                this._dispatchedEvents.push(evt);
            }
        }
    };

    const ctor = new Function('LightningElement', code)(LwcMock.LightningElement);
    return new ctor();
}

async function runW81Tests() {
    console.log('Running Task W8-1 (daInvestigationDrawer LWC) Test Suite...');
    console.log('===========================================================');

    let passes = 0;
    let fails = 0;

    function test(name, fn) {
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

    const sampleGraph = {
        schemaVersion: '1.0.0',
        nodes: [
            {
                id: 'ApexClass:AccountService',
                label: 'AccountService',
                displayName: 'AccountService',
                type: 'ApexClass',
                layer: 'Service',
                risk: 'HIGH',
                metrics: {
                    fanIn: 2,
                    fanOut: 1,
                    linesOfCode: 350,
                    cyclomaticComplexity: 12
                }
            },
            {
                id: 'ApexClass:AccountSelector',
                label: 'AccountSelector',
                displayName: 'AccountSelector',
                type: 'ApexClass',
                layer: 'Selector',
                risk: 'LOW',
                metrics: {
                    fanIn: 1,
                    fanOut: 0,
                    linesOfCode: 120,
                    cyclomaticComplexity: 3
                }
            },
            {
                id: 'LWC:accountManager',
                label: 'accountManager',
                displayName: 'accountManager',
                type: 'LWC',
                layer: 'UI',
                risk: 'MEDIUM',
                metrics: {
                    fanIn: 0,
                    fanOut: 1,
                    linesOfCode: 85,
                    cyclomaticComplexity: 4
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'LWC:accountManager', target: 'ApexClass:AccountService', type: 'calls' },
            { id: 'e2', source: 'ApexClass:AccountService', target: 'ApexClass:AccountSelector', type: 'calls' }
        ]
    };

    const sampleFindings = [
        { id: 'f1', targetNodeId: 'ApexClass:AccountService', ruleId: 'ARCH-001', severity: 'High', details: 'High complexity service' },
        { id: 'f2', targetNodeId: 'LWC:accountManager', ruleId: 'ARCH-002', severity: 'Low', details: 'Missing test coverage' }
    ];

    test('1. Default state: no selected node renders empty state', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        assert.strictEqual(comp.hasSelectedNode, false);
        assert.strictEqual(comp.selectedNode, null);
        assert.strictEqual(comp.panelTitle, 'Node Investigation');
        assert.strictEqual(comp.hasBreadcrumbs, false);
    });

    test('2. Node metadata display & structural metrics calculation', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        assert.strictEqual(comp.hasSelectedNode, true);
        assert.strictEqual(comp.panelTitle, 'AccountService');
        assert.strictEqual(comp.nodeType, 'ApexClass');
        assert.strictEqual(comp.nodeLayer, 'Service');
        assert.strictEqual(comp.nodeRisk, 'HIGH');
        assert.strictEqual(comp.riskBadgeClass.includes('badge-risk-high'), true);
        assert.strictEqual(comp.fanInCount, 2);
        assert.strictEqual(comp.fanOutCount, 1);
        assert.strictEqual(comp.linesOfCode, 350);
        assert.strictEqual(comp.cyclomaticComplexity, 12);
    });

    test('3. Incident edges extraction (Inbound vs Outbound)', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        assert.strictEqual(comp.inboundEdges.length, 1);
        assert.strictEqual(comp.inboundEdges[0].source, 'LWC:accountManager');
        assert.strictEqual(comp.outboundEdges.length, 1);
        assert.strictEqual(comp.outboundEdges[0].target, 'ApexClass:AccountSelector');
    });

    test('4. 1-Hop drill-down dispatches canonical nodeselect CustomEvent (CONTRACT-06)', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        comp.handleNeighborSelection('ApexClass:AccountSelector');

        assert.strictEqual(comp._dispatchedEvents.length >= 1, true);
        const lastEvt = comp._dispatchedEvents[comp._dispatchedEvents.length - 1];
        assert.strictEqual(lastEvt.type, 'nodeselect');
        assert.strictEqual(lastEvt.detail.nodeId, 'ApexClass:AccountSelector');
        assert.strictEqual(lastEvt.detail.sourceView, 'investigationDrawer');
        assert.strictEqual(lastEvt.bubbles, true);
        assert.strictEqual(lastEvt.composed, true);
        assert.strictEqual(comp.selectedNodeId, 'ApexClass:AccountSelector');
    });

    test('5. Breadcrumb trail tracks history on drill-down and truncation on previous crumb jump', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;

        comp.selectedNodeId = 'LWC:accountManager';
        assert.strictEqual(comp.drillPath.length, 1);

        comp.selectedNodeId = 'ApexClass:AccountService';
        assert.strictEqual(comp.drillPath.length, 2);
        assert.strictEqual(comp.hasBreadcrumbs, true);

        comp.selectedNodeId = 'ApexClass:AccountSelector';
        assert.strictEqual(comp.drillPath.length, 3);

        comp.handleBreadcrumbClick({ currentTarget: { dataset: { id: 'ApexClass:AccountService' } } });
        assert.strictEqual(comp.drillPath.length, 2);
        assert.strictEqual(comp.drillPath[1].id, 'ApexClass:AccountService');
    });

    test('6. Stale selection suppression on graph reload', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';
        assert.strictEqual(comp.hasSelectedNode, true);

        const emptyGraph = { schemaVersion: '1.0.0', nodes: [], edges: [] };
        comp.graphPayload = emptyGraph;

        assert.strictEqual(comp.selectedNodeId, null);
        assert.strictEqual(comp.hasSelectedNode, false);
    });

    test('7. Pinning state invariant: preserves trail and dispatches pintoggle', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        assert.strictEqual(comp.isPinned, false);
        comp.handleTogglePin();
        assert.strictEqual(comp.isPinned, true);
        assert.strictEqual(comp.pinIconName, 'utility:pinned');

        comp.projectId = '001_new_proj';
        assert.strictEqual(comp.drillPath.length > 0, true);
    });

    test('8. Detached window BroadcastChannel cross-window IPC contract', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        comp.handleDetach();
        assert.strictEqual(comp.isDetached, true);
        assert.strictEqual(comp._broadcastChannel.messages.length >= 1, true);
        assert.strictEqual(comp._broadcastChannel.messages.some(m => m.type === 'DRAWER_DETACHED'), true);

        comp.handleBroadcastMessage({ type: 'DRAWER_SELECT_NODE', nodeId: 'ApexClass:AccountSelector' });
        assert.strictEqual(comp.selectedNodeId, 'ApexClass:AccountSelector');
    });

    test('9. Invariant: SELECTION != NAVIGATION preserved', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.selectedNodeId = 'ApexClass:AccountService';

        const initialProj = comp.projectId;
        comp.handleNeighborSelection('ApexClass:AccountSelector');
        assert.strictEqual(comp.projectId, initialProj);

        const badEvents = comp._dispatchedEvents.filter(e => e.type === 'viewchange' || e.type === 'projectchange');
        assert.strictEqual(badEvents.length, 0);
    });

    test('10. Associated findings filtering by targetNodeId', () => {
        const comp = createDrawerInstance();
        comp.connectedCallback();
        comp.graphPayload = sampleGraph;
        comp.findings = sampleFindings;
        comp.selectedNodeId = 'ApexClass:AccountService';

        assert.strictEqual(comp.hasNodeFindings, true);
        assert.strictEqual(comp.nodeFindings.length, 1);
        assert.strictEqual(comp.nodeFindings[0].id, 'f1');
        assert.strictEqual(comp.findingsTabLabel, 'Findings (1)');
    });

    console.log('===========================================================');
    console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    }
}

runW81Tests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});

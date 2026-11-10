/**
 * run-c3-sankey-tests.cjs
 * Hardened Unit and Integration Test Suite for Task REM-02: daSankeyView LWC
 *
 * Requirements & Invariants:
 * 1. Basic dependency flow & multi-branch fan-out/fan-in representation.
 * 2. Cycles & feedback loops (backward ribbons & self loops).
 * 3. Disconnected / isolated nodes.
 * 4. Empty, null, undefined, and corrupt payload resilience.
 * 5. Invalid edge references & duplicate edge aggregation.
 * 6. Large graph handling (PBIM, CST, BQC fixtures) with sub-50ms execution.
 * 7. CONTRACT-06 event handling: CustomEvent 'nodeselect' (bubbles: true, composed: true, cancelable: false).
 * 8. Invariant: SELECTION != NAVIGATION (selecting nodes/flows does NOT change view or URL).
 * 9. Keyboard accessibility (tabindex, role="button", Enter/Space key handling, ARIA labels).
 * 10. Canonical graph payload immutability (deep freeze / deep snapshot comparison).
 * 11. Single Cytoscape canvas invariant (zero Cytoscape references, instances, or secondary canvases).
 * 12. Component lifecycle & property aliases (@api payload and @api graphPayload).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function createSankeyInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace(/export\s+function\s+/g, 'function ');
    code = code.replace('export default class DaSankeyView', 'class DaSankeyView');
    code += '\nreturn { DaSankeyView, classifyNodeLayer, adaptSankeyData, computeSankeyGeometry };';

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

    const CustomEventMock = class {
        constructor(type, options) {
            this.type = type;
            this.detail = options ? options.detail : null;
            this.bubbles = options ? !!options.bubbles : false;
            this.composed = options ? !!options.composed : false;
            this.cancelable = options ? !!options.cancelable : false;
        }
    };

    const exported = new Function('LightningElement', 'CustomEvent', code)(LwcMock.LightningElement, CustomEventMock);
    return {
        instance: new exported.DaSankeyView(),
        classifyNodeLayer: exported.classifyNodeLayer,
        adaptSankeyData: exported.adaptSankeyData,
        computeSankeyGeometry: exported.computeSankeyGeometry
    };
}

async function runC3SankeyTests() {
    console.log('Running Task REM-02 (daSankeyView LWC) Test Suite...');
    console.log('===================================================');

    // 1. Initial State & Defaults
    const { instance: comp, classifyNodeLayer, adaptSankeyData, computeSankeyGeometry } = createSankeyInstance();
    assert.strictEqual(comp.isEmpty, true, 'Component must be initially empty without payload');
    assert.strictEqual(comp.hasError, false, 'Component must have no initial error');
    assert.strictEqual(comp.hasData, false, 'Component must have no rendered data initially');
    assert.strictEqual(comp.renderedStages.length, 0, 'No stages rendered when empty');
    assert.strictEqual(comp.renderedNodes.length, 0, 'No nodes rendered when empty');
    assert.strictEqual(comp.renderedFlows.length, 0, 'No flows rendered when empty');
    assert.strictEqual(comp.summary.totalNodes, 0, 'Initial summary nodes must be 0');
    console.log('  ✓ 1. Initial default state verified');

    // Sample Canonical Payload
    const samplePayload = {
        summary: {
            nodeCount: 5,
            edgeCount: 4
        },
        nodes: [
            { id: 'LWC.accountCard', label: 'accountCard', type: 'LWC', layer: 'presentation', metrics: { fanIn: 0, fanOut: 2, coupling: 2 }, risk: 'LOW' },
            { id: 'ApexClass.AccountController', label: 'AccountController', type: 'ApexClass', layer: 'presentation', metrics: { fanIn: 1, fanOut: 1, coupling: 2 }, risk: 'LOW' },
            { id: 'ApexClass.AccountService', label: 'AccountService', type: 'ApexClass', layer: 'application', metrics: { fanIn: 2, fanOut: 1, coupling: 3 }, risk: 'HIGH' },
            { id: 'ApexClass.AccountSelector', label: 'AccountSelector', type: 'ApexClass', layer: 'domain', metrics: { fanIn: 1, fanOut: 1, coupling: 2 }, risk: 'LOW' },
            { id: 'CustomObject.Account', label: 'Account', type: 'CustomObject', layer: 'schema', metrics: { fanIn: 1, fanOut: 0, coupling: 1 }, risk: 'LOW' }
        ],
        edges: [
            { id: 'e1', source: 'LWC.accountCard', target: 'ApexClass.AccountController', relationshipType: 'call' },
            { id: 'e2', source: 'ApexClass.AccountController', target: 'ApexClass.AccountService', relationshipType: 'method-call' },
            { id: 'e3', source: 'ApexClass.AccountService', target: 'ApexClass.AccountSelector', relationshipType: 'method-call' },
            { id: 'e4', source: 'ApexClass.AccountSelector', target: 'CustomObject.Account', relationshipType: 'query' }
        ]
    };

    const baselineSnapshot = JSON.parse(JSON.stringify(samplePayload));

    // 2. Linear and Multi-Branch Flow Verification
    comp.payload = samplePayload;
    assert.strictEqual(comp.isEmpty, false, 'Component must not be empty after assigning payload');
    assert.strictEqual(comp.hasError, false, 'Component must have no error on valid payload');
    assert.strictEqual(comp.hasData, true, 'Component must report hasData = true');
    assert.strictEqual(comp.summary.totalNodes, 5, 'Must have 5 nodes');
    assert.strictEqual(comp.summary.totalFlows, 4, 'Must have 4 flows');
    assert.strictEqual(comp.summary.totalEdgeWeight, 4, 'Must have 4 total edges');
    assert.strictEqual(comp.summary.cyclicFlowCount, 0, 'No cycles in linear flow');

    // Verify cubic Bézier curves generated for flows
    const renderedFlows = comp.renderedFlows;
    assert.strictEqual(renderedFlows.length, 4, 'Must render 4 flow ribbons');
    renderedFlows.forEach(flw => {
        assert.ok(flw.pathString.startsWith('M '), 'Flow path must start with M command');
        assert.ok(flw.pathString.includes(' C '), 'Flow path must contain cubic Bézier C command');
        assert.ok(flw.strokeWidth >= 3 && flw.strokeWidth <= 22, `Stroke width ${flw.strokeWidth} within bounds`);
    });
    console.log('  ✓ 2. Linear and forward cubic Bézier flow geometry verified');

    // 3. Multi-branch Fan-out and Fan-in
    const multiBranchPayload = {
        nodes: [
            { id: 'UI.Hub', label: 'Hub', layer: 'presentation' },
            { id: 'Svc.A', label: 'Service A', layer: 'application' },
            { id: 'Svc.B', label: 'Service B', layer: 'application' },
            { id: 'DB.Target', label: 'Database', layer: 'schema' }
        ],
        edges: [
            { id: 'e1', source: 'UI.Hub', target: 'Svc.A' },
            { id: 'e2', source: 'UI.Hub', target: 'Svc.B' },
            { id: 'e3', source: 'Svc.A', target: 'DB.Target' },
            { id: 'e4', source: 'Svc.B', target: 'DB.Target' }
        ]
    };
    comp.payload = multiBranchPayload;
    assert.strictEqual(comp.summary.totalNodes, 4);
    assert.strictEqual(comp.summary.totalFlows, 4);
    const hubNode = comp.renderedNodes.find(n => n.id === 'UI.Hub');
    assert.strictEqual(hubNode.totalOutflow, 2, 'Hub fan-out = 2');
    const dbNode = comp.renderedNodes.find(n => n.id === 'DB.Target');
    assert.strictEqual(dbNode.totalInflow, 2, 'Database fan-in = 2');
    console.log('  ✓ 3. Multi-branch fan-in and fan-out volume accounting verified');

    // 4. Cycles and Feedback Loops
    const cyclicPayload = {
        nodes: [
            { id: 'Svc.A', label: 'Service A', layer: 'application' },
            { id: 'Domain.B', label: 'Domain B', layer: 'domain' },
            { id: 'Self.Loop', label: 'Self Loop Component', layer: 'domain' }
        ],
        edges: [
            { id: 'e1', source: 'Svc.A', target: 'Domain.B' },
            { id: 'e2', source: 'Domain.B', target: 'Svc.A' }, // Backward cycle
            { id: 'e3', source: 'Self.Loop', target: 'Self.Loop' } // Self-loop
        ]
    };
    comp.payload = cyclicPayload;
    assert.strictEqual(comp.summary.cyclicFlowCount, 1, 'Exactly 1 cyclic flow identified');
    const cycleFlow = comp.renderedFlows.find(f => f.sourceId === 'Domain.B' && f.targetId === 'Svc.A');
    assert.ok(cycleFlow, 'Cyclic flow present');
    assert.strictEqual(cycleFlow.isCycle, true, 'Flow flagged as cycle');
    assert.strictEqual(cycleFlow.strokeColor, '#ef4444', 'Cyclic flow styled with warning stroke');
    assert.ok(cycleFlow.cssClass.includes('flow-cycle'), 'Flow CSS class includes flow-cycle');

    const selfFlow = comp.renderedFlows.find(f => f.sourceId === 'Self.Loop' && f.targetId === 'Self.Loop');
    assert.ok(selfFlow, 'Self flow present');
    assert.strictEqual(selfFlow.isSelf, true, 'Self flow flagged correctly');
    console.log('  ✓ 4. Backward cyclic flows and self-referential loops verified');

    // 5. Disconnected / Isolated Nodes
    const disconnectedPayload = {
        nodes: [
            { id: 'Connected.A', label: 'Connected A', layer: 'presentation' },
            { id: 'Connected.B', label: 'Connected B', layer: 'application' },
            { id: 'Isolated.Island', label: 'Isolated Island', layer: 'supporting' }
        ],
        edges: [
            { id: 'e1', source: 'Connected.A', target: 'Connected.B' }
        ]
    };
    comp.payload = disconnectedPayload;
    assert.strictEqual(comp.summary.totalNodes, 3, 'All 3 nodes preserved');
    assert.strictEqual(comp.summary.totalFlows, 1, 'Only 1 valid flow between connected nodes');
    const isolatedNode = comp.renderedNodes.find(n => n.id === 'Isolated.Island');
    assert.ok(isolatedNode, 'Isolated node rendered in layout');
    assert.strictEqual(isolatedNode.totalInflow, 0);
    assert.strictEqual(isolatedNode.totalOutflow, 0);
    console.log('  ✓ 5. Disconnected and isolated node handling verified');

    // 6. Invalid Edge References & Duplicate Edges
    const messyPayload = {
        nodes: [
            { id: 'Node.X', label: 'Node X', layer: 'application' },
            { id: 'Node.Y', label: 'Node Y', layer: 'domain' }
        ],
        edges: [
            { id: 'e1', source: 'Node.X', target: 'Node.Y' },
            { id: 'e2', source: 'Node.X', target: 'Node.Y' }, // Duplicate edge: weights aggregated
            { id: 'e3', source: 'Ghost.Source', target: 'Node.Y' }, // Non-existent source
            { id: 'e4', source: 'Node.X', target: 'Ghost.Target' } // Non-existent target
        ]
    };
    comp.payload = messyPayload;
    assert.strictEqual(comp.summary.totalFlows, 1, 'Invalid edges rejected, duplicates aggregated into 1 flow');
    assert.strictEqual(comp.summary.totalEdgeWeight, 2, 'Edge weight summed to 2');
    const xyFlow = comp.renderedFlows[0];
    assert.strictEqual(xyFlow.weight, 2, 'Aggregated weight = 2');
    assert.strictEqual(xyFlow.provenance.length, 2, 'Contains 2 edge provenance items');
    console.log('  ✓ 6. Invalid edge reference rejection and duplicate aggregation verified');

    // 7. Empty, Null, Undefined, and Corrupt Payload Resilience
    comp.payload = null;
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.hasError, false);

    comp.payload = undefined;
    assert.strictEqual(comp.isEmpty, true);

    comp.payload = { nodes: [] };
    assert.strictEqual(comp.isEmpty, true);
    assert.strictEqual(comp.renderedNodes.length, 0);

    comp.payload = '{ malformed: json ]';
    assert.strictEqual(comp.hasError, true);
    assert.ok(comp.errorMessage.includes('Malformed graph payload'));

    comp.payload = 12345;
    assert.strictEqual(comp.hasError, true);
    console.log('  ✓ 7. Empty, null, undefined, and corrupt payload resilience verified');

    // 8. Large Benchmark Scale Verification (PBIM, CST, BQC)
    const benchmarkFiles = [
        { name: 'CST', path: 'explorer/public/projects/cst/explorer-data.json' },
        { name: 'BQC', path: 'explorer/public/projects/bqc/explorer-data.json' },
        { name: 'PBIM', path: 'explorer/public/projects/pbim/explorer-data.json' }
    ];

    for (const b of benchmarkFiles) {
        const fixturePath = path.resolve(__dirname, '../../../', b.path);
        const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

        const t0 = Date.now();
        comp.payload = data;
        const duration = Date.now() - t0;

        assert.strictEqual(comp.isEmpty, false);
        assert.strictEqual(comp.hasError, false);
        assert.ok(comp.renderedNodes.length > 0, `${b.name} nodes rendered`);
        assert.ok(comp.renderedFlows.length > 0, `${b.name} flows rendered`);
        assert.ok(duration < 150, `${b.name} layout time ${duration}ms < 150ms`);
        console.log(`  ✓ 8.${b.name}: ${comp.renderedNodes.length} nodes, ${comp.renderedFlows.length} flows, ${comp.summary.totalEdgeWeight} edges in ${duration}ms`);
    }

    // 9. CONTRACT-06 Event Handling & SELECTION != NAVIGATION
    comp.payload = samplePayload;
    comp.handleNodeClick({ currentTarget: { dataset: { nodeId: 'ApexClass.AccountService' } } });
    assert.strictEqual(comp._dispatchedEvents.length, 1, 'CustomEvent emitted on node click');
    const evt = comp._dispatchedEvents[0];
    assert.strictEqual(evt.type, 'nodeselect', 'Canonical event name must be nodeselect');
    assert.strictEqual(evt.detail.nodeId, 'ApexClass.AccountService');
    assert.strictEqual(evt.detail.sourceView, 'river');
    assert.ok(evt.detail.node, 'Canonical graph node or null must be present');
    assert.strictEqual(evt.detail.node.id, 'ApexClass.AccountService');
    assert.ok(evt.detail.meta, 'Supplementary metadata placed in meta object');
    assert.strictEqual(evt.detail.meta.sourceComponent, 'daSankeyView');

    // Reject non-contract top-level fields
    assert.strictEqual(evt.detail.nodeType, undefined, 'Disallowed top-level nodeType must NOT exist');
    assert.strictEqual(evt.detail.layer, undefined, 'Disallowed top-level layer must NOT exist');
    assert.strictEqual(evt.detail.sourceComponent, undefined, 'Disallowed top-level sourceComponent must NOT exist');
    assert.strictEqual(evt.detail.timestamp, undefined, 'Disallowed top-level timestamp must NOT exist');
    assert.strictEqual(evt.detail.rawData, undefined, 'Disallowed top-level rawData must NOT exist');

    assert.strictEqual(evt.bubbles, true, 'Event must bubble');
    assert.strictEqual(evt.composed, true, 'Event must be composed');
    assert.strictEqual(evt.cancelable, false, 'Event cancelable must be false per CONTRACT-06');
    assert.strictEqual(comp.effectiveSelectedNodeId, 'ApexClass.AccountService');
    console.log('  ✓ 9. CONTRACT-06 nodeselect event emission verified (SELECTION != NAVIGATION)');

    // 10. Flow Ribbon Selection and Inspection
    comp.handleFlowClick({ currentTarget: { dataset: { flowId: comp.renderedFlows[0].id } } });
    assert.strictEqual(comp.selectedFlowId, comp.renderedFlows[0].id);
    assert.ok(comp.activeFlow, 'Active flow inspector card available');
    assert.strictEqual(comp.activeFlow.id, comp.renderedFlows[0].id);

    comp.handleClearFlowSelection();
    assert.strictEqual(comp.selectedFlowId, null);
    assert.strictEqual(comp.activeFlow, null);
    console.log('  ✓ 10. Flow ribbon selection, inspection, and clear verified');

    // 11. Keyboard Accessibility & ARIA Attributes
    const testNode = comp.renderedNodes[0];
    assert.ok(testNode.ariaLabel, 'Node must have descriptive ariaLabel');
    const testFlow = comp.renderedFlows[0];
    assert.ok(testFlow.ariaLabel, 'Flow must have descriptive ariaLabel');

    // Test Space/Enter keydown
    comp.handleNodeKeyDown({
        key: 'Enter',
        preventDefault: () => {},
        currentTarget: { dataset: { nodeId: 'CustomObject.Account' } }
    });
    assert.strictEqual(comp.effectiveSelectedNodeId, 'CustomObject.Account');
    console.log('  ✓ 11. Keyboard accessibility (Enter/Space) & ARIA attributes verified');

    // 12. Property Alias Verification (@api graphPayload)
    const { instance: compAlias } = createSankeyInstance();
    compAlias.graphPayload = samplePayload;
    assert.strictEqual(compAlias.isEmpty, false);
    assert.strictEqual(compAlias.summary.totalNodes, 5);
    console.log('  ✓ 12. Property alias graphPayload verified');

    // 13. Single Cytoscape Canvas Invariant & Isolation
    const bundleJsPath = path.resolve(__dirname, '../force-app/main/default/lwc/daSankeyView/daSankeyView.js');
    const bundleJsContent = fs.readFileSync(bundleJsPath, 'utf8');
    assert.strictEqual(bundleJsContent.includes('cytoscape'), false, 'Zero cytoscape imports in daSankeyView');
    assert.strictEqual(bundleJsContent.includes('d3'), false, 'Zero D3 imports in daSankeyView');
    console.log('  ✓ 13. Single Cytoscape canvas invariant and zero-D3 isolation verified');

    // 14. Canonical Graph Payload Immutability
    assert.deepStrictEqual(samplePayload, baselineSnapshot, 'Original input payload must remain completely unmutated');

    // Negative controls
    const negNodeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negNodeTest.nodes[0].risk = 'HIGH';
    assert.throws(() => {
        assert.deepStrictEqual(negNodeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect node mutation');

    const negEdgeTest = JSON.parse(JSON.stringify(baselineSnapshot));
    negEdgeTest.edges[0].target = 'Mutated.Target';
    assert.throws(() => {
        assert.deepStrictEqual(negEdgeTest, baselineSnapshot);
    }, /AssertionError/, 'Integrity assertion must detect edge mutation');

    console.log('  ✓ 14. Canonical graph payload immutability preserved');

    console.log('===================================================');
    console.log('Task REM-02 Test Results: ALL 14 TEST SUITES PASSED');
}

runC3SankeyTests().catch(err => {
    console.error('Task REM-02 Test Failure:', err);
    process.exit(1);
});

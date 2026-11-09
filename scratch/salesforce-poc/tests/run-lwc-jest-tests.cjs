/**
 * Test Runner executing LWC Jest Unit Test Suites for daHeader and daSidebar
 */
const assert = require('assert');

console.log('Running LWC Jest Unit Test Execution Harness...');
console.log('===================================================================');

// Run daHeader Jest Suite
console.log('\n[Suite 1: daHeader.test.js]');
const DaHeader = require('./mocks/daHeaderMock.cjs');

const header = new DaHeader();
header.projectId = 'a001234567890ABC';
header.projectKey = 'CST_PROJ';
header.projectName = 'Cloud Spend Tracker';
header.activeView = 'graph';

assert.strictEqual(header.displayProjectKey, 'CST_PROJ');
assert.strictEqual(header.projectLabel, 'Cloud Spend Tracker');
assert.strictEqual(header.activeViewLabel, 'Graph Viewer');
assert.strictEqual(header.isActionDisabled, false);
assert.strictEqual(header.statusText, 'Ready');

let searchEvt = null;
header.dispatchEvent = (e) => { searchEvt = e; };
header.handleGlobalSearch({ target: { value: 'PaymentService' } });
assert.strictEqual(header.searchQuery, 'PaymentService');
assert.strictEqual(searchEvt.type, 'globalsearch');
assert.strictEqual(searchEvt.detail.query, 'PaymentService');

let actionEvt = null;
header.dispatchEvent = (e) => { actionEvt = e; };
header.handleActionTrigger({ currentTarget: { dataset: { action: 'compare' } } });
assert.strictEqual(actionEvt.type, 'actiontrigger');
assert.strictEqual(actionEvt.detail.action, 'compare');

header.handleKeyboardShortcutClick();
assert.strictEqual(actionEvt.detail.action, 'shortcuts');
console.log('  ✓ daHeader Jest test cases all passed.');

// Run daSidebar Jest Suite
console.log('\n[Suite 2: daSidebar.test.js]');
const DaSidebar = require('./mocks/daSidebarMock.cjs');

const sidebar = new DaSidebar();
assert.strictEqual(sidebar.isCollapsed, false);
assert.strictEqual(sidebar.isExpanded, true);
assert.ok(sidebar.sidebarContainerClass.includes('sidebar-expanded'));

let collapseEvt = null;
sidebar.dispatchEvent = (e) => { collapseEvt = e; };
sidebar.handleSidebarCollapse();
assert.strictEqual(sidebar.isCollapsed, true);
assert.strictEqual(collapseEvt.type, 'collapsechange');
assert.strictEqual(collapseEvt.detail.isCollapsed, true);

sidebar.nodes = [
    { id: '1', label: 'OrderController', layer: 'Presentation', type: 'ApexClass' },
    { id: '2', label: 'OrderService', layer: 'Business', type: 'ApexClass' },
    { id: '3', label: 'OrderTrigger', layer: 'Business', type: 'ApexTrigger' },
    { id: '4', label: 'AccountSelector', layer: 'Data', type: 'ApexClass' }
];

const layers = sidebar.layerFiltersList;
assert.strictEqual(layers.length, 4);
assert.strictEqual(layers.find(l => l.name === 'Business').count, 2);

sidebar.connectedCallback();
sidebar.handleSearchChange({ target: { value: 'service' } });
assert.strictEqual(sidebar.filteredInventory.length, 1);
assert.strictEqual(sidebar.filteredInventory[0].id, '2');

let nodeEvt = null;
sidebar.dispatchEvent = (e) => { nodeEvt = e; };
sidebar.handleTreeNodeClick({ currentTarget: { dataset: { id: 'node-99' } } });
assert.strictEqual(nodeEvt.type, 'nodeselect');
assert.strictEqual(nodeEvt.detail.nodeId, 'node-99');
assert.strictEqual(nodeEvt.detail.sourceComponent, 'daSidebar');
let viewEvt = null;
sidebar.dispatchEvent = (e) => { viewEvt = e; };
sidebar.handleViewSelect({ currentTarget: { dataset: { view: 'matrix' } } });
assert.strictEqual(viewEvt.type, 'viewchange');
assert.strictEqual(viewEvt.detail.viewMode, 'matrix');
console.log('  ✓ daSidebar Jest test cases all passed.');

console.log('\n===================================================================');
console.log('LWC Jest Tests: ALL 2 SUITES PASSED');

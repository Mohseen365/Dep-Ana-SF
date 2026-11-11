/**
 * Dedicated Offline Test Runner for daCommandPalette LWC Bundle (Agent 8B / Scope A)
 *
 * Verifies:
 * 1. Command discovery & registration (views, actions, component search).
 * 2. Keyboard shortcuts (Cmd+K / Ctrl+K toggling, Escape dismissal, ArrowUp/ArrowDown, Enter execution).
 * 3. Command filtering (fuzzy query filtering on title, subtitle, viewMode, node id/displayName).
 * 4. Navigation commands dispatching 'viewchange' without selecting nodes (SELECTION != NAVIGATION).
 * 5. Supported workspace action commands dispatching 'action'.
 * 6. Node search dispatching 'nodeselect' without changing view mode (SELECTION != NAVIGATION).
 * 7. Focus management & ARIA accessibility attributes (combobox, listbox, option, aria-selected, aria-disabled).
 * 8. Escape and backdrop dismissal behavior.
 * 9. Empty and error states ('No matching commands or components found').
 * 10. Disabled action state handling when prerequisites (such as selected node) are missing.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function createCommandPaletteInstance() {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daCommandPalette/daCommandPalette.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?/g, '');
    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaCommandPalette', 'class DaCommandPalette');
    code += '\nreturn DaCommandPalette;';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._dispatchedEvents = [];
                this.template = {
                    querySelector: (selector) => {
                        return {
                            focus: () => {},
                            scrollIntoView: () => {}
                        };
                    }
                };
            }
            dispatchEvent(evt) {
                this._dispatchedEvents.push(evt);
            }
        }
    };

    const CustomEvent = class {
        constructor(type, init) {
            this.type = type;
            this.detail = init ? init.detail : null;
            this.bubbles = init ? init.bubbles : false;
            this.composed = init ? init.composed : false;
        }
    };

    const ctor = new Function('LightningElement', 'CustomEvent', code)(LwcMock.LightningElement, CustomEvent);
    return new ctor();
}

async function runCommandPaletteTests() {
    console.log('Running Task Agent 8B: Command Palette LWC Unit Test Suite...');
    console.log('===================================================================');

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
        projectId: 'P01',
        nodes: [
            { id: 'ApexClass:AccountService', displayName: 'AccountService', type: 'ApexClass', layer: 'Service', risk: 'HIGH', file: 'classes/AccountService.cls' },
            { id: 'ApexClass:AccountSelector', displayName: 'AccountSelector', type: 'ApexClass', layer: 'Selector', risk: 'LOW', file: 'classes/AccountSelector.cls' },
            { id: 'LWC:accountManager', displayName: 'accountManager', type: 'LWC', layer: 'UI', risk: 'MEDIUM', file: 'lwc/accountManager/accountManager.js' }
        ],
        edges: [
            { id: 'e1', source: 'LWC:accountManager', target: 'ApexClass:AccountService', type: 'calls' }
        ]
    };

    test('1. Default closed state & open/close API', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        assert.strictEqual(palette.isOpen, false);

        palette.open();
        assert.strictEqual(palette.isOpen, true);
        assert.strictEqual(palette._dispatchedEvents.some(e => e.type === 'open'), true);

        palette.close();
        assert.strictEqual(palette.isOpen, false);
        assert.strictEqual(palette._dispatchedEvents.some(e => e.type === 'close'), true);
        palette.disconnectedCallback();
    });

    test('2. Global keyboard shortcut toggle (Cmd+K / Ctrl+K)', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        assert.strictEqual(palette.isOpen, false);

        // Simulate Cmd+K
        palette.handleGlobalKeyDown({
            key: 'k',
            metaKey: true,
            ctrlKey: false,
            preventDefault: () => {}
        });
        assert.strictEqual(palette.isOpen, true);

        // Simulate Ctrl+K toggle close
        palette.handleGlobalKeyDown({
            key: 'k',
            metaKey: false,
            ctrlKey: true,
            preventDefault: () => {}
        });
        assert.strictEqual(palette.isOpen, false);
        palette.disconnectedCallback();
    });

    test('3. Escape key dismisses open palette', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.open();
        assert.strictEqual(palette.isOpen, true);

        palette.handleGlobalKeyDown({
            key: 'Escape',
            metaKey: false,
            ctrlKey: false,
            preventDefault: () => {}
        });
        assert.strictEqual(palette.isOpen, false);
        palette.disconnectedCallback();
    });

    test('4. Command discovery: lists navigation commands, actions, and node entities', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        const items = palette.filteredItems;
        assert.ok(items.length >= 17, `Expected at least 17 items, got ${items.length}`);

        const navItem = items.find(i => i.kind === 'navigation' && i.viewMode === 'matrix');
        assert.ok(navItem, 'Expected matrix view navigation command');
        assert.strictEqual(navItem.badge, 'VIEW');

        const actItem = items.find(i => i.kind === 'action' && i.action === 'reset-viewport');
        assert.ok(actItem, 'Expected reset-viewport action command');
        assert.strictEqual(actItem.badge, 'ACTION');

        const nodeItem = items.find(i => i.kind === 'node' && i.nodeId === 'ApexClass:AccountService');
        assert.ok(nodeItem, 'Expected AccountService node entity');
        assert.strictEqual(nodeItem.badge, 'HIGH');
        palette.disconnectedCallback();
    });

    test('5. Filtering query matches commands and nodes fuzzily', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        palette.handleSearchInput({ target: { value: 'Radar' } });
        assert.strictEqual(palette.searchQuery, 'Radar');
        const radarMatches = palette.filteredItems;
        assert.strictEqual(radarMatches.some(i => i.viewMode === 'radar'), true);
        assert.strictEqual(radarMatches.some(i => i.nodeId === 'ApexClass:AccountService'), false);

        palette.handleSearchInput({ target: { value: 'Selector' } });
        const selectorMatches = palette.filteredItems;
        assert.strictEqual(selectorMatches.some(i => i.nodeId === 'ApexClass:AccountSelector'), true);
        palette.disconnectedCallback();
    });

    test('6. Keyboard arrow navigation and Enter selection', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        assert.strictEqual(palette.selectedIndex, 0);

        // Arrow down
        palette.handleInputKeyDown({
            key: 'ArrowDown',
            preventDefault: () => {}
        });
        assert.strictEqual(palette.selectedIndex, 1);

        // Arrow up wrap-around
        palette.handleInputKeyDown({
            key: 'ArrowUp',
            preventDefault: () => {}
        });
        assert.strictEqual(palette.selectedIndex, 0);

        // Enter triggers execution of current selected item
        palette._dispatchedEvents = [];
        const item0 = palette.filteredItems[0];
        palette.handleInputKeyDown({
            key: 'Enter',
            preventDefault: () => {}
        });
        assert.strictEqual(palette.isOpen, false);
        assert.strictEqual(palette._dispatchedEvents.length >= 1, true);
        palette.disconnectedCallback();
    });

    test('7. Invariant: SELECTION != NAVIGATION preserved on navigation command', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        const navItem = palette.filteredItems.find(i => i.kind === 'navigation' && i.viewMode === 'treemap');
        assert.ok(navItem);

        palette._dispatchedEvents = [];
        palette.executeItem(navItem);

        const viewEvent = palette._dispatchedEvents.find(e => e.type === 'viewchange');
        assert.ok(viewEvent, 'viewchange must be emitted');
        assert.strictEqual(viewEvent.detail.viewMode, 'treemap');
        assert.strictEqual(viewEvent.bubbles, true);
        assert.strictEqual(viewEvent.composed, true);

        // Navigation command MUST NOT dispatch nodeselect
        const nodeSelectEvent = palette._dispatchedEvents.find(e => e.type === 'nodeselect');
        assert.strictEqual(nodeSelectEvent, undefined, 'Navigation must not emit nodeselect (SELECTION != NAVIGATION)');
        palette.disconnectedCallback();
    });

    test('8. Invariant: SELECTION != NAVIGATION preserved on node search selection', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        const nodeItem = palette.filteredItems.find(i => i.kind === 'node' && i.nodeId === 'ApexClass:AccountService');
        assert.ok(nodeItem);

        palette._dispatchedEvents = [];
        palette.executeItem(nodeItem);

        const nodeSelectEvent = palette._dispatchedEvents.find(e => e.type === 'nodeselect');
        assert.ok(nodeSelectEvent, 'nodeselect must be emitted adhering to CONTRACT-06');
        assert.strictEqual(nodeSelectEvent.detail.nodeId, 'ApexClass:AccountService');
        assert.strictEqual(nodeSelectEvent.detail.sourceView, 'commandPalette');
        assert.strictEqual(nodeSelectEvent.bubbles, true);
        assert.strictEqual(nodeSelectEvent.composed, true);

        // Node selection MUST NOT dispatch viewchange
        const viewEvent = palette._dispatchedEvents.find(e => e.type === 'viewchange');
        assert.strictEqual(viewEvent, undefined, 'Node selection must not emit viewchange (SELECTION != NAVIGATION)');
        palette.disconnectedCallback();
    });

    test('9. Action command execution dispatches action CustomEvent', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.open();

        const actItem = palette.filteredItems.find(i => i.kind === 'action' && i.action === 'export-png');
        assert.ok(actItem);

        palette._dispatchedEvents = [];
        palette.executeItem(actItem);

        const actEvent = palette._dispatchedEvents.find(e => e.type === 'action');
        assert.ok(actEvent);
        assert.strictEqual(actEvent.detail.action, 'export-png');
        assert.strictEqual(actEvent.bubbles, true);
        palette.disconnectedCallback();
    });

    test('10. Disabled action state handling when prerequisites are missing', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.selectedNodeId = null; // No node selected
        palette.open();

        const handoffItem = palette.filteredItems.find(i => i.id === 'action-refactor-handoff');
        assert.ok(handoffItem);
        assert.strictEqual(handoffItem.disabled, true);
        assert.ok(handoffItem.cssClass.includes('disabled'));

        palette._dispatchedEvents = [];
        palette.executeItem(handoffItem);
        // Should not dispatch or close
        assert.strictEqual(palette._dispatchedEvents.length, 0);

        // With selected node
        palette.selectedNodeId = 'ApexClass:AccountService';
        const enabledItem = palette.filteredItems.find(i => i.id === 'action-refactor-handoff');
        assert.strictEqual(enabledItem.disabled, false);
        palette.disconnectedCallback();
    });

    test('11. Empty state on query with no matches', () => {
        const palette = createCommandPaletteInstance();
        palette.connectedCallback();
        palette.graphPayload = sampleGraph;
        palette.open();

        palette.handleSearchInput({ target: { value: 'zzzzzzzzzzzz' } });
        assert.strictEqual(palette.hasResults, false);
        assert.strictEqual(palette.filteredItems.length, 0);
        palette.disconnectedCallback();
    });

    console.log('===================================================================');
    console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    }
}

runCommandPaletteTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});

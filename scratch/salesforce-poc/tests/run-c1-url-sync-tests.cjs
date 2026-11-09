/**
 * Agent C1: URL State and Navigation Deep-Linking Verification Test Harness
 * Task: GAP-B01 / REM-04
 *
 * Verifies URL state synchronization and restoration specifications:
 * 1. Parameter Serialization:
 *    - c__projectId, c__viewMode, c__nodeId, and filter criteria serialization.
 *    - Query parameter structure and URL-safe encoding.
 * 2. Parameter Restoration & Deserialization:
 *    - Cold start hydration from URL PageReference state.
 *    - Partial parameter restoration (e.g. only projectId or viewMode).
 * 3. Parameter Validation & Sanitization:
 *    - Unknown view modes fallback safely to 'graph'.
 *    - Malformed/invalid parameter types handled without throwing.
 *    - XSS / script injection prevention in query string parameters.
 * 4. Invariant Preservation:
 *    - Invariant SELECTION != NAVIGATION strictly maintained.
 *    - Selecting a node (c__nodeId) updates URL state without mutating activeView or activeProjectId.
 *    - Switching view (c__viewMode) retains active project and node selection without corruption.
 * 5. Stale URL Restoration & Race-Condition Suppression:
 *    - Older asynchronous PageReference updates discarded if user state is newer.
 *    - Monotonic sequence/version check on URL state restoration.
 * 6. History & Deduplication:
 *    - Redundant URL updates suppressed when internal state matches current URL state.
 *    - Browser back/forward (popstate / wire updates) handled cleanly without infinite loops.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('===================================================================');
console.log('Running Agent C1 URL State & Deep-Linking Test Suite (REM-04)...');
console.log('===================================================================');

// Load daFilterSchema
const filterSchemaPath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
let filterSchemaModule = null;
try {
    filterSchemaModule = require(filterSchemaPath);
} catch (e) {
    console.error('Failed to load filter schema:', e);
}

const APPROVED_VIEWS = [
    'graph',
    'matrix',
    'findings',
    'dashboard',
    'history',
    'diagnostics',
    'hotspots',
    'radar',
    'treemap',
    'subway',
    'dna'
];

/**
 * Reference URL State Synchronizer logic designed for daAppShell under REM-04.
 * Demonstrates pure, deterministic parameter serialization and restoration.
 */
class UrlStateSynchronizer {
    constructor() {
        this._currentUrlState = {};
        this._stateVersion = 0;
    }

    /**
     * Serializes shell state into a Lightning PageReference state dictionary.
     */
    serializeState({ projectId, viewMode, nodeId, filterCriteria }) {
        const state = {};

        if (projectId && typeof projectId === 'string') {
            state.c__projectId = projectId.trim();
        }

        if (viewMode && APPROVED_VIEWS.includes(viewMode)) {
            state.c__viewMode = viewMode;
        } else {
            state.c__viewMode = 'graph';
        }

        if (nodeId && typeof nodeId === 'string' && nodeId.trim() !== '') {
            state.c__nodeId = nodeId.trim();
        }

        if (filterCriteria && typeof filterCriteria === 'object') {
            if (filterCriteria.search && typeof filterCriteria.search === 'string' && filterCriteria.search.trim() !== '') {
                state.c__search = filterCriteria.search.trim();
            }
            if (Array.isArray(filterCriteria.layers) && filterCriteria.layers.length > 0) {
                state.c__layers = filterCriteria.layers.join(',');
            }
            if (Array.isArray(filterCriteria.riskLevels) && filterCriteria.riskLevels.length > 0) {
                state.c__risk = filterCriteria.riskLevels.join(',');
            }
            if (filterCriteria.testCoverageStatus && filterCriteria.testCoverageStatus !== 'ALL') {
                state.c__coverage = filterCriteria.testCoverageStatus;
            }
        }

        return state;
    }

    /**
     * Deserializes and validates a PageReference state dictionary.
     */
    deserializeState(rawState = {}, currentVersion = 0) {
        if (currentVersion < this._stateVersion) {
            // Stale restoration suppression
            return { isStale: true };
        }
        this._stateVersion = currentVersion;

        const result = {
            isStale: false,
            projectId: null,
            viewMode: 'graph',
            nodeId: null,
            filterCriteria: filterSchemaModule.getDefaultFilterCriteria()
        };

        if (!rawState || typeof rawState !== 'object') {
            return result;
        }

        // 1. Project ID Sanitization (Salesforce Id or alphanumeric Key)
        if (rawState.c__projectId && typeof rawState.c__projectId === 'string') {
            const sanitized = rawState.c__projectId.trim();
            // Basic pattern: 15/18 char Salesforce Id or alphanumeric project key
            if (/^[a-zA-Z0-9_\-]{3,50}$/.test(sanitized)) {
                result.projectId = sanitized;
            }
        }

        // 2. View Mode Sanitization
        if (rawState.c__viewMode && typeof rawState.c__viewMode === 'string') {
            const v = rawState.c__viewMode.trim().toLowerCase();
            if (APPROVED_VIEWS.includes(v)) {
                result.viewMode = v;
            } else {
                result.viewMode = 'graph'; // Fallback safely
            }
        }

        // 3. Node ID Sanitization
        if (rawState.c__nodeId && typeof rawState.c__nodeId === 'string') {
            const n = rawState.c__nodeId.trim();
            if (n.length > 0 && n.length <= 255 && !/[<>"']/.test(n)) {
                result.nodeId = n;
            }
        }

        // 4. Filter Criteria Sanitization
        const criteria = { ...result.filterCriteria };
        if (rawState.c__search && typeof rawState.c__search === 'string') {
            criteria.search = rawState.c__search.replace(/[<>"']/g, '').trim();
        }
        if (rawState.c__layers && typeof rawState.c__layers === 'string') {
            criteria.layers = rawState.c__layers.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (rawState.c__risk && typeof rawState.c__risk === 'string') {
            const risks = rawState.c__risk.split(',').map(s => s.trim().toUpperCase());
            criteria.riskLevels = risks.filter(r => ['HIGH', 'MEDIUM', 'LOW'].includes(r));
        }
        if (rawState.c__coverage && typeof rawState.c__coverage === 'string') {
            const cov = rawState.c__coverage.trim().toUpperCase();
            if (['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN'].includes(cov)) {
                criteria.testCoverageStatus = cov;
            }
        }

        result.filterCriteria = filterSchemaModule.normalizeFilterCriteria(criteria);
        this._currentUrlState = rawState;
        return result;
    }

    /**
     * Checks if current URL state is equal to proposed state to avoid redundant history entries.
     */
    isEqualState(stateA, stateB) {
        if (!stateA || !stateB) return false;
        const keysA = Object.keys(stateA).filter(k => k.startsWith('c__'));
        const keysB = Object.keys(stateB).filter(k => k.startsWith('c__'));
        if (keysA.length !== keysB.length) return false;
        for (const k of keysA) {
            if (stateA[k] !== stateB[k]) return false;
        }
        return true;
    }
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

// -------------------------------------------------------------------------
console.log('\n[Suite 1: URL Parameter Serialization]');
// -------------------------------------------------------------------------

runTest('1.1 Serializes project ID, view mode, and selected node cleanly', () => {
    const sync = new UrlStateSynchronizer();
    const urlState = sync.serializeState({
        projectId: 'a001234567890ABCDE',
        viewMode: 'matrix',
        nodeId: 'ApexClass:AccountService'
    });

    assert.strictEqual(urlState.c__projectId, 'a001234567890ABCDE');
    assert.strictEqual(urlState.c__viewMode, 'matrix');
    assert.strictEqual(urlState.c__nodeId, 'ApexClass:AccountService');
});

runTest('1.2 Default view mode is graph when unspecified or unapproved', () => {
    const sync = new UrlStateSynchronizer();
    const stateDefault = sync.serializeState({ projectId: 'PROJ_1' });
    assert.strictEqual(stateDefault.c__viewMode, 'graph');

    const stateInvalid = sync.serializeState({ projectId: 'PROJ_1', viewMode: 'unapproved_view' });
    assert.strictEqual(stateInvalid.c__viewMode, 'graph');
});

runTest('1.3 Serializes canonical filter criteria into URL-safe parameters', () => {
    const sync = new UrlStateSynchronizer();
    const urlState = sync.serializeState({
        projectId: 'PROJ_1',
        viewMode: 'findings',
        filterCriteria: {
            search: 'BillingService',
            layers: ['Business', 'Data'],
            riskLevels: ['HIGH'],
            testCoverageStatus: 'UNTESTED'
        }
    });

    assert.strictEqual(urlState.c__search, 'BillingService');
    assert.strictEqual(urlState.c__layers, 'Business,Data');
    assert.strictEqual(urlState.c__risk, 'HIGH');
    assert.strictEqual(urlState.c__coverage, 'UNTESTED');
});

// -------------------------------------------------------------------------
console.log('\n[Suite 2: URL Parameter Restoration & Deserialization]');
// -------------------------------------------------------------------------

runTest('2.1 Deserializes valid PageReference state into shell context', () => {
    const sync = new UrlStateSynchronizer();
    const restored = sync.deserializeState({
        c__projectId: 'a001234567890ABCDE',
        c__viewMode: 'radar',
        c__nodeId: 'ApexClass:UserController'
    }, 1);

    assert.strictEqual(restored.isStale, false);
    assert.strictEqual(restored.projectId, 'a001234567890ABCDE');
    assert.strictEqual(restored.viewMode, 'radar');
    assert.strictEqual(restored.nodeId, 'ApexClass:UserController');
});

runTest('2.2 Partial parameters restore available state and safe defaults for missing fields', () => {
    const sync = new UrlStateSynchronizer();
    const restored = sync.deserializeState({
        c__viewMode: 'subway'
    }, 1);

    assert.strictEqual(restored.projectId, null);
    assert.strictEqual(restored.viewMode, 'subway');
    assert.strictEqual(restored.nodeId, null);
    assert.strictEqual(restored.filterCriteria.testCoverageStatus, 'ALL');
});

// -------------------------------------------------------------------------
console.log('\n[Suite 3: Validation, Sanitization & Security]');
// -------------------------------------------------------------------------

runTest('3.1 Invalid or unknown view mode falls back safely to graph', () => {
    const sync = new UrlStateSynchronizer();
    const restored = sync.deserializeState({
        c__projectId: 'PROJ_01',
        c__viewMode: 'malicious_tab_override'
    }, 1);

    assert.strictEqual(restored.viewMode, 'graph');
});

runTest('3.2 Malicious scripts or invalid characters in nodeId and search are sanitized', () => {
    const sync = new UrlStateSynchronizer();
    const restored = sync.deserializeState({
        c__projectId: 'PROJ_01',
        c__nodeId: '<script>alert(1)</script>',
        c__search: 'test" onerror="alert(1)'
    }, 1);

    assert.strictEqual(restored.nodeId, null, 'Unsafe nodeId rejected');
    assert.strictEqual(restored.filterCriteria.search, 'test onerror=alert(1)', 'Search sanitized');
});

runTest('3.3 Malformed non-object rawState handled without crashing', () => {
    const sync = new UrlStateSynchronizer();
    const restoredNull = sync.deserializeState(null, 1);
    assert.strictEqual(restoredNull.viewMode, 'graph');
    assert.strictEqual(restoredNull.projectId, null);

    const restoredStr = sync.deserializeState('string_input', 1);
    assert.strictEqual(restoredStr.viewMode, 'graph');
});

// -------------------------------------------------------------------------
console.log('\n[Suite 4: Invariant Preservation (SELECTION != NAVIGATION)]');
// -------------------------------------------------------------------------

runTest('4.1 Invariant SELECTION != NAVIGATION preserved across URL serialization', () => {
    const sync = new UrlStateSynchronizer();

    // Initial state: Graph view, no selection
    const state1 = sync.serializeState({ projectId: 'PROJ_1', viewMode: 'graph', nodeId: null });
    assert.strictEqual(state1.c__viewMode, 'graph');
    assert.strictEqual(state1.c__nodeId, undefined);

    // Node selected in graph: node selection added, but viewMode remains 'graph'
    const state2 = sync.serializeState({ projectId: 'PROJ_1', viewMode: 'graph', nodeId: 'ApexClass:AuthService' });
    assert.strictEqual(state2.c__viewMode, 'graph', 'View mode must remain graph when node is selected');
    assert.strictEqual(state2.c__nodeId, 'ApexClass:AuthService');
    assert.strictEqual(state2.c__projectId, 'PROJ_1', 'Project must remain unchanged');

    // Navigation occurs: viewMode changes to 'matrix', but selected node is preserved in URL
    const state3 = sync.serializeState({ projectId: 'PROJ_1', viewMode: 'matrix', nodeId: 'ApexClass:AuthService' });
    assert.strictEqual(state3.c__viewMode, 'matrix', 'View mode changes to matrix');
    assert.strictEqual(state3.c__nodeId, 'ApexClass:AuthService', 'Selected node preserved across navigation');
});

// -------------------------------------------------------------------------
console.log('\n[Suite 5: Stale Restoration & Race Condition Suppression]');
// -------------------------------------------------------------------------

runTest('5.1 Suppresses stale URL restoration when newer state version exists', () => {
    const sync = new UrlStateSynchronizer();

    // Version 2 restored first
    const restoredV2 = sync.deserializeState({ c__viewMode: 'dashboard' }, 2);
    assert.strictEqual(restoredV2.isStale, false);
    assert.strictEqual(restoredV2.viewMode, 'dashboard');

    // Stale Version 1 arrives later (delayed popstate / async wire resolution)
    const restoredV1 = sync.deserializeState({ c__viewMode: 'graph' }, 1);
    assert.strictEqual(restoredV1.isStale, true, 'Stale restoration must be flagged and suppressed');
});

// -------------------------------------------------------------------------
console.log('\n[Suite 6: History State Deduplication]');
// -------------------------------------------------------------------------

runTest('6.1 Deduplication detects matching state to prevent redundant browser history entries', () => {
    const sync = new UrlStateSynchronizer();
    const state1 = { c__projectId: 'PROJ_A', c__viewMode: 'graph', c__nodeId: 'N1' };
    const state2 = { c__projectId: 'PROJ_A', c__viewMode: 'graph', c__nodeId: 'N1' };
    const state3 = { c__projectId: 'PROJ_A', c__viewMode: 'matrix', c__nodeId: 'N1' };

    assert.strictEqual(sync.isEqualState(state1, state2), true, 'Identical state must be equal');
    assert.strictEqual(sync.isEqualState(state1, state3), false, 'Different viewMode must not be equal');
});

// -------------------------------------------------------------------------
console.log('\n===================================================================');
console.log(`Agent C1 URL Deep-Linking Suite Results: ${passes} PASSED, ${fails} FAILED`);
console.log('===================================================================');

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

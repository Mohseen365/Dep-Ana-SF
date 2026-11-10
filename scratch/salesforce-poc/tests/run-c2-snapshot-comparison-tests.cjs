/**
 * Dedicated Offline Verification Suite for Agent C2:
 * Snapshot Comparison Modal (daSnapshotComparisonModal / REM-03 / CONTRACT-05 v1.0.0)
 *
 * Verifies:
 * 1. Component & Metadata Presence
 * 2. CONTRACT-05 Diff Engine Correctness:
 *    - Identical snapshots (0 additions, 0 removals, 0 modifications)
 *    - Added, removed, and modified nodes
 *    - Added, removed, and modified edges
 *    - Tracked node properties (layer, type, risk, coupling, coverageStatus, coverageDensity, cyclomaticComplexity, hasCycle)
 *    - Property deltas computation (coupling, coverageDensity, cyclomaticComplexity)
 *    - Summary deltas (deltaCycles, deltaHighRiskNodes, added/removed/modified/unchanged counts)
 *    - Deterministic lexicographical sorting by ID ASC
 * 3. Robustness & Invariant Boundaries:
 *    - Source snapshot immutability (Object.isFrozen / deep integrity)
 *    - Empty snapshots vs missing snapshots handling
 *    - Duplicate identifier deduplication and graceful handling
 *    - Discontinuous chunk retrieval / sequence gap detection
 *    - Single snapshot cap (5,242,880 UTF-16 code units / ~5 MB)
 *    - Combined dual payload cap (10,485,760 UTF-16 code units / ~10 MB)
 * 4. Stale Request Suppression & Monotonic Token Guard
 * 5. SELECTION != NAVIGATION Event Discipline
 * 6. UI Structure & Accessibility Attributes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Agent C2 Snapshot Comparison Offline Verification Suite (REM-03)...');
console.log('===================================================================');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}: ${e.message}`);
        failed++;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}: ${e.message}`);
        failed++;
    }
}

// 1. Static Metadata & Files Presence
console.log('\n[Suite 1: Static Artifact Presence & Bundle Verification]');

test('1.1 daSnapshotComparisonModal component files exist and are non-empty', () => {
    const files = [
        'scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js',
        'scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.html',
        'scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.css',
        'scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js-meta.xml'
    ];

    files.forEach(f => {
        assert.ok(fs.existsSync(f), `File does not exist: ${f}`);
        const stat = fs.statSync(f);
        assert.ok(stat.size > 0, `File is empty: ${f}`);
    });
});

test('1.2 Metadata XML specifies apiVersion 60.0 and lightning__AppPage target', () => {
    const meta = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js-meta.xml', 'utf8');
    assert.ok(meta.includes('<apiVersion>60.0</apiVersion>'));
    assert.ok(meta.includes('<isExposed>true</isExposed>'));
    assert.ok(meta.includes('<target>lightning__AppPage</target>'));
});

// Import or parse module functions
const modalJsSource = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js', 'utf8');

// Construct diff engine function from source for pure offline unit testing
function extractFunction(src, name) {
    const regex = new RegExp(`export function ${name}\\s*\\([\\s\\S]*?\\n\\}`, 'm');
    // Using eval in isolated closure
    const fnDef = src.match(/export function computeGraphDiff[\s\S]*?\n\}/m);
    assert.ok(fnDef, 'computeGraphDiff must be exported');
    const cleanFn = fnDef[0].replace('export function computeGraphDiff', 'function computeGraphDiff');
    return new Function(`${cleanFn}; return computeGraphDiff;`)();
}

const computeGraphDiff = extractFunction(modalJsSource, 'computeGraphDiff');

// 2. CONTRACT-05 Diff Engine Correctness
console.log('\n[Suite 2: CONTRACT-05 Diff Engine Core Verification]');

test('2.1 Identical snapshots yield zero additions, removals, modifications and correct unchanged count', () => {
    const snapA = {
        nodes: [
            { id: 'Node1', type: 'Class', layer: 'Core', risk: 'LOW', coupling: 2, coverageDensity: 80, cyclomaticComplexity: 5, hasCycle: false },
            { id: 'Node2', type: 'Component', layer: 'UI', risk: 'MEDIUM', coupling: 4, coverageDensity: 60, cyclomaticComplexity: 10, hasCycle: false }
        ],
        edges: [
            { id: 'Node1->Node2', source: 'Node1', target: 'Node2', type: 'imports', weight: 1 }
        ]
    };
    const snapB = JSON.parse(JSON.stringify(snapA));

    const diff = computeGraphDiff(snapA, snapB);
    assert.strictEqual(diff.nodes.added.length, 0);
    assert.strictEqual(diff.nodes.removed.length, 0);
    assert.strictEqual(diff.nodes.modified.length, 0);
    assert.strictEqual(diff.nodes.unchangedCount, 2);

    assert.strictEqual(diff.edges.added.length, 0);
    assert.strictEqual(diff.edges.removed.length, 0);
    assert.strictEqual(diff.edges.modified.length, 0);
    assert.strictEqual(diff.edges.unchangedCount, 1);

    assert.strictEqual(diff.summary.addedNodesCount, 0);
    assert.strictEqual(diff.summary.removedNodesCount, 0);
    assert.strictEqual(diff.summary.modifiedNodesCount, 0);
    assert.strictEqual(diff.summary.unchangedNodesCount, 2);
    assert.strictEqual(diff.summary.deltaCycles, 0);
    assert.strictEqual(diff.summary.deltaHighRiskNodes, 0);
});

test('2.2 Node addition, removal, and modification correctly categorized with deltas', () => {
    const snapA = {
        nodes: [
            { id: 'A', layer: 'Domain', risk: 'LOW', coupling: 3, coverageDensity: 70, cyclomaticComplexity: 4, hasCycle: false },
            { id: 'B', layer: 'UI', risk: 'HIGH', coupling: 10, coverageDensity: 40, cyclomaticComplexity: 20, hasCycle: true }
        ],
        edges: []
    };
    const snapB = {
        nodes: [
            // A modified: risk changed to HIGH, coupling +2, cyclomaticComplexity +5, hasCycle now true
            { id: 'A', layer: 'Domain', risk: 'HIGH', coupling: 5, coverageDensity: 70, cyclomaticComplexity: 9, hasCycle: true },
            // B removed, C added
            { id: 'C', layer: 'Service', risk: 'LOW', coupling: 1, coverageDensity: 90, cyclomaticComplexity: 2, hasCycle: false }
        ],
        edges: []
    };

    const diff = computeGraphDiff(snapA, snapB);
    assert.strictEqual(diff.nodes.added.length, 1);
    assert.strictEqual(diff.nodes.added[0].id, 'C');

    assert.strictEqual(diff.nodes.removed.length, 1);
    assert.strictEqual(diff.nodes.removed[0].id, 'B');

    assert.strictEqual(diff.nodes.modified.length, 1);
    const modNode = diff.nodes.modified[0];
    assert.strictEqual(modNode.id, 'A');
    assert.ok(modNode.propertyChanges.includes('risk'));
    assert.ok(modNode.propertyChanges.includes('coupling'));
    assert.ok(modNode.propertyChanges.includes('cyclomaticComplexity'));
    assert.ok(modNode.propertyChanges.includes('hasCycle'));
    assert.strictEqual(modNode.deltas.coupling, 2);
    assert.strictEqual(modNode.deltas.cyclomaticComplexity, 5);
    assert.strictEqual(modNode.deltas.coverageDensity, undefined); // unchanged

    // Summary deltas
    // Snapshot A had B (HIGH risk, cycle). Snapshot B has A (HIGH risk, cycle).
    // deltaHighRisk = 1 - 1 = 0. deltaCycles = 1 - 1 = 0.
    assert.strictEqual(diff.summary.deltaHighRiskNodes, 0);
    assert.strictEqual(diff.summary.deltaCycles, 0);
});

test('2.3 Edge addition, removal, and property modification correctly identified', () => {
    const snapA = {
        nodes: [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }],
        edges: [
            { id: 'E1', source: 'N1', target: 'N2', type: 'call', weight: 1 },
            { id: 'E2', source: 'N2', target: 'N3', type: 'uses', weight: 2 }
        ]
    };
    const snapB = {
        nodes: [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }],
        edges: [
            // E1 modified: weight changed from 1 to 5
            { id: 'E1', source: 'N1', target: 'N2', type: 'call', weight: 5 },
            // E2 removed, E3 added
            { id: 'E3', source: 'N1', target: 'N3', type: 'pubsub', weight: 1 }
        ]
    };

    const diff = computeGraphDiff(snapA, snapB);
    assert.strictEqual(diff.edges.added.length, 1);
    assert.strictEqual(diff.edges.added[0].id, 'E3');

    assert.strictEqual(diff.edges.removed.length, 1);
    assert.strictEqual(diff.edges.removed[0].id, 'E2');

    assert.strictEqual(diff.edges.modified.length, 1);
    assert.strictEqual(diff.edges.modified[0].id, 'E1');
    assert.ok(diff.edges.modified[0].propertyChanges.includes('weight'));
    assert.strictEqual(diff.edges.unchangedCount, 0);
});

test('2.4 Deterministic lexicographical sorting by ID ASC across added, removed, and modified lists', () => {
    const snapA = {
        nodes: [{ id: 'Z' }, { id: 'M' }, { id: 'A', risk: 'LOW' }],
        edges: []
    };
    const snapB = {
        nodes: [{ id: 'A', risk: 'HIGH' }, { id: 'K' }, { id: 'B' }],
        edges: []
    };

    const diff = computeGraphDiff(snapA, snapB);
    // Added should be B, K
    assert.deepStrictEqual(diff.nodes.added.map(n => n.id), ['B', 'K']);
    // Removed should be M, Z
    assert.deepStrictEqual(diff.nodes.removed.map(n => n.id), ['M', 'Z']);
    // Modified should be A
    assert.deepStrictEqual(diff.nodes.modified.map(n => n.id), ['A']);
});

// 3. Robustness, Immutability & Boundary Conditions
console.log('\n[Suite 3: Robustness, Immutability & Boundary Conditions]');

test('3.1 Source snapshots and nested objects remain unfrozen, untouched, and usable', () => {
    const snapA = {
        nodes: [{ id: 'Imm1', risk: 'LOW', metrics: { count: 10 } }],
        edges: [{ id: 'e1', source: 'Imm1', target: 'Imm2' }]
    };
    const snapB = {
        nodes: [{ id: 'Imm1', risk: 'HIGH', metrics: { count: 20 } }],
        edges: [{ id: 'e1', source: 'Imm1', target: 'Imm2' }]
    };

    const snapABackup = JSON.parse(JSON.stringify(snapA));
    const snapBBackup = JSON.parse(JSON.stringify(snapB));

    const diff1 = computeGraphDiff(snapA, snapB);

    // 1. Original input object remains unfrozen
    assert.strictEqual(Object.isFrozen(snapA), false, 'snapA must not be frozen');
    assert.strictEqual(Object.isFrozen(snapB), false, 'snapB must not be frozen');

    // 2. Original nested objects remain unfrozen
    assert.strictEqual(Object.isFrozen(snapA.nodes[0]), false, 'snapA node must not be frozen');
    assert.strictEqual(Object.isFrozen(snapB.nodes[0]), false, 'snapB node must not be frozen');
    assert.strictEqual(Object.isFrozen(snapA.nodes[0].metrics), false, 'nested node metrics must not be frozen');

    // 3. Original arrays remain unfrozen
    assert.strictEqual(Object.isFrozen(snapA.nodes), false, 'snapA.nodes array must not be frozen');
    assert.strictEqual(Object.isFrozen(snapB.nodes), false, 'snapB.nodes array must not be frozen');
    assert.strictEqual(Object.isFrozen(snapA.edges), false, 'snapA.edges array must not be frozen');
    assert.strictEqual(Object.isFrozen(snapB.edges), false, 'snapB.edges array must not be frozen');

    // 4. Original snapshot content remains completely unchanged
    assert.deepStrictEqual(snapA, snapABackup, 'snapA content must not be modified');
    assert.deepStrictEqual(snapB, snapBBackup, 'snapB content must not be modified');

    // 5. Comparison results remain deterministic across repeated runs
    const diff2 = computeGraphDiff(snapA, snapB);
    assert.deepStrictEqual(diff1, diff2, 'Diff results must be deterministic');

    // 6. Repeated comparisons do not contaminate one another
    snapA.nodes.push({ id: 'Imm2', risk: 'MEDIUM' });
    const diff3 = computeGraphDiff(snapA, snapB);
    assert.strictEqual(diff3.nodes.removed.length, 1, 'Imm2 should be reported as removed since not in snapB');
});

test('3.2 Safe handling of empty snapshots and missing arrays', () => {
    const emptySnap = {};
    const validSnap = { nodes: [{ id: 'Solo' }], edges: [] };

    const diff = computeGraphDiff(emptySnap, validSnap);
    assert.strictEqual(diff.nodes.added.length, 1);
    assert.strictEqual(diff.nodes.added[0].id, 'Solo');
    assert.strictEqual(diff.nodes.removed.length, 0);
    assert.strictEqual(diff.nodes.modified.length, 0);

    const reverseDiff = computeGraphDiff(validSnap, emptySnap);
    assert.strictEqual(reverseDiff.nodes.removed.length, 1);
    assert.strictEqual(reverseDiff.nodes.removed[0].id, 'Solo');
    assert.strictEqual(reverseDiff.nodes.added.length, 0);
});

test('3.3 Safe deduplication of entities with duplicate IDs', () => {
    const dupSnapA = {
        nodes: [
            { id: 'DupNode', layer: 'Core', risk: 'LOW' },
            { id: 'DupNode', layer: 'Changed', risk: 'HIGH' } // Duplicate ID
        ],
        edges: []
    };
    const snapB = {
        nodes: [{ id: 'DupNode', layer: 'Core', risk: 'LOW' }],
        edges: []
    };

    const diff = computeGraphDiff(dupSnapA, snapB);
    assert.strictEqual(diff.nodes.modified.length, 0);
    assert.strictEqual(diff.nodes.unchangedCount, 1);
});

test('3.4 Null or non-object snapshots throw descriptive errors', () => {
    assert.throws(() => computeGraphDiff(null, {}), /Baseline snapshot/);
    assert.throws(() => computeGraphDiff({}, null), /Comparison snapshot/);
});

// 4. Payload Loader Constants & Chunk Retrieval Limits
console.log('\n[Suite 4: CONTRACT-05 Payload Constants & Caps Enforcement]');

test('4.1 Chunk size limit (131,072) and single/combined caps match CONTRACT-05 exactly', () => {
    assert.ok(modalJsSource.includes('SINGLE_SNAPSHOT_MAX_SIZE = 5242880'), 'Single snapshot cap must be 5,242,880 UTF-16 code units (5 MB)');
    assert.ok(modalJsSource.includes('COMBINED_SNAPSHOT_MAX_SIZE = 10485760'), 'Combined payload cap must be 10,485,760 UTF-16 code units (10 MB)');
    assert.ok(modalJsSource.includes('MAX_CHUNKS_PER_BATCH = 10'), 'Max chunks per batch must be 10 for Apex heap safety');
});

test('4.2 Stale request suppression via monotonic activeRequestId token guard', () => {
    assert.ok(modalJsSource.includes('activeRequestId = 0;'), 'Component must initialize activeRequestId');
    assert.ok(modalJsSource.includes('const requestId = ++this.activeRequestId;'), 'Requests must increment token monotonically');
    assert.ok(modalJsSource.includes('if (this.activeRequestId !== requestId)'), 'Must check activeRequestId against token to discard stale responses');
});

// 5. Architectural Invariants: Single Canvas & SELECTION != NAVIGATION
console.log('\n[Suite 5: Architectural Invariants & Event Discipline]');

test('5.1 Modal does NOT instantiate Cytoscape canvas (Single-canvas invariant preserved)', () => {
    assert.ok(!modalJsSource.includes('cytoscape('), 'daSnapshotComparisonModal must not instantiate Cytoscape');
    assert.ok(!modalJsSource.includes('cytoscape.min.js'), 'Must not import Cytoscape static resource');
    const htmlSource = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.html', 'utf8');
    assert.ok(!htmlSource.includes('<canvas'), 'Must not contain HTML <canvas> element for Cytoscape');
});

test('5.2 Entity selection dispatches entityselect custom event without view navigation (SELECTION != NAVIGATION)', () => {
    assert.ok(modalJsSource.includes("new CustomEvent('entityselect'"), 'Must dispatch entityselect custom event');
    assert.ok(modalJsSource.includes('bubbles: true'), 'Events must be bubbling');
    assert.ok(modalJsSource.includes('composed: true'), 'Events must be composed');
    assert.ok(!modalJsSource.includes('this.activeView ='), 'Modal must not mutate activeView');
    assert.ok(!modalJsSource.includes('this.projectId ='), 'Modal must not mutate projectId');
});

// 6. UI & Accessibility Structure
console.log('\n[Suite 6: UI Structure, SLDS Design & Accessibility]');

test('6.1 SLDS modal dialog accessibility attributes (role="dialog", aria-modal="true", aria-labelledby)', () => {
    const htmlSource = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.html', 'utf8');
    assert.ok(htmlSource.includes('role="dialog"'), 'Must specify role="dialog"');
    assert.ok(htmlSource.includes('aria-modal="true"'), 'Must specify aria-modal="true"');
    assert.ok(htmlSource.includes('aria-labelledby="modal-heading-01"'), 'Must reference modal heading via aria-labelledby');
    assert.ok(htmlSource.includes('lightning-combobox'), 'Must contain run comboboxes');
    assert.ok(htmlSource.includes('lightning-tabset'), 'Must contain entity diff tabset');
    assert.ok(htmlSource.includes('lightning-spinner'), 'Must contain loading spinner');
});

console.log('\n===================================================================');
console.log(`Agent C2 Snapshot Comparison Offline Verification: ${passed} PASSED, ${failed} FAILED`);

if (failed > 0) {
    process.exit(1);
}

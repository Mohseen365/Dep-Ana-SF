/**
 * run-lane-a-schema-tests.cjs
 * Offline Test Suite for Lane A Canonical Filter Schema & Shared Foundation Contract
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function main() {
    console.log('Running Lane A Canonical Filter Schema Offline Test Suite...');
    console.log('===========================================================');

    const schemaModulePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
    assert.ok(fs.existsSync(schemaModulePath), 'daFilterSchema.js must exist');

    const schema = await import('file://' + schemaModulePath);

    let passed = 0;
    let failed = 0;

    function runTest(name, fn) {
        try {
            fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (e) {
            console.error(`  ✗ ${name}: ${e.message}`);
            failed++;
        }
    }

    // Category 1: Schema Constants and 4-State Coverage Vocabulary
    runTest('1. Schema version and constants integrity', () => {
        assert.strictEqual(schema.SCHEMA_VERSION, 2);
        assert.strictEqual(schema.MAX_PAYLOAD_SIZE, 131072);
        assert.deepStrictEqual(
            Array.from(schema.CANONICAL_COVERAGE_STATES),
            ['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN']
        );
        assert.strictEqual(schema.CANONICAL_COVERAGE_STATES.includes('NO_TESTS'), false, 'NO_TESTS is not a canonical evidence state');
        assert.strictEqual(schema.CANONICAL_COVERAGE_STATES.includes('ALL'), false, 'ALL is not a canonical evidence state');
    });

    // Category 2: Default Criteria & Normalization
    runTest('2. Default criteria and normalization', () => {
        const def = schema.getDefaultFilterCriteria();
        assert.strictEqual(def.search, '');
        assert.strictEqual(def.testCoverageStatus, 'ALL');
        assert.deepStrictEqual(def.riskLevels, []);
        assert.deepStrictEqual(def.nodeTypes, []);

        const normalized = schema.normalizeFilterCriteria({
            search: '  AccountService  ',
            riskLevels: ['HIGH', 'INVALID_RISK', 'LOW'],
            testCoverageStatus: 'no_tests',
            nodeTypes: ['ApexClass', '']
        });

        assert.strictEqual(normalized.search, 'AccountService');
        assert.deepStrictEqual(normalized.riskLevels, ['HIGH', 'LOW']);
        assert.strictEqual(normalized.testCoverageStatus, 'UNTESTED', 'no_tests presentation token normalizes to UNTESTED');
        assert.deepStrictEqual(normalized.nodeTypes, ['ApexClass']);
    });

    // Category 3: Legacy V1 to V2 Migration
    runTest('3. Legacy V1 filter upgrade to V2 container', () => {
        const v1Payload = {
            version: 1,
            activePresetId: 'p-1',
            presets: [
                { id: 'p-1', name: 'Preset 1', criteria: { search: 'Test' } }
            ],
            quickFilters: { riskLevels: ['HIGH'] }
        };

        const migrated = schema.migrateV1ToV2Container(v1Payload, '001_proj_alpha');
        assert.strictEqual(migrated.schemaVersion, 2);
        assert.strictEqual(migrated.activePresetId, 'p-1');
        assert.strictEqual(migrated.activeFilter.riskLevels[0], 'HIGH');
        assert.strictEqual(migrated.presets.length, 1);
        assert.strictEqual(migrated.presets[0].projectId, '001_proj_alpha');
    });

    // Category 4: Project Scoping and Isolation (DEC-W4-03)
    runTest('4. Strict project-scoped preset isolation (DEC-W4-03)', () => {
        const multiProjectContainer = {
            schemaVersion: 2,
            activePresetId: 'alpha-1',
            activeFilter: schema.getDefaultFilterCriteria(),
            presets: [
                { id: 'alpha-1', name: 'Alpha Preset', projectId: 'PROJ_ALPHA', criteria: {} },
                { id: 'beta-1', name: 'Beta Preset', projectId: 'PROJ_BETA', criteria: {} }
            ]
        };

        // Validate for PROJ_ALPHA -> should exclude beta-1
        const validatedAlpha = schema.validateAndNormalizeContainer(multiProjectContainer, 'PROJ_ALPHA');
        assert.strictEqual(validatedAlpha.presets.length, 1);
        assert.strictEqual(validatedAlpha.presets[0].id, 'alpha-1');

        // Validate for PROJ_BETA -> should exclude alpha-1 and reset activePresetId since alpha-1 is removed
        const validatedBeta = schema.validateAndNormalizeContainer(multiProjectContainer, 'PROJ_BETA');
        assert.strictEqual(validatedBeta.presets.length, 1);
        assert.strictEqual(validatedBeta.presets[0].id, 'beta-1');
        assert.strictEqual(validatedBeta.activePresetId, null);
    });

    // Category 5: 131,072 Payload Serialization Boundary
    runTest('5. Payload serialization 131,072 boundary enforcement', () => {
        const validContainer = schema.getDefaultFilterContainer();
        const serialized = schema.serializeFilterContainer(validContainer);
        assert.ok(serialized.length <= 131072);

        const oversizedContainer = schema.getDefaultFilterContainer();
        oversizedContainer.activeFilter.search = 'x'.repeat(131073);
        assert.throws(() => {
            schema.serializeFilterContainer(oversizedContainer);
        }, /exceeds maximum capacity of 131072/);
    });

    // Category 6: Per-View Mapping Predicates (DEC-W4-02 & DEC-W4-04)
    runTest('6. Graph node filter predicate mapping', () => {
        const node = {
            id: 'ApexClass:AccountService',
            name: 'AccountService',
            displayName: 'AccountService',
            type: 'ApexClass',
            risk: 'HIGH',
            refactoringReadiness: { testCoverageStatus: 'COVERED' }
        };

        // Matches when search, risk, and coverage align
        assert.strictEqual(schema.matchesGraphNode(node, { search: 'Account', riskLevels: ['HIGH'], testCoverageStatus: 'COVERED' }), true);
        // Excluded when search does not match
        assert.strictEqual(schema.matchesGraphNode(node, { search: 'Contact' }), false);
        // Excluded when risk does not match
        assert.strictEqual(schema.matchesGraphNode(node, { riskLevels: ['LOW'] }), false);
        // Excluded when coverage does not match
        assert.strictEqual(schema.matchesGraphNode(node, { testCoverageStatus: 'UNTESTED' }), false);
        // Unsupported fields in criteria (findingsSeverity) are ignored gracefully
        assert.strictEqual(schema.matchesGraphNode(node, { findingsSeverity: ['CRITICAL'] }), true);
    });

    runTest('7. Matrix edge filter predicate mapping and unresolved edge handling', () => {
        const edge = {
            source: 'ApexClass:AccountController',
            target: 'CustomObject:Account',
            canonical: { source: { type: 'ApexClass' }, target: { type: 'CustomObject' } }
        };
        const srcNode = { id: 'ApexClass:AccountController', type: 'ApexClass', risk: 'LOW' };
        const tgtNode = { id: 'CustomObject:Account', type: 'CustomObject', risk: 'LOW' };

        assert.strictEqual(schema.matchesMatrixEdge(edge, srcNode, tgtNode, { nodeTypes: ['ApexClass', 'CustomObject'] }), true);
        assert.strictEqual(schema.matchesMatrixEdge(edge, srcNode, tgtNode, { nodeTypes: ['ApexTrigger'] }), false);

        // Unresolved edge: targetNode is null; evaluates target type from canonical edge target
        const unresolvedEdge = {
            source: 'ApexClass:AccountController',
            target: 'ExternalService',
            canonical: { source: { type: 'ApexClass' }, target: { type: 'External' } }
        };
        assert.strictEqual(schema.matchesMatrixEdge(unresolvedEdge, srcNode, null, { nodeTypes: ['ApexClass', 'External'] }), true);
        assert.strictEqual(schema.matchesMatrixEdge(unresolvedEdge, srcNode, null, { nodeTypes: ['ApexTrigger'] }), false);
    });

    runTest('8. Findings filter predicate mapping (Distinguishing UNTESTED vs UNKNOWN)', () => {
        const untestedFinding = {
            id: 'untested-1',
            title: 'Untested High-Risk Component: BillingService',
            componentName: 'BillingService',
            componentType: 'ApexClass',
            severity: 'CRITICAL',
            status: 'OPEN',
            testCoverageStatus: 'UNTESTED'
        };

        const unknownFinding = {
            id: 'untested-2',
            title: 'Untested High-Risk Component: LegacyBridge',
            componentName: 'LegacyBridge',
            componentType: 'ApexClass',
            severity: 'HIGH',
            status: 'OPEN',
            testCoverageStatus: 'UNKNOWN'
        };

        // Both match when coverage is ALL
        assert.strictEqual(schema.matchesFindingItem(untestedFinding, { testCoverageStatus: 'ALL' }), true);
        assert.strictEqual(schema.matchesFindingItem(unknownFinding, { testCoverageStatus: 'ALL' }), true);

        // UNTESTED filter includes untestedFinding but excludes unknownFinding (preserving distinction!)
        assert.strictEqual(schema.matchesFindingItem(untestedFinding, { testCoverageStatus: 'UNTESTED' }), true);
        assert.strictEqual(schema.matchesFindingItem(unknownFinding, { testCoverageStatus: 'UNTESTED' }), false);

        // UNKNOWN filter includes unknownFinding but excludes untestedFinding
        assert.strictEqual(schema.matchesFindingItem(untestedFinding, { testCoverageStatus: 'UNKNOWN' }), false);
        assert.strictEqual(schema.matchesFindingItem(unknownFinding, { testCoverageStatus: 'UNKNOWN' }), true);
    });

    runTest('9. High coupling criteria helper (coupling > 15 or fanIn > 10)', () => {
        const normalNode = { metrics: { coupling: 10, fanIn: 5 } };
        const highCouplingNode = { metrics: { coupling: 16, fanIn: 2 } };
        const highFanInNode = { metrics: { coupling: 8, fanIn: 11 } };
        const boundaryCoupling = { metrics: { coupling: 15, fanIn: 10 } };

        assert.strictEqual(schema.isHighCouplingHotspot(normalNode), false);
        assert.strictEqual(schema.isHighCouplingHotspot(highCouplingNode), true);
        assert.strictEqual(schema.isHighCouplingHotspot(highFanInNode), true);
        assert.strictEqual(schema.isHighCouplingHotspot(boundaryCoupling), false, 'Boundary 15 and 10 should not be exceeded');
    });

    console.log('===========================================================');
    console.log(`Summary: ${passed} PASSED, ${failed} FAILED`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

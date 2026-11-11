/**
 * run-lane-f-findings-tests.cjs
 * Hardened Unit Test Suite for Lane F: daFindingsView LWC
 *
 * Verifies:
 * 1. Circular dependencies derived from cycles[] and node flags with deduplication.
 * 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status.
 * 3. Unresolved references derived and deduplicated.
 * 4. Hotspot detected when coupling > 15.
 * 5. Hotspot detected when fanIn > 10.
 * 6. Finding IDs are deterministic and stable across executions.
 * 7. Canonical search filter matches title, description, or componentName.
 * 8. Severity filtering restricts findings to requested levels.
 * 9. Coverage status filter correctly isolates UNTESTED findings.
 * 10. Empty payload yields 0 findings safely.
 * 11. Malformed payload handled safely fail-closed.
 * 12. Nodes missing optional analytics fields processed without errors.
 * 13. Node selection CustomEvent emission adheres strictly to CONTRACT-06 & SELECTION != NAVIGATION.
 * 14. Local review state workflow (OPEN -> IN_REVIEW -> RESOLVED -> OPEN).
 * 15. Expandable structured guidance sections (WHAT, WHY IT MATTERS, WHERE, WHAT TO DO NEXT).
 * 16. Input payload immutability preserved.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runLaneFTests() {
    console.log('Running Lane F (daFindingsView LWC) Focused Unit Test Suite...');
    console.log('==============================================================');

    const schemaModulePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
    const daFilterSchema = await import(`file://${schemaModulePath}`);
    const {
        matchesFindingItem,
        normalizeFilterCriteria,
        isHighCouplingHotspot
    } = daFilterSchema;

    function createFindingsInstance() {
        const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daFindingsView/daFindingsView.js');
        let code = fs.readFileSync(filePath, 'utf8');

        code = code.replace(/import\s+(?:\{[^}]+\}|[A-Za-z0-9_]+)\s+from\s+['\"][^'\"]+['\"];?/g, '');
        code = code.replace(/@api\s+/g, '');
        code = code.replace(/@track\s+/g, '');
        code = code.replace('export default class DaFindingsView', 'class DaFindingsView');
        code += '\nreturn DaFindingsView;';

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

        const CustomEvent = class {
            constructor(type, options) {
                this.type = type;
                this.detail = options ? options.detail : null;
                this.bubbles = options ? !!options.bubbles : false;
                this.composed = options ? !!options.composed : false;
                this.cancelable = options ? !!options.cancelable : false;
            }
        };

        const fn = new Function('LightningElement', 'matchesFindingItem', 'normalizeFilterCriteria', 'isHighCouplingHotspot', 'CustomEvent', code);
        const Cls = fn(LwcMock.LightningElement, matchesFindingItem, normalizeFilterCriteria, isHighCouplingHotspot, CustomEvent);
        return new Cls();
    }

    const testPayload = {
        nodes: [
            // High-risk UNTESTED
            { id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass', risk: 'HIGH', refactoringReadiness: { testCoverageStatus: 'UNTESTED' } },
            // High-risk UNKNOWN
            { id: 'ApexClass:ServiceB', name: 'ServiceB', type: 'ApexClass', risk: 'HIGH', refactoringReadiness: { testCoverageStatus: 'UNKNOWN' } },
            // High-risk COVERED (must NOT generate finding)
            { id: 'ApexClass:ServiceC', name: 'ServiceC', type: 'ApexClass', risk: 'HIGH', refactoringReadiness: { testCoverageStatus: 'COVERED' } },
            // High coupling > 15
            { id: 'ApexClass:CoupledNode', name: 'CoupledNode', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 18, fanIn: 2 } },
            // High fanIn > 10
            { id: 'ApexClass:FanInNode', name: 'FanInNode', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 4, fanIn: 12 } },
            // Cyclic node
            { id: 'ApexClass:CyclicNode', name: 'CyclicNode', type: 'ApexClass', risk: 'LOW', refactoringReadiness: { hasCycles: true } }
        ],
        cycles: [
            ['ApexClass:CycleA', 'ApexClass:CycleB'],
            ['ApexClass:CycleB', 'ApexClass:CycleA'] // Duplicate reversed cycle
        ],
        unresolvedReferences: [
            { source: 'ApexClass:ServiceA', symbol: 'System.MissingUtil' },
            { source: 'ApexClass:ServiceA', symbol: 'System.MissingUtil' } // Duplicate unresolved reference
        ]
    };

    const baselineSnapshot = JSON.parse(JSON.stringify(testPayload));
    let passCount = 0;

    // 1. Circular dependency findings & deduplication
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const cycleFindings = comp.allFindings.filter(f => f.category === 'cycles');
        assert.strictEqual(cycleFindings.length, 2);
        console.log('  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication');
        passCount++;
    }

    // 2. High-risk untested vs unknown findings (Preserves UNTESTED != UNKNOWN)
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const riskFindings = comp.allFindings.filter(f => f.category === 'untested-high-risk');
        assert.strictEqual(riskFindings.length, 2);

        const untestedFinding = riskFindings.find(f => f.componentName === 'ServiceA');
        assert.strictEqual(untestedFinding.testCoverageStatus, 'UNTESTED');
        assert.ok(untestedFinding.title.includes('Untested'));

        const unknownFinding = riskFindings.find(f => f.componentName === 'ServiceB');
        assert.strictEqual(unknownFinding.testCoverageStatus, 'UNKNOWN');
        assert.ok(unknownFinding.title.includes('Unknown Coverage'));
        console.log('  ✓ 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status');
        passCount++;
    }

    // 3. Unresolved reference findings & deduplication
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const unresFindings = comp.allFindings.filter(f => f.category === 'unresolved-references');
        assert.strictEqual(unresFindings.length, 1);
        assert.strictEqual(unresFindings[0].title.includes('System.MissingUtil'), true);
        console.log('  ✓ 3. Unresolved references derived and deduplicated');
        passCount++;
    }

    // 4. High-coupling hotspot from coupling > 15
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const coupledFinding = comp.allFindings.find(f => f.componentName === 'CoupledNode');
        assert.ok(coupledFinding);
        assert.strictEqual(coupledFinding.category, 'coupling-hotspots');
        console.log('  ✓ 4. Hotspot detected when coupling > 15');
        passCount++;
    }

    // 5. High-coupling hotspot from fanIn > 10
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const fanInFinding = comp.allFindings.find(f => f.componentName === 'FanInNode');
        assert.ok(fanInFinding);
        assert.strictEqual(fanInFinding.category, 'coupling-hotspots');
        console.log('  ✓ 5. Hotspot detected when fanIn > 10');
        passCount++;
    }

    // 6. Stable finding identity
    {
        const comp1 = createFindingsInstance();
        comp1.graphPayload = testPayload;
        const comp2 = createFindingsInstance();
        comp2.graphPayload = testPayload;
        assert.deepStrictEqual(comp1.allFindings.map(f => f.id), comp2.allFindings.map(f => f.id));
        console.log('  ✓ 6. Finding IDs are deterministic and stable across executions');
        passCount++;
    }

    // 7. Canonical search filter matching
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        comp.filterCriteria = { search: 'ServiceA' };
        assert.ok(comp.totalFindings >= 2);
        assert.ok(comp.filteredFindings.every(f =>
            (f.title && f.title.includes('ServiceA')) ||
            (f.description && f.description.includes('ServiceA')) ||
            (f.componentName && f.componentName.includes('ServiceA'))
        ));
        console.log('  ✓ 7. Canonical search filter matches title, description, or componentName');
        passCount++;
    }

    // 8. Severity filtering
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        comp.filterCriteria = { findingsSeverity: ['CRITICAL'] };
        assert.ok(comp.totalFindings > 0);
        assert.ok(comp.filteredFindings.every(f => f.severity === 'CRITICAL'));
        console.log('  ✓ 8. Severity filtering restricts findings to requested levels');
        passCount++;
    }

    // 9. Coverage filtering on findings
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        comp.filterCriteria = { testCoverageStatus: 'UNTESTED' };
        const riskFindings = comp.filteredFindings.filter(f => f.category === 'untested-high-risk');
        assert.strictEqual(riskFindings.length, 1);
        assert.strictEqual(riskFindings[0].componentName, 'ServiceA');
        console.log('  ✓ 9. Coverage status filter correctly isolates UNTESTED findings');
        passCount++;
    }

    // 10. Empty payload handling
    {
        const comp = createFindingsInstance();
        comp.graphPayload = { nodes: [], cycles: [], unresolvedReferences: [] };
        assert.strictEqual(comp.totalFindings, 0);
        assert.strictEqual(comp.allFindings.length, 0);
        console.log('  ✓ 10. Empty payload yields 0 findings safely');
        passCount++;
    }

    // 11. Malformed payload string handling
    {
        const comp = createFindingsInstance();
        comp.graphPayload = 'MALFORMED_JSON_STRING';
        assert.strictEqual(comp.totalFindings, 0);
        assert.strictEqual(comp.allFindings.length, 0);
        console.log('  ✓ 11. Malformed payload handled safely fail-closed');
        passCount++;
    }

    // 12. Missing optional analytics fields handling
    {
        const comp = createFindingsInstance();
        comp.graphPayload = {
            nodes: [
                { id: 'ApexClass:BareNode', name: 'BareNode' }
            ]
        };
        assert.strictEqual(comp.allFindings.length, 0);
        console.log('  ✓ 12. Nodes missing optional analytics fields processed without errors');
        passCount++;
    }

    // 13. Node selection CustomEvent emission adheres to CONTRACT-06 & SELECTION != NAVIGATION
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        comp.handleSelectNode({ currentTarget: { dataset: { nodeId: 'ApexClass:ServiceA' } } });

        assert.strictEqual(comp._dispatchedEvents.length, 1);
        const evt = comp._dispatchedEvents[0];
        assert.strictEqual(evt.type, 'nodeselect');
        assert.strictEqual(evt.detail.nodeId, 'ApexClass:ServiceA');
        assert.strictEqual(evt.detail.sourceView, 'findings');
        assert.strictEqual(evt.bubbles, true);
        assert.strictEqual(evt.composed, true);
        assert.strictEqual(evt.cancelable, false, 'CustomEvent must have cancelable: false per CONTRACT-06');
        assert.strictEqual(comp.selectedNodeId, 'ApexClass:ServiceA');
        console.log('  ✓ 13. Node selection CustomEvent emission adheres strictly to CONTRACT-06 & SELECTION != NAVIGATION');
        passCount++;
    }

    // 14. Local review state workflow
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const targetFinding = comp.filteredFindings[0];
        const findingId = targetFinding.id;

        assert.strictEqual(targetFinding.status, 'OPEN');

        // Transition to IN_REVIEW
        comp.handleMarkInReview({ stopPropagation: () => {}, currentTarget: { dataset: { id: findingId } } });
        let updated = comp.filteredFindings.find(f => f.id === findingId);
        assert.strictEqual(updated.status, 'IN_REVIEW');

        // Transition to RESOLVED
        comp.handleResolveFinding({ stopPropagation: () => {}, currentTarget: { dataset: { id: findingId } } });
        updated = comp.filteredFindings.find(f => f.id === findingId);
        assert.strictEqual(updated.status, 'RESOLVED');

        // Reopen to OPEN
        comp.handleReopenFinding({ stopPropagation: () => {}, currentTarget: { dataset: { id: findingId } } });
        updated = comp.filteredFindings.find(f => f.id === findingId);
        assert.strictEqual(updated.status, 'OPEN');
        console.log('  ✓ 14. Local review state workflow (OPEN -> IN_REVIEW -> RESOLVED -> OPEN)');
        passCount++;
    }

    // 15. Expandable structured guidance sections
    {
        const comp = createFindingsInstance();
        comp.graphPayload = testPayload;
        const f0 = comp.filteredFindings[0];
        assert.ok(f0.whyItMatters);
        assert.ok(f0.whatToDoNext);
        assert.strictEqual(f0.isExpanded, false);

        comp.handleToggleDetails({ stopPropagation: () => {}, currentTarget: { dataset: { id: f0.id } } });
        const updated = comp.filteredFindings.find(f => f.id === f0.id);
        assert.strictEqual(updated.isExpanded, true);
        console.log('  ✓ 15. Expandable structured guidance sections (WHAT, WHY IT MATTERS, WHERE, WHAT TO DO NEXT)');
        passCount++;
    }

    // 16. Input payload immutability preserved
    {
        assert.deepStrictEqual(testPayload, baselineSnapshot, 'Payload mutated during operations');
        console.log('  ✓ 16. Input payload immutability preserved');
        passCount++;
    }

    console.log('==============================================================');
    console.log(`Lane F Test Results: ${passCount} PASSED, 0 FAILED`);
}

runLaneFTests().catch(err => {
    console.error('Lane F Test Suite failed:', err);
    process.exit(1);
});

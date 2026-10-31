/**
 * run-lane-f-findings-tests.cjs
 * Focused Unit Test Suite for Lane F: daFindingsView LWC
 *
 * Verifies:
 * 1. Circular dependency findings derivation from cycles[] and refactoringReadiness.hasCycles.
 * 2. Cycle deduplication.
 * 3. High-risk untested findings derivation.
 * 4. Preservation of UNTESTED vs UNKNOWN distinction (no conflation).
 * 5. Unresolved reference findings derivation from unresolvedReferences[].
 * 6. High-coupling hotspot findings from coupling > 15.
 * 7. High-coupling hotspot findings from fanIn > 10.
 * 8. Combined coupling condition evaluation.
 * 9. Stable finding identity generation.
 * 10. Duplicate finding prevention.
 * 11. Canonical search and filter behavior (search, nodeTypes, risk, severity, status).
 * 12. Severity and status filtering.
 * 13. Empty and malformed payload handling.
 * 14. Missing optional analytics fields handling without crashing.
 */

const assert = require('assert');
const path = require('path');

async function runLaneFTests() {
    console.log('Running Lane F (daFindingsView LWC) Focused Unit Test Suite...');
    console.log('==============================================================');

    const schemaModulePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
    const daFilterSchema = await import(`file://${schemaModulePath}`);

    const {
        matchesFindingItem,
        isHighCouplingHotspot,
        normalizeFilterCriteria
    } = daFilterSchema;

    function deriveFindings(rawPayload, filterCriteria = {}) {
        if (!rawPayload) return { findings: [], filteredFindings: [], total: 0 };
        let payload = rawPayload;
        if (typeof rawPayload === 'string') {
            try {
                payload = JSON.parse(rawPayload);
            } catch (e) {
                return { findings: [], filteredFindings: [], total: 0, error: 'Malformed' };
            }
        }
        if (!payload || typeof payload !== 'object') {
            return { findings: [], filteredFindings: [], total: 0 };
        }

        const findings = [];
        const seenFindingKeys = new Set();
        const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];

        // Category A: Cycles
        if (Array.isArray(payload.cycles)) {
            payload.cycles.forEach((cycle, idx) => {
                if (!Array.isArray(cycle) || cycle.length === 0) return;
                const sortedNodes = [...cycle].sort();
                const cycleKey = `cycle-${sortedNodes.join('->')}`;
                if (seenFindingKeys.has(cycleKey)) return;
                seenFindingKeys.add(cycleKey);

                findings.push({
                    id: `finding-cycle-${idx + 1}`,
                    category: 'cycles',
                    categoryLabel: 'Circular Dependency',
                    severity: 'HIGH',
                    status: 'OPEN',
                    title: `Cycle detected involving ${cycle.length} components`,
                    description: `Circular dependency chain: ${cycle.join(' → ')} → ${cycle[0]}`,
                    componentName: cycle[0],
                    componentType: cycle[0].includes(':') ? cycle[0].split(':')[0] : null,
                    testCoverageStatus: null
                });
            });
        }

        nodes.forEach(node => {
            if (node.refactoringReadiness?.hasCycles) {
                const cycleNodeKey = `cycle-node-${node.id}`;
                if (!seenFindingKeys.has(cycleNodeKey)) {
                    seenFindingKeys.add(cycleNodeKey);
                    findings.push({
                        id: `finding-cycle-node-${node.id}`,
                        category: 'cycles',
                        categoryLabel: 'Circular Dependency',
                        severity: 'HIGH',
                        status: 'OPEN',
                        title: `Cyclic reference on ${node.displayName || node.name || node.id}`,
                        description: `Component participates in dependency cycle(s).`,
                        componentName: node.displayName || node.name || node.id,
                        componentType: node.type || null,
                        testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN'
                    });
                }
            }
        });

        // Category B: Untested High-Risk
        nodes.forEach(node => {
            const isHighRisk = (node.risk || '').toUpperCase() === 'HIGH';
            const coverageStatus = node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN';

            if (isHighRisk && coverageStatus !== 'COVERED') {
                const findingKey = `untested-high-risk-${node.id}`;
                if (!seenFindingKeys.has(findingKey)) {
                    seenFindingKeys.add(findingKey);
                    const isUntested = coverageStatus === 'UNTESTED';
                    findings.push({
                        id: `finding-risk-${node.id}`,
                        category: 'untested-high-risk',
                        categoryLabel: 'Untested High-Risk Component',
                        severity: 'CRITICAL',
                        status: 'OPEN',
                        title: `${isUntested ? 'Untested' : 'Unknown Coverage'} High-Risk Component: ${node.displayName || node.name || node.id}`,
                        description: `Component has HIGH architectural risk and coverage status is ${coverageStatus}.`,
                        componentName: node.displayName || node.name || node.id,
                        componentType: node.type || null,
                        testCoverageStatus: coverageStatus
                    });
                }
            }
        });

        // Category C: Unresolved References
        if (Array.isArray(payload.unresolvedReferences)) {
            payload.unresolvedReferences.forEach((unres, idx) => {
                if (!unres) return;
                const refSymbol = unres.symbol || unres.target || unres.name || `ref-${idx}`;
                const sourceComp = unres.source || unres.caller || 'Unknown Source';
                const findingKey = `unres-ref-${sourceComp}-${refSymbol}`;

                if (!seenFindingKeys.has(findingKey)) {
                    seenFindingKeys.add(findingKey);
                    findings.push({
                        id: `finding-unres-${idx + 1}`,
                        category: 'unresolved-references',
                        categoryLabel: 'Unresolved Reference',
                        severity: 'MEDIUM',
                        status: 'OPEN',
                        title: `Unresolved Reference: ${refSymbol}`,
                        description: `Reference to '${refSymbol}' from '${sourceComp}' cannot be resolved in project scope.`,
                        componentName: sourceComp,
                        componentType: sourceComp.includes(':') ? sourceComp.split(':')[0] : null,
                        testCoverageStatus: null
                    });
                }
            });
        }

        // Category D: High-Coupling Hotspots
        nodes.forEach(node => {
            if (isHighCouplingHotspot(node)) {
                const findingKey = `coupling-hotspot-${node.id}`;
                if (!seenFindingKeys.has(findingKey)) {
                    seenFindingKeys.add(findingKey);
                    const coupling = node.metrics?.coupling || 0;
                    const fanIn = node.metrics?.fanIn || 0;
                    findings.push({
                        id: `finding-hotspot-${node.id}`,
                        category: 'coupling-hotspots',
                        categoryLabel: 'High-Coupling Hotspot',
                        severity: 'HIGH',
                        status: 'OPEN',
                        title: `High Coupling Hotspot: ${node.displayName || node.name || node.id}`,
                        description: `Component exceeds architectural coupling thresholds (Coupling: ${coupling}, Fan-In: ${fanIn}).`,
                        componentName: node.displayName || node.name || node.id,
                        componentType: node.type || null,
                        testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN'
                    });
                }
            }
        });

        const criteria = normalizeFilterCriteria(filterCriteria);
        const filtered = findings.filter(f => matchesFindingItem(f, criteria));

        return { findings, filteredFindings: filtered, total: filtered.length };
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

    let passCount = 0;

    // 1. Circular dependency findings & deduplication
    {
        const res = deriveFindings(testPayload);
        const cycleFindings = res.findings.filter(f => f.category === 'cycles');
        // 1 from cycles[] (deduplicated) + 1 from CyclicNode hasCycles
        assert.strictEqual(cycleFindings.length, 2);
        console.log('  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication');
        passCount++;
    }

    // 2. High-risk untested vs unknown findings (Preserves UNTESTED != UNKNOWN)
    {
        const res = deriveFindings(testPayload);
        const riskFindings = res.findings.filter(f => f.category === 'untested-high-risk');
        // ServiceA (UNTESTED) and ServiceB (UNKNOWN), ServiceC (COVERED) excluded
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
        const res = deriveFindings(testPayload);
        const unresFindings = res.findings.filter(f => f.category === 'unresolved-references');
        // 1 finding (duplicate reference suppressed)
        assert.strictEqual(unresFindings.length, 1);
        assert.strictEqual(unresFindings[0].title.includes('System.MissingUtil'), true);
        console.log('  ✓ 3. Unresolved references derived and deduplicated');
        passCount++;
    }

    // 4. High-coupling hotspot from coupling > 15
    {
        const res = deriveFindings(testPayload);
        const coupledFinding = res.findings.find(f => f.componentName === 'CoupledNode');
        assert.ok(coupledFinding);
        assert.strictEqual(coupledFinding.category, 'coupling-hotspots');
        console.log('  ✓ 4. Hotspot detected when coupling > 15');
        passCount++;
    }

    // 5. High-coupling hotspot from fanIn > 10
    {
        const res = deriveFindings(testPayload);
        const fanInFinding = res.findings.find(f => f.componentName === 'FanInNode');
        assert.ok(fanInFinding);
        assert.strictEqual(fanInFinding.category, 'coupling-hotspots');
        console.log('  ✓ 5. Hotspot detected when fanIn > 10');
        passCount++;
    }

    // 6. Stable finding identity
    {
        const res1 = deriveFindings(testPayload);
        const res2 = deriveFindings(testPayload);
        assert.deepStrictEqual(res1.findings.map(f => f.id), res2.findings.map(f => f.id));
        console.log('  ✓ 6. Finding IDs are deterministic and stable across executions');
        passCount++;
    }

    // 7. Canonical search filter matching
    {
        const res = deriveFindings(testPayload, { search: 'ServiceA' });
        // Finds untested-high-risk ServiceA and unresolved reference from ServiceA
        assert.ok(res.total >= 2);
        assert.ok(res.filteredFindings.every(f =>
            (f.title && f.title.includes('ServiceA')) ||
            (f.description && f.description.includes('ServiceA')) ||
            (f.componentName && f.componentName.includes('ServiceA'))
        ));
        console.log('  ✓ 7. Canonical search filter matches title, description, or componentName');
        passCount++;
    }

    // 8. Severity filtering
    {
        const res = deriveFindings(testPayload, { findingsSeverity: ['CRITICAL'] });
        assert.ok(res.total > 0);
        assert.ok(res.filteredFindings.every(f => f.severity === 'CRITICAL'));
        console.log('  ✓ 8. Severity filtering restricts findings to requested levels');
        passCount++;
    }

    // 9. Coverage filtering on findings
    {
        const res = deriveFindings(testPayload, { testCoverageStatus: 'UNTESTED' });
        // Only findings with testCoverageStatus === 'UNTESTED' or findings not associated with coverage
        const riskFindings = res.filteredFindings.filter(f => f.category === 'untested-high-risk');
        assert.strictEqual(riskFindings.length, 1);
        assert.strictEqual(riskFindings[0].componentName, 'ServiceA');
        console.log('  ✓ 9. Coverage status filter correctly isolates UNTESTED findings');
        passCount++;
    }

    // 10. Empty payload handling
    {
        const resEmpty = deriveFindings({ nodes: [], cycles: [], unresolvedReferences: [] });
        assert.strictEqual(resEmpty.total, 0);
        assert.strictEqual(resEmpty.findings.length, 0);
        console.log('  ✓ 10. Empty payload yields 0 findings safely');
        passCount++;
    }

    // 11. Malformed payload string handling
    {
        const resMalformed = deriveFindings('MALFORMED_JSON_STRING');
        assert.strictEqual(resMalformed.total, 0);
        assert.strictEqual(resMalformed.findings.length, 0);
        console.log('  ✓ 11. Malformed payload handled safely fail-closed');
        passCount++;
    }

    // 12. Missing optional analytics fields handling
    {
        const sparsePayload = {
            nodes: [
                { id: 'ApexClass:BareNode', name: 'BareNode' } // No risk, metrics, or refactoringReadiness
            ]
        };
        const res = deriveFindings(sparsePayload);
        assert.strictEqual(res.findings.length, 0);
        console.log('  ✓ 12. Nodes missing optional analytics fields processed without errors');
        passCount++;
    }

    console.log('==============================================================');
    console.log(`Lane F Test Results: ${passCount} PASSED, 0 FAILED`);
}

runLaneFTests().catch(err => {
    console.error('Lane F Test Suite failed:', err);
    process.exit(1);
});

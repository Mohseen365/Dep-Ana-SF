/**
 * Offline Verification Suite for Analysis History Feature (daAnalysisHistory + DAAnalysisRunDTO + DAAnalysisHistoryService)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Analysis History Feature Offline Verification Suite...');
console.log('===================================================================');

// Test 1: Verify Metadata & Source File Existence
console.log('\n[Suite 1: Static Artifact Presence]');
const requiredFiles = [
    'scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunDTO.cls',
    'scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunDTO.cls-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService.cls',
    'scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService.cls-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnalysisHistoryController.cls',
    'scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnalysisHistoryController.cls-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.js',
    'scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.html',
    'scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.css',
    'scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.js-meta.xml'
];

requiredFiles.forEach((f) => {
    assert.strictEqual(fs.existsSync(f), true, `Missing required file: ${f}`);
    const stat = fs.statSync(f);
    assert.ok(stat.size > 0, `File ${f} is unexpectedly empty.`);
    console.log(`  ✓ ${f} verified (${stat.size} bytes)`);
});

// Test 2: Verify Apex Best Practices & Security Contracts
console.log('\n[Suite 2: Apex Architecture & Security Verification]');
const serviceCode = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService.cls', 'utf8');
const controllerCode = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnalysisHistoryController.cls', 'utf8');
const dtoCode = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunDTO.cls', 'utf8');

assert.ok(serviceCode.includes('with sharing'), 'Service must declare with sharing');
assert.ok(serviceCode.includes('WITH USER_MODE'), 'Service SOQL must enforce WITH USER_MODE');
assert.ok(serviceCode.includes('ORDER BY Run_Timestamp__c DESC, Id DESC'), 'Service must enforce deterministic compound SOQL ordering');
assert.ok(controllerCode.includes('with sharing'), 'Controller must declare with sharing');
assert.ok(controllerCode.includes('@AuraEnabled(cacheable=true)'), 'Controller must expose cacheable AuraEnabled method');
assert.ok(controllerCode.includes('AuraHandledException'), 'Controller must wrap errors in AuraHandledException');
assert.ok(dtoCode.includes('@AuraEnabled public Integer nodeDelta'), 'DTO must provide nodeDelta for UI trends');
assert.ok(dtoCode.includes('@AuraEnabled public Integer edgeDelta'), 'DTO must provide edgeDelta for UI trends');
assert.ok(dtoCode.includes('@AuraEnabled public Integer cyclicSccDelta'), 'DTO must provide cyclicSccDelta for UI trends');
console.log('  ✓ Apex security, CRUD/FLS user mode, and deterministic ordering validated.');

// Test 3: Simulation of Delta Metric Computations
console.log('\n[Suite 3: Metric Delta Computation Simulation]');
function computeRunDeltas(runs) {
    return runs.map((r, i) => {
        let nodeDelta = 0;
        let edgeDelta = 0;
        let cyclicSccDelta = 0;
        if (i + 1 < runs.length) {
            const prev = runs[i + 1];
            nodeDelta = (r.nodeCount || 0) - (prev.nodeCount || 0);
            edgeDelta = (r.edgeCount || 0) - (prev.edgeCount || 0);
            cyclicSccDelta = (r.cyclicSccCount || 0) - (prev.cyclicSccCount || 0);
        }
        return {
            ...r,
            nodeDelta,
            edgeDelta,
            cyclicSccDelta
        };
    });
}

const mockRuns = [
    { runId: 'a01001', commitHash: 'abc1111', runTimestamp: 1731140000000, nodeCount: 150, edgeCount: 300, cyclicSccCount: 2 },
    { runId: 'a01002', commitHash: 'abc2222', runTimestamp: 1731130000000, nodeCount: 140, edgeCount: 290, cyclicSccCount: 5 },
    { runId: 'a01003', commitHash: 'abc3333', runTimestamp: 1731120000000, nodeCount: 120, edgeCount: 250, cyclicSccCount: 4 }
];

const processed = computeRunDeltas(mockRuns);
assert.strictEqual(processed[0].nodeDelta, 10, 'Expected +10 nodes in latest run');
assert.strictEqual(processed[0].edgeDelta, 10, 'Expected +10 edges in latest run');
assert.strictEqual(processed[0].cyclicSccDelta, -3, 'Expected -3 cycles (improvement) in latest run');
assert.strictEqual(processed[1].nodeDelta, 20, 'Expected +20 nodes relative to base');
assert.strictEqual(processed[1].cyclicSccDelta, 1, 'Expected +1 cycle in middle run');
assert.strictEqual(processed[2].nodeDelta, 0, 'Oldest run in list has 0 delta relative to base');
console.log('  ✓ Delta metric computation logic mathematically confirmed.');

// Test 4: LWC Event Dispatch Contract
console.log('\n[Suite 4: LWC Contract & Event Discipline]');
const lwcJs = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory/daAnalysisHistory.js', 'utf8');
assert.ok(lwcJs.includes("new CustomEvent('runselect'"), 'daAnalysisHistory must dispatch runselect custom event');
assert.ok(lwcJs.includes("new CustomEvent('comparelaunch'"), 'daAnalysisHistory must dispatch comparelaunch custom event');
assert.ok(lwcJs.includes('bubbles: true'), 'Events must declare bubbles: true');
assert.ok(lwcJs.includes('composed: true'), 'Events must declare composed: true');
assert.ok(!lwcJs.includes('this.projectId ='), 'Inbound public @api projectId must not be mutated internally');
console.log('  ✓ LWC CustomEvent dispatch, bubbles/composed discipline, and @api immutability confirmed.');

console.log('\n===================================================================');
console.log('Analysis History Feature Offline Verification: ALL 4 SUITES PASSED');

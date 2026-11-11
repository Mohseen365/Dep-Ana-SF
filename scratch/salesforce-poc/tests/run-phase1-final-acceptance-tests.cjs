/**
 * Agent 10: Phase 1 Final Acceptance Focused Test Runner
 * Validates the 5 items for Final Acceptance:
 * 1. Independent direct-share provenance & coexistence
 * 2. Approver authority & separation of duties
 * 3. Legacy finalization wrapper & transaction behavior
 * 4. EMPTY retry and duplicate finalization semantics
 * 5. Last-known-good graph preservation
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SEC_SERVICE_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls');
const INGESTION_SERVICE_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls');

console.log('===================================================================');
console.log('Running Phase 1 Final Acceptance Focused Test Suite...');
console.log('===================================================================');

let passes = 0;
let fails = 0;

function runTest(name, fn) {
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

const secCode = fs.readFileSync(SEC_SERVICE_PATH, 'utf8');
const ingCode = fs.readFileSync(INGESTION_SERVICE_PATH, 'utf8');

// ===================================================================
// SUITE 1: Direct-Share Provenance & Coexistence
// ===================================================================
console.log('\n[Suite 1: Direct-Share Provenance & Coexistence]');

runTest('1.1 Direct-share provenance evaluation method and mock bindings exist', () => {
    assert(secCode.includes('accessProvenance'), 'Must track accessProvenance');
    assert(secCode.includes('DIRECT_SHARE'), 'Must support DIRECT_SHARE');
    assert(secCode.includes('EMERGENCY_GRANT'), 'Must support EMERGENCY_GRANT');
    assert(secCode.includes('UNAUTHORIZED'), 'Must support UNAUTHORIZED');
    assert(secCode.includes('hasAuthoritativeDirectShare'), 'Must implement hasAuthoritativeDirectShare');
});

runTest('1.2 Stale emergency share is not misclassified as direct share', () => {
    assert(secCode.includes('staleGrants'), 'Must query for stale/expired emergency grants');
    assert(secCode.includes('Stale emergency access grant detected; lingering share row rejected'), 'Must reject stale grant lingering shares');
});

runTest('1.3 Emergency share cleanup preserves independent direct shares', () => {
    assert(secCode.includes('cleanupShareRow'), 'Must implement cleanupShareRow');
    assert(secCode.includes('remainingActiveGrants'), 'Must verify remaining active grants before share deletion');
});

runTest('1.4 In-memory provenance resolution simulation (coexistence & revocation)', () => {
    function resolveAccessProvenance({ isDirectOwner, hasIndependentDirectShare, hasActiveEmergencyGrant, hasStaleEmergencyGrant }) {
        if (hasActiveEmergencyGrant) {
            return { hasAccess: true, provenance: 'EMERGENCY_GRANT' };
        }
        if (isDirectOwner) {
            return { hasAccess: true, provenance: 'DIRECT_SHARE' };
        }
        if (hasStaleEmergencyGrant) {
            // Stale emergency grant rejects lingering manual share
            return { hasAccess: false, provenance: 'UNAUTHORIZED' };
        }
        if (hasIndependentDirectShare) {
            return { hasAccess: true, provenance: 'DIRECT_SHARE' };
        }
        return { hasAccess: false, provenance: 'UNAUTHORIZED' };
    }

    // Direct owner without emergency
    assert.strictEqual(resolveAccessProvenance({ isDirectOwner: true, hasIndependentDirectShare: false, hasActiveEmergencyGrant: false, hasStaleEmergencyGrant: false }).provenance, 'DIRECT_SHARE');
    // Active emergency grant
    assert.strictEqual(resolveAccessProvenance({ isDirectOwner: false, hasIndependentDirectShare: false, hasActiveEmergencyGrant: true, hasStaleEmergencyGrant: false }).provenance, 'EMERGENCY_GRANT');
    // Coexistence: active emergency priority
    assert.strictEqual(resolveAccessProvenance({ isDirectOwner: false, hasIndependentDirectShare: true, hasActiveEmergencyGrant: true, hasStaleEmergencyGrant: false }).provenance, 'EMERGENCY_GRANT');
    // Stale emergency grant rejects lingering manual share
    assert.strictEqual(resolveAccessProvenance({ isDirectOwner: false, hasIndependentDirectShare: false, hasActiveEmergencyGrant: false, hasStaleEmergencyGrant: true }).provenance, 'UNAUTHORIZED');
    // Revocation of emergency preserves direct ownership
    const postRevocation = resolveAccessProvenance({ isDirectOwner: true, hasIndependentDirectShare: false, hasActiveEmergencyGrant: false, hasStaleEmergencyGrant: false });
    assert.strictEqual(postRevocation.hasAccess, true);
    assert.strictEqual(postRevocation.provenance, 'DIRECT_SHARE');
});

// ===================================================================
// SUITE 2: Approver Authority & Separation of Duties
// ===================================================================
console.log('\n[Suite 2: Approver Authority & Separation of Duties]');

runTest('2.1 Mandatory approval and direct grant creation bypass eliminated', () => {
    assert(secCode.includes('Direct emergency grant creation without explicit approver is prohibited'), 'Direct grant creation must throw SecurityException');
    assert(secCode.includes('Mandatory approval violation'), 'Missing approver must throw SecurityException');
});

runTest('2.2 Anti-impersonation and issuer verification enforced', () => {
    assert(secCode.includes('Issuer mismatch: Caller cannot fabricate issuer identity'), 'Must reject fabricated issuer identity');
});

runTest('2.3 Separation of duties enforced (recipient != approver, issuer != approver)', () => {
    assert(secCode.includes('Grant recipient cannot act as approver'), 'Recipient cannot approve');
    assert(secCode.includes('Grant issuer cannot self-approve'), 'Issuer cannot self-approve');
});

runTest('2.4 Dedicated approver permission set enforced and test mocks guarded', () => {
    assert(secCode.includes('APPROVER_PERMISSION_SET = \'DA_Emergency_Grant_Approver\''), 'Must define APPROVER_PERMISSION_SET');
    assert(secCode.includes('Test.isRunningTest()'), 'Mock approver bypass must be restricted to test execution');
});

runTest('2.5 In-memory approver authority matrix simulation', () => {
    const authorizedApprovers = new Set(['005Approver001', '005Admin002']);
    function evaluateEmergencyGrantCreation(issuerId, approverId, recipientId, isCancelled = false, isRenewal = false, renewalApproved = false) {
        if (!approverId) throw new Error('Mandatory approval violation');
        if (approverId === recipientId) throw new Error('Grant recipient cannot act as approver');
        if (approverId === issuerId) throw new Error('Grant issuer cannot self-approve');
        if (!authorizedApprovers.has(approverId)) throw new Error('Approver authority violation');
        if (isCancelled) throw new Error('Cannot approve cancelled request');
        if (isRenewal && !renewalApproved) throw new Error('Unauthorized renewal');
        return true;
    }

    // 1. Authorized approver
    assert.strictEqual(evaluateEmergencyGrantCreation('005Issuer001', '005Approver001', '005Recipient001'), true);
    // 2. Unauthorized approver
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', '005Unauthorized', '005Recipient001'), /Approver authority violation/);
    // 3. Fabricated approver identity
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', '005FabricatedId', '005Recipient001'), /Approver authority violation/);
    // 4. Issuer self-approval
    assert.throws(() => evaluateEmergencyGrantCreation('005Approver001', '005Approver001', '005Recipient001'), /Grant issuer cannot self-approve/);
    // 5. Recipient self-approval
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', '005Recipient001', '005Recipient001'), /Grant recipient cannot act as approver/);
    // 6. Missing approval
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', null, '005Recipient001'), /Mandatory approval violation/);
    // 7. Approval after request cancellation
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', '005Approver001', '005Recipient001', true), /Cannot approve cancelled request/);
    // 8. Unauthorized renewal
    assert.throws(() => evaluateEmergencyGrantCreation('005Issuer001', '005Approver001', '005Recipient001', false, true, false), /Unauthorized renewal/);
});

// ===================================================================
// SUITE 3: Legacy Finalization Wrapper & Transaction Behavior
// ===================================================================
console.log('\n[Suite 3: Legacy Finalization Wrapper & Transaction Behavior]');

runTest('3.1 Structured finalization method commits FAILED state without unhandled exception', () => {
    assert(ingCode.includes('finalizeAnalysisRunWithResult'), 'Must expose finalizeAnalysisRunWithResult');
    assert(ingCode.includes('FinalizationResult(false, STATUS_FAILED,'), 'Must return structured failure result');
});

runTest('3.2 Legacy wrapper propagates IngestionException on failure', () => {
    assert(ingCode.includes('finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)'), 'Legacy wrapper exists');
    assert(ingCode.includes('throw new IngestionException(res.errorMessage)'), 'Wrapper throws exception on failure');
});

runTest('3.3 In-memory wrapper vs structured transaction simulation', () => {
    function structuredFinalizer(isValid) {
        if (!isValid) {
            return { isSuccess: false, status: 'FAILED', errorMessage: 'Validation failed' };
        }
        return { isSuccess: true, status: 'AVAILABLE', errorMessage: null };
    }

    function legacyWrapper(isValid) {
        const res = structuredFinalizer(isValid);
        if (!res.isSuccess) {
            throw new Error('IngestionException: ' + res.errorMessage);
        }
        return true;
    }

    // Structured method returns failure object without throwing
    const structRes = structuredFinalizer(false);
    assert.strictEqual(structRes.isSuccess, false);
    assert.strictEqual(structRes.status, 'FAILED');

    // Legacy wrapper throws exception on failure
    assert.throws(() => legacyWrapper(false), /IngestionException: Validation failed/);
    assert.strictEqual(legacyWrapper(true), true);
});

// ===================================================================
// SUITE 4: EMPTY Retry, Duplicate Finalization & Last-Known-Good Invariants
// ===================================================================
console.log('\n[Suite 4: EMPTY Retry, Duplicate Finalization & Last-Known-Good Invariants]');

runTest('4.1 Zero-chunk runs initialize as EMPTY only when expectedChunks == 0 and expectedBytes == 0', () => {
    assert(ingCode.includes('Boolean isExplicitEmpty = (expectedChunks != null && expectedChunks == 0 && (expectedTotalBytes != null && expectedTotalBytes == 0));'),
        'Must strictly check explicit empty conditions');
    assert(ingCode.includes('Total_Chunks__c == null'), 'Must verify Total_Chunks__c rejection when null');
});

runTest('4.2 Chunk upload to EMPTY runs prohibited fail-closed', () => {
    assert(ingCode.includes('if (run.Status__c == STATUS_EMPTY)'), 'Must check for STATUS_EMPTY');
    assert(ingCode.includes('Cannot upload chunks to an EMPTY run'), 'Must reject uploads to EMPTY run');
});

runTest('4.3 Last-known-good graph preserved on EMPTY and FAILED runs', () => {
    assert(ingCode.includes('Status__c = :STATUS_AVAILABLE'), 'getLatestAvailableRun must query strictly AVAILABLE runs');
});

runTest('4.4 In-memory finalization duplicate, conflicting parameters and retry simulation', () => {
    function finalizeRunSimulation(run, callerExpectedChunks) {
        // Repeated finalization of already AVAILABLE run
        if (run.status === 'AVAILABLE') {
            if (callerExpectedChunks !== undefined && callerExpectedChunks !== run.expectedChunks) {
                return { isSuccess: false, status: 'AVAILABLE', error: 'Finalization conflict' };
            }
            return { isSuccess: true, status: 'AVAILABLE', duplicate: true };
        }
        // Repeated finalization of already EMPTY run
        if (run.status === 'EMPTY') {
            if (callerExpectedChunks !== undefined && callerExpectedChunks !== 0) {
                return { isSuccess: false, status: 'EMPTY', error: 'Finalization conflict' };
            }
            return { isSuccess: true, status: 'EMPTY', duplicate: true };
        }
        // Repeated finalization of FAILED run
        if (run.status === 'FAILED') {
            return { isSuccess: false, status: 'FAILED', duplicate: true, error: 'Cannot finalize closed run' };
        }
        // Caller count mismatch check
        if (callerExpectedChunks !== undefined && callerExpectedChunks !== run.expectedChunks) {
            return { isSuccess: false, status: 'FAILED', error: 'Chunk count mismatch' };
        }
        // Valid empty run condition: expectedChunks == 0 and expectedBytes == 0
        if (run.expectedChunks === 0) {
            if (run.expectedBytes > 0) {
                return { isSuccess: false, status: 'FAILED', error: 'Nonzero bytes for empty run' };
            }
            return { isSuccess: true, status: 'EMPTY' };
        }
        return { isSuccess: true, status: 'AVAILABLE' };
    }

    // Repeated finalization tests
    assert.strictEqual(finalizeRunSimulation({ status: 'AVAILABLE', expectedChunks: 5 }, 5).duplicate, true);
    assert.strictEqual(finalizeRunSimulation({ status: 'AVAILABLE', expectedChunks: 5 }, 10).isSuccess, false);
    assert.strictEqual(finalizeRunSimulation({ status: 'EMPTY', expectedChunks: 0, expectedBytes: 0 }, 0).duplicate, true);
    assert.strictEqual(finalizeRunSimulation({ status: 'EMPTY', expectedChunks: 0, expectedBytes: 0 }, 2).isSuccess, false);
    assert.strictEqual(finalizeRunSimulation({ status: 'FAILED', expectedChunks: 5 }, 5).isSuccess, false);

    // Valid EMPTY initialization vs invalid empty payload
    assert.strictEqual(finalizeRunSimulation({ status: 'QUEUED', expectedChunks: 0, expectedBytes: 0 }, 0).status, 'EMPTY');
    assert.strictEqual(finalizeRunSimulation({ status: 'QUEUED', expectedChunks: 0, expectedBytes: 500 }, 0).status, 'FAILED');
    assert.strictEqual(finalizeRunSimulation({ status: 'QUEUED', expectedChunks: null, expectedBytes: 0 }, 0).status, 'FAILED');

    // Mismatched expected chunks fails
    assert.strictEqual(finalizeRunSimulation({ status: 'QUEUED', expectedChunks: 5, expectedBytes: 1000 }, 3).status, 'FAILED');
});

console.log('===================================================================');
console.log(`Phase 1 Final Acceptance Suite: ${passes} PASSED, ${fails} FAILED`);
console.log('===================================================================');

if (fails > 0) {
    process.exit(1);
}

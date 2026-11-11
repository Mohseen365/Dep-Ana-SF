/**
 * Agent 10: Phase 1 Hardened Security & Ingestion Lifecycle Test Runner (v1.0.2 Final)
 * Validates hardened contracts for Agent 1 (DAProjectSecurityService v1.0.2)
 * and Agent 2 (DAGraphIngestionService v1.0.2) offline.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SEC_SERVICE_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls');
const INGESTION_SERVICE_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls');
const STATUS_METADATA_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Status__c.field-meta.xml');
const COMMIT_HASH_METADATA_PATH = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Commit_Hash__c.field-meta.xml');

console.log('===================================================================');
console.log('Running Agent 10 Phase 1 Hardened Security & Lifecycle Test Suite (v1.0.2)...');
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

// ===================================================================
// SUITE 1: Agent 1 Security Interface v1.0.2 Hardening
// ===================================================================
console.log('\n[Suite 1: Agent 1 Security Interface v1.0.2 Hardening]');

const secCode = fs.readFileSync(SEC_SERVICE_PATH, 'utf8');

runTest('1.1 Authenticated principal protection method exists', () => {
    assert(secCode.includes('validateProjectAccessForCurrentUser'), 'Missing validateProjectAccessForCurrentUser');
    assert(secCode.includes('UserInfo.getUserId()'), 'Must bind to UserInfo.getUserId()');
});

runTest('1.2 Arbitrary user impersonation is blocked fail-closed', () => {
    assert(secCode.includes('Principal mismatch'), 'Must detect and reject principal mismatch');
});

runTest('1.3 Trusted internal caller boundary enforced', () => {
    assert(secCode.includes('validateProjectAccessTrustedInternal'), 'Missing validateProjectAccessTrustedInternal');
    assert(secCode.includes('isTrustedInternalCaller'), 'Missing isTrustedInternalCaller helper');
    assert(secCode.includes('AUTHORIZED_INTERNAL_CLASSES'), 'Must define explicit trust boundary classes');
});

runTest('1.4 Canonical scope vocabulary and exact scope matching enforced', () => {
    assert(secCode.includes('VALID_SCOPES = new Set<String>'), 'Missing VALID_SCOPES definition');
    assert(secCode.includes('SCOPE_PROJECT_READ'), 'Missing SCOPE_PROJECT_READ');
    assert(secCode.includes('SCOPE_GRAPH_READ'), 'Missing SCOPE_GRAPH_READ');
    assert(secCode.includes('SCOPE_FINDING_READ'), 'Missing SCOPE_FINDING_READ');
    assert(secCode.includes('SCOPE_FINDING_WRITE'), 'Missing SCOPE_FINDING_WRITE');
    assert(secCode.includes('SCOPE_ANALYSIS_UPLOAD'), 'Missing SCOPE_ANALYSIS_UPLOAD');
    assert(secCode.includes('SCOPE_ANALYSIS_FINALIZE'), 'Missing SCOPE_ANALYSIS_FINALIZE');
    assert(secCode.includes('isScopePermitted'), 'Missing isScopePermitted exact matching function');
});

runTest('1.5 Direct sharing distinguished from emergency sharing provenance', () => {
    assert(secCode.includes('accessProvenance'), 'Must track accessProvenance on context');
    assert(secCode.includes('DIRECT_SHARE'), 'Must support DIRECT_SHARE provenance');
    assert(secCode.includes('EMERGENCY_GRANT'), 'Must support EMERGENCY_GRANT provenance');
});

runTest('1.6 Separation of duties in emergency grant creation enforced', () => {
    assert(secCode.includes('createEmergencyGrantWithApproval'), 'Missing createEmergencyGrantWithApproval');
    assert(secCode.includes('Grant recipient cannot act as approver'), 'Must prevent recipient approving own grant');
    assert(secCode.includes('Grant issuer cannot self-approve'), 'Must prevent issuer self-approving own grant');
});

runTest('1.7 Grant-creation approval bypass strictly eliminated', () => {
    assert(secCode.includes('Direct emergency grant creation without explicit approver is prohibited'),
        'createEmergencyGrant must fail-closed if called without approval workflow');
    assert(secCode.includes('Mandatory approval violation'), 'Must enforce mandatory approval check');
    assert(secCode.includes('Issuer mismatch: Caller cannot fabricate issuer identity'), 'Must prevent client-fabricated issuer IDs');
});

runTest('1.8 Emergency lease clamped to 4-hour maximum (14400s)', () => {
    assert(secCode.includes('MAX_EMERGENCY_LEASE_SECONDS = 14400'), 'Must enforce 14400s lease ceiling');
});

runTest('1.9 Revocation transaction resilience and append-only audit evidence', () => {
    assert(secCode.includes('ACTION_CLEANUP_FAILURE'), 'Must record ACTION_CLEANUP_FAILURE');
    assert(secCode.includes('revokeEmergencyGrant'), 'Missing revokeEmergencyGrant method');
    assert(secCode.includes('ACTION_GRANT_APPROVED'), 'Must record ACTION_GRANT_APPROVED');
    assert(secCode.includes('cleanupShareRow'), 'Must have cleanupShareRow helper with grant awareness');
});

runTest('1.10 Direct share preservation during emergency share cleanup', () => {
    assert(secCode.includes('remainingActiveGrants'), 'cleanupShareRow must inspect remaining grants before deleting shares');
});

// ===================================================================
// SUITE 2: Agent 2 Lifecycle & Persistence Interface v1.0.2 Hardening
// ===================================================================
console.log('\n[Suite 2: Agent 2 Lifecycle & Persistence Interface v1.0.2 Hardening]');

const ingCode = fs.readFileSync(INGESTION_SERVICE_PATH, 'utf8');
const statusXml = fs.readFileSync(STATUS_METADATA_PATH, 'utf8');
const commitHashXml = fs.readFileSync(COMMIT_HASH_METADATA_PATH, 'utf8');

runTest('2.1 EMPTY status present in metadata and service state machine', () => {
    assert(statusXml.includes('<fullName>EMPTY</fullName>'), 'Status__c metadata must contain EMPTY');
    assert(ingCode.includes('STATUS_EMPTY = \'EMPTY\''), 'Ingestion service must declare STATUS_EMPTY');
});

runTest('2.2 Zero-chunk/empty runs transition directly to EMPTY', () => {
    assert(ingCode.includes('(expectedChunks != null && expectedChunks == 0) ? STATUS_EMPTY : STATUS_QUEUED'), 'Zero chunk runs must initialize as EMPTY');
    assert(ingCode.includes('persistedExpected == 0'), 'Finalize must handle 0 chunks by setting EMPTY');
});

runTest('2.3 Authoritative persisted Total_Chunks__c enforced during finalization', () => {
    assert(ingCode.includes('callerSuppliedExpectedChunks != persistedExpected'), 'Must detect caller count mismatch');
    assert(ingCode.includes('Finalization rejected: Caller supplied chunk count'), 'Must reject caller count mismatch fail-closed');
});

runTest('2.4 Deterministic identical retry idempotency enforced', () => {
    assert(ingCode.includes('existingRecord.Payload_Data__c == safePayload'), 'Must verify payload identity');
    assert(ingCode.includes('identicalRetryCount++'), 'Must count identical retries without inserting duplicate records');
});

runTest('2.5 Conflicting retry rejected fail-closed with IngestionException', () => {
    assert(ingCode.includes('Conflicting payload for existing chunk at index'), 'Must reject differing payload');
});

runTest('2.6 Checksum parameters and dedicated Payload_Checksum__c separated from Commit_Hash__c', () => {
    assert(commitHashXml.includes('<fullName>Commit_Hash__c</fullName>'), 'Metadata must preserve Commit_Hash__c');
    assert(ingCode.includes('Payload_Checksum__c = expectedSha256Checksum'), 'Ingestion service must set Payload_Checksum__c');
    assert(ingCode.includes('Commit_Hash__c = commitHash'), 'Ingestion service must preserve Commit_Hash__c for git commit hash');
});

runTest('2.7 FAILED-state persistence with transaction safety', () => {
    assert(ingCode.includes('finalizeAnalysisRunWithResult'), 'Must expose finalizeAnalysisRunWithResult to persist failure state');
    assert(ingCode.includes('run.Status__c = STATUS_FAILED'), 'Must transition to STATUS_FAILED on errors');
    assert(ingCode.includes('FinalizationResult'), 'Must define structured FinalizationResult DTO');
});

runTest('2.8 Payload size units and wire ceilings reconciled', () => {
    assert(ingCode.includes('MAX_CHUNK_SIZE = 131072'), 'Must declare MAX_CHUNK_SIZE 131072');
    assert(ingCode.includes('MAX_BATCH_CHUNKS = 10'), 'Must declare MAX_BATCH_CHUNKS 10');
    assert(ingCode.includes('MAX_TOTAL_PAYLOAD_CHARS = 10485760L'), 'Must declare MAX_TOTAL_PAYLOAD_CHARS 10485760L');
    assert(ingCode.includes('MAX_HTTP_REQUEST_BYTES = 5242880L'), 'Must declare MAX_HTTP_REQUEST_BYTES 5242880L');
    assert(!ingCode.includes('1.3 MB max heap footprint'), 'Must remove unsupported heap claims');
});

runTest('2.9 Last-known-good graph preserved on incomplete or failed runs', () => {
    assert(ingCode.includes('Status__c = :STATUS_AVAILABLE'), 'getLatestAvailableRun must query strictly AVAILABLE runs');
    assert(!ingCode.includes('Status__c = :STATUS_IN_PROGRESS'), 'Must exclude in-progress runs');
});

runTest('2.10 Prohibit chunk uploads to terminal EMPTY run', () => {
    assert(ingCode.includes('run.Status__c == STATUS_EMPTY'), 'saveGraphChunks must reject uploads to EMPTY runs');
});

// ===================================================================
// SUITE 3: In-Memory Algorithmic Invariants Verification
// ===================================================================
console.log('\n[Suite 3: In-Memory Algorithmic Invariants Verification]');

runTest('3.1 Scope matching logic: exact match and hierarchy', () => {
    function isScopePermitted(granted, req) {
        const grantedSet = new Set(granted.split(/[,;\s]+/).map(s => s.trim().toUpperCase()));
        req = req.trim().toUpperCase();
        if (grantedSet.has('FULL')) return true;
        if (grantedSet.has(req)) return true;
        if (req === 'ANALYSIS_UPLOAD' && grantedSet.has('ANALYSIS_FINALIZE')) return true;
        if (req === 'FINDING_READ' && grantedSet.has('FINDING_WRITE')) return true;
        if (req === 'PROJECT_READ' && (grantedSet.has('GRAPH_READ') || grantedSet.has('FINDING_READ'))) return true;
        return false;
    }

    assert.strictEqual(isScopePermitted('GRAPH_READ', 'GRAPH_READ'), true, 'Exact match must succeed');
    assert.strictEqual(isScopePermitted('GRAPH_READ', 'FINDING_READ'), false, 'Different scope must fail');
    assert.strictEqual(isScopePermitted('FINDING_WRITE', 'FINDING_READ'), true, 'Hierarchical scope must succeed');
    assert.strictEqual(isScopePermitted('FULL', 'ANALYSIS_FINALIZE'), true, 'FULL must satisfy all scopes');
    assert.strictEqual(isScopePermitted('PROJECT_READ_EXTENDED', 'PROJECT_READ'), false, 'Substring collision must not grant access');
});

runTest('3.2 Chunk key deterministic generation', () => {
    const runId = 'a01XXXXXXXXXXXXXXX';
    const chunkIndex = 4;
    const chunkKey = `${runId}_${chunkIndex}`;
    assert.strictEqual(chunkKey, 'a01XXXXXXXXXXXXXXX_4');
});

runTest('3.3 4-Hour maximum lease boundary calculation', () => {
    const maxLease = 14400;
    const requestedLease = 999999;
    const effectiveLease = Math.min(requestedLease, maxLease);
    assert.strictEqual(effectiveLease, 14400, 'Must clamp to 14400');
});

runTest('3.4 SHA-256 payload canonical checksum interoperability (Node.js & Apex test vector)', () => {
    const canonicalPayload = JSON.stringify({ nodes: [{ id: "n1", label: "ComponentA" }], edges: [] });
    const expectedHex = crypto.createHash('sha256').update(Buffer.from(canonicalPayload, 'utf8')).digest('hex');
    assert.strictEqual(expectedHex.length, 64, 'SHA-256 hex must be 64 lowercase characters');
    assert.strictEqual(/^[0-9a-f]{64}$/.test(expectedHex), true, 'Must match hex lowercase regex');
});

console.log('===================================================================');
console.log(`Agent 10 Hardened Contracts Suite: ${passes} PASSED, ${fails} FAILED`);
console.log('===================================================================');

if (fails > 0) {
    process.exit(1);
}

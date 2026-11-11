/**
 * Agent 3: Apex REST Ingestion Contract and Static AST Offline Test Suite
 * Validates contract compliance, class structures, DTO alignment, security integration,
 * wire limit constants, error code definitions, and client interoperability.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FORCE_APP = path.join(REPO_ROOT, 'scratch/salesforce-poc/force-app/main/default');
const REST_CLS = path.join(FORCE_APP, 'classes/controllers/DAGraphIngestionRestResource.cls');
const REST_META = path.join(FORCE_APP, 'classes/controllers/DAGraphIngestionRestResource.cls-meta.xml');
const DTO_CLS = path.join(FORCE_APP, 'classes/dto/DAGraphIngestionDTO.cls');
const DTO_META = path.join(FORCE_APP, 'classes/dto/DAGraphIngestionDTO.cls-meta.xml');
const TEST_CLS = path.join(FORCE_APP, 'classes/tests/DAGraphIngestionRestResourceTest.cls');
const TEST_META = path.join(FORCE_APP, 'classes/tests/DAGraphIngestionRestResourceTest.cls-meta.xml');
const CONTRACT_DOC = path.join(REPO_ROOT, 'STAGE_J_AGENT_3_FINAL_REST_CONTRACT.md');
const UPLOAD_CLIENT = path.join(REPO_ROOT, 'scripts/salesforce-upload-client.cjs');

console.log('===================================================================');
console.log('Running Agent 3 REST Contract and Static AST Verification Suite...');
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
// SUITE 1: Metadata & File Structure Verification
// ===================================================================
console.log('\n[Suite 1: Metadata & File Structure Verification]');

runTest('1.1 Source and metadata files exist on disk with active apiVersion 61.0', () => {
    const files = [REST_CLS, REST_META, DTO_CLS, DTO_META, TEST_CLS, TEST_META, CONTRACT_DOC];
    for (const file of files) {
        assert(fs.existsSync(file), `Expected file must exist: ${file}`);
        assert(fs.statSync(file).size > 0, `File must not be empty: ${file}`);
    }
    const metaFiles = [REST_META, DTO_META, TEST_META];
    for (const meta of metaFiles) {
        const content = fs.readFileSync(meta, 'utf8');
        assert(content.includes('<apiVersion>61.0</apiVersion>'), `Metadata must specify apiVersion 61.0: ${meta}`);
        assert(content.includes('<status>Active</status>'), `Metadata must be Active: ${meta}`);
    }
});

runTest('1.2 STAGE_J_AGENT_3_FINAL_REST_CONTRACT.md defines authoritative specification and ratification', () => {
    const doc = fs.readFileSync(CONTRACT_DOC, 'utf8');
    assert(doc.includes('PO-RAT-STAGE-J-AGENT-3-2026-11-11'), 'Must include ratification order PO-RAT-STAGE-J-AGENT-3-2026-11-11');
    assert(doc.includes('1.0.0-FINAL-RATIFIED'), 'Must declare 1.0.0-FINAL-RATIFIED version');
    assert(doc.includes('/da/v1/ingest/*'), 'Must specify urlMapping /da/v1/ingest/*');
    assert(doc.includes('Total_Payload_Size_Chars__c'), 'Must document Total_Payload_Size_Chars__c reconciliation');
    assert(doc.includes('5,242,880 bytes'), 'Must document 5 MiB wire ceiling');
});

// ===================================================================
// SUITE 2: Apex REST Resource Invariants & Security Boundaries
// ===================================================================
console.log('\n[Suite 2: Apex REST Resource Invariants & Security Boundaries]');

const restSource = fs.readFileSync(REST_CLS, 'utf8');

runTest('2.1 Correct @RestResource URL mapping and with sharing declaration', () => {
    assert(restSource.includes("@RestResource(urlMapping='/da/v1/ingest/*')"), 'Must have exact URL mapping');
    assert(restSource.includes('global with sharing class DAGraphIngestionRestResource'), 'Must declare global with sharing');
});

runTest('2.2 Pre-flight request wire-size check enforces 5 MiB ceiling before deserialization', () => {
    assert(restSource.includes('req.requestBody.size()') && restSource.includes('DAGraphIngestionService.MAX_HTTP_REQUEST_BYTES'), 'Must check body size against limit');
    assert(restSource.includes('sendError(res, 413, ERR_CHUNK_WIRE_OVERSIZE'), 'Must return 413 with ERR_CHUNK_WIRE_OVERSIZE');
});

runTest('2.3 Action routing handles /init, /chunks, /finalize with 404 fallback', () => {
    assert(restSource.includes("subPath == 'init'"), 'Must route /init');
    assert(restSource.includes("subPath == 'chunks'"), 'Must route /chunks');
    assert(restSource.includes("subPath == 'finalize'"), 'Must route /finalize');
    assert(restSource.includes('sendError(res, 404, ERR_NOT_FOUND'), 'Must return 404 for unknown endpoints');
});

runTest('2.4 Fail-closed security integration with DAProjectSecurityService', () => {
    assert(restSource.includes('DAProjectSecurityService.validateProjectAccessForCurrentUser'), 'Must call security service');
    assert(restSource.includes('SCOPE_ANALYSIS_UPLOAD'), 'Must check SCOPE_ANALYSIS_UPLOAD');
    assert(restSource.includes('SCOPE_ANALYSIS_FINALIZE'), 'Must check SCOPE_ANALYSIS_FINALIZE');
    assert(restSource.includes('sendError(res, 403, ERR_UNAUTHORIZED'), 'Must return 403 for unauthorized callers');
});

runTest('2.5 Ingestion lifecycle delegation to canonical DAGraphIngestionService', () => {
    assert(restSource.includes('DAGraphIngestionService.createAnalysisRun'), 'Must delegate run creation');
    assert(restSource.includes('DAGraphIngestionService.saveGraphChunks'), 'Must delegate chunk persistence');
    assert(restSource.includes('DAGraphIngestionService.finalizeAnalysisRunWithResult'), 'Must delegate finalization');
    assert(!restSource.includes('insert as user chunk'), 'Must not duplicate chunk DML');
});

runTest('2.6 Deterministic error code constants aligned with REST contract', () => {
    const expectedCodes = [
        'ERR_INVALID_PAYLOAD',
        'ERR_UNAUTHORIZED',
        'ERR_NOT_FOUND',
        'ERR_CONFLICTING_RETRY',
        'ERR_CHUNK_WIRE_OVERSIZE',
        'ERR_INTERNAL_ERROR'
    ];
    for (const code of expectedCodes) {
        assert(restSource.includes(`public static final String ${code} = '${code}'`), `Must define code constant: ${code}`);
    }
});

// ===================================================================
// SUITE 3: DTO Alignment & Property Integrity
// ===================================================================
console.log('\n[Suite 3: DTO Alignment & Property Integrity]');

const dtoSource = fs.readFileSync(DTO_CLS, 'utf8');

runTest('3.1 DAGraphIngestionDTO defines InitRunRequest and InitRunResponse matching contract', () => {
    assert(dtoSource.includes('class InitRunRequest'), 'Must define InitRunRequest');
    assert(dtoSource.includes('public String projectId;'), 'Must have projectId');
    assert(dtoSource.includes('public Integer expectedChunks;'), 'Must have expectedChunks');
    assert(dtoSource.includes('public Long expectedTotalBytes;'), 'Must have expectedTotalBytes');
    assert(dtoSource.includes('class InitRunResponse'), 'Must define InitRunResponse');
    assert(dtoSource.includes('public String runId;'), 'Must have runId');
    assert(dtoSource.includes('public String status;'), 'Must have status');
    assert(dtoSource.includes('public Integer chunkSizeLimit;'), 'Must have chunkSizeLimit');
    assert(dtoSource.includes('public Long totalPayloadCap;'), 'Must have totalPayloadCap');
});

runTest('3.2 DAGraphIngestionDTO defines BatchChunkUploadRequest and Response matching contract', () => {
    assert(dtoSource.includes('class BatchChunkUploadRequest'), 'Must define BatchChunkUploadRequest');
    assert(dtoSource.includes('class ChunkItem'), 'Must define ChunkItem');
    assert(dtoSource.includes('public Integer chunkIndex;'), 'Must have chunkIndex');
    assert(dtoSource.includes('public String payloadData;'), 'Must have payloadData');
    assert(dtoSource.includes('class BatchChunkUploadResponse'), 'Must define BatchChunkUploadResponse');
    assert(dtoSource.includes('public List<Integer> persistedChunks;'), 'Must have persistedChunks');
    assert(dtoSource.includes('public Integer totalPersisted;'), 'Must have totalPersisted');
});

runTest('3.3 DAGraphIngestionDTO defines FinalizeRunRequest and Response matching contract', () => {
    assert(dtoSource.includes('class FinalizeRunRequest'), 'Must define FinalizeRunRequest');
    assert(dtoSource.includes('public String expectedChecksum;'), 'Must have expectedChecksum');
    assert(dtoSource.includes('class FinalizeRunResponse'), 'Must define FinalizeRunResponse');
    assert(dtoSource.includes('public Boolean success;'), 'Must have success');
    assert(dtoSource.includes('public Integer nodeCount;'), 'Must have nodeCount');
    assert(dtoSource.includes('public Integer edgeCount;'), 'Must have edgeCount');
    assert(dtoSource.includes('public Integer cyclicSccCount;'), 'Must have cyclicSccCount');
});

// ===================================================================
// SUITE 4: Direct Apex Test Suite Exhaustiveness
// ===================================================================
console.log('\n[Suite 4: Direct Apex Test Suite Exhaustiveness]');

const testSource = fs.readFileSync(TEST_CLS, 'utf8');

runTest('4.1 DAGraphIngestionRestResourceTest exercises all 15 required test conditions', () => {
    const requiredTestMethods = [
        'testInitRunSuccess',
        'testInitRunExplicitEmpty',
        'testInitRunMissingFields',
        'testInitRunProjectNotFound',
        'testInitRunOversizedPayloadViolation',
        'testChunkUploadSuccessAndIdempotentRetry',
        'testChunkUploadConflictingRetryRejection',
        'testChunkUploadBatchExceeded',
        'testChunkUploadIndividualChunkOversized',
        'testWireOversizeCeilingEnforcement',
        'testFinalizeRunSuccess',
        'testFinalizeRunChecksumMismatchFailureAndLkgPreservation',
        'testFinalizeRunMissingChunksFailure',
        'testFinalizeRunCallerChunkCountMismatchRejection',
        'testFinalizeRunExplicitEmptySuccess',
        'testInvalidEndpoint404',
        'testUnauthorizedUserAccessFailure'
    ];

    for (const testName of requiredTestMethods) {
        assert(testSource.includes(`static void ${testName}()`), `Must include test method: ${testName}`);
    }
});

// ===================================================================
// SUITE 5: Client Interoperability (Agent 4 RestTransportAdapter)
// ===================================================================
console.log('\n[Suite 5: Client Interoperability (Agent 4 RestTransportAdapter)]');

const clientSource = fs.readFileSync(UPLOAD_CLIENT, 'utf8');

runTest('5.1 salesforce-upload-client.cjs endpoints match Apex REST route mapping', () => {
    assert(clientSource.includes("this.basePath = (config.basePath || '/services/apexrest/da/v1/ingest')"), 'Client default base path must match');
    assert(clientSource.includes("this._sendRequest('/init'"), 'Client must call /init');
    assert(clientSource.includes("this._sendRequest('/chunks'"), 'Client must call /chunks');
    assert(clientSource.includes("this._sendRequest('/finalize'"), 'Client must call /finalize');
});

runTest('5.2 Client error handling translates Apex error codes identically', () => {
    assert(clientSource.includes('ERR_CONFLICTING_RETRY'), 'Client must handle ERR_CONFLICTING_RETRY');
    assert(clientSource.includes('ERR_CHUNK_WIRE_OVERSIZE'), 'Client must handle ERR_CHUNK_WIRE_OVERSIZE');
    assert(clientSource.includes('ERR_UNAUTHORIZED'), 'Client must handle ERR_UNAUTHORIZED');
});

// ===================================================================
// Summary
// ===================================================================
console.log('\n===================================================================');
console.log(`Agent 3 REST Ingestion Suite Results: ${passes} PASSED, ${fails} FAILED`);
console.log('===================================================================');

if (fails > 0) {
    process.exit(1);
}

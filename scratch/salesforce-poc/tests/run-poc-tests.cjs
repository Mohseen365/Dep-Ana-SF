/**
 * Offline Test Suite for Salesforce POC Payload Loader, Chunking & DTO Contracts
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Helper implementation of LWC daGraphPayloadLoader functions for offline testing
function reassembleChunks(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return '';
    }
    return chunks.join('');
}

function validatePayloadIntegrity(rawJson) {
    if (!rawJson || typeof rawJson !== 'string') {
        return false;
    }
    try {
        const parsed = JSON.parse(rawJson);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}

// 2. Helper implementation of Apex DAGraphChunkService.chunkPayload & verifyChunkSequence
function chunkPayload(rawJson, maxChunkSize = 100000) {
    const chunks = [];
    if (!rawJson || typeof rawJson !== 'string') {
        return chunks;
    }
    let offset = 0;
    while (offset < rawJson.length) {
        const end = Math.min(offset + maxChunkSize, rawJson.length);
        chunks.push(rawJson.substring(offset, end));
        offset = end;
    }
    return chunks;
}

function verifyChunkSequence(chunkRecords) {
    if (!Array.isArray(chunkRecords) || chunkRecords.length === 0) {
        return false;
    }
    for (let i = 0; i < chunkRecords.length; i++) {
        if (chunkRecords[i].Chunk_Index__c === undefined || chunkRecords[i].Chunk_Index__c !== i) {
            return false;
        }
    }
    return true;
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

console.log('Running Salesforce POC Offline Verification Test Suite...');
console.log('===========================================================');

// --- Category 1: Payload Reassembly & Integrity ---
runTest('reassembleChunks: empty array returns empty string', () => {
    assert.strictEqual(reassembleChunks([]), '');
    assert.strictEqual(reassembleChunks(null), '');
});

runTest('reassembleChunks: reassembles string chunks accurately', () => {
    const chunks = ['{"nodes":', '[{"id":"1"}],', '"edges":[]}'];
    const expected = '{"nodes":[{"id":"1"}],"edges":[]}';
    assert.strictEqual(reassembleChunks(chunks), expected);
});

runTest('validatePayloadIntegrity: returns true for valid JSON', () => {
    assert.strictEqual(validatePayloadIntegrity('{"a": 1}'), true);
    assert.strictEqual(validatePayloadIntegrity('[1, 2, 3]'), true);
});

runTest('validatePayloadIntegrity: returns false for invalid JSON or non-string', () => {
    assert.strictEqual(validatePayloadIntegrity('{"a": 1'), false);
    assert.strictEqual(validatePayloadIntegrity(null), false);
    assert.strictEqual(validatePayloadIntegrity(''), false);
});

// --- Category 2: Chunk Sequence Verification ---
runTest('verifyChunkSequence: detects correct contiguous indices', () => {
    const records = [
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' },
        { Chunk_Index__c: 1, Payload_Data__c: 'chunk2' },
        { Chunk_Index__c: 2, Payload_Data__c: 'chunk3' }
    ];
    assert.strictEqual(verifyChunkSequence(records), true);
});

runTest('verifyChunkSequence: rejects missing or non-contiguous indices', () => {
    const missingIndexRecords = [
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' },
        { Chunk_Index__c: 2, Payload_Data__c: 'chunk3' } // index 1 missing
    ];
    assert.strictEqual(verifyChunkSequence(missingIndexRecords), false);

    const outOfOrderRecords = [
        { Chunk_Index__c: 1, Payload_Data__c: 'chunk2' },
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' }
    ];
    assert.strictEqual(verifyChunkSequence(outOfOrderRecords), false);
});

// --- Category 3: Benchmark Fixture Verification (PBIM, BQC, CST) ---
const fixtures = [
    { name: 'PBIM', relPath: '../../../explorer/public/projects/pbim/explorer-data.json', expectedNodes: 528, expectedEdges: 2063 },
    { name: 'BQC', relPath: '../../../explorer/public/projects/bqc/explorer-data.json', expectedNodes: 274, expectedEdges: 603 },
    { name: 'CST', relPath: '../../../explorer/public/projects/cst/explorer-data.json', expectedNodes: 240, expectedEdges: 1024 }
];

fixtures.forEach(fix => {
    runTest(`Fixture ${fix.name}: roundtrip chunking (100k), reassembly, and JSON validation`, () => {
        const fullPath = path.resolve(__dirname, fix.relPath);
        assert.strictEqual(fs.existsSync(fullPath), true, `Fixture path ${fullPath} must exist`);

        const rawJson = fs.readFileSync(fullPath, 'utf8');
        const chunks = chunkPayload(rawJson, 100000);

        assert.strictEqual(chunks.length > 0, true);

        const reassembled = reassembleChunks(chunks);
        assert.strictEqual(reassembled, rawJson);
        assert.strictEqual(validatePayloadIntegrity(reassembled), true);

        const parsed = JSON.parse(reassembled);
        assert.strictEqual(parsed.nodes.length, fix.expectedNodes);
        assert.strictEqual(parsed.edges.length, fix.expectedEdges);
    });
});

console.log('===========================================================');
console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

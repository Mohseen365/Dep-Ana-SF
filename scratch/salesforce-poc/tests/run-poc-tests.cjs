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

function verifyChunkSequence(chunks, expectedStartIndex = 0) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return false;
    }
    for (let i = 0; i < chunks.length; i++) {
        const expectedIndex = expectedStartIndex + i;
        if (chunks[i].Chunk_Index__c === undefined || chunks[i].Chunk_Index__c === null || Number(chunks[i].Chunk_Index__c) !== expectedIndex) {
            return false;
        }
    }
    return true;
}

// 2. Helper implementation of Apex DAGraphChunkService & DAGraphController bounded retrieval logic
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

function simulateBoundedFetch(allChunkRecords, startIndex, maxChunks) {
    const start = Math.max(0, startIndex);
    const limit = Math.min(10, Math.max(1, maxChunks));
    return allChunkRecords.slice(start, start + limit);
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

// --- Category 2: Chunk Sequence Verification & Bounded Pagination ---
runTest('verifyChunkSequence: detects correct contiguous indices starting at offset', () => {
    const recordsBatch1 = [
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' },
        { Chunk_Index__c: 1, Payload_Data__c: 'chunk2' },
        { Chunk_Index__c: 2, Payload_Data__c: 'chunk3' }
    ];
    assert.strictEqual(verifyChunkSequence(recordsBatch1, 0), true);

    const recordsBatch2 = [
        { Chunk_Index__c: 3, Payload_Data__c: 'chunk4' },
        { Chunk_Index__c: 4, Payload_Data__c: 'chunk5' }
    ];
    assert.strictEqual(verifyChunkSequence(recordsBatch2, 3), true);
});

runTest('verifyChunkSequence: rejects missing, duplicated, or out-of-order indices', () => {
    const missingIndexRecords = [
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' },
        { Chunk_Index__c: 2, Payload_Data__c: 'chunk3' }
    ];
    assert.strictEqual(verifyChunkSequence(missingIndexRecords, 0), false);

    const outOfOrderRecords = [
        { Chunk_Index__c: 1, Payload_Data__c: 'chunk2' },
        { Chunk_Index__c: 0, Payload_Data__c: 'chunk1' }
    ];
    assert.strictEqual(verifyChunkSequence(outOfOrderRecords, 0), false);

    const wrongStartRecords = [
        { Chunk_Index__c: 1, Payload_Data__c: 'chunk2' }
    ];
    assert.strictEqual(verifyChunkSequence(wrongStartRecords, 0), false);
});

runTest('simulateBoundedFetch: caps request limit at maximum allowed page size (10)', () => {
    const mockChunks = Array.from({ length: 20 }, (_, i) => ({ Chunk_Index__c: i, Payload_Data__c: `c${i}` }));
    const fetched = simulateBoundedFetch(mockChunks, 0, 50); // request 50
    assert.strictEqual(fetched.length, 10);
});

// --- Category 3: Benchmark Fixture Bounded Retrieval Verification (PBIM, BQC, CST) ---
const fixtures = [
    { name: 'PBIM', relPath: '../../../explorer/public/projects/pbim/explorer-data.json', expectedNodes: 528, expectedEdges: 2063 },
    { name: 'BQC', relPath: '../../../explorer/public/projects/bqc/explorer-data.json', expectedNodes: 274, expectedEdges: 603 },
    { name: 'CST', relPath: '../../../explorer/public/projects/cst/explorer-data.json', expectedNodes: 240, expectedEdges: 1024 }
];

fixtures.forEach(fix => {
    runTest(`Fixture ${fix.name}: paginated bounded chunk retrieval, reassembly, and JSON validation`, () => {
        const fullPath = path.resolve(__dirname, fix.relPath);
        assert.strictEqual(fs.existsSync(fullPath), true, `Fixture path ${fullPath} must exist`);

        const rawJson = fs.readFileSync(fullPath, 'utf8');
        const rawChunks = chunkPayload(rawJson, 100000);
        const chunkRecords = rawChunks.map((data, idx) => ({ Chunk_Index__c: idx, Payload_Data__c: data }));

        assert.strictEqual(chunkRecords.length > 0, true);

        // Simulate LWC paginated fetching in batches of 5 chunks
        const fetchedPayloads = [];
        let nextIndex = 0;
        const totalChunks = chunkRecords.length;
        const pageSize = 5;

        while (nextIndex < totalChunks) {
            const batch = simulateBoundedFetch(chunkRecords, nextIndex, pageSize);
            assert.strictEqual(batch.length > 0, true);
            assert.strictEqual(verifyChunkSequence(batch, nextIndex), true);

            for (const c of batch) {
                fetchedPayloads.push(c.Payload_Data__c);
            }

            nextIndex += batch.length;
        }

        const reassembled = reassembleChunks(fetchedPayloads);
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

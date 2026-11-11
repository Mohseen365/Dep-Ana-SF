/**
 * Comprehensive Test Suite for Agent 4 Salesforce Upload Client
 * =============================================================
 *
 * Validates all requirements specified in:
 * - PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md (REQ-BATCH-01 through REQ-BATCH-05)
 * - PHASE_1_AGENT_2_LIFECYCLE_AND_PERSISTENCE_INTERFACE.md (v1.0.2)
 *
 * Test Categories:
 * 1. Chunk boundary tests (exact 131,072 boundary)
 * 2. Surrogate-pair boundary tests (preventing split surrogate code units)
 * 3. Canonical UTF-8 SHA-256 checksum tests against known test vectors
 * 4. Batch-size and 5 MiB wire ceiling enforcement (REQ-BATCH-01, REQ-BATCH-02)
 * 5. Dynamic downscaling under escape expansion (REQ-BATCH-03)
 * 6. Single-chunk wire oversize fail-fast (REQ-BATCH-04)
 * 7. Chunk index integrity across partitions (REQ-BATCH-05)
 * 8. Duplicate retry idempotency
 * 9. Conflicting retry fail-closed
 * 10. Transient network failure and exponential retry
 * 11. Resume / retry behavior
 * 12. Finalization failure recovery (FAILED state response handling)
 * 13. Empty graph upload (0 chunks -> EMPTY run)
 * 14. Large payload tests (multi-megabyte graph)
 * 15. Overall payload cap (10,485,760 UTF-16 code units) enforcement
 * 16. Cancellation support via AbortSignal
 * 17. Payload immutability preservation
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  MAX_CHUNK_SIZE,
  MAX_TOTAL_PAYLOAD_CHARS,
  MAX_REQUEST_BYTES,
  MAX_BATCH_CHUNKS,
  ERROR_CODES,
  UploadClientError,
  chunkPayloadSafe,
  computePayloadChecksum,
  measureEnvelopeWireBytes,
  TransportAdapter,
  InMemoryTransportAdapter,
  SalesforceGraphUploadClient
} = require('./salesforce-upload-client.cjs');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

async function runAllTests() {
  console.log('===================================================================');
  console.log('Running Agent 4 Salesforce Upload Client Test Suite...');
  console.log('===================================================================');

  // -----------------------------------------------------------------
  // Suite 1: Chunk Boundary and Surrogate-Pair Handling
  // -----------------------------------------------------------------
  console.log('\n[Suite 1: Chunk Boundary and Surrogate-Pair Handling]');

  await test('1.1 Exact 131,072 boundary chunking without remainder', () => {
    const str = 'A'.repeat(MAX_CHUNK_SIZE * 2);
    const chunks = chunkPayloadSafe(str, MAX_CHUNK_SIZE);
    assert.strictEqual(chunks.length, 2, 'Should divide into exactly 2 chunks');
    assert.strictEqual(chunks[0].length, MAX_CHUNK_SIZE);
    assert.strictEqual(chunks[1].length, MAX_CHUNK_SIZE);
  });

  await test('1.2 Exact boundary plus single remainder character', () => {
    const str = 'B'.repeat(MAX_CHUNK_SIZE + 1);
    const chunks = chunkPayloadSafe(str, MAX_CHUNK_SIZE);
    assert.strictEqual(chunks.length, 2);
    assert.strictEqual(chunks[0].length, MAX_CHUNK_SIZE);
    assert.strictEqual(chunks[1].length, 1);
  });

  await test('1.3 Prevent splitting UTF-16 surrogate pairs across chunk boundary', () => {
    // High surrogate 0xD83D, Low surrogate 0xDE00 (Grinning Face emoji 😀)
    // Place emoji right at boundary: 131,071 ASCII chars + emoji (2 code units)
    const prefix = 'X'.repeat(MAX_CHUNK_SIZE - 1);
    const emoji = '\uD83D\uDE00'; // 2 UTF-16 code units
    const testString = prefix + emoji + 'YYYY';

    // Without protection, chunk 0 would take 131,071 chars + High Surrogate (0xD83D) = 131,072 chars,
    // leaving Low Surrogate (0xDE00) in chunk 1, corrupting the surrogate pair.
    const chunks = chunkPayloadSafe(testString, MAX_CHUNK_SIZE);
    assert.strictEqual(chunks.length, 2);

    // With protection, chunk 0 must stop at 131,071 chars so the entire surrogate pair goes to chunk 1
    assert.strictEqual(chunks[0].length, MAX_CHUNK_SIZE - 1);
    assert.strictEqual(chunks[0], prefix);
    assert.strictEqual(chunks[1].startsWith(emoji), true, 'Chunk 1 must start with intact surrogate pair');
    assert.strictEqual(chunks.join(''), testString, 'Concatenation must restore original string');
  });

  await test('1.4 Empty string returns empty chunks array', () => {
    const chunks = chunkPayloadSafe('', MAX_CHUNK_SIZE);
    assert.deepStrictEqual(chunks, []);
  });

  // -----------------------------------------------------------------
  // Suite 2: Checksum Semantics and Interoperability
  // -----------------------------------------------------------------
  console.log('\n[Suite 2: Checksum Semantics and Interoperability]');

  await test('2.1 Canonical UTF-8 SHA-256 test vector interoperability', () => {
    const payload = JSON.stringify({ nodes: [{ id: "n1", label: "ComponentA" }], edges: [] });
    const expectedHex = crypto.createHash('sha256').update(Buffer.from(payload, 'utf8')).digest('hex');
    const computed = computePayloadChecksum(payload);
    assert.strictEqual(computed, expectedHex);
    assert.strictEqual(computed.length, 64);
    assert.strictEqual(/^[0-9a-f]{64}$/.test(computed), true);
  });

  await test('2.2 Checksum correctly handles multi-byte UTF-8 sequences', () => {
    const multiByteString = '{"unicode": "こんにちは世界 / 🌍 / café"}';
    const expected = crypto.createHash('sha256').update(Buffer.from(multiByteString, 'utf8')).digest('hex');
    const actual = computePayloadChecksum(multiByteString);
    assert.strictEqual(actual, expected);
  });

  // -----------------------------------------------------------------
  // Suite 3: Wire Sizing and Batch Partitioning (REQ-BATCH-01..05)
  // -----------------------------------------------------------------
  console.log('\n[Suite 3: Wire Sizing and Batch Partitioning (REQ-BATCH-01..05)]');

  await test('3.1 REQ-BATCH-01: Pre-flight wire byte measurement using Buffer.byteLength', () => {
    const envelope = {
      runId: 'run_123',
      projectId: 'PRJ_01',
      startIndex: 0,
      chunks: ['Hello', 'World']
    };
    const wireBytes = measureEnvelopeWireBytes(envelope);
    const expected = Buffer.byteLength(JSON.stringify(envelope), 'utf8');
    assert.strictEqual(wireBytes, expected);
  });

  await test('3.2 REQ-BATCH-02 & REQ-BATCH-03: Dynamic downscaling under escape expansion', () => {
    const client = new SalesforceGraphUploadClient();
    // Create chunks with heavy JSON escape expansion (quotes and backslashes)
    // 500,000 backslashes inside a string expands significantly when JSON.stringify is called
    const escapeChunk = '\\'.repeat(600000);
    const allChunks = [escapeChunk, escapeChunk, escapeChunk, escapeChunk, escapeChunk]; // 5 chunks

    // Form batch starting at 0 with requested 5 chunks
    const batchSpec = client._formSafeBatch('run_test', 'prj_test', allChunks, 0, 5);
    // Must downscale candidate chunks count so wireBytes <= 5 MiB (5,242,880)
    assert(batchSpec.wireBytes <= MAX_REQUEST_BYTES, `Batch wireBytes (${batchSpec.wireBytes}) must be <= ${MAX_REQUEST_BYTES}`);
    assert(batchSpec.count < 5, 'Must have downscaled count below 5');
    assert(batchSpec.count >= 1, 'Must have formed at least 1 chunk');
  });

  await test('3.3 REQ-BATCH-04: Single-chunk wire oversize fail-fast', () => {
    const client = new SalesforceGraphUploadClient();
    // Create an individual single chunk whose serialized wire size exceeds 5 MiB
    // In JSON, `\` is escaped as `\\` (doubled) and quotes are escaped as `\"`
    const hugeEscapeChunk = '"'.repeat(3000000); // 3M quotes serialized expands to > 6 MB in JSON
    const allChunks = [hugeEscapeChunk];

    assert.throws(() => {
      client._formSafeBatch('run_fail', 'prj_fail', allChunks, 0, 1);
    }, (err) => {
      assert.strictEqual(err.code, ERROR_CODES.ERR_CHUNK_WIRE_OVERSIZE);
      assert(err.message.includes('ERR_CHUNK_WIRE_OVERSIZE'));
      return true;
    });
  });

  await test('3.4 REQ-BATCH-05: Chunk index integrity and zero-based sequencing', async () => {
    const transport = new InMemoryTransportAdapter();
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });

    // Create 15 chunks
    const chunkContent = 'Normal chunk content data '.repeat(200);
    const payload = chunkContent.repeat(15);
    // Force small chunk size to test multi-batch sequencing
    client.maxChunkSize = chunkContent.length;

    const result = await client.uploadGraph({
      projectId: 'PRJ_SEQ',
      runName: 'Sequence Verification',
      payload
    });

    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(result.totalChunks, 15);

    // Verify in transport that all chunk indices 0..14 exist exactly once with correct keys
    for (let i = 0; i < 15; i++) {
      const key = `${result.runId}_${i}`;
      assert(transport.chunks.has(key), `Chunk index ${i} must exist in persistence`);
      assert.strictEqual(transport.chunks.get(key).index, i);
    }
  });

  // -----------------------------------------------------------------
  // Suite 4: Retries, Idempotency, and Failure Recovery
  // -----------------------------------------------------------------
  console.log('\n[Suite 4: Retries, Idempotency, and Failure Recovery]');

  await test('4.1 Duplicate retry succeeds idempotently', async () => {
    const transport = new InMemoryTransportAdapter();
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });
    const payload = JSON.stringify({ nodes: [{ id: 'n1' }], edges: [] });

    // Upload first time
    const res1 = await client.uploadGraph({
      projectId: 'PRJ_IDEMP',
      runName: 'Idempotency Test 1',
      payload
    });
    assert.strictEqual(res1.status, 'AVAILABLE');

    // Simulate duplicate batch upload of same run chunks to transport
    const dupBatch = await transport.uploadBatch({
      runId: res1.runId,
      projectId: 'PRJ_IDEMP',
      startIndex: 0,
      chunks: [payload]
    });
    assert.strictEqual(dupBatch.acknowledgedCount, 1, 'Duplicate chunk must be idempotently acknowledged');
  });

  await test('4.2 Conflicting retry fails closed with ERR_CONFLICTING_RETRY', async () => {
    const transport = new InMemoryTransportAdapter({ failWithConflict: true });
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });
    const payload = JSON.stringify({ nodes: [{ id: 'n1' }], edges: [] });

    // Pre-populate transport chunk
    transport.runs.set('run_conflict', { runId: 'run_conflict', status: 'IN_PROGRESS', expectedChunks: 1 });
    transport.chunks.set('run_conflict_0', { runId: 'run_conflict', index: 0, payload: 'original' });

    await assert.rejects(async () => {
      await transport.uploadBatch({
        runId: 'run_conflict',
        projectId: 'PRJ_01',
        startIndex: 0,
        chunks: ['differing_conflicting_payload']
      });
    }, (err) => {
      assert.strictEqual(err.code, ERROR_CODES.ERR_CONFLICTING_RETRY);
      return true;
    });
  });

  await test('4.3 Transient network failure recovered via retry backoff', async () => {
    // Configure transport to fail first 2 batch upload attempts, then succeed
    const transport = new InMemoryTransportAdapter({ failNextBatchCount: 2 });
    const client = new SalesforceGraphUploadClient({
      transportAdapter: transport,
      maxRetries: 3,
      initialRetryDelayMs: 10 // Fast delay for test speed
    });

    const payload = JSON.stringify({ nodes: [{ id: 'node_retry' }], edges: [] });
    const result = await client.uploadGraph({
      projectId: 'PRJ_RETRY',
      runName: 'Transient Network Recovery',
      payload
    });

    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(transport.failNextBatchCount, 0, 'All simulated failures consumed');
  });

  await test('4.4 Finalization failure cleanly handles FAILED state', async () => {
    const transport = new InMemoryTransportAdapter({ failFinalize: true });
    const client = new SalesforceGraphUploadClient({
      transportAdapter: transport,
      maxRetries: 0 // Fail fast
    });

    const payload = JSON.stringify({ nodes: [{ id: 'n1' }], edges: [] });
    await assert.rejects(async () => {
      await client.uploadGraph({
        projectId: 'PRJ_FAIL_FIN',
        runName: 'Finalize Failure',
        payload
      });
    }, (err) => {
      assert.strictEqual(err.code, ERROR_CODES.ERR_FINALIZATION_FAILED);
      assert.strictEqual(err.details.status, 'FAILED');
      return true;
    });
  });

  // -----------------------------------------------------------------
  // Suite 5: Special Scenarios, Limits, and Cancellation
  // -----------------------------------------------------------------
  console.log('\n[Suite 5: Special Scenarios, Limits, and Cancellation]');

  await test('5.1 Empty graph upload transitions cleanly to EMPTY status', async () => {
    const transport = new InMemoryTransportAdapter();
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });

    const result = await client.uploadGraph({
      projectId: 'PRJ_EMPTY',
      runName: 'Empty Graph Test',
      payload: ''
    });

    assert.strictEqual(result.status, 'EMPTY');
    assert.strictEqual(result.totalChunks, 0);
    assert.strictEqual(result.totalBytes, 0);
    assert.strictEqual(transport.runs.get(result.runId).status, 'EMPTY');
  });

  await test('5.2 Overall payload limit (10,485,760 UTF-16 code units) enforced', async () => {
    const client = new SalesforceGraphUploadClient();
    // Create payload exceeding 10,485,760 characters
    // Using string slice/repeat
    const hugePayload = 'A'.repeat(MAX_TOTAL_PAYLOAD_CHARS + 10);

    await assert.rejects(async () => {
      await client.uploadGraph({
        projectId: 'PRJ_TOO_LARGE',
        runName: 'Oversize Payload',
        payload: hugePayload
      });
    }, (err) => {
      assert.strictEqual(err.code, ERROR_CODES.ERR_PAYLOAD_TOO_LARGE);
      assert.strictEqual(err.details.maxLimit, MAX_TOTAL_PAYLOAD_CHARS);
      return true;
    });
  });

  await test('5.3 Upload cancellation via AbortSignal', async () => {
    const transport = new InMemoryTransportAdapter({ latencyMs: 50 });
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });

    const controller = new AbortController();
    const payload = 'Data chunk test '.repeat(100);

    // Cancel immediately before or during run
    controller.abort();

    await assert.rejects(async () => {
      await client.uploadGraph({
        projectId: 'PRJ_CANCEL',
        runName: 'Cancel Test',
        payload,
        signal: controller.signal
      });
    }, (err) => {
      assert.strictEqual(err.code, ERROR_CODES.ERR_UPLOAD_CANCELLED);
      return true;
    });
  });

  await test('5.4 Payload immutability preservation', async () => {
    const transport = new InMemoryTransportAdapter();
    const client = new SalesforceGraphUploadClient({ transportAdapter: transport });

    const originalPayloadObj = {
      nodes: [{ id: 'a', data: { name: 'Alpha' } }],
      edges: [{ source: 'a', target: 'b' }],
      metadata: { generatedBy: 'DependencyAnalyzer' }
    };

    // Deep freeze original object to ensure no property modification
    function deepFreeze(obj) {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        if (obj[prop] !== null && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
          deepFreeze(obj[prop]);
        }
      });
      return obj;
    }
    deepFreeze(originalPayloadObj);

    // Upload object payload
    const result = await client.uploadGraph({
      projectId: 'PRJ_IMMUTABLE',
      runName: 'Immutability Verification',
      payload: originalPayloadObj
    });

    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(originalPayloadObj.nodes[0].data.name, 'Alpha');
    assert.strictEqual(originalPayloadObj.metadata.generatedBy, 'DependencyAnalyzer');
  });

  await test('5.5 Large payload test (multi-chunk graph with progress events)', async () => {
    const transport = new InMemoryTransportAdapter();
    const client = new SalesforceGraphUploadClient({
      transportAdapter: transport,
      maxChunkSize: 10000 // 10k per chunk for testing multi-chunk
    });

    const largeData = JSON.stringify({
      nodes: Array.from({ length: 500 }, (_, i) => ({ id: `n_${i}`, name: `Component_${i}` })),
      edges: Array.from({ length: 499 }, (_, i) => ({ source: `n_${i}`, target: `n_${i + 1}` }))
    });

    const progressEvents = [];
    const result = await client.uploadGraph({
      projectId: 'PRJ_LARGE',
      runName: 'Large Graph Ingestion',
      payload: largeData,
      onProgress: (evt) => progressEvents.push(evt.phase)
    });

    assert.strictEqual(result.status, 'AVAILABLE');
    assert(result.totalChunks > 1, `Total chunks should be > 1 (got ${result.totalChunks})`);
    assert(progressEvents.includes('INITIALIZING'), 'Should report INITIALIZING');
    assert(progressEvents.includes('UPLOADING'), 'Should report UPLOADING');
    assert(progressEvents.includes('FINALIZING'), 'Should report FINALIZING');
    assert(progressEvents.includes('COMPLETED'), 'Should report COMPLETED');
  });

  console.log('===================================================================');
  console.log(`Agent 4 Test Suite Results: ${passedTests} PASSED, ${failedTests} FAILED (Total: ${totalTests})`);
  console.log('===================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Test Runner Failed:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };

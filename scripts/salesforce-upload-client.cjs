/**
 * Salesforce Graph Upload Client (Node.js) - Agent 4 Implementation
 * =================================================================
 *
 * Implements reliable client-side transport of generated dependency graphs to Salesforce
 * adhering to:
 * - PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md (REQ-BATCH-01 through REQ-BATCH-05)
 * - PHASE_1_AGENT_2_LIFECYCLE_AND_PERSISTENCE_INTERFACE.md (v1.0.2)
 *
 * Core Principles & Limits:
 * - Payload Immutability: Canonical graph payload is never mutated during serialization or upload.
 * - MAX_CHUNK_SIZE: 131,072 UTF-16 code units (Salesforce LongTextArea field limit).
 * - MAX_TOTAL_PAYLOAD_SIZE: 10,485,760 UTF-16 code units (~10 MB aggregate payload ceiling).
 * - MAX_REQUEST_BYTES: 5,242,880 bytes (5 MiB application-level wire ceiling).
 * - MAX_BATCH_CHUNKS: 10 chunks maximum per candidate batch.
 * - Canonical Checksum: SHA-256 lowercase hex digest computed over raw UTF-8 serialized bytes.
 * - Surrogate-pair safe: Prevents splitting UTF-16 surrogate pairs across chunk boundaries.
 * - Dynamic HTTP downscaling: Binary downscaling of chunk batches (10 -> 5 -> 2 -> 1) when serialized wire size exceeds 5 MiB.
 * - Single-chunk oversize fail-fast: Throws ERR_CHUNK_WIRE_OVERSIZE if a single chunk wire size > 5 MiB.
 * - Decoupled REST Transport: Pluggable TransportAdapter interface prevents hardcoding unapproved endpoints or DTOs.
 */

'use strict';

const crypto = require('crypto');

// Accounting Boundaries & Constants
const MAX_CHUNK_SIZE = 131072;               // UTF-16 code units
const MAX_TOTAL_PAYLOAD_CHARS = 10485760;    // UTF-16 code units
const MAX_BATCH_CHUNKS = 10;                 // Chunks per batch candidate
const MAX_REQUEST_BYTES = 5242880;           // 5 MiB wire ceiling (Buffer.byteLength)

/**
 * Standard Error Codes
 */
const ERROR_CODES = {
  ERR_CHUNK_WIRE_OVERSIZE: 'ERR_CHUNK_WIRE_OVERSIZE',
  ERR_PAYLOAD_TOO_LARGE: 'ERR_PAYLOAD_TOO_LARGE',
  ERR_INVALID_PAYLOAD: 'ERR_INVALID_PAYLOAD',
  ERR_UPLOAD_CANCELLED: 'ERR_UPLOAD_CANCELLED',
  ERR_TRANSIENT_NETWORK: 'ERR_TRANSIENT_NETWORK',
  ERR_FINALIZATION_FAILED: 'ERR_FINALIZATION_FAILED',
  ERR_CONFLICTING_RETRY: 'ERR_CONFLICTING_RETRY',
  ERR_UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  ERR_CONFIGURATION: 'ERR_CONFIGURATION'
};

class UploadClientError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'UploadClientError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Splits a raw payload string into UTF-16 code unit chunks without splitting surrogate pairs.
 * @param {string} rawString
 * @param {number} [maxChunkSize=MAX_CHUNK_SIZE]
 * @returns {string[]}
 */
function chunkPayloadSafe(rawString, maxChunkSize = MAX_CHUNK_SIZE) {
  if (typeof rawString !== 'string') {
    throw new UploadClientError('Payload must be a string', ERROR_CODES.ERR_INVALID_PAYLOAD);
  }
  if (rawString.length === 0) {
    return [];
  }

  let limit = Number(maxChunkSize);
  if (isNaN(limit) || limit <= 0) {
    limit = MAX_CHUNK_SIZE;
  } else if (limit > MAX_CHUNK_SIZE) {
    limit = MAX_CHUNK_SIZE;
  }

  const chunks = [];
  let offset = 0;
  const len = rawString.length;

  while (offset < len) {
    let end = Math.min(offset + limit, len);
    // Prevent splitting surrogate pairs: High surrogate is 0xD800..0xDBFF
    if (end < len && end > offset) {
      const code = rawString.charCodeAt(end - 1);
      if (code >= 0xD800 && code <= 0xDBFF) {
        end--; // Keep surrogate pair together in next chunk
      }
    }
    chunks.push(rawString.substring(offset, end));
    offset = end;
  }

  return chunks;
}

/**
 * Computes canonical SHA-256 digest over raw UTF-8 serialized bytes.
 * Returns 64 lowercase hexadecimal characters.
 * @param {string} payloadString
 * @returns {string}
 */
function computePayloadChecksum(payloadString) {
  if (typeof payloadString !== 'string') {
    throw new UploadClientError('Payload must be a string', ERROR_CODES.ERR_INVALID_PAYLOAD);
  }
  const utf8Buffer = Buffer.from(payloadString, 'utf8');
  return crypto.createHash('sha256').update(utf8Buffer).digest('hex');
}

/**
 * Measures the exact wire size of candidate chunk batch when serialized to JSON.
 * @param {Object} envelope
 * @returns {number} byte length in UTF-8
 */
function measureEnvelopeWireBytes(envelope) {
  const jsonStr = JSON.stringify(envelope);
  return Buffer.byteLength(jsonStr, 'utf8');
}

/**
 * Abstract Transport Adapter Interface
 * Decouples upload client logic from unapproved REST endpoint paths or schemas.
 */
class TransportAdapter {
  /**
   * Initializes analysis run.
   * @param {Object} params { projectId, runName, expectedChunks, expectedTotalBytes, commitHash, expectedChecksum }
   * @param {Object} options { signal }
   * @returns {Promise<{ runId: string, status: string }>}
   */
  async initRun(params, options = {}) {
    throw new Error('initRun not implemented in TransportAdapter base');
  }

  /**
   * Uploads a batch of chunks.
   * @param {Object} params { runId, projectId, startIndex, chunks: string[] }
   * @param {Object} options { signal }
   * @returns {Promise<{ acknowledgedCount: number, status: string }>}
   */
  async uploadBatch(params, options = {}) {
    throw new Error('uploadBatch not implemented in TransportAdapter base');
  }

  /**
   * Finalizes the analysis run.
   * @param {Object} params { runId, projectId, expectedChunks, expectedChecksum }
   * @param {Object} options { signal }
   * @returns {Promise<{ isSuccess: boolean, status: string, errorMessage?: string }>}
   */
  async finalizeRun(params, options = {}) {
    throw new Error('finalizeRun not implemented in TransportAdapter base');
  }
}

/**
 * Default In-Memory / Mock Transport Adapter for offline execution and testing
 */
class InMemoryTransportAdapter extends TransportAdapter {
  constructor(options = {}) {
    super();
    this.runs = new Map();
    this.chunks = new Map(); // key: `${runId}_${chunkIndex}`
    this.latencyMs = options.latencyMs || 0;
    this.failNextBatchCount = options.failNextBatchCount || 0;
    this.failFinalize = options.failFinalize || false;
    this.failWithConflict = options.failWithConflict || false;
  }

  async _delay() {
    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }
  }

  async initRun(params, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new UploadClientError('Operation cancelled', ERROR_CODES.ERR_UPLOAD_CANCELLED);
    }
    await this._delay();
    const runId = 'mock_run_' + Math.random().toString(36).substring(2, 10);
    const isEmpty = params.expectedChunks === 0 && params.expectedTotalBytes === 0;
    const runRecord = {
      runId,
      projectId: params.projectId,
      runName: params.runName,
      expectedChunks: params.expectedChunks,
      expectedTotalBytes: params.expectedTotalBytes,
      commitHash: params.commitHash || null,
      expectedChecksum: params.expectedChecksum || null,
      status: isEmpty ? 'EMPTY' : 'QUEUED',
      createdAt: new Date().toISOString()
    };
    this.runs.set(runId, runRecord);
    return { runId, status: runRecord.status };
  }

  async uploadBatch(params, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new UploadClientError('Operation cancelled', ERROR_CODES.ERR_UPLOAD_CANCELLED);
    }
    await this._delay();

    if (this.failNextBatchCount > 0) {
      this.failNextBatchCount--;
      throw new UploadClientError('Simulated transient network drop', ERROR_CODES.ERR_TRANSIENT_NETWORK);
    }

    const run = this.runs.get(params.runId);
    if (!run) {
      throw new UploadClientError(`Run not found: ${params.runId}`, ERROR_CODES.ERR_INVALID_PAYLOAD);
    }

    if (run.status === 'EMPTY' || run.status === 'FAILED') {
      throw new UploadClientError(`Cannot upload chunks to run in status: ${run.status}`, ERROR_CODES.ERR_INVALID_PAYLOAD);
    }

    // In Salesforce DAGraphIngestionService, if an identical retry occurs when already AVAILABLE or IN_PROGRESS,
    // it checks existing records. However, new uploads cannot be added to AVAILABLE runs.
    if (run.status !== 'AVAILABLE') {
      run.status = 'IN_PROGRESS';
    }
    const chunks = params.chunks || [];
    let ackCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const idx = params.startIndex + i;
      const key = `${params.runId}_${idx}`;
      const payload = chunks[i];

      if (this.failWithConflict && this.chunks.has(key)) {
        throw new UploadClientError(`Conflicting payload for existing chunk at index ${idx}`, ERROR_CODES.ERR_CONFLICTING_RETRY);
      }

      if (this.chunks.has(key)) {
        const existing = this.chunks.get(key);
        if (existing.payload !== payload) {
          throw new UploadClientError(`Conflicting payload for existing chunk at index ${idx}`, ERROR_CODES.ERR_CONFLICTING_RETRY);
        }
        // Identical retry -> idempotent success
        ackCount++;
      } else {
        if (run.status === 'AVAILABLE') {
          throw new UploadClientError(`Cannot upload new chunks to an already finalized AVAILABLE run: ${params.runId}`, ERROR_CODES.ERR_INVALID_PAYLOAD);
        }
        this.chunks.set(key, { runId: params.runId, index: idx, payload });
        ackCount++;
      }
    }

    return { acknowledgedCount: ackCount, status: run.status };
  }

  async finalizeRun(params, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new UploadClientError('Operation cancelled', ERROR_CODES.ERR_UPLOAD_CANCELLED);
    }
    await this._delay();

    const run = this.runs.get(params.runId);
    if (!run) {
      return { isSuccess: false, status: 'FAILED', errorMessage: `Run not found: ${params.runId}` };
    }

    if (this.failFinalize) {
      run.status = 'FAILED';
      return { isSuccess: false, status: 'FAILED', errorMessage: 'Server simulated finalization failure' };
    }

    if (run.status === 'AVAILABLE') {
      return { isSuccess: true, status: 'AVAILABLE' };
    }

    if (run.status === 'EMPTY') {
      return { isSuccess: true, status: 'EMPTY' };
    }

    if (run.expectedChunks === 0) {
      run.status = 'EMPTY';
      return { isSuccess: true, status: 'EMPTY' };
    }

    // Verify chunk count and continuity
    for (let i = 0; i < run.expectedChunks; i++) {
      const key = `${params.runId}_${i}`;
      if (!this.chunks.has(key)) {
        run.status = 'FAILED';
        return { isSuccess: false, status: 'FAILED', errorMessage: `Missing chunk at index ${i}` };
      }
    }

    // Verify checksum
    if (run.expectedChecksum) {
      let assembled = '';
      for (let i = 0; i < run.expectedChunks; i++) {
        assembled += this.chunks.get(`${params.runId}_${i}`).payload;
      }
      const actualChecksum = computePayloadChecksum(assembled);
      if (actualChecksum !== run.expectedChecksum) {
        run.status = 'FAILED';
        return {
          isSuccess: false,
          status: 'FAILED',
          errorMessage: `Checksum mismatch: expected ${run.expectedChecksum}, got ${actualChecksum}`
        };
      }
    }

    run.status = 'AVAILABLE';
    return { isSuccess: true, status: 'AVAILABLE' };
  }
}

/**
 * Salesforce Graph Upload Client
 */
class SalesforceGraphUploadClient {
  /**
   * @param {Object} options
   * @param {TransportAdapter} [options.transportAdapter] Pluggable transport adapter
   * @param {number} [options.maxChunkSize=131072] Max UTF-16 code units per chunk
   * @param {number} [options.maxRequestBytes=5242880] Max wire request bytes (5 MiB)
   * @param {number} [options.maxBatchChunks=10] Max chunks per batch
   * @param {number} [options.maxRetries=3] Number of retry attempts on transient network failure
   * @param {number} [options.initialRetryDelayMs=500] Initial backoff delay in ms
   */
  constructor(options = {}) {
    this.transport = options.transportAdapter || new InMemoryTransportAdapter();
    this.maxChunkSize = options.maxChunkSize || MAX_CHUNK_SIZE;
    this.maxRequestBytes = options.maxRequestBytes || MAX_REQUEST_BYTES;
    this.maxBatchChunks = options.maxBatchChunks || MAX_BATCH_CHUNKS;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    this.initialRetryDelayMs = options.initialRetryDelayMs || 500;
  }

  /**
   * Partitions chunks dynamically under the wire byte limit.
   * @param {string} runId
   * @param {string} projectId
   * @param {string[]} allChunks
   * @param {number} startIndex
   * @param {number} count
   * @returns {{ chunks: string[], count: number, wireBytes: number }}
   */
  _formSafeBatch(runId, projectId, allChunks, startIndex, count) {
    let candidateCount = Math.min(count, this.maxBatchChunks, allChunks.length - startIndex);

    while (candidateCount > 0) {
      const candidateChunks = allChunks.slice(startIndex, startIndex + candidateCount);
      const envelope = {
        runId,
        projectId,
        startIndex,
        chunks: candidateChunks
      };
      const wireBytes = measureEnvelopeWireBytes(envelope);

      if (wireBytes <= this.maxRequestBytes) {
        return { chunks: candidateChunks, count: candidateCount, wireBytes };
      }

      // If wireBytes > maxRequestBytes
      if (candidateCount === 1) {
        // REQ-BATCH-04: Single-chunk oversize rejection fail-fast
        throw new UploadClientError(
          `ERR_CHUNK_WIRE_OVERSIZE: Chunk ${startIndex} serialized to ${wireBytes} bytes, exceeding ${this.maxRequestBytes} byte ceiling.`,
          ERROR_CODES.ERR_CHUNK_WIRE_OVERSIZE,
          { chunkIndex: startIndex, wireBytes, maxRequestBytes: this.maxRequestBytes }
        );
      }

      // REQ-BATCH-03: Binary downscaling (e.g. 10 -> 5 -> 2 -> 1)
      candidateCount = Math.floor(candidateCount / 2);
    }

    throw new UploadClientError('Unable to form safe batch', ERROR_CODES.ERR_CONFIGURATION);
  }

  /**
   * Uploads graph payload to Salesforce.
   * Guarantees payload immutability.
   *
   * @param {Object} uploadRequest
   * @param {string} uploadRequest.projectId Salesforce Project ID or Key
   * @param {string} uploadRequest.runName Name for the analysis run
   * @param {string|Object} uploadRequest.payload Graph payload JSON string or object
   * @param {string} [uploadRequest.commitHash] Git source commit hash
   * @param {Function} [uploadRequest.onProgress] Progress callback
   * @param {AbortSignal} [uploadRequest.signal] AbortSignal for cancellation
   * @returns {Promise<{ runId: string, status: string, totalChunks: number, totalBytes: number, checksum: string }>}
   */
  async uploadGraph(uploadRequest) {
    const { projectId, runName, payload, commitHash, onProgress, signal } = uploadRequest;

    if (!projectId || typeof projectId !== 'string') {
      throw new UploadClientError('Valid projectId is required', ERROR_CODES.ERR_CONFIGURATION);
    }
    if (!runName || typeof runName !== 'string') {
      throw new UploadClientError('Valid runName is required', ERROR_CODES.ERR_CONFIGURATION);
    }

    // Check cancellation
    if (signal && signal.aborted) {
      throw new UploadClientError('Upload cancelled before start', ERROR_CODES.ERR_UPLOAD_CANCELLED);
    }

    // Serialize payload without mutating source
    let payloadString;
    if (typeof payload === 'string') {
      payloadString = payload;
    } else if (payload && typeof payload === 'object') {
      // Ensure source object immutability via deep freeze if possible or non-mutating serialization
      payloadString = JSON.stringify(payload);
    } else {
      throw new UploadClientError('Invalid payload: must be JSON string or object', ERROR_CODES.ERR_INVALID_PAYLOAD);
    }

    // Validate overall payload size (UTF-16 code units)
    const totalChars = payloadString.length;
    if (totalChars > MAX_TOTAL_PAYLOAD_CHARS) {
      throw new UploadClientError(
        `Payload size (${totalChars} UTF-16 code units) exceeds maximum permitted ceiling of ${MAX_TOTAL_PAYLOAD_CHARS}`,
        ERROR_CODES.ERR_PAYLOAD_TOO_LARGE,
        { totalChars, maxLimit: MAX_TOTAL_PAYLOAD_CHARS }
      );
    }

    // Compute canonical UTF-8 SHA-256 checksum
    const checksum = computePayloadChecksum(payloadString);

    // Chunk payload into UTF-16 code unit chunks safe for surrogate pairs
    const chunks = chunkPayloadSafe(payloadString, this.maxChunkSize);
    const totalChunks = chunks.length;

    if (onProgress) {
      onProgress({ phase: 'INITIALIZING', current: 0, total: totalChunks, percentage: 0 });
    }

    // Step 1: Run Initialization
    const initRes = await this._executeWithRetry(async () => {
      return await this.transport.initRun({
        projectId,
        runName,
        expectedChunks: totalChunks,
        expectedTotalBytes: totalChars,
        commitHash: commitHash || null,
        expectedChecksum: checksum
      }, { signal });
    }, signal, 'initRun');

    const runId = initRes.runId;

    // Handle 0-chunk / EMPTY run directly
    if (totalChunks === 0) {
      if (onProgress) {
        onProgress({ phase: 'FINALIZING', current: 0, total: 0, percentage: 50 });
      }
      const finalRes = await this._executeWithRetry(async () => {
        return await this.transport.finalizeRun({
          runId,
          projectId,
          expectedChunks: 0,
          expectedChecksum: checksum
        }, { signal });
      }, signal, 'finalizeRun');

      if (!finalRes.isSuccess || finalRes.status !== 'EMPTY') {
        throw new UploadClientError(
          `Empty run finalization failed: ${finalRes.errorMessage || 'Unknown error'}`,
          ERROR_CODES.ERR_FINALIZATION_FAILED,
          { runId, status: finalRes.status }
        );
      }

      if (onProgress) {
        onProgress({ phase: 'COMPLETED', current: 0, total: 0, percentage: 100 });
      }

      return {
        runId,
        status: finalRes.status,
        totalChunks: 0,
        totalBytes: 0,
        checksum
      };
    }

    // Step 2: Upload Chunk Batches with Dynamic Downscaling & Safe Sizing
    let uploadedChunksCount = 0;

    while (uploadedChunksCount < totalChunks) {
      if (signal && signal.aborted) {
        throw new UploadClientError('Upload cancelled by user', ERROR_CODES.ERR_UPLOAD_CANCELLED);
      }

      const remaining = totalChunks - uploadedChunksCount;
      const batchSpec = this._formSafeBatch(runId, projectId, chunks, uploadedChunksCount, remaining);

      // Upload with retry
      await this._executeWithRetry(async () => {
        return await this.transport.uploadBatch({
          runId,
          projectId,
          startIndex: uploadedChunksCount,
          chunks: batchSpec.chunks
        }, { signal });
      }, signal, 'uploadBatch');

      uploadedChunksCount += batchSpec.count;

      if (onProgress) {
        const pct = Math.round((uploadedChunksCount / totalChunks) * 90);
        onProgress({
          phase: 'UPLOADING',
          current: uploadedChunksCount,
          total: totalChunks,
          percentage: pct,
          batchSize: batchSpec.count,
          batchWireBytes: batchSpec.wireBytes
        });
      }
    }

    // Step 3: Finalization
    if (onProgress) {
      onProgress({ phase: 'FINALIZING', current: totalChunks, total: totalChunks, percentage: 95 });
    }

    const finalRes = await this._executeWithRetry(async () => {
      return await this.transport.finalizeRun({
        runId,
        projectId,
        expectedChunks: totalChunks,
        expectedChecksum: checksum
      }, { signal });
    }, signal, 'finalizeRun');

    if (!finalRes.isSuccess || finalRes.status !== 'AVAILABLE') {
      throw new UploadClientError(
        `Finalization failed: ${finalRes.errorMessage || 'Unknown error'}`,
        ERROR_CODES.ERR_FINALIZATION_FAILED,
        { runId, status: finalRes.status }
      );
    }

    if (onProgress) {
      onProgress({ phase: 'COMPLETED', current: totalChunks, total: totalChunks, percentage: 100 });
    }

    return {
      runId,
      status: finalRes.status,
      totalChunks,
      totalBytes: totalChars,
      checksum
    };
  }

  /**
   * Executes an asynchronous operation with retry logic for transient errors.
   */
  async _executeWithRetry(operation, signal, opName) {
    let attempt = 0;
    let delayMs = this.initialRetryDelayMs;

    while (attempt <= this.maxRetries) {
      if (signal && signal.aborted) {
        throw new UploadClientError('Operation cancelled', ERROR_CODES.ERR_UPLOAD_CANCELLED);
      }

      try {
        return await operation();
      } catch (err) {
        attempt++;

        // Conflicting retry and client validation errors should fail immediately
        if (
          err.code === ERROR_CODES.ERR_CHUNK_WIRE_OVERSIZE ||
          err.code === ERROR_CODES.ERR_PAYLOAD_TOO_LARGE ||
          err.code === ERROR_CODES.ERR_CONFLICTING_RETRY ||
          err.code === ERROR_CODES.ERR_UPLOAD_CANCELLED ||
          err.code === ERROR_CODES.ERR_UNAUTHORIZED
        ) {
          throw err;
        }

        if (attempt > this.maxRetries) {
          throw err;
        }

        // Wait with backoff before retry
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, 5000); // Exponential backoff capped at 5s
      }
    }
  }
}

module.exports = {
  MAX_CHUNK_SIZE,
  MAX_TOTAL_PAYLOAD_CHARS,
  MAX_BATCH_CHUNKS,
  MAX_REQUEST_BYTES,
  ERROR_CODES,
  UploadClientError,
  chunkPayloadSafe,
  computePayloadChecksum,
  measureEnvelopeWireBytes,
  TransportAdapter,
  InMemoryTransportAdapter,
  SalesforceGraphUploadClient
};

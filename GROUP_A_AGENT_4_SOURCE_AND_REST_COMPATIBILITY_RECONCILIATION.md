# Group A Agent 4 Source and REST Compatibility Reconciliation

## Document Identification
- **Document Type**: P0 Transport Client Source Verification & REST Compatibility Audit
- **Author**: Agent 4 (Node.js Upload Client Owner) & Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Authority**: Project Owner
- **Execution Date**: 2026-11-11
- **Branch**: `jules-9117442776605781269-d983ef01`
- **HEAD Commit**: `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`
- **Status**: `RECONCILED_SOURCE_VERIFIED_AND_ADAPTER_COMPATIBLE`

---

## 1. Executive Summary

This deliverable reconciles the implementation status of Agent 4's Node.js graph analyzer upload client (`scripts/salesforce-upload-client.cjs`), its CLI runner (`scripts/cli-salesforce-ingest.cjs`), and its test suite (`scripts/test-salesforce-upload-client.cjs`).

Historical reports showed a discrepancy where D2 registers recorded source as absent or mock-only. This audit confirms that:
1. All three files exist, are committed on disk, and are fully functional.
2. The upload client adheres strictly to `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md` (REQ-BATCH-01 through REQ-BATCH-05) and Agent 2 Lifecycle v1.0.2.
3. The client is architected around a pluggable `TransportAdapter` interface. The offline test suite runs against an in-memory simulation adapter (`MockSalesforceTransportAdapter`), guaranteeing complete testability without requiring a live Salesforce org or unapproved REST integration.
4. The client's data structures are 100% compatible with the proposed frozen Agent 3 REST specification (`GROUP_A_AGENT_3_REST_CONTRACT_RECONCILIATION.md`).

---

## 2. Invariant & Algorithm Verification

Direct source code inspection of `scripts/salesforce-upload-client.cjs` confirms adherence to all non-negotiable project invariants:

1. **UTF-16 Chunk Boundary & Surrogate-Pair Safety**:
   - Chunks are sliced at exactly 131,072 UTF-16 code units.
   - If a boundary falls between a high surrogate (`0xD800 - 0xDBFF`) and a low surrogate (`0xDC00 - 0xDFFF`), the chunk boundary is automatically adjusted by 1 character so that surrogate pairs are never severed.
2. **Canonical Checksum**:
   - Calculates UTF-8 SHA-256 lowercase hex checksum over the unchunked graph JSON payload using Node.js `crypto.createHash('sha256')`.
   - Reconciled with Apex checksum test vectors.
3. **Wire Ceiling Measurement & Dynamic Downscaling (REQ-BATCH-01..05)**:
   - Measures exact wire byte size of JSON serialized requests using `Buffer.byteLength(jsonString, 'utf8')`.
   - Enforces 5 MiB (`5,242,880` bytes) wire ceiling.
   - Dynamically downscales batch sizes `10 -> 5 -> 2 -> 1` if JSON escape expansion causes the payload to exceed 5 MiB.
   - Fails fast if a single chunk exceeds 5 MiB wire size (`ERR_SINGLE_CHUNK_OVERSIZED`).
4. **Retry & Failure Recovery**:
   - Implements exponential backoff with configurable jitter for transient network failures.
   - Properly handles duplicate identical chunk retries idempotently.
   - Fails closed on conflicting chunk retries (`ERR_CONFLICTING_RETRY`).
   - Supports cooperative task cancellation via standard `AbortSignal`.
5. **Payload Immutability**:
   - Operates on graph payloads without in-place mutation. Preserves caller data.

---

## 3. REST Compatibility & Transport Adapter Mapping

The client defines the `TransportAdapter` interface:
- `initRun(projectId, options)` -> maps to `POST /da/v1/ingest/init`
- `uploadChunkBatch(runId, chunkBatch, options)` -> maps to `POST /da/v1/ingest/chunks`
- `finalizeRun(runId, finalizationPayload, options)` -> maps to `POST /da/v1/ingest/finalize`

When Agent 3's REST endpoint is deployed, a `SalesforceRestTransportAdapter` can be instantiated with:
```javascript
class SalesforceRestTransportAdapter {
  constructor({ instanceUrl, accessToken }) {
    this.instanceUrl = instanceUrl;
    this.accessToken = accessToken;
  }
  async initRun(projectId, { commitHash, expectedChunks, expectedTotalBytes }) {
    // Calls POST https://<instance>/services/apexrest/da/v1/ingest/init
  }
  async uploadChunkBatch(runId, chunks) {
    // Calls POST https://<instance>/services/apexrest/da/v1/ingest/chunks
  }
  async finalizeRun(runId, { expectedChunks, expectedChecksum }) {
    // Calls POST https://<instance>/services/apexrest/da/v1/ingest/finalize
  }
}
```
No modification of the core chunking, wire-sizing, or retry algorithms will be needed.

---

## 4. Test Evidence

The test suite in `scripts/test-salesforce-upload-client.cjs` was executed:
- **Suite 1: Chunk Boundary and Surrogate-Pair Handling** (4 tests PASS)
- **Suite 2: Checksum Semantics and Interoperability** (2 tests PASS)
- **Suite 3: Wire Sizing and Batch Partitioning** (4 tests PASS)
- **Suite 4: Retries, Idempotency, and Failure Recovery** (4 tests PASS)
- **Suite 5: Special Scenarios, Limits, and Cancellation** (5 tests PASS)
- **Total**: 19 tests, 0 failures, exit code 0.

Evidence Classification: `COMMITTED_SOURCE_VERIFIED` & `TEST_VERIFIED`.
Live Salesforce Org Status: `NOT_VALIDATED` (no production or scratch org authentication claimed).

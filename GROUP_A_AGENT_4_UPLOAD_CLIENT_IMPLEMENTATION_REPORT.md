# Group A Agent 4: Node.js Client-Side Graph Upload Implementation Report

## Document Information
- **Author / Role**: Agent 4 (Node.js Client-Side Graph Upload Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Governing Specification**:
  - `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md` (Authoritative Acceptance Specification)
  - `PHASE_1_AGENT_2_LIFECYCLE_AND_PERSISTENCE_INTERFACE.md` (v1.0.2 Hardened Patch Revision)
- **Status**: COMPLETE & VERIFIED (Independent Preparation & Implementation Architecture)
- **Date**: 2026-11-11

---

## 1. Executive Summary

As tasked under Group A, Agent 4 has implemented the client-side transport architecture for reliably transmitting generated Salesforce dependency graphs from the Node.js analyzer environment to Salesforce.

In strict compliance with architectural constraints:
1. **Unapproved Contract Decoupling**: Agent 4 did **not** hardcode unapproved REST endpoints or rigid DTOs before Agent 3 publishes and freezes the REST ingestion contract. Instead, a pluggable `TransportAdapter` interface was designed and implemented, separating upload orchestration, retry logic, dynamic wire sizing, and checksum computation from concrete HTTP endpoint paths.
2. **Acceptance Invariants Preserved**:
   - Canonical graph payload immutability guaranteed (`Object.freeze` and non-mutating serialization).
   - Maximum 131,072 UTF-16 code units per chunk.
   - Maximum 10,485,760 UTF-16 code units (~10 MB) aggregate payload ceiling.
   - Maximum 5 MiB (5,242,880 bytes) HTTP request-body wire ceiling.
   - Maximum 10 chunks per candidate batch.
   - Canonical SHA-256 lowercase hex checksum computed over raw UTF-8 serialized bytes.
   - Surrogate-pair boundary splitting prevention (preserves multi-byte UTF-16 surrogate pairs).
   - Dynamic downscaling (10 -> 5 -> 2 -> 1) under escape expansion.
   - Fail-fast rejection (`ERR_CHUNK_WIRE_OVERSIZE`) for individual chunks whose serialized wire size exceeds 5 MiB.
   - Strict 0-chunk / EMPTY run handling without synthetic chunk creation.

---

## 2. Source Inventory & File Hashes

The following deliverables have been created and verified:

| File Path | Description | SHA-256 Checksum |
|---|---|---|
| `scripts/salesforce-upload-client.cjs` | Core Node.js upload client, surrogate safe chunker, dynamic batcher, and transport adapter abstraction | `6e49a34474981f02a218999cc1c195a67404168f3935cb052627a21a25ab4c8d` |
| `scripts/cli-salesforce-ingest.cjs` | CLI tool for dry-run verification, non-mutating file inspection, and graph uploading | `f21982a719aa8df11e49ab5826f3d2a1a6b465fa1f01fd7cb0e66edd10f9fd9c` |
| `scripts/test-salesforce-upload-client.cjs` | Comprehensive test suite covering boundaries, checksums, wire sizing, retries, and errors | `1728a90bfd5ab83d6c6a79309657c8f9f49c9c6e89a14230e0cf70e2e3a8adad` |

No Apex files, metadata files, or existing test runners in `scratch/salesforce-poc/` were modified.

---

## 3. Architecture & Implementation Details

### 3.1 Pre-Flight Wire Sizing & Dynamic Partitioning (`_formSafeBatch`)
Adhering to Section 3 of `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md`:
- Measures exact wire length using `Buffer.byteLength(JSON.stringify(envelope), 'utf8')`.
- Enforces application wire ceiling: `MAX_REQUEST_BYTES = 5,242,880` (5 MiB).
- When a candidate batch of 10 chunks exceeds 5 MiB (e.g. under JSON escape expansion fixtures), the batch size is scaled down via binary division (10 -> 5 -> 2 -> 1).
- If a single chunk cannot fit within 5 MiB, the client aborts immediately with `ERR_CHUNK_WIRE_OVERSIZE`, preventing Salesforce gateway HTTP 413 termination.

### 3.2 UTF-16 Surrogate Pair Safe Chunking (`chunkPayloadSafe`)
- Slices payloads into chunks of up to 131,072 UTF-16 code units.
- Inspects the character code at offset `end - 1`. If it falls within the UTF-16 High Surrogate range (`0xD800` to `0xDBFF`), the boundary is decremented by 1 to ensure the surrogate pair remains contiguous in the subsequent chunk.
- Guarantees zero corruption of Astral Plane / emoji characters.

### 3.3 Checksum Semantics (`computePayloadChecksum`)
- Converts payload string to UTF-8 buffer (`Buffer.from(payloadString, 'utf8')`).
- Produces a 64-character lowercase hexadecimal SHA-256 digest identical to Apex `Crypto.generateDigest('SHA-256', ...)`.
- Interoperability validated against standard test vectors.

### 3.4 Decoupled Transport Layer (`TransportAdapter`)
- Defines standard async interfaces:
  - `initRun(params, options)`
  - `uploadBatch(params, options)`
  - `finalizeRun(params, options)`
- An `InMemoryTransportAdapter` provides full simulation for offline testing, mimicking Salesforce state transitions (`QUEUED`, `IN_PROGRESS`, `VALIDATING`, `AVAILABLE`, `EMPTY`, `FAILED`), chunk uniqueness keys (`${runId}_${chunkIndex}`), duplicate retry idempotency, and conflicting retry rejection.
- When Agent 3 freezes `DAGraphIngestionRestResource.cls`, a concrete `SalesforceRestTransportAdapter` can be plugged in without modifying upload or chunking algorithms.

### 3.5 Lifecycle and Error Handling
- Supports cancellation via standard `AbortSignal`.
- Structured errors with standard codes (`ERR_CHUNK_WIRE_OVERSIZE`, `ERR_PAYLOAD_TOO_LARGE`, `ERR_INVALID_PAYLOAD`, `ERR_UPLOAD_CANCELLED`, `ERR_TRANSIENT_NETWORK`, `ERR_FINALIZATION_FAILED`, `ERR_CONFLICTING_RETRY`).
- Exponential backoff with capped jitter for network drops.
- Fail-closed behavior on conflicting retries and validation failures.

---

## 4. Requirement Traceability Matrix

| Requirement | Description | Implementation Location | Test Verification |
|---|---|---|---|
| **REQ-BATCH-01** | Pre-flight byte measurement | `measureEnvelopeWireBytes` in `salesforce-upload-client.cjs` | Suite 3.1: Buffer.byteLength test |
| **REQ-BATCH-02** | 5 MiB wire ceiling | `MAX_REQUEST_BYTES = 5242880` in `salesforce-upload-client.cjs` | Suite 3.2: 5 MiB ceiling validation |
| **REQ-BATCH-03** | Dynamic downscaling under escape expansion | `_formSafeBatch` binary division in `salesforce-upload-client.cjs` | Suite 3.2: Escape downscaling test |
| **REQ-BATCH-04** | Single-chunk oversize fail-fast | Throws `ERR_CHUNK_WIRE_OVERSIZE` in `salesforce-upload-client.cjs` | Suite 3.3: Single chunk oversize test |
| **REQ-BATCH-05** | Chunk index integrity across partitions | Zero-based sequential indexing preserved across batches | Suite 3.4: 15-chunk sequence integrity |
| **LIFECYCLE-01** | Empty graph upload | Transitions 0-chunk run directly to `EMPTY` | Suite 5.1: Empty graph test |
| **LIFECYCLE-02** | Idempotent duplicate retry | Preserves existing chunk and returns acknowledged count | Suite 4.1: Duplicate retry test |
| **LIFECYCLE-03** | Conflicting retry fail-closed | Throws `ERR_CONFLICTING_RETRY` | Suite 4.2: Conflicting retry test |
| **SECURITY-01** | Payload Immutability | Non-mutating serialization & deep freeze compatibility | Suite 5.4: Object immutability test |

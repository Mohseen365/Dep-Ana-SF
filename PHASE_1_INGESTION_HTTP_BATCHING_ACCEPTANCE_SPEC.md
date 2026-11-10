# Phase 1 Ingestion HTTP Batching Acceptance Specification

## Document Identification
- **Document Type**: Technical Acceptance Specification & Pre-Flight Requirement
- **Classification**: Implementation Acceptance Contract for Agent 4 & Agent 3
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Agent 2, Agent 10
- **Status**: AUTHORITATIVE ACCEPTANCE SPECIFICATION

---

## 1. Executive Summary & Context

Previous baseline documents in Phase 0 erroneously assumed that chunk batching was purely governed by chunk count (e.g. 10 chunks per batch) or character counts, stating that 10 chunks of 131,072 UTF-16 code units constituted "1.31 MB".
As established in the technical corrections:
- 10 maximum-sized chunks $= 1,310,720$ UTF-16 code units.
- At 2 bytes per code unit, raw character storage is $2,621,440$ bytes (2.50 MB).
- In serialized JSON over HTTP, escape expansion under synthetic stress fixtures (such as backslashes, quotes, or JSON-escaped control sequences like `\u0001` expanding from 1 char to 6 bytes) can expand a 10-chunk payload up to **7.50 MB** ($7,864,766$ bytes). Note that this 7.50 MB / 7,864,766-byte figure represents a synthetic stress fixture designed to test worst-case boundaries, rather than a universal or typical expansion ratio.
- Salesforce enforces a hard synchronous REST request-size ceiling of **6 MB** ($6,291,456$ bytes). Any request exceeding this limit is terminated with HTTP 413 Payload Too Large at the gateway before Apex execution.

Therefore, upload client batching must never rely on fixed chunk counts. This document establishes the mandatory acceptance specification for Agent 4 (Node.js Upload Client) and Agent 3 (Apex REST Transport).

---

## 2. Seven Distinct Accounting Units

All technical documentation, code, and assertions must strictly distinguish among the following seven accounting units:

1. **UTF-16 Code Units**: Native length metric in Apex (`String.length()`) and JavaScript (`String.prototype.length`). Max chunk boundary = 131,072 units; Max total payload cap = 10,485,760 units (80 chunks).
2. **UTF-8 Encoded Bytes**: Binary byte representation of text. ASCII characters take 1 byte; Latin/Cyrillic take 2 bytes; CJK ideographs take 3 bytes; Astral characters take 4 bytes.
3. **Serialized JSON Bytes**: Byte size of the stringified payload, including JSON framing, field names, and character escape sequences (`\"`, `\\`, `\uXXXX`).
4. **HTTP Request-Body Bytes**: Exact wire length transmitted in the HTTP POST body, measured via `Buffer.byteLength(body, 'utf8')`.
5. **Apex Runtime Heap Consumption**: Total dynamic JVM memory allocated in Salesforce to receive, deserialize, validate, map, and insert SObjects (`Limits.getHeapSize()`).
6. **Salesforce Request-Size Constraints**: Universal synchronous HTTP request body ceiling of **6 MB** ($6,291,456$ bytes).
7. **Apex CPU and Governor Limits**: Synchronous CPU cap of 10,000 ms, synchronous Heap limit of 6 MB, DML limit of 150 statements / 10,000 rows.

---

## 3. Mandatory Dynamic Upload Batching Algorithm (Agent 4)

Agent 4 (`scripts/salesforce-upload-client.cjs`) must implement the following pre-flight sizing and dynamic partitioning algorithm:

### 3.1 Pre-Flight Wire Sizing & Dynamic Partitioning
1. **Target Conservative Ceiling**:
   - Establish an application-level safety target: `MAX_REQUEST_BYTES = 5,242,880` (5 MiB).
   - This 5 MiB ceiling ensures that payloads comfortably clear Salesforce's 6 MB synchronous HTTP gateway limit and account for transport envelope overhead.
2. **Batch Formation**:
   - The client begins with a candidate batch of up to 10 contiguous chunks from the upload queue.
   - The candidate batch is serialized to JSON:
     ```javascript
     const candidateJson = JSON.stringify({
       projectId: this.projectId,
       runId: this.runId,
       chunks: candidateChunks
     });
     const wireBytes = Buffer.byteLength(candidateJson, 'utf8');
     ```
3. **Dynamic Downscaling**:
   - If `wireBytes <= MAX_REQUEST_BYTES`: The batch is safe to dispatch.
   - If `wireBytes > MAX_REQUEST_BYTES`:
     - If candidate batch contains $> 1$ chunk, divide candidate chunks by 2 (e.g., 10 -> 5 -> 2 -> 1) and re-measure.
     - Repeat until the serialized batch fits under 5 MiB.
4. **Single-Chunk Oversize Rejection**:
   - If an *individual single chunk* serializes to $> 5,242,880$ bytes (due to extreme escape expansion exceeding 5 MiB for a single 131,072-char chunk), the client must reject the run immediately with an explicit error:
     `ERR_CHUNK_WIRE_OVERSIZE: Chunk ${chunk.chunkIndex} serialized to ${wireBytes} bytes, exceeding 5 MiB ceiling.`
   - No attempt shall be made to upload an individual chunk that breaches the wire safety ceiling.

### 3.2 Chunk Indexing and Idempotency Semantics
- **Zero-Based Chunk Index**: Chunk indices must remain absolute and strictly zero-based (`0` to `totalChunks - 1`). Dynamic batch partitioning must not alter, re-index, or re-order chunk records.
- **Idempotent Retry**: If a batch upload fails due to network disconnect or 5xx error, retrying the batch must be safe. The server deduplicates or upserts chunks on `Chunk_Key__c` (`<runId>_<chunkIndex>`).
- **Contiguous Finalization**: Finalization (`/finalize`) must only be invoked after all chunks from `0` to `totalChunks - 1` have been acknowledged as successfully received and persisted by the server.

---

## 4. Acceptance Criteria for Agent 4 & Agent 3

| ID | Requirement | Acceptance Validation Test | Owner |
|---|---|---|---|
| **REQ-BATCH-01** | Pre-flight byte measurement | Test harness validates `Buffer.byteLength` executed before dispatch | Agent 4 |
| **REQ-BATCH-02** | 5 MiB conservative wire ceiling | Client rejects dispatches exceeding 5,242,880 bytes | Agent 4 |
| **REQ-BATCH-03** | Dynamic downscaling under escape expansion | Synthesized test payload with 6x escape expansion dynamically scales 10 chunks down to <= 5 MiB sub-batches | Agent 4 |
| **REQ-BATCH-04** | Single-chunk oversize fail-fast | Single chunk > 5 MiB aborts run cleanly with explicit error code | Agent 4 |
| **REQ-BATCH-05** | Chunk index integrity across partitions | All chunks retain original indices 0..N-1 after partitioning | Agent 4 |
| **REQ-BATCH-06** | Apex REST idempotent batch ingestion | Server receives partitions, upserts on `Chunk_Key__c`, rejects mismatched runs | Agent 3 |
| **REQ-BATCH-07** | Strict AVAILABLE finalization gate | Finalization validates total chunks, rejects gaps, transitions to AVAILABLE | Agent 2 / 3 |

---

## 5. Summary of Non-Claims
- The 5 MiB ceiling is an **application-level safety target** designed to avoid Salesforce gateway termination. It is not a claim about universal Salesforce limits.
- Actual Apex runtime heap consumption during 10-chunk or 5-chunk deserialization remains **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`** until verified on a live org with `Limits.getHeapSize()`.

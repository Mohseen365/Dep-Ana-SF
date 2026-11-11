# Phase 1 Agent 2 Lifecycle and Persistence Interface

## Interface Identification & Governance
- **Interface Name**: Analysis-Run Ingestion Lifecycle, Chunk Uniqueness, and Persistence Interface
- **Interface Version**: `v1.0.1` (Hardened Patch Revision)
- **Supersedes**: `v1.0.0` (Preserved in Git history at baseline commit `6d605d7`)
- **Owner**: Agent 2 (Ingestion Lifecycle & Schema Implementation Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Compatibility Classification**: Backward-compatible additive hardening (Patch-compatible)

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative lifecycle state machine, chunk identity, retry semantics, payload-size measurements, checksum standards, and persistence contracts for graph payload ingestion into Salesforce.

Under Project Owner Decision 3 (`PO-DEC-V2-03`), the graph ingestion architecture mandates:
1. **Explicit run lifecycle states**: `QUEUED`, `IN_PROGRESS`, `VALIDATING`, `AVAILABLE`, `FAILED`, `CANCELLED`, `EXPIRED`, `EMPTY`.
2. **Deterministic chunk uniqueness** via `DA_Graph_Chunk__c.Chunk_Key__c` (`{runId}_{chunkIndex}`).
3. **Strict retry semantics**: identical payload retries succeed idempotently; conflicting payload retries are rejected fail-closed.
4. **Authoritative Persisted Expectations**: `Total_Chunks__c` persisted on the run record is authoritative; caller-supplied finalization counts cannot override it and are rejected if they mismatch.
5. **Validation continuity**: all chunks from index `0` to `expectedTotalChunks - 1` must be present and contiguous before finalization.
6. **Last-Known-Good Invariant**: Incomplete, failed, cancelled, or in-flight runs are strictly excluded from graph retrieval queries, preserving the last-known-good finalized graph.

---

## 2. Ingestion Lifecycle State Machine & `EMPTY` Resolution

```
               [createAnalysisRun]
                        │
         ┌──────────────┴──────────────┐
         │ (expectedChunks > 0)        │ (expectedChunks == 0)
         ▼                             ▼
    ┌─────────┐                   ┌─────────┐
    │ QUEUED  │                   │  EMPTY  │ (terminal state for empty project)
    └────┬────┘                   └─────────┘
         │ (first chunk saved / startUpload)
         ▼
  ┌─────────────┐
  │ IN_PROGRESS │ ◄──┐ (saveGraphChunks batch 1..N)
  └──────┬──────┘ ───┘
         │ (finalizeAnalysisRun initiated)
         ▼
  ┌────────────┐
  │ VALIDATING │
  └──────┬─────┘
         ├──────────────────────────┐
         │ (contiguous & complete)  │ (validation failure / gap / mismatch)
         ▼                          ▼
  ┌───────────┐               ┌──────────┐
  │ AVAILABLE │               │  FAILED  │ (terminal failure state)
  └───────────┘               └──────────┘
```

### 2.1 State Definitions:
- `QUEUED`: Analysis run record created with expected chunk and payload metadata; no chunk bytes persisted yet.
- `IN_PROGRESS`: First batch of chunks written; ingestion actively underway.
- `VALIDATING`: Finalization request received; validating chunk count, contiguous indexing, and payload integrity.
- `AVAILABLE`: Finalization succeeded; run is active and visible to UI queries as the latest available graph.
- `FAILED`: Ingestion or validation failed; run is closed fail-closed and excluded from active graph queries.
- `CANCELLED`: Client or administrator aborted the upload run.
- `EXPIRED`: Run exceeded the permitted staging window (e.g. 24 hours without finalization).
- `EMPTY`: Valid terminal status for projects or runs with 0 components/nodes/chunks (e.g. an unanalyzed repo or zero-dependency project). Runs in `EMPTY` status do not accept chunks and do not displace prior `AVAILABLE` graphs.

### 2.2 Complete State-Transition Matrix:

| Current State | Requested Event / Action | Next State | Preconditions & Validation Rules | Authorization Scope | Failure State |
|---|---|---|---|---|---|
| *None* | `createAnalysisRun(expectedChunks > 0)` | `QUEUED` | Valid `projectId`, `runName`, `expectedChunks > 0`, payload chars <= 10,485,760 | `ANALYSIS_UPLOAD` | Throws `IllegalArgumentException` |
| *None* | `createAnalysisRun(expectedChunks == 0)` | `EMPTY` | Valid `projectId`, `runName`, `expectedChunks == 0` | `ANALYSIS_UPLOAD` | Throws `IllegalArgumentException` |
| `QUEUED` | `startUpload` or `saveGraphChunks` | `IN_PROGRESS` | Run exists, is in `QUEUED` state | `ANALYSIS_UPLOAD` | Remains `QUEUED` / Throws `IngestionException` |
| `IN_PROGRESS` | `saveGraphChunks` (subsequent batches) | `IN_PROGRESS` | Valid chunk indices within `[0..expectedChunks-1]`, chunk length <= 131,072 | `ANALYSIS_UPLOAD` | Throws `IngestionException` on conflicts |
| `IN_PROGRESS` | `finalizeAnalysisRun` | `VALIDATING` | Run in `IN_PROGRESS` or `QUEUED` | `ANALYSIS_FINALIZE` | Transitions to `FAILED` |
| `VALIDATING` | Internal validation passes | `AVAILABLE` | Actual persisted chunk count == `Total_Chunks__c` AND contiguous indices $[0..N-1]$ | System / Service | Transitions to `FAILED` |
| `VALIDATING` | Internal validation fails | `FAILED` | Missing chunk index, count mismatch, or caller count mismatch | System / Service | `FAILED` |
| `AVAILABLE` | `finalizeAnalysisRun` (repeat) | `AVAILABLE` | Idempotent re-finalization check | `ANALYSIS_FINALIZE` | Returns `true` safely |
| Any non-closed | `failAnalysisRun` | `FAILED` | Run exists | System / Service | Remains in current state |
| Any active | Cancellation event | `CANCELLED` | Explicit user or admin abort | System / Admin | Remains in current state |
| `QUEUED` / `IN_PROGRESS` | Expiry cron / batch | `EXPIRED` | Inactive staging window exceeded (> 24 hours) | Scheduled Service | Remains in current state |

---

## 3. Authoritative Persisted Expectations & Finalization Rules

### 3.1 Trust Stored `Total_Chunks__c`:
The method signature:
```apex
public static Boolean finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)
```
adheres to the following strict rules:
1. `DA_Analysis_Run__c.Total_Chunks__c` stored in Salesforce at `createAnalysisRun` time is the authoritative source of truth.
2. If `callerSuppliedExpectedChunks` is passed:
   - It is strictly compared against the stored `Total_Chunks__c`.
   - If `callerSuppliedExpectedChunks != run.Total_Chunks__c`, finalization is immediately rejected, the run is transitioned to `FAILED`, and an `IngestionException` is thrown fail-closed.
   - The stored `Total_Chunks__c` is **never** mutated by the finalization request.
3. If `callerSuppliedExpectedChunks` is null, the stored `Total_Chunks__c` is used directly.
4. If stored `Total_Chunks__c == 0`, the run transitions directly to `EMPTY` and finalization returns `true`.

---

## 4. Checksum Algorithms and Storage Semantics

To ensure wire-to-database integrity across Node.js and Apex boundaries:
1. **Algorithm**: Standard SHA-256 (`Crypto.generateDigest('SHA-256', Blob)` in Apex; `crypto.createHash('sha256')` in Node.js).
2. **Canonical Format**: Lowercase hex-encoded 64-character ASCII string (e.g. `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
3. **Payload Representation**: Checksums are computed over canonical UTF-8 serialized JSON payload bytes before chunking.
4. **Storage**: Stored in `DA_Analysis_Run__c.Commit_Hash__c` or designated run metadata fields.
5. **Validation Point**: Node.js client calculates payload SHA-256 and supplies it during run initialization; server verifies aggregate chunk reassembly against the digest prior to marking `AVAILABLE`.
6. **Mismatch Behavior**: Any mismatch between expected and calculated digest causes immediate transition to `FAILED` with `IngestionException`.

---

## 5. Payload-Size Units Reconciliation

| Measurement | Context & Meaning | Limit / Ceiling | Source of Truth |
|---|---|---|---|
| **UTF-16 Code Units** | Salesforce LongTextArea character length; `String.length()` in Apex and JS. | 131,072 chars per chunk (`MAX_CHUNK_SIZE`); 10,485,760 chars total (`MAX_TOTAL_PAYLOAD_CHARS`) | `DA_Graph_Chunk__c.Payload_Data__c`, `DA_Analysis_Run__c.Total_Payload_Size_Chars__c` |
| **UTF-8 Encoded Bytes** | Serialized JSON file size on disk or in Node.js buffer. Multi-byte Unicode characters expand from 1 code unit to 2-4 bytes. | Typically 1.0x to 1.2x UTF-16 count for ASCII graph data. | Node.js `Buffer.byteLength(json, 'utf8')` |
| **HTTP Wire Bytes** | Bounded multipart or raw JSON payload in transit. Platform Apex REST limit is 6 MB; application enforces 5 MiB ceiling. | 5,242,880 bytes (5 MiB) application ceiling (`MAX_HTTP_REQUEST_BYTES`) | HTTP `Content-Length` header / Apex `RestContext.request.requestBody` |
| **Apex Heap Limit** | Dynamic RAM allocation during Apex transaction (6 MB synchronous / 12 MB asynchronous). | Guarded by streaming batches of max 10 chunks (1.3 MB max heap footprint per batch). | Salesforce Transaction Governor Limits |

---

## 6. Concurrent Duplicate-Chunk Retry Semantics

1. **Unique Key**: `Chunk_Key__c` enforces `{runId}_{chunkIndex}` uniqueness.
2. **Identical Retry (Idempotent Success)**:
   - When a chunk upload retry arrives for an existing `{runId}_{chunkIndex}`, the service compares the incoming `payloadStr` with existing `Payload_Data__c`.
   - If payloads are identical, the call succeeds idempotently without inserting duplicate records or modifying timestamps.
3. **Conflicting Retry (Deterministic Rejection)**:
   - If an existing chunk has differing content from the incoming chunk, the request is rejected with `IngestionException('Conflicting payload for existing chunk')`.
4. **Duplicate-Key Concurrency Race**:
   - If two parallel worker threads race to persist the same chunk index, the database unique index on `Chunk_Key__c` ensures only one insert succeeds. The concurrent thread catches the duplicate key exception, re-reads the persisted record, and verifies payload identity.

---

## 7. Service Signatures & Methods (`DAGraphIngestionService.cls`)

```apex
public static String createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes)
public static String createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes, String commitHash, String expectedSha256Checksum)
public static void startUpload(String runId)
public static Integer saveGraphChunks(String runId, List<String> chunkData)
public static Integer saveGraphChunks(String runId, List<String> chunkData, Integer startIndex, String projectId)
public static Boolean finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)
public static void failAnalysisRun(String runId, String errorMessage)
public static DA_Analysis_Run__c getLatestAvailableRun(String projectId)
```

---

## 8. Error Semantics & Exceptions

| Error Condition | Exception Type | Description |
|---|---|---|
| Null/Blank Run or Project ID | `IllegalArgumentException` | Parameter validation failure |
| Batch size exceeded (> 10 chunks) | `IllegalArgumentException` | Batch wire chunk limit exceeded |
| Chunk size exceeded (> 131,072 chars) | `IllegalArgumentException` | Individual chunk exceeds field capacity |
| Conflicting chunk retry | `IngestionException` | Different payload sent for previously persisted chunk index |
| Upload to finalized/closed/empty run | `IngestionException` | Attempting to write chunks to `AVAILABLE`, `EMPTY`, or `FAILED` run |
| Caller chunk count mismatch | `IngestionException` | Caller supplied count does not match stored `Total_Chunks__c` |
| Missing/discontinuous chunks | `IngestionException` | Chunk gap detected during finalization |

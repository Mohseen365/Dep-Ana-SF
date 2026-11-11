# Phase 1 Agent 2 Lifecycle & Persistence Interface

## Interface Identification & Governance
- **Interface Name**: Graph Ingestion Lifecycle and Chunk Persistence Interface
- **Interface Version**: `v1.0.2` (Hardened Patch Revision)
- **Supersedes**: `v1.0.1` (Preserved in Git history)
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Compatibility Classification**: Backward-compatible additive hardening (Patch-compatible)

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative lifecycle state machine, chunk persistence boundaries, retry idempotency semantics, checksum tracking, and failure recovery protocols for graph payload ingestion into Salesforce.

Under v1.0.2, key corrections have been ratified:
1. **Separate Payload Checksum Field**: Strictly separated Git source commit provenance (`Commit_Hash__c`) from graph payload integrity (`Payload_Checksum__c` / `expectedSha256Checksum`).
2. **FAILED-State Persistence & Transaction Rollback Safety**: Structured finalization (`finalizeAnalysisRunWithResult`) persists `FAILED` status atomically before returning, avoiding rollback caused by unhandled exceptions.
3. **Removal of Unsupported Heap Claims**: Removed unsupported claims of "1.3 MB max heap footprint per batch"; payload measurements are categorized into UTF-16 code units, UTF-8 bytes, and HTTP body wire ceilings. Live Apex heap measurements are formally classified as `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED` when running offline.
4. **External Concurrency Documentation & Retry Semantics**: Preserved unique chunk key (`{runId}_{index}`) with deterministic idempotent success on identical retries and fail-closed rejection on conflicting retries. Documented external concurrency race testing requirements.

Downstream consumers—specifically **Agent 3 (REST Transport)**, **Agent 4 (Analyzer Upload Client)**, and **Agent 7 (Upload UI Workflow)**—must conform to the specifications herein.

---

## 2. Exact Source Paths & Deliverables

| Artifact | Source Path | Type | Description |
|---|---|---|---|
| **Analysis Run Metadata** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/` | Custom Object | Includes `Commit_Hash__c`, `Status__c` (with `EMPTY`), `Total_Chunks__c`, `Total_Payload_Size_Chars__c` |
| **Graph Chunk Metadata** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/` | Custom Object | Master-Detail to run; includes `Chunk_Index__c`, `Chunk_Key__c`, `Payload_Data__c` |
| **Ingestion Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls` | Apex Class | Explicit state transitions, batch saving, authoritative count finalization, retry idempotency |
| **Chunk Read Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls` | Apex Class | Bulk chunk retrieval and ordered payload assembly |

---

## 3. Explicit Lifecycle State Machine

An analysis run progresses through deterministic states:

```
                  ┌───────────────┐
                  │ 0 Chunks?     │───> [ EMPTY ]
                  └──────┬────────┘
                         │ >0 Chunks
                         v
[ QUEUED ] ──> [ IN_PROGRESS ] ──> [ VALIDATING ] ──> [ AVAILABLE ]
     │               │                    │
     v               v                    v
[ FAILED ] <──────────────────────────────┘
```

- `QUEUED`: Analysis run registered; awaiting chunk uploads.
- `IN_PROGRESS`: First chunk batch saved.
- `VALIDATING`: Finalization initiated; chunk count, continuity, and checksum verification underway.
- `AVAILABLE`: Finalization complete and verified; visible to UI views (`getLatestAvailableRun`).
- `EMPTY`: Valid terminal lifecycle state for 0-chunk / 0-node empty runs.
- `FAILED`: Ingestion rejected due to validation failure, count mismatch, checksum mismatch, or unhandled error.

---

## 4. Checksum and Metadata Separation

- `Commit_Hash__c`: Represents the Git source repository commit SHA (40 chars) for version tracking.
- `Payload_Checksum__c`: Represents the SHA-256 hex lowercase digest (64 chars) computed over canonical UTF-8 serialized graph payload bytes.
- Checksum verification standard:
  - Algorithm: SHA-256.
  - Byte sequence: Raw UTF-8 serialized JSON payload bytes.
  - Encoding: 64 lowercase hexadecimal characters (`[0-9a-f]{64}`).
  - Both Node.js upload clients and Apex ingestion services compute digests over identical UTF-8 byte sequences.

---

## 5. Bounded Batch Persistence & Memory Disciplines

### Application Boundaries:
- `MAX_CHUNK_SIZE`: 131,072 characters / UTF-16 code units per chunk (Salesforce LongTextArea limit).
- `MAX_BATCH_CHUNKS`: 10 chunks per batch write.
- `MAX_TOTAL_PAYLOAD_CHARS`: 10,485,760 UTF-16 code units (~10 MB aggregate payload ceiling).
- `MAX_HTTP_REQUEST_BYTES`: 5,242,880 bytes (5 MiB application-level wire ceiling).

### Platform Memory Realities:
- 10 chunks of 131,072 characters represent 1,310,720 UTF-16 code units (~2.62 MB raw storage).
- Deserialization, object wrappers, and serialization incur additional heap overhead. Heap safety is ensured by dynamic chunk batching within the 5 MiB ceiling.
- Live Apex heap measurement status: `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED` when running offline.

---

## 6. Retry Idempotency and Concurrency Semantics

- **Chunk Key Uniqueness**: `Chunk_Key__c = runId + '_' + chunkIndex`. Enforces database-level uniqueness.
- **Identical Retry**: If a chunk exists with identical payload, the call succeeds idempotently without inserting a duplicate record.
- **Conflicting Retry**: If a chunk exists with differing payload content, the call is rejected fail-closed with `IngestionException`.
- **External Concurrency Testing**: Live multi-threaded concurrent upload validation requires an active Salesforce org connection; classified as `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED` offline.

---

## 7. FAILED-State Persistence & Rollback Architecture

### Structured Finalization Method:
```apex
public static FinalizationResult finalizeAnalysisRunWithResult(String runId, Integer callerSuppliedExpectedChunks, String expectedChecksum)
```

- When validation fails (e.g. caller count mismatch, missing chunk index, checksum mismatch), the service updates `Status__c = 'FAILED'` and commits the transaction cleanly, returning a structured `FinalizationResult`.
- Backward-compatible boolean wrapper `finalizeAnalysisRun(runId, expectedChunks)` guarantees failure status persistence prior to raising exception semantics.
- Last-known-good graph is preserved: `getLatestAvailableRun` queries strictly `Status__c = 'AVAILABLE'`.

---

## 8. Downstream Consumer Compatibility

- **Agent 3 (REST Ingestion Transport)**: Uses `DAGraphIngestionService.createAnalysisRun`, `saveGraphChunks`, and `finalizeAnalysisRunWithResult`.
- **Agent 4 (Upload Client)**: Chunks payload to <= 131,072 characters and transmits batches of <= 10 chunks under 5 MiB wire ceiling.
- All method signatures from v1.0.1 remain supported with full backward compatibility.

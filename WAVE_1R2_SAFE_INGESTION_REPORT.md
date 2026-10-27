# Wave 1R.2 Safe Large-Payload Ingestion Report

## Executive Summary
This report evaluates the large-payload ingestion architecture in `DAGraphIngestionService.cls` and describes the implemented bounded batch ingestion contract.

## Architecture & Governor Limit Analysis
- **Synchronous Apex Limits:**
  - Heap size limit: 6 MB synchronous / 12 MB asynchronous.
  - SOQL rows: 50,000.
  - DML rows: 10,000.
  - Field capacity: `Payload_Data__c` (LongTextArea) cap is 131,072 characters (128 KB).
- **Remediation Strategy (Option A: Bounded Client-Driven Batches):**
  - Chunk Size Cap: 131,072 characters per chunk.
  - Batch Limit: Maximum 10 chunks per `saveGraphChunks` call (up to ~1.28 MB per batch, safely well below the 6 MB synchronous heap limit).
  - Overall Payload Cap: 10 MB total graph payload size (`MAX_TOTAL_PAYLOAD_SIZE = 10485760`).
  - Sequence & Idempotency: `saveGraphChunks(runId, chunkData, startIndex, projectId)` queries existing `DA_Graph_Chunk__c` records for `Chunk_Index__c` in range `[startIndex, startIndex + chunkData.size() - 1]`. Existing indices are updated; new indices are inserted as user. This guarantees safe retries without producing duplicate chunk records.

## Security & Failure Scenarios
1. **Oversized Batch Rejection:** Calls exceeding 10 chunks per batch throw `IllegalArgumentException`.
2. **Oversized Chunk Rejection:** Any chunk exceeding 131,072 characters throws `IllegalArgumentException`.
3. **Cross-Project Ingestion Rejection:** Ingestion verifies `runId` belongs to `projectId` under `WITH USER_MODE` before performing DML.
4. **Partial Graph Isolation:** `daGraphViewer` checks `verifyChunkSequence` during paginated fetching and validates full reassembled payload integrity via `validatePayloadIntegrity` before rendering. Incomplete persistences cannot be rendered.

## Verification Evidence
- Offline test runner (`scratch/salesforce-poc/tests/run-poc-tests.cjs`) includes `Ingestion Bounded Batching & Idempotency Simulation Contract`, verifying multi-batch completion, duplicate batch idempotency, and oversized batch rejection.

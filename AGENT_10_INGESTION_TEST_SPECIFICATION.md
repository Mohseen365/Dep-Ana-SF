# Agent 10 Ingestion Test Specification

## Document Metadata
- **Agent**: Agent 10 (Test Engineering & Ingestion Verification)
- **Coordinator**: Integration Coordinator D1
- **Date**: 2026-11-10
- **Status**: SPECIFICATION COMPLETE (PREPARATION ONLY)

---

## 1. Scope & Objective
This specification establishes the exact test matrix required for validating the multi-batch AST ingestion pipeline once `PO-DEC-V2-01` (REST transport) and `PO-DEC-V2-03` (Lifecycle schema) are ratified by the Project Owner.

Zero code changes to `DAGraphIngestionService.cls` or REST endpoints are made during this preparation pass.

---

## 2. Ingestion Test Matrix Specifications

### 2.1 Lifecycle State Transition Tests (`test_lifecycle_transitions`)
1. **Initial Creation**:
   - Post to `/services/apexrest/dependency-analyzer/runs` with `{ projectId, commitHash }`.
   - Verify `Status__c == 'CREATED'`.
2. **Chunk Ingestion in Progress**:
   - Post batch 1 (chunks 0..9).
   - Verify `Status__c == 'UPLOADING'`.
3. **Payload Finalization**:
   - Post final batch and signal completion with `{ totalChunks: N }`.
   - Verify transition to `VALIDATING`.
4. **Validation Success & Availability**:
   - Ingestion service validates chunk sequence completeness.
   - Verify transition to `AVAILABLE`.
5. **Validation Failure Containment**:
   - If missing chunk index (e.g. chunks 0, 1, 3 received, chunk 2 missing):
   - Transition `Status__c` to `FAILED` with descriptive error reason.

### 2.2 Conflicting Retries & Duplicate Key Tests (`test_conflicting_retries`)
1. **Idempotent Retry**:
   - Re-posting identical batch (same Run ID and same Chunk Indexes with identical payload hashes).
   - Expected: HTTP 200 OK with deduplicated acknowledgment; zero duplicate SObject inserts.
2. **Conflicting Retry**:
   - Re-posting same Run ID and Chunk Index with different payload content.
   - Expected: HTTP 409 Conflict with error code `CHUNK_PAYLOAD_MISMATCH`.
3. **Unique Key Enforcement**:
   - Simulate concurrent threads attempting to insert `Chunk_Key__c = 'a01..._0000'`.
   - Verify database-level uniqueness constraint catches race condition fail-closed.

### 2.3 Multi-Tenant Isolation Tests (`test_ingestion_project_isolation`)
1. **Cross-Project Run Poisoning**:
   - User A authenticated under Project A attempts to upload chunks against a Run belonging to Project B.
   - Expected: HTTP 403 Forbidden / `INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY`.
2. **User Mode Enforcement**:
   - Ingestion service DML operations must execute `WITH USER_MODE`.
   - Verify non-analyst user cannot insert chunks or create runs.

### 2.4 Payload & Escaping Boundary Tests (`test_serialization_boundaries`)
1. **Surrogate Pair Preservation**:
   - Ingest chunk containing astral characters (`🚀`, `𠮷`).
   - Reassemble payload and verify exact binary string match.
2. **Excessive Escaping Wire Cap**:
   - Node.js client pre-flight check validates `Buffer.byteLength(jsonBody, 'utf8') <= 5,242,880`.
   - Client splits 10-chunk batch into 5-chunk batches if escaping inflates request body above 5 MB.
3. **Run Total Payload Cap**:
   - Ingestion service rejects runs whose cumulative payload exceeds 10,485,760 UTF-16 code units with HTTP 413 Payload Too Large.

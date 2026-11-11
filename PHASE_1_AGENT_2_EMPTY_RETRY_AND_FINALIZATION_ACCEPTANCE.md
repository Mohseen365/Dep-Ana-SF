# Phase 1 Agent 2 EMPTY Retry and Duplicate Finalization Acceptance Report

## Document Identification
- **Document Type**: Lifecycle State Machine, EMPTY Retry & Duplicate Finalization Specification (Final Acceptance)
- **Component**: `DAGraphIngestionService.cls`
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED

---

## 1. State Machine Clarifications

The ingestion lifecycle state machine is defined over terminal and active states:
- Active: `QUEUED`, `IN_PROGRESS`, `VALIDATING`
- Terminal: `AVAILABLE`, `EMPTY`, `FAILED`, `CANCELLED`, `EXPIRED`

### 1.1 Valid-Empty Initialization and Payload Conditions
Zero uploaded chunks alone do not establish that a run is a valid empty analysis.
A zero-chunk finalization (`persistedExpected == 0`) succeeds and transitions to `STATUS_EMPTY` only when:
1. The run was explicitly created with `expectedChunks = 0` (or `null` defaulting to 0).
2. The expected total payload size is explicitly 0 (`Total_Payload_Size_Chars__c == 0`).
If `persistedExpected == 0` but `Total_Payload_Size_Chars__c > 0`, finalization is rejected fail-closed with `STATUS_FAILED` (`'Finalization rejected: Run initialized with 0 chunks but nonzero expected payload size'`).
Furthermore, if a run was initialized with `expectedChunks > 0`, but 0 chunks were uploaded, finalization is rejected with `STATUS_FAILED` (`'Finalization failed: Expected N chunks, but found 0'`).

---

## 2. Duplicate Operations and State Transition Invariants

### 2.1 Repeated Finalization of an Already AVAILABLE Run
- When `finalizeAnalysisRunWithResult` is called on a run where `Status__c == STATUS_AVAILABLE`:
  - Returns `FinalizationResult(true, STATUS_AVAILABLE, 'Analysis run is already finalized in AVAILABLE state.')` idempotently without throwing.
  - `processedChunks` reports persisted chunk count.
  - No database mutations occur.

### 2.2 Repeated Finalization of an Already EMPTY Run
- When `finalizeAnalysisRunWithResult` is called on a run where `Status__c == STATUS_EMPTY`:
  - Returns `FinalizationResult(true, STATUS_EMPTY, 'Analysis run is already finalized in EMPTY state.')` idempotently without throwing.
  - No database mutations occur.

### 2.3 Repeated Finalization of a FAILED / Closed Run
- When `finalizeAnalysisRunWithResult` is called on a run where `Status__c` is `FAILED`, `CANCELLED`, or `EXPIRED`:
  - Returns `FinalizationResult(false, run.Status__c, 'Cannot finalize run in terminal closed status: ' + run.Status__c)`.
  - Terminal closed states are immutable; they cannot be revived or re-finalized.

### 2.4 Attempt to Upload Chunks After EMPTY Finalization
- In `saveGraphChunks`:
  - Explicit guard: `if (run.Status__c == STATUS_EMPTY) { throw new IngestionException('Cannot upload chunks to an EMPTY run: ' + runId); }`.
  - Rejection is fail-closed.

### 2.5 Attempt to Convert EMPTY into a Nonempty Run
- Once marked `EMPTY`, status cannot transition to `IN_PROGRESS`, `VALIDATING`, or `AVAILABLE`.
- Any attempt to upload chunks or re-finalize with non-zero chunks is rejected.

### 2.6 Retry After a Failed Finalization
- A `FAILED` run cannot be re-finalized.
- A new analysis run record must be created via `createAnalysisRun`.

### 2.7 Duplicate Requests During Finalization
- Concurrency race conditions in standard Apex are governed by record locking (`FOR UPDATE` in Apex services) and fail-closed state validation. In offline simulation, duplicate finalization calls follow the terminal idempotency rules described in 2.1 and 2.2.

### 2.8 Preservation of Last-Known-Good AVAILABLE Graph
- In `getLatestAvailableRun(projectId)`:
  - SOQL filter is strictly `Status__c = :STATUS_AVAILABLE`.
  - Runs in `EMPTY`, `FAILED`, `QUEUED`, `IN_PROGRESS`, or `VALIDATING` statuses are excluded.
  - If a valid `AVAILABLE` run exists and a subsequent run completes as `EMPTY` or `FAILED`, queries for the active graph return the existing `AVAILABLE` run untouched.

---

## 3. Test Coverage

Tested in `scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs`:
- Repeated finalization of `AVAILABLE` run (idempotent success).
- Repeated finalization of `EMPTY` run (idempotent success).
- Repeated finalization of `FAILED` run (fail-closed rejection).
- Prohibit chunk upload to `EMPTY` run.
- Zero chunk with nonzero expected payload rejection (`STATUS_FAILED`).
- Preservation of last-known-good graph on `EMPTY` and `FAILED` runs.

---

## 4. Environment Classification & Remaining Limitations

- **Source Code Verification**: `IMPLEMENTED_SOURCE_VERIFIED` in `DAGraphIngestionService.cls`.
- **Offline Mock Verification**: `OFFLINE_TEST_VERIFIED` via Node.js test runner `run-phase1-final-acceptance-tests.cjs`.
- **Live Multi-User HTTP Concurrency**: `NOT_VERIFIABLE` locally. Concurrent HTTP requests against Salesforce REST endpoints require an active scratch or sandbox org.

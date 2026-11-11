# Phase 1 Agent 2 Lifecycle Implementation Evidence

## Document Identification
- **Document Type**: Lifecycle Implementation & Evidence Report
- **Agent**: Agent 2 (Ingestion Lifecycle & Schema Implementation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTATION COMPLETE & VERIFIED

---

## 1. Summary of Changes

The graph ingestion service `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls` was hardened to version `v1.0.1` resolving all five lifecycle and persistence ambiguities identified in the Master Dispatch Directive:

1. **`EMPTY` Lifecycle State Resolution**: Formally integrated `EMPTY` into the lifecycle state machine as the legitimate terminal state for 0-chunk / 0-node projects. Prevents chunk upload to empty runs and prevents empty runs from corrupting `AVAILABLE` graph queries.
2. **Authoritative Persisted Expectations**: `finalizeAnalysisRun` enforces that stored `Total_Chunks__c` cannot be overridden. If a caller supplies a mismatched chunk count, finalization fails immediately with `IngestionException` and marks the run `FAILED`.
3. **Checksum Standards**: Specified standard lowercase hex SHA-256 over canonical UTF-8 serialized JSON payload bytes, with validation hooks during run creation and finalization.
4. **Payload Size Unit Reconciliation**: Reconciled UTF-16 code units (`Total_Payload_Size_Chars__c`, max 131,072 chars/chunk, max 10,485,760 chars total) with UTF-8 byte serialization and the 5 MiB application-level HTTP wire ceiling.
5. **Concurrent Chunk Retry Semantics**: Implemented deterministic idempotent acceptance for identical payload retries, and strict fail-closed rejection (`IngestionException`) for conflicting retries.

---

## 2. Exact Changed Files

| File Path | Status | Description |
|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls` | MODIFIED | Hardened lifecycle, authoritative expectations, retry semantics, and EMPTY handling |
| `PHASE_1_AGENT_2_LIFECYCLE_AND_PERSISTENCE_INTERFACE.md` | MODIFIED | Published v1.0.1 contract specification |

---

## 3. Verification & Test Evidence

The hardened implementation is tested offline by `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs`, `scratch/salesforce-poc/tests/run-p0-verification-tests.cjs`, and the new dedicated suite `scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs`.

### Capabilities Verified:
- Static class syntax and method signature compilation.
- Proper handling of 0-chunk runs transitioning to `EMPTY`.
- Caller-supplied count mismatch rejection fail-closed.
- Identical payload retry idempotency without duplicate records.
- Conflicting payload retry rejection fail-closed.
- Preservation of last-known-good graph on incomplete or failed runs.

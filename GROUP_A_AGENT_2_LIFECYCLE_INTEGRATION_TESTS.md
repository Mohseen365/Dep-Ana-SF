# Group A Agent 2 Lifecycle Integration Tests: Verification Specification & Evidence

## Document Identification
- **Workstream**: Group A (Core Backend Architecture & Ingestion)
- **Document Type**: Lifecycle Integration Test Plan, Specification, and Offline Execution Evidence
- **Author**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Target Interface**: `v1.0.2` Hardened (`DAGraphIngestionService.cls`)

---

## 1. Executive Summary

This document specifies the comprehensive test matrix and execution evidence for Agent 2 Scope B Ingestion Lifecycle & Persistence.
The test harness validates all 10 core lifecycle categories mandated under Phase 1 governance:
1. Lifecycle transitions (`QUEUED → IN_PROGRESS → VALIDATING → AVAILABLE`).
2. EMPTY initialization and retrieval.
3. FAILED persistence across failure modes.
4. Finalization retries and idempotency.
5. Conflicting parameter rejection.
6. Duplicate chunk handling (idempotent no-op).
7. Conflicting chunk rejection (fail-closed).
8. Checksum validation and mismatch detection.
9. Last-known-good graph preservation.
10. Concurrency semantics and external race boundaries.

---

## 2. Test Matrix and Scenario Inventory

| Test ID | Category | Description | Expected Outcome | Execution Status |
|---|---|---|---|---|
| **LTC-01** | Lifecycle Transitions | Progress standard run: `QUEUED` -> first chunk (`IN_PROGRESS`) -> finalization (`VALIDATING`) -> `AVAILABLE`. | Run status matches expected stage; chunks persisted. | **PASS (Offline Mock & Source Verified)** |
| **LTC-02** | EMPTY Initialization | Run created with `expectedChunks = 0` and `expectedTotalBytes = 0`. | Run initializes directly to `Status__c = 'EMPTY'`. | **PASS (Offline Mock & Source Verified)** |
| **LTC-03** | Invalid EMPTY Attempt | Run created with `expectedChunks = 0` but `expectedTotalBytes = null` or `> 0`. | Finalization transitions status to `FAILED` with explicit error. | **PASS (Offline Mock & Source Verified)** |
| **LTC-04** | Upload to EMPTY Run | Attempting to invoke `saveGraphChunks` on an `EMPTY` run. | Throws `IngestionException` fail-closed. | **PASS (Offline Mock & Source Verified)** |
| **LTC-05** | FAILED Persistence | Finalization with missing chunks or continuity gap. | Status updated to `FAILED` atomically; returns `FinalizationResult(false, 'FAILED')`. | **PASS (Offline Mock & Source Verified)** |
| **LTC-06** | Finalization Retry (Success) | Calling `finalizeAnalysisRunWithResult` multiple times on an `AVAILABLE` run. | Succeeds idempotently with `isSuccess = true, status = 'AVAILABLE'`. | **PASS (Offline Mock & Source Verified)** |
| **LTC-07** | Conflicting Finalization | Calling finalization on `AVAILABLE` run with different `expectedChunks`. | Fails with conflict error; run remains `AVAILABLE`. | **PASS (Offline Mock & Source Verified)** |
| **LTC-08** | Duplicate Chunk Retry | Re-saving chunk index with identical payload content. | Idempotent no-op; returns processed count; 0 duplicate DB records. | **PASS (Offline Mock & Source Verified)** |
| **LTC-09** | Conflicting Chunk Retry | Re-saving chunk index with different payload content. | Throws `IngestionException` fail-closed. | **PASS (Offline Mock & Source Verified)** |
| **LTC-10** | Checksum Verification | Finalizing run where SHA-256 matches vs where SHA-256 mismatches. | Matching transitions to `AVAILABLE`; mismatch transitions to `FAILED`. | **PASS (Offline Mock & Source Verified)** |
| **LTC-11** | Last-Known-Good Graph | Querying `getLatestAvailableRun` after an `AVAILABLE` run is followed by `FAILED` or `EMPTY` runs. | Returns prior `AVAILABLE` run; ignores `FAILED`/`EMPTY` runs. | **PASS (Offline Mock & Source Verified)** |
| **LTC-12** | Concurrency Boundaries | External concurrent multi-threaded uploads and finalization races. | Bounded by `Chunk_Key__c` uniqueness. Live multi-threaded race requires Salesforce org. | **NOT VERIFIABLE — SALESFORCE ORG REQUIRED** |

---

## 3. Dedicated Offline Runner Execution Evidence

The verification test suites were executed in the repository environment:

### Command 1: Hardened Contracts Runner
```bash
node scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs
```
**Execution Output:**
```text
===================================================================
Running Agent 10 Phase 1 Hardened Security & Lifecycle Test Suite (v1.0.2)...
===================================================================

[Suite 1: Agent 1 Security Interface v1.0.2 Hardening]
  ✓ 1.1 Authenticated principal protection method exists
  ✓ 1.2 Arbitrary user impersonation is blocked fail-closed
  ✓ 1.3 Trusted internal caller boundary enforced
  ✓ 1.4 Canonical scope vocabulary and exact scope matching enforced
  ✓ 1.5 Direct sharing distinguished from emergency sharing provenance
  ✓ 1.6 Separation of duties in emergency grant creation enforced
  ✓ 1.7 Grant-creation approval bypass strictly eliminated
  ✓ 1.8 Emergency lease clamped to 4-hour maximum (14400s)
  ✓ 1.9 Revocation transaction resilience and append-only audit evidence
  ✓ 1.10 Direct share preservation during emergency share cleanup

[Suite 2: Agent 2 Lifecycle & Persistence Interface v1.0.2 Hardening]
  ✓ 2.1 EMPTY status present in metadata and service state machine
  ✓ 2.2 Zero-chunk/empty runs transition directly to EMPTY
  ✓ 2.3 Authoritative persisted Total_Chunks__c enforced during finalization
  ✓ 2.4 Deterministic identical retry idempotency enforced
  ✓ 2.5 Conflicting retry rejected fail-closed with IngestionException
  ✓ 2.6 Checksum parameters and dedicated Payload_Checksum__c separated from Commit_Hash__c
  ✓ 2.7 FAILED-state persistence with transaction safety
  ✓ 2.8 Payload size units and wire ceilings reconciled
  ✓ 2.9 Last-known-good graph preserved on incomplete or failed runs
  ✓ 2.10 Prohibit chunk uploads to terminal EMPTY run

[Suite 3: In-Memory Algorithmic Invariants Verification]
  ✓ 3.1 Scope matching logic: exact match and hierarchy
  ✓ 3.2 Chunk key deterministic generation
  ✓ 3.3 4-Hour maximum lease boundary calculation
  ✓ 3.4 SHA-256 payload canonical checksum interoperability (Node.js & Apex test vector)
===================================================================
Agent 10 Hardened Contracts Suite: 24 PASSED, 0 FAILED
===================================================================
```

### Command 2: Final Acceptance Runner
```bash
node scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs
```
**Execution Output:**
```text
===================================================================
Running Phase 1 Final Acceptance Focused Test Suite...
===================================================================

[Suite 1: Direct-Share Provenance & Coexistence]
  ✓ 1.1 Direct-share provenance evaluation method and mock bindings exist
  ✓ 1.2 Stale emergency share is not misclassified as direct share
  ✓ 1.3 Emergency share cleanup preserves independent direct shares
  ✓ 1.4 In-memory provenance resolution simulation (coexistence & revocation)
  ✓ 1.5 Exhaustive 12-case Manual-share provenance evaluation matrix

[Suite 2: Approver Authority & Separation of Duties]
  ✓ 2.1 Mandatory approval and direct grant creation bypass eliminated
  ✓ 2.2 Anti-impersonation and issuer verification enforced
  ✓ 2.3 Separation of duties enforced (recipient != approver, issuer != approver)
  ✓ 2.4 Dedicated approver permission set enforced and test mocks guarded
  ✓ 2.5 In-memory approver authority matrix simulation

[Suite 3: Legacy Finalization Wrapper & Transaction Behavior]
  ✓ 3.1 Structured finalization method commits FAILED state without unhandled exception
  ✓ 3.2 Legacy wrapper propagates IngestionException on failure
  ✓ 3.3 In-memory wrapper vs structured transaction simulation

[Suite 4: EMPTY Retry, Duplicate Finalization & Last-Known-Good Invariants]
  ✓ 4.1 Zero-chunk runs initialize as EMPTY only when expectedChunks == 0 and expectedBytes == 0
  ✓ 4.2 Chunk upload to EMPTY runs prohibited fail-closed
  ✓ 4.3 Last-known-good graph preserved on EMPTY and FAILED runs
  ✓ 4.4 In-memory finalization duplicate, conflicting parameters and retry simulation
===================================================================
Phase 1 Final Acceptance Suite: 17 PASSED, 0 FAILED
===================================================================
```

---

## 4. Environment & Platform Boundaries

- **Node.js Environment**: Tests run under Node.js v22.22.1 on Linux sandbox.
- **Apex Governor Limits**:
  - Offline test runners verify algorithmic logic, string lengths, SHA-256 hashing, and state machines.
  - Live Apex CPU time, heap allocations, and SOQL/DML governor consumption require an active scratch org.
  - Claiming live Apex or live-org verification from Node.js mocks is strictly forbidden under Phase 1 governance.

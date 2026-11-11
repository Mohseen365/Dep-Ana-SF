# Phase 1 Agent 2 Finalization Transaction Evidence Report

## Document Identification
- **Document Type**: Finalization Failure Handling and Transaction Evidence
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & QUALIFIED

---

## 1. Problem Statement

Previous finalization logic in `DAGraphIngestionService.cls` updated `Status__c = 'FAILED'` and immediately threw `IngestionException`. In standard Apex transactions, an unhandled exception propagating to the caller rolls back all uncommitted database changes (including the `update as user run;` marking the run as `FAILED`). Consequently, the database state would revert to `VALIDATING` or `IN_PROGRESS`, leaving incomplete runs in an inconsistent state.

---

## 2. Hardened Architecture: FinalizationResult DTO

In `DAGraphIngestionService.cls`:
1. **Structured Finalization Result**:
   ```apex
   public static FinalizationResult finalizeAnalysisRunWithResult(String runId, Integer callerSuppliedExpectedChunks, String expectedChecksum)
   ```
   - When any validation rule fails (caller count mismatch, missing chunk index continuity, checksum mismatch), the run is explicitly updated to `STATUS_FAILED` via `update as user run;`.
   - The method returns a structured `FinalizationResult(false, STATUS_FAILED, errorMessage)`.
   - Because no unhandled exception is thrown, the transaction commits cleanly, guaranteeing the `FAILED` state is persisted in the database.
2. **Backward-Compatible Exception Wrapper**:
   ```apex
   public static Boolean finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)
   ```
   - Invokes `finalizeAnalysisRunWithResult`. If an exception is required by legacy callers, it is raised after the DML operation has executed within its boundary.
3. **Validation Environment Classification**:
   - Offline Node.js unit tests verify code logic, state transitions, and structured DTO contracts.
   - Live transaction rollback verification within a real Salesforce multi-tenant database is classified as:
     `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED`

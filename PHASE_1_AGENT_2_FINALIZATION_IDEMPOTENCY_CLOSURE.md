# Phase 1 Agent 2 Finalization Wrapper Acceptance Report

## Document Identification
- **Document Type**: Finalization Failure Handling and Transaction Behavior Acceptance Report (Final Acceptance)
- **Component**: `DAGraphIngestionService.cls`
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & QUALIFIED

---

## 1. Problem Statement

In Salesforce Apex runtime, a transaction executes atomically. If an unhandled exception propagates out of the execution context, the platform rolls back all pending uncommitted DML operations executed during that transaction.
The legacy wrapper method:
```apex
public static Boolean finalizeAnalysisRun(String runId, Integer callerSuppliedExpectedChunks)
```
calls:
```apex
public static FinalizationResult finalizeAnalysisRunWithResult(String runId, Integer callerSuppliedExpectedChunks, String expectedChecksum)
```
and if `!res.isSuccess`, previously threw `IngestionException(res.errorMessage)`. If callers rely on `finalizeAnalysisRun` without catching the exception inside the same transaction boundary, the `update as user run;` marking `Status__c = 'FAILED'` would be rolled back by Salesforce runtime, leaving the run in `VALIDATING` or `IN_PROGRESS` rather than persisting `FAILED`.

---

## 2. Caller Chain and Transaction Analysis

### 2.1 Implementation Comparison

1. **`finalizeAnalysisRunWithResult(...)`**:
   - Performs validation (caller expected chunks count, chunk index continuity, SHA-256 payload checksum).
   - On validation failure, updates `run.Status__c = STATUS_FAILED; update as user run;`.
   - Returns a structured `FinalizationResult(false, STATUS_FAILED, errorMessage)` without throwing an unhandled exception.
   - Because no unhandled exception escapes, the DML updating the status to `FAILED` is successfully committed at transaction completion.

2. **`finalizeAnalysisRun(...)`**:
   - Acts as a backward-compatible wrapper returning `Boolean`.
   - Calls `finalizeAnalysisRunWithResult`.
   - If `!res.isSuccess`, it throws `new IngestionException(res.errorMessage)`.
   - **Transaction Consequence**: If the caller does not catch this exception or if the method constitutes the top-level entry point of an Apex transaction (e.g. an unhandled AuraHandledException in a controller), the transaction rolls back, undoing the prior DML.

### 2.2 Five Key Inquiries Addressed
1. **Whether the structured-result method persists `FAILED`**:
   Yes. `finalizeAnalysisRunWithResult` executes DML `update as user run;` with `Status__c = STATUS_FAILED` and returns normally without throwing, ensuring the transaction can commit.
2. **Whether the legacy wrapper propagates an exception**:
   Yes. When `!res.isSuccess`, `finalizeAnalysisRun` throws `new IngestionException(res.errorMessage)`.
3. **Whether the transaction rolls back when that exception propagates**:
   Yes. In standard Apex execution, an uncaught exception propagating out of the execution context causes the entire transaction (including prior DML statements) to roll back.
4. **Whether legacy callers depend on the wrapper's existing behavior**:
   Yes. Legacy Apex unit tests and synchronous controller wrappers depend on `Boolean` return semantics and exception propagation on failure. Silently suppressing exceptions in `finalizeAnalysisRun` would break legacy caller contracts that catch `IngestionException`.
5. **Whether a failure response can be returned without losing the persisted failure state**:
   Yes. New and refactored callers (such as Agent 3's REST endpoint and modernized controllers) must call `finalizeAnalysisRunWithResult` directly. This returns a failure payload (`isSuccess: false, status: 'FAILED', errorMessage: '...'`) while allowing the transaction to commit the `FAILED` state cleanly.

---

## 3. Test Coverage & Offline Limitations

- **Structured Result Tests**: Tested in `run-phase1-final-acceptance-tests.cjs` verifying `finalizeAnalysisRunWithResult` transitions to `FAILED` and returns structured error without throwing.
- **Legacy Wrapper Tests**: Tested in `run-phase1-final-acceptance-tests.cjs` verifying `finalizeAnalysisRun` throws `IngestionException` on failure.
- **Apex Transaction Rollback Environment Limitation**:
  In an offline Node.js simulation environment, the native Salesforce transaction engine, savepoints, and multi-tenant database rollback triggers are absent.
  Therefore, transaction persistence across unhandled Apex exceptions is classified as:
  `NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED`

### Exact Missing Org-Test Requirement
- Execution of an Apex test class (e.g. `DAGraphIngestionServiceTest.cls`) in an active Salesforce scratch or sandbox org testing:
  ```apex
  Test.startTest();
  try {
      DAGraphIngestionService.finalizeAnalysisRun(runId, 999);
  } catch (DAGraphIngestionService.IngestionException ex) {
      // Catch in caller boundary
  }
  Test.stopTest();
  DA_Analysis_Run__c run = [SELECT Status__c FROM DA_Analysis_Run__c WHERE Id = :runId];
  System.assertEquals('FAILED', run.Status__c);
  ```

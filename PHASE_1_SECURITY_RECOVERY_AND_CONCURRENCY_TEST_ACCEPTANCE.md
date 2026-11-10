# Phase 1 Security Recovery and Concurrency Test Acceptance

## Document Identification
- **Document Type**: Security Governance & Test Architecture Acceptance Specification
- **Classification**: Implementation Constraints for Agent 1, Agent 2, Agent 3, Agent 10
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Agent 1, Agent 10
- **Status**: AUTHORITATIVE RECOVERY & CONCURRENCY ACCEPTANCE SPECIFICATION

---

## 1. Executive Summary

This specification enforces two critical technical corrections mandated by the Project Owner:
1. **Correction B (Emergency Security Recovery)**: Explicitly removes and bars any proposal to use broad object-level `View All` permissions or reverting Organization-Wide Defaults (OWD) to `ReadWrite` as an emergency recovery mechanism. Establishes a strictly project-scoped, auditable recovery mechanism.
2. **Correction C (Concurrency Testing Architecture)**: Mandates the rigorous separation of sequential Apex unit tests from external multi-threaded concurrency tests. Strictly bars claiming concurrency safety based solely on sequential Apex unit tests.

---

## 2. Correction B: Project-Scoped Emergency Security Recovery

### 2.1 Prohibition of Broad Emergency Escalation
- **Strict Ban on Global View All**: Under no circumstances shall emergency access be granted by applying `<viewAllRecords>true</viewAllRecords>` to permission sets, profiles, or objects.
- **Strict Ban on Reverting OWD**: Reverting `DA_Project__c` OWD from `Private` to `ReadWrite` destroys multi-tenant isolation and re-exposes all proprietary architectural graphs across organizational boundaries. This is prohibited.

### 2.2 Authorized Emergency Actors & Scope
- **Authorized Actors**: Only designated System Administrators with the permission set `DA_Security_Auditor` or designated Integration Coordinator credentials.
- **Project Scope**: Access must be granted exclusively at the **individual record level** using Salesforce explicit programmatic sharing (`DA_Project__Share` with `RowCause = 'Manual'`) for specific `DA_Project__c` records.
- **Child Record Inheritance**: Because `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, and `DA_Annotation__c` are in Master-Detail relationships with `ControlledByParent`, granting project-level access automatically and safely grants necessary access to child records without creating orphaned or broad permissions.

### 2.3 Approval, Auditing, and Expiry Framework
1. **Approval Requirements**:
   - Emergency access requests require formal dual-authorization from the Security Lead (Agent 1) and Integration Coordinator (D1), or explicit Project Owner instruction under DEC-04 Alt 4.
2. **Audit Logging**:
   - Every emergency grant must create an immutable audit record in `DA_Security_Audit_Log__c` capturing:
     - `Timestamp__c` (UTC ISO-8601)
     - `Actor_User_Id__c` (User requesting access)
     - `Target_Project_Id__c` (Specific project granted)
     - `Justification__c` (Ticket / incident reference)
     - `Granted_By__c` (Approver user ID)
     - `Expires_At__c` (Strict maximum 4-hour lease)
3. **Automated Expiry & Revocation**:
   - A scheduled batch Apex job (`DASecurityAccessReaper.cls`) executes hourly to delete `DA_Project__Share` rows where `RowCause = 'Manual'` and the linked audit log expiration has passed.
   - Immediate manual revocation can be triggered via `DAProjectSecurityService.revokeEmergencyAccess(projectId, userId)`.
4. **Legitimate User Access Restoration**:
   - When legitimate project members lose access due to sharing recalculation or OWD transitions, access must be restored via standard `DA_Project_Member__c` membership insertion rather than emergency privilege escalation.

---

## 3. Correction C: Concurrency Testing Architecture

Sequential Apex test runs inside the Salesforce test engine do not simulate real database concurrency because each test method runs in an isolated single-threaded transaction. Concurrency safety must be partitioned into two distinct disciplines:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CONCURRENCY TEST ARCHITECTURE                     │
├───────────────────────────────────┬────────────────────────────────────┤
│         APEX UNIT TESTS           │    EXTERNAL CONCURRENCY TESTS      │
│     (Single-Threaded / Apex)      │     (Multi-Threaded / Node.js)     │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Unique-key database constraint  │ • Parallel HTTP upload workers     │
│ • Duplicate retry detection       │ • Simultaneous duplicate chunks    │
│ • State machine transition checks │ • Competing conflicting AST retries│
│ • Missing chunk gap detection     │ • Concurrent finalize vs upload    │
│ • Validation & error handling     │ • Read request during active upload│
│ • Single-transaction DML limits   │ • Database row-locking contention  │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 3.1 Apex Unit Tests (Single-Threaded Invariants)
Executed in Apex test framework (Agent 2 & Agent 3):
- **Constraint Enforcement**: Direct insert of duplicate `Chunk_Key__c` (`<runId>_<chunkIndex>`) triggers database-level `DUPLICATE_VALUE` exception.
- **Idempotency Service**: Verify `DAGraphIngestionService.ingestBatch()` detects existing chunk keys and returns success without inserting duplicate rows.
- **Conflicting Retry Rejection**: Resubmitting chunk with identical key but different hash/size triggers `CONF_RETRY_PAYLOAD_MISMATCH`.
- **Run Lifecycle Gates**: Ingesting chunks when Run status is not `UPLOADING` throws `ILLEGAL_STATE_TRANSITION`.
- **Contiguous Assembly**: Finalizing a run missing chunk 2 of 5 triggers `MISSING_CHUNKS_DETECTED`.

### 3.2 External Concurrency Tests (Real Transaction Racing)
Executed via multi-threaded Node.js test harness against a live or simulated Salesforce endpoint (Agent 10):
- **Parallel Upload Race**: Spawn 5 concurrent HTTP POST requests uploading distinct chunk batches for the same Run ID; verify all 5 batches commit without deadlock.
- **Simultaneous Duplicate Upload**: Dispatch 2 identical chunk batches simultaneously across 2 HTTP connections; verify exactly one batch succeeds and the other either succeeds idempotently or fails with unique key conflict, leaving 0 duplicate database rows.
- **Concurrent Finalization Race**: Dispatch `/finalize` request concurrently with an active chunk upload; verify the finalization either waits or fails closed until all chunks are committed.
- **Read-While-Uploading Isolation**: Query `/runs/{id}` while chunks are actively uploading; verify Run status remains `UPLOADING` and unfinalized chunks are excluded from consumption by viewer components.

### 3.3 Strict Governance Rule
**No claim of concurrency safety or race resilience may be made based solely on sequential Apex unit tests.** External concurrency testing against a live or fully mocked HTTP multi-threaded harness is mandatory for final acceptance.

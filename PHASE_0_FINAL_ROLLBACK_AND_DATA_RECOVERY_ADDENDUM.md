# Phase 0 Final Rollback and Data Recovery Addendum

## Document Metadata
- **Classification**: Phase 0 Data Recovery & Incident Rollback Specifications
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Agent 1, Agent 2
- **Status**: AUTHORITATIVE DATA RECOVERY SPECIFICATIONS (PREPARATION ONLY)

---

## 1. Executive Summary & Core Principles

A code rollback alone does **not** restore data integrity. Deploying previous Apex or metadata versions without data reconciliation risks leaving orphaned chunks, corrupted analysis runs, or broken permissions.

Furthermore, **restoring broad access (reverting OWD to Public Read/Write or setting `viewAllRecords=true`) must NEVER be treated as an automatic rollback**, as it immediately re-exposes multi-tenant cross-project data. Any security rollback that could re-expose cross-project data requires explicit Project Owner authorization.

**Zero rollback or remediation actions may be executed during this assignment.** This document defines the exact recovery procedures to be followed during Phase 1 if operational incidents occur.

---

## 2. Ingestion Rollback & Data Recovery Procedures

### 2.1 Failure Scenarios Covered
1. **Existing Duplicate Chunks**: Pre-existing data contains identical `(Run_Id, Chunk_Index)` pairs before constraint activation.
2. **Unique-Key Constraint Creation Failure**: Deployment of unique constraint on `Chunk_Key__c` fails due to existing collisions.
3. **Duplicate-Key Runtime Conflicts**: Concurrency races or duplicate retry uploads trigger `DUPLICATE_VALUE` exceptions.
4. **Incomplete Runs**: Network drop, worker crash, or payload failure leaves an analysis run stuck in `UPLOADING` or `VALIDATING`.
5. **Failed Finalization**: Assembly validation fails (e.g. chunk count mismatch or checksum mismatch) during status transition to `AVAILABLE`.
6. **Corrupt or Conflicting Retries**: Client resends an altered AST payload under an existing Run ID.
7. **Previously Valid Graph Preservation**: Recovery operations must never overwrite or delete previously completed, valid `AVAILABLE` runs.
8. **New Lifecycle-Field Incompatibility**: Adding new picklist values (`CREATED`, `UPLOADING`, `VALIDATING`) breaks client consumers expecting binary `AVAILABLE`/`FAILED`.
9. **Partial Batch Persistence**: Transaction failure midway through multi-batch upload leaves dangling child chunks.
10. **Recovery After Interrupted Upload**: Client reconnects after timeout; system must either resume or discard orphaned state cleanly.
11. **Rollback of REST Transport**: Apex REST endpoint failure requires falling back to standard composite or bulk APIs.
12. **Post-Recovery Data-Integrity Validation**: Automated verification verifying zero orphaned chunks, exact chunk counts, and correct run statuses.

### 2.2 Ingestion Constraint Removal & Data Reconciliation Runbook
Before any uniqueness constraint or lifecycle rule is altered or rolled back:
1. **Duplicate Detection**:
   Execute diagnostic SOQL to detect all duplicate keys:
   ```soql
   SELECT Chunk_Key__c, COUNT(Id)
   FROM DA_Graph_Chunk__c
   GROUP BY Chunk_Key__c
   HAVING COUNT(Id) > 1
   ```
2. **Data Preservation**:
   Extract and backup colliding chunk records to CSV/JSON before any DML deletion or update.
3. **Explicit Recovery Approval**:
   Integration Coordinator D1 and Workstream Lead WS-A must formally sign off on the reconciliation strategy.
4. **Reconciliation of Affected Records**:
   - For runs stuck in `UPLOADING` or `VALIDATING` older than 1 hour: Mark `Status__c = 'FAILED'` and populate `Failure_Reason__c = 'UPLOAD_TIMEOUT'`.
   - For duplicate chunks in `FAILED` runs: Purge duplicate chunks via hard delete.
   - For `AVAILABLE` runs: Preserve existing valid records without mutation.
5. **Post-Recovery Integrity Check**:
   Execute integrity query verifying:
   - Zero chunks exist without a valid parent `DA_Analysis_Run__c`.
   - Every `AVAILABLE` run has `COUNT(DA_Graph_Chunk__c) == Total_Chunks__c`.
   - Every chunk key matches format `<RunId>_<Index>`.

---

## 3. Multi-Tenant Security Rollback & Containment Procedures

### 3.1 Failure Scenarios Covered
1. **OWD Transition Incidents**: Moving `DA_Project__c` to `Private` causes legitimate users to receive `INSUFFICIENT_ACCESS_OR_READONLY`.
2. **Permission-Set Inconsistencies**: FLS omission prevents analysis viewer from loading graph fields.
3. **Existing-Record Access Migration**: Unowned or legacy project records become invisible to project teams.
4. **Membership & Sharing Assignments**: Failure in Apex sharing rules or `DA_Project__Share` insertions causes partial visibility.
5. **Sharing Recalculation Timeouts**: Large volume recalculation exceeds asynchronous queue limits.
6. **Integration-User Access Failure**: REST upload client receives HTTP 403 Forbidden.
7. **Emergency Administrative Access**: System administrators locked out from managing project configurations.
8. **Legitimate-User Lockout**: Active analysts unable to perform daily architecture reviews.

### 3.2 Security Containment & Safe Rollback Runbook
1. **Strict Prohibition on Automatic OWD Broadening**:
   - Rolling back `DA_Project__c` OWD from `Private` to `ReadWrite` is strictly prohibited as an automated or uncoordinated action.
   - Doing so instantly destroys multi-tenant isolation across all organizational boundaries.
2. **Emergency Access Containment (Non-Exposing)**:
   - Assign the affected users to an emergency permission set (`DA_Emergency_Project_Access`) granting temporary `View All` on `DA_Project__c` and child objects **only for audited, verified user IDs**, rather than opening OWD globally.
3. **Project Owner Authorization Requirement**:
   - Any proposed rollback of OWD to Public or bulk assignment of `viewAllRecords` requires explicit, documented Project Owner authorization under DEC-04 Alternative 4.
4. **Post-Rollback Security Audit**:
   - Execute `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs` to confirm multi-tenant isolation, user-mode FLS, and BroadcastChannel integrity before returning to production operations.

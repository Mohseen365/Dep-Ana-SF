# Phase 1 Agent 1 Share Provenance Correction Report

## Document Identification
- **Document Type**: Security Architecture & Share Provenance Model (v1.0.2 Acceptance Correction)
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED

---

## 1. Problem Statement & Background

Under standard Salesforce sharing, both emergency-generated shares and ordinary user collaboration shares utilize `RowCause = 'Manual'`. Previously, the authorization context assigned labels (`DIRECT_SHARE`, `EMERGENCY_GRANT`), but without an authoritative provenance model, stale emergency shares could be misclassified as direct shares if an emergency grant expired while physical share rows lingered. Furthermore, asynchronous cleanup of emergency shares risked deleting independent collaboration shares for the same user and project.

---

## 2. Authoritative Provenance Model & Precedence

`DAProjectSecurityService.cls` establishes strict authorization precedence:
1. **Authenticated Principal Resolution**: Bound strictly to `UserInfo.getUserId()` unless invoked from within an explicit internal system trust boundary (`AUTHORIZED_INTERNAL_CLASSES`).
2. **Project Identity Validation**: Requires non-blank `projectId`.
3. **Emergency Grant Resolution (`EMERGENCY_GRANT`)**:
   - Queries `DA_Emergency_Access_Grant__c` where `Project__c = :projectId AND User__c = :userId AND Is_Active__c = TRUE AND Revoked__c = FALSE AND Expires_At__c > :Datetime.now()`.
   - If an active unexpired grant exists and scope matches, returns `EMERGENCY_GRANT`.
4. **Independent Direct Share Resolution (`DIRECT_SHARE`)**:
   - Evaluates standard Salesforce Private OWD, role hierarchy, or direct sharing via `[SELECT Id FROM DA_Project__c WHERE Id = :projectId WITH USER_MODE]`.
   - Only evaluated if direct project access exists independently of emergency access.
5. **Stale Emergency Share Rejection**:
   - If an emergency grant is expired (`Expires_At__c <= Datetime.now()`) or revoked, dynamic evaluation immediately fails closed. A lingering physical share row does not confer authorization.
6. **Share Coexistence & Cleanup Safety**:
   - `cleanupShareRow(projectId, userId)` inspects remaining active emergency grants before deleting physical share rows. Independent direct shares survive emergency grant revocation.

---

## 3. Metadata and Call Sites

- **Target Object**: `DA_Emergency_Access_Grant__c`
- **Sharing Target**: `DA_Project__Share` (`RowCause = 'Manual'`)
- **Service Class**: `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls`
- **Test Coverage**: Tested in `run-phase1-hardened-contracts-tests.cjs` (Suites 1.5, 1.9, 1.10).

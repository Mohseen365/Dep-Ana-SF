# Phase 1 Agent 1 Final Manual-Share Provenance Resolution

## Document Identification
- **Document Type**: Security Architecture & Authoritative Share Provenance Resolution
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: CLOSED & TEST-VERIFIED (Offline Test Suite)

---

## 1. Executive Directive & Resolution Summary

The previous draft report noted three potential direct-access sources:
1. Record ownership (`proj.OwnerId == userId`).
2. Non-Manual sharing causes (`DA_Project__Share.RowCause != 'Manual'`).
3. Manual shares with zero associated emergency grant records.

### The Contradiction & Security Invariant
As identified in Section 2.1 of the Executive Directive:
> **A Manual share with no currently associated emergency grant record is not automatically an independently authorized direct share.** An emergency grant may have existed previously, its association may have been deleted, or its provenance may have been lost. The system must not convert missing provenance into authorization.
>
> **Core Invariant**: Absence of an emergency grant record must NEVER be treated as proof of independent direct authorization. If provenance cannot be established, the access decision must fail closed.

### Authoritative Resolution Decision
Under `DAProjectSecurityService.cls`, authoritative direct access is established **exclusively** by:
1. **Record Ownership**: Evaluated directly via `DA_Project__c.OwnerId == userId`.
2. **Authoritative Non-Manual Sharing**: Evaluated via `hasAuthoritativeDirectShare(projectId, userId)`, which queries strictly:
   ```sql
   SELECT Id FROM DA_Project__Share
   WHERE ParentId = :projectId
     AND UserOrGroupId = :userId
     AND RowCause != 'Manual'
   ```
3. **Explicit Direct Mock Authorization**: `mockDirectAuthorizedUserIds` guarded by `Test.isRunningTest()` for unit testing.

**Treatment of Manual Shares (`RowCause == 'Manual'`)**:
- Because Salesforce standard sharing uses `RowCause = 'Manual'` for both user-initiated collaboration and temporary emergency access, a raw `RowCause = 'Manual'` share row possesses ambiguous provenance.
- In `DAProjectSecurityService.cls`, any Manual share row lacking an active, valid `DA_Emergency_Access_Grant__c` record or independent non-Manual share cause is **REJECTED FAIL-CLOSED** (`UNAUTHORIZED`).
- The system **never** infers direct authorization from the mere absence of an emergency grant.
- Historical Manual shares with unknown provenance are strictly quarantined / denied direct access until an authorized reconciliation or non-Manual sharing rule establishes explicit provenance.

---

## 2. Source Symbols, Paths & Data Model

### 2.1 Implementation Source Symbols
- **Service Class**: `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls`
- **Method `validateProjectAccessInternal`**:
  - Dynamically queries valid `DA_Emergency_Access_Grant__c` records (`Is_Active__c = true AND Revoked__c = false AND Expires_At__c > :currentDatetime`).
  - Dynamically queries stale `DA_Emergency_Access_Grant__c` records (`Expires_At__c <= :currentDatetime OR Revoked__c = true OR Is_Active__c = false`). If stale grants exist, lingering manual shares are immediately rejected with `PROJECT_ACCESS_DENIED`.
  - Queries `DA_Project__c` with `WITH USER_MODE`. If `proj.OwnerId == userId`, grants `DIRECT_SHARE`.
  - For non-owners, calls `hasAuthoritativeDirectShare(projectId, userId)`.
- **Method `hasAuthoritativeDirectShare`**:
  - Strictly requires `RowCause != 'Manual'`.
  - Rejects any share where `RowCause == 'Manual'`, returning `false` fail-closed.
- **Method `cleanupShareRow`**:
  - Inspects `remainingActiveGrants` before attempting physical deletion of `DA_Project__Share` rows.
  - Ensures cleanup failures log `CLEANUP_FAILURE` in `DA_Security_Audit_Log__c` without compromising subsequent authorization checks.

### 2.2 Exact Salesforce Metadata Entities
- **Custom Object**: `DA_Project__c` (Private OWD).
- **Share Table**: `DA_Project__Share` (ParentId, UserOrGroupId, AccessLevel, RowCause).
- **Emergency Grant Object**: `DA_Emergency_Access_Grant__c`:
  - `Project__c`: Master-Detail / Lookup to `DA_Project__c`.
  - `User__c`: Lookup to `User`.
  - `Expires_At__c`: Datetime.
  - `Is_Active__c`: Checkbox.
  - `Revoked__c`: Checkbox.
  - `Revoked_At__c`: Datetime.
  - `Scope__c`: Text.
  - `Reason__c`: Text.
- **Audit Log Object**: `DA_Security_Audit_Log__c` (Append-only immutable audit trail).

---

## 3. Historical Data Treatment & Negative Authorization Behavior

1. **Historical Manual Shares**:
   - Any historical `DA_Project__Share` row where `RowCause = 'Manual'` with zero emergency grant records is treated as **unknown provenance**.
   - The security service returns `hasAccess = false` and `accessProvenance = 'UNAUTHORIZED'`.
   - No silent reclassification occurs.
   - No custom `RowCause` is invented (Salesforce does not permit custom `RowCause` on standard sharing tables without Apex sharing reasons, and custom RowCauses cannot be backfilled onto existing standard Manual shares).
2. **Revocation & Cleanup Safety**:
   - Revoking emergency access for a user who is also a project owner or holds a non-Manual share (`RowCause != 'Manual'`) updates the grant to `Revoked__c = true`.
   - When the user subsequently accesses the project, the dynamic ownership check (`proj.OwnerId == userId`) or `hasAuthoritativeDirectShare` confirms direct entitlement, preserving independent direct access.
3. **Negative Authorization Guarantee**:
   - Missing project ID or user ID: Throws `IllegalArgumentException`.
   - Caller identity mismatch: Throws `SecurityException('Principal mismatch...')`.
   - Fabricated issuer/approver: Throws `SecurityException`.
   - Recipient self-approval: Throws `SecurityException`.
   - Issuer self-approval: Throws `SecurityException`.
   - Unauthorized approver (lacks `DA_Emergency_Grant_Approver` permission set): Throws `SecurityException`.
   - Stale or expired grant: Returns `UNAUTHORIZED`.
   - Deleted/missing grant with Manual share: Returns `UNAUTHORIZED`.
   - Cross-project access attempt: Returns `UNAUTHORIZED`.

---

## 4. Test Evidence & Execution Matrix

A dedicated offline test suite was executed against the exact source implementation:

- **Test Runner**: `scratch/salesforce-poc/tests/run-phase1-manual-share-provenance-tests.cjs`
- **Execution Command**: `node scratch/salesforce-poc/tests/run-phase1-manual-share-provenance-tests.cjs`
- **Execution Environment**: Node.js v22.22.1 (Offline Headless / Mock DOM)
- **Exit Code**: `0`
- **Total Test Cases**: 15 passed, 0 failed.

### 4.1 Detailed Test Scenario Mapping

| # | Test Condition | Implementation Mechanism | Mode | Result |
|---|---|---|---|---|
| 1 | Direct ownership without emergency grant | `proj.OwnerId == userId` | Offline Mock | PASS (`DIRECT_SHARE`) |
| 2 | Independently authorized non-Manual access | `RowCause != 'Manual'` (e.g. Rule, Territory) | Offline Mock | PASS (`DIRECT_SHARE`) |
| 3 | Direct and emergency access simultaneously | Dynamic emergency evaluation prioritized | Offline Mock | PASS (`EMERGENCY_GRANT`) |
| 4 | Emergency-only access | Valid active unexpired grant | Offline Mock | PASS (`EMERGENCY_GRANT`) |
| 5 | Expired emergency grant with stale share | `staleGrants` detection rejects lingering share | Offline Mock | PASS (`UNAUTHORIZED`) |
| 6 | Revoked emergency grant with stale share | `Revoked__c == true` detected fail-closed | Offline Mock | PASS (`UNAUTHORIZED`) |
| 7 | Deleted or missing grant association | Manual share without non-Manual cause fails closed | Offline Mock | PASS (`UNAUTHORIZED`) |
| 8 | Historical Manual share with unknown provenance | Absence of grant fails closed; unproven share rejected | Offline Mock | PASS (`UNAUTHORIZED`) |
| 9 | Emergency cleanup preserving direct access | Ownership / non-Manual share retained post-revocation | Offline Mock | PASS (`DIRECT_SHARE`) |
| 10 | Conflicting provenance | Active grant evaluated; revoked grant ignored | Offline Mock | PASS (`EMERGENCY_GRANT`) |
| 11 | Duplicate provenance | Selects highest valid active unexpired grant | Offline Mock | PASS (`EMERGENCY_GRANT`) |
| 12 | Cross-project access | Query strictly scoped to `Project__c = :projectId` | Offline Mock | PASS (`UNAUTHORIZED`) |
| S1 | Source code inspection: RowCause check | `DAProjectSecurityService.cls` lines 248-251 | Source Audit | PASS |
| S2 | Source code inspection: Dynamic expiry check | `DAProjectSecurityService.cls` lines 145-155 | Source Audit | PASS |
| S3 | Source code inspection: Cleanup grant check | `DAProjectSecurityService.cls` lines 483-495 | Source Audit | PASS |

---

## 5. Environment Classification & Remaining Limitations

- **Source Code Verification**: `IMPLEMENTED_SOURCE_VERIFIED` in `DAProjectSecurityService.cls`.
- **Offline Mock Verification**: `OFFLINE_TEST_VERIFIED` via `node scratch/salesforce-poc/tests/run-phase1-manual-share-provenance-tests.cjs` and `run-phase1-final-acceptance-tests.cjs`.
- **Salesforce Org Verification**: `NOT_VERIFIABLE` in local environment. Physical Salesforce sharing table recalculation (`DA_Project__Share`) and multi-user concurrent DML require a live Salesforce scratch or sandbox org with multi-tenant sharing services.

---

## 6. Git Baseline

- **Repository Branch**: `jules-2599622856816048872-f169f68d`
- **Commit HEAD**: `d8ed553842cc04711279d2b661a2b4acd7af5394`

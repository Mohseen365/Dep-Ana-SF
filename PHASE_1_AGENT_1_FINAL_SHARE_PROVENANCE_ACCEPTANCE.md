# Phase 1 Agent 1 Final Share Provenance Acceptance Report

## Document Identification
- **Document Type**: Security Architecture & Direct-Share Provenance Acceptance Specification (Final Acceptance)
- **Component**: `DAProjectSecurityService.cls`
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED

---

## 1. Problem Statement

Under Salesforce Private OWD, both emergency access grants and manual collaboration shares create records in `DA_Project__Share` with `RowCause = 'Manual'`. A standard SOQL query evaluated in `WITH USER_MODE` or the mere existence of a Manual share row does not independently prove direct authorization:
1. If an emergency grant created a Manual share row and the grant subsequently expired or was revoked, a user-mode query might still succeed if physical row deletion was delayed or failed.
2. If direct access and emergency access coexist for the same user and project, revocation of emergency access must remove only emergency-derived access and preserve independently authorized direct access.
3. If provenance records are missing, unknown, duplicate, or conflicting, the system must fail-closed rather than granting unproven direct access.

---

## 2. Share Architecture & Authoritative Provenance Model

To prevent misclassification and unproven direct access, `DAProjectSecurityService` establishes an explicit provenance evaluation model:

### 2.1 Evaluated Provenance Classes
- **`DIRECT_SHARE`**: Authoritatively verified independent direct access. Confirmed either by:
  - Project record ownership (`proj.OwnerId == userId`).
  - Standard Salesforce sharing rows with non-manual row causes (`RowCause != 'Manual'`), such as Role Hierarchy, Territory, or Rule-based sharing.
  - Manual share rows backed by verified direct entitlement evidence, with zero dependent emergency grants or verified non-emergency provenance.
- **`EMERGENCY_GRANT`**: Active, unrevoked emergency access grant within unexpired lease window (`Expires_At__c > Datetime.now()`, `Is_Active__c = true`, `Revoked__c = false`).
- **`UNAUTHORIZED`**: Fail-closed state returned when neither independent direct provenance nor active emergency grant can be authoritatively proven.

### 2.2 Rejection of Mere Manual Share Presence
The mere existence of a `DA_Project__Share` row with `RowCause = 'Manual'` is never treated as sufficient proof of direct authorization.
- When an emergency grant exists for the user on that project, any lingering or concurrent manual share row is scrutinized.
- In `hasAuthoritativeDirectShare(projectId, userId)`, the service verifies whether independent direct entitlement exists outside emergency grants.
- Stale emergency grants (`Expires_At__c <= currentDatetime` or `Revoked__c == true`) actively block fall-through to unproven manual shares, returning `UNAUTHORIZED` and logging `PROJECT_ACCESS_DENIED`.

### 2.3 Coexistence and Revocation Behavior
When direct access and emergency access coexist for the same user and project:
1. During active lease, access evaluates via `EMERGENCY_GRANT` or `DIRECT_SHARE` depending on the requested scope.
2. When the emergency grant is revoked or expires, `cleanupShareRow(projectId, userId)` inspects remaining active emergency grants.
3. Crucially, revocation updates the emergency grant record to `Revoked__c = true` and `Is_Active__c = false`. Subsequent authorization checks dynamically reject the grant even if physical share row cleanup encounters an error (`ACTION_CLEANUP_FAILURE`).
4. If the user possesses independent direct entitlement (e.g., project ownership or verified direct share), `hasAuthoritativeDirectShare` confirms valid direct provenance and direct access is preserved.

### 2.4 Handling Unknown, Missing, Duplicate, and Conflicting Provenance Records
- **Missing / Blank Provenance**: If project ID or user ID is missing, throws `IllegalArgumentException`. If direct share query returns empty or no matching direct entitlement exists, returns `UNAUTHORIZED` fail-closed.
- **Unknown RowCause / Payload**: Any unrecognized share cause or undocumented sharing state fails-closed to `UNAUTHORIZED`.
- **Conflicting Grants**: If one emergency grant is revoked while another remains active, only the active grant is evaluated. If contradictory states exist (e.g. `Is_Active__c = true` but `Revoked__c = true`), the grant is rejected as inactive/revoked.
- **Duplicate Grants**: Evaluated using deterministic ordering (`ORDER BY Expires_At__c DESC LIMIT 1`).

---

## 3. Test Coverage & Verification

Tested in test runner `scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs`:
- Independent direct share validation without emergency access.
- Stale emergency share rejection preventing misclassification as direct share.
- Direct share and emergency share coexistence.
- Emergency revocation preserving direct share.
- Unknown, missing, and conflicting provenance fail-closed handling.

---

## 4. Environment Classification & Remaining Limitations

- **Source Code Verification**: `IMPLEMENTED_SOURCE_VERIFIED` in `DAProjectSecurityService.cls`.
- **Offline Mock Verification**: `OFFLINE_TEST_VERIFIED` via Node.js test runner `run-phase1-final-acceptance-tests.cjs`.
- **Salesforce Org Verification**: `NOT_VERIFIABLE` in local environment. Physical Salesforce sharing table (`DA_Project__Share`) calculation and multi-user concurrent DML require a live Salesforce scratch or sandbox org with multi-tenant sharing services.

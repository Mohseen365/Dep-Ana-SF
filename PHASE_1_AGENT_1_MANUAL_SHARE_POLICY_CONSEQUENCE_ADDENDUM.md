# Phase 1 Agent 1 Manual-Share Policy Consequence Addendum

## Document Identification
- **Document Type**: Security Policy Consequence Analysis & Architectural Addendum
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2 (Read-Only)
- **Date**: 2026-11-11
- **Status**: RATIFIED POLICY ADDENDUM

---

## 1. Executive Context & Invariant Reiteration

Under `DAProjectSecurityService.cls`, the following security invariant is strictly enforced:
> **Absence of an emergency access grant record must never be treated as proof of independent direct authorization.**

Because standard Salesforce sharing tables use `RowCause = 'Manual'` for both ordinary user-to-user collaboration and temporary emergency access grants, raw `DA_Project__Share` records where `RowCause == 'Manual'` possess ambiguous provenance. To eliminate unauthorized privilege escalation from orphaned or unproven shares, `DAProjectSecurityService` implements a strict **fail-closed** evaluation:
- Direct access requires **Record Ownership** (`proj.OwnerId == userId`) or **Verified Non-Manual Sharing** (`RowCause != 'Manual'`).
- Temporary access requires an **Active, Valid Emergency Grant** (`DA_Emergency_Access_Grant__c`).
- Any Manual share row lacking an active emergency grant fails-closed to `UNAUTHORIZED`.

---

## 2. Explicit Functional Tradeoff & Collaboration Impact

The adoption of this conservative fail-closed model represents a deliberate security-versus-compatibility tradeoff. It prioritizes project isolation and tamper resistance over permissive legacy collaboration:

### 2.1 Supported Collaboration Scenarios
1. **Direct Project Ownership**:
   - Project creators and owners (`OwnerId == userId`) retain full, uninhibited direct access to their projects (`DIRECT_SHARE`).
   - Ownership access is immune to emergency grant lifecycles and remains active even if an emergency grant expires or is revoked.
2. **Independently Authorized Non-Manual Sharing**:
   - Sharing established through Salesforce standard automated mechanisms (e.g., Criteria-Based Sharing Rules, Owner-Based Sharing Rules, Role Hierarchy, Territory Management, or predefined Apex Sharing Reasons with custom RowCauses) where `RowCause != 'Manual'` is authoritatively recognized as direct access (`DIRECT_SHARE`).
3. **Controlled Emergency Access**:
   - Users requiring temporary elevated investigation access receive time-bounded leases (<4 hours) via `DA_Emergency_Access_Grant__c` requiring dual-party authorization, anti-impersonation checks, separation of duties, and append-only audit logging.
4. **Coexistence and Safe Revocation**:
   - Users holding both direct entitlement (e.g., project ownership or non-Manual share) and an emergency grant have access granted via the emergency scope during the active lease. Upon revocation or expiration, their independent direct access is preserved without interruption.

### 2.2 Denied or Quarantined Collaboration Scenarios
1. **Ad-Hoc Manual UI Shares**:
   - If an end user or administrator manually clicks "Share" in the Salesforce standard UI to grant access to a peer, Salesforce creates a `DA_Project__Share` row with `RowCause = 'Manual'`.
   - **Functional Consequence**: In the absence of an accompanying emergency grant record, `DAProjectSecurityService` will **deny** access (`UNAUTHORIZED`, `PROJECT_ACCESS_DENIED`).
   - **Rationale**: The system cannot distinguish an ad-hoc collaboration share from a lingering, expired, or orphaned emergency share whose grant association was lost.
2. **Historical Pre-Migration Manual Shares**:
   - Any historical `DA_Project__Share` records created prior to Phase 1 migration that lack persisted provenance cannot be authoritatively verified.
   - **Functional Consequence**: Such shares will fail closed. They are neither silently reclassified nor deleted; rather, access via that specific unproven path is denied until an authorized reconciliation occurs.
3. **Deleted or Corrupted Emergency Grant Associations**:
   - If an emergency grant record is hard-deleted or disassociated while its physical `DA_Project__Share` row remains, the user is immediately denied access. The lingering share row is rejected rather than mistakenly grandfathered as permanent access.

---

## 3. Policy on Data Migration & Reconciliation

1. **No Automatic Data Alteration**:
   - The security service performs **no automatic reclassification or deletion** of historical `DA_Project__Share` records during authorization queries.
   - The system does not assume missing grants mean malicious access, nor does it assume they mean legitimate access.
2. **No Custom RowCause Invention**:
   - Salesforce platform architecture does not permit arbitrary custom `RowCause` strings on standard sharing objects without formal Apex Sharing Reason definitions, and custom causes cannot be retrospectively injected into existing standard Manual shares.
3. **Future Dedicated Direct-Sharing Provenance Mechanism**:
   - To support long-term persistent user-to-user collaboration without relying on ambiguous `RowCause = 'Manual'` shares, the architecture roadmap identifies a future requirement:
     - Introduce a dedicated custom collaboration object (e.g., `DA_Project_Member__c` or `DA_Direct_Access_Grant__c`) with explicit approver, role, expiration, and audit fields.
     - A formal, owner-approved migration script can then reconcile and map legitimate business collaboration shares into this dedicated provenance store with full auditability and rollback safeguards.
   - **Production Constraint**: No production metadata changes or data migrations are authorized or executed in Phase 1.

---

## 4. Verification & Implementation Alignment

Independent Verifier D2 has verified that `DAProjectSecurityService.cls` strictly reflects this addendum:
- Lines 200–214: `hasAuthoritativeDirectShare(projectId, userId)` is invoked.
- Lines 248–254: `hasAuthoritativeDirectShare` explicitly queries `RowCause != 'Manual'`.
- Lines 170–178: `staleGrants` detection rejects lingering shares.
- `run-phase1-manual-share-provenance-tests.cjs`: 15/15 tests confirm all described conditions pass offline.

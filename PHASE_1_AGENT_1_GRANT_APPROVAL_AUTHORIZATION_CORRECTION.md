# Phase 1 Agent 1 Grant Approval and Authorization Correction Report

## Document Identification
- **Document Type**: Emergency Grant Approval & Issuer/Approver Authorization Specification
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED

---

## 1. Problem Statement

Previous grant creation entry points exposed `createEmergencyGrant` and `createEmergencyGrantWithApproval`. The ordinary method could allow unapproved self-service grant creation, and caller-supplied `issuerId`/`approverId` arguments did not prevent client-side identity fabrication or self-approval.

---

## 2. Hardened Authorization Implementation

In `DAProjectSecurityService.cls`:
1. **Approval Bypass Elimination**:
   - `createEmergencyGrant(projectId, userId, leaseSeconds, scope, reason)` is strictly restricted. Any direct invocation without an explicit authorized approver throws `SecurityException('Direct emergency grant creation without explicit approver is prohibited...')`.
2. **Dual-Party Approval & Separation of Duties**:
   - `createEmergencyGrantWithApproval(projectId, userId, leaseSeconds, scope, reason, issuerId, approverId)` enforces:
     - `approverId != null`: Mandatory approver.
     - `approverId != userId`: Recipient cannot approve their own grant.
     - `approverId != effectiveIssuerId`: Issuer cannot self-approve emergency access.
     - `issuerId == UserInfo.getUserId()` unless invoked from a trusted internal system caller. Arbitrary client fabrication of `issuerId` throws `SecurityException('Issuer mismatch...')`.
3. **Lease Clamping**:
   - Bounded to `MAX_EMERGENCY_LEASE_SECONDS = 14400` (4 hours).
4. **Append-Only Auditing**:
   - Inserts distinct append-only records: `EMERGENCY_GRANT_CREATED` and `EMERGENCY_GRANT_APPROVED`.

---

## 3. Test Evidence

Validated in `run-phase1-hardened-contracts-tests.cjs`:
- 1.6: Separation of duties (recipient != approver, issuer != approver)
- 1.7: Grant creation approval bypass elimination & issuer fabrication rejection
- 1.8: Lease ceiling clamping to 14400s

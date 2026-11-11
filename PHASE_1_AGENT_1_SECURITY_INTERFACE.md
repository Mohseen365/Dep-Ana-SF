# Phase 1 Agent 1 Security Interface

## Interface Identification & Governance
- **Interface Name**: Multi-Tenant Project Authorization and Emergency Access Interface
- **Interface Version**: `v1.0.1` (Hardened Patch Revision)
- **Supersedes**: `v1.0.0` (Preserved in Git history at baseline commit `6d605d7`)
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Compatibility Classification**: Backward-compatible additive hardening (Patch-compatible)

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative security interface for the Dependency Analyzer Salesforce application. It establishes the programmatic rules, service signatures, data contracts, and error semantics for multi-tenant project authorization, Private Organization-Wide Default (OWD) sharing, time-bounded emergency access grants, dynamic runtime expiry checks independent of physical share rows, authenticated principal protection, exact permission scope matching, explicit revocation transactions, and tamper-proof audit trails.

Downstream agents—specifically **Agent 2 (Ingestion Lifecycle & Persistence [Scope B])**, **Agent 3 (REST Transport)**, **Agent 6 (Finding Review Persistence)**, and **Agent 7 (Project Creation & Upload UI)**—must adhere strictly to the signatures, access rules, and error handling specified herein.

---

## 2. Exact Source Paths & Deliverables

| Artifact | Source Path | Type | Description |
|---|---|---|---|
| **Project OWD Metadata** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/DA_Project__c.object-meta.xml` | Custom Object | `sharingModel` set strictly to `Private` |
| **Emergency Grant Object** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Emergency_Access_Grant__c/` | Custom Object & Fields | Project, User, Expires_At__c, Revoked__c, Revoked_At__c, Is_Active__c, Scope__c, Reason__c |
| **Security Audit Log Object** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Security_Audit_Log__c/` | Custom Object & Fields | Project, User, Action__c, Details__c, Timestamp__c |
| **Core Security Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls` | Apex Class | Core authorization, grant creation, revocation, dynamic validation, scope matching |
| **Audit Immutability Trigger** | `scratch/salesforce-poc/force-app/main/default/triggers/DASecurityAuditLogTrigger.trigger` | Apex Trigger | Blocks `BEFORE UPDATE` and `BEFORE DELETE` with `DA_AUDIT_IMMUTABLE` |
| **Scheduled Cleanup Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAEmergencyAccessCleanupService.cls` | Schedulable / Batch Apex | Supplementary garbage collection for expired `DA_Project__Share` rows |
| **Security Permission Set** | `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` | Permission Set | Grants FLS across 29 custom fields; excludes Master-Detail and required fields |

---

## 3. Provenance and Authorization Model

For every authorization decision, the system distinguishes:
1. **Independently Authorized Project Access (`DIRECT_SHARE`)**: The user has access via standard Salesforce Private OWD ownership, role hierarchy, or explicit manual share row not tied to an active emergency grant.
2. **Emergency-Grant-Derived Access (`EMERGENCY_GRANT`)**: Access is granted exclusively because of an active, unexpired, unrevoked `DA_Emergency_Access_Grant__c` record with matching scope.
3. **Expired Emergency Access (`UNAUTHORIZED`)**: If an emergency grant reaches `Expires_At__c <= Datetime.now()`, dynamic evaluation immediately rejects access fail-closed, regardless of whether a physical `DA_Project__Share` row remains.
4. **Revoked Emergency Access (`UNAUTHORIZED`)**: If an emergency grant has `Revoked__c = true` or `Is_Active__c = false`, dynamic evaluation immediately rejects access.
5. **Unauthorized Access (`UNAUTHORIZED`)**: Neither a valid emergency grant nor direct project sharing exists.

### Emergency Sharing Provenance & Stale Share Invariant:
- Dynamic authorization queries `DA_Emergency_Access_Grant__c` first with dynamic datetime comparison `Expires_At__c > :currentDatetime`.
- Physical `DA_Project__Share` rows with `RowCause = 'Manual'` created to support emergency access do not confer authorization on their own. Even if asynchronous cleanup of share rows is delayed or fails, authorization fails closed because the grant record is authoritative.
- Removing an emergency grant cleans up only the emergency grant; independently authorized direct access (e.g. permanent project collaboration) remains intact if independent grants exist.

---

## 4. Authenticated Principal Protection

A client must never be allowed to supply an arbitrary `userId` to evaluate or forge authorization.

### Methods:
1. `validateProjectAccessForCurrentUser(Id projectId, String requiredScope)`:
   - Primary user-facing controller entry point.
   - Derives principal strictly from `UserInfo.getUserId()`.
2. `validateProjectAccess(Id projectId, Id userId, String requiredScope)`:
   - Backward-compatible entry point.
   - Enforces principal matching: if caller passes a `userId != UserInfo.getUserId()` in an untrusted context (LWC, Aura, standard controller), it throws `SecurityException('Principal mismatch')`.
3. `validateProjectAccessTrustedInternal(Id projectId, Id userId, String requiredScope)`:
   - Service-to-service call restricted to batch Apex, Queueable, or scheduled execution (`System.isBatch() || System.isQueueable() || System.isScheduled()`).
   - Rejects untrusted interactive callers fail-closed.

---

## 5. Canonical Scope Vocabulary and Exact Scope Matching

Permission scope matching uses exact set membership and explicit hierarchy. Substring matching is strictly prohibited to eliminate accidental scope collisions.

### Canonical Vocabulary:
- `FULL`: Complete administrative and operational access.
- `PROJECT_READ`: Base read access to project metadata.
- `GRAPH_READ`: Permission to load and view graph topology and nodes/edges.
- `FINDING_READ`: Permission to inspect findings and architectural violations.
- `FINDING_WRITE`: Permission to review, triage, and mutate finding review statuses.
- `ANALYSIS_UPLOAD`: Permission to initiate upload runs and write graph chunks.
- `ANALYSIS_FINALIZE`: Permission to complete validation and publish graph runs.

### Hierarchy Rules:
- `FULL` satisfies all required scopes.
- `ANALYSIS_FINALIZE` implies `ANALYSIS_UPLOAD`.
- `FINDING_WRITE` implies `FINDING_READ`.
- `GRAPH_READ` implies `PROJECT_READ`.
- `FINDING_READ` implies `PROJECT_READ`.
- An invalid or unrecognized scope is rejected fail-closed with `PROJECT_ACCESS_DENIED`.

---

## 6. Emergency Grant Creation, Approval, and Separation of Duties

### Signatures:
```apex
public static Id createEmergencyGrant(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason)
public static Id createEmergencyGrantWithApproval(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason, Id issuerId, Id approverId)
```

### Rules & Enforcements:
1. **Four-Hour Maximum Lease**: Enforces ceiling `MAX_EMERGENCY_LEASE_SECONDS = 14400` (4 hours). Any requested lease > 14400 seconds is clamped to 14400.
2. **Separation of Duties**: When an explicit approver is specified, the recipient user cannot approve their own grant (`approverId != userId`).
3. **Issuer Auditing**: The grant creation transaction writes an immutable `DA_Security_Audit_Log__c` record capturing `projectId`, `userId`, `issuerId`, `approverId`, `leaseSeconds`, `expiresAt`, and `scope`.
4. **Renewal Prohibition**: Automatic renewal is not permitted; expired grants cannot be revived. A new grant must be created and audited.

---

## 7. Revocation Transaction Semantics

### Revocation Sequence:
1. **Query & Idempotency Check**: Query target `DA_Emergency_Access_Grant__c`. If already revoked and inactive, returns `true` idempotently.
2. **Audit Initiation**: An audit record (`EMERGENCY_GRANT_REVOKED`) is inserted immediately.
3. **State Mutation**: Sets `Revoked__c = true`, `Revoked_At__c = Datetime.now()`, and `Is_Active__c = false`. Committed via `update as user grant`.
4. **Physical Share Deletion**: Invokes `cleanupShareRow(projectId, userId)` using `Database.delete(shares, false)`.
5. **Failure Tolerance**: If share deletion fails or encounters database locks, the error is recorded in the audit log (`CLEANUP_FAILURE`), but the transaction succeeds because authorization checks evaluate the grant record directly, maintaining fail-closed protection.
6. **Post-Commit Invariant**: After the revocation transaction commits, any subsequent call to `validateProjectAccess` will immediately reject access.

---

## 8. Error Codes & Exceptions

| Code / Exception | Trigger Condition | Handling |
|---|---|---|
| `IllegalArgumentException` | Null project ID or invalid scope | Fail-closed, 400 response |
| `SecurityException('Principal mismatch')` | Client attempts to evaluate another user | Fail-closed, 403 Forbidden |
| `SecurityException('Separation of duties')` | Grant recipient approves own emergency grant | Fail-closed, 403 Forbidden |
| `SecurityException('Grant not found')` | Non-existent grant ID supplied to revoke | Fail-closed, 404 Not Found |
| `DA_AUDIT_IMMUTABLE` | Attempted update or deletion of `DA_Security_Audit_Log__c` | DML exception in trigger |

---

## 9. Downstream Consumer Compatibility

- **Agent 2 [Scope B]**: Validates project access using `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')`.
- **Agent 3 (REST Ingestion Transport)**: Uses `validateProjectAccess` or `validateProjectAccessForCurrentUser` with scopes `ANALYSIS_UPLOAD` and `ANALYSIS_FINALIZE`.
- **Agent 6 (Finding Review Persistence)**: Uses `validateProjectAccessForCurrentUser(projectId, 'FINDING_WRITE')`.
- **Agent 7 (Upload UI)**: Uses `validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')`.
- All method signatures from v1.0.0 remain callable; v1.0.1 provides non-breaking parameter defaults and added overload protections.

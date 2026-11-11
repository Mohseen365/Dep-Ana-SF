# Phase 1 Agent 1 Security Interface

## Interface Identification & Governance
- **Interface Name**: Multi-Tenant Project Authorization and Emergency Access Interface
- **Interface Version**: `v1.0.2` (Hardened Patch Revision)
- **Supersedes**: `v1.0.1` (Preserved in Git history)
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Compatibility Classification**: Backward-compatible additive hardening (Patch-compatible)

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative security interface for the Dependency Analyzer Salesforce application. It establishes the programmatic rules, service signatures, data contracts, and error semantics for multi-tenant project authorization, Private Organization-Wide Default (OWD) sharing, time-bounded emergency access grants, dynamic runtime expiry checks independent of physical share rows, authenticated principal protection, exact permission scope matching, explicit revocation transactions, and tamper-proof append-only audit trails.

Under v1.0.2, key corrections have been ratified:
1. **Mandatory Approval Enforcement**: Emergency grant creation paths enforce mandatory approval by distinct authorized approvers; bypasses are strictly eliminated.
2. **Restricted Trusted Internal Caller Boundary**: Principal substitution is bounded to explicit internal system services (`DAEmergencyAccessCleanupService`, `DAGraphIngestionService`); arbitrary batch, queueable, or scheduled execution contexts are blocked fail-closed.
3. **Share Provenance & Precedence**: Explicit precedence model resolves active emergency grants, independent direct shares, and stale emergency share rejection without accidental direct-access deletion.
4. **Append-Only Audit & Transaction Failure Semantics**: Security audit logging is append-only; failures during revocation or share cleanup log separate failure events without mutating prior records.

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

For every authorization decision, the service applies authoritative precedence:
1. **Validate Authenticated Principal**: Binds evaluation to `UserInfo.getUserId()` unless caller is within a verified internal system trust boundary.
2. **Resolve Dynamic Emergency Access (`EMERGENCY_GRANT`)**: Queries `DA_Emergency_Access_Grant__c` dynamically (`Expires_At__c > :currentDatetime AND Revoked__c = FALSE AND Is_Active__c = TRUE`). If valid and scope matches, grants access with provenance `EMERGENCY_GRANT`.
3. **Resolve Independent Direct Access (`DIRECT_SHARE`)**: Evaluates standard Salesforce Private OWD ownership, role hierarchy, or explicit manual share row via `WITH USER_MODE` query.
4. **Reject Expired or Revoked Grants (`UNAUTHORIZED`)**: Expired (`Expires_At__c <= Datetime.now()`) or revoked grants fail-closed immediately, rejecting stale emergency shares even if physical `DA_Project__Share` rows linger.
5. **Exact Scope Enforcement**: Enforces exact canonical scope matching.
6. **Deny Fail-Closed**: Returns explicit `UNAUTHORIZED` context and records append-only audit event.

### Share Coexistence & Provenance Invariant:
- Physical `DA_Project__Share` rows with `RowCause = 'Manual'` created to support emergency access do not confer authorization on their own; authorization fails closed if the grant record is inactive, expired, or revoked.
- When an emergency grant is revoked or cleaned up, `cleanupShareRow` preserves the share row if the user retains independent direct entitlements or another active unexpired emergency grant.

---

## 4. Authenticated Principal Protection & Trust Boundaries

A client must never be allowed to supply an arbitrary `userId` to evaluate or forge authorization.

### Methods:
1. `validateProjectAccessForCurrentUser(Id projectId, String requiredScope)`:
   - Primary user-facing controller entry point.
   - Derives principal strictly from `UserInfo.getUserId()`.
2. `validateProjectAccess(Id projectId, Id userId, String requiredScope)`:
   - Backward-compatible entry point.
   - Enforces principal matching: if caller passes a `userId != UserInfo.getUserId()` in an untrusted context, throws `SecurityException('Principal mismatch')`.
3. `validateProjectAccessTrustedInternal(Id projectId, Id userId, String requiredScope)`:
   - Service-to-service call restricted to bounded internal system operations (`AUTHORIZED_INTERNAL_CLASSES`).
   - Execution context (Batch, Queueable, Scheduled) alone does not confer principal substitution; execution must occur within an established trust boundary.

---

## 5. Canonical Scope Vocabulary and Exact Scope Matching

Permission scope matching uses exact set membership and explicit hierarchy. Substring matching is strictly prohibited.

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

### Authoritative Signatures:
```apex
public static Id createEmergencyGrant(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason)
public static Id createEmergencyGrantWithApproval(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason, Id issuerId, Id approverId)
```

### Issuance Policy:
1. **Mandatory Approval**: Direct creation via `createEmergencyGrant` without an explicit approver is prohibited and throws `SecurityException`.
2. **Dual Approval & Separation of Duties**:
   - Grant recipient cannot approve their own grant (`approverId != userId`).
   - Grant issuer cannot approve their own grant (`approverId != issuerId`).
   - Callers cannot fabricate issuer identity (`issuerId == UserInfo.getUserId()` unless verified internal system context).
3. **Four-Hour Maximum Lease**: Enforces ceiling `MAX_EMERGENCY_LEASE_SECONDS = 14400` (4 hours). Any requested lease > 14400 seconds is clamped to 14400.
4. **Append-Only Issuance Auditing**: The creation transaction inserts append-only audit records (`EMERGENCY_GRANT_CREATED` and `EMERGENCY_GRANT_APPROVED`).

---

## 7. Revocation Transaction Semantics

### Revocation Sequence:
1. **Query & Idempotency Check**: Query target `DA_Emergency_Access_Grant__c`. If already revoked and inactive, returns `true` idempotently.
2. **Audit Initiation**: An append-only audit record (`EMERGENCY_GRANT_REVOKED`) is inserted.
3. **State Mutation**: Sets `Revoked__c = true`, `Revoked_At__c = Datetime.now()`, and `Is_Active__c = false`. Committed via `update as user grant`.
4. **Physical Share Deletion**: Invokes `cleanupShareRow(projectId, userId)` using `Database.delete(shares, false)`.
5. **Failure Tolerance**: If share deletion fails or encounters database locks, a separate append-only audit event (`ACTION_CLEANUP_FAILURE`) is inserted. Access remains blocked fail-closed.
6. **Post-Commit Invariant**: After the revocation transaction commits, subsequent calls to `validateProjectAccess` immediately reject access.

---

## 8. Error Codes & Exceptions

| Code / Exception | Trigger Condition | Handling |
|---|---|---|
| `IllegalArgumentException` | Null project ID or invalid scope | Fail-closed, 400 response |
| `SecurityException('Principal mismatch')` | Client attempts to evaluate another user | Fail-closed, 403 Forbidden |
| `SecurityException('Mandatory approval violation')` | Emergency grant requested without approver | Fail-closed, 403 Forbidden |
| `SecurityException('Separation of duties')` | Grant recipient or issuer self-approves grant | Fail-closed, 403 Forbidden |
| `SecurityException('Issuer mismatch')` | Client attempts to fabricate issuer identity | Fail-closed, 403 Forbidden |
| `SecurityException('Grant not found')` | Non-existent grant ID supplied to revoke | Fail-closed, 404 Not Found |
| `DA_AUDIT_IMMUTABLE` | Attempted update or deletion of `DA_Security_Audit_Log__c` | DML exception in trigger |

---

## 9. Downstream Consumer Compatibility

- **Agent 2 [Scope B]**: Validates project access using `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')`.
- **Agent 3 (REST Ingestion Transport)**: Uses `validateProjectAccess` or `validateProjectAccessForCurrentUser` with scopes `ANALYSIS_UPLOAD` and `ANALYSIS_FINALIZE`.
- **Agent 6 (Finding Review Persistence)**: Uses `validateProjectAccessForCurrentUser(projectId, 'FINDING_WRITE')`.
- **Agent 7 (Upload UI)**: Uses `validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')`.
- All method signatures from v1.0.1 remain callable; v1.0.2 provides non-breaking additive security hardening.

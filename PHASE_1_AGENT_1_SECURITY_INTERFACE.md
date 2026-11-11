# Phase 1 Agent 1 Security Interface

## Interface Identification & Governance
- **Interface Name**: Multi-Tenant Project Authorization and Emergency Access Interface
- **Interface Version**: `v1.0.0`
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Git Commit Reference**: Baseline `0637b904ab8537b7625fb0ab9882cb5cbdf32746` / Group A Branch `jules-16312564460869361898-1d34a25a`

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative security interface for the Dependency Analyzer Salesforce application. It establishes the programmatic rules, service signatures, data contracts, and error semantics for multi-tenant project authorization, Private Organization-Wide Default (OWD) sharing, time-bounded emergency access grants, dynamic runtime expiry checks independent of physical share rows, and tamper-proof audit trails.

Downstream agents—specifically **Agent 2 (Ingestion Lifecycle & Persistence [Scope B])**, **Agent 3 (REST Transport)**, **Agent 6 (Finding Review Persistence)**, and **Agent 7 (Project Creation & Upload UI)**—must adhere strictly to the signatures, access rules, and error handling specified herein.

---

## 2. Exact Source Paths & Metadata Deliverables

| Artifact | Source Path | Type | Description |
|---|---|---|---|
| **Project OWD Metadata** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/DA_Project__c.object-meta.xml` | Custom Object | `sharingModel` set strictly to `Private` |
| **Emergency Grant Object** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Emergency_Access_Grant__c/` | Custom Object & Fields | Project, User, Expires_At__c, Revoked__c, Revoked_At__c, Is_Active__c, Scope__c, Reason__c |
| **Security Audit Log Object** | `scratch/salesforce-poc/force-app/main/default/objects/DA_Security_Audit_Log__c/` | Custom Object & Fields | Project, User, Action__c, Details__c, Timestamp__c |
| **Core Security Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls` | Apex Class | Core authorization, grant creation, 6-step revocation, dynamic validation |
| **Audit Immutability Trigger** | `scratch/salesforce-poc/force-app/main/default/triggers/DASecurityAuditLogTrigger.trigger` | Apex Trigger | Blocks `BEFORE UPDATE` and `BEFORE DELETE` with `DA_AUDIT_IMMUTABLE` |
| **Scheduled Cleanup Service** | `scratch/salesforce-poc/force-app/main/default/classes/services/DAEmergencyAccessCleanupService.cls` | Schedulable / Batch Apex | Supplementary garbage collection for expired `DA_Project__Share` rows |
| **Security Permission Set** | `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` | Permission Set | Grants FLS across 29 custom fields; excludes Master-Detail and required fields |

---

## 3. Service Signatures & Methods

All services reside in `public with sharing class DAProjectSecurityService`:

### 3.1 `validateProjectAccess`
```apex
public static ProjectAccessContext validateProjectAccess(Id projectId, Id userId, String requiredScope)
```
- **Description**: Validates that the specified user has authorization to access the specified project for the required scope.
- **Fail-Closed Guarantee**: Evaluates dynamic emergency access grants and direct project sharing using `WITH USER_MODE`. If no valid unexpired, unrevoked grant or sharing record exists, returns `hasAccess = false` and logs an audit failure.
- **Dynamic Lease Boundary**: Binds local `Datetime currentDatetime = Datetime.now();` to check `Expires_At__c > :currentDatetime`.

### 3.2 `createEmergencyGrant`
```apex
public static Id createEmergencyGrant(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason)
```
- **Description**: Issues a temporary, auditable emergency access grant.
- **Constraints**: Enforces maximum lease duration `MAX_EMERGENCY_LEASE_SECONDS = 14400` (4 hours). Any requested lease exceeding 14,400 seconds is capped to 14,400 seconds.
- **Returns**: Salesforce `Id` of the created `DA_Emergency_Access_Grant__c` record.

### 3.3 `revokeEmergencyGrant`
```apex
public static Boolean revokeEmergencyGrant(Id grantId, String reason)
```
- **Description**: Executes the transaction-safe 6-step explicit revocation sequence.
- **Behavior**:
  1. Records revocation attempt in `DA_Security_Audit_Log__c`.
  2. Sets `Revoked__c = true`, `Revoked_At__c = Datetime.now()`, and `Is_Active__c = false`.
  3. Commits status update so all subsequent authorization checks fail-closed immediately.
  4. Removes physical `DA_Project__Share` row (`RowCause = 'Manual'`).
  5. Catches and logs any share deletion failure in `DA_Security_Audit_Log__c` without restoring access.
- **Idempotency**: Repeated calls on an already-revoked grant safely return `true`.

### 3.4 `logAuditEvent`
```apex
public static Id logAuditEvent(Id projectId, Id userId, String action, String details)
```
- **Description**: Writes an append-only audit event record to `DA_Security_Audit_Log__c`.
- **Enforcement**: Protected against updates and deletions by `DASecurityAuditLogTrigger`.

---

## 4. Input & Output Data Transfer Objects (DTOs)

### `ProjectAccessContext`
```apex
public class ProjectAccessContext {
    public Id projectId;             // Target project ID evaluated
    public Id userId;                // Requesting user ID evaluated
    public String requiredScope;     // Scope string (e.g. 'READ', 'WRITE', 'FULL')
    public Boolean hasAccess;        // Authoritative decision boolean
    public Boolean isEmergencyAccess;// True if authorized via emergency grant
    public Id grantId;               // ID of emergency grant used, if applicable
    public Datetime evaluationTime;  // Timestamp when access was validated
}
```

---

## 5. Seven Mandatory Dynamic Validation Rules

Whenever a downstream controller or service queries project data, it must enforce the 7 mandatory rules evaluated by `DAProjectSecurityService.validateProjectAccess`:
1. **Grant Existence**: A corresponding record exists in `DA_Emergency_Access_Grant__c`.
2. **User Identity Matching**: `grant.User__c == requestingUserId`.
3. **Project Identity Matching**: `grant.Project__c == targetProjectId`.
4. **Active Status**: `grant.Is_Active__c == true`.
5. **Dynamic Expiry Check**: Current transaction time is strictly prior to grant expiry (`grant.Expires_At__c > :currentDatetime`).
6. **Unrevoked Status**: `grant.Revoked__c == false` and `grant.Revoked_At__c == null`.
7. **Scope Containment**: Requested operation is covered by `grant.Scope__c` (e.g., `'FULL'`, or case-insensitive inclusion of requested action).

**Critical Stale Share-Row Rule**: A lingering `DA_Project__Share` row in the Salesforce database **does not** grant access if the corresponding `DA_Emergency_Access_Grant__c` is expired or revoked. Authorization is evaluated fail-closed dynamically.

---

## 6. Error Codes & Failure Semantics

| Error Code / Token | HTTP / Aura Exception | Cause / Condition | Remediation |
|---|---|---|---|
| `DA_SECURITY_UNAUTHORIZED` | 403 Forbidden | User lacks direct sharing and no active emergency grant exists | User must request project access or formal emergency lease |
| `DA_SECURITY_LEASE_EXPIRED` | 403 Forbidden | Emergency grant exceeded 4-hour lease duration | Dual-approval reauthorization required; cannot be silently extended |
| `DA_SECURITY_GRANT_REVOKED` | 403 Forbidden | Grant has been explicitly revoked by security administrator | Operation aborted fail-closed |
| `DA_AUDIT_IMMUTABLE` | DmlException | Attempt to update or delete record in `DA_Security_Audit_Log__c` | Modifications prohibited; records are strictly append-only |
| `DA_SECURITY_INVALID_PARAM` | 400 Bad Request | Blank or malformed `projectId` or `userId` | Provide valid Salesforce 15/18 character IDs |

---

## 7. Downstream Consumers & Interface Gates

| Consumer Agent | Dependent Scope | Unblocked Action After This Interface |
|---|---|---|
| **Agent 2 [Scope B]** | Ingestion Persistence Integration | Can now integrate project authorization checks into `DAGraphIngestionService.saveGraphChunks` |
| **Agent 3** | REST Ingestion Transport | Unblocked once Agent 2 publishes lifecycle interface (Agent 3 depends on both Agent 1 and Agent 2) |
| **Agent 6** | Finding Review Persistence | **UNBLOCKED IMMEDIATELY**: Agent 6 depends strictly on Agent 1 security interface |
| **Agent 7** | Project Creation UI | Remains gated until Agent 3 REST transport contract is also frozen |

---

## 8. Verification & Test Evidence

- **Unit Test Runner**: `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs` (11 passing tests).
- **Regression Suite**: `node scratch/salesforce-poc/tests/run-b4-security-tests.cjs` (14 passing tests).
- **Audit Verification Verdict**: **PASS** (Integration Coordinator D1 & Independent Verifier D2 ratified).

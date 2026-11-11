# Phase 1 Security Recovery, Relationship Evidence and Concurrency Test Acceptance

## Document Identification
- **Document Type**: Security Governance, Metadata Relationship Evidence & Test Architecture Acceptance Specification
- **Classification**: Implementation Constraints for Agent 1, Agent 2, Agent 3, Agent 10
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Independent Verifier D2, Agent 1
- **Status**: AUTHORITATIVE RECOVERY, RELATIONSHIP EVIDENCE & CONCURRENCY SPECIFICATION

---

## 1. Executive Summary

This specification enforces the critical security and concurrency corrections mandated by the Project Owner:
1. **Correction A (Salesforce Relationship and Security Evidence)**: Inspects the actual physical Salesforce metadata and schema files, tabulating an empirical Relationship Evidence Matrix that distinguishes Master-Detail (`ControlledByParent`) from Lookup relationships and determines exact sharing, CRUD/FLS, and Apex authorization rules.
2. **Correction B (Emergency Security Recovery Expiry & Audit Integrity)**: Mandates authorization-time expiry checks (< 4-hour lease) enforced dynamically at query/service time independent of scheduled cleanup, immediate explicit revocation, and documented Salesforce platform audit protection controls.
3. **Correction E (Concurrency Testing Architecture & Ownership)**: Separates deterministic Apex sequential unit tests from multi-threaded external concurrency tests requiring a live Salesforce test org.

---

## 2. Correction A: Empirical Salesforce Relationship Evidence Matrix

To avoid unverified assumptions regarding inherited sharing, Agent 1 conducted a physical audit of the custom object XML definitions in `scratch/salesforce-poc/force-app/main/default/objects/`.

### 2.1 Metadata Audit Matrix

| Parent Object | Child Object | Relationship Field | Relationship Type | ControlledByParent? | Sharing Behavior | CRUD / FLS Implications | Relevant Apex Authorization Checks | Evidence File Location | Security Consequence |
|---|---|---|---|---|---|---|---|---|---|
| `DA_Project__c` | `DA_Analysis_Run__c` | `DA_Project__c` | **Master-Detail** | **YES** (`ControlledByParent`) | Inherits `DA_Project__c` sharing; no independent `__Share` table | Field is mandatory; cannot define `<fieldPermissions>` in permset | `DAProjectSecurityService.validateProjectAccess(run.DA_Project__c)` | `objects/DA_Analysis_Run__c/fields/DA_Project__c.field-meta.xml:5`, `objects/DA_Analysis_Run__c/DA_Analysis_Run__c.object-meta.xml:10` | When `DA_Project__c` OWD is set to `Private`, run records are automatically secured by parent project membership. |
| `DA_Analysis_Run__c` | `DA_Graph_Chunk__c` | `DA_Analysis_Run__c` | **Master-Detail** | **YES** (`ControlledByParent`) | Inherits `DA_Analysis_Run__c` sharing; cascades from `DA_Project__c` | Field is mandatory; cannot define `<fieldPermissions>` in permset | Cascade authorization via Run -> Project | `objects/DA_Graph_Chunk__c/fields/DA_Analysis_Run__c.field-meta.xml:5`, `objects/DA_Graph_Chunk__c/DA_Graph_Chunk__c.object-meta.xml:10` | Graph chunks cannot be leaked independently. User without project access cannot read chunks. |
| `DA_Analysis_Run__c` | `DA_Finding__c` | `DA_Analysis_Run__c` | **Master-Detail** | **YES** (`ControlledByParent`) | Inherits `DA_Analysis_Run__c` sharing; cascades from `DA_Project__c` | Field is mandatory; cannot define `<fieldPermissions>` in permset | `DAGraphController.updateFindingStatus` user mode check | `objects/DA_Finding__c/fields/DA_Analysis_Run__c.field-meta.xml:12`, `objects/DA_Finding__c/DA_Finding__c.object-meta.xml:10` | Findings are strictly isolated to users authorized on the parent project. |
| `DA_Project__c` | `DA_Annotation__c` | `Project__c` | **Master-Detail** | **YES** (`ControlledByParent`) | Inherits `DA_Project__c` sharing directly | Field is mandatory; cannot define `<fieldPermissions>` in permset | Project membership validation in `DAAnnotationController` | `objects/DA_Annotation__c/fields/Project__c.field-meta.xml:5`, `objects/DA_Annotation__c/DA_Annotation__c.object-meta.xml:10` | Project-level annotations automatically respect project private OWD boundaries. |
| `DA_Finding__c` | `DA_Annotation__c` | `Finding__c` | **Lookup** | **NO** (Secondary Reference) | Pure reference lookup; sharing governed by master `Project__c` field | Field is optional; FLS granted in `DA_Architecture_Analyst` | Validated in Apex to ensure finding belongs to same project | `objects/DA_Annotation__c/fields/Finding__c.field-meta.xml:5` | Lookup link to finding cannot be used to bypass project authorization because master `Project__c` dominates access. |
| `DA_Project__c` | `DA_User_Preference__c`| `Project__c` | **Lookup** | **NO** (`Private`) | Object OWD is `Private`; record owned by individual user (`User__c`) | Object has independent sharing; user-scoped preferences | `DAUserPreferenceController` queries filter by `User__c = :UserInfo.getUserId()` | `objects/DA_User_Preference__c/fields/Project__c.field-meta.xml:5`, `objects/DA_User_Preference__c/DA_User_Preference__c.object-meta.xml:10` | User preferences are personal. Cross-user access is blocked by Private OWD and Apex filter. |

### 2.2 Security Implementation Rules
1. **Inherited Parent Access**: Child objects `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, and `DA_Annotation__c` inherit access directly from `DA_Project__c`. Therefore, multi-tenant row-level sharing rules, group memberships, and emergency grants reside **strictly on `DA_Project__c`**.
2. **Lookup Child Strategy (`DA_User_Preference__c`)**: Because user preferences are in a Lookup relationship and marked `Private` OWD, queries must filter by `User__c = :UserInfo.getUserId()` and enforce `WITH USER_MODE`.
3. **Lookup Field Validation (`DA_Annotation__c.Finding__c`)**: When creating an annotation linked to a finding via lookup, Apex must verify that `Finding__r.DA_Analysis_Run__r.DA_Project__c == Annotation.Project__c` to prevent cross-project metadata references.

---

## 3. Correction B: Emergency Security Recovery Expiry & Audit Integrity

### 3.1 Strict Ban on Broad Privilege Escalation
- Applying `<viewAllRecords>true</viewAllRecords>` to permission sets or reverting `DA_Project__c` OWD to `ReadWrite` is permanently banned.
- Emergency access is strictly project-scoped via explicit `DA_Project__Share` records (`RowCause = 'Manual'`).

### 3.2 Six Distinct Dimensions of Emergency Security & Revocation Enforcement
1. **Authorization-Time Dynamic Validation (Independent of Share-Row State)**:
   - Deleting a `DA_Project__Share` row alone is **insufficient** to establish that an emergency access grant has been revoked across protected operations; a stale or lingering share row must never grant authorization.
   - Every protected operation must invoke `DAProjectSecurityService.validateProjectAccess(projectId, userId, requiredScope)` to evaluate all 7 mandatory authorization rules:
     1. The grant exists in `DA_Emergency_Access_Grant__c`.
     2. The grant belongs to the expected user (`User__c = :userId`).
     3. The grant covers the requested project (`Project__c = :projectId`).
     4. The grant is active (`Is_Active__c = TRUE`).
     5. The current time is before the grant expiry (`Expires_At__c > :currentDatetime`).
     6. No explicit revocation exists (`Revoked__c = FALSE`).
     7. The requesting operation is within the grant's authorized scope (`Scope__c = :requiredScope` or includes requested action).
   - **Apex Bind Variable Detail**: Apex authorization queries must declare and bind a local `Datetime currentDatetime = Datetime.now();` variable rather than relying on inline method calls inside SOQL bind expressions:
     ```apex
     Datetime currentDatetime = Datetime.now();
     List<DA_Emergency_Access_Grant__c> validGrants = [
         SELECT Id, Scope__c, Expires_At__c, Revoked__c, Is_Active__c
         FROM DA_Emergency_Access_Grant__c
         WHERE Project__c = :projectId
           AND User__c = :userId
           AND Is_Active__c = TRUE
           AND Revoked__c = FALSE
           AND Expires_At__c > :currentDatetime
         WITH USER_MODE
         LIMIT 1
     ];
     ```
   - The authorization path **rejects expired or revoked grants immediately even if an associated `DA_Project__Share` row remains present**.

2. **Transaction-Safe Revocation Sequence**:
   To prevent race conditions where stale shares or intermediate failures grant unauthorized access, explicit revocation must execute in exact transaction-safe order:
   - **Step 1**: Record the revocation event in `DA_Security_Audit_Log__c` (capturing actor, target project, target user, timestamp, correlation ID).
   - **Step 2**: Mark the grant record as revoked and inactive (`Revoked__c = TRUE`, `Revoked_At__c = currentDatetime`, `Is_Active__c = FALSE`).
   - **Step 3**: Commit the grant status update so that any runtime authorization check in concurrent or subsequent transactions rejects immediately fail-closed.
   - **Step 4**: Remove associated sharing records (`DA_Project__Share` where `ParentId = :projectId AND UserOrGroupId = :userId AND RowCause = 'Manual'`) as supplementary cleanup.
   - **Step 5**: Preserve complete audit evidence in immutable audit logs.
   - **Step 6**: Record cleanup failures (e.g., share deletion locks or timeouts) in `DA_Security_Audit_Log__c` without restoring access. Failed share cleanup does not alter the fact that authorization checks reject revoked grants.

3. **Scheduled Cleanup (Supplementary Garbage Collection)**:
   - A scheduled Apex job (`DAEmergencyAccessCleanupService.cls`) runs periodically to delete physical `DA_Project__Share` rows associated with expired grants.
   - Delay, retry, or failure of the scheduled job **does not extend access**, because runtime authorization checks reject expired leases fail-closed dynamically.

4. **Audit Immutability & Protection Controls**:
   - Audit logs are persisted in `DA_Security_Audit_Log__c`.
   - **Object Permissions**: In permission sets and profiles, `Delete` and `Edit` permissions are completely omitted on `DA_Security_Audit_Log__c` for all non-admin users.
   - **Apex Append-Only Enforcement**: The trigger `DASecurityAuditLogTrigger.trigger` aborts on `BEFORE UPDATE` and `BEFORE DELETE` with:
     `log.addError('DA_AUDIT_IMMUTABLE: Security audit log entries cannot be modified or deleted.');`
   - **Platform Event Mirroring**: Audit events publish a high-volume platform event `DA_Security_Audit_Event__e` enabling external SIEM ingestion and off-platform archival.

5. **Mandatory Security Test Specifications**:
   The security test suite in `DAGraphSecurityTest.cls` and `DASchemaAndSecurityTest.cls` must assert:
   - Active, unexpired grant permits authorized operation.
   - Expired grant (`Expires_At__c <= Datetime.now()`) is rejected fail-closed.
   - Revoked grant (`Revoked__c = TRUE`) is rejected immediately.
   - Stale `DA_Project__Share` row does NOT restore authorization when grant is revoked or expired.
   - Failed share cleanup does NOT restore authorization.
   - Revocation operation is strictly idempotent (repeated calls succeed and do not corrupt state).
   - Repeated revocation does not corrupt audit history.
   - Unauthorized user cannot revoke another user's grant (enforces permission check).
   - Grant renewal does not bypass revocation (expired/revoked grants require fresh dual-approval).
   - Cross-project grant reuse is rejected fail-closed.

6. **Administrative Controls & Failure Handling**:
   - Failed cleanup jobs log an alert to the platform monitoring channel and audit log.
   - Expired grants can never be silently renewed; a new formal request and approval are required.

---

## 4. Correction E: Concurrency Testing Architecture and Ownership Separation

### 4.1 Distinct Ownership Across Test Disciplines

| Test Discipline | Responsible Owner | Scope & Authority |
|---|---|---|
| Ingestion lifecycle behavior & test-case definition | **Agent 2** | Defines expected state machine transitions and uniqueness invariants |
| REST transport behavior & test-case definition | **Agent 3** | Defines HTTP request/response DTO schemas, status codes, and error formats |
| Shared test harness & runner files | **Agent 10** | Develops, maintains, and executes shared test harnesses in `scratch/salesforce-poc/tests/` |
| Execution evidence & reproducible logs | **Agent 10** | Generates verified execution logs and test outcome reports |
| Implementation diagnostic evidence | **Implementation Agents (1-8B)** | Run local diagnostic checks on their assigned code |
| Joint Task Acceptance | **Workstream Lead + D1** | Formally accepts completed deliverables against specifications |
| Independent Verification | **D2 (Independent Verifier)** | Conducts read-only inspection of implementation and test evidence |
| Milestone Ratification | **Project Owner** | Grants executive ratification of completed waves |

### 4.2 Decoupled Concurrency Test Categories
1. **Apex Sequential Unit Tests (Single-Threaded)**:
   - Validates service logic, database constraints (`Chunk_Key__c` unique index), state transitions, validation rules, and error handling.
   - *Limitation*: Sequential Apex tests execute in isolated transactions and cannot simulate real database lock contention or multi-connection racing.
2. **External HTTP Concurrency Tests (Multi-Threaded)**:
   - Implemented in Node.js by Agent 10 to simulate simultaneous HTTP connections.
   - Targets: Parallel batch uploads for same Run ID, duplicate chunk collisions, conflicting retry payloads, and concurrent finalization requests.
   - **Strict Governance Mandate**: External concurrency tests require execution against an active Salesforce test org. In the absence of an authorized live org, test runners must be marked `PREPARED / OFFLINE ONLY — BLOCKED ON LIVE ORG EXECUTION`. No claim of concurrency safety may be based solely on sequential Apex unit tests.

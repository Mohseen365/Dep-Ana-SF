# Technical Design: Finding Review Persistence (Agent 6)

## Document Information
- **Author / Implementation Owner**: Agent 6
- **Workstream**: Persistent Workflows & Core Analytical Views (WS-D / WS-3)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Authorization Context**: Project Owner Approved Directive (`PO-DEC-V2-05`), GAP-WKF-01 Resolution
- **Target Deliverable**: `GROUP_A_AGENT_6_FINDING_PERSISTENCE_DESIGN.md`

---

## 1. Executive Summary & Objective

Prior to this implementation, finding review states (`OPEN`, `IN_REVIEW`, `RESOLVED`) in the Dependency Analyzer Lightning Web Component `daFindingsView` were held purely in-memory in a JavaScript object (`reviewStatuses = {}`). When an architecture analyst switched views or reloaded the browser tab, all review triage progress, annotations, and suppression decisions were permanently lost (tracked in the Authoritative Migration Gap Register V2 as **`GAP-WKF-01`**).

The objective of Agent 6 is to replace this in-memory-only state with robust, auditable, and secure Salesforce persistence on the `DA_Finding__c` custom object and associated controllers, while preserving:
1. Existing finding identity and workflow semantics.
2. Invariant `SELECTION != NAVIGATION` (CONTRACT-06 / CONTRACT-09).
3. Backward-compatible offline / unauthenticated fallback.
4. Multi-tenant project boundary isolation and security controls (`DAProjectSecurityService.cls`, `SCOPE_FINDING_READ`, `SCOPE_FINDING_WRITE`).
5. Safe concurrent update detection and deterministic state transitions.

---

## 2. Investigation & Existing Architecture Analysis

### 2.1 Existing Salesforce Finding & Annotation Schema
- **`DA_Finding__c`**:
  - `DA_Analysis_Run__c` (`MasterDetail` to `DA_Analysis_Run__c`, cascade delete enabled, write requires master read = false).
  - `Rule_Id__c` (`Text(80)`, required).
  - `Severity__c` (`Picklist`: Critical, Major, Minor, Info, required).
  - `Target_Node_Id__c` (`Text(100)`).
  - `Details__c` (`LongTextArea(32768)`).
  - Sharing Model: `ControlledByParent` (inherits access from `DA_Analysis_Run__c` -> `DA_Project__c`).
- **`DA_Annotation__c`**:
  - `Project__c` (`MasterDetail` to `DA_Project__c`).
  - `Finding__c` (`Lookup` to `DA_Finding__c`).
  - `Node_Id__c` (`Text(255)`, required).
  - `Author__c` (`Text(255)`).
  - `Text__c` (`LongTextArea(32768)`).
  - `Status__c` (`Text(50)`).
  - `Resolved_At__c` (`DateTime`).
- **Conclusion**:
  - `DA_Finding__c` represents the authoritative finding record tied to an analysis run.
  - `DA_Annotation__c` provides supplemental user notes/threads on a finding or node.
  - Adding persistent review status directly to `DA_Finding__c` fulfills `PO-DEC-V2-05` without creating duplicate finding objects or breaking existing relationships.

### 2.2 Finding Identity Reconciled
In `daFindingsView.js`, client-side findings are derived dynamically from four canonical graph analytics categories:
1. **Circular Dependencies**: Derived as `finding-cycle-${idx + 1}` or `finding-cycle-node-${node.id}`.
2. **Untested High-Risk Components**: Derived as `finding-risk-${node.id}`.
3. **Unresolved References**: Derived as `finding-unres-${idx + 1}`.
4. **High-Coupling Hotspots**: Derived as `finding-hotspot-${node.id}`.

When ingested or persisted into Salesforce, each `DA_Finding__c` record possesses:
- A Salesforce 18-character record ID (`Id`).
- An external deterministic identifier matching the client finding identity: **`Finding_Key__c`** (e.g., `finding-risk-ApexClass:AccountController` or `cycle-ApexClass:A->ApexClass:B`).

To guarantee seamless bidirectional reconciliation:
- If a finding already has a persisted Salesforce `Id`, mutations and queries can bind directly via `Id`.
- If a finding was derived client-side and mapped by `Finding_Key__c` (or title/node), queries and updates can resolve or upsert the finding status against the active project's latest run using `Finding_Key__c`.

---

## 3. Review Workflow State Machine & Transition Rules

### 3.1 Allowed States
The allowed review states on `DA_Finding__c.Status__c` are:
1. **`OPEN`** (Default): Newly identified architectural smell or violation; awaiting review.
2. **`IN_REVIEW`**: Active triage or investigation underway by an architecture analyst.
3. **`RESOLVED`**: Addressed, decoupled, or mitigated in code.
4. **`WONT_FIX`**: Accepted technical debt with rationale documented in review notes.

### 3.2 Deterministic Transition Matrix

| From State | Allowed Target States | Disallowed Target States | Required Data / Invariants |
|---|---|---|---|
| `OPEN` | `IN_REVIEW`, `RESOLVED`, `WONT_FIX` | `OPEN` (no-op idempotent) | Caller must have `SCOPE_FINDING_WRITE`. |
| `IN_REVIEW` | `RESOLVED`, `WONT_FIX`, `OPEN` | `IN_REVIEW` (no-op idempotent) | Captures reviewer identity and review timestamp. |
| `RESOLVED` | `OPEN`, `IN_REVIEW` | `RESOLVED` (no-op idempotent), `WONT_FIX` | Reopening clears or updates resolution timestamp. |
| `WONT_FIX` | `OPEN`, `IN_REVIEW` | `WONT_FIX` (no-op idempotent), `RESOLVED` | Reopening sets status to `OPEN` or `IN_REVIEW`. |

Any transition outside this table (or attempt to set an unknown status) is strictly rejected fail-closed with an actionable error.

---

## 4. Metadata Schema Expansion (`PO-DEC-V2-05`)

To support complete workflow auditability and persistence, the following fields are added to `DA_Finding__c`:

1. **`Status__c`** (`Picklist`):
   - Restricted picklist: `OPEN` (default), `IN_REVIEW`, `RESOLVED`, `WONT_FIX`.
2. **`Reviewer__c`** (`Text(255)`):
   - Name / Username of the user executing the review action (`UserInfo.getName()`).
3. **`Reviewed_At__c`** (`DateTime`):
   - Platform timestamp when the review status was last mutated (`System.now()`).
4. **`Review_Notes__c`** (`LongTextArea(32768)`):
   - Contextual review notes, remediation plan, or "won't fix" technical debt justification.
5. **`Finding_Key__c`** (`Text(255)`, `ExternalId` / indexed):
   - Deterministic client-side key for seamless cross-run and client-side correlation.

### 4.1 Permission Set Updates
All 5 fields are added to `DA_Architecture_Analyst.permissionset-meta.xml`:
- `DA_Finding__c.Status__c`: Read/Edit
- `DA_Finding__c.Reviewer__c`: Read/Edit
- `DA_Finding__c.Reviewed_At__c`: Read/Edit
- `DA_Finding__c.Review_Notes__c`: Read/Edit
- `DA_Finding__c.Finding_Key__c`: Read/Edit

---

## 5. Security & Permission Architecture

All database queries and mutations follow the repository's strict security architecture:

1. **Permission Check via `DAProjectSecurityService.cls`**:
   - For retrieval (`getFindingReviewStatuses`): requires `SCOPE_FINDING_READ` (or hierarchical `SCOPE_FINDING_WRITE` / `SCOPE_FULL`).
   - For update (`updateFindingStatus`): requires `SCOPE_FINDING_WRITE` (or hierarchical `SCOPE_FULL`).
   - Unauthenticated or unauthorized callers receive immediate `AuraHandledException('Unauthorized: User lacks required scope...')`.
2. **Project Scoping & Multi-Tenant Isolation**:
   - Every operation accepts `projectId` (Salesforce ID or `Project_Key__c`).
   - `DAGraphController.resolveProject(projectId)` resolves the project under `USER_MODE`.
   - The finding must belong to an analysis run associated with that exact project. Cross-project manipulation is impossible.
3. **Platform Enforcement**:
   - `WITH USER_MODE` on all SOQL queries.
   - `as user` on all DML operations (`insert as user`, `update as user`).

---

## 6. Concurrency & Collision Handling

To handle concurrent reviews in multi-analyst environments:
1. **Optimistic Locking via `LastModifiedDate`**:
   - The client passes `expectedLastModified` (milliseconds timestamp or ISO string) representing the version it last observed.
   - If the database `LastModifiedDate` is newer than `expectedLastModified`, an `AuraHandledException('CONCURRENCY_CONFLICT: The finding status was updated by another analyst...')` is thrown.
   - If `expectedLastModified` is null or matches, the update proceeds.
2. **Deterministic State Invariance**:
   - Idempotent updates (transitioning `OPEN -> OPEN`) succeed safely without duplicate audit entries.
   - Conflicting updates fail-closed to prevent silent overwrites.

---

## 7. Retrieval, Pagination & Failure Recovery

1. **Paginated Status Retrieval**:
   - `getFindingReviewStatuses(String projectId, Integer pageSize, Integer offset)`:
   - Returns a structured DTO/Map containing:
     - `totalCount`: Total findings recorded for this project.
     - `pageSize`, `offset`: Pagination markers.
     - `statuses`: Map of finding ID/key to review metadata `{ status, reviewer, reviewedAt, reviewNotes, lastModifiedDate }`.
2. **Client-Side Optimistic Update with Rollback**:
   - When the user clicks "Mark In Review", "Resolve", or "Reopen", `daFindingsView` immediately updates local reactive UI state for high responsiveness.
   - In parallel, an asynchronous call to `updateFindingStatus` is dispatched.
   - If the Apex call fails (network failure, permission denied, concurrency conflict), the previous status is restored, and an SLDS error toast/banner notifies the user.
3. **Offline / Prototype Graceful Degradation**:
   - If no project ID is configured or the platform is unavailable, `daFindingsView` functions safely with in-memory state, ensuring zero disruption during isolated component testing or mock demonstration.

---

## 8. Verification Strategy

1. **Automated Offline Test Suite** (`scratch/salesforce-poc/tests/run-agent-6-finding-persistence-tests.cjs`):
   - Tests all 11 required capabilities offline using Node.js without requiring live org access.
2. **Existing Test Suite Regression**:
   - Run all 34 existing test suites to ensure 100% pass rate.
   - Hardened assertion updates in `run-b4-security-tests.cjs` to reflect the 5 new custom fields and granted FLS.

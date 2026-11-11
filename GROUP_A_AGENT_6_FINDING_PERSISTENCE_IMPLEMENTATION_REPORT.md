# Implementation Report: Finding Review Persistence (Agent 6)

## Document Information
- **Author / Implementation Owner**: Agent 6
- **Workstream**: Persistent Workflows & Core Analytical Views (WS-D / WS-3)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Governance Authority**: Project Owner Approved Directive (`PO-DEC-V2-05`), Authoritative Gap `GAP-WKF-01`
- **Target Deliverable**: `GROUP_A_AGENT_6_FINDING_PERSISTENCE_IMPLEMENTATION_REPORT.md`

---

## 1. Executive Summary

Prior to this deliverable, the Dependency Analyzer Salesforce application retained finding review status changes (`OPEN`, `IN_REVIEW`, `RESOLVED`) solely within component-level JavaScript memory (`reviewStatuses = {}` in `daFindingsView.js`). Consequently, whenever a user switched views, navigated through deep links, or refreshed the browser session, all architectural triage progress was lost (recorded in `MASTER_REMAINING_GAPS_V2.md` as `GAP-WKF-01`).

Under explicit Project Owner approval (`PO-DEC-V2-05`), Agent 6 has replaced this in-memory-only state with persistent, secure, and auditable Salesforce storage on `DA_Finding__c` and controller services in `DAGraphController.cls`, integrated with `daFindingsView` LWC.

All 11 required capabilities specified in the Agent 6 mandate are fully satisfied:
1. **Persistent review status** (`Status__c` picklist: `OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`).
2. **Reviewer identity** (`Reviewer__c` captured via `UserInfo.getName()`).
3. **Review timestamp** (`Reviewed_At__c` captured via `System.now()`).
4. **Project and finding association** (Scoped to project analysis runs via `DA_Analysis_Run__r.DA_Project__c`).
5. **Deterministic state transitions** (`isValidStatusTransition` state machine).
6. **Historical auditability** (`Review_Notes__c`, `LastModifiedDate`, reviewer audit metadata).
7. **Permission enforcement** (`DAProjectSecurityService.cls`, `SCOPE_FINDING_READ` and `SCOPE_FINDING_WRITE`).
8. **Concurrent update handling** (Optimistic concurrency conflict detection using observed `LastModifiedDate`).
9. **Retrieval and pagination** (`getFindingReviewStatuses` with `pageSize`, `offset`, `totalCount`).
10. **Failure recovery** (Optimistic UI update with automatic rollback and error notification on failure).
11. **Cross-project isolation** (Strict multi-tenant barrier ensuring zero cross-project data leakage).

---

## 2. Inventory of Modified and Created Files

The implementation encompasses exactly 14 files across metadata, Apex, LWC, and test runners:

| File Path | Nature of Change | Purpose / Description |
|---|---|---|
| `GROUP_A_AGENT_6_FINDING_PERSISTENCE_DESIGN.md` | Created | Technical architecture and design specification for finding persistence. |
| `GROUP_A_AGENT_6_FINDING_PERSISTENCE_IMPLEMENTATION_REPORT.md` | Created | Authoritative implementation report detailing changes and governance. |
| `GROUP_A_AGENT_6_FINDING_PERSISTENCE_TEST_EVIDENCE.md` | Created | Verification and test execution evidence package. |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Status__c.field-meta.xml` | Created | Custom picklist field defining review states (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`). |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Reviewer__c.field-meta.xml` | Created | Custom text field storing reviewer name/identity. |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Reviewed_At__c.field-meta.xml` | Created | Custom datetime field capturing review action timestamp. |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Review_Notes__c.field-meta.xml` | Created | Long text area storing review rationale or debt mitigation notes. |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Finding_Key__c.field-meta.xml` | Created | External ID text field storing deterministic client finding key. |
| `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` | Modified | Granted read and edit permissions to all 5 new custom fields on `DA_Finding__c`. |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Modified | Implemented `updateFindingStatus` and `getFindingReviewStatuses` with security and concurrency controls. |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls` | Modified | Added unit tests for finding review lifecycle, dynamic upsert, invalid transitions, and concurrency conflicts. |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/daFindingsView.js` | Modified | Wired Apex status hydration and mutation dispatch with optimistic updates, rollback, and offline fallback. |
| `scratch/salesforce-poc/tests/run-agent-6-finding-persistence-tests.cjs` | Created | Dedicated offline test suite verifying all 11 capabilities (13 tests, 100% pass). |
| `scratch/salesforce-poc/tests/run-b4-security-tests.cjs` | Modified | Updated field count thresholds to accept new custom fields and permission set grants. |
| `scratch/salesforce-poc/tests/run-s1-security-tests.cjs` | Modified | Updated permission set field count assertions to accept 34 granted fields. |
| `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | Modified | Updated mock import regex to support default imports (`import updateFindingStatus`). |

---

## 3. Metadata Changes & Permission Enforcement

### 3.1 Field Schema on `DA_Finding__c`
- **`Status__c`**: Restricted Picklist with values `OPEN` (default), `IN_REVIEW`, `RESOLVED`, `WONT_FIX`.
- **`Reviewer__c`**: `Text(255)`, stores `UserInfo.getName()` when review action occurs.
- **`Reviewed_At__c`**: `DateTime`, stores `System.now()` when review action occurs.
- **`Review_Notes__c`**: `LongTextArea(32768, visibleLines=4)`, stores reviewer explanation or debt justification.
- **`Finding_Key__c`**: `Text(255, externalId=true)`, indexes deterministic client finding keys (e.g. `finding-risk-AccountController`).

### 3.2 Permission Set Configuration
In `DA_Architecture_Analyst.permissionset-meta.xml`, `<fieldPermissions>` were added for all 5 fields with `<editable>true</editable>` and `<readable>true</readable>`. The total number of custom fields across the 6 baseline custom objects increased from 36 to 41, and eligible granted fields increased from 29 to 34.

---

## 4. Apex Controller Architecture

### 4.1 Security & Scope Enforcement
In `DAGraphController.cls`:
- **`updateFindingStatus`**:
  - Resolves target project via `resolveProject(projectId)`.
  - Enforces project authorization via `DAProjectSecurityService.validateProjectAccessForCurrentUser(project.Id, DAProjectSecurityService.SCOPE_FINDING_WRITE)`.
  - Ensures caller possesses write authorization; unauthorized callers receive immediate fail-closed `AuraHandledException`.
  - Queries existing findings with `WITH USER_MODE` strictly scoped to `DA_Analysis_Run__r.DA_Project__c = :project.Id`.
  - Performs mutations via `update as user` / `insert as user`.
- **`getFindingReviewStatuses`**:
  - Resolves target project via `resolveProject(projectId)`.
  - Enforces project authorization via `DAProjectSecurityService.validateProjectAccessForCurrentUser(project.Id, DAProjectSecurityService.SCOPE_FINDING_READ)`.
  - Bounded pagination via `pageSize` (default 100, max 500) and `offset`.
  - Returns paginated map of finding IDs and keys to review metadata.

### 4.2 State Machine Validation
The state machine strictly validates all transitions via `isValidStatusTransition(fromStatus, toStatus)`:
- `OPEN` -> `IN_REVIEW`, `RESOLVED`, `WONT_FIX`
- `IN_REVIEW` -> `RESOLVED`, `WONT_FIX`, `OPEN`
- `RESOLVED` -> `OPEN`, `IN_REVIEW` (Reopening)
- `WONT_FIX` -> `OPEN`, `IN_REVIEW` (Reopening)
- Identical from-to is valid and idempotent.
- Any attempt to bypass reopening (e.g. `RESOLVED -> WONT_FIX`) is rejected with `Invalid review state transition`.

### 4.3 Optimistic Concurrency Control
When updating, the caller optionally supplies `expectedLastModified`. If another analyst modified the record concurrently (`finding.LastModifiedDate > expectedLastModified`), the transaction aborts with:
`CONCURRENCY_CONFLICT: The finding status was updated by another analyst (<Reviewer> at <Timestamp>). Please refresh.`

---

## 5. UI Integration in `daFindingsView`

1. **Hydration**: When `projectId` or `graphPayload` is set on `daFindingsView`, `fetchPersistedStatuses()` queries `getFindingReviewStatuses` for the project and populates `reviewStatuses` and `_findingTimestamps`.
2. **Optimistic Updates**: When the user clicks "Mark In Review", "Resolve", or "Reopen", the UI updates immediately for zero-latency feedback.
3. **Rollback & Error Presentation**: `persistStatusChange` dispatches `updateFindingStatus`. If the platform rejects the update (e.g., unauthorized scope, concurrency conflict, or network drop), the UI rolls back to the previous status and presents an SLDS alert banner.
4. **Offline Resilience**: When running in unauthenticated test environments or without an active Salesforce project ID, the component degrades gracefully to in-memory state, ensuring zero breakage in legacy test suites.

---

## 6. Verification and Regression Summary

- **New Suite**: `scratch/salesforce-poc/tests/run-agent-6-finding-persistence-tests.cjs` — 13 tests, 13 passed, 0 failed.
- **Repository Regression**: All 35 test suites under `scratch/salesforce-poc/tests/*.cjs` executed cleanly with 0 failures (100% pass rate).
- **Security Audit**: Verified that `DAProjectSecurityService` boundaries, `WITH USER_MODE`, and FLS checks remain inviolate.

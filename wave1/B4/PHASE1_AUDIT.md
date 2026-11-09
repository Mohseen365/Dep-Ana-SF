# Phase 1 Independent Security Audit Report

**Auditor:** Agent B4 — Security Remediation Engineer
**Role:** Security Remediation Engineer (Phase 1: Strictly Read-Only)
**Execution Timestamp:** 2026-11-09
**Repository Baseline Commit:** `570f658bc929d61f0909ff4d516f3d97e5327be0`
**Status Vocabulary Standard:** IMPLEMENTED / INTEGRATED / INDEPENDENTLY VERIFIED / FORMALLY ACCEPTED / PRODUCTION READY
**Evidence Standard:** MEASURED / ESTIMATED / MOCKED

---

## 1. Finding 1 [P0]: Permission Set & FLS Coverage Audit

### 1.1 Original 15 Fields Enumeration & FLS Compatibility Analysis
Original finding SEC-01 reported 15 custom fields lacking `<fieldPermissions>` in `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml`.

In Salesforce metadata architecture:
1. **Master-Detail Relationship fields** (`<type>MasterDetail</type>`) cannot carry `<fieldPermissions>` in permission sets or profiles because security is inherited from the master object. Including `<fieldPermissions>` for a MasterDetail field produces a deployment error: `Field ... is a Master-Detail field and cannot have field-level security`.
2. **Required Custom Fields** (`<required>true</required>`) cannot carry `<fieldPermissions>` in permission sets or profiles because required fields are automatically readable and editable by all users having object access. Including `<fieldPermissions>` for a required custom field is disallowed or invalid in standard Salesforce metadata deployments.

Below is the verified audit of the original 15 fields:

| # | Object | Field API Name | Field Type | Required? | Master-Detail? | FLS Permitted? | In PermSet? | Analysis & Justification |
| :-: | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `DA_User_Preference__c` | `Active_Layout_Mode__c` | Text(50) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 2 | `DA_User_Preference__c` | `Active_View_Mode__c` | Text(50) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 3 | `DA_User_Preference__c` | `Filters_JSON__c` | LongTextArea(131072) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 4 | `DA_User_Preference__c` | `Positions_JSON__c` | LongTextArea(131072) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 5 | `DA_User_Preference__c` | `Preference_Key__c` | Text(255) | **Yes** | No | **NO** | **Absent** | **Excluded from FLS**: Required custom field (`<required>true</required>`). Cannot carry FLS in metadata. |
| 6 | `DA_User_Preference__c` | `Project__c` | Lookup(DA_Project__c) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 7 | `DA_User_Preference__c` | `User__c` | Lookup(User) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 8 | `DA_User_Preference__c` | `Zoom_Pan_JSON__c` | LongTextArea(131072) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 9 | `DA_Annotation__c` | `Author__c` | Text(255) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 10 | `DA_Annotation__c` | `Finding__c` | Lookup(DA_Finding__c) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 11 | `DA_Annotation__c` | `Node_Id__c` | Text(255) | **Yes** | No | **NO** | **Absent** | **Excluded from FLS**: Required custom field (`<required>true</required>`). Cannot carry FLS in metadata. |
| 12 | `DA_Annotation__c` | `Project__c` | MasterDetail | No | **Yes** | **NO** | **Absent** | **Excluded from FLS**: Master-Detail field (`<type>MasterDetail</type>`). Cannot carry FLS in metadata. |
| 13 | `DA_Annotation__c` | `Resolved_At__c` | DateTime | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 14 | `DA_Annotation__c` | `Status__c` | Text(50) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |
| 15 | `DA_Annotation__c` | `Text__c` | LongTextArea(32768) | No | No | **YES** | **Absent** | Missing FLS. Non-admin SOQL fails in `USER_MODE`. |

### 1.2 Git History Inspection for Permission Sets
- Command: `git log -p -- scratch/salesforce-poc/force-app/main/default/permissionsets/`
- Result: **0 changes** since initial commit `50ecec85d8233d0da430ae849414c780832e13cd` ("feat(migration): implement P0 foundation schema, permissions, and test suites").
- Retest Claim in `REMEDIATION_RETEST_EVIDENCE.md`: The document claimed SEC-01 was pending workstream remediation and confirmed defect. Static inspection confirms the permission set was **never updated**.

### 1.3 Full Custom Field Inventory Across Objects (35 Total Fields)
A full parse of all XML definitions in `scratch/salesforce-poc/force-app/main/default/objects/*/fields/*.field-meta.xml` reveals:
- Total Custom Fields across all 6 objects: **35 fields**
- Master-Detail fields (cannot have FLS): **5 fields**
  - `DA_Analysis_Run__c.DA_Project__c`
  - `DA_Annotation__c.Project__c`
  - `DA_Finding__c.DA_Analysis_Run__c`
  - `DA_Graph_Chunk__c.DA_Analysis_Run__c`
  - `DA_Finding__c.DA_Analysis_Run__c`
- Required non-Master-Detail fields (cannot have FLS): **5 fields**
  - `DA_Annotation__c.Node_Id__c`
  - `DA_User_Preference__c.Preference_Key__c`
  - `DA_Finding__c.Rule_Id__c` (Present in perm set, but technically prohibited in strict metadata)
  - `DA_Finding__c.Severity__c` (Present in perm set, but technically prohibited in strict metadata)
  - `DA_Graph_Chunk__c.Chunk_Index__c` (Present in perm set, but technically prohibited in strict metadata)
  - `DA_Project__c.Project_Key__c` (Present in perm set, but technically prohibited in strict metadata)
- Fields legitimately eligible for FLS: **25 fields**
- Fields currently granted FLS in `DA_Architecture_Analyst.permissionset-meta.xml`: **17 fields** (including 4 required fields)
- **Net Missing FLS Gaps (Legitimately requiring FLS addition): 12 fields**
  1. `DA_User_Preference__c.Active_Layout_Mode__c`
  2. `DA_User_Preference__c.Active_View_Mode__c`
  3. `DA_User_Preference__c.Filters_JSON__c`
  4. `DA_User_Preference__c.Positions_JSON__c`
  5. `DA_User_Preference__c.Project__c`
  6. `DA_User_Preference__c.User__c`
  7. `DA_User_Preference__c.Zoom_Pan_JSON__c`
  8. `DA_Annotation__c.Author__c`
  9. `DA_Annotation__c.Finding__c`
  10. `DA_Annotation__c.Resolved_At__c`
  11. `DA_Annotation__c.Status__c`
  12. `DA_Annotation__c.Text__c`

---

## 2. Finding 2 [P1]: BroadcastChannel & IPC Mechanism Audit

### 2.1 Codebase Survey for IPC
- A repository-wide regex search across `scratch/salesforce-poc/force-app/main/default/lwc/` for `BroadcastChannel`, `postMessage`, and `window.addEventListener('message')` confirms:
  - **Single IPC Implementation**: Only `daInvestigationDrawer` (`scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js`) utilizes cross-context messaging.
  - **Mechanism Used**: Native browser `BroadcastChannel` with channel name `'da_investigation_channel'`.
  - **Window postMessage**: **NOT USED** anywhere in the LWC components. `window.open` is invoked in `handleDetach()` to spawn an auxiliary window, but message passing occurs strictly via `BroadcastChannel`.

### 2.2 BroadcastChannel Security Deficiencies
Inspection of `daInvestigationDrawer.js` lines 31–48 and 350–395 confirms:
1. **Missing Origin/Source Checks**: As noted, `BroadcastChannel` does not transmit origin or window reference because it is inherently restricted to same-origin contexts. However, it transmits across all tabs, frames, and windows of that origin.
2. **Missing Project Context Filtering**: In `handleBroadcastMessage(data)`:
   ```javascript
   handleBroadcastMessage(data) {
       if (!data || typeof data !== 'object') return;
       if (data.type === 'DRAWER_SELECT_NODE' && data.nodeId) {
           this.handleNeighborSelection(data.nodeId);
       } else if (data.type === 'DRAWER_TOGGLE_PIN') {
           this.handleTogglePin();
       }
   }
   ```
   The handler processes incoming node selections and pin toggles **without validating `data.projectId` against `this.projectId`**.
   - If Tab 1 has Project A open and Tab 2 has Project B open, broadcasting a node selection from Tab 1 mutates Tab 2's drawer state, leading to cross-project data corruption and potential unauthorized data disclosure in the UI.
3. **Missing Message Schema / Type Allowlist**: The incoming message payload is minimally checked (`typeof data !== 'object'`), but lacks schema conformance validation.
4. **Missing Sender-Instance Echo Suppression**: Outbound messages do not include a unique sender instance UUID or timestamp. While `BroadcastChannel` specifications state that the sending channel instance does not receive its own messages, any other drawer component in the same tab or across tabs responds indiscriminately without echo suppression.
5. **Channel Name Scoping**: The channel name `'da_investigation_channel'` is statically hardcoded rather than scoped to project or session context.
6. **Error Handling**: Missing silent error counters/logging.

### 2.3 Lightning Web Security (LWS) Evaluation
- **LWS Compatibility**: Under Salesforce Lightning Web Security (LWS), `BroadcastChannel` is subject to distortion and sandboxing. In standard Salesforce environments with LWS enabled, `BroadcastChannel` communication between distinct browser tabs or sandboxed iframes can be blocked or isolated to prevent cross-namespace communication.
- **Verification Qualification**: **Unverified without a browser/org**. Offline unit tests with mocked `BroadcastChannel` do not prove runtime execution under LWS in a live Salesforce org.

---

## 3. Comprehensive Apex Security Audit

### 3.1 Class Sharing Declarations
Every Apex class in `scratch/salesforce-poc/force-app/main/default/classes/` was inspected:
- `DAAnnotationController.cls`: `public with sharing class` (Correct)
- `DAAnalysisHistoryController.cls`: `public with sharing class` (Correct)
- `DAGraphController.cls`: `public with sharing class` (Correct)
- `DAUserPreferenceController.cls`: `public with sharing class` (Correct)
- `DAGraphChunkService.cls`: `public with sharing class` (Correct)
- `DAAnalysisHistoryService.cls`: `public with sharing class` (Correct)
- `DAGraphIngestionService.cls`: `public with sharing class` (Correct)
- `GraphDataController.cls`: `public with sharing class` (Stub/prototype class)
- `DAAnalysisRunDTO.cls`: `public with sharing class` (Correct)
- `DAErrorResponse.cls`: `public inherited sharing class` (Correct for DTO)
- `DAGraphDTO.cls`: `public inherited sharing class` (Correct for DTO)
- **Result**: Zero classes declare `without sharing` or omit sharing keywords.

### 3.2 SOQL Enforcement (`WITH USER_MODE`)
- 33 SOQL queries across production controllers and services were audited.
- **Enforcement Rate**: **100% of production SOQL queries specify `WITH USER_MODE`**.
- Project/Run Isolation:
  - `DAGraphController.getGraphData`: Enforces project filtering via `DA_Project__c = :proj.Id` and queries `DA_Graph_Chunk__c` filtering by `DA_Analysis_Run__c = :latestRun.Id`.
  - `DAAnnotationController`: Enforces `Project__c = :projectId` on all read and query methods.
  - `DAUserPreferenceController`: Enforces `User__c = :UserInfo.getUserId()` and `Project__c = :projId` on preference queries.

### 3.3 DML Operations & CRUD Verification
- Controllers enforce CRUD through `as user` DML clauses:
  - `DAUserPreferenceController`:
    - `insert as user pref;`
    - `update as user pref;`
  - `DAAnnotationController`:
    - `insert as user newAnnotation;`
    - `update as user target;`
    - `delete as user target;`
  - `DAGraphIngestionService`:
    - `insert as user run;`
    - `insert as user chunks;`
    - `update as user run;`
- **Result**: DML operations execute under user security contexts with platform FLS/CRUD enforcement.

### 3.4 Ingestion Boundary Integrity
Inspected `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`:
- **Chunk Size Cap**: Strictly asserts `chunk.length() <= 131072` (LongTextArea capacity):
  ```apex
  if (chunk.length() > MAX_CHUNK_SIZE) {
      throw new AuraHandledException('Chunk payload exceeds maximum size limit of ' + MAX_CHUNK_SIZE + ' characters.');
  }
  ```
- **Total Payload Cap**: Strictly asserts aggregate size `run.Total_Payload_Size_Chars__c <= 10485760` (10 MB cap):
  ```apex
  if (run.Total_Payload_Size_Chars__c > MAX_TOTAL_PAYLOAD_SIZE) {
      throw new AuraHandledException('Total payload size exceeds maximum limit of ' + MAX_TOTAL_PAYLOAD_SIZE + ' characters.');
  }
  ```
- **Chunk Sequencing & Rejection**:
  - Validates `chunkIndex >= 0 && chunkIndex < totalChunks`.
  - Validates contiguous indexing and prevents gaps or out-of-order commits.
  - Transitions `Status__c` from `'INGESTING'` to `'AVAILABLE'` only when `COUNT(chunks) == Total_Chunks__c`.

---

## 4. DOM Injection & Client-Side XSS Audit

Audited all LWC HTML templates for `innerHTML`, `lwc:dom="manual"`, `eval`, and dynamic URLs:
- `innerHTML`: **Zero instances** in any LWC component.
- `eval()`: **Zero instances** across all LWC controllers.
- `lwc:dom="manual"`: Found in 2 locations:
  1. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html:85`:
     `<div class="cy-container" lwc:dom="manual"></div>`
     Used exclusively as the mount root for Cytoscape.js canvas rendering. Verified: No untrusted text or HTML strings are injected via DOM APIs.
  2. `scratch/salesforce-poc/force-app/main/default/lwc/graphViewer/graphViewer.html:16`:
     `<div class="graph-container" lwc:dom="manual"></div>`
     Prototype component; no dynamic HTML string injection.
- Dynamic URLs / `javascript:`:
  - Several templates use `href="javascript:void(0);"` for tab switching links (standard SLDS pattern). No user input is bound to `href` attributes.

---

## 5. Security Review of Quarantined Wave 9 Code (Read-Only)

Quarantined components in `scratch/salesforce-poc/force-app/main/default/lwc/`:
1. `daRefactoringEngine/daRefactoringEngine.js`:
   - Pure client-side topological graph algorithms (Tarjan SCC, cycle severing, node deletion).
   - No DOM manipulation, no IPC, no server-side Apex calls, no `eval()`.
   - Security Posture: Benign pure-math module, but correctly quarantined under DEC-04 Alternative 4 due to lack of executive scope authorization.
2. `daRefactorHandoffModal/daRefactorHandoffModal.js`:
   - Generates refactoring plan export strings (Markdown / JSON).
   - Uses standard Lightning modal components.
   - Does not perform network calls or IPC.

---

## 6. Summary of Phase 1 Audit Findings & Status

| Finding ID | Severity | Category | Description | Phase 1 Status |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **P0** | Metadata / FLS | 12 eligible custom fields lack FLS in `DA_Architecture_Analyst.permissionset-meta.xml`. 3 fields are excluded because required/MasterDetail fields cannot carry FLS. | **CONFIRMED DEFECT** (STATICALLY MEASURED) |
| **SEC-02** | **P1** | LWC / IPC | `daInvestigationDrawer` uses unvalidated, unscoped `BroadcastChannel` without `projectId` context verification or schema allowlist. | **CONFIRMED DEFECT** (STATICALLY MEASURED) |
| **SEC-03** | **P2** | Apex / Code Hygiene | `GraphDataController.cls` is an unauthenticated legacy stub returning mock data. | **POTENTIAL RISK** |
| **SEC-04** | **P2** | Apex / Error Handling| `DAAnalysisHistoryController.cls` concatenates raw exception message into user-facing `AuraHandledException`. | **POTENTIAL RISK** |

*Note on Phase 2 Write Permission:* As per instructions, Phase 2 modifications are permitted ONLY on paths assigned by B1 in `REMAINING_WORK_FILE_OWNERSHIP.csv`. Because `REMAINING_WORK_FILE_OWNERSHIP.csv` has not yet been published by Agent B1, Phase 2 edits are paused and pending path assignment.

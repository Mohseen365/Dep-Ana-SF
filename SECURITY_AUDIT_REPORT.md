# Independent Security Audit Report

**Audit Conducted By**: Jules Agent 8 — Independent Security, Performance and Platform Verification
**Audit Date**: November 9, 2026
**Starting Commit**: `c23bfe9c6a444c19bbffc26eb2dae86a48be3e19`
**Execution Environment**: Jules Containerized Linux Sandbox (Node.js v22.22.1)
**Scope**: Apex Controllers, Services, DTOs, Custom Object Metadata, Permission Sets, Lightning Web Components, and Cross-Window Communication Architecture.

---

## 1. Executive Summary

This independent security evaluation examined the Salesforce artifact repository (`scratch/salesforce-poc/`) resulting from the six parallel implementation workstreams (WS-1 through WS-6).

While the implementation exhibits strong foundational architectural discipline—notably adhering to `with sharing`, utilizing `WITH USER_MODE` across key SOQL queries, maintaining the `SELECTION != NAVIGATION` invariant, and enforcing client-side chunk reassembly—critical platform security gaps and authorization omissions were identified.

### High-Level Verdict: `SECURITY_AND_PERFORMANCE_PARTIALLY_VERIFIED`

- **Salesforce Authorization & Sharing**: Foundational controllers enforce `with sharing` and `WITH USER_MODE`. However, `DA_Architecture_Analyst.permissionset-meta.xml` completely lacks Field-Level Security (FLS) permissions for custom fields on `DA_User_Preference__c` and `DA_Annotation__c`. If deployed to a live Salesforce org with standard users, all preference and annotation queries executing `WITH USER_MODE` or DML `as user` will fail with runtime `System.QueryException` or `System.DmlException`.
- **Project & Record Isolation**: Two-step project resolution (Salesforce record ID first, followed by `Project_Key__c` fallback) successfully prevents ID spoofing and cross-project data leakage in `DAGraphController`, `DAAnalysisHistoryService`, `DAUserPreferenceController`, and `DAAnnotationController`.
- **Payload Integrity & Chunk Reassembly**: Ingestion limits are rigorously specified (`131,072` chars per chunk, `10,485,760` bytes total payload cap, `10` chunks per call). UTF-16 surrogate pairs are protected at chunk boundaries. Client-side reassembly avoids server-side heap exhaustion.
- **Client-Side Security & IPC**: No uses of `eval()`, `new Function()`, or unescaped `innerHTML` were detected in production LWC paths. However, cross-window IPC in `daInvestigationDrawer` utilizes `BroadcastChannel` without validating message origin, sender identity, or project context, introducing cross-tab message injection vulnerabilities. Additionally, legacy mock controller `GraphDataController.cls` remains in the codebase with hardcoded dummy nodes.

---

## 2. In-Depth Security Domain Analysis

### 2.1 Salesforce Authorization & CRUD/FLS Verification

#### Apex Controllers & Services Audit
1. `DAGraphController.cls`:
   - Enforces `public with sharing class`.
   - Uses `WITH USER_MODE` for all SOQL queries on `DA_Project__c`, `DA_Analysis_Run__c`, and `DA_Graph_Chunk__c`.
   - Properly binds variables (`:projectId`, `:runId`, `:startIndex`, `:endIndex`) preventing SOQL injection.
   - Deprecated method `getLatestGraphForProject` maintains `WITH USER_MODE`.
2. `DAAnalysisHistoryController.cls` & `DAAnalysisHistoryService.cls`:
   - Enforces `public with sharing class`.
   - Queries `DA_Project__c` and `DA_Analysis_Run__c` with `WITH USER_MODE`.
   - Applies compound ordering (`Run_Timestamp__c DESC, Id DESC`) and enforces query limit ceilings (`Math.min(queryLimit, MAX_LIMIT)` where `MAX_LIMIT = 100`).
3. `DAUserPreferenceController.cls`:
   - Enforces `public with sharing class`.
   - Uses `WITH USER_MODE` on query operations and executes `upsert as user prefRecord Preference_Key__c`.
   - Enforces user isolation by scoping preference queries to `User__c = :currentUserId OR CreatedById = :currentUserId`.
4. `DAAnnotationController.cls`:
   - Enforces `public with sharing class`.
   - Executes queries with `WITH USER_MODE` and DML operations via `insert as user`, `update as user`, and `delete as user`.
   - Validates node ID, text lengths, and title lengths prior to DML.
5. `DAGraphIngestionService.cls`:
   - Enforces `public with sharing class`.
   - Performs `insert as user` and `update as user`.
   - Enforces chunk size boundaries (`<= 131072`), batch sizes (`<= 10`), and validates run/project matching.
6. `GraphDataController.cls`:
   - Declared `with sharing`, but returns hardcoded stub data and lacks `WITH USER_MODE` or project isolation. It represents an obsolete prototype artifact.

#### Permission Set Metadata Deficiencies (P0 Blocker)
Inspection of `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` reveals:
- Object permissions are granted for:
  - `DA_Project__c` (Read, Create, Edit)
  - `DA_Analysis_Run__c` (Read, Create, Edit)
  - `DA_Graph_Chunk__c` (Read, Create, Edit)
  - `DA_Finding__c` (Read, Create, Edit)
  - `DA_Annotation__c` (Read, Create, Edit, Delete)
  - `DA_User_Preference__c` (Read, Create, Edit, Delete)
- Field permissions are defined **only** for:
  - `DA_Project__c` (`Repository_Url__c`, `Status__c`, `Project_Key__c`)
  - `DA_Analysis_Run__c` (`Commit_Hash__c`, `Run_Timestamp__c`, `Status__c`, `Node_Count__c`, `Edge_Count__c`, `Cyclic_SCC_Count__c`, `Total_Chunks__c`, `Total_Payload_Size_Chars__c`)
  - `DA_Graph_Chunk__c` (`Chunk_Index__c`, `Payload_Data__c`)
  - `DA_Finding__c` (`Rule_Id__c`, `Severity__c`, `Target_Node_Id__c`, `Details__c`)
- **CRITICAL GAP (SEC-01 / P0)**: Zero field permissions are defined for custom fields on `DA_User_Preference__c` (`Active_View_Mode__c`, `Active_Layout_Mode__c`, `Positions_JSON__c`, `Filters_JSON__c`, `Zoom_Pan_JSON__c`, `Preference_Key__c`, `Project__c`, `User__c`) and `DA_Annotation__c` (`Status__c`, `Node_Id__c`, `Finding__c`, `Text__c`, `Author__c`, `Project__c`, `Resolved_At__c`).
- In Salesforce, SOQL executed `WITH USER_MODE` or DML executed `as user` strictly enforces FLS. Because the permission set grants 0 field permissions on these two objects, any standard user assigned this permission set will immediately encounter `System.QueryException` ("No such column on entity...") and `System.DmlException`.

---

### 2.2 Project and Analysis Isolation Verification

1. **Two-Step Project Resolution**:
   - Both `DAGraphController` and `DAAnalysisHistoryService` implement strict resolution:
     ```apex
     if (isValidId(projectIdOrKey)) {
         // Query by Id
     }
     // Fall back to Project_Key__c only if Id query returns 0 rows or is not a valid 15/18-char Id
     ```
   - This eliminates ID/Key collision vulnerabilities and ensures callers cannot supply another project's key to access private record IDs.
2. **Analysis Run Isolation**:
   - In `DAGraphController.getGraphChunks(runId, startIndex, maxChunks, projectId)`, the run is explicitly verified against the project context:
     ```apex
     WHERE Id = :runId AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)
     ```
   - Chunks cannot be traversed across project boundaries.
3. **Preference Isolation**:
   - `DAUserPreferenceController` compounds the preference key as `UserInfo.getUserId() + ':' + targetProject.Id`.
   - Queries enforce `WHERE (User__c = :currentUserId OR CreatedById = :currentUserId) AND Project__c = :projectId`.
   - Cross-project or cross-user preference leakage is prevented.
4. **Annotation Scoping**:
   - `DAAnnotationController` explicitly scopes annotations by `Project__c` (or `Project__r.Project_Key__c`).
   - Annotations cannot be retrieved or mutated outside their parent project.

---

### 2.3 Graph Payload Integrity & Boundary Verification

1. **Client-Side Reassembly Invariant**:
   - `daGraphPayloadLoader.js`, `daGraphViewer.js`, and `daAppShell.js` implement client-side chunk reassembly using pure JavaScript array joining.
   - Apex `DAGraphChunkService.reassembleChunks` exists as a utility but is NOT called during standard AuraEnabled payload retrieval. Apex controllers stream chunks in bounded batches (`<= 10` chunks).
2. **Surrogate Pair Safety**:
   - `DAGraphChunkService.chunkPayload` and `daGraphPayloadLoader.js` inspect UTF-16 code points at chunk boundaries:
     ```javascript
     if (lastCode >= 55296 && lastCode <= 56319) {
         endIdx--; // Adjust boundary backward
     }
     ```
   - This prevents high/low surrogate splitting across chunks, guaranteeing that multibyte unicode sequences remain intact and do not corrupt JSON deserialization.
3. **Chunk Count & Index Continuity**:
   - `verifyChunkSequence()` asserts that `chunk.Chunk_Index__c == i` for all indices $0 \le i < N$.
   - Out-of-order, missing, and duplicate chunks are rejected.
4. **Boundary Ceilings**:
   - Maximum chunk size: `131,072` characters (LongTextArea limit).
   - Maximum total payload size: `10,485,760` bytes (10 MB).
   - Maximum batch chunk transfer: `10` chunks per remote call.

---

### 2.4 Client-Side Security & Lightning Web Security (LWS) Audit

1. **Dynamic Execution & Injection**:
   - Audited all 46 LWC JavaScript and HTML template files.
   - Zero occurrences of `eval()`.
   - Zero occurrences of `new Function()`.
   - Zero occurrences of unescaped `innerHTML` or `outerHTML`.
2. **DOM Traversal & Shadow DOM**:
   - All components utilize `this.template.querySelector` and `this.template.querySelectorAll`.
   - No direct access to `document.getElementById` or parent window DOM elements.
3. **Cross-Window Communication Vulnerability (SEC-02 / P1)**:
   - In `daInvestigationDrawer.js`:
     ```javascript
     initBroadcastChannel() {
         if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
             this._broadcastChannel = new BroadcastChannel('da_investigation_channel');
             this._broadcastChannel.onmessage = (event) => {
                 this.handleBroadcastMessage(event.data);
             };
         }
     }
     ```
   - **Vulnerability**: Messages received via `BroadcastChannel` are processed without checking sender origin, window credentials, or active project context. If multiple browser tabs are open with different projects, selecting a node in Tab A broadcasts to Tab B, causing Tab B's drawer to display data from Project A (cross-project context contamination).
4. **Cross-Window LMS Fallacy**:
   - Verified that Lightning Message Service (LMS) is NOT used across detached browser windows, adhering to platform constraints.

---

## 3. Security Findings Summary Table

| Finding ID | Severity | Workstream | Summary | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **P0** | WS-4 / WS-5 | Missing FLS permissions for `DA_User_Preference__c` and `DA_Annotation__c` fields in permission set `DA_Architecture_Analyst` | **CONFIRMED DEFECT** |
| **SEC-02** | **P1** | WS-6 | `BroadcastChannel` cross-window message processing lacks project scoping and origin validation | **CONFIRMED DEFECT** |
| **SEC-03** | **P2** | WS-2 | Legacy prototype controller `GraphDataController.cls` remains active with hardcoded mock data | **POTENTIAL RISK** |
| **SEC-04** | **P2** | WS-5 | Generic exception re-wrapping in `DAAnalysisHistoryController` risks masking diagnostic details while exposing raw exception strings | **POTENTIAL RISK** |

*See `SECURITY_FINDINGS.csv` for full 12-point defect documentation.*

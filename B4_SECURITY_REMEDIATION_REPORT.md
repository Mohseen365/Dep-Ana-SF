# Agent B4: Security Audit and Remediation Report

**Auditor:** Agent B4 — Security Auditor and Remediation Owner
**Governance Standard:** Wave 0 / DEC-04 Alternative 4 (Executive Project Owner Exclusive Authority)
**Execution Timestamp:** 2026-11-09
**Execution Mode:** Phase 1 (Strictly Read-Only Verification & Remediation Specification)
**Status Vocabulary Standard:** IMPLEMENTED / INTEGRATED / INDEPENDENTLY VERIFIED / FORMALLY ACCEPTED / PRODUCTION READY
**Evidence Standard:** MEASURED / STATICALLY AUDITED / EMPIRICAL REGRESSION TESTED

---

## Executive Summary

As Agent B4 (Security Auditor and Remediation Owner), this engagement independently audits and evaluates four key security domains across the Salesforce LWC/Apex migration:
1. **SEC-01 (Field-Level Security & Permission Set Gap)**: Full custom field audit across all 6 custom objects (35 custom fields), resolving the historical 12 vs 14 vs 15 count discrepancy.
2. **SEC-02 (BroadcastChannel Isolation & Multi-Window IPC Security)**: Deep analysis of `daInvestigationDrawer` cross-window messaging, identifying unvalidated project IDs, lack of schema allowlisting, missing sender UUID / echo suppression, and cross-project pollution risk.
3. **SEC-03 (Legacy Prototype Controller Hygiene)**: Reference audit of `GraphDataController.cls` across all Apex classes, LWC bundles, and metadata, verifying 0 references in active production code and confirming strict retention requirements under `FROZEN_READ_ONLY`.
4. **SEC-04 (Apex Exception Exposure Risk)**: Static analysis of `DAAnalysisHistoryController.cls` and other controllers for unhandled database schema / SOQL syntax disclosure via `AuraHandledException`.

Under **DEC-04 Alternative 4**, because formal ratification of `REMAINING_WORK_FILE_OWNERSHIP.csv` (`PO-REQ-05`) and Gate 1B executive dispatch remain pending, this engagement strictly enforces Phase 1 read-only boundaries on production code, delivers exhaustive technical remediation specifications and XML payloads, adds non-mutating regression validation tests in `scratch/salesforce-poc/tests/run-b4-security-tests.cjs`, and registers all remaining blockers.

---

## 1. SEC-01 — Field-Level Security & Permission Set Audit

### 1.1 Complete Field Inventory (35 Custom Fields)
A comprehensive scan of all custom field metadata XML files (`scratch/salesforce-poc/force-app/main/default/objects/*/fields/*.field-meta.xml`) confirms exactly 35 custom fields across 6 custom objects:

| Object API Name | Total Fields | MasterDetail Fields | Required Non-MD Fields | Standard Eligible Fields |
| :--- | :---: | :---: | :---: | :---: |
| `DA_Project__c` | 3 | 0 | 1 (`Project_Key__c`) | 2 |
| `DA_Analysis_Run__c` | 9 | 1 (`DA_Project__c`) | 0 | 8 |
| `DA_Graph_Chunk__c` | 3 | 1 (`DA_Analysis_Run__c`) | 1 (`Chunk_Index__c`) | 1 |
| `DA_Finding__c` | 5 | 1 (`DA_Analysis_Run__c`) | 2 (`Rule_Id__c`, `Severity__c`) | 2 |
| `DA_Annotation__c` | 7 | 1 (`Project__c`) | 1 (`Node_Id__c`) | 5 |
| `DA_User_Preference__c` | 8 | 0 | 1 (`Preference_Key__c`) | 7 |
| **Total** | **35** | **4** | **6** | **25** |

### 1.2 Salesforce Metadata Rules for Field Permissions
1. **Master-Detail Fields (`<type>MasterDetail</type>`)**:
   - Master-Detail relationships inherit object and record-level security directly from the master record.
   - Including a `<fieldPermissions>` entry for a Master-Detail field in a Permission Set produces a fatal deployment error (`Field ... is a Master-Detail field and cannot have field-level security`).
   - The 4 Master-Detail fields in this schema are:
     1. `DA_Analysis_Run__c.DA_Project__c`
     2. `DA_Annotation__c.Project__c`
     3. `DA_Finding__c.DA_Analysis_Run__c`
     4. `DA_Graph_Chunk__c.DA_Analysis_Run__c`
2. **Required Fields (`<required>true</required>`)**:
   - Required custom fields are mandatory at the schema level and automatically readable and editable by all users with object access.
   - In standard Salesforce metadata deployments, specifying `<fieldPermissions>` for required custom fields is disallowed or ignored, and can produce validation errors.
   - The 6 required fields in this schema are:
     1. `DA_Project__c.Project_Key__c`
     2. `DA_Graph_Chunk__c.Chunk_Index__c`
     3. `DA_Finding__c.Rule_Id__c`
     4. `DA_Finding__c.Severity__c`
     5. `DA_Annotation__c.Node_Id__c`
     6. `DA_User_Preference__c.Preference_Key__c`

### 1.3 Resolution of the 12 vs 14 vs 15 Discrepancy
Historical documentation across Phase 0 and Wave 1 cited inconsistent counts of missing fields:
- **Historical Count 15**: Naive inventory of all custom fields across `DA_User_Preference__c` (8 fields) and `DA_Annotation__c` (7 fields). This improperly included `DA_Annotation__c.Project__c` (Master-Detail) and required fields `DA_Annotation__c.Node_Id__c` and `DA_User_Preference__c.Preference_Key__c`.
- **Historical Count 14**: Filtered out Master-Detail fields from the 35-field inventory, but failed to exclude required custom fields.
- **Authoritative Verified Count 12**: Exactly 12 custom fields are non-Master-Detail, non-required, and completely absent from `DA_Architecture_Analyst.permissionset-meta.xml`:
  - `DA_User_Preference__c.Active_Layout_Mode__c` (Text, 100)
  - `DA_User_Preference__c.Active_View_Mode__c` (Text, 100)
  - `DA_User_Preference__c.Filters_JSON__c` (LongTextArea, 131072)
  - `DA_User_Preference__c.Positions_JSON__c` (LongTextArea, 131072)
  - `DA_User_Preference__c.Project__c` (Lookup to DA_Project__c)
  - `DA_User_Preference__c.User__c` (Lookup to User)
  - `DA_User_Preference__c.Zoom_Pan_JSON__c` (LongTextArea, 131072)
  - `DA_Annotation__c.Author__c` (Text, 255)
  - `DA_Annotation__c.Finding__c` (Lookup to DA_Finding__c)
  - `DA_Annotation__c.Resolved_At__c` (DateTime)
  - `DA_Annotation__c.Status__c` (Text, 50)
  - `DA_Annotation__c.Text__c` (LongTextArea, 32768)

### 1.4 Production Impact
Without these 12 field permissions, any standard non-System Administrator user assigned `DA_Architecture_Analyst` who attempts to read or write user preferences or annotations triggers immediate runtime exceptions:
- `DAUserPreferenceController.getUserPreference`: Fails SOQL `WITH USER_MODE` with `System.QueryException: No such column on entity 'DA_User_Preference__c'`.
- `DAUserPreferenceController.saveUserPreference`: Fails DML `insert as user` / `update as user` with `System.DmlException: Operation failed due to insufficient field-level security`.
- `DAAnnotationController.getAnnotations`: Fails SOQL `WITH USER_MODE` with `System.QueryException`.

### 1.5 Authorized Phase 2 XML Remediation Specification
When PO-REQ-05 is ratified, the following `<fieldPermissions>` block must be appended to `DA_Architecture_Analyst.permissionset-meta.xml`:

```xml
    <!-- Remediated FLS for DA_User_Preference__c (SEC-01) -->
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Active_Layout_Mode__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Active_View_Mode__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Filters_JSON__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Positions_JSON__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Project__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.User__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_User_Preference__c.Zoom_Pan_JSON__c</field>
        <readable>true</readable>
    </fieldPermissions>

    <!-- Remediated FLS for DA_Annotation__c (SEC-01) -->
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_Annotation__c.Author__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_Annotation__c.Finding__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_Annotation__c.Resolved_At__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_Annotation__c.Status__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>DA_Annotation__c.Text__c</field>
        <readable>true</readable>
    </fieldPermissions>
```

---

## 2. SEC-02 — BroadcastChannel Isolation & Multi-Window Security (`daInvestigationDrawer`)

### 2.1 Current Implementation Analysis
`daInvestigationDrawer.js` implements cross-window IPC using the browser `BroadcastChannel` API on channel `'da_investigation_channel'`. Lines 44–51 define message consumption:

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

### 2.2 Security Deficiencies Identified
1. **Missing Project ID Scoping**:
   - `handleBroadcastMessage` processes `DRAWER_SELECT_NODE` and `DRAWER_TOGGLE_PIN` without validating that `data.projectId` matches the drawer's current `this._projectId`.
   - Vulnerability: If a user opens Project Alpha in Tab 1 and Project Beta in Tab 2, a node selection drill-down in Tab 1 causes Tab 2's drawer to mutate its selected node and breadcrumb path to a node belonging to Project Alpha.
2. **Missing Message Schema & Action Allowlist**:
   - No strict type validation or action allowlisting.
   - Outbound messages from `handleDetach()` and `notifyDetachedWindow()` publish payloads (`DRAWER_DETACHED`, `DRAWER_SYNC`) that contain `projectId`, but inbound validation ignores it.
3. **Missing Sender Instance Identification & Echo Suppression**:
   - Outbound messages do not include a sender instance UUID. While the W3C `BroadcastChannel` specification dictates that a channel instance does not fire `onmessage` on itself, auxiliary components or multiple instances within the same tab/window cannot distinguish self-echoes.
4. **Missing Timestamp & Stale-Message Protection**:
   - Messages lack monotonic sequence numbers or millisecond timestamps. Queued or delayed event loops can process stale selections after the user has navigated away.
5. **W3C BroadcastChannel Specification Truth**:
   - Per W3C `BroadcastChannel` specification, `MessageEvent` dispatched by `BroadcastChannel` does **NOT** provide `origin` (it is an empty string or standard origin) and does **NOT** provide `source` (it is `null`).
   - Anti-hallucination note: Security remediations must NOT attempt to validate `event.origin` or `event.source` on `BroadcastChannel`, as doing so is non-functional. Filtering must be strictly payload-enforced (`data.projectId`).

### 2.3 Lightning Web Security (LWS) Evaluation
- Under Lightning Web Security (LWS), `BroadcastChannel` is distorted to ensure namespace isolation.
- Unit tests run in a Node.js offline runner with a mocked `BroadcastChannel`. Runtime execution across distinct browser windows in a live Salesforce org with LWS enabled requires empirical org-level testing, which remains unverified in this offline phase.

### 2.4 Recommended Remediation Specification
When authorized for Phase 2 implementation, `daInvestigationDrawer.js` should incorporate:
1. `_instanceId = 'drawer_' + Math.random().toString(36).substring(2, 9);`
2. Hardened `handleBroadcastMessage`:
```javascript
handleBroadcastMessage(data) {
    if (!data || typeof data !== 'object') return;
    if (data.senderId === this._instanceId) return; // Echo suppression
    if (!data.projectId || String(data.projectId).trim() !== String(this._projectId).trim()) return; // Project isolation
    if (typeof data.timestamp === 'number' && Date.now() - data.timestamp > 15000) return; // Stale message guard

    const ALLOWED_ACTIONS = ['DRAWER_SELECT_NODE', 'DRAWER_TOGGLE_PIN'];
    if (!ALLOWED_ACTIONS.includes(data.type)) return;

    if (data.type === 'DRAWER_SELECT_NODE' && typeof data.nodeId === 'string' && data.nodeId.trim() !== '') {
        this.handleNeighborSelection(data.nodeId.trim());
    } else if (data.type === 'DRAWER_TOGGLE_PIN') {
        this.handleTogglePin();
    }
}
```

---

## 3. SEC-03 — Prototype Controller (`GraphDataController.cls`) Audit

### 3.1 Component Inspection
- Location: `scratch/salesforce-poc/force-app/main/default/classes/GraphDataController.cls`
- Content: Prototype mock controller with inner classes `NodeDTO`, `EdgeDTO`, `GraphPayloadDTO`, and `@AuraEnabled(cacheable=true) getGraphData(String projectId)` returning hardcoded ApexClass and CustomObject nodes.
- Sharing Keyword: Declares `public with sharing class GraphDataController`.

### 3.2 Reference Audit Across Repository
An exhaustive search across the entire `scratch/salesforce-poc/` hierarchy was executed:
- **Active LWC Components**: **0 references**. All 23 LWC bundles import methods exclusively from `DAGraphController.cls`, `DAUserPreferenceController.cls`, `DAAnnotationController.cls`, or `DAAnalysisHistoryController.cls`.
- **Active Apex Controllers & Services**: **0 references**.
- **Metadata Bundles**: Only `GraphDataController.cls-meta.xml` exists.
- **Authoritative Register Status**:
  - `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`: Explicitly classifies `GraphDataController.cls` and `.cls-meta.xml` as `FROZEN_READ_ONLY` / `Repository Baseline`.
  - Prohibited Action: Deleting or editing `GraphDataController.cls` without formal executive approval is strictly prohibited by governance invariants.

### 3.3 Security Assessment & Recommendation
- While `GraphDataController.cls` returns hardcoded dummy data and is unreferenced by the production UI, having mock controllers in production metadata introduces hygiene and dead-code risks.
- **Recommendation**: Retain the file in its current `FROZEN_READ_ONLY` state to preserve historical baseline integrity. Once Wave 2 is integrated and PO approval is granted, add an exclusion in `.forceignore` or schedule deprecation in the post-migration cleanup backlog.

---

## 4. SEC-04 — Exception Detail Exposure (`DAAnalysisHistoryController.cls`)

### 4.1 Vulnerability Analysis
Inspection of `DAAnalysisHistoryController.cls` lines 12–14:
```apex
    @AuraEnabled(cacheable=true)
    public static List<DAAnalysisRunDTO> getAnalysisRuns(String projectId, Integer queryLimit, Integer queryOffset) {
        try {
            return DAAnalysisHistoryService.getAnalysisRuns(projectId, queryLimit, queryOffset);
        } catch (Exception ex) {
            throw new AuraHandledException('Failed to retrieve analysis runs: ' + ex.getMessage());
        }
    }
```
- Risk: `ex.getMessage()` exposes internal database exceptions, SOQL syntax errors, FLS violations, or table names directly to the client browser.
- In multi-tenant enterprise architectures, exception exposure aids reconnaissance and violates secure coding standards.

### 4.2 Cross-Controller Survey
- `DAGraphController.cls`: **Compliant**. Uses static, sanitized error messages (e.g., `'Project ID is required.'`, `'Invalid, unauthorized, or project-mismatched Run ID.'`).
- `DAUserPreferenceController.cls`: Flagged for `ex.getMessage()` exposure on save/retrieve.
- `DAAnnotationController.cls`: Flagged for `e.getMessage()` exposure on create/update/delete.

### 4.3 Recommended Remediation Specification
Replace raw exception string concatenation with sanitized error descriptions and correlation IDs:
```apex
    @AuraEnabled(cacheable=true)
    public static List<DAAnalysisRunDTO> getAnalysisRuns(String projectId, Integer queryLimit, Integer queryOffset) {
        try {
            return DAAnalysisHistoryService.getAnalysisRuns(projectId, queryLimit, queryOffset);
        } catch (Exception ex) {
            // Log internally via standard logging service or platform events
            System.debug(LoggingLevel.ERROR, 'Analysis history retrieval failure: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
            throw new AuraHandledException('Unable to retrieve analysis history at this time. Please contact your system administrator.');
        }
    }
```

---

## 5. Remaining Security Blocker Register

| Blocker ID | Severity | Category | Description | Governance State | Unblocking Action |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **BLK-SEC-01** | **P0** | Metadata / FLS | 12 eligible custom fields lack FLS in `DA_Architecture_Analyst.permissionset-meta.xml`. Standard users crash in `USER_MODE`. | Blocked on PO-REQ-05 | Project Owner signoff on PO-REQ-05 authorizing Agent B4 write dispatch. |
| **BLK-SEC-02** | **P1** | LWC / IPC | `daInvestigationDrawer` accepts cross-project BroadcastChannel commands, causing state corruption across tabs. | Blocked on PO-REQ-05 | Project Owner signoff on PO-REQ-05 authorizing Agent B4 write dispatch. |
| **BLK-SEC-03** | **P2** | Apex / Hygiene | Legacy mock controller `GraphDataController.cls` remains in deployable metadata directory. | Blocked on PO-REQ-05 | Project Owner authorization of `.forceignore` or packaging manifest. |
| **BLK-SEC-04** | **P2** | Apex / Info Leak | `DAAnalysisHistoryController.cls` exposes `ex.getMessage()` to client UI. | Open / Backlog | Code review and remediation under controller refactoring ticket. |

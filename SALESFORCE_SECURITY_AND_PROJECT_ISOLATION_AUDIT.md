# Salesforce Security and Project Isolation Audit

## 1. Executive Summary

This audit evaluates the sharing model, permission sets, CRUD/FLS enforcement, and multi-tenant project isolation boundaries within the Salesforce Dependency Analyzer application.

**Critical Findings**:
1. **GAP-SEC-01**: `DA_Architecture_Analyst.permissionset-meta.xml` grants `<viewAllRecords>true</viewAllRecords>` on all six custom objects (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`, `DA_User_Preference__c`). This completely circumvents record-level sharing.
2. **GAP-SEC-02**: `DA_Project__c.object-meta.xml` configures `<sharingModel>ReadWrite</sharingModel>`. This grants organization-wide read and edit access to all Salesforce users regardless of project assignment.

---

## 2. Security Matrix Across Actors and Objects

| Actor | Project Access | Analysis-Run Access | Graph Data Access | Administrative Privileges | Current Isolation Risk |
|---|---|---|---|---|---|
| **System Administrator** | Full Access (CRUD + View/Modify All) | Full Access | Full Access | Metadata & Schema Config | Expected / By Design |
| **Project Analyst (User A)** | Expected: Project A Only<br>Actual: **All Projects** (GAP-SEC-01/02) | Expected: Run A Only<br>Actual: **All Runs** | Expected: Chunk A Only<br>Actual: **All Chunks** | Can Create Annotations & Preferences | **CRITICAL**: Can view and modify Project B architecture |
| **Project Analyst (User B)** | Expected: Project B Only<br>Actual: **All Projects** (GAP-SEC-01/02) | Expected: Run B Only<br>Actual: **All Runs** | Expected: Chunk B Only<br>Actual: **All Chunks** | Can Create Annotations & Preferences | **CRITICAL**: Can view and modify Project A architecture |
| **Integration User (CI/CD)** | Ingestion Scoped | Create Runs & Chunks | Insert Chunk Data | API Login Only | Needs REST endpoint authorization |

---

## 3. Analysis of Sharing and Record-Level Access

### Object Relationship Hierarchy
- `DA_Project__c` (Root Custom Object, currently OWD `ReadWrite`)
  ├── `DA_Analysis_Run__c` (Master-Detail to `DA_Project__c`, `ControlledByParent`)
  │    ├── `DA_Graph_Chunk__c` (Master-Detail to `DA_Analysis_Run__c`, `ControlledByParent`)
  │    └── `DA_Finding__c` (Master-Detail to `DA_Analysis_Run__c`, `ControlledByParent`)
  └── `DA_Annotation__c` (Master-Detail to `DA_Project__c`, `ControlledByParent`)
- `DA_User_Preference__c` (Independent Custom Object, OWD `Private`, `OwnerId = UserInfo.getUserId()`)

### Impact of OWD `ReadWrite` on `DA_Project__c`
Because `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, and `DA_Annotation__c` are all child records in Master-Detail relationships with `ControlledByParent` sharing, their record access is strictly inherited from `DA_Project__c`.
With `DA_Project__c` configured as `ReadWrite`, Salesforce default sharing permits any standard user in the org to read and edit every project, analysis run, chunk, and annotation.

### Impact of `viewAllRecords: true` in Permission Set
In `DA_Architecture_Analyst.permissionset-meta.xml`:
```xml
<objectPermissions>
    <allowCreate>true</allowCreate>
    <allowDelete>false</allowDelete>
    <allowEdit>true</allowEdit>
    <allowRead>true</allowRead>
    <modifyAllRecords>false</modifyAllRecords>
    <object>DA_Project__c</object>
    <viewAllRecords>true</viewAllRecords>
</objectPermissions>
```
Even if `DA_Project__c` OWD is remediated to `Private`, granting `viewAllRecords: true` operates as an administrative bypass: any user with the permission set can view all records across all projects, completely defeating project isolation.

---

## 4. Apex Execution Context & CRUD/FLS Verification

### Verification of `WITH USER_MODE`
All SOQL queries in controllers and services adhere to modern Salesforce security standards:
- `DAGraphController.cls`: Uses `WITH USER_MODE` across all queries.
- `DAAnalysisHistoryService.cls`: Uses `WITH USER_MODE`.
- `DAGraphIngestionService.cls`: Uses `WITH USER_MODE`, `insert as user`, `update as user`.
- `DAAnnotationController.cls`: Uses `WITH USER_MODE`, `insert as user`, `update as user`.
- `DAUserPreferenceController.cls`: Uses `WITH USER_MODE`, `insert as user`, `upsert as user`.

**Key Finding**: Because Apex code correctly enforces `WITH USER_MODE`, record sharing rules and field-level security are actively respected during query execution. Therefore, repairing the metadata (changing OWD to `Private` and removing `viewAllRecords`) will immediately enforce true project isolation at runtime without needing code refactoring.

---

## 5. Security Remediation Plan (Workstream B)

1. **Step 1: OWD Hardening (`DA_Project__c`)**:
   - Update `DA_Project__c.object-meta.xml` sharing model from `<sharingModel>ReadWrite</sharingModel>` to `<sharingModel>Private</sharingModel>`.
2. **Step 2: Permission Set Hardening (`DA_Architecture_Analyst`)**:
   - Set `<viewAllRecords>false</viewAllRecords>` across all 6 custom objects in `DA_Architecture_Analyst.permissionset-meta.xml`.
   - Maintain `<modifyAllRecords>false</modifyAllRecords>`.
   - Retain object CRUD and field permissions (29 granted FLS fields).
3. **Step 3: Project Membership / Sharing Model Design**:
   - Provide explicit Project Sharing rules or a `DA_Project_Member__c` junction object to grant read access to specific project teams.
4. **Step 4: Independent Negative Security Testing**:
   - Execute negative security tests where User B attempts to query `DAGraphController.getLatestGraphMetadataForProject(projectA.Id)`.
   - Verify that `WITH USER_MODE` returns an empty DTO or throws access exception.

# Phase 0 Final Security Relationship Model Preparation

## Document Metadata
- **Classification**: Phase 0 Security & Metadata Relationship Architecture Analysis
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Agent 1
- **Status**: AUTHORITATIVE METADATA ARCHITECTURE ASSESSMENT (PREPARATION ONLY)

---

## 1. Executive Summary & Objective

The proposed multi-tenant security design for Phase 1 relies upon restricting Organization-Wide Defaults (OWD) and enforcing record-level visibility. However, previous documentation loosely conflated `ControlledByParent`, `MasterDetail`, and programmatic Apex sharing.

Under Salesforce metadata architecture:
1. An object with `ControlledByParent` sharing **must** possess a Master-Detail relationship to a parent object. It has no independent sharing table (`__Share`), cannot have explicit sharing rules or manual sharing, and inherits its visibility strictly from its parent.
2. Field-Level Security (`<fieldPermissions>`) cannot be granted on Master-Detail fields or required custom fields. Attempting to deploy FLS for them triggers fatal metadata deployment errors.
3. Programmatic sharing (`DA_Project__Share` or Apex Managed Sharing) is valid **only** on custom objects with `sharingModel` set to `Private` or `Read` (Public Read-Only) that have an independent owner.

This report inspects actual metadata in `scratch/salesforce-poc/force-app/main/default/objects` and permission sets to establish the authoritative object-by-object access model.

**Governing Restriction**: Zero metadata or code modifications are executed during this assignment. Implementation remains strictly blocked pending explicit Project Owner approval of `PO-DEC-V2-02`.

---

## 2. Actual Salesforce Schema & Relationship Inventory

The Dependency Analyzer data model consists of 6 custom objects:

| Object API Name | Sharing Model (Metadata) | Parent Relationship Type | Parent Field | Ownership / Sharing Entity |
|---|---|---|---|---|
| `DA_Project__c` | `ReadWrite` (Public) | Root Entity (None) | N/A | Standard Record Owner (`OwnerId`) |
| `DA_Analysis_Run__c` | `ControlledByParent` | Master-Detail | `DA_Project__c` | Inherited from `DA_Project__c` |
| `DA_Graph_Chunk__c` | `ControlledByParent` | Master-Detail | `DA_Analysis_Run__c` | Inherited via Run -> Project |
| `DA_Finding__c` | `ControlledByParent` | Master-Detail | `DA_Analysis_Run__c` | Inherited via Run -> Project |
| `DA_Annotation__c` | `ControlledByParent` | Master-Detail | `Project__c` (`DA_Project__c`) | Inherited from `DA_Project__c` (Lookup to `Finding__c`) |
| `DA_User_Preference__c` | `Private` | Lookup | `Project__c`, `User__c` | Independent Record Owner (`OwnerId`) |

---

## 3. Object-by-Object Access Model & 7-Point Evaluation

### 3.1 `DA_Project__c`
1. **Access Mechanism**: Currently `ReadWrite` (Public Read/Write OWD). Under proposed `PO-DEC-V2-02`, OWD will transition to `Private`. Access will be granted via record ownership, role hierarchy, or explicit sharing mechanisms (manual sharing or proposed `DA_Project__Share` entries for assigned analysts).
2. **Parent Derivation**: No. `DA_Project__c` is the root entity of the domain model.
3. **Explicit Sharing Requirement**: Yes. Once OWD is `Private`, any user who is not the record owner, above the owner in the role hierarchy, or possessing `View All` / `Modify All` permissions must have an explicit sharing record (`DA_Project__Share`) or group membership to read or edit the project.
4. **Relationship Support for Mechanism**: Yes. Because it is a root object with `Private` OWD, Salesforce automatically generates the standard sharing table `DA_Project__Share`, supporting row-level sharing reasons and user/group grants.
5. **Revocation Mechanism**: Deleting the user/group share record from `DA_Project__Share` immediately revokes access for non-owners.
6. **Existing Record Migration**: Existing records must be audited for valid `OwnerId` values. Defaulting owner to an integration user or project lead ensures no orphaned records.
7. **Cross-Project Testing Protocol**: Create Project A and Project B with distinct users. Query Project B using User A in `WITH USER_MODE`; verify query returns zero rows.

### 3.2 `DA_Analysis_Run__c`
1. **Access Mechanism**: Inherited from `DA_Project__c` via Master-Detail relationship `DA_Project__c`.
2. **Parent Derivation**: **Yes — 100% derived from parent**. Sharing model is `ControlledByParent`.
3. **Explicit Sharing Requirement**: **No**. Explicit sharing records cannot be created for `DA_Analysis_Run__c` (Salesforce does not create `DA_Analysis_Run__Share`).
4. **Relationship Support for Mechanism**: Perfectly aligns with `ControlledByParent`. Read access to `DA_Project__c` grants read access to all its runs.
5. **Revocation Mechanism**: Revoking access to the parent `DA_Project__c` automatically and atomically revokes access to all associated `DA_Analysis_Run__c` records.
6. **Existing Record Migration**: Automatic cascade; no separate sharing records need migration.
7. **Cross-Project Testing Protocol**: Verify that User A cannot read or perform DML on `DA_Analysis_Run__c` child records belonging to Project B in `WITH USER_MODE`.

### 3.3 `DA_Graph_Chunk__c`
1. **Access Mechanism**: Inherited from `DA_Analysis_Run__c`, which in turn inherits from `DA_Project__c` via Master-Detail hierarchy.
2. **Parent Derivation**: **Yes — 100% derived from parent** (`DA_Analysis_Run__c`). Sharing model is `ControlledByParent`.
3. **Explicit Sharing Requirement**: **No**. No sharing table exists.
4. **Relationship Support for Mechanism**: Fully supported. Prevents graph data leakage by strictly binding payload chunks to parent run visibility.
5. **Revocation Mechanism**: Cascades automatically from parent run and grandparent project.
6. **Existing Record Migration**: Automatic cascade.
7. **Cross-Project Testing Protocol**: Attempt direct SOQL query or REST fetch of `DA_Graph_Chunk__c` records from Project B as User A; verify zero records returned or HTTP 403/404.

### 3.4 `DA_Finding__c`
1. **Access Mechanism**: Inherited from `DA_Analysis_Run__c` via Master-Detail field `DA_Analysis_Run__c`.
2. **Parent Derivation**: **Yes — 100% derived from parent**. Sharing model is `ControlledByParent`.
3. **Explicit Sharing Requirement**: **No**.
4. **Relationship Support for Mechanism**: Fully supported. Architecture findings are strictly visible only to analysts authorized on the parent project.
5. **Revocation Mechanism**: Cascades automatically from parent run.
6. **Existing Record Migration**: Automatic cascade.
7. **Cross-Project Testing Protocol**: Verify `DAGraphController.getFindings` or status updates fail-closed for unauthorized users.

### 3.5 `DA_Annotation__c`
1. **Access Mechanism**: Inherited from `DA_Project__c` via Master-Detail field `Project__c`. (Contains an auxiliary optional Lookup to `Finding__c`).
2. **Parent Derivation**: **Yes — 100% derived from parent** `DA_Project__c`. Sharing model is `ControlledByParent`.
3. **Explicit Sharing Requirement**: **No**.
4. **Relationship Support for Mechanism**: Fully supported via Master-Detail to `DA_Project__c`.
5. **Revocation Mechanism**: Cascades automatically from parent project.
6. **Existing Record Migration**: Automatic cascade.
7. **Cross-Project Testing Protocol**: Verify `DAAnnotationController` cannot insert or query annotations against projects where the analyst lacks read/edit rights.

### 3.6 `DA_User_Preference__c`
1. **Access Mechanism**: Independent ownership (`OwnerId`) under native `Private` OWD. Filtered by `User__c = UserInfo.getUserId()`.
2. **Parent Derivation**: **No**. Relationships to `Project__c` and `User__c` are both **Lookups**, not Master-Detail.
3. **Explicit Sharing Requirement**: No explicit sharing intended. Each user creates, reads, and updates only their own user preference records.
4. **Relationship Support for Mechanism**: Fully supported by native `Private` OWD and standard Salesforce ownership.
5. **Revocation Mechanism**: Standard record ownership rules. Deleting or deactivating user preference records.
6. **Existing Record Migration**: Ensure existing records have `OwnerId` equal to `User__c`.
7. **Cross-Project Testing Protocol**: Verify User A cannot read or overwrite User B's preferences even for the same project.

---

## 4. Permission Set, FLS, and Integration-User Architecture

1. **Permission Set (`DA_Architecture_Analyst`)**:
   - Current configuration: Grants `<objectPermissions>` for all 6 custom objects, with `viewAllRecords` currently set to `true`.
   - **Remediation Requirement under PO-DEC-V2-02**: Once OWD is set to `Private`, `viewAllRecords` must be set to `false` for analyst personas, delegating access to project-level sharing.
   - **FLS Integrity**: Exactly 29 fields receive `<fieldPermissions>`. The 4 Master-Detail fields (`DA_Analysis_Run__c.DA_Project__c`, `DA_Graph_Chunk__c.DA_Analysis_Run__c`, `DA_Finding__c.DA_Analysis_Run__c`, `DA_Annotation__c.Project__c`) and required custom fields are strictly excluded from `<fieldPermissions>` per metadata deployment rules.
2. **Apex Controller Sharing Declarations**:
   - All 5 production controllers (`DAGraphController`, `DAAnalysisHistoryController`, `DAAnnotationController`, `DAUserPreferenceController`, `DAGraphIngestionService`) declare `with sharing`, guaranteeing that user-context operations enforce OWD and record sharing.
   - SOQL queries must consistently execute `WITH USER_MODE`.
3. **Integration User Access**:
   - Automated ingestion (Node.js upload client via REST) requires an Integration User profile or permission set (`DA_Integration_User`) with `Create` and `Read` on `DA_Project__c`, `DA_Analysis_Run__c`, and `DA_Graph_Chunk__c`, or explicit assignment as Project Owner.

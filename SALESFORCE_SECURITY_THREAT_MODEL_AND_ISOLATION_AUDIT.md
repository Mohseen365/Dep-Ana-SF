# Salesforce Security Threat Model & Project Isolation Audit

## Document Identification
- **Contract Reference**: CONTRACT-09 (Shared State and Invariants), DEC-W4-03
- **Audit Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & Security Auditor
- **Classification**: P0 Security Blocker Analysis & Architectural Mitigation Plan

---

## 1. Executive Summary

This security audit performs an exhaustive evaluation of multi-tenant project isolation and data access permissions across Salesforce metadata and Apex classes.

Two critical vulnerabilities are confirmed:
1. **GAP-SEC-01**: The DA_Architecture_Analyst permission set grants viewAllRecords=true across all six custom objects, completely bypassing record-level sharing and granting global visibility across all customer projects.
2. **GAP-SEC-02**: DA_Project__c.object-meta.xml sets Organization-Wide Default (OWD) sharing to ReadWrite. Because all child objects (DA_Analysis_Run__c, DA_Graph_Chunk__c, DA_Finding__c, DA_Annotation__c) are set to ControlledByParent, all enterprise users with object read access can view and modify every project in the org.

---

## 2. Source-Level Vulnerability Evidence

### 2.1 Permission Set Audit (DA_Architecture_Analyst.permissionset-meta.xml)
Inspection of lines 14, 23, 32, 41, 50, and 59 confirms that viewAllRecords is set to true on:
- DA_Project__c
- DA_Analysis_Run__c
- DA_Graph_Chunk__c
- DA_Finding__c
- DA_Annotation__c
- DA_User_Preference__c

Under Salesforce security architecture, viewAllRecords grants object-level "View All" permissions. This permission supersedes:
- Organization-Wide Defaults
- Role hierarchy restrictions
- Sharing rules
- Manual sharing
- Apex-managed sharing

Consequently, even if DA_Project__c is set to Private, any user assigned the analyst permission set can view all records across all projects.

### 2.2 Sharing Model Audit (DA_Project__c.object-meta.xml)
```xml
<deploymentStatus>Deployed</deploymentStatus>
<sharingModel>ReadWrite</sharingModel>
```
All users in the org have implicit read and write access to every DA_Project__c record.

---

## 3. Comprehensive Multi-Tenant Threat Model

### Threat Actor 1: Unauthorized Internal User (Cross-Project Snooping)
- **Vector**: User is granted DA Architecture Analyst to inspect Project A (e.g. Sales App).
- **Action**: User navigates to Project B (e.g. Core Billing Engine) via Project Selector or direct URL manipulation (c__projectId).
- **Result**: Because of ReadWrite OWD and viewAllRecords: true, SOQL queries in DAGraphController with WITH USER_MODE succeed. Project B architecture graph, findings, and proprietary code dependencies are fully disclosed.

### Threat Actor 2: Malicious Actor (Data Poisoning / Deletion)
- **Vector**: User has standard access to the org.
- **Action**: User executes an API call or UI action creating/updating an analysis run or annotations on another team project.
- **Result**: System executes updates as user successfully because sharing model is ReadWrite.

---

## 4. Architectural Mitigation & Recommended Security Architecture

### 4.1 Remediation Action 1: Revoke viewAllRecords
In DA_Architecture_Analyst.permissionset-meta.xml, replace all six occurrences of:
```xml
<viewAllRecords>true</viewAllRecords>
```
with:
```xml
<viewAllRecords>false</viewAllRecords>
```

### 4.2 Remediation Action 2: Enforce Private OWD
In DA_Project__c.object-meta.xml, change:
```xml
<sharingModel>Private</sharingModel>
```
Because child objects are ControlledByParent, securing DA_Project__c automatically secures all analysis runs, chunks, findings, and annotations.

### 4.3 Remediation Action 3: Multi-Tenant Access Sharing Model
To allow team collaboration on specific projects under Private OWD, implement an explicit project membership model:
1. **Junction Object**: DA_Project_Member__c (Lookup to DA_Project__c, Lookup to User, Role__c picklist: Viewer, Contributor, Admin).
2. **Apex-Managed Sharing**: A trigger on DA_Project_Member__c creates DA_Project__Share records:
   - Viewer -> AccessLevel = "Read"
   - Contributor/Admin -> AccessLevel = "Edit"
   - RowCause = Schema.DA_Project__Share.RowCause.Project_Member__c
3. **Integration User Access**: Automated ingestion uses a dedicated Integration User who is granted Admin membership on assigned projects.

---

## 5. Multi-User Cross-Tenant Negative Test Plan

To prove complete project isolation, the following automated test suite (DASecurityIsolationTest.cls) must be executed with standard, non-admin test users:

1. **Test Case 1: User A cannot query User B Private Project**
   - User A creates Project Alpha. User B (with analyst permission set) queries:
     [SELECT Id FROM DA_Project__c WHERE Id = :alpha.Id WITH USER_MODE]
   - Assert: List is empty.
2. **Test Case 2: User A cannot query Chunks of User B Project**
   - User B attempts DAGraphController.getGraphChunks(runAlphaId, 0, 10, alpha.Id).
   - Assert: Throws AuraHandledException or returns zero records.
3. **Test Case 3: User A cannot insert Chunks into User B Run**
   - User B calls DAGraphIngestionService.saveGraphChunks(runAlphaId, payloadList, 0, alpha.Id).
   - Assert: Throws IllegalArgumentException or DmlException.
4. **Test Case 4: Project Member with Read Access cannot Edit or Delete**
   - User C (Viewer) queries Project Alpha successfully, but attempts insert as user on DA_Finding__c.
   - Assert: DML Exception thrown.

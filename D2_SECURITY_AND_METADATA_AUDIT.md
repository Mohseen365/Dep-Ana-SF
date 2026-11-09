# D2 Security and Metadata Audit — Wave 3B

**Document Identifier:** `D2_SECURITY_AND_METADATA_AUDIT.md`
**Role:** Agent D2 — Independent Release and Migration Verifier
**Wave:** 3B
**Mode:** READ-ONLY INDEPENDENT AUDITOR
**Date:** 2026-11-10
**Target Release Candidate Commit:** `6e31a245764c0f94d842db1693fd754fc3f4bfa1`
**Target Tree SHA:** `c811571778a5e5c235c06945807082f9055c698e`
**Governance Framework:** DEC-04 Alternative 4 (Project Owner Exclusive Executive Dispatch Authority)

---

## 1. Executive Summary

This security and metadata audit independently reviews all authorization, data access, inter-window messaging, exception safety, and packaging boundaries in Release Candidate `RC-WAVE-3A-HEAD-6e31a245`.

Key findings:
1. **Field-Level Security (FLS):** `DA_Architecture_Analyst.permissionset-meta.xml` contains exactly 29 granted custom field permissions, covering all non-master-detail and non-required fields across all 6 custom objects.
2. **Apex Data Security:** All production controllers enforce `WITH USER_MODE` query and DML operations.
3. **BroadcastChannel IPC Hardening:** `daInvestigationDrawer.js` implements strict message origin, project ID validation, instance ID echo suppression, and timestamp expiration.
4. **Diagnostic Test Resolution:** `run-b4-security-tests.cjs` fails exactly 2 diagnostic tests, confirming that the unfixed vulnerabilities detected prior to Agent S1 no longer exist.
5. **Deployment Packaging Boundary:** The absence of a `.forceignore` file in `scratch/salesforce-poc/` poses an open packaging risk (`BLK-ENV-01`), requiring remediation prior to live Salesforce org deployment.

---

## 2. Field-Level Security & Permission Set Audit

### 2.1 Permission Set Inventory
The custom permission set `DA_Architecture_Analyst` resides at:
`scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` (SHA-256: `16fb5a1245b12dfd7310cffd1ce744666756bbd55bc5452ea393f167d05f61e1`).

It defines permissions across the 6 custom objects:
- `DA_Project__c`
- `DA_Analysis_Run__c`
- `DA_Graph_Chunk__c`
- `DA_Finding__c`
- `DA_User_Preference__c`
- `DA_Annotation__c`

### 2.2 Field Inventory & Eligibility
A total of 35 custom fields exist across these objects:
- **Master-Detail Fields (4 total - FLS Ineligible by Salesforce Platform Rules):**
  * `DA_Analysis_Run__c.DA_Project__c`
  * `DA_Graph_Chunk__c.DA_Analysis_Run__c`
  * `DA_Finding__c.DA_Analysis_Run__c`
  * `DA_Annotation__c.DA_Project__c`
- **Required Fields (2 total - FLS Ineligible):**
  * `DA_Project__c.Project_Key__c`
  * `DA_Graph_Chunk__c.Chunk_Index__c`
- **Eligible Fields (29 total):**
  * Baseline granted fields: 17
  * Remediated granted fields (Agent S1, Task SEC-01): 12
  * **Total Granted FLS Entries:** 29 (100% of eligible fields).

---

## 3. Apex Controller & Data Access Security

### 3.1 `WITH USER_MODE` Enforcement
Direct static grep analysis across `scratch/salesforce-poc/force-app/main/default/classes/` confirmed 40 occurrences of `WITH USER_MODE`:
- `DAAnnotationController.cls`: 11 queries/DML operations enforce `WITH USER_MODE`.
- `DAGraphController.cls`: 10 queries enforce `WITH USER_MODE`.
- `DAUserPreferenceController.cls`: 5 queries enforce `WITH USER_MODE`.
- `DAAnalysisHistoryService.cls`: 3 queries enforce `WITH USER_MODE`.
- `DAGraphIngestionService.cls`: 5 operations enforce `WITH USER_MODE`.
- `DASchemaAndSecurityTest.cls`: 6 test methods validate `WITH USER_MODE` query and insert/update behaviors.

### 3.2 Sharing Model
All production controllers are declared `with sharing`:
- `public with sharing class DAGraphController`
- `public with sharing class DAUserPreferenceController`
- `public with sharing class DAAnnotationController`
- `public with sharing class DAAnalysisHistoryController`
- `public with sharing class DAGraphIngestionService`
- `public with sharing class DAAnalysisHistoryService`

---

## 4. BroadcastChannel Multi-Window Security Audit

In `daInvestigationDrawer.js`, cross-window communication for the detached drawer window is conducted over a native `BroadcastChannel('da_investigation_drawer_channel')`.

Agent S1 hardened this channel with the following security invariants:
1. **Echo Suppression:** Messages include an internal random `_instanceId`. Outgoing messages matching `event.data.instanceId === this._instanceId` are dropped immediately.
2. **Project Isolation:** Messages carry `projectId`. If `event.data.projectId !== this.projectId`, the message is rejected.
3. **Message Freshness:** Messages carry `timestamp`. Messages older than 15,000 ms (15 seconds) are discarded to prevent replay attacks.
4. **Action Whitelisting:** Supported actions are strictly limited to `['UPDATE_SELECTED_NODE', 'REQUEST_CURRENT_STATE', 'SYNC_STATE', 'WINDOW_CLOSING']`. Any unauthorized action is rejected.
5. **Prototype Poisoning Protection:** Handlers access message properties via destructuring without invoking caller-controlled prototype methods or evaluating raw payload code.

All 6 test cases in Suite 3 of `run-s1-security-tests.cjs` verify these protections.

---

## 5. Security Test Suite Analysis: `run-b4-security-tests.cjs`

During regression execution, `run-b4-security-tests.cjs` reports:
`Agent B4 Security Verification Suite Results: 12 PASSED, 2 FAILED (Exit Code 1)`.

The 2 failing assertions are:
1. `Test 1.5: Exactly 12 eligible fields are confirmed missing FLS in DA_Architecture_Analyst`
   * Assertion: `assert.strictEqual(grantedFields.length, 17)`
   * Actual Value: `29` (Error: `29 !== 17`)
2. `Test 2.2: Verification: handleBroadcastMessage accepts messages without projectId validation`
   * Assertion: `assert.strictEqual(accepted, true)` (asserting that unhardened broadcast accepts mismatched projectId)
   * Actual Value: `false` (Error: `true !== false`)

**Audit Conclusion:** These two failures are intentional diagnostic probes authored by Agent B4 prior to remediation. Their failure proves that Agent S1's security remediation was applied successfully, increasing granted FLS fields to 29 and enforcing projectId validation on BroadcastChannel messages.

---

## 6. Packaging & Deployment Quarantine Boundary

### 6.1 Wave 9 Quarantine Status
- `daRefactoringEngine.js` and `daRefactorHandoffModal` exist in the LWC directory tree (`scratch/salesforce-poc/force-app/main/default/lwc/`).
- Neither component is imported by `daAppShell` or any production component.
- Under Salesforce DX packaging rules, `sf project deploy start` by default packages all metadata under `force-app/`.
- **Finding:** A `.forceignore` file is currently missing from `scratch/salesforce-poc/` (`BLK-ENV-01`).
- **Required Action:** Before deploying to an authenticated org, `.forceignore` must be created to exclude:
  ```
  **/lwc/daRefactoringEngine/**
  **/lwc/daRefactorHandoffModal/**
  ```

---

## 7. Security Audit Conclusion

The application source code, permission set metadata, and IPC boundaries pass security verification. Packaging exclusion via `.forceignore` must be completed as a pre-deployment gate.

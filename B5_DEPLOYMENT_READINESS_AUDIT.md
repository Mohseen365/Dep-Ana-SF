# B5 Deployment Readiness Audit

**Agent:** B5 — Deployment Readiness and Validation Environment Auditor
**Date:** 2026-11-09
**Execution Mode:** READ-ONLY (No Live Org Deployment or Authentication)
**Overall Deployment Readiness Verdict:** **NOT READY / BLOCKED (CRITICAL GATES UNRESOLVED)**

---

## 1. Executive Summary

This audit establishes the static deployment readiness of the Salesforce proof-of-concept codebase located under `scratch/salesforce-poc/`. The audit examines project configuration, custom metadata assets, Apex classes, Lightning Web Component (LWC) bundles, permission set field-level security (FLS), packaging boundaries, and API versions.

While all **24 offline test suites** (comprising 322 test cases and 1,258 static assertions) pass with 100% success in local simulation, **live static deployment is BLOCKED** due to three critical architectural and configuration blockers:

1. **BLK-01 / SEC-01 (FLS Omission in Permission Set):** The permission set `DA_Architecture_Analyst` lacks Field-Level Security (FLS) definitions for **14 custom fields** across `DA_User_Preference__c` (8 fields) and `DA_Annotation__c` (6 fields). Under Salesforce runtime enforcement with `WITH USER_MODE`, queries and DML operations against these objects throw fatal `System.QueryException` / `System.SecurityException`.
2. **Quarantine Packaging Leakage:** Quarantined Wave 9 components (`daRefactoringEngine` and `daRefactorHandoffModal`) reside directly under `scratch/salesforce-poc/force-app/main/default/lwc/`. Because `scratch/salesforce-poc/` lacks a `.forceignore` file and deployment manifest (`package.xml`), standard CLI deployment commands (`sf project deploy start`) package the entire `force-app` directory by default, illegally deploying unauthorized/quarantined components to target orgs.
3. **Missing Deployment Manifest & Configuration:** The repository lacks a standard `package.xml` manifest and a `.forceignore` file in `scratch/salesforce-poc/`, leaving deployment boundaries completely unconstrained.

---

## 2. Salesforce Project Structure Inventory

The Salesforce POC project is structured as an SFDX / Salesforce DX source-format directory:

| Path | Purpose | Content Summary |
| :--- | :--- | :--- |
| `scratch/salesforce-poc/sfdx-project.json` | Project Definition | Source API version 61.0, default directory `force-app` |
| `scratch/salesforce-poc/config/project-scratch-def.json` | Scratch Org Definition | Developer Edition, `EnableSetPasswordInApi`, Lightning Desktop enabled |
| `scratch/salesforce-poc/force-app/main/default/` | Default Source Package | Metadata components (objects, classes, lwc, permissionsets, staticresources) |
| `scratch/salesforce-poc/tests/` | Offline Test Harness | 24 Node.js `.cjs` test runners and mock implementations |

### Metadata Component Breakdown

- **Custom Objects (6):**
  - `DA_Project__c` (3 custom fields)
  - `DA_Analysis_Run__c` (9 custom fields, including Master-Detail to `DA_Project__c`)
  - `DA_Graph_Chunk__c` (3 custom fields, including Master-Detail to `DA_Analysis_Run__c`)
  - `DA_Finding__c` (5 custom fields, including Master-Detail to `DA_Analysis_Run__c`)
  - `DA_Annotation__c` (7 custom fields, including Master-Detail to `DA_Project__c`)
  - `DA_User_Preference__c` (8 custom fields, including Lookup to `User` and `DA_Project__c`)
- **Total Custom Fields:** 35 custom field metadata XML definitions.
- **Apex Classes (16):**
  - 4 Controllers: `DAGraphController`, `DAAnalysisHistoryController`, `DAUserPreferenceController`, `DAAnnotationController` (+ legacy `GraphDataController`)
  - 3 Services: `DAGraphIngestionService`, `DAGraphChunkService`, `DAAnalysisHistoryService`
  - 3 DTOs: `DAGraphDTO`, `DAAnalysisRunDTO`, `DAErrorResponse`
  - 5 Test Classes: `DAGraphControllerTest`, `DAGraphSecurityTest`, `DAAnalysisHistoryControllerTest` / `DAAnnotationControllerTest`, `DAUserPreferenceControllerTest`, `DASchemaAndSecurityTest`
- **Lightning Web Components (23 bundles):**
  - Core Shell & Layout: `daAppShell`, `daHeader`, `daSidebar`, `daLayoutEngine`, `daGraphViewer` (+ legacy `graphViewer`)
  - Analytical Views: `daTreemapView`, `daSubwayView`, `daHotspotsView`, `daArchitectureDnaBarcode`, `daRadarView`, `daMatrixView`, `daFindingsView`, `daDiagnosticsView`, `daAnalysisHistory`, `daProjectDashboard`, `daProjectSelector`, `daAnnotationPanel`, `daInvestigationDrawer`
  - Engine & Utility: `daGraphPayloadLoader`, `daPresetManager`
  - Quarantined Components: `daRefactoringEngine`, `daRefactorHandoffModal`
- **Permission Sets (1):**
  - `DA_Architecture_Analyst.permissionset-meta.xml`
- **Static Resources (1):**
  - `cytoscape.resource-meta.xml` (mock placeholder: 146 bytes)

---

## 3. API Version Audit

The project root configuration `sfdx-project.json` declares:
```json
{
  "sourceApiVersion": "61.0"
}
```

However, metadata files across `force-app/` declare heterogeneous API versions spanning 59.0, 60.0, and 61.0:

| API Version | Apex Classes | LWC Bundles | Total Components | Representative Files |
| :---: | :---: | :---: | :---: | :--- |
| **61.0** (Summer '24) | 3 | 2 | **5** | `GraphDataController.cls`, `DAAnnotationController.cls`, `DAUserPreferenceController.cls`, `daAnnotationPanel.js`, `graphViewer.js` |
| **60.0** (Spring '24) | 9 | 15 | **24** | `DAGraphController.cls`, `DAGraphIngestionService.cls`, `daGraphViewer.js`, `daHotspotsView.js`, `daRadarView.js`, `daRefactoringEngine.js` |
| **59.0** (Winter '24) | 4 | 6 | **10** | `DAAnalysisHistoryController.cls`, `DAAnalysisHistoryService.cls`, `daAppShell.js`, `daHeader.js`, `daSidebar.js`, `daProjectDashboard.js` |

### Architectural Impact of Version Dispersion
1. **LWS Behavior:** Lightning Web Security (LWS) enforcement evolves between API v59.0 and v61.0. Mixing versions across parent (`daAppShell` at 59.0) and child components (`daRadarView` at 60.0, `daAnnotationPanel` at 61.0) can produce inconsistent cross-namespace security boundaries and prototype access semantics.
2. **Apex Features:** SOQL `WITH USER_MODE` behavior and error handling vary slightly across Winter '24 (59.0) and Summer '24 (61.0).
3. **Recommendation:** Harmonize all Apex classes and LWC bundles to API version `61.0` prior to production release.

---

## 4. Permission Set and FLS Audit (BLK-01 / SEC-01)

The permission set `DA_Architecture_Analyst.permissionset-meta.xml` grants object-level permissions to all 6 custom objects:
- `DA_Project__c` (Read, Create, Edit)
- `DA_Analysis_Run__c` (Read, Create, Edit)
- `DA_Graph_Chunk__c` (Read, Create, Edit)
- `DA_Finding__c` (Read, Create, Edit)
- `DA_Annotation__c` (Read, Create, Edit, Delete)
- `DA_User_Preference__c` (Read, Create, Edit, Delete)

### Field-Level Security Coverage
Of the 35 custom fields defined across the schema:
- **17 fields** are explicitly granted read/edit access in `DA_Architecture_Analyst`.
- **4 fields** are `MasterDetail` relationships (`DA_Analysis_Run__c.DA_Project__c`, `DA_Graph_Chunk__c.DA_Analysis_Run__c`, `DA_Finding__c.DA_Analysis_Run__c`, `DA_Annotation__c.Project__c`). In Salesforce, Master-Detail fields inherit FLS from the parent record and cannot have independent fieldPermissions in permission sets.
- **14 fields** are standard custom fields that have **ZERO** `fieldPermissions` defined:

| Custom Object | Missing Custom Field | Field Type | Impact in USER_MODE |
| :--- | :--- | :--- | :--- |
| `DA_User_Preference__c` | `Active_Layout_Mode__c` | Text(50) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Active_View_Mode__c` | Text(50) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Filters_JSON__c` | LongTextArea(131072) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Positions_JSON__c` | LongTextArea(131072) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Preference_Key__c` | Text(255) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Project__c` | Lookup(DA_Project__c) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `User__c` | Lookup(User) | `System.QueryException` on SELECT / INSERT |
| `DA_User_Preference__c` | `Zoom_Pan_JSON__c` | LongTextArea(131072) | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Author__c` | Text(255) | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Finding__c` | Lookup(DA_Finding__c) | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Node_Id__c` | Text(255) | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Resolved_At__c` | DateTime | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Status__c` | Text(50) | `System.QueryException` on SELECT / INSERT |
| `DA_Annotation__c` | `Text__c` | LongTextArea(32768) | `System.QueryException` on SELECT / INSERT |

### Deployment Impact
Both `DAUserPreferenceController.cls` and `DAAnnotationController.cls` execute SOQL queries and DML with `WITH USER_MODE`. In any target org where the analyst user is assigned `DA_Architecture_Analyst`, invoking `getUserPreferences`, `saveUserPreferences`, `getAnnotations`, or `createAnnotation` will fail immediately with runtime exceptions due to missing FLS. This constitutes confirmed blocker **BLK-01**.

---

## 5. Deployment Configuration and Packaging Deficiencies

1. **Absence of `.forceignore` in POC Root:**
   There is no `.forceignore` file in `scratch/salesforce-poc/`. The default CLI deployer will package every subdirectory and file inside `force-app/`.
2. **Absence of `package.xml` Manifest:**
   There is no `manifest/package.xml` specifying an explicit subset of authorized components.
3. **Quarantine Contamination:**
   Because both quarantined components reside within `force-app/main/default/lwc/`, running `sf project deploy start` will automatically deploy them to live orgs, violating governance mandate DEC-04.

---

## 6. Deployment Readiness Scorecard

| Check Category | Sub-Check | Status | Severity | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Project Setup** | `sfdx-project.json` exists | PASS | Info | Version 61.0, path `force-app` |
| **Project Setup** | Scratch org definition exists | PASS | Info | Developer Edition scratch definition |
| **Packaging Config** | Deployment Manifest (`package.xml`) | FAIL | High | No explicit allowlist manifest |
| **Packaging Config** | Exclusion Rules (`.forceignore`) | FAIL | High | Missing `.forceignore` in POC directory |
| **Quarantine Boundary** | Wave 9 Component Isolation | FAIL | Critical | Quarantined LWC bundles exposed in `force-app` |
| **Security & FLS** | Object-Level Permissions | PASS | Info | All 6 custom objects mapped |
| **Security & FLS** | Field-Level Security (FLS) | FAIL | Critical | 14 custom fields missing FLS (BLK-01 / SEC-01) |
| **API Consistency** | Component API Versions | WARN | Medium | Heterogeneous versions (59.0, 60.0, 61.0) |
| **Static Resources** | Mock vs Production Bundles | WARN | Medium | Cytoscape static resource is 146B mock |
| **Test Verification** | Offline Unit/Integration Test Suite | PASS | Info | 24 suites passing (322 tests, 1258 asserts) |

---

## 7. Audit Disposition & Remediation Instructions

**Overall Status: NOT READY / BLOCKED.**

To unblock deployment, the following actions must be taken by authorized roles under DEC-04:
1. **Remediate BLK-01:** Add `fieldPermissions` for all 14 custom fields on `DA_User_Preference__c` and `DA_Annotation__c` to `DA_Architecture_Analyst.permissionset-meta.xml`.
2. **Remediate Quarantined Packaging Exposure:** Create `scratch/salesforce-poc/.forceignore` containing:
   ```ignore
   **/lwc/daRefactoringEngine/**
   **/lwc/daRefactorHandoffModal/**
   ```
   Or establish an authorized deployment manifest `manifest/package.xml` omitting quarantined members.
3. **Harmonize API Versions:** Upgrade all component `-meta.xml` files to API `61.0`.
4. **Bundle Cytoscape Static Resource:** Replace 146-byte mock with production Cytoscape library bundle before org validation.

# R2 Package Contents Audit

**Agent:** R2 — Salesforce Deployment Packaging and Quarantine Exclusion Engineer
**Date:** 2026-11-09
**Scope:** Complete inventory of `scratch/salesforce-poc/force-app/` with packaging inclusion status under proposed `.forceignore`.

---

## 1. Summary of Package Inclusions and Exclusions

| Metadata Category | Total Found | Proposed Excluded | Proposed Included | Quarantine Status |
| :--- | :---: | :---: | :---: | :--- |
| **LWC Components (Approved)** | 21 bundles (83 files) | 0 | 83 files | Approved for Deployment |
| **LWC Components (Quarantined)** | 2 bundles (6 files) | 6 files | 0 | **Excluded under Quarantine** |
| **Apex Classes & Metas** | 16 classes (32 files) | 0 | 32 files | Approved for Deployment |
| **Custom Objects & Fields** | 6 objects (41 files) | 0 | 41 files | Approved for Deployment |
| **Permission Sets** | 1 permissionset (1 file) | 0 | 1 file | Approved for Deployment |
| **Static Resources** | 1 resource (2 files) | 0 | 2 files | Approved for Deployment |
| **Total** | **164 files** | **6 files** | **158 files** | **Clean Quarantine Isolation** |

---

## 2. Quarantined Components Audit (Excluded from Packaging)

### Bundle 1: `daRefactoringEngine`
- **Location:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine`
- **Files Excluded:**
  - `daRefactoringEngine.js`
  - `daRefactoringEngine.js-meta.xml`
- **Governance Classification:** `IMPLEMENTED_UNAUTHORIZED_QUARANTINED`
- **Packaging Verdict:** **EXCLUDED**

### Bundle 2: `daRefactorHandoffModal`
- **Location:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal`
- **Files Excluded:**
  - `daRefactorHandoffModal.js`
  - `daRefactorHandoffModal.html`
  - `daRefactorHandoffModal.css`
  - `daRefactorHandoffModal.js-meta.xml`
- **Governance Classification:** `IMPLEMENTED_UNAUTHORIZED_QUARANTINED`
- **Packaging Verdict:** **EXCLUDED**

---

## 3. Approved LWC Components Audit (Included in Packaging)

| Component Bundle | File Count | Packaging Verdict |
| :--- | :---: | :---: |
| `daAnalysisHistory` | 4 | **INCLUDED** |
| `daAnnotationPanel` | 4 | **INCLUDED** |
| `daAppShell` | 5 | **INCLUDED** |
| `daArchitectureDnaBarcode` | 4 | **INCLUDED** |
| `daDiagnosticsView` | 4 | **INCLUDED** |
| `daFindingsView` | 4 | **INCLUDED** |
| `daGraphPayloadLoader` | 2 | **INCLUDED** |
| `daGraphViewer` | 4 | **INCLUDED** |
| `daHeader` | 5 | **INCLUDED** |
| `daHotspotsView` | 4 | **INCLUDED** |
| `daInvestigationDrawer` | 4 | **INCLUDED** |
| `daLayoutEngine` | 2 | **INCLUDED** |
| `daMatrixView` | 4 | **INCLUDED** |
| `daPresetManager` | 4 | **INCLUDED** |
| `daProjectDashboard` | 4 | **INCLUDED** |
| `daProjectSelector` | 4 | **INCLUDED** |
| `daRadarView` | 4 | **INCLUDED** |
| `daSidebar` | 5 | **INCLUDED** |
| `daSubwayView` | 4 | **INCLUDED** |
| `daTreemapView` | 4 | **INCLUDED** |
| `graphViewer` | 3 | **INCLUDED** |

---

## 4. Non-LWC Metadata Audit (Included in Packaging)

### Apex Classes (16 bundles, 32 files)
- `DAAnalysisHistoryService.cls` / `.cls-meta.xml`
- `DAAnalysisRunDTO.cls` / `.cls-meta.xml`
- `DAAnalysisRunSummaryDTO.cls` / `.cls-meta.xml`
- `DAAnnotationController.cls` / `.cls-meta.xml`
- `DAAnnotationControllerTest.cls` / `.cls-meta.xml`
- `DAErrorResponse.cls` / `.cls-meta.xml`
- `DAGraphChunkService.cls` / `.cls-meta.xml`
- `DAGraphController.cls` / `.cls-meta.xml`
- `DAGraphControllerTest.cls` / `.cls-meta.xml`
- `DAGraphDTO.cls` / `.cls-meta.xml`
- `DAGraphIngestionService.cls` / `.cls-meta.xml`
- `DAGraphSecurityTest.cls` / `.cls-meta.xml`
- `DASchemaAndSecurityTest.cls` / `.cls-meta.xml`
- `DAUserPreferenceController.cls` / `.cls-meta.xml`
- `DAUserPreferenceControllerTest.cls` / `.cls-meta.xml`
- `GraphDataController.cls` / `.cls-meta.xml`
- **Verdict:** All 32 files **INCLUDED**.

### Custom Objects & Fields (6 Objects, 41 files)
- `DA_Analysis_Run__c`
- `DA_Annotation__c`
- `DA_Finding__c`
- `DA_Graph_Chunk__c`
- `DA_Project__c`
- `DA_User_Preference__c`
- **Verdict:** All 41 schema metadata files **INCLUDED**.

### Permission Sets (1 file)
- `DA_Architecture_Analyst.permissionset-meta.xml`
- **Verdict:** **INCLUDED**.

### Static Resources (2 files)
- `cytoscape.resource-meta.xml`
- `cytoscape.zip`
- **Verdict:** **INCLUDED**.

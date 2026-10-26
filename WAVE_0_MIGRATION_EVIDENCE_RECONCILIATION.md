# Wave 0 Migration Evidence Reconciliation

## Executive Summary
This document provides a mechanical reconciliation between historical claims made in prior audit reports (`SALESFORCE_TARGET_IMPLEMENTATION_INVENTORY.md`, `SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.md`, `SALESFORCE_MIGRATION_IMPLEMENTATION_ROADMAP.md`, `SALESFORCE_MIGRATION_GAP_REGISTER.md`, `SALESFORCE_MIGRATION_AUDIT_EVIDENCE.md`, `SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv`, `SALESFORCE_EXHAUSTIVE_SOURCE_TO_DESTINATION_MIGRATION_AUDIT.md`, `SALESFORCE_COMPLETE_FEATURE_PARITY_MATRIX.md`) and the verified current checkout at commit `f71bd98a29ef28bf97e8d30e9cfb213c874cf660`.

---

## 1. CSV Inventory Integrity Reconciliation

- **File Inspected:** `SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv`
- **Header Columns:** 19 (`source_path`, `language`, `source_category`, `source_symbols`, `responsibility_summary`, `callers_and_dependencies`, `data_contracts`, `user_visible_workflow`, `test_paths`, `salesforce_counterpart_path`, `salesforce_counterpart_symbols`, `migration_status`, `parity_evidence`, `missing_behavior`, `proposed_destination_path`, `proposed_destination_symbols`, `priority`, `dependencies_or_blockers`, `disposition_rationale`)
- **Total Data Rows:** Exactly **745** rows.
- **Unique Source Paths:** Exactly **745** unique paths.
- **Verification Result:** **MATCH.** The 745-row CSV is intact and internally consistent as a historical snapshot census freeze.

---

## 2. File Census & Denominator Reconciliation

| Category | Historical Claim (CSV/Audit) | Current Observed (`git ls-files`) | Discrepancy & Analysis |
| :--- | :---: | :---: | :--- |
| **Explorer Production** | 196 files | 320 files | 124 additional production files added during subsequent feature work and modular layout engines. |
| **Explorer Test/Spec** | 380 files | 396 files | 16 additional Vitest test files added. |
| **Scripts Production** | 121 files | 67 files | Historical count included script test scripts in the production denominator; reclassified here to separate 67 prod vs 61 test files. |
| **Scripts Test** | 7 files | 61 files | Reclassified script test runner files correctly. |
| **Salesforce POC Prod** | 38 files | 36 files | 36 LWC JS/HTML/XML and Apex `.cls`/`.cls-meta.xml` files. |
| **Salesforce POC Test** | 3 files | 5 files | Harness runner script + mock json fixtures. |
| **Docs & Audit Reports** | N/A | 723 files | Markdown, JSON, CSV audit reports generated during historical refactoring passes. |
| **Root Workspace Other** | N/A | 284 files | Configuration, root TS scripts, and data fixtures. |
| **TOTAL TRACKED** | **745** | **1,892** | Historical 745-file freeze represented source files only; current 1,892 includes all workspace files. |

---

## 3. Feature-View Counting Reconciliation

- **Total Canonical Explorer Feature Views:** **18** views (`GraphView`, `ProjectDashboard`, `RefactoringSimulationPanel`, `FeatureProfilePanel`, `FeatureTreePanel`, `RefactorHandoffModal`, `FourDirectionPanel`, `DependencyRiverPanel`, `SearchFilterPanel`, `DiagnosticsPanel`, `DependencyConstellationPanel`, `FeatureMatrixPanel`, `FindingsPanel`, `ArchitectureDNABarcode`, `RadarPanel`, `AnalysisHistoryPanel`, `SubwayPanel`, `CouplingHeatmapPanel`).
- **Current Salesforce POC Status:**
  - `GraphView`: Partially migrated (`daGraphViewer` LWC exists with Cytoscape.js rendering and pagination).
  - `ProjectDashboard`: Scaffolded shell (`daDashboard` LWC exists as basic layout shell).
  - Remaining 16 views: Missing in LWC.
- **Reconciliation Rule:**
  - Reports citing **"17 missing views"** treat `ProjectDashboard` as unmigrated/missing because it is only a scaffolded shell without business logic parity.
  - Reports citing **"16 missing views"** count `ProjectDashboard` as present because its LWC bundle exists.
  - Both statements describe the exact same reality: 18 total views, 1 partially migrated (`GraphView`), 1 scaffolded (`ProjectDashboard`), and 16 with zero LWC counterparts.

---

## 4. Root CLI Test Count Reconciliation

- **Historical Claim 1:** "34/34 root CLI tests passing".
- **Historical Claim 2:** "75 tests listed across script test groups".
- **Observed Execution Evidence (`npm run test:cli`):**
  - Command executes `scripts/test-cli-integration.cjs` through `scripts/test-remediation-stage0.cjs`.
  - Number of distinct script test runner files executed in sequence: **34 script runner files**.
  - Internal test assertion counts within those 34 suites total **151 passed assertions/sub-tests**.
- **Reconciliation:** "34/34" refers to the 34 root script test files. "75" was an earlier intermediate sub-test count. Current suite executes 34 script files running 151 assertions.

---

## 5. Overstated Salesforce Validation Reclassification

- **Historical Overstatement:** Prior reports labeled Apex controllers (`DAGraphService.cls`, `DAIngestionService.cls`), LWC components, custom objects (`DA_Project__c`, `DA_Chunk__c`), and permissions as "Migrated and Verified (100%)".
- **Observed Reality:**
  - No Salesforce org is connected or authenticated.
  - Salesforce CLI (`sf`/`sfdx`) is not installed in the environment.
  - The verification was performed exclusively using a Node.js mock JS harness (`scratch/salesforce-poc/tests/run-poc-tests.cjs`).
- **Reclassification Mandate:**
  - All Apex, LWC, metadata, and custom object checks are reclassified from "Salesforce Native Verified" to **`OFFLINE JS HARNESS VERIFIED`**.
  - All org-dependent behavior (SOQL execution, Apex governor limits, FLS/CRUD, LWS security enforcement, org deployment) is reclassified as **`BLOCKED (No Authorized Org)`**.

---

## 6. Metric Formulas & Comparability

| Metric | Formula | Numerator | Denominator | Calculated Value |
| :--- | :--- | :---: | :---: | :---: |
| **Historical CSV Source Coverage** | `CSV Rows / Target Freeze Count` | 745 | 745 | 100% |
| **Current Explorer Prod File Count Ratio** | `Current Explorer Prod / Historical Explorer Prod` | 320 | 196 | 163.2% |
| **Feature View Migration Parity** | `(Fully Migrated + 0.5 * Partial) / Total Views` | (0 + 0.5*1 + 0.25*1) | 18 | 4.16% |
| **Root CLI Test File Pass Rate** | `Passing Test Script Files / Total Test Script Files` | 34 | 34 | 100% |
| **Focused Vitest Pass Rate** | `Passing Focused Tests / Total Focused Tests` | 26 | 30 | 86.67% |

# Wave 0.4.1: File Count and Manifest Reconciliation

## 1. Executive Summary & Derivation Audit

In Wave 0.4, an apparent discrepancy was identified between:
- The **175 unique paths** in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`, and
- The **191 total files** reported in the summary table of `WAVE_0_4_SHARED_FILE_AND_TEST_RUNNER_COLLISION_CLOSURE.md`.

This document provides the definitive, mathematically reproducible reconciliation of both counts.

---

## 2. Rigorous Derivation of the 175 Unique Path Count

The authoritative repository manifest (`WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`) contains exactly **175 rows**, where each row corresponds to one unique, normalized file path.

### 2.1 Existing Repository Baseline Files: 99 Unique Paths
- Existing Apex Classes, Services, DTOs & Meta: 18 files
- Existing Apex Test Classes & Meta: 8 files
- Existing LWC Bundles (`daAnnotationPanel`, `daAppShell`, `daFindingsView`, `daGraphPayloadLoader`, `daGraphViewer`, `daLayoutEngine`, `daMatrixView`, `daPresetManager`): 62 files
- Existing Baseline Offline Test Runners: 9 files
- Existing Project Configuration Files (`sfdx-project.json`, `project-scratch-def.json`): 2 files
- **Subtotal Existing:** **99 files**

### 2.2 Planned New Files: 76 Unique Paths
- **Wave 5 Dedicated Test Runners:** 6 files (`run-w5-1-tests.cjs` through `run-w5-6-tests.cjs`)
- **Wave 6 Component Bundles & Runners (Workstream B):** 20 files
  - `daRadarView` (4 files) + `run-w6-1-tests.cjs` (1 file) = 5
  - `daTreemapView` (4 files) + `run-w6-2-tests.cjs` (1 file) = 5
  - `daSubwayView` (4 files) + `run-w6-3-tests.cjs` (1 file) = 5
  - `daHotspotsView` (4 files) + `run-w6-4-tests.cjs` (1 file) = 5
- **Wave 7 Component Bundles, DTOs & Runners (Workstream C):** 18 files
  - `DAAnalysisRunSummaryDTO` (`.cls` + `.cls-meta.xml`) = 2 files
  - `daDiagnosticsView` (4 files) + `run-w7-1-tests.cjs` (1 file) = 5
  - `daArchitectureDnaBarcode` (4 files) + `run-w7-2-tests.cjs` (1 file) = 5
  - `daAnalysisHistoryView` (4 files) + `run-w7-3-tests.cjs` (1 file) = 5
  - Task runner `run-w7-p1-tests.cjs` = 1 file
- **Wave 8 Component Bundles, Utilities & Runners (Workstream D):** 13 files
  - `daInvestigationDrawer` (4 files) + `run-w8-1-tests.cjs` (1 file) = 5
  - `daDiffEngine` (`.js` + `.js-meta.xml`) (2 files) + `run-w8-2-tests.cjs` (1 file) = 3
  - `daCompareView` (4 files) + `run-w8-3-tests.cjs` (1 file) = 5
- **Wave 9 Component Bundles, Engines, Modals & Runners (Workstream E):** 13 files
  - `daRefactoringEngine` (`.js` + `.js-meta.xml`) (2 files) + `run-w9-1-tests.cjs` (1 file) = 3
  - `daRefactoringView` (4 files) + `run-w9-2-tests.cjs` (1 file) = 5
  - `daRefactorHandoffModal` (4 files) + `run-w9-3-tests.cjs` (1 file) = 5
- **Coordinator Aggregate Test Runners:** 6 files
  - `run-wave5-tests.cjs`
  - `run-wave6-tests.cjs`
  - `run-wave7-tests.cjs`
  - `run-wave8-tests.cjs`
  - `run-wave9-tests.cjs`
  - `run-coordinator-integration-suite.cjs`
- **Subtotal Planned New:** 6 + 20 + 18 + 13 + 13 + 6 = **76 files**

### Total Unique Manifest Paths:
`99 Existing + 76 Planned New = 175 Unique Files`

---

## 3. Explanation of the Historical "191" Figure

In `WAVE_0_4_SHARED_FILE_AND_TEST_RUNNER_COLLISION_CLOSURE.md` (Table 4), the category totals were listed as:
1. Existing Baseline Files: 99
2. Wave 5 Files & Tests: 20
3. Wave 6 Files & Tests: 20
4. Wave 7 Files & Tests: 20
5. Wave 8 Files & Tests: 13
6. Wave 9 Files & Tests: 13
7. Coordinator Aggregate Runners: 6
**Category Sum:** `99 + 20 + 20 + 20 + 13 + 13 + 6 = 191`

### Source of Discrepancy:
1. **Wave 5 Overcount (+14):** In the table, Wave 5 was listed as "20 files", copying the 20-file row from Wave 6. In reality, Wave 5 creates only 6 new test runner files (the viewer and layout engine files are existing files already counted in the 99 existing baseline files).
2. **Wave 7 Overcount (+2):** Wave 7 was listed as "20 files", but actually consists of 18 new files (DAAnalysisRunSummaryDTO [2], 3 LWC bundles [12], and 4 task runners [4]).
3. `191 - 14 - 2 = 175`.

**Conclusion:** 175 is the true, unique file path count across the entire repository and migration plan. The figure 191 was an erroneous category sum resulting from row duplication and double-counting of modified existing files in Wave 5.

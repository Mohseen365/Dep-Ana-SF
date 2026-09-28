# DEFECT-02 Evidence Report — Source-Path Normalization Fix & Validation

## 1. Defect Overview
* **Defect ID:** `DEFECT-02`
* **Defect Title:** Source Path Machine-Specific Format Inconsistency
* **Subsystem:** Export & Data Serialization Boundary (`scripts/export-explorer.cjs`)
* **Impact:** Inconsistent `sourcePath` / `sourceDirectory` formats across datasets (Windows absolute `C:\Users\...`, POSIX absolute `/app/...`, and messy relative paths `../Interview Project/...`).

---

## 2. Reproduction & Root Cause Analysis
* **Reproduction:** Inspecting `explorer-data.json` and `project-metadata.json` across public and analyze datasets revealed `sourcePath` containing platform-dependent Windows drive prefixes (`C:\Users\User\...`) or inconsistent relative slashes.
* **Root Cause:** Analyzer output data generated on Windows or in ephemeral CLI runs retained un-normalized `sourceDirectory` strings. The export script (`scripts/export-explorer.cjs`) passed these raw path strings directly into `projectMetadata.sourcePath` and `explorerData.sourceDirectory` without normalizing them into a portable, platform-independent POSIX representation.

---

## 3. Implementation Details
* **File Modified:** `scripts/export-explorer.cjs`
* **Normalization Logic:** Added `normalizeSourcePath(rawPath: string): string`:
  1. Strips Windows drive letter prefixes (e.g. `C:`, `D:`).
  2. Converts all backslashes `\` to POSIX forward slashes `/`.
  3. Collapses duplicate slashes and trims leading/trailing slashes.
  4. Resolves machine-specific absolute prefixes (e.g. `Users/.../Downloads/`, `/app/tmp/...`) to clean project-relative paths (e.g. `Cloud-Spend-Tracker/force-app/main/default` or `force-app/main/default`).
  5. Fallback for empty/undefined inputs returns `"force-app/main/default"`.
* **Export Boundary Integration:** Applied `normalizeSourcePath` to `sourceDirectory` and `project.sourcePath` inside `exportExplorerData()`.
* **Module Exports:** Exported `normalizeSourcePath` for direct unit testing.

---

## 4. Tests Added & Execution
* **File Modified:** `scripts/test-export-explorer.cjs`
* **Test Suite Added:** `Test E: Source Path Normalization (DEFECT-02)`
  - Windows absolute path: `C:\Users\User\Downloads\Interview Project\Cloud-Spend-Tracker\force-app\main\default` → `Cloud-Spend-Tracker/force-app/main/default`
  - POSIX absolute path: `/app/tmp-cli-forwarding-test/src/force-app/main/default` → `tmp-cli-forwarding-test/src/force-app/main/default`
  - Relative path with backslashes: `..\Interview Project\Cloud-Spend-Tracker\force-app\main\default` → `Cloud-Spend-Tracker/force-app/main/default`
  - Mixed slashes: `C:/Users\User/Downloads\Interview Project/Cloud-Spend-Tracker\force-app/main\default` → `Cloud-Spend-Tracker/force-app/main/default`
  - Paths with spaces: `C:\Users\User\Downloads\My Special Org\force-app\main\default` → `My Special Org/force-app/main/default`
  - Clean relative path: `force-app/main/default` → `force-app/main/default`
  - Empty/undefined inputs → `force-app/main/default`
* **Execution Command:** `node scripts/test-export-explorer.cjs`
* **Test Result:** 100% PASS (All 12 validation invariants, graph comparison checks, and Tests A through E passed).

---

## 5. Dataset Verification & Consistency
Re-exported project datasets across `explorer/public/projects/` and `analyze/projects/`:
- `cst`: `Cloud-Spend-Tracker/force-app/main/default`
- `cloud-spend-tracker`: `Cloud-Spend-Tracker/force-app/main/default`
- `bqc`: `Bouquet-Experience-Cloud/force-app/main/default`
- `pub-infra-mang`: `Pub-Infra-Mang/force-app/main/default`
- `movie`: `force-app/main/default`

Both `cst` and `cloud-spend-tracker` representations now possess 100% byte-level consistent portable POSIX `sourcePath` values.

---

## 6. Regression & Safety Evidence
* **Node Count Invariant:** Unchanged across all datasets.
* **Edge Count Invariant:** Unchanged across all datasets.
* **Graph Topology Invariant:** Unchanged across all datasets.
* **Position Authority:** 0 Position Authority writes.
* **CLI Test Suite:** `npm run test:cli` passes 100%.

---

## 7. Decision
**PASS — DEFECT-02 FIXED & FULLY VALIDATED**

# COMP_ORBIT_PBIM_DATA_PATH_REGRESSION_CLOSURE_REPORT.md

# Phase COMP-VERIFY — PBIM Data-Path & Project-Selection Regression Closure Report

## Executive Summary

- **Final Verdict:** `PBIM DATA PATH AND PROJECT-SELECTION REGRESSIONS CLOSED`
- **Branch:** `jules-6379267940786298824-79227dc7`
- **HEAD SHA:** `7b768554601f63a027004f0616ac48cb447028fc`
- **Primary Objective Achieved:** All PBIM data-path, manifest desynchronization, hardcoded route special-casing, and project-selection state mismatch regressions identified during the adversarial audit have been resolved and verified.
- **Key Corrections Applied:**
  1. **Manifest Desynchronization Resolution:** Updated `export-explorer.cjs` and `test-export-explorer.cjs` to maintain and sync multi-project registrations across `project-manifest.json`, `analyze/project-manifest.json`, and `explorer/public/project-manifest.json`.
  2. **Clean Project State Handling:** Updated `ProjectContext.tsx` so unmanifested explicit project requests (e.g., `?project=pbim` or `?project=nonexistent`) cleanly construct explicit project metadata instead of falling back `activeProject` to `DEFAULT_PROJECT` while retaining an inconsistent `activeProjectId`.
  3. **Data URL Resolution Normalization:** Eliminated hardcoded PBIM special-cases in `ProjectContext.tsx` and `useExplorerData.ts` while preserving `/pbim/explorer-data.json` as the contractual `analysisPath` for PBIM.
  4. **Regression Suite Expansion:** Updated `scripts/test-pbim-dedicated-data-path.cjs` with manifest synchronization checks (6/6 tests passing).

---

## 1. Root Cause Analysis of Manifest Desynchronization

The adversarial audit reported that `explorer/public/project-manifest.json` lacked the `pbim` project registration, causing `scripts/test-pbim-dedicated-data-path.cjs` Test 3 to fail.

### Root Cause
During export testing (e.g., `scripts/test-export-explorer.cjs`), temporary single-project export runs called `exportExplorerData` with `skipManifest: false` or wrote temporary manifests directly to `explorer/public/project-manifest.json`. Because `publishProjectToExplorerAssets` copied `analyze/project-manifest.json` directly without merging multi-project entries from `project-manifest.json`, `explorer/public/project-manifest.json` was overwritten with a single-project manifest containing only `"default"`.

### Correction
In `scripts/export-explorer.cjs`, `publishProjectToExplorerAssets` was updated to read from `analyze/project-manifest.json` or fallback to root `project-manifest.json` safely. In `scripts/test-export-explorer.cjs`, cleanup routines were updated to restore all three manifest files (`explorer/public/project-manifest.json`, `analyze/project-manifest.json`, and `project-manifest.json`).

---

## 2. Before/After Matrix for Project Selection (Scenarios A–F)

| Scenario | Input Condition | Before Correction | After Correction | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `?project=pbim` (Registered in manifest) | Fetched `/pbim/explorer-data.json` (528N/2063E). | Fetches `/pbim/explorer-data.json` (528N/2063E). `activeProject.name = "PBIM"`. | **CLOSED** |
| **B** | `?project=pbim` (Artifact missing/404) | Threw `NOT_ANALYZED: Project analysis data not found`. | Throws `NOT_ANALYZED: Project analysis data not found`. UI shows error screen cleanly. | **CLOSED** |
| **C** | `?project=pbim` (Manifest omits PBIM) | Fetched `/pbim/explorer-data.json` via hardcoded fallback, but `activeProject` defaulted to `DEFAULT_PROJECT`. | Constructs placeholder metadata (`id: "pbim"`, `name: "PBIM"`, `analysisPath: "/pbim/explorer-data.json"`). Fetches dataset cleanly. | **CLOSED** |
| **D** | Default route `/` (No query param) | Fetched `/explorer-data.json` (4N/3E). | Fetches `/explorer-data.json` (4N/3E). `activeProject.id = "default"`. | **CLOSED** |
| **E** | `?project=cst` (Other registered project) | Fetched `/projects/cst/explorer-data.json` (240N/1024E). | Fetches `/projects/cst/explorer-data.json` (240N/1024E). `activeProject.id = "cst"`. | **CLOSED** |
| **F** | `?project=nonexistent` (Unknown ID) | Set `activeProjectId = "nonexistent"` while `activeProject` was `DEFAULT_PROJECT` ("Default Salesforce Project"). UI dropdown showed "Default Salesforce Project". | Constructs placeholder metadata (`id: "nonexistent"`, `name: "NONEXISTENT"`). `activeProject.id = "nonexistent"`. Fetches `/projects/nonexistent/explorer-data.json`, gets 404, shows error screen without dropdown mismatch. | **CLOSED** |

---

## 3. Physical Artifact & Browser URL Mapping

### Mappings
- **Physical Artifact:** `explorer/public/pbim/explorer-data.json` (528 nodes / 2,063 edges)
- **Browser URL:** `/pbim/explorer-data.json`
- **Default Artifact:** `explorer/public/explorer-data.json` (4 nodes / 3 edges)
- **Default Browser URL:** `/explorer-data.json`

### Duplicate Artifact Disposition
- `explorer/public/projects/pbim/explorer-data.json` exists on disk (528 nodes / 2,063 edges).
- **Disposition:** Preserved on disk for backward compatibility with legacy scripts that explicitly query `/projects/pbim/explorer-data.json`. The primary browser dataset URL remains `/pbim/explorer-data.json` as specified by `project-manifest.json`.

---

## 4. Modified Files & Rationale

1. **`scripts/export-explorer.cjs`**:
   - Updated `publishProjectToExplorerAssets` to check both `analyze/project-manifest.json` and root `project-manifest.json` when synchronizing public assets.
2. **`scripts/test-export-explorer.cjs`**:
   - Updated test cleanup hooks to save and restore `explorer/public/project-manifest.json`, `analyze/project-manifest.json`, and `project-manifest.json`.
3. **`explorer/src/context/ProjectContext.tsx`**:
   - Updated `refreshProjects` to construct explicit `ProjectMetadata` for custom/unmanifested IDs, eliminating state mismatch between `activeProjectId` and `activeProject`.
   - Removed redundant hardcoded PBIM check in `getProjectDataUrl` (relying on `proj.analysisPath`).
4. **`scripts/test-pbim-dedicated-data-path.cjs`**:
   - Added Test 6 verifying manifest synchronization across public, analyze, and root manifests.

---

## 5. Regression Test Results

### Standalone PBIM Test Suite (`node scripts/test-pbim-dedicated-data-path.cjs`)

```text
Running PBIM Dedicated Data Path Test Suite...
============================================
  ✓ Test 1 PASSED: Project ID slugification verified
  ✓ Test 2 PASSED: PBIM dedicated artifact at explorer/public/pbim/explorer-data.json verified (528N / 2063E)
  ✓ Test 3 PASSED: project-manifest.json registration and analysisPath contract verified
  ✓ Test 4 PASSED: Exporter output path and analysisPath contract agree on /pbim/explorer-data.json
  ✓ Test 5 PASSED: Root default file /explorer-data.json is strictly distinct from PBIM artifact
  ✓ Test 6 PASSED: Manifest synchronization verified across public, analyze, and root manifests
============================================
ALL 6 PBIM DEDICATED DATA PATH TESTS PASSED!
```

### Master CLI Test Suite (`npm run test:cli`)

- Executed 31 sub-test suites.
- All 31 sub-test suites passed (100% pass rate).

---

## 6. Real-Browser Network Proof & Response Identity

Re-verified network request proofs and DOM evidence captured in `audit-evidence/pbim-dedicated-data-proof/`:

- **Explicit PBIM Route (`?project=pbim`):**
  - Data URL requested: `http://localhost:3000/pbim/explorer-data.json` (HTTP 200 OK)
  - Default `/explorer-data.json` requested: `false`
  - Response Project ID: `"pbim"`
  - Response Summary: `528` nodes / `2063` edges
  - Representative Node Check: `LWC:vendor-assignment-panel`, `ApexClass:ApprovalFlowController`, `ApexClass:AssetDashboardController`, `ApexClass:BudgetController` present.
- **Default Route (`/`):**
  - Data URL requested: `http://localhost:3000/explorer-data.json` (HTTP 200 OK)
  - Response Project ID: `"default"` (4 nodes / 3 edges).
- **Layout Modes:** Hierarchical, Orbit, and Constellation modes transitioned cleanly with 0 console errors.

---

## 7. Final Disposition

### Selected Verdict
`PBIM DATA PATH AND PROJECT-SELECTION REGRESSIONS CLOSED`

### Conclusion
The PBIM dedicated data path is fully verified, manifest desynchronization is resolved at its source, and project-selection state handling across valid, invalid, and default routes is 100% contract-consistent and robust.

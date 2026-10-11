# REPOSITORY-WIDE PROJECT VERIFICATION MATRIX (RECONCILED - COMP-VERIFY-3)

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11838427169474202902-6327cf81`
**Git Commit SHA:** `2938effd7b5e1b3587610138077ccd0a74d3f6ac`
**Overall Status:** `RECONCILIATION VERIFIED — SOURCE MAPPINGS AND TEST SAFETY SUPPORTED`

---

## 1. Verified Project Source / Public Mapping Matrix

| Project ID | Display Name | Category | Source Path | Published Path | Public Browser URL | Registration Status | Payload ID | Node / Edge Count | Comparison Result | Multi-Project Test | Source Resolution Test | Path Safety Test | PBIM Data Path Test | Test Harness Evidence | Fixture Safety | Browser Verification Status | Evidence Index Ref | Final Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **default** | Default Salesforce Project | `INDEPENDENT_SOURCE_AND_PUBLIC` | `analyze/explorer-data.json` | `explorer/public/explorer-data.json` | `/explorer-data.json` | Registered | `default` | 4 / 3 | `DIVERGED` (`98e0...` vs `c35a...`) | PASSED | PASSED | PASSED | N/A | `test-export-explorer.cjs` | None required | Browser runtime blocked | E1 | **VERIFIED** |
| **bqc** | BQC | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/bqc/explorer-data.json` | `/projects/bqc/explorer-data.json` | Registered | `bqc` | 274 / 603 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E2 | **VERIFIED** |
| **cloud-spend-tracker** | CLOUD-SPEND-TRACKER | `INDEPENDENT_SOURCE_AND_PUBLIC` | `analyze/projects/cloud-spend-tracker/explorer-data.json` | `explorer/public/projects/cloud-spend-tracker/explorer-data.json` | `/projects/cloud-spend-tracker/explorer-data.json` | Registered | `cloud-spend-tracker` | 240 / 1024 | `MATCHED` (`15971353...`) | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E3 | **VERIFIED** |
| **cst** | CST | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/cst/explorer-data.json` | `/projects/cst/explorer-data.json` | Registered | `cloud-spend-tracker` | 240 / 1024 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E3 | **VERIFIED** |
| **food-app** | FOOD-APP | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/food-app/explorer-data.json` | `/projects/food-app/explorer-data.json` | Registered | `food-app` | 1 / 0 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E4 | **VERIFIED** |
| **movie** | MOVIE | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/movie/explorer-data.json` | `/projects/movie/explorer-data.json` | Registered | `movie` | 9 / 16 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-source-resolution.cjs` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **movie-app** | MOVIE-APP | `ALIASED_PROJECT` | null | `explorer/public/projects/movie-app/explorer-data.json` | `/projects/movie-app/explorer-data.json` | Registered | `movie` (Alias) | 9 / 16 | `ALIASED_TO_MOVIE` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Payload project.id is "movie" | E4 | **RECONCILED** |
| **pbim** | Public Infrastructure Management | `INDEPENDENT_SOURCE_AND_PUBLIC` | `analyze/projects/pbim/explorer-data.json` | `explorer/public/pbim/explorer-data.json` | `/pbim/explorer-data.json` | Registered | `pbim` | 528 / 2063 | `MATCHED` (`395c23bd...`) | PASSED | PASSED | PASSED | PASSED | `test-pbim-dedicated-data-path.cjs` | Preserved pre-existing files | Browser runtime blocked | E5 | **VERIFIED** |
| **project-b** | PROJECT-B | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/project-b/explorer-data.json` | `/projects/project-b/explorer-data.json` | Registered | `project-b` | 14 / 16 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E6 | **VERIFIED** |
| **pub-infra-mang** | PUB-INFRA-MANG | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/pub-infra-mang/explorer-data.json` | `/projects/pub-infra-mang/explorer-data.json` | Registered | `pbim` | 528 / 2063 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-multi-project.cjs` | Preserved pre-existing files | Browser runtime blocked | E5 | **VERIFIED** |
| **test-canonical-project** | TEST-CANONICAL-PROJECT | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/test-canonical-project/explorer-data.json` | `/projects/test-canonical-project/explorer-data.json` | Registered | `test-canonical-project` | 2 / 1 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-export-explorer.cjs` | None required | Browser runtime blocked | E7 | **VERIFIED** |
| **test-norm-proj** | TEST-NORM-PROJ | `PUBLIC_ARTIFACT_ONLY` | null | `explorer/public/projects/test-norm-proj/explorer-data.json` | `/projects/test-norm-proj/explorer-data.json` | Registered | `test-norm-proj` | 1 / 0 | `SELF_REFERENCE_NOT_A_SOURCE_MATCH` | PASSED | PASSED | PASSED | N/A | `test-export-explorer.cjs` | None required | Browser runtime blocked | E7 | **VERIFIED** |

---

## 2. Key Matrix Notes & Explanations

1. **Category Definitions:**
   - `INDEPENDENT_SOURCE_AND_PUBLIC`: Project has distinct, tracked files in both `analyze/` and `explorer/public/`.
   - `PUBLIC_ARTIFACT_ONLY`: Project has a registered public artifact in `explorer/public/` but no corresponding source file in `analyze/`. `analyze/projects/movie/` is gitignored and generated only transiently during tests.
   - `ALIASED_PROJECT`: Public artifact path exists and is registered, but payload JSON contains another project ID (`movie-app` payload contains `"id": "movie"`).
2. **PBIM Dual Artifact Paths:**
   - Canonical Browser Path: `explorer/public/pbim/explorer-data.json` (URL: `/pbim/explorer-data.json`).
   - Legacy Manifest Path: `explorer/public/projects/pbim/explorer-data.json` (URL: `/projects/pbim/explorer-data.json`).
   - Both files are preserved without silent deletion or forced migration.

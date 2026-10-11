# REPOSITORY-WIDE PROJECT VERIFICATION MATRIX (RECONCILED)

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11371428744969324532-3de1dae2`
**Git Commit SHA:** `34b8915dea52fb3cd1c9633f3a953c72d73d639b`

---

## Registered Projects Verification Matrix

| Project ID | Display Name | Source Path | Published Path | Browser URL | Manifest Status | Payload Identity | Node / Edge Count | Source / Public Hash Match | Exporter Validation | Routing Validation | Invalid / Missing Data | Layout & Runtime | Tests Executed | Fixes Performed | Remaining Blockers | Evidence Level | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **default** | Default Salesforce Project | `analyze/explorer-data.json` | `explorer/public/explorer-data.json` | `/explorer-data.json` | Registered | `default` | 4 / 3 (Public) | DIVERGED (`98e00f54...` vs `c35af1eb...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli`, `test-multi-project.cjs` | Corrected matrix hash claims | Browser runtime blocked | E4 | **RECONCILED** |
| **bqc** | BQC | `explorer/public/projects/bqc/explorer-data.json` | `explorer/public/projects/bqc/explorer-data.json` | `/projects/bqc/explorer-data.json` | Registered | `bqc` | 274 / 603 | MATCHED (`0f67b64c...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **cloud-spend-tracker** | cloud-spend-tracker | `analyze/projects/cloud-spend-tracker/explorer-data.json` | `explorer/public/projects/cloud-spend-tracker/explorer-data.json` | `/projects/cloud-spend-tracker/explorer-data.json` | Registered | `cloud-spend-tracker` | 240 / 1024 | MATCHED (`15971353...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli`, `test-multi-project.cjs` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **cst** | CST | `explorer/public/projects/cst/explorer-data.json` | `explorer/public/projects/cst/explorer-data.json` | `/projects/cst/explorer-data.json` | Registered | `cst` | 240 / 1024 | MATCHED (`69a91fc9...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **food-app** | FOOD-APP | `explorer/public/projects/food-app/explorer-data.json` | `explorer/public/projects/food-app/explorer-data.json` | `/projects/food-app/explorer-data.json` | Registered | `food-app` | 1 / 0 | MATCHED (`e7bcc02b...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-multi-project.cjs` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **movie** | movie | `analyze/projects/movie/explorer-data.json` | `explorer/public/projects/movie/explorer-data.json` | `/projects/movie/explorer-data.json` | Registered | `movie` | 1 / 0 | MATCHED (`2d9f1bae...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-source-resolution.cjs` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **movie-app** | MOVIE-APP | `explorer/public/projects/movie-app/explorer-data.json` | `explorer/public/projects/movie-app/explorer-data.json` | `/projects/movie-app/explorer-data.json` | Registered | `movie` (Alias) | 1 / 0 | MATCHED (`2d9f1bae...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-multi-project.cjs` | Verified test harness temp analyze dir placement | Payload project.id is "movie" | E4 | **RECONCILED** |
| **pbim** | Public Infrastructure Management | `analyze/projects/pbim/explorer-data.json` | `explorer/public/pbim/explorer-data.json` | `/pbim/explorer-data.json` | Registered | `pbim` | 528 / 2063 | MATCHED (`395c23bd...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-pbim-dedicated-data-path.cjs`, `npm run test:cli` | Corrected context path references | Browser runtime blocked | E4 | **VERIFIED** |
| **project-b** | PROJECT-B | `explorer/public/projects/project-b/explorer-data.json` | `explorer/public/projects/project-b/explorer-data.json` | `/projects/project-b/explorer-data.json` | Registered | `project-b` | 14 / 16 | MATCHED (`e3115c37...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-multi-project.cjs` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **pub-infra-mang** | PUB-INFRA-MANG | `explorer/public/projects/pub-infra-mang/explorer-data.json` | `explorer/public/projects/pub-infra-mang/explorer-data.json` | `/projects/pub-infra-mang/explorer-data.json` | Registered | `pub-infra-mang` | 528 / 2063 | MATCHED (`31635489...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli` | None required | Browser runtime blocked | E4 | **VERIFIED** |
| **test-canonical-project** | TEST-CANONICAL-PROJECT | `explorer/public/projects/test-canonical-project/explorer-data.json` | `explorer/public/projects/test-canonical-project/explorer-data.json` | `/projects/test-canonical-project/explorer-data.json` | Registered | `test-canonical-project` | 2 / 1 | MATCHED (`2e5a8f3e...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `test-export-explorer.cjs` | Added Test F path containment safety | Browser runtime blocked | E4 | **VERIFIED** |
| **test-norm-proj** | TEST-NORM-PROJ | `explorer/public/projects/test-norm-proj/explorer-data.json` | `explorer/public/projects/test-norm-proj/explorer-data.json` | `/projects/test-norm-proj/explorer-data.json` | Registered | `test-norm-proj` | 1 / 0 | MATCHED (`dcda46f9...`) | PASSED | PASSED | PASSED | CLI_PASSED / BROWSER_BLOCKED | `npm run test:cli` | None required | Browser runtime blocked | E4 | **VERIFIED** |

---

## Unregistered / Orphan / Duplicate Artifact Section

| Artifact Path | File Size | SHA-256 Hash | Node / Edge Count | Origin / Purpose | Status / Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `explorer/public/projects/pbim/explorer-data.json` | 4,253,560 B | `sha256:395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | 528 / 2063 | Duplicate PBIM artifact placed under `projects/pbim/` during standard multi-project export | **PRESERVED_DUPLICATE** (Canonical route uses `/pbim/explorer-data.json`) |
| `analyze/explorer-data.json` | 5,593 B | `sha256:98e00f5407c6aa89f480667e7158fc98240c7303d6b2b379c7477c58f92693a1` | 2 / 2 | Default analyze fallback output file | **PRESERVED_SOURCE_FALLBACK** |

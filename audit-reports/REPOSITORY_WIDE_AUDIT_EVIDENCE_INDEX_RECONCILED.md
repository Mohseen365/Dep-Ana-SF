# REPOSITORY-WIDE AUDIT EVIDENCE INDEX (RECONCILED - COMP-VERIFY-3)

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11838427169474202902-6327cf81`
**Git Commit SHA:** `2938effd7b5e1b3587610138077ccd0a74d3f6ac`
**Index Status:** `RECONCILIATION VERIFIED — SOURCE MAPPINGS AND TEST SAFETY SUPPORTED`

---

## Evidence Entry Register

| Ref ID | Project / Subsystem | Primary Artifact Path | Evidence Source Code & Test File | Verification Script / Method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E1** | Default Project | `explorer/public/explorer-data.json` | `scripts/export-explorer.cjs` L995 | `node scripts/test-export-explorer.cjs` | **VERIFIED** |
| **E2** | BQC | `explorer/public/projects/bqc/explorer-data.json` | `explorer/public/project-manifest.json` L18 | `node scripts/test-multi-project.cjs` | **VERIFIED** |
| **E3** | Cloud Spend Tracker | `explorer/public/projects/cloud-spend-tracker/explorer-data.json` | `analyze/projects/cloud-spend-tracker/explorer-data.json` | `node scripts/test-multi-project.cjs` | **VERIFIED** |
| **E4** | Movie / Movie-App / Food-App | `explorer/public/projects/movie/explorer-data.json` | `scripts/test-source-resolution.cjs` L210 | `node scripts/test-source-resolution.cjs` | **VERIFIED** |
| **E5** | PBIM | `explorer/public/pbim/explorer-data.json` | `scripts/test-pbim-dedicated-data-path.cjs` L15 | `node scripts/test-pbim-dedicated-data-path.cjs` | **VERIFIED** |
| **E6** | Project B | `explorer/public/projects/project-b/explorer-data.json` | `explorer/public/project-manifest.json` L100 | `node scripts/test-multi-project.cjs` | **VERIFIED** |
| **E7** | Test Projects | `explorer/public/projects/test-canonical-project/explorer-data.json` | `scripts/test-export-explorer.cjs` L180 | `node scripts/test-export-explorer.cjs` | **VERIFIED** |
| **E8** | Path Containment Safety | `scripts/export-explorer.cjs` L902 | `scripts/test-export-explorer.cjs` L512 | `node scripts/test-export-explorer.cjs` | **VERIFIED** |
| **E9** | Teardown Safety | `scripts/test-multi-project.cjs` L26 | `scripts/test-multi-project.cjs` L260 | `node scripts/test-multi-project.cjs` | **VERIFIED** |
| **E10** | Stale Context Ledger | `REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md` | `REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md` | `cat REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md` | **VERIFIED** |

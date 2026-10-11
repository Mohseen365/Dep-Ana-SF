# REPOSITORY-WIDE STALE CONTEXT LEDGER

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11371428744969324532-3de1dae2`
**HEAD Commit:** `34b8915dea52fb3cd1c9633f3a953c72d73d639b`

---

## Stale Data and Context Disposition Table

| Item ID | Exact File Path & Reference | Stale Claim / Text | Classification | Why Stale / Contradictory | Authoritative Current Evidence | Action Taken | Resulting Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STALE-01** | `audit-reports/REPOSITORY_WIDE_*.md` | Git Commit `b2bc9a57a9fe1b9c4e00f75df81a1bd2a2fdc3e7` | `STALE_CONFIRMED` | Superseded by current checkout HEAD commit | Git HEAD: `34b8915dea52fb3cd1c9633f3a953c72d73d639b` | Reconciled in new deliverables | `CONFIRMED_HISTORICAL` |
| **STALE-02** | `audit-reports/REPOSITORY_WIDE_*.md` | Git Branch `jules-4554425777394787099-4853cdbc` | `STALE_CONFIRMED` | Superseded by current checkout branch | `git status`: `jules-11371428744969324532-3de1dae2` | Reconciled in new deliverables | `CONFIRMED_HISTORICAL` |
| **STALE-03** | `context/CURRENT-DATA-AND-FIXTURES.md` L8 | `explorer/public/projects/pbim/explorer-data.json` | `CONTRADICTORY` | PBIM contract requires `/pbim/explorer-data.json` (`explorer/public/pbim/explorer-data.json`) | Governed by `project-manifest.json` L111 | Updated context document | `CURRENT_SUPPORTED` |
| **STALE-04** | `context/CURRENT-DATA-AND-FIXTURES.md` L36 | `"dataPath": "/projects/pbim/explorer-data.json"` | `CONTRADICTORY` | Schema uses `analysisPath: "/pbim/explorer-data.json"` | `explorer/public/project-manifest.json` | Updated context document | `CURRENT_SUPPORTED` |
| **STALE-05** | `context/SOURCE-REGISTER.md` L26 | `explorer/public/projects/pbim/explorer-data.json` | `CONTRADICTORY` | Obsolete path for primary PBIM artifact | `explorer/public/pbim/explorer-data.json` | Updated context document | `CURRENT_SUPPORTED` |
| **STALE-06** | `context/SUPERSESSION-MAP.md` L38 | `explorer/public/projects/pbim/explorer-data.json` | `CONTRADICTORY` | Obsolete path for primary PBIM artifact | `explorer/public/pbim/explorer-data.json` | Updated context document | `CURRENT_SUPPORTED` |
| **STALE-07** | `audit-reports/REPOSITORY_WIDE_PROJECT_AND_ARTIFACT_AUDIT_REPORT.md` L17 | "Total Projects Discovered: 11 projects" | `CONTRADICTORY` | Text claimed 11 projects while manifest and matrix contained 12 project IDs | `explorer/public/project-manifest.json` (12 projects) | Reconciled in new deliverables | `RECONCILED` |
| **STALE-08** | `audit-reports/REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX.md` Row 1 | Default source/public hash matched (`c35af1eb...`) | `CONTRADICTORY` | `analyze/explorer-data.json` (2N/2E, hash `98e00f54...`) differs from `explorer/public/explorer-data.json` (4N/3E, hash `c35af1eb...`) | `crypto.createHash("sha256")` on current disk files | Reconciled in matrix deliverable | `RECONCILED` |
| **STALE-09** | `explorer/public/projects/movie-app/explorer-data.json` | Payload `project.id` = `"movie"` | `CONTRADICTORY` | Payload ID inside JSON (`"movie"`) does not match path ID (`"movie-app"`) | JSON parse of `movie-app` public artifact | Classified as `ALIASED_PROJECT` in inventory/matrix | `EXPLAINED_LIMITATION` |
| **STALE-10** | `scripts/test-export-explorer.cjs` | Missing Test F (`isPathContained` regression suite) | `UNVERIFIED` | Historical report `COMP_ORBIT_PBIM_PATH_CONTAINMENT_...` claimed Test F was added, but was missing from file | Source inspection of `scripts/test-export-explorer.cjs` | Added Test F to `scripts/test-export-explorer.cjs` | `CURRENT_SUPPORTED` |
| **STALE-11** | `scripts/test-multi-project.cjs` L76–80 | `git checkout HEAD -- analyze/ explorer/public/` | `CONTRADICTORY` | Destructive cleanup command capable of discarding uncommitted user changes | Source inspection of `scripts/test-multi-project.cjs` | Replaced with in-memory snapshot/restore and added Test 10 | `CURRENT_SUPPORTED` |
| **STALE-12** | Prior audit reports | Browser verification marked "PASSED" or "VERIFIED" | `UNSUPPORTED` | Sandbox environment lacks installed `vite` / `playwright` binaries | Command execution `npx vite build` returns `ERR_MODULE_NOT_FOUND` | Labeled browser checks as `BLOCKED` | `BLOCKED` |

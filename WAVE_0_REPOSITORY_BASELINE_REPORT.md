# Wave 0 Repository Baseline Report

## Executive Summary
This report establishes the verified repository baseline for the Dependency Analyzer Salesforce migration as of Wave 0. The current checkout is fully clean, dependencies for both root and Explorer workspaces are installed and lockfile-aligned, production build succeeds, and test suites have been executed and documented.

---

## 1. Repository Identity & Working-Tree State

- **Repository Root:** `/app`
- **Current Branch:** `jules-3963303054977177123-a7e79889`
- **Current Commit SHA:** `f71bd98a29ef28bf97e8d30e9cfb213c874cf660`
- **Recent Log:** `f71bd98 Merge pull request #16 from Mohseen365/jules-11627984871253279062-99a13f33`
- **Working-Tree Status:** Clean (no uncommitted or untracked changes prior to baseline artifact generation).
- **Git Diff (`git diff --stat`):** 0 files changed.

### Branch/Commit Context & Discrepancy Note
- Prompt reference branch `jules-11538132429324564299-34361620` (commit `b01f2446fcff2291a05d24f1625798a59577cf18`) was a historical agent branch.
- Prompt reference branch `jules-11627984871253279062-99a13f33` (commit `3a7e99a88a71921880217b2af3327f9aa84d711e`) was merged into main/head via PR #16.
- Active verified HEAD is `f71bd98a29ef28bf97e8d30e9cfb213c874cf660`.

---

## 2. Actual Source File Census

The current git repository contains **1,892 tracked files** (compared to the historical 745-file freeze in `SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv`).

| Category | Description | Count |
| :--- | :--- | :---: |
| **Explorer Production Source** | `explorer/src/` production components, hooks, lib, context, types | 320 |
| **Explorer Test / Spec Files** | `explorer/src/` test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) | 396 |
| **Scripts Production** | `scripts/*.cjs` & root CLI engine utilities | 67 |
| **Scripts Test Suite** | `scripts/test-*.cjs` root test scripts | 61 |
| **Salesforce POC Production** | `scratch/salesforce-poc/force-app/` LWC & Apex classes | 36 |
| **Salesforce POC Test Suite** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` & fixtures | 5 |
| **Documentation & Reports** | Markdown (`*.md`), JSON reports, CSV audits, text logs | 723 |
| **Root Workspace Other** | Configuration, manifests, dotfiles, root TS scripts | 284 |
| **TOTAL TRACKED FILES** | **`git ls-files` total** | **1,892** |

---

## 3. Environment & Tooling Verification

| Tool / Dependency | Version / Availability | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | v22.22.1 | Verified | Runtime environment |
| **npm** | 11.11.0 | Verified | Package manager |
| **TypeScript** | v5.5.3 (via `npx tsc -p explorer/tsconfig.prod.json`) | Verified | Passes clean without errors |
| **Vitest** | v2.1.9 (in `explorer/`) | Installed | Ran targeted suites; full parallel execution constrained by tinypool worker state |
| **Playwright** | v1.64.1 (in `explorer/`) | Installed | Binaries available; E2E suite marked `NOT RUN` (no configured spec files) |
| **Salesforce CLI** | Not installed (`sf`/`sfdx` missing in sandbox) | Missing | Org interaction disabled by mandate |
| **Salesforce Org Auth** | Not authorized | Unavailable | Org-dependent checks marked `BLOCKED` |

---

## 4. Execution Check Summary

| Check ID | Verification Suite | Command | Result | Pass / Fail / Skip | Duration | Caveat / Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Root CLI Governance Suite | `npm run test:cli` | **PASS** | 34 suites / 151 tests PASS | ~12.4s | Covers all 34 script test runner files sequentially |
| **B1** | Explorer Production Build | `cd explorer && npm run build` | **PASS** | `tsc` + Vite build PASS | ~6.8s | Bundles `dist/` cleanly |
| **B2** | Focused Vitest Suite | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | **FAIL** | 26 PASS / 4 FAIL | ~3.8s | Reproduces exactly the 4 expected historical failures without altering source code |
| **C** | Salesforce POC Offline Harness | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | **PASS** | 21 PASS / 0 FAIL | ~0.8s | Offline Node.js mock harness testing LWC pagination, chunking, and DTO contracts |
| **D** | Browser E2E Suite | `cd explorer && npx playwright test` | **NOT RUN** | 0 PASS / 0 FAIL | N/A | No Playwright test files configured under `explorer/e2e` |
| **E** | Salesforce Org / Apex Execution | `sf apex run test` / `sf project deploy` | **BLOCKED** | N/A | N/A | Salesforce CLI absent; org authorization prohibited by mandate |

---

## 5. Summary of Unchanged Code Declaration
All production application source code (`explorer/src/`, `scripts/`, `scratch/salesforce-poc/force-app/`) was kept **100% untouched**. No tests were skipped, weakened, or removed, and no source logic was altered to achieve green results. All changes in this task are restricted to installing missing npm dependencies (`npm ci` and `npm ci --prefix explorer`) and writing baseline reports.

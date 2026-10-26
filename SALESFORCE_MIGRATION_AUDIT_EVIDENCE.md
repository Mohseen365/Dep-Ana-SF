# Salesforce Migration Audit Evidence & Reconciliation Report

This document records the exact repository environment, test execution evidence, exclusion dispositions, and independent reconciliation results for the repository-wide Salesforce migration audit.

## 1. Repository & Execution Environment

- **Repository Root:** `/app`
- **Git Branch:** `jules-11627984871253279062-99a13f33`
- **Commit SHA:** `3a7e99a88a71921880217b2af3327f9aa84d711e`
- **Working Tree State:** Clean prior to deliverable creation
- **Node.js Version:** `v22.22.1`
- **npm Version:** `11.11.0`

## 2. Executed Test Evidence

### A. Root CLI Test Suite (`npm run test:cli`)
- **Command:** `npm run test:cli`
- **Working Directory:** `/app`
- **Exit Code:** `0` (PASS)
- **Verified Test Suites:**
  - Deterministic Investigation Context Minimizer Test Suite: 17/17 PASSED
  - Deterministic Architecture Decision Context Test Suite: 20/20 PASSED
  - Deterministic LLM Usage Accounting Test Suite: 16/16 PASSED
  - Worker Geometry & Event Correlation Test Suite: 4/4 PASSED
  - Overlap Checker Core Unit Test Suite: 10/10 PASSED
  - Remediation Stage 0 Test Suite: 8/8 PASSED

### B. Salesforce POC Offline Verification Suite
- **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Working Directory:** `/app`
- **Exit Code:** `0` (PASS)
- **Verified Categories:**
  - LWC Module Unit Tests: 6/6 PASSED
  - Bounded Pagination & Boundary Inputs: 3/3 PASSED
  - Benchmark Fixture Paginated Verification: 3/3 PASSED (PBIM, BQC, CST)
  - Advanced Edge Cases, UTF-8 Multibyte & Lifecycle: 4/4 PASSED
  - Security, Fault Injection & Ingestion Verification: 5/5 PASSED
- **Total POC Offline Tests:** 21/21 PASSED

## 3. Discovered Files & Categorization Breakdown

Total tracked repository files evaluated: **745**

| Source Area | Total Files | Production Files | Test / Spec Files | Salesforce Implementation Files |
|---|---|---|---|---|
| `explorer/src/` | 576 | 196 | 380 | 0 |
| `scripts/` | 128 | 121 | 7 | 0 |
| `scratch/salesforce-poc/` | 41 | 38 | 3 | 41 |
| **Total** | **745** | **355** | **390** | **41** |

### Exclusion & Disposition Rationale
1. **Explorer Test Files (380 files):** Classified as `RETAINED OUTSIDE SALESFORCE`. Retained for local Vitest execution. Not counted in production UI denominator.
2. **Node.js Analysis Scripts (121 files):** Classified as `RETAINED OUTSIDE SALESFORCE` or `PARTIALLY MIGRATED`. AST file parsing and repository directory crawling require Node.js file system APIs, which exceed Salesforce Apex execution capabilities.
3. **Salesforce POC Metadata & Code (41 files):** Classified as `MIGRATED AND VERIFIED`. Formally audited and confirmed passing via offline JS test harness.
4. **Explorer React UI View Panels (196 files):** Classified as `NOT MIGRATED`, `PARTIALLY MIGRATED`, or `SCAFFOLDED ONLY`. LWC implementations are not yet present for 17 out of 18 views.

## 4. Independent Completeness Reconciliation

- **File-by-File CSV Inventory (`SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv`):** Contains exactly 745 file rows matching the file census.
- **Symbol Matrix (`SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.md`):** Documents exported symbols across all 18 view modes, 4 layout algorithms, shared libraries, and Apex/LWC components.
- **Feature Parity Matrix (`SALESFORCE_COMPLETE_FEATURE_PARITY_MATRIX.md`):** Maps 18 view modes, 4 layout algorithms, shared UI, and analysis operations to exact status categories.
- **Target Inventory (`SALESFORCE_TARGET_IMPLEMENTATION_INVENTORY.md`):** Lists 8 Apex classes, 3 LWCs, 6 Custom Objects, and missing proposed targets.
- **Gap Register (`SALESFORCE_MIGRATION_GAP_REGISTER.md`):** Assigns stable IDs (GAP-01 through GAP-05) to all missing capabilities.
- **Implementation Roadmap (`SALESFORCE_MIGRATION_IMPLEMENTATION_ROADMAP.md`):** Establishes a 5-wave sequence resolving all registered gaps.

### Mechanical Consistency Check
- Every `NOT MIGRATED`, `PARTIALLY MIGRATED`, or `SCAFFOLDED ONLY` item in the CSV corresponds to a registered gap in `SALESFORCE_MIGRATION_GAP_REGISTER.md` and a target wave in `SALESFORCE_MIGRATION_IMPLEMENTATION_ROADMAP.md`.
- All calculated migration completeness percentages derive strictly from the 745-row ledger.

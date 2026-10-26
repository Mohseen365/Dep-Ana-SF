# Wave 2 Actual Test Results & Verification Log

**Date:** October 2026
**Auditor:** Independent Verification Lead
**Scope:** Root CLI Engine, Explorer React App, Focused Vitest Suite, Salesforce POC Offline Tests

---

## 1. Execution Environment

| Environment Component | Version / Status | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v22.22.1` | `node -v` | Active runtime environment |
| **npm** | `11.11.0` | `npm -v` | Dependency package manager |
| **Java** | `21.0.10` | `java -version` | OpenJDK 64-Bit Server VM |
| **Salesforce CLI (`sf`)** | `Not installed` | `sf --version` | Global CLI binary absent in sandbox; source checked offline |
| **Playwright / Chromium** | Installed | `npx playwright --version` | Available for end-to-end browser testing |

---

## 2. Test Execution Summary

| Test Suite | Command Executed | Exit Code | Total Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Root CLI Baseline Suite** | `npm run test:cli` | `0` | 34 suites | 34 | 0 | **PASSED** (100%) |
| **Explorer Production Build** | `cd explorer && npm run build` | `0` | 290 modules | 290 | 0 | **PASSED** (7.22s) |
| **Focused Vitest Baseline** | `cd explorer && npx vitest run ProjectContext useViewState` | `1` | 35 tests | 31 | 4 | **PASSED WITH BASELINE FAILURES** (DEC-07) |
| **Salesforce POC Offline Suite** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | `0` | 9 tests | 9 | 0 | **PASSED** (100%) |

---

## 3. Detailed Results Breakdown

### 3.1 Root CLI Test Suite (`npm run test:cli`)
- **Command:** `npm run test:cli`
- **Result:** Exit Code `0`. 34 test modules executed sequentially:
  - Deterministic Investigation Eligibility (15 tests)
  - Context Minimizer (17 tests)
  - Architecture Decision Context (20 tests)
  - LLM Usage Accounting (16 tests)
  - Worker Geometry & Correlation (4 tests)
  - Overlap Checker Core (10 tests)
  - Remediation Stage 0 (8 tests)
- **Outcome:** 100% Passed. Zero regressions detected.

### 3.2 Explorer Production Build (`cd explorer && npm run build`)
- **Command:** `cd explorer && npm run build` (`tsc -p tsconfig.prod.json && vite build`)
- **Result:** Exit Code `0`.
- **Output Artifacts:** `explorer/dist/` produced cleanly in 7.22s.

### 3.3 Focused Vitest Tests (`cd explorer && npx vitest run ProjectContext useViewState`)
- **Command:** `cd explorer && npx vitest run ProjectContext useViewState`
- **Result:** Exit Code `1` (4 expected baseline failures).
- **Files Executed (5 files, 35 tests):**
  1. `src/context/ProjectContext.test.tsx`: 11 passed, 2 failed
  2. `src/context/ProjectContext.optional.test.tsx`: 3 passed, 0 failed
  3. `src/hooks/useViewState.test.ts`: 15 passed, 2 failed
  4. `src/hooks/useViewState.fix15.test.tsx`: 1 passed, 0 failed
  5. `src/hooks/useViewState.fix16.test.tsx`: 1 passed, 0 failed

#### Discrepancy Breakdown
1. `creates project metadata and switches active project context`: Expected `'billing-app'`, received `'default'`.
2. `switches project context and fires isolation reset events`: Expected `'project-b'`, received `'default'`.
3. `invoking Focus adds focus.* params and closing Focus removes them`: Query parameter string serialization mismatch.
4. `debounces rapid search query updates to URL and syncs immediately when cleared`: Search query filter lingering in location mock.

*Disposition:* Preserved as pre-existing baseline failures per Decision Register `DEC-07`.

### 3.4 Salesforce POC Offline Verification Suite
- **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Result:** Exit Code `0`.
- **Tests Executed (9 tests):**
  1. `reassembleChunks: empty array returns empty string` — PASSED
  2. `reassembleChunks: reassembles string chunks accurately` — PASSED
  3. `validatePayloadIntegrity: returns true for valid JSON` — PASSED
  4. `validatePayloadIntegrity: returns false for invalid JSON or non-string` — PASSED
  5. `verifyChunkSequence: detects correct contiguous indices` — PASSED
  6. `verifyChunkSequence: rejects missing or non-contiguous indices` — PASSED
  7. `Fixture PBIM: roundtrip chunking (100k), reassembly, and JSON validation` — PASSED
  8. `Fixture BQC: roundtrip chunking (100k), reassembly, and JSON validation` — PASSED
  9. `Fixture CST: roundtrip chunking (100k), reassembly, and JSON validation` — PASSED

---

## 4. Blocked & Unverified Org-Dependent Checks

| Check Area | Offline Status | Live Org Requirement | Reason Blocked |
| :--- | :--- | :--- | :--- |
| **Apex Compilation** | Static Syntax Verified | SFDX / Metadata API org deploy | No active Salesforce org connection |
| **Apex Unit Tests** | Authored (`DAGraphControllerTest`) | `sf apex run test` in org | Requires Salesforce Apex runtime |
| **Multi-Tenant Security** | Authored (`DAGraphSecurityTest`) | Apex `System.runAs()` org test | Requires Salesforce database and sharing engine |
| **LWC / LWS Rendering** | Static Code Verified | Lightning App Page in org | Requires Lightning Web Security container |

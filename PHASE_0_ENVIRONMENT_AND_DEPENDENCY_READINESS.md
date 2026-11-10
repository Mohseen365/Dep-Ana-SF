# Phase 0 Environment and Dependency Readiness Assessment (Corrected)

## Document Metadata
- **Classification**: Phase 0 Sandbox Environment & Tooling Verification
- **Audit Date**: 2026-11-10 (Correction Pass)
- **Auditor**: Integration Coordinator D1
- **Status**: ASSESSED & ENVIRONMENT DIRECTIVE ESTABLISHED

---

## 1. Executive Summary & Environment Ground Truth

This assessment audits the execution sandbox environment to determine which dependencies, runtimes, CLI tools, and test environments are available for Phase 1 parallel execution.

In strict compliance with Phase 0 directives:
- **No dependencies were installed or modified during this assessment.**
- **No global packages were updated.**
- **Exact environment states are recorded as `Present`, `Missing but Installable`, `Missing and Blocked`, or `Requires External Authorization`.**
- **Every discovered offline runner was individually inventoried and executed, replacing broad assumptions with exact per-suite test evidence (Correction 5).**

---

## 2. Runtime & Tooling Status Matrix

| Runtime / Tool | Detected Version | Execution Capability | Status Classification | Remediation / Phase 1 Instruction |
|---|---|---|---|---|
| **Node.js** | `v22.22.1` | Native `/usr/bin/node` | **PRESENT** | Core runtime for all offline test runners and scripts. Fully functional. |
| **npm** | `11.11.0` | Global npm | **PRESENT** | Available for package operations. |
| **pnpm** | `10.30.3` | Global pnpm | **PRESENT** | Alternative package manager available. |
| **yarn** | `1.22.22` | Global yarn | **PRESENT** | Classic yarn present. |
| **bun** | `1.2.14` | Global bun | **PRESENT** | High-performance JS runtime present. |
| **Salesforce CLI (`sf`)** | Missing from PATH | `command not found` | **MISSING BUT INSTALLABLE** | Phase 1 Agent 10 / ENV agents must install `@salesforce/cli` via `npm install -g @salesforce/cli` or execute via `npx` if org deployment is authorized. |
| **TypeScript (`tsc`)** | In `explorer/node_modules` | Local only | **PRESENT (LOCAL)** | Root `npx tsc` points to uninstalled package, but Vite/Explorer project contains TypeScript locally. |
| **Vitest** | `5.1.0` | Available via local `npx vitest` | **PRESENT (ON-DEMAND)** | Ready for unit test execution without modifying root `package.json`. |
| **Playwright** | `1.65.0` | Available via local `npx playwright` | **PRESENT (ON-DEMAND)** | Playwright CLI is available on demand for browser automation. |
| **Headless Chrome** | Google Chrome installed | `/usr/bin/google-chrome` | **PRESENT** | Native Linux Chrome binary exists at `/usr/bin/google-chrome` for browser hit-testing. |
| **Salesforce Staging Org** | No credentials configured | Zero env vars (`SF_*`) | **REQUIRES EXTERNAL AUTHORIZATION** | Live org deployment and Apex execution requires explicit Project Owner provisioning of staging credentials. |

---

## 3. Exhaustive Offline Test Runner Inventory & Individual Results (Correction 5)

Exactly **31 offline test runners** in `scratch/salesforce-poc/tests/` were discovered, individually executed, and verified:

| # | Runner File Path | Workstream | Test Focus & Verification Purpose | Command | Result Status | Test Details / Counts |
|---|---|---|---|---|---|---|
| 1 | `run-analysis-history-tests.cjs` | WS-D | Analysis run history service & DTOs | `node run-analysis-history-tests.cjs` | **EXECUTED_PASS** | ALL 4 SUITES PASSED |
| 2 | `run-b4-security-tests.cjs` | WS-B | SEC-01 FLS & SEC-02 sharing rules | `node run-b4-security-tests.cjs` | **EXECUTED_PASS** | 14 PASSED, 0 FAILED |
| 3 | `run-c1-url-sync-tests.cjs` | WS-C | URL PageReference state serialization | `node run-c1-url-sync-tests.cjs` | **EXECUTED_PASS** | 11 PASSED, 0 FAILED |
| 4 | `run-c2-snapshot-comparison-tests.cjs` | WS-C | Tabular dual-snapshot diff engine | `node run-c2-snapshot-comparison-tests.cjs` | **EXECUTED_PASS** | 15 PASSED, 0 FAILED |
| 5 | `run-c3-sankey-tests.cjs` | WS-C | Pure SVG Dependency River rendering | `node run-c3-sankey-tests.cjs` | **EXECUTED_PASS** | ALL 14 TEST SUITES PASSED |
| 6 | `run-c4-export-tests.cjs` | WS-C | Graph JSON/PNG export formatting | `node run-c4-export-tests.cjs` | **EXECUTED_PASS** | 13 PASSED, 0 FAILED |
| 7 | `run-coordinator-integration-suite.cjs` | Coordinator | daAppShell 11-view invariants (INT-1) | `node run-coordinator-integration-suite.cjs` | **EXECUTED_PASS** | 16 PASSED, 0 FAILED |
| 8 | `run-lane-a-schema-tests.cjs` | WS-A | Analysis history schema & controllers | `node run-lane-a-schema-tests.cjs` | **EXECUTED_PASS** | 9 PASSED, 0 FAILED |
| 9 | `run-lane-c-preset-manager-tests.cjs` | WS-C | Filter preset manager state store | `node run-lane-c-preset-manager-tests.cjs` | **EXECUTED_PASS** | 10 PASSED, 0 FAILED |
| 10 | `run-lane-d-graph-filter-tests.cjs` | WS-C | Depth & cluster filtering logic | `node run-lane-d-graph-filter-tests.cjs` | **EXECUTED_PASS** | 15 PASSED, 0 FAILED |
| 11 | `run-lane-e-matrix-tests.cjs` | WS-C | Dependency matrix cell hit testing | `node run-lane-e-matrix-tests.cjs` | **EXECUTED_PASS** | 15 PASSED, 0 FAILED |
| 12 | `run-lane-f-findings-tests.cjs` | WS-D | Findings view list & category filters | `node run-lane-f-findings-tests.cjs` | **EXECUTED_PASS** | 16 PASSED, 0 FAILED |
| 13 | `run-lwc-jest-tests.cjs` | WS-F | LWC component Jest test wrapper | `node run-lwc-jest-tests.cjs` | **EXECUTED_PASS** | ALL 2 SUITES PASSED |
| 14 | `run-p0-verification-tests.cjs` | WS-A | Foundation data contracts & loader | `node run-p0-verification-tests.cjs` | **EXECUTED_PASS** | ALL 3 SUITES PASSED |
| 15 | `run-p1-header-tests.cjs` | WS-C | daHeader status banner & events | `node run-p1-header-tests.cjs` | **EXECUTED_PASS** | ALL 4 SUITES PASSED |
| 16 | `run-p1-sidebar-tests.cjs` | WS-C | daSidebar navigation collapse/expand | `node run-p1-sidebar-tests.cjs` | **EXECUTED_PASS** | ALL 4 SUITES PASSED |
| 17 | `run-poc-tests.cjs` | General | Comprehensive POC regression suite | `node run-poc-tests.cjs` | **EXECUTED_PASS** | 47 PASSED, 0 FAILED |
| 18 | `run-r2-packaging-validation.cjs` | WS-B | .forceignore Wave 9 quarantine check | `node run-r2-packaging-validation.cjs` | **EXECUTED_PASS** | 5/5 TEST SUITES PASSED |
| 19 | `run-s1-security-tests.cjs` | WS-B | SEC-01 FLS, SEC-02 Apex user mode | `node run-s1-security-tests.cjs` | **EXECUTED_PASS** | 11 PASSED, 0 FAILED |
| 20 | `run-w5-1-tests.cjs` | WS-5 | daGraphViewer layout mode switcher | `node run-w5-1-tests.cjs` | **EXECUTED_PASS** | 18 PASSED, 0 FAILED |
| 21 | `run-w6-1-tests.cjs` | WS-6 | daRadarView radial rendering math | `node run-w6-1-tests.cjs` | **EXECUTED_PASS** | ALL 10 TESTS PASSED |
| 22 | `run-w6-2-tests.cjs` | WS-6 | daTreemapView cluster hierarchy | `node run-w6-2-tests.cjs` | **EXECUTED_PASS** | ALL 7 TESTS PASSED |
| 23 | `run-w6-3-tests.cjs` | WS-6 | daSubwayView route generation | `node run-w6-3-tests.cjs` | **EXECUTED_PASS** | ALL 7 TESTS PASSED |
| 24 | `run-w6-4-tests.cjs` | WS-6 | daDnaView barcode layout contracts | `node run-w6-4-tests.cjs` | **EXECUTED_PASS** | ALL 8 TESTS PASSED |
| 25 | `run-w7-1-tests.cjs` | WS-7 | daMatrixView row/column clustering | `node run-w7-1-tests.cjs` | **EXECUTED_PASS** | ALL 7 TESTS PASSED |
| 26 | `run-w7-2-tests.cjs` | WS-7 | daHotspotsView risk score calculation | `node run-w7-2-tests.cjs` | **EXECUTED_PASS** | ALL 7 TESTS PASSED |
| 27 | `run-w8-1-tests.cjs` | WS-8 | daInvestigationDrawer IPC isolation | `node run-w8-1-tests.cjs` | **EXECUTED_PASS** | 10 PASSED, 0 FAILED |
| 28 | `run-wave4-integration-suite.cjs` | WS-4 | Wave 4 Phase 2C full integration | `node run-wave4-integration-suite.cjs` | **EXECUTED_PASS** | 32 PASSED, 0 FAILED |
| 29 | `run-workstream-a-tests.cjs` | WS-A | WS-A contracts and payload loader | `node run-workstream-a-tests.cjs` | **EXECUTED_PASS** | 33 PASSED, 0 FAILED |
| 30 | `run-workstream-c-tests.cjs` | WS-C | WS-C analytical views contract suite | `node run-workstream-c-tests.cjs` | **EXECUTED_PASS** | 31 PASSED, 0 FAILED |
| 31 | `run-ws5-tests.cjs` | WS-5 | Workstream 5 layout state persistence | `node run-ws5-tests.cjs` | **EXECUTED_PASS** | 10 PASSED, 0 FAILED |

**Inventory Summary**: 31 discovered, 31 attempted, **31 EXECUTED_PASS**, 0 FAIL, 0 BLOCKED.
Additionally, root benchmark harness `wave1/B2/bench/run-benchmarks.cjs` passes across PBIM, CST, BQC, and synthetic 10 MB payload boundary.

---

## 4. Environment Limitations & Live Staging Distinction

Offline test execution proves syntactical and logical validity in local Node/CJS. However:
1. **Offline Node.js Tests Cannot Establish Apex Runtime Safety**: Local tests mock Apex controllers and DML operations. They do not simulate Apex transaction heap limits, SOQL row governors, CPU time limits, or Salesforce Locker/LWS security wrappers.
2. **Blocked Validations**:
   - `GAP-ENV-01`: Apex unit test execution and governor profiling in a live scratch/staging org is **BLOCKED (Requires Salesforce Org Credentials)**.
   - `GAP-ENV-02`: Full browser Playwright execution inside an active Salesforce Experience shell is **BLOCKED (Requires Live Org Deployment)**.

# Phase 0 Environment and Dependency Readiness Assessment

## Document Metadata
- **Classification**: Phase 0 Sandbox Environment & Tooling Verification
- **Audit Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: ASSESSED & ENVIRONMENT DIRECTIVE ESTABLISHED

---

## 1. Executive Summary & Environment Ground Truth

This assessment audits the execution sandbox environment to determine which dependencies, runtimes, CLI tools, and test environments are available for Phase 1 parallel execution.

In strict compliance with Phase 0 directives:
- **No dependencies were installed or modified during this assessment.**
- **No global packages were updated.**
- **Exact environment states are recorded as `Present`, `Missing but Installable`, `Missing and Blocked`, or `Requires External Authorization`.**

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

## 3. Offline Test Suite Execution Verification

The repository contains 33 dedicated offline Node.js test runners in `scratch/salesforce-poc/tests/` that validate Salesforce metadata, Apex security patterns, LWC bundle structure, DOM contracts, and payload reassembly completely offline without requiring a live Salesforce org or CLI connection:

| Test Runner | Command | Observed Result | Pass/Fail |
|---|---|---|---|
| Central Coordinator Suite (INT-1) | `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` | 16 tests executed across 7 sections | **16 PASSED, 0 FAILED** |
| Security Regression Suite (S1) | `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs` | Validates SEC-01 FLS, SEC-02 Apex user mode, SEC-03 BroadcastChannel | **ALL PASSED** |
| Packaging Validation (R2) | `node scratch/salesforce-poc/tests/run-r2-packaging-validation.cjs` | Validates `.forceignore` quarantine of Wave 9 components | **ALL PASSED** |
| Sankey / River View (C3) | `node scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs` | Validates pure SVG rendering and event emission | **ALL PASSED** |
| Snapshot Comparison (C2) | `node scratch/salesforce-poc/tests/run-c2-snapshot-comparison-tests.cjs` | Validates dual-snapshot diffing without Cytoscape multi-canvas | **ALL PASSED** |
| URL Sync Deep Linking (C1) | `node scratch/salesforce-poc/tests/run-c1-url-sync-tests.cjs` | Validates PageReference serialization and invariant preservation | **ALL PASSED** |

---

## 4. Phase 1 Dependency Installation Directives

When implementation agents begin Phase 1:
1. **No Arbitrary Upgrades**: Agents must respect existing `package-lock.json` versions and must not run `npm update` or change major versions of libraries.
2. **Deterministic Installs**: If an agent requires a package locally, it must install strictly using `npm ci` or targeted `npm install <package>@<pinned_version> --save-dev`.
3. **No Unauthenticated Org Calls**: Offline test runners must remain the primary automated gate. Live org testing (GAP-ENV-01) is strictly contingent upon Project Owner secret provisioning.

# Waves 5–9 Environment & Tooling Inventory

**Inspection Date**: 2026-11-06
**Auditor / Agent**: Jules (Phase A1 Implementation Baseline)
**Status**: Read-Only Inspection Completed (No Dependencies Installed / No Modifying Scripts Executed)

---

## 1. System Runtime & Shell

| Component | Status | Verified Version / Details | Known Limitations / Notes |
|---|---|---|---|
| **Operating System** | VERIFIED | `Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` | Standard headless Linux container |
| **Shell** | VERIFIED | `/bin/bash` (`GNU bash, version 5.2.26(1)-release`) | Full Bash execution environment available |
| **Node.js** | VERIFIED | `v22.22.1` | Native Node runtime installed in path |
| **npm** | VERIFIED | `11.11.0` | npm package manager installed; minor update notice to 11.21.2 |
| **Python** | VERIFIED | `Python 3.12.13` | Standard Python 3 interpreter available |
| **Git** | VERIFIED | `git version 2.53.0` | Git client available; repository is shallow |

---

## 2. Package Manifests & Dependency Status

| Manifest Location | Declared Dependencies | Declared devDependencies | `node_modules` Status | Impact on Waves 5–9 |
|---|---|---|---|---|
| **Root (`/package.json`)** | `@vitejs/plugin-react`, `cytoscape-fcose`, `cytoscape-navigator`, `react`, `react-dom`, `zod` | `playwright`, `vite` | **NOT INSTALLED** (root `node_modules` absent) | Root dev tooling packages not installed. Does NOT block offline Salesforce POC unit tests. |
| **Explorer (`/explorer/package.json`)** | `cytoscape`, `cytoscape-fcose`, `cytoscape-navigator`, `react`, `react-dom`, `zod` | `@playwright/test`, `@testing-library/jest-dom`, `@testing-library/react`, `@types/cytoscape`, `@types/jest`, `@types/mocha`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `jsdom`, `typescript`, `vite`, `vitest` | **NOT INSTALLED** (`explorer/node_modules` absent) | Original Explorer TypeScript tests cannot run without installation in Phase A6. Does NOT block offline Salesforce POC tests. |
| **Salesforce POC (`/scratch/salesforce-poc/`)** | None (No package.json) | None | N/A | Fully decoupled offline test harness uses zero external npm packages. |

---

## 3. Tooling Executables Availability

| Executable / Tool | Classification | Availability & Version | Task Dependency Impact |
|---|---|---|---|
| **TypeScript (`tsc`)** | PACKAGE DECLARED BUT NOT INSTALLED | Declared in `explorer/package.json`; not installed in `node_modules` | Affects original Explorer TS compilation; zero impact on Salesforce POC LWCs. |
| **Vitest (`vitest`)** | PACKAGE DECLARED BUT NOT INSTALLED | Declared in `explorer/package.json`; not installed in `node_modules` | Affects Explorer TS unit tests; zero impact on Waves 5–9 POC LWCs. |
| **LWC Jest (`lwc-jest`)** | PACKAGE NOT DECLARED | Not declared in any `package.json`; executable unavailable | Salesforce POC uses zero-dependency CommonJS offline test runners instead of LWC Jest. |
| **Playwright (`playwright`)** | PACKAGE DECLARED (Root / Explorer) | CLI version `1.65.0` detectable via npx; browser binaries unverified | UI end-to-end browser tests require installation/caching review in Phase A6. |
| **Salesforce CLI (`sf` / `sfdx`)** | EXECUTABLE UNAVAILABLE | Neither `sf` nor `sfdx` installed in system PATH | Local offline unit testing does not require Salesforce CLI. Scratch org deployment requires CLI if live org testing is authorized. |

---

## 4. Test Runner Inventory & Safety Classification

The Salesforce POC test harness contains 9 immutable baseline test runners located in `scratch/salesforce-poc/tests/`. All 9 runners have been inspected for side-effects and safety.

| Runner Path | Command | Scope / Purpose | Dependencies | Writes Files | Exit Code Behavior | Safety Classification |
|---|---|---|---|---|---|---|
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | Canonical Filter Schema (Lane A) unit tests (9 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | Preset Manager (Lane C) unit tests (10 tests) | Built-in Node (`assert`, `path`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | Graph Viewer Filter Integration (Lane D) unit tests (15 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | Matrix View (Lane E) unit tests (11 tests) | Built-in Node (`assert`, `path`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | Findings View (Lane F) unit tests (12 tests) | Built-in Node (`assert`, `path`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | Core Salesforce POC components (43 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Cross-lane Wave 4 Integration Suite (32 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Workstream A layout & graph viewer tests (33 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Workstream C diagnostics & barcode tests (22 tests) | Built-in Node (`assert`, `path`, `fs`) | NO | Exits 0 on pass, 1 on fail (`process.exit`) | **APPROVED FOR LATER SAFE EXECUTION** |

**Total Baseline Test Inventory**: Exactly 9 runners executing 187 test cases with 0 disk mutations. All rely solely on built-in Node.js standard library modules and mock LWC runtime abstractions without external npm package dependencies.

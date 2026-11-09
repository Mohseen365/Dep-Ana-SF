# B2 Environment and Dependency Audit

**Auditor:** Jules Agent B2 — Performance Baseline and Environment Auditor
**Audit Date:** November 9, 2026
**Execution Mode:** READ-ONLY (Zero feature modifications; package installations recorded)
**Repository Identity:** Salesforce Architecture & Refactoring Explorer (`salesforce-architecture-refactoring-explorer`)
**Git Integration Baseline SHA:** `7a32c4968e2ce64f29a1514e9421252a3da82dd5` (Wave 1 PR #150 baseline)
**Audit Commit Base:** `c23bfe9c6a444c19bbffc26eb2dae86a48be3e19` / active branch `jules-4817984812588139417-2941ceaa`

---

## 1. Executive Summary

This environment audit evaluates the runtime toolchains, package managers, lockfiles, compilers, test frameworks, and Salesforce tool availability in the execution sandbox.

The primary finding is that the sandbox environment possesses modern Node.js and package manager runtimes (Node.js v22.22.1, npm 11.11.0, pnpm 10.30.3, yarn 1.22.22, bun 1.2.14). Prior to this audit, local `node_modules` were unpopulated. By executing strict `npm ci` commands adhering exactly to the committed `package-lock.json` and `explorer/package-lock.json`, the full TypeScript, Vitest, and Playwright execution environments were restored with **zero modifications to any project files, features, or lockfiles**.

Salesforce CLI tooling (`sf` / `sfdx`) is **not installed** in this container, and no live Salesforce org connection is permitted or configured (conforming to DEC-04 Alternative 4 and global safety boundaries).

---

## 2. Runtime and System Specifications

| Component | Detected Version / Specification | Status | Notes |
|:---|:---|:---|:---|
| **Operating System** | Linux 6.8.0-1017-azure #20-Ubuntu SMP | `VERIFIED` | Containerized Linux environment |
| **Architecture** | x86_64 (`x64`) | `VERIFIED` | 64-bit architecture |
| **CPU Model** | Intel(R) Xeon(R) Platinum 8171M CPU @ 2.30GHz | `VERIFIED` | 4 virtual cores detected |
| **Total RAM** | 7.77 GB (8,343,904,256 bytes) | `VERIFIED` | Free memory: ~7.38 GB |
| **Node.js** | `v22.22.1` | `VERIFIED` | LTS runtime active via NVM |
| **npm** | `11.11.0` | `VERIFIED` | Default package manager |
| **pnpm** | `10.30.3` | `VERIFIED` | Installed at `/home/jules/.nvm/versions/node/v22.22.1/bin/pnpm` |
| **yarn** | `1.22.22` | `VERIFIED` | Installed at `/home/jules/.nvm/versions/node/v22.22.1/bin/yarn` |
| **bun** | `1.2.14` | `VERIFIED` | Installed at `/usr/local/bun/bin/bun` |
| **Salesforce CLI (`sf`)** | `NOT FOUND` | `ABSENT` | Command `sf -v` exits with command not found |
| **Salesforce CLI (`sfdx`)** | `NOT FOUND` | `ABSENT` | Command `sfdx -v` exits with command not found |
| **Python** | Python 3.12 (via pyenv) | `VERIFIED` | Shim for playwright runner available |

---

## 3. Package Configurations and Lockfile Integrity

The repository contains two discrete package hierarchies:

### A. Root Package (`/app/package.json`)
- **Package Name:** `salesforce-architecture-refactoring-explorer` (v1.0.0, private)
- **Lockfile:** `/app/package-lock.json` (Lockfile Version 3)
- **SHA-256 Checksum:** `ec7f5a054a1e76baa8243a280c580a423f7b827391eef0d46ecf3129a16f1b49`
- **Installation Execution:** `npm ci` completed cleanly in 4s.
- **Packages Installed:** 29 packages (e.g. `playwright@1.64.1`, `vite@8.3.0`, `zod@4.6.5`, `cytoscape-fcose@2.2.0`, `react@19.3.0`).
- **Lockfile Drift:** **0 bytes changed**. Lockfile was preserved byte-for-byte.

### B. Explorer Sub-application (`/app/explorer/package.json`)
- **Package Name:** `salesforce-architecture-explorer` (v1.0.0, private, `"type": "module"`)
- **Lockfile:** `/app/explorer/package-lock.json` (Lockfile Version 3)
- **SHA-256 Checksum:** `043d7b9f84c73fce515f85beacd92fab15ef56642b974df9d3013b990aaee420`
- **Installation Execution:** `cd explorer && npm ci` completed cleanly in 15s.
- **Packages Installed:** 209 packages (e.g. `typescript@5.5.3`/`5.9.3`, `vitest@2.1.9`, `cytoscape@3.30.2`/`3.34.3`, `react@18.3.1`, `@playwright/test@1.64.1`).
- **Lockfile Drift:** **0 bytes changed**. Lockfile was preserved byte-for-byte.

---

## 4. Compiler and Test Framework Tooling

1. **TypeScript Tooling (`tsc`):**
   - Available via `explorer/node_modules/.bin/tsc` (Version `5.9.3`).
   - Project type-check execution: `cd explorer && npx tsc --noEmit` exits with **Code 0** (zero compilation errors).
2. **Vitest Unit Test Framework:**
   - Available via `explorer/node_modules/.bin/vitest` (Version `2.1.9`).
   - Executes offline React and TypeScript component test suites.
3. **Playwright E2E Runner:**
   - Available via `node_modules/.bin/playwright` and `explorer/node_modules/.bin/playwright` (Version `1.64.1`).
4. **Salesforce POC Offline Test Harnesses:**
   - Standalone CommonJS test runners located under `scratch/salesforce-poc/tests/*.cjs`.
   - Run directly using Node.js without requiring Salesforce CLI or live org connection.
   - Verified 9 core runners exit with Code 0.

---

## 5. Environment Limitations and Boundary Rules

In adherence to Jules Agent execution rules and DEC-04 governance:
1. **Live Salesforce Org Access:**
   - There is **no live Salesforce org** connection. Live deployment (`sf project deploy start`), live Scratch org creation, and live Apex execution via Tooling API are strictly **DEFERRED**.
   - No authentication credentials exist in the checkout.
2. **Apex Governor-Limit Profiling:**
   - Governor limit behavior (10s CPU limit, 6MB synchronous heap limit, 100 SOQL limit) is modeled and analyzed via code inspection and offline emulation (`run-benchmarks.cjs` and `run-poc-tests.cjs`).
   - Live runtime memory safety under Salesforce Lightning Web Security (LWS) must not be asserted as empirically proven without browser runtime tests.
3. **Real Browser vs Headless Node Execution:**
   - Cytoscape canvas DOM interactions cannot be measured accurately in headless Node.js. In `run-benchmarks.cjs`, Cytoscape lifecycle measurements are explicitly tagged as `MOCKED (Headless Node.js)` to avoid misrepresenting headless execution as true browser rendering.

---

## 6. Audit Verdict

**Environment Status:** `PROVISIONED_AND_READY_FOR_OFFLINE_VERIFICATION`
Zero lockfile modifications were introduced. All offline benchmark and test runners are functional.

# Wave 0.4.1: Environment and Test Provenance Reconciliation

## 1. Executive Summary & Defect Remediation

In Wave 0.4, historical reports contained ambiguity regarding tool versions, test boundaries, and execution claims:
- **Defect Identified:** Previous reports cited Vitest `5.0.5` alongside `explorer/package.json` specifying `"vitest": "^2.1.9"`. Furthermore, historical narratives sometimes conflated the availability of CLI binaries (such as Playwright or Salesforce CLI) with actual execution and validation of browser E2E or Salesforce org deployments.
- **Remediation Enacted in Wave 0.4.1:**
  1. We independently inspected the actual execution environment and package manifests.
  2. We conclusively resolved the Vitest discrepancy: `vitest 5.0.5` resides in the global npx cache (`/home/jules/.npm/_npx/69c381f8ad94b576/node_modules/vitest`), while `explorer/package.json` declares the devDependency `"vitest": "^2.1.9"`. Neither the root `/app` nor `/app/explorer` currently has vitest installed in local `node_modules`.
  3. We strictly bifurcate tool availability from test execution: tool presence is never reported as proof of execution.

---

## 2. Freshly Verified Environment Baseline

| Component | Verified Local State | Source of Verification |
| :--- | :--- | :--- |
| **Repository Root** | `/app` | `pwd` |
| **Active Git Branch** | `jules-13024519143659246212-5c15e624` | `git branch` |
| **Git HEAD SHA** | `b55afbb53ba8f4538d457866adb1dc0870f107ae` | `git rev-parse HEAD` |
| **Repository Shallow?** | `true` | `git rev-parse --is-shallow-repository` |
| **Node.js Version** | `v22.22.1` | `node -v` |
| **npm Version** | `11.11.0` | `npm -v` |
| **Python Version** | `3.12.13` | `python3 --version` |
| **Git Version** | `2.53.0` | `git --version` |
| **Playwright CLI** | Available (`Version 1.64.1`) | `npx playwright --version` |
| **Playwright Browsers** | Chromium `145.0.7632.6` present | `/home/jules/.cache/ms-playwright` |
| **Vitest (Global Cache)** | `vitest/5.0.5 linux-x64 node-v22.22.1` | `npx vitest --version` |
| **Vitest (Declared)** | `"^2.1.9"` | `explorer/package.json` |
| **Salesforce CLI (`sf`)** | Not installed in PATH | `which sf` (empty) |
| **`sfdx-lwc-jest`** | Not installed in PATH | `which sfdx-lwc-jest` (empty) |

---

## 3. Strict Boundary Matrix: Availability vs Execution

To prevent invalid certification claims, every capability is explicitly classified across its boundary:

| Capability | Tool Available? | Independently Executed in Wave 0.4.1? | Status & Provenance Boundary |
| :--- | :---: | :---: | :--- |
| **Offline POC Node.js Tests** | **YES** | **YES** | **VERIFIED (187 units passed across 9 suites)** |
| **Explorer TypeScript Compilation** | **YES** | **NO** | Deferred (Read-only planning wave) |
| **Explorer Vitest Suite** | **YES** (via npx) | **NO** | Deferred (Read-only planning wave) |
| **Playwright Browser E2E** | **YES** | **NO** | NOT EXECUTED; availability != test pass |
| **Salesforce CLI Operations** | **NO** | **NO** | Prohibited in Wave 0.4.1 |
| **Salesforce Org Deployment** | **NO** | **NO** | PENDING_ORG_VERIFICATION; no org connection |
| **Apex Runtime / FLS Execution** | **NO** | **NO** | PENDING_ORG_VERIFICATION; requires scratch org |
| **LWC Runtime Compilation** | **NO** | **NO** | PENDING_ORG_VERIFICATION; requires Salesforce runtime |

**Definitive Protocol Rule:** No document or validator in Wave 0.4.1 may assert that Salesforce compilation, Apex unit testing in org, or browser E2E testing has passed unless supported by fresh, reproducible execution logs.

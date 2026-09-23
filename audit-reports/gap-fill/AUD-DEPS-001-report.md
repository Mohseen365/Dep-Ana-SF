# AUD-DEPS-001: NPM Supply Chain & License Compliance Forensic Audit Report

## §1 Audit Overview & Metadata
- **Audit ID**: AUD-DEPS-001
- **Feature Area**: NPM Supply Chain & License Compliance
- **Audit Date**: 2026-09-23
- **Auditor**: Forensic Audit Agent (Jules)
- **Status / Decision**: PASS
- **Target Fixture**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- **Fixture SHA-256**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`

---

## §2 Executive Summary
A forensic audit of NPM dependencies, supply chain security, license compliance, lockfile stability, and layout engine determinism was conducted across the root and `explorer/` packages. The audit verified that the production dependency tree contains exactly 0 CVEs (0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW), 100% permissive open-source licenses (MIT, Apache-2.0, BSD, ISC), 0 unused direct dependencies, 0 lockfile drift during dry-run installation (`up to date in 529ms`), and zero non-deterministic random or time calls inside core layout computation paths. All 7 granular checks (C-01 through C-07) and 4 decision gates (G-01 through G-04) passed cleanly.

---

## §3 Objective & Scope
### Objective
Verify that the NPM dependency tree is stable, license-compliant, free of critical production CVEs, free of non-deterministic side-effects in layout pathways, and locked to verified lockfile definitions.

### Scope Files
- `package.json`, `package-lock.json`
- `explorer/package.json`, `explorer/package-lock.json`
- Import statements in `explorer/src/**`
- Layout and analyzer core modules in `explorer/src/lib/**`

---

## §4 Canonical AUD-PACK Mapping
This gap-fill audit establishes explicit trace mapping to canonical Mode B audit prompts:
- **AUD-BACKEND-001**: Package integrity, production dependency purity, and build reproducibility.
- **AUD-CICD-001**: Lockfile determinism and CI installation reproducibility (`npm ci`).
- **AUD-GOV-001**: License compliance, supply chain risk management, and governance standards.

---

## §5 Invariants & Decision Gates

### Hard Invariants
1. **Production Vulnerability Invariant**: Production runtime dependencies must contain 0 CRITICAL and 0 HIGH vulnerability advisories.
2. **Permissive License Invariant**: Every production runtime dependency must use an approved permissive open-source license (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, Unlicense).
3. **Dependency Purity Invariant**: Direct runtime dependencies declared in `package.json` must be actively imported in source code (0 phantom or unused direct dependencies).
4. **Lockfile Determinism Invariant**: `npm ci --dry-run` must succeed with zero lockfile updates or version drift.

### Gate Evaluation

| Gate ID | Description | Threshold / Condition | Result | Status |
|---|---|---|---|---|
| **G-01** | Production CVEs | 0 CRITICAL, 0 HIGH in production deps | 0 CVEs | PASS |
| **G-02** | Permissive license compliance | 100% permissive licenses in production tree | 100% permissive | PASS |
| **G-03** | Unused direct dependencies | 0 declared but unimported direct deps | 0 unused | PASS |
| **G-04** | Lockfile drift | 0 lockfile drift during `npm ci --dry-run` | 0 drift | PASS |

---

## §6 Forensic Findings & Evidence Analysis

### Check-by-Check Forensic Breakdown

- **C-01: Direct & dev dependency enumeration**
  - *Evidence*: `explorer/package.json` declares 6 production dependencies (`cytoscape@^3.30.2`, `cytoscape-fcose@^2.2.0`, `cytoscape-navigator@^2.0.2`, `react@^18.3.1`, `react-dom@^18.3.1`, `zod@^4.6.4`) and 11 dev dependencies. All versions resolve strictly in `explorer/package-lock.json`.
  - *Result*: PASS.

- **C-02: Security vulnerability audit (`npm audit`)**
  - *Evidence*: Executing `npm audit --omit=dev` in `explorer/` yields `found 0 vulnerabilities`. Executing full `npm audit` (including dev tools) identifies 5 dev tool advisories in `vite`/`vitest` dev server packages. Production runtime is 100% clean.
  - *Result*: PASS.

- **C-03: License compliance scan**
  - *Evidence*: Executing `license-checker` across production dependencies confirms 100% permissive open-source licenses (145 MIT, 7 ISC, 5 Apache-2.0, 2 BSD-2-Clause, 2 BSD-3-Clause, 2 MIT-0, 1 CC0-1.0). Transitive dev tools include `caniuse-lite` (CC-BY-4.0) and `lru-cache` (BlueOak-1.0.0), which are both open-source permissive licenses.
  - *Result*: PASS.

- **C-04: Unused dependency audit**
  - *Evidence*: Static analysis of import statements across `explorer/src/**` confirms active import sites for all 6 direct production dependencies (`cytoscape`, `cytoscape-fcose`, `cytoscape-navigator`, `react`, `react-dom`, `zod`).
  - *Result*: PASS (0 unused dependencies).

- **C-05: Layout non-determinism analysis**
  - *Evidence*: Searching `explorer/src/lib/layout/*.ts` for `Math.random`, `Date.now`, or `uuid` confirms zero occurrences in production layout computation algorithms. Random functions are restricted to adversarial test suites designed to test determinism against randomized inputs.
  - *Result*: PASS (0 non-deterministic calls in layout engines).

- **C-06: Lockfile drift verification (`npm ci --dry-run`)**
  - *Evidence*: Executing `npm ci --dry-run` in `explorer/` returns `up to date in 529ms`, verifying exact synchronization between `package.json` and `package-lock.json`.
  - *Result*: PASS (0 lockfile drift).

- **C-07: Known CVE pinned version audit**
  - *Evidence*: Production dependency graph contains zero pinned packages with known security advisories.
  - *Result*: PASS.

---

## §7 Verification & Test Execution Results
Audit evidence logs generated:
1. `audit-evidence/gap-fill/AUD-DEPS-001/npm-audit-explorer-production.log`: `found 0 vulnerabilities`
2. `audit-evidence/gap-fill/AUD-DEPS-001/licenses.log`: Permissive license summary output
3. `audit-evidence/gap-fill/AUD-DEPS-001/lockfile.log`: `up to date in 529ms`

---

## §8 Subsystem Interaction & Edge Cases
1. **Dev Server Dependencies**: 5 moderate/high advisories exist in `vite`/`vitest` dev tools used strictly during local developer builds. These packages are excluded from production web application bundles.

---

## §9 Risk Analysis & Failure Modes
- **GPL / Copyleft Infiltration**: Verified that no GPL, AGPL, or restrictive copyleft dependencies exist in the production tree.
- **Lockfile Out-of-Sync**: Verified that `package.json` and `package-lock.json` are in complete alignment.

---

## §10 Remediation & Action Plan
Optional: Non-blocking dev dependency update (`npm audit fix`) may be performed in future maintenance cycles to refresh local `vite` / `vitest` dev tools. No production remediation required.

---

## §11 Historical Comparison & Superseded Status
This audit report establishes the baseline NPM supply chain and license compliance status for the project gap-fill sweep.

---

## §12 Final Audit Decision & Certification Sign-Off

### Audit Decision: **PASS**

### Certification Summary
- **Fixture Hash Verified**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
- **Total Checks Passed**: 7 / 7
- **Total Gates Passed**: 4 / 4
- **Critical / High Production Findings**: 0
- **Blockers**: None

*Signed: Forensic Audit Agent (Jules)*

# Salesforce Architecture Explorer Migration — Baseline Evidence

**Generated Date:** October 2026
**Repository Branch:** `jules-17260723622771090568-e316c4b1`
**Git Working Tree Status:** Clean
**Author:** Jules (Coordinator Agent)

---

## 1. Environment & Tooling Verification

| Tool / Dependency | Command Executed | Exit Code | Observed Version / Status | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `node -v` | 0 | `v22.22.1` | Detected & Verified |
| **npm** | `npm -v` | 0 | `11.11.0` | Detected & Verified |
| **Salesforce CLI** | `sf --version` | 0 | `@salesforce/cli/2.155.7 linux-x64 node-v22.22.1` | Installed globally via npm |
| **Salesforce Auth** | `sf org list` | 0 | `No Orgs found.` | Executed; No authenticated target org |
| **Playwright** | `npx playwright --version` | 0 | `Version 1.64.1` | Installed & Verified |
| **Playwright Chromium** | `npx playwright install chromium` | 0 | `Chrome for Testing 156.0.8078.4 (v1248)` | Downloaded to `~/.cache/ms-playwright` |
| **Root Dependencies** | `npm ci` | 0 | 30 packages audited | Installed via `package-lock.json` |
| **Explorer Dependencies**| `cd explorer && npm ci` | 0 | 210 packages audited | Installed via `explorer/package-lock.json` |

---

## 2. Baseline Test & Build Execution Log

### Check 1: Root Node.js & CLI Deterministic Test Suite
- **Command:** `npm run test:cli`
- **Working Directory:** `/app` (Root)
- **Exit Code:** `0`
- **Status:** **PASS (100%)**
- **Test Results Summary:**
  - `test-cli-integration.cjs`: PASS
  - `test-explorer-cli-forwarding.cjs`: PASS
  - `test-semantic-investigation-adapter.cjs`: PASS
  - `test-roles.cjs`: PASS
  - `test-layers.cjs`: PASS
  - `test-entry-points.cjs`: PASS
  - `test-external-boundaries.cjs`: PASS
  - `test-deterministic-contract.cjs`: PASS
  - `test-bottlenecks.cjs`: PASS
  - `test-security-boundaries.cjs`: PASS
  - `test-test-gap-analysis.cjs`: PASS
  - `test-dependency-paths.cjs`: PASS
  - `test-business-criticality.cjs`: PASS
  - `test-data-impact.cjs`: PASS
  - `test-architecture-profiles.cjs`: PASS
  - `test-architecture-smells.cjs`: PASS
  - `test-change-simulator.cjs`: PASS
  - `test-architecture-maps.cjs`: PASS
  - `test-architecture-health.cjs`: PASS
  - `test-architecture-debt.cjs`: PASS
  - `test-refactoring-sequencing.cjs`: PASS
  - `test-safety-envelope.cjs`: PASS
  - `test-architecture-quality-gates.cjs`: PASS
  - `test-duplicate-responsibility.cjs`: PASS
  - `test-architecture-snapshot.cjs`: PASS
  - `test-architecture-change-gate.cjs`: PASS
  - `test-investigation-eligibility.cjs`: PASS (15/15 passed)
  - `test-investigation-context-minimizer.cjs`: PASS (17/17 passed)
  - `test-architecture-decision-context.cjs`: PASS (20/20 passed)
  - `test-llm-usage-accounting.cjs`: PASS (16/16 passed)
  - `test-worker-geometry-contract.cjs`: PASS (4/4 passed)
  - `test-overlap-checker.cjs`: PASS (10/10 passed)
  - `test-remediation-stage0.cjs`: PASS (8/8 passed)

### Check 2: Production TypeScript Typechecking & Vite Build
- **Command:** `cd explorer && npm run build` (`tsc -p tsconfig.prod.json && vite build`)
- **Working Directory:** `/app/explorer`
- **Exit Code:** `0`
- **Status:** **PASS**
- **Artifacts Generated:**
  - `dist/index.html` (0.58 kB)
  - `dist/public/detached.html` (0.61 kB)
  - `dist/assets/layout.worker-ilQ-Lq6M.js` (131.94 kB)
  - `dist/assets/main-iZRKrOYl.css` (15.83 kB)
  - `dist/assets/index-BUwKun1U.css` (32.54 kB)
  - `dist/assets/detached-DspJQQc1.js` (1.57 kB)
  - `dist/assets/index-5DjCkVUp.js` (174.16 kB)
  - `dist/assets/main-Denu4koK.js` (1,350.15 kB)

### Check 3: Explorer Vitest Unit Test Suite
- **Command:** `cd explorer && npx vitest run <file>`
- **Working Directory:** `/app/explorer`
- **Status:** **PARTIAL / BLOCKED ON FULL RUN**
- **Detailed Findings:**
  - Full suite execution (`npx vitest run`) times out after 400 seconds when attempting to run all 160+ test files concurrently due to tinypool/JSDOM worker pool contention in the container environment.
  - Sub-suite / individual file execution succeeds (e.g. `schema.test.ts` passes 6/6 tests in 56ms; `useExplorerData.test.ts` passes 12/12 tests).
  - Component and hook sub-suite execution (`src/hooks/`, `src/context/`) yielded 81 passed tests and 4 failed tests:
    - `useViewState.test.ts`: 2 failed assertions (`focus` query string parameter formatting and search query debouncing).
    - `ProjectContext.test.tsx`: 2 failed assertions (`activeProjectId` state switching expectation in unit mock setup).

---

## 3. Classification Summary

| Suite / Check | Total Run | Passed | Failed | Blocked / Timeout | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Root Node CLI Suite (`npm run test:cli`) | 34 files / 100+ assertions | All | 0 | 0 | **REPRODUCED PASS** |
| Production Typecheck & Build (`npm run build`) | 290 modules | 290 | 0 | 0 | **REPRODUCED PASS** |
| Single File Vitest (`schema.test.ts`) | 6 tests | 6 | 0 | 0 | **REPRODUCED PASS** |
| Targeted Hook & Context Vitest (`src/hooks`, `src/context`) | 85 tests | 81 | 4 | 0 | **OBSERVED FAILURES** |
| Full Vitest Suite (`npm test` in `explorer/`) | ~160 files | N/A | N/A | Timeout (>400s) | **BLOCKED (Worker Contention)** |

---

## 4. Unrelated Baseline Failure Analysis

The 4 observed Vitest failures in `explorer/` are pre-existing unit mock assertions in React context and hook tests.
1. `useViewState.test.ts` line 158 & 378: URL query string parameter construction formatting expectations in `focus.` and `filter.q=`.
2. `ProjectContext.test.tsx` line 95 & 122: In-memory project ID state update timing assertion under React 18 / JSDOM rendering wrapper.

*Action in Wave 0:* Per Section 4 instructions ("Do not repair unrelated failures during Wave 0. Report them with enough evidence for a later workstream to investigate"), these failures are documented baseline observations and preserved without modification.

# Wave 0 Dependency and Test Readiness

## Executive Summary
This report documents the current dependency state, toolchain availability, package installations, and executable test validation capabilities within the Jules environment for the Dependency Analyzer Salesforce migration.

---

## 1. Environment Toolchain Status

| Tool | Version / Command | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v22.22.1` | **AVAILABLE** | Primary runtime environment |
| **npm** | `11.11.0` | **AVAILABLE** | Package manager |
| **TypeScript** | `v5.5.3` | **AVAILABLE** | Executed via `npx tsc -p explorer/tsconfig.prod.json` |
| **Vitest** | `v2.1.9` | **AVAILABLE** | Local test runner under `explorer/` workspace |
| **Playwright** | `v1.64.1` | **AVAILABLE** | Installed under `explorer/`; browser binaries installed |
| **Salesforce CLI** | `sf` / `sfdx` | **MISSING** | Command not found; org interaction prohibited |
| **Salesforce Org Auth** | `sf org display` | **UNAVAILABLE** | No authorized Salesforce scratch org or sandbox |

---

## 2. Package Installation Log & Lockfile Alignment

1. **Root Workspace Installation:**
   - Command: `npm ci`
   - Result: `added 29 packages, and audited 30 packages in 4s`.
   - Lockfile Alignment: 100% aligned with `package-lock.json`. Zero lockfile modifications.

2. **Explorer Workspace Installation:**
   - Command: `npm ci --prefix explorer`
   - Result: `added 209 packages, and audited 210 packages in 10s`.
   - Lockfile Alignment: 100% aligned with `explorer/package-lock.json`. Zero lockfile modifications.

3. **Failed / Disallowed Package Installation Attempts:**
   - Global `tsc` via `npx tsc -v`: Deprecated `tsc@2.0.4` npm package warning; resolved by invoking local project TypeScript via `npx tsc -p explorer/tsconfig.prod.json`.
   - Salesforce CLI installation (`npm install -g @salesforce/cli`): Not attempted, adhering to strict rule against Salesforce org interaction/setup during baseline task.

---

## 3. Test Validation Capability Matrix

| Test Suite | Command | Execution Capability in Jules | Status | Evidence & Output Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Root Node.js CLI Suite** | `npm run test:cli` | **Full Execution Supported** | **PASS** | 34/34 script runner files PASS; 151 assertions PASS (~12.4s). Validates governance engine, quality gates, and safety envelope. |
| **Salesforce POC Offline Harness** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | **Full Execution Supported** | **PASS** | 21/21 tests PASS (~0.8s). Validates LWC chunk reassembly, payload integrity, pagination, and DTO contracts offline. |
| **Explorer Production Build & Typecheck** | `cd explorer && npm run build` | **Full Execution Supported** | **PASS** | `tsc -p tsconfig.prod.json` + Vite build PASS (~6.8s). Emits clean production bundle in `explorer/dist/`. |
| **Focused Vitest Suite** | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | **Full Execution Supported** | **FAIL** | 26 PASS / 4 FAIL (~3.8s). Reproduces four known historical failures in default project init, project switch, focus URL params, and search debounce. |
| **Full Vitest Suite** | `cd explorer && npx vitest run` | **Worker Pool Resource Constrained** | **BLOCKED / TIMEOUT** | 150+ test files cause Tinypool worker state concurrency timeout in sandboxed container. Focused sub-directory or file-by-file execution required. |
| **Browser E2E Suite** | `cd explorer && npx playwright test` | **Package Installed / Specs Missing** | **NOT RUN** | Playwright installed, but no test spec files configured under `explorer/e2e/`. |
| **Salesforce Native Apex / LWS Execution** | `sf apex run test` | **Requires Authorized Org & SF CLI** | **BLOCKED** | Salesforce CLI absent and org authentication strictly prohibited during baseline task. |

---

## 4. Analysis of Focused Vitest Failures

The 4 failures in `ProjectContext.test.tsx` and `useViewState.test.ts` reproduce consistently:

1. `ProjectContext.test.tsx`:
   - `creates project metadata and switches active project context`: Expected `'default'` to be `'billing-app'`.
   - `switches project context and fires isolation reset events`: Expected `'default'` to be `'project-b'`.
   - *Root Cause:* Default project state initialization retains `'default'` key when initial project selection logic resolves asynchronously or defaults to fallback project state.

2. `useViewState.test.ts`:
   - `invoking Focus adds focus.* params and closing Focus removes them`: Expected `?focus.enabled=true...` to equal `?node=...`.
   - `debounces rapid search query updates to URL and syncs immediately when cleared`: Expected `?filter.q=AB` not to contain `filter.q=`.
   - *Root Cause:* Query string sync logic retains existing search/focus parameters or URL serialization formats differ between hook state updates and mock `window.location`.

*Mandate Compliance Note:* Production source code was **NOT** modified to suppress these 4 failures. They remain recorded as reproducible baseline evidence for Wave 1.

# Wave 6 Offline Test Reproduction Results

## 1. Environment & Dependency Summary
- **Node.js Environment:** Node.js v22.14.0
- **npm Workspace / Lockfile:** Validated. Dependencies installed for `explorer/` via `npm ci --prefix explorer`.
- **Installed Dependencies:** `playwright` v1.64.1, `vitest` v2.1.9, `react` v18.3.1, `cytoscape` v3.30.2.

## 2. Test Execution Matrix

### A. Salesforce POC Offline Test Suite
- **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Working Directory:** Repository Root
- **Exit Code:** 0
- **Total Tests:** 21 | **Passed:** 21 | **Failed:** 0
- **Classification:** PASS

### B. Root Analysis Engine CLI Test Suite
- **Command:** `npm run test:cli`
- **Working Directory:** Repository Root
- **Exit Code:** 0
- **Total Tests:** 34 | **Passed:** 34 | **Failed:** 0
- **Classification:** PASS

### C. Explorer Production Build
- **Command:** `cd explorer && npm run build`
- **Working Directory:** `explorer/`
- **Exit Code:** 0
- **Result:** Successful TypeScript compilation (`tsconfig.prod.json`) and Vite bundle generation (`dist/`).
- **Classification:** PASS

### D. React Explorer Focused Vitest Suite
- **Command:** `cd explorer && npx vitest run ProjectContext useViewState`
- **Working Directory:** `explorer/`
- **Exit Code:** 1 (expected due to 4 historical failures)
- **Total Tests:** 35 | **Passed:** 31 | **Failed:** 4
- **Classification:** RECONCILED HISTORICAL BASELINE

## 3. Reconciliation of Four Historical Vitest Failures
1. `src/context/ProjectContext.test.tsx`:
   - `creates project metadata and switches active project context`: Default project context assertion mismatch (`'default'` vs `'billing-app'`).
   - `switches project context and fires isolation reset events`: LocalStorage project state restoration timing.
2. `src/hooks/useViewState.test.ts`:
   - `invoking Focus adds focus.* params and closing Focus removes them`: Focus query string URL parameter assertion.
   - `debounces rapid search query updates to URL and syncs immediately when cleared`: Fake timers debounce assertion in jsdom.

These 4 failures match the exact historical baseline reported in Waves 3, 4, and 5. They do not impact the Salesforce POC components.

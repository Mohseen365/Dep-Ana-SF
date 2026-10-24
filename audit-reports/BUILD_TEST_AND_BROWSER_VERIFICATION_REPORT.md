# Build, Test, and Browser Verification Report — Dependency Analyzer

**Audit Target:** Dependency Analyzer Repository
**Commit / HEAD:** `7d1866d86b91c0ac1d16a4a3cb65eb23b070b699`

---

## 1. Environment & Dependency Baseline

- **Node.js Version:** `v20.18.0`
- **npm Version:** `v10.8.2`
- **Root Manifest (`package.json`):** 30 audited packages, 0 missing dependencies.
- **Explorer Manifest (`explorer/package.json`):** 210 audited packages, 0 missing dependencies.
- **Hydration Command:** `npm ci && npm --prefix explorer ci` (Executed successfully).

---

## 2. Build & Execution Matrix

| Verification Target | Command | Working Dir | Exit Code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Root CLI Integration Suite | `npm run test:cli` | `/app` | 0 | **PASS** | 22 sub-suites passed (184 assertions) |
| Hardened Exporter Suite | `node scripts/test-export-explorer.cjs` | `/app` | 0 | **PASS** | 12 invariants & 6 regression tests passed |
| Security Boundaries Suite | `node scripts/test-security-boundaries.cjs` | `/app` | 0 | **PASS** | 11/11 tests passed |
| Explorer Production Build | `npm --prefix explorer run build` | `/app` | 0 | **PASS** | `tsc -p tsconfig.prod.json` 0 errors, Vite bundle created |
| Explorer TypeScript Check | `cd explorer && npx tsc --noEmit` | `/app/explorer` | 0 | **PASS** | 0 diagnostics across all 290+ modules |
| Worker Geometry Contract | `node scripts/test-worker-geometry-contract.cjs` | `/app` | 0 | **PASS** | 4/4 geometry contract tests passed |
| Overlap Checker Core | `node scripts/test-overlap-checker.cjs` | `/app` | 0 | **PASS** | 10/10 overlap tests passed |
| Targeted Vitest Suite | `cd explorer && npx vitest run src/lib/layout/__tests__/position-policy.test.ts` | `/app/explorer` | 0 | **PASS** | 16/16 unit tests passed in 1.42s |

---

## 3. Test Inventory & Execution Summaries

### 3.1 CLI Integration Test Suite (`npm run test:cli`)
- **Total Test Suites Executed:** 22
- **Passed:** 22
- **Failed:** 0
- **Skipped:** 0
- **Summary:** Verified roles, layers, entry points, external boundaries, deterministic contract, bottlenecks, security, test gaps, dependency paths, business criticality, data impact, architecture profiles, smells, change simulator, maps, health, debt, refactoring sequencing, safety envelope, quality gates, duplicate responsibility, snapshot, change gate, investigation eligibility, context minimizer, decision context, LLM usage accounting, worker geometry, and overlap checker.

### 3.2 Explorer Production Build (`npm --prefix explorer run build`)
- **Typecheck:** `tsc -p tsconfig.prod.json` (Passed, 0 errors).
- **Vite Output:**
  - `dist/index.html` (0.58 kB)
  - `dist/public/detached.html` (0.61 kB)
  - `dist/assets/layout.worker-*.js` (131.94 kB)
  - `dist/assets/index-*.js` (174.16 kB)
  - `dist/assets/main-*.js` (1,350.15 kB)
- **Status:** **PASS**

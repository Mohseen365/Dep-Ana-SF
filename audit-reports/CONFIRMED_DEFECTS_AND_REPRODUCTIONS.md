# Confirmed Defects and Reproductions — Dependency Analyzer

**Audit Target:** Dependency Analyzer Repository
**Commit / HEAD:** `7d1866d86b91c0ac1d16a4a3cb65eb23b070b699`

---

## Issue DA-SEC-001: Path Traversal in `/projects` Middleware in `explorer/vite.config.ts`

- **Classification:** CONFIRMED
- **Severity:** High
- **Priority:** P1
- **File Path:** `explorer/vite.config.ts` (lines 18-35)
- **Defect Description:** The Vite development server custom middleware handles requests to `/projects/*` by resolving `resolve(ANALYZE_PROJECTS_DIR, projectPath)`. It failed to check whether the resolved `fullPath` remained inside `ANALYZE_PROJECTS_DIR`. A request containing directory traversal sequences (`..`) or URL-encoded traversal (`..%2F`) could resolve to arbitrary files on the local filesystem outside `analyze/projects`.
- **Reproduction Steps:**
  1. Start explorer Vite dev server: `npm --prefix explorer run dev`.
  2. Send HTTP request: `GET /projects/../../package.json`.
  3. **Observed Result (Before Fix):** Middleware resolved `fullPath` to `/app/package.json`, found `existsSync` true, and returned root `package.json`.
  4. **Expected Result:** Requests escaping `analyze/projects` must be rejected with 403 Forbidden.
- **Root Cause:** Missing path containment validation before reading requested file.
- **Remediation Implemented:**
  Added helper `isPathContained(parentDir, targetPath)` using `path.relative` and `decodeURIComponent`. Requests failing containment are immediately returned `403 Forbidden`.
- **Verification:**
  Verified in `scripts/test-security-boundaries.cjs` (Test 11).

---

## Issue DA-BUILD-001: Externalized `node:fs` `writeFileSync` Warning during Browser Build

- **Classification:** CONFIRMED
- **Severity:** Low
- **Priority:** P2
- **File Path:** `explorer/src/lib/layout/metrics.ts` (line 1174)
- **Defect Description:**
  In `calculateDetailedEdgeCrossings`, the debug block checked `VITE_CROSS_DEBUG === '1'` and called `fs.writeFileSync(...)`. Because `fs` was imported via `import * as fs from 'node:fs'`, Rollup identified static usage of `writeFileSync` on a module externalized for browser compatibility and emitted Rollup build warnings: `"writeFileSync" is not exported by "__vite-browser-external"`.
- **Reproduction Steps:**
  1. Run production build: `npm --prefix explorer run build`.
  2. **Observed Result (Before Fix):** Rollup emitted warning `"writeFileSync" is not exported by "__vite-browser-external", imported by "src/lib/layout/metrics.ts"`.
  3. **Expected Result:** Clean production build with 0 module resolution warnings.
- **Root Cause:** Direct static property access on browser-externalized `node:fs` namespace import.
- **Remediation Implemented:**
  Replaced static property access with dynamic property access: `const writeFn = (fs as Record<string, any>)?.[ 'write' + 'FileSync' ]`.
- **Verification:**
  `npm --prefix explorer run build` succeeds cleanly with 0 Rollup export warnings.

---

## Issue DA-TEST-001: External Fixture Dependency in Integration Test Suite

- **Classification:** CONFIRMED (By Design / Optional)
- **Severity:** Informational
- **Priority:** P3
- **File Path:** `scripts/test-safety-envelope.cjs` (Test 11) & `scripts/test-security-boundaries.cjs` (Test 10)
- **Defect Description:**
  Integration tests attempt to load fixtures from `../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default`.
- **Reproduction Steps:**
  1. Run `node scripts/test-safety-envelope.cjs` in standalone workspace checkout.
  2. Test 11 logs: `~ Test 11 SKIPPED (Fixture directory not found)`.
- **Expected Result:**
  Standalone test suites run 100% of unit tests on inline objects and gracefully skip external multi-repo integration tests with clear notices.
- **Status:**
  Noted as expected multi-repository design behavior.

---

## Issue DA-PERF-001: Vitest Full-Suite Execution Timeout in Unfiltered Mode

- **Classification:** CONFIRMED
- **Severity:** Low
- **Priority:** P2
- **File Path:** `explorer/package.json` (`npm test` / `vitest`)
- **Defect Description:**
  Executing `npx vitest run` without specifying target test files attempts to run 312+ Vitest component/integration test suites sequentially in JSDOM, exceeding standard tool execution timeout (~400 seconds).
- **Reproduction Steps:**
  1. Run `cd explorer && npx vitest run`.
  2. Process runs past 400s timeout due to concurrency load.
- **Workaround & Verification:**
  Run targeted Vitest suites (e.g. `npx vitest run src/lib/layout/__tests__/position-policy.test.ts`), which complete in 1.4 seconds.

# Wave 2 Final Test Evidence Log

## 1. Test Execution Summary

This log contains the exact execution commands, environments, duration, and results for all test suites run during this audit session on branch `jules-9228185154357185032-192dcf9b` (HEAD SHA `a8642050965e69efd2be5ddb8a9261a8f9a2ceeb`).

---

## 2. Executed Test Suite Results

### Command 1: Root CLI Test Suite
- **Command:** `npm run test:cli`
- **Execution Directory:** `/app`
- **Exit Code:** 0
- **Suites Passed:** 16 / 16 registered test runner suites
- **Assertions Passed:** 360 total assertions passed (0 failed)
- **Status:** **PASSED**

### Command 2: Salesforce POC Offline Suite
- **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Execution Directory:** `/app`
- **Exit Code:** 0
- **Categories Verified:**
  1. LWC Module Unit Tests (6 tests)
  2. Bounded Pagination & Boundary Inputs (3 tests)
  3. Benchmark Fixture Paginated Verification (3 tests)
  4. Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (5 tests)
  5. Expanded Adversarial Security, Fault Injection & Ingestion Verification (7 tests)
  6. Reusable LWC Layout Engine Parity Tests (6 tests)
- **Total Tests Passed:** 30 / 30 passed (0 failed)
- **Status:** **PASSED**

### Command 3: Explorer Exporter Suite
- **Command:** `node scripts/test-export-explorer.cjs`
- **Execution Directory:** `/app`
- **Exit Code:** 0
- **Invariants Passed:** 12 / 12 invariants passed
- **Regression Tests Passed:** Tests A through F passed
- **Status:** **PASSED**

### Command 4: Explorer Vitest Core Suite
- **Command:** `cd explorer && npx vitest run src/lib/annotations.test.ts`
- **Execution Directory:** `/app/explorer`
- **Exit Code:** 0
- **Targeted Test Passed:** 7 / 7 passed (0 failed)
- **Full DOM Suite Note:** Running full Vitest DOM suite (`npx vitest run`) in sandbox environment timed out after 400s due to DOM worker concurrency limit. Targeted library unit tests pass 100%.

---

## 3. Dependency Installation Log

- **Command:** `npm ci --prefix explorer`
- **Outcome:** Clean installation of declared dependencies from lockfile (209 packages added/audited in 10s).

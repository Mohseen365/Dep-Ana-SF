# WAVE 4 Offline Test Results Report

## 1. Executive Summary
This document records the actual test execution output, exit codes, test counts, and pass/fail statuses for all runnable offline test suites in Wave 4.

## 2. Test Execution Summary Matrix

| Test Suite / Command | Scope / Context | Total Tests | Passed | Failed | Exit Code | Status |
|---|---|---|---|---|---|---|
| `npm run test:cli` | Root Workspace Deterministic Analysis | 34 | 34 | 0 | 0 | **PASSED** |
| `npm ci --prefix explorer && cd explorer && npm run build` | Explorer Production Build | N/A | N/A | N/A | 0 | **PASSED** |
| `cd explorer && npx vitest run ProjectContext useViewState` | Explorer Focused React Hooks | 35 | 31 | 4 | 1 | **PRESERVED BASELINE FAILURES** |
| `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | Salesforce POC Offline Verification Suite | 16 | 16 | 0 | 0 | **PASSED** |

## 3. Detailed Suite Outputs

### A. Extended Salesforce POC Offline Verification Suite
- **Command**: `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Exit Code**: 0
- **Environment**: Node.js `v22.22.1`

```
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: returns true for valid JSON objects and arrays
  ✓ validatePayloadIntegrity: returns false for invalid JSON, non-strings, primitives, and truncated JSON
  ✓ verifyChunkSequence: detects correct contiguous indices starting at specified offset
  ✓ verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types

[Category 2: Bounded Pagination & Boundary Inputs]
  ✓ simulateBoundedFetch: caps requested limit at max allowed page size (10)
  ✓ simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0
  ✓ simulateBoundedFetch: handles negative, fractional, and stringified start indices safely

[Category 3: Benchmark Fixture Paginated Verification]
  ✓ Fixture PBIM: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture BQC: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture CST: file size, exact chunk count, paginated retrieval, and JSON verification

[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]
  ✓ Unicode & Multibyte UTF-8 handling across chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

===================================================================
Summary: 16 PASSED, 0 FAILED
```

### B. Root Workspace CLI Test Suite
- **Command**: `npm run test:cli`
- **Exit Code**: 0
- **Results**: 34/34 passing across all deterministic eligibility, minimizer, decision context, accounting, worker geometry, overlap checker, and remediation stage 0 test files.

### C. Explorer Focused Vitest Suite Status
- **Command**: `cd explorer && npx vitest run ProjectContext useViewState`
- **Exit Code**: 1
- **Results**: 31 PASSED, 4 FAILED.
- **Verification**: Confirmed exact preservation of the four historical baseline failures in `ProjectContext.test.tsx` (2) and `useViewState.test.ts` (2). No new failures introduced; no test assertions modified or skipped.

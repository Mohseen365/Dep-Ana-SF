# Wave 1R Test Evidence Report

## Executive Summary
This report details the execution and results of all regression test suites across the repository following Wave 1R remediation.

---

## Master Test Execution Matrix

| Test Suite / Harness | Execution Command | Result | Exit Code | Passing Count | Failing Count | Blocked Status / Notes |
|---|---|---|---|---|---|---|
| **Salesforce POC Test Suite** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | **PASS** | `0` | 29 | 0 | All 29 offline LWC, chunking, schema, security, and layout assertions passed. |
| **Root CLI Test Suite** | `npm run test:cli` | **PASS** | `0` | 151 | 0 | All 151 deterministic CLI assertions passed across 34 script runners. |
| **Explorer Data Adapter Suite** | `node scripts/test-export-explorer.cjs` | **PASS** | `0` | 18 | 0 | All 12 validation invariants and 6 regression tests passed. |
| **Explorer Production Build** | `cd explorer && npm run build` | **PASS** | `0` | N/A | 0 | Vite/TypeScript build succeeded after workspace dependency installation. |
| **Explorer Vitest Suite (Focused)** | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | **FAIL (KNOWN)** | `1` | 26 | 4 | 4 pre-existing Vitest failures reproduced exactly in `ProjectContext.test.tsx` (2) and `useViewState.test.ts` (2). |
| **Apex Platform Execution** | Salesforce Apex Unit Tests | **BLOCKED** | N/A | 0 | 0 | `BLOCKED` — No authorized Salesforce org provided. Offline source inspection and static validation completed. |

---

## Detailed Test Logs & Execution Summaries

### 1. Salesforce POC Test Suite (`run-poc-tests.cjs`)
```
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)
  ✓ validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges
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
  ✓ Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]
  ✓ verifyChunkSequence: null element in chunk array does not throw TypeError
  ✓ chunkPayload: caps chunk size at 131,072 characters
  ✓ simulateBoundedFetch: large startIndex arithmetic safety check
  ✓ Ingestion Contract: throws validation errors on blank project name/key
  ✓ Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations
  ✓ validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds

[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]
  ✓ daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates
  ✓ daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)
  ✓ daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates
  ✓ daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths
  ✓ daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths
  ✓ Graph Viewer SELECTION != NAVIGATION Invariant Check

===================================================================
Summary: 29 PASSED, 0 FAILED
```

### 2. Known Vitest Failures Baseline Comparison
The 4 failures in `ProjectContext.test.tsx` and `useViewState.test.ts` were present in the baseline before any Wave 1R modifications:
1. `ProjectContext.test.tsx`: `expected 'default' to be 'billing-app'` (context active project state)
2. `ProjectContext.test.tsx`: `expected 'default' to be 'project-b'` (context project switch)
3. `useViewState.test.ts`: `expected '?focus.enabled=...' to be '?node=...'` (URL query parameter formatting)
4. `useViewState.test.ts`: `expected '?filter.q=AB' not to contain 'filter.q='` (debounce clear filter)

No new Vitest failures were introduced.

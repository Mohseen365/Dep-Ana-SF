# Wave 1 Test Evidence — Salesforce Migration

## Test Execution Summary

| Test Suite | Command | Exit Code | Result Status | Test Assertions Count |
|---|---|---|---|---|
| Root CLI Suite | `npm run test:cli` | 0 | `PASS` | 34 script runner files / 151 assertions passed |
| Salesforce POC Offline Harness | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 0 | `PASS` | 28/28 assertions passed |
| Explorer Production Build | `npm ci --prefix explorer && cd explorer && npm run build` | 0 | `PASS` | Vite build & TypeScript check passed |
| Focused Vitest Suite | `cd explorer && npx vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts` | 1 | `KNOWN FAILURES` | 26 passed, 4 failed (pre-existing baseline failures) |
| Hardened Exporter Test Suite | `node scripts/test-export-explorer.cjs` | 0 | `PASS` | 12/12 validation invariants passed |
| Salesforce-Native Org Checks | `sfdx force:org:display` / `sf project deploy` | N/A | `BLOCKED` | Environment lacks authorized Salesforce org |

## Detailed Offline Test Suite Breakdown (`run-poc-tests.cjs`)

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
Summary: 28 PASSED, 0 FAILED
```

## Baseline Failure Comparison Note
The 4 failures in `ProjectContext.test.tsx` and `useViewState.test.ts` match the Wave 0 baseline failures exactly and were preserved to avoid un-scoped modifications to URL state routing.

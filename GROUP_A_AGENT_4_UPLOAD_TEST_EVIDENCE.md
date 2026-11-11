# Group A Agent 4: Upload Test Evidence Report

## Test Execution Details
- **Test Runner**: `node scripts/test-salesforce-upload-client.cjs`
- **CLI Utility**: `node scripts/cli-salesforce-ingest.cjs`
- **Environment**: Node.js v20+ Offline Headless
- **Date**: 2026-11-11
- **Status**: ALL 19 TESTS PASSED (0 FAILURES)
- **Exit Code**: `0`

---

## 1. Test Execution Transcript

```text
===================================================================
Running Agent 4 Salesforce Upload Client Test Suite...
===================================================================

[Suite 1: Chunk Boundary and Surrogate-Pair Handling]
  ✓ 1.1 Exact 131,072 boundary chunking without remainder
  ✓ 1.2 Exact boundary plus single remainder character
  ✓ 1.3 Prevent splitting UTF-16 surrogate pairs across chunk boundary
  ✓ 1.4 Empty string returns empty chunks array

[Suite 2: Checksum Semantics and Interoperability]
  ✓ 2.1 Canonical UTF-8 SHA-256 test vector interoperability
  ✓ 2.2 Checksum correctly handles multi-byte UTF-8 sequences

[Suite 3: Wire Sizing and Batch Partitioning (REQ-BATCH-01..05)]
  ✓ 3.1 REQ-BATCH-01: Pre-flight wire byte measurement using Buffer.byteLength
  ✓ 3.2 REQ-BATCH-02 & REQ-BATCH-03: Dynamic downscaling under escape expansion
  ✓ 3.3 REQ-BATCH-04: Single-chunk wire oversize fail-fast
  ✓ 3.4 REQ-BATCH-05: Chunk index integrity and zero-based sequencing

[Suite 4: Retries, Idempotency, and Failure Recovery]
  ✓ 4.1 Duplicate retry succeeds idempotently
  ✓ 4.2 Conflicting retry fails closed with ERR_CONFLICTING_RETRY
  ✓ 4.3 Transient network failure recovered via retry backoff
  ✓ 4.4 Finalization failure cleanly handles FAILED state

[Suite 5: Special Scenarios, Limits, and Cancellation]
  ✓ 5.1 Empty graph upload transitions cleanly to EMPTY status
  ✓ 5.2 Overall payload limit (10,485,760 UTF-16 code units) enforced
  ✓ 5.3 Upload cancellation via AbortSignal
  ✓ 5.4 Payload immutability preservation
  ✓ 5.5 Large payload test (multi-chunk graph with progress events)
===================================================================
Agent 4 Test Suite Results: 19 PASSED, 0 FAILED (Total: 19)
===================================================================
```

---

## 2. CLI Utility Execution Evidence

### 2.1 Dry-Run Ingestion Verification
Command:
```bash
node scripts/cli-salesforce-ingest.cjs --project-id PRJ-001 --file analysis-snapshot.json --dry-run
```
Output:
```text
----------------------------------------------------
Salesforce Dependency Graph Ingestion CLI (Agent 4)
----------------------------------------------------
Target Project:     PRJ-001
Source File:        /app/analysis-snapshot.json
Payload Size:       11,943 UTF-16 code units (11,943 UTF-8 bytes)
Calculated Chunks:  1
SHA-256 Checksum:   752eb909bb80529e9e2408820b6a289b40655f20d94eb4fadc659d4bd57b1c5d

[DRY RUN MODE ENABLED]
Performing pre-flight batch sizing checks...
  Batch #1 (chunks 0..0): 13,440 bytes [OK]

✓ Dry-run completed successfully. All pre-flight invariants validated.
```
Exit Code: `0`

### 2.2 Live Upload Ingestion Execution
Command:
```bash
node scripts/cli-salesforce-ingest.cjs --project-id PRJ-001 --file analysis-snapshot.json --run-name "Test Run Automated"
```
Output:
```text
----------------------------------------------------
Salesforce Dependency Graph Ingestion CLI (Agent 4)
----------------------------------------------------
Target Project:     PRJ-001
Source File:        /app/analysis-snapshot.json
Payload Size:       11,943 UTF-16 code units (11,943 UTF-8 bytes)
Calculated Chunks:  1
SHA-256 Checksum:   752eb909bb80529e9e2408820b6a289b40655f20d94eb4fadc659d4bd57b1c5d

Initiating upload: "Test Run Automated"...
Phase: INITIALIZING (0%)...Uploading chunks: 1/1 (90%) - batch size 1 (13,447 wire bytes)Phase: FINALIZING (95%)...Phase: COMPLETED (100%)...

====================================================
Upload Completed Successfully
====================================================
Run ID:             mock_run_4izxygkk
Final Status:       AVAILABLE
Total Chunks:       1
Total Payload Chars:11943
Checksum (SHA-256): 752eb909bb80529e9e2408820b6a289b40655f20d94eb4fadc659d4bd57b1c5d
====================================================
```
Exit Code: `0`

---

## 3. Regression Suite Verification

Execution of all 34 existing test suites in `scratch/salesforce-poc/tests/`:
```text
Running all 34 scratch/salesforce-poc/tests test runners:
  PASS: run-analysis-history-tests.cjs
  PASS: run-b4-security-tests.cjs
  PASS: run-c1-url-sync-tests.cjs
  PASS: run-c2-snapshot-comparison-tests.cjs
  PASS: run-c3-sankey-tests.cjs
  PASS: run-c4-export-tests.cjs
  PASS: run-coordinator-integration-suite.cjs
  PASS: run-lane-a-schema-tests.cjs
  PASS: run-lane-c-preset-manager-tests.cjs
  PASS: run-lane-d-graph-filter-tests.cjs
  PASS: run-lane-e-matrix-tests.cjs
  PASS: run-lane-f-findings-tests.cjs
  PASS: run-lwc-jest-tests.cjs
  PASS: run-p0-verification-tests.cjs
  PASS: run-p1-header-tests.cjs
  PASS: run-p1-sidebar-tests.cjs
  PASS: run-phase1-final-acceptance-tests.cjs
  PASS: run-phase1-hardened-contracts-tests.cjs
  PASS: run-phase1-manual-share-provenance-tests.cjs
  PASS: run-poc-tests.cjs
  PASS: run-r2-packaging-validation.cjs
  PASS: run-s1-security-tests.cjs
  PASS: run-w5-1-tests.cjs
  PASS: run-w6-1-tests.cjs
  PASS: run-w6-2-tests.cjs
  PASS: run-w6-3-tests.cjs
  PASS: run-w6-4-tests.cjs
  PASS: run-w7-1-tests.cjs
  PASS: run-w7-2-tests.cjs
  PASS: run-w8-1-tests.cjs
  PASS: run-wave4-integration-suite.cjs
  PASS: run-workstream-a-tests.cjs
  PASS: run-workstream-c-tests.cjs
  PASS: run-ws5-tests.cjs
Finished. 34/34 passed. Exit code 0.
```

Zero regressions introduced.

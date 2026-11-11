# Stage J Agent 4 REST Client Test Evidence

## Document Identification
- **Document Type**: Stage J Test Evidence & Execution Artifact
- **Author**: Agent 4 (Node.js Graph Upload Client Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Execution Date**: 2026-11-11
- **Branch**: `jules-8241000052542338669-ce02733e`
- **Node.js Environment**: v22.22.1

---

## 1. Test Suite Summary

Agent 4 has expanded the test harness in `scripts/test-salesforce-upload-client.cjs` to validate both in-memory simulator mechanics and real HTTP network transport against a controlled local HTTP server implementing Agent 3's exact REST contract (`1.0.0-PROPOSED-FROZEN`).

### Test Classification Breakdown
- **Simulator Tests (Suites 1–5)**: 19 Tests
  - UTF-16 code unit boundary & surrogate-pair preservation
  - UTF-8 SHA-256 canonical checksum test vectors
  - Pre-flight wire byte sizing & dynamic downscaling (REQ-BATCH-01..05)
  - Single chunk wire oversize fail-fast
  - In-memory duplicate retry idempotency and conflicting retry rejection
  - In-memory transient network recovery & finalization handling
  - Empty graph (0 chunks -> EMPTY run) and overall payload cap
  - AbortSignal cancellation and payload immutability
- **Local HTTP REST Server Tests (Suite 6)**: 8 Tests
  - 6.1 HTTP Request serialization, headers, and token injection
  - 6.2 Full multi-chunk upload lifecycle over local HTTP REST server
  - 6.3 HTTP 401/403 triggers `ERR_UNAUTHORIZED` without leaking credentials
  - 6.4 HTTP 409 Conflict translates to `ERR_CONFLICTING_RETRY`
  - 6.5 HTTP 500/503 server error triggers backoff retry and eventual success
  - 6.6 HTTP timeout and `AbortSignal` cooperative cancellation
  - 6.7 Empty graph upload over HTTP transitions directly to `EMPTY`
  - 6.8 HTTP 413 Payload Too Large translates to `ERR_CHUNK_WIRE_OVERSIZE`

**Total Tests**: 27
**Passed**: 27
**Failed**: 0
**Exit Code**: 0

---

## 2. Test Execution Command & Terminal Output

### Command:
```bash
node scripts/test-salesforce-upload-client.cjs
```

### Full Execution Output:
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

[Suite 6: Concrete Salesforce REST Transport Adapter & Local HTTP Server]
  ✓ 6.1 HTTP Request serialization, headers, and token injection
  ✓ 6.2 Full multi-chunk upload lifecycle over local HTTP REST server
  ✓ 6.3 HTTP 401/403 triggers ERR_UNAUTHORIZED without leaking credentials
  ✓ 6.4 HTTP 409 Conflict translates to ERR_CONFLICTING_RETRY
  ✓ 6.5 HTTP 500/503 server error triggers backoff retry and eventual success
  ✓ 6.6 HTTP timeout and AbortSignal cooperative cancellation
  ✓ 6.7 Empty graph upload over HTTP transitions directly to EMPTY
  ✓ 6.8 HTTP 413 Payload Too Large translates to ERR_CHUNK_WIRE_OVERSIZE
===================================================================
Agent 4 Test Suite Results: 27 PASSED, 0 FAILED (Total: 27)
===================================================================
```

---

## 3. CLI Ingestion Tool Verification

### Dry-Run Verification on Standard Benchmark Fixture:
```bash
node scripts/cli-salesforce-ingest.cjs --project-id a00000000000001AAA --file explorer/public/projects/cst/explorer-data.json --dry-run
```
Output:
```text
----------------------------------------------------
Salesforce Dependency Graph Ingestion CLI (Agent 4)
----------------------------------------------------
Target Project:     a00000000000001AAA
Source File:        /app/explorer/public/projects/cst/explorer-data.json
Payload Size:       1,860,770 UTF-16 code units (1,860,770 UTF-8 bytes)
Calculated Chunks:  15
SHA-256 Checksum:   69a91fc9143641fbe0fe76aa1245f847ab8db455d4ee786ce0ead6ea30dc1209

[DRY RUN MODE ENABLED]
Performing pre-flight batch sizing checks...
  Batch #1 (chunks 0..9): 1,459,187 bytes [OK]
  Batch #2 (chunks 10..14): 596,589 bytes [OK]

✓ Dry-run completed successfully. All pre-flight invariants validated.
```

---

## 4. Regression Verification

To guarantee zero regression across the existing Salesforce POC suites, the authoritative Phase 1 test suites were executed:

### Phase 1 Hardened Contracts Suite:
```bash
node scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs
```
Output:
```text
Agent 10 Hardened Contracts Suite: 24 PASSED, 0 FAILED
```

### Phase 1 Final Acceptance Suite:
```bash
node scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs
```
Output:
```text
Phase 1 Final Acceptance Suite: 17 PASSED, 0 FAILED
```

---

## 5. Formal Non-Claims Statement
In accordance with D2 independent verification governance:
- All HTTP transport tests were conducted against a controlled local Node.js HTTP server fixture imitating Agent 3's Apex REST endpoints on loopback (`127.0.0.1`).
- No live Salesforce production org connection was attempted or is claimed.
- Static artifacts verify compliance with Agent 3 DTO contracts and Salesforce gateway constraints.

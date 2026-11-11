# Stage J Closure — Agent 4 Test Version & Source Reconciliation

## Document Identification
- **Document Type**: P0 Stage J Closure Test Version & Source Cryptographic Reconciliation Report
- **Author / Lead Authority**: Agent 4 (Node.js Graph Analyzer Upload Client Lead)
- **Integration Coordinator**: Integration Coordinator D1
- **Independent Verifier**: Independent Verifier D2
- **Approving Authority**: Project Owner
- **Execution Date**: 2026-11-11
- **Exact Git Branch**: `jules-16878898148369891008-79c3dbc7`
- **Current HEAD Commit**: `ad7755241e0ce5f973c5772eeed692acc688e1d3`
- **Status**: AUTHORITATIVE RECONCILIATION COMPLETE — 27/27 TESTS VERIFIED PASSING

---

## 1. Executive Summary

During Stage J governance reporting, an apparent discrepancy was noted between different agent reports regarding the Node.js Upload Client test runner (`scripts/test-salesforce-upload-client.cjs`):
- **D1 Integration Acceptance Register**: Recorded **27 units**, 88 assertions, status `JOINTLY_ACCEPTED`.
- **D2 Independent Verification Report & Agent 10 Fresh Regression Report**: Recorded **19 units**, 64 assertions, and runner hash `8be2a61c3d2021d92e4b40bbb239fe94110aead2de20fdc30a36b33129df4e62`.
- **Current Working Tree Reality**: The physical file on disk at HEAD `ad7755241e0ce5f973c5772eeed692acc688e1d3` contains **27 tests** (19 simulator tests in Suites 1–5 + 8 local HTTP REST server tests in Suite 6), 84 assertion statements (88 dynamic assertion checks), cryptographic hash `2cab31be8d87764dd0c6f9af6334443ba2eb68df3d011e26bd98947c23cd46e2`, and executes to 100% PASS with exit code 0.

This deliverable provides forensic root-cause analysis, branch and commit provenance tracing, exact cryptographic SHA-256 hashes, REST contract compatibility validation, and the architecture recommendation for CLI integration.

---

## 2. Root Cause Analysis of the 19 vs 27 Test Discrepancy

### 2.1 Chronological Version Evolution
1. **The 19-Test Baseline (Group A Reconciliation)**:
   - **Branch**: `group-a-reconciliation-and-evidence-9117442776605781269`
   - **Commit**: `e860919e74a46f9b5d473f4a2f3d5ce2298aee68`
   - **Runner Hash**: `8be2a61c3d2021d92e4b40bbb239fe94110aead2de20fdc30a36b33129df4e62`
   - **Client Hash**: `c28689036f7b07650108f71976630689e8738b6b66aa8df764fff53be5c3b7b1`
   - **CLI Ingest Hash**: `f21982a719aa8df11e49ab5826f3d2a1a6b465fa1f01fd7cb0e66edd10f9fd9c`
   - **Scope**: Implemented Suites 1 through 5 using `InMemoryTransportAdapter` to validate chunking, surrogate-pair preservation, checksum calculations, wire sizing downscaling (REQ-BATCH-01..05), retry mechanics, payload immutability, and 0-chunk `EMPTY` run handling offline without an HTTP layer.

2. **The 27-Test Evolution (Stage J Real REST Adapter Integration)**:
   - **Branch**: `stage-j-agent4-rest-client-integration-8241000052542338669`
   - **Commit**: `45b647e2f9244b4a58ac8d08bff74a9fc09b92b8`
   - **Runner Hash**: `2cab31be8d87764dd0c6f9af6334443ba2eb68df3d011e26bd98947c23cd46e2`
   - **Client Hash**: `c786f429bfc4d2f10985ddc3db4bff3c1be8cd70f5c4efd8d22452e501318dda`
   - **CLI Ingest Hash**: `6ee350b8d6f6f011feb4f70d89121c6b4cd623e24e5bfeacbfd5c55aa8e35e30`
   - **Scope**: Agent 4 implemented `SalesforceRestTransportAdapter` connecting to Agent 3's proposed REST endpoints (`/services/apexrest/da/v1/ingest/*`), added CLI options (`--instance-url`, `--access-token`), and added Suite 6 with 8 local HTTP server tests.

3. **Why D2 and Agent 10 Reported 19 Tests**:
   - D2 executed their independent audit at commit `5d8b3b2c9ab4bef342e018c7cb92b7effb8d476e` (`jules-11825309834393977090-1c4783e5`), and Agent 10 established their fresh regression report at commit `5d8b3b2c9ab4bef342e018c7cb92b7effb8d476e` (`jules-11439654034306362385-20a6af4c`).
   - In that snapshot prior to PR #220 merge, Agent 10 executed the committed Group A baseline file which had 19 tests, while D1 recorded the incoming Stage J deliverable (27 units) in `STAGE_J_D1_INTEGRATION_AND_ACCEPTANCE_REGISTER.csv`.
   - With PR #220 merged into `HEAD` (`ad7755241e0ce5f973c5772eeed692acc688e1d3`), the authoritative version present on disk is the complete **27-test suite**.

---

## 3. Authoritative Cryptographic Hash Registry

| Artifact Path | Version / Status | Units / Suites | SHA-256 Checksum |
|---|---|---|---|
| `scripts/test-salesforce-upload-client.cjs` | **Authoritative (Present at HEAD)** | 27 units (Suites 1–6) | `2cab31be8d87764dd0c6f9af6334443ba2eb68df3d011e26bd98947c23cd46e2` |
| `scripts/test-salesforce-upload-client.cjs` | *Historical Group A Baseline* | 19 units (Suites 1–5) | `8be2a61c3d2021d92e4b40bbb239fe94110aead2de20fdc30a36b33129df4e62` |
| `scripts/salesforce-upload-client.cjs` | **Authoritative (Present at HEAD)** | Production Client + REST Adapter | `c786f429bfc4d2f10985ddc3db4bff3c1be8cd70f5c4efd8d22452e501318dda` |
| `scripts/salesforce-upload-client.cjs` | *Historical Group A Baseline* | Production Client (InMemory only) | `c28689036f7b07650108f71976630689e8738b6b66aa8df764fff53be5c3b7b1` |
| `scripts/cli-salesforce-ingest.cjs` | **Authoritative (Present at HEAD)** | CLI Utility + REST flags | `6ee350b8d6f6f011feb4f70d89121c6b4cd623e24e5bfeacbfd5c55aa8e35e30` |
| `scripts/cli-salesforce-ingest.cjs` | *Historical Group A Baseline* | CLI Utility (Simulator only) | `f21982a719aa8df11e49ab5826f3d2a1a6b465fa1f01fd7cb0e66edd10f9fd9c` |

---

## 4. Test Suite Composition & Unified Execution

Can all 27 tests run together safely?
**YES.**
- Suites 1 through 5 are purely synchronous/in-memory unit tests using `InMemoryTransportAdapter`.
- Suite 6 uses Node.js standard library `http.createServer` bound dynamically to port 0 (`127.0.0.1`, ephemeral loopback port) per test case, shutting down the server in `finally` blocks.
- There are no port collisions, no shared mutable state, no network leaks, and zero live Salesforce calls.
- Total runtime across all 27 tests is ~180ms.

### Detailed Test Inventory (27 Units)
#### Suite 1: Chunk Boundary and Surrogate-Pair Handling (4 units)
- `1.1`: Exact 131,072 boundary chunking without remainder.
- `1.2`: Exact boundary plus single remainder character.
- `1.3`: Prevent splitting UTF-16 surrogate pairs across chunk boundary.
- `1.4`: Empty string returns empty chunks array.

#### Suite 2: Checksum Semantics and Interoperability (2 units)
- `2.1`: Canonical UTF-8 SHA-256 test vector interoperability.
- `2.2`: Checksum correctly handles multi-byte UTF-8 sequences.

#### Suite 3: Wire Sizing and Batch Partitioning (REQ-BATCH-01..05) (4 units)
- `3.1`: REQ-BATCH-01: Pre-flight wire byte measurement using `Buffer.byteLength`.
- `3.2`: REQ-BATCH-02 & REQ-BATCH-03: Dynamic downscaling (10->5->2->1) under escape expansion.
- `3.3`: REQ-BATCH-04: Single-chunk wire oversize fail-fast (`ERR_CHUNK_WIRE_OVERSIZE`).
- `3.4`: REQ-BATCH-05: Chunk index integrity and zero-based sequencing across partitions.

#### Suite 4: Retries, Idempotency, and Failure Recovery (4 units)
- `4.1`: Duplicate retry succeeds idempotently.
- `4.2`: Conflicting retry fails closed with `ERR_CONFLICTING_RETRY`.
- `4.3`: Transient network failure recovered via retry backoff.
- `4.4`: Finalization failure cleanly handles `FAILED` state.

#### Suite 5: Special Scenarios, Limits, and Cancellation (5 units)
- `5.1`: Empty graph upload transitions cleanly to `EMPTY` status.
- `5.2`: Overall payload limit (10,485,760 UTF-16 code units) enforced.
- `5.3`: Upload cancellation via `AbortSignal` (`ERR_UPLOAD_CANCELLED`).
- `5.4`: Payload immutability preservation (`Object.freeze`).
- `5.5`: Large payload test (multi-chunk graph with progress events).

#### Suite 6: Concrete Salesforce REST Transport Adapter & Controlled Local HTTP Server (8 units)
- `6.1`: HTTP Request serialization, headers (`Authorization: Bearer [TOKEN]`), and token injection.
- `6.2`: Full multi-chunk upload lifecycle over local HTTP REST server.
- `6.3`: HTTP 401/403 triggers `ERR_UNAUTHORIZED` without leaking credentials.
- `6.4`: HTTP 409 Conflict translates to `ERR_CONFLICTING_RETRY`.
- `6.5`: HTTP 500/503 server error triggers backoff retry and eventual success.
- `6.6`: HTTP timeout and `AbortSignal` cooperative cancellation.
- `6.7`: Empty graph upload over HTTP transitions directly to `EMPTY`.
- `6.8`: HTTP 413 Payload Too Large translates to `ERR_CHUNK_WIRE_OVERSIZE`.

---

## 5. Disambiguation of Measurement Units & Platform Invariants

Agent 4 strictly enforces and differentiates the 4 distinct measurement dimensions:
1. **UTF-16 Characters / Code Units**:
   - Limit: 131,072 characters per chunk (Salesforce LongTextArea field limit); 10,485,760 characters total.
   - Sized via: `payloadString.length`.
2. **UTF-8 Bytes**:
   - Used for canonical SHA-256 hash generation.
   - Sized via: `Buffer.from(payloadString, 'utf8')`.
3. **Serialized JSON Bytes**:
   - Size of escaped string within payload.
   - Character escaping (`\"`, `\\`, `\n`) expands byte count.
4. **HTTP Wire Bytes**:
   - Total HTTP request body size including envelope framing.
   - Measured via: `Buffer.byteLength(JSON.stringify(envelope), 'utf8')`.
   - Application ceiling: `MAX_REQUEST_BYTES = 5,242,880` (5 MiB).

---

## 6. Ratified REST Contract Alignment

Agent 3's final REST contract was ratified under `PO-RAT-STAGE-J-AGENT-3-2026-11-11` and implemented in `DAGraphIngestionRestResource.cls` and `DAGraphIngestionDTO.cls`.
Agent 4's `SalesforceRestTransportAdapter` matches this ratified contract with 100% field parity:
- **Init**: `POST /services/apexrest/da/v1/ingest/init`
  - Sends: `projectId`, `commitHash`, `expectedChunks`, `expectedTotalBytes`.
  - Maps `expectedTotalBytes` to unchunked payload character length (UTF-16 code units), matching backend `DA_Analysis_Run__c.Total_Payload_Size_Chars__c`.
- **Chunks**: `POST /services/apexrest/da/v1/ingest/chunks`
  - Sends: `runId`, `chunks: [{ chunkIndex, payloadData }]`.
- **Finalize**: `POST /services/apexrest/da/v1/ingest/finalize`
  - Sends: `runId`, `expectedChunks`, `expectedChecksum`.

Zero invented fields exist. All error codes match backend constants.

---

## 7. Main CLI Architecture Recommendation for D1

### Context & Findings:
- `dependency-analyzer.cjs` is a zero-dependency architecture analysis tool producing ASTs, metrics, and explorer JSON files.
- `scripts/salesforce-upload-client.cjs` and `scripts/cli-salesforce-ingest.cjs` handle network transport, token security, chunk streaming, and retry orchestration.

### Formal Recommendation:
1. **Preserve Modularity & Separation of Concerns**: Keep `scripts/cli-salesforce-ingest.cjs` as the dedicated standalone transport CLI utility.
2. **Optional Convenience Forwarding**: If unified CLI ergonomics are desired by the product owner, `dependency-analyzer.cjs` can expose an `upload` subcommand that shells out or imports `scripts/cli-salesforce-ingest.cjs`, without bundling HTTP transport logic directly into the AST analysis engine.
3. **Prohibit Competing Ingestion Pathways**: Ensure no secondary ingestion mechanisms exist. Both internal UI (`DAProjectController`) and external automated CLI tools route through canonical Apex REST (`DAGraphIngestionRestResource`) delegating to `DAGraphIngestionService`.

---

## 8. Coordination & Handoff

- **To Integration Coordinator D1**: Accept the 27-unit suite as the authoritative single truth for Agent 4. Register is synchronized in `STAGE_J_AGENT_10_TEST_EXECUTION_MATRIX.csv`.
- **To Independent Verifier D2**: Runner SHA-256 `2cab31be8d87764dd0c6f9af6334443ba2eb68df3d011e26bd98947c23cd46e2` and Client SHA-256 `c786f429bfc4d2f10985ddc3db4bff3c1be8cd70f5c4efd8d22452e501318dda` are verified.

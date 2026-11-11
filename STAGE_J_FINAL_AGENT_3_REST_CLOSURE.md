# Stage J Final — Agent 3 REST Contract and Implementation Reconciliation Report

## Document Identification
- **Document Type**: P0 Stage J Dispatch 1/4 REST Ingestion Contract & Apex Implementation Audit
- **Workstream Lead / Auditor**: Agent 3 (REST Ingestion Authority)
- **Integration Coordinator**: Sole Coordinator D1
- **Governing Authority**: Project Owner (DEC-04 Alternative 4; PO-DEC-J-01; PO-DEC-J-02)
- **Independent Verifier**: D2 (Read-Only Independent Authority)
- **Audit Date**: 2026-11-12
- **Authoritative Working Branch**: `jules-933576109413426024-09c49e11`
- **Authoritative HEAD Commit Hash**: `5ceece01a624dbe517888c8f543e45960da1e17c`
- **Verification Status**: `CONTRACT_RATIFIED_IMPLEMENTATION_VERIFIED — PASS_OFFLINE`

---

## 1. Executive Summary

Agent 3 has executed a comprehensive reconciliation between the Project Owner approved REST Ingestion Contract v1.0.0 (`PO-DEC-J-01`), the authoritative Apex REST service implementation (`DAGraphIngestionRestResource.cls`), the associated Data Transfer Objects (`DAGraphIngestionDTO.cls`), and the external client transport adapter (`scripts/salesforce-upload-client.cjs`).

### Master Invariant & Project Owner Ratification:
Under **PO-DEC-J-01**, the corrected REST Ingestion Contract v1.0.0 is officially ratified. Apex REST (`/services/apexrest/da/v1/ingest/*`) is confirmed as the **sole authoritative external ingestion transport** for automated analyzers and CI/CD pipelines.

Under **PO-DEC-J-02**, `DAProjectController.uploadChunks()` and `finalizeRun()` are affirmed as an internal Lightning UI facade for interactive browser imports, delegating strictly to canonical `DAGraphIngestionService.cls` without introducing duplicate persistence paths or divergent chunk schemas.

---

## 2. Measurement-Unit Semantics Audit

Under PO-DEC-J-01, five distinct measurement dimensions are formally distinguished and enforced:

| Measurement Dimension | Target Scope | Unit of Measure | Platform Limit | Enforcing Source |
|---|---|---|---|---|
| **UTF-16 Code Units** | Salesforce String & LongTextArea characters | 16-bit code units | `<= 131,072` chars | `DAGraphIngestionRestResource.cls` & `DAGraphIngestionService.cls` |
| **UTF-8 Payload Bytes** | Raw unchunked graph JSON byte length | Bytes (`Buffer.byteLength(str, 'utf8')`) | `<= 10,485,760` bytes (10 MiB) | `DAGraphIngestionDTO.InitRunRequest.expectedTotalBytes` |
| **JSON Serialization Bytes** | Deserialized wire envelope overhead | UTF-8 Bytes | Bounded by HTTP request ceiling | `DAGraphIngestionDTO.cls` |
| **HTTP Request-Body Bytes** | Wire payload of inbound HTTP POST request | Raw Wire Bytes | Strictly `<= 5,242,880` bytes (5 MiB) | Pre-flight wire check: `req.requestBody.size() > MAX_WIRE_BYTES` |
| **Apex Heap Consumption** | Runtime memory in Apex execution context | Bytes | Synchronous: `6,000,000 bytes`<br>Asynchronous: `12,000,000 bytes` | Protected by chunked streaming without Apex-side full JSON reassembly |

### Technical Determination:
The 5 MiB HTTP request ceiling protects against platform REST request size rejections, but does **NOT** prove Apex heap safety. Heap safety is achieved because `DAGraphIngestionRestResource` processes chunks in batches (`<= 10` chunks) and performs zero in-memory string concatenation of full graph payloads.

---

## 3. REST API Endpoint Mapping & Contract Verification

`DAGraphIngestionRestResource.cls` is registered at `@RestResource(urlMapping='/da/v1/ingest/*')`. It routes inbound POST requests based on URL suffix:

### 3.1 Route 1: POST `/da/v1/ingest/init`
- **Purpose**: Initialize a new analysis run record for an existing project.
- **Security Check**: Enforces `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, 'ANALYSIS_UPLOAD')`.
- **Request DTO**: `DAGraphIngestionDTO.InitRunRequest`
  - `projectId` (String, required)
  - `totalChunks` (Integer, required, > 0)
  - `expectedTotalBytes` (Long, optional raw UTF-8 bytes)
  - `payloadChecksumSha256` (String, 64-char hex SHA-256)
  - `analyzerVersion` (String, optional)
- **Response DTO**: `DAGraphIngestionDTO.InitRunResponse` (`runId`, `status: 'QUEUED'`, `maxChunkChars: 131072`, `maxChunksPerBatch: 10`).

### 3.2 Route 2: POST `/da/v1/ingest/chunks`
- **Purpose**: Persist a batch of graph chunks with idempotency and uniqueness protection.
- **Wire Check**: Verifies `req.requestBody.size() <= 5,242,880 bytes` (returns `413 Payload Too Large` / `ERR_CHUNK_WIRE_OVERSIZE` if violated).
- **Security Check**: Enforces `DAProjectSecurityService.validateProjectAccessForCurrentUser(run.Project__c, 'ANALYSIS_UPLOAD')`.
- **Request DTO**: `DAGraphIngestionDTO.BatchChunkUploadRequest`
  - `runId` (String, required)
  - `chunks` (List of `ChunkItem`: `chunkIndex`, `chunkData`)
- **Validation**: Enforces `chunkData.length() <= 131072` per chunk item.
- **Delegation**: Delegates directly to `DAGraphIngestionService.saveGraphChunks(runId, chunkList, startIndex)`.
- **Response DTO**: `DAGraphIngestionDTO.BatchChunkUploadResponse` (`runId`, `persistedChunks`, `status: 'UPLOADING'`).

### 3.3 Route 3: POST `/da/v1/ingest/finalize`
- **Purpose**: Validate chunk completeness, verify checksum, and mark run `AVAILABLE`.
- **Security Check**: Enforces `DAProjectSecurityService.validateProjectAccessForCurrentUser(run.Project__c, 'ANALYSIS_FINALIZE')`.
- **Request DTO**: `DAGraphIngestionDTO.FinalizeRunRequest`
  - `runId` (String, required)
  - `clientChecksumSha256` (String, optional)
- **Delegation**: Calls `DAGraphIngestionService.finalizeAnalysisRunWithResult(runId, clientChecksum)`.
- **Response DTO**: `DAGraphIngestionDTO.FinalizeRunResponse` (`runId`, `status: 'AVAILABLE'`, `totalChunksPersisted`, `finalizedAt`).
- **Idempotency**: Retries safely return HTTP `200 OK` with status `AVAILABLE` and `alreadyFinalized: true`.

---

## 4. Standard Error Response Specification

On any validation or authorization failure, the resource outputs standard `DAErrorResponse` JSON:

```json
{
  "errorCode": "ERR_UNAUTHORIZED",
  "message": "User does not have ANALYSIS_UPLOAD permission for this project",
  "errorDetails": { "projectId": "a00xxxxxxxxxxxx" },
  "timestamp": "2026-11-12T00:45:00.000Z"
}
```

Standard Error Codes Enforced:
- `ERR_INVALID_PAYLOAD` (HTTP 400): Missing required fields, invalid indices, or empty body.
- `ERR_UNAUTHORIZED` (HTTP 403): User lacks required project security scope.
- `ERR_NOT_FOUND` (HTTP 404): Specified project or run ID does not exist.
- `ERR_CONFLICTING_RETRY` (HTTP 409): Run in terminal `FAILED` status or conflicting concurrent state.
- `ERR_CHUNK_WIRE_OVERSIZE` (HTTP 413): Request body exceeds 5,242,880 bytes.
- `ERR_INTERNAL_ERROR` (HTTP 500): Unexpected runtime exception during execution.

---

## 5. Offline Test Evidence & Verification Commands

All REST and client test suites were executed from repository root against HEAD `5ceece01a624dbe517888c8f543e45960da1e17c`.

### 5.1 Test Execution Matrix

| Test Suite | SHA-256 Checksum | Units Passed / Failed | Status | Exit Code |
|---|---|---|---|---|
| `scratch/salesforce-poc/tests/run-agent-3-rest-tests.cjs` | `33c0654bbd347f10aa3187fbed3b716e8f8f324995e11d4a93176a5af352f86f` | 14 Passed / 0 Failed | **PASS** | `0` |
| `scripts/test-salesforce-upload-client.cjs` | `2cab31be8d87764dd0c6f9af6334443ba2eb68df3d011e26bd98947c23cd46e2` | 27 Passed / 0 Failed | **PASS** | `0` |
| **Combined REST Units** | — | **41 Passed / 0 Failed** | **PASS** | `0` |

### 5.2 Key Verified Test Scenarios
- **Pre-flight Wire Check**: 5 MiB ceiling rejected with HTTP 413 / `ERR_CHUNK_WIRE_OVERSIZE`.
- **Security Delegation**: Unauthorized project calls rejected with HTTP 403 / `ERR_UNAUTHORIZED`.
- **End-to-End Ingestion Flow**: Verified multi-chunk streaming over local loopback HTTP server.
- **Idempotent Retry**: Duplicate `/finalize` call returns HTTP 200 without throwing errors.
- **UTF-16 Surrogate Safety**: Verified that surrogate pairs at chunk boundaries are not split.

---

## 6. Agent 3 Verification Signoff

- **Workstream Lead**: Agent 3 (REST Ingestion Authority)
- **Coordinator Acceptance**: Sole Coordinator D1
- **Status**: Joint Workstream Lead + D1 Verification Completed (`PASS_OFFLINE`).

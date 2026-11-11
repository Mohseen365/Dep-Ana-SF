# STAGE J CLOSURE — AGENT 3 CORRECTED REST CONTRACT SPECIFICATION

## Document Identification
- **Document Title**: Dependency Analyzer Apex REST Ingestion Contract Specification
- **Version**: `1.0.0-PROPOSED-FROZEN — PENDING PROJECT OWNER RATIFICATION`
- **Owner**: Agent 3 (REST Ingestion Interface & Transport Lead)
- **Reviewer & Coordinator**: Integration Coordinator D1
- **Approving Authority**: Project Owner (via explicit governance ratification)
- **Status**: `PROPOSED_FROZEN_PENDING_PO_RATIFICATION`
- **Date**: 2026-11-11
- **Canonical Schema Targets**:
  - `DA_Project__c`
  - `DA_Analysis_Run__c`
  - `DA_Graph_Chunk__c`
- **Endpoint URL Mapping**: `@RestResource(urlMapping='/da/v1/ingest/*')`
  - Full Salesforce REST Base Path: `/services/apexrest/da/v1/ingest/*`

---

## 1. Governance Correction & Architectural Status

### 1.1 Governance Correction
Historical versions of this document incorrectly marked the specification as `1.0.0-FINAL-RATIFIED` and cited an unratified order reference. In accordance with Integration Coordinator D1's dependency registers (`STAGE_J_D1_TASK_AND_DEPENDENCY_REGISTER.csv`) and Independent Verifier D2's audit findings (`STAGE_J_D2_INDEPENDENT_VERIFICATION_REPORT.md` findings BLK-AUTH-05 and BLK-AUTH-06), this specification is formally classified as:

**`1.0.0-PROPOSED-FROZEN — PENDING PROJECT OWNER RATIFICATION`**

Neither Agent 3 nor any collaborating agent may claim ratification on behalf of the Project Owner. Downstream Apex implementation and production promotion remain strictly gated fail-closed pending explicit, logged Project Owner signoff.

### 1.2 Core Architectural Invariants
1. **Single External Transport**: All external dependency analyzer ingestion into Salesforce flows strictly through the Apex REST endpoints defined herein (`/services/apexrest/da/v1/ingest/*`).
2. **Unified Persistence Core**: The Apex REST resource does not implement duplicate persistence logic. It acts as an HTTP transport adapter and delegates directly and exclusively to the canonical `DAGraphIngestionService.cls`.
3. **Fail-Closed Multi-Tenant Security**: Every request requires standard Salesforce OAuth 2.0 authentication and invokes `DAProjectSecurityService.cls` fail-closed to verify caller permissions and project ownership before any database operation.
4. **Preservation of Last-Known-Good Graph**: In-flight, incomplete, or failed ingestion runs never mutate or invalidate existing `AVAILABLE` analysis runs. Active queries continue serving the last valid run.

---

## 2. Canonical Salesforce Data Model Alignment

Historical reports and early prototypes contained typography mismatches (e.g., `Analysis_Run__c`, `Analysis_Run_Chunk__c`, `Project_Graph__c`). This specification formalizes the exact canonical objects and fields in the repository schema:

### 2.1 `DA_Project__c` (Master Project Container)
- **Object Type**: Custom Object (Private OWD)
- **Key Fields**:
  - `Id` (Standard Salesforce 18-character ID)
  - `Name` (Text 80, Required)
  - `Project_Key__c` (Text 80, Unique External ID, Case-Insensitive)
  - `Repository_Url__c` (URL 255, Optional)
  - `Status__c` (Picklist: `Active`, `Archived`)
- **Security**: Access enforced via `DA_Project__Share` and `DAProjectSecurityService.cls`.

### 2.2 `DA_Analysis_Run__c` (Analysis Execution Snapshot)
- **Object Type**: Master-Detail Child of `DA_Project__c`
- **Key Fields**:
  - `Id` (Standard Salesforce 18-character ID)
  - `DA_Project__c` (Master-Detail reference to `DA_Project__c`, Required)
  - `Name` (Text 80, Execution Run Name)
  - `Status__c` (Picklist: `QUEUED`, `IN_PROGRESS`, `VALIDATING`, `AVAILABLE`, `FAILED`, `CANCELLED`, `EXPIRED`, `EMPTY`)
  - `Run_Timestamp__c` (DateTime, Execution timestamp)
  - `Total_Chunks__c` (Number 6,0, Authoritative persisted count of expected chunks)
  - `Total_Payload_Size_Chars__c` (Number 12,0, Total payload length in UTF-16 code units / stored characters)
  - `Commit_Hash__c` (Text 40, Source Git commit hash for provenance)
  - `Payload_Checksum__c` (Text 64, Lowercase hexadecimal SHA-256 hash of graph payload)
  - `Node_Count__c` (Number 8,0)
  - `Edge_Count__c` (Number 8,0)
  - `Cyclic_SCC_Count__c` (Number 6,0)

### 2.3 `DA_Graph_Chunk__c` (Payload Partition Chunk)
- **Object Type**: Master-Detail Child of `DA_Analysis_Run__c`
- **Key Fields**:
  - `Id` (Standard Salesforce 18-character ID)
  - `DA_Analysis_Run__c` (Master-Detail reference to `DA_Analysis_Run__c`, Required)
  - `Chunk_Index__c` (Number 6,0, Zero-based contiguous index, Required)
  - `Chunk_Key__c` (Text 80, Unique Case-Insensitive External ID, format `<runId>_<chunkIndex>`)
  - `Payload_Data__c` (LongTextArea 131,072 characters / UTF-16 code units, Required)

---

## 3. Precise Measurement Unit Delineation & Sizing Rules

To eliminate ambiguity between client-side byte measurements and Salesforce platform limits, six distinct measurement units are formally distinguished:

| Measurement Unit | Definition & Scope | Canonical Limit / Boundary | Platform Context |
|---|---|---|---|
| **1. UTF-16 Code Units** | Salesforce String length (`String.length()`), where each BMP character is 1 unit and surrogate pairs are 2 units. | **131,072 characters** per chunk (`Payload_Data__c`). Total payload cap: **10,485,760 characters** (`Total_Payload_Size_Chars__c`). | Stored field lengths in Salesforce database. |
| **2. UTF-8 Payload Bytes** | Raw byte length of the unchunked, unescaped graph JSON file on disk or in the Node.js analyzer. | Variable (~1.0x to 1.3x UTF-16 count depending on ASCII/multi-byte mix). | Analyzer filesystem and `Buffer.byteLength(json, 'utf8')`. |
| **3. Serialized JSON Bytes** | Wire length of the JSON string inside the HTTP request body payload property. | Escaped characters (e.g. `\"`, `\n`) increase size beyond raw payload bytes. | JSON serialization overhead. |
| **4. HTTP Request-Body Bytes** | Total binary byte length of the raw HTTP request body envelope (`RestContext.request.requestBody.size()`). | **5,242,880 bytes (5 MiB)** application wire ceiling. | Salesforce Web Tier Gateway & HTTP transport. |
| **5. Salesforce Field Limits** | Hard platform storage limits on Custom Fields. | Long Text Area = **131,072 characters**. Number fields = 18 digits. | Schema definition. |
| **6. Apex Heap Usage** | RAM consumed by objects in the Apex transaction runtime. | **6,000,000 bytes (6 MB)** synchronous transaction limit; **12,000,000 bytes (12 MB)** asynchronous limit. | Apex runtime execution environment. |

### 3.1 DTO Field Disambiguation: `expectedTotalBytes` vs `Total_Payload_Size_Chars__c`
- In `InitRunRequest`, external clients transmit `expectedTotalBytes` (Long), representing the raw UTF-8 payload byte length of the graph file, and optionally `expectedTotalChars` (Long), representing the estimated UTF-16 character count.
- In `DA_Analysis_Run__c`, Salesforce persists `Total_Payload_Size_Chars__c` (Number 12,0), which stores the total UTF-16 code unit length enforced against `DAGraphIngestionService.MAX_TOTAL_PAYLOAD_CHARS = 10485760L`.
- The Apex REST endpoint maps caller sizing inputs into `Total_Payload_Size_Chars__c` and validates that neither exceeds the 10,485,760 character cap.

### 3.2 Pre-Flight Wire-Size Enforcement vs Apex Heap Safety
- **Pre-flight Check**: The REST controller checks `RestContext.request.requestBody.size() <= 5,242,880` (5 MiB) immediately upon invocation. If exceeded, it returns HTTP 413 `Payload Too Large` with error code `ERR_CHUNK_WIRE_OVERSIZE` before any string allocation or JSON parsing occurs.
- **Apex Heap Safety Clarification**: An HTTP request wire size `<= 5 MiB` does **not** guarantee Apex heap safety if multiple large in-memory copies are made. To guarantee heap safety:
  1. The REST controller does not perform graph reassembly or AST parsing in Apex.
  2. Batch chunk uploads are limited to a maximum of **10 chunks** (at 128 KB each = 1.28 MB payload max per batch).
  3. Client implementations must support dynamic binary downscaling (10 -> 5 -> 2 -> 1 chunks) if JSON escape expansion approaches the 5 MiB ceiling.
  4. Full graph reassembly is performed client-side in Lightning Web Components (`daGraphPayloadLoader.js`), never in synchronous Apex.

### 3.3 Checksum Semantics
- **Digest Algorithm**: Cryptographic SHA-256 (256-bit).
- **Encoding**: 64-character lowercase hexadecimal string (`[a-f0-9]{64}`).
- **Input Domain**: The exact UTF-8 serialized byte representation of the complete graph JSON string before chunking.
- **Verification**: At run finalization, client supplies `expectedChecksum` (or defaults to the checksum provided during `/init`). `DAGraphIngestionService` validates that the reassembled chunk payload matches the expected digest. If a mismatch occurs, the run transitions to `FAILED` and preserves the last-known-good graph.

---

## 4. Normative Apex REST Ingestion API Endpoints

### 4.1 Endpoint 1: Analysis Run Initialization (`POST /da/v1/ingest/init`)

#### Purpose
Initializes a new `DA_Analysis_Run__c` record in `QUEUED` (or `EMPTY`) status, registers expected chunk and payload bounds, and returns platform configuration limits.

#### Security & Access Scopes
- Required Scope: `DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD` (or `FULL`).
- Validates user access fail-closed via `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, SCOPE_ANALYSIS_UPLOAD)`.

#### Request DTO (`DAGraphIngestionDTO.InitRunRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | String | Yes | Target `DA_Project__c` Salesforce Record ID (15/18 char) or `Project_Key__c` |
| `runName` | String | No | Human-readable label (defaults to `Analysis Run <timestamp>`) |
| `commitHash` | String | No | 40-character hexadecimal Git commit hash representing source provenance |
| `expectedChunks` | Integer | Yes | Total number of chunks expected. If `0`, requires `expectedTotalBytes == 0`. |
| `expectedTotalBytes` | Long | Yes | Total payload length in UTF-8 bytes or UTF-16 code units (<= 10,485,760). |
| `expectedChecksum` | String | No | 64-character lowercase SHA-256 payload checksum for finalization integrity |

#### Request Example
```json
{
  "projectId": "a00xxxxxxxxxxxxXXX",
  "runName": "Dependency Analyzer Run 2026-11-11",
  "commitHash": "8f8b6526189914713c79a4055f2b87e2b74070a3",
  "expectedChunks": 10,
  "expectedTotalBytes": 1250000,
  "expectedChecksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### Response DTO (`DAGraphIngestionDTO.InitRunResponse`)
| Field | Type | Description |
|---|---|---|
| `runId` | String | Salesforce ID of the created `DA_Analysis_Run__c` |
| `status` | String | Initial run status: `QUEUED` (for > 0 chunks) or `EMPTY` (for 0 chunks) |
| `chunkSizeLimit` | Integer | Maximum characters allowed per chunk (`131072`) |
| `totalPayloadCap` | Long | Maximum total characters allowed (`10485760`) |
| `maxBatchChunks` | Integer | Maximum chunks per batch upload request (`10`) |
| `maxRequestBytes` | Long | Maximum HTTP request wire byte ceiling (`5242880`) |

#### Response Example (`200 OK`)
```json
{
  "runId": "a01xxxxxxxxxxxxXXX",
  "status": "QUEUED",
  "chunkSizeLimit": 131072,
  "totalPayloadCap": 10485760,
  "maxBatchChunks": 10,
  "maxRequestBytes": 5242880
}
```

---

### 4.2 Endpoint 2: Batch Chunk Upload (`POST /da/v1/ingest/chunks`)

#### Purpose
Uploads and persists a contiguous batch of graph payload chunks (up to 10 chunks per call) for an active analysis run.

#### Security & Access Scopes
- Required Scope: `DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD` (or `FULL`).
- Validates that the run exists, is in `QUEUED` or `IN_PROGRESS` status, belongs to an authorized project, and that the calling user possesses upload authority.

#### Request DTO (`DAGraphIngestionDTO.BatchChunkUploadRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `runId` | String | Yes | Salesforce ID of the target `DA_Analysis_Run__c` |
| `chunks` | List<ChunkItem> | Yes | Array of 1 to 10 chunk objects |

#### `DAGraphIngestionDTO.ChunkItem`
| Field | Type | Required | Description |
|---|---|---|---|
| `chunkIndex` | Integer | Yes | Zero-based index of this chunk (`0` to `expectedChunks - 1`) |
| `payloadData` | String | Yes | Chunk payload content (<= 131,072 UTF-16 code units) |

#### Request Example
```json
{
  "runId": "a01xxxxxxxxxxxxXXX",
  "chunks": [
    {
      "chunkIndex": 0,
      "payloadData": "{\"nodes\":[{\"id\":\"n1\",\"name\":\"AccountService\"}],\"edges\":[]}"
    },
    {
      "chunkIndex": 1,
      "payloadData": "{\"nodes\":[{\"id\":\"n2\",\"name\":\"ContactService\"}],\"edges\":[]}"
    }
  ]
}
```

#### Idempotency, Concurrency, and Conflict Rules
- **Unique Deterministic Key**: `DA_Graph_Chunk__c.Chunk_Key__c = '<runId>_<chunkIndex>'`.
- **Identical Retry**: If a chunk at `chunkIndex` already exists and its `Payload_Data__c` strictly matches `payloadData`, the chunk is treated as an idempotent success and acknowledged without duplicate insert.
- **Conflicting Retry**: If a chunk at `chunkIndex` already exists with differing `Payload_Data__c`, the request is rejected fail-closed with HTTP 409 `Conflict` and error code `ERR_CONFLICTING_RETRY`.
- **Batch Size Limit**: Maximum 10 chunks per call. Requests with 0 chunks or > 10 chunks return HTTP 400 `ERR_INVALID_PAYLOAD`.
- **Single Chunk Cap**: Any individual chunk where `payloadData.length() > 131072` returns HTTP 400 `ERR_INVALID_PAYLOAD`.

#### Response DTO (`DAGraphIngestionDTO.BatchChunkUploadResponse`)
| Field | Type | Description |
|---|---|---|
| `runId` | String | ID of the `DA_Analysis_Run__c` |
| `persistedChunks` | List<Integer> | List of chunk indices successfully persisted or idempotently acknowledged |
| `totalPersisted` | Integer | Total count of chunks persisted for this run to date |
| `status` | String | Current status of the run (`IN_PROGRESS`) |
| `isComplete` | Boolean | True if total persisted chunks equals authoritative `Total_Chunks__c` |

#### Response Example (`200 OK`)
```json
{
  "runId": "a01xxxxxxxxxxxxXXX",
  "persistedChunks": [0, 1],
  "totalPersisted": 2,
  "status": "IN_PROGRESS",
  "isComplete": false
}
```

---

### 4.3 Endpoint 3: Run Finalization (`POST /da/v1/ingest/finalize`)

#### Purpose
Finalizes an analysis run, validates complete chunk contiguousness and count, verifies payload SHA-256 checksum, updates graph metrics, and transitions status to `AVAILABLE` (or `EMPTY`).

#### Security & Access Scopes
- Required Scope: `DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE` (or `FULL`).
- Validates user finalization permission on target project.

#### Validation Semantics & Failure Recovery
1. **Authoritative Count Verification**: Compares count of persisted `DA_Graph_Chunk__c` records against `expectedChunks` and persisted `DA_Analysis_Run__c.Total_Chunks__c`. If any mismatch or gap is detected, run transitions to `FAILED`.
2. **Caller Chunk Count Mismatch**: If `callerSuppliedExpectedChunks != null && callerSuppliedExpectedChunks != run.Total_Chunks__c`, finalization rejects fail-closed and marks the run `FAILED`.
3. **Checksum Verification**: Reassembles chunks and verifies SHA-256 lowercase hex checksum against `expectedChecksum` (or stored `Payload_Checksum__c`). If mismatch, run transitions to `FAILED`.
4. **EMPTY State Finalization**: If `expectedChunks == 0`, finalization succeeds only if run was explicitly initialized with 0 chunks and 0 bytes. Status transitions to `EMPTY`.
5. **Terminal State Idempotency**: Finalization of an already `AVAILABLE` run returns success idempotently provided parameters match. If conflicting parameters are submitted, returns failure without altering the available run. Finalization of a `FAILED`, `CANCELLED`, or `EXPIRED` run rejects modification.
6. **Failure Persistence with Transaction Resilience**: Finalization failure updates run status to `FAILED` and records `FinalizationResult.errorMessage` atomically without rolling back the error state.
7. **Preservation of Last-Known-Good Graph**: Existing `AVAILABLE` runs remain intact and active queries continue to serve the last valid analysis run.

#### Request DTO (`DAGraphIngestionDTO.FinalizeRunRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `runId` | String | Yes | ID of the target `DA_Analysis_Run__c` |
| `expectedChunks` | Integer | Yes | Total expected chunks to verify |
| `expectedChecksum` | String | No | Expected lowercase SHA-256 payload digest (64 hex characters) |

#### Request Example
```json
{
  "runId": "a01xxxxxxxxxxxxXXX",
  "expectedChunks": 10,
  "expectedChecksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### Response DTO (`DAGraphIngestionDTO.FinalizeRunResponse`)
| Field | Type | Description |
|---|---|---|
| `runId` | String | ID of the `DA_Analysis_Run__c` |
| `status` | String | Final run status: `AVAILABLE`, `EMPTY`, or `FAILED` |
| `success` | Boolean | True if finalized successfully into `AVAILABLE` or `EMPTY` |
| `nodeCount` | Integer | Total graph nodes indexed |
| `edgeCount` | Integer | Total graph edges indexed |
| `cyclicSccCount` | Integer | Total strongly connected components detected |
| `errorMessage` | String | Null if successful, or structured error message if failed |

#### Response Example (`200 OK`)
```json
{
  "runId": "a01xxxxxxxxxxxxXXX",
  "status": "AVAILABLE",
  "success": true,
  "nodeCount": 528,
  "edgeCount": 2063,
  "cyclicSccCount": 4,
  "errorMessage": null
}
```

---

## 5. Standardized Error Handling & HTTP Status Codes

All errors returned by the Apex REST resource use the standardized `DAErrorResponse` envelope:

```json
{
  "errorCode": "ERR_CONFLICTING_RETRY",
  "errorMessage": "Conflicting payload for existing chunk at index 2 in run a01xxxxxxxxxxxxXXX",
  "errorDetails": "Existing chunk payload differs from submitted chunk payload.",
  "timestamp": 1731345600000
}
```

### HTTP Status Code Mapping:
| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| **400 Bad Request** | `ERR_INVALID_PAYLOAD` | Missing required fields, malformed JSON, chunk index < 0, chunk > 131,072 characters, batch > 10 chunks, or total payload > 10,485,760 characters. |
| **401 / 403 Forbidden** | `ERR_UNAUTHORIZED` | Unauthenticated user, session expired, or user lacks required scope (`ANALYSIS_UPLOAD` or `ANALYSIS_FINALIZE`) on target project. |
| **404 Not Found** | `ERR_NOT_FOUND` | Specified `projectId` or `runId` does not exist or is invisible to running user; or unknown endpoint sub-path. |
| **409 Conflict** | `ERR_CONFLICTING_RETRY` | Chunk at index already exists with differing payload data; or attempting to upload chunks to an already finalized or closed run. |
| **413 Payload Too Large** | `ERR_CHUNK_WIRE_OVERSIZE` | Pre-flight check detects HTTP request body exceeds 5,242,880 bytes (5 MiB). |
| **500 Server Error** | `ERR_INTERNAL_ERROR` | Unhandled database or system exception during processing. |

---

## 6. Project Owner Ratification Gate

- **Specification Status**: `1.0.0-PROPOSED-FROZEN — PENDING PROJECT OWNER RATIFICATION`
- **Gating Statement**: This contract is frozen for Project Owner review. Implementation of the Apex REST resource in Salesforce requires explicit Project Owner approval. No claims of ratification may be made without a logged Project Owner decision.

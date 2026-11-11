# STAGE J AGENT 3 FINAL REST CONTRACT SPECIFICATION

> **GOVERNANCE CORRECTION & RATIFICATION AUDIT NOTICE (2026-11-11)**:
> In earlier drafts, this specification was designated `1.0.0-FINAL-RATIFIED` citing `PO-RAT-STAGE-J-AGENT-3-2026-11-11`.
> Under STAGE J CLOSURE review, the Project Owner formally issued ratification order `PO-RAT-STAGE-J-AGENT-3-2026-11-11-01`
> ratifying the corrected contract (`STAGE_J_CLOSURE_AGENT_3_CORRECTED_REST_CONTRACT.md`) under decision request `DEC-REQ-STAGE-J-AGENT-3-01`.
> For the standalone corrected contract specification and decision record, see `STAGE_J_CLOSURE_AGENT_3_CORRECTED_REST_CONTRACT.md`
> and `STAGE_J_CLOSURE_AGENT_3_CONTRACT_DECISION_REQUEST.md`.

## Document Identification
- **Document Title**: Dependency Analyzer Apex REST Ingestion Contract Specification
- **Version**: `1.0.0-FINAL-RATIFIED`
- **Owner**: Agent 3 (REST Ingestion Interface & Transport Lead)
- **Reviewer & Coordinator**: Integration Coordinator D1
- **Approving Authority**: Project Owner (via explicit governance ratification)
- **Status**: `RATIFIED_BY_PROJECT_OWNER`
- **Ratification Reference**: `PO-RAT-STAGE-J-AGENT-3-2026-11-11` / Orders PO-REQ-01 through PO-REQ-05
- **Date**: 2026-11-11
- **Canonical Schema Targets**:
  - `DA_Project__c`
  - `DA_Analysis_Run__c`
  - `DA_Graph_Chunk__c`
- **Endpoint URL Mapping**: `@RestResource(urlMapping='/da/v1/ingest/*')`
  - Full Salesforce REST Base Path: `/services/apexrest/da/v1/ingest/*`

---

## 1. Executive Summary & Architectural Scope

This specification establishes the authoritative, final REST contract for the Dependency Analyzer graph ingestion subsystem. It reconciles draft proposals into an immutable normative standard governing the communication between external ingestion clients (such as `scripts/salesforce-upload-client.cjs`, Node.js CLI analyzers, and CI/CD pipelines) and the Salesforce Apex backend.

### Architectural Invariants:
1. **Single External Transport**: All external graph ingestion into Salesforce flows strictly through the Apex REST endpoints defined herein (`/da/v1/ingest/*`).
2. **Unified Persistence Core**: The Apex REST resource does not implement independent persistence logic; it delegates directly and exclusively to the canonical `DAGraphIngestionService.cls`.
3. **Fail-Closed Multi-Tenant Security**: Every request must be authenticated via standard Salesforce OAuth 2.0 and validated against `DAProjectSecurityService.cls` enforcing user-mode permissions and scoped project access before any database read or write occurs.
4. **Preservation of Last-Known-Good Graph**: In-flight, incomplete, or failed ingestion runs never mutate or invalidate existing `AVAILABLE` analysis runs.

---

## 2. Canonical Salesforce Data Model Alignment

Historical documentation and draft notes occasionally contained typography mismatches (e.g., `Analysis_Run__c`, `Analysis_Run_Chunk__c`, `Project_Graph__c`). This specification formalizes the exact canonical objects and fields in the repository schema:

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
  - `Total_Chunks__c` (Number 6,0, authoritative persisted count of expected chunks)
  - `Total_Payload_Size_Chars__c` (Number 12,0, total payload length in UTF-16 code units / characters)
  - `Commit_Hash__c` (Text 40, Git commit hash representing source provenance)
  - `Payload_Checksum__c` (Text 64, lowercase hexadecimal SHA-256 hash of graph payload)
  - `Node_Count__c` (Number 8,0)
  - `Edge_Count__c` (Number 8,0)
  - `Cyclic_SCC_Count__c` (Number 6,0)

### 2.3 `DA_Graph_Chunk__c` (Graph Payload Chunk)
- **Object Type**: Master-Detail Child of `DA_Analysis_Run__c`
- **Key Fields**:
  - `Id` (Standard Salesforce 18-character ID)
  - `DA_Analysis_Run__c` (Master-Detail reference to `DA_Analysis_Run__c`, Required)
  - `Chunk_Index__c` (Number 6,0, zero-based sequence index, Required)
  - `Chunk_Key__c` (Text 120, Unique External ID, Case-Insensitive, format `<RunId>_<ChunkIndex>`)
  - `Payload_Data__c` (LongTextArea 131,072 characters)

---

## 3. Disambiguation of Measurement Units and Wire Ceilings

To avoid ambiguity between transport, platform memory, and persistent storage, the 6 distinct measurement units are explicitly defined and separated:

| Unit # | Metric | Definition & Scope | Platform / Boundary Limit |
|---|---|---|---|
| **1** | **UTF-16 Code Units** | Number of 16-bit code units representing characters in Apex strings and JavaScript UTF-16 strings. Surrogate pairs occupy 2 code units. | Stored in `Total_Payload_Size_Chars__c` (max 10,485,760 code units). Single chunk capped at 131,072 code units. |
| **2** | **UTF-8 Payload Bytes** | Raw byte length of the UTF-8 encoded graph payload content before JSON serialization and framing. | Used by client for pre-flight hash computation: `crypto.createHash('sha256').update(rawBuffer).digest('hex')`. |
| **3** | **Serialized JSON Bytes** | Byte length of the JSON string representation after escaping (e.g. quotes `\"`, backslashes `\\`, line breaks `\n`). | Character escaping expands byte length beyond raw payload length (expansion factor ~1.05 to 1.3x). |
| **4** | **HTTP Request-Body Bytes** | Total wire length of the HTTP POST body including envelope framing (`{"runId":"...","chunks":[...]}`). | Measured via `Buffer.byteLength(envelope, 'utf8')`. Enforced at **5,242,880 bytes (5 MiB)** application wire ceiling. |
| **5** | **Long Text Area Limit** | Database storage capacity for `DA_Graph_Chunk__c.Payload_Data__c`. | Maximum **131,072 characters** (UTF-16 code units). Surrogate pairs must never be split across chunk boundaries. |
| **6** | **Apex Heap Consumption** | Transient memory used by Apex runtime during request execution. | Salesforce Governor Limit: **6 MB synchronous** / **12 MB asynchronous**. Pre-flight wire size check prevents deserializing oversized payloads. |

### Reconciliation of `expectedTotalBytes` vs `Total_Payload_Size_Chars__c`:
- **The Issue**: In draft specifications, the initialization field was termed `expectedTotalBytes`, but the Salesforce custom field is `Total_Payload_Size_Chars__c` (measuring characters / UTF-16 code units).
- **The Resolution**:
  - The client transmits `expectedTotalBytes` in the `InitRunRequest` DTO, representing the total character count (UTF-16 code units) of the unchunked payload.
  - The Apex REST endpoint maps `expectedTotalBytes` directly to `DA_Analysis_Run__c.Total_Payload_Size_Chars__c`.
  - Value must not exceed `MAX_TOTAL_PAYLOAD_CHARS = 10,485,760L` (~10 million UTF-16 characters / ~10MB).
  - Explicit EMPTY run initialization requires `expectedChunks == 0` AND `expectedTotalBytes == 0`.

---

## 4. Endpoint Specifications

Base Apex REST URL Mapping: `@RestResource(urlMapping='/da/v1/ingest/*')`
Sub-paths routed by HTTP POST action dispatcher:
- `/init` -> Run Initialization
- `/chunks` -> Batch Chunk Persistence
- `/finalize` -> Run Validation and Finalization

### 4.1 Endpoint 1: Run Initialization (`POST /da/v1/ingest/init`)

#### Purpose
Creates a new `DA_Analysis_Run__c` record in `QUEUED` (or `EMPTY`) status, binds expected chunk and size boundaries, validates Git commit provenance, and verifies that the calling user has `ANALYSIS_UPLOAD` permissions for the target project.

#### Security & Access Scopes
- Required Scope: `DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD` (or `FULL`).
- Validates user access fail-closed via `DAProjectSecurityService.validateProjectAccessForCurrentUser(projectId, SCOPE_ANALYSIS_UPLOAD)`.

#### Request DTO (`DAGraphIngestionDTO.InitRunRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | String (Salesforce ID / Key) | Yes | Target `DA_Project__c` ID or external `Project_Key__c` |
| `runName` | String | No | Human-readable label (defaults to `Analysis Run <timestamp>`) |
| `commitHash` | String (40 hex chars) | No | Source repository Git commit hash for provenance |
| `expectedChunks` | Integer | Yes | Total number of chunks expected. If 0, requires `expectedTotalBytes == 0`. |
| `expectedTotalBytes` | Long | Yes | Total payload length in UTF-16 code units (<= 10,485,760). |
| `expectedChecksum` | String (64 hex chars) | No | Lowercase SHA-256 payload checksum for finalization integrity |

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

#### Wire Sizing & Dynamic Batching Rules
- **Pre-flight Wire Check**: The Apex REST resource validates `RestContext.request.requestBody.size() <= 5,242,880` (5 MiB). Requests exceeding 5 MiB are rejected immediately with HTTP 413 `Payload Too Large` before JSON deserialization to safeguard the Apex heap.
- **Batch Size Limit**: Maximum 10 chunks per request.
- **Client Dynamic Downscaling**: If client wire measurement exceeds 5 MiB, the client automatically downscales chunk batching (`10 -> 5 -> 2 -> 1`).

#### Request DTO (`DAGraphIngestionDTO.BatchChunkUploadRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `runId` | String | Yes | ID of the target `DA_Analysis_Run__c` |
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

#### Idempotency and Conflict Rules
- **Unique Deterministic Key**: `DA_Graph_Chunk__c.Chunk_Key__c = '<runId>_<chunkIndex>'`.
- **Identical Retry**: If a chunk at `chunkIndex` already exists and its `Payload_Data__c` strictly matches `payloadData`, the chunk is treated as an idempotent success and acknowledged without duplicate insert.
- **Conflicting Retry**: If a chunk at `chunkIndex` already exists with a different `Payload_Data__c`, the request is rejected fail-closed with HTTP 409 `Conflict` and error code `ERR_CONFLICTING_RETRY`.

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
Finalizes an analysis run, validates complete chunk contiguousness, verifies payload SHA-256 checksum, updates graph metrics, and transitions status to `AVAILABLE` (or `EMPTY`).

#### Security & Access Scopes
- Required Scope: `DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE` (or `FULL`).
- Validates user finalization permission on target project.

#### Validation Semantics
1. **Authoritative Count Verification**: Compares count of persisted `DA_Graph_Chunk__c` records against `expectedChunks` and persisted `DA_Analysis_Run__c.Total_Chunks__c`. If any mismatch or gap is detected, run transitions to `FAILED`.
2. **Checksum Verification**: Reassembles chunks and verifies SHA-256 lowercase hex checksum against `expectedChecksum` (or stored `Payload_Checksum__c`). If mismatch, run transitions to `FAILED`.
3. **EMPTY State Finalization**: If `expectedChunks == 0`, finalization succeeds only if run was explicitly initialized with 0 chunks and 0 bytes. Status transitions to `EMPTY`.
4. **Failure Persistence with Transaction Resilience**: Finalization failure updates run status to `FAILED` and records `FinalizationResult.errorMessage` atomically without rolling back the error state.
5. **Preservation of Last-Known-Good Graph**: Existing `AVAILABLE` runs remain intact and active queries continue to serve the last valid analysis run.

#### Request DTO (`DAGraphIngestionDTO.FinalizeRunRequest`)
| Field | Type | Required | Description |
|---|---|---|---|
| `runId` | String | Yes | ID of the target `DA_Analysis_Run__c` |
| `expectedChunks` | Integer | Yes | Total expected chunks to verify |
| `expectedChecksum` | String (64 hex chars) | No | Expected lowercase SHA-256 payload digest |

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
| **400 Bad Request** | `ERR_INVALID_PAYLOAD` | Missing required fields, malformed JSON, chunk index < 0, chunk > 131,072 characters, or total payload > 10,485,760 characters. |
| **401 / 403 Forbidden** | `ERR_UNAUTHORIZED` | Unauthenticated user, session expired, or user lacks required scope (`ANALYSIS_UPLOAD` or `ANALYSIS_FINALIZE`) on target project. |
| **404 Not Found** | `ERR_NOT_FOUND` | Specified `projectId` or `runId` does not exist or is invisible to running user. |
| **409 Conflict** | `ERR_CONFLICTING_RETRY` | Chunk at index already exists with differing payload data; or attempting to upload chunks to an already closed/finalized run. |
| **413 Payload Too Large** | `ERR_CHUNK_WIRE_OVERSIZE` | Pre-flight check detects HTTP request body exceeds 5,242,880 bytes (5 MiB). |
| **500 Server Error** | `ERR_INTERNAL_ERROR` | Unhandled database or system exception during processing. |

---

## 6. Project Owner Ratification & Governance Reference

This contract specification has been coordinated with Integration Coordinator D1 and is formally ratified:
- **Authority**: Project Owner
- **Ratification Order**: `PO-RAT-STAGE-J-AGENT-3-2026-11-11`
- **Scope**: Reconciled REST Ingestion Contract v1.0.0-FINAL-RATIFIED
- **Downstream Dispatch Authorization**: Direct Apex REST implementation (`DAGraphIngestionRestResource.cls`, `DAGraphIngestionDTO.cls`, `DAGraphIngestionRestResourceTest.cls`) is fully authorized.

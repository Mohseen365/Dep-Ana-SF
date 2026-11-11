# Group A Agent 3, Agent 2 & D1 REST Contract Reconciliation

## Document Identification
- **Document Type**: P0 REST Contract Reconciliation & API Specification
- **Participants**: Agent 3 (REST Transport Owner), Agent 2 (Lifecycle & Persistence Owner), Integration Coordinator D1
- **Authority**: Project Owner
- **Execution Date**: 2026-11-11
- **Branch**: `jules-9117442776605781269-d983ef01`
- **HEAD Commit**: `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`
- **Status**: `RECONCILED_SPECIFICATION_FROZEN_PENDING_PO_RATIFICATION`

---

## 1. Canonical Salesforce Data Model Alignment

Historical reports and draft specifications occasionally referenced hypothetical object names (`Analysis_Run__c`, `Analysis_Run_Chunk__c`, `Project_Graph__c`).

### Definitive Canonical Object Model
Physical inspection of the repository metadata (`scratch/salesforce-poc/force-app/main/default/objects/`), Apex classes, and database schemas confirms the authoritative schema:

1. **`DA_Project__c`**:
   - Master object representing an analyzed software architecture project.
   - Fields: `Name`, `Project_Key__c` (Unique External ID), `Description__c`, `Repository_URL__c`, standard audit fields.
   - Sharing: Private OWD, controlled via `DA_Project__Share` and `DAProjectSecurityService.cls`.

2. **`DA_Analysis_Run__c`**:
   - Master-detail child of `DA_Project__c` (`DA_Project__c` relationship).
   - Fields: `Status__c` (Picklist: `AVAILABLE`, `EMPTY`, `FAILED`, `CREATED`, `UPLOADING`, `VALIDATING`), `Total_Chunks__c` (Number 6,0), `Total_Payload_Size_Chars__c` (Number 12,0), `Commit_Hash__c` (Text 40), `Payload_Checksum__c` (Text 64, hex SHA-256), `Node_Count__c` (Number 8,0), `Edge_Count__c` (Number 8,0), `Cyclic_SCC_Count__c` (Number 6,0), `Run_Timestamp__c` (DateTime).

3. **`DA_Graph_Chunk__c`**:
   - Master-detail child of `DA_Analysis_Run__c` (`DA_Analysis_Run__c` relationship).
   - Fields: `Chunk_Index__c` (Number 6,0, required), `Payload_Data__c` (LongTextArea 131,072), `Chunk_Key__c` (Text 80, Unique Case-Insensitive, format `<RunId>_<ChunkIndex>`).

**Decision**: The hypothetical object names are formal report typos. All REST endpoints, DTOs, and Apex implementations strictly use `DA_Project__c`, `DA_Analysis_Run__c`, and `DA_Graph_Chunk__c`. No duplicate objects or schema modifications shall be created.

---

## 2. REST Contract Status Clarification

A contradiction existed in historical documentation where the document header declared `1.0.0-FROZEN` while the body text stated `DRAFT PROPOSED FOR FROZEN CONTRACT SEQUENCE`.

### Reconciliation:
- Under governance rules, **no agent may self-freeze a contract or claim Project Owner ratification without an explicit ratification record**.
- The contract is hereby classified as: **`1.0.0-PROPOSED-FROZEN`**.
- It incorporates all normative requirements from `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md` (REQ-BATCH-01 through REQ-BATCH-05) and Agent 2 Lifecycle Interface v1.0.2.
- It is submitted to the Project Owner for formal ratification.

---

## 3. Normative Apex REST Ingestion Specification

### 3.1 Endpoint Architecture
- **Apex Annotation**: `@RestResource(urlMapping='/da/v1/ingest/*')`
- **Class**: `DAGraphIngestionRestResource.cls`
- **Data Transfer Objects**: `DAGraphIngestionDTO.cls`

### 3.2 Authentication & Security
- Handled via standard Salesforce OAuth 2.0 (Bearer token).
- Apex execution runs `WITH USER_MODE`.
- Invokes `DAProjectSecurityService.validateProjectAccess(projectId, DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD)` fail-closed before any mutation.

### 3.3 HTTP Request Methods and Action Routing
The resource routes incoming requests based on the URI path following `/da/v1/ingest/`:

1. **`POST /da/v1/ingest/init`**:
   - **Purpose**: Initialize an analysis run.
   - **Request DTO** (`InitRunRequest`):
     ```json
     {
       "projectId": "a00xxxxxxxxxxxxXXX",
       "commitHash": "abc1234...",
       "expectedChunks": 10,
       "expectedTotalBytes": 1250000
     }
     ```
   - **Semantics**:
     - Explicit non-null `expectedChunks == 0` and `expectedTotalBytes == 0` creates run in `EMPTY` status.
     - `expectedChunks > 0` creates run in `UPLOADING` status.
     - Null or omitted `expectedChunks` fails closed.
   - **Response DTO** (`InitRunResponse`):
     ```json
     {
       "runId": "a01xxxxxxxxxxxxXXX",
       "status": "UPLOADING",
       "chunkSizeLimit": 131072,
       "totalPayloadCap": 10485760
     }
     ```

2. **`POST /da/v1/ingest/chunks`**:
   - **Purpose**: Batch upload graph payload chunks.
   - **Request DTO** (`BatchChunkUploadRequest`):
     ```json
     {
       "runId": "a01xxxxxxxxxxxxXXX",
       "chunks": [
         {
           "chunkIndex": 0,
           "payloadData": "{\"nodes\":[...]}"
         }
       ]
     }
     ```
   - **Wire Ceiling & Batch Sizing**:
     - Single chunk character limit: `131,072` UTF-16 code units (Salesforce LongTextArea limit).
     - Maximum wire payload per HTTP request: `5,242,880` bytes (5 MiB).
     - Dynamic batch downscaling: Client steps down batch size `10 -> 5 -> 2 -> 1` if wire size exceeds ceiling.
   - **Idempotency & Concurrency**:
     - Evaluates `Chunk_Key__c` (`<RunId>_<ChunkIndex>`).
     - Identical retry (`Chunk_Index__c` and `Payload_Data__c` match existing chunk) returns idempotent success `200 OK`.
     - Conflicting retry (same index, different payload) rejects fail-closed with `409 Conflict` / `ERR_CONFLICTING_RETRY`.
   - **Response DTO** (`BatchChunkUploadResponse`):
     ```json
     {
       "runId": "a01xxxxxxxxxxxxXXX",
       "persistedChunks": [0, 1, 2],
       "totalPersisted": 3,
       "isComplete": false
     }
     ```

3. **`POST /da/v1/ingest/finalize`**:
   - **Purpose**: Finalize analysis run, validate chunk count and payload checksum, compute metrics.
   - **Request DTO** (`FinalizeRunRequest`):
     ```json
     {
       "runId": "a01xxxxxxxxxxxxXXX",
       "expectedChunks": 10,
       "expectedChecksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
     }
     ```
   - **Validation**:
     - Compares count of persisted `DA_Graph_Chunk__c` records against `expectedChunks` and persisted `Total_Chunks__c`.
     - If chunk count mismatch or checksum mismatch, transitions run to `FAILED` and returns structured `FinalizationResult`.
     - Safe failure persistence via `DAGraphIngestionService.finalizeAnalysisRunWithResult`.
     - Preserves last-known-good `AVAILABLE` run if this run fails.
   - **Response DTO** (`FinalizeRunResponse`):
     ```json
     {
       "runId": "a01xxxxxxxxxxxxXXX",
       "status": "AVAILABLE",
       "nodeCount": 528,
       "edgeCount": 2063,
       "cyclicSccCount": 4,
       "success": true
     }
     ```

---

## 4. Downstream Release Gate & Next Steps

1. **Agent 4 Integration**: Agent 4's upload client (`scripts/salesforce-upload-client.cjs`) can now implement a concrete `SalesforceRestTransportAdapter` matching these exact DTO schemas and endpoints once ratified.
2. **Apex Implementation Authorization**: The actual implementation of `DAGraphIngestionRestResource.cls` and `DAGraphIngestionDTO.cls` in `scratch/salesforce-poc/force-app/main/default/classes/` is cleared for dispatch upon PO approval of this specification.

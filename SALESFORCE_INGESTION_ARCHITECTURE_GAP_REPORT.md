# Salesforce Ingestion Architecture Gap Report

## 1. Executive Summary

This report documents the architectural, programmatic, and infrastructural investigation into the Node.js analyzer-to-Salesforce data ingestion lifecycle.

**Core Finding**: The repository contains robust, security-conscious backend chunk persistence logic in `DAGraphIngestionService.cls`, as well as client-side chunk reassembly and integrity validation in `daGraphPayloadLoader.js`. However, **the transport link connecting external execution (Node.js) to Salesforce is completely unexposed**. Neither a Salesforce REST endpoint (`@RestResource`) nor a bulk ingestion controller exists, and the Node.js analyzer CLI (`dependency-analyzer.cjs`) contains zero network transport code to upload analysis payloads.

---

## 2. Ingestion Lifecycle Trace: Source Code to Persistent Storage

```
[Local Source Repo]
         │
         ▼
[Node.js Analyzer: dependency-analyzer.cjs]
  - Scans files, builds ASTs, extracts dependencies
  - Resolves project key & symbol graph
  - Outputs explorer-data.json (e.g., PBIM: 4.25 MB, 33 chunks)
         │
    ❌ [MISSING TRANSPORT BOUNDARY (GAP-ING-02)]
         │
         ▼
[Apex Ingestion Endpoint (MISSING: GAP-ING-01)]
         │
         ▼
[DAGraphIngestionService.cls (EXISTING BUT UNEXPOSED)]
  - createProject(projectName, projectKey)
  - createAnalysisRun(projectId, runName)
  - saveGraphChunks(runId, chunkData, startIndex, projectId)
         │
         ▼
[Salesforce Custom Objects (Database)]
  - DA_Project__c (OWD: ReadWrite ❌)
  - DA_Analysis_Run__c (Status__c = 'AVAILABLE', Total_Chunks__c = 33)
  - DA_Graph_Chunk__c (Payload_Data__c: 128 KB per chunk, Index: 0..32)
         │
         ▼
[DAGraphController.cls (SOQL USER_MODE)]
  - getLatestGraphMetadataForProject(projectId)
  - getGraphChunks(runId, startIndex, maxChunks, projectId)
         │
         ▼
[daGraphPayloadLoader.js (Client-Side LWC Reassembly)]
  - reassembleChunks(chunks) -> UTF-16 safe reconstruction
  - validatePayloadIntegrity(reassembled) -> SHA-256 verification
         │
         ▼
[daAppShell / daGraphViewer (Visualization)]
```

---

## 3. Analysis of Existing Apex Ingestion Implementation

Inspection of `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`:

### Strengths Identified
1. **Security Context**: Declared as `public with sharing class DAGraphIngestionService`.
2. **User Mode DML**: Uses `insert as user` and `update as user` for all persistence calls.
3. **Chunk Boundary Limits**:
   - `MAX_CHUNK_SIZE = 131072` (strictly matching LongTextArea 128 KB limits).
   - `MAX_BATCH_CHUNKS = 10` (strictly bounding batch size per transaction to avoid governor limits).
   - `MAX_TOTAL_PAYLOAD_SIZE = 10485760` (enforcing the 10 MB total cap).
4. **Idempotency & Upsert**: Queries existing chunks in the `[startIndex, startIndex + chunkData.size() - 1]` range and updates matching records while inserting new ones, preventing duplicate chunk generation upon retry.
5. **Project Scoping**: Validates that `runId` belongs to `projectId` before saving chunks.

### Vulnerabilities & Missing Capabilities
1. **Unexposed to Callers**: Neither `@AuraEnabled` nor `@RestResource` annotations are present. No external tool or Lightning component can invoke `saveGraphChunks`.
2. **Missing Finalization Method**: Once all chunks are uploaded, `DA_Analysis_Run__c.Status__c` must be transitioned to `'AVAILABLE'` and `Total_Chunks__c` set. `DAGraphIngestionService` currently has no `finalizeAnalysisRun(runId, totalChunks, commitHash)` method. Without this, `DAGraphController.getLatestGraphMetadataForProject` ignores the run (due to invariant `Status__c == 'AVAILABLE' && actualChunks == Total_Chunks__c`).
3. **Missing Rollback / Invalidation**: If an upload fails midway, partial chunks remain in `DA_Graph_Chunk__c` with run in `PENDING` state, but there is no cleanup service.

---

## 4. Analysis of Node.js Analyzer Boundary

Inspection of `dependency-analyzer.cjs` and related scripts:
1. **Current Capabilities**:
   - Full AST analysis for Apex, Triggers, Custom Objects, LWC JavaScript and XML metadata.
   - Outputs single monolith JSON (`explorer-data.json`) or sliced directory bundles.
   - Computes architecture metrics (SCC cycles, instability, abstraction, layer violations).
2. **Missing Capabilities**:
   - No Salesforce OAuth / JWT / CLI token acquisition.
   - No chunking utility in Node.js to slice `explorer-data.json` into <= 131,072-character UTF-16 code unit chunks.
   - No HTTP client (e.g. `fetch` or `https`) invoking Salesforce REST APIs with exponential backoff and retry.

---

## 5. Architectural Gap Classification

The ingestion gap is classified into two distinct root causes:
1. **GAP-ING-01 (Apex REST Ingestion Resource)**: A genuinely missing transport adapter class (`DAGraphIngestionRestResource.cls`) wrapping `DAGraphIngestionService`.
2. **GAP-ING-02 (Node.js Upload Command)**: A missing CLI tool / script (`sf-ingest.cjs` or `dependency-analyzer.cjs sf-upload`) that connects local analysis results to the Salesforce REST API.

---

## 6. Recommended Remediation Design

### Architecture Contract: REST Endpoint Specification
- **Class**: `DAGraphIngestionRestResource.cls`
- **URL Mapping**: `/services/apexrest/da/v1/ingest/*`
- **HTTP Methods**:
  - `POST /da/v1/ingest/project`: Create/resolve project key (`{ "projectName": "PBIM", "projectKey": "pbim" }`).
  - `POST /da/v1/ingest/run`: Initialize run (`{ "projectId": "...", "commitHash": "abc", "totalChunks": 33 }`).
  - `POST /da/v1/ingest/chunks`: Upload batch (`{ "runId": "...", "startIndex": 0, "chunks": ["...", "..."] }`).
  - `POST /da/v1/ingest/finalize`: Verify chunk count and mark `Status__c = 'AVAILABLE'`.

### Safety and Governor Controls
- Maximum 10 chunks per HTTP POST request (1.28 MB request payload, well within Salesforce 6 MB REST limit).
- Execution bounded by SOQL/DML limits: 1 query for project/run check, 1 query for existing chunks, 1 DML statement for upsert.
- Enforces CONTRACT-01 and CONTRACT-04 schema invariants.

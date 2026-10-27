# Wave 1 Graph Contract and Security Report — Salesforce Migration

## Executive Summary
This report documents the field-by-field graph schema contract alignment between Explorer TypeScript contracts and Salesforce Apex/LWC DTOs, payload chunking boundaries, Apex security mechanisms, and the Node.js to Salesforce analysis handoff contract.

## 1. Schema Mapping: Explorer TypeScript to Salesforce Apex/LWC DTO

| Field | Explorer TS Type | Apex DTO Field (`DAGraphDTO`) | Apex Field Type | Mandatory / Optional |
|---|---|---|---|---|
| `project.id` | `string` | `projectId` | `String` | Mandatory |
| `project.name` | `string` | `projectName` | `String` | Optional |
| `project.projectKey` | `string` | `projectKey` | `String` | Mandatory |
| `runId` / `snapshotId` | `string` | `runId` | `String` | Mandatory |
| `summary.nodeCount` | `number` | `nodeCount` | `Integer` | Derived |
| `summary.edgeCount` | `number` | `edgeCount` | `Integer` | Derived |
| `isChunked` | `boolean` | `isChunked` | `Boolean` | Mandatory |
| `totalChunks` | `number` | `totalChunks` | `Integer` | Mandatory |
| `rawPayload` | `string` | `rawPayload` | `String` | Optional (if not chunked) |
| `chunks` | `string[]` | `chunks` / `DA_Graph_Chunk__c` | `List<String>` / SObject | Mandatory (if chunked) |

## 2. Payload and Chunking Limits

* **Max Chunk Character Boundary:** `131,072` characters (128 KB), strictly matching the Salesforce Custom Object `LongTextArea` field limit on `DA_Graph_Chunk__c.Payload_Data__c`.
* **Max Overall Payload Limit:** `10,485,760` characters (10 MB), enforced at application level in `daGraphPayloadLoader.js` (`validatePayloadSize` / `validatePayloadIntegrity`).
* **Chunk Sequence Enforcement:** `verifyChunkSequence` in `daGraphPayloadLoader.js` and `DAGraphChunkService.cls` rejects gaps, duplicate chunk indices, reordered indices, and negative offsets.
* **Pagination Bounds:** `getGraphChunks` caps requested batch limits at `10` chunks per call, defaulting to `5`. High `startIndex` arithmetic overflow is guarded with `Long` casting.

## 3. Apex Security Audit

* **Sharing Directives:** All Apex controllers and services use `with sharing` or `inherited sharing`.
* **CRUD / FLS Enforcement:** All SOQL queries incorporate `WITH USER_MODE`. All DML operations use `insert as user`.
* **Input Validation:** Blank parameter validation in `DAGraphController.cls` and `DAGraphIngestionService.cls` throws `AuraHandledException` or `IllegalArgumentException`.
* **Org Dependency Note:** Native Salesforce runtime deployment, org governor limits, and LWS checks remain `BLOCKED` due to lack of an authorized Salesforce org in the sandbox environment.

## 4. External Node.js Analysis Handoff Contract

* **Owner & Boundary:** Node.js static analysis pipeline (`scripts/export-explorer.cjs`) owns repository parsing, AST inspection, metric computation, and JSON payload serialization.
* **Payload Format:** UTF-8 JSON document conforming to `ExplorerDataSchema` (schemaVersion `1.0.0`, analyzerVersion `13.0.0`).
* **Ingestion Lifecycle:**
  1. Node.js exports canonical payload.
  2. Ingestion pipeline invokes `DAGraphIngestionService.createProject(projectName, projectKey)` (idempotent lookup).
  3. Analysis run created via `createAnalysisRun(projectId, runName)`.
  4. Payload split into <= 131,072 character chunks and persisted via `saveGraphChunks(runId, chunks)`.

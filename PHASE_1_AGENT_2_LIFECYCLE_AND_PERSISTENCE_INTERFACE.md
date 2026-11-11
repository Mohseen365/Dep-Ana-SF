# Phase 1 Agent 2 Lifecycle and Persistence Interface

## Interface Identification & Governance
- **Interface Name**: Analysis-Run Ingestion Lifecycle, Chunk Uniqueness, and Persistence Interface
- **Interface Version**: `v1.0.0`
- **Owner**: Agent 2 (Ingestion Lifecycle & Schema Implementation Lead)
- **Integration Coordinator**: D1
- **Independent Verifier**: D2
- **Date**: 2026-11-11
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION
- **Git Commit Reference**: Baseline `0637b904ab8537b7625fb0ab9882cb5cbdf32746` / Group A Branch `jules-16312564460869361898-1d34a25a`

---

## 1. Executive Summary & Purpose

This technical contract defines the authoritative lifecycle state machine, chunk identity, retry semantics, and persistence contracts for graph payload ingestion into Salesforce.

Under Project Owner Decision 3 (`PO-DEC-V2-03`), the graph ingestion architecture mandates:
1. Explicit run lifecycle states: `QUEUED`, `IN_PROGRESS`, `VALIDATING`, `AVAILABLE`, `FAILED`, `CANCELLED`, `EXPIRED`.
2. Deterministic chunk uniqueness via `DA_Graph_Chunk__c.Chunk_Key__c` (`{runId}_{chunkIndex}`).
3. Strict retry semantics: identical payload retries succeed idempotently; conflicting payload retries are rejected fail-closed.
4. Validation continuity: all chunks from `0` to `expectedTotalChunks - 1` must be present and contiguous before finalization.
5. Incomplete, failed, or in-flight runs are strictly excluded from graph retrieval queries, preserving the last-known-good finalized graph.

This contract provides the technical baseline required to unblock **Agent 3 (Apex REST Ingestion Transport)** and **Agent 10 (Ingestion & Concurrency Test Engineering)**.

---

## 2. Ingestion Lifecycle State Machine

```
   [createAnalysisRun]
            │
            ▼
        ┌─────────┐
        │ QUEUED  │
        └────┬────┘
             │ (first chunk saved / startUpload)
             ▼
      ┌─────────────┐
      │ IN_PROGRESS │ ◄──┐ (saveGraphChunks batch 1..N)
      └──────┬──────┘ ───┘
             │ (finalizeAnalysisRun initiated)
             ▼
      ┌────────────┐
      │ VALIDATING │
      └──────┬─────┘
             ├──────────────────────────┐
             │ (contiguous & complete)  │ (validation failure / gap)
             ▼                          ▼
      ┌───────────┐               ┌──────────┐
      │ AVAILABLE │               │  FAILED  │
      └───────────┘               └──────────┘
```

### State Definitions:
- `QUEUED`: Analysis run record created with expected chunk and payload metadata; no chunk bytes persisted yet.
- `IN_PROGRESS`: First batch of chunks written; ingestion actively underway.
- `VALIDATING`: Finalization request received; validating chunk count, contiguous indexing, and checksum integrity.
- `AVAILABLE`: Finalization succeeded; run is active and visible to UI queries as the latest available graph.
- `FAILED`: Ingestion or validation failed; run is closed fail-closed and excluded from active graph queries.
- `CANCELLED`: Client or administrator aborted the upload run.
- `EXPIRED`: Run exceeded the permitted staging window (e.g., 24 hours without finalization).

---

## 3. Schema & Unique Identity Specifications

### 3.1 Picklist Metadata (`DA_Analysis_Run__c.Status__c`)
- **Type**: Picklist (Restricted)
- **Values**: `QUEUED` (default), `IN_PROGRESS`, `VALIDATING`, `AVAILABLE`, `FAILED`, `CANCELLED`, `EXPIRED`, `EMPTY`.

### 3.2 Unique Constraint Metadata (`DA_Graph_Chunk__c.Chunk_Key__c`)
- **Type**: Text(120), Unique (Case-Insensitive), External ID
- **Format**: `String.valueOf(runId) + '_' + String.valueOf(chunkIndex)`
- **Database Index**: Backed by Salesforce unique index to prevent duplicate chunk insertions under concurrent requests.

---

## 4. Service Signatures & Methods (`DAGraphIngestionService.cls`)

### 4.1 `createAnalysisRun`
```apex
public static String createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes)
```
- **Description**: Initializes an analysis run in `QUEUED` state.
- **Validation**: Rejects blank `projectId` or `runName`.

### 4.2 `saveGraphChunks`
```apex
public static Integer saveGraphChunks(String runId, List<String> chunkData, Integer startIndex, String projectId)
```
- **Description**: Bounded batch persistence of graph chunks (maximum 10 chunks per call, 131,072 characters per chunk).
- **Behavior**:
  - Automatically advances status from `QUEUED` to `IN_PROGRESS`.
  - Computes `Chunk_Key__c = runId + '_' + targetIndex`.
  - Rejects chunks if `run.Status__c` is `AVAILABLE`, `FAILED`, `CANCELLED`, or `EXPIRED`.
  - **Identical Retry**: If a chunk already exists at `targetIndex` with identical `Payload_Data__c`, the operation succeeds idempotently without error.
  - **Conflicting Retry**: If an existing chunk has differing payload text, throws `IngestionException` immediately fail-closed.

### 4.3 `finalizeAnalysisRun`
```apex
public static Boolean finalizeAnalysisRun(String runId, Integer expectedTotalChunks)
```
- **Description**: Verifies chunk continuity (all indices $0$ through $expectedTotalChunks - 1$) and transitions run to `VALIDATING` then `AVAILABLE`.
- **Failure Handling**: If chunk count does not match or any index is missing, marks run `FAILED` and throws `IngestionException`.

### 4.4 `getLatestAvailableRun`
```apex
public static DA_Analysis_Run__c getLatestAvailableRun(String projectId)
```
- **Description**: Queries the most recent finalized analysis run for a project.
- **Invariant**: Filters strictly by `Status__c = 'AVAILABLE'`. Incomplete, in-progress, validating, or failed runs are never returned, guaranteeing that an interrupted upload never displaces the last-known-good graph.

---

## 5. Error Semantics & Exceptions

| Error Condition | Exception Type | Description |
|---|---|---|
| Invalid run ID or status mismatch | `IllegalArgumentException` | Blank run ID or run not found |
| Batch size exceeded (> 10 chunks) | `IllegalArgumentException` | Wire batch exceeds 10 chunks limit |
| Chunk size exceeded (> 131,072 chars) | `IllegalArgumentException` | Individual chunk exceeds field capacity |
| Conflicting chunk retry | `IngestionException` | Different payload sent for previously persisted chunk index |
| Upload to finalized/closed run | `IngestionException` | Attempting to write chunks to `AVAILABLE` or `FAILED` run |
| Finalization gap / count mismatch | `IngestionException` | Missing indices or incomplete chunk set |

---

## 6. Downstream Interface Gates

- **Agent 3 (REST Ingestion Transport)**:
  - Both prerequisites—**Agent 1 Security Interface (`v1.0.0`)** and **Agent 2 Lifecycle Interface (`v1.0.0`)**—are now published.
  - Agent 3 is hereby **UNBLOCKED** to implement and freeze the Apex REST Transport endpoint (`/services/apexrest/dependency-analyzer/v1/runs/*`).
- **Agent 4 (Node.js Upload Client)**:
  - Remains gated until Agent 3 publishes the frozen REST contract.
- **Agent 10 (Ingestion Test Engineering)**:
  - Uses these state transitions and chunk contracts to draft multi-threaded external concurrency tests and verify sequential unit tests.

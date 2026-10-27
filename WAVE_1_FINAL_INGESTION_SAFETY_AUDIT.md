# Wave 1 Final Ingestion Safety Audit Report

## 1. Executive Summary

This report evaluates the safety, boundary limits, batching mechanisms, and idempotency of the graph ingestion pipeline across `DAGraphIngestionService.cls`, `DAGraphChunkService.cls`, and `daGraphPayloadLoader.js`.

* **Audit Status:** `PASS WITH CONDITIONS`
* **Condition:** Implementation enforces chunk limits, payload caps, client-driven batching, and idempotent upserts. Live Apex synchronous heap limit and governor limit profiling require an authorized Salesforce org.

---

## 2. Ingestion Pipeline & Boundary Limits

| Constraint Parameter | Configured Value | Enforcement Boundary | Code Verification Point | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Max Chunk Size** | `131,072` chars (128 KB) | LongTextArea field limit (`Payload_Data__c`) | `DAGraphIngestionService.cls:122`<br>`daGraphPayloadLoader.js:MAX_CHUNK_SIZE` | **ENFORCED** |
| **Max Batch Chunks** | `10` chunks / call | Bounded batch payload boundary | `DAGraphIngestionService.cls:58`<br>`run-poc-tests.cjs:simulateSaveGraphChunks` | **ENFORCED** |
| **Max Total Payload** | `10,485,760` bytes (10 MB) | Application-level envelope limit | `daGraphPayloadLoader.js:MAX_TOTAL_PAYLOAD_SIZE`<br>`validatePayloadSize()` | **ENFORCED** |
| **Default Fetch Page Size** | `5` chunks / call | Default LWC pagination batch | `DAGraphController.cls:105`<br>`run-poc-tests.cjs:pageSize` | **ENFORCED** |
| **Max Fetch Page Size** | `10` chunks / call | Hard cap on LWC chunk retrieval | `DAGraphController.cls:107` | **ENFORCED** |

---

## 3. Detailed Verification of Ingestion Safety Mechanics

1. **Client-Driven Bounded Batch Ingestion:**
   Rather than pushing a full 10 MB payload in a single synchronous Apex call (which would breach the 12 MB synchronous Apex heap limit), ingestion is split into bounded batches of up to `10` chunks per call (max 1.28 MB per batch).

2. **Idempotency & Partial Failure Recovery:**
   `DAGraphIngestionService.saveGraphChunks(runId, chunkData, startIndex, projectId)` queries existing `DA_Graph_Chunk__c` records matching `DA_Analysis_Run__c = :runId AND Chunk_Index__c >= :startIndex AND Chunk_Index__c <= :endIndex`.
   - Existing chunks at a given index are updated (`toUpdate.add()`).
   - Missing chunks at a given index are inserted (`toInsert.add()`).
   - Submitting the same batch twice results in an idempotent update without creating duplicate chunk records.

3. **Integrity & Completeness Before Rendering:**
   `verifyChunkSequence()` in LWC loader and `verifyBoundedChunkSequence()` in Apex verify that all chunks from `0` to `totalChunks - 1` are contiguous and present without gaps or reordering. The LWC viewer will not parse or render a graph until all chunks have been retrieved and validated against `validatePayloadIntegrity()`.

4. **Cross-Project Authorization on Writes:**
   `saveGraphChunks` validates `runId` against `DA_Analysis_Run__c` and enforces project matching (`DA_Project__c = :projectId OR Project_Key__c = :projectId`) under `WITH USER_MODE`. Unauthorized writes are rejected immediately before any chunk DML occurs.

---

## 4. Adversarial Ingestion Scenarios & Offline Test Results

| Scenario | Description | Offline Test In `run-poc-tests.cjs` | Outcome |
| :---: | :--- | :--- | :---: |
| 1 | Valid single-batch graph | Category 3 Fixture CST / BQC paginated retrieval | **PASS** |
| 2 | Valid multi-batch graph | Category 3 Fixture PBIM (43 chunks, 9 batches) | **PASS** |
| 3 | Oversized batch (>10 chunks) | Category 5: Ingestion Bounded Batching Contract | **PASS** (Throws exception) |
| 4 | Oversized chunk (>131,072 chars) | Category 5: validateChunkLimits check | **PASS** (Rejects chunk) |
| 5 | Oversized total payload (>10 MB) | Category 5: validatePayloadSize check | **PASS** (Rejects payload) |
| 6 | Duplicate submission of same batch | Category 5: Idempotency Simulation Contract | **PASS** (Updates existing) |
| 7 | Missing or out-of-order chunks | Category 1: verifyChunkSequence gap/reorder tests | **PASS** (Rejects sequence) |
| 8 | Batch failure followed by retry | Category 5: Ingestion Batching & Retry Simulation | **PASS** (Recovers safely) |
| 9 | Incomplete graph requested | Category 4: In-flight request cancellation & sequence check | **PASS** (Prevents render) |
| 10 | Unauthorized project/run write | Category 5: Ingestion Contract validation | **PASS** (Rejects write) |
| 11 | Repeated ingestion after completion | Category 5: Idempotent overwrite validation | **PASS** (Overwrites cleanly) |
| 12 | Malformed payload passing transport | Category 1: validatePayloadIntegrity schema check | **PASS** (Rejects render) |

---

## 5. Unresolved Risks & Deployment Prerequisites

* Apex governor limit profiling (DML statements, SOQL queries, CPU time) for rapid sequential batch writes must be validated in an active Salesforce org prior to production deployment.

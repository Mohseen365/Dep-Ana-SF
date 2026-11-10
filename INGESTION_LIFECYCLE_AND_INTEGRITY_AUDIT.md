# Ingestion Lifecycle, Integrity, and Architecture Audit

## Document Identification
- **Contract Reference**: CONTRACT-01, CONTRACT-04, CONTRACT-09
- **Audit Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & Architecture Verifier
- **Scope**: Apex Ingestion Service, Controller Query Pipeline, Chunk Serialization, Concurrency Safety, and Platform Limits

---

## 1. Executive Summary

This audit performs an exhaustive source-level investigation of the Dependency Analyzer ingestion pipeline across Apex classes (DAGraphIngestionService.cls, DAGraphController.cls, DAGraphChunkService.cls), database custom fields, and client-side loaders.

Three severe architectural gaps (GAP-ING-03, GAP-ING-04, GAP-ING-05) and one critical testing deficiency (GAP-TEST-01) have been confirmed by direct code inspection:
1. **Premature Run Availability**: Analysis runs are inserted without status management and default to AVAILABLE. Query logic falls back to actual chunk count if Total_Chunks__c is null, enabling incomplete or aborted uploads to displace complete historical runs.
2. **Unenforced 10 MB Payload Cap**: While defined as MAX_TOTAL_PAYLOAD_SIZE = 10485760, the limit is completely unreferenced in Apex code.
3. **Database Race Condition**: Lack of database uniqueness constraints on Chunk_Index__c allows concurrent uploads to generate duplicate chunks.
4. **Zero Test Coverage**: DAGraphIngestionService has 0% Apex test coverage and zero offline test harness validation.

---

## 2. Ingestion Lifecycle State Machine & Vulnerability Analysis (GAP-ING-03)

### 2.1 The Vulnerability in Existing Source
Inspection of DAGraphIngestionService.createAnalysisRun (lines 35-47) reveals:
```apex
public static String createAnalysisRun(String projectId, String runName) {
    DA_Analysis_Run__c run = new DA_Analysis_Run__c(
        DA_Project__c = projectId,
        Name = runName.trim()
    );
    insert as user run;
    return run.Id;
}
```
Because no Status__c is specified, the database default applies. Inspection of Status__c.field-meta.xml shows:
```xml
<value>
    <fullName>AVAILABLE</fullName>
    <default>true</default>
</value>
```
Next, inspection of DAGraphController.getLatestGraphMetadataForProject (lines 83-138) reveals:
```apex
Integer actualChunks = chunkCountsByRunId.containsKey(candidate.Id) ? chunkCountsByRunId.get(candidate.Id) : 0;
Integer expectedChunks = candidate.Total_Chunks__c != null ? candidate.Total_Chunks__c.intValue() : actualChunks;

if (actualChunks == expectedChunks) {
    validRun = candidate;
    break;
}
```
**Impact**:
When a new upload begins, Total_Chunks__c is initially null. Therefore:
- Candidate status is AVAILABLE by default.
- Expected chunks evaluates to actualChunks (e.g. 0 == 0).
- validRun immediately binds to the newly created, empty run, or partially uploaded run!
- A complete previous run (e.g., PBIM with 33 chunks) is immediately superseded by an empty or half-uploaded run!

### 2.2 Prescribed Lifecycle State Machine
To guarantee atomic visibility, the run lifecycle must strictly transition through four explicit states:

```
   +-----------+        +-------------+        +--------------+        +-------------+
   |  CREATED  | -----> |  UPLOADING  | -----> |  VALIDATING  | -----> |  AVAILABLE  |
   +-----------+        +-------------+        +--------------+        +-------------+
         |                     |                      |                       ^
         |                     |                      |                       |
         +---------------------+----------------------+                       |
                               |                                              |
                               v                                              |
                        +--------------+                                      |
                        |    FAILED    | -------------------------------------+
                        +--------------+
```

#### Lifecycle State Definitions:
1. **CREATED**: Initialized by client with metadata (projectId, runName, commitHash, totalChunks, totalPayloadBytes). Status__c is explicitly set to CREATED. Never queryable by visualization controllers.
2. **UPLOADING**: Chunks are streamed in bounded batches (batchSize <= 10). Run transitions to UPLOADING. Total received chunks and bytes are accumulated.
3. **VALIDATING**: Upload client calls finalizeAnalysisRun(runId, expectedChecksum). System verifies:
   - COUNT(DA_Graph_Chunk__c) == Total_Chunks__c
   - Chunk indices form a contiguous sequence from 0 to Total_Chunks__c - 1.
   - Total character count does not exceed MAX_TOTAL_PAYLOAD_SIZE (10,485,760 chars).
   - Optional payload SHA-256 matches.
4. **AVAILABLE**: Only upon successful validation does Apex transition Status__c to AVAILABLE. Only runs in this state are visible to DAGraphController.
5. **FAILED**: If validation fails, timeout occurs, or cancellation is requested, status transitions to FAILED.
6. **EXPIRED / CLEANUP**: Incomplete runs older than 24 hours in CREATED or UPLOADING status are purged by a scheduled batch cleanup job.

---

## 3. Total Payload Limit Enforcement (GAP-ING-04)

### 3.1 Platform Limits & Accounting
- **Salesforce Long Text Area Field Limit**: 131,072 characters (UTF-16 code units).
- **Synchronous Apex Heap Limit**: 6,291,456 bytes (6 MB).
- **Maximum Graph Payload Cap**: 10,485,760 characters (~10 MB, representing up to 80 chunks of 128 KB each).

### 3.2 Audit Findings
Inspection confirms that DAGraphIngestionService enforces chunk size:
```apex
if (payloadStr != null && payloadStr.length() > MAX_CHUNK_SIZE) {
    throw new IllegalArgumentException("Chunk exceeds maximum allowed size.");
}
```
However, **there is zero check against MAX_TOTAL_PAYLOAD_SIZE**. A client could upload 1,000 chunks of 128 KB (~128 MB total), exhausting storage and causing downstream client-side crashes.

### 3.3 Required Apex Enforcement
DAGraphIngestionService must accumulate Total_Payload_Size_Chars__c upon each chunk batch, or aggregate SUM(Payload_Length) during finalization, throwing IllegalArgumentException if cumulative length exceeds 10,485,760.

---

## 4. Chunk Uniqueness & Concurrency Safety (GAP-ING-05)

### 4.1 Race Condition in Chunk Ingestion
Existing chunk persistence relies on an application-level SOQL query before inserting:
```apex
List<DA_Graph_Chunk__c> existingChunks = [
    SELECT Id, Chunk_Index__c, Payload_Data__c
    FROM DA_Graph_Chunk__c
    WHERE DA_Analysis_Run__c = :runId
      AND Chunk_Index__c >= :startIndex
      AND Chunk_Index__c <= :endIndex
    WITH USER_MODE
];
```
If two HTTP workers attempt to upload chunk batches in parallel (or during an automated retry), both SOQL queries can execute simultaneously, observe zero existing records, and both issue an insert as user call.

### 4.2 Database Solution
To achieve true database-level idempotency without SOQL locking bottlenecks:
1. Introduce a text custom field on DA_Graph_Chunk__c: Chunk_Key__c (Text, 255 chars, Unique, Case-Sensitive).
2. Format: `{runId}_{Chunk_Index__c}`
3. Mark Chunk_Key__c as an **External ID with Unique constraint**.
4. Use Database.upsert(chunks, DA_Graph_Chunk__c.Fields.Chunk_Key__c, false) for fully idempotent persistence.

---

## 5. Ingestion Test Coverage Gap (GAP-TEST-01)

### 5.1 Current Coverage Audit
- Existing Apex test classes in force-app/main/default/classes/tests/:
  - DAAnnotationControllerTest.cls (Exercises annotation CRUD)
  - DAGraphControllerTest.cls (Exercises retrieval queries)
  - DAGraphSecurityTest.cls (Exercises project scoping)
  - DASchemaAndSecurityTest.cls (Exercises schema integrity)
  - DAUserPreferenceControllerTest.cls (Exercises preference storage)
- **Direct DAGraphIngestionService Tests**: **0 classes, 0 methods, 0 lines tested**.

### 5.2 Mandatory Test Plan (12 Test Cases)
A dedicated test class DAGraphIngestionServiceTest.cls and offline test runner run-w5-ingestion-tests.cjs must be authored prior to v1.0 release:
1. testCreateProject_Success
2. testCreateProject_DuplicateKey_Idempotent
3. testCreateAnalysisRun_Success_InitialStatusCreated
4. testSaveGraphChunks_SingleBatch_Success
5. testSaveGraphChunks_MultipleBatches_ContiguousOrdering
6. testSaveGraphChunks_ExceedBatchLimit_ThrowsException
7. testSaveGraphChunks_ExceedChunkSize_ThrowsException
8. testSaveGraphChunks_CumulativePayloadExceeds10MB_ThrowsException
9. testFinalizeAnalysisRun_MissingChunks_RejectsAvailability
10. testFinalizeAnalysisRun_ValidChunks_TransitionsToAvailable
11. testConcurrentUpload_IdempotentUpsert_NoDuplicateChunks
12. testProjectScoping_MismatchProjectId_ThrowsException

---

## 6. Recommended Apex REST Endpoint Design

To resolve GAP-ING-01 and GAP-ING-02 without introducing heavy overhead:
- **Class**: DAGraphIngestionRestResource.cls
- **Endpoint**: /services/apexrest/da/v1/ingest/*
- **HTTP Methods**:
  - POST /project: Creates or resolves project.
  - POST /run: Initializes analysis run in CREATED status.
  - PUT /run/{runId}/chunks: Streams chunk array (up to 10 chunks).
  - POST /run/{runId}/finalize: Validates sequence and marks AVAILABLE.
- **Security**: Strictly enforces with sharing and WITH USER_MODE.
